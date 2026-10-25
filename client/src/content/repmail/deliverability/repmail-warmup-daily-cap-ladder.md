---
product: repmail
academy: deliverability
contentType: tutorial
slug: repmail-warmup-daily-cap-ladder
title: RepMail Warm-Up Daily Cap Ladder
description: 'Plan sends around RepMail’s default warm-up caps: 50, 100, then 200
  per sender per day. Learn what the ladder controls and how to schedule safely.'
authorSlug: repmail-team
publishedAt: '2026-10-25'
updatedAt: '2026-10-25'
tags:
- email warm-up
- daily sending limit
- sender capacity
- deliverability
- campaign planning
collections:
- deliverability-diagnostics
learningPaths:
- provider-deliverability-diagnostics
keyTakeaways:
- RepMail’s default per-sender ladder is 50 sends per day on days 1–3, 100 on days
  4–7, then 200 until the warm-up window ends.
- The default warm-up duration is 30 days, but duration and ladder settings are configurable
  through platform settings.
- A warm-up cap is a volume policy, not a seed-mailbox network or an inbox-placement
  guarantee.
- Calculate remaining capacity for each sender separately and account for campaigns
  and follow-ups already planned that day.
commonMistakes:
- Treating the cap as a recommended daily target.
- Combining capacity across senders instead of planning per sender.
- Assuming the default ladder and duration cannot change.
- Confusing a sending-cap policy with a warm-up network.
- Ignoring overlapping campaigns and follow-up volume when scheduling.
faqs:
- question: What is RepMail’s default warm-up daily limit?
  answer: The default is 50 sends per sender per day on days 1–3, 100 per day on days
    4–7, then 200 per day until the warm-up window ends. Settings can be configured,
    so verify the policy that applies to your sender.
- question: How long does RepMail warm-up last?
  answer: The default warm-up window is 30 days. Its duration is configurable through
    platform settings; do not assume a customer-facing setting is available.
- question: Is RepMail warm-up a seed-mailbox network?
  answer: No. RepMail’s warm-up is a sending-cap policy, not a network of seed mailboxes
    that exchange messages.
- question: What happens if a campaign exceeds the sender’s daily cap?
  answer: Messages beyond available capacity can be deferred, and the campaign can
    resume when capacity reopens. Do not rely on a precise completion date because
    the schedule depends on the configured policy and campaign timing.
nextStep:
  label: Plan your cold outreach capacity
  href: /repmail/learn/deliverability/cold-outreach-capacity-planning
  description: Estimate how campaign volume fits across senders and account for capacity
    before scheduling.
assets:
- type: table
  title: Per-sender warm-up cap planning checklist
  content:
    rows:
    - - Sender
      - Which mailbox will send the campaign?
    - - Warm-up stage
      - Which day of the configured window is active?
    - - Daily cap
      - Check the applicable setting; defaults are 50, 100, then 200 sends per day.
    - - Capacity already used
      - How many sends has this sender made today?
    - - Campaign volume
      - How many recipients are assigned to this sender?
    - - Other activity
      - Are other campaigns or follow-ups planned for the sender today?
    - - Overflow plan
      - Can messages beyond remaining capacity wait for later capacity?
    headers:
    - Planning item
    - Record or check
---

RepMail’s default warm-up ladder allows up to 50 sends per sender per day on days 1–3, 100 per day on days 4–7, and 200 per day after that until the warm-up window ends. Treat those figures as caps, not recommended targets or a promise that every message will reach the inbox. Plan your campaign volume around the active cap for each sender, and confirm the warm-up window and settings that apply to your account.

## What the daily cap means

A daily cap limits how many campaign emails a sender can send during a warm-up day. RepMail applies its warm-up policy per sender and claims a capacity slot before each send. If a campaign has more queued messages than the sender’s remaining capacity, the excess can be deferred and the campaign resumed when capacity is available.

The default stages are a policy ladder: 50 sends per day through day 3, 100 through day 7, then 200 per day for the rest of the warm-up period. The default warm-up duration is 30 days. Duration and ladder settings are configurable through platform settings; do not assume there is a customer-facing control to change them. Missing or malformed settings fall back to safe defaults.

This is a cap policy, not a warm-up network. It does not mean RepMail sends messages among a pool of seed mailboxes or simulates replies and engagement. A sending limit governs volume; it does not certify sender reputation or establish inbox placement.

## Plan using the sender’s current stage

