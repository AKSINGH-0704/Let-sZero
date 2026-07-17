---
contentType: glossary-term
slug: dns-records
title: "DNS Records for Email"
description: "DNS records (MX, PTR, SPF, DKIM, DMARC) are where every deliverability check begins. A definition, with the full reference linked."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["dns", "infrastructure", "authentication", "glossary"]
nextStep:
  label: "Full guide: DNS records for email"
  href: "/repmail/learn/infrastructure/dns-records-for-email"
faqs:
  - question: "Which DNS records matter for sending?"
    answer: "SPF, DKIM, and DMARC authenticate your outbound mail, and PTR (reverse DNS) maps your sending IP to a hostname. MX matters for receiving replies."
assets:
  - type: table
    title: "Email DNS records"
    content:
      headers: ["Record", "Role"]
      rows:
        - ["MX", "Route inbound mail"]
        - ["PTR", "Map sending IP to hostname"]
        - ["SPF/DKIM/DMARC", "Authenticate outbound mail"]
---

**DNS records** are the entries in your domain's Domain Name System that mail servers query before trusting or delivering your email. MX routes inbound mail, PTR maps your sending IP to a hostname, and SPF, DKIM, and DMARC authenticate outbound mail.

Changes usually propagate within minutes but can take up to 24 to 48 hours.

See the full guide: [Full guide: DNS records for email](/repmail/learn/infrastructure/dns-records-for-email).
