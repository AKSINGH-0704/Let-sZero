---
product: repmail
academy: compliance
contentType: template
slug: subprocessor-register-email-enrichment
title: "Subprocessor Register Review for Email and Enrichment Vendors"
description: "Subprocessor Register Review for Email and Enrichment Vendors — Procurement and privacy owners need a recurring review of subprocessors and changes."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["compliance","email","privacy","subprocessor","register","review"]
assets:
  - type: table
    title: "Subprocessor Review Decision Table"
    content:
      headers: ["Change type","Key evidence required","Immediate action?","Owner","Stop condition"]
      rows:
        - ["New subprocessor in same country, same processing purpose","Register entry, vendor attestation, technical mapping","No (monitor)","Privacy/Procurement","No"]
        - ["New subprocessor in third country","Register, DPA clause for transfer (SCCs or equivalent), technical region mapping","Yes (until safeguards verified)","Privacy/Legal","Yes — halt new transfers"]
        - ["Subprocessor granted access to raw email identifiers","Access controls, SOC/ISO report, technical evidence of role-based access","Yes","Security/Privacy","Yes — suspend enrichment jobs"]
        - ["Subprocessor removed","Register change log, vendor confirmation of data deletion/return","No","Procurement/Operations","Verify deletion; escalate if not completed"]
        - ["Change in processing purpose (e.g., marketing to analytics)","DPA amendment, updated purpose clause, privacy impact assessment","Yes","Privacy/Procurement","Yes — suspend relevant processing"]
featured: false
collections: ["compliance-operations"]
learningPaths: []
keyTakeaways:
  - "Procurement and privacy owners need a recurring review of subprocessors and changes."
  - "Specific subprocessor lifecycle not covered by general vendor due diligence."
  - "Link to cross-border, DPA, and offboarding."
commonMistakes:
  - "Skipping this check: Identify vendors in scope (mail delivery, list management, enrichment, brokers) and export current contracts and DPAs."
  - "Skipping this check: Request the vendor’s current subprocessor register and change log with dates for additions/removals."
  - "Skipping this check: Map each subprocessor to technical evidence (network logs, cloud regions, contractor domains)."
faqs:
  - question: "How often should I run a full subprocessor register review?"
    answer: "Full reviews are recommended quarterly. Run an ad-hoc mini-review within 10 business days of any vendor notification about subprocessor changes, or immediately if the change introduces new countries or new access to identifying email data."
  - question: "Is a vendor’s published register sufficient evidence?"
    answer: "A published register is a starting point but should be corroborated with vendor-signed attestations, DPA clauses, and technical mappings (logs, cloud region data). Treat published lists as directional; require documentary backup for higher-risk changes."
  - question: "What legal references should I consult when a new third-country subprocessor appears?"
    answer: "Consult controller/processor contract guidance and international transfer guidance as directional sources [1][2], and involve legal counsel for binding advice. These sources explain contract expectations and transfer mechanisms but do not substitute for jurisdiction-specific legal advice."
nextStep:
  label: "Continue with Cold Email Compliance Recordkeeping: What to Log"
  href: "/repmail/learn/compliance/cold-email-compliance-recordkeeping"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Review subprocessors for email and enrichment vendors on a recurring cadence (quarterly or on contract change) to detect new data recipients, changes in access scope, or new cross-border transfer risks. This template focuses on the subprocessor lifecycle items procurement and privacy owners must verify, the specific evidence to collect, and clear stop/escrow conditions for remediation or contract actions.

## Scope and decision boundary

Define which vendors and data flows this review covers: mail delivery providers, list management, enrichment/append services, data brokers, and any vendor that receives or processes email addresses, recipients’ metadata, or enrichment outputs. Exclude general SaaS vendors that do not receive or process email identifiers or enrichment outputs.
State the decision boundary for escalation: changes that add new subprocessors, add new countries (especially third countries), or extend processing purposes beyond originally contracted uses should trigger immediate privacy review and potential DPA amendment. Day-to-day configuration changes (IP ranges, instance scaling) that do not affect where data is stored or who has logical access can be lower-priority but must be recorded.

## Evidence to collect and how to validate it

Collect the vendor’s current subprocessor register, signed DPA, recent change logs or notifications, and the technical diagram of data flows showing enrichment outputs and raw address handling. Prefer vendor-signed documents or portal export; self-reported spreadsheets are acceptable only when accompanied by attestation from the vendor’s legal or privacy lead.
Validate entries against technical evidence: confirm IP addresses, cloud regions, or contractor domains in the vendor’s logs or network diagrams match the register. For transfers to third countries, request the legal basis or safeguard (e.g., SCCs) and log a copy of the relevant clause from the DPA. Use public guidance for what DPAs should cover as a reference, but treat provider-specific claims as needing documentary support [1][2].

