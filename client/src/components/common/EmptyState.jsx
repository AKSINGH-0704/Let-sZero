import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

// Standard empty state: one line icon → headline → one-sentence guide → one primary action.
// `action` is a rendered node (e.g. a <Button>). `dashed` gives the "add your first…" treatment.
export default function EmptyState({ icon: Icon, title, description, action, dashed = true, className }) {
  return (
    <Card className={cn(dashed ? "border-dashed border-card-border" : "border-card-border", className)}>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        {Icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Icon aria-hidden="true" className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        {title && <h3 className="text-base font-medium text-foreground">{title}</h3>}
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
        {action && <div className="mt-1">{action}</div>}
      </CardContent>
    </Card>
  );
}
