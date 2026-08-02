// M42 — the seat renewal and dunning sweep.
//
// v1 is PREPAID: there is no stored mandate, so RepMail cannot debit a customer
// on its own (Razorpay Subscriptions / UPI Autopay / card tokenization are not
// integrated — see ADR-018 for why v1 deliberately stays inside the existing
// one-time Orders API). This sweep therefore does not CHARGE anyone. It:
//
//   1. finds subscriptions whose period has ended,
//   2. moves them into the dunning window (PAST_DUE) — entitlement RETAINED,
//   3. emails a renewal link on the configured ladder,
//   4. expires them once the grace window is exhausted, and only then brings
//      headcount back inside the free floor.
//
// The shape is deliberately the one a mandate-based auto-charge will slot into:
// when autopay lands, step 2 gains "attempt the charge" and everything else is
// unchanged. That is the "designed for future recurring billing even though v1 is
// prepaid" requirement, without shipping a speculative abstraction.
//
// Idempotent by construction: every action is derived from the row's own state,
// so running the sweep twice in one window changes nothing the second time.

import { storage } from "./storage.js";
import { sendTransactionalEmail } from "./email.js";
import { AUDIT_ACTIONS, PAYMENT_STATUS } from "../shared/schema.js";
import {
  SUBSCRIPTION_STATUS, graceEndsAt, nextDunningAttemptAt, DUNNING_RETRY_DAYS,
} from "../shared/subscriptionStateMachine.js";
import { formatMinor } from "../shared/seatPricing.js";
// M51 Phase 5.4 — the charge step this sweep was shaped for from the start.
import { attemptRecurringCharge } from "./autopayCharge.js";
import { fulfillSeatPayment } from "./fulfillSeats.js";
import {
  CHARGE_OUTCOME, RENEWAL_TRIGGER, predebitNoticeLeadHours, isAutopayLive,
  PREDEBIT_NOTICE_HOURS,
} from "../shared/autopay.js";
import {
  sendPredebitNotice, sendChargeFailed, sendAuthRequired, sendRenewalConfirmation,
} from "./autopayNotifications.js";

const HOUR_MS = 60 * 60 * 1000;

/** What a lapse actually costs, stated once so every message tells the same truth. */
const SEAT_CONSEQUENCE =
  "your workspace drops back to the free seat allowance and the most recently added " +
  "members are deactivated. Nobody is deleted and your credits are never affected.";

/** A masked instrument label, or an honest fallback. Never a raw PAN or VPA. */
const instrumentOf = (mandate) => mandate?.instrumentLabel || "your saved payment method";

/**
 * Has a valid pre-debit notice gone out for THIS period, long enough ago?
 *
 * The regulatory precondition for charging (Phase 4 §11.3). The period is part of
 * the key, so a rescheduled renewal cannot satisfy its obligation with a notice
 * sent for a different period — a stale notice is no notice.
 */
export function predebitNoticeSatisfied(sub, amountMinor, now = new Date()) {
  if (!sub.predebitNoticeSentAt || !sub.predebitNoticePeriodEnd) return false;
  if (new Date(sub.predebitNoticePeriodEnd).getTime() !== new Date(sub.periodEnd).getTime()) return false;
  const leadMs = predebitNoticeLeadHours(amountMinor, null) * HOUR_MS;
  return new Date(now).getTime() - new Date(sub.predebitNoticeSentAt).getTime() >= leadMs;
}

const APP_URL = () => process.env.APP_URL || "http://localhost:5000";

/**
 * Process one subscription whose period has ended. Pure decision + writes; the
 * caller owns iteration so this stays unit-testable one row at a time.
 */
