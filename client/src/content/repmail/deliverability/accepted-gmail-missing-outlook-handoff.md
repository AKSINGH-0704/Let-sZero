---
product: repmail
academy: deliverability
contentType: guide
slug: accepted-gmail-missing-outlook-handoff
title: "Accepted by Gmail, Missing at Outlook: Provider Handoff Investigation"
description: "Accepted by Gmail, Missing at Outlook: Provider Handoff Investigation — A campaign appears healthy in Gmail but fails or disappears at Outlook, and averages co."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability","provider","gmail","outlook","accepted","missing","handoff"]
assets:
  - type: table
    title: "Handoff diagnostic decision table"
    content:
      headers: ["Observed evidence","Likely interpretation","Immediate action","Stop condition"]
      rows:
        - ["Gmail: 250 OK; M365 trace: no record","Message accepted by Google but Microsoft never received (or trace missed)","Provide SMTP transcript and message-id to Microsoft support; confirm recipient MX and forwarding paths","Microsoft confirms no receipt and opens investigation"]
        - ["Gmail: 250 OK; M365 trace: accepted; mailbox empty","Microsoft ingested message but mailbox-level action removed it (quarantine/transport rule)","Ask tenant admin to check quarantine, transport rules, and mail flow rules; request quarantine copy","Tenant provides mailbox/quarantine artifact"]
        - ["Gmail: 250 OK; Microsoft returned 4xx/5xx in SMTP","Immediate rejection at SMTP; message not accepted by Microsoft","Correct the cause (blocking IP, auth failure, rate throttle) and retry or appeal listing","SMTP returns 250 after remediation"]
        - ["Gmail: 250 OK; M365 trace shows deferred","Temporary deferral (rate, greylisting, throttling)","Monitor retries, confirm retry attempts in your logs; reduce send rate or follow provider guidance","Message eventually delivered or permanent bounce appears"]
        - ["Gmail: 250 OK; headers show forwarding/aliasing","Message routed through intermediate forwarder causing change in envelope/headers","Trace forwarder behavior, ensure SPF alignment or use authenticated forwarding methods","Source of forwarding identified and addressed"]
featured: false
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
keyTakeaways:
  - "A campaign appears healthy in Gmail but fails or disappears at Outlook, and averages conceal the split."
  - "Existing accepted-at-Gmail/junk-at-Outlook selection is about placement; this focuses on missing/acceptance handoff evidence and logs."
  - "Link to provider-split reporting, M365 trace, and Gmail evidence."
commonMistakes:
  - "Skipping this check: Segment campaign results by recipient MX domain (gmail.com vs outlook/office365/microsoft domains)."
  - "Skipping this check: Export your SMTP outbound transcript filtered to affected message-ids and recipients (include full SMTP exchange)."
  - "Skipping this check: Confirm 250/2xx acceptance per recipient and record message-id and timestamp."
faqs:
  - question: "If Gmail accepted the message, why would Outlook never receive it?"
    answer: "Acceptance by Gmail proves handoff into Google’s ingestion layer, not delivery to Microsoft. Reasons for Outlook not receiving include intermediate forwarding/aliasing, recipient tenant policies that drop or quarantine messages before generating traceable records, or network/routing differences. Confirm with your SMTP logs and an M365 trace; if Microsoft shows no receipt, escalate with precise message-IDs and timestamps [2]."
  - question: "Can provider documentation tell me exactly why a message was removed from an Outlook mailbox?"
    answer: "Provider documentation gives the mechanisms (quarantine, transport rules, spam filtering) but rarely reveals tenant-specific rule content or internal scoring thresholds. For mailbox-level evidence you typically need cooperation from the recipient’s tenant administrator and an M365 trace or quarantine export. Treat documentation as directional and verify with trace data where possible [2]."
  - question: "How many samples do I need to prove a provider-specific problem?"
    answer: "Start with 5–20 representative failures across the Outlook-family domains and the same campaign messages that succeeded at Gmail. The goal is reproducible handoff differences: consistent 250s to Gmail with absent or differing Microsoft traces. If patterns repeat across multiple recipients and timestamps, it supports a provider-specific issue worth escalating."
nextStep:
  label: "Continue with Provider-Specific Deliverability Triage: Gmail, Microsoft, and More"
  href: "/repmail/learn/deliverability/provider-specific-deliverability-triage"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

If messages are consistently accepted by Gmail but do not reach or are dropped at Outlook, focus the investigation on the SMTP handoff, provider responses, recipient-side telemetry, and per-provider reporting. Differences in acceptance signals, downstream processing (filtering or routing), and missing/partial logs are the likely fault zones; use provider traces and your own mail transfer logs to prove where delivery stops.

## Decision boundary: Acceptance vs. final delivery

Define acceptance as the remote provider returning a 2xx SMTP response for a specific RCPT TO and message-id. That does not guarantee eventual mailbox placement or visibility to end users. Your first decision is whether Gmail’s acceptance is a terminal handoff (message left your system and was accepted by Google) or whether Google later forwards or routes the message to a downstream system (rare for consumer Gmail but possible for enterprise Google Workspace integrations).
State evidence limits: an SMTP 250 OK from Gmail proves handoff only to Gmail’s ingestion layer; it does not prove Outlook behavior. Conversely, an SMTP 250 from Microsoft is the clearest evidence of handoff to Microsoft systems. Use both types of receipts to chart where the chain breaks.

