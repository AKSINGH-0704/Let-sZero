// M51 Phase 5.2 — payment execution invariants.
//
// These are the assertions that stand between a recurring billing system and a
// double-debit incident. They cover the six invariant families the operator
// required before implementation:
//
//   1. mandate ownership lifecycle (incl. the transfer defect, §7.1)
//   2. multiple-mandate conflict resolution
//   3. idempotency — exactly one renewal succeeds per period
//   4. the canonical renewal clock
//   5. audit trail records what TRIGGERED every renewal
//   6. provider abstraction
//
// Backward compatibility is asserted explicitly: every new guard is opt-in, so a
// pre-M51 payment renews exactly as it did before.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { USER_ROLES, AUDIT_ACTIONS, PAYMENT_KIND, PAYMENT_STATUS } from "../../shared/schema.js";
import { SUBSCRIPTION_STATUS as S } from "../../shared/subscriptionStateMachine.js";
import { SEAT_SETTING_KEYS } from "../../shared/seatEntitlement.js";
import { SEAT_TERMS, quoteSeats, periodFor, addMonthsUTC } from "../../shared/seatPricing.js";
import {
  MANDATE_STATUS, MANDATE_METHOD, PAYMENT_PROVIDER, DEFAULT_PAYMENT_PROVIDER,
  AUTOPAY_SETTING_KEYS, RENEWAL_TRIGGER, isUnattendedTrigger, isKnownProvider,
  isAutopayLive,
} from "../../shared/autopay.js";
import { renewalReceipt } from "../../server/autopayCharge.js";
import { fulfillSeatPayment } from "../../server/fulfillSeats.js";

let storage;
const rand = () => Math.random().toString(36).slice(2);
const DAY = 24 * 60 * 60 * 1000;

async function makeUser(parentId = null) {
  return storage.createUser({
    username: `m51x_${rand()}`, email: `m51x_${rand()}@example.com`,
    password: "pw-" + rand(), role: USER_ROLES.USER, parentId,
    plan: "free", isTrialUser: false, mustResetPassword: false,
  });
}

async function makeSubscribedWorkspace(seats = 3) {
  const owner = await makeUser(null);
  const q = quoteSeats({ seats, term: SEAT_TERMS.MONTHLY.id });
  const { subscription } = await storage.applySeatPurchase(owner.id, {
    seats: q.seatsGranted, term: SEAT_TERMS.MONTHLY.id,
    pricingVersion: q.version, renewalAmountMinor: q.totalMinor,
  });
  return { owner, subscription };
}

async function makeActiveMandate(rootId, over = {}) {
  const m = await storage.createMandate({
    workspaceRootId: rootId, method: MANDATE_METHOD.CARD,
    providerTokenId: `tok_${rand()}`, instrumentLabel: "•••• 4242", ...over,
  });
  return (await storage.transitionMandate(m.id, MANDATE_STATUS.ACTIVE)).mandate;
}

/** A settled renewal payment carrying the period-fence witness. */
async function makeRenewalPayment(sub, { renewsFromPeriodEnd, trigger = null, autopay = false } = {}) {
  return storage.createPayment({
    userId: sub.workspaceRootId, kind: PAYMENT_KIND.SEATS,
    planName: "Team Seats renewal", credits: 0,
    amountMinor: sub.renewalAmountMinor, amountInr: Math.round(sub.renewalAmountMinor / 100),
    amountUsd: 0, amountLocal: Math.round(sub.renewalAmountMinor / 100),
    currency: "INR", paymentMethod: "TEST", status: PAYMENT_STATUS.SUCCESS,
    metadata: {
      seats: sub.seats, requestedSeats: sub.seats, term: sub.term,
      pricingVersion: sub.pricingVersion, region: sub.region,
      workspaceRootId: sub.workspaceRootId, isRenewal: true,
      subscriptionId: sub.id,
      ...(renewsFromPeriodEnd !== undefined ? { renewsFromPeriodEnd } : {}),
      ...(trigger ? { trigger } : {}),
      ...(autopay ? { autopay: true } : {}),
    },
  });
}

beforeAll(async () => {
  process.env.FREE_PLAN_ENABLED = "true";
  ({ storage } = await import("../../server/storage.js"));
});
afterAll(async () => {
  await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "false", null);
  await storage.setPlatformSetting(AUTOPAY_SETTING_KEYS.SCOPE, "OFF", null);
});

