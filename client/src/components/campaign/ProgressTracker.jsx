import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useCampaign } from "@/context/CampaignContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getStatusConfig } from "@/lib/campaignStatus";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  CheckCircle,
  XCircle,
  Activity,
  Send,
  Home,
  History,
  Loader2,
  Mail,
  PartyPopper,
  TrendingUp,
  MousePointerClick,
  AlertTriangle,
  Ban,
  Info,
  X,
} from "lucide-react";
import { formatNumber, cn } from "@/lib/utils";
import CancelCampaignDialog from "./CancelCampaignDialog";

const SUPPRESSION_SOURCE_LABEL = {
  unsubscribe: "Unsubscribe",
  bounce:      "Bounce",
  complaint:   "Complaint",
  manual:      "Manual",
};

export default function ProgressTracker() {
  const { contacts, campaignName, campaignId, campaignData, resetCampaign, columnMapping } = useCampaign();
  const { toast } = useToast();
  const [emailStatuses, setEmailStatuses] = useState([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const mountedAt = useRef(Date.now());

  const { data: fetchedCampaign } = useQuery({
    queryKey: ["/api/campaigns", campaignId],
    enabled: !!campaignId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "COMPLETED" || status === "FAILED" || status === "CANCELLED") {
        return false;
      }
      const elapsed = Date.now() - mountedAt.current;
      return elapsed < 30_000 ? 500 : 2000;
    },
  });

  const currentCampaign = fetchedCampaign || campaignData || {
    status: "PENDING",
    sentEmails: 0,
    failedEmails: 0,
    skippedEmails: 0,
    totalEmails: contacts.length,
    creditsUsed: 0,
    name: campaignName,
  };

  const totalEmails   = currentCampaign.totalEmails   || contacts.length;
  const sentEmails    = currentCampaign.sentEmails    || 0;
  const failedEmails  = currentCampaign.failedEmails  || 0;
  const skippedEmails = currentCampaign.skippedEmails || 0;

  const campaignEmailRecords = currentCampaign.campaignEmails || [];

  const statusConfig = getStatusConfig(currentCampaign.status);
  const StatusIcon   = statusConfig.icon;

  const isComplete  = currentCampaign.status === "COMPLETED";
  const isCancelled = currentCampaign.status === "CANCELLED";
  const canCancel   = statusConfig.canCancel && !!campaignId;

  // Contacts not yet processed — used for "Pending" tile (RUNNING) and "Not Reached" tile (CANCELLED).
  const pendingEmails = Math.max(0, totalEmails - sentEmails - failedEmails - skippedEmails);

  // Only meaningful for COMPLETED: contacts the loop never reached (credit exhaustion / early stop).
  const unprocessed = isComplete ? pendingEmails : 0;

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/campaigns/${campaignId}/cancel`, {
        method: "POST",
        credentials: "include",
      });
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
    onSuccess: (data) => {
      setCancelDialogOpen(false);
      setCancelError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId] });
      toast({
        title: data.alreadyCancelled ? "Campaign was already cancelled" : "Campaign cancelled",
        description: data.alreadyCancelled
          ? "This campaign had already been stopped."
          : "The campaign has been stopped successfully.",
      });
    },
    onError: (err) => {
      if (err.status === 409) {
        // Terminal-state conflict — close dialog and let polling update UI
        setCancelDialogOpen(false);
        setCancelError(null);
        queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId] });
        toast({
          title:
            err.campaignStatus === "COMPLETED"
              ? "Campaign already completed"
              : "Campaign already stopped",
          description: err.message,
          variant: "destructive",
        });
      } else {
        setCancelError(err);
      }
    },
  });

  function handleCancelClick() {
    setCancelError(null);
    cancelMutation.reset();
    setCancelDialogOpen(true);
  }

  function handleDialogOpenChange(open) {
    if (!open) {
      setCancelError(null);
      cancelMutation.reset();
    }
    setCancelDialogOpen(open);
  }

  useEffect(() => {
    if (!contacts.length && campaignEmailRecords.length === 0) return;

    const statuses = [];

    if (campaignEmailRecords.length > 0) {
      for (const record of campaignEmailRecords) {
        if (record.status === "SUPPRESSED") {
          const source = record.suppressionDetail?.source;
          statuses.push({
            email:     record.recipientEmail || "—",
            status:    "suppressed",
            reason:    SUPPRESSION_SOURCE_LABEL[source] || source || "Suppressed",
            timestamp: record.sentAt || record.createdAt,
          });
        } else if (record.status === "SENT") {
          statuses.push({
            email:     record.recipientEmail || "—",
            status:    "sent",
            timestamp: record.sentAt,
          });
        } else if (record.status === "FAILED") {
          statuses.push({
            email:     record.recipientEmail || "—",
            status:    "failed",
            reason:    record.failureReason || "Send failed",
            timestamp: record.createdAt,
          });
        }
      }
    } else {
      const totalProcessed = sentEmails + failedEmails + skippedEmails;
      for (let i = 0; i < Math.min(totalProcessed, contacts.length, 50); i++) {
        const contact = contacts[i];
        const email = contact?.[columnMapping?.email] || `contact${i + 1}@example.com`;
        const isFailed = i < failedEmails;
        statuses.push({
          email,
          status:    isFailed ? "failed" : "sent",
          timestamp: new Date().toISOString(),
        });
      }
    }

    setEmailStatuses(statuses.reverse());
  }, [
    currentCampaign.sentEmails,
    currentCampaign.failedEmails,
    currentCampaign.skippedEmails,
    campaignEmailRecords,
    contacts,
    columnMapping,
  ]);

  const progress = totalEmails > 0
    ? Math.min(100, ((sentEmails + failedEmails + skippedEmails) / totalEmails) * 100)
    : 100;

  const deliveryDenominator = sentEmails + failedEmails;
  const deliveryRate = deliveryDenominator > 0
    ? ((sentEmails / deliveryDenominator) * 100).toFixed(1)
    : 100;

  const reachRate = totalEmails > 0
    ? (((sentEmails + skippedEmails) / totalEmails) * 100).toFixed(1)
    : 100;

  const handleFinish = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    resetCampaign();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
          {isComplete ? (
            <PartyPopper className="h-5 w-5 text-green-600" aria-hidden="true" />
          ) : isCancelled ? (
            <Ban className="h-5 w-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          ) : (
            <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
          )}
          {isComplete ? "Campaign Complete!" : isCancelled ? "Campaign Cancelled" : "Campaign Progress"}
        </h2>
        <p className="text-muted-foreground mt-1">
          {currentCampaign.name || campaignName || "Email Campaign"}
        </p>
      </div>

      <Card className="border-card-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div aria-live="polite" aria-atomic="true">
                <Badge className={cn("text-sm gap-1", statusConfig.color)}>
                  <StatusIcon className="h-3 w-3" aria-hidden="true" />
                  {statusConfig.label}
                </Badge>
              </div>
              {currentCampaign.status === "RUNNING" && (
                <span className="text-sm text-muted-foreground animate-pulse">
                  Processing…
                </span>
              )}
            </div>

            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelClick}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30 shrink-0"
                data-testid="button-cancel-campaign"
              >
                <X className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Cancel Campaign
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress.toFixed(0)}%</span>
            </div>
            <Progress
              value={progress}
              className={cn("h-3", isCancelled && "[&>div]:bg-slate-400 dark:[&>div]:bg-slate-600")}
              aria-label={`Campaign progress: ${progress.toFixed(0)}%`}
            />
          </div>

          {/* Stats tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center p-4 rounded-md bg-muted/50">
              <p className="text-3xl font-bold">{formatNumber(totalEmails)}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <div className="text-center p-4 rounded-md bg-green-50 dark:bg-green-950/30">
              <p className="text-3xl font-bold text-green-600">{formatNumber(sentEmails)}</p>
              <p className="text-sm text-green-700 dark:text-green-400">Sent</p>
            </div>
            <div className="text-center p-4 rounded-md bg-red-50 dark:bg-red-950/30">
              <p className="text-3xl font-bold text-red-600">{formatNumber(failedEmails)}</p>
              <p className="text-sm text-red-700 dark:text-red-400">Failed</p>
            </div>
            {isComplete ? (
              <div className="text-center p-4 rounded-md bg-amber-50 dark:bg-amber-950/30">
                <p className="text-3xl font-bold text-amber-600">{formatNumber(skippedEmails)}</p>
                <p className="text-sm text-amber-700 dark:text-amber-400">Skipped</p>
              </div>
            ) : isCancelled ? (
              <div className="text-center p-4 rounded-md bg-slate-50 dark:bg-slate-900/30">
                <p className="text-3xl font-bold text-slate-600 dark:text-slate-400">
                  {formatNumber(pendingEmails)}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Not Reached</p>
              </div>
            ) : (
              <div className="text-center p-4 rounded-md bg-blue-50 dark:bg-blue-950/30">
                <p className="text-3xl font-bold text-blue-600">{formatNumber(pendingEmails)}</p>
                <p className="text-sm text-blue-700 dark:text-blue-400">Pending</p>
              </div>
            )}
          </div>

          {/* Completion summary */}
          {isComplete && (
            <div className="p-4 rounded-md bg-green-50 dark:bg-green-950/30 text-center">
              <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" aria-hidden="true" />
              <p className="font-medium text-green-800 dark:text-green-400">
                Campaign Completed Successfully!
              </p>
              <p className="text-sm text-green-700 dark:text-green-500">
                {deliveryRate}% delivery rate ({sentEmails} sent, {failedEmails} failed)
              </p>
              <p className="text-sm text-green-700 dark:text-green-500 mt-0.5">
                Reach: {reachRate}% of list &middot;{" "}
                {formatNumber(currentCampaign.creditsUsed || sentEmails)} credits used
              </p>

              {skippedEmails > 0 && unprocessed === 0 && (
                <div className="flex items-start gap-2 mt-3 pt-3 border-t border-green-200 dark:border-green-800 text-left">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {skippedEmails === 1
                      ? "1 contact was skipped"
                      : `${formatNumber(skippedEmails)} contacts were skipped`}{" "}
                    due to your suppression list.{" "}
                    {formatNumber(sentEmails)} of {formatNumber(totalEmails)} contacts received this email.
                  </p>
                </div>
              )}

              {unprocessed > 0 && (
                <div className="flex items-start gap-2 mt-3 pt-3 border-t border-green-200 dark:border-green-800 text-left">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    Campaign did not complete all contacts — {formatNumber(unprocessed)}{" "}
                    {unprocessed === 1 ? "contact was" : "contacts were"} not reached.
                    This may be due to insufficient credits or an early stop.
                    Top up credits and retry to reach the remaining contacts.
                  </p>
                </div>
              )}

              {sentEmails > 0 &&
                (currentCampaign.openedEmails > 0 || currentCampaign.clickedEmails > 0) && (
                  <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                    <span className="flex items-center gap-1 text-sm text-violet-700 dark:text-violet-400">
                      <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                      {((currentCampaign.openedEmails / sentEmails) * 100).toFixed(1)}% open rate
                    </span>
                    <span className="flex items-center gap-1 text-sm text-blue-700 dark:text-blue-400">
                      <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
                      {((currentCampaign.clickedEmails / sentEmails) * 100).toFixed(1)}% click rate
                    </span>
                  </div>
                )}
            </div>
          )}

          {/* Cancellation summary */}
          {isCancelled && (
            <div className="p-4 rounded-md bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 text-center">
              <Ban className="h-8 w-8 mx-auto text-slate-500 dark:text-slate-400 mb-2" aria-hidden="true" />
              <p className="font-medium text-slate-800 dark:text-slate-300">Campaign Cancelled</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {sentEmails > 0
                  ? `${formatNumber(sentEmails)} email${sentEmails === 1 ? "" : "s"} sent before cancellation`
                  : "No emails were sent"}
                {pendingEmails > 0
                  ? ` · ${formatNumber(pendingEmails)} contact${pendingEmails === 1 ? "" : "s"} not reached`
                  : ""}
              </p>
              {(currentCampaign.creditsUsed || 0) > 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-0.5">
                  {formatNumber(currentCampaign.creditsUsed)} credits consumed
                </p>
              )}
              {sentEmails === 0 && pendingEmails === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-0.5">
                  No credits were used.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email status log */}
      <Card className="border-card-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Email Status Log</CardTitle>
          <CardDescription>
            {isComplete
              ? "Completed email deliveries"
              : isCancelled
              ? "Emails sent before cancellation"
              : "Real-time status updates"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {emailStatuses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
                <p>
                  {isComplete
                    ? "All emails processed successfully"
                    : isCancelled
                    ? "No emails were sent before cancellation"
                    : "Waiting for emails to process…"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {emailStatuses.map((status, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      {status.status === "sent" ? (
                        <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                      ) : status.status === "suppressed" ? (
                        <Ban className="h-4 w-4 text-amber-500" aria-hidden="true" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
                      )}
                      <span className="text-sm font-mono truncate max-w-[140px] sm:max-w-[200px]">
                        {status.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          status.status === "sent"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : status.status === "suppressed"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        )}
                      >
                        {status.status === "suppressed" ? "SUPPRESSED" : status.status}
                      </Badge>
                      {status.reason && status.status === "suppressed" && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {status.reason}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Post-completion navigation */}
      {isComplete && (
        <div className="flex justify-center gap-4 pt-4">
          <Link href="/app/dashboard">
            <Button variant="outline" onClick={handleFinish} data-testid="button-go-dashboard">
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              Go to Dashboard
            </Button>
          </Link>
          <Link href="/app/history">
            <Button onClick={handleFinish} data-testid="button-view-history">
              <History className="mr-2 h-4 w-4" aria-hidden="true" />
              View Campaign History
            </Button>
          </Link>
        </div>
      )}

      {/* Post-cancellation navigation */}
      {isCancelled && (
        <div className="flex justify-center gap-4 pt-4">
          <Link href="/app/campaigns/new">
            <Button variant="outline" onClick={handleFinish} data-testid="button-new-campaign-after-cancel">
              <Send className="mr-2 h-4 w-4" aria-hidden="true" />
              New Campaign
            </Button>
          </Link>
          <Link href="/app/history">
            <Button onClick={handleFinish} data-testid="button-view-history-after-cancel">
              <History className="mr-2 h-4 w-4" aria-hidden="true" />
              View History
            </Button>
          </Link>
        </div>
      )}

      <CancelCampaignDialog
        open={cancelDialogOpen}
        onOpenChange={handleDialogOpenChange}
        campaign={currentCampaign}
        onConfirm={() => cancelMutation.mutate()}
        isPending={cancelMutation.isPending}
        error={cancelError}
      />
    </div>
  );
}
