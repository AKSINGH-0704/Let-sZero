// Progressive warm-up policy — MXX.
//
// Two layers are covered:
//   1. shared/warmupPolicy.js as a pure module: stage boundaries, day-index
//      derivation, next-increase maths, and — the reason this module exists —
//      configuration that fails SAFE rather than open.
//   2. the enforcement path end-to-end against the in-memory storage backend:
//      a campaign that exhausts the day's volume must park itself for automatic
//      continuation rather than stopping dead, and concurrent claims must never
//      overshoot the limit.
//
// Runs entirely against in-memory storage (DATABASE_URL unset → server/db.js
// activates dev mode); no Postgres, no SES.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DEFAULT_WARMUP_LADDER,
  DEFAULT_WARMUP_DURATION_DAYS,
  parsePositiveInt,
  parseLadder,
  resolveLadder,
  resolveDurationDays,
  warmupDayIndex,
  stageForDay,
  nextStage,
  warmupIsActive,
  warmupDaysRemaining,
  effectiveDailyLimit,
} from "../../shared/warmupPolicy.js";
import { storage } from "../../server/storage.js";
import { runCampaignLoop } from "../../server/campaignLoop.js";
import { claimWarmupSlot, warmupWindowResetAt, resetWarmupPolicyCache } from "../../server/senderAuth.js";

vi.mock("../../server/email.js", () => ({
  sendCampaignEmail: vi.fn(async () => ({ messageId: `mock-${Math.random().toString(36).slice(2)}` })),
}));

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);

/**
 * Run `fn` 25 hours in the future. Fakes ONLY Date — the campaign loop's own
 * timers must keep running for real or the loop never completes.
 */
async function advanceOneDay(fn) {
  vi.useFakeTimers({ toFake: ["Date"] });
  try {
    vi.setSystemTime(new Date(Date.now() + 25 * 3600_000));
    await fn();
  } finally {
    vi.useRealTimers();
  }
}

async function makeSendableUser(overrides = {}) {
  const user = await storage.createUser({
    username: `user_${Math.random().toString(36).slice(2)}`,
    email: `${Math.random().toString(36).slice(2)}@example.com`,
    password: "x".repeat(20),
    creditsReceived: 5000,
    emailVerified: true,
  });
  await storage.updateUser(user.id, { senderName: "Test Sender", ...overrides });
  const domain = await storage.createSenderDomain({
    userId: user.id,
    domain: "example.com",
    fromEmail: "campaigns@example.com",
    status: "VERIFIED",
  });
  return { user: await storage.getUserById(user.id), domain };
}

async function makeCampaignWithContacts(userId, senderDomainId, count) {
  const contacts = [];
  for (let i = 0; i < count; i++) {
    contacts.push(await storage.createContact({
      userId, email: `c${i}_${Math.random().toString(36).slice(2)}@example.com`,
    }));
  }
  const campaign = await storage.createCampaign({
    userId,
    name: "Warm-up test campaign",
    status: "PENDING",
    totalEmails: contacts.length,
    contactIds: contacts.map(c => c.id),
    senderDomainId,
    senderEmailSnapshot: "campaigns@example.com",
    templateSnapshot: { subject: "Hi", body: "Hello there" },
  });
  return { campaign, contacts };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetWarmupPolicyCache();
});

describe("ladder stage boundaries", () => {
  // The shipped policy: days 1-3 → 50, days 4-7 → 100, day 8+ → 200.
  const cases = [
    [1, 50], [2, 50], [3, 50],
    [4, 100], [5, 100], [7, 100],
    [8, 200], [9, 200], [30, 200], [365, 200],
  ];
  it.each(cases)("day %i allows %i emails", (day, expected) => {
    expect(stageForDay(DEFAULT_WARMUP_LADDER, day).dailyLimit).toBe(expected);
  });

  it("marks only the terminal stage as final", () => {
    expect(stageForDay(DEFAULT_WARMUP_LADDER, 7).isFinal).toBe(false);
    expect(stageForDay(DEFAULT_WARMUP_LADDER, 8).isFinal).toBe(true);
  });

  it("reports the next increase and stops reporting one at the top", () => {
    expect(nextStage(DEFAULT_WARMUP_LADDER, 1)).toEqual({ dailyLimit: 100, inDays: 3 });
    expect(nextStage(DEFAULT_WARMUP_LADDER, 3)).toEqual({ dailyLimit: 100, inDays: 1 });
    expect(nextStage(DEFAULT_WARMUP_LADDER, 4)).toEqual({ dailyLimit: 200, inDays: 4 });
    expect(nextStage(DEFAULT_WARMUP_LADDER, 7)).toEqual({ dailyLimit: 200, inDays: 1 });
    expect(nextStage(DEFAULT_WARMUP_LADDER, 8)).toBeNull();
  });
});

