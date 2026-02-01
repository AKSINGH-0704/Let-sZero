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
import { 
  USER_ROLES, AUDIT_ACTIONS, CAMPAIGN_STATUS, PAYMENT_STATUS 
} from "../shared/schema.js";

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

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
  creditTransactions: new Map(),
  auditLogs: new Map(),
  payments: new Map(),
  contactSubmissions: new Map()
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
    const passwordHash = hashPassword(userData.password);
    
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
      isTrialUser: userData.isTrialUser !== false,
      mustResetPassword: userData.mustResetPassword !== false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null
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

  async validatePassword(user, password) {
    const hash = hashPassword(password);
    return user.passwordHash === hash;
  },

  async updatePassword(userId, newPassword) {
    const user = store.users.get(userId);
    if (!user) throw new Error("User not found");
    
    user.passwordHash = hashPassword(newPassword);
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
    user.updatedAt = new Date();
    
    return this.sanitizeUser(user);
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

  sanitizeUser(user) {
    if (!user) return null;
    const { passwordHash, ...sanitized } = user;
    sanitized.creditsRemaining = (sanitized.creditsReceived || 0) - 
                                  (sanitized.creditsAllocated || 0) - 
                                  (sanitized.creditsUsed || 0);
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
    for (const [id, session] of store.sessions.entries()) {
      if (session.userId === userId) {
        store.sessions.delete(id);
      }
    }
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
    
    const remaining = (user.creditsReceived || 0) - (user.creditsAllocated || 0) - (user.creditsUsed || 0);
    if (remaining < 1) {
      throw new Error("Insufficient credits");
    }
    
    const balanceBefore = user.creditsUsed;
    user.creditsUsed += 1;
    user.updatedAt = new Date();
    
    const txId = generateUUID();
    store.creditTransactions.set(txId, {
      id: txId,
      userId,
      type: "usage",
      amount: -1,
      balanceBefore,
      balanceAfter: balanceBefore + 1,
      campaignId,
      description,
      createdAt: new Date()
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
    const id = generateUUID();
    const contact = {
      id,
      userId: contactData.userId,
      email: contactData.email,
      name: contactData.name || null,
      company: contactData.company || null,
      category: contactData.category || null,
      customFields: contactData.customFields || null,
      createdAt: new Date()
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
      creditsUsed: 0,
      contactIds: campaignData.contactIds || [],
      templateSnapshot: campaignData.templateSnapshot || null,
      scheduledAt: campaignData.scheduledAt || null,
      startedAt: null,
      completedAt: null,
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

  async getCampaigns(userId = null, isRootAdmin = false) {
    let result = toSortedArray(store.campaigns);
    if (!isRootAdmin && userId) {
      result = result.filter(c => c.userId === userId);
    }
    return result;
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

  async startCampaign(campaignId, userId) {
    const campaign = store.campaigns.get(campaignId);
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
    
    campaign.status = CAMPAIGN_STATUS.RUNNING;
    campaign.startedAt = new Date();
    campaign.updatedAt = new Date();
    
    await this.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CAMPAIGN_STARTED,
      targetType: "campaign",
      targetId: campaignId
    });
    
    return campaign;
  },

  async completeCampaign(campaignId, userId) {
    const campaign = store.campaigns.get(campaignId);
    if (!campaign) throw new Error("Campaign not found");
    
    campaign.status = CAMPAIGN_STATUS.COMPLETED;
    campaign.completedAt = new Date();
    campaign.updatedAt = new Date();
    
    await this.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.CAMPAIGN_COMPLETED,
      targetType: "campaign",
      targetId: campaignId,
      details: { sentEmails: campaign.sentEmails, failedEmails: campaign.failedEmails }
    });
    
    return campaign;
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
  async getDashboardStats(userId, isRootAdmin) {
    const campaignsList = await this.getCampaigns(userId, isRootAdmin);
    return {
      totalCampaigns: campaignsList.length,
      activeCampaigns: campaignsList.filter(c => c.status === "RUNNING" || c.status === "PAUSED").length,
      completedCampaigns: campaignsList.filter(c => c.status === "COMPLETED").length,
      totalEmailsSent: campaignsList.reduce((sum, c) => sum + (c.sentEmails || 0), 0)
    };
  },

  // ==================== ADMIN INITIALIZATION ====================
  async initializeRootAdmin() {
    try {
      const existingAdmin = await this.getUserByUsername("admin");
      if (existingAdmin) {
        console.log("[DEV MODE] Root admin already exists");
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
    
    // Update payment status
    payment.status = PAYMENT_STATUS.SUCCESS;
    payment.transactionId = transactionId;
    payment.completedAt = new Date();
    
    // Credit user account
    const user = store.users.get(payment.userId);
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
      balanceBefore: 0,
      balanceAfter: payment.credits,
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
    
    return payment;
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

console.log("[DEV MODE] In-memory storage initialized - all data will reset on server restart");
