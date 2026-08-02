// M52 — turning a settled seat purchase into a live AutoPay mandate.
//
// This is the second half of "AutoPay is arranged during checkout". The first
// half (routes.js `prepareMandateIntent` / `startSeatPayment`) creates a PENDING
// mandate row and attaches a token block to the purchase order. This module runs
// once the money has actually settled: it reads the token the bank issued,
// activates the instrument, and points the subscription at it.
//
// ── WHY IT IS A SHARED MODULE AND NOT INLINE IN THE VERIFY ROUTE ─────────────
// A seat payment settles by TWO independent paths, and both must bind:
//
//   • /api/payments/razorpay/verify — the browser came back, and
//   • the `order.paid` webhook   — it didn't.
//
// If only `verify` bound the mandate, a customer who closed the tab after paying
// would get their seats and silently NOT get AutoPay — having explicitly asked
// for it and having completed a bank authorisation for it. That is exactly the
// class of silent divergence this codebase keeps paying for, so the binding lives
// in one place that both callers use.
//
// ── SAFETY POSTURE ───────────────────────────────────────────────────────────
// Everything here is subordinate to the purchase. The seats are already paid for
// and already granted by the time this runs; nothing in this module may fail the
// request, reverse an entitlement, or move money. Every unexpected condition
// resolves to "the customer renews manually", which is a state the whole platform
// already handles correctly and tells the truth about.

import * as Sentry from "@sentry/node";
import { storage } from "./storage.js";
import { rzp } from "./gateways.js";
import { AUDIT_ACTIONS } from "../shared/schema.js";
import { MANDATE_STATUS } from "../shared/autopay.js";
import { sendTransactionalEmail } from "./email.js";

/** Why a settled purchase did not end up with a live mandate. */
export const BIND_SKIP = Object.freeze({
  /** No mandate was ever requested for this payment. The ordinary case. */
  NOT_REQUESTED: "not_requested",
  /** The mandate row is gone, or belongs to another workspace. */
  MANDATE_NOT_FOUND: "mandate_not_found",
  /** Already ACTIVE and bound — the other settlement path won. */
  ALREADY_BOUND: "already_bound",
  /** The mandate reached a terminal state (revoked, failed, expired). */
  MANDATE_TERMINAL: "mandate_terminal",
  /** The bank did not issue a reusable token for this payment. */
  NO_TOKEN: "no_token",
  /** Fulfillment produced no subscription to point at. */
  NO_SUBSCRIPTION: "no_subscription",
  /** The bind itself was refused (see storage.bindMandateToSubscription). */
  BIND_REFUSED: "bind_refused",
  /** The gateway could not be reached to read the token. */
  GATEWAY_UNAVAILABLE: "gateway_unavailable",
});

/**
 * Read the reusable token the bank issued for a settled payment.
 *
 * ⚠️ DERIVED FROM THE GATEWAY, NEVER FROM THE CLIENT. An earlier revision of the
 * separate AutoPay flow accepted `tokenId` from the request body, which would let
 * any owner bind an arbitrary gateway token — including somebody else's — and
 * then have this platform debit it. The same rule applies here and is the reason
 * this function takes a provider payment id and nothing else.
 */
async function deriveToken(providerPaymentId) {
  if (process.env.NODE_ENV !== "production") {
    // Dev/test has no gateway. A deterministic local token keeps the whole
    // journey — including the one-row-per-token guarantee — exercisable.
    return {
      tokenId: `sim_tok_${providerPaymentId}`,
      instrumentLabel: "•••• 4242",
      expiresAt: null,
    };
  }
  if (!rzp) return null;
  const gp = await rzp.payments.fetch(providerPaymentId);
  if (!gp?.token_id) return null;
  return {
    tokenId: gp.token_id,
    instrumentLabel: gp.card?.last4 ? `•••• ${gp.card.last4}` : (gp.vpa || "Saved payment method"),
    expiresAt: gp.card?.expiry_year
      ? new Date(Date.UTC(Number(gp.card.expiry_year), Number(gp.card.expiry_month || 12), 0))
      : null,
  };
}

/**
 * Activate and bind the mandate a settled seat purchase registered.
 *
 * Idempotent, and safe to call from both settlement paths concurrently:
 *   • the mandate transition is a state-machine move, so the second caller finds
 *     it ACTIVE and short-circuits;
 *   • `bindMandateToSubscription` takes `FOR UPDATE` on the subscription, so the
 *     pointer swap itself is serialised;
 *   • re-binding the SAME mandate is not a "replacement" and must not revoke
 *     anything — checked explicitly below.
 *
 * @param {object} payment  a settled SEATS payment
 * @returns {Promise<{bound: boolean, reason?: string, mandateId?: string}>}
 */
