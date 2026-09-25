---
product: repmail
academy: infrastructure
contentType: guide
slug: authentication-drift-detection
title: "Authentication Drift Detection: Compare Intended and Observed Senders"
description: "Authentication Drift Detection: Compare Intended and Observed Senders — Security and deliverability owners with many ESPs and subdomains."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["infrastructure","dns","email","authentication","drift","detection"]
assets:
  - type: table
    title: "Drift diagnostic decision table"
    content:
      headers: ["Observed artifact","Baseline match?","Immediate action","Owner"]
      rows:
        - ["Unknown sending IP using company header-from","No","Flag high-priority; collect headers; block if confirmed abuse","Security"]
        - ["Known ESP but DKIM selector missing from inventory","No","Contact ESP/owner; verify selector; update baseline or rotate key","Deliverability"]
        - ["DMARC aggregate shows new IP in low volume","No","Monitor for N windows; collect headers before escalation","Deliverability"]
        - ["DKIM signature fails with expected selector","Yes","Check key expiry and DNS propagation; rotate key if compromised","Deliverability"]
        - ["Envelope-from matches baseline but SPF softfail","Yes","Validate SPF includes and IP ranges; update SPF if legitimate","Deliverability"]
        - ["Subdomain delegated to vendor observed sending from unexpected selector","No","Confirm delegation model; update inventory or revoke delegation","Security"]
featured: false
collections: ["email-infrastructure-decisions"]
learningPaths: ["email-infrastructure"]
keyTakeaways:
  - "Security and deliverability owners with many ESPs and subdomains"
  - "Distinct from inventory/offboarding: focuses on recurring drift detection against a declared baseline."
  - "Links multiple-sender authentication to DMARC reports and vendor governance."
commonMistakes:
  - "Skipping this check: Export current inventory to machine-readable format (include owner and purpose)."
  - "Skipping this check: Ingest DMARC aggregate reports and store them with timestamps for at least 90 days."
  - "Skipping this check: Collect raw message headers from a diversified set of seeds for each major sending domain."
faqs:
  - question: "How often should I run drift detection for a large organization?"
    answer: "Use daily checks for enterprise-critical domains and high-volume ESPs; weekly is acceptable for low-volume or occasional senders. Increase cadence temporarily after onboarding/offboarding or a detected incident. Note that DMARC aggregates are typically provided daily, so factor that cadence into your detection window [2]."
  - question: "Can DMARC reports alone prove an unauthorized sender?"
    answer: "No. DMARC aggregates are directional: they indicate which IPs and authentication results receivers observed but can omit low-volume or transient traffic and lack raw headers. Use DMARC to prioritize candidates, then confirm with raw headers or vendor logs before enforcement decisions [2]."
  - question: "What is a safe stop condition before applying blocking policies?"
    answer: "A conservative stop condition is confirmation from raw headers or vendor logs that the artifact persists across at least one DMARC reporting cycle and owner verification has been attempted. For high-confidence malicious activity, shorter stop conditions may apply, but document approvals and evidence before changing receiver-facing enforcement."
nextStep:
  label: "Continue with Amazon SES Account-Level Suppression: How to Use It"
  href: "/repmail/learn/infrastructure/aws-ses-account-level-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Detect authentication drift by continuously comparing the senders your organization declares (DKIM selectors, SPF envelope sources, authorized IPs, and delegated subdomains) against the senders that actually appear in mail streams and aggregate reports. Build a repeatable audit that flags deviations, classifies risk, and drives governance actions before strict enforcement or abuse incidents force emergency changes.

## Define the baseline: declared senders and their technical artifacts

Start by inventorying every authorized sender: ESPs, marketing platforms, transaction systems, security tools, and delegated subdomains. For each, record the exact envelope-from domains, DKIM selectors and public keys, SPF include or IP ranges, and any MX/redirect records used for subdomain delegation. This inventory is your baseline for drift detection; keep it in a machine-readable form (CSV/JSON) and include owner, purpose, and expected sending volume.
State the decision boundary: any observed sending identity (envelope-from, header-from with delegated signing, DKIM selector, or IP) not in the inventory is a deviation. Evidence limits: inventories reflect declared intent but not live behavior—do not assume an inventory entry proves ongoing use or that lack of an entry proves maliciousness.

## Collect observable evidence: what to monitor and where

Ingest mailbox and gateway telemetry: DMARC aggregate reports, MTA logs, vendor delivery reports, and any internal submission logs. DMARC XML reports give per-domain, per-source aggregates that suggest which IPs and DKIM/SPF results are active; these are directional and rely on reporting cadence and provider adherence [2].
Also capture DKIM headers and envelope-from from sample messages (from seed lists, customer complaints, or internal monitoring addresses). The decision boundary here is whether telemetry shows a sender artifact (IP, selector, domain) that is not in the baseline for that sending identity. Evidence limits: DMARC aggregates can omit transient or low-volume senders; raw headers are higher fidelity but require broader sampling.

