---
product: "repmail"
academy: "deliverability"
contentType: "guide"
slug: "disaster-recovery-secondary-sender-authentication"
title: "Authentication records for disaster recovery and secondary senders"
description: "A practical guide to email authentication disaster recovery sender: evidence, safe checks, edge cases, and a controlled next step."
authorSlug: "repmail-team"
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["email-authentication", "dns"]
learningPaths: ["deliverability-mastery"]
assets: [{"type": "table", "title": "Evidence and decision table", "content": {"headers": ["Question", "Evidence to collect", "Decision boundary"], "rows": [["Identity", "a preauthorized but controlled backup", "Use the exact domain, selector, host, or header field"], ["Validation", "define activation, alignment, reporting, and deactivation", "Record source, resolver/receiver, timestamp, and result"], ["Edge case", "a backup sender expands the authorized sending surface", "Do not infer a broader outcome than the evidence supports"], ["Recovery", "Saved prior state and named owner", "Change or roll back deliberately"]]}}]
keyTakeaways: ["Start with a preauthorized but controlled backup and preserve raw evidence before editing.", "Make one reversible change and verify the real message or DNS path.", "Keep the boundary in view: A backup sender expands the authorized sending surface."]
commonMistakes: ["Treating one dashboard label or local lookup as proof of end-to-end authentication.", "Changing several DNS or sender settings at once, which removes the comparison point.", "Assuming a pass for one identity proves alignment or placement for every identity."]
faqs: [{"question": "What should I check first for email authentication disaster recovery sender?", "answer": "Start with the exact identity and raw evidence: a preauthorized but controlled backup. Capture the source, timestamp, resolver or receiver, and current configuration before making a change."}, {"question": "Can one successful test prove the issue is fixed?", "answer": "No. A test is time- and path-specific evidence. Repeat the relevant DNS, message, SMTP, or report check for each active stream and record its provider context."}, {"question": "What should I preserve before changing authentication settings?", "answer": "Save the current DNS answer or message evidence, the owner and timestamp, the proposed diff, and the rollback decision. This makes before-and-after comparison possible when caches or delayed mail obscure the result."}]
nextStep: {"label": "Review the email authentication hub", "href": "/repmail/learn/deliverability/email-authentication", "description": "Use the hub to choose the next protocol or diagnostic guide."}
collections: ["email-authentication-essentials"]
---

Email authentication disaster recovery sender is best handled as a bounded evidence problem, not a guess based on one dashboard label. **A preauthorized but controlled backup** is the useful starting point: collect the exact identity, record, header, or SMTP exchange involved, then compare it with what the receiver actually evaluated.

## The short answer

Include activation criteria and tests while warning that preauthorizing a backup sender changes the spoofing surface. The safe workflow is to inventory the current state, test the real sending path, make one reversible change, and verify the result with fresh evidence. This page focuses on that task rather than repeating a general SPF, DKIM, or DMARC introduction.

## Decision table

| Question | Evidence to collect | Decision boundary |
|---|---|---|
| Identity | a preauthorized but controlled backup | Use the exact domain, selector, host, or header field |
| Validation | define activation, alignment, reporting, and deactivation | Record source, resolver/receiver, timestamp, and result |
| Edge case | a backup sender expands the authorized sending surface | Do not infer a broader outcome than the evidence supports |
| Recovery | Saved prior state and named owner | Change or roll back deliberately |

## Practical workflow

1. Define the question in terms of a preauthorized but controlled backup. Write down the sending stream, domain or selector, provider, owner, and time window. If the question came from a dashboard, keep the raw message, DNS answer, SMTP reply, or report that supports it.
2. Collect evidence before editing configuration: define activation, alignment, reporting, and deactivation. Compare authoritative and recursive DNS where relevant, and compare a real received message with the configured values. A single local lookup or vendor status page is not a complete test.
3. Make the smallest controlled change that addresses the observed failure. Preserve the prior value, approval, exact diff, and rollback owner. Keep SPF, DKIM, DMARC, DNS, transport, and placement observations in separate fields so one pass does not mask another failure.
4. Re-test the same path and at least one representative edge case. Interpret the result conservatively: a backup sender expands the authorized sending surface. Record what remains unknown, who owns the next check, and when the configuration should be reviewed again.

## Edge cases and limits

