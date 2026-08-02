// M51 Phase 5.3 — mandate lifecycle events from the gateway.
//
// This is NOT a second webhook system. `razorpayWebhook.js` remains the single
// entry point — it verifies the signature, claims the event id in the ledger and
// dispatches here for `token.*`. This module exists for the same reason
// fulfillSeats.js does: the entry point owns transport and routing, the product
// modules own meaning.
//
// It moves no money and grants no entitlement. A token event only ever changes
// the state of an INSTRUMENT, and the consequences of that change (a subscription
// falling back to manual renewal) are expressed through the existing fan-out —
// never by cancelling a subscription, never by touching seats, never by touching
// credits.

import * as Sentry from "@sentry/node";
import { storage } from "./storage.js";
import { AUDIT_ACTIONS } from "../shared/schema.js";
import {
  MANDATE_STATUS, DEFAULT_PAYMENT_PROVIDER, isMandateTerminal,
} from "../shared/autopay.js";

/**
 * Gateway token events → the mandate status they mean.
 *
 * Expressed as a TABLE rather than a switch so "which events do we honour" is
 * one readable list. An event that is not here falls through to the entry
 * point's existing unhandled-event branch: logged, 200, no retry.
 */
export const TOKEN_EVENT_STATUS = Object.freeze({
  "token.confirmed": MANDATE_STATUS.ACTIVE,
  "token.rejected": MANDATE_STATUS.FAILED,
  "token.cancelled": MANDATE_STATUS.REVOKED,
  "token.paused": MANDATE_STATUS.PAUSED,
  "token.resumed": MANDATE_STATUS.ACTIVE,
  "token.expired": MANDATE_STATUS.EXPIRED,
});

/** True if this event type is one the mandate lifecycle understands. */
export function isTokenEvent(eventType) {
  return Object.prototype.hasOwnProperty.call(TOKEN_EVENT_STATUS, eventType);
}

/** Statuses after which autopay must be withdrawn from every subscription using it. */
const DEACTIVATING = [MANDATE_STATUS.REVOKED, MANDATE_STATUS.EXPIRED, MANDATE_STATUS.FAILED];

/**
 * Apply one `token.*` event.
 *
 * Returns a summary for the caller's log. Never throws for a business outcome —
 * an unknown token, a stale event or an illegal transition are all expected
 * production occurrences, not errors. It throws only on a genuine storage
 * failure, which the entry point turns into a 500 so the gateway retries.
 *
 * @returns {{applied: boolean, reason?: string, mandateId?: string, to?: string,
 *            affectedSubscriptions?: string[]}}
 */
export async function handleTokenEvent(eventType, payload, { provider = DEFAULT_PAYMENT_PROVIDER } = {}) {
  const toStatus = TOKEN_EVENT_STATUS[eventType];
  if (!toStatus) return { applied: false, reason: "unhandled_event" };

  const token = payload?.token?.entity;
  const tokenId = token?.id;
  if (!tokenId) return { applied: false, reason: "no_token_id" };

  const mandate = await storage.getMandateByToken(tokenId, provider);
  if (!mandate) {
    // A token we have no local row for. Benign in the common case (a token
    // created and abandoned before we recorded it), but it can also mean a live
    // bank authorisation exists that this platform has lost track of — which is
    // an orphan liability, not a curiosity. Reconciliation (5.4) is what closes
    // it; the alert is what makes it visible before then.
    Sentry.captureMessage("AUTOPAY_TOKEN_EVENT_ORPHAN: token event with no matching mandate", {
      level: "warning",
      extra: { eventType, tokenId, provider },
    });
    return { applied: false, reason: "no_matching_mandate" };
  }

  // ── Ordering safety ────────────────────────────────────────────────────────
  // Razorpay does not guarantee delivery order, so a token.confirmed can arrive
  // AFTER the token.cancelled that superseded it. Terminality is what stops a
  // withdrawn bank authorisation being re-armed — and it is enforced by the
  // transition table, not by this handler remembering to check.
  if (isMandateTerminal(mandate.status)) {
    return { applied: false, reason: "already_terminal", mandateId: mandate.id, status: mandate.status };
  }

  // Capture the ORIGIN status before transitioning. The two storage backends
  // differ in aliasing — the in-memory one hands out the live row and mutates it
  // in place, Postgres returns a fresh row — so reading `mandate.status` after
  // the write would record a different `from` in each backend. The audit trail
  // must be identical on both, so the value is taken while it is unambiguous.
  const fromStatus = mandate.status;

  const patch = {};
  if (toStatus === MANDATE_STATUS.ACTIVE) {
    // Gateway-supplied facts travel with the confirmation. Only ever ADDITIVE:
    // a field the gateway omits must not erase what we already knew.
    if (token.expired_at) patch.expiresAt = new Date(Number(token.expired_at) * 1000);
    if (token.max_amount != null) patch.maxAmountMinor = Number(token.max_amount);
  }
  if (toStatus === MANDATE_STATUS.FAILED || toStatus === MANDATE_STATUS.REVOKED) {
    patch.lastError = token.error_description || token.status || eventType;
  }

  const result = await storage.transitionMandate(mandate.id, toStatus, patch);
  if (!result.ok) {
    // An illegal edge (e.g. token.resumed for a mandate that was never paused).
    // Not an error: the gateway's view and ours simply disagree, and ours is the
    // one bound to entitlement. Recorded, not retried.
    return { applied: false, reason: result.error, mandateId: mandate.id, from: fromStatus, to: toStatus };
  }

  // ── Consequence: an instrument that can no longer pay ──────────────────────
  // Degradation, NEVER amputation. The subscription is not cancelled, no seat is
  // lost and no credit is touched — it simply falls back to manual renewal and
  // the existing dunning path, exactly as a workspace that never set up autopay.
  let affectedSubscriptions = [];
  if (DEACTIVATING.includes(toStatus)) {
    const fanout = await storage.disableAutopayForMandate(mandate.id);
    affectedSubscriptions = fanout.affected;
  }

  await storage.createAuditLog({
    userId: mandate.workspaceRootId,
    action: AUDIT_ACTION_FOR[toStatus] || AUDIT_ACTIONS.MANDATE_REVOKED,
    targetType: "mandate",
    targetId: mandate.id,
    details: {
      workspaceRootId: mandate.workspaceRootId,
      provider, eventType, tokenId,
      from: fromStatus, to: toStatus,
      affectedSubscriptions,
      actor: "razorpay_webhook",
    },
  });

  if (affectedSubscriptions.length > 0) {
    Sentry.captureMessage("AUTOPAY_MANDATE_DEACTIVATED: automatic payment withdrawn by a gateway event", {
      level: "warning",
      extra: {
        mandateId: mandate.id, eventType, to: toStatus,
        affectedSubscriptions: affectedSubscriptions.length,
      },
    });
  }

  return {
    applied: true, mandateId: mandate.id, from: fromStatus, to: toStatus,
    affectedSubscriptions,
  };
}

/** Which audit action records arriving at each status. */
const AUDIT_ACTION_FOR = Object.freeze({
  [MANDATE_STATUS.ACTIVE]: AUDIT_ACTIONS.MANDATE_CONFIRMED,
  [MANDATE_STATUS.PAUSED]: AUDIT_ACTIONS.MANDATE_PAUSED,
  [MANDATE_STATUS.REVOKED]: AUDIT_ACTIONS.MANDATE_REVOKED,
  [MANDATE_STATUS.EXPIRED]: AUDIT_ACTIONS.MANDATE_EXPIRED,
  [MANDATE_STATUS.FAILED]: AUDIT_ACTIONS.MANDATE_FAILED,
});
