import { cn } from "@/lib/utils";

// Overline / section label — the standard "eyebrow" above a group of content.
export default function SectionLabel({ children, className }) {
  return (
    <p className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground", className)}>
      {children}
    </p>
  );
}
