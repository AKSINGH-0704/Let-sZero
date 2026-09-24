---
contentType: guide
slug: "agency-campaign-change-control"
title: "Agency Change-Control Process for Client Campaign Edits"
description: "An agency SOP for approving client campaign edits, emergency pauses, versioning, suppression review, and rollback."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["agency-outreach", "change-control", "campaign-operations", "governance"]
featured: false
collections: ["tool-reviews"]
learningPaths: ["getting-started"]
keyTakeaways:
  - "Classify edits by risk and approval path before changing the live version."
  - "Emergency pauses can be fast; resumption still needs evidence."
  - "Record versions, affected audience, reviewer, and rollback location."
prerequisites:
  - label: "Review campaign approval gates"
    href: "/repmail/learn/outreach/agency-campaign-approval-gates"
commonMistakes:
  - "Changing audience or suppression logic under a copy-only ticket."
  - "Treating a client chat message as a complete approval record."
  - "Failing to preserve the prior version before a material edit."
faqs:
  - question: "Which changes require client approval?"
    answer: "At minimum, changes to audience, offer, claims, sender identity, CTA, opt-out behavior, and schedule scope. Define lower-risk agency-owned edits in the contract or SOP."
  - question: "Can every change wait for approval?"
    answer: "No. An emergency pause should be available to protect recipients or infrastructure. Document the reason, notify the client, and require review before resuming."
nextStep:
  label: "Next: review what to test first"
  href: "/repmail/learn/cold-email/what-to-ab-test-first"
  description: "Limit experiments to a defined hypothesis and approval scope."
assets:
  - type: checklist
    title: "Agency Agency Change-Control Process for Client Campaign Edits worksheet"
    content:
      - "Record the owner, scope, evidence link, status, and checked date for each control."
      - "Mark the item HOLD when required evidence is missing or a decision is uncertain."
      - "Attach the completed record to the client or incident review before proceeding."
---
Use change control to keep an approved campaign reproducible. A request is not complete until the team records the proposed change, risk, affected scope, approver, version, test evidence, and rollback path. Emergency pauses may bypass pre-approval; they should not bypass documentation.

## Classify the request

| Class | Examples | Route |
| --- | --- | --- |
| Low risk | Typo correction in an inactive draft; internal label | Agency reviewer; record version |
| Review required | Subject, CTA, link, personalization fallback, cadence | Client approver plus test |
| Material | Audience, offer, sender identity, claims, suppression, opt-out | Client approval and affected preflight gates |
| Emergency | Complaint spike, factual error, wrong audience, provider warning | Pause immediately; notify and investigate |

Use the [AI-generated email review](/repmail/learn/cold-email/ai-generated-cold-email-review) guide for content changes and [authentication change management](/repmail/learn/deliverability/email-authentication-change-management) for DNS or identity changes.

## Change-request template

- Request ID and requester: `__________`
- Date, client, campaign, and current version: `__________`
- Proposed change and reason: `__________`
- Audience, sender, suppression, and schedule impact: `__________`
- Risk class: `low / review / material / emergency`
- Client approver and agency reviewer: `__________`
- Test data and render evidence: `__________`
- Rollback version and pause owner: `__________`
- Decision and timestamp: `approved / held / rejected / paused`

Before a material change goes live, rerun only the affected gates plus any dependent checks. For example, a new audience requires suppression and data review even if the copy is unchanged; a new sender identity requires authentication and rendering checks. Store the old version as read-only and link the live version to the ticket.

## Execute a controlled change

The change owner opens one record before editing a live or scheduled campaign. Required fields are request ID, client, campaign and current version, requester, reason, exact diff, risk class, affected audience and sender identity, suppression impact, test data, client approver, agency reviewer, planned window, pause owner, rollback version, and decision timestamp. The delivery lead checks that the request is complete; the client approver accepts commercial and audience impact; the data owner checks eligibility; infrastructure checks identity changes; and QA records test evidence. A chat message can be an input, but it is not a complete approval record until these fields are captured.

Follow this procedure: (1) snapshot the current version as read-only; (2) classify the change; (3) list dependent gates; (4) create a diff and test set; (5) obtain the required approval; (6) publish a new version without overwriting history; and (7) record the observation window and rollback location. A copy edit may still be material if it changes a claim, offer, link, identity, audience interpretation, or opt-out behavior. Use [campaign approval gates](/repmail/learn/outreach/agency-campaign-approval-gates) and [AI-generated email review](/repmail/learn/cold-email/ai-generated-cold-email-review) for dependent review.

| Change signal | Minimum approval | Stop condition |
| --- | --- | --- |
| Label or inactive-draft typo | Agency reviewer | Unclear whether a live artifact is affected |
| Subject, CTA, cadence, or fallback | Client approver plus QA | Test differs from approved expectation |
| Audience, suppression, identity, claim, or opt-out | Client approver plus affected gate owners | Any unresolved eligibility or identity defect |
| Wrong audience, complaint spike, or provider warning | Pause operator immediately; notify client | Resumption requested without evidence |

Stop editing when the current live version cannot be identified, the requester cannot establish authority, the affected audience is unknown, a suppression result is stale, or the rollback artifact is missing. For an emergency, pause the smallest defensible scope, preserve messages and event IDs, and notify the client. Roll back by disabling the new version and restoring the prior approved version and schedule; do not delete the evidence or assume rollback repairs messages already sent. Resume only after retest, approval, and a documented incident disposition.

## Sources

[1]: https://support.google.com/mail/answer/81126?hl=en "Google email sender guidelines"
[2]: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business "FTC CAN-SPAM compliance guide"
