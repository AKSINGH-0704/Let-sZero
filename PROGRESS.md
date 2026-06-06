# RepMail Production Hardening — Progress Log

## Last Updated
2026-06-06T00:00:00Z

## Current Status
Phase 5 IN PROGRESS — awaiting production URL and manual test inputs from operator.

---

## Completed Phases

### Phase 0 — Verification
- Status: COMPLETE
- Committed: PENDING (this commit)
- Findings:

**server/routes.js:**
- GET /api/health — EXISTS (line 341). Registered FIRST before auth. PARTIAL: SMTP check is NOT cached (calls verifySesConnection() live every request). Missing sendPaused field.
- GET /api/admin/queue/status — EXISTS (line 2202).
- POST /api/admin/campaigns/:id/cancel — EXISTS (line 2164).
- GET /api/campaigns/:id/audit — EXISTS (line 1337). getAuditLogs already supports targetId filter.
- GET /api/admin/delivery-health — MISSING.
- GET /api/unsubscribe — EXISTS (line 486). Returns HTML. PARTIAL: "already unsubscribed" state not separately handled (shows same success message as new unsubscribe).
- POST /api/admin/platform/pause-sending — MISSING.

**server/worker.js:**
- repmail:worker:heartbeat — EXISTS. Written at worker init level (line 76-85). Correct placement.
- Per-contact for loop — EXISTS at line 215: `for (let i = 0; i < contactIds.length; i++)` (index-aware).

**server/index.js:**
- CORS localhost:8083 — EXISTS (line 34). Needs removal.
- Inactivity governance job running guard — MISSING. runInactivityJob() at line 78 has NO let running = false guard.
- Cleanup jobs: 6 total (SNS pruning, sessions, audit logs, campaign emails, inactivity tokens, AI usage logs). All have running guards.
- pruneAiUsageLogs call — EXISTS (line 658). AI usage logs cleanup job EXISTS and complete.

**server/storage.js:**
- pruneAiUsageLogs — EXISTS (line 1644).
- getDeliveryHealthStats — MISSING.
- getPlatformSetting — MISSING.
- getUserSenderHealth — MISSING.
- getAuditLogs targetId filter — EXISTS (line 686).

**shared/schema.js:**
- platformSettings table — MISSING.
- sendPaused column on users table — MISSING.

**client/src/pages:**
- Files: AcceptInvite.jsx, Audit.jsx, Contact.jsx, Dashboard.jsx, History.jsx, Landing.jsx, Login.jsx, NewCampaign.jsx, not-found.jsx, Payments.jsx, Pricing.jsx, Profile.jsx, PublicPricing.jsx, ResetPassword.jsx, Templates.jsx, Users.jsx, WaitlistLanding.jsx.
- No dedicated CampaignDetail page found — campaign details likely in History.jsx.

---

**Implementation plan (SKIP vs IMPLEMENT):**

SKIP (already EXISTS and complete):
- Task 2.1: AI usage logs cleanup — EXISTS in index.js + storage.js
- Task 2.2: Worker heartbeat — EXISTS at worker init level, health reads it
- Task 2.3: Force-cancel endpoint — EXISTS
- Task 2.4: Queue status endpoint — EXISTS
- Task 2.5: Campaign audit endpoint — EXISTS (targetId filter also exists)

IMPLEMENT (MISSING or PARTIAL):
- Task 1.1: SES_SEND_RATE_MS startup warning in rateLimiter.js — MISSING
- Task 1.2: SMTP health caching in /api/health + sendPaused:false placeholder — PARTIAL
- Task 1.3: Unsubscribe "already unsubscribed" state — PARTIAL
- Task 1.4: Unsubscribe footer enforcement in campaign validation — MISSING
- Task 1.5: Inactivity job running guard — MISSING
- Task 1.6: Remove localhost:8083 from CORS — NEEDS REMOVAL
- Task 2.6: Delivery health endpoint + storage method — MISSING
- Task 3.1: Global send pause (platformSettings schema + SQL migration) — MISSING
- Task 3.2: Per-user sender health (schema columns + SQL migration) — MISSING
- Task 4.x: Frontend (check History.jsx for campaign detail metrics)

