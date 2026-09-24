---
product: repmail
academy: deliverability
contentType: guide
slug: separate-list-vs-infrastructure-email-problems
title: How to Separate List Problems From Infrastructure Problems
description: How to Separate List Problems From Infrastructure Problems — a focused
  diagnostic decision tree and checklist to decide whether poor email delivery is
  caused by
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- deliverability
- diagnostic
- list-quality
- infrastructure
- email
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
assets:
- type: table
  title: 'Decision checklist: separate list vs infrastructure ownership'
  content:
    headers:
    - Observed symptom
    - Evidence to collect (event-level)
    - Likely owner
    - Immediate first action
    rows:
    - - High bounces concentrated on one campaign/list
      - List sample validation, bounce SMTP codes, spamtrap hits, acquisition source
        audit
      - List owner
      - Quarantine list segment and apply suppression; review source and opt-in proof
    - - Same bounce/rejection across multiple lists
      - Per-domain SMTP rejection codes, authentication checks, IP reputation, seed
        inbox placement
      - Infrastructure owner
      - Pause sends; validate DKIM/SPF/DMARC and IP status; contact provider support
        if needed
    - - Low inbox placement at specific ISPs only
      - Per-ISP placement via seed tests, content scan, sending cadence, complaint
        patterns
      - Shared (ISP filtering) — coordinate list & infra
      - Run targeted seed tests, adjust content/cadence; review recent list composition
        changes
    - - Authentication failures or missing DNS records
      - DNS TXT lookups, signed message headers, provider bounce messages
      - Infrastructure owner
      - Restore/verify DNS records and signing; reference DNS records for email documentation
keyTakeaways:
- Use event-level evidence and controlled comparisons — don’t rely on aggregate rates
  alone.
- Collect SMTP responses, authentication status, and per-domain placement before assigning
  ownership.
- Reproduce failures with a controlled send to isolate list vs infrastructure causes.
commonMistakes:
- Changing DNS or IP configuration when the root cause is list quality (and vice versa).
- Treating bounce rate, complaint rate, or inbox placement as a standalone diagnosis.
- Assigning remediation without first collecting SMTP/agent-level evidence and controlled
  tests.
faqs:
- question: If bounces are high, does that automatically mean a list problem?
  answer: No. High bounces can indicate bad addresses, but they can also be caused
    by provider throttling, IP blocks, or transient network errors. Classify bounces
    by SMTP codes and text, check whether failures are permanent (5xx) or temporary
    (4xx), and compare performance for a known-good control segment sent through the
    same infrastructure.
- question: What quick evidence shows an infrastructure problem?
  answer: Consistent failures across multiple independent lists, failing authentication
    (DKIM/SPF/DMARC) for your messages, or identical SMTP rejection codes for recipients
    at many domains point to infrastructure. Use seed tests across inbox providers
    and review raw SMTP logs and headers to confirm.
- question: When should teams suppress contacts versus fix DNS or IPs?
  answer: Suppress contacts when evidence shows list-specific issues (bounce classifications
    or confirmed spamtrap hits on that list). Fix DNS/IP when evidence shows provider-level
    rejections, broken authentication, or consistent failures across lists. Use the
    suppression rules guide to apply list-side controls appropriately.
nextStep:
  label: Open the complete guide to deliverability
  href: /repmail/learn/lead-generation/outbound-suppression-rules
  description: See the full deliverability hub for linked checklists on sender reputation
    and DNS setup, and next tactical steps.
---

Direct answer (short): Decide ownership by collecting event-level evidence and running controlled comparisons. Don’t assign blame based on aggregate rates alone — gather SMTP responses, authentication results, per-domain placement, and a controlled test send before deciding whether the list or the infrastructure must remediate.

Step-by-step diagnostic approach

1) Triage with event-level data
- Pull raw SMTP logs and full bounce messages. Identify SMTP status codes and rejection text (permanent 5xx vs transient 4xx). Classify failures before concluding ownership.
- Check DKIM/SPF/DMARC presence and signature validity in message headers; missing or failing authentication points to an infrastructure/DNS problem (do not change DNS when the evidence shows list-only failures).

2) Controlled comparison
- Send the same message at the same time to: (A) the suspect list, (B) a small known-good control list, and (C) public seed inboxes across providers. Use identical content and infrastructure. If (A) fails while (B) succeeds, suspect list quality. If both fail, suspect infrastructure.
- Timebox tests (short runs) to avoid creating new reputation signals.

3) Per-domain and per-ISP patterns
- Analyze results by recipient domain. A problem limited to one provider often indicates ISP filtering or domain-specific reputation; a cross-provider failure points to IP/domain-level issues.
- Use seed testing across major inbox providers to see placement trends.

4) Use bounce/complaint signals correctly
- Bounce rate, complaint rate, and placement are useful signals but not standalone proof. Combine them with SMTP codes, spamtrap hits, and authentication data before deciding.

5) Check acquisition and list hygiene evidence
- For suspected list problems: verify signup source, confirm opt-in records, check for purchased or scraped lists, and run spamtrap checks. If spamtrap or forged addresses appear, assign to list ownership and quarantine.

6) Provider-specific guidance and escalation
- Consult provider documentation and support channels when infrastructure-level signs exist: provider guidance can explain rejections or limits and advise remedial steps [1][2]. Follow provider instructions before making DNS or IP changes.

Edge cases and ownership handoffs
- Mixed failures: sometimes both owners share responsibility (e.g., poor list hygiene plus a misconfigured DKIM). Use the controlled-comparison evidence to split tasks: list team quarantines addresses and applies suppression rules (see outbound suppression guidance), infrastructure team fixes authentication or IP reputation.
- Shared IP pools: if you use shared IPs, a neighbor’s behavior can cause infrastructure-level symptoms; work with your provider and review sender reputation guidance.

Concrete immediate actions by owner
- List owner: quarantine affected segment, run suppression and source verification, remove confirmed spamtraps. See outbound suppression rules for policy details.
- Infrastructure owner: verify DNS records and message signing, inspect IP reputation, and run seed tests. See DNS records for email and sender reputation documentation for setup and diagnostics.

Asset: use the decision checklist table above to map symptoms to evidence and owner. Use controlled tests to avoid unnecessary DNS changes when the problem is list quality, and avoid bulk suppressions when infrastructure is at fault.

## Sources
[1] https://support.google.com/a/answer/81126
[2] https://support.microsoft.com/en-us/outlook/sender-support-in-outlook-com


## Related resources

Continue with [the related RepMail guide](/repmail/learn/lead-generation/outbound-suppression-rules), [the related RepMail guide](/repmail/learn/deliverability/sender-reputation), [the related RepMail guide](/repmail/learn/infrastructure/dns-records-for-email).


## Related resources

Continue with the [complete guide to email deliverability](/repmail/learn/deliverability/complete-guide-to-email-deliverability), review the [provider-specific triage guide](/repmail/learn/deliverability/provider-specific-deliverability-triage), and use the [sender reputation guide](/repmail/learn/deliverability/sender-reputation) when the workflow crosses into a neighboring concern.
