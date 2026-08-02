// M51 Phase 5.1 — the mandate model against a real storage backend.
//
// Runs against the in-memory backend (the one the rest of the suite exercises),
// which mirrors storage.js method-for-method. Both backends call the SAME shared
// authority for every decision, so these assertions are about PERSISTENCE and
// LEGALITY, not about policy.
//
// The properties under test:
//   • deploying 5.1 changes nobody's renewal mode (billing-neutral by construction)
//   • a mandate cannot be resurrected out of a terminal state
//   • replacing a payment method never touches subscription status
//   • an instrument may only fund the workspace that authorised it
//   • a dead instrument disables autopay WITHOUT cancelling anything
//   • the rollout gate fails toward OFF when the settings are absent

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { USER_ROLES } from "../../shared/schema.js";
import { SUBSCRIPTION_STATUS as S } from "../../shared/subscriptionStateMachine.js";
import { SEAT_SETTING_KEYS } from "../../shared/seatEntitlement.js";
import { SEAT_TERMS, quoteSeats } from "../../shared/seatPricing.js";
import {
  MANDATE_STATUS, MANDATE_METHOD, AUTOPAY_SCOPE, AUTOPAY_SETTING_KEYS,
  isAutopayLive, renewalModeFor, autopayAllowedFor,
} from "../../shared/autopay.js";
import { RENEWAL_MODE } from "../../shared/subscriptionStateMachine.js";

let storage;
const rand = () => Math.random().toString(36).slice(2);
const DAY = 24 * 60 * 60 * 1000;

async function makeOwner() {
  return storage.createUser({
    username: `m51_owner_${rand()}`, email: `m51_owner_${rand()}@example.com`,
    password: "pw-" + rand(), role: USER_ROLES.USER, parentId: null,
    plan: "free", isTrialUser: false, mustResetPassword: false,
  });
}

/** A workspace with a live seat subscription — the thing autopay attaches to. */
async function makeSubscribedWorkspace(seats = 3) {
  const owner = await makeOwner();
  const q = quoteSeats({ seats, term: SEAT_TERMS.MONTHLY.id });
  const { subscription } = await storage.applySeatPurchase(owner.id, {
    seats: q.seatsGranted, term: SEAT_TERMS.MONTHLY.id,
    pricingVersion: q.version, renewalAmountMinor: q.totalMinor,
  });
  return { owner, subscription };
}

/** An ACTIVE mandate for a workspace. */
async function makeActiveMandate(rootId, over = {}) {
  const m = await storage.createMandate({
    workspaceRootId: rootId, method: MANDATE_METHOD.CARD,
    providerTokenId: `token_${rand()}`, instrumentLabel: "•••• 4242",
    maxAmountMinor: 5_000_00, ...over,
  });
  const r = await storage.transitionMandate(m.id, MANDATE_STATUS.ACTIVE);
  return r.mandate;
}

beforeAll(async () => {
  process.env.FREE_PLAN_ENABLED = "true";
  ({ storage } = await import("../../server/storage.js"));
});
afterAll(async () => {
  await storage.setPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED, "false", null);
  await storage.setPlatformSetting(AUTOPAY_SETTING_KEYS.SCOPE, "OFF", null);
});

describe("5.1 is billing-neutral", () => {
  // The deployment claim. If this fails, shipping 5.1 changes how somebody's
  // money moves — which is exactly what "deploys inert" is supposed to rule out.
  it("a new subscription is born MANUAL with no instrument", async () => {
    const { subscription } = await makeSubscribedWorkspace();
    expect(subscription.autopayEnabled).toBe(false);
    expect(subscription.mandateId ?? null).toBeNull();
    expect(isAutopayLive(subscription, null)).toBe(false);
    expect(renewalModeFor(subscription, null)).toBe(RENEWAL_MODE.MANUAL);
  });

  it("the rollout gate is closed when the settings are absent", async () => {
    await storage.setPlatformSetting(AUTOPAY_SETTING_KEYS.SCOPE, "", null);
    const cfg = await storage.getAutopayConfig();
    expect(cfg.scope).toBe(AUTOPAY_SCOPE.OFF);
    expect(autopayAllowedFor("any-workspace", cfg)).toBe(false);
  });

  it("the operator can open the gate for named workspaces only", async () => {
    const { owner } = await makeSubscribedWorkspace();
    await storage.setPlatformSetting(AUTOPAY_SETTING_KEYS.SCOPE, "INTERNAL", null);
    await storage.setPlatformSetting(AUTOPAY_SETTING_KEYS.ALLOWLIST, owner.id, null);

    const cfg = await storage.getAutopayConfig();
    expect(autopayAllowedFor(owner.id, cfg)).toBe(true);
    expect(autopayAllowedFor("some-other-workspace", cfg)).toBe(false);

    await storage.setPlatformSetting(AUTOPAY_SETTING_KEYS.SCOPE, "OFF", null);
  });
});