export async function processDueSubscription(sub, { now = new Date() } = {}) {
  // A subscription the customer already cancelled simply ends at period end —
  // no dunning, no chasing email. They told us; respect it.
  if (sub.status === SUBSCRIPTION_STATUS.CANCEL_SCHEDULED) {
    return await expire(sub, "cancelled_by_customer", now);
  }

  if (sub.status === SUBSCRIPTION_STATUS.ACTIVE) {
    // ── M51: attempt the charge FIRST ────────────────────────────────────────
    // This is the step the module header promised: "when autopay lands, step 2
    // gains 'attempt the charge' and everything else is unchanged." A workspace
    // without a live mandate — or outside the rollout scope — falls straight
    // through to the prepaid behaviour below, byte for byte.
    const charged = await tryCharge(sub, { now, trigger: RENEWAL_TRIGGER.AUTOMATIC });
    if (charged.renewed) return charged.result;
    if (charged.deferred) return charged.result;

    // Period ended with no payment: enter the grace window. Seats stay live —
    // a lapsed renewal must not amputate a team mid-sprint.
    const graceEnd = graceEndsAt(now);
    await storage.transitionSubscription(sub.id, SUBSCRIPTION_STATUS.PAST_DUE, {
      firstFailureAt: now,
      graceEndsAt: graceEnd,
      dunningAttempts: 1,
    });
    await storage.createAuditLog({
      userId: sub.workspaceRootId,
      action: AUDIT_ACTIONS.SUBSCRIPTION_PAST_DUE,
      targetType: "subscription", targetId: sub.id,
      details: {
        workspaceRootId: sub.workspaceRootId, graceEndsAt: graceEnd, seats: sub.seats, attempt: 1,
        // M52 — record WHY we are chasing a customer who has a working mandate,
        // so an operator reading the trail can tell a real decline from a
        // notice that had not matured.
        ...(charged.awaitingNotice ? { awaitingPredebitNotice: true } : {}),
      },
    });
    await notify(sub, { attempt: 1, graceEnd, now, autopayPending: charged.awaitingNotice === true });
    return { action: "past_due", graceEndsAt: graceEnd, awaitingNotice: charged.awaitingNotice === true };
  }

  if (sub.status === SUBSCRIPTION_STATUS.PAST_DUE) {
    const graceEnd = sub.graceEndsAt ? new Date(sub.graceEndsAt) : graceEndsAt(sub.firstFailureAt || now);
    if (new Date(now) >= graceEnd) {
      return await expire(sub, "grace_exhausted", now);
    }
    // Still inside grace — the ladder decides when to act again.
    const attempt = sub.dunningAttempts || 0;
    const dueAt = nextDunningAttemptAt(sub.firstFailureAt || now, attempt);
    if (dueAt && new Date(now) >= dueAt && attempt < DUNNING_RETRY_DAYS.length) {
      // ── M51: a dunning rung RETRIES THE CHARGE before it sends a reminder ──
      // Emailing "please pay" to a customer whose card would now work is worse
      // than useless. Only if the retry cannot happen, or fails, does the rung
      // fall back to the prepaid reminder that already existed.
      const charged = await tryCharge(sub, { now, trigger: RENEWAL_TRIGGER.RETRY, graceEnd, attempt: attempt + 1 });
      if (charged.renewed) return charged.result;
      if (charged.deferred) return charged.result;
      if (charged.notified) {
        // The charge failed and the customer was told by the failure notice —
        // the rung is consumed, but a second "please renew" email is not sent.
        await storage.transitionSubscription(sub.id, SUBSCRIPTION_STATUS.PAST_DUE, {
          dunningAttempts: attempt + 1,
        });
        return { action: "dunning_charge_failed", attempt: attempt + 1 };
      }

      await storage.transitionSubscription(sub.id, SUBSCRIPTION_STATUS.PAST_DUE, {
        dunningAttempts: attempt + 1,
      });
      await notify(sub, { attempt: attempt + 1, graceEnd, now });
      return { action: "dunning_reminder", attempt: attempt + 1 };
    }
    return { action: "waiting", graceEndsAt: graceEnd };
  }

  return { action: "skipped", status: sub.status };
}

