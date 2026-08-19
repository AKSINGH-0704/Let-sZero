// M59 — the conversion taxonomy.
//
// A small, deliberate set of business outcomes. NOT a click tracker: a UI
// interaction is only a conversion when the business result it claims has
// actually occurred and been confirmed by the authority that owns it.
//
// ─── The taxonomy ────────────────────────────────────────────────────────────
//
//   purchase        PRIMARY   — a payment the server has transitioned to
//                               SUCCESS. Carries a real value.
//   sign_up         PRIMARY   — an account that actually now exists.
//   qualified_lead  SECONDARY — an early-access/waitlist submission the server
//                               accepted. Funnel diagnostic, no value.
//
// Three, not thirty. Every additional conversion action dilutes the bidding
// signal, and Google optimises towards whatever it is told is a conversion —
// so telling it that a button click is an outcome actively degrades the
// account. Pricing-page visits, checkout opens and modal impressions are
// deliberately absent: each of them can happen without any business result.
//
// ─── Duplicate suppression ───────────────────────────────────────────────────
//
// Google deduplicates purchases on transaction_id, but relying on that alone
// would put correctness in a third party's hands. Every conversion here is
// additionally gated locally on a durable key, so a reload, an SPA navigation,
// a back/forward restore, a re-render, a StrictMode double-effect or a retried
// mutation cannot produce a second hit for one business event.
//
// ─── PII ─────────────────────────────────────────────────────────────────────
//
// Nothing identifying is ever passed: no email, no name, no username, no
// workspace or tenant id, no campaign or contact data, no payment instrument.
// The only identifier transmitted is the payment's own random UUID, as
// transaction_id, which is what makes deduplication possible and carries no
// tenant meaning. Pinned by test.

import { fireConversion } from "./googleAds.js";

const FIRED_KEY = "letszero.conv.fired.v1";

// Bounded so a long-lived browser cannot grow the record without limit. Keys
// are dropped oldest-first; re-firing a conversion from months ago is not a
// realistic path, and the alternative — unbounded growth in localStorage — is.
const MAX_REMEMBERED = 50;

function readFired() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FIRED_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((k) => typeof k === "string") : [];
  } catch {
    return [];
  }
}

function markFired(key) {
  try {
    const next = readFired().filter((k) => k !== key);
    next.push(key);
    window.localStorage.setItem(
      FIRED_KEY,
      JSON.stringify(next.slice(-MAX_REMEMBERED)),
    );
  } catch {
    // Storage unavailable. The conversion still fires; only the guarantee
    // against a duplicate on reload is lost, which is the correct trade —
    // silently dropping a real business outcome would be worse.
  }
}

function hasFired(key) {
  return readFired().includes(key);
}

/**
 * Fire once, ever, for a given business key.
 *
 * The key is marked BEFORE the send. If firing throws, the conversion is still
 * considered spent: a lost conversion is a reporting gap, whereas a retry loop
 * that double-counts corrupts the value the operator bids on.
 */
function fireOnce(key, conversionKey, params) {
  if (typeof window === "undefined") return false;
  if (hasFired(key)) return false;

  markFired(key);
  return fireConversion(conversionKey, params);
}

/**
 * PRIMARY — a completed purchase.
 *
 * `payment` MUST be the server's own payment record as returned by
 * /api/payments/razorpay/verify, never a client-side reconstruction of what was
 * bought. The amount is read from it and is never recomputed from a price shown
 * in the UI: the charge is the server's to state (ADR-020), and a tracking
 * layer that derives its own figure becomes a second pricing authority.
 *
 * Refuses anything not actually SUCCESS, so an optimistic or pending record can
 * never be reported as revenue.
 */
export function trackPurchase(payment) {
  if (!payment || payment.status !== "SUCCESS" || !payment.id) return false;

  // The established derivation (routes.js): amountMinor is authoritative and
  // exact; amountInr is the legacy integer column used by pre-seat rows.
  const minor = payment.amountMinor ?? (payment.amountInr ?? 0) * 100;
  if (minor <= 0) return false;

  return fireOnce(`purchase:${payment.id}`, "purchase", {
    value: minor / 100,
    // Every charge on this platform is taken in INR — the Razorpay orders are
    // built with currency "INR" without exception. Hardcoding the label the
    // gateway is actually given is correct; reading payment.currency would be
    // wrong, since that column defaults to "USD" and describes display
    // currency, not the money moved.
    currency: "INR",
    transaction_id: payment.id,
  });
}

/**
 * PRIMARY — an account that now exists.
 *
 * Fired only where account creation is a fact the server has already
 * committed. Deliberately NOT fired when "Continue with Google" is clicked:
 * that is an intent, and it is followed by consent screens, cancellations and
 * failures that must not be counted as customers.
 *
 * `marker` is a caller-supplied one-shot token (see useSignupConversion). It
 * exists so this function never has to read the authenticated user to identify
 * the account — tracking stays independent of tenant state.
 */
export function trackSignUp(marker) {
  if (!marker) return false;
  return fireOnce(`sign_up:${marker}`, "sign_up", {});
}

/**
 * SECONDARY — an accepted early-access submission.
 *
 * A funnel diagnostic, not a business outcome, and carries no value: a waitlist
 * entry is not revenue and must not be bid on as though it were. Keyed on the
 * server-assigned entry id so a resubmission cannot double-count.
 */
export function trackQualifiedLead(entryId) {
  if (!entryId) return false;
  return fireOnce(`qualified_lead:${entryId}`, "qualified_lead", {});
}

/** Test-only reset. Not reachable from any app path. */
export function __resetConversionsForTests() {
  try {
    window.localStorage.removeItem(FIRED_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
