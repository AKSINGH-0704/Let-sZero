import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { invalidateAfter } from "@/lib/queryInvalidation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Breadcrumb from "@/components/common/Breadcrumb";
import StatusChip from "@/components/common/StatusChip";
import Stepper from "@/components/common/Stepper";
import DnsRecordRow from "@/components/common/DnsRecordRow";
import DangerZone from "@/components/common/DangerZone";
import Banner from "@/components/common/Banner";
import EmptyState from "@/components/common/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { DOMAIN_CHIP_STATUS } from "@/pages/Domains";
import {
  CheckCircle2, ChevronDown, ChevronUp, Globe, RefreshCw, Send, Plus, Trash2, LifeBuoy, SearchX,
} from "lucide-react";

// Small accessible disclosure for provider tips (educational content stays collapsed).
function Disclosure({ summary, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
        {summary}
      </button>
      {open && <div className="mt-2 rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">{children}</div>}
    </div>
  );
}

export default function DomainDetail() {
  const [, params] = useRoute("/app/domains/:id");
  const id = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  // TRUST-014 (M20-C): domains are workspace-owned; only the workspace admin
  // manages them (server-enforced) — inheriting members get read-only access.
  const canManageDomains = user?.role === "ROOT_ADMIN" || user?.isSecondaryRoot;

  // Campaign round-trip (internal /app/ paths only — open-redirect guard).
  const [initialParams] = useState(() => new URLSearchParams(window.location.search));
  const rawReturnTo = initialParams.get("returnTo");
  const returnTo = rawReturnTo && rawReturnTo.startsWith("/app/") ? rawReturnTo : null;

  // Per-record DNS detection is only known from a manual check (the server's background
  // poller doesn't persist per-record results) — held as session state with a timestamp.
  const [lastCheck, setLastCheck] = useState(null); // { at: Date, records: [{ name, resolved }] }
  const prevStatusRef = useRef(null);
  const [justVerified, setJustVerified] = useState(false);

  const queryKey = ["/api/domains", id];
  const { data: domain, isLoading, isError, refetch } = useQuery({
    queryKey,
    enabled: !!id,
    // Custom fetch so 404/403 render a friendly not-found state instead of a thrown error.
    queryFn: async () => {
      const res = await fetch(`/api/domains/${id}`, { credentials: "include" });
      if (res.status === 404 || res.status === 403) return { __notFound: true };
      if (!res.ok) throw new Error((await res.text()) || res.statusText);
      return res.json();
    },
    // Read-only poll while pending — reflects the server's background verification.
    // The rate-limited POST /check endpoint is only ever called manually (DOM-006: 5/hour).
    refetchInterval: (query) =>
      query.state.data?.status === "PENDING_VERIFICATION" ? 30_000 : false,
  });

  const notFound = domain?.__notFound === true;
  const status = notFound ? null : domain?.status;

  // Detect the pending → verified transition for the one-time celebration / auto-return.
  useEffect(() => {
    if (!status) return;
    if (prevStatusRef.current === "PENDING_VERIFICATION" && status === "VERIFIED") {
      setJustVerified(true);
      invalidateAfter("domainChanged");
      if (returnTo) {
        toast({ title: "Domain verified!", description: "Returning you to your campaign." });
        navigate(returnTo);
      }
    }
    prevStatusRef.current = status;
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manual re-check — the only caller of the rate-limited check endpoint.
  const checkMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/domains/${id}/check`).then(r => r.json()),
    onSuccess: (data) => {
      setLastCheck({ at: new Date(), records: data.dnsResults?.dkimRecords || [] });
      // Merge the check result into the cached record so the status effect sees transitions.
      queryClient.setQueryData(queryKey, (old) => ({ ...(old || {}), ...data }));
      invalidateAfter("domainChanged");
      if (data.status !== "VERIFIED" && data.status !== "FAILED") {
        const recs = data.dnsResults?.dkimRecords || [];
        const found = recs.filter(r => r.resolved).length;
        toast({
          description: recs.length
            ? (found === recs.length
                ? `All ${recs.length} records detected — verification is completing.`
                : `${found} of ${recs.length} records detected. DNS can take a little while to propagate.`)
            : "DNS records not detected yet. If you just added them, try again in a few minutes.",
        });
      }
    },
    onError: (err) => {
      const rateLimited = err.status === 429 || /too many|rate ?limit/i.test(err.message || "");
      toast({
        variant: rateLimited ? "default" : "destructive",
        title: rateLimited ? "Check limit reached" : "Check failed",
        description: rateLimited
          ? "Automatic checks keep running in the background — manual checks are limited to a few per hour."
          : err.message,
      });
    },
  });

  // Delete — used by the danger zone and by the FAILED recovery path.
  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/domains/${id}`).then(r => r.json()),
    onSuccess: (_data, variables) => {
      invalidateAfter("domainChanged");
      if (variables?.reRegister) {
        // FAILED recovery: straight back into a prefilled Add dialog. New registration
        // issues fresh DNS records — the expired ones are gone with the old identity.
        navigate(`/app/domains?add=1&domain=${encodeURIComponent(domain.domain)}`);
      } else {
        toast({ description: "Domain removed" });
        navigate("/app/domains");
      }
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Delete failed", description: err.message });
    },
  });

  // Per-record chip state: only known after a manual check this session.
  const recordChip = (name) => {
    if (checkMutation.isPending) return { status: "checking", label: "Checking" };
    const rec = lastCheck?.records?.find(r => r.name === name);
    if (!rec) return null;
    return rec.resolved
      ? { status: "verified", label: "Detected" }
      : { status: "pending", label: "Not detected" };
  };

  const detectedCount = lastCheck?.records?.filter(r => r.resolved).length ?? null;
  const tokenCount = Array.isArray(domain?.dkimTokens) ? domain.dkimTokens.length : 0;

  // Verification-window countdown (PENDING only).
  const daysLeft = domain?.createdAt && domain?.verificationWindowDays != null
    ? Math.max(0, domain.verificationWindowDays - Math.floor((Date.now() - new Date(domain.createdAt).getTime()) / 86_400_000))
    : null;

  // Warm-up one-liner on the verified state (own account only — root admins can view
  // other users' domains, but sender-health is always the caller's own report).
  const ownDomain = !!domain && !notFound && domain.userId === user?.id;
  const { data: health } = useQuery({
    queryKey: ["/api/sender-health"],
    enabled: ownDomain && status === "VERIFIED",
    staleTime: 30_000,
  });
  const warmup = health?.policy?.warmup;

  const removeDialog = (triggerLabel, reRegister = false) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {reRegister ? (
          <Button variant="destructive" size="sm" disabled={deleteMutation.isPending}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {triggerLabel}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {triggerLabel}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {domain?.domain}?</AlertDialogTitle>
          <AlertDialogDescription>
            {reRegister
              ? "This removes the expired registration and its SES identity, then starts a fresh one. Re-registering issues new DNS records to add."
              : "This removes the domain from RepMail and deletes its Amazon SES identity. Campaigns already sent keep their history. This cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate({ reRegister })}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {reRegister ? "Remove & re-register" : "Remove domain"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <Breadcrumb items={[{ label: "Domains", href: "/app/domains" }, { label: notFound ? "Not found" : (domain?.domain || "…") }]} />

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-6 w-80" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        ) : isError ? (
          <Card className="border-card-border">
            <CardContent className="flex flex-col items-center gap-3 px-6 py-8 text-center">
              <p className="text-sm font-medium text-foreground">We couldn't load this domain.</p>
              <p className="text-xs text-muted-foreground">This is usually temporary.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : notFound ? (
          <EmptyState
            icon={SearchX}
            title="Domain not found"
            description="It may have been removed, or the link is out of date."
            action={
              <Button asChild variant="outline">
                <Link href="/app/domains">Back to Domains</Link>
              </Button>
            }
          />
        ) : (
          <>
            {/* Entity header */}
            <div className="flex flex-wrap items-center gap-3">
              <Globe className="h-6 w-6 text-primary" aria-hidden="true" />
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{domain.domain}</h1>
              <StatusChip status={DOMAIN_CHIP_STATUS[status] || "neutral"} />
            </div>
            <p className="-mt-4 text-sm text-muted-foreground">Sending as {domain.fromEmail}</p>

            {returnTo && status !== "PENDING_VERIFICATION" && (
              <Banner
                variant={status === "VERIFIED" ? "success" : "info"}
                action={
                  <Button variant="outline" size="sm" onClick={() => navigate(returnTo)}>
                    Back to campaign
                  </Button>
                }
              >
                {status === "VERIFIED"
                  ? "This domain is verified — you can pick up your campaign where you left off."
                  : "Head back to your campaign at any time."}
              </Banner>
            )}

            {/* ── PENDING: guided verification ─────────────────────────────── */}
            {status === "PENDING_VERIFICATION" && (
              <>
                <Stepper
                  steps={[
                    { label: "Registered", state: "done" },
                    { label: "Add DNS records", state: "active" },
                    { label: "Verified", state: "todo" },
                  ]}
                />

                <section aria-label="DNS records" className="space-y-3">
                  <h2 className="text-base font-medium text-foreground">
                    Add {tokenCount === 1 ? "this CNAME record" : `these ${tokenCount} CNAME records`} at your DNS provider
                  </h2>
                  <div className="space-y-2">
                    {(domain.dkimTokens || []).map((rec, i) => {
                      const chip = recordChip(rec.name);
                      return (
                        <DnsRecordRow
                          key={rec.name || i}
                          record={rec}
                          status={chip?.status}
                          statusLabel={chip?.label}
                        />
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground" aria-live="polite">
                      {lastCheck
                        ? <>
                            <span className="font-medium text-foreground">{detectedCount} of {tokenCount} detected</span>
                            {" · last checked "}{lastCheck.at.toLocaleTimeString()}
                          </>
                        : "We verify automatically in the background — this page updates on its own."}
                    </p>
                    {canManageDomains && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => checkMutation.mutate()}
                        disabled={checkMutation.isPending}
                      >
                        <RefreshCw
                          className={`mr-1.5 h-3.5 w-3.5 ${checkMutation.isPending ? "animate-spin motion-reduce:animate-none" : ""}`}
                          aria-hidden="true"
                        />
                        {checkMutation.isPending ? "Checking…" : "Check now"}
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Most domains verify within an hour; some providers take up to 48 hours.
                    {daysLeft != null && (
                      <span className={daysLeft <= 3 ? " text-warning font-medium" : ""}>
                        {" "}{daysLeft} day{daysLeft === 1 ? "" : "s"} left in the verification window.
                      </span>
                    )}
                    {" "}Stuck?{" "}
                    <a href="mailto:support@letszero.in?subject=DNS%20verification%20help" className="underline underline-offset-2 hover:text-foreground">
                      Contact support
                    </a>
                    .
                  </p>

                  <Disclosure summary="Using Cloudflare, GoDaddy or Route 53?">
                    <ul className="space-y-1.5">
                      <li><span className="font-medium text-foreground">Cloudflare:</span> enter only the subdomain part (e.g. <code className="font-mono">xxxx._domainkey</code>) — Cloudflare appends your domain automatically. Set the record to "DNS only" (grey cloud).</li>
                      <li><span className="font-medium text-foreground">GoDaddy / Route 53 / others:</span> some providers want the full record name, others just the subdomain — paste the full name first; if it saves as <code className="font-mono">…{domain.domain}.{domain.domain}</code>, switch to the subdomain-only form.</li>
                      <li>Values must match exactly — no trailing dots or extra spaces.</li>
                    </ul>
                  </Disclosure>
                </section>
              </>
            )}

            {/* ── VERIFIED ──────────────────────────────────────────────────── */}
            {status === "VERIFIED" && (
              justVerified && !returnTo ? (
                <Card className="border-success/25 bg-success/5">
                  <CardContent className="flex flex-col items-start gap-3 p-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
                      <p className="text-base font-semibold text-foreground">{domain.domain} is verified</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You're ready to send from {domain.fromEmail}.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button asChild>
                        <Link href="/app/campaigns/new">
                          <Send className="mr-1.5 h-4 w-4" aria-hidden="true" />
                          Create your first campaign
                        </Link>
                      </Button>
                      <Button asChild variant="outline">
                        <Link href="/app/domains?add=1">
                          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                          Add another domain
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-card-border">
                  <CardContent className="space-y-2 p-5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                      <p className="text-sm font-medium text-foreground">
                        Verified{domain.verifiedAt ? ` on ${new Date(domain.verifiedAt).toLocaleDateString()}` : ""} · sending as {domain.fromEmail}
                      </p>
                    </div>
                    {warmup?.active && (
                      <p className="text-xs text-muted-foreground">
                        Sender warm-up: {warmup.remainingToday ?? 0} of {warmup.dailyLimit} sends left today
                        {warmup.daysRemaining != null && (
                          <>
                            {" "}· {warmup.daysRemaining}d remaining
                            {/* UX-012: a day count alone doesn't answer "when will I be
                                ready" — project it forward into a concrete date, computed
                                from daysRemaining (already returned by /api/sender-health)
                                rather than needing a new activatedAt field. */}
                            {" "}(ready ~{new Date(Date.now() + warmup.daysRemaining * 86_400_000).toLocaleDateString(undefined, { month: "short", day: "numeric" })})
                          </>
                        )}
                        . After warm-up, volume is governed by your credits.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            )}

            {/* ── FAILED: recovery-forward ─────────────────────────────────── */}
            {status === "FAILED" && (
              <Banner variant="danger" action={canManageDomains ? removeDialog("Delete & re-register", true) : undefined}>
                <p className="font-medium">Verification didn't complete in time.</p>
                <p className="mt-0.5 text-muted-foreground">
                  {canManageDomains
                    ? `DNS records weren't detected within ${domain.verificationWindowDays} days, so this registration expired. Re-register to start fresh — you'll get new records to add.`
                    : "This domain's verification expired. Ask your workspace admin to re-register it."}
                </p>
              </Banner>
            )}

            {/* ── SUSPENDED ─────────────────────────────────────────────────── */}
            {status === "SUSPENDED" && (
              <Banner
                variant="warning"
                action={
                  <Button asChild variant="outline" size="sm">
                    <a href="mailto:support@letszero.in?subject=Suspended%20domain">
                      <LifeBuoy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      Contact support
                    </a>
                  </Button>
                }
              >
                <p className="font-medium">Sending from this domain is paused.</p>
                <p className="mt-0.5 text-muted-foreground">
                  Our team suspended this domain. Contact support to review and restore it.
                </p>
              </Banner>
            )}

            {/* Danger zone (FAILED already offers deletion via recovery) — admin-only */}
            {status !== "FAILED" && canManageDomains && (
              <DangerZone
                title="Remove domain"
                description="Deletes the domain and its SES identity. This cannot be undone."
                action={removeDialog("Remove…")}
              />
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
