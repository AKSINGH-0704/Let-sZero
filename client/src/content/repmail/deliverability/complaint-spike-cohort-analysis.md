---
product: repmail
academy: deliverability
contentType: template
slug: complaint-spike-cohort-analysis
title: "Complaint Spike by Cohort: Find the Segment Causing the Damage"
description: "Complaint Spike by Cohort: Find the Segment Causing the Damage — Aggregate complaint rate hides a bad list source, campaign, provider, or age cohort."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability","reputation","complaint","incident","spike","cohort","find"]
assets:
  - type: table
    title: "Cohort isolation diagnostic table"
    content:
      headers: ["Scenario observed","Primary diagnostic metric","Minimum suppress action","How to validate result"]
      rows:
        - ["Single provider has rising complaints","Provider complaint rate per 1,000 sends; share of incremental complaints","Pause affected provider or IP pool for impacted campaigns","Hold provider traffic 24–72 hours and observe drop in aggregate complaints"]
        - ["One campaign shows disproportionate complaints","Campaign complaint rate and complaint contribution (%)","Pause or throttle that campaign for suspect list segments","Inspect messages for offer/subject and run a short A/B hold"]
        - ["One list source (acquisition tag) spikes","Complaint rate by list source; recent onboarding volume","Suppress that list source tag and stop sends from that list","Sample messages and confirm decreased complaints after 1–2 windows"]
        - ["New recipients (0–7 days) have high complaints","Complaint rate by signup-age bucket","Pause sends to the recent signup-age cohort","Hold 24–72 hours; if complaints fall, tighten welcome series cadence"]
        - ["Multiple small cohorts contribute","Top contributors ranked by excess complaints","Suppress top contributors until cumulative explained complaints ≥50%","Iteratively re-evaluate after each suppression action"]
        - ["No cohort explains spike","Aggregate complaint rate increased but no dominant cohort","Open cross-team incident; escalate to deliverability lead","Request provider feedback and review recent policy/creative changes"]
featured: false
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
keyTakeaways:
  - "Aggregate complaint rate hides a bad list source, campaign, provider, or age cohort."
  - "Existing complaint-spike response is mailbox/domain-level; this is cohort isolation."
  - "Links complaint monitoring to list-quality and campaign incident pages."
commonMistakes:
  - "Skipping this check: Define baseline period and compute baseline complaint rate (7–14 days)."
  - "Skipping this check: Export per-message logs including campaign ID, list source tag, sending provider, signup date, and complaint flag."
  - "Skipping this check: Compute cohort complaint rates per 1,000 sends and rank by excess above baseline."
faqs:
  - question: "How large must a cohort be before it’s worth suppressing?"
    answer: "There’s no fixed size; use an impact rule. Prefer suppressing the smallest cohort that explains ≥50% of the incremental complaints or any cohort with complaint rate ≥2× baseline. Also weigh volume: if suppression would remove >20% of daily sends, escalate before taking irreversible actions."
  - question: "Can I rely on provider complaint counts to validate actions immediately?"
    answer: "Treat provider complaint counts as directional. Providers may delay or sample complaints and may present different grouping rules. Use them for near-term validation (24–72 hours) but expect some lag; if provider-specific guidance exists, treat it as directional not absolute [1][2]."
  - question: "If I suppress a list source, how long should I keep it suppressed?"
    answer: "Keep it suppressed until complaints return to baseline-plus-noise for two comparable windows (e.g., two 7-day windows) and you’ve implemented corrective actions (cleaning, preference center updates, or re-acquisition). If the list source is business-critical, escalate and apply stricter throttling and remediation instead of permanent suppression."
nextStep:
  label: "Continue with Provider-Specific Deliverability Triage: Gmail, Microsoft, and More"
  href: "/repmail/learn/deliverability/provider-specific-deliverability-triage"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

If your overall complaint rate looks acceptable but deliverability is dropping, isolate the smallest cohort that explains the spike so you can pause or suppress it quickly. Use log-level signals (list source, campaign, sending provider, recipient age cohort, enrollment channel) in a stepped narrowing sequence, validate with provider feedback or reproducible sample, then act on the minimal suppress set to stop the damage.

## What problem this template solves

This template turns a hidden complaint spike into a concrete suppression decision: identify the minimal segment responsible for rising complaints so you can stop sending from that segment while preserving healthy traffic. The decision boundary is pragmatic — find the smallest slice that accounts for the majority of incremental complaints over the baseline period. Evidence limits: complaint data are noisy, provider feedback loops may lag, and aggregate spam-folder behavior is not fully observable from complaint counts alone.

## Data preparation and baseline definition

