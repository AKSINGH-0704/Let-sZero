// M51 — the AutoPay authority.
//
// Mirrors the discipline of shared/subscriptionStateMachine.js: ONE transition
// table, ONE liveness predicate, ONE rollout gate, used by both storage backends,
// the routes, the sweep and the client. It decides nothing about money — the
// pricing authority (shared/seatPricing.js, ADR-020) owns amounts and the
// entitlement authority (shared/seatEntitlement.js) owns seats. This owns only:
//
//   • the legality of a mandate status change,
//   • whether a given subscription may be charged without the customer acting,
//   • who is inside the staged rollout,
//   • whether a rail requires additional-factor authentication for an amount.
//
// Pure and dependency-free (beyond the lifecycle constants it re-uses) so it is
// safe in both storage backends, in the client, and in unit tests without a
// database or a gateway.
//
// ── WHY AUTOPAY IS PER SUBSCRIPTION, NOT PER USER OR WORKSPACE ───────────────
// The obvious shape is a boolean on the user or the workspace. Both are wrong and
// neither is reversible once shipped: enabling autopay for team seats would
// silently enable it for every future commercial product, and revoking a card for
// one product would revoke it for all of them.
//
// So the model is split in two:
//   • the INSTRUMENT — a `payment_mandates` row. Owned by the PERSON who
//     authorised it at their bank, because that is who authorised it.
//   • the DECISION — `autopay_enabled` + `mandate_id` on the SUBSCRIPTION row.
//
// A future commercial product is a second subscription row with its own decision
// and its own pointer. It may share an instrument or use a different one, and
// disabling autopay on one product cannot touch another. Adding that product
// becomes a data change rather than a redesign.

import { RENEWAL_MODE } from "./subscriptionStateMachine.js";

// ── Mandate lifecycle ────────────────────────────────────────────────────────

/**
 * A mandate row exists from the moment we ask the customer to authorise, so
 * unlike a subscription it IS born pending — the authorisation is a real,
 * observable step that can be abandoned, and an abandoned authorisation must not
 * be indistinguishable from one that was never started.
 */
export const MANDATE_STATUS = Object.freeze({
  /** Created; the customer has not completed authorisation yet. Entitles nothing. */
  PENDING: "PENDING",
  /** Authorised and usable. The only status that can fund a charge. */
  ACTIVE: "ACTIVE",
  /** Temporarily suspended BY THE CUSTOMER, time-bounded via `pausedUntil`. */
  PAUSED: "PAUSED",
  /** Authorisation failed at the bank/rail. Terminal — recovery is a NEW mandate. */
  FAILED: "FAILED",
  /** Withdrawn by the customer, by us, or at the gateway. Terminal. */
  REVOKED: "REVOKED",
  /** Card expiry / mandate end date passed. Terminal. */
  EXPIRED: "EXPIRED",
});

/**
 * Legal successor statuses.
 *  - PENDING → ACTIVE (confirmed), FAILED (bank declined), REVOKED (abandoned/cancelled)
 *  - ACTIVE  → PAUSED, REVOKED, EXPIRED
 *  - PAUSED  → ACTIVE (resumed), REVOKED, EXPIRED
 *  - FAILED / REVOKED / EXPIRED are TERMINAL.
 *
 * Terminality is the mechanism behind the webhook-ordering rule (Phase 4 §1.2):
 * Razorpay does not guarantee delivery order, so a `token.confirmed` can arrive
 * AFTER the `token.cancelled` that superseded it. Because REVOKED admits no
 * successor, a late confirmation cannot resurrect a mandate the customer has
 * already withdrawn — which would otherwise re-enable debits against a revoked
 * bank authorisation. Ordering safety is a property of this table, not of the
 * handler that reads it.
 */
export const MANDATE_TRANSITIONS = Object.freeze({
  [MANDATE_STATUS.PENDING]: [MANDATE_STATUS.ACTIVE, MANDATE_STATUS.FAILED, MANDATE_STATUS.REVOKED],
  [MANDATE_STATUS.ACTIVE]: [MANDATE_STATUS.PAUSED, MANDATE_STATUS.REVOKED, MANDATE_STATUS.EXPIRED],
  [MANDATE_STATUS.PAUSED]: [MANDATE_STATUS.ACTIVE, MANDATE_STATUS.REVOKED, MANDATE_STATUS.EXPIRED],
  [MANDATE_STATUS.FAILED]: [],
  [MANDATE_STATUS.REVOKED]: [],
  [MANDATE_STATUS.EXPIRED]: [],
});

