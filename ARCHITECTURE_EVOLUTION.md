# RepMail — Architecture Evolution

**Document type:** Executive architectural overview
**Audience:** Clients, future engineers, AI reviewers, technical due diligence, onboarding
**Purpose:** Describes how the RepMail platform architecture has evolved and where it is headed. Does not duplicate milestone history, audit logs, or implementation details. For implementation specifics see `REPMAIL_ENGINEERING_HANDOFF.md`. For milestone history see `ENGINEERING_MILESTONES.md`.

---

## Platform Evolution Timeline

RepMail was built in six architectural eras. Each era either introduced a new capability layer or extracted and hardened an existing one. The boundaries between eras are not arbitrary — each represents a deliberate inflection point where the architecture was evaluated and either extended or refactored before the next capability was built on top of it.

---

### Era 1 — Foundation

**The core platform structure was established before any milestones began.**

Three decisions made in Era 1 have proven stable through all subsequent development:

**1. Storage interface abstraction.** Every storage operation routes through a single interface (`storage.js`) that dispatches to either a PostgreSQL implementation or an in-memory shim (`memoryStorage.js`) depending on whether a database is present. This means the entire platform runs locally with zero infrastructure — no database, no Redis, no AWS credentials. The two implementations must remain in perfect parity; any new storage method added to one must be immediately added to the other.

**2. Per-email credit billing with atomic deduction.** Credits are deducted one at a time, inside a transaction, with the balance check expressed as a `WHERE` clause rather than a pre-read + conditional write. This prevents the double-deduction race condition without requiring application-level locking. The same atomic pattern has been applied to every credit operation added since.

**3. Three-tier organizational hierarchy.** ROOT_ADMIN → SUB_ADMIN → USER. Credit allocation, team management, AI quota inheritance, and admin visibility all propagate through this hierarchy. Every feature that touches permissions or entitlements reads through the hierarchy; none of them hardcode role assumptions.

---

### Era 2 — Delivery Pipeline

**The email delivery infrastructure was established as a distinct layer, separate from campaign execution logic.**

RepMail uses AWS SES via SMTP (not the AWS SDK). This is a deliberate choice: the SMTP interface is stable, portable, and does not require the AWS SDK dependency. Delivery events (bounces, complaints, opens, clicks, unsubscribes) arrive via AWS SNS webhooks — a separate inbound channel completely independent of the outbound SMTP path.

The suppression engine emerged from this era. Suppressions are per-user, keyed on email address, with four source types: `bounce`, `complaint`, `unsubscribe`, `manual`. The suppression check happens before every email send — not after. A suppressed address is never sent to; it is never a question of what to do after delivery.

Two compliance headers were added to every campaign email during this era: `List-Unsubscribe` (RFC 2369) and `List-Unsubscribe-Post` (RFC 8058). These are not optional. Gmail uses both to surface one-click unsubscribe buttons, which directly affect inbox placement. The unsubscribe footer link and the `List-Unsubscribe` header share a single token — there is no token duplication.

The AI template generation capability was also introduced during this era. AI is gated at two levels: a plan-tiered daily quota and a per-minute rate limiter. AI generation is always one call per user action, never one call per recipient. This constraint is architectural and permanent.

---

### Era 3 — Campaign Reliability (Milestones 1, 3A, 3B)

**The campaign lifecycle was formalized as an explicit state machine.**

Before Era 3, campaigns moved through informal states with no centralized state transition enforcement. Era 3 introduced:

**A formal terminal-state model.** `COMPLETED`, `FAILED`, and `CANCELLED` are terminal. A campaign in a terminal state cannot be re-entered. Every state transition is guarded by an atomic `WHERE status = 'RUNNING'` condition on the UPDATE statement — no optimistic read-then-write. This eliminates a class of race conditions where concurrent retries could overwrite a terminal state.

**`CANCELLED` as a first-class terminal state.** Before M3A, campaigns could only be COMPLETED or FAILED. The CANCELLED state is distinct from both: it is user-initiated, records how many contacts were reached before cancellation, and is never confused with an execution failure.

**Checkpoint batching.** The send loop writes progress to the database every 25 emails, not every email. This reduces write amplification by 96% at 14 emails/second without perceptible UI lag. On all exit paths (cancel, pause, failure, completion), a forced checkpoint writes the final counts.

