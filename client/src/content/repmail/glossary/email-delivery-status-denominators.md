---
product: repmail
academy: glossary
contentType: knowledge-base
slug: email-delivery-status-denominators
title: "Delivered, Accepted, Deferred, and Bounced: Denominator Rules"
description: "Delivered, Accepted, Deferred, and Bounced: Denominator Rules — Operators use delivery, acceptance, and bounce as interchangeable outcomes."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["glossary","deliverability","email","measurement","delivered","accepted","deferred"]
assets:
  - type: table
    title: "Decision/diagnostic table: mapping observed SMTP states to reporting actions"
    content:
      headers: ["Observed evidence","Interpretation","Immediate action","Owner"]
      rows:
        - ["250/2xx acceptance (SMTP)","Message accepted by remote MTA; no mailbox event","Count as accepted; await DSN to mark delivered; tag for reconciliation","Outbound engineering/ops"]
        - ["4xx transient SMTP (deferred)","Temporary failure; sender will retry","Monitor retry queue; escalate if retries exceed threshold or time window","Deliverability owner/ops"]
        - ["5xx final SMTP (bounce)","Permanent failure; final non-delivery","Mark as bounced; notify downstream systems and update suppression lists as needed","Support/ops"]
        - ["Explicit mailbox DSN or mailbox-event API confirming store","Confirmed mailbox delivery","Count as delivered; use for CRM inbox metrics (label source)","Analytics / CRM owner"]
        - ["No mailbox evidence but accepted by SMTP","Evidence gap","Report accepted-rate; flag delivered-rate as unavailable; request provider tracing","Reporting owner"]
        - ["Vendor reports 'delivered' without supporting DSN","Unverified delivered claim","Require vendor to map their 'delivered' metric to your canonical denominator or provide raw events; treat as untrusted until validated","Vendor manager"]
featured: false
collections: ["core-email-glossary"]
learningPaths: []
keyTakeaways:
  - "Operators use delivery, acceptance, and bounce as interchangeable outcomes."
  - "A focused task with a separate troubleshooting, implementation, decision, or reference job from the current corpus."
  - "Link from all reporting and triage pages."
commonMistakes:
  - "Skipping this check: Decide and document the canonical denominator for each report (accepted, mailbox-delivered, or final-bounced)."
  - "Skipping this check: Ensure SMTP transaction logs capture reply codes and are retained long enough for reconciliation."
  - "Skipping this check: Map vendor metrics into your canonical denominator and document transformation rules."
faqs:
  - question: "Can I treat SMTP acceptance as equivalent to delivery for all operational reporting?"
    answer: "No. SMTP acceptance only proves the remote MTA accepted responsibility; it does not prove the message reached a recipient mailbox. Use acceptance for infrastructure and pipeline health KPIs, but only use ‘delivered’ in customer-facing CRM or inbox-quality reports when you have explicit mailbox events or provider DSNs."
  - question: "If a vendor reports a higher delivered rate than my accepted rate, who is right?"
    answer: "Different denominators or scope explain most discrepancies. First verify each side’s denominator and mapping rules. If the vendor claims mailbox delivery, ask for the raw DSNs or mailbox-store events; if they cannot provide them, treat their delivered metric as a differently defined measure and do not equate it to your accepted-rate."
  - question: "How should I report deferred messages in dashboards?"
    answer: "Report deferred as a transient state with counts and age distribution, but ensure final outcomes are reconciled. Include metrics for retry count and time-to-final. If many deferred messages never resolve, escalate to deliverability triage; deferred should not be treated as success or permanent failure until final status is known."
nextStep:
  label: "Continue with ARC (Authenticated Received Chain)"
  href: "/repmail/learn/glossary/arc"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Delivered, Accepted, Deferred, and Bounced are different measurement denominators and must not be used interchangeably. Define each term explicitly, pick one canonical denominator for a report or KPI, and record the decision with its data sources and stop conditions so teams avoid contradictory comparisons and bad vendor metrics.

## Precise definitions and decision boundary

Accepted: The remote SMTP server responded with a 2xx final response to the SMTP DATA/termination sequence, indicating the server has taken responsibility for further disposition. This is an SMTP-layer event and the canonical source is your SMTP transaction logs or the sending MTA’s acceptance reports; RFC 5321 describes the SMTP reply model [1]. Delivered: Often used loosely; treat as “delivered to the recipient’s mailbox” only when you have mailbox-level evidence (e.g., DSN from the recipient system explicitly stating local delivery, or provider API/mailbox events that indicate store-and-forward to a user mailbox). Deferred: A temporary non‑final 4xx response from the remote server or sustained delivery retries after a transient failure; it is a sender-side state until final success or bounce. Bounced (hard/soft): A final non‑delivery (5xx) notification returned to the sender, or an explicit DSN with a permanent failure code. Decision boundary: choose whether your KPI measures SMTP acceptance, mailbox delivery, or final loss and apply it consistently across reports and vendors.

