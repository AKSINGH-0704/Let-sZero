---
contentType: knowledge-base
slug: best-day-and-time-to-send-cold-email
title: The Best Day and Time to Send B2B Cold Email
description: "Tuesday to Thursday morning is the usual answer and it is roughly right, but the effect is small. Here is how to find the timing that works for your list."
authorSlug: repmail-team
publishedAt: "2026-08-10"
tags: ["cold-email", "send-time", "testing", "reply-rate", "outreach"]
keyTakeaways:
  - "Tuesday to Thursday, early morning in the recipient's timezone, is a sound default. Treat it as a starting point, not a finding."
  - "Send time is one of the smallest levers in cold email. Targeting and relevance move reply rates by multiples; timing moves them by a few percent."
  - "Recipient timezone matters far more than the exact hour. Sending at 9am your time to a list spread across three timezones tests nothing."
  - "You cannot test send time on open rate any more. Test it on replies, and expect to need more volume than you think."
prerequisites:
  - label: "Why open rates can no longer settle this"
    href: "/repmail/learn/cold-email/open-rate-tracking-apple-mpp"
commonMistakes:
  - "Optimising send time before the message or the list is right. It is the last few percent, applied to a number that is not yet worth multiplying."
  - "Sending on your own clock to a list spanning several timezones, which turns a timing test into noise."
  - "Declaring a winner from a few hundred sends, where the difference is well inside normal variation."
  - "Sending everything at exactly 9:00:00, which is both a spike in volume and a pattern no human sender produces."
faqs:
  - question: "So what is the best time?"
    answer: "For B2B, early morning in the recipient's local timezone — roughly 7am to 10am — on Tuesday, Wednesday or Thursday. That is the consensus across published studies and it is a reasonable default. The honest caveat is that the measured differences are small, and much of the published data rests on open rates, which are no longer reliable."
  - question: "Why not Monday or Friday?"
    answer: "Monday mornings carry the weekend backlog, so a cold message competes with everything that arrived while the recipient was away. Friday afternoons compete with the desire to finish the week. Neither is a hard rule, and both are weaker effects than the confidence with which they are usually stated."
  - question: "How much does send time actually matter?"
    answer: "Less than almost anything else you could work on. Moving from a poorly-targeted list to a well-targeted one can change reply rates several-fold. Moving from Friday afternoon to Tuesday morning might change them by a few percent. Both are worth doing; only one is worth doing first."
  - question: "How do I test it properly?"
    answer: "Split a single campaign into groups that differ only by send time, keep everything else identical, use recipient-local scheduling, and measure replies rather than opens. You need enough volume that a few extra replies cannot swing the result — for most teams that means running the test across several campaigns before believing it."
  - question: "Does timing matter for follow-ups too?"
    answer: "Less than for the first message, because a follow-up arrives in a thread the recipient has already seen. Spacing matters more than time of day: a few working days between touches, and never two messages on the same day."
nextStep:
  label: "Next: the follow-up cadence that does move the number"
  href: "/repmail/learn/cold-email/how-many-follow-ups"
  description: "How many follow-ups, how far apart, and why the last one often performs best."
assets:
  - type: table
    title: Defaults worth starting from, and what each is worth
    content:
      headers: ["Decision", "Sensible default", "How much it matters"]
      rows:
        - ["Day of week", "Tuesday, Wednesday or Thursday", "Small but real"]
        - ["Time of day", "7am–10am recipient local time", "Small but real"]
        - ["Timezone basis", "Always the recipient's, never yours", "Large — this is the one that ruins tests"]
        - ["Send pacing", "Spread over the hour, not all at once", "Moderate — a spike is a deliverability signal"]
        - ["Follow-up spacing", "3–4 working days between touches", "Larger than time of day"]
        - ["Volume per day", "Whatever your warm-up supports", "Far larger than any timing choice"]
---

This is one of the most searched questions in outbound, and it deserves an honest answer rather than a confident one.

