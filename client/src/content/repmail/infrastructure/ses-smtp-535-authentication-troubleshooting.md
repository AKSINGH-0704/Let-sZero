---
product: repmail
academy: infrastructure
contentType: tutorial
slug: ses-smtp-535-authentication-troubleshooting
title: 'SES SMTP 535: Region and Credential Checklist'
description: Fix an Amazon SES SMTP 535 error by checking SMTP credentials, AWS Region,
  rotation, encoding, whitespace, and a controlled connection test.
authorSlug: repmail-team
publishedAt: '2026-10-25'
updatedAt: '2026-10-25'
tags:
- Amazon SES
- SMTP
- authentication
- email infrastructure
- troubleshooting
collections:
- email-infrastructure-decisions
learningPaths:
- email-infrastructure
keyTakeaways:
- SES SMTP credentials are different from ordinary IAM access keys.
- The SMTP endpoint and SMTP credentials must correspond to the same AWS Region.
- After rotation, confirm the running service actually loaded the new credential pair.
- Encoding, escaping, and stray whitespace can change the secret passed to the SMTP
  client.
- A minimal authentication test from the application host helps separate credential
  problems from application configuration problems.
commonMistakes:
- Using an IAM access key and secret access key as the SES SMTP username and password.
- Pairing SMTP credentials from one Region with an endpoint in another Region.
- Updating a secret store but leaving a running process or worker on the old value.
- Copying credentials through a parser or file format that changes characters or adds
  whitespace.
- Treating an SMTP authentication test as proof that sender identity, DNS, or message
  delivery is configured correctly.
faqs:
- question: Can I use my AWS access key as the SES SMTP password?
  answer: No. SES SMTP credentials are distinct from ordinary IAM access keys. Use
    SES SMTP credentials and follow AWS’s documented procedure for obtaining or deriving
    the SMTP password.
- question: Why does an SES SMTP credential work in one environment but return 535
    in another?
  answer: Compare the endpoint Region, credential pair, and secret source used by
    each environment. The second environment may be using a different Region, an older
    secret, or a value altered during configuration.
- question: Does a 535 error mean my domain DNS records are wrong?
  answer: Not by itself. A 535 is an SMTP authentication failure to investigate through
    credentials, Region, and runtime configuration. DNS and sender-identity checks
    are separate troubleshooting steps.
nextStep:
  label: Plan SES SMTP credential rotation
  href: /repmail/learn/infrastructure/aws-ses-smtp-credentials-rotation
  description: Use a deliberate rotation process to reduce stale-secret and environment-mismatch
    troubleshooting.
assets:
- type: table
  title: SES SMTP 535 quick decision table
  content:
    rows:
    - - IAM keys used as SMTP credentials
      - Credential type
      - Use SES SMTP credentials.
    - - Endpoint Region differs from credential Region
      - Region alignment
      - Use matching Region credentials and endpoint.
    - - Error started after rotation
      - Secret deployment
      - Confirm the running process loaded the new pair.
    - - Same-host test works but application fails
      - Runtime configuration
      - Compare loaded values and transport settings.
    - - Same-host test also fails
      - Credential and endpoint path
      - Recheck pair, encoding, whitespace, and Region.
    headers:
    - Observation
    - Check next
    - Action
---

An Amazon SES SMTP `535` authentication error usually means the SMTP server rejected the credentials or the connection is using credentials for a different SES Region. Check that you are using SES SMTP credentials—not an IAM access key and secret access key—then verify the Region, current secret value, encoding, and configuration loaded by your mail client.

## 1. Confirm you have SES SMTP credentials

SES SMTP credentials are distinct from ordinary AWS access keys. If you copied an IAM access key ID and secret access key into your SMTP configuration, replace them with SMTP credentials created for SES. Do not assume that an AWS console login, IAM user password, or access key is a valid SMTP password.

Check the exact variables your application supplies to its mail library:

- SMTP username: the SES SMTP username.
- SMTP password: the SES SMTP password.
- SMTP host: the SES SMTP endpoint for the sending Region.
- Port and transport security: the values required by your application and selected endpoint.

Compare the values in the running process with the secret you intended to configure. A local `.env` file can look correct while a deployed service continues to use an old secret, a different environment, or a secret with an unexpected name.

