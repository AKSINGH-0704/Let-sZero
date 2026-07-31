// M43-FIX — the post-purchase activation panel must not tell a customer that
// team seats are free when the billing system disagrees.
//
// M43 migrated this panel's seat COUNT to the entitlement authority and left the
// sentence directly beneath it reading "Included in your plan, at no extra cost."
// That sentence is shown seconds after a payment — the single worst place in the
// product to assert something about money that is about to stop being true. This
// file pins the panel under BOTH commercial states, which the static guard cannot
// do: the guard proves the file can see the flag, only a render proves it says
// the right thing on each side of it.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";

let vite, PostPurchaseActivation, makeTree, QueryClient;

function shimStorage() {
  const make = () => { const m = new Map(); return {
    getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k), clear: () => m.clear() }; };
  if (typeof globalThis.sessionStorage === "undefined") globalThis.sessionStorage = make();
  if (typeof globalThis.localStorage === "undefined") globalThis.localStorage = make();
}

// ROOT_ADMIN so the Teams introduction is eligible at all — the panel gates the
// whole block on a role that can actually manage a team.
const OWNER = {
  id: "u1", username: "owner", email: "o@acme.com", role: "ROOT_ADMIN", parentId: null,
  plan: "starter", effectivePlan: "starter", isPlatformOperator: false,
  mustResetPassword: false, senderName: "O", creditsRemaining: 3000,
};

const PAYMENT = { id: "p1", planId: "starter", planName: "Starter", credits: 3000 };

const seatSubscription = (billingEnabled, seats) => ({
  entitlement: { seats, unlimited: false, source: billingEnabled ? "SUBSCRIPTION" : "LEGACY_PLAN" },
  usage: { activeMembers: 0, pendingInvites: 0 },
  billingEnabled, isOwner: true, subscription: null, renewal: null, seatsAtRisk: 0,
});

beforeAll(async () => {
  shimStorage();
  vite = await createServer({
    server: { middlewareMode: true }, appType: "custom", logLevel: "silent",
    ssr: { noExternal: ["@tanstack/react-query", "wouter"] },
  });
  const mod = await vite.ssrLoadModule("/src/components/payments/PostPurchaseActivation.jsx");
  PostPurchaseActivation = mod.default;
  const rq = await vite.ssrLoadModule("@tanstack/react-query");
  QueryClient = rq.QueryClient;
  const { QueryClientProvider } = rq;
  const { ThemeProvider } = await vite.ssrLoadModule("/src/context/ThemeContext.jsx");
  const { AuthProvider } = await vite.ssrLoadModule("/src/context/AuthContext.jsx");
  const { Router } = await vite.ssrLoadModule("wouter");
  makeTree = (qc) =>
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(ThemeProvider, null,
        React.createElement(AuthProvider, null,
          React.createElement(Router, { ssrPath: "/app/payments" },
            React.createElement(PostPurchaseActivation, { payment: PAYMENT, onClose: () => {} })))));
}, 60000);
afterAll(async () => { await vite?.close(); });

function render({ billingEnabled, seats = 25, seed = true } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(["/api/auth/me"], OWNER);
  qc.setQueryData(["/api/credits/info"], { paid: 3000, free: 0, total: 3000 });
  // totalMembers 0 → this workspace has not built a team, which is the only
  // condition under which the Teams introduction (and its seat note) renders.
  qc.setQueryData(["/api/users/team-usage"], { totalMembers: 0 });
  if (seed) qc.setQueryData(["/api/seats/subscription"], seatSubscription(billingEnabled, seats));
  return renderToString(makeTree(qc)).replace(/<!-- -->/g, "");
}

// renderToString escapes apostrophes as &#x27;, so unescape before matching prose.
const note = (html) =>
  (/data-testid="activation-seat-note">([^<]*)</.exec(html)?.[1] ?? "").replace(/&#x27;/g, "'");

describe("seat billing OFF — the bundled story is stated, and it is true", () => {
  const html = () => render({ billingEnabled: false, seats: 25 });

  it("renders the Teams introduction with the seat count the SERVER reports", () => {
    // 25 is seeded here, not hardcoded in the component: the assertion is that
    // the panel echoes the entitlement authority, whatever it says.
    expect(html()).toContain("up to 25 teammates");
  });

  it("says the seats cost nothing, because today they do not", () => {
    expect(note(html())).toMatch(/at no extra cost/i);
  });
});

describe("seat billing ON — the same panel stops claiming seats are free", () => {
  const html = () => render({ billingEnabled: true, seats: 5 });

  it("no longer says seats are included at no extra cost", () => {
    const h = html();
    // Prove the block actually rendered before asserting on its absence — an
    // assertion about copy that isn't on the page passes for the wrong reason.
    expect(h).toContain('data-testid="activation-seat-note"');
    expect(note(h)).not.toMatch(/at no extra cost|no purchase required/i);
  });

  it("says seats are billed separately from credits", () => {
    expect(note(html())).toMatch(/billed separately from credits/i);
  });

  it("reports the subscribed seat count, not a plan allowance", () => {
    expect(html()).toContain("up to 5 teammates");
  });
});

describe("commercial state unknown — the panel says nothing about money", () => {
  // The M43 silence rule. A failed or slow /api/seats/subscription must not be
  // read as "seats are free": that is a claim, and an unanswered server has made
  // no claim. This is the state a customer hits on a flaky network right after
  // paying, so it has to be safe rather than optimistic.
  const html = () => render({ seed: false });

  it("omits the seat figure rather than inventing one", () => {
    const h = html();
    expect(h).toContain("your teammates");
    expect(h).not.toMatch(/up to (?:null|undefined|NaN|0) teammates/);
  });

  it("makes no claim about cost in either direction", () => {
    const n = note(html());
    expect(n).not.toMatch(/at no extra cost|billed separately/i);
    expect(n).toMatch(/invite them whenever you're ready/i);
  });
});
