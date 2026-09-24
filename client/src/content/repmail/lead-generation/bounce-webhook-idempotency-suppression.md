---
product: repmail
academy: lead-generation
contentType: engineering-article
slug: bounce-webhook-idempotency-suppression
title: "Bounce Webhook Idempotency and Suppression State"
description: "Process bounce events once, preserve ordering evidence, and derive a stable suppression state even when webhooks retry or arrive late."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["bounces", "webhooks", "idempotency", "suppression"]
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
  - question: "What does idempotent mean here?"
    answer: "Reprocessing the same event produces the same outcome and does not duplicate or weaken the suppression state."
  - question: "Should a webhook handler delete old events?"
    answer: "No. Keep enough event identity and timing evidence to explain and recompute current state."
  - question: "What happens when events arrive out of order?"
    answer: "Apply documented precedence using event metadata, preserve the full timeline, and route ambiguous conflicts to review."
nextStep:
  label: "Validate the resulting suppression state"
  href: /repmail/learn/lead-generation/outbound-suppression-rules
  description: "Continue from the decision model into a repeatable list-quality control."
assets:
  - type: table
    title: "Decision table"
    content:
      headers: ["Situation", "Evidence to retain", "Default action"]
      rows:
        - ["First delivery", "Event ID and recipient key", "Apply state transition once"]
        - ["Duplicate retry", "Same idempotency key", "No-op with audit count"]
        - ["Late hard bounce", "Event time and prior state", "Apply precedence; preserve timeline"]
        - ["Dead-letter event", "Payload reference and error", "Block or review affected path"]
---

Start with the decision boundary: event processing should be safe to repeat: the same provider event must not produce a different suppression decision on each retry. **is evidence for a sending decision, not a guarantee of acceptance, inbox placement, relevance, permission, or replies.** Keep the original value, the observation time, and the rule that converted evidence into an action. This makes a list change explainable when a later event disagrees.

## A practical workflow

### 1. Select the idempotency key

Prefer a provider event ID; otherwise derive a conservative key from message ID, recipient, event type, and observed time. Store the raw payload location or hash for audit without inventing fields the provider did not send.

### 2. Separate receipt from application

Acknowledge or queue the event only after durable receipt, then process it with retries and a dead-letter path. Do not make a transient consumer error look like a successful suppression.

### 3. Handle ordering explicitly

Use event time and precedence rules when a soft bounce, hard bounce, correction, or manual review arrives out of order. Keep every event and derive current state rather than mutating history.

### 4. Verify destination state

After applying the rule, check the suppression record or send gate and reconcile failed propagation. SES documents account- and Region-scoped suppression behavior; your application may need a broader cross-system control.

## Decision table

| Situation | Evidence to retain | Default action |
| --- | --- | --- |
| First delivery | Event ID and recipient key | Apply state transition once |
| Duplicate retry | Same idempotency key | No-op with audit count |
| Late hard bounce | Event time and prior state | Apply precedence; preserve timeline |
| Dead-letter event | Payload reference and error | Block or review affected path |


## Edge cases and guardrails

Provider event payloads and guarantees differ. Use provider-neutral fields in your design and map only documented values. A webhook handler that simply toggles a boolean can reopen a suppressed address when an older event is replayed.

## How this fits with list operations

Pair this engineering runbook with [outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules) for state precedence and [email verification statuses](/repmail/learn/lead-generation/email-verification-statuses) for non-event classifications. Use the [hard versus soft bounces](/repmail/learn/deliverability/hard-vs-soft-bounces) guide for the delivery meaning of each class. Start with the [lead-generation academy](/repmail/learn/lead-generation), then use the [list hygiene checklist](/repmail/learn/lead-generation/email-list-hygiene-checklist) for the audience gate, the [verification status model](/repmail/learn/lead-generation/email-verification-statuses) for technical outcomes, and the [outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules) for cross-system enforcement.

Add tests for duplicate delivery, retry after partial success, event IDs reused across tenants, an old event after a newer state, and a dead-letter replay. These cases are more revealing than a happy-path webhook test.

## Sources

- [Amazon SES account-level suppression list](https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html)
