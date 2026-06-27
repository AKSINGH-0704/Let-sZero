import "./env.js"; // must be first — loads .env before any other module reads process.env
import * as Sentry from "@sentry/node";

// Sentry must init before any other import that touches the Node.js runtime.
// DSN is read from SENTRY_DSN env var; if absent, Sentry is disabled (no-op SDK).
// Uses Sentry Node SDK v10 API (setupExpressErrorHandler, expressIntegration).
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    integrations: [Sentry.expressIntegration()],
    // Strip PII before events leave the process.
    // request body, cookies, auth headers, and session tokens must never reach Sentry.
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;        // request body (may contain passwords)
        delete event.request.cookies;     // session token cookie
        if (event.request.headers) {
          delete event.request.headers["cookie"];
          delete event.request.headers["authorization"];
        }
      }
      if (event.user) {
        delete event.user.ip_address;
        delete event.user.email;
        delete event.user.username;
      }
      return event;
    },
  });
}

import { validateEnv } from "./validateEnv.js";
import express from "express";
import helmet from "helmet";
import crypto from "crypto";
import { createConnection } from "net";
import { lookup as dnsLookup } from "dns/promises";
import { registerRoutes, executeCampaign } from "./routes.js";
import { storage } from "./storage.js";
import { sendTransactionalEmail } from "./email.js";
import { createServer } from "http";
import { startWorker } from "./worker.js";
import { addCampaignJob, getCampaignQueue } from "./queue.js";
import { runSchemaCheck } from "./schemaCheck.js";
import { razorpayWebhookHandler } from "./razorpayWebhook.js";
import { INACTIVITY_THRESHOLDS, AUDIT_ACTIONS, USER_ROLES } from "../shared/schema.js";
import { runDomainVerificationPoll } from "./domainManager.js";
const app = express();
const httpServer = createServer(app);

// Trust Railway's load balancer so req.ip resolves to the real client IP from
// X-Forwarded-For. Without this, all clients share the same rate-limit bucket.
app.set("trust proxy", 1);

// Security headers. HSTS enabled for production; helmet is a no-op in dev where HTTPS is absent.
// CSP: 'unsafe-inline' is required for style-src because shadcn/ui, Tailwind, and the HTML
// preview in History.jsx all use inline styles. Inline scripts remain blocked (no 'unsafe-inline'
// in script-src) — user-controlled HTML in template previews cannot execute scripts.
// Full nonce-based CSP (eliminating 'unsafe-inline' for styles) is deferred to M12.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc:    ["'self'"],
      objectSrc:  ["'none'"],
      frameSrc:   ["'none'"],
      baseUri:    ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Razorpay webhook MUST be registered before express.json() — HMAC-SHA256
// signature verification requires the raw request body as a Buffer.
app.post("/api/webhooks/razorpay", express.raw({ type: "application/json" }), razorpayWebhookHandler);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration - Allow credentials and frontend origin
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  }
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  
  next();
});

// ─── Inactivity Governance Job ────────────────────────────────────────────────

async function findActiveReclaimTarget(userId, storage) {
  let currentId = userId;
  const visited = new Set();

  while (true) {
    const user = await storage.getUserById(currentId);
    if (!user || visited.has(currentId)) break;
    visited.add(currentId);

    if (!user.parentId) break;

    const parent = await storage.getUserById(user.parentId);
    if (!parent) break;

    if (parent.isActive && !parent.isDormant) {
      return parent.id;
    }

    currentId = user.parentId;
  }

  return null;
}

