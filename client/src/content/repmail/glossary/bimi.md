---
contentType: glossary-term
slug: bimi
title: "BIMI (Brand Indicators for Message Identification)"
description: "BIMI displays your verified brand logo next to authenticated email. It requires an enforced DMARC policy first."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["bimi", "authentication", "glossary"]
nextStep:
  label: "Related: the authentication guide"
  href: "/repmail/learn/deliverability/email-authentication"
faqs:
  - question: "Does BIMI improve deliverability?"
    answer: "Not directly. BIMI displays your logo on already-authenticated mail; it requires an enforced DMARC policy and does not replace SPF or DKIM."
assets:
  - type: table
    title: "BIMI requirements"
    content:
      headers: ["Requirement", "Detail"]
      rows:
        - ["DMARC", "Must be enforced (quarantine/reject)"]
        - ["Record", "DNS TXT at default._bimi"]
        - ["Logo", "SVG, sometimes a VMC certificate"]
---

**BIMI (Brand Indicators for Message Identification)** is a standard that lets your brand logo appear next to your messages in supporting inboxes. It is published as a DNS TXT record pointing at your logo.

BIMI is a reward layer, not a deliverability tool: it only works once SPF, DKIM, and an enforced DMARC policy (quarantine or reject) are already in place, and some inboxes also require a verified mark certificate.

See the full guide: [Related: the authentication guide](/repmail/learn/deliverability/email-authentication).
