# RepMail — Sender Domain Phase 2 Engineering Scope

**Document type:** Engineering Scope Document  
**Date:** 2026-06-26  
**Author:** Claude Sonnet 4.6 + AK Singh  
**Status:** Pre-implementation — scope definition only  
**Repository:** AKSINGH-0704/Let-sZero

---

## What This Document Is

This document defines the full engineering scope required to allow RepMail customers to send emails from their **own domain** (e.g., `john@acmecorp.com`) instead of from the shared RepMail platform domain (`*@letszero.in`).

This is not a proposal or a vague feature idea. It is a precise engineering scope document identifying every architectural layer that must be designed, built, tested, and validated. The goal is to demonstrate — accurately — why this is a distinct engineering milestone requiring significant effort.

This document was written after a complete repository audit. Claims about what already exists have been verified against source code. Claims about what is missing have been verified by the absence of that code.

---

## Part 1 — Already Implemented

The following sender-domain related work is already complete in the current codebase. This is not work that needs to be done again.

### ✅ Sender Identity Fields on User Accounts

Each user account in RepMail can store:

| Field | Database Column | Status |
|-------|----------------|--------|
| Sender display name | `users.sender_name` | **Implemented** |
| Sender job title | `users.sender_title` | **Implemented** |
| Sender company name | `users.sender_company` | **Implemented** |

These fields are set by the user in their Profile settings page. They appear in the "From" display name on every outgoing email: `"John Smith" <noreply@letszero.in>`.

**Source:** `shared/schema.js:171–173`, `client/src/pages/Profile.jsx`

### ✅ Sender Identity Gate at Campaign Creation

Before a user can create a campaign, the server verifies that `senderName` is set on their profile. If it is not, the API returns a `400 SENDER_PROFILE_REQUIRED` error. The campaign creation form also shows an amber warning and disables the Send button.

**Source:** `server/routes.js` (POST /api/campaigns handler), `client/src/components/campaign/CampaignConfirmation.jsx`

### ✅ Sender Profile Validation

`validateSenderProfile()` checks for common sender identity mistakes:
- Platform/product names used as sender name (e.g., "RepMail", "Admin")
- Email address in the name field
- All-caps names
- Suspicious titles ("test", "n/a", "admin")

**Source:** `server/ai.js` — `validateSenderProfile()`

### ✅ Single Shared Sending Domain

All emails are sent from the RepMail platform domain `letszero.in` via AWS SES SMTP. The From address is `"<senderName>" <ses-from@letszero.in>`.

**Source:** `server/email.js:107–113`

### ✅ AWS SES Configuration

- SMTP transport via Nodemailer (not AWS SDK)
- Configuration set: `my-first-configuration-set`
- DKIM: Enabled and verified on `letszero.in`
- SPF: Configured for the domain
- DMARC: `p=quarantine; adkim=r; aspf=r` — **verified in production** (Gmail shows `spf=pass dkim=pass dmarc=pass`)
- SES is in production mode (not sandbox)
- Sending rate: 14/second by default, token-bucket enforced

**Source:** `server/email.js`, `HANDOFF.md`, `BASELINE_METRICS.md`

### ✅ Email Delivery Event Pipeline (SNS)

Bounce, complaint, open, click, and delivery events are received from AWS SNS, cryptographically verified, deduplicated, and stored. Automatic suppression fires on bounce and complaint events.

**Source:** `server/sns.js`, `server/routes.js` (POST /api/webhooks/ses)

### ✅ Auto-Pause Based on Bounce/Complaint Rates

If a sender's bounce rate exceeds 8% or complaint rate exceeds 0.05%, sending is automatically paused. This threshold enforcement protects the shared `letszero.in` domain reputation.

**Source:** `server/routes.js:251–252`, `server/worker.js:247–248`

### ✅ Unsubscribe Infrastructure

Every email includes a `List-Unsubscribe` header, a `List-Unsubscribe-Post` header (for Gmail one-click), and a `Feedback-ID` header. Unsubscribe links point to the RepMail API and create suppression records automatically.

**Source:** `server/email.js:127–132`, `server/unsubscribe.js`

---

## Part 2 — Industry Comparison

Before defining what to build, it is essential to understand how mature email platforms handle customer-managed sender domains. This section reviews five leading platforms and identifies best practices.

### Zoho Campaigns

**Approach:** Users configure a "From Domain" by adding a CNAME record to their DNS. Zoho generates a unique DKIM key pair per domain and provides specific DNS record values. The platform verifies DNS records before allowing sending from the domain.

**Strength:** Clear step-by-step UI. Domain verification is mandatory before first send.  
**Weakness:** No automated DNS record injection. Users must manually configure their DNS provider.

### Brevo (formerly Sendinblue)

**Approach:** Domain authentication requires adding DKIM TXT record and a Brevo-specific code TXT record to DNS. Brevo also recommends configuring a custom MAIL FROM subdomain (e.g., `bounce.yourcompany.com`) to achieve SPF alignment.

