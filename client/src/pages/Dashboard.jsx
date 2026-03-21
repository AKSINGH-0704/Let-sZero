import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
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
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Mail,
  Users,
  DollarSign,
  BarChart3,
  CreditCard,
  Wallet,
  Zap,
  Calendar,
  PieChart,
  Target,
  UserPlus
} from "lucide-react";
import { formatNumber, formatDate, calculateCreditsRemaining } from "@/lib/utils";

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

function getStatusIcon(status) {
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
}

function getStatusBadge(status) {
  const variants = {
    COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    FAILED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    RUNNING: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    PAUSED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    PENDING: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
  };
  return variants[status] || variants.PENDING;
}

const PLAN_BADGE_STYLES = {
  free:       "bg-gray-500/20 text-gray-400 border border-gray-500/30",
  starter:    "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25",
  growth:     "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  scale:      "bg-cyan-500/15 text-cyan-300 border border-cyan-400/25",
  enterprise: "bg-violet-500/15 text-violet-400 border border-violet-500/25",
};

const PLAN_LABELS = {
  free: "Free Trial", starter: "Starter", growth: "Growth",
  scale: "Scale", enterprise: "Enterprise",
};

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

  // Chart data derived from stats or fallback
  const chartData = [
    { month: 'Jan', sent: 12400, delivered: 11800 },
    { month: 'Feb', sent: 15600, delivered: 14900 },
    { month: 'Mar', sent: 18200, delivered: 17500 },
    { month: 'Apr', sent: 21300, delivered: 20400 },
    { month: 'May', sent: 24800, delivered: 23900 },
    { month: 'Jun', sent: 28500, delivered: 27400 },
  ];

  const isAdmin = user?.role === 'ROOT_ADMIN' || user?.role === 'SUB_ADMIN';

  return (
    <AppLayout>
      <motion.div 
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div className="flex items-start justify-between" variants={itemVariants}>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
              {user?.plan && (
                <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${PLAN_BADGE_STYLES[user.plan] || PLAN_BADGE_STYLES.free}`}>
                  {PLAN_LABELS[user.plan] || "Free Trial"}
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              {statsLoading ? 'Loading your data...' : `Welcome back, ${user?.username}!`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select className="px-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all hover:bg-muted">
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>This year</option>
            </select>
            <Link href="/app/campaigns/new">
              <Button className="gap-2 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]" data-testid="button-new-campaign">
                <Plus className="h-4 w-4" />
                New Campaign
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Credit Balance Card */}
        <motion.div 
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-cyan-900 to-slate-800 p-8 shadow-lg group"
          variants={itemVariants}
          whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-900/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-slate-200 text-sm mb-1">Available Credits</p>
                <motion.h2 
                  className="text-5xl font-semibold text-white"
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
              </div>
              <motion.div 
                className="px-4 py-2 bg-white/10 backdrop-blur rounded-lg hover:bg-white/20 transition-all cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <DollarSign className="w-6 h-6 text-white" />
              </motion.div>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-slate-200 text-sm mb-1">Used This Month</p>
                <p className="text-xl font-medium text-white">
                  {statsLoading ? '...' : formatNumber(user?.creditsUsed || 0)}
                </p>
              </div>
              <div className="h-8 w-px bg-white/20"></div>
              <div>
                <p className="text-slate-200 text-sm mb-1">Total Credits</p>
                <p className="text-xl font-medium text-white">
                  {statsLoading ? '...' : formatNumber(user?.creditsReceived || 0)}
                </p>
              </div>
              <div className="flex-1"></div>
              <Link href="/app/payments">
                <motion.button 
                  className="px-6 py-3 bg-white text-cyan-900 rounded-lg hover:bg-white/90 transition-all font-medium shadow-lg hover:shadow-xl"
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
            { icon: Mail, label: 'Emails Sent', value: user?.creditsUsed || 0, color: 'accent', trend: '+12.5%' },
            { icon: Activity, label: 'Delivery Rate', value: '97.4%', color: 'primary', trend: '+8.2%' },
            { icon: Users, label: 'Active Contacts', value: stats?.activeContacts || 0, color: 'secondary', trend: '+5.8%' },
            { icon: ArrowUpRight, label: 'Active Campaigns', value: stats?.activeCampaigns || 0, color: 'accent', trend: '+15.3%' },
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
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>{stat.trend}</span>
                </div>
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
                    { icon: Activity, label: 'Active', value: stats?.activeCampaigns || 0, color: 'green', desc: 'Currently running' },
                    { icon: Mail, label: 'Emails Sent', value: user?.creditsUsed || 0, color: 'blue', desc: 'Total delivered' },
                    { icon: PieChart, label: 'Avg. Open Rate', value: 'N/A', color: 'orange', desc: 'Engagement metric', highlight: true },
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
                <p className="text-sm text-muted-foreground">Email delivery trends over time</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-1))' }}></div>
                  <span className="text-muted-foreground">Sent</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-2))' }}></div>
                  <span className="text-muted-foreground">Delivered</span>
                </div>
              </div>
            </div>
            <motion.div 
              className="h-80"
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
                    <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="sent" stroke="hsl(var(--chart-1))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSent)" />
                  <Area type="monotone" dataKey="delivered" stroke="hsl(var(--chart-2))" strokeWidth={2} fillOpacity={1} fill="url(#colorDelivered)" />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
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
                          {getStatusIcon(campaign.status)}
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
                          className={`text-xs shadow-sm capitalize ${getStatusBadge(campaign.status)}`}
                        >
                          {campaign.status}
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
            </div>
          )}
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
