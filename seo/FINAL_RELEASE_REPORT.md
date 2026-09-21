# NOT READY FOR HUMAN REVIEW

**Release status:** **NOT READY FOR HUMAN REVIEW**. The source correction and Resource Center merge are ready in an isolated clean release workspace, but production deployment has not been performed because the normal Railway deployment access is unavailable and the local production build is blocked by the mounted dependency environment. The report intentionally does not claim post-deployment verification or Google Ads receipt.

Audit date: 2026-09-21.

## 1. Exact defect and root cause

The production bundle used stale build-time Google Ads values. The active connected account actions are Sign-up (`7728201277`) and Purchase (1) (`7729403464`), but production sent labels for neither action:

| Event | Before | Correct active primary label | After source fix |
|---|---|---|---|
| Signup | `AW-18330551128/1gIMCL38i-UcENiG2KRE` | `AW-18330551128/1glMCL38i-UcENiG2KRE` | Correct source constant |
| Purchase | `AW-18330551128/CriCMis1ecUENiG2KRE` | `AW-18330551128/CrijCMis1eUcENiG2KRE` | Correct source constant |

Root cause: `googleAds.js` trusted build-time `VITE_GADS_LABEL_PURCHASE` and `VITE_GADS_LABEL_SIGN_UP` values, while those production environment values were stale and no repository `.env.example` values documented the active labels. Google Ads UI showed Purchase and Sign-up as Misconfigured.

## 2. Exact source files changed

Only this existing source file is changed for the measurement correction:

- `client/src/lib/analytics/googleAds.js`

The exact change introduces verified primary constants and retains test-only environment overrides under Vite `MODE === "test"`. It does not alter event taxonomy, consent, attribution, fire-once deduplication, value/currency logic, server-success gating, or PII behavior.

## 3. Exact content files added

The dedicated release adds exactly 38 new Markdown articles:

```text
client/src/content/repmail/cold-email/ai-generated-cold-email-review.md
client/src/content/repmail/cold-email/breakup-email-guide.md
client/src/content/repmail/cold-email/cold-email-cta-examples.md
client/src/content/repmail/cold-email/cold-email-opening-line-frameworks.md
client/src/content/repmail/cold-email/cold-email-sequence-quality-checklist.md
client/src/content/repmail/cold-email/personalization-data-checklist.md
client/src/content/repmail/compliance/can-spam-vs-gdpr-cold-email.md
client/src/content/repmail/compliance/cold-email-compliance-recordkeeping.md
client/src/content/repmail/compliance/cold-email-unsubscribe-requirements.md
client/src/content/repmail/compliance/legitimate-interest-cold-email.md
client/src/content/repmail/deliverability/delivery-vs-deliverability-vs-placement.md
client/src/content/repmail/deliverability/dmarc-alignment-explained.md
client/src/content/repmail/deliverability/email-authentication-change-management.md
client/src/content/repmail/deliverability/google-postmaster-tools-guide.md
client/src/content/repmail/deliverability/microsoft-365-email-delivery-diagnostics.md
client/src/content/repmail/deliverability/provider-specific-deliverability-triage.md
client/src/content/repmail/deliverability/read-authentication-results.md
client/src/content/repmail/deliverability/sender-reputation-recovery-plan.md
client/src/content/repmail/deliverability/smtp-4xx-5xx-email-errors.md
client/src/content/repmail/deliverability/spam-complaint-spike-response.md
client/src/content/repmail/email-platform/email-sending-observability.md
client/src/content/repmail/email-platform/email-sending-platform-selection.md
client/src/content/repmail/email-platform/raw-ses-vs-sending-platform.md
client/src/content/repmail/email-platform/transactional-marketing-cold-email-infrastructure.md
client/src/content/repmail/infrastructure/aws-ses-account-level-suppression.md
client/src/content/repmail/infrastructure/aws-ses-bounce-complaint-notifications.md
client/src/content/repmail/infrastructure/aws-ses-sandbox-to-production.md
client/src/content/repmail/infrastructure/return-path-vs-from-domain.md
client/src/content/repmail/infrastructure/sending-domain-vs-mailbox.md
client/src/content/repmail/infrastructure/smtp-connection-vs-api.md
client/src/content/repmail/lead-generation/disposable-email-addresses.md
client/src/content/repmail/lead-generation/email-list-hygiene-checklist.md
client/src/content/repmail/lead-generation/email-verification-catch-all-domains.md
client/src/content/repmail/lead-generation/email-verification-statuses.md
client/src/content/repmail/lead-generation/outbound-suppression-rules.md
client/src/content/repmail/lead-generation/role-based-email-addresses.md
client/src/content/repmail/outreach/click-tracking-deliverability-tradeoffs.md
client/src/content/repmail/outreach/cold-email-reply-rate-measurement.md
```

