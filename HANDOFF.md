# RepMail Engineering Handoff

**For:** New engineers joining the RepMail project  
**Verified against:** commit `00a260a` (2026-06-24) through Legal Content Review — see AUDIT_TRAIL.md Audits 015–042  
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

**OPERATIONAL VALIDATION PHASE** — No further feature or architecture work. RepMail is feature-complete and deployed. The focus is now validating end-to-end production workflows with real external actors.

### Phase 15 audit — launch verdict (Audit 032, 2026-06-22)

**Score: 8.5/10 → 9.0/10 after Phase 15.1 (Audit 033) → 9.2/10 after Phase 15.2 (Audit 035) → 9.3/10 after Phase 15.2 Polish (Audit 036) → 9.5/10 after Trust Hardening (Audit 037) → 9.6/10 after Context-Aware Branding (Audit 038).** No CRITICAL findings. No launch blockers. Full report: `PHASE15_OPERATIONAL_VALIDATION_REPORT.md`.

**Team Plan + Pricing consistency (commits `14eaf69`, `d5d05f9`, 2026-06-20 — Audit 039):**
- Team card: billing cadence visible, context-aware CTA, post-purchase activation banner
- Team member limits corrected to schema authority: starter=3, growth=10, scale=25
- Pricing updated ₹129/₹99 (monthly/annual per member); savings badge now dynamic (23% OFF)
- Three hardcoded `TEAM` constant copies updated atomically

**Dedicated IP Coming Soon (commit `64a7f82`, 2026-06-24 — Audit 040):**
- Feature is NOT implemented. `server/email.js` uses shared SMTP — no dedicated IP pool anywhere.
- Card on `/pricing` replaced with captivating feature-preview treatment: pulsing amber "Coming Soon" badge, readable title/icon (not muted to gray), value-first description copy, price at mid-opacity, "Notify me →" CTA with client-side toggle state.
- No backend changes. Notification CTA is UI-only (no email collection wired).

**LetsZero Platform Legal Architecture (commits `0e37843` + `00a260a`, 2026-06-24 — Audits 041–042):**
- `Privacy.jsx` and `Terms.jsx` redesigned as platform-level documents. Previously both were RepMail-specific.
- LetsZero logo (`/letszero-logo.png`) replaces RepMail logo in nav/footer of both pages.
- Privacy: provider categories instead of named vendors; supplemental notice pattern introduced; 12-section TOC.
- Terms: Section 1 establishes multi-product platform context + supplemental terms pattern; Section 4 covers data controller/processor split for B2B users; billing section uses generic pricing model language; 13-section TOC.
- `RepMailPrivacy.jsx` and `RepMailTerms.jsx` untouched — product-specific, correct as-is.
- New products (MessageHub, NotifyStream) add supplemental terms only. Platform docs require no rewrite.
- **Content review fixes applied (Audit 042):** "anomaly detection" removed (overstated); GDPR Art.46 "appropriate safeguards" removed (no SCCs/DPAs exist); em dash removed from Terms; "high-availability" claim removed (no SLA defined); "suppression enforcement" generalized; duplicate account clause clarified.
- **Legal entity standardized (Audit 043):** All legal-facing references corrected from "LetsZero Technologies" to the registered entity name "LetsZero Solutions Private Limited". Affected: Privacy.jsx (3), Terms.jsx (4), RepMailPrivacy.jsx (2), RepMailTerms.jsx (2). Brand references ("© LetsZero", "LetsZero Platform", "LetsZero products") intentionally unchanged — trading name is correct for marketing contexts. Zero residual occurrences of incorrect variant confirmed by grep.
- **Growth & activation hardening (Audit 044):** 13 corrections across 5 files. Key fixes: free plan now displays "Solo account" (backend enforces 0 invitable members); Starter plan team contradiction removed (backend gives 3 slots, copy now says so); "99.9% uptime SLA" regression in Payments.jsx Enterprise Teams card removed; all "Dedicated SLA" claims replaced with "Priority support"; Login.jsx "5 free trial credits" corrected to "500 free monthly credits"; "1 credit = 1 email sent" added to dashboard credit card; CampaignConfirmation.jsx now gates the Send button on `senderName` being set, with amber warning and link to /app/profile.
- **Team Plan commercialization removed — Option B adopted (Audit 045):** Team access is now correctly presented as a bundled plan entitlement, not a separate subscription. The ₹129/member/month pricing calculator, "Most Popular" Team Plan badge, billing toggle, animated monthly cost, and "Choose Your Plan" CTA are all removed. Both PublicPricing.jsx and Payments.jsx Teams tabs now show: (1) plan-capacity rows (Starter 3 / Growth 10 / Scale 25 / Enterprise custom), (2) role capabilities table, (3) "How to activate your team" 4-step card (Purchase → Invite → Allocate → Launch). The `TEAM` constant and all related state (`teamBilling`, `teamUsers`, `animatedTeamTotal`) are removed. `isTeamCapable` now includes "starter" so Starter purchases trigger the team activation banner. Future revisit: 50–100 active customers needing seats beyond tier limits.
- **Ongoing operational commitments carried forward from original docs (no code enforcement — require process):**
  - Account data deleted within 30 days of deletion request (manual process; no automated job)
  - Rights requests answered within 30 days (support inbox tracking required)
  - Material policy changes notified 14 days in advance (mass email capability required)

