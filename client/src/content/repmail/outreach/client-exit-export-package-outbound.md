---
product: repmail
academy: outreach
contentType: template
slug: client-exit-export-package-outbound
title: "Client exit: export reports, suppressions, and decision history"
description: "Client exit: export reports, suppressions, and decision history — Clients receive assets but not the operational history needed to continue."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","agency","client","exit","export"]
assets:
  - type: table
    title: "Decision/diagnostic table — choose export format and verification step"
    content:
      headers: ["Situation","Recommended export format","Minimum verification","Stop condition"]
      rows:
        - ["Recipient needs spreadsheet access","CSV (per-day or per-campaign)","Open sample file, verify headers and 10 sample rows","Client confirms sample rows match expectations"]
        - ["Data warehouse ingestion","NDJSON or compressed Parquet","Load sample file into staging, validate schema","Row counts and a small subset of events reconcile"]
        - ["Security/PII restrictions","Hashed emails or suppression API with proof-of-transfer","Confirm hash algorithm and provide transfer log","Legal sign-off or documented inability to export raw PII"]
        - ["Missing rule history in provider","Export decision history with rule_id and input_signals, mark gaps","Compare sample decisions against known cases","Accept manifest note that exact replay may be impossible"]
        - ["Large dataset (>100M rows)","Partitioned CSV/Parquet with checksums","Validate partition checksums and sample rows","All partitions validated and checksums match"]
        - ["Client intends to resume sending","Include suppression origin and last_processed timestamp","Run a dry import to their system and confirm no duplicates","Successful dry-run and suppression import verified"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Clients receive assets but not the operational history needed to continue"
  - "New export schema; existing offboarding covers handover broadly."
  - "Link to reporting dictionary, suppression governance, and retention."
commonMistakes:
  - "Skipping this check: Confirm final cutoff timestamp and record it in the manifest."
  - "Skipping this check: Agree export schema with client owners (operations, legal, analytics) before extraction."
  - "Skipping this check: Export per-message report rows with UTC timestamps and outcome codes."
faqs:
  - question: "What format should I provide if the client uses Google Analytics for campaign attribution?"
    answer: "Provide the export with campaign_id and UTM parameters intact (utm_source, utm_medium, utm_campaign). For client-side or analytics joins reference Google Analytics guidance for import/export; this is directional and not a substitute for the client's analytics configuration [2]."
  - question: "Can I exclude personal data from the export and still give a usable handover?"
    answer: "Yes, but exclude personal data only after confirming downstream needs. Alternatives: provide hashed email addresses with the hash algorithm, or supply an API endpoint that can be queried for re-identification when legally permitted. Document the limitation in the manifest and include mapping instructions if a temporary re-identification key will be used."
  - question: "Do I need to export aggregate dashboards as well?"
    answer: "Exporting dashboards can be helpful but is insufficient on its own. Include dashboards as PDFs or image captures for context, but always pair them with the row-level exports (per-message events and decision/suppression tables) so recipients can reconcile metrics to raw data."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Provide a single, verifiable export package that includes raw reports, suppression data, and decision history so the client can operate or audit campaigns after engagement ends. Focus exports on the operational fields that downstream teams need (metrics with timestamps, suppression reasons and source, and per-message decision logs), document the export schema, and record any known gaps or retention limits.

## What to include and why

Decide the minimum export set by asking: what does the client need to run, measure, or audit campaigns without your platform? At minimum produce: raw report rows (per-send/per-recipient with timestamps and outcome codes), suppression lists (address, suppression-type, source, created_at, removed_at), and decision history (rule triggers, rule-version, timestamp, and resulting action). The decision boundary is operational continuity — do not include marketing creative or dashboards alone; those are insufficient without row-level events and suppression provenance.
Evidence limits: some provider logs may be transient or aggregated; state those gaps in the export manifest. Practical sequence: inventory available tables, map fields to the export schema, and confirm with the client which downstream owners require which fields before generation.

## Export schema and field-level guidance

Use a simple CSV/NDJSON schema per asset type so recipients can ingest into spreadsheets or data warehouses. For reports include: message_id, recipient_email, campaign_id, send_timestamp (UTC ISO8601), event_type (send, delivery, bounce, open, click), event_timestamp, smtp_response (if applicable), and delivery_score (if available). For suppressions include: email, suppression_type (hard_bounce, complaint, manual, unsubscribe), source (system, client_ui, import), created_at, removed_at, and notes.
Decision history should be exported as a separate table with: message_id, decision_timestamp, rule_id, rule_version, input_signals (compact JSON), decision_outcome (allow, suppress, throttle), and operator (automation, user:email). Note limits: some providers truncate input_signals or omit historical rule_version; flag these fields in the manifest.

## Practical export sequence and verification

1) Freeze data window: choose a final cutoff timestamp and record it in the manifest. 2) Generate exports in reproducible batches (by day or campaign) and include a checksum (MD5/SHA256) per file. 3) Validate row counts against live dashboard aggregates and document any reconciliation deltas.
Decision boundary: stop when exports match agreed row-level acceptance tests (sampleed rows and total counts). Evidence limits: if access to raw SMTP logs or provider-specific decision traces is restricted, document this as a gap and identify the nearest proxy fields. Provide a short reconciliation report listing mismatches and reasons.

