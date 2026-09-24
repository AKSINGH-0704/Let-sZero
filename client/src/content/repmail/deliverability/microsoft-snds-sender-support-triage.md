---
product: repmail
academy: deliverability
contentType: guide
slug: microsoft-snds-sender-support-triage
title: Microsoft SNDS and Sender Support Triage for Outlook Delivery Problems
description: Runbook for diagnosing Outlook/Hotmail delivery issues using Microsoft
  SNDS and the Microsoft Sender Support path. Practical steps, edge cases, and a decision
  c
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
collections:
  - deliverability-diagnostics
learningPaths:
  - provider-deliverability-diagnostics
tags:
- Microsoft
- SNDS
- Outlook
- Hotmail
- deliverability
- sender support
- IP reputation
assets:
- type: table
  title: 'Decision Checklist: When to Use SNDS vs Microsoft Sender Support'
  content:
    headers:
    - Indicator
    - What to check / evidence to gather
    - Immediate action
    rows:
    - - High IP-level complaint trend in SNDS
      - SNDS trend for the IP (dates), sample complaint counts, send volume during
        the window
      - Reduce volume to affected IP, investigate content/list quality, prepare SNDS
        export and message samples for support
    - - Bounce/NDRs from Outlook/Hotmail users
      - Full NDR text, message-ID, Received headers, timestamp
      - Match NDR to sending IP; if authentication/DNS OK, collect samples and open
        Microsoft support [1]
    - - Authentication failures seen in headers
      - SPF/DKIM/DMARC test results, DNS records (TXT) and propagation timestamps
      - Fix DNS/authentication, re-test, and only escalate if failures persist after
        corrections
    - - Shared IP behaving inconsistently (some recipients get mail, others don’t)
      - Compare SNDS telemetry for shared IP, check sending patterns, sample headers
        to affected recipients
      - Consider moving to a dedicated IP or isolating the sending stream; collect
        evidence for support if issues continue
keyTakeaways:
- Use SNDS to inspect IP-level telemetry (reputation trends and volume signals) but
  do not expect per-recipient outcomes or a delivery guarantee from SNDS.
- Collect samples (headers, message-IDs, timestamps, NDRs) and DNS/authentication
  checks before opening Microsoft sender support.
- Follow Microsoft’s sender support path when provider-side fixes don’t resolve delivery;
  include SNDS findings and specific message evidence in the support request.
commonMistakes:
- Relying solely on SNDS data to prove per-recipient delivery or to guarantee Microsoft
  will accept messages.
- Opening a sender support ticket without message samples, NDR codes, or clear DNS/authentication
  results.
- Ignoring shared-IP vs dedicated-IP contexts when interpreting reputation telemetry.
faqs:
- question: What exactly does SNDS show and what does it not show?
  answer: 'SNDS provides telemetry tied to IP addresses: trends in volume, apparent
    complaint signals, and other aggregated telemetry useful for reputation troubleshooting.
    It does not show every recipient-level outcome, and SNDS access or data does not
    guarantee that Microsoft will accept or whitelist your traffic. Treat SNDS as
    a diagnostic signal, not an authoritative per-message delivery log.'
- question: When should I contact Microsoft sender support vs relying on SNDS and
    my own fixes?
  answer: Use SNDS and your own checks first (IP telemetry, authentication, headers,
    bounce codes). If you still see delivery problems to Outlook/Hotmail recipients
    and cannot identify a clear local issue, escalate using Microsoft’s sender support
    process and include the evidence you collected. Microsoft’s support page describes
    the supported request path and required details [1].
- question: What evidence should I attach to a Microsoft sender support request?
  answer: Include specific message-IDs and full Received headers, timestamps (UTC),
    originating IP, sample raw message (if allowed), NDR bounce codes and text, SNDS
    screenshots or CSV exports showing the IP and timeframe, and authentication check
    results (SPF, DKIM, DMARC). The clearer the timeline and samples, the faster support
    can triage.
nextStep:
  label: Run Microsoft 365 delivery diagnostics
  href: /repmail/learn/deliverability/provider-specific-deliverability-triage
  description: If you’ve followed these steps and still see Outlook delivery issues,
    run the Microsoft 365 email delivery diagnostics and follow provider-specific
    triage guidance to prepare a support request.
