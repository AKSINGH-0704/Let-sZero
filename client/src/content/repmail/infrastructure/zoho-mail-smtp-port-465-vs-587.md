---
product: repmail
academy: infrastructure
contentType: tutorial
slug: zoho-mail-smtp-port-465-vs-587
title: 'Zoho Mail SMTP: When to Use Port 465 or 587'
description: Choose Zoho Mail SMTP port 465 or 587 by matching the port to SSL or
  STARTTLS, then verify the server, login, and account settings.
authorSlug: repmail-team
publishedAt: '2026-10-25'
updatedAt: '2026-10-25'
tags:
- Zoho Mail
- SMTP
- Email infrastructure
- Configuration troubleshooting
collections:
- email-infrastructure-decisions
learningPaths:
- email-infrastructure
keyTakeaways:
- Use port 465 with SSL/TLS from the start of the connection.
- Use port 587 with STARTTLS, which upgrades the connection after it begins.
- Enable SMTP authentication and confirm the hostname and login requirements for the
  Zoho account.
- A port change will not fix incorrect credentials, account permissions, or domain
  setup.
commonMistakes:
- Pairing port 465 with STARTTLS or port 587 with implicit SSL/TLS without checking
  the client and Zoho settings.
- Assuming every Zoho account uses the same SMTP hostname.
- Treating a login rejection as a port problem instead of checking authentication
  and account permissions.
- Changing several settings at once, making it hard to identify the cause of a failure.
faqs:
- question: Is port 465 or 587 better for Zoho Mail?
  answer: Neither is universally better. Use 465 with SSL/TLS from connection start,
    or 587 with STARTTLS. Choose the option that your application supports and that
    matches Zoho’s instructions for your account.
- question: Can I use port 587 with SSL?
  answer: Port 587 is generally used for STARTTLS, which begins the connection and
    then upgrades it to TLS. Do not confuse that with implicit SSL/TLS; check the
    application’s security-mode labels and Zoho’s current account-specific instructions.
- question: Why does Zoho SMTP reject my password?
  answer: Check that SMTP authentication is enabled, that the account is allowed to
    send through SMTP, and that you are using the required username and credential
    method. If additional sign-in security is enabled, follow Zoho’s guidance for
    that account.
- question: Does choosing the right port ensure the message reaches the inbox?
  answer: No. The port and encryption settings address the SMTP connection. They do
    not by themselves determine whether a submitted message is delivered or how a
    recipient’s mail system handles it.
nextStep:
  label: Review the SMTP setup
  href: /repmail/learn/infrastructure/aws-ses-for-cold-email
  description: Explore how an application sending through AWS SES SMTP differs from
    submitting mail through a Zoho mailbox.
assets:
- type: checklist
  title: Zoho SMTP pre-test checklist
  content:
  - Confirm the SMTP hostname in the settings for the Zoho account.
  - Select port 465 with SSL/TLS, or port 587 with STARTTLS.
  - Enable SMTP authentication.
  - Confirm the username, credential method, and account permission to send through
    SMTP.
  - Send one test message and record the exact error if it fails.
  - Troubleshoot one setting at a time; handle custom-domain verification separately.
---

Use port 465 when your app or mail client is configured for SSL/TLS from the start, and port 587 when it is configured to connect first and then upgrade the connection with STARTTLS. For either option, enable SMTP authentication and use the SMTP server that applies to your Zoho account. The port and encryption mode must agree; changing only the port may not fix a connection error.

## 465 vs. 587 at a glance

| Setting | Port 465 | Port 587 |
|---|---|---|
| Connection mode | SSL/TLS from connection start (implicit TLS) | STARTTLS: connect, then upgrade to TLS |
| Choose it when | Your client offers SSL/TLS for the SMTP connection | Your client offers STARTTLS or explicit TLS |
| Authentication | Enable SMTP authentication | Enable SMTP authentication |
| Server name | Use the SMTP hostname for your Zoho account | Use the SMTP hostname for your Zoho account |

