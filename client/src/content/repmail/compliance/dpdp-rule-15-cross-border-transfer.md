---
product: repmail
academy: compliance
contentType: guide
slug: dpdp-rule-15-cross-border-transfer
title: 'DPDP Rule 15 and Cross-Border Transfers: India’s Rules'
description: A dated, practical explanation of DPDP Rule 15, its transfer mechanism,
  staged commencement, and how to review an India-facing email stack.
authorSlug: repmail-team
publishedAt: '2026-10-26'
updatedAt: '2026-10-26'
tags:
- India DPDP
- cross-border data transfers
- privacy compliance
- email procurement
collections:
- compliance-operations
learningPaths:
- deliverability-mastery
keyTakeaways:
- Rule 15 creates a mechanism for Central Government transfer requirements; it is
  not itself a blanket data-localization rule.
- As of October 26, 2026, Rule 15 is scheduled to commence on May 13, 2027, eighteen
  months after the Rules’ publication.
- The DPDP Act’s section 16 and Rule 15 should be read with applicable notifications,
  orders, and other relevant obligations.
- An email-stack review should map data, routes, parties, applicable requirements,
  and controls.
commonMistakes:
- Treating Rule 15 as an order that all personal data must remain in India.
- Describing Rule 15 as an already-operative duty before its scheduled commencement.
- Assuming that no transfer conditions apply simply because Rule 15 is not yet in
  force.
- Reviewing only the provider’s primary hosting location while overlooking processing,
  access, or subprocessors.
faqs:
- question: Does Rule 15 prohibit transfers of personal data outside India?
  answer: Not as a blanket prohibition in its own text. It provides a mechanism for
    the Central Government to specify requirements through general or special orders.
    Check for applicable orders and other requirements before deciding on a transfer.
- question: Is Rule 15 in force on October 26, 2026?
  answer: No. Under the Rules’ staged commencement provision, Rule 15 is scheduled
    to commence eighteen months after publication on November 13, 2025, which is May
    13, 2027. Verify current official notifications before relying on that date.
- question: Does Rule 15 mean an email provider must host all data in India?
  answer: Rule 15 alone does not state a universal hosting-location requirement. Review
    the actual data flows, any applicable government orders, contracts, and other
    laws or sector-specific requirements.
nextStep:
  label: Review international transfers in your email stack
  href: /repmail/learn/compliance/international-transfer-review-email-tools
  description: Use a structured vendor and data-flow review to document the parties,
    locations, and controls involved.
assets:
- type: table
  title: India email-stack cross-border transfer review
  content:
    rows:
    - - Data inventory
      - Contact fields, message content, event data, purpose
      - What personal data is handled and why?
    - - Transfer map
      - Storage, processing, support access, subprocessors, locations
      - Where is data made available outside India?
    - - Parties and roles
      - Organization, provider, processors, recipients
      - Who determines purposes and who processes on instructions?
    - - Applicable requirements
      - Commencement dates, government orders, contracts, sector rules
      - Which current requirements apply to this specific route?
    - - Controls and review date
      - Access, retention, deletion, security, escalation owner
      - What evidence supports the decision, and when should it be revisited?
    headers:
    - Review step
    - Evidence to collect
    - Question to resolve
---

As of October 26, 2026, India’s Digital Personal Data Protection Rules, 2025 provide a mechanism for the Central Government to impose requirements on transfers of personal data outside India. Rule 15 does not itself establish a blanket requirement to keep all personal data in India. Importantly, Rule 15 is subject to staged commencement and is not yet in force on this date. [1]

This is general information, not legal advice.

## What Rule 15 says about transfers

Rule 15 addresses personal data processed by a Data Fiduciary, either directly or on its behalf. Its mechanism is that the Central Government may specify, by general or special order, requirements that apply when personal data is made available to a foreign State or territory, or to a person or entity under its control or agency. The Rule also provides for requirements concerning making such data available to a person or entity outside India. Consult the notified text for the exact scope and wording. [1]

