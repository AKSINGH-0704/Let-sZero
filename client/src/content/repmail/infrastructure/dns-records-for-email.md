---
contentType: knowledge-base
slug: dns-records-for-email
title: "DNS Records for Email: MX, PTR, SPF, DKIM, and DMARC"
description: "Every deliverability check starts in your DNS. Here is what each email record does, MX, PTR, SPF, DKIM, DMARC, and how they work together."
authorSlug: repmail-team
publishedAt: "2026-07-17"
tags: ["dns", "infrastructure", "authentication", "spf", "dkim", "dmarc"]
prerequisites:
  - label: "Email authentication overview"
    href: "/repmail/learn/deliverability/email-authentication"
commonMistakes:
  - "Missing a PTR (reverse DNS) record on your sending IP, which receivers check early and distrust when absent."
  - "Publishing DNS changes and sending immediately, before propagation completes, so early checks fail."
  - "Editing one record in isolation without checking it still aligns with the others (a new SPF include, a rotated DKIM key)."
faqs:
  - question: "Which DNS records does email delivery depend on?"
    answer: "MX records route inbound mail to your servers. PTR (reverse DNS) maps your sending IP back to a hostname. SPF, DKIM, and DMARC are the authentication records receivers use to verify outbound mail. For sending, the last four matter most; MX matters for receiving replies."
  - question: "What is a PTR record and why does it matter?"
    answer: "A PTR record is reverse DNS: it maps your sending IP address back to a hostname. Receiving servers check it at the start of the SMTP handshake, and a missing or mismatched PTR is an early trust penalty, regardless of how good your content is."
  - question: "How long do DNS changes take to work?"
    answer: "Usually minutes, but occasionally up to 24 to 48 hours to propagate fully. Sending before propagation completes can cause early authentication checks to fail, so confirm each record resolves before your first campaign."
nextStep:
  label: "See how these records authenticate you"
  href: "/repmail/learn/deliverability/email-authentication"
  description: "SPF, DKIM, and DMARC are the authentication half of your DNS. Here is how receivers use them."
assets:
  - type: table
    title: The email DNS records
    content:
      headers: ["Record", "Type", "What it does"]
      rows:
        - ["MX", "MX", "Routes inbound mail to your receiving servers"]
        - ["PTR", "Reverse DNS", "Maps your sending IP back to a hostname"]
        - ["SPF", "TXT", "Lists servers allowed to send as your domain"]
        - ["DKIM", "TXT/CNAME", "Publishes the public key that verifies your signatures"]
        - ["DMARC", "TXT", "Sets policy for failures and requests reports"]
---

Almost every deliverability decision a receiving server makes begins with a DNS lookup. Before it trusts a message, it queries your domain's records to confirm who is allowed to send, whether the signature checks out, and what to do if something fails. If those records are missing, misconfigured, or not yet propagated, the checks fail, and no quality of writing recovers from that. DNS is the quiet foundation the rest of the stack stands on.

## The records that matter, and what each does

**MX records** point to the servers that receive mail for your domain. They govern where replies to your cold email land, so while they do not affect outbound delivery directly, a domain with no MX cannot receive the responses your campaign is trying to earn.

**PTR, or reverse DNS,** maps your sending IP address back to a hostname. Receivers check it at the very start of the SMTP handshake, and a missing or mismatched PTR is an early trust penalty applied before your content is ever seen. On shared infrastructure this is set for you; on a dedicated setup it must be configured deliberately.

**SPF, DKIM, and DMARC** are the authentication trio. SPF (a TXT record) lists the servers allowed to send as you. DKIM (a TXT or CNAME record) publishes the public key receivers use to verify your message signatures. DMARC (a TXT record at `_dmarc.yourdomain.com`) sets what receivers should do when SPF or DKIM fails and requests reports on who is sending in your name.

## They have to agree with each other

The records are not independent. Adding a new sending tool means a new SPF include, which counts against SPF's ten-lookup limit. Rotating a DKIM key means updating the published record in step, or every signature fails. Enforcing DMARC assumes SPF and DKIM already pass and align. Editing one record without checking the others is how a working setup quietly breaks, so DNS changes are best treated as changes to a system, not to a single line.

## Give it time to propagate

DNS changes usually take effect within minutes but can take up to 24 to 48 hours to propagate fully. Sending in that window risks early authentication failures on a setup that is actually correct, it just is not live yet everywhere. Confirming each record resolves before the first campaign avoids diagnosing a problem that propagation would have solved on its own.

## Where RepMail fits

RepMail's domain verification generates the exact SPF, DKIM, and return-path records your domain needs for AWS SES delivery and confirms each one actually resolves before it lets you send, so the most common DNS mistakes, a missing record, a duplicate SPF, an un-propagated change, are caught at setup rather than in a failed campaign. The DNS foundation is verified as a precondition of sending, not left as a step you hope you completed correctly.
