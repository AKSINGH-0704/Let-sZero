/**
 * Campaign Runtime Configuration
 * ================================
 * Single source of truth for all campaign execution constants.
 * Both execution paths (BullMQ worker and inline fallback) import from here.
 * Add new campaign runtime settings here to prevent future configuration drift.
 */

export const SEND_RATE_MS = parseInt(process.env.SES_SEND_RATE_MS || "0", 10);
if (SEND_RATE_MS === 0) {
  console.warn("[STARTUP] WARNING: SES_SEND_RATE_MS is 0 or unset. Campaign sends will run at uncapped speed. Set SES_SEND_RATE_MS=75 minimum in production.");
}

export const BOUNCE_RATE_PAUSE_THRESHOLD    = parseFloat(process.env.BOUNCE_RATE_PAUSE_THRESHOLD    || "0.08");
export const COMPLAINT_RATE_PAUSE_THRESHOLD = parseFloat(process.env.COMPLAINT_RATE_PAUSE_THRESHOLD || "0.0005");

// Minimum emails sent before auto-pause enforcement and the health dashboard bounce table apply.
// Both usages must read this constant — changing it here keeps enforcement and visibility aligned.
export const MIN_SENDER_HEALTH_SENT = 50;

// Flush sentEmails / failedEmails / skippedEmails every N contacts.
// Matches the UI poll cadence (500ms–2000ms); reduces DB write amplification by ~96%.
export const CHECKPOINT_INTERVAL = 25;

// Re-check global pause and per-user sendPaused every N contacts.
// Allows admin pause or auto-pause to take effect mid-campaign without a per-contact DB query.
export const PAUSE_CHECK_INTERVAL = 50;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// campaign_emails.failure_reason values that mean "never retry this contact,
// the address is permanently unsafe" — as opposed to a transient send error,
// which a whole-campaign retry is allowed to re-attempt. Read by both the loop's
// own retry-skip logic and storage's claimCampaignEmail (PAR-TRUST-017 §7.1) —
// a single source of truth so the two can never drift out of sync.
export const PERMANENT_FAILURE_REASONS = ["hard_bounce", "invalid_recipient", "complaint", "suppressed"];
