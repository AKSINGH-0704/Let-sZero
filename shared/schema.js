import { pgTable, text, integer, boolean, timestamp, jsonb, serial, uuid, index, uniqueIndex, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const USER_ROLES = {
  ROOT_ADMIN: "ROOT_ADMIN",
  SUB_ADMIN: "SUB_ADMIN",
  USER: "USER"
};

export const CAMPAIGN_STATUS = {
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED"
};

export const CAMPAIGN_EMAIL_STATUS = {
  PENDING: "PENDING",
  SENT: "SENT",
  FAILED: "FAILED",
  BOUNCED: "BOUNCED",
  COMPLAINED: "COMPLAINED",
  SUPPRESSED: "SUPPRESSED",
};

export const SUPPRESSION_SOURCE = {
  UNSUBSCRIBE: "unsubscribe",
  BOUNCE: "bounce",
  COMPLAINT: "complaint",
};

export const AUDIT_ACTIONS = {
  USER_LOGIN: "USER_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_DELETED: "USER_DELETED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  PASSWORD_RESET_FORCED: "PASSWORD_RESET_FORCED",
  CREDITS_ALLOCATED: "CREDITS_ALLOCATED",
  CREDITS_DEALLOCATED: "CREDITS_DEALLOCATED",
  CREDITS_USED: "CREDITS_USED",
  CREDITS_PURCHASED: "CREDITS_PURCHASED",
  CAMPAIGN_CREATED: "CAMPAIGN_CREATED",
  CAMPAIGN_STARTED: "CAMPAIGN_STARTED",
  CAMPAIGN_PAUSED: "CAMPAIGN_PAUSED",
  CAMPAIGN_COMPLETED: "CAMPAIGN_COMPLETED",
  CAMPAIGN_FAILED: "CAMPAIGN_FAILED",
  CAMPAIGN_BLOCKED_INSUFFICIENT_CREDITS: "CAMPAIGN_BLOCKED_INSUFFICIENT_CREDITS",
  EMAIL_SENT: "EMAIL_SENT",
  EMAIL_FAILED: "EMAIL_FAILED",
  TEMPLATE_CREATED: "TEMPLATE_CREATED",
  TEMPLATE_UPDATED: "TEMPLATE_UPDATED",
  TEMPLATE_DELETED: "TEMPLATE_DELETED",
  CONTACT_IMPORTED: "CONTACT_IMPORTED",
  AI_PREVIEW_GENERATED: "AI_PREVIEW_GENERATED",
  SPAM_ANALYSIS_RUN: "SPAM_ANALYSIS_RUN",
  PAYMENT_INITIATED: "PAYMENT_INITIATED",
  PAYMENT_SUCCESS: "PAYMENT_SUCCESS",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  CONTACT_FORM_SUBMITTED: "CONTACT_FORM_SUBMITTED",
  INVITE_SENT: "INVITE_SENT",
  CREDITS_RECLAIMED: "CREDITS_RECLAIMED",
  // Inactivity governance
  INACTIVITY_WARNING_SENT: "INACTIVITY_WARNING_SENT",
  INACTIVITY_TIMER_RESET: "INACTIVITY_TIMER_RESET",
  USER_DORMANT: "USER_DORMANT",
  USER_REACTIVATED: "USER_REACTIVATED",
  CREDITS_AUTO_RECLAIMED: "CREDITS_AUTO_RECLAIMED",
  // Secondary root access
  ROOT_ACCESS_GRANTED: "ROOT_ACCESS_GRANTED",
  ROOT_ACCESS_REVOKED: "ROOT_ACCESS_REVOKED",
  // Emergency recovery
  EMERGENCY_RECOVERY_TRIGGERED: "EMERGENCY_RECOVERY_TRIGGERED",
};

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED"
};

