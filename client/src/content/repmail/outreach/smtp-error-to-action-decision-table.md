---
product: repmail
academy: outreach
contentType: guide
slug: smtp-error-to-action-decision-table
title: "SMTP Error-to-Action Decision Table"
description: "SMTP Error-to-Action Decision Table — Operators need a compact map from transient/permanent SMTP evidence to retry, suppress, investigate, or escalate."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","smtp","error","action","decision"]
assets:
  - type: table
    title: "Compact decision table: SMTP evidence -> operational action"
    content:
      headers: ["Observed evidence (common phrasing)","Decision","Owner","Retry behavior / stop condition"]
      rows:
        - ["550 5.1.1 'User unknown' or 'Mailbox not found'","Suppress (permanent)","Suppression owner (ops)","No retries; add to suppression list; record transcript"]
        - ["421/450 4.x.x 'Temporarily unavailable' or connection timeout","Retry (transient)","Delivery queue engine","Exponential backoff (e.g., 1h,4h,24h), stop after max attempts or success"]
        - ["452/4xx with rate-limit wording or 'try again later'","Retry with throttled backoff + instrument","Delivery queue engine; notify ops if persistent","Smaller initial rate, exponential backoff; escalate if persists past threshold"]
        - ["5xx ambiguous 'service unavailable' without enhanced-status","Investigate","Deliverability analyst","Pause retries; perform transcript and DNS/MX checks; decide suppress or resume"]
        - ["Connection TLS failure, DNS resolution error, or connection reset","Retry (transport transient)","Delivery queue engine","Immediate retry per backoff; escalate after repeated failures"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Operators need a compact map from transient/permanent SMTP evidence to retry, suppress, investigate, or escalate."
  - "Distinct from enhanced-status explainer: operational action policy with ownership and retry state."
  - "bounce evidence; provider throttling; retry queue"
commonMistakes:
  - "Skipping this check: Log SMTP reply code and enhanced-status (if present) for every attempt."
  - "Skipping this check: Apply a fixed retry schedule with exponential backoff and a maximum attempt count."
  - "Skipping this check: Suppress immediately for unambiguous 5.x.x address errors (e.g., 5.1.1)."
faqs:
  - question: "When should I suppress without waiting for multiple attempts?"
    answer: "Suppress immediately only for unambiguous permanent signals, typically 5.x.x enhanced-status codes indicating address problems (for example 5.1.1). If the server provides a clear permanent enhanced-status and wording indicating 'user unknown' or 'mailbox unavailable', stop retries and add the recipient to suppression. If the message lacks an enhanced-status or is phrased ambiguously, follow the retry schedule and escalate to investigation if the pattern persists."
  - question: "How many retries are appropriate before escalation or suppression?"
    answer: "There is no universal number; choose a defensible policy and apply it consistently. A common pattern is 3–5 retries with exponential backoff over 24–72 hours. Escalate to investigation if transient errors persist beyond your maximum attempts or if mixed error classes appear. Document the policy and retain transcripts to support any suppression or escalation decisions."
  - question: "Can enhanced-status codes be trusted as authoritative?"
    answer: "Enhanced-status codes are standardized guidance (RFC 3463) and useful for refining decisions, but providers sometimes omit or misuse them. Use enhanced-status when present but verify with the human-readable text and operational context; treat provider-specific phrasing and undocumented codes cautiously and escalate when necessary [2]."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Use SMTP response class (2xx/4xx/5xx), enhanced-status codes when present, and transport evidence (temporary connection errors, recipient syntax, policy messages, rate-limit hints) to decide whether to retry, suppress, investigate, or escalate. Map each observed condition to a single operational action, an owner, and a stop condition so retries are safe and suppression consistent.

## Decision boundary: permanent vs transient evidence

Classify responses first by SMTP reply code family: 2xx (success), 4xx (temporary), 5xx (permanent). Treat 5xx as candidate for suppression, 4xx as candidate for retry, and 2xx as delivery success. When an enhanced-status code (RFC 3463) is present, use its class (e.g., 5.1.x address issues) to refine the decision [2].
Identify limits: network-level connection failures (timeouts, connection resets) are transport-level transient signs even if the last SMTP server returned 5xx previously. Conversely, consistent 5xx/5.x.x responses over multiple attempts indicate permanence and justify suppression. Define numeric thresholds (e.g., number of failed attempts or elapsed hours) in your retry policy before changing action.

## Evidence types and what they imply

Categorize evidence into three buckets: SMTP reply code plus enhanced status, transport/connection errors, and provider throttling or policy signals (message content/policy invoked). SMTP 5.1.x or 5.2.x with explicit 'user unknown' or 'mailbox unavailable' wording is clear suppression evidence; ambiguous 5xx messages (e.g., 'service unavailable') require investigation.
Provider throttling messages often appear as 4xx with rate-limit wording or as documented provider-specific codes; treat these as retryable but instrument them for exponential backoff and owner alerts if they persist. Connection timeouts, DNS failures, and transient TLS errors are retryable; escalate only after configured retry attempts fail.

## Practical retry sequence and stop conditions

Define a deterministic retry schedule that escalates owner attention when retries fail. Example sequence: immediate retry for transient transport failures, then exponential backoff (e.g., 1h, 4h, 24h) with a maximum number of attempts (e.g., 3–5) before either suppressing or escalating. Stop conditions include a definitive permanent SMTP 5xx code, successful 2xx response, or reaching the configured retry limit.
Record each attempt and final error text in the envelope or delivery log. If enhanced-status codes indicate a different reason midway (e.g., first attempts return 4xx then later 5.1.1), switch the action to suppression immediately and stop retries.

## Investigation and escalation rules

Route investigation to a named owner when evidence is ambiguous or when repeated transient responses exceed thresholds. Triggers for investigation: mixed 4xx/5xx history for the same recipient, provider policy hints without clear action, or throttling that persists beyond the backoff schedule. The investigator should gather the last N SMTP session transcripts, DNS/MX resolution history, and any sending rate or pattern changes.
Escalate to engineering or ISPs when there is a systemic pattern (many recipients showing the same transport or 5xx class), suspected deliverability blocklisting, or when providers request operator contact. Document the escalation stop condition: provider response resolving the block, a change in error class, or confirmation that suppression is required.

## Ownership, logging, and auditability

Assign owners for each action: Delivery queue engine owns retries and backoff enforcement; Suppression list owner (ops) owns permanent suppression decisions; Investigations routed to a deliverability analyst; Escalation routed to engineering or provider liaison. Record discrete fields for: SMTP reply code, enhanced-status, raw server text, connection/tls state, attempt count, timestamps, and final action.
Audit trails must allow replay: keep full SMTP transcripts for at least the period of your longest retry window plus an investigation buffer. Use these records to refine thresholds and to justify suppressions to internal stakeholders or providers.

## Examples and limits of interpretation

Example: '550 5.1.1 User unknown' is suppression evidence; stop retries immediately and add to suppression list. Example: '421 4.7.0 [TS01] Messages from your IP temporarily deferred' is retryable; apply backoff and monitor rate.
State uncertainty: provider-specific wording and undocumented internal thresholds vary; RFCs define enhanced-status conventions but not provider policies [2] [1]. When a message contains only free-text without an enhanced-status, treat the response conservatively and escalate for human review after a small number of retries.

## Practical checklist

- [ ] Log SMTP reply code and enhanced-status (if present) for every attempt.
- [ ] Apply a fixed retry schedule with exponential backoff and a maximum attempt count.
- [ ] Suppress immediately for unambiguous 5.x.x address errors (e.g., 5.1.1).
- [ ] Retry transient transport errors (timeouts, DNS failures) and throttle signals with backoff.
- [ ] Route ambiguous or mixed-result series to a named investigator after threshold breaches.
- [ ] Record ownership and stop condition with each final action (retry, suppress, investigate, escalate).
- [ ] Retain full SMTP transcripts for the duration of retry window plus investigation buffer.
- [ ] Alert on provider-wide patterns (many recipients with same error) for escalation.
- [ ] Document suppression reason and retain evidence to reverse if provider proves recovery.

## Where RepMail fits

Use this guide as a practical checklist and decision aid in an outbound workflow: embed the decision table into retry-queue logic, log the discrete fields listed, and assign owners for each action. The table helps reduce unsafe retries and inconsistent suppressions by making each step deterministic and auditable. This document does not state that RepMail implements these policies; it can be used to shape your internal retry and suppression rules.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Campaign Rollback and Pause Decision Table](/repmail/learn/outreach/campaign-rollback-pause-decision-table)
- [Yahoo SMTP Error Codes: Build a Sender-Side Triage Table](/repmail/learn/deliverability/yahoo-smtp-error-codes-sender-triage)


## Sources

[1]: https://www.rfc-editor.org/rfc/rfc5321 "IETF RFC reference"
[2]: https://www.rfc-editor.org/rfc/rfc3463 "IETF RFC reference"
