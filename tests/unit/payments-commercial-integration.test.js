// M43 Phase 3 — the authenticated Payments page renders server commercial state.
//
// Three legacy contradictions lived here, all customer-visible:
//   1. the Teams tab told customers they could "invite up to 25 people — free,
//      on any plan, no purchase required"
//   2. its primary CTA was "View Credit Plans", so "I need more people" led to a
//      credit pack that grants no seats
//   3. the seat summary derived its ceiling from MAX_TEAM_MEMBERS, a second
//      authority that disagrees with enforcement once billing is on
//   4. every credit-pack card advertised "25 team members" as a bundled feature

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";

let vite, Payments, PlanCard, makeTree, QueryClient;

function shimStorage() {
  const make = () => { const m = new Map(); return {
    getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k), clear: () => m.clear() }; };
  if (typeof globalThis.sessionStorage === "undefined") globalThis.sessionStorage = make();
  if (typeof globalThis.localStorage === "undefined") globalThis.localStorage = make();
}

const OWNER = {
  id: "u1", username: "owner", email: "o@acme.com", role: "USER", parentId: null,
  plan: "starter", effectivePlan: "starter", isPlatformOperator: false,
  mustResetPassword: false, senderName: "O", creditsRemaining: 3000,
};
const catalog = (billingEnabled, freeSeatFloor = 25) => ({
  billingEnabled, freeSeatFloor,
  bands: [{ min: 1, max: 2, rate: 129 }, { min: 10, max: 25, rate: 79 }],
  annualDiscount: 0.2, selfServeMaxSeats: 25, softCapSeats: 50,
  bestPriceGuarantee: true, pricingVersion: "2026-07-29.1",
  enterpriseContactPath: "/contact?reason=SALES&intent=enterprise",
});
const plansPayload = (seatBillingEnabled) => ({
  plans: [
    { id: "starter", name: "Starter", credits: 3000, totalCredits: 3000, priceInr: 390, maxTeamMembers: 25 },
    { id: "growth", name: "Growth", credits: 15000, totalCredits: 16250, priceInr: 1800, maxTeamMembers: 25 },
    { id: "enterprise", name: "Enterprise", isCustom: true, maxTeamMembers: null },
  ],
  seatBillingEnabled, freeTrialMaxTeamMembers: 25,
  creditTiers: [], pricingVersion: "2026-07-24.1", minCreditPurchase: 3000, exchangeRate: 83.5,
});
const seatSubscription = (billingEnabled, seats) => ({
  entitlement: { seats, unlimited: false, source: billingEnabled ? "SUBSCRIPTION" : "LEGACY_PLAN" },
  usage: { activeMembers: 2, pendingInvites: 0 },
  billingEnabled, isOwner: true, subscription: null, renewal: null, seatsAtRisk: 0,
});

beforeAll(async () => {
  shimStorage();
  vite = await createServer({
    server: { middlewareMode: true }, appType: "custom", logLevel: "silent",
    ssr: { noExternal: ["@tanstack/react-query", "wouter"] },
  });
  const mod = await vite.ssrLoadModule("/src/pages/Payments.jsx");
  Payments = mod.default; PlanCard = mod.PlanCard;
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
            React.createElement(Router, { ssrPath: "/app/payments" },
              React.createElement(Payments))))));
}, 60000);
afterAll(async () => { await vite?.close(); });

function render({ billingEnabled, seats = 25, seed = true } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(["/api/auth/me"], OWNER);
  qc.setQueryData(["/api/users"], []);
  qc.setQueryData(["/api/payments"], []);
  qc.setQueryData(["/api/credits/info"], { paid: 3000, free: 0, total: 3000 });
  if (seed) {
    qc.setQueryData(["/api/seats/catalog"], catalog(billingEnabled));
    qc.setQueryData(["/api/pricing/plans"], plansPayload(billingEnabled));
    qc.setQueryData(["/api/seats/subscription"], seatSubscription(billingEnabled, seats));
  }
  return renderToString(makeTree(qc)).replace(/<!-- -->/g, "");
}

