---
product: repmail
academy: compliance
contentType: guide
slug: prospect-data-access-request
title: Handling a Prospect Data Access Request
description: A jurisdiction-neutral runbook for locating prospect data across CRM,
  campaigns, vendors, and logs while preserving suppression and escalating legal questions.
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- compliance
- privacy
- access-request
- data-rights
learningPaths: ["getting-started"]
assets:
- type: checklist
  title: Prospect access-request runbook
  content:
  - Record receipt and requested scope
  - Verify identity and authority proportionately
  - Map CRM, campaign, provider, enrichment, and log locations
  - Apply hold or preservation where appropriate
  - Review, redact, and package responsive data
  - Record response, exceptions, owner, and completion date
keyTakeaways:
- Route the request to a documented owner and verify identity proportionately.
- "Search every relevant system and vendor without exposing unrelated people\u2019\
  s data."
- Preserve suppression and record the scope, decisions, redactions, and completion
  evidence.
faqs:
- question: What is the response deadline for a prospect access request?
  answer: Deadlines and extensions vary by jurisdiction and circumstances. Use the
    applicable regulator guidance and privacy owner rather than relying on a universal
    timeline.
- question: Can we delete the prospect instead of responding?
  answer: Do not use deletion to avoid a rights request. Preserve the request, search
    responsive systems, and document the lawful response path.
- question: Should suppression status be included?
  answer: Assess it as part of the responsive record, but preserve the no-contact
    control even if other prospect fields are removed or redacted.
nextStep:
  label: Strengthen source and recordkeeping
  href: /repmail/learn/compliance/cold-email-compliance-recordkeeping
  description: Make future searches faster and more complete.
collections:
- compliance-operations
---

**Treat a prospect data access request as a cross-system investigation, not a CRM export.** Route it to the privacy or compliance owner, record when it arrived, and verify identity only to the extent needed for a safe response. The applicable jurisdiction controls scope, timing, exemptions, and format; this runbook deliberately does not declare a universal deadline.[1] [2]

## Define scope and search locations

Record the identifiers supplied by the requester and the systems in scope: CRM, sending platform, campaign files, enrichment vendors, support tickets, suppression lists, provider events, backups, and audit logs. Search by more than a display name where appropriate, because a named prospect may appear under normalized email, an external ID, or a campaign key. Preserve the search method and date.

Separate the requester’s data from third-party information, internal security material, and unrelated recipients. Review whether redaction, exemption, or a narrower clarification is appropriate under the relevant law. Do not claim that a product can fulfill the request unless its export and deletion behavior has been verified for the configured data path.

## Preserve the operational controls

A rights response should not accidentally remove an objection or suppression marker that prevents marketing. If active records are deleted, retain the minimum no-contact control where the approved policy requires it. Ask vendors and processors to search their copies and report completion. The GDPR includes access rights and controller responsibilities, but the precise response depends on the facts and applicable law.[1]

Close with a response package, decision log, systems searched, redactions, vendor confirmations, and completion date. Record any remediation, such as adding a source identifier or improving event retention. Link the runbook to the [recordkeeping guide](/repmail/learn/compliance/cold-email-compliance-recordkeeping), [data provenance checklist](/repmail/learn/compliance/cold-outreach-data-provenance), and [suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules).

## Implementation notes

Use a search checklist that a second person can reproduce. Record identifiers searched, date ranges, systems checked, vendors contacted, and the reason for any redaction or exclusion. Keep the response package separate from ordinary campaign exports and restrict access while it is being reviewed. If the request reveals an inaccurate source or missing suppression, open a corrective action rather than closing only the individual request.

For adjacent controls, use [the broader cold-email compliance checklist](/repmail/learn/cold-email/cold-email-compliance-checklist).

## References

[1]: https://eur-lex.europa.eu/eli/reg/2016/679/oj "EUR-Lex, Regulation (EU) 2016/679 (GDPR)"
[2]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/ "ICO, Direct marketing and privacy and electronic communications"
