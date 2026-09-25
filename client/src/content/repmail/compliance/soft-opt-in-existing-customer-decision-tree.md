---
product: repmail
academy: compliance
contentType: guide
slug: soft-opt-in-existing-customer-decision-tree
title: "Soft Opt-In Decision Tree for Existing Customers"
description: "Soft Opt-In Decision Tree for Existing Customers — Marketers struggle to separate customer relationship, compatible products, notice, and easy opt-out conditio."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["compliance","privacy","soft","opt","decision"]
assets:
  - type: table
    title: "Compact diagnostic decision table"
    content:
      headers: ["Question","Pass → Action","Fail → Action"]
      rows:
        - ["Was the contact collected during an actual sale or negotiation?","Proceed to product compatibility check; archive sale record.","Do not rely on soft opt‑in; run a consent acquisition workflow."]
        - ["Is the promoted product/service similar to the original purchase?","Proceed to notice verification; tag recipients for this campaign.","Exclude contact or seek explicit consent; consider a tailored consent prompt."]
        - ["Was clear notice given at collection that details could be used for marketing similar products?","Proceed to template opt‑out verification; attach notice proof to campaign record.","Do not send under soft opt‑in; consent needed or use a transactional message only."]
        - ["Does each message include a tested, free opt‑out that is honored promptly?","Send under soft opt‑in with monitoring enabled.","Fix unsubscribe before sending; use suppression until resolved."]
        - ["Is the recipient outside the jurisdiction or beyond dormancy threshold?","Apply regional/legal check or explicit consent workflow.","Follow local law/consent process; do not assume PECR applies."]
featured: false
collections: ["compliance-operations"]
learningPaths: []
keyTakeaways:
  - "Marketers struggle to separate customer relationship, compatible products, notice, and easy opt-out conditions."
  - "Narrow PECR/ePrivacy workflow; not the existing broad consent or transactional classification pages."
  - "Link from regional compliance overview and campaign preflight."
commonMistakes:
  - "Skipping this check: Locate and save the provenance record showing contact was collected during sale/negotiation (timestamp, page, order ID)."
  - "Skipping this check: Map customer purchase to product taxonomy and confirm compatibility with the planned promotion."
  - "Skipping this check: Retrieve and archive the exact notice displayed at point of collection (screenshot or HTML)."
faqs:
  - question: "Can I use soft opt‑in for cross‑sell emails to customers who bought years ago?"
    answer: "Not automatically. Dormancy or major product changes are a practical stop condition. If the customer has been inactive beyond your predefined threshold, or if the offering has materially changed, you should not rely on soft opt‑in without further evidence or renewed consent. Define and document your dormancy cutoff and escalate borderline cases to Privacy/Compliance."
  - question: "Is a generic privacy policy link sufficient notice at point of collection?"
    answer: "No. The notice should be proximate and unambiguous at the moment the contact is collected (e.g., explicit text near the email field). A privacy policy link alone is typically insufficient for the narrow soft opt‑in justification; retain a screenshot or stored copy of the actual notice used during collection."
  - question: "If a contact unsubscribes but later re‑engages, can I rely on the original soft opt‑in?"
    answer: "Treat an unsubscribed address as opted out until the user explicitly opts back in. Do not infer consent from later engagement signals unless the user has clearly and voluntarily re‑subscribed or given explicit consent for marketing."
nextStep:
  label: "Continue with Cold Email Compliance Recordkeeping: What to Log"
  href: "/repmail/learn/compliance/cold-email-compliance-recordkeeping"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

If you have an existing customer contact and need to decide whether soft opt‑in covers a specific re‑engagement, follow a tight decision path that separates (1) the nature of the existing relationship, (2) the product or service compatibility, (3) required notice at point of data collection, and (4) the presence of an easy opt‑out in every message. This guide gives a stepwise decision tree, practical evidence limits, and implementation checkpoints to reduce regulatory risk when relying on PECR/ePrivacy soft opt‑in rules.

## Step 1 — Confirm the qualifying customer relationship

Decision boundary: Soft opt‑in applies only where the recipient is an existing customer who has bought or negotiated for similar goods/services. Confirm by checking the transaction record, contract status, and whether the contact detail was collected during the sale or negotiation. If the contact was obtained from a third party or from public sources after the sale, you do not satisfy this condition.

