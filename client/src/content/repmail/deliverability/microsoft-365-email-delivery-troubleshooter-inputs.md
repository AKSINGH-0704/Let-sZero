---
product: repmail
academy: deliverability
contentType: template
slug: microsoft-365-email-delivery-troubleshooter-inputs
title: "Microsoft 365 Delivery Troubleshooter: Build a Reproducible Case"
description: "Microsoft 365 Email Delivery Troubleshooter Inputs: Build a Reprodu… — Admins lack the sender, recipient, time, and symptom details needed for the automated di."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability","provider","microsoft","email","365","delivery","troubleshooter"]
assets:
  - type: table
    title: "Quick diagnostic decision table"
    content:
      headers: ["Observed symptom","Required minimum inputs","Next action (local)","When to escalate to Microsoft"]
      rows:
        - ["Bounce with NDR","Message-ID, recipient, UTC timestamp, full NDR text","Search SMTP logs for Message-ID and match NDR timestamp","Escalate if no outbound log or Microsoft trace can't find message"]
        - ["Message never received (no NDR)","Message-ID (or envelope-from + ±1 min), recipient, UTC timestamp","Check outbound queue and gateway logs; verify anti-spam/quarantine","Escalate if outbound logs show handoff to Microsoft but message not traceable"]
        - ["Delivery delayed","Message-ID, recipient, UTC timestamp, hop timestamps","Collect timestamps from each hop and local queue delays","Escalate if Microsoft shows message stuck in their pipeline beyond expected retry window"]
        - ["Delivered but missing in Inbox","Message headers, recipient, UTC timestamp, mailbox search results","Search mailbox (Inbox/Junk/Deleted) and retention policies; provide EWS/MAPI item IDs if found","Escalate if Microsoft trace shows delivery but mailbox has no item"]
        - ["Distribution group or forwarded recipient","Message-ID, final recipient, group name, UTC timestamp","Check group delivery reports and forwarding rules","Escalate if group delivery shows delivered but final user did not receive"]
featured: false
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
keyTakeaways:
  - "Admins lack the sender, recipient, time, and symptom details needed for the automated diagnostic."
  - "Distinct from generic M365 sending limits and trace comparison; operationalizes the required inputs."
  - "Link to M365 support escalation and trace pages."
commonMistakes:
  - "Skipping this check: Copy the exact Message-ID from original headers or SMTP logs."
  - "Skipping this check: Record sender and recipient full mailbox addresses (no display names)."
  - "Skipping this check: Convert send time to UTC and include seconds and timezone offset if using local time."
faqs:
  - question: "What if I can’t find the Message-ID?"
    answer: "Provide the exact envelope-from plus a tight UTC window (±1–2 minutes) and include SMTP transaction IDs if available. State that the Message-ID is missing; support will run a time-window trace, which may return more results and increase investigation time."
  - question: "Can I use screenshots of the NDR instead of raw text?"
    answer: "Screenshots are useful for context but insufficient alone. Include the full raw NDR text or the SMTP bounce lines copied from server logs so the support engineer can search logs and automate matching."
  - question: "How precise must the timestamp be for successful tracing?"
    answer: "Priority is an exact UTC timestamp with seconds. If that is not possible, supply the smallest possible window and mark it as approximate; wider windows create more candidate matches and slow diagnosis."
nextStep:
  label: "Continue with Provider-Specific Deliverability Triage: Gmail, Microsoft, and More"
  href: "/repmail/learn/deliverability/provider-specific-deliverability-triage"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Provide the specific sender, recipient, timestamp, and symptom up front so Microsoft support or an automated diagnostic can act. This template shows exactly what to collect, how to validate it, and when to escalate so the first support contact is actionable and reproducible.

## What to provide first (decision boundary)

Give four concrete items in this order: sender address and Message-ID, recipient address, UTC timestamp (to the second) of send, and a short symptom phrase (bounced, delayed, not received, NDR). These are the minimum inputs Microsoft’s message-trace and support workflows require to locate a record reliably. If any of these are missing, automated diagnostics and trace lookups will either return multiple matches or no match at all.
Explain how to capture each field: pull the Message-ID from the sending system’s SMTP transaction or the original message headers; use recipient and sender full mailbox addresses; convert local time to UTC and include the timezone used. For symptoms, use the mailbox-level observable effect (NDR code, bounce text, or missing in Junk/Inbox) rather than subjective wording.

## How to validate the sender and Message-ID (evidence limits)

