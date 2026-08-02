// M51 Phase 5.4 — renewal sweep integration and notifications.
//
// Integration-level: drives the REAL `runSeatRenewalSweep` / `processDueSubscription`
// against the real storage backend, with the gateway stubbed at the ONE seam the
// design defines (`attemptRecurringCharge`). Everything below that seam —
// lifecycle transitions, dunning ladder, entitlement, audit, notification
// dispatch — is the real code.
//
// The properties under test:
//   • a workspace WITHOUT autopay behaves byte-for-byte as it did pre-M51
//   • the charge is attempted before dunning, and a retry precedes any reminder
//   • AUTH_REQUIRED never consumes a dunning rung and never withdraws entitlement
//   • an unknown outcome defers rather than declining
//   • a charge cannot happen without a matured, period-matched pre-debit notice
//   • notices are claimed atomically — concurrent sweeps send exactly one
//   • reconciliation frees a stalled autopay without inventing a success
//   • rollback (scope OFF / billing off) makes every path inert again

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { USER_ROLES, AUDIT_ACTIONS, PAYMENT_KIND, PAYMENT_STATUS } from "../../shared/schema.js";
import { SUBSCRIPTION_STATUS as S } from "../../shared/subscriptionStateMachine.js";
import { SEAT_SETTING_KEYS } from "../../shared/seatEntitlement.js";
import { SEAT_TERMS, quoteSeats } from "../../shared/seatPricing.js";
import {
  MANDATE_STATUS, MANDATE_METHOD, CHARGE_OUTCOME, RENEWAL_TRIGGER,
  AUTOPAY_SETTING_KEYS, PREDEBIT_NOTICE_HOURS,
} from "../../shared/autopay.js";

const rand = () => Math.random().toString(36).slice(2);
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// The gateway seam. Everything below it is real.
const charge = { impl: null, calls: [] };
vi.mock("../../server/autopayCharge.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    attemptRecurringCharge: async (sub, opts) => {
      charge.calls.push({ subscriptionId: sub.id, trigger: opts?.trigger });
      return charge.impl ? charge.impl(sub, opts) : { skipped: true, reason: "autopay_not_live" };
    },
  };
});

const mails = [];
vi.mock("../../server/email.js", () => ({
  sendCampaignEmail: vi.fn(async () => ({ messageId: "mock" })),
  sendTransactionalEmail: vi.fn(async (to, subject, text) => { mails.push({ to, subject, text }); }),
  sendPaymentReceiptEmail: vi.fn(async () => {}),
  verifySesConnection: vi.fn(async () => {}),
}));

vi.mock("@sentry/node", () => ({
  captureMessage: vi.fn(), captureException: vi.fn(),
}));

let storage, seatRenewal;

beforeAll(async () => {
  process.env.FREE_PLAN_ENABLED = "true";
  ({ storage } = await import("../../server/storage.js"));
  seatRenewal = await import("../../server/seatRenewal.js");
  await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "true", null);
});
afterAll(async () => {
  await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "false", null);
  await storage.setPlatformSetting(AUTOPAY_SETTING_KEYS.SCOPE, "OFF", null);
});
beforeEach(() => { charge.impl = null; charge.calls = []; mails.length = 0; });

async function makeOwner() {
  return storage.createUser({
    username: `sw_${rand()}`, email: `sw_${rand()}@example.com`,
    password: "pw-" + rand(), role: USER_ROLES.USER, parentId: null,
    plan: "growth", isTrialUser: false, mustResetPassword: false,
  });
}

/** A workspace whose period has ALREADY ENDED — i.e. due for renewal. */
async function makeDueWorkspace({ seats = 3, autopay = true, noticeAgeHours = 48 } = {}) {
  const owner = await makeOwner();
  const q = quoteSeats({ seats, term: SEAT_TERMS.MONTHLY.id });
  const { subscription } = await storage.applySeatPurchase(owner.id, {
    seats: q.seatsGranted, term: SEAT_TERMS.MONTHLY.id,
    pricingVersion: q.version, renewalAmountMinor: q.totalMinor,
  });

  let mandate = null;
  if (autopay) {
    mandate = await storage.createMandate({
      workspaceRootId: owner.id, method: MANDATE_METHOD.CARD,
      providerTokenId: `tok_${rand()}`, instrumentLabel: "•••• 4242",
    });
    await storage.transitionMandate(mandate.id, MANDATE_STATUS.ACTIVE);
    await storage.bindMandateToSubscription(subscription.id, mandate.id);
  }

  // Rewind the period so it is due, and record a matured notice for THAT period.
  const endedAt = new Date(Date.now() - 2 * HOUR);
  await storage.transitionSubscription(subscription.id, S.ACTIVE, {
    periodEnd: endedAt,
    ...(autopay && noticeAgeHours != null ? {
      predebitNoticeSentAt: new Date(Date.now() - noticeAgeHours * HOUR),
      predebitNoticePeriodEnd: endedAt,
    } : {}),
  });

  return { owner, subscription: await storage.getWorkspaceSubscription(owner.id), mandate };
}

