---
contentType: guide
slug: "agency-cross-border-review-workflow"
title: "Agency Cross-Border Outreach Review Workflow"
description: "A jurisdiction-triage workflow for agency outreach that routes country, recipient type, purpose, consent or lawful basis, opt-out, and counsel review."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["agency-outreach", "cross-border", "compliance", "workflow"]
featured: false
collections: ["tool-reviews"]
learningPaths: ["getting-started"]
keyTakeaways:
  - "Route by country, recipient type, message purpose, and data role before launch."
  - "Document the proposed basis and opt-out path; do not infer a universal legal answer."
  - "Escalate uncertainty to qualified counsel or the responsible privacy reviewer."
prerequisites:
  - label: "Review CAN-SPAM and GDPR differences"
    href: "/repmail/learn/compliance/can-spam-vs-gdpr-cold-email"
commonMistakes:
  - "Treating “B2B” as a complete cross-border compliance analysis."
  - "Assuming one consent or opt-out mechanism covers every jurisdiction."
  - "Using a country label without recording recipient type and message purpose."
faqs:
  - question: "Can an agency use one global outreach rule?"
    answer: "A common strict operational baseline may simplify controls, but it does not replace jurisdiction-specific review. Document the rule and confirm it fits each audience."
  - question: "When should counsel review the campaign?"
    answer: "Escalate when country, recipient type, lawful basis or consent evidence, controller/processor roles, transfers, or opt-out obligations are uncertain or disputed."
nextStep:
  label: "Next: review legitimate-interest questions"
  href: "/repmail/learn/compliance/legitimate-interest-cold-email"
  description: "Use the framework only after jurisdiction and recipient type are known."
assets:
  - type: checklist
    title: "Agency Agency Cross-Border Outreach Review Workflow worksheet"
    content:
      - "Record the owner, scope, evidence link, status, and checked date for each control."
      - "Mark the item HOLD when required evidence is missing or a decision is uncertain."
      - "Attach the completed record to the client or incident review before proceeding."
---
Before a cross-border campaign is approved, route each audience through a jurisdiction review that records **where the recipient is, who the recipient is, why the message is being sent, what data role applies, what permission or lawful-basis analysis is proposed, and how opting out works**. This is a triage workflow, not a universal legal answer.

## Jurisdiction triage

| Step | Question | Outcome |
| --- | --- | --- |
| 1. Location | What country or region is the recipient in, and how was that inferred? | Country and confidence recorded |
| 2. Recipient type | Corporate subscriber, individual, sole trader, employee, or unknown? | Segment or hold |
| 3. Purpose | Direct marketing, service communication, research, or another purpose? | Purpose recorded |
| 4. Sender roles | Who decides purpose and means; who processes data? | Contract/privacy roles mapped |
| 5. Permission basis | Consent, legitimate interest, existing relationship, or another proposed basis? | Evidence and reviewer attached |
| 6. Message controls | Identity, postal/contact details, opt-out route, suppression timing | Test evidence attached |
| 7. Escalation | Is any premise uncertain, high-risk, or disputed? | Counsel/privacy review before send |

Use the [CAN-SPAM versus GDPR comparison](/repmail/learn/compliance/can-spam-vs-gdpr-cold-email) and [legitimate-interest guide](/repmail/learn/compliance/legitimate-interest-cold-email) as background, not as a substitute for advice. The ICO’s PECR and B2B marketing guidance should be rechecked at publication because regulator guidance can change.

## Routing rules

- **Known country and recipient type, documented basis, tested opt-out:** route to normal approval with the evidence attached.
- **Country known but recipient type or basis unclear:** hold the affected segment and request clarification.
- **Mixed list with uncertain geography:** split or suppress the uncertain rows; do not apply the least restrictive rule to everyone.
- **New jurisdiction, sensitive context, or role ambiguity:** escalate before copy approval.

Keep the country source, checked date, message purpose, suppression version, reviewer, and decision. A client’s assertion that “these are all business emails” is useful input but not a complete review.

## Related internal resources

- [Cold email compliance checklist](/repmail/learn/cold-email/cold-email-compliance-checklist)

## Make the routing decision reproducible

The campaign owner opens one review record per audience segment. Capture recipient country or region and confidence, recipient type, source and date, message purpose, client and agency roles, data categories, proposed basis or permission analysis, identity and opt-out controls, transfer destinations, reviewer, counsel escalation, decision, expiry, and evidence links. The client privacy owner decides whether the proposed use is acceptable; the agency data owner verifies the segment and controls; the delivery lead prevents unreviewed rows from entering the send; and qualified counsel handles uncertain legal interpretation. “B2B” is an input, not a complete answer.

Run the workflow in order: (1) split mixed geography and unknown recipient types; (2) classify purpose as marketing, service, research, or another documented purpose; (3) map controller/processor or equivalent roles; (4) document the proposed basis and evidence without treating it as universally valid; (5) test identity and opt-out behavior; (6) check relevant transfer and vendor questions; and (7) route normal, hold, or counsel outcomes. The [cold email compliance checklist](/repmail/learn/cold-email/cold-email-compliance-checklist) and [legitimate-interest guide](/repmail/learn/compliance/legitimate-interest-cold-email) are background resources.

| Review result | Action | Owner |
| --- | --- | --- |
| Country, recipient type, purpose, controls, and basis are documented | Continue normal approval | Privacy owner |
| Country known but recipient type or basis is unclear | Hold affected segment | Campaign owner |
| Mixed or low-confidence geography | Split, suppress, or obtain better evidence | Data owner |
| New jurisdiction, sensitive context, role or transfer dispute | Counsel/privacy review | Client privacy owner |

Stop the affected segment when a country is unknown, a recipient disputes the use, opt-out behavior is untested, the client and agency disagree on roles, or a transfer premise is unresolved. Do not solve uncertainty by applying the least restrictive rule to everyone. Roll back by removing unreviewed rows from the eligibility snapshot, restoring the last reviewed segment, preserving the rationale and source data, and notifying the client. Resume only after the reviewer records the new scope, evidence, decision, and review date. This workflow does not guarantee compliance in any jurisdiction and should be refreshed when law, guidance, vendor terms, or audience facts change.

## Sources

[1]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/ "ICO electronic mail marketing guidance"
[2]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/business-to-business-marketing/ "ICO business-to-business marketing guidance"
[3]: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business "FTC CAN-SPAM compliance guide"
