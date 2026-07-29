// M42 Phase 4 — seat money paths.
//
// The failure this file exists to prevent: a SEATS payment reaching a CREDITS
// code path. Before M42 every payment bought credits, so completePayment wrote a
// credit-ledger row and refundPayment clawed credits back. Both are wrong for a
// seat, and both fail SILENTLY (0 credits moved, payment marked REFUNDED, seats
// still live). These tests pin the fork at every place money moves.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { USER_ROLES, PAYMENT_KIND, PAYMENT_STATUS } from "../../shared/schema.js";
import { SUBSCRIPTION_STATUS as S } from "../../shared/subscriptionStateMachine.js";
import { SEAT_SETTING_KEYS } from "../../shared/seatEntitlement.js";
import { SEAT_TERMS, quoteSeats } from "../../shared/seatPricing.js";
import {
  fulfillSeatPayment, reverseSeatPayment, isSeatPayment, seatIntentOf,
} from "../../server/fulfillSeats.js";
import { processDueSubscription, runSeatRenewalSweep } from "../../server/seatRenewal.js";

let storage;
const rand = () => Math.random().toString(36).slice(2);

async function makeOwner() {
  return storage.createUser({
    username: `m42p_owner_${rand()}`, email: `m42p_owner_${rand()}@example.com`,
    password: "pw-" + rand(), role: USER_ROLES.USER, parentId: null,
    plan: "free", isTrialUser: false, mustResetPassword: false,
  });
}
async function makeMember(owner) {
  return storage.createUser({
    username: `m42p_member_${rand()}`, email: `m42p_member_${rand()}@example.com`,
    password: "pw-" + rand(), role: USER_ROLES.USER, parentId: owner.id,
    plan: owner.plan, isTrialUser: false, mustResetPassword: false,
  });
}
/** A settled SEATS payment, exactly as /api/seats/checkout would create it. */
async function seatPayment(owner, seats, term = SEAT_TERMS.MONTHLY.id, extra = {}) {
  const q = quoteSeats({ seats, term });
  return storage.createPayment({
    userId: owner.id, kind: PAYMENT_KIND.SEATS,
    planName: `Team Seats — ${q.seatsGranted} × ${term}`, credits: 0,
    amountUsd: 0, amountInr: Math.round(q.totalMinor / 100), amountLocal: Math.round(q.totalMinor / 100),
    currency: "INR", exchangeRate: "83.5", paymentMethod: "SIMULATED",
    status: PAYMENT_STATUS.SUCCESS,
    metadata: {
      // Mirrors /api/seats/checkout exactly: the ENTITLEMENT target plus what the
      // buyer actually asked for.
      seats: q.seatsGranted, requestedSeats: seats,
      term, pricingVersion: q.version, region: q.region,
      workspaceRootId: owner.id, isRenewal: false, ...extra,
    },
  });
}
async function enableBilling(floor = 1) {
  await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "true", null);
  await storage.setPlatformSetting(SEAT_SETTING_KEYS.FREE_FLOOR, String(floor), null);
}

beforeAll(async () => {
  process.env.FREE_PLAN_ENABLED = "true";
  ({ storage } = await import("../../server/storage.js"));
});
afterAll(async () => {
  await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "false", null);
});

describe("payment kind discriminates the product", () => {
  it("defaults every payment to CREDITS", async () => {
    const owner = await makeOwner();
    const p = await storage.createPayment({
      userId: owner.id, planName: "Growth", credits: 15000,
      amountUsd: 21, amountInr: 1800, amountLocal: 1800, currency: "INR",
      status: PAYMENT_STATUS.PENDING,
    });
    expect(p.kind).toBe(PAYMENT_KIND.CREDITS);
    expect(isSeatPayment(p)).toBe(false);
  });

  it("recognises a seat payment and its intent", async () => {
    const owner = await makeOwner();
    const p = await seatPayment(owner, 5);
    expect(isSeatPayment(p)).toBe(true);
    const intent = seatIntentOf(p);
    expect(intent.seats).toBe(5);
    expect(intent.requestedSeats).toBe(5);
    expect(intent.term).toBe(SEAT_TERMS.MONTHLY.id);
  });

  it("refuses to read seat intent from a credit payment", async () => {
    const owner = await makeOwner();
    const p = await storage.createPayment({
      userId: owner.id, planName: "Growth", credits: 15000,
      amountUsd: 21, amountInr: 1800, amountLocal: 1800, currency: "INR",
      status: PAYMENT_STATUS.PENDING, metadata: { seats: 99, term: "MONTHLY" },
    });
    expect(seatIntentOf(p)).toBeNull();  // kind, not metadata, decides
  });
});

