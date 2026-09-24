---
contentType: guide
slug: "agency-client-domain-ownership"
title: "Per-Client Outbound Domain Ownership and Access Matrix"
description: "A decision guide and access matrix for registering, paying for, administering, recovering, and transferring each client sending domain."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["agency-outreach", "domain-ownership", "dns", "governance"]
featured: false
collections: ["tool-reviews"]
learningPaths: ["getting-started"]
keyTakeaways:
  - "Ownership, custody, administration, and access are different controls."
  - "Assign a named recovery path and renewal alert before sending."
  - "Transfer decisions should follow the contract and owner approval, not convenience."
prerequisites:
  - label: "Understand separate sending domains"
    href: "/repmail/learn/infrastructure/separate-sending-domain-for-cold-email"
commonMistakes:
  - "Recording an agency login as proof that the client owns the domain."
  - "Leaving renewal and recovery alerts tied to a departing operator."
  - "Making DNS changes without a client-approved change record."
faqs:
  - question: "Should the agency or client register the domain?"
    answer: "There is no universal answer. Choose the party that the contract and operating model make accountable, then document payment, custody, recovery, and transfer."
  - question: "Does DNS access equal ownership?"
    answer: "No. DNS administration is an access permission. Registrar custody, billing, legal rights, and recovery contacts are separate decisions."
nextStep:
  label: "Next: verify the sending domain"
  href: "/repmail/learn/deliverability/verify-your-sending-domain"
  description: "Test the records after ownership is agreed."
assets:
  - type: checklist
    title: "Agency Per-Client Outbound Domain Ownership and Access Matrix worksheet"
    content:
      - "Record the owner, scope, evidence link, status, and checked date for each control."
      - "Mark the item HOLD when required evidence is missing or a decision is uncertain."
      - "Attach the completed record to the client or incident review before proceeding."
---
Choose domain ownership by documenting who controls custody, payment, DNS changes, recovery, and transfer. Do not collapse those decisions into a single “admin” field. The matrix below is a governance artifact, not a legal ownership opinion.

## Decide custody before setup

Ask, in order: **Who should retain the domain if the engagement ends?** **Who can pay and renew it?** **Who can approve DNS changes?** **Who receives recovery notices?** **Who can export the configuration?** If the answers differ, record the split rather than forcing one owner.

## Access matrix

| Control | Client owner | Agency operator | Backup/recovery | Evidence |
| --- | --- | --- | --- | --- |
| Registrar account | Named person/team | View or delegated access only | Client security owner | Account and recovery record |
| Billing and renewal | Client or contract owner | Notification access | Finance backup | Renewal date and alert test |
| DNS records | Client IT or delegated agency | Change request executor | Client IT backup | Approved ticket and before/after values |
| Mailbox administration | Client or provider owner | Operational access as needed | Client recovery contact | Inventory and recovery test |
| Authentication keys | Controlled technical owner | Least-privilege use | Key custodian | Rotation and revocation log |
| Termination transfer | Contract-designated owner | Handoff support | Escalation contact | Acceptance record |

The [DNS records guide](/repmail/learn/infrastructure/dns-records-for-email) explains what the records do. This article answers who may request and approve a change. Use [domain verification](/repmail/learn/deliverability/verify-your-sending-domain) only after the matrix has a current owner.

## Change and termination rules

Every DNS request should include the record purpose, requested value, requester, approver, change window, rollback value, and verification result. Store access in a password manager or provider control plane rather than in an article or spreadsheet. Review the matrix when a client contact, agency operator, registrar, mailbox provider, or contract changes.

At termination, transfer or retire the domain according to the documented owner decision. Remove agency access only after the client accepts the handoff or the retirement evidence is complete. This process does not decide legal title; involve the contract owner and counsel when the parties disagree.

## Make ownership transfer-ready

Before buying a domain or publishing authentication, record contract owner, registrar, billing party, DNS administrator, provider owner, recovery contact, renewal date, delegated users, and transfer recipient as separate fields. An agency can execute DNS without owning the domain; a client can own it while delegating administration.

| Control | Evidence | Stop rule |
| --- | --- | --- |
| Custody | registrar and named owner | Stop if recovery is tied to a leaver |
| Renewal | billing party, date, alert test | Stop without backup alert |
| DNS | scope, ticket, before/after values | Stop unapproved high-impact change |
| Identity | provider, selector, From domain | Qualify provider-managed records |
| Access | user, role, grant/review date | Stop if shared credentials persist |
| Transfer | recipient, acceptance, manifest, date | Stop until acceptance |

Verify chosen-provider records with [AWS SES identity documentation](https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html) and receiver context with [Google sender guidelines](https://support.google.com/mail/answer/81126). Provider docs are configuration evidence, not ownership or placement proof. At termination run a delta review, test recovery, attach acceptance, and escalate title disputes to the contract owner or counsel.

## Sources

[1]: https://support.google.com/mail/answer/81126?hl=en "Google email sender guidelines"
[2]: https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html "Amazon SES creating and verifying identities"
