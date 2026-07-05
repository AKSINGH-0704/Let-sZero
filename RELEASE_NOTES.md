# RepMail — Release Notes

**Product:** RepMail by LetsZero Solutions Private Limited  
**Audience:** Customers, stakeholders, partners  
**Last updated:** 2026-07-06

This document summarises what was built, improved, and hardened across the RepMail engineering programme. Changes are grouped by theme rather than internal milestone numbering. Technical implementation details are omitted in favour of customer-facing descriptions.

---

## Current Release — v1.4 (2026-07-06)

### Spam Analyzer, Redesigned

The Spam Analyzer no longer leads with a bare risk number — it now reads more like a writing assistant reviewing your email with you.

- **A clear headline instead of a score to interpret.** You'll see "Ready to send," "A few quick fixes recommended," or "This email needs attention" — with the underlying risk score still fully available (hover the Spam Risk indicator for the exact number and a full breakdown of what's contributing to it).
- **One combined list of suggestions.** Pattern-matched fixes and AI-reviewed fixes now appear together in a single list instead of two separate sections, each labeled with where it came from and — for AI suggestions — how confident the recommendation is (high, medium, or low).
- **Undo.** Applied a suggestion you want to reverse? Undo is now available right next to it.

---

## v1.3 (2026-07-05)

### More Accurate Campaign Metrics

- Fixed a display issue where emails that later bounced or triggered a spam complaint could disappear from your "sent" count on a dashboard refresh, even though they were genuinely delivered and correctly charged.
- Consolidated three slightly different "Delivery Rate" calculations (dashboard, campaign progress, and history) into one consistent, correct formula everywhere.
- Every percentage shown across campaigns and history is now guaranteed to stay within 0–100% — no more visually confusing values.
- Cancelling a campaign no longer silently changes the displayed counts moments later without explanation — you'll see a brief "Finalizing counts…" state while the true final numbers are being confirmed.

### Spam Analyzer: Accept, Reject, or Edit Suggestions

- The Spam Analyzer now shows a reason alongside each suggestion, and gives you Accept, Reject, and Manual-edit controls with a before/after comparison — instead of only being able to accept every suggestion as-is.

### Clearer Contact Import Failures

- Failed contact-import rows are now summarised with an expandable detail view, so you can see exactly which rows failed and why, and retry.

### AI Content Suggestions: Before/After and Undo

- AI-generated content suggestions now show a before/after comparison with Accept, Reject, Manual-edit, Partial-apply, and Undo — giving you full control over what gets applied to your campaign.

### Further Campaign Reliability Hardening

- Following up on the previous release's campaign-execution safeguards, an additional, deeper engineering review — including validation against a production-equivalent database configuration — found and closed several narrow, low-frequency timing conditions that could, in rare cases, cause a campaign's displayed send/credit counts to be briefly out of date after completion. No customer-visible action is needed; your campaign records and credit balance were never at risk — this is an internal accuracy hardening for the numbers displayed on screen.

---

## v1.2 (2026-07-05)

### Strengthened Campaign Sending Reliability

- Reinforced the internal safeguards that ensure every campaign email is sent exactly once and every credit is charged exactly once, even under rare timing conditions — for example, cancelling a campaign or deactivating an account at the same moment emails are actively sending.
- Campaigns now recognise a cancellation or account change more immediately during send, rather than waiting for the current batch to finish.
- No change to how you create, send, or monitor campaigns — this is an internal reliability hardening with no visible workflow change.

---

## v1.1 (2026-07-04)

### A Redesigned Domains Experience

Managing your sending domain is now a first-class part of RepMail.

