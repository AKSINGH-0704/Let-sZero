/**
 * BullMQ Campaign Worker
 * ======================
 * Processes campaign-execution jobs asynchronously.
 * - Concurrency: 3 campaigns at once
 * - Per-email retry: up to 3 attempts with exponential backoff (see campaignLoop.js)
 * - Checkpoints sentEmails/failedEmails after every CHECKPOINT_INTERVAL emails
 * - BullMQ-level retries: 3 attempts on job failure with exponential backoff
 * - Idempotent: skips already-COMPLETED campaigns
 *
 * Campaign send logic lives in server/campaignLoop.js.
 * Runtime constants live in server/campaignConfig.js.
 */

import { Worker } from "bullmq";
import { getRedisConnection } from "./queue.js";
import { storage } from "./storage.js";
import { runCampaignLoop, sendWithRetry } from "./campaignLoop.js";
import { SEND_RATE_MS } from "./campaignConfig.js";
import { USER_ROLES, AUDIT_ACTIONS } from "../shared/schema.js";

// Re-export sendWithRetry so existing callers that import it from worker.js continue to work.
export { sendWithRetry };

export function startWorker() {
  const connection = getRedisConnection();
  if (!connection) {
    console.warn("[WORKER] Redis not configured — BullMQ worker disabled (inline fallback active)");
    return null;
  }

  const worker = new Worker(
    "campaign-execution",
    async (job) => {
      const { campaignId, userId } = job.data;
      await runCampaignLoop(campaignId, userId, {
        logTag:     "[CAMPAIGN][WORKER]",
        onProgress: (pct) => job.updateProgress(pct),
      });
    },
    {
      connection,
      concurrency:     3,
      lockDuration:    60_000,
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
      // PAR-TRUST-017 §7.3/§7.5 — this handler has no local sentCount/failedCount
      // (the loop's counters live inside runCampaignLoop's own scope, not here),
      // so finalizeCampaign re-derives true counts from campaign_emails rather
      // than trusting a stale checkpoint. Idempotent — a no-op if the loop's own
      // post-loop safety net already finalized this campaign first.
      await storage.createAuditLog({
        userId: userId || null,
        action: AUDIT_ACTIONS.CAMPAIGN_FAILED,
        targetType: "campaign",
        targetId: id,
        details: { reason: "bullmq_job_failed", message: err.message },
      }).catch(() => {});
      await storage.finalizeCampaign(id, "FAILED").catch(() => {});
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

  if (SEND_RATE_MS === 0) {
    console.warn("[WORKER] SES_SEND_RATE_MS is 0 — if Redis becomes unavailable, campaign sends will run at uncapped speed.");
  }
  console.log("[WORKER] BullMQ campaign worker started (concurrency=3)");
  return worker;
}
