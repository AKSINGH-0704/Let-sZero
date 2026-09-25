---
product: repmail
academy: outreach
contentType: template
slug: post-offboarding-access-verification-client-systems
title: "Post-offboarding access verification for client systems"
description: "Post-offboarding access verification for client systems — Agency removes named users but misses tokens, links, devices, or shared mailboxes."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","agency","verification","post","offboarding","access"]
assets:
  - type: table
    title: "Post-offboarding diagnostic decision table"
    content:
      headers: ["Observed result","Immediate interpretation","Action","Stop condition / owner"]
      rows:
        - ["Admin console shows active OAuth app grant","App still authorized to act as departed user (high confidence)","Revoke app consent; notify downstream app owner; re-run token test","Stop further token tests for that app; identity admin"]
        - ["OAuth refresh token accepts new access token","Refresh token not revoked; direct access possible","Revoke token, rotate client secrets, and rotate affected API keys","Escalate to security lead"]
        - ["Active device session listed in sessions log","Session persists on a device; potential access vector","Revoke session, block device ID, request remote wipe if available","Device owner / identity admin"]
        - ["Shared mailbox still reachable via IMAP/Exchange","Delegation or credentials still present","Remove delegation, change mailbox access settings, rotate mailbox password if used","Mail system admin"]
        - ["No access found and console shows no active grants/sessions","Evidence supports successful closure (medium confidence)","Document evidence and schedule follow-up check","Offboarding owner"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Agency removes named users but misses tokens, links, devices, or shared mailboxes"
  - "Distinct from credential rotation: post-exit negative testing across systems."
  - "Link to OAuth inventory and transfer acceptance."
commonMistakes:
  - "Skipping this check: Compare departed user's entitlements against identity and OAuth inventories; mark systems to test."
  - "Skipping this check: Query admin consoles for active app grants, refresh tokens, and delegated access records."
  - "Skipping this check: Attempt controlled token-based API access (or verify token list) for any third-party apps the user consented to."
faqs:
  - question: "If I find an active refresh token, do I need to rotate all client secrets immediately?"
    answer: "Not always. First revoke the specific refresh token and the app consent; if the token was tied to a client secret that cannot be individually revoked, or if the app uses long-lived client credentials, include rotating client secrets as part of remediation. State uncertainty: exact revocation capabilities vary by provider and app—check the provider console and vendor docs before deciding scope."
  - question: "How should I verify shared mailbox access after user removal?"
    answer: "Attempt access via the mechanisms used in production (IMAP, Exchange Web Services, or provider impersonation APIs) using a test account or controlled script. Confirm that any delegated permissions registered to the departed user's account are removed in the mailbox's permission pane. If the mailbox uses shared credentials, rotate those credentials and record the change."
  - question: "Can I rely on deleting the user object in the identity provider to close all access?"
    answer: "Deleting the user object is necessary but not sufficient. Many providers retain active tokens, app consents, or device sessions for a period or until explicitly revoked; verify revocation of tokens, app grants, and sessions in the admin console. If provider behavior is unclear or inconsistent, escalate to vendor support—this is a provider-specific area where you should state uncertainty."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

After a user is removed from client systems, verify access closure across tokens, links, devices, and shared mailboxes with targeted negative tests rather than relying on account deletion alone. Use a short set of scripted checks that exercise saved OAuth grants, delegated mailbox access, device sessions, and external links; treat any successful access as a retention-find and escalate for credential rotation and session revocation.

## Scope and decision boundary

Define exactly which post-exit artifacts you will test: OAuth tokens and app grants, API keys or service accounts the user configured, delegated mailbox and calendar access, saved IMAP/POP/SMTP credentials, device sessions (desktop, mobile, browser), and persistent links or shared resources. Exclude broad credential rotations unless a retained access is discovered; this guide is for negative testing to confirm deletions worked, not for a full rotation program.

State stop conditions before testing: if you find an active token or device session, stop further blind tests and escalate to the owner for revocation and a defined credential-rotation plan. These stop conditions limit blast radius and avoid accidental lockouts of other users or systems.

## Practical sequence: quick verification runbook

1) Inventory check: use existing identity and asset inventories to list systems where the departed user had privileges, including shared mailboxes and OAuth client approvals. If you have an OAuth inventory or transfer acceptance record, use it to focus checks (see internal link role).