**Strength:** Detailed guidance per DNS provider (Cloudflare, GoDaddy, Route 53). Verification status shown in the UI. Domain health monitoring post-verification.  
**Weakness:** MAIL FROM setup is optional — customers often skip it and suffer SPF alignment failures.

### Mailchimp

**Approach:** Mailchimp requires connecting to a domain via their "Domains" settings page. They automatically add required CNAME records (for DKIM) to Mailchimp-hosted DNS if possible, otherwise provide the values to add manually. Mandrill (Mailchimp's transactional product) additionally requires DMARC with `p=quarantine` or `p=reject`.

**Strength:** Automated DNS injection for supported providers. Clear visual verification state.  
**Weakness:** DMARC requirement is enforced only for transactional — not campaign — senders.

### Customer.io

**Approach:** Customer.io uses Postmark or SendGrid under the hood for sending. Domain authentication follows the underlying provider's model. Users add 3 DNS records: DKIM (CNAME), SPF (TXT), and tracking subdomain (CNAME). Verification must pass before any sending.

**Strength:** Clear prerequisite checklist. Sending is blocked until DNS is verified.  
**Weakness:** DNS propagation wait times are not communicated clearly.

### Postmark

**Approach:** Postmark requires a verified "Sender Signature" — either an individual email address or a full domain. Domain verification uses DKIM with a DNS CNAME record. Postmark provides specific values and checks propagation automatically every few minutes. A domain is "verified" when both the DKIM CNAME resolves and they can confirm signing works.

**Strength:** Real-time DNS propagation checking. Clear verification status with "Check DNS" button. One of the most transparent implementations in the industry.  
**Weakness:** No SPF guidance specific to their sending infrastructure.

### SendGrid

**Approach:** SendGrid domain authentication adds two CNAME records (DKIM) and optionally a MAIL FROM subdomain. They call this process "Domain Authentication." Once verified, all emails from that domain are automatically signed with the customer's DKIM key. A dedicated IP pool can be assigned to authenticated domains.

**Strength:** Most complete implementation in the industry. Automated DKIM signing at infrastructure level. Dedicated IP support. Detailed per-domain reputation metrics.  
**Weakness:** Complex for non-technical users. Errors in CNAME records are not clearly surfaced.

---

### Best Practice Summary and RepMail Assessment

| Best Practice | Who Does It | RepMail (Phase 1) | RepMail (Phase 2 Target) |
|--------------|------------|------------------|--------------------------|
| Block sending until DNS verified | All | N/A (shared domain) | **Must implement** |
| DKIM per-customer key pair | All | Shared letszero.in DKIM | **Must implement** |
| Clear DNS record values in UI | All | N/A | **Must implement** |
| SPF guidance for custom domain | Most | N/A | **Must implement** |
| DMARC guidance | Mailchimp, Brevo | N/A | **Should implement** |
| Custom MAIL FROM (bounce domain) | Brevo, SendGrid | N/A | **Should implement (P2)** |
| Real-time DNS propagation check | Postmark | N/A | **Should implement** |
| Domain reputation health tracking | SendGrid | Per-sender (not per-domain) | **Should implement** |
| Automated DNS injection | Mailchimp (partial) | N/A | **P3 enhancement** |
| Dedicated IP per domain | SendGrid | Not implemented | **Out of scope (Phase 2)** |

**Assessment:** RepMail's current single-domain approach is appropriate for Phase 1 (platform-managed sending). For customer-managed domains, RepMail needs to implement everything in the "Must implement" column before any customer sends from their own domain. The "Should implement" items are important for deliverability quality but can follow in a Phase 2b release.

---

## Part 3 — Architecture Review and Design

This section defines the target architecture for customer-managed sender domains and documents the independent review findings that informed it.

### What "Customer Domain Sending" Means

Today, every RepMail email has:
```
From: "John Smith" <no-reply@letszero.in>
DKIM-Signature: d=letszero.in
```

After Phase 2, an authenticated customer domain owner would have:
```
From: "John Smith" <john@acmecorp.com>
DKIM-Signature: d=acmecorp.com
```

This is a fundamentally different sending identity. It means:
1. The customer's own domain reputation is at stake (not just RepMail's shared domain)
2. The customer must prove they own the domain before sending
3. RepMail must generate and manage DKIM keys for each customer domain
4. AWS SES must be configured to recognize each customer's domain as a valid sender identity
5. Campaign emails must dynamically route through the correct sending identity based on the campaign's owner

### Architecture Decisions

#### Sending Identity Model

Each sender domain is tied to a **SUB_ADMIN account** (or ROOT_ADMIN). A SUB_ADMIN verifies their domain, and all campaigns from their team use that domain as the sending identity.

