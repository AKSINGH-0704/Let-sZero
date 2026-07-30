// M42 — Razorpay WEBHOOK CONTRACT validation.
//
// SCOPE, stated precisely so this file is never mistaken for gateway validation:
// it drives the REAL `razorpayWebhookHandler` with REAL HMAC-SHA256 signatures
// over REAL event payload shapes. It validates the half of the integration we
// own — signature verification, event routing, the CREDITS/SEATS fork,
// idempotency, retry semantics, refund/dispute reversal and reconciliation
// alerting. It does NOT call Razorpay: order creation, hosted checkout, payment
// capture and settlement are the gateway's behaviour and remain unvalidated
// (backlog SEAT-012 — this environment has only LIVE keys, and validating
// against them would move real money).
//
// Before this file, NOTHING in the suite drove the webhook handler. Every seat
// branch inside it — the one place a paid seat order becomes an entitlement —
// was reachable only in production.

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import crypto from "crypto";
import { USER_ROLES, PAYMENT_KIND, PAYMENT_STATUS } from "../../shared/schema.js";
import { SEAT_SETTING_KEYS } from "../../shared/seatEntitlement.js";
import { SEAT_TERMS, quoteSeats } from "../../shared/seatPricing.js";

const SECRET = "whsec_m42_contract_test";
const rand = () => Math.random().toString(36).slice(2);

vi.mock("../../server/email.js", () => ({
  sendCampaignEmail: vi.fn(async () => ({ messageId: "mock" })),
  sendTransactionalEmail: vi.fn(async () => {}),
  sendPaymentReceiptEmail: vi.fn(async () => {}),
  verifySesConnection: vi.fn(async () => {}),
}));

// Sentry is imported by the handler; capture what it would have alerted on so the
// reconciliation paths can be asserted rather than assumed.
const sentry = { messages: [], exceptions: [] };
vi.mock("@sentry/node", () => ({
  captureMessage: (m, ctx) => sentry.messages.push({ m, ctx }),
  captureException: (e, ctx) => sentry.exceptions.push({ e, ctx }),
}));

let storage, handler, priorSecret;

beforeAll(async () => {
  priorSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
  process.env.FREE_PLAN_ENABLED = "true";
  ({ storage } = await import("../../server/storage.js"));
  ({ razorpayWebhookHandler: handler } = await import("../../server/razorpayWebhook.js"));
});
afterAll(async () => {
  if (priorSecret === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
  else process.env.RAZORPAY_WEBHOOK_SECRET = priorSecret;
  await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "false", null);
});
beforeEach(() => { sentry.messages = []; sentry.exceptions = []; });

/** Sign a payload exactly as Razorpay does: HMAC-SHA256 of the RAW body. */
function sign(bodyBuf, secret = SECRET) {
  return crypto.createHmac("sha256", secret).update(bodyBuf).digest("hex");
}
/** Deliver an event through the real handler. Returns { status, body }. */
async function deliver(event, { signature, secret } = {}) {
  const raw = Buffer.from(JSON.stringify(event));
  const req = {
    body: raw,
    headers: { "x-razorpay-signature": signature ?? sign(raw, secret ?? SECRET) },
  };
  let status = 200, body = null;
  const res = {
    status(c) { status = c; return this; },
    json(b) { body = b; return this; },
  };
  await handler(req, res);
  return { status, body };
}