let inactivityJobRunning = false;
async function runInactivityJob() {
  if (inactivityJobRunning) {
    console.warn("[INACTIVITY] Job still in progress — skipping this interval");
    return;
  }
  inactivityJobRunning = true;
  const now = new Date();
  const { WARNING_DAYS, DORMANT_DAYS, RECLAIM_ELIGIBLE_DAYS } = INACTIVITY_THRESHOLDS;
  const appUrl = process.env.APP_URL || "http://localhost:5000";

  // Thresholds derived from constants (avoids hardcoded magic numbers)
  const warningSentDormantThreshold  = new Date(now.getTime() - (DORMANT_DAYS - WARNING_DAYS) * 86400000); // 30d
  const warningSentReclaimThreshold  = new Date(now.getTime() - (RECLAIM_ELIGIBLE_DAYS - WARNING_DAYS) * 86400000); // 60d
  const rootAdminAlertCutoff         = new Date(now.getTime() - 45 * 86400000);

  let warnedCount = 0, dormantCount = 0, reclaimedCount = 0, skippedCount = 0;

  try {
    const users = await storage.getUsersForInactivityCheck();
    console.log(`[INACTIVITY JOB] Started. Found ${users.length} users to check.`);

    // ── Step A: Stage 1 warnings (30d inactive, no warning sent yet) ───────────
    for (const user of users) {
      if (user.inactivityWarningSentAt) continue;
      try {
        const creditsRemaining = (user.creditsReceived || 0) - (user.creditsAllocated || 0) - (user.creditsUsed || 0);
        const daysInactive = Math.floor((now - new Date(user.lastActivityAt || user.createdAt)) / 86400000);

        // Check suppression FIRST — if suppressed, mark warning sent (no token) and skip email.
        // Without this guard, the token would be written to DB and Stage C would attempt
        // reclaim 60 days later on a user who never received a warning.
        const suppressed = await storage.isSuppressed(user.id, user.email);
        if (suppressed) {
          await storage.markInactivityWarningSent(user.id, null, null);
          await storage.createAuditLog({
            userId:     user.id,
            action:     AUDIT_ACTIONS.INACTIVITY_WARNING_SENT,
            targetType: "user",
            targetId:   user.id,
            details:    { daysInactive, suppressed: true, note: "warning skipped — email suppressed, manual review needed" },
          });
          warnedCount++;
          continue;
        }

        // Skip token generation if user has no credits to protect
        if (creditsRemaining <= 0) {
          await storage.markInactivityWarningSent(user.id, null, null);
          await storage.createAuditLog({
            userId:     user.id,
            action:     AUDIT_ACTIONS.INACTIVITY_WARNING_SENT,
            targetType: "user",
            targetId:   user.id,
            details:    { daysInactive, creditsRemaining: 0, note: "warning skipped — no credits to protect" },
          });
          warnedCount++;
          continue;
        }

        const rawToken    = crypto.randomBytes(32).toString("hex");
        const tokenHash   = crypto.createHash("sha256").update(rawToken).digest("hex");
        const tokenExpiry = new Date(now.getTime() + (RECLAIM_ELIGIBLE_DAYS - WARNING_DAYS) * 86400000); // 60d window

        await storage.markInactivityWarningSent(user.id, tokenHash, tokenExpiry);
        await storage.createAuditLog({
          userId:     user.id,
          action:     AUDIT_ACTIONS.INACTIVITY_WARNING_SENT,
          targetType: "user",
          targetId:   user.id,
          details:    { daysInactive },
        });

        const keepUrl = `${appUrl}/inactivity/keep-credits?token=${rawToken}`;
        sendTransactionalEmail(
          user.email,
          "Action required: Your RepMail account will become dormant soon",
          `Hi ${user.username},\n\nYour RepMail account has been inactive for ${daysInactive} days.\n\nTo keep your credits and prevent your account from becoming dormant, click the link below before it expires:\n\n${keepUrl}\n\nThis link expires in 60 days. After 90 days of inactivity, your unused credits may be reclaimed by your administrator.\n\nThe RepMail Team`
        ).catch(err => console.error(`[INACTIVITY JOB] Stage A user email failed uid=${user.id}:`, err.message));

        // Parent notification — fire-and-forget, failure must never block the warning flow
        if (user.parentId) {
          try {
            const parent = await storage.getUserById(user.parentId);
            if (parent) {
              sendTransactionalEmail(
                parent.email,
                `${user.username} is inactive on RepMail`,
                `Hi ${parent.username},\n\nYour team member ${user.username} has been inactive on RepMail for 30 days.\n\nThey have ${creditsRemaining} credits allocated. If they remain inactive for 90 days total, those credits will be automatically returned to your account.\n\nView your team: ${appUrl}/app/users\n\n— The RepMail Team`
              ).catch(err => console.error(`[INACTIVITY JOB] Stage A parent notify failed uid=${parent.id}:`, err.message));
            }
          } catch (parentErr) {
            console.error(`[INACTIVITY JOB] Stage A parent lookup failed uid=${user.id}:`, parentErr.message);
          }
        }

        warnedCount++;
      } catch (err) {
        console.error(`[INACTIVITY JOB] Stage A error uid=${user.id}:`, err.message);
        skippedCount++;
      }
    }

    // ── Step B: Stage 2 dormant (warning sent 30+ days ago, not yet dormant) ───
    for (const user of users) {
      if (!user.inactivityWarningSentAt) continue;
      if (user.isDormant) continue;
      if (new Date(user.inactivityWarningSentAt) >= warningSentDormantThreshold) continue;
      try {
        const creditsRemaining = (user.creditsReceived || 0) - (user.creditsAllocated || 0) - (user.creditsUsed || 0);
        await storage.setUserDormant(user.id);
        dormantCount++;

        // Dormant notice to user — use a fresh raw token with the SAME expiry as Stage A.
        // We cannot recover the original raw token (only the hash is stored), so we generate
        // a new one and update the stored hash without resetting inactivityWarningSentAt.
        if (user.inactivityKeepToken) {
          try {
            const existingExpiry = user.inactivityKeepTokenExpiresAt
              ? new Date(user.inactivityKeepTokenExpiresAt)
              : new Date(now.getTime() + 30 * 86400000);
            const daysUntilExpiry = Math.max(0, Math.ceil((existingExpiry.getTime() - now.getTime()) / 86400000));
            const freshToken = crypto.randomBytes(32).toString("hex");
            const freshHash  = crypto.createHash("sha256").update(freshToken).digest("hex");
            await storage.updateInactivityToken(user.id, freshHash, existingExpiry);
            const keepUrl = `${appUrl}/inactivity/keep-credits?token=${freshToken}`;
            sendTransactionalEmail(
              user.email,
              "Your RepMail account is now dormant",
              `Hi ${user.username},\n\nYour RepMail account has been dormant for 60 days.\n\nYou can still log in and view your history, but sending campaigns and AI features are paused.\n\nTo reactivate your account, click the link below — your inactivity timer will reset and full access will be restored immediately:\n\n${keepUrl}\n\nThis link expires in ${daysUntilExpiry} days.\n\nYour ${creditsRemaining} credits will be returned to your manager if no action is taken before the link expires.\n\n${appUrl}/login\n\n— The RepMail Team`
            ).catch(err => console.error(`[INACTIVITY JOB] Stage B dormant email failed uid=${user.id}:`, err.message));
          } catch (emailErr) {
            console.error(`[INACTIVITY JOB] Stage B dormant email error uid=${user.id}:`, emailErr.message);
          }
        }
      } catch (err) {
        console.error(`[INACTIVITY JOB] Stage B error uid=${user.id}:`, err.message);
        skippedCount++;
      }
    }

    // ── Step C: Stage 3 auto-reclaim (warning sent 60+ days ago, token still set) ─
    for (const user of users) {
      if (!user.isDormant) continue;
      if (!user.inactivityWarningSentAt) continue;
      if (new Date(user.inactivityWarningSentAt) >= warningSentReclaimThreshold) continue;
      if (!user.inactivityKeepToken) continue; // token cleared = user self-reactivated

      try {
        // Walk ancestor tree to find the nearest active, non-dormant parent.
        // Direct parentId may be deactivated, trapping credits in a dead account.
        const reclaimTargetId = await findActiveReclaimTarget(user.id, storage);

        if (!reclaimTargetId) {
          console.error(`[INACTIVITY JOB] Stage C: no active ancestor for uid=${user.id} — credits held, manual review needed`);
          await storage.clearInactivityToken(user.id);
          skippedCount++;
          continue;
        }

        const result = await storage.autoReclaimCredits(user.id, reclaimTargetId);

        if (result.skipped) {
          await storage.createAuditLog({
            userId:     user.id,
            action:     AUDIT_ACTIONS.CREDITS_AUTO_RECLAIMED,
            targetType: "user",
            targetId:   user.id,
            details:    { skipped: true, reason: "running_campaigns_protected", runningCampaignCreditsProtected: result.protectedCredits },
          });
          skippedCount++;
        } else {
          reclaimedCount++;

          // Reclaim notice to user — fire-and-forget
          sendTransactionalEmail(
            user.email,
            "Your RepMail credits have been returned to your team",
            `Hi ${user.username},\n\nYour RepMail account has been inactive for 90 days.\n\nYour unused credits have been automatically returned to your team manager. Your account remains active — reactivate anytime by sending a campaign.\n\n${appUrl}/login\n\n— The RepMail Team`
          ).catch(err => console.error(`[INACTIVITY JOB] Stage C user reclaim email failed uid=${user.id}:`, err.message));

          // Reclaim notice to admin — fire-and-forget
          try {
            const reclaimTarget = await storage.getUserById(reclaimTargetId);
            if (reclaimTarget) {
              sendTransactionalEmail(
                reclaimTarget.email,
                `${user.username}'s credits returned to your account`,
                `Hi ${reclaimTarget.username},\n\n${user.username} has been inactive for 90 days.\n\n${result.amount} unused credits have been automatically returned to your account and are ready to allocate.\n\nView audit trail: ${appUrl}/app/audit\n\n— The RepMail Team`
              ).catch(err => console.error(`[INACTIVITY JOB] Stage C admin reclaim email failed uid=${reclaimTarget.id}:`, err.message));
            }
          } catch (adminEmailErr) {
            console.error(`[INACTIVITY JOB] Stage C admin email error uid=${user.id}:`, adminEmailErr.message);
          }
        }

        // Always clear token after every Stage C outcome — prevents re-entry on next 24h run.
        await storage.clearInactivityToken(user.id);
      } catch (err) {
        console.error(`[INACTIVITY JOB] Stage C error uid=${user.id}:`, err.message);
        skippedCount++;
        // Still clear the token on error to prevent infinite retry loops
        await storage.clearInactivityToken(user.id).catch(() => {});
      }
    }

    // ── Step D: ROOT_ADMIN inactivity alert (45d, separate query) ───────────────
    try {
      const allUsers         = await storage.getUsers(null, true);
      const inactiveAdmins   = allUsers.filter(u => {
        if (u.role !== USER_ROLES.ROOT_ADMIN) return false;
        if (!u.isActive) return false;
        if (u.inactivityWarningSentAt) return false; // already alerted this cycle
        const lastActive = u.lastActivityAt ? new Date(u.lastActivityAt) : new Date(u.createdAt);
        return lastActive < rootAdminAlertCutoff;
      });

      for (const admin of inactiveAdmins) {
        try {
          await storage.markInactivityWarningSent(admin.id, null, null);
          console.warn(`[INACTIVITY JOB] ROOT_ADMIN ${admin.username} (${admin.id}) inactive 45+ days`);
          sendTransactionalEmail(
            admin.email,
            "RepMail: Root admin account inactivity alert",
            `Hi ${admin.username},\n\nYour RepMail root admin account has been inactive for 45+ days.\n\nPlease log in to keep your account active. If all root admin accounts remain inactive for 60+ days, emergency recovery procedures may be triggered.\n\nThe RepMail Team`
          ).catch(err => console.error(`[INACTIVITY JOB] Stage D email failed uid=${admin.id}:`, err.message));
        } catch (err) {
          console.error(`[INACTIVITY JOB] Stage D error uid=${admin.id}:`, err.message);
        }
      }
    } catch (err) {
      console.error("[INACTIVITY JOB] Stage D query error:", err.message);
    }

    console.log(`[INACTIVITY JOB] Complete. Warned: ${warnedCount}, Dormant: ${dormantCount}, Reclaimed: ${reclaimedCount}, Skipped: ${skippedCount}`);
  } catch (err) {
    console.error("[INACTIVITY JOB] Fatal error:", err.message);
  } finally {
    inactivityJobRunning = false;
  }
}

