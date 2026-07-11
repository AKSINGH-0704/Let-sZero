// M21-D — the LetsZero-level /learn directory (PAR §5/§11): deliberately
// thin, links out to each product's own Resource Center, hosts no content
// of its own. Today that's exactly one card (RepMail); a second LetsZero
// product adds a second card here, nothing else about this page changes.
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { PRODUCTS } from "@shared/content/taxonomy.js";
import { Card, CardContent } from "@/components/ui/card";

export default function LetsZeroLearnDirectory() {
  const products = Object.values(PRODUCTS);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10" data-testid="letszero-learn-directory">
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">LetsZero Resources</h1>
        <p className="text-lg text-muted-foreground">
          Guides, tools, and reference material from every LetsZero product.
        </p>
      </header>
      <div className="space-y-3">
        {products.map((product) => (
          <Link key={product.slug} href={product.basePath} data-testid={`link-product-resource-center-${product.slug}`}>
            <Card className="transition-colors hover:border-primary cursor-pointer">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <h2 className="mb-1 text-lg font-semibold">{product.resourceCenterName}</h2>
                  <p className="text-sm text-muted-foreground">by {product.name}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
