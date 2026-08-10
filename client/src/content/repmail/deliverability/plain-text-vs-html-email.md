---
contentType: knowledge-base
slug: plain-text-vs-html-email
title: Plain Text vs HTML Email for Cold Outreach
description: "Plain text wins for cold email, but not for the reason usually given. What matters is looking like a person wrote it, and how many links you include."
authorSlug: repmail-team
publishedAt: "2026-08-10"
tags: ["deliverability", "cold-email", "content", "spam-filters"]
keyTakeaways:
  - "Filters do not penalise HTML itself. They penalise the pattern HTML usually signals: a bulk broadcast rather than a personal message."
  - "One link is safe, two is usually fine, and beyond that you are trading reply rate for very little."
  - "Tracking pixels and link wrapping introduce a third-party domain into your message, which is a real and often overlooked cost."
  - "The best test is whether the message looks like something a colleague would send. If it does not, no amount of tuning fixes it."
prerequisites:
  - label: "Why emails land in spam"
    href: "/repmail/learn/deliverability/why-your-emails-land-in-spam"
  - label: "Why mail lands in Promotions"
    href: "/repmail/learn/deliverability/why-emails-land-in-promotions"
commonMistakes:
  - "Sending a designed template with a logo header and a button to a cold prospect, then wondering why it sorted into Promotions."
  - "Adding a tracking pixel to a cold campaign by default, without deciding whether the open data is worth the deliverability cost."
  - "Stripping all formatting into an unreadable wall of text, on the assumption that plain means unstructured."
  - "Including a signature block with four social icons, a banner image and a legal footer on a first-touch email."
faqs:
  - question: "Do spam filters actually penalise HTML?"
    answer: "Not directly. There is no rule that says HTML is spam. What filters weigh is the combination of signals HTML usually brings with it — heavy image-to-text ratios, multiple tracking domains, template markup identical across thousands of recipients — and those correlate strongly with bulk broadcast. A simple HTML message with one link and real text is not penalised for being HTML."
  - question: "How many links can I include?"
    answer: "For a first-touch cold email, one is the safe answer and zero is defensible. Each additional link adds a little filtering risk and, more importantly, splits the reader's attention. The limiting factor is usually persuasion rather than deliverability: a message asking for one thing outperforms one offering three."
  - question: "Should I use a tracking pixel?"
    answer: "Increasingly, no. Open tracking has become unreliable because privacy features pre-fetch images and inflate open counts, and the pixel loads from a domain that is not yours, which is a signal filters notice. If open rate is not driving a real decision, the data is not worth the cost."
  - question: "What about my email signature?"
    answer: "Keep it to text: name, role, company, and a link to the site if you want one. Image-based signatures, social icons and banners add weight and third-party requests to a message that is supposed to read as a personal note."
nextStep:
  label: "Next: the words that trip filters"
  href: "/repmail/learn/deliverability/spam-trigger-words"
  description: "Format is one half of content risk. Vocabulary is the other, and it is more nuanced than the word lists suggest."
assets:
  - type: table
    title: What each format signals to a filter
    content:
      headers: ["Element", "What the receiver infers", "Recommendation for cold email"]
      rows:
        - ["Plain text, one link", "A person writing to a person", "The default. Hardest format to get wrong"]
        - ["Light HTML, no images", "A person using a mail client with formatting", "Fine. Bold and paragraphs are not a risk"]
        - ["Template with logo header", "A marketing broadcast", "Avoid on first touch. Belongs in newsletters"]
        - ["Image-heavy, little text", "A promotional mailing, possibly evading text analysis", "Avoid entirely"]
        - ["Tracking pixel", "A third-party domain observing the recipient", "Omit unless the data drives a real decision"]
        - ["Wrapped/redirect links", "The visible destination is not the real one", "Avoid on cold mail. It is a phishing pattern"]
        - ["Four or more links", "A promotional message", "Cut to one. Reply rate improves as well"]
---

The advice that plain text beats HTML for cold email is correct, and the reason usually given for it is wrong. There is no rule in any filter that says "HTML is spam". Plenty of HTML mail reaches the inbox every second of the day.

