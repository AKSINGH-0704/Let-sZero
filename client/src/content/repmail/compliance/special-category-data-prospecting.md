---
product: repmail
academy: compliance
contentType: guide
slug: special-category-data-prospecting
title: Exclude Special-Category Data from Prospecting
description: A pre-import screening workflow to minimize, quarantine, delete, or escalate
  sensitive personal data before it enters ordinary outbound prospecting.
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- compliance
- privacy
- data-minimization
- prospecting
learningPaths: ["getting-started"]
assets:
- type: checklist
  title: Sensitive-data pre-import screen
  content:
  - List fields and inferred attributes in the source
  - Flag health, biometric, belief, union, sexuality, ethnicity, and similar sensitive
    indicators for review
  - Do not copy sensitive content into personalization fields
  - Quarantine uncertain records and restrict access
  - Delete or return data not needed for the approved purpose
  - Escalate exceptions to the privacy owner or counsel
keyTakeaways:
- Screen source fields and inferred attributes before enrichment or personalization.
- Quarantine uncertain records instead of making an unsupported legal classification.
- Use minimization, access limits, deletion, and escalation as operational controls.
faqs:
- question: Does a public profile make sensitive data safe to use?
  answer: No. Public availability does not remove the need to identify the data, assess
    purpose and legal conditions, and minimize use.
- question: What should happen when a record contains a sensitive note?
  answer: Quarantine it, restrict access, avoid using it for outreach, and route it
    for a qualified review. Do not decide legality from a field label alone.
- question: Can job title or industry ever be sensitive?
  answer: Context matters. A seemingly ordinary field can reveal sensitive information
    when combined with other data. Use a conservative screening and escalation process.
nextStep:
  label: Review data provenance before import
  href: /repmail/learn/compliance/cold-outreach-data-provenance
  description: Know where a field came from before deciding whether to keep it.
collections:
- compliance-operations
---

**Ordinary prospecting workflows should screen out special-category or otherwise sensitive personal data before import.** The goal is not to create an exhaustive legal classification table in a sales process. The goal is to identify fields and inferred attributes that increase risk, minimize them, and route uncertainty to a privacy owner or counsel. The GDPR sets additional conditions for special categories of personal data; the precise classification and legal basis are fact-specific.[1]

## Screen the source and the workflow

Inspect source columns, free-text notes, enrichment outputs, and personalization variables. Flag health, biometric, belief, union, sexuality, ethnicity, and similar indicators for review, while remembering that context can make an apparently ordinary field revealing. Do not copy a sensitive detail into a subject line, opening sentence, segment label, or internal note merely because it improves relevance.

Use a quarantine state for uncertain records. Restrict access, stop enrichment and sending, preserve only what the reviewer needs, and record the source and decision. If the field is not needed for the approved outreach purpose, remove it from the campaign dataset and document the minimization action. Do not rely on a vendor’s “B2B” label or a public web page as permission.

## Escalate with facts

Send the reviewer the field, source, collection context, intended use, audience, jurisdictions, and proposed safeguard. A reviewer can decide whether the data is excluded, transformed, retained under a documented condition, or deleted. This page intentionally does not approve a campaign.

Test downstream copies after cleanup. Confirm that exports, enrichment queues, and personalization caches do not retain the field. Pair the process with the [provenance checklist](/repmail/learn/compliance/cold-outreach-data-provenance) and [personalization data checklist](/repmail/learn/cold-email/personalization-data-checklist). RepMail should be configured only after the data decision; do not infer platform capabilities from this educational workflow.

## Implementation notes

Screen free text as well as structured fields. A harmless-looking job title, group membership, or personalization note can reveal more when combined with location, employer, or public context. The safest operational response to uncertainty is quarantine, restricted access, and a documented review. Never paste the sensitive detail into a campaign comment simply to explain why it was excluded.

For adjacent controls, use [the broader cold-email compliance checklist](/repmail/learn/cold-email/cold-email-compliance-checklist).

## References

[1]: https://eur-lex.europa.eu/eli/reg/2016/679/oj "EUR-Lex, Regulation (EU) 2016/679 (GDPR)"
[2]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/ "ICO, Direct marketing and privacy and electronic communications"
