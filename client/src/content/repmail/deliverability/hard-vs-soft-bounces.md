---
contentType: guide
slug: hard-vs-soft-bounces
title: Why Did That Email Bounce? Hard vs. Soft Bounces Explained
description: Not every bounce means the same thing — the difference determines whether you remove a contact or just wait it out.
authorSlug: repmail-team
publishedAt: "2026-07-12"
tags: ["bounces", "deliverability", "list-hygiene"]
assets:
  - type: table
    title: Bounce type reference
    content:
      headers: ["Bounce type", "What it means", "What to do"]
      rows:
        - ["Hard bounce", "The address doesn't exist, or the domain is invalid — a permanent failure", "Remove it from your list immediately; never retry"]
        - ["Soft bounce", "A temporary issue — full inbox, server down, message too large", "RepMail retries automatically; if it keeps failing, treat it like a hard bounce"]
        - ["Block / reputation bounce", "The receiving server rejected the message based on sender reputation, not the address itself", "This is a warm-up/deliverability signal, not a list-hygiene one"]
---

A bounce notification looks the same at a glance — the email didn't get delivered — but what caused it changes what you should actually do about it. Treating every bounce the same way is one of the more common, avoidable mistakes in list management.

## Hard bounces: permanent, act immediately

A hard bounce means the receiving server has told you, definitively, that the address doesn't exist or the domain is invalid. There's no retry that fixes this — the address is simply wrong, whether from a typo, a role that left the company, or a domain that no longer exists. Every hard bounce should be removed from your list right away. Continuing to send to hard-bounced addresses doesn't just waste sends; a consistently high hard-bounce rate is itself a signal to mailbox providers that your list quality is poor, which damages your sender reputation independent of anything else you're doing correctly.

## Soft bounces: temporary, often self-resolving

A soft bounce means the address is probably valid, but delivery failed for a temporary reason — the recipient's inbox is full, their mail server is temporarily down, or the message was too large. RepMail retries soft bounces automatically for a period before giving up. If an address keeps soft-bouncing across multiple retries and multiple campaigns, it's reasonable to start treating it the way you'd treat a hard bounce — a mailbox that's been full for weeks is unlikely to become active again.

## The bounce that isn't really about the address at all

There's a third case worth knowing about, even though it isn't always cleanly labeled: a rejection based on your sending reputation rather than anything wrong with the recipient's address. This looks like a bounce, but the fix isn't removing the contact — it's addressing whatever's causing the reputation issue in the first place, which is usually a warm-up or authentication problem, not a list problem.

## Why this distinction matters for your list

Confusing these categories leads to two different mistakes: removing perfectly good addresses because of a temporary soft bounce, or — worse — continuing to send to genuinely invalid addresses because a bounce "seemed minor." Getting this right keeps your list clean without being overly aggressive about pruning contacts who are simply having a temporary delivery issue.

## Next step

Once your list hygiene is solid, the highest-leverage next move is putting deliverability best practices into what you actually send: [cold email templates built with deliverability in mind](/repmail/learn/cold-email/cold-email-templates).