describe("day index derivation", () => {
  it("puts a sender who has never sent on day 1", () => {
    expect(warmupDayIndex(null)).toBe(1);
  });

  it("counts the first send day as day 1, not day 0", () => {
    expect(warmupDayIndex(new Date())).toBe(1);
    expect(warmupDayIndex(daysAgo(1))).toBe(2);
    expect(warmupDayIndex(daysAgo(7))).toBe(8);
  });

  it("clamps a future anchor to day 1 rather than producing a negative index", () => {
    expect(warmupDayIndex(new Date(Date.now() + 5 * 86_400_000))).toBe(1);
  });

  it("clamps an unparseable anchor to day 1", () => {
    expect(warmupDayIndex("not-a-date")).toBe(1);
  });
});

describe("configuration fails safe, never open", () => {
  // The defect this module was created to close: parseInt("") is NaN, and
  // `firstSendAt + NaN days` is an Invalid Date whose `<` comparison is always
  // false — which reported warm-up as FINISHED and granted unlimited sending.
  it.each(["", "  ", "abc", "3o", "0", "-5", "1.5", null, undefined])(
    "a malformed duration (%p) keeps warm-up ACTIVE, not unlimited",
    (bad) => {
      expect(warmupIsActive(daysAgo(5), bad)).toBe(true);
      expect(resolveDurationDays(bad)).toBe(DEFAULT_WARMUP_DURATION_DAYS);
    }
  );

  it("still ends warm-up on a valid duration", () => {
    expect(warmupIsActive(daysAgo(31), 30)).toBe(false);
    expect(warmupIsActive(daysAgo(29), 30)).toBe(true);
  });

  it("never returns NaN from parsePositiveInt", () => {
    for (const bad of ["", "x", null, undefined, NaN, Infinity, -1, 0, 2.5]) {
      expect(parsePositiveInt(bad, 7)).toBe(7);
    }
    expect(parsePositiveInt("42", 7)).toBe(42);
    expect(parsePositiveInt(42, 7)).toBe(42);
  });

  it("falls back to the default ladder when configuration is unreadable", () => {
    expect(resolveLadder({ rawLadder: "{not json" })).toEqual(DEFAULT_WARMUP_LADDER);
    expect(resolveLadder({})).toEqual(DEFAULT_WARMUP_LADDER);
    expect(resolveLadder({ rawLadder: "[]" })).toEqual(DEFAULT_WARMUP_LADDER);
  });

  it("promotes a configured flat limit to a single stage when no ladder is set", () => {
    expect(resolveLadder({ rawFlatLimit: "200" })).toEqual([{ throughDay: null, dailyLimit: 200 }]);
  });

  it("a fallback ladder is always enforcing — never zero and never unlimited", () => {
    for (const raw of ["{bad", "[]", null, undefined, '[{"throughDay":1}]']) {
      const ladder = resolveLadder({ rawLadder: raw });
      expect(ladder.length).toBeGreaterThan(0);
      for (const stage of ladder) expect(stage.dailyLimit).toBeGreaterThan(0);
    }
  });
});

