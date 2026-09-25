---
product: repmail
academy: compliance
contentType: template
slug: casl-express-consent-evidence-packet
title: "CASL Express Consent Evidence Packet"
description: "CASL Express Consent Evidence Packet — Canadian senders need to prove who consented, when, how, and for what message class."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["compliance","privacy","casl","express","consent"]
assets:
  - type: table
    title: "Decision diagnostic: can this record meet CASL burden?"
    content:
      headers: ["Condition checked","Pass — action","Fail — action"]
      rows:
        - ["Authoritative timestamp (server/webhook) present","Proceed to corroborate consent text and message class","Mark unverifiable; block promotional sends and start reconsent"]
        - ["Exact consent text archived","Map message class and produce packet","Recover site archive or mark for reconsent"]
        - ["Corroborating identifier (email + CRM ID)","Attach CRM record to packet","Identify source system or request identity confirmation from user"]
        - ["Recorded verbal consent has call recording and CRM note","Include recording and CRM entry, annotate transcript","Treat as no express consent for promotional messages"]
        - ["Implied consent supported by transaction records (invoice/contract)","Include transaction with date and scope","Do not rely on implied consent; seek express reconsent"]
        - ["Packet manifest with hashes and owner signed","Archive packet and log retention start","Create manifest and assign owner before audit"]
featured: false
collections: ["compliance-operations"]
learningPaths: []
keyTakeaways:
  - "Canadian senders need to prove who consented, when, how, and for what message class."
  - "More specific than existing consent-record page and centered on CASL burden of proof."
  - "Link to consent records, vendor imports, and audit."
commonMistakes:
  - "Skipping this check: Export contact record with unique identifier (email and internal ID) and freeze a copy (CSV/JSON)."
  - "Skipping this check: Export the original consent capture artifact (HTML snapshot, form submission, or call recording) and a human-readable PDF copy."
  - "Skipping this check: Capture authoritative timestamp: server event log, webhook receipt, or signed audit log entry; include IP/user-agent when available."
faqs:
  - question: "Is a screenshot of a signup form enough to prove consent?"
    answer: "A screenshot alone is weak evidence because it shows only appearance, not that a specific individual submitted the form at a given time. A defensible packet requires a server-side event (timestamped log or webhook receipt) that ties the form submission to the contact plus the exact consent text shown at that moment."
  - question: "How should I treat verbal consents captured on phone?"
    answer: "Verbal consent can be included if you have a recorded call or call transcript, a CRM entry linking the call to the contact, and a timestamped system event showing the call was logged. If call recording is not available, treat the consent as unverifiable for promotional messaging and initiate reconsent."
  - question: "What if my vendor export formats differ from our CRM fields?"
    answer: "Clearly document the field mappings in the packet manifest and include raw exports alongside mapped records. State uncertainty for any vendor-specific fields: if a mapped field cannot be independently verified (e.g., vendor-specific flags), include vendor logs or signed receipts that show how the field was set."
nextStep:
  label: "Continue with Cold Email Compliance Recordkeeping: What to Log"
  href: "/repmail/learn/compliance/cold-email-compliance-recordkeeping"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Collect and freeze a minimal, timestamped packet that ties each recipient to the exact consent event required by CASL: who consented, when, how, and what message class was consented to. Organize records so a reviewer can recreate the consent decision without vendor-specific interpretation; document gaps and remediation steps.

## What this packet must prove and the decision boundary

CASL places the burden of proof on the sender to show consent existed at the time the message was sent and to identify the scope (message class) of that consent. The packet must therefore recreate the consent decision: identity (email address plus any corroborating identifier), a precise timestamp, the consent mechanism (e.g., web form, verbal, implied with conditions), and the message class consented to (e.g., transactional vs. promotional). If any of these four elements are missing, the sender cannot reliably meet the CASL evidentiary threshold and must treat the contact as lacking consent until remediated.

Decision boundary: this packet is not an inbox deliverability report or user behavior log. It is an auditable consent record that a regulator or complainant can use to verify consent. Records documented elsewhere (analytics, marketing systems) can be referenced, but the packet must include the primary evidence files or persistent exports that substantiate the claim.

## Required components and precise evidence formats

