import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Link } from "wouter";
import { CheckCircle, Clock, AlertCircle, Globe } from "lucide-react";

export default function SenderHealthWidget() {
  const { user, isAdmin } = useAuth();

  // Admins bypass SAS — no health widget needed for them
  if (isAdmin) return null;
  // Only show after identity setup; the onboarding guard handles users who haven't set it
  if (!user?.sendingIdentityType) return null;

  const { data: health } = useQuery({
    queryKey: ["/api/sender-health"],
    staleTime: 30_000,
    // Poll every 30s while awaiting domain DNS verification
    refetchInterval: (query) => {
      const d = query.state.data;
      if (d?.identity?.sendingIdentityType === "custom_domain" && !d?.identity?.ok) {
        return 30_000;
      }
      return false;
    },
  });

  if (!health) return null;

  const { identity, reputation, policy, readiness } = health;
  const warmup = policy?.warmup;
  const isWarmupActive = warmup?.active === true;
  const isDomainPending = identity?.sendingIdentityType === "custom_domain" && !identity?.ok
    && identity?.code === "SENDER_DOMAIN_REQUIRED";

  // If everything is ready and no warmup, show compact "all good" and return
  if (readiness === "ready" && !isWarmupActive && !isDomainPending) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
        style={{ background: "rgba(0,229,200,0.03)", border: "1px solid rgba(0,229,200,0.1)" }}
      >
        <CheckCircle className="h-4 w-4 shrink-0" style={{ color: "#00E5C8" }} />
        <span style={{ color: "#7878A0" }}>
          Sender health: <span style={{ color: "#00E5C8", fontWeight: 600 }}>Ready</span>
          {identity?.sendingIdentityType === "custom_domain" && " · Custom domain verified"}
        </span>
      </div>
    );
  }

  // DNS verification pending
  if (isDomainPending) {
    return (
      <div
        className="rounded-xl px-4 py-4 text-sm space-y-2"
        style={{ background: "rgba(0,229,200,0.03)", border: "1px solid rgba(0,229,200,0.14)" }}
      >
        <div className="flex items-center gap-3">
          <Globe className="h-4 w-4 shrink-0 animate-pulse" style={{ color: "#00E5C8" }} />
          <span style={{ color: "#D1D5DB", fontWeight: 600 }}>DNS Verification In Progress</span>
        </div>
        <p style={{ color: "#7878A0", marginLeft: 28 }}>
          Your domain is pending verification. You can build campaigns now — sending unlocks automatically once DNS records propagate.
        </p>
        <div style={{ marginLeft: 28 }}>
          <Link href="/app/domains">
            <span style={{ color: "#00E5C8", fontSize: 12, cursor: "pointer" }}>View DNS records →</span>
          </Link>
        </div>
      </div>
    );
  }

  // Warm-up progress bar
  if (isWarmupActive) {
    const { dailyLimit, sentToday, remainingToday, daysRemaining } = warmup;
    const sentPct = Math.min(100, Math.round((sentToday / dailyLimit) * 100));

    return (
      <div
        className="rounded-xl px-4 py-4 text-sm"
        style={{ background: "rgba(0,229,200,0.03)", border: "1px solid rgba(0,229,200,0.14)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" style={{ color: "#00E5C8" }} />
            <span style={{ color: "#D1D5DB", fontWeight: 600 }}>
              Sender Warm-up
              {daysRemaining != null && (
                <span style={{ color: "#7878A0", fontWeight: 400 }}> — {daysRemaining} days remaining</span>
              )}
            </span>
          </div>
          <span style={{ color: "#7878A0", fontSize: 12 }}>
            {remainingToday ?? 0} of {dailyLimit} remaining today
          </span>
        </div>

        {/* Progress bar: today's sends vs daily limit */}
        <div style={{ height: 6, background: "#2A2A4A", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
          <div style={{
            width: `${sentPct}%`, height: "100%",
            background: "linear-gradient(90deg, #00E5C8, #00B8A3)",
            borderRadius: 4, transition: "width 0.5s ease",
          }} />
        </div>

        <p style={{ color: "#7878A0", fontSize: 11 }}>
          Protecting your deliverability — sending limits grow to unlimited once warm-up completes.
        </p>
      </div>
    );
  }

  // Fallback: blocked for another reason (paused, dormant) — show warning
  if (readiness === "blocked") {
    const blockedMsg = identity?.message || reputation?.message || policy?.message || "Sending is currently blocked.";
    return (
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-4 text-sm"
        style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
        <div style={{ color: "#D1D5DB" }}>{blockedMsg}</div>
      </div>
    );
  }

  return null;
}
