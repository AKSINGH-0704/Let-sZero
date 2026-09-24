---
product: repmail
academy: outreach
contentType: template
slug: cold-email-metrics-data-dictionary
title: "Cold Email Metrics Data Dictionary"
description: "Use a cold-email metrics data dictionary to govern event names, grain, timestamps, denominators, inclusion rules, and owners."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach-measurement", "cold-email", "analytics"]
learningPaths: ["getting-started"]
assets:
  - type: template
    title: "Data dictionary template"
    content: |
      - List entities: campaign, message, contact or account, thread, meeting, and suppression record.
      - Define event names and when each event becomes valid.
      - Write formulas with numerator, denominator, time window, and exclusions.
      - Assign an owner and review date; record privacy, access, and provider limitations.
featured: false
collections: ["outreach-measurement"]
keyTakeaways:
  - "A cold-email metrics data dictionary prevents the same label—such as “reply rate”—from meaning different things in different reports. For every metric, document the event, entity grain, timestamp, numerator, denominator, inclusion rules, owner, and known limitations."
  - "Use explicit denominators, event grains, and observation windows so another operator can reproduce the report."
  - "Treat late, missing, duplicate, and negative events as visible data states rather than silently excluding them."
commonMistakes:
  - "Changing the denominator or observation window between campaigns without labeling the change."
  - "Treating attribution, delivery, or an automated event as proof of human intent or causality."
faqs:
  - question: "How often should a dictionary change?"
    answer: "Change it when definitions, sources, or business rules change; version the change and preserve the previous meaning for historical reports."
  - question: "Should rates live in the dictionary?"
    answer: "Yes, include the formula and denominator, not just a display label."
  - question: "Can one event have multiple grains?"
    answer: "Create separate fields or metrics. A message-level event and a lead-level rollup should not share one ambiguous name."
nextStep:
  label: "Review cold-email reply-rate measurement"
  href: "/repmail/learn/outreach/cold-email-reply-rate-measurement"
  description: "Start with consistent reply definitions before adding downstream outcomes."
---

A cold-email metrics data dictionary prevents the same label—such as “reply rate”—from meaning different things in different reports. For every metric, document the event, entity grain, timestamp, numerator, denominator, inclusion rules, owner, and known limitations.

## Define the measurement before calculating it

Start with entities, then define events. A send is not a delivery; a message reply is not a unique lead reply; an open is not a reliable human response in every mailbox. Give each field a stable name, source, data type, and version. Keep unknown and late states explicit so the dictionary reflects real data.

## A practical workflow

1. List entities: campaign, message, contact or account, thread, meeting, and suppression record.
2. Define event names and when each event becomes valid.
3. Write formulas with numerator, denominator, time window, and exclusions.
4. Assign an owner and review date; record privacy, access, and provider limitations.

## Decision table

| Field | Definition to capture | Example question |
|---|---|---|
| Event name | Stable name and source | What does delivered mean here? |
| Grain | Message, lead, account, meeting | Can duplicates occur? |
| Time | Event and ingestion timestamps | When is the metric mature? |
| Denominator | Eligible population and exclusions | Who is counted? |
| Owner | Person or team | Who resolves anomalies? |

## Edge cases and interpretation

Apple Mail Privacy Protection can make open events a poor proxy for human attention, so label open data accordingly. Provider event schemas can also differ; normalize only after retaining the original payload and source.

## Where RepMail fits

RepMail is relevant here as the sending and event context, not as a substitute for a measurement definition. Keep the campaign, message, mailbox, suppression, and downstream outcome identifiers that your reporting contract requires; verify the resulting data against the underlying provider or CRM evidence.

## Related resources

For the core reply-rate definitions, see [how to measure cold email reply rate](/repmail/learn/outreach/cold-email-reply-rate-measurement). Related implementation or measurement context: [cold email reply rate measurement](/repmail/learn/outreach/cold-email-reply-rate-measurement); [the first-party reference](https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html); [open rate tracking apple mpp](/repmail/learn/cold-email/open-rate-tracking-apple-mpp).


## Metric definition table and change boundary

Give each metric a stable name, owner, grain, source, timestamp rule, formula, exclusions, and version. `lead_positive_reply_rate` and `message_reply_event_rate` answer different questions and must not share one ambiguous label.

| Field | Example | Purpose |
|---|---|---|
| name | `lead_positive_reply_rate` | no ambiguity |
| grain | unique lead/campaign | duplicate control |
| numerator | first positive in window | event explicit |
| denominator | eligible leads | population explicit |
| time rule | event time + cutoff | maturity |
| owner/version | analytics/v2026-09 | change control |

**Decision boundary:** Create a new version when grain, denominator, event class, source, or window changes. **Failure case:** Open events are not automatically human responses. **Verification and stop condition:** Verify one metric independently from raw rows and test empty, duplicate, and late fixtures. Stop release if owner, denominator, source, or unique name is missing. Links: [cold-email dashboard metrics](/repmail/learn/outreach/cold-email-dashboard-metrics), [cold-email funnel metrics by stage](/repmail/learn/outreach/cold-email-funnel-metrics-by-stage), and [Apple Mail Privacy Protection](https://www.apple.com/legal/privacy/data/en/mail-privacy-protection/).


Every metric needs a **calculation** field containing its numerator, denominator, and cutoff; a label alone is not a metric definition.
## References

[1]: https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html
[2]: https://www.apple.com/legal/privacy/data/en/mail-privacy-protection/
