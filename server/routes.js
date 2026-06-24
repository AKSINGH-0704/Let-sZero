import { storage } from "./storage.js";
import { pool } from "./db.js";
import { AUDIT_ACTIONS, USER_ROLES, PRICING_PLANS, CREDIT_TIERS, TEAM_PRICING, FREE_TRIAL_CREDITS, CREDIT_VALIDITY_MONTHS, MIN_CREDIT_PURCHASE, contactSubmissionSchema, waitlistSchema, PAYMENT_STATUS, getPlanWithPrices, DEFAULT_EXCHANGE_RATE, SUPPORTED_CURRENCIES, PLAN_LIMITS, CAMPAIGN_EMAIL_STATUS, MAX_TEAM_MEMBERS, AI_DAILY_LIMITS } from "../shared/schema.js";
import * as XLSX from "xlsx";
import { generatePreviews, analyzeSpam, generateTemplate, validateTemplate, validateSenderProfile, getAiHealthStatus, peekSpamCache } from "./ai.js";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { sendCampaignEmail, sendTransactionalEmail, verifySesConnection } from "./email.js";
import { uploadFile } from "./s3.js";
import express from "express";
import rateLimit from "express-rate-limit";
import { addCampaignJob, getCampaignQueue, getRedisConnection } from "./queue.js";
import { verifyUnsubscribeToken } from "./unsubscribe.js";
import { verifySnsMessage } from "./sns.js";
import crypto from "crypto";
import { rzp, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from "./gateways.js";
import { upgradePlanIfHigher } from "./fulfillPayment.js";
import { getRateLimiter } from "./rateLimiter.js";
import { sendWithRetry } from "./worker.js";

// SMTP health cache — checked at most once every 5 minutes to avoid exhausting AWS SES connections
let smtpHealthCache = { status: "unknown", checkedAt: 0 };
async function getSmtpHealth() {
  const CACHE_TTL_MS = 5 * 60 * 1000;
  if (Date.now() - smtpHealthCache.checkedAt < CACHE_TTL_MS) return smtpHealthCache.status;
  try {
    await verifySesConnection();
    smtpHealthCache = { status: "verified", checkedAt: Date.now() };
  } catch {
    smtpHealthCache = { status: "error", checkedAt: Date.now() };
  }
  return smtpHealthCache.status;
}

// 5 login attempts per IP per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again in 15 minutes." },
});

// 10 AI requests per user per minute (keyed on user ID after authMiddleware runs)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,  // RateLimit-Remaining (RFC draft)
  legacyHeaders: true,    // X-RateLimit-Remaining (used by frontend)
  keyGenerator: (req) => `ai:${req.user?.id ?? "anon"}`,
  message: { message: "Too many AI requests. Please wait a moment before generating more content." },
});

// 5 invite sends/resends per admin per hour
const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `invite:${req.user?.id ?? "anon"}`,
  message: { message: "Too many invites sent. Please wait before sending more." },
});

// 10 invite acceptances per IP per 15 minutes — prevents brute-force token enumeration
const acceptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please wait before trying again." },
});

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "") || 
                req.cookies?.token ||
                req.headers.cookie?.split("; ").find(c => c.startsWith("token="))?.split("=")[1];
  
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const session = await storage.getSessionByToken(token);
  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = await storage.getUserById(session.userId);
  if (!user) {
    await storage.deleteSession(token);
    return res.status(401).json({ message: "User not found" });
  }

  if (!user.isActive) {
    await storage.deleteSession(token);
    res.clearCookie("token");
    return res.status(401).json({ error: "Account deactivated. Contact your administrator." });
  }

  // Dormant users can read their data but cannot start campaigns, use AI, or buy credits
  if (user.isDormant) {
    const dormantBlocked =
      (req.method === "POST" && req.path === "/api/campaigns") ||
      (req.method === "POST" && req.path.startsWith("/api/ai/")) ||
      (req.method === "POST" && req.path === "/api/payments/initiate");
    if (dormantBlocked) {
      return res.status(403).json({
        error: "Your account is dormant due to inactivity.",
        isDormant: true,
        message: "Click the reactivation link in your email to restore full access, or contact your admin.",
        reactivationPath: "check_email",
      });
    }
  }

  // Paused senders cannot start new campaigns
  if (user.sendPaused && req.method === "POST" && req.path === "/api/campaigns") {
    return res.status(403).json({
      error: "Your account has been paused from sending due to elevated bounce or complaint rates. Contact support to resume.",
      sendPaused: true,
    });
  }

  // Block all actions until the user resets their admin-set password.
  // Exempt: auth/me (frontend reads state), reset-password (the reset form), logout.
  if (user.mustResetPassword) {
    const allowed = req.path === "/api/auth/me" ||
                    req.path === "/api/auth/reset-password" ||
                    req.path === "/api/auth/logout";
    if (!allowed) {
      return res.status(403).json({
        mustResetPassword: true,
        message: "You must set a new password before using RepMail.",
      });
    }
  }

  req.user = user;
  req.token = token;
  // Precompute so routes don't need to re-derive isSecondaryRoot inline
  req.isRootAdmin = user.role === "ROOT_ADMIN" || user.isSecondaryRoot === true;
  next();
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== "ROOT_ADMIN" && req.user.role !== "SUB_ADMIN" && !req.user.isSecondaryRoot) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

