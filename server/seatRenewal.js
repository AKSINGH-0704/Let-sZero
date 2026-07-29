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
import { AUDIT_ACTIONS } from "../shared/schema.js";
import {
  SUBSCRIPTION_STATUS, graceEndsAt, nextDunningAttemptAt, DUNNING_RETRY_DAYS,
} from "../shared/subscriptionStateMachine.js";
import { formatMinor } from "../shared/seatPricing.js";

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
      details: { workspaceRootId: sub.workspaceRootId, graceEndsAt: graceEnd, seats: sub.seats, attempt: 1 },
    });
    await notify(sub, { attempt: 1, graceEnd, now });
    return { action: "past_due", graceEndsAt: graceEnd };
  }

  if (sub.status === SUBSCRIPTION_STATUS.PAST_DUE) {
    const graceEnd = sub.graceEndsAt ? new Date(sub.graceEndsAt) : graceEndsAt(sub.firstFailureAt || now);
    if (new Date(now) >= graceEnd) {
      return await expire(sub, "grace_exhausted", now);
    }
    // Still inside grace — send the next reminder if the ladder says it's due.
    const attempt = sub.dunningAttempts || 0;
    const dueAt = nextDunningAttemptAt(sub.firstFailureAt || now, attempt);
    if (dueAt && new Date(now) >= dueAt && attempt < DUNNING_RETRY_DAYS.length) {
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
async function notify(sub, { attempt, graceEnd }) {
  try {
    const owner = await storage.getUserById(sub.workspaceRootId);
    if (!owner?.email) return;
    const amount = formatMinor(sub.renewalAmountMinor, sub.currency);
    const deadline = new Date(graceEnd).toDateString();
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
export async function runSeatRenewalSweep({ now = new Date(), limit = 100 } = {}) {
  const config = await storage.getSeatCommerceConfig();
  // While seat billing is off, entitlement ignores subscriptions entirely — so
  // expiring them would be noise with no customer-visible meaning.
  if (!config.billingEnabled) return { skipped: true, reason: "seat_billing_disabled" };

  const due = await storage.getSubscriptionsDue(now, limit);
  const summary = { processed: 0, pastDue: 0, expired: 0, reminders: 0, errors: 0 };
  for (const sub of due) {
    try {
      const r = await processDueSubscription(sub, { now });
      summary.processed++;
      if (r.action === "past_due") summary.pastDue++;
      if (r.action === "expired") summary.expired++;
      if (r.action === "dunning_reminder") summary.reminders++;
    } catch (err) {
      summary.errors++;
      console.error(`[SEAT-RENEWAL] Failed on subscription ${sub.id}:`, err.message);
    }
  }
  if (summary.processed > 0) {
    console.log(`[SEAT-RENEWAL] ${JSON.stringify(summary)}`);
  }
  return summary;
}
