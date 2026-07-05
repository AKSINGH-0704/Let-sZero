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

// PAR-TRUST-017 §7.7 — execution liveness lease. Deliberately NOT derived from
// sendWithRetry's retry constants (maxAttempts/maxThrottleRetries) — the whole
// point is that this number never needs to be kept in sync with those. Renewal
// happens at the retry-*attempt* grain (inside sendWithRetry's own retry loop),
// so this only needs to comfortably dominate a single retry/throttle wait
// (currently up to ~3s), not the full worst-case chain of retries.
export const EXECUTION_LEASE_DURATION_MS = 25_000;

// Outer ceiling for the reclaim gate's wait-until-lease-expiry loop — a last-
// resort circuit breaker against a pathological renewal loop that never
// terminates, not the normal correctness mechanism (that's the lease itself).
export const RECLAIM_GATE_MAX_WAIT_MS = 30_000;

// How often the reclaim gate re-checks for finalization — independent of how
// long it's willing to wait before concluding "dead" (that's the lease expiry,
// above). Frequent polling here only affects responsiveness in the common case
// (the owner finishes quickly); it never affects the "how long until we give
// up" decision, which is always the lease's own declared expiry.
export const RECLAIM_GATE_POLL_MS = 250;

// PAR-TRUST-017 §13 / TRUST-018 — reconciliation window for
// reconcileCampaignCounters. A campaign must have been finalized at least
// RECONCILIATION_MIN_AGE_MS ago (comfortably longer than sendWithRetry's own
// worst-case single-contact latency, so any genuinely-overlapping execution's
// straggling send has had time to land) and at most RECONCILIATION_MAX_AGE_MS
// ago (reconciling ancient campaigns has no operational value).
export const RECONCILIATION_MIN_AGE_MS = 2 * 60 * 1000;   // 2 minutes
export const RECONCILIATION_MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours
