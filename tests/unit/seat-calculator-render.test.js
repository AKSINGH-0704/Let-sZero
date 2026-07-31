// M42 Phase 5 — the seat pricing UI renders the ENGINE's numbers.
//
// The commercial risk in a pricing UI is that it quietly computes its own price.
// SeatCalculator imports the same pure module the server charges through, so
// these tests assert the rendered figures against quoteSeats directly — if the
// component ever grew its own maths, they fail.
//
// Renders with React's server renderer (this codebase has no DOM harness; see the
// standing disclosed limitation), which is sufficient for output + a11y attributes.

import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SeatCalculator from "../../client/src/components/pricing/SeatCalculator.jsx";
import { quoteSeats, SEAT_TERMS, getSeatCatalog, formatMinor } from "../../shared/seatPricing.js";

const catalog = getSeatCatalog();
const render = (props = {}) => renderToStaticMarkup(React.createElement(SeatCalculator, props));

describe("renders the engine's price, not its own", () => {
  it.each([1, 3, 5, 7, 12, 25])("%i seats monthly shows the engine total", (seats) => {
    const html = render({ initialSeats: seats });
    const q = quoteSeats({ seats, term: SEAT_TERMS.MONTHLY.id });
    expect(html).toContain(formatMinor(q.totalMinor, q.currency));
    expect(html).toContain(formatMinor(q.effectiveUnitRateMinor, q.currency));
  });

  it("shows the annual total when the annual term is selected", () => {
    const html = render({ initialSeats: 5, initialTerm: SEAT_TERMS.ANNUAL.id });
    const q = quoteSeats({ seats: 5, term: SEAT_TERMS.ANNUAL.id });
    expect(html).toContain(formatMinor(q.totalMinor, q.currency));
    expect(html).toContain("billed yearly");
  });

  it("quotes a solo workspace as free rather than showing ₹0", () => {
    expect(render({ initialSeats: 0 })).toContain("Free — it&#x27;s just you");
  });
});

describe("the best-price guarantee is surfaced as a gift", () => {
  it("tells a 9-seat buyer they were rounded up to 10", () => {
    const html = render({ initialSeats: 9 });
    expect(html).toContain("seat-bestprice");
    expect(html).toContain("We rounded you up to 10 seats");
    expect(html).toContain(formatMinor(quoteSeats({ seats: 9, term: SEAT_TERMS.MONTHLY.id }).totalMinor));
  });

  it("does not claim a round-up when there isn't one", () => {
    expect(render({ initialSeats: 7 })).not.toContain("seat-bestprice");
  });
});

describe("expansion incentive", () => {
  it("previews the next band with a concrete rate", () => {
    const html = render({ initialSeats: 4 });
    expect(html).toContain("seat-next-band");
    const nextRate = quoteSeats({ seats: 6, term: SEAT_TERMS.MONTHLY.id }).unitRateMinor;
    expect(html).toContain(formatMinor(nextRate));
  });

  it("shows the real annual saving in money, not just a percentage", () => {
    const html = render({ initialSeats: 5, initialTerm: SEAT_TERMS.ANNUAL.id });
    const monthly = quoteSeats({ seats: 5, term: SEAT_TERMS.MONTHLY.id }).totalMinor * 12;
    const annual = quoteSeats({ seats: 5, term: SEAT_TERMS.ANNUAL.id }).totalMinor;
    expect(html).toContain("seat-annual-saving");
    expect(html).toContain(formatMinor(monthly - annual));
  });

  it("lists every band with the term-correct rate", () => {
    // M46 — the annual rates are the specification's own table (99/89/79/65),
    // written as literals. Deriving the expectation the way the component used to
    // derive the value would let both be wrong together, which is exactly how the
    // ₹103/₹92/₹63 rates survived four audits.
    const html = render({ initialSeats: 3, initialTerm: SEAT_TERMS.ANNUAL.id });
    const SPEC_ANNUAL = { "1–2": 99, "3–5": 89, "6–9": 79, "10–25": 65 };
    for (const b of catalog.bands) {
      const label = `${b.min}–${b.max}`;
      expect(html).toContain(`${label} seats`);
      expect(html).toContain(`₹${SPEC_ANNUAL[label]}`);
    }
  });

  it("shows the saving for the band the customer is actually in", () => {
    // A flat "−20%" was wrong on three of four bands. 1–2 seats saves 23%.
    expect(render({ initialSeats: 2, initialTerm: SEAT_TERMS.ANNUAL.id })).toContain("−23%");
    // 10–25 saves 18%.
    expect(render({ initialSeats: 12, initialTerm: SEAT_TERMS.ANNUAL.id })).toContain("−18%");
  });
});

