---
product: repmail
academy: infrastructure
contentType: tutorial
slug: inventory-systems-sending-as-domain
title: "How to Inventory Every System Sending as Your Domain"
description: "Find senders across DNS, headers, provider consoles, applications, and DMARC reports, then mark unknown sources for investigation."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["sender-inventory", "domain-security", "dmarc"]
collections: ["email-infrastructure-decisions", "email-platform-essentials"]
learningPaths: ["email-infrastructure"]

keyTakeaways:
  - "Use several evidence sources because no single inventory is complete."
  - "Map each sender to a domain, selector, provider, owner, and business purpose."
  - "Keep unknown sources visible until an owner verifies or retires them."
faqs:
  - question: "Can DMARC reports identify every sender?"
    answer: "No. They provide aggregate observations from participating receivers and can be delayed or incomplete. Combine them with DNS, headers, consoles, and application configuration."
  - question: "What is the most useful header evidence?"
    answer: "Record From, Return-Path, DKIM d= and selector, Authentication-Results, Message-ID, and timestamps. These fields help connect a message to a sending system without exposing its body."
  - question: "Should an unknown sender be removed immediately?"
    answer: "Preserve evidence and investigate first. Immediate deletion can break a legitimate workflow or erase clues. Use a controlled containment and rollback plan."
nextStep:
  label: "Review authentication change management"
  href: /repmail/learn/deliverability/email-authentication-change-management
  description: "Continue with the closest operational guide."
assets:
  - type: template
    title: Sender discovery worksheet
    content: {"headers": ["Source", "Observed sender", "Domain or selector", "Provider / app", "Owner", "Status"], "rows": [["DNS", "", "", "", "", ""], ["Message headers", "", "", "", "", ""], ["Provider console", "", "", "", "", ""], ["Application config", "", "", "", "", ""], ["DMARC aggregate data", "", "", "", "", ""]]}
---

To inventory every system sending as your domain, triangulate evidence. Start with DNS, then compare real message headers, provider consoles, application configuration, and DMARC aggregate data. The output is not a list of vendors; it is a map from sender identity to owner, purpose, and control.

## 1. Build the domain map

List the organizational domain, every known sending subdomain, and any reply or tracking domain. Capture authoritative MX, SPF, DKIM selector, and DMARC records using the [DNS records guide](/repmail/learn/infrastructure/dns-records-for-email). Note the lookup time and nameserver. A record shows what is published, not which applications are actively sending.

## 2. Inspect messages and provider consoles

Collect representative headers from transactional, marketing, support, and outreach messages. Record the visible From domain, Return-Path or envelope sender, DKIM d= domain and selector, Message-ID, receiving path, and authentication results. Use the [email authentication guide](/repmail/learn/deliverability/email-authentication) and [authentication change-management workflow](/repmail/learn/deliverability/email-authentication-change-management) to keep authentication evidence separate from placement conclusions.

Then inspect provider consoles, SMTP credentials, API integrations, web forms, CRM automations, scheduled jobs, and infrastructure-as-code. Search for domains, selectors, relay hostnames, API key identifiers, and webhook endpoints. Ask application owners about dormant integrations; an old form or staging environment can remain authorized long after its business purpose ends.

## 3. Reconcile DMARC aggregate data

Aggregate reports can reveal source IPs and authentication outcomes that do not appear in a documentation inventory. Group rows by source, From domain, SPF alignment, DKIM alignment, and policy disposition. Do not treat report counts as a complete message ledger. Record source IPs or providers that have no owner and classify them as **unknown** pending investigation.

## 4. Decide what to do with unknowns

For each unknown, check deployment history, provider accounts, DNS changes, and application logs before editing records. If it is legitimate, assign an owner and document its purpose. If it is obsolete, schedule credential revocation and a controlled DNS cleanup. If it is suspicious, preserve headers and report evidence before containment. Re-run the inventory after the change and record what disappeared or remained.

## Related resources

The [Email Infrastructure academy](/repmail/learn/infrastructure/email-infrastructure-explained) is the appropriate hub for domain and sender ownership questions.

This workflow should be checked against the cited standards and current provider documentation [1].

## References

[1]: https://knowledge.workspace.google.com/admin/security/set-up-spf "Google Workspace SPF setup"
[2]: https://knowledge.workspace.google.com/admin/security/set-up-dmarc "Google Workspace DMARC setup"
[3]: https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about "Microsoft Defender email authentication"
[4]: https://www.rfc-editor.org/rfc/rfc7489 "RFC 7489: DMARC"

