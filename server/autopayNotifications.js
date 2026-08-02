// M51 Phase 5.4 — recurring-billing customer notifications.
//
// Reuses `sendTransactionalEmail`, which already owns the transport, the
// transient/permanent failure classification and the retry+backoff ladder
// (server/email.js). Nothing here retries, queues or throttles — adding a second
// retry layer above one that already exists is how double-sends happen.
//
// ── NEUTRALITY ──────────────────────────────────────────────────────────────
// Every message below is written against the BILLING FACTS — amount, date,
// period, instrument label — and never against Razorpay, cards, UPI or seats
// specifically. A `product` label and a masked `instrument` string are passed in
// by the caller, so the same messages serve a future commercial product or a
// second gateway without a copy rewrite. The only product-specific sentence is
// supplied by the caller as `consequence`.
//
// ── WHAT THESE MESSAGES MUST NEVER DO ───────────────────────────────────────
// Promise a capability the system lacks (M44), or imply a customer has lost
// something they still have. Every message about a failure states the
// entitlement consequence explicitly and truthfully — the discipline that made
// the existing dunning copy generate no support load.

import { sendTransactionalEmail } from "./email.js";
import { formatMinor } from "../shared/seatPricing.js";
import { requiresAfa } from "../shared/autopay.js";

const APP_URL = () => process.env.APP_URL || "http://localhost:5000";
const BILLING_PATH = "/app/team/seats";

/** The one link every message points at. State lives on the page, not in the email. */
export function billingUrl() {
  return `${APP_URL()}${BILLING_PATH}`;
}

const money = (minor, currency) => formatMinor(minor, currency || "INR");
const day = (d) => new Date(d).toDateString();

/**
 * Send, never throw.
 *
 * A notification failure must not abort a billing sweep — the existing dunning
 * `notify()` already establishes this. But unlike a reminder, a PRE-DEBIT notice
 * is a regulatory precondition for charging, so the caller needs to know whether
 * it actually went out. Hence a boolean rather than a silent void.
 */
async function deliver(to, subject, body, tag) {
  try {
    await sendTransactionalEmail(to, subject, body);
    return true;
  } catch (err) {
    console.error(`[AUTOPAY-NOTIFY] ${tag} failed:`, err.message);
    return false;
  }
}

/**
 * The mandatory pre-debit notice (RBI): the customer must be told before money
 * moves. An AFA-gated charge additionally needs the customer to ACT, so it goes
 * out earlier and carries an instruction rather than only information.
 */
export async function sendPredebitNotice({
  to, name, amountMinor, currency, chargeAt, instrument, product = "your subscription",
}) {
  const afa = requiresAfa(amountMinor, null);
  const amount = money(amountMinor, currency);
  const subject = afa
    ? `Action needed: confirm your ${amount} payment for ${product}`
    : `Upcoming payment of ${amount} for ${product}`;

  const body =
    `Hi ${name},\n\n` +
    `${product} renews on ${day(chargeAt)} and we'll charge ${amount} to ${instrument}.\n\n` +
    (afa
      ? `Your bank requires you to approve this payment because of its amount. ` +
        `Please confirm it here so your renewal goes through:\n${billingUrl()}\n\n` +
        `If it isn't confirmed, nothing is lost immediately — you'll keep everything ` +
        `while we retry, and you can always pay manually from the same page.\n\n`
      : `You don't need to do anything — this is just advance notice.\n\n`) +
    `To change your payment method, turn off automatic payment, or cancel, visit:\n${billingUrl()}\n\n` +
    `— The RepMail Team`;

  return deliver(to, subject, body, "predebit");
}

/** A successful automatic charge. Combined receipt + renewal confirmation. */
export async function sendRenewalConfirmation({
  to, name, amountMinor, currency, periodEnd, instrument, product = "your subscription",
  quantityLabel = null,
}) {
  const amount = money(amountMinor, currency);
  const body =
    `Hi ${name},\n\n` +
    `${product} renewed automatically. We charged ${amount} to ${instrument}.\n\n` +
    (quantityLabel ? `What's included: ${quantityLabel}\n` : "") +
    `Next renewal: ${day(periodEnd)}\n\n` +
    `This is your receipt. A GST invoice is not included — if you need tax ` +
    `documentation, reply to this email and we'll help.\n\n` +
    `Manage automatic payment any time:\n${billingUrl()}\n\n` +
    `— The RepMail Team`;

  return deliver(to, `Payment receipt — ${amount} for ${product}`, body, "renewal-confirmation");
}

