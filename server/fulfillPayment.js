import { storage } from "./storage.js";

const PLAN_RANK = { free: 0, starter: 1, growth: 2, scale: 3, enterprise: 4 };
const PLAN_MAP = {
  "free trial": "free", "starter": "starter",
  "growth": "growth", "scale": "scale", "enterprise": "enterprise",
};

/**
 * Upgrade userId's plan to the plan associated with planName if it is higher
 * than the current plan. Cascades to direct children and grandchildren.
 * Returns the (possibly updated) user record.
 */
export async function upgradePlanIfHigher(userId, planName) {
  let user = await storage.getUserById(userId);
  const newPlan = PLAN_MAP[(planName || "").toLowerCase()] || "free";
  const currentPlan = user.plan || "free";

  if ((PLAN_RANK[newPlan] ?? 0) > (PLAN_RANK[currentPlan] ?? 0)) {
    // Zero free pool when leaving free plan — free credits don't carry over to paid.
    const clearFreePool = currentPlan === "free" ? { freeCreditsUsed: 0, freeCreditsResetAt: null } : {};
    await storage.updateUser(userId, { plan: newPlan, ...clearFreePool });
    const children = await storage.getChildUsers(userId);
    for (const child of children) {
      await storage.updateUser(child.id, { plan: newPlan });
      const grandchildren = await storage.getChildUsers(child.id);
      for (const gc of grandchildren) {
        await storage.updateUser(gc.id, { plan: newPlan });
      }
    }
    user = await storage.getUserById(userId);
  }

  return user;
}
