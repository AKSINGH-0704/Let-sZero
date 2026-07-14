// M24 — the plan card, rendered.
//
// tests/unit/plan-purchase-availability.test.js proves the *rule*. This proves the *card*:
// the M24 defect was a `disabled` attribute in JSX, so the rendered HTML is what has to be
// asserted. Rendered through Vite's SSR module loader + renderToString, the same mechanism
// tests/unit/resource-center-components.test.js uses (this repo has no jsdom/RTL).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";

let PlanCard;
let vite;

beforeAll(async () => {
  vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  // Paths are root-relative to vite.config.js's root (client/), matching the convention in
  // tests/unit/resource-center-components.test.js.
  const mod = await vite.ssrLoadModule("/src/pages/Payments.jsx");
  PlanCard = mod.PlanCard;
}, 60000);

afterAll(async () => {
  await vite.close();
});

const GROWTH     = { id: "growth",     name: "Growth",     credits: 15000, totalCredits: 16250, bonusCredits: 1250, priceINR: 1800, isPopular: true, features: {} };
const STARTER    = { id: "starter",    name: "Starter",    credits: 3000,  totalCredits: 3000,  bonusCredits: 0, priceINR: 390, features: {} };
const ENTERPRISE = { id: "enterprise", name: "Enterprise", credits: null,  totalCredits: null,  bonusCredits: null, priceINR: null, isCustom: true, features: {} };
const TRIAL      = { id: "trial",      name: "Free Trial", credits: 500,   totalCredits: 500,   bonusCredits: 0, priceINR: 0, isTrial: true, features: {} };

function render(plan, { currentPlanId, isTrialUser = false, isPending = false } = {}) {
  return renderToString(
    React.createElement(PlanCard, {
      plan,
      currency: "INR",
      onPurchase: () => {},
      currentPlanId,
      isTrialUser,
      isPending,
    })
  );
}

// A <button> is live unless React emitted the `disabled` attribute on it. React renders a
// true boolean attribute as `disabled=""` and omits it entirely when false, so match that
// exactly — a looser /\sdisabled/ also matches the Tailwind `disabled:opacity-60` class
// inside className and reports every button as dead. The isPending case below is what keeps
// this helper honest: it must still come back true.
function hasDisabledButton(html) {
  return /<button[^>]*\sdisabled=""/.test(html);
}

describe("M24 — the card the customer already owns stays buyable", () => {
  it("renders an ENABLED purchase button on the current plan's own card", () => {
    const html = render(GROWTH, { currentPlanId: "growth" });
    expect(html).toContain('data-testid="button-purchase-growth"');
    expect(hasDisabledButton(html)).toBe(false);
  });

  it("still badges that card as the customer's plan", () => {
    const html = render(GROWTH, { currentPlanId: "growth" });
    expect(html).toContain('data-testid="badge-current-plan-growth"');
    expect(html).toContain("Your Plan");
  });

  it("says both things at once: this is my plan, and I can buy more", () => {
    const html = render(GROWTH, { currentPlanId: "growth" });
    expect(html).toContain("Your Plan");        // the badge
    expect(html).toContain("Buy Again");        // the CTA
    expect(html).toContain("Adds 16,250 credits to your balance."); // the effect
  });

  it("no longer renders the word 'Active' anywhere on the card", () => {
    const html = render(GROWTH, { currentPlanId: "growth" });
    expect(html).not.toContain(">Active<");
    expect(html).not.toContain("Current Plan");
  });

  it("does not stack two badges in the same slot on the popular card", () => {
    // Both badges are absolutely positioned at -top-3.5 left-1/2. Growth is both the popular
    // card and the most commonly held paid plan, so an unguarded render puts "Most Popular"
    // and "Your Plan" directly on top of each other.
    const owned = render(GROWTH, { currentPlanId: "growth" });
    expect(owned).toContain("Your Plan");
    expect(owned).not.toContain("Most Popular");

    // ...and prospects still get the persuasion badge.
    const prospect = render(GROWTH, { currentPlanId: "free" });
    expect(prospect).toContain("Most Popular");
    expect(prospect).not.toContain("Your Plan");
  });
});

describe("M24 — rendered CTAs for the other relations", () => {
  it("a lower pack renders as a live purchase that protects the plan", () => {
    const html = render(STARTER, { currentPlanId: "scale" });
    expect(hasDisabledButton(html)).toBe(false);
    expect(html).toContain("Buy Credits");
    expect(html).toContain("Your Scale plan stays.");
  });

  it("a higher pack renders as an upgrade", () => {
    const html = render(GROWTH, { currentPlanId: "starter" });
    expect(hasDisabledButton(html)).toBe(false);
    expect(html).toContain("Upgrade to Growth");
  });

  it("enterprise keeps a live Contact Sales button for an enterprise customer", () => {
    const html = render(ENTERPRISE, { currentPlanId: "enterprise" });
    expect(html).toContain('data-testid="button-purchase-enterprise"');
    expect(hasDisabledButton(html)).toBe(false);
    expect(html).toContain("Contact Sales");
    expect(html).toContain('data-testid="badge-current-plan-enterprise"');
  });
});

describe("M24 — the free trial", () => {
  it("offers the claim while unclaimed", () => {
    const html = render(TRIAL, { currentPlanId: "free", isTrialUser: true });
    expect(html).toContain('data-testid="button-purchase-trial"');
    expect(html).toContain("Start Free Trial");
  });

  it("renders no button at all once claimed, instead of one that could only fail", () => {
    const html = render(TRIAL, { currentPlanId: "free", isTrialUser: false });
    expect(html).not.toContain('data-testid="button-purchase-trial"');
    expect(html).toContain('data-testid="state-plan-trial"');
    expect(html).toContain("Already claimed.");
  });

  it("does not offer a free grant to a paying customer", () => {
    const html = render(TRIAL, { currentPlanId: "growth", isTrialUser: false });
    expect(html).not.toContain('data-testid="button-purchase-trial"');
  });
});

describe("M24 — in-flight purchase", () => {
  it("disables buttons only while a purchase is being initiated", () => {
    const html = render(GROWTH, { currentPlanId: "growth", isPending: true });
    expect(hasDisabledButton(html)).toBe(true); // the ONLY state that disables a paid card
  });
});
