---
product: repmail
academy: lead-generation
contentType: engineering-article
slug: suppression-event-precedence
title: "Suppression Event Precedence: A Safe State Model"
description: "Define deterministic suppression precedence so competing events cannot accidentally release a contact or create contradictory send decisions."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["suppression", "event processing", "deliverability operations", "state machine"]
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
  - question: "Can a later valid result release an unsubscribe?"
    answer: "No. A verification result is not a release approval. Require an intentional, documented preference or policy event."
  - question: "Should a soft bounce always suppress?"
    answer: "Not necessarily. Keep a bounded retry and review policy that reflects your provider evidence."
  - question: "What if events arrive out of order?"
    answer: "Use event timestamps and source rules, retain every event, and make state recomputation idempotent."
nextStep:
  label: "Validate the suppression import"
  href: /repmail/learn/lead-generation/outbound-suppression-rules
  description: "Continue from the decision model into a repeatable list-quality control."
assets:
  - type: table
    title: "Decision table"
    content:
      headers: ["Situation", "Evidence to retain", "Default action"]
      rows:
        - ["Unsubscribe / do-not-contact", "Preference source, scope, timestamp", "Suppress in covered scope"]
        - ["Complaint", "Provider report or user event", "Suppress; investigate; no auto-release"]
        - ["Hard bounce", "Provider event and recipient", "Suppress address"]
        - ["Soft bounce", "Retry history and response", "Hold/retry under policy"]
---

Start with the decision boundary: the safe default is to let an explicit preference or intentional block outrank a later technical “valid” result, while keeping event history immutable. **is evidence for a sending decision, not a guarantee of acceptance, inbox placement, relevance, permission, or replies.** Keep the original value, the observation time, and the rule that converted evidence into an action. This makes a list change explainable when a later event disagrees.

## A practical workflow

### 1. Define states and scope

Model active, held, suppressed, and review states separately from reason codes such as unsubscribe, complaint, hard bounce, soft bounce, and manual block. Store campaign or channel scope where preferences are narrower.

### 2. Rank events by risk and authority

Write precedence before implementation. A do-not-contact or complaint should not be canceled by a new import; a hard bounce normally suppresses the address; a soft bounce needs a bounded retry policy.

### 3. Make transitions append-only

Store event ID, source, received time, observed time, normalized key, rule version, and actor. A recomputation can derive current state, but it must not erase the evidence that caused a prior state.

### 4. Require intentional release

Create a separate release workflow with owner, evidence, scope, and date. Never auto-release because a verifier says valid or a later import has a blank suppression field.

## Decision table

| Situation | Evidence to retain | Default action |
| --- | --- | --- |
| Unsubscribe / do-not-contact | Preference source, scope, timestamp | Suppress in covered scope |
| Complaint | Provider report or user event | Suppress; investigate; no auto-release |
| Hard bounce | Provider event and recipient | Suppress address |
| Soft bounce | Retry history and response | Hold/retry under policy |


## Edge cases and guardrails

Precedence is not a legal conclusion and may differ by message type or jurisdiction. Keep channel scope and source ownership explicit. If two events conflict, preserve both and route to review rather than resolving by arrival order alone.

## How this fits with list operations

The [outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules) guide is the natural hub for this state model. Use the [verification status model](/repmail/learn/lead-generation/email-verification-statuses) only for technical observations; it should never overwrite a suppression event. Start with the [lead-generation academy](/repmail/learn/lead-generation), then use the [list hygiene checklist](/repmail/learn/lead-generation/email-list-hygiene-checklist) for the audience gate, the [verification status model](/repmail/learn/lead-generation/email-verification-statuses) for technical outcomes, and the [outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules) for cross-system enforcement.

Write the transition table next to the implementation and test duplicate, delayed, conflicting, and missing events. The most important property is monotonic safety: an uncertain replay must not weaken an intentional block.

## Sources

- [Amazon SES account-level suppression list](https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html)
- [UK ICO: Respect people’s preferences](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/direct-marketing-guidance/respect-peoples-preferences/)
- [Yahoo sender FAQs](https://senders.yahooinc.com/faqs/)
