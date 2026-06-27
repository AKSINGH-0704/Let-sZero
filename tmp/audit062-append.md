
---

## Audit 062 — M10: Email Analytics (2026-06-27)

**Date:** 2026-06-27  
**Conducted by:** Claude Sonnet 4.6 + AK Singh  
**Scope:** M10 — Email Analytics: tracking token infrastructure, pixel + click endpoint routing, machine UA classification, link rewriting, memoryStorage parity, schema check integration, History.jsx machine disclosure  
**Workflow:** Engineering Design Review → Production Engineering Hardening (10 areas) → Implementation → Behavioural Verification → Independent Production Audit → Documentation → Git Commit → GitHub Push  
**Commit at time of implementation:** follows `ea68878` ([M7] Duplicate Campaign)  

---

### Design Decisions (from approved EDR + 10-area hardening)

| Decision | Rationale |
|---|---|
| 22-char base64url token (128-bit entropy) | Negligible collision probability at any realistic scale |
| First-event model (`WHERE IS NULL RETURNING id`) | Deduplication under concurrent requests without distributed locking |
| Machine UA classification gate on `clickedAt` | Security gateway pre-scans must not consume the genuine click slot |
| `setImmediate` fire-and-forget on pixel/click routes | Zero latency added to recipient's open/click experience |
| `TRACK_BASE_URL` opt-in | Tracking entirely inert when absent; delivery pipeline unmodified |
| `node-html-parser` for link rewriting | Robust over regex; 500KB lighter than cheerio |
| Try/catch around HTML parse with original-html fallback | Email delivers without click tracking rather than failing to deliver |
| `IP_HASH_SALT` + SHA-256 for IP storage | Never stores raw IP; satisfies privacy/GDPR baseline |
| `ON DELETE CASCADE` from campaigns + campaign_emails | Token cleanup is automatic on campaign/email deletion |
| Batched `deleteExpiredTrackingTokens` (1000/batch loop) | Avoids table-level lock contention on large token tables |
| `getCampaignTrackingBreakdown` try/catch in routes | Non-critical path; tracking table absence must not break campaign detail API |
| Weekly token cleanup job with 30s startup delay | Clears tokens that expired while server was down; non-critical |

---

### Files Changed

| File | Change |
|---|---|
| `shared/schema.js` | Added `TRACKING_TOKENS_PROVISIONED` audit constant; `trackingTokens` pgTable with 4 indexes |
| `server/trackingClassifier.js` | **New** — `classifyUserAgent` + `isMachineCategory`; 7 machine categories |
| `server/trackingUtils.js` | **New** — `generateTrackingToken`, `TOKEN_RE`, `TRACKING_PIXEL_GIF`, `hashIp`, `extractTemplateLinks` |
| `server/email.js` | Added `wrapLinksForTracking`; `sendCampaignEmail` 6th param `trackingTokens`; pixel + click-wrapped HTML |
| `server/campaignLoop.js` | Per-contact token generation block; Sentry capture on token failure; graceful null-passthrough |
| `server/storage.js` | 7 new dbStorage methods: `createTrackingTokensForEmail`, `getTrackingToken`, `recordOpenResolution`, `recordClickResolution`, `getCampaignTrackingBreakdown`, `expireContactTrackingTokens`, `deleteExpiredTrackingTokens` |
| `server/memoryStorage.js` | Imports + `trackingTokens: new Map()` + all 7 methods mirrored exactly (iron rule: memoryStorage parity) |
| `server/schemaCheck.js` | `tracking_tokens` table, 12 columns (all `critical: false`), `idx_tracking_tokens_token` index |
| `server/routes.js` | Tracking imports + `trackingLimiter` (60/min/IP, pixel on rate limit); `GET /t/o/:token`; `GET /t/c/:token`; enhanced `GET /api/campaigns/:id` with `trackingBreakdown` |
| `server/index.js` | `/t/` prefix added to `allowedPaths` production gate; weekly `deleteExpiredTrackingTokens` cleanup job |
| `client/src/pages/LinkExpired.jsx` | **New** — public "link no longer active" page |
| `client/src/App.jsx` | `LinkExpired` import + `/link-expired` route |
| `client/src/pages/History.jsx` | Machine activity disclosure in Open Rate card (`~X genuine · Y machine (MPP/gateway)`) |

---

### Behavioural Verification Results

41/41 checks passed. Covered: token generation (22 chars, format, uniqueness at 1000 samples), GIF buffer validity (42 bytes), IP hashing (determinism, null safety, collision resistance), extractTemplateLinks (skip tracking prefix, www normalisation, empty body), classifyUserAgent (7 machine + 3 human categories + null/empty), isMachineCategory (all 7 machine true, desktop/mobile/unknown false), TOKEN_RE boundaries (rejects short/long/special chars/base64-non-url, accepts valid base64url).

---

### Independent Production Audit Findings

14 findings reviewed. All resolved as non-issues, design-approved gaps, or low-severity operational notes. No code changes required.

Key finding: TRACKING_PIXEL_GIF is 42 bytes (not 35 as stated in session summary). This was a documentation error in the summary; the production Buffer is correct.

SES configuration set conflict documented as operational requirement: disable Open + Click event types in the SES configuration set at M10 deploy.

---

### Iron Rules Compliance

| Rule | Status |
|---|---|
| `memoryStorage.js` mirrors `storage.js` exactly | PASS — all 7 methods + Map entry added |
| No "beta" classification | PASS |
| No implementation before architectural decisions finalised | PASS — EDR approved before first file touched |

---