// ── 1. Mandate ownership lifecycle ──────────────────────────────────────────

describe("mandate ownership lifecycle", () => {
  // DEFECT 7.1 — the regression test. Before the fix, transferWorkspaceOwnership
  // moved the subscription to the new root while leaving mandateId pointing at
  // the DEPARTED owner's instrument with autopay still on, so their card would
  // have been debited indefinitely for a workspace they no longer owned.
  it("ownership transfer revokes autopay and never inherits an instrument", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace(4);
    const member = await makeUser(owner.id);
    const card = await makeActiveMandate(owner.id);
    await storage.bindMandateToSubscription(subscription.id, card.id);

    const before = await storage.getWorkspaceSubscription(owner.id);
    expect(isAutopayLive(before, card)).toBe(true);

    const r = await storage.transferWorkspaceOwnership(owner.id, member.id);
    expect(r.ok).toBe(true);
    expect(r.revokedMandateIds).toContain(card.id);

    const after = await storage.getWorkspaceSubscription(member.id);
    expect(after.workspaceRootId).toBe(member.id);
    // The instrument is gone from the subscription entirely — not merely disabled.
    expect(after.autopayEnabled).toBe(false);
    expect(after.mandateId).toBeNull();
    expect((await storage.getMandate(card.id)).status).toBe(MANDATE_STATUS.REVOKED);
    // ...and the subscription itself is untouched. Transfer is not cancellation.
    expect(after.status).toBe(S.ACTIVE);
    expect(after.seats).toBe(before.seats);
    expect(after.periodEnd).toEqual(before.periodEnd);
  });

  // The second, independent guard. Even if some future path forgets to revoke,
  // the predicate itself refuses to authorise a cross-workspace debit.
  it("the liveness predicate refuses a mandate from another workspace", async () => {
    const a = await makeSubscribedWorkspace();
    const b = await makeSubscribedWorkspace();
    const mandateOfB = await makeActiveMandate(b.owner.id);

    // Hand-construct the exact post-transfer shape the defect produced.
    const leaked = {
      ...a.subscription, workspaceRootId: a.owner.id,
      autopayEnabled: true, mandateId: mandateOfB.id,
    };
    expect(isAutopayLive(leaked, mandateOfB)).toBe(false);
  });

  it("revoking an instrument disables autopay without cancelling anything", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace(5);
    const card = await makeActiveMandate(owner.id);
    await storage.bindMandateToSubscription(subscription.id, card.id);

    await storage.transitionMandate(card.id, MANDATE_STATUS.REVOKED);
    const fanout = await storage.disableAutopayForMandate(card.id);
    expect(fanout.affected).toContain(subscription.id);

    const after = await storage.getWorkspaceSubscription(owner.id);
    expect(after.status).toBe(S.ACTIVE);
    expect(after.seats).toBe(5);
    expect(after.autopayEnabled).toBe(false);
    // Pointer retained here (unlike transfer) so the UI can explain itself.
    expect(after.mandateId).toBe(card.id);
  });
});

// ── 2. Multiple-mandate conflict resolution ─────────────────────────────────

