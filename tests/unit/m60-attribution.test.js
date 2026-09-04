// M60 — first-party advertising attribution: capture, consent gating, and the
// one-row-per-account association.
//
// ── WHY THESE TESTS EXIST ───────────────────────────────────────────────────
// Every property below fails silently in production if it breaks. A capture
// that runs before consent leaves an advertising identifier in storage while
// the privacy policy says none is used, and nothing throws. An association that
// runs twice inflates the acquisition count a campaign is judged on, and
// nothing throws. An allowlist that drifts open writes a customer's email
// address into a permanent audit row, and nothing throws.
//
// ── HARNESS NOTE ────────────────────────────────────────────────────────────
// Two harnesses, deliberately. The capture module is a browser module and gets
// the same minimal window/document/localStorage stubs the M59 suite uses — no
// jsdom is added. The association endpoint gets a real express server over the
// real storage layer, because the property under test ("one row per account")
// is a property of the route and the table together, and a mock of either would
// be asserting the mock.

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from "vitest";
import express from "express";
import { createServer } from "http";
import {
  ATTRIBUTION_PARAMS,
  MAX_VALUE_LENGTH,
  sanitizeAttribution,
  sanitizeTouch,
} from "../../shared/attribution.js";
import { AUDIT_ACTIONS } from "../../shared/schema.js";

vi.mock("../../server/email.js", () => ({
  sendCampaignEmail: vi.fn(async () => ({ messageId: "mock" })),
  sendTransactionalEmail: vi.fn(async () => {}),
  sendPaymentReceiptEmail: vi.fn(async () => {}),
  verifySesConnection: vi.fn(async () => {}),
}));

// ─── Browser stubs (capture module) ──────────────────────────────────────────

function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
}

/** Install a browser whose landing URL is `url`. */
function installBrowser(url = "https://www.letszero.in/") {
  const u = new URL(url);
  globalThis.window = {
    localStorage: makeStorage(),
    location: { href: u.href, search: u.search, pathname: u.pathname },
    history: { state: null, replaceState() {} },
    addEventListener() {},
  };
  globalThis.document = { createElement: () => ({}), head: { appendChild() {} } };
  globalThis.localStorage = globalThis.window.localStorage;
}

function clearBrowser() {
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.localStorage;
}

const STORAGE_KEY = "letszero.attr.v1";
const stored = () => {
  const raw = globalThis.window.localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
};

/**
 * Import consent + attribution fresh for one landing URL.
 *
 * resetModules is required because the capture reads window.location at init
 * and both modules hold module-level state; a stale import would report the
 * previous test's landing.
 */
async function land(url) {
  clearBrowser();
  installBrowser(url);
  vi.resetModules();
  const consent = await import("../../client/src/lib/consent.js");
  const attribution = await import("../../client/src/lib/analytics/attribution.js");
  attribution.initAttribution();
  return { consent, attribution };
}

const grant = (consent) =>
  consent.setConsent({ [consent.CONSENT_CATEGORIES.ADVERTISING]: true });

// ─── The shared allowlist ────────────────────────────────────────────────────

describe("the attribution allowlist", () => {
  it("keeps only the eight advertising parameters and drops everything else", () => {
    const touch = sanitizeTouch({
      gclid: "abc123",
      utm_source: "google",
      // The failure this allowlist exists to prevent: a campaign URL carrying
      // a customer's address into a permanent audit row.
      email: "customer@example.com",
      name: "A Customer",
      phone: "+919999999999",
      token: "session-token",
      landingPath: "/pricing",
      at: "2026-09-04T00:00:00.000Z",
    });

    expect(touch.gclid).toBe("abc123");
    expect(touch.utm_source).toBe("google");
    expect(touch.landingPath).toBe("/pricing");
    for (const leaked of ["email", "name", "phone", "token"]) {
      expect(touch[leaked]).toBeUndefined();
    }
    // Nothing beyond the allowlist plus the two structural fields.
    expect(Object.keys(touch).sort()).toEqual(["at", "gclid", "landingPath", "utm_source"]);
  });

  it("covers the iOS click identifiers, not gclid alone", () => {
    // gbraid/wbraid replace gclid when ATT restricts it. Dropping them loses a
    // share of iOS traffic that varies by campaign — invisible as an error.
    expect(ATTRIBUTION_PARAMS).toContain("gbraid");
    expect(ATTRIBUTION_PARAMS).toContain("wbraid");
  });

  it("caps every value so an audit row cannot be used as storage", () => {
    const touch = sanitizeTouch({ gclid: "x".repeat(5000), landingPath: "/y".repeat(5000) });
    expect(touch.gclid.length).toBe(MAX_VALUE_LENGTH);
    expect(touch.landingPath.length).toBe(MAX_VALUE_LENGTH);
  });

  it("returns null for a touch carrying no advertising parameter at all", () => {
    // "arrived with no ad" must stay distinguishable from "arrived with an ad";
    // a bare landing path is not a touch.
    expect(sanitizeTouch({ landingPath: "/pricing" })).toBeNull();
    expect(sanitizeAttribution({ first: { landingPath: "/" } })).toBeNull();
    expect(sanitizeAttribution(null)).toBeNull();
    expect(sanitizeAttribution("not an object")).toBeNull();
  });

  it("falls back last-touch to first-touch rather than emitting a half record", () => {
    const clean = sanitizeAttribution({ first: { gclid: "a" }, last: { nonsense: true } });
    expect(clean.last.gclid).toBe("a");
  });
});