**Credit pre-flight alignment.** The credit availability check before campaign start uses the same rolling-window SQL expression (`COALESCE(free_credits_reset_at, created_at) + INTERVAL '1 month'`) as the per-email deduction. Previously the pre-flight check used a calendar-month boundary while the deduction used a rolling window — meaning the pre-flight could pass at a calendar month boundary when the deduction would then fail.

---

### Era 4 — Architecture Extraction (Milestone 4)

**Structural duplication in the campaign execution layer was eliminated.**

Before Milestone 4, the platform had two ~400-line campaign execution functions that were conceptually identical but structurally separate:
- `processCampaign()` in `worker.js` — the BullMQ job handler
- `executeCampaign()` in `routes.js` — the inline fallback when Redis is unavailable

Every bug fix required two identical changes. Every new campaign feature required two identical implementations. Milestone 4 extracted the shared logic into two new modules:

**`campaignConfig.js`** — Single source of truth for all campaign runtime constants: send rate, bounce/complaint thresholds, checkpoint interval, pause-check interval. Both execution paths import from this module. Configuration drift between paths is now structurally impossible.

**`campaignLoop.js`** — The shared execution loop. Both paths call `runCampaignLoop(campaignId, userId, options)`. Path-specific setup (BullMQ job progress reporting, log tags) is passed via options; no path-specific logic lives inside the loop. The BullMQ path and the inline fallback path now produce byte-for-byte identical behavior.

The dual execution path itself is a deliberate permanent feature. When Redis is unavailable, campaigns fall back to inline execution rather than failing entirely. This provides degraded-but-functional behavior in infrastructure failure scenarios. The trade-off — inline campaigns cannot survive a SIGTERM — is documented and understood.

---

### Era 5 — Production Safety (Milestones 2, 5)

**The platform was hardened against the class of failures that are silent in development but fatal in production.**

Three categories of hardening were applied:

**Startup validation.** A missing critical environment variable (e.g., `SNS_TOPIC_ARN`) no longer results in a running server that silently drops delivery events. `validateProductionConfig()` runs at startup and calls `process.exit(1)` in production mode if any required variable is absent. Numeric environment variables (thresholds, rate limits) are validated for sanity before any usage. The server either starts correctly or exits with an actionable error message.

**Schema integrity check.** At startup, `runSchemaCheck()` queries the production database and verifies that all expected columns exist. If the deployed schema does not match what the code expects, the server exits. This prevents the class of production errors where a database migration was missed during deployment.

**Header injection defense.** `sanitizeHeaderValue()` strips CR and LF characters from all four custom email headers before they are passed to nodemailer. This defends against CRLF injection via a known nodemailer vulnerability (≤ 9.0.0 CVE). The function is applied at the email construction layer, not the route layer — it cannot be bypassed by a new route that adds a custom header.

---

### Era 6 — Contact Library (Milestone 6)

**First-class contact management was introduced as a distinct product layer, independent of campaign execution.**

Before Era 6, contacts existed only within campaigns. There was no concept of a reusable contact list — every campaign required a fresh CSV upload.

Era 6 introduced three new tables and a contact management surface that exists independently of campaigns:

**Global contacts with M-N list membership.** A contact belongs to a user, not a list. Lists are named collections of contact references. The `(userId, email)` unique constraint prevents contact duplication at the identity level. A contact can belong to zero, one, or many lists simultaneously.

**Campaign-list integration with snapshot durability.** A campaign can be launched from a saved list. At creation time, the system records an immutable snapshot of the list's name and contact count. If the list is later renamed or deleted, the campaign history record remains accurate. This is the same snapshot pattern used for templates, now applied to lists.

**Email immutability as an architectural invariant.** A contact's email address is its identity key. It cannot be changed after creation. This invariant is enforced at three independent layers: the API route rejects any PATCH body containing an `email` field; the storage method does not accept email in the update set; the database unique constraint would reject a conflicting change anyway. Each layer is independent.

---

## Core Architectural Principles

These principles have guided every architectural decision from Era 1 through Era 6. They are not guidelines — they are invariants. Any future change that violates them requires explicit architectural review and a documented justification.

---

### 1. Storage interface parity

The `memoryStorage.js` implementation must mirror every method in the PostgreSQL storage implementation. When a new storage method is added, the in-memory version is added in the same commit. This is not a test convenience — it is what makes local development possible without infrastructure. Letting parity drift means local behavior diverges from production, which is the most common source of bugs that only appear after deployment.

---

### 2. Defense-in-depth ownership

