# Google Ads Label Fix

**Status: SOURCE FIX COMPLETE; DEPLOYMENT PENDING.** Audit date: 2026-09-21. Account: LetsZero, customer `9569622344` (`956-962-2344`), currency INR, time zone Asia/Calcutta. No campaign, budget, bid, targeting, strategy, audience, ad-copy, conversion-action status, or account-goal setting was changed.

## Exact defect

The deployed production bundle contained stale Google Ads conversion labels:

| Event | Production before | Current live primary action label | Result |
|---|---|---|---|
| `sign_up` | `1gIMCL38i-UcENiG2KRE` | `1glMCL38i-UcENiG2KRE` | Mismatch |
| `purchase` | `CriCMis1ecUENiG2KRE` | `CrijCMis1eUcENiG2KRE` | Mismatch |

The Google Ads UI showed both account-default Purchase and Sign-up goals as **Misconfigured**.

## Root cause

`client/src/lib/analytics/googleAds.js` previously read `VITE_GADS_LABEL_PURCHASE` and `VITE_GADS_LABEL_SIGN_UP` at build time. The deployed Railway/Vite environment contained stale values. No label variables were present in the repository’s `.env` or `.env.example`, so the source did not provide a verified fallback and the production bundle retained the wrong labels.

## Current account evidence

Fresh read-only GAQL account discovery returned LetsZero customer `9569622344`. Fresh conversion-action GAQL returned:

| Action | Action ID | Conversion ID | Category | Status | Primary/Secondary | Included in conversions | Goal relationship |
|---|---:|---|---|---|---|---|---|
| Sign-up | `7728201277` | `AW-18330551128/1glMCL38i-UcENiG2KRE` | SIGNUP / WEBSITE | ENABLED | Primary | Yes | Account default and campaign-biddable |
| Sign-up (1) | `7729345623` | `AW-18330551128/zBjOCNfo0eUcENiG2KRE` | SIGNUP / WEBSITE | ENABLED | Secondary | No | Not used for primary optimization |
| Purchase (1) | `7729403464` | `AW-18330551128/CrijCMis1eUcENiG2KRE` | PURCHASE / WEBSITE | ENABLED | Primary | Yes | Account default and campaign-biddable |
| Submit lead form | `7725022447` | `AW-18330551128/3UdpCO_5yeMcENiG2KRE` | SUBMIT_LEAD_FORM / WEBSITE | ENABLED | Primary action, excluded from conversions metric | No | Not part of this source taxonomy |
| Lead form - Submit | `7724974506` | Google-hosted action; no website label used | SUBMIT_LEAD_FORM / GOOGLE_HOSTED | ENABLED | Primary action, excluded from conversions metric | No | Not part of this source taxonomy |

The action-snippet evidence was read from the connected Google Ads result artifact at `/home/ubuntu/.mcp/tool-results/mcp-call_iv0k0zmqSOVueXezNEBhR4Lb.json`, including the exact active snippets for Sign-up and Purchase (1). The current Ads UI also continued to show those two goals as Misconfigured before this source correction.

The account has one enabled Performance Max campaign (`24149498114`) using `MAXIMIZE_CONVERSIONS`; campaign configuration is customer-level and the current Purchase and Sign-up goals are biddable. No campaign setting was changed.

## Exact source change

Only `client/src/lib/analytics/googleAds.js` is changed in the release source. Signup and purchase now use the verified active primary labels as production constants:

```text
purchase = CrijCMis1eUcENiG2KRE
sign_up  = 1glMCL38i-UcENiG2KRE
```

The existing test-only environment override remains active when Vite `MODE` is `test`, preserving null-label protection and custom-label unit-test behavior. `qualified_lead` remains environment-controlled and unchanged. Event names, consent handling, attribution continuity, fire-once deduplication, purchase value/currency, server-success gating, and PII protections are unchanged.

## Verification

| Check | Result |
|---|---|
| Source contains verified primary Purchase label | **PASS** |
| Source contains verified primary Sign-up label | **PASS** |
| Source contains stale production labels | **PASS: absent** |
| Content loader | **PASS** — 124 articles, 165 routes, 38 new assets present, no warnings |
| Production build | **BLOCKED** — mounted dependency tree lacks `@rollup/rollup-linux-x64-gnu` |
| Normal `npm test` | **BLOCKED** — mounted `vitest` executable permission failure; direct Vitest reaches the same missing Rollup optional dependency |
| End-to-end signup/purchase | **UNVERIFIED / ACCESS BLOCKED** — no real account or purchase performed by explicit instruction |

## Deployment safety

The source fix is prepared in an isolated clean clone from `origin/main`. The dirty mounted workspace was not used for the release commit. The dedicated release scope contains exactly one existing source file correction, 38 new article files, six new collections, three new learning paths, and the two required release reports. No existing article URL or `Blogs.docx` is changed.

Deployment has not been performed in this report. Railway is the documented production platform, but no authenticated Railway CLI or deployment connector is available in this session. The normal deployment path is therefore not executable here without operator-side Railway access/authorization. A real ad click and qualifying conversion remain separate operator-authorized tests; no Ads receipt is inferred from source correctness or tag loading.
