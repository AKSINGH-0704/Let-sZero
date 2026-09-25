---
product: repmail
academy: outreach
contentType: template
slug: client-reporting-data-dictionary-outbound
title: "Client reporting data dictionary for outbound metrics"
description: "Client reporting data dictionary for outbound metrics — Different account managers define sent, delivered, reply, and qualified reply differently."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","agency","reporting","client","dictionary","outbound"]
assets:
  - type: table
    title: "Decision/Diagnostic table: When to count each outbound metric"
    content:
      headers: ["Situation","Count as Sent?","Count as Delivered?","Count as Reply?","Count as Qualified reply?"]
      rows:
        - ["Provider returns acceptance (2xx or equivalent)","Yes — record provider message ID and response","No — wait for provider-delivered event or observation window","No","No"]
        - ["Provider emits delivered event","Yes (if previously accepted or map now)","Yes — use provider event and record timestamp","No","No"]
        - ["Hard bounce received within observation window","Yes — initial Sent still counts","No — explicitly mark as Bounced","No","No"]
        - ["Inbound message matches From: and thread ID","Yes (historical) — Sent must have occurred earlier","Possibly — check Delivered provenance","Yes — mark as Reply and store raw headers","Only if passes qualification rules"]
        - ["Autoresponder (out-of-office) inbound","Yes","Depends on published rules (usually No)","Yes — tag as autoresponder","No unless account rules allow autoresponder qualification"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Different account managers define sent, delivered, reply, and qualified reply differently"
  - "Distinct from client-facing reporting: defines metric semantics before dashboard production."
  - "Link to reporting boundaries and provider-split reporting."
commonMistakes:
  - "Skipping this check: Record provider response codes and provider message IDs at time of send."
  - "Skipping this check: Decide and document the observation window used to infer Delivered when provider events are absent."
  - "Skipping this check: Capture full inbound headers and store raw bodies for reply qualification and audit."
faqs:
  - question: "If providers disagree about a delivered event, which source is authoritative?"
    answer: "Use the sending provider’s delivered event as the primary source when available, but state uncertainty: some providers emit optimistic delivered events. If the sending provider lacks delivered events, use the agreed observation window and absence of a hard bounce to infer delivery. Always record the method used so downstream consumers can filter by evidence type."
  - question: "How should we handle retries that create multiple provider message IDs?"
    answer: "Treat retries as the same logical send if they share the same campaign_id, original recipient, and timestamp proximity. Deduplicate on a canonical send_id created by your system, keep provider message IDs as aliases, and record retry reason. Quarantine records that cannot be deterministically deduplicated until an operator resolves them."
  - question: "Can automated classifiers determine Qualified replies without human review?"
    answer: "They can, but with caveats: classifiers have false positives/negatives and may mislabel autoresponders or ambiguous intent. If you rely solely on automation, quantify expected error, store the raw text and model decision metadata, and include a human audit sample to validate classifier performance before using metrics for client billing or performance comparisons."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Define exact semantics for sent, delivered, reply, and qualified reply before you build dashboards or hand off reports. This document gives a concise, operator-focused data dictionary, decision boundaries, evidence limits, and a checklist to eliminate inconsistent definitions across account managers.

## Metric: Sent — decision boundary and evidence

Definition: A message counts as Sent the moment the outbound system returns a success for the SMTP/HTTP API transaction to the provider (status codes that indicate acceptance), not when it appears in an activity feed or a campaign schedule. Decision boundary: use provider-acknowledged acceptance rather than queued or scheduled state. Evidence limits: provider acceptance does not prove final delivery — it only proves handoff; bounces and drops may follow. Practical sequence: 1) Identify the provider-specific response codes that indicate acceptance. 2) Map those codes to the Sent flag in the database. 3) Record timestamp, provider message ID, and raw response for later debug.

## Metric: Delivered — definition, limits, and fallbacks

