/**
 * DEV-002 — stop local development connecting to the production database.
 *
 * The hazard was real and live: `.env` in the repo root carried the production
 * Railway DATABASE_URL, server/env.js loads `.env` into process.env on startup,
 * and server/db.js connected whenever DATABASE_URL was merely non-empty and not
 * a placeholder. `isProduction` was computed in db.js and then never used in the
 * decision. So `npm run dev` on a developer machine attached to production
 * Postgres, silently, with full write access.
 *
 * The guard is fail-closed: outside production, a DATABASE_URL pointing at a
 * non-local host aborts startup rather than connecting. Overriding it requires
 * setting ALLOW_REMOTE_DB explicitly, so reaching production from a dev machine
 * is always a deliberate act that leaves a trace in the shell history.
 *
 * Deliberately keyed on NODE_ENV rather than any hostname heuristic about the
 * machine: NODE_ENV is the one signal that is unambiguous, already set correctly
 * by the Railway start command, and already used elsewhere in this codebase.
 */

// Hosts that can only ever be a developer's own machine or a local container.
const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "host.docker.internal",
  "postgres", // docker-compose service names
  "db",
]);

/**
 * Classifies a connection string by where it points, without logging or
 * returning any credential material.
 */
export function classifyDatabaseUrl(databaseUrl) {
  if (!databaseUrl || databaseUrl.trim() === "") return { kind: "none" };
  // Mirrors db.js's existing placeholder detection so the two agree on what
  // "not a real database" means.
  if (databaseUrl.includes("placeholder") || databaseUrl.includes("your-")) {
    return { kind: "placeholder" };
  }
  let host;
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    return { kind: "unparseable" };
  }
  return { kind: LOCAL_HOSTS.has(host) ? "local" : "remote", host };
}

/**
 * Throws if a non-production process is pointed at a remote database.
 * Returns a small result object describing what was allowed and why, so the
 * caller can log it without re-deriving the reasoning.
 */
export function assertDatabaseTargetIsSafe({
  databaseUrl = process.env.DATABASE_URL,
  nodeEnv = process.env.NODE_ENV,
  allowRemote = process.env.ALLOW_REMOTE_DB,
} = {}) {
  const target = classifyDatabaseUrl(databaseUrl);

  // In production, a remote database is the entire point.
  if (nodeEnv === "production") return { allowed: true, reason: "production", target };

  // Nothing to protect against: no URL, a placeholder, or a local host.
  if (target.kind !== "remote") return { allowed: true, reason: target.kind, target };

  const optedIn = allowRemote === "1" || allowRemote === "true" || allowRemote === "yes";
  if (optedIn) return { allowed: true, reason: "explicit ALLOW_REMOTE_DB opt-in", target, warn: true };

  throw new Error(
    [
      "",
      "  Refusing to start: this is not a production process, but DATABASE_URL points at a remote host.",
      `    NODE_ENV = ${nodeEnv ?? "(unset)"}`,
      `    database host = ${target.host}`,
      "",
      "  Connecting would run local development against a real, remote database.",
      "",
      "  Pick one:",
      "    1. Point at a local database. Create .env.local (gitignored, and it takes",
      "       precedence over .env):",
      "         DATABASE_URL=postgresql://postgres:postgres@localhost:5432/repmail_dev",
      "    2. Run with no database at all. .env.local with an empty value uses the",
      "       in-memory store, which is what server/db.js already falls back to:",
      "         DATABASE_URL=",
      "    3. You genuinely meant to reach the remote database. Say so explicitly:",
      "         ALLOW_REMOTE_DB=1 npm run dev",
      "",
    ].join("\n"),
  );
}
