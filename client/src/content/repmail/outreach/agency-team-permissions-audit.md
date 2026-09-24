---
contentType: guide
slug: "agency-team-permissions-audit"
title: "Agency Team Permissions and Outreach Audit Trail"
description: "A least-privilege checklist for agency outreach roles, client boundaries, joiner-mover-leaver controls, and audit evidence."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["agency-outreach", "permissions", "security", "audit"]
featured: false
collections: ["tool-reviews"]
learningPaths: ["getting-started"]
keyTakeaways:
  - "Inventory permissions by client, system, role, and last review."
  - "Separate operational access from DNS, billing, export, and approval rights."
  - "Keep an emergency revoke path and evidence of each review."
prerequisites:
  - label: "Understand email infrastructure boundaries"
    href: "/repmail/learn/infrastructure/email-infrastructure-explained"
commonMistakes:
  - "Auditing users but not API keys, recovery accounts, or shared credentials."
  - "Giving one role both production editing and final approval without a reason."
  - "Treating a completed review as proof that an undocumented access path does not exist."
faqs:
  - question: "How often should an agency review access?"
    answer: "Set a cadence appropriate to risk and contract, and review immediately after joiner, mover, leaver, incident, client ownership, or provider changes."
  - question: "Should clients see the full agency access inventory?"
    answer: "Define client visibility in the contract and operating model. Clients should receive the access facts needed to understand their boundary without exposing unrelated tenants."
nextStep:
  label: "Next: review agency offboarding"
  href: "/repmail/learn/outreach/agency-cold-email-client-offboarding"
  description: "Apply revoke and handoff controls when access changes."
assets:
  - type: checklist
    title: "Agency Agency Team Permissions and Outreach Audit Trail worksheet"
    content:
      - "Record the owner, scope, evidence link, status, and checked date for each control."
      - "Mark the item HOLD when required evidence is missing or a decision is uncertain."
      - "Attach the completed record to the client or incident review before proceeding."
---
An outreach access audit should answer **who can do what for which client, through which system, and when the permission was last reviewed**. Use least privilege, named owners, and an emergency revoke path. Do not invent role names for a platform that has not documented them; map the control to the actual provider or application.

## Access inventory

| Principal | System / client scope | Permission | Reason | Owner | Last review | Revoke path |
| --- | --- | --- | --- | --- | --- | --- |
| `__________` | `__________` | View / edit / approve / export / admin | `__________` | `__________` | `__________` | `__________` |

Inventory human accounts, service accounts, API keys, SMTP credentials, mailbox recovery addresses, registrar/DNS users, billing users, exports, and shared secrets. Mark any account that crosses client boundaries. The [infrastructure guide](/repmail/learn/infrastructure/email-infrastructure-explained) helps distinguish layers that should not be bundled into one permission.

## Review controls

- **Joiner:** access is approved by role and client scope; credentials are unique and recovery is recorded.
- **Mover:** old client access is removed before the new scope is granted where practical; approval rights are rechecked.
- **Leaver:** scheduled sends are checked, sessions and tokens are revoked, shared secrets are rotated, and the evidence is attached.
- **Emergency:** a named operator can pause sends and revoke credentials without waiting for a routine meeting.
- **Cadence:** each review records reviewer, date, exceptions, remediation owner, and due date.

For AWS SES or another provider, use the provider’s current authorization model rather than copying a generic RBAC vocabulary. The [offboarding runbook](/repmail/learn/outreach/agency-cold-email-client-offboarding) covers the lifecycle handoff; [recordkeeping](/repmail/learn/compliance/cold-email-compliance-recordkeeping) covers evidence decisions.

## Audit result

Mark each line `retain`, `reduce`, `revoke`, or `investigate`. A pass means the access is explained and current, not that the system is risk-free. Escalate unexplained cross-client visibility, export access without a business purpose, dormant credentials, and missing recovery ownership.

## Run the access review

The audit owner exports or inventories human accounts, service accounts, API keys, SMTP credentials, mailbox recovery addresses, registrar and DNS users, billing roles, exports, webhooks, and shared secrets. For every principal, record client scope, system, permission, authentication method, business reason, owner, grant date, last use, last review, recovery path, reviewer, exception expiry, and revoke action. The client owner approves client-specific access; the agency security owner reviews cross-client scope; the delivery lead confirms operational need; and the incident operator retains an emergency pause and revoke path. Use the provider’s actual authorization model rather than assuming a generic role exists.

Follow this order: (1) map each permission to a task; (2) identify rights that combine production edit, approval, export, billing, or DNS control; (3) verify joiner, mover, and leaver events against current access; (4) test a revoke path in a controlled way; (5) classify each line as retain, reduce, revoke, or investigate; and (6) record exceptions with an owner and expiry. The [email infrastructure guide](/repmail/learn/infrastructure/email-infrastructure-explained) helps separate layers, while the [offboarding runbook](/repmail/learn/outreach/agency-cold-email-client-offboarding) covers lifecycle actions.

| Finding | Immediate action | Closure evidence |
| --- | --- | --- |
| Dormant or unowned credential | Disable or rotate; check scheduled work | Revocation event and send-path test |
| Cross-client visibility without purpose | Restrict scope and investigate access | Boundary review and owner sign-off |
| Leaver with active token or session | Revoke, rotate shared secrets, inspect jobs | Access log and queue check |
| Approval and production edit combined | Separate or document exception | Approval rationale and expiry |

Stop a campaign or export if an unknown principal can edit the audience, sender, suppression, or schedule; if a secret is exposed; or if a former worker can still send. Roll back access changes only when the owner confirms the replacement path works; otherwise keep the risky permission revoked and use the emergency operator. Preserve audit evidence, affected client scope, and event IDs. Resume operations only after least-privilege access is verified, recovery ownership is named, and the delivery lead records the new review date. A completed audit does not prove that undocumented access paths do not exist.

## Sources

[1]: https://docs.aws.amazon.com/ses/latest/dg/sending-authorization.html "Amazon SES sending authorization"
[2]: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business "FTC CAN-SPAM compliance guide"
