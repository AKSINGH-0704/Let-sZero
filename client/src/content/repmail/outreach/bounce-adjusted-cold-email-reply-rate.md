---
product: repmail
academy: outreach
contentType: guide
slug: bounce-adjusted-cold-email-reply-rate
title: "Bounce-Adjusted Cold Email Reply Rate"
description: "Report send-based and delivery-based cold-email reply rates together, with bounce context and explicit denominator rules."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach-measurement", "cold-email", "analytics", "replies", "bounces"]
learningPaths: ["getting-started"]
assets:
  - type: table
    title: "Formula guide + diagnostic table"
    content: |
      - Freeze eligible sends and define which bounce events are in scope.
      - Separate hard, soft, and unknown bounce states before choosing exclusions.
      - Calculate send-based and delivery-based rates beside bounce counts and timestamps.
      - Investigate list quality and provider evidence before interpreting a higher adjusted rate as improvement.
featured: false
collections: ["outreach-measurement"]
keyTakeaways:
  - "A bounce-adjusted cold-email reply rate is not a replacement metric; it is a paired view. Report replies per eligible send alongside replies per delivered or eligible lead, and show the bounce population so a rate cannot hide list or transport problems."
  - "Use explicit denominators, event grains, and observation windows so another operator can reproduce the report."
  - "Treat late, missing, duplicate, and negative events as visible data states rather than silently excluding them."
commonMistakes:
  - "Changing the denominator or observation window between campaigns without labeling the change."
  - "Treating attribution, delivery, or an automated event as proof of human intent or causality."
faqs:
  - question: "Does bounce adjustment improve the campaign?"
    answer: "No. It changes the denominator and can clarify response among reachable recipients; it does not repair poor list quality."
  - question: "Should soft bounces be excluded?"
    answer: "Only under a documented event policy. A temporary deferral is not the same as a permanent failure."
  - question: "Why report both rates?"
    answer: "The send-based rate shows program yield; the delivery-based rate helps separate reachability from response."
nextStep:
  label: "Review cold-email reply-rate measurement"
  href: "/repmail/learn/outreach/cold-email-reply-rate-measurement"
  description: "Start with consistent reply definitions before adding downstream outcomes."
---

A bounce-adjusted cold-email reply rate is not a replacement metric; it is a paired view. Report replies per eligible send alongside replies per delivered or eligible lead, and show the bounce population so a rate cannot hide list or transport problems.

## Define the measurement before calculating it

Let R be unique human replies, S eligible sends, and B bounces under the chosen event window. A send-based rate is R/S. A delivery-adjusted view may use R/(S−B) when the remaining population is a defensible proxy for delivered opportunities; if delivery events are available, use delivered leads directly. State the formula and never imply that subtracting bounces fixes every data-quality issue.

## A practical workflow

1. Freeze eligible sends and define which bounce events are in scope.
2. Separate hard, soft, and unknown bounce states before choosing exclusions.
3. Calculate send-based and delivery-based rates beside bounce counts and timestamps.
4. Investigate list quality and provider evidence before interpreting a higher adjusted rate as improvement.

## Decision table

| Metric | Formula | Caveat |
|---|---|---|
| Send-based reply rate | R ÷ S | Includes bounced sends in the denominator |
| Bounce-adjusted proxy | R ÷ (S − B) | Valid only when exclusions are defined |
| Delivered-lead reply rate | R ÷ delivered leads | Requires reliable delivery events |

## Edge cases and interpretation

A late bounce can arrive after a reply, and a single lead may have multiple messages. Decide whether the denominator is message or lead based on the question. Keep an “unknown delivery” bucket rather than dropping incomplete records.

## Where RepMail fits

RepMail is relevant here as the sending and event context, not as a substitute for a measurement definition. Keep the campaign, message, mailbox, suppression, and downstream outcome identifiers that your reporting contract requires; verify the resulting data against the underlying provider or CRM evidence.

## Related resources

For the core reply-rate definitions, see [how to measure cold email reply rate](/repmail/learn/outreach/cold-email-reply-rate-measurement). Related implementation or measurement context: [cold email reply rate measurement](/repmail/learn/outreach/cold-email-reply-rate-measurement); [the first-party reference](https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html).


## Bounce-adjusted calculation table

Let `R` be unique human reply leads, `S` eligible sends/leads, `B_h` hard bounces, and `D` delivered leads. Report `R/S` and, when delivery events support it, `R/D`; `R/(S-B_h)` is only a labeled proxy.

| Field | Formula | Boundary |
|---|---|---|
| send rate | `R / S` | program yield |
| hard bounce | `B_h / S` | reachability context |
| delivery rate | `R / D` | reliable delivered rollup required |
| unknown | `S-D-classified_bounces` | never drop silently |

**Decision boundary:** Do not call a higher adjusted rate improvement. **Failure case:** Soft bounces need an explicit policy; late bounces can arrive after replies. **Verification and stop condition:** Verify source sends, bounce classes, grain, and late events. Stop if unknown delivery exceeds 5%, denominator is zero, or duplicate mapping remains unresolved. Links: [cold-email funnel metrics by stage](/repmail/learn/outreach/cold-email-funnel-metrics-by-stage), [cold-email metrics data dictionary](/repmail/learn/outreach/cold-email-metrics-data-dictionary), and [AWS SES event publishing](https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html).

## References

[1]: https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html
