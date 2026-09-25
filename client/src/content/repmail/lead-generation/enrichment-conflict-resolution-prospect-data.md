---
product: repmail
academy: lead-generation
contentType: guide
slug: enrichment-conflict-resolution-prospect-data
title: "Enrichment Conflict Resolution: Which Value Wins?"
description: "Enrichment Conflict Resolution: Which Value Wins? — CRM, provider, and public sources disagree on title, domain, industry, or size."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["lead-generation","lead","enrichment","conflict","resolution"]
assets:
  - type: table
    title: "Quick diagnostic: pick the winning value"
    content:
      headers: ["Situation","Primary quick test","If test passes","If test fails"]
      rows:
        - ["CRM value recently updated (within your freshness window)","Check CRM timestamp and interaction evidence (note contact activity)","Accept CRM value; store provider/public as alternatives","If CRM lacks interaction evidence, run provider confidence check and DNS/company registry test"]
        - ["Domain conflict between CRM and provider","Attempt DNS resolution and compare SSL/CommonName to company domain","Accept domain that resolves and matches SSL/registry","If neither matches, set domain to provider null and flag for manual research"]
        - ["Industry differs across sources","Check for company registry classification or primary product page","Accept source that matches an authoritative registry or company site","If no authoritative match, prefer CRM for account-level segmentation and mark as uncertain"]
        - ["Title/seniority mismatch","Prefer recent CRM interaction-derived title for outreach","Use CRM title for personalization and set confidence high","If CRM title looks generic or absent, use provider with high confidence or request rep confirmation"]
        - ["Company size disagreement","Check provider’s employee range confidence and public filings if available","Accept provider if confidence > threshold and recent","If low confidence, default to CRM or flag for manual validation"]
featured: false
collections: ["list-quality-operations"]
learningPaths: ["list-quality-and-suppression"]
keyTakeaways:
  - "CRM, provider, and public sources disagree on title, domain, industry, or size."
  - "A focused task with a separate troubleshooting, implementation, decision, or reference job from the current corpus."
  - "Links enrichment to QA and handoff."
commonMistakes:
  - "Skipping this check: Define the primary use case for each field (title, domain, industry, size)."
  - "Skipping this check: Set a ranked source priority list per field (CRM, provider, public) and document why."
  - "Skipping this check: Specify freshness and confidence thresholds for automated acceptance."
faqs:
  - question: "When should I prioritize CRM values over provider enrichment?"
    answer: "Prioritize CRM values when the CRM record was updated within your defined freshness window and contains interaction evidence (recent email, call, or meeting). For personalization and routing, CRM values with interaction context are usually better; for bulk segmentation, authoritative external size or industry may be preferable."
  - question: "How long should a value be considered fresh?"
    answer: "Freshness depends on the field and your tolerance for staleness: titles change faster than industry. A practical starting point is 30–90 days for titles and 6–12 months for company size/industry; treat these as tunable thresholds and adjust based on observed churn in your data."
  - question: "Do I need legal review before sharing resolved personal data across teams?"
    answer: "Treat personal data sharing according to your legal and privacy policies and applicable law. Use documented provenance and minimal necessary data; consult legal/privacy if you plan cross-border sharing or persistent use beyond original consent. Public guidance on data-sharing best practices can be directional for policy design [2]."
nextStep:
  label: "Continue with Bounce Webhook Idempotency and Suppression State"
  href: "/repmail/learn/lead-generation/bounce-webhook-idempotency-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

When CRM, provider, and public sources disagree on title, domain, industry, or company size, choose the value with the clearest provenance, the freshest verification, and the lowest business risk for the immediate use case. Resolve conflicts by (1) defining the decision priority for the pipeline stage, (2) applying lightweight verification tests, and (3) recording the chosen value and confidence so downstream segmentation and reps can act reliably.

## Define decision boundaries by use case

Start by asking what the data will be used for now: segmentation, personalization, routing, compliance checks, or enrichment for research. Different use cases tolerate different trade-offs. For example, personalization (title) needs higher precision than broad marketing segmentation (industry), while routing (seniority) must avoid false negatives that drop leads.
Explicitly document the acceptable error mode for each field: false positives vs false negatives, stale vs incorrect. That boundary determines whether you favor the most-recent source or the most-authoritative source. This decision should be captured in the pipeline config and visible to operators.

## Prioritize sources and what “authority” means

