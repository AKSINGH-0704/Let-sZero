import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/common/PageHeader";
import { Link } from "wouter";
import {
  User,
  Mail,
  Shield,
  Coins,
  Calendar,
  Zap,
  ArrowRight,
  Globe,
} from "lucide-react";
import { formatNumber, formatDate, getInitials, calculateCreditsRemaining } from "@/lib/utils";

// Profile is ACCOUNT-ONLY (M19 IA): who you are — username, email, role, plan,
// credits, deletion. Everything about HOW you send (sender identity, domains,
// verification, warm-up, sending status) lives in Domains, the sending-identity
// home; this page only points there.

// Mirrors PLAN_LIMITS in shared/schema.js — keep in sync when plan features change.
const PROFILE_PLAN_LIMITS = {
  free:       { maxTemplates: 3,        maxActiveCampaigns: 1,        canSchedule: false, label: "Free Plan"   },
  starter:    { maxTemplates: 10,       maxActiveCampaigns: 5,        canSchedule: true,  label: "Starter"     },
  growth:     { maxTemplates: 25,       maxActiveCampaigns: 10,       canSchedule: true,  label: "Growth"      },
  scale:      { maxTemplates: 100,      maxActiveCampaigns: 20,       canSchedule: true,  label: "Scale"       },
  enterprise: { maxTemplates: Infinity, maxActiveCampaigns: Infinity, canSchedule: true,  label: "Enterprise"  },
};

const ROLE_CONFIG = {
  ROOT_ADMIN: { label: "Root Admin", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  SUB_ADMIN: { label: "Sub Admin", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  USER: { label: "User", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" }
};

export default function Profile() {
  const { user, isAdmin } = useAuth();

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
        <PageHeader title="Profile" description="Manage your account" />

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

        {/* Sending is managed in Domains — pointer, not a duplicate surface (M19 IA) */}
        {!isAdmin && (
          <Card className="border-card-border">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Sender identity &amp; sending status</p>
                  <p className="text-xs text-muted-foreground">
                    Your From name, sending domains, verification and warm-up are managed in Domains.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href="/app/domains">
                  Open Domains
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

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
                <p className="text-2xl font-bold text-warning">
                  {formatNumber(user.creditsAllocated || 0)}
                </p>
                <p className="text-sm text-muted-foreground">Allocated</p>
              </div>
              <div className="text-center p-4 rounded-md bg-muted/50">
                <p className="text-2xl font-bold text-destructive">
                  {formatNumber(user.creditsUsed || 0)}
                </p>
                <p className="text-sm text-muted-foreground">Used</p>
              </div>
              <div className="text-center p-4 rounded-md bg-success/10">
                <p className="text-2xl font-bold text-success">
                  {formatNumber(creditsRemaining)}
                </p>
                <p className="text-sm text-success">Available</p>
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
                    <Link href="/app/payments" className="inline-flex items-center gap-1 text-sm text-primary hover:underline underline-offset-2">
                      Upgrade Plan <ArrowRight className="w-3 h-3" />
                    </Link>
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
                    <span className={`font-medium ${limits.canSchedule ? "text-success" : "text-muted-foreground"}`}>
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

        <Card className="border-destructive/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-destructive">Account Deletion</CardTitle>
            <CardDescription>
              To delete your account and all associated data, contact our support team. We will
              process your request within 5 business days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="destructive" size="sm">
              <a
                href={`mailto:support@repmail.in?subject=Account%20deletion%20request&body=Please%20delete%20my%20account%3A%20${encodeURIComponent(user.email)}`}
              >
                Request account deletion
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
