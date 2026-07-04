import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, AlertCircle, CheckCircle2, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// Dashboard sending-status summary: ONE line, ONE deep link into the canonical
// experience (/app/onboarding pre-domain, /app/domains after). Rich detail —
// steppers, DNS records, warm-up bars, celebrations — lives on the Domains pages
// only (M19 IA); this widget never duplicates it.
//
// Hook order is invariant across renders: the query is gated with `enabled`
// and every early return happens after all hooks (M16-E root-cause lesson).
export default function SenderHealthWidget() {
  const { user, isAdmin } = useAuth();

  const { data: health } = useQuery({
    queryKey: ["/api/sender-health"],
    staleTime: 30_000,
    enabled: !!user && !isAdmin,
    // Poll (read-only) while a registered domain awaits DNS verification.
    refetchInterval: (query) => {
      const d = query.state.data;
      if (d?.identity?.sendingIdentityType === "custom_domain" && !d?.identity?.ok) return 30_000;
      return false;
    },
  });

  // Admins have no sending identity of their own.
  if (isAdmin || !user) return null;
  if (!health) return null;

  const domainRegistered = user.sendingIdentityType === "custom_domain";
  const verified = health.identity?.ok === true;
  const opBlocked = health.reputation?.ok === false; // paused / dormant
  const warmup = health.policy?.warmup;
  const warmupLimitHit = health.policy?.ok === false;

  let state;
  if (opBlocked) {
    state = {
      icon: AlertCircle,
      text: health.reputation?.message || "Sending is currently paused on your account.",
      cta: "Details",
      href: "/app/domains",
      cls: "border-destructive/25 bg-destructive/5",
      iconCls: "text-destructive",
    };
  } else if (!domainRegistered) {
    state = {
      icon: Zap,
      text: "Preview Mode — connect a sending domain to unlock campaigns.",
      cta: "Set up sending",
      href: "/app/onboarding",
      cls: "border-primary/20 bg-primary/5",
      iconCls: "text-primary",
    };
  } else if (!verified) {
    state = {
      icon: Clock,
      text: "Your domain is verifying — DNS records are checked automatically.",
      cta: "View DNS records",
      href: "/app/domains",
      cls: "border-warning/25 bg-warning/5",
      iconCls: "text-warning",
    };
  } else if (warmupLimitHit) {
    state = {
      icon: Clock,
      text: "Today's warm-up limit is reached — sending resumes after the 24-hour window.",
      cta: "Details",
      href: "/app/domains",
      cls: "border-warning/25 bg-warning/5",
      iconCls: "text-warning",
    };
  } else {
    const warmupNote = warmup?.active
      ? ` · Warm-up: ${warmup.remainingToday ?? 0}/${warmup.dailyLimit} left today`
      : "";
    state = {
      icon: CheckCircle2,
      text: `Ready to send${warmupNote}`,
      cta: "Domains",
      href: "/app/domains",
      cls: "border-success/25 bg-success/5",
      iconCls: "text-success",
    };
  }

  const Icon = state.icon;
  return (
    <Link
      href={state.href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        state.cls
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", state.iconCls)} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{state.text}</span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
        {state.cta}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
