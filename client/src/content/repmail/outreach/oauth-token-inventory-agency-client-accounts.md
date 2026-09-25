---
product: repmail
academy: outreach
contentType: template
slug: oauth-token-inventory-agency-client-accounts
title: "OAuth token and integration inventory for agency client accounts"
description: "OAuth token and integration inventory for agency client accounts — Deleting a user does not necessarily remove app tokens or integrations."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","agency","oauth","token","integration"]
assets:
  - type: table
    title: "Decision / Diagnostic: action per integration"
    content:
      headers: ["Symptom observed","Quick diagnostic","Action","Stop condition / verification"]
      rows:
        - ["App still sends email after user deletion","Check app grants and service accounts for that app; inspect send logs for API keys.","Revoke app OAuth token or API key; if needed, rotate to a service account.","Send test message fails with unauthorized; app absent from grants list."]
        - ["App appears in provider grants but owner user removed","Inspect grant owner (app registration vs user consent) and admin consents.","Reassign app registration to tenant admin or revoke and re-register at tenant level.","App registration shows new owner or is removed from consent list."]
        - ["Revocation performed but action still succeeds","Check token caching, refresh token lifetime, and vendor cache policies.","Document times, wait recommended grace interval, and escalate to vendor support if still active.","Retries fail and audit logs show token invalidation."]
        - ["SaaS app uses user-owned API keys for automation","Find automation scripts and CI/CD variables referencing the key.","Rotate key and update scripts; replace human-owned key with a machine account.","Automation succeeds using new key; old key shows no activity."]
        - ["Webhook calls continue from unknown source","Inspect request headers/IPs and compare to known app signatures; rotate webhook secret.","Rotate webhook secret and update trusted senders; revoke old webhook URL.","Webhook requests are rejected with invalid signature."]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Deleting a user does not necessarily remove app tokens or integrations"
  - "New token-centric workflow; existing credential rotation is mailbox-focused."
  - "Link to permissions audit, isolation tests, and offboarding."
commonMistakes:
  - "Skipping this check: Export a list of users and service accounts from your identity provider and SSO."
  - "Skipping this check: Query Google Workspace and Microsoft 365 admin consoles for OAuth app grants and service principals; export or screenshot grant lists [1][2]."
  - "Skipping this check: For each departed user, list all third-party apps they authorized or owned and tag as 'revoke', 'rotate', or 'reassign'."
faqs:
  - question: "Does deleting a Google Workspace or Microsoft 365 user revoke their OAuth app grants automatically?"
    answer: "Not reliably. Deleting a user account does not necessarily revoke OAuth consented apps or tenant-level service principals. In Google Workspace and Microsoft 365, admins should inspect app grants and service principals directly and revoke or reassign as needed; provider consoles and admin guides should be used for the authoritative steps [1][2]."
  - question: "How do I prove an integration was fully disabled after offboarding?"
    answer: "Collect at least two artifacts: an administrative proof of revocation (screenshot or audit log entry) and a verification test showing the integration no longer performs the privileged action. Also record timestamps and any vendor ticket IDs if you escalated. Keep exports because provider audit windows vary."
  - question: "When is rotation preferable to revocation?"
    answer: "Rotate when the integration must continue operating for business reasons. The best practice is to reassign the integration to a managed service account or tenant-level app registration, rotate credentials there, and remove ties to former personnel. If reattachment is impossible, use temporary access with expiration and monitoring."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Audit and remove OAuth tokens and third-party integrations separately from user deletion. Deleting a user account often does not revoke app tokens or service-to-service integrations; you need a token-centric inventory, verification steps, and clear owners to ensure no hidden persistence remains after staff or vendor changes.

## Why a token-centric workflow differs from mailbox-focused rotation

Mailbox-focused credential rotation targets mailbox passwords, SMTP/IMAP credentials, or mailbox delegation. Those steps are necessary but insufficient: OAuth tokens, API keys, and connected app grants can continue to operate independently of mailbox credentials.
Decision boundary: stop when all active tokens and service connections associated with the departed user, team, or vendor are revoked or reassigned. Evidence limits: platform consoles and audit logs differ by provider; use official admin consoles and audit exports to locate tokens where possible.

