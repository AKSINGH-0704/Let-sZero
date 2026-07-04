import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  Coins,
  Send,
  History,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRight,
  ArrowUpRight,
  AlertCircle,
  Activity,
  Mail,
  Users,
  BarChart3,
  CreditCard,
  Wallet,
  Zap,
  Calendar,
  PieChart,
  Target,
  UserPlus,
  Sparkles,
  Globe,
} from "lucide-react";
import { formatNumber, formatDate, calculateCreditsRemaining } from "@/lib/utils";
import { getStatusConfig } from "@/lib/campaignStatus";
import DeliveryHealthPanel from "@/components/DeliveryHealthPanel";
import SenderHealthWidget from "@/components/SenderHealthWidget";
import PageHeader from "@/components/common/PageHeader";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

// Icon tint classes for the campaign table status column.
// Badge color (from campaignStatus.js) uses bg+text classes for pill styling;
// the table icon needs a standalone text color — kept local to this component.
const STATUS_ICON_COLOR = {
  RUNNING:   "text-blue-600",
  PAUSED:    "text-yellow-600",
  COMPLETED: "text-green-600",
  FAILED:    "text-red-600",
  CANCELLED: "text-slate-500",
  PENDING:   "text-gray-500",
  DRAFT:     "text-slate-500",
};

const PLAN_BADGE_STYLES = {
  free:       "bg-gray-500/20 text-gray-400 border border-gray-500/30",
  starter:    "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25",
  growth:     "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  scale:      "bg-cyan-500/15 text-cyan-300 border border-cyan-400/25",
  enterprise: "bg-violet-500/15 text-violet-400 border border-violet-500/25",
};

const PLAN_LABELS = {
  free: "Free Plan", starter: "Starter", growth: "Growth",
  scale: "Scale", enterprise: "Enterprise",
};

