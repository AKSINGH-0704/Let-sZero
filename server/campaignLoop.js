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
export async function sendWithRetry(contact, template, userId, campaignId, rateLimiter, campaignEmailId, maxAttempts = 3, senderProfile = {}) {
  let lastErr;
  let attempts = 0;
  let throttleRetries = 0;
  const maxThrottleRetries = 10;

  while (attempts < maxAttempts) {
    try {
      return await sendCampaignEmail(contact, template, userId, campaignEmailId, senderProfile);
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

  // ── Owner-active guard ───────────────────────────────────────────────────────
  const owner = await storage.getUserById(userId);
  if (!owner || !owner.isActive) {
    await storage.updateCampaign(campaignId, { status: "FAILED" });
    await storage.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CAMPAIGN_FAILED,
      targetType: "campaign",
      targetId: campaignId,
      details: { reason: "Campaign owner account deactivated", name: campaign.name },
    });
    console.warn(`${logTag} Campaign ${campaignId} aborted — owner ${userId} is inactive`);
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
      await storage.updateCampaign(campaignId, { status: "FAILED" });
      await storage.createAuditLog({
        userId,
        action: AUDIT_ACTIONS.CAMPAIGN_BLOCKED_INSUFFICIENT_CREDITS,
        targetType: "campaign",
        targetId: campaignId,
        details: canStart,
      });
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

  // ── Pre-loop: per-user manual pause check ────────────────────────────────────
  if (owner.sendPaused) {
    await storage.updateCampaign(campaignId, { status: "FAILED" });
    await storage.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CAMPAIGN_FAILED,
      targetType: "campaign",
      targetId: campaignId,
      details: { reason: "sender_paused", pausedReason: owner.sendPausedReason },
    });
    console.warn(`${logTag} Campaign ${campaignId} failed — sender ${userId} is paused`);
    return;
  }

  // ── Pre-loop: auto-pause check (7-day rolling bounce/complaint rate) ──────────
  // Fetch health once before the loop — never per-contact.
  const senderHealth = await storage.getUserSenderHealth(userId);

  if (senderHealth.sent >= MIN_SENDER_HEALTH_SENT &&
      (senderHealth.bounceRate > BOUNCE_RATE_PAUSE_THRESHOLD ||
       senderHealth.complaintRate > COMPLAINT_RATE_PAUSE_THRESHOLD)) {
    await storage.updateUser(userId, {
      sendPaused: true,
      sendPausedReason: `auto_paused: bounce=${(senderHealth.bounceRate * 100).toFixed(1)}% complaint=${(senderHealth.complaintRate * 100).toFixed(2)}%`,
      sendPausedAt: new Date(),
    });
    await storage.updateCampaign(campaignId, { status: "FAILED" });
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
    console.warn(`${logTag} User ${userId} auto-paused — bounce=${(senderHealth.bounceRate * 100).toFixed(1)}% complaint=${(senderHealth.complaintRate * 100).toFixed(2)}%`);
    return;
  }

  const template   = campaign.templateSnapshot || {};
  const contactIds = campaign.contactIds || [];

  // ── Domain check at campaign start ───────────────────────────────────────────
  // Resolves the custom domain once before the loop. If the domain was suspended or
  // removed after campaign creation, the campaign must fail — silent fallback to the
  // platform email would send from a different domain than the customer intended.
  let customFromEmail = null;
  if (campaign.senderDomainId) {
    const domainRecord = await storage.getSenderDomainById(campaign.senderDomainId);
    if (!domainRecord || domainRecord.status !== "VERIFIED") {
      // Domain was removed or suspended after campaign creation — fail immediately.
      // A silent fallback would send from platform email, masking the issue and
      // potentially confusing recipients or triggering spam filters.
      await storage.updateCampaign(campaignId, { status: "FAILED" });
      await storage.createAuditLog({
        userId,
        action: AUDIT_ACTIONS.CAMPAIGN_DOMAIN_REVOKED,
        targetType: "campaign",
        targetId: campaignId,
        details: { reason: "sender_domain_not_verified_at_start", domainId: campaign.senderDomainId },
      });
      console.warn(`${logTag} Campaign ${campaignId} failed — senderDomain ${campaign.senderDomainId} not VERIFIED at start`);
      return;
    }
    // Use the snapshot address (captured at creation) — not domainRecord.fromEmail,
    // which may have changed since the campaign was created.
    customFromEmail = campaign.senderEmailSnapshot || domainRecord.fromEmail;
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

  const rateLimiter = getRateLimiter();
  let rateLimiterFallbackLogged = false;
  let sentCount    = 0;
  let failedCount  = 0;
  let skippedCount = 0;
  let outOfCredits         = false;
  let globalPausedMidLoop  = false;
  let senderPausedMidLoop  = false;
  let cancelledMidLoop     = false;

  console.log(`${logTag} Campaign ${campaignId} — ${contactIds.length} contacts`);

  // Batch-load all contacts before the loop — 1 query instead of N per-contact lookups.
  // Per-contact suppression checks remain inside the loop (a concurrent campaign can add
  // suppressions mid-execution, so those must stay live).
  const contactList = await storage.getContactsByIds(contactIds);
  const contactMap  = new Map(contactList.map(c => [c.id, c]));

  for (let i = 0; i < contactIds.length; i++) {
    // Re-check global pause and per-user sendPaused every PAUSE_CHECK_INTERVAL contacts.
    // Allows admin pause or auto-pause (fired by a concurrent campaign start) to take effect
    // mid-campaign without a DB query on every single contact. Skip i=0 (checked pre-loop).
    if (i > 0 && i % PAUSE_CHECK_INTERVAL === 0) {
      // Check for user-initiated cancellation first — highest priority.
      const midLoopStatus = await storage.getCampaignStatus(campaignId);
      if (midLoopStatus === CAMPAIGN_STATUS.CANCELLED) {
        await storage.updateCampaign(campaignId, {
          sentEmails: sentCount, failedEmails: failedCount, skippedEmails: skippedCount, creditsUsed: sentCount,
        });
        console.warn(`${logTag} Campaign ${campaignId} cancelled at contact ${i} — stopping`);
        cancelledMidLoop = true;
        break;
      }

      if (await isGlobalSendPaused()) {
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
          await storage.updateCampaign(campaignId, {
            status: "FAILED",
            sentEmails: sentCount, failedEmails: failedCount, skippedEmails: skippedCount, creditsUsed: sentCount,
          });
          await storage.createAuditLog({
            userId,
            action: AUDIT_ACTIONS.CAMPAIGN_DOMAIN_REVOKED,
            targetType: "campaign",
            targetId: campaignId,
            details: { reason: "sender_domain_no_longer_verified", domainId: campaign.senderDomainId, pausedAtContact: i },
          });
          console.warn(`${logTag} Campaign ${campaignId} failed at contact ${i} — sender domain revoked mid-loop`);
          senderPausedMidLoop = true;
          break;
        }
      }

      // Re-check per-user sendPaused — auto-pause may have fired from a concurrent campaign.
      // Sender-health pause is not resumable by global action — use FAILED (not PAUSED).
      const freshOwner = await storage.getUserById(userId);
      if (freshOwner?.sendPaused) {
        await storage.updateCampaign(campaignId, {
          status: "FAILED",
          sentEmails: sentCount, failedEmails: failedCount, skippedEmails: skippedCount, creditsUsed: sentCount,
        });
        await storage.createAuditLog({
          userId,
          action: AUDIT_ACTIONS.CAMPAIGN_FAILED,
          targetType: "campaign",
          targetId: campaignId,
          details: { reason: "sender_paused_mid_loop", pausedAtContact: i },
        });
        console.warn(`${logTag} Campaign ${campaignId} failed at contact ${i} — sender paused mid-loop`);
        senderPausedMidLoop = true;
        break;
      }
    }

    const contactId = contactIds[i];
    const contact   = contactMap.get(contactId) || null;

    // On retry: skip contacts already processed to prevent duplicate sends.
    if (isRetry && contact) {
      const existing = await storage.getCampaignEmailByContact(campaignId, contactId);
      if (existing?.status === CAMPAIGN_EMAIL_STATUS.SENT) { sentCount++; continue; }
      if (existing?.status === CAMPAIGN_EMAIL_STATUS.SUPPRESSED) { skippedCount++; continue; }
      // BOUNCED and COMPLAINED are set by the SNS handler after a confirmed delivery.
      // They must never be re-sent to, even on retry — the address is permanently unsafe.
      if (existing?.status === CAMPAIGN_EMAIL_STATUS.BOUNCED)    { skippedCount++; continue; }
      if (existing?.status === CAMPAIGN_EMAIL_STATUS.COMPLAINED) { skippedCount++; continue; }
      if (existing?.status === CAMPAIGN_EMAIL_STATUS.FAILED) {
        const isPermanent = existing.failureReason && [
          "hard_bounce", "invalid_recipient", "complaint", "suppressed",
        ].includes(existing.failureReason);
        if (isPermanent) { failedCount++; continue; }
      }
      // PENDING or transient FAILED: fall through and re-process
    }

    // Create PENDING audit record before any send attempt.
    const campaignEmailRecord = await storage.createCampaignEmail({
      campaignId,
      userId,
      contactId:      contact ? contactId : null,
      recipientEmail: contact?.email || "unknown",
      status: CAMPAIGN_EMAIL_STATUS.PENDING,
    });

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

        const info = await sendWithRetry(
          contact, template, userId, campaignId,
          usedRateLimiter ? rateLimiter : null,
          campaignEmailRecord.id, 3, senderProfile
        );

        // Email delivered to SES — mark SENT immediately before credit deduction.
        // If deduction fails, the email record correctly shows SENT (not FAILED).
        await storage.updateCampaignEmail(campaignEmailRecord.id, {
          status: CAMPAIGN_EMAIL_STATUS.SENT,
          sesMessageId: info?.messageId || null,
          sentAt: new Date(),
        });
        sentCount++;
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

    // Checkpoint every CHECKPOINT_INTERVAL emails — matches UI poll cadence, reduces DB writes.
    // Terminal exits (cancel, pause, credit exhaustion) always flush final counts separately.
    if ((i + 1) % CHECKPOINT_INTERVAL === 0) {
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
  // Cancel/pause/sender-pause already wrote their own counts during the break.
  // Credit exhaustion uses the atomic terminal write below.

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

  if (globalPausedMidLoop) {
    console.warn(`${logTag} Campaign ${campaignId} paused mid-loop — status already PAUSED`);
    return;
  }
  if (senderPausedMidLoop) {
    console.warn(`${logTag} Campaign ${campaignId} failed mid-loop — sender paused`);
    return;
  }
  if (cancelledMidLoop) {
    console.warn(`${logTag} Campaign ${campaignId} cancelled mid-loop — counts flushed`);
    return;
  }

  // Re-read status to catch any external state change (e.g., admin action during the loop's
  // last batch of contacts that didn't land on a PAUSE_CHECK_INTERVAL boundary).
  const currentState = await storage.getCampaign(campaignId);
  if (currentState?.status === "FAILED") {
    console.warn(`${logTag} Campaign ${campaignId} externally terminated (FAILED) — not overwriting to COMPLETED`);
    return;
  }
  if (currentState?.status === "PAUSED") {
    console.warn(`${logTag} Campaign ${campaignId} externally paused — not overwriting to COMPLETED`);
    return;
  }
  if (currentState?.status === CAMPAIGN_STATUS.CANCELLED) {
    console.warn(`${logTag} Campaign ${campaignId} cancelled — not overwriting to COMPLETED`);
    return;
  }

  // Atomic terminal transition: only writes COMPLETED if status is still RUNNING.
  // Prevents a TOCTOU race where status changed between the currentState read above
  // and this write (e.g., two concurrent executions on the inline fallback path).
  const completed = await storage.updateCampaignIfRunning(campaignId, {
    sentEmails:   sentCount,
    failedEmails: failedCount,
    skippedEmails: skippedCount,
    creditsUsed:  sentCount,
    status:       "COMPLETED",
    completedAt:  new Date(),
  });

  if (!completed) {
    console.warn(`${logTag} Campaign ${campaignId} status changed before COMPLETED write — skipping`);
    return;
  }

  await storage.createAuditLog({
    userId,
    action: AUDIT_ACTIONS.CAMPAIGN_COMPLETED,
    targetType: "campaign",
    targetId: campaignId,
    details: { name: campaign.name, sentEmails: sentCount, failedEmails: failedCount },
  });

  if (owner && owner.role !== USER_ROLES.ROOT_ADMIN && !owner.isSecondaryRoot) {
    await storage.updateUserActivity(userId).catch(err =>
      console.error(`${logTag} updateUserActivity failed for ${userId}:`, err.message)
    );
  }
}
