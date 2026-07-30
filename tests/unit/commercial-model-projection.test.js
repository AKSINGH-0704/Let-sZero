// M43 Phase 1 — the commercial state the UI renders comes from the server.
//
// Before M43, six customer-visible surfaces each restated their own answer to
// "are seats included or sold separately?" as hardcoded strings. Enabling
// seat_billing_enabled would have made all six lie. These tests pin the two
// server projections that replace those strings, and the formatters that consume
// them — including the property that matters most: while the answer is unknown,
// a surface says NOTHING rather than guessing.

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer } from "http";
import { MAX_TEAM_MEMBERS } from "../../shared/schema.js";
import { planSeatAllowance, SEAT_SETTING_KEYS } from "../../shared/seatEntitlement.js";
import {
  seatCapacityLabel, seatCapacityValue, seatModelSummary, shouldRouteToSeatPurchase,
} from "../../client/src/lib/commerce/commercialModel.js";

vi.mock("../../server/email.js", () => ({
  sendCampaignEmail: vi.fn(async () => ({ messageId: "m" })),
  sendTransactionalEmail: vi.fn(async () => {}),
  sendPaymentReceiptEmail: vi.fn(async () => {}),
  verifySesConnection: vi.fn(async () => {}),
}));

let httpServer, baseUrl, storage;

beforeAll(async () => {
  process.env.FREE_PLAN_ENABLED = "true";
  ({ storage } = await import("../../server/storage.js"));
  const { registerRoutes } = await import("../../server/routes.js");
  const app = express();
  app.use(express.json());
  httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  await new Promise(r => httpServer.listen(0, "127.0.0.1", r));
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
});
afterAll(async () => {
  await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "false", null);
  httpServer?.close();
});

const get = async (p) => {
  const r = await fetch(`${baseUrl}${p}`);
  return { status: r.status, json: await r.json() };
};
const setFlag = (on) => storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, on ? "true" : "false", null);

describe("planSeatAllowance — the entitlement authority owns the constant", () => {
  it("returns the plan allowance, and null for unlimited", () => {
    expect(planSeatAllowance("starter")).toBe(MAX_TEAM_MEMBERS.starter);
    expect(planSeatAllowance("growth")).toBe(MAX_TEAM_MEMBERS.growth);
    expect(planSeatAllowance("enterprise")).toBeNull(); // Infinity → null, not 0
  });

  it("returns null rather than 0 for an unknown plan", () => {
    // A 0 would render as "0 team members"; null forces explicit handling.
    expect(planSeatAllowance("nonexistent")).toBeNull();
  });
});

describe("GET /api/seats/catalog projects commercial state", () => {
  it("reports seat billing OFF and the free floor", async () => {
    await setFlag(false);
    const { status, json } = await get("/api/seats/catalog");
    expect(status).toBe(200);
    expect(json.billingEnabled).toBe(false);
    expect(typeof json.freeSeatFloor).toBe("number");
  });

  it("reports seat billing ON once enabled", async () => {
    await setFlag(true);
    expect((await get("/api/seats/catalog")).json.billingEnabled).toBe(true);
    await setFlag(false);
  });

  it("still serves the bands and boundaries the UI renders", async () => {
    const { json } = await get("/api/seats/catalog");
    expect(json.bands.length).toBeGreaterThan(0);
    expect(json.selfServeMaxSeats).toBeGreaterThan(0);
    expect(json.softCapSeats).toBeGreaterThanOrEqual(json.selfServeMaxSeats);
    expect(json.enterpriseContactPath).toContain("/contact?");
  });
});