## Suppression governance and transfer rules

Treat suppressions as the highest-priority operational handover item because downstream senders must not re-send to suppressed addresses. Export suppression state with provenance and timestamps. If policy or law prevents exporting personal data, document that and provide a machine-readable suppression API endpoint or a hashed list as an alternative.
If suppressions were applied by rule automation, include the rule_id and triggering_event in the suppression export. Decision boundary: transfer the authoritative suppression set only once and record the transfer event in the manifest. If the receiving party cannot consume the format, provide transformation scripts or a simple loader with examples.

## Decision history: what it enables and its limits

Decision history lets a client reconstitute why messages were suppressed, throttled, or routed to a particular template — important for audit and reproducing behaviour. Export lightweight input_signals and rule_version so a downstream team can test whether their rules would produce the same outcome.
Limits and uncertainty: not all platforms preserve historical rule code or full signal payloads; in those cases indicate that reproducing exact decisions may not be possible and provide the closest approximations (timestamps, rule_id, sample events). State these limitations clearly in the manifest and recommend owners for follow-up investigations.

## Practical checklist

- [ ] Confirm final cutoff timestamp and record it in the manifest.
- [ ] Agree export schema with client owners (operations, legal, analytics) before extraction.
- [ ] Export per-message report rows with UTC timestamps and outcome codes.
- [ ] Export suppression list with source, created_at, removed_at, and provenance fields.
- [ ] Export decision history with rule_id, rule_version, input_signals, and outcome.
- [ ] Generate file checksums and a reconciliation report vs dashboard aggregates.
- [ ] Document any gaps (truncated logs, unavailable rule history) in the manifest.
- [ ] Provide ingestion helper (CSV examples or simple script) for the recipient.
- [ ] Log the transfer event and retain a copy per your retention policy.

## Where RepMail fits

Use this article as a checklist and decision aid during outbound handoffs. RepMail operators can map the recommended export schema to their workflow, ensure suppressions are prioritized in the export, and attach the manifest and reconciliation report to the offboarding package. Do not assume platform-specific export behavior; validate field availability and retention with your provider before finalizing the package.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Agency permission matrix for client, contractor, and vendor roles](/repmail/learn/outreach/agency-permission-matrix-client-contractor-vendor)
- [Agency report QA checklist before client delivery](/repmail/learn/outreach/agency-outbound-report-qa-checklist)


## Sources

[1]: https://www.trychaser.com/checklist-articles/client-offboarding-checklist-for-agencies "Supporting technical or operational reference"
[2]: https://support.google.com/analytics/answer/9305587?hl=en "Google sender or Workspace documentation"