**Pre-activation hardening (Phase 15.1, commit `39bd09a`, 2026-06-22):**

| ID | Fix | Status |
|----|-----|--------|
| A-1 | `isActive` check in OAuth Passport strategy — blocks inactive users, audit-logged | **DONE** |
| D-1 | Free-plan credits (500) surfaced on dashboard — no misleading "0" state | **DONE** |
| C-1 | `PLAN_UPGRADED` audit log in `upgradePlanIfHigher()` — root + children + grandchildren | **DONE** |
| D-2 | "Complete Sender Profile" CTA button in TemplateBuilder when sender blocked | **DONE** |
| A-2 | `USER_CREATED` audit log in OAuth callback for new users | Low priority — deferred |
| B-1 | `FOR UPDATE` in `checkAndIncrementAiQuota` SELECT | Low priority — deferred |

### Operational validation checklist

| Item | Status | What to do | Success criteria |
|------|--------|-----------|-----------------|
| Phase 15 audit | **COMPLETE** | See Audit 032 | 9.2/10 after Phase 15.2 trust hardening |
| 1. Google OAuth activation | **PENDING** | GCP project setup + set `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in Railway | User can sign in with Google; profile created correctly |
| 2. Razorpay production transaction | **PENDING** | Place a real INR order from a non-admin account | `payments` row status `SUCCESS`; credits allocated; `credit_transactions` row present |
| 3. First external user onboarding | **PENDING** | Invite a real external user (not admin); they sign up and log in | Account created; welcome email received |
| 4. Payment-to-credit allocation flow | **PENDING** | External user purchases credits via Razorpay | Balance updated; history visible in dashboard |
| 5. First campaign from non-admin account | **PENDING** | External user creates + sends a campaign | Campaign completes; SES delivery confirmed; analytics populated |

All five items must pass before RepMail is considered externally validated.

### Phase completion history (for reference)
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
8. ~~Pricing & landing page UX audit~~ *(DONE — 2026-06-20 — commit `b154a04` — see Audit 021)*
   - INR/USD toggle removed (India-first)
   - Slider: 1,000-credit increments, round-up on numeric entry
   - Label contrast fixed ("Enter exact amount", "Total cost")
   - Cost-per-email live in estimator
   - Team card: `/member/month, billed annually`
   - FAQ updated: USD/Stripe references removed
   - Dead code removed (~160 lines)
   - Railway `3767187a` → SUCCESS
9. ~~Phase 10 Final Hardening Audit~~ *(DONE — 2026-06-20 — commit `e392e23` — see Audit 022)*
   - Landing.jsx mobile nav: 5-button overflow on 320–768px fixed (hide low-priority buttons)
   - Payments.jsx Teams tab: `/user/mo`/seats/users → `/member/month`/members (consistency with PublicPricing.jsx)
   - Pricing calculator: all 9 edge cases verified correct — NO CHANGE
   - Team purchase flow: end-to-end functional, welcome banner confirmed — NO CHANGE
   - Production safety: no regressions from fc8341a, 5a604be, b154a04, cd04db8, a03a0f3, 01acd99

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

## Free Plan Activation Runbook ✅ COMPLETE (2026-06-21)

> **Status: FREE_PLAN_ENABLED=true is live in Railway production.**
> All steps below were executed and verified. This runbook is kept for rollback reference only.

Execute in this exact order. Do not proceed to the next step if the current step's verification fails.

### Production state as of 2026-06-21 (verified)

Run before starting to confirm nothing has changed:

```sql
SELECT username, email, plan, role, is_trial_user,
       (credits_received - credits_allocated - credits_used) AS paid_balance,
       free_credits_used,
       free_credits_reset_at
