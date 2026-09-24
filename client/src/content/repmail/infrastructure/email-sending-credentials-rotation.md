---
product: repmail
academy: infrastructure
contentType: engineering-article
slug: email-sending-credentials-rotation
title: "Email Sending Credentials: Rotation and Offboarding"
description: "A provider-neutral runbook for inventorying, rotating, testing, revoking, and offboarding SMTP passwords, API keys, and roles."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["security", "credentials", "smtp", "api"]
collections: ["email-infrastructure-decisions", "email-platform-essentials"]
learningPaths: ["email-infrastructure"]

keyTakeaways:
  - "Inventory credential use before rotating anything."
  - "Prefer scoped, individually attributable credentials with a tested overlap window."
  - "Revoke access and update event consumers during offboarding, then verify no send path remains."
faqs:
  - question: "How often should sending credentials be rotated?"
    answer: "Set a policy based on credential type, exposure, provider capabilities, and risk. Rotate immediately after suspected exposure or ownership change, and record the rationale."
  - question: "Is a shared SMTP account acceptable?"
    answer: "It weakens attribution and offboarding. If it cannot be avoided, restrict its scope, protect it as a service secret, log use, and document a migration to individually attributable credentials."
  - question: "What proves a rotation succeeded?"
    answer: "A controlled send through the real application path, expected provider response, downstream event processing, and successful revocation or failure detection for the old credential."
nextStep:
  label: "Instrument send and provider events"
  href: /repmail/learn/email-platform/email-sending-observability
  description: "Continue with the closest operational guide."
assets:
  - type: checklist
    title: Credential lifecycle checklist
    content: {"headers": ["Control", "Complete"], "rows": [["Credential inventory and owner", "[ ]"], ["Scope and secret storage reviewed", "[ ]"], ["Replacement tested in staging or a safe path", "[ ]"], ["Old credential revoked and monitored", "[ ]"], ["Offboarding evidence archived", "[ ]"]]}
---

Email sending credentials include SMTP passwords, API keys, IAM roles, service accounts, and provider-console access. Treat them as a lifecycle: inventory, scope, issue, test, rotate, revoke, and review. The objective is to reduce unauthorized sending and make each action attributable without publishing or copying a live secret.

## Inventory before changing

Create a record for every credential identifier, owner, provider account, environment, permission scope, storage location, last use, last rotation, and dependent application. Include shared admin accounts and break-glass access. Link each credential to the message stream and event destination it controls. [Email-sending observability](/repmail/learn/email-platform/email-sending-observability) helps reveal which identifiers and states need to remain traceable.

## Rotate with overlap and verification

Create the replacement with the narrowest practical permissions. Store it in the approved secret manager and deploy it through the normal release path. If the provider supports two active credentials, use a short, documented overlap: deploy the new credential, send a controlled test, check provider acceptance and downstream events, then revoke the old one. If overlap is not available, schedule a maintenance window and keep a rollback credential protected rather than leaving the old key active indefinitely.

Test the actual path, not just authentication. Confirm the application can enqueue mail, receives provider responses, records message identifiers, handles retries, and processes bounce or complaint events. A successful login does not prove the whole send and feedback loop works. Record timestamps and results; do not use invented universal thresholds.

## Offboard people, vendors, and tenants

When an operator or vendor leaves, identify their direct credentials, delegated roles, shared accounts, webhooks, CI variables, provider consoles, and recovery addresses. Transfer ownership before revocation. Reconcile recent send events and suppressions so an integration cannot be silently re-enabled. For a suspected compromise, preserve logs, pause the affected path, rotate related secrets, and communicate the scope to the incident owner.

## Governance controls

Use dual control for high-blast-radius changes, least privilege for applications, periodic access reviews, immutable or access-controlled audit logs, and a documented break-glass procedure. The [platform selection guide](/repmail/learn/email-platform/email-sending-platform-selection) is useful when a provider cannot express the isolation or audit controls your team requires.

## Related resources

See the [Email Infrastructure academy](/repmail/learn/infrastructure/email-infrastructure-explained) for the wider sending architecture.

This workflow should be checked against the cited standards and current provider documentation [1].

## References

[1]: https://www.rfc-editor.org/rfc/rfc5321 "RFC 5321: Simple Mail Transfer Protocol"
[2]: https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html "Amazon SES event publishing"
[3]: https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about "Microsoft Defender email authentication"

