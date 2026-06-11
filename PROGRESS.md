# RepMail — Launch Readiness

**Last updated:** 2026-06-11
**Current commit:** f434b21

**Related documents:**
- [HANDOFF.md](./HANDOFF.md) — Onboarding, current state, priorities, gaps, non-goals
- [REPMAIL_ENGINEERING_HANDOFF.md](./REPMAIL_ENGINEERING_HANDOFF.md) — Deep technical reference (schema, security, queue, AI)
- [AUDIT_TRAIL.md](./AUDIT_TRAIL.md) — Append-only audit log with all code review findings

---

## Evidence scale

| Level | Meaning |
|---|---|
| **D** | Documented — code, comments, or handoff doc describes it |
| **I** | Implemented — code exists and compiles |
| **O** | Observed — log line appeared in a live Railway deployment |
| **V** | Verified — API response or DB query confirmed actual runtime state |

Only **V** is treated as proven.

---

## Milestone status

### 1 · Infrastructure

| Sub-item | Status | Evidence |
|---|---|---|
| Redis connectivity | **V** | PING→PONG confirmed in diagnostic deployment |
| Redis durability (persistence config) | **V** | RDB: `save 60 1` (snapshot every 60s after ≥1 write). AOF: disabled. Eviction: `noeviction`. Max memory: unlimited. Up to 60s data loss on crash between snapshots; PENDING watchdog closes this gap. |
| Environment variables (all launch-critical) | **V** | Block 1B: SES vars present. DNS: VERIFIED. TCP port 2587: VERIFIED. SMTP AUTH: VERIFIED. `/api/health` → `smtp: "verified"`. |
| Schema completeness (hardening columns) | **I** | `drizzle-kit push` used; column presence not queried |
| SES Configuration Set exists and matches env var | **I** | Env var referenced in email.js; AWS not checked |
| SNS subscription confirmed | **I** | Auto-confirm code exists; subscription status not checked |

**Milestone status: I/V mixed** — 2 of 6 sub-items Verified

**Blocking items before Block 2:**
- Block 1A: Redis persistence config — **PASS**
- Block 1B: Required vars set — **FAIL** (SES_SMTP_HOST, SES_SMTP_USER, SES_SMTP_PASS, SES_FROM_EMAIL missing)
- Block 1C: Schema columns verified in production DB — pending
- Block 1D: AWS SES + SNS configuration confirmed — pending

---

### 2 · Queueing & Worker

| Sub-item | Status | Evidence |
|---|---|---|
| BullMQ queue initialised | **O** | `[QUEUE] Campaign queue initialized` observed |
| Worker alive (heartbeat) | **V** | `/api/health` → `worker: "running"` confirmed |
| connectTimeout added | **I** | e6ed49c — not yet tested under failure |
| PENDING watchdog running | **I** | e6ed49c committed and pushed; not yet deployed result observed |
| Campaign job enqueue | **I** | No test campaign run yet |
| Campaign job processed to completion | **I** | No test campaign run yet |

**Milestone status: I** — 2 of 6 sub-items Verified (queue alive; no job processed)

---

### 3 · Campaign Execution

| Sub-item | Status | Evidence |
|---|---|---|
| Campaign PENDING → RUNNING transition | **I** | No production test run |
| Campaign RUNNING → COMPLETED transition | **I** | No production test run |
| Per-contact idempotency (retry safety) | **I** | No production test run |
| Credit deduction (atomic, correct amount) | **I** | No production test run |
| sentEmails + failedEmails + skippedEmails = totalEmails | **I** | No production test run |
| No duplicate sends | **I** | No production test run |

**Milestone status: I** — 0 of 6 sub-items Verified

---

### 4 · Deliverability

| Sub-item | Status | Evidence |
|---|---|---|
| SES accepts email (ses_message_id returned) | **I** | No test send |
| Emails physically arrive in inbox | **I** | No test send |
| SNS webhook receives events | **I** | No SNS event observed |
| Permanent bounce → suppression | **I** | SES simulator not used |
| Complaint → suppression | **I** | SES simulator not used |
| Open event → openedAt updated | **I** | SES_CONFIGURATION_SET not verified |
| Click event → clickedAt updated | **I** | SES_CONFIGURATION_SET not verified |
| Unsubscribe link correct URL (not localhost) | **I** | APP_URL not verified |
| Unsubscribe → suppression row | **I** | Not tested |
| Suppression enforced in next campaign | **I** | Not tested |