async function makeOwner() {
  return storage.createUser({
    username: `wh_owner_${rand()}`, email: `wh_owner_${rand()}@example.com`,
    password: "pw-" + rand(), role: USER_ROLES.USER, parentId: null,
    plan: "growth", isTrialUser: false, mustResetPassword: false,
  });
}
async function makeMember(owner) {
  return storage.createUser({
    username: `wh_m_${rand()}`, email: `wh_m_${rand()}@example.com`,
    password: "pw-" + rand(), role: USER_ROLES.USER, parentId: owner.id,
    plan: owner.plan, isTrialUser: false, mustResetPassword: false,
  });
}
/** A PENDING seat payment with a Razorpay order id, exactly as checkout creates it. */
async function pendingSeatPayment(owner, seats, orderId) {
  const q = quoteSeats({ seats, term: SEAT_TERMS.MONTHLY.id });
  return storage.createPayment({
    userId: owner.id, kind: PAYMENT_KIND.SEATS,
    planName: `Team Seats — ${q.seatsGranted} × Monthly`, credits: 0,
    amountUsd: 0, amountInr: Math.round(q.totalMinor / 100),
    amountLocal: Math.round(q.totalMinor / 100), amountMinor: q.totalMinor,
    currency: "INR", exchangeRate: "83.5", paymentMethod: "RAZORPAY",
    status: PAYMENT_STATUS.PENDING,
    metadata: {
      seats: q.seatsGranted, requestedSeats: seats, term: SEAT_TERMS.MONTHLY.id,
      pricingVersion: q.version, region: "IN", workspaceRootId: owner.id,
      isRenewal: false, razorpay_order_id: orderId,
    },
  });
}
const orderPaid = (orderId, payId) => ({
  event: "order.paid",
  payload: { order: { entity: { id: orderId } }, payment: { entity: { id: payId } } },
});
const refundEvent = (kind, rzpPaymentId, amount) => ({
  event: kind,
  payload: { refund: { entity: { id: "rfnd_" + rand(), payment_id: rzpPaymentId, amount } } },
});
const enable = (floor = 0) => Promise.all([
  storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "true", null),
  storage.setPlatformSetting(SEAT_SETTING_KEYS.FREE_FLOOR, String(floor), null),
]);

// ─────────────────────────────────────────────────────────────────────────────
describe("signature verification", () => {
  it("accepts a correctly signed payload", async () => {
    const owner = await makeOwner();
    const orderId = "order_" + rand();
    await pendingSeatPayment(owner, 5, orderId);
    const r = await deliver(orderPaid(orderId, "pay_" + rand()));
    expect(r.status).toBe(200);
  });

  it("rejects a tampered signature", async () => {
    const r = await deliver(orderPaid("order_x", "pay_x"), { signature: "deadbeef".repeat(8) });
    expect(r.status).toBe(400);
    expect(r.body.message).toMatch(/Invalid signature/i);
    expect(sentry.messages.some(x => /PAYMENT_WEBHOOK_VERIFY_FAILED/.test(x.m))).toBe(true);
  });

  it("rejects a payload signed with the wrong secret", async () => {
    const r = await deliver(orderPaid("order_x", "pay_x"), { secret: "whsec_attacker" });
    expect(r.status).toBe(400);
  });

  it("rejects a missing signature header", async () => {
    const raw = Buffer.from(JSON.stringify(orderPaid("o", "p")));
    let status = 200; const res = { status(c) { status = c; return this; }, json() { return this; } };
    await handler({ body: raw, headers: {} }, res);
    expect(status).toBe(400);
  });

  it("rejects a malformed signature without throwing (length mismatch in timingSafeEqual)", async () => {
    const r = await deliver(orderPaid("o", "p"), { signature: "abc" });
    expect(r.status).toBe(400);
  });

  it("REPLAY: the same body+signature cannot change state twice", async () => {
    const owner = await makeOwner();
    const orderId = "order_" + rand();
    const p = await pendingSeatPayment(owner, 5, orderId);
    await enable(0);
    const evt = orderPaid(orderId, "pay_" + rand());
    const raw = Buffer.from(JSON.stringify(evt));
    const sig = sign(raw);

    const first = await deliver(evt, { signature: sig });
    const second = await deliver(evt, { signature: sig });
    const third = await deliver(evt, { signature: sig });
    expect([first.status, second.status, third.status]).toEqual([200, 200, 200]);

    // A valid signature is replayable by design (Razorpay retries are exactly
    // that); safety comes from idempotency, not from rejecting the replay.
    const sub = await storage.getWorkspaceSubscription(owner.id);
    expect(sub.seats).toBe(5);
    expect((await storage.getPayment(p.id)).status).toBe(PAYMENT_STATUS.SUCCESS);
  });

  it("rejects a valid signature over invalid JSON", async () => {
    const raw = Buffer.from("{not json");
    const r = await (async () => {
      let status = 200, body = null;
      const res = { status(c) { status = c; return this; }, json(b) { body = b; return this; } };
      await handler({ body: raw, headers: { "x-razorpay-signature": sign(raw) } }, res);
      return { status, body };
    })();
    expect(r.status).toBe(400);
    expect(r.body.message).toMatch(/Invalid JSON/i);
  });
});

