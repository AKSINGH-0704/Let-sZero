---
product: repmail
academy: outreach
contentType: comparison
slug: agency-permission-matrix-client-contractor-vendor
title: "Agency permission matrix for client, contractor, and vendor roles"
description: "Agency permission matrix for client, contractor, and vendor roles — Agency cannot translate job duties into system roles across clients."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","agency","permission","matrix","client"]
assets:
  - type: table
    title: "Compact role decision table"
    content:
      headers: ["Role","Can change billing/SSO/DNS","Can edit campaigns/assets","Can view logs/reports","Temporary/expiring access recommended"]
      rows:
        - ["Owner / Account Admin","Yes","Yes","Yes","No (long-term)"]
        - ["Operational Specialist (campaigns, lists)","No","Yes","Limited (read)","Yes"]
        - ["Vendor Integration (API/service account)","No (use integration owner)","Yes (integration-bound)","Limited (integration logs)","Yes (rotate keys)"]
        - ["Read-only Analyst","No","No","Yes","Yes"]
        - ["Contractor (time-bound)","No","Depends on task","Limited","Yes (expiry required)"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Agency cannot translate job duties into system roles across clients"
  - "Role design matrix is distinct from existing audit-log article."
  - "Hub link to ownership, isolation, and offboarding."
commonMistakes:
  - "Skipping this check: List concrete duties for the person as actions (do not use job titles alone)."
  - "Skipping this check: Map each action to a scope: Owner / Operational / Read-only."
  - "Skipping this check: Use temporary or expiring access for contractors; set explicit expiration dates."
faqs:
  - question: "How do I decide if someone needs owner-level permissions?"
    answer: "Owner-level permissions are for changing account-wide configuration: billing, SSO, DNS, user management, and credential storage. If the person’s duties include any of those persistent configuration tasks, treat them as owner-level candidates; otherwise prefer operational or read-only roles. When in doubt, split the task so an owner executes credential-sensitive steps while an operator prepares the configuration."
  - question: "Can contractors use shared agency admin accounts to avoid mapping roles?"
    answer: "No. Shared admin accounts bypass auditability and make offboarding unsafe. Use individual accounts with explicit roles and expirations. If a contractor needs temporary admin-level action, use a documented temporary grant with an expiry or a screen-share session where an owner completes the final sensitive step."
  - question: "What should I do if a vendor requires broad scopes that conflict with least privilege?"
    answer: "Treat that as a risk exception. First, ask the vendor for narrower scopes or managed-service options. If unavailable, require a service account that is scoped to the vendor’s integration only, document the business justification, set a rotation schedule for keys/credentials, and require quarterly reauthorization. Note provider specifics may change; confirm exact API scopes in vendor documentation before granting access."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Assign system roles by mapping concrete job duties to least-privilege permissions across client accounts, contractors, and vendors. Use a matrix that separates ownership (who can change account-wide settings), operational roles (who runs campaigns or integrations), and read-only roles (who inspects data). Implement a repeatable decision flow so each new client or contractor maps to the same role set and offboarding checklist.

## Decision boundary: ownership vs operational vs vendor access

Define three distinct decision outcomes before assigning any system role: Owner-level (can change billing, integrations, account-wide security), Operational (campaign, list, template, or data manipulation), and Vendor/Read-only (reports, logs, or limited integrations). The boundary is whether the person must perform persistent, account-wide configuration changes; if yes, they need an owner-level or delegated admin role. Otherwise prefer the minimal operational permission set.
Evidence limits: provider role names and scopes vary; treat this as a mapping exercise, not a direct role name substitution. For example, Google Analytics role semantics are documented by the provider and should be consulted for exact permission sets [1].
Practical sequence: 1) List concrete duties for the person. 2) Ask whether duties require account configuration or only content/operational tasks. 3) Map to Owner/Operational/VendorRead-only and select the least-privilege role that covers duties.

## Translate duties into system privileges (practical mapping steps)