- One domain per SUB_ADMIN (Phase 2 scope)
- Multiple domains per account is out of scope for Phase 2 (see P3 roadmap)
- Free-plan users: domain verification requires at least a Starter plan (abuse prevention)

#### Domain Verification Model

RepMail generates a per-domain DKIM key pair at domain registration time. The private key is stored in the RepMail database (encrypted at rest). The public key is provided to the customer as a DNS TXT record value. AWS SES is notified to verify and start signing with this key.

Domain ownership verification uses a separate DNS TXT token — a unique hex string that RepMail generates and asks the customer to add to their DNS. This proves the customer controls the domain before any email is sent.

#### Sending Path Integration

The campaign execution engine (`server/worker.js` and `server/routes.js executeCampaign`) currently reads the sender email from a single environment variable (`SES_FROM_EMAIL`). For customer domains, the email address must be looked up from the sender's domain record and injected per-campaign.

This requires changes to both the BullMQ worker path and the inline fallback path, maintaining the parity that was established in the current architecture.

---

### Independent Architecture Review — Findings

The following gaps and risks were identified during the architecture review. They have been incorporated into the phase plan.

**Gap 1 — DKIM Private Key Storage**  
Private DKIM keys must not be stored in plaintext. They must be encrypted at rest using a server-side encryption key (or AWS KMS). A leaked database backup must not expose all customer private keys.  
*Addressed: Phase 1 database design includes encrypted key column.*

**Gap 2 — DNS Propagation Timing**  
DNS records can take 0–72 hours to propagate globally. If RepMail verifies a domain too early (before propagation completes) or too late (after the customer assumes it is ready), customers will send with unverified domains.  
*Addressed: Phase 2 adds a polling verification loop with a configurable propagation timeout. Sending is blocked until verification is confirmed.*

**Gap 3 — AWS SES Identity Limit**  
AWS SES has limits on the number of verified identities per account (default: 10,000). At scale, RepMail must either use a single SES account per customer domain (complex billing) or request quota increases proactively.  
*Addressed: Documented in operational runbooks. No code change needed for Phase 2 scale.*

**Gap 4 — Bounce Handling with Customer Domains**  
When a customer domain is used as the From address, bounces from AWS SES still arrive at the SNS topic. The bounce must be attributed to the correct campaign and sender — not to the shared `letszero.in` domain.  
*Addressed: The existing SNS event pipeline already uses per-campaign-email tags (`campaign-email-id`) to correlate events. No fundamental change needed — SNS routing stays the same.*

**Gap 5 — SPF Alignment**  
If the customer uses their own domain as the From address but the MAIL FROM (Return-Path) is still `amazonses.com`, SPF alignment fails. DKIM alignment alone can pass DMARC in relaxed mode, but SPF failure is a yellow flag for some mail servers.  
*Addressed: Phase 2 Phase B includes custom MAIL FROM domain setup (`bounce.acmecorp.com`). This is optional but recommended.*

**Gap 6 — Domain Removal During Active Campaign**  
A customer could remove their domain from RepMail (or it could expire/fail verification) while a campaign is running. The campaign must detect this and fail cleanly rather than sending with a broken identity.  
*Addressed: Domain status is checked at campaign start. A domain recheck every 50 emails is recommended (matching the existing sender-pause pattern).*

**Gap 7 — Multi-Tenant Isolation**  
One customer's domain activity (high bounce rate) must not affect another customer's sending reputation or trigger a platform-level pause.  
*Addressed: Auto-pause is already per-sender. With customer domains, auto-pause must additionally isolate at the domain level, not aggregate across all users of a shared platform domain.*

**Gap 8 — Abuse: Domain Squatting**  
A malicious user could attempt to "verify" a domain they do not own by guessing the verification token. The token must be cryptographically random and the verification check must be rate-limited.  
*Addressed: DNS TXT verification token uses 32 bytes of cryptographic random. Verification polling is rate-limited per domain.*

**Gap 9 — Subdomain Permitting**  
Customers may want to send from `sales@acmecorp.com` and also from `support@acmecorp.com`. Phase 2 verifies at the domain level, so both addresses are permitted once the domain is verified. However, if a customer tries to verify `mail.acmecorp.com` when they own `acmecorp.com`, they must add DNS records to `_domainkey.mail.acmecorp.com`, not `_domainkey.acmecorp.com`.  
*Addressed: Domain verification instructions must clearly state which DNS zone to add records to.*

**Gap 10 — Email Address vs. Domain Verification**  
AWS SES supports both email-level verification (verify one specific address) and domain-level verification (verify the entire domain). RepMail must use domain-level verification — email-level would require each sender to verify individually.  
*Addressed: Architecture uses domain-level SES identity via the `VerifyDomainIdentity` API.*

---

## Part 4 — Phase Plan

### Phase 1 — Database and Domain Management Foundation

**Objective:** Create the data model and admin interface for customer domains. No email sending changes yet.

#### Engineering Tasks

**Database Schema**

