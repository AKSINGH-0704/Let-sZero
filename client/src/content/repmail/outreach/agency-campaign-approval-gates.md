---
contentType: guide
slug: "agency-campaign-approval-gates"
title: "Agency Campaign Approval Gates Before First Send"
description: "A stage-gate checklist for audience, suppression, authentication, copy, test rendering, ownership, and recorded campaign sign-off."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["agency-outreach", "campaign-approval", "qa", "operations"]
featured: false
collections: ["tool-reviews"]
learningPaths: ["getting-started"]
keyTakeaways:
  - "Each gate needs an observable result, owner, and timestamp."
  - "Approval is an operational control, not legal certification."
  - "A missing or stale artifact should produce HOLD, not a hopeful launch."
prerequisites:
  - label: "Review the sequence quality checklist"
    href: "/repmail/learn/cold-email/cold-email-sequence-quality-checklist"
commonMistakes:
  - "Recording “approved” without linking to the exact version reviewed."
  - "Using a successful seed send as evidence that the whole audience is safe."
  - "Letting an urgent edit bypass suppression and identity checks."
faqs:
  - question: "Who gives final approval?"
    answer: "The client-designated approver should own the business and audience decision; the agency delivery lead should own evidence that operational gates were run."
  - question: "Can approval be permanent?"
    answer: "No. Approval applies to a defined audience, message version, sender identity, and launch window. Material changes require a new review."
nextStep:
  label: "Next: run the pre-send deliverability checklist"
  href: "/repmail/learn/deliverability/pre-send-deliverability-checklist"
  description: "Use a final evidence pass before scheduling."
assets:
  - type: checklist
    title: "Agency Agency Campaign Approval Gates Before First Send worksheet"
    content:
      - "Record the owner, scope, evidence link, status, and checked date for each control."
      - "Mark the item HOLD when required evidence is missing or a decision is uncertain."
      - "Attach the completed record to the client or incident review before proceeding."
---
A campaign should be marked **GO** only when every required gate has a recorded owner, artifact, timestamp, and version. Use `HOLD` for missing evidence and `NO-GO` for a failed stop condition. Approval confirms readiness for the reviewed scope; it does not certify legality or guarantee placement.

## Stage-gate checklist

| Gate | Observable evidence | Owner | Result |
| --- | --- | --- | --- |
| Audience | ICP, geography, exclusions, and source recorded | Strategist | ☐ |
| Suppression | Client and required global suppressions matched | Data owner | ☐ |
| Identity | From, reply address, domain, postal address, and opt-out path checked | Delivery lead | ☐ |
| Authentication | SPF/DKIM/DMARC result and checked time attached | Infrastructure owner | ☐ |
| Copy | Exact sequence version, claims, links, and fallbacks approved | Client approver | ☐ |
| Rendering | Seed sends checked in the intended formats and devices | QA reviewer | ☐ |
| Test behavior | Reply, unsubscribe, bounce, and error paths exercised | Operations | ☐ |
| Launch | Schedule, owner, pause path, and monitoring window recorded | Delivery lead | ☐ |

Use the [sequence quality checklist](/repmail/learn/cold-email/cold-email-sequence-quality-checklist) for message-level review and the [compliance checklist](/repmail/learn/cold-email/cold-email-compliance-checklist) for the sender's separate review obligations.

## Decision rule

```text
Any required evidence missing? → HOLD and assign an owner.
Any suppression, identity, or factual error? → NO-GO; correct and rerun affected gates.
All gates pass for the exact version and scope? → GO with timestamp and rollback path.
```

Record the reviewed audience file hash or version, message version, sender identity, test recipients, evidence links, approver, and expiry. If the campaign changes after approval, route it through [change control](/repmail/learn/outreach/agency-campaign-change-control) rather than editing the approved artifact silently.


## Governance criteria for a real decision

Treat each gate as a decision about the reviewed scope, not as a ceremonial checklist. The client approver decides whether the audience, offer, claims, and timing are acceptable for the client; the agency delivery lead decides whether the evidence is complete enough to schedule; the data owner decides whether suppression and provenance checks are reproducible; the infrastructure owner decides whether sender identity and authentication evidence match the intended stream; and the operations owner decides whether replies, opt-outs, bounces, and pauses have a tested path. A gate is **PASS** only when its evidence answers the question for this campaign. “Looks normal,” an old screenshot, or a different audience is not a pass. Use **HOLD** when the evidence is absent or stale, **NO-GO** when a stop condition is observed, and **GO** only when the client decision and operational evidence agree.

## Approval record fields and stage owners

