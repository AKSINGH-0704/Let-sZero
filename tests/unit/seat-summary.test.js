// M41 — seat intelligence math (computeSeatState).
//
// Pins the plain-language seat messaging and the numbers behind it, so every
// surface that shows seats reads consistently and can never disagree with the
// server's enforcement rule (only ACTIVE members occupy a seat; owner excluded;
// Enterprise unlimited). Pure function — no DOM needed.

import { describe, it, expect } from "vitest";
import { computeSeatState } from "@/components/teams/SeatSummary";

describe("computeSeatState", () => {
  it("reports remaining seats for a normal, non-full workspace", () => {
    const s = computeSeatState(5, 25);
    expect(s.used).toBe(5);
    expect(s.included).toBe(25);
    expect(s.remaining).toBe(20);
    expect(s.full).toBe(false);
    expect(s.tone).toBe("ok");
    expect(s.message).toBe("20 seats remaining");
    expect(Math.round(s.pct)).toBe(20);
  });

  it("warns when few seats remain (<=3)", () => {
    expect(computeSeatState(23, 25).message).toBe("2 seats remaining");
    expect(computeSeatState(23, 25).tone).toBe("warn");
  });

  it("uses the singular 'Only 1 seat left' message", () => {
    const s = computeSeatState(24, 25);
    expect(s.message).toBe("Only 1 seat left");
    expect(s.tone).toBe("warn");
  });

  it("reports a full workspace (no silent overflow)", () => {
    const s = computeSeatState(25, 25);
    expect(s.full).toBe(true);
    expect(s.remaining).toBe(0);
    expect(s.tone).toBe("full");
    expect(s.message).toBe("All seats are in use");
  });

  it("never reports negative remaining if somehow over the limit", () => {
    const s = computeSeatState(30, 25);
    expect(s.remaining).toBe(0);
    expect(s.full).toBe(true);
  });

  it("treats Enterprise (Infinity) as unlimited", () => {
    const s = computeSeatState(120, Infinity);
    expect(s.unlimited).toBe(true);
    expect(s.message).toBe("Unlimited seats");
    expect(s.full).toBe(false);
  });
});
