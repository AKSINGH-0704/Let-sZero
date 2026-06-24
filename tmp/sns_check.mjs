import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const cols = (await pool.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'sns_events' ORDER BY ordinal_position
`)).rows;
console.log("SNS columns:", cols.map(r => r.column_name));
const sample = (await pool.query(`SELECT * FROM sns_events LIMIT 3`)).rows;
console.log("Sample:", JSON.stringify(sample, null, 2));
const typeCounts = (await pool.query(`
  SELECT notification_type, COUNT(*)::int FROM sns_events
  GROUP BY notification_type ORDER BY count DESC
`)).rows;
console.log("Type counts:", JSON.stringify(typeCounts));
const total = (await pool.query(`SELECT COUNT(*)::int AS total FROM sns_events`)).rows[0];
console.log("Total:", total);
await pool.end();
