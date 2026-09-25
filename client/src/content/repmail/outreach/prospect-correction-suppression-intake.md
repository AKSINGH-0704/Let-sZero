---
product: repmail
academy: outreach
contentType: guide
slug: prospect-correction-suppression-intake
title: "Prospect Correction and Suppression Intake Form"
description: "Prospect Correction and Suppression Intake Form — Support teams need a single intake for inaccurate data, opt-out, wrong person, role change, and correction ev."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","suppression","compliance","prospect","correction","intake","form"]
assets:
  - type: table
    title: "Decision / Diagnostic Table"
    content:
      headers: ["Reported issue","Minimum evidence","Immediate owner","Immediate action","Stop condition"]
      rows:
        - ["Explicit opt-out from prospect","Message screenshot or original message stating opt-out","Suppression Team","Apply suppression to email; log scope","Suppression applied and confirmation sent"]
        - ["Bounce / invalid email","SMTP bounce header or NDR","Data Correction Team","Mark address invalid in CRM; flag for alternate address","CRM updated and reporter notified"]
        - ["Wrong person report (message delivered to wrong employee)","Screenshot of message and intended recipient info","Suppression or Account Ops (depending on scale)","Suppress address or update recipient mapping; investigate cause","Recipient suppressed or mapping corrected"]
        - ["Role change (prospect changed employer or title)","Public profile or prospect-supplied confirmation","Data Correction Team","Update CRM fields; preserve prior record","CRM updated with source recorded"]
        - ["Suspected abusive sending or policy violation","Multiple complaints, abuse headers, or provider notice","Compliance/Incident Response","Escalate for investigation; stop sends if required","Compliance closes incident or issues remediation plan"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Support teams need a single intake for inaccurate data, opt-out, wrong person, role change, and correction evidence."
  - "Distinct from access requests and inaccurate-data guidance: one operational triage artifact for frontline teams."
  - "suppression; data correction; compliance incident response"
commonMistakes:
  - "Skipping this check: Capture reporter name, contact, and organizational role"
  - "Skipping this check: Record prospect full name, email address, company, and job title"
  - "Skipping this check: Select issue type: inaccurate data, opt-out, wrong person, role change, other"
faqs:
  - question: "If a reporter provides only a verbal request reported over chat, is that sufficient?"
    answer: "No. Verbal or chat-only reports should be logged but marked 'Incomplete.' Require at least one verifiable artifact (email, screenshot with timestamp, or bounce). If the prospect confirms by replying to the original outbound address, that reply can serve as sufficient evidence."
  - question: "Will applying suppression guarantee future emails land in the inbox?"
    answer: "No. Suppression prevents outbound sends to that address within your systems, but it does not alter recipient-side filtering or inbox placement. This intake governs your send rules and logs actions, not recipient mailbox behavior."
  - question: "When should Legal be involved?"
    answer: "Escalate to Legal for requests citing statutory rights (DSARs, deletion under law), subpoenas, restraining notices, or when the requester demands deletion beyond operational corrections. If you are unsure whether a request is legal in nature, mark the case for Legal review before taking irreversible actions."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

This intake form standardizes how frontline support triages prospect corrections, opt-outs, wrong-person reports, and role changes so every case has a clear owner, required evidence, and a measurable stop condition. Use the fields and decision rules below to route records to suppression, data-correction, or compliance queues without rework.

## When to use this intake

Use this intake for any customer-reported or observed issue where prospect contact data is inaccurate, the recipient requests opt-out or unsubscribe, the message reached the wrong individual, or the recipient’s role/company has materially changed. Do not use it for access or legal requests (e.g., data subject access requests, deletion under law); those follow a separate legal/DSAR workflow.

Decision boundary: this form is for operational triage only—if the request cites a legal basis (GDPR/CCPA) or a court order, escalate to Legal. Evidence limits: accept screenshots, bounce headers, original message ID, and business card scans, but stop if the requester cannot provide verifiable contact context.

## Required fields and minimal evidence

Collect these discrete fields every submission: reporter name and role, reporter contact, prospect full name, prospect email(s) and domain, company, job title, description of the issue (choose: inaccurate data, opt-out, wrong person, role change, other), expected action, and desired stop condition (suppress, update, follow-up). Attach evidence: email headers, original message copy, bounce notifications, screenshots showing the prospect’s request, or internal CRM record snapshots.

Practical note: if evidence is missing, mark submission as 'Incomplete — Awaiting Evidence' and request a single piece of proof (preferably the original message or header). Do not perform suppression or deletion until the minimum evidence is provided and validated by a reviewer.

## Triage logic and routing

Triage to one of three owners: Suppression Team (opt-outs, unsubscribe, confirmed do-not-contact), Data Correction Team (incorrect name, email, company, or title needing CRM change), or Compliance/Incident Response (suspected policy breach, repeated abuse, legal claims). Use the 'expected action' field to confirm route: if requester asks to stop messaging and provides a direct request from the prospect, route to Suppression immediately.

Sequence: 1) Validate evidence; 2) Check past interactions and suppression status; 3) Apply action per owner rules; 4) Record outcome and retention of evidence. Stop condition: case is closed when action is applied and confirmation sent to reporter, or when Legal takes ownership.

## Action rules and examples

Suppression: apply global suppression when the prospect explicitly requests opt-out or the message headers show a complaint. Log suppression scope (global, domain, or campaign level) and the trigger evidence. For ambiguous requests (e.g., 'please stop this role'), suppress email address and flag for review rather than global suppression.

Data correction: update CRM only after confirming the correct information with at least one authoritative source (e.g., company website, LinkedIn profile, or prospect-supplied business email). If multiple conflicting sources exist, do not overwrite until reporter supplies a primary source. Example: reporter provides a screenshot showing a new title at a different company — update title only after verifying on company site or prospect confirmation.

## Recordkeeping, retention, and audit trace

Keep an immutable audit trail: submission timestamp, reviewer, evidence links, action taken, suppression scope, and notification sent. Retain evidence consistent with privacy policies and legal hold requirements; do not store more personal data than necessary. If the case becomes a compliance incident, export the complete audit to Compliance and mark records with the incident ID.

Evidence limits and privacy: redact any unrelated personal data in screenshots before storage. If unsure about retention timelines or legal holds, escalate to Legal rather than deleting evidence.

## Practical checklist

- [ ] Capture reporter name, contact, and organizational role
- [ ] Record prospect full name, email address, company, and job title
- [ ] Select issue type: inaccurate data, opt-out, wrong person, role change, other
- [ ] Attach at least one supporting artifact (original message, header, bounce, screenshot)
- [ ] Validate evidence against CRM and public sources before changing data
- [ ] Route to Suppression, Data Correction, or Compliance per triage rules
- [ ] Apply suppression with documented scope and log the action
- [ ] Notify reporter of action and close or escalate with incident ID
- [ ] Redact unrelated personal data before storing evidence

## Where RepMail fits

Use this guide as an operational checklist and decision aid inside outbound workflows: embed required fields into your helpdesk form, use the triage logic to route tickets, and apply the decision table when training new support agents. The document is a process artifact—RepMail operators can copy the fields, checklist, and table into their ticket templates to reduce rework and protect sender reputation without implying any specific product feature.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [AI Outreach Data Deletion and Subject-Request Workflow](/repmail/learn/cold-email/ai-outreach-data-deletion-subject-request)
- [Bounce Evidence Capture Form](/repmail/learn/outreach/bounce-evidence-capture-form)


## Sources

[1]: https://support.google.com/mail/answer/81126 "Google sender or Workspace documentation"
