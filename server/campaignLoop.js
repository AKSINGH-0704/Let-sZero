/**
 * Campaign Execution Loop
 * ========================
 * Shared campaign execution logic used by both execution paths:
 *   - BullMQ worker  (server/worker.js)  — passes logTag: "[CAMPAIGN][WORKER]" + onProgress
 *   - Inline fallback (server/routes.js) — passes logTag: "[CAMPAIGN][INLINE]"
 *
 * Path-specific setup / teardown remains in the respective caller.
 * This module contains no path-specific logic.
 */

import * as Sentry from "@sentry/node";
import { storage } from "./storage.js";
import { sendCampaignEmail } from "./email.js";
import { getRateLimiter } from "./rateLimiter.js";
import {
  SEND_RATE_MS, sleep,
  BOUNCE_RATE_PAUSE_THRESHOLD, COMPLAINT_RATE_PAUSE_THRESHOLD,
  MIN_SENDER_HEALTH_SENT, CHECKPOINT_INTERVAL, PAUSE_CHECK_INTERVAL,
} from "./campaignConfig.js";
import {
  AUDIT_ACTIONS, CAMPAIGN_EMAIL_STATUS, CAMPAIGN_STATUS, USER_ROLES,
} from "../shared/schema.js";
import { extractTemplateLinks } from "./trackingUtils.js";
import { assertCanSend, recordFirstSend, claimWarmupSlot, SEND_MODES } from "./senderAuth.js";

// ── SES throttle detection ─────────────────────────────────────────────────────
// Moved here from worker.js so the retry wrapper and the loop share one module.
function isThrottleError(err) {
  if (!err) return false;
  if (err.responseCode === 454 || err.responseCode === 421) return true;
  if (typeof err.response === "string") {
    const r = err.response.toLowerCase();
    if (r.includes("throttl") || r.includes("too many")) return true;
  }
  if (err.code === "Throttling" || err.code === "TooManyRequestsException") return true;
  return false;
}

/**
 * Retry a single email send up to maxAttempts times with linear back-off.
 * Throttle errors (SES rate exceeded) do not consume a retry slot — they use a
 * separate 2s+jitter delay and release the acquired token (no SES capacity was used).
 *
 * Moved here from worker.js. Exported so worker.js can re-export for callers that
 * reference it directly (scheduler, recovery paths).
 */
export async function sendWithRetry(contact, template, userId, campaignId, rateLimiter, campaignEmailId, maxAttempts = 3, senderProfile = {}, trackingTokens = null) {
  let lastErr;
  let attempts = 0;
  let throttleRetries = 0;
  const maxThrottleRetries = 10;

  while (attempts < maxAttempts) {
    try {
      return await sendCampaignEmail(contact, template, userId, campaignEmailId, senderProfile, trackingTokens, campaignId);
    } catch (err) {
      lastErr = err;

      if (isThrottleError(err) && throttleRetries < maxThrottleRetries) {
        throttleRetries++;
        const jitter = Math.floor(Math.random() * 1000);
        const delay  = 2000 + jitter;
        console.warn(`[RATE] [${campaignId}] SES throttle at ${new Date().toISOString()} — retry ${throttleRetries}/${maxThrottleRetries} in ${delay}ms`);
        if (rateLimiter) await rateLimiter.release(campaignId).catch(() => {});
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 1000 * attempts));
      }
    }
  }
  throw lastErr;
}

/**
 * Core campaign send loop — behaviourally identical on both execution paths.
 *
 * @param {string|number} campaignId
 * @param {string|number} userId
 * @param {object}        options
 * @param {string}        [options.logTag="[CAMPAIGN]"]  Execution-path prefix for all log lines.
 * @param {function}      [options.onProgress]           Called with pct (0–100) after each email.
 *                                                        BullMQ worker passes job.updateProgress.
 *                                                        Errors from onProgress are caught and logged;
 *                                                        they never abort the loop.
 */
