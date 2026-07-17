---
contentType: glossary-term
slug: dkim
title: "DKIM (DomainKeys Identified Mail)"
description: "DKIM cryptographically signs each email so receivers can verify it is really from your domain and was not altered. A definition, with the full guide linked."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["dkim", "authentication", "dns", "glossary"]
nextStep:
  label: "Full guide: how DKIM works"
  href: "/repmail/learn/deliverability/what-is-dkim"
faqs:
  - question: "How is DKIM different from SPF?"
    answer: "SPF authorizes the sending server; DKIM signs the message content itself, proving it was not altered. Receivers want both."
assets:
  - type: table
    title: "DKIM at a glance"
    content:
      headers: ["Property", "Value"]
      rows:
        - ["Record type", "DNS TXT/CNAME (public key)"]
        - ["Purpose", "Sign and verify messages"]
        - ["Recommended key", "2048-bit"]
---

**DKIM (DomainKeys Identified Mail)** attaches a cryptographic signature to every message you send. Your server signs with a private key; receivers verify with a public key published in your DNS.

A valid DKIM signature proves two things: the message came from your domain, and nothing in it changed in transit. Use a 2048-bit key.

See the full guide: [Full guide: how DKIM works](/repmail/learn/deliverability/what-is-dkim).
