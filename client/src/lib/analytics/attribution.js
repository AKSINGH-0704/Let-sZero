// M60 — first-party advertising attribution capture.
//
// ADS-001 recorded the blocker plainly: a purchase completed with no browser
// present is never counted, and the fix "needs API credentials and a `gclid`
// column, neither of which exists, and neither was invented". This module is
// the second half of that sentence — the click identifier, captured and kept
// as first-party evidence, so the application can eventually reconcile what
// Google Ads reports against what the business actually recorded.
//
// It does NOT send anything to Google. googleAds.js remains the only module
// that talks to the tag, conversions.js remains the only conversion taxonomy,
// and consent.js remains the only consent authority. This module reads the
// landing URL and remembers it; that is the whole of its job.
//
// ─── Why this is gated on advertising consent ────────────────────────────────
//
// `gclid`, `gbraid` and `wbraid` are Google click identifiers. They are
// advertising identifiers in the ordinary sense of the term, and the platform's
// published privacy policy is written on the basis that no advertising
// identifier is used by a visitor who has not opted in. Persisting one before a
// decision would falsify that statement just as loading the tag would, so the
// same rule applies: nothing is written until advertising consent is granted,
// and everything written is removed when it is withdrawn.
//
// The `utm_*` parameters are campaign labels rather than identifiers, and a
// case could be made for treating them separately. They are deliberately NOT
// treated separately. googleAds.js already states the rule this module obeys:
// a decision made about one purpose cannot be silently reused for a wider one.
// A visitor who refused advertising measurement did not agree to be counted by
// campaign either, and splitting the record into a consented half and an
// unconsented half would give the site two answers to one question.
//
// CONSENT_VERSION is deliberately NOT bumped. The consent surface asks to
// "measure which advertising brings people here", and identifying which
// advertising brought them here is that purpose exactly — not a wider one. No
// existing decision is invalidated, because none of them meant anything else.
//
// ─── What is deliberately not collected ──────────────────────────────────────
//
// There is no anonymous visitor id, no fingerprint, no device signal and no
// third-party SDK. An anonymous identifier would be the one genuinely new
// tracking capability in this change, and it would buy nothing: the record is
// associated with a real account at the one moment the account is proven to
// exist (see useSignupConversion), so an id whose only job is to survive until
// then is an identifier kept for its own sake.
//
// The referrer is not stored either. It is not needed to answer "which ad
// brought this customer", and it can carry a full third-party URL including
// that site's own query string.

import {
  CONSENT_CATEGORIES,
  getConsent,
  onConsentChange,
} from "../consent.js";
import {
  ATTRIBUTION_PARAMS,
  MAX_VALUE_LENGTH,
  sanitizeAttribution,
} from "@shared/attribution";

const STORAGE_KEY = "letszero.attr.v1";
const ATTRIBUTION_VERSION = 1;

// The allowlist and the length cap live in @shared/attribution, so the browser
// cannot capture a field the server would refuse to store, or vice versa.

// Module-level, and deliberately NOT persisted: what this page view arrived
// with, held only for as long as the tab lives. If the visitor never grants
// advertising consent, this is where the record ends — it is dropped when the
// tab closes and never reaches storage.
let pending = null;
let bridged = false;

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function safeRead() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeWrite(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
    return true;
  } catch {
    // Storage blocked (private mode, quota, disabled). Attribution is a
    // reporting nicety; failing to persist it must never affect the visitor's
    // session, so this is swallowed exactly as consent.js swallows its own.
    return false;
  }
}

function safeClear() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

/**
 * Read the allowlisted parameters out of a URL's query string.
 *
 * Returns null when none are present, so "this visitor arrived with no
 * attribution" is a distinguishable state rather than an empty object that
 * later reads as a touch.
 */
export function parseAttributionParams(search) {
  let params;
  try {
    params = new URLSearchParams(search || "");
  } catch {
    return null;
  }

  const found = {};
  for (const key of ATTRIBUTION_PARAMS) {
    const raw = params.get(key);
    if (typeof raw !== "string") continue;

    const value = raw.trim().slice(0, MAX_VALUE_LENGTH);
    if (value) found[key] = value;
  }

  return Object.keys(found).length > 0 ? found : null;
}

/**
 * A touch: what arrived, where it landed, and when.
 *
 * The landing PATH is kept and the query string is not. The path says which
 * page the ad pointed at, which is the part that informs campaign work; the
 * query string is where the parameters an allowlist just excluded would come
 * back in through.
 */
function buildTouch(params, pathname) {
  return {
    ...params,
    landingPath: typeof pathname === "string" ? pathname.slice(0, MAX_VALUE_LENGTH) : "/",
    at: new Date().toISOString(),
  };
}

/**
 * The stored record, or null.
 *
 * Validated on read rather than trusted: the value is in localStorage, which
 * the visitor can edit, and it is about to be sent to the server and written
 * into an audit row. Unknown keys are dropped and every value is re-checked
 * against the same allowlist and length cap that governed the write, so a
 * hand-edited record cannot widen what this build is willing to record.
 */
export function getAttribution() {
  if (!isBrowser()) return null;

  const raw = safeRead();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== ATTRIBUTION_VERSION) return null;

    const clean = sanitizeAttribution(parsed);
    if (!clean) return null;

    return { version: ATTRIBUTION_VERSION, ...clean };
  } catch {
    return null;
  }
}

/**
 * Persist the pending touch, preserving first-touch.
 *
 * FIRST-TOUCH IS NEVER OVERWRITTEN. It is the click that acquired the visitor,
 * and it is the only one that can honestly be called the source of a customer.
 * `last` is updated on every subsequent attributed landing, so a campaign that
 * brought someone back is visible without pretending it was the campaign that
 * found them. Which of the two a report uses is the report's decision to state,
 * not this module's to make by discarding one.
 */
function persistPending() {
  if (!pending) return false;

  const existing = getAttribution();
  const record = {
    version: ATTRIBUTION_VERSION,
    first: existing?.first || pending,
    last: pending,
  };

  return safeWrite(JSON.stringify(record));
}

/**
 * React to a consent decision.
 *
 * Granted — persist whatever this page view arrived with.
 * Not granted — remove the record. This is the WITHDRAWAL path as well as the
 * refusal path, and it is deliberately symmetrical with the advertising-cookie
 * sweep in googleAds.js: a visitor who withdraws consent should not leave a
 * click identifier behind in storage that a later re-grant would resurrect.
 */
function applyConsent(consent) {
  if (consent[CONSENT_CATEGORIES.ADVERTISING] !== true) {
    safeClear();
    return;
  }

  persistPending();
}

/**
 * Capture this page view's attribution and bridge it to the consent authority.
 *
 * Called from the module entry point (main.jsx) alongside initGoogleAds, and
 * for the same reason: it must run before React renders, because a route can
 * replace the URL, and it must not be tied to any component's mount lifecycle.
 *
 * Safe to call repeatedly; only the first call has effect.
 */
export function initAttribution() {
  if (!isBrowser()) return;
  if (bridged) return;
  bridged = true;

  pending = null;
  const params = parseAttributionParams(window.location.search);
  if (params) pending = buildTouch(params, window.location.pathname);

  onConsentChange(applyConsent);
  applyConsent(getConsent());
}

/** Test-only reset of module state. Not reachable from any app path. */
export function __resetAttributionForTests() {
  pending = null;
  bridged = false;
  safeClear();
}
