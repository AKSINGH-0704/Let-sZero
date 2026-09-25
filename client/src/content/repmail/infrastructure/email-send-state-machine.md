---
product: repmail
academy: infrastructure
contentType: guide
slug: email-send-state-machine
title: "Email Send State Machine: Accepted, Queued, Delivered, Failed"
description: "The Email Send State Machine: Accepted, Queued, Delivered, Deferred… — Product and engineering teams conflating API acceptance with delivery."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["infrastructure","email","state","machine","accepted"]
assets:
  - type: table
    title: "Decision / Diagnostic Table: Interpreting SMTP/provider signals"
    content:
      headers: ["Observed signal","State transition","Operator action","Stop condition / next step"]
      rows:
        - ["Provider API returns 200 OK (accept)","Accepted → Queued (or remain Accepted if immediate send)","Record acceptance timestamp; schedule transport; show 'queued' to users","Wait for transport response or webhook; do not mark Delivered"]
        - ["Upstream SMTP 2xx response on RCPT/MAIL or DATA","Queued → Delivered","Record delivery event and provider response; update billing if applicable","Stop retries; surface delivered event to UX and support"]
        - ["Upstream SMTP 4xx temporary code or network timeout","Queued → Deferred","Start exponential backoff retry; log retry count and last response","Retry until max attempts/window then escalate to Failed if persistent"]
        - ["Upstream SMTP 5xx permanent rejection (or RFC3463 5.X.X permanent class)","Queued → Failed","Record failure reason; add to suppression if address is invalid","Stop retries; notify product/support for user action"]
        - ["Provider webhook 'delivery' absent but provider logs 2xx","Queued → Delivered (with evidence note)","Surface raw provider log to support and mark Delivered","Flag as directional evidence if mailbox placement unknown"]
featured: false
collections: ["email-infrastructure-decisions"]
learningPaths: ["email-infrastructure"]
keyTakeaways:
  - "Product and engineering teams conflating API acceptance with delivery"
  - "Models transport lifecycle rather than generic deliverability or event dashboards"
  - "Canonical link for all status, webhook, and failure pages"
commonMistakes:
  - "Skipping this check: Record 'Accepted' separately from 'Delivered' and expose both states via API."
  - "Skipping this check: Implement Queued state with explicit reasons (rate limit, scheduled send, batching)."
  - "Skipping this check: Parse SMTP response classes (2xx, 4xx, 5xx) and map to Delivered/Deferred/Failed; use RFC 3463 enhanced codes when available [2]."
faqs:
  - question: "Should I show \"Delivered\" immediately after the sending API returns success?"
    answer: "No. API success typically indicates the message was accepted for processing by the sending system, not that it reached the recipient or mailbox. Only mark Delivered when you have a transport-level positive response (SMTP 2xx) or a provider delivery webhook that your system trusts. If you must show immediate confirmation, label it as 'Accepted / queued for delivery' and update status when a final event arrives."
  - question: "How long should retries for Deferred messages run?"
    answer: "There is no one-size-fits-all interval—choose a retry window tied to your product needs and reputation considerations (common windows range from 24–72 hours). Use exponential backoff, a max retry count, and a policy for when to escalate to Failed and/or suppress the address. Document the policy and make it configurable per sending class or customer tier."
  - question: "Can a transport-level Delivered state guarantee inbox placement?"
    answer: "No. A transport-level acceptance (SMTP 2xx or provider delivery webhook) indicates the destination MTA accepted the message for delivery but does not guarantee inbox placement. Many providers do not provide final mailbox-placement signals; treat those cases as evidence-limited and record that Delivered in your system refers to transport acceptance, not inbox receipt [1]."
nextStep:
  label: "Continue with Amazon SES Account-Level Suppression: How to Use It"
  href: "/repmail/learn/infrastructure/aws-ses-account-level-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

API acceptance is not delivery: treat "accepted" as a transport handoff, not a guarantee of recipient receipt. This guide defines the send-state machine you should implement (Accepted → Queued → Delivered/Deferred/Failed), clarifies the decision boundaries for product UX and billing, and lists concrete checks and diagnostics teams must own.

## State model and decision boundaries

Define an explicit state machine: Accepted, Queued, Delivered, Deferred, and Failed. "Accepted" means the sending system or upstream MTA has acknowledged receipt for processing; it does not mean the message reached the target MTA or recipient mailbox. "Queued" is an internal operational state indicating the message is awaiting transport attempts (rate limits, batching, or scheduled sends). "Delivered" should map only to a confirmed transport acceptance by the destination MTAs or a positive delivery event from a provider webhook; do not use API acceptance as Delivered.

Decision boundary: mark messages billable and visible to users differently at Accepted vs Delivered. Use Accepted to confirm user intent and deduct tentative quotas if your business model requires it, but keep refunds or final billing tied to Delivered (or a time-based reconciliation) to avoid disputes. Evidence limits: not all providers surface final delivery events for mailbox placement; some only provide SMTP acceptance signals or disposition notifications [1].

## Transport sequencing and retry logic

