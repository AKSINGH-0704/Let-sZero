---
contentType: guide
slug: "agency-cold-email-client-offboarding"
title: "Agency Client Offboarding: Domains, Mailboxes, and Suppression"
description: "A controlled agency exit runbook for stopping sends, revoking access, preserving suppression, and handing off client domains and mailboxes."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["agency-outreach", "offboarding", "suppression", "operations"]
featured: false
collections: ["tool-reviews"]
learningPaths: ["getting-started"]
keyTakeaways:
  - "Stop scheduled sends before changing ownership or deleting access."
  - "Client-owned and agency-owned infrastructure require different handoffs."
  - "Contracts, applicable law, and counsel control retention and deletion decisions."
prerequisites:
  - label: "Review outbound suppression rules"
    href: "/repmail/learn/lead-generation/outbound-suppression-rules"
commonMistakes:
  - "Deleting a mailbox before exporting the agreed evidence and suppression data."
  - "Reusing an opted-out contact or domain in another client workflow."
  - "Treating credential revocation as proof that scheduled jobs and integrations are stopped."
faqs:
  - question: "Should the agency delete all client data immediately?"
    answer: "Not automatically. Follow the contract, documented retention policy, applicable requirements, and counsel direction; record what was exported, archived, suppressed, or deleted."
  - question: "Can an agency reuse a client sending domain?"
    answer: "Only if the rightful owner authorizes it and the operational and contractual implications are reviewed. Never reuse client data or suppressed contacts merely because infrastructure is available."
nextStep:
  label: "Next: review client data retention"
  href: "/repmail/learn/outreach/agency-client-data-retention-deletion"
  description: "Separate operational shutdown from records decisions."
assets:
  - type: checklist
    title: "Agency Agency Client Offboarding: Domains, Mailboxes, and Suppression worksheet"
    content:
      - "Record the owner, scope, evidence link, status, and checked date for each control."
      - "Mark the item HOLD when required evidence is missing or a decision is uncertain."
      - "Attach the completed record to the client or incident review before proceeding."
---
Offboarding is complete when no client send can run, access is revoked or transferred, suppression records are preserved as required, and the disposition of every domain, mailbox, list, and export is documented. Use this runbook in order; do not begin by deleting credentials.

## Stop first, then decide disposition

1. **Freeze sends.** Pause campaigns, schedulers, queues, retries, API keys, webhooks, and automations. Capture the time and operator.
2. **Confirm the stop.** Check the next-send queue, job logs, provider activity, and any secondary sending path. A disabled user account is not enough evidence.
3. **Preserve a restricted handoff.** Export the agreed campaign configuration, delivery/feedback records, suppression events, and access inventory. Do not export more personal data than the contract and purpose require.
4. **Reconcile suppressions.** Keep explicit opt-outs and complaints available to prevent reintroduction during any transition. The [suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules) article explains the operational distinction between an exclusion and a deleted record.
5. **Revoke and rotate.** Remove agency users, tokens, SMTP/API credentials, DNS-change access, mailbox sessions, and shared secrets. Rotate secrets that were visible to departing operators.
6. **Apply the decision tree.**

```text
Is the domain client-owned?
├─ Yes → transfer registrar/DNS/mailbox administration, document acceptance, then remove agency access.
└─ No  → check the contract and owner approval before retaining, retiring, or transferring it.

Are mailboxes client-owned?
├─ Yes → return or disable under the agreed handoff; confirm forwarding and recovery settings.
└─ No  → export only agreed records, disable sending, and document whether the mailbox is retired.

Is a record a suppression or complaint?
├─ Yes → preserve and enforce it according to policy; never use deletion to erase the instruction.
└─ No  → route export, archive, or deletion through the retention decision.
```

## Handoff checklist

| Item | Evidence to attach | Status |
| --- | --- | --- |
| Campaigns and queues stopped | Queue view, job log, timestamp | ☐ |
| Domain registrar/DNS custody decided | Owner, transfer or retirement record | ☐ |
| Mailbox recovery and forwarding checked | Admin confirmation | ☐ |
| Suppression and complaint records handled | Restricted export or policy reference | ☐ |
| Access and tokens revoked | User/token inventory with reviewer | ☐ |
| Client acceptance recorded | Named recipient and date | ☐ |

Operational shutdown is not a legal conclusion. Read the [recordkeeping guidance](/repmail/learn/compliance/cold-email-compliance-recordkeeping) and have the client or counsel decide what must be retained. Never resell or reuse opted-out contacts.

## Related internal resources

- [Sending domain vs mailbox](/repmail/learn/infrastructure/sending-domain-vs-mailbox)
- [Sender reputation recovery plan](/repmail/learn/deliverability/sender-reputation-recovery-plan)

## Close with evidence gates

Use one operator and one reviewer. Snapshot campaigns, recurring jobs, retries, feedback destinations, DNS, mailbox recovery, and integrations. Freeze sends, then prove the stop through queue state, job logs, provider events, and a negative test; revoked login access alone is not proof.

| Gate | Evidence | Stop rule |
| --- | --- | --- |
| Freeze | operator, UTC time, job IDs | Stop while any queue/retry/webhook remains |
| Suppression | address/domain, reason, export hash | Stop if opt-out is absent downstream |
| Ownership | domain, mailbox, provider, registrar | Stop before transfer acceptance |
| Access | users, tokens, sessions, revoke time | Stop if shared secret cannot rotate |
| Retention | contract clause, purpose, disposition | Qualify with client/counsel |
| Acceptance | reviewer, date, open items | Stop closure until exceptions acknowledged |

Compare local records with provider-specific behavior; [Amazon SES suppression documentation](https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html) is an example, not a universal rule. Keep a restricted manifest, checksum, incident timeline, and retention status. After acceptance rotate visible secrets and watch for stray sends. If one occurs, reopen the incident rather than declaring completion.

## Sources

[1]: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business "FTC CAN-SPAM compliance guide"
[2]: https://support.google.com/mail/answer/81126?hl=en "Google email sender guidelines"
[3]: https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html "Amazon SES suppression list"
