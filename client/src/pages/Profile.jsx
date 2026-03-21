import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Shield,
  Coins,
  Calendar,
  Zap,
  ArrowRight
} from "lucide-react";
import { formatNumber, formatDate, getInitials, calculateCreditsRemaining } from "@/lib/utils";

const PROFILE_PLAN_LIMITS = {
  free:       { maxTemplates: 3,        maxActiveCampaigns: 1,        maxTeamMembers: 1,        canSchedule: false, label: "Free Trial"  },
  starter:    { maxTemplates: 10,       maxActiveCampaigns: 5,        maxTeamMembers: 1,        canSchedule: true,  label: "Starter"     },
  growth:     { maxTemplates: 25,       maxActiveCampaigns: 10,       maxTeamMembers: 5,        canSchedule: true,  label: "Growth"      },
  scale:      { maxTemplates: 100,      maxActiveCampaigns: 20,       maxTeamMembers: 10,       canSchedule: true,  label: "Scale"       },
  enterprise: { maxTemplates: Infinity, maxActiveCampaigns: Infinity, maxTeamMembers: Infinity, canSchedule: true,  label: "Enterprise"  },
};

const ROLE_CONFIG = {
  ROOT_ADMIN: { label: "Root Admin", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  SUB_ADMIN: { label: "Sub Admin", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  USER: { label: "User", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" }
};

export default function Profile() {
  const { user } = useAuth();

  const { data: templates } = useQuery({ queryKey: ["/api/templates"] });
  const { data: campaigns } = useQuery({ queryKey: ["/api/campaigns"] });

  if (!user) return null;

  const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.USER;
  const creditsRemaining = calculateCreditsRemaining(
    user.creditsReceived || 0,
    user.creditsAllocated || 0,
    user.creditsUsed || 0
  );

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            View your account information
          </p>
        </div>

        <Card className="border-card-border">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {getInitials(user.username)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-2xl font-semibold">{user.username}</h2>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="mt-2">
                  <Badge className={roleConfig.color}>
                    <Shield className="h-3 w-3 mr-1" />
                    {roleConfig.label}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              Credit Summary
            </CardTitle>
            <CardDescription>Your credit allocation and usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-md bg-muted/50">
                <p className="text-2xl font-bold text-primary">
                  {formatNumber(user.creditsReceived || 0)}
                </p>
                <p className="text-sm text-muted-foreground">Received</p>
              </div>
              <div className="text-center p-4 rounded-md bg-muted/50">
                <p className="text-2xl font-bold text-yellow-600">
                  {formatNumber(user.creditsAllocated || 0)}
                </p>
                <p className="text-sm text-muted-foreground">Allocated</p>
              </div>
              <div className="text-center p-4 rounded-md bg-muted/50">
                <p className="text-2xl font-bold text-red-600">
                  {formatNumber(user.creditsUsed || 0)}
                </p>
                <p className="text-sm text-muted-foreground">Used</p>
              </div>
              <div className="text-center p-4 rounded-md bg-green-50 dark:bg-green-950/30">
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(creditsRemaining)}
                </p>
                <p className="text-sm text-green-700 dark:text-green-400">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan Info Card */}
        {(() => {
          const plan = user.plan || "free";
          const limits = PROFILE_PLAN_LIMITS[plan] || PROFILE_PLAN_LIMITS.free;
          const templateCount = templates?.length || 0;
          const activeCampaignCount = (campaigns || []).filter(c => ["RUNNING","PENDING","DRAFT"].includes(c.status)).length;
          const maxT = limits.maxTemplates === Infinity ? "Unlimited" : limits.maxTemplates;
          const maxC = limits.maxActiveCampaigns === Infinity ? "Unlimited" : limits.maxActiveCampaigns;
          return (
            <Card className="border-card-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Your Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl font-semibold">{limits.label}</span>
                  {plan !== "enterprise" && (
                    <a href="/app/payments" className="inline-flex items-center gap-1 text-sm text-cyan-500 hover:text-cyan-400">
                      Upgrade Plan <ArrowRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Saved Templates</span>
                    <span className="text-foreground font-medium">{templateCount} / {maxT}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>Active Campaigns</span>
                    <span className="text-foreground font-medium">{activeCampaignCount} / {maxC}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>Campaign Scheduling</span>
                    <span className={`font-medium ${limits.canSchedule ? "text-green-500" : "text-muted-foreground"}`}>
                      {limits.canSchedule ? "Enabled" : "Not available"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Username</span>
              </div>
              <span className="font-medium">{user.username}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Email</span>
              </div>
              <span className="font-medium">{user.email}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Role</span>
              </div>
              <Badge className={roleConfig.color}>{roleConfig.label}</Badge>
            </div>
            {user.createdAt && (
              <>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Member Since</span>
                  </div>
                  <span className="font-medium">{formatDate(user.createdAt)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
