import { useState, useCallback, useRef } from "react";
import { useCampaign } from "@/context/CampaignContext";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { parseCSV, cn } from "@/lib/utils";

export default function FileUpload() {
  const { setContacts, goNext, contacts } = useCampaign();
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [preview, setPreview] = useState({ headers: [], rows: [] });
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

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

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Upload Your Contact List</h2>
        <p className="text-muted-foreground mt-1">
          Upload CSV or Excel files (.csv, .xlsx, .xls). Max size 10MB.
        </p>
      </div>

      {isLoading ? (
        <div className="border-2 border-dashed rounded-lg p-12 text-center border-border">
          <Loader2 className="h-12 w-12 mx-auto text-primary mb-4 animate-spin" />
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
            "border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer",
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
          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">
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

      <div className="flex justify-end gap-4 pt-4">
        <Button
          onClick={goNext}
          disabled={!canProceed}
          data-testid="button-next-step"
        >
          Continue to Column Mapping
        </Button>
      </div>
    </div>
  );
}
