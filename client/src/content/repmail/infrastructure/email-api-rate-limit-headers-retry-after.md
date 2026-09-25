---
product: repmail
academy: infrastructure
contentType: guide
slug: email-api-rate-limit-headers-retry-after
title: "Rate-Limit Headers and Retry-After for Email APIs"
description: "Rate-Limit Headers and Retry-After for Email APIs — Developers receiving 429s without pacing requests correctly."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["infrastructure","api","email","rate","limit","headers"]
assets:
  - type: table
    title: "Quick decision table: 429 handling and pacing actions"
    content:
      headers: ["Observed signal","Immediate action","Scope to throttle","Next check"]
      rows:
        - ["Retry-After header present","Sleep at least Retry-After seconds","Same-request and same-scope requests","Retry when Retry-After expires"]
        - ["X-RateLimit-Remaining > 0","Decrement local token and continue","Same-scope token bucket","Re-evaluate per response"]
        - ["X-RateLimit-Remaining = 0 + X-RateLimit-Reset","Wait until Reset timestamp (min 1s) before new requests","Bucket for the reported scope","Check headers at reset"]
        - ["No headers, repeated 429s","Apply exponential backoff with jitter; increase global pacing","Client or account-wide throttle","Retry with backoff up to retry budget"]
        - ["Inconsistent headers across responses","Switch to conservative local pacing and log for provider diagnostics","Wider scope (account) until consistent","Request provider docs / support if persistent"]
        - ["Repeated 429s after obeying headers","Escalate: alert owner, increase pacing, consider manual intervention","Account-wide or IP-wide throttle","Hold until manual/owner action"]
featured: false
collections: ["email-infrastructure-decisions"]
learningPaths: ["email-infrastructure"]
keyTakeaways:
  - "Developers receiving 429s without pacing requests correctly"
  - "Header-driven client behavior, distinct from queue architecture"
  - "Link from API adapter and backpressure pages"
commonMistakes:
  - "Skipping this check: Log full 429 responses including headers and body for each occurrence."
  - "Skipping this check: Parse and prioritize Retry-After over any other header; use it as the minimum wait time."
  - "Skipping this check: Implement token-bucket counters for scopes reported by the provider (endpoint, account, IP)."
faqs:
  - question: "If the provider returns Retry-After=0, can I retry immediately?"
    answer: "Only if you validated the header format and timestamp semantics. A Retry-After of 0 usually indicates immediate retry is allowed; however, if you see repeated 429s afterward, treat it as unreliable and fall back to conservative backoff. Log the sequence and escalate if retries continue to fail."
  - question: "Should I rely on X-RateLimit headers for exact throughput planning?"
    answer: "Use X-RateLimit headers to drive short-term client behavior (token buckets and resets). They are suitable for runtime pacing but not for long-term capacity planning because providers may change limits without notice. Record historical header values for trend analysis and use them as directional evidence rather than hard guarantees.[1][2]"
  - question: "How many retries are safe after a 429?"
    answer: "There is no universal safe retry count; make retries limited and observable. A practical policy is up to 4–6 retries with exponential backoff and jitter, or fewer retries when Retry-After is long. Abort and surface an actionable error to the caller when the retry budget is exhausted."
nextStep:
  label: "Continue with Amazon SES Account-Level Suppression: How to Use It"
  href: "/repmail/learn/infrastructure/aws-ses-account-level-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Rate-limit headers and Retry-After tell your client how quickly to back off and when it can resume after 429 responses. Implement header-driven pacing: read per-response limit headers, apply per-connection and per-account backoff, and use Retry-After as a definitive minimum wait. This reduces repeated 429s while preserving throughput and avoiding provider bans.

## What the decision boundary is

The key decision is whether to trust provider-sent headers (Rate-Limit, X-RateLimit-*, Retry-After) as authoritative or to treat them as advisory. If a provider returns a Retry-After or explicit rate-limit headers with clear scopes (per-endpoint, per-account, per-IP), your client should treat those values as authoritative minimum waits. If headers are missing or inconsistent across requests, switch to conservative local pacing and exponential backoff until the provider returns clear guidance.

Evidence limits: not all providers use the same header names, scopes, or semantics; some include window size, remaining tokens, or reset timestamps while others only return Retry-After[1][2]. You must therefore design for both header-driven and header-absent modes and explicitly log which mode is active for diagnostics.

## Which headers to parse and how to prioritize them

