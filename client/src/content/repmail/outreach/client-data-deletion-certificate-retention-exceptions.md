---
product: repmail
academy: outreach
contentType: template
slug: client-data-deletion-certificate-retention-exceptions
title: "Client data deletion certificate and retention exception log"
description: "Client data deletion certificate and retention exception log — Teams cannot prove what was deleted, retained, or held after exit."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","compliance","agency","client","deletion","certificate"]
assets:
  - type: table
    title: "Retention-exception diagnostics table"
    content:
      headers: ["Situation","Immediate required evidence","Owner to assign","Action within 48 hours","Stop condition"]
      rows:
        - ["Exported user mailbox but export file missing","Export job ID or audit log screen, ticket explaining missing file","Operations owner","Open vendor support ticket; capture admin console screenshot","Export file or vendor confirmation attached"]
        - ["Cannot delete due to legal hold","Court order or legal hold notice reference and legal review note","Privacy/legal lead","Record hold details in exception log; notify client contact","Legal hold noted and documented in exception log"]
        - ["Third-party archive prevents deletion","Vendor contract clause and vendor ticket ID","Vendor manager / Ops","Capture vendor response and escalate contract team","Vendor confirms deletion timeline or alternative"]
        - ["Data stored in client-controlled system (no admin access)","Correspondence showing client control and request","Account lead","Request client-provided deletion confirmation or signed certificate","Client-provided confirmation attached"]
        - ["Technical failure prevents deletion (e.g., replication)","Replication/backup job IDs and incident ticket","SRE/operations","Mitigate replication, schedule deletion retry, and log workaround","Deletion job completes or documented mitigation accepted"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Teams cannot prove what was deleted, retained, or held after exit"
  - "Distinct from data retention article: operational certificate and exception register."
  - "Link to offboarding evidence pack and legal review."
commonMistakes:
  - "Skipping this check: Identify the technical owner and security/privacy reviewer before offboarding begins"
  - "Skipping this check: Run deletions/exports and capture job IDs or admin audit logs for each system"
  - "Skipping this check: Create the deletion certificate with system artifact references and sign it (name/role/timestamp)"
faqs:
  - question: "Does this certificate replace a legal hold or court order?"
    answer: "No. The certificate is an operational attestation of actions taken by your team. If a legal hold or court order applies, record it in the retention-exception log and escalate to legal; do not delete data subject to a legal hold."
  - question: "What if the vendor’s console does not show deletion job IDs?"
    answer: "Capture alternate primary artifacts: admin account audit logs, support ticket IDs, timestamps of API calls, and screenshots of the action. When vendor telemetry is limited, record the limitation explicitly and attach the vendor support response. Note uncertainty where provider behavior is unknown."
  - question: "How long should we keep the certificate and exception log?"
    answer: "Retain these records for at least as long as your contractual or regulatory obligations require. Operationally, keep them with the offboarding evidence pack until all exceptions are resolved and then for the standard record-retention period your organization uses. If in doubt, consult legal for retention periods tied to regulatory requirements."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Provide an operational certificate and a short retention-exception log at offboarding to produce verifiable evidence about what client data was deleted, retained, or held. The certificate is a signed statement from the technical owner; the exception log records specific files, systems, legal holds, or transfer events that prevented deletion, with timestamps and owners. Together they close the common audit gap where teams cannot prove what happened to data after a relationship ends.

## What this certificate and log are for

The certificate is an authoritative, short record stating what was removed and by whom, with references to supporting artifacts (screenshots, job IDs, export hashes). The retention-exception log lists items intentionally retained or inaccessible, stating the business/legal reason, retention owner, and an expected disposition date. The two documents together form the operational evidence required for privacy commitments and audits.
Decision boundary: this document is not a full legal opinion; it is an operational record produced by the engineering or operations team. It does not replace legal holds or court orders but should reflect them.
Evidence limits: use primary system artifacts (deletion job IDs, admin console logs, export hashes) as attachments. Where vendor UI screenshots or export files are unavailable, log the alternate evidence and why it’s missing.

## Who must produce and sign them

Owners: the technical offboarding owner (IT/SRE/operations) produces the certificate and populates the exception log. The security or privacy lead reviews and signs off on accuracy. The customer-facing account leader should receive copies for client records.
Sequence: produce the certificate immediately after deletion tasks complete and before final contract closure. Update the exception log continuously during the offboarding window until the final handover. A separate legal review step is required if exceptions cite litigation, subpoena, or other legal holds.
Stop conditions: the certificate is final when the operations owner, security/privacy reviewer, and account lead have signed and attached supporting artifacts. It should be stored in the offboarding evidence pack.

## Minimum fields for the deletion certificate

Include: client identifier, offboarding date range, systems involved (e.g., S3 bucket my-client-data, G Suite user: alice@client), summary actions (deleted, exported, anonymized), deletion job identifiers or admin action IDs, attached artifact references (file paths in evidence pack), and signatory (name, role, timestamp). Keep the narrative concise—focus on verifiable facts rather than policy explanations.
Decision boundary: do not include internal troubleshooting notes or unrelated incident timelines in the certificate. Those belong in the operations ticket but may be cross-referenced.

## Minimum fields for the retention-exception log

For each exception row include: exception ID, object or dataset identifier (exact path, URL, or UID), reason code (legal_hold, client_request, technical_infeasibility, third_party_dependency), retaining owner (name and role), evidence attached (e.g., court order PDF or ticket link), expected review or disposition date, and current status (active, resolved, transferred). These fields make the log machine-readable and auditable.
Evidence limits: if a provider does not permit deletion (e.g., archived by a third party), note the provider, the exact constraint, steps taken, and the vendor support ticket ID. Where platform capabilities vary, state the uncertainty and planned next step.

## Practical sequence to create and attach evidence

1) Run deletion/export operations and capture system artifacts (export files, job IDs, Admin console logs). 2) Immediately write the certificate summarizing actions with direct references to those artifacts and sign it. 3) Populate retention-exception rows for any items you could not delete, with evidence and owner. 4) Submit for security/privacy review and legal review when required, then add to the offboarding evidence pack.
Stop conditions and checkpoints: do not mark the offboarding complete until the certificate is signed and exception log entries with active exceptions have next-review dates. If a legal hold appears after sign-off, create a new exception entry and update the certificate addendum.

