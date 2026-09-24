---
product: repmail
academy: deliverability
contentType: guide
slug: forward-confirmed-reverse-dns-test
title: Forward-Confirmed Reverse DNS Test for Outbound Mail
description: Practical, provider-aware how-to for performing a forward-confirmed reverse
  DNS (FCrDNS) test on outbound SMTP IPs. Includes commands, expected evidence, edge
  c
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
collections:
  - deliverability-diagnostics
learningPaths:
  - provider-deliverability-diagnostics
tags:
- deliverability
- dns
- ptr
- rDNS
- smtp
- troubleshooting
- infrastructure
assets:
- type: table
  title: FCrDNS test checklist
  content:
    headers:
    - Test
    - Command / Tool
    - Expected evidence
    - If it fails
    rows:
    - - Reverse lookup (PTR) of sending IP
      - 'dig -x <IP> +short

        or

        host <IP>'
      - Returns a single hostname (e.g., mail.example.com.)
      - If no PTR or multiple unexpected names, request provider set explicit PTR.
    - - Forward A/AAAA lookup of PTR name
      - 'dig A +short mail.example.com

        or

        dig AAAA +short mail.example.com'
      - Returns the original sending IP (or includes it among results)
      - If IP not present, add/adjust A/AAAA records so hostname points to the IP.
    - - Compare results (FCrDNS confirmation)
      - Manual comparison of outputs
      - PTR hostname ↔ forward lookup includes same IP
      - If mismatch, update PTR or forward record so they match; coordinate with hosting/IP
        provider.
    - - SMTP HELO/EHLO banner check
      - telnet <IP> 25 (EHLO command) or openssl s_client -starttls smtp -connect
        <host>:587
      - Banner/HELO should present a sensible hostname (ideally matching PTR)
      - If HELO uses IP or different name, align MTA configuration to use the PTR
        hostname or a valid FQDN.
    - - IPv6 repeat
      - dig -x <IPv6> +short and dig AAAA +short <hostname>
      - Consistent PTR ↔ AAAA mapping
      - If IPv6 missing or inconsistent, add AAAA or PTR for IPv6 path.
keyTakeaways:
- FCrDNS means an IP's PTR (reverse) resolves to a hostname that, when looked up forward
  (A/AAAA), resolves back to the same IP.
- Use simple DNS tools (dig, host, nslookup) to produce the evidence; repeat for IPv4
  and IPv6 as needed.
- FCrDNS is an important infrastructure signal but not the sole determinant of inbox
  placement—also check SPF, DKIM, reputation, and provider-specific requirements [1][2].
commonMistakes:
- Checking only PTR without performing the forward (A/AAAA) lookup to confirm the
  PTR hostname maps back.
- Assuming a matching hostname guarantees delivery; PTR is one signal among many.
- Failing to test IPv6 separately or ignoring multiple A/AAAA records that can produce
  ambiguous results.
faqs:
- question: Does a correct PTR alone guarantee deliverability?
  answer: No. A matching PTR and forward A/AAAA lookup is a required infrastructure
    consistency check for many providers, but inbox placement depends on additional
    factors (SPF, DKIM, DMARC, sending reputation, volume patterns, and provider heuristics).
    Use FCrDNS as part of a broader diagnosis rather than a standalone fix.
- question: How do I test FCrDNS for an IPv6 address?
  answer: 'Use the same workflow but query the IPv6 reverse zone and check the PTR
    gives a hostname, then perform an AAAA lookup on that hostname. Example: dig -x
    2001:db8::1 +short and dig AAAA +short hostname.example.com. Treat IPv6 separately
    because some providers evaluate v4 and v6 paths independently.'
- question: What if the PTR hostname is a CNAME?
  answer: CNAMEs in forward records can complicate the check. RFC and common practice
    expect the PTR to point to a canonical hostname that resolves to A/AAAA records.
    If the PTR points to a name that itself is a CNAME, ensure the CNAME ultimately
    resolves to the sending IP; when possible, use a canonical A/AAAA target to reduce
    ambiguity.
