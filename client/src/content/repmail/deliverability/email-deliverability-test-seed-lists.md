---
product: repmail
academy: deliverability
contentType: guide
slug: email-deliverability-test-seed-lists
title: 'Email Deliverability Test: Seed Lists, Placement Checks, and Interpret'
description: How to run reproducible email deliverability tests using seed lists,
  interpret provider placement, and avoid common measurement pitfalls.
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- deliverability
- testing
- inbox-placement
- seed-lists
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
assets:
- type: table
  title: Inbox placement decision checklist
  content:
    headers:
    - Check
    - Why it matters
    - Action if failing
    rows:
    - - Seed-list hygiene (no catch-alls, active inboxes)
      - Reduces false positives from mailbox rules and bounces
      - Remove or replace unhealthy addresses; revalidate ownership
    - - Provider cohorts included (Gmail, Outlook, Apple, Yahoo)
      - Different providers apply different filters and tabs
      - Add missing cohorts and re-run; avoid extrapolating from one provider
    - - Consistent timestamps (send time, MTA ID, arrival time)
      - Allows detection of deferrals, batching, or delayed delivery
      - Record and compare send vs arrival; rerun at varied send windows
    - - Sample-size and repeatability
      - Single runs are noisy; repetition reveals trends
      - Repeat sends over several days and compare trends rather than single outcomes
    - - Authentication & headers logged (SPF, DKIM, DMARC visible)
      - Authentication problems often correlate with spam placement
      - Check authentication results and correlate with placement; see provider triage
        guide
keyTakeaways:
- A deliverability test combines a well-maintained seed list, provider cohorts, and
  careful timestamped measurements—not a single inbox snapshot.
- Seed-list hygiene and consistent timestamps are essential; small or mixed-quality
  samples can mislead.
- Interpret placement per provider and cohort; do not present a seed test as a Gmail-wide
  measurement.
commonMistakes:
- Using stale, catch‑all, or auto-forwarding addresses on the seed list (poor hygiene).
- Treating a single run or a single Gmail inbox as representative of provider behavior.
- Mixing message variants, authentication states, or sending time windows across seeds
  without isolating variables.
faqs:
- question: What is seed-list hygiene and why does it matter?
  answer: Seed-list hygiene means each seed is a known, regularly checked inbox that
    doesn’t auto-forward, isn’t a catch‑all, and has a stable mailbox configuration.
    Good hygiene reduces noise from mailbox-level rules, bounces, role addresses,
    or addresses that were created only for the test then abandoned. If seeds are
    unhealthy you can’t tell whether placement or mailbox quirks caused a delivery
    outcome.
- question: How many seeds per provider do I need?
  answer: There’s no one-size number. Rather than citing a specific threshold, aim
    for a diverse, repeatable cohort per provider (different IPs, domains, geo if
    relevant) and run multiple sends over time. If resources limit you, prioritize
    seed diversity and repeat runs to reveal consistent patterns rather than relying
    on a single snapshot.
- question: Should I treat a seed test as proof of Gmail-wide behavior?
  answer: No. Seed tests show how your messages performed for the specific addresses
    and cohorts you tested. Gmail and other providers use complex, evolving signals;
    a small seed set cannot be presented as a definitive Gmail-wide measurement. Use
    per-provider cohorts and combine seed tests with engagement and telemetry data
    for broader inferences.
nextStep:
  label: Run a pre-send deliverability checklist
  href: /repmail/learn/deliverability/inbox-placement-vs-deliverability
  description: Before experimenting, follow the pre-send checklist to confirm authentication,
    list hygiene, and sending infrastructure. See the pre-send deliverability checklist
    for a quick, practical run-through.
---

Direct answer: An email deliverability test is a controlled experiment that sends the same or clearly variant messages to a curated seed list across provider cohorts, records precise timestamps and headers, and interprets placement per provider rather than declaring a universal result. A valid test requires seed-list hygiene, explicit provider cohorts, consistent timestamps, and repeatable sample sizes; do not present a seed test as a Gmail-wide measurement.

