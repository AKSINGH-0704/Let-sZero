---
product: repmail
academy: infrastructure
contentType: tutorial
slug: mta-sts-testing-to-enforcement
title: "MTA-STS: Test Mode Before Enforcement"
description: "Deploy MTA-STS with DNS discovery, HTTPS policy hosting, certificate checks, staged testing, and an explicit enforcement rollback."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["mta-sts", "tls", "transport-security"]
collections: ["email-infrastructure-decisions", "email-platform-essentials"]
learningPaths: ["email-infrastructure"]

keyTakeaways:
  - "MTA-STS protects inbound SMTP transport policy; it is separate from SPF, DKIM, and DMARC."
  - "Validate DNS, HTTPS, hostname, and certificate behavior before enforcement."
  - "Use testing as an evidence-gathering phase, not a claim of universal receiver support."
faqs:
  - question: "Does MTA-STS authenticate the sender?"
    answer: "No. It publishes a transport policy for SMTP connections. SPF, DKIM, and DMARC address sender authentication and alignment."
  - question: "Can every receiving server use MTA-STS?"
    answer: "No. Support varies. Test and describe the evidence you have rather than claiming universal enforcement."
  - question: "What should be tested first?"
    answer: "The `_mta-sts` DNS record, policy URL, certificate and hostname, MX coverage, and a controlled message path."
nextStep:
  label: "Review email authentication fundamentals"
  href: /repmail/learn/deliverability/email-authentication
  description: "Continue with the closest operational guide."
assets:
  - type: checklist
    title: MTA-STS deployment checklist
    content: {"headers": ["Control", "Test mode", "Enforce"], "rows": [["_mta-sts TXT record", "[ ]", "[ ]"], ["Policy at /.well-known/mta-sts.txt", "[ ]", "[ ]"], ["HTTPS certificate and hostname", "[ ]", "[ ]"], ["MX hosts covered by policy", "[ ]", "[ ]"], ["Failure evidence and rollback", "[ ]", "[ ]"]]}
---

MTA-STS lets a domain publish a policy for SMTP servers that support the standard. Deploy it as a transport-security change: publish discovery, host the policy over HTTPS, test the complete path, and only then consider enforcement. It does not replace SPF, DKIM, or DMARC authentication.

## Prepare the policy path

Use the standard `_mta-sts` TXT record to advertise a policy ID, and host the policy at `https://mta-sts.example.com/.well-known/mta-sts.txt` with a valid certificate and expected hostname. The policy names the MX hosts and begins in testing mode. Follow [RFC 8461] closely; do not invent fields or assume every receiver implements the standard.

Before publishing, confirm that the MX set is current and that every intended host is covered. Use [DNS records for email](/repmail/learn/infrastructure/dns-records-for-email) to capture the current receive path. Check HTTPS from outside your internal network, certificate renewal, redirects, content type, and availability. A working website on the parent domain does not prove the well-known policy path works.

## Observe before enforcing

Publish testing mode and monitor available failure evidence from supporting senders or reporting mechanisms. Test from independent mail systems where possible. Record which MX hosts are reached, whether TLS is negotiated, and whether policy retrieval or certificate validation fails. Testing mode is not proof of universal receiver support, so state the coverage of your observations.

When the evidence is stable, review the enforcement change with the mail owner and security owner. Define rollback as restoring testing or removing the discovery signal according to your change plan. Keep the policy ID and prior content in the change record. Recheck after certificate, MX, or provider changes.

## Related resources

The [Email Infrastructure academy](/repmail/learn/infrastructure/email-infrastructure-explained) provides the surrounding DNS and transport context.

This workflow should be checked against the cited standards and current provider documentation [1].

## Operational edge cases

Include certificate renewal, multiple MX priorities, regional DNS differences, and a policy host that is unavailable from outside your network. A redirect or certificate that works in a browser may still fail strict policy retrieval. Keep the policy file versioned and assign an owner for every MX hostname so an unrelated receive-path change does not silently invalidate the policy.

## References

[1]: https://www.rfc-editor.org/rfc/rfc8461 "RFC 8461: SMTP MTA Strict Transport Security (MTA-STS)"

