import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NavMenu from "@/components/layout/NavMenu";
import {
  Mail,
  Sun,
  Moon,
  LogOut,
  User,
  ChevronDown,
  LayoutDashboard,
  Send,
  History,
  Users,
  FileText,
  Settings,
  CreditCard,
  ShieldOff,
  BookUser,
  Menu,
  X,
  Shield,
  Globe,
  SlidersHorizontal,
  GraduationCap,
} from "lucide-react";
import { getInitials } from "@/lib/utils";

// Desktop nav reveals at `lg` (>=1024). Browser measurement (Phase B) showed that 5
// workflow items + the Manage menu need ~959px, which fits at lg but clips at md; the
// full 8–10-item flat nav clipped through 1024–1280. Below lg, everything moves into the
// mobile sheet. Config/admin areas live in the grouped "Manage" menu — the seed of the
// future settings/operations hub — so the top bar stays uncluttered and future-scalable.
export default function Navbar() {
  const { user, logout, isAdmin, isRootAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const workflowItems = [
    { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/app/campaigns/new", label: "New Campaign", icon: Send },
    { href: "/app/history", label: "History", icon: History },
    { href: "/app/contacts", label: "Contacts", icon: BookUser },
    { href: "/app/templates", label: "Templates", icon: FileText },
  ];

  const manageGroups = [
    { label: "Sending", items: [
      { href: "/app/domains", label: "Domains", icon: Globe },
      { href: "/app/suppressions", label: "Suppressions", icon: ShieldOff },
    ] },
    { label: "Account", items: [
      { href: "/app/payments", label: "Payments", icon: CreditCard },
    ] },
    // M23-A — even signed-in customers had no in-app path to the Resource
    // Center; the guides are directly useful to them (domain setup,
    // deliverability). Reuses the existing config-driven Manage menu.
    { label: "Learn", items: [
      { href: "/repmail/learn", label: "Resource Center", icon: GraduationCap },
    ] },
  ];
  if (isAdmin || isRootAdmin) {
    const adminItems = [];
    if (isAdmin) adminItems.push({ href: "/app/users", label: "Users", icon: Users });
    if (isRootAdmin) adminItems.push({ href: "/app/audit", label: "Audit Logs", icon: Settings });
    if (adminItems.length) manageGroups.push({ label: "Admin", items: adminItems });
  }

  const isActive = (href) => location === href || location.startsWith(href + "/");
  const manageHrefs = manageGroups.flatMap(g => g.items.map(i => i.href));
  const manageActive = manageHrefs.some(h => isActive(h));

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 overflow-hidden">
      {/* Main navbar row */}
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/app/dashboard" className="flex items-center gap-2" data-testid="link-logo">
            <img src="/repmail-logo-white.png" alt="RepMail" className="h-9 w-auto hidden dark:block" style={{ objectFit: "contain" }} />
            <img src="/repmail-logo-black.png" alt="RepMail" className="h-9 w-auto block dark:hidden" style={{ objectFit: "contain" }} />
          </Link>

          {/* Desktop nav (>=lg) */}
          <nav className="hidden lg:flex items-center gap-1">
            {workflowItems.map((item) => {
              const active = isActive(item.href);
              // Button asChild → single <a> styled as a button (no nested interactive elements)
              return (
                <Button key={item.href} asChild variant={active ? "secondary" : "ghost"} size="sm" className="gap-2">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
            <NavMenu
              trigger="Manage"
              icon={SlidersHorizontal}
              groups={manageGroups}
              active={location}
              triggerActive={manageActive}
            />
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile hamburger (<lg) */}
          <button
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            data-testid="button-theme-toggle"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          {/* Desktop user dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2" data-testid="button-user-menu">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(user?.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col items-start">
                  <span className="text-sm font-medium">{user?.username}</span>
                  <span className="text-xs text-muted-foreground">{user?.role}</span>
                </div>
                <ChevronDown className="hidden lg:block h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user?.username}</span>
                  <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/app/profile" className="w-full cursor-pointer" data-testid="menu-profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/repmail/privacy" className="w-full cursor-pointer">
                  <Shield className="mr-2 h-4 w-4" />
                  Privacy Policy
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/repmail/terms" className="w-full cursor-pointer">
                  <FileText className="mr-2 h-4 w-4" />
                  Terms of Service
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-destructive focus:text-destructive cursor-pointer"
                data-testid="menu-logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile slide-down menu (<lg) */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
        mobileOpen ? 'max-h-[640px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="border-t border-border px-4 py-3 space-y-1">
          {workflowItems.map((item) => {
            const active = isActive(item.href);
            // Styled anchor (Link renders <a>) — no nested interactive elements
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}

          {/* Manage groups */}
          {manageGroups.map((group) => (
            <div key={group.label} className="pt-2">
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      active ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Profile + Logout section */}
          <div className="pt-2 border-t border-border mt-2 space-y-1">
            <div className="px-3 py-2 flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(user?.username)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{user?.username}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
              </div>
            </div>
            <Link
              href="/app/profile"
              onClick={() => setMobileOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <User className="h-4 w-4 shrink-0" />
              Profile
            </Link>
            <button
              onClick={() => { setMobileOpen(false); logout(); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Log out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
