import { HelpCircle } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { DEFAULT_WARMUP_LADDER } from "@shared/warmupPolicy";

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
export function WarmupScheduleContent({ ladder }) {
  const stages = ladder?.length ? ladder : DEFAULT_WARMUP_LADDER;
  const fullLimit = stages[stages.length - 1].dailyLimit;
  let previousThroughDay = 0;

  return (
    <>
        <p className="font-medium text-foreground">Why your daily limit grows</p>

        <p className="text-muted-foreground">
          Mailbox providers decide where your email lands partly by how a domain has behaved
          over time. A brand-new domain sending at full volume on day one looks like a spammer
          even when everything is set up correctly. Starting smaller and building up earns the
          reputation that keeps you out of spam.
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
          Campaigns larger than a day&apos;s limit keep going on their own — the rest sends
          automatically as soon as your next day opens. Nothing to restart.
        </p>

        <p className="text-muted-foreground">
          Your credits are never affected. Unused credits stay in your account until you use
          them, and they never expire.
        </p>

        <p className="text-xs text-muted-foreground">
          After warm-up you send up to {fullLimit.toLocaleString()} a day, governed by your credit balance.
        </p>
    </>
  );
}

export default function WarmupExplainer({ ladder, className }) {
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
        <WarmupScheduleContent ladder={ladder} />
      </PopoverContent>
    </Popover>
  );
}
