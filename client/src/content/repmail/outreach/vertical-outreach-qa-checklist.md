---
product: repmail
academy: outreach
contentType: guide
slug: vertical-outreach-qa-checklist
title: "Vertical Outreach QA Checklist for Claims and Routing"
description: "A pre-send checklist for vertical claims, proof sources, routing, opt-outs, sender readiness, and reviewer sign-off."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["vertical-outreach", "qa", "claims", "suppression"]
collections: ["cold-email-message-quality"]
learningPaths: ["getting-started"]
assets:
  - type: checklist
    title: "Vertical Outreach QA Checklist for Claims and Routing worksheet"
    content:
      - "Vertical and purpose are explicit"
      - "Every statistic, customer name, certification, and competitor reference has a source"
      - "Unknowns are labeled; no inferred sensitive attribute is used"
      - "Recipient, owner, and reply route are correct"
      - "Opt-out and do-not-contact state were tested"
      - "Authentication and provider evidence are ready"
      - "Reviewer name, date, and decision are recorded"
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
# Vertical Outreach QA Checklist for Claims and Routing

Run this checklist before a vertical sequence leaves draft. The goal is not to make a legal conclusion; it is to catch unsupported claims, wrong routing, stale research, missing suppression, and preventable sender errors.

## Review evidence and message

Confirm the vertical, recipient role, purpose, and business signal. Every statistic, customer name, certification, competitor reference, integration statement, and outcome claim needs a source and owner. If the source is missing, remove the claim or label the statement as an unverified hypothesis for internal review. FTC endorsement guidance says endorsements must be honest and not misleading, and material connections should be disclosed when relevant [1].

## Review data and routing

Check that the record is in the correct vertical, the owner is available, the reply route is monitored, and the fields contain no unnecessary sensitive information. Confirm the message includes truthful sender identity and an easy opt-out. The FTC sets these expectations for commercial email; Google separately recommends authenticated sending domains and sender monitoring [2] [3].

## Sign off

A reviewer should record name, date, version, evidence links, unresolved questions, and the decision: approved, revise, or stop. After launch, use [provider-specific triage](/repmail/learn/deliverability/provider-specific-deliverability-triage) for delivery signals and [reply-rate measurement](/repmail/learn/outreach/cold-email-reply-rate-measurement) for outcome definitions. RepMail can support the event trail; the reviewer remains accountable for the claims and routing.


## Run the gate in order

Assign one reviewer and record the campaign version, review date, unresolved questions, and decision. Start with **audience**: verify the vertical, role, geography, business signal, source date, exclusions, and purpose. Continue to **claims**: match every customer name, result, statistic, certification, competitor reference, and capability statement to a source and an approved wording. Mark estimates and hypotheses explicitly. A missing source means remove the claim or hold the campaign; it is not a prompt to search for a plausible replacement.

Next test **data and routing**. Use a small set of known records to confirm the selected track, sender, reply owner, fallback queue, and review state. Test a direct opt-out, a broad objection, a duplicate contact, an ambiguous vertical, and a changed job role. Verify that suppression propagates beyond the current track. Then test **message and rendering**: sender identity, destination, links, personalization fallback, plain-text meaning, mobile readability, and the opt-out path. Do not confuse a successful render with approval of the underlying claim.

Finish with **sender readiness and accountability**. Confirm the approved sending configuration and available event evidence, then record the reviewer’s name and whether the result is approve, revise, or stop. Stop immediately for a missing owner, unsupported material claim, broken suppression, wrong recipient, or an unresolved sender problem. For a small implementation, keep a QA row per variant with evidence URL, expected value, observed value, reviewer, and disposition. After launch, separate delivery, human replies, positive replies, meetings, unsubscribes, and complaints in the report. The [agency proof-translation playbook](/repmail/learn/outreach/cold-email-agency-new-vertical) helps reviewers test claim boundaries, while [reply-rate measurement](/repmail/learn/outreach/cold-email-reply-rate-measurement) defines the outcome fields.
## References

[1] https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business "FTC CAN-SPAM Act: A Compliance Guide for Business"
[2] https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/ "ICO Electronic Mail Marketing"
[3] https://support.google.com/mail/answer/81126?hl=en-GB "Google Email Sender Guidelines"
