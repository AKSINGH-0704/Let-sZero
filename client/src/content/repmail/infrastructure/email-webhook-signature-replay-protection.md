---
product: repmail
academy: infrastructure
contentType: guide
slug: email-webhook-signature-replay-protection
title: "Email Webhook Signature Verification and Replay Protection"
description: "Email Webhook Signature Verification and Replay Protection — Engineers exposing event endpoints to forged or replayed provider payloads."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["infrastructure","webhook","email","verification","signature","replay","protection"]
assets:
  - type: table
    title: "Decision/Diagnostic table: verification outcomes and operator action"
    content:
      headers: ["Observed outcome","Likely cause","Immediate response","Safe operator action"]
      rows:
        - ["Signature mismatch, valid timestamp","Wrong secret, misconfiguration, or forged request","Reject (401/403), log full headers","Check secret in vault, validate provider config, rotate secret if compromise suspected"]
        - ["Valid signature, timestamp outside window","Delivery delay or clock skew","Reject/queue for manual review, log time delta","Check NTP across ingestion nodes, investigate provider retry behavior"]
        - ["Valid signature, nonce seen","Provider retry or duplicate delivery","Acknowledge, no update to authoritative state","Record metrics, ignore duplicate; reconcile if repeated from many IPs"]
        - ["Missing signature field","Provider misconfiguration or unsupported webhook","Reject and log; notify provider contact","Confirm provider sends signed events per docs; fallback to IP allowlist only if acceptable"]
        - ["Valid signature, new nonce, out-of-order timestamp","Queued/delayed event older than applied state","Apply only if timestamp > stored record timestamp","Compare event timestamps; if older, log and drop to avoid regressions"]
        - ["Valid signature, new nonce, within window","Normal case","Process idempotently and update authoritative systems","Store nonce and applied-event id; increment success metric"]
featured: false
collections: ["email-infrastructure-decisions"]
learningPaths: ["email-infrastructure"]
keyTakeaways:
  - "Engineers exposing event endpoints to forged or replayed provider payloads"
  - "Security boundary, not webhook retries or event schema migration"
  - "Link from webhook and observability hubs"
commonMistakes:
  - "Skipping this check: Store provider secrets in a vault and avoid embedding them in code or environment variables."
  - "Skipping this check: Canonicalize payload according to provider docs before signature verification; use constant-time comparisons."
  - "Skipping this check: Require timestamp or nonce in signed payload; enforce a conservative time window (example: ±300s) and persist seen nonces for that window."
faqs:
  - question: "What time window should I use for replay protection?"
    answer: "There is no universal number; choose based on expected delivery latency and risk profile. A conservative starting point is ±300 seconds. Shorter windows reduce replay risk but increase false rejects for delayed deliveries. If using a provider that documents its timestamp semantics, prefer that guidance and state uncertainty where provider docs are ambiguous [1]."
  - question: "If a provider doesn’t sign payloads, what can I do?"
    answer: "If signatures are unavailable, combine strict transport controls (TLS), IP allowlists, mutual TLS or client certificates, and strict idempotent processing. Treat unsigned events as lower trust: log for manual review, avoid automatic changes to suppression/billing when possible, and request the provider enable signing. This is a pragmatic mitigation, not a full substitute for cryptographic verification."
  - question: "Can I rely solely on IP allowlists for webhook security?"
    answer: "No. IP allowlists are useful defense-in-depth but insufficient alone: IP ranges can be spoofed via misconfigured networks or abused if the provider has shared infrastructure. Use them alongside signature verification and replay protection. Where provider documentation specifies signatures, follow that primary method [1]."
nextStep:
  label: "Continue with Amazon SES Account-Level Suppression: How to Use It"
  href: "/repmail/learn/infrastructure/aws-ses-account-level-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Verify webhook signatures AND enforce replay protection before acting on provider event payloads. Use a two-part flow: cryptographic signature verification (match HMAC or provider token) plus a timestamp/nonce-based replay window with persisted state. Treat failures as non-authoritative: log, alert, and reject or queue for manual review rather than updating suppression/billing/status records.

## Core decision boundary: verify then accept

Always separate authentication from processing. First confirm the payload’s signature or token matches your stored provider secret. Only after authentication passes should you check the timestamp/nonce for replay protection and apply the event to authoritative systems (suppression lists, billing counters, customer status). If either step fails, do not update authoritative data; instead return an error and record full context for investigation.

Evidence limits: different providers use different signing schemes (HMAC, public key, timestamped tokens). Use the provider documentation for exact fields and algorithms; for Mailgun this includes documented webhook signatures and payload fields [1]. If a provider’s docs lack a timestamp, you must rely on stronger request-level controls (e.g., TLS client certs, IP allowlists) and assume higher residual risk.

## Implement signature verification correctly

Canonicalize the payload exactly as the provider specifies before computing/verifying signatures. Common mistakes are comparing against a re-serialized JSON or using the wrong character encoding. If the provider supplies an HMAC signature (e.g., header or form field), compute HMAC using the same algorithm and secret and perform a constant-time comparison to avoid timing attacks.

