// M42 — the deterministic seat-subscription lifecycle.
//
// Mirrors the discipline of shared/paymentStateMachine.js: ONE transition table,
// used by both storage backends, so "which status may follow which" is decided in
// exactly one place and every change is checkable and auditable. It decides
// nothing about money or entitlement — storage owns those; this owns only the
// legality of a status change.
//
// Pure, dependency-free module so it is safe in both storage backends, in the
// client, and in unit tests without a database.

// A subscription row exists ONLY once money has actually been received. There is
// deliberately no PENDING subscription state: the `payments` row (PAYMENT_STATUS
// .PENDING) already owns "checkout started, not yet paid", and a second pending
// lifecycle would be duplicate state to reconcile — the exact drift this milestone
// is built to avoid. Fulfillment creates or updates the subscription in one
// transaction, so a subscription is born ACTIVE.
export const SUBSCRIPTION_STATUS = Object.freeze({
  // Paid and inside its period. The primary entitling status.
  ACTIVE: "ACTIVE",
  // A renewal charge failed; inside the grace window. Entitlement is RETAINED so
  // a payment hiccup never silently locks a customer's team out mid-sprint.
  PAST_DUE: "PAST_DUE",
  // Will not renew; still ACTIVE-equivalent until periodEnd.
  CANCEL_SCHEDULED: "CANCEL_SCHEDULED",
  // Period ended without renewal (or grace exhausted). Entitlement falls back to
  // the free floor. Terminal — resubscribing creates a NEW subscription row.
  EXPIRED: "EXPIRED",
});

/**
 * Legal successor statuses.
 *  - ACTIVE           → PAST_DUE (renewal failed), CANCEL_SCHEDULED (customer opted out),
 *                       EXPIRED (period ended with no renewal attempt)
 *  - PAST_DUE         → ACTIVE (dunning recovered), EXPIRED (grace exhausted),
 *                       CANCEL_SCHEDULED (customer opts out while past due)
 *  - CANCEL_SCHEDULED → ACTIVE (customer resumed before periodEnd), EXPIRED (period ended)
 *  - EXPIRED is terminal.
 * A no-op "transition" to the same status is not an edge; callers treat
 * "already in the target state" as an idempotent success separately.
 */
export const SUBSCRIPTION_TRANSITIONS = Object.freeze({
  [SUBSCRIPTION_STATUS.ACTIVE]: [
    SUBSCRIPTION_STATUS.PAST_DUE,
    SUBSCRIPTION_STATUS.CANCEL_SCHEDULED,
    SUBSCRIPTION_STATUS.EXPIRED,
  ],
  [SUBSCRIPTION_STATUS.PAST_DUE]: [
    SUBSCRIPTION_STATUS.ACTIVE,
    SUBSCRIPTION_STATUS.EXPIRED,
    SUBSCRIPTION_STATUS.CANCEL_SCHEDULED,
  ],
  [SUBSCRIPTION_STATUS.CANCEL_SCHEDULED]: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.EXPIRED],
  [SUBSCRIPTION_STATUS.EXPIRED]: [],
});

export const SUBSCRIPTION_TERMINAL_STATUSES = Object.freeze([SUBSCRIPTION_STATUS.EXPIRED]);

/**
 * Statuses that GRANT seat entitlement. PAST_DUE is deliberately included: a
 * failed renewal must degrade gracefully through a dunning window, not amputate a
 * customer's team the moment a card expires. Entitlement is withdrawn only at
 * EXPIRED, which is reached after the grace window is exhausted.
 */
export const SUBSCRIPTION_ENTITLING_STATUSES = Object.freeze([
  SUBSCRIPTION_STATUS.ACTIVE,
  SUBSCRIPTION_STATUS.PAST_DUE,
  SUBSCRIPTION_STATUS.CANCEL_SCHEDULED,
]);

/**
 * The SQL literal list backing the "one live subscription per workspace" partial
 * unique index. Exported so the schema/migration and the runtime agree by
 * construction rather than by two hand-maintained lists.
 */
export const SUBSCRIPTION_LIVE_STATUS_SQL = SUBSCRIPTION_ENTITLING_STATUSES
  .map(s => `'${s}'`)
  .join(",");

/** True if `status` admits no further transitions. */
export function isSubscriptionTerminal(status) {
  return SUBSCRIPTION_TERMINAL_STATUSES.includes(status);
}

/** True if `status` currently grants seats. */
export function isEntitling(status) {
  return SUBSCRIPTION_ENTITLING_STATUSES.includes(status);
}

/** True if a subscription may move from `from` to `to`. Same-status is NOT a transition. */
export function canSubscriptionTransition(from, to) {
  const allowed = SUBSCRIPTION_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/** Throw a descriptive error if the transition is illegal. Returns true otherwise. */
export function assertSubscriptionTransition(from, to) {
  if (!canSubscriptionTransition(from, to)) {
    throw new Error(`Illegal subscription transition: ${from} → ${to}`);
  }
  return true;
}

// ── Renewal mode (the ONE fact about how a period ends) ──────────────────────
//
// v1 is PREPAID. There is no stored mandate — no Razorpay Subscription, no UPI
// Autopay, no card token — so RepMail CANNOT debit a customer on its own. The
// renewal sweep never charges; it moves a lapsed period into a grace window and
// emails a link the owner must act on (see server/seatRenewal.js).
//
// This constant exists because the UI was describing the opposite. It offered
// "Turn off auto-renewal" and promised "Next charge ₹X on <date>" — a charge the
// system has no mechanism to make. A customer who read that and did nothing
// would lose seats at the end of a grace window they were never told about.
// Renewal mode is a property of the BILLING SYSTEM, not a copy decision, so it
// is stated once here, projected by the API, and rendered by the client.
//
// When a mandate integration lands, this becomes AUTOMATIC and every surface
// follows without a copy hunt.
export const RENEWAL_MODE = Object.freeze({ MANUAL: "MANUAL", AUTOMATIC: "AUTOMATIC" });

/** How a period actually ends today. See the note above before changing this. */
export const CURRENT_RENEWAL_MODE = RENEWAL_MODE.MANUAL;

/** True when the platform can charge a renewal without the customer acting. */
export function autoChargesRenewals() {
  return CURRENT_RENEWAL_MODE === RENEWAL_MODE.AUTOMATIC;
}

// ── Dunning policy (configuration, not code) ─────────────────────────────────
// A failed renewal retries on this schedule (days after the first failure). When
// the ladder is exhausted the subscription EXPIRES and entitlement falls back to
// the free floor — members are deactivated in join order, never deleted, and
// purchased credits are never touched.
export const DUNNING_RETRY_DAYS = Object.freeze([1, 3, 7]);
export const GRACE_PERIOD_DAYS = 14;

/** Days from the first failure until entitlement is withdrawn. */
export function graceEndsAt(firstFailureAt, graceDays = GRACE_PERIOD_DAYS) {
  const d = new Date(firstFailureAt);
  return new Date(d.getTime() + graceDays * 24 * 60 * 60 * 1000);
}

/** The next dunning attempt after `attempt` failures, or null when exhausted. */
export function nextDunningAttemptAt(firstFailureAt, attempt) {
  const offset = DUNNING_RETRY_DAYS[attempt];
  if (offset == null) return null;
  const d = new Date(firstFailureAt);
  return new Date(d.getTime() + offset * 24 * 60 * 60 * 1000);
}
