// M41-C — Workspace Credit Ownership convergence: regression-guard invariants.
//
// The approved architecture (see architecture/M41C_CREDIT_OWNERSHIP_ARCHITECTURE_REVIEW.md)
// makes the recurring monthly free allowance a WORKSPACE resource shared by every
// member, instead of a per-user faucet that headcount multiplied. These tests lock
// in the two behaviours that convergence changed in the money path:
//
//   1. A workspace has ONE shared free pool. Total free credits consumable across
//      the whole workspace in a month is capped at MONTHLY_CREDITS[plan],
//      independent of member count and of which member sends — closing the
//      "invite N members → mint N×500/mo" loophole.
//   2. A workspace OWNER (top-level account, parentId === null, modelled as role
//      USER) can allocate purchased credits to their direct children; a non-owner
//      member (role USER with a parentId) still cannot.
//
// Runs against the in-memory storage backend (DATABASE_URL unset), which is also
// what the rest of the suite exercises.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MONTHLY_CREDITS, USER_ROLES } from "../../shared/schema.js";

let storage;
let priorFreePlan;

const rand = () => Math.random().toString(36).slice(2);

async function makeOwner({ plan = "free", creditsReceived = 0 } = {}) {
  return storage.createUser({
    username: `m41c_owner_${rand()}`,
    email: `m41c_owner_${rand()}@example.com`,
    password: "pw-" + rand(),
    role: USER_ROLES.USER,      // self-service owner is role USER; ownership = tree position
    parentId: null,             // ← the workspace root
    plan,
    isTrialUser: false,
    creditsReceived,
    mustResetPassword: false,
  });
}

async function makeMember(owner, { role = USER_ROLES.USER, plan } = {}) {
  return storage.createUser({
    username: `m41c_member_${rand()}`,
    email: `m41c_member_${rand()}@example.com`,
    password: "pw-" + rand(),
    role,
    parentId: owner.id,
    // Provision on the workspace's effective plan, matching both join paths post-M41-C.
    plan: plan ?? owner.plan,
    isTrialUser: false,
    mustResetPassword: false,
  });
}

beforeAll(async () => {
  priorFreePlan = process.env.FREE_PLAN_ENABLED;
  process.env.FREE_PLAN_ENABLED = "true";
  ({ storage } = await import("../../server/storage.js"));
});

afterAll(() => {
  if (priorFreePlan === undefined) delete process.env.FREE_PLAN_ENABLED;
  else process.env.FREE_PLAN_ENABLED = priorFreePlan;
});

describe("M41-C — workspace-owned free credit pool", () => {
  it("a member's free balance IS the shared workspace pool, not an independent grant", async () => {
    const owner = await makeOwner({ plan: "free" });
    const memberA = await makeMember(owner);
    const memberB = await makeMember(owner);

    const grant = MONTHLY_CREDITS.free;

    // Every identity in the workspace sees the same starting free balance = the pool.
    expect((await storage.getTotalCreditsAvailable(owner.id)).free).toBe(grant);
    expect((await storage.getTotalCreditsAvailable(memberA.id)).free).toBe(grant);
    expect((await storage.getTotalCreditsAvailable(memberB.id)).free).toBe(grant);

    // A member sending debits the ONE shared pool — the owner and the other
    // member immediately see the reduced balance.
    await storage.deductCreditAtomic(memberA.id, `camp_${rand()}`, "shared-pool send");

    expect((await storage.getTotalCreditsAvailable(owner.id)).free).toBe(grant - 1);
    expect((await storage.getTotalCreditsAvailable(memberA.id)).free).toBe(grant - 1);
    expect((await storage.getTotalCreditsAvailable(memberB.id)).free).toBe(grant - 1);
  });

  it("total free credits consumable by a workspace is capped at the grant, regardless of member count (loophole closed)", async () => {
    const owner = await makeOwner({ plan: "free" });
    const memberA = await makeMember(owner);
    const memberB = await makeMember(owner);
    const grant = MONTHLY_CREDITS.free;

    // Drain via BOTH members alternately; if each minted its own pool this would
    // succeed 3×grant times. It must stop at exactly `grant` for the workspace.
    let succeeded = 0;
    for (let i = 0; i < grant * 3 + 5; i++) {
      const sender = i % 2 === 0 ? memberA.id : memberB.id;
      try {
        await storage.deductCreditAtomic(sender, `camp_${rand()}`, "drain");
        succeeded++;
      } catch (e) {
        expect(e.message).toMatch(/Insufficient credits/i);
        break;
      }
    }
    expect(succeeded).toBe(grant);

    // Pool is exhausted for every member, and the owner too.
    expect((await storage.getTotalCreditsAvailable(memberA.id)).free).toBe(0);
    expect((await storage.getTotalCreditsAvailable(memberB.id)).free).toBe(0);
    expect((await storage.getTotalCreditsAvailable(owner.id)).free).toBe(0);
  });

  it("members of a PAID workspace get zero free credits (inherited paid plan → no free faucet)", async () => {
    const owner = await makeOwner({ plan: "growth" });     // MONTHLY_CREDITS.growth === 0
    const member = await makeMember(owner);                 // inherits growth

    expect(await storage.getEffectivePlan(member.id)).toBe("growth");
    expect((await storage.getTotalCreditsAvailable(member.id)).free).toBe(0);
    expect((await storage.getTotalCreditsAvailable(member.id)).isFreePlan).toBe(false);
  });
});

describe("M41-C — workspace owner allocation authority", () => {
  it("a workspace owner (role USER, parentId null) can allocate purchased credits to a direct member", async () => {
    const owner = await makeOwner({ plan: "free", creditsReceived: 1000 });
    const member = await makeMember(owner);

    const result = await storage.allocateCredits(owner.id, member.id, 250, owner.id);
    expect(result).toMatchObject({ success: true, amount: 250 });

    const refreshed = await storage.getUserById(member.id);
    expect(refreshed.creditsReceived).toBe(250);
  });

  it("a non-owner member (role USER, parentId set) still cannot allocate credits", async () => {
    const owner = await makeOwner({ plan: "free", creditsReceived: 1000 });
    const memberA = await makeMember(owner);
    const memberB = await makeMember(owner);

    await expect(
      storage.allocateCredits(memberA.id, memberB.id, 10, memberA.id)
    ).rejects.toThrow(/USER cannot allocate credits/i);
  });
});
