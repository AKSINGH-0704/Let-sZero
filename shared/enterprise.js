// M39 Phase 4 — the single enterprise-commerce architecture.
//
// Enterprise is a distinct customer type and business workflow, not "large
// self-service." It REUSES the commerce spine — pricing (`qualifiesForEnterprise`,
// MD-005), auth, checkout, and the credit/plan system — and never duplicates it.
// This module is the one place that defines:
//   1. the canonical enterprise entry point (so every "Contact Sales" converges),
//   2. an explainable, rule-based qualification wrapper over the pricing engine,
//   3. a deterministic enterprise lifecycle state machine (auditable transitions),
//   4. the centralized enterprise feature-flag set.
//
// Before Phase 4 the entry points diverged: the pricing surfaces linked to
// `/contact?reason=SALES` (which the contact form did not prefill) while the
// payments page linked to `/contact?reason=enterprise`, which the form mapped to
// `ENTERPRISE_PRICING` — a value in neither the reason enum nor the dropdown, so
// that submission broke. This module makes all of them use one valid path.
//
// Pure and framework-free (SSR/prerender-safe, unit-testable). It imports the
// enterprise thresholds/signals from the pricing engine so qualification has a
// single source of truth.

import {
  qualifiesForEnterprise,
  ENTERPRISE_SIGNALS,
  MAX_SELF_SERVE_CREDITS,
  SELF_SERVE_MAX_SEATS,
} from "./pricing.js";

// ── Canonical entry point ─────────────────────────────────────────────────────
// `reason` is a real CONTACT_REASONS value (SALES); `intent=enterprise` carries the
// enterprise context the contact form uses to prefill the message. One path, valid
// everywhere.
export const ENTERPRISE_CONTACT_REASON = "SALES";

/**
 * Build the one canonical "Contact Sales — enterprise" path. Every enterprise CTA
 * on every surface routes through this so entry points converge and stay valid.
 * @param {{ plan?: string, credits?: number, seats?: number }} [ctx]
 */
export function buildEnterpriseContactPath(ctx = {}) {
  const params = new URLSearchParams({ reason: ENTERPRISE_CONTACT_REASON, intent: "enterprise" });
  if (ctx.plan) params.set("plan", ctx.plan);
  if (ctx.credits != null) params.set("credits", String(ctx.credits));
  if (ctx.seats != null) params.set("seats", String(ctx.seats));
  return `/contact?${params.toString()}`;
}

/** The no-argument canonical enterprise path (most CTAs). */
export const ENTERPRISE_CONTACT_PATH = buildEnterpriseContactPath();

// ── Qualification (explainable wrapper over the pricing-engine rule) ───────────
/**
 * Rule-based, flexible qualification (MD-005): NOT a single numeric limit. Returns
 * both the boolean and the list of signals that triggered it, so a sales surface
 * can say WHY. Consistent with `qualifiesForEnterprise` by construction (same
 * thresholds/signals, imported — asserted in the tests).
 * @param {object} signals { credits, seats, requires* booleans }
 * @returns {{ qualified: boolean, reasons: string[] }}
 */
export function qualifyEnterprise(signals = {}) {
  const reasons = [];
  const { credits = 0, seats = 0 } = signals;
  if (credits > MAX_SELF_SERVE_CREDITS) reasons.push("credits_above_self_serve_max");
  if (seats > SELF_SERVE_MAX_SEATS) reasons.push("seats_above_self_serve_max");
  for (const k of ENTERPRISE_SIGNALS) if (signals[k] === true) reasons.push(k);
  return { qualified: reasons.length > 0, reasons };
}

// Re-export so callers have one import site for "is this enterprise?".
export { qualifiesForEnterprise };

