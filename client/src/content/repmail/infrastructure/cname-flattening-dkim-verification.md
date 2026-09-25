---
product: repmail
academy: infrastructure
contentType: guide
slug: cname-flattening-dkim-verification
title: "CNAME Flattening and DKIM Verification: Detect DNS Interference"
description: "CNAME Flattening and DKIM Verification: Detecting Provider Interfer… — Teams using managed DNS, proxies, or flattening services."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["infrastructure","provider","dns","dkim","email","verification","cname","flattening"]
assets:
  - type: table
    title: "CNAME/DKIM Diagnostic Decision Table"
    content:
      headers: ["Observed result","Likely cause","Quick test","Next action"]
      rows:
        - ["Authoritative NS returns the platform CNAME chain and TXT exactly","Platform CNAME delegation preserved","Confirm TXT payload matches platform doc","No DNS change; focus on mail pipeline or keys"]
        - ["Authoritative NS returns A/AAAA or different name instead of CNAME","Provider CNAME flattening or rewrite","Query other authoritative NS and request provider confirmation","Ask provider to disable flattening or migrate DNS; consider manual TXT copy if supported"]
        - ["Authoritative NS returns no TXT and no CNAME","Record missing from zone or delegation never applied","Verify zone contents in DNS control panel and platform onboarding steps","Publish required records or re-run platform delegation setup"]
        - ["Public resolvers show platform TXT but authoritative NS does not","Caching or proxy resolver hijack","Compare TTLs and repeat after TTL expires","Flush caches where possible; provide timelines to provider support"]
        - ["Intermittent TXT visibility from different locations","Geo-propagation, Anycast, or split-horizon DNS","Query multiple public DNS servers from multiple regions","Coordinate with provider to identify split-horizon config or propagation lag"]
featured: false
collections: ["email-infrastructure-decisions"]
learningPaths: ["email-infrastructure"]
keyTakeaways:
  - "Teams using managed DNS, proxies, or flattening services"
  - "Distinct from provider-specific DKIM setup: targets DNS-layer transformation of CNAME answers."
  - "Links DKIM setup to DNS provider validation and migration."
commonMistakes:
  - "Skipping this check: Record the exact DKIM selector (selector._domainkey.example) and the platform’s documented CNAME/TXT target."
  - "Skipping this check: Run iterative DNS traces (dig +trace or equivalent) for both TXT and CNAME from multiple public resolvers and save outputs."
  - "Skipping this check: Query the authoritative nameservers directly (dig @ns1.example.com) for the selector TXT and CNAME and save raw responses."
faqs:
  - question: "Can I safely copy a provider-managed DKIM TXT into my own zone?"
    answer: "Sometimes. If the sending platform allows manual TXT keys and documents that method, copying the key can restore DKIM verification. This is a maintenance burden: the platform may rotate keys without notice, and copied keys can become stale. Check the platform’s documentation or support before doing this; Microsoft’s DKIM docs describe platform-specific methods where manual keys are sometimes an alternative [1]."
  - question: "Does CNAME flattening always break DKIM?"
    answer: "No. Flattening only impacts DKIM when the DKIM selector relies on a CNAME delegation to the platform to publish the TXT. If the selector is a direct TXT in your zone, flattening won’t affect it. The specific effect depends on how the provider flattens and whether the platform expects CNAME delegation."
  - question: "What’s the minimum evidence a DNS provider needs to act?"
    answer: "Provide the full dig outputs (iterative and authoritative NS queries) for the selector, the domain’s NS records, a sample failing message with headers showing DKIM failure, and the platform’s documented expected target. Those artifacts let support reproduce the mismatch and distinguish caching from active transformation."
nextStep:
  label: "Continue with Amazon SES Account-Level Suppression: How to Use It"
  href: "/repmail/learn/infrastructure/aws-ses-account-level-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

CNAME flattening and DNS-layer proxies can change the expected DNS answer for a DKIM selector, causing DKIM verification to fail even when keys and mail flow are configured correctly. This guide shows how to detect CNAME or proxy interference, decide whether it’s the root cause, and produce reproducible evidence you can give to DNS providers or platform teams.

## How CNAME flattening breaks DKIM verification

DKIM uses a TXT record at selector._domainkey.example.com (or similar) to publish the public key; many platforms publish that TXT record behind a CNAME to a platform-managed hostname. If a DNS provider flattens CNAMEs or answers with an A/AAAA record instead of passing the CNAME chain, the DNS response seen by verifiers or mail systems can differ from the platform value and cause DKIM verification to fail. RFC 6376 defines the TXT usage and lookup expectations; when answers differ from the authoritative chain, implementations may not find the expected TXT [2].
Provider-side flattening is often applied at the zone apex or for synthetic resolution and can be invisible in many common DNS control panels. The decision boundary: if the published DKIM selector uses a CNAME target, verify whether your DNS provider returns the CNAME record chain exactly as the platform expects or rewrites it to an IP or to different names.

## Practical detection sequence