Every storage query that reads or mutates user data includes a `userId` filter in the `WHERE` clause. The route layer checks ownership; the storage layer enforces it independently. A route that verifies ownership but calls a storage method that does not enforce it has single-point-of-failure authorization — a single missing route check exposes the storage layer to cross-user access. The rule is: ownership is enforced everywhere, not trusted from above.

---

### 3. Snapshot durability

Operational references (FKs like `campaigns.list_id`, `campaigns.template_id`) are nullable and may become NULL when the referenced resource is deleted. Immutable historical snapshots (`campaigns.listSnapshot`, `campaigns.templateSnapshot`) carry the meaningful context that must survive deletion. The FK tracks the live relationship; the snapshot preserves the historical record. Both are always written at creation time.

---

### 4. Atomic credit operations

Every credit operation that checks a balance and then conditionally consumes from it expresses the balance check as the `WHERE` clause of the UPDATE statement, not as a pre-read. This is the only correct way to prevent double-deduction or over-allocation under concurrent requests without distributed locking. No credit operation may use an optimistic read-then-conditional-write pattern.

---

### 5. Single execution path per behavior

When two code paths must produce identical behavior, they must share a single implementation. The campaign execution loop (`campaignLoop.js`) is the canonical example: there is one loop, called by two different callers (BullMQ worker, inline fallback). If a bug existed in the loop, both paths would exhibit it and one fix would resolve both. This principle applies to any future behavior that must be consistent across callers.

---

### 6. Fail-closed startup

Missing or invalid critical environment variables in production cause the server to exit. A server that starts with silent misconfigurations is worse than a server that does not start — it produces subtle runtime failures that are difficult to diagnose. The rule is: if the server cannot operate correctly given its current configuration, it must refuse to operate.

---

### 7. Append-only audit trail

The `audit_logs` table grows forever. No audit record is ever updated or deleted. Every user action with business significance is recorded: credit operations, campaign lifecycle changes, list operations, admin actions, suppression changes. The audit log is the ground truth for "what happened." It is not a monitoring tool; it is a ledger.

---

### 8. Schema constants over raw strings

No business logic contains raw string literals for statuses, actions, roles, or event types. Every such string has a named constant in `shared/schema.js` (`AUDIT_ACTIONS`, `CAMPAIGN_STATUS`, `SUPPRESSION_SOURCE`, etc.). This means a typo in an action name is a JavaScript error, not a silent DB write with a misspelled value. All constants are in one file, accessible to both server and shared modules.

---

## Current Platform Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  CLIENT LAYER                                                        │
│                                                                      │
│  React 18 SPA (Vite)                                                 │
│  wouter v3 routing  ·  TanStack Query (server state)                 │
│  shadcn/ui + Tailwind  ·  Framer Motion                              │
│  Pages: Dashboard, Campaign Wizard, History, Contact Library,        │
│         Templates, Suppressions, Payments, Audit, Profile, Admin     │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ HTTPS / JSON REST
┌────────────────────────────▼─────────────────────────────────────────┐
│  API LAYER  (Express 4)                                              │
│                                                                      │
│  routes.js   — all API routes + executeCampaign() inline fallback    │
│  authMiddleware — session cookie auth + mustResetPassword guard      │
│  rateLimiter  — BullMQ rate limiter for SES sends                    │
│  validateEnv  — startup numeric env var validation                   │
└──────────────────┬──────────────────────────┬────────────────────────┘
                   │                          │
       ┌───────────▼──────────┐   ┌───────────▼────────────────────────┐
       │  BUSINESS LOGIC      │   │  QUEUE / WORKER LAYER              │
       │                      │   │                                    │
       │  campaignLoop.js     │   │  BullMQ 5.x (IORedis)              │
       │  campaignConfig.js   │   │  worker.js → runCampaignLoop()     │
       │  ai.js               │   │                                    │
       │  email.js            │   │  Primary execution path:           │
       │  sns.js              │   │  job enqueue → Redis persist →     │
       │  razorpayWebhook.js  │   │  worker pick-up → SIGTERM-safe     │
       │  fulfillPayment.js   │   │                                    │
       │  schemaCheck.js      │   │  Fallback path:                    │
       │  unsubscribe.js      │   │  executeCampaign() in routes.js    │
       └──────────┬───────────┘   │  (no Redis persistence; not        │
                  │               │   SIGTERM-safe)                    │
                  │               └───────────────────────────────────┘
       ┌──────────▼───────────────────────────────────────────────────┐
       │  STORAGE INTERFACE  (storage.js dispatcher)                  │
       │                                                              │
       │  ┌──────────────────────┐    ┌──────────────────────────┐   │
       │  │  dbStorage           │    │  memoryStorage           │   │
       │  │  PostgreSQL          │    │  In-memory Maps          │   │
       │  │  Drizzle ORM         │    │  Dev/test shim           │   │
       │  │  (production)        │    │  (no infrastructure)     │   │
       │  └──────────────────────┘    └──────────────────────────┘   │
       └──────────────────────────────────────────────────────────────┘
                  │
       ┌──────────▼───────────────────────────────────────────────────┐
       │  DATA LAYER                                                  │
       │                                                              │
       │  PostgreSQL (Railway)                                        │
       │  ┌─────────────────┐  ┌─────────────────┐                   │
       │  │ users           │  │ campaigns        │                   │
       │  │ sessions        │  │ campaign_emails  │                   │
       │  │ contacts        │  │ credit_transact. │                   │
       │  │ contact_lists   │  │ suppressions     │                   │
       │  │ contact_list_m. │  │ audit_logs       │                   │
       │  │ contact_imports │  │ ai_usage_logs    │                   │
       │  │ templates       │  │ payments         │                   │
       │  │ invites         │  │ sns_events       │                   │
       │  └─────────────────┘  └─────────────────┘                   │
       └──────────────────────────────────────────────────────────────┘

