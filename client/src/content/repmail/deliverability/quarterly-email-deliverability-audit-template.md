---
product: repmail
academy: deliverability
contentType: template
slug: quarterly-email-deliverability-audit-template
title: Email Deliverability Audit Template for Quarterly Reviews
description: A ready-to-use quarterly email deliverability audit template for managers
  and teams running recurring programs. Includes owner assignments, evidence capture,
  pr
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- deliverability
- audit
- governance
- sender reputation
- quarterly
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
assets:
- type: table
  title: Quarterly Deliverability Decision Checklist
  content:
    headers:
    - Area
    - Quarterly Check
    - Owner & Evidence
    - Decision / Action
    rows:
    - - Provider trends
      - Compare delivery trends and provider console notes across quarters
      - Platform owner — attach postmaster/console exports
      - Monitor / Escalate to provider support
    - - Authentication
      - Verify SPF/DKIM/DMARC alignment for sending domains
      - Security owner — DNS records, DKIM signatures, DMARC reports
      - No change / Fix DNS / Rotate keys
    - - Complaint & bounce signals
      - Review complaint rates, bounce categories, and soft-fail patterns
      - Ops owner — complaint dashboards, bounce logs
      - Monitor / Re-engage / Suppress
    - - Suppression & list hygiene
      - Confirm suppression list integrity and recent removals/appeals
      - Data owner — suppression export, appeal records
      - Keep / Reinstate / Audit process
    - - Incidents & changes
      - Log incidents (outages, large content changes, provider updates) since last
        audit
      - Program owner — incident log, change tickets
      - Investigate impact / Schedule remediation
keyTakeaways:
- Run a short, evidence-first quarterly review that records owners, findings, and
  trend comparisons.
- Cover provider trends, authentication, complaint/bounce signals, suppression, incidents/changes,
  and open questions every quarter.
- Use the decision checklist to move items to monitoring, remediation, or escalation
  with clear owners and evidence.
commonMistakes:
- Treating the audit as a one-off troubleshooting checklist rather than a recurring
  governance artifact with owners and evidence.
- Relying on single-period snapshots instead of trend comparisons or missing provider
  guidance links when evaluating issues.
- Mixing operational incident details with strategic remediation decisions without
  clear handoff owners.
faqs:
- question: How long should a quarterly deliverability audit meeting take?
  answer: 'Keep the meeting tightly focused: 30–60 minutes is typical for established
    programs if evidence is pre-collected. Reserve longer sessions for remediation
    planning only when a blocker is identified.'
- question: Which provider signals are essential to capture?
  answer: Capture provider-visible trends (delivery errors, throttling, and postmaster/console
    notes), authentication state (SPF/DKIM/DMARC), complaint rates, bounce/soft-fail
    patterns, and suppression list changes. For provider-specific guidance or support
    pages, refer to provider docs [1][2][3].
- question: Should every high-severity incident trigger a re-audit?
  answer: Not automatically. Use the audit to record incidents and owners. If the
    incident affected multiple quarters or changed baseline metrics, schedule an ad-hoc
    follow-up audit focused on remediation and evidence verification.
nextStep:
  label: Complete guide to email deliverability
  href: /repmail/learn/email-platform/email-sending-observability
  description: If you need deeper context, remediation playbooks, or more background
    for unusual signals, read the complete guide to email deliverability.
---

Direct answer: A quarterly email deliverability audit is a recurring governance artifact and checklist used to assess sending health, provider signals, authentication posture, suppression and incident history, and to assign owners and evidence for remediation and monitoring. This template organizes those checks into concise, repeatable steps so teams can compare trends and make decisions each quarter.

Practical steps (what to prepare before the audit)
- Gather provider exports and dashboards for the quarter (postmaster/console reports, delivery logs, complaint/bounce lists). Link to provider guidance where relevant [1][2][3].
- Export authentication reports (DMARC aggregate reports, DKIM verification logs, SPF results) and current DNS records.
- Produce suppression and unsubscribe list exports, recent appeal logs, and any change/incident tickets since the last audit.
- Pre-fill the decision checklist (asset) with owners and attached evidence to keep the meeting short.

Quarterly checks and why they matter
- Provider trends: Look for delivery drops, increased transient failures, or console notes from major providers. Providers publish guidance for senders and support channels—capture those references when relevant [1][2][3]. Do not assume provider algorithms or thresholds beyond what the vendor documents.
- Authentication: Confirm that SPF, DKIM, and DMARC are published and aligned for each sending domain. If you lack DMARC aggregate data, note that the audit cannot measure domain alignment and mark as evidence missing.
- Complaint & bounce signals: Separate hard bounces from soft/fail bounces and check complaint trajectories versus previous quarters. If you don’t have complaint aggregation, record that as missing evidence rather than guessing a rate.
- Suppression lists: Verify that your suppression list aligns with opt-outs and appeals. Check for accidental re-imports or orphan records.
- Incidents & changes: Record any outages, major template/content changes, new third-party senders, or DNS/key rotations since the last review. These often explain sudden metric shifts.

Decision workflow (use the attached checklist)
- For each item, assign an owner and capture evidence. Use the decision column to place items into one of: Monitor, Remediate (with deadline), or Escalate (to provider or legal/PM). The asset table in this template is structured for exactly that purpose.

Edge cases and provider-aware cautions
- Low-volume senders: Some provider signals are noisy at low volumes; document volume context and avoid overreacting to single-events.
- Multiple sending domains or partners: Audit each domain separately and require partner evidence for shared-IP or third-party sends.
- Missing evidence: If a metric cannot be measured from available exports, mark it as “evidence not available” and assign an owner to collect it next cycle. Do not infer provider thresholds or claim specific cause without provider confirmation.

Where this fits in your toolkit
- Use this quarterly artifact alongside day-to-day observability tools; start by linking operational dashboards or observability pages such as your email-sending observability console for follow-up checks: [/repmail/learn/email-platform/email-sending-observability]. Also review sender reputation context when changes appear: [/repmail/learn/deliverability/sender-reputation]. For broader background, consult the complete guide to email deliverability for playbooks and deeper remediation steps: [/repmail/learn/deliverability/complete-guide-to-email-deliverability].

## Sources
[1] https://support.google.com/mail/answer/14668346?hl=en
[2] https://support.google.com/a/answer/81126
[3] https://support.microsoft.com/en-us/outlook/sender-support-in-outlook-com


## Related resources

Continue with [the related RepMail guide](/repmail/learn/email-platform/email-sending-observability), [the related RepMail guide](/repmail/learn/deliverability/sender-reputation), [the related RepMail guide](/repmail/learn/deliverability/deliverability-baseline-before-outreach).


## Related resources

Continue with the [complete guide to email deliverability](/repmail/learn/deliverability/complete-guide-to-email-deliverability), review the [provider-specific triage guide](/repmail/learn/deliverability/provider-specific-deliverability-triage), and use the [sender reputation guide](/repmail/learn/deliverability/sender-reputation) when the workflow crosses into a neighboring concern.
