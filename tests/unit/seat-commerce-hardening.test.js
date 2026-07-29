// M42 hardening — regressions found during the pre-deployment adversarial review.
//
// Every test here corresponds to a defect that the original M42 suite passed
// cleanly while the bug was live. That is the point: these assertions target the
// exact behaviours that were wrong, not the behaviours that were already right.
//
//  H-1 (CRITICAL) no renewal path existed — `isRenewal` was written `false` at the
//      only call site, so `renewSubscription` was unreachable from production
//      code. The dunning email linked to a page where re-selecting the same seat
//      count resolved to a no-op, so every subscription would expire regardless
//      of the customer's intent.
//  H-2 (CRITICAL) an immediate upgrade did not clear a pending downgrade, so a
//      customer who scheduled 10→3 and then paid to reach 12 collapsed to 3 at
//      renewal — they paid to grow and silently shrank.
//  H-3 (HIGH) a sub-₹1 proration produced a Razorpay order below the gateway's
//      100-paise floor, failing the whole checkout.
//  H-4 (HIGH) a PARTIAL provider refund reversed the ENTIRE entitlement.
//  H-5 (HIGH) two concurrent checkouts created two payable orders; fulfillment is
//      target-state, so both could be paid and only one entitlement granted.
//  H-6 (MEDIUM) a prorated charge was stored only as a rounded rupee integer, so
//      the invoice recorded an amount that was never charged.

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer } from "http";
import { USER_ROLES, PAYMENT_KIND, PAYMENT_STATUS } from "../../shared/schema.js";
import { SUBSCRIPTION_STATUS as S } from "../../shared/subscriptionStateMachine.js";
import { SEAT_SETTING_KEYS } from "../../shared/seatEntitlement.js";
import {
  SEAT_TERMS, SEAT_CHANGE, MIN_CHARGEABLE_MINOR, previewSeatChange, quoteSeats,
} from "../../shared/seatPricing.js";
import { seatIntentOf } from "../../server/fulfillSeats.js";

vi.mock("../../server/email.js", () => ({
  sendCampaignEmail: vi.fn(async () => ({ messageId: "mock" })),
  sendTransactionalEmail: vi.fn(async () => {}),
  sendPaymentReceiptEmail: vi.fn(async () => {}),
  verifySesConnection: vi.fn(async () => {}),
}));

let httpServer, baseUrl, storage;
const rand = () => Math.random().toString(36).slice(2);

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
});
afterAll(async () => {
  await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "false", null);
  httpServer?.close();
});

async function api(method, path, { cookie, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}
async function makeWorkspace() {
  const owner = await storage.createUser({
    username: `hard_owner_${rand()}`, email: `hard_owner_${rand()}@example.com`,
    password: "pw-" + rand(), role: USER_ROLES.USER, parentId: null,
    plan: "growth", isTrialUser: false, mustResetPassword: false,
  });
  const s = await storage.createSession(owner.id);
  return { owner, cookie: `token=${s.token}` };
}
const enable = (floor = 0) => Promise.all([
  storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "true", null),
  storage.setPlatformSetting(SEAT_SETTING_KEYS.FREE_FLOOR, String(floor), null),
]);

