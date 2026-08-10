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
 * total balance, and — for a paid workspace that has not built a team yet —
 * introduces the collaboration capability their plan already includes.
 *
 * M26: two deliberate variants, chosen by whether the Teams introduction is
 * genuinely useful to this customer right now.
 *
 *   FULL     paid plan + can manage a team + no members yet.
 *            The activation moment: celebrate, then introduce Teams once.
 *
 *   COMPACT  everything else — a workspace that already has members, a
 *            purchaser who cannot manage a team, or a non-paid plan.
 *            A clean purchase confirmation. Nobody is educated about Teams
 *            twice, and the fifth top-up of the month is not an onboarding.
 *
 * Both variants confirm the purchase and both give a clean exit. The variant
 * only decides how much is said, never whether the customer can leave.
 */
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CheckCircle, Users, Globe, Shield, Mail, ArrowRight, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatNumber } from "@/lib/utils";
import { markTeamsEducationSeen } from "@/lib/teamsEducation";
// M53 — a seat purchase states amounts and dates here, so it borrows the same
// formatter the billing surfaces use rather than growing a second one.
import { formatMinor } from "@shared/seatPricing";

/** Same date presentation as the seat pages, so one journey reads as one product. */
function fmtDay(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// The paid tiers, and only the paid tiers. MAX_TEAM_MEMBERS also carries
// free/trial seat limits (both 25, uniform since M20), so matching a plan name
// against its keys would let "Free Trial" match "free" and present the paid
// Teams activation to a customer who has not paid. Free plans are excluded here
// explicitly rather than relying on the fact that the free-credit claim happens
// to skip this render path today.
const PAID_TIERS = ["starter", "growth", "scale", "enterprise"];

const TEAM_ADMIN_ROLES = ["ROOT_ADMIN", "SUB_ADMIN"];

export default function PostPurchaseActivation({ payment, onClose }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const dialogRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

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
  // M37 — this hand-rolled overlay never locked page scroll, unlike the Radix
  // primitive it deliberately does not use. The page behind it scrolled under
  // touch, so on a phone the activation panel drifted over moving content.
  // Restores the previous value rather than assuming "" (the customer may have
  // arrived from a surface that set its own).
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

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

  const planKey = (payment?.planId || payment?.planName || "").toLowerCase();
  const paidTier = PAID_TIERS.find(t => planKey.includes(t)) || null;

  // ── M53/UX-2 — a seat purchase is not a credit purchase ────────────────────
  // This panel is rendered for EVERY payment kind (Payments.jsx sets
  // `activatedPayment` from the verify response without branching), and it was
  // written for credits only: it told a seat buyer "your credits are in" and
  // showed them "Credits added +0" seconds after they paid for seats.
  //
  // M52 fixed exactly this false claim one screen earlier — the Razorpay modal
  // called a seat purchase "0 credits" — and stopped there. Same defect, same
  // journey, one screen later.
  //
  // `kind` is the payment authority's own field, the same one the server forks
  // every value-moving path on (`isSeatPayment`). Never re-derived from copy.
  const isSeats = payment?.kind === "SEATS";

  // /api/users/team-usage is admin-gated (adminMiddleware). A member-role
  // purchaser would get a 403 here, which must not be read as "this workspace
  // has no team" and used to push them at a Team Management page they cannot
  // open — so the role check gates the query itself, not just the CTA.
  const canManageTeam = TEAM_ADMIN_ROLES.includes(user?.role);
  // M53 — a seat purchase IS the paid team purchase, but it never matched here:
  // `paidTier` is sniffed from the plan name, and a seat payment's planName reads
  // "Team Seats — 3 × Monthly", which contains no tier word. So the customer who
  // had just bought seats fell to the compact variant and was never offered the
  // one action those seats exist for. `kind` answers this directly.
  const teamIntroEligible = (!!paidTier || isSeats) && canManageTeam;

  const { data: teamUsage, isLoading: teamUsageLoading } = useQuery({
    queryKey: ["/api/users/team-usage"],
    queryFn: () => fetch("/api/users/team-usage", { credentials: "include" }).then(r => r.ok ? r.json() : null),
    enabled: teamIntroEligible,
  });

  // Same query key Dashboard.jsx reads /api/credits/info from — shares cache,
  // so the balance shown here is byte-identical to what the customer sees a
  // moment later on Dashboard, not a second, independently-computed number.
  const { data: creditsInfo } = useQuery({
    queryKey: ["/api/credits/info"],
    queryFn: () => fetch("/api/credits/info", { credentials: "include" }).then(r => r.ok ? r.json() : null),
  });

  // M43 — the seat allowance is server state. `null` means "not known yet or no
  // longer a bundled plan feature", and every consumer below omits the seat
  // claim in that case rather than inventing one.
  const { data: seatInfo } = useQuery({ queryKey: ["/api/seats/subscription"] });
  const seatLimit = seatInfo?.entitlement
    ? (seatInfo.entitlement.unlimited ? Infinity : seatInfo.entitlement.seats)
    : null;
  const hasTeamMembers = (teamUsage?.totalMembers ?? 0) > 0;

  // ── M53 — the seat purchase's own facts, all read from existing authorities ──
  const seatSub = seatInfo?.subscription ?? null;
  const renewalAt = seatInfo?.renewal?.at ?? seatSub?.periodEnd ?? null;
  // Whether this renews by itself is `renewalMode` — the ONE server-derived field
  // M44 created so no surface can answer that question its own way. Deriving it
  // here from the instrument's display state instead would have been a second
  // authority for one fact, which is the drift M44 exists to prevent; the
  // commercial-consistency guard caught exactly that and is why this reads the
  // centralised field. PENDING_AUTH (authorisation abandoned at the bank)
  // correctly resolves to MANUAL through it.
  const renewsAutomatically = seatInfo?.renewalMode === "AUTOMATIC";
  // The reason the server gave when it could not arrange automatic renewal. It
  // was already persisted on the payment (`startSeatPayment` writes it into
  // metadata); this is the first surface that reads it.
  const autopayUnavailable = payment?.metadata?.autopayUnavailable ?? null;
  const askedForAutopay = payment?.metadata?.autopayAtCheckout === true;
  // CDP-1 — whether the billing page can actually OFFER automatic renewal to
  // this workspace. The payment-method card there is gated on the rollout, so a
  // workspace outside it has no such control; telling that customer to "switch
  // it on from the billing page" sends them to look for a button that is not
  // rendered. Same gate, read from the same field, so the instruction and the
  // control can never disagree.
  const canSelfServeAutopay = seatInfo?.autopay?.inRollout === true;

  /**
   * What to tell the customer about automatic renewal, in the state they are
   * actually in. Returns null while the seat payload is still unknown — an
   * unanswered server has made no claim, and this panel must not invent one
   * (the M43 silence rule) seconds after a payment.
   */
  const autopayOutcome = (() => {
    if (!isSeats || !seatInfo) return null;
    const manualTail = "We'll email you a reminder before your period ends.";

    if (renewsAutomatically) {
      const amount = seatInfo?.renewal?.totalMinor != null
        ? formatMinor(seatInfo.renewal.totalMinor, seatSub?.currency || "INR")
        : null;
      return {
        ok: true,
        title: "Automatic renewal is on",
        detail: `${amount && renewalAt ? `We'll charge ${amount} on ${fmtDay(renewalAt)} and each period after. ` : ""}`
          + "We always email you first, and you can turn it off any time — it won't cancel your subscription.",
      };
    }

    if (autopayUnavailable === "CONTACT_REQUIRED") {
      return {
        ok: false,
        // The panel headline already says the seats are active; repeating it here
        // in different words ("live") is a second vocabulary for one fact.
        title: "Renewal is manual",
        detail: "We couldn't set up automatic renewal because your bank needs a phone number for it. "
          + `Add one to your sender profile and you can switch it on from the billing page. ${manualTail}`,
      };
    }
    if (autopayUnavailable || askedForAutopay) {
      // GATEWAY_UNAVAILABLE / CUSTOMER_CREATE_FAILED / ORDER_REJECTED — or asked
      // for and not established. The customer does not need to know which.
      return {
        ok: false,
        title: "Renewal is manual",
        detail: "We couldn't save a payment method for automatic renewal this time. Your purchase went through in full"
          + (canSelfServeAutopay ? ", and you can set automatic renewal up from the billing page whenever you like. " : ". ")
          + manualTail,
      };
    }
    return {
      ok: true,
      title: "Renewal is manual",
      detail: `Nothing is charged automatically. ${manualTail}`
        + (canSelfServeAutopay ? " You can switch automatic renewal on any time from the billing page." : ""),
    };
  })();

  // Only introduce Teams to a paid workspace that hasn't built one. While the
  // team count is still loading we deliberately hold the compact variant: it is
  // the safe default. Rendering the full onboarding first and collapsing it a
  // moment later would flash Teams education at a customer who already has a
  // team, which is the exact thing this variant exists to prevent.
  const showTeamIntro = teamIntroEligible && !teamUsageLoading && !hasTeamMembers;

  // M37 — M26 established that nobody should be educated about Teams twice, but
  // that only ever held inside this component. TeamsWelcomeModal introduces
  // Teams again on the next dashboard visit, and it could not see this panel's
  // state, so a customer who signed up and bought credits in one session got
  // both: shared domains and roles explained here, then "How many people do you
  // plan to work with?" and shared domains and roles explained again a moment
  // later. Recording it against the shared flag closes that.
  //
  // Only when the FULL variant actually renders. The compact variant teaches
  // nothing, so it must not suppress the education that would otherwise follow.
  useEffect(() => {
    if (showTeamIntro && user?.id) markTeamsEducationSeen(user.id);
  }, [showTeamIntro, user?.id]);

  // M43 — omit the seat figure entirely when it is unknown, rather than
  // rendering "up to null teammates". A generic phrase is correct under every
  // commercial state; the seat page owns the exact terms.
  const seatCopy = seatLimit === Infinity
    ? "unlimited teammates"
    : (typeof seatLimit === "number" ? `up to ${seatLimit} teammates` : "your teammates");

  // M43-FIX — the seat COUNT was made server-authoritative in the first M43 pass,
  // but the sentence under it still asserted the seats were free. Whether seats
  // cost anything is `seat_billing_enabled`, not a copy decision, and this panel
  // is shown immediately after a payment — the worst possible place to tell a
  // customer something about money that the billing system disagrees with. While
  // the state is unknown the commercial clause is omitted rather than guessed,
  // which is the same silence rule `commercialModel` follows.
  // M53 — a SEAT buyer is never told anything about credits on this screen. The
  // separation is worth stating to somebody who just bought credits and is being
  // introduced to Teams; to somebody who just bought seats it is noise about a
  // product they did not buy, on the screen that confirms what they did.
  // (The seat calculator already makes the separation before they pay.)
  const seatNote = isSeats
    ? "Invite them whenever you're ready."
    : seatInfo?.billingEnabled === undefined
      ? "Invite them whenever you're ready."
      : seatInfo.billingEnabled
        ? "Seats are billed separately from credits. Invite them whenever you're ready."
        : "Included in your plan, at no extra cost. Invite them whenever you're ready.";

  const collaboration = [
    { icon: Mail,   text: "Every campaign in one place, visible to the whole workspace" },
    { icon: Globe,  text: "Your verified sending domains, shared across the team" },
    { icon: Shield, text: "Roles and permissions decide who sees and sends what" },
  ];

  const motionProps = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 8 }, transition: { duration: 0.25 } };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        // M37: `overflow-y-auto` on the backdrop plus `my-auto` on the panel is
        // the fix for the FULL variant, which is ~640px tall — taller than any
        // phone in landscape and taller than a 320x568 portrait screen. Before
        // this the panel was centred by `items-center` and simply overflowed
        // both ends of a fixed, unscrollable box, putting "Invite your team" and
        // "Continue to Dashboard" out of reach on the one screen that has to
        // work: the one a customer sees right after paying.
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/70 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activation-title"
      >
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          {...motionProps}
          className="relative my-auto w-full max-w-lg shrink-0 rounded-2xl p-7 md:p-8 outline-none"
          style={{ background: "#0C0C14", border: "1px solid #1A1A2E" }}
          data-testid={showTeamIntro ? "activation-full" : "activation-compact"}
        >
          <button
            onClick={handleDismiss}
            aria-label="Close and continue to dashboard"
            // M37: `#55556A` is the exact colour RC-2 replaced everywhere else
            // for failing AA on these dark surfaces; `#7878A0` is the settled
            // replacement (4.63:1 on #0C0C14). This close button was missed
            // because RC-2 measured pages at rest and this one only renders
            // after a real payment. `p-2` takes the target from 24px to 32px —
            // the dismiss control on a post-payment overlay is a bad place to
            // sit exactly on the WCAG 2.5.8 minimum.
            className="absolute right-4 top-4 rounded p-2 -m-1 text-[#7878A0] transition-colors hover:text-[#F0F0F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5C8]"
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
            {isSeats ? "Your seats are active" : `You're on ${payment?.planName || "your new plan"}`}
          </h2>
          <p className="mt-1.5 text-center text-sm" style={{ color: "#9898B8" }}>
            {isSeats
              ? "Payment confirmed. Your team can start using the new seats right away, and a receipt is on its way to your inbox."
              : "Payment confirmed, your credits are in. A receipt is on its way to your inbox."}
          </p>

          {isSeats ? (
            /* What became active, and what happens next — the two questions a
               seat buyer has. Both come from the seat authority
               (`/api/seats/subscription`), the same payload the billing page
               renders, so this screen and that one cannot disagree. Each figure
               is omitted rather than guessed while unknown (the M43 silence
               rule): a wrong number here is a number the customer read seconds
               after paying. */
            <div className="mt-6 grid grid-cols-2 gap-2.5" data-testid="activation-seat-stats">
              <div className="rounded-xl p-3.5 text-center" style={{ background: "#08080F", border: "1px solid #1A1A2E" }}>
                <p className="text-xs" style={{ color: "#7878A0" }}>Seats now active</p>
                <p className="mt-0.5 text-lg font-bold" style={{ color: "#00E5C8" }} data-testid="activation-seat-count">
                  {seatLimit === Infinity ? "Unlimited"
                    : typeof seatLimit === "number" ? formatNumber(seatLimit)
                    : <span className="inline-block h-5 w-10 rounded animate-pulse motion-reduce:animate-none" style={{ background: "#1A1A2E" }} aria-hidden="true" />}
                </p>
              </div>
              <div className="rounded-xl p-3.5 text-center" style={{ background: "#08080F", border: "1px solid #1A1A2E" }}>
                <p className="text-xs" style={{ color: "#7878A0" }}>
                  {renewsAutomatically ? "Renews" : "Renew by"}
                </p>
                <p className="mt-0.5 text-lg font-bold" style={{ color: "#F0F0F5" }} data-testid="activation-renewal">
                  {renewalAt
                    ? fmtDay(renewalAt)
                    : <span className="inline-block h-5 w-14 rounded animate-pulse motion-reduce:animate-none" style={{ background: "#1A1A2E" }} aria-hidden="true" />}
                </p>
              </div>
            </div>
          ) : (
            /* Credits added this purchase + the resulting total — both numbers
                visible together so the customer never has to do the addition
                themselves or wonder whether the purchase actually landed. */
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
          )}

          {/* ── M53/UX-3: was automatic renewal actually arranged? ───────────── */}
          {/* THE SILENT-DEGRADATION FIX. The customer chose "Renew automatically"
              on the confirmation screen and then went to the gateway. Four server
              paths can refuse to arrange it (CONTACT_REQUIRED, GATEWAY_UNAVAILABLE,
              CUSTOMER_CREATE_FAILED, ORDER_REJECTED); each correctly degrades to a
              plain order so the SALE always completes, and each was recorded on the
              payment and then never shown, because the checkout response redirects
              to the gateway before the client can read it. The customer found out a
              month later, when nothing was charged.
              Nothing new is computed here: the outcome is the seat authority's own
              `autopay.displayState`, and the REASON is the code the server already
              persisted in payment metadata. */}
          {isSeats && autopayOutcome && (
            <div
              className="mt-4 rounded-xl p-3.5"
              style={{ background: "#08080F", border: `1px solid ${autopayOutcome.ok ? "#1A1A2E" : "#4A3A16"}` }}
              data-testid="activation-autopay"
            >
              <p className="text-sm font-semibold" style={{ color: autopayOutcome.ok ? "#00E5C8" : "#E8B34A" }}>
                {autopayOutcome.title}
              </p>
              <p className="mt-1 text-xs" style={{ color: "#9898B8" }} data-testid="activation-autopay-detail">
                {autopayOutcome.detail}
              </p>
            </div>
          )}

          {showTeamIntro ? (
            <>
              {/* The Teams introduction. Shown once, to a paid workspace that has
                  not built a team yet — never to a workspace that already has one. */}
              <div
                className="mt-6 rounded-xl p-4"
                style={{ background: "#08080F", border: "1px solid #1A1A2E" }}
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 shrink-0" style={{ color: "#00E5C8" }} aria-hidden="true" />
                  <p className="text-sm font-semibold" style={{ color: "#F0F0F5" }}>
                    Your workspace includes {seatCopy}
                  </p>
                </div>
                <p className="mt-1 text-xs" style={{ color: "#7878A0" }} data-testid="activation-seat-note">
                  {seatNote}
                </p>
                <ul className="mt-3.5 space-y-2">
                  {collaboration.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-2.5 text-sm" style={{ color: "#D0D0E0" }}>
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#00E5C8" }} aria-hidden="true" />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 flex flex-col gap-2.5">
                {/* Lands on Team Management with the invite dialog already open
                    (?invite=1). Established in the M20-C activation review: sending
                    the customer to Users.jsx and making them click Invite again is a
                    redundant second click on the action they just chose. This is the
                    existing production Team Management screen, not a parallel flow. */}
                <button
                  onClick={() => leaveWith("/app/team?invite=1")}
                  className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5C8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C0C14]"
                  style={{ background: "#00E5C8", color: "#06060B" }}
                  data-testid="button-activation-team"
                >
                  <Users className="h-4 w-4" aria-hidden="true" />
                  Invite your team
                </button>
                <button
                  onClick={handleDismiss}
                  className="rounded-lg px-4 py-2 text-xs font-medium transition-colors hover:text-[#F0F0F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5C8]"
                  style={{ color: "#7878A0" }}
                  data-testid="button-activation-dashboard"
                >
                  Continue to Dashboard
                </button>
              </div>
            </>
          ) : (
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={handleDismiss}
                className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5C8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C0C14]"
                style={{ background: "#00E5C8", color: "#06060B" }}
                data-testid="button-activation-dashboard"
              >
                Continue to Dashboard
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              {/* A workspace with a team keeps a quiet route back to it, without
                  being re-taught what Teams is. */}
              {teamIntroEligible && hasTeamMembers && (
                <button
                  onClick={() => leaveWith("/app/team")}
                  className="rounded-lg px-4 py-2 text-xs font-medium transition-colors hover:text-[#F0F0F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5C8]"
                  style={{ color: "#7878A0" }}
                  data-testid="button-activation-team"
                >
                  Manage team
                </button>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
