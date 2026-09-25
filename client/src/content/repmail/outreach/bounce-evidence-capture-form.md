---
product: repmail
academy: outreach
contentType: guide
slug: bounce-evidence-capture-form
title: "Bounce Evidence Capture Form"
description: "Bounce Evidence Capture Form — Support teams need normalized fields for recipient, timestamp, SMTP code, enhanced status, provider, headers, and attempted acti."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","bounce","evidence","capture","form"]
assets:
  - type: table
    title: "Bounce Evidence Capture Compact Table"
    content:
      headers: ["Condition observed","Required fields to include","Immediate routing suggestion","Stop condition"]
      rows:
        - ["Clear permanent 5xx and enhanced 5.X.Y present","recipient, timestamp, SMTP code, enhanced status, transcript, headers, provider","Route to delivery ops for suppression/root-cause","Packet complete when all fields present"]
        - ["Temporary 4xx retryable reply","recipient, timestamp, SMTP code, transcript, attempted action, headers","Place in retry queue; note throttle windows","Packet complete after transcript and attempt context captured"]
        - ["Provider redaction of headers/transcript","recipient, timestamp, SMTP code, provider-evidence note, escalation flag","Escalate to provider packet team with redaction notes","Stop when redaction is documented and evidence exhausted"]
        - ["No enhanced status and ambiguous SMTP text","recipient, timestamp, SMTP code, transcript, headers","Escalate to delivery ops for interpretation","Stop when transcript and headers captured"]
        - ["Multiple Received hops with final rejection elsewhere","recipient, timestamp, SMTP code, final-provider host, transcript","Assign owner to server that issued final rejection","Stop when final rejecting host identified"]
        - ["Manual resend failed after prior retries","recipient, timestamp, SMTP code, transcript, attempted action, campaign id","Escalate to incident timeline; attach retry history","Stop when retry history and packet included"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Support teams need normalized fields for recipient, timestamp, SMTP code, enhanced status, provider, headers, and attempted action."
  - "Distinct from bounce-code routing: captures a complete case packet before routing."
  - "bounce routing; incident timeline; provider packet"
commonMistakes:
  - "Skipping this check: Capture envelope recipient (exact string)."
  - "Skipping this check: Record timestamp in UTC ISO 8601 and source system clock reference."
  - "Skipping this check: Copy the literal SMTP reply line(s) and separate the three-digit code into its own field."
faqs:
  - question: "What level of SMTP transcript do you need to paste into the packet?"
    answer: "Include the SMTP exchange covering the RCPT TO and DATA phases plus the server final reply for that transaction, limited to the portion that references the recipient. If logs are too long, include the relevant window and note omitted sections. If the provider redacted text, document which lines were removed."
  - question: "If the provider gives only a human-readable message (no enhanced status), how should I proceed?"
    answer: "Record the three-digit SMTP code and paste the full human-readable reply into the transcript field. Flag the enhanced status as missing and escalate per the ‘No enhanced status’ routing in the decision table. Do not invent an enhanced status — treat it as absent."
  - question: "When is the packet ready to route to bounce-code owners?"
    answer: "Route only when required fields (recipient, UTC timestamp, SMTP code, transcript or documented redaction, headers or documented absence, provider name, attempted action) are present. If any required field is unavailable due to provider limitations, include an explicit note and route to escalation rather than assuming completeness."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Use this form to capture a complete, normalized case packet for every hard or soft bounce before routing to bounce-code owners. The goal is to give support and escalation teams the consistent fields they need to diagnose, triage, and trend bounces without re-requesting missing data.

## Minimum required fields and why each matters

Capture recipient (full envelope recipient), timestamp (UTC ISO 8601), SMTP reply code (three-digit), enhanced status (X.Y.Z where present), provider name, raw SMTP transcript snippet, and attempted action (send, resend, abort). Each field maps to a distinct troubleshooting decision: identity (recipient), timing (timestamp), protocol signal (SMTP code and enhanced status), source ecosystem (provider), causality and evidence (transcript), and operator intent (attempted action).
Decision boundary: don’t accept approximate timestamps or paraphrased SMTP replies — capture the literal strings. Evidence limits: some providers strip headers or redact transcripts; mark those cases explicitly in the packet so analysts know what is missing.

## How to capture headers and transcripts reliably

Prefer the raw SMTP transcript up to 2,000 characters or the server log range covering the SMTP transaction for that recipient. Also capture the message headers (Received chain, Message-ID, From, To, Date) as raw text; do not rely on UI-parsed fields for these. Practical sequence: first pull the server log for the timestamp window, then export the message headers from the mailbox or message store, and finally paste both into the packet.
Decision boundary: if headers are partially redacted (e.g., by a provider), note which headers are missing. Evidence limits: RFC-compliant Received headers can be forged; treat them as evidence of transit order but corroborate with server logs when possible [1].

## Normalizing SMTP code and enhanced status

Record the three-digit SMTP reply (e.g., 550) and any enhanced status code (e.g., 5.1.1) as separate fields. If an enhanced status is not present, leave that field empty and flag for operator review. Use RFC 5321 and RFC 3463 as the interpretive baseline: SMTP codes indicate the transaction-level action and enhanced status provides finer-grain diagnostic class where present [1][2].
Decision boundary: do not infer enhanced status from SMTP message text; capture the explicit X.Y.Z token when available. Evidence limits: not all providers include valid enhanced-status codes; in those cases escalate with the raw SMTP reply and transcript.

## Provider identification and versioning

Record the provider name (e.g., Gmail, Microsoft, Sendgrid) plus the observed provider-reported string (mail server host in Received headers or banner). Also add ‘provider evidence’ notes describing whether the transcript included provider-specific signals (deferred queue messages, policy rejection headers, DMARC disposition). Practical sequence: extract provider host from the first unredacted Received header and cross-check against the SMTP banner if available.
Decision boundary: if multiple providers appear in the Received chain, assign the provider field to the server that issued the final rejection or bounce. Evidence limits: provider ecosystems and banner strings change; state uncertainty for vendor-specific diagnostic claims.

## Attempted action, operator context, and stop conditions

Capture the attempted action as one of: initial_send, retry_immediate, scheduled_retry, manual_resend, or abort. Also include operator notes: campaign id, template id, and any throttling or suppression checks run prior to send. Practical sequence: document the action taken, then attach the code/transcript and timestamp to show if the action preceded the bounce.
Decision boundary: do not conflate automatic retries with manual resends — this influences routing and root-cause. Stop conditions: packet is complete when all required fields are present or when clearly documented provider redaction prevents additional evidence collection.

## Routing, ownership, and packet handoff rules

After packet completion, route according to the bounce-code routing map: permanent 5xx with enhanced 5.X.Y goes to delivery ops; temporary 4xx to retry queue or throttling team; ambiguous or provider-redacted cases to escalation. Include a summary line that states the recommended owner and the primary reason. Practical sequence: validate required fields, run an automated rule to suggest an owner, and attach the packet to the incident timeline and provider packet link.
Decision boundary: do not route until the packet contains the normalized SMTP code, timestamp, recipient, and either the transcript or a documented reason for absence. Evidence limits: routing recommendations are internal operational guidance; providers’ policies may differ and should be noted if relevant.

## Practical checklist

- [ ] Capture envelope recipient (exact string).
- [ ] Record timestamp in UTC ISO 8601 and source system clock reference.
- [ ] Copy the literal SMTP reply line(s) and separate the three-digit code into its own field.
- [ ] Extract and paste the enhanced status code X.Y.Z if present; otherwise flag missing.
- [ ] Attach raw message headers (full Received chain and Message-ID).
- [ ] Paste the SMTP/server transcript covering the transaction or note provider redaction.
- [ ] Identify provider and provider-evidence string (banner or Received host).
- [ ] Set attempted action (initial_send, retry_immediate, scheduled_retry, manual_resend, abort).
- [ ] Confirm routing recommendation and attach packet to incident timeline.

## Where RepMail fits

Use this form as a standardized checklist and packet template inside your outbound workflow: collect the normalized fields before applying bounce-code routing, attach the packet to the incident timeline and provider packet, and use the packet to drive consistent escalation and trend analysis. Do not assume RepMail automates collection; treat the form as an operational decision aid to improve handoffs and data quality.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Client consent and evidence register for outbound approvals](/repmail/learn/outreach/client-consent-evidence-register-outbound)
- [Client offboarding evidence pack for outbound operations](/repmail/learn/outreach/client-offboarding-evidence-pack-outbound)


## Sources

[1]: https://www.rfc-editor.org/rfc/rfc5321 "IETF RFC reference"
[2]: https://www.rfc-editor.org/rfc/rfc3463 "IETF RFC reference"