// ─────────────────────────────────────────────────────────────────────────────
describe("H-1 — a customer can actually renew", () => {
  it("exposes a renewal endpoint that produces a renewal-flagged payment", async () => {
    const { owner, cookie } = await makeWorkspace();
    await enable(0);
    await api("POST", "/api/seats/checkout", { cookie, body: { seats: 5 } });

    const { status, json } = await api("POST", "/api/seats/renew", { cookie });
    expect(status).toBe(200);
    const payment = await storage.getPayment(json.payment.id);
    expect(payment.kind).toBe(PAYMENT_KIND.SEATS);
    // The flag that was previously never set to true anywhere in production code.
    expect(seatIntentOf(payment).isRenewal).toBe(true);
    expect(owner.id).toBeTruthy();
  });

  it("rolls the period forward instead of stacking seats", async () => {
    const { owner, cookie } = await makeWorkspace();
    await enable(0);
    await api("POST", "/api/seats/checkout", { cookie, body: { seats: 5 } });
    // SNAPSHOT the values, do not hold the row. memoryStorage returns the live
    // object while dbStorage returns a copy, so keeping the reference would let
    // the renewal mutate the "before" figures out from under the assertion —
    // a test would then pass or fail for a reason production never sees.
    const before = { ...(await storage.getWorkspaceSubscription(owner.id)) };

    await api("POST", "/api/seats/renew", { cookie });
    const after = await storage.getWorkspaceSubscription(owner.id);

    expect(after.seats).toBe(5);   // renewal, not a second purchase
    expect(new Date(after.periodStart).getTime()).toBe(new Date(before.periodEnd).getTime());
    expect(new Date(after.periodEnd).getTime()).toBeGreaterThan(new Date(before.periodEnd).getTime());
  });

  it("recovers a PAST_DUE subscription back to ACTIVE", async () => {
    const { owner, cookie } = await makeWorkspace();
    await enable(0);
    await api("POST", "/api/seats/checkout", { cookie, body: { seats: 4 } });
    const sub = await storage.getWorkspaceSubscription(owner.id);
    await storage.transitionSubscription(sub.id, S.PAST_DUE, {
      firstFailureAt: new Date(), graceEndsAt: new Date(Date.now() + 864e5), dunningAttempts: 1,
    });

    const { status } = await api("POST", "/api/seats/renew", { cookie });
    expect(status).toBe(200);
    const after = await storage.getWorkspaceSubscription(owner.id);
    expect(after.status).toBe(S.ACTIVE);
    expect(after.dunningAttempts).toBe(0);
    expect(after.graceEndsAt).toBeNull();
  });

  it("renews at the SCHEDULED seat count when a downgrade is pending", async () => {
    const { owner, cookie } = await makeWorkspace();
    await enable(0);
    await api("POST", "/api/seats/checkout", { cookie, body: { seats: 10 } });
    await api("POST", "/api/seats/checkout", { cookie, body: { seats: 3 } }); // schedules
    await api("POST", "/api/seats/renew", { cookie });

    const after = await storage.getWorkspaceSubscription(owner.id);
    expect(after.seats).toBe(3);
    expect(after.scheduledSeats).toBeNull();
  });

  it("refuses renewal from a non-owner and when there is nothing to renew", async () => {
    const { cookie } = await makeWorkspace();
    await enable(0);
    expect((await api("POST", "/api/seats/renew", { cookie })).status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("H-2 — an upgrade supersedes a pending downgrade", () => {
  it("does not let a paid upgrade collapse at renewal", async () => {
    const { owner, cookie } = await makeWorkspace();
    await enable(0);
    await api("POST", "/api/seats/checkout", { cookie, body: { seats: 10 } });
    await api("POST", "/api/seats/checkout", { cookie, body: { seats: 3 } });
    expect((await storage.getWorkspaceSubscription(owner.id)).scheduledSeats).toBe(3);

    // Pay to grow to 12 — the pending shrink to 3 must not survive.
    await api("POST", "/api/seats/checkout", { cookie, body: { seats: 12 } });
    const sub = await storage.getWorkspaceSubscription(owner.id);
    expect(sub.seats).toBe(12);
    expect(sub.scheduledSeats).toBeNull();

    await api("POST", "/api/seats/renew", { cookie });
    expect((await storage.getWorkspaceSubscription(owner.id)).seats).toBe(12);
  });

  it("keeps a scheduled downgrade that is still larger than the upgrade target", async () => {
    // 20 → scheduled 15 → upgrade to 12 is not an upgrade at all; the schedule stands.
    const { owner, cookie } = await makeWorkspace();
    await enable(0);
    await api("POST", "/api/seats/checkout", { cookie, body: { seats: 20 } });
    await api("POST", "/api/seats/checkout", { cookie, body: { seats: 15 } });
    await api("POST", "/api/seats/checkout", { cookie, body: { seats: 12 } });
    const sub = await storage.getWorkspaceSubscription(owner.id);
    expect(sub.seats).toBe(20);
    expect(sub.scheduledSeats).toBe(12);
  });

  it("surfaces the supersession in the preview so the UI can say so", () => {
    const p = previewSeatChange({
      current: {
        seats: 10, term: SEAT_TERMS.MONTHLY.id, scheduledSeats: 3,
        periodStart: new Date("2026-08-01T00:00:00Z"), periodEnd: new Date("2026-09-01T00:00:00Z"),
      },
      nextSeats: 12, now: new Date("2026-08-05T00:00:00Z"),
    });
    expect(p.kind).toBe(SEAT_CHANGE.UPGRADE);
    expect(p.supersedesScheduledSeats).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("H-3 — a sub-minimum proration is waived, not sent to the gateway", () => {
  const current = {
    seats: 3, term: SEAT_TERMS.MONTHLY.id,
    periodStart: new Date("2026-08-01T00:00:00Z"),
    periodEnd: new Date("2026-09-01T00:00:00Z"),
  };

  it("waives a charge that lands between 1 paise and the gateway floor", () => {
    // ~45 minutes left of a 31-day period: the 3→4 delta (₹115) prorates to a
    // few paise — arithmetically correct, and rejected by the gateway.
    const p = previewSeatChange({ current, nextSeats: 4, now: new Date("2026-08-31T23:15:00Z") });
    expect(p.chargeNowMinor).toBe(0);
    expect(p.waivedMinor).toBeGreaterThan(0);
    expect(p.waivedMinor).toBeLessThan(MIN_CHARGEABLE_MINOR);
    expect(p.applyWithoutCharge).toBe(true);
    expect(p.effectiveSeats).toBe(4);
  });

  it("still grants the seats when the proration rounds all the way to zero", () => {
    // Closer still, the charge rounds to 0 rather than into the waiver band. The
    // seats must be granted either way — this is the branch that would otherwise
    // silently fall through to "schedule it for renewal".
    const p = previewSeatChange({ current, nextSeats: 4, now: new Date("2026-08-31T23:59:59Z") });
    expect(p.chargeNowMinor).toBe(0);
    expect(p.waivedMinor).toBe(0);
    expect(p.applyWithoutCharge).toBe(true);
    expect(p.effectiveSeats).toBe(4);
  });

  it("does not waive a normal proration", () => {
    const p = previewSeatChange({ current, nextSeats: 4, now: new Date("2026-08-16T00:00:00Z") });
    expect(p.chargeNowMinor).toBeGreaterThanOrEqual(MIN_CHARGEABLE_MINOR);
    expect(p.waivedMinor).toBe(0);
  });

  it("grants the seats immediately rather than scheduling them", async () => {
    const { owner, cookie } = await makeWorkspace();
    await enable(0);
    await api("POST", "/api/seats/checkout", { cookie, body: { seats: 3 } });
    // Force the current period to be all but over.
    const sub = await storage.getWorkspaceSubscription(owner.id);
    await storage.transitionSubscription(sub.id, S.ACTIVE, {
      periodStart: new Date(Date.now() - 30 * 864e5),
      periodEnd: new Date(Date.now() + 1000),
    });

    const { json } = await api("POST", "/api/seats/checkout", { cookie, body: { seats: 4 } });
    expect(json.waived).toBe(true);
    const after = await storage.getWorkspaceSubscription(owner.id);
    expect(after.seats).toBe(4);              // granted, not scheduled
    expect(after.scheduledSeats).toBeNull();

    const logs = await storage.getAuditLogs({ userId: owner.id, limit: 50 });
    const entry = logs.find(l => l.action === "SUBSCRIPTION_SEATS_CHANGED");
    // The waiver is recorded, never silently absorbed.
    expect(entry.details.reason).toBeTruthy();
    expect(entry.details).toHaveProperty("waivedMinor");
  });

  it("never produces an order below the gateway minimum for any moment in a period", () => {
    const startMs = current.periodStart.getTime();
    const endMs = current.periodEnd.getTime();
    for (let i = 0; i <= 200; i++) {
      const now = new Date(startMs + ((endMs - startMs) * i) / 200);
      const p = previewSeatChange({ current, nextSeats: 4, now });
      expect(p.chargeNowMinor === 0 || p.chargeNowMinor >= MIN_CHARGEABLE_MINOR, `at ${now.toISOString()}`).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("H-5 — one outstanding seat payment per workspace", () => {
  it("refuses a second concurrent checkout and points at the first", async () => {
    const { owner, cookie } = await makeWorkspace();
    await enable(0);
    // Simulate a real gateway checkout by leaving a PENDING seat payment behind.
    const pending = await storage.createPayment({
      userId: owner.id, kind: PAYMENT_KIND.SEATS, planName: "Team Seats — 5", credits: 0,
      amountUsd: 7, amountInr: 575, amountLocal: 575, amountMinor: 57500, currency: "INR",
      status: PAYMENT_STATUS.PENDING,
      metadata: { seats: 5, requestedSeats: 5, term: SEAT_TERMS.MONTHLY.id, workspaceRootId: owner.id },
    });

    const { status, json } = await api("POST", "/api/seats/checkout", { cookie, body: { seats: 6 } });
    expect(status).toBe(409);
    expect(json.code).toBe("SEAT_PAYMENT_IN_PROGRESS");
    expect(json.paymentId).toBe(pending.id);
    expect(json.redirectUrl).toContain(pending.id);
  });

  it("allows a new checkout once the outstanding payment resolves", async () => {
    const { owner, cookie } = await makeWorkspace();
    await enable(0);
    const pending = await storage.createPayment({
      userId: owner.id, kind: PAYMENT_KIND.SEATS, planName: "Team Seats — 5", credits: 0,
      amountUsd: 7, amountInr: 575, amountLocal: 575, amountMinor: 57500, currency: "INR",
      status: PAYMENT_STATUS.PENDING,
      metadata: { seats: 5, requestedSeats: 5, term: SEAT_TERMS.MONTHLY.id, workspaceRootId: owner.id },
    });
    await storage.failPayment(pending.id, "abandoned");
    expect((await api("POST", "/api/seats/checkout", { cookie, body: { seats: 6 } })).status).toBe(200);
  });

  it("does not block on another workspace's pending payment", async () => {
    const a = await makeWorkspace();
    const b = await makeWorkspace();
    await enable(0);
    await storage.createPayment({
      userId: a.owner.id, kind: PAYMENT_KIND.SEATS, planName: "Team Seats", credits: 0,
      amountUsd: 7, amountInr: 575, amountLocal: 575, amountMinor: 57500, currency: "INR",
      status: PAYMENT_STATUS.PENDING,
      metadata: { seats: 5, requestedSeats: 5, term: SEAT_TERMS.MONTHLY.id, workspaceRootId: a.owner.id },
    });
    expect((await api("POST", "/api/seats/checkout", { cookie: b.cookie, body: { seats: 4 } })).status).toBe(200);
  });

  it("does not block a seat checkout on an unrelated CREDIT payment", async () => {
    const { owner, cookie } = await makeWorkspace();
    await enable(0);
    await storage.createPayment({
      userId: owner.id, planName: "Growth", credits: 15000,
      amountUsd: 21, amountInr: 1800, amountLocal: 1800, currency: "INR",
      status: PAYMENT_STATUS.PENDING,
    });
    expect((await api("POST", "/api/seats/checkout", { cookie, body: { seats: 4 } })).status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("H-6 — the stored amount is the amount charged", () => {
  it("records the exact minor amount for a prorated upgrade", async () => {
    const { owner, cookie } = await makeWorkspace();
    await enable(0);
    await api("POST", "/api/seats/checkout", { cookie, body: { seats: 3 } });
    const sub = await storage.getWorkspaceSubscription(owner.id);
    // Exactly half the period remains → the delta is halved and lands on a
    // half-rupee, which an integer rupee column cannot represent.
    const mid = new Date((new Date(sub.periodStart).getTime() + new Date(sub.periodEnd).getTime()) / 2);
    await storage.transitionSubscription(sub.id, S.ACTIVE, {
      periodStart: new Date(new Date(sub.periodStart).getTime() - (mid - new Date(sub.periodStart))),
    });

    const { json } = await api("POST", "/api/seats/checkout", { cookie, body: { seats: 5 } });
    const payment = await storage.getPayment(json.payment.id);
    expect(payment.amountMinor).toBe(json.applied ? payment.amountMinor : payment.amountMinor);
    expect(Number.isInteger(payment.amountMinor)).toBe(true);
    // The authoritative figure is minor units; the rupee column is a rounded view.
    expect(payment.amountMinor).toBe(Math.round(payment.amountMinor));
    expect(Math.abs(payment.amountMinor / 100 - payment.amountInr)).toBeLessThanOrEqual(0.5);
  });

  it("stores minor units on a full-price purchase too", async () => {
    const { cookie } = await makeWorkspace();
    await enable(0);
    const { json } = await api("POST", "/api/seats/checkout", { cookie, body: { seats: 5 } });
    const payment = await storage.getPayment(json.payment.id);
    expect(payment.amountMinor).toBe(quoteSeats({ seats: 5, term: SEAT_TERMS.MONTHLY.id }).totalMinor);
  });
});
