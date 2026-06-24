# RepMail — Final Production Hardening Plan
# Version: FINAL (post all-AI-review synthesis)
# Attach this file to Claude Code. It is the single source of truth.

---

## HOW TO USE THIS DOCUMENT

This is a phased, sequential execution plan. Claude Code must:
1. Complete Phase 0 (verification) before writing any code
2. Execute phases in strict order: 0 → 1 → 2 → 3 → 4 → 5
3. After each task: confirm completion, state files changed, state env vars required
4. Never skip Phase 0. Never assume something is done without verifying.
5. Never implement more than one task without confirmation between tasks.

Token efficiency rules:
- Do NOT scan the full repo with ls -R
- Do NOT read files not listed for a given task
- Do NOT generate architectural summaries unless explicitly asked
- Do NOT suggest cosmetic improvements unless in Phase 4
- Read only the specific files listed per task

---

## PROJECT CONTEXT (do not re-derive)

RepMail is a B2B email campaign SaaS. Single Railway instance.
Stack: Node.js ESM, Express 4, Drizzle ORM, PostgreSQL, BullMQ 5.x + IORedis, Nodemailer/SES SMTP, React 18 + Vite + Wouter + TanStack Query, Radix UI + Tailwind + shadcn/ui, Zod, Stripe + Razorpay.

Key files:
- server/index.js       — entry, middleware, cleanup jobs, startup recovery, graceful shutdown
- server/routes.js      — all Express routes via registerRoutes()
- server/worker.js      — BullMQ worker, processCampaign(), sendWithRetry()
- server/storage.js     — PostgreSQL dbStorage (every new method mirrors to memoryStorage)
- server/memoryStorage.js — in-memory dev shim (must mirror every storage.js method)
- server/queue.js       — getCampaignQueue(), addCampaignJob(), getRedisConnection()
- server/rateLimiter.js — Redis Lua token bucket
- server/sns.js         — SNS RSA-SHA1 signature verification
- server/unsubscribe.js — generateUnsubscribeToken(), verifyUnsubscribeToken()
- server/email.js       — sendCampaignEmail(), verifySesConnection()
- shared/schema.js      — all Drizzle table defs, constants, Zod schemas
- client/src/pages/     — React page components
- client/src/components/ — shared UI components

Confirmed production state:
- SES: live, production sending confirmed, config set "my-first-configuration-set"
- SNS: repmail_events topic, subscription confirmed live
- BullMQ: jobId=campaignId, attempts:3, exponential backoff 5s, concurrency:3
- Rate limiter: Redis Lua token bucket, SES_RATE_PER_SECOND default 14, per-campaign cap = floor(rate × 0.6)
- 5 cleanup jobs exist: SNS pruning, sessions, audit logs, campaign emails, inactivity tokens
- ai_usage_logs: confirmed NO cleanup job — growing unboundedly

---

## IRON RULES — never violate, never ask permission to follow

1. SCHEMA FIRST: shared/schema.js updated BEFORE storage methods or routes. SQL migration applied to Railway Postgres BEFORE code deployment.
2. MIRROR BOTH STORAGES: every new dbStorage method gets identical interface in memoryStorage.js. Same param names, same return shape.
3. SEQUENTIAL LOOPS: for...of only for contact/user iteration. Never Promise.all on campaign contacts or user arrays.
4. SEND BEFORE DEDUCT: updateCampaignEmail(SENT) before deductCreditAtomic(). Always.
5. VALIDATION BEFORE WRITE: full pipeline completes before storage.createCampaign().
6. CLEANUP GUARD PATTERN: every cleanup/governance job must have let running = false with try{}finally{ running = false }.
7. SNS ACK ORDER: res.sendStatus(200) AFTER signature verification AND TopicArn check. Never before.
8. RETRY DETECTION: isRetry uses hasAnySentEmails(campaignId), not campaign.status.
9. OPEN/CLICK GUARD: increments only when wasFirst === true from atomic WHERE IS NULL query.
10. HEALTH IS PUBLIC: /api/health bypasses all auth middleware and REPMAIL_PUBLIC gate.
11. NO LOOP DB QUERIES: never put database queries inside a per-contact or per-user for loop that run per-iteration for data that doesn't change per contact (settings, health scores, global flags). Fetch once before the loop.
12. HEARTBEAT AT WORKER LEVEL: heartbeat setInterval belongs at worker initialization, not inside processCampaign().

---

## PRE-WORK: DO THIS IN RAILWAY NOW (before opening Claude Code)

Set this environment variable in Railway dashboard immediately:
  SES_SEND_RATE_MS=75

Reason: default is 0. If Redis drops during a campaign, the worker sends at uncapped Node.js loop speed and blows through SES rate limits, risking permanent SES account suspension. This is a Railway config change — 30 seconds, do it now.

---

## PHASE 0 — VERIFICATION (mandatory, no code writing)

Read these specific files and report EXISTS / MISSING / PARTIAL for each item.

### Read server/routes.js — search for:
- [ ] GET /api/health — does it exist? Is it registered BEFORE any auth or REPMAIL_PUBLIC middleware?
- [ ] GET /api/admin/queue/status — exists?
- [ ] POST /api/admin/campaigns/:id/cancel — exists?
- [ ] GET /api/campaigns/:id/audit — exists?
- [ ] GET /api/admin/delivery-health — exists?
- [ ] GET /api/unsubscribe — exists? What does it return — JSON or HTML? Copy the response line.
- [ ] POST /api/admin/platform/pause-sending — exists?

### Read server/worker.js — search for:
- [ ] repmail:worker:heartbeat — any Redis write to this key?
- [ ] Any setInterval for heartbeat — where is it? Inside processCampaign() or at worker init level?
- [ ] Where exactly is the per-contact for loop? Copy the opening line of the loop.

