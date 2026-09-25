---
product: repmail
academy: infrastructure
contentType: guide
slug: bulk-email-partial-failure-reconciliation
title: "Partial Failure in Bulk Email Sends: Reconcile Every Recipient"
description: "Partial Failure in Bulk Email Sends: Reconcile Every Recipient — Teams losing per-recipient status when a bulk request partly fails."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["infrastructure","email","partial","failure","bulk"]
assets:
  - type: table
    title: "Partial-failure diagnostics — decision table"
    content:
      headers: ["Observed symptom","Immediate action","Follow-up source","Stop condition"]
      rows:
        - ["Response contains per-recipient statuses","Persist each status; mark terminal vs. retryable","None usually needed; use webhooks for confirmation","All recipients have terminal or retryable states recorded"]
        - ["Response is overall error with no details","Mark recipients unknown; consult provider error classification","Call provider per-message results API or wait for events","Provider returns per-recipient info or events arrive"]
        - ["Provider returns transient error (rate-limit, timeout)","Schedule targeted retry with idempotency key","Retry response or subsequent event stream","Retry succeeds or retry budget exhausted"]
        - ["Some recipients accepted, others failed","Persist accepted as accepted; retry failed subset","Webhook events confirm delivery/bounce later [1]","All recipients resolved to accepted/failed or retries exhausted"]
        - ["No webhook/events observed within expected window","Escalate to ops; run targeted API queries or retries","Provider support or inspection of event pipeline","Operator confirms event gap or provides per-recipient status"]
featured: false
collections: ["email-infrastructure-decisions"]
learningPaths: ["email-infrastructure"]
keyTakeaways:
  - "Teams losing per-recipient status when a bulk request partly fails"
  - "Recipient-level reconciliation is narrower than generic send-state modeling"
  - "Link from batch, webhook, and suppression pages"
commonMistakes:
  - "Skipping this check: On any partial or non-2xx bulk response, mark the batch as 'reconciliation required' and persist the raw response."
  - "Skipping this check: Parse and persist per-recipient entries when present, including provider error codes and message IDs."
  - "Skipping this check: If no per-recipient details are present, use provider error classification to decide: query result endpoint, wait for events, or schedule targeted retries."
faqs:
  - question: "If a bulk request returns 500, should I assume all recipients failed?"
    answer: "No. A 500/5xx indicates the request failed at the API layer but does not prove per-recipient status. Persist the raw response, mark recipients as unknown, and either query a provider per-message endpoint, wait for event/webhook confirmation, or retry the recipients with idempotency. The correct action depends on your provider’s error classification and whether per-recipient results were already returned."
  - question: "How long should I wait for webhooks before retrying?"
    answer: "Wait a provider-informed window based on documentation or observed delivery latency; treat this as provider-specific and uncertain. If you have no documented guidance, choose a conservative short window (minutes) for transient errors and a longer window (hours) for acceptance/delivery events, then escalate. Do not treat the absence of a webhook within a short window as proof of delivery."
  - question: "Can I rely solely on message IDs returned in a partial response?"
    answer: "Message IDs are useful correlation keys but are not by themselves a terminal delivery proof. Persist message IDs and use them to correlate later webhook events or provider queries. If the provider’s docs state that message IDs represent accepted sends, treat that as directional guidance and still wait for events or confirmed per-recipient statuses when possible [2]."
nextStep:
  label: "Continue with Amazon SES Account-Level Suppression: How to Use It"
  href: "/repmail/learn/infrastructure/aws-ses-account-level-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

When a bulk send API call returns a partial failure, reconcile each recipient record immediately — do not infer per-recipient success from the overall request status. Reconciliation prevents silent omissions, duplicate retries, and incorrect reporting by ensuring every recipient has a recorded terminal or retryable state.

## Decision boundary: what to reconcile and why

Treat each recipient address in a bulk request as an independent unit of work for delivery-state reconciliation. The API-level response for a bulk request may report overall failure or partial failure while still reporting per-recipient results; your reliable state must reflect each recipient’s outcome, not just the HTTP status. Evidence limits: some providers return detailed per-recipient items in the same response, others return only an overall error code; design your recon process to handle both cases.

Practical sequence: on any non-2xx or partial success response, immediately capture the raw provider response and mark the bulk job as “reconciliation required.” Then, for each recipient, decide whether you have a definitive provider answer (success, rejected, invalid) or need follow-up (unknown, transient error). Store that distinction explicitly so later systems know which recipients can be considered terminal.