FROM users ORDER BY plan, role;
```

**Expected output (current production, 5 users):**

| username | plan | role | is_trial_user | paid_balance | free_credits_used | free_credits_reset_at |
|----------|------|------|---------------|--------------|-------------------|----------------------|
| admin | enterprise | ROOT_ADMIN | true | 89,969 | 0 | null |
| Aksingh | enterprise | SUB_ADMIN | true | 5,000 | 0 | null |
| Krishna | enterprise | SUB_ADMIN | true | 5,000 | 0 | null |
| Abhishek | free | SUB_ADMIN | true | 0 | 0 | null |
| epsteindapuccy_5vu7 | free | USER | true | 499 | 0 | null |

**Schema columns verified present in production:**

| Column | Type | Default |
|--------|------|---------|
| `free_credits_used` | integer | 0 (NOT NULL) |
| `free_credits_reset_at` | timestamp | null |
| `is_trial_user` | boolean | true |

> **All schema work is done. Steps 2 (`db:push`) is already complete.** Skip directly to Step 1.

---

### STEP 1 — Pause Railway auto-deploy

Railway dashboard → service → Settings → Source → disable auto-deploy.

Prevents a future git push from deploying mid-sequence.

---

### STEP 2 — `db:push` ✅ ALREADY COMPLETE

`free_credits_used` and `free_credits_reset_at` columns exist in production (verified 2026-06-21). Skip this step.

**To confirm if uncertain:**
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('free_credits_used', 'free_credits_reset_at');
-- Must return 2 rows
```

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
```

**Expected result (as of 2026-06-21):**

| plan | is_trial_user | count |
|------|---------------|-------|
| enterprise | true | 3 |
| free | true | 2 |

```sql
-- Confirm free-plan users have no previously spent free credits
SELECT COUNT(*) AS total,
  SUM(CASE WHEN free_credits_used = 0 THEN 1 ELSE 0 END) AS at_zero,
  SUM(CASE WHEN free_credits_reset_at IS NULL THEN 1 ELSE 0 END) AS null_reset
FROM users WHERE plan = 'free' AND is_active = true;
-- Expected: total=2, at_zero=2, null_reset=2
```

**Rollback baseline:** `plan='free', is_trial_user=true` = **2 users**. Save this before running Step 6.

---

### STEP 6 — Backfill

Transitions free-plan users from legacy trial behavior to the free monthly credit path.

**Affects: 2 users** (Abhishek — 0 paid credits, epsteindapuccy_5vu7 — 499 paid credits).
Enterprise users (admin, Aksingh, Krishna) are NOT included: `MONTHLY_CREDITS.enterprise = 0`, so changing their `is_trial_user` has zero functional effect.

```sql
UPDATE users
SET is_trial_user = false,
    updated_at = NOW()
WHERE plan = 'free'
  AND is_active = true;
```

**Verify immediately:**
```sql
-- Must equal 2 (the users converted)
SELECT COUNT(*) AS converted FROM users
WHERE plan = 'free' AND is_active = true AND is_trial_user = false;

