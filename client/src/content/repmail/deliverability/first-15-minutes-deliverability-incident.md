---
product: repmail
academy: deliverability
contentType: template
slug: first-15-minutes-deliverability-incident
title: "First 15 Minutes of a Deliverability Incident: Freeze, Scope, Notify"
description: "First 15 Minutes of a Deliverability Incident: Freeze, Scope, and N… — Operators need immediate actions before detailed diagnosis."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability","reputation","incident","minutes","freeze","scope"]
assets:
  - type: table
    title: "Decision table: first-15-minutes containment actions"
    content:
      headers: ["Observed symptom","Immediate containment","Evidence to capture","Owner to notify"]
      rows:
        - ["Sudden spike in bounce rate for single campaign","Pause the campaign; hold the segment","3 bounce messages, campaign send IDs, provider error logs","Campaign owner, deliverability lead"]
        - ["Multiple domains showing delivery drops","Halt sends across affected domains; disable related API endpoints","Sample headers per domain, API logs, provider status","Platform ops, incident owner"]
        - ["Provider reports IP-level throttling or block","Stop sends from affected IP pool; switch to alternate pool if pre-authorized","Provider throttle/error message, IP pool identifiers, recent send rates","Network ops, deliverability specialist"]
        - ["Sudden complaint rate increase","Pause targeted sends and suppress complaining segments","Complaint notifications, sample message content, segment definitions","Deliverability lead, customer success"]
        - ["Authentication failures (DKIM/SPF) observed in headers","Stop sends from the misconfigured sender; do not change DNS yet","Raw headers showing auth failures, recent DNS change logs","Authentication specialist, incident owner"]
featured: false
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
keyTakeaways:
  - "Operators need immediate actions before detailed diagnosis."
  - "Existing evidence checklist records data; this adds containment order and notification roles."
  - "Links severity rubric to root-cause runbooks."
commonMistakes:
  - "Skipping this check: Pause all scheduled sends and API-driven outgoing sends immediately."
  - "Skipping this check: Disable automated resend loops, retries, and enforcement rules."
  - "Skipping this check: Capture 10–50 raw message headers representing affected paths."
faqs:
  - question: "Should I change SPF/DKIM/DMARC immediately if I see authentication failures?"
    answer: "No. In the first 15 minutes you should stop sending from the affected sender but avoid DNS changes. DNS edits can take time to propagate and make correlation harder. Capture headers and recent DNS change records, then escalate to an authentication specialist for controlled remediation."
  - question: "When should I notify customers affected by the incident?"
    answer: "Notify customer-facing teams (customer success, account leads) in the first 15 minutes so they can prepare outreach. Do not notify end customers until scope and impact are confirmed and messaging is approved by the incident owner and legal if necessary."
  - question: "Can I rely on provider status pages for root cause during these first minutes?"
    answer: "Provider status pages are a directional signal but not definitive. Use them to corroborate your internal evidence, and state uncertainty when relying on them. For carrier-specific or policy blocks, follow the provider’s official support path for diagnostics [2]."
nextStep:
  label: "Continue with Provider-Specific Deliverability Triage: Gmail, Microsoft, and More"
  href: "/repmail/learn/deliverability/provider-specific-deliverability-triage"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Immediately stop additional risk, define what you will and will not change, and notify the smallest set of stakeholders who can act. In the first 15 minutes you must contain blast radius, capture initial evidence, and assign a single incident owner to coordinate next steps.

## Freeze: immediate containment and what to lock

Decision boundary: stop any automatic actions that can increase outbound volume or alter authenticated sender configuration. This includes throttles, scheduled campaigns, API-driven sends, and automatic resend rules. Do not change authentication (SPF/DKIM/DMARC) records in this window unless instructed by a designated authentication specialist — DNS changes propagate slowly and can complicate correlation.

Evidence limits: capture timestamps and IDs for the last 60–120 minutes of sends and any suppression list changes; do not attempt deep forensic parsing yet. A frozen state should be verifiable by system logs or API call history; record which systems you disabled and who authorized it.

Practical sequence: 1) Pause all scheduled campaigns and halt API send endpoints; 2) Disable automated retries and resend loops; 3) Place impacted segments into a hold state at the campaign or provider level. Stop actions, don’t try to remediate deliverability root causes in this window.

## Scope: quick triage to establish blast radius

Decision boundary: classify the incident as single-campaign, single-sender domain, or platform-wide within the first 10 minutes. Use send logs, provider dashboards, and complaint/delivery rate drops to determine scope. If multiple sending domains or IP pools show simultaneous abnormal behavior, treat as platform-wide and escalate accordingly.

