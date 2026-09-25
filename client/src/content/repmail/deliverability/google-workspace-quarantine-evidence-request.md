---
product: repmail
academy: deliverability
contentType: template
slug: google-workspace-quarantine-evidence-request
title: "Google Workspace Quarantine Evidence Request for External Senders"
description: "Google Workspace Quarantine Evidence Request for External Senders — Sender is told mail is missing but needs the recipient admin to confirm quarantine, routing."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["deliverability","provider","google","workspace","quarantine"]
assets:
  - type: table
    title: "Compact decision table: recipient admin checks to run"
    content:
      headers: ["Observed symptom from sender","Admin tool to check","What admin should look for","Stop condition / next action"]
      rows:
        - ["Sender has Message-ID and timestamp","Message Log Search (MSS)","Exact Message-ID match, or entry with matching envelope/250 accept","Export MSS row; if accepted, check routing; if quarantined, export quarantine"]
        - ["Sender has no Message-ID but narrow time window","MSS then Quarantine","Search by sender/recipient and timestamp; filter all quarantine categories","Provide exported rows or quarantine item details"]
        - ["Sender shows SMTP 250 from Google","MSS + routing rules","MSS entry showing 250 and a routing action (relay or destination)","Request downstream relay logs or confirm routing destination"]
        - ["No MSS entries found","Upstream MX/firewall/gateway logs","No TCP/SMTP connection from sender IP to Google MX","Confirm message never reached Google; escalate to sender gateway"]
        - ["Message shows quarantined","Quarantine tool","Quarantine category, rule name, and ability to export/forward","Request release/forward or exported copy depending on privacy"]
featured: false
collections: ["deliverability-diagnostics"]
learningPaths: ["provider-deliverability-diagnostics"]
keyTakeaways:
  - "Sender is told mail is missing but needs the recipient admin to confirm quarantine, routing, or policy action."
  - "Distinct from Microsoft quarantine and generic sent-not-received triage; targets Workspace admin collaboration."
  - "Link from provider acceptance investigations to message-header and incident packet pages."
commonMistakes:
  - "Skipping this check: Include RFC5322 Message-ID in your request (if available)."
  - "Skipping this check: Provide exact UTC timestamp to the second and time zone of your log entry."
  - "Skipping this check: Give envelope sender and recipient addresses and the sending MTA IP/HELO."
faqs:
  - question: "Can a Workspace admin recover a message deleted from a user mailbox?"
    answer: "If a message was accepted and later deleted from the user mailbox, recovery depends on retention, archive, or compliance rules the organization has enabled. The Admin console alone cannot recover messages deleted by users unless a retention or Vault export exists. Ask the admin whether Vault or any retention policy covered the recipient during the timeframe."
  - question: "If the admin finds a quarantine, can they always release and forward it to me?"
    answer: "That depends on the recipient organization’s policies. Administrators can release or forward quarantined messages, but they may be restricted by security or compliance procedures. Request an exported copy or the quarantine metadata if the admin is not permitted to forward the message."
  - question: "What if the admin’s MSS shows acceptance but no final delivery or quarantine?"
    answer: "An MSS acceptance followed by no quarantine or delivery record usually indicates the message was routed to a third-party relay or archive. Ask the admin for the routing action and downstream destination; then request logs from that downstream system."
nextStep:
  label: "Continue with Provider-Specific Deliverability Triage: Gmail, Microsoft, and More"
  href: "/repmail/learn/deliverability/provider-specific-deliverability-triage"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

If a recipient tells you a message is “missing” and you need the Google Workspace admin to confirm whether the message was quarantined, routed, or blocked, provide concise evidence and a clear set of next steps. Your goal is to enable the Workspace admin to locate the exact message in Gmail/Quarantine tools or to demonstrate why it cannot be found.

## What to ask the recipient admin (exactly)

Request specific, actionable checks rather than general confirmation. Ask the admin to search the admin console Message log search (MSS) for the date/time range, sender envelope From, recipient address, and Message ID (if you have it). If available, include the RFC5322 Message-ID header value; MSS searches work best with exact identifiers.
Also ask the admin to check the Quarantine view in Google Admin for the same time window and recipient, and to expand any filters for ‘Spam, Phishing, Malware, or Compliance’ categories. Quarantine rules and routing may move messages to custom or third-party quarantine destinations; ask whether any routing policies (content compliance, routing rules) were in place for that recipient at the time [1].

## Evidence to provide them (minimal packet)

Supply the Message-ID, full SMTP envelope sender and recipient, exact UTC timestamp (to the second) and your sending MTA hostname or IPv4/IPv6 and HELO/EHLO. These four items give the admin enough to find a single entry in MSS or to correlate with gateway logs.
If you have an outbound SMTP log snippet showing a 250 response and the server banner, include it. If you don’t have a Message-ID, provide a narrow time window plus a unique subject line and any DKIM signature selector used. State when and how you sent — e.g., via a mailing tool, MTA pool, or third-party relay — and include any return-path used.

