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
import { AlertCircle, CheckCircle, ArrowLeft, Mail, User, Building, Tag } from "lucide-react";

const REQUIRED_FIELDS = [
  { key: "email", label: "Email Address", icon: Mail, required: true }
];

const OPTIONAL_FIELDS = [
  { key: "name", label: "Name", icon: User, required: false },
  { key: "company", label: "Company", icon: Building, required: false },
  { key: "category", label: "Category", icon: Tag, required: false }
];

export default function ColumnMapping() {
  const { contacts, columnMapping, setColumnMapping, goNext, goBack } = useCampaign();
  const [mapping, setMapping] = useState(columnMapping);
  const [error, setError] = useState("");

  const headers = contacts.length > 0 ? Object.keys(contacts[0]) : [];

  useEffect(() => {
    const autoMap = {};
    headers.forEach(header => {
      const lowerHeader = header.toLowerCase();
      if (lowerHeader.includes("email")) {
        autoMap.email = header;
      } else if (lowerHeader.includes("name") && !lowerHeader.includes("company")) {
        autoMap.name = header;
      } else if (lowerHeader.includes("company") || lowerHeader.includes("organization")) {
        autoMap.company = header;
      } else if (lowerHeader.includes("category") || lowerHeader.includes("type")) {
        autoMap.category = header;
      }
    });
    setMapping(prev => ({ ...autoMap, ...prev }));
  }, [headers]);

  const handleMappingChange = (field, value) => {
    setMapping(prev => ({
      ...prev,
      [field]: value === "none" ? undefined : value
    }));
    setError("");
  };

  const validateAndContinue = () => {
    if (!mapping.email) {
      setError("Email field mapping is required");
      return;
    }

    const sampleEmail = contacts[0]?.[mapping.email];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (sampleEmail && !emailRegex.test(sampleEmail)) {
      setError("The selected email column doesn't appear to contain valid email addresses");
      return;
    }

    setColumnMapping(mapping);
    goNext();
  };

  const allFields = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Map Your Columns</h2>
        <p className="text-muted-foreground mt-1">
          Match your CSV columns to the required fields
        </p>
      </div>

      <Card className="border-card-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            Field Mapping
            <Badge variant="secondary" className="ml-2">
              {headers.length} columns detected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {allFields.map((field) => {
            const Icon = field.icon;
            const selectedValue = mapping[field.key];
            const isValid = !field.required || selectedValue;

            return (
              <div key={field.key} className="flex items-center gap-4">
                <div className="flex items-center gap-3 w-48">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                  </div>
                </div>
                <div className="flex-1 max-w-xs">
                  <Select
                    value={selectedValue || "none"}
                    onValueChange={(value) => handleMappingChange(field.key, value)}
                  >
                    <SelectTrigger data-testid={`select-${field.key}`}>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Not mapped --</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-8">
                  {isValid && selectedValue && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {mapping.email && contacts.length > 0 && (
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Sample Data Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {contacts.slice(0, 3).map((contact, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-4 p-3 rounded-md bg-muted/50"
                >
                  <span className="text-sm font-medium w-8">{i + 1}.</span>
                  <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Email:</span>{" "}
                      <span className="font-medium">
                        {contact[mapping.email] || "-"}
                      </span>
                    </div>
                    {mapping.name && (
                      <div>
                        <span className="text-muted-foreground">Name:</span>{" "}
                        <span className="font-medium">
                          {contact[mapping.name] || "-"}
                        </span>
                      </div>
                    )}
                    {mapping.company && (
                      <div>
                        <span className="text-muted-foreground">Company:</span>{" "}
                        <span className="font-medium">
                          {contact[mapping.company] || "-"}
                        </span>
                      </div>
                    )}
                    {mapping.category && (
                      <div>
                        <span className="text-muted-foreground">Category:</span>{" "}
                        <span className="font-medium">
                          {contact[mapping.category] || "-"}
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
          disabled={!mapping.email}
          data-testid="button-next-step"
        >
          Continue to Template
        </Button>
      </div>
    </div>
  );
}
