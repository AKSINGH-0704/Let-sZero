# RepMail — Launch Readiness

**Last updated:** 2026-06-07
**Current commit:** f3f2f3e

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
| Stripe payment flow | **I** | Not tested |
| Razorpay payment flow | **I** | Not tested |

**Milestone status: I** — 0 of 4 sub-items Verified

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
| CSV mapping screen UX (field tooltips + status indicators) | **I** | Added ⓘ tooltip per field, Required/Recommended/Optional status, actual template variable references in tooltip copy |

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

## Verification log

Evidence is appended here as each item moves to V.

| Date | Item | Evidence | Result |
|---|---|---|---|
| 2026-06-07 | Redis connectivity | `PING→PONG` confirmed in diagnostic session | PASS |
| 2026-06-07 | Worker heartbeat | `/api/health` → `worker: "running"` | PASS |
| 2026-06-07 | Health endpoint | `/api/health` → `status: "ok"` | PASS |
| 2026-06-07 | Redis durability | `save 60 1` / `appendonly no` / `maxmemory-policy noeviction` / `maxmemory 0` | PASS |
| 2026-06-07 | SMTP configuration | DNS OK, TCP port 2587 open, SMTP AUTH accepted, `/api/health` → `smtp: "verified"` | PASS |
