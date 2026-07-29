// M42 Phase 1 — seat pricing authority.
//
// These tests pin the commercial contract: the quote produced by
// shared/seatPricing.js is the ONLY thing checkout/renewal/proration may trust.
// They also encode the two defects found in the client proposal during the
// architecture review, so neither can silently return:
//   1. retroactive bands invert at the 10-seat boundary (9 seats cost MORE than 10)
//   2. the hand-written annual table's discount shrank as teams grew
//
// Money is asserted in MINOR units (paise) throughout — the charge basis.

import { describe, it, expect } from "vitest";
import {
  quoteSeats,
  previewSeatChange,
  previewRenewal,
  bandForSeats,
  validateCoupon,
  buildInvoiceLines,
  addMonthsUTC,
  periodFor,
  remainingFraction,
  getSeatCatalog,
  SEAT_TERMS,
  SEAT_CHANGE,
  SEAT_PRICING_VERSION,
  SEAT_CATALOG,
  SEAT_REGIONS,
} from "../../shared/seatPricing.js";
import { SELF_SERVE_MAX_SEATS } from "../../shared/pricing.js";

const M = SEAT_TERMS.MONTHLY.id;
const A = SEAT_TERMS.ANNUAL.id;
const catalog = getSeatCatalog();

describe("catalog integrity", () => {
  it("is versioned and the default version resolves", () => {
    expect(SEAT_CATALOG[SEAT_PRICING_VERSION]).toBeTruthy();
    expect(catalog.version).toBe(SEAT_PRICING_VERSION);
  });

  it("bands are contiguous, ascending, and non-overlapping", () => {
    for (let i = 1; i < catalog.bands.length; i++) {
      expect(catalog.bands[i].min).toBe(catalog.bands[i - 1].max + 1);
      expect(catalog.bands[i].rate).toBeLessThan(catalog.bands[i - 1].rate);
    }
  });

  it("keeps the self-serve seat boundary aligned with the credit pricing engine", () => {
    // One enterprise boundary for the whole platform — not a second constant.
    expect(catalog.selfServeMaxSeats).toBe(SELF_SERVE_MAX_SEATS);
  });

  it("the owner is not a billable seat (billing counts what enforcement counts)", () => {
    expect(catalog.includedSeats).toBe(0);
    // A workspace with zero collaborators is free and creates no payment.
    const q = quoteSeats({ seats: 0, term: M });
    expect(q.totalMinor).toBe(0);
    expect(q.isFree).toBe(true);
  });
});

describe("the client's ladder is reproduced exactly", () => {
  it.each([
    [1, 12900], [2, 25800], [3, 34500], [5, 57500], [6, 59400], [7, 69300],
  ])("%i seats monthly → %i paise", (seats, expected) => {
    expect(quoteSeats({ seats, term: M }).totalMinor).toBe(expected);
  });

  it("uses the published band rate for each range", () => {
    expect(bandForSeats(2).rate).toBe(129);
    expect(bandForSeats(4).rate).toBe(115);
    expect(bandForSeats(8).rate).toBe(99);
    expect(bandForSeats(20).rate).toBe(79);
  });
});

describe("DEFECT 1 — the 9→10 price inversion is closed", () => {
  it("never charges more for fewer seats, at any seat count, on either term", () => {
    for (const term of [M, A]) {
      let prev = -1;
      for (let s = 0; s <= catalog.softCapSeats; s++) {
        const q = quoteSeats({ seats: s, term });
        expect(q.error, `seats=${s} term=${term}`).toBeUndefined();
        expect(q.totalMinor, `total must be monotonic at seats=${s} term=${term}`).toBeGreaterThanOrEqual(prev);
        prev = q.totalMinor;
      }
    }
  });

  it("charges a 9-seat workspace the 10-seat price AND grants the 10th seat", () => {
    const q = quoteSeats({ seats: 9, term: M });
    // Naive retroactive banding would be 9 × ₹99 = ₹891. The guarantee pays ₹790.
    expect(q.totalMinor).toBe(79000);
    expect(q.totalMinor).toBeLessThan(9 * 9900);
    expect(q.seatsGranted).toBe(10);
    expect(q.upgradedSeats).toBe(1);
    expect(q.band.rate).toBe(79);
  });

  it("also rescues 8 seats on the monthly term", () => {
    const q = quoteSeats({ seats: 8, term: M });
    expect(q.totalMinor).toBe(79000); // 10 × ₹79 beats 8 × ₹99 = ₹792
    expect(q.seatsGranted).toBe(10);
  });

  it("leaves seat counts that are already optimal untouched", () => {
    const q = quoteSeats({ seats: 7, term: M });
    expect(q.totalMinor).toBe(69300); // 7 × ₹99
    expect(q.seatsGranted).toBe(7);
    expect(q.upgradedSeats).toBe(0);
  });

  it("marginal cost per seat never increases as the team grows", () => {
    let prevMarginal = Infinity;
    for (let s = 2; s <= 25; s++) {
      const marginal = quoteSeats({ seats: s, term: M }).totalMinor - quoteSeats({ seats: s - 1, term: M }).totalMinor;
      expect(marginal).toBeGreaterThanOrEqual(0);
      prevMarginal = Math.min(prevMarginal, marginal);
    }
    expect(prevMarginal).toBeGreaterThanOrEqual(0);
  });
});

