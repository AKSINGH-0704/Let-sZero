import { useState, useEffect } from "react";
import { Redirect, Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Brain,
  Coins,
  Users,
  FileCheck,
  Shield,
  ArrowLeft,
  Send,
  BarChart3,
  Zap,
  UserPlus,
  ArrowRight,
  LogIn
} from "lucide-react";
import { SiGoogle, SiLinkedin } from "react-icons/si";

function BrandingPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 animate-in fade-in slide-in-from-left-4 duration-700">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
        <div className="flex items-center gap-3 mb-14">
          <img src="/repmail-logo-white.png" alt="RepMail" className="h-16 w-auto" style={{ objectFit: "contain" }} />
        </div>

        <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-5">
          Enterprise Email
          <span className="block bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Campaign Control
          </span>
        </h2>

        <p className="text-white/60 text-lg mb-14 leading-relaxed max-w-lg">
          AI-powered personalization, credit governance, and audit-grade compliance for modern marketing teams.
        </p>

        <div className="space-y-5">
          {[
            { icon: Brain, label: "AI Personalization" },
            { icon: Users, label: "Team Hierarchy" },
            { icon: Coins, label: "Credit-Based Controls" },
            { icon: FileCheck, label: "Audit Logging" }
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-4 group">
              <div className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-white/10 group-hover:border-white/20 transition-all duration-300">
                <Icon className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-lg text-white/80 group-hover:text-white transition-colors duration-300">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileHeader() {
  return (
    <div className="lg:hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-8 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <Link href="/products/repmail">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-white/70 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-3">
          <img src="/repmail-logo-white.png" alt="RepMail" className="h-16 w-auto" style={{ objectFit: "contain" }} />
          <div>
            <p className="text-sm text-white/60">Enterprise Email Platform</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatingVisual() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute top-1/4 -right-20 w-96 h-96 opacity-[0.03] dark:opacity-[0.05]">
        <div className="relative w-full h-full animate-[float_20s_ease-in-out_infinite]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2">
            <div className="w-20 h-20 rounded-2xl border-2 border-primary/40 flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary/60" />
            </div>
          </div>
          <div className="absolute top-24 left-8">
            <div className="w-16 h-16 rounded-xl border-2 border-primary/30 flex items-center justify-center">
              <Send className="w-6 h-6 text-primary/50" />
            </div>
          </div>
          <div className="absolute top-24 right-8">
            <div className="w-16 h-16 rounded-xl border-2 border-primary/30 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary/50" />
            </div>
          </div>
          <div className="absolute top-48 left-1/2 -translate-x-1/2">
            <div className="w-14 h-14 rounded-lg border-2 border-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary/40" />
            </div>
          </div>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 250">
            <path d="M150 40 L70 100" stroke="currentColor" strokeWidth="1" fill="none" className="text-primary/20" />
            <path d="M150 40 L230 100" stroke="currentColor" strokeWidth="1" fill="none" className="text-primary/20" />
            <path d="M70 100 L150 180" stroke="currentColor" strokeWidth="1" fill="none" className="text-primary/15" />
            <path d="M230 100 L150 180" stroke="currentColor" strokeWidth="1" fill="none" className="text-primary/15" />
          </svg>
        </div>
      </div>

      <div className="absolute bottom-1/4 -left-32 w-80 h-80 opacity-[0.02] dark:opacity-[0.04]">
        <div className="relative w-full h-full animate-[float_25s_ease-in-out_infinite_reverse]">
          <div className="absolute inset-0 rounded-full border border-primary/30" />
          <div className="absolute inset-8 rounded-full border border-primary/20" />
          <div className="absolute inset-16 rounded-full border border-primary/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Users className="w-10 h-10 text-primary/30" />
          </div>
        </div>
      </div>

      <div className="absolute top-16 left-1/4 w-64 h-64 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-16 right-1/4 w-72 h-72 bg-gradient-to-tl from-primary/5 to-transparent rounded-full blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb,99,102,241),0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary-rgb,99,102,241),0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black_70%)]" />
    </div>
  );
}

function TabSwitcher({ activeTab, onChange }) {
  return (
    <div className="flex bg-muted/50 rounded-lg p-1 gap-1">
      <button
        type="button"
        onClick={() => onChange("signin")}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
          activeTab === "signin"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <LogIn className="h-3.5 w-3.5" />
        Sign In
      </button>
      <button
        type="button"
        onClick={() => onChange("request")}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
          activeTab === "request"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <UserPlus className="h-3.5 w-3.5" />
        Request Access
      </button>
    </div>
  );
}

function SignInForm({ login, isLoggingIn, loginError, resetLoginError }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [oauthError, setOauthError] = useState(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("error");
    if (code === "google_failed") {
      setOauthError("Google sign-in was unsuccessful. Please try again or sign in with your username and password.");
      window.history.replaceState(null, "", window.location.pathname);
    } else if (code === "oauth_unavailable") {
      setOauthError("Google sign-in is not available right now. Please sign in with your username and password.");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login({ username, password });
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleOAuthRedirect = (provider) => {
    if (provider === "Google") {
      window.location.href = "/api/auth/google";
      return;
    }
    toast({
      title: `${provider} sign-in coming soon`,
      description: "Redirecting you to Request Access to get started.",
      duration: 3000
    });
    setTimeout(() => navigate("/early-access"), 1000);
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
      <form onSubmit={handleSubmit} className="space-y-5">
        {oauthError && (
          <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2 duration-300 relative">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="pr-6">{oauthError}</AlertDescription>
            <button
              type="button"
              onClick={() => setOauthError(null)}
              className="absolute top-3 right-3 text-destructive-foreground/60 hover:text-destructive-foreground transition-colors"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </Alert>
        )}
        {loginError && (
          <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {loginError.message || "Invalid credentials. Please try again."}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium">
            Username
          </Label>
          <Input
            id="username"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => { setUsername(e.target.value); resetLoginError?.(); }}
            required
            disabled={isLoggingIn}
            className="h-11 transition-all duration-200 focus:shadow-md focus:ring-2 focus:ring-primary/20"
            data-testid="input-username"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Link href="/forgot-password">
              <span className="text-xs text-muted-foreground hover:text-primary transition-colors duration-200 cursor-pointer">
                Forgot password?
              </span>
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); resetLoginError?.(); }}
              required
              disabled={isLoggingIn}
              className="pr-10 h-11 transition-all duration-200 focus:shadow-md focus:ring-2 focus:ring-primary/20"
              data-testid="input-password"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-11 text-base font-medium transition-all duration-200 hover:shadow-lg hover:shadow-primary/25"
          disabled={isLoggingIn}
          data-testid="button-login"
        >
          {isLoggingIn ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-card text-muted-foreground">or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-11 gap-2 hover:bg-muted/50 transition-all duration-200"
          onClick={() => handleOAuthRedirect("Google")}
          data-testid="button-google"
        >
          <SiGoogle className="h-4 w-4" />
          <span>Google</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 gap-2 hover:bg-muted/50 transition-all duration-200"
          onClick={() => handleOAuthRedirect("LinkedIn")}
          data-testid="button-linkedin"
        >
          <SiLinkedin className="h-4 w-4" />
          <span>LinkedIn</span>
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/early-access">
          <span className="text-primary hover:underline cursor-pointer font-medium">
            Request Access
          </span>
        </Link>
      </p>
    </div>
  );
}

function RequestAccessPanel({ onSignIn }) {
  const [, navigate] = useLocation();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-5">
          <UserPlus className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Get started with RepMail</h3>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          RepMail is an invite-only platform. Submit your details for admin review — our team will
          reach out within 24 hours.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
          <Shield className="w-4 h-4 text-primary/70 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Admin-provisioned accounts</p>
            <p className="text-xs text-muted-foreground">
              All accounts are reviewed and approved by our team for security.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
          <Zap className="w-4 h-4 text-primary/70 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Quick setup</p>
            <p className="text-xs text-muted-foreground">
              Once approved, you&apos;ll receive credentials and 500 free monthly credits to get started.
            </p>
          </div>
        </div>
      </div>

      <Button
        className="w-full h-11 text-base font-medium gap-2 transition-all duration-200 hover:shadow-lg hover:shadow-primary/25"
        onClick={() => navigate("/early-access")}
        data-testid="button-request-access"
      >
        Request Access
        <ArrowRight className="h-4 w-4" />
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <button
          type="button"
          className="text-primary hover:underline font-medium"
          onClick={onSignIn}
        >
          Sign In
        </button>
      </p>
    </div>
  );
}

export default function Login() {
  const { login, isLoggingIn, loginError, resetLoginError, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("signin");

  if (isAuthenticated) {
    return <Redirect to="/app/dashboard" />;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      <BrandingPanel />
      <MobileHeader />

      <div className="flex-1 flex flex-col lg:w-1/2 relative">
        <FloatingVisual />

        <div className="hidden lg:flex items-center justify-between p-6 relative z-10">
          <Link href="/products/repmail">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              data-testid="link-back-home"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to RepMail
            </Button>
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-8 lg:py-0 relative z-10">
          <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="hidden lg:block mb-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {activeTab === "signin" ? "Sign in to your account" : "Join RepMail"}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {activeTab === "signin"
                  ? "Access your campaigns, analytics, and team settings."
                  : "Request access to the platform — our team reviews all applications."}
              </p>
            </div>

            <Card className="border-card-border shadow-2xl shadow-black/5 dark:shadow-black/20 rounded-xl overflow-hidden backdrop-blur-sm bg-card/95">
              <CardContent className="pt-6 pb-6 px-6 space-y-5">
                <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />

                {activeTab === "signin" ? (
                  <SignInForm
                    login={login}
                    isLoggingIn={isLoggingIn}
                    loginError={loginError}
                    resetLoginError={resetLoginError}
                  />
                ) : (
                  <RequestAccessPanel onSignIn={() => setActiveTab("signin")} />
                )}
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary/70" />
                  <span>Secure access</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary/70" />
                  <span>Role-based permissions</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileCheck className="h-3.5 w-3.5 text-primary/70" />
                  <span>All activity is audit logged</span>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                By signing in, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-10px) rotate(1deg); }
          50% { transform: translateY(-5px) rotate(0deg); }
          75% { transform: translateY(-15px) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
}
