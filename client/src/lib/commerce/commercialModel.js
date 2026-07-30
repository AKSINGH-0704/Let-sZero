// M43 — the client's ONE reader of server-authoritative commercial state.
//
// Every customer-visible surface that mentions seats, plans or team capacity has
// to answer the same question — "are seats included in the plan, or are they a
// separately-billed product?" — and that answer is `seat_billing_enabled` on the
// server, not a copy decision. Before M43 six surfaces each restated their own
// answer as hardcoded strings ("up to 25 team members", "free, on any plan"),
// which meant enabling the flag would have made them lie.
//
// This module contains NO business logic and computes NO price. It reads two
// existing endpoints and formats their values for display. Every number it
// returns originates from a server authority:
//   • /api/seats/catalog   → seat billing state, bands, boundaries (seatPricing.js)
//   • /api/pricing/plans   → per-plan seat allowance (seatEntitlement.planSeatAllowance)
//
// Any surface needing a PRICE must use the quote endpoints or SeatCalculator;
// this module deliberately exposes none.

import { useQuery } from "@tanstack/react-query";

export const SEAT_CATALOG_KEY = ["/api/seats/catalog"];
export const PRICING_PLANS_KEY = ["/api/pricing/plans"];

/**
 * Server-authoritative commercial model.
 *
 * While loading, `seatBillingEnabled` is `undefined` — deliberately NOT `false`.
 * Surfaces must render neither commercial story until the server answers, so a
 * page can never briefly assert "seats are free" to a paying customer (or the
 * reverse). Callers should treat `isLoading` as "say nothing yet".
 */
export function useCommercialModel() {
  const catalog = useQuery({ queryKey: SEAT_CATALOG_KEY, staleTime: 5 * 60 * 1000 });
  const pricing = useQuery({ queryKey: PRICING_PLANS_KEY, staleTime: 5 * 60 * 1000 });

  const c = catalog.data;
  const p = pricing.data;

  return {
    isLoading: catalog.isLoading || pricing.isLoading,
    isError: catalog.isError || pricing.isError,

    // ── The commercial question every surface asks ───────────────────────────
    seatBillingEnabled: c?.billingEnabled,
    freeSeatFloor: c?.freeSeatFloor,

    // ── Seat catalog (display only; prices come from the quote endpoints) ────
    bands: c?.bands ?? null,
    annualDiscountPct: c?.annualDiscount != null ? Math.round(c.annualDiscount * 100) : null,
    selfServeMaxSeats: c?.selfServeMaxSeats ?? null,
    softCapSeats: c?.softCapSeats ?? null,
    bestPriceGuarantee: c?.bestPriceGuarantee ?? null,
    enterpriseContactPath: c?.enterpriseContactPath ?? null,
    pricingVersion: c?.pricingVersion ?? null,

    // ── Per-plan seat allowance, keyed by plan id. `null` = unlimited ────────
    planSeatAllowance: p?.plans
      ? Object.fromEntries(p.plans.map(pl => [pl.id, pl.maxTeamMembers ?? null]))
      : null,
    freeTrialSeatAllowance: p?.freeTrialMaxTeamMembers ?? null,
  };
}

// ── Formatters ───────────────────────────────────────────────────────────────
// Presentation only. Each takes server values and returns a string; none decides
// a commercial rule. They exist so the same sentence is not written five slightly
// different ways across five surfaces — the drift that made this milestone
// necessary in the first place.

/**
 * What a plan card may claim about team capacity.
 * @param {number|null} allowance  plan's advertised seats (null = unlimited)
 * @param {boolean|undefined} seatBillingEnabled
 */
export function seatCapacityLabel(allowance, seatBillingEnabled) {
  if (seatBillingEnabled === undefined) return null;      // not loaded — say nothing
  if (allowance === null) return "Unlimited team members";
  if (seatBillingEnabled) return "Team seats sold separately";
  return `${allowance} team members`;
}

/** Short capacity value for a table cell ("25", "Unlimited", "Sold separately"). */
export function seatCapacityValue(allowance, seatBillingEnabled) {
  if (seatBillingEnabled === undefined) return null;
  if (allowance === null) return "Unlimited";
  return seatBillingEnabled ? "Sold separately" : String(allowance);
}

/**
 * The one sentence describing how team capacity is sold. Used wherever a surface
 * previously hardcoded "every plan includes up to 25 team seats at no extra cost".
 */
export function seatModelSummary({ seatBillingEnabled, freeSeatFloor, planSeatAllowance, bands }) {
  if (seatBillingEnabled === undefined) return null;
  if (!seatBillingEnabled) {
    const anyAllowance = planSeatAllowance
      ? Object.values(planSeatAllowance).find(v => typeof v === "number")
      : null;
    return anyAllowance
      ? `Every plan includes up to ${anyAllowance} team seats at no additional cost.`
      : "Team seats are included with every plan at no additional cost.";
  }
  const from = bands?.length ? bands[bands.length - 1].rate : null;
  const included = freeSeatFloor > 0
    ? `Your first ${freeSeatFloor} seat${freeSeatFloor === 1 ? "" : "s"} ${freeSeatFloor === 1 ? "is" : "are"} included. `
    : "";
  return from
    ? `${included}Additional team seats are billed separately, from ₹${from} per seat per month as your team grows.`
    : `${included}Additional team seats are billed separately.`;
}

/** True when a surface should route "I need more people" to seat purchase. */
export function shouldRouteToSeatPurchase(seatBillingEnabled) {
  return seatBillingEnabled === true;
}
