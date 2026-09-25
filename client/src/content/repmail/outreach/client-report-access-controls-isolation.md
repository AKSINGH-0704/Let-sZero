---
product: repmail
academy: outreach
contentType: template
slug: client-report-access-controls-isolation
title: "Client report access controls: prevent one client seeing another"
description: "Client report access controls: prevent one client seeing another — Shared dashboards or folders leak cross-client data."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","agency","client","report","access"]
assets:
  - type: table
    title: "Client access decision table"
    content:
      headers: ["Check","What to do","Who verifies","Stop condition"]
      rows:
        - ["Dashboard location","Move to client-scoped workspace or clone into isolated view","Workspace owner / IT","Dashboard inaccessible to other-client accounts"]
        - ["Permission level","Scale back to Viewer or custom read-only role","Access owner","No edit/save options for non-client users"]
        - ["Inherited permissions","Remove inheritance from parent folder or org-level group","Access owner + Auditor","No inherited group appears on ACL"]
        - ["Third-party access","Switch to temporary credentials or service account with scoped access","Vendor manager","Vendor account cannot see other client assets"]
        - ["Change requests","Require ticket with justification and expiry","Reviewer (security/ops)","No out-of-ticket grants exist"]
        - ["Negative test","Attempt access using a different-client test user","QA tester","Attempt fails with access denied"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Shared dashboards or folders leak cross-client data"
  - "Distinct from white-label reporting boundaries: operational permissions and negative testing."
  - "Link to client isolation and report QA."
commonMistakes:
  - "Skipping this check: Map all dashboards/folders and assign a single owner per client asset."
  - "Skipping this check: Create dedicated client-scoped workspaces/properties where supported."
  - "Skipping this check: Grant the least-privilege role needed; avoid organization-level viewer/editor roles for client access."
faqs:
  - question: "Can I rely on folder-level visibility settings to guarantee isolation?"
    answer: "No. Folder-level visibility can be overridden by inherited organization or group permissions and by roles granted at higher scopes. Treat folder visibility as a convenience, not a guarantee—validate with negative tests and prefer workspace/property-level isolation where available [1][2]."
  - question: "How often should I run permission audits and negative tests?"
    answer: "Monthly is a practical minimum, with additional audits triggered by staff changes, vendor onboarding/offboarding, or changes to folder/group structures. Increase frequency if you handle particularly sensitive client data. The audit’s goal is evidence of no cross-client access in at least two consecutive checks."
  - question: "If a cross-client leak is found, do I always have to notify clients?"
    answer: "Notification obligations depend on contract terms and applicable law. From an operational perspective, treat any confirmed exposure as an incident: capture logs, remediate, and consult legal to determine notification requirements. Don’t assume notification is unnecessary—document the decision."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Grant access on a strict need-to-view basis and verify isolation by negative testing. Limit shared dashboards/folders to client-scoped workspaces or service accounts, audit permissions regularly, and run a two-step QA that attempts cross-client access before going live.

## Define the access boundary and owner

Document for each client which datasets and dashboards are in-scope for sharing, and appoint a single owner responsible for permissions (role: e.g., account admin or data steward). The owner must maintain a one-line authority: “I may grant access X to Y for client Z.” This makes revocation and incident response actionable.
Decision boundary: treat any shared workspace that contains combined datasets as out-of-scope for multi-client sharing. Evidence limits: provider RBAC varies; don’t assume a UI label equals isolation—confirm via tests.

## Prefer isolated workspaces or views, not folder-level sharing

Where possible, create dedicated client workspaces, properties, or service accounts rather than sharing a top-level folder that contains multiple clients. Many platforms (e.g., Google Analytics setups) support property- or view-level permissions which reduce accidental exposure [1].
Practical sequence: create the isolated workspace, migrate client assets, grant minimal roles, and delete inherited permissions on the parent folder. Stop condition: when a client workspace can be accessed only by users listed on that client’s ACL.

## Use role minimization and short-lived credentials

Assign the narrowest role required (viewer vs editor) and prefer temporary or review-triggered credentials for external contractors. Where platform features allow, use seats or bindings that are scoped to a workspace rather than global organization roles [2].
Decision boundary: if a role grants visibility to organization-level resources, do not use it for client reporting. Evidence limits: some providers only approximate seat isolation; validate with negative tests.

## Negative testing and scheduled permission audits

Perform negative tests: with a test user removed from client A, attempt to access all client A dashboards from an account assigned to client B. Log failures and unexpected successes. Use these tests whenever you change a group, role, or folder hierarchy.
Practical sequence: (1) Clone a dashboard to a dedicated test workspace. (2) Use a B-user account to attempt access. (3) Record results and remediate. Schedule audits monthly or when staff changes occur. Stop condition: no cross-client access in two consecutive audits.

## Operational controls and change governance

Require change tickets for permission changes and attach a short justification and expiration date. Make permission grants visible in a single spreadsheet or ticketing field owned by the access owner so reviewers can spot cross-client grants quickly.
Practical sequence: route permission requests through the ticketing system, perform a reviewer check for cross-client impact, and log the approval. Evidence limits: governance reduces human error but does not replace automated checks.

## Incident response and communication checklist

If cross-client exposure is discovered, immediately remove the offending permission and capture audit logs (who, what, when). Notify legal and affected clients according to contractual obligations and your breach policy; if obligations are unclear, treat the event as high-priority for internal review.
Practical sequence: isolate the asset, capture logs, run a negative test to confirm isolation, and complete a post-mortem with actions to prevent recurrence. Stop condition: verified remediations implemented and documented.

## Practical checklist

- [ ] Map all dashboards/folders and assign a single owner per client asset.
- [ ] Create dedicated client-scoped workspaces/properties where supported.
- [ ] Grant the least-privilege role needed; avoid organization-level viewer/editor roles for client access.
- [ ] Use temporary or review-period-bound credentials for external contractors and agencies.
- [ ] Run negative access tests before publishing any shared client report.
- [ ] Schedule a monthly permission audit and log the results.
- [ ] Require ticketed approval with expiration for any permission change.
- [ ] Document and store an access ledger (who has access, why, expiry).
- [ ] If exposure occurs, remove access, capture audit logs, and perform a post-mortem.

## Where RepMail fits

Use this guide as a checklist during outbound reporting workflows: before sending a client report link, run the negative access test and confirm the access ledger; include the verification step in your outbound ticket/workflow to reduce confidentiality risk. This article is a decision aid and checklist—adapt it to your ticketing and reporting processes rather than expecting it to map exactly to any vendor UI.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Agency report QA checklist before client delivery](/repmail/learn/outreach/agency-outbound-report-qa-checklist)
- [Client Report Source-Trace Worksheet](/repmail/learn/outreach/client-report-source-trace-worksheet)


## Sources

[1]: https://support.google.com/analytics/answer/9305587?hl=en "Google sender or Workspace documentation"
[2]: https://trygtm.com/blog/multi-seat-role-permissions-client-isolated-workspaces "Supporting technical or operational reference"
