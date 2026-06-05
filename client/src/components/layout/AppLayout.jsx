import Navbar from "./Navbar";
import { PageScrollIndicator } from "@/components/ui/scroll-indicator";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { AlertTriangle } from "lucide-react";

function SubtleBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute top-0 right-0 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-primary/[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[250px] h-[250px] md:w-[500px] md:h-[500px] bg-primary/[0.015] rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
      <div 
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

function PauseBanners() {
  const { user } = useAuth();

  const { data: health } = useQuery({
    queryKey: ["/api/health"],
    refetchInterval: 30_000,
    enabled: !!user,
  });

  const platformPaused = health?.sendPaused === true;
  const userPaused = user?.sendPaused === true;

  if (!platformPaused && !userPaused) return null;

  return (
    <div className="border-b bg-background">
      {platformPaused && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-2">
          <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-md px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Platform sending is paused by an administrator. New campaigns will not execute until sending is resumed.</span>
          </div>
        </div>
      )}
      {userPaused && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-2">
          <div className="flex items-center gap-2 text-sm text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Your account has been paused from sending due to elevated bounce or complaint rates. Contact support to resume.</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppLayout({ children, showScrollIndicator = true }) {
  return (
    <div className="min-h-screen bg-background relative">
      <SubtleBackground />
      <Navbar />
      <PauseBanners />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl relative">
        {children}
      </main>
      {showScrollIndicator && <PageScrollIndicator />}
    </div>
  );
}
