---
product: repmail
academy: outreach
contentType: template
slug: client-consent-evidence-register-outbound
title: "Client consent and evidence register for outbound approvals"
description: "Client consent and evidence register for outbound approvals — Approvals exist in chat but cannot be reconstructed later."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","compliance","agency","client","consent","evidence"]
assets:
  - type: table
    title: "Decision table: when the register entry is sufficient"
    content:
      headers: ["Situation","Evidence required in register","Verification step","Action threshold"]
      rows:
        - ["Signed approval email exists","Email copy attached; timestamp; approver identity","Validate email header and sender address","Proceed — high trust"]
        - ["Approval given in chat only","Chat screenshot with metadata + approver email confirmation","Confirm screenshot timestamp and request approver reply","Proceed if secondary confirmation present"]
        - ["Approval verbal only","Written note of call + follow-up email requested","Attempt three contacts for written confirmation","Pause send if no written confirmation"]
        - ["Approval recorded in governed ticket","Ticket ID and permalink","Verify ticket history and approver account","Proceed — reference ticket in register"]
        - ["Approver unreachable, evidence missing","Attempts log and status marked ‘unreconstructible’","Escalate to account manager","Hold action until resolved"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Approvals exist in chat but cannot be reconstructed later"
  - "New evidence artifact, distinct from compliance overview and audit logs."
  - "Link to approval matrix, reporting QA, and offboarding."
commonMistakes:
  - "Skipping this check: Create a date-stamped register entry at the time of approval (ISO8601 timestamp)."
  - "Skipping this check: Record approver full name, role, and contact method (email or corporate ID)."
  - "Skipping this check: Specify exact scope: copy version, audience/segment definition, suppression lists, and send window."
faqs:
  - question: "If an approval exists only in Slack, is a screenshot enough?"
    answer: "A Slack screenshot can be acceptable but is lower-trust. The register should include the screenshot with metadata (timestamp, author), and you must obtain a secondary confirmation (a reply email or ticket comment). If you cannot obtain secondary confirmation after three attempts, mark the entry ‘unreconstructible’ and pause the activity."
  - question: "How precise must reconstruction steps be for audience definitions?"
    answer: "Provide the exact filter or query (field names, operators, and values), the data source and timestamp used, and the file or audience ID if applicable. If using analytics audiences, note that analytics tools may evolve — cite the source for directional guidance when needed [2] and include export steps to reproduce the segment."
  - question: "Who owns the register and how long should entries be kept?"
    answer: "Operations should own the register with shared write access to maintain consistency; the requester records the initial entry and the approver confirms it. Retention should match your contractual dispute window and offboarding needs; document retention policy in the account’s offboarding checklist and export the register during transfer [1]."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Create a single, date-stamped register that captures who approved each outbound activity, what they approved, the evidence artifact, and the reconstruction method. This register is the canonical post-hoc source for disputes and for transferring approval context during offboarding; it should be minimal, auditable, and stored outside ephemeral chat threads.

## What this register is — decision boundary and purpose

The register is an operational artifact: a structured record that reconstructs approvals when original chat or verbal approvals aren’t persistent or searchable. It is not a compliance audit log from an email provider or analytics vendor; it must contain human-verifiable evidence and the reconstruction steps rather than raw system telemetry. Use it when approvals are required for copy, list changes, targeting criteria, or sending cadence and when chat histories may be inaccessible later.
The register’s decision boundary excludes routine day-to-day confirmations that already live in a governed system (e.g., ticket approvals embedded in a project tracker). If an approval is captured programmatically in a governed ticketing or legal-signature tool, reference that artifact rather than duplicating it in full.

## Minimum fields and evidence types to capture

Required fields: date/time (ISO8601), approver name and role, approver contact method (email/phone/ID), exact scope of approval (copy/list/segment/suppression), version identifier (file name or message permalink), evidence type (screenshot, signed email, ticket ID), and reconstruction notes (how to verify). Keep entries concise but specific enough to re-create the state exactly.
Evidence types and limits: screenshots of chat are acceptable but note they can be edited — capture metadata (timestamp, message author) and attach the file hash when possible. Signed emails or tickets are higher-trust evidence. Note when evidence is directional (e.g., Google Analytics reference for audience size) and cite the source [2] only for directional guidance about tracking audiences.

## Practical sequence for capturing an approval

1) At the moment of approval, create a register entry or update the pending request with the required fields. 2) Attach or link the supporting artifact(s): exported ticket, signed email, screenshot with metadata, or upload to a governed file store. 3) Add reconstruction steps — exact query or filter needed to re-create the segment, and the file name or ticket ID. Stop only when evidence is attached and the reconstruction steps allow a third party to reproduce the approved action.
Owners and handoffs: the requester owns creating the initial entry; the approver must confirm the record (a second signature or email is best). The operations lead performs a weekly review to ensure entries have evidence and valid reconstruction instructions; escalate missing evidence to account management.

## How to use the register for disputes and offboarding

When a dispute arises, use the register to prove who approved what and when, and to reconstruct the audience, copy, or suppression used at send time. Follow the reconstruction notes to re-run filters or locate the versioned copy; record any deviations found. If chat logs are missing, the register becomes the primary artifact for client-facing remediation and for post-mortem documentation.
For offboarding, export the register with immutable metadata and hand it to the incoming owner. Cross-link register entries with the approval matrix, reporting QA artifacts, and client offboarding checklist to ensure continuity and to avoid re-approval of unchanged items [1].

## Evidence limits, verification, and stop conditions

Do not accept unauthenticated verbal approvals as sole evidence. Screenshots without metadata or signed confirmation are low-trust: mark them as such and require secondary corroboration (email confirmation or ticket). Verification steps should include: matching the approver identity to an account in your org directory, confirming timestamps against system logs, and validating that the referenced file or ticket still exists.
Stop conditions for further chasing: if the approver is unreachable after three attempts and no higher-trust artifact exists, mark the request as ‘unreconstructible’ and pause the outbound action. Escalate to account management and document attempts in the register.

## Practical checklist

- [ ] Create a date-stamped register entry at the time of approval (ISO8601 timestamp).
- [ ] Record approver full name, role, and contact method (email or corporate ID).
- [ ] Specify exact scope: copy version, audience/segment definition, suppression lists, and send window.
- [ ] Attach supporting artifact(s): signed email, ticket ID, screenshot with metadata, or file hash.
- [ ] Write reconstruction steps: exact filter/query, file name, and storage path or permalink.
- [ ] Require approver confirmation in a second artifact (reply email or ticket comment).
- [ ] Weekly ops review to verify entries have evidence and valid reconstruction instructions.
- [ ] Mark and pause any request labeled ‘unreconstructible’ after three failed contact attempts.
- [ ] Export register and link to offboarding package when transferring account ownership.

## Where RepMail fits

Use this register as a practical checklist and decision aid within outbound workflows: record approvals that are only present in chat so they can be reconstructed later, link register entries to the approval matrix and reporting QA artifacts, and include the register in the offboarding export. Do not assume this guide implies any specific RepMail product feature or integration; treat it as an operational artifact to be stored and referenced alongside your tools.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Client data deletion certificate and retention exception log](/repmail/learn/outreach/client-data-deletion-certificate-retention-exceptions)
- [Client offboarding evidence pack for outbound operations](/repmail/learn/outreach/client-offboarding-evidence-pack-outbound)


## Sources

[1]: https://www.trychaser.com/checklist-articles/client-offboarding-checklist-for-agencies "Supporting technical or operational reference"
[2]: https://support.google.com/analytics/answer/9305587?hl=en "Google sender or Workspace documentation"
