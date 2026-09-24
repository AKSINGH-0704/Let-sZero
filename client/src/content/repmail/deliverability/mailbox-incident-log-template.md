---
product: repmail
academy: deliverability
contentType: template
slug: mailbox-incident-log-template
title: "Mailbox Incident Log: Record Throttling and Placement Loss"
description: "A practical, provider-aware guide to mailbox incident log deliverability, with a decision table, workflow, and evidence-based caveats."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["warm-up", "mailbox-operations", "deliverability"]
collections: ["escaping-the-spam-folder"]
learningPaths: ["deliverability-mastery"]

keyTakeaways:
  - "Mailbox Incident Log: What to Record During Throttling or Placement Loss is an operating decision, not a universal volume promise."
  - "Use provider, mailbox, domain, campaign, and timestamp evidence before changing scope."
  - "Keep a pause, owner, suppression path, and rollback condition explicit."
faqs:
  - question: "When should I start an incident log?"
    answer: "Start when throttling, placement loss, access failure, unexpected bounce/complaint behavior, or another material deviation is observed."
  - question: "What is the minimum useful record?"
    answer: "Timestamp, provider, mailbox, domain, campaign, message or event ID, response, action, owner, and outcome."
  - question: "Should hypotheses go in the log?"
    answer: "Yes, but label them as hypotheses and keep them separate from observed facts."
nextStep:
  label: "Read the complete deliverability guide"
  href: "/repmail/learn/deliverability/complete-guide-to-email-deliverability"
  description: "Use the hub to connect mailbox operations with authentication, reputation, placement, and list quality."
assets:
  - type: table
    title: "Decision table and operating worksheet"
    content:
      headers: ["Field", "Why it matters"]
      rows:
        - ["Time and timezone", "Align provider and internal events"]
        - ["Mailbox/domain/provider", "Scope the affected identity"]
        - ["Campaign/content/list", "Find shared changes"]
        - ["Response and message ID", "Preserve provider evidence"]
        - ["Action/owner/outcome", "Make recovery auditable"]
  - type: checklist
    title: "Before you act"
    content:
      - "Open the log at first detection and freeze the observation window before changing configuration."
      - "Record provider response text, mailbox state, domain, campaign, content version, list segment, queue state, and message identifiers."
      - "Separate observed facts from hypotheses and record every action with an owner and timestamp."
      - "Close with outcome, unresolved questions, resume criteria, and a link to the relevant monitoring record."
---

Mailbox incident log deliverability starts with a scoped decision: capturing the evidence needed to investigate throttling, access loss, placement change, or other mailbox incidents. There is no provider-neutral shortcut or universal safe number. Build a small, observable plan, record the evidence it produces, and make the pause and recovery path explicit before adding volume or complexity.

For context, start with the [deliverability map](/repmail/learn/deliverability/complete-guide-to-email-deliverability), then review [why a new domain needs a gradual warm-up](/repmail/learn/deliverability/why-new-domains-need-warm-up), the [difference between a sending domain and a mailbox](/repmail/learn/infrastructure/sending-domain-vs-mailbox), and [email-sending observability](/repmail/learn/email-platform/email-sending-observability) before changing production routing.

## Decide what the system must prove

The first question is not how fast to send. It is what this workflow must prove about capturing the evidence needed to investigate throttling, access loss, placement change, or other mailbox incidents. Separate authentication and account access from recipient outcomes, and separate a provider ceiling from an internal operating limit. The table below turns that distinction into fields an operator can review.

| Field | Why it matters |
| --- | --- |
| Time and timezone | Align provider and internal events |
| Mailbox/domain/provider | Scope the affected identity |
| Campaign/content/list | Find shared changes |
| Response and message ID | Preserve provider evidence |
| Action/owner/outcome | Make recovery auditable |

## Practical workflow

1. **Open the log at first detection and freeze the observation window before changing configuration..**
2. **Record provider response text, mailbox state, domain, campaign, content version, list segment, queue state, and message identifiers..**
3. **Separate observed facts from hypotheses and record every action with an owner and timestamp..**
4. **Close with outcome, unresolved questions, resume criteria, and a link to the relevant monitoring record..**

The useful output is a decision record: what was observed, what changed, who owns the next action, and what would cause a pause or rollback. A provider document can define a limit or behavior, but it cannot tell you that your audience, content, or mailbox mix is safe for a particular campaign.

## Edge cases and limits

Do not overwrite the original evidence after a fix. A successful retry can hide the first response, queue state, or configuration that explains the incident. Preserve provider responses and timestamps, and label unmeasured assumptions as assumptions. If the issue spans multiple providers, compare their native evidence before normalizing it into one report.

## Where RepMail fits

RepMail can be used as the operational layer for the workflow: keep mailbox and campaign identifiers attached to events, use suppression and reply ownership as explicit controls, and review outcomes by provider rather than relying on a single aggregate. It does not turn a provider limit or a warm-up signal into a delivery guarantee.

## References

- [https://support.google.com/mail/answer/81126?hl=en](https://support.google.com/mail/answer/81126?hl=en)
- [https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace](https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace)
- [https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits](https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits)
- [https://support.google.com/mail/answer/6227174](https://support.google.com/mail/answer/6227174)
