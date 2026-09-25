---
product: repmail
academy: infrastructure
contentType: guide
slug: dmarc-policy-discovery-outcomes
title: "DMARC Policy Discovery: Parent, Subdomain, and No-Record Outcomes"
description: "DMARC Policy Discovery: Parent, Subdomain, and No-Record Outcomes — Operators testing what policy a receiver actually discovers."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["infrastructure","dns","dmarc","email","policy","discovery","parent"]
assets:
  - type: table
    title: "Diagnostic decision table: expected receiver-applied policy"
    content:
      headers: ["Observed DNS state","Authoritative DNS evidence to collect","Receiver-applied policy (expected)","Action"]
      rows:
        - ["Explicit child _dmarc TXT present","Child TXT string, authoritative server, TTL","Child p= value applies","Stop: fix child record if policy wrong; test mail flow"]
        - ["No child TXT; parent _dmarc TXT present","Child NXDOMAIN/NO DATA; parent TXT string","Parent p= applies; sp= used if set for subdomains","If undesired, publish child record or change parent's sp="]
        - ["No child or parent _dmarc TXT","NXDOMAIN/NO DATA on both; authoritative checks","No DMARC policy — receiver falls back to local handling","Decide whether to publish parent or child record"]
        - ["Child zone delegated but no TXT in child","Verify delegation (NS records) and authoritative servers","No child policy; parent may or may not apply depending on delegation semantics","Fix child zone or publish child _dmarc in delegated zone"]
        - ["Child TXT present but syntactically invalid","Save exact TXT; validate against RFC tags","Receiver may treat as no policy or failover to parent (implementation-specific)","Correct syntax; retest authoritative servers"]
featured: false
collections: ["email-infrastructure-decisions"]
learningPaths: ["email-infrastructure"]
keyTakeaways:
  - "Operators testing what policy a receiver actually discovers"
  - "Separate from rollout planning and sp=: models lookup outcomes before enforcement."
  - "Links to DMARC policy and subdomain-scope articles."
commonMistakes:
  - "Skipping this check: Query _dmarc.<target-domain> TXT and save the full TXT string and DNS response code."
  - "Skipping this check: If no TXT, query _dmarc.<organizational-parent> TXT and save results."
  - "Skipping this check: Query authoritative name servers for the domain to avoid cached data artifacts."
faqs:
  - question: "If a parent domain has sp=reject but a subdomain has no record, will receivers always reject messages from the subdomain?"
    answer: "If a parent publishes sp=reject and the subdomain has no explicit _dmarc record, the sp= setting is the designated fallback for subdomains under RFC 7489, so many receivers will apply that rejection policy. However, enforcement specifics and how strictly a receiver follows sp= can vary by provider; treat provider guidance as directional and verify against the receivers you rely on [1]."
  - question: "Can DNS caching or delegation hide a child record during tests?"
    answer: "Yes. Cached negative responses or misdelegation can make a child record appear missing. Always query authoritative name servers directly when possible and repeat queries from different resolvers to rule out caching. Confirm NS delegation entries and that the child zone actually serves the _dmarc TXT."
  - question: "If a child domain has an invalid DMARC TXT, what will receivers do?"
    answer: "RFC 7489 does not mandate a single behavior for syntactically invalid records; receivers may treat them as absent, fall back to a parent policy, or use local rules. Collect the exact TXT, correct the syntax, and retest. If a receiver’s behavior is critical, capture its Authentication-Results headers and consult that provider’s published guidance before opening a support case [1]."
nextStep:
  label: "Continue with Amazon SES Account-Level Suppression: How to Use It"
  href: "/repmail/learn/infrastructure/aws-ses-account-level-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

DMARC policy discovery depends on three outcomes: an explicit record on the queried domain, inheritance from a parent (organizational) domain when the child has none, or a concluded “no record” outcome when neither exists. Operators testing what a receiver will apply must query the exact domain, verify DNS delegation and parent records, and interpret provider-specific behaviors as implementation details rather than protocol guarantees.

## How receivers discover DMARC: exact-match then parent lookup

Per the DMARC specification, a receiver looks for an explicit _dmarc TXT record on the queried domain (the policy that applies to the From: header domain). If that exact record exists, its tags determine enforcement and reporting. This is the primary decision boundary: an explicit record on the domain in question wins and stops lookup [1].

If there is no record on the child/subdomain, the receiver will consult the organizational (parent) domain for a policy only when the child has no record and only if the parent has a _dmarc TXT. This parent-lookup behavior is defined in the DMARC RFC; treat it as a protocol-level fallback, not as a substitute for explicit child policies [1].

## No-record outcome: when lookup stops with no policy

