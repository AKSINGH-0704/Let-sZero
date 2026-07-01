import { useState } from "react";
import { Redirect, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Globe, CheckCircle } from "lucide-react";

const STEP = { DOMAIN: 1, SUMMARY: 2 };

const C = {
  bg: "#06060B",
  card: "#0C0C14",
  border: "#1A1A2E",
  primary: "#00E5C8",
  text: "#F0F0F5",
  muted: "#7878A0",
  subtle: "#A0A0C0",
  surface: "rgba(255,255,255,0.03)",
};

function StepIndicator({ step }) {
  const dot = (n) => (
    <div key={n} style={{
      width: 8, height: 8, borderRadius: "50%",
      background: step >= n ? C.primary : "#2A2A4A",
      transition: "background 0.3s",
    }} />
  );
  const line = () => (
    <div style={{
      width: 32, height: 1,
      background: step >= 2 ? C.primary : "#2A2A4A",
      transition: "background 0.3s",
    }} />
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 28 }}>
      {dot(1)}{line()}{dot(2)}
    </div>
  );
}

export default function Onboarding() {
  const { user, isRootAdmin, refetch } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(STEP.DOMAIN);
  const [domainName, setDomainName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [domainError, setDomainError] = useState("");
  const [dnsResult, setDnsResult] = useState(null);
  const [justCompleted, setJustCompleted] = useState(false);

  const { data: config } = useQuery({
    queryKey: ["/api/platform-config"],
    enabled: !!user,
    staleTime: 60_000,
  });

  const domainMutation = useMutation({
    mutationFn: async ({ domain, fromEmail: email }) => {
      return await apiRequest("POST", "/api/domains", { domain, fromEmail: email }).then(r => r.json());
    },
    onSuccess: (data) => {
      setDnsResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sender-health"] });
      refetch();
      setJustCompleted(true);
      setStep(STEP.SUMMARY);
    },
    onError: (err) => {
      let msg = err.message || "Failed to add domain";
      try { const p = JSON.parse(msg); msg = p.message || msg; } catch {}
      setDomainError(msg);
    },
  });

  // ROOT_ADMIN, isSecondaryRoot, and users who already have a domain skip onboarding
  if (!justCompleted && user && (user.sendingIdentityType || isRootAdmin || user.isSecondaryRoot)) {
    return <Redirect to="/app/dashboard" />;
  }

  const handlePreviewMode = () => navigate("/app/dashboard");

  const customLimit = config?.warmup?.customDomainDailyLimit ?? 200;
  const durationDays = config?.warmup?.durationDays ?? 30;

  // ── Step 1: Domain registration ───────────────────────────────────────────────
  const StepDomain = () => (
    <>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, margin: "0 auto 12px",
          background: "rgba(0,229,200,0.10)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Globe size={22} color={C.primary} />
        </div>
        <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>
          Connect Your Sending Domain
        </h2>
        <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.55 }}>
          Your campaigns send from your domain, not ours.<br />
          Your deliverability. Your sender reputation.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <div>
          <label style={{ color: C.muted, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
            SENDING DOMAIN
          </label>
          <input
            value={domainName}
            onChange={e => { setDomainName(e.target.value); setDomainError(""); }}
            placeholder="yourcompany.com"
            style={{
              width: "100%", padding: "10px 12px", background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        <div>
          <label style={{ color: C.muted, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
            FROM EMAIL ADDRESS
          </label>
          <input
            value={fromEmail}
            onChange={e => { setFromEmail(e.target.value); setDomainError(""); }}
            placeholder={`hello@${domainName || "yourcompany.com"}`}
            style={{
              width: "100%", padding: "10px 12px", background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box",
            }}
          />
          <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>Contacts see this in the From field.</p>
        </div>
      </div>

      <div style={{ background: "rgba(0,229,200,0.04)", border: "1px solid rgba(0,229,200,0.12)", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
        <p style={{ color: C.subtle, fontSize: 11, margin: 0 }}>
          Starts at <strong style={{ color: C.text }}>{customLimit} emails/day</strong> for the first {durationDays} days while your sending reputation builds, then unlimited.
        </p>
      </div>

      {domainError && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 12px", marginBottom: 16, color: "#F87171", fontSize: 12 }}>
          {domainError}
        </div>
      )}

      <button
        onClick={() => {
          if (!domainName.trim() || !fromEmail.trim()) {
            setDomainError("Both domain and from-email are required");
            return;
          }
          domainMutation.mutate({ domain: domainName.trim(), fromEmail: fromEmail.trim() });
        }}
        disabled={domainMutation.isPending}
        style={{
          width: "100%", padding: "12px", borderRadius: 10, border: "none",
          background: `linear-gradient(135deg, ${C.primary} 0%, #00B8A3 100%)`,
          color: "#06060B", fontWeight: 700, fontSize: 13, cursor: domainMutation.isPending ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {domainMutation.isPending && <Loader2 size={14} className="animate-spin" />}
        Add Domain
      </button>

      <button
        onClick={handlePreviewMode}
        style={{
          width: "100%", marginTop: 10, padding: "11px", borderRadius: 10,
          border: `1px solid ${C.border}`, background: "transparent",
          color: C.muted, fontWeight: 500, fontSize: 12, cursor: "pointer",
        }}
      >
        I'll add my domain later
      </button>
    </>
  );

  // ── Step 2: Activation summary ────────────────────────────────────────────────
  const StepSummary = () => {
    const fromAddr = dnsResult?.fromEmail || fromEmail || "you@yourdomain.com";

    const rows = [
      { icon: "📧", label: "Who recipients see", value: `"${user?.senderName?.trim() || "Your Name"}" <${fromAddr}>` },
      { icon: "💳", label: "Emails you can send today", value: `${customLimit} (warm-up limit — grows to unlimited after Day ${durationDays})` },
      { icon: "📈", label: "Why there's a daily limit", value: "Inbox providers trust senders who build reputation gradually. This protects your deliverability." },
      { icon: "🚀", label: "Recommended next step", value: "Create your first campaign with your most engaged contacts." },
    ];

    return (
      <>
        <div style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }}>✅</div>
        <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4, textAlign: "center" }}>
          Domain added — verification in progress.
        </h2>
        <p style={{ color: C.muted, fontSize: 12, marginBottom: 24, textAlign: "center" }}>
          Build your campaign while DNS propagates. Sending unlocks automatically once verified.
        </p>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px", marginBottom: 20 }}>
          {rows.map(({ icon, label, value }, i) => (
            <div
              key={label}
              style={{
                display: "flex", gap: 12,
                ...(i < rows.length - 1 ? { paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.04)" } : {})
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ color: C.muted, fontSize: 10, fontWeight: 600, marginBottom: 3, letterSpacing: "0.05em" }}>
                  {label.toUpperCase()}
                </div>
                <div style={{ color: C.text, fontSize: 12, lineHeight: 1.55 }}>{value}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(0,229,200,0.04)", border: "1px solid rgba(0,229,200,0.12)", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
          <p style={{ color: C.subtle, fontSize: 11, margin: 0, marginBottom: 6 }}>
            ⏳ DNS is propagating. Visit your Domains page to check manually. Sending unlocks automatically once verified.
          </p>
          <Link href="/app/domains" style={{ color: C.primary, fontSize: 11, textDecoration: "none" }}>
            View DNS records →
          </Link>
        </div>

        {dnsResult?.dnsRecords?.length > 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
            <p style={{ color: C.muted, fontSize: 11, fontWeight: 600, marginBottom: 8 }}>DNS RECORDS TO ADD</p>
            {dnsResult.dnsRecords.map((rec, i) => (
              <div key={i} style={{ marginBottom: i < dnsResult.dnsRecords.length - 1 ? 10 : 0 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
                  <span style={{ background: "rgba(0,229,200,0.12)", color: C.primary, fontSize: 10, padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>{rec.type}</span>
                  <span style={{ color: C.muted, fontSize: 11 }}>{rec.name}</span>
                </div>
                <div style={{ color: C.subtle, fontSize: 10, wordBreak: "break-all", fontFamily: "monospace" }}>{rec.value}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Link href="/app/dashboard" style={{
            padding: "12px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`,
            color: C.muted, fontSize: 13, textAlign: "center", textDecoration: "none", display: "block",
          }}>
            Go to Dashboard
          </Link>
          <Link href="/app/campaigns/new" style={{
            padding: "12px", borderRadius: 10,
            background: `linear-gradient(135deg, ${C.primary} 0%, #00B8A3 100%)`,
            color: "#06060B", fontSize: 13, fontWeight: 700, textAlign: "center", textDecoration: "none", display: "block",
          }}>
            Build First Campaign →
          </Link>
        </div>
      </>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <span style={{ color: C.primary, fontWeight: 700, fontSize: 18 }}>RepMail</span>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, position: "relative", overflow: "hidden" }}>
          <div aria-hidden style={{
            position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
            width: "70%", height: 1,
            background: `linear-gradient(90deg, transparent, ${C.primary}, transparent)`,
          }} />

          <StepIndicator step={step} />

          {step === STEP.DOMAIN && StepDomain()}
          {step === STEP.SUMMARY && StepSummary()}
        </div>

        <p style={{ color: "#555575", fontSize: 11, textAlign: "center", marginTop: 20 }}>
          RepMail · Secure &amp; Private
        </p>
      </div>
    </div>
  );
}
