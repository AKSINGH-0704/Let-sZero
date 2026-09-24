---
product: repmail
academy: infrastructure
contentType: tutorial
slug: tracking-domain-migration
title: "Tracking Domain Migration Without Breaking Campaigns"
description: "Plan a tracking-domain cutover with DNS, TLS, redirects, unsubscribe paths, historical links, and before-and-after QA."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["tracking-domain", "dns", "migration"]
collections: ["email-infrastructure-decisions", "email-platform-essentials"]
learningPaths: ["email-infrastructure"]

keyTakeaways:
  - "Treat click, open, and unsubscribe links as separate migration surfaces."
  - "Test old and new links with real templates before switching traffic."
  - "Keep rollback and historical-link behavior explicit."
faqs:
  - question: "Does a tracking domain change alter SPF or DKIM?"
    answer: "Not necessarily. Tracking hosts are separate from the visible From and authentication records, but the change can still affect links, TLS, redirects, and event correlation."
  - question: "Should the old tracking domain be deleted immediately?"
    answer: "Only after you understand historical-link and unsubscribe requirements. Keeping it temporarily may support old messages, but it also creates another surface to secure and monitor."
  - question: "What is the highest-risk test?"
    answer: "Follow an unsubscribe link from a real rendered message and confirm the intended suppression occurs. A successful click test alone is not enough."
nextStep:
  label: "Run the pre-send deliverability checklist"
  href: /repmail/learn/deliverability/pre-send-deliverability-checklist
  description: "Continue with the closest operational guide."
assets:
  - type: checklist
    title: Tracking-domain cutover checklist
    content: {"headers": ["Check", "Before cutover", "After cutover"], "rows": [["CNAME and certificate", "[ ]", "[ ]"], ["Click and open rewrite", "[ ]", "[ ]"], ["Unsubscribe and preference links", "[ ]", "[ ]"], ["Historical links and redirects", "[ ]", "[ ]"], ["Event IDs and observability", "[ ]", "[ ]"]]}
---

A tracking-domain migration changes more than a CNAME. It can affect rewritten click URLs, open pixels, unsubscribe links, certificate validation, historical campaign links, and the event data that connects a click to a message. Plan it as a reversible cutover.

## Map every dependency

Inventory the old hostname in templates, provider settings, redirect rules, preference pages, suppression links, documentation, and analytics pipelines. Record whether the hostname is used for clicks, opens, images, unsubscribe actions, or all four. Compare the change with [DNS records for email](/repmail/learn/infrastructure/dns-records-for-email), but do not assume a tracking record authenticates the mail stream.

## Prepare and test the new path

Publish the provider-required CNAME or equivalent record, provision TLS, and verify the hostname from outside your internal resolver. Use a staging or controlled campaign to inspect the final URL, redirect chain, certificate, query parameters, and unsubscribe behavior. Test a valid link, an expired or unknown link, a preference update, and an opt-out. Keep the [pre-send checklist](/repmail/learn/deliverability/pre-send-deliverability-checklist) focused on message QA while this runbook covers the domain cutover.

Check event correlation: a click or unsubscribe should retain the message or recipient identifier your system needs, without placing personal data in a public URL unnecessarily. Confirm that [sending observability](/repmail/learn/email-platform/email-sending-observability) still receives the relevant event after the hostname changes.

## Switch, monitor, and roll back

Change provider configuration only after DNS and TLS checks pass. Send a small controlled batch, inspect headers and links, and compare event counts with the old path. Preserve the old hostname for a planned period if historical links must continue working, or document a safe redirect. If redirects, unsubscribe, certificates, or event correlation fail, revert the provider setting and preserve evidence before retrying.

## Related resources

Use the [Email Infrastructure academy](/repmail/learn/infrastructure/email-infrastructure-explained) as the migration hub.

This workflow should be checked against the cited standards and current provider documentation [1].

## Edge cases to include in the change record

Check templates that were sent before the cutover, because their links may outlive the campaign configuration. Test links in plain text, HTML, mobile rendering, and forwarded messages. Confirm that unsubscribe and preference URLs do not require a session that recipients will not have. If a provider signs or rewrites links differently by stream, test each stream rather than extrapolating from one message.

## References

[1]: https://support.google.com/mail/answer/81126?hl=en-GB "Google Workspace sender guidelines"
[2]: https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about "Microsoft Defender email authentication"

