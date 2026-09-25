---
product: repmail
academy: deliverability
contentType: guide
slug: bounce-spike-after-dns-change
title: "Bounce Spike After a DNS Change: Prove Configuration Regression"
description: "Bounce Spike After a DNS Change: Prove Configuration Regression — A DNS/authentication change coincides with delivery failure."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability","reputation","dns","bounce","incident","spike","change","prove"]
assets:
  - type: table
    title: "Decision table: quick diagnostics to prove or rule out DNS/auth regression"
    content:
      headers: ["Observed symptom","Decisive evidence to check","Action if present","Stop condition"]
      rows:
        - ["Sudden 5xx bounces citing authentication/text mentioning \"spf\"/\"dkim\"","Authoritative TXT mismatch for SPF/DKIM/DMARC or failed DKIM verification","Rollback DNS/DKIM to previous record; verify authoritative response; repeat test send","Authoritative record restored and test send accepted"]
        - ["Soft 4xx (temporary) bounces after change","Authoritative records correct but propagation TTL still in flight or public caches differ","Wait up to max TTL, re-query authoritative server; monitor bounce trend; avoid rollback","Public resolvers show correct record and bounces subside"]
        - ["Generic 5xx without authentication text","SMTP transcript showing provider rejection code and any diagnostic text; check non-auth vectors","Investigate provider policy, IP reputation, and throttling; do not rollback DNS unless auth evidence exists","Provider log or SMTP transcript explicitly cites auth failure or DNS evidence found"]
        - ["DKIM verification intermittently fails for some recipients","DKIM selector record missing or key mismatch on authoritative server; local signer logs show rotation","Restore correct selector/key; re-sign outbound or roll back rotation; test sign and verify","DKIM verifies consistently across test recipients"]
        - ["Bounces only for one ISP or region","Authoritative server correct but regional resolver cache differs; traceroute/EDNS checks","Contact ISP or wait for propagation; consider reissue with lower TTL next time; throttle sends to that region","Regional queries return authoritative value and bounces stop"]
featured: false
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
keyTakeaways:
  - "A DNS/authentication change coincides with delivery failure."
  - "Narrow regression workflow, not SPF/DKIM/DMARC setup."
  - "Links authentication change control to bounce incidents."
commonMistakes:
  - "Skipping this check: Record exact change window: commit ID, ticket, operator, timestamps"
  - "Skipping this check: Export SMTP logs for the incident window and identify representative bounce samples"
  - "Skipping this check: Query authoritative nameservers for TXT/DKIM/DMARC records and save raw responses"
faqs:
  - question: "Can I rely on provider bounce text to prove a DNS/authentication regression?"
    answer: "Provider bounce text can be directional but is not definitive. Some providers return vague or templated messages; use them as a lead but confirm with authoritative DNS queries and DKIM signature verification. When provider guidance names authentication as the reason, treat it as supportive evidence rather than sole proof [1][2]."
  - question: "How long should I wait for DNS propagation before rolling back a DNS change?"
    answer: "If authoritative responses are already correct and the issue is cache propagation, waiting up to the prior TTL is reasonable. If bounces are severe and authoritative records are wrong, perform an immediate rollback. State uncertainty: exact propagation behavior varies by resolver and provider, so use authoritative checks and controlled test sends to decide."
  - question: "If I must roll back, will that fix reputation-related blocks?"
    answer: "Rolling back a configuration regression can stop authentication-based rejections, but it does not automatically reverse any reputation or manual blocks imposed by receivers. Use rollback to stop ongoing damage; follow with provider-specific sender support if reputation remediation is required."
nextStep:
  label: "Continue with Provider-Specific Deliverability Triage: Gmail, Microsoft, and More"
  href: "/repmail/learn/deliverability/provider-specific-deliverability-triage"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

If a DNS or authentication change lines up with a sudden bounce spike, treat it as a potential configuration regression and run a focused regression diagnosis before escalating. This guide gives a narrow, evidence-first workflow to prove whether the change caused the bounces and to decide about rollback or targeted mitigation.

## Scope the incident and collect minimally sufficient evidence

First, identify the exact change window (timestamp, person, CI commit or ticket) and list affected sending domains and IPs. Limit scope to the smallest set that shares the change — one domain, one subdomain, or one sending IP block — to avoid conflating unrelated issues.
Next, pull delivery telemetry covering at least 2–4 hours before and after the change: bounce counts, SMTP error codes, provider rejection messages, and campaign IDs. Retain raw SMTP logs (ENHANCED/Bounce strings) and any DNS server change logs or replication timestamps. These items are the minimal evidence to link configuration to failures.

## Map likely regression vectors and decisive artifacts