/**
 * A failed automatic charge.
 *
 * States plainly that NOTHING HAS CHANGED YET. That sentence is why the existing
 * dunning path did not generate support load, and it is true here for the same
 * reason: entitlement is retained through the whole grace window.
 */
export async function sendChargeFailed({
  to, name, amountMinor, currency, instrument, reason, nextAttemptAt, graceEndsAt,
  consequence, product = "your subscription",
}) {
  const amount = money(amountMinor, currency);
  const body =
    `Hi ${name},\n\n` +
    `We couldn't collect ${amount} for ${product} from ${instrument}.\n\n` +
    `Nothing has changed yet — everything is still fully active.\n\n` +
    (reason ? `Reason given by your bank: ${reason}\n` : "") +
    (nextAttemptAt ? `We'll try again on ${day(nextAttemptAt)}.\n` : "") +
    `\nTo fix it now — update your payment method or pay manually:\n${billingUrl()}\n\n` +
    (graceEndsAt
      ? `If it still isn't paid by ${day(graceEndsAt)}, ${consequence}\n\n`
      : "") +
    `— The RepMail Team`;

  return deliver(to, `Payment failed for ${product} — nothing lost yet`, body, "charge-failed");
}

/**
 * An AFA-gated charge awaiting the customer's approval.
 *
 * Deliberately NOT worded as a failure. The customer has done nothing wrong; the
 * rail requires them to approve this specific debit, and telling them their
 * payment "failed" would be both untrue and alarming.
 */
export async function sendAuthRequired({
  to, name, amountMinor, currency, instrument, graceEndsAt, consequence,
  product = "your subscription", authUrl = null,
}) {
  const amount = money(amountMinor, currency);
  const body =
    `Hi ${name},\n\n` +
    `Your bank needs you to approve the ${amount} payment for ${product} ` +
    `on ${instrument}. This is a security step for payments of this size — ` +
    `there's nothing wrong with your account or your payment method.\n\n` +
    `Approve it here:\n${authUrl || billingUrl()}\n\n` +
    `Everything stays active while you do.` +
    (graceEndsAt ? ` If it isn't approved by ${day(graceEndsAt)}, ${consequence}` : "") +
    `\n\nYou can also pay manually from ${billingUrl()}\n\n` +
    `— The RepMail Team`;

  return deliver(to, `Approve your ${amount} payment for ${product}`, body, "auth-required");
}

/** A mandate that will stop working. The only advance warning a customer gets. */
export async function sendMandateExpiring({
  to, name, instrument, expiresAt, daysLeft, product = "your subscription",
}) {
  const body =
    `Hi ${name},\n\n` +
    `The payment method for ${product} (${instrument}) expires on ${day(expiresAt)} ` +
    `— ${daysLeft} day${daysLeft === 1 ? "" : "s"} from now.\n\n` +
    `Your subscription is not affected right now, and it will not be cancelled. ` +
    `But once the payment method expires we won't be able to renew it ` +
    `automatically, and renewal will go back to being manual.\n\n` +
    `Replace it in under a minute:\n${billingUrl()}\n\n` +
    `— The RepMail Team`;

  return deliver(to, `Your payment method expires on ${day(expiresAt)}`, body, "mandate-expiring");
}

/**
 * A duplicate charge that lost the renewal race and was refunded.
 *
 * Both charges are named, because a customer seeing two debits on a statement
 * needs to reconcile them against something.
 */
export async function sendDuplicateRefunded({
  to, name, amountMinor, currency, product = "your subscription",
}) {
  const amount = money(amountMinor, currency);
  const body =
    `Hi ${name},\n\n` +
    `You may see two payments of ${amount} for ${product}. One of them was a ` +
    `duplicate — we've already refunded it, and you were only charged once for ` +
    `this renewal.\n\n` +
    `Refunds usually reach your account within 5–7 working days. ` +
    `Your subscription is unaffected and fully active.\n\n` +
    `Your billing history:\n${billingUrl()}\n\n` +
    `— The RepMail Team`;

  return deliver(to, `We refunded a duplicate ${amount} payment`, body, "duplicate-refunded");
}
