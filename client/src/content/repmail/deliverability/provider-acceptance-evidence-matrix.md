---
product: repmail
academy: deliverability
contentType: comparison
slug: provider-acceptance-evidence-matrix
title: "Provider Acceptance Evidence Matrix: SMTP, Trace, Header, Mailbox"
description: "Provider Acceptance Evidence Matrix: SMTP Reply, Trace, Header, Mai… — Teams use “delivered” inconsistently and need a common evidence vocabulary across receiv."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability","provider","smtp","acceptance","evidence","matrix"]
assets:
  - type: table
    title: "Acceptance Evidence Decision Table"
    content:
      headers: ["Observed artifact","Decision/label","Immediate action","Escalation trigger"]
      rows:
        - ["SMTP 2xx reply (full transcript)","Provider accepted — protocol level","Proceed to post-acceptance processing; schedule mailbox sampling","If message missing in mailbox sample after provider trace indicates accepted"]
        - ["SMTP 4xx/5xx reply","Not accepted — protocol error","Retry or mark failed per retry policy; log error codes","If persistent 4xx/5xx for same recipient, escalate to deliverability owner"]
        - ["Provider delivery trace shows internal drop/blocked","Trace-indicated policy rejection","Gather SMTP transcript and headers; open provider case with trace ID","If provider response is inconclusive after support case"]
        - ["Headers show downstream rewrite or authenticated failure","Forensic evidence of policy/auth issue","Correlate with SMTP transcript and re-authenticate or fix signing","If fixes do not change header outcomes for multiple messages"]
        - ["Mailbox observation: message in inbox or spam","User-visible outcome","Record folder and UI flags; use for stakeholder reports","If high-volume divergence from expected placement"]
featured: false
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
keyTakeaways:
  - "Teams use “delivered” inconsistently and need a common evidence vocabulary across receivers."
  - "Distinct from SMTP accepted missing inbox; formalizes evidence levels by provider and artifact."
  - "Core hub linking all provider diagnostic pages."
commonMistakes:
  - "Skipping this check: Capture and archive the full SMTP session transcript (EHLO, MAIL FROM, RCPT TO, DATA, server replies)."
  - "Skipping this check: Normalize acceptance status: mark as “provider accepted” only on a 2xx SMTP reply."
  - "Skipping this check: Pull provider delivery traces within documented retention windows; record trace IDs and timestamps."
faqs:
  - question: "If I have a 2xx SMTP reply, should I stop retrying and consider delivery successful?"
    answer: "Treat a 2xx reply as protocol-level acceptance and stop retrying at the SMTP layer, but do not treat it as a guarantee of inbox placement. Continue with post-acceptance steps: collect provider traces, sample mailboxes, and monitor downstream folder placement. Retry logic applies when you receive 4xx/5xx responses or transient network failures."
  - question: "When should I open a provider support case versus relying on mailbox samples?"
    answer: "Open a provider case when you have an SMTP 2xx reply but provider traces indicate a drop or when multiple mailbox samples show a persistent missing or misfiled message. Include SMTP transcripts, trace IDs, raw headers, timestamps, and representative recipient addresses. Use mailbox samples for confirmation but provider traces and SMTP logs are typically required for a decisive investigation."
  - question: "Can headers alone prove a provider accepted or rejected a message?"
    answer: "Headers are useful for post-delivery forensics but are not authoritative for live acceptance decisions. Prefer the SMTP transcript for acceptance status; use headers to locate where policy actions occurred or to verify authentication results. If headers contradict SMTP logs, document the discrepancy and prioritize the SMTP session for acceptance labeling."
nextStep:
  label: "Continue with Provider-Specific Deliverability Triage: Gmail, Microsoft, and More"
  href: "/repmail/learn/deliverability/provider-specific-deliverability-triage"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Use a consistent evidence taxonomy to decide whether a message is “accepted” by a provider and what next steps are justified. This matrix maps four evidence artifacts (SMTP reply, delivery trace, headers, mailbox observation) to provider acceptance categories so teams can stop arguing over “delivered” and act on reproducible signals.

## Decision boundary: What counts as provider acceptance

Treat provider acceptance as the earliest artifact that proves the receiving system accepted a message for further processing. An SMTP 2xx reply is the strongest real-time acceptance signal because it shows the receiver acknowledged receipt at the protocol layer. However, acceptance does not imply inbox placement, and subsequent filtering or user-visible delivery can still fail.
Define the operational boundary: if you have a 2xx reply, mark the message as “provider accepted”; if you only have queued/tracing records without a 2xx, treat it as “not accepted” until confirmed. This keeps routing, retry, and escalation decisions consistent across teams.

## Evidence types and limits

SMTP reply: A 250/2xx response from the receiver’s MTA is deterministic proof of protocol-level acceptance. It is usable for SLA/uptime and retry logic but not for spam/folder outcomes. Store the entire SMTP transcript including session start and time to tie acceptance to the exact envelope used.
Delivery trace: Provider-side traces (eg. Google Postmaster traces, Microsoft Exchange traces) show internal handoffs and policy actions and can indicate where a message was dropped or deferred. These traces are provider-specific in format and timing; treat them as directional unless the provider documents them as definitive [1][2].

