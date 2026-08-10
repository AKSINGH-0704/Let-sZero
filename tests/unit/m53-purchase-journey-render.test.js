// M53 — the seat purchase journey AFTER the confirmation dialog, rendered.
//
// M52 made the confirmation screen excellent and stopped at its edge. Every
// defect this file pins lived one screen later, in the gap between two correct
// components — the ninth, tenth and eleventh instances of that pattern in this
// programme:
//
//   UX-2  the post-purchase panel told a SEAT buyer "your credits are in" and
//         showed "Credits added +0", seconds after they paid for seats. M52 had
//         already fixed this exact false claim in the Razorpay modal and did not
//         carry it one screen further.
//   UX-3  four server paths degrade automatic renewal to a manual one; each was
//         recorded on the payment and never shown, because checkout redirects to
//         the gateway before the client can read the response. The customer found
//         out a month later, when nothing was charged.
//   UX-5  the billing term was never stated on the screen where money is
//         committed.
//   UX-6  nothing said whether the figure shown was the whole figure.
//   UX-7  the failure promise was unbounded ("not straight away").
//
// Every claim here is a claim about somebody's money, so each is asserted in
// BOTH directions — present when true, absent when false.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";
import { GRACE_PERIOD_DAYS } from "../../shared/subscriptionStateMachine.js";

let vite, SeatChangeSummary, PostPurchaseActivation, makeTree, QueryClient;

const PERIOD_END = "2026-09-02T00:00:00.000Z";

function shimStorage() {
  const make = () => { const m = new Map(); return {
    getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k), clear: () => m.clear() }; };
  if (typeof globalThis.sessionStorage === "undefined") globalThis.sessionStorage = make();
  if (typeof globalThis.localStorage === "undefined") globalThis.localStorage = make();
}

