import { useState } from "react";
import { Redirect, Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  ArrowLeft
} from "lucide-react";

function BrandingPanel() {
  return (
    <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-semibold text-white">EmailFlow Pro</span>
        </div>

        <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
          Enterprise email campaigns with
          <span className="block bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            AI personalization
          </span>
        </h2>

        <p className="text-white/60 text-lg mb-10 leading-relaxed max-w-md">
          Credit control, team hierarchy, and complete audit compliance for modern marketing teams.
        </p>

        <div className="space-y-4">
          {[
            { icon: Brain, label: "AI Personalization", desc: "Smart content adaptation" },
            { icon: Coins, label: "Credit Control", desc: "Budget management gates" },
            { icon: Users, label: "Team Hierarchy", desc: "Role-based permissions" },
            { icon: FileCheck, label: "Audit Logging", desc: "Complete activity trail" }
          ].map((feature) => (
            <div 
              key={feature.label} 
              className="flex items-center gap-4 text-white/70 transition-colors duration-200 hover:text-white/90"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="font-medium text-white/90">{feature.label}</p>
                <p className="text-sm text-white/50">{feature.desc}</p>
              </div>
            </div>
          ))}
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
    <div className="min-h-screen flex bg-background">
      <BrandingPanel />

      <div className="flex-1 flex flex-col lg:w-[55%]">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Button>
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 pb-12">
          <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="lg:hidden flex flex-col items-center mb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 mb-4">
                <Mail className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">EmailFlow Pro</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enterprise Email Marketing Platform
              </p>
            </div>

            <div className="hidden lg:block">
              <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
              <p className="text-muted-foreground mt-1">
                Sign in to your account to continue
              </p>
            </div>

            <Card className="border-card-border shadow-lg">
              <CardHeader className="space-y-1 pb-4 lg:hidden">
                <CardTitle className="text-xl">Sign in</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 lg:pt-8">
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
                      className="h-11 transition-shadow duration-200 focus:shadow-md"
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
                        className="pr-10 h-11 transition-shadow duration-200 focus:shadow-md"
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
                    className="w-full h-11 text-base transition-all duration-200"
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

                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-xs text-center text-muted-foreground">
                    Demo credentials: <span className="font-mono">admin / changeme123</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Secure access</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span>Role-based</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileCheck className="h-3.5 w-3.5" />
                  <span>Audit logged</span>
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
