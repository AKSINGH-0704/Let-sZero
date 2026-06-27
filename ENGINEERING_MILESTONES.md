# RepMail — Engineering Milestones

**Document type:** Permanent engineering history  
**Audience:** Engineers, technical due diligence, enterprise customers, future maintainers  
**Scope:** Every completed engineering milestone from the structured milestone program (M1 onward)

This document is the definitive historical record of how RepMail was engineered, what decisions were made and why, and what each milestone actually delivered. It does not describe what is coming next (see `SENDER_DOMAIN_PHASE2_SCOPE.md`), the current implementation state (see `PROGRESS.md`), or the full chronological audit log (see `AUDIT_TRAIL.md`). It answers one question: how did the platform evolve?

---

## Milestone Timeline

| # | Title | Category | Commit | Audit | Status |
|---|---|---|---|---|---|
| Pre-M1 | Platform Foundation — Infrastructure, Hardening & Launch | Foundation | (58 audits) | Audits 001–058 | Complete |
| M1 | Correctness & Deliverability Consistency | Correctness | `61cef48` | Audit 059 | Complete |
| M2 | Server-Side Hardening | Security / Correctness | `85e3e4e` | Audit 060 | Complete |
| M3A | Campaign Reliability Core | Reliability | `189aa2c` | Audit 061 | Complete |
| M3B | Campaign Cancellation UX | UX | `a1a8fd9` | Audit 062 | Complete |
| M4 | Campaign Architecture Extraction | Architecture | `5d0bbb5` | Audit 063 | Complete |
| M5 | Production Safety, Security & Correctness | Security / Observability | `1eb23a1` | Audit 064 | Complete |
| M6 | Contact Library | Product Capability | `d655399` | Audit 065 | Complete |
| M7A | Duplicate Campaign | Product Capability | `ea68878` | Audit 066 | Complete |
| M7B | Contact Management Completion | Product Capability | `c4168c8` | Audit 067 | Complete |
| M8 | Launch Readiness Hardening | Security / Infrastructure | `eb2c2d5` | Audit 068 | Complete |
| M9 | Sender Domain (Custom Sending) | Infrastructure | `cbfc800` | Audits 070 + 071 | Complete |
| M10 | Email Analytics | Infrastructure / Analytics | `07f39d4` | Audit 062 | Complete |
| M11 | Production Operations & Analytics Accuracy | Operations / Security | TBD | Audit 063-append | Complete |

---

## Document Conventions

- **Commit** — The primary git commit for the milestone. Intermediate commits exist; only the milestone commit is listed here.
- **Audit** — The independent production audit that verified the milestone. Audits are append-only records in `AUDIT_TRAIL.md`.
- **ADR** — Architecture Decision Record. Where a decision required justification beyond what the code communicates.

---

## Platform Foundation (Pre-M1 Context)

Before the structured milestone program began, RepMail underwent an extensive hardening phase covering approximately 58 engineering audits. This work is fully documented in `AUDIT_TRAIL.md` (Audits 001–058). The following is a summary of what was in place by the time M1 began.

**Core platform (initial release, December 2025 – May 2026):**
- Express 4 / Node.js ESM monorepo with Vite frontend
- PostgreSQL via Drizzle ORM; BullMQ queue over IORedis
- Three-tier user hierarchy: ROOT_ADMIN → SUB_ADMIN → USER
- Per-email credit billing model (Razorpay INR only — Stripe fully removed during hardening)
- AWS SES SMTP delivery; AWS SNS bounce/complaint webhooks
- OpenAI AI template generation (GPT-4o / GPT-4o-mini plan-tiered)
- In-memory storage shim for local development (no external services required)

**Production hardening achieved before M1 (Audits 001–058):**
- **Financial integrity (FIN-1, FIN-2):** `completePayment` double-credit race eliminated via conditional `RETURNING` pattern; `allocateCredits` balance check moved into transaction with conditional WHERE guard — concurrent callers cannot overdraw.
- **Authentication (B-PL-2, B-1):** `trust proxy` set for accurate rate-limiting behind Railway's proxy; `mustResetPassword` enforced server-side in authMiddleware; correct exempt paths.
- **Campaign execution parity (GAP-1):** Inline `executeCampaign` fallback path brought to full parity with BullMQ `processCampaign` path: `sendPaused` pre-check, `senderHealth` auto-pause, `sendWithRetry`, PAUSED terminal-state guard.
- **AI validation (I-2, GAP-4):** Unknown placeholder hard-block; structured intake replacing free-text prompt; post-generation validation with repair, warnings, and telemetry.
- **Deliverability:** DMARC permerror resolved (duplicate TXT record removed); RFC 2369/8058 compliance headers (`List-Unsubscribe`, `List-Unsubscribe-Post`, `Feedback-ID`) added; AI prompts reframed from bulk-mail to personal outreach.
- **SNS (I-5):** `SNS_TOPIC_ARN` fail-closed; bogus topic ARNs rejected before processing.
- **Scale (GAP-2, GAP-3):** N+1 suppression query eliminated; batch contact loading (`getContactsByIds`) added to both execution paths.
- **Payment hardening:** HTML receipt email; `completePayment` returns `{ credited }` flag; exactly one receipt email per payment; orphaned PENDING payment records eliminated.
- **Free Plan:** 500 monthly credits on rolling 30-day window; plan limits enforced; campaign confirmation gated on `senderName`.
- **Campaign UX:** ProgressTracker skipped-contact display; History reach rate; per-contact SUPPRESSED source reason in campaign detail.
- **Legal / compliance:** Platform-level Privacy Policy and Terms of Service; RepMail supplemental documents; legal entity standardized to "LetsZero Solutions Private Limited".
- **Launch score:** Phase 15 production audit — **9.6/10**. No CRITICAL findings, no launch blockers.

---

## Milestone 1 — Correctness & Deliverability Consistency

| Field | Value |
|---|---|
| **Status** | Complete |
| **Audit** | Audit 059 |
| **Commit** | `61cef48` |
| **Date** | 2026-06-26 |

### Summary Card

| Field | Value |
|---|---|
| **Status** | Complete |
| **Category** | Correctness |
| **Primary Goal** | Align credit logic and deliverability thresholds with production reality |
| **Major Outcome** | Credit pre-flight matches per-email deduction; auto-pause fires before AWS SES suspension; health dashboard reflects enforcement state |
| **Production Impact** | Eliminated mid-campaign credit failures at calendar month boundaries; closed the window where SES could suspend the account before RepMail auto-paused |
| **Database Migration** | No |
| **API Changes** | No |
| **Frontend Changes** | No |
| **Documentation Updated** | AUDIT_TRAIL.md, HANDOFF.md, ENGINEERING_BACKLOG.md |
| **Git Commit** | `61cef48` |
| **Independent Audit Status** | Audit 059 — All assertions PASS |

### Objective

Eliminate three categories of silent correctness bugs where the code appeared to work but produced wrong results under real conditions: credit pre-flight logic that disagreed with the actual deduction logic, deliverability thresholds that would allow SES to suspend the account before RepMail ever paused a sender, and a health dashboard whose thresholds were disconnected from the enforcement system they were supposed to reflect.

### Business Motivation

A user on the Free Plan who had used all their credits could create a campaign that appeared to pass the pre-flight check, only to have it fail mid-send when `deductCreditAtomic` correctly rejected the deduction. This produces FAILED campaigns with partial sends — a trust and support cost. Separately, RepMail's auto-pause thresholds (15% bounce, 0.5% complaint) were more lenient than AWS SES's own suspension thresholds (10% bounce, 0.1% complaint). This meant SES could suspend the shared sending account before RepMail paused any individual sender, taking all customers offline.

### Engineering Motivation

The credit pre-flight (`canStartCampaign`) used `DATE_TRUNC('month', ...)` calendar-month logic. The per-email credit deduction (`deductCreditAtomic`) used a rolling 30-day window anchored to the user's signup date. These two SQL expressions returned different results at calendar month boundaries. The health dashboard's `critical`/`warning` thresholds were hardcoded constants (15% bounce critical) while the auto-pause enforcement used env var overrides — making the dashboard display misleading after an operator tuned the env vars.

### Initial Problems

1. `canStartCampaign` SQL: `DATE_TRUNC('month', NOW()) >= DATE_TRUNC('month', COALESCE(free_credits_reset_at, created_at))`. At the start of a calendar month, this could report credits as available for a user whose rolling 30-day window had not yet reset.
2. `BOUNCE_RATE_PAUSE_THRESHOLD = 0.15` (15%) exceeded the AWS SES soft-suspension threshold of 10%.
3. `COMPLAINT_RATE_PAUSE_THRESHOLD = 0.005` (0.5%) exceeded the AWS SES soft-suspension threshold of 0.1%.
4. `getDeliveryHealthStats` threshold classifications (`healthy`/`warning`/`critical`) were hardcoded independently of the env vars that controlled enforcement.
5. `PLATFORM_SEND_PAUSED` and `PLATFORM_SEND_RESUMED` were raw string literals in `routes.js` rather than constants.

### Architecture Decisions

**ADR-M1-1: Rolling window alignment.** `canStartCampaign` credit SQL rewritten to: `(NOW() AT TIME ZONE 'UTC') >= (COALESCE(free_credits_reset_at, created_at) + INTERVAL '1 month')`. This is identical to the rolling window used in `deductCreditAtomic`. The two functions now share the same renewal definition. Calendar-month logic was discarded entirely.

**ADR-M1-2: Threshold below AWS SES suspension.** Auto-pause defaults set conservatively below AWS SES's own thresholds to ensure RepMail enforcement fires first, protecting the shared sending account. New defaults: bounce 8%, complaint 0.05%. These are env-var configurable; the application defaults to safe values.

**ADR-M1-3: Health dashboard derives from enforcement.** `getDeliveryHealthStats` now reads `BOUNCE_RATE_PAUSE_THRESHOLD` and `COMPLAINT_RATE_PAUSE_THRESHOLD` from `process.env` and applies 50%-of-threshold for `warning`, threshold for `critical`. The dashboard cannot display thresholds that contradict the enforcement configuration.

