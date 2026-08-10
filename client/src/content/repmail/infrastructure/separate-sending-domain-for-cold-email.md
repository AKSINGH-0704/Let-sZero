---
contentType: knowledge-base
slug: separate-sending-domain-for-cold-email
title: Do You Need a Separate Domain for Cold Email?
description: "Sending outreach from your main domain risks the address your customers reply to. Here is when to separate, and how many domains you actually need."
authorSlug: repmail-team
publishedAt: "2026-08-10"
tags: ["infrastructure", "deliverability", "domains", "sender-reputation"]
keyTakeaways:
  - "Yes, separate it. The point is not deliverability — it is that a damaged primary domain also breaks your invoices, password resets and support replies."
  - "Use a lookalike domain you own, not a subdomain. Receivers group subdomains with the parent, so a subdomain shares the risk it was meant to contain."
  - "Most teams need one or two sending domains, not ten. Domain count is a consequence of volume, never a substitute for warm-up."
  - "Every additional domain is another identity to warm up, authenticate and monitor. They are not free."
prerequisites:
  - label: "Why new domains need warm-up"
    href: "/repmail/learn/deliverability/why-new-domains-need-warm-up"
  - label: "Verifying a sending domain"
    href: "/repmail/learn/deliverability/verify-your-sending-domain"
commonMistakes:
  - "Using a subdomain of the primary domain for outreach. Receivers aggregate reputation across the organisational domain, so the isolation is largely imaginary."
  - "Buying a batch of domains to multiply volume without warming any of them, which produces several bad reputations instead of one good one."
  - "Choosing a sending domain that looks like a phishing attempt — hyphens, unusual TLDs, or a name only loosely related to the company."
  - "Registering the sending domain and sending from it the same week, with no age and no history."
faqs:
  - question: "Can I just use a subdomain like mail.mycompany.com?"
    answer: "You can, and it is better than nothing, but the isolation is weaker than most people expect. Receivers aggregate reputation at the organisational domain level, so serious damage on a subdomain can still affect the parent. A subdomain is reasonable for transactional mail you control tightly; for cold outreach, a separate registered domain is the safer structure."
  - question: "How many sending domains do I need?"
    answer: "Fewer than the internet suggests. Domain count should follow from volume: if one warmed domain comfortably carries your daily send, you need one. Adding domains is a way to distribute volume you have already proven you can send responsibly, not a way to send more than your reputation supports."
  - question: "Does a separate domain hurt reply rates? Recipients see an unfamiliar address."
    answer: "Slightly, and it is worth managing rather than ignoring. Choose a domain that is obviously connected to your company, put a real website on it, and keep the human's name in the From field. The trust cost of a close variant is small; the cost of your primary domain being blocked is not."
  - question: "Should each salesperson have their own domain?"
    answer: "Almost never. That pattern exists to evade volume limits, it looks exactly like what it is to a filter, and it multiplies the number of identities you must warm and monitor. Distribute across mailboxes on a small number of well-warmed domains instead."
nextStep:
  label: "Next: how the DNS records fit together"
  href: "/repmail/learn/infrastructure/dns-records-for-email"
  description: "Once you have chosen the domain, these are the records that make mail from it verifiable."
assets:
  - type: table
    title: What each option actually isolates
    content:
      headers: ["Option", "Isolates reputation?", "Best for"]
      rows:
        - ["Primary domain (company.com)", "No isolation at all", "Transactional mail and replies only — never cold volume"]
        - ["Subdomain (mail.company.com)", "Partial — receivers group it with the parent", "Product and transactional mail under your own control"]
        - ["Lookalike domain (getcompany.com)", "Yes, cleanly separated", "Cold outreach at any meaningful volume"]
        - ["Several lookalike domains", "Yes, and distributes volume", "Established programmes whose volume exceeds one warmed domain"]
        - ["Many disposable domains", "Yes, and looks like abuse", "Nothing legitimate — this is the pattern filters hunt for"]
---

The case for sending cold outreach from a separate domain is usually made in terms of deliverability, and that framing undersells it. The strongest argument has nothing to do with inbox placement.

