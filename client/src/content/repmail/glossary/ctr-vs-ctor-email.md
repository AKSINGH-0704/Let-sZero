---
product: repmail
academy: glossary
contentType: knowledge-base
slug: ctr-vs-ctor-email
title: "Click-Through Rate vs. Click-to-Open Rate"
description: "Click-Through Rate vs. Click-to-Open Rate — Teams compare denominators incorrectly across reports."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["glossary","deliverability","email","click","rate"]
assets:
  - type: table
    title: "Decision table: Which metric to use and how to validate"
    content:
      headers: ["Question you need to answer","Metric to use","Key denominator to validate","Immediate validation step"]
      rows:
        - ["Are we generating clicks per send for the whole list?","CTR","Delivered count","Confirm vendor 'delivered' definition and exclude bounces"]
        - ["Did the creative or links perform for people who opened?","CTOR","Unique opens","Ensure open tracking method (image pixel/preview) and set time window"]
        - ["Compare two segments with different open rates","Report both CTR and CTOR","Delivered and opens for each segment","Normalize by computing CTR for each segment then compare"]
        - ["A/B test focused on subject line","CTOR (primary) and open rate (supporting)","Opens per variant","Use same click definitions and time window per variant"]
        - ["Merging vendor reports into a single dashboard","Recomputed CTR/CTOR from raw events","Raw delivered, open, click events","Map event definitions and recompute metrics centrally"]
featured: false
collections: ["core-email-glossary"]
learningPaths: []
keyTakeaways:
  - "Teams compare denominators incorrectly across reports."
  - "A focused task with a separate troubleshooting, implementation, decision, or reference job from the current corpus."
  - "Link from measurement and KPI pages."
commonMistakes:
  - "Skipping this check: Decide whether your question needs delivery-level (CTR) or open-level (CTOR) insight"
  - "Skipping this check: Standardize unique vs. total click/open definitions across reports"
  - "Skipping this check: Confirm the platform's definition of 'delivered' before using it as a CTR denominator"
faqs:
  - question: "Can I convert CTOR to CTR if I know the open rate?"
    answer: "Yes, mathematically CTR = CTOR × open rate when both CTOR and open rate use the same definitions (unique vs. total) and time windows. This conversion assumes opens are measured adequately; because open measurement can be biased, treat the result as an approximation and document the assumptions."
  - question: "Which metric is less sensitive to image-blocking or preview behavior?"
    answer: "CTR is less sensitive to image-blocking because it uses delivered messages as the denominator, not opens. CTOR is directly affected by undercounted opens (which inflates CTOR) or overcounted opens (which reduces CTOR). Note that clicks themselves can be undercounted if tracking redirects fail."
  - question: "Should I always prefer one metric for executive dashboards?"
    answer: "No. Use CTR for high-level delivery and list health signals and CTOR to assess message-level creative and link effectiveness. For executives, present both with denominators and a short note on measurement limits; avoid presenting CTOR alone as a proxy for list-wide performance."
nextStep:
  label: "Continue with ARC (Authenticated Received Chain)"
  href: "/repmail/learn/glossary/arc"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

CTR (click-through rate) and CTOR (click-to-open rate) both measure clicks, but they use different denominators and answer different operational questions. CTR = clicks divided by all delivered messages (or recipients); CTOR = clicks divided by opens. Comparing them directly without aligning denominators leads to incorrect conclusions about campaign performance and experiment lifts.

## Definitions and exact formulas

Define CTR and CTOR precisely so teams use the right numerator and denominator. CTR = (unique clicks) / (delivered messages or total recipients delivered) unless your platform defines delivered differently; some vendors use sent minus bounces. CTOR = (unique clicks) / (unique opens). Both metrics can use unique or total clicks/opens—pick one and be consistent.
The decision boundary is the denominator: CTR measures clicks per delivery (volume-level engagement), CTOR measures clicks per open (engagement conditional on recipients who opened). When platforms label 'click rate' check whether they mean CTR or CTOR. Platform references that discuss standard metric definitions can help clarify vendor differences [1][2].

## When to use CTR vs. CTOR

