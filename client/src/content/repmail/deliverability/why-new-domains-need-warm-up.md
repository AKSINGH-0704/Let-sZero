---
contentType: guide
slug: why-new-domains-need-warm-up
title: New Domain, Poor Delivery? Why You Need to Warm It Up First
description: A verified domain with zero sending history still needs to earn trust gradually — here's a practical ramp schedule.
authorSlug: repmail-team
publishedAt: "2026-07-12"
tags: ["warm-up", "sender-reputation", "deliverability"]
heroDiagram: warmup-ramp
keyTakeaways:
  - "Authentication proves your mail is legitimate; warm-up proves you're trustworthy."
  - "Start around 20–30 emails a day and raise volume gradually over a few weeks."
  - "High bounce or complaint rates during warm-up do outsized damage — slow down if you see them."
faqs:
  - question: "How long does warming up a domain take?"
    answer: "Most senders reach normal volume in about three to four weeks, but it depends on your target volume and how engaged your early recipients are. Let your bounce and complaint rates, not the calendar, set the pace."
  - question: "Can I skip warm-up if my authentication is perfect?"
    answer: "No. Authentication and reputation are separate judgments. A correctly authenticated domain with no sending history still has no reputation, and mailbox providers treat a sudden volume spike from an unknown sender with caution."
nextStep:
  label: "Hard vs. soft bounces, explained"
  href: "/repmail/learn/deliverability/hard-vs-soft-bounces"
  description: "Bounces are the clearest early signal something's off — learn which ones to act on."
assets:
  - type: table
    title: A 4-week warm-up schedule
    content:
      headers: ["Week", "Suggested daily volume", "What to send"]
      rows:
        - ["1", "20-30 emails/day", "Genuine, targeted emails to engaged contacts likely to reply"]
        - ["2", "50-80 emails/day", "Continue with warm, targeted sends; watch reply and bounce rates closely"]
        - ["3", "100-150 emails/day", "Scale toward your normal sending pattern if metrics stay healthy"]
        - ["4+", "Your normal volume", "Full campaign volume, provided bounce/complaint rates stayed low throughout"]
---

You've verified your domain — SPF, DKIM, and DMARC are all green — and your first campaign still underperforms. This is one of the most common, and most misunderstood, deliverability problems: a technically correct domain with zero sending history.

## Why authentication alone isn't enough

SPF, DKIM, and DMARC prove that your mail is legitimate — they don't prove you're a trustworthy sender. That second judgment is made by mailbox providers (Gmail, Outlook, and the rest) based on sending reputation, which is built over time by observing how recipients respond to your mail: do they open it, reply to it, mark it as spam, or ignore it entirely. A domain with no history has no reputation yet, good or bad — and mailbox providers respond to that uncertainty with caution, not the benefit of the doubt.

## What "warming up" actually means

Warming up a domain means starting with a small volume of genuinely good email — mail that real people are likely to open and reply to — and gradually increasing volume over a few weeks as the domain builds a track record of being wanted, not reported. Jumping straight to full campaign volume on day one, even with perfect authentication, looks to mailbox providers exactly like what a spammer's sudden burst of traffic would look like — there's no way for them to distinguish the two from sending pattern alone.

## A practical schedule

There's no single official number, but the practical guidance most senders converge on looks like the table above: start small (roughly 20-30 emails a day in the first week), favor contacts genuinely likely to engage, and step volume up gradually as your bounce and complaint rates confirm things are healthy. If you see rising bounce rates or spam complaints at any point, that's a signal to slow down, not push through.

## What breaks warm-up

The single fastest way to damage a new domain's reputation is sending to a low-quality or unverified list during this early period — high bounce rates in week one do more damage than the same bounce rate would later, precisely because there's no established good reputation yet to absorb it. This is also why warm-up and list quality are really the same conversation: a small, engaged list is what makes a gradual ramp possible in the first place.

Watching how recipients respond during warm-up means paying close attention to bounces — and not all bounces mean the same thing.