-- Must be 0
SELECT COUNT(*) AS remaining FROM users
WHERE plan = 'free' AND is_active = true AND is_trial_user = true;
```

After this step: on the next campaign or credit-check request, each free-plan user will trigger a lazy monthly refresh (`free_credits_used = 0, free_credits_reset_at = NOW()`) and receive 500 credits. No manual credit insertion is needed.

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

**Scenario A — Revert before Step 6 (backfill not yet run):**
```bash
# Railway dashboard → Variables → set FREE_PLAN_ENABLED=false → auto-redeploys
# No SQL needed. Columns exist but the code never touches them when flag is off.
```

**Scenario B — Revert after Step 6 (backfill ran, free credits not yet spent):**
```sql
-- Restore is_trial_user for the 2 free-plan users
UPDATE users
SET is_trial_user = true, updated_at = NOW()
WHERE plan = 'free' AND is_active = true;
```
```bash
# Railway: set FREE_PLAN_ENABLED=false
```
```sql
-- Verify: must return 2
SELECT COUNT(*) FROM users
WHERE plan = 'free' AND is_active = true AND is_trial_user = true;
```

**Scenario C — Revert after free credits were spent (`free_credits_used > 0`):**
```sql
-- Only revert users who have NOT spent free credits yet
-- (users who have spent credits keep their balances; legacy trial path shows 5 credits,
--  but their paid balance is unaffected and will still deduct correctly)
UPDATE users
SET is_trial_user = true, updated_at = NOW()
WHERE plan = 'free' AND is_active = true AND free_credits_used = 0;
```
```bash
# Railway: set FREE_PLAN_ENABLED=false
```

**All scenarios:** No code rollback needed. No columns need to be dropped. Restores 100% of prior behavior for all affected users.

---

## AI Entitlement & Plan Inheritance

### Architecture overview

RepMail has **two completely decoupled resource systems:**

| System | Gating mechanism | Who controls it |
|:-------|:----------------|:----------------|
| Email sending | **Credits** (per-email deduction) | Parent admin allocates to sub-users |
| AI generation | **Plan-based daily quota** | Inherited from account plan tier |

These systems are intentionally separate. A sub-admin with 5 email credits and an unlimited-AI parent plan can draft unlimited AI templates but can only send 5 emails. This is the designed experience — AI is a creativity tool, credits are a consumption cost.

### Daily AI quotas by plan (`shared/schema.js: AI_DAILY_LIMITS`)

| Plan | AI generations/day |
|:-----|:-------------------|
| free | 5 |
| trial | 5 |
| starter | 20 |
| growth | 50 |
| scale | 150 |
| enterprise | Unlimited (Infinity) |

### Sub-user plan inheritance

Sub-users inherit their **parent admin's plan** for AI quota purposes via `getEffectivePlan()` in `server/storage.js`. If a sub-user's own plan is `free` but their parent is `enterprise`, they receive unlimited AI generation — identical to the parent. This is correct and intentional.

The `/api/auth/me` endpoint maps `Infinity → null` before sending to the client. The client checks `user?.aiDailyLimit == null` to display "Unlimited AI usage." The label is accurate — the backend IS enforcing unlimited.

### Enforcement layers

1. **`aiLimiter`** (`routes.js`) — Express rate limiter: 10 AI requests/user/minute (abuse protection)
2. **`checkAndIncrementAiQuota()`** (`storage.js`) — 24-hour rolling counter in `users.aiGenerationsToday` / `users.aiGenerationsResetAt`
3. **`refundAiQuota()`** — Decrements counter on OpenAI failure, so errors don't consume daily quota

All three AI endpoints (`/api/ai/preview`, `/api/ai/spam-analysis`, `/api/ai/generate-template`) use all three layers. Spam analysis additionally serves from cache without quota increment on cache hits.

### Known design considerations (backlog — do not implement without discussion)

**Safety consideration:** Enterprise users receive `Infinity` as their AI limit. There is currently no daily cap on the absolute number of API calls for enterprise accounts — only the rate limiter (10/minute) applies. A future improvement would replace `Infinity` with a very high soft cap (e.g. 5,000–10,000 generations/day) while preserving the customer-facing "Unlimited" experience. This eliminates the theoretical runaway-cost risk without changing the user-visible behavior or plan tiers.

**Per-sub-user AI quota controls (backlog):** Currently all sub-users under the same parent receive the full plan quota with no per-user override. A future enhancement would allow parent admins to assign lower AI limits to individual team members (e.g. cap a sub-user at 10/day even if the parent plan allows 50). This requires a new `aiDailyLimitOverride` column on the users table and a UI in the team management page.

---

## Phase 13 Hardening — Operational Summary (2026-06-21)

### Changes shipped in this phase

| Change | File | Severity addressed |
|--------|------|--------------------|
| Trial credit farming fixed — atomic one-time claim via `isTrialUser` gate | `server/storage.js`, `server/routes.js` | HIGH |
| AI quota inheritance now walks full ancestor chain (grandchild fix) | `server/storage.js` | Medium |
| `PLAN_LIMITS.maxTeamMembers` removed — `MAX_TEAM_MEMBERS` is sole source of truth | `shared/schema.js` | Low |
| `PROFILE_PLAN_LIMITS` corrected in Profile page | `client/src/pages/Profile.jsx` | Low |

### Trial credit farming — HOW IT NOW WORKS

`POST /api/payments/initiate { planId: "trial" }` uses `storage.claimTrialCredits()`, which atomically adds 500 credits AND flips `isTrialUser = false` in a single `UPDATE ... WHERE is_trial_user = true`. If `isTrialUser` is already `false` (already claimed, or made a real payment), the WHERE clause matches 0 rows and the route returns `409 Conflict`. Concurrent requests are safe — PostgreSQL row-level locking ensures only one wins.

### AI quota inheritance — HOW IT NOW WORKS

`getEffectivePlan(userId)` walks the full ancestor chain (visited set prevents cycles):
- USER `plan="free"` → check parent
- SUB_ADMIN `plan="free"` → check grandparent
- ROOT_ADMIN `plan="enterprise"` → return "enterprise"

All descendants of an enterprise root now correctly receive enterprise AI quotas regardless of intermediate chain plan values.

### Free Plan activation checklist (pending)

Before setting `FREE_PLAN_ENABLED=true` in Railway:

1. **Ship GAP-1 trial farming fix** — Done (this phase).
2. **Run backfill:** `UPDATE users SET is_trial_user = false WHERE plan = 'free' AND credits_received = 0;` (in `railway run psql`). Existing users will otherwise stay on legacy 5-credit trial and never see monthly free credits.
3. **Review onboarding copy** — Change UI references from "5 trial emails" to "500 free emails/month".
4. **Test with a staging user** before enabling broadly.

### Google OAuth activation checklist (pending)

See the Google OAuth Activation Runbook section below for the full step-by-step procedure.

---

## Google OAuth Activation Runbook

### Current status (verified 2026-06-21)

`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are **NOT set** in Railway production. The Passport strategy is conditionally registered only when both variables are present — feature is fully dormant. **No code changes are needed for activation.**

