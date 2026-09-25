---
product: repmail
academy: glossary
contentType: knowledge-base
slug: authentication-results-header
title: "Authentication-Results Header: Reading Receiver Assertions"
description: "Authentication-Results Header: Reading Receiver Assertions — Analysts need to read receiver-side SPF, DKIM, and DMARC results."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["glossary","deliverability","email","authentication","results","header"]
assets:
  - type: table
    title: "Decision table: quick interpretations from common Authentication-Results assertions"
    content:
      headers: ["Authentication-Results assertion","Likely immediate meaning","Next troubleshooting step","Stop condition"]
      rows:
        - ["spf=pass; dkim=pass; dmarc=pass","Receiver validated sending IP and signature; alignment satisfied","No auth changes needed; verify delivery pipeline if still blocked by other systems","Delivery issue not auth-related"]
        - ["spf=fail (reason); dkim=pass; dmarc=fail","Envelope SPF not authorized but DKIM aligned; DMARC fails because SPF not aligned","Update SPF record or ensure sending IP uses authorized MAIL FROM; consider DKIM-only path","SPF record updated and verified OR DKIM alignment established"]
        - ["spf=pass; dkim=fail (permerror); dmarc=fail","SPF OK but DKIM signature invalid or key missing; DMARC fails if DKIM not aligned","Fetch selector._domainkey TXT, confirm public key, check signing configuration and canonicalization","DKIM verification succeeds or signing configuration corrected"]
        - ["spf=neutral or temperror; dkim=neutral; dmarc=none","DNS lookup issues or indeterminate checks; receiver didn’t apply DMARC policy","Check DNS availability and TTLs from sending infrastructure; retry from sending IP or collect DNS logs","DNS resolution verified and deterministic results obtained"]
        - ["dmarc=quarantine or dmarc=reject","Receiver applied domain owner’s DMARC policy and likely altered handling","Confirm which mechanism failed (SPF/DKIM) and coordinate policy or sending fixes with domain owner","Policy change or authentication fixes implemented and receiver stops applying quarantine/reject"]
featured: false
collections: ["core-email-glossary"]
learningPaths: []
keyTakeaways:
  - "Analysts need to read receiver-side SPF, DKIM, and DMARC results."
  - "A focused task with a separate troubleshooting, implementation, decision, or reference job from the current corpus."
  - "Link from header investigations and DMARC pages."
commonMistakes:
  - "Skipping this check: Locate the Authentication-Results header and note the authserv-id and timestamp."
  - "Skipping this check: Extract SPF, DKIM, and DMARC tokens and any parenthetical reason text."
  - "Skipping this check: Map tested identities: envelope-from (MAIL FROM), header-from, and DKIM d= and s= values."
faqs:
  - question: "Can I trust Authentication-Results to prove why a message was rejected?"
    answer: "Authentication-Results is the receiver’s recorded reason and is authoritative about the receiver’s decision for that message. It is suitable evidence for operational troubleshooting. It is not independent proof of DNS responses or of the sending MTA’s behavior; for that, collect DNS and MTA logs."
  - question: "Why do I sometimes see multiple Authentication-Results headers?"
    answer: "Multiple headers usually indicate intermediate filtering or relaying services each appending their own assertions. Interpret them in chronological order (bottom-most is often earliest); confirm authserv-id values to determine which assertion corresponds to the final action."
  - question: "The header shows 'dkim=permerror' — what does that mean and how urgent is it?"
    answer: "Permerror indicates a permanent DKIM verification error such as a malformed public key record or unsupported DNS response format. It is typically urgent because it prevents signature verification; fetch the selector TXT record and check for syntax, missing public key, or DNS publishing problems before escalating."
nextStep:
  label: "Continue with ARC (Authenticated Received Chain)"
  href: "/repmail/learn/glossary/arc"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

The Authentication-Results header is the receiver’s statement about how a message scored for SPF, DKIM, and DMARC (and sometimes other checks). Analysts read it to collect authoritative receiver-side assertions and to decide next troubleshooting steps: whether the receiver accepted, aligned, failed, or applied policy. This article explains how to interpret those assertions, what they prove and don’t prove, and a practical sequence for using them as evidence in investigations.

## What the Authentication-Results header represents

Authentication-Results is a header added by a receiving MTA or mail filtering service to record results for checks such as SPF, DKIM, and DMARC. It is the receiver’s internal assertion about each test; it is not a canonical record of DNS state or of the sending MTA’s behavior. Use it as the receiver’s claim of outcome, subject to the receiver’s header format and policy.[1]

Decision boundary and evidence limits: this header proves what the receiver recorded at the time of receipt, not whether DNS was reachable for the sending domain later, nor whether intermediate relays modified the message after the check. If you need to prove original DNS responses, retrieve DNS logs or perform replay checks from the sending infrastructure.

## Common fields and how to read them

