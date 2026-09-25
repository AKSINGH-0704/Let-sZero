---
product: repmail
academy: outreach
contentType: template
slug: agency-subcontractor-access-review-outbound
title: "Agency subcontractor access review for client outbound systems"
description: "Agency subcontractor access review for client outbound systems — Contractors retain access after a project or role changes."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","agency","subcontractor","access","review"]
assets:
  - type: table
    title: "Access retention decision table (external contractors)"
    content:
      headers: ["Condition","Action","Owner","Stop condition"]
      rows:
        - ["No active SOW or ticket in last 90 days","Issue 7-day remediation request; remove if no attestation","Procurement or Security Ops","Account removed or attestation received"]
        - ["Active SOW or ongoing contracted work","Require dated attestation listing minimal scope and expiry","Engagement Owner (client)","Signed attestation with expiry recorded"]
        - ["Agency-owned credentials (shared account/API key)","Replace with client-owned account or rotate keys; revoke old credentials","IT Admin / Platform Owner","Old credentials revoked; new client-controlled credentials in place"]
        - ["Mailbox delegation present","Remove delegate or set time-limited delegation with expiry","Mail Admin","Delegate access removed or expiry set"]
        - ["Emergency/short-term retained access","Document business need, set strict expiry <= 30 days, review weekly","Client Owner & Security","Expiry reached or renewed with new attestation"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Contractors retain access after a project or role changes"
  - "Distinct from team permissions audit: focuses on external workers, dates, and attestations."
  - "Link to permissions matrix and offboarding."
commonMistakes:
  - "Skipping this check: Export access lists for all outbound systems and map accounts to employer (internal vs external)."
  - "Skipping this check: Cross-check each external account against SOWs, tickets, and procurement records for current engagement."
  - "Skipping this check: Issue a 7-day remediation request for accounts with no recent documented activity, requiring attestation or removal."
faqs:
  - question: "How often should I run this subcontractor access review?"
    answer: "Run the external-access review at least quarterly; increase frequency if you cycle many short-term contractors. For high-risk clients or high-volume outsourcing, monthly cadence is reasonable."
  - question: "Is a verbal approval from the account manager sufficient to retain access?"
    answer: "No. Verbal approvals are not acceptable evidence. Require a dated, written attestation (email from an authorized owner or signed form) that specifies scope and expiry. Keep that record attached to the contractor's procurement file."
  - question: "If I remove an agency-owned account, will it break outbound workflows?"
    answer: "Possibly. Before removal, map dependencies and notify the agency and client owner. If the account is critical, replace agency-owned credentials with client-controlled credentials and schedule a cutover window. This procedural advice is vendor-agnostic; check provider-specific removal methods when performing changes [1][2]."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Immediately identify and remove outbound-system access for contractors who no longer need it, and require a dated attestation for any retained access. Focus reviews on external identities, access expiration dates, credential types, and evidence of business need; treat these differently from internal team-permissions audits.

## Scope and decision boundary

Limit this review to external workers: contractors, agencies, vendors, and subcontractors who interact with client outbound systems (mail platforms, CRM lists, tracking domains, and analytics). Exclude permanent employees and standard internal role changes; those belong to a team permissions audit. Define systems in scope explicitly (list platform names, domains, and admin consoles) and classify access types (console admin, API keys, SMTP credentials, mailbox delegation, and CRM list-level access). Decision boundary: if the account is externally owned or managed by a third party, include it.

## Evidence and what you can (and can’t) rely on

Accept these evidence types as sufficient for attestation: account owner record in an identity provider, dated change orders or SOWs showing active engagement, ticket history proving recent work, and signed retention emails from an authorized client contact. Do not rely solely on memory, informal Slack approvals, or undocumented manager notes. For vendor-hosted accounts (agency-owned platform logins), require explicit contract language or a dated client attestation authorizing ongoing access. When referencing vendor documentation for removal processes, treat provider instructions as directional—verify exact steps in your tenant because procedures differ by provider [1][2].

## Practical sequence for an access-review run

1) Export a list of accounts with access to each outbound system (admin consoles, API key lists, mailbox delegates). 2) Cross-reference with the procurement/SOW roster to mark which accounts were provisioned for active projects. 3) For any account without a current SOW or work ticket in the last 90 days, issue a remediation request requiring either a documented business need or account removal within a 7-day window. 4) Log attestation responses, date-stamp them, and apply the removal if no response. Stop conditions: removal completed, or a signed attestation with an explicit expiry date recorded.

## Handling credential types and technical remediations

Treat credential types differently: shared passwords or agency-owned accounts require rotation and replacement with unique, client-owned identities where possible; API keys and SMTP credentials must be revoked and reissued under client control. For mailbox delegation, remove delegate access and, where the vendor supports it, convert to time-limited delegation with an explicit expiry. For platform-access tokens stored in secret managers, rotate secrets and audit access logs to ensure there are no active sessions. Document each remediation step and capture the timestamp and actor who performed the change.

## Attestation policy and retention

Require a signed or logged attestation from an authorized client owner for any access retained beyond the work end-date. Attestations must include: reason for retention, minimum viable access scope, named owner, and an explicit expiry date. Retain attestations and removal evidence for at least the same retention period your organization keeps security audit logs. If legal or regulatory considerations apply, defer to legal counsel; do not treat this guide as legal advice.

## Practical checklist

- [ ] Export access lists for all outbound systems and map accounts to employer (internal vs external).
- [ ] Cross-check each external account against SOWs, tickets, and procurement records for current engagement.
- [ ] Issue a 7-day remediation request for accounts with no recent documented activity, requiring attestation or removal.
- [ ] Revoke or rotate shared credentials, API keys, and SMTP credentials not under client ownership.
- [ ] Remove mailbox delegation or convert to time-limited delegation with explicit expiry.
- [ ] Log every attestation, removal, rotation, and the performing actor with timestamps.
- [ ] If access is retained, store a signed attestation that includes an expiry date and named owner.
- [ ] Schedule the next external-access review at a fixed cadence (quarterly recommended) and link to offboarding procedures.
- [ ] Record proof of removal (screenshots, audit logs) and attach to the contractor's procurement record.

## Where RepMail fits

Use this article as a checklist and decision aid when preparing outbound-system audits or communicating remediation requests to agencies. The steps and table can be pasted into RepMail outreach workflows to structure requests, track attestations, and attach proof of removal, but do not assume RepMail automates provider-specific credential revocation or tenant-level changes.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Client report access controls: prevent one client seeing another](/repmail/learn/outreach/client-report-access-controls-isolation)
- [Post-offboarding access verification for client systems](/repmail/learn/outreach/post-offboarding-access-verification-client-systems)


## Sources

[1]: https://knowledge.workspace.google.com/admin/users/maintain-data-security-after-an-employee-leaves "Google sender or Workspace documentation"
[2]: https://learn.microsoft.com/en-us/microsoft-365/admin/add-users/remove-former-employee?view=o365-worldwide "Microsoft documentation"
