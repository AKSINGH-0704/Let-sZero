---
product: repmail
academy: compliance
contentType: guide
slug: transactional-vs-marketing-email-classification
title: Is This Email Transactional or Marketing?
description: Use the FTC primary-purpose framework to classify mixed email while keeping
  the result limited to the relevant law and message facts.
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- compliance
- can-spam
- transactional-email
- marketing-email
learningPaths: ["getting-started"]
assets:
- type: diagram
  title: Primary-purpose classification path
  content: 'Only transaction or account content? -> review transactional/relationship
    category.

    Commercial promotion leads or dominates? -> treat as commercial for CAN-SPAM review.

    Mixed or unclear? -> use conservative commercial controls and escalate.'
keyTakeaways:
- "Classify the message by its primary purpose, not by the sender\u2019s preferred\
  \ label."
- Review subject line, content order, commercial weight, identity, and opt-out requirements
  together.
- Do not generalize the CAN-SPAM result to other jurisdictions or channels without
  review.
faqs:
- question: Does sending to an existing customer make an email transactional?
  answer: No. The FTC says the primary purpose matters and transactional or relationship
    categories are narrow. A promotional message can still be commercial.
- question: Does a subject line decide classification alone?
  answer: No. It is one factor. Review the subject line, content order, amount of
    commercial content, and how the message is presented.
- question: Does this framework apply worldwide?
  answer: "No. It is the FTC\u2019s CAN-SPAM framework. Other jurisdictions may classify\
    \ messages differently or add consent, transparency, or opt-out rules."
nextStep:
  label: Apply the broader compliance checklist
  href: /repmail/learn/cold-email/cold-email-compliance-checklist
  description: Use message classification as one gate in the campaign review.
collections:
- compliance-operations
---

**Classify a mixed email by its primary purpose, not by calling it “transactional.”** The FTC’s CAN-SPAM guidance looks at whether a reasonable recipient would understand the message as commercial, including the subject line, the order of content, and the amount and presentation of promotion.[1] This framework is specific to the relevant US law; it does not settle every jurisdiction’s analysis.

## Walk the message from the recipient’s view

First identify the agreed transaction or relationship, if any. Does the message facilitate, complete, confirm, or update that relationship? Then inspect whether promotional material leads the message, dominates it, or changes what a recipient would reasonably think the message is about. A neutral subject line does not rescue a message whose main content is promotion.

When the primary purpose is commercial, check accurate routing and sender identity, a non-deceptive subject, required disclosure and postal address, and a clear opt-out path. The FTC also says the sender and company whose product is promoted can both have responsibility, including when another company sends the message.[1]

## Record the decision

Save the exact subject, body, links, identity, and classification rationale. If content changes, reclassify. If the answer is mixed or uncertain, use the safer commercial controls and escalate rather than relying on an internal label. Do not assume that a transactional classification under CAN-SPAM removes GDPR, PECR, or other privacy and electronic-marketing duties.

Use the [cold email compliance checklist](/repmail/learn/cold-email/cold-email-compliance-checklist), [unsubscribe requirements](/repmail/learn/compliance/cold-email-unsubscribe-requirements), and [transactional versus marketing infrastructure guide](/repmail/learn/email-platform/transactional-marketing-cold-email-infrastructure). RepMail can send a message, but the campaign owner must classify its purpose and retain the reasoning.

## Implementation notes

Keep the approved workflow versioned, assign an owner, and re-test it whenever the message, audience, data source, provider, or applicable rule changes.

## Classification record and escalation

The message owner should classify the exact rendered version, not a campaign label. Record sender, promoted product or service, subject, preheader, body order, transactional or relationship event, commercial elements, audience, jurisdictions, identity and postal details, opt-out behavior, reviewer, decision date, and reclassification trigger. The legal or privacy reviewer owns the applicable-law analysis; the campaign owner supplies facts; the delivery lead verifies implementation; and the client approver accepts the business scope. The FTC primary-purpose framework is specific to its relevant law and does not settle GDPR, PECR, or another jurisdiction’s requirements.

Use this procedure: (1) state the underlying transaction or relationship; (2) read the subject and opening from the recipient’s perspective; (3) identify whether promotion leads, dominates, or materially changes the message; (4) classify the exact version; (5) apply the stricter commercial controls when mixed or unclear; (6) test identity, address, subject, links, and opt-out; and (7) save the rationale with the rendered artifact. Use the [cold email compliance checklist](/repmail/learn/cold-email/cold-email-compliance-checklist) and [unsubscribe requirements](/repmail/learn/compliance/cold-email-unsubscribe-requirements) for implementation checks.

| Finding | Route | Stop condition |
| --- | --- | --- |
| Relationship content clearly leads and commercial content is absent or incidental | Transactional/relationship review | Promotional content was omitted from analysis |
| Promotion leads or dominates | Commercial controls and sender review | Identity, address, or opt-out is missing |
| Mixed, disputed, or changed message | Conservative commercial controls and escalation | No accountable reviewer |

Stop sending when the subject disguises a commercial purpose, sender identity is inaccurate, the required address or opt-out is missing, or the classification depends on an undocumented assumption. Roll back by disabling the unapproved version and restoring the last classified artifact; preserve the exact message and any event IDs, then reclassify after correction. If the message already sent, do not claim rollback reverses it; route the affected population to the responsible incident and privacy process. Reclassify whenever subject, order, offer, audience, provider, or applicable rule changes. This is an operational framework, not a worldwide legal conclusion.

## References

[1]: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business "FTC, CAN-SPAM Act: A Compliance Guide for Business"
