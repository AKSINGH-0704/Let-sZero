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
    const html = render({ initialSeats: 3, initialTerm: SEAT_TERMS.ANNUAL.id });
    for (const b of catalog.bands) {
      expect(html).toContain(`${b.min}–${b.max} seats`);
      expect(html).toContain(`₹${Math.round(b.rate * (1 - catalog.annualDiscount))}`);
    }
  });
});

describe("enterprise transition", () => {
  it("stops quoting above the hard ceiling and routes to sales", () => {
    const html = render({ initialSeats: catalog.softCapSeats + 1 });
    expect(html).toContain("seat-enterprise");
    expect(html).toContain("Talk to sales");
    expect(html).not.toContain("seat-invoice");
  });

  it("still quotes between the published table and the ceiling", () => {
    const seats = catalog.selfServeMaxSeats + 5;
    const html = render({ initialSeats: seats });
    expect(html).not.toContain("seat-enterprise");
    expect(html).toContain(formatMinor(quoteSeats({ seats, term: SEAT_TERMS.MONTHLY.id }).totalMinor));
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
