---
contentType: guide
slug: spam-trigger-words
title: Spam Trigger Words to Avoid in Cold Email
description: "Modern filters read intent, not a banned-word list, but whole categories of phrasing still skew your score toward spam. Here are the ones to cut."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["spam-score", "deliverability", "cold-email", "inbox-placement"]
prerequisites:
  - label: "What a good spam score is"
    href: "/repmail/learn/deliverability/what-is-a-good-spam-score"
commonMistakes:
  - "Disguising a trigger word as F.R.E.E or 100%25 off. AI filters normalize the characters and penalize the evasion."
  - "Rotating single words with spintax while the paragraph structure stays identical, which filters still recognize as one mass template."
  - "Treating the list as absolute. Context decides; one word rarely sinks a message, but a pile-up of urgency and hype does."
faqs:
  - question: "Do individual spam words still get me filtered?"
    answer: "Rarely on their own. Modern filters at Google and Microsoft read the whole message for intent, so a single word in an otherwise genuine email is usually fine. The risk is concentration: several urgency, money, and hype phrases together shift your score meaningfully toward spam."
  - question: "Does spacing out or misspelling a trigger word help?"
    answer: "No, it hurts. Text vectorization normalizes F.R.E.E, C-l-i-c-k, and similar tricks back to their root meaning, then counts the obfuscation attempt against you. Writing the word plainly, or not at all, is safer than disguising it."
  - question: "If filters read context, why avoid these words at all?"
    answer: "Because they are the vocabulary of phishing and mass promotion, and legitimate one-to-one business email rarely needs them. Cutting them lowers your score and, just as importantly, makes the message read like a real person wrote it."
nextStep:
  label: "Check your score before you send"
  href: "/repmail/learn/deliverability/check-spam-score-before-sending"
  description: "Cutting trigger words is one input. A pre-send check confirms the whole message is under the threshold."
assets:
  - type: table
    title: High-risk phrasing by category
    content:
      headers: ["Category", "Examples to avoid", "Why it flags"]
      rows:
        - ["Urgency & scarcity", "Act now, Offer expires, Now or never, Urgent response needed", "Mirrors phishing that rushes recipients past judgment"]
        - ["Financial promises", "Free, 100% free, Guaranteed profit, Cash bonus, Financial freedom", "Reads as a get-rich-quick scheme"]
        - ["Marketing hype", "Amazing, Best choice, Risk-free, Winner, Click here, 50% off", "The vocabulary of mass promotion, not personal mail"]
  - type: checklist
    title: A cleaner first-touch email
    content:
      - "No urgency or countdown language (act now, expires, last chance)"
      - "No money or guarantee claims (free, guaranteed, risk-free, cash)"
      - "No hype adjectives (amazing, incredible, best, unlimited)"
      - "One plain link at most, with text that matches its destination"
      - "Written as one message to one person, not a broadcast"
---

The idea that spam filters keep a forbidden-word list, and that scrubbing those words makes you safe, is a decade out of date. Google Workspace and Microsoft 365 now read the full context and intent of a message, so a single word almost never decides its fate. What still matters is concentration and category. Certain kinds of phrasing, the language of phishing and mass promotion, reliably skew a message's score toward spam when they stack up, because legitimate one-to-one business email simply does not talk that way.

## The three categories that carry the most risk

**High-pressure urgency and scarcity.** Filters weigh this heavily because phishing depends on it, rushing a recipient to act before they think. "Act now," "offer expires," "now or never," "urgent response needed": legitimate outreach rarely needs to shout a deadline at a stranger.

**Financial and get-rich-quick promises.** Claims about money and risk removal are the strongest single category. "Free" and "100% free" are the highest-risk markers across corporate gateways, followed by "guaranteed profit," "financial freedom," "cash bonus," and their relatives. They pattern-match directly to schemes filters are built to stop.

**Marketing hype and clickbait.** The broadcast vocabulary, "amazing," "best choice," "risk-free," "winner," "50% off," and the classic "click here", tells a filter it is reading a mass promotion rather than a personal note.

## Why the old evasion tricks backfire

Spacing a word out as F.R.E.E, swapping letters for numbers as S3LL N0W, or misspelling on purpose used to slip past keyword matching. It does the opposite now. Text vectorization normalizes those characters back to their meaning, recognizes the deliberate obfuscation, and penalizes the attempt itself. Mechanical spintax has the same weakness: rotating "Hello" for "Hi" while every sentence keeps the same structure does not change the shape a filter sees, and it still reads the message as one mass-produced template.

## The real fix is voice, not a find-and-replace

The reliable move is to write like a person writing one message. Cut the urgency, drop the money claims, lose the hype adjectives, and the trigger words mostly disappear on their own, because you no longer need them. What is left reads as correspondence, which is exactly what earns the inbox.

## Where RepMail fits

RepMail's Spam Analysis scans each template with GPT-4o for precisely this phrasing, urgency, financial promises, hype, and excessive punctuation, and surfaces the risk before you send rather than after your open rate drops. When the copy leans mass-produced, AI Personalization rewrites the underlying sentence structure per recipient, so you are not left manually hunting for words. The result is outreach that clears the filter because it genuinely reads as one-to-one, not because you played whack-a-mole with a banned list.
