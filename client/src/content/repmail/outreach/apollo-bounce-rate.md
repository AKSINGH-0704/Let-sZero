---
contentType: guide
slug: apollo-bounce-rate
title: "Apollo Bounce Rate Too High? What's Actually Happening"
description: "Why 'verified' Apollo contacts still bounce: data decay, catch-all domains, and delayed suppression. How to cut bounce rate without changing data source."
authorSlug: repmail-team
publishedAt: "2026-07-19"
updatedAt: "2026-07-19"
tags: ["troubleshooting", "apollo", "deliverability", "lead-generation", "bounces"]
featured: false
keyTakeaways:
  - "Verification is a point-in-time check. B2B contact data decays at roughly 2 to 3% a month, so an export ages between download and send."
  - "Catch-all domains accept anything at the SMTP layer, so they verify as deliverable and can still bounce."
  - "Re-verify immediately before sending, not at export. The gap between those two moments is where most bounces come from."
  - "Suppression timing matters as much as list quality: delayed bounce sync means you keep mailing addresses already known to be dead."
prerequisites:
  - label: "Hard bounces vs. soft bounces"
    href: "/repmail/learn/deliverability/hard-vs-soft-bounces"
commonMistakes:
  - "Treating an export as a clean list. It was clean when it was verified, which was not today."
  - "Mailing catch-all domains at the same rate as confirmed addresses."
  - "Letting bounce data arrive on a delayed sync, so failing addresses get mailed repeatedly."
  - "Blaming the data vendor for a bounce rate that a pre-send re-verification would have caught."
faqs:
  - question: "Why do verified Apollo emails bounce?"
    answer: "Because verification describes the past. An address confirmed valid when it entered the database may belong to someone who has since changed roles, and B2B data decays at roughly 2 to 3% a month. A list exported eight weeks ago can be a fifth stale before you send it. This is true of every data vendor, not Apollo specifically."
  - question: "What is a catch-all domain and why does it matter?"
    answer: "A catch-all domain is configured to accept mail to any address at that domain, valid or not. Verification tools test deliverability by asking the receiving server whether an address exists, and a catch-all always says yes. So the address verifies clean and can still be discarded after acceptance, or bounce later. Segment catch-alls and treat them as lower confidence."
  - question: "What bounce rate should I be aiming for?"
    answer: "Under 2% is healthy for cold outreach and under 1% is better. Above 5% you are actively damaging your sending domain, and providers begin throttling. Complaint rate matters even more: above roughly 0.3% you are in the range where Google's postmaster signals turn against you."
  - question: "Does switching data provider fix this?"
    answer: "Usually not by much. Every provider's data decays at a similar rate because people change jobs at a similar rate. The fixes that work are process fixes: re-verify at send time, segment catch-alls, and suppress bounces the moment they happen rather than at the next sync."
nextStep:
  label: "Run the full pre-send checklist"
  href: "/repmail/learn/deliverability/pre-send-deliverability-checklist"
  description: "Everything worth verifying before a campaign goes out."
assets:
  - type: checklist
    title: Cut your bounce rate in one campaign cycle
    content: |
      - Re-verify the entire list immediately before sending, not at export.
      - Segment catch-all domains and mail them separately, at lower volume.
      - Remove role addresses (info@, sales@, support@) unless they are the actual target.
      - Drop anything you have not verified within the last 14 days.
      - Confirm bounce events suppress immediately, not on a nightly sync.
      - Split hard bounces from soft bounces and treat them differently.
      - Check current bounce rate before scaling volume, not after.
      - Prune contacts with no engagement across the last two campaigns.
  - type: table
    title: Bounce causes and what actually fixes them
    content:
      headers: ["Cause", "Why it happens", "Fix"]
      rows:
        - ["Data decay", "Person changed roles since verification", "Re-verify at send time"]
        - ["Catch-all acceptance", "Domain accepts anything, then discards", "Segment and send at lower volume"]
        - ["Role accounts", "Shared mailboxes, often unmonitored or filtered", "Exclude unless deliberately targeted"]
        - ["Stale export", "List verified weeks before use", "Cap list age at 14 days"]
        - ["Repeat sends to dead addresses", "Delayed bounce sync", "Real-time suppression"]
        - ["Aggressive volume on unverified data", "Compounds every other cause", "Fix the list before raising volume"]