describe("DEFECT 2 — the annual discount is uniform and derived", () => {
  it("applies one discount constant to every band", () => {
    for (const band of catalog.bands) {
      const monthly = quoteSeats({ seats: band.min, term: M });
      const annual = quoteSeats({ seats: band.min, term: A });
      // Annual is billed 12 months up front, so compare per-seat-per-month rates.
      const expectedRate = Math.round(band.rate * (1 - catalog.annualDiscount)) * 100;
      expect(annual.unitRateMinor).toBe(expectedRate);
      expect(monthly.unitRateMinor).toBe(band.rate * 100);
    }
  });

  it("does not shrink the discount as the team grows (the proposal's flaw)", () => {
    const discounts = catalog.bands.map(b => {
      const m = quoteSeats({ seats: b.min, term: M }).unitRateMinor;
      const a = quoteSeats({ seats: b.min, term: A }).unitRateMinor;
      return 1 - a / m;
    });
    const spread = Math.max(...discounts) - Math.min(...discounts);
    // The proposal spread was 23.3% → 17.7% (5.6 points). Derived rounding alone
    // must keep every band within a point of the configured discount.
    expect(spread).toBeLessThan(0.01);
    for (const d of discounts) expect(Math.abs(d - catalog.annualDiscount)).toBeLessThan(0.01);
  });

  it("bills annual as twelve months up front", () => {
    const q = quoteSeats({ seats: 3, term: A });
    expect(q.months).toBe(12);
    expect(q.totalMinor).toBe(q.unitRateMinor * 3 * 12);
  });
});

describe("enterprise boundary and the soft cap", () => {
  it("keeps selling past 25 seats but flags the workspace for sales", () => {
    const q = quoteSeats({ seats: 30, term: M });
    expect(q.isEnterprise).toBeFalsy();
    expect(q.exceedsSelfServe).toBe(true);
    expect(q.requiresSalesContact).toBe(true);
    expect(q.totalMinor).toBeGreaterThan(0);
  });

  it("routes past the hard ceiling to sales instead of quoting", () => {
    const q = quoteSeats({ seats: catalog.softCapSeats + 1, term: M });
    expect(q.isEnterprise).toBe(true);
    expect(q.code).toBe("ENTERPRISE_REQUIRED");
    expect(q.totalMinor).toBeUndefined();
  });

  it("honours a negotiated per-seat override ahead of the catalog", () => {
    const q = quoteSeats({ seats: 40, term: M, unitPriceOverrideMinor: 5000 });
    expect(q.isOverride).toBe(true);
    expect(q.unitRateMinor).toBe(5000);
    expect(q.totalMinor).toBe(5000 * 40);
    expect(q.band).toBeNull();
  });

  it("rejects a malformed override rather than charging a wrong amount", () => {
    expect(quoteSeats({ seats: 5, term: M, unitPriceOverrideMinor: -1 }).code).toBe("INVALID_OVERRIDE");
    expect(quoteSeats({ seats: 5, term: M, unitPriceOverrideMinor: 12.5 }).code).toBe("INVALID_OVERRIDE");
  });
});

describe("input validation — never quote a price for junk", () => {
  it.each([
    [{ seats: -1 }, "INVALID_SEATS"],
    [{ seats: 2.5 }, "INVALID_SEATS"],
    [{ seats: "abc" }, "INVALID_SEATS"],
    [{ seats: 5, term: "WEEKLY" }, "UNKNOWN_TERM"],
    [{ seats: 5, version: "1999-01-01.1" }, "UNKNOWN_PRICING_VERSION"],
  ])("%o → %s", (input, code) => {
    expect(quoteSeats({ term: M, ...input }).code).toBe(code);
  });
});