---

Microsoft SNDS and Sender Support Triage for Outlook Delivery Problems

Direct answer: Use SNDS to identify IP-level reputation trends and telemetry, perform standard DNS/authentication and message-header checks, then escalate to Microsoft Sender Support only after you’ve collected targeted evidence (message-IDs, full headers, timestamps, SNDS exports). SNDS is a diagnostic source — it does not show every recipient outcome nor does SNDS access guarantee Microsoft will accept your traffic or whitelist your IPs.

Step-by-step diagnostic runbook

1) Initial data collection (required)
- Export SNDS data for the impaired IP(s) and time windows. Look for changes in volume, complaint-related signals, and abrupt reputation shifts.
- Collect representative message samples: full Received chain, Message-ID, timestamps (UTC), and any NDR text returned by Outlook/Hotmail addresses.
- Run DNS/authentication checks: verify SPF (include and record correctness), DKIM signatures are present and passing, and DMARC alignment/policy. Record DNS record content and when they were last updated.

2) Local fixes and verification
- If SPF/DKIM/DMARC fail, correct DNS and re-test after DNS propagation. Keep logs of the fixes and propagation timestamps.
- If authentication is clean but SNDS shows negative telemetry, reduce sending rate to the affected IP (pause or throttle), review list hygiene and recent content changes, and review suppression lists.

3) Interpret SNDS with caution
- SNDS provides IP-level telemetry useful for trend analysis. It does not expose per-recipient delivery outcomes and should not be presented as definitive proof of acceptance. Use SNDS alongside message-level evidence (NDRs, headers).

4) When to open Microsoft sender support
- After you’ve gathered the items above and either fixed configurable issues or cannot find local causes, open a sender support request following Microsoft’s published path. Include:
  - SNDS export or screenshots showing the IP and timeframe
  - At least 3 representative message samples with full headers and Message-IDs
  - Any NDRs and exact bounce text/codes
  - DNS/authentication record snapshots and timestamps
  - Notes on whether the IP is shared or dedicated and recent volume changes

Microsoft documents the sender support route on its support site; follow that guidance when preparing a request and use the provided form/process to submit evidence [1].

Edge cases and provider-aware notes

- Shared vs dedicated IPs: For shared IPs, SNDS telemetry reflects aggregated activity; your own traffic may be affected by other senders. Consider isolating traffic on a dedicated IP if you can’t isolate root cause.
- IP warming or rotations: Rapid IP changes and insufficient warming can trigger reject/throttle behavior. If you recently moved IPs, include that timeline in your support materials.
- Temporary throttles and reputation signals: Microsoft may apply temporary throttling or filtering; you cannot infer internal acceptance rules from SNDS alone. Microsoft support may request additional samples and timing windows.

Decision checklist (use before escalating)
- Do you have full headers and Message-IDs? If not, gather them.
- Are SPF/DKIM/DMARC passing? If not, fix and wait for propagation.
- Do SNDS trends show recent spikes in complaints or volume? If yes, include SNDS export in your ticket.
- Is the sending IP shared? If yes, document the shared environment and consider isolation.

Links for further triage and provider-specific guidance
- Provider-specific triage guidance: /repmail/learn/deliverability/provider-specific-deliverability-triage
- Microsoft 365 diagnostics and deeper delivery tools: /repmail/learn/deliverability/microsoft-365-email-delivery-diagnostics
- Complete deliverability reference: /repmail/learn/deliverability/complete-guide-to-email-deliverability

## Sources

[1] https://support.microsoft.com/en-us/outlook/sender-support-in-outlook-com


## Related resources

Continue with [the related RepMail guide](/repmail/learn/deliverability/provider-specific-deliverability-triage), [the related RepMail guide](/repmail/learn/deliverability/microsoft-365-email-delivery-diagnostics), [the related RepMail guide](/repmail/learn/deliverability).


## Related resources

Continue with the [complete guide to email deliverability](/repmail/learn/deliverability/complete-guide-to-email-deliverability), review the [provider-specific triage guide](/repmail/learn/deliverability/provider-specific-deliverability-triage), and use the [sender reputation guide](/repmail/learn/deliverability/sender-reputation) when the workflow crosses into a neighboring concern.
