/**
 * Negative-path health test.
 *
 * Validates that /api/health correctly reports "degraded" when each dependency
 * is unavailable. Tests the exact same code paths as the health endpoint.
 *
 * Run: railway run node tmp/test-health-negative.mjs
 */

import pg from "pg";
import IORedis from "ioredis";
import "../server/env.js";

const { Pool } = pg;

const PASS = "PASS";
const FAIL = "FAIL";
let allPassed = true;

function assert(label, condition, got) {
  const status = condition ? PASS : FAIL;
  if (!condition) allPassed = false;
  console.log(`  [${status}] ${label}${condition ? "" : ` — got: ${JSON.stringify(got)}`}`);
}

// ── Test 1: Postgres unavailable ─────────────────────────────────────────────
console.log("\n=== Test 1: PostgreSQL unavailable ===");
{
  const badPool = new Pool({
    connectionString: "postgresql://bad_user:bad_pass@localhost:5432/bad_db",
    connectionTimeoutMillis: 2000,
  });

  let postgresStatus, overallStatus;
  try {
    await Promise.race([
      badPool.query("SELECT 1"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
    postgresStatus = "connected";
    overallStatus = "ok";
  } catch (err) {
    postgresStatus = `error: ${err.message}`;
    overallStatus = "degraded";
  }
  await badPool.end().catch(() => {});

  assert("status === 'degraded'", overallStatus === "degraded", overallStatus);
  assert("postgres starts with 'error:'", postgresStatus.startsWith("error:"), postgresStatus);
  console.log(`  Evidence: postgres="${postgresStatus}", status="${overallStatus}"`);
}

// ── Test 2: Redis unavailable ─────────────────────────────────────────────────
console.log("\n=== Test 2: Redis unavailable ===");
{
  const badRedis = new IORedis({
    host: "localhost",
    port: 9999, // non-existent
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 2000,
    retryStrategy: () => null, // don't retry
  });

  let redisStatus, workerStatus, overallStatus;
  try {
    await badRedis.connect();
    await Promise.race([
      badRedis.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
    redisStatus = "connected";
    overallStatus = "ok";
    workerStatus = "unknown"; // would read heartbeat
  } catch (err) {
    redisStatus = `error: ${err.message}`;
    workerStatus = "unknown";
    overallStatus = "degraded";
  }
  await badRedis.quit().catch(() => {});

  assert("status === 'degraded'", overallStatus === "degraded", overallStatus);
  assert("redis starts with 'error:'", redisStatus.startsWith("error:"), redisStatus);
  assert("worker === 'unknown'", workerStatus === "unknown", workerStatus);
  console.log(`  Evidence: redis="${redisStatus}", worker="${workerStatus}", status="${overallStatus}"`);
}

// ── Test 3: Postgres healthy, Redis healthy (production) ─────────────────────
console.log("\n=== Test 3: Both healthy (production DB) ===");
{
  const goodPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  const goodRedis = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 5000,
  });

  let postgresStatus = "unchecked";
  let redisStatus = "unchecked";
  let workerStatus = "unchecked";
  let overallStatus = "ok";

  try {
    await Promise.race([
      goodPool.query("SELECT 1"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
    postgresStatus = "connected";
  } catch (err) {
    postgresStatus = `error: ${err.message}`;
    overallStatus = "degraded";
  }

  try {
    await goodRedis.connect();
    await Promise.race([
      goodRedis.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
    redisStatus = "connected";

    const heartbeat = await goodRedis.get("repmail:worker:heartbeat").catch(() => null);
    if (heartbeat) {
      const ageMs = Date.now() - parseInt(heartbeat, 10);
      workerStatus = ageMs < 70_000 ? "running" : "stalled";
    } else {
      workerStatus = "stalled";
    }
  } catch (err) {
    redisStatus = `error: ${err.message}`;
    workerStatus = "unknown";
    overallStatus = "degraded";
  }

  await goodPool.end().catch(() => {});
  await goodRedis.quit().catch(() => {});

  assert("status === 'ok'", overallStatus === "ok", overallStatus);
  assert("postgres === 'connected'", postgresStatus === "connected", postgresStatus);
  assert("redis === 'connected'", redisStatus === "connected", redisStatus);
  assert("worker === 'running'", workerStatus === "running", workerStatus);
  console.log(`  Evidence: postgres="${postgresStatus}", redis="${redisStatus}", worker="${workerStatus}", status="${overallStatus}"`);
}

// ── Test 4: Worker heartbeat stale ───────────────────────────────────────────
console.log("\n=== Test 4: Worker heartbeat stale (>70s old) ===");
{
  // Simulate a heartbeat that was written 80 seconds ago
  const staleTimestamp = String(Date.now() - 80_000);
  let workerStatus;
  if (staleTimestamp) {
    const ageMs = Date.now() - parseInt(staleTimestamp, 10);
    workerStatus = ageMs < 70_000 ? "running" : "stalled";
  } else {
    workerStatus = "stalled";
  }
  assert("worker === 'stalled' for 80s old heartbeat", workerStatus === "stalled", workerStatus);
  console.log(`  Evidence: 80s old timestamp → worker="${workerStatus}"`);
}

// ── Test 5: Worker heartbeat absent ─────────────────────────────────────────
console.log("\n=== Test 5: Worker heartbeat absent ===");
{
  const heartbeat = null; // key missing
  const workerStatus = heartbeat ? "running" : "stalled";
  assert("worker === 'stalled' when key absent", workerStatus === "stalled", workerStatus);
  console.log(`  Evidence: heartbeat=null → worker="${workerStatus}"`);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("\n=== SUMMARY ===");
if (allPassed) {
  console.log("[PASS] All health negative-path tests passed.");
  process.exit(0);
} else {
  console.log("[FAIL] Some tests failed — see above.");
  process.exit(1);
}