describe("mandate persistence", () => {
  it("a mandate is born PENDING and confirms to ACTIVE", async () => {
    const { owner } = await makeSubscribedWorkspace();
    const m = await storage.createMandate({
      workspaceRootId: owner.id, method: MANDATE_METHOD.UPI,
    });
    expect(m.status).toBe(MANDATE_STATUS.PENDING);
    expect(m.confirmedAt).toBeNull();

    const r = await storage.transitionMandate(m.id, MANDATE_STATUS.ACTIVE);
    expect(r.ok).toBe(true);
    expect(r.mandate.status).toBe(MANDATE_STATUS.ACTIVE);
    expect(r.mandate.confirmedAt).toBeTruthy();
  });

  // Structural idempotency for token.* webhooks, which have no pre-existing local
  // row to dedup against. Mirrors the payment_mandates_token_uq partial index.
  it("one local row per gateway token, however many times it is delivered", async () => {
    const { owner } = await makeSubscribedWorkspace();
    const token = `token_${rand()}`;
    const a = await storage.createMandate({ workspaceRootId: owner.id, method: MANDATE_METHOD.CARD, providerTokenId: token });
    const b = await storage.createMandate({ workspaceRootId: owner.id, method: MANDATE_METHOD.CARD, providerTokenId: token });
    expect(b.id).toBe(a.id);
    expect(await storage.getMandateByToken(token)).toMatchObject({ id: a.id });
  });

  it("refuses an illegal transition rather than performing it", async () => {
    const { owner } = await makeSubscribedWorkspace();
    const m = await makeActiveMandate(owner.id);
    await storage.transitionMandate(m.id, MANDATE_STATUS.REVOKED);

    const r = await storage.transitionMandate(m.id, MANDATE_STATUS.ACTIVE);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("illegal_transition");
    expect((await storage.getMandate(m.id)).status).toBe(MANDATE_STATUS.REVOKED);
  });

  it("resuming a pause clears the pause window", async () => {
    const { owner } = await makeSubscribedWorkspace();
    const m = await makeActiveMandate(owner.id);
    await storage.transitionMandate(m.id, MANDATE_STATUS.PAUSED, { pausedUntil: new Date(Date.now() + 7 * DAY) });
    expect((await storage.getMandate(m.id)).pausedUntil).toBeTruthy();

    await storage.transitionMandate(m.id, MANDATE_STATUS.ACTIVE);
    const after = await storage.getMandate(m.id);
    expect(after.status).toBe(MANDATE_STATUS.ACTIVE);
    expect(after.pausedUntil).toBeNull();
  });

  it("updateMandate cannot change status", async () => {
    const { owner } = await makeSubscribedWorkspace();
    const m = await makeActiveMandate(owner.id);
    await storage.updateMandate(m.id, { status: MANDATE_STATUS.REVOKED, instrumentLabel: "•••• 1111" });
    const after = await storage.getMandate(m.id);
    expect(after.status).toBe(MANDATE_STATUS.ACTIVE);   // the transition table owns status
    expect(after.instrumentLabel).toBe("•••• 1111");
  });

  it("surfaces mandates expiring inside a window, active ones only", async () => {
    const { owner } = await makeSubscribedWorkspace();
    const soon = await makeActiveMandate(owner.id, { expiresAt: new Date(Date.now() + 5 * DAY) });
    const later = await makeActiveMandate(owner.id, { expiresAt: new Date(Date.now() + 90 * DAY) });
    const revoked = await makeActiveMandate(owner.id, { expiresAt: new Date(Date.now() + 5 * DAY) });
    await storage.transitionMandate(revoked.id, MANDATE_STATUS.REVOKED);

    const due = await storage.getExpiringMandates(new Date(Date.now() + 30 * DAY), 100);
    const ids = due.map(m => m.id);
    expect(ids).toContain(soon.id);
    expect(ids).not.toContain(later.id);
    expect(ids).not.toContain(revoked.id);
  });
});

