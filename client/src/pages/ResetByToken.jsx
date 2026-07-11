import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export default function ResetByToken() {
  const { token } = useParams();
  const [, navigate] = useLocation();
  const { refetch } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Field-level errors — previously both checks rendered as one generic
  // banner above both fields, regardless of which field was actually wrong.
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const errors = {};
    if (newPassword.length < 8) errors.newPassword = "Password must be at least 8 characters.";
    else if (newPassword !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
    setFieldErrors(errors);
    const fieldIds = { newPassword: "new-password", confirmPassword: "confirm-password" };
    const firstInvalid = Object.keys(fieldIds).find(f => errors[f]);
    if (firstInvalid) {
      document.getElementById(fieldIds[firstInvalid])?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-by-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Something went wrong. Please try again.");
      }
      // Session cookie is set by the server — refresh auth state then redirect
      await refetch();
      navigate("/app/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">This reset link is invalid.</p>
          <Link href="/forgot-password">
            <Button variant="outline">Request a new link</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Choose a strong password. You&apos;ll be signed in automatically.
          </p>
        </div>

        <Card className="border-card-border shadow-2xl shadow-black/5 dark:shadow-black/20 rounded-xl overflow-hidden">
          <CardContent className="pt-6 pb-6 px-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium">
                  New password
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (fieldErrors.newPassword) setFieldErrors(prev => ({ ...prev, newPassword: undefined }));
                    }}
                    required
                    disabled={isSubmitting}
                    aria-invalid={!!fieldErrors.newPassword}
                    className={cn("pr-10 h-11", fieldErrors.newPassword && "border-destructive focus-visible:ring-destructive")}
                    minLength={8}
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
                {fieldErrors.newPassword && <p className="text-xs text-destructive">{fieldErrors.newPassword}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-medium">
                  Confirm password
                </Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat your new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                  }}
                  required
                  disabled={isSubmitting}
                  aria-invalid={!!fieldErrors.confirmPassword}
                  className={cn("h-11", fieldErrors.confirmPassword && "border-destructive focus-visible:ring-destructive")}
                />
                {fieldErrors.confirmPassword && <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>}
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Set new password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login">
            <span className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </span>
          </Link>
        </p>
      </div>
    </div>
  );
}
