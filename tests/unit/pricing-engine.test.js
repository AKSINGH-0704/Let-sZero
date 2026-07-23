// M39 Phase 1 — Pricing engine (single commercial authority).
//
// These tests pin the server-authoritative pricing contract: the quote produced by
// shared/pricing.js is the ONLY thing checkout/ledger may trust (decision D1). They
// also guard the invariant that removing the client's duplicated math must not change
// any number, by proving the engine reproduces the named-plan prices exactly, and that
// PRICING_PLANS is now DERIVED (no drift between the plan table and the formula).

import { describe, it, expect } from "vitest";
import {
  PRICING_PLANS,
  CREDIT_TIERS,
  calculateCreditPurchase,
  MIN_CREDIT_PURCHASE,
} from "../../shared/schema.js";
import {
  generateQuote,
  validateCustomCredits,
  qualifiesForEnterprise,
  planForCredits,
  isCurrencySupported,
  toMinorUnits,
  MAX_SELF_SERVE_CREDITS,
  BASE_CURRENCY,
  PRICING_VERSION,
} from "../../shared/pricing.js";

describe("PRICING_PLANS is derived from the formula (no duplication drift)", () => {
  it.each([
    ["starter", 3000, 390, 0],
    ["growth", 15000, 1800, 1250],
    ["scale", 50000, 5500, 4545],
  ])("%s reproduces the tier formula exactly", (id, credits, priceInr, bonus) => {
    const plan = PRICING_PLANS[id];
    const q = calculateCreditPurchase(credits);
    expect(plan.credits).toBe(credits);
    expect(plan.priceInr).toBe(priceInr);
    expect(plan.priceInr).toBe(q.priceINR);
    expect(plan.bonusCredits).toBe(bonus);
    expect(plan.bonusCredits).toBe(q.bonusCredits);
    expect(plan.totalCredits).toBe(credits + bonus);
  });

  it("keeps trial and enterprise as non-tier plans", () => {
    expect(PRICING_PLANS.trial.priceInr).toBe(0);
    expect(PRICING_PLANS.enterprise.isCustom).toBe(true);
    expect(PRICING_PLANS.enterprise.priceInr).toBeNull();
  });
});

describe("generateQuote — named plans", () => {
  it("quotes a paid plan from the server, in paise", () => {
    const q = generateQuote({ planId: "growth" });
    expect(q.error).toBeUndefined();
    expect(q.kind).toBe("plan");
    expect(q.amountMajor).toBe(1800);
    expect(q.amountMinor).toBe(180000); // paise — Razorpay charge basis
    expect(q.totalCredits).toBe(16250);
    expect(q.isEnterprise).toBe(false);
    expect(q.pricingVersion).toBe(PRICING_VERSION);
  });

  it("marks the trial as free", () => {
    const q = generateQuote({ planId: "trial" });
    expect(q.isFree).toBe(true);
    expect(q.amountMinor).toBe(0);
  });

  it("routes the enterprise plan to sales, not a price", () => {
    const q = generateQuote({ planId: "enterprise" });
    expect(q.isEnterprise).toBe(true);
    expect(q.amountMinor).toBeUndefined();
  });

  it("rejects an unknown plan", () => {
    expect(generateQuote({ planId: "nope" }).code).toBe("UNKNOWN_PLAN");
  });
});

