// M52 — AutoPay is arranged by the purchase itself.
//
// Drives the REAL route table with REAL sessions (the Audit-202 lesson:
// middleware-composition and metadata-threading defects are invisible unless a
// real session goes through the real router).
//
// The properties under test, in order of how much they matter:
//
//   1. ⚠️ ARRANGING AUTOPAY MUST NEVER COST THE CUSTOMER THE PURCHASE. Every
//      failure mode degrades to the plain order and a completed sale.
//   2. Both settlement paths bind. A customer who closes the tab after paying
//      must not silently lose the AutoPay they authorised at their bank.
//   3. Binding is idempotent under the verify/webhook race, and re-binding the
//      same instrument is not a "replacement".
//   4. The token is DERIVED from the gateway, never accepted from the client.
//   5. A mandate cannot become a cross-workspace handle via payment metadata.
//   6. Outside the rollout, checkout behaves exactly as it did before M52.
//   7. Terminal is terminal: a late settlement cannot resurrect a revoked card.

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer } from "http";
import { USER_ROLES } from "../../shared/schema.js";
import { SEAT_SETTING_KEYS } from "../../shared/seatEntitlement.js";
import { SEAT_TERMS, quoteSeats } from "../../shared/seatPricing.js";
import { MANDATE_STATUS, MANDATE_METHOD, AUTOPAY_SETTING_KEYS } from "../../shared/autopay.js";
import { bindMandateFromPayment, BIND_SKIP } from "../../server/autopayCheckout.js";

vi.mock("../../server/email.js", () => ({
  sendCampaignEmail: vi.fn(async () => ({ messageId: "m" })),
  sendTransactionalEmail: vi.fn(async () => {}),
  sendPaymentReceiptEmail: vi.fn(async () => {}),
  verifySesConnection: vi.fn(async () => {}),
}));
vi.mock("@sentry/node", () => ({ captureMessage: vi.fn(), captureException: vi.fn(), init: vi.fn(), Handlers: {} }));

const rand = () => Math.random().toString(36).slice(2);
let httpServer, baseUrl, storage;

beforeAll(async () => {
  process.env.FREE_PLAN_ENABLED = "true";
  ({ storage } = await import("../../server/storage.js"));
  const { registerRoutes } = await import("../../server/routes.js");
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  await new Promise((r) => httpServer.listen(0, "127.0.0.1", r));
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
  await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "true", null);
  await storage.setPlatformSetting(SEAT_SETTING_KEYS.FREE_FLOOR, "0", null);
});
afterAll(async () => {
  await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "false", null);
  await storage.setPlatformSetting(AUTOPAY_SETTING_KEYS.SCOPE, "OFF", null);
  httpServer?.close();
});

async function api(method, path, { cookie, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, body: json ?? {} };
}

/** An owner. `senderPhone: null` reproduces a real account that never set one. */
async function makeOwner({ senderPhone = "9999999999" } = {}) {
  const created = await storage.createUser({
    username: `m52_${rand()}`, email: `m52_${rand()}@example.com`,
    password: "pw-" + rand(), role: USER_ROLES.USER, parentId: null,
    plan: "growth", isTrialUser: false, mustResetPassword: false,
  });
  const u = senderPhone ? await storage.updateUser(created.id, { senderPhone }) : created;
  const s = await storage.createSession(u.id);
  return { user: u, cookie: `token=${s.token}` };
}

async function openRollout(rootId, scope = "INTERNAL") {
  await storage.setPlatformSetting(AUTOPAY_SETTING_KEYS.SCOPE, scope, null);
  await storage.setPlatformSetting(AUTOPAY_SETTING_KEYS.ALLOWLIST, rootId, null);
}
const closeRollout = () => storage.setPlatformSetting(AUTOPAY_SETTING_KEYS.SCOPE, "OFF", null);

// ── 1. THE RULE THAT OUTRANKS EVERYTHING ELSE ───────────────────────────────

