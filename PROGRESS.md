# RepMail Production Hardening — Progress Log

## Last Updated
2026-06-06T00:00:00Z

## Current Status
Phase 5 IN PROGRESS — awaiting production URL and manual test inputs from operator.

---

## Completed Phases

### Phase 0 — Verification
- Status: COMPLETE
- Committed: PENDING (this commit)
- Findings:

**server/routes.js:**
- GET /api/health — EXISTS (line 341). Registered FIRST before auth. PARTIAL: SMTP check is NOT cached (calls verifySesConnection() live every request). Missing sendPaused field.
- GET /api/admin/queue/status — EXISTS (line 2202).
- POST /api/admin/campaigns/:id/cancel — EXISTS (line 2164).
- GET /api/campaigns/:id/audit — EXISTS (line 1337). getAuditLogs already supports targetId filter.
- GET /api/admin/delivery-health — MISSING.
- GET /api/unsubscribe — EXISTS (line 486). Returns HTML. PARTIAL: "already unsubscribed" state not separately handled (shows same success message as new unsubscribe).
- POST /api/admin/platform/pause-sending — MISSING.

**server/worker.js:**
- repmail:worker:heartbeat — EXISTS. Written at worker init level (line 76-85). Correct placement.
- Per-contact for loop — EXISTS at line 215: `for (let i = 0; i < contactIds.length; i++)` (index-aware).

**server/index.js:**
- CORS localhost:8083 — EXISTS (line 34). Needs removal.
- Inactivity governance job running guard — MISSING. runInactivityJob() at line 78 has NO let running = false guard.
- Cleanup jobs: 6 total (SNS pruning, sessions, audit logs, campaign emails, inactivity tokens, AI usage logs). All have running guards.
- pruneAiUsageLogs call — EXISTS (line 658). AI usage logs cleanup job EXISTS and complete.

**server/storage.js:**
- pruneAiUsageLogs — EXISTS (line 1644).
- getDeliveryHealthStats — MISSING.
- getPlatformSetting — MISSING.
- getUserSenderHealth — MISSING.
- getAuditLogs targetId filter — EXISTS (line 686).

**shared/schema.js:**
- platformSettings table — MISSING.
- sendPaused column on users table — MISSING.

**client/src/pages:**
- Files: AcceptInvite.jsx, Audit.jsx, Contact.jsx, Dashboard.jsx, History.jsx, Landing.jsx, Login.jsx, NewCampaign.jsx, not-found.jsx, Payments.jsx, Pricing.jsx, Profile.jsx, PublicPricing.jsx, ResetPassword.jsx, Templates.jsx, Users.jsx, WaitlistLanding.jsx.
- No dedicated CampaignDetail page found — campaign details likely in History.jsx.

---

**Implementation plan (SKIP vs IMPLEMENT):**

SKIP (already EXISTS and complete):
- Task 2.1: AI usage logs cleanup — EXISTS in index.js + storage.js
- Task 2.2: Worker heartbeat — EXISTS at worker init level, health reads it
- Task 2.3: Force-cancel endpoint — EXISTS
- Task 2.4: Queue status endpoint — EXISTS
- Task 2.5: Campaign audit endpoint — EXISTS (targetId filter also exists)

IMPLEMENT (MISSING or PARTIAL):
- Task 1.1: SES_SEND_RATE_MS startup warning in rateLimiter.js — MISSING
- Task 1.2: SMTP health caching in /api/health + sendPaused:false placeholder — PARTIAL
- Task 1.3: Unsubscribe "already unsubscribed" state — PARTIAL
- Task 1.4: Unsubscribe footer enforcement in campaign validation — MISSING
- Task 1.5: Inactivity job running guard — MISSING
- Task 1.6: Remove localhost:8083 from CORS — NEEDS REMOVAL
- Task 2.6: Delivery health endpoint + storage method — MISSING
- Task 3.1: Global send pause (platformSettings schema + SQL migration) — MISSING
- Task 3.2: Per-user sender health (schema columns + SQL migration) — MISSING
- Task 4.x: Frontend (check History.jsx for campaign detail metrics)

---

