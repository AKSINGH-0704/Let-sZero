---
contentType: guide
slug: aws-ses-bounce-complaint-notifications
title: "Amazon SES Bounce and Complaint Notifications Explained"
description: "Configure Amazon SES events for bounces and complaints, route them to a consumer, and turn each event into a safe suppression action."
authorSlug: repmail-team
publishedAt: "2026-09-21"
tags: ["amazon-ses", "bounces", "complaints", "deliverability"]
keyTakeaways:
  - "A send response confirms submission to SES; it does not replace downstream bounce and complaint events."
  - "Choose an event-publishing path, preserve the message and recipient identifiers, and make suppression idempotent."
  - "Use events to stop future mail, not to claim that every delivery problem has one universal cause."
prerequisites:
  - label: "Read about hard and soft bounces"
    href: "/repmail/learn/deliverability/hard-vs-soft-bounces"
  - label: "Understand SES production access"
    href: "/repmail/learn/infrastructure/aws-ses-sandbox-to-production"
commonMistakes:
  - "Assuming the SES SendEmail success response means the message reached the inbox."
  - "Treating a temporary delivery failure as a permanent suppression without reviewing the event."
  - "Routing events to a topic or stream without an authenticated consumer and replay plan."
faqs:
  - question: "What should happen after an SES hard bounce?"
    answer: "Classify the event, record the recipient and message identifiers, and suppress the address from future sends unless you have a documented reason to review it. The exact action should follow your sending policy and the event details."
  - question: "Are bounces and complaints the same event?"
    answer: "No. A bounce is a delivery failure reported by mail infrastructure. A complaint is a recipient or mailbox-provider abuse signal. Both require attention, but the response and investigation are not identical."
  - question: "Can I use SNS for SES notifications?"
    answer: "AWS documents Amazon SNS as one notification and event-destination option. The correct choice depends on the SES feature and event types you configure; verify the current AWS setup for your Region and integration."
nextStep:
  label: "Use the SES account-level suppression list"
  href: "/repmail/learn/infrastructure/aws-ses-account-level-suppression"
  description: "Events become protection only when suppression is consistent across sending paths."
assets:
  - type: table
    title: SES event handling worksheet
    content:
      headers: ["Stage", "Record", "Action"]
      rows:
        - ["Publish", "Event type, timestamp, message ID", "Send to an authenticated consumer"]
        - ["Classify", "Recipient, diagnostic, feedback type", "Separate temporary failure, bounce, and complaint"]
        - ["Protect", "Normalized address and reason", "Upsert suppression idempotently"]
        - ["Review", "Source, campaign, and retry history", "Investigate patterns before resuming"]
---

**Amazon SES bounce and complaint notifications are the feedback loop after submission.** A successful `SendEmail` or SMTP response means SES accepted the request for processing; it does not prove delivery or inbox placement. Configure an event path, retain enough identifiers to reconcile the event, and make the resulting suppression action safe to repeat.

## Separate submission from outcome

Your sender has two moments that are easy to conflate. First, SES accepts or rejects the API or SMTP request. That response is useful for diagnosing credentials, syntax, throttling, and request-level errors. Later, the recipient’s mail system can report a delivery failure, or a mailbox provider can send a complaint signal. Those later events are what protect the next send.

AWS supports SES event publishing through configuration sets and destinations, including services such as Amazon SNS. The exact menu and destination choices can change, so start with the current AWS documentation for [monitoring events with Amazon SES](/repmail/learn/infrastructure/email-infrastructure-explained) and verify the feature available in your Region. The important design decision is not “which queue is fashionable”; it is whether every relevant send carries enough context to be tied back to a recipient, campaign, and message.

## Build the event path deliberately

A dependable path has four boundaries. At publish time, SES emits the event to the destination you configured. At ingest time, an authenticated consumer validates the payload and records the raw event or a durable copy. At classification time, your application distinguishes bounce, complaint, delivery, and transient signals instead of flattening them into “failed.” At protection time, it upserts a suppression record keyed by a normalized recipient address and reason.

Keep the SES message identifier, recipient, event type, timestamp, diagnostic information, and campaign or send identifier when available. Do not use a display name or a subject line as the primary key. Events can be retried or delivered more than once, so an upsert is safer than “insert and hope.” A duplicate complaint should not create duplicate work or send the recipient back into an eligible state.

A hard bounce usually means the address or destination cannot accept the message as sent. A temporary failure may succeed later, so it needs a retry policy and an observation window rather than an automatic permanent conclusion. A complaint is a reputation warning even if the original message was technically accepted. The right suppression duration and review path are policy decisions; document them rather than inventing a universal threshold.

## Test the complete loop

Use SES’s mailbox simulator where it is appropriate for controlled bounce and complaint testing, then test your own consumer with a representative event payload. Confirm that the event is visible, the recipient is matched to the right contact, the suppression is written once, and a subsequent send path checks suppression before submission. Also test a malformed or delayed event: the system should fail closed for the affected send rather than silently declaring the recipient safe.

Keep event retention separate from contact eligibility. An event is evidence of what happened; a suppression record is an operational decision. That distinction makes later investigation possible and prevents a data import from overwriting a safety decision. Review [hard versus soft bounces](/repmail/learn/deliverability/hard-vs-soft-bounces) when a team is unsure whether a failure should be retried.

## Make the runbook observable

Give the event consumer an owner and a visible health check. Record when the last event was received, how many events are waiting, and whether the consumer can reach its destination. A quiet stream is not automatically good news: it may mean no one has sent mail, or it may mean publishing is broken. Pair the event log with a controlled test and an alert for processing failures, while keeping any alert threshold specific to your own traffic and service-level needs rather than treating it as an industry limit.

## Where RepMail fits

RepMail’s relevance is the boundary between campaign execution and delivery feedback. If RepMail is the sending surface, operators should be able to understand which recipients are suppressed and why rather than treating a campaign dashboard as a substitute for SES events. If you operate another SES-backed sender, apply the same test: a contact should become ineligible based on the event path, not on a manual spreadsheet updated after the campaign.

## Sources

- [AWS: Monitoring your Amazon SES sending activity](https://docs.aws.amazon.com/ses/latest/dg/monitor-sending-activity.html)
- [AWS: Amazon SES event publishing](https://docs.aws.amazon.com/ses/latest/dg/using-event-publishing.html)
- [AWS: Amazon SES notifications through Amazon SNS](https://docs.aws.amazon.com/ses/latest/dg/monitor-sending-activity-using-notifications.html)
- [AWS: Using the Amazon SES mailbox simulator](https://docs.aws.amazon.com/ses/latest/dg/send-email-simulator.html)
