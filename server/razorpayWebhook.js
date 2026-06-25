import crypto from "crypto";
import { storage } from "./storage.js";
import { upgradePlanIfHigher } from "./fulfillPayment.js";
import { sendPaymentReceiptEmail } from "./email.js";
import { PAYMENT_STATUS } from "../shared/schema.js";

export async function razorpayWebhookHandler(req, res) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[RZP-WEBHOOK] RAZORPAY_WEBHOOK_SECRET not set — rejecting webhook");
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

    } else if (eventType === "payment.dispute.created") {
      const dispute = event.payload?.dispute?.entity;
      console.warn(`[RZP-WEBHOOK] DISPUTE CREATED — id=${dispute?.id} amount=${dispute?.amount} reason=${dispute?.reason_code}`);
      // TODO: flag payment for manual review when dispute management is added

    } else if (eventType === "payment.dispute.won") {
      const dispute = event.payload?.dispute?.entity;
      console.log(`[RZP-WEBHOOK] Dispute WON — id=${dispute?.id}`);

    } else if (eventType === "payment.dispute.lost") {
      const dispute = event.payload?.dispute?.entity;
      console.warn(`[RZP-WEBHOOK] Dispute LOST — id=${dispute?.id} — credits may need manual adjustment`);

    } else if (eventType === "payment.dispute.closed") {
      const dispute = event.payload?.dispute?.entity;
      console.log(`[RZP-WEBHOOK] Dispute CLOSED — id=${dispute?.id} status=${dispute?.status}`);

    } else {
      // Unknown / unhandled events — log and return 200 so Razorpay stops retrying
      console.log(`[RZP-WEBHOOK] Unhandled event: ${eventType}`);
    }
  } catch (err) {
    console.error(`[RZP-WEBHOOK] Error handling ${eventType}:`, err.message);
    // Return 500 so Razorpay will retry — only for unexpected server errors
    return res.status(500).json({ message: "Internal error" });
  }

  return res.status(200).json({ received: true });
}