async function runEmergencyRecovery() {
  const recoveryEmail = process.env.RECOVERY_EMAIL;
  if (!recoveryEmail) {
    console.log("[RECOVERY] RECOVERY_EMAIL not set — emergency recovery disabled");
    return;
  }

  try {
    const allUsers = await storage.getUsers(null, true);
    const allRootAdmins = allUsers.filter(u => u.role === USER_ROLES.ROOT_ADMIN);

    // Cooldown: any ROOT_ADMIN stamped within the last 30 days → skip
    const cooldownCutoff = new Date(Date.now() - 30 * 86400000);
    const onCooldown = allRootAdmins.some(
      u => u.lastEmergencyRecoveryAt && new Date(u.lastEmergencyRecoveryAt) > cooldownCutoff
    );
    if (onCooldown) {
      console.log("[RECOVERY] Emergency recovery cooldown active — skipping");
      return;
    }

    // Activity check: any active ROOT_ADMIN active within 60 days → normal operation, skip silently
    const activityCutoff = new Date(Date.now() - 60 * 86400000);
    const hasActiveAdmin = allRootAdmins
      .filter(u => u.isActive)
      .some(u => {
        const lastActive = u.lastActivityAt ? new Date(u.lastActivityAt) : new Date(u.createdAt);
        return lastActive > activityCutoff;
      });
    if (hasActiveAdmin) return;

    console.log("[RECOVERY] No active root admin within 60 days — triggering emergency recovery");

    // Resolve recovery account (getUserByEmail returns raw row including isDormant)
    const recoveryUser = await storage.getUserByEmail(recoveryEmail);
    let recoveryUserId;

    if (recoveryUser) {
      recoveryUserId = recoveryUser.id;

      // Always elevate to full ROOT_ADMIN regardless of current role,
      // reactivate, and invalidate any stale sessions.
      await storage.updateUser(recoveryUserId, {
        role: USER_ROLES.ROOT_ADMIN,
        mustResetPassword: true,
        isActive: true,
      });
      await storage.updateUserActivity(recoveryUserId); // clears isDormant + all inactivity fields
      await storage.deleteUserSessions(recoveryUserId); // invalidate any stale sessions
    } else {
      const tempPassword = crypto.randomBytes(16).toString("hex");
      const newUser = await storage.createUser({
        username: recoveryEmail.split("@")[0].replace(/[^a-z0-9_]/gi, "_") + "_recovery",
        email: recoveryEmail,
        password: tempPassword,
        role: USER_ROLES.ROOT_ADMIN,
        mustResetPassword: true,
        creditsReceived: 0,
      });
      recoveryUserId = newUser.id;
    }

    // Atomic: stamp lastEmergencyRecoveryAt on ALL ROOT_ADMIN rows to set cooldown
    await storage.markAllRootAdminsRecoveryAt(new Date());

    await storage.createAuditLog({
      userId: null,
      action: AUDIT_ACTIONS.EMERGENCY_RECOVERY_TRIGGERED,
      targetType: "user",
      targetId: recoveryUserId,
      details: { recoveryEmail, createdNew: !recoveryUser },
    });

    const alertEmail = process.env.PLATFORM_ALERT_EMAIL;
    if (alertEmail) {
      const appUrl = process.env.APP_URL || "http://localhost:5000";
      sendTransactionalEmail(
        alertEmail,
        "RepMail: Emergency recovery account activated",
        `Emergency recovery was triggered on ${new Date().toISOString()}.\n\nRecovery account: ${recoveryEmail}\nNew account created: ${!recoveryUser}\n\nPlease review at ${appUrl}/admin.\n\nThe RepMail System`
      ).catch(err => console.error("[RECOVERY] Alert email failed:", err.message));
    }

    console.log(`[RECOVERY] Complete — recovery account: ${recoveryEmail} (userId=${recoveryUserId})`);
  } catch (err) {
    console.error("[RECOVERY] Emergency recovery error:", err.message);
  }
}

