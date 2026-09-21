---
contentType: guide
slug: email-verification-statuses
title: "Email Verification Statuses: A Practical Decision Model"
description: "Use a clear email verification status model to separate valid, invalid, risky, catch-all, disposable, role-based, and unknown contacts."
authorSlug: repmail-team
publishedAt: "2026-09-21"
tags: ["email verification", "lead generation", "list hygiene", "data operations"]
keyTakeaways:
  - "A status should describe evidence, not promise delivery, relevance, consent, or a reply."
  - "Keep technical outcomes such as invalid and unknown separate from policy flags such as disposable and role-based."
  - "Store a reason, timestamp, source, and campaign action so decisions can be reviewed and repeated."
prerequisites:
  - label: "How to build and verify a cold email list"
    href: "/repmail/learn/cold-email/build-and-verify-a-cold-email-list"
nextStep:
  label: "Use the list hygiene checklist"
  href: "/repmail/learn/lead-generation/email-list-hygiene-checklist"
  description: "Turn verification outcomes into a repeatable pre-campaign review."
assets:
  - type: table
    title: Verification status model
    content:
      headers: ["Status", "Evidence represented", "Default campaign action"]
      rows:
        - ["Valid", "Available checks found no blocking issue", "Continue relevance and suppression review"]
        - ["Invalid", "A required format, domain, or mailbox check failed", "Suppress and investigate the source"]
        - ["Catch-all", "The server may accept arbitrary recipient names", "Hold or route to a controlled policy"]
        - ["Disposable", "The domain is associated with temporary inbox use", "Usually suppress from durable outbound"]
        - ["Role-based", "The local part indicates a group or function", "Review message-to-recipient fit"]
        - ["Unknown", "Evidence was inconclusive or unavailable", "Do not label safe; send to review"]
---
An email verification status is a compact description of what your checks found about an address. **A good status model keeps technical evidence, risk flags, and campaign decisions separate; it never turns “valid” into a guarantee of delivery, relevance, consent, or response.**

## Why one “verified” field is not enough

An address can have valid syntax but belong to a nonexistent domain. A domain can route mail while accepting any local part. A mailbox can be technically reachable but be a shared role inbox, a disposable service, or the wrong person for the campaign. If all of those cases become `verified = true`, downstream operators cannot tell why a contact was kept or what should happen next.

The mail standards help define the boundaries. [RFC 5322](https://www.rfc-editor.org/info/rfc5322/) describes Internet message format, and [RFC 5321](https://www.rfc-editor.org/info/rfc5321/) describes SMTP delivery behavior. Neither standard says that a syntactically valid address belongs to a willing or relevant human. Your model should preserve that distinction.

## A practical status vocabulary

### Valid

Use `valid` only when the available checks passed without a blocking signal. Define which checks your process actually ran. A valid status is time-bound evidence from a method, not a permanent property of the address.

### Invalid

Use `invalid` when syntax, domain routing, or a stronger mailbox check fails in a way that makes the address unsuitable for the intended send. Record the reason: malformed value, nonexistent domain, permanent rejection, or another specific code. Avoid a generic invalid label when the reason is available.

### Catch-all

Use `catch-all` when the recipient domain may accept mail for names that have not been provisioned. This is a distinct uncertainty state, not a synonym for valid or invalid. The [catch-all domain guide](https://www.letszero.in/repmail/learn/lead-generation/email-verification-catch-all-domains) explains how to route it.

### Disposable

Use `disposable` when domain intelligence or another documented method associates the address with temporary inbox use. Keep the source and date of that classification. Do not infer disposability from an unfamiliar domain name alone.

### Role-based

Use `role-based` when the local part appears to represent a function or shared inbox, such as `support@` or `partnerships@`. This is a recipient-model flag, not proof that the address is undeliverable. The [role-based address guide](https://www.letszero.in/repmail/learn/lead-generation/role-based-email-addresses) covers the review decision.

### Unknown

Use `unknown` when checks timed out, conflicted, were blocked, or simply did not provide enough evidence. Unknown must not be silently promoted to valid. A conservative review queue is more useful than false precision.

## Keep status, reason, and action separate

A durable record can include these fields:

| Field | Example purpose |
| --- | --- |
| `address_normalized` | Stable matching and deduplication |
| `status` | Valid, invalid, catch-all, disposable, role-based, or unknown |
| `reason_code` | Explains the status without free-text ambiguity |
| `checked_at` | Shows when the evidence was collected |
| `method` | Identifies the verifier or rule set used |
| `campaign_action` | Keep, hold, suppress, or review |
| `source` | Shows where the row came from |

This separation prevents a common operational failure: using a status from one tool as though it were a final campaign decision. A `role-based` address may be kept for a function-specific message and suppressed for a personalized pitch. A `catch-all` address may be acceptable for a small, reviewed cohort and not for a broad send.

## A decision sequence

First normalize and deduplicate. Next check syntax and domain routing. Then preserve mailbox evidence, including uncertainty. Add policy flags for disposable and role-based signals. Finally reconcile bounces, complaints, unsubscribes, and internal suppression records. Only then assign the campaign action.

If an address later bounces, append the delivery event rather than rewriting the original status. A hard bounce and a soft bounce require different responses; the [bounce guide](https://www.letszero.in/repmail/learn/deliverability/hard-vs-soft-bounces) explains why. Reverification should create a new observation with a new timestamp, not erase history.

## Where RepMail fits

RepMail’s documented workflow is relevant to the final send decision: its public materials describe imported-contact checks, and the existing list guide describes suppression checks at send time. Keep your normalized statuses upstream or alongside the list so campaign operators can see why an address was held or suppressed. Do not describe a platform check as a universal mailbox guarantee.

## Sources

- [RFC 5321: Simple Mail Transfer Protocol](https://www.rfc-editor.org/info/rfc5321/)
- [RFC 5322: Internet Message Format](https://www.rfc-editor.org/info/rfc5322/)
- [RepMail: How to Build and Verify a Cold Email List](https://www.letszero.in/repmail/learn/cold-email/build-and-verify-a-cold-email-list)
- [Google email sender guidelines](https://support.google.com/mail/answer/81126?hl=en)
