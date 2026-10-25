---
product: repmail
academy: infrastructure
contentType: tutorial
slug: dkim-checker-selector-alignment
title: 'DKIM Checker: Read Selector, Signature, and Alignment'
description: Check a DKIM selector in DNS, inspect a message’s DKIM signature and
  authentication results, then assess DMARC alignment separately.
authorSlug: repmail-team
publishedAt: '2026-10-25'
updatedAt: '2026-10-25'
tags:
- DKIM
- email authentication
- DNS
- DMARC
- deliverability
collections:
- deliverability-diagnostics
learningPaths:
- provider-deliverability-diagnostics
keyTakeaways:
- Read the selector (`s=`) and signing domain (`d=`) from the message before looking
  up a DKIM record.
- A DNS lookup checks the published key; message headers show the receiver’s result
  for a specific message.
- A DKIM pass does not by itself establish DMARC alignment.
- After a provider or DNS change, compare the DNS record and a newly sent message’s
  authentication results.
commonMistakes:
- Checking a guessed selector rather than the selector shown in the message.
- Treating a published public key as proof that a particular signature passed.
- Assuming DKIM pass means DMARC passed or aligned.
- Generalizing from one message to every sending route or message type.
faqs:
- question: What is a DKIM selector?
  answer: A selector is the value used with the signing domain to identify the DKIM
    public-key DNS record. Read it from the message’s DKIM-Signature header, then
    check the corresponding DNS name.
- question: Can a DKIM checker verify a message I already sent?
  answer: Some tools focus on domain records, while others can analyze a message or
    its headers. For evidence about a sent message, inspect its full headers or use
    a tool whose process you trust.
- question: Does DKIM passing mean DMARC passes?
  answer: Not necessarily. Check the DMARC result and whether the authenticated DKIM
    signing domain aligns with the message’s From domain. These are separate checks.
- question: What should I do after changing a selector or DNS record?
  answer: Check the selector used by a newly sent test message, look up that selector’s
    DNS record, and compare both with the receiver’s authentication results.
nextStep:
  label: Learn to read authentication results
  href: /repmail/learn/deliverability/read-authentication-results
  description: Use the message headers to interpret the receiver-reported DKIM and
    DMARC evidence.
assets:
- type: table
  title: 'DKIM checker evidence: what each result means'
  content:
    rows:
    - - Expected selector record is present
      - DNS publishes a record at the name checked
      - Send a test message and inspect its headers
    - - Message selector differs from expected
      - The message used another selector
      - Check sending configuration and look up the selector shown
    - - Receiver reports DKIM failure
      - This receiver did not report a successful DKIM result for the message
      - Compare selector, signing domain, DNS, and sender configuration
    - - DKIM passes but DMARC does not
      - DKIM authentication did not establish a passing DMARC result
      - Review the From domain, DKIM signing domain, and DMARC result
    - - DKIM and DMARC pass
      - The receiver reported those results for this message
      - Repeat for other relevant routes or message types
    headers:
    - Evidence
    - What it tells you
    - What to check next
---

A DKIM checker can help you confirm whether a public key is published for a selector and whether a message’s DKIM signature passed authentication. Those are related but separate checks: a DNS lookup alone does not prove that a particular message passed, and a DKIM pass alone does not establish DMARC alignment. After a DNS or sending-provider change, inspect the selector, a real message, and the alignment evidence in that order.

## What a DKIM checker can tell you

DKIM signs a message using a private key; the receiving system uses a public key published in DNS to validate the signature. A selector identifies which DNS record to look up. For a general explanation, see [what DKIM is](/repmail/learn/deliverability/what-is-dkim).

A domain checker can report published domain-authentication information, while an investigation tool may analyze a message or authentication evidence. These tools do not necessarily answer the same question. For example, dmarcian describes its domain checker as a domain-level check, while Red Sift’s Investigate is presented as an email and domain investigation tool. [1] [2]

Use a domain lookup to check whether the expected selector’s public key is discoverable. Use the headers of a message that actually passed through the sending path to see which selector and signing domain were used and what the receiver reported. A DMARC lookup can help review the domain’s published DMARC record, but it is not a substitute for message-level evidence. [3]

## Step 1: Find the selector and signing domain

Get the selector from a delivered message’s `DKIM-Signature` header. Look for the `s=` value for the selector and the `d=` value for the signing domain. For example, if the header contains `s=mail2026` and `d=example.com`, look up the public key at:

`mail2026._domainkey.example.com`

Treat that as an example, not a recommended selector name. The selector and domain must come from the message you are testing; do not assume they from a provider’s setup screen are the ones used by every message.

