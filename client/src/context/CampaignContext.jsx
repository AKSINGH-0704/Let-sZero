import { createContext, useContext, useState } from "react";

const CampaignContext = createContext(null);

// Exported so consumers can reference canonical defaults without duplicating them.
// resetCampaign() restores this state — including isDuplicate: false and listSnapshot: null,
// which guarantees duplicate-specific fields are fully cleared on reset.
export const INITIAL_STATE = {
  step: 1,
  contacts: [],
  columnMapping: {},
  template: {
    name: "",
    subject: "",
    body: ""
  },
  templateIsAiGenerated: false,
  campaignType: "general",
  aiPreviews: [],
  spamAnalysis: null,
  acceptedSuggestions: [],
  acceptedDetails: {},
  acceptedSnapshots: {}, // suggestion.original -> { subject, body } captured just
                         // before that suggestion was applied, so Undo can restore
                         // exact prior text rather than reverse-guessing a regex
  rejectedSuggestions: [], // dismissed, not applied — kept separate so a rejected
                           // suggestion doesn't keep reappearing every render
  aiAnalysis: null,
  campaignName: "",
  campaignId: null,
  campaignData: null,
  listId: null,
  saveToLibraryAs: null,
  // Wizard initialization state — set once from a ?duplicate= deep-link; never mutated mid-wizard.
  // isDuplicate: signals to FileUpload and TemplateBuilder that content was pre-filled.
  // listSnapshot: the source campaign's list snapshot, used only for count comparison at step 1.
  // Both are cleared by resetCampaign(). Do not add setters or repurpose these for general state.
  isDuplicate: false,
  listSnapshot: null,
};

export function CampaignProvider({ children, initialState: overrideState }) {
  const [campaignState, setCampaignState] = useState(() => ({
    ...INITIAL_STATE,
    ...(overrideState || {}),
  }));

  const setStep = (step) => {
    setCampaignState(prev => ({ ...prev, step }));
  };

  const setContacts = (contacts) => {
    setCampaignState(prev => ({ ...prev, contacts }));
  };

  const setColumnMapping = (mapping) => {
    setCampaignState(prev => ({ ...prev, columnMapping: mapping }));
  };

  const setTemplate = (updates) => {
    setCampaignState(prev => ({ ...prev, template: { ...prev.template, ...updates } }));
  };

  const setTemplateIsAiGenerated = (value) => {
    setCampaignState(prev => ({ ...prev, templateIsAiGenerated: value }));
  };

  const setCampaignType = (type) => {
    setCampaignState(prev => ({ ...prev, campaignType: type || "general" }));
  };

  const setAiPreviews = (previews) => {
    setCampaignState(prev => ({ ...prev, aiPreviews: previews }));
  };

  const setSpamAnalysis = (analysis) => {
    setCampaignState(prev => ({ ...prev, spamAnalysis: analysis }));
  };

  const setAcceptedSuggestions = (suggestions) => {
    setCampaignState(prev => ({ ...prev, acceptedSuggestions: suggestions }));
  };

  const setAcceptedDetails = (details) => {
    setCampaignState(prev => ({ ...prev, acceptedDetails: details }));
  };

  const setAcceptedSnapshots = (snapshots) => {
    setCampaignState(prev => ({ ...prev, acceptedSnapshots: snapshots }));
  };

  const setRejectedSuggestions = (suggestions) => {
    setCampaignState(prev => ({ ...prev, rejectedSuggestions: suggestions }));
  };

  const setAiAnalysis = (analysis) => {
    setCampaignState(prev => ({ ...prev, aiAnalysis: analysis }));
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

  const setListId = (id) => {
    setCampaignState(prev => ({ ...prev, listId: id }));
  };

  const setSaveToLibraryAs = (name) => {
    setCampaignState(prev => ({ ...prev, saveToLibraryAs: name }));
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
    setTemplateIsAiGenerated,
    setCampaignType,
    setAiPreviews,
    setSpamAnalysis,
    setAcceptedSuggestions,
    setAcceptedDetails,
    setAcceptedSnapshots,
    setRejectedSuggestions,
    setAiAnalysis,
    setCampaignName,
    setCampaignId,
    setCampaignData,
    setListId,
    setSaveToLibraryAs,
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