// ─── Capture, gated on consent ───────────────────────────────────────────────

describe("attribution capture", () => {
  afterEach(() => {
    clearBrowser();
    vi.resetModules();
  });

  it("writes NOTHING before the visitor has decided", async () => {
    const { attribution } = await land("https://www.letszero.in/pricing?gclid=CLICK123");

    // The whole privacy posture in one assertion: the click identifier is held
    // in memory for this tab and has not reached storage.
    expect(stored()).toBeNull();
    expect(attribution.getAttribution()).toBeNull();
  });

  it("writes NOTHING when the visitor refuses", async () => {
    const { consent, attribution } = await land("https://www.letszero.in/?gclid=CLICK123");
    consent.rejectAll();

    expect(stored()).toBeNull();
    expect(attribution.getAttribution()).toBeNull();
  });

  it("persists the touch when advertising consent is granted", async () => {
    const { consent, attribution } = await land(
      "https://www.letszero.in/pricing?gclid=CLICK123&utm_source=google&utm_campaign=brand",
    );
    grant(consent);

    const record = attribution.getAttribution();
    expect(record.first.gclid).toBe("CLICK123");
    expect(record.first.utm_source).toBe("google");
    expect(record.first.utm_campaign).toBe("brand");
    expect(record.first.landingPath).toBe("/pricing");
    // Only one touch so far: last mirrors first.
    expect(record.last.gclid).toBe("CLICK123");
  });

  it("never captures a parameter outside the allowlist, even from the URL", async () => {
    const { consent, attribution } = await land(
      "https://www.letszero.in/?gclid=CLICK123&email=customer%40example.com&ref=partner",
    );
    grant(consent);

    const serialised = JSON.stringify(attribution.getAttribution());
    expect(serialised).not.toContain("customer@example.com");
    expect(serialised).not.toContain("partner");
    expect(serialised).toContain("CLICK123");
  });

  it("clears the record when consent is withdrawn", async () => {
    const { consent, attribution } = await land("https://www.letszero.in/?gclid=CLICK123");
    grant(consent);
    expect(attribution.getAttribution()).not.toBeNull();

    consent.rejectAll();

    // Withdrawal must not leave a click identifier behind for a later re-grant
    // to resurrect — symmetrical with the advertising-cookie sweep in
    // googleAds.js.
    expect(stored()).toBeNull();
    expect(attribution.getAttribution()).toBeNull();
  });

  it("preserves FIRST touch across a later attributed visit", async () => {
    const first = await land("https://www.letszero.in/?gclid=FIRST&utm_campaign=acquire");
    grant(first.consent);
    const carried = globalThis.window.localStorage.getItem(STORAGE_KEY);

    // A second landing, later, in a browser that already holds the record.
    clearBrowser();
    installBrowser("https://www.letszero.in/features?gclid=SECOND&utm_campaign=retarget");
    globalThis.window.localStorage.setItem(STORAGE_KEY, carried);
    vi.resetModules();
    const consent2 = await import("../../client/src/lib/consent.js");
    const attribution2 = await import("../../client/src/lib/analytics/attribution.js");
    grant(consent2);
    attribution2.initAttribution();

    const record = attribution2.getAttribution();
    // The campaign that ACQUIRED the visitor is not overwritten by the one that
    // brought them back — that is the whole point of keeping both.
    expect(record.first.gclid).toBe("FIRST");
    expect(record.first.utm_campaign).toBe("acquire");
    expect(record.last.gclid).toBe("SECOND");
    expect(record.last.utm_campaign).toBe("retarget");
  });

  it("re-validates a hand-edited stored record rather than trusting it", async () => {
    clearBrowser();
    installBrowser("https://www.letszero.in/");
    globalThis.window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        first: { gclid: "OK", email: "customer@example.com", landingPath: "/" },
      }),
    );
    vi.resetModules();
    const attribution = await import("../../client/src/lib/analytics/attribution.js");

    // localStorage is the visitor's to edit, and this value is about to be sent
    // to the server and written into a permanent row.
    const record = attribution.getAttribution();
    expect(record.first.gclid).toBe("OK");
    expect(record.first.email).toBeUndefined();
  });

  it("ignores a record written by a future version", async () => {
    clearBrowser();
    installBrowser("https://www.letszero.in/");
    globalThis.window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 99, first: { gclid: "OK" } }),
    );
    vi.resetModules();
    const attribution = await import("../../client/src/lib/analytics/attribution.js");
    expect(attribution.getAttribution()).toBeNull();
  });

  it("records nothing for a visitor who arrived without an ad", async () => {
    const { consent, attribution } = await land("https://www.letszero.in/pricing");
    grant(consent);

    // An organic visitor must not produce an empty record that later counts as
    // an attributed account.
    expect(stored()).toBeNull();
    expect(attribution.getAttribution()).toBeNull();
  });
});