const due = async (owner) => storage.getWorkspaceSubscription(owner.id);
const auditRows = async (ownerId) => {
  const logs = await storage.getAuditLogs(ownerId, 200);
  return Array.isArray(logs) ? logs : logs?.logs ?? [];
};

// ── Backward compatibility: the prepaid path is untouched ───────────────────

describe("a workspace without autopay behaves exactly as before", () => {
  it("still lapses into the grace window and gets the prepaid reminder", async () => {
    const { owner, subscription } = await makeDueWorkspace({ autopay: false });

    const r = await seatRenewal.processDueSubscription(subscription, { now: new Date() });

    expect(r.action).toBe("past_due");
    expect(charge.calls.length).toBe(0);              // no charge attempted
    const after = await due(owner);
    expect(after.status).toBe(S.PAST_DUE);
    expect(after.seats).toBe(subscription.seats);     // entitlement RETAINED
    expect(mails.some(m => /need renewing/i.test(m.subject))).toBe(true);
  });

  it("still expires a cancelled subscription without dunning it", async () => {
    const { owner, subscription } = await makeDueWorkspace({ autopay: false });
    await storage.transitionSubscription(subscription.id, S.CANCEL_SCHEDULED, { cancelAtPeriodEnd: true });

    const r = await seatRenewal.processDueSubscription(await due(owner), { now: new Date() });
    expect(r.action).toBe("expired");
    expect(charge.calls.length).toBe(0);
  });
});

// ── The charge step ─────────────────────────────────────────────────────────

