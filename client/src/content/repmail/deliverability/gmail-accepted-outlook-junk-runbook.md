---
product: repmail
academy: deliverability
contentType: guide
slug: gmail-accepted-outlook-junk-runbook
title: "Accepted at Gmail, Junk at Outlook: Cross-Provider Incident Runbook"
description: "Run a cross-provider incident when Gmail accepts a campaign but Outlook places it in Junk, without mixing evidence or causes."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability", "provider-specific", "gmail-accepted-outlook-junk-incident"]
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]

keyTakeaways:
  - "Treat Gmail acceptance and Outlook Junk placement as two observations from two receiver systems. Keep their evidence separate, compare the shared sender change, and choose actions that target the affected provider without blaming one threshold for another."
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
      headers: ["Evidence", "What it can show", "What it cannot prove"]
      rows:
        - ["SMTP reply", "Acceptance, deferral, or rejection context", "Inbox placement"]
        - ["Full headers", "Authentication and routing context", "Provider algorithm"]
        - ["Provider dashboard", "Delayed aggregate signal", "One recipient outcome"]

---

Treat Gmail acceptance and Outlook Junk placement as two observations from two receiver systems. Keep their evidence separate, compare the shared sender change, and choose actions that target the affected provider without blaming one threshold for another.

## Freeze the comparison

Record campaign version, sender identity, domain, IP path, volume, UTC window, recipient environment, Gmail SMTP/placement evidence, and Outlook folder/header evidence.

Confirm Gmail recipients and Outlook.com or Microsoft 365 recipients are not being mixed into one cohort.

## Branch by evidence

Gmail accepted + Outlook Junk → inspect Outlook headers, authentication alignment, volume history, complaint/list changes, and recipient environment.

Outlook rejected → use exact SMTP text and authentication evidence; do not diagnose it as a folder-placement issue.

Microsoft 365 tenant quarantine → ask the administrator for trace and rule evidence; do not use Outlook.com guidance as a substitute.

## Make one controlled change

Correct a proven identity mismatch or pause the affected stream. Retest with matched content and timing, then compare the same provider cohorts. Preserve the before/after record.

## Quick checklist

- [ ] Label the provider and environment rather than guessing.
- [ ] Preserve UTC time, message ID, exact SMTP text, and full headers.
- [ ] State the denominator for every acceptance, placement, or reply rate.
- [ ] Change one variable, retest, and retain the before/after evidence.

## Edge cases and next action

“Accepted by Gmail” does not prove universal inbox placement. Outlook.com, Microsoft 365, and Gmail have different evidence paths and should remain separate in the incident timeline. Use the [provider-specific triage model](/repmail/learn/deliverability/provider-specific-deliverability-triage) as the hub; related evidence paths include [google postmaster tools guide](/repmail/learn/deliverability/google-postmaster-tools-guide), [microsoft 365 email delivery diagnostics](/repmail/learn/deliverability/microsoft-365-email-delivery-diagnostics), [read authentication results](/repmail/learn/deliverability/read-authentication-results).

## Where RepMail fits

RepMail can supply campaign versions and sender-side identifiers for the cross-provider packet; recipient folders, headers, and tenant evidence remain external.

## Preserve the split incident timeline

Create one row per provider environment with sender identity, message ID, UTC send time, SMTP outcome, folder or tenant event, and header evidence. Keep Gmail acceptance in its row and Outlook Junk or quarantine in another. Then list shared facts—campaign version, content, list, volume, and infrastructure—separately from provider-specific facts.

Choose the smallest action that matches the evidence. A sender identity correction may affect all providers; a consumer Outlook placement issue may require a Microsoft-specific support path. Retest the same cohort after one change and keep the original result for comparison.

Ask whether the Outlook result is reproducible across more than one labeled mailbox before treating it as a provider-level incident. One mailbox may have a local rule, user action, or history that explains the folder. Conversely, a repeated result across matched Outlook.com samples deserves a provider-specific evidence packet. Keep the sample size and missing observations visible.

## Sources

[1]: https://support.google.com/mail/answer/81126?hl=en
[2]: https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730
[3]: https://support.microsoft.com/en-us/outlook/sender-support-in-outlook-com