### Phase 1 — Safety Fixes
- Status: COMPLETE
- Committed: 2002eb9
- Tasks completed: [1.1, 1.2, 1.3, 1.4, 1.5, 1.6]
- Tasks pending: []
- Notes:
  - 1.1: SES_SEND_RATE_MS warning added to worker.js (var is read there, not rateLimiter.js)
  - 1.2: SMTP caching added (5-min TTL), sendPaused:false placeholder, timestamp field added
  - 1.3: Unsubscribe "already unsubscribed" state added via isSuppressed() pre-check
  - 1.4: CAN-SPAM validation added before blocking gate in POST /api/campaigns
  - 1.5: inactivityJobRunning guard added with finally block
  - 1.6: localhost:8083 removed from CORS allowedOrigins

### Phase 2 — Operational Observability
- Status: COMPLETE
- Committed: PENDING (this commit)
- Tasks completed: [2.1-already-exists, 2.2-already-exists, 2.3-already-exists, 2.4-already-exists, 2.5-already-exists, 2.6]
- Tasks pending: []
- Notes:
  - 2.6: getDeliveryHealthStats added to storage.js + memoryStorage.js mirror + GET /api/admin/delivery-health route
  - No schema change. No migration. No new env vars.

### Phase 3 — SES Reputation Protection
- Status: COMPLETE
- Committed: PENDING (this commit)
- Tasks completed: [3.1, 3.2]
- Notes:
  - 3.1: platformSettings table added to schema. getPlatformSetting/setPlatformSetting added to storage + mirror. Global pause check: pre-loop + every 50 contacts. Mid-loop break sets globalPausedMidLoop flag to prevent PAUSED→COMPLETED overwrite. Three admin routes added.
  - 3.2: sendPaused/sendPausedReason/sendPausedAt added to users schema. updateUser allowlist extended. getUserSenderHealth added to storage + mirror. Pre-loop checks: manual sendPaused flag → FAILED, auto-health threshold (min 50 sent) → FAILED + user auto-pause. sendPaused guard in authMiddleware blocks POST /api/campaigns for paused users.
  - /api/health sendPaused field now reads live from platform_settings (was placeholder false).
  - Global platform pause → campaign status PAUSED (resumable).
  - Manual user pause → campaign status FAILED (requires admin action).
  - Auto sender-health pause → campaign status FAILED (requires admin action).

### Phase 4 — Frontend Completion
- Status: COMPLETE
- Committed: PENDING (this commit)
- Tasks completed: [4.1, 4.2, 4.3]
- Notes:
  - 4.1: Per-contact table (Opened At / Clicked At) added to History.jsx campaign dialog. Aggregate open/click stats already existed — only the per-contact table was missing. Secondary useQuery for /api/campaigns/:id fires when dialog opens.
  - 4.2: DeliveryHealthPanel.jsx created. Bounce/complaint rate bars (green/yellow/red), suppression stats, top bouncer table, pause/resume buttons with AlertDialog confirmation. Rendered in Dashboard.jsx under isRootAdmin guard.
  - 4.3: PauseBanners component added to AppLayout.jsx. Uses useAuth() for user.sendPaused, useQuery for /api/health sendPaused (30s refetch). Platform pause banner (yellow) + user pause banner (red). No new hook or context created.
  - Auth pattern: useAuth() from existing @/context/AuthContext used throughout — no new auth mechanism introduced.

### Phase 5 — Real-World Validation
- Status: IN PROGRESS
- Committed: rolling (checkpoints after S1, S2, all complete)

#### Pre-flight code analysis (completed without production access)

**SNS confirmation path (routes.js:612–622):**
- Auto-confirmed by fetching SubscribeURL on receipt of SubscriptionConfirmation message
- Evidence marker in logs: `[SNS] Subscription confirmed — HTTP 200`
- TopicArn guard active if SNS_TOPIC_ARN env var is set

**Complaint handler (routes.js:702–710):**
- Source: `complaint@simulator.amazonses.com` triggers an SNS Complaint event
- Handler: addSuppression(userId, emailAddress, 'complaint'), updateCampaignEmail(COMPLAINED), incrementCampaignComplained
- Guard: only fires for permanent bounces (bounceType check); complaint has no equivalent filter

**Recovery logic (index.js:485–524):**
- Recovers RUNNING → FAILED if no live BullMQ job found
- Does NOT recover PENDING campaigns

**Test 2.2B watchdog gap — CONFIRMED (code analysis):**
- Scheduler only re-queues PENDING campaigns with past scheduledAt (index.js:691)
- recoverStaleCampaigns only processes RUNNING (index.js:487)
- GAP: immediate (no scheduledAt) PENDING campaign with lost BullMQ job has no automatic recovery
- Severity: depends on Redis persistence config (RDB/AOF). If Redis persists jobs across restart, gap does not manifest. If Redis is ephemeral, PENDING campaigns are orphaned.
- STATUS: documented as known risk per Phase 5 rules — no fix implemented

