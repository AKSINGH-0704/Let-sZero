---
contentType: glossary-term
slug: what-is-smtp
title: What Is SMTP, and How Does It Send Your Email?
description: "SMTP is the protocol that transmits every email. Here is the handshake it runs, the reply codes it returns, and what they tell you when mail fails."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["smtp", "infrastructure", "deliverability", "bounces"]
prerequisites:
  - label: "What email infrastructure is"
    href: "/repmail/learn/infrastructure/email-infrastructure-explained"
commonMistakes:
  - "Reading every bounce the same way. A 4xx reply is temporary; a 5xx reply is permanent and the address should be suppressed."
  - "Ignoring the HELO/EHLO identity and reverse DNS, which receivers check at the very start of the handshake."
  - "Retrying a hard 5xx failure, which wastes reputation on an address that will never accept mail."
faqs:
  - question: "What does SMTP actually do?"
    answer: "SMTP, the Simple Mail Transfer Protocol, is the standard for moving email between servers. Your sending server opens a connection to the recipient's server, identifies itself, names the sender and recipient, transfers the message, and reads a numeric reply that says whether it was accepted."
  - question: "What do SMTP error codes mean?"
    answer: "Replies in the 2xx range mean success. 4xx means a temporary failure, such as greylisting or a full mailbox, and a retry may succeed. 5xx means a permanent failure, such as an invalid address, and the message should not be retried; the address belongs on your suppression list."
  - question: "What are HELO and EHLO?"
    answer: "They are the opening greeting of the SMTP conversation, where your server introduces itself. EHLO is the modern, extended version. Receivers check that this identity, along with reverse DNS on your IP, is consistent, and a mismatch is an early trust signal working against you."
nextStep:
  label: "Understand SMTP errors and bounces"
  href: "/repmail/learn/deliverability/hard-vs-soft-bounces"
  description: "SMTP reply codes are where bounces come from. Here is how to read hard versus soft."
assets:
  - type: table
    title: SMTP reply codes at a glance
    content:
      headers: ["Code range", "Meaning", "What to do"]
      rows:
        - ["2xx", "Accepted", "Message was taken by the receiving server"]
        - ["4xx", "Temporary failure", "Retry later; often greylisting or a transient block"]
        - ["5xx", "Permanent failure", "Do not retry; suppress the address"]
---

SMTP, the Simple Mail Transfer Protocol, is the language mail servers use to hand messages to each other. Every email you send is delivered by an SMTP conversation between your sending server and the recipient's, and the replies in that conversation are where bounces, blocks, and acceptances actually come from. Knowing how the exchange works turns a cryptic delivery log into a readable diagnosis.

## The handshake, step by step

An SMTP delivery is a short, ordered conversation. Your server opens a connection and introduces itself with a greeting, `EHLO` (the modern, extended form of the older `HELO`), announcing its identity. The receiving server checks that identity for consistency, including whether the reverse DNS on your IP matches, before it commits to anything. Your server then names the sender with `MAIL FROM`, names the recipient with `RCPT TO`, and transfers the message body with `DATA`. At each step the receiver replies with a numeric code, and it is those codes that decide the outcome.

## Reading the reply codes

SMTP replies fall into three ranges, and telling them apart is the single most useful thing to know. A **2xx** code means success: the receiving server accepted the message. A **4xx** code is a temporary failure, greylisting, a momentarily full mailbox, a transient block, and a later retry may well succeed. A **5xx** code is a permanent failure: the address is invalid, the domain does not exist, or the receiver has refused you outright. A 5xx should never be retried, and the address behind it belongs on your suppression list immediately.

Treating these the same is a common and costly mistake. Retrying a permanent 5xx failure spends reputation on an address that will never accept mail, and every retry to a dead mailbox is another negative mark against your domain.

## Why the opening identity matters

Receivers make trust decisions at the very start of the handshake, before your content is ever transferred. A `HELO`/`EHLO` identity that does not line up with your reverse DNS, or an IP with no PTR record at all, is an early signal that works against you regardless of how clean the message is. This is why infrastructure details you never see as a sender still shape whether your mail is accepted.

## Where RepMail fits

RepMail sends through AWS SES, which handles the SMTP layer, the handshake, the identity, the relay, at cloud scale rather than through a personal mailbox with its own limits and quirks. More importantly, RepMail reads the reply codes for you in real time: through AWS SNS webhooks, a permanent 5xx failure triggers immediate suppression of that address, so your system never keeps retrying a dead mailbox. The protocol details that decide delivery are handled at the infrastructure layer, and the failures it surfaces are acted on the moment they happen.
