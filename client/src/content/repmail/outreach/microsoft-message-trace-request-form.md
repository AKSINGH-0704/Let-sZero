---
product: repmail
academy: outreach
contentType: guide
slug: microsoft-message-trace-request-form
title: "Microsoft Message Trace Request Form"
description: "Microsoft Message Trace Request Form — Non-admin operators need a structured request with sender, recipient, time window, subject, message ID, and question."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","microsoft","message","trace","request"]
assets:
  - type: table
    title: "Compact diagnostic table for choosing trace scope"
    content:
      headers: ["Situation","Use this scope","Why","Stop condition"]
      rows:
        - ["Single known Message-ID","Message-ID + ±15 minutes","Message-ID uniquely identifies the message across retries","Trace returns rows matching that Message-ID"]
        - ["Only subject known","Sender + recipient + ±30 minutes + exact subject","Subject may match multiple messages; add sender/recipient to narrow","Trace returns a single row or admin confirms ambiguity"]
        - ["User reports non-delivery but no header","Sender + recipient + ±1–2 hours","Allows for delays, retries and timezone uncertainty","Trace shows reject/deferral/queued events in window"]
        - ["Suspected policy block","Sender + recipient + ±30 minutes + filter for 'action' events","Captures DLP/Defender/Transport rule actions","Trace shows 'quarantine'/'blocked' or related action events"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Non-admin operators need a structured request with sender, recipient, time window, subject, message ID, and question."
  - "Distinct from Message Trace vs SNDS: operational handoff artifact for requesting trace evidence."
  - "provider incident intake; support packet"
commonMistakes:
  - "Skipping this check: Exact sender email address (copy-paste from the header if available)"
  - "Skipping this check: Exact recipient email address(es) — specify To/Cc/Bcc if relevant"
  - "Skipping this check: Message-ID (full value) or exact subject line if Message-ID unavailable"
faqs:
  - question: "Can message trace prove that an email reached the recipient's inbox?"
    answer: "No. Message trace shows mail flow and policy events recorded by Exchange/Defender (accepted, delivered to mailbox service, quarantined, rejected, etc.). 'Delivered' indicates delivery to the recipient's mailbox service but does not guarantee the message appeared in the user's inbox or was not moved by client rules. Use the trace to locate where the message stopped in the pipeline [1]."
  - question: "How long after send can an admin run a trace?"
    answer: "Microsoft maintains different retention windows for different trace types; modern traces cover recent days and extended traces can be requested for older events. This article does not assert specific retention durations—see Microsoft documentation for current retention guidance and use that to adjust your time window expectations [1]."
  - question: "What if the admin finds no matching rows?"
    answer: "If no matching trace rows appear, the admin should confirm that the search window, sender, recipient, and Message-ID were entered exactly and then expand the window incrementally. If still absent, the possible causes include the message never entering Exchange transport (e.g., blocked upstream) or being handled entirely by a third-party system; record the admin's findings and escalate with additional upstream provider details if available."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Use this form to request a Microsoft 365 message trace from a tenant admin in a way that minimizes follow-up. Provide precise sender/recipient information, an exact time window, the message subject or Message-ID, and a clear question about what you need from the trace.

## When to use this request form

Use this template when you need evidence from Microsoft 365 message trace data that only a tenant admin can run. This is an operational handoff artifact — it is not a request for policy guidance or deliverability consulting. Keep the scope limited to the specific message(s) and timeframe required to answer your question. Decision boundary: do not use this form to ask admins to check general mailbox content or to change tenant-wide security settings.

## Required fields and why each matters

Sender (exact email) and recipient (exact email) let the trace target a single message flow instead of broad timebox searches that cause noise. Time window (start and end in UTC or with timezone) constrains the trace to a feasible query and reduces admin work. Subject and Message-ID are disambiguators: Message-ID is authoritative if available; subject helps when Message-ID is absent. The question field defines the stop condition for the admin (what constitutes a sufficient answer). Evidence limits: message trace shows transport and policy events recorded by Exchange/Defender; it does not provide third-party mailbox content or proof of user intent [1].

## How to format the time window and identifiers

Provide times in ISO-like format (YYYY-MM-DD HH:MM) and state the timezone, or use UTC to avoid conversion errors. Use a narrow window that still covers clock skew and retries (typical: start = 10–15 minutes before the suspected send time, end = 10–15 minutes after last observed event). For Message-ID include the full angle-bracketed value if you have it (example: <CAFk...@email.domain>). If only the subject is known, include the exact subject and indicate whether it may be truncated or altered by quoting rules.

## What to ask the admin to return

Be explicit about the output you need: e.g., the trace log export (CSV) containing timestamp, sender, recipient, message-id, event type, status, and connector used; or a screenshot of the matching trace entry if you lack secure file transfer. Define acceptable formats and privacy constraints. Practical sequence: 1) admin runs the message trace per your fields; 2) admin filters and exports only the matching rows; 3) admin shares the file through your agreed secure channel. Stop condition: you have the trace rows that map the message lifecycle or the admin reports no matching records within the provided window.

## Decision boundary and evidence limits

Message trace will show delivery attempts, deferrals, rejections, and policy actions recorded by Exchange Online and Defender; it will not show mailbox-level content, user clicks, or third-party downstream delivery confirmations. Use message trace results to identify where a message stopped in the mail flow pipeline; do not expect it to prove final inbox placement. For claims about what trace can return, see Microsoft documentation for directional guidance [1].

## Practical checklist

- [ ] Exact sender email address (copy-paste from the header if available)
- [ ] Exact recipient email address(es) — specify To/Cc/Bcc if relevant
- [ ] Message-ID (full value) or exact subject line if Message-ID unavailable
- [ ] Precise time window with timezone (prefer UTC), start and end timestamps
- [ ] Clear question: what outcome or evidence you will accept (CSV, screenshot, or summary)
- [ ] Preferred secure delivery method for results and any redaction rules
- [ ] Any additional filters: connector name, accepted/rejected/deferred events, or PAM label
- [ ] Owner and SLA for the request (who asked and expected response time)
- [ ] If applicable, note whether a content search or mailbox access is authorized (separate request)

## Where RepMail fits

Use this article as an operational template and checklist when your team needs tenant admins to run Microsoft message traces. It reduces back-and-forth by standardizing fields, formatting, and the expected deliverable. Do not assume RepMail automates any step; treat this as a human-ready request artifact to include in your provider incident intake or support packet.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Microsoft 365 Message Trace Says Delivered: What Evidence Remains](/repmail/learn/deliverability/microsoft-365-message-trace-says-delivered-next-evidence)
- [Microsoft 365 Message Trace Search Window: Preserve Evidence Before It Expires](/repmail/learn/deliverability/microsoft-365-message-trace-search-window-evidence)


## Sources

[1]: https://learn.microsoft.com/en-us/exchange/monitoring/trace-an-email-message/message-trace-modern-eac "Microsoft documentation"
