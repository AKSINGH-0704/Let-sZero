/**
 * In-Memory Storage Adapter for DEV Mode
 * =======================================
 * This provides a PostgreSQL-like in-memory storage that:
 * - Maintains the same schema and constraints as production
 * - Does NOT bypass validations, role checks, or credit rules
 * - Correctly mutates state for credits, users, campaigns, audit logs
 * - Automatically deactivates when real DATABASE_URL is provided
 */

import crypto from "crypto";
import bcrypt from "bcryptjs";
import {
  USER_ROLES, AUDIT_ACTIONS, CAMPAIGN_STATUS, PAYMENT_STATUS, PAYMENT_KIND,
  CAMPAIGN_EMAIL_STATUS, SUPPRESSION_SOURCE, AI_DAILY_LIMITS,
  INACTIVITY_THRESHOLDS, MONTHLY_CREDITS, normalizeEmail
} from "../shared/schema.js";
import { generateTrackingToken } from "./trackingUtils.js";
import { isMachineCategory } from "./trackingClassifier.js";
import { PERMANENT_FAILURE_REASONS, EXECUTION_LEASE_DURATION_MS } from "./campaignConfig.js";
// M39 Phase 2 — same payment state machine the production backend uses, kept in parity.
import { canTransition } from "../shared/paymentStateMachine.js";
// M42 — seat commerce. Identical shared modules to storage.js, so the two
// backends cannot diverge on a commercial decision.
import {
  resolveSeatEntitlement, parseFreeFloor, parseTimestampSetting, SEAT_SETTING_KEYS,
} from "../shared/seatEntitlement.js";
import {
  SUBSCRIPTION_STATUS, canSubscriptionTransition, isEntitling,
} from "../shared/subscriptionStateMachine.js";
import { quoteSeats, periodFor, anchorDayFor } from "../shared/seatPricing.js";
// M51 — AutoPay. Identical shared authority to storage.js, so the two backends
// cannot diverge on mandate legality or rollout scope.
import {
  MANDATE_STATUS, canMandateTransition, DEFAULT_PAYMENT_PROVIDER,
  AUTOPAY_SETTING_KEYS, parseAutopayScope, parseAutopayAllowlist, parseAutopayLimitPct,
  GATEWAY_REVOKE_PENDING,
} from "../shared/autopay.js";

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function generateUUID() {
  return crypto.randomUUID();
}

// Per-workspace async lock backing claimWorkspaceSeat — see its comment below.
const _seatLocks = new Map();

async function _claimWorkspaceSeatUnlocked(self, rootId, limit, writeFn) {
  // M42 parity — `limit` may be a resolver evaluated under the same lock. See
  // storage.js claimWorkspaceSeat for why the ceiling must be read in here.
  if (typeof limit === "function") limit = await limit(null);
  if (limit !== Infinity) {
    const memberIds = await self.getWorkspaceMemberIds(rootId);
    memberIds.delete(rootId);
    let activeCount = 0;
    for (const id of memberIds) {
      const u = store.users.get(id);
      if (u && u.isActive) activeCount++;
    }
    if (activeCount >= limit) return { allowed: false, current: activeCount };
  }
  const result = await writeFn(null);
  return { allowed: true, result };
}

// In-memory data stores
const store = {
  users: new Map(),
  sessions: new Map(),
  templates: new Map(),
  contacts: new Map(),
  campaigns: new Map(),
  campaignEmails: new Map(),
  suppressions: new Map(),
  creditTransactions: new Map(),
  auditLogs: new Map(),
  payments: new Map(),
  contactSubmissions: new Map(),
  waitlist: new Map(),
  aiUsageLogs: new Map(),
  invites: new Map(),
  snsEvents: new Map(),
  contactLists: new Map(),
  contactListMembers: new Map(),
  contactImports: new Map(),
  trackingTokens: new Map(),
  workspaceSubscriptions: new Map(),
  paymentMandates: new Map(),
  webhookEvents: new Map(),
};

// Helper to convert Map to array sorted by createdAt desc
function toSortedArray(map, sortField = "createdAt") {
  return Array.from(map.values()).sort((a, b) =>
    new Date(b[sortField]) - new Date(a[sortField])
  );
}

// Build 6-month chart from an already-loaded campaign list (no extra query).
// Defined here (not duplicated in storage.js) so dbStorage and memoryStorage
// share one implementation — storage.js imports it back from this module.
export function buildMonthlyChart(campaignsList) {
  const buckets = {};
  const orderedKeys = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short" });
    buckets[key] = { month: label, sent: 0, opened: 0 };
    orderedKeys.push(key);
  }
  for (const c of campaignsList) {
    // Use the actual send date so draft-in-Jan / sent-in-Feb campaigns land in Feb.
    const d = new Date(c.startedAt || c.completedAt || c.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (buckets[key]) {
      buckets[key].sent   += c.sentEmails   || 0;
      buckets[key].opened += c.openedEmails || 0;
    }
  }
  return orderedKeys.map(k => buckets[k]);
}

