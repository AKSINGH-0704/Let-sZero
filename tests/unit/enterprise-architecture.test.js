// M39 Phase 4 — the single enterprise-commerce architecture.
//
// Enterprise reuses the pricing spine (qualification), converges every entry point
// on one valid path, and models a deterministic, auditable lifecycle. These tests
// lock the entry-point validity (the bug Phase 4 fixed), qualification consistency
// with the pricing engine, the lifecycle state machine, and the central flags.

import { describe, it, expect } from "vitest";
import {
  ENTERPRISE_CONTACT_REASON, ENTERPRISE_CONTACT_PATH, buildEnterpriseContactPath,
  qualifyEnterprise, qualifiesForEnterprise,
  ENTERPRISE_STAGES, ENTERPRISE_TRANSITIONS, ENTERPRISE_TERMINAL_STAGES,
  canEnterpriseStageTransition, assertEnterpriseStageTransition, isEnterpriseStageTerminal,
  ENTERPRISE_FEATURES, hasEnterpriseFeature,
} from "../../shared/enterprise.js";
import { contactSubmissionSchema, CONTACT_REASONS } from "../../shared/schema.js";
import { MAX_SELF_SERVE_CREDITS, SELF_SERVE_MAX_SEATS } from "../../shared/pricing.js";

describe("enterprise entry point — one valid, converged path", () => {
  it("always uses a reason that is a real CONTACT_REASONS value", () => {
    expect(Object.values(CONTACT_REASONS)).toContain(ENTERPRISE_CONTACT_REASON);
    for (const path of [ENTERPRISE_CONTACT_PATH, buildEnterpriseContactPath({ plan: "Enterprise" })]) {
      const reason = new URLSearchParams(path.split("?")[1]).get("reason");
      expect(Object.values(CONTACT_REASONS)).toContain(reason);
    }
  });

  it("the canonical path would pass the contact submission schema (no more ENTERPRISE_PRICING)", () => {
    const reason = new URLSearchParams(ENTERPRISE_CONTACT_PATH.split("?")[1]).get("reason");
    const parsed = contactSubmissionSchema.safeParse({
      name: "Acme Corp", email: "buyer@acme.com", reason, message: "We need enterprise pricing for 200 seats.",
    });
    expect(parsed.success).toBe(true);
  });

  it("carries the enterprise intent and optional plan/context", () => {
    const p = new URLSearchParams(buildEnterpriseContactPath({ plan: "Scale", credits: 500000, seats: 80 }).split("?")[1]);
    expect(p.get("intent")).toBe("enterprise");
    expect(p.get("plan")).toBe("Scale");
    expect(p.get("credits")).toBe("500000");
    expect(p.get("seats")).toBe("80");
  });
});

describe("enterprise qualification — rule-based, consistent with the pricing engine", () => {
  const cases = [
    {},
    { credits: MAX_SELF_SERVE_CREDITS },              // at the cap → self-serve
    { credits: MAX_SELF_SERVE_CREDITS + 1 },          // above cap → enterprise
    { seats: SELF_SERVE_MAX_SEATS },                  // at the cap → self-serve
    { seats: SELF_SERVE_MAX_SEATS + 1 },              // above → enterprise
    { requiresSso: true },
    { requiresProcurement: true, credits: 1000 },
  ];
  it("qualifyEnterprise().qualified matches qualifiesForEnterprise() for every case", () => {
    for (const c of cases) {
      expect(qualifyEnterprise(c).qualified, JSON.stringify(c)).toBe(qualifiesForEnterprise(c));
    }
  });
  it("explains WHY (returns the triggering signals), not just a boolean", () => {
    expect(qualifyEnterprise({ credits: MAX_SELF_SERVE_CREDITS + 1 }).reasons).toContain("credits_above_self_serve_max");
    expect(qualifyEnterprise({ seats: SELF_SERVE_MAX_SEATS + 1 }).reasons).toContain("seats_above_self_serve_max");
    expect(qualifyEnterprise({ requiresSso: true }).reasons).toContain("requiresSso");
    expect(qualifyEnterprise({}).reasons).toEqual([]);
  });
  it("is not a single numeric limit — any hard signal qualifies regardless of size", () => {
    expect(qualifyEnterprise({ credits: 3000, requiresContract: true }).qualified).toBe(true);
  });
});

describe("enterprise lifecycle — deterministic, auditable state machine", () => {
  it("a lead advances lead→qualified→engaged→proposal→contract→provisioned", () => {
    const path = [
      ENTERPRISE_STAGES.LEAD, ENTERPRISE_STAGES.QUALIFIED, ENTERPRISE_STAGES.ENGAGED,
      ENTERPRISE_STAGES.PROPOSAL, ENTERPRISE_STAGES.CONTRACT, ENTERPRISE_STAGES.PROVISIONED,
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canEnterpriseStageTransition(path[i], path[i + 1]), `${path[i]}→${path[i + 1]}`).toBe(true);
    }
  });

  it("terminal stages admit no transitions; illegal edges are rejected", () => {
    for (const t of ENTERPRISE_TERMINAL_STAGES) {
      expect(isEnterpriseStageTerminal(t)).toBe(true);
      expect(ENTERPRISE_TRANSITIONS[t]).toEqual([]);
    }
    expect(canEnterpriseStageTransition(ENTERPRISE_STAGES.LEAD, ENTERPRISE_STAGES.PROVISIONED)).toBe(false); // no skipping
    expect(canEnterpriseStageTransition(ENTERPRISE_STAGES.PROVISIONED, ENTERPRISE_STAGES.LEAD)).toBe(false);
    expect(() => assertEnterpriseStageTransition(ENTERPRISE_STAGES.LOST, ENTERPRISE_STAGES.QUALIFIED)).toThrow(/Illegal enterprise stage transition/);
  });

  it("paused deals can re-engage", () => {
    expect(canEnterpriseStageTransition(ENTERPRISE_STAGES.QUALIFIED, ENTERPRISE_STAGES.PAUSED)).toBe(true);
    expect(canEnterpriseStageTransition(ENTERPRISE_STAGES.PAUSED, ENTERPRISE_STAGES.ENGAGED)).toBe(true);
  });
});

describe("enterprise features — centralized flags", () => {
  it("core enterprise capabilities are enabled; SSO is flagged-but-not-yet-enabled", () => {
    expect(hasEnterpriseFeature("unlimitedSeats")).toBe(true);
    expect(hasEnterpriseFeature("invoicing")).toBe(true);
    expect(hasEnterpriseFeature("procurement")).toBe(true);
    expect(hasEnterpriseFeature("dedicatedSupport")).toBe(true);
    expect(ENTERPRISE_FEATURES.sso).toBe(false); // "SSO / SAML (Soon)" on the pricing page
    expect(hasEnterpriseFeature("nonexistent")).toBe(false);
  });
});
