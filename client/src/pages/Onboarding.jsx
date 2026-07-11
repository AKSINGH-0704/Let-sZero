import { useState } from "react";
import { Redirect, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { invalidateAfter } from "@/lib/queryInvalidation";
import { normalizeDomain, validateFromEmail } from "@shared/domainUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Globe, Loader2 } from "lucide-react";

// First-run activation: a single capture step (sender name if missing + domain +
// from email) that routes straight into the canonical guided verification at
// /app/domains/:id. No separate summary screen, no second DNS rendering — the
// detail page owns verification (M19 IA). "Explore first" = Preview Mode escape.
export default function Onboarding() {
  const { user, isRootAdmin, refetch } = useAuth();
  const [, navigate] = useLocation();
  const [senderName, setSenderName] = useState("");
  const [domain, setDomain] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  // Field-level errors, reusing the exact same pure validators the server
  // enforces (shared/domainUtils.js) — catches format mistakes before the
  // round-trip, attributed to the specific field, not a page-level banner.
  const [fieldErrors, setFieldErrors] = useState({});

  const needsSenderName = !!user && !user.senderName?.trim();

  const { data: config } = useQuery({
    queryKey: ["/api/platform-config"],
    enabled: !!user,
    staleTime: 60_000,
  });
  const customLimit = config?.warmup?.customDomainDailyLimit ?? 200;
  const durationDays = config?.warmup?.durationDays ?? 30;

  const mutation = useMutation({
    mutationFn: async () => {
      // Sender name first (cheap, idempotent); PUT /api/profile is partial-safe.
      if (needsSenderName && senderName.trim()) {
        await apiRequest("PUT", "/api/profile", { senderName: senderName.trim() });
      }
      return apiRequest("POST", "/api/domains", {
        domain: domain.trim(),
        fromEmail: fromEmail.trim(),
      }).then(r => r.json());
    },
    onSuccess: (data) => {
      if (!data.id) {
        setError(data.message || "Failed to add domain");
        return;
      }
      setSubmitted(true); // suppress the redirect guard while we navigate
      invalidateAfter("domainIdentityChanged");
      refetch();
      navigate(`/app/domains/${data.id}`);
    },
    onError: (err) => {
      setError(err.message || "Failed to add domain");
    },
  });

  // Users who already activated (or admins, who have no sending identity of their own)
  // skip onboarding entirely.
  if (!submitted && user && (user.sendingIdentityType || isRootAdmin || user.isSecondaryRoot)) {
    return <Redirect to="/app/dashboard" />;
  }

  const handleDomainChange = (val) => {
    setDomain(val);
    setError("");
    // Clears fromEmail's error too, not just domain's — this function also
    // rewrites fromEmail's value below (re-deriving it against the new
    // domain), which typically resolves a "must use domain @X" mismatch. A
    // stale fromEmail error sitting on screen after its underlying value
    // just silently changed would violate "disappear immediately after
    // correction" — found during a dedicated validation-UX review pass.
    setFieldErrors(prev => ({ ...prev, domain: undefined, fromEmail: undefined }));
    if (val && !fromEmail) {
      setFromEmail(`hello@${val}`);
    } else if (fromEmail && val) {
      const atIdx = fromEmail.indexOf("@");
      const localPart = atIdx >= 0 ? fromEmail.slice(0, atIdx) : fromEmail;
      setFromEmail(`${localPart}@${val}`);
    }
  };

  const handleFromEmailChange = (val) => {
    setFromEmail(val);
    setError("");
    setFieldErrors(prev => ({ ...prev, fromEmail: undefined }));
  };

  const handleSenderNameChange = (val) => {
    setSenderName(val);
    setError("");
    setFieldErrors(prev => ({ ...prev, senderName: undefined }));
  };

  const canSubmit = !mutation.isPending
    && !!domain.trim()
    && !!fromEmail.trim()
    && (!needsSenderName || !!senderName.trim());

  const handleSubmit = () => {
    const errors = {};
    if (needsSenderName && !senderName.trim()) errors.senderName = "Your name is required.";
    let normalizedDomain;
    try {
      normalizedDomain = normalizeDomain(domain);
    } catch (err) {
      errors.domain = err.message;
    }
    if (!errors.domain) {
      try {
        validateFromEmail(fromEmail, normalizedDomain);
      } catch (err) {
        errors.fromEmail = err.message;
      }
    }
    setFieldErrors(errors);
    const fieldOrder = { senderName: "ob-sender-name", domain: "ob-domain", fromEmail: "ob-from" };
    const firstInvalid = Object.keys(fieldOrder).find(f => errors[f]);
    if (firstInvalid) {
      document.getElementById(fieldOrder[firstInvalid])?.focus();
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-6">
      <div className="w-full max-w-md space-y-6">
        <p className="text-center text-lg font-bold tracking-tight text-primary">RepMail</p>

        <Card className="border-card-border">
          <CardContent className="space-y-5 p-6 sm:p-8">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Globe className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Connect your sending domain
              </h1>
              <p className="text-sm text-muted-foreground">
                Campaigns send from your own domain, so deliverability and sender
                reputation stay with you.
              </p>
            </div>

            <div className="space-y-4">
              {needsSenderName && (
                <div className="space-y-1.5">
                  <Label htmlFor="ob-sender-name">Your name</Label>
                  <Input
                    id="ob-sender-name"
                    placeholder="e.g. Priya Sharma"
                    value={senderName}
                    autoFocus
                    aria-invalid={!!fieldErrors.senderName}
                    className={fieldErrors.senderName ? "border-destructive focus-visible:ring-destructive" : ""}
                    onChange={e => handleSenderNameChange(e.target.value)}
                  />
                  {fieldErrors.senderName
                    ? <p className="text-xs text-destructive">{fieldErrors.senderName}</p>
                    : <p className="text-xs text-muted-foreground">Shown as the From name in recipients' inboxes.</p>}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="ob-domain">Sending domain</Label>
                <Input
                  id="ob-domain"
                  placeholder="yourcompany.com"
                  value={domain}
                  autoFocus={!needsSenderName}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  aria-invalid={!!fieldErrors.domain}
                  className={fieldErrors.domain ? "border-destructive focus-visible:ring-destructive" : ""}
                  onChange={e => handleDomainChange(e.target.value.trim().toLowerCase())}
                />
                {fieldErrors.domain && <p className="text-xs text-destructive">{fieldErrors.domain}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-from">From email</Label>
                <Input
                  id="ob-from"
                  placeholder={`hello@${domain || "yourcompany.com"}`}
                  value={fromEmail}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  aria-invalid={!!fieldErrors.fromEmail}
                  className={fieldErrors.fromEmail ? "border-destructive focus-visible:ring-destructive" : ""}
                  onChange={e => handleFromEmailChange(e.target.value.trim().toLowerCase())}
                />
                {fieldErrors.fromEmail
                  ? <p className="text-xs text-destructive">{fieldErrors.fromEmail}</p>
                  : <p className="text-xs text-muted-foreground">Recipients see this in the From field.</p>}
              </div>
            </div>

            <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              New domains send up to <span className="font-medium text-foreground">{customLimit} emails/day</span> for
              the first {durationDays} days while your reputation builds. After that, your credit
              balance governs volume — 1 credit = 1 email sent, and credits are only used when a
              campaign actually sends, never for drafting, previewing, or building templates.
            </p>

            {error && (
              <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="space-y-2">
              <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit}>
                {mutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                Add domain
              </Button>
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => navigate("/app/dashboard")}>
                I'll explore RepMail first
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">RepMail · Secure &amp; Private</p>
      </div>
    </div>
  );
}
