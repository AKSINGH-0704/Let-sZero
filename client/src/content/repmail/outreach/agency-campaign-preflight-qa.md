---
contentType: guide
slug: "agency-campaign-preflight-qa"
title: "Agency Preflight QA for Client Campaign Assets"
description: "An observable preflight checklist for links, personalization fallbacks, headers, unsubscribe behavior, rendering, and test recipients."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["agency-outreach", "campaign-qa", "preflight", "cold-email"]
featured: false
collections: ["tool-reviews"]
learningPaths: ["getting-started"]
keyTakeaways:
  - "Every QA check needs a test input, expected result, owner, and stop condition."
  - "Test populated, blank, malformed, and opted-out data paths."
  - "QA reduces avoidable errors; it does not prove delivery or placement."
prerequisites:
  - label: "Review sequence quality checks"
    href: "/repmail/learn/cold-email/cold-email-sequence-quality-checklist"
commonMistakes:
  - "Testing only a happy-path row with complete personalization."
  - "Clicking an unsubscribe link without verifying suppression downstream."
  - "Approving a render while ignoring headers, links, or the reply route."
faqs:
  - question: "What should be in a preflight test set?"
    answer: "Use at least a normal row, blank optional fields, unusual characters, a fallback case, an excluded contact, and controlled recipients for reply and opt-out tests."
  - question: "Does passing preflight prove the campaign is safe?"
    answer: "No. It shows that the tested assets behaved as expected. Audience provenance, provider policy, and recipient reaction still require separate controls."
nextStep:
  label: "Next: review plain-text and HTML choices"
  href: "/repmail/learn/deliverability/plain-text-vs-html-email"
  description: "Choose a format after checking the actual message."
assets:
  - type: checklist
    title: "Agency Agency Preflight QA for Client Campaign Assets worksheet"
    content:
      - "Record the owner, scope, evidence link, status, and checked date for each control."
      - "Mark the item HOLD when required evidence is missing or a decision is uncertain."
      - "Attach the completed record to the client or incident review before proceeding."
---
A campaign passes preflight only when the tested message, data, headers, links, and recipient actions match the expected result for the approved version. Record the input row, expected output, observed output, reviewer, and stop condition for every check.

## Preflight checklist

| Check | Test input | Expected result | Owner |
| --- | --- | --- | --- |
| Sender identity | From, reply-to, display name | Recognizable and approved | Copy owner |
| Personalization | Normal, blank, long, and unusual values | Natural output or safe fallback | Data owner |
| Links | Every link and redirect | Correct destination, no broken or staging URLs | QA |
| Headers | Rendered message headers | Required identity and opt-out behavior present as designed | Delivery lead |
| Unsubscribe | Controlled test recipient | Clear action, confirmation, and downstream suppression | Operations |
| Reply path | Test reply | Reaches monitored owner with expected threading | Account manager |
| Rendering | Plain text and intended clients | Readable, no clipped or hidden critical content | QA |
| Exclusions | Suppressed and out-of-scope rows | Not eligible for send | Data owner |
| Error handling | Missing mailbox, invalid link, failed merge | Hold or fail safely | Delivery lead |

The [sequence checklist](/repmail/learn/cold-email/cold-email-sequence-quality-checklist) covers message structure. Review [plain text versus HTML](/repmail/learn/deliverability/plain-text-vs-html-email) for format decisions and [unsubscribe requirements](/repmail/learn/compliance/cold-email-unsubscribe-requirements) for the separate compliance review.

## Stop conditions

Stop the launch when a merge exposes the wrong person or company, a link points to staging, the sender identity is misleading, a suppression test still sends, a required fallback is empty, or the test recipient cannot unsubscribe or reply as designed. Log the failure instead of editing the evidence to make the row pass.

## QA record

- Campaign and version: `__________`
- Audience and suppression snapshot: `__________`
- Test recipients and data classes: `__________`
- Evidence links/screenshots: `__________`
- Reviewer and timestamp: `__________`
- Defects, owner, retest result: `__________`

A passed preflight is a controlled observation, not a delivery guarantee.

## Execute and record preflight

The QA owner creates a test set containing a normal row, blank optional values, long or unusual characters, a fallback case, an excluded or suppressed row, an invalid link, and controlled recipients for reply and opt-out. Record campaign and message version, audience and suppression snapshot, test data class, expected output, observed output, message IDs, headers, screenshots, reviewer, timestamp, defect owner, retest result, and launch decision. The data owner owns merge inputs and exclusions; the delivery lead owns identity and headers; QA owns renders and links; operations owns reply and opt-out behavior.

Use this sequence: (1) generate from the immutable approved version; (2) inspect rendered HTML and plain text; (3) click every destination in a controlled environment; (4) verify sender, reply path, headers, and visible identity; (5) exercise unsubscribe and confirm downstream suppression; (6) verify excluded rows cannot enter the send; and (7) attach evidence before approval. See the [sequence quality checklist](/repmail/learn/cold-email/cold-email-sequence-quality-checklist) and [unsubscribe requirements](/repmail/learn/compliance/cold-email-unsubscribe-requirements).

| Test result | Decision | Required owner |
| --- | --- | --- |
| Expected output matches for all required cases | PASS and hand to approval | QA reviewer |
| Noncritical defect with uncertain scope | HOLD and isolate affected path | Delivery lead |
| Wrong person, staging URL, broken opt-out, or unsafe fallback | NO-GO; fix and rerun | Defect owner |
| Unexpected send to excluded row or wrong sender | Pause immediately; preserve evidence | Operations |

Stop the launch when a merge reveals another person’s data, a required value is blank, a redirect is unapproved, a reply is unmonitored, an opt-out does not suppress, or a header differs from the approved identity. Roll back by disabling the new version and restoring the last approved artifact and schedule; preserve the failed test and any sent message IDs. Do not “pass” by deleting a failing row from the evidence. Resume only after the defect is fixed, the affected test set is rerun, the owner signs the result, and approval is refreshed. Passing preflight does not guarantee delivery, placement, or compliance.

## Sources

[1]: https://support.google.com/mail/answer/81126?hl=en "Google email sender guidelines"
[2]: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business "FTC CAN-SPAM compliance guide"