Create a short ordered list of sources (e.g., CRM manual entry, provider enrichment, public crawling) and what ’authority’ means per field. For title and seniority, CRM-entered values from recent interactions may be most authoritative. For domain and company size, provider data tied to company registries or DNS can be higher authority.
Limit claims about authority: call out when a source is only directionally reliable (e.g., public web signals) and note when a provider uses probabilistic inference rather than a canonical registry [1].

## Verification steps and lightweight tests

Apply quick checks before accepting a value: timestamp freshness, match confidence, cross-source agreement, and an authoritative tie-breaker. Timestamp freshness: prefer values verified within your acceptable staleness window. Match confidence: accept provider values above your threshold; if below, defer to CRM or mark for manual review.
Cross-source agreement: if two sources agree, accept; if all three disagree, escalate for manual verification or push a targeted enrichment job. For domain values, verify DNS resolution or SSL certificate match as a practical test.

## Decision sequence and automation pattern

Implement this sequence in your enrichment pipeline: (1) normalize incoming values and note their origin and timestamp, (2) run the verification tests in parallel, (3) apply the prioritized source rule, (4) if conflict remains, mark record with resolution rationale and confidence, then route for manual QA or automated re-enrichment. Automate clear accept/reject paths and only queue manual review when the record meets predefined escalation criteria (e.g., conflicting seniority for high-value accounts).
Instrument the pipeline so that operators can change priority rules without code (feature flags or config). Keep the resolution logic deterministic and versioned so past decisions can be audited.

## Recording resolution and handoff to downstream teams

When you choose a winning value, store: chosen field value, source, timestamp, confidence score, and the rule used to pick it. Also preserve the losing values as alternatives with provenance and timestamps. This prevents duplicated research and supports re-evaluation when new data arrives.
Expose these fields to CRMs and engagement tools via an enrichment QA view or API. Train sales and marketing on how to interpret confidence and when to request re-checks; include a short guide for reps to avoid manual overwrites that hide provenance.

## Troubleshooting common failure modes

If you see repeated flips (value churn), check for: frequent provider re-enrichments overwriting CRM values, literal parsing errors (e.g., “CEO; Founder”), or bad normalization rules that split company domains. If segmentation shows spikes, examine whether confidence thresholds are too low or staleness windows too wide.
For unresolved conflicts that regularly reach manual queues, raise the issue with the enrichment provider for clearer provenance or add a lightweight verification step (e.g., LinkedIn company page scrape) to reduce manual work. Document any temporary rules you add and schedule review.

## Practical checklist

- [ ] Define the primary use case for each field (title, domain, industry, size).
- [ ] Set a ranked source priority list per field (CRM, provider, public) and document why.
- [ ] Specify freshness and confidence thresholds for automated acceptance.
- [ ] Normalize and store all incoming values with origin and timestamp.
- [ ] Automate verification tests: timestamp, confidence, cross-source agreement, and DNS/SSL checks for domains.
- [ ] Implement deterministic resolution rules and version them in config.
- [ ] Expose chosen value, alternatives, source, and confidence to downstream tools and reps.
- [ ] Escalate conflicts only when they meet documented manual review criteria.
- [ ] Review conflict metrics monthly and adjust thresholds or add verification steps.

## Where RepMail fits

Use this guide as an operational checklist and decision aid in your outbound enrichment workflow: apply the diagnosis table when records trigger enrichment, store resolution metadata for QA handoff, and prevent inconsistent segmentation that causes duplicate research or conflicting outreach. The steps can be implemented as pipeline config and visible fields that reps consult before overwriting values.

Continue with [Bounce Webhook Idempotency and Suppression State](/repmail/learn/lead-generation/bounce-webhook-idempotency-suppression) for the next step in the workflow.

## Related RepMail guides

- [Enrichment Field Priority Matrix: Must-Have vs Nice-to-Have](/repmail/learn/lead-generation/enrichment-field-priority-matrix)
- [Contact-to-Account Matching When Domains Are Ambiguous](/repmail/learn/lead-generation/contact-to-account-matching-ambiguous-domains)


## Sources

[1]: https://trailhead.salesforce.com/content/learn/modules/data-enrichment-fundamentals/define-data-enrichment "Supporting technical or operational reference"
[2]: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/data-sharing-a-code-of-practice/sharing-personal-data-in-databases-and-lists/?search=transparency "UK Information Commissioner guidance"
