import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ProtectedRoute from "@/components/layout/ProtectedRoute";

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
import NotFound from "@/pages/not-found";

function AppRoutes() {
  const { isAuthenticated, isLoading, mustResetPassword } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated && mustResetPassword) {
    return <ResetPassword />;
  }

  return (
    <Switch>
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Login />}
      </Route>
      
      <Route path="/">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Landing />}
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/campaigns/new">
        <ProtectedRoute>
          <NewCampaign />
        </ProtectedRoute>
      </Route>

      <Route path="/history">
        <ProtectedRoute>
          <History />
        </ProtectedRoute>
      </Route>

      <Route path="/templates">
        <ProtectedRoute>
          <Templates />
        </ProtectedRoute>
      </Route>

      <Route path="/users">
        <ProtectedRoute requiredRole={["ROOT_ADMIN", "SUB_ADMIN"]}>
          <Users />
        </ProtectedRoute>
      </Route>

      <Route path="/audit">
        <ProtectedRoute requiredRole="ROOT_ADMIN">
          <Audit />
        </ProtectedRoute>
      </Route>

      <Route path="/profile">
        <ProtectedRoute>
          <Profile />
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
