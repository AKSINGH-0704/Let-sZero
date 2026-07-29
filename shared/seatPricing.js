// ─────────────────────────────────────────────────────────────────────────────
// M42 — Seat commerce pricing authority.
//
// RepMail's SECOND commercial product. `shared/pricing.js` is the authority for
// CREDITS (consumption); this module is the authority for SEATS (subscription).
// They are deliberately separate products with separate entitlements, and they
// share — never duplicate — the money primitives: currency, minor units, and the
// enterprise boundary all come from shared/pricing.js by import.
//
// Design rules (inherited from M39/MD-003 and extended here):
//   • Backend decides, frontend displays. Nothing here reads a client-supplied
//     price; a quote is always recomputed server-side before money moves.
//   • All money is INTEGER MINOR units (paise). No floats in a charge path.
//   • The catalog is DATA, keyed by version. A commercial change is a new catalog
//     version — a config edit — not a code change.
//   • A subscription stores the version it was priced under, so a customer is
//     never silently repriced mid-term by a catalog edit (term price lock).
//   • Every price is a pure function of (seats, term, version, overrides). There
//     is no per-seat price state anywhere in the system — see ADR-018 for why the
//     grandfathered-per-seat alternative was rejected.
//
// Extension seams that are REAL (validated + applied), not placeholders:
//   • enterprise unit-price override (negotiated contracts)
//   • coupons (percentage / fixed, with validity + applicability rules)
//   • regions (currency + rate multiplier)
// Each is exercised by tests so the seam cannot rot.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CURRENCIES,
  BASE_CURRENCY,
  isCurrencySupported,
  toMinorUnits,
  SELF_SERVE_MAX_SEATS,
} from "./pricing.js";

// Bumped whenever bands, term discounts, rounding, or included seats change.
// Persisted on every subscription and every payment so a historical charge can
// always be reconciled against the rules that produced it.
export const SEAT_PRICING_VERSION = "2026-07-29.1";

// The smallest amount a payment gateway will accept. Razorpay rejects orders
// below ₹1.00 (100 paise), so a proration computed near the end of a period can
// be arithmetically correct and still be UNCHARGEABLE — adding a seat with hours
// left on a monthly term produces a few paise, and `orders.create` would fail the
// whole checkout. Rather than break the purchase (or charge ₹1 for a 4-paise
// entitlement change, which is worse), a sub-minimum proration is WAIVED: the
// seats are granted immediately and the next renewal bills the full new amount.
// The waived figure is surfaced in the preview and recorded in the audit trail,
// so it is never silently absorbed.
export const MIN_CHARGEABLE_MINOR = 100;

// ── Terms ────────────────────────────────────────────────────────────────────
// The annual rate is DERIVED from the monthly rate by a single discount constant.
// The client proposal carried a second hand-written annual table whose discount
// drifted from 23.3% (smallest teams) down to 17.7% (largest) — backwards, since
// annual commitment is worth most on the largest accounts, and a second table is
// a second thing to keep in sync. One constant, one story ("~2.4 months free").
export const SEAT_TERMS = Object.freeze({
  MONTHLY: { id: "MONTHLY", months: 1, label: "Monthly" },
  ANNUAL: { id: "ANNUAL", months: 12, label: "Annual" },
});

export function isValidTerm(term) {
  return Object.prototype.hasOwnProperty.call(SEAT_TERMS, term);
}

