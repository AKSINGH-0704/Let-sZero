---
contentType: knowledge-base
slug: shared-vs-dedicated-ip
title: Shared vs Dedicated IP for Cold Email
description: "A dedicated IP is not an upgrade for most senders. Here is the volume threshold where it starts to help, and why it hurts below that line."
authorSlug: repmail-team
publishedAt: "2026-08-10"
tags: ["infrastructure", "deliverability", "sender-reputation", "ip"]
keyTakeaways:
  - "A dedicated IP has no reputation at all. That is worse than a shared IP with a good one, until you have the volume to build your own."
  - "The rough threshold is consistent sending in the tens of thousands per month. Below it, most senders are better off on well-managed shared infrastructure."
  - "Reputation now attaches far more to your domain than to your IP. A dedicated IP does not rescue a damaged domain."
  - "The real question is not shared or dedicated. It is whether whoever runs the shared pool polices it."
prerequisites:
  - label: "How sender reputation is built"
    href: "/repmail/learn/deliverability/sender-reputation"
  - label: "Why new domains need warm-up"
    href: "/repmail/learn/deliverability/why-new-domains-need-warm-up"
commonMistakes:
  - "Buying a dedicated IP to fix a deliverability problem that is actually a targeting or content problem. The IP change resets nothing and delays the diagnosis."
  - "Moving to a dedicated IP and sending at full volume immediately, which is the fastest way to establish a bad reputation from a clean start."
  - "Assuming a dedicated IP isolates you from your own past. Domain reputation follows the domain, not the address you send from."
  - "Choosing a shared pool on price without asking who else is in it or how the provider removes bad senders."
faqs:
  - question: "At what volume does a dedicated IP start to make sense?"
    answer: "There is no exact number, but the useful test is consistency rather than peak volume. A dedicated IP needs regular, predictable traffic to hold a reputation — sending tens of thousands of messages a month, every month, is roughly where it becomes viable. Bursty sending, however large the bursts, tends to do worse on a dedicated IP than on a shared one."
  - question: "Does a dedicated IP improve inbox placement by itself?"
    answer: "No. It changes who your reputation is shared with, not what your reputation is. If your mail is well-targeted and your domain is healthy, a dedicated IP eventually gives you a cleaner signal. If either is not true, it gives you sole ownership of a bad reputation."
  - question: "I was told my shared IP is the reason my mail goes to spam. Is that likely?"
    answer: "It is possible but less likely than it sounds, and it is easy to test before you spend anything. Check whether the sending IP appears on any authoritative blocklist. If it is clean, the problem is almost certainly your domain, your list or your content, and moving IPs will not touch any of those."
  - question: "Does warm-up still apply to a dedicated IP?"
    answer: "Yes, and more strictly. A new dedicated IP has no history at all, so it needs the same gradual ramp a new domain does. This is the step most teams skip when they upgrade, and it is why the switch so often makes placement worse for the first few weeks."
nextStep:
  label: "Next: does your outreach need its own domain?"
  href: "/repmail/learn/infrastructure/separate-sending-domain-for-cold-email"
  description: "The IP question is usually the wrong one. The domain question is the one that changes outcomes."
assets:
  - type: table
    title: Which one fits your sending profile
    content:
      headers: ["Your situation", "Better choice", "Why"]
      rows:
        - ["Starting out, low or irregular volume", "Shared", "You have no history to build a dedicated reputation from, and irregular sending never establishes one"]
        - ["Growing, a few thousand a month", "Shared", "Still below the threshold where isolation beats a pool's established reputation"]
        - ["Consistent tens of thousands a month", "Dedicated, with a proper ramp", "Enough regular volume to hold a stable reputation of your own"]
        - ["High volume, several distinct mail streams", "Dedicated, one per stream", "Keeps transactional and outreach reputations from contaminating each other"]
        - ["Recovering from a deliverability incident", "Fix the domain first", "A new IP does not clear domain reputation, and moving hides the real cause"]
---

The pitch for a dedicated IP is intuitive and almost entirely misleading. It goes: on a shared IP you are at the mercy of strangers, so pay a little more, get your own address, and your deliverability becomes your own business. Most senders who follow that reasoning make their placement worse, and it takes them a month or two to notice.

