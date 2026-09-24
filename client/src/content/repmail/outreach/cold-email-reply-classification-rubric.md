---
product: repmail
academy: outreach
contentType: template
slug: cold-email-reply-classification-rubric
title: "Cold Email Reply Classification Rubric for Human Review"
description: "Use a human-review rubric to classify cold-email replies consistently into positive, neutral, negative, opt-out, referral, auto, and unclear."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach-measurement", "cold-email", "analytics", "replies"]
learningPaths: ["getting-started"]
assets:
  - type: template
    title: "Rubric + QA checklist"
    content: |
      - Redact or restrict message content according to your access policy, then assign a reviewer.
      - Apply the primary class using the rubric and record confidence or an adjudication flag.
      - Deduplicate thread replies at the lead level for funnel rates while retaining message-level records for operations.
      - Audit a sample of labels and version the rubric when definitions change.
featured: false
collections: ["outreach-measurement"]
keyTakeaways:
  - "A cold-email reply classification rubric turns a subjective inbox into a repeatable dataset. Classify the reply at the lead or thread level, preserve the raw evidence, and separate positive interest from neutral, negative, automated, referral, unsubscribe, and unclear outcomes."
  - "Use explicit denominators, event grains, and observation windows so another operator can reproduce the report."
  - "Treat late, missing, duplicate, and negative events as visible data states rather than silently excluding them."
commonMistakes:
  - "Changing the denominator or observation window between campaigns without labeling the change."
  - "Treating attribution, delivery, or an automated event as proof of human intent or causality."
faqs:
  - question: "Should an unsubscribe reply count as negative?"
    answer: "Keep opt-out as its own class because it triggers a suppression action, regardless of sentiment."
  - question: "Can AI classify replies automatically?"
    answer: "It can assist triage, but retain human review or adjudication for ambiguous, opt-out, and high-impact cases."
  - question: "What is the unit for reply rate?"
    answer: "Use unique leads for funnel reporting and message or thread records for workload, with labels explaining the grain."
nextStep:
  label: "Review cold-email reply-rate measurement"
  href: "/repmail/learn/outreach/cold-email-reply-rate-measurement"
  description: "Start with consistent reply definitions before adding downstream outcomes."
---

A cold-email reply classification rubric turns a subjective inbox into a repeatable dataset. Classify the reply at the lead or thread level, preserve the raw evidence, and separate positive interest from neutral, negative, automated, referral, unsubscribe, and unclear outcomes.

## Define the measurement before calculating it

Define one primary class and optional secondary flags. A reply that says “not now, ask in Q4” is usually neutral or timing, while “remove me” is an opt-out even if the message contains a question. An automated vacation notice is not a human response. Keep an adjudication note for ambiguous cases and do not train a metric on unreviewed guesses.

## A practical workflow

1. Redact or restrict message content according to your access policy, then assign a reviewer.
2. Apply the primary class using the rubric and record confidence or an adjudication flag.
3. Deduplicate thread replies at the lead level for funnel rates while retaining message-level records for operations.
4. Audit a sample of labels and version the rubric when definitions change.

## Decision table

| Class | Definition | Metric treatment |
|---|---|---|
| Positive | Clear interest or next-step request | Positive-reply numerator |
| Neutral | Question, timing, or noncommittal response | Separate from positive |
| Negative | Rejection or hostile response | Quality and stop signal |
| Opt-out | Requests no further contact | Immediate suppression workflow |
| Auto / unclear | Automated notice or insufficient context | Exclude from human reply rate |

## Edge cases and interpretation

A referral may be positive for the campaign but not the original contact. Record the referred contact separately. Mixed replies should follow the highest-priority safety rule: an opt-out remains an opt-out even if interest is also expressed.

## Related resources

For the core reply-rate definitions, see [how to measure cold email reply rate](/repmail/learn/outreach/cold-email-reply-rate-measurement). Related implementation or measurement context: [cold email reply rate measurement](/repmail/learn/outreach/cold-email-reply-rate-measurement); [the first-party reference](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business).


## Rubric fields and adjudication boundary

Classify one primary outcome per lead-thread for funnel reporting while retaining message labels for review. Record evidence reference, reviewer, rubric version, confidence, flags, and action. Opt-out wins over sentiment: “interested, but remove me” is still an opt-out.

| Field | Allowed value/rule | Treatment |
|---|---|---|
| `primary_class` | positive, neutral, negative, opt_out, referral, auto, unclear | one per thread |
| `confidence` | high/medium/low | low needs review |
| `action` | follow_up/suppress/route/review | operational output |
| `evidence_ref` | restricted message reference | no broad raw export |

**Decision boundary:** Count positive only for clear interest or next step. Referral is separate, and auto-replies are not human responses. **Failure case:** Failure cases include blended sentiment hiding suppression and “sounds good” in an auto-reply. **Verification and stop condition:** Double-review 20 labels or all in a small batch; stop trends when disagreement exceeds 10%, opt-outs lack actions, or rubric changes are unversioned. Links: [negative reply and unsubscribe stop signals](/repmail/learn/outreach/negative-reply-unsubscribe-rate-stop-signals), [cold-email funnel metrics by stage](/repmail/learn/outreach/cold-email-funnel-metrics-by-stage), and the [FTC CAN-SPAM guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business).


The **calculation** for a lead-level positive rate is `positive_leads / eligible_leads`; do not use message labels as the denominator.
## References

[1]: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
