// M45 — the two questions that decide whether seat billing may be switched on.
//
//   1. Does activation take anything away from an existing customer?
//   2. Does a customer who pays actually receive something?
//
// The launch audit found the answer to (2) was NO under the live configuration,
// and that fixing it would have broken (1). These tests pin both, because they
// are in tension: the free floor is what protects existing teams AND what makes
// a purchase worthless, and only the migration window lets one move without the
// other breaking.

import { describe, it, expect } from "vitest";
import {
  resolveSeatEntitlement, legacyProtectionFloor, parseTimestampSetting,
  DEFAULT_FREE_FLOOR, SEAT_SOURCE, SEAT_SETTING_KEYS,
} from "../../shared/seatEntitlement.js";
import { storage } from "../../server/storage.js";
import { MAX_TEAM_MEMBERS } from "../../shared/schema.js";
import { SELF_SERVE_MAX_SEATS } from "../../shared/pricing.js";

const PAID_PLANS = ["trial", "starter", "growth", "scale"];
const sub = (seats) => ({ id: "s1", status: "ACTIVE", seats, grandfatheredSeats: 0, grandfatheredUntil: null });

describe("activation is entitlement-neutral at the shipped free floor", () => {
  it.each(PAID_PLANS)("a %s workspace loses nothing when the flag flips", (plan) => {
    const before = resolveSeatEntitlement({ effectivePlan: plan, billingEnabled: false });
    const after = resolveSeatEntitlement({
      effectivePlan: plan, billingEnabled: true, freeFloor: DEFAULT_FREE_FLOOR,
    });
    expect(after.seats).toBeGreaterThanOrEqual(before.seats);
  });

  it("enterprise stays unlimited on both sides of the flag", () => {
    for (const billingEnabled of [false, true]) {
      const e = resolveSeatEntitlement({ effectivePlan: "enterprise", billingEnabled });
      expect(e.unlimited).toBe(true);
      expect(e.source).toBe(SEAT_SOURCE.ENTERPRISE);
    }
  });
});

describe("THE DEFECT — at freeFloor 25 the seat product delivers nothing", () => {
  // This is why activation was withheld. It is kept as a live test rather than a
  // comment so that if anyone raises the floor back to the legacy allowance while
  // seats are on sale, the suite says so instead of the customers.
  it("buying any self-serve quantity grants no more than not buying", () => {
    const free = resolveSeatEntitlement({
      effectivePlan: "starter", billingEnabled: true, freeFloor: DEFAULT_FREE_FLOOR,
    }).seats;
    for (const paid of [1, 5, 10, SELF_SERVE_MAX_SEATS]) {
      const bought = resolveSeatEntitlement({
        subscription: sub(paid), effectivePlan: "starter",
        billingEnabled: true, freeFloor: DEFAULT_FREE_FLOOR,
      }).seats;
      expect(bought).toBe(free);
    }
  });

  it("names the arithmetic, so the fix is a config change and not a code hunt", () => {
    // The floor equals the legacy allowance equals the self-serve ceiling. While
    // all three are 25, max(paid, floor) can never exceed the floor.
    expect(DEFAULT_FREE_FLOOR).toBe(MAX_TEAM_MEMBERS.free);
    expect(SELF_SERVE_MAX_SEATS).toBe(DEFAULT_FREE_FLOOR);
  });
});

describe("the migration window lets the floor drop without shrinking live teams", () => {
  const ACTIVATED = new Date("2026-08-01T00:00:00Z");
  const UNTIL = new Date("2027-08-01T00:00:00Z");
  const OLD = new Date("2026-05-01T00:00:00Z");   // existed before activation
  const NEW = new Date("2026-09-01T00:00:00Z");   // joined after
  const window = { activatedAt: ACTIVATED, grandfatherUntil: UNTIL, freeFloor: 1, billingEnabled: true };

  it("an existing workspace keeps its pre-billing allowance after the floor drops to 1", () => {
    const e = resolveSeatEntitlement({ ...window, effectivePlan: "starter", workspaceCreatedAt: OLD, now: new Date("2026-09-01T00:00:00Z") });
    expect(e.seats).toBe(MAX_TEAM_MEMBERS.starter);
    expect(e.source).toBe(SEAT_SOURCE.LEGACY_PROTECTED);
  });

  it("a workspace created after activation gets the new floor — it was never promised the old model", () => {
    const e = resolveSeatEntitlement({ ...window, effectivePlan: "starter", workspaceCreatedAt: NEW, now: new Date("2026-10-01T00:00:00Z") });
    expect(e.seats).toBe(1);
    expect(e.source).toBe(SEAT_SOURCE.FREE_FLOOR);
  });

  it("protection ends when the window closes", () => {
    const e = resolveSeatEntitlement({ ...window, effectivePlan: "starter", workspaceCreatedAt: OLD, now: new Date("2027-08-02T00:00:00Z") });
    expect(e.seats).toBe(1);
  });

  it("a protected workspace that BUYS more seats gets what it paid for", () => {
    // The whole point: protection is a floor, never a ceiling. A customer who
    // outgrows the legacy allowance must still be able to buy past it.
    const e = resolveSeatEntitlement({ ...window, subscription: sub(40), effectivePlan: "starter", workspaceCreatedAt: OLD, now: new Date("2026-09-01T00:00:00Z") });
    expect(e.seats).toBe(40);
    expect(e.source).toBe(SEAT_SOURCE.SUBSCRIPTION);
  });

  it("and paying BELOW the protected floor never costs them seats", () => {
    const e = resolveSeatEntitlement({ ...window, subscription: sub(3), effectivePlan: "starter", workspaceCreatedAt: OLD, now: new Date("2026-09-01T00:00:00Z") });
    expect(e.seats).toBe(MAX_TEAM_MEMBERS.starter);
  });
});

