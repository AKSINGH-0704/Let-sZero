# RepMail — Release Notes

**Product:** RepMail by LetsZero Solutions Private Limited  
**Audience:** Customers, stakeholders, partners  
**Last updated:** 2026-07-19

This document summarises what was built, improved, and hardened across the RepMail engineering programme. Changes are grouped by theme rather than internal milestone numbering. Technical implementation details are omitted in favour of customer-facing descriptions.

---

## Current Release — v2.0.0 (2026-07-19)

A major release. The RepMail Resource Center grew from a small set of guides into a full knowledge platform, and both it and the LetsZero website were hardened for production.

### A complete cold email knowledge base

The Resource Center at **letszero.in/repmail/learn** now holds **75 in-depth guides** across six topic areas, up from 11.

- **Deliverability & Sender Reputation** (20 guides) — authentication, warm-up, spam scores, bounces, blacklists, and inbox placement.
- **Outreach & Sales Engagement** (24 guides) — head-to-head tool comparisons, alternatives, pricing breakdowns, candid reviews, and troubleshooting guides for the major cold email platforms.
- **Cold Email** (8 guides) — subject lines, personalization, follow-up cadence, benchmarks, and A/B testing.
- **Glossary** (15 definitions) — SPF, DKIM, DMARC, ARC, BIMI, SMTP, MX and PTR records, and more, each linking to its full guide.
- **Email Infrastructure** (4 guides) and **Email Sending Platform** (4 guides).

### Ways to find what you need

- **Three learning paths** — Getting Started, Deliverability Mastery, and Email Infrastructure End to End — walk you through a topic in order, with Previous and Next navigation on every step.
- **Eleven curated collections**, grouped by what you are actually trying to do: Pricing Explained, Tool Reviews, Troubleshooting Your Sending Tool, Complete Guides, Escaping the Spam Folder, Email Authentication Essentials, and more.
- **An All Guides index** listing every guide grouped by topic, so nothing is more than one click from the homepage.
- **Site-wide search** (⌘K from any page) covering guides, topics, collections, and learning paths.
- **Related guides** on every article, generated from shared topics rather than hand-maintained lists.

### A serious fix worth naming

For a period, the Resource Center rendered as empty in the browser: topic pages reported that they were "being written", learning paths showed no steps, and individual guides could return a not-found page — even though every guide was published and correct. The cause was a compatibility fault in how article files were read inside the browser. It has been fixed, and the entire site is now checked in a real browser before release, not only on the server. If you visited the Resource Center and found it empty, it works now.

### Corrections to published information

- **Credits never expire.** Several guides had stated that purchased credits lapse after six months. That was wrong and contradicted our pricing page. Every affected page has been corrected. Purchased credits do not expire.
- **Competitor pricing** in comparison guides was reviewed for internal consistency and each page states the date it was checked, with a reminder to confirm current pricing on the vendor's own site.

### Design and readability

- Topic pages, article pages and lists were reworked for a cleaner reading experience: a comfortable line length for long-form text, consistent spacing, and artwork that scales correctly rather than being cut off at the edges of its card.
- The site was checked at six screen sizes from small phones to ultra-wide displays. Layout problems found at tablet width — including a header where the search button was pushed off-screen and unreachable — have been fixed.
- Reference tables inside guides can now be scrolled with a keyboard, not only a mouse or touch.
- Links and buttons across the site meet accessibility guidance for target size, and now show a clear outline when reached by keyboard.
- Text contrast was measured and corrected where it fell below the accessibility standard.

### Fonts now load correctly

The site's typefaces were being blocked by a browser security policy, so pages rendered in fallback fonts. The policy has been corrected and the intended typography now loads.

### Findability

Every guide is now pre-rendered as a real page for search engines, listed in the sitemap, and published to the Resource Center's RSS feed. Guides carry structured data describing the article, its position in the site, and its questions and answers. Sitemap dates now reflect when a page's content actually changed rather than when the site was last deployed.

### For developers

Local development can no longer connect to the production database by accident. The server refuses to start if a non-production process points at a remote database, and explains how to configure a local one.

This release does not change how campaigns send, how credits are counted, or how payments are processed.

---

## Previous Release — v1.10 (2026-07-14)

### You can always buy credits

Previously, if you were already on a plan, that plan's card showed as "Active" and could not be clicked. That was wrong. RepMail sells one-time credit packs, not subscriptions, so the pack you are already on is the one you are most likely to want again.

- **Buy again, any time.** Every paid pack stays purchasable, including the one you already hold. Your current plan is still clearly marked, but it is now a label, not a locked button.
- **You always know what a purchase does.** Each pack states its effect before you buy: how many credits it adds, and, when you pick a smaller pack, a clear reminder that your existing plan stays exactly as it is. Buying more credits never downgrades you.
- **Enterprise customers can always reach us.** The Contact Sales button now works even if you are already on Enterprise.
- **The credit estimator now works when signed in.** Choosing an amount and clicking through takes you to the right place instead of doing nothing.

### Apply every email suggestion in one click

The Email Quality Check now offers an **Apply all** action when more than one suggestion is waiting. It applies each fix exactly as if you had accepted them one by one, so you can still undo them individually, edit any suggestion by hand, or dismiss the ones you disagree with.

### You cannot lose credits to a missed setting