/**
 * M51 — attempt an automatic charge and interpret the outcome.
 *
 * THE ONE place the three-valued outcome is turned into lifecycle meaning. It
 * returns a small verdict rather than acting on the subscription's status
 * itself, so the existing prepaid branches above stay the authority on when a
 * subscription becomes PAST_DUE or EXPIRED.
 *
 *   renewed  — the period advanced; the caller is done
 *   deferred — nothing was attempted or the outcome is unknown; do NOT advance
 *              the dunning ladder and do NOT change status this tick
 *   notified — the charge failed and the customer has already been told
 *
 * Everything not covered by those three falls through to the prepaid behaviour,
 * which is what makes a workspace without autopay behave exactly as before.
 */
async function tryCharge(sub, { now, trigger, graceEnd = null, attempt = 1 }) {
  const NOTHING = { renewed: false, deferred: false, notified: false };

  const mandate = sub.mandateId ? await storage.getMandate(sub.mandateId) : null;
  if (!isAutopayLive(sub, mandate, { now })) return NOTHING;

  const amountMinor = Number(sub.renewalAmountMinor || 0);

  // ── Regulatory precondition ───────────────────────────────────────────────
  // A charge without a matured pre-debit notice is not permitted. Deferring is
  // safe: entitlement is retained for the whole grace window, so waiting a tick
  // costs the customer nothing, while charging early costs compliance.
  //
  // M52 — the DEFERRAL is right; what the customer was then told was not. This
  // falls through to the prepaid branch, which emails "your seat renewal hasn't
  // gone through" to somebody whose card is fine and whose mandate is live. In
  // the steady state the notice pass (72h look-ahead, hourly, idempotent) means
  // this is rare — but a worker outage spanning the window, an SMTP failure, or
  // a period boundary rescheduled inside the lead time all land here, and each
  // turns a paying customer with working AutoPay into a dunned one.
  //
  // `awaitingNotice` is surfaced so the caller can say the true thing instead.
  // Lifecycle behaviour is deliberately unchanged: the grace clock still starts,
  // because the period really has ended and the entitlement really is finite.
  if (!predebitNoticeSatisfied(sub, amountMinor, now)) {
    return { ...NOTHING, deferred: false, awaitingNotice: true };
  }

  let attemptResult;
  try {
    attemptResult = await attemptRecurringCharge(sub, { now, trigger });
  } catch (err) {
    console.error(`[SEAT-RENEWAL] Charge threw for ${sub.id}:`, err.message);
    return { ...NOTHING, deferred: true, result: { action: "charge_error", error: err.message } };
  }

  // Not attempted (out of scope, mandate not live, gateway down, or a payment is
  // already in flight). Out-of-scope and not-live fall through to prepaid; the
  // others must NOT consume a dunning rung for a platform-side problem.
  if (attemptResult.skipped) {
    const platformSide = ["payment_in_progress", "gateway_unavailable", "unknown_provider"];
    if (platformSide.includes(attemptResult.reason)) {
      return { ...NOTHING, deferred: true, result: { action: "charge_skipped", reason: attemptResult.reason } };
    }
    return NOTHING;
  }

  // Unknown outcome (network/timeout). The PENDING row stays, the L0 guard stops
  // another attempt, and reconciliation resolves it. Never treated as a decline.
  if (attemptResult.unknown) {
    return { ...NOTHING, deferred: true, result: { action: "charge_unknown", paymentId: attemptResult.payment?.id } };
  }

  const owner = await storage.getUserById(sub.workspaceRootId);
  const instrument = instrumentOf(mandate);

  if (attemptResult.outcome === CHARGE_OUTCOME.SUCCEEDED) {
    // Mirrors the verify endpoint: settle the payment, then fulfil. Racing the
    // webhook is safe — whichever arrives second short-circuits on the
    // seatsFulfilledAt marker, and the period fence guarantees one advance.
    const txnId = attemptResult.payment?.metadata?.provider_payment_id || attemptResult.payment.id;
    const { payment } = await storage.completePayment(attemptResult.payment.id, txnId);
    const applied = await fulfillSeatPayment(payment);

    if (!applied.applied && applied.reason === "stale_period") {
      // Another actor already renewed this period. Money moved and must come
      // back, but the entitlement belongs to the winner — so this NEVER routes
      // through reverseSeatPayment (Phase 5.2 §3.5).
      return {
        ...NOTHING, deferred: true,
        result: { action: "charge_duplicate_refund_required", paymentId: payment.id },
      };
    }

    const fresh = await storage.getWorkspaceSubscription(sub.workspaceRootId);
    await storage.transitionSubscription(sub.id, SUBSCRIPTION_STATUS.ACTIVE, {
      lastChargeError: null, autopayAuthRequiredAt: null,
    });
    if (owner?.email) {
      await sendRenewalConfirmation({
        to: owner.email, name: owner.username,
        amountMinor, currency: sub.currency, instrument,
        periodEnd: fresh?.periodEnd ?? sub.periodEnd,
        product: "your RepMail team seats",
        quantityLabel: `${fresh?.seats ?? sub.seats} seats`,
      });
    }
    return { renewed: true, deferred: false, notified: true, result: { action: "auto_renewed", trigger } };
  }

  if (attemptResult.outcome === CHARGE_OUTCOME.AUTH_REQUIRED) {
    // NOT a failure: the customer must approve this specific debit. The dunning
    // ladder does not advance, because they have done nothing wrong.
    await storage.transitionSubscription(sub.id, SUBSCRIPTION_STATUS.PAST_DUE, {
      autopayAuthRequiredAt: now,
      ...(sub.status === SUBSCRIPTION_STATUS.ACTIVE
        ? { firstFailureAt: now, graceEndsAt: graceEndsAt(now), dunningAttempts: 1 }
        : {}),
    });
    await storage.createAuditLog({
      userId: sub.workspaceRootId,
      action: AUDIT_ACTIONS.SUBSCRIPTION_CHARGE_AUTH_REQUIRED,
      targetType: "subscription", targetId: sub.id,
      details: {
        workspaceRootId: sub.workspaceRootId, trigger, amountMinor,
        paymentId: attemptResult.payment?.id ?? null, actor: "system",
      },
    });
    if (owner?.email) {
      await sendAuthRequired({
        to: owner.email, name: owner.username,
        amountMinor, currency: sub.currency, instrument,
        graceEndsAt: graceEnd || graceEndsAt(now),
        consequence: SEAT_CONSEQUENCE,
        product: "your RepMail team seats",
        authUrl: attemptResult.payment?.metadata?.auth_url || null,
      });
    }
    return { ...NOTHING, deferred: true, result: { action: "charge_auth_required", trigger } };
  }

  // FAILED — a real decline. Record it, tell the customer the truth (nothing is
  // lost yet), and let the caller advance the ladder.
  const reason = attemptResult.result?.error || "charge_failed";
  await storage.failPayment(attemptResult.payment.id, reason).catch(() => {});
  await storage.transitionSubscription(sub.id, sub.status, { lastChargeError: reason });
  await storage.createAuditLog({
    userId: sub.workspaceRootId,
    action: AUDIT_ACTIONS.SUBSCRIPTION_CHARGE_FAILED,
    targetType: "subscription", targetId: sub.id,
    details: {
      workspaceRootId: sub.workspaceRootId, trigger, amountMinor, reason,
      attempt, paymentId: attemptResult.payment?.id ?? null, actor: "system",
    },
  });
  if (owner?.email) {
    await sendChargeFailed({
      to: owner.email, name: owner.username,
      amountMinor, currency: sub.currency, instrument, reason,
      nextAttemptAt: nextDunningAttemptAt(sub.firstFailureAt || now, attempt),
      graceEndsAt: graceEnd || graceEndsAt(now),
      consequence: SEAT_CONSEQUENCE,
      product: "your RepMail team seats",
    });
  }
  return { ...NOTHING, notified: true };
}

