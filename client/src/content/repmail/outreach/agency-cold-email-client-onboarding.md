---
contentType: guide
slug: "agency-cold-email-client-onboarding"
title: "Agency Client Onboarding for Cold Email Infrastructure"
description: "A reusable agency intake, ownership, authentication, list, copy, and go/no-go workflow for launching a client outreach program."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["agency-outreach", "client-onboarding", "cold-email", "operations"]
featured: false
collections: ["tool-reviews"]
learningPaths: ["getting-started"]
keyTakeaways:
  - "Collect ownership and decision rights before configuring anything."
  - "Treat DNS, list, copy, and test evidence as separate launch gates."
  - "A completed checklist supports a decision; it does not guarantee inbox placement."
prerequisites:
  - label: "Separate sending domains from core mail"
    href: "/repmail/learn/infrastructure/separate-sending-domain-for-cold-email"
commonMistakes:
  - "Starting setup before recording who owns the domain, mailboxes, list, and approvals."
  - "Treating an imported list as approved without checking exclusions and suppression records."
  - "Calling a test send a launch approval without recording the recipient, render, and reviewer."
faqs:
  - question: "Who should complete the intake?"
    answer: "The agency account owner should coordinate it, while the client confirms business facts, domain access, audience, exclusions, and approval authority."
  - question: "Does this checklist guarantee delivery?"
    answer: "No. It creates evidence for a controlled launch. Provider behavior, recipient expectations, list quality, and policy can still affect delivery and placement."
nextStep:
  label: "Next: verify email authentication"
  href: "/repmail/learn/deliverability/email-authentication"
  description: "Check the records before client approval."
assets:
  - type: checklist
    title: "Agency Agency Client Onboarding for Cold Email Infrastructure worksheet"
    content:
      - "Record the owner, scope, evidence link, status, and checked date for each control."
      - "Mark the item HOLD when required evidence is missing or a decision is uncertain."
      - "Attach the completed record to the client or incident review before proceeding."
---
A client campaign is ready to launch only when ownership, audience, sending identity, message, suppression data, and test evidence each have an explicit owner and pass a recorded gate. Use the workflow below as the intake form and sign-off record; do not treat it as an inbox-placement promise.

## 1. Capture the client intake

Record these fields before requesting DNS or mailbox access:

| Field | Required answer | Owner |
| --- | --- | --- |
| Business objective | What conversation is the campaign intended to start? | Client |
| Audience and geography | Roles, company types, locations, and exclusions | Client + agency |
| Sending identity | From domain, reply address, display name, and postal address | Client |
| Data provenance | Source, collection date, validation method, and permitted use | Client + agency |
| Suppression inputs | Existing opt-outs, complaints, customers, competitors, and do-not-contact files | Client |
| Approvers | Named copy, audience, and launch approver with backup | Client |
| Access boundary | Who can change DNS, mailboxes, lists, and campaigns | Both |

The [outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules) guide helps turn the suppression answer into an operating rule. Do not let a blank answer become an implicit approval.

## 2. Use ordered launch gates

**Gate A — ownership.** Confirm the client can authorize use of the domain and mailbox inventory. The agency should not assume that a shared login or a forwarded credential establishes authority.

**Gate B — identity and authentication.** Confirm the sending domain, SPF/DKIM/DMARC plan, reply handling, and record owner. Use the [email authentication guide](/repmail/learn/deliverability/email-authentication) and keep a timestamped verification result.

**Gate C — data and suppression.** Import only the fields needed for the campaign. Match the new audience against client-local and required global exclusions before copy is approved. Preserve the source and review date.

**Gate D — copy and rendering.** The client approves the sequence, sender identity, claims, links, opt-out path, and fallback text. Send test messages to controlled addresses and record desktop/mobile or plain-text observations where relevant.

**Gate E — go/no-go.** The delivery lead records `GO`, `HOLD`, or `NO-GO`, with evidence links and an expiry date for facts that can change. A hold is the correct result when access, source, suppression, authentication, or approval evidence is missing.

## RACI-style handoff

| Work | Agency delivery | Client owner | Client approver |
| --- | --- | --- | --- |
| Infrastructure changes | R | A/C | I |
| Audience and exclusions | R | A | C |
| Message claims and offer | C | R | A |
| Test render and seed send | R | C | A |
| Launch decision | R | C | A |

## Where RepMail fits

RepMail is useful only after these responsibilities are clear. The [repository's documented current sending path](https://github.com/AKSINGH-0704/Let-sZero/blob/main/README.md) uses AWS SES over SMTP and AWS SNS feedback events for campaign delivery telemetry. That documents the repository path, not every customer's configuration: it does not by itself prove a workspace's provider scope, account or region, IP pool, mailbox hosting, or DNS/TLS automation. Verify those details per workspace—including the active provider, IP allocation, mailbox ownership, DNS/TLS responsibilities, and event path—before treating any step as a product-specific procedure. The client still owns the audience decision, data provenance, approvals, and applicable compliance review.

## Related internal resources

- [Cold email compliance checklist](/repmail/learn/cold-email/cold-email-compliance-checklist)
- [Best cold email tools for agencies](/repmail/learn/outreach/best-cold-email-tools-for-agencies)

## Sources

[1]: https://instantly.ai/blog/client-onboarding-email-best-practices-agency-playbook/ "Instantly agency client onboarding playbook"
[2]: https://support.google.com/mail/answer/81126?hl=en "Google email sender guidelines"
[3]: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business "FTC CAN-SPAM compliance guide"