New table: `sender_domains`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Domain record identifier |
| `user_id` | UUID FK → users | Owning SUB_ADMIN |
| `domain` | TEXT UNIQUE | The customer domain (e.g., `acmecorp.com`) |
| `status` | ENUM | `PENDING_VERIFICATION` / `VERIFIED` / `FAILED` / `SUSPENDED` |
| `verification_token` | TEXT | Random hex token for DNS TXT verification |
| `dkim_private_key_enc` | TEXT | Encrypted private DKIM key (AES-256-GCM) |
| `dkim_public_key` | TEXT | Public DKIM key (for DNS TXT record display) |
| `dkim_selector` | TEXT | DKIM selector (e.g., `repmail`) |
| `ses_identity_arn` | TEXT | AWS SES identity ARN after verification |
| `verified_at` | TIMESTAMP | When verification completed |
| `last_checked_at` | TIMESTAMP | Last DNS propagation check |
| `plan_at_registration` | TEXT | Plan tier when domain was registered |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

**New Server Module:** `server/domainManager.js`

- `registerDomain(userId, domain)` — Generates DKIM key pair, stores encrypted private key, creates `sender_domains` record, initiates AWS SES domain verification
- `getDomainInstructions(domainId)` — Returns DNS records to add (DKIM TXT, ownership TXT, optional MAIL FROM MX/TXT)
- `checkDomainVerification(domainId)` — Polls AWS SES `GetIdentityVerificationAttributes`, polls DNS for ownership TXT
- `removeDomain(domainId)` — Removes from `sender_domains`, calls AWS SES `DeleteIdentity`, archives audit log
- `getDomainStatus(userId)` — Returns current domain record for a user

**Plan Gate**

Free-plan users cannot register a sender domain. Minimum plan: Starter. The server enforces this at `POST /api/domains`.

**Encryption**

DKIM private keys are encrypted using AES-256-GCM with a server-side encryption key (`DOMAIN_KEY_ENCRYPTION_SECRET` environment variable). This key must be set and rotated independently from the session secret.

#### Dependencies

- AWS SDK v3 (`@aws-sdk/client-ses`) — currently dependencies include `@aws-sdk/client-s3` but not `@aws-sdk/client-ses`. Must be added.
- `node:crypto` module — for DKIM key generation (RSA-2048) and AES encryption
- New environment variable: `DOMAIN_KEY_ENCRYPTION_SECRET`

#### Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| AWS SES SDK version incompatibility with existing SMTP approach | Low | SES SDK is used only for identity management, not sending. The SMTP transport remains unchanged. |
| DKIM key generation performance | Low | RSA-2048 generation takes ~50ms. Run async, not in the request handler. |
| Encryption key rotation | Medium | Document rotation procedure. Add key version field to schema for future rotation without data loss. |

#### Acceptance Criteria

- `POST /api/domains { domain: "acmecorp.com" }` creates a `sender_domains` record with `status=PENDING_VERIFICATION`
- `GET /api/domains/instructions` returns the three DNS records the customer must add
- The DKIM private key is stored encrypted in the database
- Free-plan and Trial users receive `403 PLAN_REQUIRED`
- Domain uniqueness is enforced — two users cannot claim the same domain

#### Testing Requirements

- Unit test: DKIM key pair generation produces a valid RSA-2048 key pair
- Unit test: Encrypted private key decrypts correctly with the correct key; fails with incorrect key
- Integration test: `POST /api/domains` creates the expected database record
- Integration test: Free-plan user receives 403

---

### Phase 2 — DNS Verification and AWS SES Integration

**Objective:** Implement DNS propagation polling, complete AWS SES domain identity verification, and surface verification status to users.

#### Engineering Tasks

**Verification Polling Job**

New scheduled job: `pollDomainVerification()`

- Runs every 10 minutes
- Queries all `sender_domains` where `status = PENDING_VERIFICATION` and `created_at > NOW() - INTERVAL '7 days'`
- For each domain:
  1. Check AWS SES `GetIdentityVerificationAttributes` — if `VerificationStatus = Success`, mark domain as SES-verified
  2. Perform DNS TXT lookup for the ownership token — if the token is found, record ownership verified
  3. Both must be true for `status` to become `VERIFIED`
- Domains pending for more than 7 days transition to `FAILED` with reason `VERIFICATION_TIMEOUT`
- On failure: sends a notification email to the domain owner with re-verification instructions

**Manual Re-Verification**

`POST /api/domains/:id/retry` — Resets `last_checked_at` to trigger immediate re-check on the next polling cycle. Rate-limited to 3 manual checks per hour per domain.

**Verification Status UI**

New section in the user Profile or Settings page:

1. "Your Sender Domain" card showing:
   - Domain name
   - Current status (with color indicator: orange = Pending, green = Verified, red = Failed)
   - DNS records to add (displayed as a table with copy buttons)
   - "Check Status" button (triggers `POST /api/domains/:id/retry`)
   - Estimated propagation time ("DNS records can take up to 24 hours to propagate")
