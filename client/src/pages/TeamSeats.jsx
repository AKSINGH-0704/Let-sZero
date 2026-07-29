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
import { AlertTriangle, ArrowLeft, CalendarClock, Info, Users } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import SeatCalculator from "@/components/pricing/SeatCalculator";
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
import { formatMinor, SEAT_TERMS } from "@shared/seatPricing";

const SEATS_KEY = ["/api/seats/subscription"];

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function TeamSeats() {
  const { isWorkspaceOwner } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(null); // { preview, seats, term }

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: SEATS_KEY });

  const previewMutation = useMutation({
    mutationFn: async ({ seats, term }) => {
      const res = await apiRequest("POST", "/api/seats/preview", { seats, term });
      return res.json();
    },
    onError: (e) => toast({ title: "Couldn't price that change", description: e.message, variant: "destructive" }),
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ seats, term }) => {
      const res = await apiRequest("POST", "/api/seats/checkout", { seats, term });
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

  const cancelMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/seats/cancel", {})).json(),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: SEATS_KEY });
      toast({ title: "Auto-renewal turned off", description: `Your seats stay active until ${fmtDate(r.seatsUntil)}.` });
    },
    onError: (e) => toast({ title: "Couldn't cancel", description: e.message, variant: "destructive" }),
  });

  const resumeMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/seats/resume", {})).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SEATS_KEY });
      toast({ title: "Auto-renewal is back on" });
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
              <p className="mt-2 text-sm text-muted-foreground">
                {sub.cancelAtPeriodEnd ? "Ends" : "Renews"} {fmtDate(sub.periodEnd)}
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
              {isWorkspaceOwner && (
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
      {sub && renewal && !sub.cancelAtPeriodEnd && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-border p-5 text-sm" data-testid="seat-renewal">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-muted-foreground">
            Next charge <span className="font-medium text-foreground">{formatMinor(renewal.totalMinor, sub.currency)}</span>{" "}
            on {fmtDate(renewal.at)} for {renewal.seats} seat{renewal.seats === 1 ? "" : "s"}.
          </p>
        </div>
      )}

      {/* ── Change seats ─────────────────────────────────────────────────── */}
      {!billingEnabled ? (
        <div className="mt-6 rounded-xl border border-border p-6 text-sm text-muted-foreground" data-testid="seat-billing-off">
          Seat purchasing isn't available on your workspace yet. Your current allowance of{" "}
          {entitlement.unlimited ? "unlimited" : entitlement.seats} seats continues to apply.
        </div>
      ) : !isWorkspaceOwner ? (
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
              {sub.cancelAtPeriodEnd ? (
                <Button variant="outline" onClick={() => resumeMutation.mutate()} disabled={resumeMutation.isPending} data-testid="seat-resume">
                  Turn auto-renewal back on
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending} data-testid="seat-cancel">
                  Turn off auto-renewal
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Confirmation ─────────────────────────────────────────────────── */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent data-testid="seat-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.preview?.chargeNowMinor > 0 ? "Confirm your seat change" : "Schedule this change"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                {confirm?.preview?.chargeNowMinor > 0 ? (
                  <>
                    <p>
                      You'll be charged{" "}
                      <span className="font-medium text-foreground">
                        {formatMinor(confirm.preview.chargeNowMinor, confirm.preview.currency)}
                      </span>{" "}
                      now for the rest of this billing period, and your new seats are available immediately.
                    </p>
                    {confirm.preview.renewal?.totalMinor != null && (
                      <p>
                        From {fmtDate(confirm.preview.renewal.at)} you'll pay{" "}
                        {formatMinor(confirm.preview.renewal.totalMinor, confirm.preview.currency)} per period for{" "}
                        {confirm.preview.renewal.seats} seats.
                      </p>
                    )}
                  </>
                ) : (
                  <p>
                    Nothing is charged now and nothing changes today — you keep all{" "}
                    {confirm?.preview?.effectiveSeats} seats until {fmtDate(confirm?.preview?.scheduled?.at)}. From then
                    you'll be on {confirm?.preview?.scheduled?.seats} seats
                    {confirm?.preview?.renewal?.totalMinor != null
                      ? ` at ${formatMinor(confirm.preview.renewal.totalMinor, confirm.preview.currency)}`
                      : ""}
                    .
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => checkoutMutation.mutate({ seats: confirm.seats, term: confirm.term })}
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
    </AppLayout>
  );
}
