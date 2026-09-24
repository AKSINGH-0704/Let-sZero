---
product: repmail
academy: lead-generation
contentType: guide
slug: reactivating-dormant-contacts-suppression
title: "Reactivating Dormant Contacts Without Reintroducing Suppressed Records"
description: "Plan a dormant-contact reactivation workflow that applies current suppressions first and treats nonresponse as a signal—not renewed permission."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["reactivation", "dormant contacts", "suppression", "list hygiene"]
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
  - question: "How long is a contact dormant?"
    answer: "Set a hypothesis from your own program and audience, then test it. This page does not establish a universal inactivity window."
  - question: "Can nonresponse be treated as consent?"
    answer: "No. Nonresponse is not affirmative permission or a release from suppression."
  - question: "What must happen before reactivation?"
    answer: "Apply current suppression and preference records, verify the cohort, define stop rules, and document the test."
nextStep:
  label: "Quarantine new list imports"
  href: /repmail/learn/lead-generation/email-list-hygiene-checklist
  description: "Continue from the decision model into a repeatable list-quality control."
assets:
  - type: table
    title: "Decision table"
    content:
      headers: ["Situation", "Evidence to retain", "Default action"]
      rows:
        - ["Dormant but not suppressed", "Age, source, event history", "Small reviewed test cohort"]
        - ["Current unsubscribe or complaint", "Suppression evidence and scope", "Exclude; do not reactivate"]
        - ["Hard bounce", "Provider event and recipient", "Suppress; investigate source"]
        - ["No response", "Send history and cohort result", "Do not infer permission; review policy"]
---

Start with the decision boundary: reactivation should be a small, measured audience exercise with current preference checks, clear stop rules, and no automatic release of prior suppressions. **is evidence for a sending decision, not a guarantee of acceptance, inbox placement, relevance, permission, or replies.** Keep the original value, the observation time, and the rule that converted evidence into an action. This makes a list change explainable when a later event disagrees.

## A practical workflow

### 1. Define dormancy from your data

Use source, last meaningful interaction, delivery history, and business context. Do not use opens as the sole activity signal, and do not claim a universal inactivity window.

### 2. Build the exclusion-first audience

Apply unsubscribes, complaints, hard bounces, manual blocks, customer preferences, and current scope rules before selecting dormant contacts. Recheck after enrichment.

### 3. Use a controlled test

Record the cohort, message version, owner, stop conditions, and comparison or holdout where practical. Watch replies and negative events, but do not infer consent from silence.

### 4. Retire nonresponders safely

After the test, keep or suppress according to your policy and evidence. Never recycle excluded records merely because they were present in an old CRM export.

## Decision table

| Situation | Evidence to retain | Default action |
| --- | --- | --- |
| Dormant but not suppressed | Age, source, event history | Small reviewed test cohort |
| Current unsubscribe or complaint | Suppression evidence and scope | Exclude; do not reactivate |
| Hard bounce | Provider event and recipient | Suppress; investigate source |
| No response | Send history and cohort result | Do not infer permission; review policy |


## Edge cases and guardrails

Google recommends sending to people who want messages and periodically confirming continued interest; that does not make opens a universal permission signal. Local law and message type matter. A reactivation campaign is not a way to bypass an objection or suppressions.

## How this fits with list operations

Use the [list hygiene checklist](/repmail/learn/lead-generation/email-list-hygiene-checklist) to build the audience, [outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules) to enforce exclusions, and [verification status model](/repmail/learn/lead-generation/email-verification-statuses) to keep address evidence separate from engagement or preference. Start with the [lead-generation academy](/repmail/learn/lead-generation), then use the [list hygiene checklist](/repmail/learn/lead-generation/email-list-hygiene-checklist) for the audience gate, the [verification status model](/repmail/learn/lead-generation/email-verification-statuses) for technical outcomes, and the [outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules) for cross-system enforcement.

Set a pause rule before launch, such as a review when negative events exceed the cohort’s expected pattern or when an exclusion mismatch appears. The rule should be based on observed evidence and documented rather than a universal threshold.

Review the cohort outcome before expanding it, and preserve the exclusion list used for the test.

## Sources

- [Google email sender guidelines](https://support.google.com/mail/answer/81126?hl=en)
- [UK ICO: Respect people’s preferences](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/direct-marketing-guidance/respect-peoples-preferences/)
