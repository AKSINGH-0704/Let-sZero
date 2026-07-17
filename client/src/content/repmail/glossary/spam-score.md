---
contentType: glossary-term
slug: spam-score
title: "Spam Score"
description: "A spam score is a filter's numeric estimate of how much your message looks like spam. A definition, with target numbers in the full guide."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["spam-score", "deliverability", "spamassassin", "glossary"]
nextStep:
  label: "Full guide: what is a good spam score"
  href: "/repmail/learn/deliverability/what-is-a-good-spam-score"
faqs:
  - question: "What is a good spam score?"
    answer: "On SpamAssassin's scale, stay well below the 5.0 threshold; under 3.0 is safe and under 1.0 is excellent."
assets:
  - type: table
    title: "Spam score targets"
    content:
      headers: ["System", "Aim for"]
      rows:
        - ["SpamAssassin", "Below 3.0 (spam at 5.0)"]
        - ["Microsoft SCL", "0 to 3 (junk at 5+)"]
---

A **spam score** is a filter's numeric estimate of how spam-like a message is. SpamAssassin flags anything at 5.0 or above; a good cold email scores below 3.0. Microsoft's SCL runs 0 to 9, where 5+ routes to junk.

Most points come from weak authentication and content structure, not from a single banned word.

See the full guide: [Full guide: what is a good spam score](/repmail/learn/deliverability/what-is-a-good-spam-score).
