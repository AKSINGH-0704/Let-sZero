import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const users = (await pool.query(`
  SELECT
    COUNT(*)::int AS total_users,
    COUNT(*) FILTER (WHERE plan='free' AND is_active=true)::int AS free_users,
    COUNT(*) FILTER (WHERE plan='enterprise' AND is_active=true)::int AS enterprise_users,
    COUNT(*) FILTER (WHERE plan NOT IN ('free','enterprise') AND is_active=true)::int AS paid_plan_users,
    COUNT(*) FILTER (WHERE is_active=false)::int AS inactive_users,
    COUNT(*) FILTER (WHERE is_trial_user=false)::int AS free_plan_enabled_users,
    COUNT(*) FILTER (WHERE is_trial_user=true)::int AS legacy_trial_users
  FROM users
`)).rows[0];
console.log("USERS:", JSON.stringify(users));

const credits = (await pool.query(`
  SELECT
    SUM(credits_received)::int AS total_credits_received,
    SUM(credits_allocated)::int AS total_credits_allocated,
    SUM(credits_used)::int AS total_credits_used,
    SUM(credits_received - credits_allocated - credits_used)::int AS total_paid_balance,
    SUM(CASE WHEN plan='free' AND is_trial_user=false THEN 500 ELSE 0 END)::int AS monthly_free_capacity,
    SUM(trial_credits - trial_credits_used)::int AS legacy_trial_remaining
  FROM users
`)).rows[0];
console.log("CREDITS:", JSON.stringify(credits));

const campaigns = (await pool.query(`
  SELECT
    COUNT(*)::int AS total_campaigns,
    COUNT(*) FILTER (WHERE status='COMPLETED')::int AS completed,
    COUNT(*) FILTER (WHERE status='RUNNING')::int AS running,
    COUNT(*) FILTER (WHERE status='DRAFT')::int AS draft,
    COUNT(*) FILTER (WHERE status='FAILED')::int AS failed,
    SUM(total_emails)::int AS total_emails_targeted,
    SUM(sent_emails)::int AS total_sent,
    SUM(failed_emails)::int AS total_failed,
    SUM(skipped_emails)::int AS total_skipped,
    SUM(opened_emails)::int AS total_opened,
    SUM(clicked_emails)::int AS total_clicked,
    SUM(bounced_emails)::int AS total_bounced,
    SUM(complained_emails)::int AS total_complained,
    SUM(delivered_emails)::int AS total_delivered,
    SUM(credits_used)::int AS total_credits_consumed
  FROM campaigns
`)).rows[0];
console.log("CAMPAIGNS:", JSON.stringify(campaigns));

const sent = parseInt(campaigns.total_sent) || 0;
const rates = {
  open_rate_pct: sent > 0 ? ((parseInt(campaigns.total_opened)/sent)*100).toFixed(2) : "N/A",
  click_rate_pct: sent > 0 ? ((parseInt(campaigns.total_clicked)/sent)*100).toFixed(2) : "N/A",
  bounce_rate_pct: sent > 0 ? ((parseInt(campaigns.total_bounced)/sent)*100).toFixed(2) : "N/A",
  complaint_rate_pct: sent > 0 ? ((parseInt(campaigns.total_complained)/sent)*100).toFixed(2) : "N/A",
  delivery_rate_pct: sent > 0 ? ((parseInt(campaigns.total_delivered)/sent)*100).toFixed(2) : "N/A",
};
console.log("RATES:", JSON.stringify(rates));

const suppressions = (await pool.query(`
  SELECT
    COUNT(*)::int AS total_suppressions,
    COUNT(*) FILTER (WHERE source='bounce')::int AS bounces,
    COUNT(*) FILTER (WHERE source='complaint')::int AS complaints,
    COUNT(*) FILTER (WHERE source='unsubscribe')::int AS unsubscribes,
    COUNT(*) FILTER (WHERE source='manual')::int AS manual
  FROM suppressions
`)).rows[0];
console.log("SUPPRESSIONS:", JSON.stringify(suppressions));

const sns = (await pool.query(`
  SELECT
    COUNT(*)::int AS total_sns_events,
    COUNT(*) FILTER (WHERE event_type='Bounce')::int AS bounces,
    COUNT(*) FILTER (WHERE event_type='Complaint')::int AS complaints,
    COUNT(*) FILTER (WHERE event_type='Delivery')::int AS deliveries,
    COUNT(*) FILTER (WHERE event_type LIKE 'Open%')::int AS opens,
    COUNT(*) FILTER (WHERE event_type LIKE 'Click%')::int AS clicks
  FROM sns_events
`)).rows[0];
console.log("SNS_EVENTS:", JSON.stringify(sns));

const pay = (await pool.query(`
  SELECT
    COUNT(*)::int AS total_payments,
    COUNT(*) FILTER (WHERE status IN ('SUCCESS','COMPLETED'))::int AS successful,
    COUNT(*) FILTER (WHERE status='FAILED')::int AS failed,
    COALESCE(SUM(CASE WHEN status IN ('SUCCESS','COMPLETED') THEN amount_inr ELSE 0 END),0)::int AS total_inr,
    COALESCE(SUM(CASE WHEN status IN ('SUCCESS','COMPLETED') THEN credits ELSE 0 END),0)::int AS total_credits_purchased
  FROM payments
`)).rows[0];
console.log("PAYMENTS:", JSON.stringify(pay));

const contacts = (await pool.query(`SELECT COUNT(*)::int AS total FROM contacts`)).rows[0];
console.log("CONTACTS:", JSON.stringify(contacts));
const templates = (await pool.query(`SELECT COUNT(*)::int AS total FROM templates`)).rows[0];
console.log("TEMPLATES:", JSON.stringify(templates));
const txns = (await pool.query(`
  SELECT COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE type='purchase')::int AS purchases,
    COUNT(*) FILTER (WHERE type='usage')::int AS usage,
    COUNT(*) FILTER (WHERE type='allocation')::int AS allocations,
    COUNT(*) FILTER (WHERE type='free_monthly_grant')::int AS free_grants
  FROM credit_transactions
`)).rows[0];
console.log("CREDIT_TXN:", JSON.stringify(txns));

await pool.end();
