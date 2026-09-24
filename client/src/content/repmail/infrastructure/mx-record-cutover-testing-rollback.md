---
product: repmail
academy: infrastructure
contentType: tutorial
slug: mx-record-cutover-testing-rollback
title: "MX Record Cutover: Testing and Rollback"
description: "Plan an MX cutover with current-state capture, TTL review, mailbox readiness, test messages, and explicit rollback criteria."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["mx", "migration", "inbound-mail"]
collections: ["email-infrastructure-decisions", "email-platform-essentials"]
learningPaths: ["email-infrastructure"]

keyTakeaways:
  - "MX controls inbound delivery; it does not authenticate outbound mail."
  - "Prepare the destination before changing DNS."
  - "Use test messages and evidence, not a promised propagation time, to decide completion."
faqs:
  - question: "Does changing MX change where outbound mail is sent?"
    answer: "Not by itself. MX describes inbound delivery for a domain; outbound routing and authentication use other configuration and provider paths."
  - question: "How long will propagation take?"
    answer: "It depends on resolver caching and TTL behavior. Measure authoritative and recursive answers instead of guaranteeing a duration."
  - question: "What should trigger rollback?"
    answer: "Use observable failures such as missing test mail, broken aliases or forwarding, or an unready destination. Define triggers before the change."
nextStep:
  label: "Review email infrastructure fundamentals"
  href: /repmail/learn/infrastructure/email-infrastructure-explained
  description: "Continue with the closest operational guide."
assets:
  - type: checklist
    title: MX cutover checklist
    content: {"headers": ["Control", "Done"], "rows": [["Current MX and TTL captured", "[ ]"], ["Destination mailboxes and routing ready", "[ ]"], ["Forwarding, aliases, and authentication reviewed", "[ ]"], ["Internal and external test messages pass", "[ ]"], ["Rollback owner and trigger defined", "[ ]"]]}
---

An MX cutover changes where other mail servers deliver messages for a domain. It is an inbound-routing migration, not an outbound SPF, DKIM, or DMARC change by itself. Plan the receive path separately and never promise a universal propagation time.

## Capture the current state

Record every MX answer, priority, TTL, authoritative nameserver, mailbox, alias, forwarding rule, and third-party route. Use [DNS records for email](/repmail/learn/infrastructure/dns-records-for-email) to keep the record inventory separate from outbound authentication. Confirm whether the domain also sends mail; changing MX does not automatically change the SMTP identity used for outbound messages.

Prepare destination mailboxes, aliases, authentication, spam controls, and administrative access before editing DNS. Identify messages that must be retained and any forwarding or journaling dependencies. Lowering TTL shortly before a change may reduce some caching duration, but it cannot force every resolver to refresh on schedule.

## Test before and after

Use the destination’s test facilities and send messages from internal and external accounts. Test a primary mailbox, alias, nonexistent recipient, forwarding path, attachment, and reply. After the change, query authoritative and multiple recursive resolvers, then repeat external tests from an independent network. Preserve timestamps and headers.

Monitor old and new routes during the transition where the architecture permits. Define rollback triggers such as failed mailbox access, missing expected mail, broken forwarding, or an unverified destination. Rollback means restoring the prior MX set and confirming the same evidence path; it is not simply deleting the new record.

## Close the change

Keep the old route only as long as the migration plan requires, with security and ownership documented. Update provider consoles, runbooks, monitoring, and the [email infrastructure guide](/repmail/learn/infrastructure/email-infrastructure-explained). If the change is part of a provider migration, link it to the platform migration runbook.

## Related resources

The [Email Infrastructure academy](/repmail/learn/infrastructure/email-infrastructure-explained) covers the receive and send boundaries.

This workflow should be checked against the cited standards and current provider documentation [1].

## Edge cases to document

Shared mailboxes, aliases, forwarding, journaling, and catch-all behavior can fail even when a primary mailbox receives a test. Include external senders, internal senders, replies, and a nonexistent address in the test set. If a third party receives mail before forwarding it onward, identify that hop and its retention or failure behavior before declaring the cutover complete.

## References

[1]: https://www.rfc-editor.org/rfc/rfc5321 "RFC 5321: Simple Mail Transfer Protocol"