---

### Phase 1 — Safety Fixes
- Status: COMPLETE
- Committed: 2002eb9
- Tasks completed: [1.1, 1.2, 1.3, 1.4, 1.5, 1.6]
- Tasks pending: []
- Notes:
  - 1.1: SES_SEND_RATE_MS warning added to worker.js (var is read there, not rateLimiter.js)
  - 1.2: SMTP caching added (5-min TTL), sendPaused:false placeholder, timestamp field added
  - 1.3: Unsubscribe "already unsubscribed" state added via isSuppressed() pre-check
  - 1.4: CAN-SPAM validation added before blocking gate in POST /api/campaigns
  - 1.5: inactivityJobRunning guard added with finally block
  - 1.6: localhost:8083 removed from CORS allowedOrigins

### Phase 2 — Operational Observability
- Status: COMPLETE
- Committed: PENDING (this commit)
- Tasks completed: [2.1-already-exists, 2.2-already-exists, 2.3-already-exists, 2.4-already-exists, 2.5-already-exists, 2.6]
- Tasks pending: []
- Notes:
  - 2.6: getDeliveryHealthStats added to storage.js + memoryStorage.js mirror + GET /api/admin/delivery-health route
  - No schema change. No migration. No new env vars.

### Phase 3 — SES Reputation Protection
- Status: COMPLETE
- Committed: PENDING (this commit)
- Tasks completed: [3.1, 3.2]
- Notes:
  - 3.1: platformSettings table added to schema. getPlatformSetting/setPlatformSetting added to storage + mirror. Global pause check: pre-loop + every 50 contacts. Mid-loop break sets globalPausedMidLoop flag to prevent PAUSED→COMPLETED overwrite. Three admin routes added.
  - 3.2: sendPaused/sendPausedReason/sendPausedAt added to users schema. updateUser allowlist extended. getUserSenderHealth added to storage + mirror. Pre-loop checks: manual sendPaused flag → FAILED, auto-health threshold (min 50 sent) → FAILED + user auto-pause. sendPaused guard in authMiddleware blocks POST /api/campaigns for paused users.
  - /api/health sendPaused field now reads live from platform_settings (was placeholder false).
  - Global platform pause → campaign status PAUSED (resumable).
  - Manual user pause → campaign status FAILED (requires admin action).
  - Auto sender-health pause → campaign status FAILED (requires admin action).

### Phase 4 — Frontend Completion
- Status: COMPLETE
- Committed: PENDING (this commit)
- Tasks completed: [4.1, 4.2, 4.3]
- Notes:
  - 4.1: Per-contact table (Opened At / Clicked At) added to History.jsx campaign dialog. Aggregate open/click stats already existed — only the per-contact table was missing. Secondary useQuery for /api/campaigns/:id fires when dialog opens.
  - 4.2: DeliveryHealthPanel.jsx created. Bounce/complaint rate bars (green/yellow/red), suppression stats, top bouncer table, pause/resume buttons with AlertDialog confirmation. Rendered in Dashboard.jsx under isRootAdmin guard.
  - 4.3: PauseBanners component added to AppLayout.jsx. Uses useAuth() for user.sendPaused, useQuery for /api/health sendPaused (30s refetch). Platform pause banner (yellow) + user pause banner (red). No new hook or context created.
  - Auth pattern: useAuth() from existing @/context/AuthContext used throughout — no new auth mechanism introduced.

### Phase 5 — Real-World Validation
- Status: IN PROGRESS
- Committed: rolling (checkpoints after S1, S2, all complete)

#### Pre-flight code analysis (completed without production access)