export default function Dashboard() {
  const { user, isAdmin, isRootAdmin } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"]
  });

  const { data: recentCampaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["/api/campaigns", "?limit=5"]
  });

  const { data: creditsInfo } = useQuery({
    queryKey: ["/api/credits/info"]
  });

  // Use total from credits/info (paid + free) so it matches the Payments page.
  // Free-plan accounts have creditsReceived=0 until first send; fall back to 500
  // so the dashboard never shows a misleading "0 available" before creditsInfo loads.
  const FREE_MONTHLY = 500; // mirrors MONTHLY_CREDITS.free in shared/schema.js
  const creditsRemaining = creditsInfo != null
    ? (creditsInfo.total ?? 0)
    : user
      ? (user.plan === "free" && !user.isTrialUser
          ? Math.max(0, FREE_MONTHLY - (user.freeCreditsUsed || 0))
          : calculateCreditsRemaining(
              user.creditsReceived || 0,
              user.creditsAllocated || 0,
              user.creditsUsed || 0
            ))
      : 0;

  // Chart data: real monthly aggregates from stats (last 6 calendar months).
  const chartData = stats?.monthlyChart || [];

  const { data: usersData } = useQuery({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });

  const inactivityStats = useMemo(() => {
    if (!usersData || !isAdmin) return null;
    const atRisk = usersData.filter(u =>
      u.role !== "ROOT_ADMIN" &&
      u.isActive &&
      u.safeReclaimable > 0 &&
      (u.isDormant || (u.inactivityWarningSentAt && u.inactivityKeepToken))
    );
    if (atRisk.length === 0) return null;
    return {
      count: atRisk.length,
      credits: atRisk.reduce((s, u) => s + u.safeReclaimable, 0),
    };
  }, [usersData, isAdmin]);

  return (
    <AppLayout>
      <motion.div 
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Dormant banner — persistent, non-dismissible */}
        <AnimatePresence>
          {user?.isDormant && (
            <motion.div
              key="dormant-banner"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex items-center justify-between gap-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  Your account is dormant due to inactivity. Use the reactivation link sent to your email to restore full campaign access.
                </p>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 shrink-0">
                Questions? Contact your admin.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sender health — warm-up progress and DNS verification status (non-admin only) */}
        {!isAdmin && (
          <motion.div variants={itemVariants}>
            <SenderHealthWidget />
          </motion.div>
        )}

        {/* Free Plan banner — compact persistent reminder for free plan users */}
        {creditsInfo?.isFreePlan && (
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm"
          >
            <span
              className="w-2 h-2 rounded-full bg-primary flex-shrink-0 animate-pulse motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span className="font-semibold text-primary">Free Plan</span>
            <span className="text-muted-foreground" aria-hidden="true">·</span>
            <span className="text-foreground">
              {formatNumber(creditsInfo.total ?? 0)} credits available
            </span>
            {creditsInfo.freeResetDate && (
              <>
                <span className="text-muted-foreground" aria-hidden="true">·</span>
                <span className="text-muted-foreground">
                  Credits refresh:{" "}
                  {new Date(creditsInfo.freeResetDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </>
            )}
            <div className="flex-1" />
            <Link
              href="/app/payments"
              className="text-xs font-semibold text-primary flex-shrink-0 rounded hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Upgrade →
            </Link>
          </motion.div>
        )}

        {/* Admin inactivity warning — derived from /api/users cache, no extra fetch */}
        {isAdmin && inactivityStats && (
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 px-5 py-4"
          >
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200 flex-1">
              {inactivityStats.count} team member{inactivityStats.count !== 1 ? "s" : ""} inactive with{" "}
              {formatNumber(inactivityStats.credits)} total credits at risk of automatic reclaim.
            </p>
            <Link href="/app/users" className="shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
              >
                Review Users
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </motion.div>
        )}

        {/* Header */}
        <motion.div variants={itemVariants}>
          <PageHeader
            title={
              <span className="flex flex-wrap items-center gap-3">
                Dashboard
                {user?.plan && (
                  <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${PLAN_BADGE_STYLES[user.plan] || PLAN_BADGE_STYLES.free}`}>
                    {PLAN_LABELS[user.plan] || "Free Plan"}
                  </span>
                )}
              </span>
            }
            description={statsLoading ? 'Loading your data...' : `Welcome back, ${user?.username}!`}
            actions={
              <>
                <select className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all hover:bg-muted">
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                  <option>This year</option>
                </select>
                <Link href="/app/campaigns/new">
                  <Button className="gap-2 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]" data-testid="button-new-campaign">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">New Campaign</span>
                    <span className="sm:hidden">New</span>
                  </Button>
                </Link>
              </>
            }
          />
        </motion.div>

        {/* Credit Balance Card */}
        <motion.div 
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-cyan-900 to-slate-800 p-4 sm:p-6 md:p-8 shadow-lg group"
          variants={itemVariants}
          whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-900/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-slate-200 text-sm mb-1">Available Credits</p>
                <motion.h2
                  className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {statsLoading ? (
                    <div className="h-12 w-48 bg-white/10 rounded animate-pulse"></div>
                  ) : (
                    formatNumber(creditsRemaining)
                  )}
                </motion.h2>
                <p className="text-xs text-white/40 mt-1">1 credit = 1 email sent</p>
              </div>
              <motion.div 
                className="px-4 py-2 bg-white/10 backdrop-blur rounded-lg hover:bg-white/20 transition-all cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Coins className="w-6 h-6 text-white" />
              </motion.div>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div>
                <p className="text-slate-200 text-sm mb-1">
                  {creditsInfo?.isFreePlan ? "Free Used" : "Used (Lifetime)"}
                </p>
                <p className="text-lg sm:text-xl font-medium text-white">
                  {statsLoading ? '...' : creditsInfo?.isFreePlan
                    ? `${formatNumber(user?.freeCreditsUsed || 0)} / ${formatNumber(creditsInfo?.monthlyFreeCredits || 500)}`
                    : formatNumber(user?.creditsUsed || 0)}
                </p>
              </div>
              <div className="hidden sm:block h-8 w-px bg-white/20"></div>
              <div>
                <p className="text-slate-200 text-sm mb-1">Total Credits</p>
                <p className="text-lg sm:text-xl font-medium text-white">
                  {statsLoading ? '...' : formatNumber(
                    creditsInfo?.total ??
                    (user?.plan === "free" && !user?.isTrialUser
                      ? Math.max(0, 500 - (user?.freeCreditsUsed || 0))
                      : (user?.creditsReceived ?? 0))
                  )}
                </p>
              </div>
              <div className="flex-1"></div>
              <Link href="/app/payments">
                <motion.button
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-cyan-900 rounded-lg hover:bg-white/90 transition-all font-medium shadow-lg hover:shadow-xl text-sm sm:text-base"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Purchase Credits
                </motion.button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" variants={itemVariants}>
          {[
            { icon: Mail,         label: 'Emails Sent',      value: stats?.totalEmailsSent ?? 0 },
            { icon: Activity,     label: 'Delivery Rate',    value: stats?.deliveryRate != null ? stats.deliveryRate.toFixed(1) + '%' : (stats && !statsLoading ? 'No data yet' : '—') },
            { icon: Users,        label: 'Active Contacts',  value: stats?.activeContacts ?? 0 },
            { icon: ArrowUpRight, label: 'Active Campaigns', value: stats?.activeCampaigns || 0 },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              className="bg-card rounded-xl border border-white/10 p-6 shadow-sm hover:shadow-lg hover:border-white/20 transition-all group cursor-pointer"
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className="flex items-start justify-between mb-4">
                <motion.div
                  className="p-3 bg-cyan-900/20 rounded-lg group-hover:bg-cyan-900/30 transition-colors"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <stat.icon className="w-5 h-5 text-cyan-300" />
                </motion.div>
              </div>
              <p className="text-muted-foreground text-sm font-medium mb-1">{stat.label}</p>
              <motion.h3
                className="text-3xl font-bold text-foreground"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
              >
                {statsLoading ? '...' : typeof stat.value === 'number' ? formatNumber(stat.value) : stat.value}
              </motion.h3>
            </motion.div>
          ))}
        </motion.div>

        {/* Credit & Campaigns Summary Row */}
        {user && (
          <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" variants={itemVariants}>
            {/* Credit Summary Card */}
            <motion.div 
              className="bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all"
              whileHover={{ y: -2 }}
            >
              <div className="px-6 py-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <Wallet className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Credit Summary</h3>
                      <p className="text-sm text-muted-foreground">Your credit balance breakdown</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30">
                    Live
                  </Badge>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: TrendingUp, label: 'Received', value: user.creditsReceived || 0, color: 'emerald', desc: 'Total granted credits' },
                    { icon: Users, label: 'Allocated', value: user.creditsAllocated || 0, color: 'blue', desc: 'Distributed to users' },
                    { icon: Send, label: 'Used', value: user.creditsUsed || 0, color: 'orange', desc: 'Consumed by campaigns' },
                    { icon: Zap, label: 'Available', value: creditsRemaining, color: 'emerald', desc: 'Ready to use', highlight: true },
                  ].map((item, idx) => (
                    <motion.div
                      key={item.label}
                      className={`p-4 rounded-lg ${item.highlight ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800' : 'bg-muted/50'}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + idx * 0.05 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <item.icon className={`w-4 h-4 ${item.color === 'emerald' ? 'text-emerald-500' : item.color === 'blue' ? 'text-blue-500' : 'text-orange-500'}`} />
                        <span className={`text-sm font-medium ${item.highlight ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>{item.label}</span>
                      </div>
                      <p className={`text-3xl font-bold ${item.highlight ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>
                        {statsLoading ? '...' : formatNumber(item.value)}
                      </p>
                      <p className={`text-sm mt-1 ${item.highlight ? 'text-emerald-600/80 dark:text-emerald-500/80' : 'text-muted-foreground/80'}`}>{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
                {creditsInfo?.isFreePlan && (
                  <div className="mt-4 p-4 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-cyan-600" />
                        <span className="text-sm font-medium text-cyan-700 dark:text-cyan-400">Free Credits This Month</span>
                      </div>
                      <span className="text-sm font-bold text-cyan-700 dark:text-cyan-400">
                        {formatNumber(creditsInfo.free ?? 0)} of {formatNumber(creditsInfo.monthlyFreeCredits || 500)} remaining
                      </span>
                    </div>
                    <div className="w-full bg-cyan-200 dark:bg-cyan-900 rounded-full h-2 mb-2">
                      <div
                        className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((creditsInfo.monthlyFreeCredits || 500) - (creditsInfo.free ?? 0)) / (creditsInfo.monthlyFreeCredits || 500) * 100)}%` }}
                      />
                    </div>
                    {creditsInfo.freeResetDate && (
                      <div className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-500">
                        <Calendar className="w-3 h-3" />
                        Resets {new Date(creditsInfo.freeResetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Campaigns Summary Card */}
            <motion.div 
              className="bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all"
              whileHover={{ y: -2 }}
            >
              <div className="px-6 py-4 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <Send className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Campaigns Summary</h3>
                      <p className="text-sm text-muted-foreground">Your email campaign metrics</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: BarChart3, label: 'Total Campaigns', value: stats?.totalCampaigns || 0, color: 'orange', desc: 'All time' },
                    { icon: Activity,  label: 'Active',           value: stats?.activeCampaigns || 0, color: 'green', desc: 'Currently running' },
                    { icon: Mail,      label: 'Emails Sent',      value: stats?.totalEmailsSent || 0, color: 'blue',   desc: 'Total sent' },
                    { icon: PieChart,  label: 'Avg. Open Rate',   value: stats?.avgOpenRate != null ? stats.avgOpenRate.toFixed(1) + '%' : '—', color: 'orange', desc: 'Engagement metric', highlight: true },
                  ].map((item, idx) => (
                    <motion.div 
                      key={item.label}
                      className={`p-4 rounded-lg ${item.highlight ? 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800' : 'bg-muted/50'}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + idx * 0.05 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <item.icon className={`w-4 h-4 ${item.color === 'orange' ? 'text-orange-500' : item.color === 'green' ? 'text-green-500' : 'text-blue-500'}`} />
                        <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                      </div>
                      <p className="text-3xl font-bold text-foreground">
                        {statsLoading ? '...' : typeof item.value === 'number' ? formatNumber(item.value) : item.value}
                      </p>
                      <p className="text-sm text-muted-foreground/80 mt-1">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Charts & Quick Actions */}
        <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-6" variants={itemVariants}>
          <motion.div 
            className="lg:col-span-2 bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-all"
            whileHover={{ y: -2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Campaign Performance</h3>
                <p className="text-sm text-muted-foreground">Emails sent and opened — last 6 months</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-1))' }}></div>
                  <span className="text-muted-foreground">Sent</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-2))' }}></div>
                  <span className="text-muted-foreground">Opened</span>
                </div>
              </div>
            </div>
            {!statsLoading && chartData.every(d => d.sent === 0) ? (
              <div className="h-56 sm:h-80 flex items-center justify-center">
                <div className="text-center">
                  <Send className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No campaign data yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Send your first campaign to see trends here</p>
                </div>
              </div>
            ) : (
              <motion.div
                className="h-56 sm:h-80"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Area type="monotone" dataKey="sent"   stroke="hsl(var(--chart-1))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSent)" />
                    <Area type="monotone" dataKey="opened" stroke="hsl(var(--chart-2))" strokeWidth={2}   fillOpacity={1} fill="url(#colorOpened)" />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            )}
          </motion.div>

          <motion.div 
            className="bg-card rounded-xl border border-border p-6 shadow-sm"
            whileHover={{ y: -2 }}
          >
            <h3 className="text-lg font-semibold text-foreground mb-6">Quick Actions</h3>
            <div className="space-y-3">
              {[
                { label: 'New Campaign', href: '/app/campaigns/new', primary: true },
                { label: 'Email Templates', href: '/app/templates' },
                { label: 'Campaign History', href: '/app/history' },
                { label: 'View Analytics', href: '/app/audit' },
              ].map((item) => (
                <Link key={item.label} href={item.href}>
                  <motion.button 
                    className={`w-full px-4 py-3 rounded-lg transition-all font-medium text-left flex items-center justify-between group ${
                      item.primary 
                        ? 'bg-cyan-900/40 text-white hover:bg-cyan-900/60 shadow-md hover:shadow-lg border border-cyan-900/50' 
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>{item.label}</span>
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </motion.button>
                </Link>
              ))}
            </div>
            
            <div className="mt-6 pt-6 border-t border-border">
              <h4 className="text-sm font-medium text-foreground mb-4">System Status</h4>
              <div className="space-y-3">
                {[
                  { label: 'API Status', status: 'Operational' },
                  { label: 'SMTP', status: 'Online' },
                ].map((item, idx) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <motion.span 
                      className="flex items-center gap-2 text-sm text-green-600"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 + idx * 0.1 }}
                    >
                      <motion.span 
                        className="w-2 h-2 bg-green-600 rounded-full"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: idx * 0.3 }}
                      />
                      {item.status}
                    </motion.span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Recent Campaigns */}
        <motion.div 
          className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-all"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Recent Campaigns</h3>
            <Link href="/app/history">
              <Button variant="ghost" size="sm" className="gap-1 hover:bg-cyan-900/20 transition-colors" data-testid="link-view-all">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          {campaignsLoading ? (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Campaign</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Sent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {[1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-5 w-20" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : recentCampaigns?.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[560px]">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Campaign</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Sent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {recentCampaigns.map((campaign, index) => (
                    <motion.tr 
                      key={campaign.id} 
                      className="hover:bg-muted/30 transition-colors group"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {(() => { const Ic = getStatusConfig(campaign.status).icon; return <Ic className={`h-4 w-4 ${STATUS_ICON_COLOR[campaign.status] ?? "text-gray-500"}`} />; })()}
                          <div className="text-sm font-medium text-foreground group-hover:text-cyan-300 transition-colors">{campaign.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground font-medium">{formatNumber(campaign.sentEmails || 0)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground font-medium">{formatNumber(campaign.totalEmails || 0)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant="secondary"
                          className={`text-xs shadow-sm ${getStatusConfig(campaign.status).color}`}
                          title={getStatusConfig(campaign.status).tooltip}
                        >
                          {getStatusConfig(campaign.status).label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(campaign.createdAt)}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              {!isAdmin && !user?.sendingIdentityType ? (
                <>
                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-900/10 to-slate-700/20" />
                    </div>
                    <Globe className="relative h-10 w-10 mx-auto text-amber-500/50" />
                  </div>
                  <p className="text-lg font-medium mb-1">Set up your sending domain</p>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                    RepMail sends from your domain — not ours. This protects your deliverability and ensures contacts see your brand.
                  </p>
                  <Link href="/app/onboarding">
                    <Button className="shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]">
                      <Globe className="mr-2 h-4 w-4" />
                      Add Your Domain →
                    </Button>
                  </Link>
                  <p className="text-xs text-muted-foreground mt-4">
                    or{" "}
                    <Link href="/app/campaigns/new" className="underline underline-offset-2">
                      start building a campaign
                    </Link>
                    {" "}to prepare while DNS propagates
                  </p>
                </>
              ) : (
                <>
                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-cyan-900/20 to-slate-700/20" />
                    </div>
                    <Send className="relative h-10 w-10 mx-auto text-muted-foreground/40" />
                  </div>
                  <p className="text-lg font-medium mb-1">No campaigns yet</p>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                    Start engaging with your audience by creating your first email campaign
                  </p>
                  <Link href="/app/campaigns/new">
                    <Button className="shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]" data-testid="button-create-first-campaign">
                      <Plus className="mr-2 h-4 w-4" />
                      Create your first campaign
                    </Button>
                  </Link>
                </>
              )}
            </div>
          )}
        </motion.div>

        {/* Delivery health panel — ROOT_ADMIN only */}
        {isRootAdmin && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
            <DeliveryHealthPanel />
          </motion.div>
        )}

        {/* AI Analytics — ROOT_ADMIN only */}
        {isRootAdmin && stats?.aiStats && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.25 }}>
            <Card className="border-card-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Usage — Last 30 Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Cost</p>
                    <p className="text-2xl font-semibold">${(stats.aiStats.totalAiCostUsd ?? 0).toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Calls</p>
                    <p className="text-2xl font-semibold">{formatNumber(stats.aiStats.totalAiCalls ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cache Hit Rate</p>
                    <p className="text-2xl font-semibold">{parseFloat(stats.aiStats.cacheHitRate ?? 0).toFixed(1)}%</p>
                  </div>
                </div>

                {Array.isArray(stats.aiStats.aiCostByEndpoint) && stats.aiStats.aiCostByEndpoint.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Cost by Endpoint</p>
                    <div className="space-y-2">
                      {stats.aiStats.aiCostByEndpoint.map((item) => (
                        <div key={item.endpoint} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{item.endpoint}</span>
                          <span className="font-medium">${Number(item.totalCost).toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stats.aiStats.topAiSpenders && stats.aiStats.topAiSpenders.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Top AI Spenders</p>
                    <div className="space-y-2">
                      {stats.aiStats.topAiSpenders.slice(0, 5).map((spender, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground truncate max-w-[200px]">{spender.email || spender.userId}</span>
                          <span className="font-medium">${Number(spender.totalCost).toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </AppLayout>
  );
}