nextStep:
  label: Review DNS records required for email
  href: /repmail/learn/glossary/ptr-record
  description: After confirming FCrDNS, verify SPF, DKIM, and related DNS entries
    are correctly published on your sending host—see the DNS records for email guide.
---

Direct answer: To run a forward-confirmed reverse DNS (FCrDNS) email test for an outbound mail IP, perform a reverse DNS (PTR) lookup on the sending IP, note the returned hostname, then perform a forward A/AAAA lookup on that hostname and confirm the original IP appears in the results. If they match, the IP passes the basic FCrDNS check; if they don’t, update the PTR or forward records so they are consistent. This is the core forward confirmed reverse dns email test workflow teams should use.

Step-by-step commands (replace examples with your IP/host):
- Reverse (PTR) lookup, IPv4: dig -x 203.0.113.45 +short
  Expected: mail.example.com.
- Forward (A) lookup of the PTR name: dig +short mail.example.com
  Expected: 203.0.113.45
- IPv6: dig -x 2001:db8::1 +short then dig AAAA +short mail.example.com
  Expected: 2001:db8::1

You can also use host or nslookup if dig is not available: host 203.0.113.45 should return the PTR; nslookup <ip> will show the name.

Evidence to collect in diagnostics:
- Exact output of the PTR lookup (hostname returned). Save as proof of reverse mapping.
- Exact output of forward A/AAAA lookup for that hostname. Save to show the IP is present.
- SMTP banner/HELO from the MTA to confirm the server presents a hostname consistent with DNS; use telnet <ip> 25 and issue EHLO or use openssl s_client to test STARTTLS ports.

Important practice notes and edge cases:
- Multiple A/AAAA records: If the hostname resolves to multiple IPs, confirm the sending IP is among them; if not, FCrDNS is not satisfied.
- Shared IPs and pools: On shared or cloud-managed IPs, PTRs may be set by the provider. Coordinate changes with the provider and document any provider policies.
- CNAMEs: If the forward record is a CNAME that eventually resolves to an IP, ensure the canonical target resolves to the mailing IP. Avoid relying on CNAME indirection where possible.
- IPv6: Treat v6 separately; some providers evaluate IPv4 and IPv6 paths differently.
- HELO/SMTP identity: Many providers expect the HELO/EHLO hostname to be sensible; while it may not need to exactly match PTR, aligning them avoids heuristic penalties.

Provider-awareness: Major mailbox providers cite reverse DNS/forward consistency as part of sender infrastructure checks. Use FCrDNS as one step in a broader deliverability checklist that includes SPF, DKIM, and other DNS records; see the DNS records for email reference for those records. Do not assume FCrDNS alone determines placement—deliverability depends on multiple signals and provider-specific heuristics [1][2].

When to involve others: If you cannot change PTR because your IPs are assigned by an ISP or cloud provider, open a ticket with the IP owner and provide the exact hostname you need set as PTR. If the forward record is controlled in your zone, update the A/AAAA records to match the PTR.

Assets and next steps: Use the FCrDNS test checklist above for reproducible evidence. After confirming FCrDNS, follow up by verifying SPF/DKIM and provider-specific sender guidance—see the complete guide to email deliverability for broader troubleshooting and the DNS records for email page for record definitions.

## Sources

[1] https://support.google.com/a/answer/81126

[2] https://support.microsoft.com/en-us/outlook/sender-support-in-outlook-com


## Related resources

Continue with [the related RepMail guide](/repmail/learn/glossary/ptr-record), [the related RepMail guide](/repmail/learn/infrastructure/dns-records-for-email), [the related RepMail guide](/repmail/learn/deliverability).


## Related resources

Continue with the [complete guide to email deliverability](/repmail/learn/deliverability/complete-guide-to-email-deliverability), review the [provider-specific triage guide](/repmail/learn/deliverability/provider-specific-deliverability-triage), and use the [sender reputation guide](/repmail/learn/deliverability/sender-reputation) when the workflow crosses into a neighboring concern.
