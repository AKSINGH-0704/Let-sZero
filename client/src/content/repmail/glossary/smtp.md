---
contentType: glossary-term
slug: smtp
title: "SMTP (Simple Mail Transfer Protocol)"
description: "SMTP is the protocol mail servers use to transfer email. A definition of the handshake and reply codes, with the full guide linked."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["smtp", "infrastructure", "glossary"]
nextStep:
  label: "Full guide: how SMTP works"
  href: "/repmail/learn/infrastructure/what-is-smtp"
faqs:
  - question: "What do SMTP error codes mean?"
    answer: "2xx means accepted, 4xx is a temporary failure you can retry, and 5xx is a permanent failure that should be suppressed, not retried."
assets:
  - type: table
    title: "SMTP reply codes"
    content:
      headers: ["Code", "Meaning"]
      rows:
        - ["2xx", "Accepted"]
        - ["4xx", "Temporary failure"]
        - ["5xx", "Permanent failure"]
---

**SMTP (Simple Mail Transfer Protocol)** is the standard language mail servers use to hand messages to each other. Your server connects, identifies itself, names the sender and recipient, transfers the message, and reads a numeric reply.

Reply codes tell the story: 2xx accepted, 4xx temporary failure (retry), 5xx permanent failure (suppress the address).

See the full guide: [Full guide: how SMTP works](/repmail/learn/infrastructure/what-is-smtp).
