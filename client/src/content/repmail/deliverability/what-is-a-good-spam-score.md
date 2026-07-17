---
contentType: knowledge-base
slug: what-is-a-good-spam-score
title: What Is a Good Spam Score for Cold Email?
description: "Spam scores from SpamAssassin, Microsoft SCL, and provider filters decide placement. Here are the target numbers and what actually moves them."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["spam-score", "deliverability", "spamassassin", "inbox-placement"]
featured: true
keyTakeaways:
  - "SpamAssassin flags anything at 5.0 or above as spam, so a good target is below 3.0, and ideally under 1.0."
  - "There is no single universal score. SpamAssassin, Microsoft's SCL, and Google's own filters each score differently, but the levers overlap."
  - "Most points come from authentication gaps and content signals, not from a single banned word."
prerequisites:
  - label: "How email authentication works"
    href: "/repmail/learn/deliverability/email-authentication"
commonMistakes:
  - "Chasing a perfect 0.0 score by stripping the email down to nothing, which hurts the message more than the score helps."
  - "Testing the score once and assuming it holds. Reputation and content both drift, so the score has to be checked per template."
  - "Treating the score as the goal instead of a proxy. A low score with a dead list still will not reach the inbox."
faqs:
  - question: "What spam score should I aim for?"
    answer: "On SpamAssassin's scale, stay well below the 5.0 spam threshold. Under 3.0 is safe and under 1.0 is excellent. Microsoft's SCL runs 0 to 9, where 5 and above routes to junk, so aim for the low end there too."
  - question: "Why does my score change between tests?"
    answer: "Because the score blends fixed content rules with signals that move, like authentication results and, on some tools, sender reputation. Change the copy, the sending domain, or the DNS setup and the score moves with it."
  - question: "Can a good spam score still land me in spam?"
    answer: "Yes. The score measures the message. It cannot see that your list is stale, your domain is new, or your recipients tend to complain. A clean score removes one reason to filter you; it does not guarantee placement."
nextStep:
  label: "How to check your spam score before sending"
  href: "/repmail/learn/deliverability/check-spam-score-before-sending"
  description: "Knowing the target is step one. Testing against it before every send is step two."
assets:
  - type: table
    title: Spam score targets by system
    content:
      headers: ["System", "Scale", "Spam threshold", "Aim for"]
      rows:
        - ["SpamAssassin", "Points, higher is worse", "5.0 and above", "Below 3.0"]
        - ["Microsoft SCL", "0 to 9", "5 and above routes to junk", "0 to 3"]
        - ["Gmail filters", "Not exposed as a number", "Behavioral, not fixed", "Clean auth + real engagement"]
---

A spam score is a filter's numeric estimate of how much your message looks like spam. The most widely used is SpamAssassin, which adds up points for individual risk signals and flags anything scoring 5.0 or higher as spam. Lower is better. On that scale, a good cold email score sits comfortably below 3.0, and under 1.0 is excellent.

But there is no single score every mailbox agrees on. SpamAssassin is one engine. Microsoft's Exchange Online Protection assigns a Spam Confidence Level, or SCL, from 0 to 9, where roughly 5 and above is routed to junk. Google does not expose a number at all; its filters weigh authentication, reputation, and content behaviorally. What is useful is that the signals that raise a score are largely the same across all of them, so improving one usually improves the others.

## What actually moves the number

Most senders imagine a spam score is driven by forbidden words. In practice, the largest, most reliable contributions come from two places.

The first is **authentication**. A missing or failing SPF, DKIM, or DMARC check adds points directly and heavily, because unauthenticated mail is the strongest single signal of spam. Fixing authentication often drops a score more than any content edit.

The second is **content structure**: a heavily HTML message with little text, links whose visible text does not match their destination, tracking-pixel clutter, and copy that reads like a mass promotion. Modern filters at Google and Microsoft also compare your message against the shape of known bulk mail, so a template blasted identically to thousands of people scores worse than the same words personalized per recipient.

A single trigger word rarely tips a message into spam by itself. It is the accumulation, weak authentication plus a bloated template plus mismatched links, that pushes the total past the threshold.

## Do not over-optimize

Chasing a perfect zero is a trap. Strip an email down until it scores 0.0 and you often strip out the parts that made it worth reading. The goal is a comfortable margin below the threshold, not a mathematically pristine message, and the score is only ever a proxy. A flawless score sent to a dead list, from a cold domain, still will not reach the inbox.

## Where RepMail fits

RepMail's Spam Analysis runs a pre-send check on every template using GPT-4o, scoring the copy, weighing the HTML-to-text balance, and flagging high-risk phrasing and formatting before you transmit anything. Where a template shows structural similarity to a mass blast, RepMail's AI Personalization rewrites the sentence structure per recipient, which lowers the score for the reason that matters, the message stops looking mass-produced, rather than by deleting words at random. You see the placement risk in the dashboard before the send, not after your open rate collapses.
