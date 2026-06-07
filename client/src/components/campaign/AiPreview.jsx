import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useCampaign } from "@/context/CampaignContext";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  AlertCircle,
  Sparkles,
  RefreshCw,
  User,
  Mail as MailIcon,
  Building,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
  Wand2,
} from "lucide-react";
import { replacePlaceholders } from "@/lib/utils";

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
];

export default function AiPreview() {
  const { template, columnMapping, contacts, goNext, goBack, setAiPreviews } = useCampaign();
  const { user } = useAuth();
  const [tone, setTone] = useState("professional");
  const [previews, setPreviews] = useState([]);
  const [isAiEnhanced, setIsAiEnhanced] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiQuota, setAiQuota] = useState(null);
  const [quotaError, setQuotaError] = useState(null);
  const [aiRewriteFailed, setAiRewriteFailed] = useState(false);

  const sampleContacts = contacts.slice(0, 3).map(contact => ({
    email: contact[columnMapping.email] || "",
    name: contact[columnMapping.name] || "",
    company: contact[columnMapping.company] || "",
    category: contact[columnMapping.category] || "",
  }));

  const generateLocalPreviews = () =>
    sampleContacts.map(contact => {
      const data = {
        name:     contact.name     || "",
        email:    contact.email    || "",
        company:  contact.company  || "",
        category: contact.category || "",
      };
      return {
        contact: data,
        subject: replacePlaceholders(template.subject, data),
        body:    replacePlaceholders(template.body,    data),
      };
    });

  // Show merge preview immediately — no AI call
  useEffect(() => {
    setPreviews(generateLocalPreviews());
  }, []);

  const aiRewriteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/preview", {
        subject: template.subject,
        body: template.body,
        contacts: sampleContacts,
        tone,
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
      setAiRewriteFailed(false);
      setPreviews(data.previews || generateLocalPreviews());
      setIsAiEnhanced(data.aiPowered !== false);
      setAiOpen(false);
    },
    onError: (err) => {
      try {
        const body = JSON.parse(err.message);
        if (body?.resetsAt) {
          setQuotaError({ resetsAt: body.resetsAt, upgradeMessage: body.upgradeMessage });
          return;
        }
      } catch {}
      setAiRewriteFailed(true);
      setPreviews(generateLocalPreviews());
      setIsAiEnhanced(false);
      setAiOpen(false);
    },
  });

  const handleContinue = () => {
    setAiPreviews(previews);
    goNext();
  };

  const resetToLocal = () => {
    setPreviews(generateLocalPreviews());
    setIsAiEnhanced(false);
  };

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

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
          <MailIcon className="h-5 w-5 text-primary" />
          Merge Preview
        </h2>
        <p className="text-muted-foreground mt-1">
          Each contact receives a personally addressed email — see exactly what they'll get
        </p>
      </div>

      {/* Sending mechanics clarification */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-300 text-sm">
          <span className="font-medium">Personalized delivery:</span> Placeholders like{" "}
          <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{"{{name}}"}</code> and{" "}
          <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{"{{company}}"}</code> are
          replaced with each contact's real data at send time, so every recipient gets a message
          addressed to them. Use the tone rewriter below to explore different copy styles before sending.
        </AlertDescription>
      </Alert>

      {/* AI Rewrite — opt-in only */}
      <Collapsible open={aiOpen} onOpenChange={setAiOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-auto py-3 px-4 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-all duration-200"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">Preview in a Different Tone</p>
                <p className="text-xs text-muted-foreground">
                  Reword these previews to evaluate how your copy reads in another style
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {aiIsUnlimited ? (
                <span className="text-xs text-green-600 font-medium">Unlimited</span>
              ) : aiExhausted ? (
                <span className="text-xs text-red-600 font-medium">Limit reached</span>
              ) : (
                <span className={`text-xs ${aiWarning ? "text-yellow-600 font-medium" : "text-muted-foreground"}`}>
                  {aiRemaining} left today
                </span>
              )}
              {aiOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10 mt-2">
            <CardContent className="pt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                AI will reword the preview emails to match the selected tone. This is for
                evaluating copy options — it does not change how outbound emails are sent.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm font-medium whitespace-nowrap">Tone:</span>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="w-36 bg-background" data-testid="select-tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => aiRewriteMutation.mutate()}
                  disabled={aiRewriteMutation.isPending || aiExhausted}
                  className="gap-2"
                  data-testid="button-generate-preview"
                >
                  {aiRewriteMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Rewriting...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Rewrite with AI
                    </>
                  )}
                </Button>
              </div>

              {aiIsUnlimited ? (
                <p className="text-xs text-green-600 font-medium text-right">Unlimited AI usage</p>
              ) : aiExhausted ? (
                <p className="text-xs text-red-600 font-medium text-right">Daily limit reached — resets in ~24h</p>
              ) : (
                <p className={`text-xs text-right ${aiWarning ? "text-yellow-600 font-medium" : "text-muted-foreground"}`}>
                  {aiUsed} of {aiLimit} AI generation{aiLimit !== 1 ? "s" : ""} used today
                </p>
              )}

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
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {aiRewriteFailed && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-300 text-sm">
            AI rewrite temporarily unavailable — showing merge preview instead. Your campaign will send normally.
          </AlertDescription>
        </Alert>
      )}

      {/* Preview cards */}
      <Card className="border-card-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Sample Emails
                {isAiEnhanced && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-primary/10 text-primary border-primary/20"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Assisted
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Showing up to 3 contacts — placeholders filled with real data
              </p>
            </div>
            {isAiEnhanced && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToLocal}
                className="text-xs text-muted-foreground"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reset to merge preview
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {aiRewriteMutation.isPending ? (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Rewriting previews with AI...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {previews.map((preview, index) => (
                <Card key={index} className="border border-border">
                  <CardHeader className="py-3 px-4 bg-muted/30">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="text-sm">
                          <p className="font-medium">{preview.contact.name || "Contact"}</p>
                          <p className="text-muted-foreground text-xs">{preview.contact.email}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {isAiEnhanced ? "AI Assisted" : "Merge Preview"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <MailIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            Subject
                          </p>
                          <p className="font-medium">{preview.subject}</p>
                        </div>
                      </div>
                      <Separator />
                      <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/30 p-4 rounded-md">
                        {preview.body}
                      </div>
                      {preview.contact.company && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Building className="h-3 w-3" />
                          {preview.contact.company}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={goBack} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleContinue} data-testid="button-next-step">
          Continue to Spam Analysis
        </Button>
      </div>
    </div>
  );
}
