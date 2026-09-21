---
contentType: comparison
authorSlug: repmail-team
publishedAt: "2026-09-21"
slug: smtp-connection-vs-api
title: "Amazon SES SMTP vs. API: Which Path Fits?"
description: "Compare Amazon SES SMTP and API sending by credentials, message construction, TLS, Region, portability, and operational control."
tags: ["amazon-ses", "smtp", "email-api", "infrastructure"]
keyTakeaways:
  - "SMTP is a protocol and connection contract; the SES API is a signed HTTPS interface with SDK and CLI options."
  - "Choose based on where you want MIME construction, retries, credentials, observability, and provider coupling to live."
  - "Neither transport guarantees better deliverability; authentication, recipient quality, and event handling remain separate concerns."
prerequisites:
  - label: "Learn how SMTP sends email"
    href: "/repmail/learn/infrastructure/what-is-smtp"
  - label: "Understand an email API"
    href: "/repmail/learn/email-platform/what-is-an-email-api"
commonMistakes:
  - "Using AWS console credentials as SES SMTP credentials."
  - "Assuming an API success response means delivery rather than request acceptance."
  - "Changing transport without carrying over suppression, event, and retry controls."
faqs:
  - question: "Is SES SMTP easier than the API?"
    answer: "It depends on the existing application. SMTP can fit software that already speaks SMTP, while the API can give an application structured request fields and SDK behavior. Neither is universally easier."
  - question: "Are SES SMTP credentials the same as AWS access keys?"
    answer: "No. AWS documents SES-specific SMTP credentials and an SMTP endpoint. Do not copy console passwords or general-purpose credentials into an SMTP client without following the current AWS conversion and permission guidance."
  - question: "Does SMTP deliver better than the API?"
    answer: "No transport choice is a deliverability guarantee. Both ultimately use SES and depend on identity authentication, list quality, message handling, reputation, and the receiving provider."
nextStep:
  label: "Understand SES account-level suppression"
  href: "/repmail/learn/infrastructure/aws-ses-account-level-suppression"
  description: "Whichever transport you choose, suppression must be enforced before submission."
assets:
  - type: table
    title: SES transport decision matrix
    content:
      headers: ["Question", "SMTP", "API"]
      rows:
        - ["Existing integration", "Fits SMTP-capable software", "Requires API client or SDK work"]
        - ["Message construction", "Application or mail library builds MIME", "Request uses SES API fields or raw MIME"]
        - ["Credentials", "SES SMTP credentials and TLS", "AWS signing and IAM permissions"]
        - ["Control surface", "Protocol replies and client behavior", "Structured request, response, and SDK controls"]
---

**Choose Amazon SES SMTP when you need a standard mail-server connection; choose the SES API when your application wants a signed HTTPS interface and structured control.** The better path depends on your integration boundary. Neither path is inherently more deliverable, and both still need authentication, suppression, retries, and event monitoring.

## What SMTP gives you

SMTP is a protocol. A client connects to an SES SMTP endpoint, negotiates TLS as configured, authenticates with SES SMTP credentials, and submits a message through the familiar `EHLO`, `MAIL FROM`, `RCPT TO`, and `DATA` flow. A mail library can construct the MIME message, attachments, and headers before handing it to the connection. That makes SMTP a practical fit for software already designed around an SMTP relay.

The trade-off is that more behavior lives in the mail client and connection layer. You must understand how the library handles TLS, timeouts, connection reuse, reply codes, and retries. SES SMTP credentials are not simply the password from the AWS console. AWS documents Region-specific SMTP endpoints and credentials, so put the endpoint and Region in configuration rather than copying an example from another deployment.

Read [what SMTP is](/repmail/learn/infrastructure/what-is-smtp) when a team needs to interpret a `4xx` or `5xx` reply. A successful SMTP submission still means acceptance by the relay, not guaranteed delivery.

## What the API gives you

The SES API is an HTTPS interface. An application uses AWS authentication and IAM permissions, commonly through an SDK or the AWS CLI, and submits a formatted or raw message using API operations. The application can keep structured fields such as sender, recipients, tags, configuration set, and message identifiers close to the business transaction. That can simplify observability and make request-level errors explicit.

The API also moves more responsibility into application code. You need to manage AWS request signing, permissions, retry behavior, timeouts, and raw MIME construction when using the raw path. A library or SDK can help, but it does not decide whether a recipient is eligible or whether a complaint should stop future sends.

Portability is another boundary to make explicit. SMTP can let an existing application change relays with fewer code changes, although endpoint credentials, TLS settings, and provider-specific extensions still need review. The SES API gives deeper access to AWS-specific request fields and IAM controls, but moving away later means replacing that integration. Document the choice in the architecture record so a future operator does not mistake a transport decision for a deliverability conclusion.

Choose the API when your service already has an AWS integration boundary, needs structured metadata, or wants to coordinate SES requests with application-level state. Choose SMTP when an existing product expects a relay and changing that integration would add more complexity than it removes.

## Compare the failure boundary

With SMTP, inspect connection errors, TLS negotiation, authentication failures, and numeric reply codes. With the API, inspect HTTPS responses, AWS error types, permissions, throttling, and request validation. In both cases, separate submission errors from downstream events. A request can be accepted and later produce a bounce or complaint.

Carry the same safety controls across both choices: check local and account-level suppression before submission, attach a stable send identifier, handle temporary failures without uncontrolled retries, and ingest SES events. Do not switch from SMTP to API as a response to a deliverability problem without investigating identity, recipient quality, authentication, and complaints first.

The suppression boundary should remain transport-neutral. Before choosing an SMTP worker or API client, review the [SES account-level suppression model](/repmail/learn/infrastructure/aws-ses-account-level-suppression) and decide where the application records unsubscribe, bounce, and complaint state. Then test both the request path and the downstream event path; changing a protocol does not transfer ownership of those controls automatically.

## Where RepMail fits

RepMail is relevant as an application layer over an SES sending path. If you are comparing a direct SES integration with RepMail, ask which team owns credentials, MIME construction, event ingestion, suppression, and retry behavior. A product that hides the transport can reduce integration work, but you should still know the underlying Region and identity boundaries before diagnosing a send.

## Sources

- [AWS: Using the Amazon SES SMTP interface](https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html)
- [AWS: Using the Amazon SES API](https://docs.aws.amazon.com/ses/latest/dg/send-email-api.html)
- [AWS: Sending email with the Amazon SES API](https://docs.aws.amazon.com/ses/latest/dg/send-email-concepts-email-format.html)
- [AWS: IAM permissions for Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/control-user-access.html)