**SNS confirmation path (routes.js:612–622):**
- Auto-confirmed by fetching SubscribeURL on receipt of SubscriptionConfirmation message
- Evidence marker in logs: `[SNS] Subscription confirmed — HTTP 200`
- TopicArn guard active if SNS_TOPIC_ARN env var is set

**Complaint handler (routes.js:702–710):**
- Source: `complaint@simulator.amazonses.com` triggers an SNS Complaint event
- Handler: addSuppression(userId, emailAddress, 'complaint'), updateCampaignEmail(COMPLAINED), incrementCampaignComplained
- Guard: only fires for permanent bounces (bounceType check); complaint has no equivalent filter

**Recovery logic (index.js:485–524):**
- Recovers RUNNING → FAILED if no live BullMQ job found
- Does NOT recover PENDING campaigns

**Test 2.2B watchdog gap — CONFIRMED (code analysis):**
- Scheduler only re-queues PENDING campaigns with past scheduledAt (index.js:691)
- recoverStaleCampaigns only processes RUNNING (index.js:487)
- GAP: immediate (no scheduledAt) PENDING campaign with lost BullMQ job has no automatic recovery
- Severity: depends on Redis persistence config (RDB/AOF). If Redis persists jobs across restart, gap does not manifest. If Redis is ephemeral, PENDING campaigns are orphaned.
- STATUS: documented as known risk per Phase 5 rules — no fix implemented

---

#### Test Results

| Test | Status | Notes |
|------|--------|-------|
| SNS Pre-check | PENDING | Needs Railway log search |
| 4.2 Auth headers | PENDING | Needs email header inspection |
| 1.1 Baseline send | PENDING | Needs production URL + inboxes |
| 1.2 SES delivery | PENDING | Needs DB + AWS console |
| 1.3 Open tracking | PENDING | Needs inbox + Railway logs |
| 1.4 Click tracking | PENDING | Needs inbox + Railway logs |
| 1.5 Unsubscribe | PENDING | Needs browser + DB |
| 1.6 Bounce handling | PENDING | Needs DB + Railway logs |
| 1.7 Complaint handling | PENDING | Needs SES simulator + DB |
| 2.1 Redis fallback | PENDING | Needs Railway logs |
| 2.2 Worker restart | PENDING | Needs Railway restart + DB |
| 2.2B Restart PENDING | DOCUMENTED | Known risk — see above |
| 2.3 Global pause | PENDING | Needs API calls + DB |
| 2.4 Auto-pause | PENDING | Needs DB seed + API calls |
| 2.5 Credit exhaustion | PENDING | Needs DB seed + API calls |
| 3.1 Retry safety | PENDING | Depends on 2.4/2.5 results |
| 3.2 Paused resume | PENDING | Depends on 2.3 results |
| 3.3 Health endpoint | PENDING | Needs API calls |
| 4.1 Inbox placement | PENDING | Depends on 1.1 results |

#### Known Risks Documented During Phase 5
- KR-1: Immediate PENDING campaigns orphaned on restart if BullMQ job lost (no scheduledAt watchdog) — low probability if Redis has AOF persistence, high probability if Redis is ephemeral. No fix during Phase 5 per instructions.

---

## Environment Variables Required
- AI_USAGE_LOG_RETENTION_DAYS (default 90) — already in Railway? Check.
- SES_SEND_RATE_MS=75 — MUST be set in Railway before deploy (manual action required).
- BOUNCE_RATE_PAUSE_THRESHOLD (default 0.15) — Phase 3
- COMPLAINT_RATE_PAUSE_THRESHOLD (default 0.005) — Phase 3

## Migration SQL Required
(None yet — Phase 3 will require SQL for platform_settings table and user columns)

### Phase 3 SQL (apply BEFORE deploying Phase 3 code):
```sql
CREATE TABLE IF NOT EXISTS platform_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS send_paused boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS send_paused_reason text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS send_paused_at timestamp;
```

