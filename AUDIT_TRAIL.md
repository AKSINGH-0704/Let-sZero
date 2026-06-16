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

---

## Audit 012 — Free Plan Implementation Verification

**Date:** 2026-06-14
**Conducted by:** Claude Sonnet 4.6 + AK Singh
**Scope:** Pre-deployment verification of Free Plan implementation across all 7 modified files. Covers credit accounting, concurrency, upgrade path, API compatibility, trial migration, feature flag, UI, production impact, and classification.
**Trigger:** User requested full implementation verification before authorizing deployment (db:push → FREE_PLAN_ENABLED → backfill).

---

### Bugs Found During Verification

Two bugs were found and fixed during this audit. Implementation was NOT complete as submitted.

#### Bug 1 (Critical) — `updateUser` silently drops free pool fields

**File:** `server/storage.js`, function `updateUser`
**Symptom:** `fulfillPayment.js` calls `storage.updateUser(userId, { plan: newPlan, freeCreditsUsed: 0, freeCreditsResetAt: null })` on paid plan upgrade. The allowlist in `updateUser` did not include `freeCreditsUsed` or `freeCreditsResetAt`. Both were silently dropped. Free pool was never zeroed on upgrade.
**Impact:** Free plan user upgrades to paid, sends campaign, free credits are still usable for the remainder of the month. Revenue leak — user gets 500 free credits they should no longer have.
**Fix:** Added `freeCreditsUsed` and `freeCreditsResetAt` to the `allowedUpdates` whitelist in `storage.js:updateUser`. Used `"freeCreditsResetAt" in updates` guard (not `!== undefined`) to allow `null` explicitly.

#### Bug 2 (Medium) — New users inherit `isTrialUser=true` DB default after `FREE_PLAN_ENABLED=true`

**Files:** `server/storage.js:createUser`, `server/memoryStorage.js:createUser`, `server/routes.js` (Google OAuth path)
**Symptom:** `is_trial_user` DB column default is `true`. `storage.js:createUser` did not set `isTrialUser` in the DB insert. Google OAuth path explicitly passed `isTrialUser: true`. After `FREE_PLAN_ENABLED=true`, new users created via invite accept or Google OAuth would get `isTrialUser=true`, bypassing the free plan path entirely. They'd get 5 legacy trial credits instead of 500 free plan credits.
**Impact:** All new user registrations after feature activation would be on the wrong credit path. Feature appears to work for backfilled users but fails for newly acquired users.
**Fix:**
- `storage.js:createUser`: derive `isTrialUser` from env (`FREE_PLAN_ENABLED !== "true"`). Respect explicit `false` from callers (e.g., `initializeRootAdmin`).
- `memoryStorage.js:createUser`: same logic for dev shim.
- `routes.js` Google OAuth: removed explicit `isTrialUser: true` — now falls through to env-derived default.

---

### Verification — 10 Items

#### 1. Free Credit Accounting

**A. New free user state:**

`createUser` inserts with `isTrialUser=false` (when `FREE_PLAN_ENABLED=true`), `freeCreditsUsed=0` (column default), `freeCreditsResetAt=NULL` (column default, means "never refreshed"). `sanitizeUser` computes `freeCreditsRemaining = MONTHLY_CREDITS['free'] - 0 = 500`, `monthlyFreeCredits = 500`.

`/api/credits/info` → `getTotalCreditsAvailable`:
- `isFreePlan=true` (because `freePlanEnabled && !isTrialUser && monthlyGrant>0`)
- `isStale=true` (resetAt is null → first-ever check)
- `effectiveUsed=0`, `freeRemaining=500`
- `freeResetDate = first UTC instant of next calendar month`
- Response: `{ paid:0, free:500, trial:0, total:500, isTrialUser:false, isFreePlan:true, freeResetDate:"...", monthlyFreeCredits:500 }`

**B. First email deduction (`deductCreditAtomic`):**

1. Reads user row in transaction (plan='free', isTrialUser=false, freeCreditsUsed=0, freeCreditsResetAt=NULL)
2. Step A: lazy refresh UPDATE fires — WHERE clause: `DATE_TRUNC('month', COALESCE(NULL,'1970-01-01') AT TIME ZONE 'UTC') < DATE_TRUNC('month', NOW() AT TIME ZONE 'UTC')` = `1970-01 < 2026-06 = true`. Reset fires. `freeCreditsUsed=0, freeCreditsResetAt=NOW()`. Inserts `creditTransactions` row type=`"free_monthly_grant"`.
3. Step B: deduct — WHERE clause: `(500 - free_credits_used) >= 1` = `(500-0) >= 1 = true`. `freeCreditsUsed` increments to 1. Inserts `creditTransactions` row type=`"free_usage"`, `balanceBefore=0`, `balanceAfter=1`.
4. `credited=true`, `creditSource="free"`. Paid pool: `creditsUsed` unchanged.
5. Audit log: `CREDITS_USED`, `details.source="free"`.

Paid pool: untouched. ✓

**C. Free credits exhausted (`canStartCampaign` with `freeCreditsUsed=500`):**

`freeRemaining = max(0, 500-500) = 0`. `paidRemaining = 0`. `totalAvailable = 0 < emailCount`. `blockReason = "free_exhausted"` (because `freePlanEnabled && !isTrialUser && freeRemaining===0 && paidRemaining===0 && monthlyGrant>0`). Returns `{ allowed:false, blockReason:"free_exhausted", creditsNeeded:N, creditsAvailable:0, freeRemaining:0, paidRemaining:0 }`.

Campaign blocked. ✓

**D. Free pool exhausted, paid credits available:**

`freeRemaining=0`, `paidRemaining=1000`. `totalAvailable = 1000 >= emailCount`. `canStartCampaign` returns `allowed:true`. `deductCreditAtomic` enters free path: Step B WHERE clause `(500 - 500) >= 1 = false`. `deducted = undefined`. `credited = false`. Falls through to paid path: `(1000 - 0 - 0) >= 1 = true`. `creditsUsed` increments. `creditSource = "paid"`. Free pool unchanged. ✓

Deduction order verified: free first, paid fallback. Correct per architecture decision.

---

#### 2. Concurrency Verification

**Race condition: two simultaneous requests with stale `freeCreditsResetAt`**

