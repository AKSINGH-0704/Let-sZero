---
contentType: guide
slug: why-new-domains-need-warm-up
title: New Domain, Poor Delivery? Why You Need to Warm It Up First
description: A verified domain with no sending history still has to earn trust gradually. Here is a practical ramp schedule.
authorSlug: repmail-team
publishedAt: "2026-07-12"
tags: ["warm-up", "sender-reputation", "deliverability"]
heroDiagram: warmup-ramp
keyTakeaways:
  - "Authentication proves your mail is legitimate. Warm-up proves you are trustworthy."
  - "Start around 20 to 30 emails a day and raise volume gradually over a few weeks."
  - "High bounce or complaint rates during warm-up do outsized damage, so slow down if you see them."
faqs:
  - question: "How long does warming up a domain take?"
    answer: "Most senders reach normal volume in about three to four weeks, but it depends on your target volume and how engaged your early recipients are. Let your bounce and complaint rates set the pace, not the calendar."
  - question: "Can I skip warm-up if my authentication is perfect?"
    answer: "No. Authentication and reputation are separate judgments. A correctly authenticated domain with no sending history still has no reputation, and mailbox providers treat a sudden spike from an unknown sender with caution."
nextStep:
  label: "Hard vs. soft bounces, explained"
  href: "/repmail/learn/deliverability/hard-vs-soft-bounces"
  description: "Bounces are the clearest early signal that something is off. Learn which ones to act on."
assets:
  - type: table
    title: A 4-week warm-up schedule
    content:
      headers: ["Week", "Suggested daily volume", "What to send"]
      rows:
        - ["1", "20-30 emails/day", "Genuine, targeted emails to engaged contacts likely to reply"]
        - ["2", "50-80 emails/day", "Continue with warm, targeted sends; watch reply and bounce rates closely"]
        - ["3", "100-150 emails/day", "Scale toward your normal sending pattern if metrics stay healthy"]
        - ["4+", "Your normal volume", "Full campaign volume, provided bounce and complaint rates stayed low throughout"]
---

You verified your domain, SPF, DKIM, and DMARC are all green, and your first campaign still underperforms. This is one of the most common and most misunderstood deliverability problems: a technically correct domain with no sending history.

## Why authentication alone is not enough

SPF, DKIM, and DMARC prove your mail is legitimate. They do not prove you are a trustworthy sender. That second judgment belongs to the mailbox providers, and they base it on sending reputation, which builds over time as they watch how people respond to you. Do recipients open your mail, reply to it, ignore it, or mark it as spam? A domain with no history has no reputation yet, good or bad, and providers meet that uncertainty with caution rather than the benefit of the doubt.

## What warming up actually means

Warming up a domain means starting with a small volume of genuinely good email, the kind real people open and reply to, then raising the volume over a few weeks as the domain builds a record of being wanted rather than reported. Going straight to full volume on day one, even with perfect authentication, looks to a mailbox provider exactly like a spammer's sudden burst of traffic. Sending pattern alone gives them no way to tell the two apart.

## A practical schedule

There is no single official number, but most senders converge on the shape in the table above. Start small, around 20 to 30 emails a day in the first week, favor contacts genuinely likely to engage, and step the volume up as your bounce and complaint rates confirm things are healthy. If either rate climbs, treat it as a signal to slow down rather than push through.

## What breaks warm-up

The fastest way to damage a new domain's reputation is to send to a low-quality or unverified list during this early window. A high bounce rate in week one does more damage than the same rate would later, because there is no established good reputation yet to absorb it. This is why warm-up and list quality are really one conversation. A small, engaged list is what makes a gradual ramp possible.

Watching how people respond during warm-up means paying close attention to bounces, and not every bounce means the same thing.
