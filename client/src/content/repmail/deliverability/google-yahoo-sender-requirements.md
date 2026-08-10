---
contentType: knowledge-base
slug: google-yahoo-sender-requirements
title: Google and Yahoo Sender Requirements, Explained
description: "Google and Yahoo now enforce authentication, one-click unsubscribe, and a hard spam-complaint ceiling. Here is exactly what each rule asks of you."
authorSlug: repmail-team
publishedAt: "2026-08-10"
tags: ["deliverability", "authentication", "dmarc", "compliance", "gmail"]
heroDiagram: email-authentication
keyTakeaways:
  - "Authentication is no longer optional. SPF, DKIM and a published DMARC record are the entry ticket, not an optimisation."
  - "The complaint rate ceiling is 0.3%, and Google advises staying under 0.1%. That is roughly one complaint in a thousand messages."
  - "Bulk senders must offer one-click unsubscribe and honour it within two days."
  - "These rules describe a floor. Meeting them stops you being rejected; it does not by itself get you into the inbox."
prerequisites:
  - label: "How email authentication fits together"
    href: "/repmail/learn/deliverability/email-authentication"
  - label: "What DMARC decides"
    href: "/repmail/learn/deliverability/what-is-dmarc"
commonMistakes:
  - "Publishing a DMARC record but never checking alignment, so the record exists while the domain still fails the check it is supposed to pass."
  - "Treating the 0.3% complaint ceiling as a target. It is the point at which enforcement begins, not a healthy operating level."
  - "Adding an unsubscribe link in the footer only, without the List-Unsubscribe headers that the one-click requirement actually refers to."
  - "Assuming the rules apply only to newsletters. They are volume-based, and a scaled cold campaign reaches the threshold quickly."
faqs:
  - question: "Do these rules apply to cold outreach, or only to marketing email?"
    answer: "They are written in terms of sending volume to Gmail and Yahoo addresses, not in terms of what you call the mail. A cold campaign that reaches the bulk threshold is treated as bulk. In practice the authentication and complaint-rate requirements are enforced far more broadly than the volume wording suggests, so the safe assumption is that they apply to you."
  - question: "What counts as the complaint rate?"
    answer: "The proportion of delivered messages that recipients mark as spam, measured by the receiver rather than by you. Because you never see most of this directly, a feedback loop and your platform's own complaint reporting are the only realistic way to watch it."
  - question: "Is p=none enough for DMARC?"
    answer: "It satisfies the letter of the requirement, which asks only that a DMARC record exists. It gives you no protection against spoofing, though, and it tells receivers you are not yet confident in your own authentication. Treat p=none as a monitoring stage you move through, not a destination."
  - question: "What happens if I go over the complaint ceiling?"
    answer: "Enforcement is gradual rather than binary. Messages start being filtered to spam more aggressively, then rejected outright. Recovery is slower than the fall, because reputation is rebuilt from subsequent sending history."
nextStep:
  label: "Next: keep the complaint rate down"
  href: "/repmail/learn/deliverability/complaint-rate-and-bounce-rate"
  description: "The ceiling is the rule. Knowing what actually pushes a complaint rate up is how you stay under it."
assets:
  - type: table
    title: The requirements, and what each one actually asks
    content:
      headers: ["Requirement", "What it means in practice", "How to verify it"]
      rows:
        - ["SPF and DKIM", "Both must be published and must pass for your sending domain", "Send a test message and read the Authentication-Results header"]
        - ["DMARC record", "A published policy on the sending domain, at minimum p=none", "Query the _dmarc TXT record for your domain"]
        - ["Domain alignment", "The domain in the visible From address must align with the authenticated domain", "Check that SPF or DKIM alignment passes, not just that the checks pass"]
        - ["One-click unsubscribe", "List-Unsubscribe and List-Unsubscribe-Post headers on bulk mail", "Inspect the raw headers of a delivered message"]
        - ["Honour opt-outs in 2 days", "Suppression must take effect within two days of the request", "Confirm your suppression list is enforced at send time"]
        - ["Complaint rate under 0.3%", "Roughly three complaints per thousand delivered messages", "Google Postmaster Tools, plus your platform's complaint reporting"]
        - ["Valid forward and reverse DNS", "The sending IP resolves to a hostname and back again", "A reverse DNS lookup on the sending IP"]
---

For years, the rules of bulk sending were unwritten. Mailbox providers published guidance, senders treated it as advice, and enforcement was inconsistent enough that plenty of people ignored it and got away with it. That period is over. Google and Yahoo now publish explicit requirements for bulk senders and enforce them at the gateway, which means a configuration that would have been merely suboptimal a few years ago is now a reason for your mail to be rejected outright.

