# RepMail Production Hardening — Progress Log

## Last Updated
2026-06-05T00:00:00Z

## Current Status
Phase 0 complete. Proceeding to Phase 1, Task 1.1.

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
- Status: NOT STARTED
- Committed: PENDING
- Tasks completed: []
- Tasks pending: [1.1, 1.2, 1.3, 1.4, 1.5, 1.6]

### Phase 2 — Operational Observability
- Status: NOT STARTED
- Committed: PENDING
- Tasks completed: [2.1-already-exists, 2.2-already-exists, 2.3-already-exists, 2.4-already-exists, 2.5-already-exists]
- Tasks pending: [2.6]

### Phase 3 — SES Reputation Protection
- Status: NOT STARTED

### Phase 4 — Frontend Completion
- Status: NOT STARTED

### Phase 5 — Real-World Validation
- Status: NOT STARTED

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
- None at Phase 0 level.
- Human action required: Set SES_SEND_RATE_MS=75 in Railway before first deploy.
- Human action required: Apply Phase 3 SQL migrations before deploying Phase 3 code.
