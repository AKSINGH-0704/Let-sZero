// M51 Phase 5.2 — payment EXECUTION.
//
// The one place a recurring debit is attempted. It deliberately owns very little:
//
//   • it computes NO price — the amount is `subscription.renewalAmountMinor`,
//     already derived by the pricing authority (shared/seatPricing.js, ADR-020);
//   • it grants NO entitlement — fulfillment stays with fulfillSeatPayment;
//   • it decides NO lifecycle — the sweep (5.4) interprets the outcome against
//     the existing dunning ladder.
//
// It answers exactly one question: "did the money move, not move, or does the
// customer need to authenticate?" — and records enough on the payment row that
// fulfillment can complete days later from a webhook with no session.
//
// NOTHING CALLS THIS YET. Wiring it into the renewal sweep is Phase 5.4, so this
// module deploys inert alongside the rest of M51.

import crypto from "crypto";
import * as Sentry from "@sentry/node";
import { storage } from "./storage.js";
import { rzp, RAZORPAY_KEY_ID } from "./gateways.js";
import { PAYMENT_KIND, PAYMENT_STATUS } from "../shared/schema.js";
import {
  CHARGE_OUTCOME, PAYMENT_PROVIDER, DEFAULT_PAYMENT_PROVIDER,
  MANDATE_STATUS, isAutopayLive, requiresAfa, autopayAllowedFor,
  exceedsMandateCeiling, GATEWAY_REVOKE_PENDING,
} from "../shared/autopay.js";
import { SEAT_TERMS } from "../shared/seatPricing.js";

/**
 * The deterministic gateway receipt for a renewal.
 *
 * Two attempts at the SAME period produce the SAME receipt, so a gateway
 * configured to reject duplicate receipts collapses them for free. That setting
 * is not enabled by default and the correctness proof does not depend on it —
 * this is defence in depth above the period fence, not a substitute for it.
 */
export function renewalReceipt(subscriptionId, periodEnd) {
  // Razorpay caps `receipt` at 40 characters. The natural form —
  // `renew:{uuid}:{epochMs}` — is 56, so order creation would have been REJECTED
  // on every recurring charge, which the charge path would then have read as an
  // unknown outcome and stalled on. A truncated SHA-256 of the same inputs keeps
  // the property that matters (identical for the same subscription+period,
  // different for any other) inside the limit.
  const digest = crypto.createHash("sha256")
    .update(`renew:${subscriptionId}:${new Date(periodEnd).getTime()}`)
    .digest("hex");
  return `rnw_${digest.slice(0, 32)}`; // 36 chars
}

/**
 * Why a charge was not even attempted. Distinct from a FAILED charge: nothing was
 * sent to the gateway and no money was at risk, so none of these consume a
 * dunning rung.
 */
export const CHARGE_SKIP_REASON = Object.freeze({
  AUTOPAY_NOT_LIVE: "autopay_not_live",
  OUT_OF_ROLLOUT_SCOPE: "out_of_rollout_scope",
  PAYMENT_IN_PROGRESS: "payment_in_progress",
  NOTHING_TO_CHARGE: "nothing_to_charge",
  GATEWAY_UNAVAILABLE: "gateway_unavailable",
  UNKNOWN_PROVIDER: "unknown_provider",
  // M52 — the renewal is larger than the ceiling the customer registered at
  // their bank (typically after a seat upgrade). Sending it would guarantee a
  // decline, and every dunning retry would hit the same wall. Skipped rather
  // than attempted, so the ladder is not burned on something a retry cannot fix.
  EXCEEDS_MANDATE_CEILING: "exceeds_mandate_ceiling",
});

// ── Provider dispatch ────────────────────────────────────────────────────────
//
// Adding a second gateway is a new entry here plus a module implementing the
// same two functions. It is NOT a schema change (the mandate model is
// provider-neutral) and NOT a change to any lifecycle, pricing or entitlement code.

