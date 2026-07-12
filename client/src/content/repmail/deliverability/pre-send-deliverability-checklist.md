---
contentType: guide
slug: pre-send-deliverability-checklist
title: "Before You Hit Send: A Pre-Campaign Deliverability Checklist"
description: A final, practical checklist to run through before launching any cold email campaign.
authorSlug: repmail-team
publishedAt: "2026-07-12"
tags: ["deliverability", "checklist", "getting-started"]
keyTakeaways:
  - "Run one fast, complete pass before every campaign. Order matters more than depth here."
  - "Domain verification comes first, and warm-up status for new domains. Nothing else matters without them."
  - "A real test send to your own inbox catches formatting issues that a preview will not."
prerequisites:
  - label: "A verified sending domain"
    href: "/repmail/learn/deliverability/verify-your-sending-domain"
  - label: "An opted-in or genuinely relevant contact list"
nextStep:
  label: "Getting Your First Campaign Delivered"
  href: "/repmail/learn/collections/getting-your-first-campaign-delivered"
  description: "A themed bundle covering warm-up, bounce handling, and deliverability-safe templates."
assets:
  - type: checklist
    title: Pre-send checklist
    content:
      - "Domain shows Verified in RepMail (SPF, DKIM, and return-path all green)"
      - "If the domain is new, you have completed at least week 1 of warm-up"
      - "Your contact list is opted-in or genuinely relevant, with no purchased or scraped lists"
      - "Subject line avoids spam-trigger words and is not in all caps"
      - "You have sent a test email to yourself and checked how it renders"
      - "Unsubscribe and opt-out are clear, per the rules in your contacts' region"
---

Every guide up to this point covers one piece of deliverability in depth: authentication, warm-up, list hygiene, subject lines. Before your first real campaign, it pays to run through all of it at once, in the order that actually matters.

## Why a checklist, not another deep dive

Each topic here has enough nuance to fill its own guide, and you have probably read the ones that apply to you. What is missing at send time is not more explanation. It is a fast, complete pass to confirm nothing slipped before the campaign reaches real people.

## Walking through it

**Domain verification** comes first, because nothing else counts if it is not done. A campaign from an unverified domain will struggle no matter what else is right. **Warm-up status** matters for new domains: if you are still in the first week or two, hold volume where your warm-up plan says, not where the campaign tool defaults. **List quality** deserves an honest gut check, not just a technical one, since a purchased or scraped list hurts your reputation regardless of how well everything else is configured. **Subject line review** is quick and easy to skip once you are deep in the body copy. **A real test send** catches broken personalization tokens and rendering problems that are far easier to spot in your own inbox than to guess at from an editor preview. **Opt-out clarity** is more than good manners. Depending on where your contacts are, it may be a legal requirement, and it is one of the fastest things to check and the easiest to overlook.

## What this checklist is not

This is not a substitute for understanding why each item matters. The rest of the Deliverability Academy covers that. This is the fast version, for the moment right before you click send, when you want confidence that the fundamentals are in place rather than assumed.

If you want a deeper, themed pass through everything that goes into a deliverable first campaign, the full collection pulls it together.
