// M39 Phase 1C — the single plan catalog.
//
// Before Phase 1C, PublicPricing.jsx and Payments.jsx each carried their own
// verbatim copy of the plan list — same names, same feature matrices, the same
// magic prices (390 / 1800 / 5500) typed twice. Two copies drift: they already
// disagreed on a couple of feature-row icons. This is now the ONE source both
// surfaces render from.
//
// Prices/bonuses/totals for paid packs are DERIVED from the shared pricing engine
// (calculateCreditPurchase) rather than re-typed, so the marketing page, the
// in-app page, and the server all quote the same numbers by construction. The
// server remains authoritative for the actual charge (MD-003) — these are the
// display copies, now sourced from the same formula the server uses.

import { calculateCreditPurchase } from "@shared/schema";
import { USD_DISPLAY_RATE } from "./config";

// ── Feature matrix — the per-plan capability grid the cards render. ───────────
// Identical shape for every purchasable/marketed plan; special plans (enterprise,
// dev_test) override or omit as needed below.
const FEATURES = {
  trial: {
    campaigns: "1", templates: "3", scheduling: false, teamMembers: "25",
    auditExport: false, bonusCredits: false, aiPersonalization: true,
    spamAnalysis: true, analytics: true, contactUpload: true, templateBuilder: true,
  },
  starter: {
    campaigns: "5", templates: "10", scheduling: true, teamMembers: "25",
    auditExport: false, bonusCredits: false, aiPersonalization: true,
    spamAnalysis: true, analytics: true, contactUpload: true, templateBuilder: true,
  },
  growth: {
    campaigns: "10", templates: "25", scheduling: true, teamMembers: "25",
    auditExport: false, bonusCredits: "+1,250", aiPersonalization: true,
    spamAnalysis: true, analytics: true, contactUpload: true, templateBuilder: true,
  },
  scale: {
    campaigns: "20", templates: "100", scheduling: true, teamMembers: "25",
    auditExport: true, bonusCredits: "+4,545", aiPersonalization: true,
    spamAnalysis: true, analytics: true, contactUpload: true, templateBuilder: true,
  },
  enterprise: {
    campaigns: "Unlimited", templates: "Unlimited", scheduling: true, teamMembers: "Unlimited",
    auditExport: true, bonusCredits: "Custom", aiPersonalization: true,
    spamAnalysis: true, analytics: true, contactUpload: true, templateBuilder: true,
  },
};

// Build a paid pack from the shared engine so no price is ever typed twice.
function paidPlan({ id, name, credits, isPopular = false }) {
  const q = calculateCreditPurchase(credits);
  if (!q) throw new Error(`planCatalog: ${id} credits ${credits} outside CREDIT_TIERS`);
  return {
    id,
    name,
    credits,
    bonusCredits: q.bonusCredits,
    totalCredits: q.totalCredits,
    priceINR: q.priceINR,
    priceUSD: +(q.priceINR / USD_DISPLAY_RATE).toFixed(2), // display-only
    ...(isPopular ? { isPopular: true } : {}),
    cta: "Get Started",
    features: FEATURES[id],
  };
}

const TRIAL = {
  id: "trial",
  name: "Free Trial",
  credits: 500,
  bonusCredits: 0,
  totalCredits: 500,
  priceINR: 0,
  priceUSD: 0,
  isTrial: true,
  cta: "Start Free Trial",
  features: FEATURES.trial,
};

const ENTERPRISE = {
  id: "enterprise",
  name: "Enterprise",
  credits: null,
  bonusCredits: null,
  totalCredits: null,
  priceINR: null,
  priceUSD: null,
  isCustom: true,
  cta: "Contact Sales",
  // Only consumed by the marketing card's custom branch; the in-app card ignores it.
  ctaHref: "/contact?reason=SALES",
  features: FEATURES.enterprise,
};

// Admin-only probe of the full Razorpay flow at minimal cost. In the catalog so
// the in-app page resolves it by id; filtered out of every customer-facing list.
const DEV_TEST = {
  id: "dev_test",
  name: "Developer Test",
  credits: 100,
  bonusCredits: 0,
  totalCredits: 100,
  priceINR: 11,
  priceUSD: null,
  isAdminOnly: true,
  cta: "Test Payment",
  features: {},
};

// Full catalog — the in-app payments page uses this (it needs dev_test and filters
// isAdminOnly for the public grid itself).
export const PLAN_CATALOG = [
  TRIAL,
  paidPlan({ id: "starter", name: "Starter", credits: 3000 }),
  paidPlan({ id: "growth", name: "Growth", credits: 15000, isPopular: true }),
  paidPlan({ id: "scale", name: "Scale", credits: 50000 }),
  ENTERPRISE,
  DEV_TEST,
];

// Customer-facing plans only — the marketing pricing page renders exactly these five.
export const MARKETING_PLANS = PLAN_CATALOG.filter((p) => !p.isAdminOnly);

/** Look up a plan by id across the full catalog (incl. admin-only). */
export function getPlanById(id) {
  return PLAN_CATALOG.find((p) => p.id === id) || null;
}
