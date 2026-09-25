---
product: repmail
academy: compliance
contentType: guide
slug: b2b-corporate-subscriber-vs-individual-address
title: "B2B Corporate Subscriber vs. Individual Address: PECR Routing"
description: "B2B Corporate Subscriber vs. Individual Address: PECR Routing — B2B senders need a routing rule when a corporate mailbox is mixed with personal or sole-trader."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["compliance","privacy","b2b","corporate","subscriber"]
assets:
  - type: table
    title: "Decision/Diagnostic Table: Routing rule quick reference"
    content:
      headers: ["Key signal","High-confidence indicator","Action","Owner"]
      rows:
        - ["Mailbox form","role@company.com or info@/sales@","Route as corporate subscriber","Campaign Ops"]
        - ["Named mailbox + capture","firstname.lastname@company.com AND lead form with person name","Route as individual; require consent/lawful basis verification","Compliance"]
        - ["Domain type","Generic mailbox on personal domain or sole-trader domain","Route as individual","Data Engineering"]
        - ["Provenance","Imported from corporate supplier list with contractual relationship","Route as corporate with documented contractual evidence","Account Management"]
        - ["Ambiguous/No evidence","No directory match, no capture metadata, single signal only","Place in quarantine for verification","Campaign Ops / Compliance"]
featured: false
collections: ["compliance-operations"]
learningPaths: []
keyTakeaways:
  - "B2B senders need a routing rule when a corporate mailbox is mixed with personal or sole-trader data."
  - "Distinct from general B2B marketing guidance by focusing on identity and routing decisions."
  - "Link to B2B, lawful basis, and audience qualification."
commonMistakes:
  - "Skipping this check: Add identity_type and evidence_score fields to the contact schema."
  - "Skipping this check: Implement enrichment for domain type, corporate directory match, and capture context at ingestion."
  - "Skipping this check: Create deterministic routing rules mapping identity_type to send paths (corporate, individual, quarantine)."
faqs:
  - question: "If an address uses a company domain but is a freelancer, how should I route?"
    answer: "If the address represents a natural person (e.g., captured with a personal name, engaged as a sole trader, or invoiced personally), treat it as an individual. Document the evidence that prompted reclassification. When in doubt, route to quarantine until you can verify the business relationship."
  - question: "Can I rely on automated enrichment alone to classify identity?"
    answer: "Automated enrichment is necessary for scale but has limits. Use enrichment as an evidence source and capture an evidence_score rather than a final legal conclusion. Require manual review or contractual documentation for high-volume corporate routing or where the legal basis is contested."
  - question: "What should I do if recipients complain that a corporate-routed message felt personal?"
    answer: "Immediately reclassify the address to individual, stop corporate routing, record the complaint as new evidence, and follow your complaint/escalation process. Consider sampling similar addresses sharing signals with the complained address to detect systemic misclassification."
nextStep:
  label: "Continue with Cold Email Compliance Recordkeeping: What to Log"
  href: "/repmail/learn/compliance/cold-email-compliance-recordkeeping"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

If a corporate mailbox is mixed with personal or sole-trader data, treat routing as a jurisdictional and identity-decision problem: decide whether the address is processed as a corporate subscriber (exempt from certain electronic-consent rules) or as personal data requiring explicit consent or a lawful basis. Use identity signals, sale context, and data-source provenance to apply a deterministic routing rule and log the decision.

## Decision boundary: corporate subscriber vs individual address

Define the decision boundary as whether the recipient address represents an organisational subscription point (shared role or corporate mailbox) versus an identifiable natural person. The key operational signals are mailbox form (role@company.com vs firstname.lastname@), data source (public corporate directory vs CRM lead capture), and contractual relationship (B2B contract or account contact).
Operationally, do not rely on domain alone. Some personal addresses use company domains and some sole traders use personal domains. Make the decision outcome explicit in the contact record (e.g., field: identity_type = corporate | individual | unknown) and require audit metadata explaining which signals were used.

