import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  Rocket,
  X,
  Mail,
  User,
  ShieldCheck,
  Send,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";

const DISMISS_KEY = "repmail_onboarding_dismissed";

function isDismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
}
function dismiss() {
  try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
}

const STEPS = [
  {
    key: "emailVerified",
    icon: Mail,
    label: "Email verified",
    description: "Your account email is confirmed.",
    blockedDescription: "Your email isn't verified. Contact support if this persists.",
    actionLabel: null,
    actionHref: null,
  },
  {
    key: "profileComplete",
    icon: User,
    label: "Sender profile complete",
    description: "Your name and company are set and will appear in emails.",
    blockedDescription: "Add your full name and company in Profile settings.",
    actionLabel: "Complete Profile →",
    actionHref: "/app/profile",
  },
  {
    key: "sendingIdentitySet",
    icon: ShieldCheck,
    label: "Sending identity configured",
    description: "Your sending method is set — platform or custom domain.",
    blockedDescription: "Choose how your emails are authenticated before sending.",
    actionLabel: "Configure Identity →",
    actionHref: "/app/profile",
  },
  {
    key: "firstCampaignSent",
    icon: Send,
    label: "First campaign sent",
    description: "You've successfully sent your first outbound campaign.",
    blockedDescription: null,
    actionLabel: "Create Campaign →",
    actionHref: "/app/campaigns/new",
    softStep: true, // doesn't block sending
  },
];

export default function OnboardingChecklist() {
  const { user, isAdmin } = useAuth();
  const [dismissed, setDismissed] = useState(() => isDismissed());

  const { data: status, isLoading } = useQuery({
    queryKey: ["/api/user/onboarding-status"],
    enabled: !!user && !isAdmin,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // Admins never see this widget
  if (!user || isAdmin) return null;
  if (isLoading || !status) return null;
  if (dismissed) return null;

  const steps = status.steps ?? {};
  const complete = status.complete ?? false;

  const completedCount = STEPS.filter(s => steps[s.key]).length;
  const totalCount = STEPS.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  // Sending is blocked when any non-soft step is incomplete
  const sendingBlocked = STEPS.some(s => !s.softStep && !steps[s.key]);
  const firstBlockedStep = STEPS.find(s => !s.softStep && !steps[s.key]);

  const handleDismiss = () => {
    dismiss();
    setDismissed(true);
  };

  if (complete) {
    return (
      <div
        className="flex items-center justify-between gap-4 rounded-xl px-5 py-3.5 text-sm"
        style={{ background: "rgba(0,229,200,0.05)", border: "1px solid rgba(0,229,200,0.18)" }}
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "#00E5C8" }} />
          <span className="font-medium" style={{ color: "#D1D5DB" }}>
            Your workspace is set up and{" "}
            <span style={{ color: "#00E5C8" }}>Ready to Send</span>.
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Rocket className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Complete account setup</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedCount} of {totalCount} steps done
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-4 pb-1">
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Steps */}
      <div className="px-5 py-3 space-y-3">
        {STEPS.map((step) => {
          const done = steps[step.key] ?? false;
          const StepIcon = step.icon;
          return (
            <div key={step.key} className="flex items-start gap-3">
              {done ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
              ) : (
                <Circle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/40" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className={`text-sm font-medium ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {step.label}
                  </span>
                  {step.softStep && !done && (
                    <span className="text-xs text-muted-foreground/60 italic">(optional for now)</span>
                  )}
                </div>
                {!done && (
                  <div className="flex flex-wrap items-center gap-x-3 mt-0.5">
                    <p className="text-xs text-muted-foreground">
                      {step.blockedDescription || step.description}
                    </p>
                    {step.actionHref && (
                      <Link href={step.actionHref}>
                        <span className="text-xs font-medium text-primary hover:underline cursor-pointer whitespace-nowrap">
                          {step.actionLabel}
                        </span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Blocked sending notice */}
      {sendingBlocked && firstBlockedStep && (
        <div className="mx-5 mb-4 flex items-start gap-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3.5 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-200/90 leading-relaxed">
            <span className="font-semibold">Sending is currently blocked.</span>{" "}
            {firstBlockedStep.blockedDescription || firstBlockedStep.description}
            {firstBlockedStep.actionHref && (
              <>
                {" "}
                <Link href={firstBlockedStep.actionHref}>
                  <span className="underline cursor-pointer font-medium">{firstBlockedStep.actionLabel}</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
