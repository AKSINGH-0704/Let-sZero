---
product: repmail
academy: compliance
contentType: template
slug: email-enrichment-vendor-review
title: Email Enrichment Vendor Privacy Review
description: A vendor due-diligence checklist for enrichment tools covering data sources,
  roles, subprocessors, deletion, access, geography, and objections.
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- compliance
- privacy
- data-enrichment
- vendors
learningPaths: ["getting-started"]
assets:
- type: checklist
  title: Enrichment vendor evidence request
  content:
  - Describe each source and collection context
  - Identify controller, processor, or independent role assumptions
  - Review DPA, subprocessors, security, access, and deletion terms
  - Map countries and transfer mechanisms
  - Test objection and suppression propagation
  - Record approval, limitations, and reassessment date
keyTakeaways:
- "A vendor statement that data is \u201Ccompliant\u201D is not a substitute for your\
  \ own review."
- Request evidence about source, role, purpose, notice, deletion, subprocessors, and
  geography.
- Do not import enriched records until unresolved risks have an owner and decision.
faqs:
- question: Does using a reputable enrichment vendor make outreach lawful?
  answer: No. Vendor reputation or a contractual promise does not decide your purpose,
    recipient rules, transparency, lawful basis, or suppression duties.
- question: What evidence should a vendor provide?
  answer: Ask for source categories, collection context, accuracy controls, role documentation,
    DPA or terms, subprocessors, locations, deletion process, objection handling,
    and current policy dates.
- question: Can I use public professional profiles for enrichment?
  answer: Public availability does not by itself answer whether the data may be processed
    for your marketing purpose. Review source context, expectations, notice, and applicable
    marketing rules.
nextStep:
  label: Record the data source before import
  href: /repmail/learn/compliance/cold-outreach-data-provenance
  description: Make provenance an input to vendor approval.
collections:
- compliance-operations
---

**Review an email-enrichment vendor as a data source and processor, not just as a feature list.** Before import, document what the vendor supplies, where it came from, why your organization needs it, and which party decides the marketing purpose. A vendor’s claim that contacts are “compliant” is evidence to examine, not a legal conclusion.

## Request evidence in five areas

Request source and collection documentation: source categories, collection context, freshness, accuracy process, and whether the data is inferred or directly provided. Request role and contract documentation: processing instructions, access, security terms, subprocessors, deletion or return, audit support, incident handling, and any restrictions on using objections or suppression data. Request geography documentation: vendor entities, subprocessors, hosting locations, and transfer mechanisms.

Then map the operational path. Which fields enter the CRM? Which fields are used for personalization? When does the vendor receive a suppression or objection? Can an opted-out person be reintroduced by a later enrichment run? The ICO’s guidance treats bought-in lists, public details, consent, and objections as separate review topics; “B2B” does not erase the need to ask them.[1]

## Approve with limits

Record approved source types, recipient categories, fields, countries, and purposes. Mark unknowns as blockers or accepted risks with a named owner and review date. Do not approve the vendor for all campaigns if the evidence only supports one narrow use. Test a small, non-sending data flow for suppression and deletion behavior before activating outreach.

If a vendor cannot explain source provenance, objection propagation, or downstream access, quarantine the data. If the use involves extensive profiling, sensitive information, or cross-border transfers, add a privacy review. RepMail can send or store campaign data depending on the configured workflow, but verify current terms and capabilities before representing the platform as a processor or deletion mechanism. Use the [provenance checklist](/repmail/learn/compliance/cold-outreach-data-provenance), [agency responsibility guide](/repmail/learn/compliance/cold-email-compliance-agencies), and [personalization data checklist](/repmail/learn/cold-email/personalization-data-checklist).

## Implementation notes

Ask for a sample evidence packet before signing off: one source description, one freshness value, one objection path, one deletion answer, and the current subprocessor list. Compare those answers with the fields your campaign actually uses. A contract that covers only email delivery may not cover enrichment, profiling, or vendor analytics. Record limitations in the approval so another campaign owner cannot overgeneralize it.

For adjacent controls, use [the broader cold-email compliance checklist](/repmail/learn/cold-email/cold-email-compliance-checklist).

## References

[1]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/ "ICO, Direct marketing and privacy and electronic communications"
[2]: https://eur-lex.europa.eu/eli/reg/2016/679/oj "EUR-Lex, Regulation (EU) 2016/679 (GDPR)"
