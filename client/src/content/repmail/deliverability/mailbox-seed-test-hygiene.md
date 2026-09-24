---
product: repmail
academy: deliverability
contentType: guide
slug: mailbox-seed-test-hygiene
title: "Mailbox Seed-Test Hygiene: Detect Contaminated Results"
description: "Keep seed mailboxes useful by documenting age, filters, forwarding, engagement, and reset procedures that can distort placement-test results."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["seed lists", "inbox placement", "testing", "quality control"]
keyTakeaways:
  - "A seed mailbox is a measurement instrument with its own history, rules, and provider context."
  - "Forwarding, filters, engagement, prior messages, and mailbox state can contaminate interpretation."
  - "Document hygiene and reset actions so a placement result is reproducible and explicitly directional."
prerequisites:
  - label: "Run a seed-list test"
    href: "/repmail/learn/deliverability/email-deliverability-test-seed-lists"
  - label: "Read placement results"
    href: "/repmail/learn/deliverability/read-inbox-placement-test-results"
commonMistakes:
  - "Treating a seed mailbox as equivalent to a normal recipient with no history."
  - "Leaving forwarding rules, custom filters, or old threads in place and calling the result provider behavior."
  - "Comparing a newly reset mailbox with an engaged mailbox without recording the difference."
faqs:
  - question: "Should seed mailboxes be completely empty?"
    answer: "There is no universal seed-mailbox standard. The important practice is to document mailbox history, filters, forwarding, engagement, and reset state, then keep those conditions consistent within a comparison."
  - question: "Can forwarding change a seed result?"
    answer: "Yes. Forwarding can change the delivery path and the headers or filters applied after the original provider receives the message. Record it, and avoid using a forwarded mailbox as if it represented direct delivery."
  - question: "How often should a seed list be reset?"
    answer: "Use a reset or review procedure appropriate to the test design, and record when it occurred. A reset is not automatically better than a stable, documented mailbox; consistency and known conditions matter."
nextStep:
  label: "Interpret placement carefully"
  href: "/repmail/learn/deliverability/read-inbox-placement-test-results"
  description: "Separate inbox, spam, missing, and test-failure outcomes after hygiene review."
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
assets:
  - type: checklist
    title: "Seed mailbox hygiene review"
    content:
      - "Record provider, mailbox creation or last-reset date, and test owner"
      - "Remove or document forwarding, filters, labels, rules, auto-replies, and mailbox delegates"
      - "Record prior engagement, old message history, and any manual reads or replies"
      - "Confirm the mailbox can receive the test and preserve the original headers"
      - "Use the same seed cohort, send time, message, and interpretation window when comparing runs"
      - "Flag contaminated or unavailable mailboxes instead of counting them as spam or inbox"
---

**Treat every seed mailbox as a test instrument, not a neutral window into a provider.** Before a placement test, record the mailbox’s provider, age, filters, forwarding, engagement, prior messages, and reset state. Keep those conditions stable or label the result as contaminated; never convert a missing or failed test into a spam placement.

## Inventory the mailbox state

For each address, record provider, creation or reset date, locale where relevant to the test, forwarding destinations, filters, labels, auto-replies, delegated access, and prior engagement. Note whether the mailbox is actively read, automatically processed, or left untouched. These conditions are part of the test environment.

The [seed-list testing guide](/repmail/learn/deliverability/email-deliverability-test-seed-lists) explains test design. This page adds the quality-control record needed before trusting the output.

## Remove or isolate contamination

A forwarding rule can add another delivery path. A custom filter can move a message after receipt. A mailbox with a long history of reads, replies, and manually marked spam may not represent a new or stable recipient. Decide whether to reset, replace, or retain the mailbox, then record that decision.

Do not “clean” the mailbox between two cells in a way that favors one variant. If a reset is required, reset the comparable cohort using the same procedure and date window. Keep test mailboxes separate from production suppression metrics and recipient engagement reporting.

## Run and classify the result

Send the same message or the defined experiment variant at a recorded time. Preserve the original headers and provider response where available. Classify the outcome as inbox, spam, another provider folder, missing, or test failure according to the test’s rules. If the mailbox is inaccessible, forwarded, or altered by a filter, mark the observation with its limitation rather than forcing it into a placement bucket.

When comparing runs, report the seed cohort and hygiene state. A difference can indicate a message, sender, provider, mailbox, or test-process effect. The [placement-report guide](/repmail/learn/deliverability/read-inbox-placement-test-results) helps keep those categories separate.

## Where RepMail fits

RepMail teams can attach the hygiene record to their deliverability test and campaign version. RepMail does not make a seed test a Gmail-wide measurement; the value comes from a controlled, documented observation. Recheck provider behavior and test-tool assumptions at publication time if the method depends on current provider handling.

## Sources

- [Gmail Help: Email sender guidelines](https://support.google.com/mail/answer/14668346?hl=en)
