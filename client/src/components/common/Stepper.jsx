import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

// Guided-flow stepper. Horizontal on >=sm, vertical on mobile.
// steps: [{ label, state: "done" | "active" | "todo" }]
// Semantics: role="list"; the active step carries aria-current="step".
export default function Stepper({ steps = [], className }) {
  return (
    <ol
      role="list"
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0", className)}
    >
      {steps.map((s, i) => {
        const done = s.state === "done";
        const active = s.state === "active";
        const last = i === steps.length - 1;
        return (
          <li
            key={s.label}
            aria-current={active ? "step" : undefined}
            className="flex items-center gap-3 sm:flex-1 sm:gap-0"
          >
            <div className="flex items-center gap-3 sm:gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors duration-base ease-standard",
                  done && "border-success bg-success text-success-foreground",
                  active && "border-primary bg-primary/10 text-primary",
                  !done && !active && "border-border bg-muted text-muted-foreground"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-sm",
                  active ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
            {/* connector (desktop only) */}
            {!last && (
              <span
                aria-hidden="true"
                className={cn(
                  "hidden h-px flex-1 sm:mx-3 sm:block",
                  done ? "bg-success" : "bg-border"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
