# RepMail — Day-0 Production Baseline

**Captured:** 2026-06-21  
**Deployment ID:** `f7c2faa8`  
**Git commit:** `08b6297`  
**Branch:** `main`  
**Production URL:** https://www.letszero.in  
**Baseline event:** Free Plan activation (`FREE_PLAN_ENABLED=true` set, backfill complete)

> This document is the immutable Day-0 baseline. Do not edit after creation.  
> Future audits compare current production state against these numbers.

---

## 1. Deployment State

| Field | Value |
|-------|-------|
| Railway project | `friendly-possibility` (`77657dd9`) |
| Railway service | `Let-sZero` (`516fd6cb`) |
| Deployment ID | `f7c2faa8` |
| Git commit | `08b6297` |
| Branch | `main` |
| Region | US West |
| Production URL | https://www.letszero.in |
| Health at capture | `status: ok` |
| `FREE_PLAN_ENABLED` | `true` |
| `REDIS_ENABLED` | `true` |
| Razorpay mode | **LIVE** (`rzp_live_SzH2Nf9W3RRY1L`) |
| Google OAuth | Disabled (env vars not set) |

---

## 2. Users

| Metric | Count |
|--------|-------|
| Total users | 5 |
| Free plan users (`plan=free`) | 2 |
| Enterprise users (`plan=enterprise`) | 3 |
| Paid plan users (starter/growth/scale) | 0 |
| Inactive users | 0 |
| Users on Free Plan path (`is_trial_user=false`) | 2 |
| Users on legacy trial path (`is_trial_user=true`) | 3 |

**Per-user breakdown:**

| Username | Plan | Role | `is_trial_user` | Paid balance |
|----------|------|------|-----------------|-------------|
| admin | enterprise | ROOT_ADMIN | true | 89,969 |
| Aksingh | enterprise | SUB_ADMIN | true | 5,000 |
| Krishna | enterprise | SUB_ADMIN | true | 5,000 |
| Abhishek | free | SUB_ADMIN | false | 0 |
| epsteindapuccy_5vu7 | free | USER | false | 499 |

> **Context:** All 5 users are internal team/test accounts. No external customers at Day-0.

---

## 3. Credits

| Metric | Value |
|--------|-------|
| Total credits received (all users) | 110,500 |
| Total credits allocated (parent → child) | 10,000 |
| Total credits used (emails sent) | 32 |
| **Total paid balance outstanding** | **100,468** |
| Monthly free capacity (2 free users × 500) | 1,000 /month |
| Legacy trial credits remaining (3 enterprise users) | 25 |

**Credit pool breakdown:**

| Pool | Balance | Notes |
|------|---------|-------|
| Paid pool (all users) | 100,468 | Ledger: received − allocated − used |
| Free pool (monthly) | 500/user/month | Lazy refresh; not yet triggered at Day-0 |
| Legacy trial (enterprise users) | 25 | isTrialUser=true; not used in production send path |

---

## 4. Campaigns

| Metric | Value |
|--------|-------|
| Total campaigns | 14 |
| Completed | 14 |
| Running | 0 |
| Draft | 0 |
| Failed | 0 |
| **Total emails targeted** | 44 |
| **Total emails sent** | 32 |
| Total emails failed | 4 |
| Total emails skipped (suppressed) | 8 |
| Total emails opened | 9 |
| Total emails clicked | 1 |
| Total emails bounced | 1 |
| Total emails complained | 1 |
| Total emails delivered (SES-confirmed) | 17 |
| Total credits consumed by campaigns | 32 |

> **Important:** All 14 campaigns are internal verification and test campaigns. No real customer campaigns at Day-0. Metrics reflect test-only behavior.

---

## 5. Delivery Rates

Calculated on 32 emails sent. **Sample size is too small for production significance.**  
These numbers will be meaningful only after the first 100+ real customer campaigns.

| Rate | Value | Notes |
|------|-------|-------|
| Open rate | 28.13% (9/32) | Test accounts; not representative |
| Click rate | 3.13% (1/32) | Test accounts; not representative |
| Bounce rate | 3.13% (1/32) | 1 test bounce (SES sandbox) |
| Complaint rate | 3.13% (1/32) | 1 test complaint |
| Delivery rate (SES-confirmed) | 53.13% (17/32) | SES delivery events only; does not mean undelivered |

> **Benchmark targets for real customer traffic (industry averages for cold outreach):**  
> Open: ≥ 20% · Click: ≥ 2% · Bounce: ≤ 2% · Complaint: ≤ 0.08%

---

## 6. Suppressions

