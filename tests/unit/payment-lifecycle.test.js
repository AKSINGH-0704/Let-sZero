// M39 Phase 2 — the commercial transaction lifecycle: state machine, idempotent
// credit allocation, and the refund lifecycle (D4 / MD-006).
//
// Runs against the in-memory storage backend (DATABASE_URL unset), the same
// backend the rest of the DB-backed suites use, so it exercises the real storage
// methods the routes and webhook call — completePayment / failPayment /
// cancelPayment / refundPayment — not mocks. The database is the source of truth:
// never lose money, never duplicate credits, never force a negative balance.

import { describe, it, expect, beforeAll } from "vitest";
import {
  PAYMENT_TRANSITIONS, canTransition, assertTransition, isTerminal, TERMINAL_STATUSES,
} from "../../shared/paymentStateMachine.js";
import { PAYMENT_STATUS, USER_ROLES } from "../../shared/schema.js";

let storage;
beforeAll(async () => {
  ({ storage } = await import("../../server/storage.js"));
});

let seq = 0;
async function makeUser({ credits = 0, plan = "starter" } = {}) {
  seq += 1;
  const u = await storage.createUser({
    username: `pay_u_${seq}_${Math.random().toString(36).slice(2)}`,
    email: `pay_u_${seq}_${Math.random().toString(36).slice(2)}@example.com`,
    password: "pw-" + Math.random().toString(36).slice(2),
    role: USER_ROLES.ROOT_ADMIN,
    plan,
    isTrialUser: false,
    mustResetPassword: false,
  });
  if (credits > 0) {
    // Seed a completed purchase so there is a real balance to reason about.
    const p = await storage.createPayment({
      userId: u.id, planName: plan, credits,
      amountInr: credits, amountUsd: 1, amountLocal: credits, currency: "INR",
      status: PAYMENT_STATUS.PENDING, metadata: { seed: true },
    });
    await storage.completePayment(p.id, `seed_txn_${seq}`);
  }
  return storage.getUserById(u.id);
}

async function makePendingPayment(userId, credits, meta = {}) {
  return storage.createPayment({
    userId, planName: "starter", credits,
    amountInr: credits, amountUsd: 1, amountLocal: credits, currency: "INR",
    status: PAYMENT_STATUS.PENDING, metadata: meta,
  });
}

const balanceOf = async (userId) => (await storage.getUserById(userId)).creditsRemaining;

