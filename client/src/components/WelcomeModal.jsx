import { useLocation } from "wouter";

export default function WelcomeModal({ onDismiss }) {
  const [, setLocation] = useLocation();

  const handleCreate = () => {
    onDismiss();
    setLocation("/app/campaigns/new");
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 px-4"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-8 text-center"
        style={{ background: "#0C0C14", border: "1px solid #1A1A2E" }}
      >
        {/* Top accent glow */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "70%",
            height: "1px",
            background: "linear-gradient(90deg, transparent, #00E5C8, transparent)",
          }}
        />

        {/* Celebration emoji */}
        <div style={{ fontSize: "48px", lineHeight: 1, marginBottom: "20px" }}>🎉</div>

        {/* Heading */}
        <h2
          style={{
            color: "#F0F0F5",
            fontFamily: "'Cabinet Grotesk', 'Space Grotesk', sans-serif",
            fontSize: "22px",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: "6px",
          }}
        >
          Welcome to RepMail!
        </h2>
        <p style={{ color: "#7878A0", fontSize: "13px", marginBottom: "24px" }}>
          Congratulations — your account is ready to use.
        </p>

        {/* Credit highlight box */}
        <div
          style={{
            background: "rgba(0,229,200,0.05)",
            border: "1px solid rgba(0,229,200,0.15)",
            borderRadius: "14px",
            padding: "20px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              color: "#00E5C8",
              fontSize: "40px",
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1,
              marginBottom: "6px",
            }}
          >
            500
          </div>
          <div
            style={{
              color: "#F0F0F5",
              fontSize: "15px",
              fontWeight: 600,
              marginBottom: "10px",
            }}
          >
            FREE Trial Credits Added
          </div>
          <p style={{ color: "#7878A0", fontSize: "12px", lineHeight: "1.65", margin: 0 }}>
            That's enough to send your first{" "}
            <strong style={{ color: "#D1D5DB" }}>500 emails</strong> using RepMail.
            <br />
            Your free trial credits automatically refresh every month while your trial is active.
          </p>
        </div>

        {/* Primary CTA */}
        <button
          onClick={handleCreate}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #00E5C8 0%, #00B8A3 100%)",
            color: "#06060B",
            fontWeight: 700,
            fontSize: "14px",
            border: "none",
            cursor: "pointer",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,229,200,0.35)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          🚀 Create My First Campaign
        </button>

        {/* Secondary link */}
        <button
          onClick={onDismiss}
          style={{
            background: "none",
            border: "none",
            color: "#55556A",
            fontSize: "13px",
            cursor: "pointer",
            padding: "4px 8px",
            transition: "color 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#9898B8")}
          onMouseLeave={e => (e.currentTarget.style.color = "#55556A")}
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}
