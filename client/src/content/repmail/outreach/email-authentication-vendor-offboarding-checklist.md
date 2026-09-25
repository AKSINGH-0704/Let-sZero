---
product: repmail
academy: outreach
contentType: template
slug: email-authentication-vendor-offboarding-checklist
title: "Email Authentication Vendor Offboarding Checklist"
description: "Email Authentication Vendor Offboarding Checklist — Teams need to remove DNS includes, selectors, tracking CNAMEs, permissions, and monitoring references when."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","email","authentication","vendor","offboarding"]
assets:
  - type: table
    title: "Decision/Diagnostic Table: When to remove vs quarantine"
    content:
      headers: ["Condition observed","Immediate action","Evidence to collect","Stop condition"]
      rows:
        - ["DKIM selector seen within last 7 days in headers","Quarantine selector (replace TXT with deny) and schedule deletion in 48–72h","Message headers with selector and timestamp; sending IP log","No new headers using selector for 48–72h"]
        - ["SPF include still resolving to vendor IPs","Remove include from SPF and add explicit A/MX entries if needed; monitor SPF pass/fail","DNS TXT before/after; SPF test results","No SPF passes attributable to vendor after TTL expiry"]
        - ["DMARC rua points to vendor","Update rua to internal/alternate collector and retain copies of reports","DMARC aggregate report files; DNS TXT change time","No new reports delivered to vendor address after TTL expiry"]
        - ["Tracking CNAME returning vendor endpoint","Remove CNAME and replace with internal tracking or 410-style endpoint","HTTP logs, CNAME DNS record snapshot","No client requests or 404/410 responses after change"]
        - ["Vendor-held DNS delegation","Import zone into your account and revoke delegation","Registrar/zone delegation record, change request proof","Zone authoritative nameserver changed to internal or trusted provider"]
        - ["Vendor API keys still active in systems","Rotate keys and revoke vendor-scoped credentials","API key change logs, access attempts","No successful vendor-scoped API calls in logs"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Teams need to remove DNS includes, selectors, tracking CNAMEs, permissions, and monitoring references when a sender is retired."
  - "Distinct from generic vendor offboarding: specific record and evidence checks across auth surfaces."
  - "authentication inventory; tool migration"
commonMistakes:
  - "Skipping this check: Export a signed inventory of SPF includes, DKIM selectors (with sample headers), DMARC rua/rua URIs, tracking CNAMEs, MX changes, and delegated DNS zones."
  - "Skipping this check: Confirm last-seen timestamp for each DKIM selector and vendor sending IP using message headers or provider logs."
  - "Skipping this check: Schedule a maintenance window and notify stakeholders; include rollback owner and TTL-aware timing."
faqs:
  - question: "If I remove a DKIM selector and see immediate bounces, what should I do?"
    answer: "First, check if a sending system is still signing with that selector. If a live system is using it, re-enable the selector temporarily or stop that system from sending. If you replaced the TXT with a deny value, revert only if necessary and investigate the signer. Record the time window and affected message samples; do not assume deliverability will fully recover without confirming signer rotation."
  - question: "How long should I monitor DMARC reports after offboarding a vendor?"
    answer: "Monitor DMARC aggregate and forensic reports for at least 7–14 days. Reports can be delayed or batched, so use header sampling and bounce logs alongside DMARC XMLs. Treat absence of reports in the first 48 hours as inconclusive and continue monitoring through the planned window."
  - question: "Can I rely on removing an SPF include alone to stop a vendor from sending?"
    answer: "No. Removing an SPF include reduces authorized sending paths but does not affect DKIM signatures, MX-level routing, or vendor-held SMTP credentials. Complete offboarding requires removing SPF includes plus DKIM selectors, revoking credentials, and removing any delegated DNS or MX changes. Where provider-specific operations are needed, document uncertainty and follow that provider’s documented revocation steps."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Remove an email authentication vendor by enumerating every DNS, selector, and permission artifact it used, then stage and verify deletions in a controlled window. This checklist focuses on concrete records and evidence you must collect before, during, and after removal to avoid leaving stale authorization paths or disrupting legitimate mailflows.

## Inventory: enumerate records, owners, and evidence

Start by compiling a single inventory that lists SPF includes, DKIM selectors, DMARC rua/rua URIs, tracking CNAMEs, MX/route changes, delegated subdomains, and any API keys or SMTP credentials the vendor used. Record the DNS owner, change window, and proof of use (example: recent authenticated message headers showing SPF/DKIM alignment). If records are not present in DNS but the vendor had delegated zones or API access, log how that delegation was granted and where to revoke it.
Decision boundary: stop when every auth surface (SPF, DKIM, DMARC, MX, delegated DNS, and application-level credentials) has at least one linked evidence item. Evidence limits: header examples are acceptable but avoid relying on a single historical sample to prove ongoing use.

## Prioritization and scheduling: choose a safe cutover window

Classify items as high-risk (active MX/Sender IPs, DKIM selectors seen in recent headers, shared domain SPF includes) and low-risk (unused selectors, dormant CNAMEs for tracking that show no recent traffic). Schedule removals during low-volume windows and coordinate with recipients or internal bounce monitoring. Sequence: revoke API/SMTP credentials only after DNS paths are removed or test-originating IPs are blocked, to avoid sudden bounces or retry storms.
Evidence limits: you may have provider logs showing no egress for weeks — treat that as directional, not absolute; retain a rollback plan for 48–72 hours after each change.

## Making DNS changes: exact edits and verification steps

For SPF, remove vendor includes and then shorten and re-evaluate SPF length and term order to avoid exceeding lookup limits (per RFC 7208) [1]. For DKIM, remove selectors published by the vendor and ensure no sending system is still signing with them; if you cannot confirm, replace the DNS TXT with a short-lived deny value and monitor failure logs. For DMARC, remove any rua/fo URIs pointing to vendor addresses and update aggregate/reporting destinations.
Verification: use DNS query tools to confirm TTLs, then check live messages for absence of vendor signatures and for any new SPF/DKIM failures. Cite RFC guidance for SPF/DKIM semantics when in doubt [1][2][3].

## Permissions and administrative access: revoke and document

Revoke the vendor’s access to DNS providers, email services, certificate management, and any hosted dashboards. Record who revoked access and time-stamp each revocation. If the vendor managed delegated DNS zones, re-delegate or import zone files into your account and lock down registrar contacts.
Decision boundary: if access cannot be revoked immediately, restrict vendor accounts to read-only and rotate any shared secrets; escalate to legal if contractual access removal is blocked. Note uncertainty about provider-specific APIs — follow provider docs for revocation steps rather than assuming a single method.

## Monitoring and post-removal validation

Monitor bounce rates, DMARC aggregate reports, and inbound complaint rates for 7–14 days after removal. Confirm no new messages contain the vendor’s DKIM selector in headers and that SPF no longer passes based on the vendor includes. Use mailbox sampling to verify end-to-end delivery for critical flows and maintain a ticketed incident response path in case of regressions.
Evidence limits: DMARC reports can be delayed or aggregated; treat absence of reports as inconclusive for the first 48 hours and use message header sampling as a timely check.

## Practical checklist

- [ ] Export a signed inventory of SPF includes, DKIM selectors (with sample headers), DMARC rua/rua URIs, tracking CNAMEs, MX changes, and delegated DNS zones.
- [ ] Confirm last-seen timestamp for each DKIM selector and vendor sending IP using message headers or provider logs.
- [ ] Schedule a maintenance window and notify stakeholders; include rollback owner and TTL-aware timing.
- [ ] Remove vendor SPF include(s); validate SPF string length and lookup count per RFC 7208 [1].
- [ ] Delete DKIM selector DNS TXT records or replace with a short-lived deny value; block vendor-signing keys in sending systems.
- [ ] Remove vendor DMARC reporting URIs and update aggregate/reporting addresses; preserve copies of reports for two weeks.
- [ ] Revoke vendor access to DNS, email admin consoles, certificate stores, and rotate any shared credentials or API keys.
- [ ] Monitor DMARC, SPF, bounce rates, and mailbox headers for 7–14 days; escalate if vendor artifacts still appear.
- [ ] Archive evidence of change (DNS queries, screenshots, ticket notes) and mark the inventory as retired with timestamps and owner.

## Where RepMail fits

Use this checklist as an operational decision aid in RepMail workflows: attach the inventory and evidence items to the offboarding ticket, use the checklist items as explicit task steps, and record post-change monitoring results as ticketed evidence. The checklist structure helps outbound teams avoid stale auth surfaces and provides clear stop conditions and owners for each change.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Authentication Drift Detection: Compare Intended and Observed Senders](/repmail/learn/infrastructure/authentication-drift-detection)
- [Authentication-Results Header: Reading Receiver Assertions](/repmail/learn/glossary/authentication-results-header)


## Sources

[1]: https://www.rfc-editor.org/rfc/rfc7208 "IETF RFC reference"
[2]: https://www.rfc-editor.org/rfc/rfc7489 "IETF RFC reference"
[3]: https://www.rfc-editor.org/rfc/rfc6376 "IETF RFC reference"
