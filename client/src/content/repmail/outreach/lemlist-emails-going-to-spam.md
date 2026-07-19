---
contentType: guide
slug: lemlist-emails-going-to-spam
title: "Lemlist Emails Going to Spam? Here's Why, and How to Fix It"
description: "Rich personalization is Lemlist's strength and its deliverability risk. Why image-heavy, link-heavy sequences get filtered, and the fixes that work."
authorSlug: repmail-team
publishedAt: "2026-07-19"
updatedAt: "2026-07-19"
tags: ["troubleshooting", "lemlist", "deliverability", "authentication", "spam"]
featured: false
keyTakeaways:
  - "Lemlist's visual personalization adds images, HTML, and redirect links, which is exactly the profile filters treat as marketing rather than personal mail."
  - "Text-to-HTML ratio matters. A message that is mostly markup with a pixel and several rewritten links reads as bulk."
  - "Tracking links on a hostname that does not match your sending domain is a phishing pattern, not a branding detail."
  - "Fix authentication and infrastructure first. Content changes cannot recover a domain with broken alignment or an inherited IP penalty."
prerequisites:
  - label: "SPF, DKIM and DMARC explained"
    href: "/repmail/learn/deliverability/email-authentication"
  - label: "Why emails land in Promotions"
    href: "/repmail/learn/deliverability/why-emails-land-in-promotions"
commonMistakes:
  - "Using a custom image in the first cold touch. It is the single fastest way to look like a marketing blast."
  - "Leaving open tracking on for every step of every sequence."
  - "Publishing a second SPF record when connecting a new sending tool."
  - "Treating spam placement as a copy problem when the cause is a shared IP or a failed DKIM selector."
faqs:
  - question: "Why do my Lemlist emails go to spam when my copy is fine?"
    answer: "Usually because of what surrounds the copy rather than the copy itself. Visual personalization adds images and HTML structure, link tracking rewrites URLs to a redirect host, and open tracking adds a remote pixel. Individually these are minor; together they produce a message that structurally resembles marketing mail, which is filtered differently from a plain personal message."
  - question: "Does Lemlist's image personalization hurt deliverability?"
    answer: "It can, particularly in a first touch. A dynamically generated image is a remote asset loaded from a third-party host, and it lowers your text-to-image and text-to-HTML ratios. The feature is genuinely distinctive for warm or later-stage sequences; using it on a cold first contact is where the risk is highest."
  - question: "Should I turn off open tracking?"
    answer: "Try it for one campaign and compare. Open tracking adds a remote pixel to every message, and since Apple Mail Privacy Protection the open-rate data it produces is unreliable anyway. Most cold-email teams find reply rate is the only metric worth optimising, and dropping the pixel costs them nothing real."
  - question: "How do I know if the problem is my domain or the platform?"
    answer: "Check the two separately. Verify your own authentication and domain blocklist status first. If those are clean and placement is still poor, check whether the sending IP is listed, which points at shared infrastructure rather than anything you control."
nextStep:
  label: "Run the full pre-send checklist"
  href: "/repmail/learn/deliverability/pre-send-deliverability-checklist"
  description: "Everything to verify before a campaign goes out."
assets:
  - type: checklist
    title: Fix in this order
    content: |
      - Exactly one SPF TXT record, under 10 DNS lookups, covering every sender?
      - DKIM signing with a 2048-bit key, selector resolving in DNS?
      - DMARC published, with SPF or DKIM aligned to the visible From domain?
      - Sending domain and sending IP each checked against blocklists separately?
      - Open tracking off for at least one test campaign?
      - Tracking links on a subdomain of your sending domain?
      - Custom images removed from first-touch messages?
      - Link count per message down to one, or none in the first touch?
      - Text-to-HTML ratio favouring plain text?
      - Hard bounces suppressed immediately rather than at the next sync?
      - Per-mailbox daily volume conservative, spread across warmed accounts?
  - type: table
    title: What each element costs you
    content:
      headers: ["Element", "Why filters dislike it", "Fix"]
      rows:
        - ["Custom personalized image", "Remote asset, poor text-to-image ratio", "Remove from first touch"]
        - ["Open-tracking pixel", "Remote 1x1 load, marketing signature", "Disable; measure replies instead"]
        - ["Rewritten tracking links", "From domain and link host mismatch", "Use a subdomain of your sending domain"]
        - ["Heavy HTML template", "Low text-to-HTML ratio", "Send near-plain text"]
        - ["Multiple links per message", "Bulk-mail pattern", "One link, or none, in a cold first touch"]
        - ["Two SPF records", "Hard authentication failure", "Merge into a single record"]
---

Lemlist's distinguishing feature is rich personalization: custom images, dynamic landing pages, visually tailored sequences. It is a genuinely clever product, and it is also, from a filter's point of view, the thing most likely to get your mail classified as marketing.

