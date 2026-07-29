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

export const SUBSCRIPTION_STATUS = Object.freeze({
  // Created, awaiting first successful payment. Grants NO entitlement.
  PENDING: "PENDING",
  // Paid and inside its period. The only status that grants seats.
  ACTIVE: "ACTIVE",
  // A renewal charge failed; inside the grace window. Entitlement is RETAINED so
  // a payment hiccup never silently locks a customer's team out mid-sprint.
  PAST_DUE: "PAST_DUE",
  // Will not renew; still ACTIVE-equivalent until periodEnd.
  CANCEL_SCHEDULED: "CANCEL_SCHEDULED",
  // Period ended without renewal (or grace exhausted). Entitlement falls back to
  // the free floor. Terminal — resubscribing creates a NEW subscription.
  EXPIRED: "EXPIRED",
  // Never activated (abandoned checkout, failed first payment). Terminal.
  CANCELLED: "CANCELLED",
});

/**
 * Legal successor statuses.
 *  - PENDING          → ACTIVE (first payment succeeded), CANCELLED (abandoned/failed)
 *  - ACTIVE           → PAST_DUE (renewal failed), CANCEL_SCHEDULED (customer opted out),
 *                       EXPIRED (period ended with no renewal attempt)
 *  - PAST_DUE         → ACTIVE (dunning recovered), EXPIRED (grace exhausted),
 *                       CANCEL_SCHEDULED (customer opts out while past due)
 *  - CANCEL_SCHEDULED → ACTIVE (customer resumed before periodEnd), EXPIRED (period ended)
 *  - EXPIRED / CANCELLED are terminal.
 * A no-op "transition" to the same status is not an edge; callers treat
 * "already in the target state" as an idempotent success separately.
 */
export const SUBSCRIPTION_TRANSITIONS = Object.freeze({
  [SUBSCRIPTION_STATUS.PENDING]: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.CANCELLED],
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
  [SUBSCRIPTION_STATUS.CANCELLED]: [],
});

export const SUBSCRIPTION_TERMINAL_STATUSES = Object.freeze([
  SUBSCRIPTION_STATUS.EXPIRED,
  SUBSCRIPTION_STATUS.CANCELLED,
]);

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