2) Token and app-grant tests: attempt to use known client authorizations or rebuild minimal OAuth flows with stored refresh tokens to confirm whether grants still issue access. If you do not have tokens, query provider admin consoles for active app grants and consent records.

3) Session and device checks: review active sessions from the admin console and attempt to authenticate from a device emulating a previous client device (use a controlled, isolated test machine). Record session IDs and device identifiers for revocation.

4) Mail and delegated-access attempts: try IMAP/SMTP/Exchange Web Services access to shared mailboxes using the departed user's former credentials or impersonation tokens if allowed by policy. Verify mailbox access and shared calendar delegations specifically; shared mailboxes often retain access until explicitly removed.

## Evidence, limits, and escalation

Treat successful access as high-confidence evidence that offboarding was incomplete. For admin-console findings (active sessions, app grants), the provider console is authoritative. For attempted logins that succeed, preserve logs and timestamps and attach to the escalation ticket.

State your limits: you may not be able to retrieve refresh tokens or private keys that were deleted; a negative test (no access) is stronger evidence only when correlated with admin logs showing token revocation and session termination. For provider-specific behaviors (token lifetimes, session revocation propagation), state uncertainty and escalate to vendor support if behavior is unclear.

## Examples (explicit) of failure modes

Example: OAuth grant retained — a third-party analytics app continues to read mail headers using a refresh token the departed user granted; admin console shows the app still authorized. Action: revoke app consent, rotate any downstream API credentials, and re-run the test.

Example: Device session retained — the user's mobile device still shows an active session in the identity provider; remote wipe hasn’t completed. Action: revoke sessions, block device IDs, require new MFA enrollment, and confirm revocation via admin session logs.

## Practical handoff and recordkeeping

Record exactly which tests you ran, the time window, the identifiers you used (session IDs, token IDs, mailbox GUIDs), and the evidence of success/failure. Update the client's offboarding checklist and the OAuth inventory or transfer acceptance record with findings and remediation actions.

If remediation required credential rotation or provider support, attach your evidence and recommended priority to the ticket owner. Define follow-up verification windows (e.g., 24 hours and 7 days) to confirm remediation completed and no reappearance of sessions or grants.

## Practical checklist

- [ ] Compare departed user's entitlements against identity and OAuth inventories; mark systems to test.
- [ ] Query admin consoles for active app grants, refresh tokens, and delegated access records.
- [ ] Attempt controlled token-based API access (or verify token list) for any third-party apps the user consented to.
- [ ] Review and revoke active sessions and device identifiers; capture session IDs and revocation timestamps.
- [ ] Test access to shared mailboxes and calendars using former credentials or impersonation where allowed.
- [ ] If access is found, escalate immediately and add credential rotation and app-consent revocation to remediation.
- [ ] Log all tests with identifiers and evidence; attach to the client's offboarding record and OAuth inventory.
- [ ] Schedule follow-up verification at 24 hours and 7 days after remediation to confirm no retained access remains.

## Where RepMail fits

Use this article as a short, operational checklist to include in outbound client offboarding workflows. The diagnostic table and checklist can be copied into ticket templates or outbound acceptance emails to certify that negative tests were run; if retained access is found, the documented evidence and stop conditions will help prioritize credential rotation and further outreach.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Agency subcontractor access review for client outbound systems](/repmail/learn/outreach/agency-subcontractor-access-review-outbound)
- [Client offboarding evidence pack for outbound operations](/repmail/learn/outreach/client-offboarding-evidence-pack-outbound)


## Sources

[1]: https://knowledge.workspace.google.com/admin/users/maintain-data-security-after-an-employee-leaves "Google sender or Workspace documentation"
[2]: https://learn.microsoft.com/en-us/microsoft-365/admin/add-users/remove-former-employee?view=o365-worldwide "Microsoft documentation"
