---
product: repmail
academy: lead-generation
contentType: template
slug: purchased-list-due-diligence-checklist
title: "Purchased List Due Diligence Checklist"
description: "Purchased List Due Diligence Checklist — Buyers need checks on source, lawful basis, notice, accuracy, and contract before importing a list."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["lead-generation","compliance","lead","list","purchased","due","diligence"]
assets:
  - type: table
    title: "Purchased List Diagnostic Table"
    content:
      headers: ["Diagnostic question","Pass condition","Evidence required","Action if fail"]
      rows:
        - ["Can the seller show original collection artifacts?","Yes — artifact(s) tie back to named collector and date","Scanned form, API log, event roster with timestamp","Request artifact; if none, hold purchase and escalate"]
        - ["Is lawful basis documented for our intended processing?","Privacy/legal signs off on the provided justification","Consent record, LIA, or contractual justification","Pause import; obtain legal assessment or refuse list"]
        - ["Are records within freshness threshold?","Last-verified date within your defined period","Timestamp column or verification report","Reject older records or require re-validation"]
        - ["Does suppression reconciliation exist?","Seller has documented suppression process and agrees to reconcile","Suppression policy, reconciliation log sample","Require reconciliation before import or decline"]
        - ["Do sample probes meet performance thresholds?","Bounce and complaint rates below pilot thresholds","Probe deliverability report, bounce logs","Do not expand beyond pilot; remediate data or stop"]
featured: false
collections: ["list-quality-operations"]
learningPaths: ["list-quality-and-suppression"]
keyTakeaways:
  - "Buyers need checks on source, lawful basis, notice, accuracy, and contract before importing a list."
  - "A focused task with a separate troubleshooting, implementation, decision, or reference job from the current corpus."
  - "Links sourcing to suppression and import QA."
commonMistakes:
  - "Skipping this check: Obtain a written provenance statement and at least one supporting artifact per collection claim."
  - "Skipping this check: Get the exact fields and volume you will receive; exclude any fields you do not need."
  - "Skipping this check: Collect the collector’s notice text and lawful-basis documentation; route to privacy/legal for sign-off."
faqs:
  - question: "What counts as adequate proof of consent?"
    answer: "Adequate proof includes a timestamped record that links the specific data subject to the consent statement shown at the time (for example, form text, checkbox value, IP address, and timestamp), or an email confirmation from a double opt-in flow. If the seller provides only summary claims without records, treat consent as unproven and escalate to legal."
  - question: "Can I mitigate missing documentation by limiting the campaign size?"
    answer: "Limiting campaign size reduces exposure but does not eliminate legal or reputational risk. If you run a restricted pilot as a mitigation, keep it small, require written seller commitments, monitor complaint and bounce metrics closely, and be prepared to halt and delete data on the privacy owner’s instruction."
  - question: "How should suppression lists be reconciled before import?"
    answer: "Require the seller to perform a suppression reconciliation and provide a reconciliation report (counts and matching method). You should also run your own suppression intersection before import. If reconciliation processes or reports are absent or incomplete, do not import until these are completed."
nextStep:
  label: "Continue with Bounce Webhook Idempotency and Suppression State"
  href: "/repmail/learn/lead-generation/bounce-webhook-idempotency-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Before importing a purchased list, run a short, evidence-driven due-diligence routine that tests source provenance, lawful basis, notice to data subjects, data accuracy, and contractual protections. This checklist is an operational audit you can complete in one meeting with the seller and your legal or privacy owner; it identifies go/no-go signals and limited mitigations when issues are found.

## Scope and decision boundary

Define exactly which records you will buy and import: count, fields (email, name, company, role, country, consent flags), and intended processing (marketing, sales outreach, profiling). The rest of this checklist applies only to that defined subset; do not treat a seller’s larger roster as automatically covered.
State the stop condition up front: if provenance or lawful basis cannot be documented within 72 hours, treat the list as non-importable until resolved. This limits exposure and focuses follow-up.

## Verify source provenance and chain of collection

Ask the seller for a written provenance statement that identifies original collectors (names, dates, collection method), and any intermediaries who aggregated or resold the records. Require at least one supporting artifact per claim (sample inbound form, API log excerpt, trade-show sign-up sheet scan) with redactions allowed for personal details.
Decision boundary: provenance is adequate only when artifacts show direct collection from the data subject or from a known, documented third party. If the seller provides only high-level statements without artifacts, flag as insufficient and escalate for legal review.

