# RepMail Engineering Handoff

**For:** New engineers joining the RepMail project  
**Verified against:** commit `cd04db8` (2026-06-17) — see AUDIT_TRAIL.md Audits 015–018  
**Detailed reference:** `REPMAIL_ENGINEERING_HANDOFF.md` — full schema, security design, SNS, queue worker, cleanup jobs, AI governance

---

## What RepMail Is

RepMail is a B2B email campaign platform for sales teams. Administrators create user accounts, allocate sending credits, and users send direct-outreach campaigns to imported contact lists. It is not a newsletter tool. Key characteristics: per-email credit billing, BullMQ async queue with inline fallback when Redis is unavailable, full SES delivery telemetry (bounce/complaint/open/click), and a three-tier org hierarchy (ROOT_ADMIN → SUB_ADMIN → USER).

---

## Local Setup

```bash
git clone https://github.com/AKSINGH-0704/Let-sZero.git
cd Let-sZero
npm install
npm run dev
```

No database, Redis, or AWS credentials needed. An in-memory storage shim handles everything locally. A `ROOT_ADMIN` account is created automatically on first boot. Server starts at `http://localhost:5000`.

---

## Production Stack

| Layer | Technology |
|:------|:-----------|
| Runtime | Node.js ESM + Express 4 |
| Database | PostgreSQL via Drizzle ORM (`DATABASE_URL`) |
| Queue | BullMQ 5.x over IORedis (`REDIS_URL`) |
| Email delivery | Nodemailer → AWS SES SMTP (NOT AWS SDK) |
| Delivery events | AWS SNS → `POST /api/webhooks/ses` |
| AI features | OpenAI GPT-4o / GPT-4o-mini (plan-tiered) |
| Payments | **Razorpay only** (INR). Stripe is fully removed. |
| Deployment | Railway — single Node.js process + PostgreSQL + Redis services |

---

## Current State (commits through `cd04db8` — 2026-06-17)

**Financial integrity (commit `ecb1331` — FIN-1/FIN-2):**
- `completePayment` race eliminated: `.returning({ id })` on the payment UPDATE gates credit allocation on whether THIS caller transitioned `PENDING → SUCCESS`. Concurrent webhook + /verify callers cannot both allocate credits.
- `allocateCredits` race eliminated: balance check moved into the transaction as a conditional WHERE clause, matching the proven pattern of `deductCreditAtomic`. Concurrent allocations cannot overdraw the parent balance.

**Authentication hardening (commit `a279203` — B-PL-2):**
- `app.set("trust proxy", 1)` added to `server/index.js` before any middleware. loginLimiter (5 req/15 min) now keys on the real client IP from `X-Forwarded-For` rather than Railway's proxy IP.

**Payments (commit `f7f892e`):**
- Razorpay-only checkout: `POST /api/payments/initiate` → frontend modal → `POST /api/payments/razorpay/verify` → webhook `POST /api/webhooks/razorpay`
- `server/razorpayWebhook.js`: HMAC-SHA256 signature verification, `order.paid` → credit fulfillment, `payment.failed` handling, dispute logging; registered before `express.json()` in `server/index.js`

**Campaign execution parity (commit `826aa25` — GAP-1):**
- `executeCampaign` (inline fallback path) now has full parity with `processCampaign` (BullMQ path): `sendPaused` pre-check, `senderHealth` auto-pause, `sendWithRetry` integration, PAUSED terminal-state guard
- `sendWithRetry` exported from `worker.js` and imported by `routes.js`

**Security hardening (commits `71c0241`, `47e0d49`):**
- `mustResetPassword` enforced server-side in `authMiddleware` (routes.js:115); **correct** exempt paths: `/api/auth/me`, `/api/auth/reset-password`, `/api/auth/logout` (B-1 fix: was wrongly `change-password`)
- Global send pause checked pre-loop in both `worker.js` and `routes.js executeCampaign`
- Sender profile gate: `senderName + senderCompany` required before AI template generation (GAP-6)
- Invite accept checks inviter's plan member limit before creating user

