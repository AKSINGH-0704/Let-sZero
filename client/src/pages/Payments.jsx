/**
 * IN-APP PAYMENTS PAGE — RepMail by LetsZero
 * Authenticated credit purchase page matching PublicPricing.jsx visual design.
 * Renders inside AppLayout — no separate nav/footer.
 */

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { invalidateAfter } from "@/lib/queryInvalidation";
import { useToast } from "@/hooks/use-toast";
import {
  Check, X, Sparkles, Mail, Shield, CreditCard, Zap, Users, ArrowRight,
  Building2, BarChart3, Globe, Webhook, HeadphonesIcon, Lock, Server, Bot,
  Calendar, Download, CheckCircle, XCircle, Clock, Receipt, Loader2,
  Smartphone, Gift,
} from "lucide-react";
import { formatDate, formatNumber, cn } from "@/lib/utils";
import { getPlanPurchaseState } from "@/lib/planPurchase";
import PostPurchaseActivation from "@/components/payments/PostPurchaseActivation";
import TeamCapabilities from "@/components/pricing/TeamCapabilities";

function fmtNum(n) {
  return n == null ? "—" : n.toLocaleString("en-IN");
}
function formatCurrency(amount, currency) {
  if (currency === "INR") return `₹${formatNumber(Math.round(amount))}`;
  return `$${formatNumber(amount)}`;
}

// ─── Plan data (matching PublicPricing.jsx with full feature matrix) ──────────
const PLANS = [
  {
    id: "trial",
    name: "Free Trial",
    credits: 500,
    bonusCredits: 0,
    totalCredits: 500,
    priceINR: 0,
    priceUSD: 0,
    isTrial: true,
    cta: "Start Free Trial",
    features: {
      campaigns: "1",
      templates: "3",
      scheduling: false,
      teamMembers: "25",
      auditExport: false,
      bonusCredits: false,
      aiPersonalization: true,
      spamAnalysis: true,
      analytics: true,
      contactUpload: true,
      templateBuilder: true,
    },
  },
  {
    id: "starter",
    name: "Starter",
    credits: 3000,
    bonusCredits: 0,
    totalCredits: 3000,
    priceINR: 390,
    priceUSD: null,
    cta: "Get Started",
    features: {
      campaigns: "5",
      templates: "10",
      scheduling: true,
      teamMembers: "25",
      auditExport: false,
      bonusCredits: false,
      aiPersonalization: true,
      spamAnalysis: true,
      analytics: true,
      contactUpload: true,
      templateBuilder: true,
    },
  },
  {
    id: "growth",
    name: "Growth",
    credits: 15000,
    bonusCredits: 1250,
    totalCredits: 16250,
    priceINR: 1800,
    priceUSD: null,
    isPopular: true,
    cta: "Get Started",
    features: {
      campaigns: "10",
      templates: "25",
      scheduling: true,
      teamMembers: "25",
      auditExport: false,
      bonusCredits: "+1,250",
      aiPersonalization: true,
      spamAnalysis: true,
      analytics: true,
      contactUpload: true,
      templateBuilder: true,
    },
  },
  {
    id: "scale",
    name: "Scale",
    credits: 50000,
    bonusCredits: 4545,
    totalCredits: 54545,
    priceINR: 5500,
    priceUSD: null,
    cta: "Get Started",
    features: {
      campaigns: "20",
      templates: "100",
      scheduling: true,
      teamMembers: "25",
      auditExport: true,
      bonusCredits: "+4,545",
      aiPersonalization: true,
      spamAnalysis: true,
      analytics: true,
      contactUpload: true,
      templateBuilder: true,
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    credits: null,
    bonusCredits: null,
    totalCredits: null,
    priceINR: null,
    priceUSD: null,
    isCustom: true,
    cta: "Contact Sales",
    features: {
      campaigns: "Unlimited",
      templates: "Unlimited",
      scheduling: true,
      teamMembers: "Unlimited",
      auditExport: true,
      bonusCredits: "Custom",
      aiPersonalization: true,
      spamAnalysis: true,
      analytics: true,
      contactUpload: true,
      templateBuilder: true,
    },
  },
  {
    id: "dev_test",
    name: "Developer Test",
    credits: 100,
    bonusCredits: 0,
    totalCredits: 100,
    priceINR: 11,
    priceUSD: null,
    isAdminOnly: true,
    cta: "Test Payment",
    features: {},
  },
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
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 15 } },
};
const popularCardVariant = {
  hidden: { opacity: 0, y: 60, scale: 0.88 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 90, damping: 14 } },
};

// ─── Feature icon ─────────────────────────────────────────────────────────────
function FeatureIcon({ value, special }) {
  if (special) return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0"
      style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.25)" }}
    >
      <Sparkles className="w-3 h-3" style={{ color: "#F59E0B" }} />
    </span>
  );
  if (value === true) return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0"
      style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.2)" }}
    >
      <Check className="w-3 h-3" style={{ color: "#34D399" }} />
    </span>
  );
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0"
      style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}
    >
      <X className="w-3 h-3" style={{ color: "#F87171" }} />
    </span>
  );
}

