---
contentType: guide
slug: aws-ses-account-level-suppression
title: "Amazon SES Account-Level Suppression: How to Use It"
description: "Understand Amazon SES account-level suppression, its bounce and complaint reasons, and how to reconcile it with application-level blocks."
authorSlug: repmail-team
publishedAt: "2026-09-21"
tags: ["amazon-ses", "suppression", "bounces", "deliverability"]
keyTakeaways:
  - "Account-level suppression is an SES safety boundary across the sending identities covered by the account, not a replacement for your own contact policy."
  - "Choose automatic suppression reasons deliberately and keep an auditable application-level record alongside SES."
  - "A remove action should be a reviewed exception, never an automatic way to resume every failed address."
prerequisites:
  - label: "Configure SES bounce and complaint notifications"
    href: "/repmail/learn/infrastructure/aws-ses-bounce-complaint-notifications"
  - label: "Review email bounces"
    href: "/repmail/learn/glossary/bounce"
commonMistakes:
  - "Assuming an account-level list is identical to a campaign-level unsubscribe list."
  - "Deleting local suppression evidence after removing an address from SES."
  - "Ignoring Region, identity, and API permissions when reconciling suppression state."
faqs:
  - question: "What does the SES account-level suppression list do?"
    answer: "It tells SES not to send to addresses on the account-level list for the configured suppression reasons. It is an SES enforcement layer; your application still needs its own unsubscribe, consent, and campaign eligibility records."
  - question: "Can I remove an address from suppression?"
    answer: "AWS provides management operations for account-level suppression. Removal should be limited to a reviewed, documented case because the original bounce or complaint can still make the address unsafe."
  - question: "Does SES suppression replace bounce processing?"
    answer: "No. Suppression prevents a future send, while event processing explains why the address was blocked and lets your application reconcile contact, campaign, and compliance state."
nextStep:
  label: "Compare SES SMTP and API sending"
  href: "/repmail/learn/infrastructure/smtp-connection-vs-api"
  description: "The transport can vary, but every transport should consult suppression before sending."
assets:
  - type: checklist
    title: Suppression reconciliation checklist
    content:
      - "Normalize the recipient address using one documented rule before comparison."
      - "Store source, reason, first-seen time, last event, and the SES Region used."
      - "Compare SES account-level suppression with unsubscribe, complaint, and hard-bounce tables."
      - "Block sends in every campaign and transport path, including test and retry jobs."
      - "Require a reason and reviewer for any removal or reactivation."
---

**Amazon SES account-level suppression is a last-mile guard against sending to addresses that have produced serious delivery feedback.** Use it with your application’s unsubscribe and eligibility data, not instead of them. The practical pattern is to ingest bounce and complaint events, record the reason locally, and reconcile the local decision with SES before every send path.

## What the list is for

SES can maintain an account-level suppression list for addresses that should not receive mail from the account for the configured suppression reasons. This is different from a campaign unsubscribe list. An unsubscribe is a recipient preference that your application must honor. A hard bounce or complaint is a delivery or reputation signal that should generally stop future mail until a deliberate review says otherwise. One recipient can therefore appear in several controls with different reasons.

Think of suppression as an enforcement boundary, not a source of truth for your entire CRM. SES knows about sending events and account-level blocks. Your application knows about the contact’s campaign membership, opt-out history, source, and business rules. Keeping both records lets an operator answer not only “will SES send?” but also “why was this contact eligible in the first place?”

AWS’s current SES controls are Region- and permission-aware. Use the Region and API identity that your sender actually uses, and verify scope in the AWS documentation before assuming a list created in one console view is visible to every sender. Store the Region with your reconciliation record so an operations review does not have to guess.

## Configure reasons, then reconcile events

Decide which event reasons should add addresses automatically, based on your sending policy and the SES controls available to the account. Do not copy a default blindly: a team sending transactional and outreach traffic together may need a stricter internal rule than a single-purpose sender.

When an SES event arrives, normalize the recipient address, preserve the raw event or a durable reference to it, and write a local suppression record with the event type, diagnostic detail, timestamp, campaign, and sending Region. Then check the SES account-level list using the documented API or console flow. The local record should remain even if someone later removes the SES entry; otherwise the same address can be reintroduced by a list import with no visible history.

The event source should be the same one described in [SES bounce and complaint notifications](/repmail/learn/infrastructure/aws-ses-bounce-complaint-notifications). Keeping publication, classification, and suppression as separate steps makes it easier to identify whether a problem is in SES, the event consumer, or the campaign database.

Make every send path consult suppression. That includes API jobs, SMTP workers, retries, test tools, and manual exports. A common failure is to protect the main campaign worker while a retry queue or a second integration still submits the address. The safe invariant is simple: if the local policy says “do not send,” no transport is allowed to override it. If SES says “suppressed,” the application should treat the recipient as ineligible even when a stale local table says otherwise.

## Treat removal as an exception

SES provides management operations for adding, listing, and removing account-level suppression entries. Removal is not a reset button. A complaint can reflect a recipient’s durable preference, and a hard bounce can recur after a temporary mailbox change. Require a reason, evidence, reviewer, and reactivation date or follow-up before removing an entry. Keep the original event in the audit trail.

If an address is legitimately reactivated, do not immediately re-add it to every old campaign. Re-establish eligibility in the application, confirm that any unsubscribe state is clear, and send only through a controlled test or appropriate new segment. There is no universal “safe after X days” rule in the suppression list itself.

## Where RepMail fits

For RepMail users, account-level suppression is most useful when it complements a visible campaign-level suppression state. The product relevance is operational: a sender should be able to explain why an address is blocked and prevent a new import or retry from bypassing that decision. Confirm how your current RepMail workspace exposes suppression and which AWS Region it uses; do not infer those details from a generic SES tutorial.

## Sources

- [AWS: Using the Amazon SES account-level suppression list](https://docs.aws.amazon.com/ses/latest/dg/suppression-list.html)
- [AWS: Using the SES v2 suppression list API](https://docs.aws.amazon.com/ses/latest/APIReference/APIv2_Operations.html)
- [AWS: Monitoring Amazon SES sending activity](https://docs.aws.amazon.com/ses/latest/dg/monitor-sending-activity.html)
- [AWS: Request production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)
