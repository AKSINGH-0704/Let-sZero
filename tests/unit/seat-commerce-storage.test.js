// M42 Phase 3 — the seat entitlement authority against a real storage backend.
//
// These are the invariants that keep entitlement, billing and enforcement from
// drifting apart. They run against the in-memory backend (the one the rest of the
// suite exercises), which mirrors storage.js method-for-method.
//
// The properties under test:
//   • the seat ceiling comes from ONE place, and claimWorkspaceSeat reads it
//     under the lock rather than from a value captured beforehand
//   • fulfillment is idempotent by TARGET STATE, so a replayed webhook cannot
//     grant a second helping of seats
//   • a downgrade never takes effect mid-term
//   • a lapse deactivates the newest members, never deletes, never touches credits
//   • ownership transfer moves the workspace, not just a flag

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { USER_ROLES, MAX_TEAM_MEMBERS } from "../../shared/schema.js";
import { SUBSCRIPTION_STATUS as S } from "../../shared/subscriptionStateMachine.js";
import { SEAT_SETTING_KEYS, SEAT_SOURCE } from "../../shared/seatEntitlement.js";
import { SEAT_TERMS, SEAT_PRICING_VERSION, quoteSeats } from "../../shared/seatPricing.js";

let storage;
const rand = () => Math.random().toString(36).slice(2);

async function makeOwner({ plan = "free" } = {}) {
  return storage.createUser({
    username: `m42_owner_${rand()}`, email: `m42_owner_${rand()}@example.com`,
    password: "pw-" + rand(), role: USER_ROLES.USER, parentId: null,
    plan, isTrialUser: false, mustResetPassword: false,
  });
}
async function makeMember(owner, { role = USER_ROLES.USER } = {}) {
  return storage.createUser({
    username: `m42_member_${rand()}`, email: `m42_member_${rand()}@example.com`,
    password: "pw-" + rand(), role, parentId: owner.id,
    plan: owner.plan, isTrialUser: false, mustResetPassword: false,
  });
}
/** Turn seat billing on for one test and restore it afterwards. */
async function withBilling(freeFloor, fn) {
  await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "true", null);
  await storage.setPlatformSetting(SEAT_SETTING_KEYS.FREE_FLOOR, String(freeFloor), null);
  try { return await fn(); }
  finally { await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "false", null); }
}
const purchase = (rootId, seats, term = SEAT_TERMS.MONTHLY.id, extra = {}) => {
  const q = quoteSeats({ seats, term });
  return storage.applySeatPurchase(rootId, {
    seats: q.seatsGranted, term, pricingVersion: q.version,
    renewalAmountMinor: q.totalMinor, ...extra,
  });
};

beforeAll(async () => {
  process.env.FREE_PLAN_ENABLED = "true";
  ({ storage } = await import("../../server/storage.js"));
});
afterAll(async () => {
  await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "false", null);
});

describe("rollout is dark by default", () => {
  it("an untouched workspace keeps the legacy flat allowance", async () => {
    const owner = await makeOwner();
    const e = await storage.resolveSeatEntitlement(owner.id);
    expect(e.seats).toBe(MAX_TEAM_MEMBERS.free);
    expect(e.source).toBe(SEAT_SOURCE.LEGACY_PLAN);
    expect(e.subscription).toBeNull();
  });
});

describe("fulfillment is idempotent by target state", () => {
  it("a replayed webhook does not grant a second helping of seats", async () => {
    const owner = await makeOwner();
    const first = await purchase(owner.id, 5);
    expect(first.created).toBe(true);
    expect(first.subscription.seats).toBe(5);

    const replay = await purchase(owner.id, 5);
    expect(replay.created).toBe(false);
    expect(replay.changed).toBe(false);          // no-op, not +5
    expect(replay.subscription.seats).toBe(5);
  });

  it("creates exactly one subscription per workspace even across purchases", async () => {
    const owner = await makeOwner();
    await purchase(owner.id, 3);
    await purchase(owner.id, 6);
    await purchase(owner.id, 10);
    const sub = await storage.getWorkspaceSubscription(owner.id);
    expect(sub.seats).toBe(10);
    const all = await storage.getSubscriptionsDue(new Date(Date.now() + 1e12), 100);
    expect(all.filter(s => s.workspaceRootId === owner.id)).toHaveLength(1);
  });

  it("an upgrade raises the entitlement and never lowers it", async () => {
    const owner = await makeOwner();
    await purchase(owner.id, 10);
    const down = await purchase(owner.id, 2);   // an out-of-order/stale fulfillment
    expect(down.subscription.seats).toBe(10);   // never regresses
  });

  it("stamps the pricing version so a charge stays reconcilable", async () => {
    const owner = await makeOwner();
    const { subscription } = await purchase(owner.id, 3);
    expect(subscription.pricingVersion).toBe(SEAT_PRICING_VERSION);
    expect(subscription.renewalAmountMinor).toBe(34500);
  });
});