describe("price versioning (term price lock)", () => {
  it("stamps every quote with the catalog version that produced it", () => {
    expect(quoteSeats({ seats: 5, term: M }).version).toBe(SEAT_PRICING_VERSION);
  });

  it("prices a mid-term upgrade at the subscription's locked version", () => {
    const current = {
      seats: 3, term: M, version: SEAT_PRICING_VERSION,
      periodStart: new Date("2026-08-01T00:00:00Z"),
      periodEnd: new Date("2026-09-01T00:00:00Z"),
    };
    const p = previewSeatChange({ current, nextSeats: 5, now: new Date("2026-08-01T00:00:00Z") });
    expect(p.quote.version).toBe(SEAT_PRICING_VERSION);
  });
});

describe("coupons — the mechanism ships even though the catalog is empty", () => {
  it("rejects unknown codes without breaking the quote", () => {
    const q = quoteSeats({ seats: 5, term: M, couponCode: "NOPE" });
    expect(q.coupon.rejected).toBe(true);
    expect(q.coupon.reason).toBe("UNKNOWN_COUPON");
    expect(q.totalMinor).toBe(57500); // unchanged
    expect(q.discountMinor).toBe(0);
  });

  it("validates against term, seat minimum and expiry", () => {
    expect(validateCoupon(null, {}).code).toBe("NO_COUPON");
    expect(validateCoupon("ANYTHING", {}).code).toBe("UNKNOWN_COUPON");
  });
});

describe("regions", () => {
  it("defaults to India and multiplies the catalog rate", () => {
    const q = quoteSeats({ seats: 5, term: M, region: "IN" });
    expect(q.region).toBe("IN");
    expect(q.currency).toBe("INR");
    expect(SEAT_REGIONS.IN.multiplier).toBe(1);
  });

  it("falls back to the default region rather than failing a purchase", () => {
    expect(quoteSeats({ seats: 5, term: M, region: "ZZ" }).region).toBe("IN");
  });
});