Evidence limits: rely on recent delivery and complaint metrics, bounce rates, and provider status pages; avoid full header analysis or complete list auditing in this phase. Capture representative samples: three failed message headers, three bounce messages, and one complaint notification from each affected domain or pool.

Practical sequence: 1) Query provider for recent delivery and bounce rates for the last hour; 2) Check reputation or throttling alerts in provider consoles; 3) Map which customer segments, templates, and IPs are tied to failed sends. Record scope decisions and thresholds used.

## Notify: who to tell and what to say first

Decision boundary: notify only people who can act in the first hour — incident commander, platform/network ops, deliverability lead, customer success for impacted accounts, and legal if sensitive data is involved. Avoid broad company-wide notifications until you have scope and probable impact.

Evidence limits: initial notice should include only verifiable facts: time of detection, systems affected, current containment actions, and next check-in time. Do not speculate about root cause or long-term impact in the first message.

Practical sequence: 1) Send a concise incident stub with time, scope, and owner; 2) Attach the captured sample headers/bounces and a link to where logs are stored; 3) Schedule a 30-minute incident call with required roles.

## Capture: minimal evidence collection that preserves context

Decision boundary: collect evidence that proves the event and supports later diagnosis without overloading storage or exposing PII. Prioritize headers, SMTP transcripts, bounce codes, and provider throttle/error messages. Do not run large-scale log exports that could delay containment actions.

Evidence limits: retain raw headers for 10–50 representative messages across affected domains/IPs, the exact API requests that initiated problematic sends (payload and response), and provider console error screenshots or export snippets. Record retention locations and access controls so investigators can retrieve full logs later.

Practical sequence: 1) Pull 10–50 sample raw message headers split across affected deliverability paths; 2) Export API call logs for the last hour for the sending application; 3) Snapshot provider error pages or status messages (screenshots with timestamps).

## Assign and handoff: single owner and early runbook links

Decision boundary: designate a single incident owner (COO-style commander) within the first 5 minutes who can approve containment actions and contact external parties if needed. The owner coordinates triage, containment, and stakeholder communications and is responsible for declaring the incident severity according to an existing severity rubric.

Evidence limits: the owner should not be the only person with access to evidence; ensure at least one backup has access to logs and provider consoles. Link the incident to the appropriate root-cause runbook (e.g., IP block, domain reputation, complaint surge) so the triage team knows which diagnostic path to follow next.

Practical sequence: 1) Assign owner and backup; 2) Owner declares preliminary severity and assigns roles (network, deliverability, product, CS, legal); 3) Owner posts links to severity rubric and the candidate root-cause runbooks for the investigation team.

## Practical checklist

- [ ] Pause all scheduled sends and API-driven outgoing sends immediately.
- [ ] Disable automated resend loops, retries, and enforcement rules.
- [ ] Capture 10–50 raw message headers representing affected paths.
- [ ] Export API request/response logs for the last 60 minutes for sending apps.
- [ ] Collect three bounce messages and three complaint notifications per affected domain/IP.
- [ ] Assign a single incident owner and one backup within 5 minutes.
- [ ] Notify required roles with a concise incident stub and next check-in time.
- [ ] Snapshot provider console errors/status pages and record where evidence is stored.
- [ ] Map affected campaigns, IP pools, domains, and customer segments.

## Where RepMail fits

Use this guide as a compact containment and notification checklist in an outbound operations workflow. It defines the immediate decision boundaries and evidence to collect so a RepMail operator can stop additional sends, preserve diagnostic artifacts, and route the incident to the correct root-cause runbook or severity path without premature DNS or policy changes.

Continue with [Provider-Specific Deliverability Triage: Gmail, Microsoft, and More](/repmail/learn/deliverability/provider-specific-deliverability-triage) for the next step in the workflow.

## Related RepMail guides

- [Blocklist Delisting Request: Evidence Packet and Owner Handoff](/repmail/learn/deliverability/blocklist-delisting-evidence-packet)
- [Blocklist Listing After a Compromised Account: Containment Before Delisting](/repmail/learn/deliverability/compromised-account-blocklist-containment)


## Sources

[1]: https://www.litmus.com/blog/how-to-fix-email-reputation "Supporting technical or operational reference"
[2]: https://support.microsoft.com/en-us/outlook/sender-support-in-outlook-com "Microsoft documentation"