1) Identify the selector and expected host the sending platform documents (for example, selector1._domainkey.mailprovider.example). 2) From a remote resolver (not your workstation cache), perform iterative DNS queries for the selector TXT and for the selector CNAME using dig +trace or an authoritative query against the domain's nameservers. This reveals whether a CNAME chain exists and whether intermediate answers are preserved.
3) Compare the TXT payload returned by your authoritative nameserver with the platform’s documented TXT. If the authoritative response lacks the platform TXT or returns an A/AAAA where a CNAME should appear, that indicates provider interference. When possible, repeat queries from multiple public resolvers to rule out local cache effects.

## Evidence you must gather before contacting providers

Collect: the exact selector name, raw dig output for TXT and CNAME (including recursion flags), the domain's NS records and responses from the authoritative nameservers, and a timestamped message trace showing DKIM failure (mail headers with the DKIM- signature and verification result). Show the expected value as provided by your email platform documentation so the provider can compare.
Explain the impact: whether DKIM fails on all messages, only when relayed through certain paths, or intermittently. Providers may ask for both iterative (trace) results and responses from their authoritative nameservers to distinguish caching from active rewriting or flattening.

## Decision boundaries: when to change DNS vs. change platform

If the DNS provider is intentionally flattening or blocking CNAMEs for the selector and won’t disable it, options are: move the DKIM TXT into your zone as a plain TXT (copying the platform’s key) if allowed by the platform, or migrate to a DNS provider that preserves CNAME chains. The decision depends on platform support for transferring DKIM keys; some platforms expect CNAME-driven rotation and publishing and may not accept manual TXT copies [1].
If the platform requires CNAME delegation (for example for automatic key rotation), changing DNS providers is the safer operational choice. If the platform documents an alternate method (manual TXT ingestion), that may be a short-term workaround but increases maintenance and rotation risk.

## Limitations, uncertainty, and provider-specific behavior

DNS providers differ: some implement CNAME flattening only at the apex, others apply synthetic A/AAAA responses for CNAME targets or perform DNSSEC-unfriendly transformations. Documentation or support will vary; for directional provider behavior see Cloudflare’s note on flattening as an example of why this exists [3].
If you infer provider behavior from observations, state uncertainty: a returned A/AAAA could be from flattening, caching, or an authoritative zone configuration. Only authoritative NS answers or provider confirmation can definitively prove the cause. Avoid assuming provider intent without their confirmation.

## Operational remediation and verification steps

If you choose to move DKIM TXT records into your zone, publish the exact TXT published by the sending platform and monitor rotation. After changes, re-run iterative DNS traces and send test messages to a mailbox where you can examine full headers to confirm DKIM signature validation. Keep an audit log of when keys are copied and when rotation events occur.
For long-term safety consider: adding monitoring that checks selector TXT existence and value regularly, documenting DNS ownership and change processes, and including a rollback plan if DKIM signatures start failing after DNS changes. If you escalate to a DNS provider, present the exact traces and a minimal replication plan for them to reproduce and resolve the issue.

## Practical checklist

- [ ] Record the exact DKIM selector (selector._domainkey.example) and the platform’s documented CNAME/TXT target.
- [ ] Run iterative DNS traces (dig +trace or equivalent) for both TXT and CNAME from multiple public resolvers and save outputs.
- [ ] Query the authoritative nameservers directly (dig @ns1.example.com) for the selector TXT and CNAME and save raw responses.
- [ ] Capture sample message headers showing DKIM failure (full Received and DKIM-Authentication-Results lines).
- [ ] Compare authoritative TXT payload with platform documentation; note any missing or altered values.
- [ ] If provider interference is suspected, open a support ticket with the DNS provider and attach trace outputs and header samples.
- [ ] If provider won’t change behavior, verify whether the platform accepts manual TXT key insertion; if so, publish the key and monitor rotation.
- [ ] Implement monitoring that checks selector TXT presence and value weekly and alert on mismatches.
- [ ] Document DNS owner, provider contacts, and the rollback plan for DKIM-related changes.

## Where RepMail fits

RepMail teams can use this guide as a diagnostic checklist and evidence template when onboarding domains or troubleshooting DKIM failures in outbound workflows. The stepwise traces, decision table, and checklist help operations decide whether to change DNS providers, switch to manual TXT keys, or escalate with concrete artifacts.

Continue with [Amazon SES Account-Level Suppression: How to Use It](/repmail/learn/infrastructure/aws-ses-account-level-suppression) for the next step in the workflow.

## Related RepMail guides

- [DKIM Canonicalization Choices: Simple vs Relaxed Under Rewriting](/repmail/learn/infrastructure/dkim-canonicalization-rewriting)
- [DKIM Multiple Signatures: Which Signature Can Satisfy DMARC?](/repmail/learn/infrastructure/multiple-dkim-signatures-dmarc)


## Sources

[1]: https://learn.microsoft.com/en-us/defender-office-365/email-authentication-dkim-configure "Microsoft documentation"
[2]: https://www.rfc-editor.org/rfc/rfc6376 "IETF RFC reference"
[3]: https://developers.cloudflare.com/dns/cname-flattening/ "Supporting technical or operational reference"