> The Google OAuth code is complete and has been reviewed. Activation requires only GCP console configuration and two Railway environment variables.

**Code reference (`server/routes.js:638`):**
```js
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({ ... callbackURL: "/api/auth/google/callback" }, ...));
}
```

**Callback URL in production:** `https://www.letszero.in/api/auth/google/callback`  
**OAuth scopes requested:** `profile`, `email` (non-sensitive — no Google verification required for basic usage)

---

### STEP 1 — GCP Project setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select or create a project (e.g. `repmail-production`)
3. Navigate to **APIs & Services → OAuth consent screen**

---

### STEP 2 — OAuth consent screen

| Setting | Value |
|---------|-------|
| User Type | **External** (allows any Google account) |
| App name | RepMail |
| User support email | epsteindapuccy@gmail.com (or support address) |
| Developer contact | same |
| Authorized domain | `letszero.in` |
| Privacy policy URL | `https://www.letszero.in/privacy` (or existing page) |
| Terms of service URL | `https://www.letszero.in/terms` (or existing page) |

**Scopes to add:** `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`  
These are non-sensitive. Google does not require app verification for these scopes.

**Publishing:** Click **Publish App** to move from "Testing" to "Production" mode. In Testing mode, only the 100 manually added test users can log in. In Production mode, any Google user can log in.

> **Note on unverified app warning:** If the app is published but not submitted for Google verification, users with fewer than 100 unique daily OAuth logins will see a warning: "Google hasn't verified this app." They can click "Continue" to proceed. This is acceptable for early launch. Submit for Google verification when daily OAuth logins approach 100 consistently.

---

### STEP 3 — Domain verification

Google requires ownership verification of `letszero.in` before adding it as an authorized domain.