## Sequence for a periodic review

1) Intake: Pull the master vendor list and identify vendors in scope. 2) Request: Send a standardized packet request to vendors (current subprocessor register, change history, DPA reference, technical diagram). 3) Validate: Match register entries to technical logs and the DPA’s listed subprocessors. 4) Risk triage: Classify changes into no-impact, monitoring, or immediate-action buckets based on destination country, new recipients, or changes in processing purpose.
Document outcomes and assign owners: procurement should own contract updates, privacy should own legal review and risk classification, and security should own technical validation. Set deadlines for vendor remediation and stop conditions that suspend data flows if remediation is not met.

## Handling changes and remediation actions

If a vendor adds a new subprocessor that receives identifying email data or enrichment outputs, require the vendor to provide: a) the subprocessor’s role and access limits; b) the legal basis or contractual safeguard for cross-border transfers; and c) evidence of controls (ISO/PCI/ SOC reports or comparable). If evidence is missing or weak, classify as 'requires escalation' and restrict exchange of new data until validated.
Remediation options: require the vendor to sign addenda to the DPA, apply technical controls (pseudonymisation, field-level encryption), or swap the workload to a different vendor. If contractual or technical remediation cannot be achieved in a time-bound manner, use offboarding procedures to stop data flows; record completion and verify deletion/return per the contract (see offboarding cross-link).

## Decision diagnostics and practical stop conditions

Use specific stop conditions: (a) New subprocessor in a jurisdiction lacking an adequate transfer mechanism without SCCs or equivalent safeguards — stop new data transfers pending legal safeguards. (b) Subprocessor claims access to raw email addresses but provides no contractual or technical evidence of limited access — suspend enrichment jobs that send raw identifiers. (c) Vendors that cannot provide SOC/ISO evidence for subprocessors accessing production data — escalate to procurement for contract clauses or change of provider.
State uncertainty: provider attestation of controls is useful but not definitive; where law or provider policy is unclear, involve legal counsel. The supplied guides explain controller/processor contract expectations and international transfer considerations and are directional; they do not replace legal advice [1][2].

## Reporting, cadence, and handoffs

Recommended cadence: run the full review quarterly and a mini-check within 10 business days of any vendor change notification. Maintain a versioned log of registers, reviewer notes, and decisions. Include a change summary with each review: what changed, why it matters, evidence, and remediation owner and deadline.
Handoffs: procurement should update commercial terms and record DPA amendments; privacy confirms legal adequacy and documents SCCs or other safeguards; security verifies technical controls and isolation. If stopping flows or offboarding is required, operations should execute the stop and verify artifact deletion or export.

## Practical checklist

- [ ] Identify vendors in scope (mail delivery, list management, enrichment, brokers) and export current contracts and DPAs.
- [ ] Request the vendor’s current subprocessor register and change log with dates for additions/removals.
- [ ] Map each subprocessor to technical evidence (network logs, cloud regions, contractor domains).
- [ ] Verify legal basis for any third-country transfers and capture the clause or safeguard (e.g., SCC text or transfer mechanism) from the DPA [2].
- [ ] Confirm proof of controls for subprocessors that access production data (SOC2/ISO reports or equivalent attestations).
- [ ] Classify each change: no-impact, monitor, or immediate-action; record owner and deadline.
- [ ] If immediate-action, require DPA addendum, technical mitigation, or suspend data flows until resolved.
- [ ] Log remediation completion and verify deletion/return per offboarding procedures; escalate unresolved items to legal/procurement.
- [ ] Schedule the next review and note triggers for ad-hoc re-review (new subprocessor, new country, or new processing purpose).

## Where RepMail fits

Use this template as a checklist and operational playbook inside outbound or compliance workflows: attach it to vendor review tickets, use the decision table to route escalations, and require documentation before approving new enrichment or mail-processing pipelines. Do not treat the template as legal advice; instead, use it to collect and structure evidence that legal and procurement teams can act on.

Continue with [Cold Email Compliance Recordkeeping: What to Log](/repmail/learn/compliance/cold-email-compliance-recordkeeping) for the next step in the workflow.

## Related RepMail guides

- [DPIA Review After a New Vendor, Model, or Data Source](/repmail/learn/compliance/dpia-review-after-processing-change)
- [Onward Transfer Inventory for Email Service Chains](/repmail/learn/compliance/onward-transfer-inventory-email-services)


## Sources

[1]: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/contracts-and-liabilities-between-controllers-and-processors-multi/ "UK Information Commissioner guidance"
[2]: https://www.edpb.europa.eu/sme/be-compliant/international-data-transfers_en "European Data Protection Board guidance"
