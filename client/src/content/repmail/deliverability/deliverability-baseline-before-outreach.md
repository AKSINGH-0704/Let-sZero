---
product: repmail
academy: deliverability
contentType: guide
slug: deliverability-baseline-before-outreach
title: How to Build a Deliverability Baseline Before Outreach
description: Practical, measurable plan to record pre-outreach deliverability status
  for cold email programs.
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- deliverability
- baseline
- cold email
- outbound
- founders
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
assets:
- type: table
  title: Baseline Worksheet — Decision Table
  content:
    headers:
    - Field
    - Observable measurement
    - How to capture
    - Baseline window
    - Decision trigger
    rows:
    - - Sending domain DNS auth (SPF/DKIM/DMARC)
      - Pass/Fail and record of DNS records
      - DNS TXT queries and signed header samples; save full responses
      - Day 0 (before sends)
      - Any auth failure → fix and re-check before outreach
    - - Envelope and header alignment
      - Author domain vs return-path match
      - Inspect message headers from seeded inboxes and SMTP logs
      - Same as auth check
      - Misalignment → adjust From/Return-Path or DKIM signing domain
    - - Raw bounces and SMTP responses
      - Full bounce text and SMTP status codes
      - Collect SMTP logs/MAAs and archive bounce headers
      - Throughout window
      - Repeat/consistent 5xx rejects → pause sending and diagnose
    - - Inbox placement sample
      - Where a seeded set of test accounts delivered (inbox/spam/blocked)
      - Send identical test messages to a small, consistent seed list across providers
      - 3–7 day window
      - High spam-folder rate at a provider → investigate content and sender reputation
    - - Volume and sending cadence
      - Messages sent per domain/IP per day
      - Export send logs with timestamps
      - Full window
      - Unexpected spikes vs plan → throttle and re-baseline
keyTakeaways:
- A deliverability baseline is a measurement plan (cohort, window, and metrics) you
  record before any cold outreach.
- Record only observable signals (DNS auth status, sending IP/domain behavior, inbox
  placement samples, bounces) and timestamp them; do not assume provider thresholds.
- Use short controlled cohorts and fixed windows so later A/B comparisons are valid;
  store raw data and the collection method for repeatability.
commonMistakes:
- Treating a baseline as a promised deliverability score or threshold instead of a
  planning artifact.
- Mixing cohorts or changing measurement windows between ‘before’ and ‘after’ (invalidates
  comparisons).
- Relying on improvised or undocumented sampling (no capture of exact timestamps,
  message IDs, or recipient cohorts).
faqs:
- question: How long should my baseline window be?
  answer: Pick a short, reproducible window that balances signal and noise — commonly
    3–7 days for initial checks. The window should be fixed and recorded; longer windows
    can hide recent changes. If sending volume is very low, extend the window to capture
    enough samples but keep the cohort definition identical for before/after comparisons.
- question: Which metrics are required vs optional?
  answer: 'Required: DNS authentication (SPF/DKIM/DMARC) status, sent message count,
    bounces with codes, delivery failure/rejection samples, and a small inbox placement
    sample across target providers. Optional: engagement (opens/clicks) and spam-folder
    rates if you have reliable inbox-placement tooling. Only record observable fields
    and how you captured them.'
- question: Do I need to wait for authentication propagation?
  answer: Yes — check DNS auth records and timestamp the check. DNS changes can take
    hours to propagate; record the exact time you verified SPF/DKIM/DMARC so the baseline
    accurately reflects live conditions. Provider guidance on authentication and sender
    behavior is relevant when troubleshooting [1][2].
- question: Can I use provider dashboards as the only source?
  answer: Provider dashboards are useful but may not expose raw message IDs, full
    bounce codes, or sampling methodology. Capture raw SMTP responses, bounce headers,
    and a small seeded inbox sample you control to verify placement; keep both dashboard
    exports and raw artifacts.
nextStep:
  label: Run the pre-send deliverability checklist
  href: /repmail/learn/deliverability/pre-send-deliverability-checklist
  description: Complete the pre-send deliverability checklist to validate DNS, sending
    domain setup, and observability before you run this baseline. See the pre-send
    checklist for setup details.
