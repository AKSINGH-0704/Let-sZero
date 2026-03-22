import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useCampaign } from "@/context/CampaignContext";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
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

export default function SpamAnalyzer() {
  const { template, setSpamAnalysis, spamAnalysis, goNext, goBack, setTemplate } = useCampaign();
  const [analysis, setAnalysis] = useState(spamAnalysis);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState(new Set());

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/spam-analysis", {
        subject: template.subject,
        body: template.body
      });
      return res.json();
    },
    onSuccess: (data) => {
      setAnalysis(data);
      setSpamAnalysis(data);
    },
    onError: () => {
      const localAnalysis = calculateSpamScore(template.subject, template.body);
      setAnalysis(localAnalysis);
      setSpamAnalysis(localAnalysis);
    }
  });

  useEffect(() => {
    if (!analysis) {
      const localAnalysis = calculateSpamScore(template.subject, template.body);
      setAnalysis(localAnalysis);
      setSpamAnalysis(localAnalysis);
    }
  }, []);

  const handleReanalyze = () => {
    analyzeMutation.mutate();
  };

  const acceptSuggestion = (suggestion) => {
    const newSubject = template.subject.replace(
      new RegExp(suggestion.original, 'gi'), 
      suggestion.suggestion
    );
    const newBody = template.body.replace(
      new RegExp(suggestion.original, 'gi'), 
      suggestion.suggestion
    );
    
    setTemplate({ subject: newSubject, body: newBody });
    setAcceptedSuggestions(prev => new Set([...prev, suggestion.original]));
    
    const newAnalysis = calculateSpamScore(newSubject, newBody);
    setAnalysis(newAnalysis);
    setSpamAnalysis(newAnalysis);
  };

  const handleContinue = () => {
    goNext();
  };

  const score = analysis?.score || 0;
  const riskyWords = analysis?.riskyWords || [];
  const suggestions = analysis?.suggestions || [];

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

      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">Spam Score</CardTitle>
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
            <span className="font-medium text-primary">AI Analysis: </span>{analysis.summary}
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
