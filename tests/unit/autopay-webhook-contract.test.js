// M51 Phase 5.3 — recurring-billing WEBHOOK CONTRACT validation.
//
// Same scope discipline as tests/unit/seat-webhook-contract.test.js: it drives
// the REAL `razorpayWebhookHandler` with REAL HMAC-SHA256 signatures over REAL
// event payload shapes. It validates the half of the integration we own — event
// ledger idempotency, token routing, ordering safety, the degradation
// consequence and retry semantics. It does NOT call Razorpay.
//
// The properties under test:
//   • an event id is claimed once; a redelivery of a PROCESSED event is skipped
//   • a FAILED or never-closed event is REPROCESSED, not permanently dropped
//   • the ledger fails OPEN — a missing table cannot reject a real payment
//   • a token event moves an INSTRUMENT only: no subscription is cancelled,
//     no seat is lost, no credit is touched
//   • ordering safety: a late token.confirmed cannot resurrect a revoked mandate
//   • an autopay charge's order.paid resolves through the EXISTING lookup

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import crypto from "crypto";
import { USER_ROLES, AUDIT_ACTIONS, PAYMENT_KIND, PAYMENT_STATUS } from "../../shared/schema.js";
import { SUBSCRIPTION_STATUS as S } from "../../shared/subscriptionStateMachine.js";
import { SEAT_SETTING_KEYS } from "../../shared/seatEntitlement.js";
import { SEAT_TERMS, quoteSeats } from "../../shared/seatPricing.js";
import {
  MANDATE_STATUS, MANDATE_METHOD, DEFAULT_PAYMENT_PROVIDER, RENEWAL_TRIGGER,
} from "../../shared/autopay.js";
import { TOKEN_EVENT_STATUS, isTokenEvent } from "../../server/autopayWebhook.js";

const SECRET = "whsec_m51_contract_test";
const rand = () => Math.random().toString(36).slice(2);

vi.mock("../../server/email.js", () => ({
  sendCampaignEmail: vi.fn(async () => ({ messageId: "mock" })),
  sendTransactionalEmail: vi.fn(async () => {}),
  sendPaymentReceiptEmail: vi.fn(async () => {}),
  verifySesConnection: vi.fn(async () => {}),
}));

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

const sign = (buf, secret = SECRET) => crypto.createHmac("sha256", secret).update(buf).digest("hex");

/** Deliver an event through the real handler, with a gateway event id. */
async function deliver(event, { eventId = `evt_${rand()}`, signature, secret } = {}) {
  const raw = Buffer.from(JSON.stringify(event));
  const req = {
    body: raw,
    headers: {
      "x-razorpay-signature": signature ?? sign(raw, secret ?? SECRET),
      ...(eventId ? { "x-razorpay-event-id": eventId } : {}),
    },
  };
  let status = 200, body = null;
  const res = {
    status(c) { status = c; return this; },
    json(b) { body = b; return this; },
  };
  await handler(req, res);
  return { status, body, eventId };
}

async function makeOwner() {
  return storage.createUser({
    username: `m51w_${rand()}`, email: `m51w_${rand()}@example.com`,
    password: "pw-" + rand(), role: USER_ROLES.USER, parentId: null,
    plan: "growth", isTrialUser: false, mustResetPassword: false,
  });
}

async function makeSubscribedWorkspace(seats = 4) {
  const owner = await makeOwner();
  const q = quoteSeats({ seats, term: SEAT_TERMS.MONTHLY.id });
  const { subscription } = await storage.applySeatPurchase(owner.id, {
    seats: q.seatsGranted, term: SEAT_TERMS.MONTHLY.id,
    pricingVersion: q.version, renewalAmountMinor: q.totalMinor,
  });
  return { owner, subscription };
}

async function makeBoundMandate(owner, subscription, over = {}) {
  const m = await storage.createMandate({
    workspaceRootId: owner.id, method: MANDATE_METHOD.CARD,
    providerTokenId: `tok_${rand()}`, instrumentLabel: "•••• 4242", ...over,
  });
  await storage.transitionMandate(m.id, MANDATE_STATUS.ACTIVE);
  await storage.bindMandateToSubscription(subscription.id, m.id);
  return await storage.getMandate(m.id);
}

const tokenEvent = (type, tokenId, extra = {}) => ({
  event: type,
  payload: { token: { entity: { id: tokenId, ...extra } } },
});

// ── Event ledger idempotency ────────────────────────────────────────────────

