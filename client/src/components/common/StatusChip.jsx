import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Loader2, XCircle, AlertTriangle, Circle } from "lucide-react";

// Shared status pill for the whole app (domains, payments, webhooks, campaigns…).
// Status is conveyed by icon + text + color (never color alone — colour-blind safe).
// Token-based, theme-aware; danger reuses --destructive, others use M19 semantic tokens.
const STATUS = {
  verified:  { label: "Verified",  Icon: CheckCircle2, cls: "text-success bg-success/10 border-success/20" },
  pending:   { label: "Pending",   Icon: Clock,        cls: "text-warning bg-warning/10 border-warning/20" },
  checking:  { label: "Checking",  Icon: Loader2,      cls: "text-info bg-info/10 border-info/20", spin: true },
  failed:    { label: "Failed",    Icon: XCircle,      cls: "text-destructive bg-destructive/10 border-destructive/20" },
  suspended: { label: "Suspended", Icon: AlertTriangle,cls: "text-warning bg-warning/10 border-warning/20" },
  neutral:   { label: "—",         Icon: Circle,       cls: "text-muted-foreground bg-muted border-border" },
};

export default function StatusChip({ status = "neutral", label, size = "md", className }) {
  const cfg = STATUS[status] || STATUS.neutral;
  const { Icon } = cfg;
  const sizeCls = size === "sm" ? "text-[11px] px-1.5 py-0 gap-1" : "text-xs px-2 py-0.5 gap-1.5";
  const iconSz = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium whitespace-nowrap",
        sizeCls, cfg.cls, className
      )}
    >
      <Icon aria-hidden="true" className={cn(iconSz, cfg.spin && "animate-spin motion-reduce:animate-none")} />
      {label || cfg.label}
    </span>
  );
}
