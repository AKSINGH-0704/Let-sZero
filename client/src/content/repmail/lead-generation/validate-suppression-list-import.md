---
product: repmail
academy: lead-generation
contentType: template
slug: validate-suppression-list-import
title: "How to Validate a Suppression-List Import Before a Campaign"
description: "Use a dry-run QA gate to validate suppression-list files for schema, encoding, duplicates, scope, and count reconciliation before import."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["suppression", "CSV QA", "campaign operations", "list hygiene"]
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
  - question: "What columns belong in a suppression import?"
    answer: "At minimum use a stable matching value, reason, scope, event date, source, and action, plus a version or run identifier. Adapt the exact schema to your systems."
  - question: "Should duplicate suppression rows be rejected?"
    answer: "Not automatically. Deduplicate or merge them according to precedence while retaining event history and conflicts."
  - question: "What is the most important dry-run output?"
    answer: "Reconcile total rows, unique keys, new matches, conflicts, invalid rows, and scope against an expected result before writing."
nextStep:
  label: "Synchronize unsubscribe events"
  href: /repmail/learn/lead-generation/outbound-suppression-rules
  description: "Continue from the decision model into a repeatable list-quality control."
assets:
  - type: checklist
    title: "Suppression import QA checklist"
    content:
      - "Malformed row"
      - "Duplicate key"
      - "Unexpected count"
      - "Valid import"
---

Start with the decision boundary: a suppression import is safe only when the file’s meaning, direction, scope, and expected counts are known before any production write. **is evidence for a sending decision, not a guarantee of acceptance, inbox placement, relevance, permission, or replies.** Keep the original value, the observation time, and the rule that converted evidence into an action. This makes a list change explainable when a later event disagrees.

## A practical workflow

### 1. Lock the schema

Require a version, address or matching key, reason, scope, event date, source, and action. Reject missing headers, duplicate column names, malformed values, and unknown action codes.

### 2. Check encoding and direction

Read UTF-8 intentionally, inspect delimiters and quoted fields, and verify that “suppress” cannot be inverted into “allow.” Sample rows with commas, Unicode, whitespace, and blank reason fields.

### 3. Dry-run the match

Compute input rows, unique normalized keys, new matches, existing matches, conflicts, invalid rows, and rows outside scope. Compare the result with the sender’s expected count before writing.

### 4. Approve and retain evidence

Require a named owner, file hash or version, rule version, dry-run output, and rollback or correction plan. After import, sample the destination and reconcile counts.

## Decision table

| Situation | Evidence to retain | Default action |
| --- | --- | --- |
| Malformed row | Row number and parse error | Reject or quarantine file |
| Duplicate key | Raw values and reason conflict | Merge by precedence; preserve history |
| Unexpected count | Expected vs observed by scope | Stop and investigate |
| Valid import | File version, hash, approver | Write, verify, and archive run evidence |


## Edge cases and guardrails

Never treat a successful file upload as proof that the right people were suppressed. A reversed boolean, wrong channel scope, or stale export can be syntactically valid and operationally unsafe. Vendor interfaces differ, so this checklist intentionally avoids UI-specific claims.

## How this fits with list operations

Use the [outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules) guide to define what the rows should mean, and [email list hygiene checklist](/repmail/learn/lead-generation/email-list-hygiene-checklist) to run the final audience check. Keep the import itself as a controlled operation, not a one-off spreadsheet edit. Start with the [lead-generation academy](/repmail/learn/lead-generation), then use the [list hygiene checklist](/repmail/learn/lead-generation/email-list-hygiene-checklist) for the audience gate, the [verification status model](/repmail/learn/lead-generation/email-verification-statuses) for technical outcomes, and the [outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules) for cross-system enforcement.

A good dry run also samples rows from each action and reason class. Have a second operator confirm that the file is a block list, not an allow list, before production import, especially when the source uses ambiguous column names.

## Sources

- [UK ICO: Respect people’s preferences](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/direct-marketing-guidance/respect-peoples-preferences/)
- [Amazon SES account-level suppression list](https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html)
