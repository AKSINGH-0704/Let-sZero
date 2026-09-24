---
product: repmail
academy: outreach
contentType: guide
slug: cold-email-recruiting-agencies
title: "Cold Email for Recruiting Agencies: Separate Outreach"
description: "Cold Email for Recruiting Agencies: Separate Candidate and Client Outreach. Practical workflow for research, message boundaries, suppression, and review."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["vertical-outreach", "recruiting", "data-boundaries", "suppression"]
collections: ["cold-email-message-quality"]
learningPaths: ["getting-started"]
assets:
  - type: checklist
    title: "Cold Email for Recruiting Agencies: Separate Candidate and Client Outreach checklist"
    content:
      - "Audience lane: employer client / candidate"
      - "Record source and permitted purpose: ____________________"
      - "Sensitive-attribute check completed: yes / no"
      - "Owner and reply route: ____________________"
      - "Opt-out state propagated to all sequences: yes / no"
      - "Hiring outcome claim verified: yes / no"
keyTakeaways:
  - "Use a verified public signal and record its source before personalizing."
  - "Separate purpose, recipient, owner, and suppression state."
  - "State unknowns plainly instead of inventing a need, outcome, or claim."
faqs:
  - question: "What is the safest personalization signal?"
    answer: "A current, public business fact that supports a relevant question without inferring a private problem."
  - question: "Should a vertical page promise a result?"
    answer: "No. Explain the workflow and evidence requirements; outcomes depend on the list, message, recipient, and process."
  - question: "What should happen after an opt-out?"
    answer: "Record it centrally, stop related follow-ups, and screen future imports against the suppression state."
nextStep:
  label: "Measure replies by purpose"
  href: "/repmail/learn/outreach/cold-email-reply-rate-measurement"
  description: "Use the adjacent workflow when the decision is made."
---
# Cold Email for Recruiting Agencies: Separate Candidate and Client Outreach

Recruiting agencies should treat employer outreach and candidate outreach as two separate data paths. They have different purposes, owners, fields, and suppression decisions. A shared campaign or mixed spreadsheet makes it too easy to send a candidate message to a client contact, expose unnecessary personal details, or carry an opt-out into the wrong workflow.

## Create two lanes

The **client lane** can contain public company context, hiring signals, role family, and the business-development owner. The **candidate lane** needs a separate purpose, source record, recruiter owner, and retention decision. Keep candidate profiles out of client prospecting fields. Do not target or personalize from health, family, protected-class, or other sensitive attributes.

For client outreach, use a verifiable signal such as a public role listing or expansion announcement, then ask a narrow question about the hiring process. Do not claim that the company is struggling to hire or that your agency will produce a particular outcome. For candidate communication, use the channel and permission history appropriate to that person and avoid treating a scraped profile as consent.

## Route replies and suppression

Every lane needs a named owner and a reply route. When someone opts out, propagate the suppression state across the agency’s sequences, exports, and manual follow-up queue. The FTC requires an easy opt-out for commercial email; ICO guidance also distinguishes business contacts from individuals and sole traders [1] [2]. This is an operational rule, not a reason to merge the records.

Before sending, review the source, purpose, sensitivity, recipient lane, owner, and claim. After sending, measure employer and candidate outcomes separately. The [agency-tool guide](/repmail/learn/outreach/best-cold-email-tools-for-agencies) can help compare workflow needs, while RepMail can make delivery events and suppression visible. Neither replaces a human decision about whether a candidate record should be used.

## Keep candidate and client lanes separate

Employers buying search services and candidates considering roles need separate campaigns, owners, senders, templates, suppression, and reporting. Interest in one role is not permission for an unrelated service. A hiring announcement does not prove a named employee has authority.

| Field | Client lane | Candidate lane | Stop rule |
| --- | --- | --- | --- |
| Source | hiring page/announcement | professional source or permission | Stop without record |
| Purpose | search/staffing question | specific role conversation | Stop if purpose changes |
| Data | role, geography, capability | stated professional details | Stop on sensitive inference |
| Owner | client partner/BD reviewer | recruiter/candidate-care owner | Route to correct lane |
| Suppression | company/contact instruction | candidate/channel preference | Stop after opt-out |
| Evidence | URL, date, approval, disposition | source and permission record | Qualify availability claims |

Review [ICO direct-marketing guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/) and the [FTC CAN-SPAM guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business) with counsel. Do not send when lane, source, or suppression owner is unknown. Never auto-enroll a reply from one lane into the other; pause on safety concerns or complaint changes.


## Related resources

Use the [adjacent workflow](/repmail/learn/outreach/vertical-icp-segmentation-cold-email) and then review the [next operational guide](/repmail/learn/outreach/vertical-personalization-without-sensitive-data) to keep this decision connected to the wider RepMail resource graph.

## References

[1] https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business "FTC CAN-SPAM Act: A Compliance Guide for Business"
[2] https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/ "ICO Electronic Mail Marketing"
