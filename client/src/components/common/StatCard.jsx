import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

// Metric tile for dashboards / analytics. Overline label + large tabular value + optional
// delta and icon. Delta trend uses semantic tokens (up=success, down=destructive) with a sign,
// so it is never conveyed by colour alone.
export default function StatCard({ label, value, delta, icon: Icon, className }) {
  const trend = delta?.direction; // "up" | "down" | undefined
  return (
    <Card className={cn("border-card-border", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          {Icon && <Icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />}
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        {delta && (
          <p
            className={cn(
              "mt-1 text-xs font-medium tabular-nums",
              trend === "up" && "text-success",
              trend === "down" && "text-destructive",
              !trend && "text-muted-foreground"
            )}
          >
            {trend === "up" ? "▲ " : trend === "down" ? "▼ " : ""}{delta.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
