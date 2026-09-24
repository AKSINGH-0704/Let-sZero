---
product: "repmail"
academy: "deliverability"
contentType: "guide"
slug: "dmarc-alignment-failed-header-values"
title: "DMARC Alignment Failed: Read the From, Return-Path, and d= Values"
description: "A practical guide to dmarc alignment failed from return path dkim: evidence, safe checks, edge cases, and a controlled next step."
authorSlug: "repmail-team"
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["email-authentication", "dmarc"]
learningPaths: ["deliverability-mastery"]
assets: [{"type": "table", "title": "Evidence and decision table", "content": {"headers": ["Question", "Evidence to collect", "Decision boundary"], "rows": [["Identity", "identifier alignment", "Use the exact domain, selector, host, or header field"], ["Validation", "compare From, MAIL FROM/Return-Path, and DKIM d=", "Record source, resolver/receiver, timestamp, and result"], ["Edge case", "authentication pass and DMARC alignment are separate results", "Do not infer a broader outcome than the evidence supports"], ["Recovery", "Saved prior state and named owner", "Change or roll back deliberately"]]}}]
keyTakeaways: ["Start with identifier alignment and preserve raw evidence before editing.", "Make one reversible change and verify the real message or DNS path.", "Keep the boundary in view: Authentication pass and dmarc alignment are separate results."]
commonMistakes: ["Treating one dashboard label or local lookup as proof of end-to-end authentication.", "Changing several DNS or sender settings at once, which removes the comparison point.", "Assuming a pass for one identity proves alignment or placement for every identity."]
faqs: [{"question": "What should I check first for dmarc alignment failed from return path dkim?", "answer": "Start with the exact identity and raw evidence: identifier alignment. Capture the source, timestamp, resolver or receiver, and current configuration before making a change."}, {"question": "Can one successful test prove the issue is fixed?", "answer": "No. A test is time- and path-specific evidence. Repeat the relevant DNS, message, SMTP, or report check for each active stream and record its provider context."}, {"question": "What should I preserve before changing authentication settings?", "answer": "Save the current DNS answer or message evidence, the owner and timestamp, the proposed diff, and the rollback decision. This makes before-and-after comparison possible when caches or delayed mail obscure the result."}]
nextStep: {"label": "Review the email authentication hub", "href": "/repmail/learn/deliverability/email-authentication", "description": "Use the hub to choose the next protocol or diagnostic guide."}
collections: ["email-authentication-essentials"]
---
When a receiver reports **DMARC alignment failed**, diagnose the raw message before changing SaaS or DNS settings. Capture the visible `From:`, `Return-Path` or SMTP `MAIL FROM`, DKIM `d=` and `s=`, and the receiver's `Authentication-Results`. Then determine whether SPF or DKIM actually passed and whether that passing identifier aligned with the From domain under the policy's relaxed or strict mode. A dashboard label without those fields is a lead, not a diagnosis.

## Raw-header evidence to preserve

Save the complete raw message, message ID, receiving mailbox or provider, delivery time, sender stream, and any forwarding or modification step. Do not copy only a summary card. The evidence table below keeps authentication, identity, and path facts separate.

| Evidence | Raw field to capture | Triage question |
|---|---|---|
| Visible identity | `From: user@brand.example` | Which domain is the DMARC policy domain? |
| SPF identity | `Return-Path` and `smtp.mailfrom` | Did SPF pass, and is its domain aligned? |
| DKIM identity | `DKIM-Signature: d=...; s=...` | Did the signature verify, and is `d=` aligned? |
| Receiver verdict | `Authentication-Results` | Which SPF, DKIM, and DMARC results did this receiver record? |
| Policy context | `p`, `sp`, `adkim`, `aspf` in DMARC DNS | Is comparison relaxed or strict? |
| Message path | provider, forwarder, message ID | Was the message changed or forwarded? |

## From, Return-Path, and DKIM d= comparison

Use the exact domains observed in the same message. The RFC 5322 `From` domain is the visible identifier DMARC protects. The SMTP envelope `MAIL FROM` is commonly reflected as `Return-Path` after delivery and is the SPF identity. DKIM `d=` is the signing identity, while `s=` identifies the selector used to find its key. A passing SPF result for a provider envelope domain is not aligned SPF when that domain does not align with `From`; a valid DKIM signature with an unrelated `d=` is not aligned DKIM. Conversely, one passing aligned mechanism can be sufficient for DMARC even if the other mechanism is unaligned, subject to the receiver's evaluation.

## Authentication-Results and alignment triage

Read the receiver-authored `Authentication-Results` together with the raw headers and DNS answers. Record the receiver, authentication method, result, evaluated domain, selector, and any reason or diagnostic token. Separate `spf=pass` or `dkim=pass` from `dmarc=pass`: authentication proves a mechanism validated an identifier, while alignment compares that identifier with the visible From domain. The [read-authentication-results](/repmail/learn/deliverability/read-authentication-results) guide is a companion, not a substitute for preserving the message. If two receivers record different results, retain both observations rather than declaring one universal result.

## Relaxed versus strict alignment

Read `adkim` and `aspf` from the applicable DMARC policy record. Under relaxed alignment, an authenticated domain can qualify through its organizational-domain relationship; under strict alignment, the domains must match exactly as required by policy. Do not infer the mode from a provider label or from the fact that SPF or DKIM passed. The [DMARC alignment explanation](/repmail/learn/deliverability/dmarc-alignment-explained), [What Is DMARC](/repmail/learn/deliverability/what-is-dmarc), and [Return Path Vs From Domain](/repmail/learn/infrastructure/return-path-vs-from-domain) pages cover adjacent concepts.

## Failure triage sequence

1. Identify the exact message and receiver that produced the failure. If raw headers or the generating receiver are missing, stop and request them.
2. Write down the `From` domain, `Return-Path` or `smtp.mailfrom`, DKIM `d=`, selector, `Authentication-Results`, policy record, and timestamp without normalizing away subdomains.
3. Mark each mechanism as pass, fail, none, or unknown, then compare only a passing SPF or DKIM domain with `From` under `adkim` and `aspf`.
4. Compare a direct-delivery sample with a forwarded or modified sample when that path exists. Look for a SaaS shared envelope, a template changing `From`, a vendor DKIM domain, a strict policy, or a forwarder altering the message; treat these as hypotheses until the raw evidence supports them.
5. Change one sender-side identity or DNS setting only after an owner approves the proposed diff. Re-send through the same stream and compare fresh `Authentication-Results`, `Return-Path`, DKIM `d=`, and message ID. A dashboard change alone is not a fix.

## Stop conditions and rollback

Stop when messages from one campaign carry inconsistent identities, the proposed fix would remove a working DKIM signature, an SPF change has no accountable owner, or the receiver result cannot be tied to a message. Preserve the old From address, envelope, selector, DNS RRset, provider setting, and sample. Roll back if DMARC fails on the known-good path, replies route incorrectly, another stream inherits the wrong identity, or the provider cannot reproduce the intended headers. RepMail does not rewrite provider headers, publish DNS, or control a receiving server's alignment algorithm. Keep the decision record with the [email authentication rollback plan](/repmail/learn/deliverability/email-authentication-rollback-plan) and [email authentication hub](/repmail/learn/deliverability/email-authentication).

## References

1. [RFC 7489 — DMARC](https://datatracker.ietf.org/doc/html/rfc7489)
2. [Microsoft Learn — email authentication guidance](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about)
