---
contentType: glossary-term
slug: spf
title: "SPF (Sender Policy Framework)"
description: "SPF is a DNS record that lists which mail servers are allowed to send email as your domain. A definition, with a link to the full guide."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["spf", "authentication", "dns", "glossary"]
nextStep:
  label: "Full guide: how to set up SPF"
  href: "/repmail/learn/deliverability/what-is-spf"
faqs:
  - question: "What does SPF do?"
    answer: "SPF tells receiving mail servers which servers are authorized to send as your domain, so they can reject or distrust mail from anywhere else claiming to be you."
assets:
  - type: table
    title: "SPF at a glance"
    content:
      headers: ["Property", "Value"]
      rows:
        - ["Record type", "DNS TXT"]
        - ["Purpose", "Authorize sending servers"]
        - ["Limit", "One record, ten DNS lookups"]
---

**SPF (Sender Policy Framework)** is a DNS TXT record that publishes the list of mail servers permitted to send email on your domain's behalf. When a message arrives, the receiving server checks whether it came from a listed server.

It is one of the three core email authentication standards, alongside DKIM and DMARC. A domain may have only one SPF record, and it is limited to ten DNS lookups.

See the full guide: [Full guide: how to set up SPF](/repmail/learn/deliverability/what-is-spf).
