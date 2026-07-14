// M24 — Purchasing availability.
//
// The product invariant under test: holding a plan must never take away the ability to buy.
// RepMail sells one-time credit packs (server/fulfillPayment.js — a plan is the highest pack
// ever bought and can never be downgraded), so the pack a customer already owns is the one
// they are most likely to buy again. Before M24 the in-app card for that pack rendered as a
// disabled "Active" button.
//
// These tests assert the rule directly rather than through a DOM (this repo has no
// jsdom/RTL — a pre-existing, previously-disclosed limitation), which is why the rule lives
// in a pure module every purchasing surface derives from.

import { describe, it, expect } from "vitest";
import { getPlanPurchaseState } from "../../client/src/lib/planPurchase.js";

// Mirrors the PLANS array rendered by client/src/pages/Payments.jsx.
const TRIAL      = { id: "trial",      name: "Free Trial", totalCredits: 500,   credits: 500,   isTrial: true };
const STARTER    = { id: "starter",    name: "Starter",    totalCredits: 3000,  credits: 3000 };
const GROWTH     = { id: "growth",     name: "Growth",     totalCredits: 16250, credits: 15000, isPopular: true };
const SCALE      = { id: "scale",      name: "Scale",      totalCredits: 54545, credits: 50000 };
const ENTERPRISE = { id: "enterprise", name: "Enterprise", totalCredits: null,  credits: null,  isCustom: true };
const DEV_TEST   = { id: "dev_test",   name: "Developer Test", totalCredits: 100, credits: 100, isAdminOnly: true };

const PAID_PLANS = [STARTER, GROWTH, SCALE];
const ALL_PLANS = [TRIAL, STARTER, GROWTH, SCALE, ENTERPRISE];
const ACCOUNT_STATES = ["free", "starter", "growth", "scale", "enterprise"];

const state = (plan, effectivePlan, isTrialUser = false) =>
  getPlanPurchaseState({ plan, effectivePlan, isTrialUser });

describe("M24 — the purchasing invariant", () => {
  it("never removes every purchasing action, in any account state", () => {
    for (const effectivePlan of ACCOUNT_STATES) {
      const purchasable = ALL_PLANS.filter(p => state(p, effectivePlan).canPurchase);
      expect(purchasable.length, `no purchase action for a ${effectivePlan} customer`).toBeGreaterThan(0);
    }
  });

  it("keeps every paid pack purchasable in every account state", () => {
    for (const effectivePlan of ACCOUNT_STATES) {
      for (const plan of PAID_PLANS) {
        expect(
          state(plan, effectivePlan).canPurchase,
          `${plan.id} was not purchasable for a ${effectivePlan} customer`
        ).toBe(true);
      }
    }
  });

  it("never renders the word 'Active' as a plan action", () => {
    for (const effectivePlan of ACCOUNT_STATES) {
      for (const plan of ALL_PLANS) {
        expect(state(plan, effectivePlan).ctaLabel).not.toBe("Active");
      }
    }
  });
});

describe("M24 — buying the plan you already hold", () => {
  it.each([
    ["starter", STARTER],
    ["growth", GROWTH],
    ["scale", SCALE],
  ])("a %s customer can buy the same pack again", (effectivePlan, plan) => {
    const s = state(plan, effectivePlan);
    expect(s.relation).toBe("current");
    expect(s.canPurchase).toBe(true);
    expect(s.isCurrentPlan).toBe(true);
    expect(s.ctaLabel).toBe("Buy Again");
  });

  it("says what buying again actually does, with the real credit total", () => {
    // 16,250 = 15,000 + the 1,250 volume bonus. The note must quote what lands in the
    // balance, not the headline pack size.
    expect(state(GROWTH, "growth").note).toBe("Adds 16,250 credits to your balance.");
  });

  it("marks the held plan with a badge, which is never the button", () => {
    const s = state(SCALE, "scale");
    expect(s.isCurrentPlan).toBe(true); // badge
    expect(s.canPurchase).toBe(true);   // and still buyable
  });
});

