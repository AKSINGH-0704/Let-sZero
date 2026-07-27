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
    text = "Your domain is verifying — DNS records are checked automatically.";
    cta = "View DNS records";
  } else if (warmupLimitHit) {
    variant = "warning";
    text = "You've sent today's full amount.";
    // The single most important reassurance in this widget: the customer does not
    // have to do anything, and nothing was lost.
    detail = "Any campaign still running continues automatically when tomorrow's sending opens.";
    explainer = true;
    cta = "Details";
  } else if (warmup?.active && warmup?.isFinalStage) {
    // The ladder has finished climbing. The warm-up window technically runs longer,
    // but the customer is at full volume — saying "warm-up" here would imply an
    // open-ended restriction that no longer exists.
    variant = "success";
    text = "Warm-up complete";
    detail = `You can send up to ${(warmup.dailyLimit ?? 0).toLocaleString()} emails a day.`;
    explainer = true;
  } else if (warmup?.active) {
    variant = "info";
    text = `Warm-up day ${warmup.dayIndex ?? 1} · ${(warmup.remainingToday ?? 0).toLocaleString()} of ${(warmup.dailyLimit ?? 0).toLocaleString()} sends left today`;
    detail = warmup.nextIncrease
      ? `Goes up to ${warmup.nextIncrease.dailyLimit.toLocaleString()} a day in ${warmup.nextIncrease.inDays} ${warmup.nextIncrease.inDays === 1 ? "day" : "days"}.`
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
        {explainer && <WarmupExplainer ladder={warmup?.ladder} />}
      </div>
      {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
    </Banner>
  );
}