export const CONTACT_REASONS = {
  SALES: "SALES",
  SUPPORT: "SUPPORT",
  BILLING: "BILLING",
  PARTNERSHIP: "PARTNERSHIP",
  OTHER: "OTHER"
};

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default(USER_ROLES.USER),
  parentId: uuid("parent_id"),
  creditsReceived: integer("credits_received").notNull().default(0),
  creditsAllocated: integer("credits_allocated").notNull().default(0),
  creditsUsed: integer("credits_used").notNull().default(0),
  trialCredits: integer("trial_credits").notNull().default(5),
  trialCreditsUsed: integer("trial_credits_used").notNull().default(0),
  isTrialUser: boolean("is_trial_user").notNull().default(true),
  mustResetPassword: boolean("must_reset_password").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
  plan: text("plan").notNull().default("free"),
  aiGenerationsToday: integer("ai_generations_today").notNull().default(0),
  aiGenerationsResetAt: timestamp("ai_generations_reset_at"),

  // ── Inactivity governance ─────────────────────────────────────────────────
  // Updated only when a campaign reaches COMPLETED. Never updated for ROOT_ADMIN.
  lastActivityAt: timestamp("last_activity_at"),
  // Set when Stage 1 warning email is sent. Reset to NULL when user becomes active again.
  inactivityWarningSentAt: timestamp("inactivity_warning_sent_at"),
  // SHA-256 hash of raw keep token (raw goes in email URL, never stored).
  inactivityKeepToken: text("inactivity_keep_token"),
  // Expires 60 days after warning sent.
  inactivityKeepTokenExpiresAt: timestamp("inactivity_keep_token_expires_at"),
  // Set at Stage 2 (60 days). Blocks campaign sends and AI. Reset on campaign completion.
  isDormant: boolean("is_dormant").notNull().default(false),

  // ── Secondary root access ─────────────────────────────────────────────────
  // Grants ROOT_ADMIN-level read + user-management write access.
  // Only true ROOT_ADMIN can grant. Secondary roots cannot grant to others.
  isSecondaryRoot: boolean("is_secondary_root").notNull().default(false),

  // ── Emergency recovery ────────────────────────────────────────────────────
  // Only meaningful on ROOT_ADMIN rows. Enforces 30-day recovery cooldown.
  lastEmergencyRecoveryAt: timestamp("last_emergency_recovery_at"),

  // ── Sender health auto-pause ──────────────────────────────────────────────
  // Set by worker when bounce/complaint rate exceeds threshold. Cleared by admin via resume endpoint.
  sendPaused: boolean("send_paused").notNull().default(false),
  sendPausedReason: text("send_paused_reason"),
  sendPausedAt: timestamp("send_paused_at"),

  // ── Sender identity profile ───────────────────────────────────────────────
  // Used for From display name, Reply-To routing, and email signature injection.
  // SQL migration: ALTER TABLE users ADD COLUMN IF NOT EXISTS sender_name text;
  //               ALTER TABLE users ADD COLUMN IF NOT EXISTS sender_title text;
  //               ALTER TABLE users ADD COLUMN IF NOT EXISTS sender_company text;
  //               ALTER TABLE users ADD COLUMN IF NOT EXISTS sender_phone text;
  //               ALTER TABLE users ADD COLUMN IF NOT EXISTS reply_to_email text;
  senderName: text("sender_name"),
  senderTitle: text("sender_title"),
  senderCompany: text("sender_company"),
  senderPhone: text("sender_phone"),
  replyToEmail: text("reply_to_email"),
}, (table) => ({
  // Supports fast inactivity job query filtering active non-root users
  activeActivityIdx: index("users_active_activity_idx").on(table.isActive, table.lastActivityAt),
  // Supports validateKeepToken lookup
  keepTokenIdx: uniqueIndex("users_keep_token_idx").on(table.inactivityKeepToken),
  // Supports getChildUsers, getActiveChildren, reassignChildren, getUsersWithStats
  parentIdIdx: index("users_parent_id_idx").on(table.parentId),
}));

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  // Supports daily expired session cleanup — DELETE WHERE expires_at < NOW()
  expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
}));

export const templates = pgTable("templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name"),
  company: text("company"),
  category: text("category"),
  customFields: jsonb("custom_fields"),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  userEmailUnique: uniqueIndex("contacts_user_email_unique").on(table.userId, table.email),
}));