It also adds exactly six collections:

```text
client/src/content/repmail/collections/cold-email-message-quality.json
client/src/content/repmail/collections/compliance-operations.json
client/src/content/repmail/collections/deliverability-diagnostics.json
client/src/content/repmail/collections/email-infrastructure-decisions.json
client/src/content/repmail/collections/list-quality-operations.json
client/src/content/repmail/collections/outreach-measurement.json
```

And exactly three learning paths:

```text
client/src/content/repmail/paths/cold-email-message-quality.json
client/src/content/repmail/paths/list-quality-and-suppression.json
client/src/content/repmail/paths/provider-deliverability-diagnostics.json
```

The two required reports are:

```text
seo/GOOGLE_ADS_LABEL_FIX.md
seo/FINAL_RELEASE_REPORT.md
```

No existing article URL, existing article body, unrelated application file, dependency, campaign setting, or `Blogs.docx` is included.

## 4. Resource Center validation

The clean release workspace passes independent content and route validation:

| Check | Result |
|---|---|
| Total articles | **124** |
| New articles present | **38 / 38** |
| Author records | **1** |
| Generated route records | **165** |
| Duplicate route records | **0** |
| Duplicate article slugs | **0** |
| Bad dates | **0** |
| Missing practical assets | **0** |
| Validator warnings | **0** |
| Invalid internal article links | **0** |
| Sitemap URLs generated | **165** |
| Duplicate sitemap URLs | **0** |
| RSS items generated | **124** |
| Missing route metadata | **0** |
| JSON-LD serialization issues | **0** |
| Query/fragment URLs in sitemap | **0** |
| Non-root trailing-slash sitemap URLs | **0** |

The five prior content guard categories are all clear in the clean validation output: `missingNew=[]`, `duplicateSlugs=[]`, `badDates=[]`, `noAssets=[]`, and `warnings=[]`. The two invalid practical-asset declarations found during the earlier import review were changed to the existing schema-supported `checklist` type before this release workspace was assembled.

Academy assignment is valid across eight populated academies: cold-email, compliance, deliverability, email-platform, glossary, infrastructure, lead-generation, and outreach. Collection/path membership covers article-body inbound-link candidates; no new article is isolated from the Resource Center graph.

## 5. Exact URLs added

All 38 new production URLs follow the existing canonical grammar `https://www.letszero.in/repmail/learn/{academy}/{slug}`:

| Academy | New URLs |
|---|---|
| Cold Email | `/repmail/learn/cold-email/ai-generated-cold-email-review`, `/repmail/learn/cold-email/breakup-email-guide`, `/repmail/learn/cold-email/cold-email-cta-examples`, `/repmail/learn/cold-email/cold-email-opening-line-frameworks`, `/repmail/learn/cold-email/cold-email-sequence-quality-checklist`, `/repmail/learn/cold-email/personalization-data-checklist` |
| Compliance | `/repmail/learn/compliance/can-spam-vs-gdpr-cold-email`, `/repmail/learn/compliance/cold-email-compliance-recordkeeping`, `/repmail/learn/compliance/cold-email-unsubscribe-requirements`, `/repmail/learn/compliance/legitimate-interest-cold-email` |
| Deliverability | `/repmail/learn/deliverability/delivery-vs-deliverability-vs-placement`, `/repmail/learn/deliverability/dmarc-alignment-explained`, `/repmail/learn/deliverability/email-authentication-change-management`, `/repmail/learn/deliverability/google-postmaster-tools-guide`, `/repmail/learn/deliverability/microsoft-365-email-delivery-diagnostics`, `/repmail/learn/deliverability/provider-specific-deliverability-triage`, `/repmail/learn/deliverability/read-authentication-results`, `/repmail/learn/deliverability/sender-reputation-recovery-plan`, `/repmail/learn/deliverability/smtp-4xx-5xx-email-errors`, `/repmail/learn/deliverability/spam-complaint-spike-response` |
| Email Platform | `/repmail/learn/email-platform/email-sending-observability`, `/repmail/learn/email-platform/email-sending-platform-selection`, `/repmail/learn/email-platform/raw-ses-vs-sending-platform`, `/repmail/learn/email-platform/transactional-marketing-cold-email-infrastructure` |
| Infrastructure | `/repmail/learn/infrastructure/aws-ses-account-level-suppression`, `/repmail/learn/infrastructure/aws-ses-bounce-complaint-notifications`, `/repmail/learn/infrastructure/aws-ses-sandbox-to-production`, `/repmail/learn/infrastructure/return-path-vs-from-domain`, `/repmail/learn/infrastructure/sending-domain-vs-mailbox`, `/repmail/learn/infrastructure/smtp-connection-vs-api` |
| Lead Generation | `/repmail/learn/lead-generation/disposable-email-addresses`, `/repmail/learn/lead-generation/email-list-hygiene-checklist`, `/repmail/learn/lead-generation/email-verification-catch-all-domains`, `/repmail/learn/lead-generation/email-verification-statuses`, `/repmail/learn/lead-generation/outbound-suppression-rules`, `/repmail/learn/lead-generation/role-based-email-addresses` |
| Outreach | `/repmail/learn/outreach/click-tracking-deliverability-tradeoffs`, `/repmail/learn/outreach/cold-email-reply-rate-measurement` |

