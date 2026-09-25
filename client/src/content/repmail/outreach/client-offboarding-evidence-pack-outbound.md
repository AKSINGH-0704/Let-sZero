---
product: repmail
academy: outreach
contentType: template
slug: client-offboarding-evidence-pack-outbound
title: "Client offboarding evidence pack for outbound operations"
description: "Client offboarding evidence pack for outbound operations — Exit tasks are done but there is no auditable handover record."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","agency","client","offboarding","evidence"]
assets:
  - type: table
    title: "Offboarding evidence diagnostic table"
    content:
      headers: ["Item","Required proof","Owner","Stop condition"]
      rows:
        - ["Mailbox export","Export file (MBOX/ PST/CSV), checksum, export timestamp","Outbound operator","Export file present, checksum verified"]
        - ["Deleted API keys","Admin audit log + screenshot or provider ticket","Platform engineer","Attempted key use fails; admin log shows deletion"]
        - ["Campaign history","Campaign export with timestamps and recipient lists","Campaign manager","Export includes date range claimed"]
        - ["Domain/DNS handover","Registrar transfer receipt or DNS change log","IT lead","Registrar shows new owner or DNS points to client system"]
        - ["Client acceptance","Signed acceptance form with manifest","Account owner","Signed form received within acceptance window"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Exit tasks are done but there is no auditable handover record"
  - "Existing offboarding page covers workflow; this packages proofs, exports, acceptance, and deletion evidence."
  - "Link to offboarding, data retention, and reporting."
commonMistakes:
  - "Skipping this check: Export all campaign data and mailboxes with timestamps and checksums."
  - "Skipping this check: Capture admin audit logs or provider support tickets for each deletion or transfer."
  - "Skipping this check: Rotate or revoke API keys and credentials, and document the exact commands or UI steps."
faqs:
  - question: "What if the client does not respond to the acceptance request?"
    answer: "Follow the contract’s escalation and retention clauses. Practically, document the delivery and start an audit trail (timestamped delivery message and any follow-ups). If no response within the agreed window (commonly 7–14 days), record an entry in the pack stating non-response and the next contractual step; do not assume acceptance."
  - question: "Can screenshots alone prove deletions?"
    answer: "Screenshots are usable evidence when system logs are unavailable, but they are weaker than provider audit logs. If screenshots are used, include multiple corroborating items: the screenshot with visible admin ID and timestamp, related support ticket IDs, and a verification attempt showing the resource is inaccessible."
  - question: "How long should we retain the evidence pack?"
    answer: "Retention should follow the client contract and applicable law. Operationally, keep the pack at least as long as any dispute window plus the contract-specified retention period. If no contractual guidance exists, retain for a minimum of one year and document the decision in the manifest; state uncertainty for legal minima since jurisdictional rules vary."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Produce a single, auditable evidence pack that proves offboarding work was performed, what was exported, what was deleted or retained, and where responsibility transfers. This template lists concrete evidence items, the decision boundaries for each item, and a compact diagnostic table you can complete and store with the client record. Use the pack to close exits defensibly and to speed future audits.

## What this evidence pack covers and its decision boundary

This pack documents outputs and proofs from agency outbound offboarding: account exports, mailbox and service deletions or transfers, credential rotations, campaign data exports, reporting handover, and client acceptance. Decision boundary: do not use this pack to justify legal retention beyond client instructions or jurisdictional law; it records operational proofs only. Evidence limits: this pack relies on system exports, logs, screenshots, and signed acceptance; it does not replace formal legal or regulatory records (retain those separately). Practical sequence: gather exports first, then produce deletion proofs, then create a final acceptance record and archive the pack.

## Required export and proof artifacts (what to collect)

Collect specific artifact types so an auditor can reconstruct what happened: account export files (CSV/JSON), campaign history exports with timestamps, domain/DNS change logs, provider admin activity logs, and user credential rotation records. Each artifact must include the export timestamp, the exporting account (email/ID), and a checksum or file size to detect tampering. Decision boundary: if a provider does not allow direct export of a type, capture provider support tickets or screenshots showing the limitation and the agreed alternative export format.
Evidence limits: some providers purge activity logs after a retention window; if logs are not available, capture contemporaneous screenshots and a signed statement from the operator. Practical sequence: prioritize exports with short retention windows (mailboxes, analytics) first, then gather longer-lived records (contracts, invoices).

## Deletion, disabling, and retention evidence (how to prove removal)

For each deleted or disabled object (mailbox, app client, API key), collect: an admin action audit log entry, a screenshot of the deletion confirmation including timestamp and admin ID, and the follow-up verification (attempted sign-in failure with recorded error message). Include retention rationale and owner for any data kept (customer request, legal hold). Decision boundary: never rely solely on verbal confirmation; require a recorded system action or provider ticket. Evidence limits: some provider UIs obscure timestamps—capture surrounding log lines or support case IDs to link actions to time.
Practical sequence: disable credentials immediately after exporting data, then perform deletions, and finally verify by attempting access or checking status endpoints. Record who performed each step and the exact command or UI path used.

## Acceptance, signoff, and transfer of responsibility

A defensible offboard requires explicit client acceptance. Include a signed (electronic signature acceptable) acceptance form listing exported files, deletion proofs, and retained items with reasons. Record acceptance date and the person authorized to accept on the client side. Decision boundary: silence is not acceptance—define a reasonable response window (commonly 7–14 calendar days) after delivering the evidence pack; if no acceptance, follow contract escalation terms.
Evidence limits: electronic acceptance should include message headers or audit logs proving the signer’s identity if disputes arise. Practical sequence: deliver the pack with a clear acceptance form, mark the start of the acceptance window, and record any client questions and the responses as part of the pack.

## Packaging, storage, and chain-of-custody instructions

Store the evidence pack as a single archive (e.g., passworded ZIP) with a manifest file listing contents, checksums, and the preparer’s identity. Record where the archive is stored (S3 bucket/path, internal drive location) and access controls and retention schedule tied to the client contract. Decision boundary: do not store sensitive exports in shared, uncontrolled locations; use restricted access and record every accessor. Evidence limits: cloud object metadata can change—preserve checksums and an exported metadata snapshot at the time of archiving.
Practical sequence: assemble artifacts, create the manifest and checksums, upload the archive to the chosen storage, then record access policy and retention timeline in the manifest.

## Practical checklist

- [ ] Export all campaign data and mailboxes with timestamps and checksums.
- [ ] Capture admin audit logs or provider support tickets for each deletion or transfer.
- [ ] Rotate or revoke API keys and credentials, and document the exact commands or UI steps.
- [ ] Produce a manifest listing files, checksums, and preparer identity and include it in the archive.
- [ ] Deliver the evidence pack to the client with a clear acceptance form and defined response window.
- [ ] Store the archive in a restricted location and record the storage path and retention policy.
- [ ] Record all access to the archive and any subsequent modifications to the manifest.
- [ ] If a provider prevents export, attach support correspondence showing the limitation and agreed alternative.

## Where RepMail fits

Use this evidence pack as a checklist and stored artifact alongside outbound activity records. It helps outbound teams prove what exports and deletions were performed and when, and it supports defensible client handover by providing a repeatable format for packaging and storing proofs. Do not treat this guide as a vendor-specific feature list—adapt stored fields to match the mailbox providers and campaign systems you used.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Client consent and evidence register for outbound approvals](/repmail/learn/outreach/client-consent-evidence-register-outbound)
- [Agency permission matrix for client, contractor, and vendor roles](/repmail/learn/outreach/agency-permission-matrix-client-contractor-vendor)


## Sources

[1]: https://www.trychaser.com/checklist-articles/client-offboarding-checklist-for-agencies "Supporting technical or operational reference"
[2]: https://learn.microsoft.com/en-us/microsoft-365/admin/add-users/remove-former-employee?view=o365-worldwide "Microsoft documentation"
