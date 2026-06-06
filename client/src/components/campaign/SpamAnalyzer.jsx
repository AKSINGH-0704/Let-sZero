import { useState } from "react";
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
  XCircle,
  RefreshCw,
  Loader2,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Sparkles
} from "lucide-react";
import { calculateSpamScore, cn } from "@/lib/utils";

function getScoreColor(score) {
  if (score <= 30) return "text-green-600";
  if (score <= 60) return "text-yellow-600";
  return "text-red-600";
}

function getScoreBg(score) {
  if (score <= 30) return "bg-green-500";
  if (score <= 60) return "bg-yellow-500";
  return "bg-red-500";
}

function getScoreLabel(score) {
  if (score <= 30) return "Low Risk";
  if (score <= 60) return "Medium Risk";
  return "High Risk";
}

const AI_DAILY_LIMITS = { free: 5, trial: 5, starter: 20, growth: 50, scale: 150, enterprise: Infinity };

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function SpamAnalyzer() {
  const { template, setSpamAnalysis, spamAnalysis, goNext, goBack, setTemplate } = useCampaign();
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState(
    () => spamAnalysis || calculateSpamScore(template.subject, template.body)
  );
  const [acceptedSuggestions, setAcceptedSuggestions] = useState(new Set());
  const [aiQuota, setAiQuota] = useState(null);
  const [quotaError, setQuotaError] = useState(null);
  const [analysisSource, setAnalysisSource] = useState(spamAnalysis ? "local" : "initial");
  const [analysisDirty, setAnalysisDirty] = useState(false);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/spam-analysis", {
        subject: template.subject,
        body: template.body
      });
      const remaining = res.headers.get("X-AI-Generations-Remaining");
      const resetsAt = res.headers.get("X-AI-Generations-Reset");
      const data = await res.json();
      return { ...data, _quota: { remaining, resetsAt } };
    },
    onSuccess: (data) => {
      if (data._quota?.remaining != null) setAiQuota(data._quota);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setQuotaError(null);
      setAnalysisDirty(false);
      setAcceptedSuggestions(new Set());
      setAnalysisSource(data.aiPowered !== false ? "ai" : "fallback");
      const { _quota, ...analysisData } = data;
      setAnalysis(analysisData);
      setSpamAnalysis(analysisData);
    },
    onError: (err) => {
      try {
        const body = JSON.parse(err.message);
        if (body?.resetsAt) {
          setQuotaError({ resetsAt: body.resetsAt, upgradeMessage: body.upgradeMessage });
          return;
        }
      } catch {}
      setAnalysisDirty(false);
      setAcceptedSuggestions(new Set());
      setAnalysisSource("fallback");
      const localAnalysis = calculateSpamScore(template.subject, template.body);
      setAnalysis(localAnalysis);
      setSpamAnalysis(localAnalysis);
    }
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
    setAcceptedSuggestions(prev => new Set([...prev, suggestion.original]));

    if (analysisSource === "ai") {
      setAnalysisDirty(true);
    } else {
      const newAnalysis = calculateSpamScore(newSubject, newBody);
      setAnalysis(newAnalysis);
      setSpamAnalysis(newAnalysis);
    }
  };

  const handleContinue = () => {
    goNext();
  };

  const score = analysis?.score || 0;
  const riskyWords = analysis?.riskyWords || [];
  const suggestions = analysis?.suggestions || [];

  const aiDailyLimit = AI_DAILY_LIMITS[user?.plan] ?? AI_DAILY_LIMITS.free;
  const aiIsUnlimited = aiDailyLimit === Infinity || aiQuota?.remaining === "unlimited";
  const aiRemaining = aiQuota
    ? parseInt(aiQuota.remaining, 10)
    : Math.max(0, aiDailyLimit - (user?.aiGenerationsToday ?? 0));

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

      {analysisSource === "fallback" && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-300 text-sm">
            AI analysis temporarily unavailable — showing keyword-based results. Re-analyze to retry.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">Spam Score</CardTitle>
              <div className="flex flex-col items-end gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReanalyze}
                  disabled={analyzeMutation.isPending}
                  data-testid="button-reanalyze"
                >
                  {analyzeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                {analysisDirty && !analyzeMutation.isPending && (
                  <span className="text-xs text-primary font-medium">Re-analyze for updated score</span>
                )}
                {!analysisDirty && !aiIsUnlimited && (
                  <span className="text-xs text-muted-foreground">{aiRemaining} left today</span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className={cn("text-6xl font-bold mb-2", analysisDirty ? "text-muted-foreground" : getScoreColor(score))}>
                {score}
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  "text-sm",
                  analysisDirty && "bg-muted text-muted-foreground",
                  !analysisDirty && score <= 30 && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                  !analysisDirty && score > 30 && score <= 60 && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                  !analysisDirty && score > 60 && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                )}
              >
                {analysisDirty ? "Outdated — re-analyze" : getScoreLabel(score)}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Risk Level</span>
                <span className={analysisDirty ? "text-muted-foreground" : getScoreColor(score)}>
                  {analysisDirty ? "—/100" : `${score}/100`}
                </span>
              </div>
              <Progress value={analysisDirty ? 0 : score} className="h-2" />
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
          </CardContent>
        </Card>

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
                <p className="text-green-700 dark:text-green-400 font-medium">
                  Your email looks clean!
                </p>
                <p className="text-sm text-muted-foreground">
                  No common spam trigger words detected
                </p>
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

      {suggestions.length > 0 && (
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Suggested Improvements
            </CardTitle>
            <CardDescription>
              Accept suggestions to lower your spam score
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map((suggestion, i) => {
              if (suggestion.actionable === false) {
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-4 rounded-md border border-border bg-muted/30"
                  >
                    <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">{suggestion.suggestion}</p>
                  </div>
                );
              }

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
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Applied
                    </Badge>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => acceptSuggestion(suggestion)}
                        data-testid={`button-accept-${i}`}
                      >
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        Accept
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {analysis?.summary && (
        <Alert className="border-primary/20 bg-primary/5 dark:bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertDescription className="text-foreground">
            <span className="font-medium text-primary">AI-Assisted Analysis: </span>{analysis.summary}
          </AlertDescription>
        </Alert>
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
        <Button onClick={handleContinue} data-testid="button-next-step">
          Continue to Confirmation
        </Button>
      </div>
    </div>
  );
}