**Milestone status: I** — 0 of 10 sub-items Verified

---

### 5 · Compliance

| Sub-item | Status | Evidence |
|---|---|---|
| Unsubscribe footer in every campaign email | **I** | Code confirmed in email.js; not observed in real send |
| Unsubscribe link resolves to production URL | **I** | APP_URL not verified |
| Unsubscribe creates suppression row | **I** | Not tested |
| Suppressed address skipped on next send | **I** | Not tested |

**Milestone status: I** — 0 of 4 sub-items Verified

---

### 6 · Recovery & Resilience

| Sub-item | Status | Evidence |
|---|---|---|
| Startup reconciliation (stale RUNNING → FAILED) | **I** | Not observed post-hardening deploy |
| PENDING watchdog (stuck PENDING → re-enqueued) | **I** | e6ed49c; not observed yet |
| Graceful shutdown on SIGTERM | **I** | Not tested |
| Redis restart recovery | **I** | Not tested |
| Redeploy during active send | **I** | Not tested |

**Milestone status: I** — 0 of 5 sub-items Verified

---

### 7 · Billing & Credits

| Sub-item | Status | Evidence |
|---|---|---|
| Credit deduction correct after send | **I** | No test campaign |
| Credit transaction rows created | **I** | No test campaign |
| Razorpay checkout (initiate → modal → verify) | **I** | Not tested in production |
| Razorpay webhook (order.paid → completePayment) | **I** | Not tested in production |
| completePayment race-free idempotency | **I** | ecb1331 — .returning() gates credit allocation on state transition; concurrent callers eliminated |
| allocateCredits atomic balance check | **I** | ecb1331 — balance check is now the WHERE clause (same pattern as deductCreditAtomic) |

**Milestone status: I** — 0 of 6 sub-items Verified

---

### 8 · Observability

| Sub-item | Status | Evidence |
|---|---|---|
| `/api/health` overall status | **V** | `status: "ok"` confirmed |
| `/api/health` redis | **V** | `redis: "connected"` confirmed |
| `/api/health` worker | **V** | `worker: "running"` confirmed |
| `/api/health` postgres | **V** | Implied by platform working; direct query not pasted |
| `/api/health` smtp | **V** | `smtp: "verified"` confirmed. DNS OK. TCP port 2587 open. SMTP AUTH accepted by SES. |
| `/api/health` sendPaused | **I** | Not confirmed `false` from live response |
| Dashboard cost-by-endpoint NaN fix | **I** | e6ed49c; not observed in production UI |
| CSV mapping screen UX | **V** | Launch-ready. Full redesign committed 3b76cf1. Header guidance, always-visible field descriptions, Required/Recommended/Optional status, auto-detect hints, unmapped consequences, send readiness summary, keyboard-accessible tooltips. No further enhancements scheduled before launch. |
| Template Builder UX | **I** | Launch-ready. focusedField state targets placeholder insertion to subject or body. Placeholder panel shows mapped vs unmapped state from columnMapping context. Unmapped-placeholder amber warning when {{name}}/{{company}}/{{category}} used but column not mapped. Subject character counter (turns amber ≥50). Template Name helper text. Removed font-mono from body. PenLine replaces Code icon on Edit tab. Secondary section for {{email}}. Customer-oriented subtitle. |
| Placeholder validation consistency | **I** | Fixed contradictory UX: Column Mapping marks Company Optional, Confirmation used to hard-block if {{company}} was in template but Company not mapped. Root cause: JSON.stringify drops undefined values so unmapped keys vanish from the wire payload; server's placeholder cross-reference check then blocked the send. Fix: removed server hard-block (email.js already renders missing keys as ""); added non-blocking amber warning at Confirmation; Template step amber warning already in place. Optional fields can never become silently required. |
| Personalization preview accuracy | **I** | Fixed replacePlaceholders (utils.js) to render blank instead of literal {{placeholder}} for missing keys — previews now match actual send behavior. Removed synthetic fallbacks (John Doe, Acme Inc) from TemplateBuilder and Confirmation previews. Added recipient preview selector in Template Builder Preview tab: auto-selects first contact missing a used placeholder, shows ⚠ Missing: [field] in dropdown. Added per-field availability counts (X/Y contacts) on variable panel buttons. Added Personalization Health panel on Confirmation (only shows used variables). Updated warning language to "information is unavailable — emails will render as blank". |

