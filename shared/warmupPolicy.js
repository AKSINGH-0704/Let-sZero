/**
 * Warm-Up Policy
 * ==============
 * Single authority for the new-sender daily sending ladder. Owns the ladder shape,
 * stage calculation, effective-limit resolution, and configuration validation.
 *
 * Everything that needs to know "how many emails may this sender send today?" — the
 * Sender Authorization Service, the campaign loop's per-email claim, the sender-health
 * read model, and the client's onboarding/dashboard copy — resolves it through here.
 * There is no second copy of these numbers anywhere in the codebase.
 *
 * Pure module: no DB, no I/O, no clock of its own (callers pass `now`). Lives in
 * shared/ so the client renders the same ladder the server enforces and the two
 * cannot drift — the previous flat-limit design had the default written out in four
 * separate places, two of them user-visible.
 *
 * ── Two clocks ───────────────────────────────────────────────────────────────
 * The STAGE clock is anchored to users.first_send_at and advances with the calendar.
 * The COUNTER clock (users.warmup_emails_reset_at) is a rolling 24h window anchored
 * at the first send of each window. They are deliberately not aligned, which is safe
 * ONLY because the ladder is monotonically non-decreasing: a stage that advances
 * mid-window can grant capacity but can never revoke a slot already claimed. A
 * decreasing ladder would make the counter's `sent_today < limit` guard fail against
 * an already-higher counter and stop a sender dead with no explanation. That is why
 * monotonicity is validated here rather than left as a documented convention.
 *
 * ── Fail-safe configuration ──────────────────────────────────────────────────
 * Every parse in this module is total: malformed input yields the built-in default,
 * never NaN and never "no limit". This matters because warm-up settings are edited by
 * direct SQL against production (no admin route exists — backlog OPS-011), so a typo
 * is a realistic event. The pre-existing code parsed the duration with
 * `parseInt(value ?? "30")`, which guards a missing row but not a malformed one: a
 * value of "" or "3o" produced NaN, and `warmupEnd.setDate(getDate() + NaN)` produced
 * an Invalid Date, whose `<` comparison is always false — silently reporting warm-up
 * as finished and granting unlimited sending platform-wide. Configuration failure now
 * degrades toward the default policy, never away from enforcement.
 */

/** platform_settings keys this policy reads. */
export const WARMUP_SETTING_KEYS = Object.freeze({
  LADDER:        "warmup_ramp_schedule",
  DURATION_DAYS: "warmup_duration_days",
  /** Pre-ladder flat limit. Still honoured as a fallback so an operator who has not
   *  yet seeded the ladder keeps a defined policy rather than inheriting the default. */
  FLAT_LIMIT:    "warmup_custom_domain_daily_limit",
});

/**
 * The shipped default ladder. `throughDay: null` marks the terminal stage — it applies
 * from its start day until warm-up itself ends (DURATION_DAYS), after which sending
 * volume is governed by credits alone.
 */
export const DEFAULT_WARMUP_LADDER = Object.freeze([
  Object.freeze({ throughDay: 3,    dailyLimit: 50  }),
  Object.freeze({ throughDay: 7,    dailyLimit: 100 }),
  Object.freeze({ throughDay: null, dailyLimit: 200 }),
]);

export const DEFAULT_WARMUP_DURATION_DAYS = 30;

const MS_PER_DAY = 86_400_000;

// ── Configuration parsing (total functions — never throw, never return NaN) ───

/**
 * Parse a positive integer from a platform_settings value.
 * Returns `fallback` for null, undefined, empty, non-numeric, non-finite,
 * zero, or negative input.
 */
export function parsePositiveInt(raw, fallback) {
  if (raw === null || raw === undefined) return fallback;
  const n = typeof raw === "number" ? raw : parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return fallback;
  return n;
}

/**
 * Validate a candidate ladder. Returns the frozen ladder, or null with the reason
 * reported through `onInvalid` so the caller can log it and fall back.
 *
 * A ladder is valid when it is a non-empty array of stages where:
 *   - every dailyLimit is a positive integer;
 *   - dailyLimit never decreases (the monotonicity invariant);
 *   - throughDay values are positive integers in strictly ascending order;
 *   - exactly one stage is terminal (throughDay null/absent) and it is the last.
 */
export function parseLadder(raw, onInvalid = () => {}) {
  let candidate = raw;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return onInvalid("empty value"), null;
    try {
      candidate = JSON.parse(text);
    } catch {
      return onInvalid("not valid JSON"), null;
    }
  }
  if (!Array.isArray(candidate) || candidate.length === 0) {
    return onInvalid("not a non-empty array"), null;
  }

  const stages = [];
  let previousLimit = 0;
  let previousThroughDay = 0;

  for (let i = 0; i < candidate.length; i++) {
    const stage = candidate[i];
    if (!stage || typeof stage !== "object") {
      return onInvalid(`stage ${i} is not an object`), null;
    }

    const dailyLimit = parsePositiveInt(stage.dailyLimit, null);
    if (dailyLimit === null) {
      return onInvalid(`stage ${i} has a non-positive-integer dailyLimit`), null;
    }
    if (dailyLimit < previousLimit) {
      return onInvalid(
        `stage ${i} decreases dailyLimit (${previousLimit} → ${dailyLimit}); the ladder must never decrease`
      ), null;
    }

    const isTerminal = stage.throughDay === null || stage.throughDay === undefined;
    if (isTerminal && i !== candidate.length - 1) {
      return onInvalid(`stage ${i} is terminal but is not the last stage`), null;
    }
    if (!isTerminal) {
      const throughDay = parsePositiveInt(stage.throughDay, null);
      if (throughDay === null) {
        return onInvalid(`stage ${i} has a non-positive-integer throughDay`), null;
      }
      if (throughDay <= previousThroughDay) {
        return onInvalid(
          `stage ${i} throughDay (${throughDay}) does not advance past the previous stage (${previousThroughDay})`
        ), null;
      }
      previousThroughDay = throughDay;
      stages.push(Object.freeze({ throughDay, dailyLimit }));
    } else {
      stages.push(Object.freeze({ throughDay: null, dailyLimit }));
    }
    previousLimit = dailyLimit;
  }

  if (stages[stages.length - 1].throughDay !== null) {
    return onInvalid("the last stage must be terminal (throughDay: null)"), null;
  }
  return Object.freeze(stages);
}