describe("enterprise transition", () => {
  it("stops quoting above the hard ceiling and routes to sales", () => {
    const html = render({ initialSeats: catalog.softCapSeats + 1 });
    expect(html).toContain("seat-enterprise");
    expect(html).toContain("Talk to sales");
    expect(html).not.toContain("seat-invoice");
  });

  it("routes to sales the moment the customer passes 25 — no self-serve gap", () => {
    // M46 — this asserted the OPPOSITE: that 26–50 seats stayed purchasable with
    // a sales flag alongside. The specification says "Above 25 seats — Contact
    // Sales (no self-serve purchase)", so a quotable gap above the published
    // table was a divergence from the commercial contract.
    for (const seats of [26, 30, 50]) {
      const html = render({ initialSeats: seats });
      expect(html).toContain("seat-enterprise");
      expect(html).toContain("Talk to sales");
      expect(html).not.toContain("seat-invoice");
      expect(html).not.toContain("seat-cta");
    }
  });

  it("still sells the 25th seat — the boundary is above 25, not at it", () => {
    const html = render({ initialSeats: 25 });
    expect(html).not.toContain("seat-enterprise");
    expect(html).toContain(formatMinor(quoteSeats({ seats: 25, term: SEAT_TERMS.MONTHLY.id }).totalMinor));
  });
});

describe("invoice summary", () => {
  it("breaks the charge down and totals it", () => {
    const html = render({ initialSeats: 5 });
    expect(html).toContain("seat-invoice");
    expect(html).toContain("Total due");
  });

  it("states that credits are separate and unaffected", () => {
    expect(render({ initialSeats: 5 })).toContain("credits never expire");
  });
});

describe("accessibility baseline", () => {
  it("labels the stepper controls and the term group", () => {
    const html = render({ initialSeats: 3 });
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Billing term"');
    expect(html).toContain('aria-label="Add a seat"');
    expect(html).toContain('aria-label="Remove a seat"');
    expect(html).toContain('aria-checked="true"');
  });

  it("announces the price region politely and links it to the input", () => {
    const html = render({ initialSeats: 3 });
    expect(html).toContain('aria-live="polite"');
    expect(html).toMatch(/aria-describedby="[^"]+-price"/);
  });

  it("marks decorative icons hidden from assistive tech", () => {
    expect(render({ initialSeats: 3 })).toContain('aria-hidden="true"');
  });
});

describe("guard rails", () => {
  // Attribute order in the rendered markup is React's business, so match the
  // whole tag and assert both attributes are on it.
  const tagWith = (html, testid) =>
    html.match(new RegExp(`<button[^>]*data-testid="${testid}"[^>]*>`))?.[0]
    ?? html.match(new RegExp(`<button[^>]*"${testid}"[^>]*>`))?.[0]
    ?? "";

  it("disables the CTA when the selection matches the current entitlement", () => {
    const tag = tagWith(render({ initialSeats: 5, currentSeats: 5 }), "seat-cta");
    expect(tag).toContain("disabled");
  });

  it("enables the CTA once the selection differs from the current entitlement", () => {
    const tag = tagWith(render({ initialSeats: 6, currentSeats: 5 }), "seat-cta");
    expect(tag).not.toContain("disabled=");
  });

  it("disables decrement at the floor", () => {
    const tag = tagWith(render({ initialSeats: 0, minSeats: 0 }), "seat-decrement");
    expect(tag).toContain("disabled");
  });

  it("shows a loading label while busy", () => {
    expect(render({ initialSeats: 5, busy: true })).toContain("Working…");
  });
});