describe("binding an instrument to a subscription", () => {
  it("enabling autopay makes the subscription renew automatically", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const m = await makeActiveMandate(owner.id);

    const r = await storage.bindMandateToSubscription(subscription.id, m.id);
    expect(r.ok).toBe(true);
    expect(r.replaced).toBe(false);
    expect(r.subscription.autopayEnabled).toBe(true);
    expect(isAutopayLive(r.subscription, m)).toBe(true);
    expect(renewalModeFor(r.subscription, m)).toBe(RENEWAL_MODE.AUTOMATIC);
  });

  // Tenant isolation: a mandate id must not be a cross-workspace handle.
  it("an instrument may only fund the workspace that authorised it", async () => {
    const a = await makeSubscribedWorkspace();
    const b = await makeSubscribedWorkspace();
    const mandateOfB = await makeActiveMandate(b.owner.id);

    const r = await storage.bindMandateToSubscription(a.subscription.id, mandateOfB.id);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("mandate_workspace_mismatch");
  });

  it("refuses to bind an unconfirmed instrument", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const pending = await storage.createMandate({ workspaceRootId: owner.id, method: MANDATE_METHOD.CARD });
    const r = await storage.bindMandateToSubscription(subscription.id, pending.id);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("mandate_not_active");
  });

  // THE payoff of modelling the decision as a pointer (Phase 3 §3): replacing a
  // payment method is a pointer swap, not a lifecycle event.
  it("replacing a payment method never touches subscription state", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace(5);
    const oldCard = await makeActiveMandate(owner.id, { instrumentLabel: "•••• 4242" });
    await storage.bindMandateToSubscription(subscription.id, oldCard.id);

    const before = await storage.getWorkspaceSubscription(owner.id);
    const snapshot = {
      status: before.status, seats: before.seats, term: before.term,
      periodStart: before.periodStart, periodEnd: before.periodEnd,
      pricingVersion: before.pricingVersion, renewalAmountMinor: before.renewalAmountMinor,
    };

    // New instrument confirmed BEFORE the old one is revoked.
    const newCard = await makeActiveMandate(owner.id, { instrumentLabel: "•••• 1881" });
    const swap = await storage.bindMandateToSubscription(subscription.id, newCard.id);
    expect(swap.ok).toBe(true);
    expect(swap.replaced).toBe(true);
    expect(swap.previousMandateId).toBe(oldCard.id);

    // Only then is the outgoing instrument withdrawn.
    await storage.transitionMandate(oldCard.id, MANDATE_STATUS.REVOKED);

    const after = await storage.getWorkspaceSubscription(owner.id);
    expect({
      status: after.status, seats: after.seats, term: after.term,
      periodStart: after.periodStart, periodEnd: after.periodEnd,
      pricingVersion: after.pricingVersion, renewalAmountMinor: after.renewalAmountMinor,
    }).toEqual(snapshot);
    expect(after.mandateId).toBe(newCard.id);
    expect(after.autopayEnabled).toBe(true);
  });

  it("binding a fresh instrument clears a stale auth demand and error", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const m1 = await makeActiveMandate(owner.id);
    await storage.bindMandateToSubscription(subscription.id, m1.id);
    await storage.transitionSubscription(subscription.id, S.PAST_DUE, {
      autopayAuthRequiredAt: new Date(), lastChargeError: "card_declined",
      firstFailureAt: new Date(), dunningAttempts: 1,
    });

    const m2 = await makeActiveMandate(owner.id);
    const r = await storage.bindMandateToSubscription(subscription.id, m2.id);
    expect(r.subscription.autopayAuthRequiredAt).toBeNull();
    expect(r.subscription.lastChargeError).toBeNull();
    // The subscription is still PAST_DUE — replacing a card does not pay the bill.
    expect(r.subscription.status).toBe(S.PAST_DUE);
  });
});

describe("a dead instrument degrades, it does not amputate", () => {
  it("revoking an instrument disables autopay without cancelling the subscription", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace(4);
    const m = await makeActiveMandate(owner.id);
    await storage.bindMandateToSubscription(subscription.id, m.id);

    await storage.transitionMandate(m.id, MANDATE_STATUS.REVOKED);
    const fanout = await storage.disableAutopayForMandate(m.id);
    expect(fanout.count).toBe(1);
    expect(fanout.affected).toContain(subscription.id);

    const after = await storage.getWorkspaceSubscription(owner.id);
    // Still ACTIVE, still entitled, still the same seats — only the MODE changed.
    expect(after.status).toBe(S.ACTIVE);
    expect(after.seats).toBe(4);
    expect(after.autopayEnabled).toBe(false);
    expect(renewalModeFor(after, await storage.getMandate(m.id))).toBe(RENEWAL_MODE.MANUAL);
    // The pointer is kept deliberately, so the UI can say "your card was revoked"
    // rather than showing an unexplained "not set up".
    expect(after.mandateId).toBe(m.id);
  });

  it("the fan-out is idempotent", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const m = await makeActiveMandate(owner.id);
    await storage.bindMandateToSubscription(subscription.id, m.id);

    expect((await storage.disableAutopayForMandate(m.id)).count).toBe(1);
    expect((await storage.disableAutopayForMandate(m.id)).count).toBe(0);
  });

  it("turning autopay off leaves the instrument usable for re-enabling", async () => {
    const { owner, subscription } = await makeSubscribedWorkspace();
    const m = await makeActiveMandate(owner.id);
    await storage.bindMandateToSubscription(subscription.id, m.id);

    await storage.setAutopayEnabled(subscription.id, false);
    let after = await storage.getWorkspaceSubscription(owner.id);
    expect(after.autopayEnabled).toBe(false);
    expect((await storage.getMandate(m.id)).status).toBe(MANDATE_STATUS.ACTIVE);

    // Re-enabling needs no re-authorisation — that is the difference between
    // "turn off automatic payment" and "revoke my card".
    await storage.setAutopayEnabled(subscription.id, true);
    after = await storage.getWorkspaceSubscription(owner.id);
    expect(isAutopayLive(after, await storage.getMandate(m.id))).toBe(true);
  });
});
