---
product: repmail
academy: deliverability
contentType: knowledge-base
slug: spamhaus-sbl-xbl-pbl-dbl-explained
title: "Spamhaus SBL, XBL, PBL, and DBL: What Each Listing Means"
description: "Spamhaus SBL, XBL, PBL, and DBL: What Each Listing Means — Operators treat every Spamhaus result as the same kind of block."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability","reputation","incident","spamhaus","sbl","xbl"]
assets:
  - type: table
    title: "Quick diagnostic: Which Spamhaus list is this and what to do next"
    content:
      headers: ["Observed artifact","Likely Spamhaus list","Immediate triage action","Owner to contact"]
      rows:
        - ["Sending IP in logs and sender is a hosted MTA","SBL","Quarantine sending, review mail queues and abuse complaints","Hosting/Email Operations"]
        - ["Outbound from residential or cloud instance using SMTP","XBL","Isolate host, run malware scans and revoke creds","Customer/Host Security"]
        - ["IP from DHCP/mobile or consumer range","PBL","Cease direct outbound SMTP; route through authenticated relay or contact ISP","Network/ISP Operations"]
        - ["URLs or domains present in message body or redirect","DBL","Remove/replace links, scan site for compromise","WebOps/Domain Owner"]
        - ["IP appears in connection-time rejection but no URL","SBL or XBL (use owner context)","Map IP to owner and choose SBL workflow if operator culpable, XBL if compromised","Abuse/Network"]
        - ["Mixed indicators (URL + infected host)","DBL + XBL or SBL","Triage both tracks: clean host(s) and remediate domain content","Cross-functional team"]
featured: false
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
keyTakeaways:
  - "Operators treat every Spamhaus result as the same kind of block."
  - "Provider-specific taxonomy, not a generic blocklist check."
  - "Supports blocklist triage and escalation pages."
commonMistakes:
  - "Skipping this check: Capture exact Spamhaus list name and the listed artifact (IP, range, or domain) from your logs before any action."
  - "Skipping this check: Map the listed artifact to an owner (network team, hosting provider, customer) and assign a single incident owner."
  - "Skipping this check: Collect forensic evidence: SMTP headers, connection timestamps, message samples including URLs, server logs, and abuse complaints."
faqs:
  - question: "Can I request a single delist request that covers SBL, XBL, PBL, and DBL?"
    answer: "No. Each list represents different evidence and ownership models. Delisting SBL typically requires operator-level remediation and justification; XBL requires evidence a host was cleaned; PBL is solved by moving to approved infrastructure or ISP coordination; DBL requires removing malicious content. Submit separate, list-appropriate requests with matching evidence [1]."
  - question: "How long before a delisted IP/domain stops impacting delivery?"
    answer: "Timing varies and isn’t fixed by Spamhaus. After a successful delist, downstream receivers may cache previous decisions, so monitor bounces and feedback for several days and verify with targeted tests. For provider-specific caching or policy behavior, check recipients’ documentation or logs; this guide does not guarantee timelines."
  - question: "What evidence should I include in a DBL delisting request?"
    answer: "Provide proof of content removal or remediation (server logs, cleaned-site scans, screenshots showing removed pages), domain ownership verification, and a summary of corrective actions. Be precise: include timestamps, URLs, and a concise remediation timeline rather than vague statements. The DBL page offers directional guidance on content-based listings [1]."
nextStep:
  label: "Continue with Provider-Specific Deliverability Triage: Gmail, Microsoft, and More"
  href: "/repmail/learn/deliverability/provider-specific-deliverability-triage"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Spamhaus operates several distinct blocklists—SBL, XBL, PBL, and DBL—and each listing reflects a different evidence model and remediation path. Treating them as interchangeable wastes time and can produce incorrect delisting requests; use this guide to identify the list, interpret the cause, and follow the appropriate remediation and escalation sequence.

## Direct answer and decision boundary

If you see a Spamhaus hit, first identify which list is reported (SBL, XBL, PBL, or DBL); that determines whether the problem is an offensive source, infected host, dynamic IP policy, or malicious URL content. Do not assume a single remediation: SBL and DBL removals are request-driven and may require content or abuse-team evidence, XBL typically requires cleaning an infected host or ISP action, and PBL is often resolved by moving to a statically-assigned or properly provisioned IP.
Evidence limits: Spamhaus publishes list purposes but not always granular internal evidence; treat their page descriptions as directional and confirm with your own logs, bounce samples, and triage data before requesting delisting [1][2].
Practical sequence: 1) capture the exact list name and listing token from logs; 2) map the affected artifact (IP, host, or URL) to owner and system; 3) gather telemetry (mail headers, connection attempts, web crawl or click detail) and then follow the list-specific remediation below.

## SBL — Spamhaus Block List (spam sources and operators)

