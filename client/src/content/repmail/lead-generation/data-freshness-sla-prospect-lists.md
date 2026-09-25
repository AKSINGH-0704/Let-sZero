---
product: repmail
academy: lead-generation
contentType: template
slug: data-freshness-sla-prospect-lists
title: "Data Freshness SLA for Prospect Lists"
description: "Data Freshness SLA for Prospect Lists — No shared rule exists for when titles, jobs, domains, and firmographics must be rechecked."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["lead-generation","lead","prospect","freshness","sla","lists"]
assets:
  - type: table
    title: "Decision/Diagnostic Table: When to Recheck Prospect Data"
    content:
      headers: ["Trigger","Automated check outcome","Action","Owner"]
      rows:
        - ["New lead not yet sent","All fields meet confidence thresholds","Mark good-to-send; proceed","Outbound operator"]
        - ["Time-since-verification exceeds SLA (e.g., 90 days)","Evidence older than SLA or no timestamp","Run enrichment; if fail, manual review or hold","Data operations"]
        - ["Enrichment confidence below threshold","Low/no match on title/domain/firmographic","Queue for manual validation with source notes","Data verifier / operator"]
        - ["Bounce or domain failure","Domain flagged unhealthy or hard bounce","Remove domain from list; re-verify corporate domain before reuse","Deliverability lead"]
        - ["Mass discrepancy for a firm","Many records from same domain show conflicting firmographics","Escalate to data steward; pause related campaigns","Data steward"]
        - ["Explicit do-not-contact or legal flag","Any evidence of opt-out","Block and remove from campaign lists","Compliance owner"]
featured: false
collections: ["list-quality-operations"]
learningPaths: ["list-quality-and-suppression"]
keyTakeaways:
  - "No shared rule exists for when titles, jobs, domains, and firmographics must be rechecked."
  - "A focused task with a separate troubleshooting, implementation, decision, or reference job from the current corpus."
  - "Links freshness to enrichment and campaign QA."
commonMistakes:
  - "Skipping this check: Document the recheck event triggers (pre-send, X days, bounce, low confidence)."
  - "Skipping this check: Define accepted evidence types and a confidence threshold for each."
  - "Skipping this check: Implement an automated pre-send check and label records pass/fail."
faqs:
  - question: "How often should I set the default recheck interval for titles and roles?"
    answer: "A common starting point is 60–90 days for roles in active outreach lists; use shorter intervals for high-turnover industries (e.g., startups) and longer intervals for stable, enterprise roles. Tie the interval to observed turnover in your data and treat provider confidence as directional, not definitive [1]."
  - question: "Can enrichment-provider confidence alone be used to skip manual checks?"
    answer: "No. Provider confidence is useful but imperfect; use it to prioritize and automate but require manual checks for edge cases (low-confidence, high-value accounts, or campaign stop conditions). Treat the provider score as one piece of evidence, not an absolute approval [1]."
  - question: "Does a recheck SLA replace consent and data-sharing obligations?"
    answer: "No. Freshness SLAs govern data accuracy for targeting and qualification, but you must still comply with applicable data protection and transparency obligations when sharing or processing personal data. Use accepted guidance on data sharing as a code of practice for handling lists and transparency [2]."
nextStep:
  label: "Continue with Bounce Webhook Idempotency and Suppression State"
  href: "/repmail/learn/lead-generation/bounce-webhook-idempotency-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Set a clear, team-agreed cadence (and the exceptions) for rechecking titles, jobs, domains, and firmographics before new sends or qualification updates. A practical SLA ties the cadence to data source confidence, contact role volatility, and campaign risk so operators know when to refresh, block, or proceed.

## Decision boundary: when to recheck vs when not to

Define the event set that triggers a recheck: before the first campaign send to a contact, after 90 days since last verification for high-volatility roles, after a bounced domain or returned firmographic mismatch, or when enrichment confidence drops below your threshold. The decision boundary should be binary and documented (recheck required / no recheck required) and reference the evidence you accept (timestamped enrichment, LinkedIn title, company website, CRM update).