- **Domains in the navigation.** Your sending domains now have a dedicated home, reachable from the new **Manage** menu in the top navigation — no more hunting for where to verify or manage a domain.
- **Guided verification.** Each domain has its own page with a clear three-step progress view (Registered → Add DNS records → Verified), one-click copy for every DNS record, and per-record detection status when you run a check — so you can see exactly which records are in place and which are still propagating.
- **Automatic status updates.** The page checks verification in the background and updates on its own; a manual "Check now" is available at any time.
- **Clear guidance and recovery.** Propagation timing, the verification window, and provider-specific tips (Cloudflare, GoDaddy, Route 53) are shown where you need them. If a verification window expires, one click re-registers the domain with fresh records.
- **Sender identity in one place.** Your From name, job title, company, phone, and reply-to address are now managed alongside your domains — everything recipients see about you lives on one page. Profile is now focused purely on your account.

### Simpler First-Time Setup

- Onboarding is now a single step: enter your name and domain, and you land directly in the guided verification view. Building your first campaign while DNS propagates remains fully supported.
- The dashboard shows one clear sending-status line — Preview Mode, verifying, ready, or attention needed — that always links to the right next step.

### A More Polished, More Accessible RepMail

- A refreshed visual foundation: consistent typography, spacing, status indicators, and dialogs across the app, in both light and dark themes.
- Accessibility improvements throughout, including stronger colour contrast (WCAG AA), full keyboard navigation, screen-reader labelling, and reduced-motion support.
- Faster, cleaner navigation that works properly on tablets and small laptops.

---

## v1.0 (2026-06-30)

### New Features

#### Custom Sending Domains
All plans now send campaigns from a verified customer-owned domain. Shared RepMail campaign sending has been removed to protect sender reputation and customer trust.

- Add your domain (e.g. `hello@acme.com`) from the **Domains** page under your account settings
- RepMail generates the DNS records you need to add — three CNAME records for DKIM signing
- AWS Easy DKIM is configured automatically; no cryptographic keys to manage
- RepMail polls for verification automatically every 10 minutes; or click **Check Now** any time
- Once verified, select your custom domain when creating a campaign — each email is signed and delivered from your own domain
- If a domain is suspended or removed, any campaign using it stops immediately with a clear audit log entry; no emails are silently rerouted to a different address
- Campaign history preserves the original sending address permanently, even if you later remove the domain

#### Workspace Activation
New users are guided through a custom-domain setup flow before they can send campaigns.

- The onboarding flow now focuses only on domain ownership and DNS verification
- The campaign confirmation screen requires a verified sending domain before launch
- Sender health now clearly reports whether the account is ready to send or still waiting on DNS verification
- Team members inherit the parent workspace plan for plan limits and sending capabilities

#### Contact Library
Create, name, and reuse contact lists independently of your campaigns.

- Upload contacts via CSV — name, email, company, and category fields supported
- Save contact uploads to named lists during campaign creation, or manage lists directly from the **Contact Lists** page
- Edit individual contact records at any time
- Export any list to CSV for offline use or migration
- Campaigns launched from a library list carry a permanent snapshot of the contacts used — your history remains accurate even after the list is edited or deleted

#### Campaign Cancellation
Cancel any running or pending campaign from the campaign progress view or the history table.

- Cancellation stops email delivery immediately; contacts not yet reached are counted and displayed
- Credits are not deducted for unsent emails
- CANCELLED status is visible throughout the dashboard, history, and progress tracker

#### Duplicate Campaign
Re-launch any completed, failed, or cancelled campaign without starting from scratch.

- Click **Duplicate** on any past campaign in History
- The new campaign wizard opens pre-filled with the original template, contact list, and name (appended with "(Copy)")
- Modify anything before sending — the original is unchanged

#### Self-Service Password Reset
Request a password reset directly from the login page.

- Enter your email address — a reset link is sent if an account exists (no account enumeration)
- Link expires in 1 hour and is single-use
- All active sessions are invalidated on reset — protects against credential theft scenarios
- Admin-forced password change requirement is cleared on successful reset

#### AI Template Generation
Generate personalised email templates using GPT-4o (Scale/Enterprise plans) or GPT-4o-mini (Starter/Growth plans).

- Describe your outreach in plain English — AI generates a structured template with subject and body
- Spam analysis report included with every generation: spam trigger words, subject line length, link density, personalisation score
- Unknown or misspelt placeholders are caught before generation and flagged to prevent sending broken emails
- Daily usage limits per plan; usage resets at midnight UTC

