import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useCampaign } from "@/context/CampaignContext";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  ArrowLeft,
  AlertCircle,
  PenLine,
  Eye,
  Mail,
  Type,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Wand2,
} from "lucide-react";
import { replacePlaceholders, computePersonalizationStats, cn } from "@/lib/utils";

const MAIN_PLACEHOLDERS = [
  { key: "{{name}}",     label: "Name",     description: "Recipient's first name",    mapKey: "name" },
  { key: "{{company}}", label: "Company",  description: "Recipient's company",        mapKey: "company" },
  { key: "{{category}}",label: "Category", description: "Recipient's category/group", mapKey: "category" },
];

const SECONDARY_PLACEHOLDERS = [
  { key: "{{email}}", label: "Email", description: "Recipient's email address", mapKey: "email" },
];

const ALL_PLACEHOLDER_DEFS = [...MAIN_PLACEHOLDERS, ...SECONDARY_PLACEHOLDERS];

const AI_TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly",     label: "Friendly" },
  { value: "formal",       label: "Formal" },
  { value: "casual",       label: "Casual" },
];

const CAMPAIGN_TYPES = [
  { value: "b2b_outreach",  label: "B2B Outreach" },
  { value: "real_estate",   label: "Real Estate" },
  { value: "recruitment",   label: "Recruitment" },
  { value: "partnership",   label: "Partnership" },
  { value: "follow_up",     label: "Follow-up" },
  { value: "general",       label: "General" },
];

