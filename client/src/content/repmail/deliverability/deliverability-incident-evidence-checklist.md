---
product: repmail
academy: deliverability
contentType: guide
slug: deliverability-incident-evidence-checklist
title: 'Deliverability Incident Timeline: What Evidence to Preserve'
description: Runbook/checklist describing what evidence to preserve during an email
  deliverability incident and how to record facts vs hypotheses.
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- deliverability
- incident response
- runbook
- email ops
- forensics
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
assets:
- type: table
  title: Incident Evidence Decision Checklist
  content:
    headers:
    - Evidence item
    - Where/how to capture
    - Why it matters
    - Action / Preserve if
    rows:
    - - Message-ID (and internal campaign ID)
      - Export raw message or mailbox entry; include campaign metadata from sending
        system
      - Links an individual bounce/rejection to a specific send/version
      - Any bounce/rejection or unexplained delivery change
    - - Full received headers (raw RFC headers)
      - Save original MIME with headers; copy Received chain verbatim
      - Shows delivery path, DKIM/ARC results, and which IP connected
      - If delivery discrepancy, SPF/DKIM/ARC failures, or provider query
    - - SMTP transcript / server replies (220/250/421/450/550 etc.)
      - Capture SMTP session logs from MTA or provider API; timestamp with timezone
      - Exact provider reply codes and messages needed for diagnosis and RFC-based
        interpretation [2]
      - Any transient or persistent 4xx/5xx behavior
    - - Sending IP / sending domain / provider
      - Log outbound host/IP and provider account identifier; note provider dashboard
        snapshots
      - Identifies reputation, rate-limits, and provider-side filtering
      - If volume changes, provider throttling, or reputation questions
    - - Campaign version / list segment
      - Export campaign definition, content snapshot, and recipient segment criteria
      - Content or targeting changes are common root causes
      - If an incident aligns with a new send or segment
    - - Change log (DNS, code, config, suppression lists)
      - Append recent commits, DNS edits, and account changes with timestamps
      - Prevents erasure of context by post-incident changes
      - Before any rollback or remediation activity
keyTakeaways:
- Immediately preserve raw artifacts (message IDs, full headers, SMTP transcripts,
  provider rejections, IP/domain, campaign metadata, list segment, and change log).
- Record facts separately from hypotheses and timestamp every preserved item.
- Capture both provider-side responses (bounces/rejections) and sender-side state
  (campaign version, segmentation, recent changes) before making remediation changes.
commonMistakes:
- Making configuration changes (IP warmup, DNS, or suppression lists) before capturing
  SMTP replies and raw headers.
- Mixing unverified assumptions with logged facts in the same timeline entry.
- Relying only on summary dashboards; summaries can omit SMTP-level detail needed
  for provider support.
faqs:
- question: How long should we retain preserved evidence after an incident?
  answer: Retain preserved raw artifacts until the root cause is confirmed and any
    provider dispute is resolved. For provider support requests (e.g., Gmail or Outlook)
    you may need to supply headers and SMTP transcripts; keep artifacts at least until
    support closes the case. If your retention policy has stricter limits, export
    and store the incident bundle in a secure long-term location before expiring logs.
- question: What format should SMTP transcripts and headers be saved in?
  answer: Save SMTP transcripts and full raw headers as plain text files with clear
    filenames that include timestamps, message IDs, and the capturing host. Attach
    any provider bounce notifications (bounce messages or rejection dumps) as original
    MIME files where possible so recipient headers and provider metadata remain intact.
- question: If a provider returns only aggregated metrics, is that useful?
  answer: Aggregated metrics help scope impact, but they rarely contain the diagnostic
    detail needed to prove causation. Always try to supplement metrics with at least
    one raw message (headers + SMTP transcript) that demonstrates the observed error.
nextStep:
  label: Follow the sender reputation recovery plan
  href: /repmail/learn/deliverability/sender-reputation-recovery-plan
  description: After preserving evidence, use the sender reputation recovery plan
    to map evidence to remediation steps and escalation.
---