Sequence operations: once Accepted, move to Queued if immediate transport cannot occur. Attempt transport; if the destination MTA responds with a 2xx SMTP code, move to Delivered. If you receive a temporary 4xx response or an upstream transient error, move to Deferred and schedule exponential backoff retries with a maximum retry window defined by policy (e.g., 24–72 hours depending on business needs).

Explicit stop conditions: on a 5xx permanent SMTP rejection, move to Failed and stop retries. If a provider returns an enhanced status code per RFC 3463, use the class to differentiate transient vs permanent failures where available [2]. Document and expose retry attempts and last-response metadata so product owners can see why a message is Deferred rather than Failed.

## Webhook and event mapping (evidence and limits)

Map provider webhooks to your state machine carefully. Providers may label events differently; treat webhook "accepted" as provider-acknowledgement, and require a separate "delivery" or final status to mark Delivered. If a provider only supplies SMTP response logs, parse SMTP 2xx as Delivered and 4xx as Deferred; 5xx as Failed where they represent permanent refusals. Evidence limits: some providers cannot distinguish between mailbox acceptance and final inbox placement—document that Delivered in your system means transport acceptance, not inbox placement.

Sequence for reconciliation: maintain a timeline of provider events (timestamped API accept, queue time, each transport attempt, webhook events). Use this timeline for audits, billing reconciliation, and customer support diagnostics.

## Customer UX and billing implications

Product teams should show different user-facing messages for Accepted vs Delivered. For example, show "Message queued for delivery" after Accepted and change to "Delivered" only upon a delivery event. For billing, prefer to bill on Delivered where possible; if your business requires billing at acceptance, implement a reconciliation window and automated refunds or crediting when messages fail permanently.

Operational owners: engineering should emit structured events and keep last SMTP response, retry count, and webhook trace. Support should have a clear playbook: treat Deferred messages as retriable with investigation into upstream transient errors, and treat Failed messages as customer-facing failures requiring address correction or suppression.

## Failure classification and owner actions

Classify failures into permanent (hard bounces, 5xx permanent SMTP codes, user complaints resulting in blocks) versus transient (temporary 4xx SMTP codes, network timeouts, throttling). Owners: product sets tolerances and UX; infra/ops implement retries, backoff, and suppression; support handles address validation and customer communication.

Practical sequence: on a new failure event, record the SMTP response and enhanced code if provided, update state (Deferred/Failed), increment retry counters if transient, and surface an actionable reason to support. If multiple failures for the same recipient occur within a short window, consider auto-suppressing after a configurable threshold to prevent reputation damage.

## Implementation checklist and observability

Instrument each state transition with structured logs, trace IDs, timestamps, and provider responses. Expose these fields to product, billing, and support via dashboards and APIs so stakeholders can reconcile status differences. Monitor key metrics: rate of transitions from Accepted→Delivered, Accepted→Deferred, and Accepted→Failed; retry success rate; average time in Queued; and proof windows for Delivered events.

Evidence limits again: provider capabilities differ—some will not provide final mailbox-placement signals. Make these limits transparent in your documentation and user-facing explanations. When in doubt, record and expose the raw provider responses as the source of truth for post-hoc analysis.

## Practical checklist

- [ ] Record 'Accepted' separately from 'Delivered' and expose both states via API.
- [ ] Implement Queued state with explicit reasons (rate limit, scheduled send, batching).
- [ ] Parse SMTP response classes (2xx, 4xx, 5xx) and map to Delivered/Deferred/Failed; use RFC 3463 enhanced codes when available [2].
- [ ] Use exponential backoff and a configured retry window for Deferred messages; define a max retry count and time.
- [ ] Log provider webhooks and raw SMTP responses; store timestamps and trace IDs for reconciliation.
- [ ] Differentiate billing and UX: decide whether billing occurs at Accepted or Delivered and implement reconciliation.
- [ ] Auto-suppress addresses after a configurable threshold of permanent failures; expose suppression reasons.
- [ ] Provide support with a timeline view: acceptance, queue events, each transport attempt, webhook receipts, and final state.
- [ ] Expose a metric dashboard for Accepted→Delivered rate, Avg queue time, and Deferred retry success.

## Where RepMail fits

Use this guide as a canonical operational definition and checklist when designing outbound workflows, billing rules, and support playbooks. The state machine here can serve as the authoritative link from which webhook mappings, dashboard states, and suppression logic derive, and as a decision aid during incident triage and product-reconciliation tasks.

Continue with [Amazon SES Account-Level Suppression: How to Use It](/repmail/learn/infrastructure/aws-ses-account-level-suppression) for the next step in the workflow.

## Related RepMail guides

- [ARC Chain Validation Failure: Find the First Broken Instance](/repmail/learn/infrastructure/arc-chain-first-failure)
- [Authentication Drift Detection: Compare Intended and Observed Senders](/repmail/learn/infrastructure/authentication-drift-detection)


## Sources

[1]: https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html "Amazon SES developer documentation"
[2]: https://datatracker.ietf.org/doc/html/rfc3463 "IETF RFC reference"
