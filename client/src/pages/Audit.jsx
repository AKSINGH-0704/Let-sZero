import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Search,
  Filter,
  User,
  Coins,
  Send,
  UserPlus,
  UserMinus,
  LogIn,
  LogOut,
  Settings,
  Download
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

const ACTION_CONFIG = {
  USER_LOGIN: { icon: LogIn, label: "Login", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  USER_LOGOUT: { icon: LogOut, label: "Logout", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
  USER_CREATED: { icon: UserPlus, label: "User Created", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  USER_DELETED: { icon: UserMinus, label: "User Deleted", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  PASSWORD_CHANGED: { icon: Settings, label: "Password Changed", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  CREDITS_ALLOCATED: { icon: Coins, label: "Credits Allocated", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  CREDITS_USED: { icon: Coins, label: "Credits Used", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  CAMPAIGN_CREATED: { icon: Send, label: "Campaign Created", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  CAMPAIGN_STARTED: { icon: Send, label: "Campaign Started", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  CAMPAIGN_COMPLETED: { icon: Send, label: "Campaign Completed", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  CAMPAIGN_BLOCKED_INSUFFICIENT_CREDITS: { icon: Coins, label: "Campaign Blocked", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  TEMPLATE_CREATED: { icon: FileText, label: "Template Created", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400" },
  TEMPLATE_DELETED: { icon: FileText, label: "Template Deleted", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  CONTACT_IMPORTED: { icon: UserPlus, label: "Contacts Imported", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400" },
  AI_PREVIEW_GENERATED: { icon: Settings, label: "AI Preview", color: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400" },
  SPAM_ANALYSIS_RUN: { icon: Settings, label: "Spam Analysis", color: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400" }
};

function formatDetails(details) {
  if (!details) return "-";
  if (typeof details === "string") return details;
  const parts = [];
  if (details.username) parts.push(`User: ${details.username}`);
  if (details.amount) parts.push(`Amount: ${details.amount}`);
  if (details.name) parts.push(`Name: ${details.name}`);
  if (details.role) parts.push(`Role: ${details.role}`);
  if (details.creditsNeeded) parts.push(`Needed: ${details.creditsNeeded}`);
  if (details.creditsAvailable !== undefined) parts.push(`Available: ${details.creditsAvailable}`);
  if (details.sentEmails) parts.push(`Sent: ${details.sentEmails}`);
  if (details.totalEmails) parts.push(`Total: ${details.totalEmails}`);
  if (details.count) parts.push(`Count: ${details.count}`);
  return parts.length > 0 ? parts.join(", ") : JSON.stringify(details);
}

const AUDIT_PLAN_LIMITS = {
  free: { canExportAudit: false }, starter: { canExportAudit: false },
  growth: { canExportAudit: false }, scale: { canExportAudit: true },
  enterprise: { canExportAudit: true },
};

export default function Audit() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const canExport = user?.plan && (AUDIT_PLAN_LIMITS[user.plan]?.canExportAudit ?? false);

  const handleExport = async () => {
    try {
      const response = await fetch("/api/audit-logs/export", { credentials: "include" });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  const { data: logs, isLoading } = useQuery({
    queryKey: ["/api/audit-logs"]
  });

  const filteredLogs = (logs || []).filter(log => {
    const detailsStr = formatDetails(log.details);
    const matchesSearch = 
      log.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      detailsStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground">
            Track all system activities and changes
          </p>
        </div>

        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between mb-3">
              <CardTitle className="text-base">Logs</CardTitle>
              {canExport ? (
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-cyan-500/15 text-cyan-400 rounded-lg hover:bg-cyan-500/25 border border-cyan-500/20 transition-colors"
                >
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Export available on Scale+.{" "}
                  <a href="/app/payments" className="text-cyan-400 hover:text-cyan-300 underline">Upgrade</a>
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-action">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="USER_LOGIN">Login</SelectItem>
                  <SelectItem value="USER_LOGOUT">Logout</SelectItem>
                  <SelectItem value="USER_CREATED">User Created</SelectItem>
                  <SelectItem value="USER_DELETED">User Deleted</SelectItem>
                  <SelectItem value="CREDITS_ALLOCATED">Credits Allocated</SelectItem>
                  <SelectItem value="CAMPAIGN_CREATED">Campaign Created</SelectItem>
                  <SelectItem value="CAMPAIGN_COMPLETED">Campaign Completed</SelectItem>
                  <SelectItem value="PASSWORD_CHANGED">Password Changed</SelectItem>
                  <SelectItem value="CREDITS_USED">Credits Used</SelectItem>
                  <SelectItem value="CAMPAIGN_BLOCKED_INSUFFICIENT_CREDITS">Campaign Blocked</SelectItem>
                  <SelectItem value="TEMPLATE_CREATED">Template Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : filteredLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const config = ACTION_CONFIG[log.action] || {
                        icon: FileText,
                        label: log.action,
                        color: "bg-gray-100 text-gray-800"
                      };
                      const ActionIcon = config.icon;

                      return (
                        <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <span className="font-medium">{log.username || "System"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("gap-1", config.color)}>
                              <ActionIcon className="h-3 w-3" />
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-xs truncate">
                            {formatDetails(log.details)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {log.targetType ? `${log.targetType}${log.targetId ? ` #${log.targetId}` : ""}` : "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {formatDate(log.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-16">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium mb-2">No audit logs found</p>
                <p className="text-muted-foreground">
                  {searchQuery || actionFilter !== "all"
                    ? "Try adjusting your filters"
                    : "System activities will appear here"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
