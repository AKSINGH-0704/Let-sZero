// M42 — seat fulfillment and reversal.
//
// The seat analogue of fulfillPayment.js. It deliberately does NOT reuse
// `upgradePlanIfHigher` or `refundPayment`: those own CREDIT meaning, and a seat
// is a different product. Reusing the credit spine here is the one place in this
// milestone where "reuse the spine" would be wrong — a seat refund routed through
// refundPayment computes a 0-credit clawback and marks the payment REFUNDED while
// the customer silently keeps the seats (ADR-018 §Risks).
//
// Everything here is idempotent: fulfillment is expressed as target state, and
// reversal is a no-op once already applied.

import { storage } from "./storage.js";
import { AUDIT_ACTIONS, PAYMENT_KIND, PAYMENT_STATUS } from "../shared/schema.js";
import { SUBSCRIPTION_STATUS, isEntitling } from "../shared/subscriptionStateMachine.js";
import { quoteSeats, previewRenewal } from "../shared/seatPricing.js";
// M51 — the renewal trigger taxonomy lives with the autopay authority so the
// audit trail and the execution layer cannot disagree about what caused a charge.
import { RENEWAL_TRIGGER, isUnattendedTrigger } from "../shared/autopay.js";

/** Read the seat intent a checkout stored on the payment row. */
export function seatIntentOf(payment) {
  const m = payment?.metadata || {};
  if (payment?.kind !== PAYMENT_KIND.SEATS) return null;
  if (!Number.isInteger(m.seats) || !m.term) return null;
  return {
    // The ENTITLEMENT target (already best-price-adjusted), so fulfillment is
    // idempotent target state.
    seats: m.seats,
    // What the customer actually asked for. Kept alongside so the free seats the
    // best-price guarantee handed over stay recorded — without it the difference
    // is invisible by fulfillment time and the audit field is dead.
    requestedSeats: Number.isInteger(m.requestedSeats) ? m.requestedSeats : m.seats,
    term: m.term,
    pricingVersion: m.pricingVersion,
    region: m.region || "IN",
    couponCode: m.couponCode || null,
    unitPriceOverrideMinor: m.unitPriceOverrideMinor ?? null,
    workspaceRootId: m.workspaceRootId,
    isRenewal: m.isRenewal === true,
    // M51 — the period-fence witness: which period boundary this payment was
    // created to renew FROM. Travels on the payment row so a webhook arriving
    // days later can still prove which period the money bought.
    renewsFromPeriodEnd: m.renewsFromPeriodEnd || null,
    // M51 — what caused this renewal (RENEWAL_TRIGGER). Null on pre-M51 rows and
    // on the manual path, which is treated as MANUAL.
    trigger: m.trigger || null,
    autopay: m.autopay === true,
  };
}

/**
 * Apply a successful SEATS payment to the workspace's entitlement.
 *
 * Idempotent twice over: applySeatPurchase is target-state, and a payment that
 * has already been fulfilled (metadata.seatsFulfilledAt) short-circuits — so a
 * duplicated webhook, a webhook racing the verify endpoint, or a manual replay
 * all converge on the same entitlement.
 *
 * @returns {{ applied: boolean, subscription?: object, reason?: string }}
 */
