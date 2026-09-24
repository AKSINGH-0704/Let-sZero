---
product: repmail
academy: deliverability
contentType: guide
slug: provider-cohort-time-series-placement-analysis
title: Provider-Cohort Time-Series Analysis for Placement Anomalies
description: A practical worksheet and step-by-step method to detect and diagnose
  provider-specific placement regressions using cohort and time-series comparisons.
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- deliverability
- time-series
- cohort-analysis
- Gmail
- Outlook
- analytics
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
assets:
- type: table
  title: Provider-cohort placement time-series worksheet
  content:
    headers:
    - Date range
    - Provider
    - Mailbox type
    - Denominator (N delivered)
    - Recorded placement counts (inbox/spam/other)
    - Uncertainty / action
    rows:
    - - 2026-08-01 — 2026-08-31
      - Gmail
      - Consumer
      - N=1,250
      - Record inbox / spam / promo counts per day or week
      - Low uncertainty (N>1,000); build weekly series
    - - 2026-08-01 — 2026-08-07
      - Outlook.com
      - Corporate
      - N=320
      - Record inbox / spam / other counts
      - High uncertainty (N<500); treat as signal, not proof
    - - 2026-07-01 — 2026-09-30
      - Gmail
      - All mailbox types (segmented)
      - N=4,800
      - Aggregate weekly series by mailbox type
      - Medium uncertainty; use to confirm trend
    - - 2026-08-15 — 2026-08-21
      - Yahoo
      - Consumer
      - N=60
      - Record counts; use for early-warning only
      - Very high uncertainty — do not call significant
keyTakeaways:
- Compare like-for-like cohorts by provider, mailbox type, date range, and denominator
  to turn placement observations into controlled comparisons.
- Always record the denominator and uncertainty for each point; treat small samples
  as high-uncertainty signals, not proof.
- Use short windows to detect sudden changes and longer windows to confirm persistent
  trends; align dates across providers before comparing.
commonMistakes:
- Comparing different mailbox types (consumer vs. corporate) or mixed date ranges
  without normalization.
- Treating small-N cohorts as conclusive — small samples are high-uncertainty and
  should not be described as statistically significant.
- Failing to record the denominator, precise date window, or provider label for each
  data point, which prevents reproducible analysis.
faqs:
- question: What denominator should I use for provider-cohort placement comparisons?
  answer: Use the number of delivered messages to that provider and mailbox type in
    the date window (not the number sent). Record the denominator explicitly (e.g.,
    N=1,250 delivered to Gmail consumer mailboxes, 2026-08-01–2026-08-31). If you
    only have opens or clicks as a proxy, flag the increased uncertainty.
- question: How do I treat small samples in the time series?
  answer: Label small-N points as high uncertainty and avoid firm conclusions. Use
    them as early warning signals and seek corroborating evidence from larger windows,
    additional cohorts, or provider diagnostics. Do not call small samples statistically
    significant.
- question: When should I escalate to provider-specific remediation?
  answer: Escalate when a provider-cohort shows a consistent negative shift across
    multiple windows and denominators, or when provider diagnostics (e.g., bounce
    types or feedback) point to deliverability action. For immediate inbox drops,
    follow an urgent triage workflow before broad changes.
nextStep:
  label: Provider-specific deliverability triage
  href: /repmail/learn/deliverability/sudden-drop-inbox-placement
  description: If the cohort trend indicates a provider regression, follow the provider-specific
    deliverability triage guide to run targeted remediation and vendor checks.
---

Direct answer: To identify provider-specific placement regressions, build provider-cohort time-series where each data point explicitly records the provider, mailbox type, exact date window, denominator (N delivered), placement counts, and an uncertainty note — then compare aligned series rather than single snapshot matrices.

Step-by-step practical method

1) Define cohorts and dates: Choose cohorts by provider and mailbox type (consumer, corporate, transactional). Pick comparable date windows (daily, weekly) and always record the exact date range for each point. Misaligned dates are a common source of false signals.

2) Record the denominator and placement counts: For every cohort/time point record the number of delivered messages (denominator) and raw placement counts (inbox, spam, other). Denominator is essential — placement rates without N cannot be interpreted.

3) Flag uncertainty: Add an uncertainty column for small samples, proxies (opens/clicks), or partial sends. Small-N points are high-uncertainty signals — do not treat them as conclusive or "statistically significant."

4) Choose aggregation windows: Short windows (daily/weekly) catch sudden drops; longer windows (monthly or rolling 4-week) confirm persistence. Use both: short to detect events, longer to reduce noise.

5) Normalize and align: Compare the same mailbox types and date ranges across providers (Gmail vs Outlook). Align time zones and delivery timestamps. If a provider batch is delayed, that can create misleading gaps.

6) Inspect pattern shapes before thresholds: Look for sudden step changes (indicative of policy or filtering shifts) versus gradual drift (engagement decay or reputation change). Sudden provider-wide steps may require immediate triage (see sudden inbox drops guidance).

7) Use provider documentation and signals: When investigating Gmail or Outlook behaviors, consult provider guidance and sender documentation rather than inferring private algorithms. For example, Gmail and Outlook publish sender guidance and support documentation you should review when a cohort regression points to provider-side classification behavior [1][2].

8) Corroborate with other signals: Combine cohort time-series with bounces, provider feedback, user complaints, and seed account checks. If multiple independent signals align, the confidence in a provider-specific regression increases.

Edge cases and cautions

- Small cohorts: If N is small (for example, under several hundred depending on variability), treat changes as indicators needing more data, not proof. Document this explicitly in your worksheet.
- Mixed mailbox traffic: DO NOT mix consumer and corporate mailboxes in the same series; their placement behavior can differ dramatically.
- Delayed feedback loops: Some providers bulk-update placement or roll out changes over days — a one-day drop may self-correct. Track series over multiple windows before wide remediation.
- Provider classification differences: Providers use different categorization concepts (tabs, folders, promotions). Map these consistently when comparing Gmail to Outlook.

Action decision checklist (use the worksheet table above):
- Is there a coherent negative shift in the provider cohort across multiple windows and denominators? If yes → escalate to targeted remediation.
- Are two or more independent signals (bounces, inbox seeds, complaints) aligned with the time-series drop? If yes → escalate.
- Is N small or proxies used? If yes → label high uncertainty and expand tracking before major changes.

If you see an urgent inbox drop for a provider cohort, run an immediate provider-focused triage workflow before broad changes — see the guidance on sudden inbox drops and the provider-specific deliverability triage for next steps. For broader context on deliverability controls and diagnostics, consult the complete guide to email deliverability.

## Sources

[1] https://support.google.com/mail/answer/14668346?hl=en

[2] https://support.microsoft.com/en-us/outlook/sender-support-in-outlook-com


## Related resources

Continue with [the related RepMail guide](/repmail/learn/deliverability/sudden-drop-inbox-placement), [the related RepMail guide](/repmail/learn/deliverability/provider-specific-deliverability-triage), [the related RepMail guide](/repmail/learn/deliverability).


## Related resources

Continue with the [complete guide to email deliverability](/repmail/learn/deliverability/complete-guide-to-email-deliverability), review the [provider-specific triage guide](/repmail/learn/deliverability/provider-specific-deliverability-triage), and use the [sender reputation guide](/repmail/learn/deliverability/sender-reputation) when the workflow crosses into a neighboring concern.
