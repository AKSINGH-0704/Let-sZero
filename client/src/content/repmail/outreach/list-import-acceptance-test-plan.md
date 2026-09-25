---
product: repmail
academy: outreach
contentType: tutorial
slug: list-import-acceptance-test-plan
title: "List Import Acceptance Test Plan"
description: "List Import Acceptance Test Plan — Teams need test rows and expected outcomes for headers, encoding, delimiters, empty values, status fields, and suppression j."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","list","import","acceptance","plan"]
assets:
  - type: table
    title: "Import Acceptance Decision Table"
    content:
      headers: ["Condition","Test input","Expected detection/result","Action"]
      rows:
        - ["Required header present","Header row uses 'email' exactly","Detected as required join key; parse proceeds","Pass"]
        - ["Encoding ambiguous","File contains mixed byte sequences (UTF-8 + ISO-8859-1 chars)","Importer reports ambiguous encoding","Fail: correct encoding and re-run"]
        - ["Delimiter inside quotes","Field contains a comma inside quotes in CSV","Parsed as single field value including comma","Pass if quoting respected; otherwise fail"]
        - ["Empty email value","Row with blank email column","Row rejected or held; error logged","Fail: fix source data"]
        - ["Suppression join match","Email present in suppression fixture","Row marked suppressed or rejected per policy","Pass if policy observed; otherwise fail"]
        - ["Status field unknown","Status='bouncey' (unrecognized)","Flagged as unknown and held for mapping","Fail/hold until mapped"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Teams need test rows and expected outcomes for headers, encoding, delimiters, empty values, status fields, and suppression joins."
  - "Distinct from CSV formatting and quarantine topics: validates the full import contract before production."
  - "CRM sync; suppression import; preflight QA"
commonMistakes:
  - "Skipping this check: Build a 12–18 row test file covering normal and edge cases (empty email, quoted delimiter, BOM variants)."
  - "Skipping this check: Include explicit expected parsed-output file (field → expected normalized value) for automated diffs."
  - "Skipping this check: Verify required headers are exact or mapped; flag any missing/misspelled required header."
faqs:
  - question: "How many test rows are enough?"
    answer: "12–18 rows is a practical balance: include representative normal rows plus edge cases (empty email, quoted delimiters, BOM/encoding variants, conflicting status and suppression). The objective is full-path parsing coverage rather than large volume."
  - question: "If encoding detection differs from my expectation, what should I do?"
    answer: "Treat detection discrepancy as a blocker. Confirm the source encoding with the upstream system, save a corrected file (or set explicit encoding/delimiter parameters in the importer), and re-run the acceptance test. Do not proceed to production until the parsed outputs match the expected results."
  - question: "When should I accept a row that matches suppression?"
    answer: "Accepting a suppressed row depends on policy: either reject at import, import but mark suppressed, or import and prevent sends. The acceptance test must verify the configured behavior. If the importer does not enforce your policy, treat that as a failure and require an operational control or code change before production."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Run a deterministic import acceptance test before any production list ingestion. The plan below gives concrete test rows, expected parsing outcomes, and stop conditions for headers, encodings, delimiters, empty values, status fields, and suppression joins so operators can validate the full import contract and avoid silent field shifts or unsafe sends.

## Objective and decision boundary

Define the acceptance test goal: verify the platform’s parser and your integration agree on field mapping, value normalization, and join keys for suppression and status fields. The decision boundary for this test is strictly at import-time parsing and mapping; it does not validate downstream deliverability, campaign content, or third-party suppression lists themselves.
Limit evidence to what the import produces: the parsed field names, sample parsed values, detected encoding, delimiter, row count, and any error/warning messages. Stop and fix when parsed headers or key fields (email, status, suppression key) differ from the expected contract.

## Test dataset and row-level expectations

Create a small CSV/TSV with 12–18 rows covering edge cases: normal rows, empty values, quoted delimiters, non-UTF8 bytes, BOM presence, alternate delimiters, and conflicting status values. Each row must include the canonical join key used for suppression (email or external_id), and the specific status field your system respects (e.g., status, subscription_status, consent).
For each row define the expected parsed output (field name → value, normalized status, whether row should be rejected, and whether it should match a suppression join). Keep a machine-readable fixture and a human-readable expected-results file side-by-side for quick diffing.

## Headers, encoding, and delimiters — detection rules and tests

Header rules: test exact-match header mapping and header-case insensitivity. Include a row with an extra unexpected header and one with a missing optional header to validate defaulting behavior. Stop if required headers (email or configured join key) are not present or are mis-spelled.
Encoding and delimiter rules: include files encoded as UTF-8, UTF-16LE, and ISO-8859-1 with and without BOM. Provide examples using comma, tab, and pipe delimiters and a file where fields contain the delimiter inside quotes. The importer should report detected encoding and delimiter; if detection is ambiguous, treat as a failure until operator confirms the correct settings.

## Empty values, normalization, and status fields

Test empty values in important fields: empty email (row should be rejected), empty name (allowed), and empty status (should default per import contract). Define how to interpret status field variants (e.g., "unsubscribed", "opt-out", "do_not_mail", "blocked"): map them to canonical states or flag unknown values for manual review.
Normalize common variants: trim whitespace, strip non-visible characters, lower-case emails, and normalize date formats if present. Declare stop conditions: any normalization that changes the join key (email/external_id) must be flagged and held for manual approval.

## Suppression joins and conflict resolution

Include test rows that intentionally match entries in your suppression test fixture using the configured join key and rows that do not match. For rows that match, assert expected behavior: reject, mark suppressed, or import but mark as suppressed depending on your policy. Define the precedence rules when both a status field and a suppression join indicate suppression (e.g., suppression list takes precedence and row should not be mailed).
Test conflict resolution with multiple suppression sources and demonstrate deterministic outcomes: first check global suppression, then campaign-level suppression, then temporary suppression lists. If your importer cannot enforce precedence, treat that as an implementation gap and require a fix before production.

## Operational sequence and stop conditions

Sequence: 1) Run a schema validation against headers and required fields. 2) Auto-detect encoding and delimiter and report them for confirmation. 3) Parse rows and create a parsed-output file. 4) Run suppression join and status normalization. 5) Produce a validation report with pass/fail per row and a summary.
Stop conditions (examples): required header mismatch, encoding/delimiter detection failed, join-key normalization changes email, suppression join ambiguity, or any unexpected status value. Any stop condition must cause a human to approve a re-run with corrected fixture or importer configuration.

