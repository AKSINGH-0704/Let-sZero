---
contentType: glossary-term
slug: ptr-record
title: "PTR Record (Reverse DNS)"
description: "A PTR record maps a sending IP back to a hostname. Receivers check it early in the SMTP handshake, and a missing PTR is a trust penalty."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["ptr", "dns", "infrastructure", "glossary"]
nextStep:
  label: "Related: DNS records for email"
  href: "/repmail/learn/infrastructure/dns-records-for-email"
faqs:
  - question: "Why does a PTR record matter?"
    answer: "Receivers check reverse DNS at the start of the connection. A missing or mismatched PTR signals an untrustworthy sender before your message content is even evaluated."
assets:
  - type: table
    title: "PTR in brief"
    content:
      headers: ["Property", "Value"]
      rows:
        - ["Type", "Reverse DNS"]
        - ["Maps", "IP to hostname"]
        - ["Checked", "Start of SMTP handshake"]
---

A **PTR record**, or reverse DNS, maps a sending IP address back to a hostname, the reverse of a normal DNS lookup. Receiving servers check it at the very start of the SMTP handshake.

A missing or mismatched PTR is an early trust penalty applied before your content is ever read. On shared infrastructure it is set for you; on a dedicated setup it must be configured deliberately.

See the full guide: [Related: DNS records for email](/repmail/learn/infrastructure/dns-records-for-email).
