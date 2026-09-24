---
product: repmail
academy: outreach
contentType: comparison
slug: mailbox-level-outreach-performance
title: "Mailbox-Level Outreach Performance Diagnostics"
description: "Diagnose mailbox-level outreach performance only after controlling for audience, copy, volume, timing, provider, and suppression."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach-measurement", "cold-email", "analytics"]
learningPaths: ["getting-started"]
assets:
  - type: table
    title: "Diagnostic guide + table"
    content: |
      - Create matched or stratified cohorts and freeze the reporting window.
      - Check authentication, provider response, bounces, complaints, and suppression before response rates.
      - Compare counts and rates at the same message or lead grain.
      - Investigate operational changes and assign the next test; do not rotate mailboxes solely to chase noise.
featured: false
collections: ["outreach-measurement"]
keyTakeaways:
  - "Mailbox-level outreach diagnostics are useful only after you control for what each mailbox was asked to do. Compare matched cohorts by audience, campaign version, volume, timing, provider mix, and suppression state before attributing a difference to the mailbox."
  - "Use explicit denominators, event grains, and observation windows so another operator can reproduce the report."
  - "Treat late, missing, duplicate, and negative events as visible data states rather than silently excluding them."
commonMistakes:
  - "Changing the denominator or observation window between campaigns without labeling the change."
  - "Treating attribution, delivery, or an automated event as proof of human intent or causality."
faqs:
  - question: "Should I rank mailboxes by reply rate?"
    answer: "Not without matched cohorts and risk signals. A rank can reward easy lists or hide bounces and opt-outs."
  - question: "What if one mailbox has no delivery events?"
    answer: "Treat the comparison as incomplete and investigate instrumentation or provider data before interpreting performance."
  - question: "Can a mailbox-level result prove reputation damage?"
    answer: "No. It is a diagnostic observation; reputation, authentication, content, list, and provider factors need separate evidence."
nextStep:
  label: "Review cold-email reply-rate measurement"
  href: "/repmail/learn/outreach/cold-email-reply-rate-measurement"
  description: "Start with consistent reply definitions before adding downstream outcomes."
---

Mailbox-level outreach diagnostics are useful only after you control for what each mailbox was asked to do. Compare matched cohorts by audience, campaign version, volume, timing, provider mix, and suppression state before attributing a difference to the mailbox.

## Define the measurement before calculating it

A mailbox record should include sending identity, domain, provider, campaign version, eligible leads, sequence exposure, event timestamps, and warm-up or operational changes. Use mailbox as one explanatory dimension, not a ranking score. A small mailbox with a different audience is not a fair control.

## A practical workflow

1. Create matched or stratified cohorts and freeze the reporting window.
2. Check authentication, provider response, bounces, complaints, and suppression before response rates.
3. Compare counts and rates at the same message or lead grain.
4. Investigate operational changes and assign the next test; do not rotate mailboxes solely to chase noise.

## Decision table

| Control | Why | Diagnostic question |
|---|---|---|
| Audience | List mix changes results | Were roles and segments comparable? |
| Copy/version | Message changes response | Did both mailboxes send the same version? |
| Volume/timing | Exposure and cadence differ | Were send windows comparable? |
| Provider/events | Receiver evidence differs | Are late events or deferrals present? |

## Edge cases and interpretation

A mailbox may show fewer replies because it sent to a harder segment, not because it is unhealthy. Conversely, a high reply rate can coexist with poor delivery or elevated opt-outs. Preserve raw event counts and provider evidence before drawing a conclusion.

## Where RepMail fits

RepMail is relevant here as the sending and event context, not as a substitute for a measurement definition. Keep the campaign, message, mailbox, suppression, and downstream outcome identifiers that your reporting contract requires; verify the resulting data against the underlying provider or CRM evidence.

## Related resources

For the core reply-rate definitions, see [how to measure cold email reply rate](/repmail/learn/outreach/cold-email-reply-rate-measurement). Related implementation or measurement context: [the first-party reference](https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html); [the first-party reference](https://support.google.com/mail/answer/81126?hl=en); [cold email reply rate measurement](/repmail/learn/outreach/cold-email-reply-rate-measurement).


## Mailbox diagnostic table and comparison boundary

Within matched cohorts, calculate `positive_reply_rate_m = unique_positive_leads_m / eligible_leads_m` alongside delivery, bounce, opt-out, and unknown counts. Include audience, copy, provider, timing, volume, and suppression controls before interpreting mailbox differences.

| Field | Control | Use |
|---|---|---|
| mailbox_id | stable identity | event grouping |
| eligible_leads | same rule | denominator |
| campaign_version | exact ID | copy control |
| provider_mix | recipient cohort | receiver context |
| risk_signals | bounces/opt-outs | safety context |

**Decision boundary:** Call a difference diagnostic only when controls and maturity match; otherwise it is an observed mix difference. **Failure case:** Easy-list allocation and high replies with poor delivery are failure cases. **Verification and stop condition:** Verify source totals, provider evidence, and matched samples. Stop if delivery evidence is absent, operational changes are unlogged, or cohorts are immature. Links: [cold-email cohort analysis](/repmail/learn/outreach/cold-email-cohort-analysis), [cold-email dashboard metrics](/repmail/learn/outreach/cold-email-dashboard-metrics), and [Google sender requirements](https://support.google.com/mail/answer/81126?hl=en).


The mailbox **calculation** is `unique_positive_leads_m / eligible_leads_m`, paired with delivery and safety counts.
## References

[1]: https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html
[2]: https://support.google.com/mail/answer/81126?hl=en