## Collect the right logs in sequence

Start with your outbound SMTP logs filtered to the message-id and RCPT TO of affected recipients. Capture timestamps, EHLO/HELO, TLS negotiation, AUTH, and the remote SMTP response codes. Those logs show whether Gmail or Microsoft returned 2xx/4xx/5xx strings and the exact SMTP banner.
Next, get provider-side traces: for Microsoft, request an M365 message trace or delivery report for the same message-id and recipient to see internal disposition and delivery attempts; for Gmail, collect delivery logs or rejection messages if available. Provider traces are essential to verify internal handling beyond what an external SMTP 250 reveals [2].

## Interpret provider responses and common handoff failures

A 250 OK from Gmail with no corresponding M365 trace means either Outlook never received the message or M365 classified/consumed it internally without generating an expected trace. Common causes: downstream routing to internal quarantine, address mismatch (alias/forwarding), and middleboxes rewriting headers.
If Microsoft returns a 4xx/5xx on initial RCPT or DATA, that’s a clear block; the SMTP transcript will include diagnostic codes. If Microsoft shows acceptance in traces but the mailbox has no message, investigate rules, transport filters, auto-forwarding, or internal quarantine policies documented in Microsoft troubleshooting resources [2].

## Use split-provider reporting to avoid averaging traps

Averages across providers hide provider-specific failures. Break delivery metrics (acceptance rate, bounce rate, complaint rate) by receiving MX domain (gmail.com vs. outlook.com/microsoft.com/office365.com). If Gmail shows near-perfect acceptance but Outlook-family domains show low or zero deliveries, the issue is provider-specific; treat those recipients as a separate cohort for remediation.
Decision boundary: stop using aggregate stats for diagnostics. If a split exists, operate two parallel investigations: Gmail-side (authentication, content, sending rate) and Microsoft-side (MX behaviors, tenant policies, MTA reputation). Link to provider-split reporting internally so campaign owners can see per-provider yield.

## Practical sequence for handoff confirmation

1) Identify a sample of failed recipients across Outlook-family domains and the same campaign messages sent to Gmail. 2) Pull your SMTP outbound transcript for each sampled message; confirm Gmail returned 250 and capture the message-id and timestamps. 3) Request an M365 message trace for the same message-id/recipient and timeframe. Compare timestamps and IDs to see if Microsoft received or processed the message [2].
Stop conditions: if Microsoft trace shows no receipt, your logs are evidence to escalate to Microsoft support. If Microsoft trace shows acceptance but no mailbox copy, work with tenant admin to check quarantine, transport rules, and mailbox filters per Microsoft guidance [2].

## Limits, uncertainty, and escalation

Provider traces vary in retention, granularity, and what they expose to senders versus tenant admins. You may need cooperation from the recipient’s tenant admin for mailbox-level artifacts (quarantine, transport rule logs). When citing provider behavior, note that documentation and internal heuristics change; treat provider-side explanations as directional and verify with trace data where possible [1][2].
If external support is required, deliver a concise packet: your SMTP transcripts, affected message-ids, timestamps (UTC), sample recipient addresses, and the canonical RFC5321 SMTP exchange. This packet shortens the triage lifecycle and reduces back-and-forth.

## Practical checklist

- [ ] Segment campaign results by recipient MX domain (gmail.com vs outlook/office365/microsoft domains).
- [ ] Export your SMTP outbound transcript filtered to affected message-ids and recipients (include full SMTP exchange).
- [ ] Confirm 250/2xx acceptance per recipient and record message-id and timestamp.
- [ ] Request Microsoft 365 message trace for same message-id and timeframe (or ask tenant admin).
- [ ] If M365 shows no receipt, escalate with your SMTP logs and timestamps to Microsoft support.
- [ ] If M365 shows acceptance but no mailbox copy, ask tenant admin to check quarantine, transport rules, and mailbox-level filters.
- [ ] Compare header traces (Received chain) between Gmail-success and Outlook-failure samples to spot rewrites/forwards.
- [ ] Verify authentication (SPF/DKIM/DMARC) and alignment for the exact sending envelope and header domains for both samples.
- [ ] Preserve raw headers and body samples for provider support; avoid resending variants that change message-ids.

## Where RepMail fits

Use this guide as a checklist and decision aid when a campaign shows good Gmail yield but missing or failed Outlook deliveries. The article helps outbound operators collect the minimal evidence package (SMTP transcripts, message-ids, timestamps, and provider traces) needed to isolate the handoff boundary and accelerate escalations. Do not assume RepMail or any tool can substitute for provider message traces; integrate this process into your outbound workflow for faster triage.

Continue with [Provider-Specific Deliverability Triage: Gmail, Microsoft, and More](/repmail/learn/deliverability/provider-specific-deliverability-triage) for the next step in the workflow.

## Related RepMail guides

- [Google Workspace Recipient Mailbox Versus Personal Gmail: Choose the Right Test](/repmail/learn/deliverability/google-workspace-vs-personal-gmail-test)
- [Outlook.com Sender Support Form: What Logs and Headers to Include](/repmail/learn/deliverability/outlook-com-sender-support-evidence-packet)


## Sources

[1]: https://support.google.com/mail/answer/9981691?hl=en "Google sender or Workspace documentation"
[2]: https://learn.microsoft.com/en-us/troubleshoot/exchange/email-delivery/email-delivery-issues "Microsoft documentation"