export default function TemplateBuilder() {
  const {
    template, setTemplate, setTemplateIsAiGenerated, setCampaignType, setAiAnalysis,
    setAcceptedSuggestions, setAcceptedDetails, templateIsAiGenerated,
    columnMapping, contacts, goNext, goBack,
  } = useCampaign();
  const { user } = useAuth();

  const [localTemplate, setLocalTemplate] = useState({
    name:    template.name    || "",
    subject: template.subject || "",
    body:    template.body    || "",
  });
  const [localIsAiGenerated, setLocalIsAiGenerated] = useState(() => templateIsAiGenerated);
  const [error,        setError]        = useState("");
  const [activeTab,    setActiveTab]    = useState("edit");
  const [aiOpen,           setAiOpen]           = useState(false);
  const [aiPrompt,         setAiPrompt]         = useState("");
  const [aiTone,           setAiTone]           = useState("professional");
  const [aiCampaignType,   setAiCampaignType]   = useState("general");
  const [aiError,          setAiError]          = useState("");
  const [aiQuota,      setAiQuota]      = useState(null);
  const [focusedField, setFocusedField] = useState("body");

  // Preview recipient — defaults to the first contact that's missing a placeholder
  // currently used in the template. Ensures the default preview demonstrates any gaps.
  const [previewContactIndex, setPreviewContactIndex] = useState(() => {
    if (contacts.length === 0) return 0;
    const initSubject = template.subject || "";
    const initBody    = template.body    || "";
    const idx = contacts.findIndex(contact =>
      ALL_PLACEHOLDER_DEFS.some(p => {
        if (!initSubject.includes(p.key) && !initBody.includes(p.key)) return false;
        const col = columnMapping[p.mapKey];
        return !col || !String(contact[col] ?? "").trim();
      })
    );
    return Math.max(0, idx);
  });

  // ── Personalization stats — memoized so deps on it stay stable ───────────
  const personalizationStats = useMemo(
    () => computePersonalizationStats(contacts, columnMapping),
    [contacts, columnMapping]
  );

  // ── Preview data — real contact data, no synthetic fallbacks ──────────────
  // Sender profile fields are included so {{sender_name}} etc. render in preview,
  // matching what the recipient will actually receive.
  const previewContact = contacts[previewContactIndex] || {};
  const mappedData = {
    name:           columnMapping.name     ? String(previewContact[columnMapping.name]     ?? "").trim() : "",
    email:          columnMapping.email    ? String(previewContact[columnMapping.email]    ?? "").trim() : "",
    company:        columnMapping.company  ? String(previewContact[columnMapping.company]  ?? "").trim() : "",
    category:       columnMapping.category ? String(previewContact[columnMapping.category] ?? "").trim() : "",
    sender_name:    user?.senderName    || "",
    sender_title:   user?.senderTitle   || "",
    sender_company: user?.senderCompany || "",
    sender_phone:   user?.senderPhone   || "",
  };
  const previewSubject = replacePlaceholders(localTemplate.subject, mappedData);
  const previewBody    = replacePlaceholders(localTemplate.body,    mappedData);

  // ── Contact helpers ────────────────────────────────────────────────────────
  const contactDisplayName = (contact, idx) => {
    const name  = columnMapping.name  ? String(contact[columnMapping.name]  ?? "").trim() : "";
    const email = columnMapping.email ? String(contact[columnMapping.email] ?? "").trim() : "";
    return name || email || `Contact ${idx + 1}`;
  };

  const contactMissingFields = (contact) =>
    ALL_PLACEHOLDER_DEFS
      .filter(p => {
        if (!localTemplate.subject.includes(p.key) && !localTemplate.body.includes(p.key)) return false;
        const col = columnMapping[p.mapKey];
        return !col || !String(contact[col] ?? "").trim();
      })
      .map(p => p.label);

  // ── Placeholder quality analysis — recomputes only when template content or
  //    contact mapping changes; never reads stale closure values ─────────────
  const placeholderIssues = useMemo(() =>
    ALL_PLACEHOLDER_DEFS
      .filter(p => localTemplate.subject.includes(p.key) || localTemplate.body.includes(p.key))
      .map(p => {
        const s = personalizationStats[p.mapKey];
        if (!s.mapped)             return { p, type: "unmapped" };
        if (s.available === 0)     return { p, type: "empty",   available: s.available, total: s.total };
        if (s.available < s.total) return { p, type: "partial", available: s.available, total: s.total };
        return null;
      })
      .filter(Boolean),
  [localTemplate.subject, localTemplate.body, personalizationStats]);

  // ── Invalid placeholder detection — regex created inside memo so there is
  //    no shared /g lastIndex state across renders ────────────────────────────
  const invalidPlaceholders = useMemo(() => {
    const re = /\{\{[^}]*@[^}]*\}\}/g;
    return [
      ...new Set([
        ...Array.from((localTemplate.subject || "").matchAll(re), m => m[0]),
        ...Array.from((localTemplate.body    || "").matchAll(re), m => m[0]),
      ]),
    ];
  }, [localTemplate.subject, localTemplate.body]);

  // ── AI generator ──────────────────────────────────────────────────────────
  const generateTemplateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/generate-template", {
        prompt: aiPrompt,
        tone: aiTone,
        campaignType: aiCampaignType,
      });
      const remaining = res.headers.get("X-AI-Generations-Remaining");
      const resetsAt  = res.headers.get("X-AI-Generations-Reset");
      const data      = await res.json();
      return { ...data, _quota: { remaining, resetsAt } };
    },
    onSuccess: (data) => {
      if (data._quota?.remaining != null) setAiQuota(data._quota);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocalTemplate((prev) => ({
        ...prev,
        subject: data.subject || prev.subject,
        body:    data.body    || prev.body,
      }));
      setLocalIsAiGenerated(true);
      setAiOpen(false);
      setAiError("");
      setActiveTab("edit");
    },
    onError: (err) => {
      try {
        const body = JSON.parse(err.message);
        if (body?.resetsAt) {
          const resetTime = new Date(body.resetsAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          setAiError(
            `Daily AI limit reached — resets at ${resetTime}. ${body.upgradeMessage}`
          );
          return;
        }
      } catch {}
      setAiError(err.message || "Failed to generate template. Please try again.");
    },
  });

  // ── Placeholder insertion ──────────────────────────────────────────────────
  const insertPlaceholder = (placeholder) => {
    const isSubject = focusedField === "subject";
    const fieldId   = isSubject ? "subject" : "email-body";
    const fieldKey  = isSubject ? "subject" : "body";
    const input     = document.getElementById(fieldId);

    if (input) {
      const start  = input.selectionStart ?? input.value.length;
      const end    = input.selectionEnd   ?? input.value.length;
      const before = localTemplate[fieldKey].slice(0, start);
      const after  = localTemplate[fieldKey].slice(end);
      setLocalTemplate((prev) => ({ ...prev, [fieldKey]: before + placeholder + after }));
      setTimeout(() => {
        input.focus();
        const cursor = start + placeholder.length;
        input.setSelectionRange(cursor, cursor);
      }, 0);
    } else {
      setLocalTemplate((prev) => ({
        ...prev,
        [fieldKey]: prev[fieldKey] + placeholder,
      }));
    }
  };

  const handleChange = (field, value) => {
    setLocalTemplate((prev) => ({ ...prev, [field]: value }));
    setError("");
    if (field === "subject" || field === "body") {
      setLocalIsAiGenerated(false);
    }
  };

  const validateAndContinue = () => {
    if (!localTemplate.subject.trim()) {
      setError("Subject line is required");
      return;
    }
    if (!localTemplate.body.trim()) {
      setError("Email body is required");
      return;
    }
    setTemplate(localTemplate);
    setTemplateIsAiGenerated(localIsAiGenerated);
    setCampaignType(aiCampaignType);
    if (!localIsAiGenerated) {
      setAiAnalysis(null);
      setAcceptedSuggestions([]);
      setAcceptedDetails({});
    }
    goNext();
  };

  const canProceed = localTemplate.subject.trim() && localTemplate.body.trim();

  // ── AI quota helpers ───────────────────────────────────────────────────────
  const aiIsUnlimited      = user?.aiDailyLimit == null;
  const aiLimit            = user?.aiDailyLimit ?? 0;
  const aiRemainingFromHeader =
    aiQuota?.remaining != null && aiQuota.remaining !== "unlimited"
      ? parseInt(aiQuota.remaining, 10)
      : null;
  const aiRemaining  = aiIsUnlimited ? Infinity
    : aiRemainingFromHeader != null  ? aiRemainingFromHeader
    : Math.max(0, aiLimit - (user?.aiGenerationsToday ?? 0));
  const aiUsed       = aiIsUnlimited ? 0 : Math.max(0, aiLimit - aiRemaining);
  const aiExhausted  = !aiIsUnlimited && aiRemaining <= 0;
  const aiWarning    = !aiIsUnlimited && !aiExhausted && aiLimit > 0 && aiUsed / aiLimit >= 0.8;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Create Your Email Template</h2>
        <p className="text-muted-foreground mt-1">
          Write your email. Use the variables on the right to personalize each
          message for its recipient.
        </p>
      </div>

      {/* ── Incomplete sender profile warning ───────────────────────────────── */}
      {!(user?.senderName && user?.senderTitle && user?.senderCompany) && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
            Your <a href="/app/profile" className="underline font-medium">sender profile</a> is incomplete.
            AI-generated templates will use placeholder sign-offs, and recipients will see "RepMail" instead of your name.
          </AlertDescription>
        </Alert>
      )}

      {/* ── AI Template Generator ────────────────────────────────────────────── */}
      <Collapsible open={aiOpen} onOpenChange={setAiOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-auto py-3 px-4 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-all duration-200"
            data-testid="button-ai-generate-toggle"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">Generate with AI</p>
                <p className="text-xs text-muted-foreground">
                  Describe your campaign goal — AI drafts a starting template
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {aiIsUnlimited ? (
                <span className="text-xs text-green-600 font-medium">Unlimited</span>
              ) : aiExhausted ? (
                <span className="text-xs text-red-600 font-medium">Limit reached</span>
              ) : (
                <span className={cn("text-xs", aiWarning ? "text-yellow-600 font-medium" : "text-muted-foreground")}>
                  {aiRemaining} left today
                </span>
              )}
              {aiOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10 mt-2">
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai-prompt" className="text-sm font-medium">
                  What is this campaign about?
                </Label>
                <Textarea
                  id="ai-prompt"
                  placeholder="e.g., Cold outreach to fintech founders introducing our AI-powered email marketing platform and offering a free demo"
                  value={aiPrompt}
                  onChange={(e) => { setAiPrompt(e.target.value); setAiError(""); }}
                  className="min-h-[80px] text-sm resize-none bg-background"
                  disabled={generateTemplateMutation.isPending}
                  data-testid="input-ai-prompt"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium whitespace-nowrap">Type:</Label>
                  <Select value={aiCampaignType} onValueChange={setAiCampaignType} disabled={generateTemplateMutation.isPending}>
                    <SelectTrigger className="w-40 h-9 bg-background" data-testid="select-ai-campaign-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium whitespace-nowrap">Tone:</Label>
                  <Select value={aiTone} onValueChange={setAiTone} disabled={generateTemplateMutation.isPending}>
                    <SelectTrigger className="w-36 h-9 bg-background" data-testid="select-ai-tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_TONES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => generateTemplateMutation.mutate()}
                  disabled={!aiPrompt.trim() || generateTemplateMutation.isPending || aiExhausted}
                  className="gap-2 ml-auto"
                  data-testid="button-ai-generate"
                >
                  {generateTemplateMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Generating...</>
                  ) : (
                    <><Wand2 className="h-4 w-4" />Generate</>
                  )}
                </Button>
              </div>

              {aiIsUnlimited ? (
                <p className="text-xs text-green-600 font-medium text-right">Unlimited AI usage</p>
              ) : aiExhausted ? (
                <p className="text-xs text-red-600 font-medium text-right">Daily limit reached — resets in ~24h</p>
              ) : (
                <p className={cn("text-xs text-right", aiWarning ? "text-yellow-600 font-medium" : "text-muted-foreground")}>
                  {aiUsed} of {aiLimit} AI generation{aiLimit !== 1 ? "s" : ""} used today
                </p>
              )}

              {aiError && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{aiError}</AlertDescription>
                </Alert>
              )}

              <p className="text-xs text-muted-foreground">
                The generated template will replace your current subject and body. You can edit it freely afterwards.
              </p>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Editor + Sidebar ──────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-5 gap-4 lg:gap-6">

        {/* ── Left: editor ───────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="border-card-border">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={activeTab === "edit" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("edit")}
                  className="gap-2"
                >
                  <PenLine className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant={activeTab === "preview" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("preview")}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {activeTab === "edit" ? (
                <>
                  {/* Template name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      placeholder="e.g., Welcome Email, Q2 Outreach..."
                      value={localTemplate.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      data-testid="input-template-name"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used only for saving and reusing this template later. Recipients never see this name.
                    </p>
                  </div>

                  {/* Subject line */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="subject">
                        Subject Line <span className="text-destructive">*</span>
                      </Label>
                      <span className={cn(
                        "text-xs tabular-nums",
                        localTemplate.subject.length >= 50 ? "text-amber-600 font-medium" : "text-muted-foreground"
                      )}>
                        {localTemplate.subject.length}/50
                      </span>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="subject"
                        placeholder="Enter your email subject..."
                        value={localTemplate.subject}
                        onChange={(e) => handleChange("subject", e.target.value)}
                        onFocus={() => setFocusedField("subject")}
                        className="pl-10"
                        data-testid="input-subject"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      You can personalize the subject line too — click any variable in the panel while this field is active.
                    </p>
                  </div>

                  {/* Email body */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email-body">
                      Email Body <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="email-body"
                      placeholder={`Write your email content here...\n\nClick a variable on the right to personalize your message.\n\nExample:\nHi {{name}},\n\nI hope this message finds you well at {{company}}...\n\nBest regards,\nYour Team`}
                      value={localTemplate.body}
                      onChange={(e) => handleChange("body", e.target.value)}
                      onFocus={() => setFocusedField("body")}
                      className="min-h-[300px] text-sm"
                      data-testid="input-body"
                    />
                  </div>

                  {/* Invalid placeholder warnings — e.g. {{support@domain.com}} */}
                  {invalidPlaceholders.length > 0 && (
                    <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800/50 dark:bg-red-950/20">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <div className="text-sm space-y-1.5">
                        <p className="font-medium text-red-800 dark:text-red-300">
                          Invalid placeholder{invalidPlaceholders.length > 1 ? "s" : ""} detected
                        </p>
                        {invalidPlaceholders.map(ph => (
                          <p key={ph} className="text-red-700 dark:text-red-400">
                            <span className="font-mono text-xs">{ph}</span>
                            {" — "}Email addresses cannot be used as placeholders. Type it as plain text instead.
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Placeholder quality warnings */}
                  {placeholderIssues.length > 0 && (
                    <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/20">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-sm space-y-2">
                        {placeholderIssues.map(({ p, type, available, total }) => {
                          const msg =
                            type === "unmapped"
                              ? `${p.label} column is not mapped — emails will render ${p.key} as blank.`
                              : type === "empty"
                              ? `${p.label} information is unavailable for all ${total} contacts — emails using ${p.key} will render as blank.`
                              : `${p.label} information is available for ${available} of ${total} contacts — the remaining ${total - available} ${total - available === 1 ? "recipient" : "recipients"} will receive a blank value.`;
                          return (
                            <p key={p.key} className="text-amber-800 dark:text-amber-300">
                              <span className="font-mono text-xs font-medium">{p.key}</span>
                              {" — "}
                              {msg}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Preview tab */
                <div className="space-y-4">
                  {/* Recipient selector */}
                  {contacts.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Preview recipient:</span>
                      <Select
                        value={String(previewContactIndex)}
                        onValueChange={(v) => setPreviewContactIndex(Number(v))}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1" data-testid="select-preview-contact">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {contacts.slice(0, 100).map((contact, idx) => {
                            const label   = contactDisplayName(contact, idx);
                            const missing = contactMissingFields(contact);
                            return (
                              <SelectItem key={idx} value={String(idx)} className="text-xs">
                                {label}
                                {missing.length > 0 ? ` — ⚠ Missing: ${missing.join(", ")}` : ""}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Rendered preview */}
                  <div className="p-4 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Subject</p>
                    <p className="font-medium">{previewSubject || <span className="text-muted-foreground italic">No subject</span>}</p>
                  </div>
                  <Separator />
                  <div className="p-4 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Body</p>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {previewBody || <span className="text-muted-foreground italic">No content</span>}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Showing exactly what this recipient will receive. Blank values indicate missing or unmapped data.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: variable panel ──────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <Card className="border-card-border lg:sticky lg:top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Type className="h-4 w-4" />
                Personalization Variables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Click to insert into the{" "}
                <span className="font-medium text-foreground">
                  {focusedField === "subject" ? "subject line" : "email body"}
                </span>.
              </p>

              {/* Primary variables */}
              {MAIN_PLACEHOLDERS.map((placeholder) => {
                const s       = personalizationStats[placeholder.mapKey];
                const isMapped = s.mapped;
                const availText = !isMapped
                  ? "Not mapped"
                  : `${s.available}/${s.total} contacts`;
                const availColor = !isMapped || s.available === 0
                  ? "text-amber-600 dark:text-amber-500"
                  : s.available < s.total
                  ? "text-amber-600 dark:text-amber-500"
                  : "text-green-600 dark:text-green-500";

                return (
                  <Button
                    key={placeholder.key}
                    variant="outline"
                    className={cn("w-full justify-start gap-3 h-auto py-3", !isMapped && "opacity-60")}
                    onClick={() => insertPlaceholder(placeholder.key)}
                    data-testid={`placeholder-${placeholder.label.toLowerCase()}`}
                  >
                    <Badge variant={isMapped ? "secondary" : "outline"} className="font-mono shrink-0">
                      {placeholder.key}
                    </Badge>
                    <div className="text-left">
                      <p className="font-medium text-sm">{placeholder.label}</p>
                      <p className={cn("text-xs tabular-nums", availColor)}>{availText}</p>
                    </div>
                  </Button>
                );
              })}

              {/* Secondary variables */}
              <Separator className="my-1" />
              <p className="text-xs text-muted-foreground">Other variables</p>
              {SECONDARY_PLACEHOLDERS.map((placeholder) => {
                const s       = personalizationStats[placeholder.mapKey];
                const isMapped = s.mapped;
                const availText = !isMapped
                  ? "Not mapped"
                  : `${s.available}/${s.total} contacts`;
                const availColor = !isMapped || s.available === 0
                  ? "text-amber-600 dark:text-amber-500"
                  : s.available < s.total
                  ? "text-amber-600 dark:text-amber-500"
                  : "text-green-600 dark:text-green-500";

                return (
                  <Button
                    key={placeholder.key}
                    variant="outline"
                    className={cn("w-full justify-start gap-3 h-auto py-2.5", !isMapped && "opacity-60")}
                    onClick={() => insertPlaceholder(placeholder.key)}
                    data-testid={`placeholder-${placeholder.label.toLowerCase()}`}
                  >
                    <Badge variant={isMapped ? "secondary" : "outline"} className="font-mono shrink-0 text-xs">
                      {placeholder.key}
                    </Badge>
                    <div className="text-left">
                      <p className="font-medium text-sm">{placeholder.label}</p>
                      <p className={cn("text-xs tabular-nums", availColor)}>{availText}</p>
                    </div>
                  </Button>
                );
              })}

              <Separator className="my-1" />

              <div className="space-y-1.5">
                <p className="text-sm font-medium">Tips</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>— Keep subject lines under 50 characters</li>
                  <li>— Use a clear call-to-action</li>
                  <li>— Switch to Preview to see exactly what each recipient will receive</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Validation error ──────────────────────────────────────────────────── */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Navigation ───────────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={goBack} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={validateAndContinue} disabled={!canProceed} data-testid="button-next-step">
          Continue to Preview
        </Button>
      </div>
    </div>
  );
}