const normalise = (m) => m
  .replace(/<!--\s*-->/g, "").replace(/&#x27;/g, "'")
  .replace(/&#x2F;/g, "/").replace(/&amp;/g, "&").replace(/&quot;/g, '"');

const OWNER = {
  id: "u1", username: "owner", email: "o@acme.com", role: "ROOT_ADMIN", parentId: null,
  plan: "starter", effectivePlan: "starter", isPlatformOperator: false,
  mustResetPassword: false, senderName: "O", creditsRemaining: 3000,
};

/** A settled SEATS payment, in the shape the verify response returns. */
const seatPayment = (metadata = {}) => ({
  id: "p-seats", kind: "SEATS", planName: "Team Seats — 3 × Monthly",
  credits: 0, amountMinor: 34500, currency: "INR", metadata,
});

const creditPayment = { id: "p-cr", kind: "CREDITS", planId: "starter", planName: "Starter", credits: 3000 };

/** The seat authority's payload, as `/api/seats/subscription` returns it. */
const seatState = ({ displayState = "NOT_SET_UP", seats = 3 } = {}) => ({
  entitlement: { seats, unlimited: false, source: "SUBSCRIPTION" },
  usage: { activeMembers: 0, pendingInvites: 0 },
  billingEnabled: true, isOwner: true, seatsAtRisk: 0,
  subscription: { id: "s1", status: "ACTIVE", seats, term: "MONTHLY", periodEnd: PERIOD_END, currency: "INR" },
  renewal: { seats, term: "MONTHLY", totalMinor: 34500, at: PERIOD_END },
  autopay: { displayState, enabled: displayState === "ACTIVE", inRollout: true },
  mandate: null, dunning: null, lastRenewal: null, renewalMode: displayState === "ACTIVE" ? "AUTOMATIC" : "MANUAL",
});

beforeAll(async () => {
  shimStorage();
  vite = await createServer({
    server: { middlewareMode: true }, appType: "custom", logLevel: "silent",
    ssr: { noExternal: ["@tanstack/react-query", "wouter"] },
  });
  SeatChangeSummary = (await vite.ssrLoadModule("/src/components/teams/SeatChangeSummary.jsx")).default;
  PostPurchaseActivation = (await vite.ssrLoadModule("/src/components/payments/PostPurchaseActivation.jsx")).default;
  const rq = await vite.ssrLoadModule("@tanstack/react-query");
  QueryClient = rq.QueryClient;
  const { QueryClientProvider } = rq;
  const { ThemeProvider } = await vite.ssrLoadModule("/src/context/ThemeContext.jsx");
  const { AuthProvider } = await vite.ssrLoadModule("/src/context/AuthContext.jsx");
  const { Router } = await vite.ssrLoadModule("wouter");
  makeTree = (qc, payment) =>
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(ThemeProvider, null,
        React.createElement(AuthProvider, null,
          React.createElement(Router, { ssrPath: "/app/payments" },
            React.createElement(PostPurchaseActivation, { payment, onClose: () => {} })))));
}, 60000);
afterAll(async () => { await vite?.close(); });

const summary = (props) => normalise(renderToString(React.createElement(SeatChangeSummary, props)));

function activation({ payment, seats: seatPayload, teamMembers = 0 } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(["/api/auth/me"], OWNER);
  qc.setQueryData(["/api/credits/info"], { paid: 3000, free: 0, total: 3000 });
  qc.setQueryData(["/api/users/team-usage"], { totalMembers: teamMembers });
  if (seatPayload) qc.setQueryData(["/api/seats/subscription"], seatPayload);
  return normalise(renderToString(makeTree(qc, payment)));
}

const immediate = (over = {}) => ({
  kind: "NEW", currency: "INR", chargeNowMinor: 34500, effectiveSeats: 3,
  quote: { seatsGranted: 3 }, scheduled: null,
  renewal: { seats: 3, term: "MONTHLY", totalMinor: 34500, at: PERIOD_END },
  ...over,
});

// ── UX-2 ───────────────────────────────────────────────────────────────────
describe("UX-2 — the post-purchase panel never mentions credits for a seat purchase", () => {
  const html = () => activation({ payment: seatPayment(), seats: seatState() });

  it("does not claim credits were added", () => {
    const h = html();
    // Prove the seat panel actually rendered before asserting on absences.
    expect(h).toContain('data-testid="activation-seat-stats"');
    expect(h).not.toMatch(/your credits are in/i);
    expect(h).not.toMatch(/Credits added/i);
    expect(h).not.toMatch(/New balance/i);
    expect(h).not.toMatch(/\+0/);
  });

  it("does not say the word 'credit' anywhere on a seat purchase", () => {
    // The directive is absolute: a seat purchase confirmation is about seats.
    // Rendered with a team intro eligible, which is where the last mention hid.
    expect(activation({ payment: seatPayment(), seats: seatState(), teamMembers: 0 }))
      .not.toMatch(/credit/i);
  });

  it("names what actually became active, not a plan string", () => {
    const h = html();
    expect(h).toMatch(/Your seats are active/i);
    expect(h).toMatch(/Seats now active/i);
    expect(h).toContain('data-testid="activation-seat-count"');
  });

  it("states when the subscription renews", () => {
    expect(html()).toMatch(/2 Sept? 2026/);
  });

  it("still shows the credit figures for an ordinary CREDIT purchase", () => {
    // The regression guard in the other direction: fixing seats must not blank
    // the panel that has always worked for credits.
    const h = activation({ payment: creditPayment });
    expect(h).toMatch(/Credits added/);
    expect(h).toMatch(/your credits are in/i);
    expect(h).not.toContain('data-testid="activation-seat-stats"');
  });
});

// ── UX-3 ───────────────────────────────────────────────────────────────────
describe("UX-3 — automatic renewal never degrades silently", () => {
  it("confirms it is ON, with the amount and date, when it was established", () => {
    const h = activation({
      payment: seatPayment({ autopayAtCheckout: true }),
      seats: seatState({ displayState: "ACTIVE" }),
    });
    expect(h).toMatch(/Automatic renewal is on/i);
    expect(h).toMatch(/We'll charge/);
    expect(h).toMatch(/2 Sept? 2026/);
    expect(h).toMatch(/turn it off any time/i);
  });

  it("says so — and names the one fix — when a phone number blocked it", () => {
    const h = activation({
      payment: seatPayment({ autopayUnavailable: "CONTACT_REQUIRED" }),
      seats: seatState({ displayState: "NOT_SET_UP" }),
    });
    expect(h).toMatch(/renewal is manual/i);
    expect(h).toMatch(/phone number/i);
    expect(h).toMatch(/reminder before your period ends/i);
    // Never framed as a failed purchase — the sale completed in full.
    expect(h).not.toMatch(/payment failed|purchase failed/i);
  });

  it.each(["ORDER_REJECTED", "CUSTOMER_CREATE_FAILED", "GATEWAY_UNAVAILABLE"])(
    "reports the degradation for %s instead of staying silent",
    (code) => {
      const h = activation({
        payment: seatPayment({ autopayUnavailable: code }),
        seats: seatState({ displayState: "NOT_SET_UP" }),
      });
      expect(h).toContain('data-testid="activation-autopay"');
      expect(h).toMatch(/renewal is manual/i);
      expect(h).toMatch(/purchase went through in full/i);
      // The customer is never shown the internal code.
      expect(h).not.toMatch(new RegExp(code, "i"));
    }
  );

  it("catches the case where AutoPay was asked for and simply never bound", () => {
    // No `autopayUnavailable` recorded, but the instrument is not live either —
    // an abandoned bank authorisation. Silence here is the original defect.
    const h = activation({
      payment: seatPayment({ autopayAtCheckout: true }),
      seats: seatState({ displayState: "PENDING_AUTH" }),
    });
    expect(h).toMatch(/renewal is manual/i);
  });

  it("confirms manual renewal plainly when the customer chose it", () => {
    const h = activation({ payment: seatPayment(), seats: seatState() });
    expect(h).toMatch(/Renewal is manual/i);
    expect(h).toMatch(/switch automatic renewal on any time/i);
  });

  it("makes NO claim about renewal while the seat payload is unknown", () => {
    // The M43 silence rule: an unanswered server has made no claim, and this
    // screen renders seconds after a payment.
    const h = activation({ payment: seatPayment() });
    expect(h).not.toContain('data-testid="activation-autopay"');
    expect(h).not.toMatch(/Automatic renewal is on/i);
  });
});

// ── UX-5 / UX-6 / UX-7 ─────────────────────────────────────────────────────
describe("UX-5 — the confirmation states the billing term", () => {
  it("names the term the customer is committing to", () => {
    expect(summary({ preview: immediate(), renewalMode: "MANUAL" })).toMatch(/Billing term/);
    expect(summary({ preview: immediate(), renewalMode: "MANUAL" })).toMatch(/Monthly/);
  });

  it("says Annual for a yearly commitment", () => {
    const h = summary({
      preview: immediate({ renewal: { seats: 3, term: "ANNUAL", totalMinor: 1188000, at: PERIOD_END } }),
      renewalMode: "MANUAL",
    });
    expect(h).toMatch(/Billing term/);
    expect(h).toMatch(/Annual/);
  });

  it("omits the row rather than inventing a term", () => {
    const h = summary({ preview: immediate({ renewal: null }), renewalMode: "MANUAL" });
    expect(h).not.toMatch(/Billing term/);
  });
});

describe("UX-6 — the amount shown is stated to be the whole amount", () => {
  it("says nothing is added at checkout", () => {
    expect(summary({ preview: immediate(), renewalMode: "MANUAL" }))
      .toMatch(/full amount charged today/i);
  });

  it("makes no claim about tax it cannot substantiate", () => {
    // GST invoicing is unbuilt (SEAT-004) and the pricing authority states no tax
    // treatment, so asserting one here would be an invention about money.
    const h = summary({ preview: immediate(), renewalMode: "MANUAL" });
    expect(h).not.toMatch(/GST|inclusive of tax|plus tax|excluding tax/i);
  });
});

describe("UX-7 — the failure promise is bounded", () => {
  it("quotes the real grace window from the billing authority", () => {
    const h = summary({ preview: immediate(), renewalMode: "AUTOMATIC" });
    expect(h).toMatch(new RegExp(`for ${GRACE_PERIOD_DAYS} days`));
    expect(h).toMatch(/nothing is switched off straight away/i);
  });
});

// ── UX-8 ───────────────────────────────────────────────────────────────────
describe("UX-8 — one renewal vocabulary, and no internal words, on every screen", () => {
  const surfaces = () => [
    summary({ preview: immediate(), offerAutopay: true, autopayAtCheckout: true, renewalMode: "AUTOMATIC" }),
    activation({ payment: seatPayment({ autopayAtCheckout: true }), seats: seatState({ displayState: "ACTIVE" }) }),
    activation({ payment: seatPayment({ autopayUnavailable: "ORDER_REJECTED" }), seats: seatState() }),
  ];

  it("never says 'automatic payment' or 'auto-renewal' anywhere", () => {
    for (const h of surfaces()) {
      expect(h).not.toMatch(/automatic payment/i);
      expect(h).not.toMatch(/auto-renewal/i);
      expect(h).not.toMatch(/AutoPay/);
    }
  });

  it("never leaks gateway or billing internals to the customer", () => {
    for (const h of surfaces()) {
      for (const leak of [/mandate/i, /\btoken\b/i, /gateway/i, /minor/i, /razorpay/i, /prorat/i, /anchor/i]) {
        expect(h, `leaked: ${leak}`).not.toMatch(leak);
      }
    }
  });
});
