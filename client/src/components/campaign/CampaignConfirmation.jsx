import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useCampaign } from "@/context/CampaignContext";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Shield
} from "lucide-react";
import { formatNumber, calculateCreditsRemaining, replacePlaceholders } from "@/lib/utils";

export default function CampaignConfirmation() {
  const [, setLocation] = useLocation();
  const { user, refetch: refetchUser } = useAuth();
  const { 
    contacts, 
    template, 
    columnMapping, 
    spamAnalysis, 
    goBack,
    setCampaignName,
    campaignName,
    setStep
  } = useCampaign();

  const [name, setName] = useState(campaignName || `Campaign ${new Date().toLocaleDateString()}`);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  const creditsRequired = contacts.length;
  const creditsAvailable = calculateCreditsRemaining(
    user?.creditsReceived || 0,
    user?.creditsAllocated || 0,
    user?.creditsUsed || 0
  );
  const hasEnoughCredits = creditsAvailable >= creditsRequired;
  const estimatedTime = Math.ceil(creditsRequired / 100);

  const sampleContact = contacts[0] || {};
  const mappedData = {
    name: sampleContact[columnMapping.name] || "Recipient",
    email: sampleContact[columnMapping.email] || "recipient@example.com",
    company: sampleContact[columnMapping.company] || "Company",
    category: sampleContact[columnMapping.category] || "Category"
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      const mappedContacts = contacts.map(contact => ({
        email: contact[columnMapping.email],
        name: contact[columnMapping.name],
        company: contact[columnMapping.company],
        category: contact[columnMapping.category]
      }));

      const res = await apiRequest("POST", "/api/campaigns", {
        name,
        template: {
          subject: template.subject,
          body: template.body
        },
        contacts: mappedContacts,
        totalEmails: contacts.length
      });
      return res.json();
    },
    onSuccess: (data) => {
      setCampaignName(name);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      refetchUser();
      setStep(7);
    },
    onError: (err) => {
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
    if (!hasEnoughCredits) {
      setError("Insufficient credits to send this campaign");
      return;
    }

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

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{formatNumber(contacts.length)}</p>
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
                  <span className="text-muted-foreground">Credits Required</span>
                  <span className="font-bold text-lg text-primary">-{formatNumber(creditsRequired)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-medium">After Campaign</span>
                  <span className={`font-bold text-lg ${hasEnoughCredits ? "text-green-600" : "text-red-600"}`}>
                    {formatNumber(creditsAvailable - creditsRequired)}
                  </span>
                </div>
              </div>

              {!hasEnoughCredits && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You need {formatNumber(creditsRequired - creditsAvailable)} more credits to send this campaign.
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
              <CardDescription>Sample of personalized email</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
                    <strong>{formatNumber(contacts.length)}</strong> recipients using{" "}
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

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={goBack} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          onClick={handleSend}
          disabled={!confirmed || !hasEnoughCredits || sendMutation.isPending}
          data-testid="button-send-campaign"
        >
          {sendMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting Campaign...
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