export async function bindMandateFromPayment(payment, { actorUserId = null } = {}) {
  const meta = payment?.metadata || {};
  const mandateId = meta.mandateId;
  if (!mandateId || meta.autopayAtCheckout !== true) {
    return { bound: false, reason: BIND_SKIP.NOT_REQUESTED };
  }

  try {
    const rootId = meta.workspaceRootId
      || await storage.resolveWorkspaceRootId(payment.userId);

    const mandate = await storage.getMandate(mandateId);
    // Tenant isolation, re-checked here rather than trusted from the payment row:
    // metadata is the only thing carrying the mandate id across the gap between
    // checkout and settlement, and it must not become a cross-workspace handle.
    if (!mandate || mandate.workspaceRootId !== rootId) {
      return { bound: false, reason: BIND_SKIP.MANDATE_NOT_FOUND };
    }

    // The other settlement path already did this. Not an error — the expected
    // outcome of a webhook racing the verify endpoint.
    const sub = await storage.getWorkspaceSubscription(rootId);
    if (mandate.status === MANDATE_STATUS.ACTIVE && sub?.mandateId === mandate.id) {
      return { bound: true, reason: BIND_SKIP.ALREADY_BOUND, mandateId: mandate.id };
    }
    // A customer who revoked, or a mandate the order path already failed out.
    // Terminal is terminal: a late settlement must not resurrect an instrument
    // the customer has withdrawn.
    if (mandate.status !== MANDATE_STATUS.PENDING && mandate.status !== MANDATE_STATUS.ACTIVE) {
      return { bound: false, reason: BIND_SKIP.MANDATE_TERMINAL };
    }
    if (!sub) return { bound: false, reason: BIND_SKIP.NO_SUBSCRIPTION };

    // Derive the token from the payment the customer actually authorised.
    let derived = null;
    if (mandate.status === MANDATE_STATUS.PENDING) {
      const providerPaymentId = meta.provider_payment_id || payment.transactionId || payment.id;
      try {
        derived = await deriveToken(providerPaymentId);
      } catch (err) {
        console.error("[M52] token derivation failed:", err.message);
        return { bound: false, reason: BIND_SKIP.GATEWAY_UNAVAILABLE };
      }
      if (!derived?.tokenId) {
        // The rail completed the payment but issued no reusable token (a plain
        // netbanking/wallet run, or a card the issuer will not tokenise). The
        // purchase stands; renewal is manual and the UI says so.
        await storage.updateMandate(mandate.id, { lastError: "no_reusable_token" }).catch(() => {});
        return { bound: false, reason: BIND_SKIP.NO_TOKEN };
      }
      await storage.updateMandate(mandate.id, {
        providerTokenId: derived.tokenId,
        instrumentLabel: derived.instrumentLabel,
        ...(derived.expiresAt ? { expiresAt: derived.expiresAt } : {}),
      });
      const t = await storage.transitionMandate(mandate.id, MANDATE_STATUS.ACTIVE);
      if (!t.ok && !t.noop) return { bound: false, reason: BIND_SKIP.BIND_REFUSED };
    }

    const bind = await storage.bindMandateToSubscription(sub.id, mandate.id);
    if (!bind.ok) return { bound: false, reason: BIND_SKIP.BIND_REFUSED, detail: bind.error };

    await storage.createAuditLog({
      userId: actorUserId || payment.userId,
      action: AUDIT_ACTIONS.AUTOPAY_ENABLED,
      targetType: "mandate", targetId: mandate.id,
      details: {
        workspaceRootId: rootId, subscriptionId: sub.id, paymentId: payment.id,
        // The provenance that matters for any future dispute: this authorisation
        // was given as part of a purchase the customer initiated, not by a
        // separate flow and never by an operator.
        source: "checkout", actor: "customer",
      },
    });

    const owner = await storage.getUserById(rootId);
    if (owner?.email) {
      sendTransactionalEmail(
        owner.email,
        "Your seats will renew automatically",
        `Hi ${owner.username},\n\n`
        + `Thanks — your RepMail team seats are live.\n\n`
        + `We'll renew them automatically using ${derived?.instrumentLabel || mandate.instrumentLabel || "the payment method you just used"}, `
        + `and we'll always email you before we charge you.\n\n`
        + `You can turn automatic payment off any time from Team → Seats. Turning it off does not cancel your subscription — you'd just renew manually.\n\n`
        + `— The RepMail Team`
      ).catch(err => console.error("[EMAIL] m52 autopay confirm:", err.message));
    }

    return { bound: true, mandateId: mandate.id };
  } catch (err) {
    // Never fatal. The seats are paid for and granted; the worst outcome
    // available from here is a manual renewal, which the platform handles.
    console.error("[M52] mandate binding failed:", err.message);
    Sentry.captureMessage("SEAT_CHECKOUT_MANDATE_BIND_FAILED: purchase succeeded, AutoPay did not", {
      level: "warning",
      extra: { paymentId: payment?.id, mandateId, error: err.message },
    });
    return { bound: false, reason: "error", detail: err.message };
  }
}