describe("ladder validation", () => {
  const reason = () => { const seen = []; const fn = (r) => seen.push(r); fn.seen = seen; return fn; };

  it("rejects a decreasing ladder — the invariant the rolling counter depends on", () => {
    const onInvalid = reason();
    const bad = '[{"throughDay":3,"dailyLimit":100},{"throughDay":null,"dailyLimit":50}]';
    expect(parseLadder(bad, onInvalid)).toBeNull();
    expect(onInvalid.seen[0]).toMatch(/never decrease/);
  });

  it("accepts a flat (non-decreasing) ladder", () => {
    expect(parseLadder('[{"throughDay":3,"dailyLimit":50},{"throughDay":null,"dailyLimit":50}]')).not.toBeNull();
  });

  it("rejects a ladder whose last stage is not terminal", () => {
    expect(parseLadder('[{"throughDay":3,"dailyLimit":50}]')).toBeNull();
  });

  it("rejects a terminal stage that is not last", () => {
    expect(parseLadder('[{"throughDay":null,"dailyLimit":50},{"throughDay":7,"dailyLimit":100}]')).toBeNull();
  });

  it("rejects non-ascending throughDay values", () => {
    expect(parseLadder('[{"throughDay":7,"dailyLimit":50},{"throughDay":3,"dailyLimit":100},{"throughDay":null,"dailyLimit":200}]')).toBeNull();
  });

  it("rejects non-positive-integer limits", () => {
    expect(parseLadder('[{"throughDay":3,"dailyLimit":0},{"throughDay":null,"dailyLimit":200}]')).toBeNull();
    expect(parseLadder('[{"throughDay":3,"dailyLimit":"lots"},{"throughDay":null,"dailyLimit":200}]')).toBeNull();
  });

  it("accepts the shipped default", () => {
    expect(parseLadder(JSON.stringify(DEFAULT_WARMUP_LADDER))).toEqual(DEFAULT_WARMUP_LADDER);
  });
});

describe("effective limit and the admin override", () => {
  it("follows the ladder for a normal account", () => {
    expect(effectiveDailyLimit({ firstSendAt: daysAgo(0) }, DEFAULT_WARMUP_LADDER)).toBe(50);
    expect(effectiveDailyLimit({ firstSendAt: daysAgo(4) }, DEFAULT_WARMUP_LADDER)).toBe(100);
    expect(effectiveDailyLimit({ firstSendAt: daysAgo(10) }, DEFAULT_WARMUP_LADDER)).toBe(200);
  });

  it("lets a per-account override replace the ladder entirely", () => {
    const user = { firstSendAt: daysAgo(0), warmupDailyLimit: 100_000 };
    expect(effectiveDailyLimit(user, DEFAULT_WARMUP_LADDER)).toBe(100_000);
  });

  it("ignores a malformed override rather than disabling the limit", () => {
    const user = { firstSendAt: daysAgo(0), warmupDailyLimit: 0 };
    expect(effectiveDailyLimit(user, DEFAULT_WARMUP_LADDER)).toBe(50);
  });

  it("reports days remaining in the warm-up window", () => {
    expect(warmupDaysRemaining(null, 30)).toBe(30);
    expect(warmupDaysRemaining(daysAgo(10), 30)).toBe(20);
    expect(warmupDaysRemaining(daysAgo(40), 30)).toBe(0);
  });
});

describe("per-email claim enforcement", () => {
  it("stops granting slots once the day's volume is spent", async () => {
    const { user } = await makeSendableUser();
    await storage.updateUser(user.id, { firstSendAt: new Date() }); // day 1 → 50/day
    const fresh = await storage.getUserById(user.id);

    let granted = 0;
    for (let i = 0; i < 60; i++) {
      if (await claimWarmupSlot(fresh)) granted++;
    }
    expect(granted).toBe(50);
  });

  it("does not overshoot under concurrent claims", async () => {
    const { user } = await makeSendableUser();
    await storage.updateUser(user.id, { firstSendAt: new Date() });
    const fresh = await storage.getUserById(user.id);

    const results = await Promise.all(
      Array.from({ length: 120 }, () => claimWarmupSlot(fresh))
    );
    expect(results.filter(Boolean).length).toBe(50);
  });

  // firstSendAt is a trust anchor: storage.updateUser deliberately refuses to write
  // it (only recordFirstSend sets it, once), so an older sender is modelled by
  // handing claimWarmupSlot the owner row it would have loaded. The counter still
  // lives in real storage, keyed by the real user id — only the anchor is posed.
  it("grants the higher stage limit to an older sender", async () => {
    const { user } = await makeSendableUser();
    const day10 = { ...(await storage.getUserById(user.id)), firstSendAt: daysAgo(9) };

    const results = await Promise.all(
      Array.from({ length: 260 }, () => claimWarmupSlot(day10))
    );
    expect(results.filter(Boolean).length).toBe(200);
  });

  it("stops enforcing once the warm-up window has ended", async () => {
    const { user } = await makeSendableUser();
    const graduated = { ...(await storage.getUserById(user.id)), firstSendAt: daysAgo(40) };
    const results = await Promise.all(Array.from({ length: 300 }, () => claimWarmupSlot(graduated)));
    expect(results.every(Boolean)).toBe(true);
  });
});