## Known Issues / Blockers
- RESOLVED: Stripe startup crash — stripeWebhook.js threw unconditionally in production when STRIPE_WEBHOOK_SECRET unset. Fixed in hotfix commit (see below). Guard now only fires when STRIPE_SECRET_KEY is also set.
- Human action required: Set SES_SEND_RATE_MS=75 in Railway before first deploy.
- Human action required: Apply Phase 3 SQL migrations before deploying Phase 3 code.

## Post-Phase-3 Correctness Fixes
### isRetry + auto-requeue (approved pre-Phase-4 changes)
- Commit: PENDING (this commit)
- File 1: server/worker.js line 165 — isRetry now includes `status === "PAUSED" && hasAnySentEmails`
- File 2: server/routes.js resume-sending route — now queries all PAUSED campaigns and calls addCampaignJob() for each on resume; returns requeuedCampaigns count; audit log includes count
- Duplicate-job safety: addCampaignJob uses jobId=campaignId (BullMQ dedup) — calling it twice is a no-op
- Effect: mid-loop paused campaigns that already sent some emails will correctly skip those contacts on re-queue

## Hotfixes Applied (outside phase plan)
### Stripe startup crash fix
- Commit: PENDING (this commit)
- File: server/stripeWebhook.js line 18
- Change: `process.env.NODE_ENV === "production"` → `process.env.STRIPE_SECRET_KEY`
- Effect: Server starts cleanly when Stripe is not configured. Throw still fires if STRIPE_SECRET_KEY is set but STRIPE_WEBHOOK_SECRET is absent (correct behavior).
- Root cause: stripeWebhook.js was added in commit f4e5624 (pre-hardening branch) with an unconditional production throw that contradicted the optional-gateway design in gateways.js.

---

## AI-UX + Bugfix Release — 2026-06-06

### Commit
`cf92b4f` — [AI-UX] Quota visibility, spam score fixes, AI health, template guard, admin analytics

### Push
`6a48ddf..cf92b4f  main -> main` — pushed to GitHub at 2026-06-06

### Deployment
Railway auto-deploy triggered via GitHub push (no CLI available for direct verification).
**Human verification required:** Confirm Railway dashboard shows build `cf92b4f` completed successfully before signing off production validation below.

### Files Changed
| File | Change |
|---|---|
| `server/ai.js` | AI health tracking; `stripBracketPlaceholders` on template output; system prompt updated; `getAiHealthStatus` exported |
| `server/storage.js` | `refundAiQuota(userId)` added |
| `server/memoryStorage.js` | `refundAiQuota` mirror added |
| `server/routes.js` | `result.ai` in `/api/health`; `refundAiQuota` in 3 AI route catch blocks; `getAiHealthStatus` imported |
| `client/src/components/campaign/TemplateBuilder.jsx` | `queryClient` imported; `invalidateQueries` on success; quota indicator on trigger button |
| `client/src/components/campaign/AiPreview.jsx` | Renamed Merge Preview; positive framing alert; trigger renamed; `aiRewriteFailed` state; quota on button; `useAuth`/`queryClient` |
| `client/src/components/campaign/SpamAnalyzer.jsx` | Lazy `useState` init (Issue 3); structural suggestions as tips (Issue 4A); `escapeRegex` (Issue 4A); `analysisDirty` state (Issues 4B + 5); `analysisSource` tracking; Task I fallback banner; quota from user data |
| `client/src/lib/utils.js` | `calculateSpamScore` expanded: 15-word alternatives, subject length, word count, exclamation checks, `summary` field, `actionable: false` on all structural suggestions |
| `client/src/pages/Dashboard.jsx` | AI analytics panel for ROOT_ADMIN (cost, calls, cache hit rate, per-endpoint breakdown, top 5 spenders) |

