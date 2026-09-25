---
product: repmail
academy: outreach
contentType: template
slug: agency-outbound-report-qa-checklist
title: "Agency report QA checklist before client delivery"
description: "Agency report QA checklist before client delivery — Reports expose wrong date ranges, clients, attribution, or suppressed data."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","agency","reporting","report","checklist","client"]
assets:
  - type: table
    title: "Pre-delivery decision/diagnostic table"
    content:
      headers: ["Observed Issue","Immediate diagnostic","Owner","Action","Stop/Pass"]
      rows:
        - ["Report date label differs from filter","Open export/filter timestamps and compare start/end","Report author","Correct filter or relabel; re-export","Stop"]
        - ["Client name/logo mismatch","Compare header to onboarding record and approved brand assets","Account manager","Swap to correct assets; notify client if delivered incorrectly","Stop"]
        - ["Derived metric not reproducible","Trace SQL/calculation and reproduce using source extract","Data engineer","Fix calculation or mark as unverifiable with note","Stop"]
        - ["Suppressed rows present but not disclosed","Compare row counts and suppression logs","Compliance/data steward","Add disclosure and quantify impact; re-run summary metrics if needed","Stop if impact material; otherwise Pass with note"]
        - ["Sampling applied","Check export/sample rate and platform sampling docs","Analyst","Include sample rate and confidence limits in report","Pass with disclosure"]
        - ["Formatting or broken links in deliverable","Open final PDF/dashboard links and click each anchor/table","Designer/producer","Repair broken links, fix exports; regenerate","Pass after fix"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Reports expose wrong date ranges, clients, attribution, or suppressed data"
  - "New pre-delivery control, not reporting content or cutoff guidance."
  - "Link from reporting dictionary to white-label boundaries."
commonMistakes:
  - "Skipping this check: Confirm deliverable type and source-of-truth systems (list names/IDs)."
  - "Skipping this check: Validate displayed date range equals underlying filter timestamps and timezone."
  - "Skipping this check: Verify client name, logo, and recipient list match onboarding record."
faqs:
  - question: "How do I treat timezone differences between analytics and CRM exports?"
    answer: "Identify which system's timezone was requested by the client and use that as the display timezone. If the two systems disagree, show both timestamps or convert one to the client’s agreed timezone and document the conversion method. Consult platform docs for timezone behavior as a directional reference [1]."
  - question: "When is suppressed data 'material' enough to stop delivery?"
    answer: "Use your agency's materiality threshold (a common operational threshold is around 5% of a key metric but agencies should set their own). If suppression changes a client-facing conclusion or recommendation, treat it as material and pause delivery until resolved or disclosed."
  - question: "What minimal evidence should I keep with the delivered report?"
    answer: "Keep the source export files, a short reconciliation log (rows checked and mismatches), the QA checklist with approver name and time, and notes describing any suppressions or sampling applied. Store these artifacts with the report for at least the period your agency retention policy requires."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Do a focused pre-delivery QA pass that verifies date range, client identity, attribution logic, and suppressed or missing data before you send any agency report. Treat this checklist as a stop gate: if any critical item fails, pause delivery, document the failure, and run the corrective workflow described below.

## Scope and decision boundary

Define exactly which deliverable(s) this QA covers (PDF, dashboard export, CSV, or summary email) and which systems provide the source of truth (CRM, analytics, ESP, or internal database). The decision boundary should explicitly exclude upstream data collection fixes; this QA checks transformation, labeling, and packaging for delivery. If upstream collection is broken, tag the report as unreliable and escalate to the data owner.

Evidence limits: only use fields available in the export or dashboard widget you deliver. If a requested metric depends on a calculation not present in the deliverable, add that calculation and its inputs to the QA checklist before proceeding. Sequence: set the scope, identify source-of-truth system, and record the expected data extracts and time zones.

## Date ranges and time zones

Verify the report's displayed date range matches the client's requested range and the action taken (e.g., month-to-date vs. last full month). Confirm both the label and the underlying filter are consistent: a label that reads "Last 30 days" must have the filter set to the same rolling 30-day window. Decision boundary: if visualization widgets use different timezone settings than the exported CSV, treat this as a mismatch.

Practical sequence: confirm requested range from the client brief, open the export filters to validate start/end timestamps, check any aggregations respect the same timezone, and annotate the report with the timezone used. When using analytics platforms, consult platform docs for how they apply time zones to date ranges as a directional reference [1].

## Client identity and white-labeling

Confirm the report is addressed to the correct client entity and contact list. Check that client name, logo, sub-brand, and any whitelabeling comply with the agency’s white-label boundary (who can appear and where). Decision boundary: do not swap names or logos between sibling clients; if the same stakeholder manages multiple accounts, include account identifiers (ID, domain) in the header.

Practical sequence: compare the report header to the client onboarding record, verify the recipient email addresses against the approved contact list, and ensure any client-specific legal or branding copy is present. For multi-client rollups, include a clear per-client breakdown to avoid attribution confusion.

## Attribution and metric definitions

Verify that the report uses the same attribution model and metric definitions agreed with the client (e.g., last-click vs. first-click, multi-touch, or custom rule). Decision boundary: present raw and attributed numbers separately if the raw events and the attribution layer diverge. Always include the definition block for key metrics in the deliverable.

Practical sequence: pull the calculation logic or SQL used for each derived metric, confirm input event counts match source extracts, and cross-check a sample of rows against the source-of-truth system. If you cannot reproduce a derived number from source exports, mark it as unverifiable and escalate.

## Suppressed, missing, and sampled data

Check for suppressed or omitted records (privacy-suppressed emails, suppressed campaigns, or removed segments) and ensure the report lists them or explains their effect. Decision boundary: suppressed data that materially changes results (>5% of a key metric — use agency policy threshold) must be disclosed; smaller amounts may be footnoted. If sampling is applied, disclose sample rates and confidence limitations.

Practical sequence: compare row counts and unique IDs between source export and final deliverable, flag deletions or suppressions, and add a short explanatory note when suppression or sampling could change client interpretation.

## Final checks, ownership, and stop conditions

Assign a named reviewer responsible for each class of check (dates, identity, attribution, suppression, formatting). The stop conditions are: any date mismatch, wrong client identity, untraceable attribution calculations, or undisclosed suppression that alters conclusions. Document the failure reason, corrective action, and the person who cleared the stop gate.

Practical sequence: run the checklist, escalate any stop-condition item to the data owner, complete corrections, re-run affected checks, and capture a timestamped QA approval (name and time). Only then schedule delivery and archive the QA artifacts alongside the report.

## Practical checklist

- [ ] Confirm deliverable type and source-of-truth systems (list names/IDs).
- [ ] Validate displayed date range equals underlying filter timestamps and timezone.
- [ ] Verify client name, logo, and recipient list match onboarding record.
- [ ] Confirm attribution model and include metric definitions used.
- [ ] Compare row counts/unique IDs between source export and deliverable; note suppressions.
- [ ] Disclose sampling rates or suppressed-data impact when material.
- [ ] Run a sample-row reconciliation for 5–10 rows across systems.
- [ ] Record QA approver name, timestamp, and resolution notes for any failures.
- [ ] Hold delivery if any stop-condition (date, identity, attribution, undisclosed suppression) is present.

## Where RepMail fits

Use this checklist as a pre-send control in your outbound-reporting workflow: attach the QA approval and the one-line disclosure summary to the outgoing email or delivery artifact. RepMail users can treat the checklist items as required pre-send steps in their delivery SOPs to reduce correction cycles and protect client trust. Do not assume this document implies RepMail provides automated verification of these checks; it is a decision aid and human control framework.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Client Report Source-Trace Worksheet](/repmail/learn/outreach/client-report-source-trace-worksheet)
- [Client report access controls: prevent one client seeing another](/repmail/learn/outreach/client-report-access-controls-isolation)


## Sources

[1]: https://support.google.com/analytics/answer/9305587?hl=en "Google sender or Workspace documentation"
[2]: https://automattic.com/for-agencies/blog/agency-client-onboarding/ "Supporting technical or operational reference"
