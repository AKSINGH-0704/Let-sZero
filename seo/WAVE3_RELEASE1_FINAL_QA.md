# Wave 3 Release 1 — Final QA and Release Report

**Status:** integrated onto current `origin/main` as commit `8702e23`; QA-validated and ready to push, but not yet deployed or production-verified.

## Scope and selection

Release 1 began with 20 locally drafted candidates selected from the stored Wave 3 ranked queue. Eight were pruned before commit because the strict gates found either unqualified stored demand evidence, a guarantee claim, an overlong description, or missing internal links. The final retained set is 12 articles. Quality was preferred over filling the provisional 20-article target.

The retained topics are: Email Subject Line Tester: Cold Email Review Sheet; DMARC Checker: Read Policy, Alignment, and Reports; Email Spam Checker: Read the Score as a Diagnostic; SPF Checker: How to Read One Published Record; DKIM Checker: Read Selector, Signature, and Alignment; Zoho Mail Domain Verification: DNS Handoff; SES SMTP 535: Region and Credential Checklist; Email API 202 Accepted: Why It May Not Arrive; Zoho Mail SMTP: When to Use Port 465 or 587; Inbound Email API: Webhooks vs. Polling; How to Verify a RepMail Sending Domain; and Merge Fields Work in Preview but Fail on Send.

The release reuses the existing eight academies, five existing collections and existing learning paths. No collection or learning-path records were created. Existing collection/path JSON records were extended only for retained routes; pruned routes were removed before this report.

## Evidence limits

The retained articles use stored candidate evidence plus write-time HTTP verification. The final ledger records 23 external references, all returning HTTP 200 at verification time. This is not a claim of search volume, rankings, traffic, keyword difficulty, CTR, conversions, or business impact. Google Search Console was unavailable for this property, Ahrefs quantitative metrics were unavailable under the accessible plan, Similarweb was unauthenticated, and the complete Keyword Planner export was not captured. Only the observed Keyword Planner ranges in the private Wave 3 ledger are treated as measured demand; qualitative SERP/community/provider observations remain qualitative.

Provider/product claims are bounded by the private Wave 3 product-truth record and current code evidence. RepMail claims avoid guarantees, universal availability, inbox-placement promises, AI-per-recipient rewriting claims, and unverified pricing or compliance claims. The inbound-email API page is explicitly educational/off-product; it does not imply that RepMail provides inbound email APIs.

## Local QA results

- Canonical loader/schema/duplicate/route/asset/link/demand/source/similarity QA: **PASS — 12 new articles, 0 failures, 0 warnings**.
- Final write-time source check: **23/23 references HTTP 200**.
- Full Vitest suite: **PASS — 106 test files, 1,634 tests**.
- Focused content schema and internal-link tests: **PASS — 28 tests**.
- Production build: **PASS**.
- Prerendering: **628/628 routes**.
- Sitemap: **628 URLs**.
- RepMail RSS: **587 items**.
- Local artifact comparison: **628 derived routes, 0 missing HTML files**.
- TypeScript check: baseline-only failure `TS18003` because the repository has no `.ts`/`.tsx` inputs matching `tsconfig.json`; no TypeScript source was introduced by Release 1.

## Baseline and preservation

The baseline was 575 Resource Center articles, 616 public routes and 575 RSS items. The local result is 587 articles, 628 routes and 587 RSS items. The existing architecture remains in use: Markdown/frontmatter loader, existing article template, existing asset renderer, existing collection/path navigation, existing related-content system, existing JSON-LD, existing prerender route generation, existing sitemap, existing RSS and existing search.

No protected analytics, consent, auth, payment, pricing, campaign, Google Ads or attribution files are changed. No signup, purchase, ad-click, campaign or conversion test was performed. `Blogs.docx` remains immutable and was not modified, migrated, overwritten or used to override current product truth.

## Release gate

The integrated commit has passed the clean-tree QA gates and is ready for the normal non-force push to `main`. No production deployment claim is made in this report.
