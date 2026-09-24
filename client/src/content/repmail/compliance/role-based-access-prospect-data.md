---
product: repmail
academy: compliance
contentType: guide
slug: role-based-access-prospect-data
title: Role-Based Access to Prospect Contact Data
description: A platform-neutral access-control checklist for prospect data, exports,
  contractors, offboarding, least privilege, and review evidence.
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- compliance
- privacy
- access-control
- cold-email
learningPaths: ["getting-started"]
assets:
- type: checklist
  title: Prospect-data access review
  content:
  - Classify prospect, enrichment, suppression, and evidence data
  - Define roles and minimum fields per role
  - Restrict exports and bulk downloads
  - Review contractor and service-account access
  - Remove access at offboarding
  - Record review date, owner, findings, and remediation
keyTakeaways:
- Grant access by role and business need, not by convenience or team membership.
- Treat exports, enrichment files, suppression data, and contractor accounts as separate
  risks.
- Review access after role changes and record the reviewer, scope, and remediation.
faqs:
- question: Is CRM access alone a privacy control?
  answer: No. Permissions should cover the CRM, sending tool, exports, enrichment,
    support systems, and shared files that contain the same data.
- question: Who should access suppression data?
  answer: Only roles that need to prevent re-contact or administer the control. Keep
    the minimum matching fields and restrict browsing of the broader profile.
- question: How often should access be reviewed?
  answer: Set a cadence appropriate to risk and review on role, campaign, vendor,
    or system changes. Document the decision rather than claiming a universal interval.
nextStep:
  label: Review vendors and subprocessors
  href: /repmail/learn/compliance/outreach-tool-data-processing-agreement
  description: Access boundaries should match the data flow and contract.
collections:
- compliance-operations
---

**Role-based access for prospect data starts with data categories and tasks, not with a single CRM permission.** Classify active contact fields, enrichment attributes, suppression markers, campaign content, exports, provider events, and compliance evidence. Then grant the smallest set of fields and actions needed for each role. The GDPR requires appropriate security and data-protection measures, but the exact configuration is context-dependent.[1]

## Define roles and actions

A campaign operator may need a work queue but not a bulk export. A reviewer may need message content and source evidence but not unrestricted contact browsing. A privacy owner may need suppression and request records. A contractor may need time-limited access to a narrow segment. A service account may need an API action without interactive access. Write the purpose, fields, actions, owner, and expiry for each role.

Treat exports as a new copy. Require approval, recipient verification, an expiry or deletion date, and an audit record. Protect shared files and local downloads under the same policy. Do not claim encryption, access logs, or automatic expiry unless the configured tool and workflow provide them.

## Review changes and exceptions

Review access when someone changes role, leaves the organization, joins a contractor team, adds a vendor, or changes a campaign purpose. Record the reviewer, accounts checked, findings, remediation, and exceptions. Test whether a removed user can still reach an export or integration token.

Suppression data deserves special care. Keep only what is needed to prevent contact, restrict who can browse it, and make sure active users cannot bypass it by importing a new file. Pair this checklist with the [provenance workflow](/repmail/learn/compliance/cold-outreach-data-provenance), [DPA review](/repmail/learn/compliance/outreach-tool-data-processing-agreement), and [privacy-safe export checklist](/repmail/learn/compliance/privacy-safe-prospect-data-export).

## Implementation notes

A review should inspect both named users and machine identities. Revoke stale API keys, shared accounts, downloaded files, and contractor access, not only a CRM seat. Record exceptions with an owner and expiry. A permission model is incomplete if a user cannot view a profile in the CRM but can still export the same fields from an enrichment or campaign integration.

For adjacent controls, use [the broader cold-email compliance checklist](/repmail/learn/cold-email/cold-email-compliance-checklist).

## References

[1]: https://eur-lex.europa.eu/eli/reg/2016/679/oj "EUR-Lex, Regulation (EU) 2016/679 (GDPR)"
[2]: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/ "ICO, Direct marketing and privacy and electronic communications"