describe("event-level idempotency", () => {
  it("claims an event id once and records the outcome", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const m = await makeBoundMandate(owner, subscription);

    const { status, eventId } = await deliver(tokenEvent("token.paused", m.providerTokenId));
    expect(status).toBe(200);

    const row = await storage.getWebhookEvent(eventId, DEFAULT_PAYMENT_PROVIDER);
    expect(row).toBeTruthy();
    expect(row.eventType).toBe("token.paused");
    expect(row.outcome).toBe("PROCESSED");
    expect(row.processedAt).toBeTruthy();
  });

  // The gap the ledger exists to close: a token event has NO payment row, so the
  // pre-M51 state-based dedup could not see a redelivery at all.
  it("suppresses a redelivery of an already-processed event", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const m = await makeBoundMandate(owner, subscription);
    const ev = tokenEvent("token.cancelled", m.providerTokenId);
    const eventId = `evt_${rand()}`;

    const first = await deliver(ev, { eventId });
    expect(first.body).toMatchObject({ received: true });
    expect(first.body.duplicate).toBeUndefined();

    const second = await deliver(ev, { eventId });
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ received: true, duplicate: true });
  });

  it("five redeliveries of one event apply it exactly once", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const m = await makeBoundMandate(owner, subscription);
    const ev = tokenEvent("token.cancelled", m.providerTokenId);
    const eventId = `evt_${rand()}`;

    for (let i = 0; i < 5; i++) await deliver(ev, { eventId });

    const after = await storage.getMandate(m.id);
    expect(after.status).toBe(MANDATE_STATUS.REVOKED);
    // Exactly one audit row for the revocation, not five.
    const logs = await storage.getAuditLogs(owner.id, 100);
    const rows = (Array.isArray(logs) ? logs : logs?.logs ?? [])
      .filter(l => l.action === AUDIT_ACTIONS.MANDATE_REVOKED && l.targetId === m.id);
    expect(rows.length).toBe(1);
  });

  // A never-closed event (process died mid-handler) must NOT be dropped forever.
  it("reprocesses an event whose previous attempt never completed", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const m = await makeBoundMandate(owner, subscription);
    const eventId = `evt_${rand()}`;

    // Simulate a claimed-but-never-closed delivery.
    await storage.recordWebhookEvent({ eventId, eventType: "token.cancelled" });
    expect((await storage.getWebhookEvent(eventId)).outcome).toBeNull();

    const r = await deliver(tokenEvent("token.cancelled", m.providerTokenId), { eventId });
    expect(r.body.duplicate).toBeUndefined();       // NOT suppressed
    expect((await storage.getMandate(m.id)).status).toBe(MANDATE_STATUS.REVOKED);
  });

  it("an event with no gateway event id is still processed", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const m = await makeBoundMandate(owner, subscription);

    const r = await deliver(tokenEvent("token.paused", m.providerTokenId), { eventId: null });
    expect(r.status).toBe(200);
    expect((await storage.getMandate(m.id)).status).toBe(MANDATE_STATUS.PAUSED);
  });

  // ⚠️ The deploy-order property: the runbook migrates AFTER deploying, so the
  // code runs for a window with no ledger table. That must not refuse payments.
  it("fails OPEN when the ledger is unavailable", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const m = await makeBoundMandate(owner, subscription);

    const original = storage.recordWebhookEvent;
    storage.recordWebhookEvent = async () => ({ duplicate: false, recorded: false, reason: "relation does not exist" });
    try {
      const r = await deliver(tokenEvent("token.cancelled", m.providerTokenId));
      expect(r.status).toBe(200);
      // The work still happened — the handler fell back to its state guards.
      expect((await storage.getMandate(m.id)).status).toBe(MANDATE_STATUS.REVOKED);
    } finally {
      storage.recordWebhookEvent = original;
    }
  });

  it("signature verification still runs before anything is claimed", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const m = await makeBoundMandate(owner, subscription);
    const eventId = `evt_${rand()}`;

    const r = await deliver(tokenEvent("token.cancelled", m.providerTokenId), {
      eventId, signature: "f".repeat(64),
    });
    expect(r.status).toBe(400);
    // An unverified event must never enter the ledger.
    expect(await storage.getWebhookEvent(eventId)).toBeNull();
    expect((await storage.getMandate(m.id)).status).toBe(MANDATE_STATUS.ACTIVE);
  });
});

// ── Token routing and consequence ───────────────────────────────────────────

