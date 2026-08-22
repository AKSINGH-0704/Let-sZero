// M59 / ADS-001 — production settlement-path baseline.
//
// Reads only. Moves no money, writes no row, touches no customer.
//
// Answers one question the application cannot: how much revenue does the
// client-side Google Ads Purchase conversion actually see?
//
// The Purchase conversion fires from the browser, on the /api/payments/razorpay
// /verify response. Three settlement paths exist and only one of them has a
// browser in it:
//
//   browser   the customer's tab reached verify        -> conversion CAN fire
//   webhook   Razorpay's order.paid settled it, the    -> conversion CANNOT fire
//             tab may have been closed                    (the ADS-001 blind spot)
//   autopay   a recurring mandate debit in a worker    -> conversion CANNOT fire,
//                                                          and never could (ADS-008)
//   (null)    settled before M59 shipped, or by the
//             dev-only completion endpoint
//
// The decision this baseline informs: whether server-side offline conversion
// import is worth building. That is justified by a large `webhook` share — real
// ad-driven purchases we are failing to report. It is NOT justified by
// `autopay`, which is recurring revenue with no ad click behind it, which is
// exactly why ADS-008 separated the two. Reading them as one number would argue
// for an architecture the real gap may not need.
//
// Run: railway run node scripts/m59-ads-measurement-baseline.mjs

import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not present"); process.exit(2); }

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
});
await client.connect();

const M59_DEPLOYED = "2026-08-22";

const q = async (sql, params = []) => (await client.query(sql, params)).rows;

console.log("=== M59 / ADS-001 — production settlement-path baseline ===");
console.log(`M59 deployed: ${M59_DEPLOYED}\n`);

// 1. Whole-history distribution.
const all = await q(`
  select coalesce(metadata->>'completionPath', '(unlabelled)') as path,
         count(*)::int as n,
         coalesce(sum(coalesce("amount_minor", "amount_inr" * 100)), 0)::bigint as minor
  from payments
  where status = 'SUCCESS'
  group by 1 order by 2 desc`);

console.log("ALL SUCCESSFUL PAYMENTS (whole history):");
console.log("  path            count      value (INR)");
for (const r of all) {
  console.log(`  ${r.path.padEnd(15)} ${String(r.n).padEnd(10)} ${(Number(r.minor) / 100).toFixed(2)}`);
}

// 2. Since M59 — the only window where labelling is meaningful. Rows settled
//    before the deploy carry no path and are not a blind spot, just history.
const since = await q(`
  select coalesce(metadata->>'completionPath', '(unlabelled)') as path,
         count(*)::int as n,
         coalesce(sum(coalesce("amount_minor", "amount_inr" * 100)), 0)::bigint as minor
  from payments
  where status = 'SUCCESS' and completed_at >= $1::date
  group by 1 order by 2 desc`, [M59_DEPLOYED]);

console.log("\nSINCE M59 DEPLOY (the measurable window):");
if (since.length === 0) {
  console.log("  (no payments settled yet — baseline not yet establishable)");
} else {
  console.log("  path            count      value (INR)");
  for (const r of since) {
    console.log(`  ${r.path.padEnd(15)} ${String(r.n).padEnd(10)} ${(Number(r.minor) / 100).toFixed(2)}`);
  }
}

const total = since.reduce((a, r) => a + r.n, 0);
const get = (p) => since.find((r) => r.path === p)?.n ?? 0;
const observable = get("browser");
const blindSpot = get("webhook");
const structural = get("autopay");

console.log("\nCONVERSION COVERAGE (since deploy):");
if (total === 0) {
  console.log("  UNDETERMINED — no settled payments in the window yet.");
  console.log("  Re-run after real transactions exist. Do NOT build offline");
  console.log("  conversion import on zero evidence.");
} else {
  const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;
  console.log(`  observable by the browser conversion : ${observable}/${total} (${pct(observable)})`);
  console.log(`  ADS-001 blind spot (webhook-settled)  : ${blindSpot}/${total} (${pct(blindSpot)})`);
  console.log(`  structural (autopay renewals)         : ${structural}/${total} (${pct(structural)})`);
  console.log("");
  if (blindSpot === 0) {
    console.log("  VERDICT: no measured blind spot. Offline conversion import is");
    console.log("           NOT justified by this data.");
  } else if (blindSpot / total < 0.05) {
    console.log("  VERDICT: blind spot under 5%. Under-counting only, and small.");
    console.log("           Offline import still not justified — keep measuring.");
  } else {
    console.log("  VERDICT: blind spot material. Offline conversion import is worth");
    console.log("           evaluating on THIS evidence, sized on the webhook share");
    console.log("           alone — never on the autopay share, which no browser");
    console.log("           instrumentation could ever have captured.");
  }
}

// 3. Integrity checks the labelling itself has to satisfy.
console.log("\nLABELLING INTEGRITY:");
const [mis] = await q(`
  select count(*)::int as n from payments
  where status = 'SUCCESS'
    and metadata->>'autopay' = 'true'
    and coalesce(metadata->>'completionPath','') <> 'autopay'
    and completed_at >= $1::date`, [M59_DEPLOYED]);
console.log(`  autopay rows mislabelled as browser/webhook/null : ${mis.n} ${mis.n === 0 ? "(correct)" : "(ADS-008 REGRESSION)"}`);

const [unl] = await q(`
  select count(*)::int as n from payments
  where status = 'SUCCESS' and metadata->>'completionPath' is null
    and completed_at >= $1::date`, [M59_DEPLOYED]);
console.log(`  unlabelled rows settled after deploy             : ${unl.n} ${unl.n === 0 ? "(correct)" : "(investigate: a settlement path is not labelling)"}`);

await client.end();
process.exit(mis.n === 0 ? 0 : 1);
