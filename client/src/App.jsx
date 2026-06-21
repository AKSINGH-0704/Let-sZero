import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import NewCampaign from "@/pages/NewCampaign";
import History from "@/pages/History";
import Templates from "@/pages/Templates";
import Users from "@/pages/Users";
import Audit from "@/pages/Audit";
import Profile from "@/pages/Profile";
import ResetPassword from "@/pages/ResetPassword";
import Pricing from "@/pages/Pricing";
import PublicPricing from "@/pages/PublicPricing";
import Payments from "@/pages/Payments";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import NotFound from "@/pages/not-found";
import WaitlistLanding from "@/pages/WaitlistLanding";
import AcceptInvite from "@/pages/AcceptInvite";
import Suppressions from "@/pages/Suppressions";
import LandingExperience from "@marketing/LFP_final/LandingExperience";
import { Loader2 } from "lucide-react";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user?.role)) {
      return <Redirect to="/app/dashboard" />;
    }
  }

  return children;
}

function AppRoutes() {
  const { isAuthenticated, isLoading, mustResetPassword } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated && mustResetPassword) {
    return <ResetPassword />;
  }

  return (
    <Switch>
      <Route path="/">
        {() => isAuthenticated ? <Redirect to="/app/dashboard" /> : <LandingExperience />}
      </Route>

      <Route path="/early-access">
        {() => <WaitlistLanding />}
      </Route>

      <Route path="/products/repmail">
        <Landing />
      </Route>

      <Route path="/login">
        {() => isAuthenticated ? <Redirect to="/app/dashboard" /> : <Login />}
      </Route>

      <Route path="/pricing">
        {() => <PublicPricing />}
      </Route>

      <Route path="/contact">
        {() => <Contact />}
      </Route>

      <Route path="/privacy">
        {() => <Privacy />}
      </Route>

      <Route path="/terms">
        {() => <Terms />}
      </Route>

      <Route path="/accept-invite">
        {() => <AcceptInvite />}
      </Route>

      <Route path="/app/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/app/campaigns/new">
        <ProtectedRoute>
          <NewCampaign />
        </ProtectedRoute>
      </Route>

      <Route path="/app/history">
        <ProtectedRoute>
          <History />
        </ProtectedRoute>
      </Route>

      <Route path="/app/suppressions">
        <ProtectedRoute>
          <Suppressions />
        </ProtectedRoute>
      </Route>

      <Route path="/app/templates">
        <ProtectedRoute>
          <Templates />
        </ProtectedRoute>
      </Route>

      <Route path="/app/users">
        <ProtectedRoute requiredRole={["ROOT_ADMIN", "SUB_ADMIN"]}>
          <Users />
        </ProtectedRoute>
      </Route>

      <Route path="/app/audit">
        <ProtectedRoute requiredRole="ROOT_ADMIN">
          <Audit />
        </ProtectedRoute>
      </Route>

      <Route path="/app/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>

      <Route path="/app/payments/:rest*">
        <ProtectedRoute>
          <Payments />
        </ProtectedRoute>
      </Route>

      <Route path="/app/payments">
        <ProtectedRoute>
          <Payments />
        </ProtectedRoute>
      </Route>

      <Route path="/app/:rest*">
        <ProtectedRoute>
          <Redirect to="/app/dashboard" />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
