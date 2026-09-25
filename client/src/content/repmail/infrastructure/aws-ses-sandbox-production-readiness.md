---
product: repmail
academy: infrastructure
contentType: template
slug: aws-ses-sandbox-production-readiness
title: "AWS SES Sandbox to Production: Send-Path Readiness Checklist"
description: "AWS SES Sandbox to Production: Send-Path Readiness Checklist — Teams whose SES account is still constrained by sandbox behavior."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["infrastructure","ses","aws","email","sandbox","production","path"]
assets:
  - type: table
    title: "Sandbox-to-Production Diagnostic Table"
    content:
      headers: ["Symptom observed","Likely cause (decision)","Immediate diagnostic step","Stop condition / next action"]
      rows:
        - ["Sends only to verified recipients fail for unverified addresses","Account still in SES sandbox","Attempt a send to an unverified address and inspect error message; check SES console account status","If sandboxed, prepare production access request and follow checklist"]
        - ["High rejection rate or hard bounces after approval","Poor list hygiene or missing authentication","Inspect bounce SRIDs, verify SPF/DKIM and check list source for invalid addresses","Halt campaign, fix authentication and clean lists, then resume staged ramp"]
        - ["Receives quota or throttling errors on send","Account send quota (messages/second or daily) exceeded","Check SES sending quotas in console or via API and compare to requested rates","Submit quota increase request with recent metrics and mitigation steps"]
        - ["Complaints accumulate above threshold","Subscription/opt-in or content problem","Review subscription capture flows and complaint SNS notifications for patterns","Pause sends to implicated segment; revise opt-in messaging and suppression rules"]
        - ["Bounce/Complaint notifications not received","SNS not configured or consumer failing","Confirm SNS topic subscriptions and endpoint health; review Lambda/consumer logs","Fix SNS/subscriber configuration and replay processing if possible"]
featured: false
collections: ["email-infrastructure-decisions"]
learningPaths: ["email-infrastructure"]
keyTakeaways:
  - "Teams whose SES account is still constrained by sandbox behavior"
  - "SES account-state transition, not generic tool migration"
  - "Link from SES API, quotas, and identity pages"
commonMistakes:
  - "Skipping this check: Confirm your account is sandboxed: attempt to send an email to an unverified recipient and observe the sandbox rejection."
  - "Skipping this check: Verify all From domains in SES and publish SPF and DKIM/Easy DKIM DNS records; confirm DNS propagation."
  - "Skipping this check: Set and verify MAIL FROM domain if you use custom MAIL FROM; check MX/TXT records."
faqs:
  - question: "How long does an SES production access request take?"
    answer: "AWS does not publish a guaranteed approval timeline for production access. Typical cases can vary from hours to several days depending on information completeness and the need for follow-up. To reduce delays, supply clear use-case details and evidence (DNS verification, bounce handling artifacts) when you submit [1]."
  - question: "Does production access automatically increase my send quotas?"
    answer: "No. Moving out of the sandbox lifts the recipient verification restriction but your account will retain default sending quotas. If you require higher throughput, request a separate quota increase citing recent metrics and anticipated volumes [2]."
  - question: "What proof does AWS expect for complaint and bounce handling?"
    answer: "Provide concrete artifacts: SNS topics subscribed to SES notifications, a description of the consumer that processes notifications (code snippets or runbook), examples of processed logs or suppressed-address lists, and a policy describing thresholds and automated actions. Exact required evidence is not fully specified by AWS, so conservative and auditable documentation reduces follow-up questions."
nextStep:
  label: "Continue with Amazon SES Account-Level Suppression: How to Use It"
  href: "/repmail/learn/infrastructure/aws-ses-account-level-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Move an Amazon SES account from sandbox to production by verifying identities, proving legitimate sending use, and requesting production access with clear quotas and rollback plans. This checklist focuses strictly on the SES account-state transition (sandbox restrictions vs production) and the operational steps to validate readiness and complete the AWS request process.

## What changes when you leave the SES sandbox

Decision boundary: sandboxed SES limits sending to verified identities and applies low default quotas; production SES removes the verified-recipient restriction but imposes account-level sending quotas and potential throttling. Know whether your blocker is identity restriction (sandbox) or rate/volume controls (quotas).
Evidence limits: AWS documentation describes the sandbox as restricting recipient addresses and explains that production requests lift that restriction; it also documents quota errors and pages for requesting production access [1][2]. This guide doesn’t reprint AWS UI copy or guarantee approval timelines.
Practical sequence: Confirm you are seeing sandbox behaviors (e.g., bounce errors for unverified recipients, “Mail from” failures) before starting verification steps. If you already only send to verified addresses and need higher throughput, prioritize a quota increase request after identity verification.

## Pre-request checklist: identity, credentials, and sending policy

