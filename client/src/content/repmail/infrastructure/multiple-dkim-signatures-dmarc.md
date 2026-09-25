---
product: repmail
academy: infrastructure
contentType: guide
slug: multiple-dkim-signatures-dmarc
title: "DKIM Multiple Signatures: Which Signature Can Satisfy DMARC?"
description: "DKIM Multiple Signatures: Which Signature Can Satisfy DMARC? — Analysts reading messages signed by an ESP and customer domain."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["infrastructure","dns","dkim","dmarc","email","multiple","signatures","signature"]
assets:
  - type: table
    title: "Decision table: multiple DKIM signatures and DMARC outcome"
    content:
      headers: ["DKIM signatures","Verification results (per signature)","Alignment with From:","DMARC (DKIM) outcome","Next action"]
      rows:
        - ["One or more signatures; at least one with d= matching From:","At least one pass","Aligned","DMARC satisfied (by DKIM)","Document which signature satisfied DMARC; no DKIM remediation required"]
        - ["ESP signature pass (d=esp.com); customer signature fail (d=example.com)","ESP: pass; Customer: fail","ESP not aligned; Customer aligned but failed","DMARC not satisfied","Investigate customer signature failure and check for post-signing modifications"]
        - ["Multiple passes, none aligned","Two or more passes; d= domains differ from From:","Not aligned","DMARC not satisfied (by DKIM)","Determine whether signing strategy should use branded d= or use ARC/forwarding workarounds"]
        - ["Single signature fail where d= matches From:","Fail","Aligned","DMARC not satisfied (DKIM)","Diagnose signature error (key, canonicalization, body changes)"]
        - ["No DKIM signatures present","N/A","N/A","DKIM cannot satisfy DMARC","Rely on SPF alignment or implement DKIM signing for the domain"]
featured: false
collections: ["email-infrastructure-decisions"]
learningPaths: ["email-infrastructure"]
keyTakeaways:
  - "Analysts reading messages signed by an ESP and customer domain"
  - "Distinct from alignment basics: explains multiple d= values and aligned-pass selection."
  - "Links to DMARC alignment and Authentication-Results interpretation."
commonMistakes:
  - "Skipping this check: Collect the raw message including all Authentication-Results headers and the full set of DKIM signatures."
  - "Skipping this check: List each DKIM signature with selector and d= domain and record the verification result."
  - "Skipping this check: Compare every d= domain against the From: domain under the configured alignment mode (strict or relaxed)."
faqs:
  - question: "If an ESP signs with its domain and that signature passes, does DMARC pass automatically?"
    answer: "No. A DKIM pass only satisfies DMARC if the d= domain aligns with the header From: domain under the chosen alignment mode. An ESP’s passing signature that uses the ESP’s own domain (not the customer’s From: domain) is not aligned unless the From: domain is a subdomain allowed by policy or the ESP used a branded d= value."
  - question: "Can a failing DKIM signature be ignored if another signature passes?"
    answer: "Yes, a failing signature can be ignored for DMARC purposes if at least one other DKIM signature both passes verification and aligns with the From: domain. However, you should still diagnose failing signatures because they may indicate misconfiguration, key problems, or downstream modifications."
  - question: "Does ARC change which DKIM signature satisfies DMARC?"
    answer: "ARC provides a way for intermediaries to attest to prior authentication results, which can help in forwarding scenarios, but it does not change the basic rule that DMARC requires an aligned authenticated identifier. ARC can preserve the effect of an original aligned DKIM when a forwarder modifies the message, but ARC behavior and application vary by implementation; treat provider-specific behavior as outside the RFC normative rule set [3]."
nextStep:
  label: "Continue with Amazon SES Account-Level Suppression: How to Use It"
  href: "/repmail/learn/infrastructure/aws-ses-account-level-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

If a single message carries multiple DKIM signatures, DMARC considers any one signature that passes validation and aligns with the sender domain to satisfy the DMARC check. Analysts must therefore inspect every DKIM signature’s d= value and verification result — a failing signature does not automatically mean DMARC failed if another signature both verifies and aligns with the From: domain.

## Which DKIM signature can satisfy DMARC

DMARC requires at least one authenticated identifier to align with the header From: domain. For DKIM, that means any signature whose d= domain both validates cryptographically and is aligned per DMARC rules can satisfy DMARC’s identifier alignment requirement [1]. If multiple signatures exist, DMARC treats them independently: one successful aligned DKIM is sufficient even if others fail.

Decision boundary: a signature must both cryptographically verify and meet alignment (strict or relaxed) to count. Verification is a binary outcome from the signature validation; alignment is a domain comparison between the d= value and the From: domain according to RFC 7489 and RFC 8601 [2][3].

## How to read Authentication-Results for multiple signatures

Authentication-Results headers often list multiple dkim results in the order the verifier processed them. Each dkim result includes a header with domain, selector, and result (pass/fail/temperror/permsfail). Analysts should parse each result and map the d= domain to the From: domain to determine whether an aligned pass exists.

