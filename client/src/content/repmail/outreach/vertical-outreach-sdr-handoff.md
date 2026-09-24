---
product: repmail
academy: outreach
contentType: tutorial
slug: vertical-outreach-sdr-handoff
title: "Vertical Outreach Handoff: SDR to Subject-Matter Expert"
description: "A context-packet SOP for SDR-to-expert handoffs that preserves opt-outs, evidence, ownership, and a clear response SLA."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["vertical-outreach", "sales-handoff", "revops", "suppression"]
collections: ["cold-email-message-quality"]
learningPaths: ["getting-started"]
assets:
  - type: checklist
    title: "Vertical Outreach Handoff: SDR to Subject-Matter Expert worksheet"
    content:
      - "Prospect purpose and vertical: ____________________"
      - "Verified signal and source: ____________________"
      - "Question the prospect actually asked: ____________________"
      - "Unverified claim clearly labeled: ____________________"
      - "Owner and response SLA: ____________________"
      - "Suppression state confirmed: ____________________"
keyTakeaways:
  - "Define the business purpose and evidence before building a vertical track."
  - "Separate facts, hypotheses, permissions, owners, and suppression state."
  - "Use a stop or review rule when signal quality, claims, or delivery evidence is uncertain."
faqs:
  - question: "What makes a vertical track worthwhile?"
    answer: "A repeatable business signal, distinct workflow or buyer, and evidence that the message and routing genuinely differ."
  - question: "Should missing data be filled with an industry assumption?"
    answer: "No. Mark it unknown and stop, route for review, or ask a neutral question."
  - question: "Can a sending platform validate the experiment or claim?"
    answer: "It can expose sending and suppression events, but your team must define the segment, evidence, claims, and analysis."
nextStep:
  label: "Measure the resulting replies"
  href: "/repmail/learn/outreach/cold-email-reply-rate-measurement"
  description: "Use the adjacent workflow when the decision is made."
---
# Vertical Outreach Handoff: SDR to Subject-Matter Expert

A good SDR-to-subject-matter-expert handoff is a small, factual context packet. It answers why the prospect was contacted, what they actually said, what is verified, who owns the next step, and whether any suppression or objection applies. It should not forward an entire data dump or turn an inference into a fact.

## Build the packet

Include vertical, purpose, source URL, exact business signal, message version, reply excerpt, requested topic, owner, response SLA, and suppression state. Mark each statement as verified, prospect-reported, or unknown. Remove unrelated personal details. If the prospect asked not to be contacted, stop and propagate that state before assigning an expert.

The expert should receive one clear task: answer a technical question, validate a fit, or propose a bounded next step. Do not ask the expert to improvise a claim about a customer, certification, incident, or outcome. Route commercial replies under the same truthful identity and opt-out discipline required for marketing messages [1].

Measure handoff completion and reply outcomes separately with the [reply-rate guide](/repmail/learn/outreach/cold-email-reply-rate-measurement). Use the [unsubscribe checklist](/repmail/learn/compliance/cold-email-unsubscribe-requirements) when the objection or opt-out state is unclear. RepMail can make the event trail visible, but ownership and factual review remain human responsibilities.


## Define the handoff state

A handoff is complete only when the next owner can act without reconstructing the thread. The packet should contain the prospect’s organization and role, vertical and purpose, source URL and checked date, verified signal, exact question or reply, message version, requested expert action, owner, response SLA, suppression state, and next review time. Label each statement as observed, prospect-reported, approved evidence, or unknown. Include only the minimum personal data needed for the task and link to the system of record rather than copying an unrelated history.

Use explicit acceptance states: **accepted** when the SME confirms ownership and the task; **needs clarification** when the question or source is incomplete; **returned** when the request is outside the SME’s remit; and **stopped** when an objection, opt-out, or unsupported claim blocks follow-up. The SDR remains responsible for preserving the original context until acceptance. The SME owns technical or domain corrections, while RevOps owns queue visibility and suppression propagation. An SLA is an ownership promise for the internal queue, not a promise to the prospect about an outcome.

