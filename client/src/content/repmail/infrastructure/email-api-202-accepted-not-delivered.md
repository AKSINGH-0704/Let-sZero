---
product: repmail
academy: infrastructure
contentType: guide
slug: email-api-202-accepted-not-delivered
title: 'Email API 202 Accepted: Why It May Not Arrive'
description: An email API returning 202 Accepted confirms an asynchronous request
  was accepted—not that the message reached an inbox. Trace each handoff to find the
  failure.
authorSlug: repmail-team
publishedAt: '2026-10-25'
updatedAt: '2026-10-25'
tags:
- email API
- HTTP 202
- email delivery
- troubleshooting
- email infrastructure
collections:
- email-infrastructure-decisions
learningPaths:
- email-infrastructure
keyTakeaways:
- HTTP 202 confirms acceptance for processing, not final email delivery.
- Trace one message using its request or provider identifier and a timestamped event
  history.
- Interpret provider statuses according to that provider’s definitions; a handoff
  is not proof of inbox visibility.
- Treat missing events as unknown until correlation and provider records have been
  checked.
commonMistakes:
- Telling a recipient that an email was delivered because the API returned 202.
- Treating queueing, recipient-server handoff, delivery status, and inbox placement
  as the same state.
- Diagnosing a missing message from aggregate dashboard counts without checking status
  definitions and denominators.
- Assuming a provider’s event names or troubleshooting instructions apply identically
  to every email API.
faqs:
- question: Does HTTP 202 mean the email was sent?
  answer: Not by itself. It means the request was accepted for processing; the response
    does not establish that processing finished or that the message reached the recipient.
- question: If the provider says delivered, is the message in the inbox?
  answer: Not necessarily. Check the provider’s definition of delivered and what its
    event records. A reported handoff is not the same as confirmed inbox visibility.
- question: What should I save when troubleshooting?
  answer: Keep the request timestamp, recipient, HTTP status, response details, and
    any provider message or request ID. Use those to find the corresponding provider
    events.
nextStep:
  label: Map the email send lifecycle
  href: /repmail/learn/infrastructure/email-send-state-machine
  description: Use the send-state model to distinguish API acceptance from later processing
    and delivery outcomes.
assets:
- type: table
  title: 202 Accepted investigation timeline
  content:
    rows:
    - - Application request
      - Timestamp, recipient, endpoint
      - The application attempted to submit the message
    - - API response
      - HTTP status, response body, request or message ID
      - The API's immediate response; 202 alone is not a delivery outcome
    - - Provider event
      - Event name, timestamp, message ID, detail
      - The latest outcome reported by the provider
    - - Recipient check
      - Destination system and folders checked
      - Whether the recipient can locate the message
    rule: An empty or uncorrelated checkpoint is unknown; do not infer success or
      failure from it.
    headers:
    - Checkpoint
    - Record
    - Conclusion you can draw
---

A `202 Accepted` response means the API accepted a request for processing; it does not confirm that the email was sent, accepted by the recipient’s mail server, or delivered to an inbox. To find a missing message, trace its status across each handoff and use the provider’s event logs or message details to identify the last confirmed step. [1]

## What 202 does—and does not—tell you

HTTP 202 is an acceptance response for a request whose processing is not necessarily complete. The response alone does not provide a final outcome for that processing. [1] In an email workflow, this is an early checkpoint, not proof of delivery.

Keep these stages separate:

1. **API acceptance:** The endpoint accepted the request. A 202 may mean the provider will process it asynchronously.
2. **Provider processing or queueing:** The provider has work to do. A request can still fail before a message leaves the provider’s systems. Check provider-specific logs and event details rather than assuming acceptance means a successful send.
3. **Recipient-server handoff:** The receiving mail system may accept or reject the message. A provider’s later event or status may describe this handoff; use the provider’s definitions.
4. **Delivery status:** “Delivered” often describes a provider-recorded handoff, but check exactly what the provider counts as delivered. Do not equate that label with a message appearing in the recipient’s inbox.
5. **Inbox placement and visibility:** A message accepted by a recipient system may be filtered, routed elsewhere, or not be obvious to the recipient. The API response by itself cannot establish where it ended up.

For a fuller model of the transitions, see the [email send state machine](/repmail/learn/infrastructure/email-send-state-machine). When comparing dashboard numbers, also check the [denominators behind email delivery statuses](/repmail/learn/glossary/email-delivery-status-denominators). Different stages and definitions can produce different counts without identifying the cause on their own.