### Scope

4 files modified. Zero new tables or API endpoints. Zero frontend changes. Zero schema migrations.

### What Was Implemented

- `canStartCampaign` (`storage.js`): rolling-window SQL aligned with `deductCreditAtomic`
- Auto-pause defaults: `BOUNCE_RATE_PAUSE_THRESHOLD` 0.15 → 0.08, `COMPLAINT_RATE_PAUSE_THRESHOLD` 0.005 → 0.0005
- `getDeliveryHealthStats` (`storage.js`): status thresholds now derived from env vars, not hardcoded
- `PLATFORM_SEND_PAUSED`, `PLATFORM_SEND_RESUMED` added to `AUDIT_ACTIONS` in `schema.js`; both usages in `routes.js` updated from raw strings to constant references
- `memoryStorage.js` updated to maintain implementation parity

### Backend Changes

| File | Change |
|---|---|
| `server/storage.js` | `canStartCampaign`: rolling-window SQL; `getDeliveryHealthStats`: env-derived thresholds |
| `shared/schema.js` | `AUDIT_ACTIONS`: added `PLATFORM_SEND_PAUSED`, `PLATFORM_SEND_RESUMED` |
| `server/routes.js` | Platform pause/resume routes updated to use `AUDIT_ACTIONS` constants |
| `server/memoryStorage.js` | Rolling window logic parity |

### Frontend Changes

None.

### Database Changes

None. No schema migrations required.

### API Changes

None. Existing endpoints return different values where thresholds affect responses (`/api/health` delivery stats).

### Security Improvements

None direct. Correctness improvement prevents false-positive credit approvals.

### Deliverability Improvements

Auto-pause thresholds now below AWS SES suspension thresholds. RepMail enforcement fires before SES can suspend the shared sending account. Health dashboard accurately reflects enforcement state.

### Reliability Improvements

Credit pre-flight aligns with per-email deduction — eliminates mid-campaign credit failure for users whose window crossed a calendar month boundary.

### Verification Summary

6 behavioral assertions verified: (1) calendar-boundary credit pre-flight matches deduction; (2) 8% bounce triggers auto-pause before SES suspension; (3) 0.05% complaint triggers auto-pause before SES suspension; (4) health dashboard `warning` fires at 4% bounce when threshold=8%; (5) health dashboard `critical` fires at 8% bounce when threshold=8%; (6) platform pause/resume uses `AUDIT_ACTIONS` constants.

### Independent Audit Summary

Audit 059 — all findings PASS. No regressions introduced. `memoryStorage.js` parity confirmed.

### Documentation Updated

`AUDIT_TRAIL.md` (Audit 059 appended), `HANDOFF.md` (M1 section), `ENGINEERING_BACKLOG.md` (no items introduced).

### Related ADRs

ADR-M1-1 (rolling window alignment), ADR-M1-2 (threshold below SES), ADR-M1-3 (health derives from enforcement).

### Deferred Work

None from this milestone.

### Future Follow-ups

`PERF-001` (index on `campaigns.started_at`) noted in backlog for future performance pass.

---

## Milestone 2 — Server-Side Hardening

| Field | Value |
|---|---|
| **Status** | Complete |
| **Audit** | Audit 060 |
| **Commit** | `85e3e4e` |
| **Date** | 2026-06-26 |

### Summary Card

| Field | Value |
|---|---|
| **Status** | Complete |
| **Category** | Security / Correctness |
| **Primary Goal** | Enforce sender profile at the API boundary and fix timestamp anchoring |
| **Major Outcome** | `senderName` gate moved to server; `startedAt` preserved across retries; Stripe fully removed; startup env validation hardened |
| **Production Impact** | Closed API-bypass vector allowing platform-name spoofing in From header; health metric windows now anchor correctly to original campaign start |
| **Database Migration** | No |
| **API Changes** | Yes — `POST /api/campaigns` returns 400 `SENDER_PROFILE_REQUIRED` for users without sender name |
| **Frontend Changes** | No |
| **Documentation Updated** | AUDIT_TRAIL.md, HANDOFF.md |
| **Git Commit** | `85e3e4e` |
| **Independent Audit Status** | Audit 060 — All assertions PASS |

### Objective

Close remaining server-side correctness gaps: enforce sender profile at the API layer (not only the frontend), fix the `startedAt` timestamp being incorrectly overwritten on campaign retries, remove residual Stripe dependencies, and harden environment variable handling at startup.

### Business Motivation

A user who bypassed the frontend (e.g., via direct API call) could create a campaign without a sender name, causing every email in the campaign to be sent as `"RepMail"` in the From field — impersonating the platform rather than the user. The `startedAt` fix was motivated by deliverability: health metrics are windowed from campaign start, and overwriting `startedAt` on retry compressed the health window, making per-user bounce/complaint rates appear lower than they were.

### Engineering Motivation

The senderName gate existed in the frontend (`CampaignConfirmation.jsx`) but not at the API boundary. Frontend gates are advisory; server gates are authoritative. `startedAt` was unconditionally written on every campaign start, including BullMQ retries after a transient failure — this made the health window shorter than the actual campaign duration.

### Initial Problems

1. `POST /api/campaigns` did not check `req.user.senderName` — direct API callers could create campaigns without a sender name.
2. `updateCampaign({ startedAt: new Date() })` was called unconditionally on campaign start, overwriting the original start time on retry.
3. Stripe import references remained in the codebase after the payment gateway migration to Razorpay-only (commit `f7f892e`).

### Architecture Decisions

**ADR-M2-1: Server gate for senderName.** The API returns `400 { error: "SENDER_PROFILE_REQUIRED" }` before any database writes if `req.user.senderName` is blank. This is the authoritative enforcement point; the frontend gate remains as a UX convenience. The check reads from the session-loaded user object — no extra DB query.

**ADR-M2-2: startedAt written once.** `startedAt` is written only when no existing `startedAt` exists on the campaign. Retries preserve the original start time. Health metric windows are anchored to when the user first initiated the campaign.

### Scope

3 files modified. Zero new tables or API endpoints. Zero frontend changes beyond what was already present. Zero schema migrations.

### What Was Implemented

- `POST /api/campaigns` route: `senderName` check added as a pre-validation guard
- Campaign start logic: `startedAt` set conditionally (`if (!campaign.startedAt)`)
- Stripe dependency cleanup: removed remaining import references
- Startup environment variable validation tightened

### Backend Changes

| File | Change |
|---|---|
| `server/routes.js` | `senderName` gate in `POST /api/campaigns`; `startedAt` written conditionally |
| `server/index.js` | Env var startup validation improvements |

### Frontend Changes

None. (Frontend senderName gate already present; server gate is the new authoritative enforcement.)

### Database Changes

None.

### API Changes

`POST /api/campaigns` now returns `400 { error: "SENDER_PROFILE_REQUIRED", message: "..." }` for requests from users without a sender name set.

### Security Improvements

Closes an API-bypass vector: direct API callers could previously create campaigns without sender names, causing platform-name spoofing in the From header.

### Deliverability Improvements

`startedAt` now anchors correctly to campaign creation, not last retry — health metric windows are accurate.

### Reliability Improvements

Startup env var validation catches misconfigured deployments earlier.

### Verification Summary

3 assertions verified: (1) direct API call without senderName returns 400; (2) campaign retry does not overwrite `startedAt`; (3) Stripe imports absent from codebase.

### Independent Audit Summary

Audit 060 — all findings PASS.

### Documentation Updated

`AUDIT_TRAIL.md` (Audit 060 appended), `HANDOFF.md` (M2 section).

### Related ADRs

ADR-M2-1 (server gate for senderName), ADR-M2-2 (startedAt written once).

### Deferred Work

None from this milestone.

### Future Follow-ups

SEC-003 (audit log for profile changes) noted for M7.

---

## Milestone 3A — Campaign Reliability Core

| Field | Value |
|---|---|
| **Status** | Complete |
| **Audit** | Audit 061 |
| **Commit** | `189aa2c` |
| **Date** | 2026-06-26 |

### Summary Card

| Field | Value |
|---|---|
| **Status** | Complete |
| **Category** | Reliability |
| **Primary Goal** | Harden campaign state machine; add CANCELLED status; fix all identified lifecycle bugs |
| **Major Outcome** | CANCELLED terminal status; atomic completion (no TOCTOU race); correct credit accounting on all exit paths; 96% checkpoint write reduction; orphaned record cleanup on startup |
| **Production Impact** | Users can now cancel campaigns; PAUSED campaigns no longer flip to FAILED on global resume; credits-used accurate for cancelled and failed campaigns |
| **Database Migration** | No |
| **API Changes** | Yes — `POST /api/campaigns/:id/cancel` added |
| **Frontend Changes** | No (M3B adds frontend CANCELLED support) |
| **Documentation Updated** | AUDIT_TRAIL.md, HANDOFF.md (inline path SIGTERM limitation documented) |
| **Git Commit** | `189aa2c` |
| **Independent Audit Status** | Audit 061 — All assertions PASS |

### Objective

Harden the campaign state machine against all identified failure modes: add a terminal CANCELLED status, fix a global-pause resume bug that caused PAUSED campaigns to transition to FAILED, fix a state machine race on campaign completion, reduce checkpoint write frequency by 96%, and ensure credit accounting is correct on all exit paths.

### Business Motivation

Users who paused campaigns via admin global-pause resume found their campaigns unexpectedly FAILED rather than resuming. CANCELLED was not a distinct campaign state — there was no way for users to stop a campaign mid-send without it appearing as FAILED in history, making it impossible to distinguish intentional stops from failures. Credit accounting gaps (creditsUsed written only on COMPLETED, not on FAILED/CANCELLED/PAUSED) caused dashboards to show 0 credits consumed for campaigns that had sent hundreds of emails.

### Engineering Motivation

