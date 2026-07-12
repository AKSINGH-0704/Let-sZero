---
contentType: guide
slug: pre-send-deliverability-checklist
title: "Before You Hit Send: A Pre-Campaign Deliverability Checklist"
description: A final, practical checklist to run through before launching any cold email campaign.
authorSlug: repmail-team
publishedAt: "2026-07-12"
tags: ["deliverability", "checklist", "getting-started"]
assets:
  - type: checklist
    title: Pre-send checklist
    content:
      - "Domain shows Verified in RepMail (SPF, DKIM, and return-path all green)"
      - "If the domain is new, you've completed at least week 1 of warm-up"
      - "Your contact list is opted-in or genuinely relevant — no purchased or scraped lists"
      - "Subject line avoids spam-trigger words and isn't in all caps"
      - "You've sent a test email to yourself and checked how it renders"
      - "Unsubscribe/opt-out is clear, per applicable regulations in your contacts' region"
---

Every guide up to this point covers one piece of deliverability in depth — authentication, warm-up, list hygiene, subject lines. Before your first real campaign, it's worth running through all of it at once, in the order it actually matters.

## Why a checklist, not another deep dive

Each individual topic — SPF/DKIM/DMARC, warm-up, bounce handling — has enough nuance to deserve its own guide, and you've likely already read the ones relevant to your situation. What's missing at send time isn't more explanation, it's a fast, complete pass to confirm nothing was missed before a campaign goes out to real people.

## Walking through the checklist

**Domain verification** comes first because nothing else matters if it's not done — a campaign sent from an unverified domain will struggle regardless of anything else being correct. **Warm-up status** matters specifically for new domains; if you're still in your first week or two of sending, keep volume where your warm-up plan says it should be, not where the campaign tool defaults to. **List quality** is worth a genuine gut check, not just a technical one — a purchased or scraped list will hurt your reputation regardless of how well-configured everything else is. **Subject line review** is quick but easy to skip when you're focused on the body copy. **A real test send** catches formatting issues, broken personalization tokens, and rendering problems that are much easier to notice in your own inbox than to guess at from an editor preview. **Opt-out clarity** isn't just good practice — depending on where your contacts are located, it may be a legal requirement, and it's one of the fastest things to check and easiest to overlook.

## What this checklist is not

This isn't a replacement for understanding *why* each of these matters — that's what the rest of the Deliverability Academy covers. It's the fast version, for the moment right before you click send, when you want confidence that the fundamentals are actually in place rather than assumed.

## Next step

For a deeper, themed pass through everything that goes into a deliverable first campaign, see the [Getting Your First Campaign Delivered](/repmail/learn/collections/getting-your-first-campaign-delivered) collection.
