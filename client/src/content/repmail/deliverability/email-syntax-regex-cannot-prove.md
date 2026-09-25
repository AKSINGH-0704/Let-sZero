---
product: repmail
academy: deliverability
contentType: guide
slug: email-syntax-regex-cannot-prove
title: "Email Address Syntax Checks: What Regex Cannot Prove"
description: "Email Address Syntax Checks: What Regex Cannot Prove — Developers confuse syntactic validity with mailbox existence or acceptance."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability","suppression","email","list","address","syntax","checks"]
assets:
  - type: table
    title: "Diagnostic decision table: what local checks prove and next action"
    content:
      headers: ["Observed result","What this proves","Operator action","Stop condition"]
      rows:
        - ["Regex/local pass, domain has MX","String format valid and domain routes mail","Schedule verification API or SMTP probe if high risk; allow non-critical signups","Do not assume mailbox exists"]
        - ["Regex/local pass, no MX","Format valid, domain likely not accepting mail","Reject for sending; ask user to confirm domain or retry later","Only accept if domain non-delivery tolerated"]
        - ["Regex/local fail","Format rejected by policy","Show specific user guidance; record example for corpus","Stop: address should not be stored as primary contact"]
        - ["Regex/local pass, SMTP connect refused or greylisted","Domain accepts connections but may employ anti-probing policies","Defer verification, retry later, or use vendor API for probabilistic verdict","Do not mark as deliverable without higher confidence"]
        - ["Regex/local pass, API reports low confidence","Vendor signals high risk or probable invalid mailbox (probabilistic)","Place address in lower-priority lists or require user confirmation","Treat as untrusted for campaigns requiring high deliverability"]
featured: false
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
keyTakeaways:
  - "Developers confuse syntactic validity with mailbox existence or acceptance."
  - "Not a generic verification definition; sets boundaries for local validation."
  - "Link to verification confidence and API validation."
commonMistakes:
  - "Skipping this check: Document the exact syntax rules your local validator enforces and the stop condition it guarantees."
  - "Skipping this check: Log the validation outcome and a short failure reason code for every address attempt."
  - "Skipping this check: Run MX (and A fallback) checks at entry or on a separate verification step; treat results as domain-level evidence only."
faqs:
  - question: "If an address passes my regex, will emails stop bouncing?"
    answer: "No. A syntactically valid address only guarantees format per your policy. Bounces occur because of mailbox non-existence, acceptance policies, routing issues, or sender reputation — none of which are confirmed by local regex."
  - question: "Should I implement full RFC 5322 compliance in my validator?"
    answer: "That depends on your product needs. Full RFC 5322 compliance is complex and permits many edge cases uncommon in modern usage [1]. Many teams intentionally adopt a narrower, documented subset to reduce support burden. If you accept RFC edge cases, include them in tests and support workflows."
  - question: "Can a vendor verification API prove mailbox existence?"
    answer: "Vendor APIs provide probabilistic assessments combining DNS, heuristics, and probing; they raise or lower confidence but do not offer absolute proof in all cases. Where server policies hide mailbox status, API results should be treated as directional evidence and operationalized according to your risk tolerance [2]."
nextStep:
  label: "Continue with Provider-Specific Deliverability Triage: Gmail, Microsoft, and More"
  href: "/repmail/learn/deliverability/provider-specific-deliverability-triage"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Regex and simple local syntax checks can reliably filter obvious input mistakes, but they cannot prove that an email address maps to a deliverable, accepted mailbox or that a receiving system will accept mail. Treat local validation as a safety gate that enforces data hygiene; treat mailbox existence, acceptance policies, and deliverability as separate verification steps.

## What local syntax validation can and cannot prove

Local validation (regex, character checks, length limits) proves only that a string conforms to a chosen subset of the email address grammar. That subset may be pragmatic (what your system accepts) or strict (RFC 5322-compliant), but either way it only addresses formatting, not mailbox existence or recipient policy. The RFC defines a complex grammar and allowed constructs; many production validators intentionally restrict that grammar for usability and security reasons [1].

Local checks cannot prove whether a mailbox exists, whether the receiving server will accept mail from your IP or envelope, or whether the address is a catch-all or alias. Those are situational properties that require remote checks or historical deliverability signals.

## Decision boundary: choose what your validator should guarantee

Decide whether your validator will: (A) enforce a narrow, practical subset for UX and security; (B) aim for RFC-compliant acceptance; or (C) accept broad input for downstream verification. Document that decision as the validator’s responsibility and stop condition. For example, a signup form validator might intentionally reject quoted local parts or unusually long labels to reduce support burden.