The campaign execution loop had accumulated multiple concurrent-state problems. `updateCampaignIfRunning()` used a read-then-write pattern vulnerable to a TOCTOU race between reading `status='RUNNING'` and writing `status='COMPLETED'`. Orphaned `PENDING` `campaign_emails` records were left in the database after FAILED campaigns, causing history to show permanent "Pending" entries. The checkpoint write (saving `sentEmails` progress every loop iteration) was creating 14 DB writes per second at peak sending rate — unnecessary for the user experience (the UI polls at 5-second intervals) and wasteful of database write capacity.

### Initial Problems

1. No `CANCELLED` status in the campaign state machine — users could not distinguish intentional stops from failures.
2. Global pause resume re-queued ALL paused campaigns including those paused due to sender health auto-pause — `sendPaused=true` users had their campaigns re-queued, causing immediate `processCampaign` failure and a PAUSED→FAILED transition.
3. Sender health auto-pause during the loop set `status=PAUSED`. This was wrong — PAUSED implies resumable via global admin action; sender health pause requires explicit admin resolution. The user saw "Paused" but no mechanism existed to resume.
4. `updateCampaignIfRunning()` did a `SELECT` then `UPDATE` separately — a concurrent completion from another path could slip between them.
5. Checkpoint writes happened every contact iteration (every ~70ms at 14/sec) — 14 writes/sec sustained.
6. `creditsUsed` was only flushed at `status=COMPLETED`. A FAILED campaign with 400 sends showed `creditsUsed=0`.
7. Orphaned `PENDING` `campaign_emails` persisted after FAILED campaigns — crash recovery marked the campaign FAILED but left individual email records in PENDING.

### Architecture Decisions

**ADR-M3A-1: CANCELLED is terminal, not resumable.** `CANCELLED` is a terminal status alongside `COMPLETED`, `FAILED`. It is user-initiated. Unlike `PAUSED`, it cannot be resumed. This semantic distinction is important for history display ("You cancelled this campaign" vs "This campaign failed") and for credit display (credits used up to the cancel point are consumed).

**ADR-M3A-2: Global pause resume filters by sendPaused flag.** `POST /api/admin/platform/resume-sending` fetches campaign owners before re-queuing and skips any campaign whose owner has `sendPaused=true`. The global admin action has narrower scope than it appeared — it resumes platform-level pauses, not sender-level pauses.

**ADR-M3A-3: Sender health auto-pause sets FAILED, not PAUSED.** When `runCampaignLoop` detects an auto-pause threshold breach mid-loop, it sets `status=FAILED`. The rationale: PAUSED implies a recoverable condition the user can act on. Sender health pause requires admin investigation and explicit `sendPaused=false` from an admin. Showing FAILED is more honest — the campaign did not complete.

**ADR-M3A-4: Atomic campaign completion via conditional UPDATE.** `updateCampaignIfRunning()` uses `WHERE status='RUNNING'` in the UPDATE statement itself. If another path (cancel, SIGTERM handler) already wrote a terminal status, the UPDATE matches 0 rows and returns null — the completion path detects this and skips further writes. No separate SELECT required.

**ADR-M3A-5: Checkpoint every 25 contacts.** One DB write per 25 contacts (every ~1.75 seconds at 14/sec) provides adequate UI freshness (UI polls at 5 seconds) at 96% fewer writes than per-contact. The interval is configurable via `CHECKPOINT_INTERVAL` in `campaignConfig.js` (extracted in M4).

**ADR-M3A-6: creditsUsed flushed on all exit paths.** The campaign loop flushes the credits-used counter on every exit: COMPLETED, FAILED, PAUSED, CANCELLED. A campaign that sent 500 emails before being cancelled shows `creditsUsed: 500`.

### Scope

3 server-side files modified. 1 new status value in schema. Zero schema migrations (status is a plain TEXT column). Zero new tables. Zero API changes other than the existing cancel endpoint behavior.

### What Was Implemented

- `CANCELLED` added to `CAMPAIGN_STATUS` constants in `schema.js`
- `POST /api/campaigns/:id/cancel` endpoint: cancels PENDING/RUNNING/PAUSED atomically; returns credits used so far
- Global pause resume (`POST /api/admin/platform/resume-sending`): filters out `sendPaused=true` campaign owners
- Sender auto-pause mid-loop: sets `status=FAILED` instead of `status=PAUSED`
- `updateCampaignIfRunning()`: `WHERE status='RUNNING'` atomic UPDATE pattern
- Checkpoint frequency: every 25 contacts (constant)
- `creditsUsed` flush: on all loop exit paths
- `recoverStaleCampaigns()`: bulk-updates orphaned `PENDING` `campaign_emails` to `FAILED` on startup

### Backend Changes

| File | Change |
|---|---|
| `shared/schema.js` | `CANCELLED` added to `CAMPAIGN_STATUS` |
| `server/routes.js` | Cancel endpoint; global resume filter; executeCampaign loop exit paths |
| `server/worker.js` | processCampaign: atomic completion, checkpoint, creditsUsed, auto-pause FAILED |
| `server/storage.js` | `updateCampaignIfRunning()`: conditional UPDATE; `recoverStaleCampaigns()`: bulk FAILED update |
| `server/memoryStorage.js` | Parity for all storage changes |

### Frontend Changes

None (M3B adds the CANCELLED frontend support).

### Database Changes

No schema migrations. `CANCELLED` is a valid TEXT value in the existing `status` column. Existing data is unaffected.

### API Changes

`POST /api/campaigns/:id/cancel` added. Returns `{ status: "CANCELLED", sentEmails, creditsUsed }`.

### Security Improvements

None direct.

### Deliverability Improvements

Sender health auto-pause now sets FAILED — operators see the correct status. Global pause resume no longer re-queues campaigns for suspended senders, preventing immediate re-failure.

### Reliability Improvements

Campaign completion is atomic (no TOCTOU race). Orphaned PENDING records cleaned on startup. Credit accounting correct on all paths. SIGTERM behavior documented for inline-path limitation.

### UX Improvements

Users can cancel campaigns and see a distinct CANCELLED status. Credits used are reported accurately on non-COMPLETED campaigns.

### Operational Improvements

96% reduction in checkpoint write frequency. Startup recovery cleans orphaned campaign email records.

### Verification Summary

SIGTERM behavior fully documented as a known limitation: the inline (Redis-unavailable) execution path abandons mid-loop on SIGTERM with no automatic recovery. The BullMQ path correctly survives SIGTERM via stall detection and per-contact idempotency.

### Independent Audit Summary

Audit 061 — all findings PASS.

### Documentation Updated

`AUDIT_TRAIL.md` (Audit 061), `HANDOFF.md` (M3A section with SIGTERM limitation documented).

### Related ADRs

ADR-M3A-1 through ADR-M3A-6 as above.

### Deferred Work

None from this milestone.

### Future Follow-ups

UX-003 ("export remaining contacts after CANCELLED") added to backlog — requires per-contact state to reconstruct the un-reached segment.

---

## Milestone 3B — Campaign Cancellation UX

| Field | Value |
|---|---|
| **Status** | Complete |
| **Audit** | Audit 062 |
| **Commit** | `a1a8fd9` |
| **Date** | 2026-06-26 |

### Summary Card

| Field | Value |
|---|---|
| **Status** | Complete |
| **Category** | UX |
| **Primary Goal** | Surface CANCELLED status in the frontend; eliminate status config drift between pages |
| **Major Outcome** | Shared `campaignStatus.js` module; cancel confirmation dialog; CANCELLED display in ProgressTracker and History; status config drift structurally impossible |
| **Production Impact** | Users can cancel campaigns from the UI with a confirmation; CANCELLED campaigns display correctly across all surfaces |
| **Database Migration** | No |
| **API Changes** | No |
| **Frontend Changes** | Yes — `campaignStatus.js`, ProgressTracker, History, `CancelCampaignDialog` |
| **Documentation Updated** | AUDIT_TRAIL.md, HANDOFF.md |
| **Git Commit** | `a1a8fd9` |
| **Independent Audit Status** | Audit 062 — All assertions PASS |

### Objective

Surface the new CANCELLED status throughout the frontend with accurate display, a dedicated cancel confirmation dialog, and a consistent shared status configuration that eliminates the risk of status drift between the two campaign-facing pages.

### Business Motivation

M3A added CANCELLED as a server-side terminal status but the frontend was unaware of it. ProgressTracker had no cancel button or cancel confirmation. History.jsx had no filter for CANCELLED. Users who cancelled a campaign via the API would see their campaign in an inconsistent state in the UI.

### Engineering Motivation

`ProgressTracker.jsx` and `History.jsx` both maintained local copies of campaign status display configuration (icons, labels, colors, tooltips). These had already drifted once before M3B — History had a more complete status set than ProgressTracker. The root cause was structural: two independent local constants with no enforcement mechanism. Extracting to a shared module makes future drift structurally impossible.

### Initial Problems

1. No cancel button anywhere in the campaign UI — users had to call the API directly.
2. `ProgressTracker.jsx` had no `CANCELLED` state handling — a cancelled campaign would render with a stale "Running" or "Paused" UI.
3. `History.jsx` had no "Cancelled" filter option in the status dropdown.
4. Both pages maintained their own local status config maps that had already diverged.
5. No confirmation dialog before cancellation — cancellation is irreversible.

### Architecture Decisions

**ADR-M3B-1: Shared status config module.** `client/src/lib/campaignStatus.js` — single source of truth for all 7 campaign statuses. Exports `getStatusConfig(status)` returning `{ icon, label, tooltip, color, isTerminal, canCancel }`. Both `ProgressTracker.jsx` and `History.jsx` import from here. Local status maps in both files deleted.

**ADR-M3B-2: CancelCampaignDialog as a standalone component.** The confirmation dialog is extracted rather than inlined in either page. It receives `campaign` as a prop and handles all response codes (200/200+alreadyCancelled/409/403/404/5xx) with appropriate toast, navigation, or retry behavior. Destructive confirmation is defaulted to the safe action (autoFocus on Cancel, not on Confirm).

