// M52 — the confirmation screen, ACTUALLY RENDERED.
//
// M50-C is the reason this file exists: a UI change is not verified until it has
// been rendered and looked at. A source-grep proves a string is present in a
// file; only a render proves the customer reads it, in the state they are
// actually in.
//
// The claims under test are claims about somebody's money, so each is checked in
// BOTH directions — present when true, and absent when false:
//
//   • today's amount, seat count and renewal amount are all shown
//   • "renews automatically" appears ONLY when it is going to
//   • "renewal is manual" appears ONLY when it is
//   • a mid-period upgrade explains the part-period amount and says the renewal
//     date does not move — and NEVER shows the proration fraction
//   • a scheduled downgrade names the consequence for teammates before it happens
//   • the failure path is explained before the customer pays, not after

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";

let vite, SeatChangeSummary;

const PERIOD_END = "2026-09-02T00:00:00.000Z";

/** An immediate purchase/upgrade preview, in the shape previewSeatChange returns. */
const immediate = (over = {}) => ({
  kind: "NEW",
  currency: "INR",
  chargeNowMinor: 34500,
  effectiveSeats: 3,
  quote: { seatsGranted: 3 },
  scheduled: null,
  renewal: { seats: 3, term: "MONTHLY", totalMinor: 34500, at: PERIOD_END },
  ...over,
});

/** A deferred downgrade preview. */
const deferred = (over = {}) => ({
  kind: "DOWNGRADE",
  currency: "INR",
  chargeNowMinor: 0,
  effectiveSeats: 10,
  scheduled: { seats: 3, term: "MONTHLY", at: PERIOD_END },
  renewal: { seats: 3, term: "MONTHLY", totalMinor: 34500, at: PERIOD_END },
  ...over,
});

/**
 * Render, then normalise to what a HUMAN sees.
 *
 * React's SSR output interleaves `<!-- -->` markers between adjacent text
 * expressions and HTML-escapes apostrophes, so a raw string match tests React's
 * serialiser rather than the sentence the customer reads. Stripping both is what
 * makes these assertions about the copy instead of about the renderer. (Tag
 * boundaries are preserved — `checked=""` still has to be findable.)
 */
