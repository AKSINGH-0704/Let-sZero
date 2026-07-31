// TRUST-029 — warm-up accounting keyed on the DOMAIN, not the user.
//
// The defect: warm-up counters live on the individual user row, but members send
// through the workspace root's verified domain (TRUST-014). So an N-member
// workspace held N independent daily budgets against ONE domain's reputation,
// and every new member started a fresh ladder on an already-warm domain.
// Warm-up exists to protect a domain, mailbox providers judge the domain, and
// the control was not measuring it — inviting a teammate bypassed it.
//
// Monetizing seats made that worse: it creates a financial incentive to sell
// more independent send budgets against one reputation, and removes the only
// brake that existed (nobody bothered filling 25 free seats).
//
// The fix is config-gated (`warmup_scope`), because switching to DOMAIN REDUCES
// what a multi-member workspace may send in a day. That is the point, and it is
// customer-visible, so it is an operator decision with a ≤60s rollback.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { WARMUP_SCOPE, parseScope, WARMUP_SETTING_KEYS, DEFAULT_WARMUP_LADDER } from "../../shared/warmupPolicy.js";
import { storage } from "../../server/storage.js";
import { claimWarmupSlot, recordFirstSend, resetWarmupPolicyCache } from "../../server/senderAuth.js";

const DAY1_LIMIT = DEFAULT_WARMUP_LADDER[0].dailyLimit; // 50
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);

async function setScope(scope) {
  await storage.setPlatformSetting(WARMUP_SETTING_KEYS.SCOPE, scope);
  resetWarmupPolicyCache();
}

/**
 * Stamp a workspace's warm-up anchor through the REAL authority.
 *
 * `updateUser` deliberately will not write first_send_at — the anchor is owned
 * by recordFirstSend and is idempotent by design. Rather than widen that
 * whitelist for a test's convenience, we travel back in time and call the real
 * function, which also proves the anchor behaves under the path production uses.
 */
async function anchorDaysAgo(userId, days) {
  vi.useFakeTimers({ toFake: ["Date"] });
  try {
    vi.setSystemTime(daysAgo(days));
    await recordFirstSend(userId);
  } finally {
    vi.useRealTimers();
  }
}

/** A workspace root plus `members` children, all mid-warm-up (day 1 by default). */
async function makeWorkspace(members = 0, { firstSendAt = daysAgo(0) } = {}) {
  const root = await storage.createUser({
    username: `root_${Math.random().toString(36).slice(2)}`,
    email: `${Math.random().toString(36).slice(2)}@example.com`,
    password: "x".repeat(20), creditsReceived: 100000, emailVerified: true,
  });
  // Anchor left unset = day 1 of the ladder, which is what these cases want.
  const kids = [];
  for (let i = 0; i < members; i++) {
    const m = await storage.createUser({
      username: `m${i}_${Math.random().toString(36).slice(2)}`,
      email: `${Math.random().toString(36).slice(2)}@example.com`,
      password: "x".repeat(20), creditsReceived: 100000, emailVerified: true,
      parentId: root.id, role: "USER",
    });

    kids.push(await storage.getUserById(m.id));
  }
  return { root: await storage.getUserById(root.id), members: kids };
}

/** Claim until refused; returns how many slots were granted. */
async function drain(user, attempts) {
  let granted = 0;
  for (let i = 0; i < attempts; i++) if (await claimWarmupSlot(user)) granted++;
  return granted;
}

beforeEach(async () => { await setScope(WARMUP_SCOPE.USER); });

describe("the setting parses safely", () => {
  it.each([["DOMAIN", "DOMAIN"], ["domain", "DOMAIN"], [" Domain ", "DOMAIN"]])(
    "%s enables domain scope", (raw, want) => expect(parseScope(raw)).toBe(want));

  it.each([undefined, null, "", "USER", "nonsense", "0", "true"])(
    "%s falls back to USER — the shipped behaviour", (raw) => {
      expect(parseScope(raw)).toBe(WARMUP_SCOPE.USER);
    });
});

describe("USER scope — unchanged, which is what makes the flag a real rollback", () => {
  it("gives every member their own full daily budget", async () => {
    const { root, members } = await makeWorkspace(2);
    expect(await drain(root, DAY1_LIMIT + 5)).toBe(DAY1_LIMIT);
    // The root is exhausted; each member still has an untouched budget. This is
    // exactly the defect — stated as a passing test so the fix is visibly a change.
    expect(await drain(members[0], DAY1_LIMIT + 5)).toBe(DAY1_LIMIT);
    expect(await drain(members[1], DAY1_LIMIT + 5)).toBe(DAY1_LIMIT);
  });
});

