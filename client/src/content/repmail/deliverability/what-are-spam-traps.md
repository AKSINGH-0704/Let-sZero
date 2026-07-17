---
contentType: glossary-term
slug: what-are-spam-traps
title: What Are Spam Traps, and How Do You Avoid Them?
description: "Spam traps are addresses that exist only to catch senders with poor list hygiene. Here are the types, how you hit them, and how to keep your list clean."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["spam-traps", "blacklist", "deliverability", "bounces"]
prerequisites:
  - label: "What sender reputation is"
    href: "/repmail/learn/deliverability/sender-reputation"
commonMistakes:
  - "Buying or scraping lists, the single most reliable way to load your list with pristine and recycled traps."
  - "Mailing addresses that have hard-bounced before; recycled traps are often former real addresses that went dead."
  - "Skipping verification on old lists, where dormant addresses have had time to become recycled traps."
faqs:
  - question: "What is the difference between a pristine and a recycled spam trap?"
    answer: "A pristine trap is an address created solely to catch senders; it was never a real person, so any mail to it means you acquired the address without permission. A recycled trap is a formerly real address that went dormant and was repurposed as a trap, so hitting one means your list is stale."
  - question: "How badly does hitting a spam trap hurt?"
    answer: "A lot, and quickly. Trap hits are strong evidence of poor list hygiene, and they are a common trigger for domain and IP blacklisting. A single pristine-trap hit signals a purchased or scraped list; repeated recycled-trap hits signal you are not cleaning old contacts."
  - question: "How do I avoid spam traps?"
    answer: "Never buy or scrape lists, verify addresses before sending, promptly remove anything that hard-bounces, and re-verify older lists before reusing them. Traps are invisible by design, so the only defense is hygiene, not detection."
nextStep:
  label: "How blacklists work and how to get off them"
  href: "/repmail/learn/deliverability/email-blacklists-and-removal"
  description: "Trap hits are a leading cause of blacklisting. Here is what happens next, and how to recover."
assets:
  - type: table
    title: The two kinds of spam trap
    content:
      headers: ["Type", "What it is", "What hitting it means"]
      rows:
        - ["Pristine", "An address created only to catch senders, never a real person", "You acquired the address without permission (bought or scraped)"]
        - ["Recycled", "A formerly real address, now dead and repurposed as a trap", "Your list is stale and you are not removing dead contacts"]
---

A spam trap is an email address that exists for one purpose: to catch senders who should not be mailing it. No real person reads it, so no legitimate, permission-based campaign should ever reach it. When mail arrives at a trap, the operator, often a blacklist provider or a mailbox provider, treats it as proof of poor list practices, and trap hits are one of the fastest routes to a blacklisting.

## Two types, two different messages

Spam traps come in two forms, and each tells the operator something specific about you.

A **pristine trap** was never a real address. It was created and quietly published where only a scraper or list-seller would find it. Because no human ever signed up with it, any message to a pristine trap proves you acquired the address without consent, that your list was purchased or scraped. This is the most damaging kind to hit, because it points at how you built the list.

A **recycled trap** used to be a real, active mailbox. When it was abandoned, the provider let it go dormant, and after a long silence, repurposed it as a trap. Hitting one does not mean you bought your list; it means you are still mailing addresses that went dead a long time ago. It is a hygiene problem rather than an acquisition problem, but it damages reputation all the same.

## Why you cannot detect them

Traps are effective precisely because they are invisible. They look like ordinary addresses, they are not marked, and there is no reliable list to scrub against. That means the only defense is process, not detection. You cannot find the traps in your list; you can only avoid the practices that put them there.

## Keeping them out

The rules are simple and non-negotiable. Never buy or scrape lists, which is how pristine traps enter. Verify addresses before you send. Remove anything that hard-bounces immediately, because a bounced address is a dead one on its way to becoming a recycled trap. And re-verify older lists before reusing them, since dormancy is exactly what turns a real address into a trap. Hygiene is the entire game.

## Where RepMail fits

RepMail's real-time suppression, driven by AWS SNS webhooks, removes hard-bouncing addresses the moment they fail, which keeps dead contacts, the raw material of recycled traps, out of your future sends automatically. Its credit-validation and pre-send checks discourage the blast-an-unverified-list habit that pristine traps punish. And because the platform is built for permission-based, per-recipient outreach rather than mass blasting a bought database, the behaviors that lead senders into traps are the behaviors it steers you away from by default.