If you are checking the record’s format, compare it with the expected DKIM DNS syntax. Our guide to [DKIM public-key DNS syntax](/repmail/learn/deliverability/dkim-public-key-dns-syntax) explains the record fields. A result that says a record exists is useful, but it does not establish that the message signature validates.

## Step 2: Inspect a message’s signature result

Send a test message through the same domain, account, and sending route you intend to use. Open the received message’s original source or full headers, not just its visible content. Find the `DKIM-Signature` header and the receiver’s `Authentication-Results` header.

Check these items:

- **Selector (`s=`):** Is it the selector you expected to test?
- **Signing domain (`d=`):** Is it the domain your sending setup is intended to use?
- **DKIM result:** Does the receiver report `dkim=pass`, `dkim=fail`, or another result?
- **Reported identity:** Does the result identify the domain and selector you are investigating?

A pass in the received message is evidence about that message and receiving system. If the DNS record exists but the message fails, check that the message used the expected selector and signing domain, and that the published key corresponds to the signing setup. Avoid diagnosing from a DNS checker alone. For help reading the results, see [how to read authentication results](/repmail/learn/deliverability/read-authentication-results).

## Step 3: Check DMARC alignment separately

DMARC alignment asks whether an authenticated domain aligns with the domain visible in the message’s From address, according to the domain’s DMARC policy. It is not the same as DKIM validation. A message can have a DKIM pass without that DKIM identity aligning with the From domain; therefore, read the reported DKIM domain alongside the From domain and the DMARC result.

When reviewing the headers, record the From domain, the DKIM signing domain (`d=`), the DKIM result, and the DMARC result. Don’t infer alignment solely from a selector lookup or from the word “pass.” Domain checkers and DMARC lookup tools can provide useful DNS context, but the actual message headers show what happened for the message you tested. [1] [3]

## A practical decision procedure

| Evidence | What it tells you | What to do next |
|---|---|---|
| Expected selector record is present | DNS publishes a record at the name you checked | Send a test message and inspect its headers |
| Selector in message differs from expected | The message used a different selector than the one you looked up | Check the sending configuration and look up the selector actually shown |
| `dkim=fail` or no passing DKIM result | The receiver did not report a successful DKIM result for this message | Compare the message’s selector and signing domain with DNS and the sender configuration |
| `dkim=pass`, but DMARC does not pass | DKIM authentication alone has not established a passing DMARC result | Review the From domain, DKIM signing domain, and the receiver’s DMARC result |
| DKIM and DMARC pass for the tested message | The receiver reported those results for this message | Repeat with relevant sending routes or message types if they differ |

This is a troubleshooting sequence, not a guarantee about how every recipient system will evaluate other messages.

## Where RepMail fits

RepMail by LetsZero is adjacent to this task: it is not a DKIM checker. RepMail sends through AWS SES SMTP from a verified custom sending domain or subdomain and uses SES Easy DKIM with three CNAME records. If you use RepMail, check the DNS records shown for your sending domain, then send a test message and inspect its headers with a checker or mailbox tool suited to that evidence. A successful setup step should not be treated as proof that every received message has passed DKIM or DMARC alignment.

## Common mistakes to avoid

- Looking up a guessed selector instead of reading `s=` from the message being tested.
- Treating a published DNS key as proof that a message signature passed.
- Treating `dkim=pass` as proof that DMARC alignment passed.
- Checking one message and assuming every sending route uses the same selector and signing domain.

## FAQs

### What is a DKIM selector?
A selector is the value used with the signing domain to identify the DKIM public-key DNS record. Read it from the message’s `DKIM-Signature` header, then check the corresponding DNS name.

### Can a DKIM checker verify a message I already sent?
Some tools focus on domain records, while others can analyze a message or its headers. If you need evidence about a sent message, use its full headers or submit it only to a tool whose process you trust. [1] [2]

### Does DKIM passing mean DMARC passes?
Not necessarily. Check the DMARC result and whether the authenticated DKIM signing domain aligns with the message’s From domain. A DKIM pass and DMARC alignment are separate pieces of evidence.

### What should I do after changing a selector or DNS record?
Check the exact selector used by a newly sent test message, look up that selector’s DNS record, and compare both with the receiver’s authentication results. If the message still fails, use the evidence to narrow the issue rather than relying on a domain lookup alone.

## Sources

[1]: https://dmarcian.com/domain-checker/
[2]: https://www.reddit.com/r/DMARC/comments/1rx5i8d/forgot_to_readd_dmarc_record_when_changing_email/
[3]: https://www.reddit.com/r/sysadmin/comments/1owr5qz/whats_the_tool_where_you_send_it_an_email_and_it/
[4]: https://redsift.com/tools/investigate
