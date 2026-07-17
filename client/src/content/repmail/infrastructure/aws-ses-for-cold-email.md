---
contentType: knowledge-base
slug: aws-ses-for-cold-email
title: "AWS SES for Cold Email: Why the Delivery Layer Matters"
description: "Amazon SES is a cloud SMTP relay that sends at scale without per-mailbox limits. Here is what it gives cold email, and what it still leaves to you."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["ses", "infrastructure", "smtp", "deliverability"]
prerequisites:
  - label: "What email infrastructure is"
    href: "/repmail/learn/infrastructure/email-infrastructure-explained"
  - label: "How SMTP works"
    href: "/repmail/learn/infrastructure/what-is-smtp"
commonMistakes:
  - "Assuming SES guarantees the inbox. It provides clean, scalable delivery; reputation, list quality, and content are still yours to manage."
  - "Sending on SES without configuring SPF, DKIM, and DMARC, which forfeits the reputation advantage it offers."
  - "Ignoring SES bounce and complaint notifications, which are the real-time signals that protect your reputation."
faqs:
  - question: "What is AWS SES?"
    answer: "Amazon Simple Email Service is a cloud-based SMTP relay for sending email at scale. Instead of pushing mail through a personal Gmail or Outlook mailbox, you send through Amazon's infrastructure, which removes per-mailbox limits and gives you a clean, well-maintained sending platform."
  - question: "Why is SES good for cold email deliverability?"
    answer: "It removes the fragility of the app-wrapper model: no OAuth token to expire, no mailbox sending cap to engineer around, and a delivery profile that is not pooled with unknown senders. It also emits real-time bounce and complaint notifications through AWS SNS, so failures can be suppressed immediately."
  - question: "Does sending on SES guarantee inbox placement?"
    answer: "No. SES gives you a strong, scalable delivery layer, but placement still depends on your authentication, your sending pattern, your list quality, and your content. SES makes good sending possible; it does not make bad sending land."
nextStep:
  label: "Set the DNS records SES needs"
  href: "/repmail/learn/infrastructure/dns-records-for-email"
  description: "SES delivery only earns trust when your DNS layer is configured correctly. Here is what to publish."
assets:
  - type: table
    title: App-wrapper sending vs. SES sending
    content:
      headers: ["Dimension", "App-wrapper (mailbox)", "AWS SES (cloud relay)"]
      rows:
        - ["Connection", "OAuth token that can expire", "Direct API/SMTP, no token to lapse"]
        - ["Volume", "Capped per mailbox", "Scales without per-mailbox limits"]
        - ["IP reputation", "Often shared with tool's users", "Isolated from unknown senders"]
        - ["Telemetry", "Delayed log parsing", "Real-time bounce/complaint via SNS"]
---

Amazon Simple Email Service, SES, is a cloud SMTP relay: infrastructure you send through instead of pushing mail out of a personal mailbox. For cold email, the choice of delivery layer matters more than most senders realize, because it sets the ceiling on how well everything above it can perform. SES is the layer many serious senders build on, and understanding what it does, and what it does not do, clarifies why.

## What SES changes

The app-wrapper model, sending through a connected Gmail or Outlook account, carries three structural liabilities: an OAuth token that can silently lapse and stall a campaign, a per-mailbox sending cap that forces you to bolt on more accounts to grow, and IP reputation shared with every other user of the same tool. SES removes all three. You connect to Amazon's relay directly, so there is no token to expire. It scales without a per-mailbox ceiling. And your delivery profile is not pooled with strangers whose bad sending could blacklist your shared address.

Just as important, SES emits real-time notifications. The moment a receiving server logs a bounce or a complaint, SES can push that event out through AWS SNS, which means a failing address can be suppressed instantly rather than after a delayed batch of log parsing. That real-time loop is one of the strongest protections a sender can have against reputation damage from a bad list.

## What SES does not do

SES is a delivery layer, not a deliverability guarantee. It will faithfully and quickly send whatever you give it, to whomever you address, which means a dirty list or a spammy template will simply reach more inboxes faster and damage your reputation more efficiently. Authentication is still your job: SES only earns its reputation advantage when SPF, DKIM, and DMARC are configured correctly. List quality, sending pace, and content remain entirely yours. SES makes good sending scale; it does nothing to rescue bad sending.

## Where RepMail fits

RepMail is built directly on AWS SES, and it supplies the layer SES deliberately leaves out. Domain verification configures SPF, DKIM, and the return path so SES's clean delivery is backed by real authentication. Spam Analysis and AI Personalization handle the content and list-shape signals SES will not judge for you. And RepMail wires SES's real-time SNS notifications into automatic suppression and circuit breakers, so the bounce-and-complaint telemetry SES exposes actually protects your domain instead of scrolling past unread. You get the SES delivery ceiling with the deliverability discipline that lets you reach it.
