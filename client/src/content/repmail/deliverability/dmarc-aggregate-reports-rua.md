---
product: "repmail"
academy: "deliverability"
contentType: "guide"
slug: "dmarc-aggregate-reports-rua"
title: "DMARC Aggregate Reports: How to Read rua Data"
description: "A practical guide to dmarc aggregate reports: evidence, safe checks, edge cases, and a controlled next step."
authorSlug: "repmail-team"
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["email-authentication", "dmarc"]
learningPaths: ["deliverability-mastery"]
assets: [{"type": "table", "title": "Evidence and decision table", "content": {"headers": ["Question", "Evidence to collect", "Decision boundary"], "rows": [["Identity", "aggregate XML evidence", "Use the exact domain, selector, host, or header field"], ["Validation", "group source, count, policy, and alignment fields", "Record source, resolver/receiver, timestamp, and result"], ["Edge case", "a rua report is not an inbox-placement measurement", "Do not infer a broader outcome than the evidence supports"], ["Recovery", "Saved prior state and named owner", "Change or roll back deliberately"]]}}]
keyTakeaways: ["Start with aggregate XML evidence and preserve raw evidence before editing.", "Make one reversible change and verify the real message or DNS path.", "Keep the boundary in view: A rua report is not an inbox-placement measurement."]
commonMistakes: ["Treating one dashboard label or local lookup as proof of end-to-end authentication.", "Changing several DNS or sender settings at once, which removes the comparison point.", "Assuming a pass for one identity proves alignment or placement for every identity."]
faqs: [{"question": "What should I check first for dmarc aggregate reports?", "answer": "Start with the exact identity and raw evidence: aggregate XML evidence. Capture the source, timestamp, resolver or receiver, and current configuration before making a change."}, {"question": "Can one successful test prove the issue is fixed?", "answer": "No. A test is time- and path-specific evidence. Repeat the relevant DNS, message, SMTP, or report check for each active stream and record its provider context."}, {"question": "What should I preserve before changing authentication settings?", "answer": "Save the current DNS answer or message evidence, the owner and timestamp, the proposed diff, and the rollback decision. This makes before-and-after comparison possible when caches or delayed mail obscure the result."}]
nextStep: {"label": "Review the email authentication hub", "href": "/repmail/learn/deliverability/email-authentication", "description": "Use the hub to choose the next protocol or diagnostic guide."}
collections: ["email-authentication-essentials"]
---

Dmarc aggregate reports is best handled as a bounded evidence problem, not a guess based on one dashboard label. **Aggregate xml evidence** is the useful starting point: collect the exact identity, record, header, or SMTP exchange involved, then compare it with what the receiver actually evaluated.

## The short answer

Use a sanitized sample and explain source attribution, pass/fail counts, alignment, policy applied, and privacy handling; avoid promises about report frequency. The safe workflow is to inventory the current state, test the real sending path, make one reversible change, and verify the result with fresh evidence. This page focuses on that task rather than repeating a general SPF, DKIM, or DMARC introduction.

## Decision table

| Question | Evidence to collect | Decision boundary |
|---|---|---|
| Identity | aggregate XML evidence | Use the exact domain, selector, host, or header field |
| Validation | group source, count, policy, and alignment fields | Record source, resolver/receiver, timestamp, and result |
| Edge case | a rua report is not an inbox-placement measurement | Do not infer a broader outcome than the evidence supports |
| Recovery | Saved prior state and named owner | Change or roll back deliberately |

## Practical workflow

1. Define the question in terms of aggregate XML evidence. Write down the sending stream, domain or selector, provider, owner, and time window. If the question came from a dashboard, keep the raw message, DNS answer, SMTP reply, or report that supports it.
2. Collect evidence before editing configuration: group source, count, policy, and alignment fields. Compare authoritative and recursive DNS where relevant, and compare a real received message with the configured values. A single local lookup or vendor status page is not a complete test.
3. Make the smallest controlled change that addresses the observed failure. Preserve the prior value, approval, exact diff, and rollback owner. Keep SPF, DKIM, DMARC, DNS, transport, and placement observations in separate fields so one pass does not mask another failure.
4. Re-test the same path and at least one representative edge case. Interpret the result conservatively: a rua report is not an inbox-placement measurement. Record what remains unknown, who owns the next check, and when the configuration should be reviewed again.

