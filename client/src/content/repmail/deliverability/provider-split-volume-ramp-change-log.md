---
product: repmail
academy: deliverability
contentType: guide
slug: provider-split-volume-ramp-change-log
title: "Provider-Split Volume Ramp Change Log"
description: "Use a provider-split volume-ramp change log to connect one-variable increases with responses and placement evidence."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability", "provider-specific", "provider-split-volume-ramp-change-log"]
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]

keyTakeaways:
  - "A ramp change log makes provider-specific volume decisions auditable: record the cohort, one variable changed, timestamp, expected observation, and stop condition. It is not a universal quota or warm-up schedule."
  - "Keep provider, environment, timestamp, and denominator labels with every observation."
  - "Use exact SMTP text and full headers before changing configuration."
commonMistakes:
  - "Treating acceptance as inbox placement or a dashboard as a mailbox-level verdict."
  - "Mixing consumer and tenant environments or guessing an unknown provider cohort."
  - "Changing several variables before preserving a before/after comparison."
faqs:
  - question: "Is provider-specific evidence proof of universal deliverability?"
    answer: "No. It describes the tested provider, identity, environment, and time window. Keep other providers and unknown cohorts separate."
  - question: "Should I change DNS as soon as one provider reports a problem?"
    answer: "Not before preserving the exact response and message headers. First identify whether the issue is authentication, acceptance, placement, tenant policy, list quality, or timing."
  - question: "What should I record for a useful diagnosis?"
    answer: "Record provider and environment, UTC time, sender identity, recipient cohort, message ID, SMTP response, headers, campaign version, and the denominator used for any rate."
nextStep:
  label: "Review provider-specific triage"
  href: "/repmail/learn/deliverability/provider-specific-deliverability-triage"
  description: "Route the next diagnostic step without mixing receiver environments."
assets:
  - type: table
    title: "Provider-specific evidence decision table"
    content:
      headers: ["Metric", "Denominator", "Caveat"]
      rows:
        - ["Accepted", "Attempted", "SMTP outcome only"]
        - ["Placement", "Observed delivered samples", "Seed results are directional"]
        - ["Replies", "Accepted or observed cohort, stated", "Engagement is not placement"]

---

A ramp change log makes provider-specific volume decisions auditable: record the cohort, one variable changed, timestamp, expected observation, and stop condition. It is not a universal quota or warm-up schedule.

## Create the baseline

Record current volume by provider cohort, identity, campaign, accepted/deferred/rejected events, known placement, complaints, and suppressions. Include the measurement window and denominators.

Write the planned change before making it: which cohort changes, by how much, when, and what evidence would pause the ramp.

## Change one variable

Do not raise volume while simultaneously changing domain, authentication, content, list, and retry behavior. Timestamp the start and end of the change and keep a control cohort where practical.

Use exact SMTP text and provider dashboards as evidence, with the caveat that dashboards may be delayed or unavailable.

## Review and stop

If repeated deferrals, rejections, or negative placement appear in one cohort, pause that stream and preserve evidence. Do not infer a provider quota from a single successful step.

## Quick checklist

- [ ] Label the provider and environment rather than guessing.
- [ ] Preserve UTC time, message ID, exact SMTP text, and full headers.
- [ ] State the denominator for every acceptance, placement, or reply rate.
- [ ] Change one variable, retest, and retain the before/after evidence.

## Edge cases and next action

Provider cohorts may overlap through shared infrastructure and identities. A ramp observation is local to the tested conditions. Use the [provider-specific triage model](/repmail/learn/deliverability/provider-specific-deliverability-triage) as the hub; related evidence paths include [google postmaster tools guide](/repmail/learn/deliverability/google-postmaster-tools-guide), [microsoft 365 email delivery diagnostics](/repmail/learn/deliverability/microsoft-365-email-delivery-diagnostics).

## Where RepMail fits

RepMail can provide campaign versions and sender-side event timelines for the log; it cannot convert an observed ramp into a provider-approved limit.

## Make stop conditions explicit

A change record should name the affected provider cohort, sender identity, planned volume, start and end UTC, control cohort, and evidence that would stop the next step. Stop conditions can be qualitative—such as repeated exact deferrals or a reproducible provider-specific rejection—when no measured threshold has been established.

At review time, compare the change with authentication, list, content, and retry changes in the same window. If more than one variable moved, mark the result confounded and avoid turning it into a reusable quota. Resume only with a new, documented change.

A change log should link to the exact dashboard or event query used for review. If a provider signal is delayed, mark the review as provisional and schedule a later check rather than filling the gap with an assumption. Keep the control cohort unchanged long enough to make the comparison meaningful, and record when that control is no longer valid.

Add the operator, approval context, and review date to each entry. If the expected observation is not available because a provider dashboard is delayed, mark the entry provisional and schedule a follow-up rather than closing it as a pass. This keeps the ramp history useful when a later provider response arrives.

## Sources

[1]: https://support.google.com/mail/answer/81126?hl=en
