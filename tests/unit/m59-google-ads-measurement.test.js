// M59 â€” Google Ads measurement: consent, tag loading, and the conversion
// taxonomy.
//
// â”€â”€ WHY THESE TESTS EXIST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Tracking code fails silently by nature. A conversion that never fires, one
// that fires twice, or one that quietly carries an email address all look
// identical from inside the application â€” the page renders, nothing throws, and
// the damage shows up weeks later as advertising spend bid against numbers that
// were never true. Every assertion below pins a property that has no other
// observable symptom.
//
// â”€â”€ HARNESS NOTE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// This repository's vitest environment is "node" â€” there is no jsdom and none is
// added here. The modules under test are browser modules, so a minimal window /
// document / localStorage is installed per test. That is deliberate: it keeps
// the dependency surface unchanged, and it makes the DOM contract these modules
// actually rely on explicit (createElement, head.appendChild, querySelector,
// localStorage) rather than hidden inside a full DOM emulation.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => readFile(join(root, p), "utf8");

// â”€â”€â”€ Minimal browser stubs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

/** Records every script element appended to head, so loads can be counted. */
function makeDocument() {
  const appended = [];
  const head = {
    appendChild(node) {
      appended.push(node);
      return node;
    },
  };
  return {
    appended,
    head,
    createElement: (tag) => ({ tagName: String(tag).toUpperCase(), async: false, src: "" }),
    querySelector: (selector) => {
      // Supports only the prefix form this module uses:
      //   script[src^="â€¦"]
      const m = /^script\[src\^="(.+)"\]$/.exec(selector);
      if (!m) return null;
      return appended.find((n) => typeof n.src === "string" && n.src.startsWith(m[1])) || null;
    },
  };
}

function installBrowser() {
  const doc = makeDocument();
  globalThis.window = {
    localStorage: makeStorage(),
    location: { href: "https://www.letszero.in/app/onboarding" },
    history: { state: null, replaceState() {} },
  };
  globalThis.document = doc;
  // The modules read window.localStorage; some environments also expect the
  // bare global, so both point at the same store.
  globalThis.localStorage = globalThis.window.localStorage;
  return doc;
}

function clearBrowser() {
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.localStorage;
}

/**
 * Import the measurement modules fresh, as a production build, with the given
 * conversion labels configured.
 *
 * Labels are read at module-evaluation time, so they must be stubbed BEFORE the
 * import â€” hence resetModules plus a dynamic import rather than a static one.
 */
async function loadModules({ labels = {}, prod = true } = {}) {
  vi.resetModules();
  vi.stubEnv("PROD", prod);
  vi.stubEnv("VITE_GADS_LABEL_PURCHASE", labels.purchase ?? "");
  vi.stubEnv("VITE_GADS_LABEL_SIGN_UP", labels.sign_up ?? "");
  vi.stubEnv("VITE_GADS_LABEL_QUALIFIED_LEAD", labels.qualified_lead ?? "");

  const consent = await import("../../client/src/lib/consent.js");
  const googleAds = await import("../../client/src/lib/analytics/googleAds.js");
  const conversions = await import("../../client/src/lib/analytics/conversions.js");
  return { consent, googleAds, conversions };
}

/** Google's snippet pushes the Arguments object; read it back as an array. */
const asArgs = (entry) => Array.from(entry);

const gtagCalls = (kind) =>
  (globalThis.window.dataLayer || []).map(asArgs).filter((a) => a[0] === kind);

beforeEach(() => {
  installBrowser();
});

afterEach(() => {
  vi.unstubAllEnvs();
  clearBrowser();
});