## How to extract per-recipient truth from provider responses

If the provider returns a per-recipient array, parse and persist each record’s status and any provider-specific error codes or message IDs. If the response lacks per-recipient details, use the provider’s suggested retry semantics or error classification to determine whether you must query a follow-up endpoint, listen for asynchronous events, or retry the entire recipient subset.

For example: with services that provide event publishing or message IDs, link those IDs to recipients for downstream webhook correlation; if the provider indicates you exceeded a per-request limit, split recipients and resend. Always record the raw payload and timestamps so operators can re-run reconciliation without losing original evidence.

## Follow-up sources: querying APIs, events, and webhooks

Sequence your follow-up sources by fidelity and latency: firstly, re-request any provider per-recipient result endpoints if available; secondly, await event/webhook delivery that confirms acceptance, delivery, bounce, or complaint; thirdly, fallback to retrying the send for recipients still marked unknown. Be explicit about time windows: webhooks may arrive later and are authoritative only for the events they emit [1].

Evidence limits: event streams can be delayed or dropped depending on configuration; do not treat absence of a webhook as proof of success. Provider docs sometimes describe event publishing as the canonical source for delivery events, but the timing and retention are provider-specific [1].

## Retry strategy and idempotency controls

Define retry windows and backoff for recipients in unknown or transient-error states. Use idempotency keys or per-recipient message identifiers so retries do not create duplicates in downstream reporting or inboxes. If you must split a failed bulk batch into smaller requests, preserve a mapping of original recipient→attempt to aid deduplication and audits.

Stop conditions: stop retrying when the provider returns a terminal rejection (invalid address, blocked) or when you’ve reached a pre-defined retry budget (for example, three attempts within 24 hours). Record which condition stopped retries to support reporting and escalation.

## Operational ownership and monitoring

Assign a single owner (e.g., outbound-ops) for reconciliation alerts and provide a lightweight dashboard that surfaces: number of recipients with unknown state, age distribution, and last-action per recipient. Alert on growing backlogs of unknown recipients and on patterns where partial failures cluster by sending IP, content, or recipient domain.

Decision and auditability: keep a joinable log of raw provider responses, reconciliation actions taken, and final per-recipient state. This lets operations answer questions such as whether a recipient was ever accepted by the provider or only assumed delivered by your system.

## Practical checklist

- [ ] On any partial or non-2xx bulk response, mark the batch as 'reconciliation required' and persist the raw response.
- [ ] Parse and persist per-recipient entries when present, including provider error codes and message IDs.
- [ ] If no per-recipient details are present, use provider error classification to decide: query result endpoint, wait for events, or schedule targeted retries.
- [ ] Add idempotency keys or per-recipient identifiers before retrying; record mappings from original attempt to retry attempts.
- [ ] Set explicit retry budget and stop conditions (e.g., 3 attempts or 24 hours) and log which stop condition was reached.
- [ ] Subscribe to the provider’s event/webhook stream and correlate events to recipients using message IDs or metadata [1].
- [ ] Expose a reconciliation backlog metric and alert when unknown recipient count exceeds a threshold or age window.
- [ ] Store raw evidence for each reconciliation decision to enable audits and operator replays.
- [ ] Periodically run a reconciliation drill: simulate partial failure and verify your pipeline resolves all recipients to terminal states.

## Where RepMail fits

Use this guide as a checklist and decision aid when integrating provider bulk APIs into RepMail workflows: ensure every recipient in a bulk send has a recorded per-recipient state before marking jobs complete, surface reconciliation backlogs in outbound dashboards, and log raw provider responses so operators can re-run reconciliation. This reduces silent omissions and incorrect success reporting in downstream reporting and automation.

Continue with [Amazon SES Account-Level Suppression: How to Use It](/repmail/learn/infrastructure/aws-ses-account-level-suppression) for the next step in the workflow.

## Related RepMail guides

- [ARC Chain Validation Failure: Find the First Broken Instance](/repmail/learn/infrastructure/arc-chain-first-failure)
- [Rate-Limit Failure Modes: 429, 454, and Provider-Specific Throttles](/repmail/learn/infrastructure/email-rate-limit-429-454-throttles)


## Sources

[1]: https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html "Amazon SES developer documentation"
[2]: https://docs.aws.amazon.com/ses/latest/dg/send-email-api.html "Amazon SES developer documentation"