Both see `freeCreditsResetAt = 2026-05-01` (previous month). Both enter `deductCreditAtomic` simultaneously.

PostgreSQL READ COMMITTED isolation:

- **Request A** reads user row (freeCreditsUsed=0, freeCreditsResetAt=2026-05-01).
- **Request B** reads user row simultaneously (same committed state — no lock held during read).
- **Request A** issues Step A UPDATE: `WHERE DATE_TRUNC('month', '2026-05-01') < DATE_TRUNC('month', NOW())` = `'2026-05-01' < '2026-06-01'` = true. A acquires row lock, writes `freeCreditsUsed=0, freeCreditsResetAt=2026-06-14`. Returns 1 row.
- **Request B** issues Step A UPDATE: blocked on the same row lock until A commits.
- A commits transaction (Step A + Step B together).
- **Request B** re-evaluates WHERE: `DATE_TRUNC('month', '2026-06-14') < DATE_TRUNC('month', NOW())` = `'2026-06-01' < '2026-06-01'` = **false**. 0 rows returned. No-op.
- B continues with `usedAfterRefresh = user.freeCreditsUsed` (the stale read). But B then re-reads the actual `free_credits_used` from the DB in Step B's WHERE clause: `(500 - free_credits_used) >= 1`. This is evaluated against the current committed row, which now has `freeCreditsUsed = 1` (after A's deduction). B sees `(500-1) >= 1 = true`. B deducts, `freeCreditsUsed = 2`.

Result: refresh occurred exactly once. Credits not duplicated (500 not granted twice). Credits not lost (2 emails deducted from 500, 498 remain).

**Wait — subtle issue caught:** The `usedAfterRefresh` variable is computed from the SELECT result at the start of the transaction, not from a fresh SELECT after Step A. For Request B, `user.freeCreditsUsed = 0` (stale read from before A committed). `refreshed.length = 0`. `usedAfterRefresh = 0`. Step B WHERE: `(500 - free_credits_used) >= 1`. This is evaluated by PostgreSQL against the actual live row, which has `freeCreditsUsed=1` after A's commit. So `(500-1) >= 1 = true`. B deducts to `freeCreditsUsed=2`. Correct. The JavaScript variable `usedAfterRefresh=0` is only used as the `balanceBefore` value in the `creditTransactions` insert — it's slightly wrong (shows 0 instead of 1) but doesn't affect the balance calculation because the WHERE clause and `freeCreditsUsed + 1` are computed atomically by PostgreSQL.

**Verdict:** Race-safe. Refresh occurs exactly once. Credits correctly deducted.

---

#### 3. Payment Upgrade Verification

**Before upgrade:** `plan='free'`, `freeCreditsUsed=150`, `freeCreditsResetAt=2026-06-01`, `creditsReceived=0`

**Payment flow:** `razorpayWebhook.js → storage.completePayment() → upgradePlanIfHigher(userId, "starter")`

**`upgradePlanIfHigher` logic:**
- `newPlan = PLAN_MAP["starter"] = "starter"`, `PLAN_RANK["starter"] = 1 > PLAN_RANK["free"] = 0` → upgrade fires
- `currentPlan === "free"` → `clearFreePool = { freeCreditsUsed: 0, freeCreditsResetAt: null }`
- Calls `storage.updateUser(userId, { plan: "starter", freeCreditsUsed: 0, freeCreditsResetAt: null })`
- Bug 1 fix ensures both free pool fields are in `allowedUpdates`. DB write: `plan='starter', free_credits_used=0, free_credits_reset_at=NULL`
- Credits from payment: `completePayment` already called `allocateCredits` upstream which adds to `creditsReceived`. Paid pool is now > 0.

**After upgrade:** `plan='starter'`, `creditsReceived > 0`, `freeCreditsUsed=0`, `freeCreditsResetAt=NULL`, `MONTHLY_CREDITS['starter']=0`

**`getTotalCreditsAvailable`:** `monthlyGrant = MONTHLY_CREDITS['starter'] = 0` → `isFreePlan=false`, `freeRemaining=0`. `total = paidRemaining`. Dashboard shows paid credits only. Free credit section not rendered (`isFreePlan=false`).

**Verified:** plan updated ✓, credits allocated ✓, free pool zeroed ✓, dashboard shows paid pool only ✓.

---

#### 4. API Compatibility Review — `/api/credits/info` Consumers

Three frontend files consume `/api/credits/info`:

| File | Fields used | Old shape compatible? | Notes |
|---|---|---|---|
| `Dashboard.jsx` | `.total`, `.isFreePlan`, `.free`, `.monthlyFreeCredits`, `.freeResetDate` | ✓ `.total` still present; new fields optional-chained | Free credit section guarded by `creditsInfo?.isFreePlan` — renders nothing for non-free users |
| `CampaignConfirmation.jsx` | `.total`, `.isFreePlan`, `.free`, `.monthlyFreeCredits`, `.freeResetDate` | ✓ `.total` still present; new fields optional-chained | `isFreePlanExhausted = creditsInfo?.isFreePlan && (creditsInfo?.free ?? 0) === 0` — false for non-free users; existing alert still shown |
| `Payments.jsx` | `.total` only | ✓ unchanged | `currentBalance = creditsInfo?.total \|\| 0` — `.total` present in new shape |

Old shape: `{ paid, trial, total, isTrialUser }`. New shape adds: `{ free, isFreePlan, freeResetDate, monthlyFreeCredits }`. No old fields removed. All new fields optional-chained in consumers. **No breaking change.**

Cache invalidation: both `Payments.jsx` payment mutation handlers call `queryClient.invalidateQueries({ queryKey: ["/api/credits/info"] })`. Correct — cache refreshes after payment.

---

#### 5. Trial Migration — Orphaned References Audit

