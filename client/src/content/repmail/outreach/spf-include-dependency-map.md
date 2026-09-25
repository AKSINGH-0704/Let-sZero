---
product: repmail
academy: outreach
contentType: guide
slug: spf-include-dependency-map
title: "SPF Include Dependency Map"
description: "SPF Include Dependency Map — Operators need to map authorized services, nested includes, lookup contributors, and owner contacts before editing SPF."
authorSlug: repmail-team
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
tags: ["outreach","spf","include","dependency","map"]
assets:
  - type: table
    title: "SPF Include Dependency Diagnostic Table"
    content:
      headers: ["Check","What to look for","Action if failed","Owner"]
      rows:
        - ["Include target resolves to TXT with SPF","TXT includes an SPF record with mechanisms","Open vendor ticket; mark include as high risk; consider replacement","Vendor / DNS admin"]
        - ["Nested include count","Number of unique include: domains found during recursion","Limit or flatten includes; request vendor to provide explicit IP ranges","Platform owner"]
        - ["Lookup count per node","Sum of A/MX/include/ptr mechanisms that trigger DNS queries","Reduce mechanisms, change to ip4/ip6 entries, or split sending domains","Infra engineer"]
        - ["Owner contact documented","Registrar/vendor support ticket or signed email exists","Escalate to account manager; block change until confirmed","Sourcing/Legal"]
        - ["Recent verification","Last_verified date within policy window (e.g., 90 days)","Re-run mapping and update evidence before change","Change owner"]
featured: false
collections: ["outreach-measurement"]
learningPaths: []
keyTakeaways:
  - "Operators need to map authorized services, nested includes, lookup contributors, and owner contacts before editing SPF."
  - "Distinct from lookup-limit troubleshooting: planning artifact for dependency visibility."
  - "SPF composition; infrastructure audit"
commonMistakes:
  - "Skipping this check: Fetch current domain TXT/SPF and extract top-level mechanisms."
  - "Skipping this check: Recursively resolve every include: target until no new includes appear or a documented cap is reached."
  - "Skipping this check: For each node, record mechanisms, DNS lookup type counts, and total lookup contribution."
faqs:
  - question: "How many nested includes are safe before I risk an outage?"
    answer: "The protocol behavior is bounded by lookup limits described in RFC 7208; many implementations treat 10 DNS lookups as the practical limit during SPF evaluation [1]. That said, the safe number depends on how many A/MX/ptr lookups each include expands into. Measure total expected lookups using your map; flag and reduce when total approaches 10. For provider-specific behavior (timeouts, other limits), record vendor responses—uncertainty remains across receivers and resolvers."
  - question: "If an included domain changes ownership, what immediate steps should I take?"
    answer: "Treat the include as compromised or unreliable: (1) remove or replace the include in a staged deploy, (2) add explicit ip4/ip6 ranges if available, (3) open an account-manager escalation with the vendor, and (4) monitor delivery and DNS query failure metrics closely after the change. Keep the previous SPF value ready to revert if you observe failures."
  - question: "Can I rely on WHOIS for owner contact?"
    answer: "WHOIS is a useful starting point but is often privacy-masked or out-of-date. Use WHOIS plus registrar records, vendor support tickets, and signed emails as evidence. If ownership remains unclear after these steps, classify the node as high risk and avoid making changes that depend on it."
nextStep:
  label: "Continue with A/B Testing Cold Email With Small Samples"
  href: "/repmail/learn/outreach/ab-testing-cold-email-small-samples"
  description: "Use the adjacent guide to continue the investigation or implementation."
---

Map every include and nested include before editing SPF. Create an auditable graph of authorized senders, the DNS records they depend on, and a current owner/contact for each node so you can predict lookup growth, identify fragile delegation, and avoid outages when changing the SPF string.

## What this map is and why it matters

The SPF Include Dependency Map is a planning artifact: a graph and checklist that shows every include: token in your SPF, every nested include those records reference, and the DNS record types (A, MX, include, redirect, ptr, ip4, ip6) that contribute to SPF lookups. It is forward-looking — its goal is to reveal dependencies and ownership before you alter the published SPF string.
Decision boundary: this guide covers mapping and vetting dependencies prior to changes; it does not replace live SPF record syntax validation or DNS propagation monitoring. The RFC outlines SPF behavior and lookup limits and is the authoritative protocol reference for included mechanisms and nested lookups [1].
Evidence limits: RFC 7208 describes lookup behavior and mechanism semantics but does not enumerate vendor practices or rate limits for DNS servers. For provider-specific uncertainty (e.g., how many nested includes a vendor will use in practice), contact the vendor and record their response.

## Step-by-step sequence to build the map

