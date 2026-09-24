---
contentType: guide
slug: "agency-sending-capacity-planning"
title: "Per-Client Sending Capacity Allocation and Escalation"
description: "A per-client capacity worksheet using observed provider constraints, reserves, attribution, pause triggers, and escalation paths."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["agency-outreach", "capacity-planning", "sending-operations", "observability"]
featured: false
collections: ["tool-reviews"]
learningPaths: ["getting-started"]
keyTakeaways:
  - "Plan from observed constraints and provider feedback, not a universal mailbox quota."
  - "Keep reserve capacity and attribute sends by client, identity, and stream."
  - "Define pause and escalation triggers before capacity is exhausted."
prerequisites:
  - label: "Review shared and dedicated IP tradeoffs"
    href: "/repmail/learn/infrastructure/shared-vs-dedicated-ip"
commonMistakes:
  - "Dividing a provider limit evenly without considering identity or recipient mix."
  - "Counting scheduled sends instead of accepted or attempted volume."
  - "Using reserve capacity to mask a complaint or authentication incident."
faqs:
  - question: "How many mailboxes should an agency allocate per client?"
    answer: "There is no universal safe number. Use provider guidance, account configuration, client scope, observed events, and a controlled operating policy."
  - question: "What is reserve capacity for?"
    answer: "Reserve capacity supports planned changes and operational continuity. It should not be used to evade a provider signal or move a problematic stream without investigating it."
nextStep:
  label: "Next: review sending observability"
  href: "/repmail/learn/email-platform/email-sending-observability"
  description: "Make allocation decisions from attributable events."
assets:
  - type: checklist
    title: "Agency Per-Client Sending Capacity Allocation and Escalation worksheet"
    content:
      - "Record the owner, scope, evidence link, status, and checked date for each control."
      - "Mark the item HOLD when required evidence is missing or a decision is uncertain."
      - "Attach the completed record to the client or incident review before proceeding."
---
Capacity planning is an allocation and escalation exercise, not a promise of a fixed send quota. Record the provider constraints, sender identity, client attribution, observed demand, reserve, and stop conditions before assigning capacity.

## Capacity ledger

| Client / stream | Identity | Planned attempts | Observed constraint | Reserved share | Owner |
| --- | --- | ---: | --- | ---: | --- |
| `__________` | `__________` | `__________` | Provider/account feedback | `__________` | `__________` |
| `__________` | `__________` | `__________` | Error or complaint signal | `__________` | `__________` |

Calculate planned demand from the actual schedule and recipient eligibility snapshot. Keep **attempted**, **accepted**, **bounced**, and **suppressed** counts separate. A campaign can look under capacity while producing a high error or complaint signal.

## Allocation sequence

1. Inventory identities, providers, account limits, mailbox status, and client contracts.
2. Estimate demand by client and period, including follow-ups and retries.
3. Deduct known exclusions and preserve a reserve for approved operations.
4. Allocate only within the provider’s current documented and observed constraints.
5. Attach every send to client, campaign, identity, and audience version.
6. Review feedback by identity and client before increasing allocation.

Google’s sender guidance is provider-specific and can change, so recheck it at publication and when an account receives a notice. Use [pre-send checks](/repmail/learn/deliverability/pre-send-deliverability-checklist) and [observability guidance](/repmail/learn/email-platform/email-sending-observability) alongside the ledger.

## Escalation rules

Pause a stream when authentication is failing, the audience or suppression snapshot is missing, provider feedback implicates the identity, or the client requests a stop. Escalate when demand exceeds available attributable capacity, reserve is consumed, the same error repeats, or one client’s activity could affect another tenant. Do not shift volume to a new identity as a substitute for root-cause review.

## Capacity decision procedure

The capacity owner prepares one ledger per client and sending identity. Required fields are provider and account, identity, client and campaign, period and time zone, planned attempts, retries, accepted and rejected counts, suppression count, observed constraint, current provider notice, reserve, pause threshold, escalation owner, and review date. The delivery lead approves allocation; the infrastructure owner confirms the account and identity boundary; the data owner confirms eligible volume; and the incident owner decides whether feedback requires a pause. Do not turn an observed limit into a universal quota or promise.

Run the calculation in order: (1) freeze the audience snapshot and schedule; (2) estimate first sends and follow-ups separately; (3) subtract suppressions and known exclusions; (4) compare attempted demand with current documented and observed constraints; (5) reserve capacity for approved retries or operational changes; and (6) allocate by client, identity, and stream so events remain attributable. Reconcile [sending observability](/repmail/learn/email-platform/email-sending-observability) with [pre-send checks](/repmail/learn/deliverability/pre-send-deliverability-checklist) before an increase.

| Signal | Decision | Owner | Evidence |
| --- | --- | --- | --- |
| Demand below approved capacity and no adverse signal | Pilot or schedule within reserve | Delivery lead | Ledger and eligibility snapshot |
| Reserve consumed or repeated provider rejection | HOLD increase; escalate | Capacity owner | Event IDs and provider notice |
| Authentication failure, complaint signal, or identity block | Pause affected stream | Incident owner | Incident record and raw events |
| One tenant could affect another | Freeze shared allocation | Agency lead | Boundary and containment review |

Stop allocation when the eligible count is unknown, event attribution is missing, authentication fails, provider feedback is unresolved, reserve is exhausted, or a client requests a stop. Never move volume to a fresh identity to evade a signal. Roll back by cancelling the incremental schedule, restoring the last approved allocation, preserving the ledger and provider evidence, and notifying affected owners. Resume only after root-cause review, a new capacity calculation, a controlled test, and explicit approval. A reserve supports continuity; it is not a bypass for policy, suppression, or complaint controls.

## Sources

[1]: https://support.google.com/mail/answer/81126?hl=en "Google email sender guidelines"