Common headers to recognize are Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, and provider-specific names. If Retry-After is present, it is the highest-priority instruction: wait at least that long before retrying. When X-RateLimit-* headers are present, compute a local token budget (remaining) and allow requests until that budget is exhausted, then wait until reset.

Decision rule: Retry-After > explicit remaining=0 signals > remaining > absent headers. Treat reset timestamps as UTC epoch seconds or parse ISO8601 when supplied. When header units are ambiguous (seconds vs. HTTP-date), prefer parsing per HTTP spec for Retry-After; for provider-specific headers, consult provider docs and fall back to conservative backoff if ambiguous[1][2].

## Practical sequence for handling a 429 response

1) Record the exact response body and headers to logs and metrics, including the URL, method, client identifier, and timestamp. 2) If Retry-After present, sleep at least that duration before retrying that request or similar-scoped requests. 3) If X-RateLimit-Remaining is present and >0, decrement and continue; if 0, compute wait = X-RateLimit-Reset - now and wait that long (minimum 1s).

When to escalate: if you receive repeated 429s with identical headers after obeying Retry-After, escalate to a broader backoff: increase inter-request spacing for the client or entire account by a factor (for example, 2x) and alert the owner. Stop condition: no 429s for a sustained window (e.g., 10 successful requests spanning multiple reset windows) — then gradually restore prior pacing.

## Local pacing strategy and token-bucket implementation

Use a client-side token bucket or leaky-bucket that mirrors the provider's scopes (per-endpoint vs per-account). Initialize tokens using X-RateLimit-Limit when available; otherwise start with a conservative default. Refill tokens according to the reset interval or an inferred rate from observed headers.

Important: differentiate scopes. If provider headers are per-endpoint, track token buckets per endpoint; if per-account or per-IP, track at that scope. When in doubt, use the narrowest scope compatible with your architecture and log the scope assumption. This reduces unnecessary cross-endpoint throttling.

## Retry policy: deterministic vs exponential backoff

If headers are authoritative, prefer deterministic sleeps guided by Retry-After or reset. If headers are absent or inconsistent, use exponential backoff with jitter. A recommended pattern: initial wait 1s, multiply by 2 on each retry, add +/- 10% jitter, cap at a ceiling (for example, 300s), and abort after a retry budget (for example, 6 attempts) with an error returned to the caller.

Decision boundary: deterministic waits maximize throughput when the provider communicates limits; exponential backoff reduces provider load when communication is absent. Combine both: obey provider waits when present and fall back to exponential backoff for transient or unknown conditions.

## Practical checklist

- [ ] Log full 429 responses including headers and body for each occurrence.
- [ ] Parse and prioritize Retry-After over any other header; use it as the minimum wait time.
- [ ] Implement token-bucket counters for scopes reported by the provider (endpoint, account, IP).
- [ ] When X-RateLimit-Remaining = 0, compute wait = ResetTime - now; use a minimum 1s wait if parsing fails.
- [ ] Fallback to exponential backoff with jitter if headers are absent or ambiguous; cap retries and notify owner on repeated failures.
- [ ] Differentiate and track rate limits per scope (endpoint vs account vs IP) in metrics and dashboards.
- [ ] Gradually restore pre-throttle pacing after a sustained window of successful requests; avoid a single-request probe as the only check.
- [ ] Alert and provide diagnostics (last 429 headers, request rate, client ID) when you see repeat 429s after obeying headers.

## Where RepMail fits

Use this guide as a checklist and decision aid in your outbound workflow: implement header-driven pacing in your API adapter, log and surface header evidence to operator dashboards, and wire alerts when header-driven retries still produce 429s. This reduces unnecessary retries from sending pipelines and helps operators decide whether to reduce concurrency, contact the provider, or adjust overall send rates.

Continue with [Amazon SES Account-Level Suppression: How to Use It](/repmail/learn/infrastructure/aws-ses-account-level-suppression) for the next step in the workflow.

## Related RepMail guides

- [Rate-Limit Failure Modes: 429, 454, and Provider-Specific Throttles](/repmail/learn/infrastructure/email-rate-limit-429-454-throttles)
- [AWS SES API v2 Formatted vs Raw Email: A Practical Boundary](/repmail/learn/infrastructure/aws-ses-api-v2-formatted-vs-raw)


## Sources

[1]: https://documentation.mailgun.com/docs/mailgun/api-reference/api-overview "Supporting technical or operational reference"
[2]: https://resend.com/changelog/api-rate-limit "Supporting technical or operational reference"
