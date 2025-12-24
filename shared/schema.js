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

export const insertUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum([USER_ROLES.ROOT_ADMIN, USER_ROLES.SUB_ADMIN, USER_ROLES.USER]),
  parentId: z.string().nullable().optional(),
  creditsReceived: z.number().default(0),
  creditsAllocated: z.number().default(0),
  creditsUsed: z.number().default(0)
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

export const insertContactSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().optional(),
  company: z.string().optional(),
  category: z.string().optional(),
  customFields: z.record(z.string()).optional()
});

export const insertTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  userId: z.string()
});

export const insertCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  templateId: z.string(),
  userId: z.string(),
  contactIds: z.array(z.string()),
  status: z.enum([
    CAMPAIGN_STATUS.DRAFT,
    CAMPAIGN_STATUS.PENDING,
    CAMPAIGN_STATUS.RUNNING,
    CAMPAIGN_STATUS.PAUSED,
    CAMPAIGN_STATUS.COMPLETED,
    CAMPAIGN_STATUS.FAILED
  ]).default(CAMPAIGN_STATUS.DRAFT),
  totalEmails: z.number(),
  sentEmails: z.number().default(0),
  failedEmails: z.number().default(0),
  creditsUsed: z.number().default(0)
});

export const insertAuditLogSchema = z.object({
  userId: z.string(),
  action: z.string(),
  details: z.string().optional(),
  targetUserId: z.string().optional(),
  campaignId: z.string().optional()
});

export const spamAnalysisSchema = z.object({
  subject: z.string(),
  body: z.string()
});

export const aiPreviewSchema = z.object({
  subject: z.string(),
  body: z.string(),
  contacts: z.array(insertContactSchema).max(3)
});