### Bugs Fixed
| Issue | Description | Severity |
|---|---|---|
| Issue 3 | Spam score flashed 0 on first render — lazy `useState` init eliminates the flash | Medium |
| Issue 4A | Structural suggestions (subject length, exclamation count, word count) could corrupt the subject line via regex replacement — now rendered as tips with no Accept button | High |
| Issue 4A | `suggestion.original` passed unescaped to `new RegExp()` — subjects with metacharacters threw or matched incorrectly — `escapeRegex()` added | High |
| Issue 4B | Accepting an AI suggestion silently replaced AI score with local keyword score — `analysisDirty` state preserves AI score, marks it outdated | Medium |
| Issue 5 | Score increased after accepting a suggestion (AI 21 → local 41) — dirty state prevents scorer switching; local recalc only runs when analysisSource is already local | Medium |

### Production Validation
**Status: PENDING human access to production URL**

Manual checks to perform after confirming Railway build `cf92b4f`:

| Check | Expected | Result |
|---|---|---|
| Navigate to step 5 (Spam Analysis) for the first time | Score shows immediately — no 0 flash | PENDING |
| Run AI analysis; observe suggestions | Exclamation / subject length / word count items show as lightbulb tips with no Accept button | PENDING |
| Try accepting a structural tip | No Accept button present — not possible | PENDING |
| Run AI analysis; accept a word substitution (e.g. "free" → "complimentary") | Score greys out, badge shows "Outdated — re-analyze", "Re-analyze for updated score" prompt appears | PENDING |
| Click Re-analyze after accepting | Fresh analysis runs, score updates, dirty state clears | PENDING |
| Verify `/api/health` response | Response includes `"ai": "ok"` or `"ai": "unknown"` field | PENDING |
| Generate template via AI | Template body contains no `[Your Name]` or `[Title]` artifacts | PENDING |

### Remaining Known Limitations

**KL-1: Child user plan mismatch in quota display — RESOLVED in commit following cf92b4f**
- Fix applied: `effectivePlan` and `aiDailyLimit` added to `/api/auth/me` response. Client-side `AI_DAILY_LIMITS` lookup removed from all three components. All now use `user?.aiDailyLimit` (null = unlimited). ROOT_ADMIN/enterprise users now show "Unlimited" instead of blank.

**KL-2: `analysisDirty` not preserved across back-navigation**
- Description: If a user is in the dirty state (AI score outdated after an accept), navigates back to step 4 (Merge Preview), then returns to step 5 (Spam Analysis), the `SpamAnalyzer` component re-mounts. `analysisDirty` resets to `false`. `spamAnalysis` in CampaignContext holds the pre-accept AI result (no `source` field), so `analysisSource` initializes to `"local"` rather than `"ai"`. The user sees the stale AI score displayed without the outdated badge.
- Impact: Edge case. Only manifests if the user: runs AI analysis → accepts a suggestion → navigates back → returns. The displayed score is the pre-accept AI value (not wrong, just stale). Local scorer only triggers on subsequent accepts, which is the correct local-scorer path.
- Fix: Persist `analysisSource` alongside `spamAnalysis` in `CampaignContext`, and restore it on re-mount to determine the correct initial dirty state.
- Priority: Post-beta.

---

## Spam Analyzer Auto-Run + Accept Confirmation — 2026-06-06

### Issues fixed
- **Issue 1 (auto-run):** SpamAnalyzer now fires AI analysis automatically on step entry via `useEffect`. Server-side cache-first protection (`peekSpamCache`) ensures back-navigation with unchanged template never consumes quota. `fromCache: true` flag skips unnecessary `/api/auth/me` invalidation on cache hits.
- **Issue 2 (accept confirmation):** Accepting a suggestion now shows "in subject line", "in body", or "in subject line & body" below the Applied badge, confirming exactly where the email text was modified.

### Quota accounting — exact behavior