export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").references(() => templates.id),
  name: text("name").notNull(),
  status: text("status").notNull().default(CAMPAIGN_STATUS.DRAFT),
  totalEmails: integer("total_emails").notNull().default(0),
  sentEmails: integer("sent_emails").notNull().default(0),
  failedEmails: integer("failed_emails").notNull().default(0),
  skippedEmails: integer("skipped_emails").notNull().default(0),
  bouncedEmails: integer("bounced_emails").notNull().default(0),
  complainedEmails: integer("complained_emails").notNull().default(0),
  openedEmails: integer("opened_emails").notNull().default(0),
  clickedEmails: integer("clicked_emails").notNull().default(0),
  deliveredEmails: integer("delivered_emails").notNull().default(0),
  creditsUsed: integer("credits_used").notNull().default(0),
  contactIds: jsonb("contact_ids").notNull().default([]),
  templateSnapshot: jsonb("template_snapshot"),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  // Supports getCampaigns(userId) — called on every campaign page load and dashboard stats
  userIdIdx: index("campaigns_user_id_idx").on(table.userId),
  // Supports scheduler query for pending scheduled campaigns
  statusScheduledIdx: index("campaigns_status_scheduled_idx").on(table.status, table.scheduledAt),
}));

export const campaignEmails = pgTable("campaign_emails", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // nullable — contact record may be deleted after send; recipientEmail is the durable copy
  contactId: uuid("contact_id").references(() => contacts.id),
  recipientEmail: text("recipient_email").notNull(),
  sesMessageId: text("ses_message_id"),
  status: text("status").notNull().default(CAMPAIGN_EMAIL_STATUS.PENDING),
  failureReason: text("failure_reason"),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // fast SNS bounce/complaint lookup by SES Message-ID
  sesMessageIdIdx: index("campaign_emails_ses_message_id_idx").on(table.sesMessageId),
  // fast suppression and analytics queries per user+email
  userEmailIdx: index("campaign_emails_user_email_idx").on(table.userId, table.recipientEmail),
}));

export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  fromUserId: uuid("from_user_id").references(() => users.id),
  toUserId: uuid("to_user_id").references(() => users.id),
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const suppressions = pgTable("suppressions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  source: text("source").notNull(), // "unsubscribe" | "bounce" | "complaint"
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // idempotent upsert — same user+email pair is always one suppression regardless of source
  uniqueUserEmail: uniqueIndex("suppressions_user_email_unique").on(table.userId, table.email),
}));

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: uuid("target_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(), // "generate-template" | "preview" | "spam-analysis"
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  estimatedCostUsd: numeric("estimated_cost_usd", { precision: 10, scale: 6 }).notNull(),
  cached: boolean("cached").notNull().default(false),
  latencyMs: integer("latency_ms"),             // ms for the OpenAI call; 0 for cache hits; null if unmeasured
  requestHash: text("request_hash"),            // SHA-256 of input content — dedup / abuse detection
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Composite supports per-user queries and the 30-day WHERE created_at filter in getDashboardStats
  userCreatedAtIdx: index("ai_usage_logs_user_created_at_idx").on(table.userId, table.createdAt),
}));

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planName: text("plan_name").notNull(),
  credits: integer("credits").notNull(),
  amountInr: integer("amount_inr").notNull(),
  amountUsd: integer("amount_usd").notNull(),
  amountLocal: integer("amount_local").notNull(),
  currency: text("currency").notNull().default("USD"),
  exchangeRate: text("exchange_rate"),
  status: text("status").notNull().default(PAYMENT_STATUS.PENDING),
  paymentMethod: text("payment_method"),
  transactionId: text("transaction_id"),
  invoiceNumber: text("invoice_number"),
  invoiceUrl: text("invoice_url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at")
});

export const contactSubmissions = pgTable("contact_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  reason: text("reason").notNull(),
  message: text("message").notNull(),
  userId: uuid("user_id").references(() => users.id),
  isRead: boolean("is_read").notNull().default(false),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const waitlist = pgTable("waitlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  source: text("source"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const invites = pgTable("invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  invitedBy: uuid("invited_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tokenHashIdx: uniqueIndex("invites_token_hash_idx").on(table.tokenHash),
  emailIdx: index("invites_email_idx").on(table.email),
  invitedByIdx: index("invites_invited_by_idx").on(table.invitedBy),
}));

