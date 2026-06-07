import { useState, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useCampaign } from "@/context/CampaignContext";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  AlertCircle,
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Loader2,
  Lightbulb,
  ThumbsUp,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Info,
} from "lucide-react";
import { calculateSpamScore, replacePlaceholders, computePersonalizationStats, formatNumber, cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

function getScoreColor(score) {
  if (score <= 30) return "text-green-600";
  if (score <= 60) return "text-yellow-600";
  return "text-red-600";
}

function getScoreLabel(score) {
  if (score <= 30) return "Low Risk";
  if (score <= 60) return "Medium Risk";
  return "High Risk";
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const DEMO_MERGE_VARS = {
  name: "Alex",
  company: "Acme Corp",
  category: "Technology",
  email: "alex@example.com",
};

const ALL_PLACEHOLDER_DEFS = [
  { key: "{{name}}",     mapKey: "name",     label: "Name" },
  { key: "{{company}}",  mapKey: "company",  label: "Company" },
  { key: "{{category}}", mapKey: "category", label: "Category" },
  { key: "{{email}}",    mapKey: "email",    label: "Email" },
];

export default function SpamAnalyzer() {
  const {
    template, setSpamAnalysis, spamAnalysis, goNext, goBack, setTemplate,
    contacts, columnMapping,
    templateIsAiGenerated,
    acceptedSuggestions: contextAcceptedSuggestions,
    acceptedDetails:     contextAcceptedDetails,
    aiAnalysis:          contextAiAnalysis,
    setAcceptedSuggestions: setContextAcceptedSuggestions,
    setAcceptedDetails:     setContextAcceptedDetails,
    setAiAnalysis:          setContextAiAnalysis,
  } = useCampaign();
  const { user } = useAuth();

  const initialAnalysis = spamAnalysis || calculateSpamScore(template.subject, template.body);

  const [localAnalysisLive, setLocalAnalysisLive] = useState(() => initialAnalysis);
  const [displayAnalysis,   setDisplayAnalysis]   = useState(() => initialAnalysis);

  // Initialize from context so Back→Forward navigation preserves results
  const [aiAnalysis, setAiAnalysisLocal] = useState(contextAiAnalysis);
  const [prevScore,  setPrevScore]       = useState(null);
  const [acceptedSuggestions, setAcceptedSuggestionsLocal] = useState(
    () => new Set(contextAcceptedSuggestions)
  );
  const [acceptedDetails, setAcceptedDetailsLocal] = useState(
    () => new Map(Object.entries(contextAcceptedDetails))
  );

  const [aiQuota,          setAiQuota]          = useState(null);
  const [quotaError,       setQuotaError]       = useState(null);
  const [aiAnalysisFailed, setAiAnalysisFailed] = useState(false);

  // Sync accepted state to both local and context in one call
  const syncAccepted = (newSet, newMap) => {
    setAcceptedSuggestionsLocal(newSet);
    setAcceptedDetailsLocal(newMap);
    setContextAcceptedSuggestions([...newSet]);
    setContextAcceptedDetails(Object.fromEntries(newMap));
  };

  // ── Quota helpers (needed before useEffect) ────────────────────────────────
  const aiIsUnlimited     = user?.aiDailyLimit == null;
  const aiLimit           = user?.aiDailyLimit ?? 0;
  const aiRemainingFromHeader =
    aiQuota?.remaining != null && aiQuota.remaining !== "unlimited"
      ? parseInt(aiQuota.remaining, 10) : null;
  const aiRemaining = aiIsUnlimited ? Infinity
    : aiRemainingFromHeader != null  ? aiRemainingFromHeader
    : Math.max(0, aiLimit - (user?.aiGenerationsToday ?? 0));
  const aiUsed     = aiIsUnlimited ? 0 : Math.max(0, aiLimit - aiRemaining);
  const aiExhausted = !aiIsUnlimited && aiRemaining <= 0;
  const aiWarning   = !aiIsUnlimited && !aiExhausted && aiLimit > 0 && aiUsed / aiLimit >= 0.8;

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const firstContact = contacts[0] || {};
      const mergeData = {
        name:     (columnMapping?.name     && firstContact[columnMapping.name])     || DEMO_MERGE_VARS.name,
        company:  (columnMapping?.company  && firstContact[columnMapping.company])  || DEMO_MERGE_VARS.company,
        category: (columnMapping?.category && firstContact[columnMapping.category]) || DEMO_MERGE_VARS.category,
        email:    (columnMapping?.email    && firstContact[columnMapping.email])    || DEMO_MERGE_VARS.email,
      };
      const renderedSubject = replacePlaceholders(template.subject, mergeData);
      const renderedBody    = replacePlaceholders(template.body,    mergeData);

      const res = await apiRequest("POST", "/api/ai/spam-analysis", {
        subject: renderedSubject,
        body:    renderedBody,
        acceptedSuggestions: [...acceptedSuggestions],
      });
      const remaining = res.headers.get("X-AI-Generations-Remaining");
      const resetsAt  = res.headers.get("X-AI-Generations-Reset");
      const data      = await res.json();
      return { ...data, _quota: { remaining, resetsAt } };
    },
    onSuccess: (data) => {
      if (data._quota?.remaining != null) setAiQuota(data._quota);
      if (!data.fromCache) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
      setQuotaError(null);
      setAiAnalysisFailed(false);

      setPrevScore(localAnalysisLive.score);

      const { _quota, fromCache, ...rest } = data;
      const analysisResult = {
        suggestions: rest.suggestions || [],
        summary:     rest.summary     || null,
      };
      setAiAnalysisLocal(analysisResult);
      setContextAiAnalysis(analysisResult);

      const currentKeywords = calculateSpamScore(template.subject, template.body);
      setLocalAnalysisLive(currentKeywords);
      setDisplayAnalysis(currentKeywords);
      setSpamAnalysis(currentKeywords);

      // Reset accepted state — fresh analysis, prior accepts no longer apply
      syncAccepted(new Set(), new Map());
    },
    onError: (err) => {
      try {
        const errBody = JSON.parse(err.message);
        if (errBody?.resetsAt) {
          setQuotaError({ resetsAt: errBody.resetsAt, upgradeMessage: errBody.upgradeMessage });
          return;
        }
      } catch {}
      setAiAnalysisFailed(true);
    },
  });

  const handleReanalyze = () => {
    analyzeMutation.mutate();
  };

  const acceptSuggestion = (suggestion) => {
    if (suggestion.actionable === false) return;

    const pattern    = new RegExp(escapeRegex(suggestion.original), "gi");
    const newSubject = template.subject.replace(pattern, suggestion.suggestion);
    const newBody    = template.body.replace(pattern, suggestion.suggestion);

    setTemplate({ subject: newSubject, body: newBody });

    const changedFields = [];
    if (newSubject !== template.subject) changedFields.push("subject line");
    if (newBody    !== template.body)    changedFields.push("body");

    const newSet = new Set([...acceptedSuggestions, suggestion.original]);
    const newMap = new Map([...acceptedDetails, [suggestion.original, changedFields]]);
    syncAccepted(newSet, newMap);

    const newAnalysis = calculateSpamScore(newSubject, newBody);
    setLocalAnalysisLive(newAnalysis);
    setSpamAnalysis(newAnalysis);
  };

  // Auto-run AI analysis on mount.
  // Skip if: AI-generated template (don't criticize own output), or results already in context.
  useEffect(() => {
    if (!aiExhausted && contextAiAnalysis === null && !templateIsAiGenerated) {
      analyzeMutation.mutate();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived values ─────────────────────────────────────────────────────────
  const score     = localAnalysisLive.score;
  const breakdown = localAnalysisLive.breakdown || [];
  const { riskyWords, suggestions } = displayAnalysis;

  const scoreDelta = prevScore !== null && prevScore !== score ? score - prevScore : null;

  const keywordSuggestions = (suggestions || []).filter(s => s.actionable !== false);
  const structuralTips     = (suggestions || []).filter(s => s.actionable === false);

  const aiObservations = (aiAnalysis?.suggestions || []).filter(s => s.actionable === false);

  const localKeywordOriginals = new Set(
    keywordSuggestions.map(s => (s.original || "").toLowerCase())
  );
  const aiRecommendations = (aiAnalysis?.suggestions || []).filter(s =>
    s.actionable !== false &&
    !localKeywordOriginals.has((s.original || "").toLowerCase()) &&
    !acceptedSuggestions.has(s.original)
  );

  const isApplicableToTemplate = (originalText) => {
    const combined = ((template.subject || "") + " " + (template.body || "")).toLowerCase();
    return combined.includes((originalText || "").toLowerCase());
  };

  const showAiPanel           = aiAnalysis !== null || analyzeMutation.isPending;
  const showAiRecommendations = aiRecommendations.length > 0;
  const showSuggestionsCard   = keywordSuggestions.length > 0 || structuralTips.length > 0 || showAiRecommendations;

  // ── Objective quality signals — memoized on template content + contact data
  const personalizationStats = useMemo(
    () => computePersonalizationStats(contacts, columnMapping),
    [contacts, columnMapping]
  );

  const subjectLen    = (template.subject || "").length;
  const subjectSignal = subjectLen === 0 ? null
    : subjectLen <= 50 ? "good" : subjectLen <= 70 ? "caution" : "bad";

  const bodyWords  = (template.body || "").trim().split(/\s+/).filter(Boolean).length;
  const bodySignal = bodyWords === 0 ? null
    : bodyWords <= 200 ? "good" : bodyWords <= 350 ? "caution" : "bad";

  const [usedPlaceholders, coveredPlaceholders, coverageSignal] = useMemo(() => {
    const used = ALL_PLACEHOLDER_DEFS.filter(
      p => template.subject?.includes(p.key) || template.body?.includes(p.key)
    );
    const covered = used.filter(p => {
      const s = personalizationStats[p.mapKey];
      return s.mapped && s.available > 0;
    });
    const signal = used.length === 0 ? "none"
      : covered.length === used.length ? "good"
      : covered.length > 0 ? "caution"
      : "bad";
    return [used, covered, signal];
  }, [template.subject, template.body, personalizationStats]);

  const invalidPlaceholders = useMemo(() => {
    const re = /\{\{[^}]*@[^}]*\}\}/g;
    return [...new Set([
      ...Array.from((template.subject || "").matchAll(re), m => m[0]),
      ...Array.from((template.body    || "").matchAll(re), m => m[0]),
    ])];
  }, [template.subject, template.body]);

  // ── Email Ready state ──────────────────────────────────────────────────────
  const analysisRan     = aiAnalysis !== null || aiAnalysisFailed;
  const pendingKeyFixes = keywordSuggestions.filter(s => !acceptedSuggestions.has(s.original)).length;
  // Partial coverage (caution) keeps the ready state but shows an informational note.
  // Zero coverage (bad) for a used variable downgrades to not-ready — blank personalization
  // for every recipient is a notable issue even if spam score is clean.
  const emailIsReady = score <= 30
    && (analysisRan || templateIsAiGenerated)
    && aiRecommendations.length === 0
    && pendingKeyFixes === 0
    && invalidPlaceholders.length === 0
    && coverageSignal !== "bad";

  // ── Signal helpers ─────────────────────────────────────────────────────────
  const signalIcon = (sig) => {
    if (sig === "good")    return <CheckCircle   className="h-4 w-4 text-green-600 shrink-0" />;
    if (sig === "caution") return <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />;
    if (sig === "bad")     return <AlertCircle   className="h-4 w-4 text-red-600 shrink-0" />;
    return <Info className="h-4 w-4 text-muted-foreground shrink-0" />;
  };
  const signalColor = (sig) =>
    sig === "good"    ? "text-green-600"
    : sig === "caution" ? "text-amber-600"
    : sig === "bad"     ? "text-red-600"
    : "text-muted-foreground";

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Email Quality Check
        </h2>
        <p className="text-muted-foreground mt-1">
          Spam risk analysis and deliverability signals for your campaign
        </p>
      </div>

      {/* ── Email Ready banner ──────────────────────────────────────────────── */}
      {emailIsReady && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-400">
            <span className="font-medium">Email ready to send.</span>{" "}
            Low spam risk, clean formatting, no outstanding issues.
            {coverageSignal === "caution" && (
              <span className="block mt-1 text-sm text-green-700 dark:text-green-500">
                {usedPlaceholders.length - coveredPlaceholders.length} of {usedPlaceholders.length} personalization{" "}
                {(usedPlaceholders.length - coveredPlaceholders.length) === 1 ? "variable has" : "variables have"}{" "}
                limited coverage — some recipients will receive a less personalized email.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* ── AI-generated template notice ────────────────────────────────────── */}
      {templateIsAiGenerated && !aiAnalysis && !analyzeMutation.isPending && (
        <Alert className="border-primary/30 bg-primary/5 dark:bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <span className="font-medium">AI-generated template.</span>{" "}
            This content was written to minimize spam triggers. Review the score below,
            or click Reanalyze for an additional AI review.
          </AlertDescription>
        </Alert>
      )}

      {/* ── AI analysis failure notice ─────────────────────────────────────── */}
      {aiAnalysisFailed && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-300 text-sm">
            AI analysis temporarily unavailable — keyword-based results shown. Re-analyze to retry.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Objective quality signals ─────────────────────────────────────── */}
      <Card className="border-card-border">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

            {/* Spam Risk */}
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted/40">
              {signalIcon(score <= 30 ? "good" : score <= 60 ? "caution" : "bad")}
              <div>
                <p className="text-xs text-muted-foreground">Spam Risk</p>
                <p className={cn("text-sm font-medium", getScoreColor(score))}>
                  {getScoreLabel(score)}
                </p>
              </div>
            </div>

            {/* Subject Length */}
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted/40">
              {signalIcon(subjectSignal)}
              <div>
                <p className="text-xs text-muted-foreground">Subject</p>
                <p className={cn("text-sm font-medium", signalColor(subjectSignal))}>
                  {subjectLen === 0 ? "Empty" : `${subjectLen} chars`}
                </p>
              </div>
            </div>

            {/* Body Length */}
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted/40">
              {signalIcon(bodySignal)}
              <div>
                <p className="text-xs text-muted-foreground">Body Length</p>
                <p className={cn("text-sm font-medium", signalColor(bodySignal))}>
                  {bodyWords === 0 ? "Empty" : `${bodyWords} words`}
                </p>
              </div>
            </div>

            {/* Personalization coverage — with tooltip breakdown */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 p-3 rounded-md bg-muted/40 cursor-default">
                    {usedPlaceholders.length === 0
                      ? <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                      : signalIcon(coverageSignal)}
                    <div>
                      <p className="text-xs text-muted-foreground">Personalization</p>
                      <p className={cn("text-sm font-medium",
                        usedPlaceholders.length === 0 ? "text-muted-foreground" : signalColor(coverageSignal)
                      )}>
                        {usedPlaceholders.length === 0
                          ? "None used"
                          : `${coveredPlaceholders.length} of ${usedPlaceholders.length} variables ready`}
                      </p>
                    </div>
                  </div>
                </TooltipTrigger>
                {usedPlaceholders.length > 0 && (
                  <TooltipContent className="max-w-xs space-y-1.5 text-xs" sideOffset={6}>
                    <p className="font-semibold mb-1">Personalization variables in this email</p>
                    {usedPlaceholders.map(p => {
                      const s = personalizationStats[p.mapKey];
                      const total = s.total;
                      const fmt = n => total > 1000 ? formatNumber(n) : String(n);
                      const ok = s.mapped && s.available > 0;
                      const statusText = !s.mapped
                        ? "not mapped"
                        : s.available === 0
                        ? "mapped — no data found"
                        : s.available === total
                        ? `all ${fmt(total)} recipients`
                        : `${fmt(s.available)} of ${fmt(total)} recipients have data`;
                      return (
                        <div key={p.key} className="flex items-start gap-1.5">
                          {ok
                            ? <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                            : <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />}
                          <span>
                            <span className="font-medium">{p.label}</span>
                            {" — "}{statusText}
                          </span>
                        </div>
                      );
                    })}
                    <p className="text-muted-foreground pt-1 border-t border-border/50">
                      Sending is not blocked — missing values render as blank.
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Personalization Health breakdown */}
          {usedPlaceholders.length > 0 && (
            <div className="mt-3 rounded-md border border-border bg-muted/20 px-3 py-2.5">
              <p className="text-xs font-medium text-foreground mb-2">Personalization Health</p>
              <div className="space-y-1.5">
                {usedPlaceholders.map(p => {
                  const s = personalizationStats[p.mapKey];
                  const total = s.total;
                  const fmt = n => total > 1000 ? formatNumber(n) : String(n);
                  const ok = s.mapped && s.available > 0;
                  const statusText = !s.mapped
                    ? "not mapped"
                    : s.available === 0
                    ? "mapped — no data found"
                    : s.available === total
                    ? `all ${fmt(total)} recipients`
                    : `${fmt(s.available)} of ${fmt(total)} (${Math.round(s.available / total * 100)}%) recipients`;
                  return (
                    <div key={p.key} className="flex items-center gap-2 text-xs">
                      {ok
                        ? <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        : <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                      <span>
                        <span className="font-medium">{p.label}</span>
                        {" — "}{statusText}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                Recipients with missing values receive that field as blank. Sending is unaffected.
              </p>
            </div>
          )}

          {/* Invalid placeholder details */}
          {invalidPlaceholders.length > 0 && (
            <div className="mt-3 flex gap-2 rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800/50 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-medium text-red-800 dark:text-red-300">
                  Invalid placeholder{invalidPlaceholders.length > 1 ? "s" : ""} found
                </p>
                {invalidPlaceholders.map(ph => (
                  <p key={ph} className="text-red-700 dark:text-red-400">
                    <span className="font-mono">{ph}</span>
                    {" — "}email addresses can't be placeholders. Go back and type it as plain text.
                  </p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Spam Score + Risky Words ──────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Spam Score card */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">Spam Score</CardTitle>
              <div className="flex flex-col items-end gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReanalyze}
                  disabled={analyzeMutation.isPending || aiExhausted}
                  data-testid="button-reanalyze"
                >
                  {analyzeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                {aiIsUnlimited ? (
                  <span className="text-xs text-green-600 font-medium">Unlimited</span>
                ) : aiExhausted ? (
                  <span className="text-xs text-red-600 font-medium">Limit reached</span>
                ) : (
                  <span className={cn("text-xs", aiWarning ? "text-yellow-600 font-medium" : "text-muted-foreground")}>
                    {aiRemaining} left today
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className={cn("text-6xl font-bold mb-2", getScoreColor(score))}>
                {score}
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  "text-sm",
                  score <= 30 && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                  score > 30 && score <= 60 && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                  score > 60 && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                )}
              >
                {getScoreLabel(score)}
              </Badge>

              {breakdown.length > 0 && (
                <div className="mt-4 text-left space-y-1 border-t pt-3">
                  {breakdown.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={cn("font-medium tabular-nums", getScoreColor(score))}>
                        +{item.points}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-xs font-semibold border-t pt-1 mt-1">
                    <span className="text-muted-foreground">Total</span>
                    <span className={cn("tabular-nums", getScoreColor(score))}>{score}</span>
                  </div>
                </div>
              )}

              {scoreDelta !== null && (
                <div className={cn(
                  "flex items-center justify-center gap-1 mt-2 text-sm font-medium",
                  scoreDelta < 0 ? "text-green-600" : "text-amber-600"
                )}>
                  {scoreDelta < 0
                    ? <TrendingDown className="h-4 w-4" />
                    : <TrendingUp className="h-4 w-4" />}
                  <span>
                    Was {prevScore} → Now {score} ({scoreDelta > 0 ? "+" : ""}{scoreDelta})
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Risk Level</span>
                <span className={getScoreColor(score)}>{score}/100</span>
              </div>
              <Progress value={score} className="h-2" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
              <div className="p-3 rounded-md bg-green-50 dark:bg-green-950/30">
                <p className="text-lg font-bold text-green-600">0-30</p>
                <p className="text-xs text-green-700 dark:text-green-400">Safe</p>
              </div>
              <div className="p-3 rounded-md bg-yellow-50 dark:bg-yellow-950/30">
                <p className="text-lg font-bold text-yellow-600">31-60</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400">Caution</p>
              </div>
              <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/30">
                <p className="text-lg font-bold text-red-600">61-100</p>
                <p className="text-xs text-red-700 dark:text-red-400">High Risk</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed border-t pt-4">
              Spam Score reflects keyword and structural analysis.
              Inbox placement also depends on domain reputation,
              authentication, sending behavior, and recipient engagement.
            </p>
          </CardContent>
        </Card>

        {/* Risky Words card */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Risky Words Detected
            </CardTitle>
            <CardDescription>
              {riskyWords.length === 0
                ? "No spam trigger words found"
                : `Found ${riskyWords.length} potential spam trigger${riskyWords.length > 1 ? "s" : ""}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {riskyWords.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-3" />
                <p className="text-green-700 dark:text-green-400 font-medium">Your email looks clean!</p>
                <p className="text-sm text-muted-foreground">No common spam trigger words detected</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {riskyWords.map((word, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className={cn(
                      "text-sm",
                      acceptedSuggestions.has(word)
                        ? "bg-green-100 text-green-800 line-through"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    )}
                  >
                    {word}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {quotaError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Daily AI limit reached — resets at{" "}
            {new Date(quotaError.resetsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.{" "}
            {quotaError.upgradeMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* ── AI Deliverability Review ─────────────────────────────────────────── */}
      {showAiPanel && (
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Deliverability Review
            </CardTitle>
            <CardDescription>
              GPT-4o-mini assessment of your rendered email content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analyzeMutation.isPending && !aiAnalysis ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-5/6" />
                <div className="h-4 bg-muted rounded w-4/6" />
              </div>
            ) : (
              <>
                {aiAnalysis?.summary && (
                  <p className="text-sm text-foreground leading-relaxed">
                    {aiAnalysis.summary}
                  </p>
                )}
                {aiObservations.length > 0 && (
                  <div className="space-y-2">
                    {aiObservations.map((obs, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-md border border-border bg-muted/30"
                      >
                        <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">{obs.suggestion}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Suggested Improvements ──────────────────────────────────────────── */}
      {showSuggestionsCard && (
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Suggested Improvements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Keyword improvements */}
            {(keywordSuggestions.length > 0 || structuralTips.length > 0) && (
              <div>
                {keywordSuggestions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                      Keyword Improvements
                    </p>
                    <div className="space-y-2">
                      {keywordSuggestions.map((suggestion, i) => {
                        const isAccepted = acceptedSuggestions.has(suggestion.original);
                        return (
                          <div
                            key={i}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-md border",
                              isAccepted
                                ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
                                : "bg-muted/30 border-border"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className="text-sm">
                                <span className="text-red-600 line-through font-medium">
                                  {suggestion.original}
                                </span>
                                <span className="mx-2 text-muted-foreground">&rarr;</span>
                                <span className="text-green-600 font-medium">
                                  {suggestion.suggestion}
                                </span>
                              </div>
                            </div>
                            {isAccepted ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Applied
                                </Badge>
                                {acceptedDetails.get(suggestion.original)?.length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    in {acceptedDetails.get(suggestion.original).join(" & ")}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => acceptSuggestion(suggestion)}
                                data-testid={`button-accept-${i}`}
                              >
                                <ThumbsUp className="h-3 w-3 mr-1" />
                                Accept
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {structuralTips.length > 0 && (
                  <div className={cn("space-y-2", keywordSuggestions.length > 0 && "mt-3")}>
                    {structuralTips.map((tip, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-4 rounded-md border border-border bg-muted/30"
                      >
                        <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">{tip.suggestion}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI Recommendations */}
            {showAiRecommendations && (
              <>
                {(keywordSuggestions.length > 0 || structuralTips.length > 0) && (
                  <Separator className="my-4" />
                )}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    AI Recommendations
                  </p>
                  <div className="space-y-2">
                    {aiRecommendations.map((suggestion, i) => {
                      const isAccepted = acceptedSuggestions.has(suggestion.original);
                      const canApply   = isApplicableToTemplate(suggestion.original);
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-md border",
                            isAccepted
                              ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
                              : "bg-muted/30 border-border"
                          )}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="text-sm min-w-0">
                              <span className="text-muted-foreground font-medium">
                                &ldquo;{suggestion.original}&rdquo;
                              </span>
                              <span className="mx-2 text-muted-foreground">&rarr;</span>
                              <span className="text-foreground">
                                {suggestion.suggestion}
                              </span>
                            </div>
                          </div>
                          {isAccepted ? (
                            <div className="flex flex-col items-end gap-0.5 shrink-0 ml-3">
                              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Applied
                              </Badge>
                              {acceptedDetails.get(suggestion.original)?.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  in {acceptedDetails.get(suggestion.original).join(" & ")}
                                </span>
                              )}
                            </div>
                          ) : canApply ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => acceptSuggestion(suggestion)}
                              data-testid={`button-ai-accept-${i}`}
                              className="shrink-0 ml-3"
                            >
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              Apply
                            </Button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {score > 60 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your email has a high spam score. Consider accepting the suggestions above or revising your content to improve deliverability.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={goBack} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={goNext} data-testid="button-next-step">
          Continue to Confirmation
        </Button>
      </div>
    </div>
  );
}