describe("seat money never enters the credit ledger", () => {
  it("completing a seat payment grants no credits and writes no credit row", async () => {
    const owner = await makeOwner();
    const before = await storage.getTotalCreditsAvailable(owner.id);
    const p = await storage.createPayment({
      userId: owner.id, kind: PAYMENT_KIND.SEATS,
      planName: "Team Seats — 5 × MONTHLY", credits: 0,
      amountUsd: 7, amountInr: 575, amountLocal: 575, currency: "INR",
      status: PAYMENT_STATUS.PENDING,
      metadata: { seats: 5, term: SEAT_TERMS.MONTHLY.id, workspaceRootId: owner.id },
    });
    const { credited } = await storage.completePayment(p.id, "pay_test_" + rand());
    expect(credited).toBe(false);

    const after = await storage.getTotalCreditsAvailable(owner.id);
    expect(after.paid).toBe(before.paid);

    const txns = await storage.getCreditTransactions(owner.id, 50);
    expect(txns.some(t => t.type === "purchase" && t.amount === 0)).toBe(false);
  });

  it("a credit payment still credits normally — no regression", async () => {
    const owner = await makeOwner();
    const p = await storage.createPayment({
      userId: owner.id, planName: "Starter", credits: 3000,
      amountUsd: 5, amountInr: 390, amountLocal: 390, currency: "INR",
      status: PAYMENT_STATUS.PENDING,
    });
    const { credited } = await storage.completePayment(p.id, "pay_test_" + rand());
    expect(credited).toBe(true);
    expect((await storage.getTotalCreditsAvailable(owner.id)).paid).toBe(3000);
  });
});

describe("fulfillment", () => {
  it("grants the entitlement and records the audit trail", async () => {
    const owner = await makeOwner();
    const p = await seatPayment(owner, 5);
    const r = await fulfillSeatPayment(p);
    expect(r.applied).toBe(true);
    expect(r.subscription.seats).toBe(5);

    const logs = await storage.getAuditLogs({ userId: owner.id, limit: 50 });
    const entry = logs.find(l => l.action === "SUBSCRIPTION_ACTIVATED");
    expect(entry).toBeTruthy();
    expect(entry.details.seats).toBe(5);
    expect(entry.details.pricingVersion).toBeTruthy();
  });

  it("is idempotent — a replayed webhook does not double-grant", async () => {
    const owner = await makeOwner();
    const p = await seatPayment(owner, 5);
    const first = await fulfillSeatPayment(p);
    expect(first.applied).toBe(true);

    const reloaded = await storage.getPayment(p.id);
    const replay = await fulfillSeatPayment(reloaded);
    expect(replay.applied).toBe(false);
    expect(replay.reason).toBe("already_fulfilled");
    expect((await storage.getWorkspaceSubscription(owner.id)).seats).toBe(5);
  });

  it("records the free seats the best-price guarantee handed over", async () => {
    const owner = await makeOwner();
    const p = await seatPayment(owner, 9);
    const r = await fulfillSeatPayment(p);
    expect(r.subscription.seats).toBe(10);       // paid for 9, received 10
    const logs = await storage.getAuditLogs({ userId: owner.id, limit: 50 });
    expect(logs.find(l => l.action === "SUBSCRIPTION_ACTIVATED").details.grantedFreeSeats).toBe(1);
  });

  it("ignores a payment that is not a seat payment", async () => {
    const owner = await makeOwner();
    const p = await storage.createPayment({
      userId: owner.id, planName: "Growth", credits: 15000,
      amountUsd: 21, amountInr: 1800, amountLocal: 1800, currency: "INR",
      status: PAYMENT_STATUS.SUCCESS,
    });
    expect((await fulfillSeatPayment(p)).reason).toBe("not_a_seat_payment");
  });

  it("links the payment to the subscription it funded", async () => {
    const owner = await makeOwner();
    const p = await seatPayment(owner, 3);
    const r = await fulfillSeatPayment(p);
    const reloaded = await storage.getPayment(p.id);
    expect(reloaded.subscriptionId).toBe(r.subscription.id);
  });
});