export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const waitlistSchema = z.object({
  email: z.string().email("Valid email is required"),
  source: z.string().optional()
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  // System-managed inactivity and governance fields — never set on user creation
  lastActivityAt: true,
  inactivityWarningSentAt: true,
  inactivityKeepToken: true,
  inactivityKeepTokenExpiresAt: true,
  isDormant: true,
  isSecondaryRoot: true,
  lastEmergencyRecoveryAt: true,
  sendPaused: true,
  sendPausedReason: true,
  sendPausedAt: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address")
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

export const resetPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  userId: true,
  createdAt: true
}).extend({
  email: z.string().email("Invalid email")
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  completedAt: true
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true
});

// SNS event deduplication — prevents duplicate processing of at-least-once SNS deliveries.
// Only needs to survive the SNS redelivery window (max 72h); entries are cleaned up after 7 days.
export const snsEvents = pgTable("sns_events", {
  messageId: text("message_id").primaryKey(),
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
  processed: boolean("processed").notNull().default(false),
});

export const allocateCreditsSchema = z.object({
  targetUserId: z.string().uuid("Invalid user ID"),
  amount: z.number().int().positive("Amount must be positive")
});

export const spamAnalysisSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required")
});

export const aiPreviewSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  contacts: z.array(insertContactSchema).max(3)
});

export const contactSubmissionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  company: z.string().optional(),
  reason: z.enum(["SALES", "SUPPORT", "BILLING", "PARTNERSHIP", "OTHER"]),
  message: z.string().min(10, "Message must be at least 10 characters")
});

export const purchaseCreditsSchema = z.object({
  planId: z.string().min(1, "Plan is required"),
  paymentMethod: z.enum(["UPI", "CARD", "NET_BANKING"]).optional()
});

export const SUPPORTED_CURRENCIES = {
  USD: { code: "USD", symbol: "$", name: "US Dollar" },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee" }
};

export const DEFAULT_EXCHANGE_RATE = 83.50;

// ─── Credit-Based Pricing System ─────────────────────────────────────────────

export const CREDIT_TIERS = [
  { min: 3000,   max: 9999,   perCredit: 0.13, prevRate: null },
  { min: 10000,  max: 29999,  perCredit: 0.12, prevRate: 0.13 },
  { min: 30000,  max: 99999,  perCredit: 0.11, prevRate: 0.12 },
  { min: 100000, max: 300000, perCredit: 0.10, prevRate: 0.11 },
];

export const TEAM_PRICING = {
  monthly: 99,   // INR per user per month
  annual:  79,   // INR per user per month (billed annually)
  minUsers: 3,
  maxUsers: 15,
};

export const FREE_TRIAL_CREDITS    = 500;
export const CREDIT_VALIDITY_MONTHS = 6;
export const MIN_CREDIT_PURCHASE   = 3000;

/**
 * Calculate price and bonus credits for a given credit amount.
 * Bonus formula: floor(credits × (prevRate - currentRate) / currentRate)
 * This represents the "savings reinvested as bonus credits" at the current rate.
 */
export function calculateCreditPurchase(credits) {
  const tier = CREDIT_TIERS.find(t => credits >= t.min && credits <= t.max);
  if (!tier) return null;
  const priceINR = Math.round(credits * tier.perCredit);
  const bonus = tier.prevRate
    ? Math.floor(credits * (tier.prevRate - tier.perCredit) / tier.perCredit)
    : 0;
  return {
    credits,
    priceINR,
    priceUSD: +(priceINR / DEFAULT_EXCHANGE_RATE).toFixed(2),
    bonusCredits: bonus,
    totalCredits: credits + bonus,
    perCreditINR: tier.perCredit,
  };
}