describe("arranging AutoPay never costs the customer the purchase", () => {
  it("completes the sale and binds when everything works", async () => {
    const owner = await makeOwner();
    await openRollout(owner.user.id);

    const r = await api("POST", "/api/seats/checkout", {
      cookie: owner.cookie, body: { seats: 2, term: SEAT_TERMS.MONTHLY.id },
    });

    expect(r.status).toBe(200);
    // The seats are real.
    expect(r.body.applied?.applied).toBe(true);
    expect(r.body.applied.subscription.seats).toBe(2);
    // And so is the instrument.
    expect(r.body.autopay?.bound).toBe(true);

    const sub = await storage.getWorkspaceSubscription(owner.user.id);
    expect(sub.autopayEnabled).toBe(true);
    expect(sub.mandateId).toBe(r.body.autopay.mandateId);
    const mandate = await storage.getMandate(sub.mandateId);
    expect(mandate.status).toBe(MANDATE_STATUS.ACTIVE);
    expect(mandate.providerTokenId).toBeTruthy();
  });

  it("still sells the seats when the owner has no phone number", async () => {
    // The gateway refuses a recurring order for a customer with no contact
    // (Audit 213). That must cost the AutoPay, not the sale.
    const owner = await makeOwner({ senderPhone: null });
    await openRollout(owner.user.id);

    const r = await api("POST", "/api/seats/checkout", {
      cookie: owner.cookie, body: { seats: 1, term: SEAT_TERMS.MONTHLY.id },
    });

    expect(r.status).toBe(200);
    expect(r.body.applied?.applied).toBe(true);          // THE SALE COMPLETED
    expect(r.body.payment.metadata.autopayUnavailable).toBe("CONTACT_REQUIRED");
    expect(r.body.payment.metadata.mandateId).toBeUndefined();
    expect(r.body.autopay?.bound).toBe(false);

    const sub = await storage.getWorkspaceSubscription(owner.user.id);
    expect(sub.seats).toBe(1);
    // Renewal is manual and the platform knows it — no hidden state.
    expect(sub.autopayEnabled).toBe(false);
    expect(sub.mandateId ?? null).toBeNull();
  });

  it("leaves no orphan mandate row behind when the contact is missing", async () => {
    // The check runs BEFORE anything is created, so a missing number cannot
    // leave a PENDING mandate that the display state would render forever.
    const owner = await makeOwner({ senderPhone: null });
    await openRollout(owner.user.id);
    await api("POST", "/api/seats/checkout", {
      cookie: owner.cookie, body: { seats: 1, term: SEAT_TERMS.MONTHLY.id },
    });
    const r = await api("GET", "/api/seats/subscription", { cookie: owner.cookie });
    expect(r.body.mandate).toBeNull();
    expect(r.body.autopay.displayState).toBe("NOT_SET_UP");
  });

  it("sells the seats when the customer declines AutoPay", async () => {
    const owner = await makeOwner();
    await openRollout(owner.user.id);
    const r = await api("POST", "/api/seats/checkout", {
      cookie: owner.cookie, body: { seats: 1, term: SEAT_TERMS.MONTHLY.id, autopay: false },
    });
    expect(r.status).toBe(200);
    expect(r.body.applied?.applied).toBe(true);
    expect(r.body.payment.metadata.mandateId).toBeUndefined();
    const sub = await storage.getWorkspaceSubscription(owner.user.id);
    expect(sub.autopayEnabled).toBe(false);
  });
});

// ── 6. OUTSIDE THE ROLLOUT, NOTHING CHANGED ─────────────────────────────────

