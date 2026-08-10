---
contentType: guide
slug: build-and-verify-a-cold-email-list
title: How to Build and Verify a Cold Email List
description: "A bought list is the fastest way to damage a new domain. Here is how to build a list from scratch, verify it properly, and what each bounce actually costs you."
authorSlug: repmail-team
publishedAt: "2026-08-10"
tags: ["list-building", "email-verification", "cold-email", "deliverability", "bounce-rate"]
keyTakeaways:
  - "List quality is the single largest input to deliverability. Nothing downstream compensates for a bad list."
  - "Verification removes invalid addresses. It cannot tell you whether the person is worth emailing — that is targeting, and it is a separate job."
  - "Keep bounce rate under 3%. Above 5% you are actively damaging the domain every time you send."
  - "A small list of well-chosen contacts outperforms a large one on every metric that matters, including the ones you are not measuring."
prerequisites:
  - label: "Why your emails land in spam"
    href: "/repmail/learn/deliverability/why-your-emails-land-in-spam"
  - label: "Hard vs soft bounces"
    href: "/repmail/learn/deliverability/hard-vs-soft-bounces"
commonMistakes:
  - "Buying a list and assuming verification makes it safe. Verification confirms an address accepts mail; it says nothing about whether that person wants to hear from you."
  - "Verifying once and reusing the list for months. B2B addresses decay at roughly 2 to 3 percent a month as people change jobs."
  - "Treating catch-all domains as valid. A catch-all accepts everything, including addresses that reach nobody."
  - "Scraping role addresses — info@, sales@, support@ — which convert poorly and are disproportionately likely to be spam traps."
  - "Uploading the raw export without checking formatting, so the first campaign bounces on data problems rather than bad addresses."
faqs:
  - question: "Can I just buy a list?"
    answer: "You can, and it is the most reliable way to damage a new sending domain. Purchased lists carry stale addresses, role accounts and spam traps, and they produce complaint rates far above what a domain can absorb. They also transfer no compliance comfort: the obligation to have a lawful basis stays with you regardless of what the vendor asserts."
  - question: "How accurate is email verification?"
    answer: "Good verification reliably catches syntax errors, dead domains, and mailboxes that do not exist. It is much weaker on catch-all domains, which accept mail for any address and therefore cannot be probed. Expect a verified list to still contain some unusable addresses, and treat verification as risk reduction rather than a guarantee."
  - question: "What bounce rate is acceptable?"
    answer: "Under 3% is healthy, and under 1% is what a well-maintained list looks like. Above 5% you are in the range where mailbox providers begin throttling and filtering, and for a new domain with no history, sustained bounces at that level will end the domain's usefulness quickly."
  - question: "How often should I re-verify?"
    answer: "Before every significant campaign if the list is more than a month old. B2B contact data decays continuously as people change roles and companies, and an address that verified cleanly in March may be a hard bounce by June."
  - question: "Is a smaller list really better?"
    answer: "Yes, and not only for deliverability. A list narrow enough that you can say something specific to each recipient produces higher reply rates, fewer complaints, and better data about what is working. Volume is the easiest lever to pull and almost always the wrong one."
nextStep:
  label: "Next: format the file so it imports cleanly"
  href: "/repmail/learn/cold-email/csv-formatting-for-email-lists"
  description: "A verified list still fails at import if the file is wrong. This is the short version of what to fix."
assets:
  - type: checklist
    title: Before a list is ready to send to
    content:
      - "Every contact matches a defined ideal customer profile, not just an industry filter."
      - "Role addresses (info@, sales@, admin@, support@) have been removed."
      - "The list has been run through verification within the last 30 days."
      - "Hard bounces and unknown-user results have been removed, not just flagged."
      - "Catch-all domains are marked and treated as higher risk."
      - "Duplicates have been removed across the whole list, not just within the newest import."
      - "Anyone who previously unsubscribed or complained is excluded."
      - "You can state where each contact came from and why you may contact them."
      - "The first send is a small sample, not the entire list."
  - type: table
    title: What each source actually gives you
    content:
      headers: ["Source", "Data quality", "Main risk"]
      rows:
        - ["Manual research from company sites", "Highest", "Slow — but the reply rate usually justifies it"]
        - ["LinkedIn / Sales Navigator research", "High", "Requires a separate step to find and verify the address"]
        - ["Reputable B2B data provider", "Moderate", "Staleness; always re-verify before sending"]
        - ["Conference and event lists", "Moderate", "Relevance decays fast; consent is often unclear"]
        - ["Scraped from the open web", "Low", "Role addresses and spam traps"]
        - ["Purchased list", "Lowest", "Traps, complaints, and no defensible provenance"]
