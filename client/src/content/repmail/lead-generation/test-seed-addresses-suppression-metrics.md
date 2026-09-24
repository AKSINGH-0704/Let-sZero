---
product: repmail
academy: lead-generation
contentType: guide
slug: test-seed-addresses-suppression-metrics
title: "Test and Seed Addresses: Keep QA Mailboxes Out of Suppression Metrics"
description: "Separate test and seed mailboxes from real-recipient suppression and reporting so QA events do not distort list decisions."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["seed lists", "QA", "suppression", "metrics"]
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
  - question: "Can I remove test bounces from all metrics?"
    answer: "Remove them only from clearly labeled recipient-quality denominators, while retaining a separate QA report and the raw event."
  - question: "How do I know an address is a seed?"
    answer: "Use a registry and durable campaign or message tags, not pattern guessing."
  - question: "Should test addresses be on the suppression list?"
    answer: "Keep test controls separate from recipient suppression unless your operational policy intentionally requires both."
nextStep:
  label: "Run the pre-send checklist"
  href: /repmail/learn/deliverability/pre-send-deliverability-checklist
  description: "Continue from the decision model into a repeatable list-quality control."
assets:
  - type: table
    title: "Decision table"
    content:
      headers: ["Situation", "Evidence to retain", "Default action"]
      rows:
        - ["Known QA seed", "Registry ID and test label", "Exclude from recipient metrics; retain event"]
        - ["Real recipient in test cohort", "Recipient identity and event", "Keep in production metrics and suppression"]
        - ["Unregistered test-like address", "Evidence and owner", "Hold; do not guess"]
        - ["Retired seed", "Lifecycle state and date", "Remove from send fixtures"]
---

Start with the decision boundary: tag test identities at creation, isolate their campaign purpose, and exclude only those known QA events from recipient-quality metrics—not real recipient complaints or bounces. **is evidence for a sending decision, not a guarantee of acceptance, inbox placement, relevance, permission, or replies.** Keep the original value, the observation time, and the rule that converted evidence into an action. This makes a list change explainable when a later event disagrees.

## A practical workflow

### 1. Create an explicit registry

Store test address, owner, purpose, provider, campaign or fixture, and lifecycle date. Do not rely on a recognizable local part or domain alone.

### 2. Tag every test send

Carry a campaign or message label into logs and event processing. A seed message should be identifiable from the event without deleting the underlying event record.

### 3. Separate decisions from metrics

A QA mailbox can be excluded from a production bounce-rate denominator while still appearing in an operational test report. Real recipients must remain in production metrics even if they were part of a test cohort.

### 4. Expire and review seeds

Retire addresses that no longer serve QA, remove them from production audiences, and verify that fixtures cannot enter a customer or prospect send.

## Decision table

| Situation | Evidence to retain | Default action |
| --- | --- | --- |
| Known QA seed | Registry ID and test label | Exclude from recipient metrics; retain event |
| Real recipient in test cohort | Recipient identity and event | Keep in production metrics and suppression |
| Unregistered test-like address | Evidence and owner | Hold; do not guess |
| Retired seed | Lifecycle state and date | Remove from send fixtures |


## Edge cases and guardrails

Test-address exclusion is not a deliverability improvement and should never be used to hide real complaints, bounces, or unsubscribes. Keep separate dashboards for test health and recipient health so the denominator remains understandable.

## How this fits with list operations

Use [email-sending observability](/repmail/learn/email-platform/email-sending-observability) to carry test identifiers through events, then apply [outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules) to real recipient state. The [list hygiene checklist](/repmail/learn/lead-generation/email-list-hygiene-checklist) catches accidental fixture leakage before launch. Start with the [lead-generation academy](/repmail/learn/lead-generation), then use the [list hygiene checklist](/repmail/learn/lead-generation/email-list-hygiene-checklist) for the audience gate, the [verification status model](/repmail/learn/lead-generation/email-verification-statuses) for technical outcomes, and the [outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules) for cross-system enforcement.

A seed registry should be reviewed like production configuration. Record who can create or retire a seed, which environments may use it, and whether the address is excluded from recipient metrics, campaign selection, or both.

## Sources

- [Google email sender guidelines](https://support.google.com/mail/answer/81126?hl=en)
- [Amazon SES account-level suppression list](https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html)
