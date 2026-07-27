// MXX — the warm-up dashboard banner and explainer, rendered.
//
// Proves the customer-facing half of the progressive warm-up policy: each state
// renders the right message, the ladder shown comes from the backend rather than
// client-side copy, and the completion state replaces the day count once the ladder
// tops out. Also guards the structural reason SenderHealthWidget was rebuilt on
// Banner — the explainer trigger must not be nested inside the deep link.
//
// SSR-rendered through Vite's module loader in App's provider stack (same harness as
// team-members-render.test.js), with the query cache seeded so no backend is needed.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";

let vite, SenderHealthWidget, WarmupExplainer, WarmupShell, makeTree, render, renderExplainer, renderShell, QueryClient;

// React separates adjacent text nodes with an empty comment in SSR output, so
// "25" and "/day" arrive as 25<!-- -->/day. Strip them before asserting on copy.
const clean = (html) => html.replace(/<!-- -->/g, "");

function shimStorage() {
  const make = () => { const m = new Map(); return {
    getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k), clear: () => m.clear() }; };
  if (typeof globalThis.sessionStorage === "undefined") globalThis.sessionStorage = make();
  if (typeof globalThis.localStorage === "undefined") globalThis.localStorage = make();
}

beforeAll(async () => {
  shimStorage();
  vite = await createServer({
    server: { middlewareMode: true }, appType: "custom", logLevel: "silent",
    ssr: { noExternal: ["@tanstack/react-query", "wouter"] },
  });
  SenderHealthWidget = (await vite.ssrLoadModule("/src/components/SenderHealthWidget.jsx")).default;
  // The schedule content, not the popover shell: Radix keeps content unmounted while
  // closed, so rendering the shell would only ever produce the trigger.
  const explainerMod  = await vite.ssrLoadModule("/src/components/WarmupExplainer.jsx");
  WarmupExplainer    = explainerMod.WarmupScheduleContent;
  WarmupShell        = explainerMod.default;
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
            React.createElement(Router, { ssrPath: "/app/dashboard" },
              React.createElement(SenderHealthWidget))))));

  render = (qc) => clean(renderToString(makeTree(qc)));

  renderExplainer = (ladder) =>
    clean(renderToString(React.createElement(TooltipProvider, null,
      React.createElement(WarmupExplainer, { ladder }))));
  renderShell = (ladder) =>
    clean(renderToString(React.createElement(TooltipProvider, null,
      React.createElement(WarmupShell, { ladder }))));
}, 60000);

afterAll(async () => { await vite?.close(); });

const USER = {
  id: "u1", username: "sender", email: "s@acme.com", role: "USER",
  effectivePlan: "growth", sendingIdentityType: "custom_domain", isPlatformOperator: false,
};

function seeded(health, user = USER) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(["/api/auth/me"], user);
  qc.setQueryData(["/api/sender-health"], health);
  return qc;
}

const LADDER = [
  { throughDay: 3, dailyLimit: 50 },
  { throughDay: 7, dailyLimit: 100 },
  { throughDay: null, dailyLimit: 200 },
];

function health({ warmup, policyOk = true, identityOk = true, reputationOk = true }) {
  return {
    identity: { ok: identityOk, sendingIdentityType: "custom_domain" },
    reputation: { ok: reputationOk },
    policy: { ok: policyOk, warmup },
    readiness: policyOk && identityOk && reputationOk ? "ready" : "blocked",
  };
}

describe("MXX — warm-up dashboard banner", () => {
  it("shows the day, today's remaining volume, and the next increase", () => {
    const html = render(seeded(health({
      warmup: {
        active: true, dayIndex: 1, totalDays: 30, dailyLimit: 50, sentToday: 16,
        remainingToday: 34, isFinalStage: false,
        nextIncrease: { dailyLimit: 100, inDays: 3 }, ladder: LADDER,
      },
    })));
    expect(html).toContain("Warm-up day 1");
    expect(html).toContain("34 of 50 sends left today");
    expect(html).toContain("Goes up to 100 a day in 3 days");
  });

  it("says 'day' not 'days' when the increase is tomorrow", () => {
    const html = render(seeded(health({
      warmup: {
        active: true, dayIndex: 3, totalDays: 30, dailyLimit: 50, remainingToday: 5,
        isFinalStage: false, nextIncrease: { dailyLimit: 100, inDays: 1 }, ladder: LADDER,
      },
    })));
    expect(html).toContain("in 1 day");
    expect(html).not.toContain("in 1 days");
  });

  it("reports warm-up COMPLETE once the ladder tops out, with the daily volume", () => {
    const html = render(seeded(health({
      warmup: {
        active: true, dayIndex: 12, totalDays: 30, dailyLimit: 200, remainingToday: 200,
        isFinalStage: true, nextIncrease: null, ladder: LADDER,
      },
    })));
    expect(html).toContain("Warm-up complete");
    expect(html).toContain("up to 200 emails a day");
    // The customer is at full volume — a day count here would imply a restriction
    // that is no longer in force.
    expect(html).not.toContain("Warm-up day");
    expect(html).not.toContain("sends left today");
  });

  it("reassures that a limited campaign continues on its own", () => {
    const html = render(seeded(health({
      policyOk: false,
      warmup: {
        active: true, dayIndex: 2, totalDays: 30, dailyLimit: 50, remainingToday: 0,
        isFinalStage: false, nextIncrease: { dailyLimit: 100, inDays: 2 }, ladder: LADDER,
      },
    })));
    expect(html).toContain("today&#x27;s full amount");
    expect(html).toContain("continues automatically");
  });

  it("falls back to the plain ready state outside warm-up", () => {
    const html = render(seeded(health({ warmup: null })));
    expect(html).toContain("Ready to send");
    expect(html).not.toContain("Warm-up");
  });

  it("keeps the pre-warm-up states intact", () => {
    const preview = render(seeded(
      health({ warmup: null }), { ...USER, sendingIdentityType: null }
    ));
    expect(preview).toContain("Preview Mode");

    const verifying = render(seeded(health({ warmup: null, identityOk: false })));
    expect(verifying).toContain("domain is verifying");

    const blocked = render(seeded({
      identity: { ok: true }, reputation: { ok: false, message: "Sending is paused." },
      policy: { ok: true, warmup: null },
    }));
    expect(blocked).toContain("Sending is paused.");
  });

  it("renders nothing for an admin, who has no sending identity", () => {
    const html = render(seeded(
      health({ warmup: null }), { ...USER, role: "ROOT_ADMIN", isPlatformOperator: true }
    ));
    expect(html).toBe("");
  });

  it("does not nest the explainer button inside the deep link", () => {
    const html = render(seeded(health({
      warmup: {
        active: true, dayIndex: 1, totalDays: 30, dailyLimit: 50, remainingToday: 34,
        isFinalStage: false, nextIncrease: { dailyLimit: 100, inDays: 3 }, ladder: LADDER,
      },
    })));
    // A nested interactive breaks keyboard and screen-reader traversal, and is the
    // reason this widget moved off a Link-wrapped row onto the Banner primitive.
    const anchorWithButton = /<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<button\b/i;
    expect(anchorWithButton.test(html)).toBe(false);
    const buttonWithAnchor = /<button\b[^>]*>(?:(?!<\/button>)[\s\S])*<a\b/i;
    expect(buttonWithAnchor.test(html)).toBe(false);
    // Both affordances are still present.
    expect(html).toContain("<button");
    expect(html).toContain("Why does my daily sending limit increase?");
  });
});