**AI system (commit `f69b4ab`):**
- 6 campaign type preambles: `b2b_outreach`, `real_estate`, `recruitment`, `partnership`, `follow_up`, `general`
- 4 tones: professional, friendly, formal, casual
- Sender identity block in generation prompt; `real_estate` suppresses company/title from sign-off
- Model tiering: enterprise/scale/growth → `gpt-4o`; others → `gpt-4o-mini`

**Suppression visibility (commits `a6c25bf`, `379006a`):**
- `Suppressions.jsx`: full page at `/app/suppressions` — searchable/filterable table with source badge (BOUNCE/COMPLAINT/UNSUBSCRIBE/MANUAL), reason text, timestamp
- `GET /api/campaigns/:id`: SUPPRESSED `campaign_emails` records now enriched with `suppressionDetail: { source, reason, suppressedAt, scope }` via `getSuppressionDetailsForEmails()` batch lookup
- Campaign detail modal: Suppression column in Recipients table — source badge + reason + suppressedAt. Falls back to "Unknown suppression source" if no record found.
- Worker and inline `executeCampaign`: detailed suppression logging (scope, source, reason, suppressedAt) via `getSuppressionRecord()`
- New storage functions in both `dbStorage` and `memoryStorage` — no schema changes

**Deliverability hardening (commit `f2b4cfa`):**
- History.jsx false credit warning fixed: `sentEmails < totalEmails` replaced with `totalEmails - sentEmails - failedEmails - skippedEmails > 0` (true credit exhaustion detection). Separate blue banner for suppression-only skips.
- Unsubscribe footer: removed "outreach campaign" bulk-mail framing; first-person personal text only
- AI prompts: reframed from "marketing copywriter" to "personal one-to-one communication"
- Prohibited vocabulary expanded (exclusive, luxury, premium, bonus, grand opening, invitation, etc.)
- Subject validator: `PROMOTIONAL_SUBJECT_RE` pattern + 5 new `PROHIBITED_SUBJECT_STARTERS`

**Deliverability — DNS fix (2026-06-16, manual DNS action):**
- Duplicate `_dmarc.letszero.in` TXT record removed. Was: two records → RFC 7489 permerror → DMARC failed
- Now: one record `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;`
- DKIM enabled and Verified in AWS SES console. Signs with `d=letszero.in` → DMARC alignment passes
- **Post-fix verification confirmed:** Gmail "Show original" — `spf=pass`, `dkim=pass`, `dmarc=pass`

**Deliverability — compliance headers (commit `5b396b9`):**
- `List-Unsubscribe: <URL>` — RFC 2369 header now on every campaign email (was body-only link)
- `List-Unsubscribe-Post: List-Unsubscribe=One-Click` — RFC 8058, enables Gmail one-click unsubscribe button
- `Feedback-ID: {campaignEmailId}:repmail` — Gmail Postmaster Tools complaint tracking
- All three merge into a single `headers` object alongside existing `X-SES-*` headers
- `buildUnsubscribeFooter()` now returns `url` — no duplicate token generation; header and body link share one URL
- `tmp/test-campaign-path.mjs` — production-path test utility that calls `sendCampaignEmail()` directly

**AI quality overhaul (commits `01acd99`, `a03a0f3` — 2026-06-16/17):**
- `CAMPAIGN_TYPE_PREAMBLES`: removed all `SIGN-OFF FORMAT:` lines from all 6 campaign types — was the root cause of "Best regards, repmail, complimentary lance, letszero" output
- `senderIdentityBlock`: rewritten to explicitly prohibit greeting phrases before `{{sender_name}}` placeholder block; CRITICAL placeholder preservation rule added
- `generateTemplate` system prompt: SUBJECT LINE RULES (3-7 words, lowercase preferred), PROHIBITED OPENING PHRASES (13 banned clichés), PROHIBITED SIGN-OFF PHRASES (10 banned closings), BODY RULES (120 word limit, 3 paragraphs), OUTPUT RULES (anti-leakage, JSON-only, CRITICAL PLACEHOLDER RULE)
- `max_tokens`: 1200 → 900
- `validateTemplate` Step 10: `LEAKED_INSTRUCTION_RE` hard-block; Step 11: `SIGNOFF_PHRASE_RE`; Step 12: `FILLER_OPENER_RE`; Steps 13–15: marketing buzzwords, weak CTA, body filler phrases
- `validateSenderProfile()` exported — warns on platform names, all-caps, email-in-name-field, suspicious titles
- SNS Click handler: unsubscribe link clicks excluded from `clickedEmails` metric
- **20-sample live quality audit (Audit 018):** 0/20 hard blocks, 0/20 sign-off leaks, 0/20 instruction leaks, 20/20 placeholder preservation confirmed