Use CTR to compare overall campaign efficiency across audiences or to measure absolute click volume relative to deliverability and audience size. CTR is the right choice when your question is: Are we generating clicks per send, independent of subject line or preview influence?
Use CTOR when you want to isolate message content and creative effectiveness among recipients who opened the message. CTOR helps test subject line changes versus body/link performance; it’s a conditional conversion metric that excludes open-rate effects.

## Common mistakes and the denominator mismatch problem

The frequent operational error is comparing CTOR from one report to CTR from another or using opens from a subset (e.g., mobile-only) with clicks from total sends. That mixes different bases and creates misleading lift calculations. For example, a higher CTOR in a small, highly engaged segment does not imply a higher CTR for the full list unless open rates are equivalent.
The evidence limits: platforms report opens differently (image-based tracking, link redirects), and some opens are undercounted (image-blocking) or overcounted (auto-preview). Treat opens as an imperfect filter and document vendor measurement methods before trusting CTOR for precise inference [1][2].

## Practical sequence to compare campaigns correctly

Step 1: Pick the metric aligned with your question (CTR for delivery-level, CTOR for open-level). Step 2: Standardize counting rules—unique vs. total clicks/opens, delivered definition, time windows (e.g., 7 days post-send). Step 3: Pull both CTR and CTOR with the same unique/aggregate settings and the same time window so comparisons are apples-to-apples.
Stop condition: if you cannot reconcile delivered/Open definitions across systems, do not compare CTOR to CTR. Instead, compare like-for-like (CTR-to-CTR or CTOR-to-CTOR) after normalization or restrict comparisons to a single reporting source.

## Troubleshooting divergent signals

If CTR and CTOR move in opposite directions, check these failure modes: audience size shifts (CTR sensitive to list size), open measurement issues (image blocking reduces opens, inflating CTOR), and link rendering problems (broken links reduce clicks without affecting opens). Run segmented reporting: compare mobile vs. desktop opens, client behavior, and time-to-click distributions.
Decision steps: verify the same unique/aggregate click definition, confirm delivered count used for CTR, and validate that opens and clicks are from the same time window and campaign ID. If vendor docs disagree or are incomplete, flag the metric as directional rather than exact and annotate reports accordingly [1][2].

## Reporting and experiment-readout best practices

When producing campaign readouts or A/B test reports, include both CTR and CTOR plus open rate and sample sizes. Always show denominators (delivered, opens) and the counting rules used. For lift calculations, compute relative changes on the same denominator (CTR change vs. CTR change; CTOR change vs. CTOR change).
Evidence limits: reported lifts that mix denominators (e.g., CTOR lift presented as CTR lift) are invalid. If combining vendor reports, document each vendor’s metric definitions and, if necessary, re-compute metrics from raw events to align denominators.

## Practical checklist

- [ ] Decide whether your question needs delivery-level (CTR) or open-level (CTOR) insight
- [ ] Standardize unique vs. total click/open definitions across reports
- [ ] Confirm the platform's definition of 'delivered' before using it as a CTR denominator
- [ ] Use the same time window for clicks and opens when computing CTOR or CTR
- [ ] Always report raw denominators (delivered and opens) alongside percentages
- [ ] Segment results (device, client, list source) to surface measurement artifacts
- [ ] If merging vendor reports, re-compute CTR/CTOR from raw events to align definitions
- [ ] Annotate reports with measurement uncertainty when vendor tracking methods differ
- [ ] Avoid comparing CTOR from one campaign to CTR from another without normalization

## Where RepMail fits

Use this guide as a checklist and decision aid when preparing campaign readouts or troubleshooting metric divergences in outbound workflows. It helps operators decide which metric answers their specific question, what to validate in vendor reports, and when to recompute metrics from raw events. Do not interpret this guide as implying any specific RepMail feature or guarantee.

Continue with [ARC (Authenticated Received Chain)](/repmail/learn/glossary/arc) for the next step in the workflow.

## Related RepMail guides

- [List-Unsubscribe Headers and One-Click Semantics](/repmail/learn/glossary/list-unsubscribe-one-click-semantics)
- [Authentication-Results Header: Reading Receiver Assertions](/repmail/learn/glossary/authentication-results-header)


## Sources

[1]: https://www.infobip.com/docs/reporting/metrics-reference/email-metrics-reference "Supporting technical or operational reference"
[2]: https://www.braze.com/resources/articles/10-essential-email-metrics "Supporting technical or operational reference"
