// M21-C — one Academy card, used by both the homepage's topic-discovery
// module (PAR §5) and the Academy hub's own header. Reuses Card/Badge, not
// a bespoke component — visual consistency with the rest of the app is
// itself a trust signal (PAR §8).
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AcademyCard({ academy, href, articleCount }) {
  return (
    <Link href={href} data-testid={`link-academy-${academy.slug}`}>
      <Card className="h-full transition-colors hover:border-primary cursor-pointer">
        <CardContent className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <Badge variant="secondary">Academy</Badge>
            {typeof articleCount === "number" && (
              <span className="text-xs text-muted-foreground">{articleCount} guide{articleCount === 1 ? "" : "s"}</span>
            )}
          </div>
          <h3 className="mb-1 text-base font-semibold">{academy.name}</h3>
          <p className="mb-3 text-sm text-muted-foreground">{academy.tagline}</p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            Explore <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
