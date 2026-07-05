import { pgTable, text, integer, boolean, timestamp, jsonb, serial, uuid, index, uniqueIndex, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import { z } from "zod";

// Plans that can register and use custom sending domains.
// Single authoritative source — imported by server and client.
export const DOMAIN_ELIGIBLE_PLANS = ["free", "trial", "starter", "growth", "scale", "enterprise"];

// Canonical domain lifecycle statuses.
export const SENDER_DOMAIN_STATUS = {
  PENDING_VERIFICATION: "PENDING_VERIFICATION",
  VERIFIED:             "VERIFIED",
  FAILED:               "FAILED",
  SUSPENDED:            "SUSPENDED",
};

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
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
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
  MANUAL: "manual",
};

export const AUDIT_ACTIONS = {
  USER_LOGIN: "USER_LOGIN",
  FREE_CREDITS_GRANTED: "FREE_CREDITS_GRANTED",
  FREE_CREDITS_USED: "FREE_CREDITS_USED",
  FREE_LIMIT_REACHED: "FREE_LIMIT_REACHED",
  USER_LOGOUT: "USER_LOGOUT",
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_DELETED: "USER_DELETED",
  // Distinct from USER_REACTIVATED (below) — that action is reserved for the inactivity
  // governance system auto-clearing isDormant (self/system-triggered, userId===targetId in
  // every existing call site). This one is an explicit admin action flipping isActive back
  // to true on someone else's account (userId=admin, targetId=reactivated user). Kept
  // separate per the codebase's own convention (see EMERGENCY_RECOVERY_TRIGGERED, which is
  // likewise distinct from USER_REACTIVATED despite also flipping isActive).
  USER_REACTIVATED_BY_ADMIN: "USER_REACTIVATED_BY_ADMIN",
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
  // PAR-TRUST-017 §13 / TRUST-018 — written only when reconcileCampaignCounters
  // actually corrects a drifted value, not on every no-op reconciliation pass.
  CAMPAIGN_COUNTERS_RECONCILED: "CAMPAIGN_COUNTERS_RECONCILED",
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
  PAYMENT_CANCELLED: "PAYMENT_CANCELLED",
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
  PLAN_UPGRADED: "PLAN_UPGRADED",
  // Platform-level send controls
  PLATFORM_SEND_PAUSED: "PLATFORM_SEND_PAUSED",
  PLATFORM_SEND_RESUMED: "PLATFORM_SEND_RESUMED",
  // Campaign lifecycle
  CAMPAIGN_CANCELLED: "CAMPAIGN_CANCELLED",
  // Suppression management
  MANUAL_SUPPRESSION_ADDED: "MANUAL_SUPPRESSION_ADDED",
  SUPPRESSION_DELETED: "SUPPRESSION_DELETED",
  // Contact Library
  CONTACT_LIST_CREATED:            "CONTACT_LIST_CREATED",
  CONTACT_LIST_RENAMED:            "CONTACT_LIST_RENAMED",
  CONTACT_LIST_DELETED:            "CONTACT_LIST_DELETED",
  CONTACTS_IMPORTED_TO_LIST:       "CONTACTS_IMPORTED_TO_LIST",
  CONTACT_REMOVED_FROM_LIST:       "CONTACT_REMOVED_FROM_LIST",
  CONTACTS_BULK_REMOVED_FROM_LIST: "CONTACTS_BULK_REMOVED_FROM_LIST",
  CONTACT_UPDATED:                 "CONTACT_UPDATED",
  // Self-service password reset
  PROFILE_UPDATED:                 "PROFILE_UPDATED",
  PASSWORD_RESET_REQUESTED:        "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_COMPLETED:        "PASSWORD_RESET_COMPLETED",
  // Custom sending domains (M9/M12)
  DOMAIN_REGISTERED:               "DOMAIN_REGISTERED",
  DOMAIN_VERIFIED:                 "DOMAIN_VERIFIED",
  DOMAIN_VERIFICATION_FAILED:      "DOMAIN_VERIFICATION_FAILED",
  DOMAIN_REMOVED:                  "DOMAIN_REMOVED",
  DOMAIN_SUSPENDED:                "DOMAIN_SUSPENDED",
  DOMAIN_UNSUSPENDED:              "DOMAIN_UNSUSPENDED",
  DOMAIN_CHECK_REQUESTED:          "DOMAIN_CHECK_REQUESTED",
  CAMPAIGN_DOMAIN_REVOKED:         "CAMPAIGN_DOMAIN_REVOKED",
  // Email analytics tracking (M10)
  TRACKING_TOKENS_PROVISIONED:     "TRACKING_TOKENS_PROVISIONED",
  // Platform trust model (M13B) — Sender Authorization Service
  SEND_AUTHORIZATION_DENIED:       "SEND_AUTHORIZATION_DENIED",
  SEND_AUTHORIZATION_DENIED_EXEC:  "SEND_AUTHORIZATION_DENIED_EXEC",
  EMAIL_VERIFICATION_SENT:         "EMAIL_VERIFICATION_SENT",
  EMAIL_VERIFIED:                  "EMAIL_VERIFIED",
  SENDING_IDENTITY_SET:            "SENDING_IDENTITY_SET",
  PLATFORM_IDENTITY_ACKNOWLEDGED:  "PLATFORM_IDENTITY_ACKNOWLEDGED",
  WARMUP_LIMIT_HIT:                "WARMUP_LIMIT_HIT",
  FIRST_SEND_RECORDED:             "FIRST_SEND_RECORDED",
};

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  CANCELLED: "CANCELLED",
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

  // ── Free Plan monthly credits ─────────────────────────────────────────────
  // Tracks usage within the current 30-day renewal window. Reset to 0 lazily
  // on the first credit-touching request after the renewal date passes.
  // Renewal is rolling from signup: COALESCE(free_credits_reset_at, created_at) + 1 month.
  // freeCreditsResetAt = NULL means "never reset" — created_at used as baseline,
  // so the first renewal fires on the user's signup anniversary, not the 1st of the month.
  // Grant amount is MONTHLY_CREDITS[plan] from schema.js constants, not stored per-user.
  freeCreditsUsed: integer("free_credits_used").notNull().default(0),
  freeCreditsResetAt: timestamp("free_credits_reset_at"),
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

  // ── Self-service password reset ───────────────────────────────────────────
  // SHA-256 hash of raw reset token (raw goes in email URL, never stored).
  // SQL migration: ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token text;
  //               ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at timestamptz;
  resetToken: text("reset_token"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at"),

  // ── Platform trust model (M13B) ──────────────────────────────────────────
  // Identity dimension: email ownership, sending identity choice, acknowledgment.
  // emailVerificationToken: SHA-256 hash of raw token (raw in email URL, never stored).
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpiresAt: timestamp("email_verification_expires_at"),
  // 'custom_domain' | 'platform' | null. null = not yet set up.
  sendingIdentityType: text("sending_identity_type"),
  // Set when user explicitly accepts shared-reputation terms for platform-identity path.
  platformIdentityAcknowledgedAt: timestamp("platform_identity_acknowledged_at"),
  // Policy/reputation dimension: warm-up lifecycle anchor and rolling counters.
  // Set on first ever successfully dispatched email; null = never sent.
  firstSendAt: timestamp("first_send_at"),
  // null = use platform default from platform_settings; integer = admin override.
  warmupDailyLimit: integer("warmup_daily_limit"),
  warmupEmailsSentToday: integer("warmup_emails_sent_today").notNull().default(0),
  // Window start for the rolling 24h warm-up counter. Reset per-email via conditional WHERE.
  warmupEmailsResetAt: timestamp("warmup_emails_reset_at"),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userEmailUnique: uniqueIndex("contacts_user_email_unique").on(table.userId, table.email),
}));

