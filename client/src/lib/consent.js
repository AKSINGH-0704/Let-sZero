// M59 — the consent authority.
//
// ONE source of truth for whether this visitor has agreed to non-essential
// storage. Every measurement decision in the app reads it from here; nothing
// keeps its own copy, and nothing may infer consent from the presence of a
// cookie, a tag, or a previous page view.
//
// Before M59 the platform had no consent mechanism of any kind — no banner, no
// stored state, no categories. That was correct while the only cookie was the
// authenticated session, which is strictly necessary and therefore ungated.
// It stops being correct the moment advertising storage exists, which is what
// the Google Ads tag introduces.
//
// Scope note, deliberately narrow: this module records and reports a visitor's
// decision. It does not decide what the law requires of that decision — legal
// basis, jurisdiction and retention are business/legal determinations and are
// NOT encoded here. See the private engineering record for the standing
// blocker on privacy-policy wording.

/**
 * Non-essential categories a visitor can accept or refuse.
 *
 * ESSENTIAL is deliberately absent: the session cookie that keeps a customer
 * signed in is strictly necessary to deliver a service they asked for, it is
 * never used for measurement, and offering to "refuse" it would be a false
 * choice — refusing it just breaks sign-in. Only categories that can genuinely
 * be declined appear here.
 */
export const CONSENT_CATEGORIES = {
  ANALYTICS: "analytics",
  ADVERTISING: "advertising",
};

const STORAGE_KEY = "letszero.consent.v1";

// Bumped only when the MEANING of a stored decision changes (a new category, a
// changed purpose). A bump invalidates prior decisions and re-asks, because a
// decision made about a narrower set of purposes cannot be silently reused for
// a wider one.
const CONSENT_VERSION = 1;

/**
 * The state before any decision, and the state after any failure.
 *
 * Everything denied. A visitor who has not answered has not agreed, and an
 * unreadable or corrupt record is treated as "not answered" rather than
 * salvaged — the only safe direction to fail is closed.
 */
export const DENIED_ALL = Object.freeze({
  [CONSENT_CATEGORIES.ANALYTICS]: false,
  [CONSENT_CATEGORIES.ADVERTISING]: false,
});

const listeners = new Set();

/** Storage can throw (Safari private mode, disabled cookies, quota). */
function safeReadStorage() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeWriteStorage(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
    return true;
  } catch {
    // A visitor who blocks storage cannot have a decision persisted. That is
    // not an error to report — it means we ask again next time, which is the
    // conservative outcome.
    return false;
  }
}

/**
 * The visitor's stored decision, or null if they have not made one.
 *
 * Returns null — not a denied record — when undecided, because "refused" and
 * "not yet asked" are different states: the first must be honoured silently,
 * the second must surface the banner.
 */
export function getStoredConsent() {
  if (typeof window === "undefined") return null;

  const raw = safeReadStorage();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== CONSENT_VERSION) return null;
    if (typeof parsed.categories !== "object" || parsed.categories === null) return null;

    // Read each category explicitly rather than spreading what was stored, so a
    // hand-edited or stale record cannot introduce a category this build does
    // not know about, and every value is coerced to a real boolean.
    return {
      version: parsed.version,
      decidedAt: typeof parsed.decidedAt === "string" ? parsed.decidedAt : null,
      categories: {
        [CONSENT_CATEGORIES.ANALYTICS]: parsed.categories[CONSENT_CATEGORIES.ANALYTICS] === true,
        [CONSENT_CATEGORIES.ADVERTISING]: parsed.categories[CONSENT_CATEGORIES.ADVERTISING] === true,
      },
    };
  } catch {
    return null;
  }
}

/** True when the visitor has never answered — the only case that shows the banner. */
export function needsConsentDecision() {
  return getStoredConsent() === null;
}

/**
 * Current effective consent. Always a complete category map, never null, so
 * callers cannot accidentally treat "undecided" as permissive.
 */
export function getConsent() {
  const stored = getStoredConsent();
  return stored ? stored.categories : { ...DENIED_ALL };
}

/** Convenience read for one category. */
export function hasConsent(category) {
  return getConsent()[category] === true;
}

/**
 * Record a decision and notify subscribers.
 *
 * Accepts only the categories this build knows about, coerced to booleans — a
 * caller cannot grant something undeclared, and cannot store a truthy string
 * that would later read as consent.
 */
export function setConsent(categories) {
  const next = {
    [CONSENT_CATEGORIES.ANALYTICS]: categories?.[CONSENT_CATEGORIES.ANALYTICS] === true,
    [CONSENT_CATEGORIES.ADVERTISING]: categories?.[CONSENT_CATEGORIES.ADVERTISING] === true,
  };

  if (typeof window !== "undefined") {
    safeWriteStorage(JSON.stringify({
      version: CONSENT_VERSION,
      decidedAt: new Date().toISOString(),
      categories: next,
    }));
  }

  // Notified even when persistence failed: the decision governs THIS page view
  // regardless of whether it survives to the next one.
  notify(next);

  return next;
}

function notify(next) {
  for (const listener of listeners) {
    try {
      listener(next);
    } catch {
      // One bad subscriber must not prevent the others from learning the
      // decision — particularly the tag loader, which enforces it.
    }
  }
}

// ─── Cross-tab coherence ─────────────────────────────────────────────────────
//
// A visitor with two tabs open who withdraws consent in one has withdrawn it,
// not withdrawn it here. Without this, the other tab kept a live Google tag that
// had never been told: `fireConversion` re-reads storage on every call so no
// conversion could fire, but gtag itself still held ad_storage=granted and went
// on setting and reading advertising cookies until that tab happened to reload.
// Measured in a real two-tab browser run before this existed.
//
// The `storage` event fires only in OTHER tabs of the same origin, which is
// exactly the audience that needs telling. Listeners are notified through the
// same path a local decision uses, so every subscriber — present and future —
// stays coherent without knowing tabs exist.
//
// Installed at module scope and guarded for SSR: script/prerender.js evaluates
// this module under Node, where there is no window.
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("storage", (event) => {
    // key === null means the whole store was cleared, which changes consent too.
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    notify(getConsent());
  });
}

// There is deliberately no `acceptAll()`.
//
// A blanket grant would set categories the visitor was never asked about. The
// consent surface asks about advertising and nothing else, because advertising
// measurement is the only purpose this platform currently performs — so the
// surface grants advertising and nothing else, by calling setConsent directly
// with what it actually asked.
//
// ANALYTICS remains modelled here because Consent Mode v2 requires
// `analytics_storage` to be declared on every request, and it is: as "denied",
// permanently, because no analytics consumer exists (no GA4 property, nothing
// reads the signal — see ADS-004). Nothing in the application grants it. If an
// analytics product is ever added, that is a NEW purpose: it needs its own
// question on the surface and a CONSENT_VERSION bump, because a decision made
// about advertising cannot be silently reused for analytics.

/** Refuse every non-essential category. */
export function rejectAll() {
  return setConsent({ ...DENIED_ALL });
}

/**
 * Subscribe to decisions. Returns an unsubscribe function.
 *
 * Deliberately not a React context: the tag loader is initialised from the
 * module entry point, outside any component tree, and must not depend on a
 * provider being mounted.
 */
export function onConsentChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test-only reset. Not exported through any app path. */
export function __resetConsentForTests() {
  listeners.clear();
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