---

A high bounce rate on Apollo data is usually not a data-quality problem in the way it feels like one. It is a timing problem, and it is fixable without changing vendor.

The distinction matters because the instinctive response, switching provider, rarely helps. Every B2B database decays at a similar rate, because the underlying cause is people changing jobs rather than anyone's collection method.

## Sourcing and sending are different jobs

Start with the structural point, because it explains most of what follows.

Apollo is a data platform. Its job is to tell you that a person exists, works somewhere, and can be reached at an address. It does that well. Sending is a different job: getting a message accepted and placed by a receiving server, which depends on your authentication, your reputation, and your list hygiene at the moment of sending.

When those two jobs live in one bundle, it is easy to assume the bundle guarantees both. It does not, and the seam between them is exactly where bounce rate lives.

## Why "verified" bounces

**Verification is a snapshot.** When an address is checked, the result is true at that instant. B2B contact data decays at roughly 2 to 3% a month as people are promoted, change companies, or leave. A list exported eight weeks ago can be a fifth stale before you send it, and nothing about the export tells you which fifth.

**Catch-all domains verify falsely clean.** A catch-all is configured to accept mail addressed to anything at that domain. Verification works by asking the receiving server whether an address exists, and a catch-all answers yes to every question. So the address passes verification, then the message is discarded after acceptance or bounces later. Lists heavy in catch-alls verify beautifully and perform badly, and this is one of the most common causes of a bounce rate that "should not" be happening.

**Role addresses behave unpredictably.** Shared mailboxes like info@ or sales@ are often unmonitored, aggressively filtered, or rotated. They inflate bounce and complaint rates without producing replies.

The fix for all three is the same and it is a process change rather than a purchase: **re-verify immediately before sending**. Not at export, not weekly, at send time. Then segment catch-alls into their own campaign at lower volume so their failure rate does not contaminate your main sending reputation.

## The suppression timing problem

The second cause is less about the list and more about what happens after the first bounce.

If bounce data reaches your sending tool through a delayed log sync, there is a window in which you continue mailing addresses already known to be dead. On a large campaign that window can be hours, and every additional attempt against a confirmed bad address is another reputation cost you did not need to pay.

This is where sending architecture matters. RepMail receives bounce and complaint events in real time through AWS SNS and suppresses on the event itself, so a hard bounce removes the address before the next message goes out rather than after the next sync. Whatever tool you use, find out its bounce latency, because it silently multiplies every other list problem you have.

It also matters that [hard and soft bounces](/repmail/learn/deliverability/hard-vs-soft-bounces) are handled differently. A hard bounce is permanent and should suppress immediately. A soft bounce is temporary, a full mailbox or a transient server issue, and suppressing it permanently throws away a reachable contact. Tools that collapse both into one category cost you either reputation or pipeline.

## What the numbers should look like

Aim below 2%, and treat below 1% as the target for a properly maintained list. Above 5% you are actively damaging your domain and providers will begin throttling you regardless of content quality.

Watch complaint rate at least as closely. Above roughly 0.3%, Google's postmaster signals turn hostile and recovery is slow and painful. Bounce rate damages you mechanically; complaint rate damages you reputationally, and the second is harder to undo.

If your rates are already high, stop scaling volume. Raising send volume on a list that is bouncing is the fastest way to convert a fixable list problem into a durable [sender reputation](/repmail/learn/deliverability/sender-reputation) problem, and at that point cleaning the list no longer solves it on its own.

## Building the stack so this stops recurring

The configuration that holds up over time separates the two jobs.

Keep Apollo, or whichever data source you trust, for sourcing. Send through infrastructure built for sending, with [authentication](/repmail/learn/deliverability/email-authentication) configured correctly at the domain level, real-time bounce suppression, and volume distributed across properly [warmed](/repmail/learn/deliverability/why-new-domains-need-warm-up) mailboxes rather than concentrated in a few.

That split also removes the incentive problem in bundled per-seat pricing, where sending capacity arrives attached to a seat and the cheap path is to push more volume through existing mailboxes. [How the two products compare](/repmail/learn/outreach/apollo-vs-repmail) covers that in more detail, and [Apollo pricing](/repmail/learn/outreach/apollo-pricing) covers the economics.

The short version: your bounce rate is mostly decided in the last hour before you send, not in the database you sourced from.
