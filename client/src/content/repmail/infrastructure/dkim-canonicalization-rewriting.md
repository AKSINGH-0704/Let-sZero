---
product: repmail
academy: infrastructure
contentType: guide
slug: dkim-canonicalization-rewriting
title: "DKIM Canonicalization Choices: Simple vs Relaxed Under Rewriting"
description: "DKIM Canonicalization Choices: Simple vs Relaxed Under Rewriting — ESP and mail-platform owners choosing DKIM canonicalization."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["infrastructure","dns","dkim","email","canonicalization","choices","simple"]
assets:
  - type: table
    title: "Canonicalization decision table for signing under rewriting"
    content:
      headers: ["Operational condition","Recommended canonicalization","Rationale","Immediate test to validate"]
      rows:
        - ["No post-signing modifications guaranteed (single controlled MTA)","simple/simple","Strict byte-preservation gives strong tamper detection","Send test with long headers and verify byte-for-byte match"]
        - ["Known whitespace/header reformatting (wrapping, header folding)","relaxed/relaxed","Tolerates common benign formatting changes","Send tests that force folding; expect relaxed to pass when simple fails"]
        - ["Address rewriting or header insertion after signing","relaxed (headers)/relaxed (body)","Reduces breakage when headers or addresses are altered","Simulate insertion (e.g., List-Unsubscribe) and verify DKIM pass"]
        - ["Signing upstream of mailing-list software","relaxed by headers; consider re-signing at list exit","Lists reorder/add headers; re-signing is safest","Send through list and compare verifier results"]
        - ["CTE changes or transfer-encoding conversions in transit","relaxed/relaxed","Body canonicalization in relaxed tolerates common whitespace differences","Send different CTE variants to test receivers"]
        - ["Final-hop signing at last SMTP hop","simple/simple (if no last-hop changes) or relaxed if antivirus alters body","Choose strictness based on whether last hop modifies content","Validate using final-hop capture and external verifier"]
featured: false
collections: ["email-infrastructure-decisions"]
learningPaths: ["email-infrastructure"]
keyTakeaways:
  - "ESP and mail-platform owners choosing DKIM canonicalization"
  - "Not a key-management article; explains canonicalization trade-offs during transformations."
  - "Links from DKIM guide to forwarding and migration test plans."
commonMistakes:
  - "Skipping this check: Map every component that touches messages after signing (MTAs, proxies, list managers)."
  - "Skipping this check: Decide per signing point: use simple only when no post-signing modification is possible."
  - "Skipping this check: Prefer relaxed/relaxed for signing points upstream of any rewrite; use simple/simple at last-hop signers where used."
faqs:
  - question: "If I change from simple to relaxed, will all DKIM failures disappear?"
    answer: "No. Relaxed reduces failures caused by whitespace, header folding, and header reordering, but it will not fix failures caused by substantive content modification (e.g., body text edits) or header removals that remove signed fields. Use failure diagnostics on raw message sources to identify residual failure causes and do not assume relaxed is a universal fix."
  - question: "Can I mix simple and relaxed across header and body canonicalization?"
    answer: "Yes. RFC 6376 permits independent choices for header and body canonicalization [1]. A common pattern is relaxed header canonicalization with simple body canonicalization when you expect header formatting changes but want strict body integrity. Test both choices against your transformation paths before deploying widely."
  - question: "How do major providers treat canonicalization choices?"
    answer: "RFC 6376 defines canonicalization; most verifiers implement it, but provider-specific behaviors and diagnostic messages vary. Use provider test mailboxes (including popular consumer providers) to observe real-world results. Where provider documentation exists, treat it as directional and verify empirically [1][3]."
nextStep:
  label: "Continue with Amazon SES Account-Level Suppression: How to Use It"
  href: "/repmail/learn/infrastructure/aws-ses-account-level-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Use relaxed canonicalization when your platform rewrites or normalizes headers/body during delivery; use simple only when you can guarantee byte-for-byte preservation of signed headers and body. Under rewriting, relaxed reduces breakage risk but can mask harmful changes—weigh operational assumptions, testing, and monitoring before choosing.

## Decision boundary: when canonicalization is the decision, not key choice

Decide canonicalization based on whether your platform or downstream systems modify the message between signing and recipient verification. If any header or body normalization, line-wrapping, or address rewriting can occur after signing, relaxed canonicalization tolerates many of those changes and therefore materially reduces signature breakage. If you can ensure no changes occur (for example, signing is the final step before SMTP transmission and the message path is controlled), simple gives the strictest protection against tampering.

Evidence and limits: RFC 6376 defines both simple and relaxed options; it permits using different canonicalization for header and body but does not require providers to accept one over the other [1]. Provider behavior can vary, so treat RFC text as normative but not as a compatibility guarantee with every verifier.

