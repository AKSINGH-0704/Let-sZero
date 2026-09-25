---
product: repmail
academy: infrastructure
contentType: guide
slug: bimi-vmc-vs-cmc-evidence
title: "BIMI VMC vs CMC: Evidence Needed Before Choosing a Certificate"
description: "BIMI VMC vs CMC: Evidence Needed Before Choosing a Certificate — Brand and security teams evaluating BIMI certificate paths."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["infrastructure","dns","bimi","email","vmc","cmc","evidence"]
assets:
  - type: table
    title: "Certificate decision diagnostic"
    content:
      headers: ["Condition to check","Evidence required","If true — next step","If false — next step"]
      rows:
        - ["Target provider requires VMC","Provider documentation or support confirmation stating VMC required","Initiate VMC issuance and provide trademark docs","Confirm if provider accepts CMC or alternative evidence; if yes, prepare CMC"]
        - ["You have a matching registered trademark","Trademark registration showing owner name and mark image","Proceed with VMC issuer application","Consider CMC; collect organization identity documents and confirm provider acceptance"]
        - ["SVG matches BIMI spec","SVG validated against BIMI technical specifications [1]","Submit with certificate request","Fix SVG (design owner) before applying"]
        - ["DMARC in enforcement (quarantine/reject)","DMARC TXT record and alignment test results","Publish BIMI record after certificate issuance","Bring DMARC to enforcement before publishing or scope down sending domain"]
        - ["CA/issuer vetting timeline acceptable","Issuer SLA and procurement approval","Proceed to certificate purchase","Evaluate alternative issuers or choose CMC route"]
        - ["Provider-specific acceptance unknown","No clear public policy","Open support ticket and obtain written clarification","Treat as unknown; avoid issuance until clarified or proceed with risk capture"]
featured: false
collections: ["email-infrastructure-decisions"]
learningPaths: ["email-infrastructure"]
keyTakeaways:
  - "Brand and security teams evaluating BIMI certificate paths"
  - "Distinct from BIMI readiness: compares certificate evidence and governance requirements."
  - "Links BIMI glossary/readiness to brand-domain change management."
commonMistakes:
  - "Skipping this check: Map target mailbox providers and record whether they demand VMC or accept CMC (check provider docs and support channels) [2]."
  - "Skipping this check: Confirm trademark registration details: registration number, jurisdiction, owner name, and whether the mark covers the logo variant you plan to use [1]."
  - "Skipping this check: Prepare a BIMI-compliant SVG and validate it against BIMI technical guidelines before submitting to a CA [1]."
faqs:
  - question: "If I have a trademark but a provider accepts both VMC and CMC, which should I choose?"
    answer: "Prefer the certificate type that aligns with internal risk and procurement constraints. A VMC gives explicit trademark-based proof useful for governance records, but costs and vetting time may be higher. If the provider accepts both and you cannot meet VMC vetting easily, a CMC-equivalent certificate plus documented provider acceptance can be sufficient. State provider acceptance in writing when feasible [1]."
  - question: "Will a VMC or CMC guarantee that my logo displays in recipients’ inboxes?"
    answer: "No. Certificates are only one input; mailbox providers independently decide whether to display BIMI logos and can apply additional policies. A correctly issued certificate and correct BIMI DNS record are necessary but not sufficient for display; consult provider documentation and test with target inboxes [2]."
  - question: "What should I do if a CA rejects our VMC application for trademark mismatch?"
    answer: "Record the exact rejection reason and compare the trademark owner name and mark image against the request payload. Options include correcting the request to match the registration, obtaining a corrected trademark record if legally possible, or switching to a CMC-equivalent path if the provider accepts it. Keep legal and procurement involved for any document changes."
nextStep:
  label: "Continue with Amazon SES Account-Level Suppression: How to Use It"
  href: "/repmail/learn/infrastructure/aws-ses-account-level-suppression"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Use VMC (Verified Mark Certificate) evidence when you control the trademark and can meet stricter verification and governance; use CMC (Certified Mark Certificate) evidence when a lighter, organizationally-focused proof path suffices or when a VMC provider is not available. Evaluate which certificate type the BIMI-accepting mailbox providers require or prefer, list the exact documentary and DNS steps you can complete, and stop when you cannot produce the certificate-level evidence required by the target mailbox policies.

## Direct answer and decision boundary

VMCs assert a verified trademark plus brand control and are intended where the mailbox provider or BIMI policy explicitly requires trademark-based proof; CMCs focus on verified control of the logo and domain using organizational or certificate authority attestations and can be acceptable where providers accept certificate evidence without trademark validation. The decision boundary is: do you have a registered trademark that you can document and validate with a VMC issuer within the issuer’s governance? If yes and your target providers require it, pursue a VMC; if not, assess CMC acceptance or negotiate alternate evidence.

