import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Globe, Plus, RefreshCw, Trash2, Copy, CheckCircle2, Clock, XCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "@/lib/utils";

const STATUS_CONFIG = {
  VERIFIED: {
    label: "Verified",
    color: "bg-green-500/10 text-green-400 border-green-500/20",
    icon: CheckCircle2,
  },
  PENDING_VERIFICATION: {
    label: "Pending",
    color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    icon: Clock,
  },
  FAILED: {
    label: "Failed",
    color: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: XCircle,
  },
  SUSPENDED: {
    label: "Suspended",
    color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    icon: AlertTriangle,
  },
};

function DnsRecord({ record, type }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(null);

  const copy = (field, value) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(field);
      toast({ description: "Copied to clipboard" });
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2 text-xs font-mono">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground w-10 shrink-0">{type || record.type}</span>
        <span className="flex-1 truncate text-foreground">{record.name}</span>
        <button onClick={() => copy("name", record.name)} className="shrink-0 text-muted-foreground hover:text-foreground">
          {copied === "name" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground w-10 shrink-0">→</span>
        <span className="flex-1 truncate text-foreground">{record.value}</span>
        <button onClick={() => copy("value", record.value)} className="shrink-0 text-muted-foreground hover:text-foreground">
          {copied === "value" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

function DomainCard({ domain, onCheck, onDelete, isChecking, isDeleting }) {
  const [showDns, setShowDns] = useState(domain.status === "PENDING_VERIFICATION");
  const cfg = STATUS_CONFIG[domain.status] || STATUS_CONFIG.PENDING_VERIFICATION;
  const Icon = cfg.icon;

  return (
    <Card className="border-card-border">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Globe className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-sm truncate">{domain.domain}</span>
              <Badge variant="outline" className={`text-xs px-1.5 py-0 ${cfg.color}`}>
                <Icon className="h-3 w-3 mr-1" />
                {cfg.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground pl-6">Sending as: {domain.fromEmail}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {domain.status === "PENDING_VERIFICATION" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCheck(domain.id)}
                disabled={isChecking}
              >
                {isChecking ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                <span className="ml-1.5 hidden sm:inline">Check Now</span>
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" disabled={isDeleting}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove {domain.domain}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the domain from RepMail and deletes the SES identity. Existing campaigns using this domain will continue to show the original sender address in history. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(domain.id)} className="bg-destructive hover:bg-destructive/90">
                    Remove Domain
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {domain.status === "VERIFIED" && (
          <p className="text-xs text-muted-foreground">
            Verified {domain.verifiedAt ? formatDate(domain.verifiedAt) : ""}
          </p>
        )}

        {(domain.status === "PENDING_VERIFICATION" || domain.status === "FAILED") && (
          <div>
            <button
              onClick={() => setShowDns(v => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {showDns ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showDns ? "Hide" : "Show"} DNS records to add
            </button>

            {showDns && (
              <div className="mt-3 space-y-3">
                {domain.status === "FAILED" && (
                  <p className="text-xs text-red-400">
                    Verification expired after {domain.verificationWindowDays} days. Delete this domain and re-register to restart the verification process.
                  </p>
                )}
                {domain.status === "PENDING_VERIFICATION" && (
                  <p className="text-xs text-muted-foreground">
                    Add all DNS records below in your DNS provider, then click "Check Now". DKIM records may take up to 48 hours to propagate.
                  </p>
                )}

                {/* DKIM CNAME records */}
                {Array.isArray(domain.dkimTokens) && domain.dkimTokens.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">DKIM Records (3 CNAMEs)</p>
                    {domain.dkimTokens.map((rec, i) => (
                      <DnsRecord key={i} record={rec} type="CNAME" />
                    ))}
                  </div>
                )}

                {/* Ownership TXT record */}
                {domain.verifyRecord && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ownership Record (TXT)</p>
                    <DnsRecord record={domain.verifyRecord} type="TXT" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddDomainForm({ onSuccess, onCancel }) {
  const [domain, setDomain] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/domains", { domain, fromEmail }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.message && !data.id) {
        toast({ variant: "destructive", title: "Error", description: data.message });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      toast({ title: "Domain registered", description: `${domain} is pending verification. Add the DNS records shown below.` });
      onSuccess();
    },
    onError: (err) => {
      let msg = err.message;
      try { msg = JSON.parse(err.message).message || msg; } catch {}
      toast({ variant: "destructive", title: "Failed to register domain", description: msg });
    },
  });

  const handleDomainChange = (val) => {
    setDomain(val);
    // Auto-fill from email with the local part already typed (or suggest hello@domain)
    if (val && !fromEmail) {
      setFromEmail(`hello@${val}`);
    } else if (fromEmail) {
      const atIdx = fromEmail.indexOf("@");
      const localPart = atIdx >= 0 ? fromEmail.slice(0, atIdx) : fromEmail;
      setFromEmail(`${localPart}@${val}`);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Add Custom Sending Domain</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="domain-input">Domain</Label>
          <Input
            id="domain-input"
            placeholder="acme.com"
            value={domain}
            onChange={e => handleDomainChange(e.target.value.trim().toLowerCase())}
          />
          <p className="text-xs text-muted-foreground">Enter the domain you want to send from (e.g. acme.com)</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="from-email-input">From Email Address</Label>
          <Input
            id="from-email-input"
            placeholder="hello@acme.com"
            value={fromEmail}
            onChange={e => setFromEmail(e.target.value.trim().toLowerCase())}
          />
          <p className="text-xs text-muted-foreground">The address your recipients will see. Must use the domain above.</p>
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !domain || !fromEmail}
          >
            {mutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
            Register Domain
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Domains() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [checkingId, setCheckingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const DOMAIN_ELIGIBLE_PLANS = ["starter", "growth", "scale", "enterprise"];
  const isEligible = DOMAIN_ELIGIBLE_PLANS.includes(user?.plan?.toLowerCase());

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ["/api/domains"],
    queryFn: () => apiRequest("GET", "/api/domains").then(r => r.json()),
    enabled: isEligible,
  });

  const checkMutation = useMutation({
    mutationFn: (id) => apiRequest("POST", `/api/domains/${id}/check`).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      if (data.status === "VERIFIED") {
        toast({ title: "Domain verified!", description: `${data.domain} is now verified and ready to use.` });
      } else if (data.status === "FAILED") {
        toast({ variant: "destructive", title: "Verification failed", description: "The verification window has expired. Delete and re-register to try again." });
      } else {
        toast({ description: "DNS records not yet detected. Try again in a few hours." });
      }
      setCheckingId(null);
    },
    onError: (err) => {
      let msg = err.message;
      try { msg = JSON.parse(err.message).message || msg; } catch {}
      toast({ variant: "destructive", title: "Check failed", description: msg });
      setCheckingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest("DELETE", `/api/domains/${id}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      toast({ description: "Domain removed" });
      setDeletingId(null);
    },
    onError: (err) => {
      let msg = err.message;
      try { msg = JSON.parse(err.message).message || msg; } catch {}
      toast({ variant: "destructive", title: "Delete failed", description: msg });
      setDeletingId(null);
    },
  });

  const handleCheck = (id) => {
    setCheckingId(id);
    checkMutation.mutate(id);
  };

  const handleDelete = (id) => {
    setDeletingId(id);
    deleteMutation.mutate(id);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              Custom Sending Domains
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Send campaigns from your own domain instead of the RepMail shared address.
            </p>
          </div>
          {isEligible && !adding && (
            <Button onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Domain
            </Button>
          )}
        </div>

        {!isEligible && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="pt-4">
              <p className="text-sm text-amber-400">
                Custom sending domains are available on the <strong>Starter plan</strong> and above.{" "}
                <a href="/app/payments" className="underline">Upgrade your plan</a> to use this feature.
              </p>
            </CardContent>
          </Card>
        )}

        {adding && (
          <AddDomainForm
            onSuccess={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        )}

        {isEligible && (
          <>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : domains.length === 0 && !adding ? (
              <Card className="border-dashed border-card-border">
                <CardContent className="pt-8 pb-8 text-center">
                  <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No custom domains yet. Add your first domain to send from your own address.
                  </p>
                  <Button className="mt-4" onClick={() => setAdding(true)}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Domain
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {domains.map(domain => (
                  <DomainCard
                    key={domain.id}
                    domain={domain}
                    onCheck={handleCheck}
                    onDelete={handleDelete}
                    isChecking={checkingId === domain.id}
                    isDeleting={deletingId === domain.id}
                  />
                ))}
              </div>
            )}

            {domains.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">How custom domains work</p>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li>• Add your domain and copy the DNS records into your DNS provider (Cloudflare, Route 53, etc.)</li>
                  <li>• SES automatically signs outbound emails with DKIM — no manual key management needed</li>
                  <li>• Verification typically takes a few minutes but may take up to 48 hours for DNS propagation</li>
                  <li>• Once verified, select this domain when creating a new campaign</li>
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
