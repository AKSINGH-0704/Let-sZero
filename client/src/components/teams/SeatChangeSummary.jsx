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

import { useId } from "react";
import { formatMinor, SEAT_TERMS } from "@shared/seatPricing";
// M53/UX-7 — the grace window is a property of the billing system, not a number
// to retype in copy. Read it from the authority that enforces it so the sentence
// can never outlive a policy change.
import { GRACE_PERIOD_DAYS } from "@shared/subscriptionStateMachine";
import { cn } from "@/lib/utils";

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
  /**
   * True when automatic renewal is available to this workspace but cannot be
   * arranged yet because the owner has no phone number — a hard gateway
   * requirement for a recurring authorisation.
   *
   * It gets its own state rather than silently falling back to "renewal is
   * manual", because the two are not the same message: one is a fact, the other
   * is a fact plus the single action that changes it. Saying it HERE also
   * matters more than it looks — in production the checkout response redirects
   * straight to the gateway, so anything we only discover server-side would
   * reach the customer a month late.
   */
  autopayBlockedOnContact = false,
  autopayAtCheckout = true,
  onAutopayChange,
}) {
  // Stable across server render and hydration (React 18). Ids are only needed
  // to wire aria-labelledby/aria-describedby below; hand-written ones would
  // collide the moment this component is ever mounted twice.
  const optionIdPrefix = useId();
  if (!preview) return null;
  const currency = preview.currency;
  const paysToday = preview.chargeNowMinor > 0;
  // The term the customer is committing to. Named by the pricing authority, never
  // restated here — a term label in a component is a label that goes stale.
  const termLabel = SEAT_TERMS[preview.renewal?.term ?? preview.scheduled?.term]?.label ?? null;

  // Automatic only if ALL THREE hold: the platform says so, the customer has not
  // just declined it on this very screen, and nothing is blocking an instrument
  // from being registered at all.
  //
  // The third clause is not redundant. `renewalMode` answers "is this workspace
  // in the rollout?", which stays AUTOMATIC even when the owner has no phone
  // number and therefore cannot have a mandate. Without it, the summary row
  // would read "Then 2 Sep" — an automatic charge — directly above a paragraph
  // explaining that renewal will be manual.
  const willAutoRenew = renewalMode === "AUTOMATIC"
    && (!offerAutopay || autopayAtCheckout)
    && !autopayBlockedOnContact;

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
        {/* M53/UX-5 — the term was the one commercial fact this screen never
            stated. An annual buyer committing ₹19,500 saw a date twelve months
            out and no word confirming they were buying a year; the per-seat rate
            and "billed yearly" label both live on the calculator, one step back
            and already dismissed. Read from the pricing authority's own label. */}
        {termLabel && (
          <Row label="Billing term" value={termLabel} testId="confirm-term" />
        )}
        {preview.renewal?.totalMinor != null && (
          <Row
            label={`${willAutoRenew ? "Then" : "Renew by"} ${fmtDate(preview.renewal.at)}`}
            value={formatMinor(preview.renewal.totalMinor, currency)}
            testId="confirm-renewal"
          />
        )}
      </dl>

      {/* M53/UX-6 — "is anything added at checkout?" is the question this answers,
          and it is answerable. What is NOT answerable here is the tax treatment:
          the pricing authority makes no tax claim, GST invoicing is unbuilt
          (SEAT-004), and the renewal receipt email already tells customers a GST
          invoice is not included. So this states the fact that is true under
          every tax treatment — the figure above is what leaves the account — and
          invents nothing about GST. */}
      <p className="text-xs text-muted-foreground" data-testid="confirm-total-note">
        {formatMinor(preview.chargeNowMinor, currency)} is the full amount charged today — nothing is
        added at checkout.
      </p>

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

      {/* The automatic-renewal decision, made BEFORE paying — never after, never
          silently.

          M53/UX-4 — this was a single PRE-TICKED checkbox. The disclosure beside
          it was already excellent (exact amount, exact date, how to stop), but a
          pre-ticked box is the classic dark-pattern shape for consent to a
          standing bank authorisation, and it is the one thing on this screen a
          regulator, a chargeback or a dispute would look at first. A ticked box
          also hides the alternative: nothing on the screen told the customer that
          declining was an option at all.

          Two visible options fix both. The choice is now explicit and legible,
          each option states its own consequence, and neither is a hidden default.

          ⚠️ One IS pre-selected, deliberately. Requiring an untouched customer to
          choose before they can pay would let an unanswered question block the
          SALE — and the rule that outranks everything in this journey (ADR-023)
          is that arranging automatic renewal must never cost the customer their
          purchase. A visible, labelled, equally-weighted default is the strongest
          position available that cannot block checkout. */}
      {offerAutopay ? (
        <div
          role="radiogroup"
          aria-label="How would you like to renew?"
          className="space-y-2"
          data-testid="autopay-consent"
        >
          {[
            {
              value: true,
              testId: "autopay-choice-auto",
              title: "Renew automatically",
              body: preview.renewal?.totalMinor != null
                ? `We'll charge ${formatMinor(preview.renewal.totalMinor, currency)} on ${fmtDate(preview.renewal.at)} and each period after, using this payment method. We always email you first, and you can turn it off any time — it won't cancel your subscription.`
                : "We'll charge your renewal to this payment method. We always email you first, and you can turn it off any time — it won't cancel your subscription.",
            },
            {
              value: false,
              testId: "autopay-choice-manual",
              title: "Remind me instead",
              body: "We'll email you before your period ends and you pay when you're ready. Nothing is charged automatically.",
            },
          ].map((opt) => {
            const selected = autopayAtCheckout === opt.value;
            // M58/A11Y-002 — the wrapping <label> made each radio's accessible
            // NAME its entire label text: title, em dash, and a forty-word
            // consequence. A screen-reader user heard the whole paragraph twice
            // (once reading the group, once on focus) and had to hold both
            // options in memory to compare them. Naming the radio with its
            // title and DESCRIBING it with its consequence is the same
            // information in the two slots ARIA has for exactly this: the
            // choice is announced as "Renew automatically, radio button,
            // selected", and the detail follows. Nothing visual changes, and
            // the label still makes the whole card clickable.
            const nameId = `${optionIdPrefix}-${opt.testId}-name`;
            const descId = `${optionIdPrefix}-${opt.testId}-desc`;
            return (
              <label
                key={opt.testId}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                  selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                )}
                data-testid={opt.testId}
              >
                <input
                  type="radio"
                  name="seat-renewal-choice"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                  checked={selected}
                  onChange={() => onAutopayChange?.(opt.value)}
                  aria-labelledby={nameId}
                  aria-describedby={descId}
                  data-testid={`${opt.testId}-input`}
                />
                <span className="text-sm">
                  <span id={nameId} className="font-medium text-foreground">{opt.title}</span>
                  {" — "}<span id={descId}>{opt.body}</span>
                </span>
              </label>
            );
          })}
        </div>
      ) : autopayBlockedOnContact ? (
        <p className="text-sm" data-testid="autopay-blocked">
          <span className="font-medium text-foreground">Renewal will be manual.</span>{" "}
          To renew automatically, add a phone number to your sender profile — your bank needs it to
          approve a recurring payment. You can do that any time; it won't affect this purchase.
        </p>
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
          cheaper than answering it in support after it has happened.

          M53/UX-7 — "not straight away" was reassuring and unbounded, which is
          the shape of an answer that generates the follow-up question rather
          than closing it. The system enforces a definite window, so quote it. */}
      {/* CDP-2 — this note used to be identical in both renewal modes, which put
          a contradiction on one screen: a customer who had just selected "Remind
          me instead — nothing is charged automatically" then read that we would
          "retry" a payment. Nothing retries for them; their risk is forgetting,
          not a decline. The grace window is the same either way (a period that
          ends unpaid enters it regardless of how it was meant to be paid), so
          only the cause and the remedy change. */}
      <p className="text-xs text-muted-foreground" data-testid="confirm-failure-note">
        {willAutoRenew ? (
          <>
            If a payment ever fails, nothing is switched off straight away — your whole team keeps
            working for {GRACE_PERIOD_DAYS} days while we retry and email you.
          </>
        ) : (
          <>
            If you don't renew in time, nothing is switched off straight away — your whole team keeps
            working for {GRACE_PERIOD_DAYS} days while we email you reminders.
          </>
        )}
      </p>
    </div>
  );
}
