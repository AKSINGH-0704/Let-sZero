---
product: repmail
academy: deliverability
contentType: guide
slug: gmail-sender-requirements-evidence-audit
title: "Gmail Sender Requirements: Evidence Audit Checklist"
description: "Audit Gmail sender-readiness evidence for authentication, TLS, DNS, subscription controls, and monitoring without turning guidance into a guarantee."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["Gmail sender requirements", "audit", "SPF", "DKIM", "DMARC"]
keyTakeaways:
  - "An evidence audit maps each current Gmail requirement or recommendation to a test result, owner, and date."
  - "Scope the audit to the sender type and traffic you operate; do not convert provider guidance into legal advice."
  - "Policies and requirements change, so recheck Google’s current pages at publication and before relying on the audit."
prerequisites:
  - label: "Verify the sending domain"
    href: "/repmail/learn/deliverability/verify-your-sending-domain"
  - label: "Review DMARC"
    href: "/repmail/learn/deliverability/what-is-dmarc"
commonMistakes:
  - "Checking that a DNS record exists without testing the identity used by an actual message."
  - "Treating a checklist as proof of inbox placement or acceptance."
  - "Leaving the audit undated while Google’s sender guidance and enforcement details change."
faqs:
  - question: "Is this checklist a Gmail compliance certification?"
    answer: "No. It is an evidence-organizing workflow. Google’s current sender guidance controls, and the audit does not provide legal advice, certification, or a delivery guarantee."
  - question: "What evidence proves DKIM is working?"
    answer: "Use a received test message and record the DKIM result, signing domain, selector where available, and alignment to the visible From domain. A published key alone does not prove that the live sending path signs correctly."
  - question: "How often should the audit be repeated?"
    answer: "Repeat it after changes to domains, providers, IPs, authentication, subscription flows, or traffic patterns, and before a material launch. Recheck Google’s live requirements at publication time."
nextStep:
  label: "Inspect DMARC alignment"
  href: "/repmail/learn/deliverability/what-is-dmarc"
  description: "Confirm that authenticated identities relate to the domain recipients see."
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
assets:
  - type: checklist
    title: "Gmail sender evidence audit"
    content:
      - "Record audit date, sender type, sending domains, providers, IPs, and traffic purpose"
      - "Capture a received message showing SPF, DKIM, DMARC, visible From, and alignment results"
      - "Verify PTR or provider-managed reverse DNS for the actual outbound path where applicable"
      - "Test TLS and preserve the sending or receiving evidence available to the operator"
      - "Document unsubscribe or subscription controls and suppression handling for the stream"
      - "Record Gmail-specific monitoring sources, including any available Postmaster Tools property"
      - "Assign an owner and recheck date for every evidence gap"
---

**Treat Gmail sender readiness as an evidence audit, not a checkbox or delivery promise.** Record the sender type, live sending identities, authentication results, DNS and transport evidence, subscription controls, and monitoring source. Scope every conclusion to the current Google guidance and date the audit because provider requirements and enforcement can change.

## Set the audit scope

Write down the domains, visible From addresses, DKIM signing domains, SPF envelope domains, providers, IPs, message types, and recipient populations in scope. Gmail guidance distinguishes sender circumstances, so avoid applying a statement intended for one traffic pattern to every mail stream. The [domain-verification guide](/repmail/learn/deliverability/verify-your-sending-domain) helps establish the ownership and setup context.

## Collect message-level evidence

Send a controlled message through each production path and inspect the received headers. Record SPF result and envelope domain, DKIM result and `d=` domain, DMARC result and alignment, visible From, message date, sending provider, and any relevant TLS evidence. A DNS lookup can show that a record exists; only the live message shows whether the configured path actually uses it.

Review reverse DNS or provider-managed infrastructure evidence for the address that sends the message. Keep the result separate from authentication. A valid PTR does not prove that Gmail will accept or place a message.

## Audit subscription and monitoring controls

Document how recipients subscribe, unsubscribe, and enter suppression. Record where complaints and bounces are handled, how opt-outs propagate, and which owner reviews anomalies. These operational controls are evidence about the sending program; they are not a substitute for Google’s current language.

If you use Google Postmaster Tools, record the property, verification date, domain identity, chart date range, and data-availability caveat. A dashboard can be delayed or have insufficient data, so pair it with delivery events and message tests.

## Close gaps with dated owners

For each gap, write the evidence needed, owner, due date, and retest method. Do not mark a requirement complete because a vendor claims support; capture the output from your own sending path. At publication time and before a major launch, re-read Google’s [sender guidelines](/repmail/learn/deliverability/what-is-dmarc) and Gmail help page. This page is an operational checklist, not legal advice or a guarantee of acceptance or placement.

## Where RepMail fits

RepMail can provide the sending-domain context and campaign records used to assemble this audit. Use [DMARC guidance](/repmail/learn/deliverability/what-is-dmarc) to interpret alignment, then keep the evidence file with the relevant domain and stream. Product capabilities and Google policies should be rechecked at publication time.

## Sources

- [Google Workspace Admin Help: Email sender guidelines](https://support.google.com/a/answer/81126)
- [Gmail Help: Email sender guidelines](https://support.google.com/mail/answer/14668346?hl=en)
