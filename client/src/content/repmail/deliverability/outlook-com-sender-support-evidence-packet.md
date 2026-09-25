---
product: repmail
academy: deliverability
contentType: template
slug: outlook-com-sender-support-evidence-packet
title: "Outlook.com Sender Support Form: What Logs and Headers to Include"
description: "Outlook.com Sender Support Form: What Logs and Headers to Include — A sender needs to contact Microsoft/Outlook support but does not know which identifiers mak."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability","provider","outlook","com","support","form"]
assets:
  - type: table
    title: "Decision table: choose the right primary evidence to submit"
    content:
      headers: ["Observed failure mode","Primary evidence to include first","Why this matters","Stop condition (support can act)"]
      rows:
        - ["Immediate hard bounce with 5xx at SMTP","Full SMTP transcript + raw headers + UTC timestamp","Shows the exact 5xx code and server text needed to map to filter","Support locates matching ingress log and returns root cause"]
        - ["Transient 4xx deferrals","SMTP transcript with repeated attempt timestamps + headers","Shows repeated failures and timing; distinguishes throttling vs transient","Support confirms throttling or advises retry window"]
        - ["No bounce, silent non‑delivery","Complete headers + Received chain + multiple samples","Allows matching of connection and identification of silent discard","Support confirms discard or points to quarantine/filters"]
        - ["Message delivered but marked spam","Raw headers + Authentication results (DKIM/SPF/DMARC) + sample content snippet","Authenticates identity and helps inspect content-related signals","Support identifies spam signal or suggests content diagnostician"]
        - ["Intermittent failures across clusters","Samples from each cluster with IPs, timestamps, and transcripts","Enables cross-cluster correlation and identification of one bad cluster","Support pinpoints affected cluster or asks for more samples"]
featured: false
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
keyTakeaways:
  - "A sender needs to contact Microsoft/Outlook support but does not know which identifiers make the case actionable."
  - "Distinct from existing Outlook sender-support title by specifying reproducible log/header fields and timeline."
  - "Link to Outlook rejection, trace, and incident evidence pages."
commonMistakes:
  - "Skipping this check: Export the raw .eml for a representative failure and attach it unmodified."
  - "Skipping this check: List public source IP(s) used to send the sample and the HELO/EHLO string."
  - "Skipping this check: Include DKIM header (d= and s= values) and SPF envelope result for the sample."
faqs:
  - question: "Do I need to open a case for every rejected message?"
    answer: "No. Start with representative samples: one hard bounce and up to three additional samples covering different times or clusters. Support will ask for more if they cannot reproduce from the samples."
  - question: "Will Microsoft remove a block if I provide these logs?"
    answer: "Providing the logs makes the case actionable and speeds diagnosis, but Microsoft’s resolution depends on their internal triage and the identified cause. This guide only lists evidence that helps support locate and investigate the event."
  - question: "Can I submit redacted headers for privacy?"
    answer: "Only redact message content or PII; do not redact Received lines, timestamps, IPs, DKIM d= selector or SPF envelope addresses. If you must redact, state exactly what was removed and why."
nextStep:
  label: "Continue with Provider-Specific Deliverability Triage: Gmail, Microsoft, and More"
  href: "/repmail/learn/deliverability/provider-specific-deliverability-triage"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Include a compact, time-ordered evidence packet when contacting Microsoft/Outlook sender support: authenticated sending identifiers, full received SMTP transcript for a sample message, the complete RFC‑822 headers for that sample, and the precise UTC timestamps. Those four items let a support engineer reproduce delivery attempts, correlate logs, and escalate to the Outlook delivery team without repeated back-and-forth.

## Minimum packet: what to attach and why

Attach four elements for every case: (1) authenticated identifiers (IP, HELO/EHLO, envelope MAIL FROM, Return-Path, and From header), (2) the full SMTP session transcript (showing the server responses and any 4xx/5xx codes), (3) the complete message headers (raw RFC‑822 headers including Received lines), and (4) exact UTC timestamps for when the sending server transmitted the message and when you observed any bounces or NDRs. These items let support match an incoming connection to Outlook’s ingestion logs and identify which anti‑abuse filter or throttle applied.

Do not send redacted headers or partial transcripts as a first response. Missing Received lines, timestamps, or the SMTP response code prevents Microsoft from correlating the sample to their logs and typically generates a request for additional detail.

