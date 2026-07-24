import crypto from "crypto";
import * as Sentry from "@sentry/node";
import { storage } from "./storage.js";
import { upgradePlanIfHigher } from "./fulfillPayment.js";
import { sendPaymentReceiptEmail } from "./email.js";
import { PAYMENT_STATUS } from "../shared/schema.js";

export async function razorpayWebhookHandler(req, res) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[RZP-WEBHOOK] RAZORPAY_WEBHOOK_SECRET not set — rejecting webhook");
    // Misconfiguration: every real payment webhook will be rejected → silent revenue loss.
    Sentry.captureMessage("PAYMENT_WEBHOOK_NOT_CONFIGURED: RAZORPAY_WEBHOOK_SECRET missing", "fatal");
    return res.status(500).json({ message: "Webhook not configured" });
  }

  const sig = req.headers["x-razorpay-signature"];
  if (!sig) return res.status(400).json({ message: "Missing X-Razorpay-Signature" });

  const expected = crypto
    .createHmac("sha256", secret)
    .update(req.body) // req.body is a raw Buffer here (express.raw middleware)
    .digest("hex");

  let sigValid;
  try {
    sigValid = crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(sig, "hex")
    );
  } catch {
    // Buffer.from throws if sig length doesn't produce same byte count as expected
    sigValid = false;
  }

  if (!sigValid) {
    console.warn("[RZP-WEBHOOK] Signature mismatch — possible replay or wrong secret");
    // A wrong/rotated RAZORPAY_WEBHOOK_SECRET makes EVERY legitimate webhook fail here,
    // silently blocking credit fulfillment. Alert so a config drift is caught immediately.
    // (Sentry groups by fingerprint, so a burst collapses to one issue rather than spamming.)
    Sentry.captureMessage("PAYMENT_WEBHOOK_VERIFY_FAILED: Razorpay signature mismatch", "warning");
    return res.status(400).json({ message: "Invalid signature" });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).json({ message: "Invalid JSON body" });
  }

  const eventType = event.event;
  console.log(`[RZP-WEBHOOK] Received: ${eventType}`);

  try {
    if (eventType === "order.paid") {
      const order = event.payload?.order?.entity;
      const payment = event.payload?.payment?.entity;
      if (!order?.id) {
        console.warn("[RZP-WEBHOOK] order.paid — missing order.id in payload");
        return res.status(200).json({ received: true });
      }

      const repPayment = await storage.getPaymentByRazorpayOrderId(order.id);
      if (!repPayment) {
        console.warn(`[RZP-WEBHOOK] order.paid — no RepMail payment for order ${order.id}`);
        // Reconciliation gap: Razorpay confirms a paid order we have no record of.
        // Money moved but no local payment row exists to fulfill — needs manual review.
        Sentry.captureMessage("PAYMENT_WEBHOOK_ORPHAN_ORDER: order.paid with no matching RepMail payment", {
          level: "error",
          extra: { razorpayOrderId: order.id },
        });
        return res.status(200).json({ received: true });
      }

      // Idempotency: if already completed, skip — prevents double-credit from concurrent webhook + verify
      if (repPayment.status === PAYMENT_STATUS.SUCCESS) {
        console.log(`[RZP-WEBHOOK] order.paid — payment ${repPayment.id} already completed, skipping`);
        return res.status(200).json({ received: true });
      }

      const transactionId = payment?.id || order.id;
      const { payment: completedPayment, credited } = await storage.completePayment(repPayment.id, transactionId);
      await upgradePlanIfHigher(repPayment.userId, repPayment.planName, repPayment.id);
      if (credited) {
        const user = await storage.getUserById(repPayment.userId);
        if (user) {
          sendPaymentReceiptEmail(user.email, user.username, completedPayment, user.creditsRemaining).catch(err =>
            console.error("[EMAIL] Webhook payment receipt failed:", err.message)
          );
        }
      }
      console.log(`[RZP-WEBHOOK] order.paid — ${repPayment.id} completed, plan upgraded for user ${repPayment.userId}`);

    } else if (eventType === "payment.failed") {
      const payment = event.payload?.payment?.entity;
      const orderId = payment?.order_id;
      if (!orderId) {
        console.warn("[RZP-WEBHOOK] payment.failed — missing order_id in payload");
        return res.status(200).json({ received: true });
      }

      const repPayment = await storage.getPaymentByRazorpayOrderId(orderId);
      if (!repPayment) {
        console.warn(`[RZP-WEBHOOK] payment.failed — no RepMail payment for order ${orderId}`);
        return res.status(200).json({ received: true });
      }

      if (repPayment.status !== PAYMENT_STATUS.PENDING) {
        // Already resolved (success or refund) — don't overwrite
        return res.status(200).json({ received: true });
      }

      const reason = payment?.error_description || payment?.error_code || "payment_failed";
      await storage.failPayment(repPayment.id, reason);
      console.log(`[RZP-WEBHOOK] payment.failed — ${repPayment.id} marked failed: ${reason}`);

    } else if (eventType === "refund.created" || eventType === "refund.processed") {
      // M39 Phase 2 — reconcile a provider/dashboard-initiated refund into our ledger.
      // The refund entity carries the Razorpay payment id, which completePayment
      // stored as our transactionId. refundPayment is idempotent (already-refunded →
      // no-op) so an operator refund already applied here won't double-clawback, and a
      // consumed-credit refund is flagged for manual review rather than forced negative.
      const refund = event.payload?.refund?.entity;
      const rzpPaymentId = refund?.payment_id;
      if (!rzpPaymentId) {
        console.warn(`[RZP-WEBHOOK] ${eventType} — missing payment_id in payload`);
        return res.status(200).json({ received: true });
      }
      const repPayment = await storage.getPaymentByTransactionId(rzpPaymentId);
      if (!repPayment) {
        console.warn(`[RZP-WEBHOOK] ${eventType} — no RepMail payment for txn ${rzpPaymentId}`);
        Sentry.captureMessage("PAYMENT_REFUND_ORPHAN: provider refund with no matching RepMail payment", {
          level: "error",
          extra: { razorpayPaymentId: rzpPaymentId, refundId: refund?.id },
        });
        return res.status(200).json({ received: true });
      }
      const result = await storage.refundPayment(repPayment.id, {
        reason: `provider_refund:${eventType}`,
        actor: "razorpay_webhook",
        providerRefundId: refund?.id || null,
      });
      if (result.manualReview) {
        console.warn(`[RZP-WEBHOOK] ${eventType} — payment ${repPayment.id} flagged for manual review (consumed credits, shortfall ${result.shortfall})`);
        Sentry.captureMessage("PAYMENT_REFUND_MANUAL_REVIEW: consumed credits cannot be auto-clawed back", {
          level: "warning",
          extra: { paymentId: repPayment.id, shortfall: result.shortfall, refundId: refund?.id },
        });
      } else {
        console.log(`[RZP-WEBHOOK] ${eventType} — payment ${repPayment.id} refund reconciled (refunded=${result.refunded}, alreadyRefunded=${!!result.alreadyRefunded})`);
      }

    } else if (eventType === "payment.dispute.created") {
      const dispute = event.payload?.dispute?.entity;
      console.warn(`[RZP-WEBHOOK] DISPUTE CREATED — id=${dispute?.id} amount=${dispute?.amount} reason=${dispute?.reason_code}`);
      // A created dispute is not yet a money movement — flag for operator awareness
      // (a lost dispute below is what triggers the credit reversal).
      Sentry.captureMessage("PAYMENT_DISPUTE_CREATED: payment under dispute, monitor for outcome", {
        level: "warning",
        extra: { disputeId: dispute?.id, amount: dispute?.amount, reasonCode: dispute?.reason_code, paymentId: dispute?.payment_id },
      });

    } else if (eventType === "payment.dispute.won") {
      const dispute = event.payload?.dispute?.entity;
      console.log(`[RZP-WEBHOOK] Dispute WON — id=${dispute?.id}`);

    } else if (eventType === "payment.dispute.lost") {
      // M39 Phase 2 — a lost dispute reverses the money at the bank, so the credits
      // must be reversed too. Route through the same refund spine: auto-reverse when
      // the balance can absorb it, else flag for manual review. Never forces negative.
      const dispute = event.payload?.dispute?.entity;
      console.warn(`[RZP-WEBHOOK] Dispute LOST — id=${dispute?.id} — reversing credits`);
      const rzpPaymentId = dispute?.payment_id;
      const repPayment = rzpPaymentId ? await storage.getPaymentByTransactionId(rzpPaymentId) : null;
      if (repPayment) {
        const result = await storage.refundPayment(repPayment.id, {
          reason: `dispute_lost:${dispute?.id}`,
          actor: "razorpay_webhook",
          providerRefundId: null,
        });
        Sentry.captureMessage(
          result.manualReview
            ? "PAYMENT_DISPUTE_LOST: consumed credits — manual credit adjustment required"
            : "PAYMENT_DISPUTE_LOST: credits reversed automatically",
          { level: "warning", extra: { disputeId: dispute?.id, paymentId: repPayment.id, refunded: result.refunded, shortfall: result.shortfall } }
        );
      } else {
        Sentry.captureMessage("PAYMENT_DISPUTE_LOST: no matching RepMail payment — manual review", {
          level: "error",
          extra: { disputeId: dispute?.id, razorpayPaymentId: rzpPaymentId, amount: dispute?.amount },
        });
      }

    } else if (eventType === "payment.dispute.closed") {
      const dispute = event.payload?.dispute?.entity;
      console.log(`[RZP-WEBHOOK] Dispute CLOSED — id=${dispute?.id} status=${dispute?.status}`);

    } else {
      // Unknown / unhandled events — log and return 200 so Razorpay stops retrying
      console.log(`[RZP-WEBHOOK] Unhandled event: ${eventType}`);
    }
  } catch (err) {
    console.error(`[RZP-WEBHOOK] Error handling ${eventType}:`, err.message);
    // Core financial-integrity alert (OPS-007): a fulfillment write failed after a
    // verified webhook. For order.paid this means the customer paid but credits were
    // not delivered. Razorpay retries on the 500 below (up to ~24h), but a persistent
    // failure needs an operator now, not a delayed discovery from a support ticket.
    Sentry.captureException(err, {
      level: "fatal",
      tags: { subsystem: "payments", alert: "PAYMENT_WEBHOOK_FULFILLMENT_FAILED" },
      extra: { eventType },
    });
    // Return 500 so Razorpay will retry — only for unexpected server errors
    return res.status(500).json({ message: "Internal error" });
  }

  return res.status(200).json({ received: true });
}
