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

function StepCircle({ step, currentStep }) {
  const isCompleted = step.id < currentStep;
  const isCurrent = step.id === currentStep;

  return (
    <div
      className={cn(
        "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
        isCompleted && "border-primary bg-primary",
        isCurrent && "border-primary bg-background ring-4 ring-primary/10",
        !isCompleted && !isCurrent && "border-border bg-background"
      )}
    >
      {isCompleted ? (
        <Check className="h-4 w-4 text-primary-foreground" />
      ) : (
        <span
          className={cn(
            "text-sm font-semibold transition-colors",
            isCurrent && "text-primary",
            !isCurrent && !isCompleted && "text-muted-foreground"
          )}
        >
          {step.id}
        </span>
      )}
    </div>
  );
}

function StepConnector({ isCompleted }) {
  return (
    <div className="relative flex-1 mx-2">
      <div
        className={cn(
          "absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 transition-colors duration-300",
          isCompleted ? "bg-primary" : "bg-border"
        )}
      />
    </div>
  );
}

export default function StepIndicator({ currentStep }) {
  return (
    <div className="w-full mb-8">
      <nav aria-label="Progress" className="px-2">
        <ol className="flex items-center">
          {STEPS.map((step, stepIdx) => (
            <li
              key={step.id}
              className={cn(
                "flex items-center",
                stepIdx !== STEPS.length - 1 && "flex-1"
              )}
            >
              <div className="flex flex-col items-center gap-2">
                <StepCircle step={step} currentStep={currentStep} />
                <div className="hidden sm:block text-center min-w-[60px]">
                  <p
                    className={cn(
                      "text-xs font-medium transition-colors whitespace-nowrap",
                      step.id < currentStep && "text-foreground",
                      step.id === currentStep && "text-primary",
                      step.id > currentStep && "text-muted-foreground"
                    )}
                  >
                    {step.name}
                  </p>
                </div>
              </div>

              {stepIdx !== STEPS.length - 1 && (
                <StepConnector isCompleted={step.id < currentStep} />
              )}
            </li>
          ))}
        </ol>

        <div className="sm:hidden mt-4 text-center">
          <p className="text-sm font-medium text-primary">
            Step {currentStep}: {STEPS[currentStep - 1]?.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {STEPS[currentStep - 1]?.description}
          </p>
        </div>
      </nav>
    </div>
  );
}