/** End the entitlement and bring headcount back inside it. */
async function expire(sub, reason, now) {
  await storage.transitionSubscription(sub.id, SUBSCRIPTION_STATUS.EXPIRED, {
    endedAt: now, scheduledSeats: null, scheduledTerm: null,
  });
  const after = await storage.resolveSeatEntitlement(sub.workspaceRootId);
  const overage = await storage.enforceSeatOverage(sub.workspaceRootId, after.seats, { now });

  await storage.createAuditLog({
    userId: sub.workspaceRootId,
    action: AUDIT_ACTIONS.SUBSCRIPTION_EXPIRED,
    targetType: "subscription", targetId: sub.id,
    details: {
      workspaceRootId: sub.workspaceRootId, reason,
      seatsBefore: sub.seats, seatsAfter: after.seats,
      deactivatedMembers: overage.deactivated,
      creditsTouched: false,
    },
  });
  if (overage.deactivated.length > 0) {
    await storage.createAuditLog({
      userId: sub.workspaceRootId,
      action: AUDIT_ACTIONS.SEAT_OVERAGE_DEACTIVATED,
      targetType: "subscription", targetId: sub.id,
      details: { count: overage.deactivated.length, memberIds: overage.deactivated, reason },
    });
  }
  return { action: "expired", reason, deactivated: overage.deactivated, seatsAfter: after.seats };
}

