import { readFileSync } from "fs";
import { resolve } from "path";
import { assertDatabaseTargetIsSafe } from "./databaseGuard.js";

/**
 * Loads environment files into process.env, then refuses to continue if a
 * non-production process is pointed at a remote database (DEV-002).
 *
 * Precedence, highest first:
 *   1. real environment variables (Railway sets these; never overwritten)
 *   2. .env.local   — a developer's own machine, gitignored
 *   3. .env         — the shared/default file
 *
 * Because the loader only assigns a key that is not already present, files are
 * read in precedence order and the first writer wins. .env.local existing at all
 * is the supported way to develop locally without editing the shared .env.
 */
function loadEnvFile(filename) {
  let contents;
  try {
    contents = readFileSync(resolve(process.cwd(), filename), "utf8");
  } catch {
    return; // absent is normal: Railway has no .env, most machines have no .env.local
  }
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

// Fail closed before anything opens a connection. server/index.js imports this
// module first, specifically so this runs ahead of db.js.
const dbTarget = assertDatabaseTargetIsSafe();
if (dbTarget.warn) {
  console.warn(
    `[DB-GUARD] ALLOW_REMOTE_DB is set: connecting to remote host "${dbTarget.target.host}" with NODE_ENV=${process.env.NODE_ENV ?? "(unset)"}. This is not a production process.`,
  );
}