Confirm the Message-ID exists on the sending system before contacting support. Search server logs (SMTP receive/send logs) for the exact Message-ID; if logs show multiple messages with the same Message-ID, note this in your report and prefer the SMTP transaction ID if available. Microsoft traces rely on identifiers in their transport pipeline and may not match a Message-ID if the message was modified or re-sent by an intermediate system.
If you cannot find a Message-ID, provide the exact SMTP envelope-from and a 1-minute UTC range for the send time. State uncertainty explicitly: missing Message-ID reduces traceability and may require broader time-window traces, which increases investigation time and false positives.

## Which recipient details matter and why

Provide the recipient mailbox address and tenant domain; if the recipient is external to your tenant, include their receiving domain and any known forwarding paths. For shared mailboxes, distribution groups, or aliases, include the final intended mailbox and any recipient rewriting rules.
Explain the decision boundary: if the recipient is a distribution group, Microsoft’s trace may show delivery to the group rather than to the individual member. Specify whether the recipient checked Junk/Clutter, mail forwarding/transport rules, or retention policies before escalation.

## Timestamp precision and how to convert it

Supply the send time as UTC with at least second-level precision (e.g., 2026-09-25T14:03:27Z). If your logs only show local time, include the timezone and offset you used to convert to UTC and the conversion method. If you only have an approximate time, provide a tight window (±1–2 minutes) and flag that as an approximation.
Decision rule: use exact UTC when available. If only a range is possible, state the range explicitly and note that Microsoft may need to expand the trace window; that will produce more results and lengthen analysis time.

## Symptom framing and required artifacts

Describe the symptom using an observable artifact: full NDR text and headers, SMTP bounce codes (4xx/5xx), screenshots of mail clients showing absence of the message, and the original raw headers when available. For delayed delivery, provide message timestamps across hops (your outgoing queue, smart host, and any gateway).
Evidence limits: screenshots are helpful but not sufficient alone. Support needs the raw NDR or SMTP log lines and headers. If the message never left your environment, show the outbound queue entry and the exact SMTP log lines for the attempted delivery.

## When and how to escalate to Microsoft support

If you provided the sender, recipient, exact UTC timestamp (or tight window), Message-ID, and raw NDR/SMTP logs and Microsoft cannot locate the message, escalate with a single ticket containing all artifacts. Reference message trace guidance and troubleshooting pages when asking for a backend trace to be run [1][2].
Practical sequence: gather artifacts ➜ run local trace/log search ➜ collect UTC timestamp/Message-ID/NDR/raw headers ➜ open support case and paste artifacts. If you have already run a message trace in the EAC/PowerShell, include the trace ID and the query parameters used so support can reproduce your query [2].

## Practical checklist

- [ ] Copy the exact Message-ID from original headers or SMTP logs.
- [ ] Record sender and recipient full mailbox addresses (no display names).
- [ ] Convert send time to UTC and include seconds and timezone offset if using local time.
- [ ] Attach the full raw NDR text or SMTP bounce lines (no screenshots alone).
- [ ] Include outbound SMTP logs showing the Message-ID and transaction start/end times.
- [ ] Note any forwarding, distribution groups, or transport rules affecting the recipient.
- [ ] If a trace was run, include trace ID, query window, and filters used from the EAC/PowerShell [2].
- [ ] Provide a 1–2 minute UTC window if exact second is unknown and mark it as approximate.

## Where RepMail fits

Use this template as a standardized intake form for support tickets or internal escalation. In outbound workflows, require these fields (Message-ID, recipient, UTC timestamp, and raw NDR/log lines) before creating a case or passing an incident to the support queue; this raises first-contact resolution and avoids repeated information requests.

Continue with [Provider-Specific Deliverability Triage: Gmail, Microsoft, and More](/repmail/learn/deliverability/provider-specific-deliverability-triage) for the next step in the workflow.

## Related RepMail guides

- [Microsoft 365 Message Trace Says Delivered: What Evidence Remains](/repmail/learn/deliverability/microsoft-365-message-trace-says-delivered-next-evidence)
- [Microsoft 365 Message Trace Search Window: Preserve Evidence Before It Expires](/repmail/learn/deliverability/microsoft-365-message-trace-search-window-evidence)


## Sources

[1]: https://learn.microsoft.com/en-us/troubleshoot/exchange/email-delivery/email-delivery-issues "Microsoft documentation"
[2]: https://learn.microsoft.com/en-us/exchange/monitoring/trace-an-email-message/message-trace-modern-eac "Microsoft documentation"
