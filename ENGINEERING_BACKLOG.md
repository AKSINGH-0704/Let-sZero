# RepMail Engineering Backlog

**Purpose:** Single authoritative record of all deferred engineering work. Items here were identified during audits but not implemented in the milestone where they were found — either out of scope, lower priority, or dependent on future milestones.

**Process:**
- New items are added here when recorded in an audit (Audit 062+). Earlier findings are consolidated below from their original audit tables.
- When an item is implemented, mark it `[DONE]` with the implementing audit number. Do not delete entries.
- Severity: CRITICAL / HIGH / MEDIUM / LOW
- Status: OPEN / IN PROGRESS / DONE / WONT FIX

**Related documents:**
- [AUDIT_TRAIL.md](./AUDIT_TRAIL.md) — Full audit history. Original finding context is there.
- [HANDOFF.md](./HANDOFF.md) — Current state, priorities, non-goals
- [REPMAIL_ENGINEERING_HANDOFF.md](./REPMAIL_ENGINEERING_HANDOFF.md) — Critical implementation rules

---

## Security

| ID | Status | Severity | Description | Rationale | Milestone |
|---|---|---|---|---|---|
| SEC-001 | OPEN | HIGH | **nodemailer CRLF injection in `List-*` headers** (nodemailer ≤ 9.0.0). Directly relevant when M5 adds `List-Unsubscribe` headers — a malicious or malformed unsubscribe URL could inject arbitrary headers. Sanitize the unsubscribe URL before injecting into headers. | Confirmed nodemailer vulnerability. Risk is latent now; becomes exploitable the moment `List-Unsubscribe` header is added. | M5 (must fix before implementing List-Unsubscribe) |
| SEC-002 | OPEN | MEDIUM | **drizzle-orm SQL injection** (drizzle-orm < 0.45.2). SQL injection via improperly escaped SQL identifiers. Risk is low in this codebase (typed column references used, not user-controlled identifiers), but dependency update is warranted. | Confirmed upstream CVE. Low exploitability given current usage patterns; update eliminates risk entirely. | P2 dependency update pass |
| SEC-003 | OPEN | MEDIUM | **`PUT /api/profile` writes no audit log.** Sender identity changes (name, domain, SMTP credentials) are not recorded. An attacker who gains account access can change sender identity without leaving a trace. | Audit trail gap for a high-value field. Sender identity directly affects deliverability and domain reputation. | M7 |

---

## Deliverability

| ID | Status | Severity | Description | Rationale | Milestone |
|---|---|---|---|---|---|
| DEL-001 | OPEN | HIGH | **`SNS_TOPIC_ARN` absence is not a startup error.** If SNS is unconfigured, bounce/complaint events are silently dropped, auto-pause never fires, and the platform can keep sending to an increasingly poisoned list. Should exit(1) on missing SNS_TOPIC_ARN in production. | Auto-pause is the only deliverability protection mechanism. Silent SNS failure defeats the entire system. Current behavior: logs a warning and continues. | M5 |
| DEL-002 | **DONE** (Audit 063) | MEDIUM | **`topBouncers` minimum vs auto-pause minimum misaligned.** Admin health dashboard shows top bouncers only for senders with ≥ 10 sent emails. Auto-pause enforcement threshold is ≥ 50 sent emails. A sender with 10–49 emails showing in the health dashboard cannot be auto-paused. Admin sees a "problem sender" they cannot enforce against. | Operational confusion. Admin may manually investigate a sender that auto-pause would never catch. | M4 |

---

## Reliability

| ID | Status | Severity | Description | Rationale | Milestone |
|---|---|---|---|---|---|
| REL-001 | **DONE** (Audit 063) | MEDIUM | **No startup warning when Redis is unavailable.** When `REDIS_URL` is unset or unreachable, campaigns silently fall back to the inline execution path (`executeCampaign` in routes.js). Inline-path campaigns cannot survive Railway redeployment (SIGTERM). Operators unfamiliar with this behavior encounter mysterious FAILED campaigns after deploys. A `[WARN] Redis unavailable — campaigns running on inline path. SIGTERM will abandon in-progress campaigns.` log at startup prevents confusion. | Operator safety. The behavior is documented in HANDOFF.md but documentation is passive; a runtime warning is active. | M4 |

