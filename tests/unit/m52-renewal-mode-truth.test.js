// M52 — `renewalMode` must be true BEFORE the first purchase, not just after it.
//
// M44 withheld a launch because the seat page promised "Next charge ₹X on <date>"
// for a system that could not charge anyone, and fixed it by centralising the
// fact into ONE projected field. M51 changed what fills that field in for a
// workspace that already has a subscription.
//
// Nobody had asked what the field says BEFORE the first purchase. It fell back to
// the frozen platform constant and answered MANUAL. While a mandate could only be
// created after a subscription existed, that was correct. M52 makes AutoPay part
// of checkout — so a first-time buyer inside the rollout renews automatically,
// and the pre-purchase answer became the one thing M44 exists to prevent: a
// sentence about money that is not true of the system that will run.
//
// The property under test is agreement: the answer given BEFORE the purchase must
// come from the SAME gate that decides what happens DURING the purchase.

import { describe, it, expect } from "vitest";
import {
  prospectiveRenewalMode, autopayAllowedFor, rolloutBucket,
  AUTOPAY_SCOPE, DEFAULT_AUTOPAY_SCOPE,
} from "../../shared/autopay.js";
import { RENEWAL_MODE } from "../../shared/subscriptionStateMachine.js";

const cfg = (scope, over = {}) => ({ scope, allowlist: [], limitPct: 0, ...over });
const WS = "workspace-root-abc";

describe("the pre-purchase answer agrees with the rollout gate", () => {
  it("is AUTOMATIC exactly when the workspace is inside the rollout", () => {
    for (const scope of Object.values(AUTOPAY_SCOPE)) {
      const c = cfg(scope, { allowlist: [WS], limitPct: 100 });
      const expected = autopayAllowedFor(WS, c) ? RENEWAL_MODE.AUTOMATIC : RENEWAL_MODE.MANUAL;
      expect(prospectiveRenewalMode(WS, c), `scope=${scope}`).toBe(expected);
    }
  });

  it("agrees with the gate for a workspace NOT on the allowlist", () => {
    for (const scope of Object.values(AUTOPAY_SCOPE)) {
      const c = cfg(scope, { allowlist: ["someone-else"], limitPct: 0 });
      const expected = autopayAllowedFor(WS, c) ? RENEWAL_MODE.AUTOMATIC : RENEWAL_MODE.MANUAL;
      expect(prospectiveRenewalMode(WS, c), `scope=${scope}`).toBe(expected);
    }
  });

  it("follows the LIMITED percentage bucket rather than guessing", () => {
    const bucket = rolloutBucket(WS);
    // Just inside, and just outside, this workspace's own deterministic bucket.
    expect(prospectiveRenewalMode(WS, cfg(AUTOPAY_SCOPE.LIMITED, { limitPct: bucket + 1 })))
      .toBe(RENEWAL_MODE.AUTOMATIC);
    expect(prospectiveRenewalMode(WS, cfg(AUTOPAY_SCOPE.LIMITED, { limitPct: bucket })))
      .toBe(RENEWAL_MODE.MANUAL);
  });
});

describe("it fails toward not promising a charge", () => {
  // The direction matters and is not symmetric. Promising an automatic charge
  // that never happens costs the customer their team at the end of a grace
  // window they were never told about; an unnecessary reminder costs them
  // nothing. Every unknown must therefore land on MANUAL.
  it("answers MANUAL when the rollout is OFF", () => {
    expect(prospectiveRenewalMode(WS, cfg(AUTOPAY_SCOPE.OFF))).toBe(RENEWAL_MODE.MANUAL);
  });

  it("answers MANUAL for absent, empty or malformed config", () => {
    for (const bad of [undefined, null, {}, { scope: "NONSENSE" }, { scope: null }]) {
      expect(prospectiveRenewalMode(WS, bad)).toBe(RENEWAL_MODE.MANUAL);
    }
  });

  it("answers MANUAL when the workspace id is missing", () => {
    for (const bad of [undefined, null, ""]) {
      expect(prospectiveRenewalMode(bad, cfg(AUTOPAY_SCOPE.GA))).toBe(RENEWAL_MODE.MANUAL);
    }
  });

  it("defaults to a closed gate", () => {
    expect(DEFAULT_AUTOPAY_SCOPE).toBe(AUTOPAY_SCOPE.OFF);
  });
});

describe("the subscription API no longer answers from a frozen constant", () => {
  it("does not read CURRENT_RENEWAL_MODE for the pre-purchase answer", async () => {
    const { readFile } = await import("fs/promises");
    const src = await readFile(new URL("../../server/routes.js", import.meta.url), "utf8");
    // The constant described a platform-wide truth that no longer exists: two
    // workspaces on the same build can now legitimately get different answers.
    expect(src).not.toContain("CURRENT_RENEWAL_MODE");
    expect(src).toContain("prospectiveRenewalMode(rootId, autopayConfig)");
  });
});