Step-by-step testing procedure

1) Build and vet your seed list
- Use real, monitored inboxes you control or trust. Avoid catch‑alls, role addresses, and addresses that auto-forward to other providers. Record mailbox creation or last-checked timestamps so you can track seed health over time (seed-list hygiene).

2) Define provider cohorts
- Group seeds by provider: Gmail, Outlook/Exchange, Apple, Yahoo, and major ISP clusters relevant to your audience. Treat each cohort separately when analyzing placement because providers differ in filtering, tabs, and enforcement. For provider-specific troubleshooting, see the provider-specific deliverability triage guide (/repmail/learn/deliverability/provider-specific-deliverability-triage).

3) Prepare identical test messages and metadata
- Send the same message (or a small, controlled set of variants) per run. Log send timestamps, Message-ID, SMTP transaction IDs, and the sending IP. Record DKIM, SPF, and DMARC results visible in headers so you can correlate authentication to placement.

4) Execute runs and timestamp arrivals
- Send multiple runs at different times/days to reduce time-window bias. Record both the time you injected the message into your MTA and the time of arrival in each seed. Some providers defer or batch deliveries; timestamps reveal those behaviors.

5) Collect and analyze placement per provider
- Classify outcomes (inbox, promotions/tab, spam, deferred, bounced). Aggregate by provider cohort and run. Don’t average Gmail results with another provider: analyze Gmail seeds as a group and report findings as per-cohort observations.

Interpretation guidance and caveats

- Timestamps: Always record both send and arrival times. Delays can indicate queuing or provider-side rate limiting rather than filtering decisions.

- Sample-size caveats: Small seed counts are noisy. If you can’t scale seeds, prioritize seed diversity (different domains, subnets, client types) and repeat the experiment. Avoid asserting broad claims from limited data.

- Provider awareness: Providers have different user interfaces and classification systems (e.g., tabs in Gmail). Link placement to provider docs where appropriate rather than extrapolating. For example, Gmail’s classification and tab behavior is documented and should be consulted when interpreting Gmail placements [1]. Google also publishes guidance for bulk senders that may affect results for high-volume senders [2].

- Authentication and headers: Correlate SPF/DKIM/DMARC results with placement. Authentication failures often coincide with worse placement, but causation must be established through controlled tests.

Practical edge cases

- Forwarding and aliases: If a seed auto-forwards to another provider, placement reflects the final mailbox; mark and exclude such seeds or interpret separately.

- ISP-specific throttling: If one provider delays all deliveries for a run, compare across runs and check sending IP reputation and rate patterns before concluding on content or authentication.

- New sending infrastructure: When you move IPs or domains, treat the first several runs as a warm-up and expect different behavior than established senders.

Relevant resources

- Use the inbox placement vs deliverability primer to understand how placement fits into your broader measurement strategy (/repmail/learn/deliverability/inbox-placement-vs-deliverability).
- If you need a quick preflight, follow the pre-send deliverability checklist before running tests (/repmail/learn/deliverability/pre-send-deliverability-checklist).
- For a comprehensive view of deliverability topics, consult the complete guide to email deliverability (/repmail/learn/deliverability/complete-guide-to-email-deliverability).

## Sources

[1] https://support.google.com/mail/answer/14668346?hl=en
[2] https://support.google.com/a/answer/81126


## Related resources

Continue with [the related RepMail guide](/repmail/learn/deliverability/inbox-placement-vs-deliverability), [the related RepMail guide](/repmail/learn/deliverability/pre-send-deliverability-checklist), [the related RepMail guide](/repmail/learn/deliverability/provider-specific-deliverability-triage).


## Related resources

Continue with the [complete guide to email deliverability](/repmail/learn/deliverability/complete-guide-to-email-deliverability), review the [provider-specific triage guide](/repmail/learn/deliverability/provider-specific-deliverability-triage), and use the [sender reputation guide](/repmail/learn/deliverability/sender-reputation) when the workflow crosses into a neighboring concern.
