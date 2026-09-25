---
product: repmail
academy: outreach
contentType: guide
slug: dkim-selector-ownership-register
title: "DKIM Selector Ownership Register"
description: "DKIM Selector Ownership Register — Teams need selector, domain, signer, provider, key custodian, rotation date, and decommission status tracked."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","dkim","selector","ownership","register"]
assets:
  - type: table
    title: "Selector Ownership Decision Table"
    content:
      headers: ["Condition","Immediate action","Evidence to collect","Stop condition"]
      rows:
        - ["Selector exists in DNS but no owner listed","Pause related sending flows; assign interim custodian","DNS TXT output, message headers showing selector, request for custodian access","Custodian assigned and demonstrates access"]
        - ["Owner listed but DNS not controlled by listed DNS provider","Open ticket with DNS provider and signer; restrict changes until resolved","DNS zone delegation record, provider account evidence","DNS provider confirms control for the specified _domainkey subrecord"]
        - ["Planned rotation overdue and not executed","Notify custodian and escalate to security owner; schedule forced rotation window","Rotation request ticket, signing logs to show current key used","Rotation completed and new public key published in DNS"]
        - ["Selector used by multiple unrelated signers","Disallow new signers on that selector; plan selector segregation","Message header samples identifying signer, signer configs","Selectors segregated or shared use justified with short rotation cycle"]
        - ["Selector DNS record removed but register shows active","Investigate whether signing continues; recover from backups or reissue keys","DNS historical snapshots, mail logs showing signed messages","Register updated to decommissioned and sending systems stop using selector"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Teams need selector, domain, signer, provider, key custodian, rotation date, and decommission status tracked."
  - "Distinct from selector rotation/delegation articles: ongoing ownership inventory across senders."
  - "authentication inventory; vendor offboarding"
commonMistakes:
  - "Skipping this check: Create one row per selector+domain with: selector, domain, signer identity, DNS provider, key custodian, key algorithm/length, creation and planned rotation dates, and decommission status."
  - "Skipping this check: Discover selectors using DNS queries (selector._domainkey.DOMAIN TXT) and by auditing signing configurations and vendor consoles."
  - "Skipping this check: Verify DNS zone control by requesting a test TXT change or confirmation from the DNS zone administrator."
faqs:
  - question: "How often should we rotate DKIM keys recorded in the register?"
    answer: "Rotate according to risk and key type: many teams choose 12–36 months for RSA keys; more frequent rotation is reasonable for smaller keys, high-risk comms, or where selectors are shared. The register should capture the planned rotation date and trigger a 30-day reminder. This guidance is operational—specific rotation frequency can depend on your threat model and vendor constraints."
  - question: "If a selector in DNS has an unknown signer, what immediate steps should we take?"
    answer: "Treat it as a potential orphan: (1) pause or restrict dependent sending flows if feasible, (2) query headers for message samples using that selector, (3) attempt to contact the DNS zone administrator to confirm intent, and (4) assign an interim custodian to either rotate or remove the key. Record all steps and evidence in the register; DNS presence alone does not prove active authorized use."
  - question: "Can DNS TXT public keys prove private key ownership?"
    answer: "No. The public key in DNS proves the keypair published for verification but does not prove who holds the private key. Use signer configuration, access logs, and custodian attestations as complementary evidence. RFC 6376 defines how DKIM uses the public key but does not provide a mechanism to prove private key custody beyond operational artifacts [1]."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Maintain a live register that maps each DKIM selector to its owning domain, signer identity (software or team), DNS provider, key custodian, planned rotation date, and decommission status. This single-table inventory reduces the risk of unknown signers, forgotten keys, and uncontrolled DKIM continuance across senders.

## What belongs in the selector ownership register

Record one row per selector+domain pair. Required fields: selector name, signing domain (d=), signer identity (application, service, or team that performs signing), DNS provider/zone administrator who controls the selector TXT record, key custodian (person or role who holds private key access), key length and algorithm, creation and planned rotation dates, and decommission status with an expected removal date.
Decision boundary: include only selectors that are published in DNS or expected to be published within 30 days; do not include ephemeral test selectors that never reach DNS. Evidence limits: use DNS TXT records and key management logs as primary evidence; do not rely solely on memory or informal chat records.

## How to collect and verify entries

Sequence: discover selectors by querying each sending domain's DNS for TXT records named selector._domainkey.example and by reviewing signing software configurations and vendor control panels. Verify ownership by matching the public key in DNS to the private key or signing identity in the signer’s environment; request the key custodian to sign or demonstrate access if necessary.
Practical checks: confirm DNS zone owner can modify the specific _domainkey subrecord; confirm the signer can present configuration or logs showing use of that selector. Limitations: you cannot verify private keys remotely—verification requires cooperation from the signer or custodian.

## Rotation and decommission governance

Define rotation policy per risk profile: typical rotation cadence is 12–36 months for RSA keys, shorter for lower-bit keys or high-risk environments. Record a planned rotation date and a notification owner who must initiate rotation 30 days prior to that date. For decommissioning, require (1) removing the selector DNS record and (2) updating the register to archived with decommission date and evidence (DNS removal confirmation).
Decision boundary: if a selector is reused across multiple signers, treat it as high-risk and require rotation or reallocation; do not permit indefinite reuse without documented justification and a shorter rotation interval.

## Operational controls and evidence to keep

Store proof artifacts with each entry: DNS query output showing the TXT record, the public key text, signer configuration snippet referencing the selector, ticket or approval for key generation, and a change log for rotations/decommissions. Evidence limits: public DNS records show current state but not past private-key possession—retain change tickets and versioned configuration files to demonstrate historical ownership.
Practical sequence: attach DNS snapshot, signer config, and custodian acknowledgement to the register entry whenever an entry is created or modified; require at least one named custodian for every selector.

## Integration points and handoffs

Make the register a required step in vendor onboarding and offboarding: vendors that sign messages must provide selector names, DNS zone contacts, and key custodians before production mail flows. During vendor offboarding, the register drives the checklist to stop signing, remove DNS records, and validate message pipelines no longer include the selector.
Evidence limits and uncertainty: vendor UIs and provider policies vary—use the register as the authoritative record within your organization but expect to adapt the onboarding checklist to each vendor’s control model.

## Practical checklist

- [ ] Create one row per selector+domain with: selector, domain, signer identity, DNS provider, key custodian, key algorithm/length, creation and planned rotation dates, and decommission status.
- [ ] Discover selectors using DNS queries (selector._domainkey.DOMAIN TXT) and by auditing signing configurations and vendor consoles.
- [ ] Verify DNS zone control by requesting a test TXT change or confirmation from the DNS zone administrator.
- [ ] Document proof artifacts: DNS TXT snapshot, public key text, signer configuration, and a custodian acknowledgement.
- [ ] Schedule rotation reminders 30 days before planned rotation; require custodian confirmation of key rollover.
- [ ] When decommissioning: confirm removal of the DNS TXT record, update the register with decommission date, and attach DNS proof of removal.
- [ ] Flag selectors used by multiple signers and mandate reassignment or accelerated rotation.
- [ ] Include selector register review as part of vendor offboarding and domain ownership transfer.
- [ ] Keep register change history and exportable snapshots for audits.

## Where RepMail fits

Use this guide as an operational checklist and decision aid when preparing outbound authentication inventories, onboarding or offboarding senders, and auditing signing ownership. The register maps directly to tasks in authentication inventory and vendor offboarding workflows: it tells operators what to verify, when to rotate or remove selectors, and what evidence to capture. Do not treat the register as a technical enforcement mechanism—use it as authoritative operational data to drive changes in DNS, vendor configurations, and change control.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Reply ownership SLA for multi-client outbound programs](/repmail/learn/outreach/reply-ownership-sla-multi-client-outbound)
- [Unsubscribe Request Evidence Register](/repmail/learn/outreach/unsubscribe-request-evidence-register)


## Sources

[1]: https://www.rfc-editor.org/rfc/rfc6376 "IETF RFC reference"
