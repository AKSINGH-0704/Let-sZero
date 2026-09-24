---
product: repmail
academy: deliverability
contentType: guide
slug: microsoft-365-transport-rule-quarantine-evidence
title: "Microsoft 365 Transport Rule or Quarantine? Request the Right Admin..."
description: "Ask a Microsoft 365 recipient administrator for focused trace and quarantine evidence without requesting unsafe bypasses."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability", "provider-specific", "microsoft-365-transport-rule-quarantine-evidence"]
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]

keyTakeaways:
  - "When a message reaches a Microsoft 365 recipient environment but is missing, ask an authorized administrator for a narrow UTC message trace and quarantine or transport-rule result. Request evidence, not a blanket allowlist."
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

When a message reaches a Microsoft 365 recipient environment but is missing, ask an authorized administrator for a narrow UTC message trace and quarantine or transport-rule result. Request evidence, not a blanket allowlist.

## Give the administrator identifiers

Provide sender, recipient, subject or message ID, and a narrow UTC window. Include the sending domain, IP if known, and exact SMTP outcome.

Ask for the trace event, quarantine reason or rule name, and the policy action. Avoid requesting broad message content or unrelated mailbox data.

## Interpret the result

Trace shows delivery → inspect Junk, quarantine, mailbox rules, and client views. Trace shows failure → correlate the event with the sender’s SMTP response. No trace → verify identifiers, time zone, recipient, and whether the message used another address.

A transport-rule result is tenant-specific; it does not prove every Microsoft recipient will behave the same way.

## Resolve collaboratively

Ask the administrator to identify the narrow policy condition and its owner. Correct sender authentication or content evidence where appropriate; do not treat bypassing controls as the default remediation.

## Quick checklist

- [ ] Label the provider and environment rather than guessing.
- [ ] Preserve UTC time, message ID, exact SMTP text, and full headers.
- [ ] State the denominator for every acceptance, placement, or reply rate.
- [ ] Change one variable, retest, and retain the before/after evidence.

## Edge cases and next action

External senders generally cannot access tenant trace or quarantine. Redact message content and personal data when sharing evidence outside the recipient organization. Use the [provider-specific triage model](/repmail/learn/deliverability/provider-specific-deliverability-triage) as the hub; related evidence paths include [microsoft 365 email delivery diagnostics](/repmail/learn/deliverability/microsoft-365-email-delivery-diagnostics).

## Where RepMail fits

RepMail can provide sender-side message IDs and timestamps for the request, but recipient administrators control trace, quarantine, and transport-policy evidence.

## Ask for narrow administrator evidence

A sender’s request should fit on one screen: recipient, sender, subject or message ID, UTC range, and the exact result seen on the sender side. Ask the administrator to return the trace event and the relevant quarantine or rule reason, with sensitive content omitted. If identifiers do not match, rerun with a corrected window rather than asking for a broad mailbox search.

Once the rule or quarantine reason is known, document its owner and intended scope. A local policy may be appropriate for that tenant and not a sender defect. Avoid bypass requests that would remove the recipient’s security controls before the sender identity and evidence have been checked.

A sender should not request the recipient to disable a rule merely to make a test pass. Ask for the rule or quarantine reason, the message identifiers that matched it, and the narrow policy action. Once the sender fixes a proven identity issue, the administrator can rerun the same trace and compare the event. That creates an auditable collaboration loop instead of a one-off bypass.

## Sources

[1]: https://learn.microsoft.com/en-us/exchange/monitoring/trace-an-email-message/message-trace-modern-eac
[2]: https://learn.microsoft.com/en-us/defender-office-365/message-headers-eop-mdo
