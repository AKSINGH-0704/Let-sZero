import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import {
  User,
  Mail,
  Shield,
  Coins,
  Calendar,
  Zap,
  ArrowRight,
  Pencil,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  Building2,
  ShieldCheck,
  ShieldX,
  Clock,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { formatNumber, formatDate, getInitials, calculateCreditsRemaining } from "@/lib/utils";

// Mirrors PLAN_LIMITS in shared/schema.js — keep in sync when plan features change.
const PROFILE_PLAN_LIMITS = {
  free:       { maxTemplates: 3,        maxActiveCampaigns: 1,        canSchedule: false, label: "Free Plan"   },
  starter:    { maxTemplates: 10,       maxActiveCampaigns: 5,        canSchedule: true,  label: "Starter"     },
  growth:     { maxTemplates: 25,       maxActiveCampaigns: 10,       canSchedule: true,  label: "Growth"      },
  scale:      { maxTemplates: 100,      maxActiveCampaigns: 20,       canSchedule: true,  label: "Scale"       },
  enterprise: { maxTemplates: Infinity, maxActiveCampaigns: Infinity, canSchedule: true,  label: "Enterprise"  },
};

const ROLE_CONFIG = {
  ROOT_ADMIN: { label: "Root Admin", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  SUB_ADMIN: { label: "Sub Admin", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  USER: { label: "User", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" }
};

// ── Sending Identity Type section ────────────────────────────────────────────

function SendingIdentitySection({ user }) {
  const currentType = user.sendingIdentityType;
  const [selectedType, setSelectedType] = useState(currentType || null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  const { data: domainsData } = useQuery({
    queryKey: ["/api/domains"],
    staleTime: 30_000,
  });
  const hasVerifiedDomain = (domainsData || []).some(d => d.status === "VERIFIED");

  const identityMutation = useMutation({
    mutationFn: async ({ sendingIdentityType }) => {
      const res = await apiRequest("POST", "/api/user/sending-identity", { sendingIdentityType });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to save sending identity");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sender-health"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/onboarding-status"] });
      setSaveSuccess(true);
      setSaveError("");
      setAcknowledged(false);
      setTimeout(() => setSaveSuccess(false), 4000);
    },
    onError: (err) => {
      setSaveError(err.message || "Failed to save");
      setSaveSuccess(false);
    },
  });

  const canSavePlatform = selectedType === "platform" && acknowledged;
  const canSaveCustom = selectedType === "custom_domain" && hasVerifiedDomain;
  const canSave = canSavePlatform || canSaveCustom;

  const handleSave = () => {
    if (!canSave) return;
    identityMutation.mutate({ sendingIdentityType: selectedType });
  };

  const isCurrentType = (type) => type === currentType;

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Sending Identity Type
            </CardTitle>
            <CardDescription className="mt-1">
              Choose how your outbound campaigns are authenticated. This is required before you
              can send.
            </CardDescription>
          </div>
          {currentType && (
            <Badge variant="outline" className={
              currentType === "platform"
                ? "border-blue-500/30 text-blue-400 bg-blue-500/10 shrink-0"
                : "border-green-500/30 text-green-400 bg-green-500/10 shrink-0"
            }>
              {currentType === "platform" ? "Platform" : "Custom Domain"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Option cards */}
        <div className="grid sm:grid-cols-2 gap-3">
          {/* Platform identity */}
          <button
            type="button"
            onClick={() => { setSelectedType("platform"); setSaveSuccess(false); setSaveError(""); }}
            className={`text-left rounded-lg border p-4 transition-all ${
              selectedType === "platform"
                ? "border-primary/60 bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:border-border/80 hover:bg-muted/30"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 p-1.5 rounded-md ${selectedType === "platform" ? "bg-primary/15" : "bg-muted"}`}>
                <Building2 className={`h-4 w-4 ${selectedType === "platform" ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">RepMail Platform</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Send via RepMail's verified domain. Best for getting started quickly.
                </p>
                {isCurrentType("platform") && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-blue-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Currently active
                  </div>
                )}
              </div>
            </div>
          </button>

          {/* Custom domain */}
          <button
            type="button"
            onClick={() => { setSelectedType("custom_domain"); setSaveSuccess(false); setSaveError(""); }}
            className={`text-left rounded-lg border p-4 transition-all ${
              selectedType === "custom_domain"
                ? "border-primary/60 bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:border-border/80 hover:bg-muted/30"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 p-1.5 rounded-md ${selectedType === "custom_domain" ? "bg-primary/15" : "bg-muted"}`}>
                <Globe className={`h-4 w-4 ${selectedType === "custom_domain" ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Custom Domain</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Send from your own verified domain. Better deliverability and brand recognition.
                </p>
                {isCurrentType("custom_domain") && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Currently active
                  </div>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* Platform acknowledgment */}
        {selectedType === "platform" && !isCurrentType("platform") && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Platform Identity — what this means</p>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-none">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                Your display name appears in the From field but the sending address belongs to RepMail's authenticated domain.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                You agree to send only to contacts who have opted in to receive your emails.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                Abuse of this identity (spam, impersonation) will result in immediate account suspension.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                You are bound by RepMail's{" "}
                <Link href="/repmail/terms">
                  <span className="text-primary underline cursor-pointer">Terms of Service</span>
                </Link>
                .
              </li>
            </ul>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={e => setAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
              <span className="text-sm text-foreground group-hover:text-foreground/90 leading-snug">
                I understand and accept the conditions for using RepMail's platform sending identity.
              </span>
            </label>
          </div>
        )}

        {/* Custom domain — no verified domain yet */}
        {selectedType === "custom_domain" && !hasVerifiedDomain && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
              You don't have a verified custom domain yet. Add and verify a domain first, then
              return here to set it as your sending identity.{" "}
              <Link href="/app/domains">
                <span className="font-medium underline cursor-pointer">Set up a domain →</span>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Custom domain — has verified domain but it's already the current type */}
        {selectedType === "custom_domain" && hasVerifiedDomain && !isCurrentType("custom_domain") && (
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-950/20">
            <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-300 text-sm">
              A verified domain is available. You'll select which domain to use when creating each
              campaign.
            </AlertDescription>
          </Alert>
        )}

        {/* Feedback & Save */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 min-h-[28px]">
            {saveSuccess && (
              <div className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Sending identity saved
              </div>
            )}
            {saveError && (
              <div className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {saveError}
              </div>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={!canSave || identityMutation.isPending || isCurrentType(selectedType)}
            className="gap-2"
          >
            {identityMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
            ) : isCurrentType(selectedType) ? (
              "Already set"
            ) : (
              "Save Identity"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Sender Health / SAS Status section ───────────────────────────────────────

function SenderHealthSection() {
  const { data: health, isLoading } = useQuery({
    queryKey: ["/api/sender-health"],
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const DimRow = ({ label, ok, code, message, children }) => (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="mt-0.5 shrink-0">
        {ok ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {!ok && code && (
            <span className="text-xs font-mono text-red-400/80 bg-red-500/10 px-1.5 py-0.5 rounded">
              {code}
            </span>
          )}
        </div>
        {!ok && message && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{message}</p>
        )}
        {children}
      </div>
      <div className="shrink-0">
        <Badge variant="outline" className={ok
          ? "border-green-500/30 text-green-400 bg-green-500/10 text-xs"
          : "border-red-500/30 text-red-400 bg-red-500/10 text-xs"
        }>
          {ok ? "OK" : "Action required"}
        </Badge>
      </div>
    </div>
  );

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Sending Status
            </CardTitle>
            <CardDescription className="mt-1">
              Live authorization check from the Sender Authorization Service across three
              dimensions.
            </CardDescription>
          </div>
          {!isLoading && health && (
            <Badge className={
              health.readiness === "ready"
                ? "bg-green-500/15 text-green-400 border border-green-500/25 shrink-0"
                : "bg-red-500/15 text-red-400 border border-red-500/25 shrink-0"
            }>
              {health.readiness === "ready" ? "Ready to Send" : "Blocked"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                <div className="h-4 w-4 rounded-full bg-muted animate-pulse" />
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : health ? (
          <div>
            <DimRow
              label="Identity"
              ok={health.identity.ok}
              code={health.identity.code}
              message={health.identity.message}
            >
              {health.identity.ok && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {health.identity.sendingIdentityType === "platform"
                    ? "Using RepMail platform identity"
                    : health.identity.sendingIdentityType === "custom_domain"
                      ? "Using custom domain"
                      : "Identity verified"}
                  {health.identity.senderName ? ` · ${health.identity.senderName}` : ""}
                </p>
              )}
            </DimRow>

            <DimRow
              label="Reputation"
              ok={health.reputation.ok}
              code={health.reputation.code}
              message={health.reputation.message}
            >
              {health.reputation.ok && !health.reputation.sendPaused && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  No active blocks or bounce flags.
                </p>
              )}
            </DimRow>

            <DimRow
              label="Policy"
              ok={health.policy.ok}
              code={health.policy.code}
              message={null}
            >
              {health.policy.warmup ? (
                <div className="mt-1.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Warm-up active · {health.policy.warmup.daysRemaining} day{health.policy.warmup.daysRemaining !== 1 ? "s" : ""} remaining
                    </span>
                    <span>
                      {health.policy.warmup.sentToday} / {health.policy.warmup.dailyLimit} sent today
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, (health.policy.warmup.sentToday / health.policy.warmup.dailyLimit) * 100)}
                    className="h-1.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    {health.policy.warmup.remainingToday} email{health.policy.warmup.remainingToday !== 1 ? "s" : ""} remaining in today's warm-up window
                  </p>
                </div>
              ) : health.policy.ok ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  No warm-up restrictions — sending at full capacity.
                </p>
              ) : (
                health.policy.code && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Daily warm-up limit reached. Resets after the 24-hour window.
                  </p>
                )
              )}
            </DimRow>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            Unable to load sending status. Please try again.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Profile() {
  const { user, setUser } = useAuth();

  const { data: templates } = useQuery({ queryKey: ["/api/templates"] });
  const { data: campaigns } = useQuery({ queryKey: ["/api/campaigns"] });

  // Sender profile form state — initialised from live user object
  const [senderForm, setSenderForm] = useState({
    senderName:    user?.senderName    || "",
    senderTitle:   user?.senderTitle   || "",
    senderCompany: user?.senderCompany || "",
    senderPhone:   user?.senderPhone   || "",
    replyToEmail:  user?.replyToEmail  || "",
  });
  const [saveSuccess,    setSaveSuccess]    = useState(false);
  const [saveError,      setSaveError]      = useState("");
  const [senderWarnings, setSenderWarnings] = useState([]);

  // Warn when senderName is being cleared while campaigns are still active.
  // senderName is read at send-time from the user profile (not snapshotted at campaign
  // creation), so clearing it mid-campaign causes emails to use the "RepMail" fallback.
  // Long-term fix: snapshot sender identity at campaign creation (tracked in ENGINEERING_BACKLOG).
  const activeCampaigns = (campaigns || []).filter(c =>
    ["RUNNING", "PENDING", "PAUSED"].includes(c.status)
  );
  const showSenderNameClearWarning =
    activeCampaigns.length > 0 &&
    !senderForm.senderName.trim() &&
    !!(user?.senderName);

  const updateProfileMutation = useMutation({
    mutationFn: async (fields) => {
      const res = await apiRequest("PUT", "/api/profile", fields);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to save profile");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setSaveSuccess(true);
      setSaveError("");
      setSenderWarnings(data?.senderWarnings ?? []);
      setTimeout(() => setSaveSuccess(false), 4000);
    },
    onError: (err) => {
      setSaveError(err.message || "Failed to save profile");
      setSaveSuccess(false);
    },
  });

  const handleSenderChange = (field, value) => {
    setSenderForm(prev => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
    setSaveError("");
  };

  const handleSenderSave = () => {
    updateProfileMutation.mutate(senderForm);
  };

  if (!user) return null;

  const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.USER;
  const creditsRemaining = calculateCreditsRemaining(
    user.creditsReceived || 0,
    user.creditsAllocated || 0,
    user.creditsUsed || 0
  );

  const senderProfileComplete = !!(user.senderName && user.senderTitle && user.senderCompany);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account and sender identity
          </p>
        </div>

        <Card className="border-card-border">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {getInitials(user.username)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-2xl font-semibold">{user.username}</h2>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="mt-2">
                  <Badge className={roleConfig.color}>
                    <Shield className="h-3 w-3 mr-1" />
                    {roleConfig.label}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Sender Identity Profile ───────────────────────────────────────── */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              Sender Identity
            </CardTitle>
            <CardDescription>
              Your name, title, and company appear in email signatures and control the From display
              name recipients see. Reply-To routes replies to your inbox.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!senderProfileComplete && (
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
                  Complete your sender profile so AI-generated templates include your real name,
                  title, and company — and so recipients see your name in the From field.
                </AlertDescription>
              </Alert>
            )}

            {/* Identity format guide */}
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1.5">
              <p className="font-medium text-foreground text-sm">How your identity appears in emails</p>
              <div className="font-mono space-y-0.5 text-xs">
                <p>Abhishek Singh</p>
                <p>Founder, RepMail</p>
              </div>
              <p className="pt-1">
                Use your real personal name — not a product, team, or platform name.
                Avoid: <span className="font-medium">admin, bot, repmail, support, sales team</span>.
                Recipients see this in the From field and email signature.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="senderName">Full Name <span className="text-destructive">*</span></Label>
                <Input
                  id="senderName"
                  placeholder="Abhishek Singh"
                  value={senderForm.senderName}
                  onChange={e => handleSenderChange("senderName", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Shown as the From name recipients see</p>
                {showSenderNameClearWarning && (
                  <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                    <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
                      You have {activeCampaigns.length} active campaign{activeCampaigns.length !== 1 ? "s" : ""}.
                      Emails sent after saving will use the platform default name ("RepMail").
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="senderTitle">Job Title</Label>
                <Input
                  id="senderTitle"
                  placeholder="Founder"
                  value={senderForm.senderTitle}
                  onChange={e => handleSenderChange("senderTitle", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Used in email signature via {`{{sender_title}}`}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="senderCompany">Company Name</Label>
                <Input
                  id="senderCompany"
                  placeholder="RepMail"
                  value={senderForm.senderCompany}
                  onChange={e => handleSenderChange("senderCompany", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Used in email signature via {`{{sender_company}}`}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="senderPhone">Phone Number</Label>
                <Input
                  id="senderPhone"
                  placeholder="+1 (555) 000-0000"
                  value={senderForm.senderPhone}
                  onChange={e => handleSenderChange("senderPhone", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Used in email signature via {`{{sender_phone}}`}</p>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="replyToEmail">Reply-To Email</Label>
                <Input
                  id="replyToEmail"
                  type="email"
                  placeholder="jane@yourcompany.com"
                  value={senderForm.replyToEmail}
                  onChange={e => handleSenderChange("replyToEmail", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Replies from recipients go to this address, not the sending address.
                  Leave blank to use your account email.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 min-h-[28px]">
                {saveSuccess && senderWarnings.length === 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Saved successfully
                  </div>
                )}
                {saveSuccess && senderWarnings.length > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    Saved with warnings
                  </div>
                )}
                {saveError && (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {saveError}
                  </div>
                )}
              </div>
              <Button
                onClick={handleSenderSave}
                disabled={updateProfileMutation.isPending}
                className="gap-2"
              >
                {updateProfileMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
                ) : (
                  "Save Sender Profile"
                )}
              </Button>
            </div>

            {senderWarnings.length > 0 && (
              <div className="space-y-2 pt-1">
                {senderWarnings.map((w) => (
                  <Alert
                    key={w.code}
                    className={
                      w.severity === "error"
                        ? "border-destructive/50 bg-destructive/5"
                        : "border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20"
                    }
                  >
                    <AlertCircle className={`h-4 w-4 ${w.severity === "error" ? "text-destructive" : "text-amber-600 dark:text-amber-500"}`} />
                    <AlertDescription className={`text-sm ${w.severity === "error" ? "text-destructive" : "text-amber-800 dark:text-amber-300"}`}>
                      {w.message}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Sending Identity Type ─────────────────────────────────────────── */}
        {user.role !== "ROOT_ADMIN" && (
          <SendingIdentitySection user={user} />
        )}

        {/* ── Sender Health / SAS Status ───────────────────────────────────── */}
        {user.role !== "ROOT_ADMIN" && (
          <SenderHealthSection />
        )}

        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              Credit Summary
            </CardTitle>
            <CardDescription>Your credit allocation and usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-md bg-muted/50">
                <p className="text-2xl font-bold text-primary">
                  {formatNumber(user.creditsReceived || 0)}
                </p>
                <p className="text-sm text-muted-foreground">Received</p>
              </div>
              <div className="text-center p-4 rounded-md bg-muted/50">
                <p className="text-2xl font-bold text-yellow-600">
                  {formatNumber(user.creditsAllocated || 0)}
                </p>
                <p className="text-sm text-muted-foreground">Allocated</p>
              </div>
              <div className="text-center p-4 rounded-md bg-muted/50">
                <p className="text-2xl font-bold text-red-600">
                  {formatNumber(user.creditsUsed || 0)}
                </p>
                <p className="text-sm text-muted-foreground">Used</p>
              </div>
              <div className="text-center p-4 rounded-md bg-green-50 dark:bg-green-950/30">
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(creditsRemaining)}
                </p>
                <p className="text-sm text-green-700 dark:text-green-400">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan Info Card */}
        {(() => {
          const plan = user.plan || "free";
          const limits = PROFILE_PLAN_LIMITS[plan] || PROFILE_PLAN_LIMITS.free;
          const templateCount = templates?.length || 0;
          const activeCampaignCount = (campaigns || []).filter(c => ["RUNNING","PENDING","DRAFT"].includes(c.status)).length;
          const maxT = limits.maxTemplates === Infinity ? "Unlimited" : limits.maxTemplates;
          const maxC = limits.maxActiveCampaigns === Infinity ? "Unlimited" : limits.maxActiveCampaigns;
          return (
            <Card className="border-card-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Your Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl font-semibold">{limits.label}</span>
                  {plan !== "enterprise" && (
                    <Link href="/app/payments" className="inline-flex items-center gap-1 text-sm text-cyan-500 hover:text-cyan-400">
                      Upgrade Plan <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Saved Templates</span>
                    <span className="text-foreground font-medium">{templateCount} / {maxT}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>Active Campaigns</span>
                    <span className="text-foreground font-medium">{activeCampaignCount} / {maxC}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>Campaign Scheduling</span>
                    <span className={`font-medium ${limits.canSchedule ? "text-green-500" : "text-muted-foreground"}`}>
                      {limits.canSchedule ? "Enabled" : "Not available"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Username</span>
              </div>
              <span className="font-medium">{user.username}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Email</span>
              </div>
              <span className="font-medium">{user.email}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Role</span>
              </div>
              <Badge className={roleConfig.color}>{roleConfig.label}</Badge>
            </div>
            {user.createdAt && (
              <>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Member Since</span>
                  </div>
                  <span className="font-medium">{formatDate(user.createdAt)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-destructive">Account Deletion</CardTitle>
            <CardDescription>
              To delete your account and all associated data, contact our support team. We will
              process your request within 5 business days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={`mailto:support@repmail.in?subject=Account%20deletion%20request&body=Please%20delete%20my%20account%3A%20${encodeURIComponent(user.email)}`}
            >
              <Button variant="destructive" size="sm">
                Request account deletion
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
