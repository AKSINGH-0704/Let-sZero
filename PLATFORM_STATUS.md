# RepMail — Platform Capability Status

**Last updated:** 2026-06-27  
**Version:** v1.0  
**Audience:** Engineering, product, sales, technical due diligence

This document shows the current maturity of every major platform subsystem. It is a snapshot — it does not describe what is coming next (see `SENDER_DOMAIN_PHASE2_SCOPE.md` and the next milestone recommendation below).

---

## Maturity Definitions

| Level | Meaning |
|-------|---------|
| **Production Ready** | Feature is fully implemented, independently audited, and safe for external customers. No known gaps that would cause failure or incorrect behaviour under normal use. |
| **Beta** | Feature works end-to-end but has known rough edges, limited coverage, or requires operator supervision for edge cases. Suitable for limited external use. |
| **Partial** | Core capability exists but meaningful sub-features are missing. Usable but not complete. |
| **Planned** | Designed or scoped but not yet implemented. |

---

## Capability Matrix

### Authentication & Identity

| Capability | Status | Notes |
|------------|--------|-------|
| Email + password login | **Production Ready** | bcrypt hashing; session-based auth with SHA-256 token storage; `httpOnly` + `secure` + `sameSite=lax` cookies; 24h TTL |
| Google OAuth login | **Production Ready** | passport-google-oauth20; account linking by email; `?welcome=1` new-user flow |
| Self-service password reset | **Production Ready** | SHA-256 hashed token; 1h TTL; single-use; per-email 15-min resend throttle; all sessions invalidated on reset |
| Admin-forced password change | **Production Ready** | `mustResetPassword` flag enforced in `authMiddleware`; cleared on reset |
| Session management | **Production Ready** | Session invalidation on password change; `deleteUserSessions` callable from admin |
| Rate limiting | **Production Ready** | Per-IP rate limits on login, forgot-password, reset-by-token; API-wide 200 req/15min |
| Multi-factor authentication | **Planned** | — |
| SSO / SAML | **Planned** | — |

---

### Team Management

| Capability | Status | Notes |
|------------|--------|-------|
| Three-tier hierarchy (ROOT_ADMIN → SUB_ADMIN → USER) | **Production Ready** | `USER_ROLES` enforced throughout; `authMiddleware` gates on `req.isRootAdmin` |
| Team member invitation | **Production Ready** | Token-based invite; 7-day TTL; single-use; role assigned at accept |
| Plan-based team limits | **Production Ready** | Starter: 3 members; Growth: 10; Scale: 25; Enterprise: custom |
| Role-based access control (3 tiers) | **Production Ready** | ROOT_ADMIN can manage all; SUB_ADMIN manages users; USER sees own data |
| Fine-grained permissions | **Planned** | Custom role builder; per-feature permission toggles |
| Team audit log | **Production Ready** | Invitation events, team-member actions logged |

---

### Campaign Engine

| Capability | Status | Notes |
|------------|--------|-------|
| Manual contact upload + send | **Production Ready** | CSV or paste; per-email validation; suppression check; duplicate detection within upload |
| Campaign from contact library | **Production Ready** | Snapshots list at creation; history is durable even if list is later edited |
| Campaign scheduling | **Production Ready** | Schedule for future date/time; 30s polling picks up due campaigns |
| Campaign cancellation | **Production Ready** | User-initiated; credits not charged for undelivered emails; correct terminal state |
| Campaign duplication | **Production Ready** | Pre-fills wizard with original template + list + name; zero backend changes |
| Sender profile enforcement | **Production Ready** | `senderName` required at API level (not only frontend); profile fields injected as template placeholders |
| Custom sending domain per campaign | **Production Ready** | Starter+ only; VERIFIED domains only; `senderEmailSnapshot` preserved in history |
| Mid-loop pause / cancel | **Production Ready** | Checked every 50 contacts: cancellation, global pause, user-level pause, domain health |
| Campaign checkpoint saves | **Production Ready** | Progress written every 25 emails; server restart recovers partial campaigns |
| Orphaned campaign recovery | **Production Ready** | PENDING/RUNNING campaigns from previous process detected and marked FAILED at startup |
| Drip / multi-step sequences | **Planned** | — |
| A/B testing | **Planned** | — |
| Campaign approval workflows | **Planned** | — |

---

### Template Engine

