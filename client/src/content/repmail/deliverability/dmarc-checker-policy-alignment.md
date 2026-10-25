---
product: repmail
academy: deliverability
contentType: tutorial
slug: dmarc-checker-policy-alignment
title: 'DMARC Checker: Read Policy, Alignment, and Reports'
description: Use a DMARC checker to verify policy, alignment, and reporting evidence
  before enforcement—without confusing a technical result with sender reputation.
authorSlug: repmail-team
publishedAt: '2026-10-25'
updatedAt: '2026-10-25'
tags:
- DMARC
- deliverability
- email authentication
- DNS
- diagnostics
collections:
- deliverability-diagnostics
learningPaths:
- provider-deliverability-diagnostics
keyTakeaways:
- A DMARC checker validates published policy and surfaces authentication evidence;
  it is not a reputation or inbox-placement score.
- Review SPF and DKIM alignment with the visible From domain, not just whether SPF
  or DKIM passes.
- Use `p=none`, `quarantine`, and `reject` as stages informed by sender inventory
  and reporting evidence.
- Aggregate reports help identify legitimate and unrecognized sources, but they should
  be interpreted as observed evidence rather than a complete traffic record.
commonMistakes:
- Treating a checker score as a reputation or inbox-placement score.
- Confusing SPF or DKIM authentication with DMARC alignment.
- Moving directly to `p=reject` without accounting for every legitimate sender.
- Assuming `rua` proves reports are being received and reviewed.
- Checking only the DNS record and ignoring aggregate-report evidence.
faqs:
- question: Does `p=none` mean DMARC is broken?
  answer: No. `p=none` is a monitoring policy and can be intentional while you discover
    senders and resolve alignment issues.
- question: Does SPF pass mean DMARC passes?
  answer: No. SPF must authenticate an identity aligned with the visible From domain
    for SPF to contribute to a DMARC pass. DKIM may provide the aligned passing path
    instead.
- question: Can a DMARC checker prove inbox placement?
  answer: No. It can inspect DNS and authentication-related evidence, but it cannot
    establish a recipient’s final placement decision or overall domain reputation.
- question: When should I use `reject`?
  answer: Use your sender inventory and aggregate reports first. Consider stronger
    enforcement only when legitimate traffic and alignment failures are understood.
nextStep:
  label: Learn how DMARC alignment works
  href: /repmail/learn/deliverability/dmarc-alignment-explained
  description: Review the relationship between SPF, DKIM, and the visible From domain
    before changing enforcement.
assets:
- type: checklist
  title: DMARC checker enforcement-readiness checklist
  content:
  - Confirm the `_dmarc` record is present and parses correctly.
  - Document the current policy and reporting destination.
  - List every legitimate sending service.
  - Review SPF authentication and alignment separately.
  - Review DKIM authentication and alignment separately.
  - Investigate unexplained report sources.
  - Choose a monitored policy change only after the evidence is understood.
---

A DMARC checker helps you inspect the published policy for a domain and identify whether the record is usable. The useful output is not a single score. Read the policy mode, alignment settings, reporting destination, and evidence from real messages together.

A checker can confirm what is published in DNS. It cannot, by itself, prove that every legitimate sender passes authentication, that recipients will accept every message, or that a domain has a strong sending reputation.

## Start with the DMARC record

DMARC is published as a DNS TXT record at `_dmarc.example.com`. If you are new to the syntax, begin with [what DMARC is](/repmail/learn/deliverability/what-is-dmarc).

Paste the domain into a reputable DMARC lookup or domain-checking service, then review the complete record rather than stopping at a green status. Common tags include:

| Item | What to interpret |
|---|---|
| `p=none` | Monitoring mode. Receivers are asked not to apply a DMARC enforcement action based on the domain’s policy. |
| `p=quarantine` | A receiver is asked to treat failing mail as suspicious, subject to that receiver’s handling. |
| `p=reject` | A receiver is asked to reject failing mail, subject to that receiver’s handling. |
| `rua` | An aggregate-reporting destination, when present and accepted by the reporting provider. |
| `adkim` | Alignment mode for DKIM: relaxed by default unless configured otherwise, or strict when set to `s`. |
| `aspf` | Alignment mode for SPF: relaxed by default unless configured otherwise, or strict when set to `s`. |

The policy is a decision point, not a reputation rating. A checker’s pass or warning can tell you about record syntax and observable authentication conditions; it does not turn into a deliverability guarantee.

## Check alignment, not only authentication

DMARC alignment asks whether the domain authenticated by SPF or DKIM is aligned with the domain visible in the message’s `From` address. A message can pass SPF while failing DMARC alignment if the authenticated envelope-from domain is unrelated to the visible From domain. The same principle applies to DKIM’s signing domain.

Review both authentication paths:

1. Identify the domain in the visible `From` header.
2. Check the SPF-authenticated domain and whether it aligns with From.
3. Check the DKIM signing domain, shown as the `d=` value, and whether it aligns with From.
4. Confirm whether alignment is relaxed or strict.
5. Check whether at least one aligned path passes DMARC.

For a fuller explanation of the domain relationships, see [DMARC alignment explained](/repmail/learn/deliverability/dmarc-alignment-explained). For message-level results, compare the checker with [how to read authentication results](/repmail/learn/deliverability/read-authentication-results).

