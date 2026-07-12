---
contentType: tutorial
slug: verify-your-sending-domain
title: Verify Your Sending Domain Before Your First Campaign
description: A step-by-step walkthrough of domain verification in RepMail — the one thing every sending domain needs before you can campaign.
authorSlug: repmail-team
publishedAt: "2026-07-12"
tags: ["domain-verification", "dkim", "setup", "getting-started"]
assets:
  - type: checklist
    title: Domain verification, step by step
    content:
      - "Add the DNS records RepMail generates for your domain (SPF, DKIM, and a return-path CNAME)"
      - "Wait for DNS propagation — usually minutes, occasionally up to 24-48 hours"
      - "Confirm each record shows Verified in your RepMail domain settings"
      - "Send a test email to an inbox you control and check the message headers"
      - "Only then schedule your first real campaign from that domain"
---

Before RepMail can send a single campaign email from your domain, that domain needs to be verified — meaning the DNS records that prove you own it, and that you're authorized to send as it, are correctly published. This isn't a RepMail-specific hurdle; every legitimate email platform requires it, for the reasons covered in [why your emails land in spam without it](/repmail/learn/deliverability/why-your-emails-land-in-spam).

## What you're actually doing

When you add a domain in RepMail, the platform generates the exact DNS records your domain needs — an SPF entry, a DKIM public key, and a return-path CNAME — and shows them to you as copy-ready values. Your job is to add those records to your domain's DNS settings, wherever you manage them (your domain registrar or DNS provider). RepMail doesn't need access to your DNS provider account; you add the records yourself, the same way you'd add any DNS entry.

## Why it isn't instant

DNS changes propagate across the internet's name servers, and that isn't instantaneous. Most of the time, verification completes within minutes of adding the records. Occasionally, depending on your DNS provider and existing record TTLs (time-to-live settings), it can take up to 24-48 hours for the change to be visible everywhere. This is normal, not a sign something's wrong — if verification hasn't completed within a few minutes, check back rather than assuming the records were entered incorrectly.

## Confirming it actually worked

RepMail checks your domain's DNS automatically and marks each record — SPF, DKIM, and the return-path CNAME — as Verified once it can see them correctly published. All three need to show Verified before the domain is genuinely ready to send from. It's worth doing one more real-world check beyond the dashboard: send a test email to an inbox you control (Gmail and most other providers let you view the full message headers) and confirm SPF and DKIM both show as passing there too. That's the same check a receiving mail server performs on every message you send.

## Why this comes before everything else

A domain that isn't fully verified will produce exactly the deliverability problems described in the SPF/DKIM/DMARC guide — spam placement or outright rejection — regardless of how good your campaign content is. This is deliberately the first real action in getting started with RepMail: nothing else is worth doing until it's done.

## Next step

With your domain verified, it's worth understanding exactly why SPF and DKIM matter so much: [why your emails land in spam, and how this fixes it](/repmail/learn/deliverability/why-your-emails-land-in-spam).
