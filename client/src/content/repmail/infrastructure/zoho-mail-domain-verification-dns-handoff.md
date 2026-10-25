---
product: repmail
academy: infrastructure
contentType: tutorial
slug: zoho-mail-domain-verification-dns-handoff
title: 'Zoho Mail Domain Verification: DNS Handoff'
description: 'Give your IT team a clear Zoho Mail DNS handoff: which verification
  method to use, what to copy, how to confirm it, and what to check afterward.'
authorSlug: repmail-team
publishedAt: '2026-10-25'
updatedAt: '2026-10-25'
tags:
- Zoho Mail
- DNS
- domain verification
- email infrastructure
- IT handoff
collections:
- email-infrastructure-decisions
learningPaths:
- email-infrastructure
keyTakeaways:
- Copy verification values from the current Zoho Admin Console; do not rely on example
  records.
- A complete handoff identifies the domain, method, record type, host/name, and value/target.
- Retry verification in Zoho after IT confirms publication, and investigate the authoritative
  DNS zone if it fails.
- Domain ownership verification, mail setup, and custom sending-domain setup are separate
  tasks.
commonMistakes:
- Sending IT only a vague request to “add Zoho DNS.”
- Changing or deleting unrelated DNS records while publishing an ownership-verification
  record.
- Assuming an immediate failed verification proves the record is wrong.
- Treating Zoho verification as completion of SMTP or another service’s custom sending-domain
  setup.
faqs:
- question: Which verification method should I choose?
  answer: Use a method Zoho offers for your domain and your DNS or web team can complete.
    Copy its current instructions directly from the Admin Console.
- question: How long should I wait before retrying?
  answer: Do not assume one fixed wait time. Retry after IT confirms publication;
    if verification still fails, ask the DNS owner to check the record and authoritative
    zone.
- question: Does domain verification finish Zoho Mail setup?
  answer: No. It verifies domain ownership. Follow Zoho’s separate mail-service setup
    instructions, including SMTP details where applicable.
- question: Can I reuse the Zoho verification record for RepMail?
  answer: No. RepMail custom sending-domain setup uses its own DNS records. Keep each
    service’s instructions separate.
nextStep:
  label: Review CNAME and DKIM verification
  href: /repmail/learn/infrastructure/cname-flattening-dkim-verification
  description: Use this guide to understand DNS record handling for CNAME and DKIM
    verification.
assets:
- type: checklist
  title: Zoho DNS handoff checklist
  content:
  - Confirm the exact domain and method shown in Zoho.
  - Copy record type, host/name, and value/target exactly.
  - Identify the owner of the authoritative DNS zone.
---

If you do not control DNS, ask your IT team to publish the exact verification record or complete the verification method shown in Zoho Mail’s Admin Console. Send them the domain, record type, host/name, value or destination, and any timing or ownership details shown there. After the change, return to Zoho and run its verification step; DNS edits alone do not complete the handoff.

## 1. Confirm the domain and verification method

In Zoho Mail’s Admin Console, open the domain-verification flow for the domain you are adding. Zoho documents several ways to verify domain ownership, including adding a TXT or CNAME record, uploading an HTML file, and using Domain Connect where available. The options and record details presented for your account are the source of truth for the handoff. [1]

Before forwarding instructions, confirm the domain spelling and decide who will make the DNS change. If your organization uses a DNS provider managed by another team or vendor, identify that owner first. Do not copy a record from an example, another domain, or an old setup: use the exact values Zoho currently displays for your domain.

If Zoho offers Domain Connect and your DNS provider supports the presented flow, it may reduce manual record entry. Otherwise, choose a method your IT team can carry out and that Zoho offers for the domain. Avoid asking for multiple verification methods “just in case”; start with one and follow Zoho’s status after the change.

## 2. Send a complete DNS handoff

A useful request is more than “please add Zoho records.” Include the following in one ticket or message:

- The domain being verified, including whether it is the root domain or a subdomain.
- The selected verification method and record type, such as TXT or CNAME.
- The exact host/name and value/target shown in Zoho.
- Any TTL instruction displayed by your DNS provider or internal process. Do not invent a TTL if none is specified.
- The Zoho Admin Console screen or the text of the instruction, shared through your normal approved channel.
- The person who will tell you when the change is published, so you can retry verification.

Ask IT to add the verification record without changing unrelated DNS entries. If a record with the same name already exists, ask the DNS owner to review it rather than overwriting it blindly. DNS interfaces label fields differently, so the handoff should preserve Zoho’s host and value exactly while letting IT map them to the provider’s fields.

### A short handoff example

> Please publish the Zoho domain-verification record for **example.com**. Method: **TXT**. Host/name: **[copy from Zoho]**. Value: **[copy from Zoho]**. Please confirm when it is saved and tell me if the DNS console reports a conflicting record. I will run verification in Zoho after you confirm.