// ── Catalog (versioned data — a commercial change is a new entry here) ────────
//
// `bands` are inclusive [min,max] ranges over BILLABLE seats, priced RETROACTIVELY
// (every billable seat pays the band rate the workspace lands in).
//
// `bestPriceGuarantee` closes the defect proved in the architecture review: under
// retroactive bands a boundary at seat n can only absorb a 1/n rate cut before the
// total INVERTS. The proposal's 10-seat boundary asked for a 20% cut where 10% is
// the maximum, so 9 seats billed ₹891 while 10 billed ₹790. With the guarantee we
// charge min(actual band total, any higher band's floor total) and GRANT the seat
// count that produced it — so a 9-seat workspace pays ₹790 and receives 10 seats.
// The inversion becomes the strongest seat-adoption mechanic in the product.
export const SEAT_CATALOG = Object.freeze({
  "2026-07-29.1": Object.freeze({
    version: "2026-07-29.1",
    currency: "INR",
    // Monthly per-seat rates in MAJOR units (₹) — the client's ladder, unchanged.
    bands: Object.freeze([
      Object.freeze({ min: 1, max: 2, rate: 129 }),
      Object.freeze({ min: 3, max: 5, rate: 115 }),
      Object.freeze({ min: 6, max: 9, rate: 99 }),
      Object.freeze({ min: 10, max: 25, rate: 79 }),
    ]),
    // Single annual discount, applied to the monthly rate and rounded to whole ₹.
    // 0.20 → 129/115/99/79 become 103/92/79/63 per seat per month, billed 12×.
    annualDiscount: 0.2,
    bestPriceGuarantee: true,
    // Billable seats = collaborator seats. The workspace OWNER never consumes a
    // billable seat, because the owner never consumes an ENFORCED seat either
    // (storage.claimWorkspaceSeat excludes the root). Billing and enforcement
    // must count the same thing or they drift — this is that alignment.
    includedSeats: 0,
    // Above this, self-serve continues but the workspace is flagged for sales.
    selfServeMaxSeats: SELF_SERVE_MAX_SEATS, // 25
    // Hard self-serve ceiling. Between selfServeMaxSeats and this, a customer can
    // still buy (never wall a growing team at 18:00 on a Friday) but is routed to
    // sales in parallel. Above it, seats are contract-only.
    softCapSeats: 50,
  }),
});

export function getSeatCatalog(version = SEAT_PRICING_VERSION) {
  return SEAT_CATALOG[version] || null;
}

/** Every version a stored subscription could legally reference. */
export const SEAT_PRICING_VERSIONS = Object.freeze(Object.keys(SEAT_CATALOG));

// ── Regions (currency + multiplier seam) ─────────────────────────────────────
// Regional pricing is a real mechanism, not a placeholder: a region maps to an
// active currency and a multiplier applied to the catalog rate. Only IN is active
// while INR is the only active currency (MD-004); adding a region is a data edit.
export const SEAT_REGIONS = Object.freeze({
  IN: Object.freeze({ id: "IN", currency: "INR", multiplier: 1, label: "India" }),
});
export const DEFAULT_REGION = "IN";

export function resolveRegion(regionId = DEFAULT_REGION) {
  return SEAT_REGIONS[regionId] || SEAT_REGIONS[DEFAULT_REGION];
}

// ── Coupons (validated + applied seam) ───────────────────────────────────────
// Empty by design: the MECHANISM ships and is tested, the catalog is a config
// edit. A coupon never produces a negative charge and never applies to a term or
// product it wasn't issued for.
export const COUPON_TYPES = Object.freeze({ PERCENT: "PERCENT", FIXED: "FIXED" });
export const SEAT_COUPONS = Object.freeze({});

/**
 * Validate a coupon against the purchase context. Never throws.
 * @returns {{ ok: true, coupon: object } | { ok: false, code: string, message: string }}
 */
export function validateCoupon(code, { term, seats, nowMs = Date.now() } = {}) {
  if (!code) return { ok: false, code: "NO_COUPON", message: "No coupon supplied." };
  const coupon = SEAT_COUPONS[String(code).toUpperCase()];
  if (!coupon) return { ok: false, code: "UNKNOWN_COUPON", message: "That code isn't valid." };
  if (coupon.expiresAtMs && nowMs > coupon.expiresAtMs) {
    return { ok: false, code: "EXPIRED_COUPON", message: "That code has expired." };
  }
  if (coupon.terms && !coupon.terms.includes(term)) {
    return { ok: false, code: "COUPON_TERM_MISMATCH", message: "That code doesn't apply to this billing term." };
  }
  if (coupon.minSeats && seats < coupon.minSeats) {
    return { ok: false, code: "COUPON_MIN_SEATS", message: `That code needs at least ${coupon.minSeats} seats.` };
  }
  return { ok: true, coupon };
}

/** Discount in minor units for a validated coupon. Never exceeds the subtotal. */
function couponDiscountMinor(coupon, subtotalMinor) {
  if (!coupon) return 0;
  const raw = coupon.type === COUPON_TYPES.PERCENT
    ? Math.round(subtotalMinor * coupon.value)
    : toMinorUnits(coupon.value);
  return Math.max(0, Math.min(subtotalMinor, raw));
}

// ── Band resolution ──────────────────────────────────────────────────────────

/** The band a given billable-seat count falls in, or null if above the top band. */
export function bandForSeats(seats, catalog = getSeatCatalog()) {
  if (!catalog) return null;
  return catalog.bands.find(b => seats >= b.min && seats <= b.max) || null;
}