// â”€â”€â”€ Consent authority â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("consent authority", () => {
  it("treats a visitor who has not answered as denied, and distinguishes that from a refusal", async () => {
    const { consent } = await loadModules();

    // Undecided: banner must show, nothing is granted.
    expect(consent.needsConsentDecision()).toBe(true);
    expect(consent.hasConsent(consent.CONSENT_CATEGORIES.ADVERTISING)).toBe(false);
    expect(consent.hasConsent(consent.CONSENT_CATEGORIES.ANALYTICS)).toBe(false);

    consent.rejectAll();

    // Refused: still denied, but the question is now answered and must not be
    // asked again. Collapsing these two states would re-prompt forever.
    expect(consent.needsConsentDecision()).toBe(false);
    expect(consent.hasConsent(consent.CONSENT_CATEGORIES.ADVERTISING)).toBe(false);
  });

  it("grants only the category that was actually asked about", async () => {
    const { consent } = await loadModules();
    // What the banner does: it asks about advertising and nothing else.
    consent.setConsent({ [consent.CONSENT_CATEGORIES.ADVERTISING]: true });

    expect(consent.needsConsentDecision()).toBe(false);
    // Analytics stays denied. There is no acceptAll() precisely so that a
    // decision about advertising cannot silently grant a purpose the visitor
    // was never shown — and no analytics consumer exists in any case (ADS-004).
    expect(consent.getConsent()).toEqual({ analytics: false, advertising: true });
  });

  it("exposes no blanket grant", async () => {
    const { consent } = await loadModules();
    expect(consent.acceptAll).toBeUndefined();
  });

  it("fails closed on a corrupt, truthy-but-invalid, or version-mismatched record", async () => {
    const { consent } = await loadModules();

    for (const bad of [
      "not json at all",
      JSON.stringify({ version: 1, categories: null }),
      JSON.stringify({ version: 999, categories: { advertising: true } }),
      JSON.stringify({ version: 1, categories: { advertising: "yes" } }),
    ]) {
      globalThis.window.localStorage.setItem("letszero.consent.v1", bad);
      expect(consent.hasConsent(consent.CONSENT_CATEGORIES.ADVERTISING)).toBe(false);
    }

    // The string "yes" is truthy in JS. If consent were read without coercion
    // it would grant advertising here â€” this is the assertion that catches it.
  });

  it("never grants a category the caller did not explicitly set to true", async () => {
    const { consent } = await loadModules();
    consent.setConsent({ advertising: "true", analytics: 1 });
    expect(consent.getConsent()).toEqual({ analytics: false, advertising: false });
  });
});

