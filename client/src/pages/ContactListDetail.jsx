import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, Upload, Trash2, Search, ChevronLeft, ChevronRight, Users, FileText, Download } from "lucide-react";

// ── CSV parse helpers ─────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cols[i] || ""; });
    return obj;
  });
  return { headers, rows };
}

const CONTACT_FIELDS = ["email", "name", "company", "category"];

function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Import sheet ──────────────────────────────────────────────────────────────

function ImportSheet({ listId, open, onClose }) {
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [step, setStep] = useState("upload"); // upload | map | preview
  const [fileName, setFileName] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importResult, setImportResult] = useState(null);

  const reset = useCallback(() => {
    setStep("upload");
    setFileName(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
    setImportResult(null);
  }, []);

  const handleClose = () => { reset(); onClose(); };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { headers, rows } = parseCSV(ev.target.result);
      setCsvHeaders(headers);
      setCsvRows(rows);
      const autoMap = {};
      CONTACT_FIELDS.forEach(field => {
        const match = headers.find(h => h.toLowerCase() === field);
        if (match) autoMap[field] = match;
      });
      setMapping(autoMap);
      setStep("map");
    };
    reader.readAsText(file);
  };

  const importMutation = useMutation({
    mutationFn: (payload) =>
      apiRequest("POST", `/api/contact-lists/${listId}/import`, payload).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-lists"] });
      queryClient.invalidateQueries({ queryKey: [`/api/contact-lists/${listId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/contact-lists/${listId}/contacts`] });
      queryClient.invalidateQueries({ queryKey: [`/api/contact-lists/${listId}/imports`] });
      setImportResult(data);
      setStep("preview");
    },
    onError: (err) => toast({ title: "Import failed", description: err.message, variant: "destructive" }),
  });

  const handleImport = () => {
    const rows = csvRows.map(row => {
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
            <div
              className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer hover:border-primary transition-colors w-full"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">Click to select a CSV file</p>
              <p className="text-xs text-muted-foreground mt-1">Max 50,000 rows · UTF-8 · comma-delimited</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          </div>
        )}

        {step === "map" && (
          <div className="py-4 space-y-5">
            <p className="text-sm text-muted-foreground">
              Map your CSV columns to contact fields. <span className="font-medium text-foreground">Email is required.</span>
            </p>
            {CONTACT_FIELDS.map(field => (
              <div key={field} className="space-y-1.5">
                <Label className="capitalize">{field}{field === "email" ? " *" : ""}</Label>
                <Select value={mapping[field] || "__none__"} onValueChange={val => setMapping(m => ({ ...m, [field]: val === "__none__" ? undefined : val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="— skip —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— skip —</SelectItem>
                    {csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">{csvRows.length.toLocaleString()} rows detected in "{fileName}"</p>
            <SheetFooter className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => { reset(); fileRef.current && (fileRef.current.value = ""); }}>Back</Button>
              <Button
                onClick={handleImport}
                disabled={!mapping.email || importMutation.isPending}
              >
                {importMutation.isPending ? "Importing…" : `Import ${csvRows.length.toLocaleString()} rows`}
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
            <SheetFooter>
              <Button onClick={handleClose}>Done</Button>
            </SheetFooter>
          </div>
        )}
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

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleExport = () => {
    toast({ title: "Export coming soon", description: "This feature is not yet available." });
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
        <div className="flex items-center gap-4 ml-11 mb-8 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {(list.contactCount ?? 0).toLocaleString()} contacts
          </span>
          <span>Created {formatDate(list.createdAt)}</span>
        </div>

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
              Import CSV
            </Button>
          </div>
        </div>

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
                {search ? "No contacts match your search." : "No contacts in this list yet. Import a CSV to get started."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(contact => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-mono text-sm">{contact.email}</TableCell>
                      <TableCell className="text-sm">{contact.name || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-sm">{contact.company || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(contact.addedAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setRemoveTarget(contact)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
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
    </AppLayout>
  );
}
