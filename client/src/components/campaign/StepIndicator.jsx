import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
  { id: 1, name: "Upload", description: "Upload contacts" },
  { id: 2, name: "Map", description: "Map columns" },
  { id: 3, name: "Template", description: "Create template" },
  { id: 4, name: "Preview", description: "Preview" },
  { id: 5, name: "Analyze", description: "Spam check" },
  { id: 6, name: "Confirm", description: "Review & send" },
  { id: 7, name: "Progress", description: "Track progress" }
];

/**
 * Campaign wizard progress.
 *
 * Two presentations, chosen by width rather than one presentation forced to
 * survive every width:
 *
 *   < sm   a determinate progress bar plus "Step N of 7" and the step name.
 *   >= sm  the seven-circle rail with connectors and labels.
 *
 * Why the rail is dropped on mobile rather than scrolled or shrunk. Seven 36px
 * circles plus six connectors need ~372px of layout before any page padding;
 * measured at a 320px viewport the row laid out to 372px inside a 320px box,
 * and because the app shell carries `overflow-x: hidden` the excess was not
 * scrollable, it was simply gone — step 7 was invisible and every connector had
 * been squeezed to zero width, since the connector's `flex-1` basis collapses
 * under pressure while its horizontal margins do not. That is the "missing
 * pipeline, step 7 cut off" the milestone was opened for, and it reproduced
 * exactly at 320.
 *
 * Making it fit was rejected as the goal. The circles carry no information the
 * caption underneath does not already carry — their labels are hidden below
 * `sm` anyway, so on a phone they were seven identical unlabelled discs. A
 * horizontal scroller was rejected too: this is a status display, not a
 * navigation control, and asking someone to swipe a strip sideways to find out
 * where they are is worse than telling them. A progress bar states position and
 * total exactly, in one line, legibly at 320px, which is the job.
 *
 * Semantics are the same in both presentations: a labelled `progressbar` with
 * the real numbers, so a screen reader hears "Step 3 of 7, Template" whichever
 * one is painted.
 */
export default function StepIndicator({ currentStep }) {
  const total = STEPS.length;
  const current = STEPS[currentStep - 1];
  const percent = Math.round((currentStep / total) * 100);

  return (
    <div className="w-full mb-8">
      {/* Mobile: progress bar + caption. */}
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-primary">
            Step {currentStep}: {current?.name}
          </p>
          <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {currentStep} of {total}
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={currentStep}
          aria-valuetext={`Step ${currentStep} of ${total}: ${current?.name}`}
          aria-label="Campaign progress"
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{current?.description}</p>
      </div>

      {/* >= sm: the full rail. */}
      <nav aria-label="Campaign progress" className="hidden px-2 sm:block">
        <ol className="flex items-start">
          {STEPS.map((step, stepIdx) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            return (
              <li
                key={step.id}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex items-start",
                  stepIdx !== STEPS.length - 1 && "flex-1"
                )}
              >
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 motion-reduce:transition-none",
                      isCompleted && "border-primary bg-primary",
                      isCurrent && "border-primary bg-background ring-4 ring-primary/10",
                      !isCompleted && !isCurrent && "border-border bg-background"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
                    ) : (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "text-sm font-semibold transition-colors motion-reduce:transition-none",
                          isCurrent && "text-primary",
                          !isCurrent && !isCompleted && "text-muted-foreground"
                        )}
                      >
                        {step.id}
                      </span>
                    )}
                  </div>
                  {/* min-w-0 + break-words so a label can wrap to two lines at
                      768 instead of forcing the row wider than its container;
                      the old min-w-[60px] + whitespace-nowrap did the opposite. */}
                  <p
                    className={cn(
                      "min-w-0 max-w-[8ch] break-words text-center text-xs font-medium leading-tight transition-colors motion-reduce:transition-none",
                      isCompleted && "text-foreground",
                      isCurrent && "text-primary",
                      !isCompleted && !isCurrent && "text-muted-foreground"
                    )}
                  >
                    {step.name}
                  </p>
                </div>

                {stepIdx !== STEPS.length - 1 && (
                  /* mt-[17px] centres the rule on the 36px circle (h-9 = 36,
                     minus the 2px rule, halved). min-w-[8px] keeps the
                     connector visible when flex pressure collapses its basis —
                     without it the line disappeared entirely at narrow widths
                     while its margins kept taking space. */
                  <div
                    aria-hidden="true"
                    className={cn(
                      "mx-1.5 mt-[17px] h-0.5 min-w-[8px] flex-1 rounded-full transition-colors duration-300 motion-reduce:transition-none",
                      isCompleted ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
