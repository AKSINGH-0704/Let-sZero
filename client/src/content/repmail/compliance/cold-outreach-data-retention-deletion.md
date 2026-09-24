---
product: repmail
academy: compliance
contentType: template
slug: cold-outreach-data-retention-deletion
title: Cold Outreach Data Retention and Deletion Schedule
description: A purpose-based worksheet for deciding what prospecting data to retain,
  review, restrict, or delete without inventing a universal retention period.
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- compliance
- privacy
- retention
- cold-email
learningPaths: ["getting-started"]
assets:
- type: table
  title: Retention schedule worksheet
  content:
    headers:
    - Data category
    - Purpose
    - Owner
    - Review trigger
    - Deletion or exception note
    rows:
    - - Active prospect
      - Approved outreach workflow
      - Campaign owner
      - Purpose or source changes
      - Delete or re-review when no longer needed
    - - Suppression record
      - Prevent re-contact
      - Compliance owner
      - Policy or legal review
      - Keep minimum necessary fields
    - - Lawful-basis evidence
      - Explain decision
      - Privacy owner
      - Campaign or purpose change
      - Retain under documented accountability policy
    - - Send and event log
      - Operational evidence
      - Platform owner
      - Incident or review close
      - Restrict access; apply approved retention
keyTakeaways:
- Set retention by purpose and review date, not by a universal number of days.
- Separate active prospect data, suppression records, decision evidence, and campaign
  logs.
- Document exceptions, access owners, and the event that triggers deletion or review.
faqs:
- question: What is the correct retention period for prospect data?
  answer: There is no universal period that can be safely prescribed here. Define
    the purpose, necessity, review trigger, applicable law, and documented owner for
    each category.
- question: Should suppression records be deleted with the prospect?
  answer: Do not automatically delete the only record that prevents re-contact. Assess
    whether a minimal suppression record is needed, restrict access, and document
    the purpose and retention decision.
- question: Do campaign logs contain personal data?
  answer: They can. Message identifiers, addresses, events, notes, and recipient-level
    outcomes may relate to people. Classify them before choosing access and deletion
    rules.
nextStep:
  label: Decide deletion versus suppression
  href: /repmail/learn/compliance/prospect-deletion-vs-suppression
  description: Use a purpose-based decision instead of a blanket timer.
collections:
- compliance-operations
---

**A cold-outreach retention schedule should describe purposes and review triggers, not promise one universal deletion period.** Separate the data needed to run an approved campaign from the minimum record needed to prevent re-contact and the evidence needed to explain a decision. The GDPR’s storage-limitation and accountability principles require context; the schedule is an operational record, not a substitute for a jurisdiction-specific policy.[1]

## Classify the data before setting a rule

Use separate rows for active prospect records, rejected or invalid records, do-not-contact suppression, consent or lawful-basis evidence, privacy notices, campaign approvals, and send or event logs. For each row, record the purpose, fields, source, owner, access group, review trigger, deletion action, and exception. Avoid keeping an entire CRM record merely because one address must remain suppressed.

A review trigger is more useful than a vague promise. Examples include the end of the campaign purpose, a source correction, an objection, a client offboarding event, a vendor termination, a data-subject request, or a material change in the audience. The ICO’s direct-marketing guidance covers source, consent, bought-in lists, public details, and objections; each can affect what evidence is still needed.[2]

## Treat deletion as an operational control

Define how a record is removed from active systems, exports, enrichment queues, backups, and downstream tools. Define who can approve an exception and how the exception expires. Do not claim that a tool deletes every copy unless its documented behavior has been verified. If a legal hold, incident review, or suppression requirement changes the action, record the reason and restrict access.

Suppression needs a separate decision. A person’s objection can require stopping marketing while the system still needs a minimal marker to avoid re-importing the address. The correct fields, retention, and access are context-dependent; document the least data that achieves the prevention purpose. Link the schedule to the [recordkeeping guide](/repmail/learn/compliance/cold-email-compliance-recordkeeping), [suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules), and [deletion-versus-suppression decision guide](/repmail/learn/compliance/prospect-deletion-vs-suppression).

## Implementation notes

A schedule is useful only when it maps to a real deletion process. Name the system of record, downstream tools, backups, exports, and owner for each category. If an exception is necessary, record its reason, access restriction, expiry, and reviewer. Reconcile the schedule quarterly or after a new vendor, campaign purpose, or rights request; do not let an old row silently govern a changed data flow.

For adjacent controls, use [the broader cold-email compliance checklist](/repmail/learn/cold-email/cold-email-compliance-checklist).

## References

[1]: https://eur-lex.europa.eu/eli/reg/2016/679/oj "EUR-Lex, Regulation (EU) 2016/679 (GDPR)"
[2]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/ "ICO, Direct marketing and privacy and electronic communications"
