// M52 — validates that the LIVE Razorpay API accepts the EXACT order shape
// `server/routes.js` now constructs for a seat purchase that also registers an
// AutoPay instrument.
//
// Creating a customer and an UNPAID order moves NO money — an order is an
// intent, not a charge. This is the same discipline that found three
// production-only defects in Audit 211 and one in Audit 213, none of which any
// number of passing unit tests could have caught: a payload builder can only be
// validated by the system that consumes it.
//
// ── THE QUESTION THIS ANSWERS ───────────────────────────────────────────────
// Before M52, the token-bearing order carried `amount: 100` (1 rupee) purely to
// register a card, and was refunded afterwards. M52 folds that registration into
// the real purchase, so the SAME order now carries the actual first-period
// price. Nothing in Razorpay's contract couples the token block to the amount —
// but "nothing in the docs says otherwise" is exactly the reasoning that
// produced the last four gateway defects, so it is probed rather than assumed.
//
// Run:  railway run node scripts/m52-gateway-probe.mjs
//
// PASS  = probes [2]..[5] return `status=created`.
// FAIL  = any of them is rejected. If [2] fails, AutoPay-at-checkout cannot ship
//         as designed; the degradation path in startSeatPayment means customers
//         can still BUY, but nobody in the rollout would get automatic renewal,
//         and the rollout must be set to OFF until the payload is corrected.

import Razorpay from 'razorpay';
import crypto from 'crypto';

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;
console.log('key_id present:', !!key_id, key_id ? `(${key_id.slice(0, 8)}…, live=${key_id.startsWith('rzp_live')})` : '');
console.log('key_secret present:', !!key_secret);
if (!key_id || !key_secret) process.exit(2);

const rzp = new Razorpay({ key_id, key_secret });

const MIN_CHARGEABLE_MINOR = 100;
// The real ADR-020 prices. 1 seat monthly, and 1 seat annual — the two amounts a
// first-time buyer is most likely to present.
const MONTHLY_MINOR = 12900;
const ANNUAL_MINOR = 118800;
// The largest self-serve annual total (25 seats), which crosses the RBI AFA
// ceiling of 15,000 rupees. Worth probing separately: if the gateway refuses a
// token order at that size, annual AutoPay for large teams is not orderable at
// all, which is a commercial fact and not just a technical one.
const ANNUAL_25_MINOR = 1950000;

let failures = 0;
let customerId = null;

// `contact` is REQUIRED on the customer for a recurring/token order — Razorpay
// resolves it from the customer referenced by `customer_id` and rejects the
// order with "The contact field is required for recurring links" when absent
// (found by the M51 probe on 2026-08-02; Audit 213). M52's checkout path refuses
// up front with CONTACT_REQUIRED and completes the purchase WITHOUT a token
// rather than failing the sale.
try {
  const customer = await rzp.customers.create({
    name: 'M52 Gateway Probe', email: `m52probe+${Date.now()}@letszero.in`,
    contact: '9999999999', fail_existing: '0',
  });
  customerId = customer?.id ?? null;
  console.log('\n[1] customers.create (with contact) -> OK', customerId);
} catch (e) {
  console.log('\n[1] customers.create -> FAILED');
  console.log(JSON.stringify(e?.error ?? { message: e.message }, null, 1));
  process.exit(1);
}

/** The exact order `startSeatPayment` builds when a mandate intent is present. */
async function seatOrderWithMandate(label, amountMinor, method) {
  try {
    const order = await rzp.orders.create({
      amount: amountMinor, currency: 'INR',
      receipt: crypto.randomUUID(),                 // 36 chars, under the 40 cap
      customer_id: customerId,
      method,
      payment_capture: 1,
      token: {
        max_amount: Math.max(amountMinor * 2, MIN_CHARGEABLE_MINOR),
        expire_at: Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 60 * 60,
        frequency: 'as_presented',
      },
      notes: { purpose: 'seat_purchase_with_mandate', workspace_root_id: 'probe' },
    });
    console.log(`[${label}] -> OK ${order.id} status=${order.status} amount=${order.amount}`);
  } catch (e) {
    failures++;
    console.log(`[${label}] -> FAILED`);
    console.log(JSON.stringify(e?.error ?? { message: e.message }, null, 1));
  }
}

// THE M52 QUESTION: does the token block travel with a REAL amount?
await seatOrderWithMandate('2 card  monthly  Rs129   + token', MONTHLY_MINOR, 'card');
await seatOrderWithMandate('3 card  annual   Rs1188  + token', ANNUAL_MINOR, 'card');
await seatOrderWithMandate('4 card  annual25 Rs19500 + token (above AFA ceiling)', ANNUAL_25_MINOR, 'card');
await seatOrderWithMandate('5 upi   monthly  Rs129   + token', MONTHLY_MINOR, 'upi');

// Control: the PRE-M52 shape (1 rupee auth order). If this passes and the ones
// above fail, the amount is the variable that matters and the degradation path
// is the answer until the payload is corrected.
await seatOrderWithMandate('6 card  Rs1 auth (pre-M52 control)', MIN_CHARGEABLE_MINOR, 'card');

// Control: the ordinary non-token seat order, i.e. the degradation path itself.
// This one MUST pass — it is what a customer falls back to when anything about
// the mandate cannot be arranged, and a failure here means they cannot buy.
try {
  const order = await rzp.orders.create({
    amount: MONTHLY_MINOR, currency: 'INR', receipt: crypto.randomUUID(),
  });
  console.log(`[7 plain order (degradation path)] -> OK ${order.id} status=${order.status}`);
} catch (e) {
  failures++;
  console.log('[7 plain order (degradation path)] -> FAILED  *** CUSTOMERS CANNOT BUY ***');
  console.log(JSON.stringify(e?.error ?? { message: e.message }, null, 1));
}

console.log(`\n${failures === 0 ? 'PASS' : `FAIL (${failures})`} — no money moved; every order above is unpaid.`);
console.log('Still unexecuted by this probe: an actual debit against a bank-authorised');
console.log('token. That needs a real customer at a 2FA screen and cannot be probed.');
process.exit(failures === 0 ? 0 : 1);
