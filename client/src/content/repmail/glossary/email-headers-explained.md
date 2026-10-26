---
product: repmail
academy: glossary
contentType: glossary-term
slug: email-headers-explained
title: 'Email Headers Explained: What the Metadata Shows'
description: Learn what email headers contain, how to read them in a useful order,
  and what routing and authentication fields can—and cannot—prove.
authorSlug: repmail-team
publishedAt: '2026-10-26'
updatedAt: '2026-10-26'
tags:
- email headers
- email authentication
- email troubleshooting
- raw email
collections:
- core-email-glossary
learningPaths:
- email-infrastructure
keyTakeaways:
- Email headers are metadata that describe message fields, routing, and reported processing.
- Read identity fields first, then the Received chain, authentication results, and
  issue-specific fields.
- Authentication results must be interpreted in context, including the method and
  evaluated domain.
- Headers are useful diagnostic evidence, but they do not prove every event or establish
  that a person read a message.
commonMistakes:
- Assuming the From field proves the sender’s identity.
- Treating every Received line as independently verified.
- Concluding that a single authentication pass means DMARC alignment passed.
- Assuming unsubscribe headers prove that an unsubscribe action occurred.
faqs:
- question: What are email headers?
  answer: They are metadata fields attached to an email, including sender and recipient
    information, message identifiers, route records, and—in some messages—authentication
    or unsubscribe information.
- question: How do I read email headers?
  answer: Open the raw message details in your mail client, then verify the message
    identity, review the Received fields and timestamps, inspect Authentication-Results,
    and check other fields relevant to your diagnostic question.
- question: Can email headers prove who sent a message?
  answer: Not on their own. Header fields and authentication results can support an
    investigation, but they should be interpreted in context and compared with relevant
    system records.
nextStep:
  label: Read Authentication-Results
  href: /repmail/learn/deliverability/read-authentication-results
  description: Learn how to interpret authentication methods, domains, and reported
    outcomes in raw headers.
assets:
- type: checklist
  title: Raw email header review checklist
  content:
    steps:
    - Confirm the message using From, To, Date, and Subject.
    - Keep the complete raw header for review.
    - Trace Received fields alongside timestamps and server details.
    - Read Authentication-Results by method and evaluated domain.
    - Inspect List-Unsubscribe fields when unsubscribe behavior is relevant.
    - Compare findings with available mail-system logs.
    - State what remains uncertain; headers alone may not show the full processing
      history.
---

Email headers are metadata attached to an email message. They record information such as the sender and recipient fields, the route the message took, and authentication results. To read raw headers, start with the message’s identity and route, then inspect authentication-related fields and any headers relevant to the issue you are investigating. A header is evidence about a message and its processing—not, by itself, proof of who operated a server or whether a message reached a person’s inbox.

## What email headers contain

An email message has a body and a set of header fields. The fields appear before the body in raw message data. Mail apps usually show only a subset in the message view; a command such as “show original” or “view source” may expose the full headers. The exact label and location depend on the app, so treat interface instructions as client-specific.

Common fields include:

| Field | What it generally tells you | How to use it |
|---|---|---|
| `From` | The displayed author address or name | Compare it with the sender identity you expected; it does not alone authenticate that identity. |
| `To`, `Cc` | Addressing information shown in the message | Check whether the message was addressed as expected. These fields may not show every delivery recipient. |
| `Date` | A date and time asserted for the message | Check the timezone and compare with other timestamps; do not assume it is the receiving server’s arrival time. |
| `Subject` | The subject line | Confirm you are examining the intended message. |
| `Message-ID` | A message identifier | Useful for correlating copies or logs when systems preserve it. |
| `Received` | A server’s record of handling or relaying the message | Read the sequence as a chain of reported hops; each receiving system adds its own trace. |
| `Authentication-Results` | A receiving system’s reported authentication checks | Interpret it with the authentication method, domain, and result in view. |
| `List-Unsubscribe` | Unsubscribe information supplied for a mailing list or campaign | Inspect it when reviewing unsubscribe behavior; presence alone does not establish that a client acted on it. |

For related terminology, see the [core email glossary](/repmail/learn/collections/core-email-glossary). For a closer look at one important field, read [Authentication-Results header](/repmail/learn/glossary/authentication-results-header).

## How to read raw email headers

Use this reading order to avoid treating one field as a complete explanation:

1. **Confirm the message.** Check `From`, `To`, `Date`, and `Subject` against the message you meant to inspect. Remember that displayed fields describe the message; they do not independently verify the sender.
2. **Trace the route.** Read the `Received` fields as a reported sequence of server handoffs. Since each receiving server prepends a field, the newest hop is commonly near the top and earlier hops follow below. Establish the order by comparing timestamps and host details rather than assuming every line is trustworthy or complete.
3. **Inspect authentication results.** Find `Authentication-Results` and note which domain and method each result refers to. SPF, DKIM, and DMARC are related but distinct checks; a pass for one does not mean every identity in the message aligns. The guide to [reading authentication results](/repmail/learn/deliverability/read-authentication-results) explains how to interpret the result details.
4. **Check fields tied to your question.** For a mailing-list unsubscribe review, inspect `List-Unsubscribe` and `List-Unsubscribe-Post`; the latter has specific one-click semantics. See [List-Unsubscribe one-click semantics](/repmail/learn/glossary/list-unsubscribe-one-click-semantics) and [testing one-click unsubscribe headers](/repmail/learn/deliverability/one-click-unsubscribe-headers-testing).
5. **Compare with independent records.** If you are diagnosing delivery or authentication, compare the headers with relevant sending and receiving system logs. A header snapshot alone may not show later processing or what a recipient saw.

## What headers can and cannot establish

Headers can help reconstruct a reported route, identify message metadata, and understand authentication results recorded by a system. They are useful diagnostic evidence, particularly when compared across copies of the same message or with server logs.

They have limits. `From` is not proof that the apparent sender controlled the sending system. A `Received` line records a system’s account of a handoff; it does not independently validate every earlier line. Authentication results describe checks performed in a particular context and should be read with the relevant domain and method. Nor do headers alone establish that a human opened or read a message.

When comparing a failed DMARC evaluation, focus on the specific domains and values in the relevant fields rather than treating “pass” or “fail” as a verdict on the whole message. See [DMARC alignment and failed header values](/repmail/learn/deliverability/dmarc-alignment-failed-header-values).

## Practical header review checklist

- [ ] Confirm the message using its subject, sender, recipient, and timestamp.
- [ ] Preserve the complete raw header, including all `Received` fields.
- [ ] Read route entries alongside their timestamps and server names.
- [ ] Identify the `Authentication-Results` field and the domain each check evaluates.
- [ ] Check list-unsubscribe fields only when unsubscribe behavior is relevant.
- [ ] Compare the header with available mail-system logs before drawing a conclusion.
- [ ] Record uncertainty: a header is a useful record, not a complete account of every event.

## Common mistakes when reading headers

- **Treating `From` as authentication.** It is a message field, not proof of domain control.
- **Reading `Received` lines in the wrong order.** Work from the newest reported hop toward earlier ones, checking timestamps and context.
- **Equating one authentication pass with DMARC alignment.** The method, domain, and alignment matter; inspect the details.
- **Assuming headers show the complete delivery story.** They may need to be supplemented with system logs and other copies.
- **Treating unsubscribe headers as proof of an unsubscribe event.** They describe supplied mechanisms, not whether a recipient or client used them.

## Sources

[1]: https://mailtrap.io/blog/email-headers/
[2]: https://www.reddit.com/r/sysadmin/comments/1dz41xm/i_am_confused_with_email_protocols_such_as_smtp/