---

#### Test Results

| Test | Status | Notes |
|------|--------|-------|
| SNS Pre-check | PENDING | Needs Railway log search |
| 4.2 Auth headers | PENDING | Needs email header inspection |
| 1.1 Baseline send | PENDING | Needs production URL + inboxes |
| 1.2 SES delivery | PENDING | Needs DB + AWS console |
| 1.3 Open tracking | PENDING | Needs inbox + Railway logs |
| 1.4 Click tracking | PENDING | Needs inbox + Railway logs |
| 1.5 Unsubscribe | PENDING | Needs browser + DB |
| 1.6 Bounce handling | PENDING | Needs DB + Railway logs |
| 1.7 Complaint handling | PENDING | Needs SES simulator + DB |
| 2.1 Redis fallback | PENDING | Needs Railway logs |
| 2.2 Worker restart | PENDING | Needs Railway restart + DB |
| 2.2B Restart PENDING | DOCUMENTED | Known risk — see above |
| 2.3 Global pause | PENDING | Needs API calls + DB |
| 2.4 Auto-pause | PENDING | Needs DB seed + API calls |
| 2.5 Credit exhaustion | PENDING | Needs DB seed + API calls |
| 3.1 Retry safety | PENDING | Depends on 2.4/2.5 results |
| 3.2 Paused resume | PENDING | Depends on 2.3 results |
| 3.3 Health endpoint | PENDING | Needs API calls |
| 4.1 Inbox placement | PENDING | Depends on 1.1 results |

#### Known Risks Documented During Phase 5
- KR-1: Immediate PENDING campaigns orphaned on restart if BullMQ job lost (no scheduledAt watchdog) — low probability if Redis has AOF persistence, high probability if Redis is ephemeral. No fix during Phase 5 per instructions.

---

## Environment Variables Required
- AI_USAGE_LOG_RETENTION_DAYS (default 90) — already in Railway? Check.
- SES_SEND_RATE_MS=75 — MUST be set in Railway before deploy (manual action required).
- BOUNCE_RATE_PAUSE_THRESHOLD (default 0.15) — Phase 3
- COMPLAINT_RATE_PAUSE_THRESHOLD (default 0.005) — Phase 3

## Migration SQL Required
(None yet — Phase 3 will require SQL for platform_settings table and user columns)

### Phase 3 SQL (apply BEFORE deploying Phase 3 code):
```sql
CREATE TABLE IF NOT EXISTS platform_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS send_paused boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS send_paused_reason text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS send_paused_at timestamp;
```

## Known Issues / Blockers
- RESOLVED: Stripe startup crash — stripeWebhook.js threw unconditionally in production when STRIPE_WEBHOOK_SECRET unset. Fixed in hotfix commit (see below). Guard now only fires when STRIPE_SECRET_KEY is also set.
- Human action required: Set SES_SEND_RATE_MS=75 in Railway before first deploy.
- Human action required: Apply Phase 3 SQL migrations before deploying Phase 3 code.

## Post-Phase-3 Correctness Fixes
### isRetry + auto-requeue (approved pre-Phase-4 changes)
- Commit: PENDING (this commit)
- File 1: server/worker.js line 165 — isRetry now includes `status === "PAUSED" && hasAnySentEmails`
- File 2: server/routes.js resume-sending route — now queries all PAUSED campaigns and calls addCampaignJob() for each on resume; returns requeuedCampaigns count; audit log includes count
- Duplicate-job safety: addCampaignJob uses jobId=campaignId (BullMQ dedup) — calling it twice is a no-op
- Effect: mid-loop paused campaigns that already sent some emails will correctly skip those contacts on re-queue

## Hotfixes Applied (outside phase plan)
### Stripe startup crash fix
- Commit: PENDING (this commit)
- File: server/stripeWebhook.js line 18
- Change: `process.env.NODE_ENV === "production"` → `process.env.STRIPE_SECRET_KEY`
- Effect: Server starts cleanly when Stripe is not configured. Throw still fires if STRIPE_SECRET_KEY is set but STRIPE_WEBHOOK_SECRET is absent (correct behavior).
- Root cause: stripeWebhook.js was added in commit f4e5624 (pre-hardening branch) with an unconditional production throw that contradicted the optional-gateway design in gateways.js.
