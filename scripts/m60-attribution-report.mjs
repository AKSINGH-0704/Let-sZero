// M60 — first-party advertising attribution report.
//
// Reads only. Moves no money, writes no row, touches no customer.
//
// This is the deliberate alternative to an analytics dashboard. The business
// question is asked rarely and answered by the operator, so it gets a script
// against the authoritative tables rather than a product surface that would
// have to be secured, paginated, tested and maintained.
//
// ─── What this report is, and what it is NOT ─────────────────────────────────
//
// It reports what THIS APPLICATION recorded. That is a different fact from what
// Google Ads recorded, and the two are never merged here:
//
//   Google Ads knows      clicks, impressions, cost, and its own attributed
//                         conversions. NONE of that is visible from here.
//   This report knows     accounts that arrived with a click identifier, and
//                         the money those accounts actually paid.
//
// So a difference between this report and the Ads UI is expected and is not
// evidence that either is wrong. This one under-counts by construction — see
// the coverage caveats printed at the end — and that is the safe direction: an
// inflated conversion number causes real overspend.
//
// ─── Why the numbers are what they are ───────────────────────────────────────
//
// Attributed accounts come from SIGNUP_ATTRIBUTED audit rows, reduced to the
// EARLIEST row per user. The endpoint that writes them checks for an existing
// row before writing, but that check is not atomic, so counting rows could
// count a race twice. Counting distinct users cannot.
//
// Revenue comes from `payments` with status SUCCESS, joined on user_id — not
// from anything the browser reported. A payment is revenue when the database
// says the money moved, and PENDING, FAILED and CANCELLED rows are excluded by
// that same condition rather than by a list this script maintains.
//
// Run: railway run node scripts/m60-attribution-report.mjs

import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not present"); process.exit(2); }

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
});
await client.connect();

const q = async (sql, params = []) => (await client.query(sql, params)).rows;
const inr = (minor) => `₹${(Number(minor || 0) / 100).toLocaleString("en-IN")}`;

// The earliest SIGNUP_ATTRIBUTED row per user. Every query below builds on this
// CTE so "attributed account" means one thing throughout the report.
const ATTRIBUTED = `
  attributed as (
    select distinct on (user_id)
           user_id,
           details->'first' as first_touch,
           details->'last'  as last_touch,
           created_at
    from audit_logs
    where action = 'SIGNUP_ATTRIBUTED' and user_id is not null
    order by user_id, created_at asc
  )`;

console.log("=== M60 — first-party advertising attribution report ===\n");

// ── 1. The funnel ───────────────────────────────────────────────────────────
//
// Each stage is counted from the table that owns it. "Attributed" is a SUBSET
// of accounts, never a superset: an account with no ad click behind it, or one
// whose owner declined advertising measurement, is correctly absent.
const [funnel] = await q(`
  with ${ATTRIBUTED}
  select
    (select count(*)::int from users)                                as accounts,
    (select count(*)::int from attributed)                           as attributed_accounts,
    (select count(distinct a.user_id)::int
       from attributed a
       join payments p on p.user_id = a.user_id and p.status = 'SUCCESS') as attributed_paying,
    (select count(distinct user_id)::int
       from payments where status = 'SUCCESS')                       as paying_accounts`);

console.log("FUNNEL");
console.log(`  accounts (all time)                 ${funnel.accounts}`);
console.log(`  ├─ attributed to an ad click        ${funnel.attributed_accounts}`);
console.log(`  └─ paying accounts (all time)       ${funnel.paying_accounts}`);
console.log(`     └─ attributed AND paying         ${funnel.attributed_paying}`);

if (funnel.attributed_accounts > 0) {
  const rate = (funnel.attributed_paying / funnel.attributed_accounts) * 100;
  console.log(`\n  attributed signup -> paying customer  ${rate.toFixed(1)}%`);
} else {
  console.log("\n  No attributed accounts yet — every rate below would be 0 of 0,");
  console.log("  which is not a conversion rate. Rates are omitted rather than printed as 0%.");
}

// ── 2. Attributed revenue ───────────────────────────────────────────────────
//
// FIRST-touch, deliberately. This answers "which campaign acquired a customer
// who went on to pay", and a customer's acquiring click cannot change later.
// Last-touch is reported separately below rather than blended, because a single
// blended number would hide which of the two questions it answered.
const bySource = await q(`
  with ${ATTRIBUTED}
  select
    coalesce(a.first_touch->>'utm_source', case when a.first_touch->>'gclid' is not null
             or a.first_touch->>'gbraid' is not null
             or a.first_touch->>'wbraid' is not null then '(google ads, no utm_source)'
             else '(none)' end)                                       as source,
    coalesce(a.first_touch->>'utm_campaign', '(no campaign)')         as campaign,
    count(distinct a.user_id)::int                                    as accounts,
    count(distinct p.user_id)::int                                    as paying,
    coalesce(sum(coalesce(p.amount_minor, p.amount_inr * 100)), 0)::bigint as revenue_minor
  from attributed a
  left join payments p on p.user_id = a.user_id and p.status = 'SUCCESS'
  group by 1, 2
  order by revenue_minor desc, accounts desc`);

