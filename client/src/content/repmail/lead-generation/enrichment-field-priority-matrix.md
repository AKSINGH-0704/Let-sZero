---
product: repmail
academy: lead-generation
contentType: comparison
slug: enrichment-field-priority-matrix
title: "Enrichment Field Priority Matrix: Must-Have vs Nice-to-Have"
description: "Enrichment Field Priority Matrix: Must-Have vs Nice-to-Have — Data projects expand endlessly because no fields are prioritized for a campaign."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["lead-generation","lead","enrichment","field","priority"]
assets:
  - type: table
    title: "Enrichment Field Priority Decision Table"
    content:
      headers: ["Field","Primary Use/Decision","Quality Threshold","Owner","Fallback if unmet"]
      rows:
        - ["Work Email","Campaign deliverability & contactability","Required: ≥ 90% verified format","Data Ops","Use corporate domain + manual review for high-value accounts"]
        - ["Job Title","Routing to correct SDR queue","Required: ≥ 80% normalized titles","Sales Ops","Use department or seniority proxy"]
        - ["Company Revenue","Deal sizing & prioritization","Acceptable: ≥ 65% standard ranges","RevOps","Use industry revenue band or firmographic proxy"]
        - ["Industry (NAICS/SIC)","Segmentation for messaging","Acceptable: ≥ 70% canonical code","Marketing Ops","Assign to broad industry buckets"]
        - ["Phone Number","Outbound sales dial attempts","Optional for email-only campaigns; Required if cadence includes calls","Sales Ops","Leave for manual lookup or skip call steps"]
featured: false
collections: ["list-quality-operations"]
learningPaths: ["list-quality-and-suppression"]
keyTakeaways:
  - "Data projects expand endlessly because no fields are prioritized for a campaign."
  - "A focused task with a separate troubleshooting, implementation, decision, or reference job from the current corpus."
  - "Links enrichment to segmentation and handoff."
commonMistakes:
  - "Skipping this check: Document the campaign’s acceptance criteria (routing, segmentation, SLA) before listing fields."
  - "Skipping this check: For each field, write the single primary action it enables and assign an owner."
  - "Skipping this check: Run a sample completeness audit (500–1,000 records) to estimate enrichment effort."
faqs:
  - question: "How do I choose thresholds when I don’t have historic campaign data?"
    answer: "Start with conservative operational thresholds (Required ≥ 80–90% for routing/contact fields; Acceptable 60–80% for segmentation) and run a short pilot on a sample set. Use pilot outcomes (routing errors, SDR rejection rate) to adjust thresholds. If vendor reliability is unknown, label those claims as directional and monitor actual match rates."
  - question: "What if multiple teams claim a field is required?"
    answer: "Require each team to state the single downstream action tied to that field and the business impact if it’s absent. Prioritize based on campaign acceptance criteria and the cost-to-acquire. Assign a single owner to prevent duplicate enrichment efforts; other teams can request inclusion in the backlog with justification."
  - question: "When should we enrich optional fields?"
    answer: "Enrich optional fields when the cost is low, the data is frequently requested by downstream teams, or when multiple campaigns converge on the same optional field making it high ROI. Otherwise, schedule them in a later sprint and track requests so you can quantify future value."
nextStep:
  label: "Continue with Bounce Webhook Idempotency and Suppression State"
  href: "/repmail/learn/lead-generation/bounce-webhook-idempotency-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Prioritize enrichment fields by focusing first on the minimum set that makes lists operational for segmentation, routing, and qualification, then add secondary attributes only when they materially change actions or outcomes. This matrix helps teams stop data projects from expanding indefinitely by tying each field to a single decision or use case and a clear stop condition.

## Decision boundary: Must-have vs nice-to-have

Define a "must-have" field as any attribute required to run a campaign, route leads, or accurately score accounts without manual lookup. A "nice-to-have" field improves targeting or analysis but is not required to deliver the campaign or handoff. Explicitly state the campaign’s acceptance criteria (e.g., deliverable segments, SLA to SDRs) to separate the two groups.

Limitations: this decision boundary is operational, not absolute. A field that is nice-to-have for one campaign (e.g., annual revenue for a content drip) may be must-have for another (e.g., deal-size routing). Re-evaluate per campaign rather than across the whole dataset.

## Evidence and stop conditions