// ─── Plan Card (in-app version: CTA triggers handlePurchase) ──────────────────
// Exported for tests/unit/plan-purchase-card-render.test.js — the M24 defect lived in this
// component's JSX (a disabled button), not in the rule behind it, so the rendered output is
// asserted directly rather than only the rule.
export function PlanCard({ plan, currency, onPurchase, currentPlanId, isTrialUser, isPending }) {
  // Holding a plan marks the card, it never disables it. RepMail sells one-time credit
  // packs, not subscriptions (see client/src/lib/planPurchase.js) — the pack you already
  // own is the one you are most likely to buy again, so it must stay purchasable.
  const { isCurrentPlan, canPurchase, ctaLabel, note } = getPlanPurchaseState({
    plan,
    effectivePlan: currentPlanId,
    isTrialUser,
  });

  const perCreditRate = plan.isCustom || plan.isTrial
    ? null
    : `₹${(plan.priceINR / plan.credits).toFixed(2)}`;

  const features = [
    {
      label: "AI Personalization",
      icon: <Sparkles className="w-3.5 h-3.5" />,
      val: plan.features.aiPersonalization,
      badge: { text: "AI", color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
    },
    {
      label: "AI Spam Analysis",
      icon: <Shield className="w-3.5 h-3.5" />,
      val: plan.features.spamAnalysis,
      badge: { text: "AI", color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
    },
    {
      label: `${plan.features.campaigns} active campaign${plan.features.campaigns === "1" ? "" : "s"}`,
      icon: <Mail className="w-3.5 h-3.5" />,
      val: true,
    },
    {
      label: `${plan.features.templates} saved template${plan.features.templates === "1" ? "" : "s"}`,
      icon: <Bot className="w-3.5 h-3.5" />,
      val: true,
    },
    {
      label: plan.features.scheduling ? "Campaign scheduling" : "No scheduling",
      icon: <Calendar className="w-3.5 h-3.5" />,
      val: plan.features.scheduling,
    },
    {
      label: `${plan.features.teamMembers} team members`,
      icon: <Users className="w-3.5 h-3.5" />,
      val: true,
    },
    {
      label: "Analytics dashboard",
      icon: <BarChart3 className="w-3.5 h-3.5" />,
      val: plan.features.analytics,
    },
    {
      label: "Audit log export",
      icon: <Download className="w-3.5 h-3.5" />,
      val: plan.features.auditExport,
      badge: plan.features.auditExport
        ? { text: "Pro", color: "#60A5FA", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.25)" }
        : null,
    },
    {
      label: "Contact upload",
      icon: <Zap className="w-3.5 h-3.5" />,
      val: plan.features.contactUpload,
    },
    {
      label: "Template builder",
      icon: <Globe className="w-3.5 h-3.5" />,
      val: plan.features.templateBuilder,
    },
    ...(plan.features.bonusCredits
      ? [{
          label: `${plan.features.bonusCredits} bonus credits`,
          icon: <Gift className="w-3.5 h-3.5" />,
          val: true,
          badge: { text: "Bonus", color: "#34D399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.2)" },
        }]
      : []),
  ];

  const cardAccentColor = plan.isPopular
    ? "#00E5C8"
    : plan.isCustom
    ? "#8B5CF6"
    : plan.isTrial
    ? "#34D399"
    : plan.id === "starter"
    ? "#60A5FA"
    : "#00B8E0";

  const CardContent = (
    <div
      className="relative flex flex-col h-full rounded-2xl transition-all"
      style={{
        background: plan.isPopular
          ? "linear-gradient(160deg, #0F0F20 0%, #0C0C18 100%)"
          : plan.isCustom
          ? "linear-gradient(160deg, #0F0C1A 0%, #0C0C14 100%)"
          : "#0C0C14",
        boxShadow: plan.isPopular ? "0 0 80px rgba(0,229,200,0.06)" : "none",
        willChange: "transform",
      }}
    >
      {/* Top accent line */}
      <div style={{
        height: "2px",
        borderRadius: "16px 16px 0 0",
        background: `linear-gradient(90deg, ${cardAccentColor} 0%, transparent 80%)`,
        opacity: plan.isPopular ? 1 : 0.6,
      }} />

      <div className="p-6 flex flex-col flex-1">
        {/* Most Popular badge. Suppressed on the customer's own plan: both badges are
            absolutely positioned in the same slot, so a Growth customer (Growth being both
            the popular card and the most commonly held plan) rendered the two on top of each
            other. "Most Popular" is a persuasion device aimed at people still choosing;
            once it is your plan, the fact that it is yours is the more useful thing to say. */}
        {plan.isPopular && !isCurrentPlan && (
          <div
            className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap"
            style={{
              background: "#00E5C8",
              color: "#06060B",
              boxShadow: "0 4px 20px rgba(0,229,200,0.35)",
              letterSpacing: "0.15em",
            }}
          >
            Most Popular
          </div>
        )}

        {/* "Your plan" badge — a statement of fact, deliberately not an action.
            It marks the card the customer already holds without competing with,
            or standing in for, the purchase CTA below. */}
        {isCurrentPlan && (
          <div
            className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap flex items-center gap-1.5"
            style={{
              background: "rgba(52,211,153,0.15)",
              border: "1px solid rgba(52,211,153,0.35)",
              color: "#34D399",
              letterSpacing: "0.15em",
            }}
            data-testid={`badge-current-plan-${plan.id}`}
          >
            <Check className="w-3 h-3" />
            Your Plan
          </div>
        )}

        {/* Plan name */}
        <div
          className="text-xs font-bold uppercase tracking-widest mb-4 mt-2"
          style={{
            color: plan.isPopular
              ? "#00E5C8"
              : plan.isCustom
              ? "#A78BFA"
              : plan.isTrial
              ? "#6EE7B7"
              : plan.id === "starter"
              ? "#93C5FD"
              : "#38BDF8",
            letterSpacing: "0.15em",
            fontFamily: "'Cabinet Grotesk', 'Space Grotesk', sans-serif",
          }}
        >
          {plan.name}
        </div>

        {/* Credit count */}
        {plan.isCustom ? (
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 flex-shrink-0" style={{ color: "#8B5CF6" }} />
            <div
              className="text-xl font-bold"
              style={{ fontFamily: "'Cabinet Grotesk', 'Space Grotesk', sans-serif", color: "#C8B4F8" }}
            >
              Volume Pricing
            </div>
          </div>
        ) : (
          <>
            <div
              className="text-2xl font-bold mb-1"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: "#F0F0F5",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmtNum(plan.totalCredits)}
            </div>
            <div className="text-xs mb-2" style={{ color: "#7878A0" }}>
              credits{plan.isTrial && " · no card required"}
            </div>
          </>
        )}

        {/* Bonus credits badge */}
        <AnimatePresence>
          {plan.bonusCredits > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full text-xs font-semibold mb-3"
              style={{
                background: "rgba(52,211,153,0.1)",
                border: "1px solid rgba(52,211,153,0.2)",
                color: "#34D399",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              ✦ +{fmtNum(plan.bonusCredits)} bonus
            </motion.div>
          )}
        </AnimatePresence>

        {/* Price */}
        <div className="mb-1">
          {plan.isCustom ? (
            <div>
              <span
                className="text-2xl font-bold"
                style={{ color: "#A78BFA", fontFamily: "'Cabinet Grotesk', 'Space Grotesk', sans-serif" }}
              >
                Tailored to your scale
              </span>
              <div className="text-xs mt-1" style={{ color: "#7878A0" }}>Custom volume · Priority support</div>
            </div>
          ) : plan.isTrial ? (
            <span
              className="text-4xl font-bold"
              style={{ color: "#F0F0F5", fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}
            >
              Free
            </span>
          ) : (
            <AnimatePresence mode="wait">
              <motion.span
                key={`${plan.id}-${currency}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2 }}
                className="text-4xl font-bold"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "#F0F0F5",
                  fontVariantNumeric: "tabular-nums",
                  display: "inline-block",
                  ...(plan.isPopular ? { textShadow: "0 0 40px rgba(0,229,200,0.2)" } : {}),
                }}
              >
                {`₹${fmtNum(plan.priceINR)}`}
              </motion.span>
            </AnimatePresence>
          )}
        </div>
        {perCreditRate && (
          <div className="text-xs mb-5" style={{ color: "#7878A0" }}>
            {perCreditRate} per credit
          </div>
        )}
        {!perCreditRate && !plan.isCustom && <div className="mb-5" />}

        {/* Divider */}
        <div className="mb-5" style={{ height: 1, background: "#1A1A2E" }} />

        {/* Features */}
        <ul className="space-y-3 flex-1 mb-6">
          {features.map(({ label, icon, val, badge }) => (
            <li key={label} className="flex items-start gap-3 text-xs">
              <FeatureIcon value={val} special={val === "ai"} />
              <div className="flex flex-wrap items-center gap-1.5" style={{ lineHeight: 1.5 }}>
                <span
                  style={{
                    color: val === false ? "#7878A0" : "#D1D5DB",
                    textDecoration: val === false ? "line-through" : "none",
                  }}
                >
                  {label}
                </span>
                {badge && val !== false && (
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold"
                    style={{
                      color: badge.color,
                      background: badge.bg,
                      border: `1px solid ${badge.border}`,
                      fontSize: "9px",
                      letterSpacing: "0.05em",
                      lineHeight: 1.4,
                    }}
                  >
                    {badge.text}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* CTA button.
            The only non-purchasable state is a free trial that has already been claimed —
            a one-time grant the backend atomically refuses to repeat (storage.claimTrialCredits,
            409), so an enabled button here could only ever fail. Every paid card stays live in
            every account state, including the plan the customer already holds. */}
        {!canPurchase ? (
          <div
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{
              background: "rgba(52,211,153,0.06)",
              border: "1px solid rgba(52,211,153,0.2)",
              color: "#34D399",
            }}
            data-testid={`state-plan-${plan.id}`}
          >
            <Check className="w-3.5 h-3.5" />
            {note}
          </div>
        ) : (
        <button
          className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          disabled={isPending}
          onClick={() => onPurchase(plan.id)}
          data-testid={`button-purchase-${plan.id}`}
          style={
            plan.isPopular
              ? {
                  background: "linear-gradient(135deg, #00E5C8 0%, #00B8A3 100%)",
                  color: "#06060B",
                  boxShadow: "0 4px 24px rgba(0,229,200,0.35), 0 0 60px rgba(0,229,200,0.15)",
                  fontWeight: 700,
                }
              : plan.isCustom
              ? {
                  background: "rgba(139,92,246,0.1)",
                  border: "1px solid rgba(139,92,246,0.45)",
                  color: "#A78BFA",
                  boxShadow: "0 0 20px rgba(139,92,246,0.1)",
                }
              : isCurrentPlan
              ? {
                  // The pack the customer already owns is the one they are most likely to
                  // buy again, so it carries a primary CTA — in the same emerald as its
                  // "Your Plan" badge, so the two read as one idea rather than competing.
                  background: "linear-gradient(135deg, #34D399 0%, #10B981 100%)",
                  color: "#06060B",
                  boxShadow: "0 4px 24px rgba(52,211,153,0.3)",
                  fontWeight: 700,
                }
              : plan.isTrial
              ? {
                  background: "linear-gradient(135deg, rgba(52,211,153,0.15) 0%, rgba(0,229,200,0.1) 100%)",
                  border: "1px solid rgba(52,211,153,0.35)",
                  color: "#34D399",
                  boxShadow: "0 0 20px rgba(52,211,153,0.08)",
                }
              : {
                  background: "#16162A",
                  border: "1px solid #2A2A45",
                  color: "#E5E7EB",
                }
          }
          onMouseEnter={e => {
            const el = e.currentTarget;
            if (plan.isPopular) {
              el.style.transform = "translateY(-2px)";
              el.style.boxShadow = "0 10px 40px rgba(0,229,200,0.45), 0 0 80px rgba(0,229,200,0.2)";
            } else if (plan.isCustom) {
              el.style.background = "rgba(139,92,246,0.2)";
              el.style.borderColor = "rgba(139,92,246,0.65)";
            } else if (isCurrentPlan) {
              el.style.transform = "translateY(-2px)";
              el.style.boxShadow = "0 10px 40px rgba(52,211,153,0.4)";
            } else {
              el.style.transform = "translateY(-1px)";
              el.style.background = plan.isTrial
                ? "linear-gradient(135deg, rgba(52,211,153,0.22) 0%, rgba(0,229,200,0.15) 100%)"
                : "#1E1E38";
            }
          }}
          onMouseLeave={e => {
            const el = e.currentTarget;
            el.style.transform = "translateY(0)";
            if (plan.isPopular) {
              el.style.boxShadow = "0 4px 24px rgba(0,229,200,0.35), 0 0 60px rgba(0,229,200,0.15)";
            } else if (plan.isCustom) {
              el.style.background = "rgba(139,92,246,0.1)";
              el.style.borderColor = "rgba(139,92,246,0.45)";
            } else if (isCurrentPlan) {
              el.style.boxShadow = "0 4px 24px rgba(52,211,153,0.3)";
            } else if (plan.isTrial) {
              el.style.background = "linear-gradient(135deg, rgba(52,211,153,0.15) 0%, rgba(0,229,200,0.1) 100%)";
            } else {
              el.style.background = "#16162A";
            }
          }}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {ctaLabel}
              {!plan.isCustom && <ArrowRight className="w-3.5 h-3.5" />}
            </>
          )}
        </button>
        )}

        {/* What this purchase actually does to the account. The fear that stops a customer
            clicking a pack below their tier is "will this downgrade me?" — the answer is no
            (upgradePlanIfHigher only ever raises a plan), and no button label can say that
            without becoming a sentence. So the card says it. */}
        {canPurchase && note && (
          <p
            className="text-xs text-center mt-2.5"
            style={{ color: "#7878A0", lineHeight: 1.5 }}
            data-testid={`note-purchase-${plan.id}`}
          >
            {note}
          </p>
        )}
      </div>
    </div>
  );

  if (plan.isPopular) {
    return (
      <motion.div
        variants={popularCardVariant}
        className="relative pt-3.5"
        style={{ zIndex: 10 }}
        whileHover={{ y: -8, transition: { duration: 0.2 } }}
      >
        <div data-ambient
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: -1,
            borderRadius: "16px",
            background: "radial-gradient(ellipse at center, rgba(0,229,200,0.10) 0%, transparent 65%)",
            filter: "blur(32px)",
            animation: "popularGlowPulse 5s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
        <div
          className="rounded-2xl p-px"
          style={{
            background: "linear-gradient(135deg, #00E5C8 0%, #8B5CF6 50%, #00E5C8 100%)",
            boxShadow: "0 0 80px rgba(0,229,200,0.08)",
          }}
        >
          {CardContent}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={cardVariant}
      className="relative"
      style={{
        borderRadius: "16px",
        border: plan.isCustom ? "1px solid rgba(139,92,246,0.15)" : "1px solid #1A1A2E",
      }}
      whileHover={{
        y: -6,
        borderColor: plan.isCustom ? "rgba(139,92,246,0.3)" : "#2A2A45",
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        transition: { duration: 0.2 },
      }}
    >
      {CardContent}
    </motion.div>
  );
}

// ─── Payment History Component ─────────────────────────────────────────────────
function PaymentHistory() {
  const { data: payments, isLoading } = useQuery({ queryKey: ["/api/payments"] });

  const statusConfig = {
    PENDING: {
      icon: Clock,
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.1)",
      border: "rgba(245,158,11,0.2)",
      label: "Pending",
    },
    SUCCESS: {
      icon: CheckCircle,
      color: "#34D399",
      bg: "rgba(52,211,153,0.1)",
      border: "rgba(52,211,153,0.2)",
      label: "Completed",
    },
    FAILED: {
      icon: XCircle,
      color: "#F87171",
      bg: "rgba(248,113,113,0.1)",
      border: "rgba(248,113,113,0.2)",
      label: "Failed",
    },
    REFUNDED: {
      icon: XCircle,
      color: "#9CA3AF",
      bg: "rgba(156,163,175,0.1)",
      border: "rgba(156,163,175,0.2)",
      label: "Refunded",
    },
    CANCELLED: {
      icon: XCircle,
      color: "#9CA3AF",
      bg: "rgba(156,163,175,0.08)",
      border: "rgba(156,163,175,0.15)",
      label: "Cancelled",
    },
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "#16162A" }} />
        ))}
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="text-center py-12">
        <Receipt className="h-10 w-10 mx-auto mb-4" style={{ color: "#3A3A50" }} />
        <p className="font-medium mb-1" style={{ color: "#F0F0F5" }}>No payment history</p>
        <p className="text-sm" style={{ color: "#7878A0" }}>
          Your purchases will appear here after your first credit top-up.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid #1A1A2E" }}>
            {["Invoice", "Plan", "Credits", "Amount (INR)", "Status", "Date", ""].map(h => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest"
                style={{ color: "#7878A0" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payments.map(payment => {
            const status = statusConfig[payment.status] || statusConfig.PENDING;
            const StatusIcon = status.icon;
            const amountInr = payment.amountInr || payment.amountLocal || 0;

            const downloadInvoice = () => {
              const lines = [
                `REPMAIL INVOICE`,
                `===============`,
                `Invoice #:   ${payment.invoiceNumber}`,
                `Date:        ${new Date(payment.completedAt || payment.createdAt).toLocaleDateString("en-IN")}`,
                ``,
                `Plan:        ${payment.planName}`,
                `Credits:     ${payment.credits?.toLocaleString("en-IN")}`,
                `Amount:      ₹${amountInr.toLocaleString("en-IN")}`,
                `Status:      ${status.label}`,
                ...(payment.transactionId ? [`Payment ref: ${payment.transactionId}`] : []),
                ``,
                `Thank you for your purchase!`,
                `Support: support@letszero.in`,
              ].join("\n");
              const blob = new Blob([lines], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${payment.invoiceNumber}.txt`;
              a.click();
              URL.revokeObjectURL(url);
            };

            return (
              <tr
                key={payment.id}
                style={{ borderBottom: "1px solid rgba(26,26,46,0.5)" }}
                className="hover:bg-white/[0.015] transition-colors"
              >
                <td
                  className="px-4 py-3 font-mono text-xs"
                  style={{ color: "#7878A0" }}
                >
                  {payment.invoiceNumber}
                </td>
                <td className="px-4 py-3 font-medium" style={{ color: "#F0F0F5" }}>
                  {payment.planName}
                </td>
                <td className="px-4 py-3" style={{ color: "#B8B8D0" }}>
                  {fmtNum(payment.credits)}
                </td>
                <td className="px-4 py-3 text-right font-medium" style={{ color: "#F0F0F5" }}>
                  {amountInr > 0 ? formatCurrency(amountInr, "INR") : "Free"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{
                      color: status.color,
                      background: status.bg,
                      border: `1px solid ${status.border}`,
                    }}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                </td>
                <td className="px-4 py-3" style={{ color: "#7878A0" }}>
                  {formatDate(payment.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  {payment.status === "SUCCESS" && (
                    <button
                      onClick={downloadInvoice}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: "#7878A0" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#F0F0F5")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#7878A0")}
                      data-testid={`button-download-${payment.id}`}
                      title="Download invoice"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Razorpay script loader (singleton) ───────────────────────────────────────
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ─── Process Payment (Razorpay checkout) ──────────────────────────────────────
function ProcessPayment({ paymentId }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [checkoutOpened, setCheckoutOpened] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [activatedPayment, setActivatedPayment] = useState(null);
  const autoOpenedRef = useRef(false);

  const { data: payment, isLoading } = useQuery({
    queryKey: ["/api/payments", paymentId],
    queryFn: async () => {
      const res = await fetch(`/api/payments/${paymentId}`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ razorpay_payment_id, razorpay_order_id, razorpay_signature }) => {
      const res = await apiRequest("POST", "/api/payments/razorpay/verify", {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        repmail_payment_id: paymentId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      // Deliberately does NOT invalidate ["/api/payments", paymentId] here —
      // that's the exact query this component's own render branches on
      // (see the `activatedPayment` priority check below). Invalidating it
      // at verify time triggered a background refetch that returned
      // status: "SUCCESS" within about one round-trip and flipped this
      // component into its "Payment already completed" branch, destroying
      // the activation modal before the customer had any real chance to see
      // it — not a timer, not a dismissal, an unintended side effect of the
      // standard credits-changed invalidation. The specific payment detail
      // is refreshed only once the customer actually leaves the activation
      // experience (handleActivationClose below).
      invalidateAfter("creditsChanged");
      queryClient.invalidateQueries({ queryKey: ["/api/payments"], exact: true });
      // M20-C: a premium activation overlay replaces the old toast + banner —
      // reinforces the plan's value and drives the customer toward whichever
      // real setup step (domain / team / first campaign) is actually missing,
      // instead of a generic "payment successful" message.
      setActivatedPayment(data.payment);
    },
    onError: (err) => {
      setCheckoutError(err.message || "Payment verification failed. Contact support.");
      toast({ title: "Payment verification failed", description: err.message, variant: "destructive" });
    },
  });

  // Refresh the specific payment's own cached detail only once the customer
  // is actually done with the activation experience — see the comment in
  // verifyMutation.onSuccess above for why this can't happen any earlier.
  // Navigation is owned by PostPurchaseActivation itself (both its dismiss
  // paths land on Dashboard) — this handler is invalidation-only.
  const handleActivationClose = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/payments", paymentId] });
  };

  const failMutation = useMutation({
    mutationFn: async ({ reason, cancelled } = {}) => {
      const res = await apiRequest("POST", `/api/payments/${paymentId}/fail`, { reason, cancelled });
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Guards a known Razorpay Checkout.js edge case: modal.ondismiss can
      // fire even after a successful payment, as the widget closes itself
      // post-`handler`. The backend already refuses to downgrade a SUCCESS
      // payment (storage.cancelPayment/failPayment, both no-op once
      // status === SUCCESS) — this mirrors that same guard client-side, so a
      // stray dismiss can't navigate the customer away from an
      // already-showing activation modal with a spurious "Payment
      // cancelled" toast.
      if (activatedPayment) return;
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      if (variables?.cancelled) {
        toast({ title: "Payment cancelled" });
      } else {
        toast({ title: "Payment failed", description: "Please return to the payments page to try again.", variant: "destructive" });
      }
      setLocation("/app/payments");
    },
  });

  const openRazorpay = async () => {
    if (!payment) return;
    const orderId = payment.metadata?.razorpay_order_id;
    const keyId = payment.metadata?.razorpay_key_id;
    if (!orderId || !keyId) {
      setCheckoutError("Payment session data missing. Please start a new payment.");
      return;
    }

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setCheckoutError("Could not load payment gateway. Check your connection and try again.");
      return;
    }

    setCheckoutOpened(true);

    const options = {
      key: keyId,
      amount: payment.amountLocal * 100, // paise
      currency: "INR",
      name: "RepMail",
      description: `${payment.planName} — ${formatNumber(payment.credits)} credits`,
      order_id: orderId,
      handler: (response) => {
        verifyMutation.mutate({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => {
          setCheckoutOpened(false);
          failMutation.mutate({ cancelled: true });
        },
      },
      prefill: {},
      theme: { color: "#00E5C8" },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (response) => {
      setCheckoutOpened(false);
      const reason = response.error?.description || response.error?.code || "payment_failed";
      failMutation.mutate({ reason });
    });
    rzp.open();
  };

  // Auto-launch Razorpay when payment data arrives — one-shot via ref guard
  useEffect(() => {
    if (payment && payment.status === "PENDING" && !autoOpenedRef.current && !checkoutOpened) {
      autoOpenedRef.current = true;
      openRazorpay();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment]);

  const amountLocal = payment?.amountLocal || 0;

  // Defense-in-depth, independent of the deferred-invalidation fix above:
  // once a purchase is verified, activatedPayment being set takes explicit
  // priority over every status-branch below — the activation experience is
  // the only thing that renders until the customer explicitly leaves it, no
  // matter what a subsequent refetch of `payment` might say. This means a
  // future, unrelated invalidation change touching this query can't silently
  // reintroduce the same class of bug.
  if (activatedPayment) {
    return (
      <AppLayout>
        <PostPurchaseActivation payment={activatedPayment} onClose={handleActivationClose} />
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#06060B" }}>
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#00E5C8" }} />
        </div>
      </AppLayout>
    );
  }

  if (!payment) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#06060B" }}>
          <div className="text-center" style={{ color: "#F0F0F5" }}>
            <p className="text-lg font-semibold mb-2">Payment not found</p>
            <button
              className="text-sm underline mt-4"
              style={{ color: "#00E5C8" }}
              onClick={() => setLocation("/app/payments")}
            >
              Back to Payments
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Terminal states — don't show checkout UI for dead sessions
  if (payment.status === "SUCCESS") {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#06060B" }}>
          <div className="text-center w-full max-w-md">
            <CheckCircle className="h-12 w-12 mx-auto mb-4" style={{ color: "#00E5C8" }} />
            <p className="text-lg font-semibold mb-1" style={{ color: "#F0F0F5" }}>Payment already completed</p>
            <p className="text-sm mb-6" style={{ color: "#7878A0" }}>
              {formatNumber(payment.credits)} credits were added to your account.
            </p>
            <button className="text-sm underline" style={{ color: "#00E5C8" }} onClick={() => setLocation("/app/payments")}>
              Back to Payments
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (payment.status === "FAILED" || payment.status === "CANCELLED") {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#06060B" }}>
          <div className="text-center w-full max-w-md">
            <XCircle className="h-12 w-12 mx-auto mb-4" style={{ color: "#F87171" }} />
            <p className="text-lg font-semibold mb-1" style={{ color: "#F0F0F5" }}>
              {payment.status === "FAILED" ? "Payment failed" : "Payment cancelled"}
            </p>
            <p className="text-sm mb-6" style={{ color: "#7878A0" }}>
              {payment.status === "FAILED"
                ? "Your payment could not be processed. No charges were made."
                : "You cancelled this payment session. No charges were made."}
            </p>
            <button className="text-sm underline" style={{ color: "#00E5C8" }} onClick={() => setLocation("/app/payments")}>
              Return to Payments to try again
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "#06060B" }}
      >
        <div
          className="w-full max-w-md rounded-2xl p-8"
          style={{ background: "#0C0C14", border: "1px solid #1A1A2E" }}
        >
          <div className="text-center mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(0,229,200,0.08)", border: "1px solid rgba(0,229,200,0.15)" }}
            >
              <CreditCard className="h-8 w-8" style={{ color: "#00E5C8" }} />
            </div>
            <h2
              className="text-xl font-bold mb-1"
              style={{ color: "#F0F0F5", fontFamily: "'Cabinet Grotesk', sans-serif" }}
            >
              Complete Your Payment
            </h2>
            <p className="text-sm" style={{ color: "#7878A0" }}>
              Pay securely with UPI, cards, or net banking via Razorpay
            </p>
          </div>

          <div className="rounded-xl p-4 space-y-2 mb-6" style={{ background: "#0A0A12", border: "1px solid #1A1A2E" }}>
            {[
              { label: "Plan", value: payment.planName },
              { label: "Credits", value: formatNumber(payment.credits) },
              { label: "Amount", value: `₹${amountLocal.toLocaleString("en-IN")}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span style={{ color: "#7878A0" }}>{label}</span>
                <span className="font-medium" style={{ color: "#F0F0F5" }}>{value}</span>
              </div>
            ))}
          </div>

          {checkoutError && (
            <div
              className="rounded-xl p-3 mb-4 text-sm"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5" }}
            >
              {checkoutError}
            </div>
          )}

          {verifyMutation.isPending && (
            <div className="text-center text-sm mb-4" style={{ color: "#7878A0" }}>
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              Verifying payment…
            </div>
          )}

          <div className="space-y-3">
            <button
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #00E5C8 0%, #00B8A3 100%)",
                color: "#06060B",
                fontWeight: 700,
              }}
              onClick={openRazorpay}
              disabled={checkoutOpened || verifyMutation.isPending || failMutation.isPending}
              data-testid="button-open-razorpay"
            >
              {checkoutOpened || verifyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Pay ₹{amountLocal.toLocaleString("en-IN")} via Razorpay
                </>
              )}
            </button>
            <button
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{ background: "#16162A", border: "1px solid #2A2A45", color: "#E5E7EB" }}
              onClick={() => failMutation.mutate({ cancelled: true })}
              disabled={checkoutOpened || verifyMutation.isPending || failMutation.isPending}
              data-testid="button-cancel-payment"
            >
              {failMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Cancel
                </>
              )}
            </button>
          </div>

          <p className="text-center text-xs mt-4" style={{ color: "#7878A0" }}>
            Secured by Razorpay · 256-bit SSL encryption
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

