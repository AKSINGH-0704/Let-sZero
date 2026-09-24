---
contentType: guide
slug: "agency-client-data-retention-deletion"
title: "Client Data Retention and Deletion at Agency Exit"
description: "A decision tree and exit checklist separating client export, archive, deletion, suppression, and access-log handling at agency exit."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["agency-outreach", "data-retention", "deletion", "offboarding"]
featured: false
collections: ["tool-reviews"]
learningPaths: ["getting-started"]
keyTakeaways:
  - "Retention and deletion decisions follow contract, policy, jurisdiction, and counsel."
  - "Suppression is an operational safety control, not simply a disposable dataset."
  - "Document exports, archives, deletions, and exceptions with an owner and date."
prerequisites:
  - label: "Review agency offboarding controls"
    href: "/repmail/learn/outreach/agency-cold-email-client-offboarding"
commonMistakes:
  - "Deleting opt-out evidence along with campaign rows."
  - "Keeping an unbounded export because no owner was assigned."
  - "Treating a client request as a complete legal instruction without routing it for review."
faqs:
  - question: "Should campaign history be deleted at contract end?"
    answer: "Not automatically. Determine what the contract and applicable requirements call for, then record the approved export, archive, deletion, or exception."
  - question: "Is a suppression list personal data?"
    answer: "It can contain or relate to personal data. Handle it under the applicable policy and preserve only what is necessary to prevent unwanted recontact."
nextStep:
  label: "Next: review cold-email recordkeeping"
  href: "/repmail/learn/compliance/cold-email-compliance-recordkeeping"
  description: "Map the exit decision to the approved record policy."
assets:
  - type: checklist
    title: "Agency Client Data Retention and Deletion at Agency Exit worksheet"
    content:
      - "Record the owner, scope, evidence link, status, and checked date for each control."
      - "Mark the item HOLD when required evidence is missing or a decision is uncertain."
      - "Attach the completed record to the client or incident review before proceeding."
---
At agency exit, classify each record before acting: **client export**, **restricted archive**, **deletion**, **suppression**, or **access evidence**. The correct result depends on the contract, documented policy, applicable jurisdiction, system role, and counsel—not on a universal timer.

## Decision tree

```text
Is the record needed for an agreed client handoff? → Export with scope and acceptance evidence.
No → Is there an approved retention, audit, or dispute reason? → Restrict, document owner and review date.
No → Is it an opt-out, complaint, or do-not-contact instruction? → Preserve/enforce as required; do not reintroduce it.
No → Delete through the approved process and record the action.
Unclear → Hold the disposition and escalate to the responsible privacy/legal owner.
```

## Exit checklist

| Record class | Decision to record | Evidence |
| --- | --- | --- |
| Audience and source files | Export, return, archive, or delete | Scope, recipient, checksum or version |
| Campaign and message history | Client handoff or restricted retention | Owner, purpose, review date |
| Suppressions and complaints | Enforce, transfer, or retain minimally | Source, scope, event, control test |
| Provider feedback | Retain or export if approved | Event IDs and period |
| Access logs | Retain under security policy or delete | Policy reference and reviewer |
| Credentials and tokens | Revoke and rotate | Revocation evidence |
| Backups and cached exports | Route to backup deletion process | System and completion record |

The [recordkeeping guide](/repmail/learn/compliance/cold-email-compliance-recordkeeping) covers evidence design. The [offboarding runbook](/repmail/learn/outreach/agency-cold-email-client-offboarding) covers domains, mailboxes, and access. This article does not give legal conclusions; ask the responsible reviewer to map the decision to the relevant jurisdiction and contract.

## Completion record

Record request date, decision owner, legal/policy basis as approved by the reviewer, systems searched, actions taken, exceptions, verification, and next review. A deletion request is not complete merely because one visible dashboard is empty.

## Related internal resources

- [Outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules)


## Decision boundary: release, retain, suppress, or hold

Release an export only after the client or authorized recipient confirms scope and transfer method. Retain a restricted archive only when an approved contract, security policy, dispute hold, or documented operational need names the owner, purpose, access list, and review date. Preserve a suppression record when it is necessary to prevent recontact, but minimize its fields and follow the approved policy. Delete only after those checks pass. If purpose, authority, jurisdiction, or backup behavior is unclear, choose **HOLD**; do not infer consent from a client email or a dashboard toggle.

## Field-level exit procedure

Create a disposition register with `record_class`, `system`, `client_scope`, `data_owner`, `purpose`, `legal_or_policy_basis_as_approved`, `requested_at_utc`, `action`, `access_restriction`, `retention_end_or_review_at`, `operator`, `evidence_uri`, and `verification_status`. Inventory the CRM, sending tool, object storage, ticket system, local exports, logs, and backups. For each location, record a count or object identifier before acting. Export with a manifest and checksum; revoke tokens and test a failed access; delete through the system’s documented workflow; then sample-search for the old identifier. Keep suppression evidence separate from ordinary campaign history so deletion does not accidentally make an opted-out person eligible again.

## Failure cases and stop condition

Watch for stale analyst spreadsheets, shared credentials, backups outside the normal deletion job, duplicate contacts with different casing, and client exports that include another client’s records. A deletion task is incomplete if only the visible campaign list is empty. Stop when a cross-client match appears, a required approval is missing, the export recipient cannot be verified, or a backup exception is not documented. Escalate to the responsible privacy or legal owner and preserve the hold record; do not “clean up” evidence while the decision is unresolved.

This is operational guidance, not a legal conclusion. Applicable retention and deletion duties vary by contract, policy, and jurisdiction. Re-check the approved basis and vendor process as of the execution date rather than relying on this article’s **2026-09-25** publication date.

## Related operational links

Use the [agency cold-email client offboarding](/repmail/learn/outreach/agency-cold-email-client-offboarding) runbook for access closure, [outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules) for do-not-contact controls, and [cold-email compliance recordkeeping](/repmail/learn/compliance/cold-email-compliance-recordkeeping) for evidence design.

## Sources

[1]: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business "FTC CAN-SPAM compliance guide"
[2]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/business-to-business-marketing/ "ICO business-to-business marketing guidance"