/** Renewal reminder. Never blocks the sweep — email failure is logged, not fatal. */
async function notify(sub, { attempt, graceEnd, autopayPending = false }) {
  try {
    const owner = await storage.getUserById(sub.workspaceRootId);
    if (!owner?.email) return;
    const amount = formatMinor(sub.renewalAmountMinor, sub.currency);
    const deadline = new Date(graceEnd).toDateString();

    // ── M52: do not accuse a customer whose payment method is fine ───────────
    // The charge was withheld because the mandatory pre-debit notice had not
    // matured — a compliance step of OURS, not a failure of theirs. Telling them
    // their renewal "hasn't gone through" is both false and the kind of thing
    // that makes someone re-enter a card that was never the problem. They still
    // need the option to pay now, because the grace clock is genuinely running.
    if (autopayPending) {
      await sendTransactionalEmail(
        owner.email,
        "We'll take your RepMail seat renewal shortly",
        `Hi ${owner.username},\n\n` +
        `Your ${sub.seats}-seat RepMail team subscription has reached its renewal date (${amount}).\n\n` +
        `There's nothing wrong with your payment method and nothing for you to do — we send a notice before every automatic payment, ` +
        `and we'll take this one as soon as that notice has been out long enough.\n\n` +
        `Your team stays fully active in the meantime. If you'd rather not wait, you can pay now:\n` +
        `${APP_URL()}/app/team/seats\n\n` +
        `— The RepMail Team`
      );
      return;
    }

    await sendTransactionalEmail(
      owner.email,
      attempt === 1 ? "Your RepMail team seats need renewing" : `Reminder: renew your RepMail team seats by ${deadline}`,
      `Hi ${owner.username},\n\n` +
      `Your ${sub.seats}-seat RepMail team subscription is due for renewal (${amount}).\n\n` +
      `Your team is still fully active — nothing has changed yet. To keep every seat, renew here:\n` +
      `${APP_URL()}/app/team/seats\n\n` +
      `If it isn't renewed by ${deadline}, your workspace drops back to the free seat allowance and the most recently added members are deactivated. ` +
      `Nobody is deleted and your credits are never affected — reactivating a member is one click once you renew.\n\n` +
      `— The RepMail Team`
    );
  } catch (err) {
    console.error("[SEAT-RENEWAL] Notification failed:", err.message);
  }
}

/**
 * Run one sweep. Returns a summary for the operator log. Bounded per run so a
 * large backlog degrades into several passes rather than one long transaction.
 */
// Whether this process has already announced the sweep. The FIRST run always
// logs, even when it does nothing, because otherwise a registered-but-inert
// sweep is indistinguishable from one that was never wired up at all — the exact
// INCIDENT-001 failure shape (shipped, never switched on, invisible in the logs).
// Subsequent quiet runs stay silent so an hourly job does not spam the log.
let announced = false;

