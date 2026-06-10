# RepMail Audit Trail

Append-only log of architectural audits, production verification sessions, and significant code reviews.
Each entry is immutable once appended — do not edit past entries.

## Related Documents

| Document | Purpose |
|:---------|:--------|
| [HANDOFF.md](./HANDOFF.md) | Primary onboarding doc — current state, priorities, gaps, non-goals |
| [PROGRESS.md](./PROGRESS.md) | Launch readiness tracker with milestone evidence |
| [REPMAIL_ENGINEERING_HANDOFF.md](./REPMAIL_ENGINEERING_HANDOFF.md) | Deep technical reference for schema, security, queue, AI governance |

---

## Audit 001 — AI & Production Readiness Audit

**Date:** 2026-06-06  
**Conducted by:** Claude Sonnet 4.6 + AK Singh  
**Scope:** Full codebase audit of AI subsystem and production campaign execution paths  
**Commit at time of audit:** `f69b4ab`  
**Method:** Read `server/ai.js`, `server/worker.js`, `server/routes.js`, `server/storage.js`, `shared/schema.js` against 8 stakeholder perspectives (10-email sender, 10k-email sender, recipient, sales team, recruiter, real estate agent, partnership manager, deliverability specialist)

### Findings

| ID | Area | Finding | Severity |
|----|------|---------|---------|
| OK | Campaign-type architecture | 6 preambles confirmed (b2b_outreach, real_estate, recruitment, partnership, follow_up, general). Single OpenAI call per generation — NOT per-contact. | PASS |
| OK | Cost controls | Model tiering: enterprise/scale/growth → gpt-4o; others → gpt-4o-mini. Daily per-user quotas enforced. Cache-first for spam analysis. | PASS |
| OK | Deliverability — worker path | Auto-pause at 15% bounce / 0.5% complaint. `owner.sendPaused` check before loop. Global pause pre-loop and mid-loop. | PASS |
| GAP-1 | Deliverability — inline path | `routes.js executeCampaign` has global pause but NO `owner.sendPaused` mid-loop check and NO `getUserSenderHealth` auto-pause. Redis-fallback path is unprotected. | HIGH |
| GAP-2 | Scale — suppression query | `getPreCampaignSuppressionCount` runs 1 DB query per contact email (N+1 loop). 10k contacts = 10k queries at campaign creation. | HIGH |
| GAP-3 | Scale — contact loading | `getContactById` called per-contact inside both `worker.js` and `routes.js` send loops. Batch method `getContactsByIds` does not exist. | MEDIUM |
| GAP-4 | AI validation | Post-generation validation only checks `if (!parsed.subject || !parsed.body)`. No: subject length check, unclosed placeholder detection, bracket artifact detection, campaign-type rule enforcement. | MEDIUM |
| GAP-5 | AI intake | Single free-text prompt only. No structured intake (recipient description, value prop, objective, relevance). | MEDIUM |
| GAP-6 | Sender profile | No gate at campaign creation — blank sender profiles silently emit `{{sender_name}}` / `{{sender_title}}` / `{{sender_company}}` literals in generated email sign-offs. | MEDIUM |

### Iron Rules Affirmed

The following are explicit non-goals and must not be implemented:
- No per-contact OpenAI generation
- No per-recipient AI call during campaign send
- No material increase to OpenAI spend
- No change to campaign sending architecture (sequential per-contact loop)

---

## Audit 002 — Phase A Security + Payment Hardening Verification

**Date:** 2026-06-06 / 2026-06-09  
**Conducted by:** Claude Sonnet 4.6 + AK Singh  
**Scope:** Verify all Phase A changes are correctly implemented in commits `f7f892e` (Razorpay) and `47e0d49` (security hardening)  
**Method:** Read each modified file, grep for key patterns, verify against expected behavior

### Items Verified

