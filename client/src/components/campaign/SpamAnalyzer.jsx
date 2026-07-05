import { useState, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useCampaign } from "@/context/CampaignContext";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    acceptedSnapshots:   contextAcceptedSnapshots,
    rejectedSuggestions: contextRejectedSuggestions,
    aiAnalysis:          contextAiAnalysis,
    setAcceptedSuggestions: setContextAcceptedSuggestions,
    setAcceptedDetails:     setContextAcceptedDetails,
    setAcceptedSnapshots:   setContextAcceptedSnapshots,
    setRejectedSuggestions: setContextRejectedSuggestions,
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
  // suggestion.original -> { subject, body } captured immediately before that
  // suggestion was applied — lets Undo restore exact prior text rather than
  // reverse-guessing a regex replacement.
  const [acceptedSnapshots, setAcceptedSnapshotsLocal] = useState(
    () => new Map(Object.entries(contextAcceptedSnapshots || {}))
  );
  const [rejectedSuggestions, setRejectedSuggestionsLocal] = useState(
    () => new Set(contextRejectedSuggestions)
  );
  // Which suggestion (by `original` text) currently has its manual-edit input
  // open, and the in-progress edited value — cleared on accept/reject/cancel.
  const [editingSuggestion, setEditingSuggestion] = useState(null);
  const [editedText, setEditedText] = useState("");

  const [aiQuota,          setAiQuota]          = useState(null);
  const [quotaError,       setQuotaError]       = useState(null);
  const [aiAnalysisFailed, setAiAnalysisFailed] = useState(false);

  // Sync accepted state to both local and context in one call
  const syncAccepted = (newSet, newMap, newSnapshots) => {
    setAcceptedSuggestionsLocal(newSet);
    setAcceptedDetailsLocal(newMap);
    setContextAcceptedSuggestions([...newSet]);
    setContextAcceptedDetails(Object.fromEntries(newMap));
    if (newSnapshots) {
      setAcceptedSnapshotsLocal(newSnapshots);
      setContextAcceptedSnapshots(Object.fromEntries(newSnapshots));
    }
  };

  const syncRejected = (newSet) => {
    setRejectedSuggestionsLocal(newSet);
    setContextRejectedSuggestions([...newSet]);
  };

  const rejectSuggestion = (suggestion) => {
    syncRejected(new Set([...rejectedSuggestions, suggestion.original]));
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

      // Reset accepted/rejected state — fresh analysis, prior decisions no longer apply.
      // Snapshots must also be cleared here: a stale snapshot left keyed by text
      // that happens to reappear in the new analysis would otherwise attach to
      // the wrong acceptance and corrupt the undo-ordering check below.
      syncAccepted(new Set(), new Map(), new Map());
      syncRejected(new Set());
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

  // replacementText defaults to the suggested text, but the Manual-Edit flow
  // below can pass a user-edited alternative instead — accepting a suggestion
  // and manually adjusting its wording are the same underlying action (replace
  // `original` with some text and record it as addressed), not two features.
  const acceptSuggestion = (suggestion, replacementText) => {
    if (suggestion.actionable === false) return;
    const finalText = replacementText ?? suggestion.suggestion;

    const pattern    = new RegExp(escapeRegex(suggestion.original), "gi");
    const newSubject = template.subject.replace(pattern, finalText);
    const newBody    = template.body.replace(pattern, finalText);

    const changedFields = [];
    if (newSubject !== template.subject) changedFields.push("subject line");
    if (newBody    !== template.body)    changedFields.push("body");

    // Snapshot the exact pre-change text so Undo can restore it precisely,
    // rather than trying to reverse-apply a regex (fragile if two accepted
    // suggestions' replacement text overlap).
    const newSnapshots = new Map([...acceptedSnapshots, [suggestion.original, { subject: template.subject, body: template.body }]]);

    setTemplate({ subject: newSubject, body: newBody });

    const newSet = new Set([...acceptedSuggestions, suggestion.original]);
    const newMap = new Map([...acceptedDetails, [suggestion.original, changedFields]]);
    syncAccepted(newSet, newMap, newSnapshots);
    setEditingSuggestion(null);

    const newAnalysis = calculateSpamScore(newSubject, newBody);
    setLocalAnalysisLive(newAnalysis);
    setSpamAnalysis(newAnalysis);
  };

  // Restores the exact text captured just before this suggestion was applied,
  // and removes it from every accepted-state map so it becomes actionable again.
  const undoSuggestion = (suggestion) => {
    const snapshot = acceptedSnapshots.get(suggestion.original);
    if (!snapshot) return;

    setTemplate(snapshot);

    const newSet = new Set(acceptedSuggestions);
    newSet.delete(suggestion.original);
    const newMap = new Map(acceptedDetails);
    newMap.delete(suggestion.original);
    const newSnapshots = new Map(acceptedSnapshots);
    newSnapshots.delete(suggestion.original);
    syncAccepted(newSet, newMap, newSnapshots);

    const newAnalysis = calculateSpamScore(snapshot.subject, snapshot.body);
    setLocalAnalysisLive(newAnalysis);
    setSpamAnalysis(newAnalysis);
  };

  const startManualEdit = (suggestion) => {
    setEditingSuggestion(suggestion.original);
    setEditedText(suggestion.suggestion);
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
  const { suggestions } = displayAnalysis;

  const scoreDelta = prevScore !== null && prevScore !== score ? score - prevScore : null;

  const keywordSuggestions = (suggestions || []).filter(s => s.actionable !== false && !rejectedSuggestions.has(s.original));
  const structuralTips     = (suggestions || []).filter(s => s.actionable === false);

  const aiObservations = (aiAnalysis?.suggestions || []).filter(s => s.actionable === false);

  const localKeywordOriginals = new Set(
    keywordSuggestions.map(s => (s.original || "").toLowerCase())
  );
  const aiRecommendations = (aiAnalysis?.suggestions || []).filter(s =>
    s.actionable !== false &&
    !localKeywordOriginals.has((s.original || "").toLowerCase()) &&
    !acceptedSuggestions.has(s.original) &&
    !rejectedSuggestions.has(s.original)
  );

  const dismissedCount = rejectedSuggestions.size;

  // Undo restores the whole template to its pre-accept snapshot — correct only
  // for the *most recently* accepted suggestion. Undoing an earlier one while a
  // later one is still applied would silently wipe out that later change too
  // (its "Applied" badge would then be lying about the actual text). Map
  // preserves insertion order and undoSuggestion always deletes on revert, so
  // the last key really is the last (and only safely undoable) acceptance.
  const lastAcceptedOriginal = acceptedSnapshots.size > 0
    ? [...acceptedSnapshots.keys()].at(-1)
    : null;

  // Reconciles the AI summary against suggestions actually accepted from this same
  // analysis, with zero additional AI calls. Counts only real acceptances — not items
  // hidden from aiRecommendations for being a keyword-list duplicate — so this can
  // never claim progress the user hasn't actually made by clicking Accept.
  const aiActionableSuggestions = (aiAnalysis?.suggestions || []).filter(s => s.actionable !== false);
  const aiActionableTotal       = aiActionableSuggestions.length;
  const aiActionableResolved    = aiActionableSuggestions.filter(s => acceptedSuggestions.has(s.original)).length;

  const isApplicableToTemplate = (originalText) => {
    const combined = ((template.subject || "") + " " + (template.body || "")).toLowerCase();
    return combined.includes((originalText || "").toLowerCase());
  };

  const showAiRecommendations = aiRecommendations.length > 0;

  // One worklist instead of two parallel sections — a customer doesn't need to
  // know internally whether a fix came from the deterministic pattern-matcher
  // or the LLM to decide whether to apply it. Provenance is preserved per-row
  // (source + confidence badge) for trust/transparency, not as an organizing axis.
  const unifiedSuggestions = [
    ...keywordSuggestions.map(s => ({ ...s, source: "pattern", confidence: "high" })),
    ...aiRecommendations.map(s => ({ ...s, source: "ai", confidence: s.confidence || null })),
  ];
  const showSuggestionsCard = unifiedSuggestions.length > 0 || structuralTips.length > 0;

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

  // A qualitative headline replaces the old score-as-hero framing — same
  // underlying gates as emailIsReady, extended to three tiers instead of a
  // single boolean, so a customer sees "a couple of quick fixes" differently
  // from "several things need attention" rather than one undifferentiated
  // "not ready" state.
  const outstandingIssueCount = pendingKeyFixes + aiRecommendations.length + invalidPlaceholders.length
    + (coverageSignal === "bad" ? 1 : 0);
  const readinessState =
    (analyzeMutation.isPending && !aiAnalysis) ? "checking"
    : emailIsReady ? "ready"
    : (score > 60 || outstandingIssueCount >= 3) ? "attention"
    : "minor";

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

  // Provenance + confidence badge — "No black boxes": every suggestion shows
  // where it came from and how sure we are, never fabricated for older cached
  // AI results that predate the confidence field.
  const SuggestionProvenance = ({ suggestion }) => {
    if (suggestion.source === "pattern") {
      return (
        <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-border">
          Pattern match
        </Badge>
      );
    }
    if (!suggestion.confidence) {
      return (
        <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-border">
          <Sparkles className="h-3 w-3 mr-1" />AI
        </Badge>
      );
    }
    const confidenceStyle = {
      high:   "border-primary/30 text-primary",
      medium: "border-border text-muted-foreground",
      low:    "border-border text-muted-foreground/70",
    }[suggestion.confidence];
    return (
      <Badge variant="outline" className={cn("text-xs font-normal", confidenceStyle)}>
        <Sparkles className="h-3 w-3 mr-1" />AI · {suggestion.confidence} confidence
      </Badge>
    );
  };

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

      {/* ── Headline state — replaces the old score-as-hero framing. The score
           is still fully available (chip + breakdown tooltip below), but the
           lead message is qualitative: what's the state, what should happen next. ── */}
      <Alert className={cn(
        readinessState === "ready"     && "border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900",
        readinessState === "minor"     && "border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900",
        readinessState === "attention" && "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900",
        readinessState === "checking"  && "border-border bg-muted/30",
      )}>
        {readinessState === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {readinessState === "ready"     && <CheckCircle   className="h-4 w-4 text-green-600" />}
        {readinessState === "minor"     && <AlertTriangle className="h-4 w-4 text-amber-600" />}
        {readinessState === "attention" && <AlertCircle   className="h-4 w-4 text-red-600" />}
        <AlertDescription className={cn(
          readinessState === "ready"     && "text-green-800 dark:text-green-400",
          readinessState === "minor"     && "text-amber-800 dark:text-amber-400",
          readinessState === "attention" && "text-red-800 dark:text-red-400",
          readinessState === "checking"  && "text-muted-foreground",
        )}>
          <span className="font-medium">
            {readinessState === "checking"  && "Checking your email…"}
            {readinessState === "ready"     && "Email ready to send."}
            {readinessState === "minor"     && "A few quick fixes recommended."}
            {readinessState === "attention" && "This email needs attention before sending."}
          </span>{" "}
          {readinessState === "ready" && "Low spam risk, clean formatting, no outstanding issues."}
          {(readinessState === "minor" || readinessState === "attention") && (
            aiAnalysis?.summary
              ? aiAnalysis.summary
              : outstandingIssueCount > 0
              ? `${outstandingIssueCount} item${outstandingIssueCount === 1 ? "" : "s"} below could improve deliverability.`
              : "Keyword analysis looks clean, but an AI review hasn't completed yet — run one for a full check before sending."
          )}
          {readinessState === "ready" && coverageSignal === "caution" && (
            <span className="block mt-1 text-sm text-green-700 dark:text-green-500">
              {usedPlaceholders.length - coveredPlaceholders.length} of {usedPlaceholders.length} personalization{" "}
              {(usedPlaceholders.length - coveredPlaceholders.length) === 1 ? "variable has" : "variables have"}{" "}
              limited coverage — some recipients will receive a less personalized email.
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* ── AI-generated template notice ────────────────────────────────────── */}
      {templateIsAiGenerated && !aiAnalysis && !analyzeMutation.isPending && (
        <Alert className="border-primary/30 bg-primary/5 dark:bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <span className="font-medium">AI-generated template.</span>{" "}
            This content was written to minimize spam triggers. Review the signals below,
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

      {/* ── Objective quality signals — spam risk is now a chip with a full
           breakdown on hover/focus rather than a giant hero number; the
           qualitative headline above carries the primary message. ── */}
      <Card className="border-card-border">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

            {/* Spam Risk — with breakdown tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 p-3 rounded-md bg-muted/40 cursor-default">
                    {signalIcon(score <= 30 ? "good" : score <= 60 ? "caution" : "bad")}
                    <div>
                      <p className="text-xs text-muted-foreground">Spam Risk</p>
                      <p className={cn("text-sm font-medium", getScoreColor(score))}>
                        {getScoreLabel(score)} <span className="tabular-nums text-xs opacity-70">({score}/100)</span>
                      </p>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs space-y-1.5 text-xs" sideOffset={6}>
                  <p className="font-semibold mb-1">How this score is calculated</p>
                  {breakdown.length === 0 ? (
                    <p className="text-muted-foreground">No deterministic risk factors detected.</p>
                  ) : (
                    <>
                      {breakdown.map((item, i) => (
                        <div key={i} className="flex items-center justify-between gap-3">
                          <span>{item.label}</span>
                          <span className="tabular-nums font-medium">+{item.points}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between gap-3 font-semibold border-t border-border/50 pt-1 mt-1">
                        <span>Total</span>
                        <span className="tabular-nums">{score}</span>
                      </div>
                    </>
                  )}
                  {scoreDelta !== null && (
                    <p className={cn("pt-1 border-t border-border/50 flex items-center gap-1", scoreDelta < 0 ? "text-green-600" : "text-amber-600")}>
                      {scoreDelta < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                      Was {prevScore} → Now {score}
                    </p>
                  )}
                  <p className="text-muted-foreground pt-1 border-t border-border/50">
                    Based on rule-based pattern matching — always reproducible, never a black box.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

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

      {/* ── Reanalyze control ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {aiAnalysis?.summary ? "AI review complete." : "Run an AI review for deeper writing guidance."}
        </p>
        <div className="flex items-center gap-2">
          {aiIsUnlimited ? (
            <span className="text-xs text-green-600 font-medium">Unlimited AI reviews</span>
          ) : aiExhausted ? (
            <span className="text-xs text-red-600 font-medium">Daily limit reached</span>
          ) : (
            <span className={cn("text-xs", aiWarning ? "text-yellow-600 font-medium" : "text-muted-foreground")}>
              {aiRemaining} AI review{aiRemaining === 1 ? "" : "s"} left today
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReanalyze}
            disabled={analyzeMutation.isPending || aiExhausted}
            data-testid="button-reanalyze"
          >
            {analyzeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            Reanalyze
          </Button>
        </div>
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

      {/* ── Suggestions worklist — one unified list instead of separate
           "Keyword Improvements" / "AI Recommendations" sections. Provenance
           and confidence are shown per-row (SuggestionProvenance), not used to
           split the page into parallel tracks the customer has to reconcile. ── */}
      {showSuggestionsCard && (
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Suggestions
            </CardTitle>
            {aiAnalysis?.summary && aiActionableTotal > 0 && (
              <CardDescription>
                {aiActionableResolved >= aiActionableTotal
                  ? "All AI-flagged issues from this review have been addressed."
                  : `${aiActionableResolved} of ${aiActionableTotal} AI-flagged issue${aiActionableTotal === 1 ? "" : "s"} addressed.`}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {analyzeMutation.isPending && !aiAnalysis && (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-5/6" />
              </div>
            )}

            {unifiedSuggestions.map((suggestion, i) => {
              const isAccepted = acceptedSuggestions.has(suggestion.original);
              const isEditing  = editingSuggestion === suggestion.original;
              const canApply   = suggestion.source === "pattern" || isApplicableToTemplate(suggestion.original);
              const testPrefix = suggestion.source === "ai" ? "button-ai" : "button";
              return (
                <div
                  key={`${suggestion.source}-${suggestion.original}-${i}`}
                  className={cn(
                    "p-4 rounded-md border",
                    isAccepted
                      ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
                      : "bg-muted/30 border-border"
                  )}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="text-sm min-w-0">
                        <span className={cn(
                          "font-medium",
                          suggestion.source === "pattern" ? "text-red-600 line-through" : "text-muted-foreground"
                        )}>
                          {suggestion.source === "pattern" ? suggestion.original : `"${suggestion.original}"`}
                        </span>
                        <span className="mx-2 text-muted-foreground">&rarr;</span>
                        <span className={suggestion.source === "pattern" ? "text-green-600 font-medium" : "text-foreground"}>
                          {suggestion.suggestion}
                        </span>
                      </div>
                    </div>
                    {isAccepted ? (
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Applied
                        </Badge>
                        <div className="flex items-center gap-2">
                          {acceptedDetails.get(suggestion.original)?.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              in {acceptedDetails.get(suggestion.original).join(" & ")}
                            </span>
                          )}
                          {suggestion.original === lastAcceptedOriginal ? (
                            <button
                              type="button"
                              onClick={() => undoSuggestion(suggestion)}
                              data-testid={`${testPrefix}-undo-${i}`}
                              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                            >
                              Undo
                            </button>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    aria-disabled="true"
                                    onClick={(e) => e.preventDefault()}
                                    className="text-xs text-muted-foreground/50 cursor-default underline underline-offset-2 decoration-dotted"
                                  >
                                    Undo
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs max-w-[220px]">
                                  Undo the most recently applied suggestion first — changes are undone in the order they were made.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    ) : canApply ? (
                      <div className="flex items-center gap-1.5 shrink-0 ml-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => acceptSuggestion(suggestion)}
                          data-testid={`${testPrefix}-accept-${i}`}
                        >
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          Accept
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => startManualEdit(suggestion)} data-testid={`${testPrefix}-edit-${i}`}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => rejectSuggestion(suggestion)} data-testid={`${testPrefix}-reject-${i}`} className="text-muted-foreground">
                          Dismiss
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    <SuggestionProvenance suggestion={suggestion} />
                    {(suggestion.reason || suggestion.source === "pattern") && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
                        {suggestion.reason || "Common spam trigger word, matched exactly as written"}
                      </p>
                    )}
                  </div>

                  {isEditing && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className="flex-1 min-w-0 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        aria-label="Edit suggested replacement text"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => acceptSuggestion(suggestion, editedText)} disabled={!editedText.trim()}>
                        Apply edited
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingSuggestion(null)}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Non-actionable notes — structural tips (deterministic) and AI
                observations (sender-reputation/tone judgment calls) that don't
                map to a specific accept/reject text change. */}
            {(structuralTips.length > 0 || aiObservations.length > 0) && (
              <div className={cn("space-y-2", unifiedSuggestions.length > 0 && "pt-2 border-t border-border/50")}>
                {structuralTips.map((tip, i) => (
                  <div key={`tip-${i}`} className="flex items-start gap-3 p-3 rounded-md border border-border bg-muted/30">
                    <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">{tip.suggestion}</p>
                  </div>
                ))}
                {aiObservations.map((obs, i) => (
                  <div key={`ai-note-${i}`} className="flex items-start gap-3 p-3 rounded-md border border-border bg-muted/30">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">{obs.suggestion}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {dismissedCount > 0 && (
        <button
          type="button"
          onClick={() => syncRejected(new Set())}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          data-testid="button-restore-dismissed-suggestions"
        >
          {dismissedCount} suggestion{dismissedCount === 1 ? "" : "s"} dismissed — show again
        </button>
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
