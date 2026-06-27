
---

## Audit 063 — M11: Production Operations & Analytics Accuracy (2026-06-27)

**Date:** 2026-06-27  
**Conducted by:** Claude Sonnet 4.6 + AK Singh  
**Scope:** M11 — Production Runbook, Apple MPP IP-range detection, startup validation hardening, unsubscribe analytics, Content Security Policy  
**Workflow:** Engineering Design Review → EDR Refinements (6 areas) → Implementation → Behavioural Verification → Independent Production Audit → Documentation → Git Commit → GitHub Push

---

### EDR Refinements Resolved

| Refinement | Resolution |
|---|---|
| PRODUCTION_RUNBOOK.md scope | Expanded to include disaster recovery (PostgreSQL restore, Redis recovery, SES credential rotation, Railway rollback, DNS recovery, infrastructure outage) |
| Apple MPP detection | IP-range approach retained; raw IP discarded after classification |
| TRACK_BASE_URL validation | URL parse + HTTPS check + trailing slash normalization via `process.env.TRACK_BASE_URL.replace(/\/+$/, "")` |
| CSP visual verification | Verified via build (5057 modules, no CSP errors); runbook includes post-deploy visual checklist |
| Migration strategy | `db:generate` run; migration 0002 manually edited to add `IF NOT EXISTS` + `DO...EXCEPTION` constraint guards; idempotent on environments where M9/M10 were deployed via db:push |
| Unsubscribe attribution | Exact attribution via `&campaign=UUID` in unsubscribe URL (non-HMAC, server-validated); no heuristic; old links show 0 (honest) not wrong estimate |

---

### Design Decisions

| Decision | Rationale |
|---|---|
| `isAppleMppIp` first-octet check (not bitwise) | JavaScript /8 CIDR check needs only first octet; bitwise adds signed int complexity for no benefit |
| IP takes precedence over UA in `classifyUserAgent` | Apple proxy may send generic UA; IP is the authoritative signal |
| `&campaign=UUID` server-validated (not HMAC-signed) | Worst-case forgery is self-harm on own analytics — no security risk; HMAC would require breaking token format for all in-flight emails |
| Old emails show 0 unsubscribes | Consistent with existing M10 pattern (pre-M10 campaigns show 0 opens/clicks); honest over wrong-heuristic |
| Partial CSP with `'unsafe-inline'` for styles | shadcn/ui + Tailwind require inline styles; full nonce-based CSP deferred to M12 |
| Fixed `incrementCampaignDelivered` gap in memoryStorage | Iron rule violation discovered in audit; fixed as part of M11 method additions |

---

### Files Changed

| File | Change |
|---|---|
| `shared/schema.js` | `unsubscribed_at` on `campaignEmails`; `unsubscribed_emails` on `campaigns` |
| `migrations/0002_sticky_kulan_gath.sql` | Generated then hand-edited: `IF NOT EXISTS` + `DO...EXCEPTION` guards throughout; covers M9 + M10 + M11 from migration 0001 baseline |
| `server/trackingClassifier.js` | `isAppleMppIp(ip)` + updated `classifyUserAgent(ua, ip)` with IP-first detection |
| `server/validateEnv.js` | M10 env var validation: TRACK_BASE_URL (URL + HTTPS + trailing-slash normalization), IP_HASH_SALT (warn), TRACKING_TOKEN_RETENTION_DAYS (1–3650) |
| `server/email.js` | `buildUnsubscribeFooter(userId, email, campaignId)` + `sendCampaignEmail` gains `campaignId` param |
| `server/campaignLoop.js` | `sendWithRetry` passes `campaignId` through to `sendCampaignEmail` |
| `server/storage.js` | `recordCampaignEmailUnsubscribed`, `incrementCampaignUnsubscribed` |
| `server/memoryStorage.js` | Both methods mirrored; `incrementCampaignDelivered` gap fixed |
| `server/schemaCheck.js` | `unsubscribed_at` (campaign_emails) + `unsubscribed_emails` (campaigns) column assertions |
| `server/routes.js` | `/api/unsubscribe` attribution + campaign param validation; tracking endpoints pass `req.ip` to classifier |
| `server/index.js` | Partial CSP via Helmet |
| `client/src/pages/History.jsx` | Unsubscribe rate card + `UserMinus` import |
| `PRODUCTION_RUNBOOK.md` | **New** — comprehensive production operations reference |
| `ENGINEERING_MILESTONES.md` | M10 + M11 rows in summary table; M10 + M11 full sections appended |

---

### Behavioural Verification Results

29/29 checks passed. Covered: `isAppleMppIp` (boundary values 17.x.x.x, 16.x, 18.x, null, empty, IPv4-mapped IPv6), `classifyUserAgent` with IP (IP precedence over UA, Apple IP + generic UA → apple_mpp, Apple IP + Proofpoint UA → apple_mpp, null IP fallback to UA), `isMachineCategory` unchanged, `validateEnv` M10 additions (trailing slash normalization, double slash, invalid URL exits in production, valid URL passes, TRACKING_TOKEN_RETENTION_DAYS boundary checks).

---

### Independent Production Audit Findings

14 findings reviewed:

1. `isAppleMppIp` first-octet vs. bitwise arithmetic — non-issue (functionally identical)
2. IPv6-only clients — non-issue (pure IPv6 returns false; Apple 17/8 is IPv4-only)
3. `campaignId` not HMAC-signed — accepted design (server-validated; worst-case is self-harm)
4. Attribution not fired on `alreadySuppressed` — verified non-issue (early return before if-block)
5. Email normalization in `recordCampaignEmailUnsubscribed` — non-issue (consistent with send path)
6. `unsubscribed_emails` not decremented on suppression delete — intentional, consistent with bounce/complaint pattern
7. CSP `upgrade-insecure-requests` in dev — non-issue (browsers ignore on HTTP)
8. CSP `connectSrc: 'self'` blocking external calls — non-issue (no external browser API calls)
9. Migration `DO...EXCEPTION` PL/pgSQL syntax — verified correct PostgreSQL pattern
10. `incrementCampaignDelivered` pre-existing gap — fixed as part of M11
11. `validateEnv` mutating `process.env` — intentional normalization pattern
12. CSP visual verification — build passes (5057 modules); visual checklist in PRODUCTION_RUNBOOK.md
13. `unsubscribedEmails` camelCase mapping — verified correct (Drizzle auto-camelCases all columns in API response)
14. `CAMPAIGN_EMAIL_STATUS.SUPPRESSED` import in storage method — verified correct import at top of file

All findings resolved as non-issues, intentional decisions, or addressed fixes.

---

### Iron Rules Compliance

| Rule | Status |
|---|---|
| `memoryStorage.js` mirrors `storage.js` exactly | PASS — both new methods added; pre-existing gap fixed |
| No "beta" classification | PASS |
| No implementation before architectural decisions finalised | PASS — 6 EDR refinements resolved before first file touched |