function rootAdminMiddleware(req, res, next) {
  if (req.user.role !== "ROOT_ADMIN" && !req.user.isSecondaryRoot) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

const SEND_RATE_MS = parseInt(process.env.SES_SEND_RATE_MS || "0", 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Reusable campaign execution — used by both immediate send and scheduler
export async function executeCampaign(campaignId, userId) {
  const campaign = await storage.getCampaign(campaignId);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

  // Owner-active guard — deactivation may race with an already-queued campaign
  const owner = await storage.getUserById(userId);
  if (!owner || !owner.isActive) {
    await storage.updateCampaign(campaignId, { status: "FAILED" });
    await storage.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CAMPAIGN_FAILED,
      targetType: "campaign",
      targetId: campaignId,
      details: { reason: "Campaign owner account deactivated", name: campaign.name },
    });
    console.warn(`[CAMPAIGN] ${campaignId} aborted — owner ${userId} is inactive`);
    return;
  }

  // Detect retry scenario — mirrors processCampaign in worker.js.
  // Status-based detection is unreliable if startup recovery has already written FAILED;
  // sent-email existence is the authoritative signal.
  // PAUSED is included: a mid-loop pause may have sent some emails already —
  // treating it as a retry ensures those contacts are skipped and not re-sent.
  const hasAnySentEmails = await storage.hasAnySentEmails(campaignId);
  const isRetry = campaign.status === "RUNNING" ||
    ((campaign.status === "PAUSED" || campaign.status === "FAILED") && hasAnySentEmails);

  // Credit check skipped on retry — credits were partially consumed in the previous attempt.
  // Per-contact deductCreditAtomic handles enforcement atomically during the loop.
  if (!isRetry) {
    const canStart = await storage.canStartCampaign(userId, campaign.totalEmails);
    if (!canStart.allowed) {
      await storage.updateCampaign(campaignId, { status: "FAILED" });
      await storage.createAuditLog({
        userId,
        action: AUDIT_ACTIONS.CAMPAIGN_BLOCKED_INSUFFICIENT_CREDITS,
        targetType: "campaign",
        targetId: campaignId,
        details: canStart
      });
      throw new Error(canStart.reason);
    }
  }

  await storage.updateCampaign(campaignId, { status: "RUNNING", startedAt: new Date() });
  await storage.createAuditLog({
    userId,
    action: AUDIT_ACTIONS.CAMPAIGN_STARTED,
    targetType: "campaign",
    targetId: campaignId,
  });

  // ── Global send-pause helpers (mirrors BullMQ worker) ────────────────────
  async function isGlobalSendPaused() {
    const setting = await storage.getPlatformSetting("send_pause_enabled");
    return setting?.value === "true";
  }

  // Pre-loop: global platform pause check
  if (await isGlobalSendPaused()) {
    await storage.updateCampaign(campaignId, { status: "PAUSED" });
    await storage.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CAMPAIGN_PAUSED,
      targetType: "campaign",
      targetId: campaignId,
      details: { reason: "global_send_pause_active" },
    });
    console.warn(`[CAMPAIGN] ${campaignId} paused — global send pause is active`);
    return;
  }

  // ── Pre-loop: per-user manual pause check ─────────────────────────────────
  if (owner.sendPaused) {
    await storage.updateCampaign(campaignId, { status: "FAILED" });
    await storage.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CAMPAIGN_FAILED,
      targetType: "campaign",
      targetId: campaignId,
      details: { reason: "sender_paused", pausedReason: owner.sendPausedReason },
    });
    console.warn(`[CAMPAIGN] ${campaignId} failed — sender ${userId} is paused`);
    return;
  }

  // ── Pre-loop: auto-pause check (7-day rolling bounce/complaint rate) ───────
  const senderHealth = await storage.getUserSenderHealth(userId);
  const bounceThreshold = parseFloat(process.env.BOUNCE_RATE_PAUSE_THRESHOLD || "0.15");
  const complaintThreshold = parseFloat(process.env.COMPLAINT_RATE_PAUSE_THRESHOLD || "0.005");

  if (senderHealth.sent >= 50 && (senderHealth.bounceRate > bounceThreshold || senderHealth.complaintRate > complaintThreshold)) {
    await storage.updateUser(userId, {
      sendPaused: true,
      sendPausedReason: `auto_paused: bounce=${(senderHealth.bounceRate * 100).toFixed(1)}% complaint=${(senderHealth.complaintRate * 100).toFixed(2)}%`,
      sendPausedAt: new Date(),
    });
    await storage.updateCampaign(campaignId, { status: "FAILED" });
    await storage.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CAMPAIGN_FAILED,
      targetType: "campaign",
      targetId: campaignId,
      details: {
        reason: "sender_auto_paused",
        bounceRate: senderHealth.bounceRate,
        complaintRate: senderHealth.complaintRate,
        threshold: { bounce: bounceThreshold, complaint: complaintThreshold },
      },
    });
    console.warn(`[CAMPAIGN] User ${userId} auto-paused — bounce=${(senderHealth.bounceRate * 100).toFixed(1)}% complaint=${(senderHealth.complaintRate * 100).toFixed(2)}%`);
    return;
  }

  const template = campaign.templateSnapshot || {};
  const contactIds = campaign.contactIds || [];

  // Build sender profile once — passed to every sendCampaignEmail call for
  // From display name, Reply-To, and signature placeholder replacement.
  const senderProfile = {
    name:         owner.senderName    || null,
    title:        owner.senderTitle   || null,
    company:      owner.senderCompany || null,
    phone:        owner.senderPhone   || null,
    replyToEmail: owner.replyToEmail  || null,
  };
  if (!senderProfile.name) {
    console.warn(`[CAMPAIGN] ${campaignId} — sender profile incomplete for userId=${userId}. From name will fall back to platform default.`);
  }

  const rateLimiter = getRateLimiter();
  let rateLimiterFallbackLogged = false;
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let outOfCredits = false;

  const creditsBefore = await storage.getTotalCreditsAvailable(userId);
  console.log(`[CAMPAIGN START] id=${campaignId} contacts=${contactIds.length} credits_paid=${creditsBefore.paid} credits_free=${creditsBefore.free ?? 0} credits_trial=${creditsBefore.trial} credits_total=${creditsBefore.total}`);

  // Batch-load all contacts before the loop — 1 query instead of N per-contact lookups.
  // Per-contact suppression checks remain inside the loop (a concurrent campaign can add
  // suppressions mid-execution, so those must stay live).
  const contactList = await storage.getContactsByIds(contactIds);
  const contactMap = new Map(contactList.map(c => [c.id, c]));

  for (let i = 0; i < contactIds.length; i++) {
    // Re-check global pause and per-user sendPaused every 50 contacts — allows admin pause
    // or auto-pause (fired by a concurrent campaign start) to take effect mid-campaign
    // without a DB query on every single email. Skip i=0 (already checked pre-loop).
    if (i > 0 && i % 50 === 0) {
      if (await isGlobalSendPaused()) {
        await storage.updateCampaign(campaignId, { status: "PAUSED" });
        await storage.createAuditLog({
          userId,
          action: AUDIT_ACTIONS.CAMPAIGN_PAUSED,
          targetType: "campaign",
          targetId: campaignId,
          details: { reason: "global_send_pause_active", pausedAtContact: i },
        });
        console.warn(`[CAMPAIGN] ${campaignId} paused at contact ${i} — global send pause activated`);
        return;
      }
      // Re-check per-user sendPaused — auto-pause may have fired from a concurrent campaign start
      const freshOwner = await storage.getUserById(userId);
      if (freshOwner?.sendPaused) {
        await storage.updateCampaign(campaignId, { status: "PAUSED" });
        await storage.createAuditLog({
          userId,
          action: AUDIT_ACTIONS.CAMPAIGN_PAUSED,
          targetType: "campaign",
          targetId: campaignId,
          details: { reason: "sender_paused_mid_loop", pausedAtContact: i },
        });
        console.warn(`[CAMPAIGN] ${campaignId} paused at contact ${i} — sender paused mid-loop`);
        return;
      }
    }

    const contactId = contactIds[i];
    const contact = contactMap.get(contactId) || null;

    // On retry, check if this contact was already processed — prevents duplicate sends
    // on crash-restart. Mirrors the identical block in processCampaign (worker.js).
    if (isRetry && contact) {
      const existing = await storage.getCampaignEmailByContact(campaignId, contactId);
      if (existing?.status === CAMPAIGN_EMAIL_STATUS.SENT) {
        sentCount++;
        continue;
      }
      if (existing?.status === CAMPAIGN_EMAIL_STATUS.SUPPRESSED) {
        skippedCount++;
        continue;
      }
      // BOUNCED and COMPLAINED are set by the SNS handler after a confirmed delivery.
      // They must never be re-sent to, even on retry — the address is permanently unsafe.
      if (existing?.status === CAMPAIGN_EMAIL_STATUS.BOUNCED) {
        skippedCount++;
        continue;
      }
      if (existing?.status === CAMPAIGN_EMAIL_STATUS.COMPLAINED) {
        skippedCount++;
        continue;
      }
      if (existing?.status === CAMPAIGN_EMAIL_STATUS.FAILED) {
        const isPermanent = existing.failureReason && [
          "hard_bounce", "invalid_recipient", "complaint", "suppressed",
        ].includes(existing.failureReason);
        if (isPermanent) { failedCount++; continue; }
      }
      // PENDING or transient FAILED: fall through and re-process
    }

    // Create PENDING audit record before any send attempt
    const campaignEmailRecord = await storage.createCampaignEmail({
      campaignId,
      userId,
      contactId: contact ? contactId : null,
      recipientEmail: contact?.email || "unknown",
      status: CAMPAIGN_EMAIL_STATUS.PENDING,
    });

    let attemptedSend = false;
    let usedRateLimiter = false;
    try {
      if (!contact || !contact.email) throw new Error("Contact or email missing");

      // Per-user suppression followed by platform-wide global check.
      // Per-contact inside the loop: a bounce from a concurrent campaign could
      // add this address to the global list mid-execution of a long campaign.
      const suppressed = await storage.isSuppressed(userId, contact.email);
      const globallySuppressed = suppressed ? false : await storage.isGloballySuppressed(contact.email);
      if (suppressed || globallySuppressed) {
        skippedCount++;
        await storage.updateCampaignEmail(campaignEmailRecord.id, {
          status: CAMPAIGN_EMAIL_STATUS.SUPPRESSED,
        });
        const suppDetail = await storage.getSuppressionRecord(suppressed ? userId : null, contact.email);
        console.log(
          `[CAMPAIGN ${campaignId}] contact ${i + 1} suppressed` +
          ` scope=${suppressed ? "user" : "global"}` +
          ` email=${contact.email}` +
          ` source=${suppDetail?.source ?? "unknown"}` +
          ` reason=${suppDetail?.reason ?? "none"}` +
          ` suppressedAt=${suppDetail?.createdAt?.toISOString() ?? "unknown"}`
        );
      } else {
        attemptedSend = true;
        // Acquire a shared SES send token before every actual send attempt
        if (rateLimiter) {
          try {
            await rateLimiter.acquire(campaignId);
            usedRateLimiter = true;
          } catch (rlErr) {
            if (!rateLimiterFallbackLogged) {
              console.warn(`[CAMPAIGN] [${campaignId}] Rate limiter unavailable — falling back to ${SEND_RATE_MS}ms per-worker delay:`, rlErr.message);
              rateLimiterFallbackLogged = true;
            }
          }
        }
        const info = await sendWithRetry(contact, template, userId, campaignId, usedRateLimiter ? rateLimiter : null, campaignEmailRecord.id, 3, senderProfile);
        console.log(`[SES SEND] contact=${contact.email} status=ok`);

        // Email delivered — mark SENT before credit deduction so a deduction
        // failure does not retroactively show the email as FAILED.
        await storage.updateCampaignEmail(campaignEmailRecord.id, {
          status: CAMPAIGN_EMAIL_STATUS.SENT,
          sesMessageId: info?.messageId || null,
          sentAt: new Date(),
        });
        sentCount++;

        try {
          await storage.deductCreditAtomic(userId, campaignId, `Email to ${contact.email}`);
          console.log(`[CREDITS DEDUCTED] contact=${contact.email} sentSoFar=${sentCount}`);
        } catch (deductErr) {
          if (deductErr.message === "Insufficient credits") {
            outOfCredits = true;
            console.warn(`[CAMPAIGN ${campaignId}] credits exhausted after send to ${contact.email} — stopping`);
            break;
          }
          console.error(`[CAMPAIGN ${campaignId}] credit deduction failed after send to ${contact.email} — accounting drift:`, deductErr.message);
        }
      }
    } catch (err) {
      // Handles: contact missing, isSuppressed failure, sendCampaignEmail failure
      console.error(`[CAMPAIGN ${campaignId}] Failed to send email ${i + 1}:`, err.message);
      failedCount++;
      await storage.updateCampaignEmail(campaignEmailRecord.id, {
        status: CAMPAIGN_EMAIL_STATUS.FAILED,
        failureReason: err.message,
      });
    }

    // Checkpoint after every email (mirrors BullMQ worker behaviour)
    await storage.updateCampaign(campaignId, {
      sentEmails: sentCount,
      failedEmails: failedCount,
      skippedEmails: skippedCount,
    });

    // Fallback throttle when Redis rate limiter is unavailable — per-worker sleep
    if (SEND_RATE_MS > 0 && attemptedSend && !usedRateLimiter) await sleep(SEND_RATE_MS);
  }

  if (outOfCredits) {
    await storage.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CAMPAIGN_BLOCKED_INSUFFICIENT_CREDITS,
      targetType: "campaign",
      targetId: campaignId,
      details: { name: campaign.name, sentEmails: sentCount, stoppedEarly: true },
    });
    console.warn(`[CAMPAIGN ${campaignId}] stopped early — insufficient credits`);
  }

  // Re-read status to detect external termination (e.g., user deactivated mid-run)
  const currentState = await storage.getCampaign(campaignId);
  if (currentState?.status === "FAILED") {
    console.warn(`[CAMPAIGN ${campaignId}] externally terminated (status=FAILED) — not overwriting to COMPLETED`);
    return currentState;
  }
  if (currentState?.status === "PAUSED") {
    console.warn(`[CAMPAIGN ${campaignId}] externally paused — not overwriting to COMPLETED`);
    return currentState;
  }

  await storage.updateCampaign(campaignId, {
    sentEmails: sentCount,
    failedEmails: failedCount,
    skippedEmails: skippedCount,
    creditsUsed: sentCount,
    status: "COMPLETED",
    completedAt: new Date()
  });

  await storage.createAuditLog({
    userId,
    action: AUDIT_ACTIONS.CAMPAIGN_COMPLETED,
    targetType: "campaign",
    targetId: campaignId,
    details: { name: campaign.name, sentEmails: sentCount, failedEmails: failedCount }
  });

  if (owner && owner.role !== USER_ROLES.ROOT_ADMIN && !owner.isSecondaryRoot) {
    await storage.updateUserActivity(userId).catch(err =>
      console.error(`[CAMPAIGN] updateUserActivity failed for ${userId}:`, err.message)
    );
  }

  return await storage.getCampaign(campaignId);
}

// ── Campaign validation constants and helpers ─────────────────────────────────
const CAMPAIGN_MAX_CONTACTS = 10_000;
const CAMPAIGN_MAX_SUBJECT_LENGTH = 200;
const CAMPAIGN_MAX_BODY_BYTES = 500 * 1024; // 500 KB

const ROLE_ADDRESS_PREFIXES = [
  "admin", "support", "noreply", "no-reply", "postmaster",
  "mailer-daemon", "abuse", "webmaster", "info", "help", "contact",
];

function normalizeContactEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function isValidEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isRoleAddress(email) {
  const local = email.split("@")[0].toLowerCase();
  return ROLE_ADDRESS_PREFIXES.some(
    prefix => local === prefix || local.startsWith(prefix + ".") || local.startsWith(prefix + "+")
  );
}

function extractPlaceholders(text) {
  const found = new Set();
  const re = /\{\{(\w+)\}\}|\{(\w+)\}/g;
  let m;
  while ((m = re.exec(text ?? "")) !== null) {
    found.add(m[1] || m[2]);
  }
  return found;
}

