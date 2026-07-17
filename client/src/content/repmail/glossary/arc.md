---
contentType: glossary-term
slug: arc
title: "ARC (Authenticated Received Chain)"
description: "ARC preserves SPF and DKIM results when email is forwarded, so the final receiver can still trust authentication that a hop would otherwise break."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["arc", "authentication", "glossary"]
nextStep:
  label: "Related: the authentication guide"
  href: "/repmail/learn/deliverability/email-authentication"
faqs:
  - question: "Do I need ARC?"
    answer: "ARC is not required for deliverability. It mainly helps when your mail is forwarded through mailing lists or gateways that would otherwise break SPF and DKIM."
assets:
  - type: table
    title: "ARC in brief"
    content:
      headers: ["Property", "Value"]
      rows:
        - ["Purpose", "Preserve auth across forwarding"]
        - ["Depends on", "SPF, DKIM, DMARC"]
        - ["Required?", "No, but helpful for forwarded mail"]
---

**ARC (Authenticated Received Chain)** is an email authentication standard that preserves the original SPF and DKIM results when a message is forwarded through a mailing list or security gateway.

Forwarding can break SPF and DKIM by changing the message or the sending server. ARC records the original authentication result so the final receiver can still trust it. It builds on SPF, DKIM, and DMARC rather than replacing them.

See the full guide: [Related: the authentication guide](/repmail/learn/deliverability/email-authentication).