## Evidence and limits: what you can and cannot assume

Treat public guidance as directional: UK ICO materials outline different treatment for business-to-business direct marketing and the use of electronic mail, but they do not provide a binary test you can apply without context [1][2]. Use those sources to justify a conservative posture but record uncertainty.
Do not assume that a company-domain address is automatically a corporate subscriber for PECR purposes. If the address is tied to a named individual, or data was captured through a personal-sales interaction or consent flow, classify it as an individual. Where the provenance is ambiguous, apply the stricter routing (individual) until further verification.

## Practical routing sequence to implement in send pipelines

1) Enrich and classify: at ingestion, enrich addresses with domain type, corporate directory presence, and CRM capture metadata. Use deterministic rules to set identity_type. 2) Route: map identity_type to routing actions — corporate -> B2B routed path (documented lawful basis check), individual -> consent-required path, unknown -> quarantine for verification.
3) Log and monitor: write the decision, supporting evidence, and reviewer into an immutable audit trail. Fail sends to quarantine when identity evidence is insufficient. Periodically sample 'corporate' decisions to ensure they reflect actual organisational subscriptions.

## Practical fields and owners to add to systems

Add or standardise these fields in your CRM/send platform: identity_type, identity_sources (list), evidence_score (numeric), last_verified_by, last_verified_at, and route_tag. Assign owners: Data Engineering implements enrichment and routing logic; Compliance signs off rules and sampling tests; Campaign Ops enforces quarantine and re-verification workflows.
Define stop conditions: if evidence_score falls below a threshold or a recipient reports the message as personal, immediately reclassify to individual and remove from corporate routing for future sends.

## Example decision flow (short)

Example: an address captured from a public corporate directory and matching a role mailbox is enriched with directory evidence and a high evidence_score — route as corporate. Example: a single-person consultancy using a personal domain, captured via a lead form listing the person's name, scores low on corporate signals — route as individual and require consent or lawful basis verification.
These examples illustrate that a small change in evidence (named contact vs role address, capture context) should flip routing. Document each example in your operations playbook so analysts can reproduce classification logic.

## Practical checklist

- [ ] Add identity_type and evidence_score fields to the contact schema.
- [ ] Implement enrichment for domain type, corporate directory match, and capture context at ingestion.
- [ ] Create deterministic routing rules mapping identity_type to send paths (corporate, individual, quarantine).
- [ ] Log decision metadata (which signals used, actor, timestamp) to an immutable audit trail.
- [ ] Sample 1% of corporate-classified addresses monthly for manual verification.
- [ ] Define reclassification triggers: bounce patterns, recipient complaints, or new evidence.
- [ ] Train Campaign Ops and Compliance on the stop conditions and escalation flow.
- [ ] Deploy a quarantine workflow for unknown/ambiguous identities pending verification.

## Where RepMail fits

Use this guide as an operational checklist and a decision aid to implement deterministic routing in outbound workflows. RepMail teams can adopt the fields, routing map, and sampling controls described here to reduce overbroad B2B exemptions and to generate audit trails for compliance reviews. Note: specific legal interpretation and provider behaviour may vary; consult legal counsel and platform documentation for binding decisions.

Continue with [Cold Email Compliance Recordkeeping: What to Log](/repmail/learn/compliance/cold-email-compliance-recordkeeping) for the next step in the workflow.

## Related RepMail guides

- [Adequacy Decision vs. Safeguard: Cross-Border Routing Choice](/repmail/learn/compliance/adequacy-vs-safeguard-cross-border-routing)
- [CAN-SPAM Opt-Out SLA Monitoring and Escalation](/repmail/learn/compliance/can-spam-opt-out-sla-monitoring)


## Sources

[1]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/ "UK Information Commissioner guidance"
[2]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-electronic-mail/ "UK Information Commissioner guidance"