Direct answer: Immediately preserve raw artifacts — message IDs, complete raw headers, SMTP transcripts (server replies), sending provider and IP/domain, campaign version and list segment, and an auditable change log — and record facts separately from hypotheses so you don’t erase diagnostic context when you remediate.

Step-by-step checklist

1) Freeze evidence first, act later
- Before you change DNS, IP configuration, suppression lists, or resend traffic, export and store raw artifacts. That includes the original MIME with headers, SMTP session logs from your MTA or provider, and provider bounce/rejection messages. Changes can remove or alter the signals you need.

2) Capture these core artifacts (in order of priority)
- Message-ID and internal campaign ID: tie provider responses to a specific send.  
- Full raw headers (Received: chain, DKIM/ARC/SPF results): paste verbatim from mailbox or MTA.  
- SMTP transcript and server replies: save the full session text with timestamps; RFC guidance describes SMTP replies used for interpretation [2].  
- Provider identity and sending IP/domain: note the provider account, sending pool, and advertised HELO/EHLO.  
- Campaign metadata and list segment: include exact content snapshot and recipient query.  
- Change log: collect recent deploys, DNS edits, suppression list updates, and admin actions with timestamps.

3) Record facts vs hypotheses
- For every preserved item, create a timestamped entry labeled FACT: or HYPOTHESIS:. Facts are direct exports (e.g., “SMTP 550 5.7.1: blocked - policy” with transcript). Hypotheses are possible causes you will test (e.g., “hypothesis: new template triggered complaint filtering”). Keep them separate in the incident timeline to avoid contaminating provider support requests.

4) Provider-aware actions and support
- When contacting provider support, include at least one representative raw message (headers + transcript). Providers have docs for user-submitted evidence — follow their guidance for logs and support cases (see Gmail and Outlook guidance) [1][3]. Don’t assert internal remediation steps in the initial support case; provide the preserved facts first.

5) Edge cases and special notes
- Transient 4xx vs permanent 5xx: capture the exact code and message. RFC5321 explains SMTP reply semantics used to distinguish temporary vs permanent failures [2]. If a provider returns only aggregated or delayed reports, still keep your raw artifacts — they are often required to correlate provider-side events.
- Missing headers: if a provider strips or rewrites headers, note that as a fact and include captured Received chain from your MTA.  
- High-volume incidents: sample representative messages across segments and times if you cannot preserve every message; include at least one example per impacted segment/version.

6) Timeline entry template (one line per artifact)
- Timestamp | FACT/HYPOTHESIS | Artifact type | Short description | File reference

Useful internal references
- For remediation planning after evidence capture, consult the sender reputation recovery plan (/repmail/learn/deliverability/sender-reputation-recovery-plan) and use email sending observability tooling (/repmail/learn/email-platform/email-sending-observability) to backfill missing metrics. If SMTP reply interpretation is needed, see guidance on SMTP 4xx/5xx responses (/repmail/learn/deliverability/smtp-4xx-5xx-email-errors). For broader context, review the complete guide to email deliverability (/repmail/learn/deliverability/complete-guide-to-email-deliverability).

Sources

[1] https://support.google.com/mail/answer/14668346?hl=en
[2] https://www.rfc-editor.org/rfc/rfc5321
[3] https://support.microsoft.com/en-us/outlook/sender-support-in-outlook-com


## Related resources

Continue with [the related RepMail guide](/repmail/learn/deliverability/sender-reputation-recovery-plan), [the related RepMail guide](/repmail/learn/email-platform/email-sending-observability), [the related RepMail guide](/repmail/learn/deliverability/smtp-4xx-5xx-email-errors).


## Related resources

Continue with the [complete guide to email deliverability](/repmail/learn/deliverability/complete-guide-to-email-deliverability), review the [provider-specific triage guide](/repmail/learn/deliverability/provider-specific-deliverability-triage), and use the [sender reputation guide](/repmail/learn/deliverability/sender-reputation) when the workflow crosses into a neighboring concern.


## Sources

- [FTC CAN-SPAM compliance guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)
- [Google email sender guidelines](https://support.google.com/mail/answer/81126?hl=en)
