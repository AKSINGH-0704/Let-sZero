/**
 * EmailFlow Pro Landing Page - Design Only
 * 
 * Standalone, design-only landing page.
 * No auth state checks, no dashboard imports, no API calls.
 * Navigation handled via wouter Links.
 */

import { useState, useEffect } from 'react';
import { Link } from "wouter";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Zap, 
  Shield, 
  BarChart3, 
  Globe, 
  CheckCircle2, 
  TrendingUp, 
  Users,
  Upload,
  Sparkles,
  AlertTriangle,
  CreditCard,
  Send,
  LineChart,
  Play,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { Button } from "@/components/ui/button";

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 }
};

// ScrollIndicator Component
function ScrollIndicator({ 
  className,
  variant = 'mouse',
  text = 'Scroll to explore',
  showAfterMs = 1500,
  hideOnScroll = true,
  threshold = 100
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasScrolled) {
        setIsVisible(true);
      }
    }, showAfterMs);

    return () => clearTimeout(timer);
  }, [showAfterMs, hasScrolled]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      if (hideOnScroll && scrollY > threshold) {
        setHasScrolled(true);
        setIsVisible(false);
      }
      
      if (scrollY + windowHeight >= documentHeight - 100) {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hideOnScroll, threshold]);

  const scrollDown = () => {
    window.scrollBy({
      top: window.innerHeight * 0.8,
      behavior: 'smooth'
    });
  };

  if (variant === 'mouse') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 cursor-pointer ${className || ''}`}
            onClick={scrollDown}
          >
            <span className="text-xs font-medium text-slate-400 tracking-wider uppercase">
              {text}
            </span>
            <div className="relative w-6 h-10 rounded-full border-2 border-slate-500/30 flex justify-center">
              <motion.div
                className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-2"
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return null;
}

// Workflow steps data
const workflowSteps = [
  {
    icon: Upload,
    title: 'Upload Contacts',
    description: 'Import CSV or Excel with smart detection',
    color: 'cyan'
  },
  {
    icon: Sparkles,
    title: 'AI Personalization',
    description: 'Dynamic templates for each recipient',
    color: 'purple'
  },
  {
    icon: AlertTriangle,
    title: 'Spam Analysis',
    description: 'Real-time scoring for inbox placement',
    color: 'amber'
  },
  {
    icon: CreditCard,
    title: 'Credit Validation',
    description: 'Automatic balance check before send',
    color: 'emerald'
  },
  {
    icon: Send,
    title: 'Secure Delivery',
    description: 'Enterprise SMTP with DKIM/SPF',
    color: 'blue'
  },
  {
    icon: LineChart,
    title: 'Analytics & Logs',
    description: 'Real-time tracking and audit trails',
    color: 'indigo'
  }
];

const getColorClasses = (color) => {
  const colors = {
    cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', glow: 'shadow-cyan-500/20' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', glow: 'shadow-purple-500/20' },
    amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', glow: 'shadow-amber-500/20' },
    emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20' },
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'shadow-blue-500/20' },
    indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30', glow: 'shadow-indigo-500/20' }
  };
  return colors[color] || colors.cyan;
};

// Features data
const features = [
  {
    icon: TrendingUp,
    title: '99.9% Deliverability',
    description: 'Industry-leading inbox placement with dedicated IPs and DKIM/SPF authentication',
    gradient: 'from-cyan-500/10 to-cyan-500/5'
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Track opens, clicks, bounces, and conversions with millisecond precision',
    gradient: 'from-indigo-500/10 to-indigo-500/5'
  },
  {
    icon: Zap,
    title: 'AI Personalization',
    description: 'Dynamic content blocks that adapt to each recipient automatically',
    gradient: 'from-purple-500/10 to-purple-500/5'
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 Type II, GDPR compliant, with end-to-end encryption',
    gradient: 'from-emerald-500/10 to-emerald-500/5'
  },
  {
    icon: Globe,
    title: 'Global Infrastructure',
    description: 'Send from multiple regions with automatic failover and load balancing',
    gradient: 'from-blue-500/10 to-blue-500/5'
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Role-based access, approval workflows, and audit logs for compliance',
    gradient: 'from-pink-500/10 to-pink-500/5'
  }
];

// Stats data
const stats = [
  { value: '2B+', label: 'Emails Delivered' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '10K+', label: 'Active Businesses' },
  { value: '<50ms', label: 'API Response' }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
      
      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />

      {/* Navigation */}
      <motion.nav 
        className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-3"
          >
            <img
              src="/repmail-logo.png"
              alt="RepMail"
              className="h-10 w-auto rounded-lg"
              style={{ objectFit: "contain" }}
            />
            <div className="flex flex-col leading-none">
              <span style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                background: "linear-gradient(90deg, #00E5C8, #60A5FA)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontFamily: "'Inter', sans-serif",
                marginBottom: "3px"
              }}>
                by LetsZero
              </span>
              <span style={{
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#FFFFFF",
                fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                lineHeight: 1
              }}>
                RepMail
              </span>
            </div>
          </motion.div>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/pricing">
            <Button 
              variant="ghost" 
              className="text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            >
              Pricing
            </Button>
          </Link>
          <Link href="/contact">
            <Button 
              variant="ghost" 
              className="text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            >
              Contact
            </Button>
          </Link>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link href="/login">
              <Button 
                variant="outline" 
                className="border-slate-500 bg-slate-800/50 text-white hover:bg-slate-700 hover:border-slate-400 backdrop-blur-sm transition-all"
              >
                Sign In
              </Button>
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link href="/login">
              <Button 
                className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/25 transition-all"
              >
                Get Started
              </Button>
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link href="/early-access">
              <Button 
                variant="outline"
                className="border-violet-500/50 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:border-violet-400 backdrop-blur-sm transition-all"
              >
                Request Early Access
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 pt-16 pb-24">
        <motion.div 
          className="max-w-4xl mx-auto text-center space-y-8"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div 
            className="inline-flex items-center space-x-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-2 text-sm text-cyan-300 backdrop-blur-sm"
            variants={fadeInUp}
          >
            <Zap className="w-4 h-4" />
            <span>Enterprise-Grade Email Delivery Platform</span>
          </motion.div>
          
          <motion.h1 
            className="text-5xl sm:text-6xl md:text-7xl font-bold text-white leading-tight"
            variants={fadeInUp}
          >
            Scale Your Email
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Campaigns Confidently
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed"
            variants={fadeInUp}
          >
            Send millions of emails with 99.9% deliverability. Get advanced analytics, AI-powered personalization, and enterprise-grade security for serious businesses.
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            variants={fadeInUp}
          >
            <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
              <Link href="/login">
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-lg px-8 h-14 shadow-xl shadow-cyan-500/25 transition-all"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
              <Link href="/pricing">
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-slate-500 bg-slate-800/60 text-white hover:bg-slate-700 hover:border-slate-400 text-lg h-14 backdrop-blur-sm shadow-lg transition-all"
                >
                  View Pricing
                </Button>
              </Link>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400"
            variants={fadeInUp}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>500 trial free credits</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="relative z-10 container mx-auto px-6 pb-20">
        <motion.div 
          className="max-w-6xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={scaleIn}
          transition={{ duration: 0.6 }}
        >
          <div className="relative">
            {/* Glow effect behind dashboard */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-purple-500/20 rounded-2xl blur-2xl transform scale-105" />
            
            {/* Dashboard mockup */}
            <div className="relative bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              {/* Browser chrome */}
              <div className="flex items-center space-x-2 px-4 py-3 bg-slate-800/80 border-b border-white/10">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 bg-slate-700/50 rounded-md text-xs text-slate-400 font-mono">
                    app.repmail.com/dashboard
                  </div>
                </div>
              </div>
              
              {/* Dashboard content */}
              <div className="p-6">
                <div className="flex gap-6">
                  {/* Sidebar preview */}
                  <div className="w-48 space-y-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
                      <div className="w-4 h-4 bg-cyan-400/50 rounded" />
                      <span className="text-sm text-cyan-300">Dashboard</span>
                    </div>
                    {['Campaigns', 'Templates', 'Analytics', 'Contacts'].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 text-slate-500">
                        <div className="w-4 h-4 bg-slate-700 rounded" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Main content */}
                  <div className="flex-1 space-y-4">
                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { label: 'Available Credits', value: '7,500', trend: '+12%', color: 'text-cyan-400' },
                        { label: 'Emails Sent', value: '28,543', trend: '+8%', color: 'text-emerald-400' },
                        { label: 'Delivery Rate', value: '97.4%', trend: '+2%', color: 'text-blue-400' },
                        { label: 'Active Campaigns', value: '12', trend: '+3', color: 'text-purple-400' }
                      ].map((stat, i) => (
                        <motion.div 
                          key={i}
                          className="bg-slate-800/50 border border-white/5 rounded-xl p-4"
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                          <p className="text-xl font-bold text-white">{stat.value}</p>
                          <p className={`text-xs ${stat.color} mt-1`}>{stat.trend}</p>
                        </motion.div>
                      ))}
                    </div>
                    
                    {/* Chart placeholder */}
                    <div className="bg-slate-800/50 border border-white/5 rounded-xl p-4 h-40">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-slate-400">Campaign Performance</span>
                        <span className="text-xs text-slate-500">Last 30 days</span>
                      </div>
                      <div className="flex items-end justify-between h-20 gap-2">
                        {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                          <motion.div 
                            key={i}
                            className="flex-1 bg-gradient-to-t from-cyan-500/50 to-indigo-500/50 rounded-t"
                            initial={{ height: 0 }}
                            whileInView={{ height: `${h}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05, duration: 0.5 }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 container mx-auto px-6 py-20">
        <motion.div 
          className="max-w-6xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div className="text-center mb-16" variants={fadeInUp}>
            <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-2 text-sm text-indigo-300 mb-6">
              <Play className="w-4 h-4" />
              <span>How It Works</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              From Upload to Analytics
              <br />
              <span className="text-slate-400">in Minutes</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Our streamlined workflow ensures your campaigns are optimized, compliant, and delivered with precision.
            </p>
          </motion.div>
          
          {/* Workflow Steps */}
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            {workflowSteps.map((step, idx) => {
              const colors = getColorClasses(step.color);
              return (
                <motion.div
                  key={idx}
                  variants={fadeInUp}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="relative group"
                >
                  <div className={`bg-slate-900/80 backdrop-blur-xl border ${colors.border} rounded-2xl p-6 h-full transition-all hover:shadow-xl ${colors.glow}`}>
                    {/* Step number */}
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-slate-800 border border-white/10 rounded-full flex items-center justify-center text-xs font-bold text-slate-400">
                      {idx + 1}
                    </div>
                    
                    {/* Icon */}
                    <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <step.icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{step.description}</p>
                  </div>
                  
                  {/* Connector arrow */}
                  {idx < workflowSteps.length - 1 && (
                    <div className="hidden lg:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <ChevronRight className="w-6 h-6 text-slate-600" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 container mx-auto px-6 py-20">
        <motion.div 
          className="max-w-6xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div className="text-center mb-16" variants={fadeInUp}>
            <h2 className="text-4xl font-bold text-white mb-4">Built for Scale. Designed for Trust.</h2>
            <p className="text-xl text-slate-400">Everything you need to run professional email campaigns</p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <motion.div 
                key={idx}
                variants={fadeInUp}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`bg-gradient-to-br ${feature.gradient} backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all hover:shadow-xl hover:shadow-cyan-500/10 cursor-pointer`}
              >
                <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Trust Bar */}
      <section className="relative z-10 container mx-auto px-6 py-16">
        <motion.div 
          className="max-w-6xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={scaleIn}
        >
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-slate-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Testimonial */}
      <section className="relative z-10 container mx-auto px-6 py-16">
        <motion.div 
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-10 text-center">
            <div className="flex justify-center mb-6">
              {[...Array(5)].map((_, i) => (
                <motion.svg 
                  key={i} 
                  className="w-6 h-6 text-yellow-400 fill-current" 
                  viewBox="0 0 24 24"
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </motion.svg>
              ))}
            </div>
            <blockquote className="text-xl text-white mb-6 italic">
              "REPMAIL transformed our outreach. We went from 20% to 95% delivery rates overnight. The AI personalization is incredible."
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                SK
              </div>
              <div className="text-left">
                <div className="text-white font-medium">Sarah Kim</div>
                <div className="text-slate-400 text-sm">Head of Marketing, TechCorp</div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-6 py-20">
        <motion.div 
          className="max-w-4xl mx-auto text-center space-y-8 bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 backdrop-blur-xl border border-white/10 rounded-3xl p-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={scaleIn}
        >
          <h2 className="text-4xl font-bold text-white">Ready to transform your email marketing?</h2>
          <p className="text-xl text-slate-300">Join thousands of businesses sending millions of emails with confidence</p>
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
            <Link href="/login">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-lg px-10 h-14 shadow-xl shadow-cyan-500/25 transition-all"
              >
                Start Your Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
          <p className="text-sm text-slate-500">No credit card required • 500 trial free credits • Cancel anytime</p>
        </motion.div>
      </section>

      {/* Scroll Indicator */}
      <ScrollIndicator 
        variant="mouse" 
        text="Scroll to explore" 
        className="text-slate-400"
      />

      {/* Footer */}
      <footer className="relative z-10 container mx-auto px-6 py-12 border-t border-white/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-sm">
          <div className="flex items-center gap-2">
            <img
              src="/repmail-logo.png"
              alt="RepMail"
              className="h-10 w-auto rounded"
              style={{ objectFit: "contain" }}
            />
            <span>© 2026 RepMail by LetsZero. All rights reserved.</span>
          </div>
          <div className="flex items-center space-x-6">
            <a href="#privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="#terms" className="hover:text-white transition-colors">Terms</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