Definition: Delivered represents provider acknowledgment that the recipient server accepted the message for final delivery (e.g., SMTP 2xx on relay or provider-supplied delivered event). Decision boundary: prefer explicit delivered events from the sending provider, but where unavailable, use absence of hard bounce within a defined observation window. Evidence limits: not all providers emit reliable delivered events; delivered does not equal inbox placement or user visibility. Practical sequence: 1) Prefer provider-delivered webhooks/events and map them to Delivered. 2) If provider events are missing, wait a conservative observation window (commonly 72 hours) and classify as Delivered if no hard bounce was recorded. 3) Log the method used (event vs. inference).

## Metric: Reply vs. Qualified reply — exact semantics and auditability

Definition: Reply is any inbound message from the target email address that meets a minimal syntactic match (From: address match, or provider thread ID). Qualified reply is a Reply that meets an account-specific quality filter (e.g., non-automated, contains purchase interest, or passes human review). Decision boundary: separate mechanical detection (Reply) from human or programmatic qualification (Qualified reply). Evidence limits: automated filters and NLP classifiers can mislabel autoresponders or out-of-office messages; keep raw reply data for audit. Practical sequence: 1) Capture raw inbound message headers and body. 2) Run an automated classification that tags autoresponders and out-of-office replies. 3) Apply the account’s qualification rules (keywords, required intent markers, or human review) and set Qualified reply with provenance metadata (who/what decided).

## Attribution and time-window rules — avoid misleading comparisons

Definition: Attribution ties events to campaigns, templates, sender identity, and provider. Time-window rules define how long you observe post-send events for inclusion. Decision boundary: use a consistent attribution chain and fixed observation window per report (e.g., 72 hours, 7 days) and surface which you used. Evidence limits: differing windows between account managers produce non-comparable rates. Practical sequence: 1) Agree on a default observation window for near-term metrics and a long-term window for lifecycle metrics. 2) Attach attribution fields (campaign_id, template_id, sender_id, provider_id) to every metric record. 3) For aggregated reports, include only events within the chosen window and publish that window alongside rates.

## Failure modes, data hygiene, and stop conditions

Common failure modes: double-counting when retries create new provider IDs; misclassifying forwarded replies as target replies; and mixing inferred Delivered with provider-delivered events. Decision boundary: stop and flag records that lack minimum provenance (no provider message ID for Sent or no inbound headers for Reply). Evidence limits: deduplication heuristics can hide root causes; preserve raw records. Practical sequence: 1) Implement deduplication based on provider message ID and original recipient. 2) Flag and quarantine any event that cannot attach required provenance fields. 3) Maintain an audit log for each correction and a stop condition that rejects ambiguous records from analytics pipelines until resolved.

## Practical checklist

- [ ] Record provider response codes and provider message IDs at time of send.
- [ ] Decide and document the observation window used to infer Delivered when provider events are absent.
- [ ] Capture full inbound headers and store raw bodies for reply qualification and audit.
- [ ] Implement automated filters for autoresponders and mark them distinct from human replies.
- [ ] Attach campaign_id, template_id, sender_id, and provider_id to every metric row.
- [ ] Define and document qualification rules for Qualified reply (keywords, human review thresholds).
- [ ] Create a quarantine process for events missing required provenance fields.
- [ ] Publish metric lineage (how each metric was derived) alongside dashboards.
- [ ] Run weekly audits comparing provider events to inferred statuses and log discrepancies.

## Where RepMail fits

This data dictionary can be used as a pre-dashboard checklist and decision aid in RepMail workflows to ensure consistent metric definitions before producing client reports. Use the checklist and diagnostic table to align account managers, attach provenance fields to outbound events, and implement quarantine rules in your pipeline; do not assume RepMail automates these decisions for you.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Agency report QA checklist before client delivery](/repmail/learn/outreach/agency-outbound-report-qa-checklist)
- [Client Report Source-Trace Worksheet](/repmail/learn/outreach/client-report-source-trace-worksheet)


## Sources

[1]: https://support.google.com/analytics/answer/9305587?hl=en "Google sender or Workspace documentation"
[2]: https://www.trychaser.com/checklist-articles/client-offboarding-checklist-for-agencies "Supporting technical or operational reference"