describe("automatic charge at the period boundary", () => {
  it("renews the period and confirms it to the customer", async () => {
    const { owner, subscription } = await makeDueWorkspace();
    const endBefore = new Date(subscription.periodEnd).getTime();

    charge.impl = async (sub) => {
      const p = await storage.createPayment({
        userId: sub.workspaceRootId, kind: PAYMENT_KIND.SEATS,
        planName: "Team Seats renewal", credits: 0,
        amountUsd: 0, amountInr: 1, amountLocal: 1, amountMinor: sub.renewalAmountMinor,
        currency: "INR", paymentMethod: "RAZORPAY", status: PAYMENT_STATUS.PENDING,
        metadata: {
          seats: sub.seats, requestedSeats: sub.seats, term: sub.term,
          pricingVersion: sub.pricingVersion, region: sub.region,
          workspaceRootId: sub.workspaceRootId, isRenewal: true, subscriptionId: sub.id,
          renewsFromPeriodEnd: new Date(sub.periodEnd).toISOString(),
          trigger: RENEWAL_TRIGGER.AUTOMATIC, autopay: true,
          provider_payment_id: `pay_${rand()}`,
        },
      });
      return { outcome: CHARGE_OUTCOME.SUCCEEDED, payment: p };
    };

    const r = await seatRenewal.processDueSubscription(subscription, { now: new Date() });

    expect(r.action).toBe("auto_renewed");
    const after = await due(owner);
    expect(after.status).toBe(S.ACTIVE);                                  // never went PAST_DUE
    expect(new Date(after.periodEnd).getTime()).toBeGreaterThan(endBefore);
    expect(mails.some(m => /Payment receipt/i.test(m.subject))).toBe(true);

    const audit = (await auditRows(owner.id)).find(l => l.action === AUDIT_ACTIONS.SUBSCRIPTION_AUTO_RENEWED);
    expect(audit?.details.trigger).toBe(RENEWAL_TRIGGER.AUTOMATIC);
  });

  it("a decline enters grace with entitlement retained and tells the truth", async () => {
    const { owner, subscription } = await makeDueWorkspace({ seats: 5 });
    charge.impl = async (sub) => ({
      outcome: CHARGE_OUTCOME.FAILED,
      payment: await storage.createPayment({
        userId: sub.workspaceRootId, kind: PAYMENT_KIND.SEATS, planName: "r", credits: 0,
        amountUsd: 0, amountInr: 1, amountLocal: 1, amountMinor: sub.renewalAmountMinor,
        currency: "INR", paymentMethod: "RAZORPAY", status: PAYMENT_STATUS.PENDING,
        metadata: { autopay: true, workspaceRootId: sub.workspaceRootId },
      }),
      result: { error: "card_declined" },
    });

    const r = await seatRenewal.processDueSubscription(subscription, { now: new Date() });

    expect(r.action).toBe("past_due");
    const after = await due(owner);
    expect(after.status).toBe(S.PAST_DUE);
    expect(after.seats).toBe(5);                       // entitlement RETAINED
    expect(after.lastChargeError).toBe("card_declined");

    const mail = mails.find(m => /Payment failed/i.test(m.subject));
    expect(mail).toBeTruthy();
    expect(mail.text).toMatch(/Nothing has changed yet/i);

    const audit = (await auditRows(owner.id)).find(l => l.action === AUDIT_ACTIONS.SUBSCRIPTION_CHARGE_FAILED);
    expect(audit?.details.reason).toBe("card_declined");
  });

  // The annual case. AUTH_REQUIRED is not a decline and must not be treated as one.
  it("AUTH_REQUIRED asks for approval without consuming a dunning rung", async () => {
    const { owner, subscription } = await makeDueWorkspace();
    charge.impl = async (sub) => ({
      outcome: CHARGE_OUTCOME.AUTH_REQUIRED,
      payment: await storage.createPayment({
        userId: sub.workspaceRootId, kind: PAYMENT_KIND.SEATS, planName: "r", credits: 0,
        amountUsd: 0, amountInr: 1, amountLocal: 1, amountMinor: sub.renewalAmountMinor,
        currency: "INR", paymentMethod: "RAZORPAY", status: PAYMENT_STATUS.PENDING,
        metadata: { autopay: true, auth_url: "https://rzp.test/authenticate" },
      }),
    });

    const r = await seatRenewal.processDueSubscription(subscription, { now: new Date() });

    expect(r.action).toBe("charge_auth_required");
    const after = await due(owner);
    expect(after.autopayAuthRequiredAt).toBeTruthy();
    expect(after.seats).toBe(subscription.seats);      // entitlement RETAINED
    expect(after.dunningAttempts).toBe(1);             // the grace window opened...
    expect(after.lastChargeError ?? null).toBeNull();  // ...but it is NOT a failure

    const mail = mails.find(m => /Approve your/i.test(m.subject));
    expect(mail).toBeTruthy();
    expect(mail.text).toMatch(/nothing wrong with your account/i);
    expect(mail.text).toContain("https://rzp.test/authenticate");

    expect((await auditRows(owner.id))
      .some(l => l.action === AUDIT_ACTIONS.SUBSCRIPTION_CHARGE_AUTH_REQUIRED)).toBe(true);
  });

  it("an unknown outcome defers instead of declining", async () => {
    const { owner, subscription } = await makeDueWorkspace();
    charge.impl = async () => ({ outcome: null, unknown: true, payment: { id: "p1" } });

    const r = await seatRenewal.processDueSubscription(subscription, { now: new Date() });

    expect(r.action).toBe("charge_unknown");
    const after = await due(owner);
    expect(after.status).toBe(S.ACTIVE);               // NOT pushed into dunning
    expect(after.dunningAttempts).toBe(0);
    expect(mails.length).toBe(0);                      // and the customer is not alarmed
  });

  it("a platform-side skip does not consume a rung either", async () => {
    const { owner, subscription } = await makeDueWorkspace();
    charge.impl = async () => ({ skipped: true, reason: "gateway_unavailable" });

    const r = await seatRenewal.processDueSubscription(subscription, { now: new Date() });
    expect(r.action).toBe("charge_skipped");
    expect((await due(owner)).status).toBe(S.ACTIVE);
  });

  it("a charge that throws is contained and deferred", async () => {
    const { owner, subscription } = await makeDueWorkspace();
    charge.impl = async () => { throw new Error("socket hang up"); };

    const r = await seatRenewal.processDueSubscription(subscription, { now: new Date() });
    expect(r.action).toBe("charge_error");
    expect((await due(owner)).status).toBe(S.ACTIVE);
  });

  // Phase 5.2 §3.5 — the highest-risk misrouting. A loser must never expire the
  // subscription the winner legitimately owns.
  it("a duplicate that loses the period fence leaves entitlement intact", async () => {
    const { owner, subscription } = await makeDueWorkspace({ seats: 6 });
    charge.impl = async (sub) => ({
      outcome: CHARGE_OUTCOME.SUCCEEDED,
      payment: await storage.createPayment({
        userId: sub.workspaceRootId, kind: PAYMENT_KIND.SEATS, planName: "r", credits: 0,
        amountUsd: 0, amountInr: 1, amountLocal: 1, amountMinor: sub.renewalAmountMinor,
        currency: "INR", paymentMethod: "RAZORPAY", status: PAYMENT_STATUS.PENDING,
        metadata: {
          seats: sub.seats, requestedSeats: sub.seats, term: sub.term,
          pricingVersion: sub.pricingVersion, region: sub.region,
          workspaceRootId: sub.workspaceRootId, isRenewal: true, subscriptionId: sub.id,
          // A witness for a period that has ALREADY been renewed by someone else.
          renewsFromPeriodEnd: new Date(Date.now() - 999 * DAY).toISOString(),
          trigger: RENEWAL_TRIGGER.AUTOMATIC, autopay: true,
        },
      }),
    });

    const r = await seatRenewal.processDueSubscription(subscription, { now: new Date() });

    expect(r.action).toBe("charge_duplicate_refund_required");
    const after = await due(owner);
    expect(after.status).not.toBe(S.EXPIRED);          // NOT reverseSeatPayment
    expect(after.seats).toBe(6);
  });
});