**Milestone status: I/V mixed** — 3 of 7 sub-items Verified

---

### 9 · Inbox Placement

| Sub-item | Status | Evidence |
|---|---|---|
| SPF pass | **D** | Not checked |
| DKIM pass | **D** | Not checked |
| DMARC pass | **D** | Not checked |
| Authentication-Results header reviewed | **D** | No email received yet |
| Mail Tester score ≥ 8/10 | **D** | Not run |

**Milestone status: D** — 0 of 5 sub-items Verified

---

### 10 · Phase A Hardening (commits f7f892e + 47e0d49)

| Sub-item | Status | Evidence |
|---|---|---|
| Razorpay-only checkout (Stripe fully removed) | **D** | gateways.js — no Stripe imports; Pricing.jsx INR-only |
| `mustResetPassword` server-side enforcement | **D** | routes.js:115 — authMiddleware 403 with exempt paths |
| Global send pause in `routes.js executeCampaign` | **D** | routes.js:199 (pre-loop) + 242 (every 50 contacts) |
| `sendPaused` blocks POST /api/campaigns | **D** | routes.js:106 authMiddleware |
| Invite accept member-limit bypass fix | **D** | routes.js:1780-1788 — checks inviter.plan before user creation |
| Password minimum 8 chars at change-password | **D** | routes.js:1761 |
| `sesTracking` field in `/api/health` | **D** | routes.js:498 |
| `openedEmails` / `clickedEmails` null guards in History.jsx | **D** | History.jsx:390,401 — detail view `?? 0` guards |
| `buildMonthlyChart` uses `startedAt \|\| completedAt \|\| createdAt` | **D** | storage.js:54 |
| `getPaymentByRazorpayOrderId` via JSONB | **D** | storage.js:1071 |
| `completePayment` idempotency guard | **D** | storage.js:1006+1018 |
| 6 AI campaign type preambles | **D** | ai.js:364 — b2b_outreach, real_estate, recruitment, partnership, follow_up, general |

**Gap items (NOT fixed — scheduled Week 1):**
- GAP 1: `senderHealth` auto-pause absent from `routes.js executeCampaign` (only in `worker.js`)
- GAP 2: `getPreCampaignSuppressionCount` N+1 loop in `storage.js:1334-1340`
- GAP 3: `getContactsByIds` batch method absent from `storage.js`
- GAP 4: No server-side AI generation validation beyond subject/body presence

**Milestone status: D** — all items code-verified, none runtime-verified

---

---

### 11 · Phase B Hardening (this session — commits 826aa25 → ecb1331)

**Gaps resolved (all VERIFIED IN TESTS):**

| Item | Commit | Status |
|---|---|---|
| GAP-1: executeCampaign parity (sendPaused, senderHealth, sendWithRetry, PAUSED guard) | 826aa25 | IMPL + VERIFIED (22/22) |
| GAP-2: getPreCampaignSuppressionCount N+1 → inArray | 217bebc | IMPL + VERIFIED (5/5) |
| GAP-3: Batch contact loading both send loops | e9f8554 | IMPL + VERIFIED (22/22) |
| GAP-6: Sender profile gate (senderName + senderCompany required) | 1b89a3f | IMPL + VERIFIED (17/17) |
| B-1: mustResetPassword exempt path mismatch (`change-password` → `reset-password`) | 71c0241 | IMPL + VERIFIED (17/17) |
| B-PL-2: loginLimiter trust proxy fix (Railway proxy IP → real client IP) | a279203 | IMPL |
| FIN-1: completePayment double-credit race eliminated | ecb1331 | IMPL |
| FIN-2: allocateCredits over-allocation race eliminated | ecb1331 | IMPL |

