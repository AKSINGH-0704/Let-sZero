---
product: repmail
academy: deliverability
contentType: guide
slug: microsoft-365-compauth-fail
title: "Microsoft 365 compauth=fail: Evidence Before Changing DNS"
description: "Read Microsoft 365 compauth=fail as one header signal and verify SPF, DKIM, DMARC, alignment, and recipient context before changing DNS."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability", "provider-specific", "microsoft-365-compauth-fail"]
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]

keyTakeaways:
  - "`compauth=fail` is evidence that Microsoft’s composite authentication assessment did not pass for that message; it is not a complete root-cause verdict. Inspect the surrounding Authentication-Results fields and outcome before changing DNS."
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

`compauth=fail` is evidence that Microsoft’s composite authentication assessment did not pass for that message; it is not a complete root-cause verdict. Inspect the surrounding Authentication-Results fields and outcome before changing DNS.

## Capture the complete header

Save the Authentication-Results line, From, Return-Path or smtp.mailfrom, DKIM d=, SPF, DKIM, DMARC, message ID, recipient, and UTC time. A snippet copied from a mail client is insufficient.

Record whether the message was accepted, Junked, quarantined, or rejected and whether the recipient is in Microsoft 365 or Outlook.com.

## Check the identity chain

Verify the actual envelope sender and selector used by the relay. Confirm SPF authorization, DKIM verification, DMARC alignment, and whether forwarding or rewriting altered the path.

Review sender history, list segment, volume changes, and recipient context; Microsoft describes composite authentication within a broader evaluation.

## Choose the next test

Correct the specific mismatch you can prove, then send one controlled message. If authentication passes but placement is still poor, keep placement and reputation as separate hypotheses.

## Quick checklist

- [ ] Label the provider and environment rather than guessing.
- [ ] Preserve UTC time, message ID, exact SMTP text, and full headers.
- [ ] State the denominator for every acceptance, placement, or reply rate.
- [ ] Change one variable, retest, and retain the before/after evidence.

## Edge cases and next action

A compauth result is not a universal Microsoft block code. It can coexist with passing individual mechanisms, so do not replace the whole DNS configuration without evidence. Use the [provider-specific triage model](/repmail/learn/deliverability/provider-specific-deliverability-triage) as the hub; related evidence paths include [microsoft 365 email delivery diagnostics](/repmail/learn/deliverability/microsoft-365-email-delivery-diagnostics), [read authentication results](/repmail/learn/deliverability/read-authentication-results).

## Where RepMail fits

RepMail can retain test-message metadata and campaign context to compare headers across versions, but it cannot explain a Microsoft tenant’s private policy.

## Read the surrounding fields

Copy the complete Authentication-Results line and adjacent identity headers into the incident record. Compare `compauth` with SPF, DKIM, DMARC, alignment, and the final mailbox outcome. A composite result can be a useful lead even when an individual mechanism passes, so the next question is which identity or contextual signal differs.

Repeat with a controlled message after one change. If the message authenticates but still lands in Junk or quarantine, move the investigation to placement or tenant policy. This prevents a compauth observation from becoming an unsupported claim that a DNS rewrite will solve every Microsoft outcome.

The same header can contain several authentication signals with different meanings. Preserve the raw line before normalizing it into a ticket field, then annotate each value and the final outcome separately. If the recipient administrator reports a transport rule or quarantine event, attach that evidence to the compauth observation rather than treating compauth as a substitute for tenant trace.

## Sources

[1]: https://learn.microsoft.com/en-us/defender-office-365/message-headers-eop-mdo
