---
product: repmail
academy: deliverability
contentType: guide
slug: gmail-only-spam-vs-other-providers
title: 'Emails Go to Spam Only in Gmail: Isolate the Difference'
description: If Gmail sends messages to spam while Outlook accepts them, hold the
  message steady and compare provider headers, reputation, and policy signals.
authorSlug: repmail-team
publishedAt: '2026-10-25'
updatedAt: '2026-10-25'
tags:
- email deliverability
- Gmail
- spam troubleshooting
- Outlook
collections:
- deliverability-diagnostics
learningPaths:
- provider-deliverability-diagnostics
keyTakeaways:
- A provider split is a symptom to reproduce and investigate, not proof of a single
  cause.
- Hold sender and message steady while comparing Gmail and another provider; change
  one factor at a time.
- Save the received headers, authentication results, actual folder, and delivery events
  for each test.
- Passing authentication checks is useful evidence, but does not by itself establish
  inbox placement.
commonMistakes:
- Changing the subject, links, sender, and sending pattern together, then attributing
  the result to one change.
- Treating a sending dashboard’s delivered event as proof of inbox placement.
- Assuming a clean blacklist check or passing authentication proves why Gmail classified
  a message as spam.
- Generalizing from one Gmail recipient or one anecdotal report.
faqs:
- question: If SPF, DKIM, and DMARC pass, why might Gmail still put a message in Spam?
  answer: Those results address authentication signals, but they do not by themselves
    explain placement. Check alignment and the message headers, then review the message,
    complaint and reputation context available to you and repeat a controlled test.
- question: Does Outlook inbox placement prove my message is fine?
  answer: No. It shows the message reached the observed folder for that Outlook test.
    Compare the Gmail copy and headers separately; provider outcomes can differ.
- question: What should I save before contacting support?
  answer: Keep timestamps, recipient provider and folder, the exact message and sender
    identity, full received headers, authentication results, and any delivery, bounce,
    or rejection details.
nextStep:
  label: Compare provider-specific signals
  href: /repmail/learn/deliverability/provider-specific-deliverability-triage
  description: Use the provider-by-provider triage guide to organize evidence across
    Gmail, Outlook, and other mailbox providers.
assets:
- type: checklist
  title: Gmail-only spam comparison checklist
  content:
  - 'Before Testing: Choose Gmail and another-provider recipients whose mailboxes
    you can inspect.'
  - 'Before Testing: Record sender address, sending domain, message version, and send
    time.'
  - 'Before Testing: Keep subject, body, links, attachments, sending route, and recipient
    conditions as consistent as practical.'
  - 'For Each Message: Record the actual folder observed and timestamp; distinguish
    Spam, Promotions, missing, delayed, and rejected.'
  - 'For Each Message: Save the complete received headers and authentication results.'
  - 'For Each Message: Record any delivery, bounce, deferral, or rejection event separately
    from mailbox placement.'
  - 'When Comparing: Check authentication results and alignment in the received message.'
  - 'When Comparing: Review available reputation and complaint context and note recent
    sender, content, volume, or recipient changes.'
  - 'When Comparing: Change one factor per retest and record the outcome.'
  - 'When Comparing: Treat a single test or recipient report as an observation, not
    proof of a cause.'
---

When a message reaches Outlook but lands in Gmail spam, treat it as a provider-specific placement problem,not proof that one provider or your whole sending setup is broken. Repeat a controlled comparison with the same message and sender, then inspect the Gmail copy’s headers and the evidence available for each recipient. Change one factor at a time so the result can point to a cause rather than merely coincide with a change.

## First, confirm what “Gmail-only” means

Separate spam placement from other outcomes. Check that the Gmail recipient’s message is actually in Spam, not Promotions, missing from the inbox, delayed, or rejected. If you have only an email-service-provider event saying “delivered,” treat that as evidence the message was accepted for delivery by the provider,not proof of the final mailbox folder.

Check more than one Gmail recipient if you can. A single recipient’s filters or settings may affect what you observe. Record the account type and folder for each test, and avoid treating a single user’s report as evidence of a general Gmail rule. A Reddit poster described a Gmail-only spam symptom while reporting that SPF, DKIM, and DMARC passed; that account is a useful reminder that passing authentication checks does not, by itself, settle placement. It does not establish why that sender’s messages went to spam or how common the problem is. [1]

## Run a controlled provider comparison

Hold the sender, message, and test conditions steady. Send the same message to a Gmail recipient and a recipient at another provider, such as Outlook, as close together as practical. Use accounts you can inspect, and record the actual folder,not just a sending dashboard’s status.

For a useful comparison, keep these details unchanged between sends:

- From address and sending domain
- Subject and body, including links and attachments
- Sending system and sending route
- Recipient list characteristics, where practical
- Timing and any personalization fields

