---
product: repmail
academy: infrastructure
contentType: template
slug: email-infrastructure-ownership-matrix-agency
title: "Email Infrastructure Ownership Matrix for Agencies"
description: "Use a client-ready RACI to assign ownership for DNS, providers, credentials, content, suppression, monitoring, and incidents."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["agency", "raci", "governance"]
collections: ["email-infrastructure-decisions", "email-platform-essentials"]
learningPaths: ["email-infrastructure"]

keyTakeaways:
  - "Name one accountable owner for every high-impact control."
  - "Let clients retain decisions they legally or operationally own, especially domains and access."
  - "Add escalation and evidence requirements, not only task names."
faqs:
  - question: "Who should be accountable for DNS?"
    answer: "Usually the domain owner or the client’s designated IT owner. An agency can be responsible for preparing and testing a change without becoming the accountable domain owner."
  - question: "Can one person hold every RACI role?"
    answer: "They can in a small team, but document the concentration of control and use a second reviewer for high-blast-radius changes."
  - question: "What should be included in offboarding?"
    answer: "Domains, DNS access, provider accounts, credentials, event subscriptions, templates, suppression records, monitoring, and a handover of open incidents."
nextStep:
  label: "Choose the sending platform operating model"
  href: /repmail/learn/email-platform/email-sending-platform-selection
  description: "Continue with the closest operational guide."
assets:
  - type: template
    title: Agency email RACI
    content: {"headers": ["Control", "Client", "Agency", "Provider", "Evidence / escalation"], "rows": [["Domain registration and DNS", "A/R", "C", "I", "Change ticket and rollback"], ["Provider account and billing", "A/R", "C", "I", "Account owner"], ["Credentials and access", "A", "R", "C", "Access review"], ["Content and audience", "A/R", "R", "C", "Approval record"], ["Suppressions and complaints", "A", "R", "C", "Event and action log"], ["Incident response", "A", "R", "C", "Timeline and decision log"]]}
---

An agency RACI for email infrastructure should make responsibility visible before a migration or incident. RACI means **Responsible** for doing the work, **Accountable** for the outcome, **Consulted** for input, and **Informed** for notification. Adapt the matrix to each client; never assume the agency controls DNS, provider accounts, or recipient data.

## Assign the control plane

Start with the [email infrastructure model](/repmail/learn/infrastructure/email-infrastructure-explained). Identify who owns domain registration, DNS, mailbox administration, provider accounts, sending applications, credentials, event destinations, templates, audience approval, suppression, and monitoring. For each row, require one accountable role even if several parties are responsible for execution.

A client commonly remains accountable for domains, brand identity, audience authorization, and business approvals. The agency may be responsible for campaign configuration, QA, and first-line monitoring. The provider is consulted for platform behavior and incidents, but a provider’s existence does not transfer the client’s accountability.

## Add evidence and escalation

Every row should name the artifact that proves completion: a DNS change ticket, provider account owner, access review, rendered-template approval, suppression event, or incident timeline. Define who is paged for authentication failure, bounce spikes, complaint signals, provider blocks, and compromised credentials. Link the recovery owner to the [sender reputation recovery plan](/repmail/learn/deliverability/sender-reputation-recovery-plan).

Review the matrix at onboarding, provider change, team change, and offboarding. During offboarding, transfer domain access, API credentials, suppression data, templates, event subscriptions, and historical evidence. Keep a client-specific exception log where a row differs from the default model.

## Avoid ambiguous ownership

Do not write “shared” without naming who approves, who executes, and who is notified. Do not let an agency promise receiver outcomes it cannot control. If the provider’s [platform selection](/repmail/learn/email-platform/email-sending-platform-selection) limits audit, export, or isolation, record that constraint as a decision rather than hiding it in operations.

## Related resources

The [Email Infrastructure academy](/repmail/learn/infrastructure/email-infrastructure-explained) is the natural hub for this matrix.

This workflow should be checked against the cited standards and current provider documentation [1].

## Operate the RACI at four gates

Use the matrix at intake, preflight, incident, and exit. At intake record the client domain owner, provider owner, data steward, and escalation contact. At preflight require approval for the exact value, evidence, and rollback. During an incident the accountable owner decides whether to pause; the operator preserves provider responses and timestamps. At exit the client accepts the inventory before access is removed. This assigns control; it does not promise receiver acceptance or placement.

| Control | Evidence fields | Stop rule |
| --- | --- | --- |
| DNS/domain | owner, ticket, before/after value | Stop without owner/delegate approval |
| Credentials | scope, custodian, rotation, revoke path | Stop when a secret is shared and ownerless |
| Suppression | source, reason, timestamp, systems | Stop if an opt-out misses any send path |
| Monitoring | alert owner, threshold, evidence URL | Pause ramp when telemetry is missing |
| Incident | severity, decision maker, timeline | Pause when receiver evidence is ambiguous |

Reject “shared,” “platform,” or “agency” without a named team, scope, and escalation clock. Cross-check the [Google sender guidelines](https://support.google.com/mail/answer/81126) and [Microsoft authentication overview](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about). Reopen after a registrar transfer, provider migration, credential incident, contact change, or complaint spike.

## References

[1]: https://support.google.com/mail/answer/81126?hl=en-GB "Google Workspace sender guidelines"
[2]: https://knowledge.workspace.google.com/admin/security/set-up-dmarc "Google Workspace DMARC setup"
[3]: https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about "Microsoft Defender email authentication"

