---
product: repmail
academy: outreach
contentType: template
slug: campaign-pause-communications-template
title: "Campaign Pause Communications Template"
description: "Campaign Pause Communications Template — Operators need internal and client-facing language stating scope, reason, evidence, owner, next update, and prohibited."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","campaign","incident","pause","communications","template"]
assets:
  - type: table
    title: "Decision / Diagnostic Table"
    content:
      headers: ["Triggering symptom","Minimum evidence required","Immediate operator action","Owner","Stop condition"]
      rows:
        - ["Sharp increase in complaint rate","Complaint rate snapshot + sample complaint headers (last 24h)","Pause campaign; collect complaint samples; verify unsubscribe functionality","Deliverability lead","Complaint rate <0.2% for 72h and unsubscribe verified"]
        - ["Bounce / delivery failure spike","Bounce logs with SMTP codes, per-domain failure rate (24h)","Pause sends to affected domain(s); escalate to ESP and DNS team","Technical ops owner","Bounce rate <3% for 48h and DNS/ESP root cause resolved"]
        - ["Vendor or ISP blocklist notice","Vendor alert screenshot, affected IPs/domains list","Immediate pause of affected IPs/domains; open vendor ticket","Account technical owner","Vendor clears block or successful delisting steps completed and validated"]
        - ["Significant abnormal engagement drop","Engagement metric snapshot vs baseline (last 7d vs prior 30d)","Pause new sends; run content and deliverability checks","Campaign owner","Engagement recovers to within expected variance or root cause fixed"]
        - ["Accidental double-send or list mistake discovered","Proof of duplicate send or incorrect list selection","Pause further sends to the list; notify affected recipients if needed","Campaign ops owner","Remediation confirmed and any required notifications sent"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Operators need internal and client-facing language stating scope, reason, evidence, owner, next update, and prohibited workarounds."
  - "Distinct from pause decision table: communication artifact after the decision."
  - "incident runbook; agency reporting"
commonMistakes:
  - "Skipping this check: List affected campaign IDs, sending domains, and audience segments explicitly."
  - "Skipping this check: Attach evidence: metric snapshots, bounce logs, complaint samples, and vendor alerts with timestamps."
  - "Skipping this check: Name a single owner with contact details and decision authority."
faqs:
  - question: "Can we keep sending to a small test seed while the campaign is paused?"
    answer: "You may allow carefully controlled test sends only if the communication explicitly states it and the owner approves. The test seed must use a different domain or isolated IP and be limited in volume. Document the rationale and any observed results; tests do not imply approval to resume full sends."
  - question: "What if a client insists on continuing sends despite the pause?"
    answer: "Escalate immediately to account management and legal as specified in the incident runbook. The communication should name the owner who has authority to enforce the pause. Do not permit workaround sends from alternate ESPs or domains unless the owner authorizes in writing after remediation criteria are met."
  - question: "How soon should we provide an update after issuing the pause?"
    answer: "Provide an initial operational acknowledgement within one hour to confirm the pause and owner assignment. The next substantive update should follow the interval defined in the communication (common windows: 24 or 48 hours) or earlier if a stop condition is met."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Use these ready-to-send internal and client-facing templates and the supporting decision logic when a campaign pause is enacted. They list scope, reason, evidence, owner, next update, and explicit prohibited workarounds so operators can align teams quickly and prevent bypassing containment.

## When to use this communication

Send this communication only after a pause decision has been made via your pause decision table or incident runbook. The communication confirms the decision, documents the evidence that triggered it, and instructs affected teams on immediate next steps and forbidden actions.

Do not use the template to debate the decision. If the pause is provisional, say so and provide the specific data or time boundary that will trigger reevaluation. Where external legal or vendor review is required, cite that as a next-step rather than a promise of outcome.

## Required content and decision boundaries

Include scope (campaign IDs, lists, segments, sending domains/IPs), precise reason (e.g., deliverability spike, complaint rate increase, vendor alert), evidence summary (metrics, logs, observed patterns), named owner (single accountable person), and the time or metric that will trigger the next update.

Define clear stop conditions and workarounds that are prohibited — for example: no list splits, no new sends from the paused domain, no using alternate ESPs for the same list, and no manual reactivation without the named owner’s sign-off. State whether test sends to seed lists are allowed and under what constraints.

## Practical sequence for issuing the message

1) Draft the internal notice first and circulate to incident owner and upstream stakeholders for factual verification. 2) Publish the internal notice to operations channels (ticketing system, runbook log, and ops Slack channel) and tag the owner. 3) Prepare the client-facing notice, stripping operational noise and keeping the facts: scope, reason, evidence summary, owner, next update, and forbidden workarounds.

Time the client-facing message only after the internal message is acknowledged by owners. If the pause affects contracted SLAs, notify account management and legal concurrently.

## Evidence limits and how to present them

Summarize evidence as observable facts and known measurement windows (e.g., complaint rate 0.8% over last 24 hours on campaign X; delivery failure rate 12% for domain Y). Do not extrapolate beyond the period or systems observed; call out missing data explicitly and the steps to collect it.

When referencing preflight checks or cold-email checklist items that you inspected, cite them directionally rather than as guarantees (see [1], [2]). For example: “Preflight checks indicate list hygiene flags per our checklist [1].”

## Owner responsibilities and stop conditions

The named owner must be a single point of accountability who will: gather additional evidence, coordinate remediation, update stakeholders, and authorize resume. The owner must post a timestamped update in the incident runbook and close the loop in the ticketing system.

Stop conditions must be concrete: either metric thresholds (e.g., complaint rate <0.2% for 72h), successful remediation actions (e.g., reverse DNS fixed and delivery failures <3% for 48h), or a timed review (e.g., 48 hours). Absent a stop condition being met, the pause remains in force.

## Practical checklist

- [ ] List affected campaign IDs, sending domains, and audience segments explicitly.
- [ ] Attach evidence: metric snapshots, bounce logs, complaint samples, and vendor alerts with timestamps.
- [ ] Name a single owner with contact details and decision authority.
- [ ] State precise stop conditions (metric, action completed, or time).
- [ ] Publish internal notice first and obtain owner acknowledgement in ops channels.
- [ ] Send client-facing notice after internal acknowledgement; keep language factual and scoped.
- [ ] List prohibited workarounds (no split sends, no alternate ESPs for same list, no manual reactivation).
- [ ] Log the pause in the incident runbook and ticketing system with a unique incident ID.
- [ ] Schedule the next update window and who will deliver it.

## Where RepMail fits

Use this template as a checklist and standard communication artifact in your outbound incident workflow and runbooks. It helps operators produce consistent internal and client-facing notices, record evidence, and list prohibited workarounds so teams do not bypass containment. Do not interpret this guide as a guarantee of outcomes with any ESP or mailbox provider; treat provider-specific remediation steps as separate actions to verify.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Campaign Rollback and Pause Decision Table](/repmail/learn/outreach/campaign-rollback-pause-decision-table)
- [AI Outreach Escalation Matrix for Hallucinated Details](/repmail/learn/cold-email/ai-outreach-hallucination-escalation-matrix)


## Sources

[1]: https://www.campaignmonitor.com/blog/email-marketing/email-campaign-preflight-checklist/ "Supporting technical or operational reference"
[2]: https://mailmeteor.com/checklists/cold-email "Supporting technical or operational reference"
