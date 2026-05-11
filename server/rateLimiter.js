/**
 * Redis-backed token bucket rate limiter for SES send rate coordination.
 *
 * Shared across all workers and Railway instances via a dedicated Redis connection
 * so combined throughput across all concurrency slots never exceeds SES_RATE_PER_SECOND.
 *
 * Fairness: a per-campaign cap of 60% of tokens per second prevents one large campaign
 * from monopolising capacity when multiple campaigns run concurrently. The cap is
 * implemented as a time-windowed counter (1-second window) keyed by campaignId + epoch-second,
 * which expires naturally — no explicit cleanup needed.
 *
 * Degradation: callers catch thrown errors from acquire()/release() and fall back to
 * per-worker SES_SEND_RATE_MS sleep. getRateLimiter() returns null when REDIS_URL is
 * not configured so callers can branch without try/catch at the call site.
 *
 * Environment:
 *   SES_RATE_PER_SECOND — SES account sending limit (default 14). Setting this higher
 *   than the actual AWS limit causes throttling errors; set it equal to or below the
 *   AWS Console sending limit for the verified identity.
 */

import IORedis from "ioredis";

const BUCKET_KEY = "repmail:rate:tokens";
const REFILL_KEY = "repmail:rate:lastRefill";

// Atomically attempt to acquire one send token.
// KEYS[1] shared token bucket  KEYS[2] last-refill timestamp  KEYS[3] per-campaign window counter
// ARGV[1] maxTokens  ARGV[2] now(ms)  ARGV[3] refillInterval(ms)  ARGV[4] maxPerCampaign
const ACQUIRE_SCRIPT = `
  local maxTokens      = tonumber(ARGV[1])
  local now            = tonumber(ARGV[2])
  local refillInterval = tonumber(ARGV[3])
  local maxPerCampaign = tonumber(ARGV[4])

  local tokens = tonumber(redis.call('GET', KEYS[1]))
  if tokens == nil then tokens = maxTokens end

  local lastRefill = tonumber(redis.call('GET', KEYS[2])) or 0
  if now - lastRefill >= refillInterval then
    tokens = maxTokens
    redis.call('SET', KEYS[2], now)
  end

  local campaignUsed = tonumber(redis.call('GET', KEYS[3])) or 0

  if tokens > 0 and campaignUsed < maxPerCampaign then
    redis.call('SET', KEYS[1], tokens - 1)
    redis.call('EXPIRE', KEYS[1], 10)
    redis.call('INCR', KEYS[3])
    redis.call('EXPIRE', KEYS[3], 5)
    return 1
  end
  return 0
`;

// Return one token after an SES throttle error — the send did not consume SES capacity.
// KEYS[1] shared token bucket  KEYS[2] per-campaign window counter
// ARGV[1] maxTokens
const RELEASE_SCRIPT = `
  local maxTokens    = tonumber(ARGV[1])
  local tokens       = tonumber(redis.call('GET', KEYS[1]))
  if tokens == nil then tokens = 0 end
  if tokens < maxTokens then
    redis.call('SET', KEYS[1], tokens + 1)
    redis.call('EXPIRE', KEYS[1], 10)
  end
  local campaignUsed = tonumber(redis.call('GET', KEYS[2])) or 0
  if campaignUsed > 0 then
    redis.call('SET', KEYS[2], campaignUsed - 1)
    redis.call('EXPIRE', KEYS[2], 5)
  end
  return 1
`;

let _connection = null;
let _rateLimiter = null;

function getConnection() {
  if (_connection) return _connection;
  if (!process.env.REDIS_URL) return null;

  _connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,  // fail fast — callers handle fallback, not ioredis retry loops
    enableReadyCheck: false,
    lazyConnect: true,
  });
  // Suppress unhandled error events — errors surface as rejected promises in eval()
  _connection.on("error", () => {});
  return _connection;
}

/**
 * Returns the shared rate limiter, or null if REDIS_URL is not configured.
 * The returned object is a singleton — safe to call multiple times.
 */
export function getRateLimiter() {
  if (_rateLimiter !== null) return _rateLimiter;

  const connection = getConnection();
  if (!connection) {
    _rateLimiter = null;
    return null;
  }

  const sesRatePerSecond = Math.max(1, parseInt(process.env.SES_RATE_PER_SECOND || "14", 10));
  const maxTokens        = sesRatePerSecond;
  const maxPerCampaign   = Math.max(1, Math.floor(sesRatePerSecond * 0.6));
  const refillIntervalMs = 1000;

  console.log(`[RATE_LIMITER] Initialized — sesRatePerSecond=${sesRatePerSecond} maxPerCampaign=${maxPerCampaign}/s`);

  function campaignWindowKey(campaignId) {
    // Key encodes the current 1-second epoch window — expires in 5s, resets automatically
    return `repmail:rate:campaign:${campaignId}:${Math.floor(Date.now() / 1000)}`;
  }

  _rateLimiter = {
    /**
     * Acquire one SES send token. Polls until a token is available or 30s elapses
     * (after which it proceeds to prevent an indefinite campaign stall).
     * Throws on Redis error — caller falls back to per-worker SEND_RATE_MS sleep.
     */
    async acquire(campaignId) {
      const maxWaitMs = 30_000;
      const start = Date.now();

      while (Date.now() - start < maxWaitMs) {
        const result = await connection.eval(
          ACQUIRE_SCRIPT, 3,
          BUCKET_KEY, REFILL_KEY, campaignWindowKey(campaignId),
          maxTokens, Date.now(), refillIntervalMs, maxPerCampaign
        );
        if (result === 1) return;

        // Jitter prevents thundering herd when all workers poll simultaneously
        const jitter = Math.floor(Math.random() * 30);
        await new Promise(r => setTimeout(r, 50 + jitter));
      }

      console.warn("[RATE_LIMITER] Token acquire timeout after 30s — proceeding to prevent indefinite campaign stall");
    },

    /**
     * Return one token after an SES throttle error (the send did not consume SES capacity).
     * Best-effort — errors are silently swallowed so throttle handling is never interrupted.
     */
    async release(campaignId) {
      await connection.eval(
        RELEASE_SCRIPT, 2,
        BUCKET_KEY, campaignWindowKey(campaignId),
        maxTokens
      );
    },
  };

  return _rateLimiter;
}