| Item | File | Line(s) | Result |
|------|------|---------|--------|
| `razorpayWebhook.js` HMAC-SHA256 handler | server/razorpayWebhook.js | — | CONFIRMED (file exists) |
| Razorpay webhook registered before `express.json()` | server/index.js | — | CONFIRMED |
| `getPaymentByRazorpayOrderId` via JSONB | server/storage.js | 1071 | CONFIRMED |
| `completePayment` idempotency early-return on SUCCESS | server/storage.js | 1006 | CONFIRMED |
| `completePayment` WHERE status != SUCCESS in UPDATE | server/storage.js | 1018 | CONFIRMED |
| `mustResetPassword` enforcement in `authMiddleware` | server/routes.js | 115 | CONFIRMED |
| Exempt paths (me, change-password, logout) | server/routes.js | 117 | CONFIRMED |
| Global send pause pre-loop in `executeCampaign` | server/routes.js | 199 | CONFIRMED |
| Global send pause mid-loop every 50 contacts | server/routes.js | 242 | CONFIRMED |
| `sendPaused` blocks `POST /api/campaigns` (authMiddleware) | server/routes.js | 106 | CONFIRMED |
| `sendPaused` check in `worker.js processCampaign` | server/worker.js | 231 | CONFIRMED |
| `getUserSenderHealth` auto-pause in `worker.js` | server/worker.js | 246–269 | CONFIRMED |
| Invite accept member-limit bypass fix | server/routes.js | 1780–1788 | CONFIRMED |
| Password minimum 8 chars | server/routes.js | 1761 | CONFIRMED |
| `sesTracking` field in `/api/health` | server/routes.js | 498 | CONFIRMED |
| `openedEmails ?? 0` null guard in History.jsx detail view | client/src/pages/History.jsx | 390, 401 | CONFIRMED |
| `buildMonthlyChart` uses `startedAt \|\| completedAt \|\| createdAt` | server/storage.js | 54 | CONFIRMED |
| Pricing.jsx INR-only (`const [currency] = useState("INR")`) | client/src/pages/Pricing.jsx | 134 | CONFIRMED |
| Stripe removed from `gateways.js` | server/gateways.js | — | CONFIRMED (no Stripe imports) |
| `getPreCampaignSuppressionCount` N+1 loop still present | server/storage.js | 1334–1340 | CONFIRMED — GAP 2 unresolved |
| `getContactsByIds` batch method | server/storage.js | — | ABSENT — GAP 3 unresolved |
| `senderHealth` auto-pause in `routes.js executeCampaign` | server/routes.js | — | ABSENT — GAP 1 unresolved |

---

## Audit 003 — Documentation Synchronization Review

**Date:** 2026-06-09  
**Conducted by:** Claude Sonnet 4.6 + AK Singh  
**Scope:** All documentation files vs. current codebase (HEAD: `47e0d49`)  
**Method:** Read each doc, cross-reference against source code grep results

### Documentation Gap Report

| Document | Pre-audit State | Post-audit State |
|----------|----------------|-----------------|
| `README.md` | OUTDATED — Stripe listed; wrong env var names; wrong file names | CORRECTED this session |
| `PROGRESS.md` | OUTDATED — stale commit ref; Stripe row; no Phase A entries | CORRECTED this session |
| `REPMAIL_ENGINEERING_HANDOFF.md` | OUTDATED — Stripe in tech stack; health endpoint listed as gap | CORRECTED this session |
| `HANDOFF.md` | ABSENT | CREATED this session |
| `AUDIT_TRAIL.md` | ABSENT | CREATED this session |

### Specific Discrepancies Resolved

**README.md:**
- `Stripe + Razorpay — Dual-gateway payments (USD + INR)` → `Razorpay (INR only)` 
- `AWS_SES_HOST / USER / PASS` → `SES_SMTP_HOST / SES_SMTP_USER / SES_SMTP_PASS`
- Removed `STRIPE_SECRET_KEY` from env var table
- Added missing vars: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `SES_FROM_EMAIL`, `SES_FROM_NAME`, `APP_URL`, `REPMAIL_PUBLIC`, `RECOVERY_EMAIL`, `BOUNCE_RATE_PAUSE_THRESHOLD`, `COMPLAINT_RATE_PAUSE_THRESHOLD`
- Fixed file tree: `aiService.js` → `ai.js`, `emailService.js` → `email.js`, `snsHandler.js` → `sns.js`, `cleanupJobs.js` → `razorpayWebhook.js` + `gateways.js`