The requirements are not complicated. What makes them worth understanding properly is that several of them are easy to satisfy on paper while still failing in practice, and the gap between those two states is where most senders lose deliverability without realising anything is wrong.

## Authentication is now the entry ticket

The first group of requirements is about proving that your mail is really yours. You need SPF and DKIM published for your sending domain, and you need a DMARC record on that domain. This is the part most senders believe they have already done.

The subtlety is **alignment**. SPF and DKIM can both pass while your mail still fails DMARC, because DMARC does not just ask "did these checks pass?" — it asks whether the domain those checks authenticated is the same domain your recipient can see in the From line. A message sent through a third-party platform can easily pass SPF for the platform's own domain while showing your domain to the recipient. Both checks green, alignment failed, DMARC failed.

This is why "we have SPF and DKIM" is not an answer to "do you pass?". The only reliable verification is to send a real message to an address you control and read the `Authentication-Results` header it arrives with. That header states, explicitly, what the receiver concluded. Nothing else you can inspect is as trustworthy, because nothing else is the receiver's own verdict.

A published DMARC policy of `p=none` is enough to satisfy the requirement as written. It is worth being honest about what that buys you: nothing, defensively. `p=none` asks receivers to take no action on failures and simply report them. That is a legitimate and sensible first stage — you want the reports before you start enforcing — but a domain left at `p=none` indefinitely is a domain whose owner never finished the job.

## The complaint rate is the rule with teeth

The authentication requirements are one-time work. The complaint rate is the one you live with forever, and it is the one that ends most sending programmes.

The published ceiling is 0.3% of delivered messages, with guidance to stay below 0.1%. Those numbers are smaller than they sound. At 0.3%, three people in a thousand marking your message as spam is enough to trigger enforcement. A single badly-targeted campaign to a list you did not properly qualify can clear that in an afternoon.

Two things about this metric are worth internalising. First, it is measured by the receiver, not by you: you cannot audit it directly, and you will find out you have a problem from your delivery rate before you find out from any dashboard. Google Postmaster Tools and your platform's own complaint reporting are the closest you get to visibility, and both are lagging indicators.

Second, and less obvious: enforcement is not binary. Crossing the line does not flip a switch. What happens is that filtering becomes progressively more aggressive — more of your mail goes to spam, which lowers engagement, which further lowers your reputation. By the time you notice, you are usually already in the reinforcing part of the cycle, which is why recovery takes far longer than the decline did.

## One-click unsubscribe means the headers, not the footer

The unsubscribe requirement is the one most commonly satisfied incorrectly, because almost every sender already has an unsubscribe link and reasonably assumes that covers it.

It does not. The requirement refers to the `List-Unsubscribe` and `List-Unsubscribe-Post` headers, which let the mailbox provider render its own unsubscribe control at the top of the message, above your content. That control is what "one-click" means: the recipient never visits your page, never sees a confirmation step, and never has to find your footer. The request comes to you as a machine-readable signal, and you must act on it within two days.

The reason this requirement exists is directly connected to the complaint rate. When unsubscribing is harder than reporting spam, recipients report spam — it is the faster button. Every unnecessary step between "I want out" and being out converts a harmless opt-out into a complaint against your domain. Making unsubscribe genuinely trivial is not a compliance chore; it is the cheapest complaint-rate protection available to you.

## What the requirements do not do

It is worth being clear about the limit of all this, because the framing invites a misunderstanding that costs people months.

Meeting these requirements does not get you into the inbox. It stops you being rejected at the door. Authentication proves identity; it says nothing about whether your mail is wanted. A perfectly authenticated domain with an aligned DMARC policy and a clean unsubscribe flow can still land every message in spam if the recipients do not engage, the volume ramps too fast, or the targeting is poor.

Think of the requirements as the difference between having a valid passport and being welcome in the country. The passport is not optional and nothing happens without it, but nobody is impressed by it either.

The work that actually earns placement — sending at a rate your domain's history supports, writing mail specific enough that people reply, and keeping your list clean enough that bounces stay rare — is the same work it always was. What has changed is that you no longer get to skip the paperwork first.

RepMail publishes SPF and DKIM for your verified sending domain as part of domain setup, adds the required `List-Unsubscribe` headers to every message automatically, and enforces suppression at send time so an opt-out is honoured on the next campaign rather than two days later. The complaint rate is still yours to manage — no platform can target your list for you — but the mechanical requirements are handled rather than left as homework.
