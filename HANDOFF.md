# RepMail Engineering Handoff

**For:** New engineers joining the RepMail project  
**Verified against:** commit `47e0d49` (2026-06-09)  
**Detailed reference:** `REPMAIL_ENGINEERING_HANDOFF.md` — full schema, security design, SNS, queue worker, cleanup jobs, AI governance

---

## What RepMail Is

RepMail is a B2B email campaign platform for sales teams. Administrators create user accounts, allocate sending credits, and users send direct-outreach campaigns to imported contact lists. It is not a newsletter tool. Key characteristics: per-email credit billing, BullMQ async queue with inline fallback when Redis is unavailable, full SES delivery telemetry (bounce/complaint/open/click), and a three-tier org hierarchy (ROOT_ADMIN → SUB_ADMIN → USER).

---

## Local Setup

```bash
git clone https://github.com/AKSINGH-0704/Let-sZero.git
cd Let-sZero
npm install
npm run dev
```

No database, Redis, or AWS credentials needed. An in-memory storage shim handles everything locally. A `ROOT_ADMIN` account is created automatically on first boot. Server starts at `http://localhost:5000`.

---

## Production Stack

| Layer | Technology |
|:------|:-----------|
| Runtime | Node.js ESM + Express 4 |
| Database | PostgreSQL via Drizzle ORM (`DATABASE_URL`) |
| Queue | BullMQ 5.x over IORedis (`REDIS_URL`) |
| Email delivery | Nodemailer → AWS SES SMTP (NOT AWS SDK) |
| Delivery events | AWS SNS → `POST /api/webhooks/ses` |
| AI features | OpenAI GPT-4o / GPT-4o-mini (plan-tiered) |
| Payments | **Razorpay only** (INR). Stripe is fully removed. |
| Deployment | Railway — single Node.js process + PostgreSQL + Redis services |

---

## Current State (commit `47e0d49`)

**Payments (commit `f7f892e`):**
- Razorpay-only checkout: `POST /api/payments/razorpay/initiate` → frontend modal → `POST /api/payments/razorpay/verify` → webhook `POST /api/webhooks/razorpay`
- Double-credit guard: `completePayment` returns early on `status === SUCCESS` + `WHERE status != 'SUCCESS'` in UPDATE
- `server/razorpayWebhook.js` handles HMAC-SHA256 signature verification; registered before `express.json()` in `server/index.js`

**Security hardening (commit `47e0d49`):**
- `mustResetPassword` enforced server-side in `authMiddleware` (routes.js:115); exempt paths: `/api/auth/me`, `/api/auth/change-password`, `/api/auth/logout`
- Global send pause checked pre-loop and every 50 contacts in both `worker.js` and `routes.js executeCampaign`
- Invite accept checks inviter's plan member limit before creating user (routes.js:1780–1788)
- Password minimum: 8 chars (routes.js:1761)
- `sesTracking` field added to `/api/health` (routes.js:498)

**AI system (commit `f69b4ab`):**
- 6 campaign type preambles: `b2b_outreach`, `real_estate`, `recruitment`, `partnership`, `follow_up`, `general`
- 4 tones: professional, friendly, formal, casual
- Sender identity block in generation prompt; `real_estate` suppresses company/title from sign-off
- Model tiering: enterprise/scale/growth → `gpt-4o`; others → `gpt-4o-mini`

---

## Current Priorities (Week 1 — before next feature work)

These are confirmed gaps from the AI & production audit. Ordered by product impact.

**1. GAP 4 — No server-side AI generation validation** *(HIGHEST PRODUCT VALUE)*

`server/ai.js generateTemplate()` only checks `if (!parsed.subject || !parsed.body)`. No validation for subject length, unclosed `{{placeholders}}`, bracket artifacts `[Name]`, or campaign-type rule violations.

Fix: add post-generation validation step in `server/ai.js` before returning the template.

**2. GAP 2 — `getPreCampaignSuppressionCount` N+1 query** *(SCALE BLOCKER)*

`storage.js:1334–1340` runs one `SELECT` per contact email in a loop. Collapses at scale (10k contacts = 10k queries).

Fix: replace with single `WHERE email IN (...)` using Drizzle's `inArray`. Mirror in `server/memoryStorage.js`.

**3. GAP 1 — Inline executor missing sender health checks** *(DELIVERABILITY PARITY)*

`routes.js executeCampaign` runs when Redis is unavailable (fallback path). It has global pause checks but is missing:
- `owner.sendPaused` real-time check inside the send loop
- `getUserSenderHealth` auto-pause (15% bounce / 0.5% complaint rate)

Fix: mirror `worker.js:231–269` logic into `executeCampaign`. File: `server/routes.js`.

---

## Known Gaps (Week 2–3)

