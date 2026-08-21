// M59 / ADS-005 + ADS-001 — consent withdrawal, and the settlement-path
// diagnostic that measures the Purchase conversion blind spot.
//
// ── WHY WITHDRAWAL NEEDS ITS OWN GUARDS ──────────────────────────────────────
// Granting consent is loud: a tag loads, a request goes out, something visibly
// happens. Withdrawal is silent — the tag is ALREADY in the document and cannot
// be unloaded by anything. So "did withdrawal work?" is not observable by
// watching the page; it is only observable by asserting that the denied signals
// were sent, that no further conversion can fire, and that the cookies this
// origin controls were cleared. All three are pinned below.
//
// Same node-environment harness as the main M59 suite: minimal window/document/
// localStorage, no jsdom, no new dependency.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => readFile(join(root, p), "utf8");

function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

/** Cookie jar that honours expiry, so deletion is actually observable. */
function makeCookieJar() {
  const jar = new Map();
  return {
    get value() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    write(str) {
      const [pair] = str.split(";");
      const idx = pair.indexOf("=");
      const name = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1);
      // An expiry in the past deletes, exactly as a browser would treat it.
      if (/expires=Thu, 01 Jan 1970/i.test(str)) jar.delete(name);
      else jar.set(name, val);
    },
    seed(name, val) { jar.set(name, val); },
    names() { return [...jar.keys()]; },
  };
}

let cookieJar;

function installBrowser() {
  const appended = [];
  cookieJar = makeCookieJar();

  const doc = {
    appended,
    head: { appendChild(n) { appended.push(n); return n; } },
    createElement: (t) => ({ tagName: String(t).toUpperCase(), async: false, src: "" }),
    querySelector: (sel) => {
      const m = /^script\[src\^="(.+)"\]$/.exec(sel);
      if (!m) return null;
      return appended.find((n) => typeof n.src === "string" && n.src.startsWith(m[1])) || null;
    },
  };
  Object.defineProperty(doc, "cookie", {
    get: () => cookieJar.value,
    set: (v) => cookieJar.write(v),
    configurable: true,
  });

  globalThis.window = {
    localStorage: makeStorage(),
    location: { hostname: "www.letszero.in", href: "https://www.letszero.in/" },
  };
  globalThis.document = doc;
  globalThis.localStorage = globalThis.window.localStorage;
  return doc;
}

function clearBrowser() {
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.localStorage;
}

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

const asArgs = (e) => Array.from(e);
const dl = () => (globalThis.window.dataLayer || []).map(asArgs);
const consentCalls = (kind) => dl().filter((a) => a[0] === "consent" && a[1] === kind);
const conversionEvents = () =>
  dl().filter((a) => a[0] === "event" && a[1] === "conversion").map((a) => a[2]);
const tagScripts = (doc) =>
  doc.appended.filter((n) => n.src.startsWith("https://www.googletagmanager.com/gtag/js"));

const GRANT = (c) => c.setConsent({ [c.CONSENT_CATEGORIES.ADVERTISING]: true });

beforeEach(() => { installBrowser(); });
afterEach(() => { vi.unstubAllEnvs(); clearBrowser(); });