2. If verified: "Remove Domain" button (with confirmation modal)
3. If failed: Clear error message with re-verification instructions

**AWS SES DKIM Signing Activation**

After domain verification, call `VerifyDomainDkim` to get CNAME records for Easy DKIM, **or** inject the self-generated DKIM public key via `PutEmailIdentityDkimSigningAttributes` with the `EXTERNAL` dkim signing mode. The `EXTERNAL` mode allows RepMail to supply its own DKIM key rather than using SES's Easy DKIM CDN-hosted approach.

**Notification Email**

When domain verification succeeds: send a styled email (using the existing `sendSystemEmail()` path) confirming the domain is ready to use.

When domain verification fails after 7 days: send an email with the DNS records, re-verification link, and support contact.

#### Dependencies

- Phase 1 complete
- AWS SES `PutEmailIdentityDkimSigningAttributes` API availability in `eu-north-1`
- DNS resolver in Node.js (`dns.promises.resolveTxt`) — built into Node, no new dependency

#### Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| DNS TTLs causing slow propagation | High | Inform users clearly (UI shows 24h estimate). Polling runs for 7 days before timeout. |
| AWS SES DKIM EXTERNAL mode unavailable in some regions | Low | Test in `eu-north-1` before launch. Fallback: use Easy DKIM (Amazon-hosted CNAME). |
| Customer DNS provider does not support TXT records | Very Low | Document requirement upfront. Out of scope to support DNS providers without TXT record support. |

#### Acceptance Criteria

- A domain with correct DNS records transitions from `PENDING_VERIFICATION` to `VERIFIED` within 25 minutes of propagation (two polling cycles)
- A domain that never gets DNS records transitions to `FAILED` after 7 days
- Verified domain shows green status in the UI
- `VERIFIED` domain cannot be registered again by another user (uniqueness constraint)
- Verification token is cryptographically random (32 bytes hex)
- Manual retry is rate-limited

#### Testing Requirements

- Integration test: polling job transitions domain to VERIFIED when DNS mock returns the correct token
- Integration test: polling job transitions domain to FAILED after 7-day timeout
- Unit test: DNS lookup correctly identifies presence and absence of verification token
- Browser test: Status UI shows correct state for Pending, Verified, and Failed domains

---

### Phase 3 — Campaign Engine Integration

**Objective:** Allow campaigns to send from the customer's verified domain. Maintain full parity between the BullMQ worker path and the inline fallback path.

#### Engineering Tasks

**Campaign Model Update**

Add `sender_domain_id` (nullable UUID FK → sender_domains) to the `campaigns` table. Existing campaigns have `NULL` — they use the platform domain. New campaigns created by users with a verified domain default to their domain.

**Campaign Creation Logic**

At `POST /api/campaigns`:
1. Look up the user's verified sender domain (if any)
2. If verified domain exists: set `sender_domain_id` on the campaign
3. If no verified domain: continue using platform domain (`SES_FROM_EMAIL`)
4. The domain check is non-blocking — a user without a custom domain can still send via the platform domain

**Email Sending Update**

`sendCampaignEmail()` in `server/email.js` must:
1. Receive the `sender_domain_id` (from the campaign record)
2. If present: look up the domain record, decrypt the DKIM private key, and construct a sending identity using `domain@customer-domain.com`
3. If absent: use `SES_FROM_EMAIL` as before

The DKIM signing in this case must be injected into the Nodemailer transport options, not the global SMTP configuration, since different campaigns may use different signing keys simultaneously.

**Nodemailer DKIM Integration**

Nodemailer supports per-message DKIM signing via the `dkim` option in the `sendMail` call:

```javascript
dkim: {
  domainName: domain,
  keySelector: dkimSelector,
  privateKey: decryptedPrivateKey,
}
```

This allows concurrent campaigns to each sign with their respective customer domain key without interfering with each other.

**Inline Executor Parity**

`executeCampaign()` in `server/routes.js` must receive and pass through the `sender_domain_id` identically to how `processCampaign()` in `server/worker.js` does. This maintains the established architectural invariant that both execution paths behave identically.

**Domain Status Re-Check at Campaign Start**

At campaign start (not at campaign creation), verify that the sender domain is still `VERIFIED`. A domain that was verified at campaign creation time may have been suspended or removed by the time the campaign runs (e.g., a scheduled campaign).

Add a recheck every 50 emails (matching the existing sender-pause re-check pattern). If the domain is found to be non-VERIFIED mid-campaign, transition to PAUSED with `reason=domain_verification_failed`.

**From Address Construction**

If the user's sender email is `john@acmecorp.com`:
- `From: "John Smith" <john@acmecorp.com>` — configured by the user
- DKIM signed with `d=acmecorp.com`

If the user has a custom domain `acmecorp.com` but no specific email address configured:
- `From: "John Smith" <no-reply@acmecorp.com>` — default sender address for the domain

