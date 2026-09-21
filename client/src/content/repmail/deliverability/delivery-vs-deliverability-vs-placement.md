---
contentType: knowledge-base
slug: delivery-vs-deliverability-vs-placement
title: "Delivery vs Deliverability vs Placement: The Three Stages"
description: "Separate SMTP acceptance, deliverability, and inbox placement so your email diagnostics point to the stage that actually failed."
authorSlug: repmail-team
publishedAt: "2026-09-21"
tags: ["delivery", "deliverability", "inbox-placement", "smtp"]
keyTakeaways:
  - "Delivery is the transport event: a receiving system accepted or deferred the message."
  - "Deliverability is the broader ability to reach intended recipients reliably; it is not a single provider score."
  - "Placement describes where accepted mail appears, such as Inbox, Junk, Promotions, or quarantine."
assets:
  - type: table
    title: "Name the stage before you troubleshoot"
    content:
      headers: ["Stage", "Evidence", "Typical next question"]
      rows:
        - ["Delivery", "SMTP reply, bounce, message trace", "Was the message accepted?"]
        - ["Deliverability", "Trends across recipients and providers", "What repeatable conditions affect acceptance?"]
        - ["Placement", "Mailbox view, headers, provider tools", "Where did accepted mail go?"]
nextStep:
  label: "Read the SMTP response codes"
  href: "/repmail/learn/deliverability/smtp-4xx-5xx-email-errors"
  description: "Start with transport evidence when a message is deferred or rejected."
prerequisites:
  - label: "Know the basics of email deliverability"
    href: "/repmail/learn/deliverability/complete-guide-to-email-deliverability"
---

**Delivery, deliverability, and placement describe different parts of the email journey.** Delivery usually means a receiving server accepted a message for the recipient or returned a temporary/permanent SMTP response. Deliverability is the broader operational outcome of getting legitimate mail accepted across the intended audience over time. Placement is what happens after acceptance: Inbox, Junk, Promotions, quarantine, or another folder. Confusing them creates the wrong fix.

The existing [inbox placement versus deliverability guide](/repmail/learn/deliverability/inbox-placement-vs-deliverability) introduces this distinction. This page adds a three-stage diagnostic model that you can apply to a specific incident.

## Stage one: delivery is a transport event

During SMTP, servers exchange commands and replies. A receiving system can accept the message for later processing, defer it with a 4xx response, or reject it with a 5xx response. A successful handoff tells you that the receiving system accepted the message at that point in the path. It does not tell you which folder a mailbox will use later.

Evidence for this stage includes the final SMTP reply, a bounce or non-delivery report, and—when the recipient is in an organization—a message-trace result. If you see `421`, `450`, or another 4xx response, treat it as a temporary condition and follow the receiver's retry guidance. If you see `550` or another 5xx response, stop blind retries and read the diagnostic text before changing the sending path.

The [SMTP error guide](/repmail/learn/deliverability/smtp-4xx-5xx-email-errors) explains how to classify these responses. It is more useful than a dashboard label such as “failed,” because the enhanced status code and text identify whether the issue is rate, authentication, policy, address validity, or reputation.

## Stage two: deliverability is a pattern

Deliverability is not a single boolean returned by the Internet. It is the sender's ability to get mail accepted and processed reliably for a defined audience and set of providers. It includes authentication, list quality, sender and domain reputation, sending consistency, message behavior, recipient policies, and the receiver's own controls.

A campaign can show a high acceptance rate at one provider and failures at another. That is not proof that one provider is “wrong”; it is evidence that each receiver applies its own signals and policies. [Google Postmaster Tools](/repmail/learn/deliverability/google-postmaster-tools-guide) reports on selected Gmail traffic, while Microsoft has separate tenant and Outlook.com evidence paths.

Name the population before drawing a conclusion: personal Gmail, a Microsoft 365 tenant, Outlook.com, or a mixed B2B list. Then compare like with like—same sender identity, time window, recipient type, and campaign stream.

## Stage three: placement happens after acceptance

If the message was accepted but the recipient cannot find it in Inbox, you are investigating placement. Check Junk or Spam, Promotions or other tabs, quarantine, transport rules, mailbox rules, and provider-specific filtering. Ask whether the message arrived at all before assuming a folder change; a missing message can still be a delivery or trace problem.

Authentication headers can confirm what the receiver saw, but passing SPF, DKIM, and DMARC does not guarantee Inbox placement. Use [the header-reading workflow](/repmail/learn/deliverability/read-authentication-results) to verify identity, then use provider monitoring and recipient-side evidence to investigate placement. Avoid “inbox placement” claims based only on open-rate pixels; Google explicitly says it does not verify third-party open rates.

## A three-question incident worksheet

| Observation | Name the stage | Action |
|---|---|---|
| `421 4.7.0` response | Delivery/defer | Save the reply, apply controlled retry, inspect rate or policy context. |
| `550 5.7.26` authentication rejection | Delivery/reject | Fix SPF, DKIM, DMARC, or alignment before resuming. |
| Message trace says delivered; recipient sees Junk | Placement | Inspect headers, rules, quarantine, and reputation signals. |
| Gmail Postmaster spam rate rises over days | Deliverability trend | Pause the affected stream, review complaints and targeting, then recover deliberately. |

This model keeps a transport error from being “fixed” with copy edits and keeps a Junk-folder symptom from being misdiagnosed as an SMTP outage.

## Where RepMail fits

RepMail can be used to send controlled tests and preserve campaign context, but the platform should not be described as guaranteeing a stage or exposing a receiver's private folder decision without verified product evidence. A practical RepMail review records the sender identity, recipient provider, SMTP outcome, header result, and observed placement separately. For a broader baseline, start with the [complete deliverability guide](/repmail/learn/deliverability/complete-guide-to-email-deliverability).

## Sources

- [RFC 5321: Simple Mail Transfer Protocol](https://www.rfc-editor.org/rfc/rfc5321)
- [Google: Email sender guidelines](https://support.google.com/mail/answer/81126?hl=en)
- [Google: Postmaster Tools dashboards](https://support.google.com/mail/answer/14668346?hl=en)
- [Microsoft: Email authentication in cloud organizations](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about)