const PROVIDERS = {
  [PAYMENT_PROVIDER.RAZORPAY]: {
    available: () => !!rzp,

    /**
     * Attempt one recurring debit.
     *
     * Returns `{ outcome, providerPaymentId?, error?, authUrl? }`. It must never
     * throw for a DECLINE — a decline is a business outcome. It throws only when
     * the outcome is genuinely unknown (network/timeout), which the caller treats
     * as "assume it succeeded" rather than retrying blind.
     */
    async charge({ amountMinor, currency, mandate, receipt, description, payer }) {
      const order = await rzp.orders.create({
        amount: amountMinor, currency, receipt,
        payment_capture: 1,
        notes: { kind: PAYMENT_KIND.SEATS, mandate_id: mandate.id },
      });

      // `email` and `contact` are REQUIRED by Razorpay and are properties of the
      // person, not of the instrument — the mandate row has no such columns, so
      // reading them from the mandate silently sent `undefined` and every charge
      // would have been rejected at validation. They come from the workspace
      // owner, who is the only party authorised to be debited (ADR-017).
      const res = await rzp.payments.createRecurringPayment({
        email: payer.email,
        contact: payer.contact,
        amount: amountMinor,
        currency,
        order_id: order.id,
        customer_id: mandate.providerCustomerId,
        token: mandate.providerTokenId,
        recurring: "1",
        description,
      });

      const providerPaymentId = res?.razorpay_payment_id || res?.id || null;
      const base = { providerPaymentId, providerOrderId: order.id };

      // An AFA-gated debit comes back uncaptured WITH a next-action. Not a
      // decline: the customer must approve it, and burning a dunning rung for
      // that would punish them for doing nothing wrong.
      const nextAction = res?.next?.[0];
      if (nextAction) {
        return { ...base, outcome: CHARGE_OUTCOME.AUTH_REQUIRED, authUrl: nextAction?.url || null };
      }

      if (res?.status === "captured") return { ...base, outcome: CHARGE_OUTCOME.SUCCEEDED };

      // ── `created` / `authorized` with NO next-action is UNKNOWN, not failed ──
      // Previously this fell through to FAILED. An authorized payment is money
      // HELD on the customer's card, and the order carries payment_capture: 1, so
      // the gateway may still capture it. Recording FAILED would have dunned a
      // customer whose money we were about to take, and left a captured payment
      // with no entitlement. Throwing routes it to the caller's unknown-outcome
      // path: the PENDING row stands, no retry, and the webhook or reconciliation
      // settles it — the same treatment a network timeout gets, for the same
      // reason (we do not know, so we must not guess).
      if (res?.status === "created" || res?.status === "authorized") {
        const err = new Error(`recurring charge pending capture (status=${res.status})`);
        err.providerPaymentId = providerPaymentId;
        err.providerOrderId = order.id;
        throw err;
      }

      return {
        ...base,
        outcome: CHARGE_OUTCOME.FAILED,
        error: res?.error_description || res?.error_code || `unexpected_status:${res?.status ?? "none"}`,
      };
    },

    /** Withdraw a stored instrument. Best-effort; reconciliation catches drift. */
    async revoke({ mandate }) {
      if (!mandate.providerCustomerId || !mandate.providerTokenId) return { revoked: false, reason: "no_token" };
      await rzp.customers.deleteToken(mandate.providerCustomerId, mandate.providerTokenId);
      return { revoked: true };
    },
  },
};

/** The execution adapter for a mandate, or null if this build cannot drive it. */
export function providerFor(mandate) {
  return PROVIDERS[mandate?.provider ?? DEFAULT_PAYMENT_PROVIDER] || null;
}

/**
 * Attempt an automatic renewal charge for one subscription.
 *
 * Idempotency is layered and every layer is deliberate:
 *   L0 — refuses while ANY pending seat payment exists for the workspace, so a
 *        customer already at the gateway always beats the machine;
 *   L1 — deterministic receipt derived from (subscription, periodEnd);
 *   L2 — writes `renewsFromPeriodEnd` onto the payment row as the fence witness,
 *        so fulfillment can prove WHICH period this payment bought, days later,
 *        from a webhook with no session;
 *   L3 — the fence itself lives in storage.renewSubscription, reached through
 *        fulfillSeatPayment. Not duplicated here.
 *
 * @returns {{ outcome?: string, skipped?: true, reason?: string, payment?: object }}
 */