## Practical checklist

- [ ] Identify the technical owner and security/privacy reviewer before offboarding begins
- [ ] Run deletions/exports and capture job IDs or admin audit logs for each system
- [ ] Create the deletion certificate with system artifact references and sign it (name/role/timestamp)
- [ ] Log each retained item in the retention-exception register with a reason, owner, and expected disposition date
- [ ] Attach supporting evidence (screenshots, export hashes, vendor ticket IDs) to the offboarding evidence pack
- [ ] Route certificate and exception log to security/privacy and legal when exceptions cite subpoenas or litigation
- [ ] Provide the client-facing account lead a copy or digest of the certificate and exception log
- [ ] Set calendar reminders for exception review dates and record each review outcome
- [ ] Archive the signed certificate and exception log in your offboarding evidence pack and backup location

## Where RepMail fits

Use this article as a practical checklist and decision aid when preparing offboarding evidence for outbound client communications or audit attachments. The certificate and exception log are concise artifacts you can attach to an offboarding evidence pack and reference in client-facing messages or handovers; they help reduce follow-up questions and speed legal or compliance review without implying any RepMail product feature or integration.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Client consent and evidence register for outbound approvals](/repmail/learn/outreach/client-consent-evidence-register-outbound)
- [Agency permission matrix for client, contractor, and vendor roles](/repmail/learn/outreach/agency-permission-matrix-client-contractor-vendor)


## Sources

[1]: https://knowledge.workspace.google.com/admin/users/maintain-data-security-after-an-employee-leaves "Google sender or Workspace documentation"
[2]: https://learn.microsoft.com/en-us/microsoft-365/admin/add-users/remove-former-employee?view=o365-worldwide "Microsoft documentation"
