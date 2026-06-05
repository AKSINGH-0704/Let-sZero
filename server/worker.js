/**
 * BullMQ Campaign Worker
 * ======================
 * Processes campaign-execution jobs asynchronously.
 * - Concurrency: 3 campaigns at once
 * - Per-email retry: up to 3 attempts with exponential backoff
 * - Checkpoints sentEmails/failedEmails after every email (enables live polling)
 * - BullMQ-level retries: 3 attempts on job failure with exponential backoff
 * - Idempotent: skips already-COMPLETED campaigns
 */

import { Worker } from "bullmq";
import { getRedisConnection } from "./queue.js";
import { storage } from "./storage.js";
import { sendCampaignEmail } from "./email.js";
import { AUDIT_ACTIONS, CAMPAIGN_EMAIL_STATUS, USER_ROLES } from "../shared/schema.js";
import { getRateLimiter } from "./rateLimiter.js";

const SEND_RATE_MS = parseInt(process.env.SES_SEND_RATE_MS || "0", 10);
if (SEND_RATE_MS === 0) {
  console.warn("[STARTUP] WARNING: SES_SEND_RATE_MS is 0 or unset. If Redis becomes unavailable, campaign sends will run at uncapped speed. Set SES_SEND_RATE_MS=75 minimum in production.");
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function startWorker() {
  const connection = getRedisConnection();
  if (!connection) {
    console.log("[WORKER] Redis not configured — BullMQ worker disabled (inline fallback active)");
    return null;
  }

  const worker = new Worker(
    "campaign-execution",
    async (job) => {
      const { campaignId, userId } = job.data;
      await processCampaign(campaignId, userId, job);
    },
    {
      connection,
      concurrency: 3,
      lockDuration: 60_000,
      stalledInterval: 30_000,
      maxStalledCount: 3,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[WORKER] Campaign ${job.data.campaignId} completed`);
  });

  worker.on("failed", async (job, err) => {
    const id     = job?.data?.campaignId;
    const userId = job?.data?.userId;
    console.error(`[WORKER] Campaign ${id} permanently failed:`, err.message);
    if (id) {
      await storage.updateCampaign(id, { status: "FAILED" }).catch(() => {});
      // Update activity only if execution genuinely started (at least one email attempted)
      if (userId) {
        const failed = await storage.getCampaign(id).catch(() => null);
        if (failed) {
          const attempted = (failed.sentEmails || 0) + (failed.failedEmails || 0) + (failed.skippedEmails || 0);
          if (attempted > 0) {
            const owner = await storage.getUserById(userId).catch(() => null);
            if (owner && owner.role !== USER_ROLES.ROOT_ADMIN && !owner.isSecondaryRoot) {
              await storage.updateUserActivity(userId).catch(() => {});
            }
          }
        }
      }
    }
  });

  worker.on("error", (err) => {
    console.error("[WORKER] Worker error:", err.message);
  });

  // Heartbeat: written every 30s so the health endpoint can detect silent worker death.
  // TTL is 60s — if two consecutive writes fail the key expires and health reports "stalled".
  const HEARTBEAT_KEY = "repmail:worker:heartbeat";
  const heartbeatInterval = setInterval(async () => {
    try {
      await connection.set(HEARTBEAT_KEY, Date.now(), "EX", 60);
    } catch {
      // Swallowed — Redis error is already logged by the connection error handler.
    }
  }, 30_000);
  // Write immediately so health checks don't report stalled right after startup.
  connection.set(HEARTBEAT_KEY, Date.now(), "EX", 60).catch(() => {});

  const originalClose = worker.close.bind(worker);
  worker.close = async (force) => {
    clearInterval(heartbeatInterval);
    return originalClose(force);
  };

  console.log("[WORKER] BullMQ campaign worker started (concurrency=3)");
  return worker;
}

// Detect SES SMTP throttle responses (nodemailer surfaces these as SMTP error objects)
function isThrottleError(err) {
  if (!err) return false;
  if (err.responseCode === 454 || err.responseCode === 421) return true;
  if (typeof err.response === "string") {
    const r = err.response.toLowerCase();
    if (r.includes("throttl") || r.includes("too many")) return true;
  }
  // AWS SDK codes — future-proofing for direct SDK usage
  if (err.code === "Throttling" || err.code === "TooManyRequestsException") return true;
  return false;
}

// Retry a single email send up to maxAttempts times with linear back-off.
// Throttle errors (SES rate exceeded) do not consume a retry attempt — they use a
// separate 2s+jitter delay and return the acquired token since no SES capacity was used.
async function sendWithRetry(contact, template, userId, campaignId, rateLimiter, campaignEmailId, maxAttempts = 3) {
  let lastErr;
  let attempts = 0;
  let throttleRetries = 0;
  const maxThrottleRetries = 10;

  while (attempts < maxAttempts) {
    try {
      return await sendCampaignEmail(contact, template, userId, campaignEmailId);
    } catch (err) {
      lastErr = err;

      if (isThrottleError(err) && throttleRetries < maxThrottleRetries) {
        throttleRetries++;
        const jitter = Math.floor(Math.random() * 1000);
        const delay = 2000 + jitter;
        console.warn(`[RATE] [${campaignId}] SES throttle at ${new Date().toISOString()} — retry ${throttleRetries}/${maxThrottleRetries} in ${delay}ms`);
        // Return token — this send did not consume SES capacity
        if (rateLimiter) await rateLimiter.release(campaignId).catch(() => {});
        await new Promise(r => setTimeout(r, delay));
        continue; // throttle does not consume a permanent-failure retry slot
      }

      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 1000 * attempts));
      }
    }
  }
  throw lastErr;
}

async function processCampaign(campaignId, userId, job) {
  const campaign = await storage.getCampaign(campaignId);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

  // Idempotency guard — skip if already finished
  if (campaign.status === "COMPLETED") {
    console.log(`[WORKER] Campaign ${campaignId} already completed — skipping`);
    return;
  }

  // Detect retry scenario independently of status column.
  // Status-based detection breaks when startup recovery marks RUNNING→FAILED before
  // the worker processes the resurrected BullMQ job. Using sent-email existence as the
  // signal means idempotency kicks in regardless of what recoverStaleCampaigns wrote.
  const hasAnySentEmails = await storage.hasAnySentEmails(campaignId);
  const isRetry = campaign.status === "RUNNING" ||
    (campaign.status === "FAILED" && hasAnySentEmails);

  // Owner-active guard — deactivation may race with a job already sitting in the queue
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
    console.warn(`[WORKER] Campaign ${campaignId} aborted — owner ${userId} is inactive`);
    return;
  }

  // Credit check — skipped on retry because credits were partially consumed in the previous
  // attempt. Per-contact deductCreditAtomic handles enforcement atomically during the loop.
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

  // Transition to RUNNING
  await storage.updateCampaign(campaignId, { status: "RUNNING", startedAt: new Date() });
  await storage.createAuditLog({
    userId,
    action: AUDIT_ACTIONS.CAMPAIGN_STARTED,
    targetType: "campaign",
    targetId: campaignId,
  });

  const template = campaign.templateSnapshot || {};
  const contactIds = campaign.contactIds || [];
  const rateLimiter = getRateLimiter();
  let rateLimiterFallbackLogged = false;
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let outOfCredits = false;

  console.log(`[WORKER] Campaign ${campaignId} — ${contactIds.length} contacts`);

  for (let i = 0; i < contactIds.length; i++) {
    const contactId = contactIds[i];
    const contact = await storage.getContactById(contactId);

    // On retry (campaign already RUNNING), check if this contact was already processed.
    // Prevents duplicate sends when BullMQ retries a failed job.
    if (isRetry && contact) {
      const existing = await storage.getCampaignEmailByContact(campaignId, contactId);
      if (existing?.status === CAMPAIGN_EMAIL_STATUS.SENT) {
        sentCount++;
        continue;
      }
      if (existing?.status === CAMPAIGN_EMAIL_STATUS.SUPPRESSED) {
        skippedCount++;
        continue;
      }
      // BOUNCED and COMPLAINED are set by the SNS handler after a confirmed delivery.
      // They must never be re-sent to, even on retry — the address is permanently unsafe.
      if (existing?.status === CAMPAIGN_EMAIL_STATUS.BOUNCED) {
        skippedCount++;
        continue;
      }
      if (existing?.status === CAMPAIGN_EMAIL_STATUS.COMPLAINED) {
        skippedCount++;
        continue;
      }
      if (existing?.status === CAMPAIGN_EMAIL_STATUS.FAILED) {
        // Hard failures must not be retried — the address is permanently undeliverable.
        const isPermanent = existing.failureReason && [
          "hard_bounce", "invalid_recipient", "complaint", "suppressed",
        ].includes(existing.failureReason);
        if (isPermanent) { failedCount++; continue; }
      }
      // PENDING or transient FAILED: fall through and re-process
    }

    // Create PENDING audit record before any send attempt
    const campaignEmailRecord = await storage.createCampaignEmail({
      campaignId,
      userId,
      contactId: contact ? contactId : null,
      recipientEmail: contact?.email || "unknown",
      status: CAMPAIGN_EMAIL_STATUS.PENDING,
    });

    let attemptedSend = false;
    let usedRateLimiter = false;
    try {
      if (!contact?.email) throw new Error("Contact or email missing");

      // Per-user suppression: check the sending user's own suppression list.
      // Per-contact check inside the loop: a bounce from a concurrent campaign could
      // add this address to the global list mid-execution of a long campaign.
      const suppressed = await storage.isSuppressed(userId, contact.email);
      const globallySuppressed = suppressed ? false : await storage.isGloballySuppressed(contact.email);
      if (suppressed || globallySuppressed) {
        skippedCount++;
        await storage.updateCampaignEmail(campaignEmailRecord.id, {
          status: CAMPAIGN_EMAIL_STATUS.SUPPRESSED,
        });
        console.log(`[WORKER] [${campaignId}] contact ${i + 1} ${globallySuppressed ? "globally " : ""}suppressed — skipping ${contact.email}`);
      } else {
        attemptedSend = true;
        // Acquire a shared SES send token before every actual send attempt
        if (rateLimiter) {
          try {
            await rateLimiter.acquire(campaignId);
            usedRateLimiter = true;
          } catch (rlErr) {
            if (!rateLimiterFallbackLogged) {
              console.warn(`[WORKER] [${campaignId}] Rate limiter unavailable — falling back to ${SEND_RATE_MS}ms per-worker delay:`, rlErr.message);
              rateLimiterFallbackLogged = true;
            }
          }
        }
        const info = await sendWithRetry(contact, template, userId, campaignId, usedRateLimiter ? rateLimiter : null, campaignEmailRecord.id);

        // Email delivered to SES — mark SENT immediately before credit deduction.
        // If deduction fails, the email record correctly shows SENT (not FAILED).
        await storage.updateCampaignEmail(campaignEmailRecord.id, {
          status: CAMPAIGN_EMAIL_STATUS.SENT,
          sesMessageId: info?.messageId || null,
          sentAt: new Date(),
        });
        sentCount++;
        console.log(`[WORKER] [${campaignId}] ${sentCount}/${contactIds.length} → ${contact.email}`);

        try {
          await storage.deductCreditAtomic(userId, campaignId, `Email to ${contact.email}`);
        } catch (deductErr) {
          if (deductErr.message === "Insufficient credits") {
            // Credits exhausted by concurrent deduction — stop the campaign.
            // Email is already marked SENT above.
            outOfCredits = true;
            console.warn(`[WORKER] [${campaignId}] credits exhausted after send to ${contact.email} — stopping`);
            break;
          }
          // DB error after successful send — log accounting drift, do not fail the email record.
          console.error(`[WORKER] [${campaignId}] credit deduction failed after send to ${contact.email} — accounting drift:`, deductErr.message);
        }
      }
    } catch (err) {
      // Handles: contact missing, isSuppressed failure, sendWithRetry failure
      failedCount++;
      await storage.updateCampaignEmail(campaignEmailRecord.id, {
        status: CAMPAIGN_EMAIL_STATUS.FAILED,
        failureReason: err.message,
      });
      console.error(`[WORKER] [${campaignId}] contact ${i + 1} failed:`, err.message);
    }

    // Checkpoint after every email so GET /api/campaigns/:id shows live progress
    await storage.updateCampaign(campaignId, {
      sentEmails: sentCount,
      failedEmails: failedCount,
      skippedEmails: skippedCount,
    });

    // Report 0–100% progress to BullMQ dashboard / monitoring.
    // Wrapped in try/catch: Redis disconnect throws here and would otherwise propagate
    // to BullMQ, marking the job failed and triggering a retry with wrong isRetry context.
    try {
      await job.updateProgress(Math.floor(((i + 1) / contactIds.length) * 100));
    } catch (progressErr) {
      console.warn(`[WORKER] [${campaignId}] Progress update failed — continuing:`, progressErr.message);
    }

    // Fallback throttle when Redis rate limiter is unavailable — per-worker sleep
    if (SEND_RATE_MS > 0 && attemptedSend && !usedRateLimiter) await sleep(SEND_RATE_MS);
  }

  if (outOfCredits) {
    await storage.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CAMPAIGN_BLOCKED_INSUFFICIENT_CREDITS,
      targetType: "campaign",
      targetId: campaignId,
      details: { name: campaign.name, sentEmails: sentCount, stoppedEarly: true },
    });
    console.warn(`[WORKER] Campaign ${campaignId} stopped early — insufficient credits`);
  }

  // Re-read status to detect external termination (e.g., user deactivated mid-run)
  const currentState = await storage.getCampaign(campaignId);
  if (currentState?.status === "FAILED") {
    console.warn(`[WORKER] Campaign ${campaignId} externally terminated (status=FAILED) — not overwriting to COMPLETED`);
    return;
  }

  // Final state
  await storage.updateCampaign(campaignId, {
    sentEmails: sentCount,
    failedEmails: failedCount,
    skippedEmails: skippedCount,
    creditsUsed: sentCount,
    status: "COMPLETED",
    completedAt: new Date(),
  });

  await storage.createAuditLog({
    userId,
    action: AUDIT_ACTIONS.CAMPAIGN_COMPLETED,
    targetType: "campaign",
    targetId: campaignId,
    details: { name: campaign.name, sentEmails: sentCount, failedEmails: failedCount },
  });

  if (owner.role !== USER_ROLES.ROOT_ADMIN && !owner.isSecondaryRoot) {
    await storage.updateUserActivity(userId).catch(err =>
      console.error(`[WORKER] updateUserActivity failed for ${userId}:`, err.message)
    );
  }
}