---

Every deliverability problem that is not an authentication problem is usually a list problem. That is not a slogan — it follows from how filtering works. Bounces, complaints and lack of engagement are the three strongest negative signals a sender can generate, and all three are decided by who is on your list long before anyone reads your copy.

This is also the part of outbound that is easiest to do badly quickly, because buying a hundred thousand addresses takes ten minutes and building a hundred good ones takes an afternoon.

## Build for a profile, not a volume target

The instinct when starting outbound is to ask how many contacts are needed. It is the wrong first question, because it makes size the goal and everything else a constraint.

The better first question is who, specifically. A definition tight enough to be useful names the kind of company (size, sector, stage), the role of the person, and — most importantly — the situation that makes your product relevant to them right now. "Heads of sales at B2B SaaS companies" is a filter. "Heads of sales at 20–50 person B2B SaaS companies who have just posted two SDR roles" is a profile, because the last clause tells you what to say.

That specificity is what makes a small list outperform a large one. If you cannot say something to a contact that you could not equally have said to any of the other four thousand, the message will read as a broadcast, and it will be treated as one.

## Where the addresses come from

The table above ranks the common sources. The ranking is deliberate and it correlates almost perfectly with how much human judgement went into each contact.

Manual research — visiting the company site, identifying the right person, finding or deducing the address — produces the best data and the best reply rates, and it does not scale. That is fine. It is the correct way to build the first few hundred contacts, and the results tell you whether the profile is right before you spend money scaling it.

Reputable data providers are a reasonable middle path once the profile is proven, with one non-negotiable condition: **re-verify everything before sending.** Provider data is a snapshot, and B2B contact data decays at roughly two to three percent a month as people move roles. A list that was accurate when it was assembled may be materially stale by the time you use it.

Purchased lists sit at the bottom for reasons worth stating plainly. They contain addresses harvested without context, a high proportion of role accounts, and — the expensive part — spam traps: addresses that exist solely to catch senders who did not obtain their list legitimately. Hitting one is a direct signal to the provider that your list is not clean, and the reputational damage is disproportionate to the volume sent.

## What verification does and does not do

Verification checks whether an address can receive mail. A good verifier confirms the syntax is valid, the domain exists and has mail servers, and — where the receiving server permits it — that the specific mailbox exists.

Two limits matter in practice.

**Catch-all domains** accept mail addressed to anything, which means a verifier cannot distinguish a real mailbox from an invented one. Many corporate domains are configured this way. A "valid" result on a catch-all domain means "we could not prove this is bad", not "this is good". Mark them, treat them as higher risk, and do not let them dominate a campaign.

**Verification is not qualification.** An address that provably exists still belongs to a person who may have no use for what you sell. Verification protects the domain from bounces; it does nothing about complaints, and complaints come from relevance rather than validity. Teams who verify diligently and target carelessly end up with a clean bounce rate and a rising complaint rate, which is the worse of the two problems.

## What a bounce actually costs

It helps to understand why the 3% threshold is treated so seriously.

A bounce tells the receiving provider that you sent mail to an address that does not exist. One is noise. A consistent pattern is evidence about how you obtained your list, because senders with legitimately-sourced, well-maintained lists do not repeatedly write to people who are not there.

Below 3%, that evidence is ambiguous and mostly ignored. Above 5%, it stops being ambiguous. And on a domain with no established history, the ratio is evaluated with far less tolerance, because there is no track record to weigh it against. This is why the same bounce rate that a mature domain absorbs can end a new one.

The practical protection is a small first send. Take a sample of a few dozen from any new list, send to those, and read the result before committing the rest. A 12% bounce rate on 50 contacts is a cheap and recoverable lesson. The same rate discovered on 5,000 is not.

RepMail checks every address against your workspace suppression list at send time, so anyone who has previously bounced, unsubscribed or complained is excluded automatically — including on lists imported later, which is where the mistake usually recurs. Bounces and complaints from AWS SES telemetry are suppressed as they arrive rather than needing a manual cleanup pass, and per-email deduction means a campaign to a partly-bad list stops costing you credits for messages that were never going to arrive. What no platform can do is decide who belongs on the list; that judgement, and the reply rate that follows from it, stays yours.
