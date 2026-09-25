---
product: repmail
academy: compliance
contentType: template
slug: purpose-compatibility-review-prospect-data
title: "Purpose Compatibility Review Before Reusing Prospect Data"
description: "Purpose Compatibility Review Before Reusing Prospect Data — Teams want to reuse enrichment or event data for outreach without checking compatibility."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["compliance","privacy","prospect","purpose","compatibility","review"]
assets:
  - type: table
    title: "Decision diagnostics: purpose-compatibility quick table"
    content:
      headers: ["Diagnostic question","If Yes","If No","Action / evidence to collect"]
      rows:
        - ["Is there a documented collection purpose that describes marketing or the new outreach?","Likely compatible","Potentially incompatible","Attach the original purpose text and privacy notice version"]
        - ["Was a lawful basis for marketing (consent or legitimate interest) recorded at collection?","Proceed with records in scope","Cannot rely on original basis","Obtain new consent or document legitimate interest balancing test"]
        - ["Does the privacy notice shown to the user mention the new use or similar marketing?","Compatible with notice","Incompatible or not mentioned","Update notice prospectively and refrain from reusing existing records until consent obtained"]
        - ["Has the retention period for this record expired?","Retention compliant","Retention expired","Restore only after re-collection; otherwise delete or anonymize"]
        - ["Is the data sensitive or high-risk for targeting (special category, precise location)?","Treat with extra safeguards","Standard safeguards may suffice","Require explicit consent or restrict to aggregated analyses"]
        - ["Is there an opt-out or do‑not‑contact flag?","Exclude from outreach","Not opted out","Respect user preference; proceed if no opt-out and lawful basis exists"]
featured: false
collections: ["compliance-operations"]
learningPaths: []
keyTakeaways:
  - "Teams want to reuse enrichment or event data for outreach without checking compatibility."
  - "Distinct from provenance: evaluates a new purpose and compatibility decision."
  - "Link to provenance, lawful basis, privacy notice, and retention."
commonMistakes:
  - "Skipping this check: Record the precise new outreach purpose and list specific data fields to be used."
  - "Skipping this check: Retrieve and attach collection provenance: collection purpose, date, lawful basis, and privacy notice version."
  - "Skipping this check: Verify retention status and that the record has not expired for reuse."
faqs:
  - question: "If provenance is missing for an enrichment record, can we infer consent from the user’s activity?"
    answer: "No. Inferring consent from activity is unreliable and risky. If provenance or a recorded lawful basis is missing, treat the record as high risk for secondary use. Either obtain explicit consent for the outreach, rely on a documented legitimate interest assessment, or remove/anonymize the data before reuse."
  - question: "When is legitimate interest a sufficient lawful basis for outreach?"
    answer: "Legitimate interest can be sufficient for some marketing if you can document a balancing test showing the business interest is not overridden by the individual’s rights and expectations. This assessment should be written, auditable, and consider the data type, relationship, and reasonable expectations. Refer to regulatory guidance for direction; this article is not legal advice [1]."
  - question: "Can we pseudonymise identifiers and proceed without consent?"
    answer: "Pseudonymisation reduces risk but does not automatically permit outreach that contradicts the original purpose or notice. If pseudonymisation prevents identification of the person and the use is truly for aggregate analysis, risk is lower. For direct outreach, pseudonymised identifiers that can be re‑linked still constitute identifiable processing and require an appropriate lawful basis."
nextStep:
  label: "Continue with Cold Email Compliance Recordkeeping: What to Log"
  href: "/repmail/learn/compliance/cold-email-compliance-recordkeeping"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Direct answer: Before reusing enrichment or event data for outreach, run a concise purpose-compatibility review that compares the new outreach purpose against the original collection purpose, lawful basis, user expectations, and any documented privacy notices or retention limits. If any of those elements conflict, stop and either obtain a new lawful basis/consent or remove/aggregate the data for a compatible non-identifying purpose.

## Define the specific outreach purpose and decision boundary

Clearly state the outreach objective (e.g., lead nurture email, promotional campaign, reactivation SMS) and the exact data fields you intend to use (e.g., job title, click history, geo‑city, event timestamps). The decision boundary is whether those fields were collected for a purpose compatible with that outreach objective; if not, it is secondary use and requires further compliance steps.
Documenting the new purpose in one sentence helps downstream reviewers evaluate compatibility without ambiguity. Include target audience criteria and any automated targeting rules so reviewers can judge scope and risk.

