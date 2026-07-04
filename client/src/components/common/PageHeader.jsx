import { cn } from "@/lib/utils";

// Standard page header used on every app page: title + optional description + actions.
// icon is optional (decorative, aria-hidden). actions render right-aligned, wrapping on mobile.
export default function PageHeader({ title, description, icon: Icon, actions, className }) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          {Icon && <Icon aria-hidden="true" className="h-6 w-6 text-primary" />}
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
