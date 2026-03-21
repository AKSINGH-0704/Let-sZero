import { storage } from "./storage.js";
import { AUDIT_ACTIONS, PRICING_PLANS, CREDIT_TIERS, TEAM_PRICING, FREE_TRIAL_CREDITS, CREDIT_VALIDITY_MONTHS, MIN_CREDIT_PURCHASE, contactSubmissionSchema, waitlistSchema, PAYMENT_STATUS, getPlanWithPrices, DEFAULT_EXCHANGE_RATE, SUPPORTED_CURRENCIES, PLAN_LIMITS } from "../shared/schema.js";
import * as XLSX from "xlsx";
import { generatePreviews, analyzeSpam, generateTemplate } from "./ai.js";

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
  
  req.user = user;
  req.token = token;
  next();
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== "ROOT_ADMIN" && req.user.role !== "SUB_ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

function rootAdminMiddleware(req, res, next) {
  if (req.user.role !== "ROOT_ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

// Reusable campaign execution — used by both immediate send and scheduler
export async function executeCampaign(campaignId, userId) {
  const campaign = await storage.getCampaign(campaignId);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

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

  await storage.updateCampaign(campaignId, { status: "RUNNING", startedAt: new Date() });

  for (let i = 0; i < campaign.totalEmails; i++) {
    await storage.deductCreditAtomic(userId, campaignId, `Email ${i + 1} of campaign ${campaign.name}`);
  }

  await storage.updateCampaign(campaignId, {
    sentEmails: campaign.totalEmails,
    creditsUsed: campaign.totalEmails,
    status: "COMPLETED",
    completedAt: new Date()
  });

  await storage.createAuditLog({
    userId,
    action: AUDIT_ACTIONS.CAMPAIGN_COMPLETED,
    targetType: "campaign",
    targetId: campaignId,
    details: { name: campaign.name, sentEmails: campaign.totalEmails }
  });

  return await storage.getCampaign(campaignId);
}

export async function registerRoutes(httpServer, app) {
  await storage.initializeRootAdmin();

  app.post("/api/auth/login", async (req, res) => {
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
      res.json(req.user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/reset-password", authMiddleware, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
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
      const isRootAdmin = req.user.role === "ROOT_ADMIN";
      const stats = await storage.getDashboardStats(req.user.id, isRootAdmin);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const isRootAdmin = req.user.role === "ROOT_ADMIN";
      const usersList = await storage.getUsers(req.user.id, isRootAdmin);
      res.json(usersList);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { username, email, password, role, credits } = req.body;

      // Plan limit check — team members
      const childUsers = await storage.getChildUsers(req.user.id);
      const activeChildren = childUsers.filter(u => u.isActive);
      const userLimits = PLAN_LIMITS[req.user.plan || "free"];
      if (activeChildren.length >= userLimits.maxTeamMembers) {
        return res.status(403).json({
          error: "PLAN_LIMIT",
          message: `Your ${userLimits.label} plan allows up to ${userLimits.maxTeamMembers} team members. Upgrade your plan to add more.`,
          currentPlan: req.user.plan || "free",
          limit: userLimits.maxTeamMembers,
          current: activeChildren.length,
        });
      }

      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }

      if (req.user.role === "SUB_ADMIN" && role !== "USER") {
        return res.status(403).json({ message: "Sub-admins can only create users" });
      }
      
      if (req.user.role === "ROOT_ADMIN" && role === "USER") {
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

      res.status(201).json(newUser);
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
      const user = await storage.getUserById(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role === "ROOT_ADMIN") {
        return res.status(403).json({ message: "Cannot delete root admin" });
      }

      await storage.deleteUser(id);

      await storage.createAuditLog({
        userId: req.user.id,
        action: AUDIT_ACTIONS.USER_DELETED,
        targetType: "user",
        targetId: id,
        details: { username: user.username }
      });

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
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

  app.get("/api/campaigns", authMiddleware, async (req, res) => {
    try {
      const isRootAdmin = req.user.role === "ROOT_ADMIN";
      const campaignsList = await storage.getCampaigns(req.user.id, isRootAdmin);
      res.json(campaignsList);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/campaigns", authMiddleware, async (req, res) => {
    try {
      const { name, template, contacts, totalEmails, scheduledAt } = req.body;

      // Plan limit check — count active campaigns
      const userCampaigns = await storage.getCampaigns(req.user.id, false);
      const activeCampaigns = userCampaigns.filter(c => ["RUNNING", "PENDING", "DRAFT"].includes(c.status));
      const campaignLimits = PLAN_LIMITS[req.user.plan || "free"];
      if (activeCampaigns.length >= campaignLimits.maxActiveCampaigns) {
        return res.status(403).json({
          error: "PLAN_LIMIT",
          message: `Your ${campaignLimits.label} plan allows up to ${campaignLimits.maxActiveCampaigns} active campaigns. Wait for current campaigns to complete or upgrade your plan.`,
          currentPlan: req.user.plan || "free",
          limit: campaignLimits.maxActiveCampaigns,
          current: activeCampaigns.length,
        });
      }

      // Scheduling check
      if (scheduledAt && !campaignLimits.canSchedule) {
        return res.status(403).json({
          error: "PLAN_LIMIT",
          message: "Campaign scheduling is available on Starter plan and above.",
          currentPlan: req.user.plan || "free",
        });
      }

      if (scheduledAt) {
        const scheduledTime = new Date(scheduledAt);
        if (isNaN(scheduledTime.getTime()) || scheduledTime <= new Date()) {
          return res.status(400).json({ message: "Scheduled time must be a valid future date." });
        }
        const campaign = await storage.createCampaign({
          name,
          userId: req.user.id,
          totalEmails,
          templateSnapshot: template,
          contactIds: contacts?.map(c => c.id) || [],
          status: "PENDING",
          scheduledAt: scheduledTime,
        });
        return res.status(201).json({ ...campaign, message: `Campaign scheduled for ${scheduledTime.toISOString()}` });
      }

      // Immediate execution — check credits first
      const canStart = await storage.canStartCampaign(req.user.id, totalEmails);
      if (!canStart.allowed) {
        await storage.createAuditLog({
          userId: req.user.id,
          action: AUDIT_ACTIONS.CAMPAIGN_BLOCKED_INSUFFICIENT_CREDITS,
          details: canStart
        });
        return res.status(400).json({ message: canStart.reason });
      }

      const campaign = await storage.createCampaign({
        name,
        userId: req.user.id,
        totalEmails,
        templateSnapshot: template,
        contactIds: contacts?.map(c => c.id) || [],
        status: "DRAFT"
      });

      const completedCampaign = await executeCampaign(campaign.id, req.user.id);
      res.status(201).json(completedCampaign);
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
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/campaigns/:id", authMiddleware, async (req, res) => {
    try {
      const campaign = await storage.updateCampaign(req.params.id, req.body);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
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
      const templateLimits = PLAN_LIMITS[req.user.plan || "free"];
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
      const template = await storage.updateTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
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
      const exportLimits = PLAN_LIMITS[req.user.plan || "free"];
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

  app.post("/api/ai/preview", authMiddleware, async (req, res) => {
    try {
      const { subject, body, contacts, tone } = req.body;

      await storage.createAuditLog({
        userId: req.user.id,
        action: AUDIT_ACTIONS.AI_PREVIEW_GENERATED,
        details: { contactCount: contacts?.length || 0, tone: tone || "professional" }
      });

      // Try OpenAI GPT-4o first
      try {
        const previews = await generatePreviews(subject, body, contacts || [], tone || "professional");
        return res.json({ previews, aiPowered: true });
      } catch (aiErr) {
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

  app.post("/api/ai/spam-analysis", authMiddleware, async (req, res) => {
    try {
      const { subject, body } = req.body;

      await storage.createAuditLog({
        userId: req.user.id,
        action: AUDIT_ACTIONS.SPAM_ANALYSIS_RUN,
        details: { subjectLength: subject?.length, bodyLength: body?.length }
      });

      // Try OpenAI GPT-4o first
      try {
        const result = await analyzeSpam(subject, body);
        return res.json({ ...result, aiPowered: true });
      } catch (aiErr) {
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

  app.post("/api/ai/generate-template", authMiddleware, async (req, res) => {
    try {
      const { prompt, tone } = req.body;
      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ message: "Prompt is required" });
      }
      const template = await generateTemplate(prompt.trim(), tone || "professional");
      res.json(template);
    } catch (error) {
      console.error("[AI] generate-template error:", error.message);
      res.status(500).json({ message: "Template generation failed. Please write your template manually." });
    }
  });

  app.get("/api/pricing/plans", async (req, res) => {
    try {
      const exchangeRate = DEFAULT_EXCHANGE_RATE;
      const plans = Object.values(PRICING_PLANS).map(plan => getPlanWithPrices(plan, exchangeRate));
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

      // Handle Trial plan - grant credits immediately
      if (plan.isTrial) {
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

        // Add credits to user immediately
        await storage.addCredits(req.user.id, plan.credits, AUDIT_ACTIONS.PAYMENT_COMPLETED, {
          paymentId: payment.id,
          planName: plan.name
        });

        res.json({ 
          payment,
          redirectUrl: `/app/payments/process/${payment.id}`,
          currency: "INR"
        });
        return;
      }
      
      if (!SUPPORTED_CURRENCIES[currency]) {
        return res.status(400).json({ message: "Unsupported currency" });
      }
      
      const exchangeRate = DEFAULT_EXCHANGE_RATE;
      const planWithPrices = getPlanWithPrices(plan, exchangeRate);
      
      const amountUsd = planWithPrices.priceUsd;
      const amountInr = planWithPrices.priceInr;
      const amountLocal = currency === "INR" ? amountInr : amountUsd;
      
      const payment = await storage.createPayment({
        userId: req.user.id,
        planName: plan.name,
        credits: plan.credits,
        amountUsd,
        amountInr,
        amountLocal,
        currency,
        exchangeRate: exchangeRate.toString(),
        paymentMethod: paymentMethod || (currency === "INR" ? "UPI" : "CARD"),
        status: PAYMENT_STATUS.PENDING
      });
      
      res.json({ 
        payment,
        redirectUrl: `/app/payments/process/${payment.id}`,
        currency,
        exchangeRate
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payments/:id/complete", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      const payment = await storage.completePayment(id, transactionId);
      let user = await storage.getUserById(req.user.id);

      // Plan upgrade — only upgrade, never downgrade
      const planMapping = {
        "free trial": "free", "starter": "starter",
        "growth": "growth", "scale": "scale", "enterprise": "enterprise"
      };
      const newPlan = planMapping[(payment.planName || "").toLowerCase()] || "free";
      const planRank = { free: 0, starter: 1, growth: 2, scale: 3, enterprise: 4 };
      const currentPlan = user.plan || "free";
      if ((planRank[newPlan] ?? 0) > (planRank[currentPlan] ?? 0)) {
        await storage.updateUser(user.id, { plan: newPlan });
        user = await storage.getUserById(user.id);
        // Cascade plan to children and grandchildren
        const children = await storage.getChildUsers(user.id);
        for (const child of children) {
          await storage.updateUser(child.id, { plan: newPlan });
          const grandchildren = await storage.getChildUsers(child.id);
          for (const gc of grandchildren) {
            await storage.updateUser(gc.id, { plan: newPlan });
          }
        }
      }

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

  app.post("/api/parse-excel", authMiddleware, async (req, res) => {
    try {
      const { fileData, fileName } = req.body;
      
      if (!fileData) {
        return res.status(400).json({ message: "No file data provided" });
      }
      
      const buffer = Buffer.from(fileData, "base64");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      if (jsonData.length === 0) {
        return res.status(400).json({ message: "File is empty" });
      }
      
      const headers = jsonData[0].map(h => String(h || "").trim());
      const rows = jsonData.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = row[i] !== undefined ? String(row[i]) : "";
        });
        return obj;
      }).filter(row => Object.values(row).some(v => v));
      
      res.json({ headers, rows, fileName });
    } catch (error) {
      console.error("Excel parse error:", error);
      res.status(400).json({ message: "Failed to parse Excel file. Please check the format." });
    }
  });

  return httpServer;
}
