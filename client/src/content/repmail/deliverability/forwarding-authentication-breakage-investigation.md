---
product: repmail
academy: deliverability
contentType: guide
slug: forwarding-authentication-breakage-investigation
title: Forwarding and Authentication Breakage Investigation
description: Practical forensic guide for diagnosing when recipient forwarding affects
  email authentication and deliverability.
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- forwarding
- forensics
- authentication
- deliverability
- DMARC
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
assets:
- type: table
  title: Forwarding authentication decision checklist
  content:
    headers:
    - Symptom
    - Header evidence to collect
    - Most likely cause
    - Immediate next step
    rows:
    - - DKIM valid at original hop but fails at final receiver
      - Original DKIM-Signature, Authentication-Results at intermediate and final
        receivers, Received chain
      - Forwarder modified signed headers/body or changed MIME (client-based forwarding
        or banner insertion)
      - Ask recipient for original message-as-attached or raw source; compare original
        DKIM-Signature integrity
    - - SPF passes for sender but SPF fails at final receiver
      - Envelope-from (Return-Path), Received lines showing submission IPs, Authentication-Results
      - Forwarder resent message using its own envelope-from (breaks SPF alignment)
      - Check if ARC exists; if not, contact forwarder to use SRS or authenticated
        relay
    - - Authentication-Results missing or inconsistent
      - All Authentication-Results headers, Received headers from each hop
      - Intermediate MTA removed or didn't add results (or client forwarded as new
        message)
      - Collect raw source from each involved mailbox; verify whether forwarder preserves
        results
    - - Message delivered but marked spam only after forwarding
      - Spam headers added by receiver, Authentication-Results, Received chain
      - Content changes or reputation of forwarder’s MTA triggered policy evaluation
      - Review content changes and ask forwarder provider about their sending IP reputation
    - - ARC headers present and show prior passes, but final DMARC fails
      - ARC-Seal, ARC-Message-Signature, Authentication-Results entries
      - Final receiver ignored ARC or evaluated policy strictly; provider-specific
        policy application
      - Share ARC headers with receiver/provider support and request policy rationale
keyTakeaways:
- Forwarding can change the evidence path and sometimes cause SPF or DKIM failures,
  but it does not always break delivery.
- Collect full raw headers and the forwarded message as received by the final receiver
  before concluding the cause.
- Use header evidence (Received, Authentication-Results, ARC) to isolate whether forwarding
  altered envelope or signing details.
commonMistakes:
- Assuming forwarding always causes authentication failures without checking DKIM
  signatures or ARC chain.
- Looking only at visible headers in a webmail preview instead of the raw RFC822 headers.
- Treating a single provider's handling as universal; different providers rewrite
  or add headers differently.
faqs:
- question: If a recipient forwards a message using their mail client, does that always
    break DKIM?
  answer: No. DKIM signs message headers and body; if the forwarding action preserves
    those signed parts intact, DKIM can still validate. However, if the forwarder
    modifies signed headers or the message body (for example, by adding a banner or
    changing MIME structure), DKIM will fail. Always check the final message's Authentication-Results
    and the original DKIM-Signature header (when available) before concluding.
- question: What header fields are most useful to diagnose forwarding breakage?
  answer: 'Focus on: Received lines (show the transport path), Authentication-Results
    (shows SPF/DKIM/DMARC checks by the receiving MTA), the DKIM-Signature header(s)
    and the message''s From/envelope-from. Also look for ARC headers (if present)
    which can indicate intermediate trusted results preserved across forwarding.'
- question: How do I get the raw headers from a forwarded message?
  answer: Request the recipient to forward the message as an attachment or to copy
    the message source/raw headers from their client and paste them. Many providers
    document how to view raw headers; for Google/Gmail see the provider help on viewing
    headers and forwarding behaviors [2] and automated forwarding settings [1].