describe("outside the rollout, checkout is exactly what it was before M52", () => {
  it("creates no mandate and asks for no token", async () => {
    const owner = await makeOwner();
    await closeRollout();
    const r = await api("POST", "/api/seats/checkout", {
      cookie: owner.cookie, body: { seats: 2, term: SEAT_TERMS.MONTHLY.id },
    });
    expect(r.status).toBe(200);
    expect(r.body.applied?.applied).toBe(true);
    expect(r.body.payment.metadata.mandateId).toBeUndefined();
    expect(r.body.payment.metadata.autopayAtCheckout).toBeUndefined();
    // Not even a reason — nothing was attempted.
    expect(r.body.payment.metadata.autopayUnavailable).toBeUndefined();
  });

  it("tells a prospective buyer outside the rollout that renewal is manual", async () => {
    const owner = await makeOwner();
    await closeRollout();
    const r = await api("GET", "/api/seats/subscription", { cookie: owner.cookie });
    expect(r.body.renewalMode).toBe("MANUAL");
  });

  it("tells a prospective buyer inside the rollout that renewal is automatic", async () => {
    const owner = await makeOwner();
    await openRollout(owner.user.id);
    const r = await api("GET", "/api/seats/subscription", { cookie: owner.cookie });
    // No subscription yet — this is the pre-purchase answer, and under M52 it
    // must describe what checkout will actually do.
    expect(r.body.subscription).toBeNull();
    expect(r.body.renewalMode).toBe("AUTOMATIC");
  });
});

// ── An existing instrument is never silently replaced ───────────────────────

describe("a workspace that already has an instrument is left alone", () => {
  it("does not register a second mandate on a later seat change", async () => {
    const owner = await makeOwner();
    await openRollout(owner.user.id);

    const first = await api("POST", "/api/seats/checkout", {
      cookie: owner.cookie, body: { seats: 1, term: SEAT_TERMS.MONTHLY.id },
    });
    const originalMandateId = first.body.autopay.mandateId;
    expect(originalMandateId).toBeTruthy();

    // An upgrade. The customer is not re-registering a card they already gave us.
    const upgrade = await api("POST", "/api/seats/checkout", {
      cookie: owner.cookie, body: { seats: 4, term: SEAT_TERMS.MONTHLY.id },
    });
    expect(upgrade.status).toBe(200);
    expect(upgrade.body.payment?.metadata?.mandateId).toBeUndefined();

    const sub = await storage.getWorkspaceSubscription(owner.user.id);
    expect(sub.mandateId).toBe(originalMandateId);   // the SAME card
    expect(sub.seats).toBe(4);
  });
});

// ── 2/3. BOTH SETTLEMENT PATHS, AND THE RACE BETWEEN THEM ───────────────────

describe("the binder is idempotent across both settlement paths", () => {
  /** A settled seat payment carrying a checkout mandate intent. */
  async function settledPurchaseWithIntent() {
    const owner = await makeOwner();
    await openRollout(owner.user.id);
    const r = await api("POST", "/api/seats/checkout", {
      cookie: owner.cookie, body: { seats: 2, term: SEAT_TERMS.MONTHLY.id },
    });
    const payment = await storage.getPayment(r.body.payment.id);
    return { owner, payment, mandateId: r.body.autopay.mandateId };
  }

  it("reports already_bound rather than rebinding when the other path won", async () => {
    const { payment, mandateId } = await settledPurchaseWithIntent();
    // Simulates the webhook arriving after verify already bound.
    const again = await bindMandateFromPayment(payment);
    expect(again.bound).toBe(true);
    expect(again.reason).toBe(BIND_SKIP.ALREADY_BOUND);
    expect(again.mandateId).toBe(mandateId);
  });

  it("re-binding the same instrument does not count as a replacement", async () => {
    // A "replacement" revokes the outgoing instrument. If a duplicate settlement
    // were treated as one, the second delivery would revoke the card it had just
    // bound — and the customer would end up with no working AutoPay at all.
    const { owner, payment, mandateId } = await settledPurchaseWithIntent();
    await bindMandateFromPayment(payment);
    await bindMandateFromPayment(payment);
    const mandate = await storage.getMandate(mandateId);
    expect(mandate.status).toBe(MANDATE_STATUS.ACTIVE);
    const sub = await storage.getWorkspaceSubscription(owner.user.id);
    expect(sub.mandateId).toBe(mandateId);
    expect(sub.autopayEnabled).toBe(true);
  });

  it("survives concurrent settlement without corrupting the pointer", async () => {
    const { owner, payment, mandateId } = await settledPurchaseWithIntent();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => bindMandateFromPayment(payment))
    );
    expect(results.every(r => r.bound)).toBe(true);
    const sub = await storage.getWorkspaceSubscription(owner.user.id);
    expect(sub.mandateId).toBe(mandateId);
  });

  it("is a no-op for a payment that never requested a mandate", async () => {
    const owner = await makeOwner();
    await closeRollout();
    const r = await api("POST", "/api/seats/checkout", {
      cookie: owner.cookie, body: { seats: 1, term: SEAT_TERMS.MONTHLY.id },
    });
    const payment = await storage.getPayment(r.body.payment.id);
    const bind = await bindMandateFromPayment(payment);
    expect(bind.bound).toBe(false);
    expect(bind.reason).toBe(BIND_SKIP.NOT_REQUESTED);
  });
});