Your primary domain carries your invoices. It carries password resets, contract notifications, support replies, and the address every existing customer uses to reach you. If a cold campaign damages that domain's reputation badly enough, the failure is not that your outreach stops working. It is that a customer does not receive their receipt, a prospect never gets the proposal they asked for, and a colleague's reply to a live deal lands in a spam folder.

Cold outreach is the highest-variance mail any company sends. It goes to people who did not ask for it, from a list you cannot fully verify, and some proportion of recipients will mark it as spam no matter how careful you are. Running that traffic through the same domain as your billing is a decision to put your most critical mail behind your least predictable mail.

## Why a subdomain is weaker than it looks

The obvious compromise is a subdomain: keep `company.com` for real business, send outreach from `mail.company.com`. It feels like isolation with none of the overhead of a new domain.

It is not, quite. Receivers evaluate reputation at the **organisational domain** level as well as the exact hostname. Sustained abuse from a subdomain can and does affect how the parent domain is treated, because the alternative — letting anyone insulate a domain by inventing a new label in front of it — would make subdomains a trivial evasion route. Filters closed that door a long time ago.

A subdomain is a perfectly reasonable structure for transactional mail, product notifications, or anything you control tightly and send predictably. For cold outreach, where the entire point of separation is to contain a risk you cannot fully control, it provides less containment than the diagram suggests.

A separately registered domain is genuinely separate. That is what you are paying the registration fee for.

## Choosing a domain that does not look suspicious

A separate sending domain only helps if it reads as legitimate. Receivers are actively suspicious of newly-registered domains that resemble established ones, because that is precisely the shape of a phishing attempt.

A few things reliably help. Choose a name obviously connected to your company — `getacme.com`, `acmehq.com`, `try-acme.com` are all fine; a string of hyphens or an unusual TLD is not. Put a real website at it, even a single page that explains who you are and links to the main site, so anyone who checks finds a company rather than a parked domain. Register it well before you need it: domain age is a genuine input, and a domain that has existed for three months when you start sending is treated differently from one registered on Tuesday.

Then warm it. A separate domain does not inherit your primary domain's reputation, which is the entire point, and it also means it starts with nothing. Every argument for gradual ramping applies to it in full.

## How many domains you actually need

This is where advice online goes badly wrong. There is a widely-repeated pattern of buying ten domains, attaching several mailboxes to each, and rotating sends across all of them to reach a volume no single domain could support.

The logic is backwards. Domains do not create sending capacity; **reputation** creates sending capacity, and reputation is earned per domain, slowly. Spreading a volume you have not earned across ten cold domains does not give you ten times the headroom. It gives you ten domains with no history, each sending unfamiliar mail to strangers, in a coordinated pattern that looks exactly like the abuse this technique was invented to disguise.

The defensible reason to run more than one sending domain is that your volume has genuinely outgrown what one warmed domain carries comfortably, and you want to distribute load across identities you have each warmed properly. That is a consequence of scale, arrived at after the fact. It is not a shortcut to scale.

For most teams the honest answer is one sending domain, warmed properly, doing all the work — with a second added later if and when volume demands it. Every additional domain is another identity to authenticate, warm, monitor and eventually explain to somebody. They are not free, and the cost is ongoing.

## A practical setup

A structure that works for the large majority of outbound programmes looks like this. Keep the primary domain for everything that matters and never send cold volume from it. Register one lookalike domain, put a real page on it, and publish SPF, DKIM and DMARC for it exactly as you would for the primary. Warm it gradually over several weeks before it carries a real campaign. Watch its bounce and complaint rates as its own numbers, separate from anything else you send.

If that domain reaches its comfortable ceiling and the programme is still growing, add a second and repeat the process. If it does not, you are done — and you have one identity to look after instead of ten.

RepMail registers and verifies your sending domain through AWS SES, publishes the authentication records for it, and applies a progressive daily ramp to a new sender automatically rather than leaving warm-up as something you have to remember. Because the entitlement and the domain are workspace-level, adding teammates does not quietly multiply the number of identities sending against that one domain's reputation.
