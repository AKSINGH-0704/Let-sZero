// M58 / IDENT-011 — ownership transfer notifications.
//
// Until now a transfer succeeded silently from the incoming owner's side: no
// email, no in-app notice. They discovered they had acquired FINANCIAL
// responsibility for a workspace by noticing that billing controls had appeared.
// The outgoing owner was told nothing either — including that their saved
// payment method had been withdrawn, which is the consequence they are most
// likely to discover the wrong way, at a renewal that did not happen.
//
// ── REUSE, NOT A SECOND NOTIFICATION SYSTEM ─────────────────────────────────
// Same shape as autopayNotifications.js (M51 Phase 5.4): `sendTransactionalEmail`
// owns the transport, the transient/permanent failure classification and the
// retry+backoff ladder (server/email.js). Nothing here retries, queues or
// throttles — a second retry layer above one that already exists is how
// double-sends happen.
//
// ── WHAT THESE MESSAGES MUST NEVER DO ───────────────────────────────────────
// Contradict the transaction. Every claim below is a claim about somebody's
// money and access, and each one is pinned by a content test against what
// `transferWorkspaceOwnership` actually does (Audit 220, and the field-by-field
// contract in IDENTITY_LIFECYCLE_MATRIX §5). If the transaction changes, these
// sentences become lies — so they are asserted, not merely reviewed.
//
// There is no workspace NAME in this product (ownership is a tree position, not
// a named object — ADR-017), so these messages identify the workspace by the
// people involved rather than inventing a label the customer has never seen.
//
// ── DELIVERY IS NOT ASSUMED ─────────────────────────────────────────────────
// Each send reports whether it went out, and the caller writes ONE audit event
// recording both outcomes. "Was the new owner ever told they own the billing?"
// is the first question support will ask, and an audit trail that cannot answer
// it is not an audit trail.

import { sendTransactionalEmail } from "./email.js";
import { formatMinor } from "../shared/seatPricing.js";

const APP_URL = () => process.env.APP_URL || "http://localhost:5000";
const BILLING_PATH = "/app/team/seats";
const SUPPORT_EMAIL = "support@letszero.in";

/** The one link these messages point at. State lives on the page, not in the email. */
export function workspaceBillingUrl() {
  return `${APP_URL()}${BILLING_PATH}`;
}

const day = (d) => new Date(d).toDateString();

/**
 * Send, never throw.
 *
 * A transfer has ALREADY COMMITTED by the time these run. A failed notification
 * must never look like a failed transfer — the workspace has changed hands
 * either way, and reporting an error to the customer would send them looking for
 * a rollback that does not exist. The boolean is what the audit event records.
 */
async function deliver(to, subject, body, tag) {
  try {
    await sendTransactionalEmail(to, subject, body);
    return true;
  } catch (err) {
    console.error(`[WORKSPACE-NOTIFY] ${tag} failed:`, err.message);
    return false;
  }
}

/**
 * Subscription continuity, stated only where it is KNOWN.
 *
 * "Your subscription continues unchanged" is the sentence both parties need, but
 * an amount and a date make it checkable — and a workspace with no seat
 * subscription must not be told about one that does not exist. Reads the
 * subscription the caller already resolved; derives no price and no date.
 */
function continuityLine(subscription) {
  if (!subscription) {
    return "Nothing about the workspace itself changes — every campaign, contact, " +
      "template and verified sending domain stays exactly where it is, and everyone " +
      "keeps sending.";
  }
  const seats = subscription.seats;
  const amount = subscription.renewalAmountMinor > 0
    ? formatMinor(subscription.renewalAmountMinor, subscription.currency || "INR")
    : null;
  const renews = subscription.periodEnd ? day(subscription.periodEnd) : null;
  return (
    `The subscription carries on exactly as it is — same ${seats} seat${seats === 1 ? "" : "s"}` +
    (renews ? `, same renewal date (${renews})` : "") +
    (amount ? `, same amount (${amount})` : "") +
    `. Nothing is cancelled, nothing is charged today, and nobody loses access. ` +
    `Every campaign, contact, template and verified sending domain stays exactly ` +
    `where it is, and everyone keeps sending.`
  );
}

/**
 * The INCOMING owner. The more important of the two messages: this person has
 * just acquired a bill, and until M58 nothing in the product told them so.
 *
 * The renewal paragraph is deliberately an INSTRUCTION, not a note. The previous
 * owner's mandate is revoked inside the transfer transaction, so the workspace
 * arrives with NO automatic renewal — and the cost of not knowing that is the
 * team being deactivated at the end of the period.
 */
