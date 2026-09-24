---
product: repmail
academy: deliverability
contentType: guide
slug: email-sent-but-not-received-troubleshooting
title: 'Email Sent but Not Received: A Provider-Aware Triage'
description: A practical, provider-aware troubleshooting runbook for operators handling
  reports of "email sent but not received," emphasizing evidence collection and provide
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- deliverability
- triage
- smtp
- provider-specific
- email
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
assets:
- type: table
  title: 'Triage checklist: ''Email sent but not received'''
  content:
    headers:
    - Symptom / SMTP evidence
    - Immediate checks (within 10 min)
    - Recommended actions
    - Provider notes
    rows:
    - - Sender logs show 250 OK (accepted)
      - Capture SMTP transcript, message-id, envelope details, and send timestamp.
      - Ask recipient to search all folders (Spam/Promotions/All Mail), provide screenshots,
        and confirm forwarding/aliases.
      - Acceptance ≠ inbox delivery; consult provider-specific guidance next [1][2].
    - - Sender logs show 4xx/5xx responses
      - Note exact SMTP code and text; correlate with retry behavior.
      - Follow retry logic; for permanent 5xx, diagnose authentication or reputation;
        refer to SMTP error docs.
      - See SMTP 4xx/5xx error explanations for actionable next steps.
    - - No outbound evidence of send
      - Verify sending application logs, API responses, and queuing system.
      - Reattempt send and capture full SMTP/API logs; ensure the message-id is recorded.
      - If sending via a third party, request their delivery trace.
    - - Recipient uses Gmail
      - Request recipient to check Promotions, Social, Spam, and All Mail; ask for
        exact received timestamps.
      - If message absent but accepted, escalate with Gmail support using evidence
        [1].
      - Gmail has provider-specific filtering behaviors — consult their troubleshooting
        page [1].
    - - Recipient uses Outlook.com / Hotmail
      - Ask recipient to check Junk, Other, and Sweep rules; confirm forwarding is
        not in place.
      - If server accepted but recipient has no copy, follow Outlook.com sender support
        escalation path [2].
      - Outlook.com may quarantine or apply rules documented in their sender help
        [2].
    - - Recipient has forwarding/aliases or mailbox rules
      - Confirm whether messages are auto-forwarded or filtered into folders or deleted.
      - Test with a direct address to the final mailbox; request recipient to temporarily
        disable rules or whitelist sender.
      - Forwarding can alter authentication results or cause provider-specific reprocessing.
keyTakeaways:
- Start by collecting sender-side evidence (SMTP logs, timestamps, message-id) before
  concluding delivery.
- Sender-side acceptance (250) is not the same as recipient retrieval; verify provider-side
  handling and placement.
- Provider-specific behaviors (Gmail, Outlook.com, forwarding) change the next troubleshooting
  steps — consult provider guidance.
commonMistakes:
- Assuming a 250 SMTP response equals final delivery to the recipient's inbox.
- Skipping provider-side checks (spam/promotions tabs, quarantine, forwarding) and
  only reviewing outbound logs.
- Not asking the recipient for exact client, timestamp, and any filtered views which
  affect retrieval
faqs:
- question: If my server returned 250 OK, does that prove the recipient got the message?
  answer: No. A 250-level response indicates the receiving SMTP server accepted the
    message for further processing, but delivery to the recipient’s mailbox (or presentation
    to their client) is handled after acceptance and can still fail or be filtered.
    RFC 5321 explains SMTP acceptance semantics and why acceptance isn’t the same
    as final user delivery [3]. Always combine 250 logs with provider-side checks.
- question: How do I check whether Gmail or Outlook filtered the message?
  answer: Ask the recipient to check Spam, Promotions, and other tabs; for Gmail and
    Outlook.com, consult the providers’ support pages for common filtering and bulk-send
    behaviors and follow their suggested checks [1][2]. If sender-side logs show acceptance
    but the recipient finds nothing, escalate with the provider using the evidence
    collected.
- question: What evidence should I collect before contacting the recipient's provider?
  answer: Collect the full SMTP transcript (client IP, EHLO/HELO, MAIL FROM, RCPT
    TO, DATA, and final response), the message-id, sending timestamp, envelope-from,
    headers (Received headers), and any bounce or DSN. Also record the recipient’s
    client, exact clock time, and whether forwarding or aliases are used.
