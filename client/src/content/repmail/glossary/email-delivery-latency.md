---
product: repmail
academy: glossary
contentType: knowledge-base
slug: email-delivery-latency
title: "Delivery Latency: Measuring Time to Recipient Acceptance"
description: "Delivery Latency: Measuring Time to Recipient Acceptance — Teams need to distinguish instant delivery from eventual acceptance."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["glossary","deliverability","email","measurement","delivery","latency","measuring"]
assets:
  - type: table
    title: "Latency diagnostic decision table"
    content:
      headers: ["Observed symptom","Likely cause","Immediate action","Stop condition / evidence"]
      rows:
        - ["Median and p95 latency rise across many domains","Network congestion or upstream relay throttling","Check network metrics, DNS, and upstream relay health; throttle send rate","Median and p95 return to baseline for 30+ minutes"]
        - ["High p99 only for specific recipient domain","Recipient-side greylisting or policy throttling","Collect SMTP transcripts for affected domains; pause high-volume sends to that domain","Recipient domain starts returning normal 2xx rates and lowers tail latency"]
        - ["Latencies increase and many sessions end with 421/450 (4xx) replies","Temporary deferrals at recipient MTA","Retry according to backoff; alert ops and sample transcripts for provider","Deferrals fall to baseline and acceptance rates recover"]
        - ["Long connect establish times but fast SMTP reply after connect","DNS or TCP handshake delays (resolver or network)","Investigate DNS resolver latency and TCP retransmits; change resolver if confirmed","Connect times normalize and connect failures reduce"]
        - ["Missing per-message 2xx timestamps in logs","Logging/config bug or third-party API lacks remote acceptance detail","Instrument MTA to log final reply or request provider to expose remote responses","Per-message acceptance timestamps are available and reliable"]
featured: false
collections: ["core-email-glossary"]
learningPaths: []
keyTakeaways:
  - "Teams need to distinguish instant delivery from eventual acceptance."
  - "A focused task with a separate troubleshooting, implementation, decision, or reference job from the current corpus."
  - "Link from queue, deferral, and SLA pages."
commonMistakes:
  - "Skipping this check: Log per-message SMTP events (connect start/established, DATA end, final reply) with precise timestamps."
  - "Skipping this check: Ensure clocks across MTAs and logging systems are synchronized (NTP or PTP) and track skew metadata."
  - "Skipping this check: Compute and store p50/p75/p95/p99 latency metrics across recipient domains and IPs."
faqs:
  - question: "Does a TCP ACK mean the message was delivered?"
    answer: "No. TCP acknowledgements indicate transport of TCP segments, not application-level acceptance. Per SMTP, only a final 2xx reply from the remote server indicates server acceptance of the message content [1]. Use the SMTP reply timestamp as the acceptance marker."
  - question: "Can I measure delivery latency when using a third-party send API?"
    answer: "Only if the provider exposes the remote SMTP final reply timestamp or equivalent acceptance event. If the API returns only a submission or queueing time, you cannot compute end-to-end acceptance latency without provider instrumentation. State uncertainty: provider capabilities vary; check vendor documentation or request session-level logs."
  - question: "What latency thresholds should I use for alerts?"
    answer: "There is no universal threshold in the protocol; thresholds must be based on your historical baselines and recipient clusters. Use percentiles (p50/p95/p99) and alert on relative deviations (example: >2× median or >3× p95) while refining with operational data."
nextStep:
  label: "Continue with ARC (Authenticated Received Chain)"
  href: "/repmail/learn/glossary/arc"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Delivery latency is the measured time between when a sending system hands a message to an outbound SMTP client and when the receiving SMTP server returns a 2xx (accept) response. For operational teams, latency distinguishes transient SMTP slowness or queuing from true non-acceptance and can surface provider degradation before bounces increase.

## Definition and exact measurement points

Measure delivery latency as the elapsed time from the moment your MTA issues the SMTP DATA command completion (or the moment of 'message handed to client' if using a queued submission API) to the time an SMTP 2xx final reply for the message is received from the remote server. RFC 5321 defines SMTP reply codes and the server acceptance behavior that creates a definitive acceptance moment [1].

Decision boundary: treat the 2xx reply as the cutover from "in-flight" to "accepted by remote MTA." Do not treat temporary 4xx replies or connection-level TCP acknowledgements as acceptance. Evidence limits: if you only have TCP-level timestamps (connect/close) without per-message replies you cannot reliably compute per-message acceptance time.

## Common failure modes and what latency reveals

High median latency with low bounce rates often indicates temporary queuing or greylisting at the recipient MTA, throttling by an intermediate smart host, or network-level packet loss. Rising tail latency (95th–99th percentile) signals intermittent slow-paths that will eventually lead to delivery failures if sustained.

