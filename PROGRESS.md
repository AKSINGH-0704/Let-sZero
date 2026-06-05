# RepMail Production Hardening — Progress Log

## Last Updated
2026-06-05T00:00:00Z

## Current Status
Phase 2 complete. Stripe startup-crash hotfix applied (pre-Phase-3 blocker). Awaiting Phase 3 approval.

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
- RESOLVED: Stripe startup crash — stripeWebhook.js threw unconditionally in production when STRIPE_WEBHOOK_SECRET unset. Fixed in hotfix commit (see below). Guard now only fires when STRIPE_SECRET_KEY is also set.
- Human action required: Set SES_SEND_RATE_MS=75 in Railway before first deploy.
- Human action required: Apply Phase 3 SQL migrations before deploying Phase 3 code.

## Hotfixes Applied (outside phase plan)
### Stripe startup crash fix
- Commit: PENDING (this commit)
- File: server/stripeWebhook.js line 18
- Change: `process.env.NODE_ENV === "production"` → `process.env.STRIPE_SECRET_KEY`
- Effect: Server starts cleanly when Stripe is not configured. Throw still fires if STRIPE_SECRET_KEY is set but STRIPE_WEBHOOK_SECRET is absent (correct behavior).
- Root cause: stripeWebhook.js was added in commit f4e5624 (pre-hardening branch) with an unconditional production throw that contradicted the optional-gateway design in gateways.js.