The important distinction is between a power to impose requirements and an across-the-board localization command. Rule 15 does not, by itself, say that every organization must store all personal data in India or prohibit all transfers abroad. The government may impose requirements through orders; any applicable order would need to be assessed alongside the Rule and the rest of the legal framework. [1]

The DPDP Act also addresses transfers in section 16. It provides for the Central Government to restrict transfers to countries or territories outside India and recognizes that transfers may be subject to prescribed requirements. Read section 16 and Rule 15 together, rather than treating a summary of either one as a universal permission or prohibition. [1][2]

## The commencement date changes the answer

The Rules were notified with different commencement dates. Under the commencement provision, Rule 15 falls within the group scheduled to commence eighteen months after publication. On the notification date of November 13, 2025, that points to May 13, 2027. As of October 26, 2026, the provision is therefore not yet in force. [1]

The Act also has staged commencement. Its section 16 is scheduled to commence eighteen months after the Act’s commencement notification. Check the relevant notification and the current official text before relying on this timing for a live decision. [2]

This distinction matters for planning: the notified text is useful to prepare against, but a provision that has not commenced should not be described as a current operational duty. Nor should organizations assume that no other privacy, contractual, security, or sector-specific requirements apply to a transfer.

## A practical review for an India-facing email stack

Treat cross-border review as a data-flow and vendor-governance task, not just a hosting-location question. Map what personal data enters the email workflow, where it is processed, who can access it, and whether it is disclosed to an overseas provider or another recipient. Identify the relevant roles and purposes, then check contracts, access controls, retention, and incident processes against your organization’s requirements.

For a structured review, start with [compliance operations](/repmail/learn/compliance/international-transfer-review-email-tools) and the [international transfer review for email tools](/repmail/learn/compliance/international-transfer-review-email-tools). Teams evaluating a new market can also use the [new-country compliance workflow](/repmail/learn/compliance/cold-email-compliance-new-country). These operational resources support due diligence; they are not a legal determination that a transfer is permitted.

### Email-stack transfer review checklist

| Review step | What to record | Decision prompt |
|---|---|---|
| Map the data | Contact fields, message content, tracking or event data, and source | Which personal data is handled, and for what purpose? |
| Trace the route | Storage, processing, support access, subprocessors, and recipient locations | Is data made available outside India, directly or through a provider? |
| Identify the parties | Your organization, email provider, processors, and other recipients | Who determines the purpose and means, and who processes on instructions? |
| Check requirements | Applicable laws, notified commencement, government orders, contracts, and sector rules | Is there a current restriction or condition relevant to this transfer? |
| Record controls | Access, retention, deletion, security, and escalation contacts | Can the organization evidence its review and revisit it when facts change? |

Keep the review dated. For a broader country-specific outreach review, see [cold email compliance for a new country](/repmail/learn/compliance/cold-email-compliance-new-country). Revisit it when the Rules commence, when an applicable government order is issued, or when the vendor, data, purpose, or transfer route changes. This is especially important for an email stack where contact records, message content, and service telemetry may follow different routes.

## What this means for procurement

Do not accept “data stays in India” or “cross-border transfers are unrestricted” as a complete conclusion based only on Rule 15. Ask the provider for relevant processing and subprocessor information, identify the data and locations in scope, and obtain advice on the organization’s specific obligations. RepMail by LetsZero should be assessed through the same evidence-led vendor review; no claim about a particular deployment’s data location or legal status follows from the Rule itself.

For a practical vendor-review sequence, see [international transfer review for email tools](/repmail/learn/compliance/international-transfer-review-email-tools). For an operational control checklist, see [compliance operations](/repmail/learn/collections/compliance-operations). The official Rules and Act are the primary references for the text and commencement framework. Because the provisions are staged and this area may change, verify the latest notifications and orders before making or documenting a transfer decision.

## Sources

[1]: https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf
[2]: https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf
[3]: https://puzzleinbox.com/blog/cold-email-india-dpdp-act-2026