A DNS/authentication regression will usually appear in one of three vectors: (1) missing or incorrect TXT records (SPF/DKIM/DMARC), (2) changed TXT content (key rotation or truncated records), or (3) DNS propagation to a provider-reliant resolver causing mismatch. For each vector, list the definitive artifact to check: DNS TXT content at authoritative server, DKIM selector private key rotation records or signer logs, and DNS TTL/AXFR/change events.
Evidence limits: provider bounce messages sometimes hide the exact rejection reason and only provide a generic SMTP code. Use provider-specific published guidance as directional support rather than an exact diagnostic [1][2]. When provider messages are vague, SMTP logs and DNS authoritative responses are the decisive evidence.

## Step-by-step regression test sequence

1) Verify authoritative DNS immediately: query the authoritative nameserver for the exact TXT/DKIM records and compare with the last known good commit. Use dig/host against the authoritative server, not just public caches. 2) Validate DKIM by fetching the selector TXT record and performing a cryptographic check against sample signed messages when available.
3) Reproduce the failure from a controlled external vantage: send a test message from the implicated domain to a controlled inbox at the failing provider and capture the SMTP transaction. If the provider returns a 5xx rejection that matches campaign bounces, the regression link strengthens. Stop condition: if an authoritative record mismatch or failed DKIM verification is found, you have sufficient evidence for rollback or targeted fix.

## Use provider rejection patterns to prioritize actions

Map common SMTP responses to actions: 550 or 5xx with authentication-related text suggests SPF/DKIM/DMARC mismatch and prioritizes rollbacks or record correction; temporary 4xx soft bounces may indicate propagation or transient resolver issues and favor wait/monitor steps. Check provider-specific guidance for wording patterns; Microsoft and Google publish sender support pages that can be used as directional references for common rejection types [1][2].
Decision boundary: do not equate a generic 550 with an authentication regression without DNS/DKIM evidence. Provider messages can be ambiguous; only proceed to a full rollback if DNS/DKIM checks reproduce the fault or the provider explicitly cites authentication failure.

## Rollback, targeted fixes, and minimization of exposure

If your evidence shows the change caused the bounces (authoritative TXT mismatch, failed DKIM verification, or reproduced 5xx authentication rejection), choose the least-impactful corrective action: restore the previous DNS TXT content and verify propagation on authoritative servers, re-deploy the previous DKIM key or selector, or correct a syntax error. Verify fixes by repeating controlled sends and checking SMTP transactions.
If evidence is insufficient but bounces are severe, isolate traffic: pause the impacted campaign(s), throttle sends from the domain/IP, and use a fallback authenticated subdomain or separate sending domain if available. Stop condition for rollback: confirmed reproduction of the authentication failure or inability to fix the record quickly.

## Post-incident forensic and control updates

After recovery, preserve all artifacts: authoritative DNS query results, SMTP session logs, change tickets, and the exact timestamps of revert actions. Create a short incident report that links the change commit to the failure artifacts and the chosen remediation path.
Update change control: require authoritative server checks and signed key rotation steps in future changes, add a short verification test (test send + SMTP log capture) as a mandatory post-change gate, and record TTL considerations to avoid long propagation windows in future.

## Practical checklist

- [ ] Record exact change window: commit ID, ticket, operator, timestamps
- [ ] Export SMTP logs for the incident window and identify representative bounce samples
- [ ] Query authoritative nameservers for TXT/DKIM/DMARC records and save raw responses
- [ ] Run DKIM verification against a signed sample and compare keys/selectors to prior version
- [ ] Perform a controlled test send to the failing provider and capture the SMTP transcript
- [ ] Compare authoritative records to the last known-good record file or CI artifact
- [ ] If evidence shows regression, restore previous DNS/TXT/DKIM configuration on authoritative server
- [ ] If evidence is inconclusive but impact is high, throttle/pause campaigns and use a fallback domain
- [ ] Document all artifacts and update change control to add post-deploy verification gates

## Where RepMail fits

Use this guide as an operational decision aid during an outbound incident: follow the evidence-first checklist to prove whether an authentication/DNS change caused a bounce spike, minimize campaign exposure while you test, and generate the precise artifacts needed for rollback or escalation. This article is a workflow; integrate its checks into your change-control and incident playbooks so operators can act quickly and with confidence.

Continue with [Provider-Specific Deliverability Triage: Gmail, Microsoft, and More](/repmail/learn/deliverability/provider-specific-deliverability-triage) for the next step in the workflow.

## Related RepMail guides

- [Bounce Incident Triage: Separate DNS, Recipient, Policy, and Reputation Failures](/repmail/learn/deliverability/bounce-incident-triage-dns-recipient-policy-reputation)
- [Complaint Spike by Cohort: Find the Segment Causing the Damage](/repmail/learn/deliverability/complaint-spike-cohort-analysis)


## Sources

[1]: https://support.google.com/mail/answer/81126?hl=en "Google sender or Workspace documentation"
[2]: https://support.microsoft.com/en-us/outlook/sender-support-in-outlook-com "Microsoft documentation"
