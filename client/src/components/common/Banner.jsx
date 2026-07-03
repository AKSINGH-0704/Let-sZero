import { cn } from "@/lib/utils";
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from "lucide-react";

// Inline banner for persistent, page-level notices (Preview Mode, returnTo, system state).
// Semantic variants map to design-system status tokens. Optional action node + dismiss.
const VARIANTS = {
  info:    { Icon: Info,         cls: "border-info/20 bg-info/5 text-foreground",             iconCls: "text-info" },
  success: { Icon: CheckCircle2, cls: "border-success/20 bg-success/5 text-foreground",       iconCls: "text-success" },
  warning: { Icon: AlertTriangle,cls: "border-warning/20 bg-warning/5 text-foreground",       iconCls: "text-warning" },
  danger:  { Icon: AlertCircle,  cls: "border-destructive/20 bg-destructive/5 text-foreground",iconCls: "text-destructive" },
};

export default function Banner({ variant = "info", children, action, onDismiss, className }) {
  const cfg = VARIANTS[variant] || VARIANTS.info;
  const { Icon } = cfg;
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        cfg.cls, className
      )}
    >
      <Icon aria-hidden="true" className={cn("mt-0.5 h-4 w-4 shrink-0", cfg.iconCls)} />
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