- **GAP 3:** Per-contact `getContactById` N+1 in send loop (both `worker.js` and `routes.js`). Fix requires a `getContactsByIds(ids)` batch method — **does NOT exist in `storage.js` yet**.
- **GAP 5:** Single free-text prompt only. No structured intake (recipient description, value prop, objective, relevance). Week 3 work.
- **GAP 6:** Sender profile gate missing at campaign creation — blank profiles silently emit `{{sender_name}}` literals in generated emails. Week 3 work.

---

## Explicit Non-Goals

Architectural decisions made deliberately. Do not implement without team discussion.

| Non-Goal | Reason |
|:---------|:-------|
| Per-contact OpenAI generation | 1 API call per recipient = unacceptable cost at scale |
| One AI call per email send | Same as above |
| Re-introducing Stripe | Razorpay is the only payment gateway |
| Breaking database migrations | Schema changes must be backward-compatible; use `drizzle-kit push` |
| Materially increasing OpenAI spend | All AI must be single-call per user action |
| Per-contact personalization via AI | Single template generation per campaign, period |

---

## Key Files

| File | Purpose |
|:-----|:--------|
| `server/index.js` | Entry point, startup recovery, worker init, cleanup job registration |
| `server/routes.js` | All API routes + `executeCampaign()` inline fallback |
| `server/worker.js` | BullMQ campaign worker (`processCampaign`) |
| `server/storage.js` | PostgreSQL storage layer (production) |
| `server/memoryStorage.js` | In-memory dev shim (must mirror `storage.js` interface) |
| `server/ai.js` | OpenAI integration (generateTemplate, generatePreviews, analyzeSpam) |
| `server/email.js` | Nodemailer transport, `sendCampaignEmail`, unsubscribe footer |
| `server/sns.js` | SNS signature verification + event dispatcher |
| `server/razorpayWebhook.js` | Razorpay HMAC-SHA256 webhook handler |
| `server/gateways.js` | Payment gateway abstraction (Razorpay only) |
| `shared/schema.js` | Drizzle tables + Zod schemas + all constants (plan limits, AI quotas, credit tiers) |

---

## Production Environment Variables

| Variable | Required | Description |
|:---------|:--------:|:------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `SES_SMTP_HOST` / `SES_SMTP_USER` / `SES_SMTP_PASS` | Yes | AWS SES SMTP credentials |
| `SES_FROM_EMAIL` / `SES_FROM_NAME` | Yes | Sender identity |
| `SES_CONFIGURATION_SET` | Yes | AWS config set name (enables open/click tracking) |
| `SNS_TOPIC_ARN` | Yes | Restricts webhooks to known SNS topic |
| `OPENAI_API_KEY` | Yes | GPT-4 access |
| `SESSION_SECRET` | Yes | Express session signing key |
| `APP_URL` | Yes | Production URL (used in unsubscribe footer links) |
| `REPMAIL_PUBLIC` | Yes | Must be `"true"` to enable full API in production |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Yes | Razorpay credentials |
| `RAZORPAY_WEBHOOK_SECRET` | Yes | Razorpay webhook HMAC secret |
| `RECOVERY_EMAIL` | Yes | Emergency recovery contact |
| `SES_RATE_PER_SECOND` | No | Default `14` — must match SES account limit |
| `SES_SEND_RATE_MS` | No | Fallback sleep when Redis is unavailable |
| `BOUNCE_RATE_PAUSE_THRESHOLD` | No | Default `0.15` |
| `COMPLAINT_RATE_PAUSE_THRESHOLD` | No | Default `0.005` |
| `AUDIT_LOG_RETENTION_DAYS` | No | Default `180` |
| `CAMPAIGN_EMAIL_RETENTION_DAYS` | No | Default `90` |

---

## Commands

```bash
npm run dev        # Development with HMR + in-memory storage
npm run build      # Production build: Vite → dist/public/ + esbuild → dist/index.cjs
npm run start      # Production server
npm run db:push    # Push Drizzle schema to PostgreSQL (Railway Postgres URL required)
npm run check      # TypeScript type check
```

---

## Related Documents

| Document | Purpose |
|:---------|:--------|
| [REPMAIL_ENGINEERING_HANDOFF.md](./REPMAIL_ENGINEERING_HANDOFF.md) | Deep technical reference — complete schema, SNS design, queue worker sequence, AI governance, security rules, cleanup jobs |
| [PROGRESS.md](./PROGRESS.md) | Launch readiness tracker — milestone status (D/I/O/V evidence), launch blockers, verification log |
| [AUDIT_TRAIL.md](./AUDIT_TRAIL.md) | Append-only audit log — all code reviews, security audits, documentation sync sessions with findings |
| [README.md](./README.md) | Architecture overview, system design, engineering principles |

## Detailed Reference

See `REPMAIL_ENGINEERING_HANDOFF.md` for:
- Complete database schema (all tables, columns, indexes)
- SNS signature verification + 4-step idempotency design
- Queue worker execution sequence (step-by-step)
- Startup recovery logic
- Cleanup job architecture and overlap prevention
- AI quota governance and cost model
- Security hardening decisions and fail-open/closed table
- Known gaps and proposed implementations
