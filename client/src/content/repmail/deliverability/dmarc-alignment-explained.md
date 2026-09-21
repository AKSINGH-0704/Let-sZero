---
contentType: knowledge-base
slug: dmarc-alignment-explained
title: "DMARC Alignment Explained: SPF, DKIM, and From Domains"
description: "Understand relaxed and strict DMARC alignment by tracing the visible From domain, SMTP MAIL FROM, and DKIM d= value."
authorSlug: repmail-team
publishedAt: "2026-09-21"
tags: ["dmarc", "alignment", "spf", "dkim", "authentication"]
keyTakeaways:
  - "DMARC alignment compares the visible From domain with an authenticated SPF or DKIM identifier."
  - "A message passes DMARC when at least one authenticated identifier also aligns; SPF and DKIM do not both have to align."
  - "Relaxed alignment permits related subdomains, while strict alignment requires an exact domain match."
prerequisites:
  - label: "Know the basics of SPF, DKIM, and DMARC"
    href: "/repmail/learn/deliverability/email-authentication"
commonMistakes:
  - "Treating any SPF or DKIM pass as a DMARC pass without checking the domains."
  - "Assuming a provider's envelope sender automatically aligns with the visible From domain."
nextStep:
  label: "Plan a staged DMARC rollout"
  href: "/repmail/learn/deliverability/email-authentication-change-management"
  description: "Use alignment checks before changing policy for real traffic."
assets:
  - type: table
    title: "DMARC alignment worksheet"
    content:
      headers: ["Message identity", "Example value", "Compare with"]
      rows:
        - ["Visible From", "sales@example.com", "SPF domain and DKIM d= domain"]
        - ["SMTP MAIL FROM / Return-Path", "bounce@mail.example.com", "Visible From for SPF alignment"]
        - ["DKIM d=", "example.com", "Visible From for DKIM alignment"]
---

**DMARC alignment is the domain-matching step that turns SPF or DKIM authentication into a DMARC pass.** A message can have SPF pass and still fail DMARC if the authenticated envelope domain is unrelated to the address recipients see. The same is true of a DKIM signature from a third-party domain. To diagnose alignment, compare three identities: the visible `From` domain, the SMTP `MAIL FROM` (usually exposed later as `Return-Path`), and the DKIM `d=` domain.

This is a narrower question than [what DMARC is](/repmail/learn/deliverability/what-is-dmarc). The goal here is to read the domains on one message and decide whether the passing authentication method is also aligned.

## The three domains to put side by side

The visible `From:` header is the address shown in the mail client. In `From: Alex <alex@example.com>`, the domain is `example.com`. DMARC treats that domain as the identity that needs protection.

The SMTP `MAIL FROM` is part of the message envelope. It is used for delivery and bounces and is commonly represented by the `Return-Path` header after delivery. SPF authenticates the sending host against this envelope domain, not directly against the visible `From` header.

DKIM adds a signature to the message. The signature's `d=` tag names the domain that signed it. DKIM authentication asks whether the signature verifies; DKIM alignment asks whether that signing domain is aligned with the visible `From` domain.

Microsoft's explanation of authentication makes the same distinction between the envelope sender and the user-visible sender. That distinction is why a provider can authenticate a message without proving that it is authorized to use the brand shown in `From`.

## Relaxed versus strict alignment

DMARC has a separate alignment mode for SPF and DKIM. Relaxed alignment is the default in the original DMARC specification. It generally treats a parent domain and its subdomain as aligned when they share the same organizational domain. Strict alignment requires the domains to match exactly.

Consider this message:

```text
From: alerts@example.com
MAIL FROM: bounces@mail.example.com
DKIM-Signature: d=example.com
```

SPF can pass and align in relaxed mode because `mail.example.com` and `example.com` are related domains. SPF would not align in strict mode because the strings differ. DKIM is aligned in both modes here because `d=example.com` exactly matches the visible From domain.

Now consider:

```text
From: alerts@example.com
MAIL FROM: bounce.vendor-mail.com
DKIM-Signature: d=vendor-mail.com
```

SPF and DKIM may each authenticate successfully, but neither identifier aligns with `example.com`. DMARC therefore fails its mechanism check. A provider that sends on your behalf needs a configuration that authenticates with an aligned domain, usually through a custom return path, custom DKIM signing domain, or both. The exact setup is provider-specific; do not copy a record intended for another sender.

## The one-of-two rule

DMARC passes when at least one of these combinations succeeds:

1. SPF passes and the SPF-authenticated domain aligns with `From`.
2. DKIM passes and the DKIM signing domain aligns with `From`.

Both do not have to pass alignment. This matters for forwarding and message modification: SPF can be disrupted in transit while a valid DKIM signature remains aligned. It also means that a DKIM pass from an unrelated provider domain is not enough.

The [DMARC RFC](https://www.rfc-editor.org/rfc/rfc7489) describes this as identifier alignment and says receivers evaluate SPF, DKIM, alignment, and then policy. Alignment is not a reputation score and it is not an inbox-placement guarantee. It is a test of whether the authenticated identity is connected to the visible author domain.

## A practical header-reading routine

Take a delivered test message and open its original or full headers. Record the following values in the worksheet above:

- `header.from` or the domain in the visible `From` address.
- `smtp.mailfrom`, `Return-Path`, or the envelope sender shown in `Authentication-Results`.
- `header.d`, the DKIM signing domain.
- The result beside each method: `spf=pass`, `dkim=pass`, or a failure/temporary result.
- The final `dmarc=pass` or `dmarc=fail` result, if the receiver reports it.

Do not infer alignment from a green “authenticated” label in a sending dashboard. Inspect the domains on the actual message and test each sending path separately: mailbox mail, forms, marketing tools, and outbound platforms can use different identities.

## Where RepMail fits

RepMail users can treat alignment as a pre-send infrastructure check, not as a promise about where a message will land. Before adding a new sender, document its visible From domain, bounce domain, and DKIM signing domain, then verify a test message. The existing [sending-domain verification guide](/repmail/learn/deliverability/verify-your-sending-domain) covers the product setup context; this article supplies the receiver-side reasoning. For a controlled change, continue with [email authentication change management](/repmail/learn/deliverability/email-authentication-change-management).

## Sources

- [RFC 7489: DMARC](https://www.rfc-editor.org/rfc/rfc7489)
- [Google Workspace: Set up DMARC](https://knowledge.workspace.google.com/admin/security/set-up-dmarc)
- [Microsoft: Email authentication in cloud organizations](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about)