/**
 * Resolve the ladder actually in force, in precedence order:
 *   1. a valid configured ladder;
 *   2. a configured flat limit, promoted to a single terminal stage (pre-ladder
 *      behaviour preserved for an operator who has not seeded the ladder);
 *   3. the shipped default ladder.
 *
 * Never returns null and never returns an unlimited policy.
 */
export function resolveLadder({ rawLadder, rawFlatLimit } = {}, onInvalid = () => {}) {
  const ladder = parseLadder(rawLadder, onInvalid);
  if (ladder) return ladder;

  const flat = parsePositiveInt(rawFlatLimit, null);
  if (flat !== null) return Object.freeze([Object.freeze({ throughDay: null, dailyLimit: flat })]);

  return DEFAULT_WARMUP_LADDER;
}

/** Resolve the warm-up duration in days. Always a positive integer. */
export function resolveDurationDays(rawDurationDays) {
  return parsePositiveInt(rawDurationDays, DEFAULT_WARMUP_DURATION_DAYS);
}

// ── Stage calculation ────────────────────────────────────────────────────────

/**
 * 1-based day index within warm-up, anchored to first_send_at.
 * A sender who has never sent is on day 1 — their warm-up has not started, and their
 * first send will be their day-1 send. Clock skew (a first_send_at in the future) also
 * clamps to 1 rather than producing a zero or negative index.
 */
export function warmupDayIndex(firstSendAt, now = new Date()) {
  if (!firstSendAt) return 1;
  const start = new Date(firstSendAt).getTime();
  const current = new Date(now).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(current)) return 1;
  const elapsedDays = Math.floor((current - start) / MS_PER_DAY);
  return elapsedDays < 0 ? 1 : elapsedDays + 1;
}

/**
 * The ladder stage in force on a given day.
 * @returns {{ index: number, dailyLimit: number, throughDay: number|null, isFinal: boolean }}
 */
export function stageForDay(ladder, dayIndex) {
  const stages = ladder?.length ? ladder : DEFAULT_WARMUP_LADDER;
  const day = Number.isFinite(dayIndex) && dayIndex >= 1 ? dayIndex : 1;
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    if (stage.throughDay === null || day <= stage.throughDay) {
      return { index: i, dailyLimit: stage.dailyLimit, throughDay: stage.throughDay, isFinal: i === stages.length - 1 };
    }
  }
  // Unreachable while the last stage is terminal (guaranteed by parseLadder), but a
  // caller passing a hand-built ladder gets the most conservative answer rather than
  // an exception on the send path.
  const last = stages[stages.length - 1];
  return { index: stages.length - 1, dailyLimit: last.dailyLimit, throughDay: last.throughDay, isFinal: true };
}

/**
 * The next increase, or null when the sender is already at the final stage.
 * `inDays` is 1 on the last day of the current stage ("increases tomorrow").
 */
export function nextStage(ladder, dayIndex) {
  const stages = ladder?.length ? ladder : DEFAULT_WARMUP_LADDER;
  const current = stageForDay(stages, dayIndex);
  if (current.isFinal || current.throughDay === null) return null;
  const next = stages[current.index + 1];
  if (!next) return null;
  const day = Number.isFinite(dayIndex) && dayIndex >= 1 ? dayIndex : 1;
  return { dailyLimit: next.dailyLimit, inDays: Math.max(1, current.throughDay - day + 1) };
}

// ── Warm-up window ───────────────────────────────────────────────────────────

/** Warm-up is active until durationDays have elapsed since the first send. */
export function warmupIsActive(firstSendAt, durationDays, now = new Date()) {
  if (!firstSendAt) return true; // never sent — warm-up starts on first send
  const days = resolveDurationDays(durationDays);
  const start = new Date(firstSendAt).getTime();
  const current = new Date(now).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(current)) return true; // unreadable anchor → stay protected
  return current < start + days * MS_PER_DAY;
}

/** Whole days remaining in the warm-up window (0 once it has ended). */
export function warmupDaysRemaining(firstSendAt, durationDays, now = new Date()) {
  const days = resolveDurationDays(durationDays);
  if (!firstSendAt) return days;
  const start = new Date(firstSendAt).getTime();
  const current = new Date(now).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(current)) return days;
  return Math.max(0, Math.ceil((start + days * MS_PER_DAY - current) / MS_PER_DAY));
}

/**
 * Effective daily limit for a user.
 * A non-null users.warmup_daily_limit is an explicit per-account admin override and
 * wins over the ladder — the escape hatch predates the ladder and is preserved.
 */
export function effectiveDailyLimit(user, ladder, now = new Date()) {
  const override = parsePositiveInt(user?.warmupDailyLimit, null);
  if (override !== null) return override;
  return stageForDay(ladder, warmupDayIndex(user?.firstSendAt, now)).dailyLimit;
}