**Campaign UX fixes (commit `cd04db8` — 2026-06-17):**
- `ProgressTracker.jsx`: reads `currentCampaign.skippedEmails` (previously never read)
  - Progress bar: `(sentEmails + failedEmails + skippedEmails) / totalEmails` — completed campaigns show 100%
  - 4th stat tile: "Skipped" on completed campaigns, true "Pending" during running campaigns
  - Credit-exhaustion alarm: removed false condition; suppression skips show blue info banner; truly unprocessed contacts show yellow warning
  - Email status log: uses `currentCampaign.campaignEmails` real records with per-contact SUPPRESSED + source reason
- `History.jsx`:
  - Reach Rate = (sent + skipped) / total (was sent / total)
  - Detail modal: Sent/Failed/Skipped/Total stats row; credits consumed; 4-col engagement (Reach Rate + Delivery Rate + Open Rate + Click Rate)
  - "did not complete all contacts" replaces "account ran out of credits" for unprocessed-contacts message
- `CampaignConfirmation.jsx`: suppression helper text + "After Campaign (est.)" label
- `Profile.jsx`: sender identity format guide with good example and naming warnings

---

## Current Priorities

**No further feature or architecture work.** RepMail is VERIFIED IN PRODUCTION as of 2026-06-20.

**Completed order:**
1. ~~Confirm Railway deployed commits `a6c25bf` + `f2b4cfa` + `379006a`~~ *(DONE)*
2. ~~Send one test email to Gmail — confirm `dmarc=pass`~~ *(DONE — `spf=pass dkim=pass dmarc=pass` confirmed 2026-06-16)*
3. ~~Add RFC compliance headers~~ *(DONE — `5b396b9`)*
4. ~~AI quality overhaul~~ *(DONE — commits `01acd99`, `a03a0f3`)*
5. ~~Campaign UX fixes~~ *(DONE — commit `cd04db8`)*
6. ~~Startup schema integrity check + migration scripts~~ *(DONE — `5a604be`, `cab8bb9` — see Audit 019)*
7. ~~T-1 through T-5 production verification~~ *(DONE — 2026-06-20 — see Audit 020)*
   - **Defect found and fixed during verification:** SNS bounce/complaint lookup bug — commit `fc8341a`
   - T-1 (SES send + delivery): PASS
   - T-2 (bounce + suppression): PASS
   - T-3 (complaint + suppression): PASS
   - T-4 (unsubscribe + future skip): PASS
   - T-5 (APP_URL + links + hostname): PASS

**Remaining (non-blocking):**
- Execute Free Plan deployment runbook (see section below) — requires `FREE_PLAN_ENABLED=true` in Railway
- Confirm Gmail inbox placement for production sends (Primary / Promotions / Spam)

**~~IMMEDIATE CHECK:~~** *(RESOLVED)* Commit `a6b0f65` `free_credits_used`/`free_credits_reset_at` column error was encountered in production (`[INACTIVITY JOB] Fatal error: column "free_credits_used" does not exist`) and resolved via `npm run db:push -- --force`. Columns exist in production DB.

All gaps from the AI & production audit are resolved. The remaining items are from the final production-readiness audit (2026-06-10/11). Ordered by risk.

**~~1. I-2 — validateTemplate placeholder hard-block~~** *(RESOLVED — commit 306b391)*

`PLACEHOLDER_IN_SUBJECT` and `PLACEHOLDER_IN_BODY` are now hard blocks. Unknown `{{...}}` tags halt generation and trigger quota refund. Valid merge tags (`{{name}}`, `{{company}}`, `{{sender_name}}`, etc.) pass through for send-time substitution. 9/9 verification cases pass.