describe("reversal — refund, dispute, chargeback", () => {
  it("refundPayment REFUSES a seat payment instead of silently clawing back nothing", async () => {
    const owner = await makeOwner();
    const p = await seatPayment(owner, 5);
    await fulfillSeatPayment(p);

    const wrong = await storage.refundPayment(p.id);
    expect(wrong.refunded).toBe(false);
    expect(wrong.error).toBe("seat_payment_wrong_path");
    // Critically, the payment was NOT marked refunded by the wrong path.
    expect((await storage.getPayment(p.id)).status).toBe(PAYMENT_STATUS.SUCCESS);
  });

  it("reverses the entitlement and brings headcount inside it", async () => {
    const owner = await makeOwner();
    const p = await seatPayment(owner, 5);
    await fulfillSeatPayment(p);
    const members = [];
    for (let i = 0; i < 4; i++) { members.push(await makeMember(owner)); await new Promise(r => setTimeout(r, 2)); }

    await enableBilling(1);
    const r = await reverseSeatPayment(p, { reason: "operator_refund", actor: "tester" });
    expect(r.reversed).toBe(true);
    expect(r.seatsAfter).toBe(1);
    expect(r.deactivated).toHaveLength(3);

    const sub = await storage.getWorkspaceSubscription(owner.id);
    expect(sub).toBeNull();                       // no longer entitling
    // Deactivated, not deleted.
    for (const id of r.deactivated) {
      const u = await storage.getUserById(id);
      expect(u).toBeTruthy();
      expect(u.isActive).toBe(false);
    }
  });

  it("never touches credits on a seat reversal", async () => {
    const owner = await makeOwner();
    await storage.addCredits(owner.id, 9000, "PAYMENT_SUCCESS", {});
    const before = await storage.getTotalCreditsAvailable(owner.id);
    const p = await seatPayment(owner, 5);
    await fulfillSeatPayment(p);
    await enableBilling(1);
    await reverseSeatPayment(p);
    const after = await storage.getTotalCreditsAvailable(owner.id);
    expect(after.paid).toBe(before.paid);

    const logs = await storage.getAuditLogs({ userId: owner.id, limit: 50 });
    expect(logs.find(l => l.action === "SUBSCRIPTION_CANCELLED").details.creditsTouched).toBe(false);
  });

  it("is a safe no-op when there is nothing live to reverse", async () => {
    const owner = await makeOwner();
    const p = await seatPayment(owner, 5);
    expect((await reverseSeatPayment(p)).reason).toBe("no_live_subscription");
  });

  it("moves the payment to REFUNDED through the state machine", async () => {
    const owner = await makeOwner();
    const p = await seatPayment(owner, 3);
    await fulfillSeatPayment(p);
    const moved = await storage.transitionPaymentToRefunded(p.id, { reason: "operator_refund" });
    expect(moved.ok).toBe(true);
    expect((await storage.getPayment(p.id)).status).toBe(PAYMENT_STATUS.REFUNDED);

    const again = await storage.transitionPaymentToRefunded(p.id);
    expect(again.alreadyRefunded).toBe(true);     // idempotent
  });

  it("refuses to refund a payment that never succeeded", async () => {
    const owner = await makeOwner();
    const p = await storage.createPayment({
      userId: owner.id, kind: PAYMENT_KIND.SEATS, planName: "Team Seats", credits: 0,
      amountUsd: 0, amountInr: 575, amountLocal: 575, currency: "INR",
      status: PAYMENT_STATUS.PENDING, metadata: { seats: 5, term: "MONTHLY", workspaceRootId: owner.id },
    });
    expect((await storage.transitionPaymentToRefunded(p.id)).error).toBe("not_refundable");
  });
});

