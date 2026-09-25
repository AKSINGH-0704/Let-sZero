---
product: repmail
academy: lead-generation
contentType: template
slug: list-import-qa-required-fields-suppression
title: "List Import QA: Required Fields, Duplicates, and Suppression Checks"
description: "List Import QA: Required Fields, Duplicates, and Suppression Checks — New exports fail because schema, duplicate, and suppression checks happen after import."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["lead-generation","suppression","lead","list","import","required","fields"]
assets:
  - type: table
    title: "Decision / Diagnostic Table — Common import failures and recommended action"
    content:
      headers: ["Failure type","Likely cause","Immediate action","Owner for remediation"]
      rows:
        - ["Missing required field (e.g., email)","Source mapping mismatch or export omitted column","Quarantine file; return remediation CSV; require re-export with correct headers","Data owner / CRM admin"]
        - ["Invalid format (bad email)","Bad export, malformed data, character encoding","Quarantine affected rows; suggest regex/email-normalization; allow re-upload of corrected file","Data owner / Integrations engineer"]
        - ["Intra-file duplicates high (>5%)","Bad dedupe upstream or repeated join","Quarantine and report duplicates; recommend upstream dedupe before re-export; allow sign-off to drop duplicates","Data owner / Ops lead"]
        - ["Suppressed (unsubscribe/global block)","User opted out or hard bounce flagged previously","Remove/quarantine rows; include suppression reason and legal/regulatory note; require legal/data ops review if unsure","Compliance / Data ops"]
        - ["Unknown headers or schema mismatch","Different export template or renamed columns","Reject file; provide mapping guide and example CSV; request re-export","Data owner"]
        - ["Cross-system duplicates (matched existing prospects)","Same contact already in active outreach lists","Flag as duplicate; depending on policy: drop, merge, or fail with owner sign-off","Campaign owner / CRM admin"]
featured: false
collections: ["list-quality-operations"]
learningPaths: ["list-quality-and-suppression"]
keyTakeaways:
  - "New exports fail because schema, duplicate, and suppression checks happen after import."
  - "A focused task with a separate troubleshooting, implementation, decision, or reference job from the current corpus."
  - "Links sourcing to campaign handoff."
commonMistakes:
  - "Skipping this check: Create and publish the exact target schema with required vs optional fields and example rows."
  - "Skipping this check: Implement header normalization (trim, lowercase, canonical names) and reject unknown headers automatically."
  - "Skipping this check: Run intra-file duplicate detection (exact match then canonicalized email) and produce de-dupe counts before proceeding."
faqs:
  - question: "Can I allow files with some missing optional fields to import?"
    answer: "Yes—mark fields explicitly optional in the published schema and allow imports that only miss optional fields. Required fields must be present. For optional fields that downstream logic depends on, document behaviour (e.g., blank first_name will use fallback token). If missing optional data could cause campaign defects, treat those rows as quarantined instead."
  - question: "If the preflight flags many duplicates, should I always reject the file?"
    answer: "Not always. Use a threshold policy: if duplicates exceed an agreed percentage (example: 5%), fail the import and require remediation. For lower duplicate rates, you may permit automatic dropping and log the action, but only with prior documented owner consent and traceable audit logs."
  - question: "Do suppression checks satisfy legal requirements for data sharing?"
    answer: "Suppression checks are an operational control but not a substitute for legal advice. They help enforce opt-outs and blocklists. For legal or jurisdictional questions (e.g., GDPR data-sharing transparency), consult legal counsel; guidance on data sharing transparency is directional in public resources [1]."
nextStep:
  label: "Continue with Bounce Webhook Idempotency and Suppression State"
  href: "/repmail/learn/lead-generation/bounce-webhook-idempotency-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Direct answer: Validate schema, duplicates, and suppressions before import by running a lightweight preflight that rejects records missing required fields, normalizes keys, detects intra-file duplicates, and applies suppression lists (unsubscribe, global blocks, CRM segments). This prevents failed exports and launch delays by surfacing errors early and returning clear remediation actions to the data owner.

## Define required fields and the decision boundary

List the exact fields your campaign export consumer expects and the acceptable data types/formats (e.g., email, first_name, last_name, account_id, consent_flag). The decision boundary is strict: records missing any required field or failing type/format validation should be quarantined before import, not accepted and validated later. Explain limits: this guide assumes the export consumer is schema-strict; if your downstream system tolerates nulls for some fields, mark those optional and document why.

Practical sequence: produce a mapping table of source columns to target fields, then run a header normalization pass that trims whitespace, lowercases keys, and rejects unknown headers. Stop condition: only files whose headers and required-field validations pass proceed to duplicate and suppression checks.

