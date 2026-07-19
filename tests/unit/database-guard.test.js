// DEV-002 — the guard that stops local development reaching production Postgres.
//
// The hazard this encodes was live: `.env` carried the production Railway
// DATABASE_URL, server/env.js loads it, and db.js connected on any non-empty,
// non-placeholder value. db.js computed `isProduction` and never used it, so
// `npm run dev` attached to production with write access.

import { describe, it, expect } from "vitest";
import { classifyDatabaseUrl, assertDatabaseTargetIsSafe } from "../../server/databaseGuard.js";

const REMOTE = "postgresql://user:pw@hopper.proxy.rlwy.net:5432/railway";
const LOCAL = "postgresql://postgres:postgres@localhost:5432/repmail_dev";

describe("classifyDatabaseUrl", () => {
  it("recognises local hosts", () => {
    for (const host of ["localhost", "127.0.0.1", "host.docker.internal", "postgres", "db"]) {
      expect(classifyDatabaseUrl(`postgresql://u:p@${host}:5432/x`).kind).toBe("local");
    }
  });

  it("treats anything else as remote and reports the host without credentials", () => {
    const r = classifyDatabaseUrl(REMOTE);
    expect(r.kind).toBe("remote");
    expect(r.host).toBe("hopper.proxy.rlwy.net");
    expect(JSON.stringify(r)).not.toContain("pw");
  });

  it("agrees with db.js on what is not a real database", () => {
    expect(classifyDatabaseUrl("").kind).toBe("none");
    expect(classifyDatabaseUrl(undefined).kind).toBe("none");
    expect(classifyDatabaseUrl("postgresql://placeholder").kind).toBe("placeholder");
    expect(classifyDatabaseUrl("postgresql://your-db-here").kind).toBe("placeholder");
  });

  it("does not throw on a malformed value", () => {
    expect(classifyDatabaseUrl("not a url").kind).toBe("unparseable");
  });
});

describe("assertDatabaseTargetIsSafe", () => {
  it("BLOCKS a remote database outside production — the actual DEV-002 scenario", () => {
    expect(() =>
      assertDatabaseTargetIsSafe({ databaseUrl: REMOTE, nodeEnv: "development", allowRemote: undefined }),
    ).toThrow(/Refusing to start/);
  });

  it("blocks when NODE_ENV is unset, which is how `npm run dev` and most scripts run", () => {
    expect(() => assertDatabaseTargetIsSafe({ databaseUrl: REMOTE, nodeEnv: undefined })).toThrow(/Refusing to start/);
  });

  it("names the host and offers concrete remedies in the error", () => {
    let msg = "";
    try {
      assertDatabaseTargetIsSafe({ databaseUrl: REMOTE, nodeEnv: "development" });
    } catch (e) {
      msg = e.message;
    }
    expect(msg).toContain("hopper.proxy.rlwy.net");
    expect(msg).toContain(".env.local");
    expect(msg).toContain("ALLOW_REMOTE_DB=1");
    // never echo credentials back to the terminal
    expect(msg).not.toContain("pw");
  });

  it("allows a remote database in production, which is the normal Railway path", () => {
    const r = assertDatabaseTargetIsSafe({ databaseUrl: REMOTE, nodeEnv: "production" });
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe("production");
  });

  it("allows a local database in development", () => {
    expect(assertDatabaseTargetIsSafe({ databaseUrl: LOCAL, nodeEnv: "development" }).allowed).toBe(true);
  });

  it("allows no database at all, which falls back to the in-memory store", () => {
    expect(assertDatabaseTargetIsSafe({ databaseUrl: "", nodeEnv: "development" }).allowed).toBe(true);
  });

  it("allows remote in development only with an explicit opt-in, and flags it for logging", () => {
    for (const v of ["1", "true", "yes"]) {
      const r = assertDatabaseTargetIsSafe({ databaseUrl: REMOTE, nodeEnv: "development", allowRemote: v });
      expect(r.allowed).toBe(true);
      expect(r.warn).toBe(true);
    }
  });

  it("does not treat an arbitrary truthy string as opt-in", () => {
    expect(() =>
      assertDatabaseTargetIsSafe({ databaseUrl: REMOTE, nodeEnv: "development", allowRemote: "maybe" }),
    ).toThrow(/Refusing to start/);
  });
});