Key fields: the 'authserv-id' (identifies the asserting server), mechanism results such as 'spf=pass/neutral/fail', 'dkim=pass/permerror/fail', and 'dmarc=pass/quarantine/reject/none'. Many receivers include reasons or policy dispositions in parenthetical notes. Read the result token first (pass/fail/neutral) and then parse the commentary for alignment, selector, or header canonicalization details.[1]

Practical sequence: first confirm the authserv-id to ensure you’re interpreting the correct receiver’s assertions. Second, extract each mechanism’s result and any alignment notes. Third, cross-check the result with the envelope-from, header-from, and DKIM selector to map which identity was tested.

## Typical failure modes you’ll see and what they indicate

SPF fail usually indicates the sending server’s IP was not authorized in the domain’s SPF record, or the receiver used a different MAIL FROM than expected. However, SPF 'softfail' or 'neutral' can be caused by long or malformed SPF records or DNS lookup failures; check sending IP and the published SPF record from DNS for the sending domain.

DKIM permerror often means a cryptographic or canonicalization problem (e.g., missing public key, DNS TXT parse errors, or signature corruption in transit). DKIM fail indicates the signature verification did not match the message as received. DMARC fail indicates either SPF or DKIM (or both) did not pass with alignment; a DMARC 'quarantine' or 'reject' result indicates the receiver applied the domain owner’s policy rather than simply reporting it.

## How to use Authentication-Results in troubleshooting

Start with the header’s timestamp and authserv-id to ensure it corresponds to the delivery event you’re investigating. Extract SPF, DKIM, and DMARC assertions and map them to message attributes: envelope-from IP and domain, header-from domain, and DKIM selector/domain.

Sequence of actions: (1) If SPF failed, check the sending IP against the published SPF record from authoritative DNS. (2) If DKIM failed, fetch the DKIM selector TXT record and verify the public key is present and correctly formatted. (3) If DMARC failed, determine whether alignment failed due to header-from mismatch. Document the receiver’s quoted reason strings if present; they often contain actionable clues such as selector names or DNS errors.[1]

## Decision boundary: when Authentication-Results is sufficient evidence

Use the header as sufficient evidence to determine a receiver’s action (for example, that the receiver quarantined or rejected the message) because the receiver authored that statement. It is not sufficient evidence to prove what DNS looked like at message time to third parties or to prove behavior of other receivers. If you must prove DNS responses or signing behavior independently, collect DNS logs, MTA logs, and raw message source with timestamps.

Evidence limits: headers can be forged if added or modified after the receiver; always confirm the message trace or server logs when you need court-grade or SLA-level evidence. For operational troubleshooting, the header usually provides the immediate actionable assertions to pursue fixes.

## Provider differences and uncertainty

Different receivers format Authentication-Results differently and include varying levels of diagnostic detail. For example, some providers include selector names and explicit alignment notes, while others only state pass/fail. Where provider behavior matters, treat source-format differences as directional and verify against the receiver’s published documentation when available.[2]

If a receiver uses an intermediate filtering service that rewrites headers, you may see multiple Authentication-Results headers or an authserv-id that belongs to the filtering service rather than the final mailbox provider. Note uncertainty: you may need provider-specific documentation or message trace logs to fully interpret ambiguous reason strings.

## Practical checklist

- [ ] Locate the Authentication-Results header and note the authserv-id and timestamp.
- [ ] Extract SPF, DKIM, and DMARC tokens and any parenthetical reason text.
- [ ] Map tested identities: envelope-from (MAIL FROM), header-from, and DKIM d= and s= values.
- [ ] If SPF failed, query the sending domain’s SPF TXT record from authoritative DNS and compare IP authorization.
- [ ] If DKIM failed, fetch the DKIM selector TXT (selector._domainkey.domain) and confirm the public key and record format.
- [ ] If DMARC failed, inspect header-from alignment versus SPF and DKIM results and review the domain’s DMARC policy record.
- [ ] Search server or mailbox provider message trace logs for matching timestamps and authserv-id to corroborate the header.
- [ ] If headers are ambiguous, check for multiple Authentication-Results lines (intermediary filters) and document each authserv-id.
- [ ] Record findings, stop condition (issue fixed, needs provider support, or needs DNS/MTA change), and next owner.

## Where RepMail fits

Use this guide as a compact decision aid during header investigations and outbound troubleshooting. Analysts can follow the checklist and decision table to rapidly identify whether changes are required to DNS records, signing configuration, or sending IP authorization. Do not treat this article as a replacement for provider-specific message traces or legal evidence; use it to prioritize actions and route ownership in your outbound operations workflow.

Continue with [ARC (Authenticated Received Chain)](/repmail/learn/glossary/arc) for the next step in the workflow.

## Related RepMail guides

- [Click-Through Rate vs. Click-to-Open Rate](/repmail/learn/glossary/ctr-vs-ctor-email)
- [Delivered, Accepted, Deferred, and Bounced: Denominator Rules](/repmail/learn/glossary/email-delivery-status-denominators)


## Sources

[1]: https://www.rfc-editor.org/rfc/rfc8601 "IETF RFC reference"
[2]: https://support.google.com/mail/answer/81126 "Google sender or Workspace documentation"
