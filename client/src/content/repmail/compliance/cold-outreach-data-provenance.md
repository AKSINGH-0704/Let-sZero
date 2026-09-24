---
product: repmail
academy: compliance
contentType: template
slug: cold-outreach-data-provenance
title: Cold Outreach Data Provenance Checklist
description: A source-register checklist for tracking how prospect data was collected,
  refreshed, approved, noticed, and suppressed before import.
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- compliance
- privacy
- provenance
- cold-email
learningPaths: ["getting-started"]
assets:
- type: table
  title: Prospect data source register
  content:
    headers:
    - Field
    - Example entry
    rows:
    - - Source and collection context
      - Direct form, event, public page, broker, enrichment
    - - Date and freshness
      - Collection or last verification date
    - - Purpose and audience
      - Approved outreach purpose and recipient type
    - - Notice and objection path
      - Notice version, rights route, suppression state
    - - Decision and owner
      - Review result, limitations, owner, next review
keyTakeaways:
- Record source, collection context, freshness, intended use, and notice path before
  import.
- Treat public, brokered, enriched, and directly collected records as different evidence
  cases.
- Do not equate data availability or email validity with permission to market.
faqs:
- question: Does a public email address have marketing permission?
  answer: Not automatically. Public availability is one source fact; review purpose,
    context, expectations, transparency, recipient category, and applicable marketing
    rules.
- question: What provenance fields are essential?
  answer: Capture source, collection context, date, fields, intended use, notice path,
    lawful-basis review, objection or suppression status, owner, and review date.
- question: Can provenance be reconstructed after import?
  answer: Sometimes, but it is riskier and less reliable. Make the register an import
    gate and quarantine records whose source or intended use cannot be demonstrated.
nextStep:
  label: Review the compliance recordkeeping model
  href: /repmail/learn/compliance/cold-email-compliance-recordkeeping
  description: Attach the source decision to the record before it enters a campaign.
collections:
- compliance-operations
---

**A cold-outreach data provenance record should answer where each prospect field came from, when it was collected or refreshed, why it is needed, and what review allowed it into a campaign.** The register is operational evidence, not proof that a campaign is lawful. The ICO warns that bought-in and publicly available contact details require their own analysis; availability is not the same as permission.[1] [2]

## Record the source before import

Capture source category, collection context, date, fields, freshness, intended purpose, recipient type, notice path, lawful-basis review, objection or suppression status, and accountable owner. Distinguish directly collected data from event leads, public pages, brokers, and enrichment. Record the source at field level when different fields have different origins.

Use the register as a gate. If the source is unknown, the collection context is missing, or the intended use differs from the apparent purpose, quarantine the record. Do not solve the gap by adding a generic consent label. If a person asks where data came from or says it is inaccurate, preserve the request and route it through the approved rights or correction workflow.

## Keep provenance connected to operations

Propagate source and suppression decisions to agencies, enrichment tools, exports, and campaign versions. Record when a source was refreshed and whether the new data changed the decision. Before sending, compare the approved purpose and audience with the actual segment. After sending, retain message and objection evidence according to the approved schedule.

RepMail can be one execution layer, but it does not turn a weak source record into permission. Use the [recordkeeping guide](/repmail/learn/compliance/cold-email-compliance-recordkeeping), [list-building workflow](/repmail/learn/cold-email/build-and-verify-a-cold-email-list), and [privacy notice placement guide](/repmail/learn/compliance/cold-email-privacy-notice-placement). The [personalization checklist](/repmail/learn/cold-email/personalization-data-checklist) complements this page by checking field quality rather than source governance.

## Implementation notes

Use a stable source identifier so the same record can be traced after enrichment, correction, export, and campaign use. Record field-level exceptions rather than marking an entire file “approved” when its columns have different origins. A refresh should create a new review event if it changes source, purpose, geography, or sensitivity. This makes suppression and rights-request searches more complete.

For adjacent controls, use [the broader cold-email compliance checklist](/repmail/learn/cold-email/cold-email-compliance-checklist).

## References

[1]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/ "ICO, Direct marketing and privacy and electronic communications"
[2]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-electronic-mail/ "ICO, Guidance on direct marketing using electronic mail"
[3]: https://eur-lex.europa.eu/eli/reg/2016/679/oj "EUR-Lex, Regulation (EU) 2016/679 (GDPR)"
