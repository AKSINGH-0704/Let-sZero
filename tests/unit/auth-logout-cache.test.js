// M39 post-deploy fix — Investigation 2: logout did not propagate across tabs.
//
// tests/unit/auth-sync.test.js already proves the *transport* (a logout in one tab
// is delivered to another tab's subscriber). What it never checked — and what the
// bug actually was — is the EFFECT the receiving tab applies to its query cache.
//
// The auth query runs with `staleTime: Infinity`, so `refetchOnWindowFocus` never
// re-validates it (the query is never stale). That means the ONLY thing that can
// flip a receiving tab to logged-out is applyLocalLogout's cache mutation. The old
// order (setQueryData(null) → clear()) wiped the authoritative null it had just
// planted, leaving the tab to reach logged-out only if clear() happened to trigger
// a server refetch — which a background tab often never did. The fix reverses the
// order: clear everything, THEN plant null, so the logged-out state is present and
// FRESH with no refetch required. These tests pin that behaviour.

import { describe, it, expect, beforeEach } from "vitest";
import { queryClient } from "@/lib/queryClient";
import { applyLocalLogout } from "@/context/AuthContext";

describe("Investigation 2 — applyLocalLogout leaves a deterministic logged-out cache", () => {
  beforeEach(() => queryClient.clear());

  it("plants an authoritative null for /api/auth/me (the receiving tab reads logged-out)", () => {
    queryClient.setQueryData(["/api/auth/me"], { id: "u1", username: "admin" });
    applyLocalLogout();
    expect(queryClient.getQueryData(["/api/auth/me"])).toBeNull();
  });

  it("keeps that null FRESH — a staleTime:Infinity observer needs no network refetch", () => {
    queryClient.setQueryData(["/api/auth/me"], { id: "u1" });
    applyLocalLogout();
    const state = queryClient.getQueryState(["/api/auth/me"]);
    expect(state?.data).toBeNull();
    // Not invalidated → React Query will not auto-refetch it; the tab stays logged out
    // deterministically instead of depending on a round-trip that may never fire.
    expect(state?.isInvalidated).toBe(false);
  });

  it("drops other cached user-scoped queries so no stale tenant data survives logout", () => {
    queryClient.setQueryData(["/api/campaigns"], [{ id: "c1" }]);
    queryClient.setQueryData(["/api/auth/me"], { id: "u1" });
    applyLocalLogout();
    expect(queryClient.getQueryData(["/api/campaigns"])).toBeUndefined();
  });
});