nextStep:
  label: Provider-specific deliverability triage
  href: /repmail/learn/deliverability/provider-specific-deliverability-triage
  description: Follow the provider-aware branching guidance for Gmail, Outlook.com,
    and others to continue troubleshooting.
---

Direct answer: Start by collecting sender-side evidence (full SMTP transcript, message-id, timestamps) and confirm whether the receiving provider accepted the message; acceptance by the receiving SMTP server is necessary but not sufficient to conclude delivery to the recipient’s mailbox.

Step 1 — Gather sender-side evidence (immediately)
- Export the full SMTP transaction: connection peer IP, EHLO/HELO, MAIL FROM, RCPT TO, DATA, message-id header, and the final server response. Record exact UTC timestamps and any retry attempts.
- If you used an API-based sender, include API request/response bodies and provider trace IDs. Keep copies of the raw message headers.

Step 2 — Classify the SMTP outcome
- 2xx acceptance: The remote server accepted the message for processing, but that does not guarantee mailbox delivery or inbox placement. RFC 5321 describes SMTP acceptance semantics and why further provider processing can still block or filter the message [3].
- 4xx/5xx errors: These indicate transient or permanent rejections. Record the exact code and error text; use those to choose retry vs. permanent-failure workflows and consult SMTP error guidance like our internal page on SMTP 4xx/5xx error explanations.

Step 3 — Provider-aware recipient checks
- Ask the recipient for their email provider (Gmail, Outlook.com, corporate Exchange, etc.), the client used (mobile app, web, or desktop), and exact time windows searched.
- Tell recipients to check Spam/Junk, Promotions or Other tabs, All Mail (Gmail), and any folder rules. Gmail and Outlook.com have specific user-facing behaviors and support documentation you should review when a message is accepted but not visible [1][2].

Step 4 — Common provider branches and actions
- Gmail: If sender logs show acceptance but the recipient cannot find the message, request screenshots of the search across All Mail and the Spam folder and consider escalating with Gmail support using the message-id and headers [1].
- Outlook.com: If the message was accepted but not present, follow Outlook.com’s sender support checklist before raising a trace with Microsoft; include delivery evidence and timestamps [2].
- Corporate/Exchange: Check quarantine/transport rules, journaling, and admin quarantine; involve the recipient’s mailbox administrator when acceptance is present but retrieval fails.

Step 5 — Edge cases and advanced checks
- Forwarding and aliases: Forwarding can change the effective sender and authentication results (SPF/DKIM/DMARC), causing provider-side rejections or reclassification. Verify whether the recipient account forwards to another address.
- Mailbox rules and client filters: Rules can auto-archive, move, or delete messages. Ask the recipient to temporarily disable suspect rules or search by message-id.
- Third-party services: If you use a relay or ESP, request their delivery traces and header-verified copies.

Decision priorities
- If you have no sender evidence, treat it as a sending failure and reattempt with full logging.
- If you have 4xx/5xx errors, follow retry/diagnose steps; use our SMTP errors guide for code-specific handling.
- If you have acceptance but no recipient copy, escalate with the receiving provider and include all collected evidence. Avoid asserting delivery; state only that the remote server accepted for processing.

For provider-specific branching and deeper checks, see the provider-specific triage guide and the differences between inbox placement and deliverability in our internal resources. For a broader view of deliverability concepts, consult the complete guide to email deliverability hub.

## Sources
[1] https://support.google.com/mail/answer/14668346?hl=en
[2] https://support.microsoft.com/en-us/outlook/sender-support-in-outlook-com
[3] https://www.rfc-editor.org/rfc/rfc5321


## Related resources

Continue with [the related RepMail guide](/repmail/learn/deliverability/provider-specific-deliverability-triage), [the related RepMail guide](/repmail/learn/deliverability/inbox-placement-vs-deliverability), [the related RepMail guide](/repmail/learn/deliverability/smtp-4xx-5xx-email-errors).


## Related resources

Continue with the [complete guide to email deliverability](/repmail/learn/deliverability/complete-guide-to-email-deliverability), review the [provider-specific triage guide](/repmail/learn/deliverability/provider-specific-deliverability-triage), and use the [sender reputation guide](/repmail/learn/deliverability/sender-reputation) when the workflow crosses into a neighboring concern.