A common diagnostic mistake is to see “SPF pass” or “DKIM pass” and assume DMARC passes too. Those are related but separate results. Alignment is the link between authentication and the domain claiming responsibility for the message.

## Interpret `p=none`, `quarantine`, and `reject`

Treat policy as an enforcement progression, not a score ladder:

- **`p=none`:** collect evidence while you discover legitimate senders and investigate failures.
- **`p=quarantine`:** request additional handling for messages that fail DMARC after your evidence supports a stronger policy.
- **`p=reject`:** request rejection for messages that fail DMARC after legitimate traffic has been accounted for.

A policy change should follow evidence. Before moving from monitoring to enforcement, inventory newsletters, transactional systems, support platforms, CRM tools, recruiting systems, and any other service that sends as your domain.

The [DMARC policy discovery outcomes](/repmail/learn/deliverability/dmarc-alignment-explained) guide can help organize that review. It is especially useful when a checker finds a valid record but reporting evidence is incomplete.

## Use reporting evidence carefully

The `rua` tag indicates where aggregate reports are intended to go. Reports can help you identify sources sending mail with your domain and compare authentication outcomes over time. They are evidence about observed traffic, not a complete statement about every message a recipient may see.

When reading reports, look for:

- sending sources you recognize and sources you do not;
- SPF and DKIM results for each source;
- the authenticated domains and alignment outcome;
- sudden changes after editing DNS or a sender configuration;
- traffic that appears to use your domain without authorization.

A checker may identify that `rua` is absent, malformed, or present. That is useful, but it does not replace reviewing reports from the reporting destination. Also confirm that the destination is able to receive reports and that the address is appropriate for your operating process.

## A compact decision procedure

Use this sequence before changing policy:

1. **Record:** Is there exactly one intended DMARC record at the domain’s `_dmarc` name?
2. **Syntax:** Does the checker parse the tags and values without errors?
3. **Coverage:** Are all legitimate sending services represented in your inventory?
4. **Alignment:** Does each important sender have an aligned SPF or DKIM path?
5. **Evidence:** Do aggregate reports support your inventory, or are there unexplained sources and failures?
6. **Change:** If evidence is incomplete, continue monitoring. If evidence is understood, consider a stronger policy and observe the result.

### Worked example

Suppose a domain has `p=none`, an `rua` destination, and a checker reports SPF pass for a third-party sender. The next question is not “Can I move to reject?” Check the sender’s envelope-from domain and DKIM `d=` domain. If DKIM passes with an aligned domain, the message may satisfy DMARC even if SPF is not aligned. If neither path aligns, investigate the sender before enforcement. The checker result is the starting point; the policy decision depends on the traffic evidence.

## Where RepMail fits

RepMail by LetsZero provides SPF and DMARC guidance for custom sending domains; the customer remains responsible for DMARC on that domain. Use a checker and your reporting evidence to validate the domain configuration independently of the sending application.

If RepMail is one of several systems sending from your domain, include it in the same inventory as every other sender. Confirm which visible From domain, SPF identity, and DKIM signing domain are used, then assess alignment. Do not treat an application’s successful configuration as proof that unrelated senders are aligned.

## DMARC checker checklist

Before changing enforcement, save the checker output and complete the checklist below. Recheck after DNS or sender changes, allowing for DNS and reporting observation time.

- [ ] The `_dmarc` record is present and parses correctly.
- [ ] The current policy is documented: `none`, `quarantine`, or `reject`.
- [ ] `rua` is recorded, if aggregate reporting is configured.
- [ ] Every legitimate sending service is listed.
- [ ] SPF authentication and SPF alignment are reviewed separately.
- [ ] DKIM authentication and DKIM alignment are reviewed separately.
- [ ] Unrecognized sources in reports have an owner and investigation status.
- [ ] The next policy change has a rollback or monitoring plan.

## Common mistakes

- Treating a checker score as a reputation or inbox-placement score.
- Confusing SPF or DKIM authentication with DMARC alignment.
- Moving directly to `p=reject` without accounting for every legitimate sender.
- Assuming `rua` proves reports are being received and reviewed.
- Checking only the DNS record and ignoring aggregate-report evidence.

## FAQs

### Does `p=none` mean DMARC is broken?

No. `p=none` is a monitoring policy. It does not request quarantine or rejection, but it can be an intentional stage while you discover senders and resolve alignment issues.

### Does SPF pass mean DMARC passes?

No. SPF must authenticate an identity that aligns with the visible From domain for SPF to contribute to a DMARC pass. DKIM can provide the aligned passing path instead.

### Can a DMARC checker prove inbox placement?

No. It can help inspect DNS and authentication-related evidence. It cannot establish a recipient’s final placement decision or a domain’s overall reputation.

### When should I use `reject`?

Use evidence from your sender inventory and aggregate reports first. Move toward stronger enforcement only when legitimate traffic and alignment failures are understood.

## Sources

[1]: https://dmarcian.com/domain-checker/
[2]: https://www.reddit.com/r/DMARC/comments/1rx5i8d/forgot_to_readd_dmarc_record_when_changing_email/
[3]: https://www.reddit.com/r/sysadmin/comments/1owr5qz/whats_the_tool_where_you_send_it_an_email_and_it/
[4]: https://redsift.com/tools/investigate
