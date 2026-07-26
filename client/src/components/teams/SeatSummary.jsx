/**
 * SEAT SUMMARY — reusable seat-intelligence (M41).
 *
 * One place that turns (plan, seats used, seats included) into the numbers and
 * the plain-language message shown everywhere seats appear — so a customer never
 * has to compute availability themselves, and the Team page and the pricing page
 * can never disagree on what "5 / 25 used" means.
 *
 * Seat math mirrors the server's enforcement exactly (shared/schema.MAX_TEAM_MEMBERS,
 * storage.claimWorkspaceSeat): the workspace OWNER does not consume a seat, only
 * ACTIVE members do, and Enterprise is unlimited. The caller passes `used` already
 * computed as the count of active members (see TeamMembers.jsx), so this component
 * stays presentational and reuses, never re-derives, the business rule.
 */

import { cn } from "@/lib/utils";

/**
 * Pure seat calculation — exported for tests and for callers that only need the
 * numbers/message (e.g. a compact inline chip) without the full card.
 * @param {number} used      active members occupying a seat
 * @param {number} included  MAX_TEAM_MEMBERS[plan] (Infinity for Enterprise)
 */
export function computeSeatState(used, included) {
  const unlimited = included === Infinity || included == null;
  const safeUsed = Math.max(0, used || 0);
  const remaining = unlimited ? Infinity : Math.max(0, included - safeUsed);
  const full = !unlimited && safeUsed >= included;
  const pct = unlimited ? 0 : Math.min(100, included > 0 ? (safeUsed / included) * 100 : 0);

  // Tone drives colour + urgency of the message.
  let tone = "ok"; // ok | warn | full
  if (full) tone = "full";
  else if (!unlimited && remaining <= 3) tone = "warn";

  let message;
  if (unlimited) message = "Unlimited seats";
  else if (full) message = "All seats are in use";
  else if (remaining === 1) message = "Only 1 seat left";
  else message = `${remaining} seats remaining`;

  return { unlimited, used: safeUsed, included, remaining, full, pct, tone, message };
}

const TONE = {
  ok:   { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
  warn: { text: "text-amber-600 dark:text-amber-400",     bar: "bg-amber-500" },
  full: { text: "text-red-600 dark:text-red-400",         bar: "bg-red-500" },
};

/**
 * @param {object} props
 * @param {string} props.planLabel   e.g. "Growth", "Starter" (already human-readable)
 * @param {number} props.used
 * @param {number} props.included    Infinity for Enterprise
 * @param {"card"|"inline"} [props.variant="card"]
 * @param {React.ReactNode} [props.actions]  buttons rendered in the card header (e.g. Upgrade)
 */
export default function SeatSummary({ planLabel, used, included, variant = "card", actions = null, className }) {
  const s = computeSeatState(used, included);
  const tone = TONE[s.tone];

  if (variant === "inline") {
    // A compact one-liner for tight spaces (e.g. a pricing card).
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-sm", className)} data-testid="seat-summary-inline">
        <span className="font-medium tabular-nums">
          {s.unlimited ? `${s.used} members` : `${s.used} / ${s.included} seats used`}
        </span>
        <span className={cn("text-xs", tone.text)}>· {s.message}</span>
      </span>
    );
  }

  return (
    <div className={cn("rounded-xl border bg-card p-5", className)} data-testid="seat-summary">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current plan</p>
          <p className="text-lg font-semibold truncate" data-testid="seat-plan-label">{planLabel || "—"}</p>
        </div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
      </div>

      <div className="mt-4">
        <div className="flex items-end justify-between gap-3">
          <div className="text-2xl font-bold tabular-nums" data-testid="seat-count">
            {s.unlimited ? (
              <>{s.used} <span className="text-base font-medium text-muted-foreground">members</span></>
            ) : (
              <>{s.used} <span className="text-base font-medium text-muted-foreground">/ {s.included} seats used</span></>
            )}
          </div>
          <div className={cn("text-sm font-medium", tone.text)} data-testid="seat-message">{s.message}</div>
        </div>

        {!s.unlimited && (
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar"
               aria-valuenow={s.used} aria-valuemin={0} aria-valuemax={s.included}
               aria-label={`${s.used} of ${s.included} seats used`}>
            <div className={cn("h-full rounded-full transition-all", tone.bar)} style={{ width: `${s.pct}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
