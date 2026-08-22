// M59 — the Google Ads measurement authority.
//
// This is the ONLY place the Google tag is configured or loaded. No page, no
// component and no route pastes a tag of its own; if a second one ever appears,
// this comment is the evidence that it is a duplicate rather than a peer.
//
// ─── Why the operator's supplied snippet is not used verbatim ────────────────
//
// Google supplies the tag as an inline <script> block. This application serves
// a deliberately narrow CSP (server/index.js) whose script-src is
// ['self', checkout.razorpay.com] with NO 'unsafe-inline' — the comment there
// records that inline scripts stay blocked so user-controlled HTML in template
// previews cannot execute, and M34 narrowed the policy further on purpose.
// Pasting the snippet would have it silently blocked in production while
// appearing correct in review.
//
// So the snippet's behaviour is reproduced exactly, from a bundled module:
// the same dataLayer, the same `gtag` shape pushing the real `arguments`
// object, the same 'js' and 'config' calls, and the same remote tag URL —
// injected as an external <script> rather than executed inline. The only CSP
// change required is adding googletagmanager.com to script-src. 'unsafe-inline'
// is NOT added, and the policy is not otherwise widened.
//
// ─── Consent Mode: Basic, deliberately ───────────────────────────────────────
//
// Two modes were available and the choice is not arbitrary:
//
//   Advanced — the tag loads for everyone and sends cookieless pings when
//              consent is denied. Better modelling, but it means a Google
//              network request happens for visitors who refused.
//   Basic    — the tag is not loaded at all until consent is granted. No
//              request, no cookie, no identifier for anyone who has not opted
//              in.
//
// BASIC is implemented. The platform's published privacy policies currently
// state that no advertising cookies or advertising identifiers are used. Under
// Basic mode that statement remains TRUE for every visitor who does not opt in,
// which is the strictest posture available and the smallest possible change to
// the site's observable behaviour. It also costs a non-consenting visitor zero
// bytes. (It does NOT make the statement true for a visitor who DOES opt in —
// that contradiction is a release blocker tracked in the private engineering
// record, not something this module can resolve.)
//
// Consent defaults are still declared denied before any load, so that if this
// is ever switched to Advanced the default posture does not silently invert.

import {
  CONSENT_CATEGORIES,
  getConsent,
  onConsentChange,
} from "../consent.js";

// The operator-supplied Google Ads tag ID. Single source of truth — every
// reference in the app resolves here.
export const GOOGLE_ADS_TAG_ID = "AW-18330551128";

