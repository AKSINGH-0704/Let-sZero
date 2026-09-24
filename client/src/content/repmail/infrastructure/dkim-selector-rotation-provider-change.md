---
product: repmail
academy: infrastructure
contentType: tutorial
slug: dkim-selector-rotation-provider-change
title: "DKIM Selector Rotation During a Provider Change"
description: "Roll DKIM selectors during an ESP migration with overlap, DNS verification, header checks, retirement, and rollback."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["dkim", "migration", "key-management"]
collections: ["email-infrastructure-decisions", "email-platform-essentials"]
learningPaths: ["email-infrastructure"]

keyTakeaways:
  - "Publish the new selector before switching traffic when the provider permits overlap."
  - "Verify real headers and alignment, not only a DNS key lookup."
  - "Retire the old selector only after its traffic and rollback need are understood."
faqs:
  - question: "Can old and new DKIM selectors coexist?"
    answer: "They can often coexist because each selector is a separate DNS name, but confirm provider behavior, key policy, and the receiving path before using overlap."
  - question: "What header proves the new key is active?"
    answer: "A representative message should show the new selector in `s=`, the expected signing domain in `d=`, and a passing DKIM result in Authentication-Results."
  - question: "When should the old key be removed?"
    answer: "After traffic, queued mail, and rollback requirements are reviewed and no legitimate messages depend on it. Record the evidence and approval."
nextStep:
  label: "Use the email platform migration runbook"
  href: /repmail/learn/email-platform/email-sending-platform-selection
  description: "Continue with the closest operational guide."
assets:
  - type: checklist
    title: DKIM rollover runbook
    content: {"headers": ["Phase", "Evidence"], "rows": [["Plan", "Selector names, TTL, owner, rollback"], ["Overlap", "Both public keys resolve"], ["Switch", "New provider signs representative messages"], ["Verify", "DKIM result, d= alignment, event evidence"], ["Retire", "Old traffic absent and key removal approved"]]}
---

During an email provider change, rotate DKIM selectors as a controlled rollover. A selector points receivers to a public key while the provider signs with the matching private key. Because selectors are separate names, an old and new selector can often coexist during a migration; confirm the provider’s limits and workflow before relying on overlap.

## Plan the overlap

Inventory current selectors, DNS TTL, From domains, DKIM `d=` values, provider accounts, and rollback criteria. Choose a new selector name that will not collide with an active key. Publish the new public key before switching traffic, and record the authoritative answer. The [DKIM guide](/repmail/learn/deliverability/what-is-dkim) explains the basic lookup; this runbook adds the migration sequence.

Keep the old key available while old messages, queues, or rollback traffic may still be signed with it. Do not publish a private key in tickets or logs. If the provider generates keys, document where the provider confirms activation and what status it exposes.

## Switch and verify

Move a controlled stream first. Inspect raw headers for `DKIM-Signature` selector `s=` and signing domain `d=`. Then inspect `Authentication-Results` for `dkim=pass` and verify DMARC alignment between `d=` and the visible From domain. Use [authentication change management](/repmail/learn/deliverability/email-authentication-change-management) to coordinate DNS, provider, and owner approvals.

Verify messages from every important stream, not just one test. Check provider event IDs, timestamps, retries, and complaints in the normal migration runbook when available. A key resolving in DNS proves discoverability; it does not prove the application is signing with it.

## Retire and roll back

After the old selector has no active traffic and the rollback window is closed, remove or disable it through the approved process. Keep the change record and evidence. If signatures fail, revert traffic to the old provider or selector, restore the prior configuration, and preserve the failing headers before trying a second change. Do not prescribe a universal key lifetime; set retirement from observed traffic and your risk policy.

## Related resources

Use the [Email Infrastructure academy](/repmail/learn/infrastructure/email-infrastructure-explained) for provider-change context.

This workflow should be checked against the cited standards and current provider documentation [1].

## References

[1]: https://www.rfc-editor.org/rfc/rfc6376 "RFC 6376: DomainKeys Identified Mail"
[2]: https://knowledge.workspace.google.com/admin/security/set-up-dkim "Google Workspace DKIM setup"
[3]: https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about "Microsoft Defender email authentication"