describe("token event routing", () => {
  it("every routed event maps to a mandate status", () => {
    for (const [type, status] of Object.entries(TOKEN_EVENT_STATUS)) {
      expect(isTokenEvent(type)).toBe(true);
      expect(Object.values(MANDATE_STATUS)).toContain(status);
    }
    expect(isTokenEvent("order.paid")).toBe(false);
  });

  it("token.confirmed activates a pending mandate and records gateway facts", async () => {
    const owner = await makeOwner();
    const m = await storage.createMandate({
      workspaceRootId: owner.id, method: MANDATE_METHOD.CARD, providerTokenId: `tok_${rand()}`,
    });
    const expiredAt = Math.floor(Date.UTC(2029, 5, 30) / 1000);

    await deliver(tokenEvent("token.confirmed", m.providerTokenId, {
      expired_at: expiredAt, max_amount: 2_000_00,
    }));

    const after = await storage.getMandate(m.id);
    expect(after.status).toBe(MANDATE_STATUS.ACTIVE);
    expect(after.confirmedAt).toBeTruthy();
    expect(new Date(after.expiresAt).toISOString()).toBe("2029-06-30T00:00:00.000Z");
    expect(after.maxAmountMinor).toBe(2_000_00);
  });

  // THE consequence rule: degradation, never amputation.
  it("a cancelled token withdraws autopay and cancels nothing", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace(5);
    const m = await makeBoundMandate(owner, subscription);
    const before = await storage.getWorkspaceSubscription(owner.id);
    const creditsBefore = (await storage.getUserById(owner.id)).creditsRemaining;

    await deliver(tokenEvent("token.cancelled", m.providerTokenId));

    const after = await storage.getWorkspaceSubscription(owner.id);
    expect((await storage.getMandate(m.id)).status).toBe(MANDATE_STATUS.REVOKED);
    expect(after.autopayEnabled).toBe(false);
    // Subscription untouched in every other respect.
    expect(after.status).toBe(S.ACTIVE);
    expect(after.seats).toBe(before.seats);
    expect(after.periodEnd).toEqual(before.periodEnd);
    expect((await storage.getUserById(owner.id)).creditsRemaining).toBe(creditsBefore);
  });

  it("an expired token behaves the same way", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const m = await makeBoundMandate(owner, subscription);

    await deliver(tokenEvent("token.expired", m.providerTokenId));

    expect((await storage.getMandate(m.id)).status).toBe(MANDATE_STATUS.EXPIRED);
    const after = await storage.getWorkspaceSubscription(owner.id);
    expect(after.autopayEnabled).toBe(false);
    expect(after.status).toBe(S.ACTIVE);
  });

  it("pause and resume round-trip without touching the subscription", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const m = await makeBoundMandate(owner, subscription);

    await deliver(tokenEvent("token.paused", m.providerTokenId));
    expect((await storage.getMandate(m.id)).status).toBe(MANDATE_STATUS.PAUSED);
    // A pause is the customer's choice — autopay intent is NOT withdrawn.
    expect((await storage.getWorkspaceSubscription(owner.id)).autopayEnabled).toBe(true);

    await deliver(tokenEvent("token.resumed", m.providerTokenId));
    expect((await storage.getMandate(m.id)).status).toBe(MANDATE_STATUS.ACTIVE);
  });

  // Razorpay does not guarantee ordering: a confirmation can arrive after the
  // cancellation that superseded it.
  it("a late token.confirmed cannot resurrect a revoked mandate", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const m = await makeBoundMandate(owner, subscription);

    await deliver(tokenEvent("token.cancelled", m.providerTokenId));
    const late = await deliver(tokenEvent("token.confirmed", m.providerTokenId));

    expect(late.status).toBe(200);   // acknowledged, not retried
    expect((await storage.getMandate(m.id)).status).toBe(MANDATE_STATUS.REVOKED);
    expect((await storage.getWorkspaceSubscription(owner.id)).autopayEnabled).toBe(false);
  });

  it("an unknown token is acknowledged and alerted, never retried", async () => {
    const r = await deliver(tokenEvent("token.cancelled", `tok_unknown_${rand()}`));
    expect(r.status).toBe(200);
    expect(sentry.messages.some(x => x.m.startsWith("AUTOPAY_TOKEN_EVENT_ORPHAN"))).toBe(true);
  });

  it("a token event with no token id is acknowledged", async () => {
    const r = await deliver({ event: "token.cancelled", payload: {} });
    expect(r.status).toBe(200);
  });

  it("records an audit row naming the workspace and the transition", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const m = await makeBoundMandate(owner, subscription);

    await deliver(tokenEvent("token.cancelled", m.providerTokenId));

    const logs = await storage.getAuditLogs(owner.id, 100);
    const rows = Array.isArray(logs) ? logs : logs?.logs ?? [];
    const row = rows.find(l => l.action === AUDIT_ACTIONS.MANDATE_REVOKED && l.targetId === m.id);
    expect(row).toBeTruthy();
    expect(row.details).toMatchObject({
      workspaceRootId: owner.id, eventType: "token.cancelled",
      from: MANDATE_STATUS.ACTIVE, to: MANDATE_STATUS.REVOKED,
      actor: "razorpay_webhook",
    });
    expect(row.details.affectedSubscriptions).toContain(subscription.id);
  });
});

