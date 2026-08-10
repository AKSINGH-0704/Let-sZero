---
contentType: knowledge-base
slug: open-rate-tracking-apple-mpp
title: Why Open Rates Are No Longer Reliable
description: "Apple Mail Privacy Protection pre-loads tracking pixels, inflating open rates for a share of your list you cannot identify. Here is what to measure instead."
authorSlug: repmail-team
publishedAt: "2026-08-10"
tags: ["analytics", "open-rate", "reply-rate", "apple-mpp", "cold-email", "metrics"]
keyTakeaways:
  - "Apple Mail Privacy Protection loads tracking pixels automatically, whether or not a human opened the message."
  - "The inflation is not a fixed percentage you can subtract. It varies with how much of your list uses Apple Mail."
  - "Open rate is still useful as a trend on a stable list. It is no longer usable for A/B tests or absolute targets."
  - "Reply rate is unaffected, requires no tracking pixel, and is closer to what you actually care about."
prerequisites:
  - label: "What cold email benchmarks actually mean"
    href: "/repmail/learn/cold-email/cold-email-benchmarks"
commonMistakes:
  - "Declaring a subject-line test a winner on an open-rate difference smaller than the measurement error introduced by MPP."
  - "Removing contacts as unengaged based on opens, which deletes people whose client simply does not report and keeps machine-generated opens."
  - "Reporting an open rate above 70% as a success when it mostly reflects the share of Apple Mail users on the list."
  - "Adding a tracking pixel to cold outreach by default without deciding whether the number changes any decision."
faqs:
  - question: "How does Apple Mail Privacy Protection actually work?"
    answer: "When enabled, Apple routes message content through its own proxy and pre-loads remote images — including tracking pixels — before the recipient opens anything. The sender records an open, at a time that reflects Apple's fetch rather than any human action, and from an IP that reveals nothing about location or device."
  - question: "Can I just filter out Apple opens?"
    answer: "Only partially, and not reliably enough to trust. Some platforms flag opens with characteristics typical of proxy pre-fetching, but the detection is heuristic and Apple is not the only client that pre-loads images. Filtering gives you a smaller number with unknown error rather than a correct one."
  - question: "Is open rate now completely useless?"
    answer: "No, but its use is narrower. As a trend on a stable list where the client mix does not change much, a sharp drop still signals something real — usually a deliverability problem. What it can no longer support is comparing two campaigns, testing subject lines, or hitting an absolute target."
  - question: "What should I measure instead?"
    answer: "Reply rate first, since it needs no tracking, cannot be triggered by a machine, and corresponds to the outcome you want. Then bounce rate and complaint rate for list and domain health. If you need engagement data beyond replies, clicks are more meaningful than opens, though link wrapping carries its own deliverability cost on cold mail."
  - question: "Should I still use a tracking pixel on cold email?"
    answer: "Usually not. It loads from a third-party domain in a message meant to read as a personal note, which is a signal filters notice, and the data it returns is inflated by an unknown amount. If the number would not change a decision you make, you are paying a deliverability cost for a metric you cannot act on."
nextStep:
  label: "Next: what a good reply rate looks like"
  href: "/repmail/learn/cold-email/cold-email-benchmarks"
  description: "If reply rate is the metric that survived, this is what to compare yours against."
assets:
  - type: table
    title: What each metric still tells you
    content:
      headers: ["Metric", "Still reliable?", "What it is good for now"]
      rows:
        - ["Open rate", "No, inflated by an unknown amount", "Detecting a sharp drop on a stable list — nothing more"]
        - ["Reply rate", "Yes", "The primary measure of whether a campaign works"]
        - ["Bounce rate", "Yes", "List quality, and an early warning on domain health"]
        - ["Complaint rate", "Yes", "The metric that ends sending programmes — watch it closely"]
        - ["Click rate", "Mostly", "Real intent, but link wrapping costs you on cold mail"]
        - ["Positive reply rate", "Yes", "The only metric that correlates with revenue"]
---

For a long time, open rate was the first number anyone looked at. It was easy to measure, it responded to subject-line changes, and it felt like a proxy for attention. That era ended quietly, and a lot of outbound teams are still running tests and making list decisions on a number that no longer means what they think.