// ── Dunning: retry before reminder ──────────────────────────────────────────

describe("dunning retries the charge before nagging", () => {
  it("recovers a past-due subscription when the retry succeeds", async () => {
    const { owner, subscription } = await makeDueWorkspace();
    // 4 days back so rung index 1 (day 3 of the [1,3,7] ladder) is genuinely due.
    const firstFailure = new Date(Date.now() - 4 * DAY);
    await storage.transitionSubscription(subscription.id, S.PAST_DUE, {
      firstFailureAt: firstFailure, graceEndsAt: new Date(Date.now() + 12 * DAY), dunningAttempts: 1,
    });
    const sub = await due(owner);

    charge.impl = async (s) => ({
      outcome: CHARGE_OUTCOME.SUCCEEDED,
      payment: await storage.createPayment({
        userId: s.workspaceRootId, kind: PAYMENT_KIND.SEATS, planName: "r", credits: 0,
        amountUsd: 0, amountInr: 1, amountLocal: 1, amountMinor: s.renewalAmountMinor,
        currency: "INR", paymentMethod: "RAZORPAY", status: PAYMENT_STATUS.PENDING,
        metadata: {
          seats: s.seats, requestedSeats: s.seats, term: s.term,
          pricingVersion: s.pricingVersion, region: s.region,
          workspaceRootId: s.workspaceRootId, isRenewal: true, subscriptionId: s.id,
          renewsFromPeriodEnd: new Date(s.periodEnd).toISOString(),
          trigger: RENEWAL_TRIGGER.RETRY, autopay: true,
        },
      }),
    });

    const r = await seatRenewal.processDueSubscription(sub, { now: new Date() });

    expect(r.action).toBe("auto_renewed");
    expect(charge.calls.at(-1).trigger).toBe(RENEWAL_TRIGGER.RETRY);
    const after = await due(owner);
    expect(after.status).toBe(S.ACTIVE);
    expect(after.dunningAttempts).toBe(0);             // ladder reset by renewal
  });

  it("does not send a second nag when the retry already reported the failure", async () => {
    const { owner, subscription } = await makeDueWorkspace();
    await storage.transitionSubscription(subscription.id, S.PAST_DUE, {
      firstFailureAt: new Date(Date.now() - 4 * DAY),   // rung 1 (day 3) is due
      graceEndsAt: new Date(Date.now() + 12 * DAY), dunningAttempts: 1,
    });
    charge.impl = async (s) => ({
      outcome: CHARGE_OUTCOME.FAILED,
      payment: await storage.createPayment({
        userId: s.workspaceRootId, kind: PAYMENT_KIND.SEATS, planName: "r", credits: 0,
        amountUsd: 0, amountInr: 1, amountLocal: 1, amountMinor: s.renewalAmountMinor,
        currency: "INR", paymentMethod: "RAZORPAY", status: PAYMENT_STATUS.PENDING,
        metadata: { autopay: true },
      }),
      result: { error: "insufficient_funds" },
    });

    const r = await seatRenewal.processDueSubscription(await due(owner), { now: new Date() });

    expect(r.action).toBe("dunning_charge_failed");
    expect((await due(owner)).dunningAttempts).toBe(2);          // rung consumed
    expect(mails.filter(m => /need renewing|Reminder: renew/i.test(m.subject)).length).toBe(0);
    expect(mails.filter(m => /Payment failed/i.test(m.subject)).length).toBe(1);
  });

  it("still expires once the grace window is exhausted", async () => {
    const { owner, subscription } = await makeDueWorkspace();
    await storage.transitionSubscription(subscription.id, S.PAST_DUE, {
      firstFailureAt: new Date(Date.now() - 30 * DAY),
      graceEndsAt: new Date(Date.now() - DAY), dunningAttempts: 3,
    });

    const r = await seatRenewal.processDueSubscription(await due(owner), { now: new Date() });
    expect(r.action).toBe("expired");
    expect(charge.calls.length).toBe(0);               // no charge after grace ends
  });
});

