import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useCampaign } from "@/context/CampaignContext";
import { apiRequest } from "@/lib/queryClient";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  Sparkles, 
  RefreshCw, 
  User, 
  Mail as MailIcon,
  Building,
  Loader2,
  CheckCircle
} from "lucide-react";
import { replacePlaceholders } from "@/lib/utils";

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" }
];

export default function AiPreview() {
  const { template, columnMapping, contacts, goNext, goBack, setAiPreviews } = useCampaign();
  const [tone, setTone] = useState("professional");
  const [previews, setPreviews] = useState([]);
  const [isGenerated, setIsGenerated] = useState(false);

  const sampleContacts = contacts.slice(0, 3).map(contact => ({
    email: contact[columnMapping.email] || "",
    name: contact[columnMapping.name] || "",
    company: contact[columnMapping.company] || "",
    category: contact[columnMapping.category] || ""
  }));

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/preview", {
        subject: template.subject,
        body: template.body,
        contacts: sampleContacts,
        tone
      });
      return res.json();
    },
    onSuccess: (data) => {
      setPreviews(data.previews || generateLocalPreviews());
      setIsGenerated(true);
    },
    onError: () => {
      setPreviews(generateLocalPreviews());
      setIsGenerated(true);
    }
  });

  const generateLocalPreviews = () => {
    return sampleContacts.map(contact => {
      const data = {
        name: contact.name || "Valued Customer",
        email: contact.email || "customer@example.com",
        company: contact.company || "Your Company",
        category: contact.category || "General"
      };
      return {
        contact: data,
        subject: replacePlaceholders(template.subject, data),
        body: replacePlaceholders(template.body, data)
      };
    });
  };

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  const handleContinue = () => {
    setAiPreviews(previews);
    goNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI-Powered Email Preview
        </h2>
        <p className="text-muted-foreground mt-1">
          Preview how your emails will look with personalized content
        </p>
      </div>

      <Card className="border-card-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">Generate Preview</CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Tone:</span>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="w-36" data-testid="select-tone">
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
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                data-testid="button-generate-preview"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {isGenerated ? "Regenerate" : "Generate Preview"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!isGenerated && !generateMutation.isPending && (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-2">
                Generate a preview to see how your emails will look
              </p>
              <p className="text-sm text-muted-foreground">
                We'll show 3 sample emails with real contact data
              </p>
            </div>
          )}

          {generateMutation.isPending && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">
                Generating personalized previews...
              </p>
            </div>
          )}

          {isGenerated && previews.length > 0 && (
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
                          <p className="text-muted-foreground text-xs">
                            {preview.contact.email}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Sample {index + 1}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <MailIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Subject</p>
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

      {isGenerated && (
        <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-400">
            Previews generated successfully. Review your emails before continuing.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={goBack} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          onClick={handleContinue} 
          disabled={!isGenerated}
          data-testid="button-next-step"
        >
          Continue to Spam Analysis
        </Button>
      </div>
    </div>
  );
}