nextStep:
  label: Read authentication results
  href: /repmail/learn/deliverability/read-authentication-results
  description: Use header-based checks to interpret SPF/DKIM/DMARC outcomes and confirm
    whether forwarding altered authentication.
---

Direct answer
Forwarding can change how authentication is evaluated and sometimes causes SPF or DKIM checks to fail, but it does not always break deliverability. Diagnose forwarding cases by collecting the raw message as received by the final mailbox and tracing authentication results across every hop.

Practical forensic workflow
1) Get the raw evidence first
- Ask the recipient (or the recipient who forwarded) to provide the message source/RFC822 raw headers or to forward the original message as an attachment. Webmail previews hide crucial fields; always work from raw headers.[2]
- If the recipient used server-side automatic forwarding, request the server forwarding configuration or logs if possible (automations often rewrite envelope details).[1]

2) Identify key header traces to inspect
- Received: shows the transport path and the IPs that submitted the message at each hop.
- Authentication-Results: shows what the receiving MTA checked (SPF/DKIM/DMARC) and the outcomes at that hop.
- DKIM-Signature and Return-Path (envelope-from): these show whether DKIM was applied and whether SPF alignment is possible.
- ARC headers (if present): indicate whether intermediate MTAs vouched for the message and preserved authentication results.

3) Decision checkpoints (apply in order)
- Was DKIM signed by the origin and present in the final message? If the signature exists and verifies at the final receiver, DKIM survived.
- Did the envelope-from change between origin and final hop? A changed envelope-from commonly causes SPF to fail at the final receiver unless SRS or a relay preserves alignment.
- Are there ARC headers claiming prior pass results? ARC can help preserve trust across forwards but not all receivers honor it.

4) Edge cases and provider-aware notes
- Client-side forwarding (recipient manually resends) commonly rewrites the envelope and may alter MIME structure; this frequently invalidates DKIM signatures.
- Server-side automated forwarding sometimes preserves more of the original structure but may still rewrite Return-Path or add headers; behaviors differ by provider—check provider documentation for forwarding settings and how they show in headers.[1]
- Don’t assume a single failing header proves deliverability loss: final delivery decisions also involve content scanning, reputation, and receiver policy.

5) Remediation approaches (diagnostic-first)
- If DKIM broken by modification: request that recipients forward as attachments when they need to preserve signatures, or use mailing formats that avoid modification.
- If SPF is broken by envelope-from rewrite: ask the forwarder to use SRS or relay the message from the origin envelope, or encourage adoption of DKIM + DMARC with alignment at the origin.
- If ARC is present and indicates earlier passes: share ARC headers and Authentication-Results with the final receiver’s support if the final decision seems inconsistent.

Evidence interpretation guidance
- Work chronologically through Received headers to map who changed what.
- Compare the original DKIM-Signature body hash (if available) with the final body to spot alterations.
- If you cannot measure a provider’s internal policy decisions from headers alone, escalate to provider support and include collected headers.

Internal resources
- For step-by-step header interpretation, follow Read authentication results at /repmail/learn/deliverability/read-authentication-results.
- For DMARC alignment considerations, see /repmail/learn/deliverability/what-is-dmarc.
- For broader context on deliverability practices, consult the deliverability hub at /repmail/learn/deliverability/complete-guide-to-email-deliverability.

## Sources
[1] https://support.google.com/a/answer/81126
[2] https://support.google.com/mail/answer/14668346?hl=en


## Related resources

Continue with [the related RepMail guide](/repmail/learn/deliverability/read-authentication-results), [the related RepMail guide](/repmail/learn/deliverability/what-is-dmarc), [the related RepMail guide](/repmail/learn/deliverability).


## Related resources

Continue with the [complete guide to email deliverability](/repmail/learn/deliverability/complete-guide-to-email-deliverability), review the [provider-specific triage guide](/repmail/learn/deliverability/provider-specific-deliverability-triage), and use the [sender reputation guide](/repmail/learn/deliverability/sender-reputation) when the workflow crosses into a neighboring concern.
