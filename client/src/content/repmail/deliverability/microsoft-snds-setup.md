---
product: repmail
academy: deliverability
contentType: tutorial
slug: microsoft-snds-setup
title: "Microsoft SNDS Setup and Dashboard Interpretation"
description: "Set up Microsoft SNDS and interpret IP-level reputation and complaint signals without confusing them with tenant message trace."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability", "provider-specific", "microsoft-snds-setup"]
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]

keyTakeaways:
  - "Microsoft SNDS is provider-native evidence about IPs and domains you control; it is not a Microsoft 365 tenant message trace. Use it to inspect aggregate IP/reputation signals, then corroborate with SMTP responses and headers."
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
      headers: ["Question", "SNDS evidence", "Do not infer"]
      rows:
        - ["IP/domain signal", "Provider-level aggregate view", "One mailbox outcome"]
        - ["Tenant receipt", "Ask Microsoft 365 admin for trace", "SNDS access"]
        - ["Message identity", "Full headers and SMTP text", "Dashboard-only diagnosis"]

---

Microsoft SNDS is provider-native evidence about IPs and domains you control; it is not a Microsoft 365 tenant message trace. Use it to inspect aggregate IP/reputation signals, then corroborate with SMTP responses and headers.

## Start with access and scope

Confirm that you control the sending IP or domain and can receive verification mail. SNDS cannot reveal arbitrary senders’ private data. Record the IP range, provider, and UTC review window before you enroll.

Keep consumer Outlook.com evidence separate from Microsoft 365 tenant evidence. A sender can use SNDS while an authorized recipient administrator uses message trace; the two views answer different questions.

## Read the dashboard as evidence, not a verdict

Capture the reporting period, IP identity, complaint indicator, trap or policy signals if shown, and any data-availability caveat. A blank or delayed value is not proof of a clean or unhealthy sender.

Compare the chart with your own delivery events, volume changes, list segment, and exact Microsoft replies. Preserve screenshots or exports with timestamps so a later change can be audited.

## Act in a bounded order

If authentication is failing, correct the identity path first. If a complaint or reputation signal moves with one campaign, pause that stream and review suppression and targeting. If only a recipient tenant is affected, request tenant-side trace instead of changing DNS.

## Quick checklist

- [ ] Label the provider and environment rather than guessing.
- [ ] Preserve UTC time, message ID, exact SMTP text, and full headers.
- [ ] State the denominator for every acceptance, placement, or reply rate.
- [ ] Change one variable, retest, and retain the before/after evidence.

## Edge cases and next action

Shared infrastructure can make IP-level signals difficult to attribute to one domain. Do not infer an allowlist, delisting, or inbox guarantee from an SNDS view. Use the [provider-specific triage model](/repmail/learn/deliverability/provider-specific-deliverability-triage) as the hub; related evidence paths include [microsoft 365 email delivery diagnostics](/repmail/learn/deliverability/microsoft-365-email-delivery-diagnostics), [read authentication results](/repmail/learn/deliverability/read-authentication-results).

## Where RepMail fits

RepMail can supply sender-side campaign and event context for the evidence packet; it cannot grant access to Microsoft SNDS data for an IP the operator does not control.

## Build a repeatable SNDS review

Use the same review fields each time: controlled IP or domain, UTC window, dashboard availability, relevant volume, and the corresponding sender-side event range. Save a short interpretation next to the raw observation. For example, “data unavailable” is a state to follow up, while “signal changed after campaign X” is a hypothesis that needs a matched comparison. If multiple domains share an IP, keep attribution unresolved until the available evidence can separate them.

When an SNDS signal changes, compare it with suppression events, list-source changes, authentication results, and the exact Microsoft response. Avoid an emergency configuration change based on one chart. A bounded pause, preserved evidence, and one controlled retest usually produces a more useful record than repeated blind sends.

## Sources

[1]: https://substrate.office.com/ip-domain-management-snds/snds
[2]: https://support.microsoft.com/en-us/outlook/sender-support-in-outlook-com