// â”€â”€â”€ Tag loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("Google tag loading", () => {
  const tagScripts = (doc) =>
    doc.appended.filter((n) => n.src.startsWith("https://www.googletagmanager.com/gtag/js"));

  it("does not contact Google at all until advertising consent is granted", async () => {
    const doc = globalThis.document;
    const { googleAds } = await loadModules();

    googleAds.initGoogleAds();

    // Basic Consent Mode: the defining property. No script, no request, no
    // cookie for a visitor who has not opted in.
    expect(tagScripts(doc)).toHaveLength(0);

    // â€¦but consent state IS declared, defaulting to denied across all four v2
    // signals, so the posture cannot silently invert if this is ever switched
    // to Advanced mode.
    const defaults = gtagCalls("consent").filter((a) => a[1] === "default");
    expect(defaults).toHaveLength(1);
    expect(defaults[0][2]).toEqual({
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    });
  });

  it("loads the tag exactly once when consent is granted, and never again", async () => {
    const doc = globalThis.document;
    const { consent, googleAds } = await loadModules();

    googleAds.initGoogleAds();
    consent.setConsent({ [consent.CONSENT_CATEGORIES.ADVERTISING]: true });

    expect(tagScripts(doc)).toHaveLength(1);
    expect(tagScripts(doc)[0].src).toBe(
      "https://www.googletagmanager.com/gtag/js?id=AW-18330551128",
    );
    expect(tagScripts(doc)[0].async).toBe(true);

    // Re-initialisation (SPA navigation, remount, StrictMode double-effect) and
    // repeated decisions must not add a second tag.
    googleAds.initGoogleAds();
    googleAds.initGoogleAds();
    consent.setConsent({ [consent.CONSENT_CATEGORIES.ADVERTISING]: true });
    consent.setConsent({ [consent.CONSENT_CATEGORIES.ADVERTISING]: true });

    expect(tagScripts(doc)).toHaveLength(1);
  });

  it("does not add a second tag when one is already present in the document", async () => {
    const doc = globalThis.document;
    // Simulate a tag injected by anything outside this module.
    doc.head.appendChild({ tagName: "SCRIPT", async: true, src: "https://www.googletagmanager.com/gtag/js?id=AW-OTHER" });

    const { consent, googleAds } = await loadModules();
    googleAds.initGoogleAds();
    consent.setConsent({ [consent.CONSENT_CATEGORIES.ADVERTISING]: true });

    expect(tagScripts(doc)).toHaveLength(1);
  });

  it("adopts an existing dataLayer instead of overwriting it", async () => {
    const preExisting = [{ event: "something_already_queued" }];
    globalThis.window.dataLayer = preExisting;

    const { googleAds } = await loadModules();
    googleAds.initGoogleAds();

    // Same array identity, original entry intact. Overwriting would silently
    // discard anything queued before initialisation.
    expect(globalThis.window.dataLayer).toBe(preExisting);
    expect(globalThis.window.dataLayer[0]).toEqual({ event: "something_already_queued" });
  });

  it("pushes the Arguments object, matching Google's snippet contract", async () => {
    const { googleAds } = await loadModules();
    googleAds.initGoogleAds();

    const raw = globalThis.window.dataLayer[0];
    // gtag.js requires the real Arguments object. An array here would be a
    // subtle break that still "looks" correct in the dataLayer.
    expect(Array.isArray(raw)).toBe(false);
    expect(Object.prototype.toString.call(raw)).toBe("[object Arguments]");
  });

  it("grants only the advertising signals, leaving analytics_storage denied", async () => {
    const { consent, googleAds } = await loadModules();
    googleAds.initGoogleAds();
    consent.setConsent({ [consent.CONSENT_CATEGORIES.ADVERTISING]: true });

    const updates = gtagCalls("consent").filter((a) => a[1] === "update");
    // All four v2 signals are declared on every update — that is the Consent
    // Mode contract. But TWO of the four are permanently denied, for the same
    // reason: granting either would tell Google we hold a permission we never
    // sought.
    //
    //   analytics_storage  — the platform performs no analytics and nothing
    //                        consumes the signal (ADS-004).
    //   ad_personalization — governs personalized advertising and remarketing
    //                        audiences. Both consent surfaces ask to "measure
    //                        which advertising brings people here" and nothing
    //                        more, so personalization is a purpose the visitor
    //                        was never asked about. Granting it off the back of
    //                        a measurement answer is the same defect Audit 224
    //                        fixed in the other direction.
    //
    // Only ad_storage and ad_user_data follow the visitor's decision — the two
    // the conversion actually needs.
    expect(updates.at(-1)[2]).toEqual({
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "denied",
      analytics_storage: "denied",
    });

    // A grant must never be able to reach ad_personalization by ANY route, so
    // this asserts on every consent update the module has ever pushed, not just
    // the last one.
    for (const update of updates) {
      expect(update[2].ad_personalization).toBe("denied");
    }
  });

  it("is inert in a non-production build", async () => {
    const doc = globalThis.document;
    const { consent, googleAds } = await loadModules({ prod: false });

    googleAds.initGoogleAds();
    consent.setConsent({ [consent.CONSENT_CATEGORIES.ADVERTISING]: true });

    // Developer and CI traffic must never reach the live Ads account.
    expect(tagScripts(doc)).toHaveLength(0);
    expect(globalThis.window.dataLayer).toBeUndefined();
  });
});

// â”€â”€â”€ Conversions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SUCCESSFUL_PAYMENT = {
  id: "3f6c1c1e-0000-4000-8000-000000000abc",
  status: "SUCCESS",
  amountMinor: 249900,
  amountInr: 2499,
  kind: "SEATS",
};

