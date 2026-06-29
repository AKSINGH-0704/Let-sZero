import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCampaign } from "@/context/CampaignContext";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle, Loader2, BookUser, Users, Info } from "lucide-react";
import { parseCSV, cn } from "@/lib/utils";

export default function FileUpload() {
  const { setContacts, goNext, contacts, setListId, setSaveToLibraryAs, setStep, listId: contextListId, listSnapshot: contextListSnapshot, isDuplicate } = useCampaign();
  const [tab, setTab] = useState(contextListId ? "library" : "upload");
  const [selectedListId, setSelectedListId] = useState(contextListId || null);
  const [saveAs, setSaveAs] = useState("");
  const [saveAsEnabled, setSaveAsEnabled] = useState(false);

  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [preview, setPreview] = useState({ headers: [], rows: [] });
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const { data: contactLists = [], isLoading: contactListsLoading } = useQuery({
    queryKey: ["/api/contact-lists"],
    queryFn: () => apiRequest("GET", "/api/contact-lists").then(r => r.json()),
    enabled: tab === "library",
  });

  const selectedList = contactLists.find(l => l.id === selectedListId);
  const canContinueLibrary = !!selectedListId && !!selectedList;

  const showCountComparison = isDuplicate
    && selectedListId === contextListId
    && !!selectedList
    && contextListSnapshot?.contactCount !== undefined
    && selectedList.contactCount !== contextListSnapshot.contactCount;

  const originalListMissing = isDuplicate
    && !!contextListId
    && tab === "library"
    && !contactListsLoading
    && !contactLists.find(l => l.id === contextListId);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const getFileType = (fileName) => {
    const ext = fileName.toLowerCase().split(".").pop();
    if (ext === "csv" || ext === "txt") return "CSV";
    if (ext === "xlsx" || ext === "xls") return "Excel";
    return null;
  };

  const processFile = useCallback(async (file) => {
    setError("");
    setIsLoading(true);
    
    const type = getFileType(file.name);
    if (!type) {
      setError("Please upload a CSV or Excel file (.csv, .xlsx, .xls)");
      setIsLoading(false);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      setIsLoading(false);
      return;
    }

    try {
      if (type === "CSV") {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target.result;
            const { headers, rows } = parseCSV(text);
            
            if (headers.length === 0) {
              setError("File appears to be empty or invalid");
              setIsLoading(false);
              return;
            }

            setFile(file);
            setFileType("CSV");
            setPreview({ headers, rows: rows.slice(0, 5) });
            setContacts(rows);
            setIsLoading(false);
          } catch (err) {
            setError("Failed to parse CSV file. Please check the format.");
            setIsLoading(false);
          }
        };
        reader.readAsText(file);
      } else {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const base64 = e.target.result.split(",")[1];
            const response = await apiRequest("POST", "/api/parse-excel", {
              fileData: base64,
              fileName: file.name
            });
            const data = await response.json();
            
            if (!data.headers || data.headers.length === 0) {
              setError("Excel file appears to be empty or invalid");
              setIsLoading(false);
              return;
            }

            setFile(file);
            setFileType("Excel");
            setPreview({ headers: data.headers, rows: data.rows.slice(0, 5) });
            setContacts(data.rows);
            setIsLoading(false);
          } catch (err) {
            setError("Failed to parse Excel file. Please check the format.");
            setIsLoading(false);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      setError("Failed to process file. Please try again.");
      setIsLoading(false);
    }
  }, [setContacts]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  }, [processFile]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const clearFile = () => {
    setFile(null);
    setFileType(null);
    setPreview({ headers: [], rows: [] });
    setContacts([]);
    setError("");
  };

  const canProceed = contacts.length > 0 && !error;

  const handleLibraryContinue = () => {
    if (!selectedListId) return;
    setListId(selectedListId);
    setSaveToLibraryAs(null);
    // Skip ColumnMapping (step 2) — contacts come from the library
    setStep(3);
  };

  const handleUploadContinue = () => {
    setSaveToLibraryAs(saveAsEnabled && saveAs.trim() ? saveAs.trim() : null);
    setListId(null);
    goNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Add Contacts</h2>
        <p className="text-muted-foreground mt-1">
          Upload a new list or choose an existing one from your library.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-lg border border-border overflow-hidden mb-4">
        <button
          className={cn(
            "flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
            tab === "upload"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setTab("upload")}
        >
          <Upload className="w-4 h-4" />
          Upload file
        </button>
        <button
          className={cn(
            "flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
            tab === "library"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setTab("library")}
        >
          <BookUser className="w-4 h-4" />
          Contacts
        </button>
      </div>

      {/* Library tab */}
      {tab === "library" && (
        <div className="space-y-4">
          {originalListMissing && (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
              <AlertDescription className="text-amber-800 dark:text-amber-300">
                The original contact list is no longer available. Select another list or upload contacts to continue creating this campaign.
              </AlertDescription>
            </Alert>
          )}
          {contactLists.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No contact lists yet.</p>
              <p className="text-xs mt-1">
                Go to <a href="/app/contacts" className="underline text-primary" target="_blank" rel="noreferrer">Contacts</a> to create and import lists.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {contactLists.map(list => (
                <button
                  key={list.id}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-colors",
                    selectedListId === list.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                  onClick={() => setSelectedListId(list.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{list.name}</span>
                    <span className="text-xs text-muted-foreground">{(list.contactCount || 0).toLocaleString()} contacts</span>
                  </div>
                </button>
              ))}
              {showCountComparison && (
                <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-950/20">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-blue-800 dark:text-blue-300 text-sm">
                    <span className="font-medium">
                      Original campaign reached {contextListSnapshot.contactCount.toLocaleString()} contacts.
                      This list now has {selectedList.contactCount.toLocaleString()}.
                    </span>{" "}
                    This new campaign will use the list as it exists today. Contacts added since the original campaign will be included, and contacts removed since then will not receive this campaign.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button onClick={handleLibraryContinue} disabled={!canContinueLibrary}>
              Continue to Template
            </Button>
          </div>
        </div>
      )}

      {/* Upload tab */}
      {tab === "upload" && (<>


      {isLoading ? (
        <div className="border-2 border-dashed rounded-lg p-6 sm:p-12 text-center border-border">
          <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-primary mb-4 animate-spin" />
          <p className="text-lg font-medium mb-2">Processing your file...</p>
          <p className="text-sm text-muted-foreground">
            This may take a moment for larger files
          </p>
        </div>
      ) : !file ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 sm:p-8 md:p-12 text-center transition-colors cursor-pointer",
            isDragOver 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-primary/50"
          )}
          onClick={handleBrowseClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-file-upload"
          />
          <Upload className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-base sm:text-lg font-medium mb-2">
            Drag and drop your file here
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Supports CSV and Excel files
          </p>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Badge variant="secondary" className="font-mono text-xs">.csv</Badge>
            <Badge variant="secondary" className="font-mono text-xs">.xlsx</Badge>
            <Badge variant="secondary" className="font-mono text-xs">.xls</Badge>
          </div>
          <Button 
            variant="outline" 
            type="button" 
            onClick={(e) => {
              e.stopPropagation();
              handleBrowseClick();
            }}
            data-testid="button-browse-files"
          >
            Browse Files
          </Button>
        </div>
      ) : (
        <Card className="border-card-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{file.name}</p>
                    <Badge 
                      variant={fileType === "Excel" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {fileType}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {contacts.length} contacts found
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={clearFile}
                data-testid="button-clear-file"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {preview.rows.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <div className="bg-muted px-4 py-2 text-sm font-medium">
                  Preview (first 5 rows)
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {preview.headers.map((header, i) => (
                          <TableHead key={i} className="whitespace-nowrap">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.rows.map((row, i) => (
                        <TableRow key={i}>
                          {preview.headers.map((header, j) => (
                            <TableCell key={j} className="whitespace-nowrap">
                              {row[header] || "-"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {canProceed && (
        <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-400">
            {contacts.length} contacts ready for import
          </AlertDescription>
        </Alert>
      )}

      {canProceed && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="save-to-library"
            checked={saveAsEnabled}
            onChange={e => setSaveAsEnabled(e.target.checked)}
            className="rounded border-border"
          />
          <Label htmlFor="save-to-library" className="text-sm font-normal cursor-pointer">
            Save to Contacts as
          </Label>
          {saveAsEnabled && (
            <Input
              placeholder="List name…"
              value={saveAs}
              onChange={e => setSaveAs(e.target.value)}
              className="h-7 text-sm max-w-xs"
            />
          )}
        </div>
      )}

      <div className="flex justify-end gap-4 pt-4">
        <Button
          onClick={handleUploadContinue}
          disabled={!canProceed}
          data-testid="button-next-step"
        >
          Continue to Column Mapping
        </Button>
      </div>
      </>)}
    </div>
  );
}
