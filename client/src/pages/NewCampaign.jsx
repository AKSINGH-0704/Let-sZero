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

function CampaignWizard() {
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
  return (
    <CampaignProvider>
      <CampaignWizard />
    </CampaignProvider>
  );
}
