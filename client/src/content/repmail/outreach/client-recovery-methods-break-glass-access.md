---
product: repmail
academy: outreach
contentType: template
slug: client-recovery-methods-break-glass-access
title: "Client-owned recovery methods and break-glass access plan"
description: "Client-owned recovery methods and break-glass access plan — Agency controls recovery email, MFA, or emergency admin path."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","agency","client","owned","recovery"]
assets:
  - type: table
    title: "Decision table: choose a recovery path"
    content:
      headers: ["Situation","Use client-owned recovery?","Use agency-controlled break-glass?","Immediate action required"]
      rows:
        - ["Primary admin still responsive","Yes","No","Record status; no action"]
        - ["Primary admin unresponsive and legal POA exists","Yes (transfer if supported)","Yes (only if POA mandates)","Follow POA; log transfer steps"]
        - ["Primary admin unreachable, no POA, time-sensitive outage","No","Yes (pre-authorized break-glass only)","Collect two approvers’ signed requests; activate emergency account"]
        - ["Evidence of credential compromise","No","No (do not use affected path)","Isolate, rotate affected credentials, use alternate recovery path"]
        - ["Admin offboarding underway and recovery contacts changing","Yes (new client contact must be set)","No","Update admin-of-record, test new recovery path"]
        - ["Vendor requires in-product verification or support ticket","Depends on vendor policy","Depends; use documented escalation","Open support case, follow vendor verification, preserve all artifacts"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Agency controls recovery email, MFA, or emergency admin path"
  - "Distinct from ownership matrix: focuses on recovery and emergency access mechanics."
  - "Link to administrator-of-record and offboarding."
commonMistakes:
  - "Skipping this check: Record which recovery contacts are client-owned vs agency-controlled and document proof requirements for activation."
  - "Skipping this check: Assign a single client custodian for break-glass credentials and an alternate approver; record contact details and authority evidence."
  - "Skipping this check: Store break-glass credentials in a hardened vault with multi-person release controls; require approval from two approvers to access."
faqs:
  - question: "If the agency controls the recovery email, can the client reclaim it without legal action?"
    answer: "Not necessarily. Reclaiming an agency-controlled recovery email depends on contractual terms and the provider’s account-recovery policies. The plan should avoid this ambiguity by designating client-owned recovery contacts where possible, and by documenting explicit transfer processes and evidence requirements. When vendor policies are involved, treat them as directional and verify with the provider before activation [1]."
  - question: "How often should break-glass credentials be tested and rotated?"
    answer: "Test recovery paths at least semi-annually for most clients; increase frequency to quarterly for higher-risk environments. Rotate break-glass credentials after any use or suspected compromise, and on a scheduled cadence (commonly annually). State these schedules in the plan and require verification after each admin change or offboarding event [1]."
  - question: "What minimum evidence should an agency require before using break-glass access?"
    answer: "Require a signed, time-stamped request from two independent client approvers (e.g., admin-of-record and legal), or a formal POA that specifically authorizes the action. The plan must list acceptable evidence types and a strict activation script; do not proceed on verbal approval alone. Preserve all artifacts in an immutable audit trail for post-event review."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Create a documented, client-controlled emergency access plan that balances avoiding account lockout with the client retaining ownership. Define clear recovery methods, who holds break-glass credentials, and the exact activation sequence. Test annually and after major admin changes.

## Define recovery ownership and activation conditions

Decide which email, phone number, and MFA devices are client-owned vs agency-controlled. The decision boundary: client-owned means the client retains recovery credentials and can revoke agency access without agency intervention; agency-controlled means the agency manages credentials and must follow a documented escalation path. Record activation conditions (e.g., loss of primary admin, legal hold, or critical incident) and the minimum evidence required before activating break-glass (signed request, corporate POA, or two independent client approvers). This reduces ambiguity during incidents and preserves client control.

## Specify technical recovery methods and limitations

List the concrete recovery methods to use for each product (primary admin account, recovery email, recovery phone, MFA seed, delegated admin). For each method, note provider-specific caveats and evidence limits: some providers allow account transfer but require proof of ownership; others allow temporary access via the admin console audit trail [1]. Where provider behavior is uncertain or evolving, state that the plan requires confirmation with the product vendor before activation. Include stop conditions: if credential compromise is suspected, do not reuse the same recovery contact until it is rotated and verified.

## Break-glass credentials, storage, and rotation

Define who holds break-glass credentials (client custodian, legal, or an independent trustee) and where they are stored (hardware vault, corporate password manager with strict ACLs, or physical safe). The practical sequence: create credentials, record the creation date and purpose, store only the minimum secret (e.g., recovery seed or emergency account), and restrict access with multi-person authorization. Require rotation after use or on a scheduled cadence (example: annually) and after any suspected compromise. Label rotation as mandatory: a break-glass sequence is complete only after verification and credential rotation.

## Activation and handoff procedure with evidence trail

Provide a step-by-step activation script: (1) Client submits a signed break-glass request following the documented template; (2) Agency verifies two independent approvers and records time-stamped evidence; (3) Agency activates only the pre-authorized recovery method; (4) Agency logs every action to an immutable audit trail and notifies the client custodian immediately. The decision boundary is strict: activation without full evidence or beyond pre-authorized methods is not permitted. Preserve artifacts for an agreed retention period to support audits and offboarding.

## Testing, validation, and offboarding interplay

Test the recovery path on a scheduled basis (quarterly or semi-annually depending on risk profile) and after any major admin change. Testing should be scoped to avoid real disruption: use a test account or scheduled maintenance window, verify that the recovery method works end-to-end, and confirm audit logs capture the event. Tie this plan to the administrator-of-record and offboarding processes so that custodianship updates trigger validation and, if necessary, credential rotation [1]. Tests and results should be recorded and reviewed by client leadership.

## Practical checklist

- [ ] Record which recovery contacts are client-owned vs agency-controlled and document proof requirements for activation.
- [ ] Assign a single client custodian for break-glass credentials and an alternate approver; record contact details and authority evidence.
- [ ] Store break-glass credentials in a hardened vault with multi-person release controls; require approval from two approvers to access.
- [ ] Document the exact activation script and required evidence; include timestamps for every step in the audit trail.
- [ ] Schedule and run recovery tests at least semi-annually; log test scope, outcome, and remediation tasks.
- [ ] Rotate break-glass credentials after any use or suspected compromise and on a fixed schedule (e.g., annually).
- [ ] Limit emergency access to pre-authorized methods; do not expand access during an incident without documented approvals.
- [ ] Link recovery plan updates to administrator-of-record changes and offboarding events; require verification after each change.
- [ ] Retain activation and test artifacts for the agreed audit period and make them available to client leadership on request.

## Where RepMail fits

Use this guide as a checklist and decision aid when preparing outbound communications or client onboarding packages that include emergency access terms. Include the documented activation script and contact points in client-facing materials to reduce back-and-forth during incidents. Do not infer that RepMail automates or enforces these controls; treat the article as operational guidance to standardize messaging and checklist compliance.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Agency permission matrix for client, contractor, and vendor roles](/repmail/learn/outreach/agency-permission-matrix-client-contractor-vendor)
- [Agency report QA checklist before client delivery](/repmail/learn/outreach/agency-outbound-report-qa-checklist)


## Sources

[1]: https://knowledge.workspace.google.com/admin/users/maintain-data-security-after-an-employee-leaves "Google sender or Workspace documentation"
[2]: https://support.google.com/analytics/answer/9305587?hl=en "Google sender or Workspace documentation"
