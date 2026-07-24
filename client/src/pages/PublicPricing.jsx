/**
 * PUBLIC PRICING PAGE — RepMail by LetsZero
 * Credit-based pay-as-you-go pricing with volume bonuses and Teams add-on.
 * Standalone page (no app shell), accessible without authentication.
 */

import { useState, useEffect, Fragment } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import TeamCapabilities from "@/components/pricing/TeamCapabilities";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  Sparkles,
  Mail,
  Shield,
  CreditCard,
  Zap,
  Users,
  ArrowRight,
  Clock,
  Minus,
  Plus,
  Building2,
  BarChart3,
  Globe,
  Webhook,
  HeadphonesIcon,
  Lock,
  Server,
  Bot,
  Calendar,
  ChevronRight,
  Handshake,
} from "lucide-react";
import { cn } from "@/lib/utils";
// M39 Phase 1B/1C — shared commerce layer: persist purchase intent and route through
// the one canonical checkout, so a configured amount survives login and is resumed.
import { savePurchaseIntent, buildLoginWithResume } from "@/lib/commerce/purchaseIntent";
// M39 Phase 1C — the plan list, plan card, and credit estimator are shared components
// consumed by both this public pricing page and the in-app payments page.
import PricingCard from "@/components/pricing/PricingCard";
import PricingCalculator from "@/components/pricing/PricingCalculator";
import { MARKETING_PLANS } from "@/lib/commerce/planCatalog";
import { fmtNum, fmtINR, fmtUSD } from "@/lib/commerce/format";

// M34 — the Fontshare stylesheet that used to be injected here is gone.
// Cabinet Grotesk and General Sans are now self-hosted and declared in
// client/src/fonts.css, so this injection was fetching the same five faces a
// second time from cdn.fontshare.com: measured at 14 font requests across 3
// origins and 339KB on this page, against 6 requests from 1 origin now.

// ─── Display constant. The pricing tiers/price/bonus formula is NOT here — plan
//     numbers come from the shared catalog; USD_RATE is a display-only conversion
//     used by the volume table. The authoritative charge is always the server quote.
const USD_RATE = 83.5;


// ─── Pre-computed particle config (deterministic — no Math.random in render) ─
const PARTICLES = [
  { size: 2.0, left: 12,  top: 18,  color: "rgba(0,229,200,0.35)",  duration: 22, delay: 0,   animIdx: 0 },
  { size: 1.5, left: 28,  top: 45,  color: "rgba(255,255,255,0.12)", duration: 18, delay: 2.5, animIdx: 1 },
  { size: 2.5, left: 48,  top: 22,  color: "rgba(255,255,255,0.10)", duration: 26, delay: 1,   animIdx: 2 },
  { size: 1.8, left: 65,  top: 60,  color: "rgba(0,229,200,0.28)",  duration: 20, delay: 4,   animIdx: 0 },
  { size: 2.2, left: 78,  top: 30,  color: "rgba(255,255,255,0.15)", duration: 32, delay: 0.5, animIdx: 1 },
  { size: 1.5, left: 88,  top: 55,  color: "rgba(139,92,246,0.25)", duration: 24, delay: 3,   animIdx: 2 },
  { size: 2.0, left: 20,  top: 72,  color: "rgba(255,255,255,0.10)", duration: 28, delay: 6,   animIdx: 0 },
  { size: 1.6, left: 55,  top: 80,  color: "rgba(0,229,200,0.20)",  duration: 19, delay: 1.5, animIdx: 1 },
  { size: 2.4, left: 38,  top: 14,  color: "rgba(255,255,255,0.12)", duration: 23, delay: 5,   animIdx: 2 },
  { size: 1.8, left: 72,  top: 20,  color: "rgba(139,92,246,0.20)", duration: 30, delay: 2,   animIdx: 0 },
];



// M39 Phase 1C — the marketing plan list is the shared catalog (5 customer-facing plans).
const PLANS = MARKETING_PLANS;

// ─── Comparison table data ────────────────────────────────────────────────────
const COMPARISON_CATEGORIES = [
  {
    label: "Email & Campaigns",
    rows: [
      { label: "Email Credits", key: "credits", format: p => p.totalCredits != null ? `${p.totalCredits.toLocaleString("en-IN")}` : "Custom" },
      { label: "Active Campaigns", key: "campaigns", format: p => p.features.campaigns },
      { label: "Saved Templates", key: "templates", format: p => p.features.templates },
      { label: "Campaign Scheduling", key: "scheduling", format: p => p.features.scheduling },
      { label: "Contact Upload (CSV/Excel)", key: "contactUpload", format: p => p.features.contactUpload },
    ],
  },
  {
    label: "AI & Features",
    rows: [
      { label: "AI Personalization", key: "aiPersonalization", format: p => p.features.aiPersonalization },
      { label: "AI Spam Analysis", key: "spamAnalysis", format: p => p.features.spamAnalysis },
      { label: "Template Builder", key: "templateBuilder", format: p => p.features.templateBuilder },
      { label: "Analytics Dashboard", key: "analytics", format: p => p.features.analytics },
    ],
  },
  {
    label: "Teams & Admin",
    rows: [
      { label: "Team Members", key: "teamMembers", format: p => p.features.teamMembers },
      { label: "Audit Logs", key: "auditLogs", format: () => true },
      { label: "Audit Log Export", key: "auditExport", format: p => p.features.auditExport },
    ],
  },
  {
    label: "Credits & Billing",
    rows: [
      { label: "Bonus Credits", key: "bonusCredits", format: p => p.features.bonusCredits || false },
    ],
  },
];

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "How do credits work?",
    a: "Each credit equals one email sent. Purchase credits in bulk and use them anytime — there are no monthly fees, you only pay for what you use.",
  },
  {
    q: "Do credits expire?",
    a: "No. Credits never expire — one-time purchases, no subscriptions, no use-it-or-lose-it deadline.",
  },
  {
    q: "What's the difference between plans?",
    a: "All plans include AI Personalization, AI Spam Analysis, the full campaign system, analytics, contact upload, and up to 25 team members. Higher plans give you more templates, more active campaigns, and campaign scheduling. The plan you hold is determined by your highest purchase — you never downgrade.",
  },
  {
    q: "What's included in the free trial?",
    a: "500 credits with full access to AI Personalization, Spam Analysis, the campaign system, and up to 25 team members. Limited to 1 active campaign and 3 saved templates. Campaign scheduling is not available on the free plan.",
  },
  {
    q: "How do teams work?",
    a: "Add team members and distribute credits to them. Admins see everything. Managers see their own team. Members see only their own work. Every plan — Free Trial, Starter, Growth, and Scale — includes up to 25 team members at no extra cost. Need more? Enterprise offers unlimited seats.",
  },
  {
    q: "Can I buy more credits anytime?",
    a: "Yes. Purchase additional credits whenever you need them. Your plan level stays based on your highest purchase — buying a lower-tier top-up will not downgrade your plan.",
  },
  {
    q: "What is campaign scheduling?",
    a: "Schedule your campaigns to send automatically at a specific date and time instead of sending immediately. Available on Starter plan and above.",
  },
  {
    q: "What payment methods are accepted?",
    a: "UPI, credit/debit cards, and net banking via Razorpay. All transactions are processed in INR.",
  },
];