The most important boundary is this: A backup sender expands the authorized sending surface. Resolver caches, forwarding, multiple sending streams, provider-specific processing, and delayed messages can make two apparently similar tests disagree. Label an outcome as observed, inferred, or unknown. Do not turn an unmeasured demand signal or one successful test into a guarantee about delivery, placement, or receiver behavior.

## RepMail relevance

For a RepMail sending stream, use the same evidence discipline before changing domain authentication: preserve the raw header or DNS answer, identify the stream owner, and keep a rollback record. The [email authentication hub](/repmail/learn/deliverability/email-authentication) provides the broader map; the links below are the closest task-specific references.

## Further reading

[Authentication Multiple Sending Services](/repmail/learn/deliverability/authentication-multiple-sending-services) · [Email Authentication Rollback Plan](/repmail/learn/deliverability/email-authentication-rollback-plan) · [Dkim Selector Rotation](/repmail/learn/deliverability/dkim-selector-rotation)

## Secondary-sender readiness matrix

A disaster-recovery sender is not ready merely because its DNS records exist. Test the complete alternate path while the primary path remains unchanged, and document which identity is activated during failover.

| Control | Primary path evidence | Secondary path evidence | Pass/stop rule |
|---|---|---|---|
| Visible `From` domain |  |  | Stop if failover changes the customer-facing identity unexpectedly |
| Envelope `MAIL FROM` |  |  | Stop if SPF passes only for an unrelated domain |
| DKIM selector and `d=` |  |  | Stop if the private key is unavailable or `d=` is not aligned |
| SPF TXT and lookup graph |  |  | Stop if the secondary adds a second SPF record or exceeds limits |
| DMARC policy and reports |  |  | Stop if the secondary is absent from aggregate evidence |
| Provider credentials and sender approval |  |  | Stop if the owner or access path is untested |
| Suppression, reply, and unsubscribe routes |  |  | Stop if recipients can be mailed again or cannot opt out |

Publish and verify secondary DNS records before an incident, but do not activate the secondary sender in production until ownership, key custody, rate limits, and templates are tested. A backup DKIM selector is useful only if the secondary can actually sign with its corresponding private key and the public key is available at the selector's DNS name. The [email authentication incident evidence pack](/repmail/learn/deliverability/email-authentication-incident-evidence-pack) and [email deliverability regression testing](/repmail/learn/deliverability/email-deliverability-regression-testing) pages are useful adjacent runbooks.

## Failover test and stop conditions

Use a controlled recipient set and a declared test window. Record the trigger, sender identity, provider, message ID, SMTP response, raw headers, DNS answers, and report destination. Test at least one transactional message and, if applicable, one marketing message; a successful emergency notification does not prove that every stream is authenticated. Verify SPF's evaluated `smtp.mailfrom`, DKIM verification and `d=`, DMARC alignment, reply routing, suppression behavior, and one-click unsubscribe behavior where the stream requires it.

Stop the test and return to the primary path if the secondary emits an unauthenticated or misaligned message, creates a duplicate `From` identity, sends to suppressed recipients, loses inbound replies, or causes a receiver rejection or unexpected deferral. Also stop if DNS answers differ between authoritative servers or if a key rotation has not propagated to the resolver used by the test. Do not widen DMARC policy, add an unreviewed include, or lower a control during the incident merely to make the test appear to pass.

## Rollback checklist

Before activation, save primary and secondary DNS RRsets, provider settings, key ownership, templates, suppression exports, and the last known-good headers. During rollback, disable the secondary sending route, restore the primary route, confirm that no queued messages still use the secondary identity, and re-test one message. RepMail does not switch your provider, fail over DNS, or operate your disaster-recovery sender; it can document the decision and evidence. Reconcile the result with the [email authentication hub](/repmail/learn/deliverability/email-authentication), [authentication change management](/repmail/learn/deliverability/email-authentication-change-management), and [multiple-sending-services guide](/repmail/learn/deliverability/authentication-multiple-sending-services).


## References

1. [RFC 7208 — Sender Policy Framework](https://datatracker.ietf.org/doc/html/rfc7208)
2. [RFC 6376 — DKIM Signatures](https://datatracker.ietf.org/doc/html/rfc6376)
3. [RFC 7489 — DMARC](https://datatracker.ietf.org/doc/html/rfc7489)
