---
product: repmail
academy: deliverability
contentType: comparison
slug: ip-vs-domain-blocklist-triage
title: "IP vs. Domain Blocklist: Triage the Listing Type First"
description: "IP vs. Domain Blocklist: Triage the Listing Type First — Teams do not know whether to inspect the connecting IP, HELO, From domain, or URLs."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability","reputation","incident","domain","blocklist","triage"]
assets:
  - type: table
    title: "IP vs Domain Blocklist Diagnostic Table"
    content:
      headers: ["Observed evidence","Primary ownership","First action","Stop condition"]
      rows:
        - ["SMTP rejection including the connecting IP","Network/hosting or IP operations","Confirm IP ownership; run IP reputation and contact ISP/host","IP removed from lists or provider accepts mail from IP"]
        - ["Bounce text references sender domain or URLs","Sending/app team and domain owner","Collect message sample; verify DKIM/SPF; scan URLs and hosting","Delisting confirmed for domain or URLs removed/fixed"]
        - ["Only one domain on a shared IP fails","Application/sending domain owner","Isolate domain sends; test other domains on same IP; check authentication","Affected domain passes tests and provider accepts mails"]
        - ["HELO/EHLO mismatch or PTR missing","Infrastructure/ops","Correct HELO and PTR records to match host; reattempt","No HELO-based rejections and successful deliveries"]
        - ["Blocked URLs or redirects reported","Web/hosting and sending team","Follow redirect chain to final host; remove/replace offending URL; request rescans","URL host cleared and emails accepted"]
featured: false
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
keyTakeaways:
  - "Teams do not know whether to inspect the connecting IP, HELO, From domain, or URLs."
  - "Existing blocklist verification is broader; this isolates listing-type routing."
  - "Links to IP/domain reputation and delisting runbooks."
commonMistakes:
  - "Skipping this check: Capture full SMTP transaction logs (peer IP, HELO/EHLO, SMTP response) for representative failures."
  - "Skipping this check: Map the peer IP to your infrastructure or relay provider; confirm ownership before opening delist requests."
  - "Skipping this check: Correlate failures to a specific envelope domain (Mail From) and header From; test other domains on the same IP to confirm scope."
faqs:
  - question: "If my IP and domain both appear suspicious, which do I fix first?"
    answer: "Fix what you directly control that is most likely to stop immediate rejections. If the connecting IP is yours and SMTP rejections reference that IP, address IP issues (PTR, sending rate, abuse contacts) first. If bounces point to a domain or URLs and only one authenticated domain is affected, remediate the domain and content first. In ambiguous cases, run parallel tasks: network team on IP checks and application team on domain and content."
  - question: "How do I get Google or Microsoft to tell me exactly which list blocked me?"
    answer: "Major providers sometimes provide directional guidance but don’t always disclose a specific external blocklist. Use provider postmaster tools and bounce texts as initial evidence and follow their published troubleshooting pages; for example, Google and Microsoft provide postmaster resources and guidance for suspicious senders [1][2][3][4]. State uncertainty when providers won’t confirm third-party list names and pursue both provider-specific and third-party delisting paths when necessary."
  - question: "Can I rely on public blocklist lookup tools to make the triage decision?"
    answer: "Lookup tools are useful for quick orientation but can be incomplete or outdated. Use them as one piece of evidence alongside your SMTP logs, bounce samples, and provider feedback. Treat public results as directional and confirm ownership before changing routing or requesting delists."
nextStep:
  label: "Continue with Provider-Specific Deliverability Triage: Gmail, Microsoft, and More"
  href: "/repmail/learn/deliverability/provider-specific-deliverability-triage"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Answer: First determine whether the blocklist hit is attached to an IP address or a domain — that decision directs who owns remediation and which runbook to follow. Inspect the SMTP connection (IP and HELO), then correlate with authenticated domains (Mail From/From) and embedded URLs; each has different evidence, escalation paths, and delisting procedures.

## Decision boundary: IP vs. domain — what to check first

Start with the SMTP layer: capture the connecting IP and HELO/EHLO from your delivery logs or your MTA’s connection logs. If a remote MTA refused or deferred mail with an error that includes an IP, HELO, or a direct blocklist name, treat the connecting IP as the primary artifact for triage. If bounce text references a sender domain or links to a delisting page, treat the domain as the primary artifact. This step routes the incident to the correct owner (network/IP team versus sending/application team). Evidence limits: many providers surface only bounce text or an opaque SMTP code; don’t assume the IP/domain without log confirmation.

## How to gather and interpret evidentiary signals

Collect three things for each failed delivery: the remote SMTP banner/HELO, the peer IP, and the authenticated envelope domain (Mail From) and From header. Use MTA logs, delivery reports, and samples of bounce text. Correlate the peer IP to your hosting or cloud provider and map the envelope domain to your sending application. Practical sequence: capture logs, identify whether the IP is yours or a relay, then check whether the payload headers show your domain or a third-party’s. Remember: a blocked URL inside email typically implicates the domain that hosts the URL, not the connecting IP.

