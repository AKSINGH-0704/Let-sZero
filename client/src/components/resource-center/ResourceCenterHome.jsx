// M21-C — the Resource Center homepage. Module order is the content-strategy
// decision made visible (PAR §5): search, featured, learning paths,
// collections, tools, topic discovery, curated resources, recent articles —
// in that order, every time. A first-time visitor's job is to find their
// topic and get real help, not scroll a chronological publishing log.
//
// Search is a trigger only here — the actual command-palette wiring is
// M21-F's scope; this establishes its position in the layout now so the
// module order is correct from the first real render, not retrofitted later.
import { Link } from "wouter";
import { Search, ArrowRight, BookOpen } from "lucide-react";
import AcademyCard from "./AcademyCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function Section({ title, subtitle, children, testId }) {
  return (
    <section className="mb-12" data-testid={testId}>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default function ResourceCenterHome({
  product,
  featuredArticles = [],
  learningPaths = [],
  collections = [],
  toolsAvailable = false,
  academyArticleCounts = {},
  curatedResources = [],
  recentArticles = [],
  onOpenSearch,
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10" data-testid="resource-center-home">
      <header className="mb-10">
        <Badge variant="secondary" className="mb-3">{product.name}</Badge>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">{product.resourceCenterName}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Everything we know about cold email deliverability and outreach — written by the team building {product.name}.
        </p>
      </header>

      {/* 1. Search — the intended primary discovery tool (PAR §5/§8) */}
      <div className="mb-12">
        <Button
          variant="outline"
          className="w-full max-w-md justify-start gap-2 text-muted-foreground"
          onClick={onOpenSearch}
          data-testid="button-open-resource-center-search"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Search the {product.resourceCenterName}...
        </Button>
      </div>

      {/* 2. Featured guides — editorially curated, not "most recent" */}
      {featuredArticles.length > 0 && (
        <Section title="Featured guides" testId="section-featured">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredArticles.map((article) => (
              <Link key={article.slug} href={`${product.basePath}/${article.academy.slug}/${article.slug}`} data-testid={`link-featured-${article.slug}`}>
                <Card className="h-full transition-colors hover:border-primary cursor-pointer">
                  <CardContent className="p-4">
                    <h3 className="mb-1 font-medium">{article.title}</h3>
                    <p className="text-sm text-muted-foreground">{article.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* 3. Learning paths — sequenced bundles for a given buyer stage */}
      {learningPaths.length > 0 && (
        <Section title="Learning paths" subtitle="Sequenced guides for where you're starting from." testId="section-learning-paths">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {learningPaths.map((path) => (
              <Card key={path.slug} data-testid={`card-learning-path-${path.slug}`}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <h3 className="mb-1 font-medium">{path.name}</h3>
                    <p className="text-sm text-muted-foreground">{path.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* 4. Collections — thematic groupings that can cross Academies */}
      {collections.length > 0 && (
        <Section title="Collections" testId="section-collections">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {collections.map((c) => (
              <Card key={c.slug} data-testid={`card-collection-${c.slug}`}>
                <CardContent className="p-4">
                  <h3 className="mb-1 font-medium">{c.name}</h3>
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* 5. Tools — only shown once real, not a placeholder promise (PAR §6/§13) */}
      {toolsAvailable && (
        <Section title="Tools" testId="section-tools">
          <Link href={`${product.basePath}/tools`} data-testid="link-tools">
            <Card className="transition-colors hover:border-primary cursor-pointer">
              <CardContent className="p-4">Free tools</CardContent>
            </Card>
          </Link>
        </Section>
      )}

      {/* 6. Topic / Academy discovery — the primary long-term navigation */}
      <Section title="Explore by topic" testId="section-academies">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {product.academies.map((academy) => (
            <AcademyCard
              key={academy.slug}
              academy={academy}
              href={`${product.basePath}/${academy.slug}`}
              articleCount={academyArticleCounts[academy.slug] ?? 0}
            />
          ))}
        </div>
      </Section>

      {/* 7. Curated resources — Template Library, Glossary, Comparisons */}
      {curatedResources.length > 0 && (
        <Section title="More resources" testId="section-curated-resources">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {curatedResources.map((r) => (
              <Link key={r.href} href={r.href} data-testid={`link-curated-${r.slug}`}>
                <Card className="h-full transition-colors hover:border-primary cursor-pointer">
                  <CardContent className="flex items-center gap-2 p-4">
                    <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="font-medium">{r.name}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* 8. Recent articles — last, smallest, for return visitors only */}
      {recentArticles.length > 0 && (
        <Section title="Recently published" testId="section-recent">
          <ul className="space-y-2">
            {recentArticles.map((article) => (
              <li key={article.slug}>
                <Link
                  href={`${product.basePath}/${article.academy.slug}/${article.slug}`}
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                  data-testid={`link-recent-${article.slug}`}
                >
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
