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

---

## Audit 006 — I-2 validateTemplate Placeholder Hard-Block

**Date:** 2026-06-11
**Conducted by:** Claude Sonnet 4.6 + AK Singh
**Scope:** `validateTemplate` in `server/ai.js` — Step 3 unknown placeholder handling
**Trigger:** Final production-readiness audit (Audit 004) classified UNKNOWN_PLACEHOLDER as Important; risk is verbatim delivery of AI-hallucinated tags to recipient inboxes

### Finding

Step 3 of `validateTemplate` already detected any `{{...}}` pattern not in `VALID_PLACEHOLDERS` via `findUnknownPlaceholders()`. Detection was correct. Severity was `warn` — template was returned to the user with a warning, not blocked. Tags such as `{{firstName}}`, `{{jobTitle}}`, `{{orgName}}` would be sent verbatim.

### Fix

Elevated to hard block. The new path:
- If `unknownInSubject.length > 0`: push `PLACEHOLDER_IN_SUBJECT` (severity: error), return `hardBlocked: true`
- If `unknownInBody.length > 0`: push `PLACEHOLDER_IN_BODY` (severity: error), return `hardBlocked: true`
- Both codes emitted when unknowns appear in both locations
- `logValidationTelemetry` fires before return (same as EMPTY_SUBJECT / EMPTY_BODY)
- Route handler at routes.js:2116 sees `hardBlocked: true` → refunds AI quota → returns 422

Valid placeholders (`{{name}}`, `{{company}}`, `{{sender_name}}`, etc.) remain in `VALID_PLACEHOLDERS` and pass through for send-time substitution.

### Verification

9/9 cases passed:

| Case | Expected | Result |
|---|---|---|
| `{{firstName}}` in subject | `PLACEHOLDER_IN_SUBJECT` hard block | PASS |
| `{{jobTitle}}` in body | `PLACEHOLDER_IN_BODY` hard block | PASS |
| Unknowns in both | Both codes, hard block | PASS |
| Empty subject | `EMPTY_SUBJECT` hard block (regression) | PASS |
| Empty body | `EMPTY_BODY` hard block (regression) | PASS |
| `{{name}}` in subject | Not blocked | PASS |
| All valid placeholders | Not blocked | PASS |
| `{{sender_name}}` sign-off | Not blocked | PASS |
| Valid `{{name}}` + invalid `{{firstName}}` in body | `PLACEHOLDER_IN_BODY` hard block | PASS |

### Status
`IMPL` `VERIFIED IN TESTS` — not yet `VERIFIED IN PRODUCTION`

### Commit
`[I-2] validateTemplate: elevate unknown placeholders to hard block` (306b391)

---

## Audit 010 — I-4 Inline Executor Retry Idempotency

**Date:** 2026-06-11
**Scope:** `executeCampaign` in `server/routes.js`
**Commit:** `bf17c19`

### Finding

`executeCampaign` (the inline fallback path used when Redis/BullMQ is unavailable) lacked the retry idempotency guard present in `processCampaign` (worker.js). Specifically:

- No `hasAnySentEmails` + `isRetry` detection before the loop
- `canStartCampaign` (credit check) ran unconditionally — would block a resume of a partially-sent campaign whose credits were already partially consumed
- No per-contact `getCampaignEmailByContact` check — on a re-run of the same campaign, contacts already marked `SENT` would be sent to again

The crash-restart scenario requires: Redis down → server crash → server restarts → someone re-triggers the same campaign. Practical risk is low but the gap created execution-path asymmetry between the two executors.

### Fix

Direct port of the proven `processCampaign` retry pattern into `executeCampaign`:

1. `hasAnySentEmails(campaignId)` called once before the loop
2. `isRetry` derived from campaign status + sent-email existence (same logic as worker.js:165–166)
3. `canStartCampaign` wrapped with `if (!isRetry)` — credit check skipped on resume
4. Per-contact `getCampaignEmailByContact` guard inside `if (isRetry && contact)` — skips SENT, SUPPRESSED, BOUNCED, COMPLAINED, permanently-FAILED; falls through on PENDING and transient FAILED

No new storage methods. Zero new per-contact queries on normal (non-retry) runs.

### Status
`IMPL` `VERIFIED IN TESTS` — not yet `VERIFIED IN PRODUCTION`

---

## Audit 009 — I-3 Mid-Loop sendPaused Re-Check

**Date:** 2026-06-11
**Scope:** `processCampaign` (worker.js) and `executeCampaign` (routes.js) send loops
**Commit:** `8eabc8a`

### Finding

