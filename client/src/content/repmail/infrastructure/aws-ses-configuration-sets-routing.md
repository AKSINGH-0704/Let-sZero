---
product: repmail
academy: infrastructure
contentType: guide
slug: aws-ses-configuration-sets-routing
title: "AWS SES Configuration Sets: Tags, Destinations, and Routing"
description: "AWS SES Configuration Sets: Tags, Destinations, and Routing — SES teams needing campaign or tenant-level event routing."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["infrastructure","ses","aws","email","configuration","sets","tags"]
assets:
  - type: table
    title: "Configuration-set routing diagnostic table"
    content:
      headers: ["Symptom","Likely cause","Quick check","Immediate remediation"]
      rows:
        - ["Events not arriving in Firehose","Incorrect destination ARN or IAM permission","Check Firehose ARN and role policy attached to SES event publishing","Fix ARN or update IAM role to allow ses:PutEvents or appropriate Firehose action"]
        - ["Events routed to default/instrumentation stream","Missing configuration_set_name on send","Inspect send call or SMTP headers for X-SES-CONFIGURATION-SET","Update sender code or MTA to include configuration_set_name; reprocess events if available"]
        - ["Missing event types (e.g., opens)","Event type not selected in event destination filter","Open events were not enabled for that destination","Update event destination filters to include the missing event type and retest"]
        - ["Configuration set visible but tags absent in downstream","Tags not propagated to payload or downstream transform drops them","Inspect sink record payload for configurationSetName and check transformation logic","Adjust transformation to preserve tags or include configurationSetName; add tag enrichment step"]
        - ["High cost / excessive events","Overbroad event selection or fan-out to multiple destinations","Review event filters and number of downstream consumers","Narrow event filters, consolidate consumers, or introduce EventBridge with selective rules"]
featured: false
collections: ["email-infrastructure-decisions"]
learningPaths: ["email-infrastructure"]
keyTakeaways:
  - "SES teams needing campaign or tenant-level event routing"
  - "Uses configuration sets as routing control, not generic SES event publishing overview"
  - "Link from observability, IP-pool, and event schema pages"
commonMistakes:
  - "Skipping this check: Define naming convention for configuration sets (include tenant and environment)."
  - "Skipping this check: Enumerate required event types per configuration set (delivery, bounce, complaint, open, click, reject)."
  - "Skipping this check: Provision destination resources with least-privilege IAM (Firehose, SNS, EventBridge, CloudWatch)."
faqs:
  - question: "Can I enforce that every send uses a configuration set?"
    answer: "SES does not enforce configuration-set usage at the service level. Enforce this at your sending layer: validate the SDK call parameters or SMTP headers in your application or MTA, reject sends missing the configuration set, and monitor for events without configurationSetName."
  - question: "Will configuration set tags appear in Firehose or EventBridge records automatically?"
    answer: "configurationSetName appears in SES event payloads sent to destinations. Tags applied to the configuration set are metadata in SES console and APIs; they are not guaranteed to be automatically injected into event payloads consumed by Firehose or EventBridge. If you need tags in downstream records, either include equivalent attributes at send time or enrich records in a transformation step."
  - question: "Can one configuration set route different event types to different destinations?"
    answer: "Yes. A configuration set can have multiple event destinations with filters so you can route bounces to an SNS topic for alerts and deliveries to Firehose for analytics. Verify filters and destination permissions during setup and test each path."
nextStep:
  label: "Continue with Amazon SES Account-Level Suppression: How to Use It"
  href: "/repmail/learn/infrastructure/aws-ses-account-level-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Use SES configuration sets to route events by campaign, tenant, or IP pool to different sinks (CloudWatch, Kinesis Data Firehose, SNS, EventBridge) and attach tags for search and lifecycle control. Configure event destinations per configuration set, apply configuration sets at send time, and validate routing with small test sends and event filters. This guide focuses on using configuration sets as routing control rather than a generic overview of SES event publishing.

## When to use configuration sets for routing

Decision boundary: use configuration sets when you need deterministic, sender-controlled routing for events at campaign or tenant granularity (for example: route TenantA to FirehoseA, TenantB to FirehoseB), or when you want per-campaign tagging for downstream processing. Don’t use configuration sets for global account-level monitoring alone — a single account-level destination can still be useful but will not isolate tenant-level streams.
Evidence limits: SES documentation describes configuration sets and event destinations; this guide relies on those provider capabilities but does not substitute for account-specific limits or pricing [1][2].
Practical sequence: design a naming scheme (e.g., cfg-Tenant-<id>-<env>), decide which event types you need (send, delivery, bounce, complaint, reject, open, click), and map each configuration set to one or more event destinations. Keep mapping simple: one configuration set → primary destination; use SNS or EventBridge for fan-out if multiple consumers are required.