// ── 5/7. THE SECURITY PROPERTIES ────────────────────────────────────────────

describe("a mandate id in payment metadata is not a cross-workspace handle", () => {
  it("refuses to bind a mandate belonging to another workspace", async () => {
    const a = await makeOwner();
    const b = await makeOwner();
    await openRollout(b.user.id);

    // B legitimately buys and registers an instrument.
    const bought = await api("POST", "/api/seats/checkout", {
      cookie: b.cookie, body: { seats: 1, term: SEAT_TERMS.MONTHLY.id },
    });
    const bMandateId = bought.body.autopay.mandateId;

    // A's workspace, with a payment row forged to point at B's instrument.
    await openRollout(a.user.id);
    const q = quoteSeats({ seats: 1, term: SEAT_TERMS.MONTHLY.id });
    await storage.applySeatPurchase(a.user.id, {
      seats: 1, term: SEAT_TERMS.MONTHLY.id, pricingVersion: q.version,
      renewalAmountMinor: q.totalMinor,
    });
    const forged = {
      id: "forged", userId: a.user.id,
      metadata: {
        workspaceRootId: a.user.id, mandateId: bMandateId, autopayAtCheckout: true,
      },
    };

    const bind = await bindMandateFromPayment(forged);
    expect(bind.bound).toBe(false);
    expect(bind.reason).toBe(BIND_SKIP.MANDATE_NOT_FOUND);

    // B keeps their card; A gets nothing.
    const aSub = await storage.getWorkspaceSubscription(a.user.id);
    expect(aSub.mandateId ?? null).toBeNull();
    const bSub = await storage.getWorkspaceSubscription(b.user.id);
    expect(bSub.mandateId).toBe(bMandateId);
  });

  it("cannot resurrect a mandate the customer already revoked", async () => {
    const owner = await makeOwner();
    await openRollout(owner.user.id);
    const r = await api("POST", "/api/seats/checkout", {
      cookie: owner.cookie, body: { seats: 1, term: SEAT_TERMS.MONTHLY.id },
    });
    const payment = await storage.getPayment(r.body.payment.id);
    const mandateId = r.body.autopay.mandateId;

    await storage.transitionMandate(mandateId, MANDATE_STATUS.REVOKED);
    await storage.setAutopayEnabled(
      (await storage.getWorkspaceSubscription(owner.user.id)).id, false
    );

    // A redelivered webhook lands after the revocation.
    const late = await bindMandateFromPayment(payment);
    expect(late.bound).toBe(false);
    expect(late.reason).toBe(BIND_SKIP.MANDATE_TERMINAL);
    expect((await storage.getMandate(mandateId)).status).toBe(MANDATE_STATUS.REVOKED);
  });
});

// ── 4. THE TOKEN IS NEVER TAKEN FROM THE CLIENT ─────────────────────────────

