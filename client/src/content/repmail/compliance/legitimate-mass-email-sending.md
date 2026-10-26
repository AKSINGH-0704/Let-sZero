---
product: repmail
academy: compliance
contentType: guide
slug: legitimate-mass-email-sending
title: 'Legitimate Mass Email Sending: Permission and Stop Rules'
description: 'A practical, dated checklist for sending legitimate mass email: permission,
  identity, limits, suppression, monitoring, and clear stop conditions.'
authorSlug: repmail-team
publishedAt: '2026-10-26'
updatedAt: '2026-10-26'
tags:
- legitimate mass email sending
- email compliance
- email deliverability
- bulk email safety
- permission-based email
collections:
- compliance-operations
learningPaths:
- deliverability-mastery
keyTakeaways:
- Start with a documented, explainable recipient source rather than available address
  volume.
- Separate provider quota, operational caps, and audience eligibility; they answer
  different questions.
- Define the numerator, denominator, observation window, and stop owner before sending.
- Use suppression, unsubscribe, authentication, testing, and monitoring as one operating
  process.
- Treat RepMail defaults and tracking behavior as configuration-dependent product
  details.
commonMistakes:
- Treating a provider quota as evidence that a list is appropriate to mail.
- Using an unclear, purchased, scraped, or stale list without resolving its source
  and purpose.
- Reporting bounce or complaint percentages without stating the denominator and observation
  window.
- Assuming authentication replaces permission or that a spam analysis proves recipient
  expectation.
- Continuing a campaign after complaints, permanent bounces, suppression failures,
  or configuration drift.
faqs:
- question: What is the first check before sending a mass email?
  answer: 'Confirm that the audience is explainable: document how each segment was
    collected, what recipients were told, and why the planned message fits that expectation.
    If the source or purpose is unclear, stop and investigate.'
- question: Are provider sending limits the same as legitimate mass-email limits?
  answer: No. A provider quota or RepMail warm-up cap describes operational capacity.
    It does not decide whether recipients should receive the message, whether the
    content is appropriate, or whether suppression controls are working.
- question: What should cause a campaign to pause?
  answer: Pause for unexpected permanent-bounce or complaint signals, failed suppression
    checks, incorrect sender or domain configuration, unavailable event data, or any
    uncertainty about the audience. Define the threshold and denominator before sending.
- question: Does RepMail’s preview personalize every outbound email with AI?
  answer: No. RepMail previews up to three personalized examples. The campaign sends
    the saved template with per-recipient merge fields; the preview does not rewrite
    every outbound message at send time.
nextStep:
  label: Review the bulk-email safety workflow
  href: /repmail/learn/email-platform/how-to-send-bulk-email-safely
  description: Use the step-by-step workflow to review sender setup, audience controls,
    testing, and monitoring before a campaign.
assets:
- type: table
  title: Legitimate mass-email go/no-go checklist
  content:
    rows:
    - - Audience permission and purpose
      - Source, collection context, segment, owner
      - The audience and campaign purpose are explainable
      - The source is unclear, stale, scraped, purchased, or outside the stated expectation
    - - Sender identity
      - From address, reply path, verified domain, authentication state
      - Identity and domain configuration match the approved sender
      - Verification, alignment, or ownership is unresolved
    - - Volume and rate
      - Provider quota, operational cap, batch size, warm-up setting
      - The planned batch fits the active configuration
      - The quota, rate, or cap is unknown or exceeded
    - - Suppression
      - Unsubscribes, complaints, permanent bounces, exclusions
      - The current batch has been reconciled against suppression data
      - Suppression data is missing, stale, or failing to apply
    - - Content and links
      - Test result, rendered message, links, opt-out action, merge fields
      - The test passes on the chosen clients and the opt-out works
      - A link, merge field, sender detail, or unsubscribe action fails
    - - Monitoring and stop rule
      - Numerator, denominator, time window, threshold, operator
      - An owner can pause the campaign and interpret the signals
      - Signals cannot be measured or no one owns the pause decision
    headers:
    - Check
    - Evidence to record
    - Go when
    - Stop when
---

Legitimate mass email sending starts with a defensible recipient list, a clear sender identity, an unsubscribe path, and a stop rule based on recipient signals. Do not begin with the largest possible batch. Confirm that each recipient belongs in the campaign, configure the sending domain correctly, test the message, and release volume in controlled stages.

This guide is general information, not legal advice. Requirements vary by jurisdiction, audience, message type, and organization. Published October 26, 2026.

## 1. Define who may receive the message

Before importing or activating a list, record the basis for sending to each segment. In practical terms, this means knowing how the address was collected, what the recipient was told, and whether the planned message fits that expectation.

Separate recipients by source and purpose rather than combining every address into one audience. For example, customers, event registrants, newsletter subscribers, and professional contacts may require different review steps. Treat purchased, scraped, old, or unclear-source addresses as a stop condition until their eligibility has been independently resolved.

Keep a simple record with the segment name, collection source, collection date if available, stated purpose, and the person responsible for approval. A list that cannot be explained should not be treated as ready merely because the addresses are technically deliverable.

