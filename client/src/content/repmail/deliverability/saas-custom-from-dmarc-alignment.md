---
product: "repmail"
academy: "deliverability"
contentType: "guide"
slug: "saas-custom-from-dmarc-alignment"
title: "DMARC alignment test matrix for SaaS custom From domains"
description: "A practical guide to saas custom from dmarc alignment: evidence, safe checks, edge cases, and a controlled next step."
authorSlug: "repmail-team"
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["email-authentication", "dmarc"]
learningPaths: ["deliverability-mastery"]
assets: [{"type": "table", "title": "Evidence and decision table", "content": {"headers": ["Question", "Evidence to collect", "Decision boundary"], "rows": [["Identity", "a custom-From test matrix", "Use the exact domain, selector, host, or header field"], ["Validation", "vary From, envelope, DKIM d=, selector, and receiver", "Record source, resolver/receiver, timestamp, and result"], ["Edge case", "a vendor verification badge is not raw-message evidence", "Do not infer a broader outcome than the evidence supports"], ["Recovery", "Saved prior state and named owner", "Change or roll back deliberately"]]}}]
keyTakeaways: ["Start with a custom-From test matrix and preserve raw evidence before editing.", "Make one reversible change and verify the real message or DNS path.", "Keep the boundary in view: A vendor verification badge is not raw-message evidence."]
commonMistakes: ["Treating one dashboard label or local lookup as proof of end-to-end authentication.", "Changing several DNS or sender settings at once, which removes the comparison point.", "Assuming a pass for one identity proves alignment or placement for every identity."]
faqs: [{"question": "What should I check first for saas custom from dmarc alignment?", "answer": "Start with the exact identity and raw evidence: a custom-From test matrix. Capture the source, timestamp, resolver or receiver, and current configuration before making a change."}, {"question": "Can one successful test prove the issue is fixed?", "answer": "No. A test is time- and path-specific evidence. Repeat the relevant DNS, message, SMTP, or report check for each active stream and record its provider context."}, {"question": "What should I preserve before changing authentication settings?", "answer": "Save the current DNS answer or message evidence, the owner and timestamp, the proposed diff, and the rollback decision. This makes before-and-after comparison possible when caches or delayed mail obscure the result."}]
nextStep: {"label": "Review the email authentication hub", "href": "/repmail/learn/deliverability/email-authentication", "description": "Use the hub to choose the next protocol or diagnostic guide."}
collections: ["email-authentication-essentials"]
---
A SaaS custom-From rollout should be tested as a **provider matrix**, not diagnosed from a generic “DMARC failed” label. For every sending provider and real message path, record the configured custom From, vendor envelope or MAIL FROM, DKIM `d=` and selector, DNS owner and verification result, receiver, timestamp, and raw `Authentication-Results`. Roll out only when each intended provider cell has the evidence required by its own path; one successful message does not approve every stream.

## Provider configuration test matrix

Start with one row per SaaS provider, account or workspace, sending domain, template/API path, and intended receiver. Do not collapse rows merely because they share a visible From domain.

| Provider test cell | Configuration to capture | Message and DNS evidence | Cell decision |
|---|---|---|---|
| Provider/account A | Custom From, envelope/MAIL FROM, DKIM selector, sending path | Verification record, authoritative and recursive DNS, raw message ID | PASS / HOLD / NO-GO |
| Provider/account B | Same fields, even when the visible From is shared | Separate received message and `Authentication-Results` | PASS / HOLD / NO-GO |
| Provider/account C or API path | Template, API route, fallback identity, and owner | Fresh message, DKIM `d=`, SPF result, receiver and timestamp | PASS / HOLD / NO-GO |

A cell is **PASS** only when the configured identity and observed message agree and at least one passing SPF or DKIM identifier aligns with the visible From domain. Use **HOLD** when a record, message, owner, or receiver result is missing. Use **NO-GO** for an invalid signature, `dmarc=fail`, an unexpected fallback identity, or a conflict that could affect another stream.

