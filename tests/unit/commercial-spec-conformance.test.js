// M46 — conformance to the CLIENT'S COMMERCIAL SPECIFICATION.
//
// This file exists because four audits and 950 tests did not catch three wrong
// annual prices. Everything was internally consistent: the rates were derived by
// one authority, rendered from that authority, and charged from it. They were
// simply not the rates the client sells at.
//
// So this file deliberately does NOT derive anything from the catalog. Every
// expected number is transcribed from the specification. A test that computes its
// expectation the same way the code does can only prove the code agrees with
// itself — which is exactly what happened.
//
// SPECIFICATION
//   Seats 1–2  : ₹129/month  or ₹99/month  billed annually
//   Seats 3–5  : ₹115/month  or ₹89/month  billed annually
//   Seats 6–9  : ₹99/month   or ₹79/month  billed annually
//   Seats 10–25: ₹79/month   or ₹65/month  billed annually
//   Above 25   : Contact Sales — no self-serve purchase

import { describe, it, expect } from "vitest";
import { quoteSeats, buildInvoiceLines, SEAT_TERMS } from "../../shared/seatPricing.js";

const M = SEAT_TERMS.MONTHLY.id;
const A = SEAT_TERMS.ANNUAL.id;
const rupees = (q) => q.totalMinor / 100;
const perSeat = (q) => q.unitRateMinor / 100;

describe("the published ladder, seat by seat", () => {
  // Every seat count from 1 to 25, priced from the specification by hand.
  const SPEC_RATE = (s) => (s <= 2 ? 129 : s <= 5 ? 115 : s <= 9 ? 99 : 79);
  const SPEC_ANNUAL_RATE = (s) => (s <= 2 ? 99 : s <= 5 ? 89 : s <= 9 ? 79 : 65);

  it.each([1, 2, 3, 5, 6, 9, 10, 25])("%i seats bills at the specified monthly rate", (s) => {
    const q = quoteSeats({ seats: s, term: M });
    // The best-price guarantee may grant MORE seats for less money; when it does,
    // the rate charged is the better band's rate. Both are correct per spec.
    expect(perSeat(q)).toBe(SPEC_RATE(q.seatsGranted));
    expect(rupees(q)).toBe(q.seatsGranted * SPEC_RATE(q.seatsGranted));
  });

  it.each([1, 2, 3, 5, 6, 9, 10, 25])("%i seats bills at the specified annual rate × 12", (s) => {
    const q = quoteSeats({ seats: s, term: A });
    expect(perSeat(q)).toBe(SPEC_ANNUAL_RATE(q.seatsGranted));
    expect(rupees(q)).toBe(q.seatsGranted * SPEC_ANNUAL_RATE(q.seatsGranted) * 12);
    expect(q.months).toBe(12);
  });
});

describe("tier boundaries", () => {
  // The four transitions named in the launch audit. Each is checked as a PAIR so
  // a regression on either side is caught, and for both terms.
  const boundary = (lo, hi, term) => ({
    lo: quoteSeats({ seats: lo, term }), hi: quoteSeats({ seats: hi, term }),
  });

  it("2→3 crosses from ₹129 to ₹115 (monthly) and ₹99 to ₹89 (annual)", () => {
    expect(perSeat(boundary(2, 3, M).lo)).toBe(129);
    expect(perSeat(boundary(2, 3, M).hi)).toBe(115);
    expect(perSeat(boundary(2, 3, A).lo)).toBe(99);
    expect(perSeat(boundary(2, 3, A).hi)).toBe(89);
  });

  it("5→6 crosses from ₹115 to ₹99 (monthly) and ₹89 to ₹79 (annual)", () => {
    expect(perSeat(boundary(5, 6, M).lo)).toBe(115);
    expect(perSeat(boundary(5, 6, M).hi)).toBe(99);
    expect(perSeat(boundary(5, 6, A).lo)).toBe(89);
    expect(perSeat(boundary(5, 6, A).hi)).toBe(79);
  });

  it("9→10 does not cost the customer money — the guarantee absorbs the inversion", () => {
    // Retroactive bands invert here in BOTH tables: 9 × ₹99 = ₹891 vs 10 × ₹79 =
    // ₹790 monthly, and 9 × ₹79 = ₹711 vs 10 × ₹65 = ₹650 annually. The customer
    // asking for 9 must never pay more than one asking for 10.
    for (const term of [M, A]) {
      const { lo, hi } = boundary(9, 10, term);
      expect(rupees(lo)).toBeLessThanOrEqual(rupees(hi));
      // ...and is given the seats that produced the better price.
      expect(lo.seatsGranted).toBe(10);
    }
  });

  it("25→26 is the Contact Sales wall", () => {
    for (const term of [M, A]) {
      expect(quoteSeats({ seats: 25, term }).isEnterprise).toBeFalsy();
      const over = quoteSeats({ seats: 26, term });
      expect(over.isEnterprise).toBe(true);
      expect(over.code).toBe("ENTERPRISE_REQUIRED");
      expect(over.totalMinor).toBeUndefined();
      expect(buildInvoiceLines(over)).toEqual([]);
    }
  });
});

describe("the price never inverts anywhere on the ladder", () => {
  it.each([M, A])("%s totals are non-decreasing from 1 to 25 seats", (term) => {
    let prev = 0;
    for (let s = 1; s <= 25; s++) {
      const total = rupees(quoteSeats({ seats: s, term }));
      expect(total, `${s} seats costs less than ${s - 1}`).toBeGreaterThanOrEqual(prev);
      prev = total;
    }
  });
});

describe("what the customer is shown is what the customer is charged", () => {
  it.each([1, 4, 8, 12, 25])("the invoice components for %i seats sum to the stated total", (seats) => {
    for (const term of [M, A]) {
      const q = quoteSeats({ seats, term });
      const lines = buildInvoiceLines(q);
      // The last line IS the total; the components are everything before it. A
      // customer who adds up the breakdown must land on the figure they are asked
      // to pay, and that figure must be the quote's own total.
      const total = lines.find(l => l.isTotal);
      const components = lines.filter(l => !l.isTotal).reduce((t, l) => t + l.amountMinor, 0);
      expect(total.amountMinor).toBe(q.totalMinor);
      expect(components).toBe(q.totalMinor);
    }
  });

  it("the annual saving quoted equals twelve monthly charges minus the annual one", () => {
    for (const seats of [1, 3, 7, 15, 25]) {
      const m = quoteSeats({ seats, term: M });
      const a = quoteSeats({ seats, term: A });
      const saving = m.totalMinor * 12 - a.totalMinor;
      expect(saving).toBeGreaterThan(0);
      // The displayed percentage is this same comparison, rounded. Pinning the
      // relationship stops a surface inventing a friendlier number.
      const pct = Math.round((1 - a.totalMinor / (m.totalMinor * 12)) * 100);
      expect(pct).toBeGreaterThanOrEqual(17);
      expect(pct).toBeLessThanOrEqual(24);
    }
  });

  it("a free (zero-seat) selection never creates a charge", () => {
    const q = quoteSeats({ seats: 0, term: M });
    expect(q.totalMinor).toBe(0);
    expect(q.isFree).toBe(true);
    // A total of ₹0 is shown — no seat line, nothing to pay.
    const lines = buildInvoiceLines(q);
    expect(lines.filter(l => l.key === "seats")).toEqual([]);
    expect(lines.find(l => l.isTotal).amountMinor).toBe(0);
  });
});
