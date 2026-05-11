/**
 * Database Connection Module
 * ==========================
 * Automatically switches between:
 * - PRODUCTION: Real PostgreSQL via Drizzle ORM
 * - DEV MODE: In-memory storage (when DATABASE_URL is empty or NODE_ENV !== production)
 */

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema.js";

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === "production";
const hasRealDatabase = process.env.DATABASE_URL && 
                        process.env.DATABASE_URL !== "" && 
                        !process.env.DATABASE_URL.includes("placeholder") &&
                        !process.env.DATABASE_URL.includes("your-");

export const isDevMode = !hasRealDatabase;

let db = null;
let pool = null;

if (hasRealDatabase) {
  // PRODUCTION MODE: Use real PostgreSQL
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    db = drizzle(pool, { schema });
    console.log("[PRODUCTION MODE] Connected to PostgreSQL database");
  } catch (err) {
    console.error("[ERROR] Failed to connect to PostgreSQL:", err.message);
    console.log("[FALLBACK] Switching to DEV mode with in-memory storage");
  }
} else {
  // DEV MODE: No real database
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  DEV MODE ACTIVE - In-Memory Storage");
  console.log("  • No real database connected");
  console.log("  • All data persists only during this session");
  console.log("  • To use real PostgreSQL, set DATABASE_URL in .env");
  console.log("═══════════════════════════════════════════════════════════════");
}

export { db, pool };