### Read server/index.js — search for:
- [ ] CORS allowedOrigins — does it contain 'localhost:8083' or port 8083?
- [ ] Inactivity governance job — does it have let running = false guard + finally block?
- [ ] How many cleanup jobs total? List their names/purposes.
- [ ] Any call to pruneAiUsageLogs — exists?

### Read server/storage.js — search for:
- [ ] pruneAiUsageLogs method — exists?
- [ ] getDeliveryHealthStats method — exists?
- [ ] getPlatformSetting method — exists?
- [ ] getUserSenderHealth method — exists?
- [ ] getAuditLogs — does it support a targetId filter parameter?

### Read shared/schema.js — search for:
- [ ] platformSettings table definition — exists?
- [ ] sendPaused column on users table — exists?

### Read client/src/pages/ — list filenames only:
- [ ] Identify the campaign detail/view page component filename

### After reporting all findings:
State your implementation plan: which tasks you will skip (EXISTS) and which you will implement (MISSING/PARTIAL). Wait for confirmation before proceeding to Phase 1.

---

## PHASE 1 — SAFETY FIXES (pure hardening, no new features)

These are fixes to existing broken or dangerous behavior. Implement in order.

### Task 1.1 — SES_SEND_RATE_MS startup warning
File: server/rateLimiter.js
Find where SES_SEND_RATE_MS is read. Add a startup log immediately after:
```js
const sendRateMs = parseInt(process.env.SES_SEND_RATE_MS || '0', 10);
if (sendRateMs === 0) {
  console.warn('[STARTUP] WARNING: SES_SEND_RATE_MS is 0 or unset. If Redis becomes unavailable, campaign sends will run at uncapped speed. Set SES_SEND_RATE_MS=75 minimum in production.');
}
```
No schema change. No migration. No storage change.

Validation: restart server locally (or check Railway logs on next deploy) — warning should appear at boot if env var is 0.

---

### Task 1.2 — Fix /api/health public access
File: server/routes.js
If Phase 0 found /api/health blocked by REPMAIL_PUBLIC gate or authMiddleware: move its registration to the FIRST route in registerRoutes(), before any middleware application. The route must be reachable with no cookies, no auth headers, and regardless of REPMAIL_PUBLIC value.