If the two messages differ, note the difference rather than calling the test controlled. For example, separate sends may have different timestamps or recipient-specific content. Repeat the comparison before drawing a conclusion. Then change one variable,such as a link or subject,and repeat again. If the result changes, you have a lead to investigate, not proof that the altered item caused the original placement.

## Compare the evidence, not just the folders

Save the complete message headers from the Gmail copy and, if available, the Outlook copy. Compare the authentication results and the domains involved in the visible From address and authentication results. Google’s sender guidance describes authentication and alignment requirements, among other sender considerations. A passing result is worth recording, but do not treat it as a placement guarantee. [2]

Use this sequence:

1. **Authentication:** Record SPF, DKIM, and DMARC results as shown in the received message. Note failures, missing results, and whether the authenticated domains align with the From domain. Follow the relevant provider guidance to investigate any mismatch.
2. **Message and identity:** Confirm that the displayed From address, sending domain, links, and message content are the same across the test. Check for recent changes to the sending domain, infrastructure, or campaign template.
3. **Reputation and recipient feedback:** Review the reputation and complaint information available to you for the sending domain and IP, along with recent recipient-list or sending-pattern changes. Don’t infer reputation solely from a clean blacklist lookup; that does not establish how a mailbox provider will classify a particular message.
4. **Placement evidence:** Save timestamps, recipient provider, folder, full headers, and any bounce or deferral details. A rejection, delay, spam placement, and inbox placement are different outcomes; classify what happened before troubleshooting.

Google’s published guidance includes sender requirements and recommendations such as authentication, alignment, and complaint-related considerations. Use it as the provider-specific reference when reviewing Gmail outcomes, not as a substitute for examining your own headers and test results. [2]

| Observation | What it tells you | Next check |
|---|---|---|
| Gmail copy is in Spam; Outlook copy is in Inbox | Placement differs in this test | Repeat with the same content and sender; save both headers |
| Gmail authentication result fails or is missing | There is an authentication signal to investigate | Check DNS and the sending system’s authentication setup |
| Authentication passes, but Gmail still places the message in Spam | Authentication alone did not explain the observed placement | Review alignment, message consistency, complaint/reputation context, and repeat the test |
| Gmail message is not found; no rejection is visible | The outcome is not yet established | Check recipient folders, search, timestamps, and available delivery events before diagnosing spam placement |

## Follow a decision procedure

**If Gmail reports an authentication failure:** Verify the relevant DNS records and sending configuration, then repeat the same test. Don’t change message content at the same time; otherwise you won’t know which change mattered.

**If authentication passes and Gmail still places the message in Spam:** Keep the test evidence, inspect alignment and reputation or complaint information available to you, and review recent changes to content, links, volume, and recipients. Retest after one targeted change. A pass on SPF, DKIM, and DMARC is a useful observation, not a complete diagnosis.

**If results vary across Gmail recipients:** Treat recipient-level differences as a lead. Compare account settings, folders, and exact message copies before generalizing to Gmail recipients as a whole.

**If you confirm Outlook is also placing messages in Junk:** The issue is no longer Gmail-only. Use the [Outlook spam placement guide](/repmail/learn/deliverability/outlook-com-spam-placement) to investigate that provider separately. For a broader provider-by-provider workflow, see [provider-specific deliverability triage](/repmail/learn/deliverability/provider-specific-deliverability-triage).

For a worked example, suppose the same campaign copy reaches Outlook’s inbox while Gmail puts it in Spam. The Gmail header shows SPF and DKIM passing, and the sender reports DMARC passing in a separate check. Record those results, verify alignment in the received message, then inspect complaint and reputation context and repeat with unchanged content. If a second test still shows the split, report it as a reproducible provider difference,not as proof that a particular link, sender, or Gmail rule caused it. If Gmail accepts a message but you cannot find it in the expected folder, use the [Gmail accepted, Outlook missing handoff guide](/repmail/learn/deliverability/accepted-gmail-missing-outlook-handoff) to distinguish that different symptom.

## Keep a compact investigation record

Save the date and time, sender identity, recipient provider, subject, message version, folder observed, full headers, authentication results, and any delivery or rejection event. Note each change made and the result of the next test. This record helps you avoid repeating checks and makes provider support or an internal handoff more useful.

Avoid sending repeated variations to large or unrelated lists as a way to “test” placement. Use a small set of controlled recipients you can inspect, and follow your organization’s sending and recipient-permission practices. This guide is general information, not legal advice.

For an additional Gmail-focused diagnostic, compare [Gmail compliance and spam-rate considerations](/repmail/learn/deliverability/gmail-compliance-vs-spam-rate). If the symptom instead involves messages appearing under Promotions rather than Spam, see [why emails land in Promotions](/repmail/learn/deliverability/why-emails-land-in-promotions).

## Sources

[1]: https://www.reddit.com/r/email/comments/1numhc8/my_emails_are_going_to_spam_folder_even_though/
[2]: https://support.google.com/mail/answer/81126?hl=en
