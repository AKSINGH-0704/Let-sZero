// M59 / ADS-008 — the settlement-path diagnostic must classify a recurring
// AutoPay debit as its own population, deterministically.
//
// BEHAVIOURAL, not a source grep. The previous ADS-001 coverage asserted that
// the strings `completionPath: "browser"` and `completionPath: "webhook"`
// appear in the two call sites. That proves the literals exist; it cannot
// observe what a THIRD caller records, and it cannot observe what happens when
// two callers race for the same row. Both are exactly where ADS-008 lives.
//
// The defect: a renewal is an ordinary order to the gateway (autopayCharge.js
// stores the same `razorpay_order_id` the manual flow uses), so Razorpay fires
// `order.paid` for it and razorpayWebhook.js races seatRenewal.js to settle it.
// Classified by caller, the same business event became "webhook" or nothing,
// on gateway timing alone — and "webhook" is the bucket that means "a
// customer-initiated purchase whose tab closed", the population whose size
// decides whether offline conversion import is worth building.

import { describe, it, expect, beforeEach } from "vitest";
import { PAYMENT_KIND, PAYMENT_STATUS } from "../../shared/schema.js";
import { memoryStorage as storage } from "../../server/memoryStorage.js";

const rand = () => Math.random().toString(36).slice(2);

async function payer() {
  return storage.createUser({
    username: `owner_${rand()}`,
    email: `owner_${rand()}@example.com`,
    password: "x",
  });
}

/** A PENDING row shaped exactly as autopayCharge.js creates one. */
async function renewalRow(userId, extra = {}) {
  return storage.createPayment({
    userId, kind: PAYMENT_KIND.SEATS, planName: "Team Seats renewal — 5 × Monthly",
    credits: 0, amountMinor: 57500, amountInr: 575, amountUsd: 0, amountLocal: 575,
    currency: "INR", paymentMethod: "razorpay", status: PAYMENT_STATUS.PENDING,
    metadata: {
      seats: 5, term: "MONTHLY", workspaceRootId: userId,
      isRenewal: true, autopay: true, trigger: "worker",
      razorpay_order_id: `order_${rand()}`,
      ...extra,
    },
  });
}

/** A PENDING row shaped as the ordinary browser checkout creates one. */
async function checkoutRow(userId, extra = {}) {
  return storage.createPayment({
    userId, kind: PAYMENT_KIND.SEATS, planName: "Team Seats — 5",
    credits: 0, amountMinor: 57500, amountInr: 575, amountUsd: 0, amountLocal: 575,
    currency: "INR", paymentMethod: "razorpay", status: PAYMENT_STATUS.PENDING,
    metadata: { seats: 5, term: "MONTHLY", workspaceRootId: userId, ...extra },
  });
}

const pathOf = async (id) => (await storage.getPayment(id))?.metadata?.completionPath ?? null;

describe("ADS-008 — AutoPay renewals are their own settlement population", () => {
  let user;
  beforeEach(async () => { user = await payer(); });

  it("records \"autopay\" when the renewal worker settles the charge", async () => {
    const p = await renewalRow(user.id);
    await storage.completePayment(p.id, "pay_x", { completionPath: "autopay" });
    expect(await pathOf(p.id)).toBe("autopay");
  });

  // The defect itself. Before the fix this recorded "webhook", putting recurring
  // revenue into the bucket that sizes the browser blind spot.
  it("records \"autopay\" even when the order.paid webhook wins the race", async () => {
    const p = await renewalRow(user.id);
    // Exactly what razorpayWebhook.js passes — it cannot know this row is a renewal.
    await storage.completePayment(p.id, "pay_x", { completionPath: "webhook" });
    expect(await pathOf(p.id)).toBe("autopay");
  });

  // And the other half: settled with no path supplied at all, it must not fall
  // into the NULL bucket, which is indistinguishable from a pre-M59 legacy row.
  it("never leaves a renewal unlabelled", async () => {
    const p = await renewalRow(user.id);
    await storage.completePayment(p.id, "pay_x");
    expect(await pathOf(p.id)).toBe("autopay");
  });

  it("classifies the same row identically whichever caller wins", async () => {
    const viaWorker = await renewalRow(user.id);
    const viaWebhook = await renewalRow(user.id);
    await storage.completePayment(viaWorker.id, "pay_a", { completionPath: "autopay" });
    await storage.completePayment(viaWebhook.id, "pay_b", { completionPath: "webhook" });
    expect(await pathOf(viaWorker.id)).toBe(await pathOf(viaWebhook.id));
  });

  it("leaves an ordinary browser checkout alone", async () => {
    const p = await checkoutRow(user.id);
    await storage.completePayment(p.id, "pay_x", { completionPath: "browser" });
    expect(await pathOf(p.id)).toBe("browser");
  });

  it("leaves a webhook-settled browser checkout alone", async () => {
    const p = await checkoutRow(user.id);
    await storage.completePayment(p.id, "pay_x", { completionPath: "webhook" });
    expect(await pathOf(p.id)).toBe("webhook");
  });

  // A renewal the customer pays MANUALLY after a decline really does have a
  // browser, so the Purchase conversion really can observe it. `isRenewal` alone
  // must therefore NOT trigger the override — only `autopay`, which means "we
  // debited a stored mandate".
  it("keeps a manually-paid renewal in the browser bucket", async () => {
    const p = await checkoutRow(user.id, { isRenewal: true });
    await storage.completePayment(p.id, "pay_x", { completionPath: "browser" });
    expect(await pathOf(p.id)).toBe("browser");
  });

  it("does not disturb the existing metadata the row carries", async () => {
    const p = await renewalRow(user.id);
    await storage.completePayment(p.id, "pay_x", { completionPath: "webhook" });
    const after = await storage.getPayment(p.id);
    expect(after.metadata.autopay).toBe(true);
    expect(after.metadata.isRenewal).toBe(true);
    expect(after.metadata.seats).toBe(5);
    expect(after.metadata.razorpay_order_id).toBe(p.metadata.razorpay_order_id);
  });

  // Billing semantics must be untouched: this is a diagnostic label, nothing else.
  it("changes no payment, credit or race semantics", async () => {
    const p = await renewalRow(user.id);
    const first = await storage.completePayment(p.id, "pay_x", { completionPath: "autopay" });
    expect(first.transitioned).toBe(true);
    expect(first.credited).toBe(false);          // SEATS never touch the credit ledger
    expect(first.payment.status).toBe(PAYMENT_STATUS.SUCCESS);

    // The loser of the race writes nothing and says so.
    const second = await storage.completePayment(p.id, "pay_y", { completionPath: "webhook" });
    expect(second.transitioned).toBe(false);
    expect(second.credited).toBe(false);
    expect(await pathOf(p.id)).toBe("autopay");   // not overwritten by the replay
    expect((await storage.getPayment(p.id)).transactionId).toBe("pay_x");
  });

  it("keeps both storage backends behaviourally in parity on the override", async () => {
    // Source-level parity is asserted in the ADS-001 suite; this asserts the
    // dbStorage branch expresses the SAME predicate, since only memoryStorage
    // can be exercised without a live Postgres (real-PG coverage is separate).
    const { readFile } = await import("node:fs/promises");
    const pg = await readFile(new URL("../../server/storage.js", import.meta.url), "utf8");
    const mem = await readFile(new URL("../../server/memoryStorage.js", import.meta.url), "utf8");
    const predicate = 'payment.metadata?.autopay === true ? "autopay" : completionPath';
    expect(pg).toContain(predicate);
    expect(mem).toContain(predicate);
  });
});
