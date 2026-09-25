---
product: repmail
academy: infrastructure
contentType: guide
slug: email-rate-limit-429-454-throttles
title: "Rate-Limit Failure Modes: 429, 454, and Provider-Specific Throttles"
description: "Rate-Limit Failure Modes: 429, 454, and Provider-Specific Throttles — Engineers mapping HTTP and SMTP throttling signals to actions."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["infrastructure","provider","email","rate","limit","failure"]
assets:
  - type: table
    title: "Throttle diagnostic decision table"
    content:
      headers: ["Observed signal","Where to check next","Immediate action","Follow-up stop condition"]
      rows:
        - ["HTTP 429 with Retry-After","Retry-After header (seconds/date); response body","Wait for Retry-After; reduce concurrency; log response","Retry succeeds after wait or provider returns different code"]
        - ["HTTP 429 without Retry-After","Headers, body, recent send-rate metrics","Exponential backoff with jitter; decrease rate by factor","Backoff window exceeded or persistent 429s → escalate"]
        - ["SMTP 454 at RCPT TO","Transcript to identify per-recipient vs connection-level","Pause attempts to that recipient domain; continue others at reduced rate","Repeated per-recipient 454s for N attempts → pause domain and escalate"]
        - ["SMTP 454 at CONNECT or MAIL FROM","Connection-level logs and concurrent connections","Reduce new connections to that host/IP; apply circuit-breaker","Persistent connection-level throttles → pause host and escalate"]
        - ["Provider message mentioning quota or limit","Provider docs or account dashboard (directional)","Respect any explicit Retry-After or recommended window; open provider support ticket if unclear","Provider confirms quota change or responds with permanent guidance"]
featured: false
collections: ["email-infrastructure-decisions"]
learningPaths: ["email-infrastructure"]
keyTakeaways:
  - "Engineers mapping HTTP and SMTP throttling signals to actions"
  - "Cross-protocol error mapping, not selected provider-rate-limit page"
  - "Link from SMTP status and retry pages"
commonMistakes:
  - "Skipping this check: On HTTP 429, parse Retry-After header and use as minimum wait; if absent, start exponential backoff with jitter."
  - "Skipping this check: On SMTP 454 or 4.X.X, record which SMTP command triggered the response (CONNECT, MAIL FROM, RCPT TO, DATA) before deciding per-recipient vs global backoff."
  - "Skipping this check: Log full protocol transcripts (headers, status lines, bodies) and persist at least one representative sample per distinct throttle signature."
faqs:
  - question: "Should I treat every 4XX/429 as 'pause and retry' automatically?"
    answer: "No. Treat 429 and 4.X.X as transient by default, but parse accompanying headers/text for Retry-After and watch for permanent 5.X.X responses or explicit provider instructions. Also distinguish where the SMTP 4.X.X was returned (per-recipient vs connection-level) before deciding whether to pause a single recipient, domain, or entire connection pool."
  - question: "How long should exponential backoff continue before human escalation?"
    answer: "Set concrete stop conditions in policy: a maximum retry count and a maximum elapsed window (for example, X attempts or Y minutes). The exact X/Y depend on business tolerance; choose conservative defaults and escalate when repeated throttles persist or when provider responses change from transient to permanent. Record uncertainty and collected evidence before escalation."
  - question: "Can provider documentation be trusted for throttle thresholds?"
    answer: "Provider docs are directional evidence but can lag or omit specific enforcement details. Use documented guidance when available (e.g., SES documentation for quotas) and combine it with observed responses and Retry-After headers. Explicitly state uncertainty for provider-specific thresholds and avoid hard-coding undocumented limits [1]."
nextStep:
  label: "Continue with Amazon SES Account-Level Suppression: How to Use It"
  href: "/repmail/learn/infrastructure/aws-ses-account-level-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

429 (HTTP) and 454 (SMTP) signals indicate throttling: they tell you to slow or stop sending for a period rather than that a message is permanently undeliverable. Map HTTP 429s, SMTP 454/4.X.X transient errors, and provider-specific throttle responses into a small set of operator actions (backoff, queueing, escalation) and validate using protocol-specific evidence before changing sender behavior.

## Decision boundary: transient throttle vs permanent rejection

Treat 429 and 454-family codes as transient throttles until explicit permanent codes are observed (e.g., SMTP 5.X.X) or the provider returns a clear quota-exceeded permanent response. The operator's responsibility is to determine whether the server asked for temporary pause or is indicating a long-term limit.
Evidence limits: HTTP 429 always denotes a rate-limit/temporary condition by common practice, but servers may include Retry-After headers which you must parse when present. SMTP 454 and other 4.X.X codes are transient by RFC semantics, but vendor messages appended to the code can contain guidance; parse both numeric and text parts [2].
Practical sequence: 1) Detect numeric class (HTTP 429 or SMTP 4XX/454), 2) Parse accompanying headers/text for Retry-After, quota or throttle reason, 3) Apply transient handling (backoff and requeue) unless explicit permanent indication is present.