Both send loops captured the `owner` user record before the loop and never refreshed it. The pre-loop auto-pause check calls `storage.updateUser(userId, { sendPaused: true })` and returns — but if this fires on a *concurrent* campaign start while the current campaign is mid-loop, the running campaign's stale `owner` snapshot never reflects the updated flag.

The existing mid-loop check (`i % 50 === 0`) only covered the global platform pause (`platform_settings.send_pause_enabled`). Per-user `sendPaused` had no mid-loop re-check.

Worst-case: auto-pause fires at contact index 1 of a 1000-contact campaign → 999 additional sends before the campaign completes.

### Fix

Added a `storage.getUserById(userId)` call inside the existing `i % 50 === 0` block, immediately after the global pause check, in both executors. If `freshOwner.sendPaused` is true, the campaign transitions to `PAUSED` (matching the global pause mid-loop behavior) with `reason=sender_paused_mid_loop` and stops.

Worst-case after fix: 49 additional sends.

`getUserById` is a single indexed primary-key lookup (~1ms). At one call per 50 contacts it adds negligible overhead.

### Method confirmation

Both `getUserById` and `getUser` exist in `storage.js` and `memoryStorage.js`. `getUser` is a direct alias for `getUserById` in both implementations. The existing pre-loop pause logic uses `getUserById` — the fix uses the same method.

### Status
`IMPL` `VERIFIED IN TESTS` — not yet `VERIFIED IN PRODUCTION`

---

## Audit 008 — SNS Production Pipeline Verification

**Date:** 2026-06-11
**Scope:** End-to-end SES → SNS → RepMail event pipeline
**Type:** Production verification (not code review)

### Evidence collected

| Item | Status | Evidence |
|---|---|---|
| SNS topic exists | VERIFIED | `repmail_events` topic found in AWS Console (same region as SES) |
| `SNS_TOPIC_ARN` configured | VERIFIED | Added to Railway; deploy successful |
| HTTPS subscription created | VERIFIED | `https://www.letszero.in/api/webhooks/ses` subscribed to `repmail_events` |
| Subscription auto-confirmed | VERIFIED | Railway logs: `POST /api/webhooks/ses 200` + `[SNS] Subscription confirmed — HTTP 200` |
| Signature verification passed | VERIFIED | Auto-confirm succeeded → `verifySnsMessage` and TopicArn guard both passed |
| I-5 fail-closed guard working | VERIFIED | Subscription confirmation was accepted, confirming `SNS_TOPIC_ARN` is set and matched |

### What this proves

The full handshake from AWS SNS to the application succeeded. The I-5 two-guard pattern (`!expectedTopicArn → 503`, `TopicArn !== expected → 403`) is live in production and correctly accepted the legitimate subscription confirmation from the configured topic.

### What remains unverified

- SES Configuration Set event destination: not yet confirmed in AWS Console. Will be verified by T-2 (first bounce event). If T-2 produces no SNS event, the event destination is misconfigured.
- Actual Bounce/Complaint/Open/Click event processing: verified by T-2 and T-3.

---

## Audit 007 — I-5 SNS_TOPIC_ARN Fail-Closed Enforcement

**Date:** 2026-06-11
**Conducted by:** Claude Sonnet 4.6 + AK Singh
**Scope:** `POST /api/webhooks/ses` TopicArn enforcement in `server/routes.js` and startup check in `server/index.js`
**Trigger:** Final production-readiness audit (Audit 004) classified SNS_TOPIC_ARN enforcement as Important

### Finding

The TopicArn check at routes.js:722 used a compound condition:
```js
if (expectedTopicArn && envelope.TopicArn && envelope.TopicArn !== expectedTopicArn)
```
When `SNS_TOPIC_ARN` is unset, `expectedTopicArn` is `undefined` — the `&&` short-circuits to `false` and the check does not execute. Every SNS-signed message from any topic on any AWS account is accepted (fail-open).