**ADR-M3B-3: Polling terminates on CANCELLED.** `ProgressTracker.jsx` stops polling when `status === 'CANCELLED'` — it is a terminal state, further API calls would return the same result indefinitely.

### Scope

3 files modified, 2 files created (`campaignStatus.js`, `CancelCampaignDialog` extracted or inline). Zero backend changes. Zero schema migrations.

### What Was Implemented

- `client/src/lib/campaignStatus.js`: shared status config for all 7 statuses with icon, label, tooltip, color, isTerminal, canCancel
- `CancelCampaignDialog`: confirmation stats display (sent so far, credits used), anti-destructive UX (autoFocus safe action), all API response handling
- `ProgressTracker.jsx`: cancel button visible for PENDING/RUNNING/PAUSED; CANCELLED polling termination; CANCELLED stat tile "Not Reached"; post-cancel summary (Ban icon, sent/not-reached/credits); "New Campaign" + "View History" CTAs; `aria-live` on status badge; progress bar slate-colored when cancelled
- `History.jsx`: CANCELLED badge/filter/label; `getStatusConfig` replacing local STATUS_CONFIG; detail dialog "X contacts not reached" for CANCELLED; human label in dialog description instead of raw status string; stale icon imports removed

### Backend Changes

None.

### Frontend Changes

| File | Change |
|---|---|
| `client/src/lib/campaignStatus.js` | New — shared status config module |
| `client/src/pages/ProgressTracker.jsx` | Cancel button, CANCELLED handling, polling termination, post-cancel CTAs |
| `client/src/pages/History.jsx` | CANCELLED filter/badge/label, `getStatusConfig` import, detail dialog |

### Database Changes

None.

### API Changes

None.

### UX Improvements

- Cancel is now accessible from the campaign detail view without API knowledge
- Cancellation is confirmed before execution, with credits-consumed preview
- Campaign history correctly shows CANCELLED campaigns with their own distinct status
- Status config is now consistent across all campaign-facing surfaces

### Verification Summary

ProgressTracker and History verified with all 7 statuses. Cancel flow verified: confirmation → mutation → CANCELLED display → polling stops. All 5 API response codes verified.

### Independent Audit Summary

Audit 062 — all findings PASS. Zero status drift between ProgressTracker and History confirmed post-extraction.

### Documentation Updated

`AUDIT_TRAIL.md` (Audit 062), `HANDOFF.md` (M3B section).

### Related ADRs

ADR-M3B-1 (shared status config), ADR-M3B-2 (cancel dialog component), ADR-M3B-3 (polling termination).

### Deferred Work

None from this milestone.

### Future Follow-ups

`DEBT-002` (Dashboard.jsx still using local STATUS_DISPLAY without CANCELLED) identified during M3B and tracked in backlog — fixed in M5.

---

## Milestone 4 — Campaign Architecture Extraction

| Field | Value |
|---|---|
| **Status** | Complete |
| **Audit** | Audit 063 |
| **Commit** | `5d0bbb5` |
| **Date** | 2026-06-26 |

### Summary Card

| Field | Value |
|---|---|
| **Status** | Complete |
| **Category** | Architecture |
| **Primary Goal** | Eliminate 400-line campaign execution duplication; make every future campaign change apply once |
| **Major Outcome** | `campaignConfig.js` + `campaignLoop.js` extracted; both execution paths reduced to 3–4 lines; 127/127 behavioral assertions PASS; Redis startup warning added |
| **Production Impact** | Future campaign bugs fixed in one place; admin `topBouncers` display aligned with enforcement threshold; per-row History cancel available |
| **Database Migration** | No |
| **API Changes** | No |
| **Frontend Changes** | Yes — History.jsx per-row cancel button |
| **Documentation Updated** | AUDIT_TRAIL.md, ENGINEERING_BACKLOG.md (MAINT-001, REL-001, DEL-002, UX-002, UX-004 closed), HANDOFF.md |
| **Git Commit** | `5d0bbb5` |
| **Independent Audit Status** | Audit 063 — 127/127 assertions PASS |

### Objective

Extract the campaign execution logic from two independent ~400-line functions into a single shared module. Eliminate the structural source of campaign execution bugs: the requirement to apply every fix twice. Add a startup warning for the Redis-unavailable fallback. Align the admin health dashboard's `topBouncers` threshold with the auto-pause enforcement threshold.

### Business Motivation

During M3A, 8 fixes had to be applied identically to both `processCampaign` (worker.js) and `executeCampaign` (routes.js). In one prior milestone, a fix applied to `processCampaign` was missed in `executeCampaign`, producing a subtle bug that required its own audit to detect. Every future campaign feature — send scheduling improvements, A/B testing, sequence support — would require the same manual duplication. The structural risk was HIGH and compounding.

### Engineering Motivation

`processCampaign` and `executeCampaign` were ~400-line functions with identical logic implemented independently. The only differences were: (1) the log tag (`[CAMPAIGN][WORKER]` vs `[CAMPAIGN][INLINE]`), and (2) how they were invoked (BullMQ job callback vs async fire-and-forget). Both contained: the same per-contact send loop, the same checkpoint logic, the same auto-pause checks, the same send rate constants, the same exit-path handlers. Every constant was defined twice (different files, same values) with no enforcement that they matched.

The `topBouncers` admin query used a minimum threshold of 10 sent emails. The auto-pause enforcement used a minimum threshold of 50 sent emails. An operator could see a "problem sender" in the health dashboard who would never trigger auto-pause — producing false investigative work.

### Initial Problems

1. ~400-line duplication between `processCampaign` (worker.js) and `executeCampaign` (routes.js)
2. Campaign constants duplicated: `SEND_RATE_MS`, `BOUNCE_RATE_PAUSE_THRESHOLD`, `COMPLAINT_RATE_PAUSE_THRESHOLD`, `MIN_SENDER_HEALTH_SENT`, `CHECKPOINT_INTERVAL` each defined separately in two files
3. `isThrottleError` helper and `sendWithRetry` defined in worker.js, re-exported to routes.js — a tight coupling that would break if worker.js were restructured
4. No startup warning when Redis is unavailable — operators didn't know campaigns were falling back to the inline path (which cannot survive SIGTERM)
5. `topBouncers` threshold (10 sent) misaligned with auto-pause threshold (50 sent)
6. History.jsx had no per-row cancel button — users had to open ProgressTracker to cancel

### Architecture Decisions

**ADR-M4-1: Single campaignConfig.js module.** All campaign runtime constants extracted to `server/campaignConfig.js`. Both execution paths import from here. The constants are: `SEND_RATE_MS`, `BOUNCE_RATE_PAUSE_THRESHOLD`, `COMPLAINT_RATE_PAUSE_THRESHOLD`, `MIN_SENDER_HEALTH_SENT`, `CHECKPOINT_INTERVAL`, `PAUSE_CHECK_INTERVAL`, `sleep`. Configuration drift is now structurally impossible.

**ADR-M4-2: runCampaignLoop as the single execution path.** `server/campaignLoop.js` exports `runCampaignLoop(campaignId, userId, { logTag, onProgress })`. Both `processCampaign` and `executeCampaign` are reduced to setup + `runCampaignLoop` call. Path-specific concerns (BullMQ job management, inline fire-and-forget) stay in their respective files. The shared module handles everything inside the loop.

**ADR-M4-3: isThrottleError and sendWithRetry moved to campaignLoop.js.** These were logical campaign-loop concerns incorrectly located in worker.js. Moving them eliminates the import dependency between routes.js and worker.js. `worker.js` re-exports `sendWithRetry` for backward compatibility.

**ADR-M4-4: topBouncers threshold reads MIN_SENDER_HEALTH_SENT.** Aligns the admin dashboard's display threshold with the auto-pause enforcement minimum. Operators now only see senders in `topBouncers` who are actually eligible for auto-pause enforcement.

**ADR-M4-5: Startup Redis warning.** When `REDIS_URL` is absent or Redis is unreachable at startup, `server/index.js` emits a `[WARN]` level log explicitly naming the consequence: campaigns run on the inline path, SIGTERM will abandon in-progress campaigns. This is a passive warning — the system continues to operate in degraded mode.

### Scope

2 new files (`campaignConfig.js`, `campaignLoop.js`), 4 modified files. Zero schema migrations. 1 frontend change (History.jsx cancel per-row).

### What Was Implemented

- `server/campaignConfig.js` (new): single source of truth for all campaign runtime constants
- `server/campaignLoop.js` (new): `runCampaignLoop(campaignId, userId, { logTag })` — unified execution loop; `isThrottleError`; `sendWithRetry` moved here from worker.js
- `server/worker.js`: `processCampaign` 400-line body → 4-line `runCampaignLoop` call; re-exports `sendWithRetry`
- `server/routes.js`: `executeCampaign` 400-line body → 3-line `runCampaignLoop` call
- `server/index.js`: REL-001 startup warning when Redis unavailable
- `server/storage.js`: `topBouncers` minimum threshold reads `MIN_SENDER_HEALTH_SENT` (was hardcoded `10`)
- `client/src/pages/History.jsx`: page-level `cancelTarget` state + single `cancelMutation` + `CancelCampaignDialog` per row; admin cancel for other users' campaigns wired through `canCancel` config (UX-002, UX-004 closed)

### Backend Changes

| File | Change |
|---|---|
| `server/campaignConfig.js` | New — all campaign constants |
| `server/campaignLoop.js` | New — unified `runCampaignLoop`, `sendWithRetry`, `isThrottleError` |
| `server/worker.js` | `processCampaign` reduced to 4 lines; re-exports `sendWithRetry` |
| `server/routes.js` | `executeCampaign` reduced to 3 lines |
| `server/index.js` | Startup Redis warning (REL-001) |
| `server/storage.js` | `topBouncers` threshold from config (DEL-002) |

### Frontend Changes

