import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShieldOff, Search, Plus, AlertTriangle, Info } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const SOURCE_CONFIG = {
  bounce: {
    label: "Bounce",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    description: "Email permanently rejected by the recipient server.",
  },
  complaint: {
    label: "Complaint",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    description: "Recipient reported this email as spam.",
  },
  unsubscribe: {
    label: "Unsubscribe",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    description: "Recipient clicked the unsubscribe link.",
  },
  manual: {
    label: "Manual",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400",
    description: "Manually suppressed by an admin.",
  },
};

function SourceBadge({ source }) {
  const config = SOURCE_CONFIG[source] || { label: source, color: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

function ReasonCell({ reason, source }) {
  if (!reason) {
    const fallback = source === "unsubscribe"
      ? "Recipient clicked unsubscribe link"
      : source === "manual"
        ? "No reason provided"
        : null;
    return <span className="text-muted-foreground text-sm">{fallback ?? "—"}</span>;
  }

  const truncated = reason.length > 60 ? reason.slice(0, 60) + "…" : reason;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-sm cursor-default border-b border-dotted border-muted-foreground/40">
          {truncated}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs break-words">
        {reason}
      </TooltipContent>
    </Tooltip>
  );
}

export default function Suppressions() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [newEmail, setNewEmail] = useState("");
  const [newReason, setNewReason] = useState("");

  const { data: suppressions = [], isLoading } = useQuery({
    queryKey: ["/api/suppressions"],
  });

  const addMutation = useMutation({
    mutationFn: (body) => apiRequest("POST", "/api/suppressions", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppressions"] });
      setNewEmail("");
      setNewReason("");
      toast({ title: "Email suppressed", description: "The address has been added to your suppression list." });
    },
    onError: (err) => {
      toast({ title: "Failed to suppress", description: err.message, variant: "destructive" });
    },
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    addMutation.mutate({ email: newEmail.trim(), reason: newReason.trim() || undefined });
  };

  const filtered = suppressions.filter((s) => {
    const matchesSearch =
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.reason || "").toLowerCase().includes(search.toLowerCase());
    const matchesSource = sourceFilter === "all" || s.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  const counts = suppressions.reduce((acc, s) => {
    acc[s.source] = (acc[s.source] || 0) + 1;
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShieldOff className="h-6 w-6" />
            Suppression List
          </h1>
          <p className="text-muted-foreground">
            Emails in this list are skipped in all future campaigns.
          </p>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(SOURCE_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5 text-sm">
              <SourceBadge source={key} />
              <span className="text-muted-foreground">{counts[key] ?? 0}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-sm ml-auto text-muted-foreground">
            Total: {suppressions.length}
          </div>
        </div>

        {/* Manual suppression form */}
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Manual Suppression
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="email@example.com"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="flex-1"
                required
                data-testid="input-suppress-email"
              />
              <Input
                placeholder="Reason (optional)"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                className="flex-1"
                data-testid="input-suppress-reason"
              />
              <Button
                type="submit"
                disabled={addMutation.isPending || !newEmail.trim()}
                data-testid="button-add-suppression"
              >
                {addMutation.isPending ? "Suppressing…" : "Suppress"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Suppression table */}
        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search email or reason…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full sm:w-44" data-testid="select-source">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="bounce">Bounce</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="unsubscribe">Unsubscribe</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <ShieldOff className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">
                  {suppressions.length === 0
                    ? "No suppressed contacts yet. Suppressions are added automatically when emails bounce or recipients unsubscribe."
                    : "No results match your search or filter."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="whitespace-nowrap">Suppressed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-sm">{s.email}</TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger>
                            <SourceBadge source={s.source} />
                          </TooltipTrigger>
                          <TooltipContent>
                            {SOURCE_CONFIG[s.source]?.description ?? s.source}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <ReasonCell reason={s.reason} source={s.source} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(s.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            Showing {filtered.length} of {suppressions.length} suppressed addresses
          </p>
        )}
      </div>
    </AppLayout>
  );
}
