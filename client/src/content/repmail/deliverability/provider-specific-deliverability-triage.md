---
contentType: guide
slug: provider-specific-deliverability-triage
title: "Provider-Specific Deliverability Triage: Gmail, Microsoft, and More"
description: "A provider-aware triage model for Gmail, Microsoft 365, Outlook.com, and other receivers that keeps evidence and actions in the right lane."
authorSlug: repmail-team
publishedAt: "2026-09-21"
tags: ["deliverability", "gmail", "microsoft-365", "outlook", "triage"]
keyTakeaways:
  - "Name the receiving provider and mailbox type before interpreting a delivery or spam signal."
  - "Use provider-native evidence where available, then corroborate with headers, SMTP replies, list events, and change history."
  - "Do not generalize Gmail thresholds, Outlook.com requirements, or Microsoft 365 behavior to every receiver."
assets:
  - type: table
    title: "Provider triage matrix"
    content:
      headers: ["Receiver", "First evidence", "Do not assume"]
      rows:
        - ["Personal Gmail", "Postmaster Tools, headers, SMTP reply", "Postmaster data is real time or covers Workspace mail"]
        - ["Microsoft 365 tenant", "Message trace, quarantine, headers", "Outlook.com rules apply identically"]
        - ["Outlook.com consumer", "Sender Support, Postmaster, headers", "Authentication guarantees Inbox placement"]
        - ["Other provider", "Provider error text, headers, support docs", "Another provider's threshold transfers"]
nextStep:
  label: "Use the full deliverability guide"
  href: "/repmail/learn/deliverability/complete-guide-to-email-deliverability"
  description: "Return to the system view after provider-specific triage."
prerequisites:
  - label: "Separate delivery and placement"
    href: "/repmail/learn/deliverability/delivery-vs-deliverability-vs-placement"
---

**Provider-specific deliverability triage begins with the receiver, not the sender's dashboard.** Identify whether the recipient is on personal Gmail, Google Workspace, a Microsoft 365 tenant, Outlook.com, or another provider. Then collect the provider's own evidence, corroborate it with full headers and SMTP responses, and choose an action that fits that environment. A rule documented by one provider is not automatically a rule for every mailbox.

Use this page as the routing layer between the [deliverability pillar](/repmail/learn/deliverability/complete-guide-to-email-deliverability) and the detailed [Google Postmaster guide](/repmail/learn/deliverability/google-postmaster-tools-guide), [Microsoft 365 diagnostics](/repmail/learn/deliverability/microsoft-365-email-delivery-diagnostics), and [SMTP error guide](/repmail/learn/deliverability/smtp-4xx-5xx-email-errors).

## Step 1: classify the receiving environment

Ask the recipient or administrator which service holds the mailbox. A corporate address can be hosted by Microsoft 365, Google Workspace, another provider, or an on-premises gateway. A consumer-looking domain does not tell
 tell you whether the mailbox is a consumer service or an organizational tenant. If you cannot classify it, record that uncertainty and avoid applying a provider-specific threshold.

## Gmail: start with Postmaster and headers

For personal Gmail recipients, use [Google Postmaster Tools](https://support.google.com/mail/answer/6227174) for spam rate, IP and domain reputation, authentication, encryption, feedback loop, and delivery errors. Google says the data is not real time, generally updates within 24 hours but can take longer, and may be missing at low volume. It does not cover every Google Workspace mailbox.

Corroborate a chart with the receiver-stamped headers and the SMTP response. Check the visible From, `smtp.mailfrom`, DKIM `d=`, SPF, DKIM, and DMARC. Google asks senders to keep Postmaster spam rate below 0.10% and avoid 0.30% or higher; label that as Gmail-specific guidance rather than a universal score. If complaints rise, follow the [spam complaint response runbook](/repmail/learn/deliverability/spam-complaint-spike-response).

## Microsoft 365: ask for tenant evidence

For a Microsoft 365 organization, message trace and quarantine information require an authorized tenant administrator. A sender's dashboard cannot substitute for the recipient tenant's trace. Ask for the UTC time, recipient, message ID, event, and any policy or quarantine reason. Then compare those findings with the sender's SMTP response and a full header from a delivered sample.

Microsoft documents SPF, DKIM, DMARC, ARC, sender reputation, sender history, recipient history, and behavioral analysis as related inputs. A `compauth` result is evidence, not a complete explanation of every filtering decision. Use the [Microsoft 365 diagnostics guide](/repmail/learn/deliverability/microsoft-365-email-delivery-diagnostics) for the evidence packet and [header guide](/repmail/learn/deliverability/read-authentication-results) for parsing.

## Outlook.com: keep consumer policy separate

Outlook.com, Hotmail, and Live.com consumer addresses have a separate sender-support and Postmaster context. Microsoft's high-volume announcement applies to domains sending over 5,000 messages per day to the consumer service and describes SPF, DKIM, and DMARC requirements. It says non-compliant traffic can be junked and later rejected. Do not extend that announcement automatically to every Microsoft 365 tenant or every volume.

For an Outlook.com issue, check [Outlook Sender Support](https://support.microsoft.com/en-us/outlook/sender-support-in-outlook-com), [Outlook Postmaster services](https://sendersupport.olc.protection.outlook.com/pm/services), full headers, and the exact SMTP response. If the message is accepted but lands in Junk, that is a placement investigation, not proof that SMTP failed.

## Other providers: use the receiver's own evidence

For Yahoo, corporate gateways, regional providers, or an on-premises server, begin with the provider's published sender documentation and the exact reply. Record whether the issue is rejection, deferment, Junk placement, quarantine, or missing trace. Do not import Google's spam-rate numbers or Microsoft's volume rule into another provider's policy.

Across all providers, test one variable at a time. A DNS change, a new provider, a new domain, a list import, and a volume increase performed together produce an ambiguous incident. The [email authentication change plan](/repmail/learn/deliverability/email-authentication-change-management) provides a safer sequence.

## Where RepMail fits

RepMail can be the controlled sender-side context for tests, campaign timestamps, and message identities if those records exist in the current product. It should not be described as seeing a recipient's private Postmaster, Microsoft trace, quarantine, or mailbox folder unless current evidence verifies that capability. Use provider-native observations as the authority and keep RepMail records attached to the same incident ID.

## Sources

- [Google: Email sender guidelines](https://support.google.com/mail/answer/81126?hl=en)
- [Google: Postmaster Tools dashboards](https://support.google.com/mail/answer/14668346?hl=en)
- [Microsoft: Email authentication in cloud organizations](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about)
- [Microsoft: Outlook high-volume sender requirements](https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-highvolume-senders/4399730)
- [Microsoft: Outlook Sender Support](https://support.microsoft.com/en-us/outlook/sender-support-in-outlook-com)