| Category | Count |
|----------|-------|
| **Total suppressions** | **6** |
| Bounced | 1 |
| Complained | 1 |
| Unsubscribed | 4 |
| Manual | 0 |

---

## 7. SNS Events

Total events received and deduplicated in `sns_events` table.

| Event type | Count |
|------------|-------|
| `send` | 22 |
| `delivery` | 19 |
| `deliverydelay` | 11 |
| `open` | 10 |
| `bounce` | 3 |
| `complaint` | 2 |
| `click` | 1 |
| **Total** | **68** |

| Processing state | Count |
|-----------------|-------|
| Processed | 33 |
| Unprocessed | 35 |

> `deliverydelay` events are normal for SES (temporary delays before final delivery). Unprocessed events are deduplicated but not acted on (idempotency table entries).

---

## 8. Payments

| Metric | Value |
|--------|-------|
| Total payment records | 3 |
| Successful payments | 3 |
| Failed payments | 0 |
| Pending payments | 0 |
| **Total INR collected** | **₹0** |
| Total credits purchased via payment | 1,500 |

> **Context:** All 3 payments were free trial claims (`planId=trial`, ₹0, 500 credits each).  
> No real paid transactions at Day-0. Revenue = ₹0.  
> The GAP-1 fix (one-time atomic trial claim) is now in place — further trial farming is blocked.

---

## 9. Contacts & Templates

| Table | Count |
|-------|-------|
| Contacts | 13 |
| Templates | 0 |

---

## 10. Credit Transactions

| Type | Count |
|------|-------|
| Total transactions | 36 |
| `purchase` | 0 |
| `usage` (email sent) | 32 |
| `allocation` | 0 |
| `free_monthly_grant` | 0 |

> No `free_monthly_grant` transactions at Day-0 — the free credit lazy refresh has not yet fired for any user (first campaign will trigger it).

---

## 11. SES Quota

| Field | Value |
|-------|-------|
| SES region | `eu-north-1` |
| SMTP endpoint | `email-smtp.eu-north-1.amazonaws.com:587` |
| SES account mode | **Production** (out of sandbox) |
| Sending quota | Verify via AWS SES Console → Sending statistics |
| Max send rate | Verify via AWS SES Console |
| DKIM status | Verified (letszero.in) |
| SPF status | Verified |
| DMARC policy | `p=quarantine` |
| Configuration set | `my-first-configuration-set` |

> SES sending quotas are not accessible from the application DB. Check the AWS Console → SES → Account dashboard for current daily limit and max send rate. Monitor before any high-volume campaigns.

---

## 12. Infrastructure State

| Component | Status |
|-----------|--------|
| PostgreSQL | Connected (`railway` internal) |
| Redis | Connected |
| BullMQ worker | Running (concurrency=3) |
| SMTP | Verified |
| SNS webhook | Active (`/api/webhooks/ses`) |
| Schema integrity | 14 tables, 60 columns, 6 indexes |
| Pending migrations | None |

---

## 13. Active Feature Flags

| Flag | Value | Effect |
|------|-------|--------|
| `FREE_PLAN_ENABLED` | `true` | Free users get 500 credits/month; new users created with `isTrialUser=false` |
| `REPMAIL_PUBLIC` | `true` | Public access enabled |
| `GOOGLE_CLIENT_ID` | not set | Google OAuth disabled |
| `RECOVERY_EMAIL` | not set | Emergency admin recovery disabled |

---

## 14. How to Compare Against This Baseline

Run the following query against current production to generate comparable numbers:

```sql
-- Users
SELECT plan, is_trial_user, COUNT(*)::int FROM users
GROUP BY plan, is_trial_user ORDER BY plan;

-- Credits
SELECT
  SUM(credits_received)::int AS received,
  SUM(credits_used)::int AS used,
  SUM(credits_received - credits_allocated - credits_used)::int AS outstanding
FROM users;

-- Campaigns (since Day-0)
SELECT COUNT(*)::int AS total, SUM(sent_emails)::int AS sent
FROM campaigns WHERE created_at > '2026-06-21'::date;

-- Revenue (since Day-0)
SELECT COUNT(*)::int AS count, SUM(amount_inr)::int AS total_inr
FROM payments WHERE status IN ('SUCCESS','COMPLETED') AND created_at > '2026-06-21'::date;

-- Suppressions (since Day-0)
SELECT source, COUNT(*)::int FROM suppressions
WHERE created_at > '2026-06-21'::date GROUP BY source;
```

---

*Captured by Claude Sonnet 4.6 on 2026-06-21 via live `railway run` queries against production PostgreSQL. All values are exact at time of capture.*