| Reference | File | Status |
|---|---|---|
| `AI_DAILY_LIMITS` | `schema.js`, `routes.js`, `storage.js` | Plan-keyed map — `free` key still used for free plan AI limits. Not tied to `isTrialUser`. Safe. |
| `PRICING_PLANS.trial` | `schema.js` | Still in schema for backward compat. Now filtered from `GET /api/pricing/plans` response (`plan.id !== "trial"`). Not purchasable. |
| `getEffectivePlan` | `storage.js`, called from `routes.js /api/auth/me` and AI route | Returns `user.plan || "free"`. Not touched. Safe — AI limits derive from `plan`, not `isTrialUser`. |
| `isTrialUser` checks in `deductCreditAtomic` | `storage.js` | Used as gate to skip free path (`if user.isTrialUser return`) and as condition for legacy trial path. Correct and intentional during transition period. |
| `isTrialUser` checks in `canStartCampaign` | `storage.js` | Same pattern. Correct. |
| `trialCredits`, `trialCreditsUsed` | `schema.js`, `storage.js`, `memoryStorage.js` | Columns retained. Legacy trial path still works for `is_trial_user=true` users during backfill window. Intentional backward compat. |
| Invite accept | `routes.js:1921` | Calls `createUser` without `isTrialUser`. Now env-derived (Bug 2 fix). After `FREE_PLAN_ENABLED=true`, new invited users get `isTrialUser=false`. ✓ |
| Google OAuth | `routes.js:647` | Previously forced `isTrialUser: true`. Bug 2 fix: removed explicit flag; env-derived. ✓ |
| Payment logic (`Payments.jsx`) | `client` | `PlanCard` checks `plan.isTrial` for rendering. `PRICING_PLANS.trial` still has `isTrial: true` but is now filtered from the API response — the trial plan card is never rendered. ✓ |
| `FREE_TRIAL_CREDITS` | `routes.js`, `schema.js` | Now an alias for `MONTHLY_CREDITS.free = 500`. Import in `routes.js` unchanged. Used in pricing plans response as `freeTrialCredits: 500`. Correct. |

**No orphaned trial logic that creates inconsistent behavior.** The transition is soft: `isTrialUser=true` users keep legacy behavior, `isTrialUser=false` users get free plan treatment. Backfill converts existing users atomically.

---

#### 6. Feature Flag Verification

`FREE_PLAN_ENABLED` env var controls three code paths:

| State | `deductCreditAtomic` | `canStartCampaign` | `getTotalCreditsAvailable` | `createUser` |
|---|---|---|---|---|
| `false` (default) | Skips free path entirely (outer `if (freePlanEnabled)` is false). Paid path → trial path. Exact current behavior. | Returns trial balance. No free pool refresh. | Returns `{ isFreePlan:false, free:0, freeResetDate:null, ... }`. | `isTrialUser=true`. Legacy trial. |
| `true` | Free path fires for `!isTrialUser` users with `monthlyGrant>0`. Paid and trial paths unchanged as fallbacks. | Returns free balance. Lazy refresh fires if stale. `blockReason` populated. | Returns `{ isFreePlan:true, free:N, freeResetDate:"...", ... }`. | `isTrialUser=false` (unless caller passes explicit `false`). |

**Rollback:** Set `FREE_PLAN_ENABLED=false` in Railway. No redeploy needed. Immediate effect on next request. Free path is skipped. All users fall through to paid or trial path. `freeCreditsUsed` and `freeCreditsResetAt` remain in DB but are never read or written until flag is re-enabled. Data is preserved, not corrupted.

**Edge case during partial backfill:** If `FREE_PLAN_ENABLED=true` and some users still have `isTrialUser=true` (not yet backfilled), those users get legacy trial path (5 credits) not free path (500 credits). This is intentional — backfill is the activation step per user. The flag enables the code path; the backfill enables it per user.

---

#### 7. UI Walkthrough

**Dashboard — free plan user:**
- Hero card: "Available Credits" shows 500 (or remaining). "Free Used" label replaces "Used (Lifetime)" with `freeCreditsUsed / 500` format.
- Credit Summary card: 2×2 grid (Received/Allocated/Used/Available) unchanged for compatibility. Below it: cyan-bordered "Free Credits This Month" section with X/500 label, progress bar (filled = used portion), and "Resets Jul 1" date.
- Non-free users: hero shows "Used (Lifetime)" as before. No free credit section rendered.

**Customer clarity issues found and pre-emptively fixed:**
1. "Used This Month" label was misleading (showing lifetime `creditsUsed`). Fixed to "Free Used: X/500" for free users, "Used (Lifetime)" for paid users.
2. Progress bar fills left-to-right as credits are consumed — visually clear.
3. "Resets Jul 1" uses short date format — unambiguous for a monthly renewable resource.

**Campaign confirmation — free exhausted:**
- Before: "You need N more credits to send this campaign. Buy more credits →"
- After (free-exhausted): "Your 500 free credits for this month are used up. [calendar icon] Resets in 17 days. Purchase credits to send now →"
- After (paid-exhausted): original message unchanged.

**Remaining UX gaps (acknowledged, not blocking):**
- Dashboard Credit Summary "Used" tile still shows lifetime `creditsUsed`, not monthly. For free plan users this is confusing (their paid creditsUsed is 0 anyway). Low impact given the free credit section below it shows the correct monthly figure. Can be addressed in a separate pass.
- No visual indicator in hero "Available Credits" showing free vs paid breakdown. Users see the total. The Credit Summary card provides the breakdown.

---

#### 8. Production Impact Review

**Step 1: `npm run db:push`**
- Adds 2 columns (`free_credits_used`, `free_credits_reset_at`) to `users` table.
- Both have defaults (`NOT NULL DEFAULT 0`, nullable respectively). All existing rows get defaults without a table lock (PostgreSQL adds nullable columns and NOT NULL with defaults via catalog update only — no row rewrite for INTEGER DEFAULT 0).
- Risk: None. Additive schema change.
- Worst case: `drizzle-kit push` connectivity failure — retry. No data loss.

