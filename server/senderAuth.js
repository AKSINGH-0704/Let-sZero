/**
 * Sender Authorization Service (SAS)
 * =====================================
 * Single authority for user-initiated campaign sends. Every code path that transitions
 * a campaign to RUNNING must call assertCanSend before doing so.
 *
 * Scope: user-initiated campaign sends only. Platform-internal emails
 * (sendTransactionalEmail, sendPaymentReceiptEmail) are NOT governed by the SAS.
 *
 * See ADR-008 for the full three-dimension trust model and authorization boundary doctrine.
 */

import { storage } from "./storage.js";
import { AUDIT_ACTIONS, USER_ROLES } from "../shared/schema.js";

// ── Execution modes ───────────────────────────────────────────────────────────
export const SEND_MODES = {
  IMMEDIATE:      "immediate",       // POST /api/campaigns — send now
  SCHEDULED:      "scheduled",       // POST /api/campaigns — create future campaign (identity-only check)
  SCHEDULED_FIRE: "scheduled_fire",  // Scheduler fires a PENDING campaign
  RETRY:          "retry",           // BullMQ retry of a failed job; skip policy (credits/warm-up consumed)
  INLINE:         "inline",          // Redis unavailable — inline execution fallback
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Assert that an outbound campaign send is authorized. Throws on denial.
 * Every campaign execution path must call this before transitioning to RUNNING.
 *
 * @param {{ user: object, mode: string, campaignId?: string, senderDomainId?: string|null, contactCount?: number }} ctx
 */
export async function assertCanSend(ctx) {
  const result = await canSend(ctx);
  if (!result.allowed) {
    await _logDenial(ctx, result).catch(() => {});
    const err = new Error(result.userMessage);
    err.code = result.code;
    err.dimension = result.dimension;
    err.remediationAction = result.remediationAction;
    throw err;
  }
}

/**
 * Check send authorization without throwing.
 * Returns a structured AuthResult — use this when you need the result for UI display.
 *
 * @param {{ user: object, mode: string, campaignId?: string, senderDomainId?: string|null, contactCount?: number }} ctx
 * @returns {Promise<object>} AuthResult
 */
export async function canSend(ctx) {
  const { user, mode } = ctx;
  if (!user) return _deny("IDENTITY", "NO_USER", "Authorization context missing user.", "assertCanSend called without user", "CONTACT_SUPPORT");

  // ROOT_ADMIN and secondary roots bypass trust checks — they operate the platform.
  if (user.role === USER_ROLES.ROOT_ADMIN || user.isSecondaryRoot) {
    return { allowed: true };
  }

  // Dimension 1 — Identity
  const identity = await _checkIdentity(ctx);
  if (!identity.allowed) return identity;

  // For scheduled campaigns at creation time, only identity is verified.
  // Reputation and policy are re-checked at scheduled_fire time when the campaign actually runs.
  if (mode === SEND_MODES.SCHEDULED) return { allowed: true };

  // Dimension 2 — Reputation
  const reputation = _checkReputation(ctx);
  if (!reputation.allowed) return reputation;

  // Dimension 3 — Policy (skipped on retry: credits and warm-up budget were consumed in prior attempt)
  if (mode !== SEND_MODES.RETRY) {
    const policy = await _checkPolicy(ctx);
    if (!policy.allowed) return policy;
  }

  return { allowed: true };
}

/**
 * Draft authorization — identity check only; no reputation or policy.
 * Call before allowing a user to save or edit a campaign draft.
 *
 * @param {object} user
 * @returns {Promise<object>} AuthResult
 */
export async function canDraft(user) {
  if (!user) return _deny("IDENTITY", "NO_USER", "Authorization context missing user.", "canDraft called without user", "CONTACT_SUPPORT");
  if (!user.isActive) return _deny("IDENTITY", "ACCOUNT_INACTIVE", "Your account has been deactivated. Contact support.", "isActive=false", "CONTACT_SUPPORT");
  return { allowed: true };
}

/**
 * Atomically claim a warm-up send slot for one outbound email.
 * Call this BEFORE each email dispatch in the campaign loop.
 * Returns true if the slot was claimed (send may proceed), false if the daily limit is reached.
 * Skips the check entirely if the user is past their warm-up period.
 *
 * @param {object} user — owner row as loaded at campaign start
 * @returns {Promise<boolean>}
 */
export async function claimWarmupSlot(user) {
  const settings = await _getWarmupSettings();
  if (!_warmupIsActive(user, settings.duration_days)) return true; // warm-up over — unlimited
  const dailyLimit = _getEffectiveDailyLimit(user, settings);
  const newCount = await storage.atomicIncrementWarmupCount(user.id, dailyLimit);
  return newCount !== null; // null = WHERE guard failed = daily limit already reached
}

/**
 * Record the timestamp of the first ever dispatched email for a user.
 * Idempotent — only sets firstSendAt if it is currently null.
 * Call in campaignLoop.js after the first successful email dispatch.
 *
 * @param {string} userId
 */
export async function recordFirstSend(userId) {
  try {
    await storage.setFirstSendAt(userId);
    await storage.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.FIRST_SEND_RECORDED,
    });
  } catch {
    // Non-fatal — warm-up anchor is best-effort; a missed firstSendAt only delays warm-up end.
  }
}

