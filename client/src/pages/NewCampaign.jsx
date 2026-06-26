import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CampaignProvider, useCampaign } from "@/context/CampaignContext";
import AppLayout from "@/components/layout/AppLayout";
import StepIndicator from "@/components/campaign/StepIndicator";
import FileUpload from "@/components/campaign/FileUpload";
import ColumnMapping from "@/components/campaign/ColumnMapping";
import TemplateBuilder from "@/components/campaign/TemplateBuilder";
import AiPreview from "@/components/campaign/AiPreview";
import SpamAnalyzer from "@/components/campaign/SpamAnalyzer";
import CampaignConfirmation from "@/components/campaign/CampaignConfirmation";
import ProgressTracker from "@/components/campaign/ProgressTracker";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { useSearchParam } from "@/lib/useSearchParam";

// Deep-link pattern: ?duplicate=<campaignId> pre-fills the wizard from a prior
// campaign's immutable snapshot. This is the platform's first deep-link workflow.
// Future flows that pre-initialize the wizard (templates, sequences, re-engagement
// campaigns) should reuse this same pattern: read a URL param, gate on the fetch,
// pass a partial initialState override to CampaignProvider.

function CampaignWizard({ duplicateFailed }) {
  const { step } = useCampaign();

  const renderStep = () => {
    switch (step) {
      case 1:
        return <FileUpload />;
      case 2:
        return <ColumnMapping />;
      case 3:
        return <TemplateBuilder />;
      case 4:
        return <AiPreview />;
      case 5:
        return <SpamAnalyzer />;
      case 6:
        return <CampaignConfirmation />;
      case 7:
        return <ProgressTracker />;
      default:
        return <FileUpload />;
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {duplicateFailed && (
          <Alert className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertDescription className="text-amber-800 dark:text-amber-300">
              The source campaign could not be loaded — creating a new campaign.
            </AlertDescription>
          </Alert>
        )}
        <StepIndicator currentStep={step} />
        <Card className="border-card-border">
          <CardContent className="p-6 md:p-8">
            {renderStep()}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function NewCampaign() {
  // Deep-link: read ?duplicate=<id> via the routing layer (wouter useSearch),
  // never via window.location directly.
  const duplicateId = useSearchParam("duplicate");

  // templateSnapshot and listSnapshot are immutable once a campaign terminates.
  // The global queryClient staleTime is already Infinity, so cached campaign data
  // (e.g. from the History detail dialog) is served immediately without refetch.
  // For cold starts (direct URL), a normal fetch runs against the server.
  const { data: sourceCampaign, isLoading, isError } = useQuery({
    queryKey: ["/api/campaigns", duplicateId],
    enabled: !!duplicateId,
  });

  const initialState = useMemo(() => {
    if (!duplicateId || !sourceCampaign) return undefined;
    const snap = sourceCampaign.templateSnapshot || {};
    // Strip trailing "(Copy)" chains before appending — prevents "Name (Copy) (Copy)".
    // Group the full \s*\(Copy\) unit with () so + applies to the whole token, not just \).
    const baseName = (sourceCampaign.name || "").replace(/(\s*\(Copy\))+\s*$/i, "").trim();
    return {
      template: {
        name: snap.name || "",
        subject: snap.subject || "",
        body: snap.body || "",
      },
      templateIsAiGenerated: false,
      listId: sourceCampaign.listId || null,
      listSnapshot: sourceCampaign.listSnapshot || null,
      campaignName: `${baseName} (Copy)`.trim(),
      isDuplicate: true,
      saveToLibraryAs: null,
    };
  }, [duplicateId, sourceCampaign]);

  // Gate render until the source campaign resolves so CampaignProvider receives
  // the correct initialState on first mount. useState only reads initialState once.
  if (duplicateId && isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <CampaignProvider initialState={initialState}>
      <CampaignWizard duplicateFailed={!!(duplicateId && isError)} />
    </CampaignProvider>
  );
}