export const memoryStorage = {
  // ==================== USER OPERATIONS ====================
  async createUser(userData) {
    // M49 — VALIDATION, not authorization. Storage has no caller, so it cannot
    // know whether ROOT_ADMIN is legitimate (it is, for initializeRootAdmin at
    // boot) or an escalation — that decision belongs to the route, which knows
    // who is asking. What storage CAN do for free is refuse a value that is not a
    // role at all, which no legitimate internal caller ever passes and which
    // costs the bootstrap path nothing.
    const resolvedRole = userData.role || USER_ROLES.USER;
    if (!Object.values(USER_ROLES).includes(resolvedRole)) {
      throw new Error(`Invalid role: ${resolvedRole}`);
    }
    const id = generateUUID();
    const now = new Date();
    const passwordHash = await bcrypt.hash(userData.password || crypto.randomBytes(32).toString("hex"), 12);

    // SEC — email is a login/reset identifier, so it must resolve to exactly one
    // account. Normalize (lowercase+trim) before storing and dedupe
    // case-INSENSITIVELY. Previously the dedupe used a case-sensitive `===`
    // while getUserByEmail matched case-insensitively, so `Victim@corp.com` and
    // `victim@corp.com` could both exist and a reset lookup would resolve to
    // whichever was inserted first — an account-takeover / cross-account-reset
    // vector. See normalizeEmail() in shared/schema.js.
    const normalizedEmail = normalizeEmail(userData.email);

    // Check for unique username and unique (normalized) email
    for (const user of store.users.values()) {
      if (user.username === userData.username) {
        throw new Error("Username already exists");
      }
      if (normalizedEmail && normalizeEmail(user.email) === normalizedEmail) {
        throw new Error("Email already exists");
      }
    }

    const user = {
      id,
      username: userData.username,
      email: normalizedEmail,
      passwordHash,
      role: resolvedRole,
      parentId: userData.parentId || null,
      creditsReceived: userData.creditsReceived || 0,
      creditsAllocated: 0,
      creditsUsed: 0,
      trialCredits: 5,
      trialCreditsUsed: 0,
      freeCreditsUsed: 0,
      freeCreditsResetAt: null,
      // When FREE_PLAN_ENABLED, new users enter as free plan users — not legacy trial users.
      // Respect explicit isTrialUser=false from callers (e.g. initializeRootAdmin).
      isTrialUser: "isTrialUser" in userData
        ? Boolean(userData.isTrialUser)
        : process.env.FREE_PLAN_ENABLED !== "true",
      mustResetPassword: userData.mustResetPassword !== false,
      isActive: true,
      plan: userData.plan || "free",
      aiGenerationsToday: 0,
      aiGenerationsResetAt: null,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      lastActivityAt: null,
      inactivityWarningSentAt: null,
      inactivityKeepToken: null,
      inactivityKeepTokenExpiresAt: null,
      isDormant: false,
      isSecondaryRoot: false,
      lastEmergencyRecoveryAt: null,
      // Sender identity profile
      senderName: null,
      senderTitle: null,
      senderCompany: null,
      senderPhone: null,
      replyToEmail: null,
      // Trust model (M13B)
      emailVerified: userData.emailVerified === true,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
      sendingIdentityType: null,
      platformIdentityAcknowledgedAt: null,
      firstSendAt: null,
      warmupDailyLimit: null,
      warmupEmailsSentToday: 0,
      warmupEmailsResetAt: null,
    };

    store.users.set(id, user);
    return this.sanitizeUser(user);
  },

  async getUserById(id) {
    const user = store.users.get(id);
    return user ? this.sanitizeUser(user) : null;
  },

  async getUser(id) {
    return this.getUserById(id);
  },

  async getUserByUsername(username) {
    for (const user of store.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  },

  async getUserByEmail(email) {
    // SEC — match on the canonical (normalized) form so a lookup resolves
    // deterministically regardless of the casing/whitespace the caller passes.
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    for (const user of store.users.values()) {
      if (normalizeEmail(user.email) === normalized) {
        return user;
      }
    }
    return null;
  },

  async validatePassword(user, password) {
    const hash = user.passwordHash;
    if (!hash) return false;

    // Modern bcrypt hash
    if (hash.startsWith("$2b$") || hash.startsWith("$2a$")) {
      return bcrypt.compare(password, hash);
    }

    // Legacy SHA-256 hash — verify, then transparently migrate to bcrypt
    const sha256 = crypto.createHash("sha256").update(password).digest("hex");
    if (sha256 !== hash) return false;

    try {
      const newHash = await bcrypt.hash(password, 12);
      const storedUser = store.users.get(user.id);
      if (storedUser) {
        storedUser.passwordHash = newHash;
        storedUser.updatedAt = new Date();
        console.log(`[AUTH] Migrated password hash for user ${user.username} from SHA-256 to bcrypt`);
      }
    } catch (migErr) {
      console.error(`[AUTH] Password migration failed for user ${user.id}:`, migErr.message);
    }

    return true;
  },

  async updatePassword(userId, newPassword) {
    const user = store.users.get(userId);
    if (!user) throw new Error("User not found");

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.mustResetPassword = false;
    user.updatedAt = new Date();
    
    await this.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
      targetType: "user",
      targetId: userId
    });
  },

  async updateUser(id, updates) {
    const user = store.users.get(id);
    if (!user) return null;

    if (updates.email) {
      // SEC — normalize and enforce uniqueness on email change so the canonical
      // invariant (one account per normalized email) also holds for updates,
      // not just creation.
      const normalizedEmail = normalizeEmail(updates.email);
      if (normalizedEmail) {
        for (const other of store.users.values()) {
          if (other.id !== id && normalizeEmail(other.email) === normalizedEmail) {
            throw new Error("Email already exists");
          }
        }
      }
      user.email = normalizedEmail;
    }
    if (updates.isActive !== undefined) user.isActive = updates.isActive;
    if (updates.mustResetPassword !== undefined) user.mustResetPassword = updates.mustResetPassword;
    if (updates.lastLoginAt) user.lastLoginAt = updates.lastLoginAt;
    if (updates.creditsReceived !== undefined) user.creditsReceived = updates.creditsReceived;
    if (updates.creditsAllocated !== undefined) user.creditsAllocated = updates.creditsAllocated;
    if (updates.creditsUsed !== undefined) user.creditsUsed = updates.creditsUsed;
    if (updates.freeCreditsUsed !== undefined) user.freeCreditsUsed = updates.freeCreditsUsed;
    if (updates.freeCreditsResetAt !== undefined) user.freeCreditsResetAt = updates.freeCreditsResetAt;
    if (updates.plan) user.plan = updates.plan;
    if (updates.sendPaused !== undefined) user.sendPaused = updates.sendPaused;
    if (updates.sendPausedReason !== undefined) user.sendPausedReason = updates.sendPausedReason;
    if (updates.sendPausedAt !== undefined) user.sendPausedAt = updates.sendPausedAt;
    // Sender identity profile
    if (updates.senderName    !== undefined) user.senderName    = updates.senderName    || null;
    if (updates.senderTitle   !== undefined) user.senderTitle   = updates.senderTitle   || null;
    if (updates.senderCompany !== undefined) user.senderCompany = updates.senderCompany || null;
    if (updates.senderPhone   !== undefined) user.senderPhone   = updates.senderPhone   || null;
    if (updates.replyToEmail  !== undefined) user.replyToEmail  = updates.replyToEmail  || null;
    // Trust model fields (M13B)
    if (updates.emailVerified !== undefined) user.emailVerified = updates.emailVerified;
    if (updates.emailVerificationToken !== undefined) user.emailVerificationToken = updates.emailVerificationToken || null;
    if (updates.emailVerificationExpiresAt !== undefined) user.emailVerificationExpiresAt = updates.emailVerificationExpiresAt || null;
    if (updates.sendingIdentityType !== undefined) user.sendingIdentityType = updates.sendingIdentityType || null;
    if (updates.platformIdentityAcknowledgedAt !== undefined) user.platformIdentityAcknowledgedAt = updates.platformIdentityAcknowledgedAt || null;
    if ("warmupDailyLimit" in updates) user.warmupDailyLimit = updates.warmupDailyLimit;
    user.updatedAt = new Date();

    return this.sanitizeUser(user);
  },

  async setFirstSendAt(userId) {
    const user = store.users.get(userId);
    if (user && !user.firstSendAt) {
      user.firstSendAt = new Date();
      user.updatedAt = new Date();
    }
  },

  async atomicIncrementWarmupCount(userId, dailyLimit) {
    const user = store.users.get(userId);
    if (!user) return null;
    const now = new Date();
    const cutoff = new Date(now.getTime() - 86_400_000);
    if (!user.warmupEmailsResetAt || new Date(user.warmupEmailsResetAt) < cutoff) {
      user.warmupEmailsSentToday = 0;
      user.warmupEmailsResetAt = now;
    }
    if (user.warmupEmailsSentToday >= dailyLimit) return null;
    user.warmupEmailsSentToday += 1;
    user.updatedAt = now;
    return user.warmupEmailsSentToday;
  },

  // ── TRUST-029 — domain-scoped warm-up accounting (parity with storage.js) ──
  // Same derivation: anchor is the workspace's earliest first send, the daily
  // total is the sum of members' LIVE 24h counters. No new state is stored.
  async getWorkspaceWarmupState(rootId) {
    const memberIds = [...await this.getWorkspaceMemberIds(rootId)];
    const cutoff = new Date(Date.now() - 86_400_000);
    let firstSendAt = null, sentToday = 0, warmupDailyLimit = null;
    for (const id of memberIds) {
      const u = store.users.get(id);
      if (!u) continue;
      if (u.firstSendAt && (!firstSendAt || new Date(u.firstSendAt) < new Date(firstSendAt))) {
        firstSendAt = u.firstSendAt;
      }
      if (u.warmupEmailsResetAt && new Date(u.warmupEmailsResetAt) >= cutoff) {
        sentToday += u.warmupEmailsSentToday || 0;
      }
      if (id === rootId) warmupDailyLimit = u.warmupDailyLimit ?? null;
    }
    return { firstSendAt, sentToday, warmupDailyLimit };
  },

  // "Single-threaded" is not the same as "atomic". An `await` between the check
  // and the write is a yield point, and four members' campaign loops racing on
  // the last slot all read the same total before any of them incremented — the
  // exact overshoot the Postgres path's root-row lock prevents. Every await
  // therefore happens BEFORE the decision; from the sum to the write there is
  // not one, which is what makes this the memory analogue of that lock.
  async atomicIncrementWorkspaceWarmupCount(userId, rootId, dailyLimit) {
    const memberIds = [...await this.getWorkspaceMemberIds(rootId)];
    const now = new Date();
    const cutoff = new Date(now.getTime() - 86_400_000);

    // ── no awaits past this line ──
    let used = 0;
    for (const id of memberIds) {
      const u = store.users.get(id);
      if (u?.warmupEmailsResetAt && new Date(u.warmupEmailsResetAt) >= cutoff) {
        used += u.warmupEmailsSentToday || 0;
      }
    }
    if (used >= dailyLimit) return null;
    const user = store.users.get(userId);
    if (!user) return null;
    if (!user.warmupEmailsResetAt || new Date(user.warmupEmailsResetAt) < cutoff) {
      user.warmupEmailsSentToday = 0;
      user.warmupEmailsResetAt = now;
    }
    user.warmupEmailsSentToday += 1;
    user.updatedAt = now;
    return used + 1;
  },

  async deleteUser(id) {
    // Delete related sessions
    for (const [sessionId, session] of store.sessions.entries()) {
      if (session.userId === id) {
        store.sessions.delete(sessionId);
      }
    }
    store.users.delete(id);
  },

  async getUsers(parentId = null, includeAll = false) {
    let result = toSortedArray(store.users);
    if (!includeAll && parentId) {
      result = result.filter(u => u.parentId === parentId);
    }
    return result.map(u => this.sanitizeUser(u));
  },

  async getChildUsers(parentId) {
    const result = toSortedArray(store.users).filter(u => u.parentId === parentId);
    return result.map(u => this.sanitizeUser(u));
  },

  async getActiveChildren(parentId) {
    const result = toSortedArray(store.users).filter(u => u.parentId === parentId && u.isActive);
    return result.map(u => this.sanitizeUser(u));
  },

  async reassignChildren(oldParentId, newParentId) {
    for (const user of store.users.values()) {
      if (user.parentId === oldParentId) {
        user.parentId = newParentId;
      }
    }
  },

  sanitizeUser(user) {
    if (!user) return null;
    const {
      passwordHash,
      resetToken,
      resetTokenExpiresAt,
      emailVerificationToken,
      emailVerificationExpiresAt,
      inactivityKeepToken,
      inactivityKeepTokenExpiresAt,
      ...sanitized
    } = user;
    sanitized.creditsRemaining = (sanitized.creditsReceived || 0) -
                                  (sanitized.creditsAllocated || 0) -
                                  (sanitized.creditsUsed || 0);
    // M41-C — free-credit availability has a SINGLE source of truth:
    // getTotalCreditsAvailable() (exposed at GET /api/credits/info), which reads
    // the SHARED workspace free pool off the root row. The former per-user
    // `freeCreditsRemaining`/`monthlyFreeCredits` fields here were computed from
    // the individual's own row + own plan — a second, now-incorrect definition of
    // the same business value (a member's own counter no longer reflects the
    // shared pool). They had no consumers (server, client, or tests), so they are
    // removed rather than left as a conflicting duplicate. `creditsRemaining`
    // (purchased, genuinely per-user) stays.
    return sanitized;
  },

  // ==================== SESSION OPERATIONS ====================
  async createSession(userId) {
    const id = generateUUID();
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const session = {
      id,
      userId,
      token,
      expiresAt,
      createdAt: new Date()
    };
    
    store.sessions.set(id, session);
    await this.updateUser(userId, { lastLoginAt: new Date() });
    
    return session;
  },

  async getSessionByToken(token) {
    for (const session of store.sessions.values()) {
      if (session.token === token && new Date(session.expiresAt) > new Date()) {
        return session;
      }
    }
    return null;
  },

  async deleteSession(token) {
    for (const [id, session] of store.sessions.entries()) {
      if (session.token === token) {
        store.sessions.delete(id);
        return;
      }
    }
  },

  async deleteUserSessions(userId) {
    let count = 0;
    for (const [id, session] of store.sessions.entries()) {
      if (session.userId === userId) {
        store.sessions.delete(id);
        count++;
      }
    }
    return count;
  },

  // ==================== CREDIT OPERATIONS ====================
  async canAllocateCredits(fromUserId, amount) {
    const user = await this.getUserById(fromUserId);
    if (!user) return false;
    return user.creditsRemaining >= amount;
  },

  async allocateCredits(fromUserId, toUserId, amount, performedBy) {
    const fromUser = store.users.get(fromUserId);
    const toUser = store.users.get(toUserId);
    
    if (!fromUser || !toUser) {
      throw new Error("User not found");
    }
    
    // Role-based validation (exact production logic)
    if (fromUser.role === USER_ROLES.ROOT_ADMIN && toUser.role !== USER_ROLES.SUB_ADMIN) {
      throw new Error("ROOT_ADMIN can only allocate credits to SUB_ADMINs");
    }
    if (fromUser.role === USER_ROLES.SUB_ADMIN && toUser.role !== USER_ROLES.USER) {
      throw new Error("SUB_ADMIN can only allocate credits to USERs");
    }
    // M41-C — a workspace OWNER is a top-level account (parentId === null) that the
    // product models as role USER (ownership is tree POSITION, not role — see
    // isWorkspaceOwner in routes.js). The owner is the workspace's billing
    // authority and must be able to allocate purchased credits to any of their
    // direct children (Managers or Members). A non-owner USER (a member, with a
    // parentId) still cannot allocate. The parent-child check below keeps this
    // scoped to the caller's own direct children either way.
    if (fromUser.role === USER_ROLES.USER && fromUser.parentId != null) {
      throw new Error("USER cannot allocate credits");
    }

    // Parent-child validation
    if (toUser.parentId !== fromUserId) {
      throw new Error("Can only allocate credits to direct children");
    }
    
    // Balance check
    const fromRemaining = (fromUser.creditsReceived || 0) - (fromUser.creditsAllocated || 0) - (fromUser.creditsUsed || 0);
    if (fromRemaining < amount) {
      throw new Error("Insufficient credits available");
    }
    
    const fromBalanceBefore = fromUser.creditsAllocated;
    const toBalanceBefore = toUser.creditsReceived;
    
    // Atomic transaction simulation
    fromUser.creditsAllocated += amount;
    fromUser.updatedAt = new Date();
    toUser.creditsReceived += amount;
    toUser.updatedAt = new Date();
    
    // Create credit transactions
    const txId1 = generateUUID();
    store.creditTransactions.set(txId1, {
      id: txId1,
      userId: fromUserId,
      type: "allocation_out",
      amount: -amount,
      balanceBefore: fromBalanceBefore,
      balanceAfter: fromBalanceBefore + amount,
      fromUserId,
      toUserId,
      description: `Allocated ${amount} credits to ${toUser.username}`,
      createdAt: new Date()
    });
    
    const txId2 = generateUUID();
    store.creditTransactions.set(txId2, {
      id: txId2,
      userId: toUserId,
      type: "allocation_in",
      amount: amount,
      balanceBefore: toBalanceBefore,
      balanceAfter: toBalanceBefore + amount,
      fromUserId,
      toUserId,
      description: `Received ${amount} credits from ${fromUser.username}`,
      createdAt: new Date()
    });
    
    await this.createAuditLog({
      userId: performedBy || fromUserId,
      action: AUDIT_ACTIONS.CREDITS_ALLOCATED,
      targetType: "user",
      targetId: toUserId,
      details: { fromUserId, toUserId, amount }
    });
    
    return { success: true, amount };
  },

  async reclaimCredits(childId, parentId, amount) {
    const child = store.users.get(childId);
    const parent = store.users.get(parentId);
    if (!child || !parent) throw new Error("User not found");

    const childBalanceBefore = child.creditsReceived;
    const parentBalanceBefore = parent.creditsAllocated;

    child.creditsReceived -= amount;
    child.updatedAt = new Date();
    parent.creditsAllocated -= amount;
    parent.updatedAt = new Date();

    const txId1 = generateUUID();
    store.creditTransactions.set(txId1, {
      id: txId1,
      userId: childId,
      type: "reclaim_out",
      amount: -amount,
      balanceBefore: childBalanceBefore,
      balanceAfter: childBalanceBefore - amount,
      fromUserId: childId,
      toUserId: parentId,
      description: `${amount} credits reclaimed on account deactivation`,
      createdAt: new Date(),
    });

    const txId2 = generateUUID();
    store.creditTransactions.set(txId2, {
      id: txId2,
      userId: parentId,
      type: "reclaim_in",
      amount,
      balanceBefore: parentBalanceBefore,
      balanceAfter: parentBalanceBefore - amount,
      fromUserId: childId,
      toUserId: parentId,
      description: `${amount} credits reclaimed from ${child.username} on deactivation`,
      createdAt: new Date(),
    });

    return { amount };
  },

  async useCredits(userId, amount) {
    const user = store.users.get(userId);
    if (!user) throw new Error("User not found");

    const remaining = (user.creditsReceived || 0) - (user.creditsAllocated || 0) - (user.creditsUsed || 0);
    if (remaining < amount) {
      throw new Error("Insufficient credits");
    }

    user.creditsUsed += amount;
    user.updatedAt = new Date();
    
    return this.sanitizeUser(user);
  },

  // M41-C — the recurring monthly free allowance is a WORKSPACE resource, not a
  // per-user one. It physically lives on the workspace root row (parentId ===
  // null) and is SHARED by every member, so a member never mints their own free
  // pool. This resolves that holder (mirrors storage.js). For a workspace owner
  // the holder is the user themselves, so single-account behaviour is unchanged.
  async _resolveFreePoolHolder(userId) {
    const rootId = await this.resolveWorkspaceRootId(userId);
    return store.users.get(rootId) || store.users.get(userId);
  },

  async deductCreditAtomic(userId, campaignId, description = "Email sent") {
    const user = store.users.get(userId);
    if (!user) throw new Error("User not found");

    // M41-C — free credits are drawn from the shared workspace pool on the root
    // row; paid and trial credits remain per-user (`user`).
    const poolHolder = await this._resolveFreePoolHolder(userId);

    const freePlanEnabled = process.env.FREE_PLAN_ENABLED === "true";
    // TRUST-025 (M20-B): effectivePlan, not the raw column — mirrors storage.js.
    const effectivePlan = await this.getEffectivePlan(userId);
    const monthlyGrant = MONTHLY_CREDITS[effectivePlan] ?? 0;
    // Eligibility is a property of the WORKSPACE (root), not the individual.
    const freeEligible = freePlanEnabled && !poolHolder.isTrialUser && monthlyGrant > 0;

    // Compute balances at moment of write (single-threaded, no TOCTOU in memory)
    const paidRemaining = Math.max(0, (user.creditsReceived || 0) - (user.creditsAllocated || 0) - (user.creditsUsed || 0));

    // Lazy refresh: reset the shared workspace pool if the 1-month renewal window
    // from the workspace's signup (root createdAt / last reset) has passed
    if (freeEligible) {
      const resetAt = poolHolder.freeCreditsResetAt;
      const refDate = resetAt ? new Date(resetAt) : new Date(poolHolder.createdAt);
      const nextReset = new Date(refDate);
      nextReset.setUTCMonth(nextReset.getUTCMonth() + 1);
      if (new Date() >= nextReset) {
        poolHolder.freeCreditsUsed = 0;
        poolHolder.freeCreditsResetAt = new Date();
      }
    }

    const freeRemaining = freeEligible
      ? Math.max(0, monthlyGrant - (poolHolder.freeCreditsUsed || 0))
      : 0;
    const trialRemaining = (!freePlanEnabled && user.isTrialUser)
      ? Math.max(0, (user.trialCredits || 0) - (user.trialCreditsUsed || 0))
      : 0;

    if (freeEligible && freeRemaining >= 1) {
      // Deduct from the shared workspace pool (root row); the ledger row is still
      // attributed to the actual sender (userId) so "who used it" is preserved.
      const balanceBefore = poolHolder.freeCreditsUsed || 0;
      poolHolder.freeCreditsUsed = balanceBefore + 1;
      poolHolder.updatedAt = new Date();
      const txId = generateUUID();
      store.creditTransactions.set(txId, {
        id: txId, userId, type: "free_usage", amount: -1,
        balanceBefore, balanceAfter: balanceBefore + 1,
        campaignId, description, createdAt: new Date()
      });
    } else if (paidRemaining >= 1) {
      const balanceBefore = user.creditsUsed;
      user.creditsUsed += 1;
      user.updatedAt = new Date();
      const txId = generateUUID();
      store.creditTransactions.set(txId, {
        id: txId, userId, type: "usage", amount: -1,
        balanceBefore, balanceAfter: balanceBefore + 1,
        campaignId, description, createdAt: new Date()
      });
    } else if (trialRemaining >= 1) {
      const balanceBefore = user.trialCreditsUsed || 0;
      user.trialCreditsUsed = balanceBefore + 1;
      user.updatedAt = new Date();
      const txId = generateUUID();
      store.creditTransactions.set(txId, {
        id: txId, userId, type: "trial_usage", amount: -1,
        balanceBefore, balanceAfter: balanceBefore + 1,
        campaignId, description, createdAt: new Date()
      });
    } else {
      throw new Error("Insufficient credits");
    }

    await this.createAuditLog({
      userId, action: AUDIT_ACTIONS.CREDITS_USED,
      targetType: "campaign", targetId: campaignId,
      details: { creditsUsed: 1 },
    });

    return true;
  },

  async addCredits(userId, amount, action, details = {}) {
    const user = store.users.get(userId);
    if (!user) throw new Error("User not found");
    user.creditsReceived = (user.creditsReceived || 0) + amount;
    user.updatedAt = new Date();
    await this.createAuditLog({
      userId, action: action || AUDIT_ACTIONS.CREDITS_PURCHASED,
      details: { amount, ...details }
    });
    return this.sanitizeUser(user);
  },

  async canStartCampaign(userId, emailCount) {
    const user = await this.getUserById(userId);
    if (!user) return { allowed: false, reason: "User not found", blockReason: "user_not_found" };

    const freePlanEnabled = process.env.FREE_PLAN_ENABLED === "true";
    // TRUST-025 (M20-B): effectivePlan, not the raw column — mirrors storage.js.
    const effectivePlan = await this.getEffectivePlan(userId);
    const monthlyGrant = MONTHLY_CREDITS[effectivePlan] ?? 0;
    const paidRemaining = user.creditsRemaining || 0;

    // M41-C — the free balance is the SHARED workspace pool (root row), so a
    // member's availability reflects what the whole workspace has left.
    const poolHolder = await this._resolveFreePoolHolder(userId);

    let freeRemaining = 0;
    if (freePlanEnabled && !poolHolder.isTrialUser && monthlyGrant > 0) {
      // Treat stale pool as reset for availability check (same as getTotalCreditsAvailable)
      const resetAt = poolHolder.freeCreditsResetAt;
      const refDate = resetAt ? new Date(resetAt) : new Date(poolHolder.createdAt);
      const nextReset = new Date(refDate);
      nextReset.setUTCMonth(nextReset.getUTCMonth() + 1);
      const effectiveUsed = new Date() >= nextReset ? 0 : (poolHolder.freeCreditsUsed || 0);
      freeRemaining = Math.max(0, monthlyGrant - effectiveUsed);
    }

    const trialRemaining = (!freePlanEnabled && user.isTrialUser)
      ? Math.max(0, (user.trialCredits || 0) - (user.trialCreditsUsed || 0))
      : 0;

    const totalAvailable = paidRemaining + freeRemaining + trialRemaining;

    if (totalAvailable < emailCount) {
      let blockReason;
      if (freePlanEnabled && !poolHolder.isTrialUser && freeRemaining === 0 && paidRemaining === 0) {
        blockReason = monthlyGrant > 0 ? "free_exhausted" : "paid_exhausted";
      } else if (paidRemaining === 0 && freeRemaining === 0) {
        blockReason = "both_exhausted";
      } else {
        blockReason = "insufficient";
      }
      return {
        allowed: false,
        reason: `Insufficient credits. Need ${emailCount}, have ${totalAvailable}`,
        blockReason,
        creditsNeeded: emailCount,
        creditsAvailable: totalAvailable,
        freeRemaining,
        paidRemaining,
      };
    }

    return { allowed: true, creditsAvailable: totalAvailable, freeRemaining, paidRemaining };
  },

  async getCreditTransactions(userId, limit = 50) {
    return toSortedArray(store.creditTransactions)
      .filter(t => t.userId === userId)
      .slice(0, limit);
  },

  // ==================== TEMPLATE OPERATIONS ====================
  async createTemplate(templateData) {
    const id = generateUUID();
    const now = new Date();
    
    const template = {
      id,
      userId: templateData.userId,
      name: templateData.name,
      subject: templateData.subject,
      body: templateData.body,
      isDefault: templateData.isDefault || false,
      createdAt: now,
      updatedAt: now
    };
    
    store.templates.set(id, template);
    
    await this.createAuditLog({
      userId: templateData.userId,
      action: AUDIT_ACTIONS.TEMPLATE_CREATED,
      targetType: "template",
      targetId: id,
      details: { name: template.name }
    });
    
    return template;
  },

  async getTemplates(userId = null) {
    let result = toSortedArray(store.templates);
    if (userId) {
      result = result.filter(t => t.userId === userId);
    }
    return result;
  },

  async getTemplate(id) {
    return store.templates.get(id) || null;
  },

  async updateTemplate(id, updates) {
    const template = store.templates.get(id);
    if (!template) return null;
    
    if (updates.name) template.name = updates.name;
    if (updates.subject) template.subject = updates.subject;
    if (updates.body) template.body = updates.body;
    if (updates.isDefault !== undefined) template.isDefault = updates.isDefault;
    template.updatedAt = new Date();
    
    return template;
  },

  async deleteTemplate(id, userId) {
    store.templates.delete(id);
    if (userId) {
      await this.createAuditLog({
        userId,
        action: AUDIT_ACTIONS.TEMPLATE_DELETED,
        targetType: "template",
        targetId: id
      });
    }
  },

  // ==================== CONTACT OPERATIONS ====================
  async createContact(contactData) {
    const email = contactData.email?.toLowerCase().trim();

    // Upsert: update non-identifying fields if (userId, email) already exists
    const existing = [...store.contacts.values()].find(
      (c) => c.userId === contactData.userId && c.email === email
    );
    if (existing) {
      existing.name = contactData.name ?? existing.name;
      existing.company = contactData.company ?? existing.company;
      existing.category = contactData.category ?? existing.category;
      existing.customFields = contactData.customFields ?? existing.customFields;
      store.contacts.set(existing.id, existing);
      return existing;
    }

    const id = generateUUID();
    const contact = {
      id,
      userId: contactData.userId,
      email,
      name: contactData.name || null,
      company: contactData.company || null,
      category: contactData.category || null,
      customFields: contactData.customFields || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    store.contacts.set(id, contact);
    return contact;
  },

  async createContacts(contactsData) {
    if (contactsData.length === 0) return [];
    
    const result = [];
    for (const data of contactsData) {
      const contact = await this.createContact(data);
      result.push(contact);
    }
    
    await this.createAuditLog({
      userId: contactsData[0].userId,
      action: AUDIT_ACTIONS.CONTACT_IMPORTED,
      targetType: "contacts",
      details: { count: result.length }
    });
    
    return result;
  },

  async getContacts(userId) {
    return toSortedArray(store.contacts).filter(c => c.userId === userId);
  },

  async getContactById(id) {
    return store.contacts.get(id) || null;
  },

  async getContactsByIds(ids) {
    if (!ids || ids.length === 0) return [];
    return ids.map(id => store.contacts.get(id)).filter(Boolean);
  },

  // ── Contact Library ─────────────────────────────────────────────────────────

  async createContactList({ userId, name, description }) {
    const id = generateUUID();
    const now = new Date();
    const list = { id, userId, name, description: description || null, createdAt: now, updatedAt: now };
    store.contactLists.set(id, list);
    await this.createAuditLog({ userId, action: AUDIT_ACTIONS.CONTACT_LIST_CREATED, targetType: "contact_list", targetId: id, details: { name } });
    return { ...list, contactCount: 0 };
  },

  async getContactLists(userId) {
    return toSortedArray(store.contactLists)
      .filter(l => l.userId === userId)
      .map(l => ({
        ...l,
        contactCount: Array.from(store.contactListMembers.values()).filter(m => m.listId === l.id).length,
      }));
  },

  async getContactList(id, userId) {
    const list = store.contactLists.get(id);
    if (!list || list.userId !== userId) return null;
    return {
      ...list,
      contactCount: Array.from(store.contactListMembers.values()).filter(m => m.listId === id).length,
    };
  },

  async updateContactList(id, userId, { name, description }) {
    const list = store.contactLists.get(id);
    if (!list || list.userId !== userId) return null;
    if (name !== undefined) list.name = name;
    if (description !== undefined) list.description = description;
    list.updatedAt = new Date();
    store.contactLists.set(id, list);
    if (name !== undefined) {
      await this.createAuditLog({ userId, action: AUDIT_ACTIONS.CONTACT_LIST_RENAMED, targetType: "contact_list", targetId: id, details: { name } });
    }
    return { ...list, contactCount: Array.from(store.contactListMembers.values()).filter(m => m.listId === id).length };
  },

  async deleteContactList(id, userId) {
    const list = store.contactLists.get(id);
    if (!list || list.userId !== userId) return null;
    store.contactLists.delete(id);
    for (const [mid, m] of store.contactListMembers.entries()) {
      if (m.listId === id) store.contactListMembers.delete(mid);
    }
    for (const [iid, imp] of store.contactImports.entries()) {
      if (imp.listId === id) store.contactImports.delete(iid);
    }
    await this.createAuditLog({ userId, action: AUDIT_ACTIONS.CONTACT_LIST_DELETED, targetType: "contact_list", targetId: id, details: { name: list.name } });
    return list;
  },

  async importContactsToList(userId, listId, rows, source = "library_import", fileName = null) {
    // Mirrors storage.js's batching/dedup behavior field-for-field (same BATCH
    // window, same "last occurrence within a batch wins" rule, same
    // duplicateRows reporting) — a prior version of this method processed rows
    // sequentially with no dedup step and hardcoded failedRows: 0, meaning the
    // duplicate-row-error UI could never be exercised in dev/test mode, only
    // in production against Postgres. Same bug class as TEAMS-002.
    const BATCH = 1000;
    let newContacts = 0, updatedContacts = 0, addedToList = 0, alreadyInList = 0;
    const duplicateRows = [];

    for (let i = 0; i < rows.length; i += BATCH) {
      const rawBatch = rows.slice(i, i + BATCH);

      const lastIndexByEmail = new Map();
      rawBatch.forEach((r, idx) => lastIndexByEmail.set(r.email.toLowerCase().trim(), idx));
      const batch = [];
      const seen = new Set();
      for (let j = rawBatch.length - 1; j >= 0; j--) {
        const r = rawBatch[j];
        const normalizedEmail = r.email.toLowerCase().trim();
        if (seen.has(normalizedEmail)) {
          duplicateRows.push({ row: r._row, email: r.email, keptRow: rawBatch[lastIndexByEmail.get(normalizedEmail)]._row });
          continue;
        }
        seen.add(normalizedEmail);
        batch.unshift(r);
      }

      for (const row of batch) {
        const email = row.email.toLowerCase().trim();
        const existingContact = Array.from(store.contacts.values()).find(c => c.userId === userId && c.email === email);
        let contactId;
        if (existingContact) {
          existingContact.name = row.name || existingContact.name;
          existingContact.company = row.company || existingContact.company;
          existingContact.category = row.category || existingContact.category;
          existingContact.customFields = row.customFields || existingContact.customFields;
          existingContact.updatedAt = new Date();
          store.contacts.set(existingContact.id, existingContact);
          contactId = existingContact.id;
          updatedContacts++;
        } else {
          const id = generateUUID();
          const now = new Date();
          const c = { id, userId, email, name: row.name || null, company: row.company || null, category: row.category || null, customFields: row.customFields || null, createdAt: now, updatedAt: now };
          store.contacts.set(id, c);
          contactId = id;
          newContacts++;
        }
        const alreadyMember = Array.from(store.contactListMembers.values()).some(m => m.listId === listId && m.contactId === contactId);
        if (alreadyMember) {
          alreadyInList++;
        } else {
          const mid = generateUUID();
          store.contactListMembers.set(mid, { id: mid, listId, contactId, addedAt: new Date() });
          addedToList++;
        }
      }
    }

    const failedRows = duplicateRows.length;
    const id = generateUUID();
    const importRecord = { id, userId, listId, source, fileName: fileName || null, totalRows: rows.length, failedRows, newContacts, updatedContacts, addedToList, alreadyInList, createdAt: new Date(), completedAt: new Date() };
    store.contactImports.set(id, importRecord);
    await this.createAuditLog({ userId, action: AUDIT_ACTIONS.CONTACTS_IMPORTED_TO_LIST, targetType: "contact_list", targetId: listId, details: { totalRows: rows.length, newContacts, updatedContacts, addedToList, alreadyInList, failedRows, duplicatesInBatch: duplicateRows.length, fileName } });
    return { ...importRecord, duplicateRows };
  },

  async exportContactList(listId, userId) {
    const members = Array.from(store.contactListMembers.values()).filter(m => m.listId === listId);
    return members
      .map(m => {
        const c = store.contacts.get(m.contactId);
        return c && c.userId === userId ? { email: c.email, name: c.name, company: c.company, category: c.category, addedAt: m.addedAt } : null;
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt))
      .map(({ addedAt: _, ...rest }) => rest);
  },

  async getContactListContacts(listId, userId, { search, page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    const members = Array.from(store.contactListMembers.values()).filter(m => m.listId === listId);
    let rows = members
      .map(m => {
        const c = store.contacts.get(m.contactId);
        return c ? { ...c, addedAt: m.addedAt } : null;
      })
      .filter(c => c && c.userId === userId);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(c => c.email.includes(q) || (c.name && c.name.toLowerCase().includes(q)));
    }
    rows.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    const total = rows.length;
    return { rows: rows.slice(offset, offset + limit), total, page, limit };
  },

  async removeContactFromList(listId, contactId, userId) {
    const list = Array.from(store.contactLists.values()).find(l => l.id === listId && l.userId === userId);
    if (!list) return null;
    const entry = Array.from(store.contactListMembers.entries()).find(([, m]) => m.listId === listId && m.contactId === contactId);
    if (!entry) return null;
    store.contactListMembers.delete(entry[0]);
    await this.createAuditLog({ userId, action: AUDIT_ACTIONS.CONTACT_REMOVED_FROM_LIST, targetType: "contact_list", targetId: listId, details: { contactId } });
    return entry[1];
  },

  async bulkRemoveContactsFromList(listId, contactIds, userId) {
    if (!contactIds || contactIds.length === 0) return 0;
    const list = Array.from(store.contactLists.values()).find(l => l.id === listId && l.userId === userId);
    if (!list) return 0;
    const idSet = new Set(contactIds);
    for (const [mid, m] of store.contactListMembers.entries()) {
      if (m.listId === listId && idSet.has(m.contactId)) store.contactListMembers.delete(mid);
    }
    await this.createAuditLog({ userId, action: AUDIT_ACTIONS.CONTACTS_BULK_REMOVED_FROM_LIST, targetType: "contact_list", targetId: listId, details: { count: contactIds.length } });
    return contactIds.length;
  },

  async getContactListImports(listId, userId) {
    const list = await this.getContactList(listId, userId);
    if (!list) return null;
    return toSortedArray(store.contactImports).filter(i => i.listId === listId);
  },

  async updateContact(id, userId, fields) {
    const contact = store.contacts.get(id);
    if (!contact || contact.userId !== userId) return null;
    Object.assign(contact, fields, { updatedAt: new Date() });
    store.contacts.set(id, contact);
    await this.createAuditLog({ userId, action: AUDIT_ACTIONS.CONTACT_UPDATED, targetType: "contact", targetId: id, details: { fields: Object.keys(fields) } });
    return contact;
  },

  async resolveListContactIds(listId, userId) {
    return Array.from(store.contactListMembers.values())
      .filter(m => {
        if (m.listId !== listId) return false;
        const c = store.contacts.get(m.contactId);
        return c && c.userId === userId;
      })
      .map(m => m.contactId);
  },

  // ── End Contact Library ──────────────────────────────────────────────────────

  // ==================== CAMPAIGN OPERATIONS ====================
  async createCampaign(campaignData) {
    const id = generateUUID();
    const now = new Date();
    
    const campaign = {
      id,
      userId: campaignData.userId,
      templateId: campaignData.templateId || null,
      name: campaignData.name,
      status: campaignData.status || CAMPAIGN_STATUS.DRAFT,
      totalEmails: campaignData.totalEmails || 0,
      sentEmails: 0,
      failedEmails: 0,
      skippedEmails: 0,
      creditsUsed: 0,
      contactIds: campaignData.contactIds || [],
      templateSnapshot: campaignData.templateSnapshot || null,
      listId: campaignData.listId || null,
      listSnapshot: campaignData.listSnapshot || null,
      scheduledAt: campaignData.scheduledAt || null,
      startedAt: null,
      completedAt: null,
      finalizedAt: null,
      // Pre-existing gap fixed alongside PAR-TRUST-017: these were never copied,
      // so any custom-domain campaign silently failed SAS's SENDER_DOMAIN_REQUIRED
      // check in dev/test mode regardless of what the caller actually passed.
      senderDomainId: campaignData.senderDomainId || null,
      senderEmailSnapshot: campaignData.senderEmailSnapshot || null,
      createdAt: now,
      updatedAt: now
    };
    
    store.campaigns.set(id, campaign);
    
    await this.createAuditLog({
      userId: campaignData.userId,
      action: AUDIT_ACTIONS.CAMPAIGN_CREATED,
      targetType: "campaign",
      targetId: id,
      details: { name: campaign.name, totalEmails: campaign.totalEmails }
    });
    
    return campaign;
  },

  async getCampaignsByStatus(status) {
    return toSortedArray(store.campaigns).filter(c => c.status === status);
  },

  async getCampaigns(userId = null, isRootAdmin = false) {
    if (isRootAdmin) {
      const rootId = await this.resolveWorkspaceRootId(userId);
      const memberIds = await this.getWorkspaceMemberIds(rootId);
      return toSortedArray(store.campaigns).filter(c => memberIds.has(c.userId));
    }
    if (userId) {
      return toSortedArray(store.campaigns).filter(c => c.userId === userId);
    }
    return [];
  },

  async getCampaign(id) {
    return store.campaigns.get(id) || null;
  },

  async updateCampaign(id, updates) {
    const campaign = store.campaigns.get(id);
    if (!campaign) return null;

    Object.assign(campaign, updates, { updatedAt: new Date() });
    return campaign;
  },

  // Mirrors storage.js — see its comment for why this guarded write exists.
  async updateCampaignProgress(campaignId, updates) {
    const campaign = store.campaigns.get(campaignId);
    if (!campaign || campaign.finalizedAt) return;
    Object.assign(campaign, updates, { updatedAt: new Date() });
  },

  async getCampaignStatus(id) {
    return store.campaigns.get(id)?.status || null;
  },

  // PAR-TRUST-017 §7.7 — mirrors storage.js's renewLeaseAndGetStatus.
  async renewLeaseAndGetStatus(campaignId) {
    const campaign = store.campaigns.get(campaignId);
    if (!campaign) return null;
    if (campaign.status === "RUNNING") {
      campaign.executionLeaseExpiresAt = new Date(Date.now() + EXECUTION_LEASE_DURATION_MS);
    }
    return campaign.status;
  },

  async renewExecutionLease(campaignId) {
    const campaign = store.campaigns.get(campaignId);
    if (campaign && campaign.status === "RUNNING") {
      campaign.executionLeaseExpiresAt = new Date(Date.now() + EXECUTION_LEASE_DURATION_MS);
    }
  },

  async getExecutionLeaseExpiry(campaignId) {
    const campaign = store.campaigns.get(campaignId);
    if (!campaign) return null;
    return { executionLeaseExpiresAt: campaign.executionLeaseExpiresAt || null, finalizedAt: campaign.finalizedAt || null };
  },

  async cancelCampaign(id, allowedStatuses) {
    const campaign = store.campaigns.get(id);
    if (!campaign || !allowedStatuses.includes(campaign.status)) return null;
    campaign.status = "CANCELLED";
    campaign.updatedAt = new Date();
    return campaign;
  },

  async bulkFailOrphanedCampaignEmails(campaignId) {
    for (const [, email] of store.campaignEmails || new Map()) {
      if (email.campaignId === campaignId && email.status === CAMPAIGN_EMAIL_STATUS.PENDING) {
        email.status = CAMPAIGN_EMAIL_STATUS.FAILED;
        email.failureReason = "campaign_recovery_failed";
      }
    }
  },

  // PAR-TRUST-017 — mirrors storage.js's deriveCountsFromCampaignEmails.
  // BOUNCED/COMPLAINED count as sent — they are states a message reaches only
  // after a successful send, not an alternative to having been sent (see
  // storage.js's comment for the financial-correctness reasoning).
  async deriveCountsFromCampaignEmails(campaignId) {
    let sentEmails = 0, failedEmails = 0, skippedEmails = 0;
    let bouncedEmails = 0, complainedEmails = 0, deliveredEmails = 0, openedEmails = 0, clickedEmails = 0, unsubscribedEmails = 0;
    for (const record of store.campaignEmails.values()) {
      if (record.campaignId !== campaignId) continue;
      if (record.status === CAMPAIGN_EMAIL_STATUS.SENT) sentEmails++;
      else if (record.status === CAMPAIGN_EMAIL_STATUS.FAILED) failedEmails++;
      else if (record.status === CAMPAIGN_EMAIL_STATUS.SUPPRESSED) skippedEmails++;
      else if (record.status === CAMPAIGN_EMAIL_STATUS.BOUNCED) { sentEmails++; bouncedEmails++; }
      else if (record.status === CAMPAIGN_EMAIL_STATUS.COMPLAINED) { sentEmails++; complainedEmails++; }
      if (record.deliveredAt) deliveredEmails++;
      if (record.openedAt) openedEmails++;
      if (record.clickedAt) clickedEmails++;
      if (record.unsubscribedAt) unsubscribedEmails++;
    }
    // Mirrors storage.js — derive creditsUsed from the ledger, not a row-count
    // proxy. See storage.js's comment for the exact reasoning (deductCreditAtomic
    // can fail after a send already succeeded; campaignId on credit_transactions
    // is set exclusively by the three deduction paths).
    let creditsUsed = 0;
    for (const tx of store.creditTransactions.values()) {
      if (tx.campaignId === campaignId) creditsUsed += -tx.amount;
    }
    return {
      sentEmails, failedEmails, skippedEmails, creditsUsed,
      bouncedEmails, complainedEmails, deliveredEmails, openedEmails, clickedEmails, unsubscribedEmails,
    };
  },

  // PAR-TRUST-017 §13 / TRUST-018 — mirrors storage.js's equivalents.
  async getCampaignsPendingReconciliation(minAgeMs, maxAgeMs) {
    const now = Date.now();
    return [...store.campaigns.values()].filter(c => {
      if (!c.finalizedAt) return false;
      const age = now - new Date(c.finalizedAt).getTime();
      return age >= minAgeMs && age <= maxAgeMs;
    });
  },

  async reconcileCampaignCounters(campaignId) {
    const campaign = store.campaigns.get(campaignId);
    if (!campaign?.finalizedAt) return false;

    const fields = ["sentEmails", "failedEmails", "skippedEmails", "creditsUsed", "bouncedEmails", "complainedEmails", "deliveredEmails", "openedEmails", "clickedEmails", "unsubscribedEmails"];
    const before = Object.fromEntries(fields.map(f => [f, campaign[f]])); // snapshot before the await below yields

    const derived = await this.deriveCountsFromCampaignEmails(campaignId);
    const drifted = fields.some(f => before[f] !== derived[f]);
    if (!drifted) return false;

    // Re-verify nothing else already reconciled this exact drift while the
    // await above yielded control — mirrors storage.js's compare-and-swap.
    // Without this, two concurrent callers could both pass the drift check
    // before either has mutated `campaign`, and both append an audit entry.
    const stillMatchesSnapshot = fields.every(f => campaign[f] === before[f]);
    if (!stillMatchesSnapshot) return false;

    Object.assign(campaign, derived, { updatedAt: new Date() });

    await this.createAuditLog({
      userId: campaign.userId,
      action: AUDIT_ACTIONS.CAMPAIGN_COUNTERS_RECONCILED,
      targetType: "campaign",
      targetId: campaignId,
      details: { reason: "overlapping_execution_drift", before, after: derived },
    });
    return true;
  },

  // PAR-TRUST-017 §7.3/§7.5 — mirrors storage.js's finalizeCampaign exactly
  // (same idempotency contract, same legal-transition guard, always derives
  // counts from campaign_emails rather than trusting a caller-supplied local
  // counter — see storage.js's comment for why this matters under concurrency).
  //
  // The claim (finalizedAt + status) MUST be set synchronously, before the
  // `await` below — a concurrency test caught this exact ordering bug: with the
  // await for deriving counts sitting between the "already finalized?" check and
  // the mutation, every concurrent caller passes the check before any of them
  // mutates anything, so all of them would "win". In real Postgres this ordering
  // doesn't matter (the row-level lock on the guarded UPDATE itself provides
  // atomicity regardless of when counts are derived) — but memoryStorage's
  // atomicity comes entirely from JS's synchronous execution, which requires the
  // check-and-claim to complete in one unbroken synchronous stretch.
  async finalizeCampaign(campaignId, toStatus) {
    if (!["COMPLETED", "CANCELLED", "FAILED"].includes(toStatus)) {
      throw new Error(`finalizeCampaign: illegal toStatus "${toStatus}" — PAUSED is not a terminal state`);
    }
    const campaign = store.campaigns.get(campaignId);
    if (!campaign) return false;
    if (campaign.finalizedAt) return false; // already finalized — idempotent no-op
    if (toStatus === "COMPLETED" && campaign.status !== "RUNNING") return false;

    // Claim synchronously — no await before this point, none after until the
    // claim is durably recorded on the in-memory row.
    campaign.status = toStatus;
    campaign.finalizedAt = new Date();
    campaign.executionLeaseExpiresAt = null; // §7.7 — ownership released
    if (toStatus === "COMPLETED") campaign.completedAt = new Date();
    campaign.updatedAt = new Date();

    // Flip orphaned PENDING rows to FAILED *before* deriving counts — these
    // rows are becoming FAILED in this very call, so the counts written to
    // campaign and to the CAMPAIGN_FINALIZED audit entry must reflect that,
    // not a pre-flip snapshot. Mirrors the storage.js fix (previously this ran
    // after counts were derived, so a claimed-but-never-resolved row would
    // silently vanish from both the campaign row and the audit trail).
    for (const record of store.campaignEmails.values()) {
      if (record.campaignId === campaignId && record.status === CAMPAIGN_EMAIL_STATUS.PENDING) {
        record.status = CAMPAIGN_EMAIL_STATUS.FAILED;
        record.failureReason = "campaign_terminated";
      }
    }

    const counts = await this.deriveCountsFromCampaignEmails(campaignId);
    Object.assign(campaign, counts);

    // Mirrors storage.js — the authoritative "what actually happened" record,
    // written once here with the true final counts.
    await this.createAuditLog({
      userId: campaign.userId,
      action: AUDIT_ACTIONS.CAMPAIGN_FINALIZED,
      targetType: "campaign",
      targetId: campaignId,
      details: { toStatus, ...counts },
    });

    return true;
  },

  // ==================== AUDIT LOG OPERATIONS ====================
  async createAuditLog(data) {
    try {
      const id = generateUUID();
      const log = {
        id,
        userId: data.userId || null,
        action: data.action,
        targetType: data.targetType || null,
        targetId: data.targetId || null,
        details: data.details || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        createdAt: new Date()
      };
      
      store.auditLogs.set(id, log);
    } catch (err) {
      console.error("Failed to create audit log:", err);
    }
  },

  async getAuditLogs(filters = {}) {
    let result = toSortedArray(store.auditLogs);

    if (filters.userId) {
      result = result.filter(l => l.userId === filters.userId);
    } else if (filters.userIds) {
      const idSet = new Set(filters.userIds);
      result = result.filter(l => idSet.has(l.userId));
    }
    if (filters.action) {
      result = result.filter(l => l.action === filters.action);
    }
    if (filters.targetId) {
      result = result.filter(l => l.targetId === filters.targetId);
    }
    
    result = result.slice(0, filters.limit || 100);
    
    // Add username to each log
    return result.map(log => {
      const user = log.userId ? store.users.get(log.userId) : null;
      return {
        ...log,
        username: user?.username || null
      };
    });
  },

  // ==================== DASHBOARD OPERATIONS ====================
  async createAiUsageLog(data) {
    const id = generateUUID();
    const log = {
      id,
      userId: data.userId,
      endpoint: data.endpoint,
      model: data.model,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      estimatedCostUsd: Number(data.estimatedCostUsd),
      cached: data.cached ?? false,
      latencyMs: data.latencyMs ?? null,
      requestHash: data.requestHash ?? null,
      createdAt: new Date(),
    };
    store.aiUsageLogs.set(id, log);
    return log;
  },

  async getDashboardStats(userId, isRootAdmin, includePlatformAiStats) {
    const campaignsList = await this.getCampaigns(userId, isRootAdmin);

    // Mirrors dbStorage.getDashboardStats field-for-field (storage.js) — this
    // used to be a much smaller subset, which meant Dashboard's analytics
    // silently went blank in dev/test mode regardless of real underlying data.
    const totalSent      = campaignsList.reduce((s, c) => s + (c.sentEmails      || 0), 0);
    const totalAttempted = campaignsList.reduce((s, c) => s + (c.totalEmails     || 0), 0);
    const totalOpens     = campaignsList.reduce((s, c) => s + (c.openedEmails    || 0), 0);
    const totalClicks    = campaignsList.reduce((s, c) => s + (c.clickedEmails   || 0), 0);
    const totalDelivered = campaignsList.reduce((s, c) => s + (c.deliveredEmails || 0), 0);

    const avgOpenRate  = totalSent > 0 ? Math.min(100, (totalOpens     / totalSent)      * 100) : null;
    const avgClickRate = totalSent > 0 ? Math.min(100, (totalClicks    / totalSent)      * 100) : null;
    const deliveryRate = totalSent > 0 ? Math.min(100, (totalDelivered / totalSent)      * 100) : null;
    const successRate  = totalAttempted > 0 ? Math.min(100, (totalSent / totalAttempted) * 100) : null;

    const activeContacts = userId
      ? Array.from(store.contacts.values()).filter(c => c.userId === userId).length
      : 0;

    const base = {
      totalCampaigns: campaignsList.length,
      // Definition aligned with dbStorage: RUNNING + PAUSED + PENDING(scheduled).
      // Previously excluded PENDING here, which meant this metric could disagree
      // with production depending on which backend happened to compute it.
      activeCampaigns: campaignsList.filter(c => ["RUNNING", "PAUSED", "PENDING"].includes(c.status)).length,
      completedCampaigns: campaignsList.filter(c => c.status === "COMPLETED").length,
      totalEmailsSent: totalSent,
      totalDelivered,
      totalOpens,
      totalClicks,
      deliveryRate,
      avgOpenRate,
      avgClickRate,
      successRate,
      activeContacts,
      monthlyChart: buildMonthlyChart(campaignsList),
    };

    if (!includePlatformAiStats) return base;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // All AI analytics scoped to 30 days — matches getDashboardStats in dbStorage
    const recentLogs = Array.from(store.aiUsageLogs.values()).filter(l => new Date(l.createdAt) >= thirtyDaysAgo);

    const totalCalls = recentLogs.length;
    const cachedCalls = recentLogs.filter(l => l.cached).length;
    const totalCostUsd = recentLogs.reduce((s, l) => s + Number(l.estimatedCostUsd), 0);

    const endpointMap = {};
    for (const l of recentLogs) {
      if (!endpointMap[l.endpoint]) {
        endpointMap[l.endpoint] = { totalCost: 0, totalCalls: 0, cacheHits: 0, latencySum: 0, latencyCount: 0 };
      }
      endpointMap[l.endpoint].totalCost += Number(l.estimatedCostUsd);
      endpointMap[l.endpoint].totalCalls++;
      if (l.cached) {
        endpointMap[l.endpoint].cacheHits++;
      } else if (l.latencyMs > 0) {
        endpointMap[l.endpoint].latencySum += l.latencyMs;
        endpointMap[l.endpoint].latencyCount++;
      }
    }

    const spenderMap = {};
    for (const l of recentLogs) {
      if (!spenderMap[l.userId]) spenderMap[l.userId] = { userId: l.userId, username: null, totalCost: 0, totalCalls: 0 };
      spenderMap[l.userId].totalCost += Number(l.estimatedCostUsd);
      spenderMap[l.userId].totalCalls++;
    }
    // Resolve usernames
    for (const s of Object.values(spenderMap)) {
      const user = store.users.get(s.userId);
      s.username = user?.username || s.userId;
    }
    const topSpenders = Object.values(spenderMap)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);

    return {
      ...base,
      aiStats: {
        totalAiCostUsd: totalCostUsd,
        aiCostLast30Days: totalCostUsd,
        totalAiCalls: totalCalls,
        cacheHitRate: totalCalls > 0 ? ((cachedCalls / totalCalls) * 100).toFixed(1) : "0.0",
        aiCostByEndpoint: Object.entries(endpointMap).map(([endpoint, v]) => ({
          endpoint,
          totalCost: v.totalCost,
          totalCalls: v.totalCalls,
          cacheHits: v.cacheHits,
          avgLatencyMs: v.latencyCount > 0 ? Math.round(v.latencySum / v.latencyCount) : null,
        })),
        topAiSpenders: topSpenders,
      },
    };
  },

  async getTeamStats(parentId) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const children = Array.from(store.users.values()).filter(u => u.parentId === parentId && u.isActive);
    const childIds = new Set(children.map(u => u.id));
    const teamCampaigns = Array.from(store.campaigns.values()).filter(c => childIds.has(c.userId));

    const activeUserIds = new Set(
      teamCampaigns
        .filter(c => new Date(c.createdAt) >= sevenDaysAgo)
        .map(c => c.userId)
    );

    return {
      totalTeamMembers:            children.length,
      activeThisWeek:              activeUserIds.size,
      totalTeamCampaigns:          teamCampaigns.length,
      totalTeamCreditsUsed:        children.reduce((s, u) => s + (u.creditsUsed || 0), 0),
      totalTeamAiGenerationsToday: children.reduce((s, u) => s + (u.aiGenerationsToday || 0), 0),
      creditsAllocatedToTeam:      children.reduce((s, u) => s + (u.creditsReceived || 0), 0),
      creditsRemainingInTeam:      children.reduce((s, u) => s + ((u.creditsReceived || 0) - (u.creditsAllocated || 0) - (u.creditsUsed || 0)), 0),
    };
  },

  async getUsersWithStats(parentId, isRootAdmin = false) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let userRows;
    if (isRootAdmin) {
      const rootId = await this.resolveWorkspaceRootId(parentId);
      const memberIds = await this.getWorkspaceMemberIds(rootId);
      memberIds.delete(rootId); // exclude the admin themselves — matches prior "children only" shape
      userRows = toSortedArray(store.users).filter(u => memberIds.has(u.id));
    } else {
      userRows = toSortedArray(store.users).filter(u => u.parentId === parentId);
    }

    if (userRows.length === 0) return [];

    const userIdSet = new Set(userRows.map(u => u.id));
    const teamCampaigns = Array.from(store.campaigns.values()).filter(c => userIdSet.has(c.userId));

    // Build per-user campaign stats in one pass
    const statsMap = {};
    for (const c of teamCampaigns) {
      if (!statsMap[c.userId]) statsMap[c.userId] = { total: 0, lastAt: null, activeRecently: false, runningReserved: 0 };
      statsMap[c.userId].total++;
      const cAt = new Date(c.createdAt);
      if (!statsMap[c.userId].lastAt || cAt > new Date(statsMap[c.userId].lastAt)) {
        statsMap[c.userId].lastAt = c.createdAt;
      }
      if (cAt >= sevenDaysAgo) statsMap[c.userId].activeRecently = true;
      if (c.status === "RUNNING") {
        statsMap[c.userId].runningReserved += Math.max(0, (c.totalEmails || 0) - (c.sentEmails || 0));
      }
    }

    const parentEffectivePlan = await this.getEffectivePlan(parentId);
    const now = Date.now();
    const reclaimAfterWarningMs = (INACTIVITY_THRESHOLDS.RECLAIM_ELIGIBLE_DAYS - INACTIVITY_THRESHOLDS.WARNING_DAYS) * 86400000;

    return userRows.map(u => {
      const s = statsMap[u.id] || {};
      const childPlan = (u.plan && u.plan !== "free") ? u.plan : parentEffectivePlan;
      const { passwordHash, ...safe } = u;
      const creditsRemaining = (u.creditsReceived || 0) - (u.creditsAllocated || 0) - (u.creditsUsed || 0);
      const runningReserved = s.runningReserved || 0;
      return {
        ...safe,
        creditsRemaining,
        safeReclaimable:    Math.max(0, creditsRemaining - runningReserved),
        totalCampaigns:     s.total || 0,
        lastCampaignAt:     s.lastAt || null,
        isActiveThisWeek:   s.activeRecently || false,
        aiGenerationsToday: u.aiGenerationsToday || 0,
        aiDailyLimit:       AI_DAILY_LIMITS[childPlan] ?? AI_DAILY_LIMITS.free,
        daysInactive:       Math.floor((now - new Date(u.lastActivityAt || u.createdAt).getTime()) / 86400000),
        isReclaimEligible:  Boolean(
                              u.inactivityWarningSentAt &&
                              u.inactivityKeepToken &&
                              new Date(u.inactivityWarningSentAt) < new Date(Date.now() - 60 * 86400000)
                            ),
      };
    });
  },

  // ==================== ADMIN INITIALIZATION ====================
  async initializeRootAdmin() {
    try {
      const adminUsername = process.env.ADMIN_USERNAME || "admin";
      const adminPassword = process.env.ADMIN_PASSWORD || "changeme123";
      const adminEmail = process.env.ADMIN_EMAIL || "admin@repmail.io";

      const existingAdmin = await this.getUserByUsername(adminUsername);
      if (existingAdmin) {
        console.log("[DEV MODE] Root admin already exists");
        return this.sanitizeUser(existingAdmin);
      }

      const admin = await this.createUser({
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
        role: USER_ROLES.ROOT_ADMIN,
        creditsReceived: 100000,
        mustResetPassword: true,
        isTrialUser: false,
        plan: "enterprise",
        emailVerified: true, // operator-provisioned bootstrap account — email is trusted
      });
      
      console.log("[DEV MODE] Root admin created - password reset required on first login");
      return admin;
    } catch (err) {
      console.error("[DEV MODE] Failed to initialize root admin:", err);
      return null;
    }
  },

  // ==================== PAYMENT OPERATIONS ====================
  async createPayment(paymentData) {
    const id = generateUUID();
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const payment = {
      id,
      userId: paymentData.userId,
      // M42 — CREDITS unless a seat checkout says otherwise, matching the column
      // default. Whitelisted explicitly here (unlike dbStorage, which spreads),
      // so a new payment field must be added deliberately in both backends.
      kind: paymentData.kind || PAYMENT_KIND.CREDITS,
      subscriptionId: paymentData.subscriptionId || null,
      planName: paymentData.planName,
      credits: paymentData.credits,
      amountMinor: paymentData.amountMinor ?? null,
      amountUsd: paymentData.amountUsd,
      amountInr: paymentData.amountInr,
      amountLocal: paymentData.amountLocal,
      currency: paymentData.currency || "USD",
      exchangeRate: paymentData.exchangeRate || null,
      status: paymentData.status || PAYMENT_STATUS.PENDING,
      paymentMethod: paymentData.paymentMethod || null,
      transactionId: null,
      invoiceNumber,
      invoiceUrl: null,
      metadata: paymentData.metadata || null,
      createdAt: new Date(),
      completedAt: null
    };
    
    store.payments.set(id, payment);
    
    await this.createAuditLog({
      userId: paymentData.userId,
      action: AUDIT_ACTIONS.PAYMENT_INITIATED,
      targetType: "payment",
      targetId: id,
      details: { 
        planName: paymentData.planName, 
        credits: paymentData.credits, 
        amountUsd: paymentData.amountUsd,
        amountLocal: paymentData.amountLocal,
        currency: paymentData.currency
      }
    });
    
    return payment;
  },

  // M42 parity — see storage.js getPendingSeatPayment.
  async getPendingSeatPayment(rootId) {
    const memberIds = await this.getWorkspaceMemberIds(rootId);
    const rows = Array.from(store.payments.values())
      .filter(p => memberIds.has(p.userId) && p.kind === PAYMENT_KIND.SEATS && p.status === PAYMENT_STATUS.PENDING)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return rows[0] || null;
  },

  // M42 parity — see storage.js updatePayment.
  async updatePayment(paymentId, { subscriptionId = undefined, metadata = undefined }) {
    const payment = store.payments.get(paymentId);
    if (!payment) return null;
    if (subscriptionId !== undefined) payment.subscriptionId = subscriptionId;
    if (metadata !== undefined) payment.metadata = metadata;
    return payment;
  },

  // M42 parity — see storage.js transitionPaymentToRefunded.
  async transitionPaymentToRefunded(paymentId, { providerRefundId = null, reason = "seat_refund" } = {}) {
    const payment = store.payments.get(paymentId);
    if (!payment) return { ok: false, error: "not_found" };
    if (payment.status === PAYMENT_STATUS.REFUNDED) return { ok: true, payment, alreadyRefunded: true };
    if (!canTransition(payment.status, PAYMENT_STATUS.REFUNDED)) {
      return { ok: false, error: "not_refundable", fromStatus: payment.status };
    }
    payment.status = PAYMENT_STATUS.REFUNDED;
    payment.metadata = { ...(payment.metadata || {}), refundedAt: new Date().toISOString(), refundReason: reason, providerRefundId };
    return { ok: true, payment };
  },

  // ADS-001 parity with storage.js — same `completionPath` diagnostic, same
  // `transitioned` race result. Kept identical deliberately: the M56 lesson was
  // an authorization test that passed against memoryStorage for the wrong
  // reason because the two backends behaved differently.
  async completePayment(paymentId, transactionId, { completionPath = null } = {}) {
    const payment = store.payments.get(paymentId);
    if (!payment) throw new Error("Payment not found");
    if (payment.status === PAYMENT_STATUS.SUCCESS) return { payment, credited: false, transitioned: false };

    // Update payment status
    payment.status = PAYMENT_STATUS.SUCCESS;
    payment.transactionId = transactionId;
    payment.completedAt = new Date();
    if (completionPath) {
      payment.metadata = { ...(payment.metadata || {}), completionPath };
    }

    // M42 parity with storage.js — a SEATS payment buys a service period, not
    // credits. No credit mutation, no credit_transactions row: seat money must
    // never enter the credit ledger. Entitlement is applied by fulfillSeats.
    if (payment.kind === PAYMENT_KIND.SEATS) {
      await this.createAuditLog({
        userId: payment.userId,
        action: AUDIT_ACTIONS.PAYMENT_SUCCESS,
        targetType: "payment",
        targetId: paymentId,
        details: { kind: payment.kind, transactionId, credits: 0 },
      });
      return { payment, credited: false, transitioned: true };
    }

    // Credit user account
    const user = store.users.get(payment.userId);
    const balanceBefore = user
      ? (user.creditsReceived || 0) - (user.creditsAllocated || 0) - (user.creditsUsed || 0)
      : 0;
    if (user) {
      user.creditsReceived += payment.credits;
      user.isTrialUser = false;
      user.updatedAt = new Date();
    }

    // Create credit transaction
    const txId = generateUUID();
    store.creditTransactions.set(txId, {
      id: txId,
      userId: payment.userId,
      type: "purchase",
      amount: payment.credits,
      balanceBefore,
      balanceAfter: balanceBefore + payment.credits,
      description: `Purchased ${payment.credits} credits - ${payment.planName}`,
      createdAt: new Date()
    });

    await this.createAuditLog({
      userId: payment.userId,
      action: AUDIT_ACTIONS.PAYMENT_SUCCESS,
      targetType: "payment",
      targetId: paymentId,
      details: { credits: payment.credits, transactionId }
    });

    return { payment, credited: true, transitioned: true };
  },

  // M39 Phase 2 — parity with dbStorage.cancelPayment. Previously missing here, so
  // POST /api/payments/:id/fail with { cancelled: true } threw in dev/in-memory.
  async cancelPayment(paymentId) {
    const payment = store.payments.get(paymentId);
    if (!payment) throw new Error("Payment not found");
    if (!canTransition(payment.status, PAYMENT_STATUS.CANCELLED)) return; // never downgrade a completed payment

    payment.status = PAYMENT_STATUS.CANCELLED;

    await this.createAuditLog({
      userId: payment.userId,
      action: AUDIT_ACTIONS.PAYMENT_CANCELLED,
      targetType: "payment",
      targetId: paymentId,
      details: { reason: "User cancelled" }
    });
  },

  async failPayment(paymentId, reason) {
    const payment = store.payments.get(paymentId);
    if (!payment) throw new Error("Payment not found");
    // M39 Phase 2 — never downgrade a completed (or otherwise terminal) payment.
    // Previously this set FAILED unconditionally, so a late payment.failed webhook
    // arriving after success could downgrade a paid payment in memory (a parity
    // defect vs the Postgres backend, which already guarded this).
    if (!canTransition(payment.status, PAYMENT_STATUS.FAILED)) return;

    payment.status = PAYMENT_STATUS.FAILED;

    await this.createAuditLog({
      userId: payment.userId,
      action: AUDIT_ACTIONS.PAYMENT_FAILED,
      targetType: "payment",
      targetId: paymentId,
      details: { reason }
    });
  },

  // M39 Phase 2 — refund lifecycle (D4 / MD-006), in parity with dbStorage.refundPayment.
  // Auto-reverse only when the balance can absorb the full clawback; otherwise flag
  // for manual operator review and leave the payment status untouched.
  //
  // Concurrency: this in-memory backend is safe BY CONSTRUCTION — the balance read
  // and the credit mutation below run with NO `await` between them, so in the
  // single-threaded event loop two concurrent refunds serialize (the first runs its
  // whole synchronous read→check→clawback before the second starts) and the balance
  // can never go negative. The Postgres backend gets the same guarantee via a
  // `SELECT … FOR UPDATE` row lock inside its transaction (see dbStorage.refundPayment).
  async refundPayment(paymentId, { reason = "operator_refund", actor = "system", providerRefundId = null } = {}) {
    const payment = store.payments.get(paymentId);
    if (!payment) throw new Error("Payment not found");

    // M42 parity — a seat payment granted no credits; see storage.js.
    if (payment.kind === PAYMENT_KIND.SEATS) {
      return { payment, refunded: false, error: "seat_payment_wrong_path", kind: payment.kind };
    }

    if (payment.status === PAYMENT_STATUS.REFUNDED) {
      return { payment, refunded: false, alreadyRefunded: true };
    }
    if (!canTransition(payment.status, PAYMENT_STATUS.REFUNDED)) {
      return { payment, refunded: false, error: "not_refundable", fromStatus: payment.status };
    }

    const user = store.users.get(payment.userId);
    const balanceBefore = user
      ? (user.creditsReceived || 0) - (user.creditsAllocated || 0) - (user.creditsUsed || 0)
      : 0;

    if (balanceBefore < payment.credits) {
      const shortfall = payment.credits - balanceBefore;
      payment.metadata = { ...(payment.metadata || {}), refundReview: true, refundReason: reason, refundShortfall: shortfall, providerRefundId };
      await this.createAuditLog({
        userId: payment.userId,
        action: AUDIT_ACTIONS.PAYMENT_REFUND_MANUAL_REVIEW,
        targetType: "payment",
        targetId: paymentId,
        details: { reason, actor, credits: payment.credits, creditsRemaining: balanceBefore, shortfall, providerRefundId },
      });
      return { payment, refunded: false, manualReview: true, shortfall };
    }

    payment.status = PAYMENT_STATUS.REFUNDED;
    payment.metadata = { ...(payment.metadata || {}), refundedAt: new Date().toISOString(), refundReason: reason, providerRefundId };
    if (user) {
      user.creditsReceived -= payment.credits;
      user.updatedAt = new Date();
    }

    const txId = generateUUID();
    store.creditTransactions.set(txId, {
      id: txId,
      userId: payment.userId,
      type: "refund",
      amount: -payment.credits,
      balanceBefore,
      balanceAfter: balanceBefore - payment.credits,
      description: `Refund for ${payment.invoiceNumber} (${payment.planName}) — ${reason}`,
      createdAt: new Date(),
    });

    await this.createAuditLog({
      userId: payment.userId,
      action: AUDIT_ACTIONS.PAYMENT_REFUNDED,
      targetType: "payment",
      targetId: paymentId,
      details: { credits: payment.credits, reason, actor, providerRefundId, balanceBefore, balanceAfter: balanceBefore - payment.credits },
    });

    return { payment, refunded: true };
  },

  async getPayment(id) {
    return store.payments.get(id) || null;
  },

  // M39 Phase 2 — parity with dbStorage; supports refund/dispute webhook reconciliation.
  async getPaymentByRazorpayOrderId(orderId) {
    if (!orderId) return null;
    for (const p of store.payments.values()) {
      if (p.metadata && p.metadata.razorpay_order_id === orderId) return p;
    }
    return null;
  },

  async getPaymentByTransactionId(transactionId) {
    if (!transactionId) return null;
    for (const p of store.payments.values()) {
      if (p.transactionId === transactionId) return p;
    }
    return null;
  },

  async getUserPayments(userId) {
    return toSortedArray(store.payments).filter(p => p.userId === userId);
  },

  // ==================== CONTACT SUBMISSION OPERATIONS ====================
  async createContactSubmission(data) {
    const id = generateUUID();
    const submission = {
      id,
      name: data.name,
      email: data.email,
      company: data.company || null,
      reason: data.reason,
      message: data.message,
      userId: data.userId || null,
      isRead: false,
      respondedAt: null,
      createdAt: new Date()
    };
    
    store.contactSubmissions.set(id, submission);
    
    await this.createAuditLog({
      userId: data.userId || null,
      action: AUDIT_ACTIONS.CONTACT_FORM_SUBMITTED,
      targetType: "contact_submission",
      targetId: id,
      details: { reason: data.reason, email: data.email }
    });
    
    return submission;
  },

  async getContactSubmissions(filters = {}) {
    let result = toSortedArray(store.contactSubmissions);
    if (filters.limit) {
      result = result.slice(0, filters.limit);
    }
    return result;
  },

  async markContactSubmissionRead(id) {
    const submission = store.contactSubmissions.get(id);
    if (submission) {
      submission.isRead = true;
    }
    return submission;
  },

  // ==================== WAITLIST OPERATIONS ====================
  async addToWaitlist(data) {
    // Check for duplicate email
    for (const entry of store.waitlist.values()) {
      if (entry.email.toLowerCase() === data.email.toLowerCase()) {
        throw new Error("DUPLICATE_EMAIL");
      }
    }
    
    const id = generateUUID();
    const entry = {
      id,
      email: data.email.toLowerCase().trim(),
      source: data.source || null,
      createdAt: new Date()
    };
    
    store.waitlist.set(id, entry);
    return entry;
  },

  async getWaitlistCount() {
    return store.waitlist.size;
  },

  async getWaitlistEntries(limit = 100) {
    return toSortedArray(store.waitlist).slice(0, limit);
  },

  // ==================== TRIAL CREDIT OPERATIONS ====================
  async getTrialCreditsRemaining(userId) {
    const user = store.users.get(userId);
    if (!user) return 0;
    return Math.max(0, (user.trialCredits || 5) - (user.trialCreditsUsed || 0));
  },

  async useTrialCredit(userId, campaignId) {
    const user = store.users.get(userId);
    if (!user) throw new Error("User not found");
    
    const remaining = (user.trialCredits || 5) - (user.trialCreditsUsed || 0);
    if (remaining <= 0) {
      throw new Error("No trial credits remaining");
    }
    
    user.trialCreditsUsed += 1;
    user.updatedAt = new Date();
    
    return remaining - 1;
  },

  async getTotalCreditsAvailable(userId) {
    const user = await this.getUserById(userId);
    if (!user) return { paid: 0, free: 0, trial: 0, total: 0, isTrialUser: false, isFreePlan: false };

    const freePlanEnabled = process.env.FREE_PLAN_ENABLED === "true";
    // TRUST-025 (M20-B): effectivePlan, not the raw column — mirrors storage.js.
    const effectivePlan = await this.getEffectivePlan(userId);
    const monthlyGrant = MONTHLY_CREDITS[effectivePlan] ?? 0;
    const paidRemaining = Math.max(0,
      (user.creditsReceived || 0) - (user.creditsAllocated || 0) - (user.creditsUsed || 0)
    );

    // M41-C — the free meter reflects the SHARED workspace pool (root row), so
    // every member sees the same remaining balance as the workspace owner.
    const poolHolder = await this._resolveFreePoolHolder(userId);

    let freeRemaining = 0;
    let isFreePlan = false;
    if (freePlanEnabled && !poolHolder.isTrialUser && monthlyGrant > 0) {
      isFreePlan = true;
      const resetAt = poolHolder.freeCreditsResetAt;
      const refDate = resetAt ? new Date(resetAt) : new Date(poolHolder.createdAt);
      const nextReset = new Date(refDate);
      nextReset.setUTCMonth(nextReset.getUTCMonth() + 1);
      const effectiveUsed = new Date() >= nextReset ? 0 : (poolHolder.freeCreditsUsed || 0);
      freeRemaining = Math.max(0, monthlyGrant - effectiveUsed);
    }

    const trialRemaining = (!freePlanEnabled && user.isTrialUser)
      ? Math.max(0, (user.trialCredits || 5) - (user.trialCreditsUsed || 0))
      : 0;

    // Next reset: 1 month rolling from the workspace's signup date (or last reset)
    const resetAt = poolHolder.freeCreditsResetAt;
    const refDate = resetAt ? new Date(resetAt) : new Date(poolHolder.createdAt);
    const nextResetDate = new Date(refDate);
    nextResetDate.setUTCMonth(nextResetDate.getUTCMonth() + 1);

    return {
      paid: paidRemaining,
      free: freeRemaining,
      trial: trialRemaining,
      total: paidRemaining + freeRemaining + trialRemaining,
      isTrialUser: user.isTrialUser,
      isFreePlan,
      freeResetDate: isFreePlan ? nextResetDate.toISOString() : null,
      monthlyFreeCredits: isFreePlan ? monthlyGrant : 0,
    };
  },

  // Mirrors storage.js exactly — walks the FULL ancestor chain (not just one
  // level) so a USER under a free-plan SUB_ADMIN still inherits the ROOT_ADMIN's
  // plan (GAP-6 fix, storage.js). The previous single-level version here only
  // checked the direct parent's raw plan, silently diverging from the real
  // Postgres backend's behavior whenever an intermediate ancestor's own .plan
  // was also "free" — a dev/test-only parity bug, never reachable in production.
  async getEffectivePlan(userId) {
    const visited = new Set();
    let currentId = userId;
    while (currentId) {
      if (visited.has(currentId)) break; // cycle guard
      visited.add(currentId);
      const user = store.users.get(currentId);
      if (!user) break;
      if (user.plan && user.plan !== "free") return user.plan;
      if (!user.parentId) break;
      currentId = user.parentId;
    }
    return "free";
  },

  // ── Workspace resolution (tenant-isolation fix) — mirrors storage.js ───────
  async resolveWorkspaceRootId(userId) {
    const visited = new Set();
    let currentId = userId;
    let current = store.users.get(currentId);
    while (current) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      if (!current.parentId) return current.id;
      current = store.users.get(current.parentId);
    }
    return userId;
  },

  async getWorkspaceMemberIds(rootId) {
    const level1Ids = [];
    for (const u of store.users.values()) {
      if (u.parentId === rootId) level1Ids.push(u.id);
    }
    const level1Set = new Set(level1Ids);
    const level2Ids = [];
    for (const u of store.users.values()) {
      if (u.parentId && level1Set.has(u.parentId)) level2Ids.push(u.id);
    }
    return new Set([rootId, ...level1Ids, ...level2Ids]);
  },

  async getActiveWorkspaceMemberCount(rootId) {
    const memberIds = await this.getWorkspaceMemberIds(rootId);
    memberIds.delete(rootId);
    let count = 0;
    for (const id of memberIds) {
      const u = store.users.get(id);
      if (u && u.isActive) count++;
    }
    return count;
  },

  // Mirrors storage.js's claimWorkspaceSeat. writeFn (createUser) contains a
  // real await (bcrypt.hash), which yields the event loop between the count
  // check and the write completing — so a naive check-then-write here would
  // NOT actually be safe against concurrent calls for the same workspace,
  // despite JS being single-threaded (interleaving, not parallelism, is the
  // hazard). A simple per-rootId promise-chain lock closes that gap without
  // needing a real transaction primitive, which this backend has none of.
  async claimWorkspaceSeat(rootId, limit, writeFn) {
    const prior = _seatLocks.get(rootId) || Promise.resolve();
    const gate = prior.then(() => _claimWorkspaceSeatUnlocked(this, rootId, limit, writeFn));
    // Chain the next caller behind this one regardless of outcome, but never
    // propagate a rejection into the lock chain itself (that would jam every
    // subsequent claim for this workspace forever).
    _seatLocks.set(rootId, gate.catch(() => {}));
    return gate;
  },

  async reactivateUserInTx(_tx, id) {
    const user = store.users.get(id);
    if (user) {
      user.isActive = true;
      user.updatedAt = new Date();
    }
  },

  // ── M42 — seat commerce (parity with storage.js) ──────────────────────────
  // Same shared decision modules, same target-state idempotency, same lock
  // discipline (the per-workspace promise-chain lock standing in for FOR UPDATE).

  async getWorkspaceSubscription(rootId, _tx = null) {
    for (const sub of store.workspaceSubscriptions.values()) {
      if (sub.workspaceRootId === rootId && isEntitling(sub.status)) return sub;
    }
    return null;
  },

  async getSeatCommerceConfig() {
    const enabled = await this.getPlatformSetting(SEAT_SETTING_KEYS.BILLING_ENABLED);
    const floor = await this.getPlatformSetting(SEAT_SETTING_KEYS.FREE_FLOOR);
    const activatedAt = await this.getPlatformSetting(SEAT_SETTING_KEYS.ACTIVATED_AT);
    const grandfatherUntil = await this.getPlatformSetting(SEAT_SETTING_KEYS.GRANDFATHER_UNTIL);
    const billingEnabled = enabled?.value === "true";
    let activated = parseTimestampSetting(activatedAt?.value);
    // M47 — parity with storage.js: the system stamps the activation anchor the
    // first time billing is observed enabled, so no operator ordering is required.
    if (billingEnabled && !activated) {
      activated = new Date();
      try {
        await this.setPlatformSetting(SEAT_SETTING_KEYS.ACTIVATED_AT, activated.toISOString());
      } catch (err) {
        console.error("[SEATS] could not stamp the activation timestamp:", err.message);
      }
    }
    return {
      billingEnabled,
      freeFloor: parseFreeFloor(floor?.value),
      // M45 migration window. Unset = mechanism off; the free floor governs alone.
      activatedAt: activated,
      grandfatherUntil: parseTimestampSetting(grandfatherUntil?.value),
    };
  },

  async resolveSeatEntitlement(rootId) {
    const config = await this.getSeatCommerceConfig();
    const effectivePlan = await this.getEffectivePlan(rootId);
    // M45 — parity with storage.js: legacy protection reads the root's createdAt.
    const root = await this.getUserById(rootId);
    // Parity with storage.js: no subscription read while the flag is off.
    const subscription = config.billingEnabled ? await this.getWorkspaceSubscription(rootId) : null;
    return {
      ...resolveSeatEntitlement({
        subscription, effectivePlan, ...config, workspaceCreatedAt: root?.createdAt ?? null, role: root?.role,
      }),
      subscription, effectivePlan, config,
    };
  },

  async resolveSeatLimitInTx(_tx, rootId) {
    const config = await this.getSeatCommerceConfig();
    const effectivePlan = await this.getEffectivePlan(rootId);
    const root = await this.getUserById(rootId);
    // Parity with storage.js: no subscription read while the flag is off.
    const subscription = config.billingEnabled ? await this.getWorkspaceSubscription(rootId) : null;
    return resolveSeatEntitlement({
      subscription, effectivePlan, ...config, workspaceCreatedAt: root?.createdAt ?? null, role: root?.role,
    }).seats;
  },

  async applySeatPurchase(rootId, { seats, term, pricingVersion, currency = "INR", region = "IN",
    unitPriceOverrideMinor = null, couponCode = null, renewalAmountMinor = 0, paymentId = null, now = new Date() }) {
    const existing = await this.getWorkspaceSubscription(rootId);
    if (existing) {
      if (seats <= existing.seats && existing.status === SUBSCRIPTION_STATUS.ACTIVE) {
        return { subscription: existing, changed: false, created: false };
      }
      const previousSeats = existing.seats;
      const nextSeats = Math.max(seats, existing.seats);
      // Parity with storage.js: an immediate upgrade supersedes a pending
      // downgrade to a smaller number, or the customer pays to grow and shrinks
      // at renewal.
      const supersededScheduledSeats =
        existing.scheduledSeats != null && existing.scheduledSeats < nextSeats ? existing.scheduledSeats : null;
      if (supersededScheduledSeats != null) existing.scheduledSeats = null;
      existing.seats = nextSeats;
      existing.renewalAmountMinor = renewalAmountMinor;
      existing.lastPaymentId = paymentId || existing.lastPaymentId;
      existing.status = SUBSCRIPTION_STATUS.ACTIVE;
      existing.dunningAttempts = 0;
      existing.firstFailureAt = null;
      existing.graceEndsAt = null;
      existing.updatedAt = now;
      return { subscription: existing, changed: true, created: false, previousSeats, supersededScheduledSeats };
    }
    // M52 parity with storage.js — the anniversary is recorded at purchase.
    const anchorDay = anchorDayFor(now);
    const period = periodFor(now, term, anchorDay);
    const sub = {
      id: generateUUID(),
      workspaceRootId: rootId,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      seats, term, pricingVersion, currency, region,
      unitPriceOverrideMinor, couponCode, renewalAmountMinor,
      periodStart: period.start, periodEnd: period.end,
      billingAnchorDay: anchorDay,
      scheduledSeats: null, scheduledTerm: null,
      cancelAtPeriodEnd: false,
      grandfatheredSeats: 0, grandfatheredUntil: null,
      dunningAttempts: 0, firstFailureAt: null, graceEndsAt: null,
      // M51 — a new subscription is born MANUAL. AutoPay is opted into
      // afterwards (or during checkout), never inherited: a customer who bought
      // seats has not thereby authorised us to debit them again.
      autopayEnabled: false, mandateId: null, autopayAuthRequiredAt: null,
      predebitNoticeSentAt: null, predebitNoticePeriodEnd: null, lastChargeError: null,
      lastPaymentId: paymentId,
      activatedAt: now, createdAt: now, updatedAt: now, endedAt: null,
    };
    store.workspaceSubscriptions.set(sub.id, sub);
    return { subscription: sub, changed: true, created: true, previousSeats: 0 };
  },

  async scheduleSeatChange(rootId, { seats = null, term = null, renewalAmountMinor = null, now = new Date() }) {
    const existing = await this.getWorkspaceSubscription(rootId);
    if (!existing) return null;
    if (seats != null) existing.scheduledSeats = seats;
    if (term != null) existing.scheduledTerm = term;
    if (renewalAmountMinor != null) existing.renewalAmountMinor = renewalAmountMinor;
    existing.updatedAt = now;
    return existing;
  },

  async transitionSubscription(subscriptionId, toStatus, patch = {}) {
    const current = store.workspaceSubscriptions.get(subscriptionId);
    if (!current) return { ok: false, error: "not_found" };
    if (current.status === toStatus) {
      // Parity with storage.js: a same-status call carrying a patch still writes
      // it; `noop` means the STATUS did not change, not that nothing happened.
      if (Object.keys(patch).length === 0) return { ok: true, subscription: current, noop: true };
      Object.assign(current, patch, { updatedAt: new Date() });
      return { ok: true, subscription: current, noop: true };
    }
    if (!canSubscriptionTransition(current.status, toStatus)) {
      return { ok: false, error: "illegal_transition", from: current.status, to: toStatus };
    }
    Object.assign(current, patch, { status: toStatus, updatedAt: new Date() });
    return { ok: true, subscription: current };
  },

  // Parity with storage.js, including the M51 period fence. See the comment there
  // for why `expectedPeriodEnd` is what makes exactly one of five possible
  // renewal actors win a period.
  async renewSubscription(subscriptionId, { paymentId = null, now = new Date(), expectedPeriodEnd = null } = {}) {
    const current = store.workspaceSubscriptions.get(subscriptionId);
    if (!current) return { ok: false, error: "not_found" };
    if (!isEntitling(current.status)) return { ok: false, error: "not_renewable", status: current.status };

    if (expectedPeriodEnd != null
      && new Date(current.periodEnd).getTime() !== new Date(expectedPeriodEnd).getTime()) {
      return {
        ok: false, error: "stale_period",
        expectedPeriodEnd: new Date(expectedPeriodEnd), actualPeriodEnd: current.periodEnd,
      };
    }

    const term = current.scheduledTerm || current.term;
    const seats = current.scheduledSeats == null ? current.seats : current.scheduledSeats;
    // M52 parity with storage.js — restore the original anniversary day where the
    // target month allows; a null anchor is exactly the pre-M52 arithmetic.
    const period = periodFor(current.periodEnd, term, current.billingAnchorDay ?? null);
    const quote = quoteSeats({ seats, term, region: current.region, unitPriceOverrideMinor: current.unitPriceOverrideMinor });
    const appliedScheduledChange = current.scheduledSeats != null || current.scheduledTerm != null;

    Object.assign(current, {
      status: SUBSCRIPTION_STATUS.ACTIVE,
      seats, term,
      pricingVersion: quote.error ? current.pricingVersion : quote.version,
      renewalAmountMinor: quote.error ? current.renewalAmountMinor : quote.totalMinor,
      periodStart: period.start, periodEnd: period.end,
      scheduledSeats: null, scheduledTerm: null,
      dunningAttempts: 0, firstFailureAt: null, graceEndsAt: null,
      lastPaymentId: paymentId || current.lastPaymentId,
      updatedAt: now,
    });
    return { ok: true, subscription: current, appliedScheduledChange };
  },

  async getSubscriptionsDue(before = new Date(), limit = 100) {
    return Array.from(store.workspaceSubscriptions.values())
      .filter(s => isEntitling(s.status) && new Date(s.periodEnd) < new Date(before))
      .sort((a, b) => new Date(a.periodEnd) - new Date(b.periodEnd))
      .slice(0, limit);
  },

  // Parity with storage.js — the look-ahead the pre-debit notice needs.
  async getSubscriptionsUpcoming(from, to, limit = 100) {
    return Array.from(store.workspaceSubscriptions.values())
      .filter(s => isEntitling(s.status)
        && new Date(s.periodEnd) >= new Date(from)
        && new Date(s.periodEnd) < new Date(to))
      .sort((a, b) => new Date(a.periodEnd) - new Date(b.periodEnd))
      .slice(0, limit);
  },

  // Parity with storage.js: an atomic claim, so two sweeps cannot both notify.
  async claimPredebitNotice(subscriptionId, periodEnd, { now = new Date() } = {}) {
    const sub = store.workspaceSubscriptions.get(subscriptionId);
    if (!sub) return { claimed: false, subscription: null };
    const already = sub.predebitNoticePeriodEnd
      && new Date(sub.predebitNoticePeriodEnd).getTime() === new Date(periodEnd).getTime();
    if (already) return { claimed: false, subscription: sub };
    Object.assign(sub, {
      predebitNoticeSentAt: now,
      predebitNoticePeriodEnd: new Date(periodEnd),
      updatedAt: now,
    });
    return { claimed: true, subscription: sub };
  },

  async getStalePendingSeatPayments(olderThan, limit = 100) {
    return Array.from(store.payments.values())
      .filter(p => p.kind === PAYMENT_KIND.SEATS
        && p.status === PAYMENT_STATUS.PENDING
        && new Date(p.createdAt) < new Date(olderThan))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(0, limit);
  },

  // ── M51 AutoPay mandates ───────────────────────────────────────────────────
  // Mirrors storage.js method-for-method. Both backends call the SAME shared
  // authority (shared/autopay.js) for every decision, so parity is structural
  // rather than maintained by hand.

  async createMandate({
    workspaceRootId, method, provider = DEFAULT_PAYMENT_PROVIDER,
    providerCustomerId = null, providerTokenId = null,
    maxAmountMinor = null, expiresAt = null, instrumentLabel = null,
    status = MANDATE_STATUS.PENDING,
  }) {
    // Mirrors the `payment_mandates_provider_token_uq` partial unique index: one
    // local row per gateway token PER PROVIDER, so a redelivered token webhook
    // cannot create a second mandate for the same bank authorisation.
    if (providerTokenId) {
      const existing = Array.from(store.paymentMandates.values())
        .find(m => m.provider === provider && m.providerTokenId === providerTokenId);
      if (existing) return existing;
    }
    const now = new Date();
    const mandate = {
      id: generateUUID(),
      workspaceRootId, method, status, provider,
      providerCustomerId, providerTokenId, maxAmountMinor,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      instrumentLabel, pausedUntil: null, lastError: null,
      createdAt: now, updatedAt: now, confirmedAt: null, revokedAt: null,
    };
    store.paymentMandates.set(mandate.id, mandate);
    return mandate;
  },

  async getMandate(id) {
    if (!id) return null;
    return store.paymentMandates.get(id) || null;
  },

  async getMandateByToken(providerTokenId, provider = DEFAULT_PAYMENT_PROVIDER) {
    if (!providerTokenId) return null;
    return Array.from(store.paymentMandates.values())
      .find(m => m.provider === provider && m.providerTokenId === providerTokenId) || null;
  },

  async getWorkspaceMandates(rootId) {
    return Array.from(store.paymentMandates.values())
      .filter(m => m.workspaceRootId === rootId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async updateMandate(id, patch = {}) {
    const current = store.paymentMandates.get(id);
    if (!current) return null;
    const allowed = {};
    for (const k of ["providerCustomerId", "providerTokenId", "maxAmountMinor",
      "expiresAt", "instrumentLabel", "pausedUntil", "lastError"]) {
      if (patch[k] !== undefined) allowed[k] = patch[k];
    }
    if (Object.keys(allowed).length === 0) return current;
    Object.assign(current, allowed, { updatedAt: new Date() });
    return current;
  },

  async transitionMandate(id, toStatus, patch = {}) {
    const current = store.paymentMandates.get(id);
    if (!current) return { ok: false, error: "not_found" };

    if (current.status === toStatus) {
      if (Object.keys(patch).length === 0) return { ok: true, mandate: current, noop: true };
      Object.assign(current, patch, { updatedAt: new Date() });
      return { ok: true, mandate: current, noop: true };
    }

    if (!canMandateTransition(current.status, toStatus)) {
      return { ok: false, error: "illegal_transition", from: current.status, to: toStatus };
    }

    const stamps = {};
    if (toStatus === MANDATE_STATUS.ACTIVE && !current.confirmedAt) stamps.confirmedAt = new Date();
    if (toStatus === MANDATE_STATUS.REVOKED) stamps.revokedAt = new Date();
    if (current.status === MANDATE_STATUS.PAUSED) stamps.pausedUntil = null;

    Object.assign(current, patch, stamps, { status: toStatus, updatedAt: new Date() });
    return { ok: true, mandate: current };
  },

  async getExpiringMandates(before, limit = 100) {
    return Array.from(store.paymentMandates.values())
      .filter(m => m.status === MANDATE_STATUS.ACTIVE
        && m.expiresAt && new Date(m.expiresAt) < new Date(before))
      .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt))
      .slice(0, limit);
  },

  // M58 / IDENT-008 — parity with storage.js. Same three conditions, same
  // oldest-first order: REVOKED locally, a token still held at the provider, and
  // the marker `revokeMandate` leaves when the withdrawal call did not succeed.
  async getMandatesPendingGatewayRevocation(limit = 100) {
    return Array.from(store.paymentMandates.values())
      .filter(m => m.status === MANDATE_STATUS.REVOKED
        && m.providerTokenId
        && typeof m.lastError === "string"
        && m.lastError.startsWith(GATEWAY_REVOKE_PENDING))
      .sort((a, b) => new Date(a.revokedAt || 0) - new Date(b.revokedAt || 0))
      .slice(0, limit);
  },

  async bindMandateToSubscription(subscriptionId, mandateId) {
    const sub = store.workspaceSubscriptions.get(subscriptionId);
    if (!sub) return { ok: false, error: "subscription_not_found" };
    const mandate = store.paymentMandates.get(mandateId);
    if (!mandate) return { ok: false, error: "mandate_not_found" };
    if (mandate.workspaceRootId !== sub.workspaceRootId) {
      return { ok: false, error: "mandate_workspace_mismatch" };
    }
    if (mandate.status !== MANDATE_STATUS.ACTIVE) {
      return { ok: false, error: "mandate_not_active", status: mandate.status };
    }

    const previousMandateId = sub.mandateId ?? null;
    Object.assign(sub, {
      mandateId, autopayEnabled: true,
      autopayAuthRequiredAt: null, lastChargeError: null,
      updatedAt: new Date(),
    });
    return { ok: true, subscription: sub, previousMandateId, replaced: previousMandateId !== null };
  },

  async setAutopayEnabled(subscriptionId, enabled) {
    const sub = store.workspaceSubscriptions.get(subscriptionId);
    if (!sub) return { ok: false, error: "not_found" };
    Object.assign(sub, {
      autopayEnabled: !!enabled,
      ...(enabled ? {} : { autopayAuthRequiredAt: null }),
      updatedAt: new Date(),
    });
    return { ok: true, subscription: sub };
  },

  async disableAutopayForMandate(mandateId) {
    const affected = [];
    for (const sub of store.workspaceSubscriptions.values()) {
      if (sub.mandateId === mandateId && sub.autopayEnabled) {
        Object.assign(sub, { autopayEnabled: false, autopayAuthRequiredAt: null, updatedAt: new Date() });
        affected.push(sub.id);
      }
    }
    return { affected, count: affected.length };
  },

  // ── M51 Phase 5.3 — webhook event ledger (parity with storage.js) ─────────
  // Keyed on `${provider}:${eventId}`, which is the in-memory equivalent of the
  // (provider, event_id) unique index.

  async recordWebhookEvent({ eventId, eventType = null, provider = DEFAULT_PAYMENT_PROVIDER }) {
    if (!eventId) return { duplicate: false, recorded: false, reason: "no_event_id" };
    const key = `${provider}:${eventId}`;
    const existing = store.webhookEvents.get(key);
    if (existing) {
      return { duplicate: true, recorded: true, previousOutcome: existing.outcome ?? null };
    }
    store.webhookEvents.set(key, {
      id: generateUUID(), provider, eventId, eventType,
      outcome: null, receivedAt: new Date(), processedAt: null,
    });
    return { duplicate: false, recorded: true };
  },

  async markWebhookEventProcessed(eventId, outcome, provider = DEFAULT_PAYMENT_PROVIDER) {
    if (!eventId) return false;
    const row = store.webhookEvents.get(`${provider}:${eventId}`);
    if (!row) return false;
    Object.assign(row, { outcome, processedAt: new Date() });
    return true;
  },

  async getWebhookEvent(eventId, provider = DEFAULT_PAYMENT_PROVIDER) {
    if (!eventId) return null;
    return store.webhookEvents.get(`${provider}:${eventId}`) || null;
  },

  async getAutopayConfig() {
    const scope = await this.getPlatformSetting(AUTOPAY_SETTING_KEYS.SCOPE);
    const allowlist = await this.getPlatformSetting(AUTOPAY_SETTING_KEYS.ALLOWLIST);
    const limitPct = await this.getPlatformSetting(AUTOPAY_SETTING_KEYS.LIMIT_PCT);
    return {
      scope: parseAutopayScope(scope?.value),
      allowlist: parseAutopayAllowlist(allowlist?.value),
      limitPct: parseAutopayLimitPct(limitPct?.value),
    };
  },

  async enforceSeatOverage(rootId, entitledSeats, { now = new Date() } = {}) {
    if (entitledSeats === Infinity) return { deactivated: [] };
    const memberIds = await this.getWorkspaceMemberIds(rootId);
    memberIds.delete(rootId);
    const members = [...memberIds]
      .map(id => store.users.get(id))
      .filter(u => u && u.isActive)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const excess = members.length - entitledSeats;
    if (excess <= 0) return { deactivated: [] };
    const toDeactivate = members.slice(members.length - excess);
    for (const u of toDeactivate) { u.isActive = false; u.updatedAt = now; }
    return { deactivated: toDeactivate.map(u => u.id) };
  },

  async transferWorkspaceOwnership(currentOwnerId, newOwnerId) {
    const owner = store.users.get(currentOwnerId);
    const next = store.users.get(newOwnerId);
    if (!owner || !next) return { ok: false, error: "not_found" };
    if (owner.parentId != null) return { ok: false, error: "not_owner" };
    if (!next.isActive) return { ok: false, error: "target_inactive" };
    const memberIds = await this.getWorkspaceMemberIds(currentOwnerId);
    if (!memberIds.has(newOwnerId)) return { ok: false, error: "not_a_member" };

    for (const u of store.users.values()) {
      if (u.parentId === newOwnerId) { u.parentId = currentOwnerId; u.updatedAt = new Date(); }
    }
    next.parentId = null;
    next.plan = owner.plan;
    next.updatedAt = new Date();
    owner.parentId = newOwnerId;
    owner.updatedAt = new Date();
    // Parity with storage.js (M56 Phase C): the workspace's sending identity
    // follows the root. Workspace-scoped domain reads resolve `userId == rootId`,
    // so leaving these behind stripped the workspace of its verified domain and
    // broke every member's sending.
    // `_senderDomains` is lazily created by createSenderDomain; every other
    // reader in this file guards for that, and so must this one.
    for (const d of (this._senderDomains?.values() ?? [])) {
      if (d.userId === currentOwnerId) { d.userId = newOwnerId; d.updatedAt = new Date(); }
    }
    // Parity with storage.js: the subscription follows the workspace, but AUTOPAY
    // DOES NOT (M51 D-M51-07, defect 7.1). A mandate is a personal banking
    // authorisation; left alone the departed owner's card would be debited
    // indefinitely for a workspace they no longer own. `mandateId` is cleared
    // (not merely disabled) because the instrument label belongs to a different
    // person and the incoming owner must not see it.
    for (const sub of store.workspaceSubscriptions.values()) {
      if (sub.workspaceRootId === currentOwnerId) {
        Object.assign(sub, {
          workspaceRootId: newOwnerId,
          autopayEnabled: false, mandateId: null, autopayAuthRequiredAt: null,
          updatedAt: new Date(),
        });
      }
    }
    const revokedMandateIds = [];
    for (const m of store.paymentMandates.values()) {
      if (m.workspaceRootId === currentOwnerId
        && [MANDATE_STATUS.PENDING, MANDATE_STATUS.ACTIVE, MANDATE_STATUS.PAUSED].includes(m.status)) {
        Object.assign(m, { status: MANDATE_STATUS.REVOKED, revokedAt: new Date(), updatedAt: new Date() });
        revokedMandateIds.push(m.id);
      }
    }
    return { ok: true, previousOwnerId: currentOwnerId, newOwnerId, revokedMandateIds };
  },

  async checkAndIncrementAiQuota(userId) {
    const effectivePlan = await this.getEffectivePlan(userId);
    const limit = AI_DAILY_LIMITS[effectivePlan] ?? AI_DAILY_LIMITS.free;
    if (limit === Infinity) return { allowed: true, remaining: Infinity, resetsAt: null };

    const user = store.users.get(userId);
    if (!user) throw new Error("User not found");

    const now = new Date();
    const needsReset = !user.aiGenerationsResetAt ||
      (now.getTime() - new Date(user.aiGenerationsResetAt).getTime()) > 24 * 60 * 60 * 1000;

    const currentCount = needsReset ? 0 : (user.aiGenerationsToday || 0);
    const windowStart = needsReset ? now : new Date(user.aiGenerationsResetAt);
    const resetsAt = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);

    if (currentCount >= limit) {
      return { allowed: false, remaining: 0, resetsAt };
    }

    user.aiGenerationsToday = currentCount + 1;
    if (needsReset) user.aiGenerationsResetAt = now;
    user.updatedAt = now;

    return { allowed: true, remaining: limit - currentCount - 1, resetsAt };
  },

  async refundAiQuota(userId) {
    const user = store.users.get(userId);
    if (!user) return;
    user.aiGenerationsToday = Math.max((user.aiGenerationsToday || 0) - 1, 0);
    user.updatedAt = new Date();
  },

  // ── Campaign Emails ────────────────────────────────────────────────────────

  async createCampaignEmail(data) {
    const id = generateUUID();
    const record = {
      id,
      campaignId: data.campaignId,
      userId: data.userId,
      contactId: data.contactId || null,
      recipientEmail: data.recipientEmail,
      sesMessageId: null,
      status: data.status || CAMPAIGN_EMAIL_STATUS.PENDING,
      failureReason: null,
      sentAt: null,
      openedAt: null,
      clickedAt: null,
      createdAt: new Date(),
    };
    store.campaignEmails.set(id, record);
    return record;
  },

  // PAR-TRUST-017 §7.1 — mirrors storage.js's claimCampaignEmail exactly: only a
  // FAILED row with a transient (non-permanent) reason is reclaimable, never a
  // PENDING one. A concurrency test caught the reason directly: reclaiming
  // PENDING→PENDING is a no-op transition, so it provides no exclusion at all —
  // every concurrent claimant would "win" the same row. FAILED→PENDING is a
  // genuine value change, so whichever call reaches it first correctly excludes
  // every other one. A PENDING row is either actively held by whoever claimed it
  // (must not be touched) or orphaned from a dead process, in which case
  // finalizeCampaign's orphan cleanup (§7.3) converts it to
  // FAILED("campaign_terminated") once the campaign finalizes, making it
  // legitimately reclaimable afterward.
  async claimCampaignEmail(data) {
    for (const record of store.campaignEmails.values()) {
      if (record.campaignId !== data.campaignId) continue;
      const sameContact = data.contactId != null && record.contactId === data.contactId;
      const sameRecipient = data.contactId == null && record.contactId == null && record.recipientEmail === data.recipientEmail;
      if (!sameContact && !sameRecipient) continue;

      const isReclaimable = record.status === CAMPAIGN_EMAIL_STATUS.FAILED
        && (!record.failureReason || !PERMANENT_FAILURE_REASONS.includes(record.failureReason));
      if (!isReclaimable) return null; // PENDING (held or orphaned) or terminal — already claimed

      record.status = CAMPAIGN_EMAIL_STATUS.PENDING;
      record.failureReason = null;
      return record;
    }
    return await this.createCampaignEmail(data);
  },

  async updateCampaignEmail(id, updates) {
    const record = store.campaignEmails.get(id);
    if (!record) return null;
    Object.assign(record, updates);
    return record;
  },

  async getCampaignEmailBySesMessageId(sesMessageId) {
    for (const record of store.campaignEmails.values()) {
      if (record.sesMessageId === sesMessageId) return record;
    }
    return null;
  },

  async getCampaignEmailsByCampaign(campaignId, limit = 50) {
    return toSortedArray(store.campaignEmails)
      .filter(r => r.campaignId === campaignId)
      .slice(0, limit);
  },

  async getCampaignEmailByContact(campaignId, contactId) {
    for (const record of store.campaignEmails.values()) {
      if (record.campaignId === campaignId && record.contactId === contactId) return record;
    }
    return null;
  },

  async hasAnySentEmails(campaignId) {
    for (const record of store.campaignEmails.values()) {
      if (record.campaignId === campaignId && record.status === CAMPAIGN_EMAIL_STATUS.SENT) return true;
    }
    return false;
  },

  // Mirrors storage.js — see its comment for why this check exists.
  async hasOutstandingClaims(campaignId) {
    for (const record of store.campaignEmails.values()) {
      if (record.campaignId === campaignId && record.status === CAMPAIGN_EMAIL_STATUS.PENDING) return true;
    }
    return false;
  },

  // ── Suppressions ───────────────────────────────────────────────────────────

  async addSuppression(userId, email, source, reason = null) {
    const normalizedEmail = email.toLowerCase().trim();
    // idempotent — one suppression per (userId, email) regardless of source
    for (const record of store.suppressions.values()) {
      if (record.userId === userId && record.email === normalizedEmail) return;
    }
    const id = generateUUID();
    store.suppressions.set(id, { id, userId, email: normalizedEmail, source, reason, createdAt: new Date() });
    console.log(`[SUPPRESSION] userId=${userId} email=${normalizedEmail} source=${source}`);
  },

  async isSuppressed(userId, email) {
    const normalizedEmail = email.toLowerCase().trim();
    for (const record of store.suppressions.values()) {
      if (record.userId === userId && record.email === normalizedEmail) return true;
    }
    return false;
  },

  async getSuppressions(userId) {
    return toSortedArray(store.suppressions).filter(r => r.userId === userId);
  },

  async deleteSuppression(id, userId) {
    const record = store.suppressions.get(id);
    if (!record || record.userId !== userId) return null;
    store.suppressions.delete(id);
    return record;
  },

  async isGloballySuppressed(email) {
    const normalizedEmail = email.toLowerCase().trim();
    for (const record of store.suppressions.values()) {
      if (record.email === normalizedEmail) return true;
    }
    return false;
  },

  async getPreCampaignSuppressionCount(emails) {
    if (!emails || emails.length === 0) return 0;
    const normalizedSet = new Set(emails.map(e => e.toLowerCase().trim()));
    const found = new Set();
    for (const record of store.suppressions.values()) {
      if (normalizedSet.has(record.email)) found.add(record.email);
    }
    return found.size;
  },

  async getSuppressionRecord(userId, email) {
    const normalizedEmail = email.toLowerCase().trim();
    let fallback = null;
    for (const record of store.suppressions.values()) {
      if (record.email !== normalizedEmail) continue;
      if (record.userId === userId) return { source: record.source, reason: record.reason, createdAt: record.createdAt };
      if (!fallback) fallback = { source: record.source, reason: record.reason, createdAt: record.createdAt };
    }
    return fallback;
  },

  async getSuppressionDetailsForEmails(campaignUserId, emails) {
    if (!emails || emails.length === 0) return new Map();
    const normalizedSet = new Set(emails.map(e => e.toLowerCase().trim()));
    const byEmail = new Map();
    for (const record of store.suppressions.values()) {
      if (!normalizedSet.has(record.email)) continue;
      const existing = byEmail.get(record.email);
      if (!existing || record.userId === campaignUserId) {
        byEmail.set(record.email, {
          source:       record.source,
          reason:       record.reason,
          suppressedAt: record.createdAt,
          scope:        record.userId === campaignUserId ? "user" : "global",
        });
      }
    }
    return byEmail;
  },

  // ── SNS event deduplication ────────────────────────────────────────────────

  async getSnsEvent(messageId) {
    return store.snsEvents.get(messageId) || null;
  },

  async createSnsEvent(messageId, eventType) {
    if (store.snsEvents.has(messageId)) return false;
    store.snsEvents.set(messageId, { messageId, eventType, processedAt: new Date(), processed: false });
    return true;
  },

  async updateSnsEventProcessed(messageId) {
    const record = store.snsEvents.get(messageId);
    if (record) record.processed = true;
  },

  async deleteOldSnsEvents() {
    const cutoff = new Date(Date.now() - 7 * 86400000);
    for (const [id, record] of store.snsEvents) {
      if (record.processedAt < cutoff) store.snsEvents.delete(id);
    }
  },

  async incrementCampaignBounced(campaignId) {
    const campaign = store.campaigns.get(campaignId);
    if (campaign) campaign.bouncedEmails = (campaign.bouncedEmails || 0) + 1;
  },

  async incrementCampaignComplained(campaignId) {
    const campaign = store.campaigns.get(campaignId);
    if (campaign) campaign.complainedEmails = (campaign.complainedEmails || 0) + 1;
  },

  async getCampaignEmailById(id) {
    return store.campaignEmails.get(id) || null;
  },

  async updateCampaignEmailOpened(campaignEmailId) {
    const record = store.campaignEmails.get(campaignEmailId);
    if (!record || record.openedAt != null) return { wasFirst: false };
    record.openedAt = new Date();
    return { wasFirst: true };
  },

  async updateCampaignEmailClicked(campaignEmailId) {
    const record = store.campaignEmails.get(campaignEmailId);
    if (!record || record.clickedAt != null) return { wasFirst: false };
    record.clickedAt = new Date();
    return { wasFirst: true };
  },

  // Mirrors storage.js — previously missing entirely from this backend.
  async updateCampaignEmailDelivered(campaignEmailId) {
    const record = store.campaignEmails.get(campaignEmailId);
    if (!record || record.deliveredAt != null) return { wasFirst: false };
    record.deliveredAt = new Date();
    return { wasFirst: true };
  },

  async updateCampaignEmailBounced(campaignEmailId) {
    const record = store.campaignEmails.get(campaignEmailId);
    if (!record || record.status === CAMPAIGN_EMAIL_STATUS.BOUNCED) return { wasFirst: false };
    record.status = CAMPAIGN_EMAIL_STATUS.BOUNCED;
    return { wasFirst: true };
  },

  async updateCampaignEmailComplained(campaignEmailId) {
    const record = store.campaignEmails.get(campaignEmailId);
    if (!record || record.status === CAMPAIGN_EMAIL_STATUS.COMPLAINED) return { wasFirst: false };
    record.status = CAMPAIGN_EMAIL_STATUS.COMPLAINED;
    return { wasFirst: true };
  },

  async incrementCampaignOpened(campaignId) {
    const campaign = store.campaigns.get(campaignId);
    if (campaign) campaign.openedEmails = (campaign.openedEmails || 0) + 1;
  },

  async incrementCampaignClicked(campaignId) {
    const campaign = store.campaigns.get(campaignId);
    if (campaign) campaign.clickedEmails = (campaign.clickedEmails || 0) + 1;
  },

  async incrementCampaignDelivered(campaignId) {
    const campaign = store.campaigns.get(campaignId);
    if (campaign) campaign.deliveredEmails = (campaign.deliveredEmails || 0) + 1;
  },

  // ── M11: Unsubscribe analytics ─────────────────────────────────────────────

  async recordCampaignEmailUnsubscribed(recipientEmail, userId, campaignId) {
    const normalizedEmail = recipientEmail.toLowerCase().trim();
    for (const record of store.campaignEmails.values()) {
      if (
        record.campaignId === campaignId &&
        record.userId === userId &&
        record.recipientEmail === normalizedEmail &&
        record.status !== "SUPPRESSED" &&
        !record.unsubscribedAt
      ) {
        record.unsubscribedAt = new Date();
        return { campaignId: record.campaignId };
      }
    }
    return null;
  },

  async incrementCampaignUnsubscribed(campaignId) {
    const campaign = store.campaigns.get(campaignId);
    if (campaign) campaign.unsubscribedEmails = (campaign.unsubscribedEmails || 0) + 1;
  },

  // ── Invites ────────────────────────────────────────────────────────────────

  async createInvite(data) {
    const id = generateUUID();
    const invite = {
      id,
      email: data.email,
      role: data.role,
      invitedBy: data.invitedBy,
      tokenHash: data.tokenHash,
      expiresAt: new Date(data.expiresAt),
      acceptedAt: null,
      createdAt: new Date(),
    };
    store.invites.set(id, invite);
    return invite;
  },

  async getInviteByTokenHash(tokenHash) {
    for (const invite of store.invites.values()) {
      if (invite.tokenHash === tokenHash) return invite;
    }
    return null;
  },

  async getInviteById(id) {
    return store.invites.get(id) || null;
  },

  async getPendingInvitesByAdmin(invitedBy) {
    return toSortedArray(store.invites)
      .filter(i => i.invitedBy === invitedBy);
  },

  // M42 parity — see storage.js for why live invites count against the entitlement.
  async getPendingWorkspaceInviteCount(rootId, now = new Date()) {
    const memberIds = await this.getWorkspaceMemberIds(rootId);
    let count = 0;
    for (const inv of store.invites.values()) {
      if (!memberIds.has(inv.invitedBy)) continue;
      if (inv.acceptedAt) continue;
      if (new Date(inv.expiresAt) < new Date(now)) continue;
      count++;
    }
    return count;
  },

  async markInviteAccepted(id) {
    const invite = store.invites.get(id);
    if (!invite) return null;
    invite.acceptedAt = new Date();
    return invite;
  },

  async updateInviteToken(id, tokenHash, expiresAt) {
    const invite = store.invites.get(id);
    if (!invite) return null;
    invite.tokenHash = tokenHash;
    invite.expiresAt = new Date(expiresAt);
    return invite;
  },

  async deleteExpiredInvites() {
    const now = new Date();
    let count = 0;
    for (const [id, invite] of store.invites.entries()) {
      if (invite.expiresAt < now && !invite.acceptedAt) {
        store.invites.delete(id);
        count++;
      }
    }
    return count;
  },

  async deleteInvite(id) {
    store.invites.delete(id);
  },

  async getChildUserCount(parentId) {
    let count = 0;
    for (const user of store.users.values()) {
      if (user.parentId === parentId && user.isActive) count++;
    }
    return count;
  },

  // ── Inactivity Governance ──────────────────────────────────────────────────

  async updateUserActivity(userId) {
    const user = store.users.get(userId);
    if (!user) return;

    const wasDormant = user.isDormant;
    user.lastActivityAt = new Date();
    user.inactivityWarningSentAt = null;
    user.inactivityKeepToken = null;
    user.inactivityKeepTokenExpiresAt = null;
    user.isDormant = false;
    user.updatedAt = new Date();

    if (wasDormant) {
      await this.createAuditLog({
        userId,
        action: AUDIT_ACTIONS.USER_REACTIVATED,
        targetType: "user",
        targetId: userId,
      });
    }
  },

  async setUserDormant(userId) {
    const user = store.users.get(userId);
    if (!user) return;

    user.isDormant = true;
    user.updatedAt = new Date();

    const creditsRemaining = (user.creditsReceived || 0) - (user.creditsAllocated || 0) - (user.creditsUsed || 0);
    const daysInactive = user.lastActivityAt
      ? Math.floor((Date.now() - new Date(user.lastActivityAt).getTime()) / 86400000)
      : null;

    await this.createAuditLog({
      userId,
      action: AUDIT_ACTIONS.USER_DORMANT,
      targetType: "user",
      targetId: userId,
      details: { daysInactive, creditsRemaining },
    });
  },

  async getUsersForInactivityCheck() {
    const { WARNING_DAYS } = INACTIVITY_THRESHOLDS;
    const cutoff = new Date(Date.now() - WARNING_DAYS * 24 * 60 * 60 * 1000);

    return Array.from(store.users.values()).filter(u => {
      if (u.role === USER_ROLES.ROOT_ADMIN) return false;
      if (u.isSecondaryRoot) return false;
      if (!u.isActive) return false;
      if (u.lastActivityAt == null) return new Date(u.createdAt) < cutoff;
      return new Date(u.lastActivityAt) < cutoff;
    });
  },

  async autoReclaimCredits(fromUserId, toUserId) {
    const child = store.users.get(fromUserId);
    const parent = store.users.get(toUserId);
    if (!child || !parent) throw new Error("User not found");

    const creditsRemaining = (child.creditsReceived || 0) - (child.creditsAllocated || 0) - (child.creditsUsed || 0);
    const runningCampaignCredits = Array.from(store.campaigns.values())
      .filter(c => c.userId === fromUserId && c.status === CAMPAIGN_STATUS.RUNNING)
      .reduce((sum, c) => sum + Math.max(0, (c.totalEmails || 0) - (c.sentEmails || 0)), 0);

    const safeReclaim = creditsRemaining - runningCampaignCredits;
    if (safeReclaim <= 0) return { amount: 0, skipped: true, protectedCredits: runningCampaignCredits };

    const childBalanceBefore = creditsRemaining;
    const parentActualBalance = (parent.creditsReceived || 0) - (parent.creditsAllocated || 0) - (parent.creditsUsed || 0);

    child.creditsReceived -= safeReclaim;
    child.updatedAt = new Date();
    parent.creditsAllocated -= safeReclaim;
    parent.updatedAt = new Date();

    const txId1 = generateUUID();
    store.creditTransactions.set(txId1, {
      id: txId1, userId: fromUserId, type: "reclaim_out",
      amount: -safeReclaim,
      balanceBefore: childBalanceBefore, balanceAfter: childBalanceBefore - safeReclaim,
      fromUserId, toUserId,
      description: `${safeReclaim} credits reclaimed — 90 days inactivity`,
      createdAt: new Date(),
    });

    const txId2 = generateUUID();
    store.creditTransactions.set(txId2, {
      id: txId2, userId: toUserId, type: "reclaim_in",
      amount: safeReclaim,
      balanceBefore: parentActualBalance, balanceAfter: parentActualBalance + safeReclaim,
      fromUserId, toUserId,
      description: `${safeReclaim} credits auto-reclaimed from ${child.username} — 90 days inactivity`,
      createdAt: new Date(),
    });

    await this.createAuditLog({
      userId: toUserId,
      action: AUDIT_ACTIONS.CREDITS_AUTO_RECLAIMED,
      targetType: "user",
      targetId: fromUserId,
      details: { amount: safeReclaim, runningCampaignCredits, reason: "90 days inactivity" },
    });

    return { amount: safeReclaim, skipped: false };
  },

  async validateKeepToken(rawToken) {
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    let user = null;
    for (const u of store.users.values()) {
      if (u.inactivityKeepToken === tokenHash) { user = u; break; }
    }

    if (!user) return { valid: false, reason: "not_found" };

    if (!user.inactivityKeepTokenExpiresAt || new Date(user.inactivityKeepTokenExpiresAt) < new Date()) {
      return { valid: false, userId: user.id, reason: "expired" };
    }

    const reclaimLogs = await this.getAuditLogs({
      userId: user.id,
      action: AUDIT_ACTIONS.CREDITS_AUTO_RECLAIMED,
      limit: 1,
    });
    if (reclaimLogs && reclaimLogs.length > 0) {
      return { valid: false, userId: user.id, reason: "reclaim_already_fired" };
    }

    return { valid: true, userId: user.id, user: this.sanitizeUser(user), reason: "valid" };
  },

  async markInactivityWarningSent(userId, tokenHash, tokenExpiresAt) {
    const user = store.users.get(userId);
    if (!user) return;
    user.inactivityWarningSentAt = new Date();
    user.inactivityKeepToken = tokenHash ?? null;
    user.inactivityKeepTokenExpiresAt = tokenExpiresAt ?? null;
    user.updatedAt = new Date();
  },

  async updateInactivityToken(userId, tokenHash, tokenExpiresAt) {
    const user = store.users.get(userId);
    if (!user) return;
    user.inactivityKeepToken = tokenHash;
    user.inactivityKeepTokenExpiresAt = tokenExpiresAt;
    user.updatedAt = new Date();
  },

  async clearInactivityToken(userId) {
    const user = store.users.get(userId);
    if (!user) return;
    user.inactivityKeepToken = null;
    user.inactivityKeepTokenExpiresAt = null;
    user.updatedAt = new Date();
  },

  // ── Self-service password reset ────────────────────────────────────────────

  async setPasswordResetToken(userId, tokenHash, expiresAt) {
    const user = store.users.get(userId);
    if (!user) return;
    user.resetToken = tokenHash;
    user.resetTokenExpiresAt = expiresAt;
    user.updatedAt = new Date();
  },

  async getUserByResetToken(tokenHash) {
    const now = new Date();
    for (const user of store.users.values()) {
      if (user.resetToken === tokenHash && user.resetTokenExpiresAt && new Date(user.resetTokenExpiresAt) >= now) {
        return { ...user };
      }
    }
    return null;
  },

  // SEC — atomic single-use consumption. The match and the clear happen with no
  // `await` between them, so the single-threaded event loop cannot interleave a
  // second concurrent redemption: whichever call reaches here first nulls the
  // token, and the other finds nothing. Mirrors the Postgres
  // UPDATE ... WHERE ... RETURNING in storage.js. Guarantees single-use even
  // under concurrent requests.
  async consumeResetToken(tokenHash) {
    const now = new Date();
    for (const user of store.users.values()) {
      if (user.resetToken === tokenHash && user.resetTokenExpiresAt && new Date(user.resetTokenExpiresAt) >= now) {
        user.resetToken = null;
        user.resetTokenExpiresAt = null;
        user.updatedAt = now;
        return { ...user };
      }
    }
    return null;
  },

  async clearPasswordResetToken(userId) {
    const user = store.users.get(userId);
    if (!user) return;
    user.resetToken = null;
    user.resetTokenExpiresAt = null;
    user.updatedAt = new Date();
  },

  // ── Secondary Root Admin ───────────────────────────────────────────────────

  async grantSecondaryRoot(userId) {
    const user = store.users.get(userId);
    if (!user) return;
    user.isSecondaryRoot = true;
    user.updatedAt = new Date();
  },

  async revokeSecondaryRoot(userId) {
    const user = store.users.get(userId);
    if (!user) return;
    user.isSecondaryRoot = false;
    user.updatedAt = new Date();
  },

  async getSecondaryRootCount(memberIds) {
    if (!memberIds || memberIds.length === 0) return 0;
    const idSet = new Set(memberIds);
    let count = 0;
    for (const user of store.users.values()) {
      if (user.isSecondaryRoot && idSet.has(user.id)) count++;
    }
    return count;
  },

  async markAllRootAdminsRecoveryAt(timestamp) {
    for (const user of store.users.values()) {
      if (user.role === USER_ROLES.ROOT_ADMIN) {
        user.lastEmergencyRecoveryAt = timestamp;
      }
    }
  },

  // ── Data Cleanup Jobs ──────────────────────────────────────────────────────

  async deleteExpiredSessions() {
    const now = new Date();
    let count = 0;
    for (const [id, session] of store.sessions.entries()) {
      if (new Date(session.expiresAt) < now) {
        store.sessions.delete(id);
        count++;
      }
    }
    return count;
  },

  async pruneAuditLogs(retentionDays) {
    const cutoff = new Date(Date.now() - retentionDays * 86400000);
    let count = 0;
    for (const [id, log] of store.auditLogs.entries()) {
      if (new Date(log.createdAt) < cutoff) {
        store.auditLogs.delete(id);
        count++;
      }
    }
    return count;
  },

  async deleteOldCampaignEmails(retentionDays) {
    const cutoff = new Date(Date.now() - retentionDays * 86400000);
    let count = 0;
    for (const campaign of store.campaigns.values()) {
      if (!["COMPLETED", "FAILED"].includes(campaign.status)) continue;
      if (new Date(campaign.createdAt) >= cutoff) continue;
      for (const [id, email] of store.campaignEmails.entries()) {
        if (email.campaignId === campaign.id) {
          store.campaignEmails.delete(id);
          count++;
        }
      }
    }
    return count;
  },

  async pruneAiUsageLogs(retentionDays) {
    const cutoff = new Date(Date.now() - retentionDays * 86400000);
    let count = 0;
    for (const [id, log] of store.aiUsageLogs.entries()) {
      if (new Date(log.createdAt) < cutoff) {
        store.aiUsageLogs.delete(id);
        count++;
      }
    }
    return count;
  },

  async expireInactivityTokens() {
    const now = new Date();
    let count = 0;
    for (const user of store.users.values()) {
      if (
        user.inactivityKeepToken &&
        user.inactivityKeepTokenExpiresAt &&
        new Date(user.inactivityKeepTokenExpiresAt) < now
      ) {
        user.inactivityKeepToken = null;
        user.inactivityKeepTokenExpiresAt = null;
        user.updatedAt = new Date();
        count++;
      }
    }
    return count;
  },

  async getPlatformSetting(key) {
    return this._platformSettings?.get(key) || null;
  },

  async setPlatformSetting(key, value, userId) {
    if (!this._platformSettings) this._platformSettings = new Map();
    this._platformSettings.set(key, { key, value, updatedAt: new Date(), updatedBy: userId });
  },

  async getUserSenderHealth(userId) {
    return { sent: 0, bounced: 0, complained: 0, bounceRate: 0, complaintRate: 0 };
  },

  async getDeliveryHealthStats() {
    const bouncePause = parseFloat(process.env.BOUNCE_RATE_PAUSE_THRESHOLD || "0.08");
    const complaintPause = parseFloat(process.env.COMPLAINT_RATE_PAUSE_THRESHOLD || "0.0005");
    const bounceWarn = bouncePause * 0.5;
    const complaintWarn = complaintPause * 0.5;
    return {
      status: 'healthy',
      period: '30d',
      totals: { sent: 0, bounced: 0, complained: 0 },
      rates: { bounceRate: 0, complaintRate: 0 },
      thresholds: {
        bounce: { warning: parseFloat((bounceWarn * 100).toFixed(2)), critical: parseFloat((bouncePause * 100).toFixed(2)), unit: '%' },
        complaint: { warning: parseFloat((complaintWarn * 100).toFixed(4)), critical: parseFloat((complaintPause * 100).toFixed(4)), unit: '%' },
      },
      topBouncers: [],
      suppression: { addedLast7d: 0, addedLast30d: 0 },
    };
  },

  // ── Sender Domains (M9) ────────────────────────────────────────────────────

  async createSenderDomain({ userId, domain, fromEmail, status, dkimTokens, verifyRecord, verificationWindowDays }) {
    if (!this._senderDomains) this._senderDomains = new Map();
    const id = `sd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const now = new Date();
    const row = {
      id, userId, domain, fromEmail,
      status: status || "PENDING_VERIFICATION",
      dkimTokens: dkimTokens || null,
      verifyRecord: verifyRecord || null,
      verifiedAt: null,
      suspendedAt: null,
      sentCount: 0, bouncedCount: 0, complainedCount: 0,
      verificationWindowDays: verificationWindowDays || 14,
      createdAt: now, updatedAt: now,
    };
    this._senderDomains.set(id, row);
    return row;
  },

  // TRUST-014 (M20-B) — mirrors storage.js's workspace-scoped resolution.
  async getSenderDomainsByUserId(userId) {
    if (!this._senderDomains) return [];
    const rootId = await this.resolveWorkspaceRootId(userId);
    return [...this._senderDomains.values()]
      .filter(d => d.userId === rootId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(d => ({ ...d, isInherited: d.userId !== userId }));
  },

  async getSenderDomainById(id) {
    return this._senderDomains?.get(id) || null;
  },

  async getSenderDomainByUserIdAndDomain(userId, domain) {
    if (!this._senderDomains) return null;
    return [...this._senderDomains.values()].find(d => d.userId === userId && d.domain === domain) || null;
  },

  async getSenderDomainByDomain(domain) {
    if (!this._senderDomains) return null;
    return [...this._senderDomains.values()].find(d => d.domain === domain) || null;
  },

  async getSenderDomainsByStatus(status) {
    if (!this._senderDomains) return [];
    return [...this._senderDomains.values()].filter(d => d.status === status);
  },

  async updateSenderDomain(id, updates) {
    if (!this._senderDomains) return null;
    const row = this._senderDomains.get(id);
    if (!row) return null;
    const updated = { ...row, ...updates, updatedAt: new Date() };
    this._senderDomains.set(id, updated);
    return updated;
  },

  async updateSenderDomainIfPending(id, updates) {
    if (!this._senderDomains) return null;
    const row = this._senderDomains.get(id);
    if (!row || row.status !== "PENDING_VERIFICATION") return null;
    const updated = { ...row, ...updates, updatedAt: new Date() };
    this._senderDomains.set(id, updated);
    return updated;
  },

  async deleteSenderDomain(id) {
    this._senderDomains?.delete(id);
  },

  async getVerifiedDomainForUser(userId, domainId) {
    if (!this._senderDomains) return null;
    const rootId = await this.resolveWorkspaceRootId(userId);
    const row = this._senderDomains.get(domainId);
    if (!row || row.userId !== rootId || row.status !== "VERIFIED") return null;
    return row;
  },

  async hasVerifiedDomainForUser(userId) {
    if (!this._senderDomains) return false;
    const rootId = await this.resolveWorkspaceRootId(userId);
    return [...this._senderDomains.values()].some(d => d.userId === rootId && d.status === "VERIFIED");
  },

  // ── M10: Email Analytics Tracking Tokens ──────────────────────────────────────

  async createTrackingTokensForEmail({ campaignEmailId, campaignId, templateLinks, retentionDays }) {
    const expiresAt = new Date(Date.now() + retentionDays * 86_400_000);
    const openToken = generateTrackingToken();
    const now = new Date();

    const openRow = {
      id: crypto.randomUUID(),
      token: openToken,
      tokenType: "open",
      campaignId,
      campaignEmailId,
      linkUrl: null,
      createdAt: now,
      expiresAt,
      firstUsedAt: null,
      usedCount: 0,
      lastUserAgentCategory: null,
      ipHash: null,
    };
    store.trackingTokens.set(openRow.id, openRow);

    const clickTokenMap = new Map();
    for (const url of templateLinks) {
      const t = generateTrackingToken();
      const row = {
        id: crypto.randomUUID(),
        token: t,
        tokenType: "click",
        campaignId,
        campaignEmailId,
        linkUrl: url,
        createdAt: now,
        expiresAt,
        firstUsedAt: null,
        usedCount: 0,
        lastUserAgentCategory: null,
        ipHash: null,
      };
      store.trackingTokens.set(row.id, row);
      clickTokenMap.set(url, t);
    }

    return { openToken, clickTokenMap };
  },

  async getTrackingToken(token) {
    for (const row of store.trackingTokens.values()) {
      if (row.token === token) return { ...row };
    }
    return null;
  },

  async recordOpenResolution(tokenRecord, { uaCategory, ipHash }) {
    const now = new Date();
    const row = store.trackingTokens.get(tokenRecord.id);
    if (!row) return;
    const isFirst = row.firstUsedAt === null;
    row.usedCount += 1;
    row.lastUserAgentCategory = uaCategory;
    row.ipHash = ipHash;
    if (isFirst) row.firstUsedAt = now;

    if (!isFirst) return;

    const ceRow = store.campaignEmails.get(tokenRecord.campaignEmailId);
    if (ceRow && !ceRow.openedAt) {
      ceRow.openedAt = now;
      const camp = store.campaigns.get(tokenRecord.campaignId);
      if (camp) camp.openedEmails = (camp.openedEmails || 0) + 1;
    }
  },

  async recordClickResolution(tokenRecord, { uaCategory, ipHash }) {
    const now = new Date();
    const row = store.trackingTokens.get(tokenRecord.id);
    if (!row) return;
    const isFirst = row.firstUsedAt === null;
    const machine = isMachineCategory(uaCategory);
    row.usedCount += 1;
    row.lastUserAgentCategory = uaCategory;
    row.ipHash = ipHash;
    if (isFirst) row.firstUsedAt = now;

    if (machine) return;

    const ceRow = store.campaignEmails.get(tokenRecord.campaignEmailId);
    if (ceRow && !ceRow.clickedAt) {
      ceRow.clickedAt = now;
      const camp = store.campaigns.get(tokenRecord.campaignId);
      if (camp) camp.clickedEmails = (camp.clickedEmails || 0) + 1;
    }
  },

  async getCampaignTrackingBreakdown(campaignId) {
    let machineOpenCount = 0;
    let machineClickCount = 0;
    for (const row of store.trackingTokens.values()) {
      if (row.campaignId !== campaignId) continue;
      if (!row.firstUsedAt) continue;
      if (isMachineCategory(row.lastUserAgentCategory)) {
        if (row.tokenType === "open")  machineOpenCount++;
        if (row.tokenType === "click") machineClickCount++;
      }
    }
    return { machineOpenCount, machineClickCount };
  },

  async expireContactTrackingTokens(contactId) {
    const now = new Date();
    const ceIds = new Set();
    for (const ce of store.campaignEmails.values()) {
      if (ce.contactId === contactId) ceIds.add(ce.id);
    }
    for (const row of store.trackingTokens.values()) {
      if (ceIds.has(row.campaignEmailId)) row.expiresAt = now;
    }
  },

  async deleteExpiredTrackingTokens() {
    const now = new Date();
    let totalDeleted = 0;
    for (const [id, row] of store.trackingTokens.entries()) {
      if (row.expiresAt < now) {
        store.trackingTokens.delete(id);
        totalDeleted++;
      }
    }
    return totalDeleted;
  },
};

console.log("[DEV MODE] In-memory storage initialized - all data will reset on server restart");
