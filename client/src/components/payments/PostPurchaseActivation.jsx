/**
 * Post-purchase activation experience (M20-C).
 * Shown once, immediately after a successful payment verification, replacing
 * the old "Payment successful" toast + dismissible banner. Reinforces the
 * value of the plan just purchased, surfaces Teams as one of its biggest
 * benefits, and drives the customer toward the next real step — whichever of
 * domain verification / inviting teammates / first campaign is actually
 * still missing, reflecting live account state, not a generic checklist.
 */
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Circle, ArrowRight, Users, Globe, Send, PartyPopper, X } from "lucide-react";
import { MAX_TEAM_MEMBERS } from "@shared/schema";
import { formatNumber } from "@/lib/utils";

export default function PostPurchaseActivation({ payment, onClose }) {
  const [, setLocation] = useLocation();

  const { data: domains } = useQuery({
    queryKey: ["/api/domains"],
    queryFn: () => fetch("/api/domains", { credentials: "include" }).then(r => r.ok ? r.json() : []),
  });
  const { data: teamUsage } = useQuery({
    queryKey: ["/api/users/team-usage"],
    queryFn: () => fetch("/api/users/team-usage", { credentials: "include" }).then(r => r.ok ? r.json() : null),
  });
  const { data: campaigns } = useQuery({
    queryKey: ["/api/campaigns"],
    queryFn: () => fetch("/api/campaigns", { credentials: "include" }).then(r => r.ok ? r.json() : []),
  });

  const planKey = (payment?.planId || payment?.planName || "").toLowerCase();
  const seatLimit = Object.keys(MAX_TEAM_MEMBERS).find(k => planKey.includes(k))
    ? MAX_TEAM_MEMBERS[Object.keys(MAX_TEAM_MEMBERS).find(k => planKey.includes(k))]
    : 0;
  const hasVerifiedDomain = (domains ?? []).some(d => d.status === "VERIFIED");
  const hasTeamMember = (teamUsage?.totalMembers ?? 0) > 0;
  const hasCampaign = (campaigns ?? []).length > 0;

  const checklist = [
    {
      key: "domain",
      icon: Globe,
      label: "Verify a sending domain",
      done: hasVerifiedDomain,
      cta: "Set up your domain",
      go: () => setLocation("/app/domains"),
    },
    ...(seatLimit > 0 ? [{
      key: "team",
      icon: Users,
      label: "Invite your team",
      done: hasTeamMember,
      cta: "Invite your team",
      go: () => setLocation("/app/users"),
    }] : []),
    {
      key: "campaign",
      icon: Send,
      label: "Send your first campaign",
      done: hasCampaign,
      cta: "Create your first campaign",
      go: () => setLocation("/app/campaigns/new"),
    },
  ];

  const nextStep = checklist.find(c => !c.done);
  const allDone = !nextStep;
  const loadingChecklist = domains === undefined || campaigns === undefined || (seatLimit > 0 && teamUsage === undefined);

  const benefits = [
    { icon: PartyPopper, text: `${formatNumber(payment?.credits ?? 0)} credits added to your account` },
    ...(seatLimit > 0
      ? [{ icon: Users, text: seatLimit === Infinity ? "Unlimited team members included" : `Up to ${seatLimit} team members included, at no extra cost` }]
      : []),
    { icon: Globe, text: "Send from your own verified domain — your reputation, not a shared one" },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activation-title"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative w-full max-w-lg rounded-2xl p-7 md:p-8"
          style={{ background: "#0C0C14", border: "1px solid #1A1A2E" }}
        >
          <button
            onClick={onClose}
            aria-label="Close"
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
            A receipt is on its way to your inbox. Here's what just unlocked.
          </p>

          <ul className="mt-6 space-y-2.5">
            {benefits.map(({ icon: Icon, text }, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: "#D0D0E0" }}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#00E5C8" }} aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>

          <div className="mt-7 rounded-xl p-4" style={{ background: "#08080F", border: "1px solid #1A1A2E" }}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "#7878A0" }}>
              Get to your first send faster
            </p>
            <ul className="space-y-2">
              {checklist.map(({ key, icon: Icon, label, done }) => (
                <li key={key} className="flex items-center gap-2.5 text-sm">
                  {done
                    ? <CheckCircle className="h-4 w-4 shrink-0" style={{ color: "#00E5C8" }} aria-hidden="true" />
                    : <Circle className="h-4 w-4 shrink-0" style={{ color: "#3A3A55" }} aria-hidden="true" />
                  }
                  <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: done ? "#00E5C8" : "#7878A0" }} aria-hidden="true" />
                  <span style={{ color: done ? "#7878A0" : "#D0D0E0", textDecoration: done ? "line-through" : "none" }}>
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            {!loadingChecklist && !allDone && (
              <button
                onClick={nextStep.go}
                className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
                style={{ background: "#00E5C8", color: "#06060B" }}
              >
                {nextStep.cta}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {!loadingChecklist && allDone && (
              <button
                onClick={() => setLocation("/app/dashboard")}
                className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
                style={{ background: "#00E5C8", color: "#06060B" }}
              >
                Go to dashboard
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium transition-colors"
              style={{ color: "#7878A0" }}
            >
              I'll do this later
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