// ─── The association endpoint ────────────────────────────────────────────────

describe("signup attribution association", () => {
  let httpServer, baseUrl, storage;
  const rand = () => Math.random().toString(36).slice(2);

  beforeAll(async () => {
    clearBrowser();
    vi.resetModules();
    ({ storage } = await import("../../server/storage.js"));
    const { registerRoutes } = await import("../../server/routes.js");
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    httpServer = createServer(app);
    await registerRoutes(httpServer, app);
    await new Promise((r) => httpServer.listen(0, "127.0.0.1", r));
    baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
  });

  afterAll(async () => {
    if (httpServer) await new Promise((r) => httpServer.close(r));
  });

  async function newUser() {
    const user = await storage.createUser({
      username: `attr_${rand()}`,
      email: `attr_${rand()}@example.com`,
      role: "USER",
      plan: "free",
      creditsReceived: 0,
      // Both false exactly as the Google OAuth callback creates a self-serve
      // account. mustResetPassword defaults to TRUE and authMiddleware blocks
      // every route while it is set, so omitting it would test the password
      // gate rather than this endpoint.
      mustResetPassword: false,
      emailVerified: true,
    });
    const session = await storage.createSession(user.id);
    return { user, cookie: `token=${session.token}` };
  }

  const post = (cookie, body) =>
    fetch(`${baseUrl}/api/attribution/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    });

  const rowsFor = (userId) =>
    storage.getAuditLogs({ userId, action: AUDIT_ACTIONS.SIGNUP_ATTRIBUTED, limit: 50 });

  it("requires authentication", async () => {
    const res = await post(null, { attribution: { first: { gclid: "X" } } });
    // Unauthenticated callers cannot write attribution for anyone.
    expect([401, 403]).toContain(res.status);
  });

  it("records exactly one row for a real account", async () => {
    const { user, cookie } = await newUser();
    const res = await post(cookie, {
      attribution: {
        first: { gclid: "CLICK123", utm_source: "google", landingPath: "/pricing" },
        last: { gclid: "CLICK123", utm_source: "google", landingPath: "/pricing" },
      },
    });

    expect(res.status).toBe(200);
    expect((await res.json()).recorded).toBe(true);

    const rows = await rowsFor(user.id);
    expect(rows.length).toBe(1);
    expect(rows[0].details.first.gclid).toBe("CLICK123");
  });

  it("does not write a second row when called again", async () => {
    const { user, cookie } = await newUser();
    await post(cookie, { attribution: { first: { gclid: "FIRST" } } });
    const again = await post(cookie, { attribution: { first: { gclid: "SECOND" } } });

    const body = await again.json();
    expect(body.recorded).toBe(false);
    expect(body.reason).toBe("already_recorded");

    // A page refresh, a re-mount, or a customer re-visiting the onboarding URL
    // must not multiply the account's acquisition record — and must not let a
    // later campaign overwrite the one that acquired them.
    const rows = await rowsFor(user.id);
    expect(rows.length).toBe(1);
    expect(rows[0].details.first.gclid).toBe("FIRST");
  });

  it("records nothing when the caller has no attribution to send", async () => {
    const { user, cookie } = await newUser();
    const res = await post(cookie, { attribution: null });

    expect((await res.json()).recorded).toBe(false);
    // A visitor who declined advertising measurement, or who arrived
    // organically, produces no row at all rather than an empty one.
    expect((await rowsFor(user.id)).length).toBe(0);
  });

  it("strips anything outside the allowlist before it reaches the audit row", async () => {
    const { user, cookie } = await newUser();
    await post(cookie, {
      attribution: {
        first: {
          gclid: "CLICK123",
          email: "customer@example.com",
          password: "hunter2",
          landingPath: "/",
        },
      },
    });

    const rows = await rowsFor(user.id);
    // The body is attacker-controlled; the row is permanent. The server must
    // not store what the client happened to send.
    const serialised = JSON.stringify(rows[0].details);
    expect(serialised).toContain("CLICK123");
    expect(serialised).not.toContain("customer@example.com");
    expect(serialised).not.toContain("hunter2");
  });

  it("bounds an oversized value instead of writing it", async () => {
    const { user, cookie } = await newUser();
    await post(cookie, { attribution: { first: { gclid: "x".repeat(100000) } } });

    const rows = await rowsFor(user.id);
    expect(rows[0].details.first.gclid.length).toBe(MAX_VALUE_LENGTH);
  });

  it("writes the row against the caller's own account only", async () => {
    const a = await newUser();
    const b = await newUser();
    await post(a.cookie, { attribution: { first: { gclid: "A" } } });

    // Attribution is keyed on the authenticated session, never on a body field,
    // so one account cannot write another's acquisition record.
    expect((await rowsFor(a.user.id)).length).toBe(1);
    expect((await rowsFor(b.user.id)).length).toBe(0);
  });
});