describe("DOMAIN scope — one budget for the whole workspace", () => {
  beforeEach(async () => { await setScope(WARMUP_SCOPE.DOMAIN); });

  it("a three-person workspace shares ONE daily limit", async () => {
    const { root, members } = await makeWorkspace(2);
    const a = await drain(root, 30);
    const b = await drain(members[0], 30);
    const c = await drain(members[1], 30);
    expect(a + b + c).toBe(DAY1_LIMIT);
  });

  it("a member cannot send once the workspace total is spent", async () => {
    const { root, members } = await makeWorkspace(1);
    expect(await drain(root, DAY1_LIMIT)).toBe(DAY1_LIMIT);
    expect(await claimWarmupSlot(members[0])).toBe(false);
  });

  it("inviting a teammate does not raise the ceiling", async () => {
    const solo = await makeWorkspace(0);
    expect(await drain(solo.root, DAY1_LIMIT + 10)).toBe(DAY1_LIMIT);
    // Add a member after the budget is spent — under USER scope this bought
    // another 50 sends. It must now buy none.
    const late = await storage.createUser({
      username: `late_${Math.random().toString(36).slice(2)}`,
      email: `${Math.random().toString(36).slice(2)}@example.com`,
      password: "x".repeat(20), creditsReceived: 100000, emailVerified: true,
      parentId: solo.root.id, role: "USER",
    });
    expect(await claimWarmupSlot(await storage.getUserById(late.id))).toBe(false);
  });

  it("a new member does NOT restart the ladder on an already-warm domain", async () => {
    // The root has been sending for 10 days, so the domain is past stage 1. A
    // member who has never sent must inherit the WORKSPACE's day index — under
    // user scope they would have started a fresh day-1 ladder on a warm domain,
    // which is the whole defect.
    const { root, members } = await makeWorkspace(1);
    await anchorDaysAgo(root.id, 10);
    const fresh = await storage.getUserById(members[0].id);
    expect(fresh.firstSendAt).toBeFalsy(); // this member has genuinely never sent

    const ws = await storage.getWorkspaceWarmupState(root.id);
    expect(new Date(ws.firstSendAt).toDateString()).toBe(daysAgo(10).toDateString());
    // Day 11 sits on the terminal stage (200/day), not stage 1 (50/day).
    expect(await drain(fresh, 60)).toBeGreaterThan(DAY1_LIMIT);
  });
});

describe("DOMAIN scope — tenant isolation", () => {
  beforeEach(async () => { await setScope(WARMUP_SCOPE.DOMAIN); });

  it("one workspace's sends never consume another's budget", async () => {
    const w1 = await makeWorkspace(1);
    const w2 = await makeWorkspace(1);
    expect(await drain(w1.root, DAY1_LIMIT)).toBe(DAY1_LIMIT);
    expect(await claimWarmupSlot(w1.members[0])).toBe(false);
    // Untouched neighbour still has its full allowance.
    expect(await drain(w2.root, DAY1_LIMIT)).toBe(DAY1_LIMIT);
  });
});

describe("DOMAIN scope — the counting rules", () => {
  beforeEach(async () => { await setScope(WARMUP_SCOPE.DOMAIN); });

  it("an expired 24h window contributes nothing to the workspace total", async () => {
    const { root, members } = await makeWorkspace(1);
    // Member burned a full day's worth, but more than 24h ago.
    await storage.updateUser(members[0].id, {
      warmupEmailsSentToday: DAY1_LIMIT, warmupEmailsResetAt: daysAgo(2),
    });
    const ws = await storage.getWorkspaceWarmupState(root.id);
    expect(ws.sentToday).toBe(0);
    // ...so the workspace still has its whole budget.
    expect(await drain(root, DAY1_LIMIT + 5)).toBe(DAY1_LIMIT);
  });

  it("the admin override is read from the ROOT and governs the whole workspace", async () => {
    const { root, members } = await makeWorkspace(1);
    await storage.updateUser(root.id, { warmupDailyLimit: 7 });
    const a = await drain(await storage.getUserById(root.id), 10);
    const b = await drain(members[0], 10);
    expect(a + b).toBe(7);
  });

  it("a member's own override cannot raise the workspace ceiling", async () => {
    // Under USER scope this was a per-account escape hatch. Under DOMAIN scope
    // the workspace is the account, so a child's override must not apply.
    const { root, members } = await makeWorkspace(1);
    await storage.updateUser(members[0].id, { warmupDailyLimit: 9999 });
    const a = await drain(root, 30);
    const b = await drain(await storage.getUserById(members[0].id), 9999);
    expect(a + b).toBe(DAY1_LIMIT);
  });
});

describe("DOMAIN scope — concurrency", () => {
  beforeEach(async () => { await setScope(WARMUP_SCOPE.DOMAIN); });

  it("parallel claims from different members never overshoot the shared limit", async () => {
    const { root, members } = await makeWorkspace(3);
    const everyone = [root, ...members];
    // Spend all but one slot, then have all four race for it.
    await drain(root, DAY1_LIMIT - 1);
    const results = await Promise.all(everyone.map(u => claimWarmupSlot(u)));
    expect(results.filter(Boolean).length).toBe(1);
    const ws = await storage.getWorkspaceWarmupState(root.id);
    expect(ws.sentToday).toBe(DAY1_LIMIT);
  });
});

describe("rollback", () => {
  it("switching back to USER restores per-member budgets with no deploy", async () => {
    const { root, members } = await makeWorkspace(1);
    await setScope(WARMUP_SCOPE.DOMAIN);
    expect(await drain(root, DAY1_LIMIT)).toBe(DAY1_LIMIT);
    expect(await claimWarmupSlot(members[0])).toBe(false);

    await setScope(WARMUP_SCOPE.USER);
    // The member's own counter was never touched, so their budget is intact.
    expect(await claimWarmupSlot(members[0])).toBe(true);
  });
});