describe("order.paid → seat entitlement", () => {
  it("grants the entitlement and completes the payment", async () => {
    const owner = await makeOwner();
    const orderId = "order_" + rand();
    const p = await pendingSeatPayment(owner, 5, orderId);
    await enable(0);

    const r = await deliver(orderPaid(orderId, "pay_" + rand()));
    expect(r.status).toBe(200);
    expect((await storage.getPayment(p.id)).status).toBe(PAYMENT_STATUS.SUCCESS);
    const sub = await storage.getWorkspaceSubscription(owner.id);
    expect(sub.seats).toBe(5);
    expect((await storage.resolveSeatEntitlement(owner.id)).seats).toBe(5);
  });

  it("grants the best-price seat count, not the requested one", async () => {
    const owner = await makeOwner();
    const orderId = "order_" + rand();
    await pendingSeatPayment(owner, 9, orderId);   // 9 requested → 10 granted
    await deliver(orderPaid(orderId, "pay_" + rand()));
    expect((await storage.getWorkspaceSubscription(owner.id)).seats).toBe(10);
  });

  it("writes NO credit-ledger row for a seat payment", async () => {
    const owner = await makeOwner();
    const orderId = "order_" + rand();
    await pendingSeatPayment(owner, 5, orderId);
    const before = await storage.getTotalCreditsAvailable(owner.id);
    await deliver(orderPaid(orderId, "pay_" + rand()));
    expect((await storage.getTotalCreditsAvailable(owner.id)).paid).toBe(before.paid);
    const txns = await storage.getCreditTransactions(owner.id, 50);
    expect(txns.some(t => t.type === "purchase")).toBe(false);
  });

  it("DUPLICATE delivery does not double-grant", async () => {
    const owner = await makeOwner();
    const orderId = "order_" + rand();
    await pendingSeatPayment(owner, 5, orderId);
    await enable(0);
    await deliver(orderPaid(orderId, "pay_a" + rand()));
    // Razorpay may redeliver with a different payment entity id.
    await deliver(orderPaid(orderId, "pay_b" + rand()));
    expect((await storage.getWorkspaceSubscription(owner.id)).seats).toBe(5);
  });

  it("a CREDIT payment still credits and upgrades the plan (no regression)", async () => {
    const owner = await makeOwner();
    const orderId = "order_" + rand();
    const p = await storage.createPayment({
      userId: owner.id, planName: "Starter", credits: 3000,
      amountUsd: 5, amountInr: 390, amountLocal: 390, currency: "INR",
      status: PAYMENT_STATUS.PENDING, paymentMethod: "RAZORPAY",
      metadata: { razorpay_order_id: orderId },
    });
    const before = (await storage.getTotalCreditsAvailable(owner.id)).paid;
    await deliver(orderPaid(orderId, "pay_" + rand()));
    expect((await storage.getPayment(p.id)).status).toBe(PAYMENT_STATUS.SUCCESS);
    expect((await storage.getTotalCreditsAvailable(owner.id)).paid).toBe(before + 3000);
    // Seats untouched by a credit purchase.
    expect(await storage.getWorkspaceSubscription(owner.id)).toBeNull();
  });

  it("RECONCILIATION: a paid order we have no record of alerts and does not 500", async () => {
    const r = await deliver(orderPaid("order_unknown_" + rand(), "pay_" + rand()));
    expect(r.status).toBe(200); // 200 so Razorpay stops retrying an unfixable event
    expect(sentry.messages.some(x => /PAYMENT_WEBHOOK_ORPHAN_ORDER/.test(x.m))).toBe(true);
  });

  it("tolerates a malformed order.paid payload", async () => {
    const r = await deliver({ event: "order.paid", payload: {} });
    expect(r.status).toBe(200);
  });
});

describe("payment.failed and abandoned checkout", () => {
  it("marks a pending seat payment FAILED and grants nothing", async () => {
    const owner = await makeOwner();
    const orderId = "order_" + rand();
    const p = await pendingSeatPayment(owner, 5, orderId);
    const r = await deliver({
      event: "payment.failed",
      payload: { payment: { entity: { order_id: orderId, error_description: "card declined" } } },
    });
    expect(r.status).toBe(200);
    expect((await storage.getPayment(p.id)).status).toBe(PAYMENT_STATUS.FAILED);
    expect(await storage.getWorkspaceSubscription(owner.id)).toBeNull();
  });

  it("never downgrades an already-successful payment", async () => {
    const owner = await makeOwner();
    const orderId = "order_" + rand();
    const p = await pendingSeatPayment(owner, 5, orderId);
    await deliver(orderPaid(orderId, "pay_" + rand()));
    await deliver({ event: "payment.failed", payload: { payment: { entity: { order_id: orderId } } } });
    expect((await storage.getPayment(p.id)).status).toBe(PAYMENT_STATUS.SUCCESS);
    expect((await storage.getWorkspaceSubscription(owner.id)).seats).toBe(5);
  });
});