Decision boundary: Only submit a production access request after DNS for sending identities and authentication are validated and your application policy is documented. AWS will expect evidence of legitimate sending practices and authentication configuration.
Steps: 1) Verify your From-domain(s) in SES and publish SPF and DKIM (or enable Easy DKIM) DNS records; ensure DKIM selectors resolve. 2) Confirm the MAIL FROM domain and its MX/TXT if you use a custom MAIL FROM. 3) Rotate and restrict SES SMTP/SDK credentials; store them in secrets manager and ensure code points to production credentials only after approval.
Evidence limits: AWS asks for details about your use-case and complaint-handling, but exact vetting criteria and time-to-approve are not specified publicly. Provide conservative, auditable answers in your request to reduce follow-ups.

## Operational proof: sample volumes, complaint and bounce handling, and suppression

Decision boundary: You must demonstrate systems to handle bounces, complaints, and unsubscribes; lack of these systems is a common cause of rejection or delayed approval. The evaluator looks for operational controls, not perfect historical metrics.
Implementations to show: Hook SES notifications (SNS) for bounces/complaints/ deliveries, route SNS to a durable processor, and update suppression lists or internal state. Implement automated complaints thresholds and a policy for pausing campaigns. Keep examples of logs showing processing and sample code snippets (labelled as examples) ready to attach to your request.
Evidence limits: AWS will not approve on the basis of a promise alone; provide artifacts (documentation, runbooks, logs) demonstrating the system works in your staging environment.

## Requesting production access: what to include and the submission flow

Decision boundary: The official request is an AWS console form (or Support Center case) where you state use-case, sending sources, expected volume, recipient acquisition method, and handling of bounces/complaints. Include clear numeric estimates and rollback triggers.
Practical sequence: 1) Prepare a short statement of purpose (what you send, to whom, frequency). 2) Provide expected daily and per-second sending rates. 3) Describe subscription/opt-in methods and unsubscribe flows. 4) Attach evidence: DNS verification screenshots, SNS subscription examples, and example bounce processing logs. 5) Submit via the SES production access page and monitor the case in Support Center [1].
Evidence limits: The recommended fields and submission flow are documented by AWS; however, AWS does not publish exact acceptance criteria or SLAs for approval [1].

## Post-approval steps and quota management

Decision boundary: Approval removes the verified-recipient restriction but does not automatically set high throughput — quotas may still constrain you. Immediately check your new sending limits and test at low volume before ramping.
Actions after approval: 1) Verify the account’s sending quotas in the SES console or via API. 2) Run a staged ramp: low-volume sends, monitor bounces/complaints/delivery events, then increase toward your requested rates. 3) If you hit a quota, request a quota increase through AWS Support, providing recent sending metrics and corrective actions [2].
Evidence limits: AWS documents quota-related errors and the request process but specifics on escalation or required metrics for quota increases can change; state uncertainty in requests and provide concrete historical metrics when possible [2].

## Practical checklist

- [ ] Confirm your account is sandboxed: attempt to send an email to an unverified recipient and observe the sandbox rejection.
- [ ] Verify all From domains in SES and publish SPF and DKIM/Easy DKIM DNS records; confirm DNS propagation.
- [ ] Set and verify MAIL FROM domain if you use custom MAIL FROM; check MX/TXT records.
- [ ] Implement SNS notifications for bounces, complaints, and deliveries; create a consumer that marks addresses and suppresses sends.
- [ ] Prepare artifacts for the AWS request: statement of use-case, expected daily and per-second volumes, sample logs showing bounce/complaint handling.
- [ ] Rotate/lock production SES credentials and ensure staging credentials are isolated.
- [ ] Submit the SES production access request with evidence attachments and monitor the Support Center case.
- [ ] After approval, verify send quotas and run a staged ramp while monitoring bounces/complaints and suppression lists.
- [ ] If quotas throttle sends, file a quota increase request with recent metrics and your mitigation plan.

## Where RepMail fits

Use this guide as an operational checklist and decision aid when coordinating outbound teams and deployment timelines. RepMail teams can reference the checklist items and diagnostic table to gate campaign launches, assign owners for authentication and bounce handling, and record stop conditions before escalating a production access or quota request. Do not treat this as automated enforcement — use it to create human-reviewed launch criteria.

Continue with [Amazon SES Account-Level Suppression: How to Use It](/repmail/learn/infrastructure/aws-ses-account-level-suppression) for the next step in the workflow.

## Related RepMail guides

- [AWS SES API v2 Formatted vs Raw Email: A Practical Boundary](/repmail/learn/infrastructure/aws-ses-api-v2-formatted-vs-raw)
- [AWS SES Configuration Sets: Tags, Destinations, and Routing](/repmail/learn/infrastructure/aws-ses-configuration-sets-routing)


## Sources

[1]: https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html "Amazon SES developer documentation"
[2]: https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas-errors.html "Amazon SES developer documentation"
