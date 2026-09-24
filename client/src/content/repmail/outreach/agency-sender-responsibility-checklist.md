---
contentType: guide
slug: "agency-sender-responsibility-checklist"
title: "Agency Sender Responsibility and Client Contract Checklist"
description: "A plain-language agency-client checklist for sender identity, approvals, suppression, monitoring, incident cooperation, and records."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["agency-outreach", "compliance", "responsibility", "governance"]
featured: false
collections: ["tool-reviews"]
learningPaths: ["getting-started"]
keyTakeaways:
  - "A client contract allocates work; it does not automatically erase the sender’s obligations."
  - "Put identity, suppression, approvals, monitoring, and incident cooperation in writing."
  - "Rules vary by jurisdiction; this is an operational checklist, not legal advice."
prerequisites:
  - label: "Compare CAN-SPAM and GDPR concepts"
    href: "/repmail/learn/compliance/can-spam-vs-gdpr-cold-email"
commonMistakes:
  - "Writing “the agency is responsible for compliance” without naming concrete controls."
  - "Assuming the client’s list is approved because the client supplied it."
  - "Failing to specify who can pause a campaign during an incident."
faqs:
  - question: "Can a client contract transfer all compliance responsibility to the agency?"
    answer: "A contract can allocate tasks and cooperation, but it does not automatically eliminate obligations or accountability under applicable law. Obtain appropriate legal advice."
  - question: "Who should own suppression?"
    answer: "Assign a technical operator, a client decision owner, and a verification path. The contract should state how opt-outs and complaints flow across every relevant system."
nextStep:
  label: "Next: review the compliance checklist"
  href: "/repmail/learn/cold-email/cold-email-compliance-checklist"
  description: "Use it to convert responsibilities into evidence."
assets:
  - type: checklist
    title: "Agency Agency Sender Responsibility and Client Contract Checklist worksheet"
    content:
      - "Record the owner, scope, evidence link, status, and checked date for each control."
      - "Mark the item HOLD when required evidence is missing or a decision is uncertain."
      - "Attach the completed record to the client or incident review before proceeding."
---
An agency-client agreement should assign concrete sender controls rather than use a vague “compliance responsibility” clause. The FTC states that hiring another company to handle email does not automatically remove the sender’s responsibility.[1] Use this checklist to clarify work and escalation; it is not legal advice and rules vary by jurisdiction.

## Responsibility matrix

| Control | Agency does | Client does | Evidence |
| --- | --- | --- | --- |
| Sender identity and contact details | Configure and test | Supply accurate approved identity | Approved sender record |
| Audience and source | Validate process and flag gaps | Confirm purpose, source, and scope | Source/provenance record |
| Suppression | Enforce technical exclusion and escalate failures | Supply opt-outs, complaints, and exclusions | Suppression event and test |
| Copy and claims | Draft, review, and version | Approve offer, claims, and audience relevance | Versioned approval |
| Monitoring | Capture events and notify | Provide business context and decisions | Review report/incident log |
| Incident response | Pause, preserve evidence, propose remediation | Decide business scope and cooperate | Timeline and restart gate |
| Records | Maintain agreed operational evidence | Confirm retention and access policy | Retention decision |

The [CAN-SPAM versus GDPR guide](/repmail/learn/compliance/can-spam-vs-gdpr-cold-email) supplies context; the [recordkeeping guide](/repmail/learn/compliance/cold-email-compliance-recordkeeping) turns it into evidence. Recheck cited laws and provider rules at publication because requirements and guidance can change.

## Contract questions

- Who is the sender of record and who supplies the postal address?
- Who approves the audience, source, exclusions, claims, and exact message version?
- How are opt-outs, complaints, and corrections shared, and how quickly is sending stopped?
- Who may change DNS, sender identity, mailbox access, suppression, or schedule?
- Who can pause a campaign without waiting for approval, and who must be notified?
- Which records are exported, retained, restricted, or deleted at exit?
- Which jurisdictions or recipient types require counsel escalation?

A signed matrix does not make an unlawful practice safe. It makes the control boundary visible so the parties can correct gaps before sending.

## Turn the matrix into a working control

At onboarding, the agency delivery lead and client owner should complete one responsibility record with sender of record, promoted product, audience source, purpose, jurisdictions, sender identity, postal address, suppression owner, approval roles, monitoring source, pause authority, incident contacts, records, retention decision, and escalation deadlines. The agency may perform configuration, testing, monitoring, and pause actions; the client must supply accurate business facts, approve audience and claims, and cooperate with corrections. A contract allocates tasks but does not automatically remove obligations or make an unlawful practice safe.

Use this decision procedure: (1) identify the control and accountable owner; (2) name the operator and verifier separately where practical; (3) attach the evidence artifact and review date; (4) test the pause, opt-out, correction, and incident paths; (5) escalate jurisdiction, recipient-type, basis, or role uncertainty; and (6) obtain both parties’ approval for material scope. The [CAN-SPAM versus GDPR guide](/repmail/learn/compliance/can-spam-vs-gdpr-cold-email) and [recordkeeping guide](/repmail/learn/compliance/cold-email-compliance-recordkeeping) provide context but do not replace counsel.

| Control | Accountable decision | Operating evidence | Stop condition |
| --- | --- | --- | --- |
| Audience and source | Client owner | Provenance, scope, exclusions | Source or purpose unknown |
| Identity and copy | Client approver | Versioned message and sender record | Claim or identity disputed |
| Suppression and opt-out | Agency operator plus client contact | Event, test, and reconciliation | Failed or delayed exclusion |
| Monitoring and incident | Named pause operator | Event report and timeline | No reachable operator |
| Exit and records | Contract/privacy owner | Export, retention, deletion decision | Destination or authority unknown |

Stop sending if either party withdraws approval, the sender identity is inaccurate, an opt-out fails, the client cannot substantiate the audience or claim, or a required owner is unreachable. Pause the smallest affected scope, preserve evidence, notify the client, and roll back to the last approved audience, message, and identity. Do not erase disputed records before the privacy owner decides what evidence and suppression signal must remain. Resume only after the responsible owners document correction, retest, and approval. Recheck legal and provider guidance at publication; this checklist is operational, not a jurisdiction-specific legal conclusion.

## Sources

[1]: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business "FTC CAN-SPAM compliance guide"
[2]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/business-to-business-marketing/ "ICO business-to-business marketing guidance"