describe("multiple-mandate conflict resolution", () => {
  it("two active mandates may coexist, but only the bound one can fund a charge", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const first = await makeActiveMandate(owner.id, { instrumentLabel: "•••• 1111" });
    const second = await makeActiveMandate(owner.id, { instrumentLabel: "•••• 2222" });
    await storage.bindMandateToSubscription(subscription.id, first.id);

    const live = await storage.getWorkspaceSubscription(owner.id);
    expect(isAutopayLive(live, first)).toBe(true);
    // The unbound one is inert — there is no ambiguity about which instrument pays.
    expect(isAutopayLive(live, second)).toBe(false);
    expect((await storage.getWorkspaceMandates(owner.id)).length).toBeGreaterThanOrEqual(2);
  });

  it("replacement confirms the new instrument before the old is revoked", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const oldCard = await makeActiveMandate(owner.id);
    await storage.bindMandateToSubscription(subscription.id, oldCard.id);

    const newCard = await makeActiveMandate(owner.id);
    // At this instant BOTH are active — that is the point of the ordering.
    expect((await storage.getMandate(oldCard.id)).status).toBe(MANDATE_STATUS.ACTIVE);
    expect((await storage.getMandate(newCard.id)).status).toBe(MANDATE_STATUS.ACTIVE);

    const swap = await storage.bindMandateToSubscription(subscription.id, newCard.id);
    expect(swap.previousMandateId).toBe(oldCard.id);
    await storage.transitionMandate(oldCard.id, MANDATE_STATUS.REVOKED);

    const after = await storage.getWorkspaceSubscription(owner.id);
    expect(after.mandateId).toBe(newCard.id);
    expect(after.status).toBe(S.ACTIVE);
  });

  it("a stale event naming a terminal mandate is refused, not applied", async () => {
    const { owner } = await makeSubscribedWorkspace();
    const card = await makeActiveMandate(owner.id);
    await storage.transitionMandate(card.id, MANDATE_STATUS.REVOKED);

    // Webhook ordering: token.confirmed arriving after token.cancelled.
    const late = await storage.transitionMandate(card.id, MANDATE_STATUS.ACTIVE);
    expect(late.ok).toBe(false);
    expect((await storage.getMandate(card.id)).status).toBe(MANDATE_STATUS.REVOKED);
  });

  it("an event for an unbound mandate cannot change any subscription", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const bound = await makeActiveMandate(owner.id);
    const unbound = await makeActiveMandate(owner.id);
    await storage.bindMandateToSubscription(subscription.id, bound.id);

    const fanout = await storage.disableAutopayForMandate(unbound.id);
    expect(fanout.count).toBe(0);
    expect((await storage.getWorkspaceSubscription(owner.id)).autopayEnabled).toBe(true);
  });
});

// ── 3. Idempotency — exactly one renewal per period ─────────────────────────

