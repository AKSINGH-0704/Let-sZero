// Validates that the LIVE Razorpay API accepts the EXACT payload shapes
// server/routes.js and server/autopayCharge.js construct. Creating a customer
// and an unpaid order moves NO money — an order is an intent, not a charge.
// This closes the Audit 211 "coded from docs alone" gap without debiting anyone.
import Razorpay from 'razorpay';
import crypto from 'crypto';

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;
console.log('key_id present:', !!key_id, key_id ? `(${key_id.slice(0, 8)}…, live=${key_id.startsWith('rzp_live')})` : '');
console.log('key_secret present:', !!key_secret);
if (!key_id || !key_secret) process.exit(2);

const rzp = new Razorpay({ key_id, key_secret });
const MIN_CHARGEABLE_MINOR = 100;
const renewalAmountMinor = 12900;                       // the real production subscription
const maxAmountMinor = Math.max(renewalAmountMinor * 2, MIN_CHARGEABLE_MINOR);

let customerId = null;
try {
  const customer = await rzp.customers.create({
    name: 'M51 Gateway Probe', email: `m51probe+${Date.now()}@letszero.in`, fail_existing: '0',
  });
  customerId = customer?.id ?? null;
  console.log('\n[1] customers.create -> OK', customerId);
} catch (e) {
  console.log('\n[1] customers.create -> FAILED');
  console.log(JSON.stringify(e?.error ?? { message: e.message }, null, 1));
  process.exit(1);
}

// The exact token-bearing order from routes.js:4060-4071.
try {
  const order = await rzp.orders.create({
    amount: MIN_CHARGEABLE_MINOR, currency: 'INR', receipt: crypto.randomUUID(),
    customer_id: customerId, method: 'card', payment_capture: 1,
    token: {
      max_amount: maxAmountMinor,
      expire_at: Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 60 * 60,
      frequency: 'as_presented',
    },
    notes: { purpose: 'autopay_mandate', workspace_root_id: 'probe' },
  });
  console.log('[2] orders.create (token/e-mandate) -> OK', order.id, 'status=' + order.status);
} catch (e) {
  console.log('[2] orders.create (token/e-mandate) -> FAILED');
  console.log(JSON.stringify(e?.error ?? { message: e.message }, null, 1));
}

// The recurring-charge order shape from autopayCharge.js, incl. the Audit 211
// 40-char receipt fix. Verifies the renewal order is accepted before any real renewal.
try {
  const receipt = crypto.createHash('sha256')
    .update(`renew:probe:${Date.now()}`).digest('hex').slice(0, 40);
  console.log('[3] receipt length =', receipt.length, '(Razorpay cap 40)');
  const order = await rzp.orders.create({
    amount: renewalAmountMinor, currency: 'INR', receipt,
    customer_id: customerId, payment_capture: 1,
    notes: { purpose: 'seat_renewal', workspace_root_id: 'probe' },
  });
  console.log('[3] orders.create (recurring renewal) -> OK', order.id, 'status=' + order.status);
} catch (e) {
  console.log('[3] orders.create (recurring renewal) -> FAILED');
  console.log(JSON.stringify(e?.error ?? { message: e.message }, null, 1));
}

// createRecurringPayment needs a bank-authorised token, which cannot exist without
// a real customer completing OTP. Probe with a placeholder purely to learn WHICH
// error the gateway returns: a field/shape complaint would be a defect we can fix
// now; a "token not found" proves the payload itself validated.
try {
  const r = await rzp.payments.createRecurringPayment({
    email: 'm51probe@letszero.in', contact: '9999999999',
    amount: renewalAmountMinor, currency: 'INR',
    order_id: 'order_probe_invalid', customer_id: customerId,
    token: 'token_probe_invalid', recurring: '1',
    description: 'M51 probe',
  });
  console.log('[4] createRecurringPayment -> unexpectedly OK', JSON.stringify(r));
} catch (e) {
  console.log('[4] createRecurringPayment -> error (expected; read the CODE):');
  console.log(JSON.stringify(e?.error ?? { message: e.message }, null, 1));
}
process.exit(0);
