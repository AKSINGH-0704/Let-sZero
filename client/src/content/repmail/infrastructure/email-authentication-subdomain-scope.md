---
product: repmail
academy: infrastructure
contentType: guide
slug: email-authentication-subdomain-scope
title: "Email Authentication for Subdomains: Scope"
description: "Map SPF, DKIM, and DMARC behavior across sending subdomains without assuming policy inheritance or automatic alignment."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["subdomains", "spf", "dkim", "dmarc"]
collections: ["email-infrastructure-decisions", "email-platform-essentials"]
learningPaths: ["email-infrastructure"]

keyTakeaways:
  - "Treat each sending subdomain as an explicit identity in your inventory."
  - "SPF, DKIM, and DMARC answer different scope questions."
  - "Use a domain matrix and real headers before changing policy."
faqs:
  - question: "Does a parent SPF record automatically cover a subdomain?"
    answer: "Do not assume it. Evaluate the actual SMTP identity and published records for the sending domain."
  - question: "Can DKIM use a subdomain while From uses the parent domain?"
    answer: "It can, but DMARC alignment depends on the configured alignment mode and domain relationship. Verify the real `d=` and From values."
  - question: "What is the safest way to change subdomain policy?"
    answer: "Inventory senders, capture current DNS and headers, publish one controlled change, monitor reports, and keep a rollback record."
nextStep:
  label: "Read the DNS records for email"
  href: /repmail/learn/infrastructure/dns-records-for-email
  description: "Continue with the closest operational guide."
assets:
  - type: table
    title: Authentication scope matrix
    content:
      headers: ["Identity", "What to record", "Verification"]
      rows:
        - ["Visible From subdomain", "From value and DMARC policy path", "Header and DNS"]
        - ["SMTP MAIL FROM", "Envelope domain and SPF record", "Authentication-Results"]
        - ["DKIM signing domain", "d= and selector", "Signature and public key"]
        - ["DMARC policy", "_dmarc record and sp setting", "Authoritative lookup"]
        - ["Business owner", "Purpose and system", "Owner confirmation"]

---

Authentication for a subdomain starts with a map, not a copied record. Record the visible From domain, SMTP MAIL FROM domain, DKIM signing domain and selector, and DMARC policy path for each sending stream. Then verify the relationship in real headers.

## Map the boundaries

List `example.com`, each sending subdomain, and any separate envelope or tracking domain. Use [DNS records for email](/repmail/learn/infrastructure/dns-records-for-email) to capture authoritative SPF, DKIM, and DMARC answers. SPF is evaluated for the SMTP identity; DKIM validates the signing domain in `d=`; DMARC evaluates alignment with the visible From domain. These are related but not interchangeable.

Create a matrix for each stream. Note whether the From domain is the organizational domain or a subdomain, whether a DMARC record is published at the subdomain or inherited according to policy rules, and whether an `sp=` setting applies. Verify the provider’s actual signing and envelope behavior; do not infer it from a setup screen.

## Test alignment

Send a controlled message through every stream. Inspect From, Return-Path or MAIL FROM, DKIM `d=`, selector, and Authentication-Results. Use [DMARC alignment guidance](/repmail/learn/deliverability/dmarc-alignment-explained) to separate an SPF or DKIM pass from alignment with From. Test relaxed and strict expectations only when your policy requires that distinction.

## Change one boundary at a time

Before publishing or tightening policy, inventory legitimate senders and define rollback. A subdomain can be useful for isolation, but it is not automatically safe: unknown systems may still send, and a policy change can affect a different stream than expected. Recheck DNS from authoritative and recursive resolvers, then review real headers and aggregate reporting.

## Related resources

Use the [Email Infrastructure academy](/repmail/learn/infrastructure/email-infrastructure-explained) for domain-boundary decisions.

This workflow should be checked against the cited standards and current provider documentation [1].

## Common scope mistakes

A frequent error is changing the parent-domain record while the active sender uses a subdomain, or validating a DKIM key that belongs to a provider no longer used by the stream. Another is treating a passing SPF result as proof that the visible From domain is aligned. Keep the matrix tied to actual headers and provider configuration, and have the domain owner approve changes that affect more than one business stream.

## References

[1]: https://knowledge.workspace.google.com/admin/security/set-up-spf "Google Workspace SPF setup"
[2]: https://knowledge.workspace.google.com/admin/security/set-up-dmarc "Google Workspace DMARC setup"
[3]: https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about "Microsoft Defender email authentication"