Before scheduling a campaign, identify the sender, the sender’s warm-up day, and the cap for that stage. Then compare the planned volume for that sender with the remaining daily capacity. Do not combine multiple senders’ caps into one shared allowance: calculate each sender separately.

For example, suppose a sender is on day 5 and has already used 30 sends that day. The day 4–7 cap is 100, leaving up to 70 slots under that cap. If a campaign has 90 recipients assigned to this sender, plan for up to 70 to fit within the remaining capacity and for the rest to be deferred. This is a capacity illustration, not a prediction of exact campaign completion time; scheduling and configuration can affect when deferred sends resume.

Use the cap as a ceiling, not a reason to jump immediately to the maximum. If you are deciding how much total outreach to plan across senders, see [cold outreach capacity planning](/repmail/learn/deliverability/cold-outreach-capacity-planning). For the difference between a service quota and a sending rate, see [AWS SES daily quota vs. sending rate](/repmail/learn/infrastructure/aws-ses-daily-quota-vs-sending-rate). Those are related constraints, but they are not interchangeable with a sender’s RepMail warm-up cap.

## A practical scheduling procedure

1. **Choose the sending mailbox.** Check which sender profile the campaign will use. If you are deciding whether to use an alias or a separate mailbox, review [email alias vs. separate mailbox](/repmail/learn/deliverability/email-alias-vs-separate-mailbox).
2. **Establish the warm-up day.** Use the sender’s current warm-up period and applicable platform configuration. Do not infer the stage from campaign volume alone.
3. **Read the cap for that stage.** Apply 50 sends per day for days 1–3, 100 for days 4–7, and 200 thereafter under the default ladder.
4. **Subtract sends already made that day.** The remaining amount is a planning ceiling, not a target.
5. **Compare the remaining capacity with the campaign’s assigned recipients.** If the campaign is larger, allow for deferral over multiple days rather than assuming all recipients will be sent on the first day.
6. **Check the calendar for other planned activity.** Follow-ups and other campaigns can add volume on the same day. Use an [email sending calendar](/repmail/learn/deliverability/email-sending-calendar-follow-up-spikes) to spot planned spikes and coordinate work.
7. **Review the schedule after configuration changes.** The default ladder and duration are not immutable. If you need a warm-up overview, see [how to warm up a domain in 14 days](/repmail/learn/deliverability/how-to-warm-up-a-domain-in-14-days); that guide has a different scope and should not be read as a replacement for the account’s configured sender policy.

## Where RepMail fits

RepMail enforces a per-sender warm-up cap in its sending flow. When a campaign reaches that cap, messages can be deferred and the campaign can resume when capacity reopens. The ladder is therefore useful for operational planning: it helps you estimate whether assigned campaign volume fits within a sender’s current daily limit.

It does not replace broader deliverability work, determine whether your audience or message is appropriate, or establish that a recipient’s provider will place a message in the inbox. Keep campaign volume, mailbox selection, and follow-up timing in view rather than treating the cap as a complete deliverability strategy.

## Cap-planning checklist

| Before scheduling | What to record |
|---|---|
| Sender | Which mailbox will send this campaign? |
| Warm-up stage | Which day of the configured window is active? |
| Daily cap | 50, 100, or 200 under the default ladder; verify configuration |
| Capacity used | How many sends has this sender already made today? |
| Campaign volume | How many recipients are assigned to this sender? |
| Other activity | Are campaigns or follow-ups also planned for this sender today? |
| Overflow plan | Can the remaining recipients wait for later capacity? |

If any of these answers is unknown, pause the scheduling decision and verify the sender assignment or applicable settings first. Avoid promising a precise finish date when volume exceeds the available capacity; the actual schedule depends on the configured policy and resumed campaign timing.

## Common planning errors

- **Treating the cap as a target.** A maximum says how much capacity is allowed under the policy, not how much you must send.
- **Applying one sender’s unused capacity to another.** Plan against each sender’s own cap and existing activity.
- **Assuming the default is fixed.** The ladder and warm-up duration are configurable; verify the settings that apply.
- **Confusing a cap with a warm-up network.** RepMail’s warm-up policy controls sending volume; it is not a seed-mailbox network.
- **Ignoring follow-ups and overlapping campaigns.** Include all planned sends when reviewing daily volume, not just the new campaign.

## Sources

[1]: https://www.reddit.com/r/email/comments/1uf0zrx/does_warming_up_emails_work_anymore/
[2]: https://www.reddit.com/r/Coldemailing/comments/1ubetqf/inbox_warming/