| Capability | Status | Notes |
|------------|--------|-------|
| Plain-text template authoring | **Production Ready** | Textarea-based; no rich editor (by design — plain text performs better in deliverability) |
| Template placeholders | **Production Ready** | `{{name}}`, `{{email}}`, `{{company}}`, `{{category}}`, `{{sender_name}}`, `{{sender_title}}`, `{{sender_company}}`, `{{sender_phone}}` |
| Unknown placeholder hard-block | **Production Ready** | Unrecognised `{{...}}` tags caught at generation and at send — broken emails cannot be delivered |
| HTML rendering | **Production Ready** | Newlines → `<p>` tags; sanitised via `sanitize-html` with allowlist; plain-text fallback included |
| Template library / saved templates | **Partial** | Templates saved as campaign snapshots; no standalone template library page yet |
| Rich-text / WYSIWYG editor | **Planned** | — |
| Multi-language templates | **Planned** | — |

---

### AI Features

| Capability | Status | Notes |
|------------|--------|-------|
| Template generation (GPT-4o-mini / GPT-4o) | **Production Ready** | Plan-tiered: Free/Starter/Growth → GPT-4o-mini; Scale/Enterprise → GPT-4o |
| Daily AI usage limits | **Production Ready** | Per-plan daily generation limits enforced; reset at midnight UTC |
| Spam analysis | **Production Ready** | Trigger words, subject length, link density, personalisation score — included with every generation |
| Post-generation validation + repair | **Production Ready** | AI output checked for placeholder correctness; invalid placeholders repaired or flagged |
| AI-powered segmentation | **Planned** | — |
| AI personalisation at scale | **Planned** | Per-contact body variation beyond placeholder substitution |

---

### Contact Library

| Capability | Status | Notes |
|------------|--------|-------|
| Named contact lists | **Production Ready** | Create, rename, delete lists independently of campaigns |
| CSV import | **Production Ready** | Name, email, company, category fields; duplicate detection within upload |
| CSV export | **Production Ready** | Export any list to CSV |
| Contact editing | **Production Ready** | Edit individual contact fields (name, company, category) |
| Save-to-library during campaign | **Production Ready** | Upload during campaign creation optionally saved to a named library list |
| Suppression list | **Production Ready** | Bounces and complaints automatically suppressed; manual removal supported |
| Cross-list deduplication | **Planned** | Suppression is per-user but contact deduplication is per-list |
| Rule-based dynamic segments | **Planned** | — |
| Behavioral segments (opens, clicks) | **Planned** | Depends on analytics tracking (also Planned) |
| CRM integration | **Planned** | — |

---

### Deliverability

| Capability | Status | Notes |
|------------|--------|-------|
| AWS SES SMTP delivery | **Production Ready** | Dedicated SMTP credentials; `sendWithRetry` with 3 attempts + exponential backoff |
| Bounce handling (SNS) | **Production Ready** | Hard and soft bounces auto-suppressed; SNS topic ARN validated fail-closed at startup |
| Complaint handling (SNS) | **Production Ready** | FBL complaints auto-suppressed; sender health auto-pause on threshold breach |
| Unsubscribe handling | **Production Ready** | One-click unsubscribe endpoint; `List-Unsubscribe` + `List-Unsubscribe-Post` RFC headers |
| DKIM signing (platform domain) | **Production Ready** | SES Easy DKIM for platform sending address |
| DKIM signing (custom domain) | **Production Ready** | SES Easy DKIM for user-owned domains; 3 CNAME records managed by SES |
| SPF | **Production Ready** | SES default SPF for platform; user must add SES SPF record for custom domains (guidance provided) |
| DMARC | **Production Ready** | Platform domain DMARC configured; custom domain DMARC is user's responsibility (guidance provided) |
| Feedback-ID header | **Production Ready** | `Feedback-ID: campaignId:userId:repmail` per Google FBL spec |
| Auto-pause on bounce/complaint breach | **Production Ready** | Bounce ≥ 8% or complaint ≥ 0.05% → sender paused; fires before SES suspension threshold |
| Rate limiting on sends | **Production Ready** | Configurable `SEND_RATE_MS` delay between emails; throttle detection with backoff |
| N+1 contact query elimination | **Production Ready** | Batch load via `getContactsByIds`; per-email suppression check remains live |
| Warm-up scheduling | **Planned** | — |
| Inbox placement testing | **Planned** | — |
| Open tracking (pixel) | **Planned** | — |
| Click tracking (link wrapping) | **Planned** | — |
| Engagement-based suppression | **Planned** | Depends on analytics tracking |

