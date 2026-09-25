---
product: repmail
academy: compliance
contentType: guide
slug: casl-identification-agencies-affiliates
title: "CASL Identification for Agencies and Multiple Affiliates"
description: "CASL Identification for Agencies and Multiple Affiliates — Agency sends must identify the sender and represented persons without hiding behind one brand."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["compliance","privacy","casl","identification","agencies"]
assets:
  - type: table
    title: "Multi-affiliate CASL Identification Diagnostic"
    content:
      headers: ["Diagnostic question","Pass condition","Action if fail","Owner"]
      rows:
        - ["Is there written authorization for this campaign?","Yes — stored in ticket/contract","Obtain and attach authorization before send","Account manager"]
        - ["Does the footer name the represented person and provide postal address?","Yes — exact legal name and address present","Update footer and re-approve template","Template owner"]
        - ["Do From:/Reply-To:/List-Unsubscribe fields match documented ownership?","Yes — ownership documented and aligned","Map fields and add explanatory footer statement","Deliverability engineer"]
        - ["Are unsubscribe links and contact methods tested and functional?","Yes — tested in staging and logged","Fix broken links and retest","QA analyst"]
        - ["Does the message explicitly state agency/client relationship when branding could confuse recipients?","Yes — explicit \"on behalf of\" language present","Add explicit statement in header/footer and notify legal if client objects","Account manager"]
featured: false
collections: ["compliance-operations"]
learningPaths: []
keyTakeaways:
  - "Agency sends must identify the sender and represented persons without hiding behind one brand."
  - "Distinct from generic sender identification; handles multi-party agency scenarios."
  - "Link to agency governance and footer QA."
commonMistakes:
  - "Skipping this check: Confirm written authorization from the represented person specifying campaign scope and contact details."
  - "Skipping this check: Verify From:, Reply-To:, and List-Unsubscribe headers are set and documented, and note which party controls each."
  - "Skipping this check: Include an explicit footer naming the represented person, their postal address, and at least one direct contact method."
faqs:
  - question: "If the agency appears in the From: field, is that sufficient identification?"
    answer: "Not by itself. If the agency appears in From:, the message must still clearly identify the person on whose behalf the message is sent (for example in the footer with name and contact details). The CRTC guidance gives direction but not exact technical field rules, so require both visible sender identification and explicit represented-person identification [1]."
  - question: "Can the represented person be identified only by brand/logo without legal name and address?"
    answer: "No — a logo alone is insufficient. CASL-directed guidance expects identification sufficient for a recipient to know who is responsible and how to contact them; include a legal or trading name and postal address plus an email or phone number in the message body or footer [1]."
  - question: "What should we do if our ESP disallows custom From: strings?"
    answer: "Document the limitation, use the footer to state the agency-client relationship explicitly, and ensure Reply-To and List-Unsubscribe point in a way that connects recipients to the responsible party. Record the exception, test the visible experience, and escalate to legal if the represented person considers the identification insufficient."
nextStep:
  label: "Continue with Cold Email Compliance Recordkeeping: What to Log"
  href: "/repmail/learn/compliance/cold-email-compliance-recordkeeping"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Under CASL, agency-originated commercial electronic messages must clearly identify the person on whose behalf the message is sent and the sender; agencies cannot hide the represented party behind a single brand. This guide explains how to structure identification, who owns which fields, how to validate multi-affiliate sends, and practical stop conditions for common failure modes.

## Decision boundary: when CASL requires dual identification

CASL applies to commercial electronic messages (CEMs). When an agency sends a CEM on behalf of another organization (a represented person or affiliate), the message must identify both the sender (the agency) and the person on whose behalf the message is sent. If the agency is simply relaying an organization's already-owned message without altering sender identity, normal single-party identification may suffice; if the agency is the apparent sender or operates the mail stream, dual identification is required.

Evidence limits: the CRTC guidance describes identification requirements but leaves implementation details (which header and footer fields satisfy identification) to operators and legal counsel; treat the guidance as directional for technical design and escalate legal questions to counsel [1].

## Concrete fields to use and who controls them

Use both visible branding and explicit textual identification. Visible fields include From: name and email, Reply-To: (if different), and the notice area in the message footer. The agency should appear in From: or the notice area and the represented person must be named explicitly in the notice area with contact information (mailing address, either phone or email). For clarity, avoid hiding the represented person solely behind a brand or domain owned by the agency.

