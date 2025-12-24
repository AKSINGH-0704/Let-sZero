import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { 
  ArrowRight, 
  Sparkles, 
  Shield, 
  Users, 
  BarChart3, 
  FileCheck, 
  Zap,
  Upload,
  Brain,
  AlertTriangle,
  Coins,
  Send,
  LineChart,
  ChevronDown,
  Mail,
  CheckCircle2
} from "lucide-react";

function HeroSection() {
  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="absolute top-0 left-0 right-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-white">EmailFlow Pro</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10" data-testid="link-login-header">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-white/70 mb-8">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Enterprise-grade email marketing platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
          Email Campaigns with
          <span className="block bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            AI Personalization
          </span>
          and Full Control
        </h1>

        <p className="text-lg sm:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
          Deliver personalized campaigns at scale with intelligent spam analysis, 
          hierarchical team management, credit-based controls, and complete audit compliance.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href="/login">
            <Button size="lg" className="bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white px-8 py-6 text-lg gap-2" data-testid="button-get-started">
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <Button 
            size="lg" 
            variant="outline" 
            className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg gap-2"
            onClick={scrollToFeatures}
            data-testid="button-view-features"
          >
            View Features
            <ChevronDown className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
          {[
            { label: "AI Personalization", icon: Brain },
            { label: "Credit Control", icon: Coins },
            { label: "Team Hierarchy", icon: Users },
            { label: "Audit Logging", icon: FileCheck }
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-2 text-white/50">
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown className="w-6 h-6 text-white/30" />
      </div>
    </section>
  );
}

function WorkflowSection() {
  const steps = [
    { icon: Upload, label: "Upload Contacts", description: "Import your contact lists" },
    { icon: Brain, label: "AI Personalization", description: "Smart content adaptation" },
    { icon: AlertTriangle, label: "Spam Analysis", description: "Pre-send quality check" },
    { icon: Coins, label: "Credit Validation", description: "Budget control gate" },
    { icon: Send, label: "Secure Delivery", description: "Reliable email dispatch" },
    { icon: LineChart, label: "Analytics & Logs", description: "Complete audit trail" }
  ];

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 to-transparent dark:opacity-100 opacity-0" />
      
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A streamlined workflow from contact upload to campaign analytics
          </p>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2" />
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {steps.map((step, index) => (
              <div key={step.label} className="relative group">
                <Card className="p-6 text-center hover-elevate border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300">
                  <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <step.icon className="w-7 h-7 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Step {index + 1}</div>
                  <h3 className="font-semibold mb-1 text-sm">{step.label}</h3>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </Card>
                
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-6 -translate-y-1/2 z-10">
                    <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Personalization",
      description: "Dynamic content adaptation for each recipient using intelligent placeholder replacement and tone analysis."
    },
    {
      icon: Coins,
      title: "Hierarchical Credit Control",
      description: "Allocate and track credits across your organization with complete visibility and atomic transaction logging."
    },
    {
      icon: Users,
      title: "Team-Based Access",
      description: "Three-tier role system (Root Admin, Sub-Admin, User) with granular permissions and parent-child relationships."
    },
    {
      icon: Shield,
      title: "Anti-Spam Intelligence",
      description: "Pre-send analysis identifies risky words and provides alternatives to improve deliverability scores."
    },
    {
      icon: BarChart3,
      title: "Live Campaign Tracking",
      description: "Real-time progress monitoring with sent, pending, and failed email counts per campaign."
    },
    {
      icon: FileCheck,
      title: "Audit-Grade Compliance",
      description: "Complete activity logging with 30+ event types, timestamps, and user attribution for enterprise compliance."
    }
  ];

  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Built for Enterprise</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Every feature designed for control, scale, and compliance
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="p-6 hover-elevate border-border/50 bg-card transition-all duration-300">
              <div className="w-12 h-12 mb-4 bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 rounded-lg flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardPreviewSection() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Powerful Dashboard</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need at a glance
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 border-border/50 bg-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
              </div>
              <h3 className="font-semibold">Campaign Overview</h3>
            </div>
            <div className="space-y-3">
              <div className="h-3 bg-muted rounded-full w-full" />
              <div className="h-3 bg-muted rounded-full w-4/5" />
              <div className="h-3 bg-muted rounded-full w-3/5" />
              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-indigo-500">24</div>
                  <div className="text-xs text-muted-foreground">Active</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-emerald-500">156</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-cyan-500">12K</div>
                  <div className="text-xs text-muted-foreground">Sent</div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border/50 bg-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <Coins className="w-5 h-5 text-cyan-500" />
              </div>
              <h3 className="font-semibold">Credit Balance</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Available</span>
                  <span className="font-medium">8,450</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm font-medium">Allocated</div>
                  <div className="text-lg font-bold">2,500</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm font-medium">Used</div>
                  <div className="text-lg font-bold">1,050</div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border/50 bg-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="font-semibold">Recent Activity</h3>
            </div>
            <div className="space-y-3">
              {[
                { action: "Campaign completed", time: "2 min ago" },
                { action: "Credits allocated", time: "15 min ago" },
                { action: "User created", time: "1 hour ago" },
                { action: "Template saved", time: "3 hours ago" }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm">{item.action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-6">
          Built for Teams & Growing Businesses
        </h2>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          Designed for control, scale, and compliance. From startups to enterprises.
        </p>

        <div className="grid sm:grid-cols-3 gap-8">
          {[
            { value: "99.9%", label: "Uptime SLA" },
            { value: "100K+", label: "Emails/Month" },
            { value: "30+", label: "Audit Events" }
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-4xl font-bold bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
          Start Using EmailFlow Pro
        </h2>
        <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto">
          Take control of your email campaigns with enterprise-grade features and AI-powered personalization.
        </p>
        <Link href="/login">
          <Button size="lg" className="bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white px-10 py-6 text-lg gap-2" data-testid="button-cta-start">
            Get Started Now
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-8 bg-slate-950 border-t border-white/10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <span className="text-white/80 font-medium">EmailFlow Pro</span>
        </div>
        <p className="text-white/40 text-sm">
          Enterprise email marketing platform
        </p>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <WorkflowSection />
      <FeaturesSection />
      <DashboardPreviewSection />
      <TrustSection />
      <CTASection />
      <Footer />
    </div>
  );
}
