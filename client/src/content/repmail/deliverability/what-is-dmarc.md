---
contentType: glossary-term
slug: what-is-dmarc
title: What Is DMARC, and Which Policy Should You Use?
description: "DMARC tells receivers what to do when SPF or DKIM fails, and reports who sends mail in your name. Here is how to roll it out without blocking yourself."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["dmarc", "authentication", "dns", "deliverability"]
prerequisites:
  - label: "What SPF does"
    href: "/repmail/learn/deliverability/what-is-spf"
  - label: "What DKIM does"
    href: "/repmail/learn/deliverability/what-is-dkim"
commonMistakes:
  - "Publishing p=reject on day one, before SPF and DKIM reliably pass, which rejects your own legitimate mail."
  - "Never reading the DMARC reports, so you miss the unauthorized senders and misconfigurations they reveal."
  - "Confusing DMARC alignment with a simple pass. A message can pass SPF or DKIM and still fail DMARC if the domains do not align."
faqs:
  - question: "What are the three DMARC policies?"
    answer: "p=none monitors and reports without affecting delivery. p=quarantine sends failing mail to spam. p=reject blocks it outright. The standard rollout is none, then quarantine, then reject, moving forward only once your reports show legitimate mail passing cleanly."
  - question: "What is DMARC alignment?"
    answer: "Alignment requires the domain that passed SPF or DKIM to match the domain in your visible From address. Without alignment, a spammer could pass SPF using their own domain while forging your From line. DMARC only counts a check as passing when it aligns."
  - question: "Do I need DMARC if SPF and DKIM already pass?"
    answer: "Yes. SPF and DKIM authenticate parts of the message, but only DMARC ties them to the address recipients actually see, tells receivers what to do on failure, and gives you visibility through reports. Since 2024 it is required for bulk senders to Gmail and Yahoo."
nextStep:
  label: "Now check your spam score"
  href: "/repmail/learn/deliverability/what-is-a-good-spam-score"
  description: "With authentication solid, the next lever is the content signals filters score before delivery."
assets:
  - type: table
    title: DMARC rollout, stage by stage
    content:
      headers: ["Stage", "Policy", "What it does"]
      rows:
        - ["Monitor", "p=none", "Reports failures without changing delivery, so you find every legitimate sender first"]
        - ["Enforce softly", "p=quarantine", "Sends failing mail to spam once your reports look clean"]
        - ["Enforce fully", "p=reject", "Rejects failing mail outright, the strongest anti-spoofing stance"]
---

DMARC, Domain-based Message Authentication, Reporting and Conformance, is the policy layer that makes SPF and DKIM add up to something. On their own, those two prove parts of a message but leave a gap: a message can pass SPF using one domain while displaying a completely different address in the From line a recipient reads. DMARC closes that gap with two additions. It requires the authenticated domain to align with your visible From address, and it tells receiving servers exactly what to do when a message fails.

## Alignment is the point

The critical idea in DMARC is alignment. It is not enough for a message to pass SPF or DKIM somewhere; the domain that passed has to match the domain your recipient sees. This is what stops an impersonator from authenticating with their own infrastructure while forging your name. When people say DMARC "ties it all together," alignment is what they mean.

## Choose your policy carefully

DMARC has three enforcement levels, and the order you adopt them in matters more than which you end at.

`p=none` changes nothing about delivery. It simply asks receivers to report what they see, which is how you discover every legitimate service sending in your name before you enforce anything. `p=quarantine` sends failing mail to spam. `p=reject` refuses it outright.

The safe path is always none, then quarantine, then reject, advancing only when the reports show your real mail passing and aligning. Jumping straight to `p=reject` while SPF or DKIM is still shaky does not protect you from spammers so much as block yourself, and it is one of the most common self-inflicted deliverability wounds.

## Read the reports

DMARC's reporting is the part most senders ignore and the part that pays off. The aggregate reports show every source sending as your domain, which surfaces both impersonators and your own forgotten tools that were never authenticated. For cold email, where a clean domain reputation is the whole foundation, that visibility is worth the small effort of collecting it.

## Where RepMail fits

RepMail's domain verification gets SPF and DKIM aligned and passing first, which is the precondition for enforcing DMARC safely. Because sending runs on dedicated AWS SES infrastructure rather than a shared mailbox wrapper, your From domain and your authenticated domain stay aligned by design, so moving your DMARC policy from monitoring to enforcement does not put your own campaigns at risk. Authentication becomes a foundation you can tighten, instead of a fragile setup you are afraid to touch.
