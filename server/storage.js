/**
 * Storage Module - Unified Interface
 * ===================================
 * Automatically uses:
 * - Real PostgreSQL storage when DATABASE_URL is provided
 * - In-memory storage for DEV mode (same interface, same validations)
 * 
 * Zero code changes required to switch between modes.
 */

import { db, isDevMode } from "./db.js";
import { memoryStorage } from "./memoryStorage.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { MIN_SENDER_HEALTH_SENT, PERMANENT_FAILURE_REASONS, EXECUTION_LEASE_DURATION_MS } from "./campaignConfig.js";
import { generateTrackingToken } from "./trackingUtils.js";
import { isMachineCategory } from "./trackingClassifier.js";

// Import schema constants (always needed)
import {
  USER_ROLES, AUDIT_ACTIONS, CAMPAIGN_STATUS, PAYMENT_STATUS,
  CAMPAIGN_EMAIL_STATUS, SUPPRESSION_SOURCE, AI_DAILY_LIMITS,
  INACTIVITY_THRESHOLDS, MONTHLY_CREDITS
} from "../shared/schema.js";

// Static imports - tree-shaking will handle unused code in prod
import * as drizzleOps from "drizzle-orm";
import * as schemaImports from "../shared/schema.js";

// Use imports only when not in dev mode
const { eq, and, desc, gte, sql, lt, inArray, notInArray, or, asc, ilike, isNull, isNotNull } = (!isDevMode && db) ? drizzleOps : {};
const {
  users, sessions, templates, contacts, campaigns,
  campaignEmails, creditTransactions, auditLogs, payments, contactSubmissions, waitlist,
  suppressions, aiUsageLogs, invites, snsEvents, platformSettings,
  contactLists, contactListMembers, contactImports, senderDomains, trackingTokens,
} = (!isDevMode && db) ? schemaImports : {};

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Build 6-month chart from already-loaded campaign list (no extra DB query).
function buildMonthlyChart(campaignsList) {
  const buckets = {};
  const orderedKeys = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short" });
    buckets[key] = { month: label, sent: 0, opened: 0 };
    orderedKeys.push(key);
  }
  for (const c of campaignsList) {
    // Use the actual send date so draft-in-Jan / sent-in-Feb campaigns land in Feb.
    const d = new Date(c.startedAt || c.completedAt || c.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (buckets[key]) {
      buckets[key].sent   += c.sentEmails   || 0;
      buckets[key].opened += c.openedEmails || 0;
    }
  }
  return orderedKeys.map(k => buckets[k]);
}

