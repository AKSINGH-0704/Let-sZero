---
product: repmail
academy: compliance
contentType: guide
slug: cold-email-compliance-agencies
title: Cold Email Compliance for Agencies Sending for Clients
description: "A responsibility matrix and intake workflow for agencies that send cold\
  \ email on a client\u2019s behalf, with evidence and suppression ownership made\
  \ explicit."
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- compliance
- agencies
- cold-email
- governance
learningPaths: ["getting-started"]
assets:
- type: table
  title: Agency outreach responsibility matrix
  content:
    headers:
    - Control
    - Client owner
    - Agency owner
    - Evidence
    rows:
    - - Audience and purpose
      - Approve purpose and audience
      - Check against brief
      - Approved brief and segment
    - - Sender identity and content
      - Approve claims and identity
      - Implement and QA
      - Final message and approval
    - - Opt-out and suppression
      - Define scope
      - Apply and test suppression
      - Event and suppression log
    - - Incident response
      - Decide legal escalation
      - Stop queues and preserve evidence
      - Timeline and handoff
keyTakeaways:
- Separate statutory responsibility from contractual task allocation before launch.
- Assign identity, audience, approval, suppression, incident, and evidence owners
  in writing.
- Use a client intake gate that blocks sending when a source, notice, or opt-out control
  is unclear.
faqs:
- question: Can an agency contract away compliance responsibility?
  answer: No. A contract can allocate work, approval, and indemnity, but it does not
    automatically remove statutory duties. Identify the parties and obtain jurisdiction-specific
    advice for the live program.
- question: Who should own the suppression list?
  answer: Name one operational owner and one accountable client owner. The system
    of record must be clear, and every sending tool must receive updates before another
    campaign is approved.
- question: What should an agency collect before sending?
  answer: Collect the client identity, purpose, audience source, applicable jurisdictions,
    message approval, notice path, opt-out scope, retention policy, and escalation
    contacts.
nextStep:
  label: Review the underlying opt-out workflow
  href: /repmail/learn/compliance/cold-email-unsubscribe-requirements
  description: Turn responsibility into tested suppression controls.
collections:
- compliance-operations
---

**Agencies sending cold email for clients should use a written responsibility matrix before they import a single contact.** The client brief, sending contract, and tool permissions should agree on who approves the audience, identifies the sender, handles objections, and preserves evidence. A contract can divide work; it does not by itself decide which party is responsible under every applicable law. The FTC says both the promoted company and the sender may have responsibility for commercial email, while privacy roles depend on the actual processing arrangement.[1] [3]

## Start with a client intake gate

Record the client’s legal identity, sender identity, target countries, recipient categories, campaign purpose, data sources, notice path, and suppression policy. Ask whether the client or agency determines the purpose and essential means of processing. Do not guess at controller or processor status from labels such as “agency” or “platform”; document the facts and route uncertainty to counsel.

Require written approval for the list segment, message, postal address, claims, and opt-out language. The approval should identify a version and date. If a client supplies a brokered or enriched list, require the source record and intended-use explanation rather than treating delivery to the agency as permission to market.

## Assign the controls, not just the tasks

Use the matrix in the asset as a starting point. One accountable owner should approve the audience and purpose. An implementation owner should configure the campaign. A second reviewer should test sender identity, link behavior, merge fields, and suppression. The client should name an escalation contact who can decide whether to pause, notify, or seek advice.

The opt-out path needs special care. Under CAN-SPAM, commercial messages need a clear opt-out method and requests must be honored within the statutory window; the FTC also says an opt-out address cannot be sold or transferred except for compliance support.[1] Under UK and EU regimes, electronic-marketing and data-protection rules add separate questions about consent, transparency, objections, and data use.[2] [3]

## Build the evidence handoff

At launch, hand over the approved brief, source register, notices, message version, sender details, suppression snapshot, QA result, and escalation contacts. During sending, preserve message identifiers, timestamps, provider responses, opt-out events, and changes. On offboarding, return or delete client data according to the documented instruction, while preserving the minimum suppression evidence required by the approved policy.

RepMail can be an execution layer, not the legal decision-maker. Confirm current product behavior for access, events, exports, and suppression before promising a client a control. Pair this workflow with the [cold email compliance checklist](/repmail/learn/cold-email/cold-email-compliance-checklist) and [compliance recordkeeping guide](/repmail/learn/compliance/cold-email-compliance-recordkeeping).

## Implementation notes

Before approval, run a tabletop test: a client changes the target country, a recipient replies “never contact me,” and a provider reports a rejected message. The agency should be able to identify the accountable owner, stop the relevant work, update the suppression record, and show the evidence handoff. If it cannot, the responsibility matrix is incomplete. Review access when the client changes vendors or ends the engagement; offboarding should include active queues, exports, enrichment accounts, and copies held by subcontractors.

For adjacent controls, use [cold email unsubscribe requirements](/repmail/learn/compliance/cold-email-unsubscribe-requirements).

## References

[1]: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business "FTC, CAN-SPAM Act: A Compliance Guide for Business"
[2]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/ "ICO, Direct marketing and privacy and electronic communications"
[3]: https://eur-lex.europa.eu/eli/reg/2016/679/oj "EUR-Lex, Regulation (EU) 2016/679 (GDPR)"