The reasoning fails because it treats an IP address as though it carries value by default. It does not. An IP address carries **history**, and a brand-new dedicated IP has none.

## Why "no reputation" is worse than "shared reputation"

Mailbox providers decide what to do with your mail using evidence. A shared IP that has been sending clean traffic for years is dense with evidence: thousands of messages a day, consistent engagement, low complaints. When your mail arrives on that IP, it inherits the benefit of that record.

A fresh dedicated IP arrives with nothing. To a receiving filter, no history is not a neutral starting point — it is an unknown, and unknown senders are treated as risks. This is the same logic that makes a new domain harder to send from than an established one, and it applies to IPs just as directly.

So the real comparison is not "your reputation vs. strangers' reputation". It is "an established good reputation you share" vs. "an empty reputation you own". Below a certain volume, the first is simply worth more.

## The threshold is about consistency, not size

The number people ask for is a volume threshold, and the honest answer is that consistency matters more than magnitude. A dedicated IP holds a reputation only if it sends regularly enough for receivers to keep forming an opinion. Long gaps let that opinion decay, and the next send is evaluated almost from scratch.

As a rough guide, consistent sending in the tens of thousands per month, every month, is where a dedicated IP becomes viable. Below that, you are unlikely to generate enough signal to build a reputation faster than it fades.

This is why bursty sending is such a poor fit for dedicated infrastructure. A team that sends nothing for three weeks and then pushes fifty thousand messages in two days has a high monthly volume and terrible reputation dynamics: every campaign looks like a sudden spike from a sender the network has half forgotten. That same pattern on well-managed shared infrastructure is absorbed by the pool's baseline traffic.

## Reputation has largely moved to the domain

The IP-centric view of deliverability is a decade out of date. Modern filtering weights **domain** reputation far more heavily than IP reputation, for the straightforward reason that domains are harder to churn through than addresses. An abuser can rotate IPs cheaply; rotating domains costs money and time and leaves a visible trail.

This has a blunt practical consequence. If your domain reputation is damaged, changing IP does approximately nothing. Your From address is unchanged, your authentication still resolves to the same domain, and the filter's opinion of that domain travels with the mail. Teams routinely spend weeks and real money migrating to dedicated infrastructure to escape a problem that follows them across on the first send.

Before considering an IP change, it is worth confirming what is actually broken. Check whether the sending IP is on an authoritative blocklist. If it is clean, the IP is not your problem, and the answer is somewhere in your domain's history, your list quality or your content.

## The question that actually matters

Framing this as shared-versus-dedicated hides the variable that does most of the work: **who manages the pool**.

A shared IP is only as good as the discipline of the provider running it. A well-managed pool enforces authentication on every sender, monitors complaint rates continuously, and removes senders who damage the neighbourhood quickly. A poorly-managed pool sells access to anyone and lets the reputation drift downward as its worst customers set the tone. Both are "shared IPs" and they are not comparable products.

So the useful questions to ask a provider are not about exclusivity. They are: what do you require of senders before they can use this pool, how do you detect a sender who is degrading it, and how fast do you remove them? A provider with clear answers is offering something better than most dedicated IPs. A provider without them is selling you the average of their worst customers.

## A reasonable default

For most cold outreach programmes the sensible path is: start on well-managed shared infrastructure, put your effort into the things that actually move placement — authentication, warm-up, list quality, targeting — and revisit the IP question only when your volume becomes both large and regular.

If you do move, treat the dedicated IP exactly like a new domain. Ramp gradually over several weeks, watch your bounce and complaint rates at each step, and expect placement to be worse before it is better. The teams who are disappointed by dedicated IPs are almost always the ones who switched on a Friday and sent full volume on the Monday.

RepMail sends through AWS SES on managed, monitored infrastructure, with authentication published for your own verified domain and a progressive warm-up applied automatically to new senders. That combination gives a new sender the practical benefit people hope to buy with a dedicated IP — a clean, policed sending environment — without asking them to build an IP reputation they do not yet have the volume to sustain.