Start by defining a baseline complaint rate and baseline volume window (typically the prior 7–14 days of comparable traffic). Use the same time-of-day and campaign type to avoid seasonal artifacts. Practical sequence: collect per-message logs with fields for timestamp, campaign ID, list source tag, sending provider, recipient cohort (e.g., signup date bucket), and complaint flag.
Normalize volumes by converting counts to complaint rates per 1,000 sends for each cohort. Decision boundary: consider a cohort suspicious when its complaint rate is materially above the baseline plus an acceptable margin (for example, 2–3× the baseline or an absolute rise that explains ≥50% of the incremental complaints). Be explicit about uncertainty where provider thresholds are unknown.

## Stepped cohort isolation workflow

Perform cohort isolation in ordered steps so you cut the least amount of traffic necessary.
1) Provider-level: compare complaint rates across sending providers or IP pools. If a single provider shows most of the excess complaints, pause that provider’s traffic for affected campaigns. 2) Campaign-level: within a provider or overall, compare active campaigns. 3) List source / acquisition channel: compare complaint behavior for each list or acquisition tag (purchased list, webinar, checkout, re-engagement). 4) Recipient age cohort: compare cohorts by signup or last-open age buckets (e.g., 0–7 days, 8–30, 31–180, >180). 5) Creative/subject/offer: if still unresolved, split by creative variant. At each step, recompute how many incremental complaints are explained and stop when the minimal segment explains the bulk of the spike.

## Validating a candidate segment before suppression

Before broad suppression, validate the candidate segment with two reproducible checks: (A) sample-level verification — inspect raw messages and complaint content for telltale causes (irrelevant offer, misleading subject, rapid resend). (B) Temporal rerun — if volume allows, stop the candidate segment for a short hold window (24–72 hours) and watch whether aggregate complaints fall toward baseline. Evidence limits: some providers aggregate or delay complaint counts; use provider feedback documentation as directional only [1][2]. If validation is inconclusive, escalate to campaign owners and legal/compliance for manual review.

## Action, monitoring, and stop conditions

Actions should be minimal and reversible: suppress the identified segment (exclude tag in send pipeline), pause the campaign, and throttle provider traffic. Notify owners with the data slice, the fraction of incremental complaints explained, and the duration of suppression. Monitor complaint counts and deliverability signals for 24–72 hours. Stop conditions: restore sends when complaints return to baseline-plus-noise for at least two consecutive comparable windows; otherwise widen the suppression. Record the decision and criteria for audits and to inform list-quality processes.

## Decision boundary, evidence limits, and escalation rules

Decision boundary: prefer suppressing the smallest cohort that explains ≥50% of the incremental complaints and has a complaint rate at least 2× baseline, or meets any provider-specific escalations. Evidence limits: complaint counts are provider-reported and may lag or be sampled; inbox-placement and spam-folder rates are not directly visible from complaints. Escalate to deliverability lead when a suppressed segment represents >20% of daily volume, when provider reputation actions (blocks or throttles) are observed, or when complaints persist after two suppression cycles.

## Practical checklist

- [ ] Define baseline period and compute baseline complaint rate (7–14 days).
- [ ] Export per-message logs including campaign ID, list source tag, sending provider, signup date, and complaint flag.
- [ ] Compute cohort complaint rates per 1,000 sends and rank by excess above baseline.
- [ ] Isolate by provider → campaign → list source → signup-age → creative, stopping when a minimal cohort explains the majority of incremental complaints.
- [ ] Validate candidate segment with message sampling and a short hold test (24–72 hours) where possible.
- [ ] Suppress or pause only the identified cohort; notify owners and record the decision and metric thresholds.
- [ ] Monitor complaints and deliverability signals for two consecutive comparable windows before restoring sends.
- [ ] If a suppressed cohort is >20% of volume or complaints continue, escalate to deliverability lead and compliance.
- [ ] Log the incident, root cause hypotheses, and follow-up list hygiene actions (unsubscribe, preference center update, rework acquisition tags).

## Where RepMail fits

Use this guide as a step-by-step diagnostic and decision aid in your outbound incident workflows. It maps the observational steps, validation checks, and stop conditions that an operator or small deliverability team can follow and record during a complaint incident. Do not treat it as a product feature list or provider policy; adapt the thresholds and escalation rules to your program and any provider guidance you receive.

Continue with [Provider-Specific Deliverability Triage: Gmail, Microsoft, and More](/repmail/learn/deliverability/provider-specific-deliverability-triage) for the next step in the workflow.

## Related RepMail guides

- [Complaint Spike From a New Campaign: Compare Baseline, Audience, and Content](/repmail/learn/deliverability/new-campaign-complaint-spike-comparison)
- [Bounce Spike After a DNS Change: Prove Configuration Regression](/repmail/learn/deliverability/bounce-spike-after-dns-change)


## Sources

[1]: https://support.google.com/mail/answer/14289100?hl=en "Google sender or Workspace documentation"
[2]: https://support.microsoft.com/en-us/outlook/sender-support-in-outlook-com "Microsoft documentation"
