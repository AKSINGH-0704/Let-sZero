import { useState } from "react";
import { Redirect, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DOMAIN_ELIGIBLE_PLANS } from "@shared/schema";
import { Loader2, Building2, Globe, CheckCircle, ArrowRight } from "lucide-react";

const STEP = { IDENTITY: 1, CONFIRM: 2, SUMMARY: 3 };

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
  const line = (n) => (
    <div key={`l${n}`} style={{
      width: 32, height: 1,
      background: step >= n ? C.primary : "#2A2A4A",
      transition: "background 0.3s",
    }} />
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 28 }}>
      {dot(1)}{line(2)}{dot(2)}{line(3)}{dot(3)}
    </div>
  );
}

function AckCheck({ checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ marginTop: 3, accentColor: C.primary, width: 14, height: 14, flexShrink: 0 }}
      />
      <span style={{ color: C.subtle, fontSize: 12, lineHeight: 1.5 }}>{label}</span>
    </label>
  );
}

function Btn({ onClick, disabled, children, secondary }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "12px 20px", borderRadius: 10, border: "none", cursor: disabled ? "not-allowed" : "pointer",
        background: secondary
          ? C.surface
          : disabled ? "#1E1E30" : `linear-gradient(135deg, ${C.primary} 0%, #00B8A3 100%)`,
        color: secondary ? C.muted : disabled ? C.muted : "#06060B",
        fontWeight: 700, fontSize: 13,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        transition: "all 0.2s",
        ...(secondary ? { border: `1px solid ${C.border}` } : {}),
      }}
    >
      {children}
    </button>
  );
}