describe("window reset time", () => {
  it("is 24h after the counter anchor", () => {
    const anchor = new Date(Date.now() - 3600_000);
    const resetAt = warmupWindowResetAt({ warmupEmailsResetAt: anchor });
    expect(resetAt.getTime()).toBe(anchor.getTime() + 86_400_000);
  });

  it("never schedules in the past, even with a lapsed or unreadable anchor", () => {
    for (const anchor of [new Date(Date.now() - 90 * 86_400_000), "nonsense", null, undefined]) {
      expect(warmupWindowResetAt({ warmupEmailsResetAt: anchor }).getTime()).toBeGreaterThan(Date.now());
    }
  });
});

describe("campaign continuation (PENDING + scheduledAt)", () => {
  it("parks an oversized campaign for automatic continuation instead of stopping it dead", async () => {
    const { user, domain } = await makeSendableUser();
    await storage.updateUser(user.id, { firstSendAt: new Date() }); // day 1 → 50/day
    const { campaign } = await makeCampaignWithContacts(user.id, domain.id, 70);

    await runCampaignLoop(campaign.id, user.id);
    const after = await storage.getCampaign(campaign.id);

    // Exactly the day's volume went out — no overshoot.
    expect(after.sentEmails).toBe(50);
    // Parked, not paused: the scheduler owns it now. PAUSED would strand it, because
    // both the scheduler and the watchdog query PENDING only.
    expect(after.status).toBe("PENDING");
    expect(after.scheduledAt).toBeTruthy();
    expect(new Date(after.scheduledAt).getTime()).toBeGreaterThan(Date.now());
    // Not finalized — the campaign is unfinished, not failed.
    expect(after.finalizedAt).toBeFalsy();
  });

  it("resumes where it left off without re-sending, and completes", async () => {
    const { user, domain } = await makeSendableUser();
    await storage.updateUser(user.id, { firstSendAt: new Date() });
    const { campaign, contacts } = await makeCampaignWithContacts(user.id, domain.id, 70);

    await runCampaignLoop(campaign.id, user.id);
    expect((await storage.getCampaign(campaign.id)).sentEmails).toBe(50);

    // The next day arrives. Only Date is faked — the loop's own timers stay real —
    // and the 24h counter window then resets lazily on the next claim, exactly as it
    // does in production when the scheduler re-enqueues the parked campaign.
    await advanceOneDay(async () => { await runCampaignLoop(campaign.id, user.id); });

    const after = await storage.getCampaign(campaign.id);
    expect(after.status).toBe("COMPLETED");
    expect(after.sentEmails).toBe(70);

    // Each contact was emailed exactly once across both runs — the continuation
    // must not re-send what the first pass already delivered.
    const emails = await storage.getCampaignEmailsByCampaign(campaign.id, 500);
    const sent = emails.filter(e => e.status === "SENT");
    expect(sent).toHaveLength(70);
    expect(new Set(sent.map(e => e.contactId)).size).toBe(70);
    expect(new Set(contacts.map(c => c.id)).size).toBe(70);
  });

  it("charges exactly one credit per delivered email across the continuation", async () => {
    const { user, domain } = await makeSendableUser();
    const { campaign } = await makeCampaignWithContacts(user.id, domain.id, 70);

    await runCampaignLoop(campaign.id, user.id);
    await advanceOneDay(async () => { await runCampaignLoop(campaign.id, user.id); });

    // The ledger is the authority on what was charged. Notably this also proves the
    // released claim is not double-charged: the contact whose claim was released at
    // the park is sent exactly once, on the resumed run.
    const ledger = (await storage.getCreditTransactions(user.id, 500) || [])
      .filter(t => t.campaignId === campaign.id);
    expect(ledger).toHaveLength(70);
  });

  it("a campaign inside the day's volume still completes normally", async () => {
    const { user, domain } = await makeSendableUser();
    await storage.updateUser(user.id, { firstSendAt: new Date() });
    const { campaign } = await makeCampaignWithContacts(user.id, domain.id, 20);

    await runCampaignLoop(campaign.id, user.id);
    const after = await storage.getCampaign(campaign.id);
    expect(after.status).toBe("COMPLETED");
    expect(after.sentEmails).toBe(20);
    expect(after.scheduledAt).toBeFalsy();
  });
});