function normalise(markup) {
  return markup
    .replace(/<!--\s*-->/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}

const html = (props) => normalise(renderToString(React.createElement(SeatChangeSummary, props)));

// ICU renders the abbreviated month as "Sep" or "Sept" depending on the data
// this Node happens to bundle, so date assertions are about the date being
// NAMED, not about which abbreviation is in fashion.
const RENEWAL_DATE = /2 Sept? 2026/;

beforeAll(async () => {
  vite = await createServer({
    server: { middlewareMode: true }, appType: "custom", logLevel: "silent",
    ssr: { noExternal: ["@tanstack/react-query", "wouter"] },
  });
  SeatChangeSummary = (await vite.ssrLoadModule("/src/components/teams/SeatChangeSummary.jsx")).default;
}, 60000);
afterAll(async () => { await vite?.close(); });

describe("the customer never has to calculate anything", () => {
  it("shows today's amount, the seat count and the renewal amount", () => {
    const h = html({ preview: immediate(), renewalMode: "AUTOMATIC", offerAutopay: false });
    expect(h).toMatch(/Today you pay/);
    expect(h).toMatch(/Seats, available now/);
    // The formatted figure, not a raw minor-unit integer.
    expect(h).toMatch(/345/);
    expect(h).not.toMatch(/34500/);
  });

  it("names the renewal date rather than a period length", () => {
    const h = html({ preview: immediate(), renewalMode: "AUTOMATIC", offerAutopay: false });
    expect(h).toMatch(RENEWAL_DATE);
    expect(h).not.toMatch(/30 days|one month later|billing cycle/i);
  });

  it("never exposes a proration fraction or internal billing vocabulary", () => {
    const h = html({ preview: immediate({ kind: "UPGRADE" }), renewalMode: "AUTOMATIC", offerAutopay: false });
    for (const leak of [
      /fraction/i, /prorat/i, /periodStart/i, /minor/i, /chargeNowMinor/i,
      /anchor/i, /mandate/i, /token/i, /gateway/i,
    ]) {
      expect(h, `leaked internal vocabulary: ${leak}`).not.toMatch(leak);
    }
  });

  it("explains a mid-period upgrade and promises the renewal date does not move", () => {
    const h = html({ preview: immediate({ kind: "UPGRADE" }), renewalMode: "AUTOMATIC", offerAutopay: false });
    expect(h).toMatch(/days left in your current period/i);
    expect(h).toMatch(/renewal date doesn't change/i);
  });

  it("does not show the upgrade explanation on a first purchase", () => {
    const h = html({ preview: immediate({ kind: "NEW" }), renewalMode: "AUTOMATIC", offerAutopay: false });
    expect(h).not.toMatch(/days left in your current period/i);
  });
});

describe("what it says about automatic renewal is true in every state", () => {
  it("offers the decision, pre-ticked, with the exact amount and date", () => {
    const h = html({
      preview: immediate(), offerAutopay: true, autopayAtCheckout: true, renewalMode: "AUTOMATIC",
    });
    expect(h).toMatch(/Renew automatically/);
    expect(h).toMatch(/checked=""/);           // opt-OUT, not opt-in
    expect(h).toMatch(/We'll charge/);
    expect(h).toMatch(RENEWAL_DATE);
    // The two promises that make an opt-out default defensible.
    expect(h).toMatch(/always email you first/i);
    expect(h).toMatch(/won't cancel your subscription/i);
  });

  it("respects the customer unticking it", () => {
    const h = html({
      preview: immediate(), offerAutopay: true, autopayAtCheckout: false, renewalMode: "AUTOMATIC",
    });
    expect(h).toMatch(/Renew automatically/);
    expect(h).not.toMatch(/checked=""/);
    // And the summary row must follow the decision, not the platform default.
    expect(h).toMatch(/Renew by/);
    expect(h).not.toMatch(/Then 2 Sep/);
  });

  it("says nothing else is needed when an instrument is already saved", () => {
    const h = html({ preview: immediate(), offerAutopay: false, renewalMode: "AUTOMATIC" });
    expect(h).toMatch(/renews automatically on your saved payment method/i);
    expect(h).not.toMatch(/Renew automatically<\/span> using/);
  });

  it("states manual renewal plainly when nothing will charge", () => {
    const h = html({ preview: immediate(), offerAutopay: false, renewalMode: "MANUAL" });
    expect(h).toMatch(/Renewal is manual/i);
    expect(h).toMatch(/email you a reminder/i);
    // The M44 failure, re-pinned: never promise a charge that will not happen.
    expect(h).not.toMatch(/renews automatically/i);
    expect(h).toMatch(/Renew by/);
  });

  // ── Audit E, defect E-DEF-1 ─────────────────────────────────────────────
  // Razorpay refuses a recurring order for a customer with no contact, so the
  // server degrades to a plain order. In production the checkout response
  // REDIRECTS straight to the gateway, so a "renewal is manual after all" toast
  // is never seen: the customer ticks "Renew automatically", pays, and finds out
  // a month later. The condition is knowable before they confirm, so the promise
  // must simply not be offered.
  it("does not offer a promise it cannot keep when the owner has no phone number", () => {
    const h = html({
      preview: immediate(), offerAutopay: false, autopayBlockedOnContact: true,
      renewalMode: "AUTOMATIC",
    });
    // No consent control at all — not a ticked box that quietly does nothing.
    expect(h).not.toMatch(/checked=""/);
    expect(h).not.toMatch(/Renew automatically<\/span> using/);
    // States the outcome AND the one action that changes it.
    expect(h).toMatch(/Renewal will be manual/i);
    expect(h).toMatch(/add a phone number/i);
    // And reassures them it does not block what they are doing right now.
    expect(h).toMatch(/won't affect this purchase/i);
  });

  it("labels the renewal row as manual when AutoPay is blocked on contact", () => {
    const h = html({
      preview: immediate(), offerAutopay: false, autopayBlockedOnContact: true,
      renewalMode: "AUTOMATIC",
    });
    // ⚠️ renewalMode is AUTOMATIC (the workspace IS in the rollout) but no
    // instrument can be registered, so the row must NOT say "Then".
    expect(h).toMatch(/Renew by/);
  });

  it("defaults to MANUAL when the server's answer is unknown", () => {
    // Promising an automatic charge that never happens costs a customer their
    // team; an unnecessary reminder costs them nothing. The default must be
    // aimed at that asymmetry.
    const h = html({ preview: immediate(), offerAutopay: false });
    expect(h).toMatch(/Renewal is manual/i);
    expect(h).toMatch(/Renew by/);
  });

  it("labels the renewal row differently depending on whether it charges itself", () => {
    expect(html({ preview: immediate(), renewalMode: "AUTOMATIC", offerAutopay: false })).toMatch(/Then 2 Sep/);
    expect(html({ preview: immediate(), renewalMode: "MANUAL", offerAutopay: false })).toMatch(/Renew by 2 Sep/);
  });
});

describe("the failure path is explained before the customer pays", () => {
  it("says a failed payment does not switch the team off immediately", () => {
    const h = html({ preview: immediate(), renewalMode: "AUTOMATIC", offerAutopay: false });
    expect(h).toMatch(/nothing is switched off straight away/i);
    expect(h).toMatch(/team keeps working/i);
  });
});

describe("a deferred change is honest about what happens, and when", () => {
  it("charges nothing and says so", () => {
    const h = html({ preview: deferred() });
    expect(h).toMatch(/Nothing is charged now/i);
    expect(h).toMatch(/nothing changes today/i);
    expect(h).toMatch(/10<\/span>\s*seats|10\s*seats/);
    expect(h).toMatch(/3<\/span>\s*seats|3\s*seats/);
  });

  it("warns about deactivation BEFORE the customer confirms", () => {
    const h = html({ preview: deferred() });
    expect(h).toMatch(/members beyond your new seat count are deactivated/i);
    // And immediately removes the fear it just created.
    expect(h).toMatch(/Nobody is deleted/i);
    expect(h).toMatch(/credits are never affected/i);
    expect(h).toMatch(/reactivate them/i);
  });

  it("does not warn about deactivation when the seat count is going UP", () => {
    const h = html({
      preview: deferred({ effectiveSeats: 3, scheduled: { seats: 10, term: "ANNUAL", at: PERIOD_END } }),
    });
    expect(h).not.toMatch(/are deactivated/i);
  });

  it("shows no AutoPay decision on a change that moves no money", () => {
    const h = html({ preview: deferred(), offerAutopay: true, autopayAtCheckout: true });
    expect(h).not.toMatch(/Renew automatically/);
  });
});

describe("it renders nothing rather than something wrong", () => {
  it("returns empty for a missing preview", () => {
    expect(html({ preview: null })).toBe("");
  });

  it("omits the renewal row when no renewal amount is known", () => {
    const h = html({ preview: immediate({ renewal: null }), renewalMode: "MANUAL", offerAutopay: false });
    expect(h).toMatch(/Today you pay/);
    expect(h).not.toMatch(/Renew by/);
  });
});