**~~2. I-5 — SNS_TOPIC_ARN startup enforcement~~** *(RESOLVED — commit f434b21)*

Fail-open `&&`-shortcircuit replaced with two explicit guards: `if (!expectedTopicArn) → 503` (fail-closed) then `if (TopicArn !== expectedTopicArn) → 403`. Startup check elevated from `console.warn` to `console.error`. 6/6 verification cases pass.

**~~SNS production configuration~~** *(VERIFIED IN PRODUCTION — 2026-06-11)*

SNS topic `repmail_events` confirmed existing. `SNS_TOPIC_ARN` added to Railway. HTTPS subscription `https://www.letszero.in/api/webhooks/ses` created and auto-confirmed. Railway logs: `[SNS] Subscription confirmed — HTTP 200`. SES → SNS → RepMail pipeline connected and live. SES Configuration Set event destination remains to be verified via first T-2 bounce event.

**~~0. O-2 — Invite token TTL verification~~** *(VERIFIED SAFE — 2026-06-11)*

`expiresAt NOT NULL` in schema. 7-day TTL written on every create and resend. Expiry enforced independently on both `/api/invites/validate` and `/api/invites/accept`. Single-use via `acceptedAt`. No code changes required.

**~~1. I-3 — Mid-loop sendPaused re-check~~** *(RESOLVED — commit 8eabc8a)*

Both `processCampaign` (worker.js) and `executeCampaign` (routes.js) now re-read `users.send_paused` from the DB at every 50th contact boundary, immediately after the existing global-pause re-check. If found true, campaign transitions to `PAUSED` with `reason=sender_paused_mid_loop`. Worst-case sends after a pause event reduced from N−1 to 49.

**~~2. I-4 — Inline-path isRetry duplicate-send guard~~** *(RESOLVED — commit bf17c19)*

`executeCampaign` now has full retry parity with `processCampaign`: `hasAnySentEmails` + `isRetry` computed once before the loop; `canStartCampaign` skipped on retry; per-contact `getCampaignEmailByContact` guard skips SENT, SUPPRESSED, BOUNCED, COMPLAINED, and permanently-FAILED contacts. Direct port of proven worker.js logic — no new storage methods.

---

## Resolved Gaps (for reference)

| Gap | Resolution | Commit |
|---|---|---|
| GAP-1: executeCampaign parity | sendPaused + senderHealth + sendWithRetry + PAUSED guard | 826aa25 |
| GAP-2: getPreCampaignSuppressionCount N+1 | inArray batch query | 217bebc |
| GAP-3: getContactById N+1 in send loop | getContactsByIds batch method | e9f8554 |
| GAP-5: Single free-text AI intake | 7-field structured intake | earlier session |
| GAP-6: Sender profile gate | senderName + senderCompany required | 1b89a3f |
| I-2: Placeholder hard-block | PLACEHOLDER_IN_SUBJECT + PLACEHOLDER_IN_BODY | 306b391 |
| I-3: Mid-loop sendPaused re-check | getUserById every 50 contacts; PAUSED + audit log | 8eabc8a |
| I-4: Inline executor retry guard | hasAnySentEmails + isRetry + per-contact skip; credit check skip on retry | bf17c19 |
| I-5: SNS fail-closed enforcement | Explicit two-guard pattern; startup error | f434b21 |
| B-1: mustResetPassword exempt path | reset-password (not change-password) | 71c0241 |
| B-PL-2: loginLimiter proxy bypass | trust proxy = 1 | a279203 |
| FIN-1: completePayment double-credit | .returning() gates credit allocation | ecb1331 |
| FIN-2: allocateCredits over-allocation | atomic balance WHERE clause | ecb1331 |

---

## Free Plan — Implemented, Pending Production Verification

| Item | Status |
|:-----|:-------|
| Architecture | Finalized — Audit 011 |
| Implementation | Complete — Audit 012 (2 bugs found and fixed during verification) |
| `db:push` | NOT YET RUN |
| Feature flag | `FREE_PLAN_ENABLED` — NOT YET SET in Railway |
| Backfill | NOT YET RUN |
| Production verification | Blocked on T-1 through T-5 first |