// ─────────────────────────────────────────────────────────────────────────────
describe("payment state machine — the single source of legal transitions", () => {
  it("PENDING may go to SUCCESS / FAILED / CANCELLED, and nowhere else", () => {
    expect(canTransition(PAYMENT_STATUS.PENDING, PAYMENT_STATUS.SUCCESS)).toBe(true);
    expect(canTransition(PAYMENT_STATUS.PENDING, PAYMENT_STATUS.FAILED)).toBe(true);
    expect(canTransition(PAYMENT_STATUS.PENDING, PAYMENT_STATUS.CANCELLED)).toBe(true);
    expect(canTransition(PAYMENT_STATUS.PENDING, PAYMENT_STATUS.REFUNDED)).toBe(false);
  });

  it("only SUCCESS may become REFUNDED; terminal states admit no transitions", () => {
    expect(canTransition(PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.REFUNDED)).toBe(true);
    expect(canTransition(PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.FAILED)).toBe(false);
    for (const t of TERMINAL_STATUSES) {
      expect(isTerminal(t)).toBe(true);
      expect(PAYMENT_TRANSITIONS[t]).toEqual([]);
    }
    expect(isTerminal(PAYMENT_STATUS.PENDING)).toBe(false);
  });

  it("same-status is NOT a transition (idempotency is handled separately)", () => {
    expect(canTransition(PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.SUCCESS)).toBe(false);
  });

  it("assertTransition throws on an illegal edge", () => {
    expect(() => assertTransition(PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.SUCCESS)).toThrow(/Illegal payment transition/);
    expect(assertTransition(PAYMENT_STATUS.PENDING, PAYMENT_STATUS.SUCCESS)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("credit allocation — idempotent and never double-credits", () => {
  it("completePayment credits exactly once even when called twice (duplicate webhook + verify)", async () => {
    const u = await makeUser();
    const before = await balanceOf(u.id);
    const p = await makePendingPayment(u.id, 3000);

    const r1 = await storage.completePayment(p.id, "txn_1");
    const r2 = await storage.completePayment(p.id, "txn_1"); // duplicate delivery

    expect(r1.credited).toBe(true);
    expect(r2.credited).toBe(false);              // second call must not re-credit
    expect(await balanceOf(u.id)).toBe(before + 3000); // credited once, not twice
  });

  it("every allocation writes a ledger row with a consistent before/after chain", async () => {
    const u = await makeUser();
    const p = await makePendingPayment(u.id, 5000);
    const before = await balanceOf(u.id);
    await storage.completePayment(p.id, "txn_2");

    const ledger = await storage.getCreditTransactions(u.id);
    const purchase = ledger.find(t => t.type === "purchase" && t.amount === 5000);
    expect(purchase).toBeTruthy();
    expect(purchase.balanceBefore).toBe(before);
    expect(purchase.balanceAfter).toBe(before + 5000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("terminal-state protection — a completed payment is never downgraded", () => {
  it("failPayment does not downgrade a SUCCESS payment (parity defect fixed in Phase 2)", async () => {
    const u = await makeUser();
    const p = await makePendingPayment(u.id, 3000);
    await storage.completePayment(p.id, "txn_3");

    await storage.failPayment(p.id, "late gateway failure");        // must be a no-op
    expect((await storage.getPayment(p.id)).status).toBe(PAYMENT_STATUS.SUCCESS);
  });

  it("cancelPayment cancels a PENDING payment but never a SUCCESS one", async () => {
    const u = await makeUser();
    const pending = await makePendingPayment(u.id, 3000);
    await storage.cancelPayment(pending.id);
    expect((await storage.getPayment(pending.id)).status).toBe(PAYMENT_STATUS.CANCELLED);

    const paid = await makePendingPayment(u.id, 3000);
    await storage.completePayment(paid.id, "txn_4");
    await storage.cancelPayment(paid.id);                            // must be a no-op
    expect((await storage.getPayment(paid.id)).status).toBe(PAYMENT_STATUS.SUCCESS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("refund lifecycle (D4 / MD-006)", () => {
  it("auto-reverses when the balance can absorb the full clawback", async () => {
    const u = await makeUser();
    const p = await makePendingPayment(u.id, 3000);
    await storage.completePayment(p.id, "txn_5");
    const afterPurchase = await balanceOf(u.id);

    const result = await storage.refundPayment(p.id, { reason: "test_refund", actor: "op" });

    expect(result.refunded).toBe(true);
    expect((await storage.getPayment(p.id)).status).toBe(PAYMENT_STATUS.REFUNDED);
    expect(await balanceOf(u.id)).toBe(afterPurchase - 3000); // credits reversed

    const ledger = await storage.getCreditTransactions(u.id);
    const refundTx = ledger.find(t => t.type === "refund" && t.amount === -3000);
    expect(refundTx).toBeTruthy();
    expect(refundTx.balanceAfter).toBe(refundTx.balanceBefore - 3000);
  });

  it("is idempotent — a second refund is a no-op and never double-clawbacks", async () => {
    const u = await makeUser();
    const p = await makePendingPayment(u.id, 3000);
    await storage.completePayment(p.id, "txn_6");
    const afterPurchase = await balanceOf(u.id);

    const r1 = await storage.refundPayment(p.id, { reason: "r" });
    const r2 = await storage.refundPayment(p.id, { reason: "r" });

    expect(r1.refunded).toBe(true);
    expect(r2.refunded).toBe(false);
    expect(r2.alreadyRefunded).toBe(true);
    expect(await balanceOf(u.id)).toBe(afterPurchase - 3000); // clawed back once only
  });

  it("flags consumed credits for manual review instead of forcing a negative balance", async () => {
    const u = await makeUser(); // no seed balance
    const p = await makePendingPayment(u.id, 3000);
    await storage.completePayment(p.id, "txn_7"); // balance now 3000
    // Consume most of the credits so the balance can no longer absorb a full clawback.
    await storage.updateUser(u.id, { creditsUsed: 2500 }); // remaining 500 < 3000
    expect(await balanceOf(u.id)).toBe(500);

    const result = await storage.refundPayment(p.id, { reason: "consumed_case" });
    expect(result.refunded).toBe(false);
    expect(result.manualReview).toBe(true);
    expect(result.shortfall).toBe(2500);
    // Balance is untouched — no partial clawback, no negative balance.
    expect(await balanceOf(u.id)).toBe(500);
    // Status must NOT flip to REFUNDED — the refund is unresolved pending operator action.
    expect((await storage.getPayment(p.id)).status).toBe(PAYMENT_STATUS.SUCCESS);
    // The review flag is recorded on the payment for the operator.
    expect((await storage.getPayment(p.id)).metadata?.refundReview).toBe(true);
  });

  it("refuses to refund a non-SUCCESS payment", async () => {
    const u = await makeUser();
    const pending = await makePendingPayment(u.id, 3000);
    const r = await storage.refundPayment(pending.id, { reason: "x" });
    expect(r.refunded).toBe(false);
    expect(r.error).toBe("not_refundable");
    expect(r.fromStatus).toBe(PAYMENT_STATUS.PENDING);
  });

  it("purchase → refund nets to zero balance change (ledger consistency)", async () => {
    const u = await makeUser();
    const start = await balanceOf(u.id);
    const p = await makePendingPayment(u.id, 10000);
    await storage.completePayment(p.id, "txn_8");
    await storage.refundPayment(p.id, { reason: "net_zero" });
    expect(await balanceOf(u.id)).toBe(start);
  });
});
