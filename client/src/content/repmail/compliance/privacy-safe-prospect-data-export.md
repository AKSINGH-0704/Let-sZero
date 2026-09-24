---
product: repmail
academy: compliance
contentType: guide
slug: privacy-safe-prospect-data-export
title: Privacy-Safe Export of Prospect and Suppression Data
description: A generic export checklist for limiting, sharing, auditing, expiring,
  and deleting prospect and suppression data without inventing platform security features.
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- compliance
- privacy
- exports
- data-security
learningPaths: ["getting-started"]
assets:
- type: checklist
  title: Prospect-data export controls
  content:
  - Name purpose, recipient, fields, and expiry
  - Remove unnecessary notes and sensitive attributes
  - Verify recipient and transfer channel
  - Protect the export and restrict access
  - Record creation, delivery, access, and deletion
  - Confirm suppression is preserved without exposing the full profile
keyTakeaways:
- Export only the fields and records needed for a named purpose and recipient.
- Verify the recipient, use a controlled transfer, set expiry, and preserve an audit
  trail.
- Keep the minimum suppression signal needed to prevent re-contact and restrict its
  access.
faqs:
- question: Can I email a CSV to a contractor?
  answer: Do not assume ordinary email is appropriate. Verify the recipient, approved
    channel, data minimization, contract, access, expiry, and deletion before sharing.
- question: Should suppression data be included in an export?
  answer: "Include only the minimum needed for the recipient\u2019s control purpose,\
    \ and avoid exposing the broader profile. Document why it is included."
- question: Does an audit log prove the export was safe?
  answer: No. It provides evidence of what happened. Safety also depends on minimization,
    recipient verification, access, transfer, and deletion controls.
nextStep:
  label: Review role-based access
  href: /repmail/learn/compliance/role-based-access-prospect-data
  description: Exports are new copies that need their own owner and expiry.
collections:
- compliance-operations
---

**Treat every prospect-data export as a new copy with a named purpose, recipient, expiry, and owner.** Before creating a CSV, spreadsheet, API extract, or support attachment, decide which fields are necessary and whether the recipient is authorized. The GDPR requires appropriate security and minimization; the exact technical control depends on the workflow.[1]

## Minimize before sharing

Remove unused notes, sensitive attributes, personal details, and historical fields. Keep only what the recipient needs to perform the approved task. If suppression data is necessary to prevent re-contact, include the minimum matching signal and do not expose a full profile by default. Record whether the export includes objections or other restricted information.

Verify the recipient and transfer channel independently. Use the organization’s approved secure method, not a link copied into an unrestricted chat. Set an expiry or deletion date, restrict access, and record creation, delivery, access, and deletion. Do not claim a product encrypts, expires, or logs exports unless that behavior is verified in the current configuration.

## Close the loop

Ask the recipient to confirm receipt and deletion when the purpose ends. Reconcile the export with vendor, agency, and CRM copies. If a wrong recipient, public link, or stale file is discovered, stop access and use the incident runbook rather than quietly replacing the file.

Link this workflow to the [role-based access checklist](/repmail/learn/compliance/role-based-access-prospect-data), [recordkeeping guide](/repmail/learn/compliance/cold-email-compliance-recordkeeping), and [outbound suppression rules](/repmail/learn/lead-generation/outbound-suppression-rules). RepMail’s current export and access behavior must be checked separately before making a product-specific promise.

## Implementation notes

Before delivery, compare the export columns with the stated task and remove everything else. After delivery, reconcile the recipient confirmation with the expiry or deletion date. If a file is copied into a second system, record that new destination and owner. When an export includes suppression information, explain why the minimum marker is needed and prevent it from becoming a browsable contact profile.

For adjacent controls, use [the broader cold-email compliance checklist](/repmail/learn/cold-email/cold-email-compliance-checklist).

## Export approval procedure

The export owner creates a request before generating a file or API extract. Record requester, purpose, legal or policy context as supplied by the privacy owner, recipient, fields, data subjects, source systems, suppression marker need, format, transfer channel, access list, expiry or deletion date, owner, verification method, and incident contact. The business owner confirms necessity; the privacy owner reviews scope; security approves the channel; and the recipient confirms use and deletion. Do not infer encryption, access logging, expiry, or deletion from a product label unless the current configuration verifies it.

Run the procedure: (1) compare requested columns with the task and remove unnecessary notes, history, sensitive attributes, and identifiers; (2) decide whether a minimum suppression token is needed and prevent it from becoming a browsable profile; (3) verify the recipient through an independent channel; (4) use an approved transfer path with restricted access and expiry; (5) record delivery and receipt; (6) obtain deletion or return confirmation; and (7) reconcile copies in CRM, vendor, agency, and local storage. The [role-based access checklist](/repmail/learn/compliance/role-based-access-prospect-data) and [recordkeeping guide](/repmail/learn/compliance/cold-email-compliance-recordkeeping) provide adjacent controls.

| Gate | PASS evidence | HOLD or STOP condition |
| --- | --- | --- |
| Necessity | Field-level justification | Recipient asks for a broad convenience export |
| Recipient | Independently verified identity and authorization | Address or access group is uncertain |
| Transfer | Approved channel, restricted access, expiry | Public link, ordinary email, or no expiry path |
| Closeout | Receipt and deletion/return confirmation | Copy destination is unknown |

Stop delivery for a wrong recipient, public link, excessive fields, disputed authority, or inability to preserve suppression safely. Disable access and revoke the link or credential, preserve access and delivery evidence, notify the incident owner, and use the last approved export only if its scope remains valid. Do not quietly replace a file or claim deletion from backups. Resume only with a new minimised export approval and corrected recipient. Each downstream copy becomes a new record with its own owner and expiry; this workflow does not guarantee product security or legal compliance.

## References

[1]: https://eur-lex.europa.eu/eli/reg/2016/679/oj "EUR-Lex, Regulation (EU) 2016/679 (GDPR)"
[2]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/ "ICO, Direct marketing and privacy and electronic communications"
