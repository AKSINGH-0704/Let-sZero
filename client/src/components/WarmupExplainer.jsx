import { HelpCircle } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { DEFAULT_WARMUP_LADDER, DEFAULT_WARMUP_DURATION_DAYS } from "@shared/warmupPolicy";

// The single explanation of why sending limits rise. Rendered from the live ladder
// served by the backend, so the schedule shown can never drift from the schedule
// enforced — the numbers are not written down anywhere in the client.
//
// Popover rather than Tooltip on purpose: Radix tooltips do not open reliably on
// touch, and this is the content a confused customer on a phone most needs. The
// trigger is a real button, kept a SIBLING of any surrounding link rather than a
// child of it — the dashboard banner is a container, not a link, specifically so
// this never becomes a nested interactive.

function stageLabel(stage, previousThroughDay) {
  const from = previousThroughDay + 1;
  if (stage.throughDay === null) return `Day ${from} onwards`;
  if (stage.throughDay === from) return `Day ${from}`;
  return `Days ${from}–${stage.throughDay}`;
}

// Exported separately from the popover shell so the copy and the schedule can be
// asserted directly — Radix keeps popover content unmounted while closed, so a test
// that rendered the shell would only ever see the trigger.
export function WarmupScheduleContent({ ladder, durationDays }) {
  const stages = ladder?.length ? ladder : DEFAULT_WARMUP_LADDER;
  const totalDays = durationDays || DEFAULT_WARMUP_DURATION_DAYS;
  let previousThroughDay = 0;

  return (
    <>
        <p className="font-medium text-foreground">Why your daily limit grows</p>

        <p className="text-muted-foreground">
          Gmail, Outlook and other email providers decide whether your emails reach the inbox
          partly by watching how your domain behaves over time. A brand-new domain that
          suddenly sends at full volume looks like spam, even when everything is set up
          correctly. Starting smaller and building up is what earns your emails a place in
          the inbox.
        </p>

        <div className="rounded-md border border-border">
          <table className="w-full text-xs">
            <caption className="sr-only">Your sending schedule during warm-up</caption>
            <tbody>
              {stages.map((stage, i) => {
                const label = stageLabel(stage, previousThroughDay);
                previousThroughDay = stage.throughDay ?? previousThroughDay;
                return (
                  <tr key={i} className={i > 0 ? "border-t border-border" : undefined}>
                    <th scope="row" className="px-3 py-2 text-left font-normal text-muted-foreground">
                      {label}
                    </th>
                    <td className="px-3 py-2 text-right font-medium text-foreground">
                      {stage.dailyLimit.toLocaleString()}/day
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-muted-foreground">
          If a campaign is bigger than your daily limit, it simply carries on the next day.
          You don&apos;t need to restart anything.
        </p>

        <p className="text-muted-foreground">
          Your credits are never affected — unused credits stay in your account and never
          expire.
        </p>

        <p className="text-xs text-muted-foreground">
          After your first {totalDays} days of sending, this limit lifts and only your credit
          balance decides how much you send.
        </p>
    </>
  );
}

export default function WarmupExplainer({ ladder, durationDays, className }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Why does my daily sending limit increase?"
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className || ""}`}
        >
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))] space-y-3 text-sm">
        <WarmupScheduleContent ladder={ladder} durationDays={durationDays} />
      </PopoverContent>
    </Popover>
  );
}