EXTERNAL DEPENDENCIES

  AWS SES (SMTP)    ← outbound email delivery
  AWS SNS           → inbound delivery events (bounce/complaint/open/click)
  OpenAI            ← AI template generation (GPT-4o / GPT-4o-mini)
  Razorpay          ← payment initiation + webhook confirmation
  Redis (Railway)   ← BullMQ job persistence
```

### Key architectural characteristics

**Two execution paths, one loop.** The BullMQ worker and the inline fallback both call `runCampaignLoop()`. The distinction is persistence: the BullMQ path survives a SIGTERM; the inline path does not. Both produce identical campaign outcomes under normal operation.

**Inbound and outbound delivery are independent channels.** SMTP is outbound (synchronous, request-scoped). SNS is inbound (asynchronous, webhook-delivered). Failure in either does not affect the other. Suppression is updated by the SNS path; the SMTP path only reads suppressions.

**The storage interface is the seam.** The PostgreSQL and in-memory implementations share an identical method signature contract. Any module that calls `storage.someMethod()` does not know or care which implementation is active. This seam is what makes local development, testing, and future database migration all tractable.

---

## Capability Dependency Map

This map shows which capabilities depend on which foundational components. It is useful for understanding the impact of changing a foundational component and for sequencing future capabilities.

```
FOUNDATION
  users table (auth, hierarchy, credits, plan)
  sessions table (cookie auth)
  shared/schema.js constants (status enums, audit actions, plan limits)
  storage interface (dispatch to DB or memory)
  audit_logs (append-only ledger)
        │
        ├── CREDITS SYSTEM (credits_received / allocated / used; deductCreditAtomic)
        │         │
        │         ├── CAMPAIGN EXECUTION (canStartCampaign; per-email deduction)
        │         ├── PAYMENTS (Razorpay → fulfillPayment → allocateCredits)
        │         └── FREE PLAN (monthly rolling grant; lazy reset)
        │
        ├── SENDER PROFILE (senderName, senderCompany, senderTitle, senderPhone)
        │         │
        │         ├── CAMPAIGN EXECUTION (required gate; signature injection)
        │         └── AI GENERATION (sender identity block in prompt)
        │
        ├── DELIVERY PIPELINE (SES SMTP → SNS webhook)
        │         │
        │         ├── SUPPRESSION ENGINE (bounce/complaint/unsubscribe → suppressions)
        │         │         │
        │         │         └── CAMPAIGN EXECUTION (pre-send suppression check)
        │         │
        │         └── DELIVERY ANALYTICS (open/click → campaign_emails)
        │
        ├── CAMPAIGN EXECUTION (campaignLoop.js + campaignConfig.js)
        │         │
        │         ├── HISTORY (campaign_emails, campaign stats)
        │         └── CONTACT LIBRARY (campaigns.list_id + listSnapshot)
        │
        ├── CONTACT LIBRARY (contacts + contact_lists + contact_list_members + contact_imports)
        │         │
        │         ├── CAMPAIGN EXECUTION (listId path; resolveListContactIds)
        │         └── [FUTURE] SEGMENTATION, SEQUENCES, CAMPAIGN RE-RUN
        │
        ├── AI GENERATION (OpenAI; plan quota; spam analysis; template preview)
        │
        └── TEMPLATES (per-campaign snapshot at creation; templateId FK)