Attack surface: an attacker with their own AWS account creates an SNS topic, subscribes it to the RepMail webhook endpoint, and publishes `Notification` messages claiming permanent bounces for arbitrary email addresses. `verifySnsMessage` passes (the message is legitimately signed by the attacker's topic). The TopicArn guard is absent. Arbitrary emails are suppressed.

The startup check at index.js:582 emitted `console.warn` — visible but not error-level. The message described the state as "TopicArn validation disabled" without indicating that the endpoint was accepting all traffic.

### Fix

**routes.js:** Split compound condition into two explicit guards:
1. `if (!expectedTopicArn)` → 503 + `console.error` (fail-closed)
2. `if (TopicArn !== expectedTopicArn)` → 403 + `console.warn` (unchanged)

**index.js:** `console.warn` → `console.error`. Message updated to state "SNS webhook will reject all messages" to reflect the new fail-closed behavior.

**SNS retry behavior:** SNS retries non-2xx responses for up to 23 days. A transient misconfiguration window does not permanently lose bounce/complaint events.

### Verification

6/6 cases passed (logic extracted from routes.js, tested independently):

| Case | Expected | Result |
|---|---|---|
| ARN unset + attacker topic | 503 fail-closed | PASS |
| ARN unset + correct-looking ARN | 503 still fail-closed | PASS |
| ARN set + wrong topic | 403 | PASS |
| ARN set + correct topic | 200 (check passes) | PASS |
| ARN set + missing envelope TopicArn | 403 | PASS |
| Old fail-open path no longer reachable | status ≠ 200 | PASS |

### Status
`IMPL` `VERIFIED IN TESTS` — not yet `VERIFIED IN PRODUCTION`

### Commit
`[I-5] SNS_TOPIC_ARN: fail-closed when env var unset` (f434b21)

---

## Audit 011 — Free Plan Architecture Review & Challenge

**Date:** 2026-06-14
**Conducted by:** Claude Sonnet 4.6 + AK Singh
**Scope:** Product strategy change (trial credits → Free Plan 500 credits/month); full architecture validation and challenge of proposed design
**Trigger:** Product decision to replace one-time 5-credit trial with a renewable 500-credit/month Free Plan
**Method:** Full code trace of `completePayment`, `upgradePlanIfHigher`, `razorpayWebhook.js`, `fulfillPayment.js`, `storage.js deductCreditAtomic`, and all cron infrastructure in `index.js`. Proposal challenged against correctness, simplicity, and operational risk criteria.

### Bug Claim Rejection: plan-field not updated after payment

**The proposed architecture review (pre-audit) claimed that `completePayment` does not update the `plan` field and that this is a production bug.**

**This claim is FALSE.** Code trace evidence:

| File | Line | Evidence |
|---|---|---|
| `server/routes.js` | ~17 | `import { upgradePlanIfHigher } from "./fulfillPayment.js"` |
| `server/routes.js` | ~2382 | `const user = await upgradePlanIfHigher(payment.userId, payment.planName)` called immediately after `storage.completePayment()` on the `/api/payments/razorpay/verify` route |
| `server/razorpayWebhook.js` | 70 | `await upgradePlanIfHigher(repPayment.userId, repPayment.planName)` called immediately after `storage.completePayment()` on the webhook path |
| `server/fulfillPayment.js` | 19–28 | `upgradePlanIfHigher` upgrades `plan` field and cascades to children and grandchildren if new plan rank > current plan rank |

Both the frontend-verify path and the webhook path call `upgradePlanIfHigher` after `completePayment`. The plan field IS updated. No bug exists. The previous architectural review introduced a false finding.

**Impact:** No code change required for the plan field.

### Architecture Proposal — Challenged and Revised

#### Claim challenged: separate free credit pool is required

**Original claim:** The cumulative ledger model (`creditsReceived - creditsAllocated - creditsUsed`) cannot support monthly expiry, therefore a separate pool with new columns (`free_credits_granted`, `free_credits_used`, `free_credits_reset_at`) is required.

**Challenge:** This claim is architecturally correct. The paid credit counters are monotonically non-decreasing by design (required for FIN-1/FIN-2 atomicity guarantees). Adding 500 to `creditsReceived` monthly and subtracting unused credits at month-end would require decrementing `creditsReceived` — which breaks the ledger invariant that all three allocation functions depend on. The separate pool conclusion stands.

**However, the naming and complexity were challenged:**

The proposed `free_credits_granted` column is redundant for a fixed-amount free plan. 500 is a constant (or config-driven). Storing it per-user adds a mutation surface and creates a class of bugs where users have `free_credits_granted = 0` due to missed backfill. Simpler: derive grant amount from `plan` at refresh time rather than storing it per-user.

**Revised schema: two columns instead of three:**
- `free_credits_used` INTEGER NOT NULL DEFAULT 0
- `free_credits_reset_at` TIMESTAMP NULL

Grant amount is derived from `FREE_PLAN_MONTHLY_CREDITS` constant (or env var). No per-user grant storage needed. The refresh operation sets `free_credits_used = 0` and `free_credits_reset_at = NOW()`.

#### Claim challenged: daily sweep cron is necessary

**Original claim:** A daily sweep is required for inactive users whose balance would be stale.

**Challenge:** For a free plan, an inactive user's "stale balance" has zero operational impact. If a user hasn't logged in since January and returns in March, the lazy refresh fires on their first request. They receive 500 credits for March — the correct current-period amount. A daily sweep adds a background job, a `running` flag guard, a new log line, and a failure mode (job crashes silently) for zero user-visible benefit.

**Decision: daily sweep is rejected.** Lazy refresh only. The lazy check is sufficient because:
1. Free credits only matter when a user takes an action (login, send, AI generation).
2. If the user takes no action, the balance is irrelevant.
3. Admins viewing user lists see the stored value — a staleness note in the UI is sufficient.

If admin-facing balance accuracy becomes a requirement, add the sweep then. Do not add it preemptively.

#### Claim challenged: free credits should be consumed first

**Original claim:** Free credits should be consumed before paid credits ("they expire, so consume them first").

**Challenge accepted.** This is the correct deduction order from a user-value perspective and consistent with industry practice (e.g., trial credits deplete before purchased credits in most SaaS billing systems). However it adds a branch to the hot path of `deductCreditAtomic`. Implementation must be careful: a user with both free and paid credits who runs a campaign partially exhausting their free balance mid-campaign needs consistent behavior. The free pool must be checked per-email, not pre-campaign. The existing two-transaction pattern in `deductCreditAtomic` already handles this correctly — free pool check is the first transaction, paid pool is the fallback.

#### Concurrency analysis — revised

The lazy refresh race (two concurrent requests both see expired `free_credits_reset_at`) is handled by a WHERE clause guard:

```sql
UPDATE users SET free_credits_used = 0, free_credits_reset_at = NOW()
WHERE id = $userId
  AND DATE_TRUNC('month', COALESCE(free_credits_reset_at, '1970-01-01') AT TIME ZONE 'UTC')
    < DATE_TRUNC('month', NOW() AT TIME ZONE 'UTC')
```

Under PostgreSQL READ COMMITTED: two concurrent callers both see expired reset_at. Both issue the UPDATE. One wins the row lock and sets `free_credits_reset_at = NOW()`. The second caller re-evaluates the WHERE after the lock releases, sees this month's timestamp, and matches 0 rows — becoming a no-op. The credit deduction in the second transaction of `deductCreditAtomic` then sees the refreshed pool and proceeds normally. Idempotent by construction.

No application-level locks, no Redis coordination, no flag needed.

#### Multi-instance analysis

If Railway ever runs multiple Node.js instances (currently single instance), the WHERE clause guard provides correctness without additional coordination. Each instance independently issues the UPDATE; at most one wins per user per month. This is the same guarantee provided by the existing FIN-2 `allocateCredits` pattern.

#### Month-boundary timezone analysis

All date math must be `AT TIME ZONE 'UTC'`. PostgreSQL `timestamp` columns store UTC. `DATE_TRUNC('month', NOW() AT TIME ZONE 'UTC')` is safe. `DATE_TRUNC('month', NOW())` is session-timezone-dependent and must not be used. This must be enforced by code review.

### Final Architecture Decision

| Decision | Chosen approach | Rejected alternative |
|---|---|---|
| Pool model | Separate free credit pool (2 new columns) | Reusing `creditsReceived` (breaks monotonic invariant) |
| Schema | `free_credits_used` + `free_credits_reset_at` | `free_credits_granted` per-user (redundant) |
| Refresh mechanism | Lazy inline in `deductCreditAtomic` + `canStartCampaign` | Daily sweep cron (unnecessary complexity) |
| Deduction order | Free credits first, paid credits second | Paid first (wastes user's paid credits when free expire) |
| Concurrency | WHERE-clause guard on reset timestamp | Application locks or Redis coordination |
| Grant amount source | Constant/env var derived from plan | Per-user stored column |
| Sweep cron | Rejected | Would add background job for zero operational benefit at current scale |

### Implementation Sequencing

**BLOCKED** on T-1 through T-5 production verification completing first.

After T-1 through T-5:
1. Add `free_credits_used` and `free_credits_reset_at` to schema (additive, safe)
2. Backfill existing free-plan users
3. Update `deductCreditAtomic` with lazy refresh + free pool deduction
4. Update `canStartCampaign` to include free pool in total
5. Update `completePayment` / `upgradePlanIfHigher` to zero free pool on plan upgrade
6. Soft-deprecate `isTrialUser`, `trialCredits`, `trialCreditsUsed` (keep columns, stop using)

### Status
`D` — Architecture reviewed, challenged, and finalized in design. No code written. Blocked on production verification milestone.
