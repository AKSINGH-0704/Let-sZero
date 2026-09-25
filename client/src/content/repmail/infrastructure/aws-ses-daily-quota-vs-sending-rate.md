---
product: repmail
academy: infrastructure
contentType: guide
slug: aws-ses-daily-quota-vs-sending-rate
title: "AWS SES Sending Quotas: Daily Limit vs Per-Second Rate"
description: "AWS SES Sending Quotas: Daily Limit vs Per-Second Rate — Operators misreading two separate SES capacity controls."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["infrastructure","ses","aws","email","sending","quotas","daily"]
assets:
  - type: table
    title: "Decision/diagnostic table: SES daily quota vs per-second rate"
    content:
      headers: ["Observable symptom","Likely SES control","Immediate operator action","Follow-up verification"]
      rows:
        - ["Immediate hard rejection citing maximum send quota","Daily sending quota (24-hour)","Stop retries; wait for rolling window to free capacity or reduce planned volume","Check GetSendQuota and 24-hour usage; consider quota increase request"]
        - ["Transient throttle errors / 5xxs under burst load","Per-second sending rate","Throttle local concurrency, backoff with jitter, and retry per policy","Measure peak P/s and compare to configured sending rate in console/API"]
        - ["Sporadic throttles at high concurrency but daily volume low","Per-second sending rate","Implement token-bucket limiter and smooth bursts","Run controlled ramp test to map P/s behavior"]
        - ["No errors but mail volume approaching expected daily target","Potential future daily quota hit","Pre-file daily quota increase with AWS support and prepare warm-up","Record 24-hour usage trends and include in support request"]
        - ["Sudden change in rejection patterns after provider update","Provider-side behavior or quota change (uncertain)","Safely scale back sends, enable alerts, and contact AWS if needed","Verify current quotas via API and review recent AWS notifications"]
featured: false
collections: ["email-infrastructure-decisions"]
learningPaths: ["email-infrastructure"]
keyTakeaways:
  - "Operators misreading two separate SES capacity controls"
  - "Distinct from Microsoft limits and selected generic retry queue"
  - "Link from SES API, backpressure, and capacity pages"
commonMistakes:
  - "Skipping this check: Query GetSendQuota or the SES console to read current daily quota and max sending rate before campaign scheduling [1][2]."
  - "Skipping this check: Estimate peak messages-per-second and compare to the per-second sending rate; add a safety margin (e.g., 10–20%)."
  - "Skipping this check: Implement a concurrency limiter (token/leaky bucket) to enforce an operational P/s ceiling below the reported rate."
faqs:
  - question: "Can I rely on automatic retries to handle both quota types?"
    answer: "No. Retries are appropriate for transient per-second throttling (use exponential backoff with jitter). Daily-quota rejections are non-retriable until the rolling 24-hour usage drops; retrying immediately will continue to fail. Distinguish errors in logs and implement separate handling paths."
  - question: "If I need both higher daily volume and higher throughput, can I request them in one ticket?"
    answer: "You can include both needs in a support request, but treat them as separate capacity controls and provide separate justification for each. Document historical 24-hour volumes, peak messages-per-second, and warm-up plans. Expect AWS to evaluate them independently; verify quotas after any change via the API."
  - question: "How certain are these behaviors and error types?"
    answer: "Behavioral distinctions between the daily quota and per-second sending rate are described in AWS documentation and are directional evidence for how SES enforces limits [1][2]. Exact error messages, returned codes, and quota availability can change; validate against your account's quota APIs and AWS support communications."
nextStep:
  label: "Continue with Amazon SES Account-Level Suppression: How to Use It"
  href: "/repmail/learn/infrastructure/aws-ses-account-level-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

AWS SES enforces two distinct sending controls: a daily sending quota (maximum messages per 24-hour period) and a per-second sending rate (messages per second). Treat them separately when planning sends: exceeding the daily quota returns a hard rejection; exceeding the per-second rate causes throttling errors and transient rejections you should back off from and retry according to error semantics.

## What each quota controls and the decision boundary

The daily sending quota is a rolling 24-hour cap on the number of messages you can send; if you exceed that cap SES will refuse additional sends until the rolling window drops below the quota [1]. The per-second sending rate is a throughput limiter: it constrains how many messages you can submit per second and is enforced independently of the daily cap [2].