describe("refund → entitlement reversal", () => {
  it("a FULL refund ends the entitlement and trims headcount", async () => {
    const owner = await makeOwner();
    const orderId = "order_" + rand(), rzpPay = "pay_" + rand();
    const p = await pendingSeatPayment(owner, 5, orderId);
    await enable(1);
    await deliver(orderPaid(orderId, rzpPay));
    for (let i = 0; i < 4; i++) { await makeMember(owner); await new Promise(r => setTimeout(r, 2)); }

    const charged = (await storage.getPayment(p.id)).amountMinor;
    const r = await deliver(refundEvent("refund.processed", rzpPay, charged));
    expect(r.status).toBe(200);
    expect(await storage.getWorkspaceSubscription(owner.id)).toBeNull();
    expect((await storage.getPayment(p.id)).status).toBe(PAYMENT_STATUS.REFUNDED);
    expect((await storage.resolveSeatEntitlement(owner.id)).seats).toBe(1);
  });

  it("a PARTIAL refund is escalated and does NOT destroy the subscription", async () => {
    const owner = await makeOwner();
    const orderId = "order_" + rand(), rzpPay = "pay_" + rand();
    const p = await pendingSeatPayment(owner, 5, orderId);
    await enable(1);
    await deliver(orderPaid(orderId, rzpPay));

    const charged = (await storage.getPayment(p.id)).amountMinor;
    const r = await deliver(refundEvent("refund.processed", rzpPay, Math.floor(charged / 2)));
    expect(r.status).toBe(200);
    expect((await storage.getWorkspaceSubscription(owner.id)).seats).toBe(5); // intact
    expect((await storage.getPayment(p.id)).status).toBe(PAYMENT_STATUS.SUCCESS);
    expect(sentry.messages.some(x => /SEAT_PARTIAL_REFUND_MANUAL_REVIEW/.test(x.m))).toBe(true);
  });

  it("credits are never touched by a seat refund", async () => {
    const owner = await makeOwner();
    await storage.addCredits(owner.id, 9000, "PAYMENT_SUCCESS", {});
    const before = (await storage.getTotalCreditsAvailable(owner.id)).paid;
    const orderId = "order_" + rand(), rzpPay = "pay_" + rand();
    const p = await pendingSeatPayment(owner, 5, orderId);
    await enable(1);
    await deliver(orderPaid(orderId, rzpPay));
    await deliver(refundEvent("refund.processed", rzpPay, (await storage.getPayment(p.id)).amountMinor));
    expect((await storage.getTotalCreditsAvailable(owner.id)).paid).toBe(before);
  });

  it("a duplicate refund webhook is idempotent", async () => {
    const owner = await makeOwner();
    const orderId = "order_" + rand(), rzpPay = "pay_" + rand();
    const p = await pendingSeatPayment(owner, 5, orderId);
    await enable(1);
    await deliver(orderPaid(orderId, rzpPay));
    const charged = (await storage.getPayment(p.id)).amountMinor;
    await deliver(refundEvent("refund.created", rzpPay, charged));
    const r2 = await deliver(refundEvent("refund.processed", rzpPay, charged));
    expect(r2.status).toBe(200);
    expect((await storage.getPayment(p.id)).status).toBe(PAYMENT_STATUS.REFUNDED);
  });

  it("RECONCILIATION: a refund for an unknown payment alerts and does not 500", async () => {
    const r = await deliver(refundEvent("refund.processed", "pay_ghost_" + rand(), 100));
    expect(r.status).toBe(200);
    expect(sentry.messages.some(x => /PAYMENT_REFUND_ORPHAN/.test(x.m))).toBe(true);
  });
});