## 6. Tests and build

### Executed and passed

- Content loader/schema/route validation: **PASS**.
- Independent route-family validation: **PASS** — 165 unique routes.
- Independent temporary sitemap/RSS/JSON-LD validation: **PASS** — 165 sitemap URLs, 124 RSS items, zero JSON-LD issues.
- Source label assertion: **PASS** — correct live primary labels present; stale labels absent.
- `Blogs.docx` immutability check: **PASS**.

### Executed but blocked by environment

- Normal `npm test`: blocked by `vitest: Permission denied` in the mounted dependency tree.
- Direct Vitest: blocked by missing optional package `@rollup/rollup-linux-x64-gnu`.
- Normal `npm run build`: blocked by `cross-env: Permission denied`.
- Direct `node script/build.js`: blocked by missing optional package `@rollup/rollup-linux-x64-gnu`.
- Direct TypeScript check: exited with TS18003 because the configured include paths resolved no TypeScript inputs in the clean clone.

No dependency was installed, upgraded, removed, or altered to mask these failures.

## 7. Production counts and deployment result

| Production surface | Current live count | Expected after release |
|---|---:|---:|
| Resource Center guides | 86 | 124 |
| Sitemap URLs | 116 | 165 |
| RSS items | 86 | 124 |

**Deployment result: NOT PERFORMED.** Railway is the documented production platform, but no authenticated Railway CLI or deployment connector is available in this session. The GitHub repository has been cloned cleanly and the release scope prepared locally; no push to `main` and no production deployment occurred.

**Deployment commit:** `06f8dc7c6e3a0dcfd6df8c0e0e8d148fffba5112` (`fix(release): align Ads labels and publish RepMail resource expansion`). This is a local dedicated commit created only from the exact release file list above; the dirty mounted workspace is not part of it.

## 8. Post-deployment verification

Not performed because deployment was not performed. The following remain pending and must be checked against production after Railway deployment:

- Resource Center homepage 200
- Representative old article 200
- Representative new article 200
- Academy pages 200
- Sitemap and RSS 200
- Robots 200
- Canonical, title, meta, JSON-LD, breadcrumbs, and internal links
- No obvious 404s, console errors, or CSP errors
- Production tag ID `AW-18330551128`
- Production signup label `1glMCL38i-UcENiG2KRE`
- Production purchase label `CrijCMis1eUcENiG2KRE`

## 9. Google Ads receipt status

**Verified:** account identity, active action IDs, active labels, primary/secondary status, account/campaign goal relationships, and source mapping.

**Unverified:** real ad-click attribution, qualifying signup receipt, qualifying purchase receipt, immediate Google Ads conversion receipt, and Ads-side diagnostics after deployment. No fake `gclid`, fabricated conversion, real signup, or real purchase was performed.

## 10. Rollback procedure

If the dedicated release causes a regression, revert the dedicated commit from the deployment branch and redeploy the prior known-good Railway build. The rollback must remove the 38 article files, nine navigation records, the two release reports, and the label-source correction as one release unit. Do not reset the dirty mounted workspace or revert unrelated commits. After rollback, verify the homepage, Resource Center, sitemap, RSS, and conversion tag behavior against the prior production baseline.

## 11. Human review required

1. Review the exact release file list and the one-file label-source diff.
2. Provide or enable the established Railway deployment path; no Railway credentials or deployment connector were available to this session.
3. After deployment, re-read the live production bundle and compare its two labels against the live Ads action snippets.
4. Re-run production URL, sitemap, RSS, canonical, JSON-LD, console/CSP, and browser checks.
5. Separately authorize any real ad-click/signup/purchase receipt test; source correctness is not Ads receipt evidence.

**Final status: NOT READY FOR HUMAN REVIEW**