That is the tension at the centre of most Lemlist deliverability problems. The features that make a message feel personalized to a human make it look bulk to a machine.

## Fix the infrastructure first

Before touching content, rule out the causes that content cannot fix. This order matters, because teams routinely spend weeks rewriting copy while a broken DNS record quietly fails every message.

**One SPF record, and only one.** A domain may publish exactly one SPF TXT record. A second one, typically added when connecting a new tool, is a permanent failure rather than a merge. Stay under the ten DNS lookup limit too, which a stack with several `include:` entries can exceed without warning.

**DKIM with a 2048-bit key**, and confirm the selector actually resolves. A partially published or mid-rotation key produces intermittent passes, which is harder to diagnose than a clean failure.

**DMARC with real alignment.** Publishing a DMARC record achieves nothing unless SPF or DKIM aligns with the From domain your recipient sees. Check alignment, not just presence. The mechanics are in [SPF, DKIM and DMARC explained](/repmail/learn/deliverability/email-authentication).

Then check blocklists for your sending domain and your sending IP separately, because they list independently, and an IP listing on shared infrastructure is not something your own hygiene caused or can fix. [Blacklists and removal](/repmail/learn/deliverability/email-blacklists-and-removal) covers the process.

## The personalization penalty

Now the content, and specifically the parts that are not words.

**Custom images.** A dynamically generated personalized image is a remote asset fetched from a third-party host when the message opens. It lowers your text-to-image ratio, adds an external dependency, and matches the structural profile of a marketing send. In a warm sequence to someone who already knows you, that is usually fine. In a cold first touch, it is the fastest available way to be sorted as promotional.

**HTML weight.** Genuine personal email is mostly text. A message built from a designed template carries a lot of markup relative to its words, and a poor text-to-HTML ratio pushes classification toward bulk even when nothing in the message is objectionable.

**Link tracking.** Rewriting URLs so clicks route through a tracking host creates a mismatch between the domain in the From header and the domain the link resolves to. That specific mismatch is a core phishing signal. If you use link tracking, the tracking hostname must be a subdomain of your sending domain, and it must have a valid certificate. A generic shared tracking host is considerably worse than no tracking at all.

**Open tracking.** The pixel is a remote 1x1 image load, which is a recognisable marketing signature. Since Apple Mail Privacy Protection began pre-fetching images, the open data it produces is unreliable anyway. Run one campaign with it off and compare reply rates; most teams find they lose a vanity metric and gain placement.

The general principle: for cold outreach, the message should be structurally indistinguishable from a plain note a person typed. Every element you add that a person would not have added moves you further from that.

## Content fingerprinting

There is a second-order content problem worth understanding, because it defeats the standard workaround.

Filters no longer compare messages by exact string matching. They evaluate messages semantically, which means variation that only swaps synonyms leaves the underlying meaning essentially identical. Thousands of messages built from the same template with rotating words still cluster as a single campaign.

Real variation means different structure and different substance per recipient, not different vocabulary. Doing that by hand at volume is impractical, which is why per-recipient generation has replaced token substitution as the workable approach. RepMail generates each message with GPT-4o rather than assembling it from spintax, which changes the actual content rather than its surface.

## List hygiene and bounce timing

Every hard bounce costs reputation, and the cost compounds because a stale list keeps producing them.

The detail that matters more than most teams realise is *when* bounce data reaches you. If bounces arrive through a delayed log sync, you continue mailing addresses that are already known to be dead, and each additional attempt is another reputation hit. Suppression at the moment of the bounce event, rather than at the next sync, is the difference between one bad send and a campaign's worth.

RepMail handles this through AWS SNS webhooks that fire on the bounce itself. Whatever tool you use, understand its bounce latency, and understand the difference between [hard and soft bounces](/repmail/learn/deliverability/hard-vs-soft-bounces), because treating them identically wastes reputation on addresses that were only temporarily unavailable.

## Volume and pacing

Keep per-mailbox daily volume conservative and scale by adding warmed mailboxes rather than by pushing more through each one. Providers enforce hourly velocity limits independently of daily ones, and crossing them produces temporary blocks that present as a deliverability collapse.

If messages are logging as delivered while opens fall to near zero, that is quarantine rather than filtering, and the correct response is to stop sending from those mailboxes and let them rest.

## When to repair and when to move on

A domain that failed for a mechanical reason, a broken record, a velocity spike, an image-heavy first touch, will recover. Correct the cause, pause, and warm back up over a few weeks.

A domain carrying months of elevated complaint rates or sitting on multiple authoritative blocklists is usually not worth the recovery timeline. Isolate it, move to clean outbound domains configured correctly from the start, and treat the reputation as spent.
