---
product: repmail
academy: infrastructure
contentType: tutorial
slug: repmail-verify-custom-sending-domain
title: How to Verify a RepMail Sending Domain
description: Add a sending domain in RepMail, publish its three DKIM CNAME records,
  wait for verification, then select it and confirm sender readiness.
authorSlug: repmail-team
publishedAt: '2026-10-25'
updatedAt: '2026-10-25'
tags:
- sending domain
- domain verification
- DKIM
- DNS
- email infrastructure
collections:
- email-infrastructure-decisions
learningPaths:
- email-infrastructure
keyTakeaways:
- Add the exact sending domain or subdomain you intend to use.
- Publish all three RepMail-provided DKIM CNAME records without changing their values.
- Wait for RepMail to report SES and DKIM verification before using the domain.
- After verification, select the domain and configure a custom From address for the
  sender.
- DKIM verification does not complete SPF or DMARC configuration.
commonMistakes:
- Adding the parent domain when the intended setup is a subdomain, or vice versa.
- Publishing fewer than three CNAME records or mistyping a target.
- Assuming a pending status means the domain is ready to send.
- Confusing domain verification with creating a mailbox or completing SPF and DMARC
  setup.
faqs:
- question: Do I need a new mailbox to verify a sending domain?
  answer: Domain verification and mailbox creation are separate tasks. This setup
    verifies a sending domain; it does not create an email-provider mailbox. Configure
    the sender profile and From address required for your sending workflow.
- question: How many DNS records does RepMail require for DKIM verification?
  answer: RepMail uses three CNAME records for SES Easy DKIM. Publish all three values
    provided for the domain.
- question: How long does domain verification take?
  answer: The verification window defaults to 14 days and is configurable. It is not
    a fixed completion-time estimate; DNS recognition and verification status may
    take time to update.
- question: Does DKIM verification configure SPF and DMARC too?
  answer: No. The DKIM setup uses CNAME records. RepMail provides SPF and DMARC guidance,
    and your organization is responsible for its custom-domain DMARC configuration.
nextStep:
  label: Verify your sending domain
  href: /repmail/learn/deliverability/verify-your-sending-domain
  description: Use the broader verification guide to check domain setup and troubleshoot
    DNS records.
assets:
- type: checklist
  title: RepMail sending-domain readiness checklist
  content:
  - Add the exact domain or subdomain in RepMail. — The listed name matches the intended
    sending identity.
  - Publish all three DKIM CNAME records. — Each record name and target matches the
    values RepMail provided.
  - Wait for SES and DKIM verification. — RepMail reports the domain as verified.
  - Select the verified domain for a sender. — The sender profile uses that domain
    and has a custom From address.
  - Review SPF and DMARC responsibilities. — You have considered RepMail's guidance
    and your organization's DNS responsibilities.
---

To verify a sending domain in RepMail by LetsZero, add the domain in RepMail, publish the three CNAME records it provides in your DNS, and wait for SES and DKIM verification to complete. Then select the verified domain for your sender and confirm that the sender is ready before creating a campaign.

## Before you start

Choose the domain or subdomain you intend to use as your sending identity. For example, you might use a dedicated subdomain rather than your main website domain. You need access to the DNS settings for that exact name, either directly or through the person who manages your DNS.

RepMail uses AWS SES Easy DKIM for domain verification. The setup produces three CNAME records. These records prove control of the domain and enable DKIM signing; they are not interchangeable with SPF or DMARC records.

Keep the domain spelling consistent. If you add `mail.example.com` in RepMail, the records must be published for that subdomain, not for `example.com` by mistake. DNS provider forms vary, so check whether the provider expects the full hostname or automatically appends the zone name.

## Add the domain and publish its records

1. **Add the sending domain in RepMail.** Open the sending-domain setup and submit the domain or subdomain you plan to use.
2. **Copy all three CNAME records.** RepMail provides the DKIM record names and their corresponding values. Copy each pair exactly, including any trailing dots if your DNS provider displays them.
3. **Create the records at your DNS provider.** Add each as a CNAME. Do not edit or shorten the target value. If a record already exists with the same name, investigate before replacing it.
4. **Allow time for DNS changes to be recognized.** DNS updates do not necessarily appear instantly. Check the records in your provider’s control panel and give the verification process time to update.
5. **Return to RepMail and check the domain status.** Verification depends on both SES verification and DKIM success. Wait until RepMail reports the domain as verified before using it.

RepMail’s verification window defaults to 14 days and is configurable. Treat that as a setup window, not a promise that DNS or provider checks will finish within a particular number of hours. If the window expires before verification, follow the status and available setup guidance in RepMail rather than assuming the domain is ready.