export function log(message, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Validates mandatory production environment variables and exits if any are missing.
// SNS_TOPIC_ARN is the only mandatory SNS var today — it is the ARN used by the webhook
// handler to verify that incoming events come from the expected topic. Without it, every
// SNS delivery (bounce, complaint) is rejected with 503 and auto-pause never fires.
// SES_CONFIGURATION_SET is strongly recommended but not fatal here — some SES setups
// deliver bounce/complaint events via notification-level subscriptions that bypass
// configuration sets. Its absence is surfaced via the /api/health sesTracking field.
function validateProductionConfig() {
  if (process.env.NODE_ENV !== "production") {
    if (!process.env.SNS_TOPIC_ARN) {
      console.warn("[STARTUP] SNS_TOPIC_ARN not set — bounce/complaint processing disabled in dev mode.");
    }
    return;
  }
  const missing = [];
  if (!process.env.SNS_TOPIC_ARN) {
    missing.push("SNS_TOPIC_ARN — required for bounce/complaint processing; auto-pause will never fire without it");
  }
  if (missing.length > 0) {
    console.error("[STARTUP] FATAL: Missing required production environment variables:");
    for (const m of missing) console.error(`  • ${m}`);
    console.error("[STARTUP] Set the above variables and restart.");
    process.exit(1);
  }
}

// Temporary SMTP path diagnostic — remove after SMTP connectivity is confirmed.
// Runs once at startup; logs DNS and TCP results without modifying credentials or config.
async function diagnoseSMTPPath() {
  const host = process.env.SES_SMTP_HOST;
  const port = parseInt(process.env.SES_SMTP_PORT || "587", 10);

  if (!host) {
    console.log("[SMTP-DIAG] SES_SMTP_HOST not set — skipping");
    return;
  }

  console.log(`[SMTP-DIAG] Testing ${host}:${port}`);

  // Layer 1: DNS resolution
  try {
    const addrs = await dnsLookup(host, { all: true });
    console.log("[SMTP-DIAG] DNS OK →", addrs.map(a => a.address).join(", "));
  } catch (err) {
    console.error(`[SMTP-DIAG] DNS FAILED: ${err.code} — ${err.message}`);
    return;
  }

  // Layer 2: TCP connectivity (5-second timeout)
  await new Promise((resolve) => {
    const sock = createConnection({ host, port });
    const timer = setTimeout(() => {
      sock.destroy();
      console.error(`[SMTP-DIAG] TCP TIMEOUT after 5s — port ${port} unreachable (firewall or blocked port)`);
      resolve();
    }, 5000);

    sock.once("connect", () => {
      clearTimeout(timer);
      console.log(`[SMTP-DIAG] TCP OK — connected to ${host}:${port}`);
      sock.destroy();
      resolve();
    });

    sock.once("error", (err) => {
      clearTimeout(timer);
      console.error(`[SMTP-DIAG] TCP FAILED: ${err.code} — ${err.message}`);
      resolve();
    });
  });
}

(async () => {
  // Block RepMail routes on production when REPMAIL_PUBLIC is not "true"
  app.use((req, res, next) => {
    const isRepmailPublic = process.env.REPMAIL_PUBLIC === "true";

    if (isRepmailPublic) return next();
    if (process.env.NODE_ENV !== "production") return next();

    const allowedPaths = [
      '/',
      '/early-access',
      '/contact',
      '/login',
      '/api/waitlist',
      '/api/contact',
      '/api/health',
      '/api/auth/google',
      '/api/auth/google/callback',
      '/api/auth/logout',
    ];

    const isAllowed = allowedPaths.some(path => req.path === path);
    const isStaticFile = /\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf|eot|map|xml|txt)$/i.test(req.path);
    const isAsset = req.path.startsWith('/assets');
    // M10: tracking pixel + click redirect endpoints must be reachable even in pre-launch mode
    const isTrackingEndpoint = req.path.startsWith('/t/');

    if (isAllowed || isStaticFile || isAsset || isTrackingEndpoint) return next();

    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ message: "RepMail is currently in private beta. Join the waitlist at /early-access" });
    }

    return res.redirect('/early-access');
  });

  validateEnv();
  await runSchemaCheck();
  await registerRoutes(httpServer, app);

  // Startup campaign reconciliation.
  //
  // Precedence rules (highest authority first):
  //   1. completedAt IS NOT NULL  → campaign finished; do not overwrite with FAILED.
  //   2. BullMQ job state is active/waiting/delayed → worker already owns it; leave DB alone.
  //   3. All other RUNNING campaigns → mark FAILED so the UI is not stuck indefinitely.
  //
  // The worker's isRetry detection is data-driven (hasAnySentEmails), so marking FAILED
  // here does NOT break per-contact idempotency when BullMQ retries the job.
  await (async function recoverStaleCampaigns() {
    try {
      const running = await storage.getCampaignsByStatus("RUNNING");
      if (!running.length) return;
      console.log(`[RECOVERY] Found ${running.length} stale RUNNING campaign(s) — reconciling`);

      const queue = getCampaignQueue();

      for (const c of running) {
        // Rule 1: completedAt set means the campaign finished; status column is stale.
        if (c.completedAt) {
          await storage.updateCampaign(c.id, { status: "COMPLETED" });
          console.log(`[RECOVERY] Campaign ${c.id} → COMPLETED (completedAt already set)`);
          continue;
        }

        // Rule 2: BullMQ queue is authoritative if available — job may be mid-flight.
        if (queue) {
          try {
            const job = await queue.getJob(c.id);
            if (job) {
              const state = await job.getState();
              if (["active", "waiting", "delayed"].includes(state)) {
                console.log(`[RECOVERY] Campaign ${c.id} — BullMQ state=${state}, leaving RUNNING`);
                continue;
              }
            }
          } catch (queueErr) {
            console.warn(`[RECOVERY] Campaign ${c.id} — queue check failed:`, queueErr.message);
          }
        }

        // Rule 3: No completedAt, no live BullMQ job → mark FAILED so the UI unblocks.
        await storage.updateCampaign(c.id, { status: "FAILED" });
        // Bulk-update any PENDING campaign_emails to FAILED — prevents History from showing
        // permanent "Pending" records for campaigns that crashed before the send completed.
        await storage.bulkFailOrphanedCampaignEmails(c.id).catch(err =>
          console.warn(`[RECOVERY] bulkFailOrphanedCampaignEmails failed for ${c.id}:`, err.message)
        );
        console.log(`[RECOVERY] Campaign ${c.id} → FAILED (no live job found)`);
      }
    } catch (err) {
      console.error("[RECOVERY] Error:", err.message);
    }
  })();

  // Emergency recovery check — runs once at boot before any other job
  await runEmergencyRecovery();

  // Start the BullMQ worker (no-op if REDIS_URL is not set)
  const worker = startWorker();
  if (!worker) {
    console.warn("[STARTUP] Redis unavailable — campaigns running on inline path. SIGTERM will abandon in-progress campaigns.");
  }

  validateProductionConfig();

  // SMTP path diagnostic — temporary, runs once at startup.
  await diagnoseSMTPPath();

  // Railway sends SIGTERM with a 30-second grace window before SIGKILL.
  // worker.close() waits for the current job iteration to finish before exiting.
  async function gracefulShutdown(signal) {
    console.log(`[SHUTDOWN] ${signal} received — closing worker gracefully`);
    try {
      if (worker) await worker.close();
      console.log("[SHUTDOWN] Worker drained cleanly");
    } catch (err) {
      console.error("[SHUTDOWN] Worker close error:", err.message);
    }
    process.exit(0);
  }
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT",  () => gracefulShutdown("SIGINT"));

  // ── Cleanup jobs ─────────────────────────────────────────────────────────────
  // Each job holds a per-closure boolean lock. If a previous run is still awaiting
  // the DB when the interval fires, the new invocation logs a warning and returns
  // immediately — preventing overlapping deletes, amplified lock contention, and
  // duplicate row-count log lines under slow DB conditions.

  // SNS events — daily, fires at boot (no startup delay needed; touches no hot path).
  {
    let running = false;
    setInterval(async () => {
      if (running) { console.warn("[CLEANUP] SNS event cleanup still in progress — skipping"); return; }
      running = true;
      try {
        await storage.deleteOldSnsEvents();
        console.log("[CLEANUP] Old SNS events pruned");
      } catch (err) {
        console.error("[CLEANUP] SNS event cleanup error:", err.message);
      } finally {
        running = false;
      }
    }, 24 * 60 * 60 * 1000);
  }

  // Expired sessions — daily, 5-minute startup offset.
  setTimeout(() => {
    let running = false;
    async function runSessionCleanup() {
      if (running) { console.warn("[CLEANUP] Session cleanup still in progress — skipping"); return; }
      running = true;
      try {
        const count = await storage.deleteExpiredSessions();
        console.log(`[CLEANUP] Expired sessions deleted: ${count}`);
      } catch (err) {
        console.error("[CLEANUP] Session cleanup error:", err.message);
      } finally {
        running = false;
      }
    }
    runSessionCleanup();
    setInterval(runSessionCleanup, 24 * 60 * 60 * 1000);
  }, 5 * 60 * 1000);

  // Audit log pruning — daily, 8-minute startup offset.
  // Retention controlled by AUDIT_LOG_RETENTION_DAYS (default 180).
  setTimeout(() => {
    let running = false;
    async function runAuditLogPruning() {
      if (running) { console.warn("[CLEANUP] Audit log pruning still in progress — skipping"); return; }
      running = true;
      const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || "180", 10);
      try {
        const count = await storage.pruneAuditLogs(retentionDays);
        console.log(`[CLEANUP] Audit logs pruned (older than ${retentionDays}d): ${count}`);
      } catch (err) {
        console.error("[CLEANUP] Audit log pruning error:", err.message);
      } finally {
        running = false;
      }
    }
    runAuditLogPruning();
    setInterval(runAuditLogPruning, 24 * 60 * 60 * 1000);
  }, 8 * 60 * 1000);

  // Campaign email records — weekly, 12-minute startup offset.
  // RUNNING and PENDING campaigns are never touched.
  // Retention controlled by CAMPAIGN_EMAIL_RETENTION_DAYS (default 90).
  setTimeout(() => {
    let running = false;
    async function runCampaignEmailCleanup() {
      if (running) { console.warn("[CLEANUP] Campaign email cleanup still in progress — skipping"); return; }
      running = true;
      const retentionDays = parseInt(process.env.CAMPAIGN_EMAIL_RETENTION_DAYS || "90", 10);
      try {
        const count = await storage.deleteOldCampaignEmails(retentionDays);
        console.log(`[CLEANUP] Campaign email records deleted (campaign age >${retentionDays}d): ${count}`);
      } catch (err) {
        console.error("[CLEANUP] Campaign email cleanup error:", err.message);
      } finally {
        running = false;
      }
    }
    runCampaignEmailCleanup();
    setInterval(runCampaignEmailCleanup, 7 * 24 * 60 * 60 * 1000);
  }, 12 * 60 * 1000);

  // Expired inactivity tokens — weekly, 17-minute startup offset.
  setTimeout(() => {
    let running = false;
    async function runInactivityTokenExpiry() {
      if (running) { console.warn("[CLEANUP] Inactivity token expiry still in progress — skipping"); return; }
      running = true;
      try {
        const count = await storage.expireInactivityTokens();
        console.log(`[CLEANUP] Expired inactivity tokens nulled: ${count}`);
      } catch (err) {
        console.error("[CLEANUP] Inactivity token expiry error:", err.message);
      } finally {
        running = false;
      }
    }
    runInactivityTokenExpiry();
    setInterval(runInactivityTokenExpiry, 7 * 24 * 60 * 60 * 1000);
  }, 17 * 60 * 1000);

  // AI usage logs — weekly, 20-minute startup offset.
  // Retention controlled by AI_USAGE_LOG_RETENTION_DAYS (default 90).
  setTimeout(() => {
    let running = false;
    async function runAiUsageLogPruning() {
      if (running) { console.warn("[CLEANUP] AI usage log pruning still in progress — skipping"); return; }
      running = true;
      const retentionDays = parseInt(process.env.AI_USAGE_LOG_RETENTION_DAYS || "90", 10);
      try {
        const count = await storage.pruneAiUsageLogs(retentionDays);
        console.log(`[CLEANUP] AI usage logs pruned (older than ${retentionDays}d): ${count}`);
      } catch (err) {
        console.error("[CLEANUP] AI usage log pruning error:", err.message);
      } finally {
        running = false;
      }
    }
    runAiUsageLogPruning();
    setInterval(runAiUsageLogPruning, 7 * 24 * 60 * 60 * 1000);
  }, 20 * 60 * 1000);

  // Inactivity governance job — 10-minute boot delay, then every 24 hours
  setTimeout(() => {
    runInactivityJob();
    setInterval(runInactivityJob, 24 * 60 * 60 * 1000);
  }, 10 * 60 * 1000);

  // Domain verification polling — 30s startup delay, then every 10 minutes.
  // Checks all PENDING_VERIFICATION domains against SES for verified status.
  // The running guard prevents overlap if SES is slow and a poll takes > 10 minutes.
  {
    let domainPollRunning = false;
    async function runDomainPoll() {
      if (domainPollRunning) { console.warn("[DOMAIN][VERIFY] Poll still in progress — skipping"); return; }
      domainPollRunning = true;
      try {
        await runDomainVerificationPoll();
      } catch (err) {
        console.error("[DOMAIN][VERIFY] Poll error:", err.message);
      } finally {
        domainPollRunning = false;
      }
    }
    setTimeout(() => {
      runDomainPoll();
      setInterval(runDomainPoll, 10 * 60 * 1000);
    }, 30 * 1000);
  }

  // Scheduled-campaign scheduler — checks every 30s for PENDING campaigns
  // whose scheduledAt has passed and enqueues them for the worker.
  // Intentionally queries PENDING only: RUNNING/FAILED/COMPLETED campaigns are
  // never re-enqueued here, so recovery exhaustion is not possible from this path.
  setInterval(async () => {
    try {
      const pendingCampaigns = await storage.getCampaignsByStatus("PENDING");
      const now = new Date();
      for (const campaign of pendingCampaigns) {
        if (campaign.scheduledAt && new Date(campaign.scheduledAt) <= now) {
          console.log(`[SCHEDULER] Enqueueing scheduled campaign: ${campaign.id}`);
          const job = await addCampaignJob(campaign.id, campaign.userId);
          if (!job) {
            // Redis not available — run inline as fallback
            await executeCampaign(campaign.id, campaign.userId);
          }
        }
      }
    } catch (err) {
      console.error("[SCHEDULER] Error:", err.message);
    }
  }, 30000);

  // PENDING watchdog — re-enqueues campaigns stuck in PENDING due to Redis being
  // unavailable at launch time. Only acts on campaigns older than 10 minutes that
  // have no future scheduledAt (the existing scheduler above handles those).
  // BullMQ jobId deduplication ensures re-enqueueing an already-queued campaign is a no-op.
  {
    let watchdogRunning = false;
    setInterval(async () => {
      if (watchdogRunning) return;
      watchdogRunning = true;
      try {
        const allPending = await storage.getCampaignsByStatus("PENDING");
        const now = Date.now();
        const STALE_MS = 10 * 60 * 1000;
        const queue = getCampaignQueue();
        for (const c of allPending) {
          if (c.scheduledAt && new Date(c.scheduledAt).getTime() > now) continue;
          if (now - new Date(c.createdAt).getTime() < STALE_MS) continue;
          if (queue) {
            try {
              const job = await queue.getJob(c.id);
              if (job) {
                const state = await job.getState();
                if (["active", "waiting", "delayed"].includes(state)) continue;
              }
            } catch (qErr) {
              console.warn(`[WATCHDOG] Queue check failed for ${c.id}:`, qErr.message);
            }
          }
          const ageMin = Math.round((now - new Date(c.createdAt).getTime()) / 60000);
          console.log(`[WATCHDOG] Campaign ${c.id} stale PENDING (${ageMin}m) — re-enqueueing`);
          const job = await addCampaignJob(c.id, c.userId);
          if (!job) await executeCampaign(c.id, c.userId);
        }
      } catch (err) {
        console.error("[WATCHDOG] Error:", err.message);
      } finally {
        watchdogRunning = false;
      }
    }, 2 * 60 * 1000);
  }

  // M10: Expired tracking token cleanup — weekly, 30s startup delay.
  // First pass runs 30s after boot to clear any tokens that expired while the server was down.
  // Batched-delete loop in storage prevents table-level lock contention on large datasets.
  {
    let tokenCleanupRunning = false;
    async function runTrackingTokenCleanup() {
      if (tokenCleanupRunning) { console.warn("[CLEANUP] Tracking token cleanup still in progress — skipping"); return; }
      tokenCleanupRunning = true;
      try {
        const deleted = await storage.deleteExpiredTrackingTokens();
        if (deleted > 0) console.log(`[CLEANUP] Expired tracking tokens deleted: ${deleted}`);
      } catch (err) {
        console.error("[CLEANUP] Tracking token cleanup error:", err.message);
      } finally {
        tokenCleanupRunning = false;
      }
    }
    setTimeout(() => {
      runTrackingTokenCleanup();
      setInterval(runTrackingTokenCleanup, 7 * 24 * 60 * 60 * 1000);
    }, 30 * 1000);
  }

  // Sentry error handler must come before the generic Express error handler
  // so that 5xx errors are captured with full stack context.
  if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (process.env.NODE_ENV === "production") {
    const { serveStatic } = await import("./static.js");
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite.js");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