describe("consent withdrawal (ADS-005)", () => {
  it("denies all four Consent Mode v2 signals on withdrawal", async () => {
    const { consent, googleAds } = await loadModules();
    googleAds.initGoogleAds();
    GRANT(consent);

    consent.rejectAll();

    const last = consentCalls("update").at(-1)[2];
    expect(last).toEqual({
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    });
  });

  it("stops conversions firing after withdrawal, even though the tag stays loaded", async () => {
    const doc = globalThis.document;
    const { consent, googleAds, conversions } = await loadModules({
      labels: { purchase: "P_LABEL", sign_up: "S_LABEL" },
    });
    googleAds.initGoogleAds();
    GRANT(consent);

    expect(conversions.trackSignUp("nonce-before")).toBe(true);
    expect(tagScripts(doc)).toHaveLength(1);

    consent.rejectAll();

    // Nothing can unload a <script>. The tag is still in the document — which is
    // exactly why the gate has to live in fireConversion rather than in whether
    // the tag exists.
    expect(tagScripts(doc)).toHaveLength(1);

    expect(conversions.trackSignUp("nonce-after")).toBe(false);
    expect(conversions.trackPurchase({
      id: "pay-1", status: "SUCCESS", amountMinor: 100000, amountInr: 1000,
    })).toBe(false);
    expect(conversions.trackQualifiedLead("entry-after")).toBe(false);

    expect(conversionEvents()).toHaveLength(1); // only the pre-withdrawal one
  });

  it("clears the advertising cookies this origin controls", async () => {
    const { consent, googleAds } = await loadModules();
    googleAds.initGoogleAds();
    GRANT(consent);

    // What gtag.js writes as a first-party cookie, plus an unrelated one that
    // must survive — clearing the session cookie would break signing in.
    cookieJar.seed("_gcl_au", "1.1.123.456");
    cookieJar.seed("_gac_UA-1", "x");
    cookieJar.seed("token", "session-value");

    consent.rejectAll();

    expect(cookieJar.names()).not.toContain("_gcl_au");
    expect(cookieJar.names()).not.toContain("_gac_UA-1");
    expect(cookieJar.names()).toContain("token");
  });

  it("survives a document with no readable cookie jar", async () => {
    // Found by running this suite alongside the main one, whose fake document
    // has no `cookie` property at all: the sweep did `document.cookie.split()`
    // and threw. applyConsent is called directly by initGoogleAds and is NOT
    // wrapped in a try/catch, so that throw took consent initialisation down
    // with it — the denied signals were never sent. Cleanup is best-effort and
    // must degrade to doing nothing, never to breaking consent.
    const doc = globalThis.document;
    delete doc.cookie;
    Object.defineProperty(doc, "cookie", { get: () => undefined, configurable: true });

    const { consent, googleAds } = await loadModules();
    expect(() => googleAds.initGoogleAds()).not.toThrow();
    expect(() => consent.rejectAll()).not.toThrow();

    // And the consent signals still went out.
    expect(consentCalls("default")).toHaveLength(1);
    expect(consentCalls("update").at(-1)[2].ad_storage).toBe("denied");
  });

  it("does not silently re-grant: withdrawal survives re-initialisation", async () => {
    const { consent, googleAds } = await loadModules();
    googleAds.initGoogleAds();
    GRANT(consent);
    consent.rejectAll();

    // A reload gives a FRESH document but keeps localStorage. Reusing the old
    // document would leave the previously-appended <script> in it and the
    // assertion below would be measuring the harness, not the behaviour.
    const storedConsent = globalThis.window.localStorage.getItem("letszero.consent.v1");
    clearBrowser();
    const doc2 = installBrowser();
    globalThis.window.localStorage.setItem("letszero.consent.v1", storedConsent);

    const again = await loadModules();
    again.googleAds.initGoogleAds();

    expect(again.consent.getConsent()[again.consent.CONSENT_CATEGORIES.ADVERTISING]).toBe(false);
    expect(tagScripts(doc2)).toHaveLength(0);
  });

  it("allows re-consent without loading a second tag", async () => {
    const doc = globalThis.document;
    const { consent, googleAds, conversions } = await loadModules({ labels: { sign_up: "S" } });
    googleAds.initGoogleAds();

    GRANT(consent);
    consent.rejectAll();
    GRANT(consent);

    expect(tagScripts(doc)).toHaveLength(1);
    expect(consentCalls("update").at(-1)[2].ad_storage).toBe("granted");
    expect(conversions.trackSignUp("nonce-re-consent")).toBe(true);
  });

  it("keeps the banner from reappearing once any decision exists", async () => {
    const { consent } = await loadModules();
    GRANT(consent);
    expect(consent.needsConsentDecision()).toBe(false);
    consent.rejectAll();
    // Withdrawal is a decision, not a reset — the banner must not return.
    expect(consent.needsConsentDecision()).toBe(false);
  });

  it("keeps withdrawal on the one consent authority — no second state", async () => {
    const prefs = await read("client/src/components/consent/CookiePreferencesDialog.jsx");
    // Must go through setConsent, not write storage or push gtag itself.
    expect(prefs).toContain('from "@/lib/consent"');
    expect(prefs).toContain("setConsent(");

    // Strip comments first: the file legitimately *discusses* localStorage and
    // prerendering in prose, and matching that would assert on documentation
    // rather than on behaviour.
    const code = prefs
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    expect(code).not.toMatch(/localStorage/);
    expect(code).not.toMatch(/dataLayer|gtag\(/);

    // And the always-mounted wrapper must stay free of heavy imports: mounting
    // Dialog/Switch eagerly put them in the entry bundle every visitor pays for.
    const wrapper = await read("client/src/components/consent/CookiePreferences.jsx");
    expect(wrapper).toMatch(/lazy\(\(\) => import\("\.\/CookiePreferencesDialog"\)\)/);
    expect(wrapper).not.toMatch(/from "@\/components\/ui\/(dialog|switch|button|label)"/);
  });

  it("does not claim it can delete cookies it cannot reach", async () => {
    const src = await read("client/src/lib/analytics/googleAds.js");
    // The limitation must stay written down next to the code that has it.
    expect(src).toMatch(/third-party and cannot be read or deleted/i);
    expect(src).toMatch(/best-effort/i);
  });
});

describe("settlement-path diagnostic (ADS-001)", () => {
  it("is recorded by both settlement paths, and never sent to Google", async () => {
    const routes = await read("server/routes.js");
    const webhook = await read("server/razorpayWebhook.js");

    expect(routes).toContain('completionPath: "browser"');
    expect(webhook).toContain('completionPath: "webhook"');

    // The diagnostic must not leak into the ad payload. The four-key contract
    // is pinned in the main suite; this asserts the field never reaches it.
    const conversions = await read("client/src/lib/analytics/conversions.js");
    expect(conversions).not.toMatch(/completionPath/);
  });

  it("is written atomically by the race winner, not by every caller", async () => {
    const storage = await read("server/storage.js");
    // Inside the same UPDATE that performs PENDING -> SUCCESS, so a losing
    // caller's UPDATE matches zero rows and records nothing.
    const update = /const transitioned = await tx\.update\(payments\)[\s\S]*?\.returning/.exec(storage)[0];
    expect(update).toContain("completionPath");
    expect(update).toContain("status != 'SUCCESS'");
  });

  it("uses the existing jsonb column, so no migration is required", async () => {
    const storage = await read("server/storage.js");
    expect(storage).toContain("coalesce(");
    expect(storage).toContain("'{}'::jsonb");
    // Concat, not replace — existing metadata must survive.
    expect(storage).toMatch(/\|\|\s*\$\{JSON\.stringify\(\{ completionPath \}\)\}::jsonb/);

    const migrations = await readFile(join(root, "migrations", "meta", "_journal.json"), "utf8")
      .catch(() => "");
    if (migrations) expect(migrations).not.toMatch(/completion_path/);
  });

  it("keeps both storage backends in parity", async () => {
    const pg = await read("server/storage.js");
    const mem = await read("server/memoryStorage.js");
    for (const src of [pg, mem]) {
      expect(src).toContain("async completePayment(paymentId, transactionId, { completionPath = null } = {})");
      expect(src).toContain("transitioned:");
    }
  });

  it("exposes the race result, which `credited` cannot report for seat payments", async () => {
    const pg = await read("server/storage.js");
    // credited is false for SEATS whether or not this caller won, so a seat
    // caller had no way to tell. `transitioned` is that missing signal.
    expect(pg).toMatch(/transitioned: didTransition/);
    expect(pg).toMatch(/didTransition = true/);
  });
});