## Why these distinctions matter for KPIs and vendor comparison

Different vendors and MTAs report different denominators (some show ‘accepted’, others ‘delivered’) which will produce non-comparable rates if you mix them. If one vendor reports 99% accepted and another reports 92% delivered, that could be consistent if mailbox delivery is stricter than SMTP acceptance — but mixing them without annotation produces misleading KPIs. Evidence limits: acceptance is verifiable from SMTP logs; mailbox delivery usually requires recipient-provider confirmation or downstream mailbox events which many vendors cannot reliably provide. Practical sequence: select a primary denominator (recommended: SMTP accepted for infrastructure monitoring; mailbox-delivered for CRM quality metrics when you have mailbox events), record it in your reporting spec, and map vendor metrics into that canonical denominator where possible.

## Implementing denominators in reporting pipelines

Instrument: capture SMTP server replies for every outbound transaction and tag each message with status (2xx accepted, 4xx deferred, 5xx bounced). Store retry attempts and final outcome. Enrichment: where available, ingest recipient-side DSNs, mailbox events, or provider webhooks to promote an accepted message to mailbox-delivered. Aggregation rules: compute rates using one fixed denominator per report (e.g., attempts = total messages submitted; accepted-rate = accepted/attempts; delivered-rate = delivered/attempts). Stop condition: if you cannot reliably map provider webhooks to messages, do not report ‘delivered’ — fall back to ‘accepted’ and label reports accordingly.

## Troubleshooting and triage decision flow

Start with the canonical SMT P transaction record: a 2xx response means acceptance; if you have subsequent bounce DSN, reconcile as final bounce. If messages are stuck in deferred state, inspect SMTP response codes, remote server throttling headers, and retry scheduling—deferred is a sender-side state until final. Use the following practical sequence: 1) Validate logging and message IDs map to webhooks/DSNs; 2) Confirm whether the remote MTA gave a final 2xx, 4xx, or 5xx; 3) If you expect mailbox events but do not see them, request provider evidence (webhooks, DSN) and treat absence as an evidence gap rather than proof of delivery. Evidence limits: not all mailbox providers expose definitive “delivered-to-mailbox” events; this is a provider-dependent capability.

## Examples (clearly labeled)

Example — SMTP acceptance vs mailbox delivery: A sending MTA gets 250 2.0.0 Ok from the recipient MTA — mark accepted. Later the recipient MTA discards the message or classifies it as spam and never stores to the user mailbox; without a mailbox DSN you cannot claim delivered. Example — deferred then bounced: An outbound message receives 421 4.7.0 TLS required from a gateway and is retried; after multiple retries, recipient MTA returns 550 5.1.1 User unknown — final bounce. The message transitioned from deferred to bounced; your reporting should record both states but only one final outcome per message.

## Practical checklist

- [ ] Decide and document the canonical denominator for each report (accepted, mailbox-delivered, or final-bounced).
- [ ] Ensure SMTP transaction logs capture reply codes and are retained long enough for reconciliation.
- [ ] Map vendor metrics into your canonical denominator and document transformation rules.
- [ ] Ingest and correlate DSNs/webhooks/recipient-provider events when available to promote accepted→delivered.
- [ ] Label every KPI and dashboard with the denominator definition and data sources.
- [ ] Implement a reconciliation job that compares SMTP acceptance to DSN/mailbox events and surfaces gaps.
- [ ] For deferred messages, record retry attempts, retry schedule, and last SMTP response for triage.
- [ ] Avoid mixing vendor-reported ‘delivered’ with your SMTP-accepted counts unless you have provable mapping.
- [ ] Create stop conditions: if mailbox events are missing for more than X% of messages, pause delivered-rate reporting and switch to accepted-rate.

## Where RepMail fits

Use this guide as a compact checklist and decision aid in outbound workflows and reporting governance. It can be used to standardize the denominator choice across monitoring, vendor comparisons, and SLA definitions, and to define the reconciliation steps engineers and analysts must run before publishing delivery KPIs.

Continue with [ARC (Authenticated Received Chain)](/repmail/learn/glossary/arc) for the next step in the workflow.

## Related RepMail guides

- [Delivery Latency: Measuring Time to Recipient Acceptance](/repmail/learn/glossary/email-delivery-latency)
- [Authentication-Results Header: Reading Receiver Assertions](/repmail/learn/glossary/authentication-results-header)


## Sources

[1]: https://www.rfc-editor.org/rfc/rfc5321 "IETF RFC reference"
[2]: https://www.infobip.com/docs/reporting/metrics-reference/email-metrics-reference "Supporting technical or operational reference"
