---
contentType: knowledge-base
slug: smtp-4xx-5xx-email-errors
title: "SMTP 4xx vs 5xx Email Errors: What to Do Next"
description: "Classify temporary 4xx and permanent 5xx SMTP errors, read enhanced status codes, and choose retry, suppression, or configuration work."
authorSlug: repmail-team
publishedAt: "2026-09-21"
tags: ["smtp", "email-errors", "bounces", "deliverability"]
keyTakeaways:
  - "4xx responses usually indicate a temporary deferral; 5xx responses usually require correction before another attempt."
  - "The enhanced status code and diagnostic text matter more than the first digit alone."
  - "Never retry a permanent invalid-recipient or authentication rejection as if it were a transient outage."
assets:
  - type: checklist
    title: "SMTP error response decision tree"
    content:
      - "4xx plus temporary wording: apply controlled retry and inspect rate, capacity, or policy context."
      - "5xx invalid recipient: suppress or correct the address."
      - "5xx authentication/policy: fix DNS, alignment, TLS, or sender policy before resuming."
      - "Unclear response: preserve the complete reply and ask the receiving provider or administrator."
nextStep:
  label: "Separate delivery from placement"
  href: "/repmail/learn/deliverability/delivery-vs-deliverability-vs-placement"
  description: "An SMTP response tells you about transport, not the mailbox folder."
prerequisites:
  - label: "Understand hard and soft bounces"
    href: "/repmail/learn/deliverability/hard-vs-soft-bounces"
---

**A 4xx SMTP response usually means “try later,” while a 5xx response usually means “fix something before trying again.”** That shorthand is useful but incomplete. Read the full three-digit code, enhanced status code, and diagnostic text together. A 4xx rate limit is not the same problem as a 4xx mailbox-over-quota response, and a 5xx authentication rejection is not the same as an invalid recipient.

This article adds an error-code workflow to [hard versus soft bounces](/repmail/learn/deliverability/hard-vs-soft-bounces). It does not claim that every receiver implements identical wording or retry behavior.

## What the first digit tells you

A **4xx** response is a transient negative completion. The receiving system is not accepting the message now, but a later attempt may succeed. The sender should use controlled retry behavior appropriate to the provider and preserve the response. Repeated 4xx responses can become a sender-reputation or list-quality signal; do not retry forever.

A **5xx** response is a permanent negative completion for that transaction. The message was not accepted under the current conditions. Correct the address, authentication, policy, or configuration before resending. If the response identifies a permanently invalid mailbox, suppress it rather than retrying.

SMTP and enhanced status code conventions are defined by standards, but receiver-specific text is operationally important. Google publishes a detailed [Gmail SMTP error reference](https://support.google.com/a/answer/3726730) with examples and links to relevant fixes.

## Read the complete response

Capture a line such as:

```text
550 5.7.26 This email has been blocked because the sender is unauthenticated
```

- `550` is the SMTP reply code.
- `5.7.26` is the enhanced status code, pointing toward a permanent policy or authentication issue.
- The text gives the receiver's explanation and often identifies the next diagnostic path.

Preserve any provider identifier, such as a Google `gsmtp` or `gcdp` suffix, message ID, sending IP, and timestamp. Those details are valuable when a support team needs to find its own log entry.

## Common 4xx actions

**Rate or capacity response.** A 421, 450, 451, or 452 may describe a busy server, recipient rate, relay limit, or temporary policy. Slow or schedule a controlled retry according to your sender implementation. If the same provider keeps deferring the stream, inspect volume, authentication, reputation, and recipient concentration rather than multiplying parallel retries.

**Mailbox or recipient storage.** A temporary over-quota response may be a recipient-side condition. Keep the message eligible for a limited, controlled retry if your policy allows, then stop and review repeated failures.

**Connection or TLS issue.** A timeout, connection expiry, or temporary authentication issue belongs to transport and infrastructure diagnostics. Check the sending path, TLS configuration, DNS, and provider status before changing message content.

## Common 5xx actions

**Invalid or unknown recipient.** Correct the address if you have reliable evidence; otherwise suppress it. Do not treat a hard bounce as a temporary invitation to retry.

**Unauthenticated sender.** Google documents `550 5.7.26` for messages that do not meet its sender authentication requirements. Check SPF or DKIM, then DMARC alignment if the rejection names policy or domain. Use [authentication-results headers](/repmail/learn/deliverability/read-authentication-results) from a delivered test to confirm what the receiver sees.

**SPF, PTR, TLS, or policy failure.** Follow the exact diagnostic. Google also documents failures involving suspicious SPF records, missing PTR, and missing TLS for high-volume contexts. Do not copy a DNS record from an unrelated domain; verify every sender and its envelope identity.

**Reputation or unsolicited-mail block.** Stop the affected stream, preserve the error, and investigate list source, complaints, bounces, volume, and authentication. See [spam-complaint spike response](/repmail/learn/deliverability/spam-complaint-spike-response) and [sender reputation recovery](/repmail/learn/deliverability/sender-reputation-recovery-plan).

## Retry policy in plain language

Retry a transient response only when the response indicates a condition that may clear and your sender can avoid tight loops. Cap retries, record each attempt, and convert repeated failures into an incident or suppression decision. Never use retries to override an unsubscribe, hard bounce, explicit policy rejection, or authentication failure.

When a message is accepted, stop treating the SMTP result as a placement result. Use [delivery versus deliverability versus placement](/repmail/learn/deliverability/delivery-vs-deliverability-vs-placement) to continue the investigation.

## Where RepMail fits

If RepMail exposes send outcomes, preserve the complete provider response rather than a simplified “failed” status. This article does not assume a specific retry engine or suppression behavior in RepMail; verify those features in current product evidence. A safe product-adjacent workflow is to pair the campaign record with the receiver's exact response and a documented next action.

## Sources

- [RFC 5321: Simple Mail Transfer Protocol](https://www.rfc-editor.org/rfc/rfc5321)
- [Google Workspace: Gmail SMTP errors and codes](https://support.google.com/a/answer/3726730)
- [Google: Email sender guidelines](https://support.google.com/mail/answer/81126?hl=en)
- [Microsoft: Email authentication in cloud organizations](https://learn.microsoft.com/en-us/defender-office365/email-authentication-about)
