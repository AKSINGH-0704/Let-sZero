/**
 * SHARED PRICING CARD — RepMail by LetsZero
 *
 * M39 Phase 1C — one card, two surfaces. PublicPricing.jsx (marketing) and
 * Payments.jsx (in-app) previously carried two ~370-line copies of this component
 * that had already drifted apart on a couple of feature-row icons. The card body —
 * accent, name, credit count, bonus badge, price, per-credit rate, feature list,
 * and the motion wrappers — is identical between them and lives here once.
 *
 * The two surfaces differ only in RESPONSIBILITY, expressed by `mode`:
 *   - "marketing": the CTA NAVIGATES (a <Link>) to sign-in / deep-linked checkout.
 *   - "app":       the CTA TRANSACTS — it derives purchase state from the single
 *                  planPurchase rule and calls onPurchase; it badges the plan the
 *                  customer already holds; it renders an inert "already claimed"
 *                  state for a spent free trial and disables only while a purchase
 *                  is in flight.
 *
 * Server authority is unchanged: this component only ever DISPLAYS prices; the
 * charge is computed and validated by the server (MD-003).
 */

import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, Sparkles, Mail, Shield, CreditCard, Zap, Users, ArrowRight,
  Building2, BarChart3, Globe, Bot, Calendar, Download, Lock, Loader2,
  Gift, Handshake, X,
} from "lucide-react";
import { getPlanPurchaseState } from "@/lib/planPurchase";
import { fmtNum } from "@/lib/commerce/format";

// ─── Animation variants (hidden/visible keys inherit the parent grid's stagger) ─
const cardVariant = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 15 } },
};
const popularCardVariant = {
  hidden: { opacity: 0, y: 60, scale: 0.88 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 90, damping: 14 } },
};

// ─── Feature row icon ─────────────────────────────────────────────────────────
function FeatureIcon({ value, special }) {
  if (special) return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0"
      style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.25)" }}
    >
      <Sparkles className="w-3 h-3" style={{ color: "#F59E0B" }} />
    </span>
  );
  if (value === true || value === "true") return (
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

export default function PricingCard({
  plan,
  currency = "INR",
  mode = "marketing",
  // marketing mode:
  user,
  // app mode:
  onPurchase,
  currentPlanId,
  isTrialUser,
  isPending,
}) {
  const isApp = mode === "app";

  // In-app purchase relation (badge + CTA label + effect note). Marketing never
  // needs it — the card there is a navigation affordance, not a transaction.
  const state = isApp
    ? getPlanPurchaseState({ plan, effectivePlan: currentPlanId, isTrialUser })
    : null;
  const isCurrentPlan = state?.isCurrentPlan;
  const canPurchase = state?.canPurchase;
  const ctaLabel = state?.ctaLabel;
  const note = state?.note;

  // Marketing CTA target: enterprise → contact; otherwise sign-in, or a deep-linked
  // checkout when the visitor is already authenticated.
  const ctaHref = plan.isCustom
    ? plan.ctaHref
    : user
      ? (plan.isTrial ? "/app/payments" : `/app/payments?plan=${plan.id}`)
      : "/login";

  const perCreditRate = plan.isCustom || plan.isTrial
    ? null
    : currency === "INR"
      ? `₹${(plan.priceINR / plan.credits).toFixed(2)}`
      : `$${(plan.priceUSD / plan.credits).toFixed(4)}`;

  // The two icons the surfaces historically disagreed on, reconciled by mode so the
  // dedup introduces zero visual change on either page.
  const auditIcon = isApp ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />;
  const bonusIcon = isApp ? <Gift className="w-3.5 h-3.5" /> : <Handshake className="w-3.5 h-3.5" />;

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
      icon: auditIcon,
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
          icon: bonusIcon,
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

  // ─── CTA (the one genuinely divergent region) ───────────────────────────────
  const marketingCta = (
    <Link href={ctaHref}>
      <button
        className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
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
            el.style.boxShadow = "0 0 30px rgba(139,92,246,0.15)";
          } else {
            el.style.transform = "translateY(-1px)";
            el.style.background = plan.isTrial
              ? "linear-gradient(135deg, rgba(52,211,153,0.22) 0%, rgba(0,229,200,0.15) 100%)"
              : "#1E1E38";
            if (plan.isTrial) el.style.boxShadow = "0 0 30px rgba(52,211,153,0.12)";
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
            el.style.boxShadow = "0 0 20px rgba(139,92,246,0.1)";
          } else if (plan.isTrial) {
            el.style.background = "linear-gradient(135deg, rgba(52,211,153,0.15) 0%, rgba(0,229,200,0.1) 100%)";
            el.style.boxShadow = "0 0 20px rgba(52,211,153,0.08)";
          } else {
            el.style.background = "#16162A";
          }
        }}
      >
        {plan.cta}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </Link>
  );

  const appCta = !canPurchase ? (
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
  );

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
        {/* Most Popular badge — suppressed in-app on the customer's own plan, where the
            "Your Plan" badge occupies the same slot; always shown to marketing prospects. */}
        {plan.isPopular && (!isApp || !isCurrentPlan) && (
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

        {/* "Your plan" badge — in-app only, a statement of fact, not an action. */}
        {isApp && isCurrentPlan && (
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
              style={{
                color: "#F0F0F5",
                fontFamily: "'JetBrains Mono', monospace",
                fontVariantNumeric: "tabular-nums",
                ...(plan.isPopular ? { textShadow: "0 0 40px rgba(0,229,200,0.2)" } : {}),
              }}
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
                {currency === "INR"
                  ? `₹${fmtNum(plan.priceINR)}`
                  : `$${plan.priceUSD?.toFixed(2)}`}
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

        {/* CTA — navigation (marketing) or transaction (app). */}
        {isApp ? appCta : marketingCta}

        {/* In-app: what this purchase does to the account — the reassurance no button
            label can carry. Marketing has no account to speak to, so it is app-only. */}
        {isApp && canPurchase && note && (
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

  // Gradient-border wrapper for the Most Popular card; plain motion wrapper otherwise.
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
