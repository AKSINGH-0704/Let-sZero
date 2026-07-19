---
contentType: guide
slug: instantly-not-sending-emails
title: "Instantly Not Sending Emails? Common Causes and Fixes"
description: "A campaign stuck at zero sends is almost always one of five things. Work through them in order, from expired mailbox tokens to a broken tracking CNAME."
authorSlug: repmail-team
publishedAt: "2026-07-19"
updatedAt: "2026-07-19"
tags: ["troubleshooting", "instantly", "cold-email-software", "deliverability", "authentication"]
featured: false
keyTakeaways:
  - "A sequencer is an orchestration layer, not a mail server. When the link to your mailbox breaks, the queue stalls while the dashboard still reads 'sending'."
  - "Expired Google OAuth tokens and invalidated Microsoft 365 app passwords are the single most common cause."
  - "A 421 rate-limit response means you sent too fast, not too much. Hourly velocity caps are separate from daily limits."
  - "A deleted tracking CNAME or a lapsed SSL certificate on your tracking domain will halt a campaign before it sends anything."
prerequisites:
  - label: "How SMTP actually works"
    href: "/repmail/learn/infrastructure/what-is-smtp"
  - label: "Your DNS records for email"
    href: "/repmail/learn/infrastructure/dns-records-for-email"
commonMistakes:
  - "Rewriting subject lines and copy when the queue has not sent a single message. Fix the transport first."
  - "Trusting the dashboard. Application state often reports 'active' while the background worker is stuck in a retry loop."
  - "Treating a shadowban as a content problem. Messages log as delivered while being quarantined on arrival."
  - "Uploading a CSV with blank merge fields and no fallback, which halts template rendering entirely."
faqs:
  - question: "Why does my campaign say it is sending when nothing goes out?"
    answer: "Because the interface and the sending worker are different systems. The campaign record is marked active in the application, while the background worker that authenticates to your mailbox is failing and retrying. Until the worker completes a handshake, the status you see reflects intent rather than delivery. Check the mailbox connection state, not the campaign state."
  - question: "What does a 535 error mean?"
    answer: "535 Authentication Failed means the mailbox rejected the credentials. On Microsoft 365 it usually means an app password was invalidated, which happens automatically when an administrator changes security defaults or conditional access rules. Generate a new app password and reconnect the mailbox."
  - question: "What does a 421 error mean?"
    answer: "421 is a temporary rate limit. Providers enforce hourly velocity caps independently of daily limits, so fifty messages inside a minute can trip a block even when you are far below your daily allowance. The fix is pacing, not volume: spread sends across the day and across more mailboxes."
  - question: "Could my tracking domain be stopping the campaign?"
    answer: "Yes, and it is a commonly missed cause. If the CNAME for your tracking subdomain is deleted or changed, or its SSL certificate lapses, the platform cannot build a valid link and will pause rather than send broken or insecure URLs. Verify the CNAME resolves and that HTTPS on the tracking host is valid."
nextStep:
  label: "Understand the infrastructure underneath"
  href: "/repmail/learn/infrastructure/email-infrastructure-explained"
  description: "Why mailbox-based sending has these failure modes, and what the alternative looks like."
assets:
  - type: checklist
    title: The 10-minute pre-flight debug, in order
    content: |
      - Is the mailbox still connected? Reconnect and watch for a fresh auth handshake.
      - Google Workspace: has the OAuth grant been revoked by an admin or policy change?
      - Microsoft 365: has the app password been invalidated by a security-defaults change?
      - Are you seeing 421 responses? Reduce per-hour velocity before touching anything else.
      - Have open rates collapsed while sends still log as delivered? Suspect a shadowban and pause.
      - Does your tracking CNAME still resolve to the tool's tracking host?
      - Is HTTPS on the tracking domain valid and unexpired?
      - Any API or workspace integration showing "disconnected" after an IT security audit?
      - Does your CSV import cleanly, with no hidden non-ASCII characters or malformed headers?
      - Does every merge tag in the template have a fallback value?
  - type: table
    title: Symptom to cause, at a glance
    content:
      headers: ["What you see", "Most likely cause", "First action"]
      rows:
        - ["Queue at zero, 535 in logs", "Expired token or invalidated app password", "Reconnect the mailbox, regenerate the app password"]
        - ["Sends trickle then stop, 421 in logs", "Hourly velocity cap tripped", "Slow the pace, spread across more mailboxes"]
        - ["Logged as delivered, opens near zero", "Shadowban or quarantine on arrival", "Pause, rest the mailbox, review recent volume"]
        - ["Campaign pauses immediately on launch", "Tracking CNAME missing or SSL expired", "Verify DNS and the HTTPS certificate"]
        - ["Dashboard shows 'Account disconnected'", "Admin permission change or security audit", "Re-grant access, confirm app clearance level"]
        - ["Campaign halts partway through the list", "Blank merge field with no fallback", "Add fallbacks, re-upload cleaned CSV"]
---

A campaign sitting at zero sends is rarely a content problem, and it is almost never fixed by rewriting subject lines. It is a transport problem, and there are five places it usually lives.

