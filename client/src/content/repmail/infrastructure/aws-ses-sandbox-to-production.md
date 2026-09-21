---
contentType: guide
slug: aws-ses-sandbox-to-production
title: "Amazon SES Sandbox to Production: A Practical Checklist"
description: "Move an Amazon SES account from sandbox to production by checking Region, identities, quotas, recipient rules, and the access request."
authorSlug: repmail-team
publishedAt: "2026-09-21"
tags: ["amazon-ses", "infrastructure", "deliverability", "getting-started"]
keyTakeaways:
  - "SES sandbox status is regional, so check the same Region your application uses."
  - "Verify identities, test bounce and complaint handling, and prepare a truthful production-access request before asking for a quota change."
  - "Production access removes sandbox recipient restrictions; it does not make unsolicited or poorly managed sending acceptable."
prerequisites:
  - label: "Understand your sending domain"
    href: "/repmail/learn/infrastructure/email-infrastructure-explained"
  - label: "Set up domain authentication"
    href: "/repmail/learn/infrastructure/dns-records-for-email"
commonMistakes:
  - "Requesting production access in one AWS Region while the application sends from another."
  - "Treating production approval as permission to send to unverified or irrelevant recipients."
  - "Skipping bounce, complaint, and suppression testing until after launch."
faqs:
  - question: "What changes when SES leaves the sandbox?"
    answer: "In the sandbox, SES restricts sending to verified identities and verified recipients or simulator addresses. Production access removes those sandbox recipient restrictions, subject to the account's current quotas and policies."
  - question: "Is SES production access guaranteed?"
    answer: "No. AWS reviews the request and may ask for more information or decline it. The request should accurately describe the mail, recipient acquisition, authentication, and bounce and complaint controls."
  - question: "Do I need a separate request for every Region?"
    answer: "SES resources and sending status are Region-aware. Check the Region used by your sender and follow AWS's current production-access process there rather than assuming a different Region's status carries over."
nextStep:
  label: "Set up SES bounce and complaint notifications"
  href: "/repmail/learn/infrastructure/aws-ses-bounce-complaint-notifications"
  description: "Production access is only a gate; notifications are how you operate safely after it opens."
assets:
  - type: checklist
    title: SES production-access readiness checklist
    content:
      - "Record the AWS Region, verified domain identity, From addresses, and intended sending path."
      - "Confirm SPF, DKIM, and any custom MAIL FROM records are published and tested."
      - "Document how recipients are collected, why the mail is relevant, and how opt-outs are honored."
      - "Configure and test bounce, complaint, and suppression handling with SES mailbox simulators where appropriate."
      - "Record expected volume and cadence without presenting them as guaranteed SES quotas."
      - "Submit production access with a plain-language description of the program and an operations contact."
---

**Amazon SES sandbox access is a restricted test state, not a smaller version of production.** Before requesting production access, verify the right Region and identity, prove that your application can handle delivery events, and explain a legitimate sending program. AWS decides whether to approve the request; no checklist can guarantee approval.

## Start with the Region and sending identity

Amazon SES is Region-aware. A domain verified in one Region may need to be verified again in another, and an account's sending status and quotas are not something to infer from a different Region. Start by finding the Region in the SES console, SDK client, or SMTP endpoint used by the application. Record it in the deployment runbook.

Then verify the identity that will appear in the message. A domain identity is usually the durable choice for an application because it lets you authenticate the domain and manage authorized From addresses together. An individual email identity can be useful for a narrow test, but it is not a substitute for domain authentication. Review [email infrastructure explained](/repmail/learn/infrastructure/email-infrastructure-explained) and the [DNS records for email](/repmail/learn/infrastructure/dns-records-for-email) before treating verification as complete.

In the sandbox, SES limits who you can send to. AWS documents a restriction to verified recipients, apart from SES mailbox simulator addresses, while the account remains in the sandbox. That means a successful test to a verified address demonstrates that the request path works; it does not demonstrate that an arbitrary recipient can receive mail before production access.

## Prepare the request with operational detail

The production-access request should answer the questions a reviewer needs to understand risk. Describe what the messages are, how recipients enter the list, how often you expect to send, and what happens when a recipient opts out. Be specific about authentication and the system that receives bounces and complaints. Do not describe a cold list as opted in, and do not imply that approval makes every campaign acceptable.

AWS may set or retain account-specific sending limits. The request is therefore not a promise of a particular daily volume. Treat the limits shown for the account as the source of truth and monitor them after approval. If a program grows, request a quota increase through the current AWS process rather than designing around a number copied from an old guide.

Before submitting, test the whole failure path. Send a controlled message, receive the event, record the message identifier, and verify that your application can classify a hard bounce, a temporary failure, and a complaint. Reconcile the event with your contact record and suppress the recipient before another campaign can use the address. The companion guide on [SES bounce and complaint notifications](/repmail/learn/infrastructure/aws-ses-bounce-complaint-notifications) covers the event boundary in more detail.

## What production access does—and does not—mean

Production access changes the sandbox recipient restriction. It does not remove authentication requirements, reputation risk, account review, or recipient expectations. A production account can still be throttled, blocked, or investigated if its traffic produces poor signals or violates AWS policies. It also does not turn a purchased, scraped, or irrelevant list into a defensible audience.

A useful launch gate is narrower than “SES says production.” Ask five questions: are the correct identities verified in the sending Region; are DNS records published; can the sender handle throttling and retries; are bounce and complaint events connected to suppression; and can a human explain why each recipient is receiving the message? If any answer is no, keep testing rather than using approval as the finish line.

## Where RepMail fits

RepMail’s infrastructure content is organized around the same separation of concerns: domain setup, sending transport, and delivery-event handling are different jobs. If you use RepMail or another SES-backed application, confirm which AWS Region and identity it uses, then verify the resulting events in the application’s own activity and suppression workflow. The safe assumption is that the tool can only act on the signals it receives; your AWS configuration and recipient policy still determine the boundaries.

## Sources

- [AWS: Request production access (move out of the SES sandbox)](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)
- [AWS: Creating and verifying identities](https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html)
- [AWS: Managing SES sending limits](https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas.html)
- [AWS: Using the Amazon SES mailbox simulator](https://docs.aws.amazon.com/ses/latest/dg/send-email-simulator.html)