describe("GET /api/pricing/plans projects per-plan seat allowance", () => {
  it("carries maxTeamMembers on every plan so no client restates it", async () => {
    const { json } = await get("/api/pricing/plans");
    expect(json.plans.length).toBeGreaterThan(0);
    for (const p of json.plans) {
      expect(p, `plan ${p.id} missing maxTeamMembers`).toHaveProperty("maxTeamMembers");
      expect(p.maxTeamMembers === null || Number.isInteger(p.maxTeamMembers)).toBe(true);
    }
    const starter = json.plans.find(p => p.id === "starter");
    expect(starter.maxTeamMembers).toBe(MAX_TEAM_MEMBERS.starter);
    const ent = json.plans.find(p => p.id === "enterprise");
    expect(ent.maxTeamMembers).toBeNull();               // unlimited
  });

  it("exposes the seat-billing state and the trial allowance", async () => {
    await setFlag(false);
    const off = (await get("/api/pricing/plans")).json;
    expect(off.seatBillingEnabled).toBe(false);
    expect(off.freeTrialMaxTeamMembers).toBe(MAX_TEAM_MEMBERS.trial);
    await setFlag(true);
    expect((await get("/api/pricing/plans")).json.seatBillingEnabled).toBe(true);
    await setFlag(false);
  });

  it("does not regress the credit-pricing payload", async () => {
    const { json } = await get("/api/pricing/plans");
    expect(json.creditTiers.length).toBeGreaterThan(0);
    expect(json.pricingVersion).toBeTruthy();
    expect(json.minCreditPurchase).toBeGreaterThan(0);
  });
});

describe("formatters — presentation only, and silent until the server answers", () => {
  it("says NOTHING while the commercial state is unknown", () => {
    // The property that prevents a paying customer being told seats are free
    // during the first paint.
    expect(seatCapacityLabel(25, undefined)).toBeNull();
    expect(seatCapacityValue(25, undefined)).toBeNull();
    expect(seatModelSummary({ seatBillingEnabled: undefined })).toBeNull();
  });

  it("advertises a bundled allowance only while billing is OFF", () => {
    expect(seatCapacityLabel(25, false)).toBe("25 team members");
    expect(seatCapacityValue(25, false)).toBe("25");
  });

  it("stops advertising a bundled allowance once billing is ON", () => {
    expect(seatCapacityLabel(25, true)).toBe("Team seats sold separately");
    expect(seatCapacityValue(25, true)).toBe("Sold separately");
    expect(seatCapacityLabel(25, true)).not.toMatch(/\b25\b/);
  });

  it("keeps unlimited as unlimited under both states", () => {
    expect(seatCapacityLabel(null, false)).toBe("Unlimited team members");
    expect(seatCapacityLabel(null, true)).toBe("Unlimited team members");
    expect(seatCapacityValue(null, true)).toBe("Unlimited");
  });

  it("summarises the bundled model from server values, never a literal", () => {
    const s = seatModelSummary({ seatBillingEnabled: false, planSeatAllowance: { starter: 25, growth: 25 } });
    expect(s).toContain("25");
    expect(s).toMatch(/no additional cost/i);
  });

  it("summarises the priced model with the lowest band rate and the free floor", () => {
    const s = seatModelSummary({
      seatBillingEnabled: true, freeSeatFloor: 1,
      bands: [{ min: 1, max: 2, rate: 129 }, { min: 10, max: 25, rate: 79 }],
    });
    expect(s).toMatch(/first 1 seat is included/i);
    expect(s).toContain("₹79");            // the lowest band, from the server
    expect(s).toMatch(/billed separately/i);
  });

  it("omits the included-seats clause when the floor is zero", () => {
    const s = seatModelSummary({ seatBillingEnabled: true, freeSeatFloor: 0, bands: [{ rate: 79 }] });
    expect(s).not.toMatch(/included/i);
    expect(s).toMatch(/billed separately/i);
  });

  it("routes to seat purchase only when billing is genuinely on", () => {
    expect(shouldRouteToSeatPurchase(true)).toBe(true);
    expect(shouldRouteToSeatPurchase(false)).toBe(false);
    expect(shouldRouteToSeatPurchase(undefined)).toBe(false); // never guess
  });
});
