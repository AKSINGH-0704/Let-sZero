/**
 * SHARED SEAT CALCULATOR — RepMail by LetsZero (M42)
 *
 * The one seat-pricing interaction, used by BOTH the public pricing page and the
 * authenticated seat page, so the price a visitor is quoted and the price a
 * customer is charged can never diverge.
 *
 * Optimistic-where-safe: the displayed price is computed locally by
 * `shared/seatPricing.quoteSeats` — the SAME pure function the server charges
 * through — so stepping a seat up or down is instant and exact rather than an
 * estimate awaiting a round trip. It is not a second implementation: it is the
 * identical module. Money still only moves through a server-recomputed quote
 * (MD-003), and the host owns checkout via `onSelect`.
 *
 * Customer psychology, per the commercial objective ("add more seats while
 * feeling like you pay less"): the EFFECTIVE per-seat rate is the hero number and
 * falls as the team grows, the next band is always previewed as a concrete
 * incentive, and the best-price guarantee is surfaced as a gift rather than
 * buried in the maths.
 */

import { useMemo, useState, useCallback, useId } from "react";
import { Minus, Plus, Check, Building2, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { buildEnterpriseContactPath } from "@shared/enterprise";
import {
  quoteSeats, getSeatCatalog, buildInvoiceLines, formatMinor,
  SEAT_TERMS, bandForSeats, bandAnnualTerms,
} from "@shared/seatPricing";

const catalog = getSeatCatalog();

/** The cheapest per-seat rate a customer could reach — used for the "as low as" line. */
const BEST_RATE = catalog.bands[catalog.bands.length - 1].rate;

/**
 * The next band boundary above `seats`, or null at the top. Powers the single
 * most effective expansion nudge: telling the customer exactly how many more
 * seats drop the rate for their whole team, with the rate read from the catalog
 * (never restated here — a price in a comment is a price that goes stale).
 */
function nextBandFor(seats) {
  const current = bandForSeats(seats, catalog);
  if (!current) return null;
  const idx = catalog.bands.indexOf(current);
  return catalog.bands[idx + 1] || null;
}

export default function SeatCalculator({
  initialSeats = 3,
  initialTerm = SEAT_TERMS.MONTHLY.id,
  currentSeats = null,          // the workspace's existing entitlement, if any
  minSeats = 0,
  ctaLabel = "Continue",
  onSelect,
  onTermChange,
  busy = false,
  className,
}) {
  const [seats, setSeats] = useState(initialSeats);
  const [term, setTerm] = useState(initialTerm);
  const stepperId = useId();

  const quote = useMemo(() => quoteSeats({ seats, term }), [seats, term]);
  const monthlyEquivalent = useMemo(() => quoteSeats({ seats, term: SEAT_TERMS.MONTHLY.id }), [seats]);
  const nextBand = useMemo(() => nextBandFor(Math.max(1, seats)), [seats]);
  const lines = useMemo(() => buildInvoiceLines(quote), [quote]);

  const setTermAnd = useCallback((t) => {
    setTerm(t);
    onTermChange?.(t);
  }, [onTermChange]);

  const clamp = useCallback(
    (n) => Math.max(minSeats, Math.min(catalog.softCapSeats + 1, n)),
    [minSeats]
  );

  const overCeiling = quote.isEnterprise === true;

  // Annual saving expressed in real money over a year — more persuasive, and more
  // honest, than a bare percentage.
  const annualSavingMinor = useMemo(() => {
    if (term !== SEAT_TERMS.ANNUAL.id || quote.error || overCeiling) return 0;
    return Math.max(0, monthlyEquivalent.totalMinor * 12 - quote.totalMinor);
  }, [term, quote, monthlyEquivalent, overCeiling]);

  // M46 — the saving at THIS seat count, from the pricing authority for both
  // terms rather than from a discount constant. The specification's discount
  // varies by band (23% at 1–2 down to 18% at 10–25), and the best-price
  // guarantee can resolve the two terms into different bands, so only comparing
  // two real quotes is reliable. Shown on the toggle so the number moves with
  // the selector and is always the one the customer would actually be charged.
  const annualEquivalent = useMemo(() => quoteSeats({ seats, term: SEAT_TERMS.ANNUAL.id }), [seats]);
  const annualSavingsPct = useMemo(() => {
    if (monthlyEquivalent.error || annualEquivalent.error) return null;
    if (monthlyEquivalent.isEnterprise || annualEquivalent.isEnterprise) return null;
    const yearAtMonthly = (monthlyEquivalent.totalMinor || 0) * 12;
    if (!(yearAtMonthly > 0)) return null;
    return Math.round((1 - annualEquivalent.totalMinor / yearAtMonthly) * 100);
  }, [monthlyEquivalent, annualEquivalent]);

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 sm:p-6", className)} data-testid="seat-calculator">
      {/* ── Billing term ─────────────────────────────────────────────────── */}
      <div
        role="radiogroup"
        aria-label="Billing term"
        className="inline-flex w-full rounded-lg bg-muted p-1 sm:w-auto"
      >
        {Object.values(SEAT_TERMS).map((t) => {
          const selected = term === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTermAnd(t.id)}
              data-testid={`seat-term-${t.id.toLowerCase()}`}
              className={cn(
                "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none",
                selected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              {/* M46 — the specification's annual discount is not a constant: it
                  is 23% at 1–2 seats and 18% at 10–25, deliberately, so the
                  annual deal reads strongest where a small team is deciding
                  whether to commit. A flat "−20%" badge was wrong on three of the
                  four bands. This tracks the customer's CURRENT band, so the
                  number moves with the selector and is always the one they would
                  actually be charged. */}
              {t.id === SEAT_TERMS.ANNUAL.id && annualSavingsPct != null && (
                <span className="ml-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  −{annualSavingsPct}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Seat stepper ─────────────────────────────────────────────────── */}
      <div className="mt-6">
        <Label htmlFor={stepperId} className="text-sm text-muted-foreground">
          Team members (not counting you)
        </Label>
        <div className="mt-2 flex items-center gap-3">
          <Button
            type="button" variant="outline" size="icon"
            aria-label="Remove a seat"
            disabled={seats <= minSeats}
            onClick={() => setSeats((s) => clamp(s - 1))}
            data-testid="seat-decrement"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </Button>

          <input
            id={stepperId}
            type="number"
            inputMode="numeric"
            value={seats}
            min={minSeats}
            max={catalog.softCapSeats + 1}
            aria-describedby={`${stepperId}-price`}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              setSeats(Number.isFinite(n) ? clamp(n) : minSeats);
            }}
            className="h-11 w-24 rounded-lg border border-input bg-background text-center text-lg font-semibold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="seat-input"
          />

          <Button
            type="button" variant="outline" size="icon"
            aria-label="Add a seat"
            disabled={seats > catalog.softCapSeats}
            onClick={() => setSeats((s) => clamp(s + 1))}
            data-testid="seat-increment"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>

          {currentSeats != null && (
            <span className="ml-1 text-sm text-muted-foreground">
              {seats === currentSeats ? "current" : `now ${currentSeats}`}
            </span>
          )}
        </div>
      </div>

      {/* ── Enterprise transition ────────────────────────────────────────── */}
      {overCeiling ? (
        <div className="mt-6 rounded-xl border border-border bg-muted/40 p-5" data-testid="seat-enterprise">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="font-medium">Teams this size are priced individually</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Above {catalog.softCapSeats} seats we put together a contract with invoicing, custom terms and a
                dedicated point of contact.
              </p>
              <Button asChild className="mt-4">
                <a href={buildEnterpriseContactPath({ seats })} data-testid="seat-contact-sales">
                  Talk to sales <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Price ──────────────────────────────────────────────────── */}
          <div className="mt-6 rounded-xl bg-muted/40 p-5" id={`${stepperId}-price`} aria-live="polite">
            {quote.billableSeats === 0 ? (
              <p className="text-lg font-semibold" data-testid="seat-total">
                Free — it's just you
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-3xl font-semibold tabular-nums" data-testid="seat-effective-rate">
                    {formatMinor(quote.effectiveUnitRateMinor, quote.currency)}
                  </span>
                  <span className="text-sm text-muted-foreground">per seat / month</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground" data-testid="seat-total">
                  {formatMinor(quote.totalMinor, quote.currency)}{" "}
                  {term === SEAT_TERMS.ANNUAL.id ? "billed yearly" : "billed monthly"}
                  {" · "}
                  {quote.seatsGranted} seat{quote.seatsGranted === 1 ? "" : "s"}
                </p>
                {annualSavingMinor > 0 && (
                  <p className="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400" data-testid="seat-annual-saving">
                    You save {formatMinor(annualSavingMinor, quote.currency)} a year
                  </p>
                )}
              </>
            )}
          </div>

          {/* ── Best-price guarantee: the free-seat gift ────────────────── */}
          {quote.upgradedSeats > 0 && (
            <div
              className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3"
              data-testid="seat-bestprice"
            >
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <p className="text-sm">
                <span className="font-medium">We rounded you up to {quote.seatsGranted} seats.</span>{" "}
                {quote.seatsGranted} seats cost less than {seats} at this size, so you get{" "}
                {quote.upgradedSeats} extra seat{quote.upgradedSeats === 1 ? "" : "s"} at no charge.
              </p>
            </div>
          )}

          {/* ── Next-band nudge ────────────────────────────────────────── */}
          {!quote.upgradedSeats && nextBand && quote.billableSeats > 0 && (
            <p className="mt-3 text-sm text-muted-foreground" data-testid="seat-next-band">
              Add {nextBand.min - quote.seatsGranted} more seat{nextBand.min - quote.seatsGranted === 1 ? "" : "s"} and
              every seat drops to{" "}
              <span className="font-medium text-foreground">
                {formatMinor(
                  quoteSeats({ seats: nextBand.min, term }).unitRateMinor, quote.currency
                )}
              </span>
              .
            </p>
          )}

          {/* ── Invoice summary ────────────────────────────────────────── */}
          {quote.billableSeats > 0 && (
            <dl className="mt-5 space-y-2 border-t border-border pt-4" data-testid="seat-invoice">
              {lines.map((l) => (
                <div key={l.key} className={cn("flex items-start justify-between gap-4 text-sm", l.isTotal && "border-t border-border pt-2 font-medium")}>
                  <dt className={cn(!l.isTotal && "text-muted-foreground")}>{l.label}</dt>
                  <dd className="shrink-0 tabular-nums">{formatMinor(l.amountMinor, quote.currency)}</dd>
                </div>
              ))}
            </dl>
          )}

          <Button
            className="mt-5 w-full"
            disabled={busy || (currentSeats != null && quote.seatsGranted === currentSeats)}
            onClick={() => onSelect?.({ seats: quote.seatsGranted, requestedSeats: seats, term, quote })}
            data-testid="seat-cta"
          >
            {busy ? "Working…" : ctaLabel}
          </Button>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Seats are billed separately from credits. Your credits never expire and are never affected.
          </p>
        </>
      )}

      {/* ── Band reference ───────────────────────────────────────────────── */}
      <ul className="mt-6 grid gap-1.5 border-t border-border pt-4 text-sm" data-testid="seat-bands">
        {catalog.bands.map((b) => {
          const active = !overCeiling && quote.band && quote.band.min === b.min;
          // M46 — ask the pricing authority for the annual rate. This line used to
          // recompute it inline from a discount constant, which made the
          // calculator a second pricing authority and produced the wrong number on
          // three of the four specified bands.
          const rate = term === SEAT_TERMS.ANNUAL.id
            ? bandAnnualTerms(b, catalog)?.annualRate
            : b.rate;
          return (
            <li
              key={b.min}
              className={cn("flex items-center justify-between rounded-md px-2 py-1", active && "bg-muted font-medium")}
            >
              <span className="flex items-center gap-2">
                {active && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
                <span className={cn(!active && "text-muted-foreground")}>
                  {b.min}–{b.max} seats
                </span>
              </span>
              <span className="tabular-nums">₹{rate}<span className="text-muted-foreground">/seat</span></span>
            </li>
          );
        })}
        <li className="flex items-center justify-between px-2 py-1 text-muted-foreground">
          <span>{catalog.softCapSeats}+ seats</span>
          <span>Contact sales</span>
        </li>
      </ul>
    </div>
  );
}

export { BEST_RATE, catalog as seatCatalog };
