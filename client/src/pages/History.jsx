import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
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
  Send,
  CheckCircle,
  Mail,
  MousePointerClick,
  TrendingUp,
  AlertTriangle,
  Info,
  X,
  Copy,
  UserMinus,
  ShieldCheck,
} from "lucide-react";
import { formatNumber, formatDate, cn } from "@/lib/utils";
import { Link } from "wouter";
import { getStatusConfig } from "@/lib/campaignStatus";
import CancelCampaignDialog from "@/components/campaign/CancelCampaignDialog";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { invalidateAfter } from "@/lib/queryInvalidation";

export default function History() {
  const { isRootAdmin, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewCampaign, setViewCampaign] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelError, setCancelError] = useState(null);

  const cancelMutation = useMutation({
    mutationFn: async (campaignId) => {
      const res = await fetch(`/api/campaigns/${campaignId}/cancel`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.message || "Failed to cancel campaign");
        err.status = res.status;
        err.code = data.error;
        err.campaignStatus = data.status;
        throw err;
      }
      return data;
    },
    onSuccess: (data, campaignId) => {
      setCancelTarget(null);
      setCancelError(null);
      invalidateAfter("campaignTerminalStateChanged", { extraKeys: [["/api/campaigns", campaignId]] });
      toast({
        title: data.alreadyCancelled ? "Campaign was already cancelled" : "Campaign cancelled",
        description: data.alreadyCancelled
          ? "This campaign had already been stopped."
          : "The campaign has been stopped. Credits for sent emails are not refunded.",
      });
    },
    onError: (err, campaignId) => {
      if (err.status === 409) {
        setCancelTarget(null);
        setCancelError(null);
        invalidateAfter("campaignTerminalStateChanged", { extraKeys: [["/api/campaigns", campaignId]] });
        toast({
          title: err.campaignStatus === "COMPLETED" ? "Campaign already completed" : "Campaign already stopped",
          description: err.message,
          variant: "destructive",
        });
      } else {
        setCancelError(err);
      }
    },
  });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["/api/campaigns"]
  });

  // Fetch per-contact email records when a campaign dialog is open
  const { data: campaignDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["/api/campaigns", viewCampaign?.id],
    enabled: !!viewCampaign?.id,
  });

  // The backend has always recorded a full, ordered timeline of every decision
  // point in a campaign's lifecycle (created/started/cancelled/completed,
  // reconciliation corrections) via this exact endpoint — it just had no
  // frontend consumer until now, despite being the most direct answer to
  // "why does my campaign show what it shows."
  const { data: campaignAudit } = useQuery({
    queryKey: ["/api/campaigns", viewCampaign?.id, "audit"],
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
              <HistoryIcon className="h-6 w-6" aria-hidden="true" />
              Campaign History
            </h1>
            <p className="text-muted-foreground">
              View and manage your past email campaigns
            </p>
          </div>
          <Link href="/app/campaigns/new">
            <Button className="gap-2" data-testid="button-new-campaign">
              <Send className="h-4 w-4" aria-hidden="true" />
              New Campaign
            </Button>
          </Link>
        </div>

        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44" data-testid="select-status">
                  <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="RUNNING">In Progress</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="PENDING">Queued</SelectItem>
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
                      <TableHead className="text-right">Skipped</TableHead>
                      <TableHead className="text-right">Reach</TableHead>
                      <TableHead className="text-right">Open Rate</TableHead>
                      <TableHead className="text-right">Click Rate</TableHead>
                      <TableHead>Date</TableHead>
                      {isRootAdmin && <TableHead>User</TableHead>}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((campaign) => {
                      const config = getStatusConfig(campaign.status);
                      const StatusIcon = config.icon;
                      const reachRate = (campaign.totalEmails ?? 0) > 0
                        ? Math.min(100, ((campaign.sentEmails + (campaign.skippedEmails ?? 0)) / (campaign.totalEmails ?? 1)) * 100).toFixed(1)
                        : null;
                      const openRate = campaign.sentEmails > 0
                        ? Math.min(100, (campaign.openedEmails / campaign.sentEmails) * 100).toFixed(1)
                        : null;
                      const clickRate = campaign.sentEmails > 0
                        ? Math.min(100, (campaign.clickedEmails / campaign.sentEmails) * 100).toFixed(1)
                        : null;

                      return (
                        <TableRow key={campaign.id} data-testid={`row-campaign-${campaign.id}`}>
                          <TableCell>
                            <div className="font-medium">{campaign.name}</div>
                            {campaign.templateSnapshot?.subject && (
                              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground truncate max-w-[220px]">
                                <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                                <span className="truncate">{campaign.templateSnapshot.subject}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("gap-1", config.color)} title={config.tooltip}>
                              <StatusIcon className="h-3 w-3" aria-hidden="true" />
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            {formatNumber(campaign.sentEmails)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-amber-600 dark:text-amber-400">
                            {(campaign.skippedEmails ?? 0) > 0
                              ? formatNumber(campaign.skippedEmails ?? 0)
                              : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            {reachRate !== null ? (
                              <span className={`font-medium flex items-center justify-end gap-1 ${
                                parseFloat(reachRate) === 100
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-amber-600 dark:text-amber-400"
                              }`}>
                                <Send className="h-3 w-3" aria-hidden="true" />
                                {reachRate}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {openRate !== null ? (
                              <span className="font-medium text-violet-600 dark:text-violet-400 flex items-center justify-end gap-1">
                                <TrendingUp className="h-3 w-3" aria-hidden="true" />
                                {openRate}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {clickRate !== null ? (
                              <span className="font-medium text-blue-600 dark:text-blue-400 flex items-center justify-end gap-1">
                                <MousePointerClick className="h-3 w-3" aria-hidden="true" />
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
                              {config.canCancel && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Cancel campaign ${campaign.name}`}
                                  data-testid={`button-cancel-${campaign.id}`}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                  onClick={() => {
                                    setCancelError(null);
                                    cancelMutation.reset();
                                    setCancelTarget(campaign);
                                  }}
                                >
                                  <X className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`View details for ${campaign.name}`}
                                data-testid={`button-view-${campaign.id}`}
                                onClick={() => setViewCampaign(campaign)}
                              >
                                <Eye className="h-4 w-4" aria-hidden="true" />
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
                  <HistoryIcon className="relative h-12 w-12 mx-auto text-muted-foreground/40" aria-hidden="true" />
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
                      <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                      {/* M37: sentence case, matching Dashboard.jsx and
                          DomainDetail.jsx. The same CTA existed in two
                          capitalisations across three empty states. */}
                      Create your first campaign
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cancel campaign dialog — page-level; one dialog shared across all rows */}
      <CancelCampaignDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) {
            setCancelError(null);
            cancelMutation.reset();
            setCancelTarget(null);
          }
        }}
        campaign={cancelTarget}
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
        isPending={cancelMutation.isPending}
        error={cancelError}
      />

      {/* Campaign detail dialog */}
      <Dialog open={!!viewCampaign} onOpenChange={(open) => !open && setViewCampaign(null)}>
        {/* M37: `max-h-[90vh] overflow-y-auto` dropped — this was the one call
            site that had patched the missing height cap locally. DialogContent
            now caps every dialog, so the local override is redundant (and its
            `vh` unit was the wrong one on mobile). */}
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewCampaign?.name}</DialogTitle>
            <DialogDescription>
              {formatDate(viewCampaign?.createdAt)} &middot;{" "}
              {getStatusConfig(viewCampaign?.status).label}
            </DialogDescription>
          </DialogHeader>

          {viewCampaign && (() => {
            const notReached = (viewCampaign.totalEmails ?? 0)
              - (viewCampaign.sentEmails ?? 0)
              - (viewCampaign.failedEmails ?? 0)
              - (viewCampaign.skippedEmails ?? 0);

            const statusConfig = getStatusConfig(viewCampaign.status);
            // Hide Duplicate for non-owned campaigns — admin view may show other users' campaigns.
            // Backend enforces ownership on POST /api/campaigns and GET /api/campaigns/:id,
            // but showing the button for unowned campaigns produces a confusing UX.
            const canDuplicate = statusConfig.canDuplicate && viewCampaign.userId === user?.id;

            return (
              <div className="space-y-4 pt-2">
                {/* Stats row */}
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="rounded-lg border p-3">
                    <div className="text-2xl font-semibold text-green-600">{formatNumber(viewCampaign.sentEmails)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Sent</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-2xl font-semibold text-red-600">{formatNumber(viewCampaign.failedEmails)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Failed</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{formatNumber(viewCampaign.skippedEmails ?? 0)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Skipped</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-2xl font-semibold">{formatNumber(viewCampaign.totalEmails ?? 0)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Total</div>
                  </div>
                </div>

                {/* Credits consumed */}
                {(viewCampaign.creditsUsed ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-sm px-1">
                    <span className="text-muted-foreground">Credits consumed</span>
                    <span className="font-medium">{formatNumber(viewCampaign.creditsUsed)}</span>
                  </div>
                )}

                {/* CANCELLED — contacts not reached */}
                {viewCampaign.status === "CANCELLED" && notReached > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800">
                    <AlertTriangle className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Campaign was cancelled —{" "}
                      {formatNumber(notReached)}{" "}
                      {notReached === 1 ? "contact was" : "contacts were"} not reached.
                      {(viewCampaign.sentEmails ?? 0) === 0 && " No emails were sent and no credits were used."}
                    </p>
                  </div>
                )}

                {/* CANCELLED — sent nothing, zero list (edge: totalEmails=0) */}
                {viewCampaign.status === "CANCELLED" && (viewCampaign.sentEmails ?? 0) === 0 && notReached === 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800">
                    <Info className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Campaign was cancelled before any emails were sent. No credits were used.
                    </p>
                  </div>
                )}

                {/* FAILED — partial send context before the Duplicate action */}
                {viewCampaign.status === "FAILED" && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm text-red-800 dark:text-red-300">
                      Campaign failed —{" "}
                      {formatNumber(viewCampaign.sentEmails ?? 0)} of{" "}
                      {formatNumber(viewCampaign.totalEmails ?? 0)} emails were sent before the failure.
                      {notReached > 0 && ` ${formatNumber(notReached)} ${notReached === 1 ? "contact was" : "contacts were"} not reached.`}
                      {" "}Duplicating will start a new campaign from the beginning.
                    </p>
                  </div>
                )}

                {/* COMPLETED — incomplete due to credit exhaustion or early stop */}
                {viewCampaign.status === "COMPLETED" && notReached > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      Campaign did not complete all contacts —{" "}
                      {formatNumber(notReached)}{" "}
                      {notReached === 1 ? "contact was" : "contacts were"} not reached.
                      This may be due to insufficient credits or an early stop.
                      Top up credits and retry to reach the remaining contacts.
                    </p>
                  </div>
                )}

                {/* COMPLETED — suppression skips (healthy, all contacts processed) */}
                {viewCampaign.status === "COMPLETED" &&
                  (viewCampaign.skippedEmails ?? 0) > 0 &&
                  notReached === 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      {formatNumber(viewCampaign.skippedEmails)}{" "}
                      {viewCampaign.skippedEmails === 1 ? "contact was" : "contacts were"} skipped — already in your suppression list.{" "}
                      {formatNumber(viewCampaign.sentEmails)} of {formatNumber(viewCampaign.totalEmails)} contacts received this email.
                    </p>
                  </div>
                )}

                {/* Engagement metrics — populated by SNS events after send */}
                {viewCampaign.sentEmails > 0 && (
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center justify-center gap-1.5 mb-0.5">
                        <Send className="h-4 w-4 text-blue-500" aria-hidden="true" />
                        <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                          {(viewCampaign.totalEmails ?? 0) > 0
                            ? Math.min(100, ((viewCampaign.sentEmails + (viewCampaign.skippedEmails ?? 0)) / (viewCampaign.totalEmails ?? 1)) * 100).toFixed(1)
                            : "0.0"}%
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Reach Rate &middot; {formatNumber(viewCampaign.totalEmails ?? 0)} total
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center justify-center gap-1.5 mb-0.5">
                        <CheckCircle className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                        <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                          {Math.min(100, (viewCampaign.deliveredEmails ?? 0) / viewCampaign.sentEmails * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Delivery Rate &middot; {formatNumber(viewCampaign.deliveredEmails ?? 0)} delivered
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center justify-center gap-1.5 mb-0.5">
                        <TrendingUp className="h-4 w-4 text-violet-500" aria-hidden="true" />
                        <div className="text-2xl font-semibold text-violet-600 dark:text-violet-400">
                          {Math.min(100, (viewCampaign.openedEmails ?? 0) / viewCampaign.sentEmails * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Open Rate &middot; {formatNumber(viewCampaign.openedEmails)} opens
                      </div>
                      {(() => {
                        const machineCount = campaignDetail?.trackingBreakdown?.machineOpenCount ?? 0;
                        if (machineCount === 0) return null;
                        const genuine = Math.max(0, (viewCampaign.openedEmails ?? 0) - machineCount);
                        return (
                          <div className="text-xs text-muted-foreground mt-1 border-t pt-1">
                            ~{genuine} genuine &middot; {machineCount} machine (MPP/gateway)
                          </div>
                        );
                      })()}
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center justify-center gap-1.5 mb-0.5">
                        <MousePointerClick className="h-4 w-4 text-blue-500" aria-hidden="true" />
                        <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                          {Math.min(100, (viewCampaign.clickedEmails ?? 0) / viewCampaign.sentEmails * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Click Rate &middot; {formatNumber(viewCampaign.clickedEmails)} clicks
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center justify-center gap-1.5 mb-0.5">
                        <UserMinus className="h-4 w-4 text-rose-500" aria-hidden="true" />
                        <div className="text-2xl font-semibold text-rose-600 dark:text-rose-400">
                          {Math.min(100, (viewCampaign.unsubscribedEmails ?? 0) / viewCampaign.sentEmails * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Unsub Rate &middot; {formatNumber(viewCampaign.unsubscribedEmails ?? 0)} unsubscribed
                      </div>
                    </div>
                  </div>
                )}

                {/* Delivery Health — synthesizes bounce/complaint signal rather than
                    exposing bounce rate as an isolated number. bouncedEmails/
                    complainedEmails are already present on every campaign row
                    (server/storage.js counters, updated by the SNS webhook) —
                    reused here, no new backend surface. Thresholds mirror what
                    mailbox providers themselves treat as reputation-risking
                    (Gmail/Yahoo bulk sender rules: >0.3% complaints; >5% bounce
                    is a common ESP-wide risk line) — a customer-relevant "should
                    I be worried" signal, not an arbitrary cutoff. Underlying
                    counts and rates stay visible alongside the status, so nothing
                    is hidden behind the synthesized label. */}
                {viewCampaign.sentEmails > 0 && (() => {
                  const bounced = viewCampaign.bouncedEmails ?? 0;
                  const complained = viewCampaign.complainedEmails ?? 0;
                  const bounceRate = (bounced / viewCampaign.sentEmails) * 100;
                  const complaintRate = (complained / viewCampaign.sentEmails) * 100;
                  const isPoor = bounceRate > 5 || complaintRate > 0.3;
                  const isWatch = !isPoor && (bounceRate > 2 || complaintRate > 0.1);
                  const HEALTH = isPoor
                    ? { label: "At risk", icon: AlertTriangle, text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" }
                    : isWatch
                    ? { label: "Needs attention", icon: AlertTriangle, text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" }
                    : { label: "Good", icon: ShieldCheck, text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" };
                  const HealthIcon = HEALTH.icon;
                  return (
                    <div className={cn("rounded-lg border p-3", HEALTH.bg)}>
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
                        <div className="flex items-center gap-2">
                          <HealthIcon className={cn("h-4 w-4", HEALTH.text)} aria-hidden="true" />
                          <span className={cn("text-sm font-medium", HEALTH.text)}>
                            Delivery Health: {HEALTH.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{formatNumber(bounced)} bounced &middot; {bounceRate.toFixed(1)}%</span>
                          <span>{formatNumber(complained)} complaint{complained === 1 ? "" : "s"} &middot; {complaintRate.toFixed(2)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Lifecycle timeline — the "why does this show what it shows" answer.
                    Filters the raw audit feed down to campaign-level decisions only;
                    the endpoint also returns one CREDITS_USED entry per send, which
                    would otherwise bury the actually-interesting events (a 80-contact
                    campaign would show ~80 near-identical lines). */}
                {(() => {
                  const LIFECYCLE_ACTIONS = new Set([
                    "CAMPAIGN_CREATED", "CAMPAIGN_STARTED", "CAMPAIGN_PAUSED",
                    "CAMPAIGN_CANCELLED", "CAMPAIGN_COMPLETED", "CAMPAIGN_FAILED",
                    "CAMPAIGN_FINALIZED", "CAMPAIGN_COUNTERS_RECONCILED",
                  ]);
                  const ACTION_LABEL = {
                    CAMPAIGN_CREATED: "Campaign created",
                    CAMPAIGN_STARTED: "Sending started",
                    CAMPAIGN_PAUSED: "Paused",
                    CAMPAIGN_CANCELLED: "Cancellation requested",
                    CAMPAIGN_COMPLETED: "Completed",
                    CAMPAIGN_FAILED: "Stopped (failed)",
                    // "Finalized" is the true-outcome record — written after any
                    // in-flight send at the moment of the request above has
                    // landed, so its counts (shown below) are authoritative even
                    // when the request-time entry above could not yet know them.
                    CAMPAIGN_FINALIZED: "Finalized — true final counts confirmed",
                    CAMPAIGN_COUNTERS_RECONCILED: "Counts corrected by reconciliation",
                  };
                  const events = (campaignAudit || [])
                    .filter(l => LIFECYCLE_ACTIONS.has(l.action))
                    .slice()
                    .reverse(); // API returns newest-first; timeline reads best oldest-first
                  if (events.length === 0) return null;
                  return (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Timeline</p>
                      <div className="rounded-md border divide-y">
                        {events.map((e) => (
                          <div key={e.id} className="flex items-start justify-between gap-3 px-3 py-2 text-xs">
                            <div>
                              <span className="font-medium">{ACTION_LABEL[e.action] || e.action}</span>
                              {e.action === "CAMPAIGN_CANCELLED" && e.details?.cancelledBy && (
                                <span className="text-muted-foreground"> &middot; by {e.details.cancelledBy}</span>
                              )}
                              {e.action === "CAMPAIGN_COUNTERS_RECONCILED" && e.details?.reason && (
                                <span className="text-muted-foreground"> &middot; {e.details.reason.replace(/_/g, " ")}</span>
                              )}
                              {e.action === "CAMPAIGN_FINALIZED" && (
                                <span className="text-muted-foreground"> &middot; {e.details?.sentEmails ?? 0} sent, {e.details?.creditsUsed ?? 0} credits used</span>
                              )}
                            </div>
                            <span className="text-muted-foreground shrink-0">{formatDate(e.createdAt)}</span>
                          </div>
                        ))}
                        {["COMPLETED", "CANCELLED", "FAILED"].includes(viewCampaign.status) && !viewCampaign.finalizedAt && (
                          <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground">
                            <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
                            Final counts are still being confirmed — this may update once more.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

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
                            <TableHead className="text-xs">Suppression</TableHead>
                            <TableHead className="text-xs">Opened At</TableHead>
                            <TableHead className="text-xs">Clicked At</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {campaignDetail.campaignEmails.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className="text-xs font-mono truncate max-w-[160px]">{r.recipientEmail}</TableCell>
                              <TableCell className="text-xs">
                                {r.status === "FAILED" && r.failureReason === "campaign_terminated" ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Badge variant="outline" className="text-[10px] h-4 px-1 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700">
                                      NOT SENT
                                    </Badge>
                                    <span className="text-muted-foreground" title="Campaign was cancelled before this contact was reached">
                                      cancelled
                                    </span>
                                  </span>
                                ) : r.status === "FAILED" && r.failureReason ? (
                                  <span title={r.failureReason}>{r.status}</span>
                                ) : (
                                  r.status
                                )}
                              </TableCell>
                              <TableCell className="text-xs">
                                {r.status === "SUPPRESSED" ? (
                                  r.suppressionDetail ? (
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-1">
                                        <Badge variant="outline" className="text-[10px] h-4 px-1 capitalize shrink-0">
                                          {r.suppressionDetail.source}
                                        </Badge>
                                        {r.suppressionDetail.scope === "global" && (
                                          <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0 text-muted-foreground">
                                            global
                                          </Badge>
                                        )}
                                      </div>
                                      <span
                                        className="text-muted-foreground truncate max-w-[160px]"
                                        title={r.suppressionDetail.reason || undefined}
                                      >
                                        {r.suppressionDetail.reason || "—"}
                                      </span>
                                      {r.suppressionDetail.suppressedAt && (
                                        <span className="text-[10px] text-muted-foreground">
                                          {formatDate(r.suppressionDetail.suppressedAt)}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">Unknown suppression source</span>
                                  )
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
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

                {/* Duplicate Campaign action */}
                {canDuplicate && (
                  <div className="flex justify-end pt-2 border-t">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {/* Button asChild + Link: renders as <a> with button styles — no nested interactive elements */}
                          <Button variant="outline" className="gap-2" asChild>
                            <Link href={`/app/campaigns/new?duplicate=${viewCampaign.id}`}>
                              <Copy className="h-4 w-4" aria-hidden="true" />
                              Duplicate Campaign
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Create a new campaign using this campaign&apos;s content and selected list.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
