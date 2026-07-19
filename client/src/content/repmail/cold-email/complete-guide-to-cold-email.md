---
contentType: guide
slug: complete-guide-to-cold-email
title: "The Complete Guide to Cold Email"
description: "The pillar guide to cold email: deliverability, writing, personalization, follow-up, and tooling, with links to every detailed subtopic in one place."
authorSlug: repmail-team
publishedAt: "2026-07-17"
updatedAt: "2026-07-17"
tags: ["cold-email", "deliverability", "inbox-placement", "cold-email-software"]
featured: true
heroDiagram: workflow-split
keyTakeaways:
  - "Cold email has two halves: getting delivered, and getting a reply. Most senders obsess over the second and lose on the first."
  - "This guide maps the whole discipline and links to the in-depth page for each part rather than repeating them."
  - "Sequence matters: get the domain and deliverability right before you optimize a single subject line."
prerequisites:
  - label: "Where RepMail fits in your workflow"
    href: "/repmail/learn/cold-email/where-repmail-fits-in-your-workflow"
faqs:
  - question: "What is cold email?"
    answer: "Cold email is sending a personalized, one-to-one message to a prospect who has not opted in, usually for sales or partnerships. Done well it is targeted and relevant; done badly it is spam. The craft is being relevant enough to earn a reply while technically clean enough to reach the inbox."
  - question: "Why do my cold emails go to spam?"
    answer: "Almost always an authentication or reputation problem, not your copy. A new domain without SPF, DKIM, and DMARC, sent at too high a volume, to an unverified list, lands in spam regardless of how good the writing is. Fix deliverability first; the linked guides cover exactly how."
  - question: "How do I write a cold email that gets replies?"
    answer: "Keep it short and specific to the recipient, lead with a relevant reason for reaching out, make one clear ask, and follow up a few times. The subject line earns the open and the first sentence earns the read. The linked writing guides go deep on each."
nextStep:
  label: "Make sure you reach the inbox first"
  href: "/repmail/learn/deliverability/complete-guide-to-email-deliverability"
  description: "No cold email works if it lands in spam. Start with the deliverability pillar."
assets:
  - type: table
    title: The two halves of cold email
    content:
      headers: ["Half", "The goal", "Where to go deep"]
      rows:
        - ["Deliverability", "Reach the inbox", "Complete Guide to Email Deliverability"]
        - ["Writing", "Earn the open and read", "Subject lines / personalization"]
        - ["Follow-up", "Earn the reply", "How many follow-ups / what to A/B test"]
        - ["Tooling", "Send it reliably", "Best cold email software"]
---

Cold email is two disciplines wearing one name. The first is getting the message delivered to the inbox at all; the second is writing something a stranger actually wants to reply to. Most people pour their energy into the second and quietly fail at the first, which is why so much good writing ends up in spam. This guide maps both halves and links to the detailed guide for each part, so you can orient yourself and then go deep wherever you need to.

## First, earn the inbox

No cold email works if it never arrives. Before optimizing a single word, get deliverability right: this is covered end to end in the [Complete Guide to Email Deliverability](/repmail/learn/deliverability/complete-guide-to-email-deliverability). The essentials are authenticating your domain, warming it up, and understanding [why cold emails land in spam](/repmail/learn/deliverability/why-your-emails-land-in-spam) in the first place. Get this wrong and nothing downstream matters.

## Then, earn the open and the read

Once you reach the inbox, the [subject line earns the open](/repmail/learn/cold-email/subject-lines-that-get-opened) and the opening line earns the read. The single biggest lever on reply rate is relevance, which comes from [personalizing at scale](/repmail/learn/cold-email/personalize-cold-email-at-scale) without sounding automated. Plain, specific, one-to-one messages both read better and place better, so good writing and good deliverability pull in the same direction.

## Follow up deliberately

Most replies come from follow-ups, not the first touch. Learn [how many follow-ups](/repmail/learn/cold-email/how-many-follow-ups) to send and [what to A/B test first](/repmail/learn/cold-email/what-to-ab-test-first) when your numbers stall, so you improve the highest-leverage variable instead of guessing.

Before you decide your numbers are bad, check them against [what good actually looks like](/repmail/learn/cold-email/cold-email-benchmarks). Reply rates vary enough by industry and list quality that "low" is only meaningful relative to a benchmark.

## Choose the right tool

Cold email is a people-run workflow, so the platform matters. See [where RepMail fits in your workflow](/repmail/learn/cold-email/where-repmail-fits-in-your-workflow) and how the field compares in [best cold email software](/repmail/learn/outreach/best-cold-email-software). The wrong category of tool, a marketing platform repurposed for outreach, caps your results before you start.

## Where RepMail fits

RepMail owns the technical half so you can focus on the human half: it handles sending, authentication, deliverability, and tracking on AWS SES infrastructure, personalizes each message with GPT-4o, and protects your domain with real-time bounce suppression. You own the list, the message, and the follow-up; RepMail owns getting it delivered.
