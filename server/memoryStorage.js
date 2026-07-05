/**
 * In-Memory Storage Adapter for DEV Mode
 * =======================================
 * This provides a PostgreSQL-like in-memory storage that:
 * - Maintains the same schema and constraints as production
 * - Does NOT bypass validations, role checks, or credit rules
 * - Correctly mutates state for credits, users, campaigns, audit logs
 * - Automatically deactivates when real DATABASE_URL is provided
 */

import crypto from "crypto";
import bcrypt from "bcryptjs";
import {
  USER_ROLES, AUDIT_ACTIONS, CAMPAIGN_STATUS, PAYMENT_STATUS,
  CAMPAIGN_EMAIL_STATUS, SUPPRESSION_SOURCE, AI_DAILY_LIMITS,
  INACTIVITY_THRESHOLDS, MONTHLY_CREDITS
} from "../shared/schema.js";
import { generateTrackingToken } from "./trackingUtils.js";
import { isMachineCategory } from "./trackingClassifier.js";
import { PERMANENT_FAILURE_REASONS, EXECUTION_LEASE_DURATION_MS } from "./campaignConfig.js";

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function generateUUID() {
  return crypto.randomUUID();
}

// In-memory data stores
const store = {
  users: new Map(),
  sessions: new Map(),
  templates: new Map(),
  contacts: new Map(),
  campaigns: new Map(),
  campaignEmails: new Map(),
  suppressions: new Map(),
  creditTransactions: new Map(),
  auditLogs: new Map(),
  payments: new Map(),
  contactSubmissions: new Map(),
  waitlist: new Map(),
  aiUsageLogs: new Map(),
  invites: new Map(),
  snsEvents: new Map(),
  contactLists: new Map(),
  contactListMembers: new Map(),
  contactImports: new Map(),
  trackingTokens: new Map(),
};

// Helper to convert Map to array sorted by createdAt desc
function toSortedArray(map, sortField = "createdAt") {
  return Array.from(map.values()).sort((a, b) => 
    new Date(b[sortField]) - new Date(a[sortField])
  );
}

