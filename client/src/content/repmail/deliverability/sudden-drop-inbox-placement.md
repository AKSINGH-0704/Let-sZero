---
product: repmail
academy: deliverability
contentType: guide
slug: sudden-drop-inbox-placement
title: How to Diagnose a Sudden Drop in Inbox Placement
description: A focused incident runbook for diagnosing a sudden drop in inbox placement
  using time-series comparisons, provider splits, authentication and reputation checks,
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- deliverability
- incident response
- inbox placement
- triage
- email sending
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
assets:
- type: table
  title: 'Incident decision table: immediate checks and controls'
  content:
    headers:
    - Check
    - Data source
    - Observed signal
    - Immediate action
    - Priority
    rows:
    - - Define incident windows & control
      - Sending logs (timestamps), campaign metadata
      - Sharp change point; control stable
      - Lock windows, preserve raw logs, mark control group
      - High
    - - Provider split analysis
      - Provider-by-provider placement rates
      - Drop present on specific provider(s)
      - Isolate routing for those providers; hold further sends to them if broad impact
      - High
    - - Authentication (SPF/DKIM/DMARC)
      - DNS records, recent key rotations, bounce headers
      - Mismatch, recent key change, or failures
      - Restore correct DNS keys, re-sign, notify host/provider
      - High
    - - Reputation & throttling
      - Provider feedback, bounce/deferral patterns
      - High deferrals or feedback loop spikes
      - Reduce rate to suspect IPs, open provider support tickets
      - Medium
    - - List & content checks
      - Engagement metrics, complaint rates, recent template changes
      - Spike in complaints or new template patterns
      - Pause new campaigns with suspect content, test with control list
      - Medium
keyTakeaways:
- Start with a pre/post window and a control comparison; preserve raw timestamps.
- Split traffic by provider and sending source to isolate where placement changed.
- Check authentication, reputation signals, list and content in parallel; avoid attributing
  to one root cause until evidence supports it.
commonMistakes:
- Blaming one cause (e.g., content) before checking provider splits and authentication.
- Relying only on seed lists or aggregated averages instead of preserved timestamps
  and controls.
- Making broad sending changes without a rollback plan or documented pre/post comparison.
faqs:
- question: How long should my pre/post windows be?
  answer: Choose windows that capture normal variability for your program and the
    incident timeline. Common choices are symmetric windows (e.g., 48–168 hours) that
    include at least one full business cycle; ensure you preserve raw timestamps so
    you can re-slice later. If traffic is low, extend windows to collect sufficient
    samples.
- question: What is a valid control for comparison?
  answer: 'A control is traffic that should be unaffected by the incident: another
    IP or subdomain, a non-impacted campaign, or a seeded segment. The key is that
    the control matches the impacted segment’s sending patterns and audience so differences
    are meaningful.'
- question: If one provider shows a drop but others don’t, what should I do first?
  answer: Treat provider-specific drops as high priority. Preserve per-message timestamps,
    split by provider, then check authentication and provider feedback or blocks.
    Follow provider-specific triage next — don't assume the issue is global and change
    all sending until you understand the split.
- question: Can content changes alone cause sudden drops?
  answer: Yes, but content should be investigated alongside provider and reputation
    signals. Content issues often coincide with increased spam-folder rates on particular
    providers; use AB tests and control comparisons to confirm.
nextStep:
  label: Read the complete guide to email deliverability
  href: /repmail/learn/deliverability/sender-reputation-recovery-plan
  description: If you need broader context about reputation, authentication and sender
    best practices, start with the complete guide to email deliverability.
---

Direct answer: To diagnose a sudden drop in inbox placement, run a time-series regression workflow that compares preserved, timestamped pre/post windows and a matched control, then split by provider and sending source to isolate the fault domain before proposing fixes. Preserve raw timestamps and avoid attributing a single root cause until evidence from multiple checks converges.

Stepwise diagnostic workflow

1) Define windows and control
- Capture a symmetric pre/post window around the first observed change point and preserve raw timestamps for every message (send time, timestamp in provider logs, and any provider-reported times). Pick a control stream (another IP, subdomain, or campaign) that mirrors the impacted traffic and will let you see program-specific changes vs platform-wide issues.