What it covers: SBL targets IPs and ranges used directly for sending spam or operated by organizations knowingly facilitating malicious mail. Evidence model is operator-centric and can include complaint-driven or investigative findings [1].
Decision boundary and evidence: If your sending IP is on SBL, assume Spamhaus attributes deliberate abuse or persistent spam-sending behavior to the operator. Check complaint history, open relays, and abuse-team correspondence. Evidence from Spamhaus may be directional; you’ll need concrete corrective actions and an accountable owner to make a delisting request [1].
Sequence: Stop sending from the listed IP/range immediately. Assign an owner (network/hosting/abuse). Review sending patterns, mail queue, and any harvested or purchased lists. Remediation typically requires operational changes (secure mail servers, remove permissive relays) and then a delisting request with evidence of remediation.

## XBL — eXploits Block List (infected or compromised hosts)

What it covers: XBL lists IPs exhibiting behavior consistent with botnets, open proxies, or other exploited endpoints that are sending or facilitating malware and spam. The focus is on compromised hosts rather than deliberate sender infrastructure [1].
Decision boundary and evidence: If your observed connection came from a residential or cloud instance and you find signs of compromise (malware, unusual outbound SMTP, proxying, unusual ports), treat it as an XBL case. Spamhaus often uses third-party malware and honeypot feeds; their published descriptions are directional rather than item-by-item evidence [1].
Sequence: Isolate the host, run forensic malware scans, revoke or rotate credentials, and patch. If the IP belongs to a customer, coordinate with the customer and the hosting provider. Only request delisting after the root cause is removed; include forensic summary in the delist request.

## PBL — Policy Block List (dynamic or non-mailing IPs)

What it covers: PBL contains IPs that should not be sending unauthenticated mail directly to destination MXes—typically dynamic residential ranges or ISP-assigned addresses. It’s a policy list, not an accusation of malware or spam operation [1].
Decision boundary and evidence: If the listing IP is within a consumer or dynamic allocation (DHCP scope, mobile carrier), this is likely a PBL match. Verify with your RIR/ISP records and consider whether your architecture improperly sends directly from such addresses (e.g., devices/clients sending outbound mail).
Sequence: Move legitimate outbound mail to authenticated, properly provisioned SMTP relays (relay hosts, MTA with static IPs) or request an exception from the ISP. For delisting, coordinate with the ISP or follow Spamhaus guidance; provide evidence you’ve moved sending to approved infrastructure.

## DBL — Domain Block List (malicious/malformed domains and URLs)

What it covers: DBL lists domains and URLs associated with spam, phishing, malware, or other abusive web content. It targets content and domains rather than sending IPs [1].
Decision boundary and evidence: If your message includes a domain or link that matches DBL, the root cause is the URL or domain content/purpose. The presence of a DBL-listed domain in a message can cause deliverability failure even when the sending IP is clean. Spamhaus relies on web crawl, user reports, and threat feeds; consider that listings may be updated based on ongoing threat intelligence [1].
Sequence: Remove or replace the listed domain/URL in messaging and web properties, remediate the website (remove malware/phishing pages), or retire the domain. After cleanup, follow Spamhaus DBL delisting procedures and include evidence such as clean scans, removed content snapshots, and domain ownership verification.

## Practical checklist

- [ ] Capture exact Spamhaus list name and the listed artifact (IP, range, or domain) from your logs before any action.
- [ ] Map the listed artifact to an owner (network team, hosting provider, customer) and assign a single incident owner.
- [ ] Collect forensic evidence: SMTP headers, connection timestamps, message samples including URLs, server logs, and abuse complaints.
- [ ] For SBL: stop sending from the listed IP/range, secure servers, close relays, and prepare an operator-level remediation summary.
- [ ] For XBL: isolate and forensic-scan the host, remove malware, patch, and rotate credentials before delisting requests.
- [ ] For PBL: stop direct sending from dynamic IPs; move mail to authenticated relays or coordinate with the ISP for reallocation.
- [ ] For DBL: remove or neutralize the malicious domain/URL, clean the site, and provide web-scans or screenshots in delist requests.
- [ ] When requesting delisting, attach specific evidence and a clear remediation timeline; don’t send vague assurances.
- [ ] Log actions, delisting responses, and verification steps in your incident tracker; stop conditions include confirmed delist and no recurrence for a defined monitoring window (e.g., 7–14 days).

## Where RepMail fits

Use this guide as a procedural checklist and decision aid when triaging Spamhaus hits in an outbound workflow. It helps you route incidents to the right owner, collect the right evidence for each list-type, and avoid wasting time on inappropriate delisting requests. Track each step and stop when delist confirmation and a short monitoring window show no recurrence.

Continue with [Provider-Specific Deliverability Triage: Gmail, Microsoft, and More](/repmail/learn/deliverability/provider-specific-deliverability-triage) for the next step in the workflow.

## Related RepMail guides

- [Blocklist Delisting Request: Evidence Packet and Owner Handoff](/repmail/learn/deliverability/blocklist-delisting-evidence-packet)
- [Blocklist Listing After a Compromised Account: Containment Before Delisting](/repmail/learn/deliverability/compromised-account-blocklist-containment)


## Sources

[1]: https://www.spamhaus.org/blocklists/ "Supporting technical or operational reference"
[2]: https://www.spamhaus.org/blocklists/spamhaus-blocklist/ "Supporting technical or operational reference"
