---
contentType: guide
slug: how-to-warm-up-a-domain-in-14-days
title: How to Warm Up a Cold Email Domain in 14 Days
description: "A day-by-day warm-up schedule with real volume numbers, what to watch at each step, and the signals that tell you to slow down rather than continue."
authorSlug: repmail-team
publishedAt: "2026-08-10"
tags: ["warm-up", "deliverability", "sender-reputation", "domains", "sending-limits"]
heroDiagram: warmup-ramp
keyTakeaways:
  - "Fourteen days is a realistic floor for a new domain, not a guarantee. The schedule is a starting point you adjust from the numbers."
  - "Volume matters less than consistency and replies. Twenty messages a day that get answered beat two hundred that get ignored."
  - "Warm-up is not a phase you complete. It is the point at which your daily volume stops being the limiting factor."
  - "If bounces exceed 3% or complaints approach 0.1% at any step, hold volume where it is. Do not continue the ramp on schedule."
prerequisites:
  - label: "Why new domains need warm-up at all"
    href: "/repmail/learn/deliverability/why-new-domains-need-warm-up"
  - label: "Set up authentication first"
    href: "/repmail/learn/deliverability/email-authentication"
  - label: "Decide which domain you are warming"
    href: "/repmail/learn/infrastructure/separate-sending-domain-for-cold-email"
commonMistakes:
  - "Following the schedule mechanically while bounce or complaint rates climb. The numbers override the calendar every time."
  - "Warming a domain with mail nobody answers. Engagement is the signal being built; volume without replies builds very little."
  - "Sending the first real campaign on day 15 at ten times the day-14 volume, which discards everything the ramp established."
  - "Warming the domain but not the individual sending addresses, then adding three new mailboxes at full volume in week three."
  - "Starting the ramp before SPF, DKIM and DMARC resolve, so early sends are evaluated as unauthenticated."
faqs:
  - question: "Is 14 days actually enough?"
    answer: "It is enough to establish a baseline that supports moderate daily volume, which is what most outbound teams need to start. It is not enough to reach high volume safely. Think of two weeks as the point where you can begin sending real campaigns carefully, with the ramp continuing underneath them for several more weeks."
  - question: "What volume should I be at on day 14?"
    answer: "Somewhere around 40 to 50 messages a day is a realistic and defensible target for a new domain with clean authentication and decent engagement. Schedules promising 500 a day after two weeks are describing a risk, not a plan."
  - question: "Do I need a warm-up tool that sends fake emails between inboxes?"
    answer: "Those services generate artificial engagement by exchanging mail between accounts they control and marking it as important. Providers have become good at recognising the pattern, and the practice is a poor substitute for the thing it imitates. A slower ramp on real mail to real prospects builds a reputation that reflects reality, which is the only kind that survives scrutiny."
  - question: "How do I know the warm-up is working?"
    answer: "Watch three numbers rather than one: bounce rate should stay under 3%, complaints should stay near zero, and replies should be arriving. If bounces are low and replies are non-existent, the domain is technically fine and the targeting is not — and continuing to ramp will convert a targeting problem into a reputation problem."
  - question: "What if I have to pause sending for a week?"
    answer: "Resume a step or two below where you stopped rather than at the same volume. Reputation decays with silence, and a sudden return to previous volume after a gap reads as a spike. A few days of re-ramping costs far less than re-establishing a damaged domain."
nextStep:
  label: "Next: check everything before the first real campaign"
  href: "/repmail/learn/deliverability/pre-send-deliverability-checklist"
  description: "The ramp gets the domain ready. This is the check to run before the first campaign that matters."
assets:
  - type: table
    title: A 14-day ramp, with what to watch at each step
    content:
      headers: ["Days", "Messages per day", "Focus", "Stop and hold if"]
      rows:
        - ["1–2", "5–10", "Authentication verified; send to contacts likely to reply", "Anything bounces at all — the list is wrong"]
        - ["3–4", "10–15", "Keep replies coming; vary the copy genuinely", "Bounce rate above 3%"]
        - ["5–7", "15–25", "First small real campaign to your best-fit prospects", "Any spam complaint at this volume"]
        - ["8–10", "25–35", "Increase steadily; watch reply rate, not just delivery", "Reply rate collapsing as volume rises"]
        - ["11–14", "35–50", "Stabilise. Do not spike on the final day", "Complaints approaching 0.1%"]
        - ["15+", "Increase ~20% weekly", "Continue ramping under real campaigns", "Any sustained rise in bounces or complaints"]
  - type: checklist
    title: Before day 1
    content:
      - "SPF, DKIM and DMARC published for the sending domain, and verified by sending a test message and reading the Authentication-Results header."
      - "The domain has been registered for a few weeks rather than a few hours."
      - "A real website exists at the domain, even if it is one page."
      - "Your first 50 contacts are people genuinely likely to reply, not the top of an unsorted list."
      - "The list has been verified, so day 1 does not produce bounces."
      - "Reply-to is a monitored mailbox and someone is watching it."
