---
product: repmail
academy: compliance
contentType: guide
slug: correct-inaccurate-prospect-data
title: Correcting Inaccurate Prospect Data Before Sending
description: A privacy QA workflow for correcting prospect data without confusing email verification with identity or marketing permission.
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- compliance
- privacy
- data-accuracy
- cold-email
learningPaths: ["getting-started"]
assets:
- type: table
  title: Prospect-data accuracy QA
  content:
    headers:
    - Check
    - Evidence
    - Action
    rows:
    - - Email validity
      - Verification result and date
      - Suppress or recheck undeliverable address
    - - Identity and role
      - First-party source or verified correction
      - Correct, remove, or quarantine
    - - Employer and context
      - Current source and date
      - Do not personalize if stale
    - - Objection or correction request
      - Request record and scope
      - Pause use; route to owner
keyTakeaways:
- Separate mailbox validity from the accuracy of names, roles, employers, and personalization
  facts.
- Correct or remove questionable fields before they reach a message or enrichment
  workflow.
- Keep the source, date, reviewer, and correction request attached to the decision.
faqs:
- question: "Does email verification prove the person\u2019s identity?"
  answer: No. It may indicate that an address can receive mail; it does not prove
    the person, role, employer, accuracy, or permission to market.
- question: Should we correct data silently?
  answer: Record the source, date, reviewer, and changed field. A traceable correction
    helps prevent the same inaccurate value returning from another copy.
- question: What if the prospect says the data is wrong?
  answer: Pause the affected use, record the request, correct or remove the field
    where appropriate, and assess whether related records and vendors need updating.
nextStep:
  label: Audit data provenance
  href: /repmail/learn/compliance/cold-outreach-data-provenance
  description: Accuracy is easier when every field has a source and date.
collections:
- compliance-operations
---

**Correct prospect data before sending by separating three questions: can the mailbox receive mail, is the personal information accurate, and may the organization use it for outreach?** An email verifier can help with the first question. It does not establish identity, current role, employer, source context, lawful basis, or consent.

## Run a field-level QA pass

For each field used in segmentation or personalization, record the source, collection or verification date, reviewer, and confidence. Check name, role, employer, location, industry, and any free-text note against an appropriate first-party or documented source. If a field cannot be supported, remove it from the message or quarantine the record. Do not fill a gap with a guess.

A correction request should pause the affected use. Record what the person disputed, which systems contain the value, and whether a vendor or agency received it. The GDPR includes an accuracy principle and rights related to rectification; the practical response is to create a traceable correction workflow rather than overwrite the field without context.[1]

## Propagate and re-test

After correction, update downstream lists, enrichment jobs, personalization caches, and exports. Test the final rendered message with the corrected and blank values. If the data came from a broker or enrichment vendor, ask how the correction and suppression propagate. Keep the minimum evidence needed to explain the change and apply your retention policy.

Use the [data provenance checklist](/repmail/learn/compliance/cold-outreach-data-provenance), [personalization QA checklist](/repmail/learn/cold-email/personalization-data-checklist), and [list-building guide](/repmail/learn/cold-email/build-and-verify-a-cold-email-list). RepMail should receive only the fields approved for the campaign; do not claim that sending software validates personal-data accuracy.

## Implementation notes

Use a correction queue rather than allowing sales users to overwrite disputed data without trace. Store the old value only where the policy permits and restrict its access; otherwise record a change event and the source of the replacement. Re-run personalization QA after correction, because a valid email address can still render a false name, role, or company in the final message.

For adjacent controls, use [the broader cold-email compliance checklist](/repmail/learn/cold-email/cold-email-compliance-checklist).

## Correction queue procedure

Create a correction ticket whenever a person, client, reviewer, or source disputes a field. Record record ID, disputed field, old value only where policy permits, replacement value, source and source date, request date, affected campaigns, vendors and exports, reviewer, decision, propagation targets, retention class, and retest date. The data owner validates the replacement; the privacy owner decides how the request is handled; the campaign owner pauses use; and QA verifies the final rendered message. Email verification is evidence about mailbox reachability only, not identity, role, employer, accuracy, consent, or marketing permission.

Run the queue in order: (1) pause the affected segmentation and personalization; (2) identify every system and export containing the field; (3) verify the correction through an appropriate source without guessing; (4) correct, remove, or quarantine the field; (5) propagate the decision to CRM, enrichment, caches, lists, and vendors; (6) rerun the audience and message tests; and (7) close the ticket with evidence. Use the [data provenance checklist](/repmail/learn/compliance/cold-outreach-data-provenance), [personalization QA checklist](/repmail/learn/cold-email/personalization-data-checklist), and [list-building guide](/repmail/learn/cold-email/build-and-verify-a-cold-email-list).

| QA finding | Action | Owner |
| --- | --- | --- |
| Mailbox invalid or undeliverable | Suppress or recheck; do not infer identity | Data owner |
| Name, role, or employer unsupported | Remove or quarantine personalization | Campaign owner |
| Correction request affects multiple copies | Map and notify downstream owners | Privacy owner |
| Source conflict or sensitive context | Hold and escalate | Privacy/counsel reviewer |

Stop sending when a disputed field appears in a live message, the replacement source is uncertain, a vendor cannot propagate the correction, or a suppression/objection is implicated. Roll back by removing the affected rows or restoring the last verified audience snapshot, preserving the correction event and message IDs. Do not silently overwrite the old value where an audit or policy requires traceability, and do not retain more personal data than policy allows. Resume only after propagation evidence, blank-value rendering, and reviewer sign-off are complete. Accuracy review does not establish permission to market or guarantee a lawful campaign.

## References

[1]: https://eur-lex.europa.eu/eli/reg/2016/679/oj "EUR-Lex, Regulation (EU) 2016/679 (GDPR)"
[2]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/ "ICO, Direct marketing and privacy and electronic communications"
