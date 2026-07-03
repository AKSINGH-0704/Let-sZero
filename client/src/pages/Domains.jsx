import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DOMAIN_ELIGIBLE_PLANS } from "@shared/schema";
import AppLayout from "@/components/layout/AppLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PageHeader from "@/components/common/PageHeader";
import SectionLabel from "@/components/common/SectionLabel";
import StatusChip from "@/components/common/StatusChip";
import EmptyState from "@/components/common/EmptyState";
import Banner from "@/components/common/Banner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  Globe, Plus, ChevronRight, ChevronDown, ChevronUp, RefreshCw, UserRound, AlertCircle,
} from "lucide-react";

// Maps sender_domains.status → StatusChip status.
export const DOMAIN_CHIP_STATUS = {
  VERIFIED: "verified",
  PENDING_VERIFICATION: "pending",
  FAILED: "failed",
  SUSPENDED: "suspended",
};

// ── Add Domain — lightweight capture; the guided work happens on the detail page ──
function AddDomainDialog({ open, onOpenChange, initialDomain = "", returnTo }) {
  const [domain, setDomain] = useState(initialDomain);
  const [fromEmail, setFromEmail] = useState(initialDomain ? `hello@${initialDomain}` : "");
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  const { refetch } = useAuth();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/domains", { domain, fromEmail }).then(r => r.json()),
    onSuccess: (data) => {
      if (!data.id) {
        setError(data.message || "Failed to register domain");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      // Registration is the workspace-activation event — sendingIdentityType may change.
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sender-health"] });
      refetch();
      toast({ title: "Domain added", description: `${data.domain} is registered — add the DNS records to verify.` });
      onOpenChange(false);
      navigate(`/app/domains/${data.id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`);
    },
    onError: (err) => {
      let msg = err.message;
      try { msg = JSON.parse(err.message).message || msg; } catch {}
      setError(msg);
    },
  });

  // Auto-suggest the from address from the domain, preserving a typed local part.
  const handleDomainChange = (val) => {
    setDomain(val);
    setError("");
    if (val && !fromEmail) {
      setFromEmail(`hello@${val}`);
    } else if (fromEmail && val) {
      const atIdx = fromEmail.indexOf("@");
      const localPart = atIdx >= 0 ? fromEmail.slice(0, atIdx) : fromEmail;
      setFromEmail(`${localPart}@${val}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a sending domain</DialogTitle>
          <DialogDescription>
            We'll give you 3 DNS records to add — verification is automatic once they're in place.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="add-domain-input">Domain</Label>
            <Input
              id="add-domain-input"
              placeholder="yourcompany.com"
              value={domain}
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={e => handleDomainChange(e.target.value.trim().toLowerCase())}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-from-input">From email</Label>
            <Input
              id="add-from-input"
              placeholder={`hello@${domain || "yourcompany.com"}`}
              value={fromEmail}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={e => { setFromEmail(e.target.value.trim().toLowerCase()); setError(""); }}
            />
            <p className="text-xs text-muted-foreground">Recipients see this in the From field. Must use the domain above.</p>
          </div>
          {error && (
            <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !domain || !fromEmail}
          >
            {mutation.isPending && <RefreshCw className="mr-1.5 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            Add domain
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Sender identity — the From display name, managed alongside domains (design: this
// page is the sending-identity home; Profile stays account-only from Phase E). ──
function SenderIdentityCard() {
  const { user, refetch } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  // Warn (non-blocking) when clearing the sender name while campaigns are active —
  // senderName is read at send time, so queued sends would fall back to the platform name.
  const { data: campaigns } = useQuery({
    queryKey: ["/api/campaigns"],
    enabled: open,
  });
  const hasActiveCampaigns = Array.isArray(campaigns)
    && campaigns.some(c => ["RUNNING", "PENDING", "PAUSED"].includes(c.status));
  const clearingWithActive = open && hasActiveCampaigns && !name.trim() && !!user?.senderName;

  const mutation = useMutation({
    // PUT /api/profile is partial-safe: undefined fields are left untouched.
    mutationFn: () => apiRequest("PUT", "/api/profile", { senderName: name }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sender-health"] });
      refetch();
      toast({ description: "Sender name updated" });
      setOpen(false);
    },
    onError: (err) => {
      let msg = err.message;
      try { msg = JSON.parse(err.message).message || msg; } catch {}
      toast({ variant: "destructive", title: "Update failed", description: msg });
    },
  });

  const openDialog = () => { setName(user?.senderName || ""); setOpen(true); };

  return (
    <section aria-label="Sender identity">
      <SectionLabel className="mb-2">Sender identity</SectionLabel>
      <Card className="border-card-border">
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.senderName?.trim() || <span className="text-muted-foreground font-normal">Not set</span>}
              </p>
              <p className="text-xs text-muted-foreground">From name — shown in recipients' inboxes</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={openDialog}>Edit</Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sender name</DialogTitle>
            <DialogDescription>
              The display name recipients see next to your from address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="sender-name-input">From name</Label>
              <Input
                id="sender-name-input"
                placeholder="e.g. Priya from Acme"
                value={name}
                autoFocus
                onChange={e => setName(e.target.value)}
              />
            </div>
            {clearingWithActive && (
              <Banner variant="warning">
                You have campaigns queued or running. Clearing your sender name means those
                sends fall back to the platform name.
              </Banner>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending && <RefreshCw className="mr-1.5 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ── One domain row — the whole row links to the detail page ──
function DomainRow({ domain, returnTo }) {
  const chip = DOMAIN_CHIP_STATUS[domain.status] || "neutral";
  const href = `/app/domains/${domain.id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Globe className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium text-foreground">{domain.domain}</p>
          <p className="truncate text-xs text-muted-foreground">Sending as {domain.fromEmail}</p>
        </div>
        <StatusChip status={chip} />
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  );
}

// Collapsible educational content — actions stay dominant, docs stay tucked away.
function HowItWorks() {
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
        How custom domains work
      </button>
      {open && (
        <ul className="mt-3 space-y-1.5 rounded-lg border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
          <li>• Add your domain and copy the DNS records into your DNS provider (Cloudflare, Route 53, GoDaddy…)</li>
          <li>• Outbound email is DKIM-signed automatically — no key management needed</li>
          <li>• Verification usually completes within minutes; DNS propagation can take up to 48 hours</li>
          <li>• Once verified, choose the domain when creating a campaign</li>
        </ul>
      )}
    </div>
  );
}

export default function Domains() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Query params (read once): ?returnTo= (campaign round-trip, internal paths only —
  // open-redirect guard) and ?add=1&domain= (re-register flow from a FAILED domain).
  const [initialParams] = useState(() => new URLSearchParams(window.location.search));
  const rawReturnTo = initialParams.get("returnTo");
  const returnTo = rawReturnTo && rawReturnTo.startsWith("/app/") ? rawReturnTo : null;
  const [adding, setAdding] = useState(initialParams.get("add") === "1");
  const initialDomain = initialParams.get("domain") || "";

  const isEligible = DOMAIN_ELIGIBLE_PLANS.includes(user?.plan?.toLowerCase());

  const { data: domains = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/domains"],
    queryFn: () => apiRequest("GET", "/api/domains").then(r => r.json()),
    enabled: isEligible,
    // React Query v5: the callback receives the Query object — read state.data (M16-E fix).
    refetchInterval: (query) =>
      query.state.data?.some(d => d.status === "PENDING_VERIFICATION") ? 30_000 : false,
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        {returnTo && (
          <Banner
            variant="info"
            action={
              <Button variant="outline" size="sm" onClick={() => navigate(returnTo)}>
                Back to campaign
              </Button>
            }
          >
            Verify a domain to continue — you'll return to your campaign automatically once
            it's verified.
          </Banner>
        )}

        <PageHeader
          title="Domains"
          description="Send from your own domain so deliverability and reputation stay yours."
          icon={Globe}
          actions={
            isEligible && (
              <Button onClick={() => setAdding(true)}>
                <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Add domain
              </Button>
            )
          }
        />

        {!isEligible && (
          <Banner
            variant="warning"
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/app/payments">See plans</Link>
              </Button>
            }
          >
            Custom sending domains are available on the Starter plan and above.
          </Banner>
        )}

        {isEligible && <SenderIdentityCard />}

        {isEligible && (
          <section aria-label="Domains">
            <SectionLabel className="mb-2">Domains</SectionLabel>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-[72px] w-full rounded-lg" />)}
              </div>
            ) : isError ? (
              <Card className="border-card-border">
                <CardContent className="flex flex-col items-center gap-3 px-6 py-8 text-center">
                  <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-foreground">We couldn't load your domains.</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">This is usually temporary.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : domains.length === 0 ? (
              <EmptyState
                icon={Globe}
                title="Send from your own domain"
                description="Add a domain and we'll verify it automatically — usually within minutes. You'll send from an address your recipients trust."
                action={
                  <Button onClick={() => setAdding(true)}>
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Add your first domain
                  </Button>
                }
              />
            ) : (
              <Card className="border-card-border overflow-hidden">
                <ul className="divide-y divide-border">
                  {domains.map(domain => (
                    <DomainRow key={domain.id} domain={domain} returnTo={returnTo} />
                  ))}
                </ul>
              </Card>
            )}
          </section>
        )}

        {isEligible && !isLoading && <HowItWorks />}
      </div>

      <AddDomainDialog
        // Remount per open so a re-register prefill or stale input never leaks between uses.
        key={adding ? `open-${initialDomain}` : "closed"}
        open={adding}
        onOpenChange={setAdding}
        initialDomain={initialDomain}
        returnTo={returnTo}
      />
    </AppLayout>
  );
}