## Trace the message with an evidence timeline

Start with one affected message, such as a password reset. Avoid diagnosing from a campaign-wide total when you can inspect the individual request.

1. **Record the request identity.** Save the API request time, recipient, endpoint, response status, and any provider message ID or request ID returned. Do not log secrets or unnecessary personal data. If the API response has no message identifier, use the provider’s supported request-correlation method.
2. **Check whether the request was accepted once or retried.** If your application retried after a timeout, determine whether it may have submitted more than one request. Follow the provider’s documented retry and idempotency behavior; do not assume a repeated request is automatically deduplicated.
3. **Search provider logs or events.** Look up the message using the identifier and recipient. Establish the latest recorded event and its timestamp. If there is no later event, investigate provider processing and event visibility before concluding that the recipient rejected it.
4. **Read the specific failure or deferral detail.** Distinguish a validation or account-level problem from a recipient-server response. A generic API acceptance response will not contain the complete later delivery story.
5. **Check the recipient-side handoff.** If the provider records a successful handoff, confirm what its “delivered” status means. Ask the recipient to check spam or other folders and verify the address and mail system. If the message is missing at one provider but present at another, investigate the handoff to the affected destination; the [Gmail-to-Outlook handoff guide](/repmail/learn/deliverability/accepted-gmail-missing-outlook-handoff) covers that narrower case.
6. **Correlate application behavior.** Verify that the application generated the intended message and recipient, and that it handled the API response as an acknowledgment rather than a final delivery result. Keep the request identifier alongside later provider events in your incident notes.

A compact timeline makes the gap visible:

| Time | Evidence to capture | What it establishes |
|---|---|---|
| Request submitted | Application timestamp and recipient | The application attempted the operation |
| API response | HTTP status and response body | The API’s immediate response; 202 is not final delivery confirmation |
| Provider event | Message ID, event, timestamp, detail | The latest provider-reported processing or delivery step |
| Recipient check | Destination system and folder checked | Whether the message is visible to the recipient |

Treat a blank later row as **unknown**, not as proof that the preceding step succeeded or failed. Provider event delays or missing correlation can make the timeline incomplete; follow the provider’s own guidance for interpreting its records. SendGrid, for example, has a support article specifically addressing a 202 response without a corresponding email send. Its guidance is provider-specific, so do not assume the same diagnostic details apply to every API. [2]

## A practical decision procedure

Use the latest confirmed evidence to choose the next investigation:

- **Only a 202 is available:** Confirm the API request and search provider records by its identifier. Do not tell the user the email was delivered.
- **Provider records processing but no later outcome:** Inspect the provider’s event details and support guidance; retain the message ID and timestamps for escalation.
- **Provider records a recipient-side rejection or deferral:** Use the recorded reason to investigate the destination or message configuration. Do not infer a universal cause from the status name alone.
- **Provider records handoff, but the person cannot find the message:** Confirm the provider’s meaning of handoff, check recipient folders and address, and investigate destination-specific routing. A handoff record is not the same as confirmed inbox visibility.
- **No matching provider record:** Recheck the request identifier, account or environment, and whether the application reached the expected endpoint. The 202 response must be tied to the same message before drawing conclusions.

For example, if a password-reset endpoint returns 202 at 10:02 and your application records no provider event after that, your evidence currently stops at API acceptance. Search the provider using the returned message identifier and inspect its event history. If a later event records handoff but the recipient still reports nothing, shift the investigation to what that provider status represents and the recipient’s mail system. Do not mark the reset as delivered solely because the initial request returned 202.

## Where RepMail fits

RepMail by LetsZero sends through AWS SES SMTP and processes verified SES/SNS delivery-related events, including delivery, bounce, and complaint events. Its campaign History reports campaign engagement counters. Those records can help correlate a RepMail campaign with provider-reported outcomes, but they do not turn an initial API acknowledgment into proof of inbox placement, and counters should not be treated as a complete record of every event. If you are building the operational workflow around a different sending API, use that provider’s own identifiers and event definitions.

For troubleshooting outside this specific scenario, see [authentication drift detection](/repmail/learn/infrastructure/authentication-drift-detection).

## Sources

[1]: https://www.reddit.com/r/emaildeliverability/comments/1t5gv0a/api_returns_202_accepted_your_dashboard_shows_the/
[2]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/202
[3]: https://support.sendgrid.com/hc/en-us/articles/37945843123995-SendGrid-API-Returns-202-Accepted-Response-but-doesn-t-Send-Email
