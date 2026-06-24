import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const typeCounts = (await pool.query(`
  SELECT event_type, COUNT(*)::int AS count
  FROM sns_events GROUP BY event_type ORDER BY count DESC
`)).rows;
console.log("SNS event_type counts:", JSON.stringify(typeCounts));
const processed = (await pool.query(`
  SELECT processed, COUNT(*)::int AS count FROM sns_events GROUP BY processed
`)).rows;
console.log("Processed state:", JSON.stringify(processed));
await pool.end();