Decision boundary: plan against whichever limit you will hit first during the window of interest. For short, high-throughput bursts you are more likely to hit the per-second rate; for steady high-volume campaigns you will hit the daily quota first. Both can be raised through AWS support in many cases, but treat them as separate requests and separate risk profiles.

## Observable failures and how to diagnose them

Exceeding the daily quota typically manifests as an immediate error from SES indicating you have reached your maximum send quota for the 24-hour period; these are hard rejections until the rolling window frees capacity [1]. Exceeding the per-second sending rate results in throttling errors or 5xx-style transient rejections; these should be treated as retriable with backoff [2].

Diagnostic sequence: check SES console or the GetSendQuota API for current quotas and usage; correlate timestamps of rejections to decide whether the rolling 24-hour usage reached the daily quota or whether bursts exceed the per-second rate. Log API error codes and timestamps with send IDs to separate hard quota hits from transient throttles.

## Practical sequencing: how to plan sends and requests

Start by measuring current steady-state throughput and 24-hour volume. If your expected peak messages per second are near the per-second rate, implement a sending concurrency limiter (token bucket or leaky bucket) that enforces an effective P/s ceiling slightly below your quota to avoid bursts and jitter [2].

If projected 24-hour volume approaches the daily quota, file a quota increase request with AWS well before the campaign start—include historical send volume, intended growth, and warm-up plan. Request changes to daily quota and per-second rate separately and provide distinct justification for each.

## Retry/backoff practices for per-second throttling

When you receive throttling or transient errors, follow exponential backoff with randomized jitter and cap retries to a small number—this prevents amplifying congestion. Treat daily-quota rejections as non-retriable until the rolling window drops below quota; do not retry immediately.

Practical stop condition: switch to a fallback queue or pause sends when more than X% of recent sends produce transient throttles (choose X based on operational tolerance—common values are 5–20%). Resume only after the throttling rate subsides and after validating current per-second allowance via the API or console.

## Evidence limits and evolving behavior

AWS documentation distinguishes the two controls and their behaviors; use those docs as primary evidence for API behavior and retry semantics [1][2]. Provider implementations and error messages can evolve; treat exact error text and returned codes as directional and verify against live quota APIs in your account.

If you rely on automated scaling of concurrency to hit quotas, include monitoring that detects provider-side changes (for example, sudden lowering of per-second allowance) and alerts owners rather than assuming unchanged limits.

## Practical checklist

- [ ] Query GetSendQuota or the SES console to read current daily quota and max sending rate before campaign scheduling [1][2].
- [ ] Estimate peak messages-per-second and compare to the per-second sending rate; add a safety margin (e.g., 10–20%).
- [ ] Implement a concurrency limiter (token/leaky bucket) to enforce an operational P/s ceiling below the reported rate.
- [ ] Instrument and log API errors with timestamps and send IDs to distinguish daily-quota rejections from throttles.
- [ ] Use exponential backoff with jitter for transient throttles; do not retry immediately on daily-quota rejections.
- [ ] File separate AWS quota-increase requests for daily quota and per-second rate, including volume history and warm-up plan.
- [ ] Define a pause threshold (e.g., >10% throttled sends over 5 minutes) and a restart checklist before resuming sends.
- [ ] Alert owners if observed per-second throughput drops unexpectedly or if daily usage approaches the quota.
- [ ] Run a staged warm-up that increases send rate over days to validate both per-second and daily limits in your account.

## Where RepMail fits

Use this guide as an operational decision aid when building outbound workflows: it clarifies which SES control to monitor, how to react to each failure mode, and what to include in quota requests. Teams can convert the checklist into runbook steps and alert thresholds so operators know whether to pause sends, back off, or file for quota increases. This helps prevent wasted retries and reduces rejected sends during campaigns.

Continue with [Amazon SES Account-Level Suppression: How to Use It](/repmail/learn/infrastructure/aws-ses-account-level-suppression) for the next step in the workflow.

## Related RepMail guides

- [AWS SES API v2 Formatted vs Raw Email: A Practical Boundary](/repmail/learn/infrastructure/aws-ses-api-v2-formatted-vs-raw)
- [AWS SES Configuration Sets: Tags, Destinations, and Routing](/repmail/learn/infrastructure/aws-ses-configuration-sets-routing)


## Sources

[1]: https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas-errors.html "Amazon SES developer documentation"
[2]: https://docs.aws.amazon.com/general/latest/gr/ses.html "Amazon SES developer documentation"
