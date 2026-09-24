---
product: repmail
academy: lead-generation
contentType: guide
slug: contact-vs-domain-suppression
title: "Contact-Level vs Domain-Level Suppression"
description: "Choose between address, contact, domain, and campaign suppression without over-blocking legitimate recipients or under-enforcing a clear objection."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["suppression", "domain policy", "list quality", "RevOps"]
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
  - question: "When should I suppress an entire domain?"
    answer: "Only when evidence supports the broader scope and an owner approves the blast radius. A single recipient event is usually not enough."
  - question: "Does domain suppression replace contact suppression?"
    answer: "No. Keep address- or contact-level history so a later domain exception cannot reintroduce a known opt-out."
  - question: "How should broad blocks be reviewed?"
    answer: "Store evidence, owner, scope, rule version, and a review or expiry date where appropriate."
nextStep:
  label: "Process complaint feedback"
  href: /repmail/learn/lead-generation/outbound-suppression-rules
  description: "Continue from the decision model into a repeatable list-quality control."
assets:
  - type: table
    title: "Decision table"
    content:
      headers: ["Situation", "Evidence to retain", "Default action"]
      rows:
        - ["Single address objection", "Address, channel, scope, timestamp", "Suppress that covered contact/channel"]
        - ["Person-level request", "Identity evidence and scope", "Suppress known contact records"]
        - ["Domain-level risk", "Pattern, evidence, approver, review date", "Hold or block domain under policy"]
        - ["Campaign exclusion", "Campaign ID and rule version", "Exclude only that campaign"]
---

Start with the decision boundary: scope suppression to the narrowest reliable unit, then escalate to a broader block only with evidence, owner approval, and an audit trail. **is evidence for a sending decision, not a guarantee of acceptance, inbox placement, relevance, permission, or replies.** Keep the original value, the observation time, and the rule that converted evidence into an action. This makes a list change explainable when a later event disagrees.

## A practical workflow

### 1. Define the event scope

An address-level unsubscribe, a person-level objection, a domain abuse pattern, and a campaign exclusion are different controls. Store scope explicitly rather than writing every event into one global blocklist.

### 2. Assess blast radius

Before applying a domain rule, estimate legitimate recipients, business-critical mail, subsidiaries, shared infrastructure, and exceptions. One complaint does not establish that every mailbox at a domain should be blocked.

### 3. Require escalation evidence

Use repeated or confirmed signals, provider evidence, and an owner-approved rule to widen scope. Set an expiry or review date for broad rules where appropriate.

### 4. Test before send

Run the audience against every scope, report which rule excluded each row, and sample exceptions. Keep contact-level preferences enforced even when a broader rule is later removed.

## Decision table

| Situation | Evidence to retain | Default action |
| --- | --- | --- |
| Single address objection | Address, channel, scope, timestamp | Suppress that covered contact/channel |
| Person-level request | Identity evidence and scope | Suppress known contact records |
| Domain-level risk | Pattern, evidence, approver, review date | Hold or block domain under policy |
| Campaign exclusion | Campaign ID and rule version | Exclude only that campaign |


## Edge cases and guardrails

Domain-level suppression can over-block shared providers, subsidiaries, customers, and legitimate role addresses. Conversely, a domain block should not be used to bypass an address-level preference. Keep exception handling explicit and never let a later import erase the narrower record.

## How this fits with list operations

Use [outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules) for precedence and [email verification statuses](/repmail/learn/lead-generation/email-verification-statuses) to keep role or catch-all flags separate from blocks. Run the [list hygiene checklist](/repmail/learn/lead-generation/email-list-hygiene-checklist) before approving a broad campaign rule. Start with the [lead-generation academy](/repmail/learn/lead-generation), then use the [list hygiene checklist](/repmail/learn/lead-generation/email-list-hygiene-checklist) for the audience gate, the [verification status model](/repmail/learn/lead-generation/email-verification-statuses) for technical outcomes, and the [outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules) for cross-system enforcement.

A scope field should be queryable and visible in the send preview. Before a broad rule is activated, review a sample of included and excluded addresses and record the approver’s reasoning so later operators can distinguish a deliberate block from a bad join.

## Sources

- [Amazon SES account-level suppression list](https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html)
- [UK ICO: Respect people’s preferences](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/direct-marketing-guidance/respect-peoples-preferences/)
