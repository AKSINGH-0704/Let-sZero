---
product: repmail
academy: infrastructure
contentType: engineering-article
slug: provider-suppression-reconciliation
title: "Synchronize Provider Suppressions With Your Application"
description: "Reconcile provider bounces and complaints with application state using source-of-truth rules, append-only events, conflict handling, and privacy controls."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["suppressions", "bounces", "complaints"]
collections: ["email-infrastructure-decisions", "email-platform-essentials"]
learningPaths: ["email-infrastructure"]

keyTakeaways:
  - "Never let a stale application import overwrite a provider suppression without an explicit rule."
  - "Store append-only events and derive current suppression state from them."
  - "Separate global, account, campaign, and tenant suppression scopes."
faqs:
  - question: "Which system should be the source of truth?"
    answer: "It depends on the state. Provider bounce and complaint evidence should not be overwritten by an application import; local opt-outs and business scope may remain application-owned."
  - question: "Should temporary deferrals create suppressions?"
    answer: "Not automatically. Keep transient events separate and use provider-specific retry and escalation rules."
  - question: "How often should reconciliation run?"
    answer: "Use real-time ingestion plus a periodic comparison suited to your send volume and risk. The schedule should detect missed or delayed events, not imply a universal interval."
nextStep:
  label: "Review provider bounce and complaint notifications"
  href: /repmail/learn/infrastructure/aws-ses-bounce-complaint-notifications
  description: "Continue with the closest operational guide."
assets:
  - type: table
    title: Suppression reconciliation matrix
    content:
      headers: ["Scope", "Provider state", "Application state", "Action"]
      rows:
        - ["Global / account", "", "", ""]
        - ["Tenant or client", "", "", ""]
        - ["Campaign", "", "", ""]
        - ["Temporary deferral", "", "", ""]
        - ["Permanent bounce or complaint", "", "", ""]

---

Provider suppressions and application suppression lists can drift. A safe reconciliation design defines which system is authoritative for each event, stores provider evidence append-only, resolves conflicts explicitly, and prevents a later import from re-enabling a suppressed recipient.

## Define scope and authority

Separate provider account or global suppression, tenant or client suppression, campaign suppression, and local preference or opt-out state. A hard bounce or complaint may require broader action than a campaign pause, while a temporary deferral should not automatically become permanent suppression. Review [Amazon SES suppression](/repmail/learn/infrastructure/aws-ses-account-level-suppression) and [bounce and complaint events](/repmail/learn/infrastructure/aws-ses-bounce-complaint-notifications) when those systems are involved.

Document the source of truth for each state. Provider events should normally be treated as durable evidence, while the application may own business context and local opt-outs. Store recipient identifiers carefully, with access controls and retention limits.

## Process events safely

Ingest events idempotently. Record provider, event ID, message ID, recipient key, event time, received time, event type, source scope, and raw payload reference. Derive current suppression state from the event log rather than mutating away history. If an event is duplicated or arrives out of order, apply the defined precedence and keep both observations.

When an application import conflicts with a provider suppression, do not silently clear the provider state. Queue the conflict for an owner, or apply a documented rule that preserves the stronger suppression. Keep campaign and tenant boundaries explicit so one client’s decision cannot accidentally affect another.

## Reconcile and monitor

Run periodic comparisons in addition to real-time webhooks. Report missing events, unknown recipients, stale timestamps, invalid signatures, and records that disagree by scope. The [sending observability model](/repmail/learn/email-platform/email-sending-observability) helps connect event ingestion to send decisions. Test replays and offboarding before production changes.

## Related resources

Use the [Email Infrastructure academy](/repmail/learn/infrastructure/email-infrastructure-explained) for provider and data-boundary context.

This workflow should be checked against the cited standards and current provider documentation [1].

## Reconcile by event precedence

Freeze destructive writes, export point-in-time snapshots from provider and CRM, normalize without erasing originals, and join on a documented key. Preserve source, event type, event and ingestion times, provider ID, and reason. Counts alone do not prove safety: a newer unsubscribe can supersede delivery.

| Field | Compare | Stop rule |
| --- | --- | --- |
| Identity | normalized plus original address | Stop on ambiguous duplicates |
| Precedence | complaint/opt-out, bounce, block, delivery | Stop when winner is undefined |
| Freshness | observed and received timestamps | Stop when clock skew hides latest |
| Coverage | provider-only, local-only, both | Stop unresolved provider opt-out |
| Replay | event/batch ID, idempotency result | Stop if rerun re-enables contact |
| Exception | reviewer, reason, expiry, ticket | Qualify every manual override |

Use [Amazon SES suppression documentation](https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html) for provider-specific semantics and the [FTC CAN-SPAM guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business) as one U.S. reference. Dry-run additions, removals, conflicts, and duplicates; publish a reviewed diff. Do not resume while conflicts or incomplete exports remain.

## References

[1]: https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html "Amazon SES event publishing"
[2]: https://support.google.com/mail/answer/81126?hl=en-GB "Google Workspace sender guidelines"

