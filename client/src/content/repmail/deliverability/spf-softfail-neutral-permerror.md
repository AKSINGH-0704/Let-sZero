---
product: "repmail"
academy: "deliverability"
contentType: "glossary-term"
slug: "spf-softfail-neutral-permerror"
title: "SPF Softfail, Neutral, and Permerror: What Each Result Means"
description: "A practical guide to spf softfail neutral permerror: evidence, safe checks, edge cases, and a controlled next step."
authorSlug: "repmail-team"
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["email-authentication", "spf"]
learningPaths: ["deliverability-mastery"]
assets: [{"type": "table", "title": "Evidence and decision table", "content": {"headers": ["Question", "Evidence to collect", "Decision boundary"], "rows": [["Identity", "SPF result semantics", "Use the exact domain, selector, host, or header field"], ["Validation", "identify the checked identity and exact result", "Record source, resolver/receiver, timestamp, and result"], ["Edge case", "an SPF result alone does not predict placement", "Do not infer a broader outcome than the evidence supports"], ["Recovery", "Saved prior state and named owner", "Change or roll back deliberately"]]}}]
keyTakeaways: ["Start with SPF result semantics and preserve raw evidence before editing.", "Make one reversible change and verify the real message or DNS path.", "Keep the boundary in view: An spf result alone does not predict placement."]
commonMistakes: ["Treating one dashboard label or local lookup as proof of end-to-end authentication.", "Changing several DNS or sender settings at once, which removes the comparison point.", "Assuming a pass for one identity proves alignment or placement for every identity."]
faqs: [{"question": "What should I check first for spf softfail neutral permerror?", "answer": "Start with the exact identity and raw evidence: SPF result semantics. Capture the source, timestamp, resolver or receiver, and current configuration before making a change."}, {"question": "Can one successful test prove the issue is fixed?", "answer": "No. A test is time- and path-specific evidence. Repeat the relevant DNS, message, SMTP, or report check for each active stream and record its provider context."}, {"question": "What should I preserve before changing authentication settings?", "answer": "Save the current DNS answer or message evidence, the owner and timestamp, the proposed diff, and the rollback decision. This makes before-and-after comparison possible when caches or delayed mail obscure the result."}]
nextStep: {"label": "Review the email authentication hub", "href": "/repmail/learn/deliverability/email-authentication", "description": "Use the hub to choose the next protocol or diagnostic guide."}
collections: ["email-authentication-essentials"]
---

Spf softfail neutral permerror is best handled as a bounded evidence problem, not a guess based on one dashboard label. **Spf result semantics** is the useful starting point: collect the exact identity, record, header, or SMTP exchange involved, then compare it with what the receiver actually evaluated.

## The short answer

Include none, neutral, pass, fail, softfail, temperror, and permerror with next checks; quote the standard’s semantics rather than inferring delivery outcomes. The safe workflow is to inventory the current state, test the real sending path, make one reversible change, and verify the result with fresh evidence. This page focuses on that task rather than repeating a general SPF, DKIM, or DMARC introduction.

## Decision table

| Question | Evidence to collect | Decision boundary |
|---|---|---|
| Identity | SPF result semantics | Use the exact domain, selector, host, or header field |
| Validation | identify the checked identity and exact result | Record source, resolver/receiver, timestamp, and result |
| Edge case | an SPF result alone does not predict placement | Do not infer a broader outcome than the evidence supports |
| Recovery | Saved prior state and named owner | Change or roll back deliberately |

## Practical workflow

1. Define the question in terms of SPF result semantics. Write down the sending stream, domain or selector, provider, owner, and time window. If the question came from a dashboard, keep the raw message, DNS answer, SMTP reply, or report that supports it.
2. Collect evidence before editing configuration: identify the checked identity and exact result. Compare authoritative and recursive DNS where relevant, and compare a real received message with the configured values. A single local lookup or vendor status page is not a complete test.
3. Make the smallest controlled change that addresses the observed failure. Preserve the prior value, approval, exact diff, and rollback owner. Keep SPF, DKIM, DMARC, DNS, transport, and placement observations in separate fields so one pass does not mask another failure.
4. Re-test the same path and at least one representative edge case. Interpret the result conservatively: an SPF result alone does not predict placement. Record what remains unknown, who owns the next check, and when the configuration should be reviewed again.

## Edge cases and limits

The most important boundary is this: An spf result alone does not predict placement. Resolver caches, forwarding, multiple sending streams, provider-specific processing, and delayed messages can make two apparently similar tests disagree. Label an outcome as observed, inferred, or unknown. Do not turn an unmeasured demand signal or one successful test into a guarantee about delivery, placement, or receiver behavior.

## RepMail relevance

For a RepMail sending stream, use the same evidence discipline before changing domain authentication: preserve the raw header or DNS answer, identify the stream owner, and keep a rollback record. The [email authentication hub](/repmail/learn/deliverability/email-authentication) provides the broader map; the links below are the closest task-specific references.

## Further reading

[What Is Spf](/repmail/learn/deliverability/what-is-spf) · [Read Authentication Results](/repmail/learn/deliverability/read-authentication-results) · [Spf](/repmail/learn/glossary/spf)

## References

1. [RFC 7208 — Sender Policy Framework](https://datatracker.ietf.org/doc/html/rfc7208)
2. [Microsoft Learn — email authentication guidance](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-troubleshoot)
