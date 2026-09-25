---
product: repmail
academy: glossary
contentType: glossary-term
slug: email-greylisting
title: "Greylisting: Temporary SMTP Deferral by the Receiver"
description: "Greylisting: Temporary SMTP Deferral by the Receiver — Senders see repeated 4xx responses and do not know whether retries work."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["glossary","deliverability","smtp","email","greylisting","temporary","deferral"]
assets:
  - type: table
    title: "Quick decision table: interpreting repeated 4xx responses"
    content:
      headers: ["Observed sign","Likely cause","Immediate check","Next action"]
      rows:
        - ["First-ever triplet; single 4xx with \"try again later\"","Greylisting probable","Confirm retry schedule; wait standard interval (hours)","Retry with exponential backoff; monitor for success"]
        - ["Persistent 4xx across many hours with identical message","Rate limit or provider-side transient issue","Check send rate and provider status pages","Reduce rate, contact provider if persists"]
        - ["4xx plus authentication failures (SPF/DKIM errors)","Authentication/policy rejection presenting as transient","Inspect authentication headers and DNS records","Fix auth issues and retry"]
        - ["Immediate many parallel retries causing repeated 4xx","Retry storm or triggering of defensive throttles","Review retry concurrency and backoff settings","Throttle retries; restart with proper backoff"]
        - ["4xx then 2xx on later retry","Greylisting or temporary transient resolved","Log the timing and triplet that succeeded","No action required; use evidence if contacting provider"]
featured: false
collections: ["core-email-glossary"]
learningPaths: []
keyTakeaways:
  - "Senders see repeated 4xx responses and do not know whether retries work."
  - "A focused task with a separate troubleshooting, implementation, decision, or reference job from the current corpus."
  - "Link from retry and deferral pages."
commonMistakes:
  - "Skipping this check: Capture the full SMTP transcript including 4xx reply strings and timestamps."
  - "Skipping this check: Confirm your MTA implements exponential backoff and persists retries across hours."
  - "Skipping this check: Record the sender triplet: sending IP, envelope-from, and recipient address for each failed attempt."
faqs:
  - question: "How long does greylisting typically defer delivery?"
    answer: "There is no universal interval; many receivers keep deferral windows measured in minutes to hours, but specific durations and allow-window policies vary by provider. Treat any single value as directional and confirm with the receiving provider if you need a firm expectation [1]."
  - question: "If my system retries correctly, will greylisted mail always get through?"
    answer: "Not always. Correct retry behavior is necessary but not sufficient: receivers may combine greylisting with reputation checks, rate limits, or authentication requirements. If retries continue failing after an expected deferral window, investigate authentication, rate limits, and contact the receiver with logs."
  - question: "Can I disable greylisting on the receiver side?"
    answer: "Greylisting is a receiver-side policy; you cannot disable it from the sender. Instead, use sender-side best practices (stable IPs, authentication, appropriate retry strategy) and engage the receiver if you require an allowlist or policy exception. Providers’ allowlisting is discretionary and varies by provider."
nextStep:
  label: "Continue with ARC (Authenticated Received Chain)"
  href: "/repmail/learn/glossary/arc"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Greylisting is a receiver-side policy that returns a temporary 4xx SMTP deferral for a first-seen (or otherwise untrusted) sender-triplet to force legitimate MTAs to retry later. If you see repeated 4xx responses, greylisting is one possible cause; correct behavior is for a well-behaved sender to retry and succeed later, but implementation details and receiver heuristics vary and can cause unexpected retry behavior.

## What greylisting does and when you’ll see it

Greylisting instructs the receiving server to refuse delivery temporarily, typically with a 4xx SMTP reply. The intent is to block or slow abusive senders that don’t implement standard retry logic while allowing legitimate MTAs to attempt delivery again later.
Not all 4xx responses are greylisting; the receiver may return 4xx codes for rate-limiting, transient internal errors, or policy checks. Use connection logs and the exact SMTP reply text to differentiate greylisting from other transient failures. RFC guidance and common carrier descriptions emphasize temporary deferral as the mechanism, but specifics (timeout, triplet definition) are provider-dependent [1].

## How greylisting decision boundaries work

