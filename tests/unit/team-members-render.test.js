// M41 — the customer Team Members page, rendered.
//
// Proves the page reuses the existing workspace-scoped APIs and renders the
// first-class team experience: seat summary, member table, add CTA, pending
// invites — and the correct empty / non-admin states. SSR-rendered through Vite's
// module loader in App's provider stack (same harness as
// payments-estimator-render.test.js), with the query cache seeded so no backend
// is needed. Auth is seeded via the ["/api/auth/me"] query the AuthProvider reads.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";

let vite, TeamMembers, makeTree, QueryClient;

function shimStorage() {
  const make = () => { const m = new Map(); return {
    getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k), clear: () => m.clear() }; };
  if (typeof globalThis.sessionStorage === "undefined") globalThis.sessionStorage = make();
  if (typeof globalThis.localStorage === "undefined") globalThis.localStorage = make();
}

beforeAll(async () => {
  shimStorage();
  vite = await createServer({
    server: { middlewareMode: true }, appType: "custom", logLevel: "silent",
    ssr: { noExternal: ["@tanstack/react-query", "wouter"] },
  });
  TeamMembers = (await vite.ssrLoadModule("/src/pages/TeamMembers.jsx")).default;
  const rq = await vite.ssrLoadModule("@tanstack/react-query");
  QueryClient = rq.QueryClient;
  const { QueryClientProvider } = rq;
  const { ThemeProvider } = await vite.ssrLoadModule("/src/context/ThemeContext.jsx");
  const { AuthProvider } = await vite.ssrLoadModule("/src/context/AuthContext.jsx");
  const { TooltipProvider } = await vite.ssrLoadModule("/src/components/ui/tooltip.jsx");
  const { Router } = await vite.ssrLoadModule("wouter");

  makeTree = (qc) =>
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(ThemeProvider, null,
        React.createElement(AuthProvider, null,
          React.createElement(TooltipProvider, null,
            React.createElement(Router, { ssrPath: "/app/team" },
              React.createElement(TeamMembers))))));
}, 60000);

afterAll(async () => { await vite?.close(); });

function seededClient({ me, users, invites }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(["/api/auth/me"], me);
  if (users !== undefined) qc.setQueryData(["/api/users"], users);
  if (invites !== undefined) qc.setQueryData(["/api/invites"], invites);
  return qc;
}

const OWNER = { id: "root1", username: "owner", email: "owner@acme.com", role: "ROOT_ADMIN", effectivePlan: "growth", isPlatformOperator: false };

describe("M41 — Team Members page renders the reused team experience", () => {
  it("shows the header, seat summary and Add CTA for a workspace admin", () => {
    const html = renderToString(makeTree(seededClient({
      me: OWNER,
      users: [
        { id: "m1", username: "alice", email: "alice@acme.com", role: "SUB_ADMIN", isActive: true, isActiveThisWeek: true, creditsRemaining: 1200, lastActivityAt: new Date().toISOString() },
        { id: "m2", username: "bob", email: "bob@acme.com", role: "USER", isActive: true, isActiveThisWeek: false, creditsRemaining: 0, lastActivityAt: null },
      ],
      invites: [{ id: "i1", email: "carol@acme.com", role: "USER", createdAt: new Date().toISOString() }],
    })));
    expect(html).toContain("Team Members");
    expect(html).toContain("Add Team Member");
    expect(html).toContain("seats used");      // seat summary present
    expect(html).toContain("Growth");          // plan label from PLAN_LIMITS
    expect(html).toContain("alice");           // member row
    expect(html).toContain("Pending invites"); // reused /api/invites
    expect(html).toContain("carol@acme.com");
  });

  it("lists a deactivated member (seat freed) while still showing the seat summary", () => {
    // The active-only seat MATH is pinned by computeSeatState in seat-summary.test.js.
    // Here we prove the page lists a deactivated member (which frees its seat) and
    // still renders the seat summary. (SSR splits the inline "N / 25 seats used"
    // with comment nodes, so assert the stable pieces.)
    const html = renderToString(makeTree(seededClient({
      me: OWNER,
      users: [
        { id: "m1", username: "alice", email: "a@x.com", role: "USER", isActive: true },
        { id: "m2", username: "bob", email: "b@x.com", role: "USER", isActive: false }, // deactivated → frees seat
      ],
      invites: [],
    })));
    expect(html).toContain("seats used");
    expect(html).toContain("Deactivated"); // bob is listed with a deactivated badge
    expect(html).toContain("Restore bob"); // and offered restore, not remove
  });

  it("renders the empty state (no members) with an Add CTA", () => {
    const html = renderToString(makeTree(seededClient({ me: OWNER, users: [], invites: [] })));
    expect(html).toContain("No team members yet");
    expect(html).toContain("Add Team Member");
  });

  it("shows a read-only note to a plain member (no management UI)", () => {
    const html = renderToString(makeTree(seededClient({
      // A plain member always has a parentId (they belong under an owner/manager).
      me: { id: "u9", username: "member", role: "USER", parentId: "root1", effectivePlan: "growth" },
    })));
    expect(html).toContain("Team is managed by your workspace owner");
    expect(html).not.toContain("Add Team Member");
  });

  // M41-FIX — the self-service customer case: a top-level account (role USER,
  // parentId null) IS the workspace owner and must get the full management UI on
  // their own workspace, not the "managed by your workspace owner" read-only note.
  // This is the exact account shape in the production QA (role USER, STARTER plan).
  it("gives a top-level workspace owner (role USER, no parent) the full management UI", () => {
    const html = renderToString(makeTree(seededClient({
      me: { id: "owner9", username: "saikrishnar", email: "s@x.com", role: "USER", parentId: null, effectivePlan: "starter", isPlatformOperator: false },
      users: [
        { id: "m1", username: "alice", email: "alice@x.com", role: "USER", isActive: true, isActiveThisWeek: true, creditsRemaining: 100, lastActivityAt: new Date().toISOString() },
      ],
      invites: [{ id: "i1", email: "carol@x.com", role: "USER", createdAt: new Date().toISOString() }],
    })));
    expect(html).toContain("Team Members");
    expect(html).toContain("Add Team Member");
    expect(html).toContain("seats used");
    expect(html).toContain("alice");
    expect(html).toContain("Pending invites");
    expect(html).not.toContain("Team is managed by your workspace owner");
  });
});