## Authenticated identifiers: fields that matter

Provide IP addresses (public source IP seen by your MTA), HELO/EHLO string, DKIM domain and selector, SPF return (and the envelope MAIL FROM), and the From/header.From address. Also include any 3rd‑party sending service identifiers (subaccount, sending cluster, or customer_id) if applicable. These are the primary keys Microsoft uses to group and trace connections.

Decision boundary: if DKIM is absent, note that explicitly and include the exact SPF result and envelope address. If multiple IPs or clusters could have sent the mail, include each candidate with timestamps and confidence level so support can narrow the search.

## SMTP transcript and response codes: precise capture

Attach the full SMTP transcript captured by your sending host or by a test connection to Outlook’s MX. Include EHLO, AUTH (if present), MAIL FROM, RCPT TO, DATA, the DATA content terminator ".", and the server responses. Highlight any 4xx or 5xx responses and copy the exact textual response. This lets engineers see whether the message was deferred, bounced, or silently dropped.

Evidence limits: if you only have a bounce message (NDR), include the full bounce text and the original headers; don’t rely on paraphrases. Paraphrased error descriptions are often insufficient to locate a log entry.

## Message headers and Received chain: what to preserve

Provide the entire RFC‑822 header block verbatim, including all Received: lines from your MTA to the Outlook MX. Received lines are the breadcrumb trail Microsoft uses to validate path and timing. If your sending infrastructure strips or rewrites Received lines, note that and include any internal logs that show the handoff sequence.

Practical sequence: export the raw message file (.eml) or copy/paste the headers into a plain‑text attachment. Ensure no line breaks are added or removed, and keep headers in original order.

## Timeline and repeatability: timestamps and sample selection

Give precise UTC timestamps (to the second) for: when the message left your SMTP server, when any internal MX logs show the handoff, when the NDR was received (if any), and the timeframe during which the issue was observed (start and end). If the issue is intermittent, provide multiple representative samples from different times.

Stop condition: if support can reproduce the problem for a provided sample and confirms a root cause, you should close the ticket; otherwise request clear next steps and what additional evidence they need.

## What not to send and legal/privacy cautions

Do not include full user content or PII beyond the sample headers and identifiers—send only the raw headers and SMTP transcript. When you must include message content for reproduction, redact personal data and state what was redacted.

Uncertainty note: Microsoft’s internal processes and thresholds can change; if a support engineer requests specific log extracts or alternate time windows, provide them. This guide sets a practical minimum, not a guaranteed set that will always resolve every escalation.

## Practical checklist

- [ ] Export the raw .eml for a representative failure and attach it unmodified.
- [ ] List public source IP(s) used to send the sample and the HELO/EHLO string.
- [ ] Include DKIM header (d= and s= values) and SPF envelope result for the sample.
- [ ] Attach the full SMTP transcript from your MTA showing server responses.
- [ ] Copy the entire RFC‑822 header block including all Received: lines.
- [ ] Provide exact UTC timestamps (to the second) for send and bounce events.
- [ ] If using a 3rd‑party platform, include subaccount/cluster identifiers.
- [ ] Note any header rewriting, proxying, or message redaction performed internally.
- [ ] If intermittent, attach at least three samples from separate time windows.

## Where RepMail fits

Use this checklist as a triage template in your outbound incident workflow: attach the specified evidence packet to the initial case to reduce back-and-forth and speed escalation. The table and checklist can be used by operators to decide which sample to submit and when to collect additional logs.

Continue with [Provider-Specific Deliverability Triage: Gmail, Microsoft, and More](/repmail/learn/deliverability/provider-specific-deliverability-triage) for the next step in the workflow.

## Related RepMail guides

- [Accepted by Gmail, Missing at Outlook: Provider Handoff Investigation](/repmail/learn/deliverability/accepted-gmail-missing-outlook-handoff)
- [Yahoo Sender Support Request After a New IP or Domain Launch](/repmail/learn/deliverability/yahoo-sender-support-new-ip-domain-launch)


## Sources

[1]: https://senders.yahooinc.com/contact/ "Yahoo sender documentation"
[2]: https://senders.yahooinc.com/smtp-error-codes/ "Yahoo sender documentation"
