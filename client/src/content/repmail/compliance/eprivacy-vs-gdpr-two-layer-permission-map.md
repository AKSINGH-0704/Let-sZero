---
product: repmail
academy: compliance
contentType: comparison
slug: eprivacy-vs-gdpr-two-layer-permission-map
title: "ePrivacy vs. GDPR: Two-Layer Marketing Permission Map"
description: "ePrivacy vs. GDPR: Two-Layer Marketing Permission Map — Practitioners confuse electronic-marketing permission rules with GDPR personal-data lawful basis."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["compliance","privacy","eprivacy","gdpr","two"]
assets:
  - type: table
    title: "Decision / diagnostic table: marketing send next steps"
    content:
      headers: ["Condition","GDPR lawful-basis documented?","ePrivacy/PECR permission status","Action"]
      rows:
        - ["Transactional message (order update)","Yes (contract or legal obligation)","Not required for transactional content","Proceed; attach basis and message classification"]
        - ["Marketing to existing customer after purchase","Possibly (contract fulfilment or legitimate interest if evaluated)","Soft-opt-in present (purchase + clear opt-out) — verify evidence","Proceed if soft-opt-in evidence present; otherwise require consent"]
        - ["Cold marketing to purchased list","No documented lawful-basis or LIA","Consent required and absent","Do not send; collect explicit consent before marketing"]
        - ["Profiling for targeting before first marketing contact","No lawful-basis for profiling","Even with lawful-basis, consent may be required for marketing channel","Pause profiling; obtain lawful-basis and channel permission before targeting"]
        - ["Recipient is in stricter jurisdiction or location ambiguous","Uncertain or requires regional assessment","Assume ePrivacy/PECR-like consent required until clarified","Route to conservative workflow; capture location proof before sending"]
featured: false
collections: ["compliance-operations"]
learningPaths: []
keyTakeaways:
  - "Practitioners confuse electronic-marketing permission rules with GDPR personal-data lawful basis."
  - "Distinct synthesis of two regulatory layers rather than another GDPR overview."
  - "Link to lawful-basis, PECR, and regional routing pages."
commonMistakes:
  - "Skipping this check: Record the exact processing activity and assign a GDPR lawful-basis with a named owner (legal/compliance)."
  - "Skipping this check: Classify the communication as marketing or transactional and document the rationale in the ticket."
  - "Skipping this check: Search and attach consent evidence: timestamp, form text, origin URL, and version number if relying on consent."
faqs:
  - question: "If we have a GDPR lawful basis, can we always send marketing emails?"
    answer: "No. A GDPR lawful basis for processing personal data and the separate permission required by electronic-marketing rules are cumulative. Even with a lawful basis you must still satisfy channel-specific ePrivacy/PECR requirements (consent or valid soft-opt-in) for marketing messages. See ICO guidance for marketing/PECR directionality [1]."
  - question: "What is a safe order of checks before approving a campaign?"
    answer: "First, document the GDPR lawful basis for the processing activities needed for the campaign. Second, classify the message as transactional or marketing. Third, validate channel permissions (consent or soft-opt-in) and attach evidence. Fourth, run suppression and regional routing checks. Stop if any required permission or evidence is missing."
  - question: "Can a purchase alone be treated as consent for marketing?"
    answer: "Not always. A purchase can support a narrow soft-opt-in for marketing in some regimes if the marketing relates to similar products and an opt-out was provided at point of sale, but it is not universal consent for all marketing. Verify the scope, wording, and proof of opt-out/soft-opt-in before relying on it [1]."
nextStep:
  label: "Continue with Cold Email Compliance Recordkeeping: What to Log"
  href: "/repmail/learn/compliance/cold-email-compliance-recordkeeping"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Direct answer: Treat ePrivacy (electronic marketing/PECR-style rules) and GDPR lawful basis as two distinct, stacked legal checks. First confirm the lawful basis for processing personal data (GDPR), then independently confirm any electronic-marketing consent/opt-in rules (ePrivacy/PECR) before sending marketing messages; both must be satisfied for marketing messaging in most EU/UK workflows.

## Decision boundary: lawful basis vs. marketing permission

GDPR lawful basis determines whether you can process personal data at all (e.g., perform profiling, enrich contact records, or store identifiers). Processing for business operations, fulfilment, or analytics can rely on bases other than consent, but those bases do not automatically permit electronic marketing. See the ICO guidance for lawful-basis framing [2].

