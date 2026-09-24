---
product: repmail
academy: outreach
contentType: comparison
slug: compare-outreach-segments-fairly
title: "Compare Outreach Segments Without Simpson’s Paradox"
description: "Compare outreach segments fairly with fixed eligibility, mature cohorts, denominator control, and mix checks that avoid misleading aggregates."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach-measurement", "cold-email", "analytics"]
learningPaths: ["getting-started"]
assets:
  - type: table
    title: "Analytical guide + template"
    content: |
      - Set inclusion and exclusion rules and freeze them for both segments.
      - Match or stratify on audience, region, role, provider, mailbox, timing, and sequence exposure.
      - Use the same maturity and attribution cutoff, including late-event handling.
      - Report aggregate and stratified views; investigate reversals instead of picking the most flattering rate.
featured: false
collections: ["outreach-measurement"]
keyTakeaways:
  - "Compare outreach segments fairly by holding eligibility, observation windows, event definitions, and exposure constant. Then stratify by meaningful mix variables before trusting an aggregate difference; otherwise a segment can look stronger only because it contains easier subgroups."
  - "Use explicit denominators, event grains, and observation windows so another operator can reproduce the report."
  - "Treat late, missing, duplicate, and negative events as visible data states rather than silently excluding them."
commonMistakes:
  - "Changing the denominator or observation window between campaigns without labeling the change."
  - "Treating attribution, delivery, or an automated event as proof of human intent or causality."
faqs:
  - question: "Do I need equal segment sizes?"
    answer: "No. Equal size is convenient, not sufficient. Comparable eligibility and transparent uncertainty matter more."
  - question: "What if segment labels change mid-campaign?"
    answer: "Version the label and analyze the periods separately or map them with an explicit crosswalk."
  - question: "Should I report only the aggregate?"
    answer: "No. Include counts, key strata, and weighting so the result can be challenged and reproduced."
nextStep:
  label: "Review cold-email reply-rate measurement"
  href: "/repmail/learn/outreach/cold-email-reply-rate-measurement"
  description: "Start with consistent reply definitions before adding downstream outcomes."
---

Compare outreach segments fairly by holding eligibility, observation windows, event definitions, and exposure constant. Then stratify by meaningful mix variables before trusting an aggregate difference; otherwise a segment can look stronger only because it contains easier subgroups.

## Define the measurement before calculating it

Create one segment record per eligible lead with segment label, send cohort, campaign version, provider or mailbox, sequence exposure, and suppression state. Define the comparison population before seeing results. Report counts and rates for each stratum, then explain whether the aggregate is weighted by leads, sends, or another unit.

## A practical workflow

1. Set inclusion and exclusion rules and freeze them for both segments.
2. Match or stratify on audience, region, role, provider, mailbox, timing, and sequence exposure.
3. Use the same maturity and attribution cutoff, including late-event handling.
4. Report aggregate and stratified views; investigate reversals instead of picking the most flattering rate.

## Decision table

| Control | Why it matters | Check |
|---|---|---|
| Eligibility | Prevents different populations | Same suppression and validity rules |
| Exposure | Controls follow-up opportunity | Same step or modeled exposure |
| Mix | Avoids aggregation reversal | Compare important strata |
| Weighting | Explains the aggregate | State lead vs send weighting |

## Edge cases and interpretation

Simpson’s paradox can appear when a segment has more volume in a low-response subgroup while its within-subgroup rates are higher. Do not “fix” the result by deleting strata; show the mix and choose a decision rule.

## Related resources

For the core reply-rate definitions, see [how to measure cold email reply rate](/repmail/learn/outreach/cold-email-reply-rate-measurement). Related implementation or measurement context: [cold email reply rate measurement](/repmail/learn/outreach/cold-email-reply-rate-measurement).



## Decision boundary: compare, stratify, or do not conclude

Compare segments directly only when eligibility, exposure, event definitions, maturity, and attribution windows match. Stratify or standardize when mix differs by provider, role, region, mailbox, sequence step, or timing. Do not conclude when labels changed without a crosswalk, suppression rules differ, or the event grain cannot be reconciled. Equal segment size is optional; comparable construction and transparent weighting are not.

## Field-level comparison procedure and worked calculation

Create one row per eligible lead with `segment`, `lead_id`, `eligibility_rule_version`, `provider`, `role`, `region`, `mailbox`, `sequence_exposure`, `send_at_utc`, `outcome`, `cutoff_at_utc`, and `suppression_state`. Freeze rules before inspecting outcomes. Example: Segment A has 100 leads, 10 replies; Segment B has 900 leads, 54 replies. Aggregate rates are 10% and 6%. Now stratify: in the enterprise stratum A is 8/80 = 10% and B is 18/300 = 6%; in SMB A is 2/20 = 10% and B is 36/600 = 6%. Here the aggregate difference is consistent. If instead B contained 800 low-response SMB leads and A mostly enterprise leads, the aggregate could reverse a within-stratum pattern. Report both raw and standardized views, with the weighting rule stated.

## Failure cases and stop condition

Watch for post-outcome segment reassignment, hidden suppression differences, unequal follow-up exposure, provider incidents, and missing outcomes classified as failures in one segment but unknown in another. Stop the analysis if a segment definition was changed midstream without a versioned crosswalk, if a stratum has no eligible denominator, or if a material event remains unreconciled. Do not delete inconvenient strata; flag them and ask whether the decision can tolerate the uncertainty.

As of **2026-09-25**, this is an analytical method, not evidence that one audience or vendor will outperform another. Re-run after material campaign, provider, or policy changes.

## Related operational links

Anchor the analysis to [cold email campaign variance](/repmail/learn/outreach/cold-email-campaign-variance), [cold email reporting cutoff](/repmail/learn/outreach/cold-email-reporting-cutoff), and [cold email reply-rate measurement](/repmail/learn/outreach/cold-email-reply-rate-measurement).

## References

[1]: /repmail/learn/outreach/cold-email-reply-rate-measurement
[2]: https://www.itl.nist.gov/div898/handbook/eda/eda.htm