---

### Security Improvements

#### HTTP Security Headers
All HTTP responses now include a comprehensive security header set (via Helmet):

- `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing attacks
- `X-Frame-Options: DENY` — prevents clickjacking
- `Strict-Transport-Security` — enforces HTTPS on all subsequent visits
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection` and `Permissions-Policy` set to restrictive defaults

#### Drizzle ORM SQL Injection Fix
The ORM library was upgraded to close a known SQL injection vulnerability in identifier handling (SEC-002). All database queries that accept user-supplied identifiers are now safe against injection via that vector.

#### xlsx CVE Remediated
The spreadsheet library used for CSV/Excel contact imports was replaced after a known remote code execution vulnerability (CVE-2023-30533) was disclosed. The replacement library (ExcelJS) is actively maintained and has no known critical vulnerabilities.

#### Email Header Injection Protection
Every email header value (From name, Reply-To, subject) is sanitised before construction. Carriage return and line feed characters are stripped, preventing header injection attacks that could allow senders to inject arbitrary headers into outgoing emails.

#### API-Level Sender Profile Enforcement
The sender profile requirement (display name, company) is now enforced at the API boundary, not only in the frontend. A user who constructs an API request directly cannot send a campaign that appears to come from the platform's own name.

#### SNS Webhook Hardening
The AWS SNS webhook endpoint now validates topic ARN at startup. A misconfigured or absent `SNS_TOPIC_ARN` causes the server to refuse to process any bounce/complaint events rather than silently accepting them. This prevents a misconfiguration from leaving bounce handling silently disabled.

#### Sentry Error Monitoring
Unhandled server errors are now captured and reported to Sentry before the operator notices them in logs. PII is filtered before transmission — request bodies, cookies, authentication headers, IP addresses, emails, and usernames are stripped from error reports.

---

### Deliverability Improvements

#### Auto-Pause Fires Before SES Suspension
RepMail's sender health auto-pause thresholds (bounce rate and complaint rate) are now set conservatively below AWS SES's own suspension thresholds. RepMail will pause a sender's outbound before SES suspends the shared sending account. This protects all customers on the platform, not only the one with the deliverability issue.

| Metric | Previous threshold | Current threshold | AWS SES suspension threshold |
|--------|--------------------|-------------------|------------------------------|
| Bounce rate | 15% | 8% | 10% |
| Complaint rate | 0.5% | 0.05% | 0.1% |

#### DKIM Signing for Custom Domains
Campaigns sent from a verified custom domain are signed with DKIM using AWS Easy DKIM. Recipients' mail servers can verify the signature and confirm the email genuinely originated from the claimed domain — a significant trust signal for inbox placement and spam filter scoring.

#### RFC-Compliant Unsubscribe Headers
Every campaign email includes `List-Unsubscribe` and `List-Unsubscribe-Post` headers per RFC 2369 and RFC 8058. This enables one-click unsubscribe in Gmail, Apple Mail, and other major clients, which is a deliverability signal to those platforms that your emails are responsibly managed.

#### Credit Pre-Flight Aligned with Deduction Logic
The credit check before campaign start now uses the same rolling 30-day window as the per-email deduction step. Previously, a calendar month boundary could cause the pre-flight check to report credits as available when none were actually available, resulting in mid-campaign failures.

---

### Reliability Improvements

#### Campaign State Machine Hardened
- **CANCELLED** status added as a permanent terminal state — campaigns can be stopped at any point
- Atomic completion prevents a race condition where two concurrent processes could both mark a campaign as COMPLETED, potentially double-counting
- Campaign progress updates on every 25th email (configurable), not only at completion — server restarts during a long campaign no longer lose all progress
- Orphaned PENDING/RUNNING campaigns from a previous server restart are detected and marked FAILED at startup, with an audit log entry

