---
contentType: tutorial
slug: read-authentication-results
title: "How to Read Authentication-Results Headers"
description: "A practical method for reading SPF, DKIM, DMARC, and ARC results in a real message header without confusing authentication with placement."
authorSlug: repmail-team
publishedAt: "2026-09-21"
tags: ["authentication", "email-headers", "spf", "dkim", "dmarc"]
keyTakeaways:
  - "Read the receiver-stamped Authentication-Results header, then compare it with From, Return-Path, and DKIM d=."
  - "Pass means a particular check succeeded; it does not mean the message reached the inbox."
  - "Use one test message per sending path because different providers can stamp different identities."
prerequisites:
  - label: "Understand basic email authentication"
    href: "/repmail/learn/deliverability/email-authentication"
assets:
  - type: checklist
    title: "Header-reading checklist"
    content:
      - "Open the original/full headers from the receiving mailbox."
      - "Find the receiver's Authentication-Results header."
      - "Record From, smtp.mailfrom/Return-Path, header.d, and each pass/fail result."
      - "Check DMARC alignment, not only SPF or DKIM authentication."
      - "Compare the result with the SMTP response and placement separately."
nextStep:
  label: "Diagnose provider-specific delivery"
  href: "/repmail/learn/deliverability/provider-specific-deliverability-triage"
  description: "Use the evidence in the header to choose the next diagnostic path."
---

**To read authentication results, open the message's original headers and trace the receiver's `Authentication-Results` line back to three identities: `From`, `smtp.mailfrom`/`Return-Path`, and DKIM `header.d`.** Then separate authentication from delivery and placement. An SPF or DKIM pass tells you that one check succeeded; it does not prove that the message was accepted, placed in the inbox, or read.

This workflow complements the broader [email authentication guide](/repmail/learn/deliverability/email-authentication) by showing what to look for in one real message.

## Find the right header block

In Gmail, open a message, choose “Show original,” and inspect the original headers. In Outlook, open the message properties or internet headers view, depending on the client. Preserve the complete header text when escalating a problem; copying only the visible summary can omit the fields that explain a mismatch.

Look for a receiver-added header named `Authentication-Results`. A receiver should identify the authentication service that produced the result, often in a value such as `mx.google.com` or a Microsoft service. Treat a header inserted by the sending application as less useful than the receiver's result: the receiving system is the party that evaluated the message.

You may also see `Received-SPF`, `DKIM-Signature`, `Return-Path`, and multiple `Received` lines. Those fields are clues, not interchangeable verdicts.

## Parse each result without collapsing them together

A simplified line may look like this:

```text
Authentication-Results: receiver.example;
  spf=pass smtp.mailfrom=bounce.mail.example;
  dkim=pass header.d=example.com;
  dmarc=pass header.from=example.com
```

Read it as three separate statements:

- `spf=pass` means the receiver accepted the SPF evaluation for the envelope identity shown after `smtp.mailfrom`.
- `dkim=pass` means the signature verified for the signing domain shown after `header.d`.
- `dmarc=pass` means at least one authenticated identifier also aligned with the visible From domain.

The exact parameter names vary by receiver. Microsoft may add `compauth` and a reason code as part of its composite authentication assessment. Microsoft documents that composite authentication is only one input in a broader evaluation and that a composite failure does not mechanically equal a block in every case. Do not translate a provider-specific field into a universal rule.

## Check alignment explicitly

Write down the domain in the visible `From:` header. Next, compare it with the SPF domain and DKIM `d=` domain. If SPF passes but `smtp.mailfrom=vendor.example` while `From: person@your.example`, SPF is not necessarily aligned. If DKIM passes with `header.d=vendor.example`, DKIM is not necessarily aligned either. Use the [DMARC alignment explainer](/repmail/learn/deliverability/dmarc-alignment-explained) for the relaxed and strict comparison.

The [Google DMARC setup guidance](https://knowledge.workspace.google.com/admin/security/set-up-dmarc) summarizes the operational rule: DMARC passes when SPF and alignment pass, or DKIM and alignment pass. A pass from one aligned method is enough for DMARC; two unrelated passes are not.

## Understand common patterns

**SPF pass, DKIM pass, DMARC pass.** This is a strong authentication result, but still inspect delivery response, reputation, and placement.

**SPF pass, DKIM pass, DMARC fail.** The methods authenticated different domains from the visible From domain, or the receiver found another alignment issue. Check the envelope sender and DKIM `d=` value before changing policy.

**SPF fail, DKIM pass, DMARC pass.** This can be legitimate when forwarding or a provider's envelope path disrupts SPF but an aligned DKIM signature survives. Verify the DKIM signature and the receiver's DMARC result rather than “fixing” a working path blindly.

**DKIM none, SPF pass, DMARC pass.** SPF may be the aligned method. This is still a reason to document the sending path and consider DKIM for resilience, especially when multiple systems relay or modify messages.

**Authentication-Results missing or contradictory.** Test another mailbox and preserve the SMTP response. Intermediaries can add or rewrite headers; one header alone is not a complete incident record.

## Use headers as evidence, not as a placement shortcut

A delivered message may be in spam even when SPF, DKIM, and DMARC pass. Conversely, a receiver may accept a message and later place it outside the inbox. Use [delivery versus deliverability versus placement](/repmail/learn/deliverability/delivery-vs-deliverability-vs-placement) to name the stage you are testing. For a rejected message, the SMTP reply and any non-delivery report may be more useful than a header you never received.

## Where RepMail fits

For a RepMail test, send the same controlled message through each configured sender and save the full headers. Compare identities and results before changing DNS or campaign content. RepMail can be part of the sending test, but this article does not assume a built-in header parser or provider dashboard integration. The evidence you need is the actual receiver-stamped header.

## Sources

- [RFC 8601: Message Header Field for Authentication-Results](https://www.rfc-editor.org/rfc/rfc8601)
- [Microsoft: Authentication-results message header](https://learn.microsoft.com/en-us/defender-office-365/message-headers-eop-mdo)
- [Microsoft: Email authentication in cloud organizations](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about)
- [Google Workspace: Set up DMARC](https://knowledge.workspace.google.com/admin/security/set-up-dmarc)
