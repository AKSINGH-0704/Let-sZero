---
contentType: template
slug: "agency-client-deliverability-report"
title: "Client-Facing Deliverability Reporting for Agencies"
description: "A client-ready deliverability report template that separates provider signals, campaign metrics, scope, denominators, anomalies, and actions."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["agency-outreach", "deliverability", "reporting", "measurement"]
featured: false
collections: ["tool-reviews"]
learningPaths: ["getting-started"]
keyTakeaways:
  - "Label each metric with scope, period, denominator, and source."
  - "Separate provider-observed signals from campaign dashboard metrics."
  - "A missing signal is a limitation to report, not evidence of zero risk."
prerequisites:
  - label: "Understand sending observability"
    href: "/repmail/learn/email-platform/email-sending-observability"
commonMistakes:
  - "Presenting open rate as verified Gmail deliverability evidence."
  - "Comparing clients with different audiences, providers, or time windows."
  - "Reporting a percentage without saying what counted in the numerator and denominator."
faqs:
  - question: "Should a client report include open rate?"
    answer: "It may be included as a platform metric with its measurement limitations, but it should not be presented as verified provider placement or as a universal engagement truth."
  - question: "What belongs in the executive summary?"
    answer: "State the reporting period, scope, material signals, data gaps, actions taken, owner, and next review. Avoid a score that hides uncertainty."
nextStep:
  label: "Next: measure replies carefully"
  href: "/repmail/learn/outreach/cold-email-reply-rate-measurement"
  description: "Pair campaign outcomes with the scope and denominator."
assets:
  - type: checklist
    title: "Agency Client-Facing Deliverability Reporting for Agencies worksheet"
    content:
      - "Record the owner, scope, evidence link, status, and checked date for each control."
      - "Mark the item HOLD when required evidence is missing or a decision is uncertain."
      - "Attach the completed record to the client or incident review before proceeding."
---
A useful client deliverability report answers four questions: **what was measured, for which scope and period, what the evidence means, and what action follows**. Use this template rather than reducing deliverability to one percentage or an open-rate leaderboard.

## Report header

- Client and sending identities: `__________`
- Reporting period and time zone: `__________`
- Campaigns, providers, and recipient populations in scope: `__________`
- Data sources and refresh time: `__________`
- Missing or delayed sources: `__________`
- Report owner and client reviewer: `__________`

## Evidence table

| Signal | Value | Numerator / denominator | Source and scope | Interpretation / action |
| --- | --- | --- | --- | --- |
| Accepted or delivered events | ___ | ___ / ___ | Provider or platform, identity ___ | Transport evidence only |
| Hard/soft bounces | ___ | ___ / ___ | Event source, period ___ | Segment and error review |
| Complaints or opt-outs | ___ | ___ / ___ | Provider/client records | Suppression and incident review |
| Provider reputation signal | ___ | N/A or provider-defined | Provider, population ___ | Note delay and coverage |
| Replies | ___ | ___ / ___ | Campaign system | See reply definition |
| Opens/clicks | ___ | ___ / ___ | Tracking system | Label as measurement-limited |

Google’s sender guidance and Postmaster documentation should be checked at publication because provider requirements and dashboards can change. Do not call campaign events “Gmail placement” unless the source actually measures that concept. The [Postmaster guide](/repmail/learn/deliverability/google-postmaster-tools-guide) explains the limits of provider-observed data.

## Interpretation worksheet

**What changed?** `__________`  
**Which identity or client is affected?** `__________`  
**What evidence supports the conclusion?** `__________`  
**What is unknown or delayed?** `__________`  
**What action, owner, and due date follow?** `__________`  
**What would trigger a pause or incident review?** `__________`

Use the [sending observability](/repmail/learn/email-platform/email-sending-observability) article to design event coverage and the [reply-rate measurement guide](/repmail/learn/outreach/cold-email-reply-rate-measurement) to define campaign outcomes. A report is a decision record, not proof that a message reached an inbox.

## Report production procedure

The report owner should freeze the reporting period before extracting metrics. Record client, campaign, sender identity, provider or sending path, time zone, audience scope, attempted count, accepted count, bounce count, complaint count, opt-out count, reply definition, and source refresh times. The client reviewer owns the interpretation of business impact; the delivery analyst owns calculations; and the incident owner owns any pause or remediation decision. If a provider signal is missing, delayed, sampled, or identity-limited, label that limitation beside the metric rather than converting it to zero.

Build the report in four passes: (1) reconcile the denominator to the eligibility and event snapshots; (2) separate attempted, accepted, bounced, suppressed, and unknown outcomes; (3) segment anomalies by client, identity, provider, campaign, and day; and (4) write an action with owner, due date, and trigger. Keep the raw export or query reference, calculation version, and report timestamp. A report describes observed signals; it does not prove inbox placement, compliance, or future performance.

| Review field | Required value | Owner | Failure response |
| --- | --- | --- | --- |
| Scope and denominator | Campaign, identity, period, and count definition | Analyst | HOLD publication and reconcile |
| Event completeness | Source, refresh time, missing event classes | Delivery lead | Mark limitation; investigate pipeline |
| Anomaly threshold | Documented comparison or provider notice | Incident owner | Pause affected stream if trigger is met |
| Action register | Owner, due date, status, next review | Client reviewer | Escalate overdue action |

Use the [sending observability guide](/repmail/learn/email-platform/email-sending-observability) to define event identifiers and the [reply-rate measurement guide](/repmail/learn/outreach/cold-email-reply-rate-measurement) to document reply denominators. Do not compare two clients unless their scope, period, identity, provider, and definitions are materially comparable.

Stop or quarantine publication when the denominator cannot be reproduced, events from two clients are mixed, a report would expose another tenant, or an apparent spike has no verified source. Correct the report from the last known-good extract, mark the prior version superseded, and notify the client reviewer. For an operational spike, pause only the affected identity or campaign when evidence supports that boundary; preserve events and resume after the owner documents the cause, a clean test, and an updated report. Avoid asserting that the report demonstrates a guarantee.

## Sources

[1]: https://support.google.com/mail/answer/81126?hl=en "Google email sender guidelines"