// ─── Volume discount table rows ───────────────────────────────────────────────
const VOLUME_ROWS = [
  { credits: 3000,   priceINR: 390,   bonus: 0,     total: 3000 },
  { credits: 5000,   priceINR: 650,   bonus: 0,     total: 5000 },
  { credits: 10000,  priceINR: 1200,  bonus: 833,   total: 10833 },
  { credits: 15000,  priceINR: 1800,  bonus: 1250,  total: 16250 },
  { credits: 25000,  priceINR: 3000,  bonus: 2083,  total: 27083 },
  { credits: 50000,  priceINR: 5500,  bonus: 4545,  total: 54545 },
  { credits: 100000, priceINR: 10000, bonus: 10000, total: 110000 },
  { credits: 300000, priceINR: 30000, bonus: 30000, total: 330000 },
];

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};



// ─── Cell renderer for comparison table ──────────────────────────────────────
function CellValue({ val }) {
  if (val === true)  return <Check className="w-4 h-4 text-emerald-400 mx-auto" />;
  if (val === false) return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full mx-auto" style={{ background: "rgba(248,113,113,0.12)" }}>
      <X className="w-3 h-3" style={{ color: "#F87171" }} />
    </span>
  );
  if (typeof val === "string") return (
    <span className="text-xs font-medium" style={{ color: "#B8B8D0", fontFamily: "'General Sans', sans-serif" }}>
      {val}
    </span>
  );
  return <span style={{ color: "#7878A0" }}>—</span>;
}


