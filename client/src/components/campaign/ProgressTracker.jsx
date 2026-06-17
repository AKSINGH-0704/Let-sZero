import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useCampaign } from "@/context/CampaignContext";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
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
} from "lucide-react";
import { formatNumber, cn } from "@/lib/utils";

const STATUS_CONFIG = {
  RUNNING: {
    icon: Activity,
    label: "Running",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
  },
  PAUSED: {
    icon: Pause,
    label: "Paused",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
  },
  COMPLETED: {
    icon: CheckCircle,
    label: "Completed",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
  },
  FAILED: {
    icon: XCircle,
    label: "Failed",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  },
  PENDING: {
    icon: Clock,
    label: "Pending",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
  }
};

const SUPPRESSION_SOURCE_LABEL = {
  unsubscribe: "Unsubscribe",
  bounce:      "Bounce",
  complaint:   "Complaint",
  manual:      "Manual",
};

export default function ProgressTracker() {
  const { contacts, campaignName, campaignId, campaignData, resetCampaign, columnMapping } = useCampaign();
  const [emailStatuses, setEmailStatuses] = useState([]);

  const mountedAt = useRef(Date.now());

  const { data: fetchedCampaign } = useQuery({
    queryKey: ["/api/campaigns", campaignId],
    enabled: !!campaignId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "COMPLETED" || data?.status === "FAILED") {
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

  // Contacts with actual per-record status from the API (up to 50 most recent).
  // Used to show SUPPRESSED rows with source/reason in the status log.
  const campaignEmailRecords = currentCampaign.campaignEmails || [];

  useEffect(() => {
    if (!contacts.length && campaignEmailRecords.length === 0) return;

    const statuses = [];

    if (campaignEmailRecords.length > 0) {
      // Use real per-record data from API — accurate status and suppression detail
      for (const record of campaignEmailRecords) {
        if (record.status === "SUPPRESSED") {
          const source = record.suppressionDetail?.source;
          statuses.push({
            email:      record.recipientEmail || "—",
            status:     "suppressed",
            reason:     SUPPRESSION_SOURCE_LABEL[source] || source || "Suppressed",
            timestamp:  record.sentAt || record.createdAt,
          });
        } else if (record.status === "SENT") {
          statuses.push({
            email:      record.recipientEmail || "—",
            status:     "sent",
            timestamp:  record.sentAt,
          });
        } else if (record.status === "FAILED") {
          statuses.push({
            email:      record.recipientEmail || "—",
            status:     "failed",
            reason:     record.failureReason || "Send failed",
            timestamp:  record.createdAt,
          });
        }
      }
    } else {
      // Fallback: synthetic log from contacts array (no real API records yet)
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

  const statusConfig = STATUS_CONFIG[currentCampaign.status] || STATUS_CONFIG.COMPLETED;
  const StatusIcon = statusConfig.icon;

  const isComplete = currentCampaign.status === "COMPLETED";

  // Delivery rate = sent / (sent + failed) — excludes suppressed from denominator
  const deliveryDenominator = sentEmails + failedEmails;
  const deliveryRate = deliveryDenominator > 0
    ? ((sentEmails / deliveryDenominator) * 100).toFixed(1)
    : 100;

  // Reach rate = (sent + skipped) / total — what fraction of the list was contacted or suppressed
  const reachRate = totalEmails > 0
    ? (((sentEmails + skippedEmails) / totalEmails) * 100).toFixed(1)
    : 100;

  // True pending = contacts not yet touched (running campaigns only)
  const pendingEmails = Math.max(0, totalEmails - sentEmails - failedEmails - skippedEmails);

  // Truly unprocessed = contacts the loop never reached (credit exhaustion / crash)
  const unprocessed = isComplete ? pendingEmails : 0;

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
            <PartyPopper className="h-5 w-5 text-green-600" />
          ) : (
            <Activity className="h-5 w-5 text-primary" />
          )}
          {isComplete ? "Campaign Complete!" : "Campaign Progress"}
        </h2>
        <p className="text-muted-foreground mt-1">
          {currentCampaign.name || campaignName || "Email Campaign"}
        </p>
      </div>

      <Card className="border-card-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge className={cn("text-sm gap-1", statusConfig.color)}>
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
              {currentCampaign.status === "RUNNING" && (
                <span className="text-sm text-muted-foreground animate-pulse">
                  Processing...
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Stats tiles — 4 columns: Total / Sent / Failed / Skipped-or-Pending */}
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
            ) : (
              <div className="text-center p-4 rounded-md bg-blue-50 dark:bg-blue-950/30">
                <p className="text-3xl font-bold text-blue-600">{formatNumber(pendingEmails)}</p>
                <p className="text-sm text-blue-700 dark:text-blue-400">Pending</p>
              </div>
            )}
          </div>

          {isComplete && (
            <div className="p-4 rounded-md bg-green-50 dark:bg-green-950/30 text-center">
              <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="font-medium text-green-800 dark:text-green-400">
                Campaign Completed Successfully!
              </p>
              <p className="text-sm text-green-700 dark:text-green-500">
                {deliveryRate}% delivery rate ({sentEmails} sent, {failedEmails} failed)
              </p>
              <p className="text-sm text-green-700 dark:text-green-500 mt-0.5">
                Reach: {reachRate}% of list &middot; {formatNumber(currentCampaign.creditsUsed || sentEmails)} credits used
              </p>

              {/* Suppression skips — all contacts processed, some suppressed (healthy) */}
              {skippedEmails > 0 && unprocessed === 0 && (
                <div className="flex items-start gap-2 mt-3 pt-3 border-t border-green-200 dark:border-green-800 text-left">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {skippedEmails === 1
                      ? "1 contact was skipped"
                      : `${formatNumber(skippedEmails)} contacts were skipped`}{" "}
                    due to your suppression list.{" "}
                    {formatNumber(sentEmails)} of {formatNumber(totalEmails)} contacts received this email.
                  </p>
                </div>
              )}

              {/* Truly unprocessed — credit exhaustion or early termination */}
              {unprocessed > 0 && (
                <div className="flex items-start gap-2 mt-3 pt-3 border-t border-green-200 dark:border-green-800 text-left">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    Campaign did not complete all contacts — {formatNumber(unprocessed)}{" "}
                    {unprocessed === 1 ? "contact was" : "contacts were"} not reached.
                    This may be due to insufficient credits or an early stop.
                    Top up credits and retry to reach the remaining contacts.
                  </p>
                </div>
              )}

              {sentEmails > 0 && (currentCampaign.openedEmails > 0 || currentCampaign.clickedEmails > 0) && (
                <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                  <span className="flex items-center gap-1 text-sm text-violet-700 dark:text-violet-400">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {((currentCampaign.openedEmails / sentEmails) * 100).toFixed(1)}% open rate
                  </span>
                  <span className="flex items-center gap-1 text-sm text-blue-700 dark:text-blue-400">
                    <MousePointerClick className="h-3.5 w-3.5" />
                    {((currentCampaign.clickedEmails / sentEmails) * 100).toFixed(1)}% click rate
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-card-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Email Status Log</CardTitle>
          <CardDescription>
            {isComplete ? "Completed email deliveries" : "Real-time status updates"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {emailStatuses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>
                  {isComplete ? "All emails processed successfully" : "Waiting for emails to process..."}
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
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : status.status === "suppressed" ? (
                        <Ban className="h-4 w-4 text-amber-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm font-mono truncate max-w-[140px] sm:max-w-[200px]">{status.email}</span>
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

      {isComplete && (
        <div className="flex justify-center gap-4 pt-4">
          <Link href="/app/dashboard">
            <Button variant="outline" onClick={handleFinish} data-testid="button-go-dashboard">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
          <Link href="/app/history">
            <Button onClick={handleFinish} data-testid="button-view-history">
              <History className="mr-2 h-4 w-4" />
              View Campaign History
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