export const memoryStorage = {
  // ==================== USER OPERATIONS ====================
  async createUser(userData) {
    const id = generateUUID();
    const now = new Date();
    const passwordHash = await bcrypt.hash(userData.password || crypto.randomBytes(32).toString("hex"), 12);

    // Check for unique username
    for (const user of store.users.values()) {
      if (user.username === userData.username) {
        throw new Error("Username already exists");
      }
      if (user.email === userData.email) {
        throw new Error("Email already exists");
      }
    }
    
    const user = {
      id,
      username: userData.username,
      email: userData.email,
      passwordHash,
      role: userData.role || USER_ROLES.USER,
      parentId: userData.parentId || null,
      creditsReceived: userData.creditsReceived || 0,
      creditsAllocated: 0,
      creditsUsed: 0,
      trialCredits: 5,
      trialCreditsUsed: 0,
      freeCreditsUsed: 0,
      freeCreditsResetAt: null,
      // When FREE_PLAN_ENABLED, new users enter as free plan users — not legacy trial users.
      // Respect explicit isTrialUser=false from callers (e.g. initializeRootAdmin).
      isTrialUser: "isTrialUser" in userData
        ? Boolean(userData.isTrialUser)
        : process.env.FREE_PLAN_ENABLED !== "true",
      mustResetPassword: userData.mustResetPassword !== false,
      isActive: true,
      plan: userData.plan || "free",
      aiGenerationsToday: 0,
      aiGenerationsResetAt: null,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      lastActivityAt: null,
      inactivityWarningSentAt: null,
      inactivityKeepToken: null,
      inactivityKeepTokenExpiresAt: null,
      isDormant: false,
      isSecondaryRoot: false,
      lastEmergencyRecoveryAt: null,
      // Sender identity profile
      senderName: null,
      senderTitle: null,
      senderCompany: null,
      senderPhone: null,
      replyToEmail: null,
      // Trust model (M13B)
      emailVerified: userData.emailVerified === true,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
      sendingIdentityType: null,
      platformIdentityAcknowledgedAt: null,
      firstSendAt: null,
      warmupDailyLimit: null,
      warmupEmailsSentToday: 0,
      warmupEmailsResetAt: null,
    };

    store.users.set(id, user);
    return this.sanitizeUser(user);
  },

  async getUserById(id) {
    const user = store.users.get(id);
    return user ? this.sanitizeUser(user) : null;
  },

  async getUser(id) {
    return this.getUserById(id);
  },

  async getUserByUsername(username) {
    for (const user of store.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  },

  async getUserByEmail(email) {
    for (const user of store.users.values()) {
      if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
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
      const storedUser = store.users.get(user.id);
      if (storedUser) {
        storedUser.passwordHash = newHash;
        storedUser.updatedAt = new Date();
        console.log(`[AUTH] Migrated password hash for user ${user.username} from SHA-256 to bcrypt`);
      }
    } catch (migErr) {
      console.error(`[AUTH] Password migration failed for user ${user.id}:`, migErr.message);
    }

    return true;
  },

  async updatePassword(userId, newPassword) {
    const user = store.users.get(userId);
    if (!user) throw new Error("User not found");

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.mustResetPassword = false;
    user.updatedAt = new Date();
    
    await this.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
      targetType: "user",
      targetId: userId
    });
  },

  async updateUser(id, updates) {
    const user = store.users.get(id);
    if (!user) return null;
    
    if (updates.email) user.email = updates.email;
    if (updates.isActive !== undefined) user.isActive = updates.isActive;
    if (updates.mustResetPassword !== undefined) user.mustResetPassword = updates.mustResetPassword;
    if (updates.lastLoginAt) user.lastLoginAt = updates.lastLoginAt;
    if (updates.creditsReceived !== undefined) user.creditsReceived = updates.creditsReceived;
    if (updates.creditsAllocated !== undefined) user.creditsAllocated = updates.creditsAllocated;
    if (updates.creditsUsed !== undefined) user.creditsUsed = updates.creditsUsed;
    if (updates.freeCreditsUsed !== undefined) user.freeCreditsUsed = updates.freeCreditsUsed;
    if (updates.freeCreditsResetAt !== undefined) user.freeCreditsResetAt = updates.freeCreditsResetAt;
    if (updates.plan) user.plan = updates.plan;
    if (updates.sendPaused !== undefined) user.sendPaused = updates.sendPaused;
    if (updates.sendPausedReason !== undefined) user.sendPausedReason = updates.sendPausedReason;
    if (updates.sendPausedAt !== undefined) user.sendPausedAt = updates.sendPausedAt;
    // Sender identity profile
    if (updates.senderName    !== undefined) user.senderName    = updates.senderName    || null;
    if (updates.senderTitle   !== undefined) user.senderTitle   = updates.senderTitle   || null;
    if (updates.senderCompany !== undefined) user.senderCompany = updates.senderCompany || null;
    if (updates.senderPhone   !== undefined) user.senderPhone   = updates.senderPhone   || null;
    if (updates.replyToEmail  !== undefined) user.replyToEmail  = updates.replyToEmail  || null;
    // Trust model fields (M13B)
    if (updates.emailVerified !== undefined) user.emailVerified = updates.emailVerified;
    if (updates.emailVerificationToken !== undefined) user.emailVerificationToken = updates.emailVerificationToken || null;
    if (updates.emailVerificationExpiresAt !== undefined) user.emailVerificationExpiresAt = updates.emailVerificationExpiresAt || null;
    if (updates.sendingIdentityType !== undefined) user.sendingIdentityType = updates.sendingIdentityType || null;
    if (updates.platformIdentityAcknowledgedAt !== undefined) user.platformIdentityAcknowledgedAt = updates.platformIdentityAcknowledgedAt || null;
    if ("warmupDailyLimit" in updates) user.warmupDailyLimit = updates.warmupDailyLimit;
    user.updatedAt = new Date();

    return this.sanitizeUser(user);
  },

  async setFirstSendAt(userId) {
    const user = store.users.get(userId);
    if (user && !user.firstSendAt) {
      user.firstSendAt = new Date();
      user.updatedAt = new Date();
    }
  },

  async atomicIncrementWarmupCount(userId, dailyLimit) {
    const user = store.users.get(userId);
    if (!user) return null;
    const now = new Date();
    const cutoff = new Date(now.getTime() - 86_400_000);
    if (!user.warmupEmailsResetAt || new Date(user.warmupEmailsResetAt) < cutoff) {
      user.warmupEmailsSentToday = 0;
      user.warmupEmailsResetAt = now;
    }
    if (user.warmupEmailsSentToday >= dailyLimit) return null;
    user.warmupEmailsSentToday += 1;
    user.updatedAt = now;
    return user.warmupEmailsSentToday;
  },

  async deleteUser(id) {
    // Delete related sessions
    for (const [sessionId, session] of store.sessions.entries()) {
      if (session.userId === id) {
        store.sessions.delete(sessionId);
      }
    }
    store.users.delete(id);
  },

  async getUsers(parentId = null, includeAll = false) {
    let result = toSortedArray(store.users);
    if (!includeAll && parentId) {
      result = result.filter(u => u.parentId === parentId);
    }
    return result.map(u => this.sanitizeUser(u));
  },

  async getChildUsers(parentId) {
    const result = toSortedArray(store.users).filter(u => u.parentId === parentId);
    return result.map(u => this.sanitizeUser(u));
  },

  async getActiveChildren(parentId) {
    const result = toSortedArray(store.users).filter(u => u.parentId === parentId && u.isActive);
    return result.map(u => this.sanitizeUser(u));
  },

  async reassignChildren(oldParentId, newParentId) {
    for (const user of store.users.values()) {
      if (user.parentId === oldParentId) {
        user.parentId = newParentId;
      }
    }
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

  // ==================== SESSION OPERATIONS ====================
  async createSession(userId) {
    const id = generateUUID();
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const session = {
      id,
      userId,
      token,
      expiresAt,
      createdAt: new Date()
    };
    
    store.sessions.set(id, session);
    await this.updateUser(userId, { lastLoginAt: new Date() });
    
    return session;
  },

  async getSessionByToken(token) {
    for (const session of store.sessions.values()) {
      if (session.token === token && new Date(session.expiresAt) > new Date()) {
        return session;
      }
    }
    return null;
  },

  async deleteSession(token) {
    for (const [id, session] of store.sessions.entries()) {
      if (session.token === token) {
        store.sessions.delete(id);
        return;
      }
    }
  },

  async deleteUserSessions(userId) {
    let count = 0;
    for (const [id, session] of store.sessions.entries()) {
      if (session.userId === userId) {
        store.sessions.delete(id);
        count++;
      }
    }
    return count;
  },

  // ==================== CREDIT OPERATIONS ====================
  async canAllocateCredits(fromUserId, amount) {
    const user = await this.getUserById(fromUserId);
    if (!user) return false;
    return user.creditsRemaining >= amount;
  },

  async allocateCredits(fromUserId, toUserId, amount, performedBy) {
    const fromUser = store.users.get(fromUserId);
    const toUser = store.users.get(toUserId);
    
    if (!fromUser || !toUser) {
      throw new Error("User not found");
    }
    
    // Role-based validation (exact production logic)
    if (fromUser.role === USER_ROLES.ROOT_ADMIN && toUser.role !== USER_ROLES.SUB_ADMIN) {
      throw new Error("ROOT_ADMIN can only allocate credits to SUB_ADMINs");
    }
    if (fromUser.role === USER_ROLES.SUB_ADMIN && toUser.role !== USER_ROLES.USER) {
      throw new Error("SUB_ADMIN can only allocate credits to USERs");
    }
    if (fromUser.role === USER_ROLES.USER) {
      throw new Error("USER cannot allocate credits");
    }
    
    // Parent-child validation
    if (toUser.parentId !== fromUserId) {
      throw new Error("Can only allocate credits to direct children");
    }
    
    // Balance check
    const fromRemaining = (fromUser.creditsReceived || 0) - (fromUser.creditsAllocated || 0) - (fromUser.creditsUsed || 0);
    if (fromRemaining < amount) {
      throw new Error("Insufficient credits available");
    }
    
    const fromBalanceBefore = fromUser.creditsAllocated;
    const toBalanceBefore = toUser.creditsReceived;
    
    // Atomic transaction simulation
    fromUser.creditsAllocated += amount;
    fromUser.updatedAt = new Date();
    toUser.creditsReceived += amount;
    toUser.updatedAt = new Date();
    
    // Create credit transactions
    const txId1 = generateUUID();
    store.creditTransactions.set(txId1, {
      id: txId1,
      userId: fromUserId,
      type: "allocation_out",
      amount: -amount,
      balanceBefore: fromBalanceBefore,
      balanceAfter: fromBalanceBefore + amount,
      fromUserId,
      toUserId,
      description: `Allocated ${amount} credits to ${toUser.username}`,
      createdAt: new Date()
    });
    
    const txId2 = generateUUID();
    store.creditTransactions.set(txId2, {
      id: txId2,
      userId: toUserId,
      type: "allocation_in",
      amount: amount,
      balanceBefore: toBalanceBefore,
      balanceAfter: toBalanceBefore + amount,
      fromUserId,
      toUserId,
      description: `Received ${amount} credits from ${fromUser.username}`,
      createdAt: new Date()
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
    const child = store.users.get(childId);
    const parent = store.users.get(parentId);
    if (!child || !parent) throw new Error("User not found");

    const childBalanceBefore = child.creditsReceived;
    const parentBalanceBefore = parent.creditsAllocated;

    child.creditsReceived -= amount;
    child.updatedAt = new Date();
    parent.creditsAllocated -= amount;
    parent.updatedAt = new Date();

    const txId1 = generateUUID();
    store.creditTransactions.set(txId1, {
      id: txId1,
      userId: childId,
      type: "reclaim_out",
      amount: -amount,
      balanceBefore: childBalanceBefore,
      balanceAfter: childBalanceBefore - amount,
      fromUserId: childId,
      toUserId: parentId,
      description: `${amount} credits reclaimed on account deactivation`,
      createdAt: new Date(),
    });

    const txId2 = generateUUID();
    store.creditTransactions.set(txId2, {
      id: txId2,
      userId: parentId,
      type: "reclaim_in",
      amount,
      balanceBefore: parentBalanceBefore,
      balanceAfter: parentBalanceBefore - amount,
      fromUserId: childId,
      toUserId: parentId,
      description: `${amount} credits reclaimed from ${child.username} on deactivation`,
      createdAt: new Date(),
    });

    return { amount };
  },

  async useCredits(userId, amount) {
    const user = store.users.get(userId);
    if (!user) throw new Error("User not found");

    const remaining = (user.creditsReceived || 0) - (user.creditsAllocated || 0) - (user.creditsUsed || 0);
    if (remaining < amount) {
      throw new Error("Insufficient credits");
    }

    user.creditsUsed += amount;
    user.updatedAt = new Date();
    
    return this.sanitizeUser(user);
  },

  async deductCreditAtomic(userId, campaignId, description = "Email sent") {
    const user = store.users.get(userId);
    if (!user) throw new Error("User not found");

    const freePlanEnabled = process.env.FREE_PLAN_ENABLED === "true";
    const monthlyGrant = MONTHLY_CREDITS[user.plan] ?? 0;

    // Compute balances at moment of write (single-threaded, no TOCTOU in memory)
    const paidRemaining = Math.max(0, (user.creditsReceived || 0) - (user.creditsAllocated || 0) - (user.creditsUsed || 0));

    // Lazy refresh: reset free pool if the 1-month renewal window from signup has passed
    if (freePlanEnabled && !user.isTrialUser && monthlyGrant > 0) {
      const resetAt = user.freeCreditsResetAt;
      const refDate = resetAt ? new Date(resetAt) : new Date(user.createdAt);
      const nextReset = new Date(refDate);
      nextReset.setUTCMonth(nextReset.getUTCMonth() + 1);
      if (new Date() >= nextReset) {
        user.freeCreditsUsed = 0;
        user.freeCreditsResetAt = new Date();
      }
    }

    const freeRemaining = (freePlanEnabled && !user.isTrialUser && monthlyGrant > 0)
      ? Math.max(0, monthlyGrant - (user.freeCreditsUsed || 0))
      : 0;
    const trialRemaining = (!freePlanEnabled && user.isTrialUser)
      ? Math.max(0, (user.trialCredits || 0) - (user.trialCreditsUsed || 0))
      : 0;

    if (freePlanEnabled && !user.isTrialUser && freeRemaining >= 1) {
      const balanceBefore = user.freeCreditsUsed || 0;
      user.freeCreditsUsed = balanceBefore + 1;
      user.updatedAt = new Date();
      const txId = generateUUID();
      store.creditTransactions.set(txId, {
        id: txId, userId, type: "free_usage", amount: -1,
        balanceBefore, balanceAfter: balanceBefore + 1,
        campaignId, description, createdAt: new Date()
      });
    } else if (paidRemaining >= 1) {
      const balanceBefore = user.creditsUsed;
      user.creditsUsed += 1;
      user.updatedAt = new Date();
      const txId = generateUUID();
      store.creditTransactions.set(txId, {
        id: txId, userId, type: "usage", amount: -1,
        balanceBefore, balanceAfter: balanceBefore + 1,
        campaignId, description, createdAt: new Date()
      });
    } else if (trialRemaining >= 1) {
      const balanceBefore = user.trialCreditsUsed || 0;
      user.trialCreditsUsed = balanceBefore + 1;
      user.updatedAt = new Date();
      const txId = generateUUID();
      store.creditTransactions.set(txId, {
        id: txId, userId, type: "trial_usage", amount: -1,
        balanceBefore, balanceAfter: balanceBefore + 1,
        campaignId, description, createdAt: new Date()
      });
    } else {
      throw new Error("Insufficient credits");
    }

    await this.createAuditLog({
      userId, action: AUDIT_ACTIONS.CREDITS_USED,
      targetType: "campaign", targetId: campaignId,
      details: { creditsUsed: 1 },
    });

    return true;
  },

  async addCredits(userId, amount, action, details = {}) {
    const user = store.users.get(userId);
    if (!user) throw new Error("User not found");
    user.creditsReceived = (user.creditsReceived || 0) + amount;
    user.updatedAt = new Date();
    await this.createAuditLog({
      userId, action: action || AUDIT_ACTIONS.CREDITS_PURCHASED,
      details: { amount, ...details }
    });
    return this.sanitizeUser(user);
  },

  async canStartCampaign(userId, emailCount) {
    const user = await this.getUserById(userId);
    if (!user) return { allowed: false, reason: "User not found", blockReason: "user_not_found" };

    const freePlanEnabled = process.env.FREE_PLAN_ENABLED === "true";
    const monthlyGrant = MONTHLY_CREDITS[user.plan] ?? 0;
    const paidRemaining = user.creditsRemaining || 0;

    let freeRemaining = 0;
    if (freePlanEnabled && !user.isTrialUser && monthlyGrant > 0) {
      // Treat stale pool as reset for availability check (same as getTotalCreditsAvailable)
      const resetAt = user.freeCreditsResetAt;
      const refDate = resetAt ? new Date(resetAt) : new Date(user.createdAt);
      const nextReset = new Date(refDate);
      nextReset.setUTCMonth(nextReset.getUTCMonth() + 1);
      const effectiveUsed = new Date() >= nextReset ? 0 : (user.freeCreditsUsed || 0);
      freeRemaining = Math.max(0, monthlyGrant - effectiveUsed);
    }

    const trialRemaining = (!freePlanEnabled && user.isTrialUser)
      ? Math.max(0, (user.trialCredits || 0) - (user.trialCreditsUsed || 0))
      : 0;

    const totalAvailable = paidRemaining + freeRemaining + trialRemaining;

    if (totalAvailable < emailCount) {
      let blockReason;
      if (freePlanEnabled && !user.isTrialUser && freeRemaining === 0 && paidRemaining === 0) {
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
    return toSortedArray(store.creditTransactions)
      .filter(t => t.userId === userId)
      .slice(0, limit);
  },

  // ==================== TEMPLATE OPERATIONS ====================
  async createTemplate(templateData) {
    const id = generateUUID();
    const now = new Date();
    
    const template = {
      id,
      userId: templateData.userId,
      name: templateData.name,
      subject: templateData.subject,
      body: templateData.body,
      isDefault: templateData.isDefault || false,
      createdAt: now,
      updatedAt: now
    };
    
    store.templates.set(id, template);
    
    await this.createAuditLog({
      userId: templateData.userId,
      action: AUDIT_ACTIONS.TEMPLATE_CREATED,
      targetType: "template",
      targetId: id,
      details: { name: template.name }
    });
    
    return template;
  },

  async getTemplates(userId = null) {
    let result = toSortedArray(store.templates);
    if (userId) {
      result = result.filter(t => t.userId === userId);
    }
    return result;
  },

  async getTemplate(id) {
    return store.templates.get(id) || null;
  },

  async updateTemplate(id, updates) {
    const template = store.templates.get(id);
    if (!template) return null;
    
    if (updates.name) template.name = updates.name;
    if (updates.subject) template.subject = updates.subject;
    if (updates.body) template.body = updates.body;
    if (updates.isDefault !== undefined) template.isDefault = updates.isDefault;
    template.updatedAt = new Date();
    
    return template;
  },

  async deleteTemplate(id, userId) {
    store.templates.delete(id);
    if (userId) {
      await this.createAuditLog({
        userId,
        action: AUDIT_ACTIONS.TEMPLATE_DELETED,
        targetType: "template",
        targetId: id
      });
    }
  },

  // ==================== CONTACT OPERATIONS ====================
  async createContact(contactData) {
    const email = contactData.email?.toLowerCase().trim();

    // Upsert: update non-identifying fields if (userId, email) already exists
    const existing = [...store.contacts.values()].find(
      (c) => c.userId === contactData.userId && c.email === email
    );
    if (existing) {
      existing.name = contactData.name ?? existing.name;
      existing.company = contactData.company ?? existing.company;
      existing.category = contactData.category ?? existing.category;
      existing.customFields = contactData.customFields ?? existing.customFields;
      store.contacts.set(existing.id, existing);
      return existing;
    }

    const id = generateUUID();
    const contact = {
      id,
      userId: contactData.userId,
      email,
      name: contactData.name || null,
      company: contactData.company || null,
      category: contactData.category || null,
      customFields: contactData.customFields || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    store.contacts.set(id, contact);
    return contact;
  },

  async createContacts(contactsData) {
    if (contactsData.length === 0) return [];
    
    const result = [];
    for (const data of contactsData) {
      const contact = await this.createContact(data);
      result.push(contact);
    }
    
    await this.createAuditLog({
      userId: contactsData[0].userId,
      action: AUDIT_ACTIONS.CONTACT_IMPORTED,
      targetType: "contacts",
      details: { count: result.length }
    });
    
    return result;
  },

  async getContacts(userId) {
    return toSortedArray(store.contacts).filter(c => c.userId === userId);
  },

  async getContactById(id) {
    return store.contacts.get(id) || null;
  },

  async getContactsByIds(ids) {
    if (!ids || ids.length === 0) return [];
    return ids.map(id => store.contacts.get(id)).filter(Boolean);
  },

  // ── Contact Library ─────────────────────────────────────────────────────────

  async createContactList({ userId, name, description }) {
    const id = generateUUID();
    const now = new Date();
    const list = { id, userId, name, description: description || null, createdAt: now, updatedAt: now };
    store.contactLists.set(id, list);
    await this.createAuditLog({ userId, action: AUDIT_ACTIONS.CONTACT_LIST_CREATED, targetType: "contact_list", targetId: id, details: { name } });
    return { ...list, contactCount: 0 };
  },

  async getContactLists(userId) {
    return toSortedArray(store.contactLists)
      .filter(l => l.userId === userId)
      .map(l => ({
        ...l,
        contactCount: Array.from(store.contactListMembers.values()).filter(m => m.listId === l.id).length,
      }));
  },

  async getContactList(id, userId) {
    const list = store.contactLists.get(id);
    if (!list || list.userId !== userId) return null;
    return {
      ...list,
      contactCount: Array.from(store.contactListMembers.values()).filter(m => m.listId === id).length,
    };
  },

  async updateContactList(id, userId, { name, description }) {
    const list = store.contactLists.get(id);
    if (!list || list.userId !== userId) return null;
    if (name !== undefined) list.name = name;
    if (description !== undefined) list.description = description;
    list.updatedAt = new Date();
    store.contactLists.set(id, list);
    if (name !== undefined) {
      await this.createAuditLog({ userId, action: AUDIT_ACTIONS.CONTACT_LIST_RENAMED, targetType: "contact_list", targetId: id, details: { name } });
    }
    return { ...list, contactCount: Array.from(store.contactListMembers.values()).filter(m => m.listId === id).length };
  },

  async deleteContactList(id, userId) {
    const list = store.contactLists.get(id);
    if (!list || list.userId !== userId) return null;
    store.contactLists.delete(id);
    for (const [mid, m] of store.contactListMembers.entries()) {
      if (m.listId === id) store.contactListMembers.delete(mid);
    }
    for (const [iid, imp] of store.contactImports.entries()) {
      if (imp.listId === id) store.contactImports.delete(iid);
    }
    await this.createAuditLog({ userId, action: AUDIT_ACTIONS.CONTACT_LIST_DELETED, targetType: "contact_list", targetId: id, details: { name: list.name } });
    return list;
  },

  async importContactsToList(userId, listId, rows, source = "library_import", fileName = null) {
    let newContacts = 0, updatedContacts = 0, addedToList = 0, alreadyInList = 0;
    for (const row of rows) {
      const email = row.email.toLowerCase().trim();
      const existingContact = Array.from(store.contacts.values()).find(c => c.userId === userId && c.email === email);
      let contactId;
      if (existingContact) {
        existingContact.name = row.name || existingContact.name;
        existingContact.company = row.company || existingContact.company;
        existingContact.category = row.category || existingContact.category;
        existingContact.updatedAt = new Date();
        store.contacts.set(existingContact.id, existingContact);
        contactId = existingContact.id;
        updatedContacts++;
      } else {
        const id = generateUUID();
        const now = new Date();
        const c = { id, userId, email, name: row.name || null, company: row.company || null, category: row.category || null, customFields: row.customFields || null, createdAt: now, updatedAt: now };
        store.contacts.set(id, c);
        contactId = id;
        newContacts++;
      }
      const alreadyMember = Array.from(store.contactListMembers.values()).some(m => m.listId === listId && m.contactId === contactId);
      if (alreadyMember) {
        alreadyInList++;
      } else {
        const mid = generateUUID();
        store.contactListMembers.set(mid, { id: mid, listId, contactId, addedAt: new Date() });
        addedToList++;
      }
    }
    const id = generateUUID();
    const importRecord = { id, userId, listId, source, fileName: fileName || null, totalRows: rows.length, failedRows: 0, newContacts, updatedContacts, addedToList, alreadyInList, createdAt: new Date(), completedAt: new Date() };
    store.contactImports.set(id, importRecord);
    await this.createAuditLog({ userId, action: AUDIT_ACTIONS.CONTACTS_IMPORTED_TO_LIST, targetType: "contact_list", targetId: listId, details: { totalRows: rows.length, newContacts, updatedContacts, addedToList, alreadyInList, failedRows: 0, fileName } });
    return importRecord;
  },

  async exportContactList(listId, userId) {
    const members = Array.from(store.contactListMembers.values()).filter(m => m.listId === listId);
    return members
      .map(m => {
        const c = store.contacts.get(m.contactId);
        return c && c.userId === userId ? { email: c.email, name: c.name, company: c.company, category: c.category, addedAt: m.addedAt } : null;
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt))
      .map(({ addedAt: _, ...rest }) => rest);
  },

  async getContactListContacts(listId, userId, { search, page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    const members = Array.from(store.contactListMembers.values()).filter(m => m.listId === listId);
    let rows = members
      .map(m => {
        const c = store.contacts.get(m.contactId);
        return c ? { ...c, addedAt: m.addedAt } : null;
      })
      .filter(c => c && c.userId === userId);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(c => c.email.includes(q) || (c.name && c.name.toLowerCase().includes(q)));
    }
    rows.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    const total = rows.length;
    return { rows: rows.slice(offset, offset + limit), total, page, limit };
  },

  async removeContactFromList(listId, contactId, userId) {
    const list = Array.from(store.contactLists.values()).find(l => l.id === listId && l.userId === userId);
    if (!list) return null;
    const entry = Array.from(store.contactListMembers.entries()).find(([, m]) => m.listId === listId && m.contactId === contactId);
    if (!entry) return null;
    store.contactListMembers.delete(entry[0]);
    await this.createAuditLog({ userId, action: AUDIT_ACTIONS.CONTACT_REMOVED_FROM_LIST, targetType: "contact_list", targetId: listId, details: { contactId } });
    return entry[1];
  },

  async bulkRemoveContactsFromList(listId, contactIds, userId) {
    if (!contactIds || contactIds.length === 0) return 0;
    const list = Array.from(store.contactLists.values()).find(l => l.id === listId && l.userId === userId);
    if (!list) return 0;
    const idSet = new Set(contactIds);
    for (const [mid, m] of store.contactListMembers.entries()) {
      if (m.listId === listId && idSet.has(m.contactId)) store.contactListMembers.delete(mid);
    }
    await this.createAuditLog({ userId, action: AUDIT_ACTIONS.CONTACTS_BULK_REMOVED_FROM_LIST, targetType: "contact_list", targetId: listId, details: { count: contactIds.length } });
    return contactIds.length;
  },

  async getContactListImports(listId, userId) {
    const list = await this.getContactList(listId, userId);
    if (!list) return null;
    return toSortedArray(store.contactImports).filter(i => i.listId === listId);
  },

  async updateContact(id, userId, fields) {
    const contact = store.contacts.get(id);
    if (!contact || contact.userId !== userId) return null;
    Object.assign(contact, fields, { updatedAt: new Date() });
    store.contacts.set(id, contact);
    await this.createAuditLog({ userId, action: AUDIT_ACTIONS.CONTACT_UPDATED, targetType: "contact", targetId: id, details: { fields: Object.keys(fields) } });
    return contact;
  },

  async resolveListContactIds(listId, userId) {
    return Array.from(store.contactListMembers.values())
      .filter(m => {
        if (m.listId !== listId) return false;
        const c = store.contacts.get(m.contactId);
        return c && c.userId === userId;
      })
      .map(m => m.contactId);
  },

  // ── End Contact Library ──────────────────────────────────────────────────────

  // ==================== CAMPAIGN OPERATIONS ====================
  async createCampaign(campaignData) {
    const id = generateUUID();
    const now = new Date();
    
    const campaign = {
      id,
      userId: campaignData.userId,
      templateId: campaignData.templateId || null,
      name: campaignData.name,
      status: campaignData.status || CAMPAIGN_STATUS.DRAFT,
      totalEmails: campaignData.totalEmails || 0,
      sentEmails: 0,
      failedEmails: 0,
      skippedEmails: 0,
      creditsUsed: 0,
      contactIds: campaignData.contactIds || [],
      templateSnapshot: campaignData.templateSnapshot || null,
      listId: campaignData.listId || null,
      listSnapshot: campaignData.listSnapshot || null,
      scheduledAt: campaignData.scheduledAt || null,
      startedAt: null,
      completedAt: null,
      finalizedAt: null,
      // Pre-existing gap fixed alongside PAR-TRUST-017: these were never copied,
      // so any custom-domain campaign silently failed SAS's SENDER_DOMAIN_REQUIRED
      // check in dev/test mode regardless of what the caller actually passed.
      senderDomainId: campaignData.senderDomainId || null,
      senderEmailSnapshot: campaignData.senderEmailSnapshot || null,
      createdAt: now,
      updatedAt: now
    };
    
    store.campaigns.set(id, campaign);
    
    await this.createAuditLog({
      userId: campaignData.userId,
      action: AUDIT_ACTIONS.CAMPAIGN_CREATED,
      targetType: "campaign",
      targetId: id,
      details: { name: campaign.name, totalEmails: campaign.totalEmails }
    });
    
    return campaign;
  },

  async getCampaignsByStatus(status) {
    return toSortedArray(store.campaigns).filter(c => c.status === status);
  },

  async getCampaigns(userId = null, isRootAdmin = false) {
    if (isRootAdmin) {
      return toSortedArray(store.campaigns);
    }
    if (userId) {
      return toSortedArray(store.campaigns).filter(c => c.userId === userId);
    }
    return [];
  },

  async getCampaign(id) {
    return store.campaigns.get(id) || null;
  },

  async updateCampaign(id, updates) {
    const campaign = store.campaigns.get(id);
    if (!campaign) return null;

    Object.assign(campaign, updates, { updatedAt: new Date() });
    return campaign;
  },

  // Mirrors storage.js — see its comment for why this guarded write exists.
  async updateCampaignProgress(campaignId, updates) {
    const campaign = store.campaigns.get(campaignId);
    if (!campaign || campaign.finalizedAt) return;
    Object.assign(campaign, updates, { updatedAt: new Date() });
  },

  async getCampaignStatus(id) {
    return store.campaigns.get(id)?.status || null;
  },

  // PAR-TRUST-017 §7.7 — mirrors storage.js's renewLeaseAndGetStatus.
  async renewLeaseAndGetStatus(campaignId) {
    const campaign = store.campaigns.get(campaignId);
    if (!campaign) return null;
    if (campaign.status === "RUNNING") {
      campaign.executionLeaseExpiresAt = new Date(Date.now() + EXECUTION_LEASE_DURATION_MS);
    }
    return campaign.status;
  },

  async renewExecutionLease(campaignId) {
    const campaign = store.campaigns.get(campaignId);
    if (campaign && campaign.status === "RUNNING") {
      campaign.executionLeaseExpiresAt = new Date(Date.now() + EXECUTION_LEASE_DURATION_MS);
    }
  },

  async getExecutionLeaseExpiry(campaignId) {
    const campaign = store.campaigns.get(campaignId);
    if (!campaign) return null;
    return { executionLeaseExpiresAt: campaign.executionLeaseExpiresAt || null, finalizedAt: campaign.finalizedAt || null };
  },

  async cancelCampaign(id, allowedStatuses) {
    const campaign = store.campaigns.get(id);
    if (!campaign || !allowedStatuses.includes(campaign.status)) return null;
    campaign.status = "CANCELLED";
    campaign.updatedAt = new Date();
    return campaign;
  },

  async bulkFailOrphanedCampaignEmails(campaignId) {
    for (const [, email] of store.campaignEmails || new Map()) {
      if (email.campaignId === campaignId && email.status === CAMPAIGN_EMAIL_STATUS.PENDING) {
        email.status = CAMPAIGN_EMAIL_STATUS.FAILED;
        email.failureReason = "campaign_recovery_failed";
      }
    }
  },

  // PAR-TRUST-017 — mirrors storage.js's deriveCountsFromCampaignEmails.
  // BOUNCED/COMPLAINED count as sent — they are states a message reaches only
  // after a successful send, not an alternative to having been sent (see
  // storage.js's comment for the financial-correctness reasoning).
  async deriveCountsFromCampaignEmails(campaignId) {
    let sentEmails = 0, failedEmails = 0, skippedEmails = 0;
    let bouncedEmails = 0, complainedEmails = 0, deliveredEmails = 0, openedEmails = 0, clickedEmails = 0, unsubscribedEmails = 0;
    for (const record of store.campaignEmails.values()) {
      if (record.campaignId !== campaignId) continue;
      if (record.status === CAMPAIGN_EMAIL_STATUS.SENT) sentEmails++;
      else if (record.status === CAMPAIGN_EMAIL_STATUS.FAILED) failedEmails++;
      else if (record.status === CAMPAIGN_EMAIL_STATUS.SUPPRESSED) skippedEmails++;
      else if (record.status === CAMPAIGN_EMAIL_STATUS.BOUNCED) { sentEmails++; bouncedEmails++; }
      else if (record.status === CAMPAIGN_EMAIL_STATUS.COMPLAINED) { sentEmails++; complainedEmails++; }
      if (record.deliveredAt) deliveredEmails++;
      if (record.openedAt) openedEmails++;
      if (record.clickedAt) clickedEmails++;
      if (record.unsubscribedAt) unsubscribedEmails++;
    }
    // Mirrors storage.js — derive creditsUsed from the ledger, not a row-count
    // proxy. See storage.js's comment for the exact reasoning (deductCreditAtomic
    // can fail after a send already succeeded; campaignId on credit_transactions
    // is set exclusively by the three deduction paths).
    let creditsUsed = 0;
    for (const tx of store.creditTransactions.values()) {
      if (tx.campaignId === campaignId) creditsUsed += -tx.amount;
    }
    return {
      sentEmails, failedEmails, skippedEmails, creditsUsed,
      bouncedEmails, complainedEmails, deliveredEmails, openedEmails, clickedEmails, unsubscribedEmails,
    };
  },

  // PAR-TRUST-017 §13 / TRUST-018 — mirrors storage.js's equivalents.
  async getCampaignsPendingReconciliation(minAgeMs, maxAgeMs) {
    const now = Date.now();
    return [...store.campaigns.values()].filter(c => {
      if (!c.finalizedAt) return false;
      const age = now - new Date(c.finalizedAt).getTime();
      return age >= minAgeMs && age <= maxAgeMs;
    });
  },

  async reconcileCampaignCounters(campaignId) {
    const campaign = store.campaigns.get(campaignId);
    if (!campaign?.finalizedAt) return false;

    const fields = ["sentEmails", "failedEmails", "skippedEmails", "creditsUsed", "bouncedEmails", "complainedEmails", "deliveredEmails", "openedEmails", "clickedEmails", "unsubscribedEmails"];
    const before = Object.fromEntries(fields.map(f => [f, campaign[f]])); // snapshot before the await below yields

    const derived = await this.deriveCountsFromCampaignEmails(campaignId);
    const drifted = fields.some(f => before[f] !== derived[f]);
    if (!drifted) return false;

    // Re-verify nothing else already reconciled this exact drift while the
    // await above yielded control — mirrors storage.js's compare-and-swap.
    // Without this, two concurrent callers could both pass the drift check
    // before either has mutated `campaign`, and both append an audit entry.
    const stillMatchesSnapshot = fields.every(f => campaign[f] === before[f]);
    if (!stillMatchesSnapshot) return false;

    Object.assign(campaign, derived, { updatedAt: new Date() });

    await this.createAuditLog({
      userId: campaign.userId,
      action: AUDIT_ACTIONS.CAMPAIGN_COUNTERS_RECONCILED,
      targetType: "campaign",
      targetId: campaignId,
      details: { reason: "overlapping_execution_drift", before, after: derived },
    });
    return true;
  },

  // PAR-TRUST-017 §7.3/§7.5 — mirrors storage.js's finalizeCampaign exactly
  // (same idempotency contract, same legal-transition guard, always derives
  // counts from campaign_emails rather than trusting a caller-supplied local
  // counter — see storage.js's comment for why this matters under concurrency).
  //
  // The claim (finalizedAt + status) MUST be set synchronously, before the
  // `await` below — a concurrency test caught this exact ordering bug: with the
  // await for deriving counts sitting between the "already finalized?" check and
  // the mutation, every concurrent caller passes the check before any of them
  // mutates anything, so all of them would "win". In real Postgres this ordering
  // doesn't matter (the row-level lock on the guarded UPDATE itself provides
  // atomicity regardless of when counts are derived) — but memoryStorage's
  // atomicity comes entirely from JS's synchronous execution, which requires the
  // check-and-claim to complete in one unbroken synchronous stretch.
  async finalizeCampaign(campaignId, toStatus) {
    if (!["COMPLETED", "CANCELLED", "FAILED"].includes(toStatus)) {
      throw new Error(`finalizeCampaign: illegal toStatus "${toStatus}" — PAUSED is not a terminal state`);
    }
    const campaign = store.campaigns.get(campaignId);
    if (!campaign) return false;
    if (campaign.finalizedAt) return false; // already finalized — idempotent no-op
    if (toStatus === "COMPLETED" && campaign.status !== "RUNNING") return false;

    // Claim synchronously — no await before this point, none after until the
    // claim is durably recorded on the in-memory row.
    campaign.status = toStatus;
    campaign.finalizedAt = new Date();
    campaign.executionLeaseExpiresAt = null; // §7.7 — ownership released
    if (toStatus === "COMPLETED") campaign.completedAt = new Date();
    campaign.updatedAt = new Date();

    // Flip orphaned PENDING rows to FAILED *before* deriving counts — these
    // rows are becoming FAILED in this very call, so the counts written to
    // campaign and to the CAMPAIGN_FINALIZED audit entry must reflect that,
    // not a pre-flip snapshot. Mirrors the storage.js fix (previously this ran
    // after counts were derived, so a claimed-but-never-resolved row would
    // silently vanish from both the campaign row and the audit trail).
    for (const record of store.campaignEmails.values()) {
      if (record.campaignId === campaignId && record.status === CAMPAIGN_EMAIL_STATUS.PENDING) {
        record.status = CAMPAIGN_EMAIL_STATUS.FAILED;
        record.failureReason = "campaign_terminated";
      }
    }

    const counts = await this.deriveCountsFromCampaignEmails(campaignId);
    Object.assign(campaign, counts);

    // Mirrors storage.js — the authoritative "what actually happened" record,
    // written once here with the true final counts.
    await this.createAuditLog({
      userId: campaign.userId,
      action: AUDIT_ACTIONS.CAMPAIGN_FINALIZED,
      targetType: "campaign",
      targetId: campaignId,
      details: { toStatus, ...counts },
    });

    return true;
  },

  // ==================== AUDIT LOG OPERATIONS ====================
  async createAuditLog(data) {
    try {
      const id = generateUUID();
      const log = {
        id,
        userId: data.userId || null,
        action: data.action,
        targetType: data.targetType || null,
        targetId: data.targetId || null,
        details: data.details || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        createdAt: new Date()
      };
      
      store.auditLogs.set(id, log);
    } catch (err) {
      console.error("Failed to create audit log:", err);
    }
  },

  async getAuditLogs(filters = {}) {
    let result = toSortedArray(store.auditLogs);

    if (filters.userId) {
      result = result.filter(l => l.userId === filters.userId);
    }
    if (filters.action) {
      result = result.filter(l => l.action === filters.action);
    }
    if (filters.targetId) {
      result = result.filter(l => l.targetId === filters.targetId);
    }
    
    result = result.slice(0, filters.limit || 100);
    
    // Add username to each log
    return result.map(log => {
      const user = log.userId ? store.users.get(log.userId) : null;
      return {
        ...log,
        username: user?.username || null
      };
    });
  },

  // ==================== DASHBOARD OPERATIONS ====================
  async createAiUsageLog(data) {
    const id = generateUUID();
    const log = {
      id,
      userId: data.userId,
      endpoint: data.endpoint,
      model: data.model,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      estimatedCostUsd: Number(data.estimatedCostUsd),
      cached: data.cached ?? false,
      latencyMs: data.latencyMs ?? null,
      requestHash: data.requestHash ?? null,
      createdAt: new Date(),
    };
    store.aiUsageLogs.set(id, log);
    return log;
  },

  async getDashboardStats(userId, isRootAdmin) {
    const campaignsList = await this.getCampaigns(userId, isRootAdmin);
    const base = {
      totalCampaigns: campaignsList.length,
      activeCampaigns: campaignsList.filter(c => c.status === "RUNNING" || c.status === "PAUSED").length,
      completedCampaigns: campaignsList.filter(c => c.status === "COMPLETED").length,
      totalEmailsSent: campaignsList.reduce((sum, c) => sum + (c.sentEmails || 0), 0)
    };

    if (!isRootAdmin) return base;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // All AI analytics scoped to 30 days — matches getDashboardStats in dbStorage
    const recentLogs = Array.from(store.aiUsageLogs.values()).filter(l => new Date(l.createdAt) >= thirtyDaysAgo);

    const totalCalls = recentLogs.length;
    const cachedCalls = recentLogs.filter(l => l.cached).length;
    const totalCostUsd = recentLogs.reduce((s, l) => s + Number(l.estimatedCostUsd), 0);

    const endpointMap = {};
    for (const l of recentLogs) {
      if (!endpointMap[l.endpoint]) {
        endpointMap[l.endpoint] = { totalCost: 0, totalCalls: 0, cacheHits: 0, latencySum: 0, latencyCount: 0 };
      }
      endpointMap[l.endpoint].totalCost += Number(l.estimatedCostUsd);
      endpointMap[l.endpoint].totalCalls++;
      if (l.cached) {
        endpointMap[l.endpoint].cacheHits++;
      } else if (l.latencyMs > 0) {
        endpointMap[l.endpoint].latencySum += l.latencyMs;
        endpointMap[l.endpoint].latencyCount++;
      }
    }

    const spenderMap = {};
    for (const l of recentLogs) {
      if (!spenderMap[l.userId]) spenderMap[l.userId] = { userId: l.userId, username: null, totalCost: 0, totalCalls: 0 };
      spenderMap[l.userId].totalCost += Number(l.estimatedCostUsd);
      spenderMap[l.userId].totalCalls++;
    }
    // Resolve usernames
    for (const s of Object.values(spenderMap)) {
      const user = store.users.get(s.userId);
      s.username = user?.username || s.userId;
    }
    const topSpenders = Object.values(spenderMap)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);

    return {
      ...base,
      aiStats: {
        totalAiCostUsd: totalCostUsd,
        aiCostLast30Days: totalCostUsd,
        totalAiCalls: totalCalls,
        cacheHitRate: totalCalls > 0 ? ((cachedCalls / totalCalls) * 100).toFixed(1) : "0.0",
        aiCostByEndpoint: Object.entries(endpointMap).map(([endpoint, v]) => ({
          endpoint,
          totalCost: v.totalCost,
          totalCalls: v.totalCalls,
          cacheHits: v.cacheHits,
          avgLatencyMs: v.latencyCount > 0 ? Math.round(v.latencySum / v.latencyCount) : null,
        })),
        topAiSpenders: topSpenders,
      },
    };
  },

  async getTeamStats(parentId) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const children = Array.from(store.users.values()).filter(u => u.parentId === parentId && u.isActive);
    const childIds = new Set(children.map(u => u.id));
    const teamCampaigns = Array.from(store.campaigns.values()).filter(c => childIds.has(c.userId));

    const activeUserIds = new Set(
      teamCampaigns
        .filter(c => new Date(c.createdAt) >= sevenDaysAgo)
        .map(c => c.userId)
    );

    return {
      totalTeamMembers:            children.length,
      activeThisWeek:              activeUserIds.size,
      totalTeamCampaigns:          teamCampaigns.length,
      totalTeamCreditsUsed:        children.reduce((s, u) => s + (u.creditsUsed || 0), 0),
      totalTeamAiGenerationsToday: children.reduce((s, u) => s + (u.aiGenerationsToday || 0), 0),
      creditsAllocatedToTeam:      children.reduce((s, u) => s + (u.creditsReceived || 0), 0),
      creditsRemainingInTeam:      children.reduce((s, u) => s + ((u.creditsReceived || 0) - (u.creditsAllocated || 0) - (u.creditsUsed || 0)), 0),
    };
  },

  async getUsersWithStats(parentId, isRootAdmin = false) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const userRows = isRootAdmin
      ? toSortedArray(store.users)
      : toSortedArray(store.users).filter(u => u.parentId === parentId);

    if (userRows.length === 0) return [];

    const userIdSet = new Set(userRows.map(u => u.id));
    const teamCampaigns = Array.from(store.campaigns.values()).filter(c => userIdSet.has(c.userId));

    // Build per-user campaign stats in one pass
    const statsMap = {};
    for (const c of teamCampaigns) {
      if (!statsMap[c.userId]) statsMap[c.userId] = { total: 0, lastAt: null, activeRecently: false, runningReserved: 0 };
      statsMap[c.userId].total++;
      const cAt = new Date(c.createdAt);
      if (!statsMap[c.userId].lastAt || cAt > new Date(statsMap[c.userId].lastAt)) {
        statsMap[c.userId].lastAt = c.createdAt;
      }
      if (cAt >= sevenDaysAgo) statsMap[c.userId].activeRecently = true;
      if (c.status === "RUNNING") {
        statsMap[c.userId].runningReserved += Math.max(0, (c.totalEmails || 0) - (c.sentEmails || 0));
      }
    }

    const parentEffectivePlan = await this.getEffectivePlan(parentId);
    const now = Date.now();
    const reclaimAfterWarningMs = (INACTIVITY_THRESHOLDS.RECLAIM_ELIGIBLE_DAYS - INACTIVITY_THRESHOLDS.WARNING_DAYS) * 86400000;

    return userRows.map(u => {
      const s = statsMap[u.id] || {};
      const childPlan = (u.plan && u.plan !== "free") ? u.plan : parentEffectivePlan;
      const { passwordHash, ...safe } = u;
      const creditsRemaining = (u.creditsReceived || 0) - (u.creditsAllocated || 0) - (u.creditsUsed || 0);
      const runningReserved = s.runningReserved || 0;
      return {
        ...safe,
        creditsRemaining,
        safeReclaimable:    Math.max(0, creditsRemaining - runningReserved),
        totalCampaigns:     s.total || 0,
        lastCampaignAt:     s.lastAt || null,
        isActiveThisWeek:   s.activeRecently || false,
        aiGenerationsToday: u.aiGenerationsToday || 0,
        aiDailyLimit:       AI_DAILY_LIMITS[childPlan] ?? AI_DAILY_LIMITS.free,
        daysInactive:       Math.floor((now - new Date(u.lastActivityAt || u.createdAt).getTime()) / 86400000),
        isReclaimEligible:  Boolean(
                              u.inactivityWarningSentAt &&
                              u.inactivityKeepToken &&
                              new Date(u.inactivityWarningSentAt) < new Date(Date.now() - 60 * 86400000)
                            ),
      };
    });
  },

  // ==================== ADMIN INITIALIZATION ====================
  async initializeRootAdmin() {
    try {
      const adminUsername = process.env.ADMIN_USERNAME || "admin";
      const adminPassword = process.env.ADMIN_PASSWORD || "changeme123";
      const adminEmail = process.env.ADMIN_EMAIL || "admin@repmail.io";

      const existingAdmin = await this.getUserByUsername(adminUsername);
      if (existingAdmin) {
        console.log("[DEV MODE] Root admin already exists");
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
      
      console.log("[DEV MODE] Root admin created - password reset required on first login");
      return admin;
    } catch (err) {
      console.error("[DEV MODE] Failed to initialize root admin:", err);
      return null;
    }
  },

  // ==================== PAYMENT OPERATIONS ====================
  async createPayment(paymentData) {
    const id = generateUUID();
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const payment = {
      id,
      userId: paymentData.userId,
      planName: paymentData.planName,
      credits: paymentData.credits,
      amountUsd: paymentData.amountUsd,
      amountInr: paymentData.amountInr,
      amountLocal: paymentData.amountLocal,
      currency: paymentData.currency || "USD",
      exchangeRate: paymentData.exchangeRate || null,
      status: paymentData.status || PAYMENT_STATUS.PENDING,
      paymentMethod: paymentData.paymentMethod || null,
      transactionId: null,
      invoiceNumber,
      invoiceUrl: null,
      metadata: paymentData.metadata || null,
      createdAt: new Date(),
      completedAt: null
    };
    
    store.payments.set(id, payment);
    
    await this.createAuditLog({
      userId: paymentData.userId,
      action: AUDIT_ACTIONS.PAYMENT_INITIATED,
      targetType: "payment",
      targetId: id,
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
    const payment = store.payments.get(paymentId);
    if (!payment) throw new Error("Payment not found");
    if (payment.status === PAYMENT_STATUS.SUCCESS) return { payment, credited: false };

    // Update payment status
    payment.status = PAYMENT_STATUS.SUCCESS;
    payment.transactionId = transactionId;
    payment.completedAt = new Date();

    // Credit user account
    const user = store.users.get(payment.userId);
    const balanceBefore = user
      ? (user.creditsReceived || 0) - (user.creditsAllocated || 0) - (user.creditsUsed || 0)
      : 0;
    if (user) {
      user.creditsReceived += payment.credits;
      user.isTrialUser = false;
      user.updatedAt = new Date();
    }

    // Create credit transaction
    const txId = generateUUID();
    store.creditTransactions.set(txId, {
      id: txId,
      userId: payment.userId,
      type: "purchase",
      amount: payment.credits,
      balanceBefore,
      balanceAfter: balanceBefore + payment.credits,
      description: `Purchased ${payment.credits} credits - ${payment.planName}`,
      createdAt: new Date()
    });

    await this.createAuditLog({
      userId: payment.userId,
      action: AUDIT_ACTIONS.PAYMENT_SUCCESS,
      targetType: "payment",
      targetId: paymentId,
      details: { credits: payment.credits, transactionId }
    });

    return { payment, credited: true };
  },

  async failPayment(paymentId, reason) {
    const payment = store.payments.get(paymentId);
    if (!payment) throw new Error("Payment not found");
    
    payment.status = PAYMENT_STATUS.FAILED;
    
    await this.createAuditLog({
      userId: payment.userId,
      action: AUDIT_ACTIONS.PAYMENT_FAILED,
      targetType: "payment",
      targetId: paymentId,
      details: { reason }
    });
  },

  async getPayment(id) {
    return store.payments.get(id) || null;
  },

  async getUserPayments(userId) {
    return toSortedArray(store.payments).filter(p => p.userId === userId);
  },

  // ==================== CONTACT SUBMISSION OPERATIONS ====================
  async createContactSubmission(data) {
    const id = generateUUID();
    const submission = {
      id,
      name: data.name,
      email: data.email,
      company: data.company || null,
      reason: data.reason,
      message: data.message,
      userId: data.userId || null,
      isRead: false,
      respondedAt: null,
      createdAt: new Date()
    };
    
    store.contactSubmissions.set(id, submission);
    
    await this.createAuditLog({
      userId: data.userId || null,
      action: AUDIT_ACTIONS.CONTACT_FORM_SUBMITTED,
      targetType: "contact_submission",
      targetId: id,
      details: { reason: data.reason, email: data.email }
    });
    
    return submission;
  },

  async getContactSubmissions(filters = {}) {
    let result = toSortedArray(store.contactSubmissions);
    if (filters.limit) {
      result = result.slice(0, filters.limit);
    }
    return result;
  },

  async markContactSubmissionRead(id) {
    const submission = store.contactSubmissions.get(id);
    if (submission) {
      submission.isRead = true;
    }
    return submission;
  },

  // ==================== WAITLIST OPERATIONS ====================
  async addToWaitlist(data) {
    // Check for duplicate email
    for (const entry of store.waitlist.values()) {
      if (entry.email.toLowerCase() === data.email.toLowerCase()) {
        throw new Error("DUPLICATE_EMAIL");
      }
    }
    
    const id = generateUUID();
    const entry = {
      id,
      email: data.email.toLowerCase().trim(),
      source: data.source || null,
      createdAt: new Date()
    };
    
    store.waitlist.set(id, entry);
    return entry;
  },

  async getWaitlistCount() {
    return store.waitlist.size;
  },

  async getWaitlistEntries(limit = 100) {
    return toSortedArray(store.waitlist).slice(0, limit);
  },

  // ==================== TRIAL CREDIT OPERATIONS ====================
  async getTrialCreditsRemaining(userId) {
    const user = store.users.get(userId);
    if (!user) return 0;
    return Math.max(0, (user.trialCredits || 5) - (user.trialCreditsUsed || 0));
  },

  async useTrialCredit(userId, campaignId) {
    const user = store.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const remaining = (user.trialCredits || 5) - (user.trialCreditsUsed || 0);
    if (remaining <= 0) {
      throw new Error("No trial credits remaining");
    }
    
    user.trialCreditsUsed += 1;
    user.updatedAt = new Date();
    
    return remaining - 1;
  },

  async getTotalCreditsAvailable(userId) {
    const user = await this.getUserById(userId);
    if (!user) return { paid: 0, free: 0, trial: 0, total: 0, isTrialUser: false, isFreePlan: false };

    const freePlanEnabled = process.env.FREE_PLAN_ENABLED === "true";
    const monthlyGrant = MONTHLY_CREDITS[user.plan] ?? 0;
    const paidRemaining = Math.max(0,
      (user.creditsReceived || 0) - (user.creditsAllocated || 0) - (user.creditsUsed || 0)
    );

    let freeRemaining = 0;
    let isFreePlan = false;
    if (freePlanEnabled && !user.isTrialUser && monthlyGrant > 0) {
      isFreePlan = true;
      const resetAt = user.freeCreditsResetAt;
      const refDate = resetAt ? new Date(resetAt) : new Date(user.createdAt);
      const nextReset = new Date(refDate);
      nextReset.setUTCMonth(nextReset.getUTCMonth() + 1);
      const effectiveUsed = new Date() >= nextReset ? 0 : (user.freeCreditsUsed || 0);
      freeRemaining = Math.max(0, monthlyGrant - effectiveUsed);
    }

    const trialRemaining = (!freePlanEnabled && user.isTrialUser)
      ? Math.max(0, (user.trialCredits || 5) - (user.trialCreditsUsed || 0))
      : 0;

    // Next reset: 1 month rolling from signup date (or last reset)
    const resetAt = user.freeCreditsResetAt;
    const refDate = resetAt ? new Date(resetAt) : new Date(user.createdAt);
    const nextResetDate = new Date(refDate);
    nextResetDate.setUTCMonth(nextResetDate.getUTCMonth() + 1);

    return {
      paid: paidRemaining,
      free: freeRemaining,
      trial: trialRemaining,
      total: paidRemaining + freeRemaining + trialRemaining,
      isTrialUser: user.isTrialUser,
      isFreePlan,
      freeResetDate: isFreePlan ? nextResetDate.toISOString() : null,
      monthlyFreeCredits: isFreePlan ? monthlyGrant : 0,
    };
  },

  async getEffectivePlan(userId) {
    const user = store.users.get(userId);
    if (!user) return "free";
    if (user.plan && user.plan !== "free") return user.plan;
    if (user.parentId) {
      const parent = store.users.get(user.parentId);
      if (parent?.plan) return parent.plan;
    }
    return "free";
  },

  async checkAndIncrementAiQuota(userId) {
    const effectivePlan = await this.getEffectivePlan(userId);
    const limit = AI_DAILY_LIMITS[effectivePlan] ?? AI_DAILY_LIMITS.free;
    if (limit === Infinity) return { allowed: true, remaining: Infinity, resetsAt: null };

    const user = store.users.get(userId);
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

    user.aiGenerationsToday = currentCount + 1;
    if (needsReset) user.aiGenerationsResetAt = now;
    user.updatedAt = now;

    return { allowed: true, remaining: limit - currentCount - 1, resetsAt };
  },

  async refundAiQuota(userId) {
    const user = store.users.get(userId);
    if (!user) return;
    user.aiGenerationsToday = Math.max((user.aiGenerationsToday || 0) - 1, 0);
    user.updatedAt = new Date();
  },

  // ── Campaign Emails ────────────────────────────────────────────────────────

  async createCampaignEmail(data) {
    const id = generateUUID();
    const record = {
      id,
      campaignId: data.campaignId,
      userId: data.userId,
      contactId: data.contactId || null,
      recipientEmail: data.recipientEmail,
      sesMessageId: null,
      status: data.status || CAMPAIGN_EMAIL_STATUS.PENDING,
      failureReason: null,
      sentAt: null,
      openedAt: null,
      clickedAt: null,
      createdAt: new Date(),
    };
    store.campaignEmails.set(id, record);
    return record;
  },

  // PAR-TRUST-017 §7.1 — mirrors storage.js's claimCampaignEmail exactly: only a
  // FAILED row with a transient (non-permanent) reason is reclaimable, never a
  // PENDING one. A concurrency test caught the reason directly: reclaiming
  // PENDING→PENDING is a no-op transition, so it provides no exclusion at all —
  // every concurrent claimant would "win" the same row. FAILED→PENDING is a
  // genuine value change, so whichever call reaches it first correctly excludes
  // every other one. A PENDING row is either actively held by whoever claimed it
  // (must not be touched) or orphaned from a dead process, in which case
  // finalizeCampaign's orphan cleanup (§7.3) converts it to
  // FAILED("campaign_terminated") once the campaign finalizes, making it
  // legitimately reclaimable afterward.
  async claimCampaignEmail(data) {
    for (const record of store.campaignEmails.values()) {
      if (record.campaignId !== data.campaignId) continue;
      const sameContact = data.contactId != null && record.contactId === data.contactId;
      const sameRecipient = data.contactId == null && record.contactId == null && record.recipientEmail === data.recipientEmail;
      if (!sameContact && !sameRecipient) continue;

      const isReclaimable = record.status === CAMPAIGN_EMAIL_STATUS.FAILED
        && (!record.failureReason || !PERMANENT_FAILURE_REASONS.includes(record.failureReason));
      if (!isReclaimable) return null; // PENDING (held or orphaned) or terminal — already claimed

      record.status = CAMPAIGN_EMAIL_STATUS.PENDING;
      record.failureReason = null;
      return record;
    }
    return await this.createCampaignEmail(data);
  },

  async updateCampaignEmail(id, updates) {
    const record = store.campaignEmails.get(id);
    if (!record) return null;
    Object.assign(record, updates);
    return record;
  },

  async getCampaignEmailBySesMessageId(sesMessageId) {
    for (const record of store.campaignEmails.values()) {
      if (record.sesMessageId === sesMessageId) return record;
    }
    return null;
  },

  async getCampaignEmailsByCampaign(campaignId, limit = 50) {
    return toSortedArray(store.campaignEmails)
      .filter(r => r.campaignId === campaignId)
      .slice(0, limit);
  },

  async getCampaignEmailByContact(campaignId, contactId) {
    for (const record of store.campaignEmails.values()) {
      if (record.campaignId === campaignId && record.contactId === contactId) return record;
    }
    return null;
  },

  async hasAnySentEmails(campaignId) {
    for (const record of store.campaignEmails.values()) {
      if (record.campaignId === campaignId && record.status === CAMPAIGN_EMAIL_STATUS.SENT) return true;
    }
    return false;
  },

  // Mirrors storage.js — see its comment for why this check exists.
  async hasOutstandingClaims(campaignId) {
    for (const record of store.campaignEmails.values()) {
      if (record.campaignId === campaignId && record.status === CAMPAIGN_EMAIL_STATUS.PENDING) return true;
    }
    return false;
  },

  // ── Suppressions ───────────────────────────────────────────────────────────

  async addSuppression(userId, email, source, reason = null) {
    const normalizedEmail = email.toLowerCase().trim();
    // idempotent — one suppression per (userId, email) regardless of source
    for (const record of store.suppressions.values()) {
      if (record.userId === userId && record.email === normalizedEmail) return;
    }
    const id = generateUUID();
    store.suppressions.set(id, { id, userId, email: normalizedEmail, source, reason, createdAt: new Date() });
    console.log(`[SUPPRESSION] userId=${userId} email=${normalizedEmail} source=${source}`);
  },

  async isSuppressed(userId, email) {
    const normalizedEmail = email.toLowerCase().trim();
    for (const record of store.suppressions.values()) {
      if (record.userId === userId && record.email === normalizedEmail) return true;
    }
    return false;
  },

  async getSuppressions(userId) {
    return toSortedArray(store.suppressions).filter(r => r.userId === userId);
  },

  async deleteSuppression(id, userId) {
    const record = store.suppressions.get(id);
    if (!record || record.userId !== userId) return null;
    store.suppressions.delete(id);
    return record;
  },

  async isGloballySuppressed(email) {
    const normalizedEmail = email.toLowerCase().trim();
    for (const record of store.suppressions.values()) {
      if (record.email === normalizedEmail) return true;
    }
    return false;
  },

  async getPreCampaignSuppressionCount(emails) {
    if (!emails || emails.length === 0) return 0;
    const normalizedSet = new Set(emails.map(e => e.toLowerCase().trim()));
    const found = new Set();
    for (const record of store.suppressions.values()) {
      if (normalizedSet.has(record.email)) found.add(record.email);
    }
    return found.size;
  },

  async getSuppressionRecord(userId, email) {
    const normalizedEmail = email.toLowerCase().trim();
    let fallback = null;
    for (const record of store.suppressions.values()) {
      if (record.email !== normalizedEmail) continue;
      if (record.userId === userId) return { source: record.source, reason: record.reason, createdAt: record.createdAt };
      if (!fallback) fallback = { source: record.source, reason: record.reason, createdAt: record.createdAt };
    }
    return fallback;
  },

  async getSuppressionDetailsForEmails(campaignUserId, emails) {
    if (!emails || emails.length === 0) return new Map();
    const normalizedSet = new Set(emails.map(e => e.toLowerCase().trim()));
    const byEmail = new Map();
    for (const record of store.suppressions.values()) {
      if (!normalizedSet.has(record.email)) continue;
      const existing = byEmail.get(record.email);
      if (!existing || record.userId === campaignUserId) {
        byEmail.set(record.email, {
          source:       record.source,
          reason:       record.reason,
          suppressedAt: record.createdAt,
          scope:        record.userId === campaignUserId ? "user" : "global",
        });
      }
    }
    return byEmail;
  },

  // ── SNS event deduplication ────────────────────────────────────────────────

  async getSnsEvent(messageId) {
    return store.snsEvents.get(messageId) || null;
  },

  async createSnsEvent(messageId, eventType) {
    if (store.snsEvents.has(messageId)) return false;
    store.snsEvents.set(messageId, { messageId, eventType, processedAt: new Date(), processed: false });
    return true;
  },

  async updateSnsEventProcessed(messageId) {
    const record = store.snsEvents.get(messageId);
    if (record) record.processed = true;
  },

  async deleteOldSnsEvents() {
    const cutoff = new Date(Date.now() - 7 * 86400000);
    for (const [id, record] of store.snsEvents) {
      if (record.processedAt < cutoff) store.snsEvents.delete(id);
    }
  },

  async incrementCampaignBounced(campaignId) {
    const campaign = store.campaigns.get(campaignId);
    if (campaign) campaign.bouncedEmails = (campaign.bouncedEmails || 0) + 1;
  },

  async incrementCampaignComplained(campaignId) {
    const campaign = store.campaigns.get(campaignId);
    if (campaign) campaign.complainedEmails = (campaign.complainedEmails || 0) + 1;
  },

  async getCampaignEmailById(id) {
    return store.campaignEmails.get(id) || null;
  },

  async updateCampaignEmailOpened(campaignEmailId) {
    const record = store.campaignEmails.get(campaignEmailId);
    if (!record || record.openedAt != null) return { wasFirst: false };
    record.openedAt = new Date();
    return { wasFirst: true };
  },

  async updateCampaignEmailClicked(campaignEmailId) {
    const record = store.campaignEmails.get(campaignEmailId);
    if (!record || record.clickedAt != null) return { wasFirst: false };
    record.clickedAt = new Date();
    return { wasFirst: true };
  },

  // Mirrors storage.js — previously missing entirely from this backend.
  async updateCampaignEmailDelivered(campaignEmailId) {
    const record = store.campaignEmails.get(campaignEmailId);
    if (!record || record.deliveredAt != null) return { wasFirst: false };
    record.deliveredAt = new Date();
    return { wasFirst: true };
  },

  async updateCampaignEmailBounced(campaignEmailId) {
    const record = store.campaignEmails.get(campaignEmailId);
    if (!record || record.status === CAMPAIGN_EMAIL_STATUS.BOUNCED) return { wasFirst: false };
    record.status = CAMPAIGN_EMAIL_STATUS.BOUNCED;
    return { wasFirst: true };
  },

  async updateCampaignEmailComplained(campaignEmailId) {
    const record = store.campaignEmails.get(campaignEmailId);
    if (!record || record.status === CAMPAIGN_EMAIL_STATUS.COMPLAINED) return { wasFirst: false };
    record.status = CAMPAIGN_EMAIL_STATUS.COMPLAINED;
    return { wasFirst: true };
  },

  async incrementCampaignOpened(campaignId) {
    const campaign = store.campaigns.get(campaignId);
    if (campaign) campaign.openedEmails = (campaign.openedEmails || 0) + 1;
  },

  async incrementCampaignClicked(campaignId) {
    const campaign = store.campaigns.get(campaignId);
    if (campaign) campaign.clickedEmails = (campaign.clickedEmails || 0) + 1;
  },

  async incrementCampaignDelivered(campaignId) {
    const campaign = store.campaigns.get(campaignId);
    if (campaign) campaign.deliveredEmails = (campaign.deliveredEmails || 0) + 1;
  },

  // ── M11: Unsubscribe analytics ─────────────────────────────────────────────

  async recordCampaignEmailUnsubscribed(recipientEmail, userId, campaignId) {
    const normalizedEmail = recipientEmail.toLowerCase().trim();
    for (const record of store.campaignEmails.values()) {
      if (
        record.campaignId === campaignId &&
        record.userId === userId &&
        record.recipientEmail === normalizedEmail &&
        record.status !== "SUPPRESSED" &&
        !record.unsubscribedAt
      ) {
        record.unsubscribedAt = new Date();
        return { campaignId: record.campaignId };
      }
    }
    return null;
  },

  async incrementCampaignUnsubscribed(campaignId) {
    const campaign = store.campaigns.get(campaignId);
    if (campaign) campaign.unsubscribedEmails = (campaign.unsubscribedEmails || 0) + 1;
  },

  // ── Invites ────────────────────────────────────────────────────────────────

  async createInvite(data) {
    const id = generateUUID();
    const invite = {
      id,
      email: data.email,
      role: data.role,
      invitedBy: data.invitedBy,
      tokenHash: data.tokenHash,
      expiresAt: new Date(data.expiresAt),
      acceptedAt: null,
      createdAt: new Date(),
    };
    store.invites.set(id, invite);
    return invite;
  },

  async getInviteByTokenHash(tokenHash) {
    for (const invite of store.invites.values()) {
      if (invite.tokenHash === tokenHash) return invite;
    }
    return null;
  },

  async getInviteById(id) {
    return store.invites.get(id) || null;
  },

  async getPendingInvitesByAdmin(invitedBy) {
    return toSortedArray(store.invites)
      .filter(i => i.invitedBy === invitedBy);
  },

  async markInviteAccepted(id) {
    const invite = store.invites.get(id);
    if (!invite) return null;
    invite.acceptedAt = new Date();
    return invite;
  },

  async updateInviteToken(id, tokenHash, expiresAt) {
    const invite = store.invites.get(id);
    if (!invite) return null;
    invite.tokenHash = tokenHash;
    invite.expiresAt = new Date(expiresAt);
    return invite;
  },

  async deleteExpiredInvites() {
    const now = new Date();
    let count = 0;
    for (const [id, invite] of store.invites.entries()) {
      if (invite.expiresAt < now && !invite.acceptedAt) {
        store.invites.delete(id);
        count++;
      }
    }
    return count;
  },

  async getChildUserCount(parentId) {
    let count = 0;
    for (const user of store.users.values()) {
      if (user.parentId === parentId && user.isActive) count++;
    }
    return count;
  },

  // ── Inactivity Governance ──────────────────────────────────────────────────

  async updateUserActivity(userId) {
    const user = store.users.get(userId);
    if (!user) return;

    const wasDormant = user.isDormant;
    user.lastActivityAt = new Date();
    user.inactivityWarningSentAt = null;
    user.inactivityKeepToken = null;
    user.inactivityKeepTokenExpiresAt = null;
    user.isDormant = false;
    user.updatedAt = new Date();

    if (wasDormant) {
      await this.createAuditLog({
        userId,
        action: AUDIT_ACTIONS.USER_REACTIVATED,
        targetType: "user",
        targetId: userId,
      });
    }
  },

  async setUserDormant(userId) {
    const user = store.users.get(userId);
    if (!user) return;

    user.isDormant = true;
    user.updatedAt = new Date();

    const creditsRemaining = (user.creditsReceived || 0) - (user.creditsAllocated || 0) - (user.creditsUsed || 0);
    const daysInactive = user.lastActivityAt
      ? Math.floor((Date.now() - new Date(user.lastActivityAt).getTime()) / 86400000)
      : null;

    await this.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.USER_DORMANT,
      targetType: "user",
      targetId: userId,
      details: { daysInactive, creditsRemaining },
    });
  },

  async getUsersForInactivityCheck() {
    const { WARNING_DAYS } = INACTIVITY_THRESHOLDS;
    const cutoff = new Date(Date.now() - WARNING_DAYS * 24 * 60 * 60 * 1000);

    return Array.from(store.users.values()).filter(u => {
      if (u.role === USER_ROLES.ROOT_ADMIN) return false;
      if (u.isSecondaryRoot) return false;
      if (!u.isActive) return false;
      if (u.lastActivityAt == null) return new Date(u.createdAt) < cutoff;
      return new Date(u.lastActivityAt) < cutoff;
    });
  },

  async autoReclaimCredits(fromUserId, toUserId) {
    const child = store.users.get(fromUserId);
    const parent = store.users.get(toUserId);
    if (!child || !parent) throw new Error("User not found");

    const creditsRemaining = (child.creditsReceived || 0) - (child.creditsAllocated || 0) - (child.creditsUsed || 0);
    const runningCampaignCredits = Array.from(store.campaigns.values())
      .filter(c => c.userId === fromUserId && c.status === CAMPAIGN_STATUS.RUNNING)
      .reduce((sum, c) => sum + Math.max(0, (c.totalEmails || 0) - (c.sentEmails || 0)), 0);

    const safeReclaim = creditsRemaining - runningCampaignCredits;
    if (safeReclaim <= 0) return { amount: 0, skipped: true, protectedCredits: runningCampaignCredits };

    const childBalanceBefore = creditsRemaining;
    const parentActualBalance = (parent.creditsReceived || 0) - (parent.creditsAllocated || 0) - (parent.creditsUsed || 0);

    child.creditsReceived -= safeReclaim;
    child.updatedAt = new Date();
    parent.creditsAllocated -= safeReclaim;
    parent.updatedAt = new Date();

    const txId1 = generateUUID();
    store.creditTransactions.set(txId1, {
      id: txId1, userId: fromUserId, type: "reclaim_out",
      amount: -safeReclaim,
      balanceBefore: childBalanceBefore, balanceAfter: childBalanceBefore - safeReclaim,
      fromUserId, toUserId,
      description: `${safeReclaim} credits reclaimed — 90 days inactivity`,
      createdAt: new Date(),
    });

    const txId2 = generateUUID();
    store.creditTransactions.set(txId2, {
      id: txId2, userId: toUserId, type: "reclaim_in",
      amount: safeReclaim,
      balanceBefore: parentActualBalance, balanceAfter: parentActualBalance + safeReclaim,
      fromUserId, toUserId,
      description: `${safeReclaim} credits auto-reclaimed from ${child.username} — 90 days inactivity`,
      createdAt: new Date(),
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

    let user = null;
    for (const u of store.users.values()) {
      if (u.inactivityKeepToken === tokenHash) { user = u; break; }
    }

    if (!user) return { valid: false, reason: "not_found" };

    if (!user.inactivityKeepTokenExpiresAt || new Date(user.inactivityKeepTokenExpiresAt) < new Date()) {
      return { valid: false, userId: user.id, reason: "expired" };
    }

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
    const user = store.users.get(userId);
    if (!user) return;
    user.inactivityWarningSentAt = new Date();
    user.inactivityKeepToken = tokenHash ?? null;
    user.inactivityKeepTokenExpiresAt = tokenExpiresAt ?? null;
    user.updatedAt = new Date();
  },

  async updateInactivityToken(userId, tokenHash, tokenExpiresAt) {
    const user = store.users.get(userId);
    if (!user) return;
    user.inactivityKeepToken = tokenHash;
    user.inactivityKeepTokenExpiresAt = tokenExpiresAt;
    user.updatedAt = new Date();
  },

  async clearInactivityToken(userId) {
    const user = store.users.get(userId);
    if (!user) return;
    user.inactivityKeepToken = null;
    user.inactivityKeepTokenExpiresAt = null;
    user.updatedAt = new Date();
  },

  // ── Self-service password reset ────────────────────────────────────────────

  async setPasswordResetToken(userId, tokenHash, expiresAt) {
    const user = store.users.get(userId);
    if (!user) return;
    user.resetToken = tokenHash;
    user.resetTokenExpiresAt = expiresAt;
    user.updatedAt = new Date();
  },

  async getUserByResetToken(tokenHash) {
    const now = new Date();
    for (const user of store.users.values()) {
      if (user.resetToken === tokenHash && user.resetTokenExpiresAt && new Date(user.resetTokenExpiresAt) >= now) {
        return { ...user };
      }
    }
    return null;
  },

  async clearPasswordResetToken(userId) {
    const user = store.users.get(userId);
    if (!user) return;
    user.resetToken = null;
    user.resetTokenExpiresAt = null;
    user.updatedAt = new Date();
  },

  // ── Secondary Root Admin ───────────────────────────────────────────────────

  async grantSecondaryRoot(userId) {
    const user = store.users.get(userId);
    if (!user) return;
    user.isSecondaryRoot = true;
    user.updatedAt = new Date();
  },

  async revokeSecondaryRoot(userId) {
    const user = store.users.get(userId);
    if (!user) return;
    user.isSecondaryRoot = false;
    user.updatedAt = new Date();
  },

  async getSecondaryRootCount() {
    let count = 0;
    for (const user of store.users.values()) {
      if (user.isSecondaryRoot) count++;
    }
    return count;
  },

  async markAllRootAdminsRecoveryAt(timestamp) {
    for (const user of store.users.values()) {
      if (user.role === USER_ROLES.ROOT_ADMIN) {
        user.lastEmergencyRecoveryAt = timestamp;
      }
    }
  },

  // ── Data Cleanup Jobs ──────────────────────────────────────────────────────

  async deleteExpiredSessions() {
    const now = new Date();
    let count = 0;
    for (const [id, session] of store.sessions.entries()) {
      if (new Date(session.expiresAt) < now) {
        store.sessions.delete(id);
        count++;
      }
    }
    return count;
  },

  async pruneAuditLogs(retentionDays) {
    const cutoff = new Date(Date.now() - retentionDays * 86400000);
    let count = 0;
    for (const [id, log] of store.auditLogs.entries()) {
      if (new Date(log.createdAt) < cutoff) {
        store.auditLogs.delete(id);
        count++;
      }
    }
    return count;
  },

  async deleteOldCampaignEmails(retentionDays) {
    const cutoff = new Date(Date.now() - retentionDays * 86400000);
    let count = 0;
    for (const campaign of store.campaigns.values()) {
      if (!["COMPLETED", "FAILED"].includes(campaign.status)) continue;
      if (new Date(campaign.createdAt) >= cutoff) continue;
      for (const [id, email] of store.campaignEmails.entries()) {
        if (email.campaignId === campaign.id) {
          store.campaignEmails.delete(id);
          count++;
        }
      }
    }
    return count;
  },

  async pruneAiUsageLogs(retentionDays) {
    const cutoff = new Date(Date.now() - retentionDays * 86400000);
    let count = 0;
    for (const [id, log] of store.aiUsageLogs.entries()) {
      if (new Date(log.createdAt) < cutoff) {
        store.aiUsageLogs.delete(id);
        count++;
      }
    }
    return count;
  },

  async expireInactivityTokens() {
    const now = new Date();
    let count = 0;
    for (const user of store.users.values()) {
      if (
        user.inactivityKeepToken &&
        user.inactivityKeepTokenExpiresAt &&
        new Date(user.inactivityKeepTokenExpiresAt) < now
      ) {
        user.inactivityKeepToken = null;
        user.inactivityKeepTokenExpiresAt = null;
        user.updatedAt = new Date();
        count++;
      }
    }
    return count;
  },

  async getPlatformSetting(key) {
    return this._platformSettings?.get(key) || null;
  },

  async setPlatformSetting(key, value, userId) {
    if (!this._platformSettings) this._platformSettings = new Map();
    this._platformSettings.set(key, { key, value, updatedAt: new Date(), updatedBy: userId });
  },

  async getUserSenderHealth(userId) {
    return { sent: 0, bounced: 0, complained: 0, bounceRate: 0, complaintRate: 0 };
  },

  async getDeliveryHealthStats() {
    const bouncePause = parseFloat(process.env.BOUNCE_RATE_PAUSE_THRESHOLD || "0.08");
    const complaintPause = parseFloat(process.env.COMPLAINT_RATE_PAUSE_THRESHOLD || "0.0005");
    const bounceWarn = bouncePause * 0.5;
    const complaintWarn = complaintPause * 0.5;
    return {
      status: 'healthy',
      period: '30d',
      totals: { sent: 0, bounced: 0, complained: 0 },
      rates: { bounceRate: 0, complaintRate: 0 },
      thresholds: {
        bounce: { warning: parseFloat((bounceWarn * 100).toFixed(2)), critical: parseFloat((bouncePause * 100).toFixed(2)), unit: '%' },
        complaint: { warning: parseFloat((complaintWarn * 100).toFixed(4)), critical: parseFloat((complaintPause * 100).toFixed(4)), unit: '%' },
      },
      topBouncers: [],
      suppression: { addedLast7d: 0, addedLast30d: 0 },
    };
  },

  // ── Sender Domains (M9) ────────────────────────────────────────────────────

  async createSenderDomain({ userId, domain, fromEmail, status, dkimTokens, verifyRecord, verificationWindowDays }) {
    if (!this._senderDomains) this._senderDomains = new Map();
    const id = `sd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const now = new Date();
    const row = {
      id, userId, domain, fromEmail,
      status: status || "PENDING_VERIFICATION",
      dkimTokens: dkimTokens || null,
      verifyRecord: verifyRecord || null,
      verifiedAt: null,
      suspendedAt: null,
      sentCount: 0, bouncedCount: 0, complainedCount: 0,
      verificationWindowDays: verificationWindowDays || 14,
      createdAt: now, updatedAt: now,
    };
    this._senderDomains.set(id, row);
    return row;
  },

  async getSenderDomainsByUserId(userId) {
    if (!this._senderDomains) return [];
    return [...this._senderDomains.values()]
      .filter(d => d.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getSenderDomainById(id) {
    return this._senderDomains?.get(id) || null;
  },

  async getSenderDomainByUserIdAndDomain(userId, domain) {
    if (!this._senderDomains) return null;
    return [...this._senderDomains.values()].find(d => d.userId === userId && d.domain === domain) || null;
  },

  async getSenderDomainByDomain(domain) {
    if (!this._senderDomains) return null;
    return [...this._senderDomains.values()].find(d => d.domain === domain) || null;
  },

  async getSenderDomainsByStatus(status) {
    if (!this._senderDomains) return [];
    return [...this._senderDomains.values()].filter(d => d.status === status);
  },

  async updateSenderDomain(id, updates) {
    if (!this._senderDomains) return null;
    const row = this._senderDomains.get(id);
    if (!row) return null;
    const updated = { ...row, ...updates, updatedAt: new Date() };
    this._senderDomains.set(id, updated);
    return updated;
  },

  async updateSenderDomainIfPending(id, updates) {
    if (!this._senderDomains) return null;
    const row = this._senderDomains.get(id);
    if (!row || row.status !== "PENDING_VERIFICATION") return null;
    const updated = { ...row, ...updates, updatedAt: new Date() };
    this._senderDomains.set(id, updated);
    return updated;
  },

  async deleteSenderDomain(id) {
    this._senderDomains?.delete(id);
  },

  async getVerifiedDomainForUser(userId, domainId) {
    if (!this._senderDomains) return null;
    const row = this._senderDomains.get(domainId);
    if (!row || row.userId !== userId || row.status !== "VERIFIED") return null;
    return row;
  },

  // ── M10: Email Analytics Tracking Tokens ──────────────────────────────────────

  async createTrackingTokensForEmail({ campaignEmailId, campaignId, templateLinks, retentionDays }) {
    const expiresAt = new Date(Date.now() + retentionDays * 86_400_000);
    const openToken = generateTrackingToken();
    const now = new Date();

    const openRow = {
      id: crypto.randomUUID(),
      token: openToken,
      tokenType: "open",
      campaignId,
      campaignEmailId,
      linkUrl: null,
      createdAt: now,
      expiresAt,
      firstUsedAt: null,
      usedCount: 0,
      lastUserAgentCategory: null,
      ipHash: null,
    };
    store.trackingTokens.set(openRow.id, openRow);

    const clickTokenMap = new Map();
    for (const url of templateLinks) {
      const t = generateTrackingToken();
      const row = {
        id: crypto.randomUUID(),
        token: t,
        tokenType: "click",
        campaignId,
        campaignEmailId,
        linkUrl: url,
        createdAt: now,
        expiresAt,
        firstUsedAt: null,
        usedCount: 0,
        lastUserAgentCategory: null,
        ipHash: null,
      };
      store.trackingTokens.set(row.id, row);
      clickTokenMap.set(url, t);
    }

    return { openToken, clickTokenMap };
  },

  async getTrackingToken(token) {
    for (const row of store.trackingTokens.values()) {
      if (row.token === token) return { ...row };
    }
    return null;
  },

  async recordOpenResolution(tokenRecord, { uaCategory, ipHash }) {
    const now = new Date();
    const row = store.trackingTokens.get(tokenRecord.id);
    if (!row) return;
    const isFirst = row.firstUsedAt === null;
    row.usedCount += 1;
    row.lastUserAgentCategory = uaCategory;
    row.ipHash = ipHash;
    if (isFirst) row.firstUsedAt = now;

    if (!isFirst) return;

    const ceRow = store.campaignEmails.get(tokenRecord.campaignEmailId);
    if (ceRow && !ceRow.openedAt) {
      ceRow.openedAt = now;
      const camp = store.campaigns.get(tokenRecord.campaignId);
      if (camp) camp.openedEmails = (camp.openedEmails || 0) + 1;
    }
  },

  async recordClickResolution(tokenRecord, { uaCategory, ipHash }) {
    const now = new Date();
    const row = store.trackingTokens.get(tokenRecord.id);
    if (!row) return;
    const isFirst = row.firstUsedAt === null;
    const machine = isMachineCategory(uaCategory);
    row.usedCount += 1;
    row.lastUserAgentCategory = uaCategory;
    row.ipHash = ipHash;
    if (isFirst) row.firstUsedAt = now;

    if (machine) return;

    const ceRow = store.campaignEmails.get(tokenRecord.campaignEmailId);
    if (ceRow && !ceRow.clickedAt) {
      ceRow.clickedAt = now;
      const camp = store.campaigns.get(tokenRecord.campaignId);
      if (camp) camp.clickedEmails = (camp.clickedEmails || 0) + 1;
    }
  },

  async getCampaignTrackingBreakdown(campaignId) {
    let machineOpenCount = 0;
    let machineClickCount = 0;
    for (const row of store.trackingTokens.values()) {
      if (row.campaignId !== campaignId) continue;
      if (!row.firstUsedAt) continue;
      if (isMachineCategory(row.lastUserAgentCategory)) {
        if (row.tokenType === "open")  machineOpenCount++;
        if (row.tokenType === "click") machineClickCount++;
      }
    }
    return { machineOpenCount, machineClickCount };
  },

  async expireContactTrackingTokens(contactId) {
    const now = new Date();
    const ceIds = new Set();
    for (const ce of store.campaignEmails.values()) {
      if (ce.contactId === contactId) ceIds.add(ce.id);
    }
    for (const row of store.trackingTokens.values()) {
      if (ceIds.has(row.campaignEmailId)) row.expiresAt = now;
    }
  },

  async deleteExpiredTrackingTokens() {
    const now = new Date();
    let totalDeleted = 0;
    for (const [id, row] of store.trackingTokens.entries()) {
      if (row.expiresAt < now) {
        store.trackingTokens.delete(id);
        totalDeleted++;
      }
    }
    return totalDeleted;
  },
};

console.log("[DEV MODE] In-memory storage initialized - all data will reset on server restart");
