// M39 Phase 1C — centralized commerce configuration.
//
// The single place that holds the tunable constants of the purchase experience:
// persistence keys and lifetimes, currency/payment defaults, the self-serve
// credit bounds, and the paths the resume flow navigates to. Nothing here decides
// a PRICE — the server remains authoritative for every charge (MD-003). These are
// display bounds, storage policy, and navigation targets, gathered so they are set
// once rather than re-typed across the pricing page, the payments page, and the
// commerce layer.
//
// Pure module (no imports, no DOM) so it is safe in SSR/prerender and unit tests.

// ── Purchase-intent persistence (see lib/commerce/purchaseIntent.js) ──────────
// A configured purchase must survive login, signup, refresh, and payment retries.
export const PURCHASE_INTENT_KEY = "repmail.purchaseIntent.v1";
export const PURCHASE_INTENT_TTL_MS = 60 * 60 * 1000; // 1 hour — a stale intent must not silently reappear.

// ── Checkout defaults (see lib/commerce/checkout.js) ──────────────────────────
// M39 is INR-only (MD-002); the value is abstracted here so a future multi-currency
// rollout changes one constant, not every call site.
export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_PAYMENT_METHOD = "UPI";

// ── Self-serve credit bounds (display + slider clamps only; server validates) ──
export const MIN_CREDITS = 3000;
export const MAX_CREDITS = 300000;
export const CREDIT_STEP = 1000;
export const CREDIT_PRESETS = [3000, 5000, 10000, 15000, 25000, 50000, 100000, 200000, 300000];

// Display-only INR→USD conversion for the marketing page. The authoritative charge
// is always the server quote; this never feeds an amount that is actually charged.
export const USD_DISPLAY_RATE = 83.5;

// ── Navigation targets for the resume flow ────────────────────────────────────
export const RESUME_CHECKOUT_PATH = "/app/payments?resume=1";
export const DEFAULT_POST_LOGIN_PATH = "/app/dashboard";