## Inventory: what to look for and where to find it

Scope the inventory by identity and by service. For each account, check OAuth app grants, service principals, API keys, delegated permissions, and provider-specific app registrations. Prioritize services used for sending email, accessing CRM/marketing systems, or administering DNS.
Practical sequence: (1) list accounts and apps from your identity provider and SSO; (2) inspect third-party app grants in Google Workspace and Azure/Office 365 admin portals; (3) query SaaS apps' admin pages for connected apps and service accounts. For Google and Microsoft, use their admin consoles and audit documentation as directional references for where granting and revocation actions live [1][2].

## Verification and isolation tests

After revocation, verify by testing each integration in a controlled way. Use a non-production recipient or monitoring mailbox and attempt the specific action the token enabled (API call, inbound webhook, or send attempt). Stop conditions: the action fails with an 'unauthorized' or 'invalid token' response, or the app no longer appears in the provider's active grants list.
Decision boundary and evidence limits: Some providers delay revocation or cache tokens; if a test still succeeds immediately after revocation, document timestamps, retry after a short wait, and escalate to the vendor support channel as needed.

## Owner map and handoff rules

Assign a single owner per integration (role: revoke, rotate, or reassign). Owners must have admin privileges in both the identity provider and the SaaS app or a documented escalation path. Practical sequence: record owner, required admin roles, and proof-of-revocation artifact (screenshot, audit log entry ID, or support ticket number).

## Decision flow for revoked, rotated, or reattached tokens

If the integration is no longer required, revoke and record. If still required for ongoing services, rotate credentials and reattach to a service account or managed identity rather than a human user. If reattachment is needed but the app doesn't support managed identities, schedule a documented temporary access with an expiration and monitoring.
Examples (labeled): Example — Move an OAuth client from a departed contractor’s user-owned app registration to a tenant-level app registration, then rotate its client secret and update the consuming service.

## Record-keeping, audit artifacts, and retention

Store for each integration: integration name, type (OAuth/API key/webhook), owner, date revoked/rotated, proof artifact, and verification result. Retain artifacts according to your security policy; for investigations, keep at least one proof showing revocation and one verification test. Evidence limits: audit retention windows vary by provider, so export logs promptly when processing offboarding.

## Practical checklist

- [ ] Export a list of users and service accounts from your identity provider and SSO.
- [ ] Query Google Workspace and Microsoft 365 admin consoles for OAuth app grants and service principals; export or screenshot grant lists [1][2].
- [ ] For each departed user, list all third-party apps they authorized or owned and tag as 'revoke', 'rotate', or 'reassign'.
- [ ] Revoke tokens for unused integrations; for required integrations, rotate credentials and attach to a managed service account.
- [ ] Run isolated verification tests for each revocation/rotation and capture the response and timestamps.
- [ ] Log owner, action taken, artifact (screenshot/log/ticket), and retention date in your offboarding tracker.
- [ ] If immediate revocation fails or tests succeed post-revocation, open a vendor support ticket and document the escalation.
- [ ] Schedule a follow-up permission audit and isolation test 7 and 30 days after offboarding.
- [ ] If an integration requires long-term continuity, set an expiration reminder and enforce periodic re-authorizations.

## Where RepMail fits

Use this guide as an operational checklist during client offboarding and access audits in agency outreach workflows. When preparing or verifying client-integrated sending systems, run the token inventory and verification steps before concluding an offboarding or vendor change. Link the outcomes to your permissions audit, isolation tests, and standard offboarding record to avoid hidden persistence.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Agency knowledge transfer from departing account owner](/repmail/learn/outreach/agency-departing-account-owner-knowledge-transfer)
- [Agency permission matrix for client, contractor, and vendor roles](/repmail/learn/outreach/agency-permission-matrix-client-contractor-vendor)


## Sources

[1]: https://knowledge.workspace.google.com/admin/users/maintain-data-security-after-an-employee-leaves "Google sender or Workspace documentation"
[2]: https://learn.microsoft.com/en-us/microsoft-365/admin/add-users/remove-former-employee?view=o365-worldwide "Microsoft documentation"
