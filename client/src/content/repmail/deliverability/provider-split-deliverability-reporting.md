---
product: repmail
academy: deliverability
contentType: guide
slug: provider-split-deliverability-reporting
title: "Provider-Split Reporting for Outbound Campaigns"
description: "Build provider-split deliverability reporting with explicit denominators for acceptance, placement, and replies."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability", "provider-specific", "provider-split-email-deliverability-reporting"]
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]

keyTakeaways:
  - "Report Gmail, Microsoft, Yahoo, and unknown recipient cohorts separately. Keep delivery acceptance, placement, and replies as different measures, and label mixed or unresolved domains instead of guessing."
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
      headers: ["Metric", "Denominator", "Caveat"]
      rows:
        - ["Accepted", "Attempted", "SMTP outcome only"]
        - ["Placement", "Observed delivered samples", "Seed results are directional"]
        - ["Replies", "Accepted or observed cohort, stated", "Engagement is not placement"]

---

Report Gmail, Microsoft, Yahoo, and unknown recipient cohorts separately. Keep delivery acceptance, placement, and replies as different measures, and label mixed or unresolved domains instead of guessing.

## Define the cohort

Classify by recipient domain and environment when known: personal Gmail, Google Workspace, Outlook.com, Microsoft 365, Yahoo, or unknown. Keep a separate “mixed/unknown” bucket.

Document the classification date and rule. A domain suffix alone cannot always identify a tenant, mailbox policy, or placement outcome.

## Use a measurement table

For each cohort, record attempted, accepted, deferred, rejected, known inbox/Junk/spam outcomes, replies, and suppression events. Show the denominator beside every rate.

Do not divide replies by accepted mail in one row and by attempted mail in another. Keep missing placement observations explicit; seed observations are directional, not a population estimate.

## Review changes by cohort

Compare the same time window, campaign version, identity, and list segment. Flag a provider-specific regression only when the evidence window and denominator are comparable.

## Quick checklist

- [ ] Label the provider and environment rather than guessing.
- [ ] Preserve UTC time, message ID, exact SMTP text, and full headers.
- [ ] State the denominator for every acceptance, placement, or reply rate.
- [ ] Change one variable, retest, and retain the before/after evidence.

## Edge cases and next action

Provider classification and placement coverage are often incomplete. Unknown is a valid result; silently assigning unknown domains to Gmail or Microsoft creates false certainty. Use the [provider-specific triage model](/repmail/learn/deliverability/provider-specific-deliverability-triage) as the hub; related evidence paths include [google postmaster tools guide](/repmail/learn/deliverability/google-postmaster-tools-guide), [microsoft 365 email delivery diagnostics](/repmail/learn/deliverability/microsoft-365-email-delivery-diagnostics).

## Where RepMail fits

RepMail’s event context can support provider-cohort reporting, but operators should verify how recipient domains and placement observations are classified before using a dashboard.

## Recommended report layout

Put the cohort definition and date range above every chart. Then show counts before rates: attempted, accepted, deferred, rejected, observed Inbox, observed Junk or spam, replies, and suppressions. Include “not observed” beside placement rather than converting missing observations to a pass or fail.

For a provider split to support a decision, preserve campaign version, sender identity, list segment, and volume change beside the metrics. A change in the Gmail row may be a classification or sampling change rather than a receiver regression. Review unknown domains separately and explain how they affect the denominator. This reporting discipline makes aggregate results less likely to hide a provider-specific problem.

A reporting review should also show coverage. Add counts for messages with a known provider, an observed placement, and a usable reply outcome. Low coverage should be visible beside the metric, because a small manually checked seed group can look unusually good or bad without representing the broader recipient population. Use the same cohort definitions in the next report so changes are comparable.

## Sources

[1]: https://support.google.com/mail/answer/81126?hl=en
[2]: https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730
[3]: https://senders.yahooinc.com/best-practices/