## 2. Match the endpoint and credentials to one Region

SES SMTP endpoints and SMTP credentials are Region-specific. Confirm that the configured SMTP host belongs to the same Region for which the SMTP credentials were created. Check both values from the deployed environment, not just a development machine or infrastructure dashboard.

A quick diagnostic is to write down the Region in three places: the SES console or credential-creation context, the SMTP endpoint hostname, and the application configuration. If any of these disagree, correct the mismatch and retest.

Region mismatches can be especially easy to miss when staging and production use different endpoints, or when a secret has been copied between environments. For a broader process to catch configuration changes over time, see [authentication drift detection](/repmail/learn/infrastructure/authentication-drift-detection).

## 3. Check rotation, encoding, and whitespace

If the credentials were recently replaced, make sure the application is using the new pair and that the process or service was reloaded as required by your deployment. Check for an old secret in a container, secret manager, CI/CD variable, or worker that did not restart. For a rotation procedure, see [AWS SES SMTP credentials rotation](/repmail/learn/infrastructure/aws-ses-smtp-credentials-rotation).

Also inspect how the credentials are stored and passed to the SMTP client:

- **Encoding:** SES SMTP passwords are not simply the IAM secret access key. Follow AWS’s documented process for obtaining or deriving the SMTP password; avoid manually transforming a value based on guesswork.
- **Whitespace:** Look for a leading or trailing space, newline, quote, or carriage-return character introduced during copy-and-paste or secret-file handling.
- **Escaping:** If credentials pass through a URL, YAML file, shell command, or another parser, confirm that special characters were not altered or interpreted.
- **Pairing:** Ensure the username and password came from the same SMTP credential set.

Do not print secrets into application logs or paste them into public debugging tools. Compare values locally without exposing them; for example, inspect their lengths and check for surrounding whitespace rather than logging the credential itself.

## 4. Run a controlled test from the same environment

A useful test changes one variable at a time. First, confirm the app can resolve and reach the configured SES endpoint from the host where it runs. Then test SMTP authentication from that same host using a trusted SMTP client or a small, temporary test program configured with the same endpoint and credential source.

Keep the test minimal: connect and authenticate, without sending a real campaign message. If the controlled test also returns 535, focus on credentials, Region, secret loading, and encoding. If it authenticates but the application still fails, compare the application’s actual runtime settings and SMTP-library configuration against the test. Remove temporary test code and avoid sharing output that contains credentials.

This is a diagnostic split, not proof that all message-sending settings are correct. An authentication test does not validate sender identity, message content, DNS, or delivery outcomes. For background on DNS concepts, see [DNS records for email](/repmail/learn/infrastructure/dns-records-for-email); DNS issues are a separate line of investigation from a rejected SMTP login.

## Compact decision procedure

| Observation | Check next | Practical action |
|---|---|---|
| Credentials are IAM access keys | Credential type | Replace with SES SMTP credentials. |
| SMTP host and credential Region differ | Region alignment | Use an endpoint and SMTP credentials for the same Region. |
| Failure began after a secret change | Rotation and deployment | Confirm the new pair is loaded by the running process. |
| Credentials appear correct but authentication fails | Encoding and whitespace | Re-enter or reload the secret carefully; check for altered characters or extra whitespace. |
| Same-host test authenticates, app does not | Runtime configuration | Compare the app’s loaded host, username, password source, and transport settings. |
| Same-host test also fails | Credential or endpoint path | Recheck the credential pair and Region before changing unrelated mail settings. |

## Where RepMail fits

RepMail by LetsZero sends through AWS SES SMTP from a verified custom sending domain or subdomain. That product detail does not make RepMail a credential validator for your separate SES integration, and it does not change the checks above. If you are diagnosing your own SES SMTP client, troubleshoot that client’s Region and credentials directly.

Once authentication succeeds, keep configuration changes traceable. Record which environment and Region use each credential set, who owns rotation, and how the deployed service reloads secrets. That makes the next 535 easier to isolate without mixing SMTP authentication with DNS or deliverability troubleshooting.

## Sources

[1]: https://docs.aws.amazon.com/ses/latest/dg/troubleshoot-smtp.html
[2]: https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html