describe("entitlement drives real seat enforcement", () => {
  it("claimWorkspaceSeat honours the subscription, not the legacy constant", async () => {
    const owner = await makeOwner();
    await purchase(owner.id, 2);
    await withBilling(0, async () => {
      const e = await storage.resolveSeatEntitlement(owner.id);
      expect(e.seats).toBe(2);
      expect(e.source).toBe(SEAT_SOURCE.SUBSCRIPTION);

      // Two claims fit, the third is refused — by the SUBSCRIPTION, not by 25.
      const limit = (tx) => storage.resolveSeatLimitInTx(tx, owner.id);
      const a = await storage.claimWorkspaceSeat(owner.id, limit, () => makeMember(owner));
      const b = await storage.claimWorkspaceSeat(owner.id, limit, () => makeMember(owner));
      const c = await storage.claimWorkspaceSeat(owner.id, limit, () => makeMember(owner));
      expect(a.allowed).toBe(true);
      expect(b.allowed).toBe(true);
      expect(c.allowed).toBe(false);
      expect(c.current).toBe(2);
    });
  });

  it("concurrent claims for the last seat cannot both win", async () => {
    const owner = await makeOwner();
    await purchase(owner.id, 3);
    await withBilling(0, async () => {
      const limit = (tx) => storage.resolveSeatLimitInTx(tx, owner.id);
      const results = await Promise.all(
        Array.from({ length: 8 }, () => storage.claimWorkspaceSeat(owner.id, limit, () => makeMember(owner)))
      );
      expect(results.filter(r => r.allowed)).toHaveLength(3);
      expect(await storage.getActiveWorkspaceMemberCount(owner.id)).toBe(3);
    });
  });

  it("the owner never consumes a seat — billing counts what enforcement counts", async () => {
    const owner = await makeOwner();
    await purchase(owner.id, 1);
    await withBilling(0, async () => {
      const limit = (tx) => storage.resolveSeatLimitInTx(tx, owner.id);
      const claim = await storage.claimWorkspaceSeat(owner.id, limit, () => makeMember(owner));
      expect(claim.allowed).toBe(true);          // 1 paid seat = 1 collaborator
      expect(await storage.getActiveWorkspaceMemberCount(owner.id)).toBe(1);
    });
  });

  it("a deactivated member frees its seat for someone else", async () => {
    const owner = await makeOwner();
    await purchase(owner.id, 1);
    await withBilling(0, async () => {
      const limit = (tx) => storage.resolveSeatLimitInTx(tx, owner.id);
      const first = await storage.claimWorkspaceSeat(owner.id, limit, () => makeMember(owner));
      expect((await storage.claimWorkspaceSeat(owner.id, limit, () => makeMember(owner))).allowed).toBe(false);
      await storage.updateUser(first.result.id, { isActive: false });
      expect((await storage.claimWorkspaceSeat(owner.id, limit, () => makeMember(owner))).allowed).toBe(true);
    });
  });

  it("enterprise stays unlimited under billing", async () => {
    const owner = await makeOwner({ plan: "enterprise" });
    await withBilling(0, async () => {
      const e = await storage.resolveSeatEntitlement(owner.id);
      expect(e.seats).toBe(Infinity);
      expect(e.unlimited).toBe(true);
    });
  });
});

