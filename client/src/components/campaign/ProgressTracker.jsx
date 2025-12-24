import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useCampaign } from "@/context/CampaignContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  Mail
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

export default function ProgressTracker() {
  const { contacts, campaignName, resetCampaign } = useCampaign();
  const [campaign, setCampaign] = useState({
    status: "RUNNING",
    sentEmails: 0,
    failedEmails: 0,
    totalEmails: contacts.length,
    emailStatuses: []
  });

  useEffect(() => {
    if (campaign.status !== "RUNNING") return;

    const interval = setInterval(() => {
      setCampaign(prev => {
        const remaining = prev.totalEmails - prev.sentEmails - prev.failedEmails;
        if (remaining <= 0) {
          return { ...prev, status: "COMPLETED" };
        }

        const toProcess = Math.min(Math.ceil(Math.random() * 5) + 1, remaining);
        const failed = Math.random() < 0.05 ? 1 : 0;
        const sent = toProcess - failed;

        const newStatuses = [];
        for (let i = 0; i < sent; i++) {
          const contactIndex = prev.sentEmails + prev.failedEmails + i;
          if (contactIndex < contacts.length) {
            newStatuses.push({
              email: contacts[contactIndex]?.email || `email${contactIndex}@example.com`,
              status: "sent",
              timestamp: new Date().toISOString()
            });
          }
        }
        if (failed > 0) {
          const contactIndex = prev.sentEmails + prev.failedEmails + sent;
          if (contactIndex < contacts.length) {
            newStatuses.push({
              email: contacts[contactIndex]?.email || `email${contactIndex}@example.com`,
              status: "failed",
              timestamp: new Date().toISOString()
            });
          }
        }

        return {
          ...prev,
          sentEmails: prev.sentEmails + sent,
          failedEmails: prev.failedEmails + failed,
          emailStatuses: [...newStatuses, ...prev.emailStatuses].slice(0, 100)
        };
      });
    }, 500);

    return () => clearInterval(interval);
  }, [campaign.status, contacts]);

  const togglePause = () => {
    setCampaign(prev => ({
      ...prev,
      status: prev.status === "RUNNING" ? "PAUSED" : "RUNNING"
    }));
  };

  const progress = campaign.totalEmails > 0 
    ? ((campaign.sentEmails + campaign.failedEmails) / campaign.totalEmails) * 100 
    : 0;

  const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;

  const isComplete = campaign.status === "COMPLETED";
  const successRate = campaign.sentEmails + campaign.failedEmails > 0
    ? ((campaign.sentEmails / (campaign.sentEmails + campaign.failedEmails)) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Campaign Progress
        </h2>
        <p className="text-muted-foreground mt-1">
          {campaignName || "Email Campaign"}
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
              {campaign.status === "RUNNING" && (
                <span className="text-sm text-muted-foreground animate-pulse">
                  Processing...
                </span>
              )}
            </div>
            {(campaign.status === "RUNNING" || campaign.status === "PAUSED") && (
              <Button
                variant="outline"
                size="sm"
                onClick={togglePause}
                className="gap-2"
                data-testid="button-toggle-pause"
              >
                {campaign.status === "RUNNING" ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Resume
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-md bg-muted/50">
              <p className="text-3xl font-bold">{formatNumber(campaign.totalEmails)}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <div className="text-center p-4 rounded-md bg-green-50 dark:bg-green-950/30">
              <p className="text-3xl font-bold text-green-600">{formatNumber(campaign.sentEmails)}</p>
              <p className="text-sm text-green-700 dark:text-green-400">Sent</p>
            </div>
            <div className="text-center p-4 rounded-md bg-red-50 dark:bg-red-950/30">
              <p className="text-3xl font-bold text-red-600">{formatNumber(campaign.failedEmails)}</p>
              <p className="text-sm text-red-700 dark:text-red-400">Failed</p>
            </div>
            <div className="text-center p-4 rounded-md bg-blue-50 dark:bg-blue-950/30">
              <p className="text-3xl font-bold text-blue-600">
                {formatNumber(campaign.totalEmails - campaign.sentEmails - campaign.failedEmails)}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400">Pending</p>
            </div>
          </div>

          {isComplete && (
            <div className="p-4 rounded-md bg-green-50 dark:bg-green-950/30 text-center">
              <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="font-medium text-green-800 dark:text-green-400">
                Campaign Completed Successfully!
              </p>
              <p className="text-sm text-green-700 dark:text-green-500">
                {successRate}% success rate ({campaign.sentEmails} sent, {campaign.failedEmails} failed)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-card-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Email Status Log</CardTitle>
          <CardDescription>Real-time status updates</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {campaign.emailStatuses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Waiting for emails to process...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {campaign.emailStatuses.map((status, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      {status.status === "sent" ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm font-mono">{status.email}</span>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs",
                        status.status === "sent" 
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      )}
                    >
                      {status.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {isComplete && (
        <div className="flex justify-center gap-4 pt-4">
          <Link href="/dashboard">
            <Button variant="outline" onClick={resetCampaign} data-testid="button-go-dashboard">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
          <Link href="/history">
            <Button onClick={resetCampaign} data-testid="button-view-history">
              <History className="mr-2 h-4 w-4" />
              View Campaign History
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
