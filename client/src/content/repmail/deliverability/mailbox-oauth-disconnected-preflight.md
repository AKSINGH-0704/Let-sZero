---
product: repmail
academy: deliverability
contentType: template
slug: mailbox-oauth-disconnected-preflight
title: "Disconnected Mailbox OAuth: Preflight Checks Before a Campaign Runs"
description: "A practical, provider-aware guide to mailbox OAuth disconnected, with a decision table, workflow, and evidence-based caveats."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["warm-up", "mailbox-operations", "deliverability"]
collections: ["escaping-the-spam-folder"]
learningPaths: ["deliverability-mastery"]

keyTakeaways:
  - "Disconnected Mailbox OAuth: Preflight Checks Before a Campaign Runs is an operating decision, not a universal volume promise."
  - "Use provider, mailbox, domain, campaign, and timestamp evidence before changing scope."
  - "Keep a pause, owner, suppression path, and rollback condition explicit."
faqs:
  - question: "What causes OAuth disconnection?"
    answer: "Possible causes include revoked consent, expired or invalid tokens, account changes, scope changes, or provider/admin policy changes. Inspect evidence rather than guessing."
  - question: "Should I keep retrying while disconnected?"
    answer: "No. Pause new work and retries until the connection state and queued messages are understood."
  - question: "What is a safe reconnect test?"
    answer: "Use a controlled message to an approved test address, verify send and receive behavior, then check reply, bounce, logging, and suppression handling."
nextStep:
  label: "Read the complete deliverability guide"
  href: "/repmail/learn/deliverability/complete-guide-to-email-deliverability"
  description: "Use the hub to connect mailbox operations with authentication, reputation, placement, and list quality."
assets:
  - type: table
    title: "Decision table and operating worksheet"
    content:
      headers: ["Check", "Question", "Evidence"]
      rows:
        - ["Connection", "Is the token present and accepted?", "Provider response and timestamp"]
        - ["Consent", "Was access revoked or scope changed?", "Admin/user audit record"]
        - ["Workflow", "Is the mailbox still eligible?", "Campaign assignment and pause state"]
        - ["Test", "Can send, receive, and reply work?", "Controlled test message and reply"]
  - type: checklist
    title: "Before you act"
    content:
      - "Stop new assignment and capture the mailbox, provider, account, campaign, and last successful event."
      - "Check token status, consent, scopes, account access, and any provider or admin change."
      - "Reconnect only through the approved flow; verify that the requested scope matches the documented workflow."
      - "Run a controlled send, receive, reply, and bounce-path test, then re-enable campaign work deliberately."
---

Mailbox oauth disconnected starts with a scoped decision: diagnosing a disconnected mailbox OAuth connection before a campaign can enqueue or send. There is no provider-neutral shortcut or universal safe number. Build a small, observable plan, record the evidence it produces, and make the pause and recovery path explicit before adding volume or complexity.

For context, start with the [deliverability map](/repmail/learn/deliverability/complete-guide-to-email-deliverability), then review [why a new domain needs a gradual warm-up](/repmail/learn/deliverability/why-new-domains-need-warm-up), the [difference between a sending domain and a mailbox](/repmail/learn/infrastructure/sending-domain-vs-mailbox), and [email-sending observability](/repmail/learn/email-platform/email-sending-observability) before changing production routing.

## Decide what the system must prove

The first question is not how fast to send. It is what this workflow must prove about diagnosing a disconnected mailbox OAuth connection before a campaign can enqueue or send. Separate authentication and account access from recipient outcomes, and separate a provider ceiling from an internal operating limit. The table below turns that distinction into fields an operator can review.

| Check | Question | Evidence |
| --- | --- | --- |
| Connection | Is the token present and accepted? | Provider response and timestamp |
| Consent | Was access revoked or scope changed? | Admin/user audit record |
| Workflow | Is the mailbox still eligible? | Campaign assignment and pause state |
| Test | Can send, receive, and reply work? | Controlled test message and reply |

## Practical workflow

1. **Stop new assignment and capture the mailbox, provider, account, campaign, and last successful event..**
2. **Check token status, consent, scopes, account access, and any provider or admin change..**
3. **Reconnect only through the approved flow.**
4. **Run a controlled send, receive, reply, and bounce-path test, then re-enable campaign work deliberately..**

The useful output is a decision record: what was observed, what changed, who owns the next action, and what would cause a pause or rollback. A provider document can define a limit or behavior, but it cannot tell you that your audience, content, or mailbox mix is safe for a particular campaign.

## Edge cases and limits

A reconnect can restore access without restoring correct ownership, suppression, or reply routing. Treat access recovery and workflow readiness as separate checks. Preserve provider responses and timestamps, and label unmeasured assumptions as assumptions. If the issue spans multiple providers, compare their native evidence before normalizing it into one report.

## Where RepMail fits

RepMail can be used as the operational layer for the workflow: keep mailbox and campaign identifiers attached to events, use suppression and reply ownership as explicit controls, and review outcomes by provider rather than relying on a single aggregate. It does not turn a provider limit or a warm-up signal into a delivery guarantee.

## References

- [https://support.google.com/mail/answer/81126?hl=en](https://support.google.com/mail/answer/81126?hl=en)
- [https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits](https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits)
