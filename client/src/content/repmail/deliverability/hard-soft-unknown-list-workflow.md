---
product: repmail
academy: deliverability
contentType: guide
slug: hard-soft-unknown-list-workflow
title: "Hard, Soft, and Unknown Outcomes: A Three-Lane List Workflow"
description: "Hard, Soft, and Unknown Outcomes: A Three-Lane List Workflow — Operators need separate queues for permanent failures, temporary failures, and unresolved verifi."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability","suppression","list","hard","soft","unknown"]
assets:
  - type: table
    title: "Decision and diagnostic table: lane actions and stop conditions"
    content:
      headers: ["Trigger observed","Initial lane","Immediate action","Owner","Stop condition/next step"]
      rows:
        - ["SMTP 550 / 5xx permanent bounce","Hard","Suppress immediately; tag and archive raw bounce","Deliverability","Require explicit opt-in or manual remediation to reactivate"]
        - ["SMTP 4xx transient or mailbox full","Soft","Queue for retry with backoff; mark retry count","Outbound Ops","Escalate to Hard after retry threshold or move to Unknown for verification"]
        - ["Verification API: valid","Not Unknown/Active","Mark Active; remove from Unknown or cancel planned retries","Data Quality","Treat as Active until new failure observed"]
        - ["Verification API: invalid/role-based","Hard or Suppress","Suppress or tag as role-based per policy","Data Quality","Immediate suppression for confirmed role boxes"]
        - ["Verification API: inconclusive/no-response","Unknown","Run secondary verification; stage in low-risk re-engagement","Data Quality","If unresolved after X days, escalate per policy"]
        - ["Provider suppression list hit (e.g., SES)","Hard","Respect provider suppression; do not send through that provider","Deliverability","Use provider guidance for reactivation; log provider evidence"]
featured: false
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
keyTakeaways:
  - "Operators need separate queues for permanent failures, temporary failures, and unresolved verification."
  - "Existing bounce definitions and unknown-status topics do not combine the three lanes into one operational queue."
  - "Link to bounce-code routing and verification status pages."
commonMistakes:
  - "Skipping this check: Implement a canonical lane field (Hard/Soft/Unknown) in your recipient table with timestamp and reason."
  - "Skipping this check: Define owners and change-authorizations for each lane (Deliverability, Outbound Ops, Data Quality)."
  - "Skipping this check: Build a bounce-normalizer that extracts SMTP code, verbatim message, and provider suppression flags."
faqs:
  - question: "How long should I retry soft bounces before treating them as permanent?"
    answer: "Use a defined retry window based on your sending cadence and risk tolerance. A common operational pattern is 3–7 attempts over 7–21 days with exponential backoff and monitoring. If an address generates persistent transient failures across campaigns and retries, escalate to Hard or require a verification check; document the exact threshold in your SOPs."
  - question: "Can I rely solely on verification vendors to move addresses out of Unknown?"
    answer: "No. Verification vendors provide directional evidence; their inconclusive or stale results should trigger secondary checks or human review [1]. Use verification as part of the evidence set, combined with bounce history and provider suppression lists, before changing lane status."
  - question: "What if a provider’s suppression list disagrees with my internal lane?"
    answer: "Treat provider suppression lists as authoritative for sends through that provider and avoid sending through them to reconcile the disagreement [2]. Log the discrepancy, notify the lane owner, and follow documented remediation (appeal to provider, request suppression removal, or accept permanent suppression depending on evidence)."
nextStep:
  label: "Continue with Provider-Specific Deliverability Triage: Gmail, Microsoft, and More"
  href: "/repmail/learn/deliverability/provider-specific-deliverability-triage"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Separate your list-processing into three operational lanes—Hard (permanent failures), Soft (temporary failures), and Unknown (unverified or unresolved addresses)—and enforce clear stop conditions, owners, and requeue rules for each. This keeps you from over-suppressing good contacts while avoiding repeated sends to permanent bounces or ambiguous addresses. Below are actionable rules, decision boundaries, and a compact diagnostic table to implement the workflow in your outbound operations.

## Define the three lanes and owners

Decision boundary: Hard = addresses that have returned permanent bounce signals (user unknown, 5xx mailbox unavailable, or explicit suppression). Soft = temporary bounce signals (4xx transient errors, greylisting, mailbox full). Unknown = addresses lacking recent verification or with inconclusive verification results. Evidence limits: Bounce classification depends on your inbound bounce feed and parsing rules; verification vendors may use different verdicts and confidence bands [1]. Practical sequence: Assign an owner for each lane—Deliverability for Hard, Outbound Ops for Soft, Data Quality for Unknown. Document who may change status and under what evidence (e.g., parsed SMTP code, vendor verification score).

## Hard lane: Stop conditions and archival