## Practical checklist

- [ ] Build a 12–18 row test file covering normal and edge cases (empty email, quoted delimiter, BOM variants).
- [ ] Include explicit expected parsed-output file (field → expected normalized value) for automated diffs.
- [ ] Verify required headers are exact or mapped; flag any missing/misspelled required header.
- [ ] Confirm auto-detected encoding and delimiter; if ambiguous, set explicit parameters and re-run.
- [ ] Run suppression join against a known suppression fixture and confirm precedence rules produce expected outcomes.
- [ ] Fail and hold import if join-key normalization alters the join key used for suppression.
- [ ] Log and review any rows with unknown status values; map or reject before production.
- [ ] Document and approve all changes to import mapping before accepting production lists.

## Where RepMail fits

Use this plan as a preflight checklist and decision aid in RepMail-related outbound workflows: run the acceptance dataset and expected-output diff before syncing CRM exports, suppression imports, or launching sends. Do not assume RepMail automates these checks; instead, use the plan to gate production imports and document approvals.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [List Import QA: Required Fields, Duplicates, and Suppression Checks](/repmail/learn/lead-generation/list-import-qa-required-fields-suppression)
- [Agency knowledge transfer from departing account owner](/repmail/learn/outreach/agency-departing-account-owner-knowledge-transfer)


## Sources

[1]: https://www.campaignmonitor.com/blog/email-marketing/email-campaign-preflight-checklist/ "Supporting technical or operational reference"
[2]: https://mailmeteor.com/checklists/cold-email "Supporting technical or operational reference"