**PROGRESS.md:**
- Commit ref `f3f2f3e` → `47e0d49`; date `2026-06-07` → `2026-06-09`
- Removed `Stripe payment flow` row from Billing section
- Added Phase A Hardening section with 12 implemented items and 4 known gaps

**REPMAIL_ENGINEERING_HANDOFF.md:**
- `Payments | Stripe + Razorpay (dual gateway)` → `Razorpay (INR only — Stripe fully removed as of commit f7f892e)`
- `Not yet production-ready: no /health endpoint` → health endpoint exists; updated to reflect current state
- `openedEmails/clickedEmails not yet surfaced in UI` → they are surfaced in History.jsx detail view
- `payments — Stripe/Razorpay payment records` → `Razorpay payment records; metadata JSONB stores razorpay_order_id`

### Commit
`[DOCS] Synchronize README, PROGRESS, HANDOFF, and AUDIT_TRAIL with current production state`

---

## Audit 004 — Final Production-Readiness Audit

**Date:** 2026-06-10 / 2026-06-11
**Conducted by:** Claude Sonnet 4.6 + AK Singh
**Scope:** Full system — 18 areas: authentication, authorization, campaign execution, SES, SNS, suppression, auto-pause, AI generation, AI validation, credit accounting, Razorpay, recovery paths, startup recovery, Redis outage, audit logging, admin workflows, team hierarchy, user lifecycle
**Commits at time of audit:** `71c0241` (B-1), `1b89a3f` (GAP-6), `e9f8554` (GAP-3), `217bebc` (GAP-2), `826aa25` (GAP-1) — all from the hardening session
**Method:** Full code read of all server-side modules, route handlers, and storage implementations. Evidence-based classification.

### Classification System

| Label | Meaning |
|---|---|
| Blocking | Prevents private beta (PB) or public launch (PL) |
| Important | Must fix before public launch; acceptable for private beta with monitoring |
| Operational | Fix before or shortly after public launch; no user-facing financial impact |
| Future Enhancement | Roadmap item; not launch-critical |

### Findings

| ID | Area | Finding | Classification | Status |
|----|------|---------|---------------|--------|
| B-PL-1 | Payments | No Razorpay server-side webhook — payment completion relied on frontend /verify only | **Blocking (PL)** → RESOLVED (webhook existed in razorpayWebhook.js; double-credit race fixed separately as FIN-1) |
| B-PL-2 | Auth | loginLimiter existed but `trust proxy` not set — all clients shared one rate-limit bucket behind Railway | **Blocking (PL)** → RESOLVED (`app.set("trust proxy", 1)` in index.js, commit a279203) |
| FIN-1 | Payments | `completePayment` unconditional credit allocation: concurrent webhook + /verify could both allocate credits | **Financial-critical** → RESOLVED (commit ecb1331) |
| FIN-2 | Credits | `allocateCredits` balance check outside transaction: concurrent allocations could overdraw parent balance | **Financial-critical** → RESOLVED (commit ecb1331) |
| I-1 | Auto-pause | Auto-pause thresholds (15%/0.5%) more lenient than AWS SES limits (10%/0.1%) | Important | Requires env var change in Railway |
| I-2 | AI validation | `validateTemplate` only hard-blocks EMPTY_SUBJECT/EMPTY_BODY; unreplaced placeholders pass | Important | Not yet implemented |
| I-3 | Campaign | No mid-loop sendPaused re-check — long campaigns continue if auto-paused mid-run | Important | Not yet implemented |
| I-4 | Campaign | No isRetry guard in executeCampaign inline path — crash-restart could duplicate sends | Important | Not yet implemented |
| I-5 | SNS | `SNS_TOPIC_ARN` not enforced if env var missing — any SNS topic can inject events | Important | Not yet implemented |
| O-1 | Credits | `deductCreditAtomic` failure after send is logged but not alerted | Operational | Not yet implemented |
| O-2 | Auth | Invite token TTL unverified — old invite links may not expire | Operational | Not yet verified |
| O-3 | Recovery | `RECOVERY_EMAIL` silent failure if env var missing | Operational | Not yet implemented |
| O-4 | Audit | Audit log retention period not documented or configurable | Operational | Env var exists (`AUDIT_LOG_RETENTION_DAYS`) |
| O-5 | Credits | Deep-hierarchy credit reclaim gap on user deletion | Operational | By design; documented |
| O-6 | SES | No SES configuration set startup validation | Operational | Not yet implemented |

