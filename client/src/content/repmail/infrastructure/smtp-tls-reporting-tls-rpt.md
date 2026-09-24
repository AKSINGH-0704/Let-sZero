---
product: repmail
academy: infrastructure
contentType: engineering-article
slug: smtp-tls-reporting-tls-rpt
title: "SMTP TLS Reporting: Set Up and Read TLS-RPT Data"
description: "Publish TLS-RPT, route reports, parse failure data, and define retention without confusing transport evidence with inbox placement."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["tls-rpt", "smtp", "monitoring"]
collections: ["email-infrastructure-decisions", "email-platform-essentials"]
learningPaths: ["email-infrastructure"]

keyTakeaways:
  - "TLS-RPT is a reporting mechanism for SMTP TLS outcomes, not a placement metric."
  - "Design the report endpoint and retention before publishing the record."
  - "Use failures to investigate transport paths alongside MTA-STS or DANE evidence."
faqs:
  - question: "What does TLS-RPT prove?"
    answer: "It reports observations about SMTP TLS policy evaluation for participating senders. It does not prove that every message was observed or that mail reached the inbox."
  - question: "Where should TLS-RPT reports go?"
    answer: "Use a controlled mailto or HTTPS endpoint supported by your operational tooling, with an owner, access controls, parsing, and retention plan."
  - question: "Is TLS-RPT the same as MTA-STS?"
    answer: "No. MTA-STS publishes a transport policy; TLS-RPT reports failures and successes related to TLS policy evaluation."
nextStep:
  label: "Instrument sending observability"
  href: /repmail/learn/email-platform/email-sending-observability
  description: "Continue with the closest operational guide."
assets:
  - type: table
    title: TLS-RPT triage fields
    content:
      headers: ["Field", "Question", "Action"]
      rows:
        - ["Report period", "When did the observations occur?", "Align with changes"]
        - ["Policy domain", "Which domain was evaluated?", "Check intended policy"]
        - ["Successful sessions", "What worked?", "Track coverage"]
        - ["Failure type", "What failed?", "Inspect certificate, DNS, or TLS"]
        - ["Report endpoint", "Where was data sent?", "Verify access and retention"]

---

TLS-RPT is a reporting mechanism for SMTP TLS failures. Publish a `_smtp._tls` TXT record that describes where reports should go, then treat the resulting data as transport evidence. It does not measure inbox placement and should not be used as a substitute for message or complaint data.

## Design the reporting path

Read [RFC 8460] and decide whether reports arrive at a mailto or HTTPS endpoint supported by your tooling. Define an owner, authentication and access controls, retention, parsing, and redaction policy before publishing. Test the endpoint with a fixture and ensure the system can associate a report with a domain and reporting period.

If you use [MTA-STS](/repmail/learn/infrastructure/mta-sts-testing-to-enforcement), keep policy deployment and reporting changes coordinated but separate. A TLS-RPT record does not enforce TLS; it tells participating senders where to report policy evaluation results.

## Interpret a report carefully

Extract report source, period, policy domain, successful sessions, failed sessions, failure reason, receiving MX, and policy result. Group failures by certificate, DNS, hostname, TLS negotiation, or policy retrieval. Compare timestamps with certificate renewals, MX changes, DNS edits, and provider migrations. Do not turn a report count into a percentage for all mail unless its coverage and denominator are known.

Feed transport events into [sending observability](/repmail/learn/email-platform/email-sending-observability), but keep them distinct from SMTP acceptance, bounce, complaint, and placement. If a failure appears, preserve the report, reproduce the relevant DNS or HTTPS path, and assign the infrastructure owner before changing policy.

## Related resources

Use the [Email Infrastructure academy](/repmail/learn/infrastructure/email-infrastructure-explained) for transport architecture.

This workflow should be checked against the cited standards and current provider documentation [1].

## Retention and privacy boundaries

Reports can contain domains, MX names, timestamps, and failure details that should not be available to every application user. Restrict access, define a retention period, and redact data before copying it into tickets. Correlate a failure with DNS, certificate, or policy changes, but avoid attributing a delivery or placement outcome when the report only describes the TLS session.

## Make TLS reporting operational

TLS-RPT is feedback about attempted encrypted delivery, not proof that every message was encrypted, delivered, or placed. Define the reporting domain, URI owner, parser, retention, access, and incident responder before publishing. For an external destination, preserve the authorization evidence.

| Field | Evidence | Stop/qualify rule |
| --- | --- | --- |
| _smtp._tls | exact TXT, TTL, ticket | Stop on malformed URI or wrong domain |
| Policy | mode, URI, owner, failure behavior | Qualify as aggregate telemetry |
| Authorization | record/token and approver | Stop until confirmed |
| Ingestion | sample, parser version, timestamp | Stop if unreadable or dropped |
| Incident | severity, owner, provider packet | Pause unexplained failures |
| Access | permissions and retention decision | Qualify with counsel if needed |

Use [RFC 8460](https://www.rfc-editor.org/rfc/rfc8460) and [RFC 8461](https://www.rfc-editor.org/rfc/rfc8461). Start monitoring-only, classify failures as policy, certificate, DNS, or network, and link each to a ticket. Do not increase volume while a failure is unexplained. Revalidate after certificate, DNS, provider, or destination changes.

## References

[1]: https://www.rfc-editor.org/rfc/rfc8460 "RFC 8460: SMTP TLS Reporting"
[2]: https://www.rfc-editor.org/rfc/rfc8461 "RFC 8461: SMTP MTA Strict Transport Security"

