---
contentType: guide
slug: why-your-emails-land-in-spam
title: Why Your Emails Land in Spam, and How to Fix It
description: SPF, DKIM, and DMARC explained through the actual problem they solve — mail that never reaches the inbox.
authorSlug: repmail-team
publishedAt: "2026-07-12"
tags: ["spf", "dkim", "dmarc", "authentication"]
featured: true
heroDiagram: email-authentication
keyTakeaways:
  - "Spam placement is usually an authentication problem, not a content problem."
  - "SPF lists who can send as you, DKIM signs each message, and DMARC says what to do when either fails."
  - "A brand-new domain performs badly until all three records are correctly published."
commonMistakes:
  - "Publishing more than one SPF record on the same domain — only one is valid."
  - "Enforcing a strict DMARC policy before SPF and DKIM actually pass, which can block your own mail."
faqs:
  - question: "Do I really need all three of SPF, DKIM, and DMARC?"
    answer: "Practically, yes. SPF and DKIM establish that your mail is legitimate; DMARC tells receivers what to do when a message fails those checks, and gives you reporting. Missing any one gives a receiving server a reason to distrust your mail."
  - question: "Where do these records actually go?"
    answer: "All three live in your domain's DNS. SPF and DMARC are TXT records on your domain and its _dmarc subdomain; DKIM is a public key your sending platform generates for you to publish."
nextStep:
  label: "Fix your subject line first"
  href: "/repmail/learn/cold-email/subject-lines-that-get-opened"
  description: "Good authentication gets you to the inbox — a weak subject line still loses the open."
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

If your cold emails are landing in spam, or not arriving at all, the most common cause isn't your subject line or your copy — it's that the receiving mail server can't confirm you're actually allowed to send as your domain. That confirmation is exactly what SPF, DKIM, and DMARC exist to provide.

## The problem they solve

Anyone can technically type any "From" address into an email. Nothing stops it at the protocol level. Receiving mail servers know this, which is exactly why they distrust a message that doesn't come with proof it's legitimate — and by default, cold email traffic already looks more suspicious than a reply in an existing thread. Without that proof, a receiving server has to guess, and when it guesses wrong, your email lands in spam or gets silently dropped.

SPF, DKIM, and DMARC are that proof.

## How they actually work together

**SPF** is a public list, published in your domain's DNS, of exactly which mail servers are authorized to send email as you. When a message arrives claiming to be from your domain, the receiving server checks whether it actually came from one of those authorized servers.

**DKIM** goes further — it cryptographically signs each message with a private key only your sending server holds, and the matching public key is published in DNS. The receiving server verifies the signature, which proves two things: the message really came from you, and nothing was altered on the way there.

**DMARC** ties the two together. It tells receiving servers what to do if a message fails SPF or DKIM — reject it, quarantine it (usually spam), or do nothing — and gives you a way to receive reports on who's sending mail claiming to be from your domain, including anyone trying to spoof it.

## What this looks like when it's working

When all three are set up correctly, a receiving mail server can confirm, before it even looks at your message content, that your email genuinely came from your domain and wasn't tampered with. That single fact does more for your inbox placement than almost anything else you can control.

## What this looks like when it's broken

A missing or misconfigured SPF record, a DKIM signature that doesn't validate, or no DMARC policy at all — any one of these gives a receiving server a real reason to distrust your mail, independent of how good your writing is. This is also the single most common reason a brand-new sending domain performs badly in its first few days, before anything else about sending volume or content even comes into play.

Once your authentication is solid, the mechanics stop being the bottleneck — and what you actually write starts to matter.