Decision boundary: Move an address to Hard when you observe a clear permanent SMTP bounce (5xx codes such as 550/551) or an explicit suppression (recipient complaints, provider suppression list) confirmed by your bounce-parsing logic. Evidence limits: SMTP codes are provider-influenced and can be ambiguous; treat explicit provider suppression lists as authoritative for that provider [2]. Practical sequence: Immediately remove Hard addresses from active sends, tag them in your database, place them in a retention archive, and only allow reactivation via a documented remediation (explicit opt-in, manual verification, or mailbox-owner confirmation). Track the timestamp and original bounce payload for audit.

## Soft lane: retry windows and escalation

Decision boundary: Classify as Soft when receiving transient (4xx) SMTP responses, mailbox full notifications, or temporary DNS/timeouts. Evidence limits: Multiple repeated transient failures over different campaigns may indicate underlying permanence; use thresholds rather than single events. Practical sequence: Implement a retry window (for example, 3–7 attempts over 7–21 days depending on cadence). If the address continues to generate soft bounces beyond your retry threshold, escalate to Hard or Unknown for verification depending on bounce text and vendor verification results. Ensure retries are rate-limited and tracked with backoff to avoid provider throttling.

## Unknown lane: verification, human review, and staging

Decision boundary: Place addresses into Unknown when verification tools return inconclusive results, when you lack recent verification (e.g., older than X months), or when parsing fails for an inbound report. Evidence limits: Verification APIs differ in methodology and confidence scoring; consider third-party verification as directional evidence, not absolute proof [1]. Practical sequence: Run an automated re-verification or secondary vendor check, then stage addresses in a low-risk suppression test or a one-off re-engagement campaign with tracking. If verification resolves positively, reclassify to Active; if still inconclusive after a set period (e.g., 14 days) move to Soft retries or Hard depending on additional telemetry.

## Operational sequencing, tooling, and audit trails

Decision boundary: The control point for lane assignment should be your bounce-processor or data pipeline that ingests bounces, verification results, and suppression-lookups. Evidence limits: Provider-specific suppression lists and verification outputs have different semantics; your pipeline must normalize these before action. Practical sequence: 1) Ingest and normalize signals; 2) Apply lane assignment rules; 3) Trigger workflow (stop send, schedule retry, request verification); 4) Log events (timestamp, raw payload, decision reason, owner). Maintain an audit table with the raw bounce/verification payload to support appeals and remediation.

## Integration tips and linking to policy pages

Decision boundary: Use provider suppression lists and verification APIs as inputs, not single-source final decisions—treat them as evidence buckets and codify overrides. Evidence limits: AWS SES suppression list entries and verification products each have their own update cadence and retention rules [2][1]. Practical sequence: Map provider signals to your internal lane taxonomy; create a documented link to provider-specific routing rules (for example, route SES suppression hits directly to Hard). Add a daily reconciliation job that reconciles your lanes against provider suppression exports to catch missed or delayed signals.

## Practical checklist

- [ ] Implement a canonical lane field (Hard/Soft/Unknown) in your recipient table with timestamp and reason.
- [ ] Define owners and change-authorizations for each lane (Deliverability, Outbound Ops, Data Quality).
- [ ] Build a bounce-normalizer that extracts SMTP code, verbatim message, and provider suppression flags.
- [ ] Set a retry policy for Soft (e.g., up to 5 attempts across 14 days with exponential backoff).
- [ ] Run automated verification for Unknown addresses within 72 hours and re-run after any failed send sequence.
- [ ] On Hard classification, suppress immediately from active sends and archive evidence for 90+ days for audit.
- [ ] Create escalation thresholds: soft-to-hard after N failed retries or conflicting verification results.
- [ ] Reconcile lanes daily with provider suppression lists and verification vendor exports.
- [ ] Log all lane transitions with raw payloads, decision rationale, and actor (system or person).

## Where RepMail fits

Use this guide as a checklist and decision aid when building or auditing your outbound list-processing pipeline. The three-lane model maps to practical system actions (suppress, retry, verify) and makes it easier to automate lane transitions, assign owners, and create audit trails. Do not infer that RepMail automates these steps; instead, adapt the checklist and decision table to your tooling and processes.

Continue with [Provider-Specific Deliverability Triage: Gmail, Microsoft, and More](/repmail/learn/deliverability/provider-specific-deliverability-triage) for the next step in the workflow.

## Related RepMail guides

- [Deduplicate Before Verification: Prevent Wasted Checks and Conflicting Results](/repmail/learn/deliverability/deduplicate-before-email-verification)
- [Disposable Email Detection at Signup Versus Bulk Import](/repmail/learn/deliverability/disposable-detection-point-of-capture)


## Sources

[1]: https://docs.clearout.io/email-verifier/overview "Supporting technical or operational reference"
[2]: https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html "Amazon SES developer documentation"