Target response shape:
```json
{
  "status": "ok",
  "postgres": "connected",
  "redis": "connected",
  "smtp": "verified",
  "worker": "running",
  "sendPaused": false,
  "uptime": 1234,
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```
Return 200 if postgres=connected. Return 503 if postgres=error (postgres is the only hard dependency).
worker field: read from Redis key repmail:worker:heartbeat — "running" if key exists and timestamp < 60s ago, "stalled" if absent/stale, "not_monitored" if Redis unavailable.
sendPaused field: leave as false for now (platform_settings table doesn't exist yet — implement properly in Phase 3).

SMTP check — MUST be cached. Do NOT call verifySesConnection() live on every health request. Railway and uptime monitors hit /api/health every 10–30 seconds. A live SMTP verify opens a real TCP connection to AWS SES on every call — this will exhaust connections and AWS will throttle you.

Implement a module-level cache in server/routes.js (or a small helper):
```js
// SMTP health cache — recheck every 5 minutes only
let smtpHealthCache = { status: 'unknown', checkedAt: 0 };
async function getSmtpHealth() {
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  if (Date.now() - smtpHealthCache.checkedAt < CACHE_TTL_MS) {
    return smtpHealthCache.status; // Return cached value
  }
  try {
    await verifySesConnection();
    smtpHealthCache = { status: 'verified', checkedAt: Date.now() };
  } catch {
    smtpHealthCache = { status: 'error', checkedAt: Date.now() };
  }
  return smtpHealthCache.status;
}
```

In the health handler, use: `checks.smtp = await getSmtpHealth();`

This means SMTP is checked at most once every 5 minutes regardless of how often the health endpoint is hit.

Import requirements: verifySesConnection from server/email.js, getRedisConnection from server/queue.js, db and sql from server/db.js.

Validation: curl the health endpoint without any auth headers. Should return 200 JSON. Call it 10 times in quick succession — Railway logs should NOT show 10 SMTP connection attempts.

---

### Task 1.3 — Fix unsubscribe endpoint to render HTML
File: server/routes.js (and server/unsubscribe.js if needed)
Find GET /api/unsubscribe handler. Read server/unsubscribe.js to understand verifyUnsubscribeToken() return shape.

If it currently returns JSON, replace the response with res.setHeader('Content-Type', 'text/html') and render minimal HTML for all three states:

Valid + newly unsubscribed:
```html
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribed</title><style>body{font-family:sans-serif;max-width:480px;margin:80px auto;padding:0 20px;text-align:center;color:#1a1a1a}.icon{font-size:48px;margin-bottom:16px}h1{font-size:22px;font-weight:600;margin-bottom:8px}p{color:#555;line-height:1.5}</style></head><body><div class="icon">✓</div><h1>You've been unsubscribed</h1><p>You will no longer receive emails from this sender. This change takes effect immediately.</p></body></html>
```

Already unsubscribed:
```html
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Already Unsubscribed</title><style>body{font-family:sans-serif;max-width:480px;margin:80px auto;padding:0 20px;text-align:center;color:#1a1a1a}.icon{font-size:48px;margin-bottom:16px}h1{font-size:22px;font-weight:600;margin-bottom:8px}p{color:#555;line-height:1.5}</style></head><body><div class="icon">✓</div><h1>Already unsubscribed</h1><p>You are already unsubscribed from this sender. No further action is needed.</p></body></html>
```

Invalid/expired token:
```html
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invalid Link</title><style>body{font-family:sans-serif;max-width:480px;margin:80px auto;padding:0 20px;text-align:center;color:#1a1a1a}.icon{font-size:48px;margin-bottom:16px}h1{font-size:22px;font-weight:600;margin-bottom:8px}p{color:#555;line-height:1.5}</style></head><body><div class="icon">⚠</div><h1>Invalid or expired link</h1><p>This unsubscribe link is no longer valid. Please contact the sender directly if you wish to unsubscribe.</p></body></html>
```

No auth required. No redirect. This is a public endpoint.
Note: if Phase 0 found the endpoint already returns HTML, verify all three states are handled and move on.

Validation: click an unsubscribe link from a real sent email (or construct the URL manually with a valid token). Confirm browser renders HTML page, not JSON.

---

### Task 1.4 — Enforce unsubscribe footer in campaign validation
File: server/routes.js
Find the campaign validation pipeline in POST /api/campaigns. Locate where validationErrors are assembled (after placeholder cross-reference, before getPreCampaignSuppressionCount).

Add this check:
```js
// CAN-SPAM compliance: body must contain unsubscribe link placeholder
const bodyToCheck = (templateBody || '').toLowerCase();
if (!bodyToCheck.includes('{{unsubscribe_url}}') && !bodyToCheck.includes('unsubscribe')) {
  validationErrors.push('Template body must include {{unsubscribe_url}} for CAN-SPAM compliance. Recipients must be able to opt out.');
}
```

IMPORTANT: This must be a blocking error that prevents campaign creation, not just a warning. If validationErrors.length > 0 at the point where the campaign would be blocked, this will already be blocked. Confirm that validationErrors causes a rejection return before createCampaign() is called — if not, make this a blocking error explicitly.

No schema change. No migration. No storage change.

Validation: attempt to create a campaign with a template body that has no 'unsubscribe' text — should receive 400 with the error message. Campaign with {{unsubscribe_url}} in body should proceed normally.

---

### Task 1.5 — Add overlap guard to inactivity governance job
File: server/index.js
Find the inactivity governance job (likely runInactivityJob or similar, runs on daily setInterval).
If it does NOT have a let running = false guard already:

Wrap it with the same pattern used by all 5 cleanup jobs:
```js
let inactivityJobRunning = false;
async function runInactivityJob() {
  if (inactivityJobRunning) {
    console.warn('[INACTIVITY] Job still in progress — skipping this interval');
    return;
  }
  inactivityJobRunning = true;
  try {
    // ... existing job body ...
  } catch (err) {
    console.error('[INACTIVITY] Job error:', err.message);
  } finally {
    inactivityJobRunning = false;
  }
}
```

No schema change. No migration.

Validation: confirm the function has the guard. No runtime test needed.

---

### Task 1.6 — Remove CORS dev artifact
File: server/index.js
Find the CORS configuration. Remove 'localhost:8083' (or http://localhost:8083) from allowedOrigins.
One-line change. Do it while the file is open from Task 1.5.

Validation: visual inspection of the change.

---

### PHASE 1 COMPLETE CHECKPOINT
After all 1.x tasks: confirm:
- [ ] SES_SEND_RATE_MS=75 is set in Railway (manual action required by you, not Claude)
- [ ] /api/health returns 200 without auth
- [ ] Unsubscribe endpoint renders HTML
- [ ] Campaign without unsubscribe placeholder is blocked
- [ ] Inactivity job has overlap guard
- [ ] CORS dev artifact removed

---

## PHASE 2 — OPERATIONAL OBSERVABILITY

Implement only tasks found MISSING in Phase 0. Skip confirmed existing items.

### Task 2.1 — ai_usage_logs cleanup job (6th cleanup job)
Files: server/index.js, server/storage.js, server/memoryStorage.js

Add to server/storage.js (in dbStorage object, after pruneAuditLogs):
```js
async pruneAiUsageLogs(retentionDays) {
  const cutoff = new Date(Date.now() - retentionDays * 86400000);
  const deleted = await db
    .delete(aiUsageLogs)
    .where(lt(aiUsageLogs.createdAt, cutoff))
    .returning({ id: aiUsageLogs.id });
  return deleted.length;
},
```

Add to server/memoryStorage.js (mirror — same signature):
```js
async pruneAiUsageLogs(retentionDays) {
  const cutoff = new Date(Date.now() - retentionDays * 86400000);
  let count = 0;
  for (const [id, log] of this.aiUsageLogs || new Map()) {
    if (log.createdAt < cutoff) { this.aiUsageLogs.delete(id); count++; }
  }
  return count;
},
```

Add to server/index.js (6th cleanup job, 20-minute offset, weekly schedule):
```js
setTimeout(() => {
  let running = false;
  async function runAiLogCleanup() {
    if (running) { console.warn('[CLEANUP] AI log cleanup still in progress — skipping'); return; }
    running = true;
    const retentionDays = parseInt(process.env.AI_USAGE_LOG_RETENTION_DAYS || '90', 10);
    try {
      const count = await storage.pruneAiUsageLogs(retentionDays);
      console.log(`[CLEANUP] AI usage logs pruned (older than ${retentionDays}d): ${count}`);
    } catch (err) {
      console.error('[CLEANUP] AI log cleanup error:', err.message);
    } finally {
      running = false;
    }
  }
  runAiLogCleanup();
  setInterval(runAiLogCleanup, 7 * 24 * 60 * 60 * 1000);
}, 20 * 60 * 1000);
```

New env var: AI_USAGE_LOG_RETENTION_DAYS (default 90, add to Railway).
No schema change. No migration.

Validation: confirm log line [CLEANUP] AI usage logs pruned appears in Railway logs 20 minutes after next deploy.

---

### Task 2.2 — Worker heartbeat
File: server/worker.js

CRITICAL: The heartbeat setInterval must be created at WORKER INITIALIZATION level, NOT inside processCampaign(). Putting it inside processCampaign() with concurrency=3 creates 3 simultaneous intervals all writing the same key, and any job that stalls or throws before hitting completed/failed listeners leaks the interval permanently.

Find where the BullMQ Worker instance is created (new Worker(...)) — this is the correct location.

Add after worker initialization:
```js
// Worker-level heartbeat — write every 30s as long as worker process is alive
const redisConnForHeartbeat = getRedisConnection();
if (redisConnForHeartbeat) {
  setInterval(async () => {
    try {
      await redisConnForHeartbeat.set('repmail:worker:heartbeat', Date.now().toString(), 'EX', 60);
    } catch {
      // Heartbeat failure is non-fatal — silently skip
    }
  }, 30_000);
}
```

Then update GET /api/health in server/routes.js to read this key:
```js
// Worker heartbeat check
try {
  const hbValue = await conn.get('repmail:worker:heartbeat');
  if (hbValue) {
    const hbAge = Date.now() - parseInt(hbValue, 10);
    checks.worker = hbAge < 60_000 ? 'running' : 'stalled';
  } else {
    checks.worker = 'stalled';
  }
} catch {
  checks.worker = 'unknown';
}
```

No schema change. No migration.

Validation: after deploy, GET /api/health should show worker: "running" within 30 seconds of worker startup.

---

### Task 2.3 — Force-cancel campaign endpoint (if MISSING)
File: server/routes.js

Add after existing admin routes (ROOT_ADMIN only):
```js
app.post('/api/admin/campaigns/:id/cancel', authMiddleware, rootAdminMiddleware, async (req, res) => {
  try {
    const campaign = await storage.getCampaign(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    await storage.updateCampaign(req.params.id, { status: 'FAILED' });

    const queue = getCampaignQueue();
    if (queue) {
      try {
        const job = await queue.getJob(req.params.id);
        if (job) await job.remove();
      } catch (qErr) {
        console.warn(`[ADMIN] BullMQ job removal failed for ${req.params.id}:`, qErr.message);
        // Non-fatal — campaign is already marked FAILED in DB
      }
    }

    await storage.createAuditLog({
      userId: req.user.id,
      action: AUDIT_ACTIONS.CAMPAIGN_FAILED,
      targetType: 'campaign',
      targetId: req.params.id,
      details: { reason: 'force_cancelled_by_admin', adminId: req.user.id },
    });

    res.json({ message: 'Campaign cancelled', campaignId: req.params.id });
  } catch (err) {
    console.error('[ADMIN] Force-cancel error:', err);
    res.status(500).json({ message: err.message });
  }
});
```

No schema change. No migration.

Validation: create a campaign, confirm it exists, call this endpoint, verify status=FAILED in DB.

---

### Task 2.4 — Queue status endpoint (if MISSING)
File: server/routes.js

```js
app.get('/api/admin/queue/status', authMiddleware, rootAdminMiddleware, async (req, res) => {
  try {
    const queue = getCampaignQueue();
    if (!queue) {
      return res.json({ available: false, reason: 'Redis not configured' });
    }
    const counts = await queue.getJobCounts('active', 'waiting', 'delayed', 'failed', 'completed');
    const failedJobs = await queue.getFailed(0, 10);
    res.json({
      available: true,
      counts,
      recentFailures: failedJobs.map(j => ({
        jobId: j.id,
        campaignId: j.data?.campaignId,
        failedReason: j.failedReason,
        attemptsMade: j.attemptsMade,
        finishedOn: j.finishedOn,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
```

No schema change. No migration.

Validation: call the endpoint as ROOT_ADMIN. Confirm counts object is returned.

---

### Task 2.5 — Campaign audit trail (if MISSING)
Files: server/storage.js, server/memoryStorage.js, server/routes.js

In server/storage.js, find getAuditLogs(filters). Add targetId filter:
```js
if (filters.targetId) conditions.push(eq(auditLogs.targetId, filters.targetId));
```

Mirror in server/memoryStorage.js — add the same filter to the in-memory implementation.

Add route to server/routes.js:
```js
app.get('/api/campaigns/:id/audit', authMiddleware, async (req, res) => {
  try {
    const campaign = await storage.getCampaign(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    // Owner, root admin, or secondary root can access
    if (campaign.userId !== req.user.id && !req.user.isRootAdmin && !req.user.isSecondaryRoot) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const logs = await storage.getAuditLogs({ targetId: req.params.id, limit: 200 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
```

No schema change. No migration.

Validation: create and run a campaign, call GET /api/campaigns/:id/audit, confirm audit entries are returned.

---

### Task 2.6 — Delivery health endpoint
Files: server/storage.js, server/memoryStorage.js, server/routes.js

Add to server/storage.js:
```js
async getDeliveryHealthStats() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  // Platform-wide send/bounce/complaint totals (last 30 days)
  const totals = await db
    .select({
      totalSent: sql`COALESCE(SUM(sent_emails), 0)`,
      totalBounced: sql`COALESCE(SUM(bounced_emails), 0)`,
      totalComplained: sql`COALESCE(SUM(complained_emails), 0)`,
    })
    .from(campaigns)
    .where(gte(campaigns.createdAt, thirtyDaysAgo));

  const { totalSent, totalBounced, totalComplained } = totals[0] || { totalSent: 0, totalBounced: 0, totalComplained: 0 };
  const sent = Number(totalSent);
  const bounced = Number(totalBounced);
  const complained = Number(totalComplained);
  const bounceRate = sent > 0 ? bounced / sent : 0;
  const complaintRate = sent > 0 ? complained / sent : 0;

  // Status thresholds (AWS SES recommended limits)
  let status = 'healthy';
  if (bounceRate > 0.10 || complaintRate > 0.005) status = 'critical';
  else if (bounceRate > 0.05 || complaintRate > 0.001) status = 'warning';

  // Top 5 users by bounce rate (last 30 days, min 10 sent to be meaningful)
  const topBouncers = await db
    .select({
      userId: campaigns.userId,
      userEmail: users.email,
      totalSent: sql`SUM(sent_emails)`,
      totalBounced: sql`SUM(bounced_emails)`,
    })
    .from(campaigns)
    .innerJoin(users, eq(campaigns.userId, users.id))
    .where(gte(campaigns.createdAt, thirtyDaysAgo))
    .groupBy(campaigns.userId, users.email)
    .having(sql`SUM(sent_emails) >= 10`)
    .orderBy(sql`SUM(bounced_emails)::float / NULLIF(SUM(sent_emails), 0) DESC`)
    .limit(5);

  // Suppression growth
  const [suppressionLast7d] = await db
    .select({ count: sql`COUNT(*)` })
    .from(suppressions)
    .where(gte(suppressions.createdAt, sevenDaysAgo));

  const [suppressionLast30d] = await db
    .select({ count: sql`COUNT(*)` })
    .from(suppressions)
    .where(gte(suppressions.createdAt, thirtyDaysAgo));

  return {
    status,
    period: '30d',
    totals: { sent, bounced, complained },
    rates: {
      bounceRate: parseFloat((bounceRate * 100).toFixed(2)),
      complaintRate: parseFloat((complaintRate * 100).toFixed(4)),
    },
    thresholds: {
      bounce: { warning: 5, critical: 10, unit: '%' },
      complaint: { warning: 0.1, critical: 0.5, unit: '%' },
    },
    topBouncers: topBouncers.map(u => ({
      userId: u.userId,
      email: u.userEmail,
      sent: Number(u.totalSent),
      bounced: Number(u.totalBounced),
      bounceRate: Number(u.totalSent) > 0
        ? parseFloat((Number(u.totalBounced) / Number(u.totalSent) * 100).toFixed(2))
        : 0,
    })),
    suppression: {
      addedLast7d: Number(suppressionLast7d?.count || 0),
      addedLast30d: Number(suppressionLast30d?.count || 0),
    },
  };
},
```

Mirror in server/memoryStorage.js (return zeroed structure):
```js
async getDeliveryHealthStats() {
  return {
    status: 'healthy',
    period: '30d',
    totals: { sent: 0, bounced: 0, complained: 0 },
    rates: { bounceRate: 0, complaintRate: 0 },
    thresholds: { bounce: { warning: 5, critical: 10, unit: '%' }, complaint: { warning: 0.1, critical: 0.5, unit: '%' } },
    topBouncers: [],
    suppression: { addedLast7d: 0, addedLast30d: 0 },
  };
},
```

Add route to server/routes.js:
```js
app.get('/api/admin/delivery-health', authMiddleware, rootAdminMiddleware, async (req, res) => {
  try {
    const stats = await storage.getDeliveryHealthStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
```

No schema change. No migration.

Validation: call GET /api/admin/delivery-health as ROOT_ADMIN. Confirm response shape matches above. Confirm rate calculations are correct against known DB data.

---

### PHASE 2 COMPLETE CHECKPOINT
After all 2.x tasks:
- [ ] GET /api/health shows worker status dynamically (running/stalled)
- [ ] ai_usage_logs cleanup job visible in Railway logs after 20min
- [ ] Force-cancel endpoint returns success for a known campaign
- [ ] Queue status endpoint returns counts
- [ ] Campaign audit endpoint returns entries for a known campaign
- [ ] Delivery health endpoint returns data with correct status field
- [ ] All new storage methods have memoryStorage mirrors

---

## PHASE 3 — SES REPUTATION PROTECTION

These are genuinely new features. Implement only after Phase 1 and Phase 2 are confirmed complete.

### Task 3.1 — Global send pause switch

STEP A — Schema and migration (do this first):
Add to shared/schema.js:
```js
export const platformSettings = pgTable('platform_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
});
```

Apply this SQL to Railway Postgres BEFORE deploying:
```sql
CREATE TABLE IF NOT EXISTS platform_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);
```

STEP B — Storage methods (server/storage.js and server/memoryStorage.js):
```js
async getPlatformSetting(key) {
  const [row] = await db.select().from(platformSettings).where(eq(platformSettings.key, key));
  return row || null;
},

async setPlatformSetting(key, value, userId) {
  await db
    .insert(platformSettings)
    .values({ key, value, updatedAt: new Date(), updatedBy: userId })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value, updatedAt: new Date(), updatedBy: userId },
    });
},
```

memoryStorage mirror:
```js
// Add to constructor or init: this.platformSettings = new Map();
async getPlatformSetting(key) {
  return this.platformSettings.get(key) || null;
},
async setPlatformSetting(key, value, userId) {
  this.platformSettings.set(key, { key, value, updatedAt: new Date(), updatedBy: userId });
},
```

STEP C — Worker integration (server/worker.js):
Two-part implementation: check once before the loop starts, then re-check every 50 contacts inside the loop. This ensures an admin pause takes effect within a reasonable time on large campaigns (e.g., a 10,000-contact campaign stops within ~50 sends of the pause being triggered) without making a DB query per contact.

In processCampaign(), after setting campaign to RUNNING (step 6), and before the for loop begins:
```js
// Helper: check global send pause state
async function isGlobalSendPaused() {
  const setting = await storage.getPlatformSetting('send_pause_enabled');
  return setting?.value === 'true';
}

// Initial pause check before loop starts
if (await isGlobalSendPaused()) {
  await storage.updateCampaign(campaignId, { status: 'PAUSED' });
  await storage.createAuditLog({
    userId,
    action: 'CAMPAIGN_PAUSED_SYSTEM',
    targetType: 'campaign',
    targetId: campaignId,
    details: { reason: 'global_send_pause_active' },
  });
  return; // Exit processCampaign — BullMQ will not retry (no throw)
}
```

Then, INSIDE the per-contact for loop, add a modulo check every 50 contacts. Add this at the TOP of the loop body, before suppression checks or sending:
```js
// Re-check global pause every 50 contacts — allows admin pause to take effect mid-campaign
// without a DB query on every single contact
if (index % 50 === 0 && index > 0) {
  if (await isGlobalSendPaused()) {
    await storage.updateCampaign(campaignId, { status: 'PAUSED' });
    await storage.createAuditLog({
      userId,
      action: 'CAMPAIGN_PAUSED_SYSTEM',
      targetType: 'campaign',
      targetId: campaignId,
      details: { reason: 'global_send_pause_active', pausedAtContact: index },
    });
    break; // Break the loop — campaign is paused, not failed
  }
}
```

Note: the for loop must use a numeric index to support the modulo check. If the current loop uses for...of without an index, change it to: `for (let index = 0; index < contactIds.length; index++) { const contactId = contactIds[index]; ... }`. This does NOT break the sequential processing rule — it is still sequential, just index-aware.

Note: status 'PAUSED' must be a valid campaign status. Check shared/schema.js campaigns.status column definition — if 'PAUSED' is not in the allowed values, add it to the enum/check constraint and update the SQL accordingly.

STEP D — Admin routes (server/routes.js):
```js
app.post('/api/admin/platform/pause-sending', authMiddleware, rootAdminMiddleware, async (req, res) => {
  try {
    await storage.setPlatformSetting('send_pause_enabled', 'true', req.user.id);
    await storage.createAuditLog({
      userId: req.user.id,
      action: 'PLATFORM_SEND_PAUSED',
      targetType: 'platform',
      targetId: 'global',
      details: { reason: req.body.reason || 'manual_admin_pause' },
    });
    res.json({ message: 'Platform sending paused', pausedBy: req.user.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/admin/platform/resume-sending', authMiddleware, rootAdminMiddleware, async (req, res) => {
  try {
    await storage.setPlatformSetting('send_pause_enabled', 'false', req.user.id);
    await storage.createAuditLog({
      userId: req.user.id,
      action: 'PLATFORM_SEND_RESUMED',
      targetType: 'platform',
      targetId: 'global',
      details: {},
    });
    res.json({ message: 'Platform sending resumed', resumedBy: req.user.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
```

STEP E — Update /api/health to include sendPaused:
Replace the placeholder false with a real check:
```js
try {
  const pauseSetting = await storage.getPlatformSetting('send_pause_enabled');
  checks.sendPaused = pauseSetting?.value === 'true';
} catch {
  checks.sendPaused = false;
}
```

Validation: 
1. Call POST /api/admin/platform/pause-sending
2. Start a new campaign
3. Confirm campaign ends with status=PAUSED and audit log entry exists
4. Call POST /api/admin/platform/resume-sending
5. Confirm GET /api/health shows sendPaused: false

---

### Task 3.2 — Per-user sender health auto-monitoring

STEP A — Schema addition:
Add to users table in shared/schema.js:
```js
sendPaused: boolean('send_paused').notNull().default(false),
sendPausedReason: text('send_paused_reason'),
sendPausedAt: timestamp('send_paused_at'),
```

Migration SQL (apply to Railway Postgres BEFORE deploying):
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS send_paused boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS send_paused_reason text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS send_paused_at timestamp;
```

STEP B — Storage method (server/storage.js):
```js
async getUserSenderHealth(userId) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const [totals] = await db
    .select({
      totalSent: sql`COALESCE(SUM(sent_emails), 0)`,
      totalBounced: sql`COALESCE(SUM(bounced_emails), 0)`,
      totalComplained: sql`COALESCE(SUM(complained_emails), 0)`,
    })
    .from(campaigns)
    .where(and(eq(campaigns.userId, userId), gte(campaigns.createdAt, sevenDaysAgo)));

  const sent = Number(totals?.totalSent || 0);
  const bounced = Number(totals?.totalBounced || 0);
  const complained = Number(totals?.totalComplained || 0);

  return {
    sent,
    bounced,
    complained,
    bounceRate: sent > 0 ? bounced / sent : 0,
    complaintRate: sent > 0 ? complained / sent : 0,
  };
},
```

memoryStorage mirror: return { sent: 0, bounced: 0, complained: 0, bounceRate: 0, complaintRate: 0 }.

STEP C — Worker integration (server/worker.js):
CRITICAL: Fetch sender health ONCE before the contact loop. Do NOT query per-contact.

In processCampaign(), after the global pause check (Task 3.1), before the for loop:
```js
// Fetch user record (likely already fetched above for active check — reuse if so)
// Check send_paused flag first (manual or auto pause)
if (user.sendPaused) {
  await storage.updateCampaign(campaignId, { status: 'FAILED' });
  await storage.createAuditLog({
    userId,
    action: AUDIT_ACTIONS.CAMPAIGN_FAILED,
    targetType: 'campaign',
    targetId: campaignId,
    details: { reason: 'sender_paused', pausedReason: user.sendPausedReason },
  });
  return;
}

// Auto-pause check based on rolling 7-day health (only if they have enough send history)
const senderHealth = await storage.getUserSenderHealth(userId);
const bounceThreshold = parseFloat(process.env.BOUNCE_RATE_PAUSE_THRESHOLD || '0.15');
const complaintThreshold = parseFloat(process.env.COMPLAINT_RATE_PAUSE_THRESHOLD || '0.005');

if (senderHealth.sent >= 50 && (senderHealth.bounceRate > bounceThreshold || senderHealth.complaintRate > complaintThreshold)) {
  // Auto-pause the user
  await storage.updateUser(userId, {
    sendPaused: true,
    sendPausedReason: `auto_paused: bounce=${(senderHealth.bounceRate*100).toFixed(1)}% complaint=${(senderHealth.complaintRate*100).toFixed(2)}%`,
    sendPausedAt: new Date(),
  });
  await storage.updateCampaign(campaignId, { status: 'FAILED' });
  await storage.createAuditLog({
    userId,
    action: AUDIT_ACTIONS.CAMPAIGN_FAILED,
    targetType: 'campaign',
    targetId: campaignId,
    details: {
      reason: 'sender_auto_paused',
      bounceRate: senderHealth.bounceRate,
      complaintRate: senderHealth.complaintRate,
    },
  });
  console.warn(`[WORKER] User ${userId} auto-paused due to high bounce/complaint rate`);
  return;
}
```

Note: min 50 sent emails before auto-pause triggers — prevents false positives from tiny send volumes.

STEP D — Admin resume route (server/routes.js):
```js
app.post('/api/admin/users/:id/resume-sending', authMiddleware, rootAdminMiddleware, async (req, res) => {
  try {
    await storage.updateUser(req.params.id, {
      sendPaused: false,
      sendPausedReason: null,
      sendPausedAt: null,
    });
    await storage.createAuditLog({
      userId: req.user.id,
      action: 'USER_SEND_RESUMED',
      targetType: 'user',
      targetId: req.params.id,
      details: { resumedBy: req.user.id },
    });
    res.json({ message: 'User sending resumed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
```

New env vars: BOUNCE_RATE_PAUSE_THRESHOLD (default 0.15), COMPLAINT_RATE_PAUSE_THRESHOLD (default 0.005).

Validation:
1. Manually set a test user's send_paused=true in DB
2. Attempt to start a campaign for that user
3. Confirm campaign fails with reason=sender_paused
4. Call resume-sending endpoint
5. Confirm campaign runs normally

---

### PHASE 3 COMPLETE CHECKPOINT
- [ ] Global pause pauses new campaigns without consuming credits
- [ ] Global resume allows campaigns to run
- [ ] Audit logs created for pause/resume actions
- [ ] /api/health shows sendPaused: true/false dynamically
- [ ] User with send_paused=true cannot run campaigns
- [ ] Auto-pause triggers at threshold (test with seeded data)
- [ ] Admin resume endpoint clears pause state

---

## PHASE 4 — FRONTEND COMPLETION

Implement only after Phase 1-3 are confirmed complete and validated.

### Task 4.1 — Campaign detail: open/click metrics (if MISSING/PARTIAL)
Read the campaign detail page component identified in Phase 0.

Verify these are present:
1. openedEmails and clickedEmails displayed as stat cards
2. openRate = (openedEmails/sentEmails*100).toFixed(1) computed and shown as percentage
3. clickRate = (clickedEmails/sentEmails*100).toFixed(1) computed and shown as percentage
4. Per-contact email table has Opened At and Clicked At columns (show "—" if null, formatted time if set)

If any of these are missing, add them. The API already returns all fields — no backend changes.

Pattern for rate computation (handle division by zero):
```js
const openRate = campaign.sentEmails > 0 
  ? ((campaign.openedEmails / campaign.sentEmails) * 100).toFixed(1) 
  : '0.0';
const clickRate = campaign.sentEmails > 0 
  ? ((campaign.clickedEmails / campaign.sentEmails) * 100).toFixed(1) 
  : '0.0';
```

Validation: run a real campaign, open the email, click a link, refresh the campaign detail page — confirm Opens and Clicks stat cards update with correct values.

---

### Task 4.2 — Delivery health admin panel
Only implement after Task 2.6 (delivery health endpoint) is confirmed deployed and returning correct data.

Create a new component (e.g., client/src/components/DeliveryHealthPanel.jsx) that:
1. Calls GET /api/admin/delivery-health via TanStack Query (refetchInterval: 60_000)
2. Displays bounce rate with color coding: green below 5%, yellow 5-10%, red above 10%
3. Displays complaint rate with color coding: green below 0.1%, yellow 0.1-0.5%, red above 0.5%
4. Shows SES threshold labels ("SES pauses at >10% bounce, >0.5% complaint")
5. Lists top 5 high-bounce users in a simple table (email, sent, bounced, bounce%)
6. Shows suppression additions: last 7d and last 30d
7. Shows current send status (platform paused/active) with pause/resume buttons for ROOT_ADMIN

Add this panel to the ROOT_ADMIN dashboard page. Use existing Recharts for the rate progress bars (RadialBarChart or a simple progress bar with conditional className — keep it functional, not decorative).

Validation: load the admin dashboard, confirm panel renders with live data, confirm pause/resume buttons trigger the correct API calls.

---

### Task 4.3 — Global send pause banner
In the main app layout or dashboard, add a banner that appears when:
- GET /api/health returns sendPaused: true, OR
- Current user's sendPaused is true (visible to the affected user)

ROOT_ADMIN banner (platform paused):
"⚠ Platform sending is paused by an administrator. New campaigns will not execute until sending is resumed."

User banner (user paused):
"⚠ Your account has been paused from sending due to elevated bounce or complaint rates. Contact support to resume."

Use TanStack Query to check health endpoint (refetch every 30s). Use the existing user auth state for the user-level flag.

No new API calls needed beyond the already-implemented health endpoint.

---

### PHASE 4 COMPLETE CHECKPOINT
- [ ] Campaign detail shows Opens stat card with rate percentage
- [ ] Campaign detail shows Clicks stat card with rate percentage
- [ ] Per-contact table shows Opened At and Clicked At columns
- [ ] Delivery health panel renders on admin dashboard
- [ ] Rate color-coding works correctly
- [ ] Pause/resume buttons trigger correct API calls
- [ ] Pause banner appears when platform is paused
- [ ] User pause banner appears when user is individually paused

---

## PHASE 5 — REAL-WORLD VALIDATION (no code — testing protocol)

This is the most important phase. Do not skip it.
Execute after all code phases are confirmed complete.

### Validation Checklist — run every test, report result

**5.1 — End-to-end send test**
1. Create a campaign with 5 contacts: one Gmail, one Outlook, one Yahoo, one Proton, one Zoho
2. Confirm campaign completes (status=COMPLETED, sentEmails=5)
3. For each inbox: confirm email arrived. Report placement: inbox / promotions / spam

**5.2 — Open tracking**
1. Open the Gmail email (in web browser, not mobile — image loading must be enabled)
2. Wait 60 seconds for SNS event propagation
3. Check Railway logs for: [SNS] Open recorded
4. Check DB: SELECT opened_at FROM campaign_emails WHERE recipient_email = 'your-gmail'
5. Check DB: SELECT opened_emails FROM campaigns WHERE id = 'campaign-id'
6. Check UI: campaign detail page should show 1 Open

Report PASS or FAIL for each check.

**5.3 — Click tracking**
1. Click a link inside the email
2. Wait 60 seconds
3. Check Railway logs for: [SNS] Click recorded
4. Check DB: SELECT clicked_at FROM campaign_emails WHERE recipient_email = 'your-gmail'
5. Check DB: SELECT clicked_emails FROM campaigns WHERE id = 'campaign-id'
6. Check UI: campaign detail page should show 1 Click

Report PASS or FAIL.

**5.4 — Bounce handling**
1. Create a campaign with one known-invalid email (e.g., definitelynotreal@nonexistentdomain12345.com)
2. Wait for campaign completion
3. Check Railway logs for bounce handling entries
4. Check DB: SELECT status FROM campaign_emails WHERE recipient_email = 'invalid-email' — should be BOUNCED
5. Check DB: SELECT * FROM suppressions WHERE email = 'invalid-email' — should exist
6. Attempt a second campaign to same address — should be skipped (suppressed)

Report PASS or FAIL.

**5.5 — Unsubscribe flow**
1. Find the unsubscribe link in a real sent email
2. Click it
3. Confirm browser renders HTML page (not JSON)
4. Check DB: SELECT * FROM suppressions WHERE email = 'your-test-email' AND source = 'unsubscribe'
5. Attempt a new campaign to same address — should be skipped

Report PASS or FAIL.

**5.6 — Credit deduction integrity**
1. Note credit balance before campaign (GET /api/auth/user or credits endpoint)
2. Run a 5-contact campaign
3. After completion: note credit balance
4. Confirm: (balance_before - balance_after) = 5
5. Check DB: SELECT COUNT(*) FROM credit_transactions WHERE campaign_id = 'id' AND type = 'DEDUCT'

Report PASS or FAIL.

**5.7 — Worker crash recovery**
1. Start a campaign with 20+ contacts
2. While it is RUNNING, kill the Railway process (via Railway dashboard → restart)
3. Wait for service to restart
4. Confirm: recoverStaleCampaigns() log appears
5. Confirm: campaign either resumes or is marked FAILED (not stuck in RUNNING)
6. If FAILED: manually re-queue (PATCH to PENDING) and confirm it resumes from the correct contact without re-sending already-sent contacts

Report PASS or FAIL.

**5.8 — Global pause validation**
1. Start a campaign with 100+ contacts
2. Call POST /api/admin/platform/pause-sending while it is running
3. Confirm: campaign stops with status=PAUSED before completion
4. Confirm: no credits deducted for unsent emails
5. Call resume-sending
6. Confirm: new campaigns execute normally

Report PASS or FAIL.

**5.9 — Delivery health accuracy**
1. Cross-check GET /api/admin/delivery-health totals against direct DB queries:
   SELECT SUM(sent_emails), SUM(bounced_emails), SUM(complained_emails) FROM campaigns WHERE created_at > NOW() - INTERVAL '30 days'
2. Confirm rates match manual calculation

Report PASS or FAIL.

---

### If any Phase 5 test FAILS:
Do not move to production with real users until failures are resolved.
For each failure: report the exact failure symptom, identify the relevant file and function, fix, re-run the specific test.

---

## DEFERRED — Do not implement in this sprint

These are real roadmap items. They are deferred because they do not affect launch safety.

1. New-user send cap (500/day limit) — defer until you have actual usage data
2. Revenue leakage reconciliation job — defer until confirmed credits system is working correctly across 30+ days of data
3. Dead-letter queue management UI — BullMQ admin panel is a better solution long-term
4. Cross-user suppression admin tooling — deferred, workaround exists via direct DB
5. Time-series AI cost charts — low operational value pre-launch
6. Inbox placement monitoring (GlockApps integration) — deferred, manual testing covers this for beta
7. Horizontal scaling prep (Redis SET NX locks) — deferred, single Railway instance
8. Remove S3 deps from package.json — not a launch blocker, do during next dependency audit
9. Campaign estimated send time preview — UX improvement, deferred
10. Onboarding wizard / first-user walkthrough — important for growth, not launch safety

---

## FINAL DELIVERY CHECKLIST

Before considering RepMail production-ready for real customers, every item below must be checked:

**Safety**
- [ ] SES_SEND_RATE_MS=75 set in Railway
- [ ] Unsubscribe endpoint returns HTML confirmation page
- [ ] Campaigns without {{unsubscribe_url}} are blocked at creation
- [ ] Inactivity governance job has overlap guard
- [ ] CORS dev artifact removed

**Observability**
- [ ] /api/health returns 200 publicly with postgres/redis/smtp/worker/sendPaused
- [ ] Worker heartbeat visible in health endpoint within 60s of worker startup
- [ ] ai_usage_logs cleanup job running (visible in Railway logs)
- [ ] Force-cancel endpoint functional
- [ ] Queue status endpoint functional
- [ ] Delivery health endpoint returning accurate data

**Reputation Protection**
- [ ] Global send pause pauses campaigns without consuming credits
- [ ] Per-user auto-pause triggers at bounce/complaint threshold
- [ ] Admin can resume paused users

**Frontend**
- [ ] Campaign detail shows open rate and click rate with percentages
- [ ] Per-contact table shows Opened At and Clicked At
- [ ] Delivery health panel on admin dashboard
- [ ] Pause banner appears when platform or user is paused

**Real-World Validation (all Phase 5 tests passing)**
- [ ] Email delivered to Gmail inbox (not spam)
- [ ] Open tracking pipeline end-to-end confirmed
- [ ] Click tracking pipeline end-to-end confirmed
- [ ] Bounce → suppression pipeline confirmed
- [ ] Unsubscribe flow confirmed (HTML page + suppression)
- [ ] Credit deduction matches send count
- [ ] Worker crash recovery confirmed
- [ ] Global pause stops campaigns mid-execution

Only after all checkboxes above are checked is RepMail ready for real users.

---

END OF PLAN
