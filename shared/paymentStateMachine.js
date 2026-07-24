// M39 Phase 2 — the deterministic payment state machine.
//
// A payment moves strictly along the edges below. Before Phase 2 the transition
// rules were enforced ad-hoc and inconsistently: server/storage.js guarded
// SUCCESS with `WHERE status != 'SUCCESS'`, but server/memoryStorage.js's
// failPayment set FAILED unconditionally — so an in-memory completed payment could
// be silently downgraded (a real parity defect this module closes). This is now
// the ONE source of truth for "which status may follow which", used by both
// storage backends so the lifecycle is deterministic and every transition is
// checkable. It decides nothing about money — storage owns credit mutations; this
// owns only the legality of a status change.
//
// Pure, dependency-light module (imports only the status enum) so it is safe in
// both storage backends and unit-testable without a database.

import { PAYMENT_STATUS } from "./schema.js";

/**
 * Legal successor statuses for each status.
 *  - PENDING  → SUCCESS (paid), FAILED (gateway failure), CANCELLED (user/abandon)
 *  - SUCCESS  → REFUNDED (operator/provider refund or lost dispute)
 *  - FAILED / CANCELLED / REFUNDED are terminal.
 * A no-op "transition" to the same status is not an edge here; callers treat
 * "already in the target state" as an idempotent success separately.
 */
export const PAYMENT_TRANSITIONS = Object.freeze({
  [PAYMENT_STATUS.PENDING]: [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.FAILED, PAYMENT_STATUS.CANCELLED],
  [PAYMENT_STATUS.SUCCESS]: [PAYMENT_STATUS.REFUNDED],
  [PAYMENT_STATUS.FAILED]: [],
  [PAYMENT_STATUS.CANCELLED]: [],
  [PAYMENT_STATUS.REFUNDED]: [],
});

export const TERMINAL_STATUSES = Object.freeze([
  PAYMENT_STATUS.FAILED,
  PAYMENT_STATUS.CANCELLED,
  PAYMENT_STATUS.REFUNDED,
]);

/** True if `status` admits no further transitions. */
export function isTerminal(status) {
  return TERMINAL_STATUSES.includes(status);
}

/** True if a payment may move from `from` to `to`. Same-status is NOT a transition. */
export function canTransition(from, to) {
  const allowed = PAYMENT_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/** Throw a descriptive error if the transition is illegal. Returns true otherwise. */
export function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal payment transition: ${from} → ${to}`);
  }
  return true;
}