ePrivacy/PECR-style rules operate specifically on electronic communications channels (email, SMS, messaging apps). They often require an additional marketing permission (consent or a marketer-customer soft-opt-in) even when GDPR gives you a lawful basis to process the underlying data. Treat the layers as cumulative: GDPR = can you process; ePrivacy = can you message.

## Practical sequence to assess a marketing send

1) Identify what personal data fields you will use (email, name, event history). Record the lawful basis for each processing activity (e.g., contract, legitimate interest, consent) and the owner (legal/compliance or product). 2) Separately, classify the communication as marketing vs transactional; electronic-marketing rules usually apply only to marketing messaging. 3) If the channel is email/SMS, apply ePrivacy/PECR tests for required consent or valid soft-opt-in; if consent is required, ensure it meets the channel’s consent standard.

Document both conclusions in the ticket or handoff to legal: lawful-basis conclusion, ePrivacy permission conclusion, evidence (consent receipts, transactional flags), and stop conditions (no consent, opt-out present, or failed legitimate-interest assessment).

## Evidence limits and what to log

Record source evidence: explicit consent timestamp and wording, purchase/transaction timestamps for a soft-opt-in, or a documented Legitimate Interest Assessment (LIA) when relying on legitimate interest. Keep the actual consent text and where it appeared (signup form, checkout) with versioning.

Limitations: the ICO guidance is directional and not a substitute for case-specific legal advice; it does not change local variations or sector rules [1][2]. If you route regionally, store the provenance of user location and prefer conservative choices when location is ambiguous.

## Decision table (diagnostic)

Use the table below to decide next steps for a proposed marketing send. Apply rows top-to-bottom; stop at the first matching row.

Example: For a promotional email to customers who bought previously, consult the table to decide whether you can send.

Header: Condition | GDPR lawful-basis documented? | ePrivacy (consent/soft-opt-in) status | Action

Rows (see checklist table asset for machine-readable rows).

## Operational handoff checklist and owners

Keep the compliance review short and actionable: legal confirms lawful-basis, privacy ops confirm consent artifacts and channel classification, deliverability confirms routing and suppression lists, and product/marketing confirms message purpose and dataset. Use the checklist below to standardize handoffs and reduce “one-law” shortcuts.

Stop conditions: legal says no lawful basis; missing or insufficient electronic-marketing consent; active unsubscribe/opt-out; or user located in a jurisdiction with stricter rules than your routing plan.

## Practical checklist

- [ ] Record the exact processing activity and assign a GDPR lawful-basis with a named owner (legal/compliance).
- [ ] Classify the communication as marketing or transactional and document the rationale in the ticket.
- [ ] Search and attach consent evidence: timestamp, form text, origin URL, and version number if relying on consent.
- [ ] If relying on legitimate interest, attach a completed Legitimate Interest Assessment (LIA) and retention/mitigation records.
- [ ] For email/SMS, confirm ePrivacy/PECR applicability for recipient region and whether a soft-opt-in applies (purchase history, existing customer interactions) [1].
- [ ] Run suppression checks: historical unsubscribes, global do-not-contact flags, and channel-specific blocks before send.
- [ ] If consent is missing or inadequate, do not proceed with marketing send; either remove the recipient or move to a consent-collection flow.
- [ ] Log the final decision (who approved, which evidence files were used, and the stop conditions) within the campaign ticketing system.

## Where RepMail fits

This guide is a practical decision aid for outbound operations: use it as a checklist during campaign build, as the template for legal handoffs, and as a routing filter for regional sends. It helps reduce mistaken single‑law rationales (GDPR-only) and clarifies stop conditions so deliverability and operations teams can enforce suppression and consent gating prior to any marketing send.

Continue with [Cold Email Compliance Recordkeeping: What to Log](/repmail/learn/compliance/cold-email-compliance-recordkeeping) for the next step in the workflow.

## Related RepMail guides

- [Adequacy Decision vs. Safeguard: Cross-Border Routing Choice](/repmail/learn/compliance/adequacy-vs-safeguard-cross-border-routing)
- [B2B Corporate Subscriber vs. Individual Address: PECR Routing](/repmail/learn/compliance/b2b-corporate-subscriber-vs-individual-address)


## Sources

[1]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/ "UK Information Commissioner guidance"
[2]: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/ "UK Information Commissioner guidance"
