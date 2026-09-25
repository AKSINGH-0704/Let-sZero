---
product: repmail
academy: infrastructure
contentType: tutorial
slug: aws-ses-smtp-credentials-rotation
title: "AWS SES SMTP Credentials: Rotation, Scope, and Failure Testing"
description: "AWS SES SMTP Credentials: Rotation, Scope, and Failure Testing — Teams using SES SMTP credentials that need safe rotation and rollback."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["infrastructure","ses","aws","smtp","email","credentials","rotation","scope"]
assets:
  - type: table
    title: "Quick decision/diagnostic table"
    content:
      headers: ["Observed symptom","Likely cause (decision boundary)","Immediate diagnostic","Fast remediation"]
      rows:
        - ["535 Authentication failed on senders","Wrong SMTP password or username mismatch","Compare app-secret vs secret-manager value and test AUTH with an SMTP client","Re-deploy correct secret or revert to saved old secret"]
        - ["Connection accepted but 554/5xx on submission","Envelope-from or sending domain not authorized or bounce policy","Send test with same credentials to traceable address and check SES feedback","Pause sending, fix envelope-from or sender settings, then resume"]
        - ["Intermittent fails only on high load","Rate limits or credential throttling / network instability","Compare error timestamps with traffic spikes and SES limits","Throttle senders or stagger credential use; consult SES quotas if needed"]
        - ["New credentials work in test but not in production","Secret propagation delay or different config in prod","Verify secret retrieval logs and environment variables on prod nodes","Force secret refresh on instances or re-run deployment step"]
        - ["Cannot re-authenticate to old credentials after rotation","Old credentials were revoked prematurely","Check IAM/SES console for credential state and audit logs","If revoked, create emergency new credentials and deploy; review rollback process"]
featured: false
collections: ["email-infrastructure-decisions"]
learningPaths: ["email-infrastructure"]
keyTakeaways:
  - "Teams using SES SMTP credentials that need safe rotation and rollback"
  - "Credential lifecycle, not SMTP TLS or initial connection setup"
  - "Link from SES SMTP and secret-management pages"
commonMistakes:
  - "Skipping this check: Inventory all services and owners that use the SES SMTP username/password pair"
  - "Skipping this check: Schedule a maintenance/low-volume window and assign a rotation owner"
  - "Skipping this check: Create replacement SMTP credentials and store them in your secret manager"
faqs:
  - question: "Do I need to rotate SES SMTP credentials on a fixed schedule?"
    answer: "Rotation frequency depends on your risk posture and policy. AWS docs show how to create and use SMTP credentials but do not mandate a schedule [1][2]. Many teams rotate on a time-based cadence (e.g., quarterly) or after personnel or incident events. State your policy, automate safely, and ensure a tested rollback path."
  - question: "Can I automate rotation with my secret manager without downtime?"
    answer: "Yes, but only if your deployment and secret retrieval system can hot-reload credentials and you have canary testing. Automation must include a rollback mechanism and observed validation steps (test sends) to avoid broad outages. Always test automation in staging first."
  - question: "If credentials are compromised, should I revoke immediately?"
    answer: "Revocation should be prompt, but you must ensure you can deploy replacement credentials immediately to avoid send outage. If immediate replacement isn’t possible, consider narrowing access, pausing affected senders, and restricting outbound scope while you enact a secure rotation and rollback."
nextStep:
  label: "Continue with Amazon SES Account-Level Suppression: How to Use It"
  href: "/repmail/learn/infrastructure/aws-ses-account-level-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Rotate AWS SES SMTP credentials by creating new IAM-backed SMTP credentials, validating them in parallel with the live pair, and then switching with a short rollback window. Test rotation under load and failure scenarios before scheduling production cutovers to avoid send outages.

## Scope and decision boundary

This guide covers lifecycle tasks for AWS SES SMTP credentials (create, rotate, revoke, and rollback). It does not cover SMTP TLS setup, SES sending quotas, or initial IAM user creation beyond what’s needed for credential rotation. When you need to change credentials because of suspected compromise, scheduled key rotation, or personnel changes, follow the sequence in this article.

Evidence about how SES SMTP credentials are derived and used comes from AWS documentation; treat provider details (creation UI, naming, and immediate revocation behavior) as subject to change and verify against AWS’ docs before automation [1][2].

## Preparation: inventory and safe windows

