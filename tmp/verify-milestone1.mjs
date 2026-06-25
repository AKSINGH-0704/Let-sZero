/**
 * Milestone 1 Verification — static assertions against changed source files.
 * Runs without a live DB or server.
 * Usage: node tmp/verify-milestone1.mjs
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  FAIL: ${label}`);
    failed++;
  }
}

// ── Fix 1: Credit Logic Consistency ──────────────────────────────────────────
console.log("\n[Fix 1] Credit Logic Consistency");

const storageJs = read("server/storage.js");
const memStorageJs = read("server/memoryStorage.js");

// canStartCampaign in storage.js must NOT use DATE_TRUNC calendar month
assert(
  "storage.js: canStartCampaign uses rolling INTERVAL '1 month' (not DATE_TRUNC)",
  storageJs.includes("COALESCE(free_credits_reset_at, created_at) + INTERVAL '1 month'") &&
  !storageJs.includes("DATE_TRUNC")
);

// Both functions must use identical rolling-window SQL
const storageRolling = "(NOW() AT TIME ZONE 'UTC') >= (COALESCE(free_credits_reset_at, created_at) + INTERVAL '1 month')";
const occurrences = storageJs.split(storageRolling).length - 1;
assert(
  `storage.js: rolling-window SQL appears in both canStartCampaign and deductCreditAtomic (found ${occurrences} times)`,
  occurrences === 2
);

// memoryStorage.canStartCampaign must use rolling-window JS logic
assert(
  "memoryStorage.js: canStartCampaign uses nextReset = refDate + 1 month",
  memStorageJs.includes("nextReset.setUTCMonth(nextReset.getUTCMonth() + 1)")
);

// memoryStorage.deductCreditAtomic must use same rolling-window JS logic
assert(
  "memoryStorage.js: deductCreditAtomic uses same nextReset rolling window",
  memStorageJs.includes("nextReset.setUTCMonth(nextReset.getUTCMonth() + 1)")
);

// ── Fix 2: Production-Safe Defaults ──────────────────────────────────────────
console.log("\n[Fix 2] Production-Safe Auto-Pause Defaults");

const routesJs = read("server/routes.js");
const workerJs = read("server/worker.js");

assert(
  'routes.js: BOUNCE_RATE_PAUSE_THRESHOLD default is "0.08"',
  routesJs.includes('BOUNCE_RATE_PAUSE_THRESHOLD || "0.08"')
);
assert(
  'routes.js: COMPLAINT_RATE_PAUSE_THRESHOLD default is "0.0005"',
  routesJs.includes('COMPLAINT_RATE_PAUSE_THRESHOLD || "0.0005"')
);
assert(
  'worker.js: BOUNCE_RATE_PAUSE_THRESHOLD default is "0.08"',
  workerJs.includes('BOUNCE_RATE_PAUSE_THRESHOLD || "0.08"')
);
assert(
  'worker.js: COMPLAINT_RATE_PAUSE_THRESHOLD default is "0.0005"',
  workerJs.includes('COMPLAINT_RATE_PAUSE_THRESHOLD || "0.0005"')
);

// No old unsafe defaults remain
assert(
  'routes.js: old "0.15" default removed',
  !routesJs.includes('"0.15"')
);
assert(
  'worker.js: old "0.15" default removed',
  !workerJs.includes('"0.15"')
);
assert(
  'routes.js: old "0.005" default removed (check not matching "0.0005")',
  !routesJs.includes('|| "0.005"')
);
assert(
  'worker.js: old "0.005" default removed',
  !workerJs.includes('|| "0.005"')
);

// ── Fix 3: Delivery Health Consistency ───────────────────────────────────────
console.log("\n[Fix 3] Delivery Health Consistency");

// storage.js getDeliveryHealthStats must read from env vars, not hardcode
assert(
  "storage.js: getDeliveryHealthStats reads bouncePause from env",
  storageJs.includes('BOUNCE_RATE_PAUSE_THRESHOLD || "0.08"') &&
  storageJs.includes("const bouncePause =")
);
assert(
  "storage.js: getDeliveryHealthStats reads complaintPause from env",
  storageJs.includes('COMPLAINT_RATE_PAUSE_THRESHOLD || "0.0005"') &&
  storageJs.includes("const complaintPause =")
);
assert(
  "storage.js: thresholds response uses bouncePause/complaintPause variables (not literals)",
  storageJs.includes("bouncePause * 100") && storageJs.includes("complaintPause * 100")
);
assert(
  "storage.js: status check uses bouncePause/complaintPause (no hardcoded 0.10)",
  !storageJs.includes("> 0.10") && !storageJs.includes("> 0.05") &&
  storageJs.includes("> bouncePause") && storageJs.includes("> bounceWarn")
);

// memoryStorage.js getDeliveryHealthStats must also derive from env vars
assert(
  "memoryStorage.js: getDeliveryHealthStats derives thresholds from env",
  memStorageJs.includes('BOUNCE_RATE_PAUSE_THRESHOLD || "0.08"') &&
  memStorageJs.includes("bouncePause * 100")
);
assert(
  "memoryStorage.js: no hardcoded critical:10 for bounce",
  !memStorageJs.includes("critical: 10")
);

// ── Fix 4: Audit Action Consistency ──────────────────────────────────────────
console.log("\n[Fix 4] Audit Action Consistency");

const schemaJs = read("shared/schema.js");

assert(
  "schema.js: PLATFORM_SEND_PAUSED constant defined",
  schemaJs.includes('PLATFORM_SEND_PAUSED: "PLATFORM_SEND_PAUSED"')
);
assert(
  "schema.js: PLATFORM_SEND_RESUMED constant defined",
  schemaJs.includes('PLATFORM_SEND_RESUMED: "PLATFORM_SEND_RESUMED"')
);
assert(
  "routes.js: uses AUDIT_ACTIONS.PLATFORM_SEND_PAUSED (not raw string)",
  routesJs.includes("AUDIT_ACTIONS.PLATFORM_SEND_PAUSED") &&
  !routesJs.includes('action: "PLATFORM_SEND_PAUSED"')
);
assert(
  "routes.js: uses AUDIT_ACTIONS.PLATFORM_SEND_RESUMED (not raw string)",
  routesJs.includes("AUDIT_ACTIONS.PLATFORM_SEND_RESUMED") &&
  !routesJs.includes('action: "PLATFORM_SEND_RESUMED"')
);

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(50)}`);
console.log(`Result: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All assertions passed.\n");
}
