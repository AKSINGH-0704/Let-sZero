/**
 * SEAT CHANGE SUMMARY — the body of the seat-change confirmation (M52).
 *
 * This is the highest-stakes screen in the product: the last thing a customer
 * reads before money leaves their account, and — since M52 — before they
 * authorise a standing arrangement with their bank. It has one job, stated as
 * five questions it must answer without the customer doing any arithmetic:
 *
 *   • What am I paying today?
 *   • How many seats do I get, and when?
 *   • When am I charged again, and how much?
 *   • Will that happen by itself?
 *   • What happens if a payment fails?
 *
 * ── WHY THIS IS ITS OWN COMPONENT ───────────────────────────────────────────
 * It lived inline in the confirmation dialog, which only mounts after a state
 * change — so it could not be rendered by this repository's SSR test harness
 * (`renderToString`; there is no jsdom or testing-library here), and every claim
 * it made about a customer's money was verifiable only by reading the source.
 * M50-C is unambiguous that a UI change is not verified until it has been
 * rendered and looked at. Extracting the body makes that possible.
 *
 * Purely presentational: every number arrives already computed by the server's
 * preview, which is the SAME object checkout recomputes before charging. It
 * derives no price, no seat count and no renewal date.
 */

import { formatMinor } from "@shared/seatPricing";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function Row({ label, value, testId }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt>{label}</dt>
      <dd className="font-semibold tabular-nums text-foreground" data-testid={testId}>{value}</dd>
    </div>
  );
}

export default function SeatChangeSummary({
  preview,
  /**
   * The SERVER's answer to "does this renew by itself?" (`/api/seats/subscription`
   * → `renewalMode`), passed through verbatim rather than as a boolean somebody
   * else already reduced.
   *
   * M44 is the reason: the page once promised "Next charge ₹X" for a system that
   * could not charge anyone, and the fix was to make one server-derived field the
   * only thing any surface may consult. This component states things about a
   * customer's money, so it consults that field itself — it does not accept a
   * pre-computed promise. Defaults to MANUAL, because promising a charge that
   * never happens costs a customer their team while an extra reminder costs
   * nothing.
   */
  renewalMode = "MANUAL",
  /** True when the customer is being offered the AutoPay decision right now. */
  offerAutopay = false,
  autopayAtCheckout = true,
  onAutopayChange,
}) {
  if (!preview) return null;
  const currency = preview.currency;
  const paysToday = preview.chargeNowMinor > 0;

  // Automatic only if the platform says so AND — where the choice is live on
  // this very screen — the customer has not just declined it.
  const willAutoRenew = renewalMode === "AUTOMATIC" && (!offerAutopay || autopayAtCheckout);

  // ── Deferred change: nothing moves today ──────────────────────────────────
  if (!paysToday) {
    const scheduled = preview.scheduled;
    const effective = preview.effectiveSeats ?? 0;
    const losingSeats = scheduled?.seats != null && scheduled.seats < effective;
    return (
      <div className="space-y-4 text-left" data-testid="seat-summary-scheduled">
        <p>
          Nothing is charged now and nothing changes today — you keep all{" "}
          <span className="font-medium text-foreground">{effective} seats</span> until {fmtDate(scheduled?.at)}.
        </p>
        <p>
          From {fmtDate(scheduled?.at)} you'll be on{" "}
          <span className="font-medium text-foreground">{scheduled?.seats} seats</span>
          {preview.renewal?.totalMinor != null
            ? ` at ${formatMinor(preview.renewal.totalMinor, currency)}`
            : ""}
          .
        </p>
        {/* Name the consequence BEFORE they confirm, not after teammates
            disappear. Reversible, and said so — the fear this removes is
            "have I just deleted someone?" */}
        {losingSeats && (
          <p className="text-xs text-muted-foreground" data-testid="seat-summary-downgrade-warning">
            On that date, members beyond your new seat count are deactivated, most recently added first.
            Nobody is deleted and your credits are never affected — you can reactivate them by adding seats again.
          </p>
        )}
      </div>
    );
  }

  // ── Immediate change: money moves today ───────────────────────────────────
  return (
    <div className="space-y-4 text-left" data-testid="seat-summary">
      {/* A list, not a paragraph. Somebody scanning this should not have to
          parse prose to find the number leaving their account today. */}
      <dl className="space-y-2 rounded-lg border border-border bg-muted/40 p-4">
        <Row
          label="Today you pay"
          value={formatMinor(preview.chargeNowMinor, currency)}
          testId="confirm-today"
        />
        <Row
          label="Seats, available now"
          value={preview.effectiveSeats ?? preview.quote?.seatsGranted}
          testId="confirm-seats"
        />
        {preview.renewal?.totalMinor != null && (
          <Row
            label={`${willAutoRenew ? "Then" : "Renew by"} ${fmtDate(preview.renewal.at)}`}
            value={formatMinor(preview.renewal.totalMinor, currency)}
            testId="confirm-renewal"
          />
        )}
      </dl>

      {/* A mid-period upgrade charges a part-period amount. Say why in one
          plain sentence and make clear the renewal date does NOT move. The
          fraction itself is deliberately never shown — it is the calculation
          this milestone exists to take off the customer. */}
      {preview.kind === "UPGRADE" && (
        <p className="text-sm" data-testid="confirm-upgrade-note">
          Today's amount covers the extra seats for the days left in your current period.
          Your renewal date doesn't change.
        </p>
      )}

      {/* The AutoPay decision, made BEFORE paying — never after, never silently. */}
      {offerAutopay ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4" data-testid="autopay-consent">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            checked={autopayAtCheckout}
            onChange={(e) => onAutopayChange?.(e.target.checked)}
            data-testid="autopay-consent-input"
          />
          <span className="text-sm">
            <span className="font-medium text-foreground">Renew automatically</span> using this payment method.
            {preview.renewal?.totalMinor != null && (
              <>
                {" "}We'll charge {formatMinor(preview.renewal.totalMinor, currency)} on{" "}
                {fmtDate(preview.renewal.at)} and each period after.
              </>
            )}
            {" "}We always email you first, and you can turn this off any time — it won't cancel your subscription.
          </span>
        </label>
      ) : willAutoRenew ? (
        <p className="text-sm" data-testid="autopay-existing">
          This renews automatically on your saved payment method. Nothing else to set up.
        </p>
      ) : (
        <p className="text-sm" data-testid="autopay-manual">
          Renewal is manual — we'll email you a reminder before your period ends.
        </p>
      )}

      {/* What happens if it fails. Every customer wonders; answering it here is
          cheaper than answering it in support after it has happened. */}
      <p className="text-xs text-muted-foreground" data-testid="confirm-failure-note">
        If a payment ever fails, nothing is switched off straight away — your whole team keeps working
        while we retry and email you.
      </p>
    </div>
  );
}
