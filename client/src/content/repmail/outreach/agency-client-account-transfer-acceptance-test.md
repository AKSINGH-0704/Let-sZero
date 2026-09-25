---
product: repmail
academy: outreach
contentType: tutorial
slug: agency-client-account-transfer-acceptance-test
title: "Agency-to-client account transfer acceptance test"
description: "Agency-to-client account transfer acceptance test — Ownership is nominally transferred but client cannot log in, recover, or operate."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","agency","client","account","transfer"]
assets:
  - type: table
    title: "Account transfer diagnostic table"
    content:
      headers: ["Tested item","Success condition","Immediate remediation","Stop condition"]
      rows:
        - ["Authentication (login)","Client logs in with provided credentials","Verify username, reset password to client-controlled email/phone","Client cannot log in after password reset"]
        - ["Password reset & MFA","Client completes reset and can authenticate via MFA","Move recovery contact to client-controlled method and re-register MFA","Recovery codes deliver to agency-only contact"]
        - ["Admin role & ability","Client performs a representative admin change (user creation, DNS update)","Assign required admin role or open vendor support for role change","Client lacks admin role and vendor cannot immediately change it"]
        - ["Mailbox send/receive","Client can read and send from critical mailboxes","Reassign mailbox ownership or delegate access; verify send as/send on behalf","Client cannot send/receive and delegation fails"]
        - ["Billing/tenant ownership","Billing/tenant shows client as owner or vendor confirms transfer","Open vendor billing transfer case and document case number","Billing remains with agency and vendor decline immediate transfer"]
        - ["Recovery contact verification","Recovery email/phone controlled by client and verified","Update recovery contact to client-owned and confirm receipt","Recovery contact remains agency-controlled"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Ownership is nominally transferred but client cannot log in, recover, or operate"
  - "Distinct from offboarding checklist: validates transfer before agency access removal."
  - "Link to ownership decision tree and exit pack."
commonMistakes:
  - "Skipping this check: Schedule a live acceptance session with agency and client leads present."
  - "Skipping this check: List all accounts and services in scope and their current recovery contacts."
  - "Skipping this check: Provide client-controlled recovery email/phone for each account before test."
faqs:
  - question: "If the client can log in but not change billing, can I remove agency access?"
    answer: "No. Billing or tenant ownership remaining with the agency can create a support dependency and legal exposure. Open a vendor billing transfer case and keep agency access until transfer is confirmed or an explicit written support arrangement exists. Document the case number and expected resolution window."
  - question: "Should I run the acceptance test remotely or in-person?"
    answer: "Either is acceptable; prefer a live remote session (video and screen-share) so both leads observe the same steps and artifacts in real time. In-person adds physical control over recovery devices but is rarely necessary. The key is documented, mutually observed success or a recorded failure with remediation steps."
  - question: "What if a vendor requires agency cooperation after access removal?"
    answer: "State this as a condition in the transfer agreement and in the exit pack. If a vendor process legally ties the agency to the account post-removal, keep a limited support window and document scope and costs. Where vendor policy is unclear, note the uncertainty and obtain written client acceptance before proceeding."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Run this acceptance test before you remove agency access: verify the client can actually authenticate, recover, and operate their account(s) without agency assistance. If any step fails, pause removal and resolve the gap (credential handoff, recovery methods, admin roles) to prevent an orphaned account and avoid post-exit support crises.

## Scope and decision boundary

This test covers only account-level access and basic operational recovery (login, password reset, MFA recovery, admin roles, and mailbox access) for platforms the agency nominally transfers. It does not validate third-party integrations, API keys, or campaign-specific data flows unless explicitly listed in the transfer agreement. Define in writing which systems (mailboxes, admin consoles, CRM, DNS/hosting control) must be testable before access removal.
Evidence limits: platform-specific recovery behavior varies by vendor; treat vendor documentation as directional and confirm by live test. For example, Microsoft 365 recovery workflows are documented but may require tenant admin steps not apparent without testing [2].
Stop condition: if the client cannot log in or recover an account by completing the documented recovery path within a single supported-session (with agency observing), do not remove agency access.

## Pre-test preparations and owners

Assign two owners: an agency test lead and a client test lead. The agency lead prepares credentials, documented recovery routes, and any temporary help artifacts (screen-recorded handoff, recovery phone numbers). The client lead must have authority to accept ownership and access any corporate recovery channels (company phone lines, alternate admin, or identity owner).
Collect these items before the test: named accounts to transfer, current admin roles, MFA methods registered, recovery emails/phone numbers, and proof of domain/control where applicable. Confirm legal/contractual acceptance has been signed and include the schedule for when agency access will be revoked.

## Acceptance test steps and practical sequence

1) Authentication test: Client lead attempts to log in with the credentials provided. If credentials are unknown, perform a password reset initiated by the client using the documented recovery channel.
2) Recovery test: Trigger password reset and MFA recovery flows (SMS, authenticator app, backup codes). The agency observes and notes failure points (missing recovery email, stale phone number).
3) Admin role verification: Client lead attempts at least one admin-level task required for normal operation (user creation, sending domain-authentication update, or billing access). Verify the client can complete the change end-to-end or can open a vendor support case tied to their identity.
4) Mailbox and data ops: Confirm client can read/send from critical mailboxes, access key folders or shared drives, and that delegated access and forwarding settings are correct.
Record exact times, screenshots, and single-step failure causes. If a platform supports staged transfers (e.g., tenant-level ownership change), follow vendor guidance and repeat tests after the transfer.

