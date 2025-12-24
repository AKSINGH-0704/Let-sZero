import { randomUUID } from "crypto";

class MemStorage {
  constructor() {
    this.users = new Map();
    this.campaigns = new Map();
    this.templates = new Map();
    this.auditLogs = new Map();
    
    this.initDefaultData();
  }

  initDefaultData() {
    const rootAdminId = randomUUID();
    const subAdminId = randomUUID();
    const userId = randomUUID();
    
    this.users.set(rootAdminId, {
      id: rootAdminId,
      username: "admin",
      email: "admin@emailflow.pro",
      password: "admin123",
      role: "ROOT_ADMIN",
      parentId: null,
      creditsReceived: 100000,
      creditsAllocated: 25000,
      creditsUsed: 5000,
      createdAt: new Date().toISOString()
    });
    
    this.users.set(subAdminId, {
      id: subAdminId,
      username: "manager",
      email: "manager@emailflow.pro",
      password: "manager123",
      role: "SUB_ADMIN",
      parentId: rootAdminId,
      creditsReceived: 15000,
      creditsAllocated: 5000,
      creditsUsed: 2000,
      createdAt: new Date().toISOString()
    });
    
    this.users.set(userId, {
      id: userId,
      username: "user",
      email: "user@emailflow.pro",
      password: "user123",
      role: "USER",
      parentId: subAdminId,
      creditsReceived: 3000,
      creditsAllocated: 0,
      creditsUsed: 500,
      createdAt: new Date().toISOString()
    });

    const templateId = randomUUID();
    this.templates.set(templateId, {
      id: templateId,
      name: "Welcome Email",
      subject: "Welcome to our platform, {{name}}!",
      body: "Hi {{name}},\n\nWelcome to our platform! We're excited to have you from {{company}}.\n\nBest regards,\nThe Team",
      userId: rootAdminId,
      createdAt: new Date().toISOString()
    });

    const campaignId = randomUUID();
    this.campaigns.set(campaignId, {
      id: campaignId,
      name: "Q4 Newsletter",
      templateId: templateId,
      userId: rootAdminId,
      userName: "admin",
      status: "COMPLETED",
      totalEmails: 1500,
      sentEmails: 1485,
      failedEmails: 15,
      creditsUsed: 1500,
      createdAt: new Date(Date.now() - 86400000).toISOString()
    });

    const campaignId2 = randomUUID();
    this.campaigns.set(campaignId2, {
      id: campaignId2,
      name: "Product Launch",
      templateId: templateId,
      userId: rootAdminId,
      userName: "admin",
      status: "COMPLETED",
      totalEmails: 2500,
      sentEmails: 2480,
      failedEmails: 20,
      creditsUsed: 2500,
      createdAt: new Date(Date.now() - 172800000).toISOString()
    });

    this.auditLogs.set(randomUUID(), {
      id: randomUUID(),
      userId: rootAdminId,
      userName: "admin",
      action: "USER_CREATED",
      details: "Created user: manager",
      targetUserName: "manager",
      createdAt: new Date(Date.now() - 604800000).toISOString()
    });

    this.auditLogs.set(randomUUID(), {
      id: randomUUID(),
      userId: rootAdminId,
      userName: "admin",
      action: "CREDITS_ALLOCATED",
      details: "Allocated 15000 credits to manager",
      targetUserName: "manager",
      createdAt: new Date(Date.now() - 518400000).toISOString()
    });

    this.auditLogs.set(randomUUID(), {
      id: randomUUID(),
      userId: rootAdminId,
      userName: "admin",
      action: "CAMPAIGN_COMPLETED",
      details: "Campaign Q4 Newsletter completed",
      campaignName: "Q4 Newsletter",
      createdAt: new Date(Date.now() - 86400000).toISOString()
    });
  }

  async getUser(id) {
    return this.users.get(id);
  }

  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(userData) {
    const id = randomUUID();
    const user = {
      ...userData,
      id,
      creditsReceived: userData.creditsReceived || 0,
      creditsAllocated: userData.creditsAllocated || 0,
      creditsUsed: userData.creditsUsed || 0,
      createdAt: new Date().toISOString()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id, updates) {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id) {
    return this.users.delete(id);
  }

  async getUsers(parentId = null, includeAll = false) {
    const users = Array.from(this.users.values());
    if (includeAll) return users;
    if (parentId) {
      return users.filter(u => u.parentId === parentId || u.id === parentId);
    }
    return users;
  }

  async allocateCredits(fromUserId, toUserId, credits) {
    const fromUser = this.users.get(fromUserId);
    const toUser = this.users.get(toUserId);
    
    if (!fromUser || !toUser) {
      throw new Error("User not found");
    }

    const fromAvailable = fromUser.creditsReceived - fromUser.creditsAllocated - fromUser.creditsUsed;
    if (fromAvailable < credits) {
      throw new Error("Insufficient credits");
    }

    fromUser.creditsAllocated += credits;
    toUser.creditsReceived += credits;

    this.users.set(fromUserId, fromUser);
    this.users.set(toUserId, toUser);

    return { fromUser, toUser };
  }

  async useCredits(userId, credits) {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const available = user.creditsReceived - user.creditsAllocated - user.creditsUsed;
    if (available < credits) {
      throw new Error("Insufficient credits");
    }

    user.creditsUsed += credits;
    this.users.set(userId, user);
    return user;
  }

  async getCampaigns(userId = null, isRootAdmin = false) {
    const campaigns = Array.from(this.campaigns.values());
    if (isRootAdmin) {
      return campaigns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    if (userId) {
      return campaigns
        .filter(c => c.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return campaigns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getCampaign(id) {
    return this.campaigns.get(id);
  }

  async createCampaign(campaignData) {
    const id = randomUUID();
    const campaign = {
      ...campaignData,
      id,
      sentEmails: 0,
      failedEmails: 0,
      creditsUsed: 0,
      status: "RUNNING",
      createdAt: new Date().toISOString()
    };
    this.campaigns.set(id, campaign);
    return campaign;
  }

  async updateCampaign(id, updates) {
    const campaign = this.campaigns.get(id);
    if (!campaign) return null;
    const updated = { ...campaign, ...updates };
    this.campaigns.set(id, updated);
    return updated;
  }

  async getTemplates(userId = null) {
    const templates = Array.from(this.templates.values());
    if (userId) {
      return templates
        .filter(t => t.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return templates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getTemplate(id) {
    return this.templates.get(id);
  }

  async createTemplate(templateData) {
    const id = randomUUID();
    const template = {
      ...templateData,
      id,
      createdAt: new Date().toISOString()
    };
    this.templates.set(id, template);
    return template;
  }

  async updateTemplate(id, updates) {
    const template = this.templates.get(id);
    if (!template) return null;
    const updated = { ...template, ...updates };
    this.templates.set(id, updated);
    return updated;
  }

  async deleteTemplate(id) {
    return this.templates.delete(id);
  }

  async getAuditLogs() {
    return Array.from(this.auditLogs.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async createAuditLog(logData) {
    const id = randomUUID();
    const log = {
      ...logData,
      id,
      createdAt: new Date().toISOString()
    };
    this.auditLogs.set(id, log);
    return log;
  }

  async getDashboardStats(userId, isRootAdmin) {
    const campaigns = await this.getCampaigns(userId, isRootAdmin);
    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === "RUNNING" || c.status === "PAUSED").length,
      completedCampaigns: campaigns.filter(c => c.status === "COMPLETED").length,
      totalEmailsSent: campaigns.reduce((sum, c) => sum + c.sentEmails, 0)
    };
  }
}

export const storage = new MemStorage();