// ── Contact Library ───────────────────────────────────────────────────────────

export const contactLists = pgTable("contact_lists", {
  id:          uuid("id").defaultRandom().primaryKey(),
  userId:      uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:        text("name").notNull(),
  description: text("description"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("contact_lists_user_id_idx").on(table.userId),
}));

export const contactListMembers = pgTable("contact_list_members", {
  id:        uuid("id").defaultRandom().primaryKey(),
  listId:    uuid("list_id").notNull().references(() => contactLists.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  addedAt:   timestamp("added_at").defaultNow().notNull(),
}, (table) => ({
  listContactUnique: uniqueIndex("contact_list_members_list_contact_unique").on(table.listId, table.contactId),
  listIdIdx:         index("contact_list_members_list_id_idx").on(table.listId),
  contactIdIdx:      index("contact_list_members_contact_id_idx").on(table.contactId),
}));

export const contactImports = pgTable("contact_imports", {
  id:              uuid("id").defaultRandom().primaryKey(),
  userId:          uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  listId:          uuid("list_id").notNull().references(() => contactLists.id, { onDelete: "cascade" }),
  source:          text("source").notNull().default("library_import"),
  fileName:        text("file_name"),
  totalRows:       integer("total_rows").notNull().default(0),
  failedRows:      integer("failed_rows").notNull().default(0),
  newContacts:     integer("new_contacts").notNull().default(0),
  updatedContacts: integer("updated_contacts").notNull().default(0),
  addedToList:     integer("added_to_list").notNull().default(0),
  alreadyInList:   integer("already_in_list").notNull().default(0),
  createdAt:       timestamp("created_at").defaultNow().notNull(),
  completedAt:     timestamp("completed_at"),
}, (table) => ({
  listIdIdx: index("contact_imports_list_id_idx").on(table.listId),
}));

// ── Custom Sending Domains (M9) ───────────────────────────────────────────────
// Lifecycle: PENDING_VERIFICATION → VERIFIED | FAILED | SUSPENDED
// Soft-deleted domains keep status = SUSPENDED (no hard delete until user confirms).
// senderEmailSnapshot on campaigns is the durable copy of the from-address captured
// at campaign creation — survives domain deletion without breaking history display.

export const senderDomains = pgTable("sender_domains", {
  id:           uuid("id").defaultRandom().primaryKey(),
  userId:       uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  domain:       text("domain").notNull(),
  fromEmail:    text("from_email").notNull(),
  status:       text("status").notNull().default("PENDING_VERIFICATION"),
  // AWS Easy DKIM — SES generates and manages these CNAME records automatically
  dkimTokens:  jsonb("dkim_tokens"),          // [{ name, value, type }]
  // Ownership proof record (TXT): name=_repmail-verify.<domain>, value=repmail-verify=<userId>
  verifyRecord: jsonb("verify_record"),        // { name, value, type }
  verifiedAt:   timestamp("verified_at"),
  suspendedAt:  timestamp("suspended_at"),
  // Domain-level health counters (tracked separately from per-user health)
  sentCount:       integer("sent_count").notNull().default(0),
  bouncedCount:    integer("bounced_count").notNull().default(0),
  complainedCount: integer("complained_count").notNull().default(0),
  verificationWindowDays: integer("verification_window_days").notNull().default(14),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx:    index("sender_domains_user_id_idx").on(table.userId),
  userDomainUnique: uniqueIndex("sender_domains_user_domain_unique").on(table.userId, table.domain),
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
  unsubscribedEmails: integer("unsubscribed_emails").notNull().default(0),
  creditsUsed: integer("credits_used").notNull().default(0),
  contactIds: jsonb("contact_ids").notNull().default([]),
  templateSnapshot: jsonb("template_snapshot"),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  // Set exactly once, atomically, by finalizeCampaign() when a campaign reaches a
  // terminal status (COMPLETED/CANCELLED/FAILED) and its final counters + orphaned
  // campaign_emails cleanup have been written. NULL means "not yet finalized" — the
  // gate credit reclaim must wait on (PAR-TRUST-017 §7.5/§7.6). Never set for PAUSED.
  finalizedAt: timestamp("finalized_at"),
  // PAR-TRUST-017 §7.7 — execution liveness lease. Set on acquiring RUNNING and
  // renewed periodically by the live execution (every loop iteration, and inside
  // sendWithRetry's own retry loop so a single slow contact keeps renewing).
  // NULL or in the past means no execution currently owns this campaign — the
  // only condition under which the reclaim gate or recovery may safely assume
  // "dead" without waiting further. Cleared on finalization and on PAUSED.
  executionLeaseExpiresAt: timestamp("execution_lease_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  listId:       uuid("list_id").references(() => contactLists.id, { onDelete: "set null" }),
  listSnapshot: jsonb("list_snapshot"),
  // Custom sending domain — NULL means use platform default SES_FROM_EMAIL.
  // ON DELETE SET NULL: domain deletion does not break existing campaigns.
  senderDomainId:       uuid("sender_domain_id").references(() => senderDomains.id, { onDelete: "set null" }),
  // Durable snapshot of fromEmail captured at campaign creation time.
  // Survives domain hard-delete without breaking history display.
  senderEmailSnapshot:  text("sender_email_snapshot"),
}, (table) => ({
  // Supports getCampaigns(userId) — called on every campaign page load and dashboard stats
  userIdIdx: index("campaigns_user_id_idx").on(table.userId),
  // Supports scheduler query for pending scheduled campaigns
  statusScheduledIdx: index("campaigns_status_scheduled_idx").on(table.status, table.scheduledAt),
  listIdIdx: index("campaigns_list_id_idx").on(table.listId),
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
  unsubscribedAt: timestamp("unsubscribed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // fast SNS bounce/complaint lookup by SES Message-ID
  sesMessageIdIdx: index("campaign_emails_ses_message_id_idx").on(table.sesMessageId),
  // fast suppression and analytics queries per user+email
  userEmailIdx: index("campaign_emails_user_email_idx").on(table.userId, table.recipientEmail),
  // PAR-TRUST-017 §7.1 — at-most-once send enforcement. Two partial unique indexes
  // (contact_id nullable) so the DB itself rejects a second claim attempt for the
  // same contact within a campaign, regardless of which/how many application
  // processes are concurrently executing that campaign's send loop.
  contactUniqueIdx: uniqueIndex("campaign_emails_contact_uq")
    .on(table.campaignId, table.contactId)
    .where(sql`${table.contactId} IS NOT NULL`),
  recipientUniqueIdx: uniqueIndex("campaign_emails_recipient_uq")
    .on(table.campaignId, table.recipientEmail)
    .where(sql`${table.contactId} IS NULL`),
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
  source: text("source").notNull(), // "unsubscribe" | "bounce" | "complaint" | "manual"
  reason: text("reason"),           // diagnostic code for bounce, feedback type for complaint, admin note for manual
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

// ── Email Analytics Tracking Tokens (M10) ────────────────────────────────────
// One row per tracking event slot: 1 open token + N click tokens per campaign_email.
// token: 22-char base64url from crypto.randomBytes(16) — 128 bits of entropy.
// ON DELETE CASCADE from both campaigns and campaign_emails keeps the table clean.
export const trackingTokens = pgTable("tracking_tokens", {
  id:                   uuid("id").defaultRandom().primaryKey(),
  token:                text("token").notNull().unique(),
  tokenType:            text("token_type").notNull(),        // 'open' | 'click'
  campaignId:           uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  campaignEmailId:      uuid("campaign_email_id").notNull().references(() => campaignEmails.id, { onDelete: "cascade" }),
  linkUrl:              text("link_url"),                    // null for open tokens; original URL for click tokens
  createdAt:            timestamp("created_at").notNull().defaultNow(),
  expiresAt:            timestamp("expires_at").notNull(),   // created_at + TRACKING_TOKEN_RETENTION_DAYS
  firstUsedAt:          timestamp("first_used_at"),          // null until first resolution
  usedCount:            integer("used_count").notNull().default(0),
  lastUserAgentCategory: text("last_user_agent_category"),  // classified UA category string
  ipHash:               text("ip_hash"),                    // SHA-256(IP + salt) — never raw IP
}, (table) => ({
  tokenUniqueIdx:    uniqueIndex("idx_tracking_tokens_token").on(table.token),
  campaignTypeIdx:   index("idx_tracking_tokens_campaign").on(table.campaignId, table.tokenType),
  campaignEmailIdx:  index("idx_tracking_tokens_campaign_email").on(table.campaignEmailId),
  expiresAtIdx:      index("idx_tracking_tokens_expires").on(table.expiresAt),
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
  // Trust model fields — system-managed, never set at user creation
  emailVerified: true,
  emailVerificationToken: true,
  emailVerificationExpiresAt: true,
  sendingIdentityType: true,
  platformIdentityAcknowledgedAt: true,
  firstSendAt: true,
  warmupDailyLimit: true,
  warmupEmailsSentToday: true,
  warmupEmailsResetAt: true,
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
  monthly: 129,  // INR per user per month
  annual:  99,   // INR per user per month (billed annually)
  minUsers: 3,
  maxUsers: 15,
};

// Monthly credit grant per plan. Grant amount is derived from this map at runtime —
// not stored per-user — so changing a value here takes effect on the next monthly refresh.
// Plans with 0 never trigger the lazy refresh and show no free credit meter in the UI.
export const MONTHLY_CREDITS = {
  free:       500,
  starter:    0,
  growth:     0,
  scale:      0,
  enterprise: 0,
};

export const FREE_TRIAL_CREDITS    = MONTHLY_CREDITS.free; // backward-compat alias — do not remove
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
  dev_test: {
    id: "dev_test", name: "Developer Test",
    credits: 100, bonusCredits: 0, totalCredits: 100,
    priceUsd: 0.13, priceInr: 11,
    isAdminOnly: true, isHidden: true, type: "test",
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

// Team member limits are in MAX_TEAM_MEMBERS (authoritative). PLAN_LIMITS covers
// per-user feature gates only; do not add maxTeamMembers here to avoid confusion.
export const PLAN_LIMITS = {
  free:       { maxTemplates: 3,        maxActiveCampaigns: 1,        canSchedule: false, canExportAudit: false, label: "Free Plan"   },
  starter:    { maxTemplates: 10,       maxActiveCampaigns: 5,        canSchedule: true,  canExportAudit: false, label: "Starter"     },
  growth:     { maxTemplates: 25,       maxActiveCampaigns: 10,       canSchedule: true,  canExportAudit: false, label: "Growth"      },
  scale:      { maxTemplates: 100,      maxActiveCampaigns: 20,       canSchedule: true,  canExportAudit: true,  label: "Scale"       },
  enterprise: { maxTemplates: Infinity, maxActiveCampaigns: Infinity, canSchedule: true,  canExportAudit: true,  label: "Enterprise"  },
};

export function convertCurrency(amountUsd, toInr = true, exchangeRate = DEFAULT_EXCHANGE_RATE) {
  if (toInr) {
    return Math.round(amountUsd * exchangeRate);
  }
  return Math.round(amountUsd * 100) / 100;
}

export function getPlanWithPrices(plan, exchangeRate = DEFAULT_EXCHANGE_RATE) {
  const priceInr = plan.priceUsd !== null ? convertCurrency(plan.priceUsd, true, exchangeRate) : plan.priceInr || null;
  const effectiveCredits = plan.totalCredits ?? plan.credits;
  const computedCostPerEmailUsd = plan.costPerEmailUsd
    ?? (plan.priceUsd && effectiveCredits ? Math.round((plan.priceUsd / effectiveCredits) * 1_000_000) / 1_000_000 : null);
  const costPerEmailInr = computedCostPerEmailUsd ? Math.round(computedCostPerEmailUsd * exchangeRate * 100) / 100 : null;
  return {
    ...plan,
    priceUsd: plan.priceUsd,
    priceInr,
    bonusCredits: plan.bonusCredits ?? 0,
    totalCredits: effectiveCredits,
    costPerEmailUsd: computedCostPerEmailUsd,
    costPerEmailInr,
    exchangeRate,
  };
}