describe("generateQuote — custom amounts (real custom purchasing, D1)", () => {
  it("prices an arbitrary in-band amount at the correct tier rate", () => {
    const q = generateQuote({ credits: 47000 }); // 30000–99999 band → 0.11/credit
    expect(q.kind).toBe("custom");
    expect(q.credits).toBe(47000);
    expect(q.amountMajor).toBe(Math.round(47000 * 0.11)); // 5170
    expect(q.amountMinor).toBe(Math.round(47000 * 0.11) * 100);
    expect(q.planId).toBe("growth"); // 47000 ≥ growth(15000), < scale(50000)
    expect(q.bonusCredits).toBe(Math.floor(47000 * (0.12 - 0.11) / 0.11));
  });

  it("charges a custom amount equal to a plan the same as the plan", () => {
    const custom = generateQuote({ credits: 15000 });
    const plan = generateQuote({ planId: "growth" });
    expect(custom.amountMinor).toBe(plan.amountMinor);
    expect(custom.totalCredits).toBe(plan.totalCredits);
  });

  it("rejects below-minimum amounts", () => {
    expect(generateQuote({ credits: 2999 }).code).toBe("BELOW_MIN");
  });

  it("rejects non-integer / non-finite amounts", () => {
    expect(generateQuote({ credits: 5000.5 }).code).toBe("INVALID_CREDITS");
    expect(generateQuote({ credits: "abc" }).code).toBe("INVALID_CREDITS");
  });

  it("routes amounts above the self-serve max to enterprise, not a price", () => {
    const q = generateQuote({ credits: MAX_SELF_SERVE_CREDITS + 1 });
    expect(q.isEnterprise).toBe(true);
    expect(q.amountMinor).toBeUndefined();
  });

  it("requires a planId or a credit amount", () => {
    expect(generateQuote({}).code).toBe("EMPTY_REQUEST");
  });
});

describe("currency abstraction (D2 — INR active, extensible)", () => {
  it("treats INR as the only active currency", () => {
    expect(isCurrencySupported("INR")).toBe(true);
    expect(isCurrencySupported("USD")).toBe(false);
    expect(BASE_CURRENCY).toBe("INR");
  });

  it("rejects a quote in an unsupported currency", () => {
    expect(generateQuote({ planId: "growth", currency: "USD" }).code).toBe("UNSUPPORTED_CURRENCY");
  });

  it("converts major → minor units", () => {
    expect(toMinorUnits(1800, "INR")).toBe(180000);
  });
});

describe("enterprise qualification (D3 — rule-based, not a credit ceiling)", () => {
  it("qualifies on business signals regardless of credit amount", () => {
    expect(qualifiesForEnterprise({ credits: 5000, requiresInvoicing: true })).toBe(true);
    expect(qualifiesForEnterprise({ credits: 5000, requiresContract: true })).toBe(true);
    expect(qualifiesForEnterprise({ credits: 5000, requiresSso: true })).toBe(true);
    expect(qualifiesForEnterprise({ seats: 40 })).toBe(true);
  });

  it("qualifies when credits exceed the self-serve band", () => {
    expect(qualifiesForEnterprise({ credits: MAX_SELF_SERVE_CREDITS + 1 })).toBe(true);
  });

  it("does NOT qualify a plain self-serve buyer", () => {
    expect(qualifiesForEnterprise({ credits: 20000, seats: 5 })).toBe(false);
  });
});

describe("custom-purchase plan mapping (MD-007)", () => {
  it("maps a custom amount to the plan whose quantity it meets", () => {
    expect(planForCredits(3000)).toBe("starter");
    expect(planForCredits(14999)).toBe("starter");
    expect(planForCredits(15000)).toBe("growth");
    expect(planForCredits(49999)).toBe("growth");
    expect(planForCredits(50000)).toBe("scale");
    expect(planForCredits(300000)).toBe("scale");
    expect(planForCredits(300001)).toBe("enterprise");
  });
});

describe("validateCustomCredits — boundaries", () => {
  it("accepts the exact minimum and maximum", () => {
    expect(validateCustomCredits(MIN_CREDIT_PURCHASE).ok).toBe(true);
    expect(validateCustomCredits(MAX_SELF_SERVE_CREDITS).ok).toBe(true);
  });
  it("min matches the tier floor and CREDIT_TIERS is contiguous", () => {
    expect(MIN_CREDIT_PURCHASE).toBe(CREDIT_TIERS[0].min);
    for (let i = 1; i < CREDIT_TIERS.length; i++) {
      expect(CREDIT_TIERS[i].min).toBe(CREDIT_TIERS[i - 1].max + 1);
    }
  });
});
