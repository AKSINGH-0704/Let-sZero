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
  SPAM_ANALYSIS_RUN: "SPAM_ANALYSIS_RUN"
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
  mustResetPassword: boolean("must_reset_password").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at")
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