Zoho documents both port options and their corresponding encryption settings in its [SMTP configuration guidance](https://www.zoho.com/mail/help/zoho-smtp.html). The important distinction is not that one port is universally better. It is that the client’s security mode must match the connection mode expected on that port.

## Choose the setting in four steps

1. **Find the correct SMTP hostname.** Start with Zoho’s documented server settings for your account. Do not assume a hostname based on another organization’s configuration; account type and Zoho’s service region can affect the applicable details. If in doubt, check the settings shown for your account or ask your administrator.
2. **Choose the encryption mode your client supports.** Select SSL/TLS for port 465, or STARTTLS for port 587. Some applications label the second option “TLS” or “explicit TLS.” Confirm what the label means in that application’s documentation.
3. **Turn on SMTP authentication.** Supply the Zoho mailbox credentials or other authentication method required for your account. If your account has additional sign-in security, check Zoho’s guidance for the appropriate credential setup rather than repeatedly trying a regular password.
4. **Test with one message.** Save the settings and send a test message. If it fails, note the complete error and check the hostname, port, encryption mode, authentication, and account permissions before changing multiple settings at once.

For a worked example, suppose a desktop client has separate fields for server, port, security type, and login. If you select port 465, set its security type to SSL/TLS. If you select port 587, set it to STARTTLS. Keep the server and login details appropriate to the Zoho account in both cases. Do not set port 465 with STARTTLS simply because the menu says “TLS,” or port 587 with implicit SSL/TLS, unless Zoho’s current instructions for your account specifically direct otherwise.

## Troubleshoot by symptom

**The connection times out or cannot be opened.** Check the hostname and port first. Also check whether the network or hosting environment allows outbound SMTP connections. A timeout alone does not identify which setting is wrong.

**The connection opens but fails during TLS negotiation.** The encryption mode may not match the port. Compare the application’s security setting with the 465/SSL/TLS and 587/STARTTLS pairing. If the application has a separate “require TLS” option, consult its documentation to understand whether that means implicit TLS or STARTTLS.

**The server rejects the login.** Confirm that SMTP authentication is enabled and that the account is permitted to send through SMTP. Verify the username format and credential requirements for that account. A port change will not resolve a rejected login by itself.

**The app says it sent, but the recipient does not receive the message.** Separate the SMTP submission problem from later delivery or mailbox filtering. Check the sending account’s status and any available message logs. If you are setting up mail on a custom domain, domain verification is a separate configuration step; Zoho explains it in its [domain verification guidance](https://www.zoho.com/mail/help/adminconsole/domain-verification.html).

## Keep the setup narrow and verifiable

When troubleshooting, change one setting at a time and record the result. A useful order is hostname, port/encryption pairing, authentication, and account permissions. Save the working configuration securely, and avoid putting passwords in source code or shared logs.

If you are evaluating whether to use mailbox SMTP or a separate sending service for an application, treat that as an architecture decision rather than a port decision. RepMail’s guides to [AWS SES for cold email](/repmail/learn/infrastructure/aws-ses-for-cold-email) and [AWS SES SMTP credential rotation](/repmail/learn/infrastructure/aws-ses-smtp-credentials-rotation) cover a different sending setup. For a broader tool evaluation, see [questions to ask about a cold email tool contract](/repmail/learn/outreach/cold-email-tool-contract-questions).

## Where RepMail fits

RepMail by LetsZero is an outreach platform that sends through AWS SES SMTP from a verified custom sending domain or subdomain. That is separate from configuring Zoho Mail SMTP for an app or mail client. Use the Zoho settings when the application is meant to submit mail through your Zoho account; consider RepMail only when you are evaluating a dedicated outreach workflow and its requirements.

## Quick pre-test checklist

Before testing, confirm the exact hostname and account-specific instructions in Zoho’s settings. Then select one matching pair: port 465 with SSL/TLS, or port 587 with STARTTLS. Enable SMTP authentication, verify the account’s login requirements, and send a single test message. If it fails, capture the error and troubleshoot one setting at a time.

## Sources

[1]: https://www.zoho.com/mail/help/zoho-smtp.html
[2]: https://www.reddit.com/r/Zoho/comments/1u4gpw6/difficulties_with_setting_up_zoho_mail/
[3]: https://www.zoho.com/mail/help/adminconsole/domain-verification.html