## Common failure modes and remediation sequence

Failure mode: client cannot receive recovery codes because the recovery phone number or email is still agency-controlled. Remediation: update recovery contact to client-owned address/number, rerun single-step recovery test.
Failure mode: client can log in but lacks required admin permissions. Remediation: grant the client an explicit admin role, confirm ability to perform a representative admin action, then remove agency admin roles.
Failure mode: legal/account mismatch (billing tied to agency account). Remediation: confirm billing ownership transfer with vendor support and document the vendor case number; do not revoke agency access until vendor confirms transfer or an agreed support window is in place.
For vendor-specific or legal unknowns, escalate to client legal or vendor support and record uncertainty — do not proceed on assumption.

## Evidence to collect and handoff artifacts

Collect minimal but sufficient artifacts: screenshots of successful logins and admin tasks, timestamps, account identifiers (username, tenant ID), and a signed acceptance statement from the client lead noting they can operate the account. Include vendor case numbers if any support was opened during the test.
Package these artifacts into the exit pack and link them to the ownership decision tree so decision-makers can see which transfers passed and which require further action. Keep a copy with the agency until the client confirms no outstanding issues within the agreed support window.

## Practical checklist

- [ ] Schedule a live acceptance session with agency and client leads present.
- [ ] List all accounts and services in scope and their current recovery contacts.
- [ ] Provide client-controlled recovery email/phone for each account before test.
- [ ] Client attempts sign-in using provided credentials; document results.
- [ ] Run password reset and MFA recovery flows; document failures with screenshots.
- [ ] Client performs at least one required admin action and one mailbox/send test.
- [ ] Record vendor support case numbers for any unresolved vendor-side issues.
- [ ] Obtain signed client acceptance and store artifacts in the exit pack.

## Where RepMail fits

Use this guide as a pre-removal checklist and decision aid within outbound workflows: attach the acceptance-test artifacts to the client record, require passed-test status before automations revoke agency-owned credentials, and surface failures as tickets for human follow-up to prevent orphaned accounts.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Agency knowledge transfer from departing account owner](/repmail/learn/outreach/agency-departing-account-owner-knowledge-transfer)
- [Agency permission matrix for client, contractor, and vendor roles](/repmail/learn/outreach/agency-permission-matrix-client-contractor-vendor)


## Sources

[1]: https://www.trychaser.com/checklist-articles/client-offboarding-checklist-for-agencies "Supporting technical or operational reference"
[2]: https://learn.microsoft.com/en-us/microsoft-365/admin/add-users/remove-former-employee?view=o365-worldwide "Microsoft documentation"
