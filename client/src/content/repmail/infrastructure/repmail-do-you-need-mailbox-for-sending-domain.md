---
product: repmail
academy: infrastructure
contentType: knowledge-base
slug: repmail-do-you-need-mailbox-for-sending-domain
title: Do You Need a Mailbox for a RepMail Sending Domain?
description: RepMail requires a verified custom domain or subdomain and custom From
  address. Learn what mailbox hosting does—and does not—affect.
authorSlug: repmail-team
publishedAt: '2026-10-26'
updatedAt: '2026-10-26'
tags:
- RepMail
- email infrastructure
- sending domains
- sender profiles
- mailboxes
collections:
- email-infrastructure-decisions
learningPaths:
- email-infrastructure
keyTakeaways:
- RepMail requires a verified custom sending domain or subdomain and a configured
  custom From address.
- The documented campaign send path does not use a RepMail platform From-address fallback.
- Mailbox hosting is separate from sending eligibility, but reply handling should
  be planned before launch.
- A sending subdomain still needs verification and a custom From address in the sender
  profile.
commonMistakes:
- Configuring DNS verification without adding a custom From address to the sender
  profile.
- Assuming a sending subdomain is ready before verification completes.
- Launching from an address without an assigned reply owner or workflow.
- Expecting a platform-owned From address to replace an incomplete custom sender setup.
faqs:
- question: Can I use a sending subdomain without a mailbox in RepMail?
  answer: The documented RepMail send path requires a verified custom domain or subdomain
    and a configured custom From address; it does not identify mailbox hosting as
    a send prerequisite. You should still establish a way to receive and manage replies
    to that address before sending.
- question: Can RepMail send from its own default From address if I do not configure
    mine?
  answer: No. The documented campaign send path rejects a send when the sender profile
    does not include a custom From address. It does not fall back to a platform From
    address.
- question: Does verifying my domain automatically create a sender profile?
  answer: No. Domain verification and sender-profile configuration are separate setup
    tasks. The selected domain must be verified, and the sender profile must include
    the custom From address used for the campaign.
nextStep:
  label: Compare sending domains and mailboxes
  href: /repmail/learn/infrastructure/sending-domain-vs-mailbox
  description: Use this companion article to separate DNS sending identity decisions
    from inbox and reply-management decisions.
assets:
- type: checklist
  title: RepMail sender identity launch checklist
  content:
    items:
    - Choose the domain or subdomain to use for campaign sending.
    - Confirm that you can publish DNS records for that identity.
    - Complete RepMail domain or subdomain verification.
    - Add a custom From address to the sender profile.
    - Confirm the campaign uses the authorized sender profile.
    - Assign an owner and workflow for replies to the custom From address.
    - Document DNS, sender-profile, and reply-process ownership for future maintenance
      or offboarding.
---

RepMail by LetsZero sends campaign email through AWS SES SMTP using a verified custom sending domain or subdomain and a configured custom From address. The documented send path does not identify mailbox hosting as a prerequisite. In practical terms, you need DNS control for the sending identity and a valid sender profile; you should separately decide how replies to that address will be received and handled.

## The short operational answer

A sending domain and a mailbox solve different problems.

A **sending domain** is the domain or subdomain you verify so RepMail can send from your chosen identity, such as `hello@example.com` or `name@outreach.example.com`. A **mailbox** is a hosted inbox that can receive and be accessed for replies sent to that address.

For RepMail’s campaign send path, the critical product requirements are:

- a selected custom domain or subdomain that is verified;
- a configured `customFromEmail` in the sender profile; and
- sender authorization for the campaign.

The application rejects campaign sends when the custom From address is missing. It does not fall back to a RepMail platform From address. That makes the sender profile a required setup step, not an optional branding preference.

The available product evidence does not establish that you must buy or host a mailbox solely to satisfy that RepMail sending requirement. However, if recipients reply to your custom From address, mailbox access or another deliberate reply-handling arrangement is important operationally. Do not treat “can send” and “can manage replies” as the same decision.

For a broader explanation of the distinction, see [Sending Domain vs. Mailbox](/repmail/learn/infrastructure/sending-domain-vs-mailbox).

