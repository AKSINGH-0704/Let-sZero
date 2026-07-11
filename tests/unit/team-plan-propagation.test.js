// Teams Correctness Milestone — verifies the three Category B fixes:
//   T-2: invite acceptance must resolve the inviter's plan via getEffectivePlan
//        (inheritance-aware), matching invite creation's existing check exactly.
//   T-3: memoryStorage.getEffectivePlan must walk the full ancestor chain,
//        mirroring storage.js's real-Postgres behavior (the "GAP-6 fix").
//   Dev-mode payment parity: the simulated-payment path must call
//        upgradePlanIfHigher, matching the real Razorpay-verify/webhook paths.
//
// Runs against the in-memory storage backend (DATABASE_URL unset — no real
// Postgres/AWS touched).

import { describe, it, expect } from "vitest";
import { storage } from "../../server/storage.js";
import { upgradePlanIfHigher } from "../../server/fulfillPayment.js";
import { MAX_TEAM_MEMBERS, USER_ROLES } from "../../shared/schema.js";

async function makeUser(overrides = {}) {
  return storage.createUser({
    username: `user_${Math.random().toString(36).slice(2)}`,
    email: `${Math.random().toString(36).slice(2)}@example.com`,
    password: "x".repeat(20),
    ...overrides,
  });
}

describe("T-3 — getEffectivePlan walks the full ancestor chain (dev/prod parity)", () => {
  it("resolves a grandchild's effective plan through an intermediate free-plan parent", async () => {
    const rootAdmin = await makeUser({ role: USER_ROLES.ROOT_ADMIN, plan: "growth" });
    // Sub-Admin's own plan is "free" — the default state for a freshly
    // invite-accepted Sub-Admin who hasn't yet had credits allocated to them.
    const subAdmin = await makeUser({ role: USER_ROLES.SUB_ADMIN, parentId: rootAdmin.id, plan: "free" });
    const user = await makeUser({ role: USER_ROLES.USER, parentId: subAdmin.id, plan: "free" });

    expect(await storage.getEffectivePlan(rootAdmin.id)).toBe("growth");
    // Before the fix, this returned "free" (parent's raw plan, not walked further).
    expect(await storage.getEffectivePlan(subAdmin.id)).toBe("growth");
    expect(await storage.getEffectivePlan(user.id)).toBe("growth");
  });

  it("stops at the first non-free plan encountered, does not overwrite with a further ancestor's plan", async () => {
    const rootAdmin = await makeUser({ role: USER_ROLES.ROOT_ADMIN, plan: "enterprise" });
    const subAdmin = await makeUser({ role: USER_ROLES.SUB_ADMIN, parentId: rootAdmin.id, plan: "starter" });
    const user = await makeUser({ role: USER_ROLES.USER, parentId: subAdmin.id, plan: "free" });

    // Sub-Admin bought their own starter plan — should NOT inherit the root's enterprise tier.
    expect(await storage.getEffectivePlan(subAdmin.id)).toBe("starter");
    expect(await storage.getEffectivePlan(user.id)).toBe("starter");
  });

  it("resolves to \"free\" when every ancestor is free, without an infinite loop", async () => {
    const rootAdmin = await makeUser({ role: USER_ROLES.ROOT_ADMIN, plan: "free" });
    const subAdmin = await makeUser({ role: USER_ROLES.SUB_ADMIN, parentId: rootAdmin.id, plan: "free" });
    expect(await storage.getEffectivePlan(subAdmin.id)).toBe("free");
  });
});

