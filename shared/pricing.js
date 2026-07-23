// ─────────────────────────────────────────────────────────────────────────────
// M39 Phase 1 — Pricing Engine (single commercial authority)
//
// This module is the ONE place that turns "what the customer wants to buy" into
// "what we will charge and grant." It builds on the pricing FORMULA that already
// lives in shared/schema.js (CREDIT_TIERS + calculateCreditPurchase) and adds the
// layer the platform was missing: a canonical, validated, currency-aware QUOTE.
//
// Design rules (M39 governance):
//   • Backend decides, frontend displays. The quote produced here is the canonical
//     reference for checkout, payment, and the credit ledger (decision MD-003/D1).
//     Callers must never trust a client-supplied price or bonus.
//   • Currency is abstracted (decision MD-004/D2). INR is the only ACTIVE currency
//     in M39; the shape supports adding currencies later without a redesign.
//   • Enterprise is qualified by business RULES, not a credit ceiling
//     (decision MD-005/D3). A large custom amount is one signal among several.
//   • Custom purchases are first-class: any amount within the self-serve band is
//     purchasable at the same per-tier rate as the named plans (decision MD-007).
// ─────────────────────────────────────────────────────────────────────────────

import {
  CREDIT_TIERS,
  calculateCreditPurchase,
  MIN_CREDIT_PURCHASE,
  PRICING_PLANS,
  DEFAULT_EXCHANGE_RATE,
} from "./schema.js";

// Bumped whenever the tiers, rounding, or bonus formula change. Persisted with a
// quote so a stored purchase can always be reconciled against the rules in force
// when it was made (supports Phase 2 reconciliation / stale-quote detection).
export const PRICING_VERSION = "2026-07-24.1";

// Upper bound of the self-serve slider; above this the purchase must go through
// the enterprise path (this is a self-serve boundary, NOT the definition of an
// enterprise customer — see qualifiesForEnterprise). Matches the top CREDIT_TIER.
export const MAX_SELF_SERVE_CREDITS = CREDIT_TIERS[CREDIT_TIERS.length - 1].max; // 300000

// ── Currency abstraction (D2) ────────────────────────────────────────────────
// All money is represented in MINOR units (paise for INR) to avoid float drift and
// to match Razorpay's API (which takes paise). `active:false` currencies are known
// to the system but cannot be transacted in M39.
export const CURRENCIES = {
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", minorPerMajor: 100, active: true },
  USD: { code: "USD", symbol: "$",      name: "US Dollar",    minorPerMajor: 100, active: false },
};
export const BASE_CURRENCY = "INR";
export const ACTIVE_CURRENCIES = Object.values(CURRENCIES).filter(c => c.active).map(c => c.code);

export function isCurrencySupported(code) {
  return CURRENCIES[code]?.active === true;
}

// Convert a base-currency (INR) MAJOR amount into a target-currency minor amount.
// M39 only transacts in the base currency; the FX branch exists so a future
// currency can be added here alone rather than across the codebase.
export function toMinorUnits(majorAmount, currency = BASE_CURRENCY) {
  const c = CURRENCIES[currency];
  if (!c) throw new Error(`Unknown currency ${currency}`);
  return Math.round(majorAmount * c.minorPerMajor);
}

// ── Enterprise qualification (D3, rule-based) ────────────────────────────────
// Enterprise is a business relationship, not a number. Any one of these signals
// qualifies. Credit volume beyond the self-serve band is included, but it is only
// one signal — seat count, invoicing, procurement, contracts, or compliance needs
// each independently route a customer to the enterprise path. Phase 4 will own the
// full lifecycle; Phase 1 only needs the boundary predicate.
export const ENTERPRISE_SIGNALS = [
  "requiresInvoicing",
  "requiresProcurement",
  "requiresContract",
  "requiresCompliance",
  "requiresDedicatedSupport",
  "requiresSso",
];
export const SELF_SERVE_MAX_SEATS = 25; // matches MAX_TEAM_MEMBERS for non-enterprise plans

export function qualifiesForEnterprise(signals = {}) {
  const { credits = 0, seats = 0 } = signals;
  if (credits > MAX_SELF_SERVE_CREDITS) return true;
  if (seats > SELF_SERVE_MAX_SEATS) return true;
  return ENTERPRISE_SIGNALS.some(k => signals[k] === true);
}

