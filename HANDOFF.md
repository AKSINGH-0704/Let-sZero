# RepMail Engineering Handoff

**For:** New engineers joining the RepMail project  
**Verified against:** commit `ecb1331` (2026-06-11)  
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

## Current State (commit `ecb1331`)

**Financial integrity (commit `ecb1331` — FIN-1/FIN-2):**
- `completePayment` race eliminated: `.returning({ id })` on the payment UPDATE gates credit allocation on whether THIS caller transitioned `PENDING → SUCCESS`. Concurrent webhook + /verify callers cannot both allocate credits.
- `allocateCredits` race eliminated: balance check moved into the transaction as a conditional WHERE clause, matching the proven pattern of `deductCreditAtomic`. Concurrent allocations cannot overdraw the parent balance.

**Authentication hardening (commit `a279203` — B-PL-2):**
- `app.set("trust proxy", 1)` added to `server/index.js` before any middleware. loginLimiter (5 req/15 min) now keys on the real client IP from `X-Forwarded-For` rather than Railway's proxy IP.

**Payments (commit `f7f892e`):**
- Razorpay-only checkout: `POST /api/payments/initiate` → frontend modal → `POST /api/payments/razorpay/verify` → webhook `POST /api/webhooks/razorpay`
- `server/razorpayWebhook.js`: HMAC-SHA256 signature verification, `order.paid` → credit fulfillment, `payment.failed` handling, dispute logging; registered before `express.json()` in `server/index.js`

**Campaign execution parity (commit `826aa25` — GAP-1):**
- `executeCampaign` (inline fallback path) now has full parity with `processCampaign` (BullMQ path): `sendPaused` pre-check, `senderHealth` auto-pause, `sendWithRetry` integration, PAUSED terminal-state guard
- `sendWithRetry` exported from `worker.js` and imported by `routes.js`

**Security hardening (commits `71c0241`, `47e0d49`):**
- `mustResetPassword` enforced server-side in `authMiddleware` (routes.js:115); **correct** exempt paths: `/api/auth/me`, `/api/auth/reset-password`, `/api/auth/logout` (B-1 fix: was wrongly `change-password`)
- Global send pause checked pre-loop in both `worker.js` and `routes.js executeCampaign`
- Sender profile gate: `senderName + senderCompany` required before AI template generation (GAP-6)
- Invite accept checks inviter's plan member limit before creating user

**AI system (commit `f69b4ab`):**
- 6 campaign type preambles: `b2b_outreach`, `real_estate`, `recruitment`, `partnership`, `follow_up`, `general`
- 4 tones: professional, friendly, formal, casual
- Sender identity block in generation prompt; `real_estate` suppresses company/title from sign-off
- Model tiering: enterprise/scale/growth → `gpt-4o`; others → `gpt-4o-mini`

---

## Current Priorities (next implementation sprint)

All gaps from the AI & production audit are resolved. The remaining items are from the final production-readiness audit (2026-06-10/11). Ordered by risk.

**1. I-2 — validateTemplate placeholder hard-block** *(REPUTATION RISK)*

`validateTemplate()` only hard-blocks `EMPTY_SUBJECT`/`EMPTY_BODY`. An AI-generated template with an unreplaced `{{firstName}}` literal passes validation and is sent verbatim to SES.

Fix: add `PLACEHOLDER_IN_SUBJECT` and `PLACEHOLDER_IN_BODY` to the hard-block list. Any `{{...}}` pattern surviving into the final template is a hard rejection. File: `server/ai.js` or wherever `validateTemplate` lives.

**2. I-5 — SNS_TOPIC_ARN startup enforcement** *(SECURITY)*

If `SNS_TOPIC_ARN` is not set, the SNS injection check is skipped. Any valid SNS-signed message from any topic can inject bounce/complaint events.

Fix: emit a hard startup error (not just `console.warn`) if `SNS_TOPIC_ARN` is missing in production. File: `server/index.js`.

**3. O-2 — Invite token TTL verification** *(SECURITY)*

Invite tokens may not have a TTL. Old or forgotten invite links could be valid indefinitely.

Fix: verify `invites` table has `expiresAt` column and that the accept handler rejects expired tokens.

**4. I-3 — Mid-loop sendPaused re-check** *(DELIVERABILITY)*

Both send loops check `sendPaused` pre-loop only. A campaign that started before auto-pause triggers (via SNS bounce events mid-run) continues to completion.

Fix: add a `sendPaused` re-check inside the loop every N contacts (similar to existing global-pause mid-loop check).

**5. I-4 — Inline-path isRetry duplicate-send guard** *(CORRECTNESS)*

`executeCampaign` (inline path) does not check if a `campaignEmailRecord` already has `status=SENT` before calling `sendWithRetry`. A crash-restart could re-send to already-sent contacts.

Fix: inside the send loop, skip contacts whose existing `campaignEmails` record shows `status=SENT`.

---

## Resolved Gaps (for reference)

| Gap | Resolution | Commit |
|---|---|---|
| GAP-1: executeCampaign parity | sendPaused + senderHealth + sendWithRetry + PAUSED guard | 826aa25 |
| GAP-2: getPreCampaignSuppressionCount N+1 | inArray batch query | 217bebc |
| GAP-3: getContactById N+1 in send loop | getContactsByIds batch method | e9f8554 |
| GAP-5: Single free-text AI intake | 7-field structured intake | earlier session |
| GAP-6: Sender profile gate | senderName + senderCompany required | 1b89a3f |
| B-1: mustResetPassword exempt path | reset-password (not change-password) | 71c0241 |
| B-PL-2: loginLimiter proxy bypass | trust proxy = 1 | a279203 |
| FIN-1: completePayment double-credit | .returning() gates credit allocation | ecb1331 |
| FIN-2: allocateCredits over-allocation | atomic balance WHERE clause | ecb1331 |

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