/** Per-seat, per-month rate in MINOR units for a band under a term. */
function bandRateMinor(band, term, catalog) {
  const monthlyMinor = toMinorUnits(band.rate, catalog.currency);
  if (term === SEAT_TERMS.ANNUAL.id) {
    // Round the discounted per-seat rate to whole currency units so the number a
    // customer sees on the pricing card ("₹103/seat/month") is exactly the number
    // that is charged — no sub-unit drift accumulating across 25 seats × 12 months.
    const major = Math.round(band.rate * (1 - catalog.annualDiscount));
    return toMinorUnits(major, catalog.currency);
  }
  return monthlyMinor;
}

/**
 * Resolve the charged seat count and per-seat rate under the best-price guarantee.
 * Returns the cheapest (seatsGranted, band) pair that covers `seats`.
 */
function resolveBestPrice(seats, term, catalog) {
  const candidates = [];
  for (const band of catalog.bands) {
    if (band.max < seats) continue; // band cannot cover this workspace
    const grantedSeats = Math.max(seats, band.min);
    const rateMinor = bandRateMinor(band, term, catalog);
    candidates.push({ band, grantedSeats, rateMinor, perMonthMinor: grantedSeats * rateMinor });
  }
  if (candidates.length === 0) {
    // Between the published table's top band (25) and the hard self-serve ceiling
    // (softCapSeats) the top band's rate simply continues. The published bands stay
    // exactly as the customer sees them; this is the overflow rule, not a hidden
    // band — a growing team is never walled, it is quoted and flagged for sales.
    if (seats > catalog.softCapSeats) return null; // contract pricing only
    const top = catalog.bands[catalog.bands.length - 1];
    const rateMinor = bandRateMinor(top, term, catalog);
    return { band: top, grantedSeats: seats, rateMinor, perMonthMinor: seats * rateMinor };
  }
  if (!catalog.bestPriceGuarantee) {
    return candidates.find(c => c.grantedSeats === seats) || candidates[0];
  }
  // Cheapest total wins; on a tie prefer MORE seats for the same money (the whole
  // point of the guarantee — the customer gets the upgrade, not just the price).
  return candidates.reduce((best, c) => {
    if (c.perMonthMinor < best.perMonthMinor) return c;
    if (c.perMonthMinor === best.perMonthMinor && c.grantedSeats > best.grantedSeats) return c;
    return best;
  });
}

// ── The canonical seat quote ─────────────────────────────────────────────────
/**
 * The ONE function that turns a seat selection into a charge. Everything that
 * moves money for seats — checkout, renewal, proration, previews — resolves
 * through here so there is exactly one place where a seat price is decided.
 *
 * @param {object} input
 * @param {number} input.seats           requested collaborator seats
 * @param {string} input.term            SEAT_TERMS id
 * @param {string} [input.version]       catalog version (term price lock)
 * @param {string} [input.region]        SEAT_REGIONS id
 * @param {string} [input.couponCode]
 * @param {number} [input.unitPriceOverrideMinor]  negotiated per-seat/month rate
 * @param {number} [input.nowMs]
 * @returns {object} quote, or { error, code }
 */