// ── The policy a real database actually produces ──────────────────────────────
//
// Every other test in this file feeds resolveLadder() values by hand, and the
// integration tests run on memoryStorage, which starts with NO platform_settings and
// therefore falls through to DEFAULT_WARMUP_LADDER. Both are blind to the only
// configuration that ships to customers: the rows the migrations actually INSERT.
//
// That blind spot was not hypothetical. Migration 0003 seeded the pre-ladder flat
// limit `warmup_custom_domain_daily_limit = '200'`; MXX shipped the ladder module but
// no migration ever wrote `warmup_ramp_schedule`; and resolveLadder ranks a configured
// flat limit above the shipped default. Production therefore ran a single terminal
// stage of 200/day and every brand-new sender was handed full volume on day 1, while
// 191/191 tests stayed green.
//
// So this suite asserts against the migration FILES rather than fixtures: it replays
// the platform_settings seeds in migration order the way Postgres would, then asks the
// policy what a brand-new sender gets. It fails if a future migration reintroduces a
// competing key, or if the ladder seed is removed, malformed, or ordered so that
// something outranks it.
describe("the policy produced by the migrations as applied", () => {
  const KEYS = {
    LADDER: "warmup_ramp_schedule",
    FLAT: "warmup_custom_domain_daily_limit",
    DURATION: "warmup_duration_days",
  };

  /** Replay every platform_settings INSERT/DELETE in the migrations, in order. */
  async function settingsAfterMigrations() {
    const { readdir, readFile } = await import("fs/promises");
    const path = await import("path");
    const dir = path.resolve(import.meta.dirname, "..", "..", "migrations");
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

    const settings = new Map();
    for (const file of files) {
      const sql = await readFile(path.join(dir, file), "utf-8");
      // INSERT ... VALUES ('key', 'value', ...) — ON CONFLICT DO NOTHING means the
      // first writer wins, matching Postgres given migrations apply in order.
      for (const block of sql.split(/INSERT\s+INTO\s+"?platform_settings"?/i).slice(1)) {
        const upTo = block.split(/;/)[0];
        for (const [, key, value] of upTo.matchAll(/\(\s*'([a-z0-9_]+)'\s*,\s*'((?:[^']|'')*)'/gi)) {
          if (!settings.has(key)) settings.set(key, value.replace(/''/g, "'"));
        }
      }
      for (const [, key] of sql.matchAll(
        /DELETE\s+FROM\s+"?platform_settings"?\s+WHERE\s+"?key"?\s*=\s*'([a-z0-9_]+)'/gi
      )) {
        settings.delete(key);
      }
    }
    return settings;
  }

  it("seeds a ladder that survives parseLadder — an invalid one silently falls back", async () => {
    const settings = await settingsAfterMigrations();
    const raw = settings.get(KEYS.LADDER);
    expect(raw, `no migration seeds ${KEYS.LADDER}`).toBeTruthy();

    const reasons = [];
    const parsed = parseLadder(raw, (r) => reasons.push(r));
    expect(reasons).toEqual([]);
    expect(parsed).toEqual(DEFAULT_WARMUP_LADDER);
  });

  it("starts a brand-new sender at the FIRST rung, not the last", async () => {
    const settings = await settingsAfterMigrations();
    const ladder = resolveLadder({
      rawLadder: settings.get(KEYS.LADDER),
      rawFlatLimit: settings.get(KEYS.FLAT),
    });

    // The regression itself: with the flat limit seeded and no ladder, this resolved
    // to [{ throughDay: null, dailyLimit: 200 }] and day 1 returned 200.
    expect(ladder.length).toBeGreaterThan(1);
    expect(effectiveDailyLimit({ firstSendAt: null }, ladder)).toBe(50);
    expect(effectiveDailyLimit({ firstSendAt: daysAgo(0) }, ladder)).toBe(50);
    expect(effectiveDailyLimit({ firstSendAt: daysAgo(4) }, ladder)).toBe(100);
    expect(effectiveDailyLimit({ firstSendAt: daysAgo(10) }, ladder)).toBe(200);
  });

  it("leaves a brand-new sender visibly climbing rather than topped out", async () => {
    const settings = await settingsAfterMigrations();
    const ladder = resolveLadder({
      rawLadder: settings.get(KEYS.LADDER),
      rawFlatLimit: settings.get(KEYS.FLAT),
    });
    // isFinalStage drives the banner's wording. Under the regression a day-1 sender
    // was on the terminal stage, so the dashboard told them their limit "is now 200
    // emails — the highest step" before they had sent anything at all.
    const day1 = stageForDay(ladder, warmupDayIndex(null));
    expect(day1.isFinal).toBe(false);
    expect(nextStage(ladder, 1)).toEqual({ dailyLimit: 100, inDays: 3 });
  });

  it("keeps the warm-up window at the documented duration", async () => {
    const settings = await settingsAfterMigrations();
    expect(resolveDurationDays(settings.get(KEYS.DURATION))).toBe(DEFAULT_WARMUP_DURATION_DAYS);
  });

  it("retires the dead platform-identity limit (ADR-009)", async () => {
    const settings = await settingsAfterMigrations();
    expect(settings.has("warmup_platform_identity_daily_limit")).toBe(false);
  });
});

