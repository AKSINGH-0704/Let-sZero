---
contentType: guide
slug: "agency-paused-client-maintenance"
title: "Paused Client Mailbox and Domain Maintenance Runbook"
description: "A quiet-period runbook for monitoring, renewals, authentication drift, mailbox access, and controlled restart of paused client outreach."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["agency-outreach", "maintenance", "sending-domains", "operations"]
featured: false
collections: ["tool-reviews"]
learningPaths: ["getting-started"]
keyTakeaways:
  - "Pause, maintenance, and retirement are different states."
  - "Quiet periods still need ownership, renewal, access, and authentication checks."
  - "Do not claim that automated activity preserves reputation without current evidence."
prerequisites:
  - label: "Understand why new domains need review"
    href: "/repmail/learn/deliverability/why-new-domains-need-warm-up"
commonMistakes:
  - "Leaving a paused scheduler active with a future send date."
  - "Assuming DNS and mailbox access remain unchanged during a quiet period."
  - "Restarting from the old audience without a fresh suppression and approval check."
faqs:
  - question: "Should a paused mailbox keep sending warm-up traffic?"
    answer: "Do not assume that any warm-up activity is appropriate or protective. Follow the provider’s current guidance and the client’s approved operating policy."
  - question: "When should a paused campaign be retired?"
    answer: "Retire it when the client, contract, infrastructure owner, or risk review says it no longer has a supported purpose. Record the disposition rather than leaving an ambiguous paused state."
nextStep:
  label: "Next: check the sending domain"
  href: "/repmail/learn/deliverability/verify-your-sending-domain"
  description: "Revalidate before changing a paused campaign to active."
assets:
  - type: checklist
    title: "Agency Paused Client Mailbox and Domain Maintenance Runbook worksheet"
    content:
      - "Record the owner, scope, evidence link, status, and checked date for each control."
      - "Mark the item HOLD when required evidence is missing or a decision is uncertain."
      - "Attach the completed record to the client or incident review before proceeding."
---
A paused client campaign should have an explicit state: **pause** means the relationship and assets remain active but sends are stopped; **maintenance** means owners periodically verify dependencies; **retirement** means the assets are being disposed of or handed off. Never treat an unlabeled pause as a maintenance plan.

## Quiet-period runbook

| Cadence or event | Check | Evidence |
| --- | --- | --- |
| Immediately after pause | Schedulers, queues, retries, API jobs, and webhooks cannot send | Queue and job evidence |
| Monthly or contract-defined | Registrar renewal, billing, recovery contacts, and mailbox access | Review record |
| On provider/DNS change | SPF, DKIM, DMARC, TLS, forwarding, and authentication results | Timestamped check |
| On personnel change | Admin access, tokens, recovery paths, and client visibility | Access inventory |
| Before restart | Audience freshness, suppression, copy, approvals, sender identity, and test send | Restart gate |

The [domain verification guide](/repmail/learn/deliverability/verify-your-sending-domain) covers the technical check. The [authentication change-management guide](/repmail/learn/deliverability/email-authentication-change-management) helps route unexpected drift.

## Restart gate

1. Confirm client intent, objective, audience, exclusions, and approval owner.
2. Recheck domain and mailbox custody, renewal status, recovery paths, and authentication.
3. Reconcile client-local and applicable cross-client suppressions.
4. Revalidate factual claims, links, personalization fallbacks, and opt-out behavior.
5. Send controlled tests and record rendering, replies, errors, and headers.
6. Schedule the smallest approved scope with a pause owner and observation plan.

Do not promise that a quiet-period routine preserves reputation or that a restart will be accepted by every provider. If evidence shows a reputation or complaint issue, use the incident and recovery workflows instead.

## State transition procedure

The maintenance owner creates a paused-client record with client, contract state, campaign and sender IDs, pause reason, effective time, next review date, renewal and billing owner, domain registrar and DNS owner, mailbox or recovery owner, provider account, credentials, suppression source, and retirement disposition. The delivery lead verifies that queues, retries, schedulers, webhooks, and future jobs cannot send. The infrastructure owner checks domain and authentication dependencies; the account owner confirms client intent; and the privacy owner decides what records must remain available. A pause is not evidence that reputation is preserved, and automated warm-up should not be assumed to be protective.

Use this transition sequence: (1) record the stop event and cancel queued work; (2) inventory active dependencies and access; (3) set a maintenance cadence tied to contract and risk; (4) recheck renewal, recovery, DNS, provider notices, and credentials at each review; (5) choose **paused**, **maintenance**, or **retired** explicitly; and (6) require a restart gate before any send. The [sending-domain verification guide](/repmail/learn/deliverability/verify-your-sending-domain) and [authentication change-management guide](/repmail/learn/deliverability/email-authentication-change-management) provide technical checks.

| State | Owner action | Exit evidence |
| --- | --- | --- |
| Paused | No sending jobs; retain only approved operational access | Client restart or retirement decision |
| Maintenance | Complete dated dependency review | Current owner, access, and authentication record |
| Retired | Revoke, transfer, or dispose of assets under policy | Handoff/deletion record and blocked send path |

Stop and keep the client paused if domain ownership is disputed, renewal or recovery access is unknown, authentication no longer matches, credentials are exposed, suppression cannot be reconciled, or the intended audience or message is stale. Roll back a failed restart by cancelling the new schedule, restoring the paused state, revoking any newly issued credentials, and preserving test evidence. If a provider or complaint signal appears, route to incident review rather than shifting traffic to another identity. Resume only after client intent, current suppression, identity checks, controlled tests, and a named observation owner are recorded; this is not a delivery or placement guarantee.

## Sources

[1]: https://support.google.com/mail/answer/81126?hl=en "Google email sender guidelines"
[2]: https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html "Amazon SES creating and verifying identities"