export function quoteSeats({
  seats,
  term = SEAT_TERMS.MONTHLY.id,
  version = SEAT_PRICING_VERSION,
  region = DEFAULT_REGION,
  couponCode = null,
  unitPriceOverrideMinor = null,
  nowMs = Date.now(),
} = {}) {
  if (!isValidTerm(term)) return { error: "Unknown billing term.", code: "UNKNOWN_TERM" };

  const catalog = getSeatCatalog(version);
  if (!catalog) return { error: "Unknown pricing version.", code: "UNKNOWN_PRICING_VERSION" };

  const n = Number(seats);
  if (!Number.isInteger(n) || n < 0) {
    return { error: "Seat count must be a whole number.", code: "INVALID_SEATS" };
  }

  const reg = resolveRegion(region);
  const currency = reg.currency;
  if (!isCurrencySupported(currency)) {
    return { error: `Currency ${currency} is not supported.`, code: "UNSUPPORTED_CURRENCY" };
  }

  const months = SEAT_TERMS[term].months;
  const billableSeats = Math.max(0, n - catalog.includedSeats);

  // Zero billable seats is a legitimate, free outcome (a solo workspace) — it is
  // not an error, and it must never create a payment.
  if (billableSeats === 0) {
    return {
      kind: "seats",
      seats: n,
      seatsGranted: n,
      billableSeats: 0,
      term, months, currency, version: catalog.version, region: reg.id,
      unitRateMinor: 0, subtotalMinor: 0, discountMinor: 0, totalMinor: 0,
      effectiveUnitRateMinor: 0,
      band: null, coupon: null, isFree: true,
      isEnterprise: false, requiresSalesContact: false, exceedsSelfServe: false,
    };
  }

  if (billableSeats > catalog.softCapSeats) {
    return {
      kind: "enterprise", isEnterprise: true, requiresSalesContact: true,
      seats: n, billableSeats, term, currency, version: catalog.version, region: reg.id,
      code: "ENTERPRISE_REQUIRED",
      message: "Teams above our self-serve ceiling are priced by our sales team.",
    };
  }

  // ---- Rate resolution: negotiated override wins over the catalog ----
  let band = null;
  let seatsGranted = n;
  let unitRateMinor;
  if (unitPriceOverrideMinor != null) {
    if (!Number.isInteger(unitPriceOverrideMinor) || unitPriceOverrideMinor < 0) {
      return { error: "Invalid negotiated rate.", code: "INVALID_OVERRIDE" };
    }
    unitRateMinor = unitPriceOverrideMinor;
  } else {
    const best = resolveBestPrice(billableSeats, term, catalog);
    if (!best) return { error: "Seat count is outside the priced range.", code: "OUT_OF_RANGE" };
    band = best.band;
    unitRateMinor = best.rateMinor;
    seatsGranted = best.grantedSeats + catalog.includedSeats;
  }

  const chargedSeats = Math.max(0, seatsGranted - catalog.includedSeats);
  const regionalUnitMinor = Math.round(unitRateMinor * reg.multiplier);
  const subtotalMinor = regionalUnitMinor * chargedSeats * months;

  // ---- Coupon ----
  let coupon = null;
  let discountMinor = 0;
  if (couponCode) {
    const v = validateCoupon(couponCode, { term, seats: n, nowMs });
    if (v.ok) {
      coupon = { code: String(couponCode).toUpperCase(), type: v.coupon.type, value: v.coupon.value };
      discountMinor = couponDiscountMinor(v.coupon, subtotalMinor);
    } else {
      coupon = { code: String(couponCode).toUpperCase(), rejected: true, reason: v.code, message: v.message };
    }
  }

  const totalMinor = Math.max(0, subtotalMinor - discountMinor);

  return {
    kind: "seats",
    seats: n,
    seatsGranted,
    billableSeats: chargedSeats,
    // True when the guarantee handed the customer seats they didn't ask for.
    upgradedSeats: seatsGranted > n ? seatsGranted - n : 0,
    term, months, currency,
    version: catalog.version,
    region: reg.id,
    band: band ? { min: band.min, max: band.max, rate: band.rate } : null,
    unitRateMinor: regionalUnitMinor,          // per seat, per month
    subtotalMinor,
    discountMinor,
    totalMinor,                                 // the gateway charge basis
    effectiveUnitRateMinor: chargedSeats > 0 ? Math.round(totalMinor / (chargedSeats * months)) : 0,
    coupon,
    isFree: totalMinor === 0,
    isEnterprise: false,
    // Above the self-serve band but under the hard ceiling: purchasable AND a
    // qualified sales lead. Not a block.
    exceedsSelfServe: billableSeats > catalog.selfServeMaxSeats,
    requiresSalesContact: billableSeats > catalog.selfServeMaxSeats,
    isOverride: unitPriceOverrideMinor != null,
  };
}

// ── Billing period arithmetic ────────────────────────────────────────────────
// Calendar-month anchored, clamped for short months so a 31st-of-the-month anchor
// never skips February. Deterministic and UTC-based: the renewal boundary must
// not depend on the server's local timezone (a defect class this codebase has
// already paid for once with `first_send_at`).