export async function attemptRecurringCharge(subscription, {
  now = new Date(), trigger = null,
} = {}) {
  const rootId = subscription.workspaceRootId;

  // ── Rollout gate, evaluated HERE and not only in the sweep's outer loop ─────
  // The M49 lesson: a guard that lives only at the caller is not a guard. A
  // future caller must not be able to reach the gateway by skipping the loop.
  const config = await storage.getAutopayConfig();
  if (!autopayAllowedFor(rootId, config)) {
    return { skipped: true, reason: CHARGE_SKIP_REASON.OUT_OF_ROLLOUT_SCOPE };
  }

  const mandate = subscription.mandateId ? await storage.getMandate(subscription.mandateId) : null;
  if (!isAutopayLive(subscription, mandate, { now })) {
    return { skipped: true, reason: CHARGE_SKIP_REASON.AUTOPAY_NOT_LIVE };
  }

  // L0 — the human always wins. A customer mid-checkout must never be debited
  // underneath by the sweep.
  const outstanding = await storage.getPendingSeatPayment(rootId);
  if (outstanding) {
    return { skipped: true, reason: CHARGE_SKIP_REASON.PAYMENT_IN_PROGRESS, paymentId: outstanding.id };
  }

  const amountMinor = Number(subscription.renewalAmountMinor || 0);
  if (!(amountMinor > 0)) {
    return { skipped: true, reason: CHARGE_SKIP_REASON.NOTHING_TO_CHARGE };
  }

  // ── M52: never send a charge the bank has already been told to refuse ───────
  // The mandate carries the ceiling the customer authorised. A seat upgrade can
  // lift the renewal above it, and from that moment every attempt — including
  // every dunning retry — is a certain decline against a perfectly good card.
  // Attempting anyway would burn the ladder and expire a paying team for a
  // reason no retry could ever fix. Skipping here leaves entitlement intact and
  // routes the customer to the one action that DOES fix it: re-authorising.
  if (exceedsMandateCeiling(amountMinor, mandate)) {
    return {
      skipped: true, reason: CHARGE_SKIP_REASON.EXCEEDS_MANDATE_CEILING,
      amountMinor, maxAmountMinor: mandate.maxAmountMinor,
    };
  }

  const provider = providerFor(mandate);
  if (!provider) return { skipped: true, reason: CHARGE_SKIP_REASON.UNKNOWN_PROVIDER };
  if (!provider.available()) return { skipped: true, reason: CHARGE_SKIP_REASON.GATEWAY_UNAVAILABLE };

  // The period this charge is buying. Captured BEFORE the gateway call so the
  // witness on the payment row can never describe a period the charge did not
  // actually target.
  const renewsFromPeriodEnd = new Date(subscription.periodEnd).toISOString();
  const seats = subscription.scheduledSeats == null ? subscription.seats : subscription.scheduledSeats;
  const term = subscription.scheduledTerm || subscription.term;

  // Seat intent travels on the payment row, exactly as the manual path already
  // does — so fulfillment needs no session and survives a late webhook.
  const seatMeta = {
    seats, requestedSeats: seats, term,
    pricingVersion: subscription.pricingVersion,
    region: subscription.region,
    couponCode: null,
    unitPriceOverrideMinor: subscription.unitPriceOverrideMinor ?? null,
    workspaceRootId: rootId,
    isRenewal: true,
    subscriptionId: subscription.id,
    // L2 — the compare-and-swap witness.
    renewsFromPeriodEnd,
    // Provenance, for the audit trail and for telling a customer which charges
    // they did not initiate.
    autopay: true,
    trigger,
    mandateId: mandate.id,
    provider: mandate.provider,
    afaExpected: requiresAfa(amountMinor, mandate.method),
  };

  const label = `Team Seats renewal — ${seats} × ${SEAT_TERMS[term]?.label ?? term}`;
  const payment = await storage.createPayment({
    userId: rootId, kind: PAYMENT_KIND.SEATS,
    planName: label, credits: 0,
    amountMinor, amountInr: Math.round(amountMinor / 100),
    amountUsd: 0, amountLocal: Math.round(amountMinor / 100),
    currency: subscription.currency || "INR",
    paymentMethod: mandate.provider,
    status: PAYMENT_STATUS.PENDING,
    metadata: { ...seatMeta, razorpay_key_id: RAZORPAY_KEY_ID },
  });

  // The person being debited. Required by the gateway and not derivable from the
  // instrument; the workspace OWNER is the only party who may be charged.
  const owner = await storage.getUserById(rootId);
  if (!owner?.email) {
    return { skipped: true, reason: CHARGE_SKIP_REASON.NOTHING_TO_CHARGE, detail: "no_payer_email" };
  }

  let result;
  try {
    result = await provider.charge({
      amountMinor,
      currency: subscription.currency || "INR",
      mandate,
      payer: { email: owner.email, contact: owner.senderPhone || undefined },
      receipt: renewalReceipt(subscription.id, subscription.periodEnd),
      description: label,
    });
  } catch (err) {
    // ── UNKNOWN OUTCOME — deliberately NOT treated as a decline ───────────────
    // A network error or timeout means we do not know whether the gateway
    // received the request. The payment row stays PENDING, which makes the L0
    // guard refuse another attempt next tick; the webhook or the reconciliation
    // sweep resolves it. Retrying an unknown-state charge risks double-debiting a
    // customer, and entitlement is retained through the grace window either way,
    // so waiting costs the customer nothing.
    Sentry.captureException(err, {
      level: "error",
      tags: { subsystem: "autopay", alert: "AUTOPAY_CHARGE_UNKNOWN_OUTCOME" },
      extra: { subscriptionId: subscription.id, paymentId: payment.id },
    });
    return { outcome: null, unknown: true, payment, error: err.message };
  }

  await storage.updatePayment?.(payment.id, {
    metadata: {
      ...(payment.metadata || {}),
      provider_payment_id: result.providerPaymentId || null,
      // Deliberately the ESTABLISHED key, not a provider-neutral synonym: the
      // webhook resolves a payment via `metadata->>'razorpay_order_id'`
      // (getPaymentByRazorpayOrderId), and that lookup is already tested and
      // already routes order.paid through the CREDITS/SEATS fork. Inventing a
      // second key here would have made every autopay charge arrive as
      // PAYMENT_WEBHOOK_ORPHAN_ORDER — money taken, entitlement never granted.
      // A recurring charge is an ordinary order to the gateway, so it uses the
      // ordinary key. Provider-neutrality lives on the MANDATE model, which is
      // where a second gateway actually changes the shape of things.
      razorpay_order_id: result.providerOrderId || null,
      ...(result.authUrl ? { auth_url: result.authUrl } : {}),
    },
  });

  return { outcome: result.outcome, payment, result };
}

