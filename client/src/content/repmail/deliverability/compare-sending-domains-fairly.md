---
product: repmail
academy: deliverability
contentType: guide
slug: compare-sending-domains-fairly
title: How to Compare Two Sending Domains Fairly
description: A controlled-comparison guide for teams that must evaluate two sending
  domains during a migration or portfolio review. Explains why matched cohorts are
  required
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
collections:
  - deliverability-diagnostics
learningPaths:
  - provider-deliverability-diagnostics
tags:
- compare sending domain deliverability
- sending domain A vs B deliverability
- domain reputation comparison
- compare email domains test
- teams evaluating a domain migration or portfolio
- controlled comparison guide
- deliverability
- academy:deliverability
assets:
- type: table
  title: Matched-comparison checklist — quick decision table
  content:
    headers:
    - Check
    - Why it matters
    - How to match
    - Pass/Fail cue
    rows:
    - - Recipient cohort
      - Different audiences have different engagement and spam complaints
      - Randomize recipients into A/B from the same master list; avoid time-based
        splits
      - 'Pass: cohorts are randomized and statistically similar'
    - - Volume and cadence
      - Volume spikes or cadence changes affect reputation signals
      - Send the same volume and cadence for each domain over the same window
      - 'Pass: identical daily send volumes and pacing'
    - - Content and headers
      - Message body, subject, and headers influence filtering
      - Use identical message templates and headers (except return-path/from as needed)
      - 'Pass: identical message variants used'
    - - Authentication
      - SPF/DKIM/DMARC alignment impacts mailbox decisions [1][2]
      - Set identical DNS records and signing policies; verify alignment before test
      - 'Pass: both domains show successful alignment and pass checks'
    - - Provider/IP mix
      - Shared vs dedicated IPs and provider routing can change outcomes
      - Match provider settings or document differences; prefer same sending infrastructure
      - 'Pass: same provider settings or documented mitigation'
keyTakeaways:
- A fair deliverability comparison requires a matched experiment that controls audience,
  volume, content, provider mix, authentication, and time.
- Without matched cohorts, results are confounded and cannot attribute differences
  to the domain alone.
- Practical tests combine randomized splits, identical message content, aligned authentication,
  and consistent sending infrastructure.
- Record and compare the same metrics (delivery, spam placement, bounce reasons, engagement)
  and document limitations.
commonMistakes:
- Comparing historical aggregate reports for two domains without matching cohorts
  (different audiences or timeframes).
- 'Missing authentication parity: comparing a DKIM/DMARC-aligned domain to one that
  lacks alignment.'
- Ignoring provider or IP mix differences (shared vs dedicated infrastructure) that
  change deliverability behavior.
faqs:
- question: Can I compare domains using only historical reporting?
  answer: Historical reports are useful for context but usually confounded. Differences
    in list quality, campaign type, volume, time, or provider routing will bias results.
    Use historical data to form hypotheses, then run a matched experiment that randomizes
    recipients and holds other variables constant.
- question: How do I handle authentication when comparing domains?
  answer: 'Ensure both domains use the same authentication posture: SPF, DKIM, and
    DMARC alignment should be configured similarly (or intentionally varied and documented).
    Provider documentation on authentication expectations can help; configure and
    verify DNS records before testing to avoid confounding authentication failures
    [1][2].'
- question: What if my sending provider uses shared IP pools for one domain and dedicated
    IPs for the other?
  answer: IP mix is a major confounder. If you cannot move both domains onto similar
    IP infrastructure for the test, record the difference and, if possible, run parallel
    tests on the same provider settings or use a seed test that sends to monitored
    inboxes to isolate domain-level effects.
nextStep:
  label: Read the complete guide to email deliverability
  href: /repmail/learn/deliverability/sender-reputation
  description: If you need broader context on sender reputation and mailbox behavior,
    review the deliverability guide for related concepts and diagnostics.
---

How to Compare Two Sending Domains Fairly

Direct answer: To compare two sending domains fairly, run a matched experiment that controls audience, volume, content, provider mix, authentication, and time. Domain-level conclusions drawn from unmatched historical data are likely confounded — you must create randomized, parallel cohorts to attribute differences to the domain itself.

1) Define your hypothesis and scope
- State the specific question (e.g., “Will moving transactional mail from domain A to domain B change inbox placement?”). Be explicit about metrics: delivery rate, spam placement, bounce categories, engagement (opens/clicks) and complaint rate.
- Remember that a matched experiment is an independent decision workflow during migration or portfolio review; it’s not a universal definition of a domain’s reputation.

2) Build matched cohorts
- Start from a single master list where possible and randomly split recipients into A and B cohorts. Avoid comparing campaigns sent to different lists or sent at different times.
- For small volumes, consider multiple iterations or seeded inbox tests to increase signal.

3) Match content, headers, and cadence
- Send identical message templates and headers except for the From and return-path domains as required.
- Match send cadence and overall volume per cohort so ISPs see similar patterns.

4) Align authentication and DNS
- Ensure both domains have matching SPF, DKIM signing, and DMARC policies as intended for production; differences in alignment will drive filtering decisions. Verify records and signing before testing; provider guidance on authentication is relevant to configuration and evaluation [1][2].

5) Control provider and IP factors
- If one domain routes through a different provider or IP pool (shared vs dedicated), that difference can dominate outcomes. Where possible, send both domains through the same sending provider and IP configuration. If you cannot, document the difference and, if feasible, run separate provider-level tests.

6) Run the test over the same time window
- Mailbox behavior can vary by time and season; run both legs simultaneously or in alternating short windows to reduce temporal bias.

7) Collect the same telemetry and analyze consistently
- Compare delivery, spam placement, bounce reason codes, complaints, engagement and seed inbox results. Use the same tooling and definitions for metrics. If any metric is not directly observable, document that limitation rather than inferring cause.

8) Interpret results and document limitations
- Avoid over-interpreting small differences unless they’re consistent across repeats. If you observed differences, enumerate possible confounders you could not control (e.g., forwarded messages, ISP-specific heuristics, third-party list hygiene).

Edge cases and provider-aware cautions
- Low-volume senders: small sample sizes increase noise — aggregate multiple runs. 
- Cold lists or reactivated addresses: list age and engagement history are major drivers independent of domain.
- Shared inbox heuristics and mailbox-specific signals are not fully public; provider documentation and controlled testing are the best available guides [1][2].

Decision checklist
- Use the included checklist table to confirm you’ve matched cohorts and configuration before concluding domain-level effects.

Related concepts
- For more on how sender reputation works and domain vs mailbox roles, see the sender reputation primer and the discussion of sending domain vs mailbox behavior. Also review the broader deliverability hub for context and diagnostics.

## Sources

[1] https://support.google.com/mail/answer/14668346?hl=en
[2] https://support.google.com/a/answer/81126


## Related resources

Continue with [the related RepMail guide](/repmail/learn/deliverability/sender-reputation), [the related RepMail guide](/repmail/learn/infrastructure/sending-domain-vs-mailbox), [the related RepMail guide](/repmail/learn/deliverability/email-deliverability-test-seed-lists).


## Related resources

Continue with the [complete guide to email deliverability](/repmail/learn/deliverability/complete-guide-to-email-deliverability), review the [provider-specific triage guide](/repmail/learn/deliverability/provider-specific-deliverability-triage), and use the [sender reputation guide](/repmail/learn/deliverability/sender-reputation) when the workflow crosses into a neighboring concern.