/** Add whole months to a UTC instant, clamping the day to the target month's length. */
export function addMonthsUTC(date, months) {
  const d = new Date(date);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1,
    d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

/** The period a term produces from an anchor. */
export function periodFor(anchor, term) {
  const months = SEAT_TERMS[term]?.months ?? 1;
  const start = new Date(anchor);
  return { start, end: addMonthsUTC(start, months) };
}

/**
 * Unused fraction of a period, in [0,1]. Proration is computed on ELAPSED TIME
 * against the actual period length (not a nominal 30 days) so the two halves of
 * an upgrade always sum to exactly one period — no rounding leak either way.
 */
export function remainingFraction(periodStart, periodEnd, now) {
  const startMs = new Date(periodStart).getTime();
  const endMs = new Date(periodEnd).getTime();
  const nowMs = new Date(now).getTime();
  if (!(endMs > startMs)) return 0;
  const remaining = endMs - Math.min(Math.max(nowMs, startMs), endMs);
  return remaining / (endMs - startMs);
}

// ── Change previews ──────────────────────────────────────────────────────────
export const SEAT_CHANGE = Object.freeze({
  NOOP: "NOOP",
  UPGRADE: "UPGRADE",       // more seats — charge the prorated difference now
  DOWNGRADE: "DOWNGRADE",   // fewer seats — takes effect at renewal, no refund
  TERM_CHANGE: "TERM_CHANGE", // monthly ⇄ annual — takes effect at renewal
  NEW: "NEW",               // no active subscription yet
});

/**
 * Deterministic preview of a seat/term change. This is the single authority for
 * "what happens if I press this button", used by BOTH the UI preview and the
 * server-side charge — so the number shown is the number billed, by construction.
 *
 * Commercial policy encoded here (ADR-018):
 *   • Upgrades are immediate and prorated for the remainder of the current period.
 *     Seats become usable only after the payment succeeds.
 *   • Downgrades are DEFERRED to renewal. No mid-term refund, no credit note, no
 *     negative invoice, and no add-then-drop arbitrage. The customer keeps what
 *     they paid for until the period they paid for ends.
 *   • Term changes are deferred to renewal for the same reason.
 *   • A mid-term upgrade is priced at the subscription's LOCKED catalog version.
 */
export function previewSeatChange({
  current = null,   // { seats, term, periodStart, periodEnd, version, unitPriceOverrideMinor }
  nextSeats,
  nextTerm = null,
  region = DEFAULT_REGION,
  couponCode = null,
  now = new Date(),
} = {}) {
  const targetSeats = Number(nextSeats);
  if (!Number.isInteger(targetSeats) || targetSeats < 0) {
    return { error: "Seat count must be a whole number.", code: "INVALID_SEATS" };
  }

  // ---- No active subscription: a brand-new purchase ----
  if (!current) {
    const term = nextTerm || SEAT_TERMS.MONTHLY.id;
    const quote = quoteSeats({ seats: targetSeats, term, region, couponCode });
    if (quote.error || quote.isEnterprise) return { ...quote, kind: SEAT_CHANGE.NEW };
    const period = periodFor(now, term);
    return {
      kind: SEAT_CHANGE.NEW,
      quote,
      chargeNowMinor: quote.totalMinor,
      effectiveImmediately: true,
      effectiveSeats: quote.seatsGranted,
      scheduled: null,
      periodStart: period.start,
      periodEnd: period.end,
      renewal: { seats: quote.seatsGranted, term, totalMinor: quote.totalMinor, at: period.end },
      currency: quote.currency,
    };
  }

  const version = current.version || SEAT_PRICING_VERSION;
  const term = current.term;
  const override = current.unitPriceOverrideMinor ?? null;
  const termChanging = nextTerm != null && nextTerm !== term;

  const currentQuote = quoteSeats({ seats: current.seats, term, version, region, unitPriceOverrideMinor: override });
  if (currentQuote.error) return currentQuote;

  const targetQuote = quoteSeats({ seats: targetSeats, term, version, region, couponCode, unitPriceOverrideMinor: override });
  if (targetQuote.error || targetQuote.isEnterprise) return { ...targetQuote, kind: SEAT_CHANGE.UPGRADE };

  // Renewal is always quoted at the CURRENT catalog version, not the locked one:
  // the lock protects the term you paid for, it is not a perpetual price freeze.
  const renewalTerm = nextTerm || term;
  const renewalSeats = targetQuote.seatsGranted;
  const renewalQuote = quoteSeats({ seats: renewalSeats, term: renewalTerm, region, unitPriceOverrideMinor: override });

  const base = {
    currency: currentQuote.currency,
    quote: targetQuote,
    periodStart: current.periodStart,
    periodEnd: current.periodEnd,
    renewal: {
      seats: renewalSeats,
      term: renewalTerm,
      totalMinor: renewalQuote.error ? null : renewalQuote.totalMinor,
      at: current.periodEnd,
      version: renewalQuote.error ? null : renewalQuote.version,
    },
  };

  if (targetQuote.seatsGranted === currentQuote.seatsGranted && !termChanging) {
    return { ...base, kind: SEAT_CHANGE.NOOP, chargeNowMinor: 0, effectiveImmediately: false, effectiveSeats: currentQuote.seatsGranted, scheduled: null };
  }

  if (targetQuote.seatsGranted > currentQuote.seatsGranted) {
    // Prorated difference for the unused remainder of the paid period. Computed
    // as a difference of TOTALS (not seats × rate) so a band move — including a
    // best-price-guarantee jump — is priced correctly rather than at the old rate.
    const fraction = remainingFraction(current.periodStart, current.periodEnd, now);
    const deltaMinor = targetQuote.totalMinor - currentQuote.totalMinor;
    const rawChargeMinor = Math.max(0, Math.round(deltaMinor * fraction));
    // Below the gateway floor the charge is waived, not skipped: the upgrade is
    // still applied immediately (`waived` tells the caller to grant rather than
    // schedule), and the renewal bills the full new amount.
    const waived = rawChargeMinor > 0 && rawChargeMinor < MIN_CHARGEABLE_MINOR;
    return {
      ...base,
      kind: SEAT_CHANGE.UPGRADE,
      chargeNowMinor: waived ? 0 : rawChargeMinor,
      waivedMinor: waived ? rawChargeMinor : 0,
      // True for an upgrade that must be applied now even though no money moves.
      // Distinguishes "grant it, we're not billing pennies" from a DOWNGRADE's
      // "charge nothing because nothing changes until renewal".
      applyWithoutCharge: waived || rawChargeMinor === 0,
      proration: { fraction, fullDeltaMinor: deltaMinor },
      effectiveImmediately: true,
      effectiveSeats: targetQuote.seatsGranted,
      // An immediate upgrade SUPERSEDES a pending downgrade to a smaller number —
      // otherwise a customer pays to grow and silently shrinks at renewal.
      supersedesScheduledSeats: current.scheduledSeats != null && current.scheduledSeats < targetQuote.seatsGranted
        ? current.scheduledSeats
        : null,
      scheduled: termChanging ? { seats: renewalSeats, term: renewalTerm, at: current.periodEnd } : null,
    };
  }

  // Fewer seats, or a term change without a seat increase → deferred to renewal.
  return {
    ...base,
    kind: termChanging && targetQuote.seatsGranted === currentQuote.seatsGranted ? SEAT_CHANGE.TERM_CHANGE : SEAT_CHANGE.DOWNGRADE,
    chargeNowMinor: 0,
    effectiveImmediately: false,
    effectiveSeats: currentQuote.seatsGranted, // unchanged until renewal
    scheduled: { seats: renewalSeats, term: renewalTerm, at: current.periodEnd },
  };
}

/** What the next renewal will cost, at today's catalog. */
export function previewRenewal({ seats, term, region = DEFAULT_REGION, unitPriceOverrideMinor = null, at = null } = {}) {
  const quote = quoteSeats({ seats, term, region, unitPriceOverrideMinor });
  if (quote.error) return quote;
  return { seats: quote.seatsGranted, term, totalMinor: quote.totalMinor, currency: quote.currency, version: quote.version, at, quote };
}

// ── Display helpers (pure; used by server invoice lines and the UI alike) ─────
export function formatMinor(minor, currency = BASE_CURRENCY) {
  const c = CURRENCIES[currency] || CURRENCIES[BASE_CURRENCY];
  const major = (minor || 0) / c.minorPerMajor;
  return `${c.symbol}${major.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Invoice lines for a quote — one shared shape for the checkout summary, the
 * receipt, and the billing-history detail, so the customer sees the same
 * breakdown everywhere.
 */
export function buildInvoiceLines(quote) {
  if (!quote || quote.error || quote.isEnterprise) return [];
  const lines = [];
  const termLabel = SEAT_TERMS[quote.term]?.label || quote.term;
  if (quote.billableSeats > 0) {
    lines.push({
      key: "seats",
      label: `${quote.billableSeats} seat${quote.billableSeats === 1 ? "" : "s"} × ${formatMinor(quote.unitRateMinor, quote.currency)}/month${quote.months > 1 ? ` × ${quote.months} months` : ""}`,
      amountMinor: quote.subtotalMinor,
    });
  }
  if (quote.discountMinor > 0) {
    lines.push({ key: "coupon", label: `Discount (${quote.coupon?.code})`, amountMinor: -quote.discountMinor });
  }
  lines.push({ key: "total", label: `Total due (${termLabel})`, amountMinor: quote.totalMinor, isTotal: true });
  return lines;
}