/**
 * Returns a structured sender health report for GET /api/sender-health.
 * Does not make an authorization decision — use canSend for that.
 *
 * @param {object} user
 * @returns {Promise<object>}
 */
export async function getSenderHealthReport(user) {
  const [identityResult, settings] = await Promise.all([
    _checkIdentity({ user, mode: SEND_MODES.IMMEDIATE, senderDomainId: null }),
    _getWarmupSettings(),
  ]);
  const reputationResult = _checkReputation({ user });

  let warmupInfo = null;
  let policyResult = { allowed: true };

  if (_warmupIsActive(user, settings.duration_days)) {
    const dailyLimit = _getEffectiveDailyLimit(user, settings);
    const sentToday  = _getSentTodayAdjusted(user);
    warmupInfo = {
      active: true,
      daysRemaining: _warmupDaysRemaining(user, settings.duration_days),
      dailyLimit,
      sentToday,
      remainingToday: Math.max(0, dailyLimit - sentToday),
    };
    if (sentToday >= dailyLimit) {
      policyResult = _deny("POLICY", "WARMUP_DAILY_LIMIT_REACHED",
        `Daily warm-up limit of ${dailyLimit} emails reached. Resets in the next 24-hour window.`,
        `warmupEmailsSentToday=${sentToday} >= dailyLimit=${dailyLimit}`,
        "WAIT"
      );
    }
  }

  return {
    identity: {
      ok: identityResult.allowed,
      code: identityResult.code ?? null,
      message: identityResult.userMessage ?? null,
      emailVerified: user.emailVerified ?? false,
      sendingIdentityType: user.sendingIdentityType ?? null,
      senderName: user.senderName?.trim() || null,
    },
    reputation: {
      ok: reputationResult.allowed,
      code: reputationResult.code ?? null,
      message: reputationResult.userMessage ?? null,
      sendPaused: user.sendPaused ?? false,
      sendPausedReason: user.sendPausedReason ?? null,
      isDormant: user.isDormant ?? false,
    },
    policy: {
      ok: policyResult.allowed,
      code: policyResult.code ?? null,
      warmup: warmupInfo,
    },
    readiness: (identityResult.allowed && reputationResult.allowed && policyResult.allowed) ? "ready" : "blocked",
  };
}

// ── Dimension checks (private) ────────────────────────────────────────────────

async function _checkIdentity({ user, senderDomainId }) {
  if (!user.isActive) {
    return _deny("IDENTITY", "ACCOUNT_INACTIVE",
      "Your account has been deactivated. Contact support.",
      "isActive=false", "CONTACT_SUPPORT");
  }

  if (!user.emailVerified) {
    return _deny("IDENTITY", "EMAIL_NOT_VERIFIED",
      "Verify your email address to enable sending.",
      "emailVerified=false", "VERIFY_EMAIL");
  }

  if (!user.sendingIdentityType || user.sendingIdentityType !== "custom_domain") {
    return _deny("IDENTITY", "SENDING_IDENTITY_NOT_SET",
      "Verify a custom domain in Settings → Domains before sending campaigns.",
      `sendingIdentityType=${user.sendingIdentityType ?? "null"} — custom_domain required`, "SETUP_IDENTITY");
  }

  if (!user.senderName?.trim()) {
    return _deny("IDENTITY", "SENDER_NAME_MISSING",
      "Add your sender name in Profile settings before sending.",
      "senderName empty or null", "SETUP_IDENTITY");
  }

  // All users must select a verified custom domain — no platform fallback.
  if (!senderDomainId) {
    return _deny("IDENTITY", "SENDER_DOMAIN_REQUIRED",
      "Select a verified sending domain for this campaign. Add and verify a domain in Settings → Domains.",
      "senderDomainId=null — custom domain selection is required for all users", "SETUP_IDENTITY");
  }

  const domain = await storage.getVerifiedDomainForUser(user.id, senderDomainId);
  if (!domain) {
    return _deny("IDENTITY", "DOMAIN_NOT_VERIFIED",
      "The selected sending domain is not verified or does not belong to your account.",
      `senderDomainId=${senderDomainId} not VERIFIED for userId=${user.id}`, "SETUP_IDENTITY");
  }

  return { allowed: true };
}

