# RepMail Resource Center — Wave 2 Post-Deployment Release Verification

**Verification date:** 25 September 2026 (UTC)
**Production:** `https://www.letszero.in`
**Production rollout main head:** `52dbafea7d83cd3e5d23bd0457eb3ca564388ddf`
**Final documentation main head:** `6499d4148eed452314c211a61d5f47bb1aa70d30`
**Wave 2 implementation commit:** `20fb942e9c1d8daffdc2d4517a9640771cfe30be`
**Railway release path:** Git push to `origin/main`; production rollout observed through public readiness checks.

## Deployment readiness

Immediately after the push, the public site still served the prior baseline of 455 sitemap URLs and 414 RSS items while the rollout was transitioning. A bounded readiness monitor checked the public sitemap, RSS, and a new Wave 2 URL. Attempts 1–9 continued to report the prior baseline. Attempt 10 at **2026-09-25 10:20:28 UTC** returned **616 sitemap URLs**, **575 RSS items**, and HTTP 200 for the new article with canonical and JSON-LD present. This is the observed production cutover point.

## Complete HTTP crawl

The final retry-aware crawl covered every URL listed in the production sitemap and every retained Wave 2 article URL.

| Check | Result |
|---|---:|
| Sitemap HTTP status | **200** |
| Sitemap URL count | **616** |
| URLs crawled | **616 / 616** |
| URLs returning HTTP 200 | **616 / 616** |
| URLs with canonical, title, description, and JSON-LD | **616 / 616** |
| RSS HTTP status | **200** |
| RSS item count | **575** |
| Robots HTTP status | **200** |
| Robots includes sitemap reference | **Yes** |
| New Wave 2 URLs expected | **161** |
| New Wave 2 URLs crawled | **161 / 161** |
| New Wave 2 URLs returning HTTP 200 | **161 / 161** |
| New Wave 2 URLs with canonical, title, description, JSON-LD, and BreadcrumbList | **161 / 161** |
| Transient retries required | **1** |
| Final route failures | **0** |

The one retry was transient and passed on retry. The first crawler version incorrectly required article breadcrumbs on non-article marketing/legal routes; the corrected final gate applies the breadcrumb assertion to the new article set and applies canonical/title/description/JSON-LD assertions to every sitemap route.

The machine-readable crawl output is stored in `seo/wave2-research/WAVE2_PRODUCTION_HTTP_VERIFICATION.json`.

## Browser and rendered-behavior verification

The live Resource Center homepage hydrated successfully and visibly reported **575 in-depth guides across 8 topics**. The top navigation, search entry point, curated collections, learning paths, latest-guide section, and newly published article cards were visible.

The live client-side search dialog was opened without submitting any external action. A query for **Gmail** returned multiple results including the new Wave 2 guide **Accepted by Gmail, Missing at Outlook: Provider Handoff Investigation** and **Gmail Postmaster Snapshot Log**. The search dialog showed “Nothing found” for overly specific multi-token queries that did not match the search component’s token behavior; this was not treated as a system failure because broad and topic-specific searches returned the new assets and direct routes were valid.

A new Wave 2 article, **Accepted by Gmail, Missing at Outlook: Provider Handoff Investigation**, rendered with the existing article template, breadcrumbs, academy link, author, date, key takeaways, practical decision table/checklist, source links, RepMail relevance section, continue-learning link, related guides, and previous/next navigation. Its browser console contained no output or runtime/CSP errors.

The existing **Deliverability Diagnostics** collection rendered with **117 guides** and visibly included newly added diagnostic pages. The existing **Provider Deliverability Diagnostics** learning path rendered with **114 steps** and visibly included the expanded steps. An existing pre-Wave 2 article, **Provider-Split Reporting for Outbound Campaigns**, rendered with its original template, related content, learning-path navigation, and source structure. The learning-path browser console also contained no output or runtime/CSP errors.

## Headers, CSP, and protected behavior

Public HTTP responses included the existing content security policy header. No production signup, purchase, authentication, consent, analytics replay, ad click, campaign change, budget change, bid change, conversion setting change, or payment action was performed. The release scope contains no changes to protected analytics, consent, authentication, payment, pricing, campaign, Google Ads, attribution, or application-architecture files.

`Blogs.docx` remained immutable. Its SHA-256 audit value is stored in `seo/wave2-research/BLOGS_DOCX_SHA256.txt`; the file itself was not copied into, modified, migrated, or replaced by the release.

## Final production result

**Production verification: PASS for the Resource Center release.** All 616 sitemap URLs and all 161 new Wave 2 article URLs were reachable and met the final HTTP metadata gates. The live homepage, new article template, existing article template, collection, learning path, search, related-content display, hydration, console, CSP, sitemap, RSS, and robots checks were observed successfully.

Google Ads, consent, attribution, authentication, pricing, payment, and campaign behavior are **UNVERIFIED by functional replay** because the release explicitly did not perform real conversion or account actions. Their protected source scope was verified unchanged.

**Remaining operational note:** Search demand evidence remains qualitative. No measured volume, ranking, traffic, CTR, conversion, or keyword-difficulty dataset was available for this wave, and none is claimed.


---

# Wave 3 Release 1 — Post-Deployment Release Verification

**Verification date:** 2026-10-25

**Production rollout commit:** `5fdd9881acb28985cfd844515105d24a6f02bbc4`

## Production counts

The Railway-triggered rollout was observed transitioning from the previous baseline of 616 sitemap routes / 575 RSS items to the Release 1 state. Final production counts are:

- **587 published RepMail articles**
- **628 sitemap/public routes**
- **587 RepMail RSS items**
- **17 collections and 6 learning paths**; no new collection or path system was introduced
- **12 new Release 1 articles** live