describe("disputes / chargebacks", () => {
  it("a LOST dispute on a seat payment reverses the entitlement", async () => {
    const owner = await makeOwner();
    const orderId = "order_" + rand(), rzpPay = "pay_" + rand();
    const p = await pendingSeatPayment(owner, 5, orderId);
    await enable(1);
    await deliver(orderPaid(orderId, rzpPay));

    const r = await deliver({
      event: "payment.dispute.lost",
      payload: { dispute: { entity: { id: "disp_" + rand(), payment_id: rzpPay, amount: 57500 } } },
    });
    expect(r.status).toBe(200);
    expect(await storage.getWorkspaceSubscription(owner.id)).toBeNull();
    expect((await storage.getPayment(p.id)).status).toBe(PAYMENT_STATUS.REFUNDED);
    expect(sentry.messages.some(x => /PAYMENT_DISPUTE_LOST/.test(x.m))).toBe(true);
  });

  it("a CREATED dispute alerts but changes nothing", async () => {
    const owner = await makeOwner();
    const orderId = "order_" + rand(), rzpPay = "pay_" + rand();
    await pendingSeatPayment(owner, 5, orderId);
    await enable(0);
    await deliver(orderPaid(orderId, rzpPay));
    await deliver({ event: "payment.dispute.created", payload: { dispute: { entity: { id: "d1", payment_id: rzpPay } } } });
    expect((await storage.getWorkspaceSubscription(owner.id)).seats).toBe(5);
    expect(sentry.messages.some(x => /PAYMENT_DISPUTE_CREATED/.test(x.m))).toBe(true);
  });
});

describe("retry semantics", () => {
  it("returns 500 on an unexpected fulfilment error so Razorpay RETRIES", async () => {
    const owner = await makeOwner();
    const orderId = "order_" + rand();
    await pendingSeatPayment(owner, 5, orderId);
    const real = storage.completePayment;
    storage.completePayment = async () => { throw new Error("transient db failure"); };
    try {
      const r = await deliver(orderPaid(orderId, "pay_" + rand()));
      expect(r.status).toBe(500);
      expect(sentry.exceptions.some(x => x.ctx?.tags?.alert === "PAYMENT_WEBHOOK_FULFILLMENT_FAILED")).toBe(true);
    } finally {
      storage.completePayment = real;
    }
  });

  it("a retry after a transient failure completes the grant exactly once", async () => {
    const owner = await makeOwner();
    const orderId = "order_" + rand();
    await pendingSeatPayment(owner, 5, orderId);
    await enable(0);
    const real = storage.completePayment;
    let calls = 0;
    storage.completePayment = async (...a) => {
      if (++calls === 1) throw new Error("transient");
      return real.apply(storage, a);
    };
    try {
      expect((await deliver(orderPaid(orderId, "pay_" + rand()))).status).toBe(500);
      expect((await deliver(orderPaid(orderId, "pay_" + rand()))).status).toBe(200);
    } finally { storage.completePayment = real; }
    expect((await storage.getWorkspaceSubscription(owner.id)).seats).toBe(5);
  });

  it("returns 200 for an unhandled event type so Razorpay stops retrying", async () => {
    expect((await deliver({ event: "subscription.charged", payload: {} })).status).toBe(200);
    expect((await deliver({ event: "payment.dispute.won", payload: { dispute: { entity: {} } } })).status).toBe(200);
    expect((await deliver({ event: "payment.dispute.closed", payload: { dispute: { entity: {} } } })).status).toBe(200);
  });
});

describe("misconfiguration", () => {
  it("rejects every webhook and alerts when the secret is unset", async () => {
    const saved = process.env.RAZORPAY_WEBHOOK_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    try {
      const r = await deliver(orderPaid("o", "p"));
      expect(r.status).toBe(500);
      expect(sentry.messages.some(x => /PAYMENT_WEBHOOK_NOT_CONFIGURED/.test(x.m))).toBe(true);
    } finally { process.env.RAZORPAY_WEBHOOK_SECRET = saved; }
  });
});

describe("invoice / amount fidelity through the webhook", () => {
  it("the stored minor amount equals the engine quote after fulfilment", async () => {
    const owner = await makeOwner();
    const orderId = "order_" + rand();
    const p = await pendingSeatPayment(owner, 5, orderId);
    await deliver(orderPaid(orderId, "pay_" + rand()));
    const after = await storage.getPayment(p.id);
    expect(after.amountMinor).toBe(quoteSeats({ seats: 5, term: SEAT_TERMS.MONTHLY.id }).totalMinor);
    expect(after.invoiceNumber).toMatch(/^INV-/);
    expect(after.subscriptionId).toBe((await storage.getWorkspaceSubscription(owner.id)).id);
  });
});
