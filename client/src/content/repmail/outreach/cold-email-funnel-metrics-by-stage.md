---
product: repmail
academy: outreach
contentType: guide
slug: cold-email-funnel-metrics-by-stage
title: "Cold Email Funnel Metrics by Stage: Send to Meeting"
description: "Map cold-email funnel metrics from send to meeting with one event taxonomy and an explicit denominator at every stage."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach-measurement", "cold-email", "analytics"]
learningPaths: ["getting-started"]
assets:
  - type: table
    title: "Funnel map + worksheet"
    content: |
      - Name the stage event and unit: message, lead, account, or meeting.
      - Record exclusions such as suppressed, invalid, or failed sends before computing the denominator.
      - Join downstream outcomes through stable IDs and a defined attribution window.
      - Show unknown, duplicate, and late events instead of forcing them into a stage.
featured: false
collections: ["outreach-measurement"]
keyTakeaways:
  - "Cold-email funnel metrics are reliable only when each stage has one event definition and denominator. Map eligible sends to delivery, reply, qualification, and meeting outcomes; never present a downstream rate without saying which population it divides."
  - "Use explicit denominators, event grains, and observation windows so another operator can reproduce the report."
  - "Treat late, missing, duplicate, and negative events as visible data states rather than silently excluding them."
commonMistakes:
  - "Changing the denominator or observation window between campaigns without labeling the change."
  - "Treating attribution, delivery, or an automated event as proof of human intent or causality."
faqs:
  - question: "Should each stage use the same denominator?"
    answer: "No. Use the denominator that matches the stage and state it clearly."
  - question: "How do I count multiple replies?"
    answer: "Use message-level counts for workload and unique-lead counts for funnel conversion; do not mix them."
  - question: "Where do bounces belong?"
    answer: "Record them at delivery and exclude them from delivery-based response rates only when that rule is documented."
nextStep:
  label: "Review cold-email reply-rate measurement"
  href: "/repmail/learn/outreach/cold-email-reply-rate-measurement"
  description: "Start with consistent reply definitions before adding downstream outcomes."
---

Cold-email funnel metrics are reliable only when each stage has one event definition and denominator. Map eligible sends to delivery, reply, qualification, and meeting outcomes; never present a downstream rate without saying which population it divides.

## Define the measurement before calculating it

A stage map should retain the IDs that connect events: campaign version, contact or account, message, thread, and meeting. Use send-based rates for operational throughput and delivery- or lead-based rates when the question is response quality. Keep both where they answer different decisions.

## A practical workflow

1. Name the stage event and unit: message, lead, account, or meeting.
2. Record exclusions such as suppressed, invalid, or failed sends before computing the denominator.
3. Join downstream outcomes through stable IDs and a defined attribution window.
4. Show unknown, duplicate, and late events instead of forcing them into a stage.

## Decision table

| Stage | Example numerator / denominator | Question |
|---|---|---|
| Delivery | Delivered / eligible sends | Did the receiver accept it? |
| Reply | Unique classified replies / delivered leads | Did a person respond? |
| Positive reply | Positive replies / delivered leads | Did the response merit follow-up? |
| Meeting | Deduplicated meetings / eligible leads | Did the defined outcome occur? |

## Edge cases and interpretation

The funnel is not necessarily a causal path: a meeting may arise after a phone call or another channel. Treat the stages as linked observations and document attribution rather than implying email alone caused the outcome.

## Where RepMail fits

RepMail is relevant here as the sending and event context, not as a substitute for a measurement definition. Keep the campaign, message, mailbox, suppression, and downstream outcome identifiers that your reporting contract requires; verify the resulting data against the underlying provider or CRM evidence.

## Related resources

For the core reply-rate definitions, see [how to measure cold email reply rate](/repmail/learn/outreach/cold-email-reply-rate-measurement). Related implementation or measurement context: [cold email reply rate measurement](/repmail/learn/outreach/cold-email-reply-rate-measurement); [the first-party reference](https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html).


## Stage calculation table and boundary

Use stable IDs and name the unit at every stage. `delivery_rate = delivered_messages / eligible_sends`; `lead_reply_rate = unique_reply_leads / delivered_leads`; meeting rate uses unique meeting IDs over eligible leads inside a stated window. These are not interchangeable.

| Stage | Calculation | Annotation |
|---|---|---|
| eligible | suppression-passing sends | message grain |
| delivered | leads with accepted delivery | lead rollup |
| reply | distinct human-reply leads | rubric version |
| meeting | unique IDs in window | cancellation policy |

**Decision boundary:** Compare stages only when population and maturity match. **Failure case:** Counting three thread replies as three conversions inflates the funnel; so does retaining cancelled meetings as completed. **Verification and stop condition:** Verify each stage’s IDs against the prior stage and publish duplicate/unknown counts. Stop if >1% of meetings lack stable lead/account keys or the cohort is immature. Links: [cold-email conversion attribution](/repmail/learn/outreach/cold-email-conversion-attribution), [reconcile email events with CRM](/repmail/learn/outreach/reconcile-email-events-with-crm), and [AWS SES event publishing](https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html).

## References

[1]: https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html