Ownership and control: the sender field (From:) is typically controlled by the sending platform/account — usually the agency. The footer identification and unsubscribe mechanism are a joint responsibility: the agency must ensure the footer names the represented person and provides valid contact details; the represented person must provide accurate contact details and approve the content. Record who provided and verified each field.

## Sequence for validating a multi-affiliate send

1) Pre-send: Confirm written authorization from the represented person for the specific campaign and capture the approved contact details and legal entity name. 2) Template check: Ensure the template includes a footer that explicitly names the represented person, their contact info, and an unsubscribe method. 3) Technical check: Verify From:, Reply-To:, and List-Unsubscribe headers align with the stated responsible parties or that the footer explains any differences. 4) Final QA: A human reviewer ticks off identity, contact details, and unsubscribe link operation before send.

Stop conditions: Do not send if contact details are missing or inconsistent, if authorization is not documented, or if list-unsubscribe is broken. Escalate to legal or account owner if the represented person disputes the exact wording.

## Common failure modes and remediation steps

Failure: Only agency brand visible in From: and footer lacks the represented person. Remediation: Update footer to include represented person legal name, postal address, and a direct contact method; consider using a From: name like "Agency on behalf of [Client]."

Failure: From: domain is the agency domain but unsubscribe and invoice/contact address point to client domains with no explanation. Remediation: Provide an explicit statement in the footer explaining the relationship ("Sent by Agency X on behalf of Client Y") and make sure unsubscribe and contact actions route appropriately. If routing cannot be aligned, add clear contact details for both parties and log the exception.

## Examples (labelled) and practical templates

Example — short footer template: "This message was sent by Agency X on behalf of Client Y (Client Y, 123 Main St, City, Province). To contact Client Y, email contact@clienty.example or call 555-0100. To unsubscribe, click [link]."

Example — header configuration: From: "Agency X on behalf of Client Y" <mail@agency.example> Reply-To: contact@clienty.example List-Unsubscribe: <mailto:unsubscribe@clienty.example> or <https://link.example/unsub?id=abc>. These examples convey ownership and allow recipients to identify the responsible parties.

## Evidence, uncertainty, and escalation

The CRTC FAQ provides directional guidance on identification requirements but does not prescribe exact header/footer strings; treat it as the authoritative starting point and record-specific implementation as operational policy [1].

For legal determinations about sufficiency of identification in specific jurisdictions or edge cases (for example a complex affiliate network or DBAs), escalate to counsel. For provider-specific constraints (mailbox providers, ESP header restrictions), test in staging and document any compensating controls.

## Practical checklist

- [ ] Confirm written authorization from the represented person specifying campaign scope and contact details.
- [ ] Verify From:, Reply-To:, and List-Unsubscribe headers are set and documented, and note which party controls each.
- [ ] Include an explicit footer naming the represented person, their postal address, and at least one direct contact method.
- [ ] If From: uses agency branding, add a clear phrase such as "on behalf of [Client]" in From: or the top of the message.
- [ ] Test all unsubscribe paths and contact links in a staging send and log results.
- [ ] Record who verified identity fields (name, role) and where the approval is stored (ticket, contract, email).
- [ ] Block the send if any identification field is missing, inconsistent, or unverified.
- [ ] Document exceptions and mitigation steps if platform limitations prevent ideal header/footer alignment.
- [ ] Retain copies of the final message and approval for at least the organization’s record-retention period.

## Where RepMail fits

Use this guide as a checklist and diagnostic before agency sends: incorporate the checklist and the diagnostic table into your agency governance and footer QA flows to reduce missing-party identification defects. Do not treat this guide as legal advice; escalate jurisdictional questions to counsel and platform-specific constraints to your ESP or deliverability contact.

Continue with [Cold Email Compliance Recordkeeping: What to Log](/repmail/learn/compliance/cold-email-compliance-recordkeeping) for the next step in the workflow.

## Related RepMail guides

- [CASL Express Consent Evidence Packet](/repmail/learn/compliance/casl-express-consent-evidence-packet)
- [CASL Implied Consent Expiry Calendar](/repmail/learn/compliance/casl-implied-consent-expiry-calendar)


## Sources

[1]: https://crtc.gc.ca/eng/com500/faq500.htm "Canadian Radio-television and Telecommunications Commission guidance"