Receivers typically base the decision on a sender triplet: sending IP, envelope sender, and recipient. If that triplet is unseen or blacklisted by an internal reputation signal, the server will issue a temporary deferral and record the triplet for a follow-up allow period [1].
Decision boundaries include: whether the sending IP is on a shared pool, whether SPF/DKIM/authentication succeeded, and whether the triplet appears in the receiver’s allowlist or reputation cache. These boundaries are not standardized; expect variation in how long the deferral lasts and when the triplet is accepted.

## Operational sequence for senders who encounter 4xx responses

First, capture the full SMTP transcript and server 4xx string. The exact reply text often indicates greylisting (e.g., explicit "try later" messages) versus a generic transient error. Next, verify that your MTA or outbound system is configured to retry according to SMTP norms (exponential backoff, sustained retries over hours) rather than immediate repeated attempts that can trigger retry storms.
Then, correlate timestamped retries with any change in response code. If a retry after the typical greylisting interval succeeds, the cause was likely greylisting. If retries keep failing across hours, investigate other transient causes (rate limits, blocklists, or misconfiguration) and raise a support ticket with the receiver including your captured transcript and retry schedule.

## Practical limits and evidence when diagnosing

You can generally rely on the SMTP reply and your retry behavior as primary evidence. Receiver logs are authoritative but typically unavailable; use your MTA logs, envelope data, and timestamps to build a reproducible case to share with the receiving provider.
Be explicit about uncertainty: greylisting behavior (duration, triplet rules, allowlist thresholds) differs by provider and may change. Use provider documentation or support channels to confirm specifics rather than assuming a particular timeout or rule set [1].

## Mitigations and sender-side best practices

Ensure your sending system implements standard SMTP retry strategies: exponential backoff, a minimum retry window that spans common greylist intervals (hours), and persistence across transient failure types. Avoid overly aggressive immediate retries that can create retry storms and provoke longer-term suppression or blocking by receivers.
Where possible, improve envelope authentication (SPF, DKIM, DMARC) and use stable sending IPs or warmed pools. Maintain clear observability: log envelope sender, sending IP, full SMTP replies, and retry timings so you can present concise evidence if you must contact the receiving operator.

## When to contact the receiving provider

Contact the receiver when: (a) your retries persistently receive 4xx responses beyond expected greylist windows, (b) you can demonstrate correct retry behavior with logs, and (c) you suspect a misclassification (e.g., new IP, legitimate mail). Include the complete SMTP transcript, timestamps of retries, the triplet (IP, envelope-from, recipient), and your retry schedule.
If the provider confirms greylisting, ask for their typical deferral interval and whether they can add an allowlist entry or advise on best practices for your sending pattern. Expect providers to treat allowlisting and policy changes as discretionary and variable over time.

## Practical checklist

- [ ] Capture the full SMTP transcript including 4xx reply strings and timestamps.
- [ ] Confirm your MTA implements exponential backoff and persists retries across hours.
- [ ] Record the sender triplet: sending IP, envelope-from, and recipient address for each failed attempt.
- [ ] Verify SPF/DKIM/DMARC authentication succeeded for the attempted messages.
- [ ] Correlate retries with any changes in 4xx text or codes to identify acceptance windows.
- [ ] Limit immediate parallel retries to avoid creating a retry storm against the receiver.
- [ ] Check provider documentation or support channels for known greylisting policies [1].
- [ ] If unresolved after reasonable retries, open a support ticket with the receiver including logs and retry timeline.
- [ ] Consider warming new IPs with low-volume, authenticated sends before scaling.

## Where RepMail fits

Use this guide as a practical checklist and diagnostic aid in outbound workflows: capture the SMTP transcript and triplet, verify backoff and authentication, and follow the decision table to distinguish greylisting from other transient failures. When escalation is needed, provide concise evidence (transcript, timestamps, retry schedule) to the receiving provider to speed resolution.

Continue with [ARC (Authenticated Received Chain)](/repmail/learn/glossary/arc) for the next step in the workflow.

## Related RepMail guides

- [Authentication-Results Header: Reading Receiver Assertions](/repmail/learn/glossary/authentication-results-header)
- [Click-Through Rate vs. Click-to-Open Rate](/repmail/learn/glossary/ctr-vs-ctor-email)


## Sources

[1]: https://www.rfc-editor.org/rfc/rfc6647 "IETF RFC reference"
[2]: https://www.mailgun.com/glossary/greylisting/ "Supporting technical or operational reference"