## Complete HTTP crawl

A bounded retrying crawl checked every URL in the live sitemap and every new Release 1 URL. The machine-readable evidence is `seo/wave3-research/WAVE3_RELEASE1_PRODUCTION_VERIFICATION.json`.

- Sitemap HTTP status: **200**
- Routes crawled: **628/628**
- Route failures: **0**
- New Release 1 URLs: **12/12 HTTP 200**
- Every crawled route had a title: **628/628**
- Every crawled route had a canonical: **628/628**
- Every crawled route had JSON-LD: **628/628**
- RSS HTTP status: **200**, item count **587**
- `robots.txt` HTTP status: **200**

## Representative rendered production checks

- Resource Center homepage `/repmail/learn/`: hydrated successfully; rendered the 587-guide count, 8 academy navigation, latest Release 1 guides, collections, paths and search control.
- New DMARC guide `/repmail/learn/deliverability/dmarc-checker-policy-alignment`: rendered title, description, breadcrumbs, key-takeaway checklist, source links, continue-learning CTA, related content and previous/next links.
- New infrastructure guide `/repmail/learn/infrastructure/email-api-202-accepted-not-delivered`: rendered title, description, breadcrumbs, practical evidence timeline, source links, CTA and related content.
- Deliverability Diagnostics collection: rendered its expanded collection membership and the new diagnostic guides.
- Provider Deliverability Diagnostics learning path: rendered the path and its expanded 118-step navigation, including the new DMARC step.
- Search: broad read-only query `DMARC` returned the new `DMARC Checker: Read Policy, Alignment, and Reports` result. A longer natural-language query returned no result, but the indexed article appeared correctly for its core topic term; no search implementation change was made.
- Metadata script inspection on the new API guide: canonical present, **4 JSON-LD blocks**, visible breadcrumb navigation, correct title, and no CSP meta override.
- Browser console: **no console output/errors** on the homepage, new article and final representative article checks; no CSP violation was observed.

## Preservation and safety checks

- No signup, purchase, campaign, ad-click, Google Ads setting, conversion, consent, attribution, payment or auth action was performed.
- Protected analytics, consent, authentication, payment, pricing and campaign files were outside the Release 1 diff.
- Existing Resource Center architecture was reused: canonical Markdown loader/schema, article template, asset renderer, collections, learning paths, related content, JSON-LD, prerendering, sitemap, RSS and search.
- `Blogs.docx` remained immutable and was not modified, migrated, overwritten or used as current product truth.
- No production code or architecture redesign was introduced.

## Final result

**PASS — Wave 3 Release 1 is live and production-verified.** The 12 retained articles are crawlable, rendered, internally connected, represented in navigation, included in sitemap/RSS output, and free of observed route, metadata, hydration, console or CSP regressions.


---

# Wave 3 Release 2 — Post-Deployment Release Verification

**Verification date:** 2026-10-25
**Production:** `https://www.letszero.in`
**Content rollout commit:** `7584ff68d972d913a3ab219e975733f217cca363`

## Production counts

The Railway-triggered rollout was observed transitioning from the Release 1 baseline of 628 sitemap routes / 587 RSS items to the Release 2 state:

- **597 published RepMail articles**
- **638 sitemap/public routes**
- **597 RepMail RSS items**
- **127 guides in Deliverability Diagnostics**
- **124 steps in Provider Deliverability Diagnostics**
- **10 new Release 2 articles live**

## Complete HTTP crawl

The retry-aware production verifier checked every URL in the live sitemap and every retained Release 2 URL. Machine-readable evidence is stored in `seo/wave3-research/WAVE3_RELEASE2_PRODUCTION_VERIFICATION.json`.

- Sitemap HTTP status: **200**
- Routes crawled: **638/638**
- Route failures: **0**
- New Release 2 URLs: **10/10 HTTP 200**
- Every crawled route had a title, canonical and JSON-LD: **638/638**
- RSS HTTP status: **200**, item count **597**
- `robots.txt` HTTP status: **200**
- `/api/health` HTTP status: **200**

## Representative rendered production checks

- Resource Center homepage `/repmail/learn/`: hydrated successfully; rendered the 597-guide count, academy navigation, latest Release 2 guides, collections, paths and search control.
- Read-only Resource Center search for `DPDP`: returned all three new DPDP guides, including the Rules timeline, Act timeline and Board status guide.
- New compliance guide `/repmail/learn/compliance/dpdp-rules-2025-commencement-timeline`: rendered its date table, breadcrumbs, 4 JSON-LD blocks, related/continue-learning links and next navigation.
- New email-platform guide `/repmail/learn/email-platform/email-api-hidden-costs`: rendered its cost table, breadcrumbs, 4 JSON-LD blocks, related/continue-learning links and next navigation.
- Deliverability Diagnostics collection: rendered **127 guides** and visibly included new Release 2 diagnostic links.
- Provider Deliverability Diagnostics learning path: rendered **124 steps** and visibly included new Release 2 steps.
- Browser console checks: no console output/errors on the homepage, representative compliance article, collection, learning path or email-platform article; no CSP violation was observed.

## Preservation and safety checks

No signup, purchase, campaign, ad-click, Google Ads setting, conversion, consent, attribution, payment or auth action was performed. Protected analytics, consent, authentication, payment, pricing and campaign files were outside the Release 2 diff. Existing Resource Center architecture, design system, Markdown loader/schema, asset renderer, collections, learning paths, related-content, JSON-LD, prerendering, sitemap, RSS and search were reused. `Blogs.docx` remained immutable.

**Final result: PASS — Wave 3 Release 2 is live and production-verified.**
