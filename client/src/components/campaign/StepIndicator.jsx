import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
  { id: 1, name: "Upload", description: "Upload contacts" },
  { id: 2, name: "Map", description: "Map columns" },
  { id: 3, name: "Template", description: "Create template" },
  { id: 4, name: "Preview", description: "AI preview" },
  { id: 5, name: "Analyze", description: "Spam check" },
  { id: 6, name: "Confirm", description: "Review & send" },
  { id: 7, name: "Progress", description: "Track progress" }
];

export default function StepIndicator({ currentStep }) {
  return (
    <div className="w-full mb-8">
      <nav aria-label="Progress">
        <ol className="flex items-center justify-between">
          {STEPS.map((step, stepIdx) => (
            <li 
              key={step.id} 
              className={cn(
                "relative flex-1",
                stepIdx !== STEPS.length - 1 && "pr-4 sm:pr-8"
              )}
            >
              {step.id < currentStep ? (
                <div className="flex items-center">
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="hidden sm:block ml-2">
                    <p className="text-sm font-medium text-foreground">{step.name}</p>
                  </div>
                  {stepIdx !== STEPS.length - 1 && (
                    <div className="absolute top-4 left-8 -ml-px h-0.5 w-full bg-primary sm:left-24" />
                  )}
                </div>
              ) : step.id === currentStep ? (
                <div className="flex items-center">
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background">
                    <span className="text-sm font-semibold text-primary">{step.id}</span>
                  </div>
                  <div className="hidden sm:block ml-2">
                    <p className="text-sm font-medium text-primary">{step.name}</p>
                  </div>
                  {stepIdx !== STEPS.length - 1 && (
                    <div className="absolute top-4 left-8 -ml-px h-0.5 w-full bg-border sm:left-24" />
                  )}
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-background">
                    <span className="text-sm text-muted-foreground">{step.id}</span>
                  </div>
                  <div className="hidden sm:block ml-2">
                    <p className="text-sm text-muted-foreground">{step.name}</p>
                  </div>
                  {stepIdx !== STEPS.length - 1 && (
                    <div className="absolute top-4 left-8 -ml-px h-0.5 w-full bg-border sm:left-24" />
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