// NOTE ON SCOPE — read before adding a Teams-tab assertion here.
// The Teams tab is local component state with no URL binding, so SSR renders ONLY
// the Individual tab. An assertion about the Teams panel written here would pass
// VACUOUSLY: the markup is simply absent, so every `not.toContain` succeeds for
// the wrong reason. (That is exactly what happened on the first draft of this
// file.) The Teams panel's copy and CTA are instead pinned by the source-level
// guards at the bottom of this file, which assert against the JSX itself; a
// rendered check needs a real browser that can click the tab.
// What SSR CAN prove here is the Individual tab: the credit-pack cards' seat row.

describe("credit-pack cards — the seat row follows server state", () => {
  it("advertises the server's allowance while seats are bundled", () => {
    expect(render({ billingEnabled: false })).toContain("25 team members");
  });

  it("stops advertising bundled seats once seats are separately billed", () => {
    const h = render({ billingEnabled: true });
    expect(h).not.toContain("25 team members");
    expect(h).toContain("Team seats sold separately");
  });
});

describe("unknown commercial state — never guess", () => {
  it("asserts neither commercial story before the server answers", () => {
    const h = render({ seed: false });
    expect(h).not.toMatch(/no purchase required/i);
    expect(h).not.toMatch(/billed separately from credits/i);
    expect(h).not.toContain("25 team members");
    expect(h).not.toContain("Team seats sold separately");
  });
});

describe("PlanCard omits the seat row unless given one", () => {
  const card = (props) => renderToString(
    React.createElement(PlanCard, {
      plan: { id: "starter", name: "Starter", credits: 3000, totalCredits: 3000, priceInr: 390, priceUsd: 5, features: { campaigns: "5", templates: "10", scheduling: true, analytics: true, contactUpload: true, templateBuilder: true, aiPersonalization: true, spamAnalysis: true, auditExport: false, bonusCredits: false } },
      currency: "INR", ...props,
    })
  ).replace(/<!-- -->/g, "");

  it("renders no team-capacity row when seatFeature is absent", () => {
    expect(card({})).not.toMatch(/team members|sold separately/i);
  });

  it("renders exactly the row it is given", () => {
    expect(card({ seatFeature: "25 team members" })).toContain("25 team members");
    expect(card({ seatFeature: "Team seats sold separately" })).toContain("Team seats sold separately");
  });
});

describe("no hardcoded seat claim survives in the migrated sources", () => {
  it("planCatalog no longer carries a seat feature", async () => {
    const { readFile } = await import("fs/promises");
    const src = await readFile("client/src/lib/commerce/planCatalog.js", "utf8");
    expect(src).not.toMatch(/teamMembers:\s*"/);
  });

  it("Payments no longer derives a seat ceiling from the plan constant", async () => {
    const { readFile } = await import("fs/promises");
    const src = await readFile("client/src/pages/Payments.jsx", "utf8");
    expect(src).not.toMatch(/MAX_TEAM_MEMBERS\s*\[/);
    expect(src).not.toMatch(/import\s*\{[^}]*MAX_TEAM_MEMBERS/);
    expect(src).toContain("/api/seats/subscription");
  });

  // The Teams panel, pinned at source since SSR cannot reach it (see scope note).
  it("the Teams tab no longer promises free seats on any plan", async () => {
    const { readFile } = await import("fs/promises");
    const src = await readFile("client/src/pages/Payments.jsx", "utf8");
    expect(src).not.toMatch(/invite up to 25 people/i);
    expect(src).not.toMatch(/free, on any plan, no purchase required/i);
  });

  it("the Teams CTA and step 1 both branch on server commercial state", async () => {
    const { readFile } = await import("fs/promises");
    const src = await readFile("client/src/pages/Payments.jsx", "utf8");
    // One flag drives both the label and the destination.
    expect(src).toMatch(/seatBillingLive \? "Manage Team Seats" : "View Credit Plans"/);
    expect(src).toMatch(/seatBillingLive \? setLocation\("\/app\/team\/seats"\)/);
    expect(src).toMatch(/seatBillingLive \? "Add team seats" : "Invite team members"/);
    expect(src).toMatch(/billed separately from credits/);
  });

  it("PricingCard no longer restates a plan's seat count", async () => {
    const { readFile } = await import("fs/promises");
    const src = await readFile("client/src/components/pricing/PricingCard.jsx", "utf8");
    expect(src).not.toMatch(/features\.teamMembers/);
  });
});