Start from duties expressed as actions (e.g., create audiences, change DNS, connect payment method) rather than job titles. For each action, identify required permissions: create/delete content, modify integrations, manage users, access logs, or only view data. Document these mappings in a central spreadsheet for reuse across clients.
Decision boundary: when an action spans both operational and owner scopes (for example, connecting a third-party integration requires both operational setup and account-level client credentials), split the task: the operator prepares configuration and the owner executes the final credential connection. This minimizes the number of people with persistent owner-level access.
Sequence: 1) Convert duty → action list. 2) Tag each action with required scope (owner/operational/read). 3) Combine tags per person and resolve to the least-privilege role that satisfies all tags.

## Contractor and vendor distinctions and controls

Treat contractors as time-bound operational personnel and vendors as third-party services; both should default to short-lived credentials and explicit scope. Contractors often need elevated operational permissions but should be given temporary access (project-limited) and a documented expiration. Vendors that run managed services should receive only the API-level or integration-specific roles needed to operate, not broad user management privileges.
Evidence limits: vendor product interfaces and API scopes differ. The agency should validate exact scopes in vendor docs before granting access and assume provider APIs may change over time. Where providers offer dedicated agency or partner roles, prefer those if they map to least privilege.
Sequence: 1) Classify as contractor or vendor. 2) Define minimum functional scope. 3) Issue access with expiration and conditional approvals. 4) Record in the client’s access ledger for offboarding.

## Role design matrix (how to build and apply)

Design a compact matrix that lists common duties horizontally and role types vertically, marking which duty each role can perform. Keep the matrix consistent across clients and store it in the agency’s onboarding template. Update when a provider adds or removes permissions.
Decision boundary: include only duties that are frequent or sensitive enough to require governance (billing, DNS, SSO changes, API key management, audience exports, sending domain changes, user management). Exclude one-off tasks that can be performed via a temporary owner-approved screen-share or session-based access.
Sequence: 1) Create a canonical duties list. 2) Define the standard role rows. 3) Fill whether each role performs each duty. 4) Validate with a security reviewer and use for account setup and audits.

## Operationalizing least privilege and offboarding

Make least-privilege repeatable by baking role assignment and expiration into onboarding templates and automating reminders for access review. Enforce multi-person approval for any owner-level grant and require explicit documented business need with an end date for elevated access. Use the same process for every client to reduce translation errors when moving personnel between accounts.
Decision boundary: when short-lived access cannot accomplish the task (for example, long-running vendor integrations), require an integration owner that is a service account with documented security controls and rotation schedule rather than a human user. Stop conditions: revoke elevated access immediately at contract termination, role change, or when the documented business need expires.

## Practical checklist

- [ ] List concrete duties for the person as actions (do not use job titles alone).
- [ ] Map each action to a scope: Owner / Operational / Read-only.
- [ ] Use temporary or expiring access for contractors; set explicit expiration dates.
- [ ] Require dual-approval for owner-level grants and document the business reason.
- [ ] Create or update the client-specific role matrix in the onboarding template.
- [ ] Prefer service accounts with narrow scopes for long-running vendor integrations; document rotation policies.
- [ ] Record every access grant in the client access ledger with owner, purpose, and expiry.
- [ ] Schedule automated quarterly access reviews per client and enforce revocation where no business need is documented.

## Where RepMail fits

Use this matrix as a decision aid and checklist in outbound workflows and client onboarding sequences: include the duties-to-permissions mapping in pre-outreach audits, attach the compact role decision table to client setup tickets, and use the checklist to verify access assignments before sharing campaign credentials. This helps standardize least-privilege assignment across accounts without implying any RepMail product capability or integration.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Agency report QA checklist before client delivery](/repmail/learn/outreach/agency-outbound-report-qa-checklist)
- [Agency-to-client account transfer acceptance test](/repmail/learn/outreach/agency-client-account-transfer-acceptance-test)


## Sources

[1]: https://support.google.com/analytics/answer/9305587?hl=en "Google sender or Workspace documentation"
[2]: https://automattic.com/for-agencies/blog/agency-client-onboarding/ "Supporting technical or operational reference"
