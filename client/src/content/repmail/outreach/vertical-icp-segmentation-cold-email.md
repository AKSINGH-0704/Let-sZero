---
product: repmail
academy: outreach
contentType: guide
slug: vertical-icp-segmentation-cold-email
title: "Vertical ICP Segmentation for Cold Email: Research Worksheet"
description: "A repeatable worksheet for evidence-backed vertical segmentation, exclusions, role mapping, and a stop rule before copywriting."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["vertical-outreach", "icp", "segmentation", "research"]
collections: ["cold-email-message-quality"]
learningPaths: ["getting-started"]
assets:
  - type: checklist
    title: "Vertical ICP Segmentation for Cold Email: Research Worksheet worksheet"
    content:
      - "Candidate vertical and reason: ____________________"
      - "Evidence source and date: ____________________"
      - "Inclusion signal: ____________________"
      - "Exclusion signal: ____________________"
      - "Role and workflow map: ____________________"
      - "Stop if verified signal count is insufficient"
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
# Vertical ICP Segmentation for Cold Email: Research Worksheet

Vertical segmentation is useful when it changes the business problem, buyer role, proof, or routing. It is not useful when it merely swaps an industry label into a generic template. Start with evidence-backed signals, define exclusions, map the workflow, and stop when the evidence is too thin to justify a separate track.

## Build the segment

Name the proposed vertical and write the reason it deserves its own hypothesis. Collect public evidence such as a recurring workflow, role pattern, terminology, technology signal, or procurement constraint. Record source and date. Avoid stereotypes about how an industry “usually” operates.

Define inclusion and exclusion rules before building the list. An inclusion rule might require a public role or service signal. An exclusion rule might remove companies without the relevant workflow, locations outside the operating area, or records lacking an identifiable business owner. Map the role who feels the problem, the role who evaluates, and the role who approves.

Set a stop rule: if the team cannot verify enough consistent signals or cannot explain why the message differs, do not create a new vertical track. Use the [reply-rate measurement guide](/repmail/learn/outreach/cold-email-reply-rate-measurement) only after the segment definition and denominator are fixed.

Google’s sender guidance stresses authentication, opt-out, and reputation practices for delivery [1]. Segmentation does not override those fundamentals. RepMail can help keep event and suppression data visible, while your team owns the segment definition and evidence.

## Make the segment falsifiable

Create a track only when evidence predicts a different problem, buyer, proof standard, message, or route. Write: organizations with signal X may face workflow Y, and role Z can validate it. Define inclusion, exclusion, source, freshness, and stop threshold. Changing only an industry noun is not a new segment.

| Field | Evidence | Stop rule |
| --- | --- | --- |
| Definition | industry, size, geography, role | Stop on sensitive inference |
| Trigger | URL, date, freshness window | Stop without current signal |
| Hypothesis | problem, offer, falsifier | Stop if no disproof exists |
| Exclusions | wrong role/region/service/suppression | Stop if not enforced everywhere |
| Cohort | sample, provider, sender, window | Pause threshold breaches |
| Decision | reply-quality evidence, action | Stop when sample is ambiguous |

Classify replies as qualified, neutral, wrong person, negative, and opt-out; opens do not prove fit. Compare with [cold email reply-rate measurement](https://www.letszero.in/repmail/learn/outreach/cold-email-reply-rate-measurement) and use [Google sender guidelines](https://support.google.com/mail/answer/81126) only as receiver context. Merge back when routing and offer are not materially different.


## Related resources

Use the [adjacent workflow](/repmail/learn/outreach/vertical-personalization-without-sensitive-data) and then review the [next operational guide](/repmail/learn/cold-email/cold-email-sequence-quality-checklist) to keep this decision connected to the wider RepMail resource graph.

## References

[1] https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business "FTC CAN-SPAM Act: A Compliance Guide for Business"
[2] https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/ "ICO Electronic Mail Marketing"
[3] https://support.google.com/mail/answer/81126?hl=en-GB "Google Email Sender Guidelines"