export async function fulfillSeatPayment(payment) {
  const intent = seatIntentOf(payment);
  if (!intent) return { applied: false, reason: "not_a_seat_payment" };
  if (payment.metadata?.seatsFulfilledAt) {
    return { applied: false, reason: "already_fulfilled" };
  }

  const rootId = intent.workspaceRootId || await storage.resolveWorkspaceRootId(payment.userId);

  // Re-quote server-side rather than trusting the stored amount: the charge is
  // already settled, but the ENTITLEMENT must come from the pricing authority.
  const quote = quoteSeats({
    seats: intent.seats, term: intent.term, version: intent.pricingVersion,
    region: intent.region, couponCode: intent.couponCode,
    unitPriceOverrideMinor: intent.unitPriceOverrideMinor,
  });
  if (quote.error || quote.isEnterprise) {
    return { applied: false, reason: quote.code || "unquotable" };
  }

  const existing = await storage.getWorkspaceSubscription(rootId);
  const renewal = previewRenewal({
    seats: quote.seatsGranted, term: intent.term, region: intent.region,
    unitPriceOverrideMinor: intent.unitPriceOverrideMinor,
  });

  const result = intent.isRenewal && existing
    ? await storage.renewSubscription(existing.id, {
      paymentId: payment.id,
      // M51 period fence. Null on pre-M51 payments ⇒ no comparison ⇒ exactly the
      // previous behaviour, so existing in-flight payments keep working.
      expectedPeriodEnd: intent.renewsFromPeriodEnd,
    })
    : await storage.applySeatPurchase(rootId, {
      seats: quote.seatsGranted,
      term: intent.term,
      pricingVersion: quote.version,
      currency: quote.currency,
      region: quote.region,
      unitPriceOverrideMinor: intent.unitPriceOverrideMinor,
      couponCode: intent.couponCode,
      renewalAmountMinor: renewal.error ? quote.totalMinor : renewal.totalMinor,
      paymentId: payment.id,
    });

  // ── The period fence rejected this payment (M51 Phase 5.2) ─────────────────
  // Another actor already renewed this period. The money is REAL and must be
  // refunded — but the entitlement belongs to the payment that won, so nothing
  // here may touch it. The caller refunds and alerts; it must NEVER route this
  // through reverseSeatPayment, which would expire a subscription the winning
  // payment legitimately owns (the exact analogue of the rule that a SEATS
  // payment must never reach the credit clawback).
  if (result.ok === false && result.error === "stale_period") {
    return {
      applied: false, reason: "stale_period",
      expectedPeriodEnd: result.expectedPeriodEnd, actualPeriodEnd: result.actualPeriodEnd,
    };
  }
  if (result.ok === false) {
    return { applied: false, reason: result.error || "renewal_rejected", status: result.status };
  }

  const subscription = result.subscription || result?.subscription;

  // Mark the payment fulfilled so a replay short-circuits before touching state.
  await storage.updatePayment?.(payment.id, {
    subscriptionId: subscription?.id ?? null,
    metadata: { ...(payment.metadata || {}), seatsFulfilledAt: new Date().toISOString() },
  });

  // M51 — every renewal records WHAT CAUSED IT. The action already separates an
  // unattended charge from a customer-initiated one (that distinction stays
  // permanent: "did the customer initiate this?" is the first question asked of
  // any disputed recurring charge); `details.trigger` adds the finer grain that
  // tells a first automatic attempt from a dunning retry, an operator re-drive,
  // or a migration. A payment with no trigger is a manual one, which is what
  // every pre-M51 row is.
  const trigger = intent.trigger || RENEWAL_TRIGGER.MANUAL;
  const renewalAction = isUnattendedTrigger(trigger)
    ? AUDIT_ACTIONS.SUBSCRIPTION_AUTO_RENEWED
    : AUDIT_ACTIONS.SUBSCRIPTION_RENEWED;

  await storage.createAuditLog({
    userId: payment.userId,
    action: intent.isRenewal ? renewalAction
      : (result.created ? AUDIT_ACTIONS.SUBSCRIPTION_ACTIVATED : AUDIT_ACTIONS.SUBSCRIPTION_SEATS_CHANGED),
    targetType: "subscription",
    targetId: subscription?.id ?? null,
    details: {
      workspaceRootId: rootId,
      paymentId: payment.id,
      ...(intent.isRenewal ? { trigger, autopay: intent.autopay === true } : {}),
      seats: subscription?.seats ?? quote.seatsGranted,
      previousSeats: result.previousSeats ?? null,
      requestedSeats: intent.requestedSeats,
      // The best-price guarantee handing over free seats is a commercial event
      // worth recording, not just a UI flourish.
      grantedFreeSeats: Math.max(0, (subscription?.seats ?? quote.seatsGranted) - intent.requestedSeats),
      term: intent.term,
      pricingVersion: quote.version,
      amountMinor: quote.totalMinor,
      actor: "system",
    },
  });

  return { applied: true, subscription, quote, created: result.created === true };
}

/**
 * Reverse a SEATS payment (operator refund, provider refund, or a lost dispute).
 *
 * Seats are a SERVICE PERIOD, not a stock of credits, so there is nothing to claw
 * back from a balance. The correct reversal is to end the entitlement and bring
 * the workspace back inside it. Members beyond the new ceiling are DEACTIVATED
 * (restorable), never deleted, and no credit is touched.
 *
 * @returns {{ reversed: boolean, reason?: string, deactivated?: string[] }}
 */
export async function reverseSeatPayment(payment, { reason = "seat_refund", actor = "system" } = {}) {
  const intent = seatIntentOf(payment);
  if (!intent) return { reversed: false, reason: "not_a_seat_payment" };

  const rootId = intent.workspaceRootId || await storage.resolveWorkspaceRootId(payment.userId);
  const subscription = await storage.getWorkspaceSubscription(rootId);
  if (!subscription || !isEntitling(subscription.status)) {
    return { reversed: false, reason: "no_live_subscription" };
  }

  await storage.transitionSubscription(subscription.id, SUBSCRIPTION_STATUS.EXPIRED, {
    endedAt: new Date(),
    scheduledSeats: null,
    scheduledTerm: null,
  });

  // Bring headcount inside the post-reversal entitlement (free floor, or the
  // grandfathered/legacy allowance — resolveSeatEntitlement decides, not us).
  const after = await storage.resolveSeatEntitlement(rootId);
  const overage = await storage.enforceSeatOverage(rootId, after.seats);

  await storage.createAuditLog({
    userId: payment.userId,
    action: AUDIT_ACTIONS.SUBSCRIPTION_CANCELLED,
    targetType: "subscription",
    targetId: subscription.id,
    details: {
      workspaceRootId: rootId, paymentId: payment.id, reason, actor,
      seatsBefore: subscription.seats, seatsAfter: after.seats,
      deactivatedMembers: overage.deactivated,
      creditsTouched: false, // stated explicitly: a seat reversal never moves credits
    },
  });

  if (overage.deactivated.length > 0) {
    await storage.createAuditLog({
      userId: payment.userId,
      action: AUDIT_ACTIONS.SEAT_OVERAGE_DEACTIVATED,
      targetType: "subscription",
      targetId: subscription.id,
      details: { count: overage.deactivated.length, memberIds: overage.deactivated, reason },
    });
  }

  return { reversed: true, deactivated: overage.deactivated, seatsAfter: after.seats };
}

/**
 * Route a settled payment to the right fulfillment path. The ONE place the
 * CREDITS/SEATS fork is expressed for incoming money, so a new product cannot be
 * added without this switch being updated.
 */
export function isSeatPayment(payment) {
  return payment?.kind === PAYMENT_KIND.SEATS;
}

/** Guard used by the refund paths: a seat payment must never reach credit clawback. */
export function assertNotCreditRefund(payment) {
  if (isSeatPayment(payment)) {
    throw new Error(
      `Payment ${payment.id} is a SEATS payment and must be reversed via reverseSeatPayment, not the credit clawback path.`
    );
  }
  return true;
}

export { PAYMENT_STATUS };
