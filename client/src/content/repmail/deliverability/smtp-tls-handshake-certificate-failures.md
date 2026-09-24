---
product: repmail
academy: deliverability
contentType: guide
slug: smtp-tls-handshake-certificate-failures
title: TLS Handshake and Certificate Failures in SMTP Delivery
description: Practical troubleshooting guide for SMTP TLS handshake and certificate
  failures that block email delivery before SMTP acceptance.
authorSlug: repmail-team
publishedAt: '2026-09-25'
updatedAt: '2026-09-25'
tags:
- SMTP
- TLS
- STARTTLS
- Certificates
- Troubleshooting
- Deliverability
- Infrastructure
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
assets:
- type: table
  title: TLS handshake decision table
  content:
    headers:
    - Symptom / log snippet
    - Likely cause
    - First diagnostic command
    - Immediate fix / next step
    rows:
    - - Connection resets at STARTTLS, no SMTP reply
      - Handshake aborted by client or server (protocol mismatch or policy)
      - openssl s_client -starttls smtp -connect <mx>:25 -servername <mx>
      - Compare negotiated TLS version; update client TLS settings or allow required
        protocols
    - - 'OpenSSL error: certificate verify failed or missing issuer'
      - Incomplete chain or missing intermediate CA
      - openssl s_client -starttls smtp -showcerts -connect <mx>:25
      - Install intermediate(s) on server or import full chain; re-test
    - - 'Hostname mismatch: certificate SANs don''t include MX hostname'
      - Certificate issued for different name (or using load balancer hostname)
      - openssl s_client -starttls smtp -connect <mx>:25 -servername <mx> | openssl
        x509 -noout -text
      - Use certificate matching MX hostname or update DNS/MX to match cert; coordinate
        with provider
    - - Client times out waiting during STARTTLS negotiation
      - Server requires TLS options client can't negotiate, or network middlebox interfering
      - tcpdump or packet capture around TLS handshake; reproduce with s_client
      - Inspect middleboxes, increase client timeout, or align cipher suites
keyTakeaways:
- TLS handshake failures stop transport before SMTP envelope/content is processed
  — treat them as infrastructure faults.
- Diagnose with logs and active tests (openssl s_client or ncat) to separate certificate,
  hostname, protocol, and negotiation problems.
- Certificate chain and hostname mismatches are the most common causes; providers
  expose TLS errors differently, so capture raw TLS/OpenSSL output.
commonMistakes:
- Assuming a failed TLS handshake is the same across providers — error text and behavior
  vary.
- Skipping full chain checks and only inspecting the leaf certificate (missing intermediates
  cause failures).
- Treating STARTTLS negotiation failures as SMTP 4xx/5xx responses — TLS failures
  often prevent any SMTP response code.
faqs:
- question: How does a TLS handshake failure differ from an SMTP 4xx/5xx response?
  answer: A TLS handshake failure happens during the transport negotiation and commonly
    prevents the SMTP server from issuing any SMTP response code; the connection is
    closed or reset at the TLS layer. SMTP 4xx/5xx responses occur after the TLS layer
    (or over an unencrypted session) and are protocol-level replies. For guidance
    on SMTP response handling, see the SMTP 4xx/5xx troubleshooting guide at /repmail/learn/deliverability/smtp-4xx-5xx-email-errors.
- question: Can a certificate with a valid expiration still fail delivery?
  answer: Yes. Even with a valid expiration, failures occur if the certificate chain
    is incomplete, the hostname (MX/FQDN) doesn't match the certificate SANs, or the
    server requires a TLS version/cipher suite the client does not support. Always
    check chain, SANs, and negotiated protocol.
- question: Should I disable STARTTLS to avoid handshake issues?
  answer: 'No. Disabling STARTTLS downgrades or removes encryption and will likely
    be rejected by modern providers or policies. Instead, fix the handshake: validate
    certificates, update client TLS stacks, and ensure MX hostnames match certificate
    SANs. If you''re using a mail-sending service, consult their delivery docs such
    as /repmail/learn/infrastructure/aws-ses-for-cold-email for provider-specific
    notes.'