| File | Change |
|---|---|
| `client/src/pages/History.jsx` | Per-row cancel button; `CancelCampaignDialog` integration; admin cancel support |

### Database Changes

None.

### API Changes

None. Behavior of existing campaign execution is identical — the refactor changes structure, not semantics.

### Reliability Improvements

Campaign execution logic now has one canonical implementation. Every future bug fix or feature applies once. Structural drift between execution paths is eliminated.

### Operational Improvements

Startup Redis warning (REL-001) prevents silent degradation to inline mode. `topBouncers` dashboard now only shows senders eligible for auto-pause enforcement.

### UX Improvements

Per-row cancel in History.jsx — users no longer need to navigate to ProgressTracker to cancel a campaign. Admin users can cancel other users' campaigns from the History UI (UX-004 closed).

### Verification Summary

127 behavioral assertions verified across 19 test suites. Zero regressions. Campaign execution behavior confirmed identical before and after extraction via parallel test runs.

### Independent Audit Summary

Audit 063 — 127/127 assertions PASS. Zero execution path divergence found post-extraction.

### Documentation Updated

`AUDIT_TRAIL.md` (Audit 063), `ENGINEERING_BACKLOG.md` (MAINT-001, REL-001, DEL-002, UX-002, UX-004 marked DONE), `HANDOFF.md` (M4 section).

### Related ADRs

ADR-M4-1 (campaignConfig), ADR-M4-2 (runCampaignLoop), ADR-M4-3 (sendWithRetry location), ADR-M4-4 (topBouncers alignment), ADR-M4-5 (Redis startup warning).

### Deferred Work

MAINT-002 (error field naming inconsistency), MAINT-003 (hardcoded CORS origins) — noted in backlog as LOW severity.

### Future Follow-ups

PERF-002 (`getUserById` N queries in global pause resume) and PERF-003 (`getCampaignStatus` frequency in loop at >50K contacts) noted in backlog as LOW severity.

---

## Milestone 5 — Production Safety, Security & Correctness

| Field | Value |
|---|---|
| **Status** | Complete |
| **Audit** | Audit 064 |
| **Commit** | `1eb23a1` |
| **Date** | 2026-06-26 |

### Summary Card

| Field | Value |
|---|---|
| **Status** | Complete |
| **Category** | Security / Observability |
| **Primary Goal** | Close six known production gaps across security, observability, UX, and audit trail |
| **Major Outcome** | SNS misconfiguration now exits at startup; CRLF injection defense on all email headers; full suppression CRUD; CANCELLED dashboard regression fixed; audit constants consistent |
| **Production Impact** | Auto-pause cannot be silently disabled; header injection surface eliminated; users can remove suppression entries; CANCELLED campaigns display correctly |
| **Database Migration** | No |
| **API Changes** | Yes — `DELETE /api/suppressions/:id` added |
| **Frontend Changes** | Yes — Dashboard, Suppressions, Profile |
| **Documentation Updated** | AUDIT_TRAIL.md, ENGINEERING_BACKLOG.md (DEL-001, SEC-001, DEBT-002, DEBT-003, DEBT-006, UX-001 closed), HANDOFF.md |
| **Git Commit** | `1eb23a1` |
| **Independent Audit Status** | Audit 064 — 26/26 assertions PASS |

### Objective

Close six known engineering gaps in a single targeted milestone: a missing startup validation that allowed silent SNS failure in production, a nodemailer CRLF injection vulnerability in email headers, two audit action strings not using constants, a missing suppression delete capability, a CANCELLED status regression on the Dashboard, and a UX gap where clearing a sender name mid-campaign produced no warning.

### Business Motivation

The suppression list page was read-only — users could see their suppressions but had no way to remove them (e.g., to re-enable a contact who had previously bounced from an old address). SNS misconfiguration in production caused bounce and complaint processing to silently fail, meaning auto-pause would never fire — the platform's primary deliverability protection. The CANCELLED dashboard regression caused CANCELLED campaigns to appear as "Queued" (wrong icon, wrong label, wrong tooltip), undermining trust in the UI's accuracy.

### Engineering Motivation

`DEL-001:` `SNS_TOPIC_ARN` absence was logged as a warning and the server continued. In production, this means every bounce and complaint is silently dropped. `auto-pause` never fires. The platform keeps sending to a poisoned list. A production misconfiguration with zero operator-visible consequence.

`SEC-001:` nodemailer ≤ 9.0.0 has a CVE for CRLF injection via `List-*` headers. RepMail added `List-Unsubscribe` headers in an earlier milestone. Without sanitization, a malformed unsubscribe URL could inject arbitrary headers. `encodeURIComponent` already handles URL components but `APP_URL` and `SES_CONFIGURATION_SET` come from environment variables and are not otherwise sanitized.

`DEBT-002:` `Dashboard.jsx` had a local `STATUS_DISPLAY` map with only 5 statuses (no CANCELLED, no DRAFT). When `campaignStatus.js` was introduced in M3B, it was adopted by `History.jsx` and `ProgressTracker.jsx` but not `Dashboard.jsx`. This was a regression — CANCELLED campaigns appeared as "Queued" on the dashboard.

`DEBT-006:` `routes.js` line 1088 used the raw string `"MANUAL_SUPPRESSION_ADDED"` — the only audit action in the codebase not using the `AUDIT_ACTIONS` constant. A typo here would write an unrecognized action to the audit log silently.

### Initial Problems

1. `SNS_TOPIC_ARN` absence logged as warning in production — auto-pause silently disabled.
2. `List-Unsubscribe`, `Feedback-ID`, `X-SES-CONFIGURATION-SET`, `X-SES-MESSAGE-TAGS` headers composed from operator-controlled env vars without CRLF sanitization.
3. `Dashboard.jsx`: local `STATUS_DISPLAY` map missing CANCELLED and DRAFT; four local status getter functions duplicating `campaignStatus.js` logic.
4. No `DELETE /api/suppressions/:id` endpoint; no `deleteSuppression` storage method; no delete UI.
5. `routes.js:1088`: raw string `"MANUAL_SUPPRESSION_ADDED"` instead of `AUDIT_ACTIONS.MANUAL_SUPPRESSION_ADDED`.
6. No warning when `senderName` is cleared in Profile while active campaigns exist.

### Architecture Decisions

**ADR-M5-1: validateProductionConfig() as a named startup function.** The SNS validation is extracted to a dedicated named function rather than an inline check. It uses a `missing[]` array pattern to accommodate future mandatory var additions without restructuring. `SES_CONFIGURATION_SET` is explicitly excluded: some SES setups use notification-level SNS subscriptions that bypass configuration sets — its absence is already surfaced via `/api/health sesTracking`, not via startup exit. This is documented in the function's comment.

**ADR-M5-2: sanitizeHeaderValue() as application-layer defense.** Nodemailer is not upgraded (the CVE fix is in v9.0.1+). Instead, a private module-level `sanitizeHeaderValue()` function strips `\r\n` from all operator-controlled header values. This is defense-in-depth: if nodemailer is upgraded later, the application layer protection remains. The function is applied to exactly the four non-static header values; the static `List-Unsubscribe=One-Click` literal is correctly excluded.

**ADR-M5-3: Suppression delete enforced at storage layer.** `deleteSuppression(id, userId)` takes `userId` as a mandatory parameter. The WHERE clause is `AND(eq(suppressions.id, id), eq(suppressions.userId, userId))`. The ownership check is at the database, not only at the route middleware — even if middleware is bypassed, a user cannot delete another user's suppression. This matches the pattern established for suppression read operations.

**ADR-M5-4: Source-specific warning copy in delete confirmation.** The delete confirmation dialog shows different warning text depending on suppression source: unsubscribe suppressions warn about CAN-SPAM/GDPR violations; complaint suppressions warn about sender reputation risk; bounce suppressions note potential delivery failure. This is not generic "are you sure" copy — it surfaces the specific regulatory and deliverability consequences of the action.

