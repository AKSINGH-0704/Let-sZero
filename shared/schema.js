import { pgTable, text, integer, boolean, timestamp, jsonb, serial, uuid } from "drizzle-orm/pg-core";
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
  CONTACT_FORM_SUBMITTED: "CONTACT_FORM_SUBMITTED"
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
  plan: text("plan").notNull().default("free")
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

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
});

export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").references(() => templates.id),
  name: text("name").notNull(),
  status: text("status").notNull().default(CAMPAIGN_STATUS.DRAFT),
  totalEmails: integer("total_emails").notNull().default(0),
  sentEmails: integer("sent_emails").notNull().default(0),
  failedEmails: integer("failed_emails").notNull().default(0),
  creditsUsed: integer("credits_used").notNull().default(0),
  contactIds: jsonb("contact_ids").notNull().default([]),
  templateSnapshot: jsonb("template_snapshot"),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const campaignEmails = pgTable("campaign_emails", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").notNull().references(() => contacts.id),
  status: text("status").notNull().default("pending"),
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  creditDeducted: boolean("credit_deducted").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

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

export const waitlistSchema = z.object({
  email: z.string().email("Valid email is required"),
  source: z.string().optional()
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true
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