export default function Onboarding() {
  const { user, isAdmin, refetch } = useAuth();
  const [step, setStep] = useState(STEP.IDENTITY);
  const [identityType, setIdentityType] = useState(null);
  const [ack, setAck] = useState({ domain: false, optin: false, terms: false });
  const [domainName, setDomainName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [domainError, setDomainError] = useState("");
  const [dnsResult, setDnsResult] = useState(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const [platformError, setPlatformError] = useState("");

  const { data: config } = useQuery({
    queryKey: ["/api/platform-config"],
    enabled: !!user,
    staleTime: 60_000,
  });

  const platformMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/user/sending-identity", { sendingIdentityType: "platform" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sender-health"] });
      refetch();
      setJustCompleted(true);
      setStep(STEP.SUMMARY);
    },
    onError: (err) => {
      let msg = "Activation failed. Please try again.";
      try { const p = JSON.parse(err.message || ""); msg = p.message || msg; } catch {}
      setPlatformError(msg);
    },
  });

  const domainMutation = useMutation({
    mutationFn: async ({ domain, fromEmail: email }) => {
      const data = await apiRequest("POST", "/api/domains", { domain, fromEmail: email }).then(r => r.json());
      await apiRequest("POST", "/api/user/sending-identity", { sendingIdentityType: "custom_domain" });
      return data;
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

  // Users who already completed setup or are admins go straight to dashboard
  if (!justCompleted && user && (user.sendingIdentityType || isAdmin)) {
    return <Redirect to="/app/dashboard" />;
  }

  const isDomainEligible = DOMAIN_ELIGIBLE_PLANS.includes(user?.plan?.toLowerCase());

  const allAcked = ack.domain && ack.optin && ack.terms;
  const platformFromAddress = config?.platformFromAddress || null;
  const platformLimit = config?.warmup?.platformDailyLimit ?? 100;
  const customLimit = config?.warmup?.customDomainDailyLimit ?? 200;
  const durationDays = config?.warmup?.durationDays ?? 30;


  // ── Step 1: Identity type selection ───────────────────────────────────────────
  const Step1 = () => {
    const OptionCard = ({ type, icon: Icon, title, tagline, bullets, locked, lockedNote }) => {
      const active = identityType === type;
      return (
        <button
          onClick={() => !locked && setIdentityType(type)}
          style={{
            background: active ? "rgba(0,229,200,0.06)" : C.surface,
            border: `1px solid ${active ? C.primary : C.border}`,
            borderRadius: 12, padding: "16px 20px", textAlign: "left",
            cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.55 : 1,
            boxShadow: active ? `0 0 0 1px ${C.primary}` : "none",
            transition: "all 0.2s", width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0, marginTop: 2,
              background: active ? "rgba(0,229,200,0.12)" : "rgba(255,255,255,0.05)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={16} color={active ? C.primary : C.muted} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{title}</span>
                {locked && (
                  <span style={{ background: "rgba(255,255,255,0.08)", color: C.muted, fontSize: 10, padding: "1px 7px", borderRadius: 20, fontWeight: 600 }}>
                    Starter plan+
                  </span>
                )}
              </div>
              <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>{tagline}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {bullets.map(b => (
                  <div key={b} style={{ display: "flex", alignItems: "center", gap: 6, color: C.subtle, fontSize: 11 }}>
                    <CheckCircle size={10} color={!locked ? C.primary : C.muted} />
                    {b}
                  </div>
                ))}
              </div>
              {lockedNote && (
                <p style={{ marginTop: 8, color: C.subtle, fontSize: 11 }}>
                  Your plan: <strong style={{ color: C.text }}>{user?.plan || "free"}</strong> —{" "}
                  <a href="/app/payments" style={{ color: C.primary, textDecoration: "none" }}>upgrade to unlock</a>
                </p>
              )}
            </div>
          </div>
        </button>
      );
    };

    return (
      <>
        <h2 style={{ color: C.text, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6, textAlign: "center" }}>
          Activate Your Workspace
        </h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 24, textAlign: "center" }}>
          Choose how your emails reach contacts. Takes 2 minutes.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {OptionCard({
            type: "platform",
            icon: Building2,
            title: "RepMail Platform",
            tagline: "Start sending immediately — no DNS setup required.",
            bullets: ["Ready in 2 minutes", "500 free credits included", "Upgrade to your domain any time"],
          })}
          {OptionCard({
            type: "custom_domain",
            icon: Globe,
            title: "Your Own Domain",
            tagline: "Emails come from you@yourdomain.com — best deliverability.",
            bullets: ["Best inbox rates", "Your brand in the From field", "5–10 min DNS setup"],
            locked: !isDomainEligible,
            lockedNote: !isDomainEligible,
          })}
        </div>

        {!isDomainEligible && (
          <p style={{ color: C.muted, fontSize: 11, textAlign: "center", marginBottom: 16 }}>
            You can add your own domain later from Settings after upgrading.
          </p>
        )}

        <Btn onClick={() => setStep(STEP.CONFIRM)} disabled={!identityType}>
          Continue <ArrowRight size={14} />
        </Btn>
      </>
    );
  };

  // ── Step 2a: Platform acknowledgment ─────────────────────────────────────────
  const Step2Platform = () => {
    const displayName = user?.senderName?.trim() || "Your Name";
    const fromAddr = platformFromAddress || "noreply@repmail.in";

    return (
      <>
        <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6, textAlign: "center" }}>
          What your contacts will see
        </h2>
        <p style={{ color: C.muted, fontSize: 12, marginBottom: 24, textAlign: "center" }}>
          Review your sender details before confirming.
        </p>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 20, fontFamily: "monospace", fontSize: 12 }}>
          <div style={{ color: C.muted, marginBottom: 6, fontSize: 11, fontFamily: "inherit" }}>EMAIL PREVIEW</div>
          <div style={{ color: C.text }}>
            <span style={{ color: C.muted }}>From:  </span>
            &ldquo;{displayName}&rdquo; &lt;{fromAddr}&gt;
          </div>
          <p style={{ color: "#55556A", fontSize: 11, marginTop: 6, fontFamily: "inherit" }}>
            &ldquo;{displayName}&rdquo; is your sender display name (editable in Profile).
          </p>
        </div>

        <div style={{ background: "rgba(0,229,200,0.04)", border: "1px solid rgba(0,229,200,0.12)", borderRadius: 10, padding: "14px 16px", marginBottom: 24 }}>
          <p style={{ color: C.primary, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Building your sender reputation</p>
          <p style={{ color: C.subtle, fontSize: 12, lineHeight: 1.55, margin: 0, marginBottom: 10 }}>
            To protect your deliverability, we start you at <strong style={{ color: C.text }}>{platformLimit} emails/day</strong> and
            grow to unlimited after Day {durationDays}. This is standard practice — inbox providers trust
            senders who build reputation gradually.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.muted }}>
            <span>Day 1</span>
            <div style={{ flex: 1, height: 4, background: "#2A2A4A", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: "15%", height: "100%", background: `linear-gradient(90deg, ${C.primary}, #00B8A3)`, borderRadius: 4 }} />
            </div>
            <span style={{ color: C.primary }}>Unlimited</span>
            <span>Day {durationDays}+</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          <AckCheck
            checked={ack.domain}
            onChange={e => setAck(a => ({ ...a, domain: e.target.checked }))}
            label={`I understand my emails will come from ${fromAddr} (RepMail's domain, not mine)`}
          />
          <AckCheck
            checked={ack.optin}
            onChange={e => setAck(a => ({ ...a, optin: e.target.checked }))}
            label="I will only send to contacts who have opted in to receive my emails"
          />
          <AckCheck
            checked={ack.terms}
            onChange={e => setAck(a => ({ ...a, terms: e.target.checked }))}
            label="I agree to RepMail's Terms of Service and email sending policies"
          />
        </div>

        {platformError && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 12px", marginBottom: 16, color: "#F87171", fontSize: 12 }}>
            {platformError}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <Btn secondary onClick={() => setStep(STEP.IDENTITY)}>← Back</Btn>
          <button
            onClick={() => { if (allAcked) { setPlatformError(""); platformMutation.mutate(); } }}
            disabled={!allAcked || platformMutation.isPending}
            style={{
              flex: 1, padding: "12px", borderRadius: 10, border: "none",
              background: allAcked ? `linear-gradient(135deg, ${C.primary} 0%, #00B8A3 100%)` : "#1E1E30",
              color: allAcked ? "#06060B" : C.muted,
              fontWeight: 700, fontSize: 13, cursor: allAcked ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {platformMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            I Agree — Activate
          </button>
        </div>
      </>
    );
  };

  // ── Step 2b: Custom domain ─────────────────────────────────────────────────────
  const Step2Domain = () => (
    <>
      <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6, textAlign: "center" }}>
        Add your sending domain
      </h2>
      <p style={{ color: C.muted, fontSize: 12, marginBottom: 24, textAlign: "center" }}>
        We'll generate DNS records. Most domains verify within 1 hour.
      </p>

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
          <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>This is what contacts see in the From field.</p>
        </div>
      </div>

      <div style={{ background: "rgba(0,229,200,0.04)", border: "1px solid rgba(0,229,200,0.12)", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
        <p style={{ color: C.subtle, fontSize: 11, margin: 0 }}>
          Custom domains build reputation faster: <strong style={{ color: C.text }}>{customLimit} emails/day</strong> during
          your first {durationDays}-day warm-up, then unlimited. Inbox providers trust your own domain more
          than shared infrastructure.
        </p>
      </div>

      {domainError && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 12px", marginBottom: 16, color: "#F87171", fontSize: 12 }}>
          {domainError}
        </div>
      )}

      <p style={{ color: C.muted, fontSize: 11, marginBottom: 16, textAlign: "center" }}>
        You can build your first campaign while DNS propagates. Sending unlocks once verified.
      </p>

      <div style={{ display: "flex", gap: 10 }}>
        <Btn secondary onClick={() => setStep(STEP.IDENTITY)}>← Back</Btn>
        <button
          onClick={() => {
            if (!domainName.trim() || !fromEmail.trim()) {
              setDomainError("Both fields are required");
              return;
            }
            domainMutation.mutate({ domain: domainName.trim(), fromEmail: fromEmail.trim() });
          }}
          disabled={domainMutation.isPending}
          style={{
            flex: 1, padding: "12px", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg, ${C.primary} 0%, #00B8A3 100%)`,
            color: "#06060B", fontWeight: 700, fontSize: 13, cursor: domainMutation.isPending ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {domainMutation.isPending && <Loader2 size={14} className="animate-spin" />}
          Add Domain — Verify Later
        </button>
      </div>
    </>
  );

  // ── Step 3: Activation Summary ────────────────────────────────────────────────
  const Step3 = () => {
    const isPlatform = identityType === "platform";
    const fromAddr = isPlatform
      ? (platformFromAddress || "noreply@repmail.in")
      : (dnsResult?.fromEmail || fromEmail || "you@yourdomain.com");
    const limit = isPlatform ? platformLimit : customLimit;

    const rows = [
      { icon: "📧", label: "Who recipients see", value: `"${user?.senderName?.trim() || "Your Name"}" <${fromAddr}>` },
      { icon: "💳", label: "Emails you can send today", value: `${limit} (warm-up limit — grows to unlimited after Day ${durationDays})` },
      { icon: "📈", label: "Why there's a daily limit", value: `Inbox providers trust senders who build reputation gradually. This protects your deliverability and RepMail's platform reputation.` },
      { icon: "🚀", label: "Recommended next step", value: "Create your first campaign with your most engaged contacts." },
    ];

    return (
      <>
        <div style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }}>✅</div>
        <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4, textAlign: "center" }}>
          {isPlatform ? "You're ready to send." : "Domain added — verification in progress."}
        </h2>
        <p style={{ color: C.muted, fontSize: 12, marginBottom: 24, textAlign: "center" }}>
          {isPlatform
            ? "Here's what your first campaign will look like."
            : "Build your campaign while DNS propagates — sending unlocks automatically when verified."}
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

        {!isPlatform && (
          <div style={{ background: "rgba(0,229,200,0.04)", border: "1px solid rgba(0,229,200,0.12)", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
            <p style={{ color: C.subtle, fontSize: 11, margin: 0, marginBottom: 6 }}>
              ⏳ DNS is propagating. We check automatically every 30 minutes and unlock sending once verified.
            </p>
            <Link href="/app/domains" style={{ color: C.primary, fontSize: 11, textDecoration: "none" }}>
              View DNS records in Settings → Domains →
            </Link>
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
            {isPlatform ? "Create First Campaign →" : "Build First Campaign →"}
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

          {step === STEP.IDENTITY && Step1()}
          {step === STEP.CONFIRM && identityType === "platform" && Step2Platform()}
          {step === STEP.CONFIRM && identityType === "custom_domain" && Step2Domain()}
          {step === STEP.SUMMARY && Step3()}
        </div>

        <p style={{ color: "#2A2A4A", fontSize: 11, textAlign: "center", marginTop: 20 }}>
          RepMail · Workspace Activation · Secure &amp; Private
        </p>
      </div>
    </div>
  );
}