1) Extract: fetch the current TXT records for the domain (and for include targets) and extract the top-level SPF string. 2) Expand includes: for every include:example.com found, resolve example.com’s TXT/SPF records and list all mechanisms the record uses. 3) Recurse: repeat expansion for any includes found during step 2 until no new include targets appear. 4) Catalog record types and IP sources: record each node’s mechanisms (ip4/ip6, a, mx, include, redirect, ptr) and count the DNS lookups each mechanism triggers.
Practical sequence: run steps in a controlled environment (local DNS resolver with query logging, or a read-only script) to avoid accidental cache poisoning or spurious updates. Stop condition: when a pass produces no new include targets or when you reach a predefined recursion cap (document why you stopped).

## Decision rules and failure modes

Decision rule: if a single include chain causes more than 10 DNS lookups (or if total lookups approach 10 when combined with all other mechanisms), flag the change for staged rollout and vendor contact. The RFC defines a 10-lookup behavior as the protocol limit for SPF evaluation; implementations may behave differently at or beyond that limit [1].
Common failure modes: (a) Hidden nested includes that expand unexpectedly after vendor changes; (b) Delegated domains whose owners change and remove old mechanisms; (c) PTR usage or too many MX/A lookups that multiply on each include. For each failure mode, record the owner contact and a rollback plan (e.g., revert to a reducing SPF string or use explicit ip4/6 entries).

## Ownership, contributor lookup, and escalation

For every node in the map, capture administrative contact information: DNS registrar contact and vendor account owner. If the include domain differs from the vendor’s published domain, require a vendor statement clarifying whether that include is stable and who owns it. Practical sequence: attempt WHOIS and registrar query, then vendor support ticket, then account manager escalation if unresolved.
Decision boundary: do not rely on generic support articles as ownership evidence. A ticket, signed email, or contractual clause that names the domain owner or responsibility for SPF is acceptable evidence. If you cannot obtain ownership confirmation, treat the node as high risk and consider removing or reducing reliance on that include.

## How to present and store the map

Produce two artifacts: (1) a human-readable diagram (graph nodes for domains, edges for includes) with annotated lookup counts and owner contacts; (2) a machine-readable manifest (CSV/JSON) with columns: node, mechanisms, lookup_count, owner_contact, last_verified date, verification_evidence (ticket ID or email). The manifest must be version-controlled and linked to the change ticket for any SPF modification.
Practical sequence: update the map as part of any vendor onboarding/offboarding and during quarterly audits. Stop conditions for a verification pass: all nodes have owner contact and a last_verified date within your policy window (e.g., 90 days) or are marked as deprecated with a mitigation plan.

## Testing and QA before publishing SPF edits

Before pushing a DNS change, run these tests: syntactic validation of the SPF string, simulated evaluation against common resolvers using your expanded include set, and a dry-run in an isolated resolver to estimate lookup counts and detect timeouts. Decision boundary: simulated evaluation cannot fully predict third-party DNS behavior, so use it to find obvious issues but rely on staged deploys and monitoring for live behavior.
Evidence limits: RFC 7208 describes how receivers should treat too many lookups, but SMTP receivers and intermediate resolvers may differ in behavior. Document which receivers you tested against and capture resolver time-to-first-byte and timeout behavior for troubleshooting.

## Practical checklist

- [ ] Fetch current domain TXT/SPF and extract top-level mechanisms.
- [ ] Recursively resolve every include: target until no new includes appear or a documented cap is reached.
- [ ] For each node, record mechanisms, DNS lookup type counts, and total lookup contribution.
- [ ] Collect and document DNS registrar contact, vendor support ticket ID, and account owner for each include domain.
- [ ] Calculate total expected SPF DNS lookups; flag if near or above 10 and plan mitigation.
- [ ] Produce graph diagram and manifest (CSV/JSON) and commit them to version control linked to the change ticket.
- [ ] Run syntactic SPF validation and a simulated evaluation against representative resolvers.
- [ ] Coordinate a staged DNS deployment and monitor DNS query failure rates and bounce/backscatter after change.
- [ ] Archive verification evidence (tickets/emails) and schedule the next verification date.

## Where RepMail fits

Operators can use this guide as a pre-deployment checklist and a decision aid in outbound-change workflows. The map and manifest are suitable artifacts to attach to a RepMail change ticket or operational runbook to demonstrate due diligence, escalation path, and rollback criteria without implying any specific RepMail product behavior.

Continue with [A/B Testing Cold Email With Small Samples](/repmail/learn/outreach/ab-testing-cold-email-small-samples) for the next step in the workflow.

## Related RepMail guides

- [Agency knowledge transfer from departing account owner](/repmail/learn/outreach/agency-departing-account-owner-knowledge-transfer)
- [Agency permission matrix for client, contractor, and vendor roles](/repmail/learn/outreach/agency-permission-matrix-client-contractor-vendor)


## Sources

[1]: https://www.rfc-editor.org/rfc/rfc7208 "IETF RFC reference"
