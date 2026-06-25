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
const { eq, and, desc, gte, sql, lt } = (!isDevMode && db) ? drizzleOps : {};
const {
  users, sessions, templates, contacts, campaigns,
  campaignEmails, creditTransactions, auditLogs, payments, contactSubmissions, waitlist,
  suppressions, aiUsageLogs, invites, snsEvents, platformSettings
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
      plan: userData.plan || "free"
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
    allowedUpdates.updatedAt = new Date();
    
    const [user] = await db.update(users)
      .set(allowedUpdates)
      .where(eq(users.id, id))
      .returning();
    return user ? this.sanitizeUser(user) : null;
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
    const { passwordHash, ...sanitized } = user;
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
            sql`DATE_TRUNC('month', COALESCE(free_credits_reset_at, '1970-01-01'::timestamp) AT TIME ZONE 'UTC')
                < DATE_TRUNC('month', NOW() AT TIME ZONE 'UTC')`
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
    return await db.select().from(contacts).where(drizzleOps.inArray(contacts.id, ids));
  },

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
      return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
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

  async startCampaign(campaignId, userId) {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error("Campaign not found");
    
    const canStart = await this.canStartCampaign(userId, campaign.totalEmails);
    if (!canStart.allowed) {
      await this.createAuditLog({
        userId,
        action: AUDIT_ACTIONS.CAMPAIGN_BLOCKED_INSUFFICIENT_CREDITS,
        targetType: "campaign",
        targetId: campaignId,
        details: canStart
      });
      throw new Error(canStart.reason);
    }
    
    const [updated] = await db.update(campaigns)
      .set({ 
        status: CAMPAIGN_STATUS.RUNNING, 
        startedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, campaignId))
      .returning();
    
    await this.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CAMPAIGN_STARTED,
      targetType: "campaign",
      targetId: campaignId
    });
    
    return updated;
  },

  async completeCampaign(campaignId, userId) {
    const [campaign] = await db.update(campaigns)
      .set({ 
        status: CAMPAIGN_STATUS.COMPLETED, 
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, campaignId))
      .returning();
    
    await this.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CAMPAIGN_COMPLETED,
      targetType: "campaign",
      targetId: campaignId,
      details: { sentEmails: campaign.sentEmails, failedEmails: campaign.failedEmails }
    });
    
    return campaign;
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
    if (filters.userId) conditions.push(eq(auditLogs.userId, filters.userId));
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

    // Rates expressed as 0-100 numbers; null when denominator is zero.
    const avgOpenRate  = totalSent > 0 ? (totalOpens     / totalSent)      * 100 : null;
    const avgClickRate = totalSent > 0 ? (totalClicks    / totalSent)      * 100 : null;
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent)      * 100 : null;
    const successRate  = totalAttempted > 0 ? (totalSent / totalAttempted) * 100 : null;

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

    // 1. Fetch users
    const userRows = isRootAdmin
      ? await db.select().from(users).orderBy(desc(users.createdAt))
      : await db.select().from(users).where(eq(users.parentId, parentId)).orderBy(desc(users.createdAt));

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

  async getSecondaryRootCount() {
    const [result] = await db.select({ count: sql`COUNT(*)` })
      .from(users)
      .where(eq(users.isSecondaryRoot, true));
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
      .where(gte(campaigns.createdAt, thirtyDaysAgo));

    const sent = Number(totals?.totalSent || 0);
    const bounced = Number(totals?.totalBounced || 0);
    const complained = Number(totals?.totalComplained || 0);
    const bounceRate = sent > 0 ? bounced / sent : 0;
    const complaintRate = sent > 0 ? complained / sent : 0;

    let status = 'healthy';
    if (bounceRate > 0.10 || complaintRate > 0.005) status = 'critical';
    else if (bounceRate > 0.05 || complaintRate > 0.001) status = 'warning';

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
};

// Export the appropriate storage based on mode
export const storage = isDevMode ? memoryStorage : dbStorage;

console.log(`[STORAGE] Active adapter: ${isDevMode ? 'In-Memory (DEV)' : 'PostgreSQL (PRODUCTION)'}`);
