---
product: repmail
academy: outreach
contentType: tutorial
slug: client-isolation-test-data-boundaries
title: "Client isolation test: prove data cannot cross workspaces"
description: "Client isolation test: prove data cannot cross workspaces — Agency needs evidence that users, exports, and integrations cannot see another client."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","agency","client","isolation","prove"]
assets:
  - type: table
    title: "Client isolation decision table"
    content:
      headers: ["Probe","Action","Expected result","Stop or escalate"]
      rows:
        - ["User search across workspaces","Search by exact email/ID from other workspace","Zero results or access denied; audit log entry","Escalate if result returned or non-empty preview"]
        - ["Contact record lookup","Query for unique test contact from other workspace","No matching contact returned","Escalate if any PII visible"]
        - ["Export download access","Attempt to fetch export file/URL created in other workspace","401/403 or different resource ID","Immediate containment and revoke tokens"]
        - ["API token cross-use","Use Workspace B token on Workspace A API endpoints","403/401 or token-scoped error","Revoke tokens; forensic preservation"]
        - ["Integration webhook or storage access","Attempt to read shared storage/object created by other workspace","Access denied or separate object namespace","Audit provider config; escalate if accessible"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Agency needs evidence that users, exports, and integrations cannot see another client"
  - "New verification workflow; existing cross-client suppression page covers suppression architecture, not workspace boundary testing."
  - "Link to permissions audit and reporting boundaries."
commonMistakes:
  - "Skipping this check: Authorize the test: documented sign-off from business owner and technical owner"
  - "Skipping this check: Capture baseline: export role lists, active integrations, and API keys for both workspaces"
  - "Skipping this check: Create uniquely identifiable test artifacts (emails, GUIDs, filenames) in Workspace A"
faqs:
  - question: "Can this test prove absolute absence of cross-client leaks?"
    answer: "No. The test demonstrates absence of detectable leaks for the exercised actions and time window. It cannot prove every possible leak path (unexercised API routes, internal admin tools, or vendor bugs). Treat results as evidence for the specific probes performed and expand probes as needed."
  - question: "What logs should I collect to support an escalation?"
    answer: "Collect API request/response logs, admin audit logs showing permission settings, export creation and access logs, integration/webhook delivery logs, and timestamps. Preserve exported files with a cryptographic hash and store everything in read-only storage for the incident response team."
  - question: "Do provider documentation pages suffice as proof of isolation?"
    answer: "Provider docs are directional evidence but not definitive runtime proof. Use documentation to design tests, then run live probes and collect operational evidence. Where documentation is ambiguous, flag the uncertainty and escalate to vendor support."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Run an explicit, scripted client-isolation test that proves users, exports, and integrations in one workspace cannot access another workspace’s data. Treat the test as a security audit: define actors, expected boundaries, concrete probes, and stop conditions before you run any cross-client queries or export attempts.

## Decision boundary and scope

Define the decision boundary as the workspace-level visibility of user accounts, contact lists, exports, and API-scoped tokens. Explicitly list which resources you consider in-scope (user accounts and roles, contact records, export files, integration tokens, webhooks, and admin audit logs) and out-of-scope (network infrastructure, shared third-party systems unless the client uses them). The test should exercise reads and writes where allowed by roles; never attempt privilege escalation beyond your authorized test account.

Document the owners and authorization for each probe. Assign a technical owner (engineer) and a business owner (account lead) who sign off on the test plan. The business owner must be able to declare a stop condition and accept the test evidence if anything shows cross-workspace visibility.

## Concrete probes and expected evidence

Perform four classes of probes: user visibility, data visibility, export/export artifact access, and integration/API token access. For user visibility, create or identify a test user in Workspace A and search for that user (by email or user ID) from Workspace B with a role that would not ordinarily have cross-client view. Expected evidence: no results returned, or an access-denied audit entry.

For data visibility, attempt to locate a distinct contact record (unique email or GUID) created in Workspace A from Workspace B. Expected evidence: the query returns zero matches and the action is logged. For exports and integrations, attempt to download an export file or query an API endpoint using Workspace B credentials for an export created in Workspace A. Expected evidence: access denied, 401/403 responses, or a different resource identifier indicating isolation.

## Practical test sequence

1) Baseline: Record current roles, permissions, and active integrations for both workspaces. Capture screenshots of admin permissions pages and a list of active API keys or connected integrations. 2) Isolation probes: Using non-admin test accounts in Workspace B, run the user-visibility and data-visibility probes described above. Log exact request payloads, timestamps, and responses. 3) Export probes: From Workspace A produce an export with a unique filename; attempt to access that export URL or identifier from Workspace B and with any integration tokens tied to Workspace B.

Always timestamp and hash any exported files you generate for evidence. If you must use shared third-party storage (S3, GCS), include bucket/object ACL checks in the baseline and mark those checks as directional if the provider’s documentation is ambiguous.

## Evidence limits and uncertainty

This test produces operational evidence (responses, logs, screenshots) but cannot prove absolute elimination of every theoretical cross-client leak—only absence of detectable leaks for the exercised actions. Vendor documentation and architecture pages may indicate isolation intent but are not definitive proofs of correct runtime behavior. For example, multi-tenant workspace descriptions are directional and require runtime verification [2].

If the provider uses external shared systems (analytics, storage), your test must include those systems. For claims about guarantee, legal liability, or regulatory compliance, escalate to legal and vendor support. State any vendor-specific uncertainty explicitly in your report.

## Failure modes and immediate response

Treat any successful cross-workspace read or write as a material security incident. Immediate actions: suspend the implicated API keys and user sessions, revoke or rotate integration tokens, and preserve forensic artifacts (logs, DB queries, exported files) in read-only storage. Notify the business owner and follow the incident response runbook.

Next steps after containment: reproduce the leak in a controlled environment to determine root cause, coordinate with vendor support, and prepare a disclosure and remediation timeline. Document who did what, when, and the exact commands or API calls that demonstrated the leak.

## Practical checklist

- [ ] Authorize the test: documented sign-off from business owner and technical owner
- [ ] Capture baseline: export role lists, active integrations, and API keys for both workspaces
- [ ] Create uniquely identifiable test artifacts (emails, GUIDs, filenames) in Workspace A
- [ ] From Workspace B, run user search and contact search probes using non-admin accounts; log responses
- [ ] Attempt export access and API calls from Workspace B to Workspace A artifacts; record HTTP status and response bodies
- [ ] Preserve all evidence (screenshots, request logs, export files) with timestamps and hashes
- [ ] If any access succeeds, suspend implicated sessions/tokens and preserve forensic copies
- [ ] Open vendor support case and attach evidence; include permission audit and reporting-boundary references
- [ ] Produce a remediation plan and schedule a follow-up test after fixes

## Where RepMail fits

Use this guide as a checklist and decision aid when running client-isolation checks during pre-sales, onboarding, or periodic audits. Capture the artifacts and decision table here to attach to outreach reports or security attestations; do not assume this guide implies RepMail provides a built-in isolation test feature.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Agency permission matrix for client, contractor, and vendor roles](/repmail/learn/outreach/agency-permission-matrix-client-contractor-vendor)
- [Agency report QA checklist before client delivery](/repmail/learn/outreach/agency-outbound-report-qa-checklist)


## Sources

[1]: https://support.google.com/analytics/answer/9305587?hl=en "Google sender or Workspace documentation"
[2]: https://trygtm.com/blog/multi-seat-role-permissions-client-isolated-workspaces "Supporting technical or operational reference"
