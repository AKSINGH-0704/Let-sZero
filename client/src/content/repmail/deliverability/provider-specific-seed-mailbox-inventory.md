---
product: repmail
academy: deliverability
contentType: tutorial
slug: provider-specific-seed-mailbox-inventory
title: "Provider-Specific Seed Mailbox Inventory Design"
description: "Design a provider-specific seed mailbox inventory that labels Gmail, Workspace, Outlook.com, Microsoft 365, and Yahoo separately."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability", "provider-specific", "provider-specific-seed-mailbox-inventory"]
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]

keyTakeaways:
  - "A useful seed inventory is a labeled test set, not a list of generic free mailboxes. Record provider environment, ownership, location, history, access, and freshness so each placement result has interpretable context."
  - "Keep provider, environment, timestamp, and denominator labels with every observation."
  - "Use exact SMTP text and full headers before changing configuration."
commonMistakes:
  - "Treating acceptance as inbox placement or a dashboard as a mailbox-level verdict."
  - "Mixing consumer and tenant environments or guessing an unknown provider cohort."
  - "Changing several variables before preserving a before/after comparison."
faqs:
  - question: "Is provider-specific evidence proof of universal deliverability?"
    answer: "No. It describes the tested provider, identity, environment, and time window. Keep other providers and unknown cohorts separate."
  - question: "Should I change DNS as soon as one provider reports a problem?"
    answer: "Not before preserving the exact response and message headers. First identify whether the issue is authentication, acceptance, placement, tenant policy, list quality, or timing."
  - question: "What should I record for a useful diagnosis?"
    answer: "Record provider and environment, UTC time, sender identity, recipient cohort, message ID, SMTP response, headers, campaign version, and the denominator used for any rate."
nextStep:
  label: "Review provider-specific triage"
  href: "/repmail/learn/deliverability/provider-specific-deliverability-triage"
  description: "Route the next diagnostic step without mixing receiver environments."
assets:
  - type: table
    title: "Provider-specific evidence decision table"
    content:
      headers: ["Control", "Keep constant", "Label"]
      rows:
        - ["Message", "Version, links, body", "Campaign ID"]
        - ["Timing", "UTC send window", "Timestamp"]
        - ["Receiver", "Known environment and seed history", "Provider/cohort"]

---

A useful seed inventory is a labeled test set, not a list of generic free mailboxes. Record provider environment, ownership, location, history, access, and freshness so each placement result has interpretable context.

## Choose labels

Separate personal Gmail, Google Workspace, Outlook.com, Microsoft 365, and Yahoo. Keep custom-domain mailboxes labeled by environment when known.

Record account owner, recovery method, locale, client access, creation or last-use date, and whether an administrator can provide trace evidence.

## Define validity

Set a review date and a procedure for checking that the mailbox is active and can receive the test. Record filters, forwarding, and manual rules that could change placement.

Do not treat a seed mailbox as a random sample of provider users. It is a controlled observation with its own history.

## Log every test

Tie each send to mailbox label, message version, timestamp, folder, header, SMTP outcome, and operator. Mark missing or inaccessible results explicitly.

## Quick checklist

- [ ] Label the provider and environment rather than guessing.
- [ ] Preserve UTC time, message ID, exact SMTP text, and full headers.
- [ ] State the denominator for every acceptance, placement, or reply rate.
- [ ] Change one variable, retest, and retain the before/after evidence.

## Edge cases and next action

A provider label based only on a domain suffix can be wrong. Ask the mailbox owner or administrator and preserve an unknown label when environment cannot be verified. Use the [provider-specific triage model](/repmail/learn/deliverability/provider-specific-deliverability-triage) as the next diagnostic branch.

## Where RepMail fits

RepMail can hold test-message IDs and campaign versions; the inventory owner must maintain mailbox access and folder observations.

## Maintain freshness

Assign an owner to each seed and record the last successful receive test, active filters, forwarding, and access status. Retire or relabel a mailbox when its environment changes. A stale seed can produce a valid observation for the wrong question, especially when a personal mailbox becomes managed or a tenant policy changes.

Before every experiment, validate the inventory subset and note any unavailable account. Report the number of usable seeds by environment, not just the total mailbox count. This gives readers the context needed to interpret directional placement results.

Include a field for the observation method—webmail folder, mobile client, desktop client, header inspection, or administrator trace. Different methods can expose different evidence, so do not combine them silently. Record who made the observation and when. The inventory is valuable because it makes uncertainty explicit before a seed test is used to compare providers.

Include an explicit status such as active, needs review, inaccessible, or retired. That status belongs in the report next to each placement result, because an inaccessible mailbox should not be counted as a failed placement. Review the inventory before every test and preserve the version used for the comparison.


## Seed inventory field table and validity boundary

A seed is a controlled observation, not a representative provider sample. Calculate `usable_seed_rate = usable_active_seeds / inventory_seeds` by environment, but exclude inaccessible and stale accounts rather than calling them failed placement.

| Field | Example | Why |
|---|---|---|
| provider_environment | Gmail consumer/Workspace/M365 | cohort separation |
| status | active/review/inaccessible/retired | denominator |
| last_receive_test | UTC timestamp | freshness |
| observation_method | webmail/header/admin trace | evidence context |
| message_id/folder | source and placement | send join |
| filters | forwarding/rules and owner | interpretation |

**Decision boundary:** Count a seed only when environment, access, status, and freshness are verified. SMTP acceptance is not inbox placement. **Failure case:** Domain-suffix guessing and counting inaccessible seeds as failures are failure cases. **Verification and stop condition:** Verify inventory version and one receive test per seed; stop if >10% selected seeds are inaccessible or environment/evidence is unknown. Links: [provider-specific deliverability triage](/repmail/learn/deliverability/provider-specific-deliverability-triage), [inbox placement versus deliverability](/repmail/learn/deliverability/inbox-placement-vs-deliverability), and [Yahoo sender best practices](https://senders.yahooinc.com/best-practices/).


The inventory **calculation** is `usable_active_seeds / inventory_seeds` by provider environment; inaccessible seeds stay out of the placement denominator.
## Sources

[1]: https://support.google.com/mail/answer/81126?hl=en
[2]: https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730
[3]: https://senders.yahooinc.com/best-practices/
