---
product: repmail
academy: infrastructure
contentType: guide
slug: aws-ses-api-v2-formatted-vs-raw
title: "AWS SES API v2 Formatted vs Raw Email: A Practical Boundary"
description: "AWS SES API v2 Formatted vs Raw Email: A Practical Boundary — SES developers choosing managed composition versus full MIME control."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["infrastructure","ses","aws","api","email","formatted","raw","practical"]
assets:
  - type: table
    title: "Decision table: formatted vs raw practical diagnostics"
    content:
      headers: ["Scenario / Need","Use Formatted (SendEmail)","Use Raw (SendRawEmail)"]
      rows:
        - ["You need template substitution and simple HTML/text bodies","Yes — SES assembles MIME from fields and templates","Possible but burdensome — you must build templating into MIME"]
        - ["You need exact header values or nonstandard headers","No — SES may normalize or disallow some headers","Yes — you control every header"]
        - ["You require S/MIME or inline PGP signing inside MIME","No — structured API doesn't let you supply signed MIME","Yes — supply the signed multipart as a raw blob"]
        - ["You are sending binary attachments with specific encoding needs","Yes for typical attachments via structured fields","Yes and necessary when you must control Content-Transfer-Encoding"]
        - ["Operational desire to reduce MIME bugs and encoding complexity","Yes — lower surface area and fewer MIME errors","No — higher operational burden but full control"]
featured: false
collections: ["email-infrastructure-decisions"]
learningPaths: ["email-infrastructure"]
keyTakeaways:
  - "SES developers choosing managed composition versus full MIME control"
  - "Narrow SES implementation choice; does not duplicate generic SES sending"
  - "Link from SES API hub and MIME troubleshooting"
commonMistakes:
  - "Skipping this check: List MUST-HAVE message features (exact headers, cryptographic payloads, multi-layer MIME) before choosing API"
  - "Skipping this check: If choosing Formatted: map each field to the SES SendEmail parameters and run template rendering tests"
  - "Skipping this check: If choosing Raw: implement MIME generation with a well-tested library and verify boundaries/encodings"
faqs:
  - question: "Can SES Formatted sends include custom headers like List-Unsubscribe or X-Trace?"
    answer: "Formatted sends accept many common fields, but SES may restrict or normalize certain headers. If you require precise header text or placement, use Raw. Verify behavior against the SES documentation and test exact header presence because AWS may alter or reject certain header values [1]."
  - question: "Is there a size or encoding difference I need to watch for between Formatted and Raw?"
    answer: "Both APIs are subject to SES message size limits documented by AWS; the difference is operational: with Raw you control the exact encoding overhead (base64 for binary attachments increases size), so you must account for MIME encoding expansion yourself. Check the provider docs for current limits and treat those limits as provider-specific and subject to change [2]."
  - question: "How should I debug rendering differences seen in recipients between Formatted and Raw?"
    answer: "Capture the exact MIME that reaches recipients. For Formatted, request or reconstruct the composed MIME via SES test addresses or by sending to a controlled inbox; for Raw, use the produced blob. Compare headers, Content-Type boundaries, encodings, and DKIM/Signature headers. Add reproduction cases and test across multiple clients to isolate client-specific rendering vs. composition issues."
nextStep:
  label: "Continue with Amazon SES Account-Level Suppression: How to Use It"
  href: "/repmail/learn/infrastructure/aws-ses-account-level-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Use SES API v2 Formatted (SendEmail) when you want AWS to assemble headers/body from structured fields and you don’t need full MIME control; use Raw (SendRawEmail) when you must supply exact MIME (multiple DKIM-signed parts, complex attachments, inline signed content, or special Content-Transfer-Encoding). The practical boundary is control vs. convenience: Formatted delegates composition and common header handling to SES; Raw preserves every byte you send but requires you to manage headers, encodings, and signing.

## Decision boundary: control versus managed composition

Formatted (SendEmail) accepts structured inputs—From, To, Subject, Html/Text bodies, simple attachments via separate fields—and AWS assembles the MIME message and common headers for you. This reduces implementation surface: you don’t need to encode MIME boundaries or set Content-Type headers manually, and SES will apply its own header handling rules documented by the API [1].

Raw (SendRawEmail) accepts a complete MIME blob. Use it when you must control every header, the exact byte sequence, or when you need features that aren’t expressible in the structured API (for example, multiple multipart/mixed layers, bespoke Content-Transfer-Encoding, or embedded S/MIME/PGP). The trade-off is operational: you become responsible for correct MIME formatting, encoding, header canonicalization, and any per-recipient personalization within the MIME structure [2].

