---
product: repmail
academy: lead-generation
contentType: guide
slug: shared-mailboxes-team-aliases-suppression
title: "Handling Shared Mailboxes and Team Aliases in Suppression Rules"
description: "Handle shared mailboxes and team aliases without assuming one address represents every person or every preference behind it."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["shared mailbox", "team aliases", "suppression", "role addresses"]
collections: ["list-quality-operations"]
learningPaths: ["list-quality-and-suppression"]

keyTakeaways:
  - "Keep observations, policy decisions, and send actions as separate fields."
  - "Use a bounded review or reconciliation step instead of treating a single status as permanent truth."
  - "Record source, timestamp, owner, and rule version so a later import cannot silently undo a decision."
prerequisites:
  - label: "Email list hygiene checklist"
    href: /repmail/learn/lead-generation/email-list-hygiene-checklist
commonMistakes:
  - "Treating a verifier result as proof that a message will be accepted or reach the inbox."
  - "Letting a newer import automatically clear an unsubscribe, complaint, bounce, or manual block."
faqs:
  - question: "Should a role address always be suppressed?"
    answer: "No. Review whether the campaign is appropriate for a shared function. A role flag is not the same as an unsubscribe or bounce."
  - question: "Does suppressing an alias suppress its members?"
    answer: "Not automatically. Keep the address-level event and evaluate any broader scope with owner evidence."
  - question: "What if the alias owner asks to keep sending?"
    answer: "Record the owner request and applicable scope, but do not silently override a recipient-level objection or complaint without an authorized policy decision."
nextStep:
  label: "Review contact-level versus domain-level scope"
  href: /repmail/learn/lead-generation/outbound-suppression-rules
  description: "Continue from the decision model into a repeatable list-quality control."
assets:
  - type: table
    title: "Decision table"
    content:
      headers: ["Situation", "Evidence to retain", "Default action"]
      rows:
        - ["Shared address objection", "Address, owner, scope, timestamp", "Suppress that alias; notify owner"]
        - ["Role flag only", "Verification result and campaign purpose", "Review fit; not automatic suppression"]
        - ["Unknown membership", "Directory evidence and owner", "Hold; do not infer members"]
        - ["Domain-wide request", "Requester scope and approval", "Escalate; assess blast radius"]
---

Start with the decision boundary: an alias is an address-level routing identity first; decide whether its owner can act for the alias, and keep address-level objections enforceable. **is evidence for a sending decision, not a guarantee of acceptance, inbox placement, relevance, permission, or replies.** Keep the original value, the observation time, and the rule that converted evidence into an action. This makes a list change explainable when a later event disagrees.

## A practical workflow

### 1. Identify the address type

Record whether the value is a role address, shared mailbox, distribution alias, or individual mailbox. Do not infer membership from the local part alone.

### 2. Notify the right owner

Route unsubscribe, complaint, and delivery events to the alias owner or accountable team while suppressing the address that received the event. The owner may need to decide whether a replacement alias is appropriate.

### 3. Avoid member-wide assumptions

Do not automatically suppress every member, domain, or related alias because one shared address objected. Conversely, do not send again to the same alias through a different campaign.

### 4. Document exceptions

If an owner-approved exception exists, record scope, reason, effective date, and review path. Keep any address-level suppression until the policy explicitly resolves it.

## Decision table

| Situation | Evidence to retain | Default action |
| --- | --- | --- |
| Shared address objection | Address, owner, scope, timestamp | Suppress that alias; notify owner |
| Role flag only | Verification result and campaign purpose | Review fit; not automatic suppression |
| Unknown membership | Directory evidence and owner | Hold; do not infer members |
| Domain-wide request | Requester scope and approval | Escalate; assess blast radius |


## Edge cases and guardrails

Yahoo advises senders to respect user preferences and complaint signals, while verification providers treat role addresses as a separate signal. A role or alias flag is not proof of undeliverability, and an alias does not automatically represent every person who can read it.

## How this fits with list operations

Use [email verification statuses](/repmail/learn/lead-generation/email-verification-statuses) for role-based classification, [outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules) for event precedence, and [list hygiene checklist](/repmail/learn/lead-generation/email-list-hygiene-checklist) before approving a campaign that includes shared addresses. Start with the [lead-generation academy](/repmail/learn/lead-generation), then use the [list hygiene checklist](/repmail/learn/lead-generation/email-list-hygiene-checklist) for the audience gate, the [verification status model](/repmail/learn/lead-generation/email-verification-statuses) for technical outcomes, and the [outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules) for cross-system enforcement.

For a shared address, record the owner notification and any response separately from the recipient-level suppression event. This avoids treating an internal owner’s request as proof that every person reached through the alias shares the same preference.

Make the resulting scope visible in the send preview and audit log.

## Sources

- [UK ICO: Respect people’s preferences](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/direct-marketing-guidance/respect-peoples-preferences/)
- [Yahoo sender FAQs](https://senders.yahooinc.com/faqs/)
