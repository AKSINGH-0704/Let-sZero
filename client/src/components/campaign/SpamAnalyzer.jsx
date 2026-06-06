import { useState, useEffect } from "react";
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
} from "lucide-react";
import { calculateSpamScore, replacePlaceholders, cn } from "@/lib/utils";

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

export default function SpamAnalyzer() {
  const { template, setSpamAnalysis, spamAnalysis, goNext, goBack, setTemplate, contacts, columnMapping } = useCampaign();
  const { user } = useAuth();

  const initialAnalysis = spamAnalysis || calculateSpamScore(template.subject, template.body);

  // Live analysis — always reflects the current template after each accept; carries score + breakdown
  const [localAnalysisLive, setLocalAnalysisLive] = useState(() => initialAnalysis);

  // Stable display snapshot — used for risky words and keyword suggestions
  // Resets to current template state after each AI analysis run
  const [displayAnalysis, setDisplayAnalysis] = useState(() => initialAnalysis);

  // AI analysis result — null until the first AI call completes
  const [aiAnalysis, setAiAnalysis] = useState(null);

  // Score at the time of the most recent AI analysis run; null = no baseline yet
  const [prevScore, setPrevScore] = useState(null);

  // Accepted suggestions — accumulates across accepts, reset on re-analysis
  const [acceptedSuggestions, setAcceptedSuggestions] = useState(new Set());
  const [acceptedDetails, setAcceptedDetails] = useState(new Map());

  // Quota + error state
  const [aiQuota, setAiQuota] = useState(null);
  const [quotaError, setQuotaError] = useState(null);
  const [aiAnalysisFailed, setAiAnalysisFailed] = useState(false);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      // Substitute merge tags before sending to AI so GPT evaluates rendered content,
      // not raw placeholder syntax like {{name}} which triggers mass-template penalties.
      const firstContact = contacts[0] || {};
      const mergeData = {
        name: (columnMapping?.name && firstContact[columnMapping.name]) || DEMO_MERGE_VARS.name,
        company: (columnMapping?.company && firstContact[columnMapping.company]) || DEMO_MERGE_VARS.company,
        category: (columnMapping?.category && firstContact[columnMapping.category]) || DEMO_MERGE_VARS.category,
        email: (columnMapping?.email && firstContact[columnMapping.email]) || DEMO_MERGE_VARS.email,
      };
      const renderedSubject = replacePlaceholders(template.subject, mergeData);
      const renderedBody = replacePlaceholders(template.body, mergeData);

      const res = await apiRequest("POST", "/api/ai/spam-analysis", {
        subject: renderedSubject,
        body: renderedBody,
        acceptedSuggestions: [...acceptedSuggestions],
      });
      const remaining = res.headers.get("X-AI-Generations-Remaining");
      const resetsAt = res.headers.get("X-AI-Generations-Reset");
      const data = await res.json();
      return { ...data, _quota: { remaining, resetsAt } };
    },
    onSuccess: (data) => {
      if (data._quota?.remaining != null) setAiQuota(data._quota);
      if (!data.fromCache) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
      setQuotaError(null);
      setAiAnalysisFailed(false);

      // Baseline for delta: score at the moment this analysis completed
      setPrevScore(localAnalysisLive.score);

      const { _quota, fromCache, ...analysisData } = data;
      setAiAnalysis({
        suggestions: analysisData.suggestions || [],
        summary: analysisData.summary || null,
      });

      // Reset keyword display snapshot to the current (post-accept) template state
      const currentKeywords = calculateSpamScore(template.subject, template.body);
      setLocalAnalysisLive(currentKeywords);
      setDisplayAnalysis(currentKeywords);
      setSpamAnalysis(currentKeywords);
      setAcceptedSuggestions(new Set());
      setAcceptedDetails(new Map());
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

    const pattern = new RegExp(escapeRegex(suggestion.original), "gi");
    const newSubject = template.subject.replace(pattern, suggestion.suggestion);
    const newBody = template.body.replace(pattern, suggestion.suggestion);

    setTemplate({ subject: newSubject, body: newBody });

    const changedFields = [];
    if (newSubject !== template.subject) changedFields.push("subject line");
    if (newBody !== template.body) changedFields.push("body");
    setAcceptedSuggestions(prev => new Set([...prev, suggestion.original]));
    setAcceptedDetails(prev => new Map([...prev, [suggestion.original, changedFields]]));

    // Always recalculate live — no AI-source branching
    const newAnalysis = calculateSpamScore(newSubject, newBody);
    setLocalAnalysisLive(newAnalysis);
    setSpamAnalysis(newAnalysis);
  };

  // Quota derived values
  const aiIsUnlimited = user?.aiDailyLimit == null;
  const aiLimit = user?.aiDailyLimit ?? 0;
  const aiRemainingFromHeader = aiQuota?.remaining != null && aiQuota.remaining !== "unlimited"
    ? parseInt(aiQuota.remaining, 10) : null;
  const aiRemaining = aiIsUnlimited ? Infinity
    : aiRemainingFromHeader != null ? aiRemainingFromHeader
    : Math.max(0, aiLimit - (user?.aiGenerationsToday ?? 0));
  const aiUsed = aiIsUnlimited ? 0 : Math.max(0, aiLimit - aiRemaining);
  const aiExhausted = !aiIsUnlimited && aiRemaining <= 0;
  const aiWarning = !aiIsUnlimited && !aiExhausted && aiLimit > 0 && aiUsed / aiLimit >= 0.8;

  // Auto-run AI analysis on mount; cache hits are served free by peekSpamCache
  useEffect(() => {
    if (!aiExhausted) {
      analyzeMutation.mutate();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const score = localAnalysisLive.score;
  const breakdown = localAnalysisLive.breakdown || [];
  const { riskyWords, suggestions } = displayAnalysis;

  // Score delta — shown once AI has run and local score has moved from that baseline
  const scoreDelta = prevScore !== null && prevScore !== score ? score - prevScore : null;

  // Keyword improvements from deterministic local analysis (stable snapshot)
  const keywordSuggestions = (suggestions || []).filter(s => s.actionable !== false);
  const structuralTips = (suggestions || []).filter(s => s.actionable === false);

  // AI observations (non-actionable) rendered inside the AI Deliverability Review card
  const aiObservations = (aiAnalysis?.suggestions || []).filter(s => s.actionable === false);

  // AI recommendations: actionable suggestions not already covered by local keyword list
  const localKeywordOriginals = new Set(
    keywordSuggestions.map(s => (s.original || "").toLowerCase())
  );
  const aiRecommendations = (aiAnalysis?.suggestions || []).filter(s =>
    s.actionable !== false &&
    !localKeywordOriginals.has((s.original || "").toLowerCase()) &&
    !acceptedSuggestions.has(s.original)
  );

  // An AI recommendation can only be applied if its original phrase exists in the raw template
  const isApplicableToTemplate = (originalText) => {
    const combined = ((template.subject || "") + " " + (template.body || "")).toLowerCase();
    return combined.includes((originalText || "").toLowerCase());
  };

  const showAiPanel = aiAnalysis !== null || analyzeMutation.isPending;
  const showAiRecommendations = aiRecommendations.length > 0;
  const showSuggestionsCard = keywordSuggestions.length > 0 || structuralTips.length > 0 || showAiRecommendations;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Anti-Spam Analysis
        </h2>
        <p className="text-muted-foreground mt-1">
          Check your email for spam triggers and improve deliverability
        </p>
      </div>

      {aiAnalysisFailed && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-300 text-sm">
            AI analysis temporarily unavailable — keyword-based results shown. Re-analyze to retry.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Primary Spam Score — deterministic, always reflects current template */}
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

        {/* Risky Words — from deterministic local analysis */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Risky Words Detected
            </CardTitle>
            <CardDescription>
              {riskyWords.length === 0
                ? "No spam trigger words found"
                : `Found ${riskyWords.length} potential spam triggers`}
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

      {/* AI Deliverability Review — qualitative guidance, no numeric AI score */}
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

      {/* Suggested Improvements — two subsections: keyword (local) + AI recommendations */}
      {showSuggestionsCard && (
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Suggested Improvements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Section A: Keyword Improvements (deterministic) */}
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

            {/* Section B: AI Recommendations */}
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
                      const canApply = isApplicableToTemplate(suggestion.original);
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

      {score <= 30 && (
        <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-400">
            Your email has a low spam score and should have good deliverability.
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