const GTAG_SRC = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_TAG_ID}`;

/**
 * Conversion labels.
 *
 * Google generates the `AW-XXXXXXX/LABEL` send_to value when a conversion
 * action is created in the Ads UI. Those actions do not exist yet, so there are
 * no labels to hardcode and NONE ARE INVENTED. Each is supplied at build time
 * once the operator creates the action; until then the label is null and the
 * corresponding conversion is a documented no-op rather than a fabricated hit.
 *
 * Read through import.meta.env so the values are build-time constants — there
 * is no runtime fetch and no server round-trip for a tag identifier.
 */
export const CONVERSION_LABELS = {
  purchase: import.meta.env.VITE_GADS_LABEL_PURCHASE || null,
  sign_up: import.meta.env.VITE_GADS_LABEL_SIGN_UP || null,
  qualified_lead: import.meta.env.VITE_GADS_LABEL_QUALIFIED_LEAD || null,
};

// Module-level, not window-level: a second copy of this module would mean a
// second bundle, which is a build defect rather than a runtime one.
let tagRequested = false;
let consentBridged = false;

/** SSR/prerender guard. script/prerender.js runs this graph under Node. */
function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/**
 * Whether measurement may run at all in this build.
 *
 * Dev and test builds are excluded so local work and CI can never contribute
 * hits to the live Ads account — conversion data that includes developer
 * traffic is worse than no conversion data, because it is trusted.
 */
export function isMeasurementEnabled() {
  return isBrowser() && import.meta.env.PROD === true;
}

/**
 * Ensure window.dataLayer and window.gtag exist WITHOUT replacing them.
 *
 * `dataLayer` is assigned with `||` so an existing array is adopted rather than
 * overwritten — overwriting would discard anything already queued. `gtag`
 * pushes the real `arguments` object exactly as Google's snippet does; the tag
 * relies on that shape, and spreading it into an array breaks consent and
 * config calls in ways that fail silently.
 */
function ensureDataLayer() {
  window.dataLayer = window.dataLayer || [];

  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }

  return window.gtag;
}

/**
 * Map internal categories onto Google's four Consent Mode v2 signals.
 *
 * Three of the four are derived; `ad_personalization` is pinned denied, and
 * that asymmetry is the point.
 *
 *   ad_storage         — the conversion cookie. Measurement cannot work
 *                        without it, and it is what the visitor is asked for.
 *   ad_user_data       — permission to send Google data for advertising
 *                        purposes. We do send a conversion event, so claiming
 *                        otherwise while sending one would be the dishonest
 *                        direction.
 *   analytics_storage  — permanently denied. No analytics consumer exists
 *                        (ADS-004); nothing would read the signal.
 *   ad_personalization — permanently denied. THIS IS NOT MEASUREMENT.
 *
 * ad_personalization governs use of the data for personalized advertising and
 * remarketing audiences. Both consent surfaces ask for one thing and name it
 * exactly: "measure which advertising brings people here". Deriving
 * personalization from that answer would grant a purpose the visitor was never
 * asked about — the same defect Audit 224 fixed in the opposite direction, when
 * the banner solicited consent for analytics that never happened.
 *
 * This module already states the rule for the analytics case: a new purpose
 * needs its own question on the surface and a CONSENT_VERSION bump, because a
 * decision made about one purpose cannot be silently reused for a wider one.
 * Personalization is a wider purpose. It gets the same treatment.
 *
 * Nothing is lost: the account runs no remarketing audiences, and conversion
 * counting does not depend on this signal. If remarketing is ever wanted, it is
 * a new question — not a quiet re-read of this one.
 */
function toConsentSignals(consent) {
  const ads = consent[CONSENT_CATEGORIES.ADVERTISING] === true ? "granted" : "denied";
  const analytics = consent[CONSENT_CATEGORIES.ANALYTICS] === true ? "granted" : "denied";

  return {
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: "denied",
    analytics_storage: analytics,
  };
}

/**
 * Load the remote tag exactly once.
 *
 * Guarded three ways because each catches a different failure: `tagRequested`
 * covers repeat calls within this page (SPA navigation, re-renders, React
 * StrictMode's double-invoked effects), and the DOM query covers the case where
 * something outside this module already injected a tag — in which case adding
 * ours would create the duplicate this module exists to prevent.
 */
function loadTagOnce() {
  if (tagRequested) return;
  if (document.querySelector(`script[src^="https://www.googletagmanager.com/gtag/js"]`)) {
    tagRequested = true;
    return;
  }

  tagRequested = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = GTAG_SRC;
  document.head.appendChild(script);
}

/**
 * Cookies this application can honestly act on when consent is withdrawn.
 *
 * `_gcl_*` is written by gtag.js as a FIRST-PARTY cookie on this site's own
 * domain, so ordinary JavaScript can expire it. That is the whole extent of
 * what is possible, and the limit is stated rather than glossed:
 *
 *   - Cookies Google sets on ITS OWN domains (google.com, doubleclick.net) are
 *     third-party and cannot be read or deleted from here by any means.
 *   - HttpOnly cookies are invisible to script.
 *   - Deletion is best-effort: a cookie only disappears if it is expired with
 *     the same path and domain it was written with, which is why several
 *     variants are attempted below.
 *
 * So this reduces what remains on the visitor's machine; it does not and cannot
 * guarantee that every Google cookie is gone. Any customer-facing wording must
 * say the same — see the privacy record.
 */
const ADVERTISING_COOKIE_PREFIXES = ["_gcl_", "_gac_"];

function clearAdvertisingCookies() {
  if (!isBrowser()) return [];

  // `document.cookie` is a string in every browser, but it is absent or
  // restricted in enough non-browser and sandboxed contexts (SSR shims, some
  // embedded webviews, a document with cookies disabled) that assuming it is a
  // string is not safe. This runs inside applyConsent, which initGoogleAds
  // calls directly and NOT inside a try/catch — so throwing here would take
  // consent initialisation down with it rather than merely skipping a cleanup.
  if (typeof document.cookie !== "string") return [];

  const names = document.cookie
    .split(";")
    .map((c) => c.split("=")[0].trim())
    .filter((n) => n && ADVERTISING_COOKIE_PREFIXES.some((p) => n.startsWith(p)));

  if (names.length === 0) return [];

  // A cookie is only removed when expired with the same domain/path it was set
  // with, and gtag.js may use either the host or the registrable domain. Try
  // each; the ones that do not match are silently ignored by the browser.
  const host = window.location.hostname;
  const labels = host.split(".");
  const domains = [null, host, `.${host}`];
  if (labels.length > 2) domains.push(`.${labels.slice(-2).join(".")}`);

  for (const name of names) {
    for (const domain of domains) {
      document.cookie =
        `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/` +
        (domain ? `; domain=${domain}` : "");
    }
  }

  return names;
}

/**
 * Apply a consent decision: tell the tag, and load it if it is now allowed to
 * run.
 *
 * Order matters. The consent update is pushed to the dataLayer BEFORE the
 * script is injected, so the tag reads the correct state on its very first
 * evaluation rather than briefly operating under the denied default.
 */
function applyConsent(consent) {
  const gtag = ensureDataLayer();
  gtag("consent", "update", toConsentSignals(consent));

  // Basic Consent Mode: no advertising consent, no tag, no request.
  //
  // This branch is also the WITHDRAWAL path. A visitor who revokes advertising
  // consent from the preferences dialog lands here: the denied update above is
  // pushed to a tag that may already be live (it cannot be unloaded — nothing
  // can unload a script), and every advertising cookie this origin controls is
  // expired. `fireConversion` re-reads consent on every call, so no further
  // conversion can fire regardless of the tag still being present.
  if (consent[CONSENT_CATEGORIES.ADVERTISING] !== true) {
    clearAdvertisingCookies();
    return;
  }

  loadTagOnce();
}

/**
 * Initialise measurement. Safe to call repeatedly; only the first call has
 * effect.
 *
 * Called once from the module entry point (client/src/main.jsx) rather than
 * from a component, so it is not tied to any route's mount lifecycle and cannot
 * be run twice by a remount — the same reasoning as installAmbientMotionPause.
 */
export function initGoogleAds() {
  if (!isMeasurementEnabled()) return;
  if (consentBridged) return;
  consentBridged = true;

  const gtag = ensureDataLayer();

  // Declare the denied default before anything else can touch the dataLayer.
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });

  gtag("js", new Date());

  // send_page_view is left at its default. This is an Ads-only property: the
  // page_view is what associates a click with the landing session, and
  // suppressing it would break attribution for every conversion below.
  gtag("config", GOOGLE_ADS_TAG_ID);

  // React to later decisions (the banner) as well as the stored one.
  onConsentChange(applyConsent);
  applyConsent(getConsent());
}

/**
 * Fire a conversion.
 *
 * Refuses in four cases, each silent by design — a conversion that cannot be
 * correctly attributed must not be approximated:
 *   - measurement disabled (dev/test build);
 *   - no advertising consent;
 *   - no label configured yet for this conversion (Google has not created the
 *     action — see CONVERSION_LABELS);
 *   - the tag was never loaded.
 *
 * `params` must contain only non-identifying values. Enforced by the caller
 * contract and by test; see conversions.js, which is the only intended caller.
 */
export function fireConversion(conversionKey, params = {}) {
  if (!isMeasurementEnabled()) return false;
  if (getConsent()[CONSENT_CATEGORIES.ADVERTISING] !== true) return false;

  const label = CONVERSION_LABELS[conversionKey];
  if (!label) return false;

  if (!tagRequested) return false;

  const gtag = ensureDataLayer();
  gtag("event", "conversion", {
    send_to: `${GOOGLE_ADS_TAG_ID}/${label}`,
    ...params,
  });

  return true;
}

/** Test-only: exposes the cookie sweep so its behaviour can be asserted. */
export const __clearAdvertisingCookiesForTests = clearAdvertisingCookies;

/** Test-only reset of module state. Not reachable from any app path. */
export function __resetGoogleAdsForTests() {
  tagRequested = false;
  consentBridged = false;
}