The reason the symptom is confusing is architectural. A sequencer is not a mail server. It is a command layer that authenticates into your Google Workspace or Microsoft 365 mailboxes and asks them to send. When you launch a sequence, contacts go into an asynchronous queue and a background worker picks up each row, renders the template, and opens a connection. If that connection is refused, the worker retries in a loop while the application still shows the campaign as active. The status you are looking at describes intent, not delivery.

Work through the following in order. The first two account for most stalls.

## 1. Expired tokens and invalidated app passwords

This is the most common cause by a wide margin, because it happens without you doing anything.

**Google Workspace** issues an OAuth grant when you connect a mailbox. Google revokes that grant automatically under a range of conditions: an administrator changes security policy, app access rules tighten, or the connection ages past what the workspace allows for an unverified third-party app. Once the token is revoked the platform can no longer authenticate, and the queue pauses until you reconnect and complete a fresh handshake.

**Microsoft 365** enforces MFA, so connected mailboxes typically use a 16-character app password. Those are invalidated instantly whenever an administrator updates security defaults, enables conditional access, or changes the account's password policy. The worker then receives a `535 Authentication Failed` from the Microsoft node and stops.

The fix in both cases is to reconnect the mailbox and confirm a new authentication actually succeeds, rather than assuming a green indicator in the interface means a live session.

## 2. Rate limits and shadowbans

Providers run real-time velocity monitoring that is entirely separate from your published daily limit. A 2,000-a-day allowance does not mean 2,000 as fast as software can push them.

If a sequencer attempts fifty messages inside a minute, the receiving node reads the pattern as an unmanaged script and answers with `421 Max hourly delivery limit exceeded`. Tools that implement progressive backoff will slow down and recover; tools that do not will halt the run to avoid getting the account locked.

The more dangerous version is the shadowban. After repeated velocity violations, the provider keeps accepting your connections and returning success responses while quietly quarantining everything you send. Your logs show delivery; your open rates fall to almost nothing. If you see that combination, stop sending from that mailbox rather than pushing harder, and let it rest. Continued violation turns a temporary block into a suspension.

Pacing is the fix, and pacing means both slower sending and more mailboxes. Distributing 500 daily touches across twenty properly warmed accounts is safe in a way that 500 from one account never is. If you are setting up new domains, [warm-up](/repmail/learn/deliverability/why-new-domains-need-warm-up) is the process that earns this headroom.

## 3. A broken tracking domain

A custom tracking domain rewrites the links and open pixels in every message so they match your sending domain. Because it modifies the HTML of every email, a small DNS error stops sending entirely.

Two failure modes dominate. The **CNAME** for your tracking subdomain gets deleted, retyped, or shadowed by a conflicting record, so the platform's lookup fails when it tries to build the next message. Or the **SSL certificate** on that host lapses. Receiving filters reject payloads containing insecure tracking assets, and because unencrypted redirect links look like phishing, well-behaved sequencers auto-pause rather than send them.

Check that the CNAME resolves to the tool's tracking host and that HTTPS on that hostname is valid and current. Both are quick to verify and easy to overlook, because nothing about the symptom points at DNS.

## 4. Integration and permission drift

Teams connect sequencers to enrichment tools, CRMs, and webhooks with API tokens. Those tokens have lifespans, and refresh can fail silently on a timeout, leaving the interface showing connected mailboxes while every backend call throws an auth exception.

Separately, routine IT work breaks these connections on purpose. A security audit, an access-control update, or a change to permission models can drop a third-party app below the clearance it needs to send, and the workspace cuts the integration. The tell is an "Account disconnected" entry appearing without anyone touching the campaign.

## 5. List and template errors

If the transport is healthy, the problem is usually the data.

A spreadsheet with hidden non-ASCII characters, corrupted byte markers, or malformed headers can import visually while failing at template compilation. The worker hits an unhandled parse exception on a row and pauses the campaign instead of crashing the workspace.

The other version is a merge tag without a fallback. A line like `I noticed your expansion into the {{city}} market` is fine until twenty rows have an empty city column. Rather than send visible template code to a prospect, the platform halts the run. Every dynamic field in your copy needs a fallback value, and it is worth auditing for that before every launch rather than after a stall.

## Why several of these failure modes are structural

Notice what causes 1, 2, and 4 have in common: they are all consequences of sending through mailboxes you rent from someone else. The OAuth grant belongs to Google. The velocity cap belongs to Microsoft. The permission model belongs to your IT department. A sequencer sitting on top of those inherits every one of their failure modes, and there is no configuration that removes them.

The alternative is to send through infrastructure you control directly. RepMail sends natively through [AWS SES](/repmail/learn/infrastructure/aws-ses-for-cold-email) rather than wrapping connected mailboxes, so there is no OAuth token to be revoked mid-campaign and no per-mailbox app password to be invalidated by a policy change. Bounce and complaint events arrive in real time through AWS SNS, which means failing addresses are suppressed as they fail rather than after a delayed log sync, and [authentication](/repmail/learn/deliverability/email-authentication) is configured at domain verification rather than left to per-mailbox setup.

That does not make deliverability automatic, and nothing does. Your list quality, your content, and your [sender reputation](/repmail/learn/deliverability/sender-reputation) still decide placement. But it removes an entire category of stall from the picture, which is worth knowing when you are debugging the same connection error for the third time this quarter.
