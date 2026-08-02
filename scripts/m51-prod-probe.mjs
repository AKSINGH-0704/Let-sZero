// M51 production probe. Read-only unless --set-scope=<VALUE> is passed.
// Run via: railway run node scripts/m51-prod-probe.mjs
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) { console.error('NO DATABASE_URL'); process.exit(2); }
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const q = async (label, text, params = []) => {
  try {
    const r = await pool.query(text, params);
    console.log(`\n== ${label} ==\n` + JSON.stringify(r.rows, null, 1));
    return r.rows;
  } catch (e) {
    console.log(`\n== ${label} ==\nERROR: ${e.message}`);
    return null;
  }
};

const setScope = process.argv.find(a => a.startsWith('--set-scope='))?.split('=')[1];
const setAllow = process.argv.find(a => a.startsWith('--set-allowlist='))?.split('=')[1];

if (setScope || setAllow !== undefined) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (setAllow !== undefined) {
      await client.query(
        `INSERT INTO platform_settings (key, value, updated_at) VALUES ('seat_autopay_allowlist',$1,NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`, [setAllow]);
    }
    if (setScope) {
      await client.query(
        `INSERT INTO platform_settings (key, value, updated_at) VALUES ('seat_autopay_scope',$1,NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`, [setScope]);
    }
    await client.query('COMMIT');
    console.log(`\n== WROTE ==\nscope=${setScope ?? '(unchanged)'} allowlist=${setAllow ?? '(unchanged)'}`);
  } catch (e) { await client.query('ROLLBACK'); console.log('WRITE FAILED: ' + e.message); }
  finally { client.release(); }
}

await q('rollout settings', `select key, value, updated_at from platform_settings
  where key like 'seat_autopay%' or key = 'seat_billing_enabled' order by key`);
await q('m51 tables present', `select table_name from information_schema.tables
  where table_schema='public' and table_name in ('payment_mandates','webhook_events') order by 1`);
await q('subscription autopay columns', `select column_name from information_schema.columns
  where table_name='workspace_subscriptions' and (column_name like '%autopay%' or column_name like '%mandate%'
  or column_name like '%predebit%' or column_name like '%charge_error%') order by 1`);
await q('safety counters', `select
  (select count(*)::int from payment_mandates) as mandates,
  (select count(*)::int from workspace_subscriptions where autopay_enabled) as autopay_on,
  (select count(*)::int from webhook_events) as webhook_events`);
await q('subscriptions', `select id, workspace_root_id, status, term, seats, renewal_amount_minor,
  period_start, period_end, autopay_enabled, mandate_id, dunning_attempts
  from workspace_subscriptions order by created_at desc limit 10`);
await q('owner candidates', `select u.id, u.username, u.email, u.role
  from users u where u.parent_id is null order by u.created_at asc limit 10`);

await pool.end();
