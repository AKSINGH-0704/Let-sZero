/**
 * Stripe webhook handler
 * ======================
 * IMPORTANT: This module is imported in server/index.js and the route is
 * registered with express.raw() BEFORE express.json(). The raw body buffer
 * is required for stripe.webhooks.constructEvent() signature verification.
 * If express.json() runs first, the body stream is consumed and verification
 * will fail for all events.
 */

import { stripe } from "./gateways.js";
import { storage } from "./storage.js";
import { PAYMENT_STATUS } from "../shared/schema.js";
import { upgradePlanIfHigher } from "./fulfillPayment.js";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || null;

if (process.env.STRIPE_SECRET_KEY && !WEBHOOK_SECRET) {
  throw new Error("STRIPE_WEBHOOK_SECRET must be set when STRIPE_SECRET_KEY is configured");
}

export async function stripeWebhookHandler(req, res) {
  // Not configured — accept silently so Stripe stops retrying
  if (!stripe || !WEBHOOK_SECRET) {
    return res.sendStatus(200);
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, // raw Buffer — provided by express.raw() in index.js
      req.headers["stripe-signature"],
      WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[STRIPE] Webhook signature failed:", err.message);
    return res.sendStatus(400); // Tell Stripe this was a bad request
  }

  // ACK to Stripe before async processing — Stripe won't retry after 200
  res.sendStatus(200);

  if (event.type !== "payment_intent.succeeded") return;

  const intent = event.data.object;
  const paymentId = intent.metadata?.repmail_payment_id;
  if (!paymentId) {
    console.warn("[STRIPE] payment_intent.succeeded has no repmail_payment_id in metadata — ignoring");
    return;
  }

  try {
    const existing = await storage.getPayment(paymentId);
    if (!existing) {
      console.warn(`[STRIPE] Payment record ${paymentId} not found`);
      return;
    }
    // Idempotency guard — Stripe can retry webhooks
    if (existing.status === PAYMENT_STATUS.SUCCESS) {
      console.log(`[STRIPE] Payment ${paymentId} already completed — skipping (idempotent)`);
      return;
    }

    const payment = await storage.completePayment(paymentId, intent.id);
    await upgradePlanIfHigher(payment.userId, payment.planName);
    console.log(`[STRIPE] Payment ${paymentId} completed — ${payment.credits} credits → user ${payment.userId}`);
  } catch (err) {
    console.error("[STRIPE] Payment completion error:", err.message);
  }
}