## What each certificate evidences and governance limits

VMCs are tied to trademark ownership and a matching SVG mark; the issuing process requires trademark checks and follows BIMI Group and issuing CA technical specifications [1]. That makes VMCs stronger where trademark provenance matters but also adds acquisition steps and possible delays. CMCs (the term used in BIMI discussions for certificates that attest mark control without trademark validation) can be issued on organizational or domain control evidence; they are governed more by the CA’s identity vetting and the mailbox provider’s acceptance rules [1]. Evidence limits: neither certificate alone guarantees delivery or display—display depends on mailbox provider policies and DNS/BIMI record correctness [2].

## Sequence for making a defensible certificate decision

1) Inventory requirements: list target mailbox providers and whether they require VMC specifically, accept CMC, or have other BIMI policies; consult provider docs (e.g., Google guidance) and be prepared for change [2]. 2) Triage evidence you can assemble: trademark registration (jurisdiction, registration number, owner name), brand asset SVGs, domain WHOIS/DMARC records, and corporate identity documents. 3) Choose a path: if you can provide trademark proof and the provider requires VMC, start VMC issuance; if not, prepare CMC evidence and confirm acceptance with target providers. 4) Stop conditions: if you cannot obtain required trademark documents, or the issuer’s vetting timeline or fees are unacceptable, do not attempt VMC and instead document CMC acceptance or pursue alternative branding strategies.

## Practical implementation steps and ownership

Assign owners: legal (trademark documents), brand/design (SVG logo preparation), security/IT (DMARC, DNS BIMI TXT record), and procurement (certificate purchase and CA SLAs). Prepare an SVG that matches BIMI technical specs and test it locally; incorrect SVGs commonly fail issuer validation. For the CA process, supply precisely the trademark registration text and chain of custody details for VMC, or organization incorporation and authorization documents for a CMC-like certificate. Keep a record of rejection reasons from issuers and providers—those are actionable for next attempts [1].

## Evidence limits, verification checks, and when to re-evaluate

Evidence accepted by one mailbox provider may be rejected by another; provider policies evolve and should be treated as directional until you receive explicit acceptance or rejection [2]. Common verification failure modes: mismatched trademark owner name vs certificate request, SVG rendering errors, DMARC alignment failures, or CA vetting that requires additional organizational proof. Re-evaluate after a failed issuance or provider rejection: can legal amend registrations? Can design fix the SVG? If not, switch to CMC or re-prioritize which inboxes you pursue.

## Practical checklist

- [ ] Map target mailbox providers and record whether they demand VMC or accept CMC (check provider docs and support channels) [2].
- [ ] Confirm trademark registration details: registration number, jurisdiction, owner name, and whether the mark covers the logo variant you plan to use [1].
- [ ] Prepare a BIMI-compliant SVG and validate it against BIMI technical guidelines before submitting to a CA [1].
- [ ] Ensure DMARC is set to enforcement (quarantine or reject) for the sending domains you will list in the BIMI record; confirm DKIM and SPF alignment.
- [ ] Collect corporate ID documents and authorized signatory evidence for certificate requests; assign legal to respond to CA vetting queries.
- [ ] Request a written acceptance statement from each target mailbox provider if they will accept a CMC in place of a VMC (save correspondence).
- [ ] Track issuer timelines, fees, and reissue policies; include these in procurement decisions.
- [ ] Log all rejection messages and the exact cause from issuers or providers; use these to decide whether to re-submit or change certificate type.
- [ ] Plan a rollout and rollback: stage BIMI publishing per sending domain and monitor brand display before broader rollout.

## Where RepMail fits

Use this guide as a practical decision aid: assign owners for trademark, SVG, DMARC, and procurement tasks; follow the checklist to create an audit trail to inform outbound brand and domain changes. The steps and diagnostic table can be integrated into outbound rollout plans or change requests so operators can stop or pivot when evidence gaps appear.

Continue with [Amazon SES Account-Level Suppression: How to Use It](/repmail/learn/infrastructure/aws-ses-account-level-suppression) for the next step in the workflow.

## Related RepMail guides

- [BIMI SVG Validation Failures: A Preflight Checklist](/repmail/learn/infrastructure/bimi-svg-validation-failures)
- [ARC Chain Validation Failure: Find the First Broken Instance](/repmail/learn/infrastructure/arc-chain-first-failure)


## Sources

[1]: https://bimigroup.org/verified-mark-certificates-vmc-and-bimi/ "BIMI Group technical guidance"
[2]: https://bimigroup.org/implementation-guide/ "BIMI Group technical guidance"
[3]: https://support.google.com/mail/answer/81126?hl=en "Google sender or Workspace documentation"