Make the validator’s guarantees explicit in developer docs and tests (e.g., “rejects spaces, requires @, max 254 characters”). This prevents downstream teams from assuming the local pass rate implies mailbox validity or acceptance.

## When to run deeper checks and what they prove

After local validation, run targeted remote checks: DNS MX lookups to ensure a domain advertises mail servers, SMTP-level checks (with caution), and vendor API verifications that combine heuristics and probing. An MX record check proves the domain can accept mail routing; it does not prove the specific local-part exists. SMTP connect or VRFY/EXPN commands may be blocked or yield misleading results because many servers intentionally hide mailbox status for anti-abuse reasons.

Using a reputable verification API can provide probability statements about deliverability and acceptance; treat those as probabilistic signals, not binary truth. Some provider documentation is directional about how checks map to confidence levels [2].

## Common failure modes and how to expose them to operators

False positives: overly permissive regex allows malformed addresses that later bounce or are rejected at relay time. False negatives: overly strict regex rejects valid user addresses (e.g., quoted local-parts, plus-addressing) and hurts acquisition. Track examples and keep a corpus of legitimate addresses that your validator must accept.

Operational visibility: log validation reason codes (format, length, domain-missing, MX-missing, SMTP-reject) and surface a remediation path. For signup flows, provide user-facing guidance when rejecting an address and a fallback (support contact or alternate input).

## Practical implementation sequence for reliable pipelines

1) Apply a documented local syntax policy with clear reject reasons. 2) Perform a domain-level DNS check (MX or A fallback) for routing evidence. 3) Optionally call a verification API or perform controlled SMTP probes as a separate, rate-limited step with retries and consent where required. 4) Persist verification metadata and final confidence score alongside the address for routing and suppression purposes.

Separate concerns across teams: frontend/UX owners maintain local validation rules; deliverability or outbound teams manage verification thresholds and suppression lists. Stop conditions: do not promote a local-pass address to active sending lists without a higher-confidence verification when your campaign risk tolerances require it.

## Examples: edge cases to accept or reject (clearly labeled)

Examples — Accept: user+tag@example.com (common plus-addressing used for filtering). Example — Reject (if your policy is strict): "quoted@local"@example.com if your product UX and customer support cannot handle quoted local parts. Examples — Domain-only failures: user@example (no TLD) should fail local checks; user@localhost may pass strict RFC parsing in some grammars but should be rejected for public email expectations.

Track these examples in tests and include them in upgrade notes when you change validator behavior.

## Practical checklist

- [ ] Document the exact syntax rules your local validator enforces and the stop condition it guarantees.
- [ ] Log the validation outcome and a short failure reason code for every address attempt.
- [ ] Run MX (and A fallback) checks at entry or on a separate verification step; treat results as domain-level evidence only.
- [ ] Use a dedicated verification API or controlled SMTP probe as a separate, rate-limited stage for mailbox/acceptance signals.
- [ ] Preserve verification metadata and a confidence score with the address for routing, suppression, and reporting.
- [ ] Maintain an example corpus of valid addresses to avoid accidental regressions when tightening rules.
- [ ] Provide clear user-facing guidance when rejecting an address and an operator fallback (support ticket or alternate input).
- [ ] Audit false positive and false negative cases quarterly and adjust validator policy based on real-world examples.
- [ ] Separate frontend validation responsibilities from deliverability verification ownership in operational runbooks.

## Where RepMail fits

Use this guide as a checklist and decision aid in outbound workflows: ensure local validates only format and logs reasons; require domain-level and probabilistic verifications before promoting addresses into high-value campaigns; and keep verification metadata with addresses for suppression and routing decisions. The steps here map to operational roles—frontend, deliverability, and operations—so you can introduce gating without implying absolute deliverability guarantees.

Continue with [Provider-Specific Deliverability Triage: Gmail, Microsoft, and More](/repmail/learn/deliverability/provider-specific-deliverability-triage) for the next step in the workflow.

## Related RepMail guides

- [Deduplicate Before Verification: Prevent Wasted Checks and Conflicting Results](/repmail/learn/deliverability/deduplicate-before-email-verification)
- [Disposable Email Detection at Signup Versus Bulk Import](/repmail/learn/deliverability/disposable-detection-point-of-capture)


## Sources

[1]: https://www.rfc-editor.org/rfc/rfc5322 "IETF RFC reference"
[2]: https://docs.clearout.io/email-verifier/overview "Supporting technical or operational reference"