describe("conversion taxonomy", () => {
  async function ready(labels) {
    const mods = await loadModules({ labels });
    mods.googleAds.initGoogleAds();
    mods.consent.setConsent({ [mods.consent.CONSENT_CATEGORIES.ADVERTISING]: true });
    return mods;
  }

  const conversionEvents = () =>
    (globalThis.window.dataLayer || [])
      .map(asArgs)
      .filter((a) => a[0] === "event" && a[1] === "conversion")
      .map((a) => a[2]);

  it("fires a purchase only for a server-confirmed SUCCESS payment", async () => {
    const { conversions } = await ready({ purchase: "PURCHASE_LABEL" });

    // Every non-success state a client could plausibly hold.
    expect(conversions.trackPurchase({ ...SUCCESSFUL_PAYMENT, status: "PENDING" })).toBe(false);
    expect(conversions.trackPurchase({ ...SUCCESSFUL_PAYMENT, status: "FAILED" })).toBe(false);
    expect(conversions.trackPurchase(null)).toBe(false);
    expect(conversionEvents()).toHaveLength(0);

    expect(conversions.trackPurchase(SUCCESSFUL_PAYMENT)).toBe(true);
    expect(conversionEvents()).toHaveLength(1);
  });

  it("derives value from the server's amount and reports the currency actually charged", async () => {
    const { conversions } = await ready({ purchase: "PURCHASE_LABEL" });
    conversions.trackPurchase(SUCCESSFUL_PAYMENT);

    const [event] = conversionEvents();
    expect(event.value).toBe(2499);
    expect(event.currency).toBe("INR");
    expect(event.send_to).toBe("AW-18330551128/PURCHASE_LABEL");
  });

  it("prefers the exact minor amount over the rounded legacy column", async () => {
    const { conversions } = await ready({ purchase: "PURCHASE_LABEL" });
    // A prorated seat charge that is not a whole rupee. amountInr would report
    // 1250 and lose the half rupee that was actually taken.
    conversions.trackPurchase({ ...SUCCESSFUL_PAYMENT, amountMinor: 124950, amountInr: 1250 });
    expect(conversionEvents()[0].value).toBe(1249.5);
  });

  it("cannot double-count one payment across reload, navigation or replay", async () => {
    const { conversions } = await ready({ purchase: "PURCHASE_LABEL" });

    expect(conversions.trackPurchase(SUCCESSFUL_PAYMENT)).toBe(true);

    // The endpoint returns the same record with "Already completed" on replay;
    // a customer may also refresh or navigate back onto the success screen.
    expect(conversions.trackPurchase(SUCCESSFUL_PAYMENT)).toBe(false);
    expect(conversions.trackPurchase({ ...SUCCESSFUL_PAYMENT })).toBe(false);

    expect(conversionEvents()).toHaveLength(1);
  });

  it("survives a full page reload without re-firing", async () => {
    const { conversions } = await ready({ purchase: "PURCHASE_LABEL" });
    conversions.trackPurchase(SUCCESSFUL_PAYMENT);

    // A reload re-evaluates every module but keeps localStorage. Module-level
    // state alone would not catch this; the durable key is what does.
    const reloaded = await loadModules({ labels: { purchase: "PURCHASE_LABEL" } });
    reloaded.googleAds.initGoogleAds();

    expect(reloaded.conversions.trackPurchase(SUCCESSFUL_PAYMENT)).toBe(false);
  });

  it("still counts a genuinely different payment", async () => {
    const { conversions } = await ready({ purchase: "PURCHASE_LABEL" });
    conversions.trackPurchase(SUCCESSFUL_PAYMENT);
    conversions.trackPurchase({ ...SUCCESSFUL_PAYMENT, id: "9999cccc-0000-4000-8000-00000000dead" });
    expect(conversionEvents()).toHaveLength(2);
  });

  it("sends no PII and no tenant data with a purchase", async () => {
    const { conversions } = await ready({ purchase: "PURCHASE_LABEL" });

    // A payment record carries far more than the tracking layer may transmit.
    conversions.trackPurchase({
      ...SUCCESSFUL_PAYMENT,
      userId: "tenant-root-1234",
      subscriptionId: "sub-5678",
      planName: "Team Seats â€” 3 Ã— Monthly",
      invoiceNumber: "INV-2026-0001",
      metadata: { email: "founder@customer.example", contactCount: 4200 },
    });

    const [event] = conversionEvents();
    expect(Object.keys(event).sort()).toEqual(
      ["currency", "send_to", "transaction_id", "value"].sort(),
    );

    // Nothing identifying anywhere in the serialised payload.
    const wire = JSON.stringify(event);
    for (const forbidden of [
      "founder@customer.example",
      "tenant-root-1234",
      "sub-5678",
      "INV-2026-0001",
      "Team Seats",
      "4200",
    ]) {
      expect(wire).not.toContain(forbidden);
    }

    // The only identifier is the payment's own id, which is what makes
    // deduplication possible and carries no tenant meaning.
    expect(event.transaction_id).toBe(SUCCESSFUL_PAYMENT.id);
  });

  it("does not fire when the visitor refused advertising", async () => {
    const mods = await loadModules({ labels: { purchase: "PURCHASE_LABEL" } });
    mods.googleAds.initGoogleAds();
    mods.consent.rejectAll();

    expect(mods.conversions.trackPurchase(SUCCESSFUL_PAYMENT)).toBe(false);
    expect(conversionEvents()).toHaveLength(0);
  });

  it("does not fabricate a hit when Google has not yet issued a label", async () => {
    // The state this milestone actually ships in: tag configured, conversion
    // actions not yet created in the Ads UI.
    const { conversions } = await ready({});
    expect(conversions.trackPurchase(SUCCESSFUL_PAYMENT)).toBe(false);
    expect(conversionEvents()).toHaveLength(0);
  });

  it("fires sign-up per creation event, not per browser, and never on a repeat", async () => {
    const { conversions } = await ready({ sign_up: "SIGNUP_LABEL" });

    expect(conversions.trackSignUp("nonce-from-first-registration")).toBe(true);
    expect(conversions.trackSignUp("nonce-from-first-registration")).toBe(false);

    // A second genuine registration in the same browser must still count.
    expect(conversions.trackSignUp("nonce-from-second-registration")).toBe(true);

    // No nonce means no registration happened.
    expect(conversions.trackSignUp(null)).toBe(false);
    expect(conversions.trackSignUp(undefined)).toBe(false);

    expect(conversionEvents()).toHaveLength(2);
    expect(conversionEvents()[0].send_to).toBe("AW-18330551128/SIGNUP_LABEL");
    // Carries no payload at all â€” nothing about the account is transmitted.
    expect(Object.keys(conversionEvents()[0])).toEqual(["send_to"]);
  });

  it("treats a lead as a valueless secondary event keyed on the server's entry id", async () => {
    const { conversions } = await ready({ qualified_lead: "LEAD_LABEL" });

    expect(conversions.trackQualifiedLead("waitlist-entry-77")).toBe(true);
    expect(conversions.trackQualifiedLead("waitlist-entry-77")).toBe(false);
    expect(conversions.trackQualifiedLead(undefined)).toBe(false);

    const [event] = conversionEvents();
    // A waitlist entry is not revenue. Giving it a value would have the account
    // bid against it as though it were.
    expect(event.value).toBeUndefined();
    expect(Object.keys(event)).toEqual(["send_to"]);
  });
});