**ADR-M5-5: senderName clear warning is frontend-only, zero extra API calls.** The warning in `Profile.jsx` reuses the already-queried `/api/campaigns` data (present in the component's React Query cache). No new API call. The warning is non-blocking — the user can override. The long-term architectural fix (snapshot sender identity at campaign creation) is explicitly documented as out-of-scope future work and tracked in `ENGINEERING_BACKLOG`.

### Scope

6 files modified. Zero new tables. Zero new API endpoints except `DELETE /api/suppressions/:id`. Zero schema migrations. All `AUDIT_ACTIONS` additions are plain JS object properties — not Drizzle table definitions, requiring no migration.

### What Was Implemented

**DEL-001:** `validateProductionConfig()` in `server/index.js`. `SNS_TOPIC_ARN` absence triggers `process.exit(1)` in production (`NODE_ENV=production`); `console.warn` in development. Replaces the prior bare `console.error` that allowed the server to continue.

**SEC-001:** `sanitizeHeaderValue(str)` in `server/email.js`. Applied to `List-Unsubscribe` URL, `Feedback-ID`, `X-SES-CONFIGURATION-SET`, `X-SES-MESSAGE-TAGS`. Comment documents CVE rationale and which headers are correctly excluded.

**DEBT-002:** `Dashboard.jsx`: `getStatusConfig` imported from `campaignStatus.js`; local `STATUS_DISPLAY`, `getStatusIcon`, `getStatusBadge`, `getStatusLabel`, `getStatusTooltip` removed. Local `STATUS_ICON_COLOR` map added for icon-specific tint classes (badge color and icon color are distinct presentation concerns).

**DEBT-003:** `DELETE /api/suppressions/:id` route; `deleteSuppression(id, userId)` in `storage.js` and `memoryStorage.js`; `SUPPRESSION_DELETED` audit action; `Trash2` icon + `AlertDialog` per suppression row in `Suppressions.jsx` with source-specific warning copy.

**DEBT-006:** `MANUAL_SUPPRESSION_ADDED` and `SUPPRESSION_DELETED` constants added to `AUDIT_ACTIONS` in `schema.js`; `routes.js:1088` updated from raw string to constant.

**UX-001:** Active-campaign warning in `Profile.jsx` when `senderName` is cleared. Uses `activeCampaigns` derived from cached campaign data. Shown below the `senderName` input as an amber `Alert` with count.

### Backend Changes

| File | Change |
|---|---|
| `server/index.js` | `validateProductionConfig()` — startup SNS validation, exits on missing vars in production |
| `server/email.js` | `sanitizeHeaderValue()` — CRLF defense applied to 4 header values |
| `server/routes.js` | `DELETE /api/suppressions/:id`; `AUDIT_ACTIONS.MANUAL_SUPPRESSION_ADDED` constant |
| `server/storage.js` | `deleteSuppression(id, userId)` — ownership-enforced delete |
| `server/memoryStorage.js` | `deleteSuppression(id, userId)` — parity implementation |
| `shared/schema.js` | `MANUAL_SUPPRESSION_ADDED`, `SUPPRESSION_DELETED` added to `AUDIT_ACTIONS` |

### Frontend Changes

| File | Change |
|---|---|
| `client/src/pages/Dashboard.jsx` | `getStatusConfig` import; local STATUS_DISPLAY and 4 getters removed; `STATUS_ICON_COLOR` map |
| `client/src/pages/Suppressions.jsx` | Delete button per row; `AlertDialog` with source-specific warning; `deleteMutation` |
| `client/src/pages/Profile.jsx` | Active-campaign warning when `senderName` cleared |

### Database Changes

None. No schema migrations. All changes are application-layer.

### API Changes

`DELETE /api/suppressions/:id` — soft delete (hard delete with ownership enforcement). Returns `{ message, email }` or `404`.

### Security Improvements

- CRLF injection defense on all non-static email header values (SEC-001)
- Suppression delete ownership enforced at storage layer, not only middleware (DEBT-003)
- `SNS_TOPIC_ARN` absence now a production startup blocker — silent SNS failure eliminated (DEL-001)

### Deliverability Improvements

`SNS_TOPIC_ARN` misconfiguration now caught at startup. Auto-pause cannot be silently disabled by environment misconfiguration.

### UX Improvements

- Suppression list: full CRUD — users can now remove suppression entries with source-appropriate warnings
- Dashboard: CANCELLED campaigns display correctly with "Cancelled" label, Ban icon, slate badge
- Profile: user warned when clearing sender name while campaigns are in-flight

### Operational Improvements

Production startup validation (`validateProductionConfig`) catches critical misconfiguration before the server accepts traffic.

### Verification Summary

26 behavioral assertions passed (Audit 064). Key verifications: SNS startup exit in production mode; sanitizeHeaderValue strips CRLF; Dashboard shows CANCELLED correctly for all 7 statuses; suppression delete returns 404 for wrong user; profile warning appears/disappears correctly based on active campaign count.

### Independent Audit Summary

Audit 064 — 26/26 assertions PASS. Build verification: 5,049 Vite modules resolved, zero errors. No regressions in any previously verified behavior.

### Documentation Updated

`AUDIT_TRAIL.md` (Audit 064 appended), `ENGINEERING_BACKLOG.md` (DEL-001, SEC-001, DEBT-002, DEBT-003, DEBT-006, UX-001 marked DONE), `HANDOFF.md` (M5 section, checklist item 11 added).

### Related ADRs

ADR-M5-1 (validateProductionConfig), ADR-M5-2 (sanitizeHeaderValue), ADR-M5-3 (storage-layer ownership), ADR-M5-4 (source-specific warnings), ADR-M5-5 (zero extra API calls for senderName warning).

### Deferred Work

- Nodemailer upgrade to ≥ 9.0.1 (SEC-001 application-layer patch in place; upgrade deferred to P3 dependency pass)
- Sender identity snapshot at campaign creation (UX-001 long-term fix — tracked in ENGINEERING_BACKLOG)
- `PUT /api/profile` audit log for sender identity changes (SEC-003 — M7)

### Future Follow-ups

SEC-002 (drizzle-orm SQL injection — low exploitability given typed column usage, tracked for P2 dependency update pass).

---

## Milestone 6 — Contact Library

| Field | Value |
|---|---|
| **Status** | Complete |
| **Audit** | Audit 065 (2026-06-26) |
| **Commit** | `d655399` |
| **Date** | 2026-06-26 |

### Summary Card

| Field | Value |
|---|---|
| **Status** | Complete |
| **Category** | Product Capability |
| **Primary Goal** | First-class contact list management — persistent, named, reusable across campaigns |
| **Major Outcome** | Users can now create named contact lists, import contacts via CSV, manage them independently of campaigns, and launch campaigns directly from a saved list. Campaign records carry an immutable list snapshot for history. |
| **Production Impact** | 3 new tables, 2 new columns on existing tables, 12 new API routes, 2 new frontend pages, 1 nav item, campaign wizard extended with library mode |
| **Database Migration** | `migrations/0001_quiet_cobalt_man.sql` — `contact_lists`, `contact_list_members`, `contact_imports`; `contacts.updated_at`; `campaigns.list_id` (ON DELETE SET NULL) + `campaigns.list_snapshot` JSONB |
| **API Changes** | 12 new routes; `POST /api/campaigns` extended with `listId` + `saveToLibraryAs` |
| **Frontend Changes** | `ContactLibrary.jsx` (new), `ContactListDetail.jsx` with import sheet (new), Navbar BookUser item, App.jsx routes, FileUpload tab switcher, CampaignContext/CampaignConfirmation library mode |
| **Documentation Updated** | AUDIT_TRAIL.md (Audit 065), ENGINEERING_MILESTONES.md (this section), ENGINEERING_BACKLOG.md (M6 section) |
| **Git Commit** | `d655399` |
| **Independent Audit Status** | PASS — all categories (Security, Integrity, Edge Cases, API Consistency, Frontend, memoryStorage parity) |

### Design Documents

- M6 Product Architecture Review — approved (2026-06-26)
- M6 Engineering Design Review — approved (2026-06-26)

### Architectural Decisions

| Decision | Rationale |
|---|---|
| Global contacts + named lists (M-N join) | Mirrors Brevo's proven model; contacts deduplicated by `(userId, email)`, reusable across lists |
| No `contacts.deletedAt` in M6 | Deletion is list membership removal; contact records persist for campaign history accuracy |
| `campaigns.listId` FK (ON DELETE SET NULL) + `listSnapshot` | Immutable snapshot at campaign creation; campaigns survive list rename/delete |
| Email as immutable identity key | Email change would create a new logical contact; `PATCH /api/contacts/:id` rejects `email` field |
| `saveToLibraryAs` best-effort, non-fatal | Campaign creation succeeds even if library save fails; avoids blocking user on optional convenience |
| Export stub (501) in M6 | CSV export deferred to M7; stub prevents 404 confusion and is tracked in backlog (M6-003) |
| Import source field | `contact_imports.source`: `library_import` | `campaign_upload` | `api` — enables future analytics on import origin |
| Net list growth stat (`addedToList`) | Import response shows distinct count of NEW list memberships vs. total rows, matching Brevo convention |

### Schema Changes

**New tables:**

```sql
contact_lists         — user-owned named lists
contact_list_members  — M-N join; unique index on (list_id, contact_id)
contact_imports       — import audit log per list; source, counts, timestamps
```

**Altered tables:**

```sql
contacts   — ADD COLUMN updated_at timestamp NOT NULL DEFAULT now()
campaigns  — ADD COLUMN list_id uuid REFERENCES contact_lists(id) ON DELETE SET NULL
           — ADD COLUMN list_snapshot jsonb  -- { name, contactCount }
```

### New API Routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/contact-lists` | List all contact lists for the user (with contact count) |
| POST | `/api/contact-lists` | Create a new list |
| GET | `/api/contact-lists/:id` | Get list detail + contact count |
| PATCH | `/api/contact-lists/:id` | Rename/update list |
| DELETE | `/api/contact-lists/:id` | Hard delete (cascades members + imports) |
| GET | `/api/contact-lists/:id/contacts` | Paginated contacts in list (search, page, limit) |
| POST | `/api/contact-lists/:id/import` | CSV import (rows JSON); 15 MB body limit |
| GET | `/api/contact-lists/:id/imports` | Import history for the list |
| GET | `/api/contact-lists/:id/export` | CSV export — 501 stub in M6 |
| DELETE | `/api/contact-lists/:listId/contacts/:contactId` | Remove contact from list |
| POST | `/api/contact-lists/:id/bulk-remove` | Bulk remove contacts from list |
| PATCH | `/api/contacts/:id` | Update contact fields (email immutable) |

### Storage Methods Added

13 new methods in `storage.js` + full `memoryStorage.js` mirror:
`createContactList`, `getContactLists`, `getContactList`, `updateContactList`, `deleteContactList`, `importContactsToList`, `getContactListContacts`, `removeContactFromList`, `bulkRemoveContactsFromList`, `getContactListImports`, `updateContact`, `resolveListContactIds`

### Behavioral Verification

All 12 API test cases passed (direct DB session injection, against production PostgreSQL):
- Create / read / rename / delete list ✓
- CSV import with bad email rows (failedRows counted correctly) ✓
- Paginated contact listing with search ✓
- Contact field update ✓
- Email change rejection ✓
- Single contact removal from list ✓
- Export stub (501) ✓
- 404 after delete ✓

### Independent Audit Results (Audit 065)

All categories PASS. Findings that became ENGINEERING_BACKLOG items:
- M6-001 — Empty list campaign error message (LOW)
- M6-002 — `saveToLibraryAs` fire-and-forget (LOW)
- M6-003 — Export stub (LOW)
- M6-004 — Large import timing undocumented (INFO)

---

## Document Maintenance

**Append only for completed milestones.** Once a milestone section is written, its historical record is immutable. New milestones are added as new sections. Corrections to factual errors (wrong commit hash, wrong date) may be made with a note.

**Future milestones to be documented:** M8 (Sender Domain Phase 2 — custom domain sending, per `SENDER_DOMAIN_PHASE2_SCOPE.md`), and beyond.

---

## Milestone 7A — Duplicate Campaign

| Field | Value |
|---|---|
| **Status** | Complete |
| **Audit** | Audit 066 (2026-06-27) |
| **Commit** | `ea68878` |
| **Date** | 2026-06-27 |

### Summary Card

| Field | Value |
|---|---|
| **Category** | Product Capability |
| **Primary Goal** | Allow users to re-use a completed campaign as the starting point for a new one |
| **Major Outcome** | History now has a "Duplicate Campaign" button for COMPLETED/FAILED/CANCELLED campaigns. Clicking it deep-links to the wizard pre-filled with the original template, list, and name (suffixed `(Copy)`). Zero backend changes. Zero schema migrations. |
| **Production Impact** | 5 frontend files modified; 1 helper created |
| **Database Migration** | None |
| **API Changes** | None — reuses existing `GET /api/campaigns/:id` |
| **Frontend Changes** | `useSearchParam` helper, `CampaignContext` extended, `campaignStatus.js` `canDuplicate`, `NewCampaign.jsx` deep-link gate, `FileUpload.jsx` auto-tab + pre-select, `TemplateBuilder.jsx` duplicate note, `History.jsx` Duplicate button |

### Architectural Decisions

| Decision | Rationale |
|---|---|
| URL-driven initialization (`?duplicate=<id>`) | URL survives refresh and link sharing; no global state manager needed; consistent with how the platform already handles routing |
| Render gate: fetch before mounting `CampaignProvider` | `useState` reads `initialState` once on first mount; provider must not mount until data is resolved |
| `INITIAL_STATE` exported from context | Enables `resetCampaign()` to reliably clear duplicate state without the caller knowing which fields are duplicate-specific |
| `canDuplicate` in `campaignStatus.js` | Centralizes all campaign action eligibility; avoids scattered status string comparisons in UI components |

### Behavioral Verification

40/40 assertions pass. Two bugs found and fixed:
- Regex quantifier scope for `(Copy)` chain stripping
- Leading space on empty basename

---

## Milestone 7B — Contact Management Completion

| Field | Value |
|---|---|
| **Status** | Complete |
| **Audit** | Audit 067 (2026-06-27) |
| **Commit** | `c4168c8` |
| **Date** | 2026-06-27 |

### Summary Card

| Field | Value |
|---|---|
| **Category** | Product Capability |
| **Primary Goal** | Complete the Contact Library feature: CSV export, contact editing, saveToLibraryAs UX, empty list validation |
| **Major Outcome** | The Contact Library is now fully operational. Users can export any list to CSV, edit individual contact fields, and receive confirmation when a campaign saves its upload to the library. Empty list validation now provides actionable guidance. |
| **Production Impact** | 6 files modified; no new files |
| **Database Migration** | None |
| **API Changes** | `GET /api/contact-lists/:id/export` — fully implemented (was 501 stub); `POST /api/campaigns` — `libraryListId` added to response; `PATCH /api/contacts/:id` — confirmed operational (was already implemented in M6 but unlinked from frontend) |
| **Frontend Changes** | `ContactListDetail.jsx` — EditSheet component; export trigger; `CampaignConfirmation.jsx` — libraryListId toast; `campaignStatus.js` — documentation comments |

### Design Refinements Applied (from Engineering Design Review)

| Refinement | Decision |
|---|---|
| CSV Formula Injection | Values starting with `=`, `+`, `-`, `@` prefixed with `'` — established spreadsheet-safe approach |
| Filename Length Cap | Sanitized to `[a-z0-9 _-]`, capped at 100 chars, fallback `contacts.csv` |
| saveToLibraryAs UX | `createContactList` awaited; `libraryListId` in response; confirmation toast; no "View Library" action (navigating away during campaign launch is disorienting) |
| Contact Edit Dirty State | No confirmation on close — database record is unmodified until Save is clicked; discard is lossless. Matches the ImportSheet pattern. |
| Empty List Messaging | "The selected contact list is empty. Add contacts to this list or choose another list before creating a campaign." |
| Export Ordering | `addedAt ASC` (list membership order, oldest first) — users think in import order, not alphabetical |

### Independent Audit Finding (Fixed)

**UTF-8 BOM missing** — Without a BOM, Excel on Windows interprets UTF-8 CSV as Windows-1252, garbling non-ASCII characters in name/company fields. Fixed: response now prepends `Buffer.from([0xef, 0xbb, 0xbf])`. This is a production-correct fix with no impact on non-Excel parsers (BOM is ignored by RFC 4180-compliant readers).

### Behavioral Verification

42/42 assertions pass:
- CSV escape logic (13 edge cases including formula injection, null, unicode) ✓
- CSV row building (4 scenarios) ✓
- Filename sanitization (8 edge cases) ✓
- Empty list validation response format (3 checks) ✓
- saveToLibraryAs success/failure/absent (4 scenarios) ✓
- Frontend toast condition (4 scenarios) ✓
- Edit mutation field guard (4 checks) ✓
- Export ordering (addedAt ASC vs DESC) ✓

### Resolved Backlog Items

| ID | Resolution |
|---|---|
| M6-001 | Empty list error — specific actionable message |
| M6-002 | saveToLibraryAs — `libraryListId` in response + confirmation toast |
| M6-003 | CSV export — full RFC 4180 implementation with formula injection defense |

---

## Milestone 8 — Launch Readiness Hardening

| Field | Value |
|---|---|
| **Status** | Complete |
| **Audit** | Audit 068 (2026-06-27) |
| **Commit** | `eb2c2d5` |
| **Date** | 2026-06-27 |

### Summary Card

| Field | Value |
|---|---|
| **Category** | Security / Infrastructure |
| **Primary Goal** | Close all P0/P1 security and policy gaps identified in the 9-perspective Production Launch Readiness Review before first external user onboarding |
| **Major Outcome** | Platform-level security hardening: HTTP security headers, Sentry error monitoring with PII filtering, self-service password reset (full end-to-end), credit policy correction, xlsx CVE remediated, drizzle-orm SQL injection fix |
| **Production Impact** | 11 files modified; 2 new frontend pages; package changes (3 added, 1 removed, 2 upgraded) |
| **Database Migration** | `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token text; ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at timestamptz;` |
| **API Changes** | `POST /api/auth/forgot-password` (new); `POST /api/auth/reset-by-token` (new); `GET /api/pricing/plans` — `creditValidityMonths: null` (was `6`); `PUT /api/profile` — audit log added |
| **Frontend Changes** | `ForgotPassword.jsx` (new), `ResetByToken.jsx` (new), Login.jsx "Forgot password?" → `/forgot-password`, Payments.jsx copy, Profile.jsx account deletion section, App.jsx new routes |

### Engineering Items

| ID | Item | Status |
|----|------|--------|
| E-1 | HTTP security headers (Helmet ^8.2.0) | Complete |
| E-2 | Sentry error monitoring (@sentry/node ^10.62.0) | Complete |
| E-3 | Self-service password reset | Complete |
| E-4 | Profile change audit log (`PROFILE_UPDATED`) | Complete |
| E-5 | Credit expiry policy fix (`creditValidityMonths: null`) | Complete |
| E-6 | xlsx → ExcelJS migration (CVE-2023-30533) | Complete |
| E-7 | Account deletion V1 (mailto link) | Complete |
| E-8 | drizzle-orm ^0.45.2 (SEC-002 SQL injection fix) | Complete |

### Key Security Decisions

| Decision | Rationale |
|----------|-----------|
| SHA-256 hash of reset token in DB | Matches `inactivityKeepToken` pattern — consistent precedent, raw token only in email |
| Always-200 on forgot-password | Prevents email enumeration — cannot distinguish registered from unregistered |
| Per-email throttle (15-min minimum) | Token expiry > 45 min remaining → issued < 15 min ago → skip resend |
| `deleteUserSessions` on reset | All sessions invalidated — forces re-auth on all devices |
| `mustResetPassword = false` on token reset | Admin-forced gate cleared — user lands on dashboard, not forced-change page |
| Sentry `beforeSend` PII filter | Strips body, cookies, auth headers, ip, email, username before transmission |
| CSP disabled in helmet | Requires per-route tuning; deferred to avoid breaking existing SPA inline styles |
| Account deletion via mailto (V1) | Self-service delete requires cascading data cleanup and compliance workflow; V1 routes to support team |

---

## Milestone 9 — Custom Sending Domains (M9)

**Status:** Complete  
**Completed:** 2026-06-27  
**Audits:** Audit 070 (implementation) — PASS; Audit 071 (production validation) — PASS with 6 bugs fixed  
**Commits:** `cbfc800` (implementation); validation + docs in subsequent commit

### Overview

Starter+ plan users can send campaigns from their own verified domain instead of the shared RepMail SES address. Uses AWS Easy DKIM for automatic signing — no self-managed RSA keys required.

### Scope

| Item | Description | Status |
|------|-------------|--------|
| E-1 | `senderDomains` table + schema changes | Complete |
| E-2 | `domainManager.js` — domain business logic module | Complete |
| E-3 | Storage methods (10 new; mirrored in memoryStorage) | Complete |
| E-4 | 8 domain API routes (user + admin) | Complete |
| E-5 | Campaign creation: domain validation + `senderEmailSnapshot` | Complete |
| E-6 | Campaign loop: domain check at start + mid-loop recheck every 50 contacts | Complete |
| E-7 | `email.js`: `customFromEmail` parameter in From header | Complete |
| E-8 | Verification polling job (10-min interval, 30s startup delay) | Complete |
| E-9 | `schemaCheck.js` updated for `sender_domains` table | Complete |
| E-10 | `Domains.jsx` page — full lifecycle UI (5 states + DNS instructions + copy buttons) | Complete |
| E-11 | `CampaignConfirmation.jsx` — domain selector (Starter+, VERIFIED only) | Complete |

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| AWS Easy DKIM | Eliminates RSA key generation, AES encryption, and per-message DKIM injection — SES signs automatically |
| `senderEmailSnapshot` on campaigns | Durable copy of fromEmail captured at creation time; domain deletion does not break history display |
| `ON DELETE SET NULL` on `sender_domain_id` FK | Domain hard-delete is safe — only the FK is nulled, the snapshot is preserved |
| `updateSenderDomainIfPending` conditional UPDATE | Polling job cannot revert VERIFIED→PENDING via race condition |
| DB-first removal order | Delete from DB first, then SES — orphaned SES identities are harmless |
| Mid-loop domain recheck every 50 contacts | Admin suspensions propagate within 50 sends without a full-campaign-abort overhead |
| `domainManager.js` isolated module | All SES + domain business logic centralized; routes are thin HTTP wrappers |

### Production Validation — Audit 071 (6 Bugs Fixed)

| ID | Severity | Fix |
|----|----------|-----|
| BUG-1 | HIGH | `CreateEmailIdentityCommand` — added `SigningAttributesOrigin: "AWS_SES"` (required per AWS SDK v3 type contract) |
| BUG-2 | HIGH | `checkDomainVerification` `NotFoundException` — immediately marks FAILED with audit log instead of sitting in limbo until window expires |
| BUG-3 | MEDIUM | Admin suspend — added fire-and-forget email notification to domain owner |
| BUG-4 | LOW | `handleDomainChange` — added `&& val` guard to prevent malformed email when domain field is cleared |
| BUG-5 | HIGH | Pre-loop domain check — fails campaign with `CAMPAIGN_DOMAIN_REVOKED` audit log instead of silently falling back to platform email |
| BUG-6 | LOW | Mid-loop domain recheck — removed redundant `i % 50 === 0` inner condition (dead code when `PAUSE_CHECK_INTERVAL === 50`) |

All 7 validation areas passed after fixes. No architectural changes required. M9 is frozen.

---

## M10 — Email Analytics

**Type:** Infrastructure / Analytics  
**Commit:** `07f39d4`  
**Audit:** Audit 062  
**Status:** Complete

### Objective

Build a production-grade email engagement analytics system using server-managed tracking tokens rather than SES-level event tracking. Track opens and clicks with machine/genuine classification to prevent security gateway pre-scans from inflating engagement metrics.

### What Was Built

| Component | Description |
|---|---|
| `server/trackingTokens` schema table | 22-char base64url tokens (128-bit entropy), FK cascades from campaigns + campaign_emails |
| `server/trackingClassifier.js` | UA classification: 7 machine categories (apple_mpp, gmail_proxy, proofpoint, barracuda, mimecast, abnormal_security, link_scanner), 2 human (mobile, desktop) |
| `server/trackingUtils.js` | `generateTrackingToken`, `TOKEN_RE`, `TRACKING_PIXEL_GIF` (42-byte GIF), `hashIp` (SHA-256 + salt), `extractTemplateLinks` |
| `server/email.js` — `wrapLinksForTracking` | `node-html-parser` HTML link rewriting; try/catch fallback preserves delivery |
| `server/campaignLoop.js` | Per-contact token generation block; graceful null-passthrough on failure |
| `server/storage.js` | 7 new methods: `createTrackingTokensForEmail`, `getTrackingToken`, `recordOpenResolution`, `recordClickResolution`, `getCampaignTrackingBreakdown`, `expireContactTrackingTokens`, `deleteExpiredTrackingTokens` |
| `server/routes.js` | `GET /t/o/:token` (pixel, fire-and-forget open recording), `GET /t/c/:token` (redirect, fire-and-forget click recording), `trackingLimiter` (60/min/IP) |
| `server/index.js` | `/t/` prefix added to public path allowlist; weekly token cleanup job |
| `client/src/pages/LinkExpired.jsx` | Public page for expired/invalid click links |
| `client/src/pages/History.jsx` | Machine activity disclosure (`~X genuine · Y machine (MPP/gateway)`) |

### Key Architectural Decisions

| Decision | Rationale |
|---|---|
| First-event model (`WHERE IS NULL RETURNING id`) | Deduplication under concurrent requests without distributed locking |
| Machine UA classification gate on `clickedAt` | Security gateways pre-scan links; must not consume the genuine click slot |
| `setImmediate` fire-and-forget | Zero latency added to recipient experience |
| `TRACK_BASE_URL` opt-in | Tracking entirely inert when absent; delivery pipeline unmodified |
| `node-html-parser` for link rewriting | Robust over regex; 500KB lighter than cheerio |
| `IP_HASH_SALT` + SHA-256 | Never stores raw IP; satisfies GDPR/privacy baseline |
| `ON DELETE CASCADE` from campaigns + campaign_emails | Token cleanup is automatic on campaign/email deletion |
| Batched delete loop (1000/batch) | Avoids table-level lock contention on large token tables |
| `TRACK_BASE_URL` opt-in deployment gate | SES configuration set must have Open/Click event types disabled at M10 deploy to avoid double-wrapping |

### Behavioural Verification

41/41 checks passed.

### Deferred Work

- Apple MPP IP-range detection (17.0.0.0/8) — deferred to M11
- Tracking tokens DB migration file — deferred to M11 (deployed via db:push initially)
- TRACK_BASE_URL and IP_HASH_SALT startup validation — deferred to M11

---

## M11 — Production Operations & Analytics Accuracy

**Type:** Operations / Security / Analytics  
**Commit:** TBD  
**Audit:** Audit 063-append  
**Status:** Complete

### Objective

Strengthen the platform's operational posture across four areas: (A) create the first formal production runbook as an operational companion to engineering documentation; (B) improve email analytics accuracy by adding Apple MPP IP-range detection; (C) harden M10's environment variable validation and establish migration-based DB deployments; (D) add per-campaign unsubscribe analytics with exact attribution.

### What Was Built

| Component | Description |
|---|---|
| `PRODUCTION_RUNBOOK.md` | Comprehensive operational reference: infrastructure map, all env vars, deployment procedures, DB migration procedure, health check interpretation, all maintenance jobs, rollback procedures, incident response, disaster recovery |
| `server/trackingClassifier.js` — `isAppleMppIp` | IP-range check for 17.0.0.0/8 (Apple iCloud proxy); IPv4-mapped IPv6 handling; IP detection takes precedence over UA string |
| `server/trackingClassifier.js` — `classifyUserAgent` updated | Optional `ip` parameter; IP classification runs before UA pattern matching |
| `server/validateEnv.js` | M10 env var validation: `TRACK_BASE_URL` (URL parse + HTTPS check + trailing slash normalization), `IP_HASH_SALT` (production warning), `TRACKING_TOKEN_RETENTION_DAYS` (range 1–3650) |
| `server/email.js` — `buildUnsubscribeFooter` | Optional `campaignId` parameter; adds `&campaign=UUID` to unsubscribe URL for exact attribution |
| `server/email.js` — `sendCampaignEmail` | New `campaignId` parameter; passed through to `buildUnsubscribeFooter` |
| `server/campaignLoop.js` — `sendWithRetry` | Passes `campaignId` through to `sendCampaignEmail` |
| `shared/schema.js` | `unsubscribed_at` on `campaignEmails`; `unsubscribed_emails` on `campaigns` |
| `migrations/0002_sticky_kulan_gath.sql` | Idempotent migration with `IF NOT EXISTS` throughout; covers M9 + M10 + M11 schema diffs from migration 0001 |
| `server/storage.js` | `recordCampaignEmailUnsubscribed` (exact attribution via campaign+user+email+WHERE IS NULL), `incrementCampaignUnsubscribed` |
| `server/memoryStorage.js` | Both methods mirrored; also fixed pre-existing `incrementCampaignDelivered` gap (iron rule) |
| `server/schemaCheck.js` | `unsubscribed_at` (campaign_emails) + `unsubscribed_emails` (campaigns) column assertions |
| `server/routes.js` — `/api/unsubscribe` | Reads `campaign` query param; fires attribution setImmediate after suppression write; UUID validation on campaign param |
| `server/routes.js` — tracking endpoints | Pass `req.ip` to `classifyUserAgent` for IP-range detection |
| `server/index.js` | Partial CSP via Helmet: blocks external scripts, frames, objects, form actions; `'unsafe-inline'` for styles (required for shadcn/ui SPA) |
| `client/src/pages/History.jsx` | Unsubscribe rate card (rose color, 2 decimal places; `UserMinus` icon) |

### Key Architectural Decisions

| Decision | Rationale |
|---|---|
| IP-range detection takes precedence over UA | Apple proxy may send generic browser UA; IP is authoritative |
| `isAppleMppIp` uses first-octet check, not bitwise | Simpler, avoids JavaScript signed 32-bit arithmetic edge cases for /8 range |
| `&campaign=UUID` without HMAC | Route validates campaign belongs to uid+email server-side — no security risk; worst-case forgery is self-harm on own analytics |
| No heuristic "most recent campaign" attribution | Exact attribution (campaign param) or no attribution (missing param) — never wrong attribution |
| Old links (pre-M11) show 0 unsubscribes | Consistent with M10 pattern: pre-M10 campaigns show 0 opens/clicks |
| Migration 0002 uses `IF NOT EXISTS` throughout | M9 and M10 were deployed via db:push; migration must be idempotent against existing state |
| `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object` | Standard PostgreSQL pattern for idempotent FK constraint creation |
| Partial CSP with `'unsafe-inline'` for styles | shadcn/ui and Tailwind require inline styles; nonce-based CSP deferred to M12 |
| `incrementCampaignDelivered` gap fixed | Pre-existing iron rule violation discovered during M11 audit; fixed as part of memoryStorage additions |

### Behavioural Verification

29/29 checks passed.

### Deferred Work

- RFC 8058 one-click `List-Unsubscribe-Post` endpoint — deferred to M12
- Full nonce-based CSP (eliminating `'unsafe-inline'` for styles) — deferred to M12
- IPv6 Apple MPP range detection — not yet published by Apple

