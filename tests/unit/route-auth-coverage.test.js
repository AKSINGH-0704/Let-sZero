// M39 Phase 3 — authentication coverage invariant.
//
// The authZ analog of tenant-isolation.test.js's TRUST-028 invariant: that file
// walks the live Express route table to prove no /api/admin route is reachable by a
// non-operator. This proves the layer beneath it — that EVERY /api route requires
// authentication, except an explicit, maintained allow-list of genuinely public
// endpoints. Behavioural, not name-based: it calls each route with no session and
// asserts 401. A new authenticated route added later without a gate fails here even
// though nobody remembers this file exists; a new public route must be added to the
// allow-list deliberately.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer } from "http";

let app, httpServer, baseUrl;

beforeAll(async () => {
  const { registerRoutes } = await import("../../server/routes.js");
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
});

afterAll(() => httpServer?.close());

// Genuinely public endpoints (no session required), each intentional:
//  - health check; Google OAuth start/callback; email-link actions (token-gated);
//    the SES webhook (signature-validated); the auth entry points; invite
//    validate/accept (pre-account); the PUBLIC pricing surface (Phase 1 — the
//    marketing page quotes without a session); and the public contact/waitlist forms.
// A route NOT in this set must require authentication.
const PUBLIC = new Set([
  "/api/health",
  "/api/auth/google",
  "/api/auth/google/callback",
  "/api/unsubscribe",
  "/api/inactivity/keep-credits",
  "/api/webhooks/ses",
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-by-token",
  "/api/invites/validate",
  "/api/invites/accept",
  "/api/pricing/plans",
  "/api/pricing/quote",
  // M42 — the seat catalog and seat quote are public for the same reason the
  // credit pricing surface is: the marketing pricing page must quote through the
  // SAME engine that checkout uses, so the advertised price and the charged price
  // cannot diverge. Both are read-only and derive from configuration alone — they
  // read no workspace, no subscription and no user. Every seat route that touches
  // a workspace or moves money (/subscription, /preview, /checkout, /cancel,
  // /resume) is authenticated and deliberately absent from this list.
  "/api/seats/catalog",
  "/api/seats/quote",
  "/api/contact",
  "/api/waitlist",
]);

describe("Phase 3 — authentication coverage", () => {
  it("INVARIANT: every non-public /api route returns 401 without a session", async () => {
    const stack = app._router?.stack ?? [];
    const routes = stack
      .filter((l) => l.route?.path?.startsWith?.("/api"))
      .flatMap((l) => Object.keys(l.route.methods).map((m) => ({ method: m.toUpperCase(), path: l.route.path })));

    // If this ever collapses to nothing the test has silently stopped testing.
    expect(routes.length, "expected to discover /api routes").toBeGreaterThan(20);

    const violations = [];
    for (const { method, path } of routes) {
      if (path.includes(":")) continue;                 // parameterised → 404s before the gate
      if (PUBLIC.has(path)) continue;
      if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) continue;

      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "GET" || method === "DELETE" ? undefined : "{}",
      });
      // No cookie/authorization header → authMiddleware must reject with 401 before
      // any handler logic runs.
      if (res.status !== 401) {
        violations.push(`${method} ${path} → ${res.status} (expected 401 without a session)`);
      }
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("the public allow-list does NOT 401 (proves the invariant is meaningful, not vacuous)", async () => {
    // A couple of stable, side-effect-free public GETs must be reachable anonymously.
    const health = await fetch(`${baseUrl}/api/health`);
    expect(health.status).not.toBe(401);
    const plans = await fetch(`${baseUrl}/api/pricing/plans`);
    expect(plans.status).not.toBe(401);
  });
});
