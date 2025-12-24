import { useState } from "react";
import { Redirect, Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Mail, 
  Loader2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Brain, 
  Coins, 
  FileCheck,
  Shield,
  ArrowLeft
} from "lucide-react";

function BrandingPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-semibold text-white">EmailFlow Pro</span>
        </div>

        <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
          Welcome back
        </h2>

        <p className="text-white/60 text-lg mb-12 leading-relaxed max-w-md">
          Manage campaigns, credits, and teams securely.
        </p>

        <div className="space-y-5">
          <div className="flex items-center gap-4 text-white/80">
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-lg">AI-powered personalization</span>
          </div>
          <div className="flex items-center gap-4 text-white/80">
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
              <Coins className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-lg">Hierarchical credit control</span>
          </div>
          <div className="flex items-center gap-4 text-white/80">
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
              <FileCheck className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-lg">Audit-grade compliance</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileHeader() {
  return (
    <div className="lg:hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 text-white/70 hover:text-white hover:bg-white/10" data-testid="link-back-home-mobile">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <ThemeToggle />
      </div>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl flex items-center justify-center">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">EmailFlow Pro</h1>
          <p className="text-sm text-white/60">Enterprise Email Platform</p>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const { login, isLoggingIn, loginError, isAuthenticated } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) {
    return <Redirect to="/app/dashboard" />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login({ username, password });
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      <BrandingPanel />

      <MobileHeader />

      <div className="flex-1 flex flex-col lg:w-1/2">
        <div className="hidden lg:flex items-center justify-between p-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Button>
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-8 lg:py-0">
          <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="hidden lg:block mb-8">
              <h1 className="text-2xl font-semibold tracking-tight">Sign in to your account</h1>
              <p className="text-muted-foreground mt-1">
                Enter your credentials to continue
              </p>
            </div>

            <Card className="border-card-border shadow-xl rounded-xl">
              <CardContent className="pt-8 pb-6 px-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {loginError && (
                    <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {loginError.message || "Invalid credentials. Please try again."}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={isLoggingIn}
                      className="h-11 transition-all duration-200 focus:shadow-md focus:ring-2 focus:ring-primary/20"
                      data-testid="input-username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                    className="w-full h-11 text-base font-medium transition-all duration-200 hover:shadow-lg"
                    disabled={isLoggingIn}
                    data-testid="button-login"
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>

                <div className="mt-6 pt-5 border-t border-border">
                  <p className="text-xs text-center text-muted-foreground">
                    Demo credentials: <span className="font-mono bg-muted px-1.5 py-0.5 rounded">admin / changeme123</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Secure, role-based access</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileCheck className="h-3.5 w-3.5" />
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
    </div>
  );
}
