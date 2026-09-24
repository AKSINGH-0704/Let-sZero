---
product: repmail
academy: deliverability
contentType: research
slug: shared-ip-vs-domain-reputation-experiment
title: "Shared IP vs Domain Reputation: Attribution Experiment"
description: "Design a matched experiment to test whether a deliverability symptom follows shared infrastructure, domain identity, or both."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["shared IP", "domain reputation", "attribution", "experiments"]
keyTakeaways:
  - "IP and domain signals are related but not interchangeable; attribution requires controlled changes."
  - "Hold audience, content, cadence, and authentication constant while changing one infrastructure or identity factor."
  - "One dashboard snapshot cannot establish causality; report provider-specific, time-bound findings."
prerequisites:
  - label: "Review sender reputation"
    href: "/repmail/learn/deliverability/sender-reputation"
  - label: "Compare domains fairly"
    href: "/repmail/learn/deliverability/compare-sending-domains-fairly"
commonMistakes:
  - "Changing the IP and domain together, then calling the result an IP or domain effect."
  - "Assuming a shared-IP signal belongs to one sender without checking the pool and provider evidence."
  - "Using a provider reputation chart as the only outcome measure."
faqs:
  - question: "Can a shared IP affect a clean domain?"
    answer: "Shared infrastructure can create attribution and reputation exposure from other senders, but the effect is provider-specific and must be established with evidence. Do not assume either innocence or causality from the shared label alone."
  - question: "How do I isolate IP from domain?"
    answer: "Keep the domain and message constant while comparing infrastructure, or keep the infrastructure and message constant while comparing domains. If both must change, label the result as a combined change rather than an isolated effect."
  - question: "What is a useful experiment outcome?"
    answer: "A provider-specific difference in acceptance, deferral, bounce, or placement within a documented matched window is useful. It supports a next test; it does not prove how every provider will behave."
nextStep:
  label: "Apply matched domain controls"
  href: "/repmail/learn/deliverability/compare-sending-domains-fairly"
  description: "Use the domain-comparison worksheet to control audience and message variables."
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
assets:
  - type: table
    title: "Attribution experiment design"
    content:
      headers: ["Cell", "Domain", "IP or provider", "What stays fixed"]
      rows:
        - ["Control", "Current", "Current", "Audience, content, cadence, auth"]
        - ["Infrastructure test", "Current", "Alternative", "Domain, message, cohort, window"]
        - ["Identity test", "Alternative", "Current", "IP, message, cohort, window"]
        - ["Combined change", "Alternative", "Alternative", "Label as non-isolated evidence"]
---

**Test IP-versus-domain attribution by changing one factor at a time and holding the audience, message, cadence, and authentication constant.** A shared IP and a sending domain can both influence provider evidence, but a single dashboard snapshot cannot tell you which one caused a symptom. Design the comparison before moving traffic.

## Choose the causal question

Write either “Does the symptom follow the IP or provider?” or “Does it follow the domain identity?” A control cell should keep the current domain, IP or provider, message, audience, and cadence. An infrastructure cell changes only the IP or provider where feasible. An identity cell changes only the domain and its correctly configured authentication. If your migration requires both changes, call it a combined change and do not claim isolated attribution.

Use the [fair domain-comparison guide](/repmail/learn/deliverability/compare-sending-domains-fairly) for cohort controls. Record shared-pool ownership and any other senders or streams that may make the IP evidence non-exclusive.

## Measure multiple outcomes

For each provider cohort, record SMTP acceptance, deferral and bounce response text, authentication and alignment, seed-test placement, complaint events where available, and relevant live-recipient outcomes. Keep timestamps and message identifiers. A provider reputation dashboard is context, not a complete outcome measure, and a seed result is directional rather than universal.

Run the same recurring message pattern through each cell. Keep links, tracking, From display, recipient selection, volume, and schedule stable. If a difference in a cell appears only after a volume or content change, annotate the confounder instead of assigning the effect to IP or domain.

## Interpret cautiously

If the symptom follows the IP across the same domain and provider, infrastructure becomes a stronger hypothesis. If it follows the domain across comparable infrastructure, identity becomes a stronger hypothesis. If only one provider changes, keep the conclusion provider-specific. If both cells change, the experiment did not isolate the cause.

Repeat the test after remediation. A clean result during one window does not erase history or guarantee future placement. Retain the experiment record, configuration hashes or version identifiers, provider responses, and decision made from the evidence.

## Where RepMail fits

RepMail teams can pair this worksheet with sender reputation records and domain verification evidence. The product context can help document which stream used which sender, but provider signals remain provider-specific. Recheck current Google guidance at publication time and before making a major infrastructure decision.


## Related resources

Use the [adjacent workflow](/repmail/learn/deliverability/compare-sending-domains-fairly) and then review the [next operational guide](/repmail/learn/deliverability/complete-guide-to-email-deliverability) to keep this decision connected to the wider RepMail resource graph.

## Sources

- [Google: Gmail sender guidelines](https://support.google.com/mail/answer/14668346?hl=en)
- [Google Workspace Admin Help: Email sender guidelines](https://support.google.com/a/answer/81126)