/**
 * Withdraw an instrument at the gateway, then locally.
 *
 * Order matters and is the opposite of binding: bind confirms the NEW instrument
 * before revoking the old, revoke withdraws at the gateway before recording it
 * locally. A local row that says ACTIVE while the bank authorisation is gone
 * produces failed charges; the reverse merely stops charging early, which is the
 * safe direction.
 */
export async function revokeMandate(mandate, { reason = "customer_revoked" } = {}) {
  const provider = providerFor(mandate);
  let gateway = { revoked: false, reason: "no_provider" };
  if (provider?.available()) {
    try {
      gateway = await provider.revoke({ mandate });
    } catch (err) {
      // Never fatal: the local revocation must still happen, or we keep trying to
      // charge an instrument the customer has told us to stop using.
      gateway = { revoked: false, reason: err.message };
      Sentry.captureMessage("AUTOPAY_MANDATE_GATEWAY_REVOKE_FAILED: local revocation proceeding", {
        level: "warning",
        extra: { mandateId: mandate.id, provider: mandate.provider, error: err.message },
      });
    }
  }

  // ── M58 / IDENT-008 — REMEMBER THAT THE GATEWAY STILL HOLDS IT ─────────────
  // The local status has always been the truth about whether WE will charge. It
  // has never been the truth about whether the customer's BANK still holds a
  // standing authorisation in our name. When the gateway call failed, that
  // divergence was reported to Sentry and then forgotten — nothing retried, and
  // the "reconciliation sweep" the transfer path's comment referred to did not
  // exist. A departed workspace owner could be left authorised at their bank
  // indefinitely.
  //
  // The marker goes in `lastError`, the column that already exists for exactly
  // this kind of per-mandate fact, so this needs no migration. It is written
  // ONLY when there is something at the gateway to withdraw — a mandate that
  // never got a token has nothing on the other side, and marking those would
  // fill the queue with work that can never complete.
  const stillLiveAtGateway = !gateway.revoked && !!mandate.providerTokenId;
  const t = await storage.transitionMandate(mandate.id, MANDATE_STATUS.REVOKED, {
    lastError: stillLiveAtGateway ? `${GATEWAY_REVOKE_PENDING}:${gateway.reason || "unknown"}` : null,
  });
  const fanout = await storage.disableAutopayForMandate(mandate.id);
  return { ok: t.ok, gateway, affectedSubscriptions: fanout.affected, reason };
}

/**
 * Retry a gateway withdrawal that has already been recorded locally.
 *
 * Deliberately narrow: the mandate is ALREADY REVOKED here, and this changes no
 * status, no subscription and no entitlement. It attempts one thing — telling
 * the provider to stop honouring the token — and clears the marker only on a
 * confirmed success, so a failure is retried on the next sweep rather than
 * silently declared done.
 */
export async function retryGatewayRevocation(mandate) {
  const provider = providerFor(mandate);
  if (!provider?.available()) return { retried: false, revoked: false, reason: "no_provider" };
  if (!mandate.providerTokenId) return { retried: false, revoked: false, reason: "no_token" };

  let outcome;
  try {
    outcome = await provider.revoke({ mandate });
  } catch (err) {
    outcome = { revoked: false, reason: err.message };
  }
  if (outcome?.revoked) {
    // Clearing the marker IS the record that the authorisation is gone. Nothing
    // else changes: the mandate was already REVOKED locally.
    await storage.updateMandate(mandate.id, { lastError: null });
    return { retried: true, revoked: true, reason: null };
  }
  await storage.updateMandate(mandate.id, {
    lastError: `${GATEWAY_REVOKE_PENDING}:${outcome?.reason || "unknown"}`,
  });
  return { retried: true, revoked: false, reason: outcome?.reason || "unknown" };
}