For a broader DNS troubleshooting checklist, see [Verify your sending domain](/repmail/learn/deliverability/verify-your-sending-domain). This article focuses on the RepMail workflow; the linked guide covers verification checks more generally.

## Diagnose a pending or failed verification

If the domain remains pending, work through the records one at a time:

- Compare each CNAME **name** and **target** in RepMail with the record at your DNS provider.
- Look for typos, missing characters, an incorrect record type, or an extra domain suffix added by the provider.
- Confirm you edited the DNS zone for the exact domain or subdomain added in RepMail.
- Check whether duplicate or conflicting records exist for the same name.
- Give DNS changes time to propagate, then recheck the status in RepMail.

If the records appear correct but verification does not complete, avoid repeatedly deleting and recreating them without identifying a specific mismatch. Record the domain, the three configured CNAME names, and the status shown in RepMail, then ask your DNS administrator or support contact to review the setup.

A useful decision rule is: **if any record differs, correct that record first; if all three match, wait and recheck; if the verification window is close to expiring or the status stays unchanged, escalate with the record details.**

## Select the verified domain and validate the sender

Verification is not the final sender setup step. After RepMail reports the domain as verified, select it for the sender profile and confirm that the sender is ready. Check that the sender’s From address uses the verified domain or subdomain you intended to use. The domain and the mailbox address are related, but verifying a domain is not the same as creating a mailbox with an email provider.

Before sending, confirm that the sender profile is authorized and that the custom From address is set. RepMail’s sending path requires a verified custom sending domain and a configured custom From address. If either is missing, resolve that setup issue before launching a campaign.

RepMail provides SPF and DMARC guidance, but your organization remains responsible for its custom-domain DMARC configuration. Do not assume that publishing the DKIM CNAMEs automatically completes SPF or DMARC setup. For another perspective on choosing and evaluating a sending domain, see [how to compare sending domains fairly](/repmail/learn/deliverability/compare-sending-domains-fairly).

## Where RepMail fits

RepMail’s domain verification flow connects a custom sending domain to its SES sending setup using three DKIM CNAME records. Once verified, you can select that domain for a sender profile. Verification confirms the domain setup step; it does not by itself establish that a campaign is appropriate or that messages will reach a recipient’s inbox.

After the sender is ready, plan your sending pace before launching. RepMail’s warm-up is a sending-cap policy, not a seed-mailbox or warm-up network. See [how to warm up a domain in 14 days](/repmail/learn/deliverability/how-to-warm-up-a-domain-in-14-days) for related planning guidance. If you manage several client senders, [agency paused-client maintenance](/repmail/learn/outreach/agency-paused-client-maintenance) covers a separate operational task: maintaining client setups when outreach is paused.

## Practical verification checklist

| Check | Ready when… |
|---|---|
| Domain added | RepMail lists the exact domain or subdomain you intend to send from. |
| Three CNAMEs published | Each name and target matches the values provided in RepMail. |
| Verification complete | RepMail reports SES and DKIM verification as successful. |
| Sender selected | The sender profile uses the verified domain and has a custom From address. |
| DNS responsibilities reviewed | SPF and DMARC guidance has been considered; your organization handles its DMARC configuration. |

## Common mistakes

- **Adding the wrong domain name:** A subdomain and its parent domain are distinct setup choices. Verify the exact name in both RepMail and DNS.
- **Publishing fewer than three CNAMEs:** Check that all three records are present, not just the first one.
- **Changing the CNAME target:** Copy the provided target exactly; do not substitute a guessed value.
- **Treating pending as verified:** Wait for RepMail’s verified status before selecting the domain for sending.
- **Stopping after DNS verification:** Select the verified domain and configure the sender’s custom From address as a separate readiness step.

## FAQs

### Do I need a new mailbox to verify a sending domain?
Domain verification and mailbox creation are separate tasks. This setup verifies a sending domain; it does not create an email-provider mailbox. Configure the sender profile and From address required for your sending workflow.

### How many DNS records does RepMail require for DKIM verification?
RepMail uses three CNAME records for SES Easy DKIM. Publish all three values provided for the domain.

### How long does domain verification take?
The verification window defaults to 14 days and is configurable. That is not a fixed completion-time estimate; DNS recognition and verification status may take time to update.

### Does DKIM verification configure SPF and DMARC too?
No. The DKIM setup uses CNAME records. RepMail provides SPF and DMARC guidance, and your organization is responsible for its custom-domain DMARC configuration.

## Sources

[1]: https://www.reddit.com/r/hubspot/comments/1ok1v4x/struggling_with_setting_up_email_sending_domain/
[2]: https://www.reddit.com/r/agency/comments/1o0pd3t/need_help_setting_up_cold_email_the_right_way/
