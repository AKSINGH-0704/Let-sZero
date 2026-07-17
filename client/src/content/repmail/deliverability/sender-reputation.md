---
contentType: knowledge-base
slug: sender-reputation
title: What Is Sender Reputation, and How Do You Build It?
description: "Sender reputation is the trust score receiving servers assign your domain and IP. Here is what shapes it, and how to build it deliberately."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["sender-reputation", "deliverability", "authentication", "warmup"]
featured: true
keyTakeaways:
  - "Sender reputation is a trust score receiving mail servers keep on your domain and sending IP, rebuilt continuously from how you send."
  - "It is set by four things: authentication, sending consistency, list quality, and recipient engagement."
  - "Reputation is earned slowly and lost quickly. One bad send to a stale list can undo weeks of careful warm-up."
prerequisites:
  - label: "How email authentication works"
    href: "/repmail/learn/deliverability/email-authentication"
commonMistakes:
  - "Blasting a cold domain at full volume on day one, before any reputation exists to protect."
  - "Judging reputation by your open rate alone. Opens are the last signal to move and the easiest to misread."
  - "Sharing an IP pool with unknown senders, so their bad behavior drags your placement down."
faqs:
  - question: "Is sender reputation tied to my domain or my IP address?"
    answer: "Both, and they are tracked separately. Domain reputation follows your sending domain everywhere. IP reputation is tied to the address your mail leaves from. On shared infrastructure you inherit the IP's history; on a dedicated setup you build it yourself."
  - question: "How long does it take to build a good sender reputation?"
    answer: "A new domain needs two to four weeks of gradual warm-up to establish a baseline, and reputation keeps compounding for months after. There is no way to buy your way past the ramp, because reputation is a record of behavior over time."
  - question: "Can a damaged sender reputation be repaired?"
    answer: "Usually, if the cause is fixed first. Clean the list, correct authentication, slow the sending pace, and rebuild engagement. A domain that has been blacklisted or has a very high complaint history is sometimes faster to retire than to rehabilitate."
nextStep:
  label: "How email authentication works"
  href: "/repmail/learn/deliverability/email-authentication"
  description: "Authentication is the first pillar of reputation, and the one most senders get wrong."
assets:
  - type: table
    title: The four inputs to sender reputation
    content:
      headers: ["Input", "What receivers measure", "How to strengthen it"]
      rows:
        - ["Authentication", "Whether SPF, DKIM, and DMARC prove you are allowed to send", "Publish all three correctly before your first send"]
        - ["Sending pattern", "Volume, consistency, and how fast you ramp", "Warm up gradually and keep daily volume steady"]
        - ["List quality", "Bounce rate, spam-trap hits, invalid addresses", "Verify addresses and remove stale contacts"]
        - ["Engagement", "Opens, replies, and complaints from real recipients", "Send relevant mail to people likely to want it"]
---

Every message you send is scored before it is shown to anyone. Receiving servers at Google, Microsoft, and everywhere else keep a running record of how your domain and sending IP behave, and they use that record to decide whether your next message reaches the inbox, the spam folder, or nowhere at all. That record is your sender reputation.

It is not a number you can look up in one place. It is a composite that each mailbox provider computes its own way, from signals they largely keep private. But the inputs are well understood, and all four are within your control.

## The four things that build it

**Authentication** comes first, because without it a receiving server cannot even confirm the mail is really from you. SPF, DKIM, and DMARC are the proof, and a domain missing any one of them starts every send at a disadvantage.

**Your sending pattern** is the shape of your traffic over time. A brand-new domain that suddenly sends thousands of messages looks exactly like a compromised account or a spam operation. Reputation rewards senders who start small, raise volume gradually, and keep a consistent daily rhythm.

**List quality** is what your bounces and trap hits reveal. Mail to invalid addresses, recycled spam traps, or long-dead contacts tells receivers your list is not clean, and a dirty list is the single fastest way to damage a domain.

**Engagement** is the human verdict. When recipients open, reply, and do not mark you as spam, receivers read that as evidence you send wanted mail. When they delete on sight or complain, reputation falls, no matter how clean your technical setup is.

## Why it is easy to lose

Reputation is asymmetric. It is built slowly, over weeks of disciplined sending, and it can be spent in a single afternoon. One campaign to a purchased list, one spike past your normal volume, one run of messages to addresses that no longer exist, and receivers revise their estimate downward faster than any warm-up raised it. This is why a domain that performed well last month can suddenly land in spam this week.

The practical consequence is that reputation is not a setup step you finish. It is an operating discipline you keep.

## Where RepMail fits

RepMail is built so that the four inputs are protected by default rather than left to manual vigilance. Domain verification walks you through publishing SPF, DKIM, and a return-path record correctly, so authentication is solid before the first send. Delivery runs on AWS SES infrastructure rather than a wrapper around a personal mailbox, so you are not sharing reputation with unknown senders. And because bounce and complaint signals arrive in real time through AWS SNS webhooks, RepMail suppresses failing addresses the moment they fail, before a bad list can pull your reputation down. The point is not to replace the discipline, but to make the disciplined path the default one.
