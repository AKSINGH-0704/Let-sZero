---
product: repmail
academy: infrastructure
contentType: knowledge-base
slug: ptr-reverse-dns-dedicated-sending-ip
title: "PTR Readiness for Dedicated Sending IPs"
description: "Check reverse DNS ownership, hostname consistency, IPv4/IPv6 behavior, and SMTP evidence before using a dedicated sending IP."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["ptr", "reverse-dns", "dedicated-ip"]
collections: ["email-infrastructure-decisions", "email-platform-essentials"]
learningPaths: ["email-infrastructure"]

keyTakeaways:
  - "The IP owner usually controls PTR, not the domain DNS administrator."
  - "Use a stable hostname and verify forward and reverse answers."
  - "Receiver policies vary; readiness is not a guarantee of acceptance."
faqs:
  - question: "Who controls a PTR record?"
    answer: "Usually the organization or provider that owns the IP address. The domain DNS owner may not be able to change it."
  - question: "Is forward-confirmed reverse DNS enough for delivery?"
    answer: "No. It is one readiness signal. Authentication, reputation, message content, receiver policy, and other evidence also affect outcomes."
  - question: "Do IPv4 and IPv6 need separate checks?"
    answer: "Yes. They can use different addresses and reverse records, and an IPv6 path can fail even when IPv4 is correct."
nextStep:
  label: "Compare shared and dedicated IPs"
  href: /repmail/learn/infrastructure/shared-vs-dedicated-ip
  description: "Continue with the closest operational guide."
assets:
  - type: checklist
    title: PTR readiness checklist
    content: {"headers": ["Check", "Evidence"], "rows": [["IP ownership and PTR authority", "Provider confirmation"], ["PTR hostname published", "Reverse lookup result"], ["A record or AAAA record", "Forward lookup result"], ["IPv4 and IPv6 paths", "SMTP and DNS tests"], ["HELO/EHLO consistency", "Captured SMTP evidence"]]}
---

PTR, or reverse DNS, maps a sending IP address to a hostname. For a dedicated sending IP, confirm who controls the PTR, what hostname will be used, and whether the sending system identifies itself consistently. This is a readiness check, not a promise that any receiver will accept your mail.

## Establish ownership

The IP provider or cloud host commonly controls the reverse zone. Ask for the exact process, approval, and expected evidence rather than editing your normal domain DNS. Record the IP, intended PTR hostname, region or provider, and whether IPv4 and IPv6 are both active. The [shared-versus-dedicated IP guide](/repmail/learn/infrastructure/shared-vs-dedicated-ip) explains why the address choice is an operating decision.

## Verify forward and reverse answers

After PTR is published, query the reverse name and confirm it returns the intended hostname. Then query that hostname and confirm the expected A or AAAA address. Forward-confirmed naming helps avoid an obvious mismatch, but it does not constitute a universal receiver requirement. Use [DNS records for email](/repmail/learn/infrastructure/dns-records-for-email) to document the lookup evidence.

Check the actual SMTP path. Capture the EHLO or HELO hostname, TLS and response evidence, source IP, and provider event. Confirm the sending service uses the same intended identity and does not unexpectedly route through another address. Test IPv6 separately if it is enabled; a correct IPv4 PTR does not repair an IPv6 path.

## Decide before launch

If the provider cannot set or document PTR, treat that as an infrastructure constraint. Do not compensate by changing unrelated SPF or DKIM records. Receiver policies vary, and [email infrastructure fundamentals](/repmail/learn/infrastructure/email-infrastructure-explained) should be reviewed alongside reputation, authentication, and monitoring. Record the owner, verification date, and rollback or disable path.

## Related resources

Use the [Email Infrastructure academy](/repmail/learn/infrastructure/email-infrastructure-explained) for IP and DNS decisions.

This workflow should be checked against the cited standards and current provider documentation [1].

## Validate PTR as a dependency chain

A provider hostname is not sufficient. The IP needs PTR, that hostname must resolve forward to the intended IP, and HELO/EHLO must be deliberate. Record provider ticket, IP, PTR, A/AAAA answer, HELO, timestamp, and resolver. Shared or IPv6 infrastructure may have different controls.

| Check | Evidence | Stop rule |
| --- | --- | --- |
| PTR | IP, hostname, resolver, timestamp | Stop when missing or unexpectedly shared |
| Forward DNS | A/AAAA and TTL | Stop when it points elsewhere |
| HELO | transcript or provider setting | Qualify undocumented mismatch |
| TLS | name, issuer, expiry, handshake | Stop on endpoint mismatch |
| Auth | SPF/DKIM/DMARC evidence | Stop ramp when alignment is unverified |
| Reputation | cohort, feedback, start date | Pause on unexplained rejection/complaints |

Use [RFC 1912](https://www.rfc-editor.org/rfc/rfc1912) and the [Google sender guidelines](https://support.google.com/mail/answer/81126). They describe checks, not placement guarantees. Query multiple resolvers after TTL expiry. Do not proceed if PTR control is unclear or HELO changes between retries; branch into authentication, rate, content, and reputation evidence instead of repeatedly changing PTR.

## References

[1]: https://support.google.com/mail/answer/81126?hl=en-GB "Google Workspace sender guidelines"
[2]: https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about "Microsoft Defender email authentication"
[3]: https://www.rfc-editor.org/rfc/rfc5321 "RFC 5321: Simple Mail Transfer Protocol"

