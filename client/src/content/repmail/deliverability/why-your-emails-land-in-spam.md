---
contentType: guide
slug: why-your-emails-land-in-spam
title: Why Your Emails Land in Spam, and How to Fix It
description: "SPF, DKIM, and DMARC explained through the problem they actually solve: mail that never reaches the inbox."
authorSlug: repmail-team
publishedAt: "2026-07-12"
tags: ["spf", "dkim", "dmarc", "authentication"]
featured: true
heroDiagram: email-authentication
keyTakeaways:
  - "Spam placement is usually an authentication problem, not a content problem."
  - "SPF lists who can send as you, DKIM signs each message, and DMARC decides what happens when either one fails."
  - "A brand-new domain performs badly until all three records are published correctly."
commonMistakes:
  - "Publishing more than one SPF record on a domain. Only one is valid, and a second one breaks it."
  - "Enforcing a strict DMARC policy before SPF and DKIM actually pass, which can block your own mail."
faqs:
  - question: "Do I really need all three of SPF, DKIM, and DMARC?"
    answer: "Practically, yes. SPF and DKIM establish that your mail is legitimate. DMARC tells receivers what to do when a message fails those checks, and gives you reporting. Miss any one and a receiving server has a reason to distrust you."
  - question: "Where do these records actually go?"
    answer: "All three live in your domain's DNS. SPF and DMARC are TXT records on your domain and its _dmarc subdomain. DKIM is a public key your sending platform generates for you to publish."
nextStep:
  label: "Fix your subject line first"
  href: "/repmail/learn/cold-email/subject-lines-that-get-opened"
  description: "Good authentication gets you to the inbox. A weak subject line still loses the open."
assets:
  - type: table
    title: SPF, DKIM, and DMARC at a glance
    content:
      headers: ["Mechanism", "What it does", "Where it lives"]
      rows:
        - ["SPF", "Lists which mail servers are allowed to send on your domain's behalf", "A TXT record on your domain"]
        - ["DKIM", "Cryptographically signs each outgoing message so receivers can verify it wasn't altered in transit", "A public key published as a TXT record; the private key signs on your sending server"]
        - ["DMARC", "Tells receiving mail servers what to do if SPF or DKIM fails, and where to send reports", "A TXT record at _dmarc.yourdomain.com"]
---

If your cold emails are landing in spam, or not arriving at all, the cause is usually not your subject line or your copy. The receiving mail server cannot confirm that you are allowed to send as your domain. Confirming exactly that is the job of SPF, DKIM, and DMARC.

## The problem they solve

Anyone can type any "From" address into an email. Nothing stops it at the protocol level. Receiving servers know this, so they distrust any message that arrives without proof it is legitimate. Cold email starts at a disadvantage here, because a first-time message to a stranger already looks more suspicious than a reply inside an existing thread. Without proof, the receiving server has to guess, and a wrong guess sends your email to spam or drops it silently.

SPF, DKIM, and DMARC are that proof.

## How they work together

**SPF** is a public list, published in your domain's DNS, of the mail servers allowed to send as you. When a message arrives claiming to be from your domain, the receiving server checks whether it came from one of those servers.

**DKIM** goes a step further. It signs each message with a private key that only your sending server holds, and publishes the matching public key in DNS. The receiving server verifies the signature, which proves two things at once: the message really came from you, and nothing was changed in transit.

**DMARC** ties the two together. It tells receiving servers what to do when a message fails SPF or DKIM, whether to reject it, send it to spam, or let it through. It also reports who is sending mail in your name, including anyone trying to impersonate you.

## What it looks like when it works

With all three set up correctly, a receiving server can confirm your email came from your domain and was not tampered with, before it reads a single word of your content. That one fact does more for inbox placement than almost anything else you control.

## What it looks like when it breaks

A missing SPF record, a DKIM signature that will not validate, or no DMARC policy at all: any one of these hands the receiving server a reason to distrust you, no matter how good your writing is. This is also the most common reason a new sending domain struggles in its first few days, before sending volume or content ever enters the picture.

Once authentication is solid, the mechanics stop being the bottleneck, and what you write starts to matter.