1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Add property → Domain type → enter `letszero.in`
3. Follow DNS TXT record verification (add the TXT record to the domain's DNS provider)
4. Once verified, the domain appears as "Verified" in Search Console
5. Return to GCP OAuth consent screen → add `letszero.in` as an Authorized Domain

---

### STEP 4 — Create OAuth 2.0 credentials

1. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
2. Application type: **Web application**
3. Name: `RepMail Web`
4. **Authorized JavaScript origins:**
   - `https://www.letszero.in`
5. **Authorized redirect URIs:**
   - `https://www.letszero.in/api/auth/google/callback`
6. Click **Create** → copy `Client ID` and `Client Secret`

---

### STEP 5 — Set Railway environment variables

Railway dashboard → Service `Let-sZero` → Variables → Add:

| Variable | Value |
|----------|-------|
| `GOOGLE_CLIENT_ID` | `<Client ID from Step 4>` |
| `GOOGLE_CLIENT_SECRET` | `<Client Secret from Step 4>` |

Railway auto-redeploys on variable change. Wait ~60 seconds for the new deployment to go live.

---

### STEP 6 — Verify activation

```bash
# Should redirect to accounts.google.com (not return 404 or 500)
curl -I https://www.letszero.in/api/auth/google
# Expected: HTTP 302, Location: https://accounts.google.com/o/oauth2/...
```

Then test the full flow manually:
1. Open `https://www.letszero.in/login` in an incognito window
2. Click **Sign in with Google**
3. Complete Google authentication
4. Should land on `/app/dashboard`

**Verify a new user was created:**
```sql
SELECT username, email, role, plan, is_trial_user, must_reset_password, created_at
FROM users ORDER BY created_at DESC LIMIT 3;
-- New Google user should have: role=USER, plan=free, must_reset_password=false
```

---

### STEP 7 — Behavior of Google OAuth users

| Property | Value | Reason |
|----------|-------|--------|
| `role` | `USER` | Cannot self-elevate. ROOT_ADMIN must promote manually. |
| `plan` | `free` | Same as password-signup users |
| `mustResetPassword` | `false` | OAuth users authenticate via Google, not password |
| `isTrialUser` | Depends on `FREE_PLAN_ENABLED` | If `true` → 5 trial credits; if `false` → 500/month free credits |
| `passwordHash` | Random 32-byte hex | Users can't log in via password (intentional). Forgot-password flow can set one if desired. |

---

### Scaling considerations

- **Google OAuth is free** for any number of users. No per-user billing.
- **No user cap** for authentication. Scales to millions.
- **App verification** (optional) removes the "unverified" warning. Required only if daily unique OAuth logins consistently exceed 100 unverified users. Process: submit in GCP Console, ~1–3 week Google review.

---

### Rollback

1. Remove `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from Railway → auto-redeploys
2. Google OAuth routes return 404 (Passport strategy not registered)
3. No user data affected. Google-created accounts remain in DB with full access via normal login (if password was set) or are re-linkable if Google OAuth is re-enabled.

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

## Legal Architecture (Phase 14 + 14.1 + 14.2)

RepMail has two distinct legal layers:

### Layer 1 — LetsZero Corporate (general company)

| Page | File | Route | Audience |
|------|------|-------|---------|
| Privacy Policy | `client/src/pages/Privacy.jsx` | `/privacy` | General/OAuth visitors |
| Terms of Service | `client/src/pages/Terms.jsx` | `/terms` | General/OAuth visitors |
| Contact | `client/src/pages/Contact.jsx` | `/contact` | All visitors |

LetsZero corporate pages use LetsZero branding and cover company-wide data practices.
These are the URLs referenced in the Google OAuth consent screen.

### Layer 2 — RepMail Product (operational specifics)

| Page | File | Route | Audience |
|------|------|-------|---------|
| RepMail Privacy | `client/src/pages/RepMailPrivacy.jsx` | `/repmail/privacy` | Authenticated users |
| RepMail Terms | `client/src/pages/RepMailTerms.jsx` | `/repmail/terms` | Authenticated users |

RepMail product pages use RepMail branding (cyan palette, RepMail logo, dashboard-style layout) and cover:
- Contact upload responsibilities and data retention schedules
- Anti-spam enforcement (bounce >5%, complaint >0.1% → auto-pause)
- SES delivery processing and event pipeline (SNS → webhook → `sns_events`)
- Open and click tracking mechanics (pixel + URL rewriting)
- AI-generated content policy (OpenAI, per-user daily quotas, validation)
- Bounce and complaint classification and auto-suppression
- Suppression management obligations and retention (indefinite)
- Account termination grounds and appeal process

**Phase 14.2 — Visual identity:** Both RepMail legal pages use a `max-w-7xl` two-column grid layout (220px sticky sidebar + content). The sidebar has 8 section nav items with scroll-based active-state highlighting. Section headers have lucide-react icons. Cards use `#0A1428` background with `#162035` border. Mobile uses a horizontal scrollable pill nav strip. Privacy page uses cyan (`#00E5C8`) accent; Terms uses violet (`#A78BFA`) accent to distinguish the two documents.

**Phase 14.2 a11y polish (Audit 031):** Active sidebar/pill `<button>` elements carry `aria-current="true"` for screen-reader announcement. Inactive label colour raised from `#4B5563` to `#6B7280` (~3.6:1 on `#050A14`, WCAG AA for UI components). `scrollTo()` respects `prefers-reduced-motion` — uses `"auto"` instead of `"smooth"` when the OS accessibility setting is active.

### Navigation rationale

- `/privacy` and `/terms` are linked in page footers (marketing pages) and referenced by Google OAuth
- `/repmail/privacy` and `/repmail/terms` are linked in the authenticated Navbar user dropdown
- Primary navigation (header) does NOT contain Privacy or Terms links — industry standard for SaaS
- Primary nav verified: Products, Features, Pricing, Contact, Sign In, Explore RepMail (CTA)

**OAuth status:** `/privacy` and `/terms` (Layer 1) were the last URL-level blockers. Both return HTTP 200. Activate OAuth per the Google OAuth Activation Runbook below.

---

### Phase 15.2 — Landing Page, Pricing UX & Brand Trust (2026-06-22)

Three commits: `d4323d7` / `3ec108c` / `3202032`.

**Pricing slider (PublicPricing.jsx):** Slider is now logarithmic (0–1000 internal range, log10 mapped to 3K–300K). Previously linear, making 10K visually identical to 3K. Helper functions `creditsToSlider()` / `sliderToCredits()` at module scope. Both input→slider and slider→input directions verified.

**Pricing table 10K row (PublicPricing.jsx):** Fixed `VOLUME_ROWS` entry: ₹1300→₹1200, bonus 0→833, total 10000→10833. First bonus tier now correctly displayed. 3K and 5K rows show `—` as intended.

**LetsZero nav (LandingExperience.tsx):** Removed "Zero Noise" tagline. Logo + "LetsZero" only. LetsZero text 16px→20px.

**RepMail landing nav (Landing.jsx):** Removed "by LetsZero" sub-label (it's in the footer). Logo h-10→h-12. Clean single-line: logo + "RepMail".

**Fake metrics removed (Landing.jsx):** All fabricated stats (2B+ emails, 10K+ businesses, 99.9% uptime, <50ms API) replaced with real product facts. No more testimonial (Sarah Kim / TechCorp). Feature descriptions no longer claim SOC 2, GDPR, dedicated IPs, global infra, or 99.9% deliverability.

**Roadmap dates (WaitlistLanding.jsx):** "Q2 2026" / "Q3 2026" → "Planned" / "Future". No fake timelines.

**Trust rule for future engineers:** Any statistic, metric, or testimonial on a public marketing page must be sourced from real production data. If a number cannot be verified, remove it.

---

### Logo & Branding (Phase 15.1 — commit `d2d2d04`)

Two canonical logo assets: `repmail-logo-white.png` (light on dark) and `repmail-logo-black.png` (dark on light). Both are in `client/public/`.

**Classification rule:**
- **Always-dark pages** (hardcoded hex bg `#050A14`/`#0A1428`): use white logo only.
- **Theme-aware pages** (`bg-background` + ThemeToggle): use dual-logo pattern — `hidden dark:block` on white, `block dark:hidden` on black.

**Legacy file:** `repmail-logo.png` is now a copy of the white version. Keep it for any missed reference — do not delete.

**Favicon:** `client/public/favicon.png` = black logo (renders on light browser chrome).

**LetsZero logo:** `WaitlistLanding.jsx` and `marketing/LFP_final/LandingExperience.tsx` reference `/letszero-logo.png`. Do not touch.

**Audit:** Audit 034 in AUDIT_TRAIL.md. Milestone 30 in PROGRESS.md.

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