---

## Performance

| ID | Status | Severity | Description | Rationale | Milestone |
|---|---|---|---|---|---|
| PERF-001 | OPEN | LOW | **No index on `campaigns.started_at`.** Three queries now filter or order on this column (`getUserSenderHealth`, `getDeliveryHealthStats` ×2). At current scale (< 10K campaigns) full-table scan is imperceptible. At 100K+ campaigns this will be the bottleneck. | Index creation is a one-line migration. Adding it now costs nothing; adding it later on a 100K-row table requires `CREATE INDEX CONCURRENTLY`. | P2 performance milestone |
| PERF-002 | OPEN | LOW | **`getUserById` called N times in global pause resume.** `POST /api/admin/platform/resume-sending` now fetches the campaign owner for every PAUSED campaign before re-queuing. At current scale (handful of paused campaigns) this is O(N) with small N. At scale with 100+ paused campaigns, the admin action blocks on N sequential queries. | Introduced as a correctness fix in M3A (prevents sender-health-paused campaigns from being re-queued). Should be batched via `getUsersByIds` or a campaign JOIN when O(N) becomes measurable. | M5 |
| PERF-003 | OPEN | LOW | **`getCampaignStatus()` adds 1 DB query per 50 contacts in the campaign loop.** Lightweight (1 column, primary key lookup) — at 14 emails/sec this fires every ~3.5 seconds. Fine for typical lists. Reconsider if contact lists routinely exceed 50K contacts (would fire ~28 times per second across 3 concurrent campaigns). | Not a current problem. Note here for scale planning. | M5+ |

---

## Scalability

| ID | Status | Severity | Description | Rationale | Milestone |
|---|---|---|---|---|---|
| SCALE-001 | OPEN | MEDIUM | **Cleanup job overlap prevention uses process-local flags, not distributed locks.** If RepMail ever runs multiple server instances (horizontal scaling), each instance will run its own cleanup jobs. Jobs can overlap across instances, causing double-execution of AI quota resets, double-failure of stale campaigns, etc. Fix: replace `isRunning` boolean guards with Redis `SET NX` distributed locks. | Not a problem today (single Railway instance). Becomes critical the moment a second instance is spun up. Architecture change required before horizontal scaling is possible. | M6+ (horizontal scaling milestone) |

---

## Maintainability

| ID | Status | Severity | Description | Rationale | Milestone |
|---|---|---|---|---|---|
| MAINT-001 | **DONE** (Audit 063) | HIGH | **`processCampaign` (worker.js) and `executeCampaign` (routes.js) are two ~400-line parallel functions with identical logic.** Every bug fix in M3A required applying the same change in both functions. Every future campaign feature (new status transitions, new exit conditions, A/B send, scheduled send improvements) will require the same doubling. Extract a shared `runCampaignLoop(campaignId, storage, options)` module. Both execution paths call the shared module; path-specific setup/teardown stays in their respective files. | Structural drift risk is currently HIGH. M3A applied 8 fixes twice. One missed application caused a subtle bug in a previous milestone. Without extraction, the next engineer touching this code will make the same mistake. | M4 |
| MAINT-002 | OPEN | LOW | **Inconsistent error field naming.** AI endpoint returns `{ code: "SENDER_PROFILE_REQUIRED" }`. Campaign endpoint returns `{ error: "SENDER_PROFILE_REQUIRED" }`. Frontend handles each differently. Any future unified error handling logic must account for both. | Small inconsistency. Low risk now, compounds with every new error code added. | P3 cleanup |
| MAINT-003 | OPEN | LOW | **CORS `allowedOrigins` hardcoded to localhost.** Safe in current single-origin deployment. Fragile if architecture changes (CDN, separate frontend hosting, subdomains). | Low risk; record for future architect awareness. | P3 |

---

## Technical Debt

| ID | Status | Severity | Description | Rationale | Milestone |
|---|---|---|---|---|---|
| DEBT-001 | OPEN | LOW | **Unused `Play` import in `ProgressTracker.jsx`.** Pre-existing unused import. No runtime impact (tree-shaking removes it). | Cosmetic. Record for housekeeping pass. | Housekeeping |

---

## UX