A new field `sender_email` should be added to the `sender_domains` record to allow users to specify their preferred sending address.

**Unsubscribe Link Routing**

Unsubscribe links currently use `APP_URL` (the RepMail platform URL). This does not change for Phase 2 — unsubscribes still go through the RepMail API, which handles suppression. The From address changing to a custom domain does not affect unsubscribe routing.

**Suppression Scope**

Suppressions are currently per-sender (keyed by `user_id`). With custom domains, a suppression created by `john@acmecorp.com`'s campaign should apply to all future campaigns from that domain (not just that user). This requires a domain-level suppression scope.

New field on `suppressions`: `domain_id` (nullable, FK → sender_domains). When a suppression is created from a campaign using a custom domain, both `user_id` and `domain_id` are set. The pre-campaign suppression check queries both.

#### Dependencies

- Phase 1 and Phase 2 complete
- `sender_domain_id` FK on `campaigns` table (additive migration, safe)
- `sender_email` field on `sender_domains` table
- `domain_id` field on `suppressions` table

#### Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| DKIM key decryption latency per email | Medium | Cache the decrypted key for the duration of the campaign, not per-email. Cache in worker memory, not Redis. |
| Concurrent campaigns using same domain key | Low | Node.js is single-threaded. Nodemailer per-message DKIM is safe for concurrent async sends. |
| Domain removed mid-campaign | Low | Domain recheck every 50 emails. PAUSED terminal state with clear reason. |
| SPF alignment failure with custom From | Medium | Document SPF requirement clearly. Phase 2b adds custom MAIL FROM. |

#### Acceptance Criteria

- Campaign sent by a user with a verified domain uses `From: "Name" <address@customdomain.com>` and is DKIM-signed with `d=customdomain.com`
- Campaign sent by a user without a verified domain uses `From: "Name" <platform@letszero.in>` unchanged
- Domain status recheck fires on campaign start and every 50 emails
- A campaign using a revoked domain transitions to PAUSED
- Both worker path and inline fallback path behave identically
- Suppression created from a custom-domain campaign applies domain-level scope

#### Testing Requirements

- Unit test: `sendCampaignEmail()` injects correct DKIM key when `sender_domain_id` is provided
- Unit test: `sendCampaignEmail()` uses platform domain when `sender_domain_id` is null
- Integration test: Campaign with verified domain produces email with custom From and DKIM header
- Integration test: Campaign with revoked domain transitions to PAUSED at start
- Production test (parallel to existing T-1): Send one email from a verified customer domain to a test inbox. Verify `From` address and `dkim=pass` in Gmail Show Original.

---

### Phase 4 — Security, Abuse Prevention, and Operational Readiness

**Objective:** Harden the feature against abuse, add operational tooling, and deploy to production with monitoring.

#### Engineering Tasks

**Rate Limiting for Domain Operations**

| Operation | Limit |
|-----------|-------|
| `POST /api/domains` (register domain) | 3 domains per user per 24 hours |
| `POST /api/domains/:id/retry` (manual verify) | 3 retries per domain per hour |
| `DELETE /api/domains/:id` (remove domain) | 1 removal per domain per hour |

**Audit Logging**

All domain operations must be recorded in the audit log:

| Event | Audit Action |
|-------|-------------|
| Domain registered | `DOMAIN_REGISTERED` |
| Domain verified | `DOMAIN_VERIFIED` |
| Domain verification failed | `DOMAIN_VERIFICATION_FAILED` |
| Domain removed | `DOMAIN_REMOVED` |
| Domain suspended (by admin) | `DOMAIN_SUSPENDED` |

Add these to `AUDIT_ACTIONS` in `shared/schema.js`.

**Admin Domain Management**

ROOT_ADMIN needs to be able to:
- View all registered sender domains and their status
- Suspend a domain (immediately stops all campaigns using that domain)
- Unsuspend a domain
- View the domain's bounce/complaint history

New admin endpoint: `GET /api/admin/domains` — paginated list of all sender_domains with status, owner, and health metrics.

**Domain Health Monitoring**

The delivery health dashboard (`GET /api/admin/delivery-health`) should include a per-domain breakdown when custom domains are active. High-bounce domains should be visible to administrators before auto-pause fires.

**Webhook Attribution Update**

When AWS SNS delivers a bounce or complaint event, the event is currently correlated to a `campaign_email` record via the `campaign-email-id` tag. This attribution works regardless of which domain sent the email — no changes needed.

However, the bounce/complaint rate auto-pause calculation in `getUserSenderHealth` must be updated to also pause the **domain** if the domain-level rate (across all users of that domain) is excessive. A single user's bad send should not expose the domain to uncontrolled damage.

**DMARC Guidance**

