// M43 Phase 2 — the Team Capacity block renders SERVER commercial state.
//
// This block appears on both the public pricing page and the authenticated
// Payments page. Before M43 it hardcoded a seat count per plan and asserted that
// every plan bundled seats at no extra cost — so enabling seat_billing_enabled
// would have made the highest-traffic pricing surface contradict the billing
// system on both products at once.
//
// SSR-rendered through Vite's module loader with the query cache seeded, the same
// harness as team-members-render.test.js.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";

let vite, TeamCapabilities, makeTree, QueryClient;

const PLANS = [
  { id: "starter", name: "Starter", credits: 3000, priceInr: 390 },
  { id: "growth", name: "Growth", credits: 15000, priceInr: 1800 },
  { id: "scale", name: "Scale", credits: 50000, priceInr: 5500 },
  { id: "enterprise", name: "Enterprise", isCustom: true },
];

const catalog = (billingEnabled, freeSeatFloor = 25) => ({
  billingEnabled, freeSeatFloor,
  bands: [{ min: 1, max: 2, rate: 129 }, { min: 3, max: 5, rate: 115 }, { min: 6, max: 9, rate: 99 }, { min: 10, max: 25, rate: 79 }],
  annualDiscount: 0.2, selfServeMaxSeats: 25, softCapSeats: 50,
  bestPriceGuarantee: true, pricingVersion: "2026-07-29.1",
  enterpriseContactPath: "/contact?reason=SALES&intent=enterprise",
});
const plansPayload = (seatBillingEnabled) => ({
  plans: PLANS.map(p => ({ ...p, maxTeamMembers: p.id === "enterprise" ? null : 25 })),
  seatBillingEnabled, freeTrialMaxTeamMembers: 25,
  creditTiers: [], pricingVersion: "2026-07-24.1", minCreditPurchase: 3000,
});

beforeAll(async () => {
  vite = await createServer({
    server: { middlewareMode: true }, appType: "custom", logLevel: "silent",
    ssr: { noExternal: ["@tanstack/react-query"] },
  });
  TeamCapabilities = (await vite.ssrLoadModule("/src/components/pricing/TeamCapabilities.jsx")).default;
  const rq = await vite.ssrLoadModule("@tanstack/react-query");
  QueryClient = rq.QueryClient;
  const { QueryClientProvider } = rq;
  makeTree = (qc, props) =>
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(TeamCapabilities, props));
}, 60000);
afterAll(async () => { await vite?.close(); });

function render({ billingEnabled, freeSeatFloor = 25, seed = true } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (seed) {
    qc.setQueryData(["/api/seats/catalog"], catalog(billingEnabled, freeSeatFloor));
    qc.setQueryData(["/api/pricing/plans"], plansPayload(billingEnabled));
  }
  return renderToString(makeTree(qc, {
    plans: PLANS,
    formatPlanPrice: (p) => `₹${p.priceInr}`,
    rolesNote: "Roles note",
  })).replace(/<!-- -->/g, "");
}

describe("seat billing OFF — the bundled story, from the server", () => {
  const html = () => render({ billingEnabled: false });

  it("advertises the allowance the SERVER reports", () => {
    expect(html()).toContain("Up to 25 team members");
  });

  it("keeps Enterprise unlimited", () => {
    expect(html()).toContain("Unlimited team members");
    expect(html()).not.toContain("Custom team size"); // superseded by server data
  });

  it("summarises the bundled model without hardcoding it", () => {
    const h = html();
    expect(h).toContain("seat-model-summary");
    expect(h).toMatch(/no additional cost/i);
  });

  it("still renders the role matrix and the price detail", () => {
    const h = html();
    expect(h).toContain("Purchase credits");
    expect(h).toContain("Roles note");
    expect(h).toContain("₹390");
  });
});

describe("seat billing ON — the surface stops claiming seats are bundled", () => {
  const html = () => render({ billingEnabled: true, freeSeatFloor: 1 });

  it("no longer advertises a bundled seat count for a paid plan", () => {
    const h = html();
    expect(h).toContain("Team seats sold separately");
    expect(h).not.toContain("Up to 25 team members");
  });

  it("never claims seats cost nothing extra", () => {
    expect(html()).not.toMatch(/no additional cost/i);
  });

  it("states that seats are billed separately, with a server-sourced rate", () => {
    const h = html();
    expect(h).toMatch(/billed separately/i);
    expect(h).toContain("₹79");      // lowest band, from /api/seats/catalog
    expect(h).toMatch(/first 1 seat is included/i);
  });

  it("still keeps Enterprise unlimited", () => {
    expect(html()).toContain("Unlimited team members");
  });
});

describe("unknown commercial state — say nothing rather than guess", () => {
  it("asserts neither story before the server answers", () => {
    const h = render({ seed: false });
    expect(h).not.toMatch(/no additional cost/i);
    expect(h).not.toMatch(/billed separately/i);
    expect(h).not.toContain("Up to 25 team members");
    expect(h).not.toContain("Team seats sold separately");
    // The block itself still renders — only the commercial claims are withheld.
    expect(h).toContain("Team Capacity by Plan");
    expect(h).toContain("Purchase credits");
  });
});

describe("no hardcoded commercial claim survives in the component", () => {
  it("contains no literal seat count or bundled-seat claim", async () => {
    const { readFile } = await import("fs/promises");
    const src = await readFile("client/src/components/pricing/TeamCapabilities.jsx", "utf8");
    expect(src).not.toMatch(/seats:\s*"\d+"/);
    expect(src).not.toMatch(/no additional cost/i);
    expect(src).not.toMatch(/Up to \$\{seats\}/);
    // It must read the commercial model rather than restate it.
    expect(src).toContain("useCommercialModel");
  });
});
