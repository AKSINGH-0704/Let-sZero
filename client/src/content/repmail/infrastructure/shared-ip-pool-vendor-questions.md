---
product: repmail
academy: infrastructure
contentType: comparison
slug: shared-ip-pool-vendor-questions
title: "Shared IP Pool: Questions to Ask a Sending Vendor"
description: "Use this due-diligence checklist to understand shared IP governance, isolation, incident response, feedback data, and exit options."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["shared-ip", "vendor-due-diligence", "email-platforms"]
collections: ["email-infrastructure-decisions", "email-platform-essentials"]
learningPaths: ["email-infrastructure"]

keyTakeaways:
  - "Ask how pool membership and traffic are governed, not whether a pool is simply “clean.”"
  - "Request evidence about incident communication, isolation controls, and feedback exports."
  - "Treat shared infrastructure as a trade-off to evaluate against your message mix and control needs."
faqs:
  - question: "Is a dedicated IP always safer than a shared pool?"
    answer: "No. It changes who shares the IP reputation and who operates the ramp, monitoring, and remediation. The better choice depends on volume, control, and operational capacity."
  - question: "What evidence should a vendor provide?"
    answer: "Ask for event definitions, identifiers, timestamps, retention, incident procedures, isolation controls, and a practical export path. Do not rely on a generic uptime or deliverability claim."
  - question: "Should vendors disclose other customers in the pool?"
    answer: "They may not disclose customer identities. They should still explain pool governance, traffic boundaries, abuse response, and what evidence your account receives."
nextStep:
  label: "Compare shared and dedicated IP trade-offs"
  href: /repmail/learn/infrastructure/shared-vs-dedicated-ip
  description: "Continue with the closest operational guide."
assets:
  - type: checklist
    title: Shared-IP vendor questionnaire
    content: {"headers": ["Question", "Evidence to request", "Decision note"], "rows": [["How are senders assigned to pools?", "Written allocation and reassignment process", ""], ["How are abuse signals handled?", "Escalation and notification procedure", ""], ["Can traffic be isolated?", "Account, domain, IP, or stream controls", ""], ["What feedback is exportable?", "Event fields, retention, API or file export", ""], ["How do we exit?", "Migration, DNS, data, and suppression process", ""]]}
---

A shared IP pool is a vendor operating model, not a quality guarantee. Before buying, ask how senders are grouped, how abuse is contained, and what evidence you will receive when delivery changes. The goal is not to rank providers; it is to expose the controls that affect your risk and your ability to investigate.

## Start with the traffic boundary

Ask what exactly is shared: an IP address, a pool, a provider account, a queue, a reputation domain, or only the software interface. Ask whether transactional, marketing, and unsolicited or prospecting streams are separated. The answer should be specific enough to map a message to the relevant domain, IP, account, and event stream. Compare this with [shared versus dedicated IP](/repmail/learn/infrastructure/shared-vs-dedicated-ip), which explains why a dedicated address is not automatically an upgrade.

Request the vendor’s process for assigning, moving, or quarantining a sender. You do not need undocumented scoring formulas. You do need to know who can change the boundary, what approval is required, and how quickly an affected customer is told.

## Test incident handling before an incident

Ask for a written escalation path for block responses, complaint spikes, compromised credentials, and provider policy changes. Clarify which events are delivered to you, their identifiers, retry behavior, retention, and whether you can export them. A platform that reports only “sent” makes it difficult to separate application success from provider acceptance and recipient outcomes. The [sending-platform selection guide](/repmail/learn/email-platform/email-sending-platform-selection) gives a broader decision frame, while [sending observability](/repmail/learn/email-platform/email-sending-observability) lists the event fields to verify.

## Evaluate isolation and exit terms

Ask whether domains, credentials, suppression lists, webhooks, and rate limits can be separated by customer or stream. Ask what happens when one tenant is compromised: can the vendor pause only that tenant, preserve evidence, and prevent a global credential reset from breaking unrelated traffic?

Request an export test using non-sensitive fixtures. Confirm that you can retrieve message identifiers, delivery events, bounces, complaints, suppressions, and timestamps in a usable form. Document retention, deletion, and access controls. Also ask how you would migrate DNS, templates, suppression state, and historical links if you leave.

## Decision rule

Choose the model whose controls match your operational responsibility. Shared infrastructure may be reasonable when the vendor provides clear boundaries and evidence. If your requirements demand independent incident containment or a separately managed reputation surface, document why and what additional operational work that choice creates. Avoid promises that any model guarantees inbox placement.

## Related resources

Use the [Email Infrastructure academy](/repmail/learn/infrastructure/email-infrastructure-explained) for the surrounding architecture decisions.

This workflow should be checked against the cited standards and current provider documentation [1].

## References

[1]: https://support.google.com/mail/answer/81126?hl=en-GB "Google Workspace sender guidelines"
[2]: https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about "Microsoft Defender email authentication"
[3]: https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html "Amazon SES event publishing"