**Step 2: Deploy code (current branch)**
- With `FREE_PLAN_ENABLED` unset or `false`, code is inert. Free path never enters.
- New columns are read by `sanitizeUser` — returns `freeCreditsRemaining=0`, `monthlyFreeCredits=0` for all existing users (since their `plan` is not 'free' until they're on the free plan, OR `FREE_PLAN_ENABLED=false` so the path is skipped).
- Risk: None in flag-off state.

**Step 3: `FREE_PLAN_ENABLED=true`**
- Existing `isTrialUser=true` users: no behavior change — free path skips them (`if user.isTrialUser return`), paid/trial paths work as before.
- New users: now get `isTrialUser=false`, enter free plan path.
- Risk: Existing users NOT affected until backfill runs. Feature only activates per-user via backfill or by being a new user.

**Step 4: Backfill**
```sql
UPDATE users SET is_trial_user = false WHERE plan = 'free' AND is_active = true;
```
- Converts all active free plan users to free plan path.
- They get 500 free credits on their next credit-touching action (lazy refresh).
- Risk: Irreversible without rollback SQL. Rollback: `UPDATE users SET is_trial_user = true WHERE plan = 'free' AND is_active = true;` — immediately reverts behavior. Rollback with `FREE_PLAN_ENABLED=false` fully restores old behavior.
- Worst case: backfill runs during concurrent campaign → campaign mid-run sees `isTrialUser=false` on next deduction attempt. Free pool has `freeCreditsUsed=0` (no refresh yet) and `freeCreditsResetAt=NULL`. Lazy refresh fires. User gets 500 free credits. Campaign continues. No failure.

**SES cost impact:** At 500 free credits/user/month, $0.05/user/month. At 1,000 free users: $50/month. Manageable at current scale.

---

#### 9. Documentation

Updated in this session:
- `PROGRESS.md`: Milestone 12 updated to `I` (implemented), verification status added
- `HANDOFF.md`: "Pending Architecture Decisions" table updated; Free Plan entry promoted to `IMPLEMENTED — PENDING PRODUCTION VERIFICATION`
- `AUDIT_TRAIL.md`: This entry (Audit 012) documents all verification findings and bug fixes

---

#### 10. Final Classification

| Component | Status |
|---|---|
| Schema changes (schema.js) | `IMPLEMENTED` |
| Storage layer (storage.js) | `IMPLEMENTED` (after Bug 1 + Bug 2 fixes) |
| Memory shim (memoryStorage.js) | `IMPLEMENTED` (mirrored) |
| Payment upgrade zeroing (fulfillPayment.js) | `IMPLEMENTED` (after Bug 1 fix in updateUser) |
| Routes (acceptLimiter, log line, pricing filter) | `IMPLEMENTED` |
| CampaignConfirmation UX | `IMPLEMENTED` |
| Dashboard UX | `IMPLEMENTED` |
| **Overall** | **`IMPLEMENTED — NOT YET VERIFIED IN PRODUCTION`** |

**Not classified as `VERIFIED IN TESTS`** because no automated test harness exists for this feature. Verification above is code-trace analysis, not execution evidence.

**Not classified as `VERIFIED IN PRODUCTION`** — requires `db:push`, backfill, and at least one complete send cycle from a free plan user.

**Deployment blocked on T-1 through T-5 production verification** as originally stated. This classification does not change that constraint.

---

## Audit 013 — Production Deliverability + Campaign Execution Investigation

**Date:** 2026-06-14 to 2026-06-16
**Conducted by:** Claude Sonnet 4.6 + AK Singh
**Scope:** Post-campaign production evidence analysis — campaign execution correctness, credit system audit, suppression audit, deliverability audit, Gmail placement root-cause analysis
**Trigger:** Production test campaign (6 contacts): 3 sent, 2 Spam, 1 Promotions, 0 Primary. False "account ran out of credits" UI message appeared despite sufficient credits.
**Commits reviewed:** `worker.js`, `routes.js`, `storage.js`, `memoryStorage.js`, `email.js`, `ai.js`, `History.jsx`

---

### Section 1 — Campaign Execution Analysis

**Production data:**

| Field | Value |
|---|---|
| totalEmails | 6 |
| sentEmails | 3 |
| skippedEmails | 3 |
| failedEmails | 0 |
| status | COMPLETED |

Math check: `6 − 3 − 0 − 3 = 0` → all contacts were processed. Loop completed in full.

**Root cause of "3 of 6" result:** 3 contacts were pre-suppressed. Worker ran `isSuppressed()` then `isGloballySuppressed()` for each. 3 returned true → `skippedCount++`, `status=SUPPRESSED` in `campaign_emails`. Not credit exhaustion.

**Confirmed:** `credits_used` incremented 12 → 13 → 14 → 15 (3 successful deductions via `deductCreditAtomic` paid path). `outOfCredits` flag never set.

**False credit warning — UI bug (now fixed):**
- `History.jsx:363`: condition `status === "COMPLETED" && sentEmails < totalEmails` triggered for any shortfall including suppression skips.
- Fix: replaced with `totalEmails - sentEmails - failedEmails - skippedEmails > 0` — detects truly unprocessed contacts (loop broke early) only.
- Separate blue info banner added for suppression-only skips (all contacts processed, some skipped).
- Committed: `f2b4cfa`

---

### Section 2 — Credit System Audit

| Item | Finding |
|---|---|
| `creditsRemaining` | Virtual computed field in `sanitizeUser()` — NOT a DB column. `creditsReceived - creditsAllocated - creditsUsed`. |
| `canStartCampaign` | Reads virtual `creditsRemaining`, checks `totalAvailable >= emailCount`. 89,985 ≥ 6 → allowed. |
| `deductCreditAtomic` paid path | Atomic `WHERE (credits_received - credits_allocated - credits_used) >= 1`. 3× succeeded. |
| `outOfCredits` flag | Never set. Would only fire if `deductCreditAtomic` throws "Insufficient credits" AFTER a send. |

**No credit system defect found.** UI displayed a false positive. Credit system behaved correctly throughout.

---

### Section 3 — Suppression Audit

**Suppression check sequence (`worker.js:391–407`):**
1. `isSuppressed(userId, email)` — per-user: `WHERE userId AND email`
2. `isGloballySuppressed(email)` — platform-wide: `WHERE email` (no userId filter)
3. If either true: `skippedCount++`, `campaign_emails.status = SUPPRESSED`

**Scope note:** `isGloballySuppressed` checks ALL suppressions across ALL users. A contact suppressed by any user blocks sends from every user on the platform. Intentional design decision.

**Gap identified:** `campaign_emails` records show `status=SUPPRESSED` with no source, reason, or timestamp. Users could not tell WHY a contact was skipped from the campaign history view.

**Fixes committed:**

| Commit | Fix |
|---|---|
| `a6c25bf` | `Suppressions.jsx` — full suppression list page with source badge, reason, timestamp, searchable table |
| `379006a` | `GET /api/campaigns/:id` enriches SUPPRESSED records with `suppressionDetail: { source, reason, suppressedAt, scope }` via `getSuppressionDetailsForEmails()` batch lookup |
| `379006a` | Campaign detail modal: Suppression column added to Recipients table. Shows source badge + reason text + suppressedAt. Falls back to "Unknown suppression source" if no record found. |
| `379006a` | Worker and inline executor: `getSuppressionRecord()` called per suppressed contact. Logs `scope`, `source`, `reason`, `suppressedAt`. Both `worker.js` and `executeCampaign` in `routes.js`. |

No schema changes required. `getSuppressionRecord` and `getSuppressionDetailsForEmails` added to both `dbStorage` (`storage.js`) and `memoryStorage.js`.

---

### Section 4 — Deliverability Audit

**DNS evidence (queried 2026-06-14, Google DNS 8.8.8.8):**

| Mechanism | Evidence | Result |
|---|---|---|
| SPF | `v=spf1 include:dc-8e814c8572._spfm.letszero.in ~all` | Covers Zoho only. SES not included. `~all` softfail. Return-Path is `amazonses.com` (no Custom MAIL FROM). SPF DMARC alignment fails. |
| DKIM | SES Easy DKIM enabled and Verified (confirmed from AWS SES console). Signs with `d=letszero.in`. | PASS. DMARC alignment via DKIM passes in relaxed mode. `d=letszero.in` = From `letszero.in`. |
| DMARC | Two TXT records at `_dmarc.letszero.in` (RFC 7489 §6.6.3 violation → permerror → DMARC fails) | **CRITICAL — see resolution below** |
| Custom MAIL FROM | Not configured. Return-Path: `bounces+xxx@eu-north-1.amazonses.com`. | SPF alignment fails. Compensated by DKIM alignment. Low priority. |
| SES_CONFIGURATION_SET | Absent from production Railway env vars. | No open/click tracking active in production. |

**DMARC at time of audit (2026-06-14):**
```
_dmarc.letszero.in  v=DMARC1; p=none;
_dmarc.letszero.in  v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;
```
Two records → RFC 7489 `permerror` → Gmail treats as DMARC failed.

**DMARC after DNS fix (re-verified 2026-06-16 via nslookup against Google DNS 8.8.8.8):**
```
_dmarc.letszero.in  v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;
```
One record only. `p=none` record deleted. `permerror` resolved. DMARC now passes via DKIM alignment on next send.

**Content changes committed `f2b4cfa`:**
- Unsubscribe footer: removed "outreach campaign" framing; replaced with first-person plain text.
- AI system prompts: reframed from "marketing copywriter / high-converting" to "one-to-one personal communication."
- Prohibited vocabulary: expanded (exclusive, luxury, premium, bonus, grand opening, limited offer, VIP, invitation, etc.).
- Subject validator: `PROMOTIONAL_SUBJECT_RE` pattern added; 5 new `PROHIBITED_SUBJECT_STARTERS`.

---

### Section 5 — Gmail Placement Analysis

**Test campaign result:** 0 Primary, 1 Promotions, 2 Spam (3 delivered, 3 suppressed)

| Cause | Spam/Promotions impact | Status |
|---|---|---|
| Duplicate DMARC → permerror | Primary Spam cause | **FIXED — DNS admin action 2026-06-16** |
| New domain, zero engagement history | Primary Spam cause | Cannot be code-fixed — requires warm-up |
| "Exclusive Grand Opening Invitation" subject | Promotions/Spam signal | **Fixed — AI changes in f2b4cfa** |
| "outreach campaign" footer language | Promotions signal | **Fixed — footer rewrite in f2b4cfa** |
| `noreply@` From address | Promotions signal | Deferred — requires SES identity + real inbox |
| HTML template structure (max-width, Arial, border-top footer) | Promotions signal | Deferred — auth must be confirmed first |

**Expected outcome after DMARC fix + code changes deployed:** Spam → Promotions improvement likely. Primary inbox requires positive engagement history (domain warm-up — not a code problem).

**Post-fix verification required:** Send one test email to Gmail → "Show original" → confirm `dmarc=pass` in Authentication-Results header.

---

### Section 6 — Code Changes (All Committed Locally)

| Commit | Summary | Key files |
|---|---|---|
| `a6c25bf` | Suppression list page with source/reason/timestamp | `client/src/pages/Suppressions.jsx`, `App.jsx`, `Navbar.jsx` |
| `f2b4cfa` | Footer rewrite, AI prompt reframing, subject validator, campaign history UI fix | `server/email.js`, `server/ai.js`, `client/src/pages/History.jsx` |
| `379006a` | Suppression detail in campaign modal + enhanced worker logging | `server/storage.js`, `server/memoryStorage.js`, `server/routes.js`, `server/worker.js`, `client/src/pages/History.jsx` |

All three commits were local-only as of 2026-06-16. Push to `origin/main` and Railway deploy required for production effect.

---

### Section 7 — Infrastructure Changes

| Change | Method | Status |
|---|---|---|
| DMARC duplicate record removed | DNS admin (manual) | **DONE — verified 2026-06-16** |
| SES Custom MAIL FROM | Deferred — DKIM alignment covers DMARC | Not done |
| SPF: add SES to record | Deferred — low urgency given DKIM alignment | Not done |
| `SES_CONFIGURATION_SET` in Railway | Pending — required for open/click tracking | Not done |

---

## Audit 014 — Deliverability Hardening: Header Compliance + Production-Path Verification

**Date:** 2026-06-16
**Conducted by:** Claude Sonnet 4.6 + AK Singh
**Scope:** Root-cause investigation of SPF/DKIM/DMARC PASS email landing in Gmail Spam, followed by RFC compliance header implementation and production-path verification send.
**Trigger:** Gmail deliverability test (2026-06-16) confirmed SPF=PASS / DKIM=PASS / DMARC=PASS but delivered to Spam.
**Commits:** `5b396b9` — `server/email.js`, `tmp/test-campaign-path.mjs`

---

### Section 1 — Root Cause Investigation

**Test email anatomy — wrong code path:**

The first deliverability test (`tmp/test-deliverability.mjs`) was a raw inline nodemailer script that bypassed `server/email.js` entirely. It produced an email structurally inferior to production campaign emails:

| Property | Test Script | Production sendCampaignEmail() |
|---|---|---|
| Footer | None | `buildUnsubscribeFooter()` — body link + text |
| List-Unsubscribe header | Not set | **Not set (pre-fix gap)** |
| HTML structure | None (raw text) | Full HTML document |
| Placeholder substitution | None | `replacePlaceholders()` |
| Sender profile | Hardcoded | DB-resolved from `owner.*` fields |

**Authentication result (confirmed from Gmail "Show original"):**

```
SPF  = PASS
DKIM = PASS
DMARC = PASS
```

Authentication is necessary but not sufficient for inbox placement. Gmail's spam classification operates at three independent layers after authentication:

1. **Domain reputation** — `letszero.in` is a new sending domain with zero Gmail engagement history. No opens, replies, or inbox moves on record. New domains start at minimum trust.
2. **Content classification** — The test email hit 5+ documented cold-outreach ML signals:
   - Subject: `"wanted to follow up with you"` — highest-frequency cold outreach subject
   - Body: `"Hope you're doing well"` — #1 classified cold email opener
   - Body: `"check in and see how things have been going on your end"` — textbook cold phrasing
   - Body: `"let me know if this landed in your inbox"` — literal spam-test language
   - Body: `"run a quick test to make sure everything is reaching the inbox properly"` — adversarial to Gmail ML
3. **Missing compliance headers** — `List-Unsubscribe` as an RFC 2369 message header was absent from `sendCampaignEmail()`. Gmail's 2024 bulk sender policy requires this header; its absence is a structural negative signal independent of content.

**Pre-fix header audit (`server/email.js:sendCampaignEmail`, commit `5c72f9b`):**

| Header | Present | Notes |
|---|---|---|
| `Message-ID` | Auto (nodemailer) | `<uuid@letszero.in>` — correct domain |
| `Date` | Auto (nodemailer) | Always set |
| `MIME-Version` | Auto (nodemailer) | `1.0` |
| `Reply-To` | Conditional | When `senderProfile.replyToEmail` set |
| `X-SES-CONFIGURATION-SET` | Conditional | When `SES_CONFIGURATION_SET` env var set AND `campaignEmailId` provided |
| `X-SES-MESSAGE-TAGS` | Conditional | Same condition as above |
| `List-Unsubscribe` | **Missing** | RFC 2369 — required by Gmail 2024 policy |
| `List-Unsubscribe-Post` | **Missing** | RFC 8058 — required for Gmail one-click unsubscribe button |
| `Feedback-ID` | **Missing** | Gmail Postmaster Tools complaint tracking |

The unsubscribe body link was present (`buildUnsubscribeFooter()` was called and appended to the HTML and text parts). The RFC 2369 header was absent. These are evaluated independently by Gmail.

---

### Section 2 — Corrections to Audit 013 Findings

Audit 013 Section 4 recorded `SES_CONFIGURATION_SET` as absent from Railway env vars. This was incorrect — the analysis was based on reading the local `.env` file rather than the Railway environment. `railway variables` confirms:

```
SES_CONFIGURATION_SET = my-first-configuration-set
```

SES event tracking (bounces, complaints, opens, clicks to SNS) has been active in production. The blocking item in Milestone 9 and the PROGRESS.md stale blockers that reference this gap should be disregarded.

---

### Section 3 — Code Changes

**File:** `server/email.js`

**Change 1 — `buildUnsubscribeFooter()` returns `url` (line 153):**

```diff
-if (!userId || !email) return { html: "", text: "" };
+if (!userId || !email) return { url: null, html: "", text: "" };
 ...
 return {
+  url,
   html: `...`,
   text: `...`,
 };
```

The URL was previously generated and embedded only into the HTML/text body. Now it is also returned in the result object so the caller can use it for the `List-Unsubscribe` header without a second call to `generateUnsubscribeToken`.

**Change 2 — Unified headers block (lines 124–151):**

```diff
-if (process.env.SES_CONFIGURATION_SET && campaignEmailId) {
-  mailOptions.headers = {
-    "X-SES-CONFIGURATION-SET": process.env.SES_CONFIGURATION_SET,
-    "X-SES-MESSAGE-TAGS": `campaign-email-id=${campaignEmailId}`,
-  };
-}
+const headers = {};
+
+if (unsubscribeFooter.url) {
+  headers["List-Unsubscribe"]      = `<${unsubscribeFooter.url}>`;
+  headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
+}
+if (campaignEmailId) {
+  headers["Feedback-ID"] = `${campaignEmailId}:repmail`;
+}
+if (process.env.SES_CONFIGURATION_SET && campaignEmailId) {
+  headers["X-SES-CONFIGURATION-SET"] = process.env.SES_CONFIGURATION_SET;
+  headers["X-SES-MESSAGE-TAGS"]      = `campaign-email-id=${campaignEmailId}`;
+}
+if (Object.keys(headers).length > 0) {
+  mailOptions.headers = headers;
+}
```

**Post-fix header audit — every production campaign email:**

| Header | Present | Source |
|---|---|---|
| `Message-ID` | Always | nodemailer auto, `@letszero.in` domain |
| `Date` | Always | nodemailer auto |
| `MIME-Version` | Always | nodemailer auto, `1.0` |
| `Reply-To` | Conditional | `senderProfile.replyToEmail` |
| `List-Unsubscribe` | Always (when user + email exist) | `<https://www.letszero.in/api/unsubscribe?...>` |
| `List-Unsubscribe-Post` | Same condition | `List-Unsubscribe=One-Click` |
| `Feedback-ID` | When `campaignEmailId` set | `{campaignEmailId}:repmail` |
| `X-SES-CONFIGURATION-SET` | Conditional | `my-first-configuration-set` |
| `X-SES-MESSAGE-TAGS` | Conditional | `campaign-email-id={id}` |

**Not added — deliberate:**
- `Precedence: bulk` — counterproductive for conversational B2B outreach. Signals to Gmail "this is bulk mail" and increases Promotions/Spam routing. RepMail targets personal outreach, not newsletters.

---

### Section 4 — Production-Path Test Send

**Test utility:** `tmp/test-campaign-path.mjs` — calls `sendCampaignEmail()` directly. Identical code path to campaign worker.

**Evidence:**

```
SES_FROM_EMAIL      : support@letszero.in
SES_CONFIGURATION_SET: my-first-configuration-set
APP_URL             : https://www.letszero.in

messageId : <d2516972-aa9f-552b-ead2-e3d026d9fae1@letszero.in>
response  : 250 Ok 0110019ecf4fef46-ff16a03d-df7d-4fd3-bd53-c99ee7b994fd-000000
accepted  : [ 'singh.abhishek73821@gmail.com' ]
rejected  : []
```

Content profile:
- Subject: `"a note from the RepMail team"` — factual, no cold-outreach signals
- Body: sender identity self-introduction, no "check in" / "follow up" / "hope you're doing well" patterns
- From: `"Abhishek Singh" <support@letszero.in>` — real sender name via `senderProfile`
- Reply-To: `support@letszero.in`
- Headers: `List-Unsubscribe`, `List-Unsubscribe-Post`, `Feedback-ID`, `X-SES-CONFIGURATION-SET`, `X-SES-MESSAGE-TAGS` — all present

**Gmail placement result (pending user confirmation).**

---

### Section 5 — Deployment Verification

| Step | Evidence |
|---|---|
| Commit `5b396b9` on `origin/main` | `git log --oneline origin/main -1` → `5b396b9 [DELIVERABILITY] Add List-Unsubscribe, List-Unsubscribe-Post, Feedback-ID headers` |
| Railway auto-deploy triggered | Deployment `7c96b2a0` appeared within 60s of push, status `BUILDING → DEPLOYING` |
| Prior successful deployment | `3bff9188` = `5c72f9b` (all prior session commits deployed and confirmed) |

Railway deployment `7c96b2a0` **SUCCESS** — confirmed via `railway deployment list`. Startup logs:

```
[PRODUCTION MODE] Connected to PostgreSQL database
[STORAGE] Active adapter: PostgreSQL (PRODUCTION)
[WORKER] BullMQ campaign worker started (concurrency=3)
[REDIS] Connected
[SMTP-DIAG] TCP OK — connected to email-smtp.eu-north-1.amazonaws.com:2587
serving on port 8080
[QUEUE] Campaign queue initialized
```

No error lines. All subsystems healthy. Commit `5b396b9` is live in production.

---

## Audit 015 — AI Quality Overhaul: Prompt Redesign + Validation Hardening + Metrics UX

**Date:** 2026-06-16
**Conducted by:** Claude Sonnet 4.6 + AK Singh
**Scope:** Full redesign of AI email generation prompts in `server/ai.js`, new validation hard-blocks in `validateTemplate`, and campaign metrics UX fix in `client/src/pages/History.jsx`
**Trigger:** Production-generated emails exhibited: prompt leakage ("Rephrase to a more direct question..."), sign-off phrase garbage ("Best regards, repmail, complimentary lance, letszero"), generic clichéd openers ("I hope this message finds you well"), marketing subject lines ("Streamlining Your Sales Outreach"), and 100% Delivery Rate displayed when contacts were suppressed.

---

### Section 1 — Root Causes

#### Finding 1: SIGN-OFF FORMAT lines in CAMPAIGN_TYPE_PREAMBLES

All 6 campaign type preambles (`b2b_outreach`, `real_estate`, `recruitment`, `partnership`, `follow_up`, `general`) contained explicit `SIGN-OFF FORMAT:` lines instructing the model to include full name/title/company as a structured closing. When combined with `senderIdentityBlock` which said "Sign off with their full name, title, and company on separate lines," the model generated a greeting phrase ("Best regards,") as a transition before the `{{sender_name}}` placeholder block. The platform then substitutes the sender profile data, producing "Best regards,\nrepmail\ncomplimentary lance\nletszero" when the test user had garbage data in their profile fields.

**Fix:** Removed all `SIGN-OFF FORMAT:` lines. Replaced each with: `The email body ends with the CTA question. The sender placeholder block follows on the next line — no "Best regards", "Thanks", or similar phrase before it.`

#### Finding 2: senderIdentityBlock instructed sign-off phrase generation

The `senderIdentityBlock` contained "Sign off with their full name, title, and company on separate lines" — a direct instruction to include a sign-off transition before the placeholders.

**Fix:** Rewritten to "The email body ends with `{{sender_name}}` / `{{sender_title}}` / `{{sender_company}}` as the sign-off — no greeting phrase (Best regards, Kind regards, Thanks, Sincerely, Cheers, etc.) before the placeholder block."

#### Finding 3: System prompt lacked explicit cliché prohibitions

The prior system prompt prohibited spam vocabulary (free, exclusive, VIP, etc.) but contained no prohibition on:
- Cold-email opener clichés ("I hope this message finds you well", "I'm reaching out to", "touching base")
- Sign-off phrase generation ("Best regards", "Sincerely", "Thanks")
- Subject line marketing patterns ("Streamlining Your X", "Maximizing Your X")
- Output meta-commentary ("Rephrase to...", "Note:", "Insert here")

**Fix:** Added five named rule blocks to the system prompt: SUBJECT LINE RULES, PROHIBITED OPENING PHRASES, PROHIBITED SIGN-OFF PHRASES, BODY RULES, OUTPUT RULES.

#### Finding 4: No leaked instruction detection in validateTemplate

The model at temperature 0.8 could output instruction-like text in its response. The existing validation checked for bracket artifacts, unknown placeholders, sign-off presence, and fabricated relationship phrases — but not for leaked prompt instructions appearing verbatim in the email body.

**Fix:** `LEAKED_INSTRUCTION_RE` added as module-level constant. Step 10 hard-blocks generation if the subject or body contains patterns like "Rephrase to", "Note:", "Insert here", "Customize this", "[Personalize]", etc.

#### Finding 5: No sign-off phrase detection in validateTemplate

Even with the prompt hardening, the model might still generate a greeting phrase before `{{sender_name}}` under some temperature configurations. No safety net existed.

**Fix:** `SIGNOFF_PHRASE_RE` added. Step 11 hard-blocks if a sign-off phrase is detected without `{{sender_name}}` (model omitted the placeholder entirely). Step 11 also warns if both are present (double sign-off scenario).

#### Finding 6: No filler opener detection in validateTemplate

**Fix:** `FILLER_OPENER_RE` added. Step 12 warns if the body opens with a banned cliché opener.

#### Finding 7: Campaign list "Delivery Rate" column showed 100% despite suppressions

The `Delivery Rate` column was computed as `deliveredEmails / sentEmails` — the fraction of sent emails confirmed delivered by SNS. For a campaign with `totalEmails=6, sentEmails=3, skippedEmails=3`, this showed `100%` delivery rate with no indication that 3 contacts were suppressed. The list-level view had no "Skipped" column (only the detail modal did).

**Fix:** Replaced the "Delivered" column with a "Skipped" column in the campaign list table. Renamed "Delivery Rate" to "Reach" and changed the denominator to `sentEmails / totalEmails` — showing what fraction of the intended list was actually reached. Color logic: emerald at 100% (all contacts reached), amber at < 100% (some skipped/failed). Skipped cell shows amber value when `skippedEmails > 0`, dash otherwise.

---

### Section 2 — Changes

#### server/ai.js

| Area | Change |
|---|---|
| `CAMPAIGN_TYPE_PREAMBLES` (all 6 types) | Removed `SIGN-OFF FORMAT:` lines; replaced with no-greeting-phrase ending note |
| `senderIdentityBlock` — personal branch | "end with `{{sender_name}}` on its own line — no greeting phrase" |
| `senderIdentityBlock` — non-personal branch | "ends with `{{sender_name}}` / `{{sender_title}}` / `{{sender_company}}` — no greeting phrase before the placeholder block" |
| `generateTemplate` system prompt | Added: SUBJECT LINE RULES (3-7 words, lowercase preferred); PROHIBITED OPENING PHRASES (13 banned patterns); PROHIBITED SIGN-OFF PHRASES (10 banned phrases); BODY RULES (120 word limit, 3 paragraphs max); OUTPUT RULES (anti-leakage, JSON-only) |
| `max_tokens` | 1200 → 900 (shorter outputs, reduces token cost, forces concision) |
| `LEAKED_INSTRUCTION_RE` | New module-level constant — detects "Rephrase to", "Note:", "Insert here", etc. |
| `SIGNOFF_PHRASE_RE` | New module-level constant — detects standalone sign-off phrases |
| `FILLER_OPENER_RE` | New module-level constant — detects cold-email opener clichés |
| `validateTemplate` Step 10 | Leaked instruction hard-block |
| `validateTemplate` Step 11 | Sign-off phrase detection: hard-block (no placeholder) or warn (double sign-off) |
| `validateTemplate` Step 12 | Filler opener warning |
| Telemetry step | Renumbered to Step 13 |

#### client/src/pages/History.jsx

| Area | Change |
|---|---|
| Table column "Delivered" | Replaced with "Skipped" — shows `skippedEmails ?? 0` in amber, dash when zero |
| Table column "Delivery Rate" | Renamed to "Reach" — computed as `sentEmails / totalEmails * 100`; emerald at 100%, amber below |
| `deliveryRate` variable | Removed; replaced with `reachRate` |

---

### Section 3 — Before/After Output Examples

**Before (from production):**

Subject: `Streamlining Your Sales Outreach`

Body excerpt:
> I hope this message finds you well. I am reaching out because I believe RepMail could be a great asset for your sales outreach efforts... [150-word body with marketing language] ...
>
> Rephrase to a more direct question for better engagement.
>
> Best regards,
> repmail
> complimentary lance
> letszero

**After (expected from new prompts):**

Subject: `sales process at {{company}}`

Body:
> Hi {{name}},
>
> Saw that {{company}} is scaling its outbound. Teams adding reps without fixing the underlying outreach process usually hit a wall around 30% response drop-off within 90 days.
>
> We built RepMail specifically for that inflection point — sequences that read like direct messages, not campaigns.
>
> Worth a quick call this week?
>
> {{sender_name}}
> {{sender_title}}, {{sender_company}}

---

### Section 4 — Validation Pipeline (Post-Audit)

| Step | Code | Severity | Trigger |
|---|---|---|---|
| 1 | BRACKET_ARTIFACT | warn + repair | `[Your Name]`, `[Company]`, etc. |
| 2 | EMPTY_SUBJECT / EMPTY_BODY | hard block | Post-repair empty content |
| 3 | PLACEHOLDER_IN_SUBJECT / BODY | hard block | Unknown `{{...}}` tags |
| 4 | SUBJECT_TOO_LONG / LENGTH_WARNING | warn | > 50 or > 40 chars |
| 4 | RE_PREFIX_SUBJECT | warn | Cold email starts with "Re:" |
| 4 | SUBJECT_PROHIBITED_PATTERN | warn | "Quick question", "Following up", etc. |
| 4 | SUBJECT_PROMOTIONAL_LANGUAGE | warn | Luxury, exclusive, grand opening, etc. |
| 5 | BODY_TOO_LONG / SHORT | warn | > 180 or < 30 words |
| 6 | NO_CTA_QUESTION / MULTIPLE_CTA | warn | Zero or multiple `?` in closing |
| 7 | NO_SIGNOFF_DETECTED | warn | No `{{sender_name}}` and no short-line pattern |
| 8 | REAL_ESTATE_COMPANY_PLACEHOLDER | warn | `{{company}}` in real estate email |
| 9 | FABRICATED_RELATIONSHIP | warn | "as we discussed", "last time we spoke", etc. |
| **10** | **LEAKED_INSTRUCTION** | **hard block** | "Rephrase to", "Note:", "Insert here", etc. |
| **11** | **SIGNOFF_PHRASE_WITHOUT_PLACEHOLDER** | **hard block** | Sign-off phrase with no `{{sender_name}}` |
| **11** | **SIGNOFF_PHRASE_WITH_PLACEHOLDER** | **warn** | Sign-off phrase before `{{sender_name}}` |
| **12** | **FILLER_OPENER** | **warn** | Body opens with banned cliché |
| 13 | *(Telemetry)* | — | All warnings + repairs logged as structured JSON |

Steps 10–12 are new in this audit.

---

### Section 5 — Status

`IMPL` — code changes complete. Not yet deployed.