## Edge cases and limits

The most important boundary is this: A rua report is not an inbox-placement measurement. Resolver caches, forwarding, multiple sending streams, provider-specific processing, and delayed messages can make two apparently similar tests disagree. Label an outcome as observed, inferred, or unknown. Do not turn an unmeasured demand signal or one successful test into a guarantee about delivery, placement, or receiver behavior.

## RepMail relevance

For a RepMail sending stream, use the same evidence discipline before changing domain authentication: preserve the raw header or DNS answer, identify the stream owner, and keep a rollback record. The [email authentication hub](/repmail/learn/deliverability/email-authentication) provides the broader map; the links below are the closest task-specific references.

## Further reading

[What Is Dmarc](/repmail/learn/deliverability/what-is-dmarc) · [Read Authentication Results](/repmail/learn/deliverability/read-authentication-results) · [Dmarc](/repmail/learn/glossary/dmarc)

## RUA evidence worksheet

Treat each aggregate report as a bounded observation about the reporting receiver and its reporting interval. Preserve the original XML (or a redacted, integrity-preserving copy), filename, report ID, submitting organization, policy domain, begin/end timestamps, and receipt timestamp before importing it into a dashboard. The `rua` destination is a reporting address; receiving a report does not measure inbox placement or prove that every receiver reports.

| XML area | Record | What to compare | Stop condition |
|---|---|---|---|
| `report_metadata` | org, report ID, date range | Duplicate IDs and unexpected reporters | Stop on unverifiable or duplicate data |
| `policy_published` | domain, `p`, `sp`, `pct`, alignment | The policy actually observed by the reporter | Stop if it is not the expected DNS policy |
| `record` identifiers | envelope-from and header-from | Stream attribution and alignment | Stop if a vendor is assigned to the wrong owner |
| `row` results | source IP, count, disposition | SPF/DKIM result versus DMARC alignment | Stop if counts are treated as message-level certainty |
| `auth_results` | SPF domain, DKIM domain/selector | Match to raw headers and sender inventory | Stop if a result lacks enough context |

RFC 7489 describes DMARC identifier alignment and aggregate reporting, but report formats and timing can vary by reporter. Group the evidence by source IP, header `From` domain, envelope domain, DKIM `d=`, and selector; then map each group to a known stream. A high count with `dmarc=pass` is not a guarantee of delivery, and a single `dmarc=fail` group is not automatically abuse. Compare the group with the [read-authentication-results guide](/repmail/learn/deliverability/read-authentication-results) and the [email authentication incident evidence pack](/repmail/learn/deliverability/email-authentication-incident-evidence-pack).

## Failure cases, privacy, and verification

Expect missing reports, delayed reports, compressed attachments, malformed XML, duplicate report IDs, and third-party report senders. Do not treat a missing report as a DMARC failure or an empty day as zero mail. Redact recipient addresses and message samples before sharing a report outside the people who need them; preserve enough fields to reproduce the attribution decision. If an external destination is used for `rua`, verify the destination authorization requirement and document which domain owner approved it rather than assuming that any mailbox can receive reports.

Stop analysis when the report's policy domain does not match the DNS policy you queried, the report interval is outside the declared window, the XML cannot be parsed, or the same message stream appears under conflicting owners. Verify a suspected fix with fresh reports from the same reporting organizations over a stated interval and, separately, with raw received-message headers. Do not raise enforcement based on one clean report or lower enforcement because a report is absent.

## Rollback and next links

Save the prior DMARC record, `rua` destination, report-parser configuration, access list, and sample evidence. If a destination change causes report loss or exposes data to an unapproved recipient, restore the prior destination and stop processing new data until access is reviewed. RepMail does not solicit, route, parse, or guarantee provider reports; it can help maintain the worksheet. Continue with the [email authentication hub](/repmail/learn/deliverability/email-authentication), [DMARC alignment guide](/repmail/learn/deliverability/dmarc-alignment-explained), and [provider-specific triage](/repmail/learn/deliverability/provider-specific-deliverability-triage).


## References

1. [RFC 7489 — DMARC](https://datatracker.ietf.org/doc/html/rfc7489)
2. [Google Workspace Admin Help — sender authentication](https://support.google.com/a/answer/81126)
3. [Microsoft Learn — email authentication guidance](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-troubleshoot)