describe("the window fails closed, and the anchor is stamped by the system", () => {
  // M47 — an unconfigured window disables protection rather than guessing. Making
  // protection the default was tried and rejected: it hands the full plan
  // allowance to any workspace whose creation date is unknown, so a paid 3-seat
  // workspace resolves to 25 and seat billing is silently neutered.
  //
  // The ordering hazard that motivated it (floor lowered, flag flipped, window
  // forgotten) is closed in getSeatCommerceConfig instead: the activation
  // timestamp is written by the system the first time billing is observed
  // enabled, so it cannot be missing at the moment it matters.
  it.each([
    ["no activation timestamp", { grandfatherUntil: new Date("2027-01-01") }],
    ["no window end", { activatedAt: new Date("2026-01-01") }],
    ["nothing configured at all", {}],
  ])("%s disables protection rather than guessing", (_label, opts) => {
    expect(legacyProtectionFloor({
      effectivePlan: "starter", workspaceCreatedAt: new Date("2025-01-01"), ...opts,
    })).toBe(0);
  });

  it("an unknown workspace creation date disables protection", () => {
    expect(legacyProtectionFloor({
      effectivePlan: "starter", workspaceCreatedAt: null,
      activatedAt: new Date("2026-01-01"), grandfatherUntil: new Date("2027-01-01"),
    })).toBe(0);
  });

  it("a corrupt timestamp setting parses to null, not to Invalid Date", () => {
    expect(parseTimestampSetting("not-a-date")).toBeNull();
    expect(parseTimestampSetting("")).toBeNull();
    expect(parseTimestampSetting(null)).toBeNull();
    expect(parseTimestampSetting("2026-08-01T00:00:00Z")).toBeInstanceOf(Date);
  });

  it("an unknown plan contributes no protected floor", () => {
    expect(legacyProtectionFloor({
      effectivePlan: "nonexistent", workspaceCreatedAt: new Date("2025-01-01"),
      activatedAt: new Date("2026-01-01"), grandfatherUntil: new Date("2027-01-01"),
    })).toBe(0);
  });

  it("enterprise (Infinity) contributes no numeric floor — it is handled earlier", () => {
    expect(legacyProtectionFloor({
      effectivePlan: "enterprise", workspaceCreatedAt: new Date("2025-01-01"),
      activatedAt: new Date("2026-01-01"), grandfatherUntil: new Date("2027-01-01"),
    })).toBe(0);
  });
});

describe("the mechanism is inert until it is configured", () => {
  it("changes nothing for anyone while the settings are unset — today's state", () => {
    for (const plan of PAID_PLANS) {
      const e = resolveSeatEntitlement({ effectivePlan: plan, billingEnabled: true, freeFloor: DEFAULT_FREE_FLOOR });
      expect(e.seats).toBe(DEFAULT_FREE_FLOOR);
      expect(e.source).toBe(SEAT_SOURCE.FREE_FLOOR);
    }
  });
});