A 'no-record' result occurs when neither the queried domain nor any parent domain in the organizational chain publishes _dmarc TXT. In that case, the receiver has no DMARC policy to apply and must fall back to its local handling of unauthenticated messages (often specified by the receiver's own spam/abuse policy, not DMARC) [1].

Testing should therefore confirm both the absence of a child record and the absence of a parent record. A DNS NXDOMAIN or NO DATA response for _dmarc on both the child and parent indicates the no-record outcome; be careful to distinguish between a missing TXT and syntactically invalid TXT content.

## Subdomain (p=) vs organizational (sp=) policy: decision boundary and precedence

If a child/subdomain publishes its own _dmarc record, that subdomain-level policy (p= tag) controls message disposition for that domain. The organizational domain may include an sp= tag that sets a policy for subdomains, but sp= is only consulted by receivers when a subdomain has no explicit record. Thus precedence is: explicit subdomain record > parent sp= fallback > no policy [1].

Do not assume sp= will be ignored; it is a legitimate mechanism to set a default for any child that has not published its own record. However, because receivers can implement local variations, validate behavior against the specific receivers you care about (some providers publish guidance and known behaviors) [2].

## Practical DNS testing sequence and evidence to collect

1) Query _dmarc.<domain> TXT for the exact domain you are testing. Record the TXT content, DNS response code, and TTL. 2) If the response is NXDOMAIN or no TXT, query _dmarc on the organizational (parent) domain and record the same details. 3) If delegation exists (the child is a delegated zone), test the authoritative name servers for the child zone directly to avoid cache/misconfiguration artifacts.

Collect a copy of the exact TXT string (for syntax checks), the DNS response types, and timestamps. These items form evidence for why a receiver would choose a specific policy and are useful for debugging disagreements between operators and receivers.

## Provider-specific behaviors and limits of inference

RFC 7489 defines the lookup behavior, but real-world application can vary by provider. For example, Google publishes guidance on DMARC handling that can help interpret receiver-specific consequences, but such pages are directional and not normative for all receivers [2]. Always treat provider guidance as implementation notes, not protocol law.

When diagnosing a discrepancy between what you publish and what a receiver applies, document the receiver's observed behavior (mail logs, authentication results) alongside your DNS evidence. This clarifies whether the issue is a DNS propagation/delegation problem, a syntax error in the record, or a receiver-specific enforcement choice.

## Decision boundaries and stop conditions for operators

Stop after confirming an explicit child _dmarc TXT — that is the authoritative policy for the child. If no child record exists, stop after confirming an organizational _dmarc TXT; that is the fallback the receiver will use (sp= only when child has none) [1].

If neither record exists, stop after verifying delegation and authoritative server responses; the receiver has no DMARC policy to apply and any enforcement observed is not DMARC-derived. Use this as a clear handoff to receiver support when you need them to explain observed disposition.

## Practical checklist

- [ ] Query _dmarc.<target-domain> TXT and save the full TXT string and DNS response code.
- [ ] If no TXT, query _dmarc.<organizational-parent> TXT and save results.
- [ ] Query authoritative name servers for the domain to avoid cached data artifacts.
- [ ] Validate TXT syntax per RFC 7489 (required tags like p=, optional sp= and rua/ruf).
- [ ] Confirm DNS delegation is correct for subdomains (no unintended zone cuts).
- [ ] Test against representative receivers and capture authentication headers (e.g., Authentication-Results).
- [ ] If receiver behavior differs, collect mail logs and DNS evidence before contacting provider support.
- [ ] Repeat queries from multiple geographic resolvers to detect propagation issues.
- [ ] Document timestamps and TTL values for all DNS responses you collect.

## Where RepMail fits

Use this guide as a checklist and decision aid when diagnosing outbound authentication problems. Operators can follow the testing sequence and the diagnostic table to produce the evidence packet RepMail or other operational tooling needs for escalation: DNS queries (authoritative), saved TXT strings, mail headers, and timestamps. The checklist helps ensure consistent evidence collection before contacting receivers or making DNS changes.

Continue with [Amazon SES Account-Level Suppression: How to Use It](/repmail/learn/infrastructure/aws-ses-account-level-suppression) for the next step in the workflow.

## Related RepMail guides

- [DKIM Multiple Signatures: Which Signature Can Satisfy DMARC?](/repmail/learn/infrastructure/multiple-dkim-signatures-dmarc)
- [ARC Chain Validation Failure: Find the First Broken Instance](/repmail/learn/infrastructure/arc-chain-first-failure)


## Sources

[1]: https://www.rfc-editor.org/rfc/rfc7489 "IETF RFC reference"
[2]: https://support.google.com/mail/answer/81126?hl=en "Google sender or Workspace documentation"
[3]: https://www.rfc-editor.org/rfc/rfc1034 "IETF RFC reference"
