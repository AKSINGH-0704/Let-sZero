---
product: repmail
academy: deliverability
contentType: comparison
slug: message-trace-vs-snds
title: "Microsoft Message Trace vs. SNDS: Which Evidence Answers Which Ques..."
description: "Choose Microsoft message trace or SNDS by the question you need answered: tenant event evidence or provider-level IP signals."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability", "provider-specific", "message-trace-vs-snds"]
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]

keyTakeaways:
  - "Use message trace to answer whether a Microsoft 365 tenant received and processed a message. Use SNDS to inspect aggregate Microsoft signals for IPs or domains you control. Neither replaces the other."
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
      headers: ["Question", "Best evidence", "Access"]
      rows:
        - ["Tenant received it?", "Message trace", "Recipient admin"]
        - ["IP/domain signal?", "SNDS", "Controlled IP/domain"]
        - ["Authenticated?", "Full message headers", "Delivered sample"]

---

Use message trace to answer whether a Microsoft 365 tenant received and processed a message. Use SNDS to inspect aggregate Microsoft signals for IPs or domains you control. Neither replaces the other.

## Map the question to the evidence

“Did this recipient tenant receive it?” → ask an authorized Microsoft 365 administrator for message trace.

“Is Microsoft showing a broader IP-level signal?” → use SNDS for a controlled IP or domain.

“Did the sender authenticate?” → obtain full headers and read SPF, DKIM, DMARC, and any Microsoft authentication context.

## Request the minimum fields

For trace: UTC window, sender, recipient, subject or message ID, and event or failure reason. For SNDS: controlled IP/domain, reporting period, and the dashboard values or availability state.

Keep the two timestamps and identities in the same incident record. A trace result for one tenant must not be generalized to all Outlook recipients.

## Interpret without overreach

Trace delivery can still be followed by Junk, quarantine, transport rules, or mailbox rules. SNDS can show aggregate provider evidence but cannot prove one tenant’s outcome. Correlate both with SMTP events and campaign changes.

## Quick checklist

- [ ] Label the provider and environment rather than guessing.
- [ ] Preserve UTC time, message ID, exact SMTP text, and full headers.
- [ ] State the denominator for every acceptance, placement, or reply rate.
- [ ] Change one variable, retest, and retain the before/after evidence.

## Edge cases and next action

Access is asymmetric: external senders generally cannot run a recipient tenant trace, and SNDS data is not a lookup for arbitrary IPs. Ask the recipient administrator for tenant evidence. Use the [provider-specific triage model](/repmail/learn/deliverability/provider-specific-deliverability-triage) as the hub; related evidence paths include [microsoft 365 email delivery diagnostics](/repmail/learn/deliverability/microsoft-365-email-delivery-diagnostics), [read authentication results](/repmail/learn/deliverability/read-authentication-results).

## Where RepMail fits

RepMail can organize message IDs and send events so an operator can hand a clean identifier set to a Microsoft 365 administrator.

## A practical handoff

A sender can make the handoff efficient by supplying a message ID, narrow UTC window, sender and recipient, and the exact SMTP result. The recipient administrator can then run the smallest trace that can answer the question. Separately, the sender can review SNDS for a controlled IP or domain. Put both results in one timeline, but label their scopes explicitly.

If trace says delivered while the recipient reports nothing, the next questions concern Junk, quarantine, rules, forwarding, and client view. If SNDS looks normal while one tenant rejects, do not dismiss the tenant evidence; it may be a local policy or identity issue. The two tools are complementary because they observe different layers.

The handoff also needs an access note. SNDS enrollment and tenant trace permissions are separate, so record who supplied each observation and whether the sender or recipient organization controls the account. If a trace is unavailable, say so explicitly; do not replace it with a dashboard screenshot from a different scope. This keeps the incident useful when it is reviewed by support, engineering, or a recipient administrator.

## Sources

[1]: https://learn.microsoft.com/en-us/exchange/monitoring/trace-an-email-message/message-trace-modern-eac
[2]: https://substrate.office.com/ip-domain-management-snds/snds