For a broader operating model, see [RepMail’s compliance operations guide](/repmail/learn/collections/compliance-operations).

## 2. Identify the sender and configure the domain

Use a recognizable From identity and a reply path that someone monitors. The message should make it reasonably clear who is communicating and why the recipient is receiving it.

RepMail by LetsZero sends through AWS SES SMTP from a verified custom sending domain or subdomain. Its current application path uses SES Easy DKIM with three CNAME records and a configurable default 14-day verification window. These are configuration-dependent product details, so confirm the current account and domain state before scheduling a campaign.

Domain authentication is not a substitute for permission. It helps establish sending identity, but it does not make an unclear list appropriate. Review SPF and DMARC guidance for the domain owner, and confirm that the From domain, DNS records, and sender configuration agree.

If more than one sending service is involved, document which domain or subdomain each service uses. The [multiple-sending-services authentication guide](/repmail/learn/deliverability/authentication-multiple-sending-services) can help structure that review.

## 3. Set the volume limit before sending

A legitimate campaign needs two different limits:

- **Planned volume:** the number of eligible recipients in the approved segment.
- **Operational cap:** the number of messages the sender is permitted to attempt during a period.

Do not confuse a provider quota with a safe audience size. A quota describes available sending capacity; it does not validate the list, content, or recipient expectation. Provider limits and account settings can change, so verify the applicable limit in the sending environment on the day of the campaign. For AWS SES-specific planning, compare the daily quota with the sending rate using [this quota and rate reference](/repmail/learn/infrastructure/aws-ses-daily-quota-vs-sending-rate).

RepMail’s default warm-up policy is a per-sender cap ladder: 50 messages per day on days 1–3, 100 per day on days 4–7, then 200 per day until the default 30-day warm-up window ends. The ladder and duration are configurable, and campaigns can be parked and resumed when capacity becomes available. Treat these as product defaults, not as a universal limit or a recommendation for every list.

## 4. Make stopping part of the design

Choose the stop conditions before the first send. At minimum, pause when you see an unexpected rise in permanent bounces, complaints, or other recipient signals; when the sender identity or domain configuration is not as approved; when suppression data is unavailable; or when the audience cannot be reconciled with the campaign purpose.

RepMail processes verified SES/SNS delivery, bounce, complaint, open, and click events with idempotency safeguards. Permanent bounces and complaints can add suppressions; transient bounces are not treated identically. Its default auto-pause policy is configured around an 8% bounce rate and a 0.05% complaint rate after at least 50 sends, using an above-threshold comparison. Exact enforcement is environment-configurable, so confirm the active settings rather than treating those figures as a legal or universal industry threshold.

A percentage without a denominator can mislead. Write down both the numerator and denominator. For example:

`bounce rate = permanent bounces ÷ attempted sends`

`complaint rate = complaints ÷ attempted sends`

Also record the observation window and whether retries are included. If the denominator is unknown, pause and investigate instead of interpreting the percentage.

## 5. Include an immediate opt-out and honor it

Every campaign should offer a clear unsubscribe route that is easy to find and use. RepMail campaign messages include one-click unsubscribe headers and a footer link. The application records campaign-specific unsubscribes and updates campaign counters.

Do not continue mailing a recipient after a valid suppression signal has been recorded. Reconcile suppression data before each batch, especially when contacts are synchronized between systems. A manual spreadsheet is not a reliable substitute for a controlled suppression process once multiple operators or sending services are involved.

## 6. Test content, links, and personalization

Send a test to internal addresses before releasing the campaign. Check the From name, reply address, subject, body rendering, links, unsubscribe action, footer, and personalization fallback. Confirm that a missing field produces an acceptable result rather than an awkward blank or misleading statement.

Use [RepMail’s spam-score check before sending](/repmail/learn/deliverability/check-spam-score-before-sending) as one review input, not as a permission or delivery decision. Also review the message manually on desktop and mobile. A clean analysis does not prove that a recipient expects the message.

RepMail can preview up to three personalized examples and sends the saved template with per-recipient merge fields. The preview does not rewrite every outbound message at send time. Preview and tracking results also depend on configuration and recipient mail-client behavior; an open is not an assured human-read signal.

## A practical go/no-go procedure

1. **Document the audience:** source, purpose, segment, and owner.
2. **Check identity:** verified domain, aligned sender details, reply path, and authentication records.
3. **Confirm limits:** active provider quota, rate, warm-up cap, and planned batch size.
4. **Reconcile suppressions:** unsubscribes, complaints, permanent bounces, and internal exclusions.
5. **Test:** render, links, personalization, unsubscribe, and tracking configuration.
6. **Approve the stop rule:** numerator, denominator, observation window, threshold, and operator.
7. **Send a controlled batch:** monitor events before expanding the next batch.
8. **Pause on ambiguity:** investigate unexpected signals or configuration drift before resuming.

For a fuller platform workflow, use [RepMail’s bulk-email safety guide](/repmail/learn/email-platform/how-to-send-bulk-email-safely).

## Sources

[1]: https://www.emailvendorselection.com/bulk-email-services/
[2]: https://mailtrap.io/blog/mass-email-service-providers/