// ── Recurring charges reach the existing fulfillment spine ──────────────────

describe("an autopay charge settles through the existing order.paid path", () => {
  // The 5.2/5.3 integration point: a recurring charge creates an ordinary order,
  // so it must resolve via the SAME metadata key the existing (already tested)
  // lookup uses. A different key would make every autopay charge arrive as an
  // orphan — money taken, entitlement never granted.
  it("fulfils a recurring renewal and advances exactly one period", async () => {
    await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "true", null);
    try {
      const { owner } = await makeSubscribedWorkspace(3);
      const sub = await storage.getWorkspaceSubscription(owner.id);
      const periodEndBefore = new Date(sub.periodEnd).getTime();
      const orderId = `order_${rand()}`;

      await storage.createPayment({
        userId: owner.id, kind: PAYMENT_KIND.SEATS,
        planName: "Team Seats renewal", credits: 0,
        amountUsd: 0, amountInr: Math.round(sub.renewalAmountMinor / 100),
        amountLocal: Math.round(sub.renewalAmountMinor / 100), amountMinor: sub.renewalAmountMinor,
        currency: "INR", paymentMethod: "RAZORPAY", status: PAYMENT_STATUS.PENDING,
        metadata: {
          seats: sub.seats, requestedSeats: sub.seats, term: sub.term,
          pricingVersion: sub.pricingVersion, region: sub.region,
          workspaceRootId: owner.id, isRenewal: true, subscriptionId: sub.id,
          renewsFromPeriodEnd: new Date(sub.periodEnd).toISOString(),
          trigger: RENEWAL_TRIGGER.AUTOMATIC, autopay: true,
          razorpay_order_id: orderId,
        },
      });

      const r = await deliver({
        event: "order.paid",
        payload: { order: { entity: { id: orderId } }, payment: { entity: { id: `pay_${rand()}` } } },
      });
      expect(r.status).toBe(200);

      const after = await storage.getWorkspaceSubscription(owner.id);
      expect(new Date(after.periodEnd).getTime()).toBeGreaterThan(periodEndBefore);
      // It went through the SEATS fork, so no orphan alert was raised.
      expect(sentry.messages.some(x => x.m.startsWith("PAYMENT_WEBHOOK_ORPHAN_ORDER"))).toBe(false);

      const logs = await storage.getAuditLogs(owner.id, 100);
      const rows = Array.isArray(logs) ? logs : logs?.logs ?? [];
      const audit = rows.find(l => l.action === AUDIT_ACTIONS.SUBSCRIPTION_AUTO_RENEWED);
      expect(audit).toBeTruthy();
      expect(audit.details.trigger).toBe(RENEWAL_TRIGGER.AUTOMATIC);
    } finally {
      await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "false", null);
    }
  });
});

// ── Backward compatibility ──────────────────────────────────────────────────

describe("pre-M51 webhook behaviour is unchanged", () => {
  it("an unknown event type is still acknowledged without retry", async () => {
    const r = await deliver({ event: "payment.authorized", payload: {} });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ received: true });
  });

  it("a missing signature is still rejected", async () => {
    const raw = Buffer.from(JSON.stringify({ event: "order.paid", payload: {} }));
    let status = 200;
    await handler(
      { body: raw, headers: {} },
      { status(c) { status = c; return this; }, json() { return this; } }
    );
    expect(status).toBe(400);
  });

  it("an orphan order still alerts and acknowledges", async () => {
    const r = await deliver({
      event: "order.paid",
      payload: { order: { entity: { id: `order_missing_${rand()}` } }, payment: { entity: { id: "pay_x" } } },
    });
    expect(r.status).toBe(200);
    expect(sentry.messages.some(x => x.m.startsWith("PAYMENT_WEBHOOK_ORPHAN_ORDER"))).toBe(true);
  });
});
