// M52 — production state verification.
//
// Reads only. Moves no money, writes no row, touches no customer.
//
// Exists because "migrations applied successfully" is not evidence. In M42 the
// runner printed exactly that while silently skipping an unjournaled migration,
// and the milestone shipped believing a table existed that did not. The only
// acceptable proof that a schema change landed is asking the database what
// columns it actually has.
//
// Run: railway run node scripts/m52-prod-verify.mjs

import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not present"); process.exit(2); }

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
});
await client.connect();

let failures = 0;
const ok = (label, pass, detail = "") => {
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
};

// ── 1. The migration actually landed ────────────────────────────────────────
const col = await client.query(`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'workspace_subscriptions' AND column_name = 'billing_anchor_day'
`);
ok("billing_anchor_day exists", col.rowCount === 1);
if (col.rowCount === 1) {
  const c = col.rows[0];
  ok("  is integer", c.data_type === "integer", c.data_type);
  // Nullable with no default is the whole safety property: a null anchor
  // reproduces the pre-M52 arithmetic, so no live renewal date can move.
  ok("  is NULLABLE", c.is_nullable === "YES", c.is_nullable);
  ok("  has NO default", c.column_default === null, String(c.column_default));
}

// ── 2. Nothing was backfilled ───────────────────────────────────────────────
const anchored = await client.query(
  `SELECT count(*)::int AS n FROM workspace_subscriptions WHERE billing_anchor_day IS NOT NULL`
);
ok("no existing subscription was given an anchor", anchored.rows[0].n === 0,
  `${anchored.rows[0].n} anchored`);

// ── 3. No live renewal date moved ───────────────────────────────────────────
const subs = await client.query(`
  SELECT id, status, seats, term, period_start, period_end, renewal_amount_minor,
         autopay_enabled, mandate_id, billing_anchor_day
  FROM workspace_subscriptions ORDER BY created_at
`);
console.log(`\nsubscriptions (${subs.rowCount}):`);
for (const s of subs.rows) {
  console.log(`  ${s.status} seats=${s.seats} ${s.term} renews=${new Date(s.period_end).toISOString()} ` +
    `amount=${s.renewal_amount_minor} autopay=${s.autopay_enabled} mandate=${s.mandate_id ?? "none"} anchor=${s.billing_anchor_day ?? "null"}`);
}

// ── 4. The mandate model is untouched and inert ─────────────────────────────
const mandates = await client.query(
  `SELECT status, count(*)::int AS n FROM payment_mandates GROUP BY status`
);
console.log(`\nmandates: ${mandates.rowCount === 0 ? "none" : mandates.rows.map(r => `${r.status}=${r.n}`).join(" ")}`);

// ── 5. Rollout + commerce settings ──────────────────────────────────────────
const settings = await client.query(`
  SELECT key, value FROM platform_settings
  WHERE key IN ('seat_billing_enabled','seat_free_floor','seat_autopay_scope',
                'seat_autopay_allowlist','seat_autopay_limit_pct','seat_grandfather_until',
                'seat_billing_activated_at')
  ORDER BY key
`);
console.log("\nsettings:");
for (const r of settings.rows) console.log(`  ${r.key} = ${r.value}`);

// ── 6. Migration ledger ─────────────────────────────────────────────────────
try {
  const applied = await client.query(
    `SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`
  );
  console.log(`\ndrizzle migrations recorded: ${applied.rows[0].n}`);
} catch {
  console.log("\ndrizzle migration ledger not readable (non-fatal)");
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
await client.end();
process.exit(failures === 0 ? 0 : 1);
