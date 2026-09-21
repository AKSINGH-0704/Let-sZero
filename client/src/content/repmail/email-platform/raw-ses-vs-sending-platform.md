---
product: repmail
academy: email-platform
contentType: comparison
slug: raw-ses-vs-sending-platform
title: "Raw SES vs. an Email Sending Platform"
description: "Raw Amazon SES gives delivery control; a sending platform adds workflow and operations. Compare the boundary before you build or buy."
authorSlug: repmail-team
publishedAt: "2026-09-21"
tags: ["email-platform", "ses", "email-api", "email-infrastructure", "deliverability"]
keyTakeaways:
  - "Raw SES is a delivery building block, not a complete campaign operating system."
  - "A platform earns its place by reducing workflow and operational work without hiding important events."
  - "You can separate the application, delivery, and workflow layers rather than treating them as one choice."
prerequisites:
  - label: "What is an email API?"
    href: "/repmail/learn/email-platform/what-is-an-email-api"
  - label: "How AWS SES supports cold email"
    href: "/repmail/learn/infrastructure/aws-ses-for-cold-email"
commonMistakes:
  - "Assuming raw SES includes contact management, sequencing, personalization, suppression policy, or reporting."
  - "Assuming a sending platform removes the need for DNS authentication and list hygiene."
  - "Treating a successful SES submission as a delivery or inbox-placement result."
faqs:
  - question: "Is raw Amazon SES an email sending platform?"
    answer: "SES is an email service and delivery interface. It can send through an API or SMTP, but application teams still need to build or supply the campaign workflow, suppression rules, data model, and operational monitoring they require."
  - question: "When should a team use raw SES?"
    answer: "Raw SES is a reasonable fit when the application owns message generation and the team can operate authentication, retries, suppression, event processing, and monitoring. It is less suitable when non-engineers need a ready-made outreach workflow."
  - question: "Does a sending platform replace SES?"
    answer: "Not always. Some platforms use a provider such as SES underneath. The platform can add orchestration and safety controls while the provider remains the delivery layer. Check what is included and what remains your responsibility."
nextStep:
  label: "Understand infrastructure by message type"
  href: "/repmail/learn/email-platform/transactional-marketing-cold-email-infrastructure"
  description: "The right boundary depends on whether the message is transactional, subscribed marketing, or prospecting."
assets:
  - type: table
    title: "Raw SES and sending platform responsibilities"
    content:
      headers: ["Responsibility", "Raw SES", "Sending platform"]
      rows:
        - ["Message submission", "API or SMTP primitive", "Usually included in workflow"]
        - ["MIME and headers", "Application or library", "Product defaults plus controls"]
        - ["Sequences and follow-ups", "Build it", "May be built in"]
        - ["Suppression policy", "Build and operate it", "Should be explicit and testable"]
        - ["Event trail", "Configure destinations and storage", "Should be searchable in the product"]
---
**Raw Amazon SES and an email sending platform are different layers.** Raw SES provides APIs and SMTP for submitting email, while a sending platform adds the workflow and operational controls around that delivery path. Choose raw SES when your application team wants to own those controls. Choose a platform when campaign operators need them ready to use. In either case, authentication, recipient quality, and mailbox-provider response still determine outcomes.

## What raw SES actually gives you

AWS documents two SES API composition modes. With formatted sending, SES assembles a properly formatted message from the addresses, subject, and body you provide. With raw sending, your application constructs the message and supplies its headers and MIME parts. SES also supports SMTP. These are delivery interfaces, not a contact database or a complete outreach process.

A raw SES implementation therefore needs decisions outside the API call. Your team must define how contacts are stored, how a message is personalized, how retries are bounded, how duplicate jobs are prevented, and how bounces, complaints, and unsubscribes affect future sends. You must also create a relationship between your internal message record and the SES message identifier so later events can be reconciled.

Raw does not mean better deliverability. It means more control over composition and more responsibility for operation. A carefully built service can be appropriate for application-triggered mail. An improvised script can send valid MIME and still create poor list hygiene, weak suppression, or an untraceable incident.

## What a sending platform adds

A sending platform should make the operating model visible. Depending on the product, it may provide contact import, personalization, sequence scheduling, approval steps, rate controls, suppression, campaign state, and reporting. The value is not that it “sends email” more magically than SES. The value is that it packages decisions that would otherwise become application code, scripts, or manual work.

That value has a boundary. A platform cannot make an unauthenticated domain trustworthy, turn an invalid address into a valid one, or guarantee inbox placement. Review whether the provider owns the SES account, how sending domains are connected, which events are exposed, and whether you can export the evidence needed to diagnose a problem.

## Compare the boundary, not the labels

| Question | Raw SES | Sending platform |
| --- | --- | --- |
| Who creates the message? | Your application or library | Product workflow, templates, or integrations |
| Who schedules follow-ups? | Your application | Product rules, if supported |
| Who decides suppression? | Your code and data model | Product policy and controls, which must be inspected |
| Who receives provider events? | Destinations that you configure | Platform event pipeline and its exposed records |
| Who owns authentication? | Your team, even when SES signs mail | Shared between your team and provider, depending on setup |

The table is a starting point, not a feature claim about every vendor. Ask for a lifecycle demonstration with a real message identifier. A credible answer should show submission, provider acceptance, delivery or failure event, suppression action, and later reporting.

## When raw SES is the better boundary

Raw SES fits when a product already has a reliable event-driven backend, engineers can maintain retry and deduplication behavior, and messages are triggered by application state. It can also fit when MIME control is central, such as a system that creates its own attachments or headers. The team should document its responsibility for DNS, access credentials, rate limits, feedback processing, and data retention before launch.

## When a platform is the better boundary

A sending platform fits when people run campaigns, need sequencing and personalization, and should not have to write code to suppress a bounced contact. It is particularly useful when the platform exposes enough detail for operators to understand what happened without hiding the underlying provider event. Do not trade away the identifiers and logs that make incidents diagnosable.

## Where RepMail fits

RepMail uses AWS SES as the delivery layer and adds a cold-outreach workflow around it. The current implementation stores SES message IDs on campaign-email records and processes AWS SNS feedback for bounce and complaint handling. That is the distinction this comparison is meant to clarify: SES provides the transport and event primitives; RepMail provides product-level campaign execution and suppression behavior for its use case. Read [how to choose an email sending platform](/repmail/learn/email-platform/email-sending-platform-selection) and [email-sending observability](/repmail/learn/email-platform/email-sending-observability) before deciding whether to build the surrounding layer yourself.

## Sources

- [Using the Amazon SES API to send email](https://docs.aws.amazon.com/ses/latest/dg/send-email-api.html)
- [Sending raw email using the Amazon SES API v2](https://docs.aws.amazon.com/ses/latest/dg/send-email-raw.html)
- [Using the Amazon SES SMTP interface](https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html)
- [Amazon SES event publishing](https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html)

The decision is not “SES or software.” It is **which layer should own each operational responsibility**, and whether that ownership is explicit enough to test.

[1]: https://docs.aws.amazon.com/ses/latest/dg/send-email-api.html "Using the Amazon SES API to send email"
[2]: https://docs.aws.amazon.com/ses/latest/dg/send-email-raw.html "Sending raw email using the Amazon SES API v2"
[3]: https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html "Using the Amazon SES SMTP interface"
[4]: https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html "Monitor email sending using Amazon SES event publishing"