## What 'rewriting' means operationally

Rewriting covers deliberate platform behavior (address rewriting, list-unsubscribe insertion, header injections), transport agents that rewrap lines or modify content-transfer-encoding, and downstream intermediaries that add or reorder headers. Any of these can change the canonical form used for simple verification and cause signatures to fail.

Practical sequence: inventory all transformations that happen after signing. Include MTAs, relays, gateways, mailing-list software, and outbound proxies. If any transformation is plausible and cannot be eliminated, treat the message as subject to rewriting when choosing canonicalization.

## Trade-offs: relaxed reduces false negatives but widens attack surface

Relaxed canonicalization tolerates whitespace and header order/formatting changes, which reduces signature failures when benign transformations occur. That lowers operational overhead: fewer customer tickets, fewer re-signing attempts, and higher apparent deliverability from the perspective of DKIM pass rates.

However, relaxed also accepts a broader set of message forms; in some threat models this can enable subtle header spoofing if other protections (DMARC alignment, ARC, authenticated SMTP paths) are absent. Therefore, relaxed should be paired with strict sending controls, header injection protections, and monitoring for anomalous modifications.

## Implementation sequence for an ESP or mail platform

1) Inventory transformations: document every rewrite, header insertion, or body normalization that can occur after signing. 2) Choose canonicalization per signing point: prefer relaxed/relaxed for signing that precedes any rewriting. Use simple/simple only if you can prove end-to-end preservation.

3) Implement staged rollout and testing: start with a subset of domains and recipients, collect DKIM verification results from test inboxes and external verifiers (including popular providers). 4) Add automated monitoring and alerts for DKIM failures by envelope, signing key, and signing point; treat an increase as a stop condition for rollout.

## Testing and diagnostics: what to measure and how to interpret failures

Collect raw message source (RFC 5322 format) and the verifier’s failure explanation. For failed DKIM signatures, compare the signed headers/body canonicalization input with the received canonical form to pinpoint which transformation caused the mismatch [2]. Use test messages that exercise common transformation paths (e.g., long headers, wrapped lines, CTE changes).

Examples: Use a test that inserts a long List-Unsubscribe header to force line-wrapping; if simple canonicalization fails and relaxed passes, the failure is consistent with whitespace/line-wrap changes. Keep records of which verifier vendors show different failure modes; provider policies may influence diagnostics but RFC behavior is the baseline [1].

## Operational controls and stop conditions

Enforce sending controls: sanitize user inputs that become headers or body content, limit dynamic header additions, and centralize signing where possible. If you switch to relaxed, require compensating controls such as stricter ARC or DMARC policies and enhanced telemetry on header mutations.

Stop conditions: suspend rollout if DKIM failure rates exceed a defined threshold, if you detect mid-path header injections, or if downstream receivers explicitly flag altered headers that relaxed would accept but which violate your security policy.

## Practical checklist

- [ ] Map every component that touches messages after signing (MTAs, proxies, list managers).
- [ ] Decide per signing point: use simple only when no post-signing modification is possible.
- [ ] Prefer relaxed/relaxed for signing points upstream of any rewrite; use simple/simple at last-hop signers where used.
- [ ] Run A/B tests: send identical messages signed with both canonicalizations to instrumentation mailboxes.
- [ ] Collect and archive raw RFC 5322 source for failed DKIM deliveries for root-cause analysis.
- [ ] Monitor DKIM pass/fail by signing key, domain, and sending IP; alert on sudden changes.
- [ ] Sanitize header inputs and enforce canonical header generation to reduce accidental failures.
- [ ] Define rollback criteria (e.g., >X% DKIM failures or >Y customer complaints) before wide rollout.

## Where RepMail fits

This guide can be used as a decision aid and checklist in an outbound operations workflow: use the inventory, test plan, and stop conditions during rollout planning and include the diagnostics steps in incident playbooks. It helps platform owners choose canonicalization that minimizes operational DKIM failures while preserving detectable integrity changes.

Continue with [Amazon SES Account-Level Suppression: How to Use It](/repmail/learn/infrastructure/aws-ses-account-level-suppression) for the next step in the workflow.

## Related RepMail guides

- [CNAME Flattening and DKIM Verification: Detecting Provider Interference](/repmail/learn/infrastructure/cname-flattening-dkim-verification)
- [DKIM Multiple Signatures: Which Signature Can Satisfy DMARC?](/repmail/learn/infrastructure/multiple-dkim-signatures-dmarc)


## Sources

[1]: https://www.rfc-editor.org/rfc/rfc6376 "IETF RFC reference"
[2]: https://www.rfc-editor.org/rfc/rfc5322 "IETF RFC reference"
[3]: https://support.google.com/mail/answer/81126?hl=en "Google sender or Workspace documentation"