**Deployment sequence (do not skip steps or reverse order):**
1. Complete T-1 through T-5 production verification
2. `npm run db:push` — adds `free_credits_used`, `free_credits_reset_at` columns (additive, safe)
3. Deploy current branch
4. Set `FREE_PLAN_ENABLED=true` in Railway env vars
5. Run backfill SQL: `UPDATE users SET is_trial_user = false WHERE plan = 'free' AND is_active = true;`
6. Verify: send one campaign as free plan user, confirm `credit_transactions` row with `type='free_usage'`

**Rollback (instant, no redeploy):**
- Set `FREE_PLAN_ENABLED=false`
- `UPDATE users SET is_trial_user = true WHERE plan = 'free' AND is_active = true;`

**Key architecture facts:**
- Two new columns only: `free_credits_used` (INTEGER DEFAULT 0) + `free_credits_reset_at` (TIMESTAMP NULL)
- Monthly grant derived at runtime from `MONTHLY_CREDITS[plan]` — not stored per-user
- Lazy refresh: fires on first credit-touching request after month boundary (WHERE clause guard, idempotent)
- Deduction order: free first, paid fallback, legacy trial last
- `isTrialUser=false` → free plan path; `isTrialUser=true` → legacy trial (5 credits)
- New users get `isTrialUser` derived from env, not DB default

**Bug fixes applied during verification (Audit 012):**
- `updateUser` now passes `freeCreditsUsed` and `freeCreditsResetAt` (Bug 1 — critical, silent drop)
- `createUser` now derives `isTrialUser` from `FREE_PLAN_ENABLED` env var (Bug 2 — new users on wrong path)

---

## Free Plan Deployment Runbook

Execute in this exact order. Do not proceed to the next step if the current step's verification fails.

### STEP 0 — IMMEDIATE: Check if `a6b0f65` is already deployed

Commit `a6b0f65` references `free_credits_used` and `free_credits_reset_at` in the Drizzle schema. If Railway auto-deployed it and `db:push` has not been run, all user queries are failing.

**Check Railway logs for:** `ERROR: column "free_credits_used" does not exist`

If present → run Step 2 (`db:push`) immediately before anything else.

---

### STEP 1 — Pause Railway auto-deploy

Railway dashboard → service → Settings → Source → disable auto-deploy.

Prevents a future git push from deploying mid-sequence.

---

### STEP 2 — `db:push`

Adds two columns to production `users` table. Zero downtime (catalog-only, no row rewrite).

```bash
# Option A: local with production DATABASE_URL
DATABASE_URL="postgres://..." npm run db:push

# Option B: Railway CLI
railway run npm run db:push
```

**Verify:**
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('free_credits_used', 'free_credits_reset_at');
```
Expected: 2 rows. `free_credits_used`: NOT NULL, default 0. `free_credits_reset_at`: nullable, no default.

---

### STEP 3 — Deploy code (Railway redeploy)

If `a6b0f65` not yet live: Railway dashboard → Deploy → Redeploy, or re-enable auto-deploy.

**Wait for deploy.** Confirm:
```bash
curl https://www.letszero.in/api/health
# Expected: {"status":"ok","smtp":"verified","worker":"running",...}
```

Downtime: ~30–60 seconds (Railway process restart).

---

### STEP 4 — Set `FREE_PLAN_ENABLED=true`

Railway dashboard → Variables → add `FREE_PLAN_ENABLED = true`.

Railway auto-redeploys on env var changes. Wait for redeploy, re-confirm health endpoint.

Downtime: ~30–60 seconds.

At this point: new users get `isTrialUser=false`. Existing users still have `isTrialUser=true` — no behavior change for them until Step 6.

---

### STEP 5 — Pre-backfill audit

```sql
-- Record baseline before backfill
SELECT plan, is_trial_user, COUNT(*)
FROM users WHERE is_active = true
GROUP BY plan, is_trial_user ORDER BY plan;