Include these discrete items for each consent instance: (1) exported contact record with unique identifier and email, (2) original consent capture artifact (HTML snapshot, form submission record, audio or call log), (3) server-side timestamped event log or signed webhook, (4) the exact copy of the consent text shown to the user, and (5) the message class mapping used when consent was captured. Where possible, preserve checksums or signed hashes of exported files to show they have not been altered.

Evidence limits: screenshots without server logs are weak; they show appearance but not that the event occurred. Verbal consents require call recordings plus a corroborating CRM entry. Implied consent (business relationship) needs transactional proofs (invoices, contracts) with dates that show the business interaction giving rise to implied consent.

## Practical sequence to build a CASL express-consent packet

1) Freeze exports: immediately export the contact record, consent event logs, and the captured consent text in machine-readable and human-readable formats (CSV/JSON plus PDF). 2) Corroborate timestamps: capture server logs or signed webhook receipts showing the event time and the request origin IP or user agent metadata. 3) Package contextual artifacts: include the page HTML or form markup (with versioning) that contained the consent checkbox, and any associated privacy policy snapshot referenced at the time.

Stop conditions and ownership: stop if critical evidence is missing (no server timestamp, no consent text). Assign an owner—typically Compliance or Privacy Ops—to sign off that the packet is complete and to log any remediation steps (e.g., reconsent flow).

## Handling common evidence gaps and remediation steps

Missing timestamp: if the capture shows a date but no authoritative server log, find correlated logs (webserver, load balancer, CDN) or vendor webhook receipts. If no timestamp can be produced, mark the consent as unverifiable and initiate reconsent before sending promotional messages.

Missing consent text: if you have a form submission but not the exact consent wording, pull a versioned archive of the site (site backups, CMS revision history) or the vendor’s stored copy. If neither exists, you must not rely on that consent for promotional messaging; treat as a remediation case.

## Packaging, retention, and audit trail requirements

Create a single packet per consent instance or per batch (with an index) that includes a manifest describing files, hashes, and provenance. Retain packets for at least the statutory period recommended by legal counsel, and shorter-term operational copies for quick case response. For audits, provide a compact index that maps complainant identifier → packet file names → owner and date produced.

Practical limits: do not include raw PII more than necessary in distributed packets. Use secure transfer and access logs; capture access metadata as part of the packet to show who viewed or exported the records during a review.

## Practical checklist

- [ ] Export contact record with unique identifier (email and internal ID) and freeze a copy (CSV/JSON).
- [ ] Export the original consent capture artifact (HTML snapshot, form submission, or call recording) and a human-readable PDF copy.
- [ ] Capture authoritative timestamp: server event log, webhook receipt, or signed audit log entry; include IP/user-agent when available.
- [ ] Save exact consent text shown to the user and the linked privacy policy snapshot that applied at the time.
- [ ] Document the message class mapped at consent time (transactional, promotional, or specific campaign categories).
- [ ] Produce a manifest listing files, checksums, and provenance metadata; store manifest in packet root.
- [ ] If evidence is missing, mark the contact as unverifiable and route to reconsent workflow before sending promotional messages.
- [ ] Log packet owner, packet creation timestamp, and any remediation actions taken.
- [ ] Secure packet storage and an access log capturing who retrieved the packet during a complaint review.

## Where RepMail fits

Use this packet as a procedural checklist and decision aid when responding to complaints or audits. The packet format helps operators rapidly surface gaps that require technical remediation (missing logs, missing consent text) before sending further outbound campaigns. Do not assume a vendor’s labels equal legal compliance—treat vendor exports as evidence to be corroborated and record any uncertainties as part of the packet.

Continue with [Cold Email Compliance Recordkeeping: What to Log](/repmail/learn/compliance/cold-email-compliance-recordkeeping) for the next step in the workflow.

## Related RepMail guides

- [CASL Implied Consent Expiry Calendar](/repmail/learn/compliance/casl-implied-consent-expiry-calendar)
- [CASL Identification for Agencies and Multiple Affiliates](/repmail/learn/compliance/casl-identification-agencies-affiliates)


## Sources

[1]: https://crtc.gc.ca/eng/com500/faq500.htm "Canadian Radio-television and Telecommunications Commission guidance"
