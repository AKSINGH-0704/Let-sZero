---
contentType: glossary-term
slug: mx-record
title: "MX Record"
description: "An MX record tells other servers where to deliver mail for your domain. It governs where replies to your cold email land."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["mx", "dns", "infrastructure", "glossary"]
nextStep:
  label: "Related: DNS records for email"
  href: "/repmail/learn/infrastructure/dns-records-for-email"
faqs:
  - question: "Does an MX record affect deliverability?"
    answer: "Not outbound delivery directly, but without MX records your domain cannot receive replies, which defeats the purpose of cold outreach."
assets:
  - type: table
    title: "MX in brief"
    content:
      headers: ["Property", "Value"]
      rows:
        - ["Type", "DNS MX"]
        - ["Purpose", "Route inbound mail"]
        - ["Needed for", "Receiving replies"]
---

An **MX (Mail Exchange) record** is a DNS entry that tells other mail servers which servers receive email for your domain, in priority order.

MX records do not affect outbound sending directly, but a domain with no MX cannot receive the replies your cold email is trying to earn. Every sending domain that expects responses needs valid MX records.

See the full guide: [Related: DNS records for email](/repmail/learn/infrastructure/dns-records-for-email).
