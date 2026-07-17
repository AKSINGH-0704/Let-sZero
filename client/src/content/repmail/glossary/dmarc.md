---
contentType: glossary-term
slug: dmarc
title: "DMARC"
description: "DMARC tells receivers what to do when SPF or DKIM fails and reports who sends mail in your name. A definition, with the in-depth guide linked."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["dmarc", "authentication", "dns", "glossary"]
nextStep:
  label: "Full guide: DMARC policies"
  href: "/repmail/learn/deliverability/what-is-dmarc"
faqs:
  - question: "What is DMARC alignment?"
    answer: "Alignment requires the domain that passed SPF or DKIM to match the domain in your From address, which is what stops impersonators from forging your name."
assets:
  - type: table
    title: "DMARC policies"
    content:
      headers: ["Policy", "Effect"]
      rows:
        - ["p=none", "Monitor and report only"]
        - ["p=quarantine", "Send failures to spam"]
        - ["p=reject", "Reject failures outright"]
---

**DMARC (Domain-based Message Authentication, Reporting and Conformance)** is the policy layer over SPF and DKIM. It requires the authenticated domain to align with your visible From address, and tells receivers whether to accept, quarantine, or reject mail that fails.

Its three policies are p=none (monitor), p=quarantine, and p=reject. Roll them out in that order.

See the full guide: [Full guide: DMARC policies](/repmail/learn/deliverability/what-is-dmarc).