| Scenario | Client | Server | Quota impact |
|---|---|---|---|
| First entry to Analyze step | `useEffect` fires mutation | Cache miss → quota decremented → AI call | −1 |
| Back navigation, same template | `useEffect` fires mutation | `peekSpamCache` hit → returns immediately | 0 |
| Back navigation, template edited | `useEffect` fires mutation | Cache miss (new key) → quota decremented | −1 |
| Quota exhausted on mount | `aiExhausted=true` → no-op | N/A | 0 |
| Manual Re-analyze, same content | Button fires mutation | `peekSpamCache` hit → returns immediately | 0 |
| Cache expired (>1h), same template | `useEffect` fires mutation | Cache miss → quota decremented → fresh AI call | −1 |

### Files changed
| File | Change |
|---|---|
| `server/ai.js` | Added `peekSpamCache(subject, body)` — synchronous cache peek, same SHA-256 key as `analyzeSpam` |
| `server/routes.js` | Spam-analysis route: `peekSpamCache` check before quota increment; cache hits return `fromCache: true` without audit log |
| `client/src/components/campaign/SpamAnalyzer.jsx` | `useEffect` auto-run on mount; `acceptedDetails` state tracks changed fields; "in subject line / body" render after Applied badge; `fromCache` strips from analysisData; `invalidateQueries` gated on `!fromCache`; `acceptedDetails` reset in `onSuccess`/`onError` |

---

## AI Quota UX + Documentation — 2026-06-06

### Changes

**Item 1 — AI quota visibility (server-side source of truth):**
- `server/routes.js` `/api/auth/me`: now calls `storage.getEffectivePlan(req.user.id)` and returns `effectivePlan` and `aiDailyLimit` (null = unlimited, number = limit). `AI_DAILY_LIMITS` added to schema import.
- All three client components (TemplateBuilder, AiPreview, SpamAnalyzer): removed local `AI_DAILY_LIMITS` constant. Quota logic now reads `user?.aiDailyLimit` from server. Fixes KL-1 (child user mismatch) and ROOT_ADMIN blank display.

**Item 2 — AI quota warnings:**
- 80% consumed: yellow text on quota indicator
- 100% consumed: red "Limit reached" text; AI trigger button disabled before server round-trip
- All users with unlimited quota see "Unlimited" / "Unlimited AI usage" — no blank state

