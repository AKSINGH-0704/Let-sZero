---
product: repmail
academy: compliance
contentType: guide
slug: lawful-basis-change-control-outreach
title: "Lawful Basis Change Control for Outreach Data"
description: "Lawful Basis Change Control for Outreach Data — Privacy, legal, and lifecycle owners need to know when a new use requires a new basis."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["compliance","privacy","lawful","basis","change"]
assets:
  - type: table
    title: "Lawful-basis Change Diagnostic"
    content:
      headers: ["Diagnostic question","Action if yes","Action if no"]
      rows:
        - ["Is the proposed use materially different from the collection purpose?","Run full re-assessment and obtain re-approval","Document rationale; proceed with existing basis if evidence supports expectation"]
        - ["Does the original record explicitly permit this channel or message type?","Proceed with review for other risks (processors, profiling)","Treat as new use; require consent or new LIA"]
        - ["Is the original collection wording available and archived?","Use it as primary evidence for decision","Treat as missing evidence; require re-approval or re-notification"]
        - ["Will profiling or automated decisioning be used to select recipients?","Require privacy and legal risk review; consider DPIA","If purely manual targeting within original purpose, document method and proceed"]
        - ["Does the change extend retention or add new data categories?","Require re-approval and update retention policy","If retention is unchanged and data categories same, proceed with documentation"]
featured: false
collections: ["compliance-operations"]
learningPaths: []
keyTakeaways:
  - "Privacy, legal, and lifecycle owners need to know when a new use requires a new basis."
  - "Distinct from existing legitimate-interest and consent-record pages: governs purpose changes and re-approval."
  - "Link from lawful-basis hub to records, privacy notice, and campaign approval."
commonMistakes:
  - "Skipping this check: Identify original lawful-basis record and attach collection wording or, if absent, mark as missing evidence."
  - "Skipping this check: Describe the proposed new outreach use: audience, channel, message type, data elements, and retention change."
  - "Skipping this check: Map divergences between original purpose wording and proposed use; flag any material differences."
faqs:
  - question: "If the original consent wording is vague, can we rely on legitimate interest for the new use?"
    answer: "You can only rely on legitimate interest after completing a documented balancing test that considers the reasonable expectations of data subjects and the impact on their rights. Vague consent wording weakens reliance on consent; treat vagueness as missing evidence and follow the re-assessment workflow. Note: ICO guidance is directional on expectations for lawful bases [1]."
  - question: "Do minor targeting tweaks (e.g., adding a role filter) require re-approval?"
    answer: "Minor targeting tweaks that stay within the original stated purpose and data categories can be documented and treated as operational changes, provided the original notice encompassed such targeting. If the tweak materially changes whom you contact or uses new data sources, follow the re-approval workflow."
  - question: "What immediate actions if outreach already launched and we discover missing re-approval?"
    answer: "Stop further sends where feasible, quarantine or pause the recipient segment, notify privacy and legal owners, and conduct a retrospective assessment to determine whether re-notification, re-consent, or deletion is required. Keep a full audit trail of decisions and remediation steps."
nextStep:
  label: "Continue with Cold Email Compliance Recordkeeping: What to Log"
  href: "/repmail/learn/compliance/cold-email-compliance-recordkeeping"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

A lawful-basis change for outreach data should be treated as a governance-controlled purpose change: if the new use is materially different from the originally documented purpose, stop, assess, and re-authorise before launching. This guide gives a practical decision boundary, the evidence you must collect, a sequenced approval workflow, and an auditable checklist for privacy, legal, and lifecycle owners.

## Decision boundary: when a use is a new lawful basis

Define 'materially different purpose' as any change that would cause a reasonable person to expect their data would not be used in the new way. This includes new categories of outreach (e.g., transactional messages to marketing campaigns), new channels (e.g., adding SMS where email-only consent existed), or adding profiling/automation that alters targeting logic.
Evidence limits: you must rely on the original record (privacy notice, collection context, consent wording, or legitimate-interest assessment) to test expectations. If the record is silent or ambiguous about the new use, treat the change as new and require re-approval.
Practical sequence: identify the proposed new use, map it to the original purpose wording and collection channel, and ask: would a reasonable data subject expect this? If no, proceed to a formal re-assessment and authorisation step.

## Required evidence to support re-use or re-authorisation

