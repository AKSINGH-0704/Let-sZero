import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import ImportErrorSummary from "@/components/common/ImportErrorSummary";
import { ArrowLeft, Upload, Trash2, Pencil, Search, ChevronLeft, ChevronRight, Users, FileText, Download, Loader2, AlertTriangle } from "lucide-react";

const CONTACT_FIELDS = ["email", "name", "company", "category"];

// Mirrors CAMPAIGN_MAX_CONTACTS in server/routes.js — a list larger than this
// cannot be used in a single campaign (POST /api/campaigns rejects it outright).
// Surfaced here so a customer learns this while managing the list, not only
// after investing a full trip through the campaign wizard.
const CAMPAIGN_MAX_CONTACTS = 10_000;

function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Import sheet ──────────────────────────────────────────────────────────────
// Supports CSV, XLSX, and XLS. Parses server-side via /api/contacts/parse-file
// (uses ExcelJS, the same engine as the campaign file-upload flow) so the
// server-side validation pipeline is shared regardless of file format.
// Multi-sheet workbooks show a worksheet picker before the column-mapping step.

function ImportSheet({ listId, open, onClose }) {
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [step, setStep] = useState("upload"); // upload | sheet | map | preview
  const [fileName, setFileName] = useState(null);
  const [fileHeaders, setFileHeaders] = useState([]);
  const [fileRows, setFileRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);
  const [sheetNames, setSheetNames] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [rawFileData, setRawFileData] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const reset = useCallback(() => {
    setStep("upload");
    setFileName(null);
    setFileHeaders([]);
    setFileRows([]);
    setMapping({});
    setImportResult(null);
    setImportError(null);
    setSheetNames(null);
    setSelectedSheet(null);
    setRawFileData(null);
    setIsParsing(false);
    setIsDragOver(false);
  }, []);

  const handleClose = () => { reset(); onClose(); };

  const applyParsedData = (headers, rows) => {
    setFileHeaders(headers);
    setFileRows(rows);
    const autoMap = {};
    CONTACT_FIELDS.forEach(field => {
      const match = headers.find(h => h.toLowerCase() === field);
      if (match) autoMap[field] = match;
    });
    setMapping(autoMap);
  };

  const parseFile = async (fileData, name, sheet) => {
    setIsParsing(true);
    try {
      const res = await fetch("/api/contacts/parse-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fileData, fileName: name, ...(sheet ? { sheet } : {}) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(body.message);
      }
      return await res.json();
    } finally {
      setIsParsing(false);
    }
  };

  const processFile = async (file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext)) {
      toast({ title: "Unsupported file type", description: "Please select a CSV, XLSX, or XLS file.", variant: "destructive" });
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 15 MB.", variant: "destructive" });
      return;
    }

    setFileName(file.name);
    setIsParsing(true);

    try {
      const fileData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        // readAsDataURL → "data:<mime>;base64,<payload>" — strip the prefix
        reader.onload = (ev) => resolve(ev.target.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const fd = { fileData, fileName: file.name };
      const result = await parseFile(fileData, file.name);
      setRawFileData(fd);
      applyParsedData(result.headers, result.rows);

      if (result.sheetNames) {
        setSheetNames(result.sheetNames);
        setStep("sheet");
      } else {
        setStep("map");
      }
    } catch (err) {
      toast({ title: "Could not read file", description: err.message, variant: "destructive" });
      reset();
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleSheetSelect = async (sheetName) => {
    setSelectedSheet(sheetName);
    try {
      const result = await parseFile(rawFileData.fileData, rawFileData.fileName, sheetName);
      applyParsedData(result.headers, result.rows);
      setStep("map");
    } catch (err) {
      toast({ title: "Could not read worksheet", description: err.message, variant: "destructive" });
      setSelectedSheet(null);
    }
  };

  const importMutation = useMutation({
    mutationFn: (payload) =>
      apiRequest("POST", `/api/contact-lists/${listId}/import`, payload).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-lists"] });
      queryClient.invalidateQueries({ queryKey: [`/api/contact-lists/${listId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/contact-lists/${listId}/contacts`] });
      queryClient.invalidateQueries({ queryKey: [`/api/contact-lists/${listId}/imports`] });
      setImportError(null);
      setImportResult(data);
      setStep("preview");
    },
    onError: (err) => {
      // Validation failures (e.g. NO_VALID_ROWS) come back as a JSON body with
      // structured row-level detail (err.body, from queryClient.js's centralized
      // parsing) — render it as a row list instead of a plain toast when present.
      if (err.body?.rowErrors) {
        setImportError(err.body);
        setStep("preview");
      } else {
        toast({ title: "Import failed", description: err.message, variant: "destructive" });
      }
    },
  });

  const handleImport = () => {
    const rows = fileRows.map(row => {
      const mapped = {};
      CONTACT_FIELDS.forEach(field => {
        if (mapping[field]) mapped[field] = row[mapping[field]] || "";
      });
      return mapped;
    });
    importMutation.mutate({ rows, source: "library_import", fileName });
  };

  return (
    <Sheet open={open} onOpenChange={open => !open && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Import contacts</SheetTitle>
        </SheetHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            {isParsing ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Reading file…</p>
              </div>
            ) : (
              <>
                <div
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors w-full ${
                    isDragOver
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary"
                  }`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                >
                  <Upload className={`w-8 h-8 mx-auto mb-3 ${isDragOver ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-sm font-medium">
                    {isDragOver ? "Drop to import" : "Click or drag and drop a file"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">CSV, XLSX, or XLS · Max 50,000 rows · 15 MB</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFile}
                />
              </>
            )}
          </div>
        )}

        {step === "sheet" && (
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              This workbook has multiple worksheets. Select the one containing your contacts.
            </p>
            {sheetNames.map(sheet => (
              <button
                key={sheet.name}
                className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/40 transition-colors text-sm flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => !isParsing && handleSheetSelect(sheet.name)}
                disabled={isParsing}
              >
                <div>
                  <span className="font-medium">{sheet.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ~{sheet.rowCount.toLocaleString()} rows
                  </span>
                </div>
                {isParsing && selectedSheet === sheet.name && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
                )}
              </button>
            ))}
            <div className="pt-2">
              <Button variant="outline" onClick={reset} disabled={isParsing}>← Back</Button>
            </div>
          </div>
        )}

        {step === "map" && (
          <div className="py-4 space-y-5">
            <p className="text-sm text-muted-foreground">
              Map your file columns to contact fields. <span className="font-medium text-foreground">Email is required.</span>
            </p>
            {CONTACT_FIELDS.map(field => (
              <div key={field} className="space-y-1.5">
                <Label className="capitalize">{field}{field === "email" ? " *" : ""}</Label>
                <Select
                  value={mapping[field] || "__none__"}
                  onValueChange={val => setMapping(m => ({ ...m, [field]: val === "__none__" ? undefined : val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="— skip —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— skip —</SelectItem>
                    {fileHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              {fileRows.length.toLocaleString()} rows in &ldquo;{fileName}&rdquo;
              {selectedSheet ? ` — sheet: ${selectedSheet}` : ""}
            </p>
            <SheetFooter className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (sheetNames) {
                    setSelectedSheet(null);
                    setStep("sheet");
                  } else {
                    reset();
                    if (fileRef.current) fileRef.current.value = "";
                  }
                }}
              >
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={!mapping.email || importMutation.isPending}
              >
                {importMutation.isPending ? "Importing…" : `Import ${fileRows.length.toLocaleString()} rows`}
              </Button>
            </SheetFooter>
          </div>
        )}

        {step === "preview" && importResult && (
          <div className="py-6 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Total rows", importResult.totalRows],
                ["New contacts", importResult.newContacts],
                ["Updated contacts", importResult.updatedContacts],
                ["Added to list", importResult.addedToList],
                ["Already in list", importResult.alreadyInList],
                ["Failed rows", importResult.failedRows],
              ].map(([label, val]) => (
                <Card key={label} className="p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold">{(val || 0).toLocaleString()}</p>
                </Card>
              ))}
            </div>
            <ImportErrorSummary
              totalRows={importResult.totalRows}
              failedRows={importResult.failedRows}
              rowErrors={importResult.rowErrors}
            />
            <SheetFooter>
              <Button onClick={handleClose}>Done</Button>
            </SheetFooter>
          </div>
        )}

        {step === "preview" && importError && (
          <div className="py-6 space-y-4">
            <ImportErrorSummary
              allFailed
              message={importError.message || "No valid email addresses found in the import file."}
              hint={importError.hint}
              totalRows={importError.totalRows}
              failedRows={importError.failedRows}
              rowErrors={importError.rowErrors}
            />
            <SheetFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setImportError(null); setStep("map"); }}
              >
                Back to mapping
              </Button>
              <Button variant="outline" onClick={handleClose}>Close</Button>
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Edit sheet ────────────────────────────────────────────────────────────────

function EditSheet({ contact, listId, open, onClose }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState("");

  // Sync form fields when contact changes (e.g. user opens edit for a second contact
  // before closing). No dirty-state confirmation on close — the contact's database
  // record is unmodified until Save is clicked, so discarding in-progress edits is
  // safe. This matches the ImportSheet pattern in this file.
  useEffect(() => {
    if (contact) {
      setName(contact.name || "");
      setCompany(contact.company || "");
      setCategory(contact.category || "");
    }
  }, [contact]);

  const editMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/contacts/${contact.id}`, { name, company, category }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contact-lists/${listId}/contacts`] });
      toast({ title: "Contact updated" });
      onClose();
    },
    onError: (err) =>
      toast({ title: "Failed to update contact", description: err.message, variant: "destructive" }),
  });

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit contact</SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Email (cannot be changed)</p>
            <p className="font-mono text-sm">{contact?.email}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Company</Label>
            <Input value={company} onChange={e => setCompany(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Input value={category} onChange={e => setCategory(e.target.value)} />
          </div>
        </div>
        <SheetFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => editMutation.mutate()} disabled={editMutation.isPending}>
            {editMutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ContactListDetail() {
  const [, params] = useRoute("/app/contacts/:id");
  const listId = params?.id;
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkRemoveConfirmOpen, setBulkRemoveConfirmOpen] = useState(false);

  const { data: list, isLoading: listLoading } = useQuery({
    queryKey: [`/api/contact-lists/${listId}`],
    queryFn: () => apiRequest("GET", `/api/contact-lists/${listId}`).then(r => r.json()),
    enabled: !!listId,
  });

  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: [`/api/contact-lists/${listId}/contacts`, page, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (search) params.set("search", search);
      return apiRequest("GET", `/api/contact-lists/${listId}/contacts?${params}`).then(r => r.json());
    },
    enabled: !!listId,
    keepPreviousData: true,
  });

  const removeMutation = useMutation({
    mutationFn: (contactId) => apiRequest("DELETE", `/api/contact-lists/${listId}/contacts/${contactId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/contact-lists/${listId}/contacts`] });
      queryClient.invalidateQueries({ queryKey: [`/api/contact-lists/${listId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/contact-lists"] });
      setRemoveTarget(null);
      toast({ title: "Contact removed from list" });
    },
    onError: (err) => toast({ title: "Failed to remove contact", description: err.message, variant: "destructive" }),
  });

  const bulkRemoveMutation = useMutation({
    mutationFn: (contactIds) => apiRequest("POST", `/api/contact-lists/${listId}/bulk-remove`, { contactIds }),
    onSuccess: (_, contactIds) => {
      queryClient.invalidateQueries({ queryKey: [`/api/contact-lists/${listId}/contacts`] });
      queryClient.invalidateQueries({ queryKey: [`/api/contact-lists/${listId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/contact-lists"] });
      setBulkRemoveConfirmOpen(false);
      setSelectedIds(new Set());
      toast({ title: `${contactIds.length.toLocaleString()} contact${contactIds.length === 1 ? "" : "s"} removed from list` });
    },
    onError: (err) => toast({ title: "Failed to remove contacts", description: err.message, variant: "destructive" }),
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  // Selections are scoped to what's currently on screen — a contact selected
  // on one page/search result set that's no longer visible after navigating
  // away would be a confusing thing to still have "selected" and act on.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, search]);

  const toggleOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = (rows) => {
    setSelectedIds(prev => {
      const allSelected = rows.length > 0 && rows.every(r => prev.has(r.id));
      return allSelected ? new Set() : new Set(rows.map(r => r.id));
    });
  };

  const handleExport = () => {
    window.location.href = `/api/contact-lists/${listId}/export`;
  };

  const rows = contactsData?.rows || [];
  const total = contactsData?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / 50));

  if (listLoading) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  if (!list) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-8 text-center text-muted-foreground">
          List not found.
          <Link href="/app/contacts"><Button variant="link" className="ml-2">Back to Contacts</Button></Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <Link href="/app/contacts">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{list.name}</h1>
        </div>
        <div className="flex items-center gap-4 ml-11 mb-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {(list.contactCount ?? 0).toLocaleString()} contacts
          </span>
          <span>Created {formatDate(list.createdAt)}</span>
        </div>

        {/* Campaign-capacity warning — actionable, not just informational: explains
            the actual limit and what to do about it, so a customer learns this while
            managing the list rather than discovering it mid-campaign-creation. */}
        {(list.contactCount ?? 0) > CAMPAIGN_MAX_CONTACTS && (
          <div className="flex items-start gap-2.5 ml-11 mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-800 dark:text-amber-300">
              This list has {(list.contactCount ?? 0).toLocaleString()} contacts, but a single campaign currently supports up to {CAMPAIGN_MAX_CONTACTS.toLocaleString()} recipients. Split it into two or more lists of {CAMPAIGN_MAX_CONTACTS.toLocaleString()} or fewer to reach everyone — a campaign built from this list as-is won't be able to start.
            </p>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search email or name…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>Search</Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export
            </Button>
            <Button size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Import
            </Button>
          </div>
        </div>

        {/* Bulk action bar — only visible with an active selection */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between gap-3 mb-3 px-3 py-2 rounded-lg bg-muted border border-border text-sm">
            <span className="font-medium">{selectedIds.size.toLocaleString()} selected</span>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear selection
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setBulkRemoveConfirmOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Remove selected
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {contactsLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : rows.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
                {search ? "No contacts match your search." : "No contacts in this list yet. Import a CSV, XLSX, or XLS file to get started."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={rows.length > 0 && rows.every(r => selectedIds.has(r.id))}
                        onCheckedChange={() => toggleAllOnPage(rows)}
                        aria-label="Select all contacts on this page"
                      />
                    </TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(contact => (
                    <TableRow key={contact.id} data-state={selectedIds.has(contact.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(contact.id)}
                          onCheckedChange={() => toggleOne(contact.id)}
                          aria-label={`Select ${contact.email}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{contact.email}</TableCell>
                      <TableCell className="text-sm">{contact.name || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-sm">{contact.company || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(contact.addedAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => setEditTarget(contact)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setRemoveTarget(contact)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>{total.toLocaleString()} total · page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ImportSheet listId={listId} open={importOpen} onClose={() => setImportOpen(false)} />
      <EditSheet contact={editTarget} listId={listId} open={!!editTarget} onClose={() => setEditTarget(null)} />

      <AlertDialog open={!!removeTarget} onOpenChange={open => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove contact?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono">{removeTarget?.email}</span> will be removed from this list.
              The contact record itself is preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeMutation.mutate(removeTarget.id)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkRemoveConfirmOpen} onOpenChange={setBulkRemoveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {selectedIds.size.toLocaleString()} contact{selectedIds.size === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedIds.size.toLocaleString()} contact{selectedIds.size === 1 ? "" : "s"} will be removed from <span className="font-medium text-foreground">{list.name}</span>. This cannot be undone. Only the selected contacts are removed from this list — the contact records themselves are preserved and unaffected in any other list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkRemoveMutation.isPending}
              onClick={() => bulkRemoveMutation.mutate(Array.from(selectedIds))}
            >
              {bulkRemoveMutation.isPending ? "Removing…" : `Remove ${selectedIds.size.toLocaleString()}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