**Item 3 — AI status consistency:**
- Before this commit, three inconsistencies existed: (a) ROOT_ADMIN/enterprise showed blank quota (aiIsUnlimited hid the indicator entirely); (b) child users saw wrong limit (parent's plan not inherited); (c) no warning states at 80%/100%.
- All three are now resolved. Behavior is identical across TemplateBuilder, AiPreview, SpamAnalyzer.

**Item 4 — Documentation:**
- PROGRESS.md and REPMAIL_ENGINEERING_HANDOFF.md committed (were locally modified but uncommitted after cf92b4f).

### Files Changed
| File | Change |
|---|---|
| `server/routes.js` | `AI_DAILY_LIMITS` added to schema import; `/api/auth/me` now includes `effectivePlan` and `aiDailyLimit` |
| `client/src/components/campaign/TemplateBuilder.jsx` | Removed `AI_DAILY_LIMITS` const; quota logic uses server values; unlimited/warning/exhausted display states; button disabled when exhausted |
| `client/src/components/campaign/AiPreview.jsx` | Same as TemplateBuilder |
| `client/src/components/campaign/SpamAnalyzer.jsx` | Same as TemplateBuilder |
| `PROGRESS.md` | This section + KL-1 marked resolved |
| `REPMAIL_ENGINEERING_HANDOFF.md` | Uncommitted local changes committed |

---

## Spam Analyzer Trust Redesign — 2026-06-06

### Commit
`f0cbbbb` — [PHASE-5] Spam analyzer redesign: deterministic primary score + AI advisory panel

### Root Cause Addressed
Score could increase (e.g. 36 → 41) after the user accepted AI suggestions. Two blocking causes:
1. Merge tags (`{{name}}`, `{{company}}`) sent raw to GPT → dimension 5 "mass-blast template" penalty
2. GPT's holistic score used as the primary displayed score → non-deterministic, holistic re-weighting after accepting one suggestion could increase other dimension scores

### Design
- **Primary score**: `calculateSpamScore` — deterministic, keyword-based, always reflects current template. Score can only decrease when keyword suggestions are accepted.
- **AI Deliverability Review**: qualitative panel with AI summary and structural observations. No AI numeric score shown (eliminates score confusion and trust failure).
- **AI Recommendations**: actionable AI suggestions shown as a secondary subsection; Apply button only shown when the original phrase is found in the raw template (handles merge-tag substitution mismatch).
- **Score delta**: "Was 36 → Now 28 (−8)" shown after first AI analysis when local score has moved.
- **Merge tag substitution**: first-contact data (or demo values) substituted before sending to GPT; GPT evaluates rendered email, not raw `{{name}}`/`{{company}}` syntax.
- **Accepted suggestion suppression**: accepted words passed to server in POST body; server filters them from cache hits and injects them into the AI prompt context.

### State Model Changes
| Removed | Replacement |
|---|---|
| `analysis` (single source for both score and display) | `localScore` (live score) + `displayAnalysis` (stable snapshot for rendering) + `aiAnalysis` (AI-only result) |
| `analysisSource` | Not needed — primary score is always local |
| `analysisDirty` | Not needed — primary score always current, no dirty state |

### Files Changed
| File | Change |
|---|---|
| `server/ai.js` | `analyzeSpam`: destructures `acceptedSuggestions` from opts; appends accepted-context block to user prompt; both `logUsageToDb` calls use destructured `userId` |
| `server/routes.js` | Spam-analysis route: extracts `acceptedSuggestions` from request body; cache hits filtered by accepted set before return; `acceptedSuggestions` passed to `analyzeSpam` on cache miss |
| `client/src/components/campaign/SpamAnalyzer.jsx` | Complete redesign — see design notes above |

### Quota Accounting — unchanged
Cache-first behavior (`peekSpamCache`) is unchanged. Merge tag substitution changes the cache key (rendered content vs raw template), which is intentional — different rendered content warrants a different cache entry.

### Known Limitations (post-redesign)
- **KL-2 resolved by redesign**: `analysisDirty` back-navigation issue no longer exists — primary score is always live, no dirty state to preserve.
- **AI observations deduplication**: AI structural observations in the AI Review card may overlap in spirit with local structural tips (e.g., both might flag a long subject). This is acceptable — they come from different analysis systems and provide complementary context.
- **Apply button on AI recommendations**: Only shown when the original phrase is in the raw template. AI suggestions referencing rendered content (e.g., "Hi Alex" when template has "Hi {{name}}") show without an Apply button. This is correct behavior — the raw template doesn't have "Alex".
- **Score delta after back-navigation**: `prevScore` is component state, resets on re-mount. Delta only appears after the first AI analysis on that mount. No stale delta from a previous session.

---

## calculateSpamScore Expansion — 2026-06-06

### Commit
`cd1714b` — [SCORING] Expand calculateSpamScore with 3 new signals + 2 advisory warnings

### File changed
`client/src/lib/utils.js` — `calculateSpamScore` only. No server changes. No schema changes. No AI quota or cache impact.

### New scored signals

| Signal | Rule | Points |
|---|---|---|
| Re:/Fwd: deceptive subject | `/^\s*(re\|fwd\|fw)\s*:/i` matches subject | +15 |
| Generic greeting | Pattern list matches first 200 chars of body | +5 |
| Link count (4–5 links) | `https?://` count in body ≥ 4 | +5 |
| Link count (6+ links) | `https?://` count in body ≥ 6 | +10 |

Generic greeting patterns: "Hi there", "Hello there", "Dear Sir/Madam", "To Whom It May Concern", "Greetings", "Dear All", "Dear Customer", "Dear Friend".

Threshold for links set at 4 (not 3) to accommodate Calendly + website + unsubscribe as a common clean pattern.

### Advisory warnings (no score, tip only)

| Advisory | Threshold |
|---|---|
| Placeholder count | ≥ 4 unique `{{fields}}` in subject + body combined |
| CTA count | ≥ 3 distinct CTA phrases (schedule a, book a, click here, visit our, download, register, sign up, learn more, get started, call us, call me) |

### Score impact examples

| Email | Before | After |
|---|---|---|
| Clean cold outreach (Hi Sarah, named greeting, no links) | 0 | 0 |
| Re: subject + "Hi there" | 0 | 20 |
| 4 links, clean language | 0 | 5 |
| Fwd: + Dear Customer + 5 links | 0 | 25 |
| High-spam multi-keyword email + Re: + Hi there | 54 | 74 |

---

## Score Composition Breakdown — 2026-06-06

### Commit
`a0d5fc1` — [PHASE-5] Score composition breakdown in Spam Analyzer

### Problem
The Spam Score card showed only a total number, risk badge, and progress bar. Users could not see which rules contributed how many points — reducing transparency and trust.

### Solution
`calculateSpamScore` now returns a `breakdown: [{ label: string, points: number }]` array. Each rule that fires and contributes points pushes one entry. Advisory tips (placeholder count, CTA count) do not appear — they have no numeric value.

The Score card renders a per-rule table directly below the risk badge. Shown only when `score > 0`. Format:

```
+15  Re: / Fwd: subject prefix
+5   Generic greeting
+5   4 links
+5   2 spam keywords (free, guarantee)
─────────────────────────────────────
= 30
```

State model updated: `localScore` (number) replaced by `localAnalysisLive` (full analysis object). `localAnalysisLive.score` and `localAnalysisLive.breakdown` are always current and update on every accepted suggestion.

### Files changed
| File | Change |
|---|---|
| `client/src/lib/utils.js` | Added `wasAllCaps` / `wasLongSubject` flags; built `breakdown` array parallel to scoring; returned `breakdown` in result |
| `client/src/components/campaign/SpamAnalyzer.jsx` | `localScore` state replaced by `localAnalysisLive`; breakdown table rendered below badge in Score card |

### Score breakdown rules tracked
| Rule | Breakdown label | Points |
|---|---|---|
| Spam keywords | `N spam keyword(s) (word1, word2...)` | N × 5 |
| ALL CAPS subject | `ALL CAPS subject` | 15 |
| Subject too long | `Subject too long` | 5 |
| Re:/Fwd: prefix | `Re: / Fwd: subject prefix` | 15 |
| Exclamation marks | `N exclamation mark(s)` | min(N×2, 10) |
| Body > 200 words | `N-word body` | 5 |
| 4–5 links | `N links` | 5 |
| 6+ links | `N links` | 10 |
| Generic greeting | `Generic greeting` | 5 |

### 4-link validation (Calendly + website + LinkedIn + unsubscribe)
RepMail injects the unsubscribe link server-side at send time. The raw template has 3 links (Calendly + website + LinkedIn). `calculateSpamScore` evaluates the raw template → 3 links → below threshold → **no penalty**. The +5 penalty only fires if the user manually adds a 4th `https://` in their template, which is appropriate to flag (and the breakdown will show exactly why).

### Production validation checklist
| Check | Expected | Result |
|---|---|---|
| Template with Re: + generic greeting + 4 links | Score card shows breakdown: +15, +5, +5 = 25 | PENDING |
| Template with 0 triggers | Score card shows no breakdown section | PENDING |
| Accept a keyword suggestion | Score and breakdown update immediately | PENDING |
| Re-run AI analysis | localAnalysisLive resets, breakdown reflects post-accept template | PENDING |
