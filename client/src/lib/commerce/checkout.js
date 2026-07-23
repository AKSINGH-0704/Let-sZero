// M39 Phase 1B — reusable commerce layer.
//
// THE single canonical checkout entry. Every purchase — a named plan or a custom
// credit amount, initiated from any surface (LetsZero pricing, RepMail dashboard,
// upgrade dialogs, low-credit prompts) — flows through here. The client passes only
// the SELECTION; the server computes and validates the charge (M39 decision MD-003).
//
// Keeping one entry means there is exactly one place that talks to
// /api/payments/initiate, so retries, error handling, and future gateways are
// changed once rather than per surface.

import { apiRequest } from "@/lib/queryClient";

/**
 * Begin a purchase. Provide EITHER planId (named plan) OR credits (custom amount).
 * @returns {Promise<object>} initiate response: { payment, redirectUrl, gateway?, ... }.
 */
export async function initiatePurchase({ planId, credits, currency = "INR", paymentMethod = "UPI" } = {}) {
  const body = { currency, paymentMethod };
  if (credits != null && planId == null) {
    body.credits = credits;
  } else {
    body.planId = planId;
  }
  const res = await apiRequest("POST", "/api/payments/initiate", body);
  return res.json();
}
