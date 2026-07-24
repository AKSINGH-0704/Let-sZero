// M39 Phase 4 — enterprise provisioning reuses the commerce spine.
//
// Proves provisionEnterprise does NOT introduce a parallel credit/plan path: it
// raises the plan via the same upgradePlanIfHigher a paid upgrade uses and grants
// credits via the same addCredits path, and it enforces the deterministic lifecycle
// (only a legal stage edge may reach PROVISIONED). Runs against the in-memory
// backend, exercising the real storage the route calls.

import { describe, it, expect, beforeAll } from "vitest";
import { ENTERPRISE_STAGES } from "../../shared/enterprise.js";
import { USER_ROLES } from "../../shared/schema.js";

let storage, provisionEnterprise;
beforeAll(async () => {
  ({ storage } = await import("../../server/storage.js"));
  ({ provisionEnterprise } = await import("../../server/enterprise.js"));
});

let seq = 0;
async function makeUser(plan = "starter") {
  seq += 1;
  const u = await storage.createUser({
    username: `ent_u_${seq}_${Math.random().toString(36).slice(2)}`,
    email: `ent_u_${seq}_${Math.random().toString(36).slice(2)}@example.com`,
    password: "pw-" + Math.random().toString(36).slice(2),
    role: USER_ROLES.ROOT_ADMIN,
    plan,
    isTrialUser: false,
    mustResetPassword: false,
  });
  return storage.getUserById(u.id);
}
const balanceOf = async (id) => (await storage.getUserById(id)).creditsRemaining;

describe("provisionEnterprise — reuses the plan + credit spine", () => {
  it("raises the plan to enterprise and grants the agreed credits", async () => {
    const u = await makeUser("starter");
    const before = await balanceOf(u.id);

    const result = await provisionEnterprise(u.id, { credits: 100000, actor: "operator", dealRef: "DEAL-1" });

    expect(result.plan).toBe("enterprise");
    expect(result.creditsGranted).toBe(100000);
    const fresh = await storage.getUserById(u.id);
    expect(fresh.plan).toBe("enterprise");
    expect(await balanceOf(u.id)).toBe(before + 100000);
  });

  it("plan-only provisioning (0 credits) upgrades the plan without a balance change", async () => {
    const u = await makeUser("growth");
    const before = await balanceOf(u.id);
    const result = await provisionEnterprise(u.id, { credits: 0, actor: "operator" });
    expect(result.plan).toBe("enterprise");
    expect(await balanceOf(u.id)).toBe(before);
  });

  it("never downgrades — an already-enterprise user stays enterprise", async () => {
    const u = await makeUser("enterprise");
    const result = await provisionEnterprise(u.id, { credits: 5000, actor: "operator" });
    expect(result.plan).toBe("enterprise");
  });

  it("enforces the deterministic lifecycle — an illegal stage edge is rejected", async () => {
    const u = await makeUser("starter");
    // LEAD cannot jump straight to PROVISIONED.
    await expect(
      provisionEnterprise(u.id, { credits: 1000, fromStage: ENTERPRISE_STAGES.LEAD })
    ).rejects.toThrow(/Illegal enterprise stage transition/);
    // ...and nothing was applied.
    expect((await storage.getUserById(u.id)).plan).toBe("starter");
  });

  it("rejects a negative credit grant", async () => {
    const u = await makeUser("starter");
    await expect(provisionEnterprise(u.id, { credits: -5 })).rejects.toThrow(/non-negative/);
  });
});
