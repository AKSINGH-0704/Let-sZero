---
product: repmail
academy: outreach
contentType: template
slug: cold-email-baseline-before-launch
title: "Cold Email Baseline Before Launch: What to Record"
description: "Use a pre-launch cold-email baseline checklist to record audience, versions, event definitions, attribution, and suppression state."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach-measurement", "cold-email", "analytics"]
learningPaths: ["getting-started"]
assets:
  - type: template
    title: "Pre-launch checklist"
    content: |
      - Freeze the audience export or query and record its timestamp and eligibility rules.
      - Version the copy, sequence steps, links, tracking parameters, sending identities, and provider mix.
      - Define send, delivery, bounce, reply, opt-out, complaint, meeting, and attribution events.
      - Record suppression state, owners, reporting cutoff, and the location of raw event evidence.
featured: false
collections: ["outreach-measurement"]
keyTakeaways:
  - "Before launching a cold-email campaign, record the baseline that will make later measurement interpretable. Capture audience eligibility, sequence and copy versions, sending identities, event definitions, observation rules, and suppression state before the first message leaves the system."
  - "Use explicit denominators, event grains, and observation windows so another operator can reproduce the report."
  - "Treat late, missing, duplicate, and negative events as visible data states rather than silently excluding them."
commonMistakes:
  - "Changing the denominator or observation window between campaigns without labeling the change."
  - "Treating attribution, delivery, or an automated event as proof of human intent or causality."
faqs:
  - question: "Is a baseline a benchmark?"
    answer: "No. It is the pre-launch state and measurement contract. A benchmark requires comparable historical evidence."
  - question: "What if fields are missing before launch?"
    answer: "Record them as unknown, assign an owner, and do not imply they were measured."
  - question: "Should tracking links be included?"
    answer: "Yes, record their naming and destination rules, but weigh attribution value against tracking and deliverability trade-offs."
nextStep:
  label: "Review cold-email reply-rate measurement"
  href: "/repmail/learn/outreach/cold-email-reply-rate-measurement"
  description: "Start with consistent reply definitions before adding downstream outcomes."
---

Before launching a cold-email campaign, record the baseline that will make later measurement interpretable. Capture audience eligibility, sequence and copy versions, sending identities, event definitions, observation rules, and suppression state before the first message leaves the system.

## Define the measurement before calculating it

A baseline is a measurement plan, not a promised benchmark. It describes what you knew and how you intended to measure it. Keep the snapshot immutable, add a change log during the campaign, and record unknown fields rather than filling them with assumptions.

## A practical workflow

1. Freeze the audience export or query and record its timestamp and eligibility rules.
2. Version the copy, sequence steps, links, tracking parameters, sending identities, and provider mix.
3. Define send, delivery, bounce, reply, opt-out, complaint, meeting, and attribution events.
4. Record suppression state, owners, reporting cutoff, and the location of raw event evidence.

## Decision table

| Baseline field | Example value to record | Why |
|---|---|---|
| Audience | Segment query and export time | Explains who was eligible |
| Version | Sequence/copy ID | Separates changes |
| Events | Reply and meeting definitions | Prevents metric drift |
| Suppression | Snapshot and authority | Protects stop rules |
| Window | Observation cutoff | Avoids immature comparisons |

## Edge cases and interpretation

If the audience or copy changes after launch, add a new version rather than overwriting the baseline. A campaign can also have partial provider events; preserve that limitation in the report.

## Where RepMail fits

RepMail is relevant here as the sending and event context, not as a substitute for a measurement definition. Keep the campaign, message, mailbox, suppression, and downstream outcome identifiers that your reporting contract requires; verify the resulting data against the underlying provider or CRM evidence.

## Related resources

For the core reply-rate definitions, see [how to measure cold email reply rate](/repmail/learn/outreach/cold-email-reply-rate-measurement). Related implementation or measurement context: [cold email reply rate measurement](/repmail/learn/outreach/cold-email-reply-rate-measurement); [the first-party reference](https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html).


## Baseline field table and launch gate

Treat the baseline as immutable. Save the audience query/export hash, suppression snapshot, sequence and provider IDs, link taxonomy, event definitions, owner, and planned cutoff before the first send. A baseline is a contract, not a benchmark.

| Field | Record before launch | Test |
|---|---|---|
| audience | query/export ID and UTC time | reproduce population |
| version bundle | copy/sequence/link/provider IDs | isolate changes |
| denominators | eligible rules | suppress once |
| event contract | delivery/bounce/reply/meeting definitions | validity timing |
| evidence | raw location and owner | verification path |

**Decision boundary:** Launch only when each primary field has a value or an owned unknown. **Failure case:** Overwriting the export after enrichment and defining “meeting” after results are failure cases. **Verification and stop condition:** Two operators should reproduce the eligible count and IDs. Stop if suppression reconciliation, raw evidence ownership, or cutoff is missing. Links: [cold-email cohort analysis](/repmail/learn/outreach/cold-email-cohort-analysis), [cold-email UTM naming convention](/repmail/learn/outreach/cold-email-utm-naming-convention), and [AWS SES event publishing](https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html).


The baseline **calculation** is a reproducible eligible count, not a performance score: `eligible_leads = audience rows − documented exclusions`.
## References

[1]: https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html
