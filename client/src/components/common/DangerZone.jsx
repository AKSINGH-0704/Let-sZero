import { cn } from "@/lib/utils";

// Low-emphasis but discoverable destructive-action region (e.g. Remove domain).
// Renders a subtle divider + title/description on the left and the destructive action node
// on the right. The confirming dialog is the caller's responsibility (AlertDialog).
export default function DangerZone({ title, description, action, className }) {
  return (
    <div className={cn("mt-2 border-t border-border pt-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {title && <p className="text-sm font-medium text-foreground">{title}</p>}
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