```

### Reading the map

A capability listed under another depends on it for correctness. Changing the credits system affects campaign execution, payments, and free plan. Changing the suppression engine affects all future campaigns. The Contact Library sits on top of the credits system, delivery pipeline, and campaign execution — changes to any of these propagate upward.

Future capabilities (Segmentation, Sequences, Campaign Re-Run) sit on top of the Contact Library. They are the next tier of dependencies.

---

## Planned Architectural Evolution

This section describes high-level architectural direction only. It is not a feature roadmap.

---

### Near-term: Contact Library Completion (Milestone 7)

**CSV Export** will be implemented as a streaming response from a single `SELECT` joining `contacts` and `contact_list_members`. No schema change required.

**Campaign Re-Run** will extend the existing campaign creation path to accept a `sourceCampaignId`. The new campaign reads the current live members of the original campaign's list (not the snapshot). The snapshot is history; re-run targets current reality.

**`saveToLibraryAs` confirmation** will change from fire-and-forget to a synchronous operation returning `libraryListId` in the campaign creation response.

---

### Medium-term: Segmentation

The Contact Library currently supports static lists (membership is explicit). Segmentation will extend `contact_lists` with a `filter_criteria JSONB` column. A list with `filter_criteria` is dynamic — its membership is computed at query time from the criteria rather than stored in `contact_list_members`.

The static-list infrastructure (contact_list_members, import pipeline, campaign integration) is unchanged. Dynamic lists are an additive capability that co-exists with static lists. A list is either static (has members in the join table) or dynamic (has filter criteria); it cannot be both.

---

### Medium-term: Async Import

The current synchronous import is correct for files up to ~10,000 rows. At larger scale, a BullMQ job will replace the synchronous HTTP handler. The `contact_imports` table already has the right shape — adding a `status` column and wiring a job type is the only change required. The import result API is unchanged from the client's perspective; the response becomes a job reference rather than an immediate result.

---

### Medium-term: Sequences and Automation

Sequences require new tables FK'd to both `contact_lists` (which contacts to enroll) and `campaigns` (which template/schedule to use at each step). The execution engine extends the existing campaign loop concept — a sequence step is a restricted campaign with deterministic timing.

The Contact Library's M-N architecture is the prerequisite for sequences. A sequence enrolls a list; list membership controls who receives each step. This is why the Contact Library architecture was designed before sequences were scoped.

---

### Long-term: Horizontal Scaling

The current architecture is a single Node.js process per Railway deployment. Cleanup jobs (`inactivity`, `session cleanup`, `campaign recovery`) use process-local boolean flags to prevent overlap. These flags do not work across multiple instances.

When horizontal scaling is needed, process-local flags will be replaced with Redis `SET NX` distributed locks. This is a contained change: the lock acquisition and release wraps the same job logic without restructuring it. No schema change is required. The campaign execution layer (BullMQ) already supports horizontal scaling — only the cleanup jobs require this migration.

---

### Long-term: Customer-Managed Sender Domains

Currently all campaigns send from a shared LetsZero SES identity. Customer-managed sender domains (per-customer DKIM signing, SES identity verification, dedicated sending domain) would allow customers to send from their own domain.

This requires a new `sender_domains` table, per-domain SES identity verification, and DNS record management via an admin surface. The campaign execution layer is unchanged — email construction would read the domain configuration rather than the shared SES identity. The full scope is documented in `SENDER_DOMAIN_PHASE2_SCOPE.md`.

---

## What Has Not Changed

Some things were correct from the beginning and have not required revision through six milestones of development:

- The storage interface dispatch pattern (DB vs. memory)
- The three-tier org hierarchy (ROOT_ADMIN → SUB_ADMIN → USER)
- The atomic credit deduction pattern
- The session-cookie authentication model
- The append-only audit log
- The AWS SES SMTP + SNS architecture (not SDK)
- The AI single-call-per-user-action constraint
- The suppression engine's per-user, email-keyed model

These are the architectural bedrock. They have been extended, hardened, and better documented — but never structurally changed. Their stability is evidence that the original design decisions were sound.