export const PRICING_PLANS = {
  trial: {
    id: "trial", name: "Free Trial",
    credits: 500, bonusCredits: 0, totalCredits: 500,
    priceUsd: 0, priceInr: 0,
    isTrial: true, type: "trial",
  },
  starter: {
    id: "starter", name: "Starter",
    credits: 3000, bonusCredits: 0, totalCredits: 3000,
    priceUsd: +(390 / DEFAULT_EXCHANGE_RATE).toFixed(2), priceInr: 390,
    type: "payg",
  },
  growth: {
    id: "growth", name: "Growth",
    credits: 15000, bonusCredits: 1250, totalCredits: 16250,
    priceUsd: +(1800 / DEFAULT_EXCHANGE_RATE).toFixed(2), priceInr: 1800,
    isPopular: true, type: "payg",
  },
  scale: {
    id: "scale", name: "Scale",
    credits: 50000, bonusCredits: 4545, totalCredits: 54545,
    priceUsd: +(5500 / DEFAULT_EXCHANGE_RATE).toFixed(2), priceInr: 5500,
    type: "bulk",
  },
  enterprise: {
    id: "enterprise", name: "Enterprise",
    credits: null, bonusCredits: null, totalCredits: null,
    priceUsd: null, priceInr: null,
    isCustom: true, type: "custom",
  },
};

// Inactivity governance thresholds (days)
export const INACTIVITY_THRESHOLDS = {
  WARNING_DAYS: 30,
  DORMANT_DAYS: 60,
  RECLAIM_ELIGIBLE_DAYS: 90,
};

// Daily AI generation quotas per plan. Enterprise is unlimited (Infinity).
export const AI_DAILY_LIMITS = {
  free:       5,
  trial:      5,
  starter:    20,
  growth:     50,
  scale:      150,
  enterprise: Infinity,
};

// Maximum active child users (team members) per plan.
// free/trial: admins on these plans cannot invite — they have no team seats.
// NOTE: PLAN_LIMITS also carries a maxTeamMembers field with older values;
// MAX_TEAM_MEMBERS is authoritative for invite/create enforcement.
export const MAX_TEAM_MEMBERS = {
  free:       0,
  trial:      0,
  starter:    3,
  growth:     10,
  scale:      25,
  enterprise: Infinity,
};

export const PLAN_LIMITS = {
  free:       { maxTemplates: 3,        maxActiveCampaigns: 1,        maxTeamMembers: 1,        canSchedule: false, canExportAudit: false, label: "Free Trial"  },
  starter:    { maxTemplates: 10,       maxActiveCampaigns: 5,        maxTeamMembers: 1,        canSchedule: true,  canExportAudit: false, label: "Starter"     },
  growth:     { maxTemplates: 25,       maxActiveCampaigns: 10,       maxTeamMembers: 5,        canSchedule: true,  canExportAudit: false, label: "Growth"      },
  scale:      { maxTemplates: 100,      maxActiveCampaigns: 20,       maxTeamMembers: 10,       canSchedule: true,  canExportAudit: true,  label: "Scale"       },
  enterprise: { maxTemplates: Infinity, maxActiveCampaigns: Infinity, maxTeamMembers: Infinity, canSchedule: true,  canExportAudit: true,  label: "Enterprise"  },
};

export function convertCurrency(amountUsd, toInr = true, exchangeRate = DEFAULT_EXCHANGE_RATE) {
  if (toInr) {
    return Math.round(amountUsd * exchangeRate);
  }
  return Math.round(amountUsd * 100) / 100;
}

export function getPlanWithPrices(plan, exchangeRate = DEFAULT_EXCHANGE_RATE) {
  const priceInr = plan.priceUsd !== null ? convertCurrency(plan.priceUsd, true, exchangeRate) : plan.priceInr || null;
  const costPerEmailInr = plan.costPerEmailUsd ? Math.round(plan.costPerEmailUsd * exchangeRate * 100) / 100 : null;

  return {
    ...plan,
    priceUsd: plan.priceUsd,
    priceInr,
    bonusCredits: plan.bonusCredits ?? 0,
    totalCredits: plan.totalCredits ?? plan.credits,
    costPerEmailUsd: plan.costPerEmailUsd || null,
    costPerEmailInr,
    exchangeRate,
  };
}