describe("downgrades are deferred — the customer keeps what they paid for", () => {
  it("scheduling a downgrade does not change the live entitlement", async () => {
    const owner = await makeOwner();
    await purchase(owner.id, 10);
    await withBilling(0, async () => {
      await storage.scheduleSeatChange(owner.id, { seats: 2 });
      const e = await storage.resolveSeatEntitlement(owner.id);
      expect(e.seats).toBe(10);                       // unchanged mid-term
      expect(e.subscription.scheduledSeats).toBe(2);
    });
  });

  it("renewal is the one place a scheduled change takes effect", async () => {
    const owner = await makeOwner();
    const { subscription } = await purchase(owner.id, 10);
    await storage.scheduleSeatChange(owner.id, { seats: 2 });
    const r = await storage.renewSubscription(subscription.id);
    expect(r.ok).toBe(true);
    expect(r.appliedScheduledChange).toBe(true);
    expect(r.subscription.seats).toBe(2);
    expect(r.subscription.scheduledSeats).toBeNull();
    expect(r.subscription.renewalAmountMinor).toBe(25800); // 2 × ₹129
  });

  it("renewal rolls the period forward from the old period end", async () => {
    const owner = await makeOwner();
    const { subscription } = await purchase(owner.id, 3);
    const oldEnd = new Date(subscription.periodEnd);
    const r = await storage.renewSubscription(subscription.id);
    expect(new Date(r.subscription.periodStart).getTime()).toBe(oldEnd.getTime());
    expect(new Date(r.subscription.periodEnd).getTime()).toBeGreaterThan(oldEnd.getTime());
  });

  it("a term switch is applied at renewal, not mid-term", async () => {
    const owner = await makeOwner();
    const { subscription } = await purchase(owner.id, 3);
    await storage.scheduleSeatChange(owner.id, { term: SEAT_TERMS.ANNUAL.id });
    expect((await storage.getWorkspaceSubscription(owner.id)).term).toBe(SEAT_TERMS.MONTHLY.id);
    const r = await storage.renewSubscription(subscription.id);
    expect(r.subscription.term).toBe(SEAT_TERMS.ANNUAL.id);
  });
});

describe("lifecycle transitions are guarded", () => {
  it("refuses an illegal edge rather than corrupting state", async () => {
    const owner = await makeOwner();
    const { subscription } = await purchase(owner.id, 3);
    await storage.transitionSubscription(subscription.id, S.EXPIRED, { endedAt: new Date() });
    const bad = await storage.transitionSubscription(subscription.id, S.ACTIVE);
    expect(bad.ok).toBe(false);
    expect(bad.error).toBe("illegal_transition");
  });

  it("treats a repeat transition as an idempotent no-op", async () => {
    const owner = await makeOwner();
    const { subscription } = await purchase(owner.id, 3);
    await storage.transitionSubscription(subscription.id, S.PAST_DUE);
    const again = await storage.transitionSubscription(subscription.id, S.PAST_DUE);
    expect(again.ok).toBe(true);
    expect(again.noop).toBe(true);
  });

  it("PAST_DUE keeps the team working through the dunning window", async () => {
    const owner = await makeOwner();
    const { subscription } = await purchase(owner.id, 8);
    await storage.transitionSubscription(subscription.id, S.PAST_DUE);
    await withBilling(0, async () => {
      const e = await storage.resolveSeatEntitlement(owner.id);
      expect(e.seats).toBe(10);   // best-price guarantee granted 10 for 8 requested
    });
  });

  it("EXPIRED drops the workspace to the free floor", async () => {
    const owner = await makeOwner();
    const { subscription } = await purchase(owner.id, 10);
    await storage.transitionSubscription(subscription.id, S.EXPIRED, { endedAt: new Date() });
    await withBilling(1, async () => {
      const e = await storage.resolveSeatEntitlement(owner.id);
      expect(e.seats).toBe(1);
      expect(e.source).toBe(SEAT_SOURCE.FREE_FLOOR);
    });
  });

  it("an expired subscription is no longer renewable", async () => {
    const owner = await makeOwner();
    const { subscription } = await purchase(owner.id, 3);
    await storage.transitionSubscription(subscription.id, S.EXPIRED);
    const r = await storage.renewSubscription(subscription.id);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("not_renewable");
  });
});

describe("a lapse deactivates, never deletes, and never touches credits", () => {
  it("removes the newest members first so early teammates keep working", async () => {
    const owner = await makeOwner();
    await purchase(owner.id, 5);
    const members = [];
    for (let i = 0; i < 5; i++) {
      members.push(await makeMember(owner));
      await new Promise(r => setTimeout(r, 2)); // distinct createdAt ordering
    }
    const res = await storage.enforceSeatOverage(owner.id, 2);
    expect(res.deactivated).toHaveLength(3);
    // The three newest went, the two oldest stayed.
    expect(res.deactivated).toEqual(members.slice(2).map(m => m.id));
    for (const m of members.slice(0, 2)) {
      expect((await storage.getUserById(m.id)).isActive).toBe(true);
    }
  });

  it("deactivated members still exist and can be restored", async () => {
    const owner = await makeOwner();
    const m = await makeMember(owner);
    await storage.enforceSeatOverage(owner.id, 0);
    const after = await storage.getUserById(m.id);
    expect(after).toBeTruthy();
    expect(after.isActive).toBe(false);
  });

  it("does nothing when the workspace is within its entitlement", async () => {
    const owner = await makeOwner();
    await makeMember(owner);
    expect((await storage.enforceSeatOverage(owner.id, 5)).deactivated).toEqual([]);
  });

  it("never deactivates anyone in an enterprise workspace", async () => {
    const owner = await makeOwner({ plan: "enterprise" });
    await makeMember(owner);
    expect((await storage.enforceSeatOverage(owner.id, Infinity)).deactivated).toEqual([]);
  });

  it("purchased credits survive a lapse untouched", async () => {
    const owner = await makeOwner();
    await storage.addCredits(owner.id, 5000, "PAYMENT_SUCCESS", {});
    const before = await storage.getTotalCreditsAvailable(owner.id);
    await makeMember(owner);
    await storage.enforceSeatOverage(owner.id, 0);
    const after = await storage.getTotalCreditsAvailable(owner.id);
    expect(after.purchased).toBe(before.purchased);
  });
});