The final confirmation screen now checks every requirement before a campaign can start, including a verified sending domain and your sender identity. If something is missing, the campaign will not run, and the screen tells you exactly which field needs attention, right beneath that field, and takes you to it. The message clears itself as soon as you fix it.

This release does not change how campaigns send, how credits are counted, or how payments are processed.

---

## Previous Release — v1.9 (2026-07-13)

### New: The RepMail Resource Center

A free, in-depth learning destination for cold email and deliverability, at **letszero.in/repmail/learn**.

- **Practical guides that solve real problems.** Eleven in-depth guides across two Academies, Deliverability and Sender Reputation and Cold Email, covering everything from SPF, DKIM, and DMARC through warming up a new domain, reading bounces, writing subject lines that get opened, and building follow-up sequences that get replies. Every guide ships with something usable, such as a checklist, a reference table, or a ready-to-use template.
- **A guided Getting Started path.** A sequenced route from verifying your domain to sending your first deliverable campaign, so a new sender always knows the next step.
- **Built to help you find things fast.** On-site search with a keyboard shortcut, topic Academies, curated collections, rich internal linking, and clear visual diagrams that explain how email authentication and domain warm-up actually work.
- **Discoverable everywhere.** Reachable from the LetsZero site, the RepMail product pages, and inside the app, with no need to type a URL.
- **Fast, accessible, and search-friendly.** Every page is prerendered for search engines and social sharing, scores top marks for accessibility, works in both light and dark themes, and ships with a sitemap and an RSS feed.

This release adds the Resource Center. It does not change sending, billing, or any existing product behaviour.

---

## Previous Release — v1.8 (2026-07-12)

### Team Plans, Simplified

- **Every plan now includes up to 25 team members — including the free trial.** Team size is no longer a reason to pick one plan over another: Starter, Growth, and Scale all include the same 25-seat allowance, at no extra cost. Need a larger team? Enterprise offers unlimited seats.
- **Pricing and plan-comparison pages updated everywhere** to reflect the new, simpler team allowance — no more hunting to figure out how many seats a plan includes.

### Teams, Introduced From Day One

- **New: a short welcome moment introduces Teams the first time you sign in.** A quick, conversational question — how many people you plan to work with — leads into a brief explanation of how invitations work, how your shared sending domain works, and what to expect as your team grows. Entirely optional and takes seconds; nothing is configured or locked in by your answer.

---

## v1.7 (2026-07-11)

### Purchase Confirmation, Redesigned

- **Your purchase confirmation now stays on screen until you're done with it.** It no longer disappears on its own partway through — you'll always see it clearly before moving on.
- **You'll see your new credit total, not just what you bought.** The confirmation now shows both the credits just added and your resulting balance, so there's no mental math and no doubt the purchase landed.
- **A clearer next step.** If your plan includes team seats, the confirmation now takes you straight to inviting your team — the fastest way to get value from your new plan.

### Team Pricing, Clarified

- **Team pricing is now visible in one place.** Comparing plans by team size no longer requires switching between views — price, credits, and seat count for every plan are shown together.
- **Your current plan is now clearly marked** on the pricing page, so you always know what you're on before deciding whether to upgrade.
- **A pricing inconsistency was corrected.** Some pages previously stated credits expire after 6 months; this did not match how credits actually work. All pages now consistently state that purchased credits never expire.

### Clearer Errors, Everywhere

- **Error messages are now always in plain language.** A small number of situations — most notably an incorrect password — previously could display a technical error message instead of a clear one. This is now fixed everywhere in the product.
- **Form errors now point to exactly what's wrong.** Creating a template, adding a sending domain, inviting a teammate, or resetting your password now tells you specifically which field needs attention and why, instead of a generic "please fix this" message.

---

## v1.6 (2026-07-11)

### Teams / Workspace, Completed

Your team's shared workspace is now fully connected end to end.

- **Your sending domain is shared automatically.** Once you verify your custom sending domain, every team member you invite can send from it immediately — no separate verification step for each person, no waiting.
- **Team seats now match what your plan promises.** Your plan's team-member allowance (Starter 3, Growth 10, Scale 25, Enterprise custom) is enforced across your whole team, consistently, exactly as advertised.
- **You can now revoke a pending invitation.** Sent an invite to the wrong address, or want to close a stale invite window? You can now cancel it before it's accepted, from Team Management.
- **A better welcome after upgrading.** Purchasing a team-capable plan now shows you exactly what you've unlocked — including your new team-seat allowance — with a short checklist guiding you to your next step (verify your domain, invite your team, send your first campaign).

### Account Data Isolation, Strengthened

As part of this work, we completed a proactive review of account boundaries across the platform and tightened several internal checks to ensure customer accounts remain fully isolated from one another. No customer data was found to have been accessed inappropriately, and no action is needed on your part — this is an internal hardening measure.

---

## v1.5 (2026-07-06)

### Team Invitations — Reliability Fix

- Fixed an issue where a team member you invited could, in a specific and previously unnoticed situation, be unable to accept their invitation even though it was sent successfully — they would see a plan-limit message that didn't reflect your account's real allowance. Accepting a team invitation now correctly reflects your plan's actual team-member allowance in every case.
- No change to how you invite team members, accept an invitation, or manage your team — this is a reliability fix with no visible workflow change.

---

## v1.4 (2026-07-06)

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