// ── Custom-purchase → plan mapping (MD-007) ──────────────────────────────────
// A custom credit amount grants the plan whose named quantity it meets or exceeds,
// so feature entitlements (templates, campaigns, AI quota, seats) track spend. This
// keeps plan gates coherent for arbitrary purchases without inventing a new tier.
const PAID_PLAN_LADDER = ["starter", "growth", "scale"]; // ascending by credits
export function planForCredits(credits) {
  if (credits > MAX_SELF_SERVE_CREDITS) return "enterprise";
  let planId = "starter";
  for (const id of PAID_PLAN_LADDER) {
    if (credits >= PRICING_PLANS[id].credits) planId = id;
  }
  return planId;
}

// ── Request validation ───────────────────────────────────────────────────────
// Returns { ok:true, credits } for a valid self-serve custom amount, or
// { ok:false, code, message, isEnterprise? } otherwise. Never throws on bad input.
export function validateCustomCredits(rawCredits) {
  const credits = Number(rawCredits);
  if (!Number.isFinite(credits) || !Number.isInteger(credits)) {
    return { ok: false, code: "INVALID_CREDITS", message: "Credit amount must be a whole number." };
  }
  if (credits < MIN_CREDIT_PURCHASE) {
    return { ok: false, code: "BELOW_MIN", message: `Minimum purchase is ${MIN_CREDIT_PURCHASE.toLocaleString()} credits.` };
  }
  if (credits > MAX_SELF_SERVE_CREDITS) {
    return { ok: false, code: "ENTERPRISE_REQUIRED", isEnterprise: true, message: "Amounts above the self-serve maximum are handled by our sales team." };
  }
  return { ok: true, credits };
}

// ── Canonical quote (D1) ─────────────────────────────────────────────────────
// The single output that checkout/payment/ledger consume. Accepts EITHER a named
// planId OR a custom credit amount, and always derives price/bonus from the engine.
//
//   generateQuote({ planId })                 → named-plan quote
//   generateQuote({ credits })                → custom-amount quote
//   generateQuote({ credits: 999999 })        → { isEnterprise: true } (not purchasable self-serve)
//
// Returns a quote object, or { error, code } on invalid input. The `amountMinor`
// field is what a payment gateway must be charged; nothing else is authoritative.
export function generateQuote({ planId, credits, currency = BASE_CURRENCY } = {}) {
  if (!isCurrencySupported(currency)) {
    return { error: `Currency ${currency} is not supported.`, code: "UNSUPPORTED_CURRENCY" };
  }

  // ---- Named plan ----
  if (planId != null) {
    const plan = PRICING_PLANS[planId];
    if (!plan) return { error: "Unknown plan.", code: "UNKNOWN_PLAN" };
    if (plan.isCustom) {
      return { kind: "enterprise", planId, isEnterprise: true, currency, pricingVersion: PRICING_VERSION };
    }
    if (plan.isTrial) {
      return {
        kind: "trial", planId, credits: plan.credits, bonusCredits: 0, totalCredits: plan.totalCredits,
        currency, amountMinor: 0, amountMajor: 0, unitPriceMinor: 0, perCreditMajor: 0,
        isEnterprise: false, isFree: true, pricingVersion: PRICING_VERSION,
      };
    }
    return buildQuote({ kind: "plan", planId, credits: plan.credits, currency });
  }

  // ---- Custom amount ----
  if (credits != null) {
    const v = validateCustomCredits(credits);
    if (!v.ok) {
      if (v.isEnterprise) return { kind: "enterprise", isEnterprise: true, credits: Number(credits), currency, code: v.code, pricingVersion: PRICING_VERSION };
      return { error: v.message, code: v.code };
    }
    return buildQuote({ kind: "custom", planId: planForCredits(v.credits), credits: v.credits, currency });
  }

  return { error: "A planId or a credit amount is required.", code: "EMPTY_REQUEST" };
}

// Shared quote assembly for any priced (non-trial, non-enterprise) purchase.
function buildQuote({ kind, planId, credits, currency }) {
  const q = calculateCreditPurchase(credits); // base-currency (INR) major amounts
  if (!q) return { error: "Credit amount is outside the priced range.", code: "OUT_OF_RANGE" };
  const amountMajor = q.priceINR;
  const amountMinor = toMinorUnits(amountMajor, currency);
  return {
    kind,
    planId,
    credits: q.credits,
    bonusCredits: q.bonusCredits,
    totalCredits: q.totalCredits,
    currency,
    amountMajor,                 // e.g. 1800 (₹)
    amountMinor,                 // e.g. 180000 (paise) — the gateway charge basis
    unitPriceMinor: toMinorUnits(q.perCreditINR, currency), // paise per credit
    perCreditMajor: q.perCreditINR,
    isEnterprise: false,
    isFree: false,
    pricingVersion: PRICING_VERSION,
  };
}