---

Most warm-up schedules you will find are a table of numbers with no explanation of what the numbers are for. They tell you to send 10 on Monday and 20 on Tuesday, and they are silent on the only question that matters when something goes wrong: how do I know whether to continue?

This is a schedule, but the schedule is the least important part of it. What determines whether a new domain ends up with a healthy reputation is not which numbers you followed — it is whether you were willing to stop following them when the evidence said to.

## What warm-up is actually building

A new domain has no history. To a receiving filter, that absence is not neutral; it is a risk. Warm-up is the process of replacing "we know nothing about this sender" with "we have seen this sender behave well", and the evidence that does that work is **engagement**, not volume.

This matters because it changes what a good warm-up looks like. Twenty messages a day to people who reply builds reputation faster than two hundred a day to people who ignore you. If you take one thing from the schedule below, take this: the ramp is a way of buying time for engagement signals to accumulate, and volume that produces no engagement is not buying anything.

It also explains why the artificial warm-up services are a poor deal. They generate traffic between accounts they control, opening and replying to their own mail to simulate a healthy sender. Providers have had years to learn what that pattern looks like, and the reputation it produces is a claim about behaviour that never happened. A slower ramp on real mail to real prospects builds something that holds up.

## The schedule

The table in this article gives the day-by-day volumes. Rather than repeat them here, it is worth explaining the shape.

**Days 1–2 are a test, not a campaign.** Five to ten messages, sent to the contacts most likely to write back — existing acquaintances, warm introductions, people who have interacted with your company before. You are not prospecting yet. You are confirming that authentication resolves, that nothing bounces, and that replies happen.

**Days 3–7 introduce real prospects,** still at low volume and still chosen for likelihood of reply rather than list order. This is the point where most people go wrong, because it feels slow and the temptation to jump ahead is strongest when nothing has visibly broken.

**Days 8–14 increase steadily** toward roughly 40–50 a day. Note the final row of the schedule: do not spike on day 14. Ending the two weeks with an unusually large send undoes the pattern you spent two weeks establishing, and it is a common way to finish a careful ramp with a reputation hit.

**Day 15 onward is not "done".** A domain at 50 a day is a domain that can begin real campaigns, not one that can send five hundred. Continue increasing by roughly 20% a week under live campaigns, watching the same numbers.

## The numbers that override the schedule

Three metrics decide whether you continue, hold, or stop.

**Bounce rate** should stay below 3%, and in the first few days should be zero. Bounces at day 1 do not mean your domain is bad; they mean your list is. Fix the list before continuing, because every bounce during warm-up is a disproportionately expensive signal against a domain with no history to absorb it.

**Complaint rate** should be effectively zero at these volumes, and must stay under 0.1% as you scale. One complaint in your first week at 10 messages a day is a 1% complaint rate, which is catastrophic in context. Treat any complaint during warm-up as a reason to stop and re-examine the targeting.

**Reply rate** is the one people forget to watch, and it is the most informative. If bounces are low and complaints are zero but nobody is replying, the domain is technically healthy and the campaign is not working. Continuing to ramp in that state does not build reputation — it accumulates a history of unengaging mail, which is worse than no history. Fix the message or the targeting before adding volume.

## Warming addresses, not just domains

A subtlety that catches teams in week three: reputation attaches to sending addresses as well as the domain. A carefully warmed domain does not confer instant credibility on a mailbox created yesterday.

If you plan to send from several addresses, introduce them gradually too — one at a time, each starting low, rather than adding three at full volume once the domain "is warm". The domain's history helps, but a new address sending at the domain's current ceiling on its first day is its own spike.

The same logic applies to teams. Adding four colleagues to a workspace that shares one sending domain does not multiply what that domain can safely send; it divides it. The domain's reputation is the shared resource, and everybody's volume draws on the same pool.

RepMail applies a progressive daily limit to new senders automatically — 50 a day to begin with, rising to 100 and then 200 as the sending history builds — so the ramp is enforced by the platform rather than left as something you have to remember. A campaign that exceeds the day's remaining allowance is scheduled to continue when the window reopens rather than failing, and the dashboard shows which step you are currently on, so "why is my limit this number" is answerable at a glance. The numbers above still apply to the judgement calls the platform cannot make for you: who you send to, and whether they reply.