export async function sendOwnershipReceived({
  to, name, previousOwnerName, subscription = null, autopayRevoked = false,
}) {
  // SELF-REVIEW FIX. The first draft told every incoming owner that the previous
  // owner's payment method "was withdrawn as part of the handover" — including
  // when there had never been one. That is a fabricated event in the very
  // message whose job is to make this person trust what just happened, and it is
  // the kind of sentence that arrives in support as "what card? I never had a
  // card". The outgoing owner's message already branched on this; this one did
  // not.
  const instrumentLine = autopayRevoked
    ? `A saved payment method is a personal banking authorisation, so it never ` +
      `moves with a workspace — ${previousOwnerName}'s was withdrawn as part of the ` +
      `handover, and their card can never be charged for this workspace again.`
    : `A saved payment method is a personal banking authorisation, so it never ` +
      `moves with a workspace. There was none on this one, so nothing carried over.`;
  const body =
    `Hi ${name},\n\n` +
    `${previousOwnerName} has transferred their RepMail workspace to you. ` +
    `You are now its owner.\n\n` +
    `WHAT THIS MEANS FOR YOU\n` +
    `Billing for this workspace is now yours: seats, renewals, the payment method ` +
    `and invoices are all yours to manage. ${previousOwnerName} stays on as a ` +
    `regular member and keeps their access and their work.\n\n` +
    `${continuityLine(subscription)}\n\n` +
    `ONE THING TO SET UP\n` +
    `Automatic renewal is currently off. ${instrumentLine} Until you add your own, ` +
    `renewal is manual: we email you a reminder before the period ends and nothing ` +
    `is charged automatically.\n\n` +
    `Set up billing here:\n${workspaceBillingUrl()}\n\n` +
    `If a renewal is ever missed, nothing is switched off straight away — your team ` +
    `keeps working while we email you.\n\n` +
    `If you were not expecting this, speak to ${previousOwnerName}, or email us at ` +
    `${SUPPORT_EMAIL} and we will help you sort it out.\n\n` +
    `— The RepMail Team`;

  return deliver(
    to,
    `${previousOwnerName} transferred their RepMail workspace to you`,
    body,
    "ownership-received",
  );
}

/**
 * The OUTGOING owner. A receipt for something they did deliberately — so it
 * confirms rather than alarms — but it still has to state the two facts they did
 * not necessarily take in on the confirmation screen: their payment method is
 * gone, and only the new owner can hand the workspace back.
 */
export async function sendOwnershipHandedOver({
  to, name, newOwnerName, subscription = null, autopayRevoked = false,
}) {
  const body =
    `Hi ${name},\n\n` +
    `Your RepMail workspace now belongs to ${newOwnerName}. This is your ` +
    `confirmation.\n\n` +
    `WHAT CHANGED\n` +
    `${newOwnerName} is the owner and looks after billing from here — seats, ` +
    `renewals, the payment method and invoices. You are now a regular member: you ` +
    `keep your access, your campaigns and their history, and your own credits, but ` +
    `not the billing controls.\n\n` +
    (autopayRevoked
      ? `YOUR PAYMENT METHOD HAS BEEN REMOVED\n` +
        `Automatic renewal is switched off and your saved payment method has been ` +
        `withdrawn, with us and with your bank. Your card is never charged for a ` +
        `workspace you no longer own. ${newOwnerName} sets up their own.\n\n`
      : `PAYMENT METHOD\n` +
        `This workspace had no automatic renewal set up, so nothing was withdrawn ` +
        `from your bank. ${newOwnerName} arranges billing themselves.\n\n`) +
    `${continuityLine(subscription)}\n\n` +
    `Only ${newOwnerName} can transfer the workspace back — ownership always moves ` +
    `from whoever currently holds it, so this is not something you can reverse ` +
    `yourself.\n\n` +
    `If this was not you, or something does not look right, email us at ` +
    `${SUPPORT_EMAIL} straight away.\n\n` +
    `— The RepMail Team`;

  return deliver(
    to,
    `You transferred your RepMail workspace to ${newOwnerName}`,
    body,
    "ownership-handed-over",
  );
}

/**
 * Notify BOTH parties and report what actually went out.
 *
 * The two sends are independent, deliberately: one bad or bouncing address must
 * not silence the other person. Never throws — the caller has already committed
 * the transfer, and audits the outcomes returned here.
 */
export async function notifyOwnershipTransfer({
  previousOwner, newOwner, subscription = null, autopayRevoked = false,
}) {
  const previousName = previousOwner?.username || previousOwner?.email || "The previous owner";
  const newName = newOwner?.username || newOwner?.email || "The new owner";

  const [newOwnerNotified, previousOwnerNotified] = await Promise.all([
    newOwner?.email
      ? sendOwnershipReceived({
          to: newOwner.email, name: newName, previousOwnerName: previousName,
          subscription, autopayRevoked,
        })
      : Promise.resolve(false),
    previousOwner?.email
      ? sendOwnershipHandedOver({
          to: previousOwner.email, name: previousName, newOwnerName: newName,
          subscription, autopayRevoked,
        })
      : Promise.resolve(false),
  ]);

  return { newOwnerNotified, previousOwnerNotified };
}
