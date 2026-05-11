/**
 * BullMQ Campaign Queue
 * =====================
 * Requires REDIS_URL env var. If not set, all exports return null/false
 * and the app falls back to inline execution (dev mode safe).
 */

import { Queue } from "bullmq";
import IORedis from "ioredis";

let _connection = null;
let _campaignQueue = null;

export function getRedisConnection() {
  if (_connection) return _connection;
  if (!process.env.REDIS_URL) return null;

  _connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
  });

  _connection.on("error", (err) => {
    console.error("[REDIS] Connection error:", err.message);
  });

  _connection.on("connect", () => {
    console.log("[REDIS] Connected");
  });

  return _connection;
}

export function getCampaignQueue() {
  if (_campaignQueue) return _campaignQueue;
  const connection = getRedisConnection();
  if (!connection) return null;

  _campaignQueue = new Queue("campaign-execution", {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });

  console.log("[QUEUE] Campaign queue initialized");
  return _campaignQueue;
}

/**
 * Enqueue a campaign job. Returns the job if BullMQ is available, null otherwise.
 * Uses jobId = campaignId for deduplication — adding the same campaign twice is a no-op.
 */
export async function addCampaignJob(campaignId, userId) {
  const queue = getCampaignQueue();
  if (!queue) return null;
  try {
    const job = await queue.add(
      "execute",
      { campaignId, userId },
      { jobId: campaignId } // deduplication across instances
    );
    console.log(`[QUEUE] Campaign ${campaignId} enqueued (jobId=${job.id})`);
    return job;
  } catch (err) {
    console.error("[QUEUE] Failed to enqueue campaign:", err.message);
    return null;
  }
}