Evidence limits & sequence: Look for an order number, signed contract, or captured checkout consent field with a timestamp and source. If the only record is a marketing lead form rather than a purchase, stop: soft opt‑in will likely not apply. Keep a short provenance log (date, form/page, user action) as the owner-level evidence for audits.

## Step 2 — Check product or service compatibility

Decision boundary: The message content must promote products or services 'similar' or 'related' to what the customer originally bought. Define similarity operationally in your business: same product line, complementary services, or later editions/upgrades. Explicitly document the mapping you use (e.g., 'starter subscription' → 'premium features, upgrades').

Evidence limits & sequence: Use taxonomy tags on product records to automate the compatibility check. If a campaign targets across taxonomies, segment out recipients whose previous purchases fall outside the defined set and treat them as needing explicit consent. When in doubt, err toward seeking consent rather than stretching similarity.

## Step 3 — Verify notice at point of data collection

Decision boundary: At the moment you collected the email (or other electronic contact), customers must have received clear notice that you might use their details for marketing similar products and that they could opt out easily. That notice can be a checkbox with accompanying text or a clear statement on the checkout page.

Evidence limits & sequence: Retain a copy or screenshot of the page or form used at collection time. If your records lack a captured notice or the notice language is vague, you should not proceed on soft opt‑in. Note that a general privacy policy link alone is usually insufficient; the notice should be proximate and unambiguous.

## Step 4 — Ensure an easy, free opt‑out in every message

Decision boundary: Each marketing message relying on soft opt‑in must include a simple, cost‑free way to opt out (e.g., one‑click unsubscribe link or clear reply instructions). The opt‑out must be operational and honored promptly; failures here convert lawfulness risk into compliance breach.

Evidence limits & sequence: Test the unsubscribe for each template and vendor route before sending. Log opt‑out requests and measure processing time. If opt‑outs are routed through separate systems, verify the synchronization path and stop sending to addresses removed within the required timeframe.

## Step 5 — Operationalize exceptions and stop conditions

Decision boundary: Even when the four conditions above are met, certain scenarios should stop the reliance on soft opt‑in: cross‑border recipients where local law diverges, reactivating lapsed customers after long dormancy, or product changes that materially alter the offering. Define thresholds (e.g., inactivity >24 months) that force explicit consent.

Evidence limits & sequence: Maintain a short exception checklist that triggers an alternative workflow (consent campaign or transactional notification). Record the owner responsible for escalation (typically Privacy/Compliance and Campaign Ops) and the criteria that force the safer path.

## Practical checklist

- [ ] Locate and save the provenance record showing contact was collected during sale/negotiation (timestamp, page, order ID).
- [ ] Map customer purchase to product taxonomy and confirm compatibility with the planned promotion.
- [ ] Retrieve and archive the exact notice displayed at point of collection (screenshot or HTML).
- [ ] Verify unsubscribe mechanism exists in the message template; perform an end‑to‑end test.
- [ ] Implement a sync verification between unsubscribe logs and send suppression lists.
- [ ] Apply a dormancy cutoff (e.g., >24 months) and route those contacts to an explicit consent workflow.
- [ ] Flag cross‑border recipients for legal check where ePrivacy/PECR equivalents may not apply.
- [ ] Document the business owner (campaign owner) and privacy owner for each campaign using soft opt‑in.
- [ ] Record and retain a simple audit entry (who, what, why, evidence location) before sending.

## Where RepMail fits

Use this guide as a preflight checklist and decision aid in your outbound campaign workflow. Operational teams can map each decision step to a preflight gate (data provenance, taxonomy match, archived notice, template unsubscribe test, regional/dormancy exceptions) and require sign‑off before sending. This reduces rework and centralizes the evidence needed for audits.

Continue with [Cold Email Compliance Recordkeeping: What to Log](/repmail/learn/compliance/cold-email-compliance-recordkeeping) for the next step in the workflow.

## Related RepMail guides

- [Adequacy Decision vs. Safeguard: Cross-Border Routing Choice](/repmail/learn/compliance/adequacy-vs-safeguard-cross-border-routing)
- [CAN-SPAM Opt-Out SLA Monitoring and Escalation](/repmail/learn/compliance/can-spam-opt-out-sla-monitoring)


## Sources

[1]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-electronic-mail/ "UK Information Commissioner guidance"
[2]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/ "UK Information Commissioner guidance"
