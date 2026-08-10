// M44 — the seat page must never promise a charge the platform cannot make.
//
// v1 is prepaid: there is no stored mandate, so the renewal sweep never debits
// anyone (server/seatRenewal.js). The page nonetheless offered "Turn off
// auto-renewal" and promised "Next charge ₹1,290 on 30 Aug". A customer who read
// that and did nothing would pass their period end, enter a 14-day grace window
// they were never told about, and have their most recent teammates deactivated.
//
// The static guard proves no surface makes that claim outside a renewalMode
// gate. Only a render proves the page says the RIGHT thing in each mode — and in
// particular that the manual wording names who has to act and by when.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";

let vite, TeamSeats, makeTree, QueryClient;

function shimStorage() {
  const make = () => { const m = new Map(); return {
    getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k), clear: () => m.clear() }; };
  if (typeof globalThis.sessionStorage === "undefined") globalThis.sessionStorage = make();
  if (typeof globalThis.localStorage === "undefined") globalThis.localStorage = make();
}

const OWNER = {
  id: "u1", username: "owner", email: "o@acme.com", role: "ROOT_ADMIN", parentId: null,
  plan: "starter", effectivePlan: "starter", isPlatformOperator: false,
  mustResetPassword: false, senderName: "O", creditsRemaining: 3000,
};

const PERIOD_END = "2026-08-30T00:00:00.000Z";

const payload = ({ renewalMode = "MANUAL", cancelAtPeriodEnd = false } = {}) => ({
  entitlement: { seats: 10, unlimited: false, source: "SUBSCRIPTION" },
  usage: { activeMembers: 4, pendingInvites: 0 },
  billingEnabled: true,
  renewalMode,
  isOwner: true,
  subscription: {
    id: "s1", status: "ACTIVE", seats: 10, term: "MONTHLY",
    periodStart: "2026-07-30T00:00:00.000Z", periodEnd: PERIOD_END,
    scheduledSeats: null, scheduledTerm: null, cancelAtPeriodEnd,
    renewalAmountMinor: 79000, currency: "INR", pricingVersion: "2026-07-29.1",
    graceEndsAt: null,
  },
  renewal: { seats: 10, term: "MONTHLY", totalMinor: 79000, at: PERIOD_END },
  seatsAtRisk: 0,
});

beforeAll(async () => {
  shimStorage();
  vite = await createServer({
    server: { middlewareMode: true }, appType: "custom", logLevel: "silent",
    ssr: { noExternal: ["@tanstack/react-query", "wouter"] },
  });
  TeamSeats = (await vite.ssrLoadModule("/src/pages/TeamSeats.jsx")).default;
  const rq = await vite.ssrLoadModule("@tanstack/react-query");
  QueryClient = rq.QueryClient;
  const { QueryClientProvider } = rq;
  const { ThemeProvider } = await vite.ssrLoadModule("/src/context/ThemeContext.jsx");
  const { AuthProvider } = await vite.ssrLoadModule("/src/context/AuthContext.jsx");
  const { TooltipProvider } = await vite.ssrLoadModule("/src/components/ui/tooltip.jsx");
  const { Router } = await vite.ssrLoadModule("wouter");
  makeTree = (qc) =>
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(ThemeProvider, null,
        React.createElement(AuthProvider, null,
          React.createElement(TooltipProvider, null,
            React.createElement(Router, { ssrPath: "/app/team/seats" },
              React.createElement(TeamSeats))))));
}, 60000);
afterAll(async () => { await vite?.close(); });

function render(opts) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(["/api/auth/me"], OWNER);
  qc.setQueryData(["/api/seats/subscription"], payload(opts));
  return renderToString(makeTree(qc)).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'");
}

describe("renewal is MANUAL — the page says who must act, and by when", () => {
  const html = () => render({ renewalMode: "MANUAL" });

  it("never promises an automatic charge", () => {
    const h = html();
    // Prove the billing panel rendered before asserting on absent copy, so this
    // cannot pass because the section simply wasn't there.
    expect(h).toContain("Seats in use");
    expect(h).not.toMatch(/Next charge/i);
    expect(h).not.toMatch(/auto-?renewal/i);
  });

  it("tells the customer to renew, and by when", () => {
    const h = html();
    expect(h).toMatch(/Renew by/);
    expect(h).toMatch(/seats are not charged automatically/i);
  });

  it("labels the opt-out by its outcome rather than a mechanism that does not exist", () => {
    // M53/UX-1 — the outcome wording is now the SAME in both renewal modes; see
    // the AUTOMATIC block below for why it stopped varying.
    expect(html()).toMatch(/End seats on/);
  });
});

