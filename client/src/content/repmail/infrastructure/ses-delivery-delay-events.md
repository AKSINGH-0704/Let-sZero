---
product: repmail
academy: infrastructure
contentType: guide
slug: ses-delivery-delay-events
title: "SES Delivery Delay Events: When a Soft Failure Is Not a Bounce"
description: "SES Delivery Delay Events: When a Soft Failure Is Not a Bounce — Operators treating temporary delivery delays as permanent bounces."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["infrastructure","ses","bounce","email","delivery","delay","events"]
assets:
  - type: table
    title: "DeliveryDelay decision/diagnostic table"
    content:
      headers: ["Observed signal","Immediate meaning","Action (0–72h)","Terminal evidence required"]
      rows:
        - ["DeliveryDelay event only","Temporary failure noted; SES will retry","Place address in short hold (24–72h); do not suppress","Delivery or Bounce/Complaint event"]
        - ["Delivery event after DeliveryDelay","Message delivered successfully","Clear hold, resume normal sends","Delivery event timestamp"]
        - ["Bounce event after DeliveryDelay (5.x.x)","Permanent failure indicated","Apply suppression per policy immediately","Bounce event with 5.x.x or explicit permanent status"]
        - ["Bounce event after DeliveryDelay (4.x.x)","Bounce declared but categorized as temporary","Consider temporary suppression or retry policy; inspect improved delivery attempts","Bounce event and SMTP code indicating 4.x.x"]
        - ["No follow-up event within hold window","Unresolved transient state","Apply policy: either resume sends or escalate to manual review","Expiration of hold window (policy-defined)"]
featured: false
collections: ["email-infrastructure-decisions"]
learningPaths: ["email-infrastructure"]
keyTakeaways:
  - "Operators treating temporary delivery delays as permanent bounces"
  - "Explicit SES DeliveryDelay semantics, distinct from generic bounce handling"
  - "Link from SES events and retry pages"
commonMistakes:
  - "Skipping this check: Do not add recipients to permanent suppression on receipt of a DeliveryDelay event alone."
  - "Skipping this check: Enable SES event publishing (CloudWatch/EventBridge/SNS) to capture DeliveryDelay and follow-up events [1]."
  - "Skipping this check: Log SMTP reply codes and enhanced status codes where available; map 4.x.x vs 5.x.x to retryable vs permanent actions [2]."
faqs:
  - question: "Can I treat DeliveryDelay as a bounce to avoid duplicate sends?"
    answer: "No. Treating DeliveryDelay as a bounce risks premature suppression and lost recipients. Use a short hold window to prevent duplicate or excessive sends while waiting for a terminal event (Delivery/Bounce/Complaint). If you need to avoid duplicates immediately, deduplicate at the send-queue level rather than suppressing addresses."
  - question: "If SES doesn’t provide SMTP codes in DeliveryDelay, how should I decide?"
    answer: "If codes are missing, rely on temporal evidence and your hold policy: tag the address as transient and wait for a follow-up event or the hold window to expire. Consider enabling more detailed logging or event publishing for richer data if your workflow requires immediate classification [1]."
  - question: "How long should the hold window be?"
    answer: "There is no one-size-fits-all interval; common practice is 24–72 hours. Choose a window that balances business urgency and risk of premature suppression, then tune it based on observed rates of DeliveryDelay resolving to Delivery versus Bounce. State your uncertainty: exact optimal timing depends on your sending cadence, recipient importance, and observed SES retry behavior."
nextStep:
  label: "Continue with Amazon SES Account-Level Suppression: How to Use It"
  href: "/repmail/learn/infrastructure/aws-ses-account-level-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

SES DeliveryDelay events indicate temporary delivery problems that SES treated as transient and will retry; they are not SMTP permanent bounces and should not be used alone to suppress recipients. Operators should classify DeliveryDelay events as retryable, collect correlated events (final Delivery, Bounce, or Complaint), and apply suppression only after observing a terminal failure or policy-confirmed bounce.

## What a DeliveryDelay event means and its decision boundary

An SES DeliveryDelay event marks a temporary failure in delivering a message to a destination mail server; SES records the condition, continues internal retries, and may later produce a Delivery or Bounce event. This event is an intermediate signal — it communicates a retryable state rather than a terminal SMTP 5xx permanent bounce. Operators must treat this as a transient condition unless a subsequent terminal event is observed.

