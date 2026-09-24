---
product: repmail
academy: outreach
contentType: research
slug: vertical-outreach-experiment-design
title: "Vertical Outreach Experiment Design: Segment, Message, and Outcomes"
description: "Design vertical outreach tests with controlled segments, versioned messages, explicit denominators, stopping rules, and separate safety outcomes."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["vertical-outreach", "experimentation", "measurement", "deliverability"]
collections: ["cold-email-message-quality"]
learningPaths: ["getting-started"]
assets:
  - type: checklist
    title: "Vertical Outreach Experiment Design: Segment, Message, and Outcomes worksheet"
    content:
      - "Segment definition and exclusions: ____________________"
      - "Message version and hypothesis: ____________________"
      - "Eligibility and denominator: ____________________"
      - "Deliverability and complaint monitoring: ____________________"
      - "Stop rule: ____________________"
      - "Outcome owner and review date: ____________________"
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
# Vertical Outreach Experiment Design: Segment, Message, and Outcomes

A vertical outreach experiment is useful only when the segment, message, eligibility, denominator, and outcome definitions are explicit. Do not start with a benchmark claim. Start with a question such as whether a verified workflow-specific message produces more qualified replies than a generic message within a defined population.

## Control the inputs

Define inclusion and exclusion rules, source date, role, geography, sender identity, message version, follow-up schedule, and suppression handling. Change one meaningful variable at a time where practical. Keep an untouched version or comparison group when the operational context allows it. Document any change that makes the groups incomparable.

Separate outcomes: accepted or rejected delivery, inbox evidence when measured, reply, positive reply, meeting, unsubscribe, complaint, and qualified opportunity. State each denominator. A reply rate calculated over imported contacts is not the same as one calculated over accepted messages. Do not claim general performance from an unmeasured or small test.

Set stopping rules before launch. Stop or review when complaints, unexpected bounces, authentication failures, or a material claim error appears. Google’s sender guidance emphasizes authentication, reputation, and easy unsubscribe controls [1]. Use [provider-specific triage](/repmail/learn/deliverability/provider-specific-deliverability-triage) for delivery evidence and [vertical segmentation](/repmail/learn/outreach/vertical-icp-segmentation-cold-email) for input definitions. RepMail can expose sending events; it cannot turn an experiment into a causal result without sound design.


## Write the test card before the first send

A test card should fit on one review record. State the question, eligible population, exclusions, source and checked date, role and geography, message versions, sender identity, follow-up policy, primary outcome, secondary safety outcomes, denominator, owner, review date, and stop conditions. The hypothesis must identify the one material change being evaluated, such as a workflow-specific opening versus a generic opening. If the audience, sender, timing, and message all change together, call the work a pilot or observation rather than a controlled comparison.

Freeze the segment before assignment and record every exclusion. Track eligible, assigned, attempted, accepted, replied, positive reply, meeting, unsubscribe, complaint, and qualified-opportunity states separately. Preserve message version and routing rule with each event. Analyze rates only with their denominator named; do not treat a missing reply as a negative qualification without a review rule. If a provider event, list correction, or copy change changes exposure, annotate the affected period instead of smoothing it away.

Set a stop owner and an action for each stop. A suppression failure stops sending and triggers an audit. An unsupported claim stops the affected variant. Unexpected bounce or complaint movement triggers deliverability review rather than a copy conclusion. Misclassified records are removed from analysis and returned to segmentation review. For example, compare two openings inside one verified role and workflow, keep the follow-up policy identical, and review the event log after the planned window. The decision can be “continue,” “revise,” or “do not scale”; it should not claim a universal benchmark. Use the [vertical QA checklist](/repmail/learn/outreach/vertical-outreach-qa-checklist) before launch and [provider-specific triage](/repmail/learn/deliverability/provider-specific-deliverability-triage) when delivery evidence changes.
## References

[1] https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business "FTC CAN-SPAM Act: A Compliance Guide for Business"
[2] https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/ "ICO Electronic Mail Marketing"
[3] https://support.google.com/mail/answer/81126?hl=en-GB "Google Email Sender Guidelines"
