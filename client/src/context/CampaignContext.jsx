import { createContext, useContext, useState } from "react";

const CampaignContext = createContext(null);

const INITIAL_STATE = {
  step: 1,
  contacts: [],
  columnMapping: {},
  template: {
    name: "",
    subject: "",
    body: ""
  },
  aiPreviews: [],
  spamAnalysis: null,
  campaignName: "",
  campaignId: null,
  campaignData: null
};

export function CampaignProvider({ children }) {
  const [campaignState, setCampaignState] = useState(INITIAL_STATE);

  const setStep = (step) => {
    setCampaignState(prev => ({ ...prev, step }));
  };

  const setContacts = (contacts) => {
    setCampaignState(prev => ({ ...prev, contacts }));
  };

  const setColumnMapping = (mapping) => {
    setCampaignState(prev => ({ ...prev, columnMapping: mapping }));
  };

  const setTemplate = (template) => {
    setCampaignState(prev => ({ ...prev, template: { ...prev.template, ...template } }));
  };

  const setAiPreviews = (previews) => {
    setCampaignState(prev => ({ ...prev, aiPreviews: previews }));
  };

  const setSpamAnalysis = (analysis) => {
    setCampaignState(prev => ({ ...prev, spamAnalysis: analysis }));
  };

  const setCampaignName = (name) => {
    setCampaignState(prev => ({ ...prev, campaignName: name }));
  };

  const setCampaignId = (id) => {
    setCampaignState(prev => ({ ...prev, campaignId: id }));
  };

  const setCampaignData = (data) => {
    setCampaignState(prev => ({ ...prev, campaignData: data }));
  };

  const resetCampaign = () => {
    setCampaignState(INITIAL_STATE);
  };

  const goNext = () => {
    setCampaignState(prev => ({ ...prev, step: prev.step + 1 }));
  };

  const goBack = () => {
    setCampaignState(prev => ({ ...prev, step: Math.max(1, prev.step - 1) }));
  };

  const value = {
    ...campaignState,
    setStep,
    setContacts,
    setColumnMapping,
    setTemplate,
    setAiPreviews,
    setSpamAnalysis,
    setCampaignName,
    setCampaignId,
    setCampaignData,
    resetCampaign,
    goNext,
    goBack
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error("useCampaign must be used within a CampaignProvider");
  }
  return context;
}