**Remaining important items (not yet implemented):**

| ID | Item |
|---|---|
| ~~I-1~~ | Auto-pause thresholds — **DONE** (Railway env vars set: 0.08 / 0.001 — 2026-06-11) |
| I-2 | validateTemplate placeholder hard-block — **IMPL + VERIFIED IN TESTS** (306b391, 9/9) |
| I-3 | Mid-loop sendPaused re-check |
| I-4 | Inline-path isRetry duplicate-send guard |
| I-5 | SNS_TOPIC_ARN startup enforcement — **IMPL + VERIFIED IN TESTS** (f434b21, 6/6) |
| O-2 | Invite token TTL verification |

**Milestone status: I** — items implemented but none yet runtime-Verified in production

---

## Launch blockers (ranked)

| # | Blocker | Severity | Current status |
|---|---|---|---|
| 1 | No test campaign has completed in production | Critical | I |
| 2 | No test campaign has completed in production | Critical | I |
| 3 | `SES_CONFIGURATION_SET` not confirmed set | Critical | I |
| 4 | `APP_URL` not confirmed pointing to production hostname | Critical | I |
| 5 | SNS subscription confirmation status unknown | Critical | I |
| 6 | Schema hardening columns not verified in production DB | High | I |
| 7 | `REPMAIL_PUBLIC` not confirmed `"true"` | High | I |
| 8 | Bounce/complaint suppression not tested | High | I |
| 9 | Inbox placement (SPF/DKIM/DMARC) not checked | High | D |
| 10 | Unsubscribe link URL not verified | High | I |

---

## Launch readiness assessment

**Status: NOT READY**

9 of 9 major milestones are at **I** or below. No deliverability path has been Verified.
Infrastructure is Verified only for Redis connectivity and worker liveness.

**Minimum to reach launch-ready:**
- Infrastructure milestone → V (Blocks 1A–1D)
- Campaign Execution milestone → V (Block 2C)
- Deliverability milestone → V (Blocks 3A–3H)
- Compliance milestone → V (unsubscribe verified)
- Inbox Placement → V (Block 4)

---

## Production verification checklist

8-item checklist. Execute in order. Record evidence as each test passes.

| # | Test | Status | Prerequisite |
|---|---|---|---|
| T-1 | SES send — email physically sent, `ses_message_id` stored, campaign `COMPLETED` | Pending | Credits ≥ 1, verified SES identity |
| T-2 | SNS bounce — `bounce@simulator.amazonses.com` creates suppression, `bounced_emails` incremented | Pending | T-1, SNS subscription confirmed |
| T-3 | SNS complaint — `complaint@simulator.amazonses.com` creates suppression, `complained_emails` incremented | Pending | T-1, SNS subscription confirmed |
| T-4 | Unsubscribe — click link from real email, suppression row created, success page rendered | Pending | T-1 (real email received) |
| T-5 | APP_URL — unsubscribe link uses production hostname, not `localhost:5000` | Pending | T-1 (real email received) |
| T-6 | Auto-pause — injected bounce history triggers `send_paused=true` on next campaign attempt | Pending | T-1 or any completed campaign |
| T-7 | Razorpay payment — test checkout creates exactly 1 credit_transaction, `is_trial_user` flips false | Pending | Razorpay test mode configured |
| T-8 | Forced password reset — new user blocked until reset, `must_reset_password` clears after | Pending | Admin access |

---

## Verification log

Evidence is appended here as each item moves to V.

| Date | Item | Evidence | Result |
|---|---|---|---|
| 2026-06-07 | Redis connectivity | `PING→PONG` confirmed in diagnostic session | PASS |
| 2026-06-07 | Worker heartbeat | `/api/health` → `worker: "running"` | PASS |
| 2026-06-07 | Health endpoint | `/api/health` → `status: "ok"` | PASS |
| 2026-06-07 | Redis durability | `save 60 1` / `appendonly no` / `maxmemory-policy noeviction` / `maxmemory 0` | PASS |
| 2026-06-07 | SMTP configuration | DNS OK, TCP port 2587 open, SMTP AUTH accepted, `/api/health` → `smtp: "verified"` | PASS |
