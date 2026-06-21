/**
 * LANDING PAGE EXPERIENCE - COMPLETE MONOLITHIC COMPONENT
 *
 * Extracted from: src/app/App.tsx + all section components
 *
 * This file contains the ENTIRE landing page experience in a single component.
 * All sections, animations, gradients, and visual effects are preserved exactly as-is.
 *
 * NO SIMPLIFICATIONS - NO REFACTORING - PIXEL PERFECT PRESERVATION
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronDown,
  ArrowUpRight,
  Sparkles,
  Database,
  Zap,
  Shield,
  Mail,
  MessageSquare,
  Bell,
  Eye,
  Code2,
  Clock,
  Send,
  Target,
  Users,
  Menu,
  X
} from "lucide-react";

export default function LandingExperience() {
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: ""
  });
  const [formStatus, setFormStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus("success");
    setTimeout(() => {
      setFormData({ name: "", email: "", company: "", message: "" });
      setFormStatus("idle");
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // MissionPremium color helper (preserved exactly)
  const getColorClasses = (color: string) => {
    const colors: Record<string, any> = {
      cyan: {
        iconBg: "from-cyan-500/10 to-cyan-600/10",
        iconBorder: "border-cyan-500/20",
        iconText: "text-cyan-400",
        glow: "shadow-cyan-500/10"
      },
      violet: {
        iconBg: "from-violet-500/10 to-violet-600/10",
        iconBorder: "border-violet-500/20",
        iconText: "text-violet-400",
        glow: "shadow-violet-500/10"
      },
      amber: {
        iconBg: "from-amber-500/10 to-amber-600/10",
        iconBorder: "border-amber-500/20",
        iconText: "text-amber-400",
        glow: "shadow-amber-500/10"
      },
      emerald: {
        iconBg: "from-emerald-500/10 to-emerald-600/10",
        iconBorder: "border-emerald-500/20",
        iconText: "text-emerald-400",
        glow: "shadow-emerald-500/10"
      }
    };
    return colors[color];
  };

  // MissionPremium pillars data (preserved exactly)
  const pillars = [
    {
      icon: Shield,
      title: "Reliability",
      description: "Infrastructure designed for uptime, consistency, and predictable performance at any scale.",
      color: "cyan",
      delay: 0.2,
      position: { top: "0%", left: "15%" }
    },
    {
      icon: Zap,
      title: "Scalability",
      description: "Built to grow with you. From startup to enterprise without architectural compromise.",
      color: "violet",
      delay: 0.4,
      position: { top: "0%", right: "15%" }
    },
    {
      icon: Eye,
      title: "Transparency",
      description: "No black boxes. Full visibility into metrics, operations, and system health.",
      color: "amber",
      delay: 0.6,
      position: { bottom: "0%", left: "15%" }
    },
    {
      icon: Code2,
      title: "Thoughtful Engineering",
      description: "Every decision is deliberate. Long-term thinking, not short-term hacks.",
      color: "emerald",
      delay: 0.8,
      position: { bottom: "0%", right: "15%" }
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#0A0A0F] overflow-x-hidden">
      {/* ============================================
          NAVIGATION SECTION (EXACT COPY)
          ============================================ */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-[#0A0A0F]/90 border-b border-white/5">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 h-16 md:h-20 flex items-center justify-between">
          {/* Logo + Brand */}
          <div className="flex items-center gap-2 md:gap-3">
            <img
              src="/letszero-logo.png"
              alt="LetsZero"
              style={{ height: "36px", width: "auto", objectFit: "contain", borderRadius: "8px", background: "#111118", boxShadow: "0 0 0 1px rgba(255,255,255,0.08)" }}
              className="md:h-[48px] lg:h-[64px]"
            />
            <div className="flex flex-col leading-none">
              <span className="hidden sm:block" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#FFFFFF", fontFamily: "'Inter', sans-serif", marginBottom: "4px" }}>
                Zero Noise
              </span>
              <span style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.01em" }}>
                LetsZero
              </span>
            </div>
          </div>

          {/* Desktop Navigation Menu */}
          <div className="hidden md:flex items-center gap-10">
            <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>
              Home
            </a>
            <div className="relative">
              <button
                onClick={() => setIsProductsOpen(!isProductsOpen)}
                onBlur={() => setTimeout(() => setIsProductsOpen(false), 150)}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Products
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isProductsOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {isProductsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 w-64 p-2 rounded-xl bg-[#0A0A0F]/95 border border-white/10 backdrop-blur-xl shadow-2xl z-50"
                  >
                    <button
                      onClick={() => window.location.href = '/products/repmail'}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors">RepMail</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-400 rounded-full">LIVE</span>
                        </div>
                        <span className="text-xs text-gray-500">Enterprise Email Infrastructure</span>
                      </div>
                    </button>
                    <div className="w-full flex items-center gap-3 p-3 rounded-lg opacity-60 cursor-not-allowed">
                      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-400">MessageHub</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-white/5 text-gray-500 rounded-full flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            Q2 2026
                          </span>
                        </div>
                        <span className="text-xs text-gray-600">Unified Messaging Platform</span>
                      </div>
                    </div>
                    <div className="w-full flex items-center gap-3 p-3 rounded-lg opacity-60 cursor-not-allowed">
                      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-400">NotifyStream</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-white/5 text-gray-500 rounded-full flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            Q3 2026
                          </span>
                        </div>
                        <span className="text-xs text-gray-600">Multi-channel Notifications</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <a href="#mission" className="text-sm text-gray-400 hover:text-white transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>
              Mission
            </a>
            <a href="#contact" className="text-sm text-gray-400 hover:text-white transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>
              Contact
            </a>
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => window.location.href = '/products/repmail'}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg transition-all"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Explore RepMail
            </button>
            <button
              onClick={() => window.location.href = '/early-access'}
              className="px-5 py-2.5 text-sm bg-white text-black rounded-xl transition-all hover:shadow-lg hover:shadow-white/20 font-medium"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Request Early Access
            </button>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu Slide-Down */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden overflow-hidden border-t border-white/5 bg-[#0A0A0F]/98 backdrop-blur-xl"
            >
              <div className="px-4 py-4 space-y-1">
                <a href="#" onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
                  style={{ fontFamily: "'Inter', sans-serif" }}>
                  Home
                </a>
                <button onClick={() => { window.location.href = '/products/repmail'; setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium text-left"
                  style={{ fontFamily: "'Inter', sans-serif" }}>
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  RepMail
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-400 rounded-full">LIVE</span>
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); setTimeout(() => document.getElementById('mission')?.scrollIntoView({ behavior: 'smooth' }), 300); }}
                  className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium w-full text-left"
                  style={{ fontFamily: "'Inter', sans-serif" }}>
                  Mission
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); setTimeout(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }), 300); }}
                  className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium w-full text-left"
                  style={{ fontFamily: "'Inter', sans-serif" }}>
                  Contact
                </button>
                <div className="pt-3 pb-1 space-y-2 border-t border-white/5 mt-2">
                  <button
                    onClick={() => { window.location.href = '/products/repmail'; setMobileMenuOpen(false); }}
                    className="w-full px-4 py-3 text-sm text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-all text-left font-medium"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    Explore RepMail
                  </button>
                  <button
                    onClick={() => { window.location.href = '/early-access'; setMobileMenuOpen(false); }}
                    className="w-full px-4 py-3 text-sm bg-white text-black rounded-xl font-semibold transition-all hover:bg-gray-100"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    Request Early Access
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ============================================
          HERO PREMIUM SECTION (EXACT COPY)
          ============================================ */}
      <section className="relative w-full min-h-screen bg-[#0A0A0F] overflow-hidden pt-16 md:pt-20">
        {/* Sophisticated gradient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0F] via-[#12121A] to-[#0A0A0F]" />
          <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-amber-600/5 rounded-full blur-[120px]" />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />

        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-10 md:py-20">
          {/* Asymmetric Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column - Primary Content (spans 7 columns) */}
            <div className="col-span-1 lg:col-span-7 pt-6 md:pt-12">
              {/* Status badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 mb-8"
              >
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-sm text-gray-400" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Platform · Building in Public
                  </span>
                </div>
              </motion.div>

              {/* Main headline - Premium typography */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="mb-8"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span className="block text-[clamp(36px,8vw,72px)] leading-[0.95] font-semibold text-white mb-2">
                  Communication
                </span>
                <span className="block text-[clamp(36px,8vw,72px)] leading-[0.95] font-semibold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                  infrastructure
                </span>
                <span className="block text-[clamp(36px,8vw,72px)] leading-[0.95] font-semibold text-white">
                  without compromise
                </span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-sm sm:text-base lg:text-lg text-gray-400 mb-8 md:mb-12 max-w-xl leading-relaxed"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                We build composable communication products for teams that need systems,
                not features. Starting with RepMail, every tool is designed for reliability
                at scale. Transparent, modular, built to last.
              </motion.p>

              {/* CTA Group */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-10 md:mb-20"
              >
                <button
                  onClick={() => window.location.href = '/products/repmail'}
                  className="group relative px-6 py-3.5 bg-white text-black rounded-xl font-medium overflow-hidden transition-all hover:shadow-xl hover:shadow-white/20 text-center"
                  style={{ fontFamily: "'Inter', sans-serif" }}>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Explore RepMail
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </span>
                </button>
                <button
                  onClick={() => { document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="px-6 py-3.5 text-gray-300 hover:text-white rounded-xl font-medium border border-white/10 hover:border-white/20 transition-all backdrop-blur-sm text-center cursor-pointer"
                  style={{ fontFamily: "'Inter', sans-serif" }}>
                  View All Products
                </button>
              </motion.div>

              {/* Live Product Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="inline-flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
                  <span className="text-sm text-gray-500" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Now Live
                  </span>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <span className="text-sm font-medium text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  RepMail
                </span>
                <span className="text-sm text-gray-500" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Enterprise Email Infrastructure
                </span>
              </motion.div>
            </div>

            {/* Right Column - Visual Elements (spans 5 columns) */}
            <div className="hidden lg:block lg:col-span-5 relative h-[700px]">
              {/* Floating UI Fragment 1 - Email Stats */}
              <motion.div
                initial={{ opacity: 0, x: 40, y: 20 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="absolute top-20 right-0 w-72 p-5 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-xl shadow-2xl z-20"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    DELIVERY METRICS
                  </span>
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-end justify-between">
                    <span className="text-xs text-gray-500">Throughput</span>
                    <span className="text-lg font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      847K/hr
                    </span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-400"
                      initial={{ width: 0 }}
                      animate={{ width: "87%" }}
                      transition={{ duration: 1.2, delay: 0.5 }}
                    />
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-xs text-gray-500">Success Rate</span>
                    <span className="text-lg font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      99.94%
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Floating UI Fragment 2 - API Status */}
              <motion.div
                initial={{ opacity: 0, x: 40, y: -20 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="absolute top-[340px] right-12 w-64 p-5 rounded-2xl bg-gradient-to-br from-violet-900/20 to-violet-950/20 border border-violet-500/20 backdrop-blur-xl shadow-2xl z-30"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-violet-300" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    API HEALTH
                  </span>
                  <Shield className="w-4 h-4 text-violet-400" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Latency (p95)</span>
                    <span className="text-sm font-medium text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      42ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Uptime</span>
                    <span className="text-sm font-medium text-emerald-400" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      100%
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-xs text-gray-500">All systems operational</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Floating UI Fragment 3 - Product Card */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="absolute bottom-20 right-4 w-56 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl z-10"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      RepMail
                    </div>
                    <div className="text-xs text-gray-500">v2.4.1</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 leading-relaxed">
                  Scalable email delivery with real-time analytics
                </div>
              </motion.div>

              {/* Background geometric element */}
              <motion.div
                animate={{
                  rotate: [0, 5, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute top-0 left-0 w-96 h-96 border border-white/5 rounded-3xl transform -rotate-12"
              />
            </div>
          </div>

          {/* Bottom Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-10 sm:mt-20 lg:mt-32 pt-6 sm:pt-12 border-t border-white/5"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
              <div>
                <div className="text-xs text-gray-600 mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                  TRUSTED BY
                </div>
                <div className="text-2xl font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  200+ Teams
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                  MESSAGES DELIVERED
                </div>
                <div className="text-2xl font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  1.2B+
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                  AVERAGE UPTIME
                </div>
                <div className="text-2xl font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  99.98%
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                  PRODUCTS
                </div>
                <div className="text-2xl font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  1 Live · 2 Soon
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================
          PRODUCT SUITE PREMIUM SECTION (EXACT COPY)
          ============================================ */}
      <section id="products" className="relative w-full bg-[#0A0A0F] py-20 overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
              <span className="text-sm text-cyan-400 tracking-wide" style={{ fontFamily: "'Inter', sans-serif" }}>
                PRODUCT ECOSYSTEM
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Built for teams that scale
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl" style={{ fontFamily: "'Inter', sans-serif" }}>
              A suite of composable communication tools designed for reliability,
              transparency, and long-term infrastructure thinking.
            </p>
          </motion.div>

          {/* Flowing Product Layout */}
          <div className="relative">
            {/* Connecting Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
              <motion.path
                d="M 350 200 Q 550 200, 650 150"
                stroke="url(#gradient1)"
                strokeWidth="1"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 0.3 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, delay: 0.5 }}
              />
              <motion.path
                d="M 700 350 Q 850 300, 950 280"
                stroke="url(#gradient2)"
                strokeWidth="1"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 0.2 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, delay: 0.7 }}
              />
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(6, 182, 212, 0)" />
                  <stop offset="50%" stopColor="rgba(6, 182, 212, 0.5)" />
                  <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
                </linearGradient>
                <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(139, 92, 246, 0)" />
                  <stop offset="50%" stopColor="rgba(139, 92, 246, 0.5)" />
                  <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
                </linearGradient>
              </defs>
            </svg>

            {/* Product Nodes - Asymmetric Layout */}
            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* RepMail - LIVE (Dominant, spans more columns) */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="col-span-1 lg:col-span-6 relative z-10"
              >
                <motion.div
                  whileHover={{ y: -12, transition: { duration: 0.4 } }}
                  className="group relative"
                >
                  {/* Glow effect */}
                  <motion.div
                    className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-violet-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    animate={{
                      opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />

                  {/* Card */}
                  <div className="relative p-8 rounded-3xl bg-gradient-to-br from-cyan-950/40 via-blue-950/30 to-violet-950/40 border border-cyan-500/20 backdrop-blur-xl overflow-hidden">
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                        <motion.div
                          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                          animate={{
                            scale: [1, 1.3, 1],
                            opacity: [1, 0.7, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                        <span className="text-xs font-medium text-emerald-400" style={{ fontFamily: "'Inter', sans-serif" }}>
                          LIVE
                        </span>
                      </div>
                      <motion.div
                        animate={{ rotate: [0, 5, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <Sparkles className="w-5 h-5 text-cyan-400" />
                      </motion.div>
                    </div>

                    {/* Icon */}
                    <motion.div
                      className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center"
                      whileHover={{ rotate: [0, -5, 5, 0], transition: { duration: 0.5 } }}
                    >
                      <Mail className="w-8 h-8 text-cyan-400" />
                    </motion.div>

                    {/* Content */}
                    <h3 className="text-3xl font-semibold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      RepMail
                    </h3>
                    <p className="text-base text-gray-400 mb-6 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Enterprise-grade email infrastructure designed for reliability,
                      observability, and scale. Real-time analytics, automated deliverability
                      optimization, and transparent reporting built in.
                    </p>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 pb-6 border-b border-white/5">
                      <div>
                        <div className="text-lg sm:text-2xl font-semibold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          99.98%
                        </div>
                        <div className="text-xs text-gray-600">Uptime</div>
                      </div>
                      <div>
                        <div className="text-lg sm:text-2xl font-semibold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          &lt;50ms
                        </div>
                        <div className="text-xs text-gray-600">Latency</div>
                      </div>
                      <div>
                        <div className="text-lg sm:text-2xl font-semibold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          1.2B+
                        </div>
                        <div className="text-xs text-gray-600">Delivered</div>
                      </div>
                    </div>

                    {/* CTA */}
                    <button
                      onClick={() => window.location.href = '/products/repmail'}
                      className="group/btn w-full px-5 py-3.5 bg-white text-black rounded-xl font-medium flex items-center justify-center gap-2 hover:shadow-2xl hover:shadow-white/20 transition-all"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      Explore RepMail
                      <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              </motion.div>

              {/* MessageHub - Coming Soon (Top Right) */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="col-span-1 lg:col-span-5 lg:col-start-8 relative z-10"
              >
                <motion.div
                  whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.4 } }}
                  className="group relative h-full"
                >
                  {/* Card */}
                  <div className="relative p-6 h-full rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm overflow-hidden">
                    {/* Future glow hint */}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Status */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-gray-500 tracking-wider" style={{ fontFamily: "'Inter', sans-serif" }}>
                        Q2 2026
                      </span>
                      <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                        <span className="text-xs text-gray-500">Coming Soon</span>
                      </div>
                    </div>

                    {/* Icon */}
                    <div className="w-12 h-12 mb-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-gray-600" />
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-semibold text-gray-300 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      MessageHub
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Unified messaging platform with advanced routing,
                      workflow automation, and team collaboration built for scale.
                    </p>
                  </div>
                </motion.div>
              </motion.div>

              {/* NotifyStream - Coming Soon (Bottom Right) */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.6 }}
                className="col-span-1 lg:col-span-5 lg:col-start-8 relative z-10"
              >
                <motion.div
                  whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.4 } }}
                  className="group relative h-full"
                >
                  {/* Card */}
                  <div className="relative p-6 h-full rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm overflow-hidden">
                    {/* Future glow hint */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Status */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-gray-500 tracking-wider" style={{ fontFamily: "'Inter', sans-serif" }}>
                        Q3 2026
                      </span>
                      <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                        <span className="text-xs text-gray-500">Coming Soon</span>
                      </div>
                    </div>

                    {/* Icon */}
                    <div className="w-12 h-12 mb-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Bell className="w-6 h-6 text-gray-600" />
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-semibold text-gray-300 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      NotifyStream
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Multi-channel notification engine designed for compliance,
                      intelligent delivery, and observability at enterprise scale.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          MISSION PREMIUM SECTION (EXACT COPY)
          ============================================ */}
      <section id="mission" className="relative w-full bg-[#0A0A0F] py-32 overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-[120px]" />
        </div>

        {/* Radial grid */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute border border-white/5 rounded-full"
                style={{
                  width: `${200 + i * 120}px`,
                  height: `${200 + i * 120}px`,
                  top: `calc(50% - ${(200 + i * 120) / 2}px)`,
                  left: `calc(50% - ${(200 + i * 120) / 2}px)`,
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 0.3, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: i * 0.1 }}
              />
            ))}
          </div>
        </div>

        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
          {/* Central Mission Statement */}
          <div className="relative max-w-4xl mx-auto text-center mb-12 sm:mb-20 lg:mb-32">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-6"
            >
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="w-12 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
                <span className="text-sm text-violet-400 tracking-wide" style={{ fontFamily: "'Inter', sans-serif" }}>
                  OUR PRINCIPLES
                </span>
                <div className="w-12 h-px bg-gradient-to-r from-violet-500/50 via-transparent to-transparent" />
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-white mb-6 md:mb-8 leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Building infrastructure
              <br />
              <span className="bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent">
                that lasts
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-base sm:text-lg lg:text-xl text-gray-400 leading-relaxed max-w-3xl mx-auto"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              We're building a suite of communication products on principles that matter:
              reliability over hype, transparency over obscurity, and long-term infrastructure
              thinking over short-term feature chasing. Every product is designed to scale with
              your organization and remain dependable for years.
            </motion.p>
          </div>

          {/* Constellation Layout - Value Pillars (desktop only) */}
          <div className="relative h-[600px] hidden lg:block">
            {/* Connecting Lines SVG */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
              {/* Diagonal cross connections */}
              <motion.line
                x1="20%" y1="25%" x2="80%" y2="75%"
                stroke="url(#line-gradient-1)"
                strokeWidth="1"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 0.2 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, delay: 0.5 }}
              />
              <motion.line
                x1="80%" y1="25%" x2="20%" y2="75%"
                stroke="url(#line-gradient-2)"
                strokeWidth="1"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 0.2 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, delay: 0.7 }}
              />
              {/* Horizontal connection */}
              <motion.line
                x1="20%" y1="25%" x2="80%" y2="25%"
                stroke="url(#line-gradient-3)"
                strokeWidth="1"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 0.15 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, delay: 0.9 }}
              />
              <defs>
                <linearGradient id="line-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(6, 182, 212, 0.5)" />
                  <stop offset="100%" stopColor="rgba(245, 158, 11, 0.5)" />
                </linearGradient>
                <linearGradient id="line-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(139, 92, 246, 0.5)" />
                  <stop offset="100%" stopColor="rgba(16, 185, 129, 0.5)" />
                </linearGradient>
                <linearGradient id="line-gradient-3" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(6, 182, 212, 0)" />
                  <stop offset="50%" stopColor="rgba(139, 92, 246, 0.5)" />
                  <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center Pulse */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/50"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0.2, 0.5],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ zIndex: 2 }}
            />

            {/* Pillar Nodes */}
            {pillars.map((pillar, index) => {
              const Icon = pillar.icon;
              const colorClasses = getColorClasses(pillar.color);

              return (
                <motion.div
                  key={pillar.title}
                  className="absolute"
                  style={{
                    ...pillar.position,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10
                  }}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: pillar.delay }}
                >
                  <motion.div
                    whileHover={{ y: -8, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    className="group"
                  >
                    <div className="relative w-80 p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-xl">
                      {/* Hover glow */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses.iconBg} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                      <div className="relative">
                        {/* Icon */}
                        <motion.div
                          className={`w-14 h-14 mb-4 rounded-xl bg-gradient-to-br ${colorClasses.iconBg} border ${colorClasses.iconBorder} flex items-center justify-center ${colorClasses.glow}`}
                          animate={{
                            y: [0, -4, 0],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: index * 0.2
                          }}
                        >
                          <Icon className={`w-7 h-7 ${colorClasses.iconText}`} />
                        </motion.div>

                        {/* Content */}
                        <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          {pillar.title}
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {pillar.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          {/* Mobile/Tablet Pillar Grid (shown below lg, hidden on desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden mb-8">
            {pillars.map((pillar, index) => {
              const Icon = pillar.icon;
              const colorClasses = getColorClasses(pillar.color);
              return (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="relative p-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-xl"
                >
                  <div className={`w-12 h-12 mb-4 rounded-xl bg-gradient-to-br ${colorClasses.iconBg} border ${colorClasses.iconBorder} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${colorClasses.iconText}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {pillar.description}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom Commitment Statement */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 1 }}
            className="mt-8 lg:mt-32 text-center"
          >
            <div className="inline-block px-8 py-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
              <p className="text-lg text-gray-400 max-w-2xl" style={{ fontFamily: "'Inter', sans-serif" }}>
                "The best infrastructure is the kind you never think about
                <br />
                <span className="text-white font-medium">because it simply works.</span>"
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================
          CONTACT SECTION (RESTORED)
          ============================================ */}
      <section id="contact" className="relative w-full bg-[#0A0A0F] py-32 overflow-hidden">
        {/* Sophisticated gradient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0F] via-[#12121A] to-[#0A0A0F]" />
          <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-[120px]" />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />

        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
          {/* Section Header */}
          <div className="max-w-5xl mx-auto mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="inline-flex items-center gap-3 mb-6"
              >
                <div className="w-12 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
                <span className="text-sm text-violet-400 tracking-wide" style={{ fontFamily: "'Inter', sans-serif" }}>
                  GET IN TOUCH
                </span>
                <div className="w-12 h-px bg-gradient-to-r from-violet-500/50 via-transparent to-transparent" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white mb-4 leading-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Let's talk about
                <br />
                <span className="bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent">
                  reducing work
                </span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="text-base text-gray-500 leading-relaxed max-w-2xl mx-auto"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Every conversation starts with clarity. Tell us what's slowing you down, and we'll help you remove it.
              </motion.p>
            </motion.div>
          </div>

          {/* Primary Contact Zone - Split Layout */}
          <div className="max-w-7xl mx-auto mb-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              {/* Left Column - Context & Trust */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="lg:col-span-5 space-y-8"
              >
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    What happens after you reach out
                  </h3>

                  <div className="space-y-6">
                    {[
                      { icon: MessageSquare, title: "No sales pressure", description: "Honest conversations about whether we're a fit." },
                      { icon: Target, title: "Real product discussion", description: "We'll talk about your workflow, not our features." },
                      { icon: Shield, title: "Clear next steps", description: "No mystery. No runaround. Just clarity." }
                    ].map((item, index) => (
                      <motion.div
                        key={item.title}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                        className="flex items-start gap-4 group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-600/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0 group-hover:border-violet-500/40 transition-colors">
                          <item.icon className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                          <h4 className="text-base font-medium text-white mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                            {item.title}
                          </h4>
                          <p className="text-sm text-gray-500 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                            {item.description}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  className="p-5 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-medium text-gray-400" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Response time
                    </span>
                  </div>
                  <p className="text-base text-white font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    We usually respond within 24 hours
                  </p>
                  <p className="text-xs text-gray-600 mt-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Built in public. Conversations stay private.
                  </p>
                </motion.div>
              </motion.div>

              {/* Right Column - Refined Form */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="lg:col-span-7"
              >
                <div className="relative p-5 sm:p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-xl shadow-2xl">
                  <div className="absolute -inset-[1px] bg-gradient-to-br from-violet-600/10 to-cyan-600/10 rounded-2xl blur-2xl opacity-50" />
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-cyan-600/5 rounded-2xl" />

                  <div className="relative">
                    <div className="mb-8">
                      <h3 className="text-2xl font-semibold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Start the conversation
                      </h3>
                      <p className="text-sm text-gray-500" style={{ fontFamily: "'Inter', sans-serif" }}>
                        We'll get back to you as soon as possible
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>
                          Name *
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:bg-white/[0.07] transition-all"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                          placeholder="Your name"
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>
                          Email *
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:bg-white/[0.07] transition-all"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                          placeholder="your@email.com"
                        />
                      </div>

                      <div>
                        <label htmlFor="company" className="block text-sm font-medium text-gray-400 mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>
                          Company <span className="text-gray-600">(optional)</span>
                        </label>
                        <input
                          type="text"
                          id="company"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:bg-white/[0.07] transition-all"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                          placeholder="Your company"
                        />
                      </div>

                      <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-400 mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>
                          Message *
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          required
                          value={formData.message}
                          onChange={handleChange}
                          rows={6}
                          className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:bg-white/[0.07] transition-all resize-none"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                          placeholder="Tell us how we can help reduce your workload..."
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-6">
                        <motion.button
                          type="submit"
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className="group relative w-full sm:w-auto px-10 py-4 bg-white text-black rounded-xl font-semibold overflow-hidden transition-all hover:shadow-2xl hover:shadow-white/30"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          <span className="relative z-10 flex items-center gap-2">
                            Send message
                            <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                          </span>
                          <div className="absolute inset-0 bg-gradient-to-r from-white via-gray-100 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.button>

                        {formStatus === "success" && (
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2 text-emerald-400"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                          >
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
                            <span className="text-sm font-medium">Message sent successfully!</span>
                          </motion.div>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Async Contact Section */}
          <div className="max-w-3xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.6 }}
              className="text-center"
            >
              <p className="text-base text-gray-500 mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
                Prefer async communication? We do too.
              </p>

              <div className="inline-block w-full max-w-sm p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-xl">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-600/10 border border-violet-500/20 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-violet-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-gray-500 mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Direct email
                    </p>
                    <a
                      href="mailto:support@letszero.in"
                      className="text-white hover:text-violet-400 transition-colors font-semibold text-lg group inline-flex items-center gap-2 relative"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      support@letszero.in
                      <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      <span className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-violet-500 to-cyan-500 group-hover:w-full transition-all duration-300" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Trust Signal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
              <p className="text-sm text-gray-500 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                We're building LetsZero to help teams work less, not more.
                <br />
                <span className="text-white font-medium">Every conversation helps us build better tools.</span>
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-white/[0.05] py-10" style={{ background: "#0A0A0F" }}>
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <img src="/letszero-logo.png" alt="LetsZero" style={{ height: "44px", width: "auto", objectFit: "contain", borderRadius: "8px", background: "#111118", boxShadow: "0 0 0 1px rgba(255,255,255,0.07)" }} />
          </div>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="text-xs text-gray-600 hover:text-gray-400 transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>Privacy</a>
            <a href="/terms" className="text-xs text-gray-600 hover:text-gray-400 transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>Terms</a>
            <a href="/contact" className="text-xs text-gray-600 hover:text-gray-400 transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>Contact</a>
          </div>
          <p className="text-xs text-gray-600" style={{ fontFamily: "'Inter', sans-serif" }}>
            &copy; {new Date().getFullYear()} LetsZero. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