Practical sequence: 1) extract all Authentication-Results dkim entries, 2) for each entry note the d= value and result, 3) check alignment against the From: domain (relaxed vs strict), 4) if any entry is both pass and aligned, consider DMARC pass (subject to SPF and policy disposition if required).

## Common failure modes and how they affect DMARC

Signature verification can fail due to body or header canonicalization mismatches, broken DKIM keys, or post-signing modifications by intermediaries (for example, mailing lists or ESP footers). A non-aligned pass (a pass where d= differs from the From: domain) does not satisfy DMARC identifier alignment even though cryptographic verification succeeded.

Decision boundary and evidence limits: you can rely on verification results reported by the verifier, but you must not assume the original signer intended alignment. RFC sources define alignment behavior, but provider-specific signing strategies (shared domains, third-party ESP signing) vary in practice and are outside the RFC normative text [1][2].

## Diagnosing cases: ESP signature + customer signature

When messages carry both an ESP signature (d=esp-domain) and a customer signature (d=example.com), check which signature passed and whether its d= aligns with the From: header. If the ESP signature passes but d= is not aligned and the customer signature fails, DMARC fails. If the customer signature passes and aligns, DMARC passes even if the ESP signature failed.

Example: If From: user@example.com, SDKIM: d=esp-mail.com (pass), d=example.com (fail) → DMARC fails because no aligned pass exists. Reverse the results and DMARC passes. This example follows the alignment rules in RFC 7489 [2].

## Practical sequence to resolve ambiguous results

1) Confirm verifier output: copy all dkim entries and their verification status from Authentication-Results. 2) Confirm From: domain and DMARC policy (p= and sp=) from DNS. 3) Determine alignment mode (relaxed vs strict) being considered by your analyst process. 4) If no aligned pass exists, investigate the failing signature’s error code (canonicalization, key not found, body hash mismatch) and whether intermediaries modified the message post-signing.

Stop conditions: stop when you find a DKIM signature that both passes verification and aligns with From: (DMARC satisfied), or when you have vetted all signatures and none do (DMARC not satisfied under DKIM; check SPF for possible alignment).

## When to escalate and who owns what

Escalate to the ESP if the ESP’s signature fails or if failures point to signing infrastructure (missing selector, DNS key problems). Escalate to the customer IT or domain owner when the d= that should align with From: fails to verify or if the From: domain’s DNS lacks a valid selector or publishes restrictive policies that conflict with the ESP signing approach.

Owner clarity: deliverability or operations analysts should own initial triage and evidence collection (Authentication-Results, raw headers, example messages). Engineering or DNS owners should own record fixes and key rotation investigations. Keep a captured sample message for forensic re-checks.

## Practical checklist

- [ ] Collect the raw message including all Authentication-Results headers and the full set of DKIM signatures.
- [ ] List each DKIM signature with selector and d= domain and record the verification result.
- [ ] Compare every d= domain against the From: domain under the configured alignment mode (strict or relaxed).
- [ ] If any signature both passes and aligns, mark DMARC satisfied for DKIM; document the signature details.
- [ ] If no aligned pass exists, inspect failure reasons (canonicalization, body-hash mismatch, key missing) and whether intermediaries modified the message.
- [ ] Query DNS for the DKIM public keys (selector._domainkey.d=) to confirm present and correct records.
- [ ] If ESP-signed and failing, open a ticket with the ESP with Authentication-Results and raw message; include selector and timestamp.
- [ ] If customer-signed and failing, check the customer’s signing keys, key rotation, and signing service logs for recent changes.
- [ ] Retest after fixes using fresh messages and confirm an aligned DKIM pass in Authentication-Results.

## Where RepMail fits

Use this guide as a decision aid and checklist during message triage: capture raw headers, identify every DKIM signature and its d= domain, and mark which signature — if any — provides an aligned pass. This reduces unnecessary escalation when one signature fails but another satisfies DMARC. The checklist and decision table can be incorporated into outbound quality control and incident-runbooks to standardize analyst handoffs.

Continue with [Amazon SES Account-Level Suppression: How to Use It](/repmail/learn/infrastructure/aws-ses-account-level-suppression) for the next step in the workflow.

## Related RepMail guides

- [CNAME Flattening and DKIM Verification: Detecting Provider Interference](/repmail/learn/infrastructure/cname-flattening-dkim-verification)
- [DKIM Canonicalization Choices: Simple vs Relaxed Under Rewriting](/repmail/learn/infrastructure/dkim-canonicalization-rewriting)


## Sources

[1]: https://www.rfc-editor.org/rfc/rfc6376 "IETF RFC reference"
[2]: https://www.rfc-editor.org/rfc/rfc7489 "IETF RFC reference"
[3]: https://www.rfc-editor.org/rfc/rfc8601 "IETF RFC reference"
