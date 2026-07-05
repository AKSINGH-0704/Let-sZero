import { queryClient } from "@/lib/queryClient";

// Single declarative map from "what happened" to "what must be re-fetched."
//
// The app's cache model (queryClient.js: staleTime: Infinity, no polling by
// default) is deliberately correct for load — nothing refetches on its own,
// every mutation must say what it affected. The failure mode this file exists
// to close is not the model itself, it's that every mutation site used to
// hand-write its own invalidateQueries list, so "what does a credits-changing
// event affect" was duplicated at every call site with no shared contract —
// one real instance of this drifted (ProgressTracker's cancel handler
// invalidated /api/campaigns only, while its own sibling "campaign completed"
// effect invalidated four keys, including dashboard/stats and credits/info).
//
// Fix: declare each event's blast radius once, here. A mutation calls
// invalidateAfter("eventName") instead of hand-rolling the list. Adding a new
// surface that displays credits, or extending what a "campaign terminal state"
// event affects, is now a one-line change in this file, not an N-site audit.
const EVENT_QUERY_KEYS = {
  // Any action that changes a campaign's terminal state (completed naturally,
  // cancelled, failed) or its cached counters (checkpoint, reconciliation).
  campaignTerminalStateChanged: [
    ["/api/campaigns"],
    ["/api/dashboard/stats"],
    ["/api/auth/me"],
    ["/api/credits/info"],
  ],
  // Any action that changes a specific user's credit balance: payment,
  // admin allocate/reclaim, deactivation/reactivation reclaim, auto-reclaim.
  creditsChanged: [
    ["/api/auth/me"],
    ["/api/credits/info"],
    ["/api/users"], // admin's per-user credit columns
    ["/api/dashboard/stats"], // dashboard shows credits-derived figures too
  ],
  // Sender-domain lifecycle: registration, verification, suspend/unsuspend, delete.
  domainChanged: [
    ["/api/domains"],
    ["/api/sender-health"],
  ],
  // Domain verification specifically also touches sendingIdentityType on the
  // user — first registration flips it, so auth/me needs to follow too.
  domainIdentityChanged: [
    ["/api/domains"],
    ["/api/sender-health"],
    ["/api/auth/me"],
  ],
};

/**
 * Invalidate every query key a named domain event affects. Prefer this over a
 * hand-written invalidateQueries list at a mutation call site — see the
 * module comment for why.
 *
 * @param {keyof EVENT_QUERY_KEYS} eventName
 * @param {{ extraKeys?: Array<Array<unknown>> }} [options] extra one-off keys
 *   to invalidate alongside the event's declared set (e.g. a specific
 *   campaign's own detail key, ["/api/campaigns", campaignId]).
 */
export function invalidateAfter(eventName, options = {}) {
  const keys = EVENT_QUERY_KEYS[eventName];
  if (!keys) {
    throw new Error(`invalidateAfter: unknown event "${eventName}" — declare its query keys in queryInvalidation.js`);
  }
  for (const queryKey of keys) {
    queryClient.invalidateQueries({ queryKey });
  }
  for (const queryKey of options.extraKeys || []) {
    queryClient.invalidateQueries({ queryKey });
  }
}
