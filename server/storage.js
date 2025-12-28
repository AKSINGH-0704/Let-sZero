import { db } from "./db.js";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { 
  users, sessions, templates, contacts, campaigns, 
  campaignEmails, creditTransactions, auditLogs, payments, contactSubmissions,
  USER_ROLES, AUDIT_ACTIONS, CAMPAIGN_STATUS, PAYMENT_STATUS, PRICING_PLANS
} from "../shared/schema.js";
import crypto from "crypto";

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export const storage = {
  async createUser(userData) {
    const passwordHash = hashPassword(userData.password);
    const [user] = await db.insert(users).values({
      username: userData.username,
      email: userData.email,
      passwordHash,
      role: userData.role || USER_ROLES.USER,
      parentId: userData.parentId || null,
      creditsReceived: userData.creditsReceived || 0,
      creditsAllocated: 0,
      creditsUsed: 0,
      mustResetPassword: userData.mustResetPassword !== false,
      isActive: true
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

  async validatePassword(user, password) {
    const hash = hashPassword(password);
    return user.passwordHash === hash;
  },

  async updatePassword(userId, newPassword) {
    const passwordHash = hashPassword(newPassword);
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

  sanitizeUser(user) {
    if (!user) return null;
    const { passwordHash, ...sanitized } = user;
    sanitized.creditsRemaining = (sanitized.creditsReceived || 0) - 
                                  (sanitized.creditsAllocated || 0) - 
                                  (sanitized.creditsUsed || 0);
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
    await db.delete(sessions).where(eq(sessions.userId, userId));
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
    
    if (fromUser.creditsRemaining < amount) {
      throw new Error("Insufficient credits available");
    }
    
    const fromBalanceBefore = fromUser.creditsAllocated;
    const toBalanceBefore = toUser.creditsReceived;
    
    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({ 
          creditsAllocated: sql`credits_allocated + ${amount}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, fromUserId));
      
      await tx.update(users)
        .set({ 
          creditsReceived: sql`credits_received + ${amount}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, toUserId));
      
      await tx.insert(creditTransactions).values({
        userId: fromUserId,
        type: "allocation_out",
        amount: -amount,
        balanceBefore: fromBalanceBefore,
        balanceAfter: fromBalanceBefore + amount,
        fromUserId,
        toUserId,
        description: `Allocated ${amount} credits to ${toUser.username}`
      });
      
      await tx.insert(creditTransactions).values({
        userId: toUserId,
        type: "allocation_in",
        amount: amount,
        balanceBefore: toBalanceBefore,
        balanceAfter: toBalanceBefore + amount,
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
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");
    
    if (user.creditsRemaining < 1) {
      throw new Error("Insufficient credits");
    }
    
    const balanceBefore = user.creditsUsed;
    
    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({ 
          creditsUsed: sql`credits_used + 1`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      await tx.insert(creditTransactions).values({
        userId,
        type: "usage",
        amount: -1,
        balanceBefore,
        balanceAfter: balanceBefore + 1,
        campaignId,
        description
      });
    });
    
    await this.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CREDITS_USED,
      targetType: "campaign",
      targetId: campaignId,
      details: { creditsUsed: 1 }
    });
    
    return true;
  },

  async canStartCampaign(userId, emailCount) {
    const user = await this.getUserById(userId);
    if (!user) return { allowed: false, reason: "User not found" };
    
    if (user.creditsRemaining < emailCount) {
      return { 
        allowed: false, 
        reason: `Insufficient credits. Need ${emailCount}, have ${user.creditsRemaining}`,
        creditsNeeded: emailCount,
        creditsAvailable: user.creditsRemaining
      };
    }
    
    return { allowed: true, creditsAvailable: user.creditsRemaining };
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
    const [contact] = await db.insert(contacts).values(contactData).returning();
    return contact;
  },

  async createContacts(contactsData) {
    if (contactsData.length === 0) return [];
    const result = await db.insert(contacts).values(contactsData).returning();
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
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
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
    let result;
    
    if (filters.userId) {
      result = await db.select({
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
      .where(eq(auditLogs.userId, filters.userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(filters.limit || 100);
    } else {
      result = await db.select({
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
      .orderBy(desc(auditLogs.createdAt))
      .limit(filters.limit || 100);
    }
    
    return result;
  },

  async getDashboardStats(userId, isRootAdmin) {
    const campaignsList = await this.getCampaigns(userId, isRootAdmin);
    return {
      totalCampaigns: campaignsList.length,
      activeCampaigns: campaignsList.filter(c => c.status === "RUNNING" || c.status === "PAUSED").length,
      completedCampaigns: campaignsList.filter(c => c.status === "COMPLETED").length,
      totalEmailsSent: campaignsList.reduce((sum, c) => sum + (c.sentEmails || 0), 0)
    };
  },

  async initializeRootAdmin() {
    try {
      const existingAdmin = await this.getUserByUsername("admin");
      if (existingAdmin) {
        console.log("Root admin already exists");
        return this.sanitizeUser(existingAdmin);
      }
      
      const adminPassword = process.env.ADMIN_PASSWORD || "changeme123";
      const adminEmail = process.env.ADMIN_EMAIL || "admin@emailflow.pro";
      
      const admin = await this.createUser({
        username: "admin",
        email: adminEmail,
        password: adminPassword,
        role: USER_ROLES.ROOT_ADMIN,
        creditsReceived: 100000,
        mustResetPassword: true,
        isTrialUser: false
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
      details: { planName: paymentData.planName, credits: paymentData.credits, amountInr: paymentData.amountInr }
    });
    
    return payment;
  },

  async completePayment(paymentId, transactionId) {
    const payment = await this.getPayment(paymentId);
    if (!payment) throw new Error("Payment not found");
    
    await db.transaction(async (tx) => {
      await tx.update(payments)
        .set({ 
          status: PAYMENT_STATUS.SUCCESS, 
          transactionId, 
          completedAt: new Date() 
        })
        .where(eq(payments.id, paymentId));
      
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
        balanceBefore: 0,
        balanceAfter: payment.credits,
        description: `Purchased ${payment.credits} credits - ${payment.planName}`
      });
    });
    
    await this.createAuditLog({
      userId: payment.userId,
      action: AUDIT_ACTIONS.PAYMENT_SUCCESS,
      targetType: "payment",
      targetId: paymentId,
      details: { credits: payment.credits, transactionId }
    });
    
    return await this.getPayment(paymentId);
  },

  async failPayment(paymentId, reason) {
    const payment = await this.getPayment(paymentId);
    if (!payment) throw new Error("Payment not found");
    
    await db.update(payments)
      .set({ status: PAYMENT_STATUS.FAILED })
      .where(eq(payments.id, paymentId));
    
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
    if (!user) return { paid: 0, trial: 0, total: 0 };
    
    const paidRemaining = Math.max(0, 
      (user.creditsReceived || 0) - (user.creditsAllocated || 0) - (user.creditsUsed || 0)
    );
    const trialRemaining = user.isTrialUser 
      ? Math.max(0, (user.trialCredits || 5) - (user.trialCreditsUsed || 0))
      : 0;
    
    return {
      paid: paidRemaining,
      trial: trialRemaining,
      total: paidRemaining + trialRemaining,
      isTrialUser: user.isTrialUser
    };
  }
};