For each candidate field, capture two pieces of evidence: how it will be used (routing, segmentation, qualification) and the minimal quality needed (percentage completeness, accepted formats, recency). Set explicit stop conditions: e.g., 'field usable when ≥ 85% of active targets have values in canonical format' or 'campaign starts after must-haves are present even if nice-to-haves are incomplete.'

Practical sequence: first list campaign actions that depend on data; second map fields to those actions; third set quality thresholds and a deployment date. If thresholds aren’t met, choose an operational fallback (default value, infer from proxy, or manual review) rather than expanding enrichment indefinitely.

## Mapping fields to single use cases

Avoid multi-purpose fields that invite scope creep. For every field, document one primary action it enables (example: 'job_title -> qualification for SDR 1 vs SDR 2'). If a field is claimed to aid multiple workflows, split ownership and prioritize based on campaign impact and cost of acquisition.

Ownership and handoff: assign the field to a single owner (ops, data engineer, or campaign manager) who is responsible for meeting the stop condition or documenting an approved fallback. This prevents repeated re-prioritization across teams.

## Quality tiers and practical thresholds

Use three quality tiers: Required (must meet before launch), Acceptable (sufficient for most automation, with monitoring), and Optional (informational). Example thresholds: Required ≥ 85% completeness and canonical format; Acceptable 60–84% completeness with documented fallback; Optional < 60% or infrequently used.

Evidence limits: thresholds depend on channel and SLA. For example, routing to sales may require higher completeness than a nurture email. When vendor or source-specific reliability varies, mark the field’s quality as directional and monitor real results rather than assume a vendor guarantee.

## Sequence for a focused enrichment sprint

1) Define campaign acceptance criteria and list actions. 2) Map must-have fields to actions and set thresholds. 3) Run a quick completeness audit (sample 500–1,000 records) to estimate effort. 4) Enrich only must-haves; implement fallbacks for acceptable fields. 5) Launch and collect metrics (deliverability, routing errors, SDR feedback) and iterate.

Stop condition: close the sprint when must-have thresholds are met or when cost-to-fill exceeds the expected campaign benefit. Document the decision and move remaining fields to a later backlog with justification.

## Segmentation and handoff: linking enrichment to downstream work

Connect each must-have field to a downstream rule: which segment it places the lead/account into and what the next action is (e.g., assign to AE, enroll in nurture). This keeps enrichment bounded to practical outcomes and clarifies why a field is required. It also reduces rework when SDRs need fields for qualification.

Diagnostic: if SDRs repeatedly request more fields after launch, trace each request to a missing required action or a mis-specified stop condition rather than adding fields automatically. That prevents scope creep and keeps lists usable sooner.

## Practical checklist

- [ ] Document the campaign’s acceptance criteria (routing, segmentation, SLA) before listing fields.
- [ ] For each field, write the single primary action it enables and assign an owner.
- [ ] Run a sample completeness audit (500–1,000 records) to estimate enrichment effort.
- [ ] Classify each field into Required, Acceptable, or Optional with numeric thresholds.
- [ ] Set concrete stop conditions and operational fallbacks for unmet thresholds.
- [ ] Enrich only Required fields in the sprint; move others to a prioritized backlog.
- [ ] Log changes and handoff rules so downstream teams know how to use fields.
- [ ] Monitor post-launch diagnostics (deliverability issues, routing errors, SDR feedback) and iterate.
- [ ] Review backloged fields quarterly and re-evaluate priority against new campaigns.

## Where RepMail fits

Use this matrix as a practical checklist in your outbound workflow: attach the must-have list to each campaign brief, use the decision table to automate routing and handoff rules, and require sign-off on stop conditions before starting list enrichment. This reduces time to a usable list and creates a repeatable process for future campaigns without implying any specific RepMail product capability.

Continue with [Bounce Webhook Idempotency and Suppression State](/repmail/learn/lead-generation/bounce-webhook-idempotency-suppression) for the next step in the workflow.

## Related RepMail guides

- [Enrichment Conflict Resolution: Which Value Wins?](/repmail/learn/lead-generation/enrichment-conflict-resolution-prospect-data)
- [Contact-to-Account Matching When Domains Are Ambiguous](/repmail/learn/lead-generation/contact-to-account-matching-ambiguous-domains)


## Sources

[1]: https://trailhead.salesforce.com/content/learn/modules/data-enrichment-fundamentals/define-data-enrichment "Supporting technical or operational reference"
