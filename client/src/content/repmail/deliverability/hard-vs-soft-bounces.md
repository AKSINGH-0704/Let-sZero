---
contentType: guide
slug: hard-vs-soft-bounces
title: Why Did That Email Bounce? Hard vs. Soft Bounces Explained
description: Not every bounce means the same thing. The difference decides whether you remove a contact or simply wait it out.
authorSlug: repmail-team
publishedAt: "2026-07-12"
tags: ["bounces", "deliverability", "list-hygiene"]
keyTakeaways:
  - "A hard bounce is permanent. Remove the address immediately and never retry it."
  - "A soft bounce is temporary, and RepMail retries it automatically before giving up."
  - "A reputation-based rejection looks like a bounce but is fixed by warm-up and authentication, not by pruning the list."
nextStep:
  label: "Cold email templates that protect deliverability"
  href: "/repmail/learn/cold-email/cold-email-templates"
  description: "Put these deliverability habits into what you actually send."
assets:
  - type: table
    title: Bounce type reference
    content:
      headers: ["Bounce type", "What it means", "What to do"]
      rows:
        - ["Hard bounce", "The address does not exist, or the domain is invalid. A permanent failure.", "Remove it from your list immediately, and never retry"]
        - ["Soft bounce", "A temporary issue: full inbox, server down, message too large", "RepMail retries automatically; if it keeps failing, treat it like a hard bounce"]
        - ["Block / reputation bounce", "The receiving server rejected the message based on sender reputation, not the address itself", "A warm-up and deliverability signal, not a list-hygiene one"]
---

A bounce notification looks the same at a glance. The email did not get delivered. What caused it, though, changes what you should do next, and treating every bounce the same way is a common, avoidable mistake in list management.

## Hard bounces: permanent, act immediately

A hard bounce is the receiving server telling you plainly that the address does not exist or the domain is invalid. No retry fixes this. The address is simply wrong, whether from a typo, someone who left the company, or a domain that no longer exists. Remove every hard bounce from your list right away. Sending to hard-bounced addresses does more than waste sends. A consistently high hard-bounce rate signals to mailbox providers that your list quality is poor, and that damages your reputation on its own, no matter what else you get right.

## Soft bounces: temporary, often self-resolving

A soft bounce means the address is probably valid, but delivery failed for a temporary reason, such as a full inbox, a server that is briefly down, or a message that was too large. RepMail retries soft bounces automatically for a while before giving up. If an address keeps soft-bouncing across several retries and several campaigns, start treating it like a hard bounce. A mailbox that has been full for weeks is unlikely to come back.

## The bounce that is not really about the address

There is a third case worth knowing, even though it is not always labeled cleanly: a rejection based on your sending reputation rather than anything wrong with the recipient's address. It looks like a bounce, but removing the contact does not fix it. The fix is whatever is hurting your reputation, usually a warm-up or authentication problem, not a list problem.

## Why the distinction matters

Confusing these categories leads to two opposite mistakes: removing good addresses over a temporary soft bounce, or, worse, continuing to send to genuinely invalid addresses because a bounce "seemed minor." Getting it right keeps your list clean without over-pruning contacts who are only having a brief delivery hiccup.

With a clean list and healthy sending, the highest-leverage next move is putting these habits into what you actually send.