describe("workspace ownership transfer", () => {
  it("moves the root position and carries the subscription with it", async () => {
    const owner = await makeOwner({ plan: "growth" });
    const heir = await makeMember(owner);
    await purchase(owner.id, 6);

    const res = await storage.transferWorkspaceOwnership(owner.id, heir.id);
    expect(res.ok).toBe(true);

    const newOwner = await storage.getUserById(heir.id);
    const oldOwner = await storage.getUserById(owner.id);
    expect(newOwner.parentId).toBeNull();      // heir is now the root
    expect(oldOwner.parentId).toBe(heir.id);   // former owner is now a member
    expect(newOwner.plan).toBe("growth");      // plan follows the workspace

    // The subscription belongs to the WORKSPACE, not the person.
    expect(await storage.getWorkspaceSubscription(owner.id)).toBeNull();
    expect((await storage.getWorkspaceSubscription(heir.id)).seats).toBe(6);
    expect(await storage.resolveWorkspaceRootId(owner.id)).toBe(heir.id);
  });

  it("refuses to hand ownership outside the tenant", async () => {
    const owner = await makeOwner();
    const stranger = await makeOwner();
    const res = await storage.transferWorkspaceOwnership(owner.id, stranger.id);
    expect(res.ok).toBe(false);
    expect(res.error).toBe("not_a_member");
  });

  it("refuses when the caller is not the owner", async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    const other = await makeMember(owner);
    const res = await storage.transferWorkspaceOwnership(member.id, other.id);
    expect(res.ok).toBe(false);
    expect(res.error).toBe("not_owner");
  });

  it("refuses an inactive successor", async () => {
    const owner = await makeOwner();
    const member = await makeMember(owner);
    await storage.updateUser(member.id, { isActive: false });
    const res = await storage.transferWorkspaceOwnership(owner.id, member.id);
    expect(res.ok).toBe(false);
    expect(res.error).toBe("target_inactive");
  });

  it("keeps the tree exactly two levels deep", async () => {
    const owner = await makeOwner();
    const manager = await makeMember(owner, { role: USER_ROLES.SUB_ADMIN });
    const report = await makeMember(manager);
    await storage.transferWorkspaceOwnership(owner.id, manager.id);

    // The manager's former report is re-parented to the old owner's position, so
    // nothing ends up three levels below the root (getWorkspaceMemberIds is a
    // fixed two-level walk and would silently lose a deeper member).
    const members = await storage.getWorkspaceMemberIds(manager.id);
    expect(members.has(owner.id)).toBe(true);
    expect(members.has(report.id)).toBe(true);
    expect(await storage.resolveWorkspaceRootId(report.id)).toBe(manager.id);
  });
});

describe("renewal sweep selection", () => {
  it("returns only live subscriptions whose period has ended", async () => {
    const owner = await makeOwner();
    const { subscription } = await purchase(owner.id, 3);
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 400);
    const due = await storage.getSubscriptionsDue(future, 500);
    expect(due.some(s => s.id === subscription.id)).toBe(true);

    await storage.transitionSubscription(subscription.id, S.EXPIRED);
    const after = await storage.getSubscriptionsDue(future, 500);
    expect(after.some(s => s.id === subscription.id)).toBe(false);
  });

  it("does not return a subscription that is still inside its period", async () => {
    const owner = await makeOwner();
    const { subscription } = await purchase(owner.id, 3);
    const due = await storage.getSubscriptionsDue(new Date(), 500);
    expect(due.some(s => s.id === subscription.id)).toBe(false);
  });
});