-- Confirm column defaults
SELECT COUNT(*) AS total,
  SUM(CASE WHEN free_credits_used = 0 THEN 1 ELSE 0 END) AS at_zero,
  SUM(CASE WHEN free_credits_reset_at IS NULL THEN 1 ELSE 0 END) AS null_reset
FROM users WHERE plan = 'free' AND is_active = true;
-- Both at_zero and null_reset should equal total
```

Save the count of `plan='free', is_trial_user=true` — this is the rollback verification number.

---

### STEP 6 — Backfill

```sql
UPDATE users
SET is_trial_user = false
WHERE plan = 'free' AND is_active = true;
```

**Verify immediately:**
```sql
-- Should match the count from Step 5
SELECT COUNT(*) AS converted FROM users
WHERE plan = 'free' AND is_active = true AND is_trial_user = false;

-- Must be 0
SELECT COUNT(*) AS remaining FROM users
WHERE plan = 'free' AND is_active = true AND is_trial_user = true;
```

---

### STEP 7 — Post-deploy verification

```
[ ] GET /api/health → status:"ok"
[ ] GET /api/credits/info (free user) → isFreePlan:true, free:500, total:500, freeResetDate set
[ ] GET /api/pricing/plans → "trial" plan NOT in response
[ ] Dashboard: free credit section visible (X/500, progress bar, reset date)
[ ] Send 1-contact campaign as free user → COMPLETED
[ ] SELECT type, amount FROM credit_transactions WHERE user_id='<id>' ORDER BY created_at DESC LIMIT 5
      → type='free_monthly_grant' and type='free_usage' both present
[ ] SELECT free_credits_used, free_credits_reset_at FROM users WHERE id='<id>'
      → free_credits_used=1, free_credits_reset_at IS NOT NULL
[ ] Paid user: GET /api/credits/info → isFreePlan:false, free:0
[ ] Paid user campaign → credit_transactions type='usage' (not 'free_usage')
```

---

### ROLLBACK

**Before Step 6 (backfill not run):**
```bash
# Railway dashboard: set FREE_PLAN_ENABLED=false (triggers redeploy)
# No SQL needed — columns exist but are never written with flag off
```

**After Step 6 (backfill ran):**
```sql
-- Immediate
UPDATE users SET is_trial_user = true
WHERE plan = 'free' AND is_active = true;
```
```bash
# Railway: set FREE_PLAN_ENABLED=false
```
```sql
-- Verify
SELECT COUNT(*) FROM users
WHERE plan = 'free' AND is_active = true AND is_trial_user = true;
-- Must match the Step 5 baseline count
```

Full revert restores 100% of prior behavior. No code rollback needed. Columns remain harmlessly in DB.

---

## Explicit Non-Goals

Architectural decisions made deliberately. Do not implement without team discussion.

| Non-Goal | Reason |
|:---------|:-------|
| Per-contact OpenAI generation | 1 API call per recipient = unacceptable cost at scale |
| One AI call per email send | Same as above |
| Re-introducing Stripe | Razorpay is the only payment gateway |
| Breaking database migrations | Schema changes must be backward-compatible; use `drizzle-kit push` |
| Materially increasing OpenAI spend | All AI must be single-call per user action |
| Per-contact personalization via AI | Single template generation per campaign, period |

---

## Key Files

| File | Purpose |
|:-----|:--------|
| `server/index.js` | Entry point, startup recovery, worker init, cleanup job registration |
| `server/routes.js` | All API routes + `executeCampaign()` inline fallback |
| `server/worker.js` | BullMQ campaign worker (`processCampaign`) |
| `server/storage.js` | PostgreSQL storage layer (production) |
| `server/memoryStorage.js` | In-memory dev shim (must mirror `storage.js` interface) |
| `server/ai.js` | OpenAI integration (generateTemplate, generatePreviews, analyzeSpam) |
| `server/email.js` | Nodemailer transport, `sendCampaignEmail`, unsubscribe footer |
| `server/sns.js` | SNS signature verification + event dispatcher |
| `server/razorpayWebhook.js` | Razorpay HMAC-SHA256 webhook handler |
| `server/gateways.js` | Payment gateway abstraction (Razorpay only) |
| `shared/schema.js` | Drizzle tables + Zod schemas + all constants (plan limits, AI quotas, credit tiers) |

---

## Production Environment Variables

| Variable | Required | Description |
|:---------|:--------:|:------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `SES_SMTP_HOST` / `SES_SMTP_USER` / `SES_SMTP_PASS` | Yes | AWS SES SMTP credentials |
| `SES_FROM_EMAIL` / `SES_FROM_NAME` | Yes | Sender identity |
| `SES_CONFIGURATION_SET` | Yes | AWS config set name (enables open/click tracking) |
| `SNS_TOPIC_ARN` | Yes | Restricts webhooks to known SNS topic |
| `OPENAI_API_KEY` | Yes | GPT-4 access |
| `SESSION_SECRET` | Yes | Express session signing key |
| `APP_URL` | Yes | Production URL (used in unsubscribe footer links) |
| `REPMAIL_PUBLIC` | Yes | Must be `"true"` to enable full API in production |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Yes | Razorpay credentials |
| `RAZORPAY_WEBHOOK_SECRET` | Yes | Razorpay webhook HMAC secret |
| `RECOVERY_EMAIL` | Yes | Emergency recovery contact |
| `SES_RATE_PER_SECOND` | No | Default `14` — must match SES account limit |
| `SES_SEND_RATE_MS` | No | Fallback sleep when Redis is unavailable |
| `BOUNCE_RATE_PAUSE_THRESHOLD` | No | Default `0.15` — **set to `0.08` in Railway (2026-06-11)** |
| `COMPLAINT_RATE_PAUSE_THRESHOLD` | No | Default `0.005` — **set to `0.001` in Railway (2026-06-11)** |
| `AUDIT_LOG_RETENTION_DAYS` | No | Default `180` |
| `CAMPAIGN_EMAIL_RETENTION_DAYS` | No | Default `90` |

---

## Commands

```bash
npm run dev        # Development with HMR + in-memory storage
npm run build      # Production build: Vite → dist/public/ + esbuild → dist/index.cjs
npm run start      # Production server
npm run db:push    # Push Drizzle schema to PostgreSQL — dev/emergency use only
npm run db:generate  # Generate SQL migration files from schema changes (creates migrations/)
npm run db:migrate   # Apply pending migration files to the target database
npm run check      # TypeScript type check