describe("renewal is AUTOMATIC — the same page states the charge", () => {
  // M51/M52 — `renewalMode` is now DERIVED (per subscription from its mandate,
  // and pre-purchase from the rollout gate) rather than read from a platform
  // constant. This block is the rendering contract that derivation feeds: what
  // the server decides must actually change what the customer reads.
  const html = () => render({ renewalMode: "AUTOMATIC" });

  it("states the next charge", () => {
    expect(html()).toMatch(/Next charge/);
  });

  it("says the subscription renews by itself", () => {
    expect(html()).toMatch(/Renews /);
  });

  // M53/UX-1 — this control used to read "Turn off auto-renewal" in AUTOMATIC
  // mode, which put it one word away from the payment card's "Turn off automatic
  // payment" directly above it. The two outcomes are opposite: that one keeps the
  // team and renews by hand, THIS one ends the seats and deactivates members. It
  // was also a ghost button that fired on a single click with no confirmation.
  //
  // The label is now the outcome, identical in both modes, and it must never
  // borrow the renewal vocabulary again.
  it("names the destructive outcome, and never reuses the renewal vocabulary", () => {
    const h = html();
    expect(h).toMatch(/End seats on/);
    expect(h).not.toMatch(/Turn off auto-?renewal/i);
  });

  it("keeps the two opposite controls verbally distinct", () => {
    const h = html();
    // "Turn off automatic renewal" (keeps the team) may exist on this page; what
    // must not exist is a second control whose label reads like it.
    const endSeats = /End seats on/.test(h);
    const collides = /Turn off auto-?renewal[^<]*<\/button>[\s\S]{0,400}?Turn off auto-?renewal/i.test(h);
    expect(endSeats).toBe(true);
    expect(collides).toBe(false);
  });
});

// CDP-3 — found by the pre-deployment journey audit. In PAST_DUE the period has
// already ended, so every surface quoting `periodEnd` printed a date in the PAST
// beside a banner promising access until the GRACE date: two dates, two tenses,
// one screen, on the page a worried customer opens after a failed renewal.
describe("PAST_DUE — every date on the page is the one that actually applies", () => {
  const pastDue = () => {
    const base = payload({ renewalMode: "MANUAL" });
    base.subscription.status = "PAST_DUE";
    base.subscription.graceEndsAt = "2026-09-13T00:00:00.000Z";
    base.seatsAtRisk = 2;
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(["/api/auth/me"], OWNER);
    qc.setQueryData(["/api/seats/subscription"], base);
    return renderToString(makeTree(qc)).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'");
  };

  it("quotes the grace deadline, not the period that already elapsed", () => {
    const h = pastDue();
    expect(h).toContain("Seats in use");            // the page really rendered
    expect(h).toMatch(/Renew by 13 Sept? 2026/);    // the deadline that applies
    expect(h).not.toMatch(/Renew by 30 Aug 2026/);  // the elapsed period end
  });

  it("drops the forward-looking renewal preview while past due", () => {
    // It said "Renew by <past date> to keep N seats" under a banner explaining
    // the renewal had already failed.
    expect(pastDue()).not.toMatch(/to keep 10 seats/);
  });

  it("does not promise a reminder for a period that has already ended", () => {
    expect(pastDue()).not.toMatch(/reminder before your period ends/i);
  });
});

describe("already opted out — both modes say the seats end", () => {
  it("states the end date and does not chase a renewal", () => {
    const h = render({ renewalMode: "MANUAL", cancelAtPeriodEnd: true });
    expect(h).toMatch(/Ends /);
    expect(h).not.toMatch(/Renew by/);
    // The renewal preview panel is hidden once cancellation is scheduled, so no
    // amount is quoted for a period the customer has already declined.
    expect(h).not.toMatch(/Next charge/i);
  });
});