describe("one source of truth for the ladder", () => {
  // The guard below scans source only, which is where the four original copies lived.
  // It could never have caught the fifth copy, because that one was a row in the
  // database: migration 0003's `warmup_custom_domain_daily_limit = '200'` outranked
  // the shipped ladder and was the number actually in force in production. A limit
  // seeded as a scalar is indistinguishable from an operator's deliberate choice, so
  // the ladder is the only form a warm-up volume may be seeded in.
  it("no migration seeds a warm-up daily limit outside the ladder", async () => {
    const { readdir, readFile } = await import("fs/promises");
    const path = await import("path");
    const dir = path.resolve(import.meta.dirname, "..", "..", "migrations");

    const offenders = [];
    for (const file of (await readdir(dir)).filter((f) => f.endsWith(".sql"))) {
      const sql = await readFile(path.join(dir, file), "utf-8");
      for (const block of sql.split(/INSERT\s+INTO\s+"?platform_settings"?/i).slice(1)) {
        for (const [, key] of block.split(/;/)[0].matchAll(/\(\s*'([a-z0-9_]+)'\s*,/gi)) {
          // A scalar daily-limit key. `warmup_ramp_schedule` is the sanctioned shape;
          // `warmup_duration_days` is a window length, not a volume.
          if (/^warmup_.*(daily_limit|limit)$/.test(key)) offenders.push(`${file}: ${key}`);
        }
      }
    }
    // 0003 is applied history and must not be rewritten. Both of its scalar seeds are
    // neutralised rather than edited: 0007 seeds the ladder, which outranks the custom
    // -domain limit, and DELETEs the platform-identity key (dead since ADR-009). This
    // list is a frozen baseline — any NEW entry is the regression coming back.
    expect(offenders).toEqual([
      "0003_m13b_trust_fields.sql: warmup_custom_domain_daily_limit",
      "0003_m13b_trust_fields.sql: warmup_platform_identity_daily_limit",
    ]);
  });

  // The defect this milestone set out to remove: the flat default was written into
  // four files, two of them user-visible, with nothing keeping them in sync. This
  // guard fails if a warm-up number is ever reintroduced outside the policy module.
  it("no shipped source file hardcodes a warm-up daily limit", async () => {
    const { readdir, readFile } = await import("fs/promises");
    const path = await import("path");
    const root = path.resolve(import.meta.dirname, "..", "..");
    const roots = ["server", "client/src", "shared"];
    const allowed = new Set([path.join("shared", "warmupPolicy.js")]);

    async function walk(dir) {
      const out = [];
      for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
        const rel = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...await walk(rel));
        else if (/\.(js|jsx)$/.test(entry.name)) out.push(rel);
      }
      return out;
    }

    const offenders = [];
    for (const dir of roots) {
      for (const rel of await walk(dir)) {
        if (allowed.has(rel)) continue;
        const text = await readFile(path.join(root, rel), "utf-8");
        if (!/warmup|warm-up/i.test(text)) continue;
        // A warm-up limit reintroduced as a literal fallback, e.g. `?? 200` or
        // `?? "200"` — the exact shape of the four defaults this milestone removed.
        for (const line of text.split("\n")) {
          if (!/warmup|warm-up|dailyLimit|ladder/i.test(line)) continue;
          if (/\?\?\s*["']?\d{2,}["']?/.test(line)) offenders.push(`${rel}: ${line.trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
