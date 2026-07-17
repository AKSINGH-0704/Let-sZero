---
contentType: glossary-term
slug: what-is-dkim
title: What Is DKIM, and Why Does It Matter for Cold Email?
description: "DKIM cryptographically signs every message you send so receivers can prove it is really from you and was not altered. Here is how to set it up."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["dkim", "authentication", "dns", "deliverability"]
prerequisites:
  - label: "Email authentication overview"
    href: "/repmail/learn/deliverability/email-authentication"
  - label: "What SPF does"
    href: "/repmail/learn/deliverability/what-is-spf"
commonMistakes:
  - "Using a weak 1024-bit DKIM key when receivers increasingly expect 2048-bit signatures."
  - "Rotating or regenerating keys without updating the published DNS record, so signatures stop validating."
  - "Assuming DKIM alone is enough. Without DMARC, a passing DKIM signature is not tied to your visible From address."
faqs:
  - question: "How is DKIM different from SPF?"
    answer: "SPF checks where a message came from; DKIM checks that the message itself was not changed and genuinely originated from your domain. SPF authorizes the sending server; DKIM signs the content. Receivers want both, because each catches what the other misses."
  - question: "What key length should DKIM use?"
    answer: "2048-bit. Older 1024-bit keys still validate but are increasingly viewed as weak, and some receivers discount them. If your platform still issues 1024-bit keys, upgrading is a straightforward reputation win."
  - question: "Does DKIM survive email forwarding?"
    answer: "Usually yes, which is one of its advantages over SPF. Because DKIM signs the message rather than the connection, a forwarded message can still validate, as long as the forwarding server does not modify the signed content. ARC exists to cover the cases where it does."
nextStep:
  label: "Next: what DMARC decides"
  href: "/repmail/learn/deliverability/what-is-dmarc"
  description: "DKIM proves the message. DMARC ties that proof to the address your recipient actually sees."
assets:
  - type: table
    title: DKIM in three parts
    content:
      headers: ["Part", "Where it is", "What it does"]
      rows:
        - ["Private key", "On your sending server, never shared", "Signs each outgoing message"]
        - ["Public key", "Published in your DNS as a TXT/CNAME record", "Lets receivers verify the signature"]
        - ["Signature header", "Added to every message you send", "Carries the signature and the selector that names the key"]
---

DKIM, DomainKeys Identified Mail, gives every message you send a tamper-proof seal. Your sending server signs each outgoing email with a private cryptographic key that only it holds, and publishes the matching public key in your DNS. When the message arrives, the receiving server uses that public key to verify the signature. If it checks out, the receiver knows two things for certain: the message really came from your domain, and not a single character was altered between sending and delivery.

## Why the signature matters

SPF tells a receiver which servers are allowed to send for you, but it says nothing about the message itself. A message could pass SPF and still have been modified in transit, or sent by a server that happens to share an authorized network. DKIM closes that gap. Because the signature covers the actual content of the message, any tampering breaks it, and because the private key never leaves your infrastructure, no one else can produce a valid signature in your name.

That property also makes DKIM more durable than SPF across forwarding. SPF checks the connection, so a forwarded message often fails it. DKIM checks the content, so a forwarded message usually still validates, provided the forwarder does not rewrite the signed parts.

## Getting it right

Two details do most of the work. Use a **2048-bit key**, not the older 1024-bit length, which receivers increasingly treat as weak. And whenever you rotate a key, update the published DNS record in step, because a private key that no longer matches its public record produces signatures that fail every check, which looks worse to a receiver than no signature at all.

DKIM is powerful but incomplete on its own. A passing signature proves the message came from the signing domain, but nothing yet forces that signing domain to match the address your recipient sees in the From line. That final link is DMARC's job.

## Where RepMail fits

Because RepMail sends through AWS SES rather than wrapping a personal mailbox, DKIM signing happens at the infrastructure layer with a properly sized key, and the public key is part of the domain verification RepMail walks you through. There is no separate DKIM setup to forget and no fragile mailbox connection whose signing quietly lapses. When your domain shows verified, DKIM is signing correctly, and RepMail confirms it resolves before your first send.
