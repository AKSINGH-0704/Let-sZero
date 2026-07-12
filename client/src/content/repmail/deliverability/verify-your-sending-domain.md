---
contentType: tutorial
slug: verify-your-sending-domain
title: Verify Your Sending Domain Before Your First Campaign
description: A step-by-step walkthrough of domain verification in RepMail, the one thing every sending domain needs before you can campaign.
authorSlug: repmail-team
publishedAt: "2026-07-12"
tags: ["domain-verification", "dkim", "setup", "getting-started"]
keyTakeaways:
  - "Every sending domain must be verified before its first campaign. There are no exceptions."
  - "You add three DNS records that RepMail generates, and RepMail confirms each one as Verified automatically."
  - "DNS changes usually propagate in minutes, occasionally up to 24 to 48 hours."
prerequisites:
  - label: "A domain you own and will send from"
  - label: "Access to that domain's DNS settings (your registrar or DNS provider)"
commonMistakes:
  - "Adding the records to the wrong domain, or as the wrong record type."
  - "Scheduling a campaign before all three records show Verified."
nextStep:
  label: "Why your emails land in spam"
  href: "/repmail/learn/deliverability/why-your-emails-land-in-spam"
  description: "Now that your domain is verified, see what SPF, DKIM, and DMARC actually do for delivery."
assets:
  - type: checklist
    title: Domain verification, step by step
    content:
      - "Add the DNS records RepMail generates for your domain (SPF, DKIM, and a return-path CNAME)"
      - "Wait for DNS propagation, usually minutes, occasionally up to 24 to 48 hours"
      - "Confirm each record shows Verified in your RepMail domain settings"
      - "Send a test email to an inbox you control and check the message headers"
      - "Only then schedule your first real campaign from that domain"
---

Before RepMail can send a single campaign email from your domain, that domain has to be verified. Verification means the DNS records that prove you own the domain, and that you are allowed to send as it, are published correctly. This is not a RepMail quirk. Every legitimate email platform requires it, for the reasons covered in [why your emails land in spam without it](/repmail/learn/deliverability/why-your-emails-land-in-spam).

## What you are actually doing

When you add a domain in RepMail, the platform generates the exact records your domain needs, an SPF entry, a DKIM public key, and a return-path CNAME, and shows them as copy-ready values. Your job is to add those records in your domain's DNS settings, wherever you manage them. RepMail never needs access to your DNS provider account. You add the records yourself, the same way you would add any DNS entry.

## Why it is not instant

DNS changes propagate across the internet's name servers, which takes time. Most of the time verification completes within minutes. Occasionally, depending on your provider and your existing record TTLs (time-to-live settings), it can take up to 24 to 48 hours to be visible everywhere. That delay is normal. If verification has not completed after a few minutes, wait and check back rather than assuming you entered the records wrong.

## Confirming it worked

RepMail checks your DNS automatically and marks each record as Verified once it can see the record published correctly. All three need to show Verified before the domain is ready to send from. Do one more check beyond the dashboard: send a test email to an inbox you control, open the full message headers (Gmail and most providers let you), and confirm SPF and DKIM both pass there too. That is the same check a receiving server runs on every message you send.

## Why this comes first

A domain that is not fully verified produces the exact deliverability problems covered in the SPF, DKIM, and DMARC guide, spam placement or outright rejection, no matter how good your campaign is. This is the first real action in getting started with RepMail on purpose. Nothing else is worth doing until it is done.

With verification behind you, the rest of deliverability builds on this foundation, starting with why these records matter in the first place.