2) Detect the change point
- Use a simple change-point detection (visual or statistical) on placement metrics with preserved timestamps. Confirm the exact time the metric diverged so you can target recent configuration, content, or operational events.

3) Provider split (critical)
- Split results by mailbox provider (Gmail, Outlook/Hotmail/Outlook.com, Yahoo, etc.). A drop limited to one provider points at provider-specific filtering or reputation issues; a cross-provider drop suggests sender-side problems. If provider-specific signals appear, follow provider-specific triage to gather required artifacts and escalate. For provider documentation on sender support, consult Outlook/Outlook.com guidance for next steps [3].

4) Authentication and DNS
- Check SPF, DKIM, and DMARC status for the impacted sending identities and note any recent key rotations or DNS changes. Authentication failures often surface immediately in provider logs; validate DNS propagation and signatures. For guidance on authenticating email for your domain, refer to provider docs [2].

5) Reputation and throttling signals
- Look for increases in deferrals, temporary failures, or rate-limited responses from providers. Examine bounce headers and any provider feedback to detect soft- or hard-throttling. Do not assume a single numeric reputation score—use provider responses and support channels as evidence.

6) List hygiene and engagement
- Compare engagement (opens, clicks, complaints) in the pre and post windows for the same cohorts. A sudden increase in complaints or hard bounces can reduce placement; however, don’t assume causation without statistical evidence from your control.

7) Content and recent changes
- Audit recent template changes, subject lines, links, or mass personalization. Test suspect content against a controlled seed set and the control segment. Content issues may appear provider-specific; verify with the provider split first.

8) Parallelize and preserve evidence
- Run the checks in parallel and log all findings with timestamps. Keep raw headers and sample messages intact; providers often request message samples when you open a case.

9) Remediation pathing (evidence-led)
- If authentication or DNS is broken, fix that immediately. If a provider shows provider-side filtering, open the provider support path described in their sender guidance and provide preserved timestamps and sample messages. If list or content is implicated, pause or throttle the affected campaigns and validate recovery on the control before resuming. For structured remediation and reputation restoration, consult the sender reputation recovery plan for playbook options.

Edge cases and cautions
- Shared IP pools: a noisy neighbor can cause provider-specific drops—split by IP and sending domain.
- Seed lists vs production: seeds can show placement but may not reflect end-user engagement; always compare to a matched control.
- Recent infrastructure changes: new ESP, IP moves, or DKIM key rotations should be prioritized in your timeline.

Provider-aware notes
- Platforms use differing signals and support flows; consult provider docs when you see provider-specific symptoms rather than assuming one global algorithm caused the drop. Gmail’s classification guidance and existing provider support documents can inform your evidence package when you open cases [1][2][3].

## Sources

[1] https://support.google.com/mail/answer/14668346?hl=en

[2] https://support.google.com/a/answer/81126

[3] https://support.microsoft.com/en-us/outlook/sender-support-in-outlook-com

Internal resources
- For provider escalation steps, see provider-specific triage: /repmail/learn/deliverability/provider-specific-deliverability-triage
- For remediation playbooks, review the sender reputation recovery plan: /repmail/learn/deliverability/sender-reputation-recovery-plan
- For event monitoring and observability, check email sending observability guidance: /repmail/learn/email-platform/email-sending-observability
- For broader context on reputation, authentication and placement, see the complete guide: /repmail/learn/deliverability/complete-guide-to-email-deliverability


## Related resources

Continue with [the related RepMail guide](/repmail/learn/deliverability/sender-reputation-recovery-plan), [the related RepMail guide](/repmail/learn/deliverability/provider-specific-deliverability-triage), [the related RepMail guide](/repmail/learn/email-platform/email-sending-observability).


## Related resources

Continue with the [complete guide to email deliverability](/repmail/learn/deliverability/complete-guide-to-email-deliverability), review the [provider-specific triage guide](/repmail/learn/deliverability/provider-specific-deliverability-triage), and use the [sender reputation guide](/repmail/learn/deliverability/sender-reputation) when the workflow crosses into a neighboring concern.