### Production Verification Items

| Item | Required Before |
|---|---|
| sendWithRetry against live SES | Private beta |
| Auto-pause with real SNS bounce/complaint data | Private beta |
| Forced password reset flow end-to-end | Private beta |
| Sender profile gate UI behavior | Optional |
| Suppression-count verification on real datasets | Public launch |

### Private Beta Readiness

**READY** — subject to production verification checklist:
1. Confirm `SNS_TOPIC_ARN` set and SNS subscription confirmed
2. Confirm SES configuration set routes to SNS topic
3. Send one test email, verify `campaignEmails` record shows SENT
4. Send SES simulator bounce, verify suppression added and senderHealth increments
5. Create admin-created user, verify mustResetPassword flow end-to-end
6. Set `BOUNCE_RATE_PAUSE_THRESHOLD=0.08` and `COMPLAINT_RATE_PAUSE_THRESHOLD=0.001`

### Public Launch Blockers Remaining

- **I-2**: validateTemplate placeholder hard-block (next implementation priority)
- **I-5**: SNS_TOPIC_ARN startup enforcement
- **I-1**: Auto-pause threshold tightening (env var only — no code change)

---

## Audit 005 — Financial Integrity Concurrency Analysis

**Date:** 2026-06-11
**Conducted by:** Claude Sonnet 4.6 + AK Singh
**Scope:** `completePayment`, `allocateCredits`, `checkAndIncrementAiQuota`, `deductCreditAtomic`, `useCredits`, `reclaimCredits`, `upgradePlanIfHigher`
**Trigger:** B-PL-1 Razorpay webhook design review revealed potential double-credit race
**Method:** Precise READ COMMITTED transaction timeline analysis; PostgreSQL row-locking semantics

### Race Confirmation: `completePayment`

**Mechanism:** Under READ COMMITTED isolation, the pre-transaction idempotency check (`if status === SUCCESS`) is a plain SELECT outside any transaction. Two concurrent callers (webhook + frontend /verify) can both read `status=PENDING` before either commits. Both enter the transaction. The first wins the row lock and sets `status=SUCCESS`. The second's payment UPDATE sees `status=SUCCESS` (0 rows updated), but the result was discarded — the subsequent `UPDATE users SET credits_received += N` executed unconditionally.

**Impact:** User receives 2× credits for a single payment. Requires webhook and frontend /verify to race within milliseconds — exactly the normal happy-path Razorpay flow.

**Fix (commit ecb1331):** Added `.returning({ id: payments.id })` to the payment UPDATE. Check `transitioned.length === 0` before credit allocation. If 0 rows, the concurrent caller won — return from transaction callback without executing credit increment or ledger insert.

### Race Confirmation: `allocateCredits`

**Mechanism:** Balance check (`fromUser.creditsRemaining < amount`) was a plain SELECT before `db.transaction()`. Two concurrent admin allocations from the same parent could both pass the check and both execute `credits_allocated += amount`, driving the parent's balance negative.

**Impact:** Parent user's `creditsAllocated` exceeds `creditsReceived`, producing negative `creditsRemaining`. Practical trigger is low (requires concurrent admin actions) but not zero.

**Fix (commit ecb1331):** Replaced unconditional `WHERE id=fromUserId` with conditional `WHERE id=fromUserId AND (credits_received - credits_allocated - credits_used) >= amount RETURNING id`. Throws inside the transaction if 0 rows returned, causing Drizzle to issue ROLLBACK before recipient increment or ledger inserts.

### Safe Patterns (no fix needed)

| Function | Why Safe |
|---|---|
| `deductCreditAtomic` | Balance check IS the WHERE clause — atomic with the write |
| `checkAndIncrementAiQuota` | Minor quota leak (1 extra AI call max) — not financial |
| `useCredits` | Dead code — no call sites in server directory |
| `reclaimCredits` | Called only from deletion flow — not concurrent |
| `upgradePlanIfHigher` | Plan upgrade is idempotent — concurrent calls set same value |

### Commit
`[FIN-1] Eliminate double-credit race in completePayment + allocateCredits` (ecb1331)