export const MANDATE_TERMINAL_STATUSES = Object.freeze([
  MANDATE_STATUS.FAILED, MANDATE_STATUS.REVOKED, MANDATE_STATUS.EXPIRED,
]);

/** How the customer authorised us. Reserved for per-rail policy; see requiresAfa. */
export const MANDATE_METHOD = Object.freeze({
  CARD: "CARD",
  UPI: "UPI",
  EMANDATE: "EMANDATE",
});

/**
 * WHICH gateway holds the instrument.
 *
 * The mandate model is provider-NEUTRAL: the columns are `provider_customer_id`
 * and `provider_token_id`, and uniqueness is per provider, so a second gateway
 * can coexist without a schema redesign or a rename of live columns. Razorpay is
 * the only integration today; this exists so adding another is a new execution
 * module plus a dispatch-table entry, never a migration of the ownership model.
 */
export const PAYMENT_PROVIDER = Object.freeze({
  RAZORPAY: "RAZORPAY",
});

export const DEFAULT_PAYMENT_PROVIDER = PAYMENT_PROVIDER.RAZORPAY;

/** True if `provider` is one this build knows how to execute against. */
export function isKnownProvider(provider) {
  return Object.prototype.hasOwnProperty.call(PAYMENT_PROVIDER, String(provider ?? ""));
}

/** True if `status` admits no further transitions. */
export function isMandateTerminal(status) {
  return MANDATE_TERMINAL_STATUSES.includes(status);
}

