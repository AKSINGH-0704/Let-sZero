import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldAlert, Activity, Pause, Play } from "lucide-react";

function RateBar({ value, warning, critical, label }) {
  const color =
    value >= critical ? "bg-red-500" :
    value >= warning  ? "bg-yellow-500" :
    "bg-green-500";
  const textColor =
    value >= critical ? "text-red-600 dark:text-red-400" :
    value >= warning  ? "text-yellow-600 dark:text-yellow-400" :
    "text-green-600 dark:text-green-400";
  const pct = Math.min((value / critical) * 100, 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${textColor}`}>{value.toFixed(2)}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        SES warning at {warning}% · pauses account at {critical}%
      </p>
    </div>
  );
}

export default function DeliveryHealthPanel() {
  const { toast } = useToast();

  const { data: health, isLoading } = useQuery({
    queryKey: ["/api/admin/delivery-health"],
    refetchInterval: 60_000,
  });

  const { data: healthStatus } = useQuery({
    queryKey: ["/api/health"],
    refetchInterval: 30_000,
  });

  const pauseMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/platform/pause-sending", { reason: "manual_admin_pause" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health"] });
      toast({ title: "Platform sending paused" });
    },
    onError: (err) => toast({ title: "Failed to pause", description: err.message, variant: "destructive" }),
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/platform/resume-sending");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/health"] });
      toast({ title: `Platform sending resumed — ${data.requeuedCampaigns} campaign(s) re-queued` });
    },
    onError: (err) => toast({ title: "Failed to resume", description: err.message, variant: "destructive" }),
  });

  const isPlatformPaused = healthStatus?.sendPaused === true;

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Delivery Health</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const statusColor =
    health?.status === "critical" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
    health?.status === "warning"  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Delivery Health
            {health?.status && (
              <Badge className={`text-xs ${statusColor}`}>{health.status}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">30d · {health?.totals?.sent?.toLocaleString() ?? 0} sent</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Rates */}
        <div className="space-y-4">
          <RateBar
            value={health?.rates?.bounceRate ?? 0}
            warning={health?.thresholds?.bounce?.warning ?? 5}
            critical={health?.thresholds?.bounce?.critical ?? 10}
            label="Bounce Rate"
          />
          <RateBar
            value={health?.rates?.complaintRate ?? 0}
            warning={health?.thresholds?.complaint?.warning ?? 0.1}
            critical={health?.thresholds?.complaint?.critical ?? 0.5}
            label="Complaint Rate"
          />
        </div>

        {/* Suppression growth */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg border p-3">
            <div className="text-xl font-semibold">{health?.suppression?.addedLast7d ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">New suppressions (7d)</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xl font-semibold">{health?.suppression?.addedLast30d ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">New suppressions (30d)</div>
          </div>
        </div>

        {/* Top bouncers */}
        {health?.topBouncers?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">High Bounce Users (30d)</p>
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs text-right">Sent</TableHead>
                    <TableHead className="text-xs text-right">Bounced</TableHead>
                    <TableHead className="text-xs text-right">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {health.topBouncers.map((u) => (
                    <TableRow key={u.userId}>
                      <TableCell className="text-xs truncate max-w-[160px]">{u.email}</TableCell>
                      <TableCell className="text-xs text-right">{u.sent.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right">{u.bounced.toLocaleString()}</TableCell>
                      <TableCell className={`text-xs text-right font-semibold ${u.bounceRate >= 10 ? "text-red-600" : u.bounceRate >= 5 ? "text-yellow-600" : "text-green-600"}`}>
                        {u.bounceRate.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Platform send pause / resume */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Platform Sending</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isPlatformPaused ? "All campaign sends are paused" : "Active — campaigns are sending normally"}
            </p>
          </div>
          {isPlatformPaused ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="default" className="gap-1.5" disabled={resumeMutation.isPending}>
                  <Play className="h-3 w-3" /> Resume
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Resume platform sending?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will re-enable all campaign sending and automatically re-queue any campaigns that were paused. Emails will begin sending immediately.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => resumeMutation.mutate()}>Resume Sending</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" className="gap-1.5" disabled={pauseMutation.isPending}>
                  <Pause className="h-3 w-3" /> Pause All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Pause all platform sending?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will immediately stop all active and queued campaigns across every user account. Use this only in a deliverability emergency. Campaigns can be resumed by clicking Resume.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => pauseMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Pause All Sending
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
