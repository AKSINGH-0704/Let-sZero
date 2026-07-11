/**
 * Post-purchase activation experience.
 * Shown once, immediately after a successful payment verification, and stays
 * visible until the customer explicitly dismisses it (X, "Continue to
 * Dashboard") or takes the primary action — never a timer, never an
 * incidental side effect of an unrelated cache refresh (see the deferred
 * invalidation + activatedPayment render-priority guard in Payments.jsx).
 *
 * This is the customer's activation moment, not a payment receipt: it
 * confirms the plan is active, shows the credited amount *and* the resulting
 * total balance, states the biggest benefits just unlocked, and drives
 * straight at Teams adoption — the primary CTA is team-focused for every
 * plan that includes seats, since that's the highest-value action a customer
 * can take immediately after upgrading.
 */
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Users, Globe, ArrowRight, X } from "lucide-react";
import { MAX_TEAM_MEMBERS } from "@shared/schema";
import { formatNumber } from "@/lib/utils";

export default function PostPurchaseActivation({ payment, onClose }) {
  const [, setLocation] = useLocation();
  const dialogRef = useRef(null);

  // Every dismissal path — X, primary CTA, secondary CTA, Escape — routes
  // through onClose first. Previously the primary CTA (team/campaign) called
  // setLocation directly, bypassing the payment-detail cache invalidation
  // onClose performs; a customer who took the primary action rather than
  // "Continue to Dashboard" or X would leave this session with a stale
  // PENDING payment sitting in the query cache, indefinitely — a genuine
  // cache-consistency gap, found during adversarial review, not present in
  // the two paths that were tested before.
  const leaveWith = (path) => {
    onClose();
    setLocation(path);
  };
  const handleDismiss = () => leaveWith("/app/dashboard");

  // Minimal, self-contained focus management — this is a hand-rolled overlay
  // (not the shared Radix-backed Dialog primitive: that primitive renders its
  // own built-in close button with different styling/position, which would
  // either duplicate or fight this component's own X button, and this
  // checkout surface deliberately keeps a bespoke dark aesthetic distinct
  // from the rest of the app rather than the design-system's token-based
  // Dialog styling — considered and rejected migrating for that reason).
  // Without this, Tab can cycle focus into page content hidden behind the
  // overlay, and there was no keyboard-only way to dismiss.
  useEffect(() => {
    dialogRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleDismiss();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: teamUsage } = useQuery({
    queryKey: ["/api/users/team-usage"],
    queryFn: () => fetch("/api/users/team-usage", { credentials: "include" }).then(r => r.ok ? r.json() : null),
  });
  // Same query key Dashboard.jsx reads /api/credits/info from — shares cache,
  // so the balance shown here is byte-identical to what the customer sees a
  // moment later on Dashboard, not a second, independently-computed number.
  const { data: creditsInfo } = useQuery({
    queryKey: ["/api/credits/info"],
    queryFn: () => fetch("/api/credits/info", { credentials: "include" }).then(r => r.ok ? r.json() : null),
  });

  const planKey = (payment?.planId || payment?.planName || "").toLowerCase();
  const matchedTier = Object.keys(MAX_TEAM_MEMBERS).find(k => planKey.includes(k));
  const seatLimit = matchedTier ? MAX_TEAM_MEMBERS[matchedTier] : 0;
  const hasTeamMember = (teamUsage?.totalMembers ?? 0) > 0;
  const teamEligible = seatLimit > 0;

  const benefits = [
    teamEligible
      ? (seatLimit === Infinity ? "Unlimited team members included" : `Up to ${seatLimit} team members included, at no extra cost`)
      : null,
    "Send from your own verified domain — your reputation, not a shared one",
  ].filter(Boolean);

  // Primary CTA is team-focused for every plan that includes seats — the
  // single highest-value action available immediately after upgrading.
  // Plans with no team capacity (free/trial) fall back to the next real
  // step instead. "Invite Your Team" specifically (not "Manage Team", which
  // implies an existing team the customer wants to review) also carries the
  // customer straight into an already-open invite dialog — found during the
  // end-to-end activation review that landing on Users.jsx still required a
  // second, redundant click on the exact action the customer just took.
  const primaryAction = teamEligible
    ? (hasTeamMember
        ? { label: "Manage Team", icon: Users, go: () => leaveWith("/app/users") }
        : { label: "Invite Your Team", icon: Users, go: () => leaveWith("/app/users?invite=1") })
    : { label: "Create Your First Campaign", icon: ArrowRight, go: () => leaveWith("/app/campaigns/new") };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activation-title"
      >
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-lg rounded-2xl p-7 md:p-8 outline-none"
          style={{ background: "#0C0C14", border: "1px solid #1A1A2E" }}
        >
          <button
            onClick={handleDismiss}
            aria-label="Close and continue to dashboard"
            className="absolute right-4 top-4 rounded p-1 text-[#55556A] transition-colors hover:text-[#F0F0F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5C8]"
          >
            <X className="h-4 w-4" />
          </button>

          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "rgba(0,229,200,0.12)", border: "1px solid rgba(0,229,200,0.3)" }}
          >
            <CheckCircle className="h-6 w-6" style={{ color: "#00E5C8" }} aria-hidden="true" />
          </div>

          <h2 id="activation-title" className="text-center text-2xl font-bold" style={{ color: "#F0F0F5", fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            You're on {payment?.planName || "your new plan"}
          </h2>
          <p className="mt-1.5 text-center text-sm" style={{ color: "#9898B8" }}>
            Payment confirmed — your plan is active. A receipt is on its way to your inbox.
          </p>

          {/* Credits added this purchase + the resulting total — both numbers
              visible together so the customer never has to do the addition
              themselves or wonder whether the purchase actually landed. */}
          <div className="mt-6 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl p-3.5 text-center" style={{ background: "#08080F", border: "1px solid #1A1A2E" }}>
              <p className="text-xs" style={{ color: "#7878A0" }}>Credits added</p>
              <p className="mt-0.5 text-lg font-bold" style={{ color: "#00E5C8" }}>
                +{formatNumber(payment?.credits ?? 0)}
              </p>
            </div>
            <div className="rounded-xl p-3.5 text-center" style={{ background: "#08080F", border: "1px solid #1A1A2E" }}>
              <p className="text-xs" style={{ color: "#7878A0" }}>New balance</p>
              <p className="mt-0.5 text-lg font-bold" style={{ color: "#F0F0F5" }}>
                {creditsInfo
                  ? formatNumber(creditsInfo.total ?? 0)
                  : <span className="inline-block h-5 w-14 rounded animate-pulse motion-reduce:animate-none" style={{ background: "#1A1A2E" }} aria-hidden="true" />}
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-2">
            {benefits.map((text, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: "#D0D0E0" }}>
                <Globe className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#00E5C8" }} aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-col gap-2.5">
            <button
              onClick={primaryAction.go}
              className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
              style={{ background: "#00E5C8", color: "#06060B" }}
            >
              <primaryAction.icon className="h-4 w-4" aria-hidden="true" />
              {primaryAction.label}
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-lg px-4 py-2 text-xs font-medium transition-colors"
              style={{ color: "#7878A0" }}
            >
              Continue to Dashboard
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