describe("DEC-1: seat_free_floor = 0 — the shipped commercial decision", () => {
  const ACTIVATED = new Date("2026-08-01T00:00:00Z");
  const UNTIL = new Date("2027-08-01T00:00:00Z");
  const configured = { billingEnabled: true, freeFloor: 0, activatedAt: ACTIVATED, grandfatherUntil: UNTIL };

  it("a BRAND-NEW workspace gets zero collaborator seats — charging starts at the first teammate", () => {
    const e = resolveSeatEntitlement({
      ...configured, effectivePlan: "starter",
      workspaceCreatedAt: new Date("2026-09-01T00:00:00Z"),
      now: new Date("2026-09-02T00:00:00Z"),
    });
    expect(e.seats).toBe(0);
    expect(e.source).toBe(SEAT_SOURCE.FREE_FLOOR);
  });

  it("buying one seat grants exactly one — the defect Audit 196 found is gone", () => {
    const bought = resolveSeatEntitlement({
      ...configured, subscription: sub(1), effectivePlan: "starter",
      workspaceCreatedAt: new Date("2026-09-01T00:00:00Z"),
      now: new Date("2026-09-02T00:00:00Z"),
    });
    expect(bought.seats).toBe(1);
    expect(bought.source).toBe(SEAT_SOURCE.SUBSCRIPTION);
  });

  it.each([1, 2, 5, 10, 25])("paying for %i seats grants %i, not the floor", (n) => {
    const e = resolveSeatEntitlement({
      ...configured, subscription: sub(n), effectivePlan: "starter",
      workspaceCreatedAt: new Date("2026-09-01T00:00:00Z"),
      now: new Date("2026-09-02T00:00:00Z"),
    });
    expect(e.seats).toBe(n);
  });

  it("an EXISTING workspace is untouched by the floor drop", () => {
    const e = resolveSeatEntitlement({
      ...configured, effectivePlan: "starter",
      workspaceCreatedAt: new Date("2026-05-01T00:00:00Z"), // predates activation
      now: new Date("2026-09-02T00:00:00Z"),
    });
    expect(e.seats).toBe(MAX_TEAM_MEMBERS.starter);
    expect(e.source).toBe(SEAT_SOURCE.LEGACY_PROTECTED);
  });

  it("the floor of 0 is inert while billing is off — today's production state", () => {
    for (const plan of PAID_PLANS) {
      const e = resolveSeatEntitlement({ effectivePlan: plan, billingEnabled: false, freeFloor: 0 });
      expect(e.seats).toBe(MAX_TEAM_MEMBERS[plan]);
      expect(e.source).toBe(SEAT_SOURCE.LEGACY_PLAN);
    }
  });
});

describe("M47 — the activation anchor is stamped by the system, not an operator", () => {
  // The hazard this removes: with the free floor at 0, enabling billing before
  // anyone sets seat_billing_activated_at would drop every existing workspace to
  // zero collaborator seats. Requiring three settings in the right order before a
  // fourth is a runbook; this is a mechanism.
  const KEYS = SEAT_SETTING_KEYS;

  async function reset({ enabled, activatedAt }) {
    await storage.setPlatformSetting(KEYS.BILLING_ENABLED, enabled);
    await storage.setPlatformSetting(KEYS.ACTIVATED_AT, activatedAt ?? "");
  }

  it("does NOT stamp while billing is off — today's production state", async () => {
    await reset({ enabled: "false", activatedAt: "" });
    const cfg = await storage.getSeatCommerceConfig();
    expect(cfg.billingEnabled).toBe(false);
    expect(cfg.activatedAt).toBeNull();
    expect((await storage.getPlatformSetting(KEYS.ACTIVATED_AT))?.value || "").toBe("");
  });

  it("stamps the moment billing is first observed enabled", async () => {
    await reset({ enabled: "true", activatedAt: "" });
    const before = Date.now();
    const cfg = await storage.getSeatCommerceConfig();
    expect(cfg.activatedAt).toBeInstanceOf(Date);
    expect(cfg.activatedAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    // ...and persists it, so the next process sees the same instant.
    expect((await storage.getPlatformSetting(KEYS.ACTIVATED_AT))?.value).toBeTruthy();
  });

  it("never re-stamps — the anchor is written once and only once", async () => {
    await reset({ enabled: "true", activatedAt: "" });
    const first = (await storage.getSeatCommerceConfig()).activatedAt;
    await new Promise(r => setTimeout(r, 5));
    const second = (await storage.getSeatCommerceConfig()).activatedAt;
    expect(second.getTime()).toBe(first.getTime());
  });

  it("respects an anchor an operator set deliberately", async () => {
    const chosen = "2026-06-01T00:00:00.000Z";
    await reset({ enabled: "true", activatedAt: chosen });
    const cfg = await storage.getSeatCommerceConfig();
    expect(cfg.activatedAt.toISOString()).toBe(chosen);
  });

  it("so an existing workspace is protected even if nobody set the anchor", async () => {
    await reset({ enabled: "true", activatedAt: "" });
    await storage.setPlatformSetting(KEYS.FREE_FLOOR, "0");
    await storage.setPlatformSetting(KEYS.GRANDFATHER_UNTIL, "2099-01-01T00:00:00.000Z");
    const cfg = await storage.getSeatCommerceConfig();
    const e = resolveSeatEntitlement({
      effectivePlan: "starter", ...cfg,
      workspaceCreatedAt: new Date("2025-01-01"), // predates the stamped anchor
    });
    expect(e.seats).toBe(MAX_TEAM_MEMBERS.starter);
    expect(e.source).toBe(SEAT_SOURCE.LEGACY_PROTECTED);
    // Restore the shipped state so no later test inherits an enabled flag.
    await storage.setPlatformSetting(KEYS.BILLING_ENABLED, "false");
    await storage.setPlatformSetting(KEYS.FREE_FLOOR, "25");
  });
});