export async function registerRoutes(httpServer, app) {
  await storage.initializeRootAdmin();

  // ── Public: health check — registered FIRST so no middleware can shadow it ─
  // Used by Railway health checks, uptime monitors, and load balancers.
  // Always returns 200 — individual component statuses are in the body.
  app.get("/api/health", async (req, res) => {
    const result = {
      status: "ok",
      uptime: Math.floor(process.uptime()),
      postgres: "unchecked",
      redis: "unchecked",
      worker: "unchecked",
      smtp: "unchecked",
    };

    // Postgres — 3s timeout prevents health probe from hanging on a slow connection
    if (pool) {
      try {
        await Promise.race([
          pool.query("SELECT 1"),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
        ]);
        result.postgres = "connected";
      } catch (err) {
        result.postgres = `error: ${err.message}`;
        result.status = "degraded";
      }
    } else {
      result.postgres = "dev-mode";
    }

    // Redis — use the BullMQ connection (maxRetriesPerRequest: null, lazyConnect)
    const redisConn = getRedisConnection();
    if (redisConn) {
      try {
        await Promise.race([
          redisConn.ping(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
        ]);
        result.redis = "connected";

        // Worker heartbeat — written every 30s by worker.js with 60s TTL
        const heartbeat = await redisConn.get("repmail:worker:heartbeat").catch(() => null);
        if (heartbeat) {
          const ageMs = Date.now() - parseInt(heartbeat, 10);
          result.worker = ageMs < 70_000 ? "running" : "stalled";
        } else {
          result.worker = "stalled";
        }
      } catch (err) {
        result.redis = `error: ${err.message}`;
        result.worker = "unknown";
        result.status = "degraded";
      }
    } else {
      result.redis = "not-configured";
      result.worker = "disabled";
    }

    // SMTP — use 5-minute cache to avoid exhausting AWS SES connections on frequent health polls
    if (process.env.SES_SMTP_HOST) {
      result.smtp = await getSmtpHealth();
      if (result.smtp === "error") result.status = "degraded";
    } else {
      result.smtp = "not-configured";
    }

    // sendPaused — live value from platform_settings table
    try {
      const pauseSetting = await storage.getPlatformSetting("send_pause_enabled");
      result.sendPaused = pauseSetting?.value === "true";
    } catch {
      result.sendPaused = false;
    }
    result.ai = getAiHealthStatus().status;
    result.sesTracking = process.env.SES_CONFIGURATION_SET
      ? "configured"
      : "not-configured — open/click/delivery tracking disabled";
    result.timestamp = new Date().toISOString();

    res.json(result);
  });

  // ── Passport / Google OAuth ────────────────────────────────────────────────
  app.use(passport.initialize());

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.NODE_ENV === "production"
          ? "https://www.letszero.in/api/auth/google/callback"
          : "/api/auth/google/callback",
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("Google did not return an email address"), null);

          let user = await storage.getUserByEmail(email);

          // A-1: inactive accounts must not gain access via OAuth
          if (user && !user.isActive) {
            await storage.createAuditLog({
              userId: user.id,
              action: AUDIT_ACTIONS.USER_LOGIN,
              details: { via: "google_oauth", blocked: true, reason: "account_inactive", email },
            });
            return done(null, false);
          }

          if (!user) {
            const base = (email.split("@")[0]).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
            const username = `${base}_${Math.random().toString(36).slice(2, 6)}`;
            user = await storage.createUser({
              username,
              email,
              role: "USER",
              plan: "free",
              creditsReceived: 0,
              mustResetPassword: false,
            });
            user._isNewOAuthUser = true;
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    ));
  }

  // Redirect to Google
  app.get("/api/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"], session: false })
  );

  // Google callback — create session token and set cookie
  app.get("/api/auth/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/login?error=google_failed" }),
    async (req, res) => {
      try {
        const session = await storage.createSession(req.user.id);
        res.cookie("token", session.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 24 * 60 * 60 * 1000,
        });
        await storage.createAuditLog({
          userId: req.user.id,
          action: AUDIT_ACTIONS.USER_LOGIN,
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        });
        const isNewOAuthUser = req.user._isNewOAuthUser === true;
        res.redirect(isNewOAuthUser ? "/app/dashboard?welcome=1" : "/app/dashboard");
      } catch (err) {
        console.error("Google callback error:", err);
        res.redirect("/login?error=google_failed");
      }
    }
  );
  // ── End Google OAuth ───────────────────────────────────────────────────────

  // ── Public: unsubscribe ────────────────────────────────────────────────────
  app.get("/api/unsubscribe", async (req, res) => {
    const { token, uid, email } = req.query;
    const fail = (msg) => res.status(400).send(`<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center"><h2 style="color:#dc2626">Unsubscribe Failed</h2><p>${msg}</p></body></html>`);

    if (!token || !uid || !email) return fail("Missing required parameters.");
    if (!/^[0-9a-f-]{36}$/.test(uid)) return fail("Invalid request.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Invalid email.");
    if (!/^[0-9a-f]{64}$/.test(token)) return fail("Invalid token.");

    const valid = verifyUnsubscribeToken(uid, email, token);
    if (!valid) return fail("This unsubscribe link is invalid or has expired.");

    try {
      const alreadySuppressed = await storage.isSuppressed(uid, email);
      if (alreadySuppressed) {
        return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Already Unsubscribed</title><style>body{font-family:sans-serif;max-width:480px;margin:80px auto;padding:0 20px;text-align:center;color:#1a1a1a}.icon{font-size:48px;margin-bottom:16px}h1{font-size:22px;font-weight:600;margin-bottom:8px}p{color:#555;line-height:1.5}</style></head><body><div class="icon">✓</div><h1>Already unsubscribed</h1><p>You are already unsubscribed from this sender. No further action is needed.</p></body></html>`);
      }
      await storage.addSuppression(uid, email, "unsubscribe");
      return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribed</title><style>body{font-family:sans-serif;max-width:480px;margin:80px auto;padding:0 20px;text-align:center;color:#1a1a1a}.icon{font-size:48px;margin-bottom:16px}h1{font-size:22px;font-weight:600;margin-bottom:8px}p{color:#555;line-height:1.5}</style></head><body><div class="icon">✓</div><h1>You've been unsubscribed</h1><p>You will no longer receive emails from this sender. This change takes effect immediately.</p></body></html>`);
    } catch (err) {
      console.error("[UNSUBSCRIBE] error:", err.message);
      return fail("Something went wrong. Please try again later.");
    }
  });

  // ── Public: inactivity keep-credits ───────────────────────────────────────
  app.get("/api/inactivity/keep-credits", async (req, res) => {
    const html = (color, heading, body) =>
      res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center"><h2 style="color:${color}">${heading}</h2><p>${body}</p></body></html>`);

    const { token } = req.query;
    if (!token || !/^[0-9a-f]{64}$/.test(token)) {
      return html("#dc2626", "Invalid link", "This reactivation link is invalid. Please check your email or contact your administrator.");
    }

    try {
      const result = await storage.validateKeepToken(token);

      if (result.reason === "not_found") {
        return html("#dc2626", "Link not found", "This reactivation link is invalid. Please check your email or contact your administrator.");
      }
      if (result.reason === "expired") {
        return html("#dc2626", "Link expired", "This reactivation link has expired. Please contact your administrator to reactivate your account.");
      }
      if (result.reason === "reclaim_already_fired") {
        return html("#ea580c", "Credits already reclaimed", "Your account was inactive for 90 days and your unused credits have been reclaimed. Please contact your administrator to purchase new credits.");
      }

      // valid — reset inactivity timer
      await storage.updateUserActivity(result.userId);
      await storage.createAuditLog({
        userId:     result.userId,
        action:     AUDIT_ACTIONS.INACTIVITY_TIMER_RESET,
        targetType: "user",
        targetId:   result.userId,
        details:    { via: "keep-credits-link" },
      });

      const appUrl = process.env.APP_URL || "http://localhost:5000";
      return html("#16a34a", "Account fully reactivated ✓", `Your credits are safe and campaign sending has been restored. Your inactivity timer has been reset to today. <a href="${appUrl}/login" style="color:#2563eb">Log in to RepMail →</a>`);
    } catch (err) {
      console.error("[KEEP-CREDITS] Error:", err.message);
      return html("#dc2626", "Something went wrong", "Please try again later or contact your administrator.");
    }
  });

  // ── Public: SES bounce / complaint SNS webhook ────────────────────────────
  // SNS may send Content-Type: text/plain — add a text parser for this route
  // only so the global express.json() fallback still works for application/json.
  app.post("/api/webhooks/ses", express.text({ type: "text/plain" }), async (req, res) => {
    // Parse body first — needed for signature verification
    let envelope;
    try {
      envelope = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch {
      console.error("[SNS] Unparseable request body");
      return res.status(400).send("Bad Request");
    }

    // Issue 1 fix: verify signature BEFORE sending 200.
    // Forged requests (invalid signature) are rejected with 403 so the caller
    // knows the request was rejected and SNS does not retry valid messages.
    // verifySnsMessage validates SigningCertURL hostname against *.amazonaws.com
    // (SSRF protection), caches the cert for 24h, and verifies with SHA1withRSA.
    try {
      await verifySnsMessage(envelope);
    } catch (err) {
      console.error("[SNS] Signature verification failed — rejecting:", err.message);
      return res.status(403).send("Forbidden");
    }

    // Reject messages from unexpected topics — prevents cross-account SNS injection.
    // Fail-closed: if SNS_TOPIC_ARN is unset, reject all messages rather than
    // accepting them — an unconfigured ARN is not "trust everything", it is "broken".
    const expectedTopicArn = process.env.SNS_TOPIC_ARN;
    if (!expectedTopicArn) {
      console.error("[SNS] SNS_TOPIC_ARN not configured — rejecting to prevent cross-topic injection");
      return res.status(503).send("Not configured");
    }
    if (envelope.TopicArn !== expectedTopicArn) {
      console.warn("[SNS] Rejected message from unexpected TopicArn:", envelope.TopicArn);
      return res.status(403).send("Forbidden");
    }

    // ACK after verification passes — SNS retries on non-2xx for up to 23 days.
    // All remaining processing is async fire-and-forget after this point.
    res.sendStatus(200);

    // Confirm new SNS subscriptions automatically
    if (envelope.Type === "SubscriptionConfirmation") {
      const subUrl = envelope.SubscribeURL;
      if (!subUrl || !subUrl.startsWith("https://")) return;
      try {
        const resp = await fetch(subUrl);
        console.log(`[SNS] Subscription confirmed — HTTP ${resp.status}`);
      } catch (err) {
        console.error("[SNS] Failed to confirm subscription:", err.message);
      }
      return;
    }

    if (envelope.Type !== "Notification") return;

    // ── Step 1: Deduplication check ──────────────────────────────────────────
    // processed=true  → fully done, skip entirely.
    // processed=false → previous attempt crashed before step 4; re-process.
    // not found       → first delivery, proceed to step 2.
    const snsMessageId = envelope.MessageId;
    let existingSnsEvent = null;
    if (snsMessageId) {
      existingSnsEvent = await storage.getSnsEvent(snsMessageId);
      if (existingSnsEvent?.processed) {
        console.log(`[SNS] Already processed: snsMessageId=${snsMessageId}`);
        return;
      }
    }

    let notification;
    try {
      notification = JSON.parse(envelope.Message);
    } catch {
      console.error("[SNS] Unparseable Message field");
      return;
    }

    // Legacy SES notifications use `notificationType`; Configuration Set events use `eventType`.
    const { notificationType, eventType: confSetEventType, mail, bounce, complaint } = notification;
    const sesMessageId = mail?.messageId;
    const eventType = notificationType || confSetEventType;
    if (!sesMessageId || !eventType) return;

    // ── Step 2: Claim this delivery ───────────────────────────────────────────
    // Only insert if no existing record (existingSnsEvent === null means first delivery).
    // If existingSnsEvent is non-null with processed=false, this is crash recovery —
    // skip the insert and fall through to re-process.
    if (snsMessageId && !existingSnsEvent) {
      const inserted = await storage.createSnsEvent(snsMessageId, eventType.toLowerCase());
      if (!inserted) {
        // Another concurrent delivery won the insert race — defer to them.
        console.log(`[SNS] Concurrent delivery race lost: snsMessageId=${snsMessageId}`);
        return;
      }
    }

    try {
      // ── Step 3: Execute all writes ────────────────────────────────────────
      // All SES event types (Open, Click, Delivery, Bounce, Complaint) include
      // the campaign-email-id tag in mail.tags — prefer it for a direct PK lookup.
      // Fall back to ses_message_id only for legacy/untagged sends.
      // NOTE: Nodemailer info.messageId (SMTP Message-ID header, angle-bracket format)
      // ≠ SES internal mail.messageId in SNS payloads — tag lookup avoids this mismatch.
      let campaignEmail;
      const taggedId = notification.mail?.tags?.["campaign-email-id"]?.[0];
      if (taggedId) campaignEmail = await storage.getCampaignEmailById(taggedId);
      if (!campaignEmail) campaignEmail = await storage.getCampaignEmailBySesMessageId(sesMessageId);

      if (!campaignEmail) {
        console.warn(`[SNS] No campaign_email record for ses_message_id=${sesMessageId} eventType=${eventType}`);
        return;
      }

      const { userId, campaignId, id: campaignEmailId } = campaignEmail;

      if (eventType === "Bounce") {
        // Only suppress on permanent bounces; transient bounces are retryable
        if (bounce?.bounceType !== "Permanent") {
          console.log(`[SNS] Transient bounce ignored for messageId=${sesMessageId}`);
          return;
        }
        for (const r of bounce.bouncedRecipients || []) {
          if (!r.emailAddress) continue;
          const bounceReason = r.diagnosticCode || r.status || null;
          await storage.addSuppression(userId, r.emailAddress, "bounce", bounceReason);
          await storage.updateCampaignEmail(campaignEmailId, {
            status: CAMPAIGN_EMAIL_STATUS.BOUNCED,
          });
          if (campaignId) await storage.incrementCampaignBounced(campaignId);
          console.log(`[SNS] Permanent bounce — suppressed: ${r.emailAddress}`);
        }
      } else if (eventType === "Complaint") {
        for (const r of complaint.complainedRecipients || []) {
          if (!r.emailAddress) continue;
          const complaintReason = complaint.complaintFeedbackType || null;
          await storage.addSuppression(userId, r.emailAddress, "complaint", complaintReason);
          await storage.updateCampaignEmail(campaignEmailId, {
            status: CAMPAIGN_EMAIL_STATUS.COMPLAINED,
          });
          if (campaignId) await storage.incrementCampaignComplained(campaignId);
          console.log(`[SNS] Complaint — suppressed: ${r.emailAddress}`);
        }
      } else if (eventType === "Open") {
        const { wasFirst } = await storage.updateCampaignEmailOpened(campaignEmailId);
        if (wasFirst && campaignId) {
          await storage.incrementCampaignOpened(campaignId);
          console.log(`[SNS] Open recorded — campaignEmailId=${campaignEmailId} campaignId=${campaignId}`);
        }
      } else if (eventType === "Click") {
        const link = notification.click?.link;
        // Unsubscribe footer links are rewritten by SES click tracking just like any other
        // link. Counting unsubscribe clicks as engagement clicks would inflate campaign
        // click rates and conflate opt-out signals with genuine interest. Exclude them.
        const isUnsubscribeClick = typeof link === "string" && link.includes("/api/unsubscribe");
        if (isUnsubscribeClick) {
          console.log(`[SNS] Unsubscribe click excluded from metrics — link=${link} campaignEmailId=${campaignEmailId}`);
        } else {
          const { wasFirst } = await storage.updateCampaignEmailClicked(campaignEmailId);
          if (wasFirst && campaignId) {
            await storage.incrementCampaignClicked(campaignId);
            console.log(`[SNS] Click recorded — link=${link} campaignEmailId=${campaignEmailId} campaignId=${campaignId}`);
          }
        }
      } else if (eventType === "Delivery") {
        // Idempotent: UPDATE … WHERE deliveredAt IS NULL guarantees each recipient
        // is counted at most once regardless of how many times SNS retries this event.
        const { wasFirst } = await storage.updateCampaignEmailDelivered(campaignEmailId);
        if (wasFirst && campaignId) {
          await storage.incrementCampaignDelivered(campaignId);
          console.log(`[SNS] Delivery confirmed — campaignEmailId=${campaignEmailId} campaignId=${campaignId}`);
        }
      }

      // ── Step 4: Mark as fully processed ──────────────────────────────────
      // If a crash occurs before this line, processed stays false and the next
      // SNS delivery re-processes. Counter may be off by one in that scenario —
      // acceptable vs the alternative of permanently dropped events.
      if (snsMessageId) {
        await storage.updateSnsEventProcessed(snsMessageId).catch(err =>
          console.warn(`[SNS] Failed to mark event processed snsMessageId=${snsMessageId}:`, err.message)
        );
      }
    } catch (err) {
      console.error("[SNS] Handler error:", err.message);
    }
  });

  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const isValid = await storage.validatePassword(user, password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Account is disabled" });
      }

      const session = await storage.createSession(user.id);

      res.cookie("token", session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000
      });

      await storage.createAuditLog({
        userId: user.id,
        action: AUDIT_ACTIONS.USER_LOGIN,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"]
      });

      const sanitizedUser = storage.sanitizeUser(user);
      res.json(sanitizedUser);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", authMiddleware, async (req, res) => {
    try {
      await storage.createAuditLog({
        userId: req.user.id,
        action: AUDIT_ACTIONS.USER_LOGOUT
      });

      await storage.deleteSession(req.token);
      res.clearCookie("token");
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req, res) => {
    try {
      const effectivePlan = await storage.getEffectivePlan(req.user.id);
      const rawLimit = AI_DAILY_LIMITS[effectivePlan] ?? AI_DAILY_LIMITS.free;
      res.json({
        ...req.user,
        isDormant: req.user.isDormant ?? false,
        isSecondaryRoot: req.user.isSecondaryRoot ?? false,
        effectivePlan,
        aiDailyLimit: rawLimit === Infinity ? null : rawLimit,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update sender identity profile fields — used by AI generation and email delivery
  app.put("/api/profile", authMiddleware, async (req, res) => {
    try {
      const { senderName, senderTitle, senderCompany, senderPhone, replyToEmail } = req.body;

      // Validate replyToEmail format if provided
      if (replyToEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyToEmail)) {
        return res.status(400).json({ message: "Reply-to email must be a valid email address" });
      }

      await storage.updateUser(req.user.id, {
        senderName:    senderName    !== undefined ? (senderName.trim()    || null) : undefined,
        senderTitle:   senderTitle   !== undefined ? (senderTitle.trim()   || null) : undefined,
        senderCompany: senderCompany !== undefined ? (senderCompany.trim() || null) : undefined,
        senderPhone:   senderPhone   !== undefined ? (senderPhone.trim()   || null) : undefined,
        replyToEmail:  replyToEmail  !== undefined ? (replyToEmail.trim()  || null) : undefined,
      });

      const updatedUser = await storage.getUserById(req.user.id);
      const senderWarnings = validateSenderProfile({
        name:    senderName    !== undefined ? (senderName.trim()    || null) : updatedUser.senderName,
        title:   senderTitle   !== undefined ? (senderTitle.trim()   || null) : updatedUser.senderTitle,
        company: senderCompany !== undefined ? (senderCompany.trim() || null) : updatedUser.senderCompany,
      });
      res.json({ message: "Profile updated", user: updatedUser, senderWarnings });
    } catch (error) {
      console.error("[PROFILE] update error:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/reset-password", authMiddleware, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }

      // Skip current password check on forced first-login reset (user just authenticated moments ago)
      if (!req.user.mustResetPassword) {
        const user = await storage.getUserByUsername(req.user.username);
        const isValid = await storage.validatePassword(user, currentPassword);
        if (!isValid) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
      }

      await storage.updatePassword(req.user.id, newPassword);

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/dashboard/stats", authMiddleware, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.user.id, req.isRootAdmin);
      const isAdmin = req.user.role === "ROOT_ADMIN" || req.user.role === "SUB_ADMIN" || req.user.isSecondaryRoot;
      if (isAdmin) {
        const teamStats = await storage.getTeamStats(req.user.id);
        return res.json({ ...stats, teamStats });
      }
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const usersList = await storage.getUsersWithStats(req.user.id, req.isRootAdmin);
      res.json(usersList);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { username, email, password, role, credits } = req.body;

      // Plan limit check — team members
      const memberLimit = MAX_TEAM_MEMBERS[req.user.plan] ?? 0;
      if (memberLimit !== Infinity) {
        const activeCount = await storage.getChildUserCount(req.user.id);
        if (activeCount >= memberLimit) {
          return res.status(403).json({
            error: "PLAN_LIMIT",
            message: `Your plan allows up to ${memberLimit} team member${memberLimit === 1 ? "" : "s"}. Upgrade to add more.`,
            currentPlan: req.user.plan || "free",
            limit: memberLimit,
            current: activeCount,
          });
        }
      }

      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }

      if (req.user.role === "SUB_ADMIN" && !req.user.isSecondaryRoot && role !== "USER") {
        return res.status(403).json({ message: "Sub-admins can only create users" });
      }

      if ((req.user.role === "ROOT_ADMIN" || req.user.isSecondaryRoot) && role === "USER") {
        return res.status(403).json({ message: "Root admin can only create sub-admins" });
      }

      const newUser = await storage.createUser({
        username,
        email,
        password,
        role: role || "USER",
        parentId: req.user.id,
        creditsReceived: 0,
        mustResetPassword: true,
        plan: req.user.plan || "free"
      });

      if (credits && credits > 0) {
        await storage.allocateCredits(req.user.id, newUser.id, credits, req.user.id);
      }

      await storage.createAuditLog({
        userId: req.user.id,
        action: AUDIT_ACTIONS.USER_CREATED,
        targetType: "user",
        targetId: newUser.id,
        details: { username, role: role || "USER" }
      });

      const base = process.env.APP_URL || "http://localhost:5000";
      const loginUrl = `${base}/login`;
      let emailFailed = false;
      try {
        await sendTransactionalEmail(
          email,
          "Your RepMail account is ready",
          `Hi ${username},\n\nAn account has been created for you on RepMail.\n\nUsername: ${username}\nLogin: ${loginUrl}\n\nYou will be prompted to set your own password when you first log in.\n\nIf you have any questions, contact your administrator.\n\n— The RepMail Team`
        );
      } catch (emailErr) {
        emailFailed = true;
        console.error("[ADD_USER] Welcome email failed:", emailErr.message);
      }

      res.status(201).json({
        ...newUser,
        emailFailed,
        creditsAllocated: (credits && credits > 0) ? credits : 0,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users/:id/allocate-credits", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { credits } = req.body;

      if (!credits || credits <= 0) {
        return res.status(400).json({ message: "Invalid credits amount" });
      }

      await storage.allocateCredits(req.user.id, id, credits, req.user.id);

      // Sync child's plan to admin's plan
      const adminPlan = req.user.plan || "free";
      const childUser = await storage.getUserById(id);
      if (childUser && childUser.plan !== adminPlan) {
        await storage.updateUser(childUser.id, { plan: adminPlan });
      }

      const updatedUser = await storage.getUserById(id);
      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;

      // a. Load and verify target user
      const target = await storage.getUserById(id);
      if (!target) return res.status(404).json({ message: "User not found" });
      if (target.role === "ROOT_ADMIN" && req.user.role !== USER_ROLES.ROOT_ADMIN) {
        return res.status(403).json({ message: "Cannot deactivate root admin" });
      }
      if (target.isSecondaryRoot && req.user.role !== USER_ROLES.ROOT_ADMIN) {
        return res.status(403).json({ message: "Cannot deactivate a secondary root admin" });
      }
      if (req.user.role === "SUB_ADMIN" && target.parentId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // b. Terminate active and pending campaigns
      const allCampaigns = await storage.getCampaigns(id, false);
      const activeCampaigns = allCampaigns.filter(c => ["RUNNING", "PENDING"].includes(c.status));
      const queue = getCampaignQueue();
      for (const campaign of activeCampaigns) {
        await storage.updateCampaign(campaign.id, { status: "FAILED" });
        await storage.createAuditLog({
          userId: req.user.id,
          action: AUDIT_ACTIONS.CAMPAIGN_FAILED,
          targetType: "campaign",
          targetId: campaign.id,
          details: { name: campaign.name, reason: "Campaign terminated — user account deactivated" },
        });
        if (queue) {
          try {
            const job = await queue.getJob(campaign.id);
            if (job) await job.remove();
          } catch (e) {
            console.warn(`[DELETE_USER] BullMQ job removal failed for campaign ${campaign.id}:`, e.message);
          }
        }
      }

      // c. Cascade reclaim and reassign children (SUB_ADMIN deactivation only)
      let reassignedChildCount = 0;
      if (target.role === "SUB_ADMIN") {
        const activeChildren = await storage.getActiveChildren(id);

        for (const child of activeChildren) {
          const childCampaigns = await storage.getCampaigns(child.id, false);
          const hasRunning = childCampaigns.some(c => c.status === "RUNNING");

          if (hasRunning) {
            console.warn(`[DELETE_USER] Child ${child.id} (${child.username}) has RUNNING campaigns — skipping credit reclaim`);
          } else {
            await storage.autoReclaimCredits(child.id, req.user.id).catch(err =>
              console.error(`[DELETE_USER] autoReclaimCredits failed for child ${child.id}:`, err.message)
            );
          }

          sendTransactionalEmail(
            child.email,
            "Your manager's account has been deactivated",
            `Hi ${child.username},\n\nYour manager's account has been deactivated. Your account has been moved to a new administrator. Contact your new admin for credit reallocation.\n\nThe RepMail Team`
          ).catch(err => console.error(`[DELETE_USER] Child notification failed for ${child.id}:`, err.message));
        }

        // Reassign ALL children (including those with running campaigns)
        const allChildren = await storage.getChildUsers(id);
        reassignedChildCount = allChildren.length;
        await storage.reassignChildren(id, req.user.id);
      }

      // d. Reclaim unspent credits to parent
      const unspent = (target.creditsReceived || 0) - (target.creditsAllocated || 0) - (target.creditsUsed || 0);
      if (unspent > 0 && target.parentId) {
        await storage.reclaimCredits(id, target.parentId, unspent);
        await storage.createAuditLog({
          userId: req.user.id,
          action: AUDIT_ACTIONS.CREDITS_RECLAIMED,
          targetType: "user",
          targetId: id,
          details: { amount: unspent, reclaimedTo: target.parentId, username: target.username },
        });
      }

      // e. Kill all active sessions immediately
      await storage.deleteUserSessions(id);

      // f. Soft-deactivate the account
      await storage.updateUser(id, { isActive: false });

      // g. Audit trail
      await storage.createAuditLog({
        userId: req.user.id,
        action: AUDIT_ACTIONS.USER_DELETED,
        targetType: "user",
        targetId: id,
        details: { username: target.username, role: target.role, previousParentId: target.parentId ?? null, newParentId: req.user.id, campaignsTerminated: activeCampaigns.length, creditsReclaimed: unspent > 0 ? unspent : 0, childrenReassigned: reassignedChildCount },
      });

      res.json({ message: "User deactivated successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Secondary root admin management ───────────────────────────────────────

  app.post("/api/admin/grant-root-access", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== USER_ROLES.ROOT_ADMIN) {
        return res.status(403).json({ message: "Only the root administrator can grant secondary root access." });
      }

      const { userId } = req.body;
      if (!userId) return res.status(400).json({ message: "userId is required." });

      const target = await storage.getUserById(userId);
      if (!target) return res.status(404).json({ message: "User not found." });
      if (!target.isActive) return res.status(400).json({ message: "Cannot grant access to an inactive user." });
      if (target.role === USER_ROLES.ROOT_ADMIN) return res.status(400).json({ message: "User is already the root administrator." });
      if (target.isSecondaryRoot) return res.status(400).json({ message: "User already has secondary root access." });

      const count = await storage.getSecondaryRootCount();
      if (count >= 2) {
        return res.status(400).json({ message: "Maximum of 2 secondary root admins allowed. Revoke one before granting another." });
      }

      await storage.grantSecondaryRoot(userId);
      await storage.createAuditLog({
        userId:     req.user.id,
        action:     AUDIT_ACTIONS.ROOT_ACCESS_GRANTED,
        targetType: "user",
        targetId:   userId,
        details:    { grantedTo: target.username, grantedBy: req.user.username },
      });

      sendTransactionalEmail(
        target.email,
        "You have been granted secondary root admin access on RepMail",
        `Hi ${target.username},\n\nYou have been granted secondary root admin access on RepMail by ${req.user.username}.\n\nYou can now access all administrative features. This access can be revoked at any time.\n\nThe RepMail Team`
      ).catch(err => console.error("[GRANT-ROOT] Notification email failed:", err.message));

      res.json({ message: "Secondary root access granted.", userId });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/revoke-root-access", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== USER_ROLES.ROOT_ADMIN) {
        return res.status(403).json({ message: "Only the root administrator can revoke secondary root access." });
      }

      const { userId } = req.body;
      if (!userId) return res.status(400).json({ message: "userId is required." });

      const target = await storage.getUserById(userId);
      if (!target) return res.status(404).json({ message: "User not found." });
      if (!target.isSecondaryRoot) return res.status(400).json({ message: "User does not have secondary root access." });

      await storage.revokeSecondaryRoot(userId);
      await storage.createAuditLog({
        userId:     req.user.id,
        action:     AUDIT_ACTIONS.ROOT_ACCESS_REVOKED,
        targetType: "user",
        targetId:   userId,
        details:    { revokedFrom: target.username, revokedBy: req.user.username },
      });

      res.json({ message: "Secondary root access revoked.", userId });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/credits/transactions", authMiddleware, async (req, res) => {
    try {
      const transactions = await storage.getCreditTransactions(req.user.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/suppressions", authMiddleware, async (req, res) => {
    try {
      const list = await storage.getSuppressions(req.user.id);
      res.json(list);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/suppressions", authMiddleware, async (req, res) => {
    try {
      const { email, reason } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "email is required" });
      }
      const normalized = email.toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        return res.status(400).json({ message: "Invalid email address" });
      }
      await storage.addSuppression(req.user.id, normalized, "manual", reason?.trim() || null);
      await storage.createAuditLog({
        userId: req.user.id,
        action: "MANUAL_SUPPRESSION_ADDED",
        targetType: "suppression",
        details: { email: normalized, reason: reason?.trim() || null },
      });
      res.status(201).json({ message: "Email suppressed" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/campaigns", authMiddleware, async (req, res) => {
    try {
      const campaignsList = await storage.getCampaigns(req.user.id, req.isRootAdmin);
      res.json(campaignsList);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/campaigns", authMiddleware, async (req, res) => {
    try {
      const { name, template, contacts, scheduledAt } = req.body;
      const rawContacts = contacts || [];
      const validationErrors = [];

      // ── Plan limit check ──────────────────────────────────────────────────────
      const userCampaigns = await storage.getCampaigns(req.user.id, false);
      const activeCampaigns = userCampaigns.filter(c => ["RUNNING", "PENDING", "DRAFT"].includes(c.status));
      const campaignLimits = PLAN_LIMITS[req.user.plan] || PLAN_LIMITS["free"];
      if (activeCampaigns.length >= campaignLimits.maxActiveCampaigns) {
        return res.status(403).json({
          error: "PLAN_LIMIT",
          message: `Your ${campaignLimits.label} plan allows up to ${campaignLimits.maxActiveCampaigns} active campaigns. Wait for current campaigns to complete or upgrade your plan.`,
          currentPlan: req.user.plan || "free",
          limit: campaignLimits.maxActiveCampaigns,
          current: activeCampaigns.length,
        });
      }

      if (scheduledAt && !campaignLimits.canSchedule) {
        return res.status(403).json({
          error: "PLAN_LIMIT",
          message: "Campaign scheduling is available on Starter plan and above.",
          currentPlan: req.user.plan || "free",
        });
      }

      // ── Scheduled time validation ─────────────────────────────────────────────
      let scheduledTime = null;
      if (scheduledAt) {
        scheduledTime = new Date(scheduledAt);
        if (isNaN(scheduledTime.getTime()) || scheduledTime <= new Date()) {
          validationErrors.push("Scheduled time must be a valid future date");
        }
      }

      // ── Contact validation pipeline ───────────────────────────────────────────
      // All filtering runs before any DB write so the operation is atomic.

      const totalOriginal = rawContacts.length;

      // Step 1: Normalize emails
      const normalized = rawContacts.map(c => ({
        ...c,
        email: normalizeContactEmail(c.email),
      }));

      // Step 2: Deduplicate by normalized email
      const seenEmails = new Set();
      const deduped = normalized.filter(c => {
        if (!c.email || seenEmails.has(c.email)) return false;
        seenEmails.add(c.email);
        return true;
      });
      const duplicatesRemoved = totalOriginal - deduped.length;

      // Step 3: Format validation
      const formatValid = deduped.filter(c => isValidEmailFormat(c.email));
      const invalidFormat = deduped.length - formatValid.length;

      // Step 4: Role address filter
      const notRole = formatValid.filter(c => !isRoleAddress(c.email));
      const roleAddresses = formatValid.length - notRole.length;

      // Step 5: Enforce contact limit (after all contact-level filtering)
      if (notRole.length > CAMPAIGN_MAX_CONTACTS) {
        validationErrors.push(
          `Contact list exceeds the maximum of ${CAMPAIGN_MAX_CONTACTS.toLocaleString()} contacts after filtering`
        );
      }

      // ── Template validation ───────────────────────────────────────────────────
      const subject = template?.subject || "";
      const body = template?.body || "";

      if (subject.length > CAMPAIGN_MAX_SUBJECT_LENGTH) {
        validationErrors.push(
          `Subject exceeds the maximum of ${CAMPAIGN_MAX_SUBJECT_LENGTH} characters (got ${subject.length})`
        );
      }

      const bodyBytes = Buffer.byteLength(body, "utf8");
      if (bodyBytes > CAMPAIGN_MAX_BODY_BYTES) {
        validationErrors.push(
          `Email body exceeds the maximum of 500 KB (got ${(bodyBytes / 1024).toFixed(0)} KB)`
        );
      }

      // Placeholder cross-reference check intentionally omitted.
      // sendCampaignEmail() already replaces missing keys with empty string
      // (e.g. contact.company || ""), so unmapped optional fields send fine.
      // The UI warns about unmapped placeholders at the Template and Confirmation steps.

      // ── Blocking gate — no DB writes before this point ────────────────────────
      if (validationErrors.length > 0) {
        return res.status(400).json({ validationErrors });
      }

      const validContacts = notRole;

      if (validContacts.length === 0) {
        return res.status(400).json({ validationErrors: ["No valid contacts remain after filtering"] });
      }

      // ── Pre-campaign suppression count ────────────────────────────────────────
      // Runs last — after normalization, dedup, format validation, and role filtering.
      const suppressedContactCount = await storage.getPreCampaignSuppressionCount(
        validContacts.map(c => c.email)
      );

      // ── Credit check for immediate campaigns ──────────────────────────────────
      const totalEmails = validContacts.length;
      if (!scheduledAt) {
        const canStart = await storage.canStartCampaign(req.user.id, totalEmails);
        if (!canStart.allowed) {
          await storage.createAuditLog({
            userId: req.user.id,
            action: AUDIT_ACTIONS.CAMPAIGN_BLOCKED_INSUFFICIENT_CREDITS,
            details: canStart,
          });
          return res.status(400).json({ message: canStart.reason });
        }
      }

      // ── Persist contacts and campaign ─────────────────────────────────────────
      const savedContacts = await storage.createContacts(
        validContacts.map(c => ({
          userId: req.user.id,
          email: c.email,
          name: c.name || null,
          company: c.company || null,
          category: c.category || null,
        }))
      );
      const savedContactIds = savedContacts.map(c => c.id);

      const contactStats = {
        total: totalOriginal,
        valid: savedContactIds.length,
        duplicatesRemoved,
        invalidFormat,
        roleAddresses,
        suppressed: suppressedContactCount,
      };

      if (scheduledAt) {
        const campaign = await storage.createCampaign({
          name,
          userId: req.user.id,
          totalEmails,
          templateSnapshot: template,
          contactIds: savedContactIds,
          status: "PENDING",
          scheduledAt: scheduledTime,
        });
        return res.status(201).json({
          campaign,
          contactStats,
          validationErrors: [],
          message: `Campaign scheduled for ${scheduledTime.toISOString()}`,
        });
      }

      const campaign = await storage.createCampaign({
        name,
        userId: req.user.id,
        totalEmails,
        templateSnapshot: template,
        contactIds: savedContactIds,
        status: "PENDING",
      });

      // Enqueue via BullMQ if Redis is available
      const job = await addCampaignJob(campaign.id, req.user.id);

      if (!job) {
        // Redis not configured — run inline (non-blocking) as fallback
        executeCampaign(campaign.id, req.user.id).catch(async (err) => {
          console.error(`[CAMPAIGN] Inline execution error for ${campaign.id}:`, err.message);
          await storage.updateCampaign(campaign.id, { status: "FAILED" }).catch(() => {});
          if (req.user.role !== USER_ROLES.ROOT_ADMIN && !req.user.isSecondaryRoot) {
            const failed = await storage.getCampaign(campaign.id).catch(() => null);
            if (failed) {
              const attempted = (failed.sentEmails || 0) + (failed.failedEmails || 0) + (failed.skippedEmails || 0);
              if (attempted > 0) await storage.updateUserActivity(req.user.id).catch(() => {});
            }
          }
        });
      }

      // Return immediately — client polls GET /api/campaigns/:id for progress
      res.status(201).json({ campaign, contactStats, validationErrors: [] });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/campaigns/:id", authMiddleware, async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      if (campaign.userId !== req.user.id && req.user.role !== "ROOT_ADMIN" && !req.user.isSecondaryRoot) {
        return res.status(403).json({ message: "Forbidden" });
      }
      // Include up to 50 most-recent per-email records for the ProgressTracker
      const campaignEmails = await storage.getCampaignEmailsByCampaign(campaign.id, 50);

      // Enrich SUPPRESSED records with suppression source/reason/timestamp for the UI
      const suppressedEmails = campaignEmails
        .filter(ce => ce.status === CAMPAIGN_EMAIL_STATUS.SUPPRESSED && ce.recipientEmail)
        .map(ce => ce.recipientEmail);
      let suppressionMap = new Map();
      if (suppressedEmails.length > 0) {
        suppressionMap = await storage.getSuppressionDetailsForEmails(campaign.userId, suppressedEmails);
      }
      const enrichedEmails = campaignEmails.map(ce =>
        ce.status === CAMPAIGN_EMAIL_STATUS.SUPPRESSED
          ? { ...ce, suppressionDetail: suppressionMap.get(ce.recipientEmail) ?? null }
          : ce
      );

      res.json({ ...campaign, campaignEmails: enrichedEmails });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Campaign audit trail ─────────────────────────────────────────────────────
  app.get("/api/campaigns/:id/audit", authMiddleware, async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      if (campaign.userId !== req.user.id && !req.isRootAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const logs = await storage.getAuditLogs({ targetId: req.params.id, limit: 50 });
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/campaigns/:id", authMiddleware, async (req, res) => {
    try {
      const existing = await storage.getCampaign(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      if (existing.userId !== req.user.id && req.user.role !== "ROOT_ADMIN" && !req.user.isSecondaryRoot) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const campaign = await storage.updateCampaign(req.params.id, req.body);
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/templates", authMiddleware, async (req, res) => {
    try {
      const templatesList = await storage.getTemplates(req.user.id);
      res.json(templatesList);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/templates", authMiddleware, async (req, res) => {
    try {
      const { name, subject, body } = req.body;

      // Plan limit check
      const userTemplates = await storage.getTemplates(req.user.id);
      const templateLimits = PLAN_LIMITS[req.user.plan] || PLAN_LIMITS["free"];
      if (userTemplates.length >= templateLimits.maxTemplates) {
        return res.status(403).json({
          error: "PLAN_LIMIT",
          message: `Your ${templateLimits.label} plan allows up to ${templateLimits.maxTemplates} templates. Delete an existing template or upgrade your plan.`,
          currentPlan: req.user.plan || "free",
          limit: templateLimits.maxTemplates,
          current: userTemplates.length,
        });
      }

      const template = await storage.createTemplate({
        name,
        subject,
        body,
        userId: req.user.id
      });
      res.status(201).json(template);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/templates/:id", authMiddleware, async (req, res) => {
    try {
      const existing = await storage.getTemplate(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Template not found" });
      }
      if (existing.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const template = await storage.updateTemplate(req.params.id, req.body);
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/templates/:id", authMiddleware, async (req, res) => {
    try {
      await storage.deleteTemplate(req.params.id, req.user.id);
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/audit-logs", authMiddleware, rootAdminMiddleware, async (req, res) => {
    try {
      const { userId, action, limit } = req.query;
      const logs = await storage.getAuditLogs({
        userId,
        action,
        limit: limit ? parseInt(limit) : 100
      });
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/audit-logs/export", authMiddleware, rootAdminMiddleware, async (req, res) => {
    try {
      const exportLimits = PLAN_LIMITS[req.user.plan] || PLAN_LIMITS["free"];
      if (!exportLimits.canExportAudit) {
        return res.status(403).json({
          error: "PLAN_LIMIT",
          message: "Audit log export is available on Scale plan and above.",
          currentPlan: req.user.plan || "free",
        });
      }

      const logs = await storage.getAuditLogs({ limit: 10000 });

      const headers = '"Timestamp","User ID","Username","Action","Target Type","Target ID","Details"\n';
      const rows = logs.map(log => {
        const details = log.details ? JSON.stringify(log.details).replace(/"/g, '""') : "";
        return `"${log.createdAt || ""}","${log.userId || ""}","${log.username || ""}","${log.action || ""}","${log.targetType || ""}","${log.targetId || ""}","${details}"`;
      }).join("\n");

      const date = new Date().toISOString().split("T")[0];
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=audit-logs-${date}.csv`);
      res.send(headers + rows);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/team-usage", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const children = await storage.getChildUsers(req.user.id);

      const teamUsage = children.map(child => ({
        id: child.id,
        username: child.username,
        email: child.email,
        role: child.role,
        creditsReceived: child.creditsReceived,
        creditsUsed: child.creditsUsed,
        creditsRemaining: child.creditsRemaining,
        isActive: child.isActive,
      }));

      res.json({
        totalMembers: children.length,
        activeMembers: children.filter(c => c.isActive).length,
        totalCreditsDistributed: children.reduce((sum, c) => sum + (c.creditsReceived || 0), 0),
        totalCreditsUsed: children.reduce((sum, c) => sum + (c.creditsUsed || 0), 0),
        members: teamUsage,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // ─── INVITE ROUTES ────────────────────────────────────────────────────────────

  // POST /api/users/invite — create and email an invite link
  app.post("/api/users/invite", authMiddleware, adminMiddleware, inviteLimiter, async (req, res) => {
    try {
      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({ message: "email and role are required" });
      }

      const validRoles = (req.user.role === "ROOT_ADMIN" || req.user.isSecondaryRoot) ? ["SUB_ADMIN", "USER"] : ["USER"];
      if (!validRoles.includes(role)) {
        return res.status(403).json({ message: `You can only invite: ${validRoles.join(", ")}` });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email address" });
      }

      // Enforce team member limit
      const limit = MAX_TEAM_MEMBERS[req.user.plan] ?? 0;
      if (limit !== Infinity) {
        const activeCount = await storage.getChildUserCount(req.user.id);
        if (activeCount >= limit) {
          return res.status(403).json({
            error: "PLAN_LIMIT",
            message: `Your plan allows up to ${limit} team member${limit === 1 ? "" : "s"}. Upgrade to add more.`,
            limit,
            current: activeCount,
          });
        }
      }

      // Block if email already registered
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "A user with that email already exists" });
      }

      // Block duplicate pending invite
      const allInvites = await storage.getPendingInvitesByAdmin(req.user.id);
      const now = new Date();
      const duplicatePending = allInvites.find(
        inv => inv.email === email && !inv.acceptedAt && new Date(inv.expiresAt) > now
      );
      if (duplicatePending) {
        return res.status(409).json({ message: "A pending invite for that email already exists" });
      }

      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invite = await storage.createInvite({
        email,
        role,
        invitedBy: req.user.id,
        tokenHash,
        expiresAt,
      });

      const base = process.env.APP_URL || "http://localhost:5000";
      const acceptUrl = `${base}/accept-invite?token=${rawToken}`;

      await sendTransactionalEmail(
        email,
        `You've been invited to join RepMail`,
        `Hi,\n\n${req.user.username} has invited you to join their team on RepMail as a ${role === "SUB_ADMIN" ? "Sub-Admin" : "team member"}.\n\nAccept your invitation here:\n${acceptUrl}\n\nThis link expires in 7 days.\n\nIf you weren't expecting this invite, you can safely ignore it.\n\n— The RepMail Team`
      );

      await storage.createAuditLog({
        userId: req.user.id,
        action: AUDIT_ACTIONS.INVITE_SENT,
        details: { inviteId: invite.id, email, role },
      });

      res.status(201).json({ id: invite.id, email, role, expiresAt });
    } catch (error) {
      console.error("[INVITE] create error:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/invites/validate?token=... — public, validate token before showing accept form
  app.get("/api/invites/validate", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) return res.status(400).json({ message: "token is required" });

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const invite = await storage.getInviteByTokenHash(tokenHash);

      if (!invite) return res.status(404).json({ message: "Invite not found" });
      if (invite.acceptedAt) return res.status(410).json({ message: "This invite has already been used" });
      if (new Date(invite.expiresAt) < new Date()) return res.status(410).json({ message: "This invite has expired" });

      const admin = await storage.getUserById(invite.invitedBy);

      res.json({
        email: invite.email,
        role: invite.role,
        invitedBy: admin?.username || "your admin",
        expiresAt: invite.expiresAt,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/invites/accept — public, create account and accept invite
  app.post("/api/invites/accept", acceptLimiter, async (req, res) => {
    try {
      const { token, username, password } = req.body;

      if (!token || !username || !password) {
        return res.status(400).json({ message: "token, username, and password are required" });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const invite = await storage.getInviteByTokenHash(tokenHash);

      if (!invite) return res.status(404).json({ message: "Invite not found" });
      if (invite.acceptedAt) return res.status(410).json({ message: "This invite has already been used" });
      if (new Date(invite.expiresAt) < new Date()) return res.status(410).json({ message: "This invite link has expired. Ask your admin to resend it." });

      const takenUsername = await storage.getUserByUsername(username);
      if (takenUsername) return res.status(409).json({ message: "Username is already taken" });

      const takenEmail = await storage.getUserByEmail(invite.email);
      if (takenEmail) return res.status(409).json({ message: "A user with that email already exists" });

      // Enforce inviter's team member limit at accept time — prevents over-provisioning
      // if the admin's plan was downgraded after the invite was sent.
      const inviter = await storage.getUserById(invite.invitedBy);
      if (inviter) {
        const limit = MAX_TEAM_MEMBERS[inviter.plan] ?? 0;
        if (limit !== Infinity) {
          const activeCount = await storage.getChildUserCount(inviter.id);
          if (activeCount >= limit) {
            return res.status(403).json({
              error: "PLAN_LIMIT",
              message: `The admin's plan limit has been reached. Ask your admin to upgrade before accepting this invite.`,
            });
          }
        }
      }

      const newUser = await storage.createUser({
        username,
        email: invite.email,
        password,
        role: invite.role,
        parentId: invite.invitedBy,
        mustResetPassword: false,
      });

      await storage.markInviteAccepted(invite.id);

      const session = await storage.createSession(newUser.id);
      res.cookie("token", session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.status(201).json({ user: newUser });
    } catch (error) {
      console.error("[INVITE] accept error:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/invites — list all invites sent by the calling admin
  app.get("/api/invites", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const invites = await storage.getPendingInvitesByAdmin(req.user.id);
      const now = new Date();

      const result = invites.map(inv => {
        let status;
        if (inv.acceptedAt) status = "accepted";
        else if (new Date(inv.expiresAt) < now) status = "expired";
        else status = "pending";

        return {
          id: inv.id,
          email: inv.email,
          role: inv.role,
          status,
          expiresAt: inv.expiresAt,
          acceptedAt: inv.acceptedAt,
          createdAt: inv.createdAt,
        };
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/invites/:id/resend — regenerate token and resend invite email
  app.post("/api/invites/:id/resend", authMiddleware, adminMiddleware, inviteLimiter, async (req, res) => {
    try {
      const invite = await storage.getInviteById(req.params.id);

      if (!invite) return res.status(404).json({ message: "Invite not found" });
      if (invite.invitedBy !== req.user.id) return res.status(403).json({ message: "Forbidden" });
      if (invite.acceptedAt) return res.status(409).json({ message: "This invite has already been accepted" });

      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await storage.updateInviteToken(invite.id, tokenHash, expiresAt);

      const base = process.env.APP_URL || "http://localhost:5000";
      const acceptUrl = `${base}/accept-invite?token=${rawToken}`;

      await sendTransactionalEmail(
        invite.email,
        `Your RepMail invite has been resent`,
        `Hi,\n\n${req.user.username} has resent your invitation to join their team on RepMail as a ${invite.role === "SUB_ADMIN" ? "Sub-Admin" : "team member"}.\n\nAccept your invitation here:\n${acceptUrl}\n\nThis link expires in 7 days.\n\nIf you weren't expecting this invite, you can safely ignore it.\n\n— The RepMail Team`
      );

      res.status(204).end();
    } catch (error) {
      console.error("[INVITE] resend error:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  // ─── AI ROUTES ────────────────────────────────────────────────────────────────

  app.post("/api/ai/preview", authMiddleware, aiLimiter, async (req, res) => {
    try {
      const { subject, body, contacts, tone, campaignType } = req.body;

      const quota = await storage.checkAndIncrementAiQuota(req.user.id);
      if (!quota.allowed) {
        return res.status(429).json({
          error: "Daily AI generation limit reached.",
          resetsAt: quota.resetsAt,
          upgradeMessage: "Upgrade your plan for more AI generations per day."
        });
      }
      res.set("X-AI-Generations-Remaining", quota.remaining === Infinity ? "unlimited" : String(quota.remaining));
      res.set("X-AI-Generations-Reset", quota.resetsAt ? quota.resetsAt.toISOString() : "");

      await storage.createAuditLog({
        userId: req.user.id,
        action: AUDIT_ACTIONS.AI_PREVIEW_GENERATED,
        details: { contactCount: contacts?.length || 0, tone: tone || "professional", campaignType: campaignType || "general" }
      });

      // Try OpenAI (gpt-4o-mini) — falls back to local placeholder replacement on failure
      try {
        const previews = await generatePreviews(subject, body, contacts || [], tone || "professional", { userId: req.user.id, campaignType: campaignType || "general" });
        return res.json({ previews, aiPowered: true });
      } catch (aiErr) {
        storage.refundAiQuota(req.user.id).catch(e => console.error("[AI] Quota refund failed:", e.message));
        console.log("[AI] Preview falling back to placeholder replacement:", aiErr.message);
      }

      // Fallback: plain placeholder replacement
      const previews = (contacts || []).map(contact => {
        const data = {
          name: contact.name || "Valued Customer",
          email: contact.email || "customer@example.com",
          company: contact.company || "Your Company",
          category: contact.category || "General"
        };
        const replacePlaceholders = (text) =>
          text.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
        return {
          contact: data,
          subject: replacePlaceholders(subject),
          body: replacePlaceholders(body)
        };
      });

      res.json({ previews, aiPowered: false });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ai/spam-analysis", authMiddleware, aiLimiter, async (req, res) => {
    try {
      const { subject, body, acceptedSuggestions } = req.body;
      const acceptedSet = new Set(
        Array.isArray(acceptedSuggestions) ? acceptedSuggestions.map(s => String(s).toLowerCase()) : []
      );

      // Cache-first: serve repeated navigations without touching quota or audit log.
      // peekSpamCache is synchronous and matches the same SHA-256 key used by analyzeSpam.
      const cached = peekSpamCache(subject, body);
      if (cached) {
        const filtered = acceptedSet.size > 0
          ? { ...cached, suggestions: (cached.suggestions || []).filter(s => !acceptedSet.has((s.original || "").toLowerCase())) }
          : cached;
        return res.json({ ...filtered, aiPowered: true, fromCache: true });
      }

      // Cache miss — normal quota-gated flow.
      const quota = await storage.checkAndIncrementAiQuota(req.user.id);
      if (!quota.allowed) {
        return res.status(429).json({
          error: "Daily AI generation limit reached.",
          resetsAt: quota.resetsAt,
          upgradeMessage: "Upgrade your plan for more AI generations per day."
        });
      }
      res.set("X-AI-Generations-Remaining", quota.remaining === Infinity ? "unlimited" : String(quota.remaining));
      res.set("X-AI-Generations-Reset", quota.resetsAt ? quota.resetsAt.toISOString() : "");

      await storage.createAuditLog({
        userId: req.user.id,
        action: AUDIT_ACTIONS.SPAM_ANALYSIS_RUN,
        details: { subjectLength: subject?.length, bodyLength: body?.length }
      });

      // Try OpenAI (gpt-4o-mini) — falls back to keyword matching on failure
      try {
        const result = await analyzeSpam(subject, body, { userId: req.user.id, acceptedSuggestions: Array.isArray(acceptedSuggestions) ? acceptedSuggestions : [] });
        return res.json({ ...result, aiPowered: true });
      } catch (aiErr) {
        storage.refundAiQuota(req.user.id).catch(e => console.error("[AI] Quota refund failed:", e.message));
        console.log("[AI] Spam analysis falling back to keyword matching:", aiErr.message);
      }

      // Fallback: keyword-based scoring
      const spamWords = [
        "free", "winner", "click here", "buy now", "limited time",
        "act now", "urgent", "congratulations", "guarantee", "no obligation",
        "risk free", "special offer", "exclusive deal", "you won", "cash"
      ];
      const text = (subject + " " + body).toLowerCase();
      let score = 0;
      const riskyWords = [];
      spamWords.forEach(word => {
        if (text.includes(word)) { score += 5; riskyWords.push(word); }
      });
      if (subject === subject.toUpperCase() && subject.length > 5) score += 15;
      const exclamationCount = (text.match(/!/g) || []).length;
      score += exclamationCount * 2;
      const alternatives = {
        "free": "complimentary", "winner": "selected participant",
        "click here": "learn more", "buy now": "explore options",
        "limited time": "time-sensitive", "act now": "consider this opportunity",
        "urgent": "important", "congratulations": "we're pleased to inform you",
        "guarantee": "assurance", "no obligation": "no commitment required"
      };
      const suggestions = riskyWords.map(word => ({
        original: word, suggestion: alternatives[word] || word
      }));
      res.json({ score: Math.min(score, 100), riskyWords, suggestions, aiPowered: false });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ai/generate-template", authMiddleware, aiLimiter, async (req, res) => {
    try {
      const { intake, tone, campaignType } = req.body;
      if (!intake?.recipientDescription?.trim() || !intake?.valueProposition?.trim() || !intake?.objectiveType) {
        return res.status(400).json({ message: "Recipient description, value proposition, and objective are required" });
      }
      if ((campaignType || "general") === "follow_up" && !intake?.previousContext?.trim()) {
        return res.status(400).json({ message: "Prior interaction context is required for follow-up campaigns" });
      }

      // Sender profile gate — name and company are required for credible AI output.
      // Title is optional. Checked before quota increment so no refund is needed.
      if (!req.user.senderName || !req.user.senderCompany) {
        return res.status(400).json({
          message: "Complete your sender profile before generating AI templates. Add your name and company in Profile settings.",
          code: "SENDER_PROFILE_REQUIRED",
        });
      }

      const effectivePlan = await storage.getEffectivePlan(req.user.id);
      const quota = await storage.checkAndIncrementAiQuota(req.user.id);
      if (!quota.allowed) {
        return res.status(429).json({
          error: "Daily AI generation limit reached.",
          resetsAt: quota.resetsAt,
          upgradeMessage: "Upgrade your plan for more AI generations per day."
        });
      }
      res.set("X-AI-Generations-Remaining", quota.remaining === Infinity ? "unlimited" : String(quota.remaining));
      res.set("X-AI-Generations-Reset", quota.resetsAt ? quota.resetsAt.toISOString() : "");

      // Build sender context from user's profile — enriches the AI prompt so the
      // model writes from a real person's perspective and produces a proper sign-off.
      const senderContext = {
        name:    req.user.senderName    || null,
        title:   req.user.senderTitle   || null,
        company: req.user.senderCompany || null,
      };

      const template = await generateTemplate(intake, tone || "professional", {
        userId: req.user.id,
        effectivePlan,
        campaignType: campaignType || "general",
        senderContext,
      });

      const validation = validateTemplate(template.subject, template.body, {
        campaignType: campaignType || "general",
        intake,
        model:  template._model,
        userId: req.user.id,
      });

      if (validation.hardBlocked) {
        storage.refundAiQuota(req.user.id).catch(e => console.error("[AI] Quota refund failed:", e.message));
        return res.status(422).json({
          message:    "Template generation produced an unusable output. Please try again.",
          validation,
        });
      }

      const senderWarnings = validateSenderProfile(senderContext);

      res.json({
        subject:        validation.subject,
        body:           validation.body,
        warnings:       validation.warnings,
        senderWarnings,
      });
    } catch (error) {
      storage.refundAiQuota(req.user.id).catch(e => console.error("[AI] Quota refund failed:", e.message));
      console.error("[AI] generate-template error:", error.message);
      res.status(500).json({ message: "Template generation failed. Please write your template manually." });
    }
  });

  app.get("/api/pricing/plans", async (req, res) => {
    try {
      const exchangeRate = DEFAULT_EXCHANGE_RATE;
      const plans = Object.values(PRICING_PLANS)
        .filter(plan => plan.id !== "trial")
        .map(plan => getPlanWithPrices(plan, exchangeRate));
      res.json({
        plans,
        exchangeRate,
        currencies: SUPPORTED_CURRENCIES,
        creditTiers: CREDIT_TIERS,
        teamPricing: TEAM_PRICING,
        freeTrialCredits: FREE_TRIAL_CREDITS,
        creditValidityMonths: CREDIT_VALIDITY_MONTHS,
        minCreditPurchase: MIN_CREDIT_PURCHASE,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/credits/info", authMiddleware, async (req, res) => {
    try {
      const info = await storage.getTotalCreditsAvailable(req.user.id);
      res.json(info);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payments/initiate", authMiddleware, async (req, res) => {
    try {
      const { planId, paymentMethod, currency = "USD" } = req.body;
      
      const plan = PRICING_PLANS[planId];
      if (!plan) {
        return res.status(400).json({ message: "Invalid plan selected" });
      }

      // Handle Trial plan - one-time credit grant (atomic, cannot be repeated)
      if (plan.isTrial) {
        const claimed = await storage.claimTrialCredits(req.user.id, plan.credits);
        if (!claimed) {
          return res.status(409).json({ message: "Free trial credits have already been claimed." });
        }

        const payment = await storage.createPayment({
          userId: req.user.id,
          planName: plan.name,
          credits: plan.credits,
          amountUsd: 0,
          amountInr: 0,
          amountLocal: 0,
          currency: "INR",
          exchangeRate: "1",
          paymentMethod: "FREE",
          status: "COMPLETED"
        });

        await storage.createAuditLog({
          userId: req.user.id,
          action: AUDIT_ACTIONS.PAYMENT_SUCCESS,
          details: { amount: plan.credits, paymentId: payment.id, planName: plan.name }
        });

        res.json({
          payment,
          redirectUrl: `/app/payments`,
          currency: "INR"
        });
        return;
      }

      if (!SUPPORTED_CURRENCIES[currency]) {
        return res.status(400).json({ message: "Unsupported currency" });
      }

      const exchangeRate = DEFAULT_EXCHANGE_RATE;
      const planWithPrices = getPlanWithPrices(plan, exchangeRate);

      const amountUsd = Math.round(planWithPrices.priceUsd);
      const amountInr = Math.round(planWithPrices.priceInr);
      const amountLocal = Math.round(currency === "INR" ? amountInr : amountUsd);

      // Dev mode: simulate payment success immediately (no real gateway needed)
      if (process.env.NODE_ENV !== "production") {
        const payment = await storage.createPayment({
          userId: req.user.id,
          planName: plan.name,
          credits: plan.credits,
          amountUsd,
          amountInr,
          amountLocal,
          currency,
          exchangeRate: exchangeRate.toString(),
          paymentMethod: "SIMULATED",
          status: "COMPLETED"
        });
        await storage.addCredits(req.user.id, plan.credits, AUDIT_ACTIONS.PAYMENT_SUCCESS, {
          paymentId: payment.id,
          planName: plan.name
        });
        res.json({ payment, redirectUrl: `/app/payments` });
        return;
      }

      // Production: route to the appropriate payment gateway by currency
      if (currency === "INR") {
        if (!rzp) return res.status(503).json({ message: "INR payments not configured. Contact support." });

        const rzpOrder = await rzp.orders.create({
          amount: amountInr * 100, // Razorpay uses paise (1 INR = 100 paise)
          currency: "INR",
          receipt: crypto.randomUUID(),
        });

        const payment = await storage.createPayment({
          userId: req.user.id,
          planName: plan.name,
          credits: plan.credits,
          amountUsd,
          amountInr,
          amountLocal,
          currency: "INR",
          exchangeRate: exchangeRate.toString(),
          paymentMethod: "RAZORPAY",
          status: PAYMENT_STATUS.PENDING,
          // Store both IDs so ProcessPayment can reopen the modal without a server round-trip
          metadata: { razorpay_order_id: rzpOrder.id, razorpay_key_id: RAZORPAY_KEY_ID },
        });

        return res.json({
          payment,
          gateway: "razorpay",
          razorpayOrderId: rzpOrder.id,
          razorpayKeyId: RAZORPAY_KEY_ID,
          amount: amountInr * 100,
          currency: "INR",
          redirectUrl: `/app/payments/process/${payment.id}`,
        });
      }

      // Only Razorpay is supported. USD/Stripe is not configured.
      return res.status(503).json({ message: "Only INR payments are supported. Please select INR currency." });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Razorpay: verify payment signature after frontend checkout ────────────
  app.post("/api/payments/razorpay/verify", authMiddleware, async (req, res) => {
    try {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature, repmail_payment_id } = req.body;

      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !repmail_payment_id) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      if (!rzp || !RAZORPAY_KEY_SECRET) {
        return res.status(503).json({ message: "Razorpay not configured" });
      }
      // Signature must be exactly 64 hex chars (SHA-256 = 32 bytes)
      if (!/^[0-9a-f]{64}$/.test(razorpay_signature)) {
        return res.status(400).json({ message: "Invalid signature format" });
      }

      // Verify: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
      const expected = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      const valid = crypto.timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(razorpay_signature, "hex")
      );
      if (!valid) return res.status(400).json({ message: "Payment signature verification failed" });

      const existing = await storage.getPayment(repmail_payment_id);
      if (!existing) return res.status(404).json({ message: "Payment not found" });
      if (existing.userId !== req.user.id) return res.status(403).json({ message: "Forbidden" });

      // Idempotency guard
      if (existing.status === PAYMENT_STATUS.SUCCESS) {
        return res.json({ payment: existing, message: "Already completed" });
      }

      const payment = await storage.completePayment(repmail_payment_id, razorpay_payment_id);
      const user = await upgradePlanIfHigher(payment.userId, payment.planName, payment.id);
      console.log(`[RAZORPAY] Payment ${repmail_payment_id} verified — ${payment.credits} credits → user ${payment.userId}`);

      res.json({ payment, user: storage.sanitizeUser(user) });
    } catch (error) {
      console.error("[RAZORPAY] Verify error:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  // ── Dev-only: manually complete a pending payment (locked in production) ──
  app.post("/api/payments/:id/complete", authMiddleware, async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "This endpoint is disabled in production. Payments complete via Razorpay webhook." });
    }
    try {
      const { id } = req.params;
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      const payment = await storage.completePayment(id, transactionId);
      const user = await upgradePlanIfHigher(payment.userId, payment.planName, payment.id);

      res.json({ payment, user: storage.sanitizeUser(user) });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/payments/:id/fail", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      await storage.failPayment(id, reason || "Payment failed");
      res.json({ message: "Payment marked as failed" });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/payments", authMiddleware, async (req, res) => {
    try {
      const payments = await storage.getUserPayments(req.user.id);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/contact", async (req, res) => {
    try {
      const parsed = contactSubmissionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      
      const submission = await storage.createContactSubmission(parsed.data);
      res.status(201).json({ message: "Thank you for contacting us! We'll respond within 24 hours.", submission });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== WAITLIST ====================
  app.post("/api/waitlist", async (req, res) => {
    try {
      const parsed = waitlistSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const entry = await storage.addToWaitlist(parsed.data);
      res.status(201).json({ 
        message: "You're on the list. We'll be in touch.",
        id: entry.id 
      });
    } catch (error) {
      if (error.message === "DUPLICATE_EMAIL") {
        return res.status(409).json({ message: "This email is already on the waitlist." });
      }
      console.error("Waitlist error:", error);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.get("/api/admin/contact-submissions", authMiddleware, rootAdminMiddleware, async (req, res) => {
    try {
      const submissions = await storage.getContactSubmissions({ limit: 100 });
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Admin: force-cancel a stuck campaign ─────────────────────────────────────
  app.post("/api/admin/campaigns/:id/cancel", authMiddleware, rootAdminMiddleware, async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      if (["COMPLETED", "FAILED", "DRAFT"].includes(campaign.status)) {
        return res.status(400).json({ message: `Campaign is already ${campaign.status} — nothing to cancel` });
      }

      await storage.updateCampaign(campaign.id, { status: "FAILED" });

      // Remove BullMQ job — best-effort; job may already be gone
      try {
        const queue = getCampaignQueue();
        if (queue) {
          const job = await queue.getJob(campaign.id);
          if (job) await job.remove();
        }
      } catch (queueErr) {
        console.warn(`[ADMIN] Cancel: queue job removal failed for ${campaign.id}:`, queueErr.message);
      }

      await storage.createAuditLog({
        userId: req.user.id,
        action: AUDIT_ACTIONS.CAMPAIGN_FAILED,
        targetType: "campaign",
        targetId: campaign.id,
        details: { reason: "force_cancelled_by_admin", cancelledBy: req.user.username, previousStatus: campaign.status },
      });

      res.json({ message: "Campaign cancelled", campaignId: campaign.id });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // ── Admin: BullMQ queue depth + last 10 failed jobs ──────────────────────────
  app.get("/api/admin/queue/status", authMiddleware, rootAdminMiddleware, async (req, res) => {
    try {
      const queue = getCampaignQueue();
      if (!queue) {
        return res.json({ available: false, reason: "Redis not configured — BullMQ disabled" });
      }
      const counts = await queue.getJobCounts("active", "waiting", "delayed", "failed", "completed");
      const failedJobs = await queue.getFailed(0, 9);
      res.json({
        available: true,
        counts,
        failedJobs: failedJobs.map(j => ({
          jobId: j.id,
          campaignId: j.data?.campaignId,
          userId: j.data?.userId,
          failedReason: j.failedReason,
          attemptsMade: j.attemptsMade,
          timestamp: j.timestamp,
        })),
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/delivery-health", authMiddleware, rootAdminMiddleware, async (req, res) => {
    try {
      const stats = await storage.getDeliveryHealthStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Platform send pause / resume ──────────────────────────────────────────
  app.post("/api/admin/platform/pause-sending", authMiddleware, rootAdminMiddleware, async (req, res) => {
    try {
      await storage.setPlatformSetting("send_pause_enabled", "true", req.user.id);
      await storage.createAuditLog({
        userId: req.user.id,
        action: "PLATFORM_SEND_PAUSED",
        targetType: "platform",
        targetId: "global",
        details: { reason: req.body.reason || "manual_admin_pause" },
      });
      res.json({ message: "Platform sending paused", pausedBy: req.user.id });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/platform/resume-sending", authMiddleware, rootAdminMiddleware, async (req, res) => {
    try {
      await storage.setPlatformSetting("send_pause_enabled", "false", req.user.id);

      // Re-queue all campaigns that were paused by the global pause.
      // addCampaignJob uses jobId=campaignId for deduplication — safe to call even if a job
      // already exists for a campaign (no-op in that case, no duplicate jobs created).
      const pausedCampaigns = await storage.getCampaignsByStatus("PAUSED");
      let requeuedCount = 0;
      for (const campaign of pausedCampaigns) {
        try {
          await addCampaignJob(campaign.id, campaign.userId);
          requeuedCount++;
        } catch (qErr) {
          console.warn(`[ADMIN] Failed to re-queue paused campaign ${campaign.id}:`, qErr.message);
        }
      }

      await storage.createAuditLog({
        userId: req.user.id,
        action: "PLATFORM_SEND_RESUMED",
        targetType: "platform",
        targetId: "global",
        details: { requeuedCampaigns: requeuedCount },
      });

      res.json({ message: "Platform sending resumed", resumedBy: req.user.id, requeuedCampaigns: requeuedCount });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Per-user sender resume ─────────────────────────────────────────────────
  app.post("/api/admin/users/:id/resume-sending", authMiddleware, rootAdminMiddleware, async (req, res) => {
    try {
      await storage.updateUser(req.params.id, {
        sendPaused: false,
        sendPausedReason: null,
        sendPausedAt: null,
      });
      await storage.createAuditLog({
        userId: req.user.id,
        action: "USER_SEND_RESUMED",
        targetType: "user",
        targetId: req.params.id,
        details: { resumedBy: req.user.id },
      });
      res.json({ message: "User sending resumed" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/parse-excel", authMiddleware, async (req, res) => {
    try {
      const { fileData, fileName } = req.body;

      if (!fileData) {
        return res.status(400).json({ message: "No file data provided" });
      }

      let buffer;
      try {
        buffer = Buffer.from(fileData, "base64");
      } catch {
        return res.status(400).json({ message: "Invalid file data encoding" });
      }

      if (buffer.length === 0) {
        return res.status(400).json({ message: "File is empty" });
      }

      if (buffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({ message: "File exceeds the 10 MB limit" });
      }

      // Save original file to S3 (best-effort — don't fail if S3 is misconfigured)
      let s3Key = null;
      try {
        const ext = (fileName || "upload").split(".").pop();
        const mime = ext === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        s3Key = await uploadFile(buffer, fileName || "upload", mime);
      } catch (s3Err) {
        console.warn("[S3] Upload skipped:", s3Err.message);
      }

      // Strip UTF-8 BOM (0xEF 0xBB 0xBF) before parsing — common in CSV exports from Excel
      const parseBuffer = buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF
        ? buffer.slice(3)
        : buffer;

      let workbook;
      try {
        workbook = XLSX.read(parseBuffer, { type: "buffer" });
      } catch {
        return res.status(400).json({ message: "Failed to parse file. Ensure it is a valid Excel or CSV file." });
      }

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (!jsonData.length || !jsonData[0]?.length) {
        return res.status(400).json({ message: "File is empty or has no headers" });
      }

      const rawHeaders = jsonData[0];
      if (rawHeaders.length > 20) {
        return res.status(400).json({ message: "File has too many columns (maximum 20)" });
      }

      const headers = rawHeaders.map(h => String(h || "").trim());
      const emailColPresent = headers.includes("email");
      let malformedCount = 0;

      const rows = jsonData.slice(1)
        .map(row => {
          const obj = {};
          headers.forEach((header, i) => {
            obj[header] = row[i] !== undefined ? String(row[i]) : "";
          });
          return obj;
        })
        .filter(row => {
          if (!Object.values(row).some(v => v)) return false;
          if (emailColPresent && !row["email"]) malformedCount++;
          return true;
        });

      res.json({ headers, rows, fileName, s3Key, malformedCount });
    } catch (error) {
      console.error("Excel parse error:", error);
      res.status(400).json({ message: "Failed to parse file. Please check the format." });
    }
  });

  return httpServer;
}