---

### Custom Domains

| Capability | Status | Notes |
|------------|--------|-------|
| Domain registration (Starter+) | **Production Ready** | Plan gate; normalization (lowercase, punycode, IP rejection, reserved TLD rejection) |
| AWS Easy DKIM (automated) | **Production Ready** | SES manages key pairs; customer adds 3 CNAME records |
| Ownership proof TXT record | **Production Ready** | `_repmail-verify.{domain}` = `repmail-verify={userId}` |
| Verification polling (10-min) | **Production Ready** | `domainPollRunning` guard prevents overlap; 30s startup delay |
| Manual verification check | **Production Ready** | "Check Now" triggers immediate SES check |
| 14-day verification window | **Production Ready** | Domain auto-fails after 14 days if DNS not added; configurable via env var |
| Cross-user domain conflict protection | **Production Ready** | One domain per platform-wide; DOMAIN_CONFLICT error on conflict |
| Domain suspension (admin) | **Production Ready** | Admin can suspend any domain; customer notified by email |
| Campaign integration | **Production Ready** | `senderEmailSnapshot` captured at creation; `ON DELETE SET NULL` on FK |
| Domain removal | **Production Ready** | DB-first; SES identity deletion best-effort |
| SES identity deleted externally | **Production Ready** | Poll detects `NotFoundException` → immediately marks FAILED |
| Per-domain health monitoring (auto-suspend) | **Planned** | `sentCount/bouncedCount/complainedCount` columns exist; auto-suspension logic not yet wired |
| Multiple custom domains per account | **Production Ready** | No per-user limit (rate limit planned post-launch if abused) |
| Subdomain sending | **Production Ready** | `normalizeDomain` accepts subdomains; DKIM generated per-identity |

---

### Billing

| Capability | Status | Notes |
|------------|--------|-------|
| Credit-based billing | **Production Ready** | 1 credit = 1 email; per-email atomic deduction with overdraft protection |
| Razorpay INR payments | **Production Ready** | Full checkout flow; webhook verification; HTML receipt email |
| Free plan (500 credits/month) | **Production Ready** | Rolling 30-day window; aligned with deduction logic |
| Credits never expire | **Production Ready** | Purchased credits do not expire; free-plan credits reset on 30-day window |
| Plan upgrades (Starter/Growth/Scale/Enterprise) | **Production Ready** | Credit allocation on payment; plan stored on user record |
| Team allocation (plan-bundled) | **Production Ready** | Starter 3 / Growth 10 / Scale 25 / Enterprise custom; no separate per-seat billing |
| Developer Test plan | **Production Ready** | Internal plan; visible only to ROOT_ADMIN and SUB_ADMIN; hidden from public pricing |
| Payment history | **Production Ready** | Per-user payment history visible in dashboard |
| Invoice generation | **Planned** | — |
| Multi-currency (USD, EUR, GBP) | **Planned** | — |
| Subscription billing | **Planned** | Currently credit-purchase model only |
| Refund workflow | **Planned** | Manual currently; self-service planned |
| Account deletion | **Partial** | mailto to support team; self-service deletion with cascading data cleanup planned |

---

### Analytics & Reporting

| Capability | Status | Notes |
|------------|--------|-------|
| Campaign results (sent/failed/skipped) | **Production Ready** | Per-campaign counters; credits used; reach rate in History |
| Bounce rate dashboard | **Production Ready** | Sender-level bounce/complaint rates; warning/critical thresholds derived from enforcement config |
| Complaint rate dashboard | **Production Ready** | Same as above |
| Per-contact send status | **Production Ready** | Campaign detail shows per-contact status (SENT, FAILED, SUPPRESSED, SKIPPED) with reason |
| Top bouncing senders (admin view) | **Production Ready** | Admin health dashboard; threshold aligned to auto-pause constant |
| Open rate tracking | **Planned** | Tracking pixel required; Apple MPP privacy implications documented |
| Click-through rate tracking | **Planned** | Link wrapping required |
| Historical trend charts | **Planned** | — |
| Domain-level health analytics | **Planned** | Schema columns exist; auto-suspension + dashboard planned for M10 |
| Exportable reports | **Planned** | — |

---

