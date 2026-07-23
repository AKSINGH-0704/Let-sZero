// M39 Phase 1B — reusable commerce layer.
//
// Client-side access to the SERVER-authoritative pricing quote. The quote returned
// here is the only value the UI may treat as a price; the client never computes a
// charge basis (M39 decision MD-003 / D1). Both LetsZero and RepMail purchase
// surfaces call this — there is no second copy of quote logic.

import { apiRequest } from "@/lib/queryClient";

/**
 * Fetch a canonical pricing quote for a named plan OR a custom credit amount.
 * @returns {Promise<object>} the server quote (amountMinor is the charge basis).
 * @throws if the request is invalid (e.g. below minimum) — callers that drive a
 *         clamped slider will not hit this; ad-hoc callers should catch.
 */
export async function fetchQuote({ planId, credits, currency = "INR" } = {}) {
  const res = await apiRequest("POST", "/api/pricing/quote", { planId, credits, currency });
  const data = await res.json();
  return data.quote;
}
