import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  Mail,
  Shield,
  CheckCircle2,
  FileCheck,
  Users,
  Sparkles
} from "lucide-react";

function BrandingPanel() {
  return (
    <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
        <div className="flex items-center gap-3 mb-10">
          <img src="/repmail-logo-white.png" alt="RepMail" className="h-16 w-auto" style={{ objectFit: "contain" }} />
        </div>

        <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
          Set up your account
          <span className="block bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            just one more step
          </span>
        </h2>

        <p className="text-white/60 text-lg mb-10 leading-relaxed max-w-md">
          Welcome to RepMail. Create a secure password to protect your account and get started.
        </p>

        <div className="space-y-4">
          {[
            { icon: Shield, label: "Enterprise Security", desc: "Industry-standard encryption" },
            { icon: FileCheck, label: "Audit Compliance", desc: "All changes are logged" },
            { icon: Users, label: "Role Protection", desc: "Secure access controls" }
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

export default function ResetPassword() {
  const { user, resetPassword, isResettingPassword, resetPasswordError, logout } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      // Pass empty string as currentPassword — backend skips validation when mustResetPassword is true
      await resetPassword("", newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to set password. Please try again.");
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex bg-background">
        <BrandingPanel />

        <div className="flex-1 flex flex-col lg:w-[55%]">
          <div className="flex items-center justify-end p-4 sm:p-6">
            <ThemeToggle />
          </div>

          <div className="flex-1 flex items-center justify-center px-4 sm:px-8 pb-12">
            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border-card-border shadow-lg">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-2xl">You&apos;re all set!</CardTitle>
                  <CardDescription className="text-base">
                    Your password has been set successfully. You can now access all RepMail features.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <Button
                    className="w-full h-11 text-base"
                    onClick={() => window.location.reload()}
                    data-testid="button-continue"
                  >
                    Continue to Dashboard
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <BrandingPanel />

      <div className="flex-1 flex flex-col lg:w-[55%]">
        <div className="flex items-center justify-end p-4 sm:p-6">
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 pb-12">
          <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Mobile logo */}
            <div className="lg:hidden flex flex-col items-center mb-6">
              <img src="/repmail-logo-white.png" alt="RepMail" className="h-16 w-auto mb-2 hidden dark:block" style={{ objectFit: "contain" }} />
              <img src="/repmail-logo-black.png" alt="RepMail" className="h-16 w-auto mb-2 block dark:hidden" style={{ objectFit: "contain" }} />
            </div>

            {/* Desktop heading */}
            <div className="hidden lg:block">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-primary" />
                <h1 className="text-2xl font-semibold tracking-tight">Set Your Password</h1>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                Welcome to RepMail
                {user ? `, ${user.username}` : ""}! Please create a secure password to get started.
              </p>
            </div>

            <Card className="border-card-border shadow-lg">
              {/* Mobile card header */}
              <CardHeader className="lg:hidden text-center pb-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Set Your Password</CardTitle>
                <CardDescription>
                  Create a secure password to access your account.
                  {user && (
                    <span className="block mt-2 font-medium text-foreground">
                      Account: {user.username}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {(error || resetPasswordError) && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{error || resetPasswordError?.message}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        className="h-11 pr-10 transition-shadow duration-200 focus:shadow-md"
                        data-testid="input-new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        required
                        className="h-11 pr-10 transition-shadow duration-200 focus:shadow-md"
                        data-testid="input-confirm-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-base transition-all duration-200 hover:shadow-lg hover:shadow-primary/25"
                    disabled={isResettingPassword}
                    data-testid="button-reset-password"
                  >
                    {isResettingPassword ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Setting password...
                      </>
                    ) : (
                      "Set Password & Continue"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={logout}
                    data-testid="button-logout"
                  >
                    Sign out instead
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                <span>Secure access</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5" />
                <span>Audit logged</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
