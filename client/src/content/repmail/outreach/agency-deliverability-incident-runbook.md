---
contentType: knowledge-base
slug: "agency-deliverability-incident-runbook"
title: "Per-Client Deliverability Incident Runbook for Agencies"
description: "A provider-aware incident runbook for containing complaints, bounces, blocks, and placement alerts while preserving evidence and restart criteria."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["agency-outreach", "deliverability", "incident-response", "diagnostics"]
featured: false
collections: ["tool-reviews"]
learningPaths: ["getting-started"]
keyTakeaways:
  - "Name the provider, denominator, sender identity, and time window before diagnosing."
  - "Contain the affected stream and preserve the incident record."
  - "Restart from a hypothesis with explicit pause criteria, not an arbitrary universal threshold."
prerequisites:
  - label: "Use provider-specific triage"
    href: "/repmail/learn/deliverability/provider-specific-deliverability-triage"
commonMistakes:
  - "Treating a dashboard label as a universal provider fact."
  - "Deleting complaint or bounce evidence during cleanup."
  - "Expanding the send before the suspected cause and restart test are documented."
faqs:
  - question: "Should every client campaign be paused?"
    answer: "Pause the affected sender, audience, or stream first. Broaden the pause only when the evidence implicates shared infrastructure or the provider requires it."
  - question: "Is there one complaint threshold for every provider?"
    answer: "No. Provider signals, populations, denominators, and reporting delays differ. Use the provider’s current guidance and your own evidence; do not invent a universal threshold."
nextStep:
  label: "Next: review the sender recovery plan"
  href: "/repmail/learn/deliverability/sender-reputation-recovery-plan"
  description: "Escalate when containment does not resolve the signal."
assets:
  - type: checklist
    title: "Agency Per-Client Deliverability Incident Runbook for Agencies worksheet"
    content:
      - "Record the owner, scope, evidence link, status, and checked date for each control."
      - "Mark the item HOLD when required evidence is missing or a decision is uncertain."
      - "Attach the completed record to the client or incident review before proceeding."
---
When a client campaign shows a complaint, bounce, block, or placement alert, first identify the affected stream and contain it. Do not diagnose from a single unlabeled percentage. Record provider, data source, denominator, sender identity, audience, campaign version, and observation time before deciding what to change.

## Incident runbook

**1. Declare and contain.** Pause the affected campaign, segment, sender, or retry path. Preserve the queue state and do not retry explicit opt-outs or complaints. Keep unrelated operational mail running only if the evidence separates it.

**2. Capture evidence.** Save provider notices, event IDs, SMTP responses, authentication results, campaign and list versions, recent changes, and the operator’s timeline. Google notes that Postmaster data is delayed and may be unavailable at low volume; label it accordingly rather than treating absence as a clean signal.

**3. Test five hypotheses.** Review audience expectation and provenance; list freshness and validation; cadence and follow-up logic; sender identity, links, and claims; and authentication, DNS, transport, and provider response. Compare the affected stream with a known-good stream only when identities and denominators are actually comparable.

**4. Notify the client.** State what is known, what is not known, what was paused, what data is being preserved, and what decision is needed. Avoid saying “Gmail is blocking us” when the only evidence is a campaign dashboard.

**5. Set a restart gate.** Write one causal hypothesis, one corrective action, the smallest test scope, an observation window, and a pause condition. If the test fails or evidence remains ambiguous, stop expansion and escalate to the [sender reputation recovery plan](/repmail/learn/deliverability/sender-reputation-recovery-plan).

## Incident record

| Field | Example format |
| --- | --- |
| Incident ID and owner | `INC-2026-09-25`, named lead |
| Signal | Provider notice, complaint, 4xx/5xx, bounce, or placement observation |
| Scope | Client, domain, mailbox, campaign, list, and time zone |
| Evidence | Event IDs, headers, exports, screenshots, and source URLs |
| Containment | Pause, suppression, credential or DNS action |
| Hypothesis | One sentence connecting change to signal |
| Restart gate | Test scope, monitor, and pause criteria |

Read the [spam complaint response guide](/repmail/learn/deliverability/spam-complaint-spike-response) for a narrower complaint workflow. No runbook proves inbox placement or promises a recovery time.

## Sources

[1]: https://support.google.com/mail/answer/81126?hl=en "Google email sender guidelines"
[2]: https://docs.aws.amazon.com/ses/latest/dg/using-configuration-sets.html "Amazon SES configuration sets and event publishing"