// ── Deterministic enterprise lifecycle ────────────────────────────────────────
// A deal moves strictly along these edges. Mirrors the discipline of
// shared/paymentStateMachine.js: one transition table, auditable, unit-testable.
export const ENTERPRISE_STAGES = Object.freeze({
  LEAD: "LEAD",             // captured (a qualified contact submission)
  QUALIFIED: "QUALIFIED",   // meets the qualification rule / sales-accepted
  ENGAGED: "ENGAGED",       // in active sales conversation (discovery)
  PROPOSAL: "PROPOSAL",     // quote/proposal issued
  CONTRACT: "CONTRACT",     // agreed; contract/PO in progress
  PROVISIONED: "PROVISIONED", // won — workspace provisioned (terminal)
  LOST: "LOST",             // terminal
  REJECTED: "REJECTED",     // terminal (not a fit / disqualified)
  PAUSED: "PAUSED",         // temporarily on hold (re-engageable)
});

export const ENTERPRISE_TRANSITIONS = Object.freeze({
  [ENTERPRISE_STAGES.LEAD]: [ENTERPRISE_STAGES.QUALIFIED, ENTERPRISE_STAGES.REJECTED, ENTERPRISE_STAGES.LOST],
  [ENTERPRISE_STAGES.QUALIFIED]: [ENTERPRISE_STAGES.ENGAGED, ENTERPRISE_STAGES.PAUSED, ENTERPRISE_STAGES.LOST, ENTERPRISE_STAGES.REJECTED],
  [ENTERPRISE_STAGES.ENGAGED]: [ENTERPRISE_STAGES.PROPOSAL, ENTERPRISE_STAGES.PAUSED, ENTERPRISE_STAGES.LOST],
  [ENTERPRISE_STAGES.PROPOSAL]: [ENTERPRISE_STAGES.CONTRACT, ENTERPRISE_STAGES.ENGAGED, ENTERPRISE_STAGES.PAUSED, ENTERPRISE_STAGES.LOST],
  [ENTERPRISE_STAGES.CONTRACT]: [ENTERPRISE_STAGES.PROVISIONED, ENTERPRISE_STAGES.PAUSED, ENTERPRISE_STAGES.LOST],
  [ENTERPRISE_STAGES.PROVISIONED]: [],
  [ENTERPRISE_STAGES.LOST]: [],
  [ENTERPRISE_STAGES.REJECTED]: [],
  [ENTERPRISE_STAGES.PAUSED]: [ENTERPRISE_STAGES.ENGAGED, ENTERPRISE_STAGES.LOST],
});

export const ENTERPRISE_TERMINAL_STAGES = Object.freeze([
  ENTERPRISE_STAGES.PROVISIONED,
  ENTERPRISE_STAGES.LOST,
  ENTERPRISE_STAGES.REJECTED,
]);

export function isEnterpriseStageTerminal(stage) {
  return ENTERPRISE_TERMINAL_STAGES.includes(stage);
}

/** True if a deal may move from `from` to `to`. Same-stage is not a transition. */
export function canEnterpriseStageTransition(from, to) {
  const allowed = ENTERPRISE_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/** Throw on an illegal stage transition; return true otherwise. */
export function assertEnterpriseStageTransition(from, to) {
  if (!canEnterpriseStageTransition(from, to)) {
    throw new Error(`Illegal enterprise stage transition: ${from} → ${to}`);
  }
  return true;
}

// ── Centralized enterprise feature flags ──────────────────────────────────────
// The capabilities an enterprise workspace unlocks, defined in ONE place so they
// are not re-derived ad hoc across surfaces. (Distinct from the plan catalog's
// display feature matrix — these are capability switches.)
export const ENTERPRISE_FEATURES = Object.freeze({
  unlimitedSeats: true,
  customCreditVolume: true,
  invoicing: true,
  procurement: true,
  customContract: true,
  dedicatedSupport: true,
  prioritySupport: true,
  sso: false, // roadmap ("SSO / SAML (Soon)" on the pricing page) — flagged, not yet enabled
});

/** Whether a given enterprise capability is enabled. */
export function hasEnterpriseFeature(name) {
  return ENTERPRISE_FEATURES[name] === true;
}
