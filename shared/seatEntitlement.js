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

import { MAX_TEAM_MEMBERS, USER_ROLES } from "./schema.js";
import { isEntitling } from "./subscriptionStateMachine.js";

/** Where an entitlement came from — surfaced in the UI and in audit details. */
export const SEAT_SOURCE = Object.freeze({
  LEGACY_PLAN: "LEGACY_PLAN",       // seat billing disabled — pre-M42 behaviour
  ENTERPRISE: "ENTERPRISE",         // contract; unlimited
  SUBSCRIPTION: "SUBSCRIPTION",     // paid seats
  GRANDFATHERED: "GRANDFATHERED",   // bespoke per-workspace grant on the subscription
  LEGACY_PROTECTED: "LEGACY_PROTECTED", // pre-activation workspace inside the migration window
  PLATFORM_ADMIN: "PLATFORM_ADMIN", // ROOT_ADMIN — platform operations, not a customer
  FREE_FLOOR: "FREE_FLOOR",         // no subscription
});

/** Platform settings keys owning the commercial rollout. Config, not code. */
export const SEAT_SETTING_KEYS = Object.freeze({
  BILLING_ENABLED: "seat_billing_enabled",
  FREE_FLOOR: "seat_free_floor",
  // M45 — the migration window. See legacyProtectionFloor() below for why
  // grandfathering could not live on the subscription row.
  ACTIVATED_AT: "seat_billing_activated_at",
  GRANDFATHER_UNTIL: "seat_grandfather_until",
});

/** Parse an ISO timestamp setting; anything unusable disables the mechanism. */
export function parseTimestampSetting(raw) {
  if (!raw) return null;
  const t = new Date(raw);
  return Number.isNaN(t.getTime()) ? null : t;
}

/**
 * M45 — the seat floor that protects a workspace which predates seat billing.
 *
 * WHY THIS IS NOT the `grandfatheredSeats` column. That column lives on
 * `workspace_subscriptions`, and that table's contract is that a row exists ONLY
 * once money has been received. Grandfathering has to protect workspaces that
 * have NEVER paid — so for exactly the population it was built for, there is no
 * row to write it to. Backfilling one would mean fabricating an ACTIVE
 * subscription for a workspace that bought nothing: it would violate the table's
 * invariant, collide with the one-live-subscription unique index the day they
 * really do subscribe, surface a phantom subscription in their UI, and hand the
 * renewal sweep a phantom to dun. The column stays for what it is genuinely good
 * at — a bespoke grant negotiated alongside a real subscription.
 *
 * The insight that removes the storage problem: a workspace's pre-billing
 * allowance is not new information. It is `MAX_TEAM_MEMBERS[effectivePlan]`, a
 * pure function of data we already hold. Nothing needs backfilling — the floor is
 * DERIVED, for any workspace that existed before activation, for as long as the
 * window lasts. No migration, no backfill script, no new table, and it is
 * automatically correct for every workspace including ones nobody remembered.
 *
 * Returns 0 when protection does not apply, so it composes as one more input to
 * the same `Math.max` every other grant already goes through.
 */
export function legacyProtectionFloor({
  effectivePlan = "free", workspaceCreatedAt = null,
  activatedAt = null, grandfatherUntil = null, now = new Date(),
} = {}) {
  // Any missing part of the window means the mechanism is off. Protecting by
  // default was tried and is wrong: it would hand the full plan allowance to
  // every workspace whose creation date is unknown, which silently neuters seat
  // billing — a paid 3-seat workspace would resolve to 25. The ordering hazard it
  // was trying to solve (floor lowered, flag flipped, window forgotten) is closed
  // where it belongs, in getSeatCommerceConfig: the activation timestamp is
  // stamped by the SYSTEM the first time billing is observed enabled, so it can
  // never be missing when it matters and no operator has to remember it.
  if (!activatedAt || !grandfatherUntil || !workspaceCreatedAt) return 0;
  if (new Date(now).getTime() >= new Date(grandfatherUntil).getTime()) return 0;
  // Only workspaces that predate activation are protected. A workspace created
  // afterwards bought into the current model and was never promised the old one.
  if (new Date(workspaceCreatedAt).getTime() >= new Date(activatedAt).getTime()) return 0;
  const n = MAX_TEAM_MEMBERS[effectivePlan];
  return Number.isFinite(n) ? n : 0;
}

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
  // M48 — the workspace ROOT's role. ROOT_ADMIN is exempt from the commercial
  // model; every other role follows it. Defaults to a customer role so an
  // omitted value can never accidentally grant an exemption.
  role = USER_ROLES.USER,
  billingEnabled = false,
  freeFloor = DEFAULT_FREE_FLOOR,
  // M45 migration window — all three must be present for legacy protection to
  // apply; absent, the mechanism is off and the free floor governs alone.
  workspaceCreatedAt = null,
  activatedAt = null,
  grandfatherUntil = null,
  now = new Date(),
} = {}) {
  // M48 — ROOT_ADMIN is the platform's OWN administrative role: operations,
  // support, engineering and testing. It is not a customer, so the commercial
  // model does not apply to it. Keyed on the workspace ROOT's role, because
  // entitlement is a property of the workspace, not of whoever is asking.
  //
  // Deliberately the role and nothing else — no user id, email or allow-list.
  // The plan-based exemption below does not cover this: a ROOT_ADMIN on the free
  // plan (support/recovery accounts) would otherwise fall to the customer floor.
  if (role === USER_ROLES.ROOT_ADMIN) {
    return { seats: Infinity, unlimited: true, source: SEAT_SOURCE.PLATFORM_ADMIN, subscriptionId: null };
  }

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
  // M45 — derived, not stored. See legacyProtectionFloor().
  const legacy = legacyProtectionFloor({
    effectivePlan, workspaceCreatedAt, activatedAt, grandfatherUntil, now,
  });

  // The entitlement is the MOST generous applicable grant. This is what makes the
  // migration safe: turning billing on — or later LOWERING the free floor — can
  // never reduce a workspace below what it held before seat billing existed.
  const seats = Math.max(paid, grandfathered, freeFloor, legacy);

  let source = SEAT_SOURCE.FREE_FLOOR;
  if (seats === paid && paid > 0) source = SEAT_SOURCE.SUBSCRIPTION;
  if (legacy > 0 && legacy >= paid && legacy > freeFloor && legacy >= grandfathered) source = SEAT_SOURCE.LEGACY_PROTECTED;
  if (grandfathered > 0 && grandfathered >= paid && grandfathered >= freeFloor && grandfathered >= legacy) source = SEAT_SOURCE.GRANDFATHERED;

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