### Security & Compliance

| Capability | Status | Notes |
|------------|--------|-------|
| HTTP security headers (Helmet) | **Production Ready** | X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy |
| SQL injection protection (Drizzle ORM) | **Production Ready** | Upgraded to ^0.45.2; parameterised queries; identifier-injection fix applied |
| Email header injection protection | **Production Ready** | `sanitizeHeaderValue` strips `\r\n` from all header fields |
| XSS protection | **Production Ready** | `sanitize-html` with allowlist on all email HTML; `express-validator` on API inputs |
| Rate limiting | **Production Ready** | Per-IP on all auth endpoints; global 200 req/15min |
| Session security | **Production Ready** | SHA-256 token storage; `httpOnly`; `secure` in production; `sameSite=lax` |
| PII filtering in error reports | **Production Ready** | Sentry `beforeSend` strips body, cookies, auth headers, IP, email, username |
| SNS signature verification | **Production Ready** | `x-amz-sns-message-type` header validation; topic ARN validation fail-closed |
| Audit trail | **Production Ready** | 90+ distinct `AUDIT_ACTIONS` constants; append-only log |
| GDPR / data deletion | **Partial** | Manual deletion via support; self-service with cascading cleanup planned |
| Data retention policy | **Planned** | — |
| SOC 2 readiness | **Planned** | — |

---

### Infrastructure & Operations

| Capability | Status | Notes |
|------------|--------|-------|
| PostgreSQL (Drizzle ORM) | **Production Ready** | Railway-hosted; schema managed via `drizzle-kit push` |
| BullMQ queue (Redis/IORedis) | **Production Ready** | Campaign jobs queued for worker; inline fallback when Redis unavailable |
| AWS SES (SMTP + SNS) | **Production Ready** | SMTP for delivery; SNS for bounce/complaint events |
| Sentry error monitoring | **Production Ready** | Enabled when `SENTRY_DSN` set; `expressIntegration` + error handler |
| Startup schema validation | **Production Ready** | Required tables, columns, indexes checked on every start; fail-closed |
| Environment variable validation | **Production Ready** | Missing critical env vars logged at startup; server behaviour documented for each |
| In-memory development mode | **Production Ready** | Full API surface with no external dependencies; mirrors all storage.js interfaces |
| Horizontal scaling | **Partial** | Single worker process; BullMQ queue supports multi-worker but not configured |
| Background job monitoring | **Planned** | BullMQ dashboard or Grafana integration planned |
| Automated database backups | **Production Ready** | Railway-managed Postgres backups |

---

## Capability Summary

| Subsystem | Overall Status | Readiness |
|-----------|---------------|-----------|
| Authentication & Identity | **Production Ready** | 8/9 capabilities complete |
| Team Management | **Production Ready** | Core complete; fine-grained permissions deferred |
| Campaign Engine | **Production Ready** | Core complete; sequences deferred |
| Template Engine | **Production Ready** | Core complete; standalone library deferred |
| AI Features | **Production Ready** | Core complete; advanced personalisation deferred |
| Contact Library | **Production Ready** | Core complete; dynamic segments deferred |
| Deliverability | **Production Ready** | Core complete; open/click tracking deferred |
| Custom Domains | **Production Ready** | Core complete; auto-suspension analytics deferred |
| Billing | **Partial** | Credit purchase complete; subscriptions/invoices deferred |
| Analytics & Reporting | **Partial** | Delivery metrics complete; engagement tracking not started |
| Security & Compliance | **Partial** | Hardening complete; GDPR/SOC 2 formalisation deferred |
| Infrastructure & Operations | **Partial** | Single-process; multi-worker and monitoring deferred |

---

## Planned Capability Roadmap (Recommended Sequence)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| P0 | Email analytics (open + click tracking) | Largest customer value gap — senders cannot measure engagement |
| P0 | Domain health auto-suspension | Schema exists; wiring required to close the deliverability loop on M9 |
| P1 | Standalone template library | Common request; enables template reuse without campaign creation |
| P1 | Automated drip sequences | Multi-step follow-up is the next product tier above single-blast campaigns |
| P2 | Dynamic contact segments | Rule-based filtering without CSV re-upload |
| P2 | Self-service account deletion | Compliance requirement; currently manual |
| P3 | Multi-currency billing | Required for international expansion |
| P3 | SOC 2 readiness | Required for enterprise deals |
