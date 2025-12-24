import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Coins, 
  Send, 
  History, 
  TrendingUp, 
  Plus,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  Activity
} from "lucide-react";
import { formatNumber, formatDate, calculateCreditsRemaining } from "@/lib/utils";

function StatCard({ title, value, subtitle, icon: Icon, trend, loading }) {
  if (loading) {
    return (
      <Card className="border-card-border">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-10 w-10 rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-card-border hover:border-border transition-colors">
      <CardContent className="p-6">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-green-600 font-medium">{trend}</span>
              </div>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentActivityItem({ activity }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "RUNNING":
        return <Activity className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      FAILED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      RUNNING: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      PAUSED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      PENDING: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    };
    return variants[status] || variants.PENDING;
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        {getStatusIcon(activity.status)}
        <div>
          <p className="text-sm font-medium">{activity.name}</p>
          <p className="text-xs text-muted-foreground">
            {activity.sentEmails}/{activity.totalEmails} emails sent
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge 
          variant="secondary" 
          className={`text-xs ${getStatusBadge(activity.status)}`}
        >
          {activity.status}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {formatDate(activity.createdAt)}
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"]
  });

  const { data: recentCampaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/campaigns", "?limit=5"]
  });

  const creditsRemaining = user 
    ? calculateCreditsRemaining(
        user.creditsReceived || 0, 
        user.creditsAllocated || 0, 
        user.creditsUsed || 0
      )
    : 0;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.username}. Here's your campaign overview.
            </p>
          </div>
          <Link href="/app/campaigns/new">
            <Button className="gap-2" data-testid="button-new-campaign">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Available Credits"
            value={formatNumber(creditsRemaining)}
            subtitle="Credits remaining"
            icon={Coins}
            loading={statsLoading}
          />
          <StatCard
            title="Credits Used"
            value={formatNumber(user?.creditsUsed || 0)}
            subtitle="Total emails sent"
            icon={Send}
            loading={statsLoading}
          />
          <StatCard
            title="Total Campaigns"
            value={formatNumber(stats?.totalCampaigns || 0)}
            subtitle="All time"
            icon={History}
            loading={statsLoading}
          />
          <StatCard
            title="Active Campaigns"
            value={formatNumber(stats?.activeCampaigns || 0)}
            subtitle="Currently running"
            icon={Activity}
            loading={statsLoading}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-card-border">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
              <div>
                <CardTitle className="text-lg">Recent Campaigns</CardTitle>
                <CardDescription>Your latest email campaigns</CardDescription>
              </div>
              <Link href="/app/history">
                <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-all">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 py-3">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                </div>
              ) : recentCampaigns?.length > 0 ? (
                <div>
                  {recentCampaigns.map((campaign) => (
                    <RecentActivityItem key={campaign.id} activity={campaign} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Send className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">No campaigns yet</p>
                  <Link href="/app/campaigns/new">
                    <Button variant="outline" size="sm" data-testid="button-create-first-campaign">
                      Create your first campaign
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/app/campaigns/new" className="block">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 h-auto py-3"
                  data-testid="quick-action-new-campaign"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">New Campaign</p>
                    <p className="text-xs text-muted-foreground">Create and send emails</p>
                  </div>
                </Button>
              </Link>
              <Link href="/app/templates" className="block">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 h-auto py-3"
                  data-testid="quick-action-templates"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Send className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Email Templates</p>
                    <p className="text-xs text-muted-foreground">Manage your templates</p>
                  </div>
                </Button>
              </Link>
              <Link href="/app/history" className="block">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 h-auto py-3"
                  data-testid="quick-action-history"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <History className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Campaign History</p>
                    <p className="text-xs text-muted-foreground">View past campaigns</p>
                  </div>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {user && (
          <Card className="border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Credit Summary</CardTitle>
              <CardDescription>Your credit allocation and usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="text-center p-4 rounded-md bg-muted/50">
                  <p className="text-2xl font-bold text-primary">{formatNumber(user.creditsReceived || 0)}</p>
                  <p className="text-sm text-muted-foreground">Received</p>
                </div>
                <div className="text-center p-4 rounded-md bg-muted/50">
                  <p className="text-2xl font-bold text-yellow-600">{formatNumber(user.creditsAllocated || 0)}</p>
                  <p className="text-sm text-muted-foreground">Allocated</p>
                </div>
                <div className="text-center p-4 rounded-md bg-muted/50">
                  <p className="text-2xl font-bold text-red-600">{formatNumber(user.creditsUsed || 0)}</p>
                  <p className="text-sm text-muted-foreground">Used</p>
                </div>
                <div className="text-center p-4 rounded-md bg-muted/50">
                  <p className="text-2xl font-bold text-green-600">{formatNumber(creditsRemaining)}</p>
                  <p className="text-sm text-muted-foreground">Available</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