describe("the token is derived, never accepted", () => {
  it("the binder takes no token from its inputs", async () => {
    const { readFile } = await import("fs/promises");
    const src = await readFile(new URL("../../server/autopayCheckout.js", import.meta.url), "utf8");
    // Binding an arbitrary gateway token — including somebody else's — and then
    // debiting it is the failure this rules out. `deriveToken` takes a provider
    // payment id and nothing else.
    expect(src).not.toMatch(/req\.body/);
    expect(src).toMatch(/async function deriveToken\(providerPaymentId\)/);
  });

  it("checkout never reads a mandate ceiling from the client", async () => {
    const owner = await makeOwner();
    await openRollout(owner.user.id);
    const r = await api("POST", "/api/seats/checkout", {
      cookie: owner.cookie,
      // A hostile client trying to authorise a far larger standing debit.
      body: { seats: 1, term: SEAT_TERMS.MONTHLY.id, maxAmountMinor: 99_999_00 },
    });
    const mandate = await storage.getMandate(r.body.autopay.mandateId);
    const q = quoteSeats({ seats: 1, term: SEAT_TERMS.MONTHLY.id });
    // Derived from the pricing authority's renewal amount, with 2x headroom.
    expect(mandate.maxAmountMinor).toBe(q.totalMinor * 2);
  });
});

// ── Authorization is unchanged ──────────────────────────────────────────────

describe("only the workspace owner can arrange billing", () => {
  it("a member cannot check out, with or without an autopay intent", async () => {
    const owner = await makeOwner();
    await openRollout(owner.user.id);
    const memberRow = await storage.createUser({
      username: `m52m_${rand()}`, email: `m52m_${rand()}@example.com`,
      password: "pw-" + rand(), role: USER_ROLES.USER, parentId: owner.user.id,
      plan: "growth", isTrialUser: false, mustResetPassword: false,
    });
    const s = await storage.createSession(memberRow.id);
    const r = await api("POST", "/api/seats/checkout", {
      cookie: `token=${s.token}`, body: { seats: 3, term: SEAT_TERMS.MONTHLY.id, autopay: true },
    });
    // 403 — refused by `adminMiddleware`, the coarse pre-filter, before the
    // handler's own `isWorkspaceOwner` gate is even reached. Both are present on
    // this route by design (Audit 202/213): the middleware is not the
    // authorization, it just rejects the easy cases early. The assertion is
    // deliberately on the OUTCOME rather than on which of the two answered.
    expect(r.status).toBe(403);
    // And no mandate was created on the way to the refusal — the intent is
    // prepared inside the handler, which the request never reached.
    const sub = await storage.getWorkspaceSubscription(owner.user.id);
    expect(sub?.mandateId ?? null).toBeNull();
  });

  it("a MANAGER is refused too, by the owner gate rather than the pre-filter", async () => {
    // SUB_ADMIN passes `adminMiddleware`, so this is the case that actually
    // exercises `isWorkspaceOwner` — the distinction Audit 202 was about.
    const owner = await makeOwner();
    await openRollout(owner.user.id);
    const managerRow = await storage.createUser({
      username: `m52mgr_${rand()}`, email: `m52mgr_${rand()}@example.com`,
      password: "pw-" + rand(), role: USER_ROLES.SUB_ADMIN, parentId: owner.user.id,
      plan: "growth", isTrialUser: false, mustResetPassword: false,
    });
    const s = await storage.createSession(managerRow.id);
    const r = await api("POST", "/api/seats/checkout", {
      cookie: `token=${s.token}`, body: { seats: 3, term: SEAT_TERMS.MONTHLY.id, autopay: true },
    });
    expect(r.status).toBe(403);
    expect(r.body.code).toBe("NOT_WORKSPACE_OWNER");
    const sub = await storage.getWorkspaceSubscription(owner.user.id);
    expect(sub?.mandateId ?? null).toBeNull();
  });
});