nextStep:
  label: Complete guide to email deliverability
  href: /repmail/learn/deliverability/smtp-4xx-5xx-email-errors
  description: Broader deliverability context including transport behavior, authentication,
    and error classification.
---

TLS Handshake and Certificate Failures in SMTP Delivery

Direct answer: A TLS handshake or certificate failure during SMTP delivery means the client and server could not complete STARTTLS/TLS negotiation — the transport stops before the receiving system evaluates message content or reputation. Troubleshoot by collecting raw TLS logs, running active TLS tests (openssl s_client or equivalent), verifying the certificate chain and SANs, and comparing negotiated protocol/cipher suites. Provider error text varies, so rely on protocol-layer captures rather than trusting a single vendor message.

What to capture first
- Server and client logs around the connection attempt; request raw TLS/OpenSSL output when possible. Different MTAs and providers log different error text, so save the unparsed TLS errors and timestamps.
- Packet capture (tcpdump) covering the TCP/TLS handshake if you can reproduce the failure.
- Active probes: openssl s_client -starttls smtp -connect <mx>:25 -servername <mx> and openssl s_client -showcerts to inspect the full chain.

Key diagnostic checks (practical steps)
1) Certificate chain: Confirm the server sends the full chain (leaf + intermediates). Missing intermediates often produce a verification failure even when the leaf is valid.
2) Hostname/SANs: Verify the MX hostname your SMTP client connects to matches the certificate Subject Alternative Names. Hostname mismatch commonly arises when fronting/load balancers terminate TLS with a different name.
3) STARTTLS negotiation: Observe whether the server advertises STARTTLS in the EHLO banner and whether the client attempts the STARTTLS command. If STARTTLS is offered but negotiation fails, inspect TLS alerts and client cipher support.
4) Protocol and ciphers: Older clients may not support server-required TLS versions or ciphers. Confirm negotiated TLS version and cipher from s_client output and update client stacks if necessary.
5) Middleboxes and interception: Transparent proxies or mail gateways can intercept TLS and replace certificates; validate with packet captures and check for rewritten certificates.

Edge cases and provider awareness
- Some providers will silently close connections on policy violations (rate, reputation) before or during TLS; the visible symptom is a connection reset, so correlate with provider-specific docs or status pages. Do not assume identical error reporting across providers.
- Managed sending services may terminate TLS at their edge and re-encrypt to recipients; if using a service, consult their integration guide (for example /repmail/learn/infrastructure/aws-ses-for-cold-email) for known TLS considerations.
- RFC context: SMTP is an application protocol riding on the transport; handle TLS negotiation as part of the transport before interpreting SMTP codes per RFC 5321 guidance [2]. Some receiving systems will not reach the SMTP layer if the TLS handshake fails.

Quick troubleshooting checklist
- Capture logs and timestamps from both sides.
- Reproduce with openssl s_client and capture the certificate chain.
- Verify that the MX hostname equals a SAN on the certificate.
- Check for missing intermediate certificates and install if needed.
- Confirm client TLS stack supports the server's TLS version/ciphers.
- Inspect for middleboxes that might rewrite or intercept certificates.

Decision table / quick remedies are included above in the TLS handshake decision table asset. For related SMTP response handling after a successful transport, see the SMTP 4xx/5xx errors guide at /repmail/learn/deliverability/smtp-4xx-5xx-email-errors. For broader deliverability concepts that place TLS failures in context, review the complete deliverability hub at /repmail/learn/deliverability/complete-guide-to-email-deliverability.

## Sources

[1] https://support.google.com/a/answer/81126

[2] https://www.rfc-editor.org/rfc/rfc5321


## Related resources

Continue with [the related RepMail guide](/repmail/learn/deliverability/smtp-4xx-5xx-email-errors), [the related RepMail guide](/repmail/learn/infrastructure/aws-ses-for-cold-email), [the related RepMail guide](/repmail/learn/deliverability).


## Related resources

Continue with the [complete guide to email deliverability](/repmail/learn/deliverability/complete-guide-to-email-deliverability), review the [provider-specific triage guide](/repmail/learn/deliverability/provider-specific-deliverability-triage), and use the [sender reputation guide](/repmail/learn/deliverability/sender-reputation) when the workflow crosses into a neighboring concern.
