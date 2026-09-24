---
product: repmail
academy: compliance
contentType: guide
slug: data-broker-outreach-due-diligence
title: 'Using Data Brokers for Cold Outreach: Due-Diligence Workflow'
description: A broker-data review workflow for source documentation, notice, accuracy,
  objections, contractual assurances, suppression, and provenance evidence.
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- compliance
- privacy
- data-brokers
- cold-email
learningPaths: ["getting-started"]
assets:
- type: checklist
  title: Data-broker due-diligence checklist
  content:
  - Identify source categories and collection context
  - Document intended use and recipient categories
  - Request notice, objection, accuracy, and suppression evidence
  - Review contract, roles, subprocessors, and deletion
  - Test a sample for source date and field accuracy
  - Approve scope, owner, limitations, and reassessment date
keyTakeaways:
- "A broker\u2019s representation does not replace the sender\u2019s own purpose and\
  \ transparency review."
- Require source, collection, accuracy, objection, suppression, and contractual evidence
  before import.
- Quarantine records when provenance or intended use cannot be demonstrated.
faqs:
- question: Is brokered data lawful because the broker collected it?
  answer: No. The sender still needs to assess its own purpose, transparency, recipient
    rules, accuracy, objections, and data-flow obligations.
- question: What should we request from a broker?
  answer: Request source categories, collection context, notice path, accuracy and
    freshness, objection handling, suppression propagation, role terms, subprocessors,
    deletion, and current policy evidence.
- question: Can we use a list with no collection date?
  answer: Treat missing provenance as a review gap. Without source and freshness evidence,
    you cannot reliably assess purpose, accuracy, notice, or re-use.
nextStep:
  label: Create a source register
  href: /repmail/learn/compliance/cold-outreach-data-provenance
  description: Keep evidence attached to the records you approve.
collections:
- compliance-operations
---

**Do not treat a data broker’s assurance as a substitute for your own due diligence.** A broker can supply data and contractual representations, but your organization still needs to understand the source, purpose, recipient context, notice path, accuracy, objections, and suppression flow. The ICO specifically addresses bought-in lists and public contact details as questions requiring review.[1] [2]

## Request a provenance packet

Ask for source categories, collection context, date or freshness, fields supplied, inferred attributes, notice information, objection process, accuracy controls, and suppression propagation. Ask how the broker handles a person’s objection after the data has been transferred and whether downstream customers receive updates. Request role and contract terms, subprocessors, locations, deletion or return, incident handling, and audit support.

Then compare the packet with your intended use. A record collected for one purpose is not automatically suitable for a different marketing use. A work address is not automatically outside personal-data rules. The GDPR’s principles include lawfulness, fairness, transparency, purpose limitation, data minimization, and accuracy; use them as review questions rather than as a one-line approval.[2]

## Quarantine gaps and test the flow

If there is no source date, collection context, notice path, or objection process, quarantine the list. Sample records for field accuracy and unexpected sensitive details. Verify that a suppression event reaches the broker or downstream copy where the contract says it should. Do not send while a material gap is unresolved.

Record the approved countries, fields, purpose, owner, limitations, evidence date, and reassessment trigger. Link the review to the [data provenance checklist](/repmail/learn/compliance/cold-outreach-data-provenance) and [enrichment vendor review](/repmail/learn/compliance/email-enrichment-vendor-review). RepMail can execute a campaign only after the data decision is made; it cannot turn unproven provenance into permission.

## Implementation notes

Sample the broker’s evidence against the actual records you received. Compare source date, field meaning, geography, and suppression status, and record discrepancies. Ask how an objection reaches every downstream customer and what happens when the broker cannot update a copy. If the answer is unclear, do not treat a data license or indemnity as a substitute for operational controls.

For adjacent controls, use [the broader cold-email compliance checklist](/repmail/learn/cold-email/cold-email-compliance-checklist).

## References

[1]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/ "ICO, Direct marketing and privacy and electronic communications"
[2]: https://eur-lex.europa.eu/eli/reg/2016/679/oj "EUR-Lex, Regulation (EU) 2016/679 (GDPR)"
