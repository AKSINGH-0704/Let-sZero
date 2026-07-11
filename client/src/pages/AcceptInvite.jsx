import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username must be under 50 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function getStrength(password) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { label: "Weak", barColor: "bg-red-500", textColor: "text-red-500", pct: 33 };
  if (score <= 3) return { label: "Fair", barColor: "bg-yellow-500", textColor: "text-yellow-500", pct: 66 };
  return { label: "Strong", barColor: "bg-green-500", textColor: "text-green-500", pct: 100 };
}

const ROLE_LABELS = { SUB_ADMIN: "Sub-Admin", USER: "Team Member" };

export default function AcceptInvite() {
  const [, navigate] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token");

  const [validating, setValidating] = useState(true);
  const [validateError, setValidateError] = useState("");
  const [inviteData, setInviteData] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "", confirmPassword: "" },
  });

  const passwordValue = watch("password");
  const strength = getStrength(passwordValue);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setValidateError("Invalid invite link.");
      return;
    }
    fetch(`/api/invites/validate?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) setValidateError(data.message || "Invalid invite link.");
        else setInviteData(data);
      })
      .catch(() => setValidateError("Could not validate invite. Please try again."))
      .finally(() => setValidating(false));
  }, [token]);

  const acceptMutation = useMutation({
    mutationFn: async (values) => {
      const res = await apiRequest("POST", "/api/invites/accept", {
        token,
        username: values.username,
        password: values.password,
      });
      return res.json();
    },
    onSuccess: () => {
      localStorage.setItem("repmail_new_user", JSON.stringify({ isNewUser: true }));
      navigate("/app/dashboard");
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <img src="/repmail-logo-white.png" alt="RepMail" className="h-10 w-auto object-contain hidden dark:block" />
          <img src="/repmail-logo-black.png" alt="RepMail" className="h-10 w-auto object-contain block dark:hidden" />
        </div>

        {validating ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Validating invite…</p>
          </div>
        ) : validateError ? (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-foreground">{validateError}</p>
              <p className="text-sm text-muted-foreground mt-1">Contact your admin for a new invite.</p>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl shadow-sm p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-1">
              <h1 className="text-xl font-semibold text-foreground">
                You've been invited as{" "}
                <span className="text-primary">{ROLE_LABELS[inviteData.role] ?? inviteData.role}</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Setting up account for{" "}
                <span className="font-medium text-foreground">{inviteData.email}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit((v) => acceptMutation.mutate(v))} className="space-y-4">
              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="your_username"
                  autoComplete="username"
                  {...register("username")}
                  disabled={acceptMutation.isPending}
                />
                {errors.username && (
                  <p className="text-xs text-destructive">{errors.username.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    {...register("password")}
                    disabled={acceptMutation.isPending}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}

                {/* Strength indicator */}
                {passwordValue && strength && (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-300", strength.barColor)}
                        style={{ width: `${strength.pct}%` }}
                      />
                    </div>
                    <p className={cn("text-xs font-medium", strength.textColor)}>{strength.label}</p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    {...register("confirmPassword")}
                    disabled={acceptMutation.isPending}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Submission error */}
              {acceptMutation.isError && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {acceptMutation.error?.message || "Something went wrong. Please try again."}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  "Create my account"
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