Users with custom domains should be advised to configure DMARC for their domain before sending. RepMail's UI should:
1. Check for a DMARC record on the customer's domain during verification
2. Show a warning (not a blocker) if no DMARC record is found
3. Provide copy-paste DMARC record values if the customer wants to set one

**Operations Documentation**

Produce operational runbooks for:
1. How to handle a customer domain verification failure support ticket
2. How to manually suspend a domain without code changes
3. How to rotate the `DOMAIN_KEY_ENCRYPTION_SECRET` without affecting existing domains
4. How to respond to an AWS SES identity limit approaching the quota

#### Dependencies

- All Phase 1–3 complete
- New env var: `DOMAIN_KEY_ENCRYPTION_SECRET`

#### Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Admin forgets to monitor domain health | Medium | Add domain health to the existing delivery health dashboard cron summary |
| Key rotation breaks existing domains | High | Version keys from the start. Add `key_version` to sender_domains record. |
| Domain suspension during active campaign | Low | Campaign transition to PAUSED is already handled by mid-loop domain check |

#### Acceptance Criteria

- All domain operations are recorded in the audit log
- ROOT_ADMIN can suspend any domain from the admin panel
- Suspended domain immediately stops all campaigns using that domain
- Domain health is visible in the delivery health dashboard
- Rate limiting prevents domain registration abuse
- Operational runbooks are written and stored in the repository

#### Testing Requirements

- Integration test: Audit log records DOMAIN_REGISTERED, DOMAIN_VERIFIED, DOMAIN_REMOVED
- Integration test: Admin suspension stops active campaign using that domain
- Unit test: Rate limiter correctly blocks 4th domain registration attempt within 24 hours

---

## Part 5 — Security Review

### Threat Model

| Threat | Attack | Mitigation |
|--------|--------|-----------|
| Domain squatting | User claims a domain they don't own | DNS TXT ownership token (cryptographic random, 32 bytes) |
| Private key theft | Database breach exposes DKIM keys | AES-256-GCM encryption at rest; key separate from data |
| Homoglyph domains | User registers `acmecоrp.com` (Cyrillic 'o') | Reject non-ASCII domain names; validate with `toASCII()` before storing |
| Subdomain injection | User registers `evil.acmecorp.com` when they own `acmecorp.com` | Verify ownership at the apex domain, not the subdomain |
| Reputation laundering | Bad actor uses customer domain to send spam through RepMail | Auto-pause at domain level; admin suspension; minimum plan gate |
| Key reuse across tenants | Two users given same DKIM key | Keys are generated per-domain-registration, never shared |
| Token brute-force | Attacker guesses verification token | 32-byte random token (256 bits of entropy — infeasible to brute-force) |

### Data Security

- DKIM private keys: AES-256-GCM encrypted at rest with a key separate from `SESSION_SECRET`
- The encryption key (`DOMAIN_KEY_ENCRYPTION_SECRET`) is never stored in the database
- Decrypted private keys are used in memory only for the duration of a campaign send, then released
- No private keys are ever returned to the client via any API endpoint

---

## Part 6 — Migration and Rollout Plan

### Database Migrations

All schema changes are additive (new table, new nullable columns on existing tables). No existing data is affected. Migration order:

1. Add `sender_domains` table
2. Add `sender_domain_id` (nullable) to `campaigns`
3. Add `sender_email` to `sender_domains`
4. Add `domain_id` (nullable) to `suppressions`
5. Add `DOMAIN_*` entries to `AUDIT_ACTIONS` in `shared/schema.js`

### Deployment Sequence

1. Deploy Phase 1 with feature flag `CUSTOM_DOMAINS_ENABLED=false` — no UI visible
2. Deploy Phase 2 — still behind feature flag
3. Deploy Phase 3 — still behind feature flag
4. Deploy Phase 4 and operational runbooks
5. Enable `CUSTOM_DOMAINS_ENABLED=true` for ROOT_ADMIN only (internal testing)
6. Test with 1–3 internal domains
7. Enable for Starter+ plan users
8. Monitor for 2 weeks
9. Enable for all users

### Rollback

If critical issues are found after enabling:
- Set `CUSTOM_DOMAINS_ENABLED=false`
- All campaigns immediately fall back to the platform domain (`letszero.in`)
- No data loss — `sender_domains` records remain; campaigns retain their `sender_domain_id`
- Re-enabling restores full functionality without data migration

---

## Part 7 — Prioritized Roadmap

### P0 — Launch Blockers (required before any customer sends from custom domain)

