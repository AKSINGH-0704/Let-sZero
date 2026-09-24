---
product: repmail
academy: deliverability
contentType: template
slug: compare-deliverability-tool-raw-exports
title: "How to Compare Deliverability Tool Raw Exports"
description: "Use a neutral data dictionary to compare timestamps, providers, mailboxes, message IDs, results, reasons, and uncertainty across exports."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability-tools", "data-exports", "observability"]
collections: ["tool-reviews", "deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
assets:
  - type: table
    title: "Raw-export comparison data dictionary"
    content:
      headers: ["Canonical field", "Examples", "Reconciliation rule"]
      rows:
        - ["event_time", "sent_at, observed_at", "Keep timezone and event type"]
        - ["provider_context", "provider, mailbox", "Do not merge unlike cohorts"]
        - ["message_identity", "message_id, campaign_id", "Preserve source identifiers"]
        - ["result", "inbox, deferred, invalid", "Map definitions, not labels alone"]
keyTakeaways:
  - "Use the tool to answer a defined deliverability question, not to collect an unexplained score."
  - "Record provider, mailbox, message, timestamp, and evidence limits before comparing results."
  - "Keep observations, hypotheses, and next actions separate so a tool output does not become an unsupported guarantee."
faqs:
  - question: "Which field should be the join key?"
    answer: "Prefer a stable message or test identifier plus provider, mailbox, and timestamp. Never join only on a campaign name when retries or variants are possible."
  - question: "Can I combine two tools into one score?"
    answer: "Only with a documented mapping, matched populations, and a defined treatment of missing data. Otherwise compare evidence side by side."
  - question: "Why preserve the original export?"
    answer: "It protects provenance. A normalized table is useful, but the unchanged source lets another reviewer verify how each field was interpreted."
nextStep:
  label: "Track sending observability"
  href: "/repmail/learn/email-platform/email-sending-observability"
  description: "Keep raw evidence attached to the operational record."
---
Reconciling tool exports without treating different field names or dashboard scores as equivalent. The useful output is not a vendor badge; it is a dated observation that helps an operator decide what to do next. Start by writing the question in one sentence and the evidence that would answer it. If the tool cannot expose that evidence, mark the gap rather than filling it with a score.

## A practical workflow

1. Create canonical columns before importing files: source tool, export date, event time, provider, mailbox type, sender identity, message ID, result, reason, and confidence or status. Keep the original file unchanged.
2. Map each source field and record transformations. A “delivered” column may mean accepted, observed, or simply job-complete; read the source definition before normalizing it.
3. Compare matched cohorts and windows, then publish unmapped fields and missingness. If two tools cannot expose comparable evidence, say so instead of forcing a combined score.

## How to interpret the result

Read the result at the same level as the question. A transport event can show acceptance or deferral; authentication headers can show identifier checks; a provider dashboard can show a bounded receiver view; and a seed test can show a sample mailbox outcome. Those observations are related, but they are not interchangeable. Preserve the provider, mailbox or cohort, message variant, sender identity, timestamp, and test configuration with every conclusion.

When a result is surprising, branch before changing the campaign. Check whether the population, definition, time window, forwarding path, or data freshness differs. Then classify the result as measured, directional, or unknown. A careful “not enough evidence yet” is more useful than an apparently precise number that cannot be reproduced.

## Boundaries and edge cases

Not every tool exposes every field. Do not manufacture provider, timestamp, or confidence data from a dashboard label; preserve unknowns and cite the source export. If a tool returns a missing, delayed, unknown, or failed result, keep that state visible. Do not silently convert it to a pass or a failure. If you are comparing tools, preserve each raw export and document field mappings before combining anything.

## RepMail relevance

RepMail operators can apply this evidence-first workflow to campaign QA and sending observability: keep the message identity, sender domain, provider context, event record, and suppression or change decision together. RepMail is not a substitute for receiver evidence, and a tool result should not be described as a guarantee about every recipient.

For adjacent context, see [sending observability](/repmail/learn/email-platform/email-sending-observability), [provider-specific triage](/repmail/learn/deliverability/provider-specific-deliverability-triage), and the [complete email deliverability guide](/repmail/learn/deliverability/complete-guide-to-email-deliverability).

## References

The provider and protocol guidance used for this workflow is documented in the following first-party or standards sources: [1](https://support.google.com/mail/answer/14668346?hl=en); [2](https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html); [3](https://www.rfc-editor.org/rfc/rfc5321).
