// M39 Phase 1B — purchase-intent lifecycle.
//
// A customer's configured purchase (a named plan or a custom credit amount) must
// survive login, signup, refresh, payment retries, and ordinary navigation — the
// M39 principle that purchase intent is never lost. Intent is persisted in
// sessionStorage (survives the auth redirect and reloads within the tab/session)
// and resumed at the canonical checkout entry.
//
// This module is pure and framework-free so it is unit-testable without a DOM render.
//
// M39 Phase 1C — the storage key, lifetime, and post-login fallback path now come
// from the shared commerce config; lifecycle transitions emit commerce events.

import {
  PURCHASE_INTENT_KEY as KEY,
  PURCHASE_INTENT_TTL_MS as TTL_MS,
  DEFAULT_POST_LOGIN_PATH,
  RESUME_CHECKOUT_PATH,
} from "./config";
import { emitCommerceEvent, CommerceEvents } from "./events";

function storage() {
  // sessionStorage may be unavailable (SSR/prerender, privacy mode). Fail soft.
  try { return typeof window !== "undefined" ? window.sessionStorage : null; }
  catch { return null; }
}

/**
 * Persist a purchase intent. Shape: { credits } for custom, or { planId } for a
 * named plan. Extra display fields (e.g. label) are preserved but never trusted.
 */
export function savePurchaseIntent(intent) {
  const s = storage();
  if (!s || !intent) return null;
  const record = { ...intent, savedAt: Date.now() };
  try {
    s.setItem(KEY, JSON.stringify(record));
    emitCommerceEvent(CommerceEvents.INTENT_SAVED, { intent: record });
    return record;
  } catch { return null; }
}

/** Load a non-expired purchase intent, or null. Expired intents are cleared. */
export function loadPurchaseIntent() {
  const s = storage();
  if (!s) return null;
  let rec;
  try { rec = JSON.parse(s.getItem(KEY)); } catch { return null; }
  if (!rec || typeof rec.savedAt !== "number") return null;
  if (Date.now() - rec.savedAt > TTL_MS) { clearPurchaseIntent(); return null; }
  return rec;
}

export function clearPurchaseIntent() {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(KEY);
    emitCommerceEvent(CommerceEvents.INTENT_CLEARED, {});
  } catch { /* ignore */ }
}

/**
 * Normalise an intent into params for the canonical initiatePurchase(). A custom
 * amount wins only when there is no planId, mirroring the server's resolution order.
 */
export function intentToCheckoutParams(intent) {
  if (!intent) return null;
  if (intent.credits != null && intent.planId == null) return { credits: intent.credits };
  if (intent.planId != null) return { planId: intent.planId };
  return null;
}

/**
 * Open-redirect guard for a post-login "next" destination. The login flow must only
 * ever send a user to a LOCAL in-app path; anything that could leave the origin
 * (absolute URL, protocol-relative //host, backslash tricks, embedded scheme) is
 * rejected in favour of the fallback. Security-critical — unit-tested.
 */
export function safeNextPath(next, fallback = DEFAULT_POST_LOGIN_PATH) {
  if (typeof next !== "string" || next.length === 0) return fallback;
  if (!next.startsWith("/")) return fallback;      // must be root-relative
  if (next.startsWith("//")) return fallback;      // protocol-relative → off-origin
  if (next.includes("\\")) return fallback;        // backslash normalisation tricks
  if (/[\x00-\x1f]/.test(next)) return fallback;   // control chars
  if (/^\/+[a-z][a-z0-9+.-]*:/i.test(next)) return fallback; // embedded scheme
  // Allow-list the internal roots a purchase flow may return to.
  if (!/^\/(app|pricing|contact)(\/|\?|#|$)/.test(next)) return fallback;
  return next;
}

/** Build a login URL that returns to the resume destination after authentication. */
export function buildLoginWithResume(resumePath = RESUME_CHECKOUT_PATH) {
  return `/login?next=${encodeURIComponent(resumePath)}`;
}