## DNS record ownership and verification

Before changing DNS, map each requested TXT, CNAME, or provider-managed signing instruction to an exact owner name, record type, expected value, responsible DNS team, and verification timestamp. Save the current RRset and check authoritative and recursive answers. A provider dashboard can show configuration progress, but it is not proof that the production message used the intended identity. Do not publish competing values at one owner name or remove a record that another provider or selector still needs. If the provider has not documented the owner name, expected record, or scope of the change, stop and ask the accountable DNS owner to resolve the ambiguity.

The [email authentication hub](/repmail/learn/deliverability/email-authentication) provides broader protocol context. Keep the provider's verification record, selector instructions, and exact diff with the matrix rather than relying on a copied setup screen.

## Custom From versus vendor envelope

Read these identities from a received message, not only from the SaaS setup page. RFC 5322 `From:` is the visible identity that supplies the DMARC policy domain. The SMTP envelope `MAIL FROM` is commonly reflected as `Return-Path` after delivery and is the identity evaluated for SPF. DKIM `d=` is the signing domain. A vendor-controlled envelope can authenticate successfully while remaining unaligned with the visible From; similarly, a valid DKIM signature from an unrelated `d=` does not provide aligned DKIM. DMARC can pass when either SPF or DKIM both passes and aligns, subject to the receiver's evaluation. Compare the policy's `adkim` and `aspf` settings: relaxed alignment can allow organizational-domain relationships, while strict alignment requires the domains to match as specified by policy. Do not infer the mode from a vendor badge. The [DMARC alignment explanation](/repmail/learn/deliverability/dmarc-alignment-explained) and [read-authentication-results](/repmail/learn/deliverability/read-authentication-results) page provide adjacent interpretation.

## Per-provider test cells and evidence workflow

For each row, capture the exact custom-domain verification record, selector, envelope instruction, provider/account, template or API path, receiver, message ID, raw headers, DNS source, and timestamp. Send a controlled message through that provider's real production path, then compare `From`, `Return-Path`, `Authentication-Results`, SPF evaluated domain, DKIM `d=`, and selector with the configuration record. If multiple SaaS services send from one visible domain, assign each selector and envelope identity to an owner. Repeat for every active provider cell and representative fallback or edge path; a local lookup, one template, or one vendor status label is not an end-to-end test.

## Rollout and cutover criteria

Set the cutover boundary before changing traffic. Require every in-scope cell to have a recorded PASS, an owner, a fresh message, and evidence that the prior working stream remains understood. Decide which provider is allowed to send during the transition, which templates move first, what pilot size or batch boundary applies, who can pause, and what observation window will be used. These are operational controls, not promises about inbox placement or universal receiver behavior. Do not cut over when a cell still has an unknown envelope, stale DNS evidence, an invalid DKIM signature, `dmarc=fail`, a prior identity in the received message after the relevant propagation and application-cache window, or a record conflict.

## Failure cases, rollback, and limits

Save the prior DNS RRset, provider setting, selector, sample headers, cell owner, and approved diff. Apply one provider change at a time. Roll back the provider setting and restore the prior RRset if the known-good stream fails, an unrelated stream changes identity, replies route incorrectly, or the new message does not match the approved cell. Preserve the raw messages and message IDs; rollback cannot unsend mail. RepMail does not configure a SaaS provider, publish DNS, or make receivers accept a message. Continue with the [email authentication rollback plan](/repmail/learn/deliverability/email-authentication-rollback-plan) and [multiple-sending-services inventory](/repmail/learn/deliverability/authentication-multiple-sending-services).

## Further reading

[DMARC alignment failed header values](/repmail/learn/deliverability/dmarc-alignment-failed-header-values) · [Return Path Vs From Domain](/repmail/learn/infrastructure/return-path-vs-from-domain)

## References

1. [RFC 7489 — DMARC](https://datatracker.ietf.org/doc/html/rfc7489)
2. [Microsoft Learn — email authentication guidance](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about)
