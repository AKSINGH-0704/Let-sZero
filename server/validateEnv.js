/**
 * Startup environment variable validation.
 *
 * Validates numeric env vars whose malformed values produce silent operational
 * failures — not just NaN, but values that are technically numeric yet make
 * critical platform features (auto-pause, rate limiting, queue concurrency)
 * operationally useless.
 *
 * Scope: only vars with safe defaults that, if misconfigured, fail silently.
 * Optional integration vars (OPENAI_API_KEY, RAZORPAY_*, GOOGLE_CLIENT_ID, etc.)
 * are intentionally excluded — they fail loudly at first use in dev environments.
 */

const ENV_SPECS = [
  {
    name: "BOUNCE_RATE_PAUSE_THRESHOLD",
    parser: parseFloat,
    min: 0,          // exclusive — 0 means every bounce pauses immediately
    max: 0.20,       // inclusive — above 20%, AWS SES suspends before auto-pause fires
    minExclusive: true,
    reason: "Auto-pause will never fire before AWS SES account suspension at values above 0.20 (20%).",
  },
  {
    name: "COMPLAINT_RATE_PAUSE_THRESHOLD",
    parser: parseFloat,
    min: 0,          // exclusive
    max: 0.005,      // inclusive — above 0.5%, AWS SES suspends before auto-pause fires
    minExclusive: true,
    reason: "Auto-pause will never fire before AWS SES account suspension at values above 0.005 (0.5%).",
  },
  {
    name: "SES_SEND_RATE_MS",
    parser: (v) => parseInt(v, 10),
    min: 0,          // inclusive — 0 = no throttle, valid
    max: 30000,      // inclusive — 30s/email means 1000-contact campaign takes 8+ hours
    minExclusive: false,
    reason: "Values above 30000ms make campaigns operationally impractical (>8 hours per 1000 contacts).",
  },
  {
    name: "CAMPAIGN_QUEUE_CONCURRENCY",
    parser: (v) => parseInt(v, 10),
    min: 1,          // inclusive — 0 or negative is nonsensical
    max: 10,         // inclusive — above 10, DB connection pool exhaustion is near-certain
    minExclusive: false,
    // Note: parseInt truncates decimals (e.g. "2.5" → 2), so no integerRequired check needed.
    reason: "Values above 10 saturate the PostgreSQL connection pool under concurrent campaign load.",
  },
];

export function validateEnv() {
  let fatalCount = 0;

  for (const spec of ENV_SPECS) {
    const raw = process.env[spec.name];

    // Var is not set → the in-code default is used → already validated by behavioral tests.
    if (raw === undefined || raw === "") continue;

    const val = spec.parser(raw);

    if (isNaN(val)) {
      console.error(`[STARTUP] FATAL: ${spec.name}="${raw}" is not a valid number. ${spec.reason}`);
      fatalCount++;
      continue;
    }

    const belowMin = spec.minExclusive ? val <= spec.min : val < spec.min;
    if (belowMin) {
      console.error(`[STARTUP] FATAL: ${spec.name}=${val} is below the minimum allowed value (${spec.minExclusive ? ">" : ">="} ${spec.min}). ${spec.reason}`);
      fatalCount++;
      continue;
    }

    if (val > spec.max) {
      console.error(`[STARTUP] FATAL: ${spec.name}=${val} exceeds the maximum allowed value (<= ${spec.max}). ${spec.reason}`);
      fatalCount++;
      continue;
    }
  }

  if (fatalCount > 0) {
    console.error(`[STARTUP] ${fatalCount} fatal env var validation error(s). Fix the above and restart.`);
    process.exit(1);
  }
}
