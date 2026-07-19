---
contentType: guide
slug: smartlead-deliverability-issues
title: "Why Is Smartlead Deliverability Dropping? What to Check"
description: "A structured audit for falling Smartlead placement: shared IP pools, SPF and DKIM alignment, tracking clutter, and content footprints, in diagnostic order."
authorSlug: repmail-team
publishedAt: "2026-07-19"
updatedAt: "2026-07-19"
tags: ["troubleshooting", "smartlead", "deliverability", "authentication", "sender-reputation"]
featured: false
keyTakeaways:
  - "Check infrastructure before content. Most sudden drops are reputation or authentication, not copy."
  - "More than one SPF record on a domain is a hard fail, not a warning. It is the most common self-inflicted authentication error."
  - "Spintax no longer defeats content fingerprinting. Filters compare messages semantically, not by exact string match."
  - "A shared IP pool means part of your reputation is inherited. Dedicated sending is the structural fix."
prerequisites:
  - label: "SPF, DKIM and DMARC explained"
    href: "/repmail/learn/deliverability/email-authentication"
  - label: "What sender reputation actually is"
    href: "/repmail/learn/deliverability/sender-reputation"
commonMistakes:
  - "Rewriting copy first. If authentication broke or an IP got penalised, no subject line recovers it."
  - "Publishing a second SPF record when adding a new sender, instead of merging includes into the existing one."
  - "Assuming spintax variation is enough. Rotating a few synonyms leaves the underlying message vector unchanged."
  - "Leaving open tracking on every message, which adds a remote pixel and a redirect hostname to mail that needs to look plain."
faqs:
  - question: "Why did deliverability drop suddenly with no change to my campaigns?"
    answer: "Because something outside your campaigns changed. The usual candidates are a shared sending IP that picked up a penalty from another sender, an authentication record that was edited or overwritten, or a volume increase that crossed a provider's velocity threshold. Start with authentication and reputation checks before touching copy."
  - question: "Can I have two SPF records?"
    answer: "No. A domain must publish exactly one SPF TXT record. Two records is a permanent error, and receivers treat it as a failure rather than merging them. If you need to authorise an additional sender, add its include to the single existing record."
  - question: "Does spintax still help?"
    answer: "Barely, against modern filters. Rotating synonyms changes the surface string but leaves the semantic structure nearly identical, and receiving systems compare messages by meaning rather than exact match. Thousands of messages that differ only in word choice still cluster as one campaign."
  - question: "Is a dedicated IP worth it?"
    answer: "It is if your problem is inherited reputation. A dedicated IP means your sending history is yours alone: nobody else's bounces attach to it, and nobody else's complaints raise your score. It also means you have to warm it properly, because there is no established history to borrow either."
nextStep:
  label: "Run a full pre-send check"
  href: "/repmail/learn/deliverability/pre-send-deliverability-checklist"
  description: "The complete checklist to run before any campaign goes out."
assets:
  - type: checklist
    title: Deliverability audit, in diagnostic order
    content: |
      - Exactly one SPF TXT record on the sending domain? Two is a hard fail.
      - Does SPF include every service that sends as you, and stay under 10 DNS lookups?
      - Is DKIM signing with a 2048-bit key, and does the selector resolve?
      - Is DMARC published, and does at least one of SPF or DKIM align with the From domain?
      - Are you on a shared IP pool? Check whether the pool is listed anywhere.
      - Has your daily volume per mailbox increased recently? Compare to two weeks ago.
      - Are you on any blocklist? Check the sending domain and the sending IP separately.
      - Is open tracking on? Try turning it off for one campaign and compare placement.
      - Do your tracking links use a subdomain of your sending domain, not a generic host?
      - What is your text-to-HTML ratio, and how many links per message?
      - Are your messages semantically distinct, or only spintax-different?
      - What are your current bounce and complaint rates? Complaints above 0.3% is danger.
  - type: table
    title: Symptom to likely cause
    content:
      headers: ["Pattern", "Most likely cause", "Where to look"]
      rows:
        - ["Sudden drop, no campaign change", "Shared IP penalty or broken auth", "Blocklists, SPF/DKIM records"]
        - ["Gradual decline over weeks", "List decay, rising complaints", "Bounce and complaint rates"]
        - ["Drop right after adding a sender", "Second SPF record published", "DNS TXT records"]
        - ["Lands in Promotions, not Spam", "Tracking pixel and link clutter", "Open tracking, link count"]
        - ["High delivery, near-zero opens", "Quarantine or shadowban", "Volume per mailbox, velocity"]
        - ["Only some recipients affected", "Provider-specific filtering", "Compare Gmail vs Microsoft rates"]
---

When placement falls, the instinct is to rewrite the email. That is almost always the wrong first move. Copy affects placement at the margin; infrastructure and reputation decide it. Work through this in order, because each step rules out a category of cause that would otherwise waste a week of copy testing.

## 1. Authentication, first and always

Verify the boring things before anything else, because they break silently and they break hard.

**SPF must be a single record.** A domain is allowed exactly one SPF TXT record. If someone added a second when connecting a new tool, that is a permanent error and receivers treat it as a failure rather than combining them. This is the most common self-inflicted authentication fault, and it typically appears right after a stack change. Merge every `include:` into one record.

