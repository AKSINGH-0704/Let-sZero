---
product: repmail
academy: lead-generation
contentType: guide
slug: email-list-decay-reverification
title: "Email List Decay: When to Reverify Existing Contacts"
description: "Build a re-verification cadence from your own bounce and complaint evidence instead of assuming one universal list-decay interval."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["email list decay", "reverification", "list hygiene", "data quality"]
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
  - question: "Does every contact need to be reverified on the same schedule?"
    answer: "No. Segment by age, source, risk, and event history, then test a cadence against your own outcomes."
  - question: "Should reverification overwrite the old status?"
    answer: "No. Append a new observation with its method and timestamp so changes and disagreements remain auditable."
  - question: "What should happen to unknown results?"
    answer: "Hold or review them under an explicit policy. Unknown means evidence was insufficient, not that the address is safe."
nextStep:
  label: "Review verification statuses"
  href: /repmail/learn/lead-generation/email-verification-statuses
  description: "Continue from the decision model into a repeatable list-quality control."
assets:
  - type: table
    title: "Decision table"
    content:
      headers: ["Situation", "Evidence to retain", "Default action"]
      rows:
        - ["Older cohort", "Age, source, prior events, new result", "Review or suppress based on policy"]
        - ["Recent hard bounce", "Event ID, SMTP result, checked_at", "Suppress address and investigate"]
        - ["Unknown or timeout", "Method, retry count, timestamp", "Hold for review; do not promote"]
        - ["Stable low-risk cohort", "Sample size and holdout outcome", "Continue monitoring; no automatic release"]
---

Start with the decision boundary: reverification should be triggered by observed risk and contact age, then validated with a cohort or holdout. **is evidence for a sending decision, not a guarantee of acceptance, inbox placement, relevance, permission, or replies.** Keep the original value, the observation time, and the rule that converted evidence into an action. This makes a list change explainable when a later event disagrees.

## A practical workflow

### 1. Segment by age and source

Store collected_at, last_checked_at, source, role, domain, and prior event history. Compare cohorts rather than averaging the whole database; a recent opt-in and an old enrichment export should not share one freshness assumption.

### 2. Choose a testable hypothesis

Start with a proposed cadence only as an operational hypothesis. For example, select older or higher-risk cohorts for review, while leaving a comparable holdout. Do not publish the interval as a universal rule.

### 3. Recheck before high-impact sends

Trigger reverification when a list is old relative to your observed risk, a domain/source changes, repeated soft bounces accumulate, or an import is about to enter a large campaign. Keep the prior observation instead of overwriting it.

### 4. Act on unknowns explicitly

Route invalid, disposable, catch-all, role, and unknown outcomes to separate actions. If results conflict with delivery events, preserve both records and investigate the method, timing, and address history.

## Decision table

| Situation | Evidence to retain | Default action |
| --- | --- | --- |
| Older cohort | Age, source, prior events, new result | Review or suppress based on policy |
| Recent hard bounce | Event ID, SMTP result, checked_at | Suppress address and investigate |
| Unknown or timeout | Method, retry count, timestamp | Hold for review; do not promote |
| Stable low-risk cohort | Sample size and holdout outcome | Continue monitoring; no automatic release |


## Edge cases and guardrails

There is no defensible universal answer to “how often should I reverify?” Domain changes, source quality, contact type, send volume, and your own event data matter. Opens are not a reliable sole trigger for reactivation or freshness decisions; use delivery and preference evidence too.

## How this fits with list operations

Use RepMail’s existing list-hygiene and suppression guidance as the operational gate, while keeping re-verification observations in your data model. Do not describe a platform check as a permanent mailbox guarantee. Start with the [lead-generation academy](/repmail/learn/lead-generation), then use the [list hygiene checklist](/repmail/learn/lead-generation/email-list-hygiene-checklist) for the audience gate, the [verification status model](/repmail/learn/lead-generation/email-verification-statuses) for technical outcomes, and the [outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules) for cross-system enforcement.

## Sources

- [Google email sender guidelines](https://support.google.com/mail/answer/81126?hl=en)
- [Twilio SendGrid Email Address Validation](https://www.twilio.com/docs/sendgrid/ui/managing-contacts/email-address-validation/real-time-email-address-validation-overview)
- [Amazon SES account-level suppression list](https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html)