## How admins will distinguish quarantine vs routing vs discard

Quarantine: In the Admin console quarantines are visible in the Quarantine tool or in MSS with an action showing ‘quarantined’ or policy tag; the admin can export or forward the message from quarantine. If the admin finds a matching quarantine entry, ask them to confirm the quarantine category and exact rule name.
Routing/Delivery-to-third-party: If a routing rule sent to an external quarantine or compliance archive, MSS can show a routing action rather than quarantine. Ask the admin whether any SMTP relays or dual-delivery rules were configured for the recipient domain or organizational unit at the time [1].
Discard or Reject: MSS will show a rejected SMTP response code if Google refused receipt; discarded messages (post-accept) may not be recoverable. If MSS shows no entry, the message may never have been accepted by Google — in that case ask for gateway logs or for the admin to check any upstream MX or firewall appliances.

## Decision boundaries and evidence limits

Google Admin tools can show accepted, routed, quarantined, or rejected events for messages that reached Google’s infrastructure, but they cannot show messages that were never delivered to Google (e.g., blocked upstream) or messages deleted after acceptance by end-user mailboxes unless retained by a quarantine or retention policy [1].
If the admin cannot find an MSS or quarantine record, that is evidence the message likely did not reach Gmail’s intake; it does not prove end-user deletion. Advise the admin to check gateway and forwarder logs and any third-party archive appliances. State uncertainty clearly: you cannot assume recovery or visibility if the message is not in MSS or quarantine.

## Practical sequence for the admin to run (recommended order)

1) Use Message Log Search: search by Message-ID, then envelope sender and recipient, then time window. Export any matching entries. 2) Check Quarantine: filter by recipient, sender, and the same timestamp; expand all categories. 3) If no hits, review routing rules and any SMTP relays or third-party archives configured for the OU or domain. 4) If still nothing, check upstream MX/firewall/gateway logs and return them to you.
Ask the admin to provide screenshots or exported CSV rows showing timestamps, actions, and rule names; these are compact, machine-readable proofs you can use for next steps.

## How to use their responses and stop conditions

If the admin provides a quarantine entry with the Message-ID and rule name, request either release/forward or an exported copy (depending on privacy/policy). That is a stop condition for triage: you now have the message. If MSS shows a 250 acceptance with downstream routing to a third party, the stop condition is getting logs from that third party.
If the admin reports no MSS/quarantine entry and provides upstream MX logs showing no TCP connection from your sending IP, the stop condition is confirmed: the message never reached Google. At that point, escalate to your own gateway provider or re-send after confirming DNS/MX and IP reputation changes.

## Practical checklist

- [ ] Include RFC5322 Message-ID in your request (if available).
- [ ] Provide exact UTC timestamp to the second and time zone of your log entry.
- [ ] Give envelope sender and recipient addresses and the sending MTA IP/HELO.
- [ ] Ask admin to run Message Log Search first, then Quarantine tool.
- [ ] Request exported MSS rows or screenshots showing action and rule names.
- [ ] If found in quarantine, request an exported copy or rule name and category.
- [ ] If MSS shows accept + routing to external relay, request that relay’s logs.
- [ ] If no MSS/quarantine entry, ask admin to check upstream MX/firewall logs.
- [ ] Confirm whether any retention or compliance rules might have purged the message.

## Where RepMail fits

Use this article as a checklist and request-template when you need recipient-side confirmation from a Google Workspace admin. It helps you collect the minimum deterministic evidence (Message-ID, envelope, timestamp, sending IP) and steers the admin through the exact console checks that resolve common stop conditions. Do not assume RepMail has direct access to recipient consoles; treat this as an evidence-gathering aid to include in your outbound incident workflow.

Continue with [Provider-Specific Deliverability Triage: Gmail, Microsoft, and More](/repmail/learn/deliverability/provider-specific-deliverability-triage) for the next step in the workflow.

## Related RepMail guides

- [Google Workspace Recipient Mailbox Versus Personal Gmail: Choose the Right Test](/repmail/learn/deliverability/google-workspace-vs-personal-gmail-test)
- [Accepted by Gmail, Missing at Outlook: Provider Handoff Investigation](/repmail/learn/deliverability/accepted-gmail-missing-outlook-handoff)


## Sources

[1]: https://knowledge.workspace.google.com/admin/gmail/advanced/email-routing-and-delivery-options-for-google-workspace "Google sender or Workspace documentation"
[2]: https://support.google.com/a/answer/81126 "Google sender or Workspace documentation"