## Detect and classify drift: rules and triage workflow

Apply deterministic rules: tag drift events as (A) Unauthorized sender: unknown IP/ESP sending using your domain; (B) Forgotten sender: known ESP but missing from inventory or with expired keys/selectors; (C) Key/selector mismatch: DKIM signature uses unexpected selector or failing key; (D) SPF gap: envelope IP not listed in SPF includes or authorized ranges. Record confidence for each event (high when raw headers + DMARC both show same artifact; medium when only aggregate DMARC indicates potential drift).
Triage sequence: 1) Confirm with raw headers or vendor reports; 2) Contact declared owner for the baseline entry; 3) If owner unknown, escalate to security and legal; 4) For high-confidence unauthorized senders, consider temporary domain-level mitigations (quarantine policies, blocking rules) after stakeholder approval. State uncertainty: provider-specific reporting detail and timings vary, so expect false positives from delayed or aggregated data.

## Remediation actions and safe stop conditions

For forgotten or misconfigured senders: update inventory, renew or rotate DKIM keys where selectors have expired, and update SPF to include the ESP or IP ranges. For unauthorized senders: revoke or rotate keys, remove DNS records if applicable, and instruct downstream receivers or gateways to apply reject/quarantine policies only after evidence and approval.
Stop conditions: stop the escalation when the drifting artifact is either reconciled in the baseline, the sending source is blocked or mitigated and is no longer observed in subsequent monitoring windows, or a formal decision is logged to accept the sender and update the baseline. Evidence limits: ensure at least one full reporting cycle (typical DMARC daily aggregate) plus direct header sampling before declaring resolution.

## Operationalize detection: automation, cadence, and owners

Automate ingestion of DMARC XML aggregates, MTA logs, and vendor delivery reports into a central store. Run scheduled comparisons against the declared baseline daily or weekly depending on sending volume; high-volume senders may require hourly checks. Use rule-based matching (IP ranges, exact selectors, and domain matching) with thresholds for noise suppression (e.g., ignore single-message occurrences until repeated across N windows).
Assign owners: a deliverability owner for ESP and key configuration, a security owner for unauthorized-sender investigations, and a change owner who approves baseline updates. Decision boundary: automation flags candidates; a human owner must confirm classification before enforcement actions.

## Linking drift detection to governance and DMARC enforcement

Use drift findings to inform DMARC policy moves and vendor governance. If multiple unknown senders appear, pause raising to p=reject until you can enumerate and authorize all legitimate senders; conversely, clearing drift reduces the risk of legitimate mail being rejected after enforcement [2][1].
Evidence limits: DMARC reports are useful for understanding aggregate source behavior but are not a substitute for contractual governance with vendors. Document remediation and baseline updates as part of vendor offboarding/onboarding checklists so drift detection reduces future surprises.

## Practical checklist

- [ ] Export current inventory to machine-readable format (include owner and purpose).
- [ ] Ingest DMARC aggregate reports and store them with timestamps for at least 90 days.
- [ ] Collect raw message headers from a diversified set of seeds for each major sending domain.
- [ ] Implement daily/weekly automated comparison of observed IPs, DKIM selectors, and envelope-from values against the baseline.
- [ ] Classify drift findings by type (unauthorized, forgotten, selector mismatch, SPF gap) and record confidence levels.
- [ ] Contact declared owner within SLA (e.g., 24–48 hours) for medium/high-confidence drift events.
- [ ] Rotate or remove DKIM selectors and update SPF only after owner validation or confirmed remediation.
- [ ] Log decisions to accept a new sender into the baseline or to block an observed source; require dual approval for enforcement changes.
- [ ] Review baseline and detection rules quarterly or after any major vendor change.

## Where RepMail fits

Use this guide as a checklist and decision aid in outbound governance workflows: integrate the inventory and detection steps into vendor onboarding, change control, and daily operational dashboards so deliverability and security owners can act on drift findings before policy enforcement. This guide does not describe RepMail product features or integrations; treat it as an operational template you can adapt to your tooling.

Continue with [Amazon SES Account-Level Suppression: How to Use It](/repmail/learn/infrastructure/aws-ses-account-level-suppression) for the next step in the workflow.

## Related RepMail guides

- [ARC Chain Validation Failure: Find the First Broken Instance](/repmail/learn/infrastructure/arc-chain-first-failure)
- [BIMI SVG Validation Failures: A Preflight Checklist](/repmail/learn/infrastructure/bimi-svg-validation-failures)


## Sources

[1]: https://support.google.com/mail/answer/81126?hl=en "Google sender or Workspace documentation"
[2]: https://www.rfc-editor.org/rfc/rfc7489 "IETF RFC reference"
[3]: https://learn.microsoft.com/en-us/defender-office-365/email-authentication-dkim-configure "Microsoft documentation"