## What changed

Open tracking has always worked the same way: embed a tiny invisible image hosted on a tracking domain, and record a request for it as an "open". It was never precise — recipients who blocked images were invisible, so the number always undercounted — but the error was at least in one direction and roughly stable.

Apple Mail Privacy Protection inverted that. When enabled, Apple fetches remote content through its own proxy **in advance**, before and regardless of whether the recipient opens the message. Every tracking pixel in every message loads. The sender records an open for a message nobody read, timestamped to Apple's fetch rather than any human action, from an IP that carries no useful location or device information.

The result is not simply a higher number. It is a number contaminated by an unknown proportion of non-events, where the proportion depends on how many people on that particular list use Apple Mail. That share differs between industries, seniorities and regions, and it differs between two segments of your own list.

## Why you cannot just subtract the inflation

The natural instinct is to treat this as a calibration problem: work out the inflation factor and adjust.

It does not work, for a reason worth understanding. The inflation is proportional to the Apple Mail share of the specific recipients who received that specific campaign. Two campaigns to two segments have different shares and therefore different inflation. So does the same campaign sent six months apart, as client usage shifts.

That is precisely the situation in which a metric stops supporting comparison. You can no longer say campaign A outperformed campaign B on opens, because the difference between them may be entirely a difference in who they were sent to. And subject-line testing — the main thing open rate was used for — is exactly a comparison between two groups.

Some platforms offer filtering that flags opens with the fingerprint of proxy pre-fetching. It helps at the margin. It does not restore the metric, because the detection is heuristic, Apple is not the only client that pre-loads, and you are left with a smaller number whose error you still cannot quantify.

## The decision that actually gets damaged

The most expensive consequence is not a misreported dashboard. It is list hygiene.

A common and previously sensible practice is to suppress contacts who have not opened anything in several campaigns, on the reasoning that unengaged recipients drag down reputation. Run that rule now and it does something close to the opposite of what you intend: contacts whose client pre-loads images are recorded as engaged whether or not they ever looked, while contacts using a client that blocks images are recorded as unengaged even when they read every message.

You end up pruning the wrong people and retaining machine-generated engagement — a hygiene process that makes list quality worse while appearing to work.

If you suppress on engagement, suppress on **replies, clicks and bounces**, all of which reflect something that actually happened.

## What to measure instead

**Reply rate** is the metric that survived, and it was always the better one. It requires no tracking pixel, cannot be triggered by a proxy, and corresponds directly to the outcome cold email exists to produce. It is also harder to flatter yourself with, which is part of why it was less popular.

**Bounce rate and complaint rate** are unaffected and remain the two numbers that decide whether your domain keeps working. Both are reported by receiving infrastructure rather than inferred from an image request.

**Click rate** still reflects real intent, with a caveat specific to cold outreach: measuring clicks means wrapping links, which replaces your visible destination with a redirect through a tracking domain. That is a recognised phishing pattern and carries a genuine filtering cost on first-touch mail. On a cold campaign, the trade is usually not worth it.

**Positive reply rate** — replies that are actually interested, separated from the polite declines — is the only number here that correlates with revenue. It requires a human to categorise responses, which is why almost nobody tracks it, and why the teams who do are usually the ones whose outbound works.

## What this means in practice

Stop testing subject lines on open rate. If you want to test them, test them against replies, accept that you need more volume for significance, and be honest that most subject-line differences are smaller than the noise.

Stop setting open-rate targets. A 70% open rate is not a triumph and a 25% open rate is not a failure; both are mostly statements about who is on the list.

Keep watching open rate as a **trend** on a stable list, where a sudden fall still usefully signals that something changed — most often that your mail stopped reaching the inbox. That is a real use, and it is the only one that survives.

And reconsider whether the pixel earns its place at all. On cold outreach it adds a third-party request to a message that is supposed to read like a personal note, in exchange for a number you can no longer act on.

RepMail does not attach open-tracking pixels or wrap links in campaign sends, so a first-touch message carries no third-party requests unless you add one deliberately. Delivery, bounce and complaint telemetry comes from AWS SES itself rather than from an image request, which means the numbers that actually govern your domain's health are measured at the infrastructure layer where they cannot be inflated by a proxy.