# Pre-deployment parity check (run before every Railway deploy):
railway run node scripts/check-schema-parity.mjs
```

**Deployment workflow (migration-first):**
1. Edit `shared/schema.js`
2. `npm run db:generate` → SQL file created in `migrations/`
3. Review the generated SQL
4. `railway run node scripts/check-schema-parity.mjs` → verify prod DB matches spec
5. Deploy to Railway — `runSchemaCheck()` verifies columns on boot, exits 1 if mismatch

**Note:** `migrations/` directory does not yet exist. Run `npm run db:generate` once to bootstrap the migration baseline from the current schema before using `db:migrate`.

---

## Related Documents

| Document | Purpose |
|:---------|:--------|
| [REPMAIL_ENGINEERING_HANDOFF.md](./REPMAIL_ENGINEERING_HANDOFF.md) | Deep technical reference — complete schema, SNS design, queue worker sequence, AI governance, security rules, cleanup jobs |
| [PROGRESS.md](./PROGRESS.md) | Launch readiness tracker — milestone status (D/I/O/V evidence), launch blockers, verification log |
| [AUDIT_TRAIL.md](./AUDIT_TRAIL.md) | Append-only audit log — all code reviews, security audits, documentation sync sessions with findings |
| [README.md](./README.md) | Architecture overview, system design, engineering principles |

## Detailed Reference

See `REPMAIL_ENGINEERING_HANDOFF.md` for:
- Complete database schema (all tables, columns, indexes)
- SNS signature verification + 4-step idempotency design
- Queue worker execution sequence (step-by-step)
- Startup recovery logic
- Cleanup job architecture and overlap prevention
- AI quota governance and cost model
- Security hardening decisions and fail-open/closed table
- Known gaps and proposed implementations
