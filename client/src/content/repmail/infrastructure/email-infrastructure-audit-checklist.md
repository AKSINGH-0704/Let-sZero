---
product: repmail
academy: infrastructure
contentType: template
slug: email-infrastructure-audit-checklist
title: "Email Infrastructure Audit Checklist"
description: "Audit DNS, senders, credentials, vendors, reputation, and evidence with a dated worksheet that assigns owners and remediation."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["email-infrastructure", "audit", "dns", "access-control"]
collections: ["email-infrastructure-decisions", "email-platform-essentials"]
learningPaths: ["email-infrastructure"]

keyTakeaways:
  - "Audit the whole sending system, not only the DNS zone."
  - "Record evidence, owner, verification date, risk, and next action for every finding."
  - "Separate observed receiver or provider evidence from vendor claims and assumptions."
faqs:
  - question: "What should an email infrastructure audit produce?"
    answer: "A dated inventory and remediation queue. Each row should identify the system, owner, evidence, last verification date, risk, and next action."
  - question: "Does a passing SPF or DKIM lookup prove delivery?"
    answer: "No. It shows that a published authentication component can be found. Receiver acceptance and placement require message and provider evidence as well."
  - question: "How often should the audit be repeated?"
    answer: "Choose a cadence that matches your change rate, and repeat after provider, domain, credential, or DNS changes. The evidence should carry its own next-review date."
nextStep:
  label: "Run sending observability checks"
  href: /repmail/learn/email-platform/email-sending-observability
  description: "Continue with the closest operational guide."
assets:
  - type: checklist
    title: Audit worksheet
    content: {"headers": ["Area", "Evidence to capture", "Owner", "Last verified", "Risk / action"], "rows": [["Domains and DNS", "Authoritative MX, SPF, DKIM, DMARC answers", "", "", ""], ["Sending systems", "Provider, application, From domain, IP or relay", "", "", ""], ["Access", "API keys, SMTP users, IAM roles, admin owners", "", "", ""], ["Signals", "Bounces, complaints, blocks, placement evidence", "", "", ""], ["Change history", "Recent migrations, DNS edits, volume changes", "", "", ""]]}
---

An **email infrastructure audit** should answer one question: can your team name every system that sends or receives mail for each important domain, show who controls it, and prove that its current configuration is intentional? Use a dated worksheet rather than a one-time “looks good” review. The result is a backlog with owners, evidence, and a recheck date.

## 1. Set the scope and preserve the baseline

List each organizational domain and sending subdomain. Include transactional mail, marketing, cold outreach, contact forms, support tools, CRM workflows, and employee mail. Capture authoritative DNS answers before changing anything. The [email infrastructure guide](/repmail/learn/infrastructure/email-infrastructure-explained) explains how domains, DNS, relays, and reputation fit together; this audit turns that model into evidence.

For every record, store the lookup time, nameserver queried, returned value, and TTL. Record the provider console or application configuration that claims ownership. A DNS answer proves what is published; it does not prove that every application uses the record or that a message will reach the inbox.

## 2. Inventory senders and access

For each sender, record the provider account, application, envelope sender, visible From domain, DKIM selector, sending IP or relay, event destination, and business owner. Compare the inventory with [DNS records for email](/repmail/learn/infrastructure/dns-records-for-email) and with message headers from representative messages. Mark unexplained senders as **unknown**, not “safe” or “malicious,” until an owner confirms them.

Review SMTP passwords, API keys, IAM roles, shared admin accounts, and recovery paths. Do not paste secrets into the worksheet. Record only a secret identifier, storage location, scope, last rotation, and revocation owner. Use [email authentication change management](/repmail/learn/deliverability/email-authentication-change-management) when a finding requires a coordinated DNS or key change.

## 3. Review reputation and observability

Attach receiver evidence to each sending stream: bounce and complaint events, block responses, provider dashboards, and a sample of headers. Keep dates and cohorts so a recent incident is not mistaken for a permanent property. Verify that enqueue, provider acceptance, retry, bounce, complaint, and suppression states are observable; [email-sending observability](/repmail/learn/email-platform/email-sending-observability) provides the event-oriented model.

## 4. Close findings safely

Rank findings by blast radius and reversibility. Unknown senders, leaked or over-broad credentials, broken authentication, and unhandled complaints deserve explicit owners and deadlines. Before a change, write the expected result, verification method, and rollback. Afterward, update the worksheet with observed evidence rather than marking the task complete because a dashboard turned green.

## Related resources

Use the [Email Infrastructure academy](/repmail/learn/infrastructure/email-infrastructure-explained) as the hub for the surrounding decisions.

This workflow should be checked against the cited standards and current provider documentation [1].

## References

[1]: https://support.google.com/mail/answer/81126?hl=en-GB "Google Workspace sender guidelines"
[2]: https://knowledge.workspace.google.com/admin/security/set-up-spf "Google Workspace SPF setup"
[3]: https://knowledge.workspace.google.com/admin/security/set-up-dmarc "Google Workspace DMARC setup"
[4]: https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about "Microsoft Defender email authentication"