## Headers and forensic limits

Message headers (Received, Authentication-Results, X-Provider-Return-Path) are useful for post-delivery forensics: they can show which hop accepted the message and whether authentication passed. Headers may be altered by intermediate relays and are not authoritative for live acceptance decisions; use them to diagnose later-stage rejections or routing anomalies.
Preserve raw headers from user-visible mailbox copies or from provider trace exports. When the header contradicts your SMTP logs, prioritize the SMTP session transcript for acceptance but use headers to locate post-acceptance policy applications.

## Mailbox observation and user-visible evidence

A mailbox observation (message visible in inbox, spam folder, or not visible) is the final behavioral evidence of end-user delivery. It's authoritative for user impact but slow and subject to client-level sync, folder rules, and caching. Use mailbox observations to confirm policy outcomes and for QA sampling, not to decide immediate retry logic.
When possible capture mailbox metadata: folder, timestamps, provider UI flags (eg. Gmail’s ‘Promotions’ label) and any provider-supplied diagnostic tokens. Note that some providers do not expose all mailbox metadata to senders or third parties [1][3][4].

## Practical sequence: how to collect and escalate

Sequence your instruments: 1) record SMTP transcript at send time; 2) poll provider traces or APIs for internal delivery status within provider-specific windows; 3) capture message headers from mailbox samples; 4) check mailbox observation for user impact. If any earlier artifact indicates non-acceptance (eg. 4xx/5xx SMTP errors), stop and retry or escalate instead of waiting for mailbox checks.
Escalation rules: if SMTP shows acceptance but provider trace shows policy drop, open a provider case with trace IDs and paste the SMTP transcript and sample headers. If traces are unavailable or inconclusive, use mailbox observations as tie-breakers but document the timing and sample size used.

## Provider-specific caveats and uncertainty

Provider telemetry and export formats differ and change; references from provider support pages describe their own trace and acceptance artifacts but should be treated as directional [1][2][3][4]. For example, Google and Microsoft publish documentation about delivery and traces that help interpret their artifacts, but APIs and UI exports vary in retention and fields [1][2].
State uncertainty explicitly in reports: when you lack a 2xx SMTP reply but see a provider trace, label the status as “trace-indicated” rather than “accepted.” When a provider’s documentation is ambiguous about what a trace field means, record that ambiguity in your ticket to avoid incorrect operational assumptions.

## Practical checklist

- [ ] Capture and archive the full SMTP session transcript (EHLO, MAIL FROM, RCPT TO, DATA, server replies).
- [ ] Normalize acceptance status: mark as “provider accepted” only on a 2xx SMTP reply.
- [ ] Pull provider delivery traces within documented retention windows; record trace IDs and timestamps.
- [ ] Extract raw message headers from mailbox copies or provider dumps and store alongside the SMTP transcript.
- [ ] Run mailbox sampling after acceptance to confirm folder placement and capture UI flags.
- [ ] If SMTP acceptance exists but the message is not visible, open a provider case including SMTP transcript, trace IDs, and sample headers.
- [ ] Use header Received chains to map which hop performed acceptance when multiple relays are involved.
- [ ] Avoid using mailbox absence alone to mark a message as not delivered unless checking multiple samples and account states.
- [ ] Log uncertainty in reports when provider docs or traces are ambiguous; include the exact fields that are unclear.

## Where RepMail fits

This matrix gives outbound and deliverability teams a shared evidence vocabulary to reduce disputes about whether mail was “delivered.” Use it as a checklist in send workflows and in post-incident reports: require SMTP transcripts for acceptance claims, attach trace IDs when escalating to providers, and include mailbox samples only as user-impact confirmation. The guidance is a decision aid and should be adapted to provider-specific trace capabilities and retention windows.

Continue with [Provider-Specific Deliverability Triage: Gmail, Microsoft, and More](/repmail/learn/deliverability/provider-specific-deliverability-triage) for the next step in the workflow.

## Related RepMail guides

- [Yahoo SMTP Error Codes: Build a Sender-Side Triage Table](/repmail/learn/deliverability/yahoo-smtp-error-codes-sender-triage)
- [Accepted by Gmail, Missing at Outlook: Provider Handoff Investigation](/repmail/learn/deliverability/accepted-gmail-missing-outlook-handoff)


## Sources

[1]: https://support.google.com/mail/answer/9981691?hl=en "Google sender or Workspace documentation"
[2]: https://learn.microsoft.com/en-us/troubleshoot/exchange/email-delivery/email-delivery-issues "Microsoft documentation"
[3]: https://senders.yahooinc.com/faqs/ "Yahoo sender documentation"
[4]: https://support.apple.com/en-us/102322 "Apple Support documentation"