describe("MXX — warm-up explainer content", () => {
  it("renders the schedule from the ladder it is given, not hardcoded copy", () => {
    const html = renderExplainer([
      { throughDay: 5, dailyLimit: 25 },
      { throughDay: null, dailyLimit: 400 },
    ]);
    expect(html).toContain("Days 1–5");
    expect(html).toContain("25/day");
    expect(html).toContain("Day 6 onwards");
    expect(html).toContain("400/day");
    // Nothing from the shipped default leaks in.
    expect(html).not.toContain("50/day");
    expect(html).not.toContain("200/day");
  });

  it("labels a single-day stage without a range", () => {
    const html = renderExplainer([
      { throughDay: 1, dailyLimit: 10 },
      { throughDay: null, dailyLimit: 20 },
    ]);
    expect(html).toContain("Day 1");
    expect(html).not.toContain("Days 1–1");
  });

  it("states that credits are unaffected and never expire", () => {
    const html = renderExplainer(LADDER);
    expect(html).toMatch(/never expire/i);
    expect(html).toMatch(/credits are never affected/i);
  });

  it("explains automatic continuation rather than implying a restart is needed", () => {
    const html = renderExplainer(LADDER);
    expect(html).toMatch(/keep going on their own|sends automatically/i);
    expect(html).toContain("Nothing to restart.");
  });

  it("uses an accessible labelled trigger", () => {
    const html = renderShell(LADDER);
    expect(html).toContain('aria-label="Why does my daily sending limit increase?"');
    expect(html).toContain('type="button"');
  });

  it("falls back to the shipped ladder when none is supplied", () => {
    const html = renderExplainer(undefined);
    expect(html).toContain("Days 1–3");
    expect(html).toContain("50/day");
    expect(html).toContain("Day 8 onwards");
    expect(html).toContain("200/day");
  });
});

describe("MXX — a parked campaign describes itself accurately", () => {
  let getStatusConfig;
  beforeAll(async () => {
    ({ getStatusConfig } = await vite.ssrLoadModule("/src/lib/campaignStatus.js"));
  });

  const soon = () => new Date(Date.now() + 20 * 3600_000).toISOString();

  it("says 'Continuing', not 'Queued', for a part-sent campaign awaiting its next window", () => {
    const cfg = getStatusConfig("PENDING", { scheduledAt: soon(), sentEmails: 50 });
    expect(cfg.label).toBe("Continuing");
    expect(cfg.tooltip).toMatch(/sending limit was reached/i);
    expect(cfg.tooltip).toMatch(/nothing to restart/i);
    // The plain PENDING copy is wrong on every count for this campaign.
    expect(cfg.tooltip).not.toMatch(/waiting to start|begin shortly/i);
    // Still cancellable — parking must not take that away.
    expect(cfg.canCancel).toBe(true);
  });

  it("leaves a genuinely queued campaign alone", () => {
    expect(getStatusConfig("PENDING", { scheduledAt: null, sentEmails: 0 }).label).toBe("Queued");
    // Scheduled but never started — that is a scheduled campaign, not a parked one.
    expect(getStatusConfig("PENDING", { scheduledAt: soon(), sentEmails: 0 }).label).toBe("Queued");
    // Past scheduledAt — due now, not parked.
    expect(getStatusConfig("PENDING", {
      scheduledAt: new Date(Date.now() - 3600_000).toISOString(), sentEmails: 20,
    }).label).toBe("Queued");
  });

  it("is backward compatible when no campaign is passed", () => {
    expect(getStatusConfig("PENDING").label).toBe("Queued");
    expect(getStatusConfig("COMPLETED").label).toBeTruthy();
  });
});