Decision boundary: do not suppress or mark an address as undeliverable solely on DeliveryDelay. Instead, treat DeliveryDelay like a retry-state flag and wait for a terminal event (Bounce/Complaint) or a defined policy timeout. This aligns with AWS event semantics and common SMTP retry practice [1].

## Evidence you should collect before taking permanent action

Before suppressing or removing an address, collect the following correlated evidence: the final SES event (Delivery or Bounce), SMTP response codes when available, timestamped retry counts, and any Complaint events. These pieces show whether the transient condition resolved or escalated to a permanent failure.

Limitations: SES DeliveryDelay does not always include full SMTP verbatim responses or final status codes in the event payload; you may need to enable additional logging or event publishing to capture more detail. RFC 3463 provides the conceptual mapping of enhanced status codes but SES event payloads and your logging may vary [2].

## Practical sequence for handling DeliveryDelay events

1) On DeliveryDelay, increment a transient-failure counter for the recipient and place the address into a short hold state (e.g., 24–72 hours) rather than immediate suppression. 2) Monitor for a terminal event: if a Bounce or Complaint follows within your hold window, apply suppression based on your existing bounce policy. 3) If a Delivery event follows, clear the transient state and resume normal sending.

Stop conditions: end the hold early if you observe a definitive terminal bounce or complaint; expire the hold and resume sends after your policy timeout if only DeliveryDelay events were seen and no terminal event materialized.

## How to use SMTP code and SES event fields to decide

When an SES event includes SMTP reply codes or enhanced status codes, use them to escalate: a 5.x.x SMTP response (or enhanced status code beginning with 5) indicates a permanent failure and justifies suppression after confirming the Bounce event. A 4.x.x or enhanced 4.x.x signifies a temporary failure and should be treated as retryable.

Evidence limits: SES DeliveryDelay sometimes lacks explicit SMTP codes. If codes are missing, rely on the temporal pattern (retries and final event) and your hold window rather than inferring permanence from the DeliveryDelay alone.

## Operational roles, monitoring, and automation recommendations

Assign a delivery-owner (engineer or ops) to maintain the DeliveryDelay policy and to tune hold windows based on observed retry-to-terminal event ratios. Instrument dashboards to show counts of DeliveryDelay → Delivery, DeliveryDelay → Bounce, and DeliveryDelay with no follow-up within the policy window.

Automation: implement an event consumer that tags addresses on DeliveryDelay, triggers follow-up checks, and only writes to suppression lists when you receive a Bounce/Complaint or when the hold window expires with a configured decision. Keep manual override options for critical recipients.

## Practical checklist

- [ ] Do not add recipients to permanent suppression on receipt of a DeliveryDelay event alone.
- [ ] Enable SES event publishing (CloudWatch/EventBridge/SNS) to capture DeliveryDelay and follow-up events [1].
- [ ] Log SMTP reply codes and enhanced status codes where available; map 4.x.x vs 5.x.x to retryable vs permanent actions [2].
- [ ] Create a 24–72 hour hold state for recipients with DeliveryDelay instead of immediate suppression.
- [ ] Monitor and dashboard the outcome ratios: DeliveryDelay→Delivery, DeliveryDelay→Bounce, DeliveryDelay→no-follow-up.
- [ ] Only write to suppression lists after receiving a Bounce or Complaint or after a documented policy timeout.
- [ ] Provide manual review or white-listing for high-value recipients during the hold period.
- [ ] Instrument retry counters and timestamps to determine whether the SES retry process completed.
- [ ] Periodically review and tune the hold window based on observed outcomes and business impact.

## Where RepMail fits

Use this guide as a decision aid when wiring outbound automation: implement the short hold and verification flow described here in your event consumer and suppression logic to prevent premature removals. RepMail users can copy the checklist and diagnostic table into their outbound workflows to ensure DeliveryDelay is treated as a transient signal and only terminal events drive permanent suppression.

Continue with [Amazon SES Account-Level Suppression: How to Use It](/repmail/learn/infrastructure/aws-ses-account-level-suppression) for the next step in the workflow.

## Related RepMail guides

- [AWS SES API v2 Formatted vs Raw Email: A Practical Boundary](/repmail/learn/infrastructure/aws-ses-api-v2-formatted-vs-raw)
- [AWS SES Configuration Sets: Tags, Destinations, and Routing](/repmail/learn/infrastructure/aws-ses-configuration-sets-routing)


## Sources

[1]: https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html "Amazon SES developer documentation"
[2]: https://datatracker.ietf.org/doc/html/rfc3463 "IETF RFC reference"