describe("renewal and dunning sweep", () => {
  it("does nothing while seat billing is disabled", async () => {
    await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "false", null);
    const r = await runSeatRenewalSweep({ now: new Date(Date.now() + 1e12) });
    expect(r.skipped).toBe(true);
    expect(r.reason).toBe("seat_billing_disabled");
  });

  it("moves a lapsed subscription to PAST_DUE and KEEPS the seats", async () => {
    const owner = await makeOwner();
    const p = await seatPayment(owner, 5);
    const { subscription } = await fulfillSeatPayment(p);
    await enableBilling(1);

    const after = new Date(new Date(subscription.periodEnd).getTime() + 1000);
    const r = await processDueSubscription(subscription, { now: after });
    expect(r.action).toBe("past_due");

    // The team is untouched during grace — this is the whole point.
    const e = await storage.resolveSeatEntitlement(owner.id);
    expect(e.seats).toBe(5);
    expect(e.subscription.status).toBe(S.PAST_DUE);
  });

  it("expires only once the grace window is exhausted, then trims headcount", async () => {
    const owner = await makeOwner();
    const p = await seatPayment(owner, 5);
    const { subscription } = await fulfillSeatPayment(p);
    await enableBilling(1);
    for (let i = 0; i < 3; i++) { await makeMember(owner); await new Promise(r => setTimeout(r, 2)); }

    const lapsed = new Date(new Date(subscription.periodEnd).getTime() + 1000);
    await processDueSubscription(subscription, { now: lapsed });

    const stillInGrace = await storage.getWorkspaceSubscription(owner.id);
    const midGrace = new Date(new Date(stillInGrace.graceEndsAt).getTime() - 1000);
    expect((await processDueSubscription(stillInGrace, { now: midGrace })).action).not.toBe("expired");

    const pastGrace = new Date(new Date(stillInGrace.graceEndsAt).getTime() + 1000);
    const expired = await processDueSubscription(stillInGrace, { now: pastGrace });
    expect(expired.action).toBe("expired");
    expect(expired.seatsAfter).toBe(1);
    expect(expired.deactivated).toHaveLength(2);
    expect((await storage.resolveSeatEntitlement(owner.id)).seats).toBe(1);
  });

  it("ends a customer-cancelled subscription at period end without dunning them", async () => {
    const owner = await makeOwner();
    const p = await seatPayment(owner, 5);
    const { subscription } = await fulfillSeatPayment(p);
    await storage.transitionSubscription(subscription.id, S.CANCEL_SCHEDULED, { cancelAtPeriodEnd: true });
    await enableBilling(1);

    const sub = await storage.getWorkspaceSubscription(owner.id);
    const r = await processDueSubscription(sub, { now: new Date(new Date(sub.periodEnd).getTime() + 1000) });
    expect(r.action).toBe("expired");
    expect(r.reason).toBe("cancelled_by_customer");
  });

  it("is idempotent across repeated sweeps in the same window", async () => {
    const owner = await makeOwner();
    const p = await seatPayment(owner, 4);
    const { subscription } = await fulfillSeatPayment(p);
    await enableBilling(1);

    const t = new Date(new Date(subscription.periodEnd).getTime() + 1000);
    await processDueSubscription(subscription, { now: t });
    const afterFirst = await storage.getWorkspaceSubscription(owner.id);
    await processDueSubscription(afterFirst, { now: t });
    const afterSecond = await storage.getWorkspaceSubscription(owner.id);

    expect(afterSecond.status).toBe(S.PAST_DUE);
    expect(afterSecond.dunningAttempts).toBe(afterFirst.dunningAttempts); // no extra attempt
  });

  it("skips a subscription that is not actually due", async () => {
    const owner = await makeOwner();
    const p = await seatPayment(owner, 3);
    const { subscription } = await fulfillSeatPayment(p);
    await storage.transitionSubscription(subscription.id, S.EXPIRED);
    const sub = store => store;  // no-op, readability
    const r = await processDueSubscription({ ...subscription, status: S.EXPIRED }, { now: new Date() });
    expect(r.action).toBe("skipped");
    expect(sub).toBeTruthy();
  });
});