describe("T-2 — invite-accept plan resolution must match invite-creation's check exactly", () => {
  it("a Sub-Admin whose own raw plan is \"free\" can still have their invites accepted without limit, via the Root Admin's inherited enterprise plan", async () => {
    // free/starter/growth/scale all share the same 25-seat limit now, so a
    // free-plan Sub-Admin's raw and inherited limits would coincidentally
    // match at 25 — that would no longer demonstrate inheritance mattering.
    // Enterprise (Infinity) still differs from free (25), so it's the case
    // that actually proves getEffectivePlan's inheritance walk is load-bearing.
    const rootAdmin = await makeUser({ role: USER_ROLES.ROOT_ADMIN, plan: "enterprise" });
    const subAdmin = await makeUser({ role: USER_ROLES.SUB_ADMIN, parentId: rootAdmin.id, plan: "free" });

    // This is exactly the check routes.js's invite-accept handler now performs.
    const inviterEffectivePlan = await storage.getEffectivePlan(subAdmin.id);
    const limit = MAX_TEAM_MEMBERS[inviterEffectivePlan] ?? 0;
    const activeCount = await storage.getChildUserCount(subAdmin.id);

    expect(inviterEffectivePlan).toBe("enterprise");
    expect(limit).toBe(Infinity);
    expect(activeCount).toBe(0);
    expect(activeCount >= limit).toBe(false); // accept must be ALLOWED

    // Prove inheritance still matters: the OLD check (raw .plan, no
    // inheritance) would have used the Sub-Admin's own "free" plan (25) —
    // silently under-reporting the Root Admin's real unlimited entitlement.
    const rawPlanLimit = MAX_TEAM_MEMBERS[subAdmin.plan] ?? 0;
    expect(rawPlanLimit).toBe(25);
    expect(rawPlanLimit).not.toBe(limit);
  });

  it("still correctly blocks accept once the Root Admin's real seat limit (25, shared by every plan below Enterprise) is reached", { timeout: 15000 }, async () => {
    const rootAdmin = await makeUser({ role: USER_ROLES.ROOT_ADMIN, plan: "starter" }); // limit 25
    const subAdmin = await makeUser({ role: USER_ROLES.SUB_ADMIN, parentId: rootAdmin.id, plan: "free" });
    // Fill the Sub-Admin's own direct-child count to the inherited limit.
    for (let i = 0; i < 25; i++) {
      await makeUser({ role: USER_ROLES.USER, parentId: subAdmin.id, plan: "free" });
    }

    const inviterEffectivePlan = await storage.getEffectivePlan(subAdmin.id);
    const limit = MAX_TEAM_MEMBERS[inviterEffectivePlan] ?? 0;
    const activeCount = await storage.getChildUserCount(subAdmin.id);

    expect(activeCount).toBe(25);
    expect(activeCount >= limit).toBe(true); // correctly still blocked at the real limit
  });
});

describe("Dev-mode payment parity — simulated purchases must upgrade .plan, matching real Razorpay completion", () => {
  it("addCredits + upgradePlanIfHigher (the new dev-mode call sequence) updates the purchaser's plan and cascades to children", async () => {
    const rootAdmin = await makeUser({ role: USER_ROLES.ROOT_ADMIN, plan: "free" });
    const subAdmin = await makeUser({ role: USER_ROLES.SUB_ADMIN, parentId: rootAdmin.id, plan: "free" });
    const user = await makeUser({ role: USER_ROLES.USER, parentId: subAdmin.id, plan: "free" });

    // Mirrors exactly what the fixed dev-mode branch of POST /api/payments/initiate now does.
    await storage.addCredits(rootAdmin.id, 15000, "PAYMENT_SUCCESS", { planName: "Growth" });
    await upgradePlanIfHigher(rootAdmin.id, "Growth", null);

    const updatedRoot = await storage.getUserById(rootAdmin.id);
    const updatedSub  = await storage.getUserById(subAdmin.id);
    const updatedUser = await storage.getUserById(user.id);

    expect(updatedRoot.plan).toBe("growth");
    expect(updatedSub.plan).toBe("growth");  // cascaded to direct child
    expect(updatedUser.plan).toBe("growth"); // cascaded to grandchild
  });

  it("never downgrades — upgradePlanIfHigher is a no-op if the purchased plan ranks lower than the current one", async () => {
    const rootAdmin = await makeUser({ role: USER_ROLES.ROOT_ADMIN, plan: "scale" });
    await upgradePlanIfHigher(rootAdmin.id, "Starter", null);
    const updated = await storage.getUserById(rootAdmin.id);
    expect(updated.plan).toBe("scale"); // unchanged
  });
});