export async function runCampaignLoop(campaignId, userId, { logTag = "[CAMPAIGN]", onProgress } = {}) {
  const campaign = await storage.getCampaign(campaignId);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

  // Idempotency guard — skip if already in a terminal state.
  // Originally only in the BullMQ path (processCampaign); included here because
  // it is equally safe for the inline path and prevents any double-execution edge case.
  if (campaign.status === CAMPAIGN_STATUS.COMPLETED || campaign.status === CAMPAIGN_STATUS.CANCELLED) {
    console.log(`${logTag} Campaign ${campaignId} already ${campaign.status} — skipping`);
    return;
  }

  // ── Load owner ───────────────────────────────────────────────────────────────
  const owner = await storage.getUserById(userId);
  if (!owner) {
    await storage.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CAMPAIGN_FAILED,
      targetType: "campaign",
      targetId: campaignId,
      details: { reason: "Campaign owner account not found", name: campaign.name },
    });
    // PAR-TRUST-017 §7.3/§7.5/§7.6 — every terminal transition, including these
    // pre-loop aborts (no campaign_emails rows exist yet, so counts derive to
    // zero), must route through finalizeCampaign so finalized_at is set. Without
    // it, a concurrent reclaim-gate poll (§7.6) would time out and could
    // overwrite this status via its fallback finalize call, losing the real reason.
    await storage.finalizeCampaign(campaignId, "FAILED");
    console.warn(`${logTag} Campaign ${campaignId} aborted — owner ${userId} not found`);
    return;
  }

  // ── Retry detection ──────────────────────────────────────────────────────────
  // Status-based detection is unreliable when startup recovery has already written FAILED.
  // Sent-email existence is the authoritative signal.
  // PAUSED is included: a mid-loop pause may have sent some emails already —
  // treating it as a retry ensures those contacts are skipped, not re-sent.
  const hasAnySentEmails = await storage.hasAnySentEmails(campaignId);
  const isRetry = campaign.status === "RUNNING" ||
    ((campaign.status === "PAUSED" || campaign.status === "FAILED") && hasAnySentEmails);

  // ── Credit check ─────────────────────────────────────────────────────────────
  // Skipped on retry — credits were partially consumed in the previous attempt.
  // Per-contact deductCreditAtomic handles enforcement atomically during the loop.
  if (!isRetry) {
    const canStart = await storage.canStartCampaign(userId, campaign.totalEmails);
    if (!canStart.allowed) {
      await storage.createAuditLog({
        userId,
        action: AUDIT_ACTIONS.CAMPAIGN_BLOCKED_INSUFFICIENT_CREDITS,
        targetType: "campaign",
        targetId: campaignId,
        details: canStart,
      });
      // PAR-TRUST-017 §7.3/§7.5/§7.6 — finalize before throwing. The BullMQ worker
      // path calls runCampaignLoop directly (not through routes.js's executeCampaign
      // wrapper), so without this, finalized_at would stay unset until all of
      // BullMQ's retries are exhausted and worker.js's failed handler eventually
      // fires — idempotent and safe to call here regardless of which path re-catches
      // the throw below.
      await storage.finalizeCampaign(campaignId, "FAILED");
      throw new Error(canStart.reason);
    }
  }

  // ── Transition to RUNNING ────────────────────────────────────────────────────
  // Only write startedAt on first execution — never overwrite on retry.
  // Overwriting startedAt on retry would shift the delivery health window anchor and
  // exclude bounce/complaint events from the initial run.
  const startedAtUpdate = campaign.startedAt ? {} : { startedAt: new Date() };
  await storage.updateCampaign(campaignId, { status: "RUNNING", ...startedAtUpdate });
  await storage.createAuditLog({
    userId,
    action: AUDIT_ACTIONS.CAMPAIGN_STARTED,
    targetType: "campaign",
    targetId: campaignId,
  });

  // ── Global send-pause helper ─────────────────────────────────────────────────
  async function isGlobalSendPaused() {
    const setting = await storage.getPlatformSetting("send_pause_enabled");
    return setting?.value === "true";
  }

  // ── Pre-loop: global platform pause check ────────────────────────────────────
  if (await isGlobalSendPaused()) {
    await storage.updateCampaign(campaignId, { status: "PAUSED" });
    await storage.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CAMPAIGN_PAUSED,
      targetType: "campaign",
      targetId: campaignId,
      details: { reason: "global_send_pause_active" },
    });
    console.warn(`${logTag} Campaign ${campaignId} paused — global send pause is active`);
    return;
  }

  // ── Pre-loop: auto-pause check (7-day rolling bounce/complaint rate) ──────────
  // This is a side-effect step: reads fresh health data, may set sendPaused=true in DB
  // and return early. The SAS check below sees the cached `owner` object loaded above;
  // if auto-pause fires here, it returns before the SAS is reached. If it doesn't fire,
  // the SAS checks the cached sendPaused value (same stale-state window as before M13B).
  const senderHealth = await storage.getUserSenderHealth(userId);

  if (senderHealth.sent >= MIN_SENDER_HEALTH_SENT &&
      (senderHealth.bounceRate > BOUNCE_RATE_PAUSE_THRESHOLD ||
       senderHealth.complaintRate > COMPLAINT_RATE_PAUSE_THRESHOLD)) {
    await storage.updateUser(userId, {
      sendPaused: true,
      sendPausedReason: `auto_paused: bounce=${(senderHealth.bounceRate * 100).toFixed(1)}% complaint=${(senderHealth.complaintRate * 100).toFixed(2)}%`,
      sendPausedAt: new Date(),
    });
    await storage.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CAMPAIGN_FAILED,
      targetType: "campaign",
      targetId: campaignId,
      details: {
        reason: "sender_auto_paused",
        bounceRate: senderHealth.bounceRate,
        complaintRate: senderHealth.complaintRate,
        threshold: { bounce: BOUNCE_RATE_PAUSE_THRESHOLD, complaint: COMPLAINT_RATE_PAUSE_THRESHOLD },
      },
    });
    await storage.finalizeCampaign(campaignId, "FAILED");
    console.warn(`${logTag} User ${userId} auto-paused — bounce=${(senderHealth.bounceRate * 100).toFixed(1)}% complaint=${(senderHealth.complaintRate * 100).toFixed(2)}%`);
    return;
  }

  // ── Sender Authorization Service check ───────────────────────────────────────
  // Centralized identity + reputation + policy gate. Replaces the old isActive,
  // sendPaused, and domain-verified checks that were distributed across this file.
  // Policy check is skipped on retry (mode=retry) because credits/warm-up were consumed.
  const execMode = isRetry ? SEND_MODES.RETRY
    : campaign.scheduledAt ? SEND_MODES.SCHEDULED_FIRE
    : SEND_MODES.IMMEDIATE;
  try {
    await assertCanSend({
      user: owner,
      mode: execMode,
      campaignId,
      senderDomainId: campaign.senderDomainId ?? null,
    });
  } catch (authErr) {
    await storage.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CAMPAIGN_FAILED,
      targetType: "campaign",
      targetId: campaignId,
      details: { reason: "send_not_authorized", code: authErr.code, dimension: authErr.dimension, message: authErr.message },
    });
    await storage.finalizeCampaign(campaignId, "FAILED");
    console.warn(`${logTag} Campaign ${campaignId} failed — SAS denied [${authErr.dimension}/${authErr.code}]: ${authErr.message}`);
    return;
  }

  const template   = campaign.templateSnapshot || {};
  const contactIds = campaign.contactIds || [];

  // ── Custom domain data setup (authorization confirmed by SAS above) ───────────
  // SAS verified that the domain is VERIFIED for this user. We now only need to
  // resolve the from-address from the campaign's snapshot (durable at creation time).
  let customFromEmail = null;
  if (campaign.senderDomainId) {
    if (!campaign.senderEmailSnapshot) {
      // Data integrity error — senderEmailSnapshot must be set when senderDomainId is set.
      console.error(`${logTag} Campaign ${campaignId} — ABORT: senderDomainId=${campaign.senderDomainId} but senderEmailSnapshot is null`);
      await storage.createAuditLog({
        userId,
        action: AUDIT_ACTIONS.CAMPAIGN_FAILED,
        targetType: "campaign",
        targetId: campaignId,
        details: { reason: "data_integrity_error", detail: "senderDomainId set but senderEmailSnapshot is null" },
      });
      await storage.finalizeCampaign(campaignId, "FAILED");
      return;
    }
    customFromEmail = campaign.senderEmailSnapshot;
    console.log(`${logTag} Campaign ${campaignId} — custom sender: ${customFromEmail}`);
  }

  // Build sender profile once — used for From name, Reply-To, and signature placeholders.
  const senderProfile = {
    name:            owner.senderName    || null,
    title:           owner.senderTitle   || null,
    company:         owner.senderCompany || null,
    phone:           owner.senderPhone   || null,
    replyToEmail:    owner.replyToEmail  || null,
    customFromEmail: customFromEmail,
  };
  if (!senderProfile.name) {
    console.warn(`${logTag} Campaign ${campaignId} — sender profile incomplete for userId=${userId}. From name will fall back to platform default.`);
  }

  // M10: extract unique URLs from template body for click-token pre-generation.
  // Done once before the loop — the template body is the same for every contact.
  const trackBaseUrl = process.env.TRACK_BASE_URL || null;
  const templateLinks = (trackBaseUrl && template.body)
    ? extractTemplateLinks(template.body)
    : [];
  if (trackBaseUrl) {
    console.log(`${logTag} Campaign ${campaignId} — tracking enabled, ${templateLinks.length} trackable link(s)`);
  }

  const rateLimiter = getRateLimiter();
  let rateLimiterFallbackLogged = false;
  let sentCount    = 0;
  let failedCount  = 0;
  let skippedCount = 0;
  let outOfCredits         = false;
  let outOfWarmupSlots     = false;
  let globalPausedMidLoop  = false;
  let senderPausedMidLoop  = false;
  let firstSendRecorded    = false;

  console.log(`${logTag} Campaign ${campaignId} — ${contactIds.length} contacts`);

  // Dynamic checkpoint: at least 5 DB writes per campaign so progress tracker shows incremental movement.
  const effectiveCheckpoint = Math.min(CHECKPOINT_INTERVAL, Math.max(1, Math.ceil(contactIds.length / 5)));

  // Batch-load all contacts before the loop — 1 query instead of N per-contact lookups.
  // Per-contact suppression checks remain inside the loop (a concurrent campaign can add
  // suppressions mid-execution, so those must stay live).
  const contactList = await storage.getContactsByIds(contactIds);
  const contactMap  = new Map(contactList.map(c => [c.id, c]));

  for (let i = 0; i < contactIds.length; i++) {
    // PAR-TRUST-017 §7.2 — every iteration, unconditionally: has someone else
    // already decided this campaign should stop? Cheap, single-column, PK-indexed
    // lookup. Deliberately status-agnostic (checks "not RUNNING", not an enumerated
    // list of specific triggers) so it catches CANCELLED, an externally-forced
    // FAILED (e.g. user deactivation — the original TRUST-017 report), or any future
    // trigger no one has invented yet, without needing a new special case each time.
    // This replaces the old CANCELLED-only check that used to live inside the
    // PAUSE_CHECK_INTERVAL-gated block below — that check only ever caught
    // cancellation, and only every 50 contacts.
    const liveStatus = await storage.getCampaignStatus(campaignId);
    if (liveStatus !== CAMPAIGN_STATUS.RUNNING) {
      if (liveStatus === CAMPAIGN_STATUS.CANCELLED || liveStatus === CAMPAIGN_STATUS.FAILED) {
        await storage.finalizeCampaign(campaignId, liveStatus);
      } else {
        // PAUSED (or any other non-terminal state) — resumable, flush without
        // finalizing (§7.5: PAUSED is never a legal finalization target).
        await storage.updateCampaign(campaignId, {
          sentEmails: sentCount, failedEmails: failedCount, skippedEmails: skippedCount, creditsUsed: sentCount,
        });
      }
      console.warn(`${logTag} Campaign ${campaignId} externally left RUNNING (now ${liveStatus}) at contact ${i} — stopping`);
      return;
    }

    // Re-check global pause and per-user sendPaused every PAUSE_CHECK_INTERVAL contacts.
    // Allows admin pause or auto-pause (fired by a concurrent campaign start) to take effect
    // mid-campaign without a DB query on every single contact. Skip i=0 (checked pre-loop).
    // Unlike the check above, these DECIDE a new status rather than detect one someone
    // else already decided — so they stay on the periodic cadence, not every iteration.
    if (i > 0 && i % PAUSE_CHECK_INTERVAL === 0) {
      if (await isGlobalSendPaused()) {
        // PAUSED — not terminal, flush directly (no finalizeCampaign, matches §7.5).
        await storage.updateCampaign(campaignId, {
          status: "PAUSED",
          sentEmails: sentCount, failedEmails: failedCount, skippedEmails: skippedCount, creditsUsed: sentCount,
        });
        await storage.createAuditLog({
          userId,
          action: AUDIT_ACTIONS.CAMPAIGN_PAUSED,
          targetType: "campaign",
          targetId: campaignId,
          details: { reason: "global_send_pause_active", pausedAtContact: i },
        });
        console.warn(`${logTag} Campaign ${campaignId} paused at contact ${i} — global send pause activated`);
        globalPausedMidLoop = true;
        break;
      }

      // Domain recheck — fires at every PAUSE_CHECK_INTERVAL boundary (same as this block).
      // Catches admin suspensions or revocations that happen mid-campaign.
      if (campaign.senderDomainId) {
        const freshDomain = await storage.getSenderDomainById(campaign.senderDomainId);
        if (!freshDomain || freshDomain.status !== "VERIFIED") {
          // Decision + audit log first (I7 — exactly one entry, at the point of decision).
          await storage.createAuditLog({
            userId,
            action: AUDIT_ACTIONS.CAMPAIGN_DOMAIN_REVOKED,
            targetType: "campaign",
            targetId: campaignId,
            details: { reason: "sender_domain_no_longer_verified", domainId: campaign.senderDomainId, pausedAtContact: i },
          });
          // Finalization second — counts + orphan cleanup + finalized_at, in one place.
          await storage.finalizeCampaign(campaignId, "FAILED");
          console.warn(`${logTag} Campaign ${campaignId} failed at contact ${i} — sender domain revoked mid-loop`);
          senderPausedMidLoop = true;
          break;
        }
      }

      // Re-check per-user sendPaused — auto-pause may have fired from a concurrent campaign.
      // Sender-health pause is not resumable by global action — use FAILED (not PAUSED).
      const freshOwner = await storage.getUserById(userId);
      if (freshOwner?.sendPaused) {
        await storage.createAuditLog({
          userId,
          action: AUDIT_ACTIONS.CAMPAIGN_FAILED,
          targetType: "campaign",
          targetId: campaignId,
          details: { reason: "sender_paused_mid_loop", pausedAtContact: i },
        });
        await storage.finalizeCampaign(campaignId, "FAILED");
        console.warn(`${logTag} Campaign ${campaignId} failed at contact ${i} — sender paused mid-loop`);
        senderPausedMidLoop = true;
        break;
      }
    }

    const contactId = contactIds[i];
    const contact   = contactMap.get(contactId) || null;

    // PAR-TRUST-017 §7.1 — atomic at-most-once claim, replacing the previous
    // SELECT-then-INSERT (check-then-act, not atomic — the actual mechanism the
    // whole PAR exists to close). Runs unconditionally (not gated on isRetry):
    // on a first run no row exists yet, so the claim always succeeds via INSERT;
    // on a retry, claimCampaignEmail atomically reclaims an existing PENDING/
    // transient-FAILED row or is a no-op if the row is already terminal. Either
    // way, exactly one execution ever wins the claim for a given contact, no
    // matter how many are concurrently attempting it or why.
    const campaignEmailRecord = await storage.claimCampaignEmail({
      campaignId,
      userId,
      contactId:      contact ? contactId : null,
      recipientEmail: contact?.email || "unknown",
    });

    if (!campaignEmailRecord) {
      // Someone else already claimed (or terminally owns) this contact. Read the
      // outcome to keep local counters accurate; never send. This covers both a
      // legitimate whole-campaign retry finding prior terminal work, and — the
      // scenario this PAR is about — a residual overlap from another concurrent
      // execution: either way, this execution must not process this contact again.
      const existing = contact ? await storage.getCampaignEmailByContact(campaignId, contactId) : null;
      if (existing?.status === CAMPAIGN_EMAIL_STATUS.SENT) sentCount++;
      else if (existing?.status === CAMPAIGN_EMAIL_STATUS.SUPPRESSED) skippedCount++;
      // BOUNCED and COMPLAINED are set by the SNS handler after a confirmed delivery.
      else if (existing?.status === CAMPAIGN_EMAIL_STATUS.BOUNCED)    skippedCount++;
      else if (existing?.status === CAMPAIGN_EMAIL_STATUS.COMPLAINED) skippedCount++;
      else if (existing?.status === CAMPAIGN_EMAIL_STATUS.FAILED)     failedCount++;
      // PENDING here means another execution is actively claiming/processing it
      // right now — not ours to count either way; leave it to whichever
      // execution actually holds the claim.
      continue;
    }

    // M10: generate per-contact tracking tokens if TRACK_BASE_URL is configured.
    // Failure is non-fatal — email delivers without analytics rather than blocking.
    let trackingTokens = null;
    if (trackBaseUrl && contact?.email) {
      try {
        const retentionDays = parseInt(process.env.TRACKING_TOKEN_RETENTION_DAYS || "730", 10);
        trackingTokens = await storage.createTrackingTokensForEmail({
          campaignEmailId: campaignEmailRecord.id,
          campaignId,
          templateLinks,
          retentionDays,
        });
      } catch (tokenErr) {
        console.error(`${logTag} [${campaignId}] Token generation failed for contact ${contactId} — delivering without tracking:`, tokenErr.message);
        if (process.env.SENTRY_DSN) {
          Sentry.captureException(tokenErr, { extra: { campaignId, contactId, context: "token_generation" } });
        }
      }
    }

    let attemptedSend    = false;
    let usedRateLimiter  = false;
    try {
      if (!contact || !contact.email) throw new Error("Contact or email missing");

      // Per-user suppression followed by platform-wide global check.
      // Per-contact inside the loop: a bounce from a concurrent campaign can add
      // this address to the suppression list mid-execution of a long campaign.
      const suppressed = await storage.isSuppressed(userId, contact.email);
      const globallySuppressed = suppressed ? false : await storage.isGloballySuppressed(contact.email);

      if (suppressed || globallySuppressed) {
        skippedCount++;
        await storage.updateCampaignEmail(campaignEmailRecord.id, {
          status: CAMPAIGN_EMAIL_STATUS.SUPPRESSED,
        });
        const suppDetail = await storage.getSuppressionRecord(suppressed ? userId : null, contact.email);
        console.log(
          `${logTag} [${campaignId}] contact ${i + 1} suppressed` +
          ` scope=${suppressed ? "user" : "global"}` +
          ` email=${contact.email}` +
          ` source=${suppDetail?.source ?? "unknown"}` +
          ` reason=${suppDetail?.reason ?? "none"}` +
          ` suppressedAt=${suppDetail?.createdAt?.toISOString() ?? "unknown"}`
        );
      } else {
        attemptedSend = true;
        // Acquire a shared SES send token before every actual send attempt.
        if (rateLimiter) {
          try {
            await rateLimiter.acquire(campaignId);
            usedRateLimiter = true;
          } catch (rlErr) {
            if (!rateLimiterFallbackLogged) {
              console.warn(`${logTag} [${campaignId}] Rate limiter unavailable — falling back to ${SEND_RATE_MS}ms per-worker delay:`, rlErr.message);
              rateLimiterFallbackLogged = true;
            }
          }
        }

        // Claim a warm-up slot before each send — atomic WHERE guard prevents concurrent overshoot.
        if (!(await claimWarmupSlot(owner))) {
          await storage.updateCampaign(campaignId, {
            status: "PAUSED",
            sentEmails: sentCount, failedEmails: failedCount, skippedEmails: skippedCount, creditsUsed: sentCount,
          });
          await storage.createAuditLog({
            userId,
            action: AUDIT_ACTIONS.WARMUP_LIMIT_HIT,
            targetType: "campaign",
            targetId: campaignId,
            details: { name: campaign.name, sentEmails: sentCount, stoppedAtContact: i },
          });
          console.warn(`${logTag} Campaign ${campaignId} paused at contact ${i} — warm-up daily limit reached`);
          outOfWarmupSlots = true;
          break;
        }

        const info = await sendWithRetry(
          contact, template, userId, campaignId,
          usedRateLimiter ? rateLimiter : null,
          campaignEmailRecord.id, 3, senderProfile, trackingTokens
        );

        // Email delivered to SES — mark SENT immediately before credit deduction.
        // If deduction fails, the email record correctly shows SENT (not FAILED).
        await storage.updateCampaignEmail(campaignEmailRecord.id, {
          status: CAMPAIGN_EMAIL_STATUS.SENT,
          sesMessageId: info?.messageId || null,
          sentAt: new Date(),
        });
        sentCount++;
        if (!firstSendRecorded) {
          firstSendRecorded = true;
          recordFirstSend(userId).catch(() => {});
        }
        console.log(`${logTag} [${campaignId}] ${sentCount}/${contactIds.length} → ${contact.email}`);

        try {
          await storage.deductCreditAtomic(userId, campaignId, `Email to ${contact.email}`);
        } catch (deductErr) {
          if (deductErr.message === "Insufficient credits") {
            // Credits exhausted by concurrent deduction — stop the campaign.
            // Email is already marked SENT above.
            outOfCredits = true;
            console.warn(`${logTag} [${campaignId}] credits exhausted after send to ${contact.email} — stopping`);
            break;
          }
          // DB error after successful send — log accounting drift, do not fail the email record.
          console.error(`${logTag} [${campaignId}] credit deduction failed after send to ${contact.email} — accounting drift:`, deductErr.message);
        }
      }
    } catch (err) {
      failedCount++;
      await storage.updateCampaignEmail(campaignEmailRecord.id, {
        status: CAMPAIGN_EMAIL_STATUS.FAILED,
        failureReason: err.message,
      });
      console.error(`${logTag} [${campaignId}] contact ${i + 1} failed:`, err.message);
    }

    // Checkpoint every effectiveCheckpoint emails — dynamic to ensure incremental UI progress.
    // Terminal exits (cancel, pause, credit exhaustion) always flush final counts separately.
    if ((i + 1) % effectiveCheckpoint === 0) {
      await storage.updateCampaign(campaignId, {
        sentEmails:   sentCount,
        failedEmails: failedCount,
        skippedEmails: skippedCount,
      });
    }

    // Report 0–100% progress to the caller (BullMQ dashboard / monitoring).
    // Errors from onProgress are caught here — a Redis disconnect must not abort the loop.
    if (onProgress) {
      try {
        await onProgress(Math.floor(((i + 1) / contactIds.length) * 100));
      } catch (progressErr) {
        console.warn(`${logTag} [${campaignId}] Progress update failed — continuing:`, progressErr.message);
      }
    }

    // Fallback throttle when Redis rate limiter is unavailable — per-worker sleep.
    if (SEND_RATE_MS > 0 && attemptedSend && !usedRateLimiter) await sleep(SEND_RATE_MS);
  }

  // ── Post-loop: mid-loop break handling ──────────────────────────────────────
  // Pause/sender-pause already wrote their own counts + finalization (where
  // applicable) during the break. Credit exhaustion uses the atomic terminal
  // write below (it does not change status itself — the campaign completes,
  // just with notReached > 0).

  if (outOfCredits) {
    await storage.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CAMPAIGN_BLOCKED_INSUFFICIENT_CREDITS,
      targetType: "campaign",
      targetId: campaignId,
      details: { name: campaign.name, sentEmails: sentCount, stoppedEarly: true },
    });
    console.warn(`${logTag} Campaign ${campaignId} stopped early — insufficient credits`);
  }

  if (outOfWarmupSlots) {
    console.warn(`${logTag} Campaign ${campaignId} paused mid-loop — warm-up daily limit reached`);
    return;
  }
  if (globalPausedMidLoop) {
    console.warn(`${logTag} Campaign ${campaignId} paused mid-loop — status already PAUSED`);
    return;
  }
  if (senderPausedMidLoop) {
    console.warn(`${logTag} Campaign ${campaignId} failed mid-loop — sender paused`);
    return;
  }

  // Re-read status to catch any external state change in the window between the
  // last per-iteration check (§7.2, above) and now — specifically, a stop decision
  // that arrived while the *final* contact was still being processed, which has no
  // "next iteration" to catch it. Also the only check reached at all when
  // contactIds.length === 0.
  const currentState = await storage.getCampaign(campaignId);
  if (currentState?.status === "FAILED" || currentState?.status === CAMPAIGN_STATUS.CANCELLED) {
    console.warn(`${logTag} Campaign ${campaignId} externally ${currentState.status.toLowerCase()} — not overwriting to COMPLETED`);
    await storage.finalizeCampaign(campaignId, currentState.status);
    return;
  }
  if (currentState?.status === "PAUSED") {
    console.warn(`${logTag} Campaign ${campaignId} externally paused — not overwriting to COMPLETED`);
    await storage.updateCampaign(campaignId, {
      sentEmails: sentCount, failedEmails: failedCount, skippedEmails: skippedCount, creditsUsed: sentCount,
    });
    return;
  }

  // Atomic terminal transition: only finalizes to COMPLETED if status is still
  // RUNNING and not yet finalized. Prevents a TOCTOU race where status changed
  // between the currentState read above and this write (e.g., two concurrent
  // executions on the inline fallback path) — same guarantee updateCampaignIfRunning
  // used to provide, now folded into finalizeCampaign's own guard (PAR-TRUST-017 §7.3).
  const completed = await storage.finalizeCampaign(campaignId, "COMPLETED");

  if (!completed) {
    console.warn(`${logTag} Campaign ${campaignId} status changed before COMPLETED write — skipping`);
    return;
  }

  // Read back the just-finalized counts rather than this execution's own local
  // sentCount/failedCount — under the two-executions-racing scenario (§7.5),
  // this execution's local counters only reflect what *it* personally sent,
  // not the true total finalizeCampaign just recorded.
  const finalizedCampaign = await storage.getCampaign(campaignId);
  await storage.createAuditLog({
    userId,
    action: AUDIT_ACTIONS.CAMPAIGN_COMPLETED,
    targetType: "campaign",
    targetId: campaignId,
    details: { name: campaign.name, sentEmails: finalizedCampaign?.sentEmails ?? sentCount, failedEmails: finalizedCampaign?.failedEmails ?? failedCount },
  });

  if (owner && owner.role !== USER_ROLES.ROOT_ADMIN && !owner.isSecondaryRoot) {
    await storage.updateUserActivity(userId).catch(err =>
      console.error(`${logTag} updateUserActivity failed for ${userId}:`, err.message)
    );
  }
}