Watch the lookup limit too. SPF permits ten DNS lookups; each `include` consumes at least one, and a stack that has accumulated several senders can quietly exceed it, which also fails.

**DKIM should sign with a 2048-bit key**, and the selector must actually resolve in DNS. A rotated or partially-published key produces intermittent failures that are maddening to trace because some mail passes.

**DMARC needs alignment**, not just presence. A published DMARC record does nothing if neither SPF nor DKIM aligns with the visible From domain. Check alignment specifically rather than assuming a record equals a pass. The full mechanics are in [SPF, DKIM and DMARC explained](/repmail/learn/deliverability/email-authentication).

## 2. Whose reputation are you sending on?

If authentication is clean, look at the infrastructure.

Smartlead, like most sequencers, routes through shared sending infrastructure by default. Shared IP pools blend the reputation of everyone using them. When another tenant mails a stale list and generates bounces and complaints, the penalty attaches to the pool, and it reaches your mail even though your own list is clean and your records are correct.

The tell for this is a sudden drop with no corresponding change on your side. Check whether your sending IP, not just your domain, appears on any blocklist, and check them separately because they can be listed independently. [Blacklists and how to get removed](/repmail/learn/deliverability/email-blacklists-and-removal) covers the process.

Smartlead's own answer to this is SmartServers, dedicated IP isolation at roughly $39 per server per month. That genuinely fixes inherited reputation, with the caveat that a fresh dedicated IP has no history at all, so it needs proper [warm-up](/repmail/learn/deliverability/why-new-domains-need-warm-up) before carrying real volume.

## 3. Velocity and volume

Compare your per-mailbox daily volume against two weeks ago. Providers enforce hourly velocity thresholds independently of daily limits, and crossing them produces temporary blocks that look like a deliverability problem because in effect they are one.

If mail is logging as delivered while opens collapse toward zero, treat that as quarantine rather than a content issue. Stop sending from the affected mailboxes and let them rest. Pushing more volume through a throttled account converts a temporary problem into a durable one.

Keep per-mailbox daily volume conservative and scale by adding mailboxes rather than by increasing per-mailbox output.

## 4. Tracking clutter

Open tracking inserts a remote image into every message. Link tracking rewrites every URL to route through a redirect host. Both are normal in marketing mail and both are unusual in the kind of plain, personal message cold outreach is trying to imitate.

Two specific problems. If your tracking hostname is generic rather than a subdomain of your sending domain, the mismatch between the visible From domain and the link destination is exactly the pattern phishing detection looks for. And a message that is mostly HTML scaffolding with several rewritten links and a tracking pixel has a poor text-to-HTML ratio, which pushes it toward Promotions even when it is not classified as spam.

Try one campaign with open tracking disabled and compare. Losing the open-rate metric is a real cost, but open rates have been unreliable since Apple Mail Privacy Protection anyway, and reply rate is the number that matters. [Why emails land in Promotions](/repmail/learn/deliverability/why-emails-land-in-promotions) goes deeper on this specific failure mode.

## 5. Content fingerprinting

This is where spintax comes in, and where a lot of established practice has quietly stopped working.

Spintax rotates words. Modern filters do not compare messages by exact string; they compare them semantically, which means thousands of messages that differ only in synonym choice still resolve to nearly the same underlying vector. The campaign clusters as one campaign regardless of how many variants you generated.

Defeating that requires genuine variation in structure and substance, not vocabulary. Different opening angles, different sentence structures, different specifics per recipient. That is difficult to do by hand at volume, which is precisely why per-recipient generation rather than token substitution has become the practical approach. RepMail uses GPT-4o to rewrite each message rather than rotating spintax tokens, which changes the actual content rather than the surface string.

Also check your [spam trigger words](/repmail/learn/deliverability/spam-trigger-words) and current [spam score](/repmail/learn/deliverability/what-is-a-good-spam-score), but do this last. Content is a real factor and rarely the cause of a sudden drop.

## 6. The numbers that decide

Finally, look at your bounce and complaint rates directly. Complaint rate above roughly 0.3% is the threshold at which Google's postmaster signals turn hostile, and it is very difficult to recover from without pausing entirely. Rising [hard bounces](/repmail/learn/deliverability/hard-vs-soft-bounces) mean list decay, and list decay compounds: every stale address you keep mailing costs you reputation you then spend months rebuilding.

Real-time suppression matters more than most teams assume here. If bounce data arrives through a delayed log sync, you keep sending to addresses you already know are dead. RepMail's AWS SNS integration suppresses on the bounce event itself, which is the difference between removing a bad address immediately and removing it tomorrow.

## When to repair and when to rebuild

If the cause is a fixable configuration error, a velocity spike, or a temporary block, repair it: correct the records, pause, and warm back up over a few weeks. Domains recover from mechanical faults.

If the domain has accumulated months of high complaint rates or sits on multiple authoritative blocklists, repair is usually the more expensive path. Isolate it, move active campaigns to clean outbound domains configured correctly from the start, and treat the old domain as a sunk cost rather than a project.
