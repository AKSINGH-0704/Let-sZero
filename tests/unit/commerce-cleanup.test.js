// M39 Phase 1C — commerce UI cleanup: the shared plan catalog, the analytics
// event seam, and the centralized config. Pure-module tests (no DOM) matching the
// repo's node-environment vitest setup.

import { describe, it, expect, beforeEach } from "vitest";
import { calculateCreditPurchase } from "../../shared/schema.js";
import {
  PLAN_CATALOG,
  MARKETING_PLANS,
  getPlanById,
} from "../../client/src/lib/commerce/planCatalog.js";
import {
  onCommerceEvent,
  emitCommerceEvent,
  CommerceEvents,
  _resetCommerceEventHandlers,
} from "../../client/src/lib/commerce/events.js";
import * as config from "../../client/src/lib/commerce/config.js";

describe("planCatalog — one source, derived numbers", () => {
  it("marketing list is exactly the five customer-facing plans (no admin-only)", () => {
    expect(MARKETING_PLANS.map(p => p.id)).toEqual([
      "trial", "starter", "growth", "scale", "enterprise",
    ]);
    expect(MARKETING_PLANS.some(p => p.isAdminOnly)).toBe(false);
  });

  it("full catalog additionally carries the admin-only dev_test probe", () => {
    const dev = getPlanById("dev_test");
    expect(dev).toBeTruthy();
    expect(dev.isAdminOnly).toBe(true);
    expect(PLAN_CATALOG).toContain(dev);
    expect(MARKETING_PLANS).not.toContain(dev);
  });

  it("paid packs derive price/bonus/total from the shared pricing engine", () => {
    for (const id of ["starter", "growth", "scale"]) {
      const plan = getPlanById(id);
      const q = calculateCreditPurchase(plan.credits);
      expect(plan.priceINR).toBe(q.priceINR);
      expect(plan.bonusCredits).toBe(q.bonusCredits);
      expect(plan.totalCredits).toBe(q.totalCredits);
    }
  });

  it("preserves the exact numbers the pages previously hardcoded", () => {
    expect(getPlanById("starter")).toMatchObject({ priceINR: 390, bonusCredits: 0, totalCredits: 3000 });
    expect(getPlanById("growth")).toMatchObject({ priceINR: 1800, bonusCredits: 1250, totalCredits: 16250 });
    expect(getPlanById("scale")).toMatchObject({ priceINR: 5500, bonusCredits: 4545, totalCredits: 54545 });
  });

  it("marks growth as the popular plan and enterprise as custom", () => {
    expect(getPlanById("growth").isPopular).toBe(true);
    expect(getPlanById("enterprise").isCustom).toBe(true);
    expect(getPlanById("trial").isTrial).toBe(true);
  });

  it("getPlanById returns null for an unknown id", () => {
    expect(getPlanById("nope")).toBe(null);
  });
});

describe("commerce events — the analytics extension seam", () => {
  beforeEach(() => _resetCommerceEventHandlers());

  it("emit is a harmless no-op when nothing is subscribed", () => {
    expect(() => emitCommerceEvent(CommerceEvents.CHECKOUT_STARTED, { planId: "growth" })).not.toThrow();
  });

  it("delivers name + payload + timestamp to a subscriber", () => {
    const seen = [];
    onCommerceEvent(e => seen.push(e));
    emitCommerceEvent(CommerceEvents.QUOTE_REQUESTED, { credits: 5000 });
    expect(seen).toHaveLength(1);
    expect(seen[0].name).toBe(CommerceEvents.QUOTE_REQUESTED);
    expect(seen[0].payload).toEqual({ credits: 5000 });
    expect(typeof seen[0].ts).toBe("number");
  });

  it("unsubscribe stops further delivery", () => {
    let n = 0;
    const off = onCommerceEvent(() => { n++; });
    emitCommerceEvent(CommerceEvents.INTENT_SAVED);
    off();
    emitCommerceEvent(CommerceEvents.INTENT_SAVED);
    expect(n).toBe(1);
  });

  it("a throwing subscriber can never break the emit (checkout must not fail)", () => {
    const delivered = [];
    onCommerceEvent(() => { throw new Error("analytics blew up"); });
    onCommerceEvent(e => delivered.push(e.name));
    expect(() => emitCommerceEvent(CommerceEvents.CHECKOUT_STARTED)).not.toThrow();
    expect(delivered).toEqual([CommerceEvents.CHECKOUT_STARTED]);
  });
});

describe("commerce config — centralized constants", () => {
  it("credit bounds are coherent and presets stay within them", () => {
    expect(config.MIN_CREDITS).toBeLessThan(config.MAX_CREDITS);
    for (const preset of config.CREDIT_PRESETS) {
      expect(preset).toBeGreaterThanOrEqual(config.MIN_CREDITS);
      expect(preset).toBeLessThanOrEqual(config.MAX_CREDITS);
    }
    // presets are strictly ascending
    const sorted = [...config.CREDIT_PRESETS].sort((a, b) => a - b);
    expect(config.CREDIT_PRESETS).toEqual(sorted);
  });

  it("purchase-intent TTL is a positive duration and currency defaults are INR/UPI", () => {
    expect(config.PURCHASE_INTENT_TTL_MS).toBeGreaterThan(0);
    expect(config.PURCHASE_INTENT_KEY).toMatch(/purchaseIntent/);
    expect(config.DEFAULT_CURRENCY).toBe("INR");
    expect(config.DEFAULT_PAYMENT_METHOD).toBe("UPI");
  });
});
