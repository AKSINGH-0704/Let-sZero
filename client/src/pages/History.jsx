import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  History as HistoryIcon,
  Search,
  Filter,
  Eye,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Pause,
  Mail,
  MousePointerClick,
  TrendingUp,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { formatNumber, formatDate, cn } from "@/lib/utils";
import { Link } from "wouter";

const STATUS_CONFIG = {
  COMPLETED: {
    icon: CheckCircle,
    label: "Completed",
    tooltip: "All emails were processed and sent.",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
  },
  RUNNING: {
    icon: Activity,
    label: "In Progress",
    tooltip: "Campaign is actively sending emails right now.",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
  },
  PAUSED: {
    icon: Pause,
    label: "Paused",
    tooltip: "Campaign is on hold. Resume it to continue sending.",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
  },
  FAILED: {
    icon: XCircle,
    label: "Failed",
    tooltip: "Campaign encountered an error and could not complete.",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  },
  PENDING: {
    icon: Clock,
    label: "Queued",
    tooltip: "Campaign is waiting to start. It will begin shortly.",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
  },
  DRAFT: {
    icon: FileText,
    label: "Draft",
    tooltip: "Campaign has not been submitted yet.",
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400"
  }
};

export default function History() {
  const { isRootAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewCampaign, setViewCampaign] = useState(null);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["/api/campaigns"]
  });

  // Fetch per-contact email records when a campaign dialog is open
  const { data: campaignDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["/api/campaigns", viewCampaign?.id],
    enabled: !!viewCampaign?.id,
  });

  const filteredCampaigns = (campaigns || []).filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <HistoryIcon className="h-6 w-6" />
              Campaign History
            </h1>
            <p className="text-muted-foreground">
              View and manage your past email campaigns
            </p>
          </div>
          <Link href="/app/campaigns/new">
            <Button className="gap-2" data-testid="button-new-campaign">
              <Send className="h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </div>

        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-status">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="RUNNING">Running</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-14" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                ))}
              </div>
            ) : filteredCampaigns.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Sent</TableHead>
                      <TableHead className="text-right">Failed</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                      <TableHead className="text-right">Success Rate</TableHead>
                      <TableHead className="text-right">Open Rate</TableHead>
                      <TableHead className="text-right">Click Rate</TableHead>
                      <TableHead>Date</TableHead>
                      {isRootAdmin && <TableHead>User</TableHead>}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((campaign) => {
                      const config = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.PENDING;
                      const StatusIcon = config.icon;
                      const total = campaign.sentEmails + campaign.failedEmails;
                      const successRate = total > 0
                        ? ((campaign.sentEmails / total) * 100).toFixed(1)
                        : 0;
                      const openRate = campaign.sentEmails > 0
                        ? ((campaign.openedEmails / campaign.sentEmails) * 100).toFixed(1)
                        : null;
                      const clickRate = campaign.sentEmails > 0
                        ? ((campaign.clickedEmails / campaign.sentEmails) * 100).toFixed(1)
                        : null;

                      return (
                        <TableRow key={campaign.id} data-testid={`row-campaign-${campaign.id}`}>
                          <TableCell>
                            <div className="font-medium">{campaign.name}</div>
                            {campaign.templateSnapshot?.subject && (
                              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground truncate max-w-[220px]">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate">{campaign.templateSnapshot.subject}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("gap-1", config.color)} title={config.tooltip}>
                              <StatusIcon className="h-3 w-3" />
                              {config.label || campaign.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            {formatNumber(campaign.sentEmails)}
                          </TableCell>
                          <TableCell className="text-right text-red-600 font-medium">
                            {formatNumber(campaign.failedEmails)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(campaign.creditsUsed)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={cn(
                              "font-medium",
                              successRate >= 95 && "text-green-600",
                              successRate >= 80 && successRate < 95 && "text-yellow-600",
                              successRate < 80 && "text-red-600"
                            )}>
                              {successRate}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {openRate !== null ? (
                              <span className="font-medium text-violet-600 dark:text-violet-400 flex items-center justify-end gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {openRate}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {clickRate !== null ? (
                              <span className="font-medium text-blue-600 dark:text-blue-400 flex items-center justify-end gap-1">
                                <MousePointerClick className="h-3 w-3" />
                                {clickRate}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(campaign.createdAt)}
                          </TableCell>
                          {isRootAdmin && (
                            <TableCell className="text-muted-foreground">
                              {campaign.userName || "-"}
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-view-${campaign.id}`}
                                onClick={() => setViewCampaign(campaign)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-download-${campaign.id}`}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-24 w-24 rounded-full bg-primary/5" />
                  </div>
                  <HistoryIcon className="relative h-12 w-12 mx-auto text-muted-foreground/40" />
                </div>
                <p className="text-lg font-medium mb-2">
                  {searchQuery || statusFilter !== "all" 
                    ? "No matching campaigns" 
                    : "No campaigns yet"}
                </p>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search terms or filters to find what you're looking for"
                    : "Your campaign history will appear here once you send your first email campaign"}
                </p>
                {!(searchQuery || statusFilter !== "all") && (
                  <Link href="/app/campaigns/new">
                    <Button data-testid="button-create-first-campaign">
                      <Send className="mr-2 h-4 w-4" />
                      Create Your First Campaign
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Campaign detail dialog */}
      <Dialog open={!!viewCampaign} onOpenChange={(open) => !open && setViewCampaign(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewCampaign?.name}</DialogTitle>
            <DialogDescription>
              {formatDate(viewCampaign?.createdAt)} &middot; {viewCampaign?.status}
            </DialogDescription>
          </DialogHeader>

          {viewCampaign && (
            <div className="space-y-4 pt-2">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-semibold text-green-600">{formatNumber(viewCampaign.sentEmails)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Sent</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-semibold text-red-600">{formatNumber(viewCampaign.failedEmails)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Failed</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-semibold">{formatNumber(viewCampaign.skippedEmails ?? 0)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Skipped</div>
                </div>
              </div>

              {/* Early-stop warning — shown when campaign completed but not all contacts were reached */}
              {viewCampaign.status === "COMPLETED" && viewCampaign.sentEmails < viewCampaign.totalEmails && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    Campaign stopped early — account ran out of credits. {formatNumber(viewCampaign.sentEmails)} of {formatNumber(viewCampaign.totalEmails)} contacts received this email. Top up credits to reach the remaining contacts.
                  </p>
                </div>
              )}

              {/* Engagement metrics — populated by SNS events after send */}
              {viewCampaign.sentEmails > 0 && (
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                      <TrendingUp className="h-4 w-4 text-violet-500" />
                      <div className="text-2xl font-semibold text-violet-600 dark:text-violet-400">
                        {((viewCampaign.openedEmails / viewCampaign.sentEmails) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Open Rate &middot; {formatNumber(viewCampaign.openedEmails)} opens
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                      <MousePointerClick className="h-4 w-4 text-blue-500" />
                      <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                        {((viewCampaign.clickedEmails / viewCampaign.sentEmails) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Click Rate &middot; {formatNumber(viewCampaign.clickedEmails)} clicks
                    </div>
                  </div>
                </div>
              )}

              {/* Per-contact email records */}
              {detailLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : campaignDetail?.campaignEmails?.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Recipients</p>
                  <div className="rounded-md border overflow-auto max-h-48">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Email</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Opened At</TableHead>
                          <TableHead className="text-xs">Clicked At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaignDetail.campaignEmails.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs font-mono truncate max-w-[160px]">{r.recipientEmail}</TableCell>
                            <TableCell className="text-xs">{r.status}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {r.openedAt ? formatDate(r.openedAt) : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {r.clickedAt ? formatDate(r.clickedAt) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : null}

              {/* Template details */}
              {viewCampaign.templateSnapshot ? (
                <div className="space-y-3">
                  {viewCampaign.templateSnapshot.name && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Template</p>
                      <p className="text-sm">{viewCampaign.templateSnapshot.name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Subject</p>
                    <p className="text-sm font-medium">{viewCampaign.templateSnapshot.subject || "—"}</p>
                  </div>
                  {viewCampaign.templateSnapshot.body && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Body Preview</p>
                      <div
                        className="rounded-lg border bg-white dark:bg-zinc-950 p-4 text-sm overflow-auto max-h-64 prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: viewCampaign.templateSnapshot.body }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Template snapshot not available for this campaign.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
