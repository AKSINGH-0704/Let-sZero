---
product: repmail
academy: infrastructure
contentType: guide
slug: email-webhook-acknowledgement-processing
title: "Email Webhook Acknowledgement vs. Processing: Return Fast Safely"
description: "Webhook Acknowledgement vs Processing: Return Fast Without Losing E… — Teams doing slow work inside webhook requests and triggering duplicates."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["infrastructure","webhook","email","acknowledgement","processing","return"]
assets:
  - type: table
    title: "Quick decision table: should work run in the webhook handler?"
    content:
      headers: ["Work type","Safe in HTTP handler?","Recommended action","Stop condition"]
      rows:
        - ["Validate signature, required fields","Yes","Do synchronously (<200–500ms) and fail fast","Validation takes >500ms or needs external calls"]
        - ["Persist raw payload + dedupe key","Yes","Persist in the handler and return success after commit","Persistence latency or error"]
        - ["Enrich with third‑party API data","No","Enqueue background job to fetch/enrich","Third‑party API is local and <50ms (rare)"]
        - ["Send user-facing notifications (email/SMS)","No","Queue worker to send after processing","Notifications must be synchronous for SLA (then move provider)"]
        - ["Complex DB transactions across services","No","Run in background with idempotency and retries","Transaction fits within strict, proven short latency budget"]
        - ["Bulk or long-running transforms","No","Process in batch workers or async pipelines","Transform is small and predictable"]
featured: false
collections: ["email-infrastructure-decisions"]
learningPaths: ["email-infrastructure"]
keyTakeaways:
  - "Teams doing slow work inside webhook requests and triggering duplicates"
  - "Separates HTTP acknowledgement from durable processing; not retry schedule itself"
  - "Link from webhook security, queue, and idempotency pages"
commonMistakes:
  - "Skipping this check: Validate signature and required fields quickly; reject invalid payloads immediately."
  - "Skipping this check: Persist raw payload and a canonical dedupe key in one fast, durable operation."
  - "Skipping this check: Return provider-required success status only after persistence succeeds."
faqs:
  - question: "If I persist the event and return 200 but a worker fails, will the provider stop retrying?"
    answer: "Returning the expected success status tells the provider the event was delivered; provider retries are based on delivery acknowledgement, not your downstream worker status. This means you must treat the persisted event as the single source of truth and ensure workers can retry or be restarted without requiring provider resend. Confirm provider retry semantics in their docs for edge cases [1]."
  - question: "What makes a good dedupe key for webhook events?"
    answer: "Prefer the provider-supplied unique event id (if present) as the primary dedupe key. If absent, compute a stable hash of immutable fields (timestamp, message id, event type). Persist it atomically with the raw payload so acknowledgement reflects single-write durability. If provider ids can be reused or retroactively changed, add a namespace or source identifier to the key."
  - question: "When should I return an error to force provider retries?"
    answer: "Return an error when you cannot durably persist the event (database outage) or when the payload fails authentication/validation. Do not return an error for downstream worker failures; instead, rely on worker retry and monitoring. Check your provider’s retry documentation to understand their retry cadence before adjusting this behavior [1]."
nextStep:
  label: "Continue with Amazon SES Account-Level Suppression: How to Use It"
  href: "/repmail/learn/infrastructure/aws-ses-account-level-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Return HTTP 200 (or provider-required success) quickly from webhook endpoints and move durable, slow work into an asynchronous processor so providers don’t retry and you don’t create duplicates. Acknowledge receipt within the provider’s expected latency, persist the raw event and a deduplication key, then enqueue background processing that is idempotent and observable.

## Decision boundary: acknowledgement vs processing

Treat the webhook HTTP response as a delivery receipt, not the completion of business logic. The HTTP response should confirm the provider that you received the payload; any work that can block or retry should be deferred.
Design the endpoint so that acknowledgement requires only two fast operations: validating authenticity (lightweight), and atomically persisting the raw event and a dedupe key. Do not perform external API calls, long database transformations, or downstream notifications synchronously.

