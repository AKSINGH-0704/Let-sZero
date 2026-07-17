---
contentType: glossary-term
slug: what-is-spf
title: What Is an SPF Record, and How Do You Set It Up?
description: "SPF is a DNS record listing the servers allowed to send as your domain. Here is how it works, how to set it, and the mistakes that break it."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["spf", "authentication", "dns", "deliverability"]
prerequisites:
  - label: "Email authentication overview"
    href: "/repmail/learn/deliverability/email-authentication"
commonMistakes:
  - "Publishing more than one SPF record. A domain may have exactly one; two makes SPF fail entirely."
  - "Exceeding ten DNS lookups in your SPF record, which causes a permerror and a failed check."
  - "Ending the record with ~all or -all incorrectly, or forgetting the all mechanism, so nothing is actually enforced."
faqs:
  - question: "What does an SPF record look like?"
    answer: "A single TXT record on your domain, for example: v=spf1 include:amazonses.com ~all. The v=spf1 tag identifies it, each include or ip4/ip6 mechanism authorizes a sender, and the closing all mechanism sets what happens for everything else."
  - question: "What is the difference between ~all and -all?"
    answer: "~all is a soft fail, meaning mail from unlisted servers is accepted but marked suspicious. -all is a hard fail, meaning it should be rejected. Most senders start with ~all and move to -all once they are confident every legitimate source is listed."
  - question: "Why does SPF break when I add another sending tool?"
    answer: "Each tool adds an include, and every include costs DNS lookups. SPF allows a maximum of ten lookups; past that the record errors out and authentication fails. Consolidating senders or flattening the record fixes it."
nextStep:
  label: "Next: how DKIM signing works"
  href: "/repmail/learn/deliverability/what-is-dkim"
  description: "SPF says who may send. DKIM proves the message itself was not tampered with."
assets:
  - type: checklist
    title: SPF setup checklist
    content:
      - "Confirm your domain has exactly one TXT record beginning with v=spf1"
      - "Add an include for each service that sends on your behalf (for RepMail on SES, include:amazonses.com)"
      - "Keep total DNS lookups at or under ten to avoid a permerror"
      - "Start with ~all (soft fail), then move to -all once every legitimate sender is listed"
      - "Send a test message and confirm SPF shows pass in the received headers"
---

SPF, the Sender Policy Framework, answers one question a receiving server asks about every message: is the server that delivered this mail actually allowed to send for this domain? You answer it in advance by publishing a list, in your domain's DNS, of the servers permitted to send as you. When a message arrives, the receiver looks up that list and checks whether the sending server is on it.

## How it works

SPF lives in a single TXT record on your domain. A minimal one looks like this:

`v=spf1 include:amazonses.com ~all`

The `v=spf1` tag marks it as an SPF record. Each mechanism after it authorizes a source: `include:` pulls in another provider's authorized servers, while `ip4:` and `ip6:` list specific addresses. The final `all` mechanism is the catch-all, deciding what a receiver should do with mail from any server not listed. A tilde (`~all`) says treat it as suspicious; a dash (`-all`) says reject it.

When your mail leaves an authorized server, SPF passes and the receiver has one solid reason to trust you. When it leaves a server you never listed, SPF fails, and the receiver treats that as a strong signal of spoofing.

## The mistakes that quietly break it

SPF is simple to describe and easy to misconfigure. Three failures account for most broken records.

The first is having two SPF records. A domain may publish exactly one. The moment a second appears, receivers see an ambiguity and SPF fails altogether, which often happens when a new tool is added without noticing an old record already exists.

The second is the ten-lookup limit. Every `include` costs one or more DNS lookups, and SPF caps the total at ten. Teams that stack several sending tools quietly cross the limit, at which point the record returns a permanent error and stops authenticating anything.

The third is the `all` mechanism itself: leaving it off, or setting a hard `-all` before you are certain every legitimate sender is listed, which will start rejecting your own mail.

## Where RepMail fits

When you verify a domain in RepMail, it generates the exact SPF value your domain needs for AWS SES delivery and checks that the published record actually resolves and passes before you are allowed to send. That closes off the most common SPF failures, the missing record, the duplicate record, and the un-verified guess, at the point where they would otherwise cost you an entire campaign's deliverability.
