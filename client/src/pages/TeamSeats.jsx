/**
 * TEAM SEATS — billing surface for the workspace's seat subscription (M42).
 *
 * Every number here comes from the server (`/api/seats/subscription`,
 * `/api/seats/preview`); the page renders and never derives entitlement. The
 * preview shown before confirming is the SAME object the checkout recomputes, so
 * "what will I be charged" and "what was I charged" cannot disagree.
 *
 * Deliberate commercial honesty in the UI, because trust is worth more than a
 * conversion point: a scheduled downgrade says plainly that seats stay until the
 * period ends, a past-due state says exactly what is at risk and when, and
 * cancelling states what the customer keeps rather than only what they lose.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertTriangle, ArrowLeft, CalendarClock, CreditCard, Info, Receipt, ShieldCheck, Users } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import SeatCalculator from "@/components/pricing/SeatCalculator";
// M52 — the confirmation body. Extracted so the highest-stakes screen in the
// product can actually be rendered in a test (it only mounts behind a state
// change, and this repo's harness is SSR renderToString). M50-C: a UI change is
// not verified until it has been rendered and looked at.
import SeatChangeSummary from "@/components/teams/SeatChangeSummary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";
// Reuse the app's single Razorpay script loader — a second one would inject the
// checkout script twice.
import { loadRazorpayScript } from "@/pages/Payments";
import { formatMinor, SEAT_TERMS } from "@shared/seatPricing";

const SEATS_KEY = ["/api/seats/subscription"];

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function TeamSeats() {
  const { isWorkspaceOwner, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(null); // { preview, seats, term }
  // M53/UX-1 — ending the subscription is the only destructive control on this
  // page and it used to fire on a single click, from a ghost button labelled
  // "Turn off auto-renewal" that sat beside "Turn off automatic payment". One of
  // those keeps the team and one deletes its seats. The labels now name their
  // outcomes and the destructive one asks first.
  const [confirmCancel, setConfirmCancel] = useState(false);
  // M52 — whether this purchase should also set up automatic renewal. Defaults
  // ON, and the customer is told exactly what that means before they pay, not
  // after. Kept in page state (not in the preview) because it is a decision
  // about THIS checkout, not a property of the price.
  const [autopayAtCheckout, setAutopayAtCheckout] = useState(true);

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: SEATS_KEY });

  const previewMutation = useMutation({
    mutationFn: async ({ seats, term }) => {
      const res = await apiRequest("POST", "/api/seats/preview", { seats, term });
      return res.json();
    },
    onError: (e) => toast({ title: "Couldn't price that change", description: e.message, variant: "destructive" }),
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ seats, term, autopay }) => {
      const res = await apiRequest("POST", "/api/seats/checkout", { seats, term, autopay });
      return res.json();
    },
    onSuccess: (result) => {
      // Entitlement is server state; never optimistically write it locally.
      qc.invalidateQueries({ queryKey: SEATS_KEY });
      qc.invalidateQueries({ queryKey: ["/api/users"] });
      setConfirm(null);
      if (result.redirectUrl && result.gateway === "razorpay") {
        window.location.assign(result.redirectUrl);
        return;
      }
      if (result.noop) {
        toast({ title: "Nothing to change", description: "That's already your current seat count." });
        return;
      }
      // M52 — if the customer asked for automatic renewal and we could not
      // arrange it, say so HERE rather than letting them discover it a month
      // later when nothing was charged. The purchase itself still succeeded,
      // so this is a note on a success, not an error.
      if (result.autopayUnavailable || result.autopay?.bound === false) {
        toast({
          title: "Seats updated — renewal is manual",
          description: result.autopayUnavailable === "CONTACT_REQUIRED"
            ? "Your seats are live. To renew automatically, add a phone number to your sender profile and turn it on from this page."
            : "Your seats are live, but we couldn't save a payment method for automatic renewal. We'll email you a reminder before your period ends.",
        });
        return;
      }
      toast({
        title: result.scheduled ? "Change scheduled" : "Seats updated",
        description: result.scheduled
          ? "It takes effect at your next renewal. Nothing changes before then."
          : result.waived
            ? "Your new seats are live. There was too little left in this period to bill, so we've added them at no charge — your next renewal covers the new total."
            : "Your team can start using the new seats right away.",
      });
    },
    onError: (e) => toast({ title: "Purchase failed", description: e.message, variant: "destructive" }),
  });

  // Renewal is customer-initiated in v1 (no stored mandate), so this button IS
  // the renewal path — the dunning email links straight here.
  const renewMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/seats/renew", {})).json(),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: SEATS_KEY });
      if (result.redirectUrl && result.gateway === "razorpay") {
        window.location.assign(result.redirectUrl);
        return;
      }
      toast({ title: "Renewed", description: "Your seats are paid up for the next period." });
    },
    onError: (e) => toast({ title: "Couldn't renew", description: e.message, variant: "destructive" }),
  });

  // M51 — AutoPay actions. All post to the EXISTING seats API surface and then
  // invalidate the ONE query this page reads, so the server stays the single
  // source of truth for every billing fact rendered here.
  const autopayAction = (path, successMsg) => ({
    mutationFn: (body) => apiRequest("POST", `/api/seats/autopay/${path}`, body ?? {}),
    onSuccess: () => { toast({ title: successMsg }); qc.invalidateQueries({ queryKey: SEATS_KEY }); },
    onError: (e) => toast({ title: e?.message || "Something went wrong", variant: "destructive" }),
  });
  // ── AutoPay onboarding ────────────────────────────────────────────────────
  // setup → gateway authorisation → confirm. The SAME three-step shape the seat
  // checkout already uses, and the same script loader, so there is one Razorpay
  // integration in the app rather than two. `replace` is the identical flow: the
  // server binds the new instrument and only then revokes the old one, so an
  // abandoned replacement leaves the customer exactly where they started.
  const [autopayBusy, setAutopayBusy] = useState(false);

  async function startAutopay({ replace = false } = {}) {
    setAutopayBusy(true);
    try {
      const setup = await (await apiRequest("POST", "/api/seats/autopay/setup", {})).json();

      // Dev/test (and any build with no gateway configured) completes without a
      // modal, so the whole journey stays exercisable end-to-end.
      if (!setup.simulated) {
        const loaded = await loadRazorpayScript();
        if (!loaded) throw new Error("Couldn't reach the payment provider. Check your connection and try again.");

        const authorised = await new Promise((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: setup.razorpayKeyId,
            order_id: setup.orderId,
            customer_id: setup.customerId,
            recurring: 1,
            amount: setup.amount,
            currency: "INR",
            name: "RepMail",
            description: "Set up automatic renewal for your team seats",
            handler: (r) => resolve(r),
            modal: { ondismiss: () => reject(new Error("Authorisation cancelled — nothing has changed.")) },
            prefill: { email: user?.email, name: user?.username },
            theme: { color: "#6366f1" },
          });
          rzp.on("payment.failed", (e) =>
            reject(new Error(e?.error?.description || "Your bank declined the authorisation.")));
          rzp.open();
        });

        await apiRequest("POST", "/api/seats/autopay/confirm", {
          mandateId: setup.mandate.id,
          razorpay_payment_id: authorised.razorpay_payment_id,
          razorpay_order_id: authorised.razorpay_order_id,
          razorpay_signature: authorised.razorpay_signature,
        });
      } else {
        await apiRequest("POST", "/api/seats/autopay/confirm", { mandateId: setup.mandate.id });
      }

      qc.invalidateQueries({ queryKey: SEATS_KEY });
      toast({
        title: replace ? "Payment method replaced" : "Automatic renewal is on",
        description: replace
          ? "Your next renewal will use the new payment method."
          : "We'll always email you before we charge. You can turn this off any time — it won't cancel your subscription.",
      });
    } catch (e) {
      toast({ title: replace ? "Couldn't replace it" : "Couldn't turn on automatic renewal", description: e.message, variant: "destructive" });
    } finally {
      setAutopayBusy(false);
    }
  }

  const autopayDisable = useMutation(autopayAction("disable", "Automatic renewal is off. Your subscription is still active."));
  const autopayEnable = useMutation(autopayAction("enable", "Automatic renewal is back on."));
  const autopayPause = useMutation(autopayAction("pause", "Automatic renewal paused. Your subscription is still active."));
  const autopayResume = useMutation(autopayAction("resume", "Automatic renewal resumed."));

  const cancelMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/seats/cancel", {})).json(),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: SEATS_KEY });
      setConfirmCancel(false);
      toast({ title: "Your seats will end", description: `They stay fully active until ${fmtDate(r.seatsUntil)}, then this workspace returns to its included allowance.` });
    },
    onError: (e) => toast({ title: "Couldn't cancel", description: e.message, variant: "destructive" }),
  });

  const resumeMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/seats/resume", {})).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SEATS_KEY });
      toast({ title: "We'll remind you to renew", description: "Your seats no longer end at the period date — we'll email you when it's time to renew." });
    },
    onError: (e) => toast({ title: "Couldn't resume", description: e.message, variant: "destructive" }),
  });

  async function handleSelect({ seats, term }) {
    const preview = await previewMutation.mutateAsync({ seats, term });
    setConfirm({ ...preview, seats, term });
  }

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="Seats" description="Manage how many people can work in this workspace." />
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <PageHeader title="Seats" />
        <div className="rounded-xl border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">We couldn't load your seat details.</p>
          <Button className="mt-4" variant="outline" onClick={() => refetch()}>Try again</Button>
        </div>
      </AppLayout>
    );
  }

  const { entitlement, usage, subscription, renewal, billingEnabled, seatsAtRisk } = data;
  const sub = subscription;
  // M51 — all server-derived. The client renders these; it never computes
  // autopay liveness, display state or renewal mode itself.
  const autopay = data.autopay ?? null;
  const mandate = data.mandate ?? null;
  const dunning = data.dunning ?? null;
  const lastRenewal = data.lastRenewal ?? null;
  // Ownership is the SERVER's answer (`isOwner`), not a second derivation from the
  // auth payload. Both resolve `parentId == null` today, so they agree — but two
  // sources for one fact is exactly the drift this milestone exists to remove, and
  // it left the API's own field dead. The auth-derived value is only a fallback for
  // the window before this payload arrives.
  const isOwner = data.isOwner ?? isWorkspaceOwner;
  // M44 — whether a period renews by itself is a property of the billing system,
  // read from the server (`renewalMode`), never assumed here. Defaults to false
  // while unknown: promising an automatic charge that never happens costs the
  // customer their team, whereas an unnecessary reminder costs them nothing.
  //
  // M52 — for a workspace with NO subscription yet, the server now answers this
  // from the rollout gate rather than a frozen constant, so it describes what
  // checkout will actually do. Same field, same rule: never derived here.
  const autoRenews = data.renewalMode === "AUTOMATIC";

  // ── M52 checkout decisions ────────────────────────────────────────────────
  // Offer the AutoPay choice only when there is a real choice to make: the
  // workspace is in the rollout, the person can act on it, and no usable
  // instrument is already saved. Re-asking somebody who has already given us a
  // card would invite them to replace one that is working perfectly.
  const instrumentUsable = !!mandate
    && !["REVOKED", "FAILED", "EXPIRED"].includes(mandate.status);
  //
  // A phone number is a hard precondition: Razorpay refuses a recurring order
  // for a customer with no contact (Audit 213), so the server would degrade to a
  // plain order. In production the checkout response then REDIRECTS straight to
  // the gateway, so a "renewal is manual after all" toast would never be seen —
  // the customer would tick "Renew automatically", pay, and only discover a
  // month later that nothing was arranged. The condition is knowable here, so
  // the promise is simply not offered when we cannot keep it.
  const canRegisterInstrument = !!user?.senderPhone;
  const offerAutopay = billingEnabled && isOwner && autopay?.inRollout === true
    && !instrumentUsable && canRegisterInstrument;
  // In the rollout, wants an instrument, but cannot have one yet — say why, and
  // say it before they pay rather than after.
  const autopayBlockedOnContact = billingEnabled && isOwner && autopay?.inRollout === true
    && !instrumentUsable && !canRegisterInstrument;

  return (
    <AppLayout>
      <PageHeader
        title="Seats"
        description="Manage how many people can work in this workspace."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/app/team"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />Team</Link>
          </Button>
        }
      />

      {/* ── Current position ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5" data-testid="seat-status">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" aria-hidden="true" />
              <span>Seats in use</span>
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {usage.activeMembers}
              {entitlement.unlimited ? " / unlimited" : ` / ${entitlement.seats}`}
            </p>
            {usage.pendingInvites > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {usage.pendingInvites} pending invite{usage.pendingInvites === 1 ? "" : "s"} also held against your seats
              </p>
            )}
          </div>
          {sub && (
            <div className="text-right">
              <Badge variant={sub.status === "ACTIVE" ? "default" : "secondary"}>{sub.status.replace(/_/g, " ")}</Badge>
              {/* M44 — "Renews" was a promise the platform cannot keep: v1 is
                  prepaid with no stored mandate, so nothing renews by itself.
                  `autoRenews` comes from the server's renewalMode, so this flips
                  automatically if autopay is ever integrated. */}
              <p className="mt-2 text-sm text-muted-foreground">
                {/* CDP-3 — in PAST_DUE the period has already ended, so quoting
                    `periodEnd` printed a date in the PAST directly above a
                    banner promising access until the GRACE date. The deadline
                    that actually applies to the customer is the grace date, and
                    it is the one the banner, the dunning emails and the
                    expiry sweep all act on. */}
                {sub.status === "PAST_DUE" && sub.graceEndsAt
                  ? `Renew by ${fmtDate(sub.graceEndsAt)}`
                  : sub.cancelAtPeriodEnd
                    ? `Ends ${fmtDate(sub.periodEnd)}`
                    : autoRenews
                      ? `Renews ${fmtDate(sub.periodEnd)}`
                      : `Renew by ${fmtDate(sub.periodEnd)}`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Past due ─────────────────────────────────────────────────────── */}
      {sub?.status === "PAST_DUE" && (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-5" data-testid="seat-pastdue">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <div>
              <p className="font-medium">Your seat renewal hasn't gone through</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Everything still works — your whole team keeps access until {fmtDate(sub.graceEndsAt)}.{" "}
                {/* An unlimited (Enterprise) entitlement has no numeric floor to
                    quote, and `entitlement.seats` is null there — computing a
                    remainder would print "drops to 0 seats" and frighten the one
                    customer for whom nothing is at risk. */}
                {entitlement.unlimited || seatsAtRisk === 0 ? (
                  <>No seats are at risk — renewing just keeps your billing current.</>
                ) : (
                  <>
                    After that this workspace drops to {entitlement.seats - seatsAtRisk} seat
                    {entitlement.seats - seatsAtRisk === 1 ? "" : "s"} and the {seatsAtRisk} most recently added member
                    {seatsAtRisk === 1 ? "" : "s"} are deactivated. Nobody is deleted, and your credits are never affected.
                  </>
                )}
              </p>
              {isOwner && (
                <Button
                  className="mt-4"
                  onClick={() => renewMutation.mutate()}
                  disabled={renewMutation.isPending}
                  data-testid="seat-renew-pastdue"
                >
                  {renewMutation.isPending ? "Working…" : `Renew now — ${formatMinor(sub.renewalAmountMinor, sub.currency)}`}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Approval needed (AFA) ────────────────────────────────────────── */}
      {/* Deliberately NOT styled or worded as a failure: the customer has done
          nothing wrong, their bank simply requires them to approve this specific
          debit. Outranks every other autopay state because it is the only one
          where inaction eventually costs them seats. */}
      {autopay?.displayState === "AFA_REQUIRED" && (
        <div className="mt-4 rounded-xl border border-blue-500/40 bg-blue-500/5 p-5" data-testid="autopay-afa">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <div>
              <p className="font-medium">Your bank needs you to approve this payment</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This is a security step for payments of this size — there's nothing wrong with your
                account or your payment method. Everything stays active while you approve it
                {dunning?.graceEndsAt ? `, and you have until ${fmtDate(dunning.graceEndsAt)}` : ""}.
              </p>
              {isOwner && (
                <Button className="mt-4" onClick={() => renewMutation.mutate()} disabled={renewMutation.isPending} data-testid="autopay-afa-action">
                  {renewMutation.isPending ? "Working…" : `Approve ${formatMinor(sub.renewalAmountMinor, sub.currency)}`}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Renewal outgrew the authorised ceiling (M52) ─────────────────── */}
      {/* Deliberately NOT framed as a payment failure. The card works; the
          standing limit agreed with the bank does not cover the new amount,
          which is almost always the consequence of adding seats. Telling a
          customer their payment "failed" here would send them to re-enter a
          card that is fine and fix nothing. */}
      {autopay?.exceedsCeiling && isOwner && (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-5" data-testid="autopay-ceiling">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <div>
              <p className="font-medium">Confirm the new amount to keep renewing automatically</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your team has grown, so your renewal is now{" "}
                {renewal ? formatMinor(renewal.totalMinor, sub.currency) : "higher than before"} — more than your bank
                has approved us to take automatically. There's nothing wrong with your payment method.
                Confirm it once and automatic renewal continues as normal.
              </p>
              <Button className="mt-4" onClick={() => startAutopay({ replace: true })} disabled={autopayBusy} data-testid="autopay-ceiling-action">
                {autopayBusy ? "Working…" : "Confirm the new amount"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment method ───────────────────────────────────────────────── */}
      {/* Owner-only: `mandate` is null for everyone else server-side, so a member
          cannot see the owner's masked instrument even if this rendered. */}
      {billingEnabled && isOwner && sub && autopay?.inRollout && (
        <div className="mt-4 rounded-xl border border-border bg-card p-5" data-testid="autopay-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" aria-hidden="true" />
                <span>Payment method</span>
              </div>
              {mandate ? (
                <>
                  <p className="mt-1 font-medium">{mandate.instrumentLabel || "Saved payment method"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {autopay.displayState === "ACTIVE" && <>Renews automatically on {fmtDate(sub.periodEnd)}.</>}
                    {autopay.displayState === "PAUSED" && (
                      <>Automatic renewal is off. <span className="text-foreground">Your subscription is still active</span> — renewal is manual.</>
                    )}
                    {autopay.displayState === "PENDING_AUTH" && <>Finish authorising this payment method to turn on automatic renewal.</>}
                    {autopay.displayState === "NEEDS_ATTENTION" && (
                      <>This payment method can no longer be used. Your subscription is <span className="text-foreground">not cancelled</span> — replace it to renew automatically again.</>
                    )}
                    {mandate.expiresAt && <> Expires {fmtDate(mandate.expiresAt)}.</>}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  {/* CDP-3 — the reminder promise is future-tense and the period
                      has already ended in PAST_DUE, where the dunning emails are
                      the ones actually being sent. */}
                  No payment method saved — renewal is manual.
                  {sub?.status !== "PAST_DUE" && " We'll email you a reminder before your period ends."}
                </p>
              )}
            </div>
            <Badge variant={autopay.displayState === "ACTIVE" ? "default" : "secondary"} data-testid="autopay-state">
              {autopay.displayState === "ACTIVE" ? "Automatic" : autopay.displayState === "NEEDS_ATTENTION" ? "Needs attention" : "Manual"}
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {/* THE ENTRY POINT. Without this the whole recurring-billing system
                is unreachable: every charge path requires a bound mandate, and
                nothing else can create one. */}
            {(autopay.displayState === "NOT_SET_UP" || autopay.displayState === "PENDING_AUTH") && (
              <Button onClick={() => startAutopay()} disabled={autopayBusy} data-testid="autopay-setup">
                {autopayBusy ? "Working…" : "Turn on automatic renewal"}
              </Button>
            )}
            {/* Replacement is the primary recovery from a dead instrument, and
                the same flow either way — bind the new one, then revoke the old. */}
            {mandate && autopay.displayState !== "PENDING_AUTH" && (
              <Button
                variant={autopay.displayState === "NEEDS_ATTENTION" ? "default" : "outline"}
                onClick={() => startAutopay({ replace: true })}
                disabled={autopayBusy}
                data-testid="autopay-replace"
              >
                {autopayBusy ? "Working…" : "Replace payment method"}
              </Button>
            )}
            {/* Three distinct controls, never merged: replacing an instrument,
                turning automatic payment off, and cancelling a subscription are
                three different outcomes and the UI must not blur them. */}
            {autopay.displayState === "ACTIVE" && (
              <>
                <Button variant="ghost" onClick={() => autopayDisable.mutate()} disabled={autopayDisable.isPending} data-testid="autopay-disable">
                  Turn off automatic renewal
                </Button>
                <Button variant="ghost" onClick={() => autopayPause.mutate({ days: 30 })} disabled={autopayPause.isPending} data-testid="autopay-pause">
                  Pause for 30 days
                </Button>
              </>
            )}
            {autopay.displayState === "PAUSED" && mandate && (
              <Button
                variant="outline"
                onClick={() => (mandate.status === "PAUSED" ? autopayResume : autopayEnable).mutate()}
                disabled={autopayResume.isPending || autopayEnable.isPending}
                data-testid="autopay-resume"
              >
                Turn automatic renewal back on
              </Button>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Turning off automatic renewal does not cancel your subscription — you'll just renew manually.
          </p>
        </div>
      )}

      {/* ── Last renewal ─────────────────────────────────────────────────── */}
      {lastRenewal && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-border p-5 text-sm" data-testid="autopay-last-renewal">
          <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-muted-foreground">
            Last renewal {fmtDate(lastRenewal.at)} —{" "}
            <span className="font-medium text-foreground">{formatMinor(lastRenewal.amountMinor, lastRenewal.currency)}</span>
            {lastRenewal.mode === "AUTO" ? " (charged automatically)" : " (paid manually)"}.{" "}
            <Link href="/app/payments" className="underline">Billing history</Link>
          </p>
        </div>
      )}

      {/* ── Scheduled change ─────────────────────────────────────────────── */}
      {sub && (sub.scheduledSeats != null || sub.scheduledTerm) && (
        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-5" data-testid="seat-scheduled">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="font-medium">A change is scheduled for {fmtDate(sub.periodEnd)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You keep all {sub.seats} seats until then — nothing changes before your period ends. From{" "}
                {fmtDate(sub.periodEnd)} you'll be on {sub.scheduledSeats ?? sub.seats} seat
                {(sub.scheduledSeats ?? sub.seats) === 1 ? "" : "s"}
                {sub.scheduledTerm ? `, billed ${SEAT_TERMS[sub.scheduledTerm]?.label.toLowerCase()}` : ""}
                {renewal ? ` at ${formatMinor(renewal.totalMinor, sub.currency)}` : ""}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Renewal preview ──────────────────────────────────────────────── */}
      {/* CDP-3 — suppressed while PAST_DUE. The period has already ended in that
          state, so this panel was telling the customer to "Renew by <a date in
          the past>" directly underneath a banner explaining that the renewal had
          already failed and that access now runs to the GRACE date. Two dates,
          two tenses, one screen. The past-due banner above already carries the
          amount, the deadline that actually applies and the action. */}
      {sub && renewal && !sub.cancelAtPeriodEnd && sub.status !== "PAST_DUE" && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-border p-5 text-sm" data-testid="seat-renewal">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {/* M44 — this said "Next charge ₹X on <date>". Nothing charges: v1 is
              prepaid with no mandate, so a customer who read that and did nothing
              would silently enter a grace window and lose seats. State who has to
              act, and say what happens if nobody does. */}
          <p className="text-muted-foreground">
            {autoRenews ? (
              <>
                Next charge <span className="font-medium text-foreground">{formatMinor(renewal.totalMinor, sub.currency)}</span>{" "}
                on {fmtDate(renewal.at)} for {renewal.seats} seat{renewal.seats === 1 ? "" : "s"}.
              </>
            ) : (
              <>
                Renew by {fmtDate(renewal.at)} to keep {renewal.seats} seat{renewal.seats === 1 ? "" : "s"} —{" "}
                <span className="font-medium text-foreground">{formatMinor(renewal.totalMinor, sub.currency)}</span>.
                {" "}We'll email you a reminder; seats are not charged automatically.
              </>
            )}
          </p>
        </div>
      )}

      {/* ── Change seats ─────────────────────────────────────────────────── */}
      {!billingEnabled ? (
        <div className="mt-6 rounded-xl border border-border p-6 text-sm text-muted-foreground" data-testid="seat-billing-off">
          Seat purchasing isn't available on your workspace yet. Your current allowance of{" "}
          {entitlement.unlimited ? "unlimited" : entitlement.seats} seats continues to apply.
        </div>
      ) : !isOwner ? (
        <div className="mt-6 rounded-xl border border-border p-6 text-sm text-muted-foreground" data-testid="seat-not-owner">
          Only the workspace owner can change seats or billing. Ask them to add a seat if your team needs one.
        </div>
      ) : (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Change your seats</h2>
          <SeatCalculator
            initialSeats={sub?.seats ?? Math.max(1, usage.activeMembers)}
            initialTerm={sub?.term ?? SEAT_TERMS.MONTHLY.id}
            currentSeats={sub?.seats ?? null}
            minSeats={0}
            ctaLabel="Review change"
            busy={previewMutation.isPending}
            onSelect={handleSelect}
          />

          {sub && (
            <div className="mt-4 flex flex-wrap gap-3">
              {sub.status !== "PAST_DUE" && (
                <Button variant="outline" onClick={() => renewMutation.mutate()} disabled={renewMutation.isPending} data-testid="seat-renew">
                  {renewMutation.isPending ? "Working…" : "Renew early"}
                </Button>
              )}
              {/* M44 — these were labelled "Turn off / Turn auto-renewal back on"
                  for a system with no auto-renewal. What the customer is actually
                  choosing is whether the seats END at the period date or whether we
                  chase them to renew. Label the outcome, not a mechanism that does
                  not exist.

                  M53/UX-1 — and NEVER borrow the automatic-renewal vocabulary for
                  it. While AutoPay was on, this button read "Turn off auto-renewal"
                  directly beside the payment card's "Turn off automatic payment".
                  Those two sentences are indistinguishable at a glance and their
                  outcomes are opposite: one keeps the team and renews by hand, the
                  other ends the seats and deactivates members. The label is now the
                  outcome in both states, and it never varies on `autoRenews`. */}
              {sub.cancelAtPeriodEnd ? (
                <Button variant="outline" onClick={() => resumeMutation.mutate()} disabled={resumeMutation.isPending} data-testid="seat-resume">
                  Keep these seats
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setConfirmCancel(true)}
                  disabled={cancelMutation.isPending}
                  data-testid="seat-cancel"
                >
                  End seats on {fmtDate(sub.periodEnd)}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Confirmation ─────────────────────────────────────────────────── */}
      {/* M52 — the highest-stakes screen in the product. It must answer, without
          the customer doing any arithmetic: what am I paying today, how many
          seats do I get, when am I charged again, how much, will it happen by
          itself, and what if the payment fails. Nothing here exposes a
          proration fraction, a "remainder of period" calculation, or two
          amounts without saying which is which. */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent data-testid="seat-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.preview?.chargeNowMinor > 0 ? "Confirm your seat change" : "Schedule this change"}
            </AlertDialogTitle>
            {/* ── M58 / A11Y-002 (a11y) ──────────────────────────────────────
                The renewal CHOICE — a radiogroup with two options and their
                full consequences — used to live inside this description, which
                is the dialog's `aria-describedby` target. Opening the
                highest-stakes screen in the product therefore read out the
                entire summary, both renewal options and every explanatory
                sentence as one uninterrupted "description" before the customer
                could interact with anything. Individually the radios were fine:
                focusable, correctly announced, native arrow-key navigation. It
                was verbose, not broken — and verbose enough on this screen to
                matter.

                The description is now the one sentence that orients someone;
                the summary and its controls are a sibling in the dialog body,
                reached in ordinary reading order. Markup relocation only:
                identical component, identical props, identical copy, identical
                visual design. */}
            <AlertDialogDescription>
              Check what you're paying and what changes before you confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <SeatChangeSummary
            preview={confirm?.preview}
            renewalMode={data.renewalMode}
            offerAutopay={offerAutopay}
            autopayBlockedOnContact={autopayBlockedOnContact}
            autopayAtCheckout={autopayAtCheckout}
            onAutopayChange={setAutopayAtCheckout}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => checkoutMutation.mutate({
                seats: confirm.seats, term: confirm.term,
                // Only ever sent as a real decision. When we are not offering
                // the choice, the server's own rollout gate decides.
                autopay: offerAutopay ? autopayAtCheckout : undefined,
              })}
              disabled={checkoutMutation.isPending}
              data-testid="seat-confirm-action"
            >
              {checkoutMutation.isPending
                ? "Working…"
                : confirm?.preview?.chargeNowMinor > 0 ? "Pay and add seats" : "Schedule it"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── End seats (M53/UX-1) ─────────────────────────────────────────── */}
      {/* The only destructive action on this page. It states what the customer
          KEEPS first, then what they lose and when, then that it is reversible —
          in that order, because the fear this dialog has to answer is "have I
          just deleted my team?". */}
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent data-testid="seat-cancel-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>End your seats on {fmtDate(sub?.periodEnd)}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p>
                  Your team keeps all {sub?.seats} seat{sub?.seats === 1 ? "" : "s"} until{" "}
                  <span className="font-medium text-foreground">{fmtDate(sub?.periodEnd)}</span>. Nothing
                  changes before then and you are not charged again.
                </p>
                <p>
                  From that date this workspace returns to its included allowance, and any members beyond
                  it are deactivated — most recently added first.{" "}
                  <span className="font-medium text-foreground">Nobody is deleted</span>, and your credits
                  are never affected.
                </p>
                <p className="text-xs text-muted-foreground">
                  You can undo this any time before {fmtDate(sub?.periodEnd)} with “Keep these seats”.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="seat-cancel-dismiss">Keep my seats</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="seat-cancel-action"
            >
              {cancelMutation.isPending ? "Working…" : "End seats"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
