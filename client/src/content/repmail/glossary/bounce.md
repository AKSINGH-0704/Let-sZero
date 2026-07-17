---
contentType: glossary-term
slug: bounce
title: "Email Bounce (Hard and Soft)"
description: "A bounce is a message a receiving server refused. A definition of hard vs soft bounces, with the full guide linked."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["bounces", "deliverability", "glossary"]
nextStep:
  label: "Full guide: hard vs soft bounces"
  href: "/repmail/learn/deliverability/hard-vs-soft-bounces"
faqs:
  - question: "What is the difference between a hard and soft bounce?"
    answer: "A hard bounce is a permanent failure to an invalid address; a soft bounce is a temporary failure. Hard bounces should be removed from your list at once."
assets:
  - type: table
    title: "Bounce types"
    content:
      headers: ["Type", "Meaning"]
      rows:
        - ["Hard", "Permanent; suppress the address"]
        - ["Soft", "Temporary; may retry"]
---

An **email bounce** is a message a receiving server refuses to accept. A **hard bounce** is permanent (invalid address) and the address should be suppressed immediately. A **soft bounce** is temporary (full mailbox, transient block) and may succeed on retry.

High bounce rates signal a dirty list and damage sender reputation fast.

See the full guide: [Full guide: hard vs soft bounces](/repmail/learn/deliverability/hard-vs-soft-bounces).
