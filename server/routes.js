import { storage } from "./storage.js";

const sessions = new Map();

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "") || 
                req.cookies?.token ||
                req.headers.cookie?.split("; ").find(c => c.startsWith("token="))?.split("=")[1];
  
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  req.user = sessions.get(token);
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
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = generateToken();
      const { password: _, ...userWithoutPassword } = user;
      sessions.set(token, userWithoutPassword);

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      await storage.createAuditLog({
        userId: user.id,
        userName: user.username,
        action: "USER_LOGIN",
        details: `User ${user.username} logged in`
      });

      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", authMiddleware, async (req, res) => {
    try {
      await storage.createAuditLog({
        userId: req.user.id,
        userName: req.user.username,
        action: "USER_LOGOUT",
        details: `User ${req.user.username} logged out`
      });

      sessions.delete(req.token);
      res.clearCookie("token");
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        sessions.delete(req.token);
        return res.status(401).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
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
      const users = await storage.getUsers(req.user.id, isRootAdmin);
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
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

      const newUser = await storage.createUser({
        username,
        email,
        password,
        role: role || "USER",
        parentId: req.user.id,
        creditsReceived: 0,
        creditsAllocated: 0,
        creditsUsed: 0
      });

      if (credits && credits > 0) {
        await storage.allocateCredits(req.user.id, newUser.id, credits);
      }

      await storage.createAuditLog({
        userId: req.user.id,
        userName: req.user.username,
        action: "USER_CREATED",
        details: `Created user: ${username}`,
        targetUserName: username
      });

      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
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

      const { fromUser, toUser } = await storage.allocateCredits(req.user.id, id, credits);

      await storage.createAuditLog({
        userId: req.user.id,
        userName: req.user.username,
        action: "CREDITS_ALLOCATED",
        details: `Allocated ${credits} credits to ${toUser.username}`,
        targetUserName: toUser.username
      });

      const { password: _, ...userWithoutPassword } = toUser;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role === "ROOT_ADMIN") {
        return res.status(403).json({ message: "Cannot delete root admin" });
      }

      await storage.deleteUser(id);

      await storage.createAuditLog({
        userId: req.user.id,
        userName: req.user.username,
        action: "USER_DELETED",
        details: `Deleted user: ${user.username}`,
        targetUserName: user.username
      });

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/campaigns", authMiddleware, async (req, res) => {
    try {
      const isRootAdmin = req.user.role === "ROOT_ADMIN";
      const campaigns = await storage.getCampaigns(req.user.id, isRootAdmin);
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/campaigns", authMiddleware, async (req, res) => {
    try {
      const { name, template, contacts, totalEmails } = req.body;
      
      const user = await storage.getUser(req.user.id);
      const available = user.creditsReceived - user.creditsAllocated - user.creditsUsed;
      
      if (available < totalEmails) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      await storage.useCredits(req.user.id, totalEmails);

      const campaign = await storage.createCampaign({
        name,
        templateSubject: template.subject,
        templateBody: template.body,
        userId: req.user.id,
        userName: req.user.username,
        totalEmails,
        creditsUsed: totalEmails
      });

      await storage.createAuditLog({
        userId: req.user.id,
        userName: req.user.username,
        action: "CAMPAIGN_CREATED",
        details: `Created campaign: ${name}`,
        campaignName: name
      });

      res.status(201).json(campaign);
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
      const templates = await storage.getTemplates(req.user.id);
      res.json(templates);
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
      const deleted = await storage.deleteTemplate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/audit-logs", authMiddleware, rootAdminMiddleware, async (req, res) => {
    try {
      const logs = await storage.getAuditLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ai/preview", authMiddleware, async (req, res) => {
    try {
      const { subject, body, contacts, tone } = req.body;
      
      const previews = contacts.map(contact => {
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

  return httpServer;
}