## Evidence limits and provider behavior

Providers typically retry webhook delivery when they do not receive the expected success status or when response timeouts occur; Mailgun documents retry behavior and payload shapes which inform what they expect for acknowledgement [1][2]. This guide uses those provider behaviors as directional evidence—specific retry windows and statuses can change, so verify against your provider docs.
Because retry policies vary, implement a short, deterministic acknowledgement path and rely on durable storage instead of timing assumptions. Where provider docs are silent or ambiguous, prefer conservative designs that avoid blocking the HTTP response.

## Practical sequence to implement reliable acknowledgements

1) Authenticate and minimally validate the webhook (signature, required fields). Reject obviously invalid payloads immediately with an error status.
2) Persist the raw payload and a dedupe key (for example: provider event id, message id, or computed hash) in a durable store within a single fast transaction. If persistence fails, return an error so the provider can retry.
3) Immediately return the configured success response (e.g., HTTP 200) once persistence succeeds. Enqueue a background job with the stored event id for downstream processing.
4) Run all slow or retry-prone work—parsing, heavy database updates, notifications, third-party API calls—in the background worker. Ensure that workers are idempotent and use the persisted event id to deduplicate work.

## Idempotency and deduplication strategy

Use a single authoritative dedupe key persisted at acknowledgement time (provider event id or stable hash). Workers should check a processing log or status field prior to applying changes; transitions should be atomic (e.g., compare-and-set or transactional status updates).
Design worker operations as either idempotent (safe to run many times) or guarded by a processed marker. Include a TTL or archival policy for stored raw events and processed markers to bound storage costs and avoid re-processing indefinitely.

## Operational controls, observability, and failure modes

Instrument three observability signals: acknowledgement latency and success rate, queue length and worker throughput, and duplicate detection counts. Alert on persistent increases in acknowledgement latency or on repeated persistence failures (these indicate the HTTP path is at risk).
Failure modes to plan for: persistence store outage (return error so provider retries), worker backlog (degrade non-critical downstream jobs or scale workers), and duplicate processing (detect via dedupe key and mark events as already-processed). Create a runbook that specifies when to pause acknowledgement and when to fail open to protect upstream providers.

## Practical checklist

- [ ] Validate signature and required fields quickly; reject invalid payloads immediately.
- [ ] Persist raw payload and a canonical dedupe key in one fast, durable operation.
- [ ] Return provider-required success status only after persistence succeeds.
- [ ] Enqueue background job referencing persisted event id; do not include heavy work in the HTTP handler.
- [ ] Ensure background workers use idempotent operations or a processed-status compare-and-set.
- [ ] Instrument: acknowledgement latency, persistence errors, queue depth, duplicate counts.
- [ ] Alert when acknowledgement success rate drops or persistence latency increases.
- [ ] Archive raw events and processed markers on a retention schedule to bound storage.

## Where RepMail fits

Use this guide as an operational checklist and decision aid inside outbound-event workflows: treat webhook acknowledgements as a binary delivery receipt and move all outbound or slow work into idempotent, observable background processing. This reduces upstream retries and duplicate-triggered sends and provides concrete runbook items you can map into RepMail’s outbound reliability processes.

Continue with [Amazon SES Account-Level Suppression: How to Use It](/repmail/learn/infrastructure/aws-ses-account-level-suppression) for the next step in the workflow.

## Related RepMail guides

- [Email Webhook Signature Verification and Replay Protection](/repmail/learn/infrastructure/email-webhook-signature-replay-protection)
- [ARC Chain Validation Failure: Find the First Broken Instance](/repmail/learn/infrastructure/arc-chain-first-failure)


## Sources

[1]: https://documentation.mailgun.com/docs/mailgun/user-manual/webhooks/webhook-retries "Supporting technical or operational reference"
[2]: https://documentation.mailgun.com/docs/mailgun/user-manual/webhooks/webhook-payloads "Supporting technical or operational reference"