describe("renewal uniqueness (Invariant R)", () => {
  it("exactly one of five concurrent actors advances the period", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const sub = await storage.getWorkspaceSubscription(owner.id);
    const T = sub.periodEnd;

    // The automatic sweep, a dunning retry, a replayed webhook, a manual customer
    // payment and an operator re-drive — all witnessing the SAME period boundary.
    const triggers = [
      RENEWAL_TRIGGER.AUTOMATIC, RENEWAL_TRIGGER.RETRY, RENEWAL_TRIGGER.AUTOMATIC,
      RENEWAL_TRIGGER.MANUAL, RENEWAL_TRIGGER.OPERATOR,
    ];
    const results = await Promise.all(triggers.map(async (trigger) => {
      const p = await makeRenewalPayment(sub, {
        renewsFromPeriodEnd: new Date(T).toISOString(), trigger,
      });
      return fulfillSeatPayment(p);
    }));

    const applied = results.filter(r => r.applied);
    const stale = results.filter(r => !r.applied && r.reason === "stale_period");
    expect(applied.length).toBe(1);
    expect(stale.length).toBe(4);

    const after = await storage.getWorkspaceSubscription(owner.id);
    expect(new Date(after.periodEnd).getTime()).toBeGreaterThan(new Date(T).getTime());
    // And exactly one period was advanced — not four more.
    expect(new Date(after.periodEnd).getTime())
      .toBe(periodFor(T, sub.term).end.getTime());
  });

  it("the fence rejects duplicates but never a legitimate successor", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const first = await storage.getWorkspaceSubscription(owner.id);

    const p1 = await makeRenewalPayment(first, {
      renewsFromPeriodEnd: new Date(first.periodEnd).toISOString(), trigger: RENEWAL_TRIGGER.AUTOMATIC,
    });
    expect((await fulfillSeatPayment(p1)).applied).toBe(true);

    const second = await storage.getWorkspaceSubscription(owner.id);
    // Snapshot the VALUE: the in-memory backend returns the live row object, so
    // holding the object and re-reading it after a write compares a value to
    // itself. (The Postgres backend returns fresh rows; this is a test-harness
    // property, not a behavioural difference.)
    const secondEndMs = new Date(second.periodEnd).getTime();

    // Renewing the NEXT period matches the live value and must succeed.
    const p2 = await makeRenewalPayment(second, {
      renewsFromPeriodEnd: new Date(second.periodEnd).toISOString(), trigger: RENEWAL_TRIGGER.AUTOMATIC,
    });
    expect((await fulfillSeatPayment(p2)).applied).toBe(true);

    const third = await storage.getWorkspaceSubscription(owner.id);
    expect(new Date(third.periodEnd).getTime()).toBeGreaterThan(secondEndMs);
  });

  // BACKWARD COMPATIBILITY: a payment created before M51 carries no witness, so
  // no comparison happens and it renews exactly as it always did.
  it("a pre-M51 payment with no witness renews unchanged", async () => {
    const { owner } = await makeSubscribedWorkspace();
    const sub = await storage.getWorkspaceSubscription(owner.id);
    const beforeEndMs = new Date(sub.periodEnd).getTime(); // snapshot the value, see above
    const legacy = await makeRenewalPayment(sub, {}); // no renewsFromPeriodEnd at all

    const r = await fulfillSeatPayment(legacy);
    expect(r.applied).toBe(true);
    const after = await storage.getWorkspaceSubscription(owner.id);
    expect(new Date(after.periodEnd).getTime()).toBeGreaterThan(beforeEndMs);
  });

  it("a replayed webhook short-circuits before reaching the fence", async () => {
    const { owner } = await makeSubscribedWorkspace();
    const sub = await storage.getWorkspaceSubscription(owner.id);
    const p = await makeRenewalPayment(sub, {
      renewsFromPeriodEnd: new Date(sub.periodEnd).toISOString(), trigger: RENEWAL_TRIGGER.AUTOMATIC,
    });

    expect((await fulfillSeatPayment(p)).applied).toBe(true);
    const replay = await fulfillSeatPayment(await storage.getPayment(p.id));
    // The fulfilled-marker, not the fence — a different and earlier guard.
    expect(replay.applied).toBe(false);
    expect(replay.reason).toBe("already_fulfilled");
  });

  it("the gateway receipt is deterministic per period", async () => {
    const end = new Date("2027-03-31T10:00:00.000Z");
    expect(renewalReceipt("sub-1", end)).toBe(renewalReceipt("sub-1", new Date(end)));
    expect(renewalReceipt("sub-1", end)).not.toBe(renewalReceipt("sub-1", new Date("2027-04-30T10:00:00.000Z")));
    expect(renewalReceipt("sub-1", end)).not.toBe(renewalReceipt("sub-2", end));
  });

  // Razorpay caps `receipt` at 40 chars. The natural `renew:{uuid}:{epochMs}`
  // form is 56, so order creation would have been rejected on EVERY recurring
  // charge and autopay would have stalled platform-wide.
  it("the receipt fits inside the gateway's 40-character limit", () => {
    const uuid = "3f2a1b4c-0000-4000-8000-abcdefabcdef";
    const r = renewalReceipt(uuid, new Date("2027-03-31T10:00:00.000Z"));
    expect(r.length).toBeLessThanOrEqual(40);
    expect(r).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  // THE HIGHEST-RISK MISROUTING IN M51. A duplicate-renewal refund moves money
  // only. Routing it through reverseSeatPayment would expire a subscription the
  // WINNING payment legitimately owns and deactivate the customer's members.
  it("a payment that loses the race leaves entitlement completely untouched", async () => {
    const { owner } = await makeSubscribedWorkspace(6);
    const sub = await storage.getWorkspaceSubscription(owner.id);
    const T = new Date(sub.periodEnd).toISOString();

    const winner = await makeRenewalPayment(sub, { renewsFromPeriodEnd: T, trigger: RENEWAL_TRIGGER.MANUAL });
    const loser = await makeRenewalPayment(sub, { renewsFromPeriodEnd: T, trigger: RENEWAL_TRIGGER.AUTOMATIC });

    expect((await fulfillSeatPayment(winner)).applied).toBe(true);
    const afterWin = await storage.getWorkspaceSubscription(owner.id);

    const lost = await fulfillSeatPayment(loser);
    expect(lost.applied).toBe(false);
    expect(lost.reason).toBe("stale_period");

    const afterLoss = await storage.getWorkspaceSubscription(owner.id);
    expect(afterLoss.status).toBe(S.ACTIVE);          // NOT expired
    expect(afterLoss.seats).toBe(afterWin.seats);      // seats intact
    expect(afterLoss.periodEnd).toEqual(afterWin.periodEnd); // period not advanced twice
  });
});

// ── 4. The canonical renewal clock ──────────────────────────────────────────