function _checkReputation({ user }) {
  if (user.isDormant) {
    return _deny("REPUTATION", "ACCOUNT_DORMANT",
      "Your account is dormant due to inactivity. Complete a campaign to reactivate sending.",
      "isDormant=true", "CONTACT_SUPPORT");
  }

  if (user.sendPaused) {
    const reason = user.sendPausedReason || "administrative review";
    return _deny("REPUTATION", "SEND_PAUSED",
      `Sending is paused for your account (${reason}). Contact support to review.`,
      `sendPaused=true reason="${reason}"`, "CONTACT_SUPPORT");
  }

  return { allowed: true };
}

async function _checkPolicy({ user }) {
  const settings = await _getWarmupSettings();
  if (!_warmupIsActive(user, settings.duration_days)) return { allowed: true };

  const dailyLimit = _getEffectiveDailyLimit(user, settings);
  const sentToday  = _getSentTodayAdjusted(user);

  if (sentToday >= dailyLimit) {
    return _deny("POLICY", "WARMUP_DAILY_LIMIT_REACHED",
      `Daily sending limit of ${dailyLimit} emails reached for today (warm-up period). Resets in the next 24-hour window.`,
      `warmupEmailsSentToday=${sentToday} >= dailyLimit=${dailyLimit}`,
      "WAIT"
    );
  }

  return { allowed: true };
}

// ── Warm-up helpers ───────────────────────────────────────────────────────────

function _warmupIsActive(user, durationDays) {
  if (!user.firstSendAt) return true; // Never sent — warm-up starts on first send
  const warmupEnd = new Date(user.firstSendAt);
  warmupEnd.setDate(warmupEnd.getDate() + durationDays);
  return new Date() < warmupEnd;
}

function _warmupDaysRemaining(user, durationDays) {
  if (!user.firstSendAt) return durationDays;
  const warmupEnd = new Date(user.firstSendAt);
  warmupEnd.setDate(warmupEnd.getDate() + durationDays);
  return Math.max(0, Math.ceil((warmupEnd - new Date()) / 86_400_000));
}

function _getEffectiveDailyLimit(user, settings) {
  if (user.warmupDailyLimit !== null && user.warmupDailyLimit !== undefined) {
    return user.warmupDailyLimit; // Admin per-account override
  }
  return user.sendingIdentityType === "platform"
    ? settings.platform_identity_daily_limit
    : settings.custom_domain_daily_limit;
}

function _getSentTodayAdjusted(user) {
  if (!user.warmupEmailsResetAt) return 0;
  const elapsed = Date.now() - new Date(user.warmupEmailsResetAt).getTime();
  if (elapsed > 86_400_000) return 0; // 24h window expired — DB will reset on next atomic increment
  return user.warmupEmailsSentToday || 0;
}

// ── Platform settings cache ───────────────────────────────────────────────────
// Refreshed at most once per minute to avoid a DB round-trip on every campaign start.

let _settingsCache = null;
let _settingsCachedAt = 0;
const SETTINGS_TTL_MS = 60_000;

async function _getWarmupSettings() {
  const now = Date.now();
  if (_settingsCache && now - _settingsCachedAt < SETTINGS_TTL_MS) {
    return _settingsCache;
  }
  const [customLimit, platformLimit, durationDays] = await Promise.all([
    storage.getPlatformSetting("warmup_custom_domain_daily_limit"),
    storage.getPlatformSetting("warmup_platform_identity_daily_limit"),
    storage.getPlatformSetting("warmup_duration_days"),
  ]);
  _settingsCache = {
    custom_domain_daily_limit:     parseInt(customLimit?.value    ?? "200", 10),
    platform_identity_daily_limit: parseInt(platformLimit?.value  ?? "100", 10),
    duration_days:                 parseInt(durationDays?.value   ?? "30",  10),
  };
  _settingsCachedAt = now;
  return _settingsCache;
}

// ── Audit log ─────────────────────────────────────────────────────────────────

async function _logDenial(ctx, result) {
  const action = ctx.campaignId
    ? AUDIT_ACTIONS.SEND_AUTHORIZATION_DENIED_EXEC
    : AUDIT_ACTIONS.SEND_AUTHORIZATION_DENIED;
  await storage.createAuditLog({
    userId:     ctx.user.id,
    action,
    targetType: ctx.campaignId ? "campaign" : null,
    targetId:   ctx.campaignId ?? null,
    details: {
      dimension:    result.dimension,
      code:         result.code,
      adminMessage: result.adminMessage,
      mode:         ctx.mode,
    },
  });
}

// ── Utility ───────────────────────────────────────────────────────────────────

function _deny(dimension, code, userMessage, adminMessage, remediationAction) {
  return { allowed: false, dimension, code, userMessage, adminMessage, remediationAction };
}
