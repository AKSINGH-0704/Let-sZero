// M42 — the single seat ENTITLEMENT authority.
//
// Exactly one function answers "how many collaborator seats may this workspace
// have?", and every caller — the atomic seat claim, the invite pre-check, the
// team page, the pricing UI — resolves through it. Before M42 the answer was the
// constant MAX_TEAM_MEMBERS[plan]; that constant is now one INPUT to this
// function rather than a second answer competing with the subscription.
//
// Pure and dependency-light (constants + the lifecycle predicate) so it runs
// identically in dbStorage, memoryStorage, the client, and unit tests.

import { MAX_TEAM_MEMBERS } from "./schema.js";
import { isEntitling } from "./subscriptionStateMachine.js";

/** Where an entitlement came from — surfaced in the UI and in audit details. */
export const SEAT_SOURCE = Object.freeze({
  LEGACY_PLAN: "LEGACY_PLAN",       // seat billing disabled — pre-M42 behaviour
  ENTERPRISE: "ENTERPRISE",         // contract; unlimited
  SUBSCRIPTION: "SUBSCRIPTION",     // paid seats
  GRANDFATHERED: "GRANDFATHERED",   // migration floor beats the paid count
  FREE_FLOOR: "FREE_FLOOR",         // no subscription
});

/** Platform settings keys owning the commercial rollout. Config, not code. */
export const SEAT_SETTING_KEYS = Object.freeze({
  BILLING_ENABLED: "seat_billing_enabled",
  FREE_FLOOR: "seat_free_floor",
});

/** Default floor if the setting is missing/corrupt — the legacy allowance, so a
 *  configuration failure can never shrink a live customer's team. */
export const DEFAULT_FREE_FLOOR = MAX_TEAM_MEMBERS.free; // 25

/**
 * Parse the free-floor setting defensively. A corrupt value must fail SAFE (toward
 * the customer keeping their team), never toward silently locking members out.
 */
export function parseFreeFloor(raw) {
  if (raw == null || raw === "") return DEFAULT_FREE_FLOOR;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) return DEFAULT_FREE_FLOOR;
  return n;
}

/**
 * M43 — the seat allowance a PLAN advertises, for catalog/marketing projection.
 *
 * Deliberately lives here rather than at the call site: this module owns what
 * `MAX_TEAM_MEMBERS` means, and a convergence guard forbids other server modules
 * from reading that constant so nobody can re-derive a seat CEILING from it. This
 * is not a ceiling — it is the number a plan card may advertise, and only while
 * `seat_billing_enabled` is false. Returns `null` for unlimited, because JSON
 * cannot carry Infinity and a caller must handle "unlimited" explicitly rather
 * than misreading a 0.
 */
export function planSeatAllowance(planId) {
  const n = MAX_TEAM_MEMBERS[planId];
  if (n === Infinity) return null;
  return Number.isFinite(n) ? n : null;
}

/** Whether a stored grandfather grant is still in force. */
export function grandfatherActive(subscription, now = new Date()) {
  if (!subscription || !(subscription.grandfatheredSeats > 0)) return false;
  if (!subscription.grandfatheredUntil) return true; // no expiry = permanent grant
  return new Date(subscription.grandfatheredUntil).getTime() > new Date(now).getTime();
}

/**
 * THE entitlement decision.
 *
 * @param {object}  input
 * @param {object?} input.subscription   the workspace's live subscription row, or null
 * @param {string}  input.effectivePlan  workspace plan (getEffectivePlan)
 * @param {boolean} input.billingEnabled seat_billing_enabled
 * @param {number}  input.freeFloor      seat_free_floor
 * @param {Date}    [input.now]
 * @returns {{ seats: number, unlimited: boolean, source: string, subscriptionId: string|null }}
 */
export function resolveSeatEntitlement({
  subscription = null,
  effectivePlan = "free",
  billingEnabled = false,
  freeFloor = DEFAULT_FREE_FLOOR,
  now = new Date(),
} = {}) {
  // Enterprise is contractual and unlimited regardless of the commercial rollout.
  if (MAX_TEAM_MEMBERS[effectivePlan] === Infinity) {
    return { seats: Infinity, unlimited: true, source: SEAT_SOURCE.ENTERPRISE, subscriptionId: subscription?.id ?? null };
  }

  // Rollout gate. While disabled the platform behaves exactly as it did pre-M42,
  // which is what makes the flag a real rollback rather than a hopeful one.
  if (!billingEnabled) {
    const seats = MAX_TEAM_MEMBERS[effectivePlan] ?? MAX_TEAM_MEMBERS.free;
    return { seats, unlimited: seats === Infinity, source: SEAT_SOURCE.LEGACY_PLAN, subscriptionId: null };
  }

  const live = subscription && isEntitling(subscription.status) ? subscription : null;
  const grandfathered = grandfatherActive(live, now) ? live.grandfatheredSeats : 0;
  const paid = live ? (live.seats || 0) : 0;

  // The entitlement is the MOST generous applicable grant. This is what makes the
  // migration safe: turning billing on can never reduce a workspace below its
  // grandfathered count or below the free floor, whatever it has or hasn't paid.
  const seats = Math.max(paid, grandfathered, freeFloor);

  let source = SEAT_SOURCE.FREE_FLOOR;
  if (seats === paid && paid > 0) source = SEAT_SOURCE.SUBSCRIPTION;
  if (grandfathered > 0 && grandfathered >= paid && grandfathered >= freeFloor) source = SEAT_SOURCE.GRANDFATHERED;

  return { seats, unlimited: false, source, subscriptionId: live?.id ?? null };
}

/**
 * Seats a workspace would LOSE if its subscription lapsed right now — the number
 * the dunning emails and the past-due banner must quote. Never negative.
 */
export function seatsAtRisk({ subscription, effectivePlan, freeFloor, now = new Date() } = {}) {
  const current = resolveSeatEntitlement({ subscription, effectivePlan, billingEnabled: true, freeFloor, now });
  const lapsed = resolveSeatEntitlement({ subscription: null, effectivePlan, billingEnabled: true, freeFloor, now });
  if (current.unlimited) return 0;
  return Math.max(0, current.seats - lapsed.seats);
}
