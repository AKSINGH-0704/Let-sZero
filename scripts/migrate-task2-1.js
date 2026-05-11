/**
 * Task 2.1 migration — contact deduplication
 * 1. Remove duplicate contacts, keeping the most recently created per (user_id, email)
 * 2. Add unique index contacts_user_email_unique on (user_id, email)
 *
 * Run once: node scripts/migrate-task2-1.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Manual .env parser (dotenv not in deps)
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$/);
    if (match) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  console.log("Connected to database");

  // 1. Count duplicates before
  const { rows: before } = await client.query(`
    SELECT COUNT(*) AS total, COUNT(DISTINCT (user_id, email)) AS unique_pairs
    FROM contacts
  `);
  console.log(`Before: ${before[0].total} rows, ${before[0].unique_pairs} unique (user_id, email) pairs`);

  // 2. Delete duplicates — keep the most recently created row per (user_id, email)
  const { rowCount: deleted } = await client.query(`
    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY user_id, email
               ORDER BY created_at DESC
             ) AS rn
      FROM contacts
    )
    DELETE FROM contacts
    WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
  `);
  console.log(`Deleted ${deleted} duplicate contact rows`);

  // 3. Add unique index (idempotent via IF NOT EXISTS)
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS contacts_user_email_unique
    ON contacts (user_id, email)
  `);
  console.log("Created unique index contacts_user_email_unique on (user_id, email)");

  // 4. Verify
  const { rows: after } = await client.query(`
    SELECT COUNT(*) AS total FROM contacts
  `);
  console.log(`After: ${after[0].total} rows remaining`);

  await client.end();
  console.log("Migration complete");
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  client.end().catch(() => {});
  process.exit(1);
});