// ── Pre-debit notice ────────────────────────────────────────────────────────

describe("pre-debit notice is a precondition, not a courtesy", () => {
  it("refuses to charge without a matured notice for THIS period", async () => {
    const { owner, subscription } = await makeDueWorkspace({ noticeAgeHours: null });
    charge.impl = async () => { throw new Error("must not be called"); };

    const r = await seatRenewal.processDueSubscription(subscription, { now: new Date() });

    expect(charge.calls.length).toBe(0);
    expect(r.action).toBe("past_due");                 // lapses safely, entitlement retained
    expect((await due(owner)).seats).toBe(subscription.seats);
  });

  // ── M52 ───────────────────────────────────────────────────────────────────
  // Withholding the charge is right. What the customer was TOLD about it was
  // not: they received "your seat renewal hasn't gone through" — an accusation
  // about a payment method that is working perfectly, for a delay that is
  // entirely ours. The kind of message that makes someone re-enter a card that
  // was never the problem, or call support.
  it("does not tell a customer with a live mandate that their renewal failed", async () => {
    const { owner, subscription } = await makeDueWorkspace({ noticeAgeHours: null });
    charge.impl = async () => { throw new Error("must not be called"); };

    const r = await seatRenewal.processDueSubscription(subscription, { now: new Date() });

    expect(r.awaitingNotice).toBe(true);
    const ownerEmail = (await storage.getUserById(owner.id)).email;
    const mail = mails.find(m => m.to === ownerEmail);
    expect(mail).toBeTruthy();
    // Not an accusation.
    expect(mail.subject).not.toMatch(/need renewing|hasn't gone through/i);
    expect(mail.text).not.toMatch(/due for renewal/i);
    // The truth: nothing is wrong, we will take it, and you are still covered.
    expect(mail.text).toMatch(/nothing wrong with your payment method/i);
    expect(mail.text).toMatch(/stays fully active/i);
    // And still an escape hatch, because the grace clock really is running.
    expect(mail.text).toMatch(/\/app\/team\/seats/);
  });

  it("records WHY a working mandate was dunned, so an operator can tell them apart", async () => {
    const { owner, subscription } = await makeDueWorkspace({ noticeAgeHours: null });
    charge.impl = async () => { throw new Error("must not be called"); };

    await seatRenewal.processDueSubscription(subscription, { now: new Date() });

    const rows = await auditRows(owner.id);
    const pastDue = rows.find(a => a.action === AUDIT_ACTIONS.SUBSCRIPTION_PAST_DUE);
    expect(pastDue).toBeTruthy();
    expect(pastDue.details.awaitingPredebitNotice).toBe(true);
  });

  // ── Audit E, defect E-DEF-2 ───────────────────────────────────────────────
  // `maxAmountMinor` is the ceiling the customer registered at their bank, and
  // the schema has always described it as something detected "AT UPGRADE TIME
  // rather than surfacing 30 days later as a mystery decline". Nothing anywhere
  // compared a renewal against it. Under M51 that was nearly harmless — mandates
  // were rare. M52 gives every purchaser one, sized against their FIRST renewal,
  // and then makes upgrading the most common next action.
  //
  // Unchecked, the sequence is: buy 1 seat, upgrade to 5, and every automatic
  // attempt from then on is a certain decline against a perfectly good card —
  // including every dunning retry, so the ladder runs out and a paying team is
  // expired for something no retry could ever fix.
  // The charge path's own refusal is tested against the REAL
  // `attemptRecurringCharge` in autopay-payment-execution.test.js — it is mocked
  // in this file. What belongs HERE is what the sweep does with that verdict.
  it("retains entitlement and does not burn a dunning rung on a certain decline", async () => {
    const { owner, subscription } = await makeDueWorkspace({ seats: 1 });
    await storage.transitionSubscription(subscription.id, S.ACTIVE, { renewalAmountMinor: 57500 });
    charge.impl = async () => ({ skipped: true, reason: "exceeds_mandate_ceiling", amountMinor: 57500, maxAmountMinor: 25800 });

    const r = await seatRenewal.processDueSubscription(await due(owner), { now: new Date() });

    expect(r.needsReauthorisation).toBe(true);
    // Entitlement is RETAINED — this is not the customer's fault.
    const after = await due(owner);
    expect(after.status).toBe(S.PAST_DUE);
    expect(after.seats).toBe(subscription.seats);
    // No decline was recorded, because none happened.
    expect(after.lastChargeError ?? null).toBeNull();
  });

  it("tells the customer their card is fine and names the one action that fixes it", async () => {
    const { owner, subscription } = await makeDueWorkspace({ seats: 1 });
    await storage.transitionSubscription(subscription.id, S.ACTIVE, { renewalAmountMinor: 57500 });
    charge.impl = async () => ({ skipped: true, reason: "exceeds_mandate_ceiling" });

    await seatRenewal.processDueSubscription(await due(owner), { now: new Date() });

    const ownerEmail = (await storage.getUserById(owner.id)).email;
    const mail = mails.find(m => m.to === ownerEmail);
    expect(mail).toBeTruthy();
    expect(mail.text).toMatch(/nothing wrong with your card/i);
    expect(mail.text).toMatch(/more than the amount your bank has us approved to take/i);
    // ⚠️ Must NOT accuse the payment method — that would send them to re-enter a
    // working card, which fixes nothing.
    expect(mail.subject).not.toMatch(/failed|need renewing/i);
    expect(mail.text).not.toMatch(/couldn't take the payment|payment failed/i);
  });

  it("records the ceiling overflow in the audit trail", async () => {
    const { owner, subscription } = await makeDueWorkspace({ seats: 1 });
    await storage.transitionSubscription(subscription.id, S.ACTIVE, { renewalAmountMinor: 57500 });
    charge.impl = async () => ({ skipped: true, reason: "exceeds_mandate_ceiling" });

    await seatRenewal.processDueSubscription(await due(owner), { now: new Date() });

    const rows = await auditRows(owner.id);
    const pastDue = rows.find(a => a.action === AUDIT_ACTIONS.SUBSCRIPTION_PAST_DUE);
    expect(pastDue.details.exceedsMandateCeiling).toBe(true);
  });

  it("still sends the ordinary reminder to a customer who has NO mandate", async () => {
    // The prepaid path must keep its original wording — that customer really
    // does have to act, and softening it would cost them their team.
    const { owner, subscription } = await makeDueWorkspace({ autopay: false });

    const r = await seatRenewal.processDueSubscription(subscription, { now: new Date() });

    expect(r.awaitingNotice).toBe(false);
    const ownerEmail = (await storage.getUserById(owner.id)).email;
    const mail = mails.find(m => m.to === ownerEmail);
    expect(mail.subject).toMatch(/need renewing/i);
    expect(mail.text).toMatch(/due for renewal/i);
    expect(mail.text).not.toMatch(/nothing wrong with your payment method/i);
  });

  it("refuses a notice that was sent for a different period", async () => {
    const { owner, subscription } = await makeDueWorkspace();
    await storage.transitionSubscription(subscription.id, S.ACTIVE, {
      predebitNoticePeriodEnd: new Date(Date.now() - 500 * DAY),
    });
    charge.impl = async () => { throw new Error("must not be called"); };

    await seatRenewal.processDueSubscription(await due(owner), { now: new Date() });
    expect(charge.calls.length).toBe(0);
  });

  it("refuses a notice that has not aged the required lead time", async () => {
    const sub = {
      periodEnd: new Date("2027-01-10T00:00:00Z"),
      predebitNoticePeriodEnd: new Date("2027-01-10T00:00:00Z"),
      predebitNoticeSentAt: new Date("2027-01-09T20:00:00Z"), // only 4h before
    };
    const now = new Date("2027-01-10T00:00:00Z");
    expect(seatRenewal.predebitNoticeSatisfied(sub, 100_00, now)).toBe(false);
    // 24h+ old is fine for an ordinary charge...
    sub.predebitNoticeSentAt = new Date("2027-01-08T20:00:00Z");
    expect(seatRenewal.predebitNoticeSatisfied(sub, 100_00, now)).toBe(true);
    // ...but an AFA-sized charge needs the longer lead.
    expect(seatRenewal.predebitNoticeSatisfied(sub, 19_500_00, now)).toBe(false);
  });

  it("sends the notice once the charge enters its lead window", async () => {
    const owner = await makeOwner();
    const q = quoteSeats({ seats: 3, term: SEAT_TERMS.MONTHLY.id });
    const { subscription } = await storage.applySeatPurchase(owner.id, {
      seats: q.seatsGranted, term: SEAT_TERMS.MONTHLY.id,
      pricingVersion: q.version, renewalAmountMinor: q.totalMinor,
    });
    const m = await storage.createMandate({
      workspaceRootId: owner.id, method: MANDATE_METHOD.CARD,
      providerTokenId: `tok_${rand()}`, instrumentLabel: "•••• 9999",
    });
    await storage.transitionMandate(m.id, MANDATE_STATUS.ACTIVE);
    await storage.bindMandateToSubscription(subscription.id, m.id);
    // 6 hours out — inside the 24h window.
    await storage.transitionSubscription(subscription.id, S.ACTIVE, {
      periodEnd: new Date(Date.now() + 6 * HOUR),
    });

    const out = await seatRenewal.runPredebitNoticePass({ now: new Date() });
    expect(out.sent).toBeGreaterThanOrEqual(1);

    const mail = mails.find(m2 => /Upcoming payment/i.test(m2.subject));
    expect(mail).toBeTruthy();
    expect(mail.text).toContain("•••• 9999");
    expect(mail.text).toMatch(/don't need to do anything/i);

    const after = await due(owner);
    expect(after.predebitNoticeSentAt).toBeTruthy();
    expect(new Date(after.predebitNoticePeriodEnd).getTime())
      .toBe(new Date(after.periodEnd).getTime());
  });

  it("does not notify a workspace that has no live mandate", async () => {
    const owner = await makeOwner();
    const q = quoteSeats({ seats: 3, term: SEAT_TERMS.MONTHLY.id });
    const { subscription } = await storage.applySeatPurchase(owner.id, {
      seats: q.seatsGranted, term: SEAT_TERMS.MONTHLY.id,
      pricingVersion: q.version, renewalAmountMinor: q.totalMinor,
    });
    await storage.transitionSubscription(subscription.id, S.ACTIVE, {
      periodEnd: new Date(Date.now() + 6 * HOUR),
    });

    await seatRenewal.runPredebitNoticePass({ now: new Date() });
    const after = await due(owner);
    expect(after.predebitNoticeSentAt ?? null).toBeNull();
  });

  // CONCURRENCY: two app instances sweeping the same hour.
  it("concurrent sweeps send exactly one notice", async () => {
    const owner = await makeOwner();
    const q = quoteSeats({ seats: 2, term: SEAT_TERMS.MONTHLY.id });
    const { subscription } = await storage.applySeatPurchase(owner.id, {
      seats: q.seatsGranted, term: SEAT_TERMS.MONTHLY.id,
      pricingVersion: q.version, renewalAmountMinor: q.totalMinor,
    });
    const periodEnd = new Date(Date.now() + 3 * HOUR);
    await storage.transitionSubscription(subscription.id, S.ACTIVE, { periodEnd });

    const claims = await Promise.all(
      Array.from({ length: 5 }, () => storage.claimPredebitNotice(subscription.id, periodEnd))
    );
    expect(claims.filter(c => c.claimed).length).toBe(1);
  });

  it("the AFA lead time is longer than the standard one", () => {
    expect(PREDEBIT_NOTICE_HOURS.AFA).toBeGreaterThan(PREDEBIT_NOTICE_HOURS.STANDARD);
  });
});

// ── Reconciliation ──────────────────────────────────────────────────────────

describe("reconciliation frees a stalled autopay", () => {
  it("fails out an unresolved autopay charge so the next attempt can run", async () => {
    const owner = await makeOwner();
    const p = await storage.createPayment({
      userId: owner.id, kind: PAYMENT_KIND.SEATS, planName: "r", credits: 0,
      amountUsd: 0, amountInr: 1, amountLocal: 1, amountMinor: 12900,
      currency: "INR", paymentMethod: "RAZORPAY", status: PAYMENT_STATUS.PENDING,
      metadata: { autopay: true, workspaceRootId: owner.id, trigger: RENEWAL_TRIGGER.AUTOMATIC },
    });

    const out = await seatRenewal.runReconciliationPass({
      now: new Date(Date.now() + 48 * HOUR), staleAfterMs: 24 * HOUR,
    });

    expect(out.resolved).toBeGreaterThanOrEqual(1);
    expect((await storage.getPayment(p.id)).status).toBe(PAYMENT_STATUS.FAILED);
    expect((await auditRows(owner.id))
      .some(l => l.details?.reason === "reconciliation_unresolved")).toBe(true);
  });

  // A customer's abandoned checkout is theirs to resume.
  it("never touches a manual pending payment", async () => {
    const owner = await makeOwner();
    const p = await storage.createPayment({
      userId: owner.id, kind: PAYMENT_KIND.SEATS, planName: "manual", credits: 0,
      amountUsd: 0, amountInr: 1, amountLocal: 1, amountMinor: 12900,
      currency: "INR", paymentMethod: "RAZORPAY", status: PAYMENT_STATUS.PENDING,
      metadata: { workspaceRootId: owner.id },     // no autopay flag
    });

    await seatRenewal.runReconciliationPass({
      now: new Date(Date.now() + 48 * HOUR), staleAfterMs: 24 * HOUR,
    });
    expect((await storage.getPayment(p.id)).status).toBe(PAYMENT_STATUS.PENDING);
  });

  it("leaves a young pending payment alone", async () => {
    const owner = await makeOwner();
    const p = await storage.createPayment({
      userId: owner.id, kind: PAYMENT_KIND.SEATS, planName: "r", credits: 0,
      amountUsd: 0, amountInr: 1, amountLocal: 1, amountMinor: 12900,
      currency: "INR", paymentMethod: "RAZORPAY", status: PAYMENT_STATUS.PENDING,
      metadata: { autopay: true, workspaceRootId: owner.id },
    });
    await seatRenewal.runReconciliationPass({ now: new Date(), staleAfterMs: 24 * HOUR });
    expect((await storage.getPayment(p.id)).status).toBe(PAYMENT_STATUS.PENDING);
  });
});

// ── Rollback / inertness ────────────────────────────────────────────────────

describe("rollback makes everything inert again", () => {
  it("the whole sweep no-ops while seat billing is disabled", async () => {
    await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "false", null);
    try {
      const summary = await seatRenewal.runSeatRenewalSweep({ now: new Date() });
      expect(summary.skipped).toBe(true);
      expect(summary.reason).toBe("seat_billing_disabled");
      expect(charge.calls.length).toBe(0);
      expect(mails.length).toBe(0);
    } finally {
      await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "true", null);
    }
  });

  it("the sweep reports its new counters without changing its contract", async () => {
    const summary = await seatRenewal.runSeatRenewalSweep({ now: new Date(), limit: 5 });
    for (const k of ["processed", "pastDue", "expired", "reminders", "errors"]) {
      expect(summary).toHaveProperty(k);                 // pre-M51 keys intact
    }
    for (const k of ["autoRenewed", "chargeFailed", "authRequired", "predebitNotices", "reconciled"]) {
      expect(summary).toHaveProperty(k);
    }
  });
});
