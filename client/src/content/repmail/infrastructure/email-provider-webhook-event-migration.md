---
product: repmail
academy: infrastructure
contentType: engineering-article
slug: email-provider-webhook-event-migration
title: "Email Provider Webhook Event Schema Migration"
description: "Map provider event contracts before a cutover: statuses, identifiers, signatures, retries, idempotency, replay, and fixtures."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["webhooks", "migration", "events"]
collections: ["email-infrastructure-decisions", "email-platform-essentials"]
learningPaths: ["email-infrastructure"]

keyTakeaways:
  - "Map semantics, not only field names, between old and new event contracts."
  - "Test duplicate, delayed, reordered, and invalid events before switching consumers."
  - "Keep raw evidence and a replay path during the migration window."
faqs:
  - question: "Should we map event names one-to-one?"
    answer: "No. Map semantic states and preserve provider-specific values. One provider’s “delivered” or “processed” may not mean the same thing as another’s."
  - question: "How do we handle duplicate webhooks?"
    answer: "Use an idempotency key based on a verified event or provider identifier, store processing state, and test retries and reordered delivery."
  - question: "What fixtures are required?"
    answer: "At minimum, accepted, delivered, transient failure, bounce, complaint, suppression, invalid signature, duplicate, delayed, and malformed payloads."
nextStep:
  label: "Review email sending observability"
  href: /repmail/learn/email-platform/email-sending-observability
  description: "Continue with the closest operational guide."
assets:
  - type: table
    title: Provider event mapping table
    content:
      headers: ["Concept", "Old event", "New event", "Normalization / test"]
      rows:
        - ["Message identifier", "", "", ""]
        - ["Accepted / delivered", "", "", ""]
        - ["Bounce / complaint", "", "", ""]
        - ["Retry / transient failure", "", "", ""]
        - ["Signature and timestamp", "", "", ""]

---

A provider webhook migration can break suppression, analytics, or retries even while messages continue to send. Treat the webhook as a data contract. Map event meaning, identifiers, timestamps, signatures, retry behavior, and ordering before changing consumers. Use provider documentation and real fixtures; never invent fields.

## Inventory the old contract

Capture every event type, required and optional field, identifier semantics, timestamp format, authentication method, retry schedule, and delivery acknowledgment. Trace how each event changes application state. The [sending observability guide](/repmail/learn/email-platform/email-sending-observability) helps identify the states that must remain observable.

Request or generate sanitized fixtures for accepted, delivered, deferred, bounced, complained, suppressed, and malformed events. Record duplicate and out-of-order behavior. A field named `id` may identify a message, event, or delivery attempt; confirm its meaning before mapping it.

## Build a provider-neutral model

Define a canonical internal event with message ID, recipient or privacy-safe key, provider ID, event type, occurred-at time, received-at time, attempt, source, raw payload reference, and verification status. Preserve raw payloads with access controls. Normalize only what the application truly needs, and retain the provider-specific values for investigation.

Test signature verification, idempotency, replay, dead-letter handling, and retry acknowledgment. Run the new adapter in shadow mode if possible. Compare state transitions between old and new consumers without sending duplicate mail. Use the platform migration runbook for the wider cutover sequence.

## Switch with a rollback

Version the consumer and event schema. Define the cutover timestamp, dual-write or dual-read period, monitoring owner, and rollback trigger. After switching, compare event counts and state transitions by cohort. If events fail verification or suppression updates stop, route to the old adapter or a safe queue, preserve raw events, and investigate before replaying.

## Related resources

The [Email Infrastructure academy](/repmail/learn/infrastructure/email-infrastructure-explained) covers the systems around the event contract.

This workflow should be checked against the cited standards and current provider documentation [1].

## Cutover edge cases

Plan for events that arrive during the dual-read window, events signed with an old secret, and provider retries after the consumer has acknowledged a request. Make the cutover timestamp and replay boundary explicit. If a provider cannot replay historical events, retain the raw fixtures and application state needed to reconcile the gap without inventing a delivery result.

## References

[1]: https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html "Amazon SES event publishing"
[2]: https://www.rfc-editor.org/rfc/rfc5321 "RFC 5321: Simple Mail Transfer Protocol"