## Decision table: what you need for each case

| Your situation | Can it meet the RepMail send-path requirement? | What to verify or decide next |
|---|---|---|
| You control a domain and can add DNS records | Potentially | Verify the domain or subdomain in RepMail and complete the required DNS setup. |
| You want to send from a subdomain, such as `outreach.example.com` | Potentially | Verify that subdomain and configure a custom From address under it. Review [separate sending domains for cold email](/repmail/learn/infrastructure/separate-sending-domain-for-cold-email). |
| You have a verified domain but no custom From address in the sender profile | No | Add a valid custom From address. RepMail’s campaign send path requires it. |
| You have a custom From address but the selected domain is not verified | No | Complete domain verification before sending. |
| You can send from the address but cannot receive or review replies | Possibly for sending, but incomplete operationally | Establish ownership and a reply workflow before launching a campaign. |
| You expect RepMail to use a platform-owned From address if yours is not configured | No | RepMail does not use that fallback in the documented campaign send path. |

## A practical setup procedure

1. **Choose the sending identity.** Decide whether campaigns should come from your primary domain or a dedicated sending subdomain. The choice should fit your organization’s DNS ownership, brand conventions, and reply process.

2. **Confirm DNS control.** The person configuring RepMail needs the ability to publish the verification records for the chosen domain or subdomain. RepMail uses SES Easy DKIM and provides three CNAME records as part of its verification flow. The default verification window is configurable and is set to 14 days in the documented implementation.

3. **Create and verify the domain record.** A domain selected for campaign sending must be verified. A domain name typed into a From address is not enough.

4. **Configure the sender profile.** Set the custom From address that will appear on campaign messages. This is the invariant RepMail checks at send time. If it is absent, the campaign send attempt fails rather than substituting a platform identity.

5. **Decide who handles replies.** Identify the owner of the address, where replies should arrive, and how the team will respond, route, or monitor them. This is especially important when an agency sends on behalf of a client.

6. **Plan for lifecycle changes.** Document who owns DNS access, the sender profile, and reply handling before a client engagement pauses or ends. The related [paused-client maintenance guidance](/repmail/learn/outreach/agency-paused-client-maintenance) and [client offboarding guidance](/repmail/learn/outreach/agency-cold-email-client-offboarding) can help structure that handoff.

## Sending subdomains without an inbox

A sending subdomain can be useful when you want a distinct sending identity, but it does not remove the need for a custom From address in RepMail. For example, a verified `outreach.example.com` subdomain can support a sender identity such as `alex@outreach.example.com`, provided that identity is configured in the sender profile.

Whether that address also has a hosted inbox is a separate operational question. The RepMail evidence supports the custom-domain and custom-From requirements; it does not support treating mailbox hosting as a product-enforced prerequisite. Still, sending from an address whose replies no one can access can create a poor operating process. Set up a monitored inbox or another documented method for handling replies before campaign launch.

## Common setup mistakes to avoid

- Verifying a domain but leaving the sender profile without a custom From address.
- Assuming RepMail will substitute a platform-owned From address when your identity is incomplete.
- Treating a sending subdomain as automatically ready before DNS verification succeeds.
- Equating sending eligibility with a workable reply-management process.
- Letting an agency, client, and DNS administrator each assume someone else owns the sender identity.

## Before you launch

RepMail’s warm-up implementation is a sending-cap policy, not a seed-mailbox or warm-up network. Its default ladder begins at 50 messages per day for days 1–3, 100 per day for days 4–7, then 200 per day until the warm-up window ends; settings and actual scheduling can vary by configuration. A campaign may be deferred and resumed when sender capacity becomes available. Review your broader [email infrastructure decisions](/repmail/learn/collections/email-infrastructure-decisions) alongside the sender setup.

## Sources

[1]: https://www.reddit.com/r/agency/comments/1o0pd3t/need_help_setting_up_cold_email_the_right_way/
[2]: https://www.reddit.com/r/hubspot/comments/1ok1v4x/struggling_with_setting_up_email_sending_domain/
