import Navbar from "./Navbar";
import { PageScrollIndicator } from "@/components/ui/scroll-indicator";

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

export default function AppLayout({ children, showScrollIndicator = true }) {
  return (
    <div className="min-h-screen bg-background relative">
      <SubtleBackground />
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl relative">
        {children}
      </main>
      {showScrollIndicator && <PageScrollIndicator />}
    </div>
  );
}