console.log("\nATTRIBUTED REVENUE — FIRST TOUCH (the click that acquired the account)");
if (bySource.length === 0) {
  console.log("  (no attributed accounts)");
} else {
  console.log("  source / campaign".padEnd(52) + "accts  paying  revenue");
  for (const r of bySource) {
    console.log(
      `  ${(r.source + " / " + r.campaign).slice(0, 49).padEnd(52)}` +
      `${String(r.accounts).padEnd(7)}${String(r.paying).padEnd(8)}${inr(r.revenue_minor)}`,
    );
  }
}

// ── 3. Click-identifier coverage ────────────────────────────────────────────
//
// The share carrying a Google click identifier is what would be eligible for
// server-side offline conversion import (ADS-001). A utm-only row is a campaign
// label with no click id, and Google cannot match it to a click.
const [ids] = await q(`
  with ${ATTRIBUTED}
  select
    count(*) filter (where first_touch->>'gclid'  is not null)::int as gclid,
    count(*) filter (where first_touch->>'gbraid' is not null)::int as gbraid,
    count(*) filter (where first_touch->>'wbraid' is not null)::int as wbraid,
    count(*) filter (where first_touch->>'gclid'  is null
                       and first_touch->>'gbraid' is null
                       and first_touch->>'wbraid' is null)::int     as utm_only
  from attributed`);

console.log("\nCLICK-IDENTIFIER COVERAGE (attributed accounts)");
console.log(`  gclid    ${ids.gclid}`);
console.log(`  gbraid   ${ids.gbraid}`);
console.log(`  wbraid   ${ids.wbraid}`);
console.log(`  utm only ${ids.utm_only}   (no click id — not eligible for offline import)`);

// ── 4. First touch vs last touch ────────────────────────────────────────────
//
// A non-zero count here means at least one customer was acquired by one
// campaign and returned through another. It is reported as a COUNT rather than
// reallocated, because deciding which campaign deserves the credit is a
// business decision and not one a report should make silently.
const [touch] = await q(`
  with ${ATTRIBUTED}
  select count(*) filter (
    where coalesce(first_touch->>'utm_campaign', '') is distinct from
          coalesce(last_touch->>'utm_campaign', '')
       or coalesce(first_touch->>'gclid', '') is distinct from
          coalesce(last_touch->>'gclid', '')
  )::int as differing,
  count(*)::int as total
  from attributed`);

console.log("\nFIRST vs LAST TOUCH");
console.log(`  accounts whose last touch differs from their first  ${touch.differing} of ${touch.total}`);

// ── 5. Landing pages ────────────────────────────────────────────────────────
const landings = await q(`
  with ${ATTRIBUTED}
  select coalesce(first_touch->>'landingPath', '(unknown)') as path,
         count(*)::int as accounts
  from attributed group by 1 order by 2 desc limit 10`);

console.log("\nTOP ATTRIBUTED LANDING PAGES");
if (landings.length === 0) console.log("  (none)");
for (const l of landings) console.log(`  ${l.path.padEnd(46)}${l.accounts}`);

// ── 6. What is excluded, and what is simply not visible ─────────────────────
//
// Printed every run, not filed in a document, because the number above is
// misleading without it and the two must not become separable.
const [ex] = await q(`
  select
    count(*) filter (where status <> 'SUCCESS')::int as non_success_payments,
    count(*) filter (where status = 'SUCCESS'
                       and metadata->>'autopay' = 'true')::int as autopay_success
  from payments`);

console.log("\nEXCLUDED FROM THE REVENUE ABOVE");
console.log(`  payments not in SUCCESS (pending, failed, cancelled)   ${ex.non_success_payments}`);
console.log(`  AutoPay renewals inside SUCCESS revenue                ${ex.autopay_success}`);
console.log("    ^ recurring debits with no ad click of their own (ADS-008). They are");
console.log("      genuine revenue from an attributed customer, so they are INCLUDED in");
console.log("      the totals above; they are listed here so a renewal-heavy figure is");
console.log("      never mistaken for new ad-driven business.");

console.log("\nCOVERAGE CAVEATS — this report UNDER-counts, by construction");
console.log("  · Accounts created before M60 shipped carry no attribution row at all.");
console.log("  · A visitor who declined advertising measurement is never attributed,");
console.log("    even if an ad genuinely brought them. Consent is the gate, by design.");
console.log("  · A visitor who cleared storage between landing and signing up is lost.");
console.log("  · Invited teammates are correctly unattributed — they were not acquired");
console.log("    by an ad, and the endpoint is only reached on the self-serve signup path.");
console.log("  · Campaign labels are self-reported by the browser. The POPULATION is");
console.log("    server-truth (real accounts, real payments); the LABELS are not.");
console.log("\n  This report is NOT Google Ads' own conversion count and cannot be");
console.log("  reconciled to it line by line without offline conversion import (ADS-001,");
console.log("  which additionally needs Google Ads API credentials — operator-side).");

await client.end();