## Tags and metadata: how to use them operationally

Decision boundary: use SES configuration set tags to identify ownership, retention, compliance classification, and environment. Tags are metadata only; they don’t change SES behavior beyond being queryable in tooling and console listings.
Evidence limits: AWS docs list tag support but do not guarantee cross-service tag behavior or retention policies; test in your account if downstream systems rely on tags [1].
Practical sequence: create a mandatory minimal tag set (owner, team, tenant_id, env, retention_days). Enforce tag application via IaC templates or pre-send middleware. Use tags in downstream consumers (e.g., match tenant_id in Firehose transformations) rather than relying on implicit assumptions.

## Event destinations and routing patterns

Decision boundary: choose a destination type based on the consumer needs—CloudWatch for alerts and metrics, Kinesis Firehose for analytics and S3 landed data, SNS for asynchronous notifications, and EventBridge for complex routing and cross-account events. A single configuration set can have multiple event destinations with filters.
Evidence limits: routing filters and supported event types are described in AWS docs; behavior can vary by region and account, so validate in your target region [2].
Practical sequence: 1) List required event types per use case (e.g., bounces and complaints for operational alerts; deliveries/opens for analytics). 2) Create destination resources (Firehose stream, SNS topic, EventBridge bus). 3) Add event destinations to the configuration set and define event type filters. 4) Test with representative messages and verify records in each sink.

## Applying configuration sets at send time and enforcement

Decision boundary: configuration sets must be specified during send (via API/SMTP headers or SDK) to route that message’s events. If you need mandatory application (e.g., to prevent tenant events leaking to a default stream), enforce at the application or SMTP gateway layer; SES does not natively block sends missing a configuration set tag.
Evidence limits: SES supports specifying configuration sets in send API calls and SMTP headers; enforcement mechanisms are implementation-specific and are not directly provided by SES documentation [1].
Practical sequence: 1) Integrate configuration_set_name into your send API call or add X-SES-CONFIGURATION-SET SMTP header. 2) Add pre-send validators that reject or tag sends missing configuration data. 3) For SMTP-based systems, configure the MTA to inject or validate headers. 4) Monitor for events without expected tags to detect misrouted sends.

## Validation, testing, and common failure modes

Decision boundary: validate both routing and payload schema. Routing tests must prove that each event type for a configuration set arrives in the intended sink and contains expected metadata (configuration set name, message-id).
Evidence limits: test procedures are operational best practices derived from provider capabilities; SES behavior for edge cases (e.g., partial delivery of events) can vary and should be validated in your environment [2].
Practical sequence: 1) Create a dedicated test configuration set and destinations. 2) Send test messages that exercise bounce, complaint, delivery, open, and click events (where applicable). 3) Verify records in the sink include configurationSetName and any tags you expect. 4) Common failures: mis-specified destination ARN, incorrect permissions on Firehose/SNS/EventBridge, missing configuration_set_name at send, or overbroad event filters that drop events.

## Practical checklist

- [ ] Define naming convention for configuration sets (include tenant and environment).
- [ ] Enumerate required event types per configuration set (delivery, bounce, complaint, open, click, reject).
- [ ] Provision destination resources with least-privilege IAM (Firehose, SNS, EventBridge, CloudWatch).
- [ ] Implement pre-send enforcement: SDK parameter or SMTP header injection and validation.
- [ ] Create mandatory tags (owner, tenant_id, env, retention_days) and validate via IaC or middleware.
- [ ] Add event type filters per destination to minimize noise and cost.
- [ ] Run end-to-end tests for each configuration set and event type; capture message-id and configurationSetName in sinks.
- [ ] Monitor for events missing expected configurationSetName or tags and trigger alerts.
- [ ] Document owner and remediation steps for each configuration set.

## Where RepMail fits

This guide can be used as a decision aid and checklist in outbound workflows: map campaigns or tenants to configuration sets in your sending code, run the provided tests before wide releases, and use the diagnostic table to troubleshoot misrouted events. Keep owners and remediation steps documented so deliverability and ops teams can act quickly when events are missing or misrouted.

Continue with [Amazon SES Account-Level Suppression: How to Use It](/repmail/learn/infrastructure/aws-ses-account-level-suppression) for the next step in the workflow.

## Related RepMail guides

- [AWS SES API v2 Formatted vs Raw Email: A Practical Boundary](/repmail/learn/infrastructure/aws-ses-api-v2-formatted-vs-raw)
- [AWS SES Event Destinations: CloudWatch, SNS, EventBridge, or Firehose](/repmail/learn/infrastructure/aws-ses-event-destinations-compared)


## Sources

[1]: https://docs.aws.amazon.com/ses/latest/dg/using-configuration-sets.html "Amazon SES developer documentation"
[2]: https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html "Amazon SES developer documentation"