What filters actually evaluate is whether your message resembles a personal note or a bulk broadcast. HTML correlates with broadcast because that is overwhelmingly what it is used for — but it is the correlation being measured, not the markup. Understanding that distinction is what lets you make sensible decisions instead of following a rule you cannot reason about.

## What "looks like broadcast" actually means

A designed template carries a cluster of signals that arrive together: a logo image at the top, a coloured call-to-action button, a multi-column layout, a tracking pixel, wrapped links pointing at a redirect domain, a footer with social icons and legal text. Every one of those is normal and appropriate in a newsletter, where the recipient subscribed and expects a publication.

On a first-touch cold email, that same cluster is telling the receiving filter something specific: this message was produced by a system, sent to many people at once, and instrumented to measure them. None of those facts is illegal or even undesirable in itself. All of them push a message toward Promotions or spam, because the recipient did not ask for a publication — and, more to the point, because a real person reaching out to another real person does not send a message that looks like that.

The useful test is not "is this HTML?" It is: **would a colleague sending me this same message have formatted it this way?** If a person asking you for fifteen minutes would not put a logo banner above their opening line, then a logo banner above your opening line is not helping.

This also explains why light HTML is fine. A message with a bold phrase, ordinary paragraphs and a single inline link is exactly what a person writing from Outlook or Gmail produces. It carries none of the broadcast cluster. Formatting is not the problem; production values are.

## Links: one is plenty

Link count is the single most controllable content variable, and it is worth being disciplined about.

Each link you add does two things. It adds a small amount of filtering risk, particularly if the destination domain is not your sending domain, is a shortener, or is a redirect. And it splits the reader's attention, which costs you far more than the filtering risk does.

For a first-touch cold email, one link is a safe ceiling and zero is entirely defensible — asking a question that invites a reply often outperforms offering something to click. Two is usually fine if both are genuinely relevant. Beyond that you have written a landing page in an inbox, and the reply rate falls faster than the deliverability does.

Link shorteners deserve a specific warning. They hide the real destination, they are heavily used in phishing, and they put a domain with a shared and volatile reputation into your message. Whatever the tracking convenience, it is not worth it on cold mail. Link to the real destination.

## The tracking pixel question

Open tracking works by embedding a tiny image hosted on a tracking domain. When the mail client loads that image, the sender learns the message was opened.

Two things have changed this calculation. The first is accuracy: privacy protections in major mail clients pre-fetch images automatically, which registers an "open" whether or not a human ever looked at the message. Open rates measured this way are inflated by an unknown and non-constant amount, which makes them useless for comparing campaigns and actively misleading for judging list quality.

The second is cost. That pixel is a request to a third-party domain, embedded in a message claiming to be a personal note. It is a signal, and it is one you are paying for with degraded data.

The honest question is whether the number changes any decision you make. If you would not do anything differently at a 30% open rate versus 45%, the tracking is costing you something and buying you nothing. Reply rate is measurable without any of this, is not inflated by machines, and is a far better proxy for whether the campaign is working.

## Structure without decoration

Stripping out design does not mean stripping out structure, and this is where people over-correct. A wall of undifferentiated text is harder to read than a well-formatted message and will not perform better simply because it contains no markup.

What good plain-text cold email looks like is short paragraphs, mostly two or three lines. One idea per paragraph. A specific, concrete opening that could not have been sent to anyone else. A single clear ask at the end, phrased as a question. A signature that is a few lines of text and nothing else.

That structure is readable on a phone, carries no third-party requests, contains no image-to-text ratio to evaluate, and reads exactly like what it is supposed to be. It is also the hardest format in which to hide a weak message — which is a feature, because if the message only works when it is dressed up, the message is the problem.

RepMail sends plain-text campaigns with an HTML version generated from the same content, so the message reads correctly in every client without you assembling a template. Open tracking is not applied to campaigns by default, and unsubscribe is handled through the standard headers rather than a footer image — which means a first-touch email carries no third-party requests unless you deliberately add one.
