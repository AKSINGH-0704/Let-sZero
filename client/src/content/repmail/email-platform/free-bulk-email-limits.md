---
product: repmail
academy: email-platform
contentType: guide
slug: free-bulk-email-limits
title: 'Free Bulk Email Limits: Contacts, Sends, and Reset Windows'
description: Compare free bulk email limits by contact count, sends, reset window,
  and campaign fit. Use this dated checklist to verify quotas before sending.
authorSlug: repmail-team
publishedAt: '2026-10-26'
updatedAt: '2026-10-26'
tags:
- bulk email
- email service limits
- free email tools
- email campaigns
collections:
- email-platform-essentials
learningPaths:
- email-infrastructure
keyTakeaways:
- Contact caps and send quotas are different; check both.
- Confirm whether sending limits count recipients, messages, or another unit.
- Record the reset window and the documented consequence of reaching a cap.
- Treat comparison articles as shortlist aids, not authoritative current quota schedules.
commonMistakes:
- Comparing headline send counts without checking the denominator.
- Assuming contact capacity equals permission or capacity to send to that audience.
- Assuming a quota resets at the start of a calendar month without confirmation.
- Scheduling a time-sensitive campaign before checking what happens at the limit.
faqs:
- question: Does a monthly send limit count campaigns or recipients?
  answer: It depends on the provider’s definition. Verify whether the quota counts
    messages, recipient-level sends, delivered messages, or campaigns. Do not assume
    one campaign uses only one unit.
- question: Do free email services reset limits at the start of each month?
  answer: Not necessarily. A provider may define a calendar-month or rolling window,
    or another reset schedule. Check the plan documentation for the exact timing and
    time zone.
- question: What should I do if a provider does not explain its free limits?
  answer: Treat the quota and over-limit behavior as unverified. Ask the provider
    for the counting rule, reset window, and stop condition before relying on the
    service for a scheduled campaign.
nextStep:
  label: Compare email platform essentials
  href: /repmail/learn/collections/email-platform-essentials
  description: Review the platform components to evaluate alongside contact and sending
    quotas.
assets:
- type: checklist
  title: Free-plan bulk email go/no-go checklist
  content:
    asOf: '2026-10-26'
    checklist:
    - Record the provider, plan name, and date its plan terms were checked.
    - Confirm the contact cap and whether inactive or unsubscribed records count.
    - 'Confirm the send quota denominator: messages, recipients, deliveries, or campaigns.'
    - Calculate planned recipient sends across the full quota window.
    - Record the reset schedule and time zone.
    - Confirm what happens when a contact or sending limit is reached.
    - Verify campaign features, unsubscribe handling, and sender setup before scheduling.
    - Mark GO only if the plan fits the audience and send, and the stop condition
      is documented; otherwise PAUSE and verify.
---

As of October 26, 2026, there is no single “free bulk email” limit: providers may cap stored contacts, messages sent, daily sends, or campaign features separately. Before choosing a service, identify what each quota counts, when it resets, and what happens when you reach it. The comparison sources below are useful for discovering services, but they should not be treated as current, authoritative quota schedules; confirm exact limits on the provider’s own plan and billing pages. [1][2]

## Compare limits using the same denominators

A headline such as “5,000 emails per month” is incomplete unless you know whether it means messages, recipients, or campaigns. A campaign to 500 recipients may use 500 sends under a recipient-based quota, even though you launched only one campaign. Likewise, a contact cap usually describes how many records you can store, not how many people you can email in a billing period.

Use this table to compare plans. Fill in the values from each provider’s current plan page and terms; do not infer one limit from another.

| Limit to record | Denominator to verify | What to ask before relying on it | Confidence to assign |
|---|---|---|---|
| Contacts | Unique stored contacts, active contacts, or all records | Do unsubscribed or inactive contacts count? | High only when the plan page defines the count |
| Monthly sends | Messages, recipients, or delivered messages | Does each recipient count as one send? | High only when the counting rule is explicit |
| Daily rate | Sends per account, sender, or workspace per day | Is it a hard cap, a fair-use policy, or a recommended pace? | High only when scope and enforcement are stated |
| Reset window | Calendar month, rolling period, or another schedule | What date and time does the quota reset, and in what time zone? | High when the provider specifies the reset rule |
| Feature restrictions | Campaigns, automation, segmentation, or support | Which functions are unavailable or limited on free access? | Medium if the feature list is clear; verify before migrating |
| Over-limit outcome | Pause, block, upgrade prompt, or additional charge | Will queued campaigns stop, or can charges apply? | High only when the consequence is documented |

The editorial comparisons from Email Vendor Selection and Mailtrap can help you build a shortlist, but their provider coverage does not substitute for checking a plan’s current definitions and reset rules. Treat an undated or unexplained number as unverified, not as a commitment. [1][2]

## A practical go/no-go procedure

1. **Estimate the send in recipient-level units.** Count the people who should receive the campaign, not just the number of campaign drafts. Exclude people who should not be contacted. For multiple campaigns, add the planned recipients across the relevant quota window.
2. **Check both contact and sending headroom.** Compare your stored audience with the contact cap, then compare planned recipient sends with the applicable daily and monthly limits. A plan can have enough contacts but insufficient send capacity, or the reverse.
3. **Write down the reset rule.** Record the time zone, whether the window is calendar-based or rolling, and when the next usable allowance becomes available. If the provider does not explain this, ask support or choose a plan with clearer documentation.
4. **Check the stop condition.** Find out whether reaching a cap blocks a send, pauses a campaign, prevents new imports, prompts an upgrade, or can trigger a charge. Do not assume a campaign will resume automatically after reset.
5. **Run a small operational test.** Before scheduling a large, time-sensitive campaign, verify the audience count, sending identity, unsubscribe handling, and the account’s current quota display. A small test can reveal setup problems; it does not establish that the provider will deliver later campaigns or that they will reach inboxes.
6. **Choose based on the next likely campaign, not just today’s free allowance.** If your expected audience or send cadence regularly exceeds the documented free limits, compare paid plans and migration effort before building more workflow around a temporary tier. See [email platform essentials](/repmail/learn/collections/email-platform-essentials) for the platform components to compare, and [deliverability tool pricing models](/repmail/learn/deliverability/deliverability-tool-pricing-models) for a separate look at pricing structures.

## Make the decision with a stop rule

Use this simple rule: **go** only when the planned recipient total fits within the clearly documented send allowance for the full quota window, your stored audience fits the contact definition, and you understand the over-limit outcome. **Pause and verify** if any denominator, reset time, or enforcement rule is unclear. **Choose another plan or provider** if the expected campaign exceeds a hard limit or depends on an undocumented exception.

Keep the evidence with your campaign plan: provider, plan name, page checked, date checked, quota definition, reset rule, and over-limit behavior. This prevents an old comparison article or a remembered headline number from silently becoming the operational source of truth.

A free tier is also not a substitute for sound sending practices. Use an audience you are entitled to contact, identify the sender clearly, and provide a working unsubscribe path. This is general information, not legal advice.

RepMail by LetsZero is an option to evaluate if you are comparing campaign tools, but account configuration and current plan terms matter. Its documented sending path uses a verified custom sending domain, and campaign messages include unsubscribe headers and a footer link. For a broader product comparison, see [Instantly vs. RepMail](/repmail/learn/outreach/instantly-vs-repmail) and [Apollo vs. RepMail](/repmail/learn/outreach/apollo-vs-repmail). Confirm current availability and terms before making a purchase decision.

## Sources

[1]: https://www.emailvendorselection.com/bulk-email-services/
[2]: https://mailtrap.io/blog/mass-email-service-providers/
