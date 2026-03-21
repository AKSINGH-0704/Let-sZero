import express from "express";
import { registerRoutes, executeCampaign } from "./routes.js";
import { storage } from "./storage.js";
import { createServer } from "http";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env file manually (no dotenv dependency needed)
try {
  const envPath = resolve(process.cwd(), ".env");
  const envContent = readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (key && !(key in process.env)) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {
  // No .env file found — using system environment variables (e.g., Railway)
}

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration - Allow credentials and frontend origin
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:8083",
    "http://127.0.0.1:8083"
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  }
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  
  next();
});

export function log(message, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Block RepMail routes on production when REPMAIL_PUBLIC is not "true"
  app.use((req, res, next) => {
    const isRepmailPublic = process.env.REPMAIL_PUBLIC === "true";

    if (isRepmailPublic) return next();
    if (process.env.NODE_ENV !== "production") return next();

    const allowedPaths = [
      '/',
      '/early-access',
      '/contact',
      '/api/waitlist',
      '/api/contact',
    ];

    const isAllowed = allowedPaths.some(path => req.path === path);
    const isStaticFile = /\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf|eot|map)$/i.test(req.path);
    const isAsset = req.path.startsWith('/assets');

    if (isAllowed || isStaticFile || isAsset) return next();

    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ message: "RepMail is currently in private beta. Join the waitlist at /early-access" });
    }

    return res.redirect('/early-access');
  });

  await registerRoutes(httpServer, app);

  // Campaign scheduler — executes PENDING campaigns when their scheduledAt time arrives
  setInterval(async () => {
    try {
      const pendingCampaigns = await storage.getCampaignsByStatus("PENDING");
      const now = new Date();
      for (const campaign of pendingCampaigns) {
        if (campaign.scheduledAt && new Date(campaign.scheduledAt) <= now) {
          console.log(`[SCHEDULER] Executing scheduled campaign: ${campaign.id}`);
          await executeCampaign(campaign.id, campaign.userId);
        }
      }
    } catch (err) {
      console.error("[SCHEDULER] Error:", err.message);
    }
  }, 30000);

  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (process.env.NODE_ENV === "production") {
    const { serveStatic } = await import("./static.js");
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite.js");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