Decision boundary: if median latency is within historical norms but 99th percentile is expanding, prioritize transient network/greylist investigation; if median latency rises significantly, escalate to provider or infrastructure owners. Evidence limits: latency alone cannot distinguish deliberate spam throttling from capacity constraints without correlating logs and remote codes.

## How to instrument and collect reliable latency data

Log per-message SMTP timestamps: TCP connect start, TCP connect established, HELO/EHLO complete, MAIL FROM, RCPT TO, DATA start/end, and the final SMTP reply code with timestamp. Store client-side and MTA-side clock synchronization (NTP/PTP) metadata to avoid skew. Practical sequence: enable structured logging in the MTA, export to a time-series store or analytics pipeline, and compute per-message acceptance intervals.

Decision boundary: if clock skew >100ms between components, mark those samples unreliable for tail-latency analysis. Evidence limits: when using third-party send APIs that return only a submission timestamp, you cannot measure remote SMTP acceptance unless the provider surfaces remote replies.

## Analysis approach and thresholding

Report latency with percentiles (p50, p75, p95, p99) and track trending over rolling windows (1h, 24h, 7d). Define actionable thresholds based on historical baseline: example starting points are p50 <2s, p95 <10s, p99 <60s, but these must be calibrated per recipient cluster. Practical sequence: flag >2× increase in median or >3× increase in p95 as incidents requiring triage.

Decision boundary: treat near-real-time alarms on percentile increases as early-warning—do not auto-reject messages based solely on transient latency. Evidence limits: RFCs define acceptance semantics but not performance thresholds; thresholds are operational, not protocol mandates [1].

## When to escalate and remediation steps

If latency increases for a broad set of recipients (multiple recipient domains) and persists beyond your short-window baseline, investigate network paths, DNS resolution delays, and upstream smart host health. Triage sequence: check DNS A/MX resolution times, examine TCP retransmission counts, review intermediate relay logs, and contact provider support with representative message IDs and SMTP dialogues.

Decision boundary: escalate to SRE/network owner when median latency impact crosses the defined incident threshold for more than the configured time window (e.g., 15–30 minutes). Evidence limits: provider support may require full SMTP session traces or MTA logs to diagnose; be prepared to provide those.

## Use cases and how latency surfaces degradations before bounces

Because remote MTAs can defer (4xx) rather than immediately bounce (5xx), sustained increases in acceptance latency often precede a rise in permanent failures. Monitoring tail-latency identifies progressive congestion or policy throttling that will later result in deferred or dropped delivery attempts.

Decision boundary: if tail latency climbs while bounce counts remain low, treat this as a warning window for provider or routing issues and prepare to slow send rates or switch providers. Evidence limits: latency cannot prove intent (e.g., anti-spam throttling) without correlated SMTP reply codes and provider feedback.

## Practical checklist

- [ ] Log per-message SMTP events (connect start/established, DATA end, final reply) with precise timestamps.
- [ ] Ensure clocks across MTAs and logging systems are synchronized (NTP or PTP) and track skew metadata.
- [ ] Compute and store p50/p75/p95/p99 latency metrics across recipient domains and IPs.
- [ ] Set baseline thresholds from historical data and configure alerts for >2× median or >3× p95 increases.
- [ ] Correlate latency spikes with SMTP reply codes (4xx vs 5xx), DNS resolution times, and TCP retransmits.
- [ ] Sample full SMTP session transcripts for representative slow deliveries for provider support.
- [ ] If sustained latency affects many domains, throttle sends and open tickets with upstream providers.
- [ ] Exclude samples with clock skew or missing final 2xx replies from acceptance-time analysis.
- [ ] Document incident windows and root causes to refine future thresholds and escalation playbooks.

## Where RepMail fits

Use this guide as a checklist and decision aid in outbound workflows: instrument per-message acceptance timestamps, compute percentile-based latency metrics, and add early-warning alerts for median and tail increases. Teams can use these signals to pause or reroute sends, collect SMTP transcripts for provider support, and avoid large-scale delivery failures by acting before bounces rise.

Continue with [ARC (Authenticated Received Chain)](/repmail/learn/glossary/arc) for the next step in the workflow.

## Related RepMail guides

- [Delivered, Accepted, Deferred, and Bounced: Denominator Rules](/repmail/learn/glossary/email-delivery-status-denominators)
- [Authentication-Results Header: Reading Receiver Assertions](/repmail/learn/glossary/authentication-results-header)


## Sources

[1]: https://www.rfc-editor.org/rfc/rfc5321 "IETF RFC reference"
[2]: https://www.rfc-editor.org/rfc/rfc3464 "IETF RFC reference"