Collect four core artifacts: the original lawful-basis record (consent record or legitimate-interest assessment), the current privacy notice or policy wording shown at collection, the proposed outreach purpose statement (audience, channel, message type), and data elements required (e.g., email, job title, purchase history).
Decision evidence limits: do not substitute operational convenience for consent evidence. If you cannot produce the original collection wording or can show the notice was materially different, you must treat the change as requiring fresh consent or a new legitimate-interest balancing test. Use the ICO materials for lawful-basis interpretation where relevant [1].
Practical sequence: assemble artifacts, annotate where the proposed use diverges from the original wording, and prepare a one-page summary for review that cites the gaps and recommended lawful-basis action.

## Approval workflow and roles

Owners: assign a requester (campaign or product owner), a privacy reviewer, a legal reviewer, and a lifecycle/operator approver who will execute the outreach. Define stop conditions: if privacy or legal requests changes, the outreach is paused until resolved.
Sequence: requester submits the one-page summary and artifacts; privacy validates expectation and recommends basis (consent, legitimate interest, contract); legal confirms risk and any contractual/sector constraints; lifecycle signs off on operational feasibility and recording. Record the outcome with timestamped approvals for audit.
Escalation and timeboxes: if reviewers cannot decide within a defined SLA (e.g., 7 business days), escalate to a designated privacy director. Do not proceed before resolution.

## Re-approval triggers and re-notification requirements

Triggers: add new message categories (marketing vs transactional), add new channels or third-party processors, extend retention beyond originally stated purposes, apply automated profiling for outreach decisions, or change audience selection criteria (e.g., using behavioral data instead of account data).
Evidence limits: not every minor parameter change requires a new basis—technical optimisations within the same, clearly described purpose (e.g., A/B testing subject lines for the same campaign) can be treated as covered if the original notice encompassed such optimisation. When in doubt, treat as a trigger and follow re-approval.
Practical sequence: for triggered changes, follow the full re-assessment workflow. If the decision is to continue under existing basis, document rationale and keep an audit trail showing why the change fell within the original purpose.

## Operational controls and audit trail

Controls to implement: mandatory form fields for the original collection reference, checkbox confirming privacy review completed, versioned privacy notice snapshots, and a signed approval record stored in a central repository. Capture granular metadata: requester, description of change, affected lists/segments, processors, and retention impact.
Stop conditions and remediation: if an audit finds outreach launched without re-approval, immediately stop the campaign, quarantine affected lists, and perform a retrospective assessment to determine corrective actions (re-notification, re-consent, or deletion). Record remediation actions and outcomes.
Practical sequence: schedule periodic audits (quarterly for high-risk outreach), review approval records, sample-check message content against the approved purpose, and feed findings back into workflow improvements.

## Practical checklist

- [ ] Identify original lawful-basis record and attach collection wording or, if absent, mark as missing evidence.
- [ ] Describe the proposed new outreach use: audience, channel, message type, data elements, and retention change.
- [ ] Map divergences between original purpose wording and proposed use; flag any material differences.
- [ ] Submit one-page summary plus artifacts to privacy reviewer and legal reviewer; set a 7 business day SLA for decisions.
- [ ] If approved, record timestamped approvals and update the central approval repository with versioned privacy notice snapshots.
- [ ] If denied or modified, do not proceed until changes are implemented and re-reviewed; log the stop condition.
- [ ] Implement operational controls: collection reference, privacy checkbox, and campaign pre-launch gate in the campaign approval system.
- [ ] If outreach launched without approval, halt campaign, quarantine recipient lists, conduct retrospective assessment, and document remediation.
- [ ] Schedule quarterly audits of approved outreach to verify adherence to documented purposes and capture lessons learned.

## Where RepMail fits

Use this guide as a compact decision aid and checklist inside your outbound workflow: require the one-page summary and attachments at campaign approval gates, store approvals in the campaign record for audits, and apply the diagnostic table during pre-send checks. Do not infer that RepMail automates approvals or enforces legal conclusions—treat the guide as an operational control and record-keeping aid.

Continue with [Cold Email Compliance Recordkeeping: What to Log](/repmail/learn/compliance/cold-email-compliance-recordkeeping) for the next step in the workflow.

## Related RepMail guides

- [Adequacy Decision vs. Safeguard: Cross-Border Routing Choice](/repmail/learn/compliance/adequacy-vs-safeguard-cross-border-routing)
- [B2B Corporate Subscriber vs. Individual Address: PECR Routing](/repmail/learn/compliance/b2b-corporate-subscriber-vs-individual-address)


## Sources

[1]: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/ "UK Information Commissioner guidance"
[2]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/ "UK Information Commissioner guidance"