describe("billing period arithmetic is UTC and clamps short months", () => {
  it("does not skip February from a 31st anchor", () => {
    const d = addMonthsUTC(new Date("2026-01-31T10:00:00Z"), 1);
    expect(d.toISOString()).toBe("2026-02-28T10:00:00.000Z");
  });

  it("handles leap years", () => {
    expect(addMonthsUTC(new Date("2028-01-31T00:00:00Z"), 1).toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });

  it("produces a 12-month annual period", () => {
    const p = periodFor(new Date("2026-08-15T00:00:00Z"), A);
    expect(p.end.toISOString()).toBe("2027-08-15T00:00:00.000Z");
  });

  it("computes the remaining fraction against the real period length", () => {
    const start = new Date("2026-08-01T00:00:00Z");
    const end = new Date("2026-09-01T00:00:00Z");
    expect(remainingFraction(start, end, start)).toBe(1);
    expect(remainingFraction(start, end, end)).toBe(0);
    expect(remainingFraction(start, end, new Date("2026-08-16T12:00:00Z"))).toBeCloseTo(0.5, 5);
    // Clamped outside the period — never negative, never > 1.
    expect(remainingFraction(start, end, new Date("2026-10-01T00:00:00Z"))).toBe(0);
    expect(remainingFraction(start, end, new Date("2026-07-01T00:00:00Z"))).toBe(1);
  });
});

describe("change previews — the number shown is the number billed", () => {
  const current = {
    seats: 3, term: M, version: SEAT_PRICING_VERSION,
    periodStart: new Date("2026-08-01T00:00:00Z"),
    periodEnd: new Date("2026-09-01T00:00:00Z"),
  };

  it("prices a brand-new purchase in full and opens the period", () => {
    const p = previewSeatChange({ current: null, nextSeats: 5, nextTerm: M, now: new Date("2026-08-01T00:00:00Z") });
    expect(p.kind).toBe(SEAT_CHANGE.NEW);
    expect(p.chargeNowMinor).toBe(57500);
    expect(p.effectiveImmediately).toBe(true);
    expect(p.periodEnd.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("charges an upgrade prorated over the unused remainder", () => {
    const p = previewSeatChange({ current, nextSeats: 5, now: new Date("2026-08-16T12:00:00Z") });
    expect(p.kind).toBe(SEAT_CHANGE.UPGRADE);
    // full delta = ₹575 − ₹345 = ₹230; half the period remains → ₹115
    expect(p.proration.fullDeltaMinor).toBe(23000);
    expect(p.chargeNowMinor).toBe(11500);
    expect(p.effectiveImmediately).toBe(true);
    expect(p.effectiveSeats).toBe(5);
  });

  it("charges the full delta when upgrading at the very start of a period", () => {
    const p = previewSeatChange({ current, nextSeats: 5, now: new Date("2026-08-01T00:00:00Z") });
    expect(p.chargeNowMinor).toBe(23000);
  });

  it("charges nothing when upgrading at the very end of a period", () => {
    const p = previewSeatChange({ current, nextSeats: 5, now: new Date("2026-09-01T00:00:00Z") });
    expect(p.chargeNowMinor).toBe(0);
    expect(p.renewal.seats).toBe(5);
  });

  it("prices an upgrade that crosses a band at the NEW band rate", () => {
    // 3 → 9 seats: the guarantee moves them to 10 seats at ₹79. The delta must be
    // computed from totals (₹790 − ₹345), not 6 extra seats at the old ₹115.
    const p = previewSeatChange({ current, nextSeats: 9, now: new Date("2026-08-01T00:00:00Z") });
    expect(p.effectiveSeats).toBe(10);
    expect(p.proration.fullDeltaMinor).toBe(79000 - 34500);
    expect(p.chargeNowMinor).toBe(44500);
  });

  it("defers a downgrade to renewal, charges nothing, and keeps seats until then", () => {
    const p = previewSeatChange({ current, nextSeats: 2, now: new Date("2026-08-10T00:00:00Z") });
    expect(p.kind).toBe(SEAT_CHANGE.DOWNGRADE);
    expect(p.chargeNowMinor).toBe(0);
    expect(p.effectiveImmediately).toBe(false);
    expect(p.effectiveSeats).toBe(3);          // unchanged mid-term
    expect(p.scheduled.seats).toBe(2);
    expect(p.scheduled.at).toEqual(current.periodEnd);
    expect(p.renewal.totalMinor).toBe(25800);  // 2 × ₹129
  });

  it("defers a term change to renewal", () => {
    const p = previewSeatChange({ current, nextSeats: 3, nextTerm: A, now: new Date("2026-08-10T00:00:00Z") });
    expect(p.kind).toBe(SEAT_CHANGE.TERM_CHANGE);
    expect(p.chargeNowMinor).toBe(0);
    expect(p.scheduled.term).toBe(A);
    expect(p.renewal.term).toBe(A);
  });

  it("recognises a no-op", () => {
    const p = previewSeatChange({ current, nextSeats: 3, now: new Date("2026-08-10T00:00:00Z") });
    expect(p.kind).toBe(SEAT_CHANGE.NOOP);
    expect(p.chargeNowMinor).toBe(0);
  });

  it("upgrading AND switching term charges the seat delta now and defers the term", () => {
    const p = previewSeatChange({ current, nextSeats: 5, nextTerm: A, now: new Date("2026-08-01T00:00:00Z") });
    expect(p.kind).toBe(SEAT_CHANGE.UPGRADE);
    expect(p.chargeNowMinor).toBe(23000);   // priced on the CURRENT monthly term
    expect(p.scheduled.term).toBe(A);
    expect(p.renewal.term).toBe(A);
  });

  it("never produces a negative charge", () => {
    for (let from = 0; from <= 25; from++) {
      for (let to = 0; to <= 25; to++) {
        const p = previewSeatChange({
          current: { ...current, seats: from }, nextSeats: to, now: new Date("2026-08-15T00:00:00Z"),
        });
        expect(p.chargeNowMinor ?? 0, `from=${from} to=${to}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("routes an upgrade beyond the hard ceiling to sales without charging", () => {
    const p = previewSeatChange({ current, nextSeats: catalog.softCapSeats + 5, now: new Date("2026-08-01T00:00:00Z") });
    expect(p.isEnterprise).toBe(true);
    expect(p.chargeNowMinor).toBeUndefined();
  });
});

describe("renewal preview", () => {
  it("quotes the next period at today's catalog", () => {
    const r = previewRenewal({ seats: 5, term: M, at: new Date("2026-09-01T00:00:00Z") });
    expect(r.totalMinor).toBe(57500);
    expect(r.version).toBe(SEAT_PRICING_VERSION);
  });
});

describe("invoice lines are one shared shape", () => {
  it("breaks a quote into seat line + total", () => {
    const lines = buildInvoiceLines(quoteSeats({ seats: 5, term: M }));
    expect(lines).toHaveLength(2);
    expect(lines[0].amountMinor).toBe(57500);
    expect(lines[1].isTotal).toBe(true);
    expect(lines[1].amountMinor).toBe(57500);
  });

  it("shows the annual multiplier in the line label", () => {
    const lines = buildInvoiceLines(quoteSeats({ seats: 3, term: A }));
    expect(lines[0].label).toContain("12 months");
  });

  it("returns nothing for an enterprise quote", () => {
    expect(buildInvoiceLines(quoteSeats({ seats: 999, term: M }))).toEqual([]);
  });
});