| # | Item | Phase |
|---|------|-------|
| P0-1 | `sender_domains` database table with DKIM key storage | Phase 1 |
| P0-2 | DKIM key pair generation (RSA-2048) | Phase 1 |
| P0-3 | Encrypted private key storage (AES-256-GCM) | Phase 1 |
| P0-4 | AWS SES domain identity registration via SDK | Phase 1 |
| P0-5 | DNS TXT ownership verification | Phase 2 |
| P0-6 | AWS SES DKIM verification polling | Phase 2 |
| P0-7 | Verification status UI (DNS records, status, instructions) | Phase 2 |
| P0-8 | Block sending until domain is VERIFIED | Phase 3 |
| P0-9 | Campaign engine uses customer DKIM key | Phase 3 |
| P0-10 | Domain status recheck at campaign start | Phase 3 |
| P0-11 | Both worker and inline executor paths updated | Phase 3 |
| P0-12 | Audit logging for all domain operations | Phase 4 |
| P0-13 | Admin domain suspension capability | Phase 4 |
| P0-14 | Rate limiting on domain registration | Phase 4 |
| P0-15 | Homoglyph domain rejection | Phase 4 |

### P1 — Must Complete Before Customer Rollout

| # | Item | Phase |
|---|------|-------|
| P1-1 | Domain-level suppression scope | Phase 3 |
| P1-2 | Notification email on verification success/failure | Phase 2 |
| P1-3 | Domain health in delivery health dashboard | Phase 4 |
| P1-4 | Domain-level auto-pause (not just sender-level) | Phase 4 |
| P1-5 | Operational runbooks (support, suspension, key rotation) | Phase 4 |
| P1-6 | DMARC warning if no DMARC record on customer domain | Phase 2 |
| P1-7 | Mid-campaign domain recheck (every 50 emails) | Phase 3 |
| P1-8 | Plan gate (Starter+ required for custom domains) | Phase 1 |
| P1-9 | `DOMAIN_KEY_ENCRYPTION_SECRET` env var validation at startup | Phase 4 |

### P2 — Nice Improvements (deploy after stable rollout)

| # | Item |
|---|------|
| P2-1 | Custom MAIL FROM subdomain (SPF alignment improvement) |
| P2-2 | Per-user sender email within a verified domain (multiple senders per domain) |
| P2-3 | Domain DNS health polling after verification (detect DNS record removal) |
| P2-4 | DKIM key rotation workflow (generate new key, update DNS, re-verify) |
| P2-5 | AWS SES sending statistics per domain (separate from platform-wide stats) |
| P2-6 | "Verify with Cloudflare" or "Verify with Route 53" guided flows |

### P3 — Future Enhancements

| # | Item |
|---|------|
| P3-1 | Multiple verified domains per account |
| P3-2 | Per-campaign domain selection |
| P3-3 | Automated DNS record injection (Cloudflare API integration) |
| P3-4 | Dedicated IP pool per customer domain |
| P3-5 | Domain-level Postmaster Tools integration |
| P3-6 | White-label sending (customer's own SES account) |

---

## Part 8 — Estimated Engineering Effort

This estimate is based on the scope defined above. It assumes one experienced backend engineer and one frontend engineer working in parallel after this scope document is approved.

| Phase | Backend Effort | Frontend Effort | Total |
|-------|---------------|----------------|-------|
| Phase 1 — Database & Foundation | 5–7 days | 1 day | 6–8 days |
| Phase 2 — DNS Verification | 5–7 days | 3–4 days | 8–11 days |
| Phase 3 — Campaign Integration | 5–8 days | 2–3 days | 7–11 days |
| Phase 4 — Security & Ops | 4–6 days | 2–3 days | 6–9 days |
| Testing & QA | 4–5 days | 2–3 days | 6–8 days |
| **Total** | **23–33 days** | **10–14 days** | **33–47 days** |

**Total estimated range:** 6–10 weeks of parallel engineering work (two engineers)

This estimate does not include:
- Dedicated IP pool (P3-4)
- Automated DNS injection (P3-3)
- Customer's own SES account (P3-6)

These items would each add 2–4 weeks of additional work.

---

## Part 9 — Why This Is a Separate Milestone

This document describes work that is architecturally independent from everything already built in RepMail. The current architecture assumes a single shared sending domain. Making custom domains work requires changes to:

- The database schema (new table + new columns on two existing tables)
- AWS SES integration (moving from environment variable configuration to per-customer API calls)
- The email sending function (per-campaign DKIM key injection)
- Both campaign execution paths (worker.js and routes.js executeCampaign)
- The suppression system (domain-level scope)
- The audit system (new domain actions)
- The admin dashboard (domain management UI)
- The frontend (verification wizard, status UI)
- The operational runbooks (support procedures)

Every one of these changes is meaningful and carries risk. Testing them requires:
- Real domain ownership for integration testing
- Real AWS SES identity management API calls
- Real DNS propagation testing (or a mocked DNS resolver for unit testing)
- Production validation with actual inbox delivery

This is not a feature that can be added in a weekend. It is a distinct product capability that requires careful engineering, testing, and a controlled rollout — exactly like the foundational RepMail platform itself.

---

*Document prepared on 2026-06-26 by Claude Sonnet 4.6 after a complete repository audit. All "Already Implemented" claims are verified against source code. All "Not Implemented" claims are verified by the absence of that code in the repository.*