describe("canonical renewal clock", () => {
  it("periods chain contiguously with no gap and no overlap", async () => {
    let end = new Date(Date.UTC(2027, 0, 15, 9, 30, 0));
    for (let i = 0; i < 4; i++) {
      const p = periodFor(end, SEAT_TERMS.MONTHLY.id);
      expect(p.start.getTime()).toBe(new Date(end).getTime()); // starts exactly where the last ended
      expect(p.end.getTime()).toBeGreaterThan(p.start.getTime());
      end = p.end;
    }
  });

  it("clamps month-ends and is leap-year aware", () => {
    expect(addMonthsUTC(new Date(Date.UTC(2027, 0, 31)), 1).toISOString()).toBe("2027-02-28T00:00:00.000Z");
    expect(addMonthsUTC(new Date(Date.UTC(2028, 0, 31)), 1).toISOString()).toBe("2028-02-29T00:00:00.000Z");
    expect(addMonthsUTC(new Date(Date.UTC(2028, 1, 29)), 12).toISOString()).toBe("2029-02-28T00:00:00.000Z");
    expect(addMonthsUTC(new Date(Date.UTC(2027, 2, 31)), 1).toISOString()).toBe("2027-04-30T00:00:00.000Z");
  });

  // DEC-M51-1 — documented behaviour, pinned so a future change is deliberate
  // rather than accidental. A clamp is permanent: the billing day walks back to
  // the 28th and stays there. Recorded as a decision for the operator, not fixed
  // inside a billing rollout.
  it("anchor-day drift is permanent once clamped (documented, DEC-M51-1)", () => {
    const p1 = periodFor(new Date(Date.UTC(2027, 0, 31, 10)), SEAT_TERMS.MONTHLY.id);
    expect(p1.end.toISOString()).toBe("2027-02-28T10:00:00.000Z");
    const p2 = periodFor(p1.end, SEAT_TERMS.MONTHLY.id);
    expect(p2.end.toISOString()).toBe("2027-03-28T10:00:00.000Z"); // NOT the 31st
  });

  it("all arithmetic is UTC and independent of host timezone", () => {
    const p = periodFor(new Date(Date.UTC(2027, 5, 30, 23, 59, 59)), SEAT_TERMS.MONTHLY.id);
    expect(p.end.toISOString()).toBe("2027-07-30T23:59:59.000Z");
  });

  it("annual renews twelve months out", () => {
    const p = periodFor(new Date(Date.UTC(2027, 3, 10)), SEAT_TERMS.ANNUAL.id);
    expect(p.end.toISOString()).toBe("2028-04-10T00:00:00.000Z");
  });
});

// ── 5. Audit trail ──────────────────────────────────────────────────────────