## Failure modes and what you must test

With Formatted sends, common failures are missing personalization tokens in templates, unexpected header normalization by SES (subject/header whitespace), and inability to add nonstandard headers. Test for template rendering, DKIM/DMARC alignment as deployed, and how SES injects or rewrites headers in edge cases [1].

With Raw sends, failures usually stem from malformed MIME (incorrect boundaries, wrong Content-Transfer-Encoding for binary attachments), broken multipart nesting, or duplicate headers (e.g., two Date headers). These can lead to SMTP rejections, mail clients dropping parts, or signature verification failure. Validate MIME with a parser, test attachments end-to-end, and test mailbox rendering across clients.

## Practical sequence to choose and implement

1) Identify MUST-HAVE constraints: exact header control, cryptographic signing inside the MIME (S/MIME, PGP), or multipart structures not representable via structured inputs. If any MUST-HAVE exists, choose Raw. 2) For convenience or when you only need HTML/text bodies, templating, per-recipient substitution, or standard attachments, choose Formatted to reduce code and encoding risk.

When implementing Raw, add a MIME generation library, ensure correct Content-Transfer-Encoding (base64 for binary), canonicalize headers when needed, and run signature verification tests. When implementing Formatted, validate that the fields you supply map to the API semantics in the SES v2 SendEmail documentation and test how SES composes the final MIME [2].

## Operational controls: monitoring, retries, and owner responsibilities

Owner: assign one engineer for message composition logic (raw or structured) and one for deliverability/headers. For Formatted messages, focus monitoring on template rendering errors and API field validation. For Raw, monitor bounce/rejection reasons, mailbox rendering failures, and signature failures from recipients.

Retry and backoff: both APIs return structured errors; implement exponential backoff and capture full API error payloads. For Raw-specific failures, store the failed MIME blob and add a reproduction test case. Maintain a suite of test addresses (Gmail, Outlook, corporate) to spot client-specific rendering or signature problems early.

## Evidence limits and provider uncertainty

AWS documentation describes both SendEmail (formatted) and SendRawEmail (raw blob) and the API semantics; use those pages as the definitive implementation references [1][2]. The exact header normalization behavior, any future changes to how SES rewrites or injects headers, and provider-side limits (implicit size handling, rate-limiting changes) can evolve; treat those aspects as uncertain and re-verify after major AWS SDK or SES API updates.

If you depend on vendor-specific behaviors (for example, how SES treats duplicate headers or which headers it forbids), test them directly and keep those tests in CI. Do not assume stability of implementation details that are not explicitly guaranteed in the API documentation.

## Practical checklist

- [ ] List MUST-HAVE message features (exact headers, cryptographic payloads, multi-layer MIME) before choosing API
- [ ] If choosing Formatted: map each field to the SES SendEmail parameters and run template rendering tests
- [ ] If choosing Raw: implement MIME generation with a well-tested library and verify boundaries/encodings
- [ ] Build end-to-end mailbox tests (Gmail, Outlook, Apple Mail, common corporate filters) for rendering and signature validation
- [ ] Capture and store failed raw MIME blobs for debugging and add reproducible tests to CI
- [ ] Monitor SES API errors and bounce notifications; log full API responses for diagnosis
- [ ] Assign ownership for composition code and deliverability/headers separately
- [ ] Automate DKIM/DMARC/SPF checks and verify alignment for both Formatted and Raw messages
- [ ] Re-run compatibility tests after SES SDK or API version changes

## Where RepMail fits

This guide is useful as a decision aid and pre-deployment checklist for outbound operators choosing SES composition mode. Use it to assign owners, build CI tests that capture MIME blobs or template outputs, and to triage production failures (bounce reasons, signature failures, rendering). It is not a deliverability guarantee; treat it as an operational tool to reduce MIME-related incidents and speed root cause analysis.

Continue with [Amazon SES Account-Level Suppression: How to Use It](/repmail/learn/infrastructure/aws-ses-account-level-suppression) for the next step in the workflow.

## Related RepMail guides

- [AWS SES Configuration Sets: Tags, Destinations, and Routing](/repmail/learn/infrastructure/aws-ses-configuration-sets-routing)
- [AWS SES Event Destinations: CloudWatch, SNS, EventBridge, or Firehose](/repmail/learn/infrastructure/aws-ses-event-destinations-compared)


## Sources

[1]: https://docs.aws.amazon.com/ses/latest/dg/send-email-api.html "Amazon SES developer documentation"
[2]: https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SendEmail.html "Amazon SES developer documentation"
