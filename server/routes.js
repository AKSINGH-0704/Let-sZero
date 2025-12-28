import { storage } from "./storage.js";
import { AUDIT_ACTIONS, PRICING_PLANS, contactSubmissionSchema, PAYMENT_STATUS, getPlanWithPrices, DEFAULT_EXCHANGE_RATE, SUPPORTED_CURRENCIES } from "../shared/schema.js";
import * as XLSX from "xlsx";

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
      
      const user = await storage.getUserByUsername(req.user.username);
      const isValid = await storage.validatePassword(user, currentPassword);
      
      if (!isValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
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
        mustResetPassword: true
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
      const { name, template, contacts, totalEmails } = req.body;
      
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
        status: "RUNNING"
      });

      for (let i = 0; i < totalEmails; i++) {
        await storage.deductCreditAtomic(req.user.id, campaign.id, `Email ${i + 1} of campaign ${name}`);
      }

      await storage.updateCampaign(campaign.id, {
        sentEmails: totalEmails,
        creditsUsed: totalEmails,
        status: "COMPLETED",
        completedAt: new Date()
      });

      await storage.createAuditLog({
        userId: req.user.id,
        action: AUDIT_ACTIONS.CAMPAIGN_COMPLETED,
        targetType: "campaign",
        targetId: campaign.id,
        details: { name, sentEmails: totalEmails }
      });

      const updatedCampaign = await storage.getCampaign(campaign.id);
      res.status(201).json(updatedCampaign);
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

  app.post("/api/ai/preview", authMiddleware, async (req, res) => {
    try {
      const { subject, body, contacts } = req.body;
      
      await storage.createAuditLog({
        userId: req.user.id,
        action: AUDIT_ACTIONS.AI_PREVIEW_GENERATED,
        details: { contactCount: contacts?.length || 0 }
      });
      
      const previews = (contacts || []).map(contact => {
        const data = {
          name: contact.name || "Valued Customer",
          email: contact.email || "customer@example.com",
          company: contact.company || "Your Company",
          category: contact.category || "General"
        };
        
        const replacePlaceholders = (text) => {
          return text.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
        };
        
        return {
          contact: data,
          subject: replacePlaceholders(subject),
          body: replacePlaceholders(body)
        };
      });
      
      res.json({ previews });
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
      
      const spamWords = [
        "free", "winner", "click here", "buy now", "limited time",
        "act now", "urgent", "congratulations", "guarantee", "no obligation",
        "risk free", "special offer", "exclusive deal", "you won", "cash"
      ];
      
      const text = (subject + " " + body).toLowerCase();
      let score = 0;
      const riskyWords = [];
      
      spamWords.forEach(word => {
        if (text.includes(word)) {
          score += 5;
          riskyWords.push(word);
        }
      });
      
      if (subject === subject.toUpperCase() && subject.length > 5) {
        score += 15;
      }
      
      const exclamationCount = (text.match(/!/g) || []).length;
      score += exclamationCount * 2;
      
      const alternatives = {
        "free": "complimentary",
        "winner": "selected participant",
        "click here": "learn more",
        "buy now": "explore options",
        "limited time": "time-sensitive",
        "act now": "consider this opportunity",
        "urgent": "important",
        "congratulations": "we're pleased to inform you",
        "guarantee": "assurance",
        "no obligation": "no commitment required"
      };
      
      const suggestions = riskyWords.map(word => ({
        original: word,
        suggestion: alternatives[word] || word
      }));
      
      res.json({
        score: Math.min(score, 100),
        riskyWords,
        suggestions
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
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
        lastUpdated: new Date().toISOString()
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
      const user = await storage.getUserById(req.user.id);
      
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