describe("audit trail records the renewal trigger", () => {
  const auditFor = async (ownerId, action) => {
    const logs = await storage.getAuditLogs?.({ userId: ownerId, limit: 50 })
      ?? await storage.getAuditLogs(ownerId, 50);
    const rows = Array.isArray(logs) ? logs : (logs?.logs ?? []);
    return rows.find(l => l.action === action) || null;
  };

  it("an unattended charge is recorded as AUTO_RENEWED with its trigger", async () => {
    const { owner } = await makeSubscribedWorkspace();
    const sub = await storage.getWorkspaceSubscription(owner.id);
    const p = await makeRenewalPayment(sub, {
      renewsFromPeriodEnd: new Date(sub.periodEnd).toISOString(),
      trigger: RENEWAL_TRIGGER.AUTOMATIC, autopay: true,
    });
    expect((await fulfillSeatPayment(p)).applied).toBe(true);

    const row = await auditFor(owner.id, AUDIT_ACTIONS.SUBSCRIPTION_AUTO_RENEWED);
    expect(row).toBeTruthy();
    expect(row.details.trigger).toBe(RENEWAL_TRIGGER.AUTOMATIC);
    expect(row.details.autopay).toBe(true);
  });

  it("a dunning retry is unattended too, and says so", async () => {
    const { owner } = await makeSubscribedWorkspace();
    const sub = await storage.getWorkspaceSubscription(owner.id);
    const p = await makeRenewalPayment(sub, {
      renewsFromPeriodEnd: new Date(sub.periodEnd).toISOString(),
      trigger: RENEWAL_TRIGGER.RETRY, autopay: true,
    });
    expect((await fulfillSeatPayment(p)).applied).toBe(true);

    const row = await auditFor(owner.id, AUDIT_ACTIONS.SUBSCRIPTION_AUTO_RENEWED);
    expect(row.details.trigger).toBe(RENEWAL_TRIGGER.RETRY);
  });

  // The permanent distinction: "did the customer initiate this, or did we?"
  it("a customer-initiated renewal stays SUBSCRIPTION_RENEWED", async () => {
    const { owner } = await makeSubscribedWorkspace();
    const sub = await storage.getWorkspaceSubscription(owner.id);
    const p = await makeRenewalPayment(sub, {
      renewsFromPeriodEnd: new Date(sub.periodEnd).toISOString(), trigger: RENEWAL_TRIGGER.MANUAL,
    });
    expect((await fulfillSeatPayment(p)).applied).toBe(true);

    const row = await auditFor(owner.id, AUDIT_ACTIONS.SUBSCRIPTION_RENEWED);
    expect(row).toBeTruthy();
    expect(row.details.trigger).toBe(RENEWAL_TRIGGER.MANUAL);
  });

  it("a pre-M51 payment with no trigger is recorded as MANUAL", async () => {
    const { owner } = await makeSubscribedWorkspace();
    const sub = await storage.getWorkspaceSubscription(owner.id);
    const p = await makeRenewalPayment(sub, {});
    expect((await fulfillSeatPayment(p)).applied).toBe(true);

    const row = await auditFor(owner.id, AUDIT_ACTIONS.SUBSCRIPTION_RENEWED);
    expect(row.details.trigger).toBe(RENEWAL_TRIGGER.MANUAL);
  });

  it("every trigger is classified as attended or unattended", () => {
    expect(isUnattendedTrigger(RENEWAL_TRIGGER.AUTOMATIC)).toBe(true);
    expect(isUnattendedTrigger(RENEWAL_TRIGGER.RETRY)).toBe(true);
    expect(isUnattendedTrigger(RENEWAL_TRIGGER.MANUAL)).toBe(false);
    expect(isUnattendedTrigger(RENEWAL_TRIGGER.OPERATOR)).toBe(false);
    expect(isUnattendedTrigger(RENEWAL_TRIGGER.MIGRATION)).toBe(false);
    expect(Object.keys(RENEWAL_TRIGGER).length).toBe(5);
  });
});

// ── 6. Provider abstraction ─────────────────────────────────────────────────

describe("payment-instrument abstraction", () => {
  it("a mandate carries a provider and defaults to Razorpay", async () => {
    const { owner } = await makeSubscribedWorkspace();
    const m = await makeActiveMandate(owner.id);
    expect(m.provider).toBe(DEFAULT_PAYMENT_PROVIDER);
    expect(isKnownProvider(m.provider)).toBe(true);
    expect(isKnownProvider("STRIPE")).toBe(false);
  });

  it("token uniqueness is scoped per provider", async () => {
    const { owner } = await makeSubscribedWorkspace();
    const token = `shared_${rand()}`;
    const a = await storage.createMandate({
      workspaceRootId: owner.id, method: MANDATE_METHOD.CARD,
      provider: PAYMENT_PROVIDER.RAZORPAY, providerTokenId: token,
    });
    // Same provider + same token ⇒ the same row (webhook replay safety).
    const dup = await storage.createMandate({
      workspaceRootId: owner.id, method: MANDATE_METHOD.CARD,
      provider: PAYMENT_PROVIDER.RAZORPAY, providerTokenId: token,
    });
    expect(dup.id).toBe(a.id);
    // A different provider holding a colliding token id is a DIFFERENT instrument.
    const other = await storage.createMandate({
      workspaceRootId: owner.id, method: MANDATE_METHOD.CARD,
      provider: "FUTURE_GATEWAY", providerTokenId: token,
    });
    expect(other.id).not.toBe(a.id);
  });

  it("lookup by token is provider-scoped", async () => {
    const { owner } = await makeSubscribedWorkspace();
    const token = `look_${rand()}`;
    const m = await storage.createMandate({
      workspaceRootId: owner.id, method: MANDATE_METHOD.UPI,
      provider: PAYMENT_PROVIDER.RAZORPAY, providerTokenId: token,
    });
    expect(await storage.getMandateByToken(token, PAYMENT_PROVIDER.RAZORPAY)).toMatchObject({ id: m.id });
    expect(await storage.getMandateByToken(token, "FUTURE_GATEWAY")).toBeNull();
  });
});