Exclude minor changes that don’t affect targeting: if only a seniority adjective changes (e.g., “Senior” to “Sr.”) and the role and domain remain the same, you can treat it as unchanged for outreach purposes. Explicitly list these no-recheck cases so operators can avoid unnecessary refresh cycles.

## Evidence types and minimum confidence levels

Inventory allowed evidence: timestamped third-party enrichment records, authoritative corporate site title pages, public social profiles, and CRM-updated titles with source attribution. For each evidence type, set a minimum confidence threshold (for example: enrichment provider confidence >= X, manual validation stamped by an operator, or domain WHOIS match).

State limits: enrichment providers vary in methodology and accuracy; treat provider confidence as directional evidence, not absolute truth [1]. If evidence is older than your SLA window or lacks a clear timestamp, treat it as stale and re-run verification.

## Practical sequence for rechecking a prospect record

1) Pre-send automated check: run an enrichment lookup and domain health check. If all fields meet confidence thresholds, flag record as good-to-send. 2) Failing automated checks: queue for manual review with annotated failure reasons (e.g., title missing, domain mismatch). 3) Manual review: operator confirms via quick sources (company site, LinkedIn) within a fixed time-box (e.g., 15 minutes) or moves the record to ‘re-verification’ for batch processing.

Include stop conditions: if manual review can’t confirm role or domain within the time-box, mark record as ‘hold’ and exclude from the campaign until verified. Track hold reasons to identify systemic data gaps.

## Exception rules and escalation path

Create explicit exceptions: whitelist accounts (key named accounts) where outreach proceeds with older evidence but subject to different messaging, and high-risk exclusions (GDPR opt-outs, unsubscribes, or explicit do-not-contact flags) that always block sends regardless of freshness.

Define escalation: if a cluster of records from the same firm show stale or conflicting firmographics, escalate to a data steward and pause related campaigns until the anomaly is resolved. Log escalations with root cause (source failure, enrichment provider outage, or ingestion bug) and resolution time.

## Operational metrics and stop conditions

Track these metrics: percent of records passing automated checks, manual review time per record, percent of records on hold, and campaign CVR by freshness band. Set stop conditions for a campaign: e.g., if >10% of the campaign list is on hold for verification after automated checks, pause sending until remediation.

Be clear about evidence limits: these metrics measure operational adherence, not deliverability or business outcomes. Use them to improve the SLA, not to claim causation beyond what your telemetry shows.

## Practical checklist

- [ ] Document the recheck event triggers (pre-send, X days, bounce, low confidence).
- [ ] Define accepted evidence types and a confidence threshold for each.
- [ ] Implement an automated pre-send check and label records pass/fail.
- [ ] Time-box manual validation and log the reviewer and sources used.
- [ ] Create whitelist and block lists with explicit exception rules.
- [ ] Define escalation steps when systemic data issues appear.
- [ ] Instrument metrics: automated pass rate, hold rate, manual review time.
- [ ] Set hard campaign stop conditions based on hold or failure rates.
- [ ] Review and update the SLA quarterly or after a major data-source change.

## Where RepMail fits

Use this document as a checklist and decision aid inside an outbound workflow: codify pre-send checks, automate pass/fail labeling, and route manual verification tasks. The SLA helps your team decide which records to hold, which to send, and when to escalate data issues, reducing wasted sends and mis-targeting without implying specific RepMail product features or guarantees.

Continue with [Bounce Webhook Idempotency and Suppression State](/repmail/learn/lead-generation/bounce-webhook-idempotency-suppression) for the next step in the workflow.

## Related RepMail guides

- [Contact-to-Account Matching When Domains Are Ambiguous](/repmail/learn/lead-generation/contact-to-account-matching-ambiguous-domains)
- [Enrichment Conflict Resolution: Which Value Wins?](/repmail/learn/lead-generation/enrichment-conflict-resolution-prospect-data)


## Sources

[1]: https://trailhead.salesforce.com/content/learn/modules/data-enrichment-fundamentals/define-data-enrichment "Supporting technical or operational reference"
[2]: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/data-sharing-a-code-of-practice/sharing-personal-data-in-databases-and-lists/?search=transparency "UK Information Commissioner guidance"