// ─── Main Payments Component ───────────────────────────────────────────────────
export default function Payments() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ROOT_ADMIN" || user?.role === "SUB_ADMIN";

  // useParams() receives :id from the outer <Route path="/app/payments/process/:id">
  // when mounted on that route; empty object on the base /app/payments route.
  const { id: processId } = useParams();
  const currency = "INR";
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [pricingTab, setPricingTab] = useState("individual");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get("plan");
    if (planParam) {
      const plan = PLANS.find(p => p.id === planParam);
      if (plan && !plan.isCustom) {
        setSelectedTier(plan);
        setShowConfirmModal(true);
      }
    }
    // Clean up ?plan=... from the URL without navigation. (Post-purchase
    // activation is now the PostPurchaseActivation overlay shown directly
    // from ProcessPayment, M20-C — no ?paid=1/?activate=team round-trip.)
    if (params.has("plan")) {
      window.history.replaceState({}, "", "/app/payments");
    }
  }, []);

  const { data: creditsInfo, isLoading: creditsLoading } = useQuery({
    queryKey: ["/api/credits/info"],
  });

  const { data: pricingPlans } = useQuery({
    queryKey: ["/api/pricing/plans"],
  });

  const initiateMutation = useMutation({
    mutationFn: async (tierId) => {
      const res = await apiRequest("POST", "/api/payments/initiate", {
        planId: tierId,
        currency: "INR",
        paymentMethod: "UPI",
      });
      return res.json();
    },
    onSuccess: (data) => {
      invalidateAfter("creditsChanged", { extraKeys: [["/api/payments"]] });
      setShowConfirmModal(false);
      setSelectedTier(null);
      setLocation(data.redirectUrl || "/app/payments");
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handlePurchase = (tierId) => {
    const plan = PLANS.find(p => p.id === tierId);
    if (plan.isCustom) {
      setLocation(`/contact?reason=enterprise&plan=${encodeURIComponent(plan.name)}`);
      return;
    }
    setSelectedTier(plan);
    setShowConfirmModal(true);
  };

  const handleConfirmPurchase = () => {
    if (selectedTier) {
      initiateMutation.mutate(selectedTier.id);
    }
  };

  const formatPrice = (plan) => {
    if (plan.isCustom) return "Custom pricing";
    if (plan.isTrial) return "Free";
    return `₹${fmtNum(plan.priceINR)}`;
  };

  // Current plan comes from user.effectivePlan (the same inheritance-aware
  // source every other entitlement check in the app uses — Domains.jsx,
  // CampaignConfirmation.jsx), not payment history. Deriving it from the
  // payments table was silently broken (the table stores planName, not
  // planId — payment.planId was always undefined, so this was never true
  // for any customer) and conceptually wrong regardless: an invited team
  // member's plan is inherited from their workspace root, not tied to any
  // payment record of their own, so a payment-history-based check would
  // never show a current plan for them even after fixing the field name.
  const currentPlanId = user?.effectivePlan || null;
  // The one-time free grant is gated on this flag server-side (storage.claimTrialCredits),
  // so the trial card offers the claim only while it is genuinely still claimable.
  const isTrialUser = Boolean(user?.isTrialUser);
  const currentPlanName = PLANS.find(p => p.id === currentPlanId)?.name || null;
  const selectedTierState = selectedTier
    ? getPlanPurchaseState({ plan: selectedTier, effectivePlan: currentPlanId, isTrialUser })
    : null;

  if (processId) {
    return <ProcessPayment paymentId={processId} />;
  }

  const currentBalance = creditsInfo?.total || 0;

  // Public plans only — admin-only plans are rendered separately below
  const publicPlans = PLANS.filter(p => !p.isAdminOnly);

  // Mobile plan order: Growth first
  const mobilePlans = [
    publicPlans.find(p => p.id === "growth"),
    publicPlans.find(p => p.id === "starter"),
    publicPlans.find(p => p.id === "scale"),
    publicPlans.find(p => p.id === "trial"),
    publicPlans.find(p => p.id === "enterprise"),
  ].filter(Boolean);

  return (
    <AppLayout>
      <div
        className="relative min-h-screen overflow-x-hidden"
        style={{
          background: "#06060B",
          fontFamily: "'General Sans', 'Inter', sans-serif",
        }}
      >
        {/* CSS keyframes */}
        <style>{`
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
          @keyframes popularGlowPulse {
            0%,100% { opacity: 0.55; transform: scale(1.18); }
            50%     { opacity: 0.85; transform: scale(1.25); }
          }
        `}</style>

        {/* Grid pattern */}
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

        {/* Orb 1 — Cyan */}
        <div data-ambient
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "5%",
            left: "8%",
            width: "480px",
            height: "480px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,229,200,0.065) 0%, transparent 70%)",
            filter: "blur(80px)",
            animation: "orbFloat1 28s ease-in-out infinite",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Orb 2 — Violet */}
        <div data-ambient
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "3%",
            right: "6%",
            width: "380px",
            height: "380px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)",
            filter: "blur(100px)",
            animation: "orbFloat2 33s ease-in-out infinite",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Film grain */}
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            opacity: 0.018,
            pointerEvents: "none",
            zIndex: 1,
            mixBlendMode: "overlay",
          }}
        />

        {/* Main content */}
        <div className="relative z-10 px-4 sm:px-6 py-10 max-w-7xl mx-auto space-y-14">

          {/* Post-purchase success/activation is now PostPurchaseActivation
              (M20-C), shown directly from ProcessPayment — no banner here. */}

          {/* ── Credit Balance Card ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-md"
          >
            <div
              className="rounded-2xl p-6 flex items-center gap-5"
              style={{
                background: "#0C0C14",
                border: "1px solid #1A1A2E",
                borderLeft: "4px solid #00E5C8",
              }}
            >
              <div className="flex-1">
                <div
                  className="text-xs font-semibold uppercase tracking-widest mb-1"
                  style={{ color: "#7878A0" }}
                >
                  Credits Remaining
                </div>
                <div
                  className="text-4xl font-bold"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "#F0F0F5",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {creditsLoading ? "—" : fmtNum(currentBalance)}
                </div>
                <div className="text-xs mt-1" style={{ color: "#7878A0" }}>
                  1 credit = 1 email sent
                </div>
                {/* The customer's plan, stated next to the balance it explains. Putting it
                    here means "this is my plan" is visible without scrolling to the grid,
                    and without a card having to say it by disabling itself. */}
                {currentPlanName && (
                  <div
                    className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background: "rgba(52,211,153,0.1)",
                      border: "1px solid rgba(52,211,153,0.2)",
                      color: "#34D399",
                    }}
                    data-testid="chip-current-plan"
                  >
                    <Check className="w-3 h-3" />
                    {currentPlanName} plan · buy more anytime
                  </div>
                )}
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(0,229,200,0.08)", border: "1px solid rgba(0,229,200,0.15)" }}
              >
                <Zap className="w-6 h-6" style={{ color: "#00E5C8" }} />
              </div>
            </div>
          </motion.div>

          {/* ── Page heading + currency toggle ──────────────────────────── */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-center"
          >
            <div className="inline-block w-10 h-px mb-4" style={{ background: "#00E5C8" }} />
            <h1
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{
                fontFamily: "'Cabinet Grotesk', 'Space Grotesk', sans-serif",
                color: "#F0F0F5",
                letterSpacing: "-0.02em",
              }}
            >
              Choose Your Starting Pack
            </h1>
            <p className="text-base mb-8" style={{ color: "#A8A8C0" }}>
              One-time purchases. No subscriptions. Credits never expire.
            </p>

          </motion.div>

          {/* ── Individual / Teams Tab Toggle ───────────────────────────── */}
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
                {/* Desktop: 5-col grid */}
                <motion.div
                  className="hidden md:grid gap-5"
                  style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
                  initial="hidden"
                  animate="visible"
                  variants={staggerContainer}
                >
                  {publicPlans.map(plan => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      currency={currency}
                      onPurchase={handlePurchase}
                      currentPlanId={currentPlanId}
                      isTrialUser={isTrialUser}
                      isPending={initiateMutation.isPending}
                    />
                  ))}
                </motion.div>
                {/* Mobile */}
                <motion.div
                  className="flex md:hidden flex-col gap-4"
                  initial="hidden"
                  animate="visible"
                  variants={staggerContainer}
                >
                  {mobilePlans.map(plan => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      currency={currency}
                      onPurchase={handlePurchase}
                      currentPlanId={currentPlanId}
                      isTrialUser={isTrialUser}
                      isPending={initiateMutation.isPending}
                    />
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
                      desc: "Appoint managers who distribute credits to their own sub-teams. Managers see only their team's activity.",
                      color: "#60A5FA",
                      bg: "rgba(96,165,250,0.04)",
                      border: "rgba(96,165,250,0.12)",
                    },
                    {
                      step: "03",
                      title: "Team Members Send",
                      desc: "Each member gets their allocated credits and works independently — campaigns, contacts, emails. They see only their own work.",
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
                        className="text-xs font-bold mb-3"
                        style={{ color, letterSpacing: "0.2em", fontFamily: "'JetBrains Mono', monospace" }}
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

                {/* Team capacity + role capabilities */}
                <div
                  className="rounded-2xl p-7 md:p-9 mb-8"
                  style={{ background: "#0C0C14", border: "1px solid #1A1A2E" }}
                >
                  <TeamCapabilities
                    plans={PLANS}
                    formatPlanPrice={(p) => formatPrice(p)}
                    rolesNote="Team seats are included in every plan — free trial through Scale — up to 25 members each."
                  />
                </div>

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
                        { n: "1", title: "Invite team members", desc: (
                          <>
                            Go to{" "}
                            <button
                              type="button"
                              onClick={() => setLocation("/app/users")}
                              className="underline underline-offset-2"
                              style={{ color: "#00E5C8" }}
                            >
                              Team Management
                            </button>
                            {" "}and invite up to 25 people — free, on any plan, no purchase required.
                          </>
                        ) },
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

                  {/* Enterprise Teams card */}
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
                    <button
                      onClick={() => setLocation("/contact?reason=enterprise")}
                      className="mt-5 w-full py-3 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#A78BFA" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(139,92,246,0.2)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(139,92,246,0.12)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)"; }}
                    >
                      Contact Sales →
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Section Glow Divider ─────────────────────────────────────── */}
          <div aria-hidden="true" className="relative w-full" style={{ height: "1px" }}>
            <div style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              width: "600px",
              height: "1px",
              background: "radial-gradient(ellipse at center, rgba(139,92,246,0.12) 0%, transparent 70%)",
            }} />
          </div>

          {/* ── Payment History ──────────────────────────────────────────── */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
          >
            <div className="text-center mb-8">
              <div className="inline-block w-10 h-px mb-4" style={{ background: "#00E5C8" }} />
              <h2
                className="text-2xl font-bold"
                style={{
                  fontFamily: "'Cabinet Grotesk', 'Space Grotesk', sans-serif",
                  color: "#F0F0F5",
                  letterSpacing: "-0.02em",
                }}
              >
                Payment History
              </h2>
            </div>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "#0C0C14", border: "1px solid #1A1A2E" }}
            >
              <div className="p-6">
                <PaymentHistory />
              </div>
            </div>
          </motion.div>

          {/* ── Developer Test Plan (ROOT_ADMIN Only) ───────────────────── */}
          {user?.role === "ROOT_ADMIN" && (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <div
                className="rounded-2xl p-6"
                style={{ background: "#0C0C14", border: "1px dashed rgba(245,158,11,0.35)" }}
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: "#F59E0B" }}
                  />
                  <span
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: "#F59E0B", letterSpacing: "0.15em" }}
                  >
                    Developer Test · Internal Use Only
                  </span>
                </div>
                <p className="text-xs mb-5 pl-5" style={{ color: "#7878A0" }}>
                  Runs the complete Razorpay production flow — order creation, checkout, webhook, credit
                  allocation, invoice — at minimal cost. Visible only to ROOT_ADMIN and SUB_ADMIN.
                </p>

                {/* Plan row */}
                <div
                  className="flex items-center justify-between rounded-xl p-4"
                  style={{ background: "#0A0A12", border: "1px solid #1A1A2E" }}
                >
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "#F0F0F5" }}>
                      Developer Test
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "#7878A0" }}>
                      100 credits · ₹11 · Admin only
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div
                      className="text-xl font-bold"
                      style={{
                        color: "#F0F0F5",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      ₹11
                    </div>
                    <button
                      onClick={() => handlePurchase("dev_test")}
                      disabled={initiateMutation.isPending}
                      className="px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                      style={{
                        background: "rgba(245,158,11,0.1)",
                        border: "1px solid rgba(245,158,11,0.35)",
                        color: "#F59E0B",
                        cursor: "pointer",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(245,158,11,0.2)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(245,158,11,0.1)")}
                      data-testid="button-dev-test-plan"
                    >
                      {initiateMutation.isPending
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : "Test Payment →"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </div>

        {/* ── Confirmation Modal ──────────────────────────────────────────── */}
        <AnimatePresence>
          {showConfirmModal && selectedTier && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 px-4"
              style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
              onClick={(e) => e.target === e.currentTarget && setShowConfirmModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="w-full max-w-md rounded-2xl p-7"
                style={{ background: "#0C0C14", border: "1px solid #1A1A2E" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3
                    className="text-lg font-bold"
                    style={{ color: "#F0F0F5", fontFamily: "'Cabinet Grotesk', sans-serif" }}
                  >
                    Confirm Purchase
                  </h3>
                  <button
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ color: "#7878A0", background: "#16162A" }}
                    onClick={() => setShowConfirmModal(false)}
                    onMouseEnter={e => (e.currentTarget.style.color = "#F0F0F5")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#7878A0")}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="rounded-xl p-4 space-y-3 mb-6" style={{ background: "#0A0A12", border: "1px solid #1A1A2E" }}>
                  {[
                    { label: "Package", value: selectedTier.name },
                    {
                      label: "Credits",
                      value: selectedTier.isTrial ? "500 credits" : `${fmtNum(selectedTier.totalCredits)} credits${selectedTier.bonusCredits > 0 ? ` (+${fmtNum(selectedTier.bonusCredits)} bonus)` : ""}`,
                      accent: true,
                    },
                  ].map(({ label, value, accent }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span style={{ color: "#7878A0" }}>{label}</span>
                      <span
                        className="font-semibold"
                        style={{ color: accent ? "#00E5C8" : "#F0F0F5" }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                  <div
                    className="flex justify-between pt-3"
                    style={{ borderTop: "1px solid #1A1A2E" }}
                  >
                    <span className="font-semibold text-sm" style={{ color: "#F0F0F5" }}>Total</span>
                    <span
                      className="text-2xl font-bold"
                      style={{ fontFamily: "'JetBrains Mono', monospace", color: "#F0F0F5" }}
                    >
                      {formatPrice(selectedTier)}
                    </span>
                  </div>

                  {/* The last screen before payment must not read as "replace my plan".
                      Same note the card carries, restated at the point of commitment. */}
                  {selectedTierState?.note && (
                    <p
                      className="text-xs pt-3"
                      style={{ color: "#7878A0", borderTop: "1px solid #1A1A2E", lineHeight: 1.5 }}
                      data-testid="text-purchase-effect"
                    >
                      {selectedTierState.note}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: "#16162A", border: "1px solid #2A2A45", color: "#9898B8" }}
                    onClick={() => setShowConfirmModal(false)}
                    onMouseEnter={e => (e.currentTarget.style.color = "#F0F0F5")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#9898B8")}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: "linear-gradient(135deg, #00E5C8 0%, #00B8A3 100%)",
                      color: "#06060B",
                      fontWeight: 700,
                    }}
                    onClick={handleConfirmPurchase}
                    disabled={initiateMutation.isPending}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,229,200,0.3)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    {initiateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : selectedTier?.isTrial ? (
                      <>
                        <Gift className="w-4 h-4" />
                        Get Free Credits
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Pay {formatPrice(selectedTier)}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