## Assess lawful basis and notice to data subjects

For each processing purpose you plan (marketing vs transactional), obtain the seller’s statement of lawful basis and examples of the notice provided to the data subject at collection (privacy notice text, checkbox labels, email opt-in confirmations). Where legal basis is consent, require proof of opt-in (timestamped consent record, IP address, or double opt-in confirmation). When relying on legitimate interests or contract, request the justification document used by the collector.
Evidence limits: determinations about lawfulness require your privacy/legal team; this checklist documents evidence to support their decision and should not substitute for a legal opinion. The UK ICO guidance on transparency and notice is directional for these items [1].

## Check accuracy, freshness, and suppression

Require the seller to provide the date each record was last verified and the method used (re-validation email, bounce handling, human confirmation). Set a freshness threshold appropriate to your outreach cadence (for example, 90 days for high-velocity email campaigns; shorter if targeting dynamic roles).
Audit for suppression commitments: get a written warranty about honoring suppression lists (do not contact lists, global unsubscribe lists) and a copy of the seller’s suppression process. If the seller cannot demonstrate active suppression reconciliation, treat the list as higher risk and run additional pre-import validation.

## Contract terms and risk allocation

Insist on a contract clause set that includes warranties about provenance and consent, indemnities for data protection breaches and regulatory fines, an audit right (at least sample-level access), and breach notification timelines. Also require SLA-level commitments for record accuracy and an explicit data return or deletion clause on request.
Decision boundary: if the seller refuses indemnity or audit rights, either negotiate stronger operational mitigations (limited, heavily screened pilot) or decline the purchase. A partial contract without core warranties shifts unacceptable legal and reputational risk to you.

## Operational pre-import checks and stop conditions

Before importing, run a sample verification: 1) a 200–500 record re-check against live sources (deliverability probes, public directory checks), 2) automated syntax and domain validation, and 3) suppression list intersection. Stop import if sample bounce rates or suppression hits exceed your pre-defined thresholds (example thresholds: >5% hard-bounce in probe, >1% on corporate suppression lists).
Sequence: obtain contract and provenance artifacts → legal sign-off on lawful basis → run sample validation → import a limited segment (pilot) with monitoring → expand only if pilot meets quality and complaint thresholds.

## Practical checklist

- [ ] Obtain a written provenance statement and at least one supporting artifact per collection claim.
- [ ] Get the exact fields and volume you will receive; exclude any fields you do not need.
- [ ] Collect the collector’s notice text and lawful-basis documentation; route to privacy/legal for sign-off.
- [ ] Require proof of consent where claimed (timestamped record or confirmation) or a documented legitimate-interest assessment.
- [ ] Secure contract warranties: provenance, lawful basis, accuracy, suppression handling, indemnity, and audit rights.
- [ ] Verify record freshness: require last-verified date and reject records older than your threshold.
- [ ] Run a 200–500 record sample re-check before import (syntax, domain, suppression, deliverability probe).
- [ ] Define and enforce stop thresholds for pilot (hard-bounce, spam complaints, suppression hits).
- [ ] Document remediation steps and deletion/return procedures in the contract.

## Where RepMail fits

Use this checklist as a decision aid and gate in your outbound workflow: attach the completed provenance artifacts and contract summary to the import ticket, require privacy/legal sign-off, and make the sample-validation results a required field on any import task. This helps link sourcing due diligence to suppression and import QA and creates an auditable trail for later review.

Continue with [Bounce Webhook Idempotency and Suppression State](/repmail/learn/lead-generation/bounce-webhook-idempotency-suppression) for the next step in the workflow.

## Related RepMail guides

- [List Import QA: Required Fields, Duplicates, and Suppression Checks](/repmail/learn/lead-generation/list-import-qa-required-fields-suppression)
- [List Sourcing Decision Tree: Build, Buy, Partner, or Reuse](/repmail/learn/lead-generation/list-sourcing-decision-tree-build-buy-reuse)


## Sources

[1]: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/data-sharing-a-code-of-practice/sharing-personal-data-in-databases-and-lists/?search=transparency "UK Information Commissioner guidance"
