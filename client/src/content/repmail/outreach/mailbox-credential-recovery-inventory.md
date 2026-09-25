---
product: repmail
academy: outreach
contentType: template
slug: mailbox-credential-recovery-inventory
title: "Mailbox Credential and Recovery Inventory Template"
description: "Mailbox Credential and Recovery Inventory Template — Owners need a safe inventory of account owner, recovery path, access method, rotation date, and emergency."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","mailbox","credential","recovery"]
assets:
  - type: table
    title: "Mailbox Credential and Recovery Inventory — compact table"
    content:
      headers: ["Field","What to record","Stop condition / verification"]
      rows:
        - ["Mailbox identifier","Full address and any alias mappings","Verified alias resolves to same account in provider settings"]
        - ["Owner (primary/secondary)","Name, role, org email, phone","Primary or secondary can confirm ownership in provider console"]
        - ["Recovery path","Recovery email, phone, delegated admin, or SSO owner; who controls it","Recovery channel receives a test message or delegated admin can view recovery settings"]
        - ["Access method","Web UI, IMAP/POP, delegated access, shared-inbox tool, service account; OAuth/app-password notes","Owner can open mailbox by the recorded method"]
        - ["Last verified","Date of most recent verification and verifier name","Verification performed and logged"]
        - ["Escalation steps & contact","Step-by-step next actions and emergency contact(s) with backups","Escalation contact acknowledges and can begin recovery process"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Owners need a safe inventory of account owner, recovery path, access method, rotation date, and emergency contact without storing secrets."
  - "Distinct from credential rotation: records control metadata and recovery ownership, not rotation procedure."
  - "mailbox access; multi-inbox ownership"
commonMistakes:
  - "Skipping this check: Create one record per mailbox or grouped inbox (do not combine unrelated accounts)."
  - "Skipping this check: Record owner (primary and secondary), role, and contact methods (work email and phone)."
  - "Skipping this check: Capture recovery path details: recovery email/phone, delegated admin, or SSO owner; name the person who controls that recovery path."
faqs:
  - question: "Can I store recovery codes or 2FA secrets in this inventory so on-call can regain access?"
    answer: "No. This inventory must not contain secrets such as passwords, recovery codes, or 2FA seeds. Storing secrets increases risk if the inventory is exposed. Instead record who controls the recovery method (recovery email/phone, delegated admin, or SSO owner) and an emergency contact who can perform the recovery."
  - question: "How often should I verify recovery paths for critical mailboxes?"
    answer: "Verify critical mailboxes (billing, domain admin, customer support) at least quarterly. For lower-risk mailboxes, 6–12 months is a reasonable cadence. Use the verification to confirm the recovery channel still works; do not request secrets — confirm by sending a test message to the recovery email/phone or confirming delegated admin visibility."
  - question: "What if the recorded recovery path does not work during an incident?"
    answer: "If the recorded recovery path fails, follow the documented escalation steps and contact the emergency contact(s). Record the failure and any provider support case numbers in the inventory entry, then update the record to reflect corrected recovery ownership or actions taken. If provider-specific procedures were relied on, note that provider behavior can change and that this information is directional [1]."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Use this template to record mailbox ownership and recovery metadata without storing passwords or tokens. Keep one row per mailbox (or inbox grouping), record the account owner, the recovery path and contacts, access method, last rotation/check date, and escalation instructions so teams can diagnose lockout and reassign access without secrets.

## What this inventory is for and what it is not

This inventory captures control metadata: who owns an account, how it can be recovered, how people normally access it, when access was last verified, and who to call in an emergency. It is explicitly not a credential store — do not record passwords, API keys, 2FA secrets, OAuth refresh tokens, or other secrets in this document.
Decision boundary: any field that could be used to authenticate (passwords, 2FA seed, recovery codes) must be excluded. Record only recovery paths (e.g., recovery email, phone, delegated admin) and the party responsible for that recovery.
Evidence limits: provider procedures for recovery vary; for example Google documents recovery options and best practices but does not guarantee outcomes [1]. Treat provider guidance as directional and verify recovery capability regularly rather than assume it will work in an incident.

## Required fields and why each matters

Owner: the person or role legally/operationally responsible for the mailbox. Use role addresses (e.g., Platform-Owner) if owners rotate frequently. Capture a primary and secondary owner to avoid single points of failure.
Recovery path: record the exact recovery method available (example: recovery email address, recovery phone number, delegated admin account, organization SSO owner) and the owner of that recovery artifact. Note any provider-specific constraints you verified. This field answers “who can ask the provider to reset or prove ownership.”
Access method: note whether the mailbox is accessed via web UI, IMAP, delegated mailbox, shared inbox tool, or service account. This guides troubleshooting steps and indicates whether single-user sign-in is required. Include client types and whether app-specific passwords or OAuth are used.
Rotation/check date: the last date when the owner verified the recovery path and access method still work. Use this to schedule verification and detect drift.
Emergency contact & escalation: name, role, and alternate contact (phone/secondary email). Also record documented emergency steps and stop conditions (e.g., “if recovery-email is unreachable, escalate to IT SRE and request domain admin change”).

## Practical sequence to create and maintain the inventory

Initial capture: do a discovery sweep of all mailboxes used for operations, marketing, billing, and system accounts. For each mailbox, interview current owner to capture the required fields and record evidence (screenshot of recovery settings is allowed only if redacted of secrets).
Verification: schedule the owner to perform a non-destructive recovery check (confirm recovery email/phone and delegated admin access) and mark the rotation/check date. Do not request passwords or 2FA codes as part of verification; instead confirm that the recovery channel receives test messages or that delegated admin can view settings.
Maintenance cadence: verify high-risk mailboxes (customer-facing, billing, domain admin) quarterly and other mailboxes every 6–12 months. Update owner and recovery-path fields when people change jobs; require outgoing owners to transfer ownership in the provider console or capture the recovery path before departure.
Incident use: when lockout occurs, follow the recorded recovery path first. If the recovery path fails, use escalation instructions and the emergency contact. Document outcomes and update the inventory with what worked and what did not.

## Decision/diagnostic table (when a mailbox is inaccessible)

Use this compact decision table to triage an inaccessible mailbox. Each row is a diagnostic path; stop once a successful action restores access or you reach the escalation row and follow emergency contact steps.
Example rows below show practical checks and stop conditions.

## Storage, access controls, and auditability

Where to keep the inventory: store in an access-controlled, auditable system (ticketing system, vault metadata, or encrypted document store). Ensure the permission model limits editing to designated roles and records change history. Do not store the inventory in a public or broadly shared document.
Audit trail and backup: enable logging for edits and export periodic snapshots to an encrypted backup. For legal or compliance requests, retain historical copies per policy but redact ancillary data that may expose personal contacts unnecessarily. Review who has access to the inventory at least annually.

## Practical checklist

- [ ] Create one record per mailbox or grouped inbox (do not combine unrelated accounts).
- [ ] Record owner (primary and secondary), role, and contact methods (work email and phone).
- [ ] Capture recovery path details: recovery email/phone, delegated admin, or SSO owner; name the person who controls that recovery path.
- [ ] Specify access method: web UI, IMAP/POP, delegated mailbox, shared inbox tool, or service account; note OAuth vs. app-password use.
- [ ] Add last verified date and schedule the next verification (quarterly for high-risk, 6–12 months otherwise).
- [ ] Document emergency escalation steps and include an emergency contact with redundancy.
- [ ] Do not record passwords, 2FA seeds, recovery codes, tokens, or other secrets in this inventory.
- [ ] Restrict edit permissions, enable change logging, and store backups encrypted.
- [ ] After any lockout incident, update the record with what worked and change the next verification date.

## Where RepMail fits

Use this template as an operational checklist when configuring mailbox access for outbound programs. Keep the inventory alongside your mailbox access and multi-inbox ownership records so deliverability, ops, and on-call teams can quickly identify who can recover an account and how to proceed during a lockout. Do not assume provider recovery will succeed; verify periodically and update the inventory with incident outcomes.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Client-owned recovery methods and break-glass access plan](/repmail/learn/outreach/client-recovery-methods-break-glass-access)
- [Agency knowledge transfer from departing account owner](/repmail/learn/outreach/agency-departing-account-owner-knowledge-transfer)


## Sources

[1]: https://support.google.com/accounts/answer/7682439 "Google sender or Workspace documentation"
[2]: https://support.google.com/mail/answer/81126 "Google sender or Workspace documentation"