export async function runSeatRenewalSweep({ now = new Date(), limit = 100 } = {}) {
  const config = await storage.getSeatCommerceConfig();
  const first = !announced;
  announced = true;

  // While seat billing is off, entitlement ignores subscriptions entirely — so
  // expiring them would be noise with no customer-visible meaning.
  if (!config.billingEnabled) {
    if (first) {
      console.log("[SEAT-RENEWAL] Sweep registered and running — seat billing is DISABLED, so it is a no-op until seat_billing_enabled=true");
    }
    return { skipped: true, reason: "seat_billing_disabled", registered: true };
  }
  if (first) {
    console.log(`[SEAT-RENEWAL] Sweep registered and running — seat billing is ENABLED (free floor ${config.freeFloor})`);
  }

  // ── M51 passes, inside the EXISTING hourly sweep ──────────────────────────
  // Deliberately NOT new schedulers. This function is already registered once in
  // server/index.js, already guarded against self-overlap, already self-disabling
  // and already alerting on failure. Adding timers would multiply the ways
  // billing can silently stop running — the INCIDENT-001 failure shape.
  const notices = await runPredebitNoticePass({ now, limit });
  const reconciled = await runReconciliationPass({ now, limit });

  const due = await storage.getSubscriptionsDue(now, limit);
  const summary = {
    processed: 0, pastDue: 0, expired: 0, reminders: 0, errors: 0,
    autoRenewed: 0, chargeFailed: 0, authRequired: 0, deferred: 0,
    predebitNotices: notices.sent, reconciled: reconciled.resolved,
  };
  for (const sub of due) {
    try {
      const r = await processDueSubscription(sub, { now });
      summary.processed++;
      if (r.action === "past_due") summary.pastDue++;
      if (r.action === "expired") summary.expired++;
      if (r.action === "dunning_reminder") summary.reminders++;
      if (r.action === "auto_renewed") summary.autoRenewed++;
      if (r.action === "charge_auth_required") summary.authRequired++;
      if (r.action === "dunning_charge_failed") summary.chargeFailed++;
      if (r.action === "charge_unknown" || r.action === "charge_skipped"
        || r.action === "charge_error" || r.action === "charge_duplicate_refund_required") summary.deferred++;
    } catch (err) {
      summary.errors++;
      console.error(`[SEAT-RENEWAL] Failed on subscription ${sub.id}:`, err.message);
    }
  }
  if (summary.processed > 0 || summary.predebitNotices > 0 || summary.reconciled > 0) {
    console.log(`[SEAT-RENEWAL] ${JSON.stringify(summary)}`);
  }
  return summary;
}

/**
 * M51 — send the mandatory pre-debit notice for charges that are coming up.
 *
 * Looks FORWARD, unlike every other pass here: by the time a period has ended it
 * is far too late to give 24 hours' notice. The window is the widest lead time
 * any charge could need, and `predebitNoticeSatisfied` re-checks the exact
 * requirement per subscription at charge time.
 *
 * Idempotent by an atomic claim, so two app instances sweeping the same hour
 * cannot both email the same customer about the same charge.
 */