/** True if a mandate may move from `from` to `to`. Same-status is NOT a transition. */
export function canMandateTransition(from, to) {
  const allowed = MANDATE_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/** Throw a descriptive error if the transition is illegal. Returns true otherwise. */
export function assertMandateTransition(from, to) {
  if (!canMandateTransition(from, to)) {
    throw new Error(`Illegal mandate transition: ${from} → ${to}`);
  }
  return true;
}

/** Has this mandate's expiry passed as at `now`? Null expiry never expires. */
export function isMandateExpired(mandate, now = new Date()) {
  if (!mandate?.expiresAt) return false;
  return new Date(mandate.expiresAt).getTime() <= new Date(now).getTime();
}

/**
 * Has a customer-set pause elapsed?
 *
 * Deliberately NOT folded into isAutopayLive. A pure predicate that quietly
 * treated an elapsed pause as ACTIVE would disagree with the stored status, and
 * two answers to "is this mandate active?" is exactly the drift this module
 * exists to prevent. The sweep asks this, performs the PAUSED → ACTIVE
 * transition, and only then does liveness change. One authority for status.
 */
export function isPauseElapsed(mandate, now = new Date()) {
  if (mandate?.status !== MANDATE_STATUS.PAUSED) return false;
  if (!mandate.pausedUntil) return false;
  return new Date(mandate.pausedUntil).getTime() <= new Date(now).getTime();
}

// ── The liveness predicate ───────────────────────────────────────────────────

/**
 * THE question: may this subscription be charged without the customer acting?
 *
 * Expressed once, here. No route, no sweep, no client and no storage backend may
 * re-derive it — that is how `isEntitling` has kept seat entitlement from
 * drifting, and the same rule applies to money movement.
 *
 * The expiry check is against the CHARGE moment (periodEnd), not against now: a
 * mandate that expires next week cannot fund a renewal that falls the week after,
 * and discovering that at the boundary rather than in advance is how a customer
 * ends up with a silent involuntary lapse.
 *
 * @param {object} subscription  workspace_subscriptions row
 * @param {object|null} mandate  the payment_mandates row the subscription points at
 */
export function isAutopayLive(subscription, mandate, { now = new Date() } = {}) {
  if (!subscription?.autopayEnabled) return false;
  if (!subscription.mandateId || !mandate) return false;
  // Guards against a caller passing SOME mandate rather than THE mandate.
  if (mandate.id !== subscription.mandateId) return false;

  // ── THE PAYMENT-AUTHORITY CHECK (M51 Phase 5.2, defect 7.1) ────────────────
  // A mandate may only fund the workspace whose root authorised it. This looked
  // redundant with the bind-time guard in bindMandateToSubscription — it is not,
  // because a subscription can CHANGE WORKSPACE after binding:
  // transferWorkspaceOwnership moves `workspaceRootId` to the new owner while the
  // pointer still names the OLD owner's instrument. Without this line the
  // predicate returned true and the departed owner's card would have been
  // debited indefinitely for a workspace they no longer own.
  //
  // Ownership transfer also revokes autopay explicitly, so this is the second of
  // two independent guards. That is deliberate (TRUST-028): the invariant has to
  // be a property of the predicate, not of every caller remembering to uphold it.
  if (subscription.workspaceRootId && mandate.workspaceRootId
    && mandate.workspaceRootId !== subscription.workspaceRootId) return false;

  if (mandate.status !== MANDATE_STATUS.ACTIVE) return false;
  const chargeAt = subscription.periodEnd || now;
  return !isMandateExpired(mandate, chargeAt);
}

/**
 * M52 — would this charge exceed the ceiling the customer registered at their bank?
 *
 * `maxAmountMinor` is the limit authorised at mandate creation. The schema has
 * always described it as something "detected AT UPGRADE TIME rather than
 * surfacing 30 days later as a mystery decline" — but nothing anywhere compared
 * a renewal amount against it. Under M51 that was nearly harmless: mandates were
 * rare. M52 gives every purchaser one, sized against their FIRST renewal, and
 * then makes upgrading the most common next action.
 *
 * Left unchecked the sequence is: buy 1 seat (ceiling 2×₹129), upgrade to 5
 * seats (renewal ₹575), and thirty days later the bank refuses a debit above the
 * registered limit. The customer has a valid card, has done nothing wrong, and
 * enters a dunning ladder that cannot possibly recover — every retry hits the
 * same ceiling. That is worse than a decline: it is an unrecoverable one.
 *
 * A null ceiling means "no limit was registered" and never blocks — an unknown
 * limit must not become a refusal for the mandates that predate this check.
 */
export function exceedsMandateCeiling(amountMinor, mandate) {
  const ceiling = mandate?.maxAmountMinor;
  if (ceiling == null) return false;
  return Number(amountMinor) > Number(ceiling);
}

/**
 * How this subscription's period actually ends. M44 (Audit 195) withheld a launch
 * because the UI promised "Next charge ₹X on <date>" for a system that could not
 * charge; the fix centralised the fact into ONE projected field. M51 changes only
 * what fills that field in — every surface follows with no copy hunt.
 */
export function renewalModeFor(subscription, mandate, opts = {}) {
  return isAutopayLive(subscription, mandate, opts)
    ? RENEWAL_MODE.AUTOMATIC
    : RENEWAL_MODE.MANUAL;
}

/**
 * M52 — how a period WOULD end for a workspace that has not bought yet.
 *
 * `renewalModeFor` needs a subscription; before the first purchase there isn't
 * one, so the API fell back to the frozen platform constant and answered MANUAL.
 * That was true while a mandate could only be created after a subscription
 * existed. It stopped being true the moment AutoPay became part of checkout: a
 * first-time buyer inside the rollout WILL renew automatically, so the one field
 * M44 created precisely so no surface could misdescribe renewal was about to
 * state the opposite of the truth — at the exact moment the customer decides
 * whether to hand over a card.
 *
 * Deliberately gated on the SAME rollout predicate the checkout path uses, so
 * "what we tell you before you buy" and "what we actually do when you buy"
 * cannot disagree. Outside the rollout this returns MANUAL, which is both
 * correct and identical to the previous behaviour.
 *
 * @param {string} workspaceRootId
 * @param {{scope:string, allowlist:string[], limitPct:number}} autopayConfig
 */
export function prospectiveRenewalMode(workspaceRootId, autopayConfig) {
  return autopayAllowedFor(workspaceRootId, autopayConfig)
    ? RENEWAL_MODE.AUTOMATIC
    : RENEWAL_MODE.MANUAL;
}

// ── Additional-factor authentication (AFA) ───────────────────────────────────
//
// RBI caps AFA-exempt recurring debits at ₹15,000 per transaction. Above it the
// customer must authenticate that specific debit.
//
// This does NOT remove annual autopay as a commercial capability (operator
// ruling, Phase 3 Addendum Part A). At the authoritative ADR-020 pricing, 25
// seats annual is ₹19,500 and crosses the ceiling; most annual subscriptions
// below ~19 seats never see AFA at all. The requirement is handled inside the
// payment execution layer as a third charge outcome, so an annual customer
// authenticates ONCE A YEAR instead of completing a full manual checkout.
//
// Policy as data, beside the dunning ladder it sits next to conceptually: a
// regulatory change is a constant edit, not a code change.

/** RBI AFA-exempt ceiling for recurring debits, in minor units (paise). */
export const AFA_EXEMPT_LIMIT_MINOR = 1_500_000;

/**
 * Does a charge of this size need the customer to authenticate it?
 *
 * Method-independent by default: the ₹15,000 ceiling applies across card
 * e-mandate, UPI AutoPay and NACH alike. `method` is accepted so a per-rail
 * divergence stays a data change here rather than a new branch at the call site.
 */
export function requiresAfa(amountMinor, method = null) { // eslint-disable-line no-unused-vars
  return Number(amountMinor) > AFA_EXEMPT_LIMIT_MINOR;
}

/**
 * Lead time for the mandatory pre-debit notice.
 *
 * An AFA-required charge needs an ACTION from the customer, not just notice, so
 * it goes out early enough to cover a working day. 24h is the regulatory floor
 * for the informational case and is unchanged.
 */
export const PREDEBIT_NOTICE_HOURS = Object.freeze({ STANDARD: 24, AFA: 72 });

export function predebitNoticeLeadHours(amountMinor, method = null) {
  return requiresAfa(amountMinor, method)
    ? PREDEBIT_NOTICE_HOURS.AFA
    : PREDEBIT_NOTICE_HOURS.STANDARD;
}

/**
 * The three-valued charge outcome.
 *
 * AUTH_REQUIRED is NOT a failure and must never be collapsed into one:
 *  • treating it as FAILED burns a dunning rung for something the customer has
 *    done nothing wrong about, and eventually expires a paying team;
 *  • treating it as SUCCEEDED grants a period nobody paid for.
 * It is its own outcome with its own copy, its own alert and its own recovery.
 */
export const CHARGE_OUTCOME = Object.freeze({
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  AUTH_REQUIRED: "AUTH_REQUIRED",
});

/**
 * WHAT CAUSED a renewal. Recorded in `details.trigger` on every renewal audit row.
 *
 * "Did the customer initiate this, or did we?" is the first question asked of any
 * disputed recurring charge. The audit action already distinguishes
 * SUBSCRIPTION_AUTO_RENEWED from SUBSCRIPTION_RENEWED; this adds the finer grain
 * that separates a first automatic attempt from a dunning retry, and either from
 * an operator re-drive or a data migration.
 */
export const RENEWAL_TRIGGER = Object.freeze({
  /** The sweep charged a live mandate at the period boundary. */
  AUTOMATIC: "AUTOMATIC",
  /** The customer initiated payment themselves (/api/seats/renew). */
  MANUAL: "MANUAL",
  /** A dunning-ladder rung re-attempted a previously failed charge. */
  RETRY: "RETRY",
  /** A platform operator re-drove a renewal. */
  OPERATOR: "OPERATOR",
  /** A backfill or data migration moved a period. */
  MIGRATION: "MIGRATION",
});

/** Triggers where the platform moved the money without the customer acting. */
export const UNATTENDED_TRIGGERS = Object.freeze([
  RENEWAL_TRIGGER.AUTOMATIC, RENEWAL_TRIGGER.RETRY,
]);

/** True when the renewal happened without the customer being present. */
export function isUnattendedTrigger(trigger) {
  return UNATTENDED_TRIGGERS.includes(trigger);
}

// ── Staged rollout ───────────────────────────────────────────────────────────
//
// Reuses the ADR-021 `warmup_scope` pattern rather than inventing a second
// rollout mechanism: an enum-valued platform setting read through a normalising
// accessor that fails toward OFF on an unset or malformed value.

export const AUTOPAY_SETTING_KEYS = Object.freeze({
  SCOPE: "seat_autopay_scope",
  ALLOWLIST: "seat_autopay_allowlist",
  LIMIT_PCT: "seat_autopay_limit_pct",
});

export const AUTOPAY_SCOPE = Object.freeze({
  /** Nobody. Setup UI hidden, charge attempt never fires. */
  OFF: "OFF",
  /** Allowlist only — internal accounts. */
  INTERNAL: "INTERNAL",
  /** Allowlist only — real, consenting customers. Distinct from INTERNAL so the
   *  operator can tell "our own accounts" from "customers we owe care to". */
  PILOT: "PILOT",
  /** Allowlist ∪ a deterministic percentage bucket. */
  LIMITED: "LIMITED",
  /** Everyone. */
  GA: "GA",
});

export const DEFAULT_AUTOPAY_SCOPE = AUTOPAY_SCOPE.OFF;

/**
 * Parse the scope setting. Unset, unrecognised or malformed ⇒ OFF.
 *
 * Fails toward NOT charging. The warm-up equivalent of this accessor degrades
 * toward enforcement; the billing equivalent degrades toward not taking money,
 * which is the same principle pointed at the thing that actually matters here.
 */
export function parseAutopayScope(raw) {
  const v = String(raw ?? "").trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(AUTOPAY_SCOPE, v) ? AUTOPAY_SCOPE[v] : DEFAULT_AUTOPAY_SCOPE;
}

/** Parse the CSV allowlist setting into a deduplicated array of ids. */
export function parseAutopayAllowlist(raw) {
  if (!raw) return [];
  return [...new Set(
    String(raw).split(",").map(s => s.trim()).filter(Boolean)
  )];
}

/** Parse the LIMITED percentage. Anything unusable ⇒ 0 (nobody). */
export function parseAutopayLimitPct(raw) {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/**
 * FNV-1a (32-bit) over the workspace id → a stable bucket in [0, 100).
 *
 * STABLE, not random. A random draw per evaluation would let a workspace drift
 * in and out of the rollout between hourly sweep ticks, so the same customer
 * would be told "renews automatically" on Monday and "renewal is manual" on
 * Tuesday — contradictory copy about money, which is the fastest way to lose
 * trust in a billing system. With a stable hash, membership changes only when the
 * operator changes the percentage.
 *
 * Deliberately not crypto: this is a bucketing function, not a security control,
 * and keeping it dependency-free keeps this module usable in the client.
 */
export function rolloutBucket(workspaceRootId) {
  const s = String(workspaceRootId ?? "");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    // 32-bit FNV prime multiply, expressed with shifts to stay in int32 range.
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h % 100;
}

/**
 * Is this workspace inside the staged rollout?
 *
 * @param {string} workspaceRootId
 * @param {{scope:string, allowlist:string[], limitPct:number}} config
 */
export function autopayAllowedFor(workspaceRootId, config) {
  const scope = config?.scope ?? DEFAULT_AUTOPAY_SCOPE;
  if (!workspaceRootId) return false;
  const allowlist = config?.allowlist ?? [];
  switch (scope) {
    case AUTOPAY_SCOPE.GA:
      return true;
    case AUTOPAY_SCOPE.LIMITED:
      return allowlist.includes(workspaceRootId)
        || rolloutBucket(workspaceRootId) < (config?.limitPct ?? 0);
    case AUTOPAY_SCOPE.INTERNAL:
    case AUTOPAY_SCOPE.PILOT:
      return allowlist.includes(workspaceRootId);
    case AUTOPAY_SCOPE.OFF:
    default:
      return false;
  }
}

// ── Derived display state ────────────────────────────────────────────────────

/**
 * The ONE state the Team Seats page renders from. Derived on the server and
 * projected, so the client cannot invent a seventh state or disagree with the
 * server about which of six applies.
 *
 * NEEDS_ATTENTION and PAUSED must be visually distinct in the UI: one is a
 * problem, the other is a choice the customer made. (M50-C: a UI distinction is
 * not verified until it has been rendered and looked at.)
 */
export const AUTOPAY_DISPLAY_STATE = Object.freeze({
  NOT_SET_UP: "NOT_SET_UP",
  ACTIVE: "ACTIVE",
  PENDING_AUTH: "PENDING_AUTH",
  AFA_REQUIRED: "AFA_REQUIRED",
  PAUSED: "PAUSED",
  NEEDS_ATTENTION: "NEEDS_ATTENTION",
});

/**
 * @param {object|null} subscription
 * @param {object|null} mandate  the row `subscription.mandateId` points at
 */
export function autopayDisplayState(subscription, mandate, { now = new Date() } = {}) {
  if (!subscription) return AUTOPAY_DISPLAY_STATE.NOT_SET_UP;

  // An outstanding authentication request outranks everything else: it is the
  // only state where the customer must act to avoid losing seats they are
  // otherwise paying for.
  if (subscription.autopayAuthRequiredAt) return AUTOPAY_DISPLAY_STATE.AFA_REQUIRED;

  if (!mandate) return AUTOPAY_DISPLAY_STATE.NOT_SET_UP;
  if (mandate.status === MANDATE_STATUS.PENDING) return AUTOPAY_DISPLAY_STATE.PENDING_AUTH;

  // A dead instrument is a problem regardless of the customer's intent flag.
  if (isMandateTerminal(mandate.status) || isMandateExpired(mandate, now)) {
    return AUTOPAY_DISPLAY_STATE.NEEDS_ATTENTION;
  }

  // A customer-chosen pause, or autopay switched off while the instrument stays
  // usable. Both are choices, not faults — hence PAUSED, not NEEDS_ATTENTION.
  if (mandate.status === MANDATE_STATUS.PAUSED || !subscription.autopayEnabled) {
    return AUTOPAY_DISPLAY_STATE.PAUSED;
  }

  return isAutopayLive(subscription, mandate, { now })
    ? AUTOPAY_DISPLAY_STATE.ACTIVE
    : AUTOPAY_DISPLAY_STATE.NEEDS_ATTENTION;
}
