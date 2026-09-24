---
product: repmail
academy: outreach
contentType: guide
slug: cold-email-cohort-analysis
title: "Cold Email Cohort Analysis by Send Week"
description: "Build cold-email cohorts by send week, wait for a defined observation window, and compare mature outcomes without invented benchmarks."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach-measurement", "cold-email", "analytics"]
learningPaths: ["getting-started"]
assets:
  - type: table
    title: "Guide or worksheet"
    content: |
      - Choose the cohort key and reporting timezone before launch.
      - Freeze membership at the first eligible send, while retaining sequence and mailbox fields for analysis.
      - Define a maturity window and label immature cohorts instead of filling missing outcomes with zero.
      - Compare mature cohorts by the same event definitions and include suppression and complaint signals alongside positive outcomes.
featured: false
collections: ["outreach-measurement"]
keyTakeaways:
  - "Cold-email cohort analysis means freezing contacts by send week and comparing each cohort only after the same observation window. It prevents a new week with unobserved replies from being mistaken for a mature underperformer."
  - "Use explicit denominators, event grains, and observation windows so another operator can reproduce the report."
  - "Treat late, missing, duplicate, and negative events as visible data states rather than silently excluding them."
commonMistakes:
  - "Changing the denominator or observation window between campaigns without labeling the change."
  - "Treating attribution, delivery, or an automated event as proof of human intent or causality."
faqs:
  - question: "How long should a cohort mature?"
    answer: "Use a window aligned to your sequence and sales process, then apply it consistently. The correct window is a documented operational choice, not a universal number."
  - question: "Should immature cohorts appear in the dashboard?"
    answer: "Yes, but label them immature and exclude them from mature comparisons."
  - question: "Can I cohort by reply week instead?"
    answer: "You can, but that answers a different question. Send-week cohorts preserve the exposure group needed to evaluate a campaign."
nextStep:
  label: "Review cold-email reply-rate measurement"
  href: "/repmail/learn/outreach/cold-email-reply-rate-measurement"
  description: "Start with consistent reply definitions before adding downstream outcomes."
---

Cold-email cohort analysis means freezing contacts by send week and comparing each cohort only after the same observation window. It prevents a new week with unobserved replies from being mistaken for a mature underperformer.

## Define the measurement before calculating it

The cohort key should be immutable: send week in a chosen timezone, campaign or version, audience segment, and optionally mailbox. Store event timestamps independently so late bounces, replies, opt-outs, and meetings can be assigned to the right send cohort. A cohort is not a calendar report; it is a group with comparable exposure and follow-up time.

## A practical workflow

1. Choose the cohort key and reporting timezone before launch.
2. Freeze membership at the first eligible send, while retaining sequence and mailbox fields for analysis.
3. Define a maturity window and label immature cohorts instead of filling missing outcomes with zero.
4. Compare mature cohorts by the same event definitions and include suppression and complaint signals alongside positive outcomes.

## Decision table

| Stage | Track | Interpret carefully |
|---|---|---|
| Send | Eligible sends by cohort | Excludes suppressed or failed sends using a documented rule |
| Delivery | Delivered and bounced events | Late provider events can revise totals |
| Response | Replies and classified replies | Use lead-level deduplication |
| Outcome | Meetings or CRM states | Apply the same attribution window |

## Edge cases and interpretation

A cohort that spans a holiday, a copy change, or a different provider mix is not automatically comparable. Split or annotate it. If events arrive late, keep an as-of timestamp and show revisions rather than rewriting history without a note.

## Where RepMail fits

RepMail is relevant here as the sending and event context, not as a substitute for a measurement definition. Keep the campaign, message, mailbox, suppression, and downstream outcome identifiers that your reporting contract requires; verify the resulting data against the underlying provider or CRM evidence.

## Related resources

For the core reply-rate definitions, see [how to measure cold email reply rate](/repmail/learn/outreach/cold-email-reply-rate-measurement). Related implementation or measurement context: [cold email reply rate measurement](/repmail/learn/outreach/cold-email-reply-rate-measurement); [cold email benchmarks](/repmail/learn/cold-email/cold-email-benchmarks); [the first-party reference](https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html).


## Cohort calculation and operating boundary

Use a lead-level key of `send_week + campaign_version + audience_segment`, with timezone frozen before the first send. Calculate `mature_positive_reply_rate = unique_positive_replies / eligible_leads` only after every lead reaches the same cutoff. Keep immature leads visible, never as zero.

| Field | Calculation or value | Check |
|---|---|---|
| `eligible_leads` | unique leads eligible at freeze | exclude suppressed/invalid once |
| `positive_replies` | distinct leads with first positive reply | deduplicate by lead |
| `late_events` | events ingested after cutoff | publish count and timestamp |
| `maturity` | cutoff reached: yes/no | exclude “no” from ranking |

**Decision boundary:** Compare only when maturity window, rubric, suppression rule, and grain match. Otherwise label cohorts not comparable. A new week with no observed replies is not a mature underperformer. **Failure case:** Failure cases include moving late replies into the arrival week and duplicating one lead across cohorts. **Verification and stop condition:** Verify totals against the frozen export, sample ten IDs per cohort, and confirm no lead has two cohort keys. Stop comparison when over 5% lack stable lead keys or freshness exceeds the declared window. Links: [cold-email funnel metrics by stage](/repmail/learn/outreach/cold-email-funnel-metrics-by-stage), [reconcile email events with CRM](/repmail/learn/outreach/reconcile-email-events-with-crm), and [AWS SES event publishing](https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html).

## References

[1]: https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html