export async function runPredebitNoticePass({ now = new Date(), limit = 100 } = {}) {
  // The widest lead any charge could need, taken from the policy itself so a
  // change to PREDEBIT_NOTICE_HOURS cannot leave the look-ahead too short.
  const maxLeadMs = Math.max(...Object.values(PREDEBIT_NOTICE_HOURS)) * HOUR_MS;
  const from = new Date(now);
  const to = new Date(new Date(now).getTime() + maxLeadMs);
  const out = { considered: 0, sent: 0, skipped: 0, errors: 0 };

  let upcoming = [];
  try {
    upcoming = await storage.getSubscriptionsUpcoming(from, to, limit);
  } catch (err) {
    console.error("[SEAT-RENEWAL] predebit look-ahead failed:", err.message);
    return out;
  }

  for (const sub of upcoming) {
    out.considered++;
    try {
      const mandate = sub.mandateId ? await storage.getMandate(sub.mandateId) : null;
      // No live mandate ⇒ no automatic charge ⇒ nothing to give notice of. A
      // manual customer is not sent a notice about a debit that cannot happen.
      if (!isAutopayLive(sub, mandate, { now })) { out.skipped++; continue; }

      const amountMinor = Number(sub.renewalAmountMinor || 0);
      if (!(amountMinor > 0)) { out.skipped++; continue; }

      // Only notify once the charge is actually inside ITS OWN lead window —
      // an AFA charge gets 72h, an ordinary one 24h.
      const leadMs = predebitNoticeLeadHours(amountMinor, mandate.method) * HOUR_MS;
      if (new Date(sub.periodEnd).getTime() - new Date(now).getTime() > leadMs) { out.skipped++; continue; }

      // Atomic: whoever claims it sends it. See storage.claimPredebitNotice.
      const claim = await storage.claimPredebitNotice(sub.id, sub.periodEnd, { now });
      if (!claim.claimed) { out.skipped++; continue; }

      const owner = await storage.getUserById(sub.workspaceRootId);
      if (!owner?.email) { out.skipped++; continue; }

      await sendPredebitNotice({
        to: owner.email, name: owner.username,
        amountMinor, currency: sub.currency,
        chargeAt: sub.periodEnd, instrument: instrumentOf(mandate),
        product: "your RepMail team seats",
      });
      out.sent++;
    } catch (err) {
      out.errors++;
      console.error(`[SEAT-RENEWAL] predebit notice failed for ${sub.id}:`, err.message);
    }
  }
  return out;
}

/**
 * M51 — resolve seat payments left PENDING by an unknown-outcome charge.
 *
 * Phase 4 §2.1 makes the charge path deliberately refuse to retry when it cannot
 * tell whether the gateway received the request. That is the safe choice, but it
 * leaves a PENDING row which the L0 guard reads as "a payment is already in
 * progress" — so without this pass, one network blip would stall a workspace's
 * autopay permanently.
 *
 * Conservative by design: it only FAILS a row that is old enough that the
 * gateway would certainly have told us by now, and it never invents a success.
 * A genuinely captured payment is settled by its webhook, not here.
 */
export async function runReconciliationPass({ now = new Date(), limit = 100, staleAfterMs = 24 * HOUR_MS } = {}) {
  const out = { considered: 0, resolved: 0, errors: 0 };
  let stale = [];
  try {
    stale = await storage.getStalePendingSeatPayments(new Date(new Date(now).getTime() - staleAfterMs), limit);
  } catch (err) {
    console.error("[SEAT-RENEWAL] reconciliation query failed:", err.message);
    return out;
  }

  for (const payment of stale) {
    out.considered++;
    try {
      // Only autopay-initiated payments are reconciled here. A customer's
      // abandoned manual checkout is THEIRS to resume — failing it out from
      // under them would break the existing resume flow.
      if (payment.metadata?.autopay !== true) continue;
      if (payment.status !== PAYMENT_STATUS.PENDING) continue;

      await storage.failPayment(payment.id, "reconciliation_unresolved");
      await storage.createAuditLog({
        userId: payment.userId,
        action: AUDIT_ACTIONS.SUBSCRIPTION_CHARGE_FAILED,
        targetType: "payment", targetId: payment.id,
        details: {
          workspaceRootId: payment.metadata?.workspaceRootId ?? null,
          reason: "reconciliation_unresolved",
          trigger: payment.metadata?.trigger ?? null,
          note: "charge outcome never confirmed by the gateway; row cleared so autopay can retry",
          actor: "system",
        },
      });
      out.resolved++;
    } catch (err) {
      out.errors++;
      console.error(`[SEAT-RENEWAL] reconciliation failed for payment ${payment.id}:`, err.message);
    }
  }
  return out;
}
