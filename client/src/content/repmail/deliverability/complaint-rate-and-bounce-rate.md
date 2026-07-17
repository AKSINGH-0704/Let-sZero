---
contentType: knowledge-base
slug: complaint-rate-and-bounce-rate
title: "Complaint Rate and Bounce Rate: The Numbers That Sink Domains"
description: "Two metrics decide whether receivers keep trusting you: how often recipients mark you spam, and how often your mail hits dead addresses."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["complaints", "bounces", "deliverability", "sender-reputation", "gmail"]
prerequisites:
  - label: "What sender reputation is"
    href: "/repmail/learn/deliverability/sender-reputation"
  - label: "Hard vs. soft bounces"
    href: "/repmail/learn/deliverability/hard-vs-soft-bounces"
commonMistakes:
  - "Letting the complaint rate creep toward 0.3%, the ceiling above which Gmail placement falls off a cliff."
  - "Continuing to send to an address after it hard-bounces, which compounds reputation damage with every retry."
  - "Watching only bounces while ignoring complaints, even though complaints hurt reputation faster."
faqs:
  - question: "What is an acceptable complaint rate?"
    answer: "Keep spam complaints below 0.3% of delivered mail at all times, and under 0.1% to be healthy, per Google's sender guidance. The complaint rate is the share of recipients who mark you as spam, and crossing 0.3% consistently causes a sharp drop in inbox placement."
  - question: "What bounce rate is too high?"
    answer: "Sustained bounce rates above roughly 2 to 3% signal a list-quality problem to receivers. Hard bounces, permanent failures to invalid addresses, matter most; they should be removed immediately rather than retried."
  - question: "Which is worse, a high bounce rate or a high complaint rate?"
    answer: "Complaints usually damage reputation faster, because a complaint is an active statement that a real person did not want your mail. High bounces are also serious, since they reveal a dirty list, but the fix for both is the same: better list hygiene and immediate suppression of failures."
nextStep:
  label: "Avoid the traps behind high bounces"
  href: "/repmail/learn/deliverability/what-are-spam-traps"
  description: "Dead and trap addresses drive both bounces and complaints. Here is how to keep them off your list."
assets:
  - type: table
    title: The thresholds that matter
    content:
      headers: ["Metric", "What it measures", "Healthy", "Danger"]
      rows:
        - ["Complaint rate", "Share of recipients marking you spam", "Under 0.1%", "0.3% and above"]
        - ["Hard bounce rate", "Permanent failures to invalid addresses", "Under 2%", "Above 3% sustained"]
        - ["Soft bounce rate", "Temporary failures (full mailbox, greylisting)", "Low and transient", "Persistent, which becomes hard"]
---

Two numbers do more to decide your sending future than almost anything else, and both come from how recipients and their servers react to your mail rather than from the mail itself. The complaint rate is how often people mark you as spam. The bounce rate is how often your messages hit addresses that cannot receive them. Receivers watch both closely, because together they reveal whether you send wanted mail to a clean list.

## The complaint rate and the 0.3% cliff

A complaint is the strongest negative signal a sender can generate, because it is an active statement from a real person: I did not want this. Google's sender guidance draws a hard line here. Keep your spam-complaint rate, visible in Google Postmaster Tools, below 0.3% at all times, and under 0.1% to be considered healthy. That threshold behaves like a cliff rather than a slope. A rate drifting toward 0.3% quietly erodes placement; a rate that crosses and stays above it collapses your inbox rate, no matter how clean your authentication and content are. Because the number is a percentage of delivered mail, even a modest count of complaints on a small send can breach it, which is why relevance and permission matter as much as volume.

## The bounce rate and list quality

A bounce is a message a receiving server refused. Hard bounces are permanent, the address is invalid or does not exist, and a hard bounce should end that address's life on your list immediately. Soft bounces are temporary, a full mailbox, a momentary block, but a soft bounce that persists becomes a hard one. Sustained hard-bounce rates above two to three percent tell receivers your list was never verified, and a dirty list is a direct path to spam placement and blacklisting. The damage compounds when senders keep retrying a bounced address, because every retry to a dead mailbox is another negative mark.

## They share one fix

Different as they look, both numbers come down to the same discipline: verify addresses before sending, remove failures the instant they happen, and mail people who actually want to hear from you. There is no content trick that offsets a dirty list or an unwilling audience.

## Where RepMail fits

RepMail keeps both metrics in safe territory through real-time telemetry. AWS SNS webhooks report every bounce and complaint the millisecond a remote server logs it, and RepMail's circuit breakers halt sending and suppress the offending address automatically, so a bad list cannot run up the bounce count or push complaints toward the 0.3% ceiling while you wait for a delayed report. Its analytics surface both rates continuously rather than in daily batches, so you see a problem forming instead of discovering it after the domain is already damaged.
