// M39 Phase 1B — reusable commerce layer (quote / checkout / purchase-intent).
//
// The purchase surfaces share ONE logic layer; these tests pin its contract without
// a DOM render (this repo has no jsdom — a disclosed limitation). They cover the
// complete quote→initiation flow, the custom-vs-plan resolution order that mirrors
// the server, the purchase-intent lifecycle (survives reload/login via storage,
// expires), and the open-redirect guard on the post-login return path.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchQuote } from "../../client/src/lib/commerce/quote.js";
import { initiatePurchase } from "../../client/src/lib/commerce/checkout.js";
import {
  savePurchaseIntent,
  loadPurchaseIntent,
  clearPurchaseIntent,
  intentToCheckoutParams,
  safeNextPath,
  buildLoginWithResume,
} from "../../client/src/lib/commerce/purchaseIntent.js";

// ── fetch mock (apiRequest uses global.fetch) ────────────────────────────────
function mockFetchOnce(body, ok = true, status = 200) {
  global.fetch = vi.fn(async (url, opts) => ({
    ok, status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }));
}
let originalFetch;
beforeEach(() => { originalFetch = global.fetch; });
afterEach(() => { global.fetch = originalFetch; vi.restoreAllMocks(); });

describe("fetchQuote — server-authoritative quote", () => {
  it("POSTs the selection and returns the server quote", async () => {
    mockFetchOnce({ quote: { amountMinor: 180000, totalCredits: 16250, planId: "growth" } });
    const q = await fetchQuote({ planId: "growth" });
    expect(q.amountMinor).toBe(180000);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe("/api/pricing/quote");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toMatchObject({ planId: "growth", currency: "INR" });
  });

  it("passes a custom credit amount through", async () => {
    mockFetchOnce({ quote: { kind: "custom", credits: 47000, amountMinor: 517000 } });
    const q = await fetchQuote({ credits: 47000 });
    expect(q.credits).toBe(47000);
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toMatchObject({ credits: 47000 });
  });
});

describe("initiatePurchase — single canonical checkout entry", () => {
  it("sends planId for a named plan", async () => {
    mockFetchOnce({ payment: { id: "p1" }, redirectUrl: "/app/payments" });
    const data = await initiatePurchase({ planId: "growth" });
    expect(data.redirectUrl).toBe("/app/payments");
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.planId).toBe("growth");
    expect(body.credits).toBeUndefined();
  });

  it("sends credits for a custom amount (and never both)", async () => {
    mockFetchOnce({ payment: { id: "p2" }, gateway: "razorpay" });
    await initiatePurchase({ credits: 47000 });
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.credits).toBe(47000);
    expect(body.planId).toBeUndefined();
  });

  it("prefers planId when both are (incorrectly) supplied — mirrors server order", async () => {
    mockFetchOnce({ payment: {} });
    await initiatePurchase({ planId: "scale", credits: 99999 });
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.planId).toBe("scale");
    expect(body.credits).toBeUndefined();
  });
});

// ── sessionStorage stub for the intent lifecycle ─────────────────────────────
function installStorage() {
  const map = new Map();
  global.window = {
    sessionStorage: {
      getItem: k => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: k => map.delete(k),
    },
  };
  return map;
}

describe("purchase-intent lifecycle", () => {
  afterEach(() => { try { clearPurchaseIntent(); } catch {} delete global.window; });

  it("saves and restores a custom intent (survives a reload within the session)", () => {
    installStorage();
    savePurchaseIntent({ credits: 47000 });
    const rec = loadPurchaseIntent();
    expect(rec.credits).toBe(47000);
    expect(typeof rec.savedAt).toBe("number");
  });

  it("clears intent", () => {
    installStorage();
    savePurchaseIntent({ planId: "growth" });
    clearPurchaseIntent();
    expect(loadPurchaseIntent()).toBeNull();
  });

  it("expires a stale intent (older than the TTL)", () => {
    installStorage();
    savePurchaseIntent({ credits: 5000 });
    // fast-forward past the 1h TTL
    const spy = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 61 * 60 * 1000);
    expect(loadPurchaseIntent()).toBeNull();
    spy.mockRestore();
  });

  it("fails soft when storage is unavailable (SSR/prerender)", () => {
    delete global.window;
    expect(savePurchaseIntent({ credits: 5000 })).toBeNull();
    expect(loadPurchaseIntent()).toBeNull();
  });

  it("normalises intent to checkout params", () => {
    expect(intentToCheckoutParams({ credits: 47000 })).toEqual({ credits: 47000 });
    expect(intentToCheckoutParams({ planId: "growth" })).toEqual({ planId: "growth" });
    expect(intentToCheckoutParams(null)).toBeNull();
  });
});

describe("safeNextPath — open-redirect guard (security)", () => {
  it("allows internal app/pricing/contact paths", () => {
    expect(safeNextPath("/app/payments?resume=1")).toBe("/app/payments?resume=1");
    expect(safeNextPath("/pricing")).toBe("/pricing");
    expect(safeNextPath("/contact?reason=enterprise")).toBe("/contact?reason=enterprise");
  });

  it("rejects off-origin and tricky destinations, using the fallback", () => {
    const fb = "/app/dashboard";
    expect(safeNextPath("https://evil.com")).toBe(fb);
    expect(safeNextPath("//evil.com")).toBe(fb);
    expect(safeNextPath("/\\evil.com")).toBe(fb);
    expect(safeNextPath("/javascript:alert(1)")).toBe(fb);
    expect(safeNextPath("javascript:alert(1)")).toBe(fb);
    expect(safeNextPath("/admin/secrets")).toBe(fb); // not an allow-listed root
    expect(safeNextPath("")).toBe(fb);
    expect(safeNextPath(null)).toBe(fb);
    expect(safeNextPath("relative/path")).toBe(fb);
  });

  it("builds a login URL that encodes the resume destination", () => {
    expect(buildLoginWithResume("/app/payments?resume=1"))
      .toBe("/login?next=%2Fapp%2Fpayments%3Fresume%3D1");
  });
});
