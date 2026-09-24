---
product: repmail
academy: infrastructure
contentType: template
slug: email-dns-change-validation-checklist
title: "Email DNS Change Validation Checklist"
description: "Validate email DNS changes with authoritative and recursive lookups, header evidence, propagation notes, and rollback documentation."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["dns", "spf", "dkim", "dmarc", "change-management"]
collections: ["email-infrastructure-decisions", "email-platform-essentials"]
learningPaths: ["email-infrastructure"]

keyTakeaways:
  - "Capture the old DNS answer before editing."
  - "Check authoritative answers separately from recursive resolver results."
  - "A correct DNS answer does not prove inbox placement; verify real headers and events."
faqs:
  - question: "What is the difference between authoritative and recursive DNS lookups?"
    answer: "An authoritative lookup checks the zone’s published source; a recursive lookup shows what a resolver currently serves from cache or after refresh."
  - question: "Does DNS propagation prove authentication?"
    answer: "No. Send a controlled message and inspect authentication results and provider evidence after the relevant record is visible."
  - question: "What should be in rollback documentation?"
    answer: "The prior record values, owner, expected trigger, restoration method, and post-rollback verification steps."
nextStep:
  label: "Plan authentication changes safely"
  href: /repmail/learn/deliverability/email-authentication-change-management
  description: "Continue with the closest operational guide."
assets:
  - type: checklist
    title: DNS change validation
    content: {"headers": ["Check", "Pre-change", "Post-change"], "rows": [["Authoritative record and TTL", "[ ]", "[ ]"], ["Recursive resolver answers", "[ ]", "[ ]"], ["Provider console status", "[ ]", "[ ]"], ["Authentication-Results header", "[ ]", "[ ]"], ["Rollback value and owner", "[ ]", "[ ]"]]}
---

An email DNS change validation checklist should prove three things: what was published, what resolvers return, and what a real message shows. Keep these evidence layers separate. A successful DNS lookup is necessary for many changes, but it does not prove receiver acceptance or inbox placement.

## Capture a baseline

Before editing, record the exact owner name, record type, all values, TTL, authoritative nameserver, and lookup timestamp. Cover the relevant MX, SPF, DKIM selector, DMARC, and provider verification records. The [DNS records guide](/repmail/learn/infrastructure/dns-records-for-email) explains their roles. Save the prior values and rollback owner in the change ticket.

## Validate authoritative and recursive answers

Query the authoritative nameserver to confirm the zone’s source of truth. Then query more than one recursive resolver to observe caching and propagation. Note the answer, resolver, timestamp, and TTL. A recursive answer that still shows the old value is propagation evidence, not necessarily a failed authoritative change. Do not guarantee a timing window; measure it.

## Send and inspect a real message

Use a controlled message from each affected stream. Inspect From, Return-Path, DKIM selector and signing domain, and `Authentication-Results` with [header-reading guidance](/repmail/learn/deliverability/read-authentication-results). Confirm provider console status and downstream events. Use [authentication change management](/repmail/learn/deliverability/email-authentication-change-management) when several records or providers change together.

## Close or roll back

Compare the observed result with the expected result. If authentication fails, a provider cannot verify the record, or the wrong sender remains authorized, pause the rollout and restore the documented prior value. Record the evidence, decision, and next owner. Do not mark the change successful because a single public DNS tool shows the new answer.

## Related resources

The [Email Infrastructure academy](/repmail/learn/infrastructure/email-infrastructure-explained) is the hub for DNS and change validation.

This workflow should be checked against the cited standards and current provider documentation [1].

## Build a pre/post DNS evidence pack

Before a change record purpose, owner, requested value, TTL, window, rollback value, and verification plan. Capture authoritative nameserver and recursive resolver results; one cached lookup cannot establish propagation. Syntax validity is separate from receiver behavior.

| Check | Evidence | Stop rule |
| --- | --- | --- |
| Scope | domain, name/type, purpose, owner | Stop if owner is unclear |
| Baseline | before value, TTL, authoritative answer | Stop without rollback value |
| Syntax | quoting, escaping, duplicate SPF check | Stop on malformed/duplicate policy |
| Alignment | SPF/DKIM/DMARC test | Stop when From domain is uncovered |
| Propagation | authoritative plus two resolvers | Qualify until TTL differences settle |
| Send test | controlled message, headers, result | Stop ramp on auth/TLS failure |
| Rollback | ticket, approver, observation window | Stop when owner cannot revert |

Consult [RFC 7208](https://www.rfc-editor.org/rfc/rfc7208), [RFC 7489](https://www.rfc-editor.org/rfc/rfc7489), and the [Google sender guidelines](https://support.google.com/mail/answer/81126). After TTL expiry save raw outputs, headers, timestamps, and tickets. Do not delete the old record first when staging is possible. Reopen after delegation, DNSSEC, selector, provider, or ownership changes.

## References

[1]: https://knowledge.workspace.google.com/admin/security/set-up-spf "Google Workspace SPF setup"
[2]: https://knowledge.workspace.google.com/admin/security/set-up-dkim "Google Workspace DKIM setup"
[3]: https://knowledge.workspace.google.com/admin/security/set-up-dmarc "Google Workspace DMARC setup"
[4]: https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about "Microsoft Defender email authentication"