## HTTP 429 handling: deterministic backoff and header use

When receiving 429, first look for Retry-After (seconds or HTTP date). If present and parseable, respect it as the minimum wait. If absent, apply exponential backoff with jitter and a safe ceiling tuned to your sender scale—do not immediately escalate to human intervention unless backoff repeatedly fails.
Evidence limits: Some providers return Retry-After consistently; others do not. Use the presence of Retry-After as a stronger signal but do not assume its absence implies no throttle. Log the full response (headers and body) for triage and correlation with other clients sharing the same credentials or IP.

## SMTP 454 and 4.X.X: per-recipient vs connection-level throttles

SMTP 454 can be returned for per-recipient, per-connection, or per-sender conditions. Inspect whether the 454 is returned in response to RCPT TO, DATA, or during connection setup—this determines whether to back off specific recipient attempts or the entire connection pool.
Evidence limits: RFC 3463 describes enhanced status codes that help disambiguate the nature of the transient error; use the 4.X.Y fields and any explanatory text when present [2]. Practical sequence: if RCPT TO yields 454, pause attempts to that recipient domain for a backoff window; if the response arrives at connection level (before MAIL FROM), pause new connections to that host/IP.

## Provider-specific throttles and operational uncertainty

Many providers attach textual explanations or custom headers to throttles; treat these as directional data, not absolute policy. For example, AWS SES documents throttle and quota behaviors and suggests reading service-specific guidance when available [1].
State uncertainty: provider thresholds and enforcement details are often undocumented or change; do not hard-code presumed limits. Instead, use observed response patterns and provider-reported Retry-After values to drive adaptive limits and escalation triggers.

## Practical retry policy: limits, backoff, and stop conditions

Implement multi-tier retry logic: immediate retry for transient network blips, exponential backoff for 429/454 with server-provided Retry-After taking precedence, and circuit-breaker if the same throttle persists beyond a configured window (e.g., N minutes or M attempts). Ensure per-domain and per-connection buckets to avoid global collapse when a single upstream host throttles.
Stop conditions and ownership: stop automated retries and escalate to human owner when (a) attempts exceed a max retry count, (b) elapsed time since first throttle exceeds a policy window, or (c) provider responds with a permanent error. Record owner and incident notes for each escalation.

## Triage steps and evidence collection for incident response

Collect protocol-level evidence: HTTP full response (status, headers, body), SMTP transcript (220/250/454/5XX lines, timestamps), and client concurrency metrics (connections per second, messages per second). Correlate timestamps across systems to determine whether a spike in sending rate precedes the throttle.
Practical sequence for triage: 1) Stop or reduce sending to the affected target, 2) capture and archive representative responses, 3) compare against recent send-rate metrics and provider notices, 4) run a targeted low-rate replay after the Retry-After window, and 5) escalate if the issue reproduces or provider guidance indicates quota changes.

## Practical checklist

- [ ] On HTTP 429, parse Retry-After header and use as minimum wait; if absent, start exponential backoff with jitter.
- [ ] On SMTP 454 or 4.X.X, record which SMTP command triggered the response (CONNECT, MAIL FROM, RCPT TO, DATA) before deciding per-recipient vs global backoff.
- [ ] Log full protocol transcripts (headers, status lines, bodies) and persist at least one representative sample per distinct throttle signature.
- [ ] Apply per-domain and per-connection rate buckets; avoid a single domain throttle causing global sender-wide retries.
- [ ] Implement a circuit-breaker that pauses retries after configurable attempts or elapsed wall time and routes incident to an owner.
- [ ] Use provider-reported Retry-After or textual guidance if present, but treat provider-specific thresholds as directional unless documented.
- [ ] Run a controlled low-rate replay after the prescribed backoff to validate recovery before full resume.
- [ ] Correlate throttle events with sending rate spikes, IP reputation changes, or published provider notices before changing infrastructure.
- [ ] Escalate to human operator when retries exceed policy window, when multiple providers throttle simultaneously, or when provider response becomes permanent (5.X.X).

## Where RepMail fits

This guide is a practical decision aid you can use when mapping protocol-level throttles into automated retry, queueing, and escalation actions within an outbound workflow. Use the checklist and decision table during incident triage to reduce incorrect retries, collect the right evidence, and accelerate handoff to owner teams.

Continue with [Amazon SES Account-Level Suppression: How to Use It](/repmail/learn/infrastructure/aws-ses-account-level-suppression) for the next step in the workflow.

## Related RepMail guides

- [Rate-Limit Headers and Retry-After for Email APIs](/repmail/learn/infrastructure/email-api-rate-limit-headers-retry-after)
- [ARC Chain Validation Failure: Find the First Broken Instance](/repmail/learn/infrastructure/arc-chain-first-failure)


## Sources

[1]: https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas-errors.html "Amazon SES developer documentation"
[2]: https://datatracker.ietf.org/doc/html/rfc3463 "IETF RFC reference"