## Map original collection purpose, lawful basis, and notice

Locate the record’s provenance: the stated collection purpose, the lawful basis used at collection (consent, legitimate interests, contract, etc.), and the privacy notice text presented to the data subject. This mapping is a factual exercise — do not infer lawful basis from behavior alone.
If provenance or lawful basis is missing, treat the data as higher risk and escalate; absence of documentation is a common stop condition. The UK Information Commissioner's guidance on lawful bases and direct marketing is a directional reference for assessing lawfulness [1][2].

## Assess compatibility factors and evidence limits

Evaluate compatibility along concrete axes: subject expectations (what a reasonable person would expect), link between original and new purposes, context and relationship, sensitivity of data fields, and retention schedule. Use documented examples rather than intuition when possible.
Acknowledge evidence limits: you may not know exactly what notice an individual read or whether consent covered the new purpose. When evidence is incomplete, prefer conservative decisions: require new consent, limit to non-identifying aggregated uses, or remove the data.

## Sequence: triage, review, approve/mitigate

1) Triage: automated checks flag records with missing provenance, sensitive fields, or expiry of retention. 2) Review: a privacy or compliance reviewer confirms the mapping, checks the privacy notice wording, and evaluates lawful basis. 3) Approve or mitigate: approve reuse, obtain consent, or drop/aggregate the data. Track the decision and the reviewer in a record of processing steps.
Practical stop conditions are: no documented lawful basis, privacy notice incompatible with outreach, user has opted out of marketing, or retention period expired. Mitigations include hashing/pseudonymising identifiers, narrowing the cohort, or asking for fresh consent.

## Operational roles, evidence sources, and tooling guidance

Assign clear owners: product/marketing requests the reuse and provides purpose details; privacy/compliance owns the compatibility decision; engineering enforces technical controls (filters, deletions); operations maintains audit logs. Specify who can override and what documentation is required for audits.
Use evidence sources such as consent logs, privacy notice versions, data retention metadata, and consent revocation lists. Where systems lack provenance fields, create mandatory metadata capture for enrichments and events to reduce future uncertainty.

## Examples (labeled) of compatibility outcomes

Example — Compatible reuse: An enrichment that added industry sector to a CRM at sign-up for B2B purposes is used for a targeted product update to customers in that sector — likely compatible if notice included business updates.
Example — Incompatible reuse: A behavioral event collected to personalize an in‑app experience (no marketing consent or notice) is used for an unsolicited promotional email — treat as secondary use and do not proceed without new lawful basis.

## Practical checklist

- [ ] Record the precise new outreach purpose and list specific data fields to be used.
- [ ] Retrieve and attach collection provenance: collection purpose, date, lawful basis, and privacy notice version.
- [ ] Verify retention status and that the record has not expired for reuse.
- [ ] Confirm there is documented marketing consent or assess legitimate interest balancing for this purpose.
- [ ] If provenance is missing or ambiguous, escalate and block reuse until resolved.
- [ ] Apply mitigation if needed: pseudonymise or aggregate data to remove direct identifiers.
- [ ] Log the reviewer, decision, rationale, and any consent obtained in the processing audit.
- [ ] Implement technical enforcement: filters to exclude opted‑out or expired records before campaign execution.

## Where RepMail fits

Use this article as a practical pre-send checklist and decision aid in outbound workflows: incorporate the diagnostics and checklist into campaign kickoff, require a compatibility sign-off before export, and archive the reviewer decision alongside the campaign. Do not interpret this guide as RepMail providing legal advice or guaranteeing deliverability; treat it as an operational control you can adopt in your outbound process.

Continue with [Cold Email Compliance Recordkeeping: What to Log](/repmail/learn/compliance/cold-email-compliance-recordkeeping) for the next step in the workflow.

## Related RepMail guides

- [DPIA Review After a New Vendor, Model, or Data Source](/repmail/learn/compliance/dpia-review-after-processing-change)
- [DPIA Triage for Prospect Enrichment and Profiling](/repmail/learn/compliance/dpia-triage-prospect-enrichment-profiling)


## Sources

[1]: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/ "UK Information Commissioner guidance"
[2]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/ "UK Information Commissioner guidance"
