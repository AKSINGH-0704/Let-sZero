# RepMail Production Runbook

**Purpose:** Operational reference for deploying, monitoring, and recovering RepMail in production.  
**Audience:** Engineers deploying or operating RepMail on Railway.  
**Last updated:** M11 (2026-06-27)

---

## Contents

1. [Infrastructure Map](#1-infrastructure-map)
2. [Environment Variables Reference](#2-environment-variables-reference)
3. [First-Time Deployment Checklist](#3-first-time-deployment-checklist)
4. [Routine Deployment Procedure](#4-routine-deployment-procedure)
5. [Database Migration Procedure](#5-database-migration-procedure)
6. [Health Check Reference](#6-health-check-reference)
7. [Startup Validation Reference](#7-startup-validation-reference)
8. [Schema Integrity Check Reference](#8-schema-integrity-check-reference)
9. [Maintenance Jobs Reference](#9-maintenance-jobs-reference)
10. [Rollback Procedures](#10-rollback-procedures)
11. [Incident Response](#11-incident-response)
12. [Disaster Recovery](#12-disaster-recovery)

---

## 1. Infrastructure Map

```
┌────────────────────────────────────────────────────────┐
│                    Railway Project                      │
│                                                        │
│  ┌──────────────┐   ┌───────────────┐                 │
│  │  Node.js App │   │  PostgreSQL   │                 │
│  │  (Express +  │──▶│  (Drizzle ORM)│                 │
│  │   BullMQ)    │   └───────────────┘                 │
│  └──────┬───────┘                                      │
│         │         ┌───────────────┐                   │
│         └────────▶│  Redis        │                   │
│                   │  (BullMQ jobs)│                   │
│                   └───────────────┘                   │
└────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────┐
│                    AWS Services                       │
│                                                      │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   SES SMTP   │  │  SNS Topic  │  │     S3      │ │
│  │  (send mail) │  │  (bounces/  │  │  (exports)  │ │
│  └──────────────┘  │  complaints)│  └─────────────┘ │
│                    └─────────────┘                   │
└──────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────┐  ┌─────────────┐  ┌──────────┐
│      Razorpay        │  │   OpenAI    │  │  Sentry  │
│  (INR payments)      │  │  (AI tools) │  │  (errors)│
└──────────────────────┘  └─────────────┘  └──────────┘
```

**Railway services:** Node.js app process, PostgreSQL (managed), Redis (managed).  
**Railway health check endpoint:** `GET /api/health` (always HTTP 200, status in body).

---

## 2. Environment Variables Reference

### Critical — server will not start without these

| Variable | Purpose | Absent behavior |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `process.exit(1)` at startup |
| `SESSION_SECRET` | Express session signing key | Sessions unsigned → security failure |
| `UNSUBSCRIBE_SECRET` | HMAC key for unsubscribe tokens | Falls back to insecure dev default |

### Email delivery

| Variable | Purpose | Absent behavior | Example |
|---|---|---|---|
| `SES_SMTP_HOST` | AWS SES SMTP endpoint | SMTP disabled, no mail sent | `email-smtp.us-east-1.amazonaws.com` |
| `SES_SMTP_PORT` | SMTP port | Defaults to `587` | `587` |
| `SES_SMTP_USER` | SES SMTP IAM user | SMTP auth fails | `AKIAIOSFODNN7EXAMPLE` |
| `SES_SMTP_PASS` | SES SMTP IAM password | SMTP auth fails | `wJalrXUtnFEMI...` |
| `SES_FROM_EMAIL` | Default platform From address | Mail rejected by SES | `hello@repmail.in` |
| `SES_FROM_NAME` | Default From display name | Defaults to `RepMail` | `RepMail` |
| `SES_CONFIGURATION_SET` | SES config set for bounce/complaint events | SNS events not received — open/click/delivery tracking disabled | `repmail-production` |
| `SES_RATE_PER_SECOND` | Send rate cap (emails/second) | Defaults to `14` | `14` |
| `SES_SEND_RATE_MS` | Per-email delay in milliseconds (alternative to SES_RATE_PER_SECOND) | Defaults to `0` | `100` |

### SNS / Webhooks

| Variable | Purpose | Absent behavior |
|---|---|---|
| `SNS_TOPIC_ARN` | ARN of the SNS topic that delivers SES events | Bounce/complaint webhook verification skipped in dev; fatal in prod |
| `APP_URL` | Public base URL of the application | Unsubscribe and callback URLs broken |

### AWS (S3 / Domain verification)

| Variable | Purpose | Absent behavior |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | IAM key for SES domain verification and S3 | Domain verification and S3 exports fail |
| `AWS_SECRET_ACCESS_KEY` | IAM secret | Same as above |
| `AWS_REGION` | AWS region | Defaults to `us-east-1` |

### Queue / Redis

| Variable | Purpose | Absent behavior |
|---|---|---|
| `REDIS_URL` | BullMQ Redis connection string | Campaign queue disabled; campaigns run in-process |
| `CAMPAIGN_QUEUE_CONCURRENCY` | Concurrent campaign workers | Defaults to `2`; validated 1–10 |

### Email analytics tracking (M10)

| Variable | Purpose | Absent behavior | Note |
|---|---|---|---|
| `TRACK_BASE_URL` | Base URL for open/click tracking links | Tracking entirely inert — delivery unaffected | Must be HTTPS in production; trailing slash auto-stripped |
| `IP_HASH_SALT` | SHA-256 salt for IP anonymization | Uses known-default string; weaker anonymization | Set a unique random secret |
| `TRACKING_TOKEN_RETENTION_DAYS` | Days before tracking tokens expire | Defaults to `730` (2 years); validated 1–3650 | |

### Third-party integrations

| Variable | Purpose | Absent behavior |
|---|---|---|
| `OPENAI_API_KEY` | AI template generation + spam analysis | AI features disabled |
| `RAZORPAY_KEY_ID` | Razorpay payment key | Payments disabled |
| `RAZORPAY_KEY_SECRET` | Razorpay payment secret | Payments disabled |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook HMAC verification | Razorpay webhooks rejected |
| `GOOGLE_CLIENT_ID` | Google OAuth app ID | Google login disabled |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | Google login disabled |
| `SENTRY_DSN` | Sentry error reporting endpoint | Error reporting disabled |

### Operational

| Variable | Purpose | Default | Validated |
|---|---|---|---|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | HTTP listen port | `5000` | No |
| `BOUNCE_RATE_PAUSE_THRESHOLD` | Sender health auto-pause threshold | `0.05` (5%) | Yes: 0–0.20 |
| `COMPLAINT_RATE_PAUSE_THRESHOLD` | Complaint rate auto-pause threshold | `0.001` (0.1%) | Yes: 0–0.005 |
| `CAMPAIGN_EMAIL_RETENTION_DAYS` | Days before old campaign_emails rows are deleted | `90` | No |
| `AUDIT_LOG_RETENTION_DAYS` | Days before audit log rows are deleted | `365` | No |
| `AI_USAGE_LOG_RETENTION_DAYS` | Days before AI log rows are deleted | `90` | No |
| `DOMAIN_VERIFICATION_WINDOW_DAYS` | Days allowed to verify a custom domain | `14` | No |
| `FREE_PLAN_ENABLED` | Whether free plan is accepting new users | `true` | No |
| `PLATFORM_ALERT_EMAIL` | Recipient for platform alert emails | None | No |
| `RECOVERY_EMAIL` | Fallback email for root admin recovery | None | No |

### Bootstrap (first deploy only)

| Variable | Purpose |
|---|---|
| `ADMIN_USERNAME` | Root admin username created on first boot |
| `ADMIN_PASSWORD` | Root admin password created on first boot |
| `ADMIN_EMAIL` | Root admin email created on first boot |

---

## 3. First-Time Deployment Checklist

Perform these steps in order on a fresh Railway project.

**Infrastructure**

- [ ] Create PostgreSQL service in Railway
- [ ] Create Redis service in Railway
- [ ] Set `DATABASE_URL` from PostgreSQL connection string
- [ ] Set `REDIS_URL` from Redis connection string

**AWS**

- [ ] Create SES SMTP credentials (IAM user with `ses:SendRawEmail`)
- [ ] Verify the platform From address in SES (or move out of SES sandbox)
- [ ] Create SNS topic for SES events (bounces, complaints, deliveries)
- [ ] Subscribe RepMail's `/api/webhooks/sns` URL to the SNS topic
- [ ] Create SES Configuration Set; attach SNS topic; enable Bounce, Complaint, and Delivery event types
- [ ] If email analytics tracking is enabled: disable Open and Click event types in the SES Configuration Set (M10 does its own open/click tracking — SES-level tracking would double-wrap links)
- [ ] Set `SES_SMTP_HOST`, `SES_SMTP_PORT`, `SES_SMTP_USER`, `SES_SMTP_PASS`
- [ ] Set `SES_FROM_EMAIL`, `SES_FROM_NAME`, `SES_CONFIGURATION_SET`
- [ ] Set `SNS_TOPIC_ARN`
- [ ] Create IAM user for domain verification; set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`

**Application**

- [ ] Set `APP_URL` to the Railway public URL (e.g. `https://letszero.up.railway.app`)
- [ ] Set `SESSION_SECRET` to a random 64-byte hex string (`openssl rand -hex 64`)
- [ ] Set `UNSUBSCRIBE_SECRET` to a random 32-byte hex string (`openssl rand -hex 32`)
- [ ] Set `NODE_ENV=production`
- [ ] Set `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (these bootstrap the root admin; can be removed after first boot)

**Database**

- [ ] Run `npm run db:migrate` to apply all schema migrations
- [ ] Verify: connect to DB and run `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';` — expect 21 tables

**Boot verification**

- [ ] Deploy the application
- [ ] Check Railway logs for `[STARTUP]` lines — no FATAL errors
- [ ] Call `GET /api/health` — expect `{ "status": "ok", "postgres": "connected", "redis": "connected", "worker": "running" }`
- [ ] Log in as root admin; create a test user; send a test email

---

## 4. Routine Deployment Procedure

```
git push origin main
```

Railway auto-deploys on push. The process:

1. Railway builds the new image
2. Old container stays alive serving traffic
3. New container starts; Express begins accepting connections when `/api/health` returns 200
4. Railway routes traffic to the new container
5. Old container is terminated

**Pre-deploy checklist:**
- [ ] All new environment variables are set in Railway (check the diff)
- [ ] If schema changed: migration file committed and tested locally

**Post-deploy verification:**
- [ ] `GET /api/health` returns `{ "status": "ok" }` on the new container
- [ ] Railway logs show no `[STARTUP] FATAL` lines
- [ ] Queue worker heartbeat is present (`result.worker === "running"`)

---

## 5. Database Migration Procedure

RepMail uses Drizzle ORM with file-based migrations.

### Applying migrations on deployment

```bash
npm run db:migrate
```

This applies any unapplied migrations from `migrations/` in order. It is idempotent — already-applied migrations are skipped (tracked in `drizzle/__drizzle_migrations` table).

**Migration history:**

| Migration | Contents | Applied via |
|---|---|---|
| `0000_mean_speedball.sql` | Initial schema | `db:migrate` |
| `0001_quiet_cobalt_man.sql` | Contact Library (M6) | `db:migrate` |
| `0002_sticky_kulan_gath.sql` | Custom Domains (M9) + Tracking Tokens (M10) + Unsubscribe Analytics (M11) | `db:migrate` — idempotent (IF NOT EXISTS throughout) |

**M9 and M10 note:** Before migration-based deployments were established, the `sender_domains` and `tracking_tokens` tables (and their associated columns) were deployed via `db:push`. Migration `0002` carries `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` guards throughout, making it safe to apply on any environment regardless of prior `db:push` state.

### Generating a new migration

```bash
npm run db:generate
```

Compares the current `shared/schema.js` against the last committed migration snapshot (`migrations/meta/`) and generates a new SQL file. **Always review the generated file before committing.**

### When to use db:push vs. db:migrate

| Use `db:push` | Use `db:migrate` |
|---|---|
| Local development only | Production and staging always |
| Schema exploration, rapid iteration | Any environment where data must survive |

Never run `db:push` on production. It overwrites the schema without recording migration history and has no rollback path.

---

## 6. Health Check Reference

**Endpoint:** `GET /api/health`  
**Always returns HTTP 200.** Individual component status is in the body.

```json
{
  "status": "ok",
  "uptime": 3600,
  "postgres": "connected",
  "redis": "connected",
  "worker": "running",
  "smtp": "ok",
  "sendPaused": false,
  "ai": "ok",
  "sesTracking": "configured",
  "timestamp": "2026-06-27T00:00:00.000Z"
}
```

| Field | Values | Meaning | Action if bad |
|---|---|---|---|
| `status` | `ok` / `degraded` | Overall health; `degraded` if any component is unhealthy | Investigate individual fields |
| `postgres` | `connected` / `dev-mode` / `error: <msg>` | PostgreSQL connectivity (3s timeout) | Check DATABASE_URL; check Railway PostgreSQL service status |
| `redis` | `connected` / `not-configured` / `error: <msg>` | Redis connectivity (3s timeout) | Check REDIS_URL; check Railway Redis service status |
| `worker` | `running` / `stalled` / `unknown` / `disabled` | BullMQ worker heartbeat (written every 30s, TTL 60s) | If `stalled`: check Railway logs for `[WORKER]` errors; restart if necessary |
| `smtp` | `ok` / `error` / `not-configured` | SMTP TCP connectivity to SES (cached 5 minutes) | Check SES credentials; check AWS SES service status |
| `sendPaused` | `true` / `false` | Whether platform-wide sending is paused | If `true` unexpectedly: check for bounce/complaint spike; see incident response |
| `ai` | `ok` / `quota_exceeded` / `error` / `unknown` | OpenAI API status | Check OPENAI_API_KEY; check OpenAI service status |
| `sesTracking` | `configured` / `not-configured — ...` | Whether SES configuration set is set | If not-configured: open/click/delivery SNS events are disabled |
| `uptime` | seconds | Process uptime | If very low: recent restart — check logs for crash |

---

## 7. Startup Validation Reference

`validateEnv()` runs synchronously before the HTTP server binds. A fatal error calls `process.exit(1)`.

| Check | Fatal? | Variable | Condition |
|---|---|---|---|
| Bounce rate threshold | Yes | `BOUNCE_RATE_PAUSE_THRESHOLD` | Must be a number, > 0, ≤ 0.20 |
| Complaint rate threshold | Yes | `COMPLAINT_RATE_PAUSE_THRESHOLD` | Must be a number, > 0, ≤ 0.005 |
| SES send rate | Yes | `SES_SEND_RATE_MS` | Must be a number, ≥ 0, ≤ 30000 |
| Queue concurrency | Yes | `CAMPAIGN_QUEUE_CONCURRENCY` | Must be an integer, 1–10 |
| Tracking base URL | Yes (in production) | `TRACK_BASE_URL` | Must be a valid URL if set; must be HTTPS in production |
| IP hash salt | Warning only | `IP_HASH_SALT` | Warns if unset in production |
| Token retention days | Yes | `TRACKING_TOKEN_RETENTION_DAYS` | Must be integer 1–3650 if set |

**Diagnosing startup failures:**

```
[STARTUP] FATAL: BOUNCE_RATE_PAUSE_THRESHOLD=... error message
[STARTUP] 1 fatal env var validation error(s). Fix the above and restart.
```

Fix the variable in Railway environment settings, then redeploy or restart.

`validateProductionConfig()` runs after startup and logs warnings for missing-but-recommended vars (like `SNS_TOPIC_ARN`). These do not exit the process but indicate a degraded configuration.

---

## 8. Schema Integrity Check Reference

`runSchemaCheck()` runs at startup and verifies critical tables, columns, and indexes exist in the database.

**Critical checks** (`critical: true`) cause a startup failure if the table/column/index is missing — these are required for core functionality.

**Non-critical checks** (`critical: false`) log a warning only — these cover analytics, domain management, and tracking features that degrade gracefully.

Failing checks log:
```
[SCHEMA] CRITICAL: Table "campaigns" missing column "sent_emails" — platform cannot function correctly.
```

**If a critical check fails:**
1. Verify that `npm run db:migrate` was run after the latest deployment
2. Connect to the database and check `SELECT column_name FROM information_schema.columns WHERE table_name = '<table>';`
3. If the column is truly missing, run `npm run db:migrate` again — it may have been interrupted

**If a non-critical check fails:**
1. Log a note; it will not block the server
2. Run `npm run db:migrate` at next maintenance window

---

## 9. Maintenance Jobs Reference

All jobs start after a delay post-boot to avoid racing with startup. All jobs use a guard flag to prevent overlapping runs.

| Job | Frequency | Startup delay | Log prefix | What it does |
|---|---|---|---|---|
| Inactivity governance | Every 6 hours | 30 minutes | `[INACTIVITY JOB]` | Warns inactive users, sets dormant status, reclaims credits |
| SNS event deduplication cleanup | Every 24 hours | 5 minutes | `[CLEANUP]` | Deletes `sns_events` rows older than 7 days |
| Expired session cleanup | Every 24 hours | 10 minutes | `[CLEANUP]` | Deletes expired session rows |
| Campaign email cleanup | Every 7 days | 15 minutes | `[CLEANUP]` | Deletes `campaign_emails` older than `CAMPAIGN_EMAIL_RETENTION_DAYS` (default 90d) |
| Audit log cleanup | Every 30 days | 20 minutes | `[CLEANUP]` | Deletes audit logs older than `AUDIT_LOG_RETENTION_DAYS` (default 365d) |
| AI usage log cleanup | Every 30 days | 25 minutes | `[CLEANUP]` | Deletes AI logs older than `AI_USAGE_LOG_RETENTION_DAYS` (default 90d) |
| Expired invite cleanup | Every 24 hours | 10 minutes | `[CLEANUP]` | Deletes expired invites |
| Domain verification poll | Every 15 minutes | 5 minutes | `[DOMAIN-POLL]` | Checks PENDING_VERIFICATION domains for DNS propagation |
| Expired tracking token cleanup | Every 7 days | 30 seconds | `[CLEANUP]` | Batched deletion of expired `tracking_tokens` rows |

**Triggering manually** (if a job needs to run outside its schedule):

These jobs cannot be triggered via API in the current implementation. To force a run:
1. Restart the application (jobs run shortly after boot with their startup delays)
2. Or execute directly against the database: `DELETE FROM tracking_tokens WHERE expires_at < NOW();` (safe at any time)

**If a cleanup job consistently fails:**
Check Railway logs for the specific `[CLEANUP]` error line. Common causes: DB connection timeout (check DATABASE_URL), table doesn't exist (run `db:migrate`).

---

## 10. Rollback Procedures

### Application code rollback

Railway keeps the previous deployment image. In the Railway dashboard:

1. Go to the service → Deployments
2. Find the last known-good deployment
3. Click "Redeploy" on that deployment

Or via CLI:
```bash
railway rollback
```

### Database migration rollback

If a migration introduced a breaking schema change and must be reversed:

**Migration 0002 rollback** (M9 + M10 + M11 additions):
```sql
-- Remove M11 additions (unsubscribe analytics)
ALTER TABLE campaign_emails DROP COLUMN IF EXISTS unsubscribed_at;
ALTER TABLE campaigns DROP COLUMN IF EXISTS unsubscribed_emails;

-- Remove M10 additions (tracking tokens)
DROP TABLE IF EXISTS tracking_tokens;

-- Remove M9 additions (custom domains)
ALTER TABLE campaigns DROP COLUMN IF EXISTS sender_domain_id;
ALTER TABLE campaigns DROP COLUMN IF EXISTS sender_email_snapshot;
DROP TABLE IF EXISTS sender_domains;

-- Remove user self-service password reset columns (added in parallel with M9)
ALTER TABLE users DROP COLUMN IF EXISTS reset_token;
ALTER TABLE users DROP COLUMN IF EXISTS reset_token_expires_at;
```

After running rollback SQL, also delete the migration record:
```sql
DELETE FROM drizzle.__drizzle_migrations WHERE tag = '0002_sticky_kulan_gath';
```

**IMPORTANT:** Rolling back M10 destroys all tracking token data. Rolling back M9 destroys all custom domain data. Confirm with the team before executing.

### Environment variable rollback

1. In Railway environment settings, revert the changed variable
2. Restart the service (environment changes require a restart)

---

## 11. Incident Response

### Bounce rate spike

**Symptom:** `sendPaused: true` in health response; `[AUTO-PAUSE]` log lines; users unable to send campaigns.

**Cause:** Bounce rate exceeded `BOUNCE_RATE_PAUSE_THRESHOLD` (default 5%) in a recent sending window.

**Response:**
1. Identify which user's campaign triggered the pause via audit logs: `SELECT * FROM audit_logs WHERE action = 'PLATFORM_SEND_PAUSED' ORDER BY created_at DESC LIMIT 5;`
2. Check the offending campaign's contact list for invalid addresses
3. Clean the contact list; add bad addresses to suppressions
4. Resume sending via Admin → Platform Settings → Resume Sending
5. Monitor bounce rate in the next campaign; adjust `BOUNCE_RATE_PAUSE_THRESHOLD` if needed

### Complaint spike

**Symptom:** Same as bounce rate spike but triggered by complaint events.

**Response:** Same flow as above. Complaint spikes are more serious — AWS SES has a 0.1% complaint rate threshold. If the complaint rate approaches 0.1%, review email content and contact list quality immediately.

### SES account suspension

**Symptom:** SMTP errors in logs; `smtp: "error"` in health response; all campaign sends failing.

**Response:**
1. Log in to AWS SES console and check account status
2. File a support case if suspended; prepare an action plan covering bounce/complaint remediation
3. Do not attempt to bypass — all sends will fail regardless until AWS lifts the suspension
4. Communicate to affected users

### Campaign queue backup

**Symptom:** Campaigns stuck in `RUNNING` state for extended periods; `worker: "stalled"` in health; BullMQ queue depth growing.

**Response:**
1. Check Railway logs for `[WORKER]` errors
2. Check Redis connectivity (`redis` field in health response)
3. If Redis is healthy: restart the application (worker restarts with it)
4. If Redis is not healthy: check Railway Redis service status; Redis may have OOM-killed
5. After recovery, in-progress campaigns will be picked up by the PENDING watchdog within 5 minutes

### SNS webhook failures

**Symptom:** Bounces and complaints not reflected in the database; `sesTracking` shows `not-configured` or SNS stops delivering.

**Diagnosis:**
```sql
-- Check if bounce events are being received
SELECT event_type, processed_at FROM sns_events ORDER BY processed_at DESC LIMIT 20;
```

If no recent rows: SNS is not delivering.

**Response:**
1. Check SNS topic subscription in AWS console — is the RepMail endpoint confirmed?
2. Re-subscribe if needed: go to SNS → Subscriptions → Create Subscription → HTTPS → `https://<APP_URL>/api/webhooks/sns`
3. If endpoint confirmation fails: verify `APP_URL` is correct and the server is publicly reachable

### Payment failure (Razorpay)

**Symptom:** Users report payment failures; `PAYMENT_FAILED` events in audit logs.

**Response:**
1. Check Razorpay dashboard for failed payments
2. If webhook events are missing: check `RAZORPAY_WEBHOOK_SECRET` and SNS delivery in Razorpay dashboard
3. If the payment succeeded in Razorpay but credits were not granted: look up the order in `payments` table and manually grant credits via Admin → Users → Manage Credits

### Tracking token cleanup needed

**Symptom:** `tracking_tokens` table growing large; expired rows accumulating.

**Response:** The weekly cleanup job handles this automatically. If you need to trigger a manual cleanup:
```sql
-- Check how many expired tokens exist
SELECT COUNT(*) FROM tracking_tokens WHERE expires_at < NOW();

-- Manual batched delete (safe, run in 1000-row batches)
DELETE FROM tracking_tokens WHERE id IN (
  SELECT id FROM tracking_tokens WHERE expires_at < NOW() LIMIT 1000
);
-- Repeat until 0 rows deleted
```

---

## 12. Disaster Recovery

### PostgreSQL restore

Railway provides automated PostgreSQL backups. To restore:

1. In Railway dashboard → PostgreSQL service → Backups
2. Select the last known-good backup
3. Click Restore — this creates a new PostgreSQL instance
4. Update `DATABASE_URL` to point to the new instance
5. Restart the application
6. Verify with `GET /api/health` → `postgres: "connected"`

**Point-in-time recovery:** Railway PostgreSQL supports PITR. Contact Railway support for a timestamp-based restore.

**Data loss window:** Railway's default backup frequency is daily. Custom backup intervals require a Railway Pro plan or an external pg_dump cron.

### Redis recovery

Redis is used for BullMQ campaign jobs only. It is NOT a durable data store for RepMail — all persistent data is in PostgreSQL.

If Redis is lost:
1. Railway will restart the Redis service automatically
2. Any in-flight campaigns at the time of loss will be picked up by the PENDING watchdog within 5 minutes of server restart
3. No campaign data is lost — campaign state is stored in PostgreSQL

If the Railway Redis service is unrecoverable:
1. Provision a new Redis instance (Railway or external)
2. Update `REDIS_URL`
3. Restart the application
4. All previously running campaigns resume via the PENDING watchdog

### SES credential rotation

**When to rotate:** SES SMTP credentials compromised or as part of routine rotation.

1. In AWS IAM, create new SMTP credentials for the SES IAM user
2. Update `SES_SMTP_USER` and `SES_SMTP_PASS` in Railway environment settings
3. Restart the application
4. Verify: `GET /api/health` → `smtp: "ok"`
5. Delete the old IAM credentials from AWS

Note: SMTP password rotation does not affect emails already sent. In-flight campaigns will retry failed sends automatically.

### AWS IAM credential rotation (S3 / Domain verification)

1. In AWS IAM, create new access key for the domain verification IAM user
2. Update `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
3. Restart the application
4. Test: attempt a custom domain verification in the UI
5. Delete the old IAM key

### Railway deployment rollback

If a deployment causes a critical regression:

```bash
railway rollback
```

Or in the Railway dashboard: Deployments → [last good deployment] → Redeploy.

Railway does not restart the old container — it rebuilds from the previous commit's image. The rollback is usually complete within 2–3 minutes.

### DNS recovery (custom domain)

RepMail's `APP_URL` domain (e.g. `letszero.in`) is served via Railway's domain configuration.

If DNS is disrupted:
1. Verify the CNAME/A record still points to Railway's load balancer IP
2. If Railway IP changed: update the DNS record at the domain registrar
3. DNS propagation typically takes 5–60 minutes

If the domain is expired or registrar access is lost: email delivery continues (SES has its own DNS) but the web app is unreachable. Restore domain registration as a priority.

### Infrastructure outage (Railway region unavailable)

Railway runs in a single region. If the entire region is unavailable:
1. Monitor Railway status page
2. There is no automatic failover — this is a single-region deployment
3. Communicate to users; estimated recovery depends on Railway's timeline
4. For higher availability: consider Railway's multi-region features or a manual failover to a second region with a replicated PostgreSQL instance

---

## Operational Verification Checklist (post-deploy)

Run after every production deployment:

- [ ] `GET /api/health` returns `{ "status": "ok" }`
- [ ] Log in as root admin
- [ ] Create a test user via Admin → Users → Create
- [ ] Send a test campaign to a verified address
- [ ] Verify the email is received
- [ ] Verify campaign status reaches `COMPLETED`
- [ ] Verify open tracking pixel loads (if `TRACK_BASE_URL` is set)
- [ ] Verify click tracking redirects correctly
- [ ] Verify unsubscribe link works from the test email
- [ ] Check Railway logs for any `ERROR` or `FATAL` lines in the first 5 minutes after deploy