#### Mid-Loop Pause Checks
During campaign execution, the system re-checks for global pause, user-level pause, and (for custom domain campaigns) domain health at every 50th contact. This limits worst-case exposure after an admin action to 49 additional emails rather than the full remaining list.

#### Custom Domain Campaign Integrity
If a sending domain is suspended or removed after a campaign was created, the campaign fails immediately at start rather than silently switching to the platform's shared email address. The failure is logged with a clear audit entry so the sender understands exactly why their campaign did not run.

#### Verification Poll Overlap Prevention
The domain verification polling job uses a running guard — if a poll cycle is still in progress when the next 10-minute interval fires, the new cycle is skipped. This prevents SES API call pile-up if SES is slow to respond.

---

### Operational Improvements

#### Delivery Health Dashboard
The health dashboard now derives its `warning` and `critical` thresholds from the same configuration values used to enforce auto-pause. The dashboard cannot display a threshold that contradicts the enforcement system.

#### Audit Trail
Every significant platform event is recorded with a timestamp, actor, target type, and machine-readable detail payload:

- Campaign lifecycle events (created, started, completed, failed, paused, cancelled)
- Domain lifecycle events (registered, verified, failed, removed, suspended)
- User events (login, logout, profile updated, password reset)
- Payment events (initiated, completed, receipt sent)
- Platform administration events (global pause, sender pause, team member invited)

Audit logs are append-only and available to ROOT_ADMIN via the admin panel.

#### Startup Schema Validation
The server validates on every start that all required database tables, columns, and indexes exist. If a table is missing (e.g. after a failed migration), the server refuses to start and logs which check failed. This prevents the server from starting in a degraded state where some features silently fail.

#### Suppression List Management
Users can now view and delete their suppression list entries from the dashboard. Previously suppressions could only be added (via bounce/complaint events) — there was no self-service way to remove an incorrectly suppressed address.

---

### Known Limitations

| Limitation | Status | Notes |
|------------|--------|-------|
| No open or click tracking | Planned | Campaigns deliver but engagement data is not collected. Planned for a future release. |
| No automated domain health suspension | Planned | Per-domain bounce/complaint counters exist in the schema but do not yet trigger automatic domain suspension. Admin manual suspension is available. |
| No drip sequences or follow-up automation | Planned | All campaigns are single-blast. Automated multi-step sequences are planned. |
| No dynamic contact segmentation | Planned | Segments must be created manually via CSV upload. Rule-based dynamic segments are planned. |
| No multi-currency billing | Planned | INR only via Razorpay. USD and other currencies are planned. |
| Account deletion is manual | Partial | Requesting account deletion sends an email to the support team who handles it manually. Self-service deletion is planned. |
| IDN (internationalised) domain display | Known | Internationalised domain names (e.g. `münchen.de`) are stored and displayed in punycode (`xn--mnchen-3ya.de`). Functionally correct; display-layer conversion is planned. |
| Custom domain required before sending | By design | Campaign sending requires a verified domain owned by the sender. Shared RepMail campaign sending is no longer available. |

---

## Release History Summary

| Period | Major Deliveries |
|--------|-----------------|
| Dec 2025 – May 2026 | Platform foundation: Express + PostgreSQL + BullMQ + SES/SNS + Razorpay + 3-tier auth + AI template generation. 58-audit hardening programme. 9.6/10 production launch score. |
| June 2026 (early) | M1–M5: Correctness hardening (credit logic, deliverability thresholds), server-side security (sender gate, CRLF injection), campaign reliability (CANCELLED status, atomic completion, checkpoint saves), campaign architecture extraction, production safety (SNS hardening, header injection, suppression management) |
| June 2026 (mid) | M6–M7: Contact Library (named lists, CSV import/export, contact edit), Duplicate Campaign, Contact Management completion |
| June 2026 (late) | M8–M15: Launch Readiness Hardening (Helmet, Sentry, password reset, xlsx CVE, drizzle-orm fix), Custom Sending Domains (AWS Easy DKIM, verification polling, campaign integration, admin controls), first-run onboarding, custom-domain-only sending, plan inheritance, sender health fixes |