Use one approval record per launch window. At minimum, capture the client, campaign and sequence IDs; audience file name, version or hash, source date, geography, and exclusion rules; exact message and link versions; visible From address, reply mailbox, envelope identity if known, and authentication-check timestamp; suppression-list version and match result; seed recipients and rendering evidence; test message IDs; planned schedule, time zone, volume or batch boundary; approver names; delivery, data, infrastructure, QA, and operations owners; decision, rationale, timestamp, evidence URLs, expiry, and rollback action. The strategist owns audience definition, the data owner owns suppression evidence, the delivery lead owns gate coordination and launch controls, the client approver owns business acceptance, infrastructure owns DNS and authentication evidence, QA owns rendering and interaction tests, and operations owns monitoring and pause execution. One person may hold more than one role on a small team, but the record should still name each responsibility explicitly.

## Change-control boundary

Approval covers only the recorded audience, sender identity, content version, links, sending path, schedule, and launch window. A typo-only correction can be re-reviewed by the designated copy reviewer if the record says what changed and why; changing a claim, offer, destination, From or reply identity, suppression logic, audience segment, provider, volume plan, or authentication record is a material change. Material changes require a new diff, affected-gate review, and fresh approval before sending. Do not edit the approved file in place and retain the old approval as if it covered both versions. Link the superseded record and mark it replaced so an auditor can reconstruct which artifact was authorized.

## Failure, pause, and rollback conditions

Do not launch when a required owner is missing, the audience cannot be reproduced, a suppression match is unresolved, the visible identity or reply route is wrong, an authentication result is absent or inconsistent with the intended stream, a required link or opt-out path fails, or a test reveals an unexpected bounce, reply, or unsubscribe behavior. Pause the campaign if early monitoring shows a new identity, unintended audience, broken opt-out, misrouted replies, or a provider response that differs materially from the approved test. Roll back to the last approved audience, message, sender configuration, and schedule; disable the new batch; preserve message IDs and event evidence; and notify the client approver and delivery lead. A rollback restores the prior known state, but it does not erase messages already sent or remove the need to investigate them.

## Worked example

A client approves sequence `Q3-partners-v4` for 1,240 contacts, excluding 38 prior opt-outs. The data owner records the CSV hash, suppression-list version, and a zero-unresolved-match result. The infrastructure owner attaches a same-day authentication check for the approved From domain, while QA links desktop and mobile renders plus test message IDs. The client approver signs the exact copy and destination links; operations records a 50-message pilot, a two-hour observation window, the pause owner, and the prior approved sequence. During pilot review, replies route to an unmonitored alias. The result is **NO-GO**, not an exception: operations pauses the batch, the delivery lead records the incident, the owner fixes routing, and QA repeats the reply test. Because the reply identity changed after the original sign-off, the record receives a new version and client approval before the remaining contacts are scheduled.

## Operating the gate record

Run the gates in order, but allow a reviewer to reopen an earlier gate when a later test changes the facts. The delivery lead creates the record and assigns the **client approver**, **audience owner**, **suppression owner**, **infrastructure owner**, **QA reviewer**, and **pause operator**. Record campaign ID, client, audience version or hash, message version, sender identity, planned window, time zone, evidence URLs, decision, expiry, and next review date. The client approver owns the commercial decision; the agency owners attest only to the checks they performed. A contract or approval record is not legal advice and does not guarantee delivery or inbox placement.

Use this compact decision table during the launch meeting:

| Checkpoint | PASS evidence | HOLD or NO-GO condition | Decision owner |
| --- | --- | --- | --- |
| Audience and suppression | Reproducible snapshot and matching results | Unknown source, unresolved match, or stale snapshot | Data owner |
| Identity and content | Approved version, tested links, visible sender details | Changed claim, misleading identity, or broken opt-out | Client approver |
| Technical path | Current authentication and event-route evidence | Identity mismatch, failed authentication, or missing events | Infrastructure owner |
| Pilot and monitoring | Test IDs, reply/opt-out results, pause owner | Unexpected recipient, reply route, bounce, or error | Operations |

The decision procedure is: (1) compare each artifact to the approved version; (2) mark PASS, HOLD, or NO-GO; (3) resolve every HOLD with a named owner and due time; (4) run a small approved pilot only after required gates pass; and (5) record the launch timestamp and observation window. A material edit returns the record to the affected gates through [campaign change control](/repmail/learn/outreach/agency-campaign-change-control), while the final technical review can use the [pre-send deliverability checklist](/repmail/learn/deliverability/pre-send-deliverability-checklist).

Stop immediately if an opt-out fails, a suppressed record is eligible, a sender identity is wrong, a claim cannot be substantiated, or the pilot reveals cross-client data. Disable the new batch, preserve event IDs and the reviewed files, and roll back to the last approved audience, message, identity, and schedule. Resume only after the defect owner documents the fix, QA repeats the affected test, and the client approver signs the new version. A rollback cannot unsend prior messages, so the incident record must include the affected population and notifications.

## Sources

[1]: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business "FTC CAN-SPAM compliance guide"
[2]: https://support.google.com/mail/answer/81126?hl=en "Google email sender guidelines"