## Run duplicates checks early and choose scope

Decide duplicate scope up-front: intra-file (exact duplicates inside the uploaded file), cross-file within the same export batch, and cross-system (against active prospects or prior-sent lists). The practical sequence is to run fast, deterministic checks in this order: intra-file exact match on primary key(s) (email or account_id), canonicalized de-dupe (normalize email case, strip plus-tags), then a cross-system probe if you have a lookup index.

Evidence limits: cross-system de-dupe requires a maintained index or API access and may be slow; if unavailable, flag suspected duplicates and quarantine instead of silently dropping records. Stop condition: if duplicate rate exceeds an agreed threshold (e.g., >5% of file), fail the import and require owner sign-off.

## Apply suppression and consent checks before import

Define suppression lists to include unsubscribes, hard bounces, global blocks, Do Not Contact segments, and any regulatory/region-based blocks. The decision boundary: suppression is a hard reject—records matching a suppression entry should be removed or quarantined prior to final import. Cite guidance that organizations must handle personal-data sharing and transparency appropriately when applying list controls [1].

Practical sequence: normalize identifying fields used for suppression lookups (email, phone, crm_id), perform exact and canonicalized matches, and add a suppression-reason tag to each removed record. Evidence limits: the records you suppress may be subject to provider policies and legal rules; consult your privacy/legal teams for jurisdictional obligations.

## Error reporting, remediation workflow, and stop conditions

For each quarantined record produce machine-readable failure codes (missing_field, invalid_format, duplicate_in_file, duplicate_existing, suppressed_unsubscribe, suppressed_global_block) and a human-friendly CSV with the offending row and remediation hints. Decision boundary: an import should be considered failed if any record triggers a required-field or suppression hard-fail; duplicates can be policy-driven (auto-drop vs fail).

Practical sequence: reject the file with a summary (counts by failure code) and attach the remediation CSV. Define stop conditions: import blocked until either owner corrects the source and re-uploads or signs off to accept auto-dropped duplicates (explicit, logged consent). Keep retention of rejected files short and auditable.

## Implementation checklist and automation points

Automate the preflight as a lightweight pipeline: header normalization, schema validation, duplicate detection, suppression matching, and report generation. Decision boundary: automations should be idempotent and provide clear transaction IDs for each run so retries and audits are traceable.

Evidence limits: integration depth with CRMs, suppression stores, or provider APIs varies by vendor. If a vendor API is used for suppression checks, state the uncertainty: API behavior, rate limits, and matching logic may change and should be validated during implementation.

## Practical checklist

- [ ] Create and publish the exact target schema with required vs optional fields and example rows.
- [ ] Implement header normalization (trim, lowercase, canonical names) and reject unknown headers automatically.
- [ ] Run intra-file duplicate detection (exact match then canonicalized email) and produce de-dupe counts before proceeding.
- [ ] Lookup suppression lists (unsubscribe, global blocks, hard bounces, CRM DNC) using normalized identifiers and remove/quarantine matches with reason codes.
- [ ] Generate a remediation CSV with failure codes and row-level comments; return this to the data owner when rejecting a file.
- [ ] Abort import if any required-field or suppression hard-fail exists; allow explicit owner sign-off only for acceptable duplicate handling.
- [ ] Log every preflight run with transaction ID, input checksum, and summary counts for audit and troubleshooting.
- [ ] If cross-system de-dupe is required, rate-limit lookups and surface suspected duplicates rather than silent drops if index access fails.

## Where RepMail fits

Use this guide as a checklist and decision aid in your outbound workflow: run the preflight before handing lists to campaign engines, attach the remediation CSV to failed imports, and store preflight logs with transaction IDs so campaign handoff is auditable. This reduces avoidable launch defects and clarifies who fixes what without implying any specific RepMail product capability.

Continue with [Bounce Webhook Idempotency and Suppression State](/repmail/learn/lead-generation/bounce-webhook-idempotency-suppression) for the next step in the workflow.

## Related RepMail guides

- [Firmographic Segmentation: Choose Fields That Change the Motion](/repmail/learn/lead-generation/firmographic-segmentation-fields-sales-motion)
- [List Sourcing Decision Tree: Build, Buy, Partner, or Reuse](/repmail/learn/lead-generation/list-sourcing-decision-tree-build-buy-reuse)


## Sources

[1]: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/data-sharing-a-code-of-practice/sharing-personal-data-in-databases-and-lists/?search=transparency "UK Information Commissioner guidance"
[2]: https://support.google.com/a/answer/81126 "Google sender or Workspace documentation"