Replace every bracketed item with the current Admin Console value. Do not send this example as if its placeholder text were a real DNS record.

## 3. Verify in Zoho and allow for DNS updates

Once IT confirms the change, return to the domain-verification page and use Zoho’s verification action for the method you selected. If verification does not pass immediately, check the record with the DNS owner: confirm the name and value were entered in the intended zone, and check for a typo, missing suffix, or conflicting record. Provider interfaces can append the domain name to a host field automatically, so compare the published result with the intended record rather than assuming the interface’s display is literal.

DNS changes can take time to become visible. Zoho’s verification page is the place to retry and review the current status; do not treat an immediate failed attempt as proof that the handoff was done incorrectly. If the record appears correct but verification continues to fail, send IT the exact failure status and ask them to confirm the authoritative zone and published record. Zoho’s documented verification instructions cover the available ownership-verification methods. [1]

Keep the verification record until Zoho confirms ownership unless Zoho’s current instructions say otherwise. Do not remove records used for mail routing, authentication, or another service as part of a domain-verification cleanup. If a temporary verification record is no longer needed, confirm with Zoho and the DNS owner before removing it.

## 4. Separate ownership verification from mail setup

Verifying that you control a domain is not the same task as completing the mail configuration. Once ownership is verified, follow the setup steps Zoho presents for the mail service you intend to use. Zoho’s SMTP documentation covers its SMTP settings; use the current settings shown in Zoho rather than reusing values from an unrelated mailbox or provider. [2]

Keep the DNS request scoped to the task. Your IT team may receive separate instructions for mail delivery and authentication, so do not assume the verification record configures every part of mail service. For a wider DNS checklist involving authentication records, see [CNAME flattening and DKIM verification](/repmail/learn/infrastructure/cname-flattening-dkim-verification). If you are preparing a custom sending domain for outreach, review [SaaS custom-from and DMARC alignment](/repmail/learn/deliverability/saas-custom-from-dmarc-alignment) as a separate consideration.

## Where RepMail fits

Zoho Mail domain verification establishes domain ownership in Zoho; it does not verify a domain inside RepMail. RepMail by LetsZero uses a verified custom sending domain or subdomain for campaign sending through AWS SES SMTP. Its domain setup uses SES Easy DKIM and three CNAME records, which are separate instructions from Zoho’s verification flow. Do not copy Zoho’s ownership record into RepMail or assume that verifying a domain in one service verifies it in another.

If your goal is to send campaigns from a custom domain through RepMail, follow the DNS records generated for that RepMail domain setup and have the DNS owner publish those records. For agency teams that need to transfer DNS and sending ownership cleanly, see [agency cold-email client offboarding](/repmail/learn/outreach/agency-cold-email-client-offboarding). Keep the verification handoff, mail-provider setup, and sending-domain setup as distinct work items.

## Handoff checklist

Use this checklist before closing the DNS ticket:

1. Confirm the exact domain and Zoho verification method.
2. Copy the current record type, host/name, and value/target from Zoho.
3. Send the request to the owner of the authoritative DNS zone.
4. Ask for confirmation and any conflict or validation message.
5. Retry verification in Zoho after the DNS change.
6. Keep unrelated mail and authentication records intact.
7. Track any remaining mail-service setup separately from ownership verification.

A community setup discussion also illustrates that mail, IMAP, SMTP, and domain setup can involve separate questions. Treat forum reports as individual experiences, not as authoritative setup instructions; use Zoho’s current Admin Console and documentation for your configuration. [3]

## Common questions

### Which verification method should I choose?

Use a method Zoho offers for your domain and your DNS or web team can complete. If you are unsure, ask IT which option they can support, then copy the matching instructions directly from Zoho.

### How long should I wait before retrying?

There is no single wait time to assume for every DNS provider and change. Retry through Zoho after IT confirms publication. If it still fails, have the DNS owner check the published record and the zone where it was added.

### Does domain verification finish Zoho Mail setup?

Not by itself. Verification confirms domain ownership. Follow Zoho’s additional mail setup instructions for the service and configuration you need, including the relevant SMTP details where applicable. [1][2]

### Can I reuse the Zoho verification record for RepMail?

No. RepMail’s custom sending-domain setup has its own records. Use the records provided for the specific service and keep each service’s DNS instructions separate.

## Sources

[1]: https://www.zoho.com/mail/help/zoho-smtp.html
[2]: https://www.reddit.com/r/Zoho/comments/1u4gpw6/difficulties_with_setting_up_zoho_mail/
[3]: https://www.zoho.com/mail/help/adminconsole/domain-verification.html
