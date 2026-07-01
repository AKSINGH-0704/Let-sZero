import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Link } from "wouter";
import { CheckCircle, Clock, AlertCircle, Circle, Zap } from "lucide-react";

const C = {
  primary: "#00E5C8",
  muted: "#7878A0",
  subtle: "#A0A0C0",
  text: "#D1D5DB",
  border: "rgba(0,229,200,0.1)",
  bgCard: "rgba(0,229,200,0.03)",
  bgWarn: "rgba(239,68,68,0.06)",
  borderWarn: "rgba(239,68,68,0.2)",
};

function Step({ done, label, action, actionLabel }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {done
        ? <CheckCircle size={14} style={{ color: C.primary, flexShrink: 0 }} />
        : <Circle size={14} style={{ color: "#2A2A4A", flexShrink: 0 }} />
      }
      <span style={{ color: done ? C.subtle : C.text, fontSize: 12, flex: 1 }}>{label}</span>
      {!done && action && (
        <Link href={action} style={{ color: C.primary, fontSize: 11, textDecoration: "none", whiteSpace: "nowrap" }}>
          {actionLabel || "Set up →"}
        </Link>
      )}
    </div>
  );
}

export default function SenderHealthWidget() {
  const { user, isAdmin } = useAuth();

  const prevHealthRef = useRef(null);
  const initializedRef = useRef(false);
  const [justVerified, setJustVerified] = useState(false);

  if (isAdmin) return null;

  const profileComplete = !!user?.senderName?.trim();
  const domainRegistered = user?.sendingIdentityType === "custom_domain";

  const { data: health } = useQuery({
    queryKey: ["/api/sender-health"],
    staleTime: 30_000,
    enabled: !!user,
    refetchInterval: (query) => {
      const d = query.state.data;
      // Poll while DNS is pending verification
      if (d?.identity?.sendingIdentityType === "custom_domain" && !d?.identity?.ok) return 30_000;
      return false;
    },
  });

  useEffect(() => {
    if (!health) return;
    const newVerified = health.identity?.ok === true;

    if (!initializedRef.current) {
      // First load — establish baseline without triggering celebration
      initializedRef.current = true;
      prevHealthRef.current = newVerified;
      return;
    }

    // Subsequent polling update: domain just flipped to verified
    if (prevHealthRef.current === false && newVerified === true) {
      setJustVerified(true);
    }
    prevHealthRef.current = newVerified;
  }, [health]);

  if (!health) return null;

  const { identity, reputation, policy, readiness } = health;
  const warmup = policy?.warmup;
  const isWarmupActive = warmup?.active === true;

  const domainVerified = identity?.ok === true;
  const isDomainPending = domainRegistered && !domainVerified
    && (identity?.code === "SENDER_DOMAIN_REQUIRED" || identity?.code === "DOMAIN_NOT_VERIFIED");

  const isOperationalBlock = readiness === "blocked"
    && (reputation?.code === "ACCOUNT_PAUSED" || reputation?.code === "ACCOUNT_DORMANT");

  // ── Preview Mode setup progress ────────────────────────────────────────────
  if (!domainVerified && !isWarmupActive && !isOperationalBlock) {
    return (
      <div
        style={{
          borderRadius: 12, padding: "14px 16px",
          background: C.bgCard, border: `1px solid ${C.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Zap size={13} style={{ color: C.primary }} />
          <span style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>
            Preview Mode — complete setup to unlock sending
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Step
            done={profileComplete}
            label="Set your sender name"
            action="/app/profile"
            actionLabel="Go to Profile →"
          />
          <Step
            done={domainRegistered}
            label="Connect your sending domain"
            action={domainRegistered ? "/app/domains" : "/app/onboarding"}
            actionLabel="Add Domain →"
          />
          <Step
            done={domainVerified}
            label={isDomainPending ? "DNS verification in progress…" : "Verify DNS records"}
            action={domainRegistered ? "/app/domains" : null}
            actionLabel="View DNS records →"
          />
        </div>

        {isDomainPending && (
          <p style={{ color: C.muted, fontSize: 11, marginTop: 10 }}>
            Head to{" "}
            <Link href="/app/domains" style={{ color: C.primary, textDecoration: "none" }}>
              Settings → Domains
            </Link>
            {" "}to check DNS manually at any time.
          </p>
        )}
      </div>
    );
  }

  // ── Ready (with optional just-verified celebration) ─────────────────────────
  if (readiness === "ready" && !isWarmupActive) {
    if (justVerified) {
      return (
        <div
          style={{
            borderRadius: 12, padding: "16px 18px",
            background: "rgba(0,229,200,0.06)",
            border: "1px solid rgba(0,229,200,0.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <CheckCircle size={16} style={{ color: C.primary }} />
            <span style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>
              Domain verified — you're ready to send
            </span>
          </div>
          <Link
            href="/app/campaigns/new"
            style={{
              display: "inline-block", padding: "8px 14px", borderRadius: 8,
              background: C.primary, color: "#06060B", fontSize: 12,
              fontWeight: 700, textDecoration: "none",
            }}
          >
            Create your first campaign →
          </Link>
        </div>
      );
    }

    return (
      <div
        style={{
          display: "flex", alignItems: "center", gap: 6,
          borderRadius: 12, padding: "10px 14px", fontSize: 12,
          background: C.bgCard, border: `1px solid ${C.border}`,
        }}
      >
        <CheckCircle size={14} style={{ color: C.primary, flexShrink: 0 }} />
        <span style={{ color: C.muted }}>
          Sender health: <span style={{ color: C.primary, fontWeight: 600 }}>Ready</span>
          {identity?.sendingIdentityType === "custom_domain" && " · Custom domain verified"}
        </span>
      </div>
    );
  }

  // ── Warm-up progress ───────────────────────────────────────────────────────
  if (isWarmupActive) {
    const { dailyLimit, sentToday, remainingToday, daysRemaining } = warmup;
    const sentPct = Math.min(100, Math.round((sentToday / dailyLimit) * 100));

    return (
      <div
        style={{
          borderRadius: 12, padding: "14px 16px",
          background: C.bgCard, border: `1px solid rgba(0,229,200,0.14)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={13} style={{ color: C.primary }} />
            <span style={{ color: C.text, fontWeight: 600, fontSize: 12 }}>
              Sender Warm-up
              {daysRemaining != null && (
                <span style={{ color: C.muted, fontWeight: 400 }}> — {daysRemaining}d remaining</span>
              )}
            </span>
          </div>
          <span style={{ color: C.muted, fontSize: 11 }}>
            {remainingToday ?? 0} / {dailyLimit} remaining today
          </span>
        </div>

        <div style={{ height: 5, background: "#2A2A4A", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
          <div style={{
            width: `${sentPct}%`, height: "100%",
            background: "linear-gradient(90deg, #00E5C8, #00B8A3)",
            borderRadius: 4, transition: "width 0.5s ease",
          }} />
        </div>

        <p style={{ color: C.muted, fontSize: 11 }}>
          Sending limits grow to unlimited once warm-up completes.
        </p>
      </div>
    );
  }

  // ── Operational block (paused, dormant) ────────────────────────────────────
  if (readiness === "blocked") {
    const blockedMsg = identity?.message || reputation?.message || policy?.message || "Sending is currently blocked.";
    return (
      <div
        style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          borderRadius: 12, padding: "12px 14px", fontSize: 12,
          background: C.bgWarn, border: `1px solid ${C.borderWarn}`,
        }}
      >
        <AlertCircle size={14} style={{ color: "#F87171", flexShrink: 0, marginTop: 1 }} />
        <span style={{ color: C.text }}>{blockedMsg}</span>
      </div>
    );
  }

  return null;
}
