import { useState, useEffect } from "react";
import { useCampaign } from "@/context/CampaignContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  AlertCircle, 
  Code,
  Eye,
  Mail,
  Type
} from "lucide-react";
import { replacePlaceholders, cn } from "@/lib/utils";

const PLACEHOLDERS = [
  { key: "{{name}}", label: "Name", description: "Recipient's name" },
  { key: "{{email}}", label: "Email", description: "Recipient's email" },
  { key: "{{company}}", label: "Company", description: "Recipient's company" },
  { key: "{{category}}", label: "Category", description: "Recipient's category" }
];

export default function TemplateBuilder() {
  const { template, setTemplate, columnMapping, contacts, goNext, goBack } = useCampaign();
  const [localTemplate, setLocalTemplate] = useState({
    name: template.name || "",
    subject: template.subject || "",
    body: template.body || ""
  });
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("edit");

  const sampleContact = contacts[0] || {};
  const mappedData = {
    name: sampleContact[columnMapping.name] || "John Doe",
    email: sampleContact[columnMapping.email] || "john@example.com",
    company: sampleContact[columnMapping.company] || "Acme Inc",
    category: sampleContact[columnMapping.category] || "Technology"
  };

  const previewSubject = replacePlaceholders(localTemplate.subject, mappedData);
  const previewBody = replacePlaceholders(localTemplate.body, mappedData);

  const insertPlaceholder = (placeholder) => {
    const textarea = document.getElementById("email-body");
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody = 
        localTemplate.body.slice(0, start) + 
        placeholder + 
        localTemplate.body.slice(end);
      setLocalTemplate(prev => ({ ...prev, body: newBody }));
    } else {
      setLocalTemplate(prev => ({ ...prev, body: prev.body + placeholder }));
    }
  };

  const handleChange = (field, value) => {
    setLocalTemplate(prev => ({ ...prev, [field]: value }));
    setError("");
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
    goNext();
  };

  const canProceed = localTemplate.subject.trim() && localTemplate.body.trim();

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Create Your Email Template</h2>
        <p className="text-muted-foreground mt-1">
          Compose your email with dynamic placeholders
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
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
                  <Code className="h-4 w-4" />
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
                  <div className="space-y-2">
                    <Label htmlFor="template-name">
                      Template Name (optional)
                    </Label>
                    <Input
                      id="template-name"
                      placeholder="e.g., Welcome Email, Newsletter..."
                      value={localTemplate.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      data-testid="input-template-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">
                      Subject Line <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="subject"
                        placeholder="Enter your email subject..."
                        value={localTemplate.subject}
                        onChange={(e) => handleChange("subject", e.target.value)}
                        className="pl-10"
                        data-testid="input-subject"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use placeholders like {"{{name}}"} for personalization
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-body">
                      Email Body <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="email-body"
                      placeholder="Write your email content here...

Use placeholders like {{name}} to personalize your message.

Example:
Hi {{name}},

I hope this message finds you well at {{company}}...

Best regards,
Your Team"
                      value={localTemplate.body}
                      onChange={(e) => handleChange("body", e.target.value)}
                      className="min-h-[300px] font-mono text-sm"
                      data-testid="input-body"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Subject
                    </p>
                    <p className="font-medium">{previewSubject || "No subject"}</p>
                  </div>
                  <Separator />
                  <div className="p-4 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                      Body
                    </p>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {previewBody || "No content"}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Preview using: {mappedData.name} ({mappedData.email})
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="border-card-border sticky top-24">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Type className="h-4 w-4" />
                Placeholders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Click to insert a placeholder at cursor position
              </p>
              {PLACEHOLDERS.map((placeholder) => (
                <Button
                  key={placeholder.key}
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={() => insertPlaceholder(placeholder.key)}
                  data-testid={`placeholder-${placeholder.label.toLowerCase()}`}
                >
                  <Badge variant="secondary" className="font-mono">
                    {placeholder.key}
                  </Badge>
                  <div className="text-left">
                    <p className="font-medium text-sm">{placeholder.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {placeholder.description}
                    </p>
                  </div>
                </Button>
              ))}

              <Separator className="my-4" />

              <div className="space-y-2">
                <p className="text-sm font-medium">Tips</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>- Personalized emails have higher open rates</li>
                  <li>- Keep subject lines under 50 characters</li>
                  <li>- Use a clear call-to-action</li>
                  <li>- Missing data shows the placeholder as-is</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={goBack} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          onClick={validateAndContinue} 
          disabled={!canProceed}
          data-testid="button-next-step"
        >
          Continue to AI Preview
        </Button>
      </div>
    </div>
  );
}
