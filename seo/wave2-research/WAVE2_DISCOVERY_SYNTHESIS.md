# Wave 2 Discovery Synthesis

## Reducer totals

- Candidate universe parsed: **493** across 15 cluster reports.
- Rejected for duplication/cannibalization (against the 414-article corpus, prior Wave 1 decisions, or another Wave 2 candidate): **2**.
- Rejected for low value/weak evidence: **203**.
- Initial selected: **288**.

## Cluster breakdown

| Cluster | Parsed candidates | Selected |
|---|---:|---:|
| AI-assisted outreach and personalization | 40 | 14 |
| Advanced email and deliverability glossary | 36 | 13 |
| Agency outreach workflows | 38 | 27 |
| Cold email copy and message quality | 41 | 26 |
| Compliance and privacy operations | 37 | 29 |
| Cross-cluster emerging deliverability gaps | 39 | 37 |
| Email architecture and platform comparisons | 1 | 1 |
| Email authentication and DNS | 37 | 12 |
| Email infrastructure and sending | 36 | 21 |
| Lead generation and account qualification | 38 | 15 |
| List quality and suppression | 40 | 20 |
| Outreach templates and operational resources | 38 | 25 |
| Provider-specific deliverability | 36 | 24 |
| Reputation recovery and incident response | 36 | 24 |

## Evidence classes among selected records

| Evidence class | Selected | Interpretation |
|---|---:|---|
| `observed_user_problem` | 97 | First-party, standards, or observed operational evidence; not a demand metric. |
| `repeated_competitor_coverage` | 44 | Directional SERP/competitor or utility signal; no volume or traffic was supplied. |
| `authoritative_first_party` | 40 | First-party, standards, or observed operational evidence; not a demand metric. |
| `serp_observed` | 23 | First-party, standards, or observed operational evidence; not a demand metric. |
| `authoritative_guidance` | 18 | First-party, standards, or observed operational evidence; not a demand metric. |
| `first_party_documentation` | 17 | First-party, standards, or observed operational evidence; not a demand metric. |
| `authoritative_first-party` | 10 | First-party, standards, or observed operational evidence; not a demand metric. |
| `serp_observed;_observed_user_problem` | 9 | First-party, standards, or observed operational evidence; not a demand metric. |
| `first_party_change` | 6 | First-party, standards, or observed operational evidence; not a demand metric. |
| `visible_serp_proxy` | 5 | Directional SERP/competitor or utility signal; no volume or traffic was supplied. |
| `measured` | 4 | First-party, standards, or observed operational evidence; not a demand metric. |
| `repeated_competitor_coverage;_observed_user_problem` | 4 | First-party, standards, or observed operational evidence; not a demand metric. |
| `first_party_plus_authoritative` | 3 | First-party, standards, or observed operational evidence; not a demand metric. |
| `observed_user_problem;_unmeasured` | 3 | First-party, standards, or observed operational evidence; not a demand metric. |
| `authoritative_standard` | 2 | First-party, standards, or observed operational evidence; not a demand metric. |
| `serp_observed;_authoritative_standard` | 1 | First-party, standards, or observed operational evidence; not a demand metric. |
| `first_party_plus_observed_problem` | 1 | First-party, standards, or observed operational evidence; not a demand metric. |
| `serp_observed;_repeated_competitor_coverage` | 1 | First-party, standards, or observed operational evidence; not a demand metric. |

## Measured versus unmeasured evidence

**Measured demand metrics: 0.** The supplied reports expose no keyword volume, traffic, conversion, ranking, or comparable demand dataset. 4 selected records carry an evidence label containing `measured`; 284 are unmeasured or supported by qualitative first-party, standards, observed-problem, SERP-proxy, competitor, or workflow evidence. “Measured” in a report is treated as a source/report-field label, not proof of search demand.

## Caveats

The reports were discovery inputs, not independent demand studies. Selection is intentionally conservative on exact and near-exact title/slug collisions, parent-child cannibalization, cosmetic variants, competitor-title clones, and generic long-tail wording. Semantic similarity screening is lexical and editorial review is still required before publication, especially where two topics share provider, protocol, or incident vocabulary. Regulatory and provider guidance can change; revalidate sources and legal scope before publishing. No URL, priority, traffic, or conversion claim is implied by selection status.

## Method

Each candidate was normalized by title, slug, intent, audience/problem, evidence, and asset job; compared to all current corpus routes/titles/slugs and all Wave 1 selected, rejected, and merged records; then compared pairwise with other Wave 2 candidates. A record was retained only when its evidence and proposed asset indicated a standalone troubleshooting, implementation, governance, decision, reference, or test job. The JSON file contains only retained records.