// â”€â”€â”€ Source-level guarantees â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("architecture guarantees", () => {
  it("configures the tag id in exactly one module", async () => {
    const files = [
      "client/src/lib/analytics/googleAds.js",
      "client/src/lib/analytics/conversions.js",
      "client/src/lib/analytics/useSignupConversion.js",
      "client/src/lib/consent.js",
      "client/src/main.jsx",
      "client/src/App.jsx",
      "client/src/pages/Payments.jsx",
      "client/src/pages/Onboarding.jsx",
      "client/src/pages/WaitlistLanding.jsx",
      "client/index.html",
    ];

    const holders = [];
    for (const f of files) {
      if ((await read(f)).includes("AW-18330551128")) holders.push(f);
    }

    // One source of truth. A second occurrence is how a tag ends up configured
    // twice with two different ids.
    expect(holders).toEqual(["client/src/lib/analytics/googleAds.js"]);
  });

  it("keeps the Google tag out of index.html, so prerendered pages gain no inline script", async () => {
    const html = await read("client/index.html");
    expect(html).not.toContain("googletagmanager");
    expect(html).not.toContain("gtag");
    expect(html).not.toContain("dataLayer");
  });

  it("renders nothing during prerender, with no window present at all", async () => {
    const { default: ConsentBanner } = await import(
      "../../client/src/components/consent/ConsentBanner.jsx"
    );

    // Reproduce the real prerender condition rather than approximating it:
    // script/prerender.js calls renderToString under Node, where there is no
    // window and no localStorage. Asserting empty markup while a stub window is
    // installed would pass even if the component read storage during render â€”
    // the failure only appears once the globals are genuinely absent.
    clearBrowser();
    try {
      expect(renderToStaticMarkup(React.createElement(ConsentBanner))).toBe("");
    } finally {
      installBrowser();
    }
  });

  it("asks for exactly the consent it grants, and no more", async () => {
    const banner = await read("client/src/components/consent/ConsentBanner.jsx");

    // Everything from the opening <p> to its close: the words the visitor
    // actually reads before deciding.
    const copy = /<p className="min-w-0 text-sm text-muted-foreground">([\s\S]*?)<\/p>/
      .exec(banner)[1]
      .replace(/\{[\s\S]*?\}/g, " ")   // JSX expressions
      .replace(/<[^>]+>/g, " ");        // nested elements (the policy link)

    // The banner previously solicited consent for "advertising and analytics
    // cookies" while no analytics consumer existed — asking for a permission
    // the platform never exercises, and disagreeing with both the code and the
    // proposed policy wording. Same shape as M53's CDP-1.
    expect(copy).not.toMatch(/analytics/i);
    expect(copy).toMatch(/advertising/i);

    // And the grant matches the question: advertising only, never a blanket
    // accept. setConsent coerces unlisted categories to false.
    expect(banner).toContain("setConsent({ [CONSENT_CATEGORIES.ADVERTISING]: true })");
    expect(banner).not.toMatch(/acceptAll/);
  });

  it("does not weaken the CSP", async () => {
    const src = await read("server/index.js");
    const scriptSrc = /scriptSrc:\s*\[([^\]]*)\]/.exec(src)[1];

    // The whole reason the tag is bootstrapped from a module rather than
    // Google's inline snippet.
    expect(scriptSrc).not.toContain("unsafe-inline");
    expect(scriptSrc).not.toContain("unsafe-eval");
    expect(scriptSrc).toContain("https://www.googletagmanager.com");

    // No wildcard host anywhere in the policy.
    const directives = /directives:\s*\{([\s\S]*?)\n\s{4}\},/.exec(src)[1];
    expect(directives).not.toMatch(/"https:\/\/\*/);
    expect(directives).not.toMatch(/'unsafe-eval'/);
  });

  it("marks the signup redirect with a random nonce rather than the user id", async () => {
    const src = await read("server/routes.js");
    expect(src).toContain("const signupNonce = crypto.randomUUID();");
    expect(src).toContain("`/app/onboarding?signup=${signupNonce}`");

    // Using the user id here would put a tenant identifier into a URL that the
    // tracking layer then reads.
    expect(src).not.toContain("/app/onboarding?signup=${req.user.id}");
  });
});
