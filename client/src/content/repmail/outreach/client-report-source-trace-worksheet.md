---
product: repmail
academy: outreach
contentType: template
slug: client-report-source-trace-worksheet
title: "Client Report Source-Trace Worksheet"
description: "Client Report Source-Trace Worksheet — Agencies need to tie each reported metric to source system, time zone, filters, definitions, and caveats."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","agency","reporting","client","report","source"]
assets:
  - type: table
    title: "Decision / Diagnostic Table: When numbers disagree"
    content:
      headers: ["Symptom","Likely cause","Immediate check","Stop/Next step"]
      rows:
        - ["Reported metric differs from client UI","Different snapshot time or timezone","Compare export timestamps and timezone settings","If mismatch, re-extract with aligned settings and record both versions"]
        - ["Totals change after filtering","Duplicate removal or suppression applied inconsistently","Compare raw and post-filter row counts and review filter logic","Attach filter script and re-run; if intentional, document rationale"]
        - ["Open rate anomalously high/low","Tracking pixel blocked or multiple open signals","Check unique opens vs total opens and known provider tracking notes","Mark as provider-dependent assumption and document alternative engagement metrics"]
        - ["Clicks present with zero opens","Clicks recorded by redirect while open not recorded","Verify click export and check attribution rules in ESP","Document inference method and surface to client if material"]
        - ["Bounce count mismatch","Different bounce classification or time window","Compare bounce event timestamps and bounce-type mapping","Use raw bounce export and map types consistently; document mapping"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Agencies need to tie each reported metric to source system, time zone, filters, definitions, and caveats."
  - "Distinct from client-facing reporting: QA layer proving how numbers were assembled."
  - "measurement retention; client reporting"
commonMistakes:
  - "Skipping this check: For each metric, record: source system, account/workspace, source object ID (campaign/segment/report)."
  - "Skipping this check: Record the exact export or query timestamp and the timezone used by the source system."
  - "Skipping this check: Attach raw export file and filtered/aggregated version; include before/after row counts."
faqs:
  - question: "How granular must the ‘source object’ ID be?"
    answer: "Record the smallest object that reproduces the reported metric. For single campaigns, include campaign ID; for cohorts, include segment or list ID plus the exact query or filter used. If multiple objects were combined, list each with the aggregation rule."
  - question: "If an ESP changes how they report a metric, how should that be recorded?"
    answer: "Treat the provider change as a new version: add a worksheet row noting the provider change, the effective date, and a comparison of the prior and new values for a sample dataset. Mark historical reports as ‘computed under prior definition’."
  - question: "Can I store PII in this worksheet?"
    answer: "Avoid PII in the internal worksheet unless strictly necessary for verification and access-controlled. If PII is required, store it encrypted and note its use-case, retention period, and an authorized reviewer. Do not include PII in client-facing summaries."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Tie every reported metric to an auditable origin: system, extraction time, timezone, filters, definition, and caveats. This worksheet is a QA layer for agency reporting—designed to prevent disputes by recording how numbers were produced and who validated them.

## What this worksheet is for

Use this document to record the exact provenance of each client metric that appears in a report. The goal is not to simplify metrics for clients but to provide an internal, verifiable trail that shows how a value was derived, including any exclusions or normalization steps.
Decision boundary: store only fields needed to reproduce the number, not every internal note. Evidence limits: capture links to queries, dataset snapshots, or export files; don’t rely on memory or paraphrase for filter logic. Practical sequence: for each metric row, fill source system, raw object (campaign/list/segment), query or export name, and snapshot timestamp.

## Required fields and why they matter

Source system: the platform (ESP, CRM, analytics) where the raw event or counter originates. Record vendor and product name and the account ID or workspace to avoid ambiguity. Timezone and snapshot: record the timezone used by the source and the exact timestamp of any export or query run so the same dataset can be re-created.
Filters and transformations: list the filters applied (e.g., suppression list removed, duplicate recipients deduplicated by email) and any transformation rules (e.g., mapping custom status codes to standardized outcomes). Always attach the query or export file. Owners and verification: assign an owner who ran the extraction and a verifier who checked the export against the source system.

## Definitions, edge cases, and caveats

Provide a precise definition for each metric (one sentence) and list exceptions. For example: Open Rate = unique opens / delivered (delivered = accepted by ESP AND not bounced by destination). If you can’t define a metric unambiguously, flag it for review before sharing with a client.
Note provider-specific uncertainty: ESP definitions, open tracking accuracy, and inbox-level events can vary by vendor and over time; state where you are making an assumption versus recording a vendor-stated metric. When a metric depends on inferred behavior (e.g., click-to-open), explain inference method and its known limitations.

## Common failure modes and checks

Mismatch of timezone or snapshot: a common cause of apparent metric drift between periods. Check that the report viewport and the source export used the same timezone and that daylight savings differences were accounted for.
Partial exports, deduplication errors, and inconsistent filter application: verify row counts before and after filtering and include those counts in the worksheet. If discrepancies appear, retain the original export and the filtered version to show the transformation steps and facilitate rollbacks.

## Practical workflow to produce the worksheet

1) Prepare: choose the metrics to report and identify the source objects (campaign IDs, segment IDs, report IDs). 2) Extract: run the export or query, note the exact timestamp, timezone, and any query parameters; save the raw file with a deterministic filename. 3) Transform: apply filters and mapping rules in scripts or spreadsheets; record each step with before/after counts and attach the script/export used. 4) Verify: a second person runs a cross-check against the source UI or API; note verifier, time, and any discrepancies resolved.
Stop condition: only sign off when the verifier reproduces the reported numbers from the saved raw export and transformation transcript.

## How to present this to clients (internal QA vs client-facing)

This worksheet is internal: provide a client-facing summary but retain this document as the authoritative audit trail. The client summary should show the metric and a short definitional line; the worksheet contains the evidence to back it up.
Decision boundary: do not include raw SQL, account credentials, or PII in the client-facing deliverable; include a sanitized excerpt or a statement such as “Derived from Campaign ID 1234 exports (internal workbook on file).”

## Practical checklist

- [ ] For each metric, record: source system, account/workspace, source object ID (campaign/segment/report).
- [ ] Record the exact export or query timestamp and the timezone used by the source system.
- [ ] Attach raw export file and filtered/aggregated version; include before/after row counts.
- [ ] Document every filter/transformation rule with enough detail to re-run (query text or script).
- [ ] Assign an owner (extract) and a verifier (cross-check) with timestamps and signatures/comments.
- [ ] Note precise one-line metric definitions and list known caveats or assumptions.
- [ ] Flag provider-dependent assumptions (tracking pixel behavior, inferred events) and mark as ‘assumption’ in the worksheet.
- [ ] Retain at least one snapshot of the source system UI screen or API response for the export used.
- [ ] When sharing with clients, provide a sanitized summary and link the internal worksheet location.

## Where RepMail fits

Use this worksheet as an internal QA checklist before publishing any outbound performance summary. For outbound teams, keep one completed worksheet per send cadence (daily/weekly/campaign) so pipeline owners can defend numbers during client questions. This guide does not imply RepMail offers a built-in worksheet feature; treat it as a process and file-format recommendation to integrate into your existing outbound reporting workflow.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Agency report QA checklist before client delivery](/repmail/learn/outreach/agency-outbound-report-qa-checklist)
- [Client report access controls: prevent one client seeing another](/repmail/learn/outreach/client-report-access-controls-isolation)


## Sources

[1]: https://www.campaignmonitor.com/blog/email-marketing/email-campaign-preflight-checklist/ "Supporting technical or operational reference"