## Common indicators that point to an IP listing

Indicators: SMTP rejections referencing the connecting IP directly, bounce messages that include phrases like “blocked IP,” or evidence that multiple domains sending from the same IP are affected. If you host your own mail servers or use a shared IP pool, start with IP reputation lookups and your provider’s support channels. Evidence limits: some major providers (Google, Microsoft) will not always disclose specific blocklist sources in bounce text; use provider troubleshooting pages and postmaster channels as directional evidence [1][2][3][4].

## Common indicators that point to a domain (envelope/From) listing

Indicators: bounce text that cites a domain, URLs being blocked in message bodies, or only messages using a particular authenticated domain failing while other domains on the same IP succeed. Domain listings often stem from phishing, abusive content, or a compromised site hosting bad URLs. Practical sequence: verify domain DKIM/SPF alignment, examine recent sending patterns for spikes or changes, and inspect landing pages for malware or redirect chains. Use domain-delisting runbooks for registrar/hosting actions where necessary.

## How to triage HELO/EHLO and third-party relays

HELO mismatches can trigger rejections at some providers; if logs show a HELO that doesn’t match the sending host or reverse DNS, treat that as a configuration issue owned by your infrastructure team. If messages transit third-party relays (ESP, cloud SMTP), determine whether the block is against the shared relay IP or the mail-from/From domain; coordinate with the relay provider for IP-based issues and own domain remediation for domain-based issues. Evidence limits: ESPs often use shared IP pools and can mask the ultimate sending IP; require provider confirmation before assuming ownership.

## When URLs in message bodies are the root cause

If recipients or provider feedback indicate a blocked link, the listing may be against the URL’s hosting domain or the URL-shortening service. Inspect the exact URL in the delivered sample; follow redirects and check the final host. Practical sequence: remove or quarantine the URL, replace with a known-clean landing, and request rescans or delisting from the host/URL reputation services. Example: a marketing campaign using a new tracking domain that redirects through a third-party shortener can cause domain-level listings even when the connecting IP is clean.

## Practical checklist

- [ ] Capture full SMTP transaction logs (peer IP, HELO/EHLO, SMTP response) for representative failures.
- [ ] Map the peer IP to your infrastructure or relay provider; confirm ownership before opening delist requests.
- [ ] Correlate failures to a specific envelope domain (Mail From) and header From; test other domains on the same IP to confirm scope.
- [ ] Run quick lookups against public blocklist providers and provider postmaster pages for guidance, but treat results as directional rather than definitive [5].
- [ ] Inspect any blocked URLs in message bodies; follow redirect chains to the final host before concluding domain responsibility.
- [ ] Check DKIM, SPF, and DMARC alignment for the affected domain; fix authentication errors before requesting delists.
- [ ] If HELO/RDNS mismatch is present, correct PTR/HELO settings with the hosting or network team.
- [ ] Coordinate with your ESP or cloud provider when using shared IPs; obtain their confirmation and escalation path for IP-level listings.
- [ ] Document the stop condition: successful test deliveries to the affected provider and, where applicable, confirmation of delisting from the list operator or provider postmaster.

## Where RepMail fits

Use this guide as a decision aid in your outbound incident workflow: capture the minimal required evidence (peer IP, HELO, envelope domain, sample message) and use the decision table and checklist to route the incident to the correct owner. Keep the checklist and diagnostic table in your runbook so triage consistently sends IP issues to network/ISP owners and domain/content issues to the sending/application owners rather than duplicating effort.

Continue with [Provider-Specific Deliverability Triage: Gmail, Microsoft, and More](/repmail/learn/deliverability/provider-specific-deliverability-triage) for the next step in the workflow.

## Related RepMail guides

- [Blocklist Delisting Request: Evidence Packet and Owner Handoff](/repmail/learn/deliverability/blocklist-delisting-evidence-packet)
- [Blocklist Listing After a Compromised Account: Containment Before Delisting](/repmail/learn/deliverability/compromised-account-blocklist-containment)


## Sources

[1]: https://support.google.com/mail/answer/81126?hl=en "Google sender or Workspace documentation"
[2]: https://support.google.com/mail/answer/14289100?hl=en "Google sender or Workspace documentation"
[3]: https://support.microsoft.com/en-us/outlook/sender-support-in-outlook-com "Microsoft documentation"
[4]: https://support.microsoft.com/en-us/outlook/failed-delivery-messages-from-the-postmaster-at-outlook-com-microsoft-com-or-service-microsoft-com "Microsoft documentation"
[5]: https://www.spamhaus.org/blocklists/ "Supporting technical or operational reference"
[6]: https://www.spamhaus.org/blocklists/spamhaus-blocklist/ "Supporting technical or operational reference"
[7]: https://www.litmus.com/blog/how-to-fix-email-reputation "Supporting technical or operational reference"