describe("M24 — buying a different plan", () => {
  it("calls a higher pack an upgrade", () => {
    const s = state(SCALE, "growth");
    expect(s.relation).toBe("upgrade");
    expect(s.canPurchase).toBe(true);
    expect(s.ctaLabel).toBe("Upgrade to Scale");
  });

  it("keeps a lower pack purchasable and promises the plan will not be lost", () => {
    // upgradePlanIfHigher() is upgrade-only, so a Scale customer buying Starter keeps Scale.
    // The customer cannot know that unless we say it.
    const s = state(STARTER, "scale");
    expect(s.relation).toBe("additional");
    expect(s.canPurchase).toBe(true);
    expect(s.ctaLabel).toBe("Buy Credits");
    expect(s.note).toBe("Adds 3,000 credits. Your Scale plan stays.");
  });

  it("never labels a lower pack a downgrade, because nothing downgrades", () => {
    for (const effectivePlan of ACCOUNT_STATES) {
      for (const plan of PAID_PLANS) {
        expect(state(plan, effectivePlan).ctaLabel).not.toMatch(/downgrade/i);
      }
    }
  });
});

describe("M24 — enterprise", () => {
  it("keeps Contact Sales reachable for an enterprise customer", () => {
    // Regression: the card was isCurrent, therefore disabled, which killed the only action
    // the highest-value customer on the page has.
    const s = state(ENTERPRISE, "enterprise");
    expect(s.canPurchase).toBe(true);
    expect(s.ctaLabel).toBe("Contact Sales");
    expect(s.isCurrentPlan).toBe(true); // still badged as theirs
  });

  it("offers Contact Sales to everyone else too", () => {
    for (const effectivePlan of ["free", "starter", "growth", "scale"]) {
      const s = state(ENTERPRISE, effectivePlan);
      expect(s.canPurchase).toBe(true);
      expect(s.isCurrentPlan).toBe(false);
    }
  });

  it("lets an enterprise customer still buy a standard pack", () => {
    const s = state(GROWTH, "enterprise");
    expect(s.canPurchase).toBe(true);
    expect(s.note).toBe("Adds 16,250 credits. Your Enterprise plan stays.");
  });
});

describe("M24 — the free trial stays one-time", () => {
  it("offers the claim while it is unclaimed", () => {
    const s = state(TRIAL, "free", true);
    expect(s.relation).toBe("claim");
    expect(s.canPurchase).toBe(true);
    expect(s.ctaLabel).toBe("Start Free Trial");
  });

  it("stops offering it once claimed, rather than showing a button that 409s", () => {
    // storage.claimTrialCredits() is an atomic conditional update on is_trial_user and
    // refuses a second claim. The UI used to show an enabled button that could only fail.
    const s = state(TRIAL, "free", false);
    expect(s.relation).toBe("claimed");
    expect(s.canPurchase).toBe(false);
    expect(s.ctaLabel).toBeNull();
    expect(s.note).toBe("Already claimed.");
  });

  it("never offers a free grant to a customer on a paid plan", () => {
    for (const effectivePlan of ["starter", "growth", "scale", "enterprise"]) {
      expect(state(TRIAL, effectivePlan, false).canPurchase).toBe(false);
    }
  });

  it("still leaves a claimed-trial free customer able to buy every paid pack", () => {
    for (const plan of PAID_PLANS) {
      expect(state(plan, "free", false).canPurchase).toBe(true);
    }
    expect(state(STARTER, "free", false).relation).toBe("upgrade");
  });
});

describe("M24 — edge cases", () => {
  it("treats a missing effectivePlan as free rather than throwing", () => {
    const s = state(GROWTH, null);
    expect(s.canPurchase).toBe(true);
    expect(s.relation).toBe("upgrade");
  });

  it("treats an unknown plan id as rank 0 and keeps it purchasable", () => {
    // The admin dev_test pack is not in PLAN_RANK. It must not blow up, and must stay
    // purchasable for the admins who use it to exercise the live Razorpay path.
    const s = state(DEV_TEST, "growth");
    expect(s.canPurchase).toBe(true);
    expect(s.note).toBe("Adds 100 credits. Your Growth plan stays.");
  });

  it("is a pure function of its inputs", () => {
    const args = { plan: GROWTH, effectivePlan: "growth", isTrialUser: false };
    expect(getPlanPurchaseState(args)).toEqual(getPlanPurchaseState(args));
    expect(args.plan).toEqual(GROWTH); // no mutation of inputs
  });
});