// PostgreSQL-based storage implementation
const dbStorage = {
  async createUser(userData) {
    const passwordHash = await bcrypt.hash(userData.password || crypto.randomBytes(32).toString("hex"), 12);
    // When FREE_PLAN_ENABLED, new users are free plan users, not legacy trial users.
    // Callers that pass isTrialUser=false explicitly (e.g. initializeRootAdmin) are respected.
    // Callers that don't pass it (invite accept, etc.) get env-derived default.
    const isTrialUser = "isTrialUser" in userData
      ? Boolean(userData.isTrialUser)
      : process.env.FREE_PLAN_ENABLED !== "true";
    const [user] = await db.insert(users).values({
      username: userData.username,
      email: userData.email,
      passwordHash,
      role: userData.role || USER_ROLES.USER,
      parentId: userData.parentId || null,
      creditsReceived: userData.creditsReceived || 0,
      creditsAllocated: 0,
      creditsUsed: 0,
      isTrialUser,
      mustResetPassword: userData.mustResetPassword !== false,
      isActive: true,
      plan: userData.plan || "free",
      emailVerified: userData.emailVerified === true,
    }).returning();
    return this.sanitizeUser(user);
  },

  async getUserById(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ? this.sanitizeUser(user) : null;
  },

  async getUser(id) {
    return this.getUserById(id);
  },

  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || null;
  },

  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || null;
  },

  async validatePassword(user, password) {
    const hash = user.passwordHash;
    if (!hash) return false;

    // Modern bcrypt hash
    if (hash.startsWith("$2b$") || hash.startsWith("$2a$")) {
      return bcrypt.compare(password, hash);
    }

    // Legacy SHA-256 hash — verify, then transparently migrate to bcrypt
    const sha256 = crypto.createHash("sha256").update(password).digest("hex");
    if (sha256 !== hash) return false;

    try {
      const newHash = await bcrypt.hash(password, 12);
      await db.update(users)
        .set({ passwordHash: newHash, updatedAt: new Date() })
        .where(eq(users.id, user.id));
      console.log(`[AUTH] Migrated password hash for user ${user.username} from SHA-256 to bcrypt`);
    } catch (migErr) {
      console.error(`[AUTH] Password migration failed for user ${user.id}:`, migErr.message);
    }

    return true;
  },

  async updatePassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(users)
      .set({ passwordHash, mustResetPassword: false, updatedAt: new Date() })
      .where(eq(users.id, userId));
    await this.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
      targetType: "user",
      targetId: userId
    });
  },

  async updateUser(id, updates) {
    const allowedUpdates = {};
    if (updates.email) allowedUpdates.email = updates.email;
    if (updates.isActive !== undefined) allowedUpdates.isActive = updates.isActive;
    if (updates.mustResetPassword !== undefined) allowedUpdates.mustResetPassword = updates.mustResetPassword;
    if (updates.lastLoginAt) allowedUpdates.lastLoginAt = updates.lastLoginAt;
    if (updates.creditsReceived !== undefined) allowedUpdates.creditsReceived = updates.creditsReceived;
    if (updates.creditsAllocated !== undefined) allowedUpdates.creditsAllocated = updates.creditsAllocated;
    if (updates.creditsUsed !== undefined) allowedUpdates.creditsUsed = updates.creditsUsed;
    if (updates.freeCreditsUsed !== undefined) allowedUpdates.freeCreditsUsed = updates.freeCreditsUsed;
    if ("freeCreditsResetAt" in updates) allowedUpdates.freeCreditsResetAt = updates.freeCreditsResetAt; // allow null
    if (updates.plan) allowedUpdates.plan = updates.plan;
    if (updates.sendPaused !== undefined) allowedUpdates.sendPaused = updates.sendPaused;
    if (updates.sendPausedReason !== undefined) allowedUpdates.sendPausedReason = updates.sendPausedReason;
    if (updates.sendPausedAt !== undefined) allowedUpdates.sendPausedAt = updates.sendPausedAt;
    // Sender identity profile fields
    if (updates.senderName   !== undefined) allowedUpdates.senderName   = updates.senderName   || null;
    if (updates.senderTitle  !== undefined) allowedUpdates.senderTitle  = updates.senderTitle  || null;
    if (updates.senderCompany!== undefined) allowedUpdates.senderCompany= updates.senderCompany|| null;
    if (updates.senderPhone  !== undefined) allowedUpdates.senderPhone  = updates.senderPhone  || null;
    if (updates.replyToEmail !== undefined) allowedUpdates.replyToEmail = updates.replyToEmail || null;
    // Trust model fields (M13B)
    if (updates.emailVerified !== undefined) allowedUpdates.emailVerified = updates.emailVerified;
    if (updates.emailVerificationToken !== undefined) allowedUpdates.emailVerificationToken = updates.emailVerificationToken || null;
    if (updates.emailVerificationExpiresAt !== undefined) allowedUpdates.emailVerificationExpiresAt = updates.emailVerificationExpiresAt || null;
    if (updates.sendingIdentityType !== undefined) allowedUpdates.sendingIdentityType = updates.sendingIdentityType || null;
    if (updates.platformIdentityAcknowledgedAt !== undefined) allowedUpdates.platformIdentityAcknowledgedAt = updates.platformIdentityAcknowledgedAt || null;
    if ("warmupDailyLimit" in updates) allowedUpdates.warmupDailyLimit = updates.warmupDailyLimit; // allow null (admin clears override)
    allowedUpdates.updatedAt = new Date();
    
    const [user] = await db.update(users)
      .set(allowedUpdates)
      .where(eq(users.id, id))
      .returning();
    return user ? this.sanitizeUser(user) : null;
  },

  async setFirstSendAt(userId) {
    // Idempotent — only sets firstSendAt on the first ever dispatched email.
    // Conditional WHERE prevents overwriting a value already set by a concurrent request.
    await db.update(users)
      .set({ firstSendAt: new Date(), updatedAt: new Date() })
      .where(and(eq(users.id, userId), isNull(users.firstSendAt)));
  },

  async atomicIncrementWarmupCount(userId, dailyLimit) {
    // Atomically increment warmup_emails_sent_today.
    // Resets the 24h counter when the window has expired, then claims the slot.
    // Returns the new count, or null if the daily limit was already reached (prevents overshoot
    // between concurrent campaign loops running for the same user).
    const now = new Date();
    const cutoff = new Date(now.getTime() - 86_400_000);
    const result = await db.update(users)
      .set({
        warmupEmailsSentToday: sql`CASE
          WHEN warmup_emails_reset_at IS NULL OR warmup_emails_reset_at < ${cutoff}
          THEN 1
          ELSE warmup_emails_sent_today + 1
        END`,
        warmupEmailsResetAt: sql`CASE
          WHEN warmup_emails_reset_at IS NULL OR warmup_emails_reset_at < ${cutoff}
          THEN ${now}
          ELSE warmup_emails_reset_at
        END`,
        updatedAt: now,
      })
      .where(and(
        eq(users.id, userId),
        sql`(warmup_emails_reset_at IS NULL OR warmup_emails_reset_at < ${cutoff} OR warmup_emails_sent_today < ${dailyLimit})`
      ))
      .returning({ warmupEmailsSentToday: users.warmupEmailsSentToday });
    return result[0]?.warmupEmailsSentToday ?? null;
  },

  async deleteUser(id) {
    await db.delete(users).where(eq(users.id, id));
  },

  async getUsers(parentId = null, includeAll = false) {
    let result;
    if (includeAll) {
      result = await db.select().from(users).orderBy(desc(users.createdAt));
    } else if (parentId) {
      result = await db.select().from(users)
        .where(eq(users.parentId, parentId))
        .orderBy(desc(users.createdAt));
    } else {
      result = await db.select().from(users).orderBy(desc(users.createdAt));
    }
    return result.map(u => this.sanitizeUser(u));
  },

  async getChildUsers(parentId) {
    const result = await db.select().from(users)
      .where(eq(users.parentId, parentId))
      .orderBy(desc(users.createdAt));
    return result.map(u => this.sanitizeUser(u));
  },

  async getActiveChildren(parentId) {
    const result = await db.select().from(users)
      .where(and(eq(users.parentId, parentId), eq(users.isActive, true)))
      .orderBy(desc(users.createdAt));
    return result.map(u => this.sanitizeUser(u));
  },

  async reassignChildren(oldParentId, newParentId) {
    await db.update(users)
      .set({ parentId: newParentId, updatedAt: new Date() })
      .where(eq(users.parentId, oldParentId));
  },

  sanitizeUser(user) {
    if (!user) return null;
    const {
      passwordHash,
      resetToken,
      resetTokenExpiresAt,
      emailVerificationToken,
      emailVerificationExpiresAt,
      inactivityKeepToken,
      inactivityKeepTokenExpiresAt,
      ...sanitized
    } = user;
    sanitized.creditsRemaining = (sanitized.creditsReceived || 0) -
                                  (sanitized.creditsAllocated || 0) -
                                  (sanitized.creditsUsed || 0);
    const monthlyGrant = MONTHLY_CREDITS[sanitized.plan] ?? 0;
    sanitized.freeCreditsRemaining = Math.max(0, monthlyGrant - (sanitized.freeCreditsUsed || 0));
    sanitized.monthlyFreeCredits = monthlyGrant;
    return sanitized;
  },

  async createSession(userId) {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const [session] = await db.insert(sessions).values({
      userId,
      token,
      expiresAt
    }).returning();
    
    await this.updateUser(userId, { lastLoginAt: new Date() });
    
    return session;
  },

  async getSessionByToken(token) {
    const [session] = await db.select().from(sessions)
      .where(and(
        eq(sessions.token, token),
        gte(sessions.expiresAt, new Date())
      ));
    return session || null;
  },

  async deleteSession(token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  },

  async deleteUserSessions(userId) {
    const deleted = await db.delete(sessions).where(eq(sessions.userId, userId)).returning({ id: sessions.id });
    return deleted.length;
  },

  async canAllocateCredits(fromUserId, amount) {
    const user = await this.getUserById(fromUserId);
    if (!user) return false;
    return user.creditsRemaining >= amount;
  },

  async allocateCredits(fromUserId, toUserId, amount, performedBy) {
    const fromUser = await this.getUserById(fromUserId);
    const toUser = await this.getUserById(toUserId);
    
    if (!fromUser || !toUser) {
      throw new Error("User not found");
    }
    
    if (fromUser.role === USER_ROLES.ROOT_ADMIN && toUser.role !== USER_ROLES.SUB_ADMIN) {
      throw new Error("ROOT_ADMIN can only allocate credits to SUB_ADMINs");
    }
    if (fromUser.role === USER_ROLES.SUB_ADMIN && toUser.role !== USER_ROLES.USER) {
      throw new Error("SUB_ADMIN can only allocate credits to USERs");
    }
    if (fromUser.role === USER_ROLES.USER) {
      throw new Error("USER cannot allocate credits");
    }
    
    if (toUser.parentId !== fromUserId) {
      throw new Error("Can only allocate credits to direct children");
    }
    
    // Fast-path pre-check: surface clear insufficient-credits errors without entering
    // a transaction. Not atomic — the authoritative check is inside the transaction.
    if (fromUser.creditsRemaining < amount) {
      throw new Error("Insufficient credits available");
    }

    // Record remaining balance (not the allocated pool) so the transaction log
    // shows the meaningful "available credits before/after" for each party.
    const fromRemainingBefore = fromUser.creditsRemaining;
    const toRemainingBefore   = toUser.creditsRemaining;

    await db.transaction(async (tx) => {
      // Atomic balance check: the WHERE clause enforces the constraint at write time.
      // Two concurrent admin allocations from the same parent can both pass the
      // pre-check above before either commits. The conditional WHERE prevents the
      // second caller from decrementing the balance below zero — if the first
      // allocation consumed the available credits, the second UPDATE returns 0 rows
      // and throws, rolling back the entire transaction.
      const [fromUpdated] = await tx.update(users)
        .set({ creditsAllocated: sql`credits_allocated + ${amount}`, updatedAt: new Date() })
        .where(and(
          eq(users.id, fromUserId),
          sql`(credits_received - credits_allocated - credits_used) >= ${amount}`
        ))
        .returning({ id: users.id });

      if (!fromUpdated) throw new Error("Insufficient credits available");

      await tx.update(users)
        .set({ creditsReceived: sql`credits_received + ${amount}`, updatedAt: new Date() })
        .where(eq(users.id, toUserId));

      await tx.insert(creditTransactions).values({
        userId: fromUserId,
        type: "allocation_out",
        amount: -amount,
        balanceBefore: fromRemainingBefore,
        balanceAfter: fromRemainingBefore - amount,
        fromUserId,
        toUserId,
        description: `Allocated ${amount} credits to ${toUser.username}`
      });

      await tx.insert(creditTransactions).values({
        userId: toUserId,
        type: "allocation_in",
        amount: amount,
        balanceBefore: toRemainingBefore,
        balanceAfter: toRemainingBefore + amount,
        fromUserId,
        toUserId,
        description: `Received ${amount} credits from ${fromUser.username}`
      });
    });
    
    await this.createAuditLog({
      userId: performedBy || fromUserId,
      action: AUDIT_ACTIONS.CREDITS_ALLOCATED,
      targetType: "user",
      targetId: toUserId,
      details: { fromUserId, toUserId, amount }
    });
    
    return { success: true, amount };
  },

  async reclaimCredits(childId, parentId, amount) {
    const child = await this.getUserById(childId);
    const parent = await this.getUserById(parentId);
    if (!child || !parent) throw new Error("User not found");

    const childBalanceBefore = child.creditsReceived;
    const parentBalanceBefore = parent.creditsAllocated;

    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({ creditsReceived: sql`credits_received - ${amount}`, updatedAt: new Date() })
        .where(eq(users.id, childId));

      await tx.update(users)
        .set({ creditsAllocated: sql`credits_allocated - ${amount}`, updatedAt: new Date() })
        .where(eq(users.id, parentId));

      await tx.insert(creditTransactions).values({
        userId: childId,
        type: "reclaim_out",
        amount: -amount,
        balanceBefore: childBalanceBefore,
        balanceAfter: childBalanceBefore - amount,
        fromUserId: childId,
        toUserId: parentId,
        description: `${amount} credits reclaimed on account deactivation`,
      });

      await tx.insert(creditTransactions).values({
        userId: parentId,
        type: "reclaim_in",
        amount,
        balanceBefore: parentBalanceBefore,
        balanceAfter: parentBalanceBefore - amount,
        fromUserId: childId,
        toUserId: parentId,
        description: `${amount} credits reclaimed from ${child.username} on deactivation`,
      });
    });

    return { amount };
  },

  async useCredits(userId, amount) {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");

    if (user.creditsRemaining < amount) {
      throw new Error("Insufficient credits");
    }

    const [updated] = await db.update(users)
      .set({
        creditsUsed: sql`credits_used + ${amount}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    return this.sanitizeUser(updated);
  },

  async deductCreditAtomic(userId, campaignId, description = "Email sent") {
    const freePlanEnabled = process.env.FREE_PLAN_ENABLED === "true";
    let credited = false;
    let creditSource = null; // "free" | "paid" | "trial"

    // ── Free Plan path (FREE_PLAN_ENABLED=true, is_trial_user=false) ──────────
    // Step A: lazy monthly refresh (idempotent WHERE-clause guard).
    // Step B: deduct from free pool (balance WHERE clause — same pattern as FIN-2).
    // Both steps run in a single transaction so a send and a refresh are atomic.
    if (freePlanEnabled) {
      await db.transaction(async (tx) => {
        const user = await tx.select({
          id: users.id, plan: users.plan,
          isTrialUser: users.isTrialUser,
          freeCreditsUsed: users.freeCreditsUsed,
          freeCreditsResetAt: users.freeCreditsResetAt,
          createdAt: users.createdAt,
        }).from(users).where(eq(users.id, userId)).then(r => r[0]);

        if (!user || user.isTrialUser) return; // fall through to legacy trial path

        const monthlyGrant = MONTHLY_CREDITS[user.plan] ?? 0;
        if (monthlyGrant === 0) return; // paid PAYG plan — no free credits

        // Step A: refresh if stale — 1 month rolling from signup date (or last reset)
        // COALESCE uses created_at so a brand-new user's first refresh fires on their
        // signup anniversary, not on the first of the next calendar month.
        const refreshed = await tx.update(users)
          .set({ freeCreditsUsed: 0, freeCreditsResetAt: new Date(), updatedAt: new Date() })
          .where(and(
            eq(users.id, userId),
            sql`(NOW() AT TIME ZONE 'UTC') >= (COALESCE(free_credits_reset_at, created_at) + INTERVAL '1 month')`
          ))
          .returning({ id: users.id });

        if (refreshed.length > 0) {
          await tx.insert(creditTransactions).values({
            userId, type: "free_monthly_grant", amount: monthlyGrant,
            balanceBefore: 0, balanceAfter: monthlyGrant,
            description: `Free Plan monthly grant (${monthlyGrant} credits)`,
          });
          await tx.insert(auditLogs).values({
            userId, action: AUDIT_ACTIONS.FREE_CREDITS_GRANTED,
            details: { credits: monthlyGrant, plan: user.plan },
          });
        }

        // Step B: deduct one free credit (balance check in WHERE clause — atomic, no TOCTOU)
        const usedAfterRefresh = refreshed.length > 0 ? 0 : (user.freeCreditsUsed || 0);
        const [deducted] = await tx.update(users)
          .set({ freeCreditsUsed: sql`free_credits_used + 1`, updatedAt: new Date() })
          .where(and(
            eq(users.id, userId),
            sql`(${monthlyGrant} - free_credits_used) >= 1`
          ))
          .returning({ freeCreditsUsed: users.freeCreditsUsed });

        if (deducted) {
          credited = true;
          creditSource = "free";
          await tx.insert(creditTransactions).values({
            userId, type: "free_usage", amount: -1,
            balanceBefore: deducted.freeCreditsUsed - 1,
            balanceAfter: deducted.freeCreditsUsed,
            campaignId, description,
          });
        }
      });
    }

    // ── Paid credits (FIN-2 proven pattern — unchanged) ───────────────────────
    if (!credited) {
      await db.transaction(async (tx) => {
        const [updated] = await tx.update(users)
          .set({ creditsUsed: sql`credits_used + 1`, updatedAt: new Date() })
          .where(and(
            eq(users.id, userId),
            sql`(credits_received - credits_allocated - credits_used) >= 1`
          ))
          .returning({ creditsUsed: users.creditsUsed });

        if (updated) {
          credited = true;
          creditSource = "paid";
          await tx.insert(creditTransactions).values({
            userId, type: "usage", amount: -1,
            balanceBefore: updated.creditsUsed - 1,
            balanceAfter: updated.creditsUsed,
            campaignId, description,
          });
        }
      });
    }

    // ── Legacy trial credits (backward compat — only when FREE_PLAN_ENABLED=false
    //    or is_trial_user=true after partial backfill) ─────────────────────────
    if (!credited) {
      await db.transaction(async (tx) => {
        const [updated] = await tx.update(users)
          .set({ trialCreditsUsed: sql`trial_credits_used + 1`, updatedAt: new Date() })
          .where(and(
            eq(users.id, userId),
            eq(users.isTrialUser, true),
            sql`(trial_credits - trial_credits_used) >= 1`
          ))
          .returning({ trialCreditsUsed: users.trialCreditsUsed });

        if (updated) {
          credited = true;
          creditSource = "trial";
          await tx.insert(creditTransactions).values({
            userId, type: "trial_usage", amount: -1,
            balanceBefore: updated.trialCreditsUsed - 1,
            balanceAfter: updated.trialCreditsUsed,
            campaignId, description,
          });
        }
      });
    }

    if (!credited) throw new Error("Insufficient credits");

    await this.createAuditLog({
      userId, action: AUDIT_ACTIONS.CREDITS_USED,
      targetType: "campaign", targetId: campaignId,
      details: { creditsUsed: 1, source: creditSource },
    });

    return true;
  },

  async addCredits(userId, amount, action, details = {}) {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");
    await db.update(users)
      .set({ creditsReceived: sql`credits_received + ${amount}`, updatedAt: new Date() })
      .where(eq(users.id, userId));
    await this.createAuditLog({
      userId, action: action || AUDIT_ACTIONS.CREDITS_PURCHASED,
      details: { amount, ...details }
    });
  },

  // Atomic one-time trial claim. isTrialUser acts as the idempotency gate —
  // flipped to false in the same UPDATE so concurrent calls get 0 rows.
  // Returns true if credits were granted, false if already claimed.
  async claimTrialCredits(userId, credits) {
    const [claimed] = await db.update(users)
      .set({
        creditsReceived: sql`credits_received + ${credits}`,
        isTrialUser: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(users.id, userId),
        eq(users.isTrialUser, true)
      ))
      .returning({ id: users.id });
    return !!claimed;
  },

  async canStartCampaign(userId, emailCount) {
    const user = await this.getUserById(userId);
    if (!user) return { allowed: false, reason: "User not found", blockReason: "user_not_found" };

    const freePlanEnabled = process.env.FREE_PLAN_ENABLED === "true";
    const paidRemaining = user.creditsRemaining || 0;

    // Free plan: lazy refresh before computing free balance (standalone transaction).
    // Race safety: the WHERE clause guard ensures at most one refresh per month per user.
    let freeRemaining = 0;
    if (freePlanEnabled && !user.isTrialUser) {
      const monthlyGrant = MONTHLY_CREDITS[user.plan] ?? 0;
      if (monthlyGrant > 0) {
        const [refreshed] = await db.update(users)
          .set({ freeCreditsUsed: 0, freeCreditsResetAt: new Date(), updatedAt: new Date() })
          .where(and(
            eq(users.id, userId),
            sql`(NOW() AT TIME ZONE 'UTC') >= (COALESCE(free_credits_reset_at, created_at) + INTERVAL '1 month')`
          ))
          .returning({ id: users.id });

        const usedAfterRefresh = refreshed ? 0 : (user.freeCreditsUsed || 0);
        freeRemaining = Math.max(0, monthlyGrant - usedAfterRefresh);
      }
    } else if (!freePlanEnabled && user.isTrialUser) {
      // Legacy trial path
      freeRemaining = Math.max(0, (user.trialCredits || 0) - (user.trialCreditsUsed || 0));
    }

    const totalAvailable = paidRemaining + freeRemaining;

    if (totalAvailable < emailCount) {
      // Distinguish block reason so the frontend can show the right message and CTA
      let blockReason;
      if (freePlanEnabled && !user.isTrialUser && freeRemaining === 0 && paidRemaining === 0) {
        const monthlyGrant = MONTHLY_CREDITS[user.plan] ?? 0;
        blockReason = monthlyGrant > 0 ? "free_exhausted" : "paid_exhausted";
      } else if (paidRemaining === 0 && freeRemaining === 0) {
        blockReason = "both_exhausted";
      } else {
        blockReason = "insufficient";
      }

      return {
        allowed: false,
        reason: `Insufficient credits. Need ${emailCount}, have ${totalAvailable}`,
        blockReason,
        creditsNeeded: emailCount,
        creditsAvailable: totalAvailable,
        freeRemaining,
        paidRemaining,
      };
    }

    return { allowed: true, creditsAvailable: totalAvailable, freeRemaining, paidRemaining };
  },

  async getCreditTransactions(userId, limit = 50) {
    const result = await db.select().from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit);
    return result;
  },

  async createTemplate(templateData) {
    const [template] = await db.insert(templates).values(templateData).returning();
    await this.createAuditLog({
      userId: templateData.userId,
      action: AUDIT_ACTIONS.TEMPLATE_CREATED,
      targetType: "template",
      targetId: template.id,
      details: { name: template.name }
    });
    return template;
  },

  async getTemplates(userId = null) {
    if (userId) {
      return await db.select().from(templates)
        .where(eq(templates.userId, userId))
        .orderBy(desc(templates.createdAt));
    }
    return await db.select().from(templates).orderBy(desc(templates.createdAt));
  },

  async getTemplate(id) {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template || null;
  },

  async updateTemplate(id, updates) {
    const [template] = await db.update(templates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning();
    return template || null;
  },

  async deleteTemplate(id, userId) {
    await db.delete(templates).where(eq(templates.id, id));
    if (userId) {
      await this.createAuditLog({
        userId,
        action: AUDIT_ACTIONS.TEMPLATE_DELETED,
        targetType: "template",
        targetId: id
      });
    }
  },

  async createContact(contactData) {
    const values = { ...contactData, email: contactData.email?.toLowerCase().trim() };
    const [contact] = await db
      .insert(contacts)
      .values(values)
      .onConflictDoUpdate({
        target: [contacts.userId, contacts.email],
        set: {
          name: sql`excluded.name`,
          company: sql`excluded.company`,
          category: sql`excluded.category`,
          customFields: sql`excluded.custom_fields`,
        },
      })
      .returning();
    return contact;
  },

  async createContacts(contactsData) {
    if (contactsData.length === 0) return [];
    const values = contactsData.map((d) => ({
      ...d,
      email: d.email?.toLowerCase().trim(),
    }));
    const result = await db
      .insert(contacts)
      .values(values)
      .onConflictDoUpdate({
        target: [contacts.userId, contacts.email],
        set: {
          name: sql`excluded.name`,
          company: sql`excluded.company`,
          category: sql`excluded.category`,
          customFields: sql`excluded.custom_fields`,
          updatedAt: new Date(),
        },
      })
      .returning();
    await this.createAuditLog({
      userId: contactsData[0].userId,
      action: AUDIT_ACTIONS.CONTACT_IMPORTED,
      targetType: "contacts",
      details: { count: result.length }
    });
    return result;
  },

  async getContacts(userId) {
    return await db.select().from(contacts)
      .where(eq(contacts.userId, userId))
      .orderBy(desc(contacts.createdAt));
  },

  async getContactById(id) {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact || null;
  },

  async getContactsByIds(ids) {
    if (!ids || ids.length === 0) return [];
    return await db.select().from(contacts).where(inArray(contacts.id, ids));
  },

  // ── Contact Library ─────────────────────────────────────────────────────────

  async createContactList({ userId, name, description }) {
    const [list] = await db.insert(contactLists).values({ userId, name, description }).returning();
    await this.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CONTACT_LIST_CREATED,
      targetType: "contact_list",
      targetId: list.id,
      details: { name },
    });
    return list;
  },

  async getContactLists(userId) {
    return await db
      .select({
        id: contactLists.id,
        userId: contactLists.userId,
        name: contactLists.name,
        description: contactLists.description,
        createdAt: contactLists.createdAt,
        updatedAt: contactLists.updatedAt,
        contactCount: sql`(SELECT COUNT(*) FROM contact_list_members WHERE list_id = ${contactLists.id})::int`,
      })
      .from(contactLists)
      .where(eq(contactLists.userId, userId))
      .orderBy(desc(contactLists.createdAt));
  },

  async getContactList(id, userId) {
    const [list] = await db
      .select({
        id: contactLists.id,
        userId: contactLists.userId,
        name: contactLists.name,
        description: contactLists.description,
        createdAt: contactLists.createdAt,
        updatedAt: contactLists.updatedAt,
        contactCount: sql`(SELECT COUNT(*) FROM contact_list_members WHERE list_id = ${contactLists.id})::int`,
      })
      .from(contactLists)
      .where(and(eq(contactLists.id, id), eq(contactLists.userId, userId)));
    return list || null;
  },

  async updateContactList(id, userId, { name, description }) {
    const updates = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    const [list] = await db
      .update(contactLists)
      .set(updates)
      .where(and(eq(contactLists.id, id), eq(contactLists.userId, userId)))
      .returning();
    if (list && name !== undefined) {
      await this.createAuditLog({
        userId,
        action: AUDIT_ACTIONS.CONTACT_LIST_RENAMED,
        targetType: "contact_list",
        targetId: id,
        details: { name },
      });
    }
    return list || null;
  },

  async deleteContactList(id, userId) {
    const [list] = await db
      .delete(contactLists)
      .where(and(eq(contactLists.id, id), eq(contactLists.userId, userId)))
      .returning();
    if (list) {
      await this.createAuditLog({
        userId,
        action: AUDIT_ACTIONS.CONTACT_LIST_DELETED,
        targetType: "contact_list",
        targetId: id,
        details: { name: list.name },
      });
    }
    return list || null;
  },

  async importContactsToList(userId, listId, rows, source = "library_import", fileName = null) {
    const BATCH = 1000;
    let newContacts = 0, updatedContacts = 0, addedToList = 0, alreadyInList = 0, failedRows = 0;
    const duplicateRows = [];

    for (let i = 0; i < rows.length; i += BATCH) {
      const rawBatch = rows.slice(i, i + BATCH);

      // Dedupe by normalized email *within this batch* before insert. Without
      // this, two rows sharing an email in the same 1000-row batch reach a
      // single INSERT ... ON CONFLICT DO UPDATE statement targeting the same
      // row twice, which Postgres rejects outright ("ON CONFLICT DO UPDATE
      // command cannot affect row a second time") — that raw exception used to
      // propagate all the way to the user as an unhandled 500 with a Postgres
      // error string in the response body. Last occurrence wins (matches the
      // intuitive "later row in the file overrides an earlier one" behavior a
      // user would expect from a CSV with a repeated address), and every
      // dropped earlier occurrence is reported back as a first-class row
      // error instead of silently vanishing or crashing.
      const lastIndexByEmail = new Map();
      rawBatch.forEach((r, idx) => lastIndexByEmail.set(r.email.toLowerCase().trim(), idx));
      const batch = [];
      const seen = new Set();
      for (let j = rawBatch.length - 1; j >= 0; j--) {
        const r = rawBatch[j];
        const normalizedEmail = r.email.toLowerCase().trim();
        if (seen.has(normalizedEmail)) {
          duplicateRows.push({ row: r._row, email: r.email, keptRow: rawBatch[lastIndexByEmail.get(normalizedEmail)]._row });
          continue;
        }
        seen.add(normalizedEmail);
        batch.unshift(r);
      }

      const emails = batch.map((r) => r.email.toLowerCase().trim());

      const existingContacts = await db
        .select({ id: contacts.id, email: contacts.email })
        .from(contacts)
        .where(and(eq(contacts.userId, userId), inArray(contacts.email, emails)));
      const existingEmailSet = new Set(existingContacts.map((c) => c.email));

      const upserted = await db
        .insert(contacts)
        .values(batch.map((r) => {
          const { _row, ...contactFields } = r;
          return { ...contactFields, email: r.email.toLowerCase().trim(), userId, updatedAt: new Date() };
        }))
        .onConflictDoUpdate({
          target: [contacts.userId, contacts.email],
          set: {
            name: sql`excluded.name`,
            company: sql`excluded.company`,
            category: sql`excluded.category`,
            customFields: sql`excluded.custom_fields`,
            updatedAt: new Date(),
          },
        })
        .returning({ id: contacts.id, email: contacts.email });

      for (const c of upserted) {
        if (existingEmailSet.has(c.email)) updatedContacts++; else newContacts++;
      }

      const contactIds = upserted.map((c) => c.id);
      const existingMembers = await db
        .select({ contactId: contactListMembers.contactId })
        .from(contactListMembers)
        .where(and(eq(contactListMembers.listId, listId), inArray(contactListMembers.contactId, contactIds)));
      const existingMemberSet = new Set(existingMembers.map((m) => m.contactId));

      const newMemberRows = contactIds
        .filter((id) => !existingMemberSet.has(id))
        .map((id) => ({ listId, contactId: id }));

      alreadyInList += existingMemberSet.size;

      if (newMemberRows.length > 0) {
        await db.insert(contactListMembers).values(newMemberRows).onConflictDoNothing();
        addedToList += newMemberRows.length;
      }
    }

    failedRows += duplicateRows.length;

    const [importRecord] = await db
      .insert(contactImports)
      .values({
        userId, listId, source, fileName,
        totalRows: rows.length, failedRows,
        newContacts, updatedContacts, addedToList, alreadyInList,
        completedAt: new Date(),
      })
      .returning();

    await this.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CONTACTS_IMPORTED_TO_LIST,
      targetType: "contact_list",
      targetId: listId,
      details: { totalRows: rows.length, newContacts, updatedContacts, addedToList, alreadyInList, failedRows, duplicatesInBatch: duplicateRows.length, fileName },
    });

    // duplicateRows is consumed by the route handler to build user-facing
    // rowErrors — not a column on contact_imports, so not part of the insert above.
    return { ...importRecord, duplicateRows };
  },

  async exportContactList(listId, userId) {
    return await db
      .select({
        email: contacts.email,
        name: contacts.name,
        company: contacts.company,
        category: contacts.category,
      })
      .from(contactListMembers)
      .innerJoin(contacts, eq(contactListMembers.contactId, contacts.id))
      .where(and(eq(contactListMembers.listId, listId), eq(contacts.userId, userId)))
      .orderBy(asc(contactListMembers.addedAt));
  },

  async getContactListContacts(listId, userId, { search, page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    const conditions = [
      eq(contactListMembers.listId, listId),
      eq(contacts.userId, userId),
    ];
    if (search) {
      conditions.push(or(ilike(contacts.email, `%${search}%`), ilike(contacts.name, `%${search}%`)));
    }
    const rows = await db
      .select({
        id: contacts.id,
        email: contacts.email,
        name: contacts.name,
        company: contacts.company,
        category: contacts.category,
        customFields: contacts.customFields,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
        addedAt: contactListMembers.addedAt,
      })
      .from(contactListMembers)
      .innerJoin(contacts, eq(contactListMembers.contactId, contacts.id))
      .where(and(...conditions))
      .orderBy(desc(contactListMembers.addedAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql`COUNT(*)::int` })
      .from(contactListMembers)
      .innerJoin(contacts, eq(contactListMembers.contactId, contacts.id))
      .where(and(...conditions));

    return { rows, total, page, limit };
  },

  async removeContactFromList(listId, contactId, userId) {
    const [member] = await db
      .delete(contactListMembers)
      .where(and(eq(contactListMembers.listId, listId), eq(contactListMembers.contactId, contactId)))
      .returning();
    if (member) {
      await this.createAuditLog({
        userId,
        action: AUDIT_ACTIONS.CONTACT_REMOVED_FROM_LIST,
        targetType: "contact_list",
        targetId: listId,
        details: { contactId },
      });
    }
    return member || null;
  },

  async bulkRemoveContactsFromList(listId, contactIds, userId) {
    if (!contactIds || contactIds.length === 0) return 0;
    await db
      .delete(contactListMembers)
      .where(and(eq(contactListMembers.listId, listId), inArray(contactListMembers.contactId, contactIds)));
    await this.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CONTACTS_BULK_REMOVED_FROM_LIST,
      targetType: "contact_list",
      targetId: listId,
      details: { count: contactIds.length },
    });
    return contactIds.length;
  },

  async getContactListImports(listId, userId) {
    const list = await this.getContactList(listId, userId);
    if (!list) return null;
    return await db
      .select()
      .from(contactImports)
      .where(eq(contactImports.listId, listId))
      .orderBy(desc(contactImports.createdAt));
  },

  async updateContact(id, userId, fields) {
    const [updated] = await db
      .update(contacts)
      .set({ ...fields, updatedAt: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
      .returning();
    if (updated) {
      await this.createAuditLog({
        userId,
        action: AUDIT_ACTIONS.CONTACT_UPDATED,
        targetType: "contact",
        targetId: id,
        details: { fields: Object.keys(fields) },
      });
    }
    return updated || null;
  },

  async resolveListContactIds(listId, userId) {
    const members = await db
      .select({ contactId: contactListMembers.contactId })
      .from(contactListMembers)
      .innerJoin(contacts, eq(contactListMembers.contactId, contacts.id))
      .where(and(eq(contactListMembers.listId, listId), eq(contacts.userId, userId)));
    return members.map((m) => m.contactId);
  },

  // ── End Contact Library ──────────────────────────────────────────────────────

  async createCampaign(campaignData) {
    const [campaign] = await db.insert(campaigns).values(campaignData).returning();
    await this.createAuditLog({
      userId: campaignData.userId,
      action: AUDIT_ACTIONS.CAMPAIGN_CREATED,
      targetType: "campaign",
      targetId: campaign.id,
      details: { name: campaign.name, totalEmails: campaign.totalEmails }
    });
    return campaign;
  },

  async getCampaigns(userId = null, isRootAdmin = false) {
    if (isRootAdmin) {
      // Workspace-scoped, not platform-wide — see resolveWorkspaceRootId/getWorkspaceMemberIds.
      const rootId = await this.resolveWorkspaceRootId(userId);
      const memberIds = await this.getWorkspaceMemberIds(rootId);
      return await db.select().from(campaigns)
        .where(inArray(campaigns.userId, [...memberIds]))
        .orderBy(desc(campaigns.createdAt));
    }
    if (userId) {
      return await db.select().from(campaigns)
        .where(eq(campaigns.userId, userId))
        .orderBy(desc(campaigns.createdAt));
    }
    // Caller must provide userId or isRootAdmin=true — returning nothing is safer than returning everything
    return [];
  },

  async getCampaign(id) {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || null;
  },

  async updateCampaign(id, updates) {
    const [campaign] = await db.update(campaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return campaign || null;
  },

  // Lightweight status-only read — avoids fetching the full campaign row (35+ columns)
  // for the mid-loop cancellation check.
  async getCampaignStatus(id) {
    const [row] = await db.select({ status: campaigns.status }).from(campaigns).where(eq(campaigns.id, id));
    return row?.status || null;
  },

  // PAR-TRUST-017 §7.7 — combined liveness check + lease renewal for the loop's
  // every-iteration check. One atomic UPDATE: if the campaign is still RUNNING,
  // this both confirms it AND extends the lease in the same round trip (no extra
  // query versus the old plain-SELECT check). If it's no longer RUNNING, the
  // WHERE clause simply doesn't match — nothing to renew — and a fallback SELECT
  // fetches the real status for the caller to act on (only on the rare stopping
  // path, never in the steady state).
  async renewLeaseAndGetStatus(campaignId) {
    const [row] = await db.update(campaigns)
      .set({ executionLeaseExpiresAt: new Date(Date.now() + EXECUTION_LEASE_DURATION_MS) })
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.status, "RUNNING")))
      .returning({ status: campaigns.status });
    if (row) return row.status;
    return await this.getCampaignStatus(campaignId);
  },

  // Lightweight, best-effort renewal called from inside sendWithRetry's own
  // retry loop — so a single slow contact (SES throttling, transient retries)
  // keeps renewing during its own retries, not just once per whole contact.
  // Never throws — a failed renewal should never abort a send; worst case the
  // lease naturally lapses and the reclaim gate/recovery correctly treat that
  // as "no longer owned", which is the intended fallback behavior anyway.
  async renewExecutionLease(campaignId) {
    try {
      await db.update(campaigns)
        .set({ executionLeaseExpiresAt: new Date(Date.now() + EXECUTION_LEASE_DURATION_MS) })
        .where(and(eq(campaigns.id, campaignId), eq(campaigns.status, "RUNNING")));
    } catch {
      // Swallowed by design — see comment above.
    }
  },

  // Read-only lease check for the reclaim gate (routes.js) — returns the
  // expiry timestamp (or null if never set / already cleared by finalization).
  async getExecutionLeaseExpiry(campaignId) {
    const [row] = await db.select({ executionLeaseExpiresAt: campaigns.executionLeaseExpiresAt, finalizedAt: campaigns.finalizedAt })
      .from(campaigns).where(eq(campaigns.id, campaignId));
    return row || null;
  },

  // Atomic cancellation: transitions PENDING/RUNNING/PAUSED → CANCELLED in one statement.
  // Returns the updated campaign row, or null if no eligible campaign matched
  // (already CANCELLED, COMPLETED, FAILED, or not found).
  async cancelCampaign(id, allowedStatuses) {
    const [campaign] = await db.update(campaigns)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(and(eq(campaigns.id, id), drizzleOps.inArray(campaigns.status, allowedStatuses)))
      .returning();
    return campaign || null;
  },

  // PAR-TRUST-017 — DB-derived source of truth for a campaign's final counts.
  // Used by finalizeCampaign() whenever the caller has no trusted local counters
  // (i.e. it is not the loop execution that actually processed the contacts).
  // dbClient defaults to the module-level db, but callers that need this to
  // see their own uncommitted writes (e.g. finalizeCampaign's orphan-flip,
  // which must be counted, not snapshotted before it happens) pass their `tx`.
  async deriveCountsFromCampaignEmails(campaignId, dbClient = db) {
    const [statusRows, engagementRows, ledgerRows] = await Promise.all([
      dbClient.select({
        status: campaignEmails.status,
        count: sql`count(*)`,
      }).from(campaignEmails)
        .where(eq(campaignEmails.campaignId, campaignId))
        .groupBy(campaignEmails.status),
      dbClient.select({
        delivered: sql`count(*) filter (where ${campaignEmails.deliveredAt} is not null)`,
        opened: sql`count(*) filter (where ${campaignEmails.openedAt} is not null)`,
        clicked: sql`count(*) filter (where ${campaignEmails.clickedAt} is not null)`,
        unsubscribed: sql`count(*) filter (where ${campaignEmails.unsubscribedAt} is not null)`,
      }).from(campaignEmails)
        .where(eq(campaignEmails.campaignId, campaignId)),
      // creditsUsed is derived from the ledger directly, not proxied through a
      // campaign_emails row count. deductCreditAtomic() marks an email SENT
      // *before* deducting (comment at its call site: "If deduction fails, the
      // email record correctly shows SENT — not FAILED"), and a deduction can
      // fail for a genuine infrastructure reason after a successful send (the
      // code's own pre-existing comment calls this "accounting drift" and
      // deliberately does not fail the email record for it). That means a SENT
      // row is not unconditionally proof a credit was charged — counting rows
      // to infer credits would silently overstate creditsUsed by exactly the
      // number of such (rare, already-disclosed) drift events. credit_transactions
      // is the only source that cannot be wrong about what was actually charged:
      // campaignId is set exclusively by the three deduction paths (paid/free/
      // trial usage, confirmed by direct code read — no other transaction type
      // ever sets it), so summing it is exact, not a proxy.
      dbClient.select({
        total: sql`coalesce(sum(${creditTransactions.amount}), 0)`,
      }).from(creditTransactions)
        .where(eq(creditTransactions.campaignId, campaignId)),
    ]);

    const byStatus = Object.fromEntries(statusRows.map(r => [r.status, parseInt(r.count, 10)]));
    // BOUNCED and COMPLAINED are states a campaign_email reaches only *after* a
    // successful send (the SNS handler only ever transitions a SENT row to one of
    // these) — they are not an alternative to having been sent, they are what
    // happened to a message that was sent. Counting only status===SENT here was
    // the root cause of a real drift: a legitimately-sent, legitimately-charged
    // email that later bounced or triggered a complaint would silently disappear
    // from sentEmails the next time this ran, even though the credit_transactions
    // ledger never reverses that charge.
    const sentEmails = (byStatus[CAMPAIGN_EMAIL_STATUS.SENT] || 0)
      + (byStatus[CAMPAIGN_EMAIL_STATUS.BOUNCED] || 0)
      + (byStatus[CAMPAIGN_EMAIL_STATUS.COMPLAINED] || 0);
    const engagement = engagementRows[0] || {};
    // credit_transactions.amount is negative for usage rows (-1 each); flip sign
    // for a positive "credits used" count.
    const creditsUsed = -(parseInt(ledgerRows[0]?.total, 10) || 0);
    return {
      sentEmails,
      failedEmails: byStatus[CAMPAIGN_EMAIL_STATUS.FAILED] || 0,
      skippedEmails: byStatus[CAMPAIGN_EMAIL_STATUS.SUPPRESSED] || 0,
      creditsUsed,
      bouncedEmails: byStatus[CAMPAIGN_EMAIL_STATUS.BOUNCED] || 0,
      complainedEmails: byStatus[CAMPAIGN_EMAIL_STATUS.COMPLAINED] || 0,
      deliveredEmails: parseInt(engagement.delivered, 10) || 0,
      openedEmails: parseInt(engagement.opened, 10) || 0,
      clickedEmails: parseInt(engagement.clicked, 10) || 0,
      unsubscribedEmails: parseInt(engagement.unsubscribed, 10) || 0,
    };
  },

  // Production-equivalence validation (real Postgres) caught a real bug here:
  // runCampaignLoop's periodic checkpoint and its mid-loop PAUSED/warm-up-limit
  // transitions all wrote local (per-execution) counters via a plain, unguarded
  // updateCampaign call. Under two genuinely-overlapping executions, one of
  // them can still be mid-loop — and reach one of these writes — *after* the
  // other has already finalized the campaign with the true derived counts.
  // An unguarded write would silently clobber those correct final counts with
  // this execution's own stale, partial local snapshot, with nothing left to
  // ever correct it (finalizeCampaign itself would already have run). Gating
  // on finalized_at IS NULL makes every such write a clean no-op once the
  // campaign is terminal — the same principle finalizeCampaign and
  // reconcileCampaignCounters already apply, extended to cover the loop's own
  // in-flight progress writes.
  async updateCampaignProgress(campaignId, updates) {
    await db.update(campaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(campaigns.id, campaignId), isNull(campaigns.finalizedAt)));
  },

  // PAR-TRUST-017 §13 / TRUST-018 — finds campaigns whose sentEmails/creditsUsed
  // cache might have drifted from campaign_emails (the narrow overlapping-
  // execution-plus-cancel race documented in the PAR). Bounded window: not
  // finalized too recently (comfortably longer than sendWithRetry's own
  // worst-case single-contact latency, so any genuinely-overlapping execution's
  // straggling send has had time to land) and not finalized so long ago that
  // reconciling it has no operational value.
  async getCampaignsPendingReconciliation(minAgeMs, maxAgeMs) {
    const now = Date.now();
    return await db.select().from(campaigns).where(and(
      isNotNull(campaigns.finalizedAt),
      lt(campaigns.finalizedAt, new Date(now - minAgeMs)),
      gte(campaigns.finalizedAt, new Date(now - maxAgeMs)),
    ));
  },

  // PAR-TRUST-017 §13 / TRUST-018 — heals the one class of drift the finalize/
  // claim mechanism doesn't structurally prevent: two genuinely-overlapping,
  // both-alive executions racing to finalize when an external cancel causes
  // each to return independently. Never touches status/finalizedAt (those are
  // real state transitions, decided once, at the point of decision — this is
  // purely a cache correction for an already-terminal row) and is a safe no-op
  // if the cache is already correct. Idempotent, stateless — a crash mid-run
  // just means the next scheduled pass corrects it.
  async reconcileCampaignCounters(campaignId) {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign?.finalizedAt) return false; // only ever corrects already-finalized rows

    const derived = await this.deriveCountsFromCampaignEmails(campaignId);
    // Covers every counter this function is now responsible for, not just the
    // original four — bouncedEmails/complainedEmails/deliveredEmails/openedEmails/
    // clickedEmails/unsubscribedEmails were previously trust-the-increment with no
    // reconciliation backstop at all; this closes that gap using the same
    // already-scheduled job rather than adding a new mechanism.
    const fields = ["sentEmails", "failedEmails", "skippedEmails", "creditsUsed", "bouncedEmails", "complainedEmails", "deliveredEmails", "openedEmails", "clickedEmails", "unsubscribedEmails"];
    const drifted = fields.some(f => campaign[f] !== derived[f]);
    if (!drifted) return false;

    // Compare-and-swap on the exact stale snapshot just diffed against — not
    // just "still finalized". Two horizontally-scaled instances' independent
    // reconciliation timers could otherwise both read the same drifted row,
    // both compute the same `derived`, and both proceed to write: the
    // campaigns row update would be idempotent (same final values either way),
    // but each would still append its own CAMPAIGN_COUNTERS_RECONCILED audit
    // entry — a duplicate audit record for one drift event. Gating the UPDATE
    // on every field still matching what we read means only the first writer
    // gets a matched row; the second finds 0 rows affected and no-ops instead
    // of writing a second entry.
    const [updated] = await db.update(campaigns)
      .set({ ...derived, updatedAt: new Date() })
      .where(and(
        eq(campaigns.id, campaignId),
        isNotNull(campaigns.finalizedAt),
        ...fields.map(f => eq(campaigns[f], campaign[f])),
      ))
      .returning({ id: campaigns.id });

    if (!updated) return false; // lost the race — another instance already reconciled this exact drift

    await this.createAuditLog({
      userId: campaign.userId,
      action: AUDIT_ACTIONS.CAMPAIGN_COUNTERS_RECONCILED,
      targetType: "campaign",
      targetId: campaignId,
      details: {
        reason: "overlapping_execution_drift",
        before: Object.fromEntries(fields.map(f => [f, campaign[f]])),
        after: derived,
      },
    });
    return true;
  },

  // PAR-TRUST-017 §7.3/§7.5 — the sole authoritative owner of campaign finalization.
  // Idempotent: gated on `finalized_at IS NULL` using the same "WHERE <flag> IS NULL
  // ... RETURNING" claim pattern already established for SNS event dedup elsewhere in
  // this file. Any number of concurrent/duplicate calls are safe — only the first to
  // reach the DB performs the work; every other call is a pure no-op.
  //
  // Always derives counts from campaign_emails — never trusts a caller-supplied
  // local counter, even from the loop execution that is finalizing. A concurrency
  // test caught exactly why this matters: when two executions of the loop are
  // racing (the R1 scenario this whole PAR exists for), each one's local counter
  // only reflects the contacts *it* personally won via claimCampaignEmail (§7.1) —
  // the other execution's contribution is invisible to it. Trusting either one's
  // local count would silently under-report the true total by however many
  // contacts the other execution processed. campaign_emails is the only source
  // that is correct regardless of how many executions contributed.
  //
  // Does NOT decide *that* a campaign should stop or *why* — that remains the
  // responsibility of whichever component made the decision (cancel endpoint,
  // deactivation handler, mid-loop pause/domain/warm-up checks), which already wrote
  // its own status + exactly one audit log at the point of decision. This function
  // only ever records *that* a campaign stopped and *what its true final counts were*.
  //
  // toStatus is required and must be one of COMPLETED/CANCELLED/FAILED — PAUSED is
  // never a legal finalization target (it is resumable; finalizing it would be a
  // one-way trip a resume could never undo).
  async finalizeCampaign(campaignId, toStatus) {
    if (!["COMPLETED", "CANCELLED", "FAILED"].includes(toStatus)) {
      throw new Error(`finalizeCampaign: illegal toStatus "${toStatus}" — PAUSED is not a terminal state`);
    }

    let counts;
    const finalized = await db.transaction(async (tx) => {
      // COMPLETED additionally requires status still be RUNNING at the moment of
      // finalization — this preserves the pre-existing TOCTOU protection (an
      // externally-decided CANCELLED/FAILED must never be overwritten to COMPLETED).
      // CANCELLED/FAILED finalization does not re-check status: the caller already
      // confirmed (via its own decision + write) that this is the correct terminal
      // status; finalizeCampaign is only reconciling counts for a decision already made.
      const whereClause = toStatus === "COMPLETED"
        ? and(eq(campaigns.id, campaignId), isNull(campaigns.finalizedAt), eq(campaigns.status, "RUNNING"))
        : and(eq(campaigns.id, campaignId), isNull(campaigns.finalizedAt));

      // Phase 1: claim exclusively, atomically, before touching anything else.
      // A losing/ineligible caller (already finalized, or COMPLETED attempted
      // on a non-RUNNING campaign) must get row=null here and do nothing
      // further — in particular it must NOT flip any campaign_emails rows.
      const [claimedRow] = await tx.update(campaigns)
        .set({
          status: toStatus,
          finalizedAt: new Date(),
          executionLeaseExpiresAt: null, // §7.7 — ownership released, nothing left to renew
          ...(toStatus === "COMPLETED" ? { completedAt: new Date() } : {}),
          updatedAt: new Date(),
        })
        .where(whereClause)
        .returning({ id: campaigns.id, userId: campaigns.userId });

      if (!claimedRow) return null;

      // Phase 2: now that this call exclusively owns finalization (any
      // concurrent finalizeCampaign call blocks on this row until we commit,
      // then loses the claim above), flip orphaned PENDING rows to FAILED and
      // derive counts *after* the flip — these rows are becoming FAILED in
      // this very call, so the counts written to campaigns and to the
      // CAMPAIGN_FINALIZED audit entry must reflect that, not a pre-flip
      // snapshot. (Previously counts were derived before the flip ran, so a
      // claimed-but-never-resolved row would silently vanish from both the
      // campaigns row and the audit trail — an intermediate snapshot
      // masquerading as final truth.)
      await tx.update(campaignEmails)
        .set({ status: CAMPAIGN_EMAIL_STATUS.FAILED, failureReason: "campaign_terminated" })
        .where(and(eq(campaignEmails.campaignId, campaignId), eq(campaignEmails.status, CAMPAIGN_EMAIL_STATUS.PENDING)));

      counts = await this.deriveCountsFromCampaignEmails(campaignId, tx);

      await tx.update(campaigns)
        .set({ ...counts, updatedAt: new Date() })
        .where(eq(campaigns.id, campaignId));

      return claimedRow;
    });

    if (finalized) {
      // The authoritative "what actually happened" record — written once, here,
      // after the true final counts are known. Complements (does not replace)
      // the decision-time CAMPAIGN_CANCELLED/CAMPAIGN_FAILED entry, which
      // necessarily can only record a snapshot as of the moment the decision was
      // made and cannot see sends still in flight at that instant.
      await this.createAuditLog({
        userId: finalized.userId,
        action: AUDIT_ACTIONS.CAMPAIGN_FINALIZED,
        targetType: "campaign",
        targetId: campaignId,
        details: { toStatus, ...counts },
      });
    }

    return !!finalized;
  },

  // Bulk-update orphaned PENDING campaign_emails to FAILED during crash recovery.
  // Prevents History from showing permanent "Pending" records for FAILED campaigns.
  async bulkFailOrphanedCampaignEmails(campaignId) {
    await db.update(campaignEmails)
      .set({ status: CAMPAIGN_EMAIL_STATUS.FAILED, failureReason: "campaign_recovery_failed" })
      .where(and(
        eq(campaignEmails.campaignId, campaignId),
        eq(campaignEmails.status, CAMPAIGN_EMAIL_STATUS.PENDING)
      ));
  },

  async getCampaignsByStatus(status) {
    return await db.select().from(campaigns)
      .where(eq(campaigns.status, status))
      .orderBy(desc(campaigns.createdAt));
  },

  async createAuditLog(data) {
    try {
      await db.insert(auditLogs).values({
        userId: data.userId || null,
        action: data.action,
        targetType: data.targetType || null,
        targetId: data.targetId || null,
        details: data.details || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null
      });
    } catch (err) {
      console.error("Failed to create audit log:", err);
    }
  },

  async getAuditLogs(filters = {}) {
    const conditions = [];
    // userIds (plural) scopes to a workspace member set — used by admin-facing
    // listing/export endpoints so "all logs I can see" means "my workspace",
    // not the entire platform. filters.userId (singular) still wins if both
    // are somehow passed, matching a caller asking about one specific member.
    if (filters.userId) conditions.push(eq(auditLogs.userId, filters.userId));
    else if (filters.userIds) conditions.push(inArray(auditLogs.userId, filters.userIds));
    if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
    if (filters.targetId) conditions.push(eq(auditLogs.targetId, filters.targetId));

    const result = await db.select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
      username: users.username
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(filters.limit || 100);

    return result;
  },

  async createAiUsageLog(data) {
    const [log] = await db.insert(aiUsageLogs).values({
      userId: data.userId,
      endpoint: data.endpoint,
      model: data.model,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      estimatedCostUsd: Number(data.estimatedCostUsd).toFixed(6),
      cached: data.cached ?? false,
      latencyMs: data.latencyMs ?? null,
      requestHash: data.requestHash ?? null,
    }).returning();
    return log;
  },

  async getDashboardStats(userId, isRootAdmin) {
    const campaignsList = await this.getCampaigns(userId, isRootAdmin);

    // Aggregate engagement metrics directly from loaded campaigns (no extra query).
    const totalSent       = campaignsList.reduce((s, c) => s + (c.sentEmails      || 0), 0);
    const totalAttempted  = campaignsList.reduce((s, c) => s + (c.totalEmails     || 0), 0);
    const totalOpens      = campaignsList.reduce((s, c) => s + (c.openedEmails    || 0), 0);
    const totalClicks     = campaignsList.reduce((s, c) => s + (c.clickedEmails   || 0), 0);
    const totalDelivered  = campaignsList.reduce((s, c) => s + (c.deliveredEmails || 0), 0);

    // Rates expressed as 0-100 numbers; null when denominator is zero. Clamped
    // at the source (not just where each is displayed) as defense-in-depth —
    // engagement counters (opened/clicked/delivered) are now reconciled against
    // ground truth (reconcileCampaignCounters, extended above to cover them),
    // but a formula-level clamp costs nothing and guarantees no future
    // increment-site bug can ever surface as a displayed value over 100%.
    const avgOpenRate  = totalSent > 0 ? Math.min(100, (totalOpens     / totalSent)      * 100) : null;
    const avgClickRate = totalSent > 0 ? Math.min(100, (totalClicks    / totalSent)      * 100) : null;
    const deliveryRate = totalSent > 0 ? Math.min(100, (totalDelivered / totalSent)      * 100) : null;
    const successRate  = totalAttempted > 0 ? Math.min(100, (totalSent / totalAttempted) * 100) : null;

    // Active contacts count for this user.
    let activeContacts = 0;
    if (userId) {
      const [contactsAgg] = await db.select({ count: sql`COUNT(*)` })
        .from(contacts).where(eq(contacts.userId, userId));
      activeContacts = Number(contactsAgg?.count) || 0;
    }

    const base = {
      totalCampaigns:     campaignsList.length,
      activeCampaigns:    campaignsList.filter(c => ["RUNNING","PAUSED","PENDING"].includes(c.status)).length,
      completedCampaigns: campaignsList.filter(c => c.status === "COMPLETED").length,
      totalEmailsSent:    totalSent,
      totalDelivered,
      totalOpens,
      totalClicks,
      deliveryRate,
      avgOpenRate,
      avgClickRate,
      successRate,
      activeContacts,
      monthlyChart:       buildMonthlyChart(campaignsList),
    };

    if (!isRootAdmin) return base;

    // AI cost analytics — root admin only
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // All AI analytics queries are scoped to the last 30 days — prevents full-table scans
    // as the table grows and keeps metrics operationally relevant.
    const [totals] = await db.select({
      totalCostUsd: sql`COALESCE(SUM(${aiUsageLogs.estimatedCostUsd}), 0)`,
      totalCalls: sql`COUNT(*)`,
      cachedCalls: sql`SUM(CASE WHEN ${aiUsageLogs.cached} THEN 1 ELSE 0 END)`,
    }).from(aiUsageLogs).where(gte(aiUsageLogs.createdAt, thirtyDaysAgo));

    const byEndpoint = await db.select({
      endpoint: aiUsageLogs.endpoint,
      totalCost: sql`COALESCE(SUM(${aiUsageLogs.estimatedCostUsd}), 0)`,
      totalCalls: sql`COUNT(*)`,
      cacheHits: sql`SUM(CASE WHEN ${aiUsageLogs.cached} THEN 1 ELSE 0 END)`,
      avgLatencyMs: sql`AVG(CASE WHEN NOT ${aiUsageLogs.cached} AND ${aiUsageLogs.latencyMs} > 0 THEN ${aiUsageLogs.latencyMs} END)`,
    }).from(aiUsageLogs).where(gte(aiUsageLogs.createdAt, thirtyDaysAgo)).groupBy(aiUsageLogs.endpoint);

    const topSpenders = await db.select({
      userId: aiUsageLogs.userId,
      username: users.username,
      totalCost: sql`COALESCE(SUM(${aiUsageLogs.estimatedCostUsd}), 0)`,
      totalCalls: sql`COUNT(*)`,
    }).from(aiUsageLogs)
      .innerJoin(users, eq(aiUsageLogs.userId, users.id))
      .where(gte(aiUsageLogs.createdAt, thirtyDaysAgo))
      .groupBy(aiUsageLogs.userId, users.username)
      .orderBy(sql`SUM(${aiUsageLogs.estimatedCostUsd}) DESC`)
      .limit(10);

    const totalCalls = Number(totals.totalCalls) || 0;
    const cachedCalls = Number(totals.cachedCalls) || 0;

    return {
      ...base,
      aiStats: {
        totalAiCostUsd: parseFloat(totals.totalCostUsd) || 0,
        aiCostLast30Days: parseFloat(totals.totalCostUsd) || 0,
        totalAiCalls: totalCalls,
        cacheHitRate: totalCalls > 0 ? ((cachedCalls / totalCalls) * 100).toFixed(1) : "0.0",
        aiCostByEndpoint: byEndpoint.map(r => ({
          endpoint: r.endpoint,
          totalCost: parseFloat(r.totalCost) || 0,
          totalCalls: Number(r.totalCalls) || 0,
          cacheHits: Number(r.cacheHits) || 0,
          avgLatencyMs: r.avgLatencyMs !== null ? Math.round(parseFloat(r.avgLatencyMs)) : null,
        })),
        topAiSpenders: topSpenders.map(r => ({
          userId: r.userId,
          username: r.username,
          totalCost: parseFloat(r.totalCost) || 0,
          totalCalls: Number(r.totalCalls) || 0,
        })),
      },
    };
  },

  async getTeamStats(parentId) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Single aggregation query across active child users
    const [userAgg] = await db.select({
      totalMembers:               sql`COUNT(*)`,
      totalTeamCreditsUsed:       sql`COALESCE(SUM(${users.creditsUsed}), 0)`,
      totalTeamAiGenerationsToday:sql`COALESCE(SUM(${users.aiGenerationsToday}), 0)`,
      creditsAllocatedToTeam:     sql`COALESCE(SUM(${users.creditsReceived}), 0)`,
      creditsRemainingInTeam:     sql`COALESCE(SUM(${users.creditsReceived} - ${users.creditsAllocated} - ${users.creditsUsed}), 0)`,
    }).from(users).where(and(eq(users.parentId, parentId), eq(users.isActive, true)));

    // Campaign aggregates for all active children (subquery in WHERE avoids fetching IDs first)
    const [campaignAgg] = await db.select({
      totalTeamCampaigns: sql`COUNT(*)`,
      activeThisWeek:     sql`COUNT(DISTINCT CASE WHEN ${campaigns.createdAt} >= ${sevenDaysAgo} THEN ${campaigns.userId} END)`,
    }).from(campaigns).where(
      sql`${campaigns.userId} IN (SELECT id FROM users WHERE parent_id = ${parentId} AND is_active = true)`
    );

    return {
      totalTeamMembers:            parseInt(userAgg?.totalMembers             || 0),
      activeThisWeek:              parseInt(campaignAgg?.activeThisWeek       || 0),
      totalTeamCampaigns:          parseInt(campaignAgg?.totalTeamCampaigns   || 0),
      totalTeamCreditsUsed:        parseInt(userAgg?.totalTeamCreditsUsed     || 0),
      totalTeamAiGenerationsToday: parseInt(userAgg?.totalTeamAiGenerationsToday || 0),
      creditsAllocatedToTeam:      parseInt(userAgg?.creditsAllocatedToTeam   || 0),
      creditsRemainingInTeam:      parseInt(userAgg?.creditsRemainingInTeam   || 0),
    };
  },

  async getUsersWithStats(parentId, isRootAdmin = false) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 1. Fetch users — workspace-scoped, not platform-wide, when isRootAdmin.
    let userRows;
    if (isRootAdmin) {
      const rootId = await this.resolveWorkspaceRootId(parentId);
      const memberIds = await this.getWorkspaceMemberIds(rootId);
      memberIds.delete(rootId); // exclude the admin themselves — matches prior "children only" shape
      userRows = memberIds.size === 0
        ? []
        : await db.select().from(users).where(inArray(users.id, [...memberIds])).orderBy(desc(users.createdAt));
    } else {
      userRows = await db.select().from(users).where(eq(users.parentId, parentId)).orderBy(desc(users.createdAt));
    }

    if (userRows.length === 0) return [];

    const userIds = userRows.map(u => u.id);

    // 2. Campaign stats per user — one aggregation query with inArray
    const statsRows = await db.select({
      userId:          campaigns.userId,
      total:           sql`COUNT(*)`,
      lastAt:          sql`MAX(${campaigns.createdAt})`,
      activeRecently:  sql`BOOL_OR(${campaigns.createdAt} >= ${sevenDaysAgo})`,
      runningReserved: sql`COALESCE(SUM(CASE WHEN ${campaigns.status} = 'RUNNING' THEN ${campaigns.totalEmails} - ${campaigns.sentEmails} ELSE 0 END), 0)`,
    }).from(campaigns)
      .where(drizzleOps.inArray(campaigns.userId, userIds))
      .groupBy(campaigns.userId);

    const statsByUserId = Object.fromEntries(statsRows.map(r => [r.userId, r]));

    // 3. Resolve parent's plan once to apply AI limit inheritance for free-tier children
    const parentEffectivePlan = await this.getEffectivePlan(parentId);

    // 4. Merge
    const now = Date.now();
    const reclaimAfterWarningMs = (INACTIVITY_THRESHOLDS.RECLAIM_ELIGIBLE_DAYS - INACTIVITY_THRESHOLDS.WARNING_DAYS) * 86400000;
    return userRows.map(u => {
      const s = statsByUserId[u.id] || {};
      const childPlan = (u.plan && u.plan !== "free") ? u.plan : parentEffectivePlan;
      const { passwordHash, ...safe } = u;
      const creditsRemaining = (u.creditsReceived || 0) - (u.creditsAllocated || 0) - (u.creditsUsed || 0);
      const runningReserved = parseInt(s.runningReserved || 0);
      return {
        ...safe,
        creditsRemaining,
        safeReclaimable:     Math.max(0, creditsRemaining - runningReserved),
        totalCampaigns:      parseInt(s.total || 0),
        lastCampaignAt:      s.lastAt || null,
        isActiveThisWeek:    s.activeRecently || false,
        aiGenerationsToday:  u.aiGenerationsToday || 0,
        aiDailyLimit:        AI_DAILY_LIMITS[childPlan] ?? AI_DAILY_LIMITS.free,
        daysInactive:        Math.floor((now - new Date(u.lastActivityAt || u.createdAt).getTime()) / 86400000),
        isReclaimEligible:   Boolean(
                               u.inactivityWarningSentAt &&
                               u.inactivityKeepToken &&
                               new Date(u.inactivityWarningSentAt) < new Date(Date.now() - 60 * 86400000)
                             ),
      };
    });
  },

  async initializeRootAdmin() {
    try {
      const adminUsername = process.env.ADMIN_USERNAME || "admin";
      const adminPassword = process.env.ADMIN_PASSWORD || "changeme123";
      const adminEmail = process.env.ADMIN_EMAIL || "admin@repmail.io";

      const existingAdmin = await this.getUserByUsername(adminUsername);
      if (existingAdmin) {
        console.log("Root admin already exists");
        return this.sanitizeUser(existingAdmin);
      }

      const admin = await this.createUser({
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
        role: USER_ROLES.ROOT_ADMIN,
        creditsReceived: 100000,
        mustResetPassword: true,
        isTrialUser: false,
        plan: "enterprise"
      });
      
      console.log("Root admin created - password reset required on first login");
      return admin;
    } catch (err) {
      console.error("Failed to initialize root admin:", err);
      return null;
    }
  },

  async createPayment(paymentData) {
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const [payment] = await db.insert(payments).values({
      ...paymentData,
      invoiceNumber
    }).returning();
    
    await this.createAuditLog({
      userId: paymentData.userId,
      action: AUDIT_ACTIONS.PAYMENT_INITIATED,
      targetType: "payment",
      targetId: payment.id,
      details: { 
        planName: paymentData.planName, 
        credits: paymentData.credits, 
        amountUsd: paymentData.amountUsd,
        amountLocal: paymentData.amountLocal,
        currency: paymentData.currency
      }
    });
    
    return payment;
  },

  async completePayment(paymentId, transactionId) {
    const payment = await this.getPayment(paymentId);
    if (!payment) throw new Error("Payment not found");
    // Fast path: already completed — no writes needed.
    if (payment.status === PAYMENT_STATUS.SUCCESS) return { payment, credited: false };

    const user = await this.getUserById(payment.userId);
    const balanceBefore = user?.creditsRemaining ?? 0;

    let credited = false;
    await db.transaction(async (tx) => {
      // Atomic state transition. .returning() exposes whether the WHERE clause
      // matched — i.e., whether THIS caller won the PENDING → SUCCESS race.
      // Under READ COMMITTED, two concurrent callers can both pass the fast-path
      // check above before either commits. The first to execute this UPDATE acquires
      // the row lock and sets status=SUCCESS (1 row returned). The second caller's
      // UPDATE re-evaluates the WHERE after the lock releases, sees status=SUCCESS,
      // and returns 0 rows. Credit allocation is gated on this result, so only the
      // winning caller allocates credits.
      const transitioned = await tx.update(payments)
        .set({ status: PAYMENT_STATUS.SUCCESS, transactionId, completedAt: new Date() })
        .where(and(eq(payments.id, paymentId), sql`status != 'SUCCESS'`))
        .returning({ id: payments.id });

      if (transitioned.length === 0) return; // concurrent caller won; no credit mutation

      await tx.update(users)
        .set({
          creditsReceived: sql`credits_received + ${payment.credits}`,
          isTrialUser: false,
          updatedAt: new Date()
        })
        .where(eq(users.id, payment.userId));

      await tx.insert(creditTransactions).values({
        userId: payment.userId,
        type: "purchase",
        amount: payment.credits,
        balanceBefore,
        balanceAfter: balanceBefore + payment.credits,
        description: `Purchased ${payment.credits} credits - ${payment.planName}`
      });
      credited = true;
    });

    if (credited) {
      await this.createAuditLog({
        userId: payment.userId,
        action: AUDIT_ACTIONS.PAYMENT_SUCCESS,
        targetType: "payment",
        targetId: paymentId,
        details: { credits: payment.credits, transactionId }
      });
    }

    return { payment: await this.getPayment(paymentId), credited };
  },

  async cancelPayment(paymentId) {
    const payment = await this.getPayment(paymentId);
    if (!payment) throw new Error("Payment not found");
    if (payment.status === PAYMENT_STATUS.SUCCESS) return;

    await db.update(payments)
      .set({ status: PAYMENT_STATUS.CANCELLED })
      .where(and(eq(payments.id, paymentId), sql`status != 'SUCCESS'`));

    await this.createAuditLog({
      userId: payment.userId,
      action: AUDIT_ACTIONS.PAYMENT_CANCELLED,
      targetType: "payment",
      targetId: paymentId,
      details: { reason: "User cancelled" }
    });
  },

  async failPayment(paymentId, reason) {
    const payment = await this.getPayment(paymentId);
    if (!payment) throw new Error("Payment not found");
    if (payment.status === PAYMENT_STATUS.SUCCESS) return; // never downgrade a completed payment

    await db.update(payments)
      .set({ status: PAYMENT_STATUS.FAILED })
      .where(and(eq(payments.id, paymentId), sql`status != 'SUCCESS'`));
    
    await this.createAuditLog({
      userId: payment.userId,
      action: AUDIT_ACTIONS.PAYMENT_FAILED,
      targetType: "payment",
      targetId: paymentId,
      details: { reason }
    });
  },

  async getPayment(id) {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || null;
  },

  async getPaymentByRazorpayOrderId(orderId) {
    const [payment] = await db.select().from(payments)
      .where(sql`metadata->>'razorpay_order_id' = ${orderId}`);
    return payment || null;
  },

  async getUserPayments(userId) {
    return await db.select().from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));
  },

  async createContactSubmission(data) {
    const [submission] = await db.insert(contactSubmissions).values(data).returning();
    
    await this.createAuditLog({
      userId: data.userId || null,
      action: AUDIT_ACTIONS.CONTACT_FORM_SUBMITTED,
      targetType: "contact_submission",
      targetId: submission.id,
      details: { reason: data.reason, email: data.email }
    });
    
    return submission;
  },

  async getContactSubmissions(filters = {}) {
    let query = db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt));
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    return await query;
  },

  async markContactSubmissionRead(id) {
    const [submission] = await db.update(contactSubmissions)
      .set({ isRead: true })
      .where(eq(contactSubmissions.id, id))
      .returning();
    return submission;
  },

  async addToWaitlist(data) {
    try {
      const [entry] = await db.insert(waitlist).values({
        email: data.email.toLowerCase().trim(),
        source: data.source || null
      }).returning();
      return entry;
    } catch (err) {
      if (err.code === '23505') {
        throw new Error("DUPLICATE_EMAIL");
      }
      throw err;
    }
  },

  async getWaitlistCount() {
    const [result] = await db.select({ count: sql`count(*)` }).from(waitlist);
    return parseInt(result.count, 10);
  },

  async getWaitlistEntries(limit = 100) {
    return await db.select().from(waitlist)
      .orderBy(desc(waitlist.createdAt))
      .limit(limit);
  },

  async getTrialCreditsRemaining(userId) {
    const user = await this.getUserById(userId);
    if (!user) return 0;
    return Math.max(0, (user.trialCredits || 5) - (user.trialCreditsUsed || 0));
  },

  async useTrialCredit(userId, campaignId) {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");
    
    const remaining = (user.trialCredits || 5) - (user.trialCreditsUsed || 0);
    if (remaining <= 0) {
      throw new Error("No trial credits remaining");
    }
    
    await db.update(users)
      .set({ 
        trialCreditsUsed: sql`trial_credits_used + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    
    return remaining - 1;
  },

  async getTotalCreditsAvailable(userId) {
    const user = await this.getUserById(userId);
    if (!user) return { paid: 0, free: 0, trial: 0, total: 0, isTrialUser: false, isFreePlan: false };

    const freePlanEnabled = process.env.FREE_PLAN_ENABLED === "true";
    const paidRemaining = Math.max(0,
      (user.creditsReceived || 0) - (user.creditsAllocated || 0) - (user.creditsUsed || 0)
    );

    let freeRemaining = 0;
    let isFreePlan = false;
    const monthlyGrant = MONTHLY_CREDITS[user.plan] ?? 0;

    if (freePlanEnabled && !user.isTrialUser && monthlyGrant > 0) {
      isFreePlan = true;
      // Lazy refresh: if the renewal period has expired, treat used as 0 for display.
      // The actual DB reset happens in deductCreditAtomic on the next send.
      // Use createdAt as the baseline when never reset — matches the DB WHERE clause.
      const resetAt = user.freeCreditsResetAt;
      const refDate = resetAt ? new Date(resetAt) : new Date(user.createdAt);
      const nextResetDate = new Date(refDate);
      nextResetDate.setUTCMonth(nextResetDate.getUTCMonth() + 1);
      const isStale = new Date() >= nextResetDate;
      const effectiveUsed = isStale ? 0 : (user.freeCreditsUsed || 0);
      freeRemaining = Math.max(0, monthlyGrant - effectiveUsed);
    }

    // Legacy trial credits (backward compat until backfill completes)
    const trialRemaining = (!freePlanEnabled && user.isTrialUser)
      ? Math.max(0, (user.trialCredits || 5) - (user.trialCreditsUsed || 0))
      : 0;

    // Next reset date: 1 month after last reset (or signup if never reset)
    const resetAt = user.freeCreditsResetAt;
    const refDate = resetAt ? new Date(resetAt) : new Date(user.createdAt);
    const nextResetDate = new Date(refDate);
    nextResetDate.setUTCMonth(nextResetDate.getUTCMonth() + 1);

    return {
      paid: paidRemaining,
      free: freeRemaining,
      trial: trialRemaining,           // kept for backward compat; 0 after backfill
      total: paidRemaining + freeRemaining + trialRemaining,
      isTrialUser: user.isTrialUser,   // kept for backward compat
      isFreePlan,
      freeResetDate: isFreePlan ? nextResetDate.toISOString() : null,
      monthlyFreeCredits: isFreePlan ? monthlyGrant : 0,
    };
  },

  async getEffectivePlan(userId) {
    // Walk the full ancestor chain so a USER under a free-plan SUB_ADMIN still
    // inherits the ROOT_ADMIN's enterprise quota (GAP-6 fix).
    const visited = new Set();
    let currentId = userId;
    while (currentId) {
      if (visited.has(currentId)) break; // cycle guard
      visited.add(currentId);
      const user = await this.getUserById(currentId);
      if (!user) break;
      if (user.plan && user.plan !== "free") return user.plan;
      if (!user.parentId) break;
      currentId = user.parentId;
    }
    return "free";
  },

  // ── Workspace resolution (tenant-isolation fix) ────────────────────────────
  // A "workspace" is the ROOT_ADMIN and its full descendant tree. These two
  // helpers are the single source of truth for "which users belong to the
  // same workspace as this caller" — used everywhere a ROOT_ADMIN/isSecondaryRoot
  // caller's reach must be scoped to their own org, not the whole platform.

  async resolveWorkspaceRootId(userId) {
    // Walk parentId to the top of the chain. Cycle-guarded, same idiom as
    // getEffectivePlan. A true ROOT_ADMIN resolves to themselves (parentId=null).
    const visited = new Set();
    let currentId = userId;
    let current = await this.getUserById(currentId);
    while (current) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      if (!current.parentId) return current.id;
      current = await this.getUserById(current.parentId);
    }
    return userId;
  },

  async getWorkspaceMemberIds(rootId) {
    // Depth is fixed at exactly two hops (routes.js only ever lets a SUB_ADMIN
    // create role USER, never another SUB_ADMIN) — a two-level walk is
    // exhaustive, not an approximation. Returns the root itself plus every
    // descendant (isActive or not — callers needing "active only" filter separately).
    const level1 = await db.select({ id: users.id }).from(users).where(eq(users.parentId, rootId));
    const level1Ids = level1.map(u => u.id);
    let level2Ids = [];
    if (level1Ids.length > 0) {
      const level2 = await db.select({ id: users.id }).from(users).where(inArray(users.parentId, level1Ids));
      level2Ids = level2.map(u => u.id);
    }
    return new Set([rootId, ...level1Ids, ...level2Ids]);
  },

  async checkAndIncrementAiQuota(userId) {
    const effectivePlan = await this.getEffectivePlan(userId);
    const limit = AI_DAILY_LIMITS[effectivePlan] ?? AI_DAILY_LIMITS.free;
    if (limit === Infinity) return { allowed: true, remaining: Infinity, resetsAt: null };

    return await db.transaction(async (tx) => {
      const [user] = await tx.select({
        aiGenerationsToday: users.aiGenerationsToday,
        aiGenerationsResetAt: users.aiGenerationsResetAt,
      }).from(users).where(eq(users.id, userId));

      if (!user) throw new Error("User not found");

      const now = new Date();
      const needsReset = !user.aiGenerationsResetAt ||
        (now.getTime() - new Date(user.aiGenerationsResetAt).getTime()) > 24 * 60 * 60 * 1000;

      const currentCount = needsReset ? 0 : (user.aiGenerationsToday || 0);
      const windowStart = needsReset ? now : new Date(user.aiGenerationsResetAt);
      const resetsAt = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);

      if (currentCount >= limit) {
        return { allowed: false, remaining: 0, resetsAt };
      }

      await tx.update(users)
        .set(needsReset
          ? { aiGenerationsToday: 1, aiGenerationsResetAt: now, updatedAt: now }
          : { aiGenerationsToday: sql`ai_generations_today + 1`, updatedAt: now }
        )
        .where(eq(users.id, userId));

      return { allowed: true, remaining: limit - currentCount - 1, resetsAt };
    });
  },

  async refundAiQuota(userId) {
    const now = new Date();
    await db.update(users)
      .set({ aiGenerationsToday: sql`GREATEST(ai_generations_today - 1, 0)`, updatedAt: now })
      .where(eq(users.id, userId));
  },

  // ── Campaign Emails ────────────────────────────────────────────────────────

  async createCampaignEmail(data) {
    const [record] = await db.insert(campaignEmails).values({
      campaignId: data.campaignId,
      userId: data.userId,
      contactId: data.contactId || null,
      recipientEmail: data.recipientEmail,
      status: data.status || CAMPAIGN_EMAIL_STATUS.PENDING,
    }).returning();
    return record;
  },

  // PAR-TRUST-017 §7.1 — atomic at-most-once claim for a (campaign, contact) pair.
  // Replaces the previous SELECT-then-INSERT (check-then-act, not atomic) in the
  // send loop. Two atomic steps, either of which can be the one that "wins":
  //
  //  1. Reclaim: if a row already exists in FAILED state with a transient,
  //     non-permanent reason, atomically flip it back to PENDING via a single
  //     WHERE-guarded UPDATE. This is genuinely exclusive: the guard requires
  //     status='FAILED', and the update itself changes status away from FAILED,
  //     so a second concurrent attempt against the same row no longer matches
  //     the WHERE clause once the first commits — real mutual exclusion.
  //
  //     Deliberately does NOT reclaim a row that is already PENDING. Caught by
  //     this PAR's own verification (a concurrency test proved it): an UPDATE
  //     guarded on status='PENDING' that sets status back to PENDING is a
  //     no-op transition — the guarded value never changes, so it provides no
  //     exclusion at all, and every concurrent claimant would "win" the same
  //     row. A PENDING row is either being actively processed by whoever holds
  //     it (must not be touched), or is orphaned from a dead process — in which
  //     case finalizeCampaign's orphan cleanup (§7.3) will convert it to
  //     FAILED("campaign_terminated", not a permanent reason) once this
  //     campaign is finalized, making it legitimately reclaimable afterward.
  //  2. Create: if no row exists yet, INSERT ... ON CONFLICT DO NOTHING. The
  //     conflict target is the two partial unique indexes on campaign_emails —
  //     if a row already exists in ANY other state (PENDING, SENT, SUPPRESSED,
  //     BOUNCED, COMPLAINED, or FAILED with a permanent reason), this is a
  //     no-op and the contact is correctly never sent to again.
  //
  // Either way, exactly one caller ever wins the claim for a given contact at a
  // given moment, regardless of how many executions are concurrently attempting
  // it or why — this is what makes double-send structurally impossible.
  async claimCampaignEmail(data) {
    const matchTarget = data.contactId
      ? eq(campaignEmails.contactId, data.contactId)
      : and(isNull(campaignEmails.contactId), eq(campaignEmails.recipientEmail, data.recipientEmail));

    const [reclaimed] = await db.update(campaignEmails)
      .set({ status: CAMPAIGN_EMAIL_STATUS.PENDING, failureReason: null })
      .where(and(
        eq(campaignEmails.campaignId, data.campaignId),
        matchTarget,
        eq(campaignEmails.status, CAMPAIGN_EMAIL_STATUS.FAILED),
        or(
          isNull(campaignEmails.failureReason),
          notInArray(campaignEmails.failureReason, PERMANENT_FAILURE_REASONS)
        )
      ))
      .returning();
    if (reclaimed) return reclaimed;

    const [created] = await db.insert(campaignEmails).values({
      campaignId: data.campaignId,
      userId: data.userId,
      contactId: data.contactId || null,
      recipientEmail: data.recipientEmail,
      status: CAMPAIGN_EMAIL_STATUS.PENDING,
    }).onConflictDoNothing().returning();
    return created || null; // null means someone else already claimed (or terminally owns) this contact
  },

  async updateCampaignEmail(id, updates) {
    const [record] = await db.update(campaignEmails)
      .set(updates)
      .where(eq(campaignEmails.id, id))
      .returning();
    return record || null;
  },

  async getCampaignEmailBySesMessageId(sesMessageId) {
    const [record] = await db.select().from(campaignEmails)
      .where(eq(campaignEmails.sesMessageId, sesMessageId));
    return record || null;
  },

  async getCampaignEmailsByCampaign(campaignId, limit = 50) {
    return await db.select().from(campaignEmails)
      .where(eq(campaignEmails.campaignId, campaignId))
      .orderBy(desc(campaignEmails.createdAt))
      .limit(limit);
  },

  async getCampaignEmailByContact(campaignId, contactId) {
    const [record] = await db.select().from(campaignEmails)
      .where(and(
        eq(campaignEmails.campaignId, campaignId),
        eq(campaignEmails.contactId, contactId)
      ));
    return record || null;
  },

  async hasAnySentEmails(campaignId) {
    const [record] = await db.select().from(campaignEmails)
      .where(and(
        eq(campaignEmails.campaignId, campaignId),
        eq(campaignEmails.status, CAMPAIGN_EMAIL_STATUS.SENT)
      ))
      .limit(1);
    return Boolean(record);
  },

  // Production-equivalence validation (real Postgres, not memoryStorage) caught
  // a genuine race the in-memory backend's cooperative scheduling was masking:
  // when two executions of runCampaignLoop race the same campaign to natural
  // completion, each iterates the *entire* contact list itself and treats a
  // contact claimed by the other as "not mine to count" — but reaching the end
  // of its own iteration does not mean the other execution has finished
  // writing its own last claimed row. A PENDING row is exactly the signal that
  // some execution still holds unfinished work; only once none remain
  // campaign-wide is it safe to derive final counts and finalize as COMPLETED.
  async hasOutstandingClaims(campaignId) {
    const [record] = await db.select().from(campaignEmails)
      .where(and(
        eq(campaignEmails.campaignId, campaignId),
        eq(campaignEmails.status, CAMPAIGN_EMAIL_STATUS.PENDING)
      ))
      .limit(1);
    return Boolean(record);
  },

  // ── Suppressions ───────────────────────────────────────────────────────────

  async addSuppression(userId, email, source, reason = null) {
    const normalizedEmail = email.toLowerCase().trim();
    await db.insert(suppressions)
      .values({ userId, email: normalizedEmail, source, reason })
      .onConflictDoNothing();
    console.log(`[SUPPRESSION] userId=${userId} email=${normalizedEmail} source=${source}`);
  },

  async isSuppressed(userId, email) {
    const normalizedEmail = email.toLowerCase().trim();
    const [record] = await db.select({ id: suppressions.id })
      .from(suppressions)
      .where(and(
        eq(suppressions.userId, userId),
        eq(suppressions.email, normalizedEmail)
      ));
    return !!record;
  },

  async getSuppressions(userId) {
    return await db.select().from(suppressions)
      .where(eq(suppressions.userId, userId))
      .orderBy(desc(suppressions.createdAt));
  },

  async deleteSuppression(id, userId) {
    const [deleted] = await db.delete(suppressions)
      .where(and(
        eq(suppressions.id, id),
        eq(suppressions.userId, userId)
      ))
      .returning();
    return deleted || null;
  },

  // Platform-wide suppression check — covers bounce, complaint, and unsubscribe across all users.
  // A contact suppressed by any user on the platform is unsafe to email from any campaign.
  async isGloballySuppressed(email) {
    const normalizedEmail = email.toLowerCase().trim();
    const [record] = await db.select({ id: suppressions.id })
      .from(suppressions)
      .where(eq(suppressions.email, normalizedEmail))
      .limit(1);
    return !!record;
  },

  // Returns the count of emails from the provided array that are already globally suppressed.
  // Used at campaign creation to inform the user before the campaign starts. Does not block.
  async getPreCampaignSuppressionCount(emails) {
    if (!emails || emails.length === 0) return 0;
    const normalized = emails.map(e => e.toLowerCase().trim());
    const result = await db.select({ email: suppressions.email })
      .from(suppressions)
      .where(drizzleOps.inArray(suppressions.email, normalized));
    return new Set(result.map(r => r.email)).size;
  },

  // Returns the suppression record for a specific email, preferring the per-user record.
  // Pass userId=null to skip the per-user check and search globally only.
  async getSuppressionRecord(userId, email) {
    const normalizedEmail = email.toLowerCase().trim();
    if (userId) {
      const [record] = await db.select({
        source:    suppressions.source,
        reason:    suppressions.reason,
        createdAt: suppressions.createdAt,
      })
        .from(suppressions)
        .where(and(eq(suppressions.userId, userId), eq(suppressions.email, normalizedEmail)));
      if (record) return record;
    }
    const [record] = await db.select({
      source:    suppressions.source,
      reason:    suppressions.reason,
      createdAt: suppressions.createdAt,
    })
      .from(suppressions)
      .where(eq(suppressions.email, normalizedEmail))
      .limit(1);
    return record || null;
  },

  // Batch-fetch suppression details for a list of emails. Returns Map<email, detail>.
  // Prefers the record owned by campaignUserId; falls back to any matching record.
  async getSuppressionDetailsForEmails(campaignUserId, emails) {
    if (!emails || emails.length === 0) return new Map();
    const normalized = emails.map(e => e.toLowerCase().trim());
    const records = await db.select({
      email:     suppressions.email,
      userId:    suppressions.userId,
      source:    suppressions.source,
      reason:    suppressions.reason,
      createdAt: suppressions.createdAt,
    })
      .from(suppressions)
      .where(drizzleOps.inArray(suppressions.email, normalized));
    const byEmail = new Map();
    for (const r of records) {
      if (!byEmail.has(r.email) || r.userId === campaignUserId) {
        byEmail.set(r.email, {
          source:       r.source,
          reason:       r.reason,
          suppressedAt: r.createdAt,
          scope:        r.userId === campaignUserId ? "user" : "global",
        });
      }
    }
    return byEmail;
  },

  // ── SNS event deduplication ────────────────────────────────────────────────

  async getSnsEvent(messageId) {
    const [record] = await db.select().from(snsEvents)
      .where(eq(snsEvents.messageId, messageId));
    return record || null;
  },

  async createSnsEvent(messageId, eventType) {
    const rows = await db.insert(snsEvents)
      .values({ messageId, eventType, processed: false })
      .onConflictDoNothing()
      .returning({ messageId: snsEvents.messageId });
    return rows.length > 0; // true = claimed, false = concurrent delivery won the race
  },

  async updateSnsEventProcessed(messageId) {
    await db.update(snsEvents)
      .set({ processed: true })
      .where(eq(snsEvents.messageId, messageId));
  },

  async deleteOldSnsEvents() {
    const cutoff = new Date(Date.now() - 7 * 86400000);
    await db.delete(snsEvents).where(lt(snsEvents.processedAt, cutoff));
  },

  async incrementCampaignBounced(campaignId) {
    await db.update(campaigns)
      .set({ bouncedEmails: sql`${campaigns.bouncedEmails} + 1` })
      .where(eq(campaigns.id, campaignId));
  },

  async incrementCampaignComplained(campaignId) {
    await db.update(campaigns)
      .set({ complainedEmails: sql`${campaigns.complainedEmails} + 1` })
      .where(eq(campaigns.id, campaignId));
  },

  async getCampaignEmailById(id) {
    const [record] = await db.select().from(campaignEmails)
      .where(eq(campaignEmails.id, id));
    return record || null;
  },

  // Atomically sets openedAt only on the first open event; returns { wasFirst: boolean }.
  async updateCampaignEmailOpened(campaignEmailId) {
    const rows = await db.update(campaignEmails)
      .set({ openedAt: new Date() })
      .where(and(
        eq(campaignEmails.id, campaignEmailId),
        sql`${campaignEmails.openedAt} IS NULL`
      ))
      .returning({ id: campaignEmails.id });
    return { wasFirst: rows.length > 0 };
  },

  // Atomically sets clickedAt only on the first click event; returns { wasFirst: boolean }.
  async updateCampaignEmailClicked(campaignEmailId) {
    const rows = await db.update(campaignEmails)
      .set({ clickedAt: new Date() })
      .where(and(
        eq(campaignEmails.id, campaignEmailId),
        sql`${campaignEmails.clickedAt} IS NULL`
      ))
      .returning({ id: campaignEmails.id });
    return { wasFirst: rows.length > 0 };
  },

  // Atomically sets deliveredAt only on the first delivery event; returns { wasFirst: boolean }.
  async updateCampaignEmailDelivered(campaignEmailId) {
    const rows = await db.update(campaignEmails)
      .set({ deliveredAt: new Date() })
      .where(and(
        eq(campaignEmails.id, campaignEmailId),
        sql`${campaignEmails.deliveredAt} IS NULL`
      ))
      .returning({ id: campaignEmails.id });
    return { wasFirst: rows.length > 0 };
  },

  // Atomically transitions a row to BOUNCED only if it isn't already — unlike
  // delivered/opened/clicked (separate timestamp columns), bounce/complaint share
  // the single `status` column, so the guard is "not already this terminal status"
  // rather than "column IS NULL". Prevents a real double-count: SES/SNS can emit
  // more than one bounce notification for the same recipient (e.g. a soft-then-hard
  // bounce sequence), and without this gate each one incremented bouncedEmails
  // again — inflating the Bounce Rate KPI and, since that KPI also feeds the
  // auto-pause threshold, capable of triggering auto-pause earlier than warranted.
  async updateCampaignEmailBounced(campaignEmailId) {
    const rows = await db.update(campaignEmails)
      .set({ status: CAMPAIGN_EMAIL_STATUS.BOUNCED })
      .where(and(
        eq(campaignEmails.id, campaignEmailId),
        sql`${campaignEmails.status} != ${CAMPAIGN_EMAIL_STATUS.BOUNCED}`
      ))
      .returning({ id: campaignEmails.id });
    return { wasFirst: rows.length > 0 };
  },

  // Same idempotency fix as updateCampaignEmailBounced, for complaints.
  async updateCampaignEmailComplained(campaignEmailId) {
    const rows = await db.update(campaignEmails)
      .set({ status: CAMPAIGN_EMAIL_STATUS.COMPLAINED })
      .where(and(
        eq(campaignEmails.id, campaignEmailId),
        sql`${campaignEmails.status} != ${CAMPAIGN_EMAIL_STATUS.COMPLAINED}`
      ))
      .returning({ id: campaignEmails.id });
    return { wasFirst: rows.length > 0 };
  },

  async incrementCampaignOpened(campaignId) {
    await db.update(campaigns)
      .set({ openedEmails: sql`${campaigns.openedEmails} + 1` })
      .where(eq(campaigns.id, campaignId));
  },

  async incrementCampaignClicked(campaignId) {
    await db.update(campaigns)
      .set({ clickedEmails: sql`${campaigns.clickedEmails} + 1` })
      .where(eq(campaigns.id, campaignId));
  },

  async incrementCampaignDelivered(campaignId) {
    await db.update(campaigns)
      .set({ deliveredEmails: sql`${campaigns.deliveredEmails} + 1` })
      .where(eq(campaigns.id, campaignId));
  },

  // ── M11: Unsubscribe analytics ─────────────────────────────────────────────

  // Records the first unsubscribe event for a specific campaign_email row.
  // campaignId is required for exact attribution — only the record for that specific
  // campaign is updated, never a heuristic "most recent" lookup.
  // Returns { campaignId } if the row was found and updated (first event), or null otherwise.
  async recordCampaignEmailUnsubscribed(recipientEmail, userId, campaignId) {
    const normalizedEmail = recipientEmail.toLowerCase().trim();
    const rows = await db.update(campaignEmails)
      .set({ unsubscribedAt: new Date() })
      .where(and(
        eq(campaignEmails.campaignId, campaignId),
        eq(campaignEmails.userId, userId),
        eq(campaignEmails.recipientEmail, normalizedEmail),
        sql`${campaignEmails.status} != ${CAMPAIGN_EMAIL_STATUS.SUPPRESSED}`,
        sql`${campaignEmails.unsubscribedAt} IS NULL`
      ))
      .returning({ campaignId: campaignEmails.campaignId });
    return rows.length > 0 ? { campaignId: rows[0].campaignId } : null;
  },

  async incrementCampaignUnsubscribed(campaignId) {
    await db.update(campaigns)
      .set({ unsubscribedEmails: sql`${campaigns.unsubscribedEmails} + 1` })
      .where(eq(campaigns.id, campaignId));
  },

  // ── Invites ────────────────────────────────────────────────────────────────

  async createInvite(data) {
    const [invite] = await db.insert(invites).values({
      email: data.email,
      role: data.role,
      invitedBy: data.invitedBy,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
    }).returning();
    return invite;
  },

  async getInviteByTokenHash(tokenHash) {
    const [invite] = await db.select().from(invites).where(eq(invites.tokenHash, tokenHash));
    return invite || null;
  },

  async getInviteById(id) {
    const [invite] = await db.select().from(invites).where(eq(invites.id, id));
    return invite || null;
  },

  async getPendingInvitesByAdmin(invitedBy) {
    return await db.select().from(invites)
      .where(eq(invites.invitedBy, invitedBy))
      .orderBy(desc(invites.createdAt));
  },

  async markInviteAccepted(id) {
    const [invite] = await db.update(invites)
      .set({ acceptedAt: new Date() })
      .where(eq(invites.id, id))
      .returning();
    return invite || null;
  },

  async updateInviteToken(id, tokenHash, expiresAt) {
    const [invite] = await db.update(invites)
      .set({ tokenHash, expiresAt })
      .where(eq(invites.id, id))
      .returning();
    return invite || null;
  },

  async deleteExpiredInvites() {
    const deleted = await db.delete(invites)
      .where(and(
        lt(invites.expiresAt, new Date()),
        sql`${invites.acceptedAt} IS NULL`,
      ))
      .returning({ id: invites.id });
    return deleted.length;
  },

  async getChildUserCount(parentId) {
    const [result] = await db.select({ count: sql`COUNT(*)` })
      .from(users)
      .where(and(
        eq(users.parentId, parentId),
        eq(users.isActive, true),
      ));
    return parseInt(result.count, 10);
  },

  // ── Inactivity Governance ──────────────────────────────────────────────────

  async updateUserActivity(userId) {
    const [before] = await db.select({ isDormant: users.isDormant })
      .from(users).where(eq(users.id, userId));

    await db.update(users).set({
      lastActivityAt: new Date(),
      inactivityWarningSentAt: null,
      inactivityKeepToken: null,
      inactivityKeepTokenExpiresAt: null,
      isDormant: false,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    if (before?.isDormant) {
      await this.createAuditLog({
        userId,
        action: AUDIT_ACTIONS.USER_REACTIVATED,
        targetType: "user",
        targetId: userId,
      });
    }
  },

  async setUserDormant(userId) {
    const user = await this.getUserById(userId);
    if (!user) return;

    await db.update(users).set({
      isDormant: true,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    const daysInactive = user.lastActivityAt
      ? Math.floor((Date.now() - new Date(user.lastActivityAt).getTime()) / 86400000)
      : null;

    await this.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.USER_DORMANT,
      targetType: "user",
      targetId: userId,
      details: { daysInactive, creditsRemaining: user.creditsRemaining },
    });
  },

  async getUsersForInactivityCheck() {
    const { WARNING_DAYS } = INACTIVITY_THRESHOLDS;
    const cutoff = new Date(Date.now() - WARNING_DAYS * 24 * 60 * 60 * 1000);

    return await db.select().from(users).where(
      and(
        sql`${users.role} != ${USER_ROLES.ROOT_ADMIN}`,
        eq(users.isSecondaryRoot, false),
        eq(users.isActive, true),
        sql`(
          (${users.lastActivityAt} IS NULL AND ${users.createdAt} < ${cutoff})
          OR ${users.lastActivityAt} < ${cutoff}
        )`
      )
    );
  },

  async autoReclaimCredits(fromUserId, toUserId) {
    const child = await this.getUserById(fromUserId);
    const parent = await this.getUserById(toUserId);
    if (!child || !parent) throw new Error("User not found");

    const [{ reserved }] = await db.select({
      reserved: sql`COALESCE(SUM(${campaigns.totalEmails} - ${campaigns.sentEmails}), 0)`,
    }).from(campaigns).where(
      and(eq(campaigns.userId, fromUserId), eq(campaigns.status, CAMPAIGN_STATUS.RUNNING))
    );
    const runningCampaignCredits = parseInt(reserved || 0);

    const safeReclaim = child.creditsRemaining - runningCampaignCredits;
    if (safeReclaim <= 0) return { amount: 0, skipped: true, protectedCredits: runningCampaignCredits };

    const childBalanceBefore = child.creditsRemaining;
    const parentActualBalance = (parent.creditsReceived || 0) - (parent.creditsAllocated || 0) - (parent.creditsUsed || 0);

    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({ creditsReceived: sql`credits_received - ${safeReclaim}`, updatedAt: new Date() })
        .where(eq(users.id, fromUserId));
      await tx.update(users)
        .set({ creditsAllocated: sql`credits_allocated - ${safeReclaim}`, updatedAt: new Date() })
        .where(eq(users.id, toUserId));
      await tx.insert(creditTransactions).values({
        userId: fromUserId, type: "reclaim_out",
        amount: -safeReclaim,
        balanceBefore: childBalanceBefore, balanceAfter: childBalanceBefore - safeReclaim,
        fromUserId, toUserId,
        description: `${safeReclaim} credits reclaimed — 90 days inactivity`,
      });
      await tx.insert(creditTransactions).values({
        userId: toUserId, type: "reclaim_in",
        amount: safeReclaim,
        balanceBefore: parentActualBalance, balanceAfter: parentActualBalance + safeReclaim,
        fromUserId, toUserId,
        description: `${safeReclaim} credits auto-reclaimed from ${child.username} — 90 days inactivity`,
      });
    });

    await this.createAuditLog({
      userId: toUserId,
      action: AUDIT_ACTIONS.CREDITS_AUTO_RECLAIMED,
      targetType: "user",
      targetId: fromUserId,
      details: { amount: safeReclaim, runningCampaignCredits, reason: "90 days inactivity" },
    });

    return { amount: safeReclaim, skipped: false };
  },

  async validateKeepToken(rawToken) {
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const [user] = await db.select().from(users)
      .where(eq(users.inactivityKeepToken, tokenHash));

    if (!user) return { valid: false, reason: "not_found" };

    if (!user.inactivityKeepTokenExpiresAt || new Date(user.inactivityKeepTokenExpiresAt) < new Date()) {
      return { valid: false, userId: user.id, reason: "expired" };
    }

    // Use audit log to detect reclaim rather than inferring from lastActivityAt.
    // The activity-date check was unreliable: a user inactive 90+ days with a valid
    // (not-yet-cleared) token would incorrectly show as reclaim_already_fired.
    // After Fix 4, clearInactivityToken always runs after Stage C, so a found token
    // means reclaim has not fired — but we still check the audit log for belt-and-suspenders.
    const reclaimLogs = await this.getAuditLogs({
      userId: user.id,
      action: AUDIT_ACTIONS.CREDITS_AUTO_RECLAIMED,
      limit: 1,
    });
    if (reclaimLogs && reclaimLogs.length > 0) {
      return { valid: false, userId: user.id, reason: "reclaim_already_fired" };
    }

    return { valid: true, userId: user.id, user: this.sanitizeUser(user), reason: "valid" };
  },

  async markInactivityWarningSent(userId, tokenHash, tokenExpiresAt) {
    await db.update(users).set({
      inactivityWarningSentAt: new Date(),
      inactivityKeepToken: tokenHash ?? null,
      inactivityKeepTokenExpiresAt: tokenExpiresAt ?? null,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
  },

  // Replaces token hash/expiry only — does NOT touch inactivityWarningSentAt.
  // Used by Stage B dormant email to refresh the raw token for the URL
  // without resetting the dormant timeline clock.
  async updateInactivityToken(userId, tokenHash, tokenExpiresAt) {
    await db.update(users).set({
      inactivityKeepToken: tokenHash,
      inactivityKeepTokenExpiresAt: tokenExpiresAt,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
  },

  // Clears token fields only after Stage C reclaim (or no-ancestor skip).
  // Prevents the next job run from re-entering Stage C for the same user.
  async clearInactivityToken(userId) {
    await db.update(users).set({
      inactivityKeepToken: null,
      inactivityKeepTokenExpiresAt: null,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
  },

  // ── Self-service password reset ────────────────────────────────────────────
  // Raw token goes in email URL, never stored — only SHA-256 hash written to DB.

  async setPasswordResetToken(userId, tokenHash, expiresAt) {
    await db.update(users).set({
      resetToken: tokenHash,
      resetTokenExpiresAt: expiresAt,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
  },

  async getUserByResetToken(tokenHash) {
    const [user] = await db.select().from(users)
      .where(and(
        eq(users.resetToken, tokenHash),
        gte(users.resetTokenExpiresAt, new Date()),
      ));
    return user || null;
  },

  async clearPasswordResetToken(userId) {
    await db.update(users).set({
      resetToken: null,
      resetTokenExpiresAt: null,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
  },

  // ── Secondary Root Admin ───────────────────────────────────────────────────

  async grantSecondaryRoot(userId) {
    await db.update(users).set({
      isSecondaryRoot: true,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
  },

  async revokeSecondaryRoot(userId) {
    await db.update(users).set({
      isSecondaryRoot: false,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
  },

  async getSecondaryRootCount(memberIds) {
    // Scoped to one workspace's member set — previously counted isSecondaryRoot
    // rows platform-wide, so one customer's grants could exhaust the quota for
    // every other customer. memberIds is required; an empty/missing set counts as 0.
    if (!memberIds || memberIds.length === 0) return 0;
    const [result] = await db.select({ count: sql`COUNT(*)` })
      .from(users)
      .where(and(eq(users.isSecondaryRoot, true), inArray(users.id, memberIds)));
    return parseInt(result.count, 10);
  },

  async markAllRootAdminsRecoveryAt(timestamp) {
    await db.update(users)
      .set({ lastEmergencyRecoveryAt: timestamp })
      .where(eq(users.role, USER_ROLES.ROOT_ADMIN));
  },

  // ── Data Cleanup Jobs ──────────────────────────────────────────────────────

  async deleteExpiredSessions() {
    const deleted = await db.delete(sessions)
      .where(lt(sessions.expiresAt, new Date()))
      .returning({ id: sessions.id });
    return deleted.length;
  },

  async pruneAuditLogs(retentionDays) {
    const cutoff = new Date(Date.now() - retentionDays * 86400000);
    const deleted = await db.delete(auditLogs)
      .where(lt(auditLogs.createdAt, cutoff))
      .returning({ id: auditLogs.id });
    return deleted.length;
  },

  async deleteOldCampaignEmails(retentionDays) {
    const cutoff = new Date(Date.now() - retentionDays * 86400000);
    // Delete campaign_email records for COMPLETED or FAILED campaigns older than the cutoff.
    // Uses a subquery so the JOIN stays server-side. RUNNING/PENDING are never touched.
    const deleted = await db.delete(campaignEmails)
      .where(
        sql`${campaignEmails.campaignId} IN (
          SELECT id FROM campaigns
          WHERE status IN ('COMPLETED', 'FAILED')
          AND created_at < ${cutoff}
        )`
      )
      .returning({ id: campaignEmails.id });
    return deleted.length;
  },

  async pruneAiUsageLogs(retentionDays) {
    const cutoff = new Date(Date.now() - retentionDays * 86400000);
    const deleted = await db.delete(aiUsageLogs)
      .where(lt(aiUsageLogs.createdAt, cutoff))
      .returning({ id: aiUsageLogs.id });
    return deleted.length;
  },

  async expireInactivityTokens() {
    const updated = await db.update(users)
      .set({
        inactivityKeepToken: null,
        inactivityKeepTokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          sql`${users.inactivityKeepToken} IS NOT NULL`,
          lt(users.inactivityKeepTokenExpiresAt, new Date()),
        )
      )
      .returning({ id: users.id });
    return updated.length;
  },

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

  async getUserSenderHealth(userId) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const [totals] = await db
      .select({
        totalSent: sql`COALESCE(SUM(sent_emails), 0)`,
        totalBounced: sql`COALESCE(SUM(bounced_emails), 0)`,
        totalComplained: sql`COALESCE(SUM(complained_emails), 0)`,
      })
      .from(campaigns)
      .where(and(eq(campaigns.userId, userId), gte(campaigns.startedAt, sevenDaysAgo)));

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

  async getDeliveryHealthStats() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const [totals] = await db
      .select({
        totalSent: sql`COALESCE(SUM(sent_emails), 0)`,
        totalBounced: sql`COALESCE(SUM(bounced_emails), 0)`,
        totalComplained: sql`COALESCE(SUM(complained_emails), 0)`,
      })
      .from(campaigns)
      .where(gte(campaigns.startedAt, thirtyDaysAgo));

    const sent = Number(totals?.totalSent || 0);
    const bounced = Number(totals?.totalBounced || 0);
    const complained = Number(totals?.totalComplained || 0);
    const bounceRate = sent > 0 ? bounced / sent : 0;
    const complaintRate = sent > 0 ? complained / sent : 0;

    // Thresholds derive from the same env vars the auto-pause logic reads.
    // Warning fires at 50% of the pause threshold so operators see degradation before enforcement.
    const bouncePause = parseFloat(process.env.BOUNCE_RATE_PAUSE_THRESHOLD || "0.08");
    const complaintPause = parseFloat(process.env.COMPLAINT_RATE_PAUSE_THRESHOLD || "0.0005");
    const bounceWarn = bouncePause * 0.5;
    const complaintWarn = complaintPause * 0.5;

    let status = 'healthy';
    if (bounceRate > bouncePause || complaintRate > complaintPause) status = 'critical';
    else if (bounceRate > bounceWarn || complaintRate > complaintWarn) status = 'warning';

    const topBouncers = await db
      .select({
        userId: campaigns.userId,
        userEmail: users.email,
        totalSent: sql`SUM(sent_emails)`,
        totalBounced: sql`SUM(bounced_emails)`,
      })
      .from(campaigns)
      .innerJoin(users, eq(campaigns.userId, users.id))
      .where(gte(campaigns.startedAt, thirtyDaysAgo))
      .groupBy(campaigns.userId, users.email)
      .having(sql`SUM(sent_emails) >= ${MIN_SENDER_HEALTH_SENT}`)
      .orderBy(sql`SUM(bounced_emails)::float / NULLIF(SUM(sent_emails), 0) DESC`)
      .limit(5);

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
        // Clamped for display only — the raw bounceRate/complaintRate fractions
        // above are left untouched for the auto-pause threshold comparison, so
        // this doesn't change when auto-pause fires, only guarantees the
        // printed KPI can never read over 100%.
        bounceRate: parseFloat((Math.min(1, bounceRate) * 100).toFixed(2)),
        complaintRate: parseFloat((Math.min(1, complaintRate) * 100).toFixed(4)),
      },
      thresholds: {
        bounce: { warning: parseFloat((bounceWarn * 100).toFixed(2)), critical: parseFloat((bouncePause * 100).toFixed(2)), unit: '%' },
        complaint: { warning: parseFloat((complaintWarn * 100).toFixed(4)), critical: parseFloat((complaintPause * 100).toFixed(4)), unit: '%' },
      },
      topBouncers: topBouncers.map(u => ({
        userId: u.userId,
        email: u.userEmail,
        sent: Number(u.totalSent),
        bounced: Number(u.totalBounced),
        bounceRate: Number(u.totalSent) > 0
          ? parseFloat((Math.min(100, Number(u.totalBounced) / Number(u.totalSent) * 100)).toFixed(2))
          : 0,
      })),
      suppression: {
        addedLast7d: Number(suppressionLast7d?.count || 0),
        addedLast30d: Number(suppressionLast30d?.count || 0),
      },
    };
  },

  // ── Sender Domains (M9) ────────────────────────────────────────────────────

  async createSenderDomain({ userId, domain, fromEmail, status, dkimTokens, verifyRecord, verificationWindowDays }) {
    const [row] = await db.insert(senderDomains).values({
      userId,
      domain,
      fromEmail,
      status: status || "PENDING_VERIFICATION",
      dkimTokens: dkimTokens || null,
      verifyRecord: verifyRecord || null,
      verificationWindowDays: verificationWindowDays || 14,
    }).returning();
    return row;
  },

  async getSenderDomainsByUserId(userId) {
    return db.select().from(senderDomains).where(eq(senderDomains.userId, userId)).orderBy(desc(senderDomains.createdAt));
  },

  async getSenderDomainById(id) {
    const [row] = await db.select().from(senderDomains).where(eq(senderDomains.id, id));
    return row || null;
  },

  async getSenderDomainByUserIdAndDomain(userId, domain) {
    const [row] = await db.select().from(senderDomains).where(
      and(eq(senderDomains.userId, userId), eq(senderDomains.domain, domain))
    );
    return row || null;
  },

  async getSenderDomainByDomain(domain) {
    const [row] = await db.select().from(senderDomains).where(eq(senderDomains.domain, domain));
    return row || null;
  },

  async getSenderDomainsByStatus(status) {
    return db.select().from(senderDomains).where(eq(senderDomains.status, status));
  },

  async updateSenderDomain(id, updates) {
    const [row] = await db.update(senderDomains).set({ ...updates, updatedAt: new Date() }).where(eq(senderDomains.id, id)).returning();
    return row || null;
  },

  async updateSenderDomainIfPending(id, updates) {
    // Conditional UPDATE: only applies when status = 'PENDING_VERIFICATION'.
    // Prevents the polling job from reverting a domain that was already VERIFIED
    // by a concurrent manual check or a race between poll intervals.
    const [row] = await db.update(senderDomains)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(senderDomains.id, id), eq(senderDomains.status, "PENDING_VERIFICATION")))
      .returning();
    return row || null;
  },

  async deleteSenderDomain(id) {
    await db.delete(senderDomains).where(eq(senderDomains.id, id));
  },

  async getVerifiedDomainForUser(userId, domainId) {
    const [row] = await db.select().from(senderDomains).where(
      and(eq(senderDomains.userId, userId), eq(senderDomains.id, domainId), eq(senderDomains.status, "VERIFIED"))
    );
    return row || null;
  },

  async hasVerifiedDomainForUser(userId) {
    const [row] = await db.select({ id: senderDomains.id }).from(senderDomains)
      .where(and(eq(senderDomains.userId, userId), eq(senderDomains.status, "VERIFIED")))
      .limit(1);
    return !!row;
  },

  // ── M10: Email Analytics Tracking Tokens ──────────────────────────────────────

  async createTrackingTokensForEmail({ campaignEmailId, campaignId, templateLinks, retentionDays }) {
    const expiresAt = new Date(Date.now() + retentionDays * 86_400_000);
    const openToken = generateTrackingToken();

    const rows = [{
      token: openToken,
      tokenType: "open",
      campaignId,
      campaignEmailId,
      linkUrl: null,
      expiresAt,
    }];

    const clickTokenMap = new Map();
    for (const url of templateLinks) {
      const t = generateTrackingToken();
      clickTokenMap.set(url, t);
      rows.push({ token: t, tokenType: "click", campaignId, campaignEmailId, linkUrl: url, expiresAt });
    }

    await db.insert(trackingTokens).values(rows);
    return { openToken, clickTokenMap };
  },

  async getTrackingToken(token) {
    const [row] = await db.select().from(trackingTokens).where(eq(trackingTokens.token, token));
    return row || null;
  },

  async recordOpenResolution(tokenRecord, { uaCategory, ipHash }) {
    const now = new Date();
    const isFirst = tokenRecord.firstUsedAt === null;

    await db.update(trackingTokens)
      .set({
        usedCount: sql`${trackingTokens.usedCount} + 1`,
        lastUserAgentCategory: uaCategory,
        ipHash,
        ...(isFirst ? { firstUsedAt: now } : {}),
      })
      .where(eq(trackingTokens.id, tokenRecord.id));

    if (!isFirst) return;

    // Conditional update: set openedAt only if not already set — deduplication under concurrent requests.
    const updated = await db.update(campaignEmails)
      .set({ openedAt: now })
      .where(and(eq(campaignEmails.id, tokenRecord.campaignEmailId), isNull(campaignEmails.openedAt)))
      .returning({ id: campaignEmails.id });

    if (updated.length > 0) {
      await db.update(campaigns)
        .set({ openedEmails: sql`${campaigns.openedEmails} + 1` })
        .where(eq(campaigns.id, tokenRecord.campaignId));
    }
  },

  async recordClickResolution(tokenRecord, { uaCategory, ipHash }) {
    const now = new Date();
    const isFirst = tokenRecord.firstUsedAt === null;
    const isMachine = isMachineCategory(uaCategory);

    await db.update(trackingTokens)
      .set({
        usedCount: sql`${trackingTokens.usedCount} + 1`,
        lastUserAgentCategory: uaCategory,
        ipHash,
        ...(isFirst ? { firstUsedAt: now } : {}),
      })
      .where(eq(trackingTokens.id, tokenRecord.id));

    // Machine activity (scanners, security gateways): update token only, not campaign_emails.
    // This prevents a scanner pre-click from setting clickedAt before the human even sees the email.
    if (isMachine) return;

    const updated = await db.update(campaignEmails)
      .set({ clickedAt: now })
      .where(and(eq(campaignEmails.id, tokenRecord.campaignEmailId), isNull(campaignEmails.clickedAt)))
      .returning({ id: campaignEmails.id });

    if (updated.length > 0) {
      await db.update(campaigns)
        .set({ clickedEmails: sql`${campaigns.clickedEmails} + 1` })
        .where(eq(campaigns.id, tokenRecord.campaignId));
    }
  },

  async getCampaignTrackingBreakdown(campaignId) {
    const rows = await db
      .select({
        tokenType: trackingTokens.tokenType,
        uaCategory: trackingTokens.lastUserAgentCategory,
        count: sql`COUNT(*)`.mapWith(Number),
      })
      .from(trackingTokens)
      .where(and(eq(trackingTokens.campaignId, campaignId), isNotNull(trackingTokens.firstUsedAt)))
      .groupBy(trackingTokens.tokenType, trackingTokens.lastUserAgentCategory);

    let machineOpenCount = 0;
    let machineClickCount = 0;
    for (const r of rows) {
      if (isMachineCategory(r.uaCategory)) {
        if (r.tokenType === "open")  machineOpenCount  += r.count;
        if (r.tokenType === "click") machineClickCount += r.count;
      }
    }
    return { machineOpenCount, machineClickCount };
  },

  async expireContactTrackingTokens(contactId) {
    const subquery = db.select({ id: campaignEmails.id })
      .from(campaignEmails)
      .where(eq(campaignEmails.contactId, contactId));
    await db.update(trackingTokens)
      .set({ expiresAt: new Date() })
      .where(inArray(trackingTokens.campaignEmailId, subquery));
  },

  async deleteExpiredTrackingTokens() {
    let totalDeleted = 0;
    let batchSize;
    do {
      const subquery = db.select({ id: trackingTokens.id })
        .from(trackingTokens)
        .where(lt(trackingTokens.expiresAt, new Date()))
        .limit(1000);
      const result = await db.delete(trackingTokens)
        .where(inArray(trackingTokens.id, subquery))
        .returning({ id: trackingTokens.id });
      batchSize = result.length;
      totalDeleted += batchSize;
    } while (batchSize === 1000);
    return totalDeleted;
  },
};

// Export the appropriate storage based on mode
export const storage = isDevMode ? memoryStorage : dbStorage;

console.log(`[STORAGE] Active adapter: ${isDevMode ? 'In-Memory (DEV)' : 'PostgreSQL (PRODUCTION)'}`);