First, inventory every service, server, and job that uses the SMTP username/password pair. Include app containers, background workers, CI/CD runners, monitoring hooks, and third-party vendors. Assign a single owner (engineer or SRE) to coordinate the cutover and rollback.

Schedule a maintenance window or a low-volume period and communicate it to stakeholders. If you cannot schedule downtime, require the ability to deploy config changes without a full deployment (hot reload of credentials or per-instance secret pull). Prepare a rollback channel (e.g., an automated script to restore old credentials) and a kill-switch to revoke new credentials quickly if needed.

## Create and validate replacement credentials

Create the replacement SMTP credentials via the AWS SES SMTP credential creation flow (usually an IAM user with SMTP SMTPPassword derived). Do not delete the old credentials yet. Store the new credentials in your secret manager and give them to a single test sender or service instance first.

Validate by sending test messages to non-production recipients and by exercising the application's SMTP client code path—authentication, starttls, and envelope-from behaviors. Confirm logs show successful AUTH LOGIN exchanges and that message submission is accepted by SES. Use per-test recipients with explicit headers so you can trace which credential pair was used.

## Parallel-run and cutover sequence

Run the new credentials in parallel where possible. If your application supports multiple credential sets, configure a small percentage of workers to use the new pair and monitor for errors (425/421 connection issues, 535 authentication failures, or 554 rejects related to sender policy). Increase traffic gradually if no failures appear.

When ready, update all remaining instances to the new credentials in a coordinated deployment. Keep the old credentials active for a short rollback window (recommend 15–60 minutes depending on operational risk). After cutover, monitor SMTP auth success rates, sending error rates, and application error dashboards closely.

## Failure testing and rollback

Before declaring the rotation complete, simulate common failure modes: mis-typed secrets, wrong region endpoint, rate-limiting from burst traffic, and secret propagation delays in your secret store. For each simulation, ensure your rollback procedure restores service within your target recovery time objective (RTO).

If the new credentials fail in production, immediately switch outbound services back to the old credentials using the pre-tested script or configuration management tool, then revoke the failing credentials and investigate logs and SES-reported responses. Only revoke the old credentials after you’ve confirmed stable sending for your chosen observation period.

## Evidence limits, automation, and security notes

AWS documentation describes creating SMTP credentials and sending via SMTP but does not prescribe organization-specific rotation policies; those are governance decisions you must make [1][2]. This article gives operational patterns, not legal or compliance advice. Consider automating rotation with your secret management tool, but ensure automation includes canary testing and a safe rollback path.

Treat SMTP credentials as high-value secrets. Use least-privilege IAM users, rotate on a schedule commensurate with risk, and log all rotations. If credentials are suspected compromised, prioritize revocation after ensuring you can immediately replace them without prolonged outage.

## Practical checklist

- [ ] Inventory all services and owners that use the SES SMTP username/password pair
- [ ] Schedule a maintenance/low-volume window and assign a rotation owner
- [ ] Create replacement SMTP credentials and store them in your secret manager
- [ ] Validate new credentials with test sends to traceable non-production recipients
- [ ] Run the new credentials in a small canary cohort before full cutover
- [ ] Prepare and test an automated rollback script that restores the old secret quickly
- [ ] Monitor SMTP auth success, 4xx/5xx send errors, and application logs during cutover
- [ ] Revoke old credentials only after the observation window and stable metrics
- [ ] Record rotation metadata (who, when, reason) and update incident playbooks

## Where RepMail fits

Use this guide as an operational checklist when managing outbound infrastructure that relies on SES SMTP credentials. RepMail users can adopt the checklist and diagnostic table to align rotation windows, canary testing, and rollback procedures with their outbound schedules and incident playbooks. The procedural steps help reduce credential-related outages that would affect sending continuity.

Continue with [Amazon SES Account-Level Suppression: How to Use It](/repmail/learn/infrastructure/aws-ses-account-level-suppression) for the next step in the workflow.

## Related RepMail guides

- [AWS SES API v2 Formatted vs Raw Email: A Practical Boundary](/repmail/learn/infrastructure/aws-ses-api-v2-formatted-vs-raw)
- [AWS SES Configuration Sets: Tags, Destinations, and Routing](/repmail/learn/infrastructure/aws-ses-configuration-sets-routing)


## Sources

[1]: https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html "Amazon SES developer documentation"
[2]: https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html "Amazon SES developer documentation"
