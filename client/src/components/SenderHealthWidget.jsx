import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight } from "lucide-react";
import Banner from "@/components/common/Banner";
import WarmupExplainer from "@/components/WarmupExplainer";

// Dashboard sending-status summary: ONE status line, ONE deep link into the canonical
// experience (/app/onboarding pre-domain, /app/domains after). Rich detail — steppers,
// DNS records, warm-up schedules — lives on the Domains pages only (M19 IA); this
// widget never duplicates it. The warm-up explainer is the one exception, and it is
// disclosure rather than duplication: it stays closed until asked for.
//
// Built on the shared Banner primitive rather than wrapping the row in a Link, so the
// explainer's button and the deep link are siblings. Wrapping the row would make the
// explainer a nested interactive, which the design-system checklist forbids and which
// breaks keyboard and screen-reader traversal.
//
// Hook order is invariant across renders: the query is gated with `enabled` and every
// early return happens after all hooks (M16-E root-cause lesson).
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

  let variant = "info";
  let text = null;
  let detail = null;
  let explainer = false;
  let cta = "Domains";
  let href = "/app/domains";

  if (opBlocked) {
    variant = "danger";
    text = health.reputation?.message || "Sending is currently paused on your account.";
    cta = "Details";
  } else if (!domainRegistered) {
    variant = "info";
    text = "Preview Mode — connect a sending domain to unlock campaigns.";
    cta = "Set up sending";
    href = "/app/onboarding";
  } else if (!verified) {
    variant = "warning";
    text = "We're checking your domain setup.";
    detail = "This happens automatically — nothing for you to do.";
    cta = "View DNS records";
  } else if (warmupLimitHit) {
    variant = "warning";
    text = warmup?.dailyLimit
      ? `You've sent all ${warmup.dailyLimit.toLocaleString()} emails for today.`
      : "You've reached today's sending limit.";
    // The single most important reassurance in this widget: the customer does not
    // have to do anything, and nothing was lost. Deliberately "when your limit
    // resets" rather than "tomorrow" — the window is a rolling 24 hours from the
    // day's first send, so it can reopen later the same day.
    detail = "Your campaign carries on by itself as soon as your limit resets — nothing for you to do.";
    explainer = true;
    cta = "Details";
  } else if (warmup?.active && warmup?.isFinalStage) {
    // The ladder has finished climbing, but a daily cap still applies until the
    // warm-up window ends. Saying "warm-up complete" here reads as "no more limits"
    // and is contradicted by the number sitting next to it, so state the limit and
    // when it lifts instead of claiming completion.
    variant = "success";
    text = `Your daily limit is now ${(warmup.dailyLimit ?? 0).toLocaleString()} emails`;
    detail = warmup.daysRemaining
      ? `That's the highest step. In ${warmup.daysRemaining} ${warmup.daysRemaining === 1 ? "day" : "days"} the limit lifts, and only your credits set the pace.`
      : "That's the highest step while your domain builds trust.";
    explainer = true;
  } else if (warmup?.active) {
    variant = "info";
    text = `${(warmup.remainingToday ?? 0).toLocaleString()} of ${(warmup.dailyLimit ?? 0).toLocaleString()} emails left to send today`;
    detail = warmup.nextIncrease
      ? `Your daily limit rises to ${warmup.nextIncrease.dailyLimit.toLocaleString()} in ${warmup.nextIncrease.inDays} ${warmup.nextIncrease.inDays === 1 ? "day" : "days"}.`
      : null;
    explainer = true;
  } else {
    variant = "success";
    text = "Ready to send";
  }

  return (
    <Banner
      variant={variant}
      action={
        <Link
          href={href}
          className="inline-flex items-center gap-1 rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {cta}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      }
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="font-medium text-foreground">{text}</span>
        {explainer && (
          <WarmupExplainer
            ladder={warmup?.ladder}
            durationDays={warmup?.totalDays}
            dayIndex={warmup?.dayIndex}
          />
        )}
      </div>
      {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
    </Banner>
  );
}
