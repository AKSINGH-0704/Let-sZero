---
contentType: glossary-term
slug: reputation
title: "Sender Reputation"
description: "Sender reputation is the trust score receivers assign your domain and IP. A definition, with the full guide linked."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["sender-reputation", "deliverability", "glossary"]
nextStep:
  label: "Full guide: building sender reputation"
  href: "/repmail/learn/deliverability/sender-reputation"
faqs:
  - question: "Is sender reputation tied to domain or IP?"
    answer: "Both, tracked separately. Domain reputation follows your sending domain; IP reputation is tied to the address your mail leaves from."
assets:
  - type: table
    title: "What builds it"
    content:
      headers: ["Input", "Signal"]
      rows:
        - ["Authentication", "SPF/DKIM/DMARC pass"]
        - ["List quality", "Low bounces and trap hits"]
        - ["Engagement", "Opens, replies, few complaints"]
---

**Sender reputation** is the running trust score receiving mail servers keep on your sending domain and IP. It is built from authentication, sending consistency, list quality, and recipient engagement.

It is earned slowly and lost quickly: one bad send to a stale list can undo weeks of warm-up.

See the full guide: [Full guide: building sender reputation](/repmail/learn/deliverability/sender-reputation).