---

Direct answer (first paragraph):
A deliverability baseline for cold email is a short, documented measurement plan you run before any outreach that records observable signals (DNS auth state, SMTP bounce texts, send volume, and a small inbox-placement sample) for a defined cohort and time window so later changes can be compared reliably. This is a measurement artifact — not a guarantee of future inbox placement or a universal threshold.

Practical steps
1) Define cohort, window, and collection methods
- Cohort: pick the exact sending domain(s)/IP(s) and the recipient seed list you will use later. Include control addresses you own. Do not mix cohorts. 
- Window: choose a fixed, short window (for example, a 3–7 day window) and record start/end timestamps. If your volume is very low, lengthen the window but keep it identical for before/after. 
- Collection method: document how you captured each metric (DNS query tool, SMTP logs, mailbox exports, API endpoints). Save raw artifacts (DNS query results, full bounce headers, exported logs).

2) Record only observable fields (and why they matter)
- DNS authentication: record SPF/DKIM/DMARC TXT records and whether signed headers appear in sample messages. These are observable via DNS queries and header inspection; provider documentation is relevant when troubleshooting [1][2].
- SMTP responses and bounces: save full SMTP responses and bounce headers (not just summarized counts). Bounce text often contains actionable codes.
- Inbox placement sample: send identical test messages to your seed accounts at the providers you target and record folder placement and timestamps. Use consistent message content and subjects.
- Volume and cadence: export exact send timestamps and counts per domain/IP during the window.

3) How to capture and store evidence
- Use command-line DNS checks or API queries and save outputs with timestamps. 
- Export SMTP logs from your platform or capture via a logging proxy. Archive bounce headers and message IDs. 
- Keep a small set of controlled inboxes (Gmail, Outlook, Yahoo or your target providers) and capture full raw headers for delivered messages.

4) Decision triggers (examples from the worksheet)
- If SPF/DKIM/DMARC are missing or misaligned, stop and fix before outreach. Providers document authentication expectations; treat those docs as troubleshooting references [1][2].
- If repeated 5xx rejects appear in SMTP logs for your domain/IP, pause sends and investigate. 
- If a provider consistently places test messages to spam, review content, sending rate, and reputation; re-run baseline after fixes.

Edge cases and provider awareness
- Low-volume senders: expect noisier signals; extend the baseline window and annotate why. 
- Recent DNS changes: re-check and timestamp — propagation can affect results. 
- Provider dashboards may not disclose raw headers or sampling methodology; supplement dashboards with raw logs and seeded inbox captures.

Use this worksheet to produce reproducible before/after comparisons. Store the exact cohort, dates, message samples, and capture commands alongside the results — that preserves your measurement protocol as a durable planning artifact rather than an ad hoc check.

Internal resources
- Use the pre-send deliverability checklist to validate setup before running this baseline: /repmail/learn/deliverability/pre-send-deliverability-checklist. 
- If you need deeper logging and observability guidance, see our email sending observability page: /repmail/learn/email-platform/email-sending-observability. 
- For distinctions between inbox placement and broader deliverability concepts, consult inbox placement vs deliverability: /repmail/learn/deliverability/inbox-placement-vs-deliverability. 
- For broader background on deliverability, see the complete guide to email deliverability hub: /repmail/learn/deliverability/complete-guide-to-email-deliverability.

## Sources
[1] https://support.google.com/mail/answer/14668346?hl=en
[2] https://support.google.com/a/answer/81126


## Related resources

Continue with [the related RepMail guide](/repmail/learn/deliverability/pre-send-deliverability-checklist), [the related RepMail guide](/repmail/learn/email-platform/email-sending-observability), [the related RepMail guide](/repmail/learn/deliverability/inbox-placement-vs-deliverability).


## Related resources

Continue with the [complete guide to email deliverability](/repmail/learn/deliverability/complete-guide-to-email-deliverability), review the [provider-specific triage guide](/repmail/learn/deliverability/provider-specific-deliverability-triage), and use the [sender reputation guide](/repmail/learn/deliverability/sender-reputation) when the workflow crosses into a neighboring concern.
