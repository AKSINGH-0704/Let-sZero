// M39 Phase 4 — enterprise provisioning.
//
// Turning a won enterprise deal into a live workspace REUSES the commerce spine —
// it does not add a parallel one. Provisioning is exactly: raise the customer's
// plan to enterprise (the same upgradePlanIfHigher that a paid upgrade uses, which
// cascades to the team and never downgrades) and grant the agreed credit volume
// (the same addCredits path, which writes the ledger + audit). The only thing new
// here is the deterministic, auditable stage transition (CONTRACT → PROVISIONED)
// recorded around that reuse.
//
// Enterprise billing is invoice-first and settled off-platform (bank transfer / PO),
// so there is no Razorpay order for provisioning — which is precisely why it goes
// through the operator, not the self-serve checkout. The credits are still recorded
// through the same ledgered addCredits path, so the balance stays fully auditable.

import { storage } from "./storage.js";
import { upgradePlanIfHigher } from "./fulfillPayment.js";
import { AUDIT_ACTIONS } from "../shared/schema.js";
import {
  ENTERPRISE_STAGES,
  assertEnterpriseStageTransition,
} from "../shared/enterprise.js";

/**
 * Provision an enterprise workspace for `userId`: record the CONTRACT → PROVISIONED
 * transition, raise the plan to enterprise (reused cascade), and grant the agreed
 * credits (reused ledgered path). Deterministic and idempotent-friendly: granting 0
 * credits is allowed (plan-only provisioning), and the plan upgrade never downgrades.
 *
 * @param {string} userId
 * @param {{ credits?: number, planName?: string, actor?: string, dealRef?: string, fromStage?: string }} opts
 * @returns {Promise<{ user: object, creditsGranted: number, plan: string }>}
 */
export async function provisionEnterprise(userId, opts = {}) {
  const {
    credits = 0,
    planName = "enterprise",
    actor = "system",
    dealRef = null,
    fromStage = ENTERPRISE_STAGES.CONTRACT,
  } = opts;

  const user = await storage.getUserById(userId);
  if (!user) throw new Error("User not found");
  if (!Number.isInteger(credits) || credits < 0) throw new Error("credits must be a non-negative integer");

  // Deterministic lifecycle: the move into PROVISIONED must be a legal edge.
  assertEnterpriseStageTransition(fromStage, ENTERPRISE_STAGES.PROVISIONED);

  await storage.createAuditLog({
    userId,
    action: AUDIT_ACTIONS.ENTERPRISE_STAGE_CHANGED,
    targetType: "user",
    targetId: userId,
    details: { fromStage, toStage: ENTERPRISE_STAGES.PROVISIONED, actor, dealRef, credits },
  });

  // Reuse the plan spine (cascades to the team; never downgrades).
  const upgraded = await upgradePlanIfHigher(userId, planName);

  // Reuse the credit spine (writes the ledger + audit) when a volume is agreed.
  if (credits > 0) {
    await storage.addCredits(userId, credits, AUDIT_ACTIONS.ENTERPRISE_PROVISIONED, { actor, dealRef, planName });
  }

  await storage.createAuditLog({
    userId,
    action: AUDIT_ACTIONS.ENTERPRISE_PROVISIONED,
    targetType: "user",
    targetId: userId,
    details: { planName, credits, actor, dealRef },
  });

  const fresh = await storage.getUserById(userId);
  return { user: fresh, creditsGranted: credits, plan: fresh.plan };
}
