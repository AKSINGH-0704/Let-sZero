---
product: repmail
academy: outreach
contentType: guide
slug: cold-email-reporting-cutoff
title: "Cold Email Reporting Cutoff: When Is a Campaign Mature?"
description: "Set a cold-email reporting cutoff so mature and immature campaign cohorts are not compared as if they had equal observation time."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach-measurement", "cold-email", "analytics"]
learningPaths: ["getting-started"]
assets:
  - type: table
    title: "Decision guide + checklist"
    content: |
      - Define the report outcome and its observation window.
      - Freeze the cohort by send timestamp and timezone.
      - At cutoff, snapshot events, late-event count, and unresolved records.
      - Compare only cohorts with the same rule; report immature cohorts separately.
featured: false
collections: ["outreach-measurement"]
keyTakeaways:
  - "A cold-email reporting cutoff is the timestamp after which a cohort is considered mature for a specific report. Set it before comparison, allow the sequence and expected response window to elapse, and label anything still open as immature or unknown."
  - "Use explicit denominators, event grains, and observation windows so another operator can reproduce the report."
  - "Treat late, missing, duplicate, and negative events as visible data states rather than silently excluding them."
commonMistakes:
  - "Changing the denominator or observation window between campaigns without labeling the change."
  - "Treating attribution, delivery, or an automated event as proof of human intent or causality."
faqs:
  - question: "Is there one correct reporting window?"
    answer: "No. Use a window that matches your sequence and outcome, then keep it consistent."
  - question: "Can I update a mature report?"
    answer: "Yes, with a version or late-event revision note. Do not overwrite the original as-of view without traceability."
  - question: "Should delivery and reply have different cutoffs?"
    answer: "They can, because they mature at different speeds. Label each metric’s cutoff."
nextStep:
  label: "Review cold-email reply-rate measurement"
  href: "/repmail/learn/outreach/cold-email-reply-rate-measurement"
  description: "Start with consistent reply definitions before adding downstream outcomes."
---

A cold-email reporting cutoff is the timestamp after which a cohort is considered mature for a specific report. Set it before comparison, allow the sequence and expected response window to elapse, and label anything still open as immature or unknown.

## Define the measurement before calculating it

Maturity depends on the event: delivery may be known quickly, while replies and meetings arrive later. Use a cohort-specific send cutoff plus an observation window, and record the report’s as-of time. Do not keep extending a window until a preferred outcome appears.

## A practical workflow

1. Define the report outcome and its observation window.
2. Freeze the cohort by send timestamp and timezone.
3. At cutoff, snapshot events, late-event count, and unresolved records.
4. Compare only cohorts with the same rule; report immature cohorts separately.

## Decision table

| Cutoff field | Purpose | Example treatment |
|---|---|---|
| Send cutoff | Freezes eligible exposure | No new sends added to cohort |
| Observation window | Allows outcomes to arrive | Same duration across cohorts |
| As-of timestamp | Shows data freshness | Late events tracked separately |
| Maturity state | Prevents false comparisons | Mature, immature, or unknown |

## Edge cases and interpretation

A meeting booked after the cutoff may still be relevant if your defined window allows it; a rescheduled event should not silently reset the cohort clock. If provider or CRM data is delayed, preserve the cutoff and mark the report provisional.

## Related resources

For the core reply-rate definitions, see [how to measure cold email reply rate](/repmail/learn/outreach/cold-email-reply-rate-measurement). Related implementation or measurement context: [cold email reply rate measurement](/repmail/learn/outreach/cold-email-reply-rate-measurement); [the first-party reference](https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html).


## Decision boundary: mature, provisional, or reopen

Mark a cohort **mature** only when its defined sequence exposure and outcome window have elapsed, the denominator is frozen, and late or unresolved events are disclosed. Mark it **provisional** when the clock has not elapsed or source events are delayed. Reopen a published result only through a versioned revision when a material late event changes the reported numerator or denominator. Never extend a cutoff selectively because one campaign is underperforming.

## Field-level cutoff procedure and example

Record `cohort_id`, `send_cutoff_at_utc`, `last_eligible_send_at_utc`, `sequence_end_at_utc`, `outcome_window_days`, `report_cutoff_at_utc`, `as_of_at_utc`, `maturity_state`, `late_event_count`, and `unknown_count`. Suppose the last eligible send was 2026-09-01 18:00 UTC, the sequence ends after 5 days, and the defined reply window is 14 days after sequence end. The maturity cutoff is 2026-09-20 18:00 UTC. A reply at 2026-09-21 belongs in a later revision only if the data policy allows late events; it must not be silently added to the original as-of view. Report `known replies / eligible leads`, plus late and unknown counts.

## Failure cases and stop condition

Common failures are using local time for one cohort and UTC for another, letting a reschedule reset the clock, treating missing provider events as no events, and comparing a mature campaign with an open one. Stop comparison when the maturity states differ, the event grain changes, or the cutoff cannot be reproduced from immutable send timestamps. Stop a dashboard refresh if it overwrites the prior as-of view; publish a new version with the reason and reviewer.

The correct window depends on the business question and sequence design. It is not a universal benchmark. As of **2026-09-25**, any provider event timing should be checked against the current provider documentation and the local ingestion behavior.

## Related operational links

Pair this cutoff with [cold email campaign variance](/repmail/learn/outreach/cold-email-campaign-variance), [cold email to meeting conversion](/repmail/learn/outreach/cold-email-to-meeting-conversion-rate), and [cold email reply-rate measurement](/repmail/learn/outreach/cold-email-reply-rate-measurement).

## References

[1]: https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html
