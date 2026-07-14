/**
 * PLAN PURCHASE STATE — the single rule for what a customer can buy, and what to call it.
 *
 * RepMail sells one-time credit packs, not subscriptions. A "plan" is simply the highest
 * pack a workspace has ever bought (server/fulfillPayment.js — upgradePlanIfHigher), and it
 * can never be lost or downgraded. Holding a plan therefore never blocks a purchase: buying
 * the same pack again just buys the same credits again, which is what the product is for.
 *
 * Every surface that renders a plan action derives it from here so the rule cannot drift.
 */

// Mirrors PLAN_RANK in server/fulfillPayment.js. `effectivePlan` values come from the
// server (free | starter | growth | scale | enterprise); plan card ids use "trial" where
// the server says "free", so the two vocabularies are reconciled here rather than compared
// directly (a raw `plan.id === effectivePlan` never matches for the trial card).
const PLAN_RANK = { free: 0, starter: 1, growth: 2, scale: 3, enterprise: 4 };

const PLAN_DISPLAY_NAME = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
  enterprise: "Enterprise",
};

function fmt(n) {
  return n == null ? "" : n.toLocaleString("en-IN");
}

/**
 * @param {object}  plan           a PLANS entry (id, name, totalCredits, isTrial, isCustom, isAdminOnly)
 * @param {string}  effectivePlan  user.effectivePlan — free | starter | growth | scale | enterprise
 * @param {boolean} isTrialUser    user.isTrialUser — true while the one-time free grant is unclaimed
 *
 * @returns {{
 *   relation: "upgrade"|"current"|"additional"|"claim"|"claimed"|"contact",
 *   isCurrentPlan: boolean,   // drives the badge only — never the button
 *   canPurchase: boolean,     // drives the button
 *   ctaLabel: string|null,
 *   note: string|null,        // what this purchase actually does to the account
 * }}
 */
export function getPlanPurchaseState({ plan, effectivePlan, isTrialUser }) {
  const currentPlan = effectivePlan || "free";
  const currentRank = PLAN_RANK[currentPlan] ?? 0;
  const currentName = PLAN_DISPLAY_NAME[currentPlan] || "current";

  // Enterprise is a conversation, not a checkout. It stays reachable in every state,
  // including for customers who are already on Enterprise and want to expand.
  if (plan.isCustom) {
    return {
      relation: "contact",
      isCurrentPlan: currentPlan === "enterprise",
      canPurchase: true,
      ctaLabel: "Contact Sales",
      note: null,
    };
  }

  // The free trial is a one-time grant, not a purchase. storage.claimTrialCredits() is an
  // atomic conditional update and returns 409 on a second attempt, so once it is claimed
  // the honest thing to render is an inert card, not a button that always fails.
  if (plan.isTrial) {
    return isTrialUser
      ? {
          relation: "claim",
          isCurrentPlan: false,
          canPurchase: true,
          ctaLabel: "Start Free Trial",
          note: null,
        }
      : {
          relation: "claimed",
          isCurrentPlan: false,
          canPurchase: false,
          ctaLabel: null,
          note: "Already claimed.",
        };
  }

  const planRank = PLAN_RANK[plan.id] ?? 0;
  const credits = fmt(plan.totalCredits);

  if (planRank > currentRank) {
    return {
      relation: "upgrade",
      isCurrentPlan: false,
      canPurchase: true,
      ctaLabel: `Upgrade to ${plan.name}`,
      note: `Adds ${credits} credits and unlocks ${plan.name} limits.`,
    };
  }

  if (planRank === currentRank) {
    return {
      relation: "current",
      isCurrentPlan: true,
      canPurchase: true,
      ctaLabel: "Buy Again",
      note: `Adds ${credits} credits to your balance.`,
    };
  }

  // Below the customer's tier. This is a legitimate, common purchase (a small top-up before
  // a campaign) and it does NOT cost them their plan — upgradePlanIfHigher only ever raises
  // the tier. Customers reasonably fear the opposite, so the card says so outright.
  return {
    relation: "additional",
    isCurrentPlan: false,
    canPurchase: true,
    ctaLabel: "Buy Credits",
    note: `Adds ${credits} credits. Your ${currentName} plan stays.`,
  };
}