| ID | Status | Severity | Description | Rationale | Milestone |
|---|---|---|---|---|---|
| UX-001 | OPEN | MEDIUM | **`senderName` can be cleared while campaigns are queued.** `PUT /api/profile` does not warn if active/pending campaigns exist. A user who clears their sender name mid-campaign causes scheduled or queued campaigns to be sent as "RepMail" (the default fallback). Warn in `PUT /api/profile` if active/pending campaigns exist. | Direct customer impact. Silent deliverability degradation — user sees "RepMail" as the sender name in their own emails. | M5 |
| UX-002 | **DONE** (Audit 063) | LOW | **Cancel action in History table row.** Power users want to cancel campaigns from the list view without opening the ProgressTracker. Requires per-row cancel mutation + confirmation dialog. | Low urgency — cancel is available in ProgressTracker. History row cancel is a power-user convenience. | M4 |
| UX-003 | OPEN | MEDIUM | **No "export remaining contacts" path after CANCELLED.** Users who cancel a campaign mid-send cannot re-target the contacts that were not reached without manually reconstructing the list. Requires contact-level PENDING/FAILED state tracking to export a "not-yet-reached" segment. | Real recovery scenario: wrong-list cancel leaves 40% of the list unreached. User must re-upload and hope they match correctly. | M4+ (requires schema change) |
| UX-004 | **DONE** (Audit 063) | LOW | **Admin cannot cancel other users' campaigns from the History UI.** `POST /api/campaigns/:id/cancel` supports `req.isRootAdmin` but the History page has no cancel control for other users' campaigns. Admin must use the API directly. | Admin operational friction. Low urgency since direct API call is available. | M4 |

---

## Operations

| ID | Status | Severity | Description | Rationale | Milestone |
|---|---|---|---|---|---|
| OPS-001 | OPEN | MEDIUM | **Time-series AI cost trend not implemented.** Admin dashboard shows aggregate AI costs but no daily-bucketed trend. Operators cannot see if AI costs are spiking over time without querying the DB directly. Requires daily bucketing of `ai_usage_logs` (GROUP BY DATE(`created_at`)). | Cost visibility. Without trends, AI cost spikes are invisible until the billing statement arrives. | M5 |
| OPS-002 | OPEN | LOW | **Dead-letter queue management API not implemented.** `GET /api/admin/queue/failed` + `POST /api/admin/queue/failed/:jobId/retry`. BullMQ's failed job queue has no admin surface in the app. Operators must use Redis CLI or Bull Board directly. | Operational tooling. Low urgency while failure rate is low. | M5 |
| OPS-003 | OPEN | LOW | **Cross-user suppression admin tooling not implemented.** No API to query or remove suppressions across all users. Admin must query the DB directly. | Support tooling. Low urgency while user count is low. | M5 |
| OPS-004 | OPEN | LOW | **Per-user daily AI cost breakdown not implemented.** Admin can see top-10 AI users (aggregate) but not daily breakdown per user. Cannot identify when a specific user's AI usage spiked. | Cost attribution. Nice-to-have for abuse detection at scale. | M5+ |
| OPS-005 | OPEN | LOW | **`ai_usage_logs` abuse pattern detection not implemented.** No mechanism to detect repeated identical prompts (high `requestHash` similarity) that could indicate abuse or prompt injection. | Security-adjacent. Low urgency until AI costs become significant. | M6+ |

---

## Enterprise

| ID | Status | Severity | Description | Rationale | Milestone |
|---|---|---|---|---|---|
| ENT-001 | OPEN | LOW | **Campaign-specific audit log endpoint.** `GET /api/campaigns/:id/audit` is documented as nice-to-have but the current `getAuditLogs` only supports `userId` and `action` filters — not `targetId`. An enterprise audit view per campaign requires adding `targetId` filter to `getAuditLogs`. | Audit completeness. Currently supported via admin audit trail filtered by campaign name. Low urgency. | M5 |

---

## Resolved / Won't Fix

| ID | Resolution | Description |
|---|---|---|
| F-M3A-5 | WON'T FIX | CANCELLED campaigns show `creditsUsed=0` if cancelled before checkpoint i=25. This is correct — 0 credits were consumed. The flush at cancel time writes `creditsUsed: sentCount` accurately. |