For example, a prospect asks whether a workflow is supported. The SDR attaches the exact question and public source, marks compatibility as unknown, assigns the integration SME, and requests a bounded answer. The SME can confirm, qualify, or state that the evidence is insufficient. The SDR then sends only the approved response; if the prospect objects, the record moves to stopped before any reassignment. Measure handoff acceptance, time to owner, clarification rate, completed response, follow-up reply, positive reply, and suppression events separately. Use the [multi-vertical routing SOP](/repmail/learn/outreach/multi-vertical-outreach-routing) when ownership crosses tracks and the [vertical QA checklist](/repmail/learn/outreach/vertical-outreach-qa-checklist) before approved wording is sent.


## Use a handoff as a state transition
This workflow is for an SDR who has received a reply or a narrowly defined question and needs a subject-matter expert (SME) to answer it. The trigger is not “the prospect looks technical”; it is an explicit question, a requested comparison, or a factual issue the SDR cannot safely resolve. That distinction keeps the SME queue useful and prevents unsupported claims from being passed off as personalization.

| Handoff field | What to capture | Who owns it | Acceptance test |
| --- | --- | --- | --- |
| Context | Organization, role, vertical, original message ID, and source checked date | SDR | SME can identify the thread without searching a data dump |
| Evidence | Exact reply excerpt, source URL, and labels for observed, reported, approved, or unknown | SDR; SME corrects technical meaning | Every claim has a traceable basis or is marked unknown |
| Requested action | One question, answer, comparison, or correction—not “help close” | SDR | SME can complete it without inventing scope |
| Response boundary | Approved facts, exclusions, and any wording requiring review | SME | Draft does not imply an unsupported result or capability |
| State and next owner | Accepted, needs clarification, returned, or stopped; named sender and due time | SME plus RevOps | Queue shows one accountable next action |

A useful packet is short enough to review in one pass. Start with the question the prospect actually asked, then attach only the evidence needed to answer it. Preserve the original wording in a quote field and put interpretation in a separate field. If the SDR infers a requirement from job title or company type, label it as a hypothesis; do not ask the SME to validate a conclusion that the prospect never stated. Keep the message version and send timestamp so the SME can see which claim generated the question.

Message logic changes by handoff state. **Accepted** means the SME can send or return approved wording. **Needs clarification** means the SDR asks a neutral question or requests a missing source before any technical answer. **Returned** means the topic belongs to another owner, and the SDR records the route rather than forwarding it repeatedly. **Stopped** means an opt-out, objection, unsupported claim, or duplicate opportunity blocks further outreach. The sender should not convert a technical answer into a new sales sequence without a separate reason and suppression check.

The SDR owns context until the SME accepts the packet. The SME owns accuracy and the limits of the answer. RevOps owns queue visibility, timestamps, and propagation of suppression states. A response SLA is an internal routing target; it is not a promise that the prospect will receive a particular outcome. If the SME misses the internal target, RevOps escalates the queue rather than silently assigning another person who lacks the context.

Measure the stages separately: handoffs created, accepted, time to acceptance, clarification rate, returned rate, completed answers, answer-to-reply rate, positive replies, and stopped or suppressed records. Review a sample of completed packets for missing evidence and scope drift. Do not use the overall reply rate to judge the SME; the SME controls answer quality, while the SDR controls audience selection and context quality.

Stop and preserve the record when the recipient says not to contact them, the question cannot be answered from approved evidence, the opportunity is closed, or the stated SLA expires without a safe answer. If a new question arrives later, create a new handoff linked to the old one rather than editing history.
## References

[1] https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business "FTC CAN-SPAM Act: A Compliance Guide for Business"
[2] https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/ "ICO Electronic Mail Marketing"
[3] https://support.google.com/mail/answer/81126?hl=en-GB "Google Email Sender Guidelines"
