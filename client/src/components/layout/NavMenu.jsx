import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Pin } from "lucide-react";
import { cn } from "@/lib/utils";

// Reusable grouped navigation menu — the "Manage" hub trigger, and the seed of the
// future settings/operations hub. Intentionally generic so later areas (API Keys,
// Webhooks, SMTP, Tracking Domains, Teams, Organizations…) drop in as config.
//
// groups: [{ label?, items: [{ href, label, icon?, badge?, pinned? }] }]
//   - group.label   → DropdownMenuLabel (omit for an unlabeled group)
//   - separators     → rendered automatically between groups
//   - item.badge     → small count/status pill (e.g. pending domains)
//   - item.pinned    → pin affordance (future: user-pinned shortcuts)
// active: current location path — highlights the matching item (aria-current="page").
// triggerActive: whether any child route is active (highlights the trigger).
export default function NavMenu({ trigger = "Manage", icon: TriggerIcon, groups = [], active, triggerActive }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Visual active state only — aria-current belongs on the current page's link
            inside the menu, not on the menu trigger itself. */}
        <Button
          variant={triggerActive ? "secondary" : "ghost"}
          size="sm"
          className="gap-1.5"
        >
          {TriggerIcon && <TriggerIcon className="h-4 w-4" aria-hidden="true" />}
          {trigger}
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {groups.map((group, gi) => (
          <div key={group.label || `g${gi}`}>
            {gi > 0 && <DropdownMenuSeparator />}
            {group.label && (
              <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </DropdownMenuLabel>
            )}
            {group.items.map(item => {
              const Icon = item.icon;
              const isActive = active === item.href || (active && active.startsWith(item.href + "/"));
              return (
                <DropdownMenuItem key={item.href} asChild>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn("flex cursor-pointer items-center gap-2", isActive && "bg-accent/50")}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.pinned && <Pin className="h-3 w-3 text-muted-foreground" aria-label="Pinned" />}
                    {item.badge != null && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
