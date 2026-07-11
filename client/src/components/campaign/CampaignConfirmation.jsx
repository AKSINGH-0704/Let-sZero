import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useCampaign } from "@/context/CampaignContext";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { invalidateAfter } from "@/lib/queryInvalidation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Banner from "@/components/common/Banner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Send,
  Users,
  Coins,
  Clock,
  Mail,
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Shield,
  ArrowRight,
  Calendar,
  Globe,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber, calculateCreditsRemaining, replacePlaceholders, computePersonalizationStats } from "@/lib/utils";

export default function CampaignConfirmation() {
  const [location, setLocation] = useLocation();
  const { user, refetch: refetchUser } = useAuth();
  const { toast } = useToast();
  const {
    contacts,
    template,
    columnMapping,
    spamAnalysis,
    goBack,
    setCampaignName,
    setCampaignId,
    setCampaignData,
    campaignName,
    setStep,
    listId,
    saveToLibraryAs,
  } = useCampaign();

  const [name, setName] = useState(campaignName || `Campaign ${new Date().toLocaleDateString()}`);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [sasBlocked, setSasBlocked] = useState(null); // { message, remediationAction } when SAS denies
  const [upgradeNeeded, setUpgradeNeeded] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [senderDomainId, setSenderDomainId] = useState("");

  const { data: creditsInfo } = useQuery({ queryKey: ["/api/credits/info"] });
  const { data: platformConfig } = useQuery({ queryKey: ["/api/platform-config"], staleTime: 60_000 });
  const { data: health } = useQuery({ queryKey: ["/api/sender-health"], staleTime: 30_000 });

  const { data: verifiedDomains = [] } = useQuery({
    queryKey: ["/api/domains"],
    queryFn: () => apiRequest("GET", "/api/domains").then(r => r.json()),
    select: (data) => data.filter(d => d.status === "VERIFIED"),
  });

  const { data: selectedList } = useQuery({
    queryKey: [`/api/contact-lists/${listId}`],
    queryFn: () => apiRequest("GET", `/api/contact-lists/${listId}`).then(r => r.json()),
    enabled: !!listId,
  });

  const senderProfileComplete = !!(user?.senderName?.trim());

  // Effective From address — custom domain selection takes priority over platform default
  const selectedDomain = verifiedDomains.find(d => String(d.id) === String(senderDomainId));
  const effectiveFromEmail = selectedDomain?.fromEmail ?? platformConfig?.platformFromAddress ?? null;
  const fromDisplay = effectiveFromEmail
    ? `"${user?.senderName?.trim() || "Your Name"}" <${effectiveFromEmail}>`
    : null;

  const recipientCount = listId ? (selectedList?.contactCount ?? 0) : contacts.length;

  // Warm-up delivery schedule — shown when campaign spans multiple days
  const warmupData = health?.policy?.warmup;
  const isWarmupActive = warmupData?.active === true;
  const warmupRemainingToday = warmupData?.remainingToday ?? 0;
  const warmupDailyLimit = warmupData?.dailyLimit ?? 0;
  const deliveryDays = (() => {
    if (!isWarmupActive || !warmupDailyLimit || recipientCount <= warmupRemainingToday) return null;
    const days = [];
    let rem = recipientCount;
    const todayCount = Math.min(rem, warmupRemainingToday);
    if (todayCount > 0) { days.push({ label: "Today", count: todayCount }); rem -= todayCount; }
    let d = 2;
    while (rem > 0 && d <= 60) {
      const n = Math.min(rem, warmupDailyLimit);
      days.push({ label: `Day ${d}`, count: n });
      rem -= n;
      d++;
    }
    return days.length > 1 ? days : null;
  })();
  const creditsRequired = recipientCount;
  const creditsAvailable = creditsInfo?.total ?? calculateCreditsRemaining(
    user?.creditsReceived || 0,
    user?.creditsAllocated || 0,
    user?.creditsUsed || 0
  );
  const hasEnoughCredits = creditsAvailable >= creditsRequired;
  const isFreePlanExhausted = creditsInfo?.isFreePlan && (creditsInfo?.free ?? 0) === 0;
  const daysUntilReset = creditsInfo?.freeResetDate
    ? Math.max(1, Math.ceil((new Date(creditsInfo.freeResetDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;
  const estimatedTime = Math.ceil(creditsRequired / 100);

  // Preview uses real contact data — no synthetic fallbacks.
  // replacePlaceholders renders missing values as blank, matching actual send behavior.
  // Sender profile fields are included so {{sender_name}} etc. render in preview.
  const sampleContact = contacts[0] || {};
  const mappedData = {
    name:           columnMapping.name     ? String(sampleContact[columnMapping.name]     ?? "").trim() : "",
    email:          columnMapping.email    ? String(sampleContact[columnMapping.email]    ?? "").trim() : "",
    company:        columnMapping.company  ? String(sampleContact[columnMapping.company]  ?? "").trim() : "",
    category:       columnMapping.category ? String(sampleContact[columnMapping.category] ?? "").trim() : "",
    sender_name:    user?.senderName    || "",
    sender_title:   user?.senderTitle   || "",
    sender_company: user?.senderCompany || "",
    sender_phone:   user?.senderPhone   || "",
  };

  // Per-field data coverage across all contacts.
  const personalizationStats = computePersonalizationStats(contacts, columnMapping);

  // Placeholder keys used in the template — for both the warning and health panel.
  const ALL_FIELD_DEFS = [
    { key: "{{name}}",     mapKey: "name",     label: "Name" },
    { key: "{{company}}",  mapKey: "company",  label: "Company" },
    { key: "{{category}}", mapKey: "category", label: "Category" },
    { key: "{{email}}",    mapKey: "email",    label: "Email" },
  ];

  // Fields whose placeholder is used in the template AND has a quality issue.
  const unmappedUsed = ALL_FIELD_DEFS.filter(
    ({ key, mapKey }) =>
      (template.subject?.includes(key) || template.body?.includes(key)) &&
      !columnMapping[mapKey]
  );

  // Fields used in the template — shown in the Personalization Health panel.
  const healthFields = ALL_FIELD_DEFS.filter(
    ({ key }) => template.subject?.includes(key) || template.body?.includes(key)
  );

  const sendMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        template: {
          name: template.name,
          subject: template.subject,
          body: template.body
        },
      };

      if (senderDomainId) {
        payload.senderDomainId = senderDomainId;
      }

      if (listId) {
        payload.listId = listId;
      } else {
        const mappedContacts = contacts.map(contact => ({
          email: contact[columnMapping.email],
          name: contact[columnMapping.name],
          company: contact[columnMapping.company],
          category: contact[columnMapping.category]
        }));
        payload.contacts = mappedContacts;
        payload.totalEmails = contacts.length;
        if (saveToLibraryAs) payload.saveToLibraryAs = saveToLibraryAs;
      }

      if (isScheduled && scheduledAt) {
        payload.scheduledAt = new Date(scheduledAt).toISOString();
      }

      const res = await apiRequest("POST", "/api/campaigns", payload);
      return res.json();
    },
    onSuccess: (data) => {
      // POST /api/campaigns returns { campaign, contactStats, libraryListId, validationErrors }.
      // Extract the campaign object — data.id would be undefined on the wrapper.
      const campaign = data.campaign ?? data;
      setCampaignName(name);
      setCampaignId(campaign.id);
      setCampaignData(campaign);
      queryClient.setQueryData(["/api/campaigns", campaign.id], campaign);

      invalidateAfter("campaignCreated");
      refetchUser();

      // If the user checked "Save to Contact Library as", the list record is now created.
      // Contacts are imported asynchronously and will appear in the library within seconds.
      // No "View Library" action is offered here — the user is about to watch their campaign
      // launch on the next step; navigating away at this moment would be disorienting.
      if (saveToLibraryAs && data.libraryListId) {
        queryClient.invalidateQueries({ queryKey: ["/api/contact-lists"] });
        toast({
          title: "Saved to Contacts",
          description: `"${saveToLibraryAs}" was added to your Contacts. Recipients will appear shortly.`,
        });
      }

      // contactStats (duplicatesRemoved/invalidFormat/roleAddresses/suppressed)
      // was computed server-side and returned on every campaign creation but had
      // no consumer anywhere in the client — a user uploading 500 contacts with
      // 50 silently dropped (duplicates, bad format, role addresses, or already
      // suppressed) would never learn their campaign was actually going to 450
      // people, only see a smaller "Total" number later with no explanation.
      const stats = data.contactStats;
      const droppedTotal = (stats?.duplicatesRemoved || 0) + (stats?.invalidFormat || 0) + (stats?.roleAddresses || 0) + (stats?.suppressed || 0);
      if (droppedTotal > 0) {
        const parts = [];
        if (stats.duplicatesRemoved) parts.push(`${stats.duplicatesRemoved} duplicate${stats.duplicatesRemoved === 1 ? "" : "s"}`);
        if (stats.invalidFormat) parts.push(`${stats.invalidFormat} invalid`);
        if (stats.roleAddresses) parts.push(`${stats.roleAddresses} role address${stats.roleAddresses === 1 ? "" : "es"}`);
        if (stats.suppressed) parts.push(`${stats.suppressed} suppressed`);
        toast({
          title: `${droppedTotal} contact${droppedTotal === 1 ? "" : "s"} won't receive this campaign`,
          description: `${parts.join(", ")} — removed before sending. ${stats.valid} of ${stats.total} contacts will be sent to.`,
        });
      }

      setStep(7);
    },
    onError: (err) => {
      const body = err.body;
      if (body?.error === "PLAN_LIMIT") {
        setError(body.message);
        setUpgradeNeeded(true);
        return;
      }
      if (Array.isArray(body?.validationErrors) && body.validationErrors.length > 0) {
        setValidationErrors(body.validationErrors);
        return;
      }
      // SAS denial — dimension-aware: Identity and Reputation need user action
      if (body?.dimension && body?.remediationAction && body?.message) {
        setSasBlocked({ message: body.message, remediationAction: body.remediationAction });
        return;
      }
      setError(err.message || "Failed to start campaign");
    }
  });

  const handleSend = () => {
    if (!name.trim()) {
      setError("Campaign name is required");
      return;
    }
    if (!confirmed) {
      setError("Please confirm you want to send this campaign");
      return;
    }
    if (!senderDomainId) {
      setError("Select a verified sending domain before launching.");
      return;
    }
    if (isScheduled && !scheduledAt) {
      setError("Please select a date and time to schedule the campaign");
      return;
    }
    if (!isScheduled && !hasEnoughCredits) {
      setError("Insufficient credits to send this campaign");
      return;
    }

    setError("");
    setValidationErrors([]);
    sendMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
          <Send className="h-5 w-5 text-primary" />
          Campaign Confirmation
        </h2>
        <p className="text-muted-foreground mt-1">
          Review your campaign before sending
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter campaign name"
                  data-testid="input-campaign-name"
                />
              </div>

              {/* Campaign Scheduling */}
              {user?.effectivePlan && user.effectivePlan !== "free" ? (
                <div className="space-y-2">
                  <label className="flex items-center gap-3 text-sm text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isScheduled}
                      onChange={(e) => { setIsScheduled(e.target.checked); if (!e.target.checked) setScheduledAt(""); }}
                      className="rounded border-gray-600"
                    />
                    <Calendar className="h-4 w-4" />
                    Schedule for later
                  </label>
                  {isScheduled && (
                    <div className="mt-2">
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)}
                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Campaign will send automatically at this time.</p>
                    </div>
                  )}
                </div>
              ) : user?.effectivePlan === "free" || !user?.effectivePlan ? (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-400">
                    Campaign scheduling is available on Starter plan and above.{" "}
                    <Link href="/app/payments" className="underline">Upgrade now</Link>
                  </p>
                </div>
              ) : null}

              {/* Sending Domain selector — required for all users */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-primary" />
                  Sending Domain <span className="text-destructive">*</span>
                </Label>
                {verifiedDomains.length === 0 ? (
                  <Alert className="border-amber-500/40 bg-amber-500/10">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-amber-200">
                      <span className="font-semibold">You're in Preview Mode.</span> A verified sending domain is required to launch campaigns.{" "}
                      <Link href={`/app/domains?returnTo=${encodeURIComponent(location)}`} className="underline font-medium text-amber-300">
                        Add your domain →
                      </Link>
                      <span className="block mt-1 text-xs text-amber-400/70">
                        Nothing you've written here is saved yet — verify your domain first, then come back and
                        finish this campaign in one sitting.
                      </span>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <Select value={senderDomainId} onValueChange={setSenderDomainId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a sending domain" />
                      </SelectTrigger>
                      <SelectContent>
                        {verifiedDomains.map(d => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.fromEmail}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select the verified domain this campaign will send from.
                    </p>
                  </>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{formatNumber(recipientCount)}</p>
                    <p className="text-xs text-muted-foreground">Recipients</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Coins className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{formatNumber(creditsRequired)}</p>
                    <p className="text-xs text-muted-foreground">Credits Required</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">~{estimatedTime}</p>
                    <p className="text-xs text-muted-foreground">Minutes Est.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{spamAnalysis?.score || 0}</p>
                    <p className="text-xs text-muted-foreground">Spam Score</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" />
                Credit Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Available Credits</span>
                  <span className="font-bold text-lg">{formatNumber(creditsAvailable)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-muted-foreground">Credits Required</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Actual credits used may be lower if any recipients are on your suppression list.
                    </p>
                  </div>
                  <span className="font-bold text-lg text-primary shrink-0 ml-4">-{formatNumber(creditsRequired)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-medium">After Campaign (est.)</span>
                  <span className={`font-bold text-lg ${hasEnoughCredits ? "text-green-600" : "text-red-600"}`}>
                    {formatNumber(creditsAvailable - creditsRequired)}
                  </span>
                </div>
              </div>

              {!hasEnoughCredits && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {isFreePlanExhausted ? (
                      <>
                        Your {formatNumber(creditsInfo.monthlyFreeCredits)} free credits for this month are used up.
                        <span className="flex items-center gap-1 mt-1 text-sm">
                          <Calendar className="w-3 h-3" />
                          Resets in {daysUntilReset} day{daysUntilReset !== 1 ? "s" : ""}
                        </span>
                        <Link
                          href="/app/payments"
                          className="inline-flex items-center gap-1 mt-2 text-sm text-cyan-400 hover:text-cyan-300 underline block"
                        >
                          Purchase credits to send now <ArrowRight className="w-3 h-3" />
                        </Link>
                      </>
                    ) : (
                      <>
                        You need {formatNumber(creditsRequired - creditsAvailable)} more credits to send this campaign.
                        <Link
                          href="/app/payments"
                          className="inline-flex items-center gap-1 mt-2 text-sm text-cyan-400 hover:text-cyan-300 underline block"
                        >
                          Buy more credits <ArrowRight className="w-3 h-3" />
                        </Link>
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Preview
              </CardTitle>
              <CardDescription>Showing first contact — blank values reflect missing or unmapped data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fromDisplay && (
                  <div className="p-4 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      From
                    </p>
                    <p className="font-medium text-sm">{fromDisplay}</p>
                  </div>
                )}
                <div className="p-4 rounded-md bg-muted/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Subject
                  </p>
                  <p className="font-medium">
                    {replacePlaceholders(template.subject, mappedData)}
                  </p>
                </div>
                <div className="p-4 rounded-md bg-muted/50 max-h-64 overflow-y-auto">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                    Body
                  </p>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {replacePlaceholders(template.body, mappedData)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Personalization Health ─────────────────────────────────────────── */}
          {healthFields.length > 0 && (
            <Card className="border-card-border">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm font-medium mb-3">Personalization Health</p>
                <div className="space-y-2">
                  {healthFields.map(({ mapKey, label }) => {
                    const s = personalizationStats[mapKey];
                    const allGood = s.mapped && s.available === s.total && s.total > 0;
                    const noneAvailable = !s.mapped || s.available === 0;
                    return (
                      <div key={mapKey} className="flex items-center gap-2 text-sm">
                        {allGood ? (
                          <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        )}
                        <span className={allGood ? "text-foreground" : "text-muted-foreground"}>
                          {allGood
                            ? `${label} available for all recipients`
                            : noneAvailable
                            ? s.mapped
                              ? `${label} unavailable for all recipients`
                              : `${label} column not mapped — will render as blank`
                            : `${label} available for ${s.available} of ${s.total} recipients`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {deliveryDays && (
            <Card className="border-amber-500/20" style={{ background: "rgba(245,158,11,0.04)" }}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm flex-1">
                    <p className="font-medium text-amber-400 mb-2">
                      Multi-day delivery — sender reputation protection
                    </p>
                    <div className="space-y-1">
                      {deliveryDays.map(({ label, count }) => (
                        <div key={label} className="flex justify-between text-muted-foreground text-xs">
                          <span>{label}</span>
                          <span>{formatNumber(count)} emails</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Daily limit grows after your warm-up period ends.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-card-border">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="confirm"
                  checked={confirmed}
                  onCheckedChange={setConfirmed}
                  data-testid="checkbox-confirm"
                />
                <div>
                  <Label htmlFor="confirm" className="cursor-pointer">
                    I confirm that I want to send this campaign to{" "}
                    <strong>{formatNumber(recipientCount)}</strong> recipients using{" "}
                    <strong>{formatNumber(creditsRequired)}</strong> credits.
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    This action cannot be undone once the campaign starts.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {unmappedUsed.length > 0 && (
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium text-amber-800 dark:text-amber-300">
              {unmappedUsed.map(p => p.label).join(", ")}{" "}
              {unmappedUsed.length === 1 ? "column is" : "columns are"} not mapped
            </p>
            <p className="text-amber-700 dark:text-amber-400">
              {unmappedUsed.map(p => p.label).join(", ")}{" "}
              {unmappedUsed.length === 1
                ? "information is unavailable — those emails will render"
                : "information is unavailable — those emails will render these values"}{" "}
              as blank. Go back to Column Mapping to assign the{" "}
              {unmappedUsed.length === 1 ? "column" : "columns"}, or remove the{" "}
              {unmappedUsed.length === 1 ? "variable" : "variables"} from your template.
            </p>
          </div>
        </div>
      )}

      {!senderProfileComplete && (
        <Alert className="border-amber-500/40 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-400">
            <strong>Sender profile not set up.</strong> Your name and title appear in every email you send.{" "}
            <Link href="/app/profile" className="underline hover:text-amber-300">
              Set up your sender profile
            </Link>{" "}
            before launching this campaign.
          </AlertDescription>
        </Alert>
      )}

      {sasBlocked && (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p>{sasBlocked.message}</p>
            {sasBlocked.remediationAction === "SETUP_IDENTITY" && (
              <Link href={`/app/domains?returnTo=${encodeURIComponent(location)}`}>
                <span className="inline-flex items-center gap-1 text-sm font-medium underline cursor-pointer">
                  Add and verify a domain on the Domains page <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            )}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {upgradeNeeded && (
        <Link href="/app/payments">
          <Button variant="outline" className="w-full">
            Buy Credits →
          </Button>
        </Link>
      )}

      {validationErrors.length > 0 && (
        <Banner variant="danger">
          <p className="font-medium mb-2">Cannot send campaign — fix these issues first:</p>
          <ul className="list-disc pl-4 space-y-1 text-sm">
            {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </Banner>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={goBack} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleSend}
          disabled={!confirmed || (!isScheduled && !hasEnoughCredits) || !senderProfileComplete || !senderDomainId || verifiedDomains.length === 0 || sendMutation.isPending}
          data-testid="button-send-campaign"
        >
          {sendMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting Campaign...
            </>
          ) : isScheduled ? (
            <>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Campaign
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Campaign
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
