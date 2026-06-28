import { useState, useEffect } from "react";
import { useCampaign } from "@/context/CampaignContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Mail,
  User,
  Building,
  Tag,
  Info,
} from "lucide-react";

// ─── Field definitions ────────────────────────────────────────────────────────
// description: always-visible business explanation (no tech jargon)
// unmappedConsequence: shown below the select when field is left unmapped
// tooltip: one sentence, reinforces value without repeating the label
const FIELDS = [
  {
    key: "email",
    label: "Email Address",
    icon: Mail,
    status: "required",
    required: true,
    description: "The recipient's email address. Required for campaign delivery.",
    unmappedConsequence: null,
    tooltip: "Every contact must have a valid email address to receive your campaign.",
  },
  {
    key: "name",
    label: "Name",
    icon: User,
    status: "recommended",
    required: false,
    description: "Allows personalized greetings and more human outreach.",
    unmappedConsequence: "Emails will use generic greetings instead of the recipient's name.",
    tooltip: "Used to personalize subject lines and email body with the recipient's name.",
  },
  {
    key: "company",
    label: "Company",
    icon: Building,
    status: "optional",
    required: false,
    description: "Useful for B2B outreach and company-specific messaging.",
    unmappedConsequence: "Company name personalization will be unavailable.",
    tooltip: "Reference the recipient's company name in your email templates.",
  },
  {
    key: "category",
    label: "Category",
    icon: Tag,
    status: "optional",
    required: false,
    description: "Helps organize contacts into groups for more targeted sending.",
    unmappedConsequence: "Audience segmentation and filtering will be limited.",
    tooltip: "Groups contacts for filtering and targeting in future campaigns.",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusLabel({ status }) {
  if (status === "required") {
    return (
      <span className="text-xs font-medium text-destructive">Required</span>
    );
  }
  if (status === "recommended") {
    return (
      <span className="text-xs font-medium text-amber-600 dark:text-amber-500">
        Recommended
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">Optional</span>;
}

// One-line hint below the select: suggestion takes priority over consequence.
// For email (required), readiness summary handles the missing-state messaging.
function FieldHint({ field, mapped, suggestion }) {
  if (mapped || field.key === "email") return null;

  if (suggestion) {
    return (
      <p className="text-xs text-muted-foreground">
        Suggested:{" "}
        <span className="font-medium">{suggestion}</span>
      </p>
    );
  }

  if (field.unmappedConsequence) {
    return (
      <p className="text-xs text-muted-foreground">
        Not mapped — {field.unmappedConsequence.charAt(0).toLowerCase()}
        {field.unmappedConsequence.slice(1)}
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">No matching column detected.</p>
  );
}

// Compact send-readiness summary rendered at the bottom of the mapping card.
function ReadinessSummary({ mapping }) {
  const emailMapped = !!mapping.email;

  return (
    <div className="border-t pt-4 mt-1">
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-3">
        {FIELDS.map((field) => {
          const mapped = !!mapping[field.key];
          return (
            <div key={field.key} className="flex items-center gap-1.5 text-sm">
              {mapped ? (
                <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
              ) : (
                <div aria-hidden="true" className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
              )}
              <span className={mapped ? "text-foreground" : "text-muted-foreground"}>
                {field.label}
              </span>
            </div>
          );
        })}
      </div>
      {emailMapped ? (
        <p className="text-sm font-medium text-green-700 dark:text-green-500">
          Ready to continue
        </p>
      ) : (
        <p className="text-sm font-medium text-destructive">
          Email Address must be mapped before you can continue.
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ColumnMapping() {
  const { contacts, columnMapping, setColumnMapping, goNext, goBack } = useCampaign();
  const [mapping, setMapping] = useState(columnMapping);
  const [suggestions, setSuggestions] = useState({});
  const [error, setError] = useState("");
  const [validationSummary, setValidationSummary] = useState(null);

  const headers = contacts.length > 0 ? Object.keys(contacts[0]) : [];

  // Auto-map on first load; record suggestions separately so we can show
  // "Suggested: X" even after the user manually clears a pre-filled field.
  useEffect(() => {
    const autoMap = {};
    const sugg = {};
    headers.forEach((header) => {
      const h = header.toLowerCase();
      if (h.includes("email")) {
        autoMap.email = header;
        sugg.email = header;
      } else if (h.includes("name") && !h.includes("company")) {
        autoMap.name = header;
        sugg.name = header;
      } else if (h.includes("company") || h.includes("organization")) {
        autoMap.company = header;
        sugg.company = header;
      } else if (h.includes("category") || h.includes("type")) {
        autoMap.category = header;
        sugg.category = header;
      }
    });
    setMapping((prev) => ({ ...autoMap, ...prev }));
    setSuggestions(sugg);
  }, [headers]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMappingChange = (field, value) => {
    setMapping((prev) => ({
      ...prev,
      [field]: value === "none" ? undefined : value,
    }));
    setError("");
    setValidationSummary(null);
  };

  const validateAndContinue = () => {
    if (!mapping.email) {
      setError("Email Address must be mapped before you can continue.");
      setValidationSummary(null);
      return;
    }

    let blank = 0, invalid = 0, valid = 0;
    const sampleIssues = [];

    contacts.forEach((contact, idx) => {
      const raw = contact[mapping.email];
      const val = typeof raw === "string" ? raw.trim() : String(raw ?? "").trim();
      if (!val) {
        blank++;
        if (sampleIssues.length < 5) sampleIssues.push({ row: idx + 1, issue: "blank" });
      } else if (!EMAIL_REGEX.test(val)) {
        invalid++;
        if (sampleIssues.length < 5) sampleIssues.push({ row: idx + 1, issue: "invalid", value: val });
      } else {
        valid++;
      }
    });

    if (valid === 0) {
      setError("No valid email addresses found in this column. Select a different column or re-upload your file.");
      setValidationSummary(null);
      return;
    }

    if (blank + invalid > 0) {
      setError("");
      setValidationSummary({ total: contacts.length, valid, blank, invalid, sampleIssues });
      return;
    }

    setError("");
    setValidationSummary(null);
    setColumnMapping(mapping);
    goNext();
  };

  const continueWithValid = () => {
    setColumnMapping(mapping);
    goNext();
  };

  return (
    <div className="space-y-5">
      {/* ── Page title ───────────────────────────────────────────────────────── */}
      <div className="text-center">
        <h2 className="text-xl font-semibold">Map Your Columns</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Match your CSV columns to the required fields
        </p>
      </div>

      {/* ── Phase 1: Header guidance ─────────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-lg border bg-muted/40 px-4 py-3">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-muted-foreground leading-snug">
            Select the column from your CSV that best matches each RepMail
            field. Only <span className="font-medium text-foreground">Email Address</span> is
            required to send a campaign.
          </p>
        </div>
      </div>

      {/* ── Phase 2–5: Field mapping card ────────────────────────────────────── */}
      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Field Mapping
            <Badge variant="secondary" className="ml-1 text-xs font-normal">
              {headers.length} columns detected
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          {FIELDS.map((field) => {
            const Icon = field.icon;
            const selectedValue = mapping[field.key];

            return (
              <div
                key={field.key}
                className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4"
              >
                {/* Left: field identity — label, status, description */}
                <div className="flex items-start gap-3 w-full sm:w-56 shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted mt-0.5 shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    {/* Label + tooltip trigger */}
                    <div className="flex items-center gap-1.5">
                      <Label className="text-sm font-medium leading-none cursor-default">
                        {field.label}
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label={`About ${field.label}`}
                            className="cursor-help inline-flex items-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
                          >
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="right"
                          sideOffset={8}
                          className="max-w-52 text-xs leading-relaxed"
                        >
                          {field.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    {/* Status: always visible */}
                    <StatusLabel status={field.status} />
                    {/* Description: always visible, no hover required */}
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                      {field.description}
                    </p>
                  </div>
                </div>

                {/* Right: select + auto-detect or unmapped consequence */}
                <div className="w-full sm:flex-1 sm:max-w-xs space-y-1.5">
                  <Select
                    value={selectedValue || "none"}
                    onValueChange={(value) => handleMappingChange(field.key, value)}
                  >
                    <SelectTrigger data-testid={`select-${field.key}`}>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Skip this field</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <FieldHint
                    field={field}
                    mapped={!!selectedValue}
                    suggestion={suggestions[field.key]}
                  />
                </div>

                {/* Mapped checkmark (desktop only) */}
                <div className="hidden sm:flex items-start pt-1.5 w-8 shrink-0">
                  {selectedValue && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>
              </div>
            );
          })}

          {/* Phase 6: Send readiness summary */}
          <ReadinessSummary mapping={mapping} />
        </CardContent>
      </Card>

      {/* ── Sample data preview (unchanged) ──────────────────────────────────── */}
      {mapping.email && contacts.length > 0 && (
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sample Data Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {contacts.slice(0, 3).map((contact, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-3 rounded-md bg-muted/50"
                >
                  <span className="text-sm font-medium w-6 text-muted-foreground">
                    {i + 1}.
                  </span>
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Email:</span>{" "}
                      <span className="font-medium">
                        {contact[mapping.email] || "—"}
                      </span>
                    </div>
                    {mapping.name && (
                      <div>
                        <span className="text-muted-foreground">Name:</span>{" "}
                        <span className="font-medium">
                          {contact[mapping.name] || "—"}
                        </span>
                      </div>
                    )}
                    {mapping.company && (
                      <div>
                        <span className="text-muted-foreground">Company:</span>{" "}
                        <span className="font-medium">
                          {contact[mapping.company] || "—"}
                        </span>
                      </div>
                    )}
                    {mapping.category && (
                      <div>
                        <span className="text-muted-foreground">Category:</span>{" "}
                        <span className="font-medium">
                          {contact[mapping.category] || "—"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Validation error ──────────────────────────────────────────────────── */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Validation summary (some contacts will be skipped) ────────────────── */}
      {validationSummary && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          <AlertDescription className="space-y-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
              {validationSummary.valid} of {validationSummary.total}{" "}
              {validationSummary.total === 1 ? "contact has" : "contacts have"} a valid email.{" "}
              {validationSummary.blank + validationSummary.invalid}{" "}
              {validationSummary.blank + validationSummary.invalid === 1 ? "row" : "rows"} will be skipped.
            </p>
            <ul className="text-xs text-amber-700 dark:text-amber-500 space-y-0.5 list-none">
              {validationSummary.blank > 0 && (
                <li>• {validationSummary.blank} blank {validationSummary.blank === 1 ? "entry" : "entries"}</li>
              )}
              {validationSummary.invalid > 0 && (
                <li>• {validationSummary.invalid} invalid email {validationSummary.invalid === 1 ? "format" : "formats"}</li>
              )}
              {validationSummary.sampleIssues.map((issue, i) => (
                <li key={i} className="font-mono pl-3">
                  Row {issue.row}: {issue.issue === "blank" ? "blank" : `"${issue.value}"`}
                </li>
              ))}
              {(validationSummary.blank + validationSummary.invalid) > validationSummary.sampleIssues.length && (
                <li className="pl-3">
                  …and {(validationSummary.blank + validationSummary.invalid) - validationSummary.sampleIssues.length} more
                </li>
              )}
            </ul>
            <Button
              size="sm"
              onClick={continueWithValid}
              data-testid="button-continue-valid"
            >
              Continue with {validationSummary.valid}{" "}
              {validationSummary.valid === 1 ? "contact" : "contacts"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Navigation ───────────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={goBack} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {!validationSummary && (
          <Button
            onClick={validateAndContinue}
            disabled={!mapping.email}
            data-testid="button-next-step"
          >
            Continue to Template
          </Button>
        )}
      </div>
    </div>
  );
}
