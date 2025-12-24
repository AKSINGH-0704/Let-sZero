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
  Calendar,
  Filter,
  Eye,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Pause
} from "lucide-react";
import { formatNumber, formatDate, cn } from "@/lib/utils";
import { Link } from "wouter";

const STATUS_CONFIG = {
  COMPLETED: { 
    icon: CheckCircle, 
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
  },
  RUNNING: { 
    icon: Activity, 
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" 
  },
  PAUSED: { 
    icon: Pause, 
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" 
  },
  FAILED: { 
    icon: XCircle, 
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" 
  },
  PENDING: { 
    icon: Clock, 
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" 
  },
  DRAFT: { 
    icon: Clock, 
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" 
  }
};

export default function History() {
  const { isRootAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["/api/campaigns"]
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
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-32" />
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

                      return (
                        <TableRow key={campaign.id} data-testid={`row-campaign-${campaign.id}`}>
                          <TableCell className="font-medium">{campaign.name}</TableCell>
                          <TableCell>
                            <Badge className={cn("gap-1", config.color)}>
                              <StatusIcon className="h-3 w-3" />
                              {campaign.status}
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
                <HistoryIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium mb-2">No campaigns found</p>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first email campaign to get started"}
                </p>
                <Link href="/app/campaigns/new">
                  <Button data-testid="button-create-first-campaign">
                    <Send className="mr-2 h-4 w-4" />
                    Create Campaign
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
