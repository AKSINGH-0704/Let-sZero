● RepMail Engineering Handoff Document

  Part 1 — Architecture + Infrastructure

  ---
  Section 1 — Project Overview

  What RepMail Is

  RepMail is a B2B email campaign platform designed for sales teams. It allows administrators to create user accounts, allocate email sending credits, and
  let those users send bulk outreach campaigns to contact lists uploaded via Excel/CSV. It is not a marketing newsletter tool — it is a direct-outreach
  platform with per-email credit billing, team governance, and deliverability management built into its core.

  Tech Stack

  ┌──────────────────┬─────────────────────────────────────────────────────────────────────────────────────────┐
  │      Layer       │                                       Technology                                        │
  ├──────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ Runtime          │ Node.js (ESM, "type": "module")                                                         │
  ├──────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ Server framework │ Express 4                                                                               │
  ├──────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ ORM              │ Drizzle ORM + drizzle-zod                                                               │
  ├──────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ Database         │ PostgreSQL (via pg driver)                                                              │
  ├──────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ Queue            │ BullMQ 5.x over IORedis                                                                 │
  ├──────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ In-process Redis │ IORedis 5.x                                                                             │
  ├──────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ Email delivery   │ Nodemailer over SES SMTP                                                                │
  ├──────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ AI features      │ OpenAI SDK (GPT-4)                                                                      │
  ├──────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ Frontend         │ React 18 + Vite + Wouter + TanStack Query                                               │
  ├──────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ UI components    │ Radix UI + Tailwind CSS + shadcn/ui                                                     │
  ├──────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ Payments         │ Razorpay (INR only — Stripe fully removed as of commit f7f892e)                        │
  ├──────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ File parsing     │ xlsx (SheetJS)                                                                          │
  ├──────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ Validation       │ Zod                                                                                     │
  ├──────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ Auth             │ Session-cookie (express-session + connect-pg-simple) + Passport.js local + Google OAuth │
  ├──────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ Dev mode         │ In-memory storage shim (no DB required)                                                 │
  ├──────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
  │ Build            │ esbuild (custom script at script/build.js)                                              │
  └──────────────────┴─────────────────────────────────────────────────────────────────────────────────────────┘

  Deployment Platform

  Railway — single service running Node.js. PostgreSQL and Redis are both provisioned as Railway services within the same project. The app listens on PORT
  (default 5000). Railway sends SIGTERM with a 30-second grace window before SIGKILL.

  AWS Integrations

  - SES (Simple Email Service) — email delivery via SMTP transport (nodemailer). Not the AWS SDK. Configuration set my-first-configuration-set sends
  Open/Click/Bounce/Complaint events to SNS.
  - SNS (Simple Notification Service) — receives SES event webhooks. Topic: repmail_events. Webhook endpoint: POST /api/webhooks/ses.
  - S3 — present in dependencies (@aws-sdk/client-s3, @aws-sdk/s3-request-presigner) but not yet actively used for campaign sending. Likely used for
  asset/attachment storage if implemented.

  Queue Architecture

  BullMQ is used for async campaign execution. When Redis is available, campaign sends are enqueued as BullMQ jobs (campaign-execution queue) with jobId =
  campaignId for deduplication. Worker concurrency is 3 (three campaigns processed simultaneously per process). When Redis is unavailable, the app falls
  back to inline synchronous execution within the POST /api/campaigns request handler. The scheduler polls every 30 seconds for PENDING campaigns whose
  scheduledAt has passed.

  AI Subsystem

  OpenAI SDK is used for three features:
  1. Template generation — generates subject + body from a brief
  2. AI preview — generates personalized previews for up to 3 sample contacts
  3. Spam analysis — scores a template for deliverability risks

  All AI calls are logged to ai_usage_logs with token counts, cost estimates, latency, and a SHA-256 requestHash for dedup/abuse detection. Daily per-user
  quotas are enforced via aiGenerationsToday on the users table (reset daily). Cache hits are tracked separately.

  Governance Hierarchy

  ROOT_ADMIN
    └── SUB_ADMIN (child of ROOT_ADMIN)
          └── USER (child of SUB_ADMIN or ROOT_ADMIN)

  - ROOT_ADMIN: Platform owner. Can see all users, manage credits, view all audit logs, trigger emergency recovery, grant/revoke secondary root access.
  Inactivity governance does not apply (no credit reclaim). Separate 45-day alert threshold.
  - SUB_ADMIN: Team manager. Can create/manage child USER accounts, allocate credits from own pool, view team stats. Subject to inactivity governance.
  - USER: Sends campaigns, uses AI, manages contacts/templates. Full inactivity governance applies (30/60/90 day stages).
  - Secondary Root: A flag (isSecondaryRoot = true) that can be set on any user by ROOT_ADMIN. Grants ROOT_ADMIN-level read + user-management write access.
  Cannot grant secondary root to others.

  Current Production Readiness State

  The backend is production-hardened for the following subsystems: auth, sessions, campaign execution, BullMQ queuing, SNS webhook processing
  (bounce/complaint/open/click), suppression system, credit system, rate limiting, inactivity governance, emergency recovery, and data cleanup jobs.

  Now implemented since original handoff: queue observability API (`GET /api/admin/queue/status`), SES delivery health dashboard (`GET /api/admin/delivery-health` with env-derived thresholds), admin campaign cancel (`POST /api/admin/campaigns/:id/cancel`), worker heartbeat (`repmail:worker:heartbeat`, 30s interval), sixth cleanup job (`pruneAiUsageLogs`), platform send pause/resume endpoints, per-campaign audit log endpoint. Inline executor (`routes.js executeCampaign`) now has full parity with the worker path including `sendPaused` pre-check and `getUserSenderHealth` auto-pause (commit `826aa25`).

  Still not production-ready: no time-series AI cost analytics, no per-user daily AI cost breakdown, no dead-letter queue management API, no horizontal scaling (single process).

  ---
  Section 2 — Infrastructure Overview

  Railway Deployment Structure

  - Single Railway project with three services:
    a. Web — Node.js app (serves API + React SPA in production)
    b. Postgres — PostgreSQL database
    c. Redis — Redis instance used by BullMQ and the rate limiter
  - Environment variables are set in Railway's variable panel and injected at runtime.
  - The app runs npm start in production → cross-env NODE_ENV=production node dist/index.cjs.
  - In development: npm run dev → tsx server/index.js (transpiles ESM on-the-fly).

  PostgreSQL Usage

  - Connection via DATABASE_URL environment variable.
  - ORM: Drizzle ORM with pg driver.
  - Schema is in shared/schema.js — Drizzle table definitions used by both ORM and Zod validators (via drizzle-zod).
  - Migrations are applied via drizzle-kit push (npm run db:push) — NOT via migration files. This means schema changes must be applied manually to
  production or via the drizzle-kit push command pointed at the Railway Postgres URL.
  - Session store: connect-pg-simple — sessions persisted in a session table (Express session, separate from the sessions table used by the auth system's
  own token-based sessions).
  - Dev mode: when DATABASE_URL is absent or NODE_ENV !== "production", the in-memory storage shim (server/memoryStorage.js) is used instead of the real DB.

  Redis Usage

  Two separate IORedis connections are created:
  1. BullMQ connection (server/queue.js) — maxRetriesPerRequest: null (required by BullMQ), enableReadyCheck: false, lazyConnect: true.
  2. Rate limiter connection (server/rateLimiter.js) — maxRetriesPerRequest: 1 (fail fast for fallback), enableReadyCheck: false, lazyConnect: true.

  Both are singletons. Both are null/disabled when REDIS_URL is not set.

  BullMQ Usage

  - Queue name: campaign-execution
  - Default job options: attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: { count: 100 }, removeOnFail: { count: 50 }
  - Job ID = campaignId (deduplication — adding the same campaign twice is a no-op)
  - Worker concurrency: 3, lockDuration: 60_000ms, stalledInterval: 30_000ms, maxStalledCount: 3
  - Worker is started in server/index.js after registerRoutes() and startup recovery complete.
  - Worker is null when Redis not configured.

  AWS SES Setup

  - Transport: Nodemailer SMTP (NOT AWS SDK v3 SESClient)
  - SMTP credentials: SES_SMTP_HOST, SES_SMTP_PORT, SES_SMTP_USER, SES_SMTP_PASS
  - From address: SES_FROM_EMAIL, SES_FROM_NAME
  - Configuration set: my-first-configuration-set — sent via X-SES-CONFIGURATION-SET SMTP header
  - Message tags: X-SES-MESSAGE-TAGS: campaign-email-id=<uuid> — injected per email when SES_CONFIGURATION_SET env var is set and campaignEmailId is
  provided
  - Current SES sandbox state: LIVE (production sending confirmed by user). Verified identity is configured. Sending rate limit currently assumed at
  14/second (SES_RATE_PER_SECOND default).

  AWS SNS Setup

  - Topic ARN: stored in SNS_TOPIC_ARN env var
  - Topic name: repmail_events
  - Webhook URL: POST /api/webhooks/ses
  - Event types subscribed: Bounce, Complaint, Open, Click (confirmed live)
  - Signature verification: RSA-SHA1 via server/sns.js, cert cached 24h, cert hostname validated against sns.*.amazonaws.com

  SES Configuration Set

  - Name: my-first-configuration-set
  - Env var: SES_CONFIGURATION_SET=my-first-configuration-set
  - All campaign emails receive the configuration set header and a campaign-email-id tag
  - SNS events from the configuration set use eventType field (NOT notificationType used by legacy SES notifications) — this distinction is critical for the
   SNS handler

  Redis Token Bucket Architecture

  - Implemented in server/rateLimiter.js
  - Two Lua scripts (atomic): ACQUIRE_SCRIPT and RELEASE_SCRIPT
  - Redis keys:
    - repmail:rate:tokens — shared token bucket (all workers, all campaigns)
    - repmail:rate:lastRefill — timestamp of last 1-second refill
    - repmail:rate:campaign:{id}:{epochSecond} — per-campaign fairness window counter
  - SES_RATE_PER_SECOND (default 14) = max tokens per second
  - Per-campaign cap = floor(SES_RATE_PER_SECOND × 0.6), min 1 — prevents one large campaign from monopolizing all capacity
  - acquire() polls every 50–80ms with jitter, times out after 30s (proceeds rather than stalling)
  - release() returns a token after SES throttle (send was not consumed)
  - Degrades gracefully to SES_SEND_RATE_MS per-worker sleep when Redis unavailable

  Cleanup Scheduler Architecture

  Five cleanup jobs registered in server/index.js after startup. Each uses a per-closure let running = false boolean to prevent overlapping executions under
   slow DB conditions. All are process-local (no distributed lock needed for single-process Railway deployments).

  ┌─────────────────────────┬──────────┬──────────────────┬──────────────────────────────────────────────────────┐
  │           Job           │ Schedule │  Startup offset  │                    Storage method                    │
  ├─────────────────────────┼──────────┼──────────────────┼──────────────────────────────────────────────────────┤
  │ SNS event pruning       │ Daily    │ Boot (immediate) │ deleteOldSnsEvents() — 7-day retention               │
  ├─────────────────────────┼──────────┼──────────────────┼──────────────────────────────────────────────────────┤
  │ Expired sessions        │ Daily    │ 5 min            │ deleteExpiredSessions()                              │
  ├─────────────────────────┼──────────┼──────────────────┼──────────────────────────────────────────────────────┤
  │ Audit log pruning       │ Daily    │ 8 min            │ pruneAuditLogs(retentionDays) — default 180d         │
  ├─────────────────────────┼──────────┼──────────────────┼──────────────────────────────────────────────────────┤
  │ Campaign email records  │ Weekly   │ 12 min           │ deleteOldCampaignEmails(retentionDays) — default 90d │
  ├─────────────────────────┼──────────┼──────────────────┼──────────────────────────────────────────────────────┤
  │ Inactivity token expiry │ Weekly   │ 17 min           │ expireInactivityTokens()                             │
  └─────────────────────────┴──────────┴──────────────────┴──────────────────────────────────────────────────────┘

  Additionally, the inactivity governance job runs daily with a 10-minute boot offset (no overlap guard — it processes users sequentially with its own
  per-user try/catch).

  Deployment Assumptions

  - Single Railway process (not horizontally scaled). The per-closure running boolean guards are process-local and sufficient for this topology.
  - If horizontal scaling is ever introduced, cleanup jobs must be moved to a distributed lock pattern (e.g., Redis SET NX) and the rate limiter already
  handles this correctly via Redis.
  - REPMAIL_PUBLIC=true must be set to allow full API access in production. When false in production, only /, /early-access, /contact, /api/waitlist,
  /api/contact are allowed.

  ---
  End of Part 1. Continuing with Part 2.

  ---
  RepMail Engineering Handoff Document

  Part 2 — Schema + Storage + Queue System

  ---
  Section 4 — Complete Database Schema

  All tables are defined in shared/schema.js using Drizzle ORM's pgTable.

  Table: users

  ┌──────────────────────────────────┬───────────┬──────────┬───────────────────┬──────────────────────────────────────────────────────────────────┐
  │              Column              │   Type    │ Nullable │      Default      │                              Notes                               │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ id                               │ uuid      │ NO       │ gen_random_uuid() │ PK                                                               │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ username                         │ text      │ NO       │ —                 │ Unique                                                           │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ email                            │ text      │ NO       │ —                 │ Unique                                                           │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ password_hash                    │ text      │ NO       │ —                 │ bcrypt, 12 rounds                                                │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ role                             │ text      │ NO       │ 'USER'            │ ROOT_ADMIN / SUB_ADMIN / USER                                    │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ parent_id                        │ uuid      │ YES      │ NULL              │ FK → users.id                                                    │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ credits_received                 │ integer   │ NO       │ 0                 │ Credits allocated by parent                                      │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ credits_allocated                │ integer   │ NO       │ 0                 │ Credits allocated to children                                    │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ credits_used                     │ integer   │ NO       │ 0                 │ Campaign sends consumed                                          │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ trial_credits                    │ integer   │ NO       │ 5                 │ One-time trial allowance                                         │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ trial_credits_used               │ integer   │ NO       │ 0                 │ Trial credits consumed                                           │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ is_trial_user                    │ boolean   │ NO       │ true              │ Cleared on first credit purchase                                 │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ must_reset_password              │ boolean   │ NO       │ true              │ Forces password change on first login                            │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ is_active                        │ boolean   │ NO       │ true              │ Deactivation gate                                                │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ created_at                       │ timestamp │ NO       │ now()             │                                                                  │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ updated_at                       │ timestamp │ NO       │ now()             │                                                                  │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ last_login_at                    │ timestamp │ YES      │ NULL              │                                                                  │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ plan                             │ text      │ NO       │ 'free'            │ Controls feature limits                                          │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ ai_generations_today             │ integer   │ NO       │ 0                 │ Reset daily                                                      │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ ai_generations_reset_at          │ timestamp │ YES      │ NULL              │ When daily counter was last reset                                │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ last_activity_at                 │ timestamp │ YES      │ NULL              │ Updated on campaign COMPLETED only. Never updated for ROOT_ADMIN │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ inactivity_warning_sent_at       │ timestamp │ YES      │ NULL              │ Set at Stage 1 warning                                           │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ inactivity_keep_token            │ text      │ YES      │ NULL              │ SHA-256 hash of raw keep token                                   │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ inactivity_keep_token_expires_at │ timestamp │ YES      │ NULL              │ 60 days after warning sent                                       │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ is_dormant                       │ boolean   │ NO       │ false             │ Set at Stage 2. Blocks campaigns + AI                            │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ is_secondary_root                │ boolean   │ NO       │ false             │ Elevated access, granted by ROOT_ADMIN                           │
  ├──────────────────────────────────┼───────────┼──────────┼───────────────────┼──────────────────────────────────────────────────────────────────┤
  │ last_emergency_recovery_at       │ timestamp │ YES      │ NULL              │ 30-day cooldown for emergency recovery                           │
  └──────────────────────────────────┴───────────┴──────────┴───────────────────┴──────────────────────────────────────────────────────────────────┘

  Indexes:
  - users_active_activity_idx on (is_active, last_activity_at) — inactivity job query
  - users_keep_token_idx (unique) on inactivity_keep_token — keep-token lookup
  - users_parent_id_idx on parent_id — child user queries

  ---
  Table: sessions

  ┌────────────┬───────────┬──────────┬─────────┬────────────────────────────────┐
  │   Column   │   Type    │ Nullable │ Default │             Notes              │
  ├────────────┼───────────┼──────────┼─────────┼────────────────────────────────┤
  │ id         │ uuid      │ NO       │ random  │ PK                             │
  ├────────────┼───────────┼──────────┼─────────┼────────────────────────────────┤
  │ user_id    │ uuid      │ NO       │ —       │ FK → users.id (CASCADE DELETE) │
  ├────────────┼───────────┼──────────┼─────────┼────────────────────────────────┤
  │ token      │ text      │ NO       │ —       │ Unique, 32-byte hex            │
  ├────────────┼───────────┼──────────┼─────────┼────────────────────────────────┤
  │ expires_at │ timestamp │ NO       │ —       │ Session TTL                    │
  ├────────────┼───────────┼──────────┼─────────┼────────────────────────────────┤
  │ created_at │ timestamp │ NO       │ now()   │                                │
  └────────────┴───────────┴──────────┴─────────┴────────────────────────────────┘

  Indexes:
  - sessions_expires_at_idx on expires_at — daily cleanup query performance

  ---
  Table: campaigns

  ┌───────────────────┬───────────┬──────────┬─────────┬───────────────────────────────────────────────────────┐
  │      Column       │   Type    │ Nullable │ Default │                         Notes                         │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ id                │ uuid      │ NO       │ random  │ PK                                                    │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ user_id           │ uuid      │ NO       │ —       │ FK → users.id (CASCADE DELETE)                        │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ template_id       │ uuid      │ YES      │ NULL    │ FK → templates.id                                     │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ name              │ text      │ NO       │ —       │                                                       │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ status            │ text      │ NO       │ 'DRAFT' │ DRAFT/PENDING/RUNNING/PAUSED/COMPLETED/FAILED         │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ total_emails      │ integer   │ NO       │ 0       │ Set at creation                                       │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ sent_emails       │ integer   │ NO       │ 0       │ Incremented per successful send                       │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ failed_emails     │ integer   │ NO       │ 0       │ Incremented per permanent failure                     │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ skipped_emails    │ integer   │ NO       │ 0       │ Suppressed contacts                                   │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ bounced_emails    │ integer   │ NO       │ 0       │ Incremented by SNS bounce handler                     │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ complained_emails │ integer   │ NO       │ 0       │ Incremented by SNS complaint handler                  │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ opened_emails     │ integer   │ NO       │ 0       │ NEW — first open per email (SNS Open events)          │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ clicked_emails    │ integer   │ NO       │ 0       │ NEW — first click per email (SNS Click events)        │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ credits_used      │ integer   │ NO       │ 0       │ Set on COMPLETED                                      │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ contact_ids       │ jsonb     │ NO       │ []      │ Array of contact UUIDs                                │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ template_snapshot │ jsonb     │ YES      │ NULL    │ Frozen template at send time                          │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ scheduled_at      │ timestamp │ YES      │ NULL    │ When to enqueue (null = immediate)                    │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ started_at        │ timestamp │ YES      │ NULL    │ When execution began                                  │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ completed_at      │ timestamp │ YES      │ NULL    │ Used by startup recovery to detect finished campaigns │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ created_at        │ timestamp │ NO       │ now()   │                                                       │
  ├───────────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────────────────────┤
  │ updated_at        │ timestamp │ NO       │ now()   │                                                       │
  └───────────────────┴───────────┴──────────┴─────────┴───────────────────────────────────────────────────────┘

  Indexes:
  - campaigns_user_id_idx on user_id
  - campaigns_status_scheduled_idx on (status, scheduled_at) — scheduler query

  Critical design note: completed_at being non-null is the authoritative signal that a campaign finished successfully, even if the status column shows
  RUNNING due to a crash. The startup recovery uses this field as rule 1.

  ---
  Table: campaign_emails

  ┌─────────────────┬───────────┬──────────┬───────────┬──────────────────────────────────────────────────────┐
  │     Column      │   Type    │ Nullable │  Default  │                        Notes                         │
  ├─────────────────┼───────────┼──────────┼───────────┼──────────────────────────────────────────────────────┤
  │ id              │ uuid      │ NO       │ random    │ PK                                                   │
  ├─────────────────┼───────────┼──────────┼───────────┼──────────────────────────────────────────────────────┤
  │ campaign_id     │ uuid      │ NO       │ —         │ FK → campaigns.id (CASCADE DELETE)                   │
  ├─────────────────┼───────────┼──────────┼───────────┼──────────────────────────────────────────────────────┤
  │ user_id         │ uuid      │ NO       │ —         │ FK → users.id (CASCADE DELETE)                       │
  ├─────────────────┼───────────┼──────────┼───────────┼──────────────────────────────────────────────────────┤
  │ contact_id      │ uuid      │ YES      │ NULL      │ FK → contacts.id (nullable — contact may be deleted) │
  ├─────────────────┼───────────┼──────────┼───────────┼──────────────────────────────────────────────────────┤
  │ recipient_email │ text      │ NO       │ —         │ Durable copy of email at send time                   │
  ├─────────────────┼───────────┼──────────┼───────────┼──────────────────────────────────────────────────────┤
  │ ses_message_id  │ text      │ YES      │ NULL      │ SES Message-ID returned after send                   │
  ├─────────────────┼───────────┼──────────┼───────────┼──────────────────────────────────────────────────────┤
  │ status          │ text      │ NO       │ 'PENDING' │ PENDING/SENT/FAILED/BOUNCED/COMPLAINED/SUPPRESSED    │
  ├─────────────────┼───────────┼──────────┼───────────┼──────────────────────────────────────────────────────┤
  │ failure_reason  │ text      │ YES      │ NULL      │ Last error message                                   │
  ├─────────────────┼───────────┼──────────┼───────────┼──────────────────────────────────────────────────────┤
  │ sent_at         │ timestamp │ YES      │ NULL      │ When sendMail() returned successfully                │
  ├─────────────────┼───────────┼──────────┼───────────┼──────────────────────────────────────────────────────┤
  │ opened_at       │ timestamp │ YES      │ NULL      │ NEW — timestamp of first Open SNS event              │
  ├─────────────────┼───────────┼──────────┼───────────┼──────────────────────────────────────────────────────┤
  │ clicked_at      │ timestamp │ YES      │ NULL      │ NEW — timestamp of first Click SNS event             │
  ├─────────────────┼───────────┼──────────┼───────────┼──────────────────────────────────────────────────────┤
  │ created_at      │ timestamp │ NO       │ now()     │                                                      │
  └─────────────────┴───────────┴──────────┴───────────┴──────────────────────────────────────────────────────┘

  Indexes:
  - campaign_emails_ses_message_id_idx on ses_message_id — SNS bounce/complaint lookup
  - campaign_emails_user_email_idx on (user_id, recipient_email) — suppression/analytics queries

  Tracking note: opened_at and clicked_at are set atomically (UPDATE WHERE IS NULL returning rows) so only the first event per record sets the value. The
  campaign-level counters opened_emails/clicked_emails are only incremented when wasFirst = true.

  ---
  Table: sns_events

  ┌──────────────┬───────────┬──────────┬─────────┬───────────────────────────────────────┐
  │    Column    │   Type    │ Nullable │ Default │                 Notes                 │
  ├──────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────┤
  │ message_id   │ text      │ NO       │ —       │ PK — SNS MessageId                    │
  ├──────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────┤
  │ event_type   │ text      │ NO       │ —       │ Lowercase event type                  │
  ├──────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────┤
  │ processed_at │ timestamp │ NO       │ now()   │                                       │
  ├──────────────┼───────────┼──────────┼─────────┼───────────────────────────────────────┤
  │ processed    │ boolean   │ NO       │ false   │ Set to true after all writes complete │
  └──────────────┴───────────┴──────────┴─────────┴───────────────────────────────────────┘

  Purpose: SNS delivers at-least-once. This table is the deduplication gate. processed=false means a previous attempt crashed before completing writes —
  next delivery re-processes. processed=true means fully done — skip entirely. Entries older than 7 days are pruned daily.

  ---
  Table: suppressions

  ┌────────────┬───────────┬──────────┬─────────┬──────────────────────────────────┐
  │   Column   │   Type    │ Nullable │ Default │              Notes               │
  ├────────────┼───────────┼──────────┼─────────┼──────────────────────────────────┤
  │ id         │ uuid      │ NO       │ random  │ PK                               │
  ├────────────┼───────────┼──────────┼─────────┼──────────────────────────────────┤
  │ user_id    │ uuid      │ NO       │ —       │ FK → users.id (CASCADE DELETE)   │
  ├────────────┼───────────┼──────────┼─────────┼──────────────────────────────────┤
  │ email      │ text      │ NO       │ —       │ Lowercase normalized             │
  ├────────────┼───────────┼──────────┼─────────┼──────────────────────────────────┤
  │ source     │ text      │ NO       │ —       │ unsubscribe / bounce / complaint │
  ├────────────┼───────────┼──────────┼─────────┼──────────────────────────────────┤
  │ created_at │ timestamp │ NO       │ now()   │                                  │
  └────────────┴───────────┴──────────┴─────────┴──────────────────────────────────┘

  Unique index: suppressions_user_email_unique on (user_id, email) — one suppression per user+email regardless of source.

  Global suppression: isGloballySuppressed(email) queries without userId filter. A bounce from any user's campaign suppresses that address for all users on
  the platform.

  ---
  Table: ai_usage_logs

  ┌────────────────────┬───────────────┬──────────┬─────────┬─────────────────────────────────────────────────┐
  │       Column       │     Type      │ Nullable │ Default │                      Notes                      │
  ├────────────────────┼───────────────┼──────────┼─────────┼─────────────────────────────────────────────────┤
  │ id                 │ uuid          │ NO       │ random  │ PK                                              │
  ├────────────────────┼───────────────┼──────────┼─────────┼─────────────────────────────────────────────────┤
  │ user_id            │ uuid          │ NO       │ —       │ FK → users.id (CASCADE DELETE)                  │
  ├────────────────────┼───────────────┼──────────┼─────────┼─────────────────────────────────────────────────┤
  │ endpoint           │ text          │ NO       │ —       │ generate-template / preview / spam-analysis     │
  ├────────────────────┼───────────────┼──────────┼─────────┼─────────────────────────────────────────────────┤
  │ model              │ text          │ NO       │ —       │ e.g., gpt-4o                                    │
  ├────────────────────┼───────────────┼──────────┼─────────┼─────────────────────────────────────────────────┤
  │ input_tokens       │ integer       │ NO       │ —       │                                                 │
  ├────────────────────┼───────────────┼──────────┼─────────┼─────────────────────────────────────────────────┤
  │ output_tokens      │ integer       │ NO       │ —       │                                                 │
  ├────────────────────┼───────────────┼──────────┼─────────┼─────────────────────────────────────────────────┤
  │ estimated_cost_usd │ numeric(10,6) │ NO       │ —       │                                                 │
  ├────────────────────┼───────────────┼──────────┼─────────┼─────────────────────────────────────────────────┤
  │ cached             │ boolean       │ NO       │ false   │ True = served from in-process cache, not billed │
  ├────────────────────┼───────────────┼──────────┼─────────┼─────────────────────────────────────────────────┤
  │ latency_ms         │ integer       │ YES      │ NULL    │ API call duration (0 for cache hits)            │
  ├────────────────────┼───────────────┼──────────┼─────────┼─────────────────────────────────────────────────┤
  │ request_hash       │ text          │ YES      │ NULL    │ SHA-256 of input — dedup/abuse detection        │
  ├────────────────────┼───────────────┼──────────┼─────────┼─────────────────────────────────────────────────┤
  │ created_at         │ timestamp     │ NO       │ now()   │                                                 │
  └────────────────────┴───────────────┴──────────┴─────────┴─────────────────────────────────────────────────┘

  Composite index: ai_usage_logs_user_created_at_idx on (user_id, created_at) — supports 30-day filtered queries efficiently.

  Retention: Subject to the audit log retention cleanup job (indirectly via pruneAuditLogs if that table is included, but ai_usage_logs has its own
  unbounded growth — no dedicated cleanup job yet).

  ---
  Other Tables (Summary)

  - templates — user email templates. is_default flag. template_snapshot in campaigns is a JSON copy at send time.
  - contacts — per-user contact records. Unique constraint on (user_id, email).
  - credit_transactions — immutable ledger of every credit operation.
  - audit_logs — system-wide audit trail. target_type + target_id identify the affected entity.
  - payments — Razorpay payment records (Stripe fully removed). metadata JSONB stores razorpay_order_id, razorpay_key_id.
  - contact_submissions — public contact form submissions.
  - waitlist — email waitlist for early access.
  - invites — admin-sent invite tokens. SHA-256 of raw token stored.

  ---
  Section 6 — Queue + Worker Architecture

  BullMQ Flow

  POST /api/campaigns
    → create campaign record (DRAFT)
    → validate contacts
    → set status = PENDING
    → addCampaignJob(campaignId, userId)  [queue.js]
      → if Redis available: enqueue BullMQ job, return 201 immediately
      → if Redis absent: call executeCampaign() inline, return 201 when done

  Worker Execution (server/worker.js)

  The BullMQ worker processes campaign-execution jobs. Function: processCampaign(campaignId, userId, job).

  Execution sequence for each campaign:
  1. Fetch campaign record; throw if not found
  2. Skip if already COMPLETED
  3. Determine isRetry — data-driven via hasAnySentEmails(campaignId) (not status column — status can be FAILED after startup recovery even for genuine
  retries)
  4. Guard: check owner is active; if not, mark FAILED + audit log
  5. If NOT retry: check canStartCampaign(userId, totalEmails) (credit pre-check); if insufficient, mark FAILED + audit log
  6. Transition campaign to RUNNING, write startedAt
  7. For each contactId in campaign.contactIds (sequential for loop):
  a. On retry: check existing campaign_emails record status; skip if SENT/SUPPRESSED/BOUNCED/COMPLAINED; skip if FAILED with permanent failureReason
  b. Create PENDING campaign_emails record
  c. Check user suppression (isSuppressed) then global suppression (isGloballySuppressed)
  d. If suppressed: mark SUPPRESSED, increment skippedCount
  e. If not suppressed: acquire rate limiter token (or fall back to SES_SEND_RATE_MS sleep)
  f. Call sendWithRetry(contact, template, userId, campaignId, rateLimiter, campaignEmailRecord.id)
  g. Mark campaign_emails SENT with sesMessageId and sentAt
  h. Call deductCreditAtomic(userId, campaignId, description) — if Insufficient credits, set outOfCredits = true, break
  i. Checkpoint: updateCampaign() with running counts; job.updateProgress() percent
  8. After loop: write final counts + status = COMPLETED + completedAt
  9. Write CAMPAIGN_COMPLETED audit log
  10. Call updateUserActivity(userId) (skipped for ROOT_ADMIN and secondary root)

  Retry Behavior in sendWithRetry

  Signature: sendWithRetry(contact, template, userId, campaignId, rateLimiter, campaignEmailId, maxAttempts = 3)

  - Permanent failures (non-throttle): increment attempts counter (max 3), linear backoff (1s × attempts)
  - Throttle errors (SES SMTP 454/421, "throttl"/"too many" in response string, AWS SDK codes Throttling/TooManyRequestsException): increment
  throttleRetries (max 10), call rateLimiter.release(campaignId), wait 2s + random jitter, continue — does NOT consume a permanent-failure retry slot

  Send-Before-Deduct Rule

  Critical design decision: The campaign_email record is marked SENT before credit deduction. If deductCreditAtomic fails after a successful email delivery,
   the email correctly shows as SENT (not FAILED). The alternative — marking FAILED if deduction fails — would be a lie about the delivery state and could
  cause duplicate sends on retry. Accounting drift (email sent, credit not deducted) is logged but accepted as preferable to incorrect status.

  Stale Campaign Recovery

  At startup (server/index.js), recoverStaleCampaigns() runs before the worker starts:
  1. Fetch all campaigns with status = 'RUNNING'
  2. If completedAt IS NOT NULL: mark COMPLETED (crash happened after completion)
  3. If BullMQ job exists in active/waiting/delayed state: leave RUNNING (worker owns it)
  4. All other cases: mark FAILED (no live job found, UI would be stuck)

  This is safe because the worker's isRetry detection uses hasAnySentEmails(), not the status column — so a campaign marked FAILED by recovery can still be
  resumed correctly when BullMQ re-enqueues it.

  Graceful Shutdown

  SIGTERM triggers worker.close() which waits for the current job iteration to finish. Railway's 30-second grace window is the constraint. Long-running
  single emails (slow SMTP) could exceed this window — accepted risk.

  Inline Fallback Path

  routes.js exports executeCampaign(campaignId, userId) which mirrors the worker's processCampaign logic. Used when Redis is unavailable (no BullMQ). Does
  NOT have the BullMQ job progress reporting. Does NOT have BullMQ-level retries. The rate limiter path is identical.

  ---
  End of Part 2. Continuing with Part 3.

  ---
  RepMail Engineering Handoff Document

  Part 3 — Security Hardening + SNS + Suppression

  ---
  Section 5 — Security Hardening Completed

  SNS Signature Verification (server/sns.js)

  - Implements the full AWS SNS signature verification spec
  - Builds canonical string-to-sign from message fields (different field set for Notification vs SubscriptionConfirmation)
  - Verifies with sha1WithRSAEncryption using Node.js crypto.createVerify
  - Signing cert fetched via HTTPS, cached in-process for 24 hours (prevents hammering AWS on every message)
  - SSRF protection: cert URL hostname is validated against regex /^sns\.[a-z0-9-]+\.amazonaws\.com$/ and protocol must be https: — forged URLs pointing to
  attacker-controlled servers are rejected before fetching

  Verification Order (Critical)

  The SNS handler verifies signature before sending any HTTP response. The original bug was that res.sendStatus(200) fired before verification, making 403
  responses impossible (SNS would see 200 and consider delivery confirmed). The fixed order is:
  1. Parse body
  2. Verify SNS signature → if invalid, return 403
  3. Validate TopicArn → if mismatch, return 403
  4. res.sendStatus(200) — ACK after all security checks pass
  5. All subsequent processing is async fire-and-forget

  TopicArn Validation

  After signature verification, the handler checks envelope.TopicArn === process.env.SNS_TOPIC_ARN. If SNS_TOPIC_ARN is set and the topic doesn't match, the
   request is rejected with 403. If SNS_TOPIC_ARN is not set, a startup warning is logged but validation is skipped (fail-open for operator convenience
  during setup). A warning at boot reads: [STARTUP] SNS_TOPIC_ARN not set — TopicArn validation disabled.

  Replay-Safe SNS Processing (4-Step Idempotency)

  SNS delivers at-least-once. The sns_events table provides deduplication:

  Step 1: Check getSnsEvent(snsMessageId):
  - processed=true → already fully handled → return (no-op)
  - processed=false → previous attempt crashed → fall through to re-process
  - null → first delivery → proceed to Step 2

  Step 2: Claim with createSnsEvent(snsMessageId, eventType):
  - Inserts with onConflictDoNothing(), returns whether row was inserted
  - If insert returns 0 rows → concurrent delivery won the race → return (defer to them)
  - If insert returns 1 row → we own this delivery

  Step 3: Execute all writes (suppression, status updates, counter increments)

  Step 4: updateSnsEventProcessed(snsMessageId) — set processed=true. If this crashes, next delivery re-processes Step 3. Campaign counters may increment
  twice — accepted as off-by-one risk vs. permanently dropped events.

  Event Type Field (Critical for Configuration Set Events)

  Legacy SES notifications use notificationType at the notification root. SES Configuration Set events (Open/Click/Bounce/Complaint via a configuration set)
   use eventType instead. The handler now derives a unified field:

  const { notificationType, eventType: confSetEventType, mail, bounce, complaint } = notification;
  const eventType = notificationType || confSetEventType;
  if (!sesMessageId || !eventType) return;

  Before this fix: if (!sesMessageId || !notificationType) return; silently dropped all Open and Click events.

  Open/Click Lookup Strategy

  For Open and Click events, the handler first attempts a direct UUID lookup using the campaign-email-id message tag injected at send time (faster, no index
   scan on ses_message_id). Falls back to getCampaignEmailBySesMessageId() if the tag is absent (legacy/untagged sends). For Bounce/Complaint, only the
  sesMessageId lookup is used.

  Global Suppression System

  - suppressions table stores per-user suppressions
  - isSuppressed(userId, email) — checks user's own list
  - isGloballySuppressed(email) — queries without userId filter (platform-wide)
  - Both are checked per-contact inside the send loop (not just at campaign creation) — a bounce from a concurrent campaign mid-execution is caught
  - All emails are normalized to lowercase before storage and lookup
  - Three sources: unsubscribe, bounce (permanent only), complaint

  Transient vs Permanent Bounce Handling

  Only bounceType === "Permanent" triggers suppression. Transient bounces (Temporary, soft bounces) are logged and ignored. Permanent bounces suppress at
  the per-user level AND the global level (since addSuppression is user-scoped but isGloballySuppressed queries across all users).

  Role Address Filtering

  In campaign creation (POST /api/campaigns), contacts with role-function email addresses are filtered out before the campaign is saved. Prefixes filtered:

  const ROLE_ADDRESS_PREFIXES = [
    "admin", "support", "noreply", "no-reply", "postmaster",
    "mailer-daemon", "abuse", "webmaster", "info", "help", "contact",
  ];

  The check is email.split("@")[0].toLowerCase() compared against these prefixes. Role addresses are counted in validationErrors but do not block the
  campaign — they are silently removed.

  Unsubscribe Protection

  Each campaign email contains an unsubscribe footer with a signed token URL: /api/unsubscribe?uid=...&email=...&token=.... The token is generated by
  generateUnsubscribeToken(userId, email) in server/unsubscribe.js (HMAC or similar). Clicking the link adds the address to the user's suppression list with
   source=unsubscribe.

  XLSX/CSV Validation Security

  - 10MB file size limit enforced before parsing
  - BOM stripping: buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF ? buffer.slice(3) : buffer
  - Maximum 20 columns allowed
  - Malformed row counting (malformedCount) — rows that can't be parsed don't crash the parser
  - All contact data passes through normalization and email format validation before insertion

  AI Abuse Protections

  - Daily generation quota enforced via aiGenerationsToday on the users table
  - Quota checked atomically in the route handler before any AI call
  - requestHash (SHA-256) stored per log entry for dedup/abuse pattern detection (not yet queried in any admin view)
  - Rate limiter: express-rate-limit on AI endpoints (configured separately from the SES rate limiter)

  Atomic Credit Deductions

  deductCreditAtomic(userId, campaignId, description) uses a DB-level check before deduction — reads current balance and deducts in a single transaction (or
   equivalent). If insufficient credits are detected mid-campaign, the campaign stops after the last successfully sent email rather than attempting more
  sends. The break from the contact loop is deliberate.

  Fail-Open vs Fail-Closed Decisions

  ┌────────────────────────────────┬──────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────┐
  │           Component            │             Behavior on failure              │                              Rationale                              │
  ├────────────────────────────────┼──────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ Redis rate limiter unavailable │ Fail-open: fall back to SES_SEND_RATE_MS     │ Campaigns must not stall indefinitely                               │
  │                                │ sleep                                        │                                                                     │
  ├────────────────────────────────┼──────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ Rate limiter 30s timeout       │ Fail-open: proceed after warning log         │ Same                                                                │
  ├────────────────────────────────┼──────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ release() after throttle       │ Fail-silently: errors swallowed              │ Token return is best-effort; throttle handling must not be          │
  │                                │                                              │ interrupted                                                         │
  ├────────────────────────────────┼──────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ SNS signature verification     │ Fail-closed: 403                             │ Security critical                                                   │
  ├────────────────────────────────┼──────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ TopicArn not set               │ Fail-open: skip validation with warning      │ Dev/setup convenience                                               │
  ├────────────────────────────────┼──────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ updateSnsEventProcessed        │ Fail-open: logged, not thrown                │ SNS already ACKed; re-processing is safe                            │
  │ failure                        │                                              │                                                                     │
  └────────────────────────────────┴──────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────┘

  ---
  Section 7 — SNS Event Processing Architecture

  Complete Webhook Flow

  POST /api/webhooks/ses
    1. Parse body (handles text/plain and application/json content types)
    2. verifySnsMessage(envelope) → 403 on invalid signature
    3. Check TopicArn → 403 if mismatch with SNS_TOPIC_ARN
    4. res.sendStatus(200)  ← ACK here; all remaining processing is async
    5. If Type === "SubscriptionConfirmation": fetch SubscribeURL, return
    6. If Type !== "Notification": return
    7. Dedup check: getSnsEvent(snsMessageId)
       - processed=true → return
       - processed=false → continue (crash recovery path)
       - null → continue (first delivery)
    8. Parse notification.Message JSON
    9. Derive eventType = notificationType || confSetEventType
    10. If !sesMessageId || !eventType → return
    11. Claim: createSnsEvent(snsMessageId, eventType) → return if race lost
    12. For Open/Click: try tag UUID lookup, fallback to sesMessageId lookup
        For Bounce/Complaint: sesMessageId lookup only
    13. If no campaignEmail record found → warn + return
    14. Dispatch:
        - Bounce → suppress + update campaign_emails status + incrementCampaignBounced
        - Complaint → suppress + update campaign_emails status + incrementCampaignComplained
        - Open → updateCampaignEmailOpened (atomic) → if wasFirst: incrementCampaignOpened
        - Click → updateCampaignEmailClicked (atomic) → if wasFirst: incrementCampaignClicked
    15. updateSnsEventProcessed(snsMessageId) → catch + warn (non-fatal)

  Open/Click Atomicity

  updateCampaignEmailOpened(campaignEmailId) executes:
  UPDATE campaign_emails
  SET opened_at = NOW()
  WHERE id = $1 AND opened_at IS NULL
  RETURNING id
  If rows.length > 0, this was the first open. The campaign counter is only incremented on first-open, preventing inflation from multiple SES open tracking
  pixels (e.g., email client pre-fetching or multiple opens by the same recipient).

  Why Counters Can Be Off-By-One

  If the process crashes between Step 14 (writes) and Step 15 (updateSnsEventProcessed), the next SNS delivery re-processes Step 14. For Open/Click, the IS
  NULL guard prevents double-counting the campaign_email row, but incrementCampaignOpened is a blind +1 — it will fire again. The accepted risk is a ±1
  error on campaign-level open/click counts in crash scenarios. The alternative (marking processed before the increment) would risk losing events on crash.

  Replay Semantics

  SNS replays a message if the subscriber returns non-2xx. Since the ACK is sent at step 4 (before any writes), replays only happen if the application
  itself re-delivers (e.g., processed=false crash recovery) — SNS itself will not retry. The 4-step idempotency system handles all replay scenarios within
  the application.

  ---
  End of Part 3. Continuing with Part 4.

  ---
  RepMail Engineering Handoff Document

  Part 4 — Validation + Rate Limiting + Cleanup Jobs

  ---
  Section 8 — Campaign Validation System

  Validation Pipeline Order (Critical)

  All validation runs before any DB write. The pipeline order in POST /api/campaigns is strictly:

  1. Plan limit check (max active campaigns)
  2. Normalize emails (normalizeContactEmail — lowercase + trim)
  3. Deduplicate (case-insensitive, last-wins for row-level dedup within the upload)
  4. Format validation (isValidEmailFormat — regex)
  5. Role address filtering (isRoleAddress — prefix check)
  6. Max contacts check (CAMPAIGN_MAX_CONTACTS = 10,000)
  7. Subject byte length check (CAMPAIGN_MAX_SUBJECT_LENGTH bytes, not characters)
  8. Body byte length check (CAMPAIGN_MAX_BODY_BYTES)
  9. Placeholder cross-reference (placeholders in subject/body must exist in contact data)
  10. Suppression count LAST — getPreCampaignSuppressionCount(emails) — runs after all filtering so the count reflects exactly what would be suppressed
  during execution

  Why suppression runs last: if it ran before dedup/format/role filtering, it would count suppressions on contacts that would never be sent to anyway,
  giving a misleading pre-send warning. The count is advisory only (shown to user, does not block the campaign).

  Contact Normalization

  function normalizeContactEmail(email) {
    return email.toLowerCase().trim();
  }

  Email Format Validation

  function isValidEmailFormat(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  Role Address Detection

  Checks if the local part (before @) matches any of the defined role address prefixes. Case-insensitive prefix match, not substring — "info@" matches,
  "myinfo@" does not.

  Placeholder Validation

  extractPlaceholders(text) finds all {{placeholder}} patterns in subject and body. If a placeholder exists in the template but none of the uploaded
  contacts have a corresponding non-empty field, it's flagged in validationErrors. This prevents campaigns where every email would have a literal {{name}}
  string in the subject line.

  Limits (Constants in routes.js)

  const CAMPAIGN_MAX_CONTACTS = 10_000;
  const CAMPAIGN_MAX_SUBJECT_LENGTH = 998;  // RFC 2822 line length limit
  const CAMPAIGN_MAX_BODY_BYTES = 100_000;  // ~100KB HTML body

  Response Shape (POST /api/campaigns)

  {
    "campaign": { ...campaignRecord },
    "contactStats": {
      "total": 500,
      "valid": 480,
      "duplicatesRemoved": 10,
      "invalidFormat": 5,
      "roleAddresses": 3,
      "suppressed": 2
    },
    "validationErrors": [
      "Placeholder {{company}} found in template but missing in all contacts"
    ]
  }

  Excel Parser Protections (POST /api/parse-excel)

  - 10MB file size limit checked before parsing
  - BOM stripped from buffer before passing to SheetJS
  - Max 20 columns enforced (rejects files with excessive column count)
  - malformedCount returned — rows that fail parsing are counted, not thrown
  - Returns: { contacts: [...], headers: [...], totalRows, malformedCount }

  ---
  Section 9 — Cleanup Jobs

  Why Staggered Offsets Exist

  All cleanup jobs use setTimeout for startup delay to prevent a thundering herd of DB queries at boot time. Without offsets, all five jobs would fire
  simultaneously ~1 second after startup, which under a cold DB connection could cause query queuing and slow the application's actual warm-up. The offsets
  also spread load across the first 17 minutes of uptime.

  Job 1: SNS Event Pruning

  - Purpose: Prevent unbounded growth of sns_events dedup table
  - Schedule: Every 24 hours
  - Startup offset: Immediate (fires on first setInterval tick at boot)
  - Overlap protection: { let running = false; setInterval(...)  } block-scoped closure
  - Retention: 7 days (hardcoded — SNS redelivery window is max 23 days but practically much shorter)
  - Storage method: storage.deleteOldSnsEvents() — DELETE WHERE processed_at < NOW() - INTERVAL '7 days'
  - Log: [CLEANUP] Old SNS events pruned
  - Note: Uses block-scope closure ({ let running = false; setInterval() }) rather than the setTimeout+function pattern used by other jobs — functionally
  identical but syntactically different

  Job 2: Expired Session Cleanup

  - Purpose: Remove expired auth tokens to prevent session table growth
  - Schedule: Every 24 hours
  - Startup offset: 5 minutes
  - Overlap protection: let running = false per-closure, finally { running = false }
  - Retention: Sessions expire at their expires_at value (set during login)
  - Storage method: storage.deleteExpiredSessions() — DELETE WHERE expires_at < NOW(); uses sessions_expires_at_idx index
  - Log: [CLEANUP] Expired sessions deleted: {count}

  Job 3: Audit Log Pruning

  - Purpose: Prevent unbounded growth of audit_logs
  - Schedule: Every 24 hours
  - Startup offset: 8 minutes
  - Overlap protection: let running = false per-closure
  - Retention: AUDIT_LOG_RETENTION_DAYS env var (default 180 days)
  - Storage method: storage.pruneAuditLogs(retentionDays) — DELETE WHERE created_at < cutoff
  - Log: [CLEANUP] Audit logs pruned (older than {n}d): {count}
  - Note: ai_usage_logs does NOT have a dedicated cleanup job. This is a known gap — the table will grow unboundedly.

  Job 4: Campaign Email Record Cleanup

  - Purpose: Trim per-email detail records for old completed campaigns (these can be very large for high-volume senders)
  - Schedule: Every 7 days (weekly)
  - Startup offset: 12 minutes
  - Overlap protection: let running = false per-closure
  - Retention: CAMPAIGN_EMAIL_RETENTION_DAYS env var (default 90 days)
  - Storage method: storage.deleteOldCampaignEmails(retentionDays) — uses subquery:
  DELETE FROM campaign_emails
  WHERE campaign_id IN (
    SELECT id FROM campaigns
    WHERE status IN ('COMPLETED', 'FAILED')
    AND created_at < $cutoff
  )
  - Safety: RUNNING and PENDING campaigns are never touched
  - Log: [CLEANUP] Campaign email records deleted (campaign age >{n}d): {count}

  Job 5: Inactivity Token Expiry

  - Purpose: Null out expired inactivity_keep_token fields so old tokens cannot be replayed
  - Schedule: Every 7 days (weekly)
  - Startup offset: 17 minutes
  - Overlap protection: let running = false per-closure
  - Storage method: storage.expireInactivityTokens() — UPDATE users SET inactivity_keep_token = NULL, inactivity_keep_token_expires_at = NULL WHERE token IS
   NOT NULL AND expires_at < NOW()
  - Log: [CLEANUP] Expired inactivity tokens nulled: {count}

  Overlap Prevention Mechanism

  All five jobs use the same pattern:
  setTimeout(() => {
    let running = false;
    async function runJob() {
      if (running) { console.warn("[CLEANUP] Still in progress — skipping"); return; }
      running = true;
      try {
        // ... DB work ...
      } catch (err) {
        console.error("[CLEANUP] Error:", err.message);
      } finally {
        running = false; // always clears, even on error
      }
    }
    runJob();
    setInterval(runJob, intervalMs);
  }, offsetMs);

  The SNS cleanup uses a block-scope closure with the same boolean pattern but without the named function (equivalent behavior). The finally block is
  critical — without it, an unhandled rejection would leave running = true permanently and the job would never fire again for the lifetime of the process.

  Limitation: Process-Local Only

  These guards are process-local. If Railway ever runs multiple instances (horizontal scaling), two instances could execute cleanup jobs simultaneously. The
   DELETE operations are idempotent (deleting already-deleted rows is a no-op) so correctness is maintained, but duplicate work and doubled DB load would
  occur. Mitigated by: Railway currently runs a single instance.

  ---
  Section 10 — AI Usage + Cost Governance

  Daily Quota Enforcement

  Per-user daily limits defined in shared/schema.js:
  export const AI_DAILY_LIMITS = {
    free: 5,
    trial: 5,
    starter: 20,
    growth: 50,
    scale: 150,
    enterprise: Infinity,
  };

  aiGenerationsToday on the users table is incremented atomically per AI call. aiGenerationsResetAt tracks when the counter was last reset. The route
  handler checks: if aiGenerationsResetAt is more than 24 hours ago, reset aiGenerationsToday to 0 and proceed. Dormant users (isDormant=true) are blocked
  from AI features entirely.

  Quota Refund on Failure (added commit cf92b4f)

  Quota is incremented before the OpenAI call (atomic transaction). If the call fails (network error, timeout, OpenAI 5xx), the quota is refunded:
  storage.refundAiQuota(userId) — GREATEST(ai_generations_today - 1, 0). Called fire-and-forget in the catch blocks of all three AI routes (generate-template,
  preview, spam-analysis). Fallback routes (placeholder replacement, keyword scoring) still execute as before; they do not consume quota.

  Cache-First Quota Protection for Spam Analysis (added post-29aaeeb)

  The POST /api/ai/spam-analysis route performs a synchronous in-memory cache lookup (peekSpamCache) before calling checkAndIncrementAiQuota. This prevents
  quota consumption for repeated analyses of the same template content (e.g., back-navigation in the campaign wizard). Cache hits return immediately with
  fromCache: true in the response body; no audit log is written and no quota is charged. The cache key is SHA-256("spam\x00{subject}\x00{body}\x00gpt-4o-mini")
  — the same key used internally by analyzeSpam. Cache TTL is 1 hour (process-local Map). On the client, the SpamAnalyzer component fires the mutation
  automatically on mount; the fromCache flag prevents a redundant /api/auth/me invalidation when the cache path is taken.

  Template Generation Output Guard (added commit cf92b4f)

  generateTemplate() applies stripBracketPlaceholders() to the returned body before sending it to the client. This strips GPT sign-off artifacts like
  [Your Name], [Title], [Company], [Phone] that GPT outputs when no sender context is provided. The system prompt also explicitly instructs GPT not to emit
  bracket placeholders. Both defenses are active.

  getDashboardStats AI Analytics (ROOT_ADMIN only)

  All queries are scoped to WHERE created_at > NOW() - INTERVAL '30 days' via Drizzle's gte(aiUsageLogs.createdAt, thirtyDaysAgo). This prevents full-table
  scans as the table grows.

  Returns:
  - totalAiCostUsd — sum of estimated_cost_usd last 30 days
  - aiCostLast30Days — same value (kept for frontend compat)
  - totalAiCalls — count
  - cacheHitRate — percentage
  - aiCostByEndpoint — per-endpoint cost/calls/cache/latency breakdown
  - topAiSpenders — top 10 users by cost, last 30 days

  Known AI Observability Gaps

  - No time-series daily cost trend (can't spot yesterday's spike vs. the 30-day average)
  - No per-user daily cost view beyond top-10 aggregate
  - requestHash is stored but never queried (abuse patterns not surfaced)
  - ai_usage_logs has no cleanup job — will grow indefinitely
  - No alert when a user's daily cost exceeds a threshold

  ---
  End of Part 4. Continuing with Part 5.

  ---
  RepMail Engineering Handoff Document

  Part 5 — Observability Gaps + Roadmap + Deployment Runbook

  ---
  Section 11 — Operational Visibility Audit (Complete Gap List)

  Gap 1: No Health Endpoint

  Why it matters: Railway, uptime monitors, and load balancers have nothing to probe. A process that is running but cannot reach Redis, Postgres, or SMTP
  appears "healthy" at the infrastructure layer.

  Implemented. Current GET /api/health response shape (as of commit cf92b4f):
  {
    "status": "ok",
    "postgres": "connected",
    "redis": "connected",
    "worker": "running",
    "smtp": "ok",
    "sendPaused": false,
    "ai": "ok",
    "timestamp": "2026-06-06T00:00:00.000Z"
  }
  ai field values: "ok" | "degraded" | "error" | "not_configured" | "unknown"
  - "ok": last AI call succeeded
  - "degraded": last call failed with a non-auth error (rate limit, timeout, etc.)
  - "error": last call failed with an auth/key error (401, invalid_api_key)
  - "not_configured": OPENAI_API_KEY env var not set
  - "unknown": no AI call has been made since server started
  The ai field is populated from a module-level in-memory cache in server/ai.js (aiHealthCache).
  It piggybacks on real AI calls — no active probe. Cache persists in-process; clears on restart.
  Files: server/routes.js, server/ai.js (getAiHealthStatus, markAiHealthOk, markAiHealthError).

  ---
  Gap 2: No Queue Depth Visibility

  Why it matters: An admin cannot tell if campaigns are backing up in the queue, how many are waiting vs. active vs. delayed vs. failed at the BullMQ level,
   or whether the worker is processing anything.

  Proposed implementation: GET /api/admin/queue/status (ROOT_ADMIN only):
  const queue = getCampaignQueue();
  const counts = await queue.getJobCounts('active', 'waiting', 'delayed', 'failed', 'completed');
  const failedJobs = await queue.getFailed(0, 10); // last 10 failed jobs
  Files: server/routes.js (new admin route), server/queue.js (no changes needed — getCampaignQueue() is already exported).

  ---
  Gap 3: No Campaign-Level Audit Trail Query

  Why it matters: An admin cannot retrieve "all audit events for campaign X" — getAuditLogs has no targetId filter. Diagnosing a failed campaign requires
  pulling all logs and filtering manually.

  Proposed implementation: Add targetId filter to getAuditLogs in storage.js and memoryStorage.js. Add GET /api/campaigns/:id/audit endpoint. Used with
  action filter to reconstruct: CAMPAIGN_CREATED → CAMPAIGN_STARTED → CAMPAIGN_COMPLETED/FAILED + CAMPAIGN_BLOCKED_INSUFFICIENT_CREDITS.

  ---
  Gap 4: No SES Delivery Health Dashboard

  Why it matters: SES will pause sending if complaint rate exceeds 0.1% or bounce rate exceeds 5%. There is no admin view that surfaces these rates in
  aggregate. An operator would find out only when SES notifies via email (if configured) or when sends start failing.

  Proposed implementation: A new getDashboardStats addition or separate GET /api/admin/delivery-health:
  // Across all campaigns in last 30 days:
  const totalSent = SUM(sent_emails);
  const totalBounced = SUM(bounced_emails);
  const totalComplained = SUM(complained_emails);
  const bounceRate = totalBounced / totalSent;
  const complaintRate = totalComplained / totalSent;
  // Suppression growth: COUNT(suppressions) WHERE created_at > X
  Files: server/storage.js (new method getDeliveryHealthStats()), server/memoryStorage.js (mirror), server/routes.js (new route).

  ---
  Gap 5: No Infrastructure Heartbeat / Worker Alive Signal

  Why it matters: The worker could be silently dead (Redis disconnect, uncaught exception) while the app appears healthy. Campaigns would enqueue but never
  execute.

  Proposed implementation: Worker writes a heartbeat key to Redis every 30 seconds (SET repmail:worker:heartbeat NOW() EX 60). Health endpoint reads this
  key — if absent or stale, reports "worker": "stalled". Files: server/worker.js, server/rateLimiter.js (reuse Redis connection), server/routes.js (health
  endpoint reads it).

  ---
  Gap 6: No Force-Cancel Admin Endpoint

  Why it matters: When a campaign gets stuck RUNNING (worker died mid-execution), an admin must manually PATCH status: "FAILED" and know to also remove the
  BullMQ job. There is no atomic, safe "cancel this campaign" operation.

  Proposed implementation: POST /api/admin/campaigns/:id/cancel (ROOT_ADMIN only):
  1. Mark campaign FAILED
  2. Get BullMQ job by campaignId, call job.remove() if found
  3. Write audit log CAMPAIGN_FAILED with reason: "force_cancelled_by_admin"

  Files: server/routes.js, server/queue.js (no changes).

  ---
  Gap 7: No Dead-Letter Queue Management

  Why it matters: BullMQ's removeOnFail: { count: 50 } keeps the last 50 failed jobs. An admin cannot inspect or retry them via the application.

  Proposed implementation: GET /api/admin/queue/failed returns failed job details. POST /api/admin/queue/failed/:jobId/retry retries a specific job. Both
  ROOT_ADMIN only.

  ---
  Gap 8: No Suppression Admin Tooling

  Why it matters: An admin cannot query or remove suppressions cross-user. If an address was incorrectly suppressed (e.g., a legitimate bounce that was a
  temporary error), there is no admin route to clear it.

  Proposed implementation: GET /api/admin/suppressions?email=... (cross-user query), DELETE /api/admin/suppressions/:id (remove specific suppression).
  Files: server/routes.js, server/storage.js.

  ---
  Gap 9: No Time-Series AI Cost Trend

  Why it matters: The 30-day aggregate hides daily spikes. A user who spent $50 in one day is indistinguishable from a user who spent $50 evenly over 30
  days.

  Proposed implementation: Add daily bucketing to getDashboardStats:
  SELECT DATE(created_at) as day, SUM(estimated_cost_usd) as cost, COUNT(*) as calls
  FROM ai_usage_logs
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)
  ORDER BY day

  ---
  Gap 10: No ai_usage_logs Cleanup Job

  Why it matters: The table grows indefinitely. Unlike audit_logs which has a configurable retention job, ai_usage_logs has no pruning. On a high-usage
  platform, this becomes a multi-million row table within months.

  Proposed implementation: Add a sixth cleanup job in server/index.js with a 20-minute offset, weekly schedule, AI_USAGE_LOG_RETENTION_DAYS env var (default
   90). Add pruneAiUsageLogs(retentionDays) to both storage implementations.

  ---
  Section 13 — Remaining Priorities / Recommended Roadmap

  Priority 1 — AI Quality (highest product value, immediate)

  1. AI validation layer — Server-side post-generation validation in server/ai.js: subject length, unclosed {{placeholders}}, bracket artifacts [Name], campaign-type rule violations. Currently only checks presence of subject + body.
  2. Structured campaign intake — Replace free-text prompt with 4-field structured intake: recipient description, value proposition, objective, relevance signal. Files: server/routes.js AI endpoint, client campaign wizard.
  3. [DONE — M2 (Audit 060)] Sender profile gate at campaign creation — `POST /api/campaigns` now returns `400 SENDER_PROFILE_REQUIRED` if `req.user.senderName` is null or whitespace. Template generation gate was pre-existing at routes.js:2246. Both gates now enforce the same validation.

  Priority 2 — Scale Hardening (required before high-volume campaigns)

  4. getPreCampaignSuppressionCount N+1 — storage.js:1334-1340 runs one SELECT per contact email in a loop. Fix: single WHERE email IN (...) using Drizzle inArray. Must mirror in server/memoryStorage.js.
  5. getContactById N+1 in send loop — Both worker.js and routes.js executeCampaign call getContactById per contact. Requires new getContactsByIds(ids[]) batch method (does not exist in storage.js yet — create and mirror).

  Priority 3 — Deliverability + Security (inline path parity)

  6. [DONE — commit 826aa25] executeCampaign sender health checks — routes.js inline fallback now mirrors worker.js with sendPaused pre-check and getUserSenderHealth auto-pause.
  7. [DONE — routes.js:2674] Delivery health endpoint — GET /api/admin/delivery-health implemented. Thresholds now derive from BOUNCE_RATE_PAUSE_THRESHOLD / COMPLAINT_RATE_PAUSE_THRESHOLD env vars (Milestone 1). Warning at 50% of pause threshold. Dashboard and enforcement share the same env vars.

  Note on auto-pause thresholds (Milestone 1 — Audit 059): Default values corrected from 0.15/0.005 to 0.08/0.0005. Old defaults exceeded AWS SES suspension thresholds.

  Milestone 2 additions (Audit 060 — 2026-06-26):
  - [DONE] server/validateEnv.js (new) — startup validation of numeric env vars; exit(1) on NaN or out-of-range values for BOUNCE_RATE_PAUSE_THRESHOLD, COMPLAINT_RATE_PAUSE_THRESHOLD, SES_SEND_RATE_MS, CAMPAIGN_QUEUE_CONCURRENCY.
  - [DONE] getUserSenderHealth + getDeliveryHealthStats (3 locations) — delivery health window now filters on campaigns.startedAt instead of campaigns.createdAt; unstarted (scheduled) campaigns now correctly excluded from health metrics.
  - [DONE] stripe package removed — was listed in package.json dependencies but never imported anywhere in the codebase.

  Priority 4 — Infrastructure / Operations

  8. [DONE — routes.js:2649] GET /api/admin/queue/status — Implemented.
  9. [DONE — routes.js:2611] POST /api/admin/campaigns/:id/cancel — Implemented.
  10. [DONE — index.js:714-733] ai_usage_logs cleanup job — Sixth cleanup job, AI_USAGE_LOG_RETENTION_DAYS env var (default 90d).
  11. [DONE — worker.js:77-88] Worker heartbeat — repmail:worker:heartbeat, 30s write interval, 60s TTL; health endpoint stalled threshold = 70s.
  12. [DONE — routes.js:1691] getAuditLogs targetId filter — GET /api/campaigns/:id/audit returns up to 50 entries per campaign.
  13. Time-series AI cost trend — Still pending. Daily bucketing not yet implemented.

  Nice-to-Have

  14. Dead-letter queue management API — GET /api/admin/queue/failed + POST /api/admin/queue/failed/:jobId/retry
  15. Cross-user suppression admin tooling — Query and remove suppressions across users
  16. Per-user daily AI cost breakdown (beyond top-10 aggregate)
  17. ai_usage_logs abuse pattern detection (query by requestHash similarity)
  18. Campaign-specific audit log endpoint (GET /api/campaigns/:id/audit)
  19. Horizontal scaling prep: replace process-local cleanup guards with Redis SET NX locks

  ---
  Section 14 — Critical Implementation Rules

  These constraints were established during this project and must never be violated by a continuing engineer or AI agent.

  1. Schema first: Always update shared/schema.js before adding storage methods or routes. Drizzle ORM reads the schema at runtime — routes that reference
  non-existent columns will throw at deploy time, not at write time.
  2. Update both storage implementations: Every new method in server/storage.js (PostgreSQL) must have a mirroring implementation in server/memoryStorage.js
   (in-memory shim). The application switches between them based on isDevMode. Missing methods in memoryStorage cause silent runtime errors in dev.
  3. Sequential for...of loops: Campaign contact iteration uses for (const x of arr) not Promise.all(arr.map(...)). This is intentional — parallel
  per-contact DB writes cause connection pool exhaustion, race conditions in suppression checks, and make rate limiting impossible to enforce correctly.
  4. No Promise.all on user arrays: The inactivity governance job processes users sequentially (for...of with per-user try/catch). Parallel processing would
   cause thundering herd on the DB and make individual user failures harder to isolate.
  5. Send-before-deduct: In both worker.js and routes.js, updateCampaignEmail to SENT must happen BEFORE deductCreditAtomic. A deduction failure after a
  successful send must never cause the email to show as FAILED. Accounting drift is preferable to incorrect delivery state.
  6. All validation before any DB write: The campaign creation handler runs the entire validation pipeline (normalize → dedup → format → role → limits →
  placeholder → suppression) before calling storage.createCampaign(). This is not negotiable — a partial DB write with invalid data is unrecoverable without
   manual cleanup.
  7. Suppression count runs last: getPreCampaignSuppressionCount() must be the final validation step, after all filtering that removes contacts. Earlier
  suppression counting would report counts for contacts that would never be sent to.
  8. Cleanup overlap prevention: Every cleanup job must have a let running = false boolean with finally { running = false }. Without the finally, a thrown
  error leaves running = true permanently for the process lifetime.
  9. SNS ACK after security checks: res.sendStatus(200) must come after signature verification AND TopicArn validation. Never before. The original bug (ACK
  before verification) made 403 responses impossible.
  10. isRetry must be data-driven: The worker's isRetry detection uses hasAnySentEmails(campaignId), not the status column. Status can be FAILED (from
  startup recovery) for campaigns that genuinely need to be retried. Any future change to retry detection must not regress to status-column detection.
  11. Open/Click counters are first-write-only: updateCampaignEmailOpened and updateCampaignEmailClicked use WHERE opened_at IS NULL (atomic guard).
  incrementCampaignOpened/Clicked must only be called when wasFirst = true. Never call the increment without the guard check.
  12. Migration before routes: When adding new DB columns, apply the migration to Railway's Postgres BEFORE deploying the code that writes to those columns.
   The reverse (code deployed first) causes runtime errors in production.
  13. No frontend before backend correctness: Open/click rates shown in the UI should only be added after confirming the tracking pipeline is working
  end-to-end in production (verified via Railway logs showing [SNS] Open recorded / [SNS] Click recorded).

  ---
  Section 15 — Known Bugs, Accepted Risks, and Technical Debt

  ┌─────────────────────────────────────────────────────────────────┬────────────┬──────────────────────────────────────────────────────────────────────┐
  │                              Issue                              │  Severity  │                                Status                                │
  ├─────────────────────────────────────────────────────────────────┼────────────┼──────────────────────────────────────────────────────────────────────┤
  │ Campaign counter off-by-one on crash between Step 3 and Step 4  │ Low        │ Accepted — re-processing is safe, ±1 counter error is tolerable      │
  │ of SNS processing                                               │            │                                                                      │
  ├─────────────────────────────────────────────────────────────────┼────────────┼──────────────────────────────────────────────────────────────────────┤
  │ Cleanup jobs are process-local                                  │ Medium     │ Accepted for single-instance Railway deployment; must be addressed   │
  │                                                                 │            │ before horizontal scaling                                            │
  ├─────────────────────────────────────────────────────────────────┼────────────┼──────────────────────────────────────────────────────────────────────┤
  │ ai_usage_logs has no pruning job                                │ High       │ Deferred — will cause unbounded table growth                         │
  ├─────────────────────────────────────────────────────────────────┼────────────┼──────────────────────────────────────────────────────────────────────┤
  │ No worker heartbeat                                             │ Medium     │ Deferred — silent worker death goes undetected                       │
  ├─────────────────────────────────────────────────────────────────┼────────────┼──────────────────────────────────────────────────────────────────────┤
  │ Rate limiter 30s timeout proceeds without token                 │ Low        │ Accepted — better to proceed than stall a campaign indefinitely      │
  ├─────────────────────────────────────────────────────────────────┼────────────┼──────────────────────────────────────────────────────────────────────┤
  │ getAuditLogs has no targetId filter                             │ Medium     │ Deferred — campaign-specific audit trail requires this               │
  ├─────────────────────────────────────────────────────────────────┼────────────┼──────────────────────────────────────────────────────────────────────┤
  │ SMTP throttle events not persisted                              │ Low        │ Deferred — only logged to console; no postmortem visibility          │
  ├─────────────────────────────────────────────────────────────────┼────────────┼──────────────────────────────────────────────────────────────────────┤
  │ campaign_emails.failureReason stores only the last error        │ Low        │ Accepted — retry count not tracked, only final failure               │
  ├─────────────────────────────────────────────────────────────────┼────────────┼──────────────────────────────────────────────────────────────────────┤
  │ S3 integration present in deps but unused                       │ Negligible │ Dead weight in dependencies                                          │
  ├─────────────────────────────────────────────────────────────────┼────────────┼──────────────────────────────────────────────────────────────────────┤
  │ CORS allows localhost:8083 explicitly                           │ Low        │ Dev artifact; should be removed in production hardening pass         │
  └─────────────────────────────────────────────────────────────────┴────────────┴──────────────────────────────────────────────────────────────────────┘

  ---
  Section 17 — Important Files Map

  ┌─────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │          File           │                                                       Responsibility                                                       │
  ├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ server/index.js         │ App entry point, middleware registration, cleanup jobs, inactivity governance job, emergency recovery, startup campaign    │
  │                         │ reconciliation, graceful shutdown                                                                                          │
  ├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ server/routes.js        │ All Express routes (registerRoutes), executeCampaign inline function, campaign validation helpers, SNS webhook handler     │
  ├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ server/worker.js        │ BullMQ worker (startWorker), processCampaign, sendWithRetry, isThrottleError                                               │
  ├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ server/storage.js       │ PostgreSQL storage implementation (dbStorage), exports storage (switches between dbStorage and memoryStorage)              │
  ├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ server/memoryStorage.js │ In-memory storage shim for dev mode — must mirror every method in storage.js                                               │
  ├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ server/email.js         │ sendCampaignEmail(contact, template, userId, campaignEmailId), sendTransactionalEmail, verifySesConnection                 │
  ├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ server/rateLimiter.js   │ Redis token bucket rate limiter, getRateLimiter(), acquire(campaignId), release(campaignId)                                │
  ├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ server/queue.js         │ BullMQ Queue singleton, getCampaignQueue(), addCampaignJob(), getRedisConnection()                                         │
  ├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ server/sns.js           │ verifySnsMessage(envelope) — RSA-SHA1 signature verification, cert cache, SSRF protection                                  │
  ├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ server/db.js            │ Drizzle ORM initialization, isDevMode detection                                                                            │
  ├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ server/unsubscribe.js   │ generateUnsubscribeToken(), verifyUnsubscribeToken()                                                                       │
  ├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ server/razorpayWebhook.js│ Razorpay HMAC-SHA256 webhook handler (raw body via express.raw(); registered before express.json() in index.js)           │
  ├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ server/gateways.js      │ Payment gateway abstraction — Razorpay only (Stripe fully removed as of commit f7f892e)                                    │
  ├─────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ shared/schema.js        │ All Drizzle table definitions, constants (CAMPAIGN_EMAIL_STATUS, AUDIT_ACTIONS, USER_ROLES, etc.), Zod schemas, credit     │
  │                         │ tier/plan pricing                                                                                                          │
  └─────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

  Key Routes

  ┌──────────────────────────────────────┬──────────────────────┬────────────────────────────────────────────┐
  │            Method + Path             │         Auth         │                  Purpose                   │
  ├──────────────────────────────────────┼──────────────────────┼────────────────────────────────────────────┤
  │ POST /api/auth/login                 │ None                 │ Login, create session                      │
  ├──────────────────────────────────────┼──────────────────────┼────────────────────────────────────────────┤
  │ POST /api/auth/logout                │ Auth                 │ Destroy session                            │
  ├──────────────────────────────────────┼──────────────────────┼────────────────────────────────────────────┤
  │ GET /api/auth/user                   │ Auth                 │ Current user info                          │
  ├──────────────────────────────────────┼──────────────────────┼────────────────────────────────────────────┤
  │ GET /api/campaigns                   │ Auth                 │ List user's campaigns                      │
  ├──────────────────────────────────────┼──────────────────────┼────────────────────────────────────────────┤
  │ POST /api/campaigns                  │ Auth                 │ Create + execute campaign                  │
  ├──────────────────────────────────────┼──────────────────────┼────────────────────────────────────────────┤
  │ GET /api/campaigns/:id               │ Auth                 │ Single campaign + 50 email records         │
  ├──────────────────────────────────────┼──────────────────────┼────────────────────────────────────────────┤
  │ PATCH /api/campaigns/:id             │ Auth                 │ Generic campaign update                    │
  ├──────────────────────────────────────┼──────────────────────┼────────────────────────────────────────────┤
  │ GET /api/dashboard/stats             │ Auth                 │ Dashboard stats (root admin gets AI stats) │
  ├──────────────────────────────────────┼──────────────────────┼────────────────────────────────────────────┤
  │ GET /api/audit-logs                  │ Auth + RootAdmin     │ Query audit logs                           │
  ├──────────────────────────────────────┼──────────────────────┼────────────────────────────────────────────┤
  │ POST /api/webhooks/ses               │ None (SNS signed)    │ SES bounce/complaint/open/click            │
  ├──────────────────────────────────────┼──────────────────────┼────────────────────────────────────────────┤
  │ POST /api/webhooks/razorpay          │ None (Razorpay HMAC) │ Razorpay payment events                    │
  ├──────────────────────────────────────┼──────────────────────┼────────────────────────────────────────────┤
  │ GET /api/unsubscribe                 │ None (signed token)  │ One-click unsubscribe                      │
  ├──────────────────────────────────────┼──────────────────────┼────────────────────────────────────────────┤
  │ GET /inactivity/keep-credits         │ None (signed token)  │ Reactivate account                         │
  ├──────────────────────────────────────┼──────────────────────┼────────────────────────────────────────────┤
  │ POST /api/admin/grant-root-access    │ Auth + RootAdmin     │ Grant secondary root                       │
  ├──────────────────────────────────────┼──────────────────────┼────────────────────────────────────────────┤
  │ POST /api/users/:id/allocate-credits │ Auth + Admin         │ Credit allocation                          │
  ├──────────────────────────────────────┼──────────────────────┼────────────────────────────────────────────┤
  │ POST /api/parse-excel                │ Auth                 │ Parse uploaded contact sheet               │
  └──────────────────────────────────────┴──────────────────────┴────────────────────────────────────────────┘

  ---
  Section 18 — Deployment + Recovery Runbook

  Fresh Deployment

  1. Set all required environment variables in Railway
  2. Run drizzle-kit push (or equivalent SQL) to initialize schema
  3. Verify SES SMTP connection: check Railway logs for nodemailer errors on first send
  4. Verify SNS subscription: check Railway logs for [SNS] Subscription confirmed on first webhook delivery
  5. Set REPMAIL_PUBLIC=true to open the platform
  6. Set SNS_TOPIC_ARN to the exact ARN from AWS SNS console
  7. Set SES_CONFIGURATION_SET=my-first-configuration-set
  8. Verify open/click tracking: send a test campaign, open the email, check Railway logs for [SNS] Open recorded

  Applying DB Migrations (New Columns)

  Always apply SQL manually in Railway Postgres Query tab BEFORE deploying new code:
  -- Example for the Priority 6 columns (already applied):
  ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS opened_emails INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS clicked_emails INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE campaign_emails ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP;
  ALTER TABLE campaign_emails ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP;
  Then deploy the code. Never deploy code that writes to new columns before the columns exist.

  Redis Outage

  1. BullMQ worker stops processing new jobs (worker.js exits or fails to connect)
  2. Rate limiter falls back to SES_SEND_RATE_MS per-email sleep (fail-open)
  3. New campaign POSTs fall back to inline execution (executeCampaign in routes.js)
  4. Campaigns already in BullMQ queue will not be processed until Redis recovers
  5. On Redis recovery: BullMQ reconnects automatically (IORedis retry behavior), campaigns resume
  6. Recovery action: none required — queue is durable, jobs persist in Redis

  PostgreSQL Outage

  1. All API endpoints that touch the DB will return 500
  2. SNS webhook handler will fail to process events — events will be replayed by SNS for up to 23 days
  3. BullMQ worker will fail at storage.getCampaign() and the job will be retried by BullMQ (3 attempts with exponential backoff)
  4. Recovery action: none — all systems retry automatically. SNS events will be re-processed on recovery (idempotency handles this).

  SES Throttling

  1. sendWithRetry detects throttle errors (responseCode 454/421, "throttl" in response)
  2. rateLimiter.release(campaignId) returns the token
  3. 2s + jitter wait, up to 10 throttle retries per email before treating as permanent failure
  4. Rate limiter token bucket automatically resets each second — capacity is restored
  5. If throttling persists: reduce SES_RATE_PER_SECOND to match actual SES account limit
  6. Check SES account sending limits in AWS Console → SES → Account dashboard

  Replayed SNS Events

  SNS replays are handled automatically by the 4-step idempotency system. No manual action required. If you see repeated [SNS] Already processed log lines,
  it means SNS is replaying but the handler is correctly ignoring them.

  Stuck Campaign (Status = RUNNING, No Activity)

  1. Check BullMQ queue status (currently no admin endpoint — must query Redis directly or use BullMQ dashboard if installed)
  2. Check Railway logs for [WORKER] entries for the campaignId
  3. If worker is dead: restart the Railway service (SIGTERM + restart triggers recoverStaleCampaigns() at boot)
  4. recoverStaleCampaigns() will mark the campaign FAILED and the UI will unblock
  5. If campaign should be retried: PATCH status: 'PENDING' via API, then re-enqueue via addCampaignJob
  6. Warning: Do not set status: 'RUNNING' manually — startup recovery will immediately mark it FAILED on next boot unless a BullMQ job is active

  Verifying Open/Click Tracking

  1. Send a test campaign to a real inbox
  2. Open the email (some clients block tracking pixels — use Gmail or Outlook web)
  3. Check Railway logs for: [SNS] Open recorded — campaignEmailId=... campaignId=...
  4. Check DB: SELECT opened_at, clicked_at FROM campaign_emails WHERE id = '<id>'
  5. Check DB: SELECT opened_emails, clicked_emails FROM campaigns WHERE id = '<id>'
  6. If SNS events are not arriving: check AWS SNS → Subscriptions → confirm endpoint URL matches Railway URL, check SES Configuration Set → Event
  Destinations is configured for the correct SNS topic

  SNS Signature Verification Debugging

  If [SNS] Signature verification failed appears in logs:
  1. Verify the request is actually from AWS (check IP against SNS IP ranges)
  2. Check if SignatureVersion is "1" — other versions are rejected
  3. The signing cert URL must match sns.*.amazonaws.com — check the raw SigningCertURL field in the SNS envelope
  4. Cert cache is in-process — restart clears it (certs are re-fetched on next request)
  5. Ensure no middleware is modifying the request body before the SNS route handler (use express.text({ type: 'text/plain' }) for that route)

  ---
  Section 19 — Final State Summary

  Production-Ready

  - Full auth system (session + token, Google OAuth, password reset)
  - Campaign creation, validation, and execution pipeline (both BullMQ async and inline sync fallback)
  - Per-contact send loop with suppression checking, credit deduction, and idempotent retry
  - Redis-backed token bucket rate limiter with per-campaign fairness cap
  - SES SMTP delivery with configuration set headers and message tags
  - SNS webhook processing for Bounce, Complaint, Open, Click events — fully idempotent
  - Open/click tracking: first-write-only atomic updates, campaign-level counters
  - Global suppression system (per-user + cross-user)
  - Inactivity governance (30/60/90 day Stage A/B/C pipeline with email notifications)
  - Emergency root admin recovery (30-day cooldown, audit-logged)
  - Secondary root access management
  - Five data cleanup jobs (sessions, audit logs, campaign emails, SNS events, inactivity tokens) with overlap protection
  - AI usage logging with 30-day filtered analytics for ROOT_ADMIN
  - Payment processing (Razorpay — INR only; Stripe fully removed as of commit f7f892e)
  - Startup campaign reconciliation (stale RUNNING campaigns recovered at boot)
  - Graceful shutdown (SIGTERM → worker drain)

  Operationally Hardened But Not Yet Visible

  - Rate limiter operates correctly but has no admin monitoring endpoint
  - Cleanup jobs run successfully but have no admin visibility beyond Railway logs
  - Worker processes jobs but has no heartbeat or liveness signal

  Blocks Enterprise Readiness

  1. No queue visibility — silent worker death goes undetected
  2. No force-cancel admin tooling — stuck campaigns require manual PATCH operations
  3. No delivery health dashboard — SES reputation monitoring is absent
  4. ai_usage_logs unbounded growth — no cleanup job

  What the Next Engineer/AI Should Focus On First

  In this order:

  1. AI validation layer (GAP 4) — post-generation validation in server/ai.js: subject length, unclosed {{placeholders}}, bracket artifacts, campaign-type rule enforcement
  2. getPreCampaignSuppressionCount N+1 fix (GAP 2) — storage.js:1334-1340, replace loop with inArray batch query
  3. Structured campaign intake (GAP 5) — 4-field intake: recipient description, value prop, objective, relevance signal
  4. executeCampaign sender health checks (GAP 1) — mirror worker.js:231-269 into routes.js inline fallback
  5. ai_usage_logs cleanup job — sixth cleanup job, prevents unbounded table growth
  6. GET /api/admin/queue/status — surfaces BullMQ depth, getCampaignQueue() already exported
  7. POST /api/admin/campaigns/:id/cancel — eliminates the most dangerous manual workaround

  ---
  End of handoff document. All 5 parts complete.

 Section 13 (continued) — Nice-to-Have Roadmap Items

  11. Dead-letter queue management API — GET /api/admin/queue/failed returns last 50 failed BullMQ jobs with job data, failure reason, and attempt count.
  POST /api/admin/queue/failed/:jobId/retry re-enqueues a specific job. Currently the only way to inspect failed jobs is to connect to Redis directly.
  Files: server/routes.js (two new ROOT_ADMIN routes), server/queue.js (expose getCampaignQueue() for direct job inspection — already exported, no changes
  needed).
  12. Cross-user suppression admin tooling — GET /api/admin/suppressions?email=...&userId=...&source=... for platform-wide suppression queries. DELETE
  /api/admin/suppressions/:id for removing an incorrect suppression. POST /api/admin/suppressions/bulk-remove for clearing a list of emails (e.g., after
  discovering a bad bounce batch). Files: server/routes.js, server/storage.js (new getSuppressionAdmin(filters) and deleteSuppressionById(id) methods),
  server/memoryStorage.js (mirrors).
  13. Per-user daily AI cost breakdown — Extend the ROOT_ADMIN dashboard to show not just "top 10 spenders" but a full per-user daily breakdown: user, date,
   endpoint, cost. Requires a new storage query with GROUP BY user_id, DATE(created_at), endpoint. The ai_usage_logs_user_created_at_idx composite index
  already supports this efficiently.
  14. ai_usage_logs abuse pattern detection — Query requestHash for repeated identical hashes across different users or within the same user's recent
  history. Identical hashes indicate cache-busting abuse (users rephrasing slightly to bypass the cache check). Requires a new admin endpoint or addition to
   getDashboardStats. No schema changes needed — request_hash column already exists.
  15. Campaign-specific audit log endpoint — GET /api/campaigns/:id/audit returning all audit entries where target_id = campaignId. Requires adding a
  targetId filter to getAuditLogs (currently only userId and action are supported as filters). This is listed as "Nice-to-Have" because the workaround
  (querying GET /api/audit-logs?userId=X&action=CAMPAIGN_STARTED manually) exists, even though it is cumbersome.
  16. Horizontal scaling preparation — Replace per-closure let running = false cleanup guards with Redis SET NX distributed locks. Required only if Railway
  moves to multiple replicas. Lock pattern: SET repmail:lock:cleanup:{jobName} 1 NX EX 3600 — acquire before job, release in finally. Without this, two
  replicas would double-execute every cleanup job on every run. Files: server/index.js (all five cleanup job registrations), server/rateLimiter.js (already
  handles distributed concurrency correctly via Lua scripts).

  ---
  Section 16 — Complete Environment Variables

  ┌───────────────────────────────┬──────────────┬─────────────────────────┬───────────────────────┬───────────────────────────────────────────────────┐
  │           Variable            │   Required   │         Purpose         │        Default        │                    Dependency                     │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ DATABASE_URL                  │ Production   │ PostgreSQL connection   │ —                     │ Absent triggers in-memory dev mode                │
  │                               │ only         │ string                  │                       │                                                   │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ REDIS_URL                     │ Recommended  │ Shared Redis for BullMQ │ —                     │ Absent disables queue and rate limiting           │
  │                               │              │  + rate limiter         │                       │                                                   │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ SESSION_SECRET                │ YES          │ express-session signing │ —                     │ Must be ≥32 random bytes                          │
  │                               │              │  key                    │                       │                                                   │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ NODE_ENV                      │ YES          │ Switches static serving │ —                     │ production enables server/static.js               │
  │                               │              │  vs Vite dev            │                       │                                                   │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ PORT                          │ Optional     │ HTTP listen port        │ 5000                  │ Set automatically by Railway                      │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ SES_SMTP_HOST                 │ YES          │ SES SMTP endpoint       │ —                     │ e.g., email-smtp.us-east-1.amazonaws.com          │
  │                               │              │ hostname                │                       │                                                   │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ SES_SMTP_PORT                 │ YES          │ SMTP port               │ 587                   │ 587 = STARTTLS, 465 = SSL                         │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ SES_SMTP_USER                 │ YES          │ IAM SMTP credential     │ —                     │ Generated in SES console                          │
  │                               │              │ username                │                       │                                                   │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ SES_SMTP_PASS                 │ YES          │ IAM SMTP credential     │ —                     │ Generated in SES console                          │
  │                               │              │ password                │                       │                                                   │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ SES_FROM_EMAIL                │ YES          │ Verified sender email   │ —                     │ Must be verified in SES                           │
  │                               │              │ address                 │                       │                                                   │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ SES_FROM_NAME                 │ Optional     │ Sender display name     │ RepMail               │                                                   │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ SES_CONFIGURATION_SET         │ Recommended  │ SES configuration set   │ —                     │ my-first-configuration-set. Required for          │
  │                               │              │ name                    │                       │ Open/Click/Bounce/Complaint tracking via SNS      │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ SES_RATE_PER_SECOND           │ Optional     │ Token bucket capacity   │ 14                    │ Must not exceed AWS account limit — check SES →   │
  │                               │              │ (SES send rate)         │                       │ Sending Statistics                                │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ SES_SEND_RATE_MS              │ Optional     │ Fallback sleep between  │ 0                     │ Active only when rate limiter unavailable         │
  │                               │              │ sends (no Redis)        │                       │                                                   │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ SNS_TOPIC_ARN                 │ Recommended  │ Expected SNS TopicArn   │ —                     │ Absent = TopicArn validation disabled, startup    │
  │                               │              │ for webhook validation  │                       │ warning logged                                    │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ OPENAI_API_KEY                │ YES (AI      │ OpenAI API key          │ —                     │ Required for template gen, preview, spam analysis │
  │                               │ features)    │                         │                       │                                                   │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ RAZORPAY_KEY_ID               │ YES          │ Razorpay key ID         │ —                     │                                                   │
  │                               │ (payments)   │                         │                       │                                                   │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ RAZORPAY_KEY_SECRET           │ YES          │ Razorpay secret key     │ —                     │                                                   │
  │                               │ (payments)   │                         │                       │                                                   │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ RAZORPAY_WEBHOOK_SECRET       │ YES          │ Razorpay webhook HMAC   │ —                     │ HMAC-SHA256; separate from key secret             │
  │                               │ (payments)   │ signing secret          │                       │                                                   │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ APP_URL                       │ YES          │ Public-facing           │ http://localhost:5000 │ Used in email links: unsubscribe URLs,            │
  │                               │              │ application URL         │                       │ keep-credits URLs, audit trail links              │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ RECOVERY_EMAIL                │ Recommended  │ Emergency recovery      │ —                     │ Absent disables the entire emergency recovery     │
  │                               │              │ account email           │                       │ system                                            │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │                               │              │ Alert recipient when    │                       │                                                   │
  │ PLATFORM_ALERT_EMAIL          │ Optional     │ emergency recovery      │ —                     │                                                   │
  │                               │              │ fires                   │                       │                                                   │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ AUDIT_LOG_RETENTION_DAYS      │ Optional     │ Audit log deletion      │ 180                   │ Days before pruning                               │
  │                               │              │ cutoff                  │                       │                                                   │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ CAMPAIGN_EMAIL_RETENTION_DAYS │ Optional     │ Per-email record        │ 90                    │ Days; only COMPLETED/FAILED campaigns affected    │
  │                               │              │ deletion cutoff         │                       │                                                   │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ REPMAIL_PUBLIC                │ Production   │ Gates all API routes    │ —                     │ Must be "true" to allow full platform access in   │
  │                               │              │                         │                       │ production                                        │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ GOOGLE_CLIENT_ID              │ Optional     │ Google OAuth 2.0 client │ —                     │ Required for Google login button                  │
  │                               │              │  ID                     │                       │                                                   │
  ├───────────────────────────────┼──────────────┼─────────────────────────┼───────────────────────┼───────────────────────────────────────────────────┤
  │ GOOGLE_CLIENT_SECRET          │ Optional     │ Google OAuth 2.0 client │ —                     │                                                   │
  │                               │              │  secret                 │                       │                                                   │
  └───────────────────────────────┴──────────────┴─────────────────────────┴───────────────────────┴───────────────────────────────────────────────────┘

  Operational notes:
  - SES_RATE_PER_SECOND and the actual AWS SES account limit must be kept in sync. If SES throttles despite the rate limiter, the limit in AWS has been
  lowered or the account has not been granted a higher limit. Check AWS Console → SES → Account → Sending limits.
  - APP_URL must not have a trailing slash. Unsubscribe and keep-credits links are constructed as ${APP_URL}/api/unsubscribe?... — a trailing slash creates
  double-slash URLs that some email clients reject.
  - SESSION_SECRET rotation invalidates all active sessions. Coordinate with users before rotating.
  - RECOVERY_EMAIL should be a monitored inbox that does NOT belong to any existing user in the system. If the email belongs to an existing non-root user,
  the recovery procedure elevates it to ROOT_ADMIN temporarily.

  ---
  Section 14 — Critical Implementation Rules (Complete)

  These rules were established through bugs, architectural decisions, and explicit engineering choices during this project. Violating any of these rules
  will cause data integrity issues, security vulnerabilities, or silent production failures.

  Rule 1: Schema First

  Always update shared/schema.js before writing storage methods or routes that reference new columns. Drizzle ORM reads the schema at runtime — a route
  referencing a column not yet in the schema will compile fine but throw at runtime. Apply the migration SQL to the production database before deploying the
   code.

  Migration order: schema.js update → SQL applied to Railway Postgres → code deployed.

  Rule 2: Mirror Both Storage Implementations

  Every method added to dbStorage in server/storage.js must have an identical interface in server/memoryStorage.js. The app switches between them based on
  isDevMode. Methods missing from memoryStorage cause TypeError: storage.methodName is not a function in development, which blocks local testing. The method
   signatures must match exactly — same parameter names, same return shape.

  Rule 3: Sequential For Loops for Contact Processing

  Campaign contact iteration uses for (const contactId of contactIds) — never Promise.all(contactIds.map(...)). Parallel processing causes:
  - Connection pool exhaustion (Postgres has a finite pool; 10,000 parallel queries deadlock it)
  - Race conditions in suppression checks (a bounce mid-campaign on contact 500 should suppress contact 501 — parallel processing misses this)
  - Rate limiter defeat (all workers would simultaneously acquire tokens, overwhelming the bucket)
  - Uncontrolled credit deduction ordering (atomic deduction relies on sequential reads)

  This applies to inactivity governance processing, audit log writes, and any other per-user iteration.

  Rule 4: Send Before Deduct

  updateCampaignEmail(id, { status: SENT, sesMessageId, sentAt }) must be called before deductCreditAtomic(). If deduction fails after a successful SMTP
  delivery, the email must show as SENT in the DB. The alternative — marking FAILED if deduction fails — is a lie about delivery state and would cause
  duplicate sends on retry. Accounting drift (sent but not deducted) is logged and accepted.

  Rule 5: Validation Before DB Write

  The full contact validation pipeline in POST /api/campaigns must complete before storage.createCampaign() is called. The pipeline order is: normalize →
  deduplicate → format check → role address filter → max contacts limit → subject byte limit → body byte limit → placeholder cross-reference → suppression
  count. A partial DB write with invalid contact data cannot be safely recovered without manual intervention.

  Rule 6: Suppression Count Last

  getPreCampaignSuppressionCount() must always be the final step in the validation pipeline. If it runs before format filtering or role address filtering,
  it will count suppressions on contacts that would never be sent to anyway, producing a misleading advisory count. The count is informational — it never
  blocks a campaign.

  Rule 7: Cleanup Overlap Prevention

  Every cleanup job must have the pattern:
  let running = false;
  async function runJob() {
    if (running) { console.warn("...still in progress — skipping"); return; }
    running = true;
    try { ... } catch (err) { ... } finally { running = false; }
  }
  The finally { running = false } is mandatory. Without it, any thrown error leaves the boolean permanently true, silently killing the job for the rest of
  the process lifetime with no error log on subsequent firings.

  Rule 8: SNS ACK Order

  res.sendStatus(200) in the SNS webhook handler must come after both security checks (signature verification + TopicArn validation). The original bug was
  ACK before verification, making 403 impossible. SNS interprets any 2xx as "delivered successfully" and stops retrying — so ACKing before security checks
  means malformed or forged requests are silently accepted.

  Rule 9: isRetry Must Be Data-Driven

  The worker's retry detection uses hasAnySentEmails(campaignId) — not campaign.status. The startup recovery recoverStaleCampaigns() sets failed campaigns
  to status = 'FAILED' — but if those campaigns genuinely need to resume (BullMQ retries them), the status-column approach would mark them as fresh starts
  and skip the per-contact idempotency check. Using hasAnySentEmails() means: if any email was sent in a previous attempt, treat this as a retry regardless
  of what the status column says.

  Rule 10: Open/Click First-Write Guard

  updateCampaignEmailOpened(id) and updateCampaignEmailClicked(id) use WHERE opened_at IS NULL / WHERE clicked_at IS NULL in the UPDATE query and return {
  wasFirst: boolean } based on whether rows were affected. incrementCampaignOpened(campaignId) and incrementCampaignClicked(campaignId) must only be called
  when wasFirst === true. Never call the increment unconditionally — SES sends multiple Open events per email (email client prefetch, multiple opens by the
  same recipient) and the counter would inflate.

  Rule 11: Migration Before Deployment

  When schema changes introduce new columns, apply the SQL migration to Railway Postgres before deploying the code that writes to those columns. The reverse
   order causes runtime errors in production on the very first request that hits the new code path.

  Rule 12: No Horizontal Scaling Without Distributed Locks

  The five cleanup jobs use process-local boolean guards. If Railway is ever configured to run multiple replicas (horizontal scaling), both instances will
  execute all cleanup jobs simultaneously. The DELETEs are idempotent but the doubled DB load is not acceptable. Before enabling multiple replicas, replace
  the boolean guards with Redis SET NX distributed locks.

  Rule 13: Rate Limiter Fail-Open

  The rate limiter is fail-open by design. If Redis is unavailable, the acquire timeout fires after 30 seconds and the send proceeds without a token. This
  is intentional — a campaign must not stall indefinitely because of a Redis outage. Operators who need fail-closed behavior must set SES_SEND_RATE_MS as a
  secondary control, which provides a per-worker throttle without Redis.

  Rule 14: Atomic Credit Operations

  deductCreditAtomic must never be replaced with a read-then-write pattern. The atomic operation prevents two concurrent campaigns from both reading the
  same balance, both determining they have enough credits, and both proceeding — resulting in a negative balance. All credit modifications (allocate,
  deduct, reclaim) must go through atomic DB operations.

  Rule 15: Configuration Set Headers Are Conditional

  The SES configuration set and message tag headers are only injected when process.env.SES_CONFIGURATION_SET is set AND campaignEmailId is provided. Do not
  hardcode the configuration set name. This conditional prevents breaking SMTP sends in environments where SES is not configured (local dev, staging without
   SES credentials).

  ---
  Section 15 — Known Bugs, Accepted Risks, and Technical Debt

  Confirmed Off-By-One Risk

  Scenario: SNS delivers an Open event. The handler completes Step 14 (calls incrementCampaignOpened) but crashes before Step 15 (updateSnsEventProcessed).
  The sns_events row remains with processed=false. The next SNS delivery re-runs Step 14. The updateCampaignEmailOpened atomic guard (WHERE IS NULL)
  correctly skips setting opened_at again (already set). But incrementCampaignOpened is a blind +1 with no guard — it fires again. Result: opened_emails is
  off by +1.

  Accepted because: The alternative (marking processed before incrementing) would drop the event entirely if the process crashes between the mark and the
  increment. A ±1 error on a counter is a better outcome than permanently lost event data.

  Mitigation: The probability of this scenario is very low (requires a process crash in the exact millisecond between two sequential DB writes). Monitoring
  campaigns.opened_emails vs. manual counts would surface systematic drift.

  ---
  Process-Local Cleanup Guards

  The let running = false cleanup guards are process-local. They correctly prevent overlapping executions within a single Node.js process. They provide zero
   protection if Railway ever runs multiple replicas. This is documented and accepted for the current single-instance deployment topology.

  ---
  ai_usage_logs Unbounded Growth

  No cleanup job exists for ai_usage_logs. With daily AI usage across many users, this table will accumulate millions of rows over time. The
  userCreatedAtIdx composite index ensures queries remain fast, but raw table size affects backup time, restore time, and storage costs. Action required
  before production at scale.

  ---
  Transient SMTP Errors Not Classified

  sendWithRetry treats any non-throttle error as a permanent failure after 3 attempts. Some SMTP errors that look permanent (e.g., "connection timeout") are
   actually transient. There is no retry classification beyond "throttle vs. everything else." This could cause campaign_emails records to be marked FAILED
  for emails that would have succeeded on a fourth attempt. Accepted for now — improving error classification requires extensive SMTP error code mapping.

  ---
  getAuditLogs Missing targetId Filter

  The storage method getAuditLogs(filters) only supports filtering by userId and action. There is no targetId filter, making per-campaign audit trail
  queries impossible via the API. The workaround is pulling all logs for a user and filtering client-side. This works but is inefficient for users with
  large audit histories.

  ---
  No Retry Count in campaign_emails

  The campaign_emails table stores only failureReason (the error message from the last attempt). There is no attemptCount column. An admin looking at a
  FAILED record cannot tell whether it failed on the first attempt or exhausted all 3 retries. Context about throttle retries is entirely absent from the
  DB.

  ---
  CORS Allows Dev Ports

  server/index.js CORS configuration allows localhost:8083 in the allowedOrigins array. This is a development artifact that should be removed before
  production hardening. It poses minimal risk (CORS does not block server-to-server requests) but is unnecessary.

  ---
  Inactivity Governance Has No Overlap Guard

  The inactivity governance job (runInactivityJob) does not have a let running = false guard. Unlike the cleanup jobs which do simple DELETEs, the
  inactivity job iterates all users in three passes (Stage A/B/C) with per-user email sends. If the job runs for longer than 24 hours (extremely unlikely
  but possible on a large user base with slow email delivery), the next setInterval tick would start a second concurrent execution. Accepted for now given
  the expected user base size.

  ---
  S3 Dependencies Are Unused

  @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner are in package.json but no active code path uses them. They add ~2MB to the bundle and represent
  credentials/configuration surface area that does not yet deliver value. Remove or implement.

  ---
  AWS Setup Summary (Reference)

  What Is Configured in Production

  ┌───────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────┬────────────────┐
  │      AWS Service      │                                            Configuration                                             │     Status     │
  ├───────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────┤
  │ SES                   │ SMTP credentials created, verified sending identity, sandbox mode DISABLED (production sending live) │ Live           │
  ├───────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────┤
  │ SES Configuration Set │ my-first-configuration-set — Open, Click, Bounce, Complaint event types enabled                      │ Live           │
  ├───────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────┤
  │ SNS Topic             │ repmail_events — receives SES configuration set events                                               │ Live           │
  ├───────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────┤
  │ SNS Subscription      │ HTTP endpoint: Railway app's /api/webhooks/ses URL, subscription confirmed                           │ Live           │
  ├───────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────┤
  │ S3                    │ SDK dependency present, no buckets configured or used                                                │ Not configured │
  └───────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────┴────────────────┘

  SES Account Limits to Verify

  - Sending rate: Check AWS Console → SES → Account → Sending limits. Default sandbox is 1/sec. Production accounts vary. SES_RATE_PER_SECOND must be set at
   or below this value.
  - Daily sending quota: Verify the 24-hour sending quota is sufficient for expected campaign volume.
  - Dedicated IP vs shared: RepMail uses SES shared IP pool by default. For higher deliverability, dedicated IPs can be configured in SES — no code changes
  required, this is a SES console configuration.

  SNS Topic Policy Requirement

  The SNS topic must have a resource policy that allows SES to publish to it. If events stop arriving, check: AWS Console → SNS → Topics → repmail_events →
  Access policy — it must include a statement allowing ses.amazonaws.com to call sns:Publish.

  ---
  Frontend Architecture

  Tech Stack

  - React 18 with Vite (dev server) and esbuild (production build)
  - Routing: Wouter (lightweight client-side routing)
  - State management: TanStack Query (React Query) for server state, React state for local UI
  - UI: Radix UI primitives + Tailwind CSS + shadcn/ui component library
  - Forms: react-hook-form + Zod resolvers
  - Charts: Recharts
  - Animations: Framer Motion / motion

  Key Frontend Directories (inferred from package.json)

  client/
    src/
      pages/           ← route-level components
      components/      ← shared UI components
      hooks/           ← TanStack Query hooks wrapping API calls
      lib/             ← utilities, API client

  API Communication Pattern

  All API calls go through TanStack Query hooks. The pattern is:
  // Query (GET)
  const { data: campaigns } = useQuery({
    queryKey: ['/api/campaigns'],
    queryFn: () => fetch('/api/campaigns').then(r => r.json()),
  });

  // Mutation (POST/PATCH/DELETE)
  const mutation = useMutation({
    mutationFn: (data) => fetch('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries(['/api/campaigns']),
  });

  Session auth is cookie-based. Credentials are included automatically on same-origin requests.

  Campaign Progress Polling

  GET /api/campaigns/:id returns the campaign record with sentEmails, failedEmails, skippedEmails counters. The frontend polls this endpoint during campaign
   execution to show a live progress bar. The worker checkpoints these counters after every email via updateCampaign(). The response also includes up to 50
  most-recent campaignEmails records for the detailed per-contact status table.

  ---
  Remaining Frontend Work

  Priority: High

  1. Admin delivery health view — once GET /api/admin/delivery-health is implemented, surface:
    - Platform-wide bounce rate (with red threshold indicator at 5%)
    - Platform-wide complaint rate (with red threshold indicator at 0.1%)
    - Suppression list total and growth trend
  2. Queue status panel — once GET /api/admin/queue/status is implemented, add to admin dashboard:
    - Active/waiting/delayed/failed job counts
    - Alert if failed > 0

  Priority: Medium

  3. Campaign-level open/click charts — a simple bar chart (Recharts is already installed) showing open rate and click rate per campaign across the last N
  campaigns. Data available from GET /api/campaigns.
  4. Suppression list management — the existing suppression view is user-scoped. Once the admin suppression endpoints exist, add a ROOT_ADMIN view showing
  cross-user suppressions with search and delete.
  5. AI cost trend chart — daily cost breakdown chart for the admin dashboard. Once the time-series query is implemented in getDashboardStats, render via
  Recharts.

  Priority: Low

  6. Force-cancel button on stuck campaigns — button visible to ROOT_ADMIN only on campaigns with status = 'RUNNING'. Calls POST
  /api/admin/campaigns/:id/cancel once implemented.
  7. Audit log campaign filter — once targetId filter is added to getAuditLogs, add a per-campaign audit log tab in the campaign detail view.

  ---
  Exact Next Implementation Steps

  These are ordered by operational value and implementation risk (lowest risk first).

  Step 1: ai_usage_logs Cleanup Job (1 hour)

  File: server/index.js — add sixth cleanup job after the inactivity token expiry job:

  setTimeout(() => {
    let running = false;
    async function runAiLogCleanup() {
      if (running) { console.warn("[CLEANUP] AI log cleanup still in progress — skipping"); return; }
      running = true;
      const retentionDays = parseInt(process.env.AI_USAGE_LOG_RETENTION_DAYS || "90", 10);
      try {
        const count = await storage.pruneAiUsageLogs(retentionDays);
        console.log(`[CLEANUP] AI usage logs pruned (older than ${retentionDays}d): ${count}`);
      } catch (err) {
        console.error("[CLEANUP] AI log cleanup error:", err.message);
      } finally {
        running = false;
      }
    }
    runAiLogCleanup();
    setInterval(runAiLogCleanup, 7 * 24 * 60 * 60 * 1000);
  }, 20 * 60 * 1000); // 20-minute offset

  File: server/storage.js — add method after pruneAuditLogs:
  async pruneAiUsageLogs(retentionDays) {
    const cutoff = new Date(Date.now() - retentionDays * 86400000);
    const deleted = await db.delete(aiUsageLogs)
      .where(lt(aiUsageLogs.createdAt, cutoff))
      .returning({ id: aiUsageLogs.id });
    return deleted.length;
  },

  File: server/memoryStorage.js — mirror:
  async pruneAiUsageLogs(retentionDays) {
    const cutoff = new Date(Date.now() - retentionDays * 86400000);
    let count = 0;
    for (const [id, log] of store.aiUsageLogs) {
      if (log.createdAt < cutoff) { store.aiUsageLogs.delete(id); count++; }
    }
    return count;
  },

  Environment variable to add: AI_USAGE_LOG_RETENTION_DAYS (default 90).

  ---
  Step 4: GET /api/admin/queue/status (1–2 hours)

  File: server/routes.js — add after existing admin routes:
  app.get("/api/admin/queue/status", authMiddleware, rootAdminMiddleware, async (req, res) => {
    try {
      const queue = getCampaignQueue();
      if (!queue) {
        return res.json({ available: false, reason: "Redis not configured" });
      }
      const counts = await queue.getJobCounts('active', 'waiting', 'delayed', 'failed', 'completed');
      const failedJobs = await queue.getFailed(0, 10);
      res.json({
        available: true,
        counts,
        recentFailures: failedJobs.map(j => ({
          jobId: j.id,
          campaignId: j.data?.campaignId,
          failedReason: j.failedReason,
          attemptsMade: j.attemptsMade,
          finishedOn: j.finishedOn,
        })),
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  No schema changes. No storage changes. No migration.

  ---
  Step 5: targetId Filter in getAuditLogs + Campaign Audit Endpoint (2 hours)

  File: server/storage.js — add targetId to getAuditLogs filters:
  async getAuditLogs(filters = {}) {
    const conditions = [];
    if (filters.userId) conditions.push(eq(auditLogs.userId, filters.userId));
    if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
    if (filters.targetId) conditions.push(eq(auditLogs.targetId, filters.targetId)); // ADD THIS
    // ... rest unchanged
  }

  File: server/memoryStorage.js — mirror the targetId filter in the in-memory implementation.

  File: server/routes.js — add campaign audit endpoint:
  app.get("/api/campaigns/:id/audit", authMiddleware, async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      if (campaign.userId !== req.user.id && !req.isRootAdmin && !req.user.isSecondaryRoot) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const logs = await storage.getAuditLogs({ targetId: req.params.id, limit: 200 });
      res.json(logs);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  ---
  Step 6: POST /api/admin/campaigns/:id/cancel (2 hours)

  File: server/routes.js:
  app.post("/api/admin/campaigns/:id/cancel", authMiddleware, rootAdminMiddleware, async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });

      await storage.updateCampaign(req.params.id, { status: "FAILED" });

      const queue = getCampaignQueue();
      if (queue) {
        try {
          const job = await queue.getJob(req.params.id);
          if (job) await job.remove();
        } catch (qErr) {
          console.warn(`[ADMIN] BullMQ job removal failed for campaign ${req.params.id}:`, qErr.message);
        }
      }

      await storage.createAuditLog({
        userId: req.user.id,
        action: AUDIT_ACTIONS.CAMPAIGN_FAILED,
        targetType: "campaign",
        targetId: req.params.id,
        details: { reason: "force_cancelled_by_admin", adminId: req.user.id },
      });

      res.json({ message: "Campaign cancelled", campaignId: req.params.id });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  ---
  Final Operational Recommendations

  Before the First Public User Onboards

  1. Verify end-to-end tracking: Send a test campaign to a real inbox you control. Open it. Click a link. Confirm Railway logs show [SNS] Open recorded and
  [SNS] Click recorded. Confirm DB values update in campaigns.opened_emails and campaign_emails.opened_at.
  2. Set SNS_TOPIC_ARN: Without this, any SNS message from any topic would be processed. This is a cross-account injection risk.
  3. Set SES_RATE_PER_SECOND to match your actual AWS SES account sending limit. Leaving it at 14 when your account has a higher limit wastes capacity.
  Setting it above your limit causes throttle errors.
  4. Test the inactivity governance email flow in staging by temporarily reducing WARNING_DAYS or using INACTIVITY_THRESHOLDS overrides. The keep-credits
  URL uses APP_URL — confirm the URL resolves correctly in production.

  Ongoing Operational Hygiene

  - Monitor Railway logs for [CLEANUP] lines daily. If a cleanup job shows still in progress — skipping repeatedly, the DB is under load or the retention
  window is too aggressive.
  - Monitor for [SNS] Signature verification failed — this should never appear in normal operation. Any occurrence indicates either a forged request or an
  SNS infrastructure issue.
  - Check campaigns.bounced_emails / sent_emails ratios monthly. If the platform-wide bounce rate approaches 5% or complaint rate approaches 0.1%, pause
  campaign sending and clean the contact lists.
  - Rotate SESSION_SECRET annually or after any suspected credential compromise. This invalidates all active sessions.
  - Keep SES_CONFIGURATION_SET in sync with the actual AWS configuration set name. If the name is changed in AWS but not in the env var, all campaign emails
   will be sent without the configuration set header — Open/Click events will stop arriving silently.

  Before Horizontal Scaling

  1. Replace all five cleanup job let running = false guards with Redis SET NX distributed locks
  2. Audit any other singleton state (rate limiter connections, BullMQ connection) — these are already safe (singletons per process, Redis-coordinated)
  3. Test that the scheduled campaign scheduler (setInterval every 30s) does not double-enqueue when two instances both poll — BullMQ's jobId = campaignId
  deduplication handles this correctly already

  If SES Reputation Degrades

  1. Stop all RUNNING campaigns immediately (use the force-cancel endpoint once implemented, or PATCH each to FAILED manually)
  2. Drain the BullMQ queue (remove all waiting/delayed jobs)
  3. Check AWS SES account reputation dashboard — complaint rate, bounce rate, delivery rate
  4. Review suppressions table growth rate — a rapid spike indicates a bad contact list upload
  5. Review campaign_emails for BOUNCED records — identify which campaigns caused the bounces
  6. Do not resume sending until the suppression list has absorbed all bounced/complained addresses and the problematic contact lists have been removed

---

  Section — Spam Analyzer Trust Redesign (commit f0cbbbb)

  Problem Solved

  The spam score could increase after a user accepted AI suggestions (observed: 36 → 41). Root causes:
  1. Merge tags like {{name}} and {{company}} were sent raw to GPT, triggering dimension 5 "mass-blast
     template" penalties on every analysis.
  2. GPT's holistic score was the primary displayed score. Accepting one suggestion could shift holistic
     weighting on other dimensions, causing the total score to rise — a trust-breaking result.

  Architecture After Redesign

  Two independent systems now have explicit, separate roles:

  calculateSpamScore (client/src/lib/utils.js)
  - Deterministic, keyword-based, synchronous
  - Always runs on the current raw template (after each accept)
  - Score can only decrease when keyword suggestions are accepted
  - Primary displayed "Spam Score" — the number the user acts on
  - Structural checks: subject length, ALL CAPS, exclamation count, word count (tips, not score)

  analyzeSpam / GPT-4o-mini (server/ai.js)
  - Non-deterministic, holistic, async
  - Evaluates RENDERED content (merge tags substituted before sending)
  - Returns: summary, structural observations, contextual recommendations
  - Displayed in "AI Deliverability Review" panel — advisory only
  - AI numeric score returned by GPT is intentionally discarded and never shown

  Merge Tag Substitution

  Before sending to GPT, the client substitutes merge tags using the first contact's data (or demo
  values when no contacts are loaded):
    {{name}}     → firstContact[columnMapping.name]     or "Alex"
    {{company}}  → firstContact[columnMapping.company]  or "Acme Corp"
    {{category}} → firstContact[columnMapping.category] or "Technology"
    {{email}}    → firstContact[columnMapping.email]    or "alex@example.com"

  The rendered content is what the server receives and caches. Cache key = SHA-256 of rendered content.
  The raw template is never sent to GPT.

  Accepted Suggestion Suppression

  Client sends acceptedSuggestions: ["free", "guarantee"] in the POST body.
  Server-side behavior:
  - Cache hit: suggestions array filtered by accepted set before returning (case-insensitive match on original)
  - Cache miss: acceptedSuggestions injected into the AI user prompt as context:
    "The user has already addressed these issues: [free, guarantee]. Do not suggest these again."
  This prevents re-suggestion of already-accepted words across re-analysis runs.

  Score Delta Display

  prevScore state stores the local score at the time of each AI analysis run.
  After the first analysis, if the local score has changed (due to accepts), the Score card shows:
    "Was 36 → Now 28 (−8)"  ← green, TrendingDown icon
    "Was 28 → Now 36 (+8)"  ← amber, TrendingUp icon (user added spam words manually)
  prevScore resets on re-analysis, establishing a new baseline.

  Display Snapshot Pattern

  displayAnalysis (component state) holds a stable snapshot of calculateSpamScore at the time of
  the last AI analysis run. This snapshot is used for rendering the Risky Words card and the Keyword
  Improvements list, so that accepted words continue to show "Applied" + location badges until the
  next re-analysis.

  localScore is always live (recalculated on every accept) and drives the displayed score.

  On each successful AI analysis:
  1. displayAnalysis reset to calculateSpamScore(current template) — reflects post-accept state
  2. acceptedSuggestions and acceptedDetails reset — fresh baseline for next editing round
  3. prevScore set to current localScore — establishes delta baseline
  4. setSpamAnalysis(currentKeywords) — persists local snapshot to CampaignContext for back-navigation

  AI Recommendations Applicability Guard

  AI suggestions reference rendered content (e.g., "Hi Alex" when template has "Hi {{name}}"). The
  Apply button is only shown when suggestion.original is found in the raw template.subject or
  template.body (case-insensitive). When not found, the suggestion displays as a read-only tip.

  Disclaimer

  A note is shown under the Spam Score card:
  "Spam Score reflects keyword and structural analysis. Inbox placement also depends on domain
  reputation, authentication, sending behavior, and recipient engagement."
  This prevents users from interpreting a low keyword score as a guarantee of inbox delivery.

---

  Section — calculateSpamScore Signal Reference (commit cd1714b)

  Complete rule set as of 2026-06-06. All checks are deterministic and client-side.
  No server contact, no quota consumption, no cache interaction.

  Scored Rules (point values and conditions)

  ┌──────────────────────────────────────┬───────────┬──────────────────────────────────────────────────┐
  │ Rule                                 │ Points    │ Condition                                        │
  ├──────────────────────────────────────┼───────────┼──────────────────────────────────────────────────┤
  │ Spam keyword match                   │ +5 each   │ 15 phrases in combined subject+body (lowercase)  │
  │ ALL CAPS subject                     │ +15       │ subject === subject.toUpperCase() && length > 5  │
  │ Subject too long                     │ +5        │ subject.length > 50 (else-if, not stacked)       │
  │ Re:/Fwd: deceptive prefix            │ +15       │ /^\s*(re|fwd|fw)\s*:/i matches subject           │
  │ Exclamation marks                    │ +2 each   │ count × 2, capped at +10                         │
  │ Body > 200 words                     │ +5        │ word count of body                               │
  │ Link count 4–5                       │ +5        │ https?:// occurrences in body ≥ 4                │
  │ Link count 6+                        │ +10       │ https?:// occurrences in body ≥ 6                │
  │ Generic greeting                     │ +5        │ Pattern list matches first 200 chars of body     │
  └──────────────────────────────────────┴───────────┴──────────────────────────────────────────────────┘

  Score ceiling: Math.min(score, 100)
  ALL CAPS and subject-too-long are mutually exclusive (else-if). All other rules are independent.

  Generic Greeting Patterns
    /^\s*(dear\s+(sir|madam|sir\s*\/\s*madam|ma'am|customer|valued\s+customer|friend))\b/i
    /^\s*to\s+whom\s+it\s+may\s+concern/i
    /^\s*(hello|hi)\s+there\b/i
    /^\s*greetings\b/i
    /^\s*dear\s+all\b/i

  Advisory Tips (no score impact, shown as lightbulb structural tips)

  Placeholder count: fires when ≥ 4 unique {{field}} names appear in subject + body combined.
  Warns about column mapping failures that expose raw placeholders to recipients.

  CTA count: fires when ≥ 3 of the following phrases appear in the combined text:
    "schedule a", "book a", "book time", "grab time", "click here",
    "visit our", "check out our", "download", "register", "sign up",
    "learn more", "get started", "call us", "call me"
  Advisory to reduce to a single clear ask.

  Link Count Threshold Design Note
  Threshold is 4 (not 3) because a RepMail campaign body with a Calendly link + website
  link + unsubscribe link = 3 links total. This is a normal, clean pattern. The penalty
  fires at 4+ where bulk-email patterns begin.

  Note on Calendly + website + LinkedIn + unsubscribe = 4 links: RepMail injects the
  unsubscribe link server-side at send time. The raw template only has 3 links
  (Calendly + website + LinkedIn). calculateSpamScore evaluates the raw template and
  sees 3 links — below threshold — no penalty. The +5 only fires if a user manually
  adds a 4th https:// in their template body, which is appropriate to flag.

---

  Section — Score Composition Breakdown (commit a0d5fc1)

  Problem Solved

  The Spam Score card showed only a total number, risk badge, and progress bar.
  Users could not see which rules fired or how many points each contributed.
  Trust in the score depends on users understanding where it comes from.

  Solution

  calculateSpamScore now returns a breakdown: [{ label: string, points: number }] array.
  Each rule that fires and contributes points pushes one entry. Advisory tips (placeholder
  count, CTA count) are excluded — they have no numeric value.

  The Score card renders a compact per-rule table directly below the risk badge:

    +15  Re: / Fwd: subject prefix
    +5   Generic greeting
    +5   4 links
    +5   2 spam keywords (free, guarantee)
    ─────────────────────────────────────
    = 30

  Shown only when score > 0. Score = 0 shows no breakdown.

  Breakdown labels by rule

  ┌──────────────────────────┬───────────────────────────────────────────────┐
  │ Rule                     │ Label format                                  │
  ├──────────────────────────┼───────────────────────────────────────────────┤
  │ Spam keywords            │ "N spam keyword(s) (word1, word2, ...)"       │
  │ ALL CAPS subject         │ "ALL CAPS subject"                            │
  │ Subject too long         │ "Subject too long"                            │
  │ Re:/Fwd: prefix          │ "Re: / Fwd: subject prefix"                   │
  │ Exclamation marks        │ "N exclamation mark(s)"                       │
  │ Body > 200 words         │ "N-word body"                                 │
  │ 4–5 links                │ "N links"                                     │
  │ 6+ links                 │ "N links"                                     │
  │ Generic greeting         │ "Generic greeting"                            │
  └──────────────────────────┴───────────────────────────────────────────────┘

  State Model Update

  localScore (number) replaced by localAnalysisLive (full calculateSpamScore result object).
  - localAnalysisLive.score  → drives the displayed number (was localScore)
  - localAnalysisLive.breakdown → drives the breakdown table (new)
  Both update on every accepted suggestion and on every AI analysis completion.
  displayAnalysis (stable snapshot) is unchanged — still used for Risky Words and
  Keyword Improvements rendering.

---

  Section — Send Validation UX + Unsubscribe Check Removal (commit edd9455)

  Problem 1 — Raw JSON rendered to user

  POST /api/campaigns returns HTTP 400 {"validationErrors":[...]} when template or contact
  data fails validation. The CampaignConfirmation.jsx onError handler checked for
  parsed.error === "PLAN_LIMIT" and parsed.message but never handled parsed.validationErrors.
  The fallback set error state to the raw JSON string, which React rendered verbatim.

  Fix: onError now checks Array.isArray(parsed.validationErrors) first. If present, it sets
  a separate validationErrors state (array). The render block shows a titled bullet list with
  a "Fix Column Mapping" button (setStep(2)) when any error mentions a missing placeholder.
  Both error and validationErrors are cleared before each new send attempt.

  Problem 2 — Redundant unsubscribe body validation

  routes.js blocked campaigns whose body didn't contain {{unsubscribe_url}} or the word
  "unsubscribe". Two reasons this was wrong:

  1. {{unsubscribe_url}} is not a supported merge tag. email.js replacePlaceholders handles
     only {{name}}, {{email}}, {{company}}, {{category}}. A user writing {{unsubscribe_url}}
     would see the literal text in their sent emails — a broken link.

  2. buildUnsubscribeFooter() is called unconditionally in sendCampaignEmail for every
     delivery path. CAN-SPAM compliance is guaranteed by the footer. The validation was
     redundant and blocked clean cold-outreach templates.

  Delivery path audit (all paths confirmed before removing the check):
    BullMQ worker (primary)        worker.js:124 → sendCampaignEmail → buildUnsubscribeFooter
    Inline fallback (Redis down)   routes.js:233 → sendCampaignEmail → buildUnsubscribeFooter
    Scheduled (BullMQ)             scheduler → addCampaignJob → worker → sendCampaignEmail
    Scheduled (inline fallback)    index.js:696 → executeCampaign → routes.js:233
    Application retries            sendWithRetry loop → sendCampaignEmail
    Resume after global pause      resume-sending → addCampaignJob → worker

  No test-send feature exists. sendTransactionalEmail is used for system notifications
  (invites, inactivity alerts) — transactional messages are CAN-SPAM exempt.

  Files changed
    server/routes.js        Removed 5-line unsubscribe validation block
    client/src/components/campaign/CampaignConfirmation.jsx
                            Added validationErrors state; updated onError; structured
                            error panel; Fix Column Mapping button via setStep(2)