The short version: **Tuesday to Thursday, early morning in the recipient's timezone**, is a sound default. It is roughly what the published studies converge on and there is no reason to fight it.

The longer version is that send time is one of the smallest levers available to you, that most of the confident numbers circulating about it rest on a metric that no longer works, and that the effort spent optimising it is almost always better spent elsewhere.

## Why the usual advice is roughly right

The reasoning behind the standard answer is sound even where the data is thin.

Early morning works because business email is triaged in the morning. A message that arrives at 7am sits near the top of the pile when the recipient starts sorting; a message that arrives at 2pm lands in the middle of a working day and competes with everything already in progress.

Mid-week works for a related reason. Monday morning is when the weekend's accumulation gets processed, and a cold email competes with a full queue of things the recipient already cares about. Friday afternoon competes with the end of the week. Tuesday to Thursday is simply the part of the week with the least competition from the recipient's own backlog.

Both effects are real. Both are also small, and much smaller than the certainty with which they are usually asserted.

## Why most of the published data is now unusable

Nearly every "best time to send" study measures **open rate**, and open rate stopped being a reliable measure when mail clients began pre-loading tracking pixels on the recipient's behalf.

This matters specifically for timing research, because the distortion attaches to *when* as well as *whether*. A proxy that fetches remote content in advance records an open at the time of its own fetch, not when a human looked. Timing studies built on that data are measuring, in part, when mail infrastructure fetched images — which is not a fact about human behaviour at all.

So treat published send-time findings as weak evidence. The direction is probably right. The precision — "9:14am on Tuesday outperforms 9:00am by 4%" — is not measuring what it claims to.

## The variable that actually ruins timing

If you take one practical thing from this article, take this: **send in the recipient's timezone, not yours.**

A list spread across three timezones, sent at 9am your time, arrives at 9am, 4:30am and 11pm respectively. Any timing effect is scrambled by the spread, and any test you run on that list is measuring the distribution of your list rather than the effect of the hour.

This single variable swamps the difference between any two sensible send times. Fixing it is worth more than optimising the hour, and it is a scheduling decision rather than an experiment.

A related detail: do not send everything at the same instant. A thousand messages at exactly 9:00:00 is both a volume spike — which is a deliverability signal in its own right — and a pattern no human sender produces. Spreading the send across the hour looks more natural and is gentler on your domain.

## How to test it, if you are going to

Testing send time properly is harder than it looks, mostly because the effect you are looking for is small.

Split a single campaign into groups differing **only** by send time. Same list quality, same copy, same sender, same day where possible. Schedule in recipient-local time so the variable is the hour rather than the geography. Measure **replies**, not opens, since opens can no longer settle this.

Then be honest about volume. If you send 200 messages per group and one group gets 9 replies against 7, that is not a finding — it is two replies, well inside normal variation. Detecting a few percent difference in reply rate reliably takes more volume than most teams have in a single campaign, which is why send time is better evaluated across many campaigns over time than in one test.

## Where the effort is better spent

It is worth being blunt about the ordering, because "best time to send" is a question people ask early, and it is a late-stage optimisation.

The things that move cold email reply rates by multiples are: who is on the list, whether the message says something specific to that person, and whether the mail reaches the inbox at all. The things that move it by a few percent are subject-line phrasing, send time, and follow-up spacing.

If your reply rate is near zero, timing is not the problem, and finding the perfect Tuesday will not fix it. Optimising send time on a campaign that does not work yet is multiplying a number that is close to zero.

Get the targeting right, get the domain healthy, get the message specific. Then, when the campaign works and you want the last few percent, schedule for Tuesday morning in the recipient's timezone and stop thinking about it.

RepMail lets you schedule a campaign for a future date and time and paces sending rather than releasing everything at once, so a scheduled send does not arrive as a volume spike. Where a campaign exceeds the day's warm-up allowance, the remainder is scheduled to continue automatically when the sending window reopens — which means the ramp and your chosen send time coexist instead of one overriding the other.
