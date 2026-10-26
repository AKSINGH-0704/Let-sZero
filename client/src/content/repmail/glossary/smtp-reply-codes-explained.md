---
product: repmail
academy: glossary
contentType: glossary-term
slug: smtp-reply-codes-explained
title: 'SMTP Reply Codes: What 2xx, 4xx, and 5xx Mean'
description: Learn how to read SMTP reply codes, distinguish successful, temporary,
  and permanent responses, and choose the right diagnostic action.
authorSlug: repmail-team
publishedAt: '2026-10-26'
updatedAt: '2026-10-26'
tags:
- SMTP
- email delivery
- email errors
- email infrastructure
- deliverability
collections:
- core-email-glossary
learningPaths:
- email-infrastructure
keyTakeaways:
- 'The first digit provides the fastest classification: 2xx success, 4xx temporary
  condition, and 5xx failure in the current form.'
- Use bounded, delayed retries for 4xx responses rather than retrying continuously.
- Investigate and correct the cause of a 5xx response before trying the same delivery
  again.
- A successful SMTP response confirms acceptance at that transaction stage, not human
  reading or final mailbox placement.
- Log the complete response, transaction stage, recipient, timestamp, and follow-up
  action.
commonMistakes:
- Treating every 4xx response as safe to retry indefinitely.
- Reading only the three-digit code and discarding the enhanced status code or server
  text.
- Assuming a 250 response proves the message was read or reached the final inbox.
- Retrying a permanent recipient failure without correcting or suppressing the address.
- Failing to distinguish a response to the recipient command from a response after
  message data submission.
faqs:
- question: Should a 4xx SMTP response be retried?
  answer: Usually, a 4xx response indicates a temporary condition, so a sender may
    retry using a delayed, bounded policy. The complete response and provider guidance
    should determine the retry window.
- question: Does a 5xx response always mean the recipient address is invalid?
  answer: No. A 5xx response can indicate an invalid recipient, authentication or
    command problem, message rejection, or policy refusal. Read the complete response
    and identify which SMTP transaction stage failed.
- question: What does SMTP 250 mean?
  answer: 250 commonly means that the server accepted the command or message at that
    point in the SMTP transaction. It does not by itself prove that a person read
    the message or that it reached the final mailbox.
- question: Why should I log the full SMTP response?
  answer: The three-digit code gives a broad category, while the enhanced status code,
    text, command, server, and timestamp provide the context needed to select a retry,
    correction, suppression, or escalation action.
nextStep:
  label: Review SMTP 4xx and 5xx troubleshooting
  href: /repmail/learn/deliverability/smtp-4xx-5xx-email-errors
  description: Use the delivery-focused reference to investigate temporary responses,
    permanent failures, and the evidence in your sending logs.
assets:
- type: table
  title: SMTP reply-code decision table
  content:
    rows:
    - - 2xx
      - The requested SMTP step was accepted
      - Record the transaction and continue or close the session as appropriate
      - That the message was read or reached the final mailbox
    - - 3xx
      - More information is required to continue
      - Complete the expected next SMTP step, such as authentication or message submission
      - That the transaction has succeeded
    - - 4xx
      - Temporary condition or deferral
      - Apply a delayed, bounded retry policy and retain the full response
      - That retrying forever is appropriate
    - - 5xx
      - Permanent rejection in the current form
      - Correct the cause, suppress an invalid recipient, or escalate a policy issue
      - That every 5xx response identifies an invalid address
    headers:
    - Response family
    - Typical meaning
    - First action
    - Do not assume
---

An SMTP reply code is a three-digit server response that describes what happened during an email transaction. The first digit gives the broad result: **2xx** means success, **4xx** usually means a temporary condition, and **5xx** usually means a permanent failure. Read the complete reply—not only the number—because the enhanced status code and server text often identify the next step.

## How the three-digit code works

SMTP responses generally use this pattern:

- **2xx:** The requested action completed successfully.
- **3xx:** The server needs more information before continuing, often during authentication or message submission.
- **4xx:** The condition is temporary. The sender may retry later, subject to its retry policy.
- **5xx:** The request failed permanently in its current form. Retrying the identical request without addressing the cause is unlikely to help.

The first digit is the quickest classification. The second and third digits provide more detail, but their exact interpretation depends on the SMTP command and the server response. Preserve the full response in logs, including the enhanced status code when present.

## Common success responses

A **250** response commonly indicates that the server accepted a command or message. For example, a server may return `250 OK` after accepting the message during the SMTP transaction. A **220** response commonly identifies a server ready to begin an SMTP session, while **221** commonly indicates that the session is ending.

A successful SMTP handoff does not prove that the recipient read the message or that it reached the final mailbox. It means the responding server accepted the relevant step. To understand the larger delivery path, see [email infrastructure explained](/repmail/learn/infrastructure/email-infrastructure-explained).

## Common 4xx temporary responses

A **4xx** response indicates that the server is not accepting the request now, but the condition may change. Examples include temporary rate limits, greylisting, service unavailability, and temporary mailbox or policy conditions.

The appropriate first action is usually to apply a controlled retry policy with delay and limits. Do not retry continuously or immediately: repeated attempts can increase load and make diagnosis harder. Record the timestamp, destination, SMTP command, complete response, and retry count.

Greylisting is one example of a temporary delivery decision. The receiving system may defer an unfamiliar sender and expect a later attempt. See [email greylisting](/repmail/learn/glossary/email-greylisting) for the mechanism and its diagnostic implications.

A 4xx response is not permission to retry indefinitely. Stop or escalate when the retry window ends, the provider’s guidance says to stop, or later responses change to a permanent failure.

## Common 5xx permanent responses

A **5xx** response means the request was rejected in its current form or under the current conditions. Examples include an invalid recipient, an address that does not exist, a rejected command, or a policy refusal.

The usual action is to fix or classify the cause before attempting another delivery. Check the recipient syntax, sender identity, authentication, message construction, domain configuration, and the complete diagnostic text. For a nonexistent recipient, remove or suppress the address rather than repeatedly retrying it.

A 5xx response is a classification, not a complete explanation. Some providers use different text for similar conditions, and a policy rejection may require reviewing the receiving provider’s requirements. Compare the response with your sending logs and configuration. The [SMTP 4xx and 5xx email errors](/repmail/learn/deliverability/smtp-4xx-5xx-email-errors) reference provides a more delivery-focused troubleshooting path.

## A practical diagnostic procedure

1. **Capture the entire response.** Save the three-digit code, enhanced status code, text, server identity, command, recipient, and timestamp.
2. **Classify the first digit.** Treat 2xx as accepted, 4xx as potentially temporary, and 5xx as a failure requiring investigation.
3. **Check the transaction stage.** A response to `RCPT TO` may concern the recipient; a response after `DATA` may concern message acceptance or policy.
4. **Choose one action.** For 4xx, schedule bounded retries. For 5xx, correct the cause, suppress an invalid address, or escalate the policy decision.
5. **Compare later evidence.** Review subsequent attempts, bounce events, authentication results, and domain settings instead of judging the outcome from one line alone.
6. **Keep an audit trail.** Store the original response and the action taken so repeated failures can be grouped by provider, domain, code, and cause.

SMTP reply codes are one part of an email system’s diagnostic record. A sender using RepMail by LetsZero should also review its configured sending domain, delivery events, and suppression records when investigating a failure; the available records and event handling depend on the current configuration and provider responses.

## Sources

[1]: https://www.twilio.com/en-us/blog/insights/smtp-server-response-codes-explained
[2]: https://cli.nylas.com/guides/smtp-reply-codes-explained