Practical sequence: retrieve your stored secret/ public key; extract the provider signature field; canonicalize the incoming payload as documented; compute expected signature; perform constant-time equality check. On mismatch, return HTTP 401/403 and include an idempotent decision log entry with raw payload, headers, and verification result. For Mailgun-specific fields and approaches see their webhook security notes [1].

## Add replay protection: timestamp windows and nonce/state

Replay protection requires a timestamp in the signed data or a replay-resistant nonce. When the signature includes a timestamp, accept payloads only within a conservative window (e.g., ±300 seconds) and persist seen nonces or message IDs for the window’s duration. If the provider doesn’t include timestamps or unique IDs, combine short windows with idempotency checks upstream (e.g., only accept status transitions that are monotonic) and stronger transport controls.

Persistence and state: store a short-lived cache (Redis, in-memory with persistence, or DB table) of seen nonces/message IDs keyed by provider and webhook type. On a match, treat as duplicate and discard or reconcile with an idempotent handler. Evict entries after the window plus safe margin. If you observe clock skew across multiple ingestion nodes, use a central time source or include node offsets in diagnostics.

## Failure modes, alerts, and operator playbook

Treat signature failures, expired timestamps, and duplicate nonces differently. Signature failures likely indicate misconfiguration, secret rotation, or a forged sender—create high-priority alerts and include the raw headers for debugging. Timestamp-expired events often imply delivery delays; treat these as medium-priority and surface to retention/queue owners. Nonce duplicates are usually retries; count and discard duplicates but monitor for repeated duplicates from many IPs (possible replay attack).

Operator steps: on signature failure, validate the stored secret, confirm provider-side signing configuration, and check for secret rotation logs. For timestamp errors, check system clocks (NTP), queueing layers, and provider retry windows. For duplicate nonces, correlate IPs and user agents and raise an incident if duplicates spike across many senders.

## Integrate idempotency and safe update rules

Even with verification and replay protection, build idempotent handlers so repeated legitimate deliveries don’t corrupt systems. Use event-message IDs (provider message-id, event-id) as idempotency keys for operations that change suppression, billing, or status.

Safe update rules: only upgrade a status if the event’s timestamp and event sequence indicate a forward transition; for example, don’t mark a message as delivered if a later event already marked it bounced. Record the applied event id and timestamp with each authoritative record so you can reject or reconcile older events automatically.

## Testing, observability, and staged rollouts

Create a test harness that can replay signed and unsigned payloads, expired timestamps, and duplicate nonces. Run these tests against a staging endpoint that mirrors production signing secrets in a vault and use synthetic traffic to validate alerting and idempotency.

Observability: capture verification result, timestamp delta, nonce seen flag, and source IP in structured logs and metrics. Build dashboards tracking signature failures per source, expired-timestamp count, duplicate-rate, and latency between provider event time and ingestion time. These let you set pragmatic thresholds and spot provider regressions quickly.

## Practical checklist

- [ ] Store provider secrets in a vault and avoid embedding them in code or environment variables.
- [ ] Canonicalize payload according to provider docs before signature verification; use constant-time comparisons.
- [ ] Require timestamp or nonce in signed payload; enforce a conservative time window (example: ±300s) and persist seen nonces for that window.
- [ ] Persist seen event IDs/nonces in a short-lived cache (Redis or DB) and evict after window + margin.
- [ ] Treat signature failures as high-priority: log raw headers, alert owners, and reject updates to authoritative systems.
- [ ] Implement idempotent handlers using provider event-id/message-id as idempotency keys.
- [ ] Record applied-event id and timestamp alongside any suppression/billing/status changes.
- [ ] Add structured metrics for signature_failures, replay_expired, and duplicate_events and alert when rates spike.
- [ ] Run staged tests with signed, expired, and duplicate payloads against staging endpoints before rolling to production.

## Where RepMail fits

Use this guide as a checklist and runbook when integrating provider webhooks into RepMail-driven outbound workflows. The verification and replay checks described here should be enforced before any RepMail-related suppression, billing, or status writes; instrument the same metrics/alerts into your RepMail observability dashboard so webhook-origin failures surface in outbound operational tooling.

Continue with [Amazon SES Account-Level Suppression: How to Use It](/repmail/learn/infrastructure/aws-ses-account-level-suppression) for the next step in the workflow.

## Related RepMail guides

- [CNAME Flattening and DKIM Verification: Detecting Provider Interference](/repmail/learn/infrastructure/cname-flattening-dkim-verification)
- [DKIM Multiple Signatures: Which Signature Can Satisfy DMARC?](/repmail/learn/infrastructure/multiple-dkim-signatures-dmarc)


## Sources

[1]: https://documentation.mailgun.com/docs/mailgun/user-manual/webhooks/securing-webhooks "Supporting technical or operational reference"
[2]: https://documentation.mailgun.com/docs/mailgun/user-manual/webhooks/webhook-payloads "Supporting technical or operational reference"
