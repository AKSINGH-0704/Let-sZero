---
contentType: knowledge-base
slug: email-infrastructure-explained
title: "The Complete Guide to Email Infrastructure"
description: "The machinery behind sending: domains, DNS, SMTP relays, IPs, and reputation. Here is how the pieces fit, and why the app-wrapper model struggles."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["infrastructure", "smtp", "ses", "deliverability", "sender-reputation"]
featured: true
heroDiagram: workflow-split
keyTakeaways:
  - "Email infrastructure is the full sending stack: sending domain, DNS records, SMTP relay, IP address, and the reputation attached to each."
  - "The app-wrapper model sends through a personal Gmail or Outlook mailbox, which brings token fragility and shared-reputation risk at scale."
  - "Cloud-native sending on AWS SES separates your infrastructure from unknown neighbors and scales without per-mailbox limits."
prerequisites:
  - label: "What sender reputation is"
    href: "/repmail/learn/deliverability/sender-reputation"
commonMistakes:
  - "Treating a cold-email app as if it were infrastructure. A wrapper around a mailbox inherits that mailbox's limits and reputation."
  - "Sending from a shared IP pool without knowing who else is on it, and inheriting their blacklist history."
  - "Scaling volume by adding more connected mailboxes rather than fixing the delivery layer underneath."
faqs:
  - question: "What counts as email infrastructure?"
    answer: "The sending domain and its DNS records (SPF, DKIM, DMARC, MX, PTR), the SMTP relay that transmits your mail, the IP address it leaves from, and the reputation each of those carries. Together they determine whether mail is accepted and where it lands."
  - question: "What is the app-wrapper model, and why does it matter?"
    answer: "Many cold-email tools send by connecting to your Google Workspace or Microsoft 365 mailbox and pushing mail through it. That inherits the mailbox's sending limits, depends on an OAuth token that can lapse, and often shares IP reputation with other users of the same tool. It works at low volume and strains as you scale."
  - question: "How is cloud-native sending different?"
    answer: "Cloud-native sending routes mail through a dedicated cloud relay such as AWS SES rather than a personal mailbox. There is no OAuth token to expire, no per-mailbox cap to fight, and your delivery profile is not pooled with strangers, so reputation is something you build rather than inherit."
nextStep:
  label: "How SMTP actually sends your mail"
  href: "/repmail/learn/infrastructure/what-is-smtp"
  description: "SMTP is the protocol underneath every send. Here is what happens on the wire."
assets:
  - type: table
    title: The layers of a sending stack
    content:
      headers: ["Layer", "What it is", "What it controls"]
      rows:
        - ["Sending domain", "The domain in your From address", "Domain reputation and authentication"]
        - ["DNS records", "SPF, DKIM, DMARC, MX, PTR", "Whether receivers can verify you"]
        - ["SMTP relay", "The server that transmits your mail", "Throughput, reliability, error handling"]
        - ["IP address", "The address mail leaves from", "IP reputation, shared or dedicated"]
---

Email infrastructure is the machinery that turns a written message into mail a stranger's server will accept. Most senders never think about it until deliverability breaks, at which point they discover that the tool they were using was not really infrastructure at all. Understanding the stack is what lets you tell a content problem from an infrastructure one.

## The layers of the stack

Four layers sit under every send. The **sending domain** is the domain in your From address, and it carries a reputation of its own. Its **DNS records**, SPF, DKIM, DMARC, plus MX and PTR, are how receiving servers verify you are who you claim to be. The **SMTP relay** is the server that actually transmits the message and handles the responses that come back. And the **IP address** the mail leaves from carries its own reputation, separate from the domain's, which may be yours alone or shared with every other sender on the same pool.

When any one layer is weak, delivery suffers in a way no amount of better copy can fix. A strong subject line cannot rescue mail leaving a blacklisted IP, and perfect personalization cannot help a domain with no DKIM.

## The app-wrapper model and where it strains

Most cold-email tools are built as wrappers around a personal mailbox. You connect your Google Workspace or Microsoft 365 account, and the tool pushes mail through it. At low volume this is fine. At scale it introduces three recurring problems. The connection depends on an OAuth token that can silently expire, quietly halting a campaign. The mailbox enforces its own daily sending limits, so growth means bolting on more and more connected accounts. And the tool's users often share IP reputation, which means a stranger's bad sending can degrade your placement through no fault of your own.

## The cloud-native alternative

The alternative is to send through dedicated cloud infrastructure rather than a borrowed mailbox. Routing mail through a relay like AWS SES removes the OAuth fragility, lifts the per-mailbox ceiling, and, critically, separates your delivery profile from unknown neighbors. Reputation becomes something you build deliberately rather than inherit by accident. This is the architectural difference that decides whether a sending setup holds up as volume grows.

## Where RepMail fits

RepMail is built on the cloud-native model. It sends through AWS SES rather than wrapping your personal mailbox, so there is no token to expire and no per-inbox cap to engineer around. Domain verification sets up the DNS layer, SPF, DKIM, and the return path, correctly before your first send, and delivery telemetry flows back in real time through AWS SNS. The infrastructure is the product, not an afterthought bolted onto a mailbox, which is why the delivery layer holds steady as you scale.
