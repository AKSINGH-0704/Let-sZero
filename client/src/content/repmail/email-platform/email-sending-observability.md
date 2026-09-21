---
product: repmail
academy: email-platform
contentType: engineering-article
slug: email-sending-observability
title: "Email-Sending Observability: What to Track"
description: "Instrument email from enqueue to provider feedback. Track identifiers, states, retries, bounces, complaints, and suppressions—not just sends."
authorSlug: repmail-team
publishedAt: "2026-09-21"
tags: ["email-platform", "observability", "ses", "bounces", "complaints", "deliverability"]
keyTakeaways:
  - "A send request is an input event, not proof of delivery or inbox placement."
  - "Correlate internal records with the provider message ID and retain the event timeline."
  - "Operational alerts should distinguish temporary delay, permanent failure, complaint, and suppression."
prerequisites:
  - label: "Read about SMTP outcomes"
    href: "/repmail/learn/infrastructure/what-is-smtp"
  - label: "Understand hard and soft bounces"
    href: "/repmail/learn/deliverability/hard-vs-soft-bounces"
commonMistakes:
  - "Calling every accepted API request a delivered email."
  - "Overwriting the latest status and discarding the event history needed for diagnosis."
  - "Counting opens as ground truth without considering client behavior and privacy protections."
faqs:
  - question: "What should email observability track first?"
    answer: "Track the internal message ID, recipient, campaign or trigger, submission timestamp, provider message ID, provider response, delivery or failure events, retry attempts, and suppression decisions. Add content and identity metadata only when it is safe and useful."
  - question: "What is the difference between send and delivery?"
    answer: "A send event means the provider accepted the request and will attempt delivery. A delivery event means the provider reports successful handoff to the recipient's mail server. Neither event proves inbox placement or that a person read the message."
  - question: "Why correlate SES message IDs?"
    answer: "The provider's message ID links a submission to later delivery, bounce, complaint, or delay events. Without that key, an event stream is difficult to reconcile with the campaign or application record that caused the send."
nextStep:
  label: "Choose the right email platform"
  href: "/repmail/learn/email-platform/email-sending-platform-selection"
  description: "Observability is a selection criterion: ask every platform to demonstrate a traceable message lifecycle."
assets:
  - type: checklist
    title: "Email-sending observability checklist"
    content:
      - "Generate an internal message ID before submission and store the campaign or application trigger."
      - "Persist the provider message ID and the exact submission response."
      - "Record send, delivery, bounce, complaint, rejection, delay, and suppression events with timestamps."
      - "Make event handling idempotent so duplicate notifications do not duplicate state changes."
      - "Keep a searchable timeline from recipient to campaign, identity, provider, and final state."
      - "Alert on actionable failures and inspect trends by sending stream, domain, and campaign."
---
**Email-sending observability means being able to explain one message's lifecycle**, not merely displaying a send count. Record an internal message ID before submission, store the provider's identifier and response, ingest later events, and preserve the timeline. Then distinguish temporary delivery delay from permanent bounce, complaint, rejection, or suppression. A “sent” label without those distinctions is an incomplete operational record.

## Model the lifecycle as events

A useful minimum timeline is:

1. **Enqueued:** the application or campaign created work for a recipient.
2. **Submitted:** the sending service accepted the request from your system.
3. **Provider accepted:** the provider returned an identifier and will attempt delivery.
4. **Delivery outcome:** the provider reported delivery, delay, rejection, or bounce.
5. **Recipient feedback:** a complaint, unsubscribe, or other feedback changed future eligibility.
6. **Suppressed:** policy prevented a later send to that address.

The names vary by provider. The distinction is what matters. AWS SES describes a send event as a successful send request that SES will attempt to deliver. A delivery event means SES successfully delivered the email to the recipient's mail server. A bounce, complaint, rejection, or delivery delay is a different operational fact. None of these events proves inbox placement, and an open event is not a substitute for delivery evidence.

## Correlate every event

Create an internal message record before calling the provider. At minimum, retain the recipient address in its controlled data context, campaign or application trigger, sending identity, creation time, attempt count, current state, and a provider message ID when one exists. Keep the provider response that explains whether submission succeeded or failed.

Use the provider message ID as the join key for later events. If the system sends a follow-up, give that message its own record rather than treating the whole sequence as one send. If an event can be delivered twice, make the handler idempotent: processing the same event again should not create a second suppression or move a terminal record backward.

Do not overwrite the only copy of the event history with a new status. A current status is useful for queues and screens; the append-only event trail is what helps an operator reconstruct the incident.

## Track the signals that change action

**Submission and provider response** answer whether your system successfully handed work to the delivery provider. **Delivery and delay** answer what the provider reports about the recipient's mail server. **Bounce** may require suppression, depending on the type and provider guidance. **Complaint** is a recipient signal that should change future eligibility. **Rejection** can indicate the provider refused to attempt delivery. **Suppression** is your policy outcome: the system will not send to that address until an explicit, controlled action changes the rule.

For campaign operations, group events by sending identity, campaign, recipient domain, and message type. This helps distinguish a single bad address from a broader authentication or reputation problem. Use alerts for actionable conditions such as an event-consumer failure, a growing queue of unprocessed feedback, or a campaign that has been paused by its safety policy. Avoid inventing a universal threshold; interpret rates in the context of the stream, provider, and recipient mix.

## Do not over-trust engagement metrics

Opens and clicks can be useful directional signals, but they are not equivalent to a human reading or valuing a message. Client behavior, image loading, privacy features, link rewriting, and security scanners can affect those events. Treat delivery, bounce, complaint, unsubscribe, and reply signals as separate categories with separate decisions. A high open count cannot repair a broken suppression process.

## A practical implementation review

Run a test message through a non-production path and answer six questions: Can an operator find it by internal ID? Can they see the provider ID? Is the exact submission response retained? Where do delayed or failed events arrive? What prevents a duplicate event from duplicating an action? Can the system show why a later send was skipped?

Then test a failure path. Send to a controlled address that produces a known provider event, observe the event consumer, and verify that the final state and suppression decision are both visible. Also test a consumer outage or malformed event. A monitoring system that only works when every dependency is healthy is not observable enough.

## Where RepMail fits

RepMail's current sending path uses AWS SES and records the SES message ID on campaign-email records. Its server includes AWS SNS event handling for bounce and complaint feedback, suppression records, event deduplication, and campaign-email status fields. That architecture gives the workflow a concrete correlation path: campaign record to SES identifier to feedback event to suppression or status action. It does not promise inbox placement, and the observability model should still be read as operational evidence rather than a deliverability guarantee. Compare the implementation boundary with [raw SES versus a sending platform](/repmail/learn/email-platform/raw-ses-vs-sending-platform).

## Sources

- [Amazon SES event publishing and event types](https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html)
- [Amazon SES working with event data](https://docs.aws.amazon.com/ses/latest/dg/working-with-event-data.html)
- [Amazon SES email metrics FAQ](https://docs.aws.amazon.com/ses/latest/dg/faqs-metrics.html)
- [Gmail email sender guidelines](https://support.google.com/mail/answer/81126?hl=en)

Observability is complete when a team can explain what happened, decide what to do next, and prove that the decision affected future sends.

[1]: https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html "Monitor email sending using Amazon SES event publishing"
[2]: https://docs.aws.amazon.com/ses/latest/dg/working-with-event-data.html "Working with Amazon SES event data"
[3]: https://docs.aws.amazon.com/ses/latest/dg/faqs-metrics.html "Amazon SES email sending metrics FAQs"
[4]: https://support.google.com/mail/answer/81126?hl=en "Email sender guidelines"
