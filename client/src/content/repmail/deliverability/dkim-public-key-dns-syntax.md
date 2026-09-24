---
product: "repmail"
academy: "deliverability"
contentType: "guide"
slug: "dkim-public-key-dns-syntax"
title: "DKIM public-key record syntax and DNS truncation checks"
description: "A practical guide to dkim public key DNS syntax: evidence, safe checks, edge cases, and a controlled next step."
authorSlug: "repmail-team"
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["email-authentication", "dkim"]
learningPaths: ["deliverability-mastery"]
assets: [{"type": "table", "title": "Evidence and decision table", "content": {"headers": ["Question", "Evidence to collect", "Decision boundary"], "rows": [["Identity", "DKIM public-key record syntax", "Use the exact domain, selector, host, or header field"], ["Validation", "reconstruct the exact selector._domainkey name and validate TXT chunks", "Record source, resolver/receiver, timestamp, and result"], ["Edge case", "never publish a private key while troubleshooting", "Do not infer a broader outcome than the evidence supports"], ["Recovery", "Saved prior state and named owner", "Change or roll back deliberately"]]}}]
keyTakeaways: ["Start with DKIM public-key record syntax and preserve raw evidence before editing.", "Make one reversible change and verify the real message or DNS path.", "Keep the boundary in view: Never publish a private key while troubleshooting."]
commonMistakes: ["Treating one dashboard label or local lookup as proof of end-to-end authentication.", "Changing several DNS or sender settings at once, which removes the comparison point.", "Assuming a pass for one identity proves alignment or placement for every identity."]
faqs: [{"question": "What should I check first for dkim public key DNS syntax?", "answer": "Start with the exact identity and raw evidence: DKIM public-key record syntax. Capture the source, timestamp, resolver or receiver, and current configuration before making a change."}, {"question": "Can one successful test prove the issue is fixed?", "answer": "No. A test is time- and path-specific evidence. Repeat the relevant DNS, message, SMTP, or report check for each active stream and record its provider context."}, {"question": "What should I preserve before changing authentication settings?", "answer": "Save the current DNS answer or message evidence, the owner and timestamp, the proposed diff, and the rollback decision. This makes before-and-after comparison possible when caches or delayed mail obscure the result."}]
nextStep: {"label": "Review the email authentication hub", "href": "/repmail/learn/deliverability/email-authentication", "description": "Use the hub to choose the next protocol or diagnostic guide."}
collections: ["email-authentication-essentials"]
---

Dkim public key dns syntax is best handled as a bounded evidence problem, not a guess based on one dashboard label. **Dkim public-key record syntax** is the useful starting point: collect the exact identity, record, header, or SMTP exchange involved, then compare it with what the receiver actually evaluated.

## The short answer

Show safe inspection commands conceptually, validate TXT chunks and v=DKIM1/k=/p= fields, and avoid reproducing private keys. The safe workflow is to inventory the current state, test the real sending path, make one reversible change, and verify the result with fresh evidence. This page focuses on that task rather than repeating a general SPF, DKIM, or DMARC introduction.

## Decision table

| Question | Evidence to collect | Decision boundary |
|---|---|---|
| Identity | DKIM public-key record syntax | Use the exact domain, selector, host, or header field |
| Validation | reconstruct the exact selector._domainkey name and validate TXT chunks | Record source, resolver/receiver, timestamp, and result |
| Edge case | never publish a private key while troubleshooting | Do not infer a broader outcome than the evidence supports |
| Recovery | Saved prior state and named owner | Change or roll back deliberately |

## Practical workflow

1. Define the question in terms of DKIM public-key record syntax. Write down the sending stream, domain or selector, provider, owner, and time window. If the question came from a dashboard, keep the raw message, DNS answer, SMTP reply, or report that supports it.
2. Collect evidence before editing configuration: reconstruct the exact selector._domainkey name and validate TXT chunks. Compare authoritative and recursive DNS where relevant, and compare a real received message with the configured values. A single local lookup or vendor status page is not a complete test.
3. Make the smallest controlled change that addresses the observed failure. Preserve the prior value, approval, exact diff, and rollback owner. Keep SPF, DKIM, DMARC, DNS, transport, and placement observations in separate fields so one pass does not mask another failure.
4. Re-test the same path and at least one representative edge case. Interpret the result conservatively: never publish a private key while troubleshooting. Record what remains unknown, who owns the next check, and when the configuration should be reviewed again.

## Edge cases and limits

The most important boundary is this: Never publish a private key while troubleshooting. Resolver caches, forwarding, multiple sending streams, provider-specific processing, and delayed messages can make two apparently similar tests disagree. Label an outcome as observed, inferred, or unknown. Do not turn an unmeasured demand signal or one successful test into a guarantee about delivery, placement, or receiver behavior.

## RepMail relevance

For a RepMail sending stream, use the same evidence discipline before changing domain authentication: preserve the raw header or DNS answer, identify the stream owner, and keep a rollback record. The [email authentication hub](/repmail/learn/deliverability/email-authentication) provides the broader map; the links below are the closest task-specific references.

## Further reading

[What Is Dkim](/repmail/learn/deliverability/what-is-dkim) · [Dns Records For Email](/repmail/learn/infrastructure/dns-records-for-email)

## References

1. [RFC 6376 — DKIM Signatures](https://datatracker.ietf.org/doc/html/rfc6376)
2. [Microsoft Learn — email authentication guidance](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-troubleshoot)
