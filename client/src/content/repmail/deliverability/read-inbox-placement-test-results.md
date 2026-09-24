---
product: repmail
academy: deliverability
contentType: guide
slug: read-inbox-placement-test-results
title: How to Read an Inbox Placement Test Report
description: Step-by-step guide for campaign managers and junior deliverability analysts
  to interpret inbox placement test reports, with a workflow, provider-aware checks,
  a
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- deliverability
- inbox placement
- testing
- seed tests
- triage
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
assets:
- type: table
  title: Inbox placement decision checklist
  content:
    headers:
    - Placement bucket
    - What it means
    - Quick checks
    - Recommended next actions
    rows:
    - - Inbox
      - Good observed placement for that seed and provider.
      - Verify provider split and seed timestamps; confirm no authentication failures.
      - Monitor engagement and continue regular testing; sample live streams for confirmation.
    - - Spam
      - Seed landed in Spam folder — filtering flagged message.
      - Check provider split, authentication, and content triggers.
      - Review SPF/DKIM/DMARC and message content; run provider-specific triage.
    - - Promotions
      - Message delivered to a tab (e.g., Promotions) rather than Primary.
      - Confirm provider (Gmail often uses tabs) and check content/markup.
      - Adjust subject/content/engagement strategy; test again and evaluate engagement
        metrics.
    - - Missing
      - No recorded placement — message may be blocked, throttled, or delayed.
      - Check sending logs, bounce codes, and test timestamps.
      - Inspect sending IP reputation and provider response headers; escalate if blocked.
    - - Test failures
      - Infrastructure or delivery errors prevented result collection.
      - Check test platform logs and seed mailbox access/credentials.
      - Rerun the test after resolving platform issues; do not draw conclusions from
        failed seeds.
keyTakeaways:
- Treat seed results as directional snapshots — they reflect a moment in time and
  a sample of addresses.
- Read placement by bucket and by provider split before making changes (Inbox, Spam,
  Promotions, Missing, Test failures).
- 'Follow an ordered triage: provider splits → authentication → content/engagement
  → sending patterns → retest.'
commonMistakes:
- Treating seed results as exact deliverability percentages instead of indicators.
- Ignoring provider splits and acting on an aggregate placement number.
- Fixing content only when authentication or provider-specific filtering is the root
  cause.
faqs:
- question: Are seed test results definitive for my whole program?
  answer: 'No. Seed results are directional and time-bound: they show how that sample
    of seed addresses behaved at the time of the test. They help prioritize investigation
    but do not measure the full live subscriber base or longitudinal reputation.'
- question: What does a “missing” result mean in a placement report?
  answer: “Missing” typically means the test system did not observe a final delivery
    state for that seed (no Inbox/Spam/Promotions label recorded). Causes include
    message blocks, delivery delays, mailbox provider throttling, or test infrastructure
    issues. Treat missing as a higher-severity signal that needs provider and sending-path
    checks.
- question: If Gmail puts mail into Promotions, should I treat it like Spam?
  answer: Not necessarily. Promotions is a tab within user inboxes and is different
    from Spam in how users find messages. Treat Promotions as degraded placement for
    engagement-focused mail; however, investigate both content and sender reputation.
    Gmail’s sorting behavior and tab assignment are provider-specific and not fully
    public [1].
nextStep:
  label: Provider-specific deliverability triage
  href: /repmail/learn/deliverability/inbox-placement-vs-deliverability
  description: If a provider split shows poor placement, run provider-focused checks
    for authentication, throttling, and content and follow our provider-specific troubleshooting
    guidance.
---

Direct answer: To read an inbox placement test report, treat it as a directional snapshot and run a short triage: (1) review placement by bucket and by mailbox provider, (2) check authentication and provider responses, (3) inspect content and engagement signals, then (4) pick corrective actions and retest. Seed tests show where sampled addresses landed at a point in time and are not a complete measure of program health.

Quick workflow (practical steps)
1) Quick read — placement buckets first
- Break the report into the five outcome groups: Inbox, Spam, Promotions (tabbed delivery), Missing, and Test failures. The rest of your triage depends on which buckets dominate.

2) Provider split
- Don’t act on an aggregate rate alone. Look at results by provider (Gmail, Microsoft, Yahoo, etc.). Providers use different signals and sorting algorithms; for example, Gmail’s tab and sorting behaviors are provider-specific and not fully public [1]. A problem on one provider may be invisible on others.

3) Authentication and delivery path
- Check for authentication failures and provider response codes in your sending logs. Authentication issues (SPF/DKIM/DMARC) and provider guidance for administrators should be verified as part of triage; consult provider admin guidance for proper configuration [2]. If seeds show authentication issues, fix them before changing content.

4) Content and engagement checks
- If authentication is clean, examine message content, links, images, and engagement signals. Promotions vs Primary is often content- and template-driven; Spam placements point to stronger filtering triggers.

5) Investigate missing and test failures
- Missing seeds can indicate blocking, heavy throttling, or transient provider behavior. Test failures often point to test infrastructure (seed access or scraping problems). Rerun tests after verifying logs.

6) Next actions and retest
- Prioritize fixes: authentication and hard failures first, then provider-specific content and sending cadence changes. After changes, run another targeted seed test and compare provider splits; seeds are time-bound, so repeat tests over days for confidence.

Edge cases and cautions
- Small seed sample sizes: a single seed failure on one provider may not represent all delivery for that provider. Treat low-volume provider splits as a signal that needs corroboration.
- Time-of-day and campaign pacing: placement can vary by time and recent sending patterns. Seeds capture the moment you test.
- Provider opacity: mailbox providers do not publish exact ranking formulas; rely on observable signals and provider guidance rather than assuming exact causes [1].

Provider-aware next reading
- For differentiation between overall deliverability and placement testing, see inbox placement vs deliverability (/repmail/learn/deliverability/inbox-placement-vs-deliverability). If the report shows a provider-specific problem, follow provider-specific deliverability triage (/repmail/learn/deliverability/provider-specific-deliverability-triage). For a broader methodology, consult the complete guide to email deliverability (/repmail/learn/deliverability/complete-guide-to-email-deliverability).

## Sources
[1] https://support.google.com/mail/answer/14668346?hl=en
[2] https://support.google.com/a/answer/81126


## Related resources

Continue with [the related RepMail guide](/repmail/learn/deliverability/inbox-placement-vs-deliverability), [the related RepMail guide](/repmail/learn/deliverability/provider-specific-deliverability-triage), [the related RepMail guide](/repmail/learn/deliverability).


## Related resources

Continue with the [complete guide to email deliverability](/repmail/learn/deliverability/complete-guide-to-email-deliverability), review the [provider-specific triage guide](/repmail/learn/deliverability/provider-specific-deliverability-triage), and use the [sender reputation guide](/repmail/learn/deliverability/sender-reputation) when the workflow crosses into a neighboring concern.