// ─── Main Component ───────────────────────────────────────────────────────────
export default function PublicPricing() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const currency = "INR";
  const [hoveredCol, setHoveredCol] = useState(null);
  const [pricingTab, setPricingTab] = useState("individual");
  const [dedicatedIpNotified, setDedicatedIpNotified] = useState(false);


  // M39 Phase 1B/1C — the estimator is genuinely purchasable. Any configured amount is a
  // valid custom purchase (the server prices and validates it — MD-003/MD-007), so we
  // persist the intent and route through the ONE canonical checkout, resuming after login
  // if the visitor is anonymous. Purchase intent is never lost.
  const handleEstimatorBuy = (credits) => {
    savePurchaseIntent({ credits });
    navigate(user ? "/app/payments?resume=1" : buildLoginWithResume("/app/payments?resume=1"));
  };

  const formatPrice = (inr, usd) => {
    if (currency === "INR") return fmtINR(inr);
    return fmtUSD(usd);
  };

  // Mobile plan ordering: Growth first, then Starter, Scale, Trial, Enterprise
  const mobilePlans = [
    PLANS.find(p => p.id === "growth"),
    PLANS.find(p => p.id === "starter"),
    PLANS.find(p => p.id === "scale"),
    PLANS.find(p => p.id === "trial"),
    PLANS.find(p => p.id === "enterprise"),
  ];

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{
        background: "#06060B",
        fontFamily: "'General Sans', 'Inter', sans-serif",
      }}
    >
      {/* ── CSS Keyframe Animations ─────────────────────────────────────── */}
      <style>{`
        @keyframes heroBgDrift {
          0%   { background-position: 0% 0%,   100% 0%,   50% 100%; }
          33%  { background-position: 30% 20%,  70% 30%,   20% 80%;  }
          66%  { background-position: 10% 40%,  90% 10%,   80% 60%;  }
          100% { background-position: 0% 0%,   100% 0%,   50% 100%; }
        }
        @keyframes orbFloat1 {
          0%,100% { transform: translate(0,0) scale(1); }
          25%     { transform: translate(40px,-30px) scale(1.05); }
          50%     { transform: translate(-20px,40px) scale(0.95); }
          75%     { transform: translate(30px,20px) scale(1.02); }
        }
        @keyframes orbFloat2 {
          0%,100% { transform: translate(0,0) scale(1); }
          25%     { transform: translate(-35px,25px) scale(1.03); }
          50%     { transform: translate(25px,-35px) scale(0.97); }
          75%     { transform: translate(-15px,-20px) scale(1.04); }
        }
        @keyframes orbFloat3 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%     { transform: translate(50px,-40px) scale(1.06); }
          66%     { transform: translate(-30px,30px) scale(0.94); }
        }
        @keyframes orbFloat4 {
          0%,100% { transform: translate(0,0) scale(1); }
          30%     { transform: translate(-40px,-20px) scale(1.04); }
          60%     { transform: translate(30px,35px) scale(0.96); }
        }
        @keyframes particleDrift0 {
          0%,100% { transform: translate(0,0); opacity: 0.2; }
          50%     { transform: translate(30px,-40px); opacity: 0.55; }
        }
        @keyframes particleDrift1 {
          0%,100% { transform: translate(0,0); opacity: 0.3; }
          50%     { transform: translate(-25px,30px); opacity: 0.12; }
        }
        @keyframes particleDrift2 {
          0%,100% { transform: translate(0,0); opacity: 0.15; }
          50%     { transform: translate(40px,20px); opacity: 0.45; }
        }
        @keyframes beamPulse {
          0%,100% { opacity: 0.35; }
          50%     { opacity: 0.75; }
        }
        @keyframes popularGlowPulse {
          0%,100% { opacity: 0.55; transform: scale(1.18); }
          50%     { opacity: 0.85; transform: scale(1.25); }
        }
        @keyframes scrollDot {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50%       { transform: translateY(12px); opacity: 0.3; }
        }
      `}</style>

      {/* ── LAYER 0: Full-page subtle grid pattern (fixed) ─────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='0.35' opacity='0.035'%3E%3Cpath d='M0 0h60v60H0z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ── LAYER 1: Floating ambient orbs ─────────────────────────────── */}
      {/* Orb 1 — Cyan, hero/top-left */}
      <div data-ambient
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "8%",
          left: "12%",
          width: "520px",
          height: "520px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,229,200,0.07) 0%, transparent 70%)",
          filter: "blur(80px)",
          animation: "orbFloat1 26s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Orb 2 — Violet, upper-right */}
      <div data-ambient
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "4%",
          right: "8%",
          width: "420px",
          height: "420px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.055) 0%, transparent 70%)",
          filter: "blur(100px)",
          animation: "orbFloat2 31s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Orb 3 — Cyan, mid-page near plan cards */}
      <div data-ambient
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "42%",
          left: "45%",
          width: "580px",
          height: "580px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,229,200,0.04) 0%, transparent 70%)",
          filter: "blur(110px)",
          animation: "orbFloat3 36s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Orb 4 — Violet, lower/enterprise area */}
      <div data-ambient
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "12%",
          right: "18%",
          width: "440px",
          height: "440px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.045) 0%, transparent 70%)",
          filter: "blur(90px)",
          animation: "orbFloat4 29s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ── LAYER 2: Noise / film-grain texture (fixed overlay) ────────── */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          opacity: 0.018,
          pointerEvents: "none",
          zIndex: 1,
          mixBlendMode: "overlay",
        }}
      />

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: "rgba(6,6,11,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(26,26,46,0.8)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/products/repmail" className="flex items-center group">
            <img src="/repmail-logo-white.png" alt="RepMail" className="h-14 w-auto" style={{ objectFit: "contain" }} />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ color: "#8888A0" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#F0F0F5")}
                onMouseLeave={e => (e.currentTarget.style.color = "#8888A0")}
              >
                Sign In
              </button>
            </Link>
            <Link href="/login">
              <button
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: "linear-gradient(135deg, #00E5C8 0%, #00B8A3 100%)",
                  color: "#06060B",
                  boxShadow: "0 4px 20px rgba(0,229,200,0.2)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,229,200,0.3)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,229,200,0.2)";
                }}
              >
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section data-ambient
        className="relative pt-24 pb-16 px-4 sm:px-6 text-center overflow-hidden"
        style={{
          background: "#06060B",
          backgroundImage: [
            "radial-gradient(ellipse 80% 50% at 20% 40%, rgba(0,229,200,0.06) 0%, transparent 50%)",
            "radial-gradient(ellipse 60% 40% at 75% 25%, rgba(139,92,246,0.05) 0%, transparent 50%)",
            "radial-gradient(ellipse 50% 60% at 50% 85%, rgba(0,229,200,0.03) 0%, transparent 50%)",
          ].join(", "),
          backgroundSize: "200% 200%",
          animation: "heroBgDrift 25s ease-in-out infinite",
        }}
      >
        {/* Perspective grid — desktop only */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none hidden md:block"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='0.4' opacity='0.04'%3E%3Cpath d='M0 0h60v60H0z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
            transform: "perspective(1000px) rotateX(12deg)",
            transformOrigin: "center top",
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 55%)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 55%)",
            zIndex: 0,
          }}
        />

        {/* Horizontal light beam — desktop only */}
        <div data-ambient
          aria-hidden="true"
          className="absolute left-0 w-full pointer-events-none hidden md:block"
          style={{
            top: "38%",
            height: "1px",
            background: "linear-gradient(90deg, transparent 0%, rgba(0,229,200,0.07) 25%, rgba(139,92,246,0.05) 75%, transparent 100%)",
            boxShadow: "0 0 60px 20px rgba(0,229,200,0.015)",
            animation: "beamPulse 8s ease-in-out infinite",
            zIndex: 0,
          }}
        />

        {/* Floating particles — hero area */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true" style={{ zIndex: 0 }}>
          {PARTICLES.map((p, i) => (
            <div data-ambient
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                background: p.color,
                left: `${p.left}%`,
                top: `${p.top}%`,
                animation: `particleDrift${p.animIdx} ${p.duration}s ease-in-out infinite`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
            style={{
              background: "rgba(0,229,200,0.06)",
              border: "1px solid rgba(0,229,200,0.15)",
              color: "#00E5C8",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            <Zap className="w-3 h-3" />
            Pay only for what you send
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold leading-tight mb-6"
            style={{
              fontFamily: "'Cabinet Grotesk', 'Space Grotesk', sans-serif",
              background: "linear-gradient(135deg, #FFFFFF 0%, #C0C0D0 55%, #8888A0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.02em",
            }}
          >
            Flexible,<br />Credit-Based Pricing
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-lg md:text-xl mb-10 max-w-2xl mx-auto"
            style={{ color: "#C8C8D8", lineHeight: 1.7 }}
          >
            Pay only for what you send. No monthly fees. No hidden costs.
            Buy credits, send emails. It's that simple.
          </motion.p>

          {/* Trust strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap justify-center gap-6 md:gap-10"
          >
            {[
              { icon: <Zap className="w-4 h-4" />, label: "Pay-as-you-go" },
              { icon: <Shield className="w-4 h-4" />, label: "No monthly fees" },
              { icon: <Clock className="w-4 h-4" />, label: "Credits never expire" },
              { icon: <CreditCard className="w-4 h-4" />, label: "No hidden costs" },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 text-sm font-medium"
                style={{ color: "#A8A8C0" }}
              >
                <span style={{ color: "#00E5C8" }}>{icon}</span>
                {label}
              </div>
            ))}
          </motion.div>

          {/* Scroll down indicator */}
          <div
            className="hidden sm:flex flex-col items-center gap-2 pt-8 pb-4 cursor-pointer opacity-60 hover:opacity-100 transition-opacity duration-300"
            onClick={() => document.getElementById("credit-estimator")?.scrollIntoView({ behavior: "smooth" })}
          >
            <span className="text-[11px] uppercase tracking-[0.25em] font-medium" style={{ color: "#9CA3AF" }}>
              Scroll to explore
            </span>
            <div className="w-6 h-10 rounded-full flex justify-center pt-2" style={{ border: "2px solid rgba(156,163,175,0.35)" }}>
              <div data-ambient className="w-1.5 h-1.5 rounded-full" style={{ background: "#00E5C8", animation: "scrollDot 2s ease-in-out infinite" }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Section Glow Divider ─────────────────────────────────────────── */}
      <div aria-hidden="true" className="relative w-full" style={{ height: "1px", zIndex: 2 }}>
        <div style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "1px",
          background: "radial-gradient(ellipse at center, rgba(0,229,200,0.18) 0%, transparent 70%)",
        }} />
      </div>

      {/* ── Credit Estimator ──────────────────────────────────────────────── */}
      <section id="credit-estimator" className="relative px-4 sm:px-6 pb-24" style={{ background: "#06060B", zIndex: 2 }}>
        <div className="max-w-5xl mx-auto">
          <PricingCalculator currency={currency} onBuy={handleEstimatorBuy} />
        </div>
      </section>

      {/* ── Section Glow Divider ─────────────────────────────────────────── */}
      <div aria-hidden="true" className="relative w-full" style={{ height: "1px", zIndex: 2 }}>
        <div style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          width: "500px",
          height: "1px",
          background: "radial-gradient(ellipse at center, rgba(139,92,246,0.15) 0%, transparent 70%)",
        }} />
      </div>

      {/* ── Plan Cards ────────────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 pb-32" style={{ background: "#06060B", zIndex: 2 }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <div
              className="inline-block w-10 h-px mb-4"
              style={{ background: "#00E5C8" }}
            />
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{
                fontFamily: "'Cabinet Grotesk', 'Space Grotesk', sans-serif",
                color: "#F0F0F5",
                letterSpacing: "-0.02em",
              }}
            >
              Choose Your Starting Pack
            </h2>
            <p className="text-base" style={{ color: "#A8A8C0" }}>
              One-time purchases. No subscriptions. Scale at your own pace.
            </p>
          </motion.div>

          {/* ── Individual / Teams Tab Toggle ─────────────────────────── */}
          <div className="flex justify-center mb-10">
            <div
              className="relative inline-flex rounded-xl p-1"
              style={{ background: "#16162A", border: "1px solid #2A2A45" }}
            >
              <motion.div
                className="absolute inset-y-1 rounded-lg"
                style={{ background: "#00E5C8", width: "calc(50% - 4px)" }}
                animate={{ x: pricingTab === "teams" ? "calc(100% + 8px)" : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
              {[
                { id: "individual", label: "Individual" },
                { id: "teams", label: "Teams" },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setPricingTab(id)}
                  className="relative z-10 px-8 py-2.5 text-sm font-semibold rounded-lg transition-colors"
                  style={{ color: pricingTab === id ? "#06060B" : "#8888A0" }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {pricingTab === "individual" ? (
              <motion.div
                key="individual"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Desktop: 5-col grid.
                    M35-D — this was an inline repeat(5, 1fr) from `md` (768px)
                    up. `1fr` is minmax(auto, 1fr), so a track never shrinks
                    below its content's min-content width (~185px per card):
                    five cards need ~925px, and between 768 and ~1023px the
                    fifth was pushed past the viewport where the ancestor's
                    overflow-x-hidden clipped it. scrollWidth stayed equal to
                    clientWidth, so there was no scrollbar either — the Volume
                    Pricing plan was simply unreachable on an iPad. Column
                    counts now come from breakpoints, which the inline style
                    could not express. */}
                <motion.div
                  className="hidden gap-5 md:grid md:grid-cols-3 lg:grid-cols-5"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-80px" }}
                  variants={staggerContainer}
                >
                  {PLANS.map(plan => (
                    <PricingCard key={plan.id} plan={plan} currency={currency} mode="marketing" user={user} />
                  ))}
                </motion.div>
                {/* Mobile */}
                <motion.div
                  className="flex md:hidden flex-col gap-4"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-80px" }}
                  variants={staggerContainer}
                >
                  {mobilePlans.map(plan => (
                    <PricingCard key={plan.id} plan={plan} currency={currency} mode="marketing" user={user} />
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="teams"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* 3-step hierarchy */}
                <motion.div
                  className="grid md:grid-cols-3 gap-4 mb-8"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-80px" }}
                  variants={staggerContainer}
                >
                  {[
                    {
                      step: "01",
                      title: "You're the Admin",
                      desc: "Purchase credits and manage your entire account. You see everything — all team activity, all campaigns, all audit logs.",
                      color: "#00E5C8",
                      bg: "rgba(0,229,200,0.04)",
                      border: "rgba(0,229,200,0.12)",
                    },
                    {
                      step: "02",
                      title: "Create Team Managers",
                      desc: "Appoint managers who can create their own team members and distribute credits you allocate to them.",
                      color: "#60A5FA",
                      bg: "rgba(96,165,250,0.04)",
                      border: "rgba(96,165,250,0.12)",
                    },
                    {
                      step: "03",
                      title: "Team Members Send",
                      desc: "Each member gets their allocated credits and works independently — creating campaigns, uploading contacts, and sending emails.",
                      color: "#A78BFA",
                      bg: "rgba(139,92,246,0.04)",
                      border: "rgba(139,92,246,0.12)",
                    },
                  ].map(({ step, title, desc, color, bg, border }) => (
                    <motion.div
                      key={step}
                      variants={cardVariant}
                      className="rounded-xl p-5"
                      style={{ background: bg, border: `1px solid ${border}` }}
                    >
                      <div
                        className="text-xs font-bold mb-3 font-mono"
                        style={{ color, letterSpacing: "0.2em" }}
                      >
                        STEP {step}
                      </div>
                      <div
                        className="text-sm font-semibold mb-2"
                        style={{ color: "#F0F0F5", fontFamily: "'Cabinet Grotesk', sans-serif" }}
                      >
                        {title}
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "#9898B8" }}>{desc}</p>
                    </motion.div>
                  ))}
                </motion.div>

                {/* 4 highlight cards */}
                <motion.div
                  className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-80px" }}
                  variants={staggerContainer}
                >
                  {[
                    { icon: <Lock className="w-5 h-5" />, title: "Isolated Visibility", desc: "Members see only their own work", color: "#00E5C8" },
                    { icon: <CreditCard className="w-5 h-5" />, title: "Credit Control", desc: "Cascading credit allocation", color: "#60A5FA" },
                    { icon: <BarChart3 className="w-5 h-5" />, title: "Audit Trail", desc: "Every action logged", color: "#A78BFA" },
                    { icon: <Users className="w-5 h-5" />, title: "Flexible Hierarchy", desc: "Scale as you grow", color: "#34D399" },
                  ].map(({ icon, title, desc, color }) => (
                    <motion.div
                      key={title}
                      variants={cardVariant}
                      className="rounded-xl p-4 text-center"
                      style={{ background: "#0C0C14", border: "1px solid #1A1A2E" }}
                    >
                      <div
                        className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3"
                        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
                      >
                        <span style={{ color }}>{icon}</span>
                      </div>
                      <div className="text-xs font-semibold mb-1" style={{ color: "#F0F0F5" }}>{title}</div>
                      <div className="text-xs" style={{ color: "#7878A0" }}>{desc}</div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Billing calculator */}
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.6 }}
                  className="rounded-2xl p-8 md:p-10 mb-8"
                  style={{ background: "#0C0C14", border: "1px solid #1A1A2E" }}
                >
                  <TeamCapabilities
                    plans={PLANS}
                    formatPlanPrice={(p) => fmtINR(p.priceINR)}
                    rolesNote="Team seats are included in every plan, free trial included."
                  />
                </motion.div>

                {/* Team action cards */}
                <div className="grid md:grid-cols-2 gap-5">
                  {/* How to activate your team */}
                  <div className="rounded-2xl p-6 flex flex-col h-full" style={{ background: "#0C0C14", border: "1px solid rgba(0,229,200,0.12)" }}>
                    <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#00E5C8", letterSpacing: "0.15em" }}>
                      Getting Started
                    </div>
                    <div className="text-xl font-semibold mb-5" style={{ color: "#F0F0F5", fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                      How to activate your team
                    </div>
                    <div className="space-y-4 flex-1">
                      {[
                        { n: "1", title: "Invite team members", desc: "Go to Team Management and invite up to 25 people — free, on any plan, no purchase required." },
                        { n: "2", title: "Assign roles", desc: "Give each person a role — Manager or Member — to control what they can see and do." },
                        { n: "3", title: "Allocate credits", desc: "Purchase credits and distribute them to each member. They spend only what you allocate to them." },
                        { n: "4", title: "Launch campaigns", desc: "Each member creates and sends campaigns independently from their own workspace." },
                      ].map(({ n, title, desc }) => (
                        <div key={n} className="flex gap-3">
                          <div
                            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                            style={{ background: "rgba(0,229,200,0.12)", color: "#00E5C8", border: "1px solid rgba(0,229,200,0.25)", fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            {n}
                          </div>
                          <div>
                            <div className="text-xs font-semibold mb-0.5" style={{ color: "#F0F0F5" }}>{title}</div>
                            <div className="text-xs leading-relaxed" style={{ color: "#7878A0" }}>{desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setPricingTab("individual")}
                      className="mt-5 w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                      style={{ background: "linear-gradient(135deg, #00E5C8 0%, #00B8A3 100%)", color: "#06060B", fontWeight: 700 }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      View Credit Plans
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Enterprise Teams */}
                  <div
                    className="relative rounded-2xl p-6"
                    style={{ background: "linear-gradient(160deg, #0F0C1A 0%, #0C0C14 100%)", border: "1px solid rgba(139,92,246,0.2)" }}
                  >
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", borderRadius: "16px 16px 0 0", background: "linear-gradient(90deg, #8B5CF6 0%, transparent 80%)", opacity: 0.8 }} />
                    <div className="text-xs font-bold uppercase tracking-widest mb-3 mt-2" style={{ color: "#A78BFA", letterSpacing: "0.15em" }}>
                      Enterprise Teams
                    </div>
                    <div className="mb-4">
                      <div className="text-xl font-bold" style={{ color: "#C8B4F8", fontFamily: "'Cabinet Grotesk', sans-serif" }}>Custom Pricing</div>
                      <div className="text-xs mt-1" style={{ color: "#7878A0" }}>Volume-based · Priority support</div>
                    </div>
                    <div className="mb-4 h-px" style={{ background: "#1A1A2E" }} />
                    <div className="text-xs font-semibold mb-3" style={{ color: "#7878A0" }}>For organizations that need more:</div>
                    <ul className="space-y-2 text-xs">
                      {["Unlimited team members", "Dedicated account manager", "Custom credit packages", "SSO / SAML (Soon)", "Priority support"].map(f => (
                        <li key={f} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#A78BFA" }} />
                          <span style={{ color: "#D1D5DB" }}>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/contact?reason=SALES"
                      className="mt-5 flex items-center justify-center w-full py-3 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#A78BFA" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(139,92,246,0.2)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(139,92,246,0.12)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)"; }}
                    >
                      Contact Sales →
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── Section Glow Divider ─────────────────────────────────────────── */}
      <div aria-hidden="true" className="relative w-full" style={{ height: "1px", zIndex: 2 }}>
        <div style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          width: "700px",
          height: "1px",
          background: "radial-gradient(ellipse at center, rgba(0,229,200,0.14) 0%, transparent 70%)",
        }} />
      </div>

      {/* ── How Credits Work ──────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 py-24" style={{ background: "#0A0A12", zIndex: 2 }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <div
              className="inline-block w-10 h-px mb-4"
              style={{ background: "#00E5C8" }}
            />
            <h2
              className="text-3xl md:text-4xl font-bold"
              style={{
                fontFamily: "'Cabinet Grotesk', 'Space Grotesk', sans-serif",
                color: "#F0F0F5",
                letterSpacing: "-0.02em",
              }}
            >
              How Credits Work
            </h2>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            {[
              {
                icon: <Mail className="w-6 h-6" />,
                title: "1 Credit = 1 Email",
                desc: "Each email sent consumes one credit from your balance. No surprises, ever.",
                color: "#00E5C8",
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: "No Monthly Fees",
                desc: "Credits are one-time purchases. No recurring charges, subscriptions, or auto-renewals.",
                color: "#8B5CF6",
              },
              {
                icon: <Clock className="w-6 h-6" />,
                title: "Credits Never Expire",
                desc: "No use-it-or-lose-it deadline. Buy what you need, use it whenever you're ready.",
                color: "#34D399",
              },
            ].map(({ icon, title, desc, color }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="rounded-xl p-6 transition-all"
                style={{
                  background: "#0C0C14",
                  border: "1px solid #1A1A2E",
                  willChange: "transform",
                }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
                  style={{ background: `${color}15`, color }}
                >
                  {icon}
                </div>
                <h3
                  className="text-base font-bold mb-2"
                  style={{ color: "#F0F0F5", fontFamily: "'Cabinet Grotesk', 'Space Grotesk', sans-serif" }}
                >
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#A8A8C0" }}>
                  {desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Free Trial Banner ─────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 py-24" style={{ background: "#06060B", zIndex: 2 }}>
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl p-8 md:p-12 text-center relative overflow-hidden"
            style={{
              background: "rgba(12,12,20,0.8)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(52,211,153,0.15)",
              boxShadow: "0 0 60px rgba(52,211,153,0.05), 0 0 120px rgba(0,229,200,0.03)",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(135deg, rgba(52,211,153,0.04) 0%, rgba(0,229,200,0.04) 100%)",
                pointerEvents: "none",
              }}
            />
            <div className="relative">
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
                style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}
              >
                <Sparkles className="w-7 h-7" style={{ color: "#34D399" }} />
              </div>
              <h2
                className="text-3xl md:text-4xl font-extrabold mb-4"
                style={{
                  fontFamily: "'Cabinet Grotesk', 'Space Grotesk', sans-serif",
                  color: "#F0F0F5",
                  letterSpacing: "-0.02em",
                }}
              >
                Your first 500 credits are on us!
              </h2>
              <p className="text-base mb-8 max-w-xl mx-auto" style={{ color: "#A8A8C0", lineHeight: 1.7 }}>
                Experience the full platform. Every feature unlocked, zero restrictions.
                No credit card required.
              </p>
              <Link href={user ? "/app/payments" : "/login"}>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-base transition-all"
                  style={{
                    background: "linear-gradient(135deg, #34D399 0%, #00E5C8 100%)",
                    color: "#06060B",
                    boxShadow: "0 4px 24px rgba(52,211,153,0.25)",
                  }}
                >
                  Start Free Trial — No Card Required
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Section Glow Divider ─────────────────────────────────────────── */}
      <div aria-hidden="true" className="relative w-full" style={{ height: "1px", zIndex: 2 }}>
        <div style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          width: "500px",
          height: "1px",
          background: "radial-gradient(ellipse at center, rgba(52,211,153,0.15) 0%, transparent 70%)",
        }} />
      </div>

      {/* ── Volume Discount Table ─────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 py-24" style={{ background: "#0A0A12", zIndex: 2 }}>
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center mb-12"
          >
            <div
              className="inline-block w-10 h-px mb-4"
              style={{ background: "#00E5C8" }}
            />
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{
                fontFamily: "'Cabinet Grotesk', 'Space Grotesk', sans-serif",
                color: "#F0F0F5",
                letterSpacing: "-0.02em",
              }}
            >
              Volume Bonuses
            </h2>
            <p className="text-base" style={{ color: "#A8A8C0" }}>
              Buy more, get more. Bonus credits are added automatically. No codes needed.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="relative rounded-xl overflow-hidden"
            style={{ border: "1px solid #1A1A2E" }}
          >
            {/* M36 — the scrolling was accessible but invisible: at 360px the
                last row read as "Contact Sales for cust" hard-cut against the
                border, with nothing to say more content lay to the right. This
                fade only renders at widths where the 440px table genuinely
                overflows, so it never appears over a table that already fits. */}
            <div
              aria-hidden="true"
              className="hidden max-[471px]:block pointer-events-none absolute inset-y-0 right-0 z-10 w-10"
              style={{ background: "linear-gradient(to right, rgba(8,8,15,0), rgba(8,8,15,0.95))" }}
            />
            {/* M35-F — below ~440px this scrolls horizontally, and a scroll
                container that is not focusable cannot be panned by keyboard at
                all (WCAG 2.1.1; axe scrollable-region-focusable, mobile only).
                tabIndex makes it reachable and arrow-key scrollable; the role
                and label stop it announcing as an unnamed group. */}
            <div
              className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5C8]"
              tabIndex={0}
              role="region"
              aria-label="Volume pricing table, scrollable horizontally"
            >
            <div style={{ minWidth: "440px" }}>
            {/* Table header */}
            <div
              className="grid grid-cols-4 gap-4 px-6 py-3.5"
              style={{ background: "#0C0C14", borderBottom: "1px solid #1A1A2E" }}
            >
              {["Credits Purchased", "Price", "Bonus Credits", "Total Credits"].map((h, i) => (
                <div
                  key={h}
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "#7878A0", textAlign: i === 0 ? "left" : "right" }}
                >
                  {h}
                </div>
              ))}
            </div>

            {VOLUME_ROWS.map((row, i) => {
              const priceDisplay = currency === "INR"
                ? fmtINR(row.priceINR)
                : fmtUSD(+(row.priceINR / USD_RATE).toFixed(2));
              const isHighlighted = row.credits === 15000;
              return (
                <motion.div
                  key={row.credits}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: i * 0.05 }}
                  className="grid grid-cols-4 gap-4 px-6 py-4 transition-colors"
                  style={{
                    background: isHighlighted
                      ? "rgba(0,229,200,0.03)"
                      : i % 2 === 0 ? "#0C0C14" : "#08080F",
                    borderBottom: i < VOLUME_ROWS.length - 1 ? "1px solid #1A1A2E" : "none",
                  }}
                >
                  <div
                    className="font-mono font-semibold text-sm"
                    style={{
                      color: isHighlighted ? "#00E5C8" : "#F0F0F5",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmtNum(row.credits)}
                  </div>
                  <div
                    className="font-mono text-sm text-right"
                    style={{
                      color: "#F0F0F5",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {priceDisplay}
                  </div>
                  <div className="text-right">
                    {/* M36 — the five-figure bonuses ("+10,000", "+30,000") broke
                        between the glyph and the number inside the pill, leaving
                        a two-line badge in an otherwise one-line row. */}
                    {row.bonus > 0 ? (
                      <span
                        className="inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background: "rgba(52,211,153,0.1)",
                          border: "1px solid rgba(52,211,153,0.2)",
                          color: "#34D399",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        ✦ +{fmtNum(row.bonus)}
                      </span>
                    ) : (
                      <span className="text-sm" style={{ color: "#8888A0" }}>—</span>
                    )}
                  </div>
                  <div
                    className="font-mono font-bold text-sm text-right"
                    style={{
                      color: row.bonus > 0 ? "#34D399" : "#8888A0",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmtNum(row.total)}
                  </div>
                </motion.div>
              );
            })}

            {/* Contact Sales row */}
            <div
              className="grid grid-cols-4 gap-4 px-6 py-4"
              style={{ background: "#0C0C14", borderTop: "1px solid #1A1A2E" }}
            >
              <div className="font-mono font-semibold text-sm" style={{ color: "#8888A0", fontFamily: "'JetBrains Mono', monospace" }}>
                300,000+
              </div>
              <div className="text-right col-span-3">
                <Link href="/contact?reason=SALES">
                  <span
                    className="inline-flex items-center gap-1.5 text-sm font-medium"
                    style={{ color: "#8B5CF6", cursor: "pointer" }}
                  >
                    Contact Sales for custom pricing <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </div>
            </div>
            </div>{/* end minWidth */}
            </div>{/* end overflow-x-auto */}
          </motion.div>
        </div>
      </section>

      {/* ── Feature Comparison Table ──────────────────────────────────────── */}
      <section className="relative px-4 py-24" style={{ background: "#0A0A12", zIndex: 2 }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center mb-12"
          >
            <div
              className="inline-block w-10 h-px mb-4"
              style={{ background: "#00E5C8" }}
            />
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{
                fontFamily: "'Cabinet Grotesk', 'Space Grotesk', sans-serif",
                color: "#F0F0F5",
                letterSpacing: "-0.02em",
              }}
            >
              Compare All Plans
            </h2>
            <p className="text-base" style={{ color: "#A8A8C0" }}>
              Every feature, side by side.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="relative rounded-2xl overflow-hidden"
            style={{ border: "1px solid #1A1A2E" }}
          >
            {/* M36 — same missing affordance as the volume table; this one is
                720px wide, so it overflows on every phone and most tablets. */}
            <div
              aria-hidden="true"
              className="hidden max-[767px]:block pointer-events-none absolute inset-y-0 right-0 z-20 w-10"
              style={{ background: "linear-gradient(to right, rgba(8,8,15,0), rgba(8,8,15,0.95))" }}
            />
            {/* M35-F — same WCAG 2.1.1 issue as the volume table above: a
                720px-wide comparison table in a scroll container that keyboard
                users could not reach or pan. */}
            <div
              className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5C8]"
              tabIndex={0}
              role="region"
              aria-label="Plan comparison table, scrollable horizontally"
            >
              <table className="w-full" style={{ minWidth: "720px" }}>
                {/* Sticky header */}
                <thead>
                  <tr style={{ background: "#0C0C14", borderBottom: "1px solid #1A1A2E" }}>
                    <th
                      className="text-left px-6 py-5 text-sm font-semibold sticky left-0 z-10"
                      style={{
                        color: "#7878A0",
                        background: "#0C0C14",
                        minWidth: "200px",
                        borderRight: "1px solid #1A1A2E",
                      }}
                    >
                      Feature
                    </th>
                    {PLANS.map(plan => (
                      <th
                        key={plan.id}
                        className="px-4 py-5 text-center text-sm font-bold cursor-pointer transition-colors"
                        style={{
                          color: plan.isPopular ? "#00E5C8" : "#F0F0F5",
                          background: hoveredCol === plan.id ? "#111120" : "#0C0C14",
                          fontFamily: "'Cabinet Grotesk', 'Space Grotesk', sans-serif",
                          letterSpacing: "0.05em",
                        }}
                        onMouseEnter={() => setHoveredCol(plan.id)}
                        onMouseLeave={() => setHoveredCol(null)}
                      >
                        {plan.name}
                        {plan.isPopular && (
                          <div
                            className="text-xs font-semibold mx-auto mt-1 px-2 py-0.5 rounded-full w-fit"
                            style={{
                              background: "rgba(0,229,200,0.12)",
                              color: "#00E5C8",
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              fontSize: "9px",
                            }}
                          >
                            Most Popular
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_CATEGORIES.map((cat, catIdx) => (
                    <Fragment key={cat.label}>
                      {/* Category header row */}
                      <tr
                        key={`cat-${catIdx}`}
                        style={{ background: "#08080F", borderTop: catIdx > 0 ? "1px solid #1A1A2E" : "none" }}
                      >
                        <td
                          colSpan={6}
                          className="px-6 py-3 text-xs font-bold uppercase tracking-widest sticky left-0"
                          style={{
                            color: "#7878A0",
                            background: "#08080F",
                            letterSpacing: "0.2em",
                          }}
                        >
                          {cat.label}
                        </td>
                      </tr>

                      {cat.rows.map((row, rowIdx) => (
                        <tr
                          key={`row-${catIdx}-${rowIdx}`}
                          style={{
                            background: rowIdx % 2 === 0 ? "#0C0C14" : "#0A0A12",
                            borderBottom: "1px solid rgba(26,26,46,0.5)",
                          }}
                        >
                          <td
                            className="px-6 py-4 text-sm sticky left-0 z-10"
                            style={{
                              color: "#B8B8D0",
                              background: rowIdx % 2 === 0 ? "#0C0C14" : "#0A0A12",
                              borderRight: "1px solid #1A1A2E",
                            }}
                          >
                            {row.label}
                          </td>
                          {PLANS.map(plan => (
                            <td
                              key={plan.id}
                              className="px-4 py-4 text-center transition-colors"
                              style={{
                                background:
                                  hoveredCol === plan.id
                                    ? "#111120"
                                    : rowIdx % 2 === 0 ? "#0C0C14" : "#0A0A12",
                              }}
                              onMouseEnter={() => setHoveredCol(plan.id)}
                              onMouseLeave={() => setHoveredCol(null)}
                            >
                              <CellValue val={row.format(plan)} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Dedicated IP Add-On (Coming Soon) ────────────────────────────── */}
      <section className="relative px-4 sm:px-6 py-16" style={{ background: "#06060B", zIndex: 2 }}>
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl p-7 flex flex-col sm:flex-row items-start sm:items-center gap-6 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #0C0C14 0%, #0E0E1A 100%)",
              border: "1px solid rgba(139,92,246,0.18)",
            }}
          >
            {/* decorative glow */}
            <div
              style={{
                position: "absolute", top: 0, right: 0,
                width: "250px", height: "100%",
                background: "radial-gradient(ellipse at top right, rgba(139,92,246,0.07) 0%, transparent 65%)",
                pointerEvents: "none",
              }}
            />

            <div
              className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(139,92,246,0.08)" }}
            >
              <Server className="w-6 h-6" style={{ color: "#8B7FC8" }} />
            </div>

            <div className="flex-1 relative">
              <div className="flex items-center gap-3 mb-1.5">
                <h3
                  className="text-base font-bold"
                  style={{ color: "#C0C0D8", fontFamily: "'Cabinet Grotesk', 'Space Grotesk', sans-serif" }}
                >
                  Dedicated IP Addresses
                </h3>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
                  style={{
                    background: "rgba(245,158,11,0.1)",
                    border: "1px solid rgba(245,158,11,0.3)",
                    color: "#F59E0B",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: "#F59E0B" }}
                  />
                  Coming Soon
                </span>
              </div>
              <p className="text-sm" style={{ color: "#7878A0" }}>
                Send from IPs exclusive to your account — your reputation, fully isolated. No
                shared-IP risk from other senders. Essential for high-volume campaigns on Growth &
                Scale.
              </p>
            </div>

            <div className="flex flex-col items-end gap-2 flex-shrink-0 relative">
              <div
                className="text-xl font-bold"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "#7878A0",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {currency === "INR" ? "₹1,800" : "$21.56"}
                <span className="text-sm font-normal" style={{ color: "#7878A0" }}>/mo</span>
              </div>
              <button
                onClick={() => setDedicatedIpNotified(true)}
                disabled={dedicatedIpNotified}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={dedicatedIpNotified ? {
                  background: "rgba(0,229,200,0.08)",
                  border: "1px solid rgba(0,229,200,0.2)",
                  color: "#00E5C8",
                  cursor: "default",
                } : {
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  color: "#F59E0B",
                  cursor: "pointer",
                }}
              >
                {dedicatedIpNotified ? "✓ We'll notify you" : "Notify me →"}
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 py-24" style={{ background: "#0A0A12", zIndex: 2 }}>
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center mb-12"
          >
            <div
              className="inline-block w-10 h-px mb-4"
              style={{ background: "#00E5C8" }}
            />
            <h2
              className="text-3xl md:text-4xl font-bold"
              style={{
                fontFamily: "'Cabinet Grotesk', 'Space Grotesk', sans-serif",
                color: "#F0F0F5",
                letterSpacing: "-0.02em",
              }}
            >
              Frequently Asked Questions
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <Accordion type="single" collapsible className="w-full space-y-2">
              {FAQ_ITEMS.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: "#0C0C14",
                    border: "1px solid #1A1A2E",
                  }}
                >
                  <AccordionTrigger
                    className="px-6 py-4 text-left hover:no-underline group transition-colors"
                    style={{ color: "#F0F0F5", fontWeight: 500 }}
                  >
                    <span className="text-sm font-medium" style={{ fontFamily: "'General Sans', sans-serif" }}>
                      {item.q}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent
                    className="px-6 pb-5"
                    style={{ borderTop: "1px solid #1A1A2E" }}
                  >
                    <p
                      className="text-sm pt-4 leading-relaxed"
                      style={{ color: "#B8B8D0", fontFamily: "'General Sans', sans-serif" }}
                    >
                      {item.a}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* ── Enterprise CTA ────────────────────────────────────────────────── */}
      <section
        className="relative px-6 py-28 overflow-hidden"
        style={{ background: "#0A0A12", zIndex: 2 }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "600px",
            height: "400px",
            background: "radial-gradient(ellipse at center, rgba(139,92,246,0.07) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="relative max-w-2xl mx-auto text-center"
        >
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6 mx-auto"
            style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}
          >
            <Handshake className="w-7 h-7" style={{ color: "#8B5CF6" }} />
          </div>
          <h2
            className="text-3xl md:text-4xl font-extrabold mb-4"
            style={{
              fontFamily: "'Cabinet Grotesk', 'Space Grotesk', sans-serif",
              color: "#F0F0F5",
              letterSpacing: "-0.02em",
            }}
          >
            Need a Custom Plan?
          </h2>
          <p className="text-base mb-8" style={{ color: "#A8A8C0", lineHeight: 1.7 }}>
            For enterprise needs or custom volume requirements, contact our sales team
            for a tailored solution with dedicated support and SLA.
          </p>
          <Link href="/contact?reason=SALES">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-base transition-all"
              style={{
                background: "rgba(139,92,246,0.12)",
                border: "1px solid rgba(139,92,246,0.35)",
                color: "#8B5CF6",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(139,92,246,0.2)";
                e.currentTarget.style.borderColor = "rgba(139,92,246,0.6)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(139,92,246,0.12)";
                e.currentTarget.style.borderColor = "rgba(139,92,246,0.35)";
              }}
            >
              Contact Sales
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* ── Trust Indicators ──────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 py-8" style={{ background: "#06060B", borderTop: "1px solid #1A1A2E", zIndex: 2 }}>
        <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-8">
          {[
            { icon: <Shield className="w-4 h-4" />, label: "Secure Payment" },
            { icon: <CreditCard className="w-4 h-4" />, label: "All Cards Accepted" },
            { icon: <Zap className="w-4 h-4" />, label: "Instant Delivery" },
            { icon: <Check className="w-4 h-4" />, label: "No Hidden Fees" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm font-medium" style={{ color: "#8888A0" }}>
              {/* M38 — #5A5A78 measured ~2.9:1; these trust icons carry meaning
                  alongside their label, so lift to the #7878A0 text floor. */}
              <span style={{ color: "#7878A0" }}>{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="relative px-4 sm:px-6 py-8" style={{ background: "#06060B", borderTop: "1px solid #1A1A2E", zIndex: 2 }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <img src="/repmail-logo-white.png" alt="RepMail" className="h-10 w-auto" style={{ objectFit: "contain" }} />
          </div>
          {/* M35-D — these are flex children, not inline text, so WCAG 2.5.8's
              inline exception does not apply: they measured 16px tall. The gap
              drops to 4 because each link now carries its own padding, keeping
              the row's overall width roughly unchanged on a 360px screen. */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {[
              { href: "/", label: "Home" },
              { href: "/products/repmail", label: "Product" },
              { href: "/privacy", label: "Privacy" },
              { href: "/terms", label: "Terms" },
              { href: "/contact", label: "Contact" },
              { href: "/login", label: "Sign In" },
            ].map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                className="inline-flex min-h-[24px] items-center px-1 text-xs transition-colors"
                // M35-F — #55556A on the #06060B footer measures 2.78:1, under
                // the 4.5:1 WCAG 1.4.3 minimum. #7878A0 measures 4.80:1 and is
                // already this page's secondary text colour.
                style={{ color: "#7878A0" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#B0B0C8")}
                onMouseLeave={e => (e.currentTarget.style.color = "#7878A0")}
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="text-xs" style={{ color: "#7878A0" }}>
            © {new Date().getFullYear()} LetsZero. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
