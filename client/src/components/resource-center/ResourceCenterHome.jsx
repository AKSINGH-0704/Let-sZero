// M21-C — the Resource Center homepage. Module order is the content-strategy
// decision made visible (PAR §5, revised by M22 PAR §9): search, intent
// navigation, featured, learning paths, collections, tools, topic discovery,
// curated resources, recent articles — in that order, every time. A
// first-time visitor's job is to find their topic and get real help, not
// scroll a chronological publishing log.
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
import { useResourceCenterSearch } from "./ResourceCenterLayout";

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
  intents = [],
  featuredArticles = [],
  learningPaths = [],
  collections = [],
  toolsAvailable = false,
  academyArticleCounts = {},
  curatedResources = [],
  recentArticles = [],
}) {
  const openSearch = useResourceCenterSearch();
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
          onClick={openSearch}
          data-testid="button-open-resource-center-search"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Search the {product.resourceCenterName}...
        </Button>
      </div>

      {/* 2. Intent navigation (M22 PAR §9) — "what are you trying to do?",
          ahead of both curated content and category browsing, so a
          first-time visitor can identify their goal before search or
          Academy-browsing. Each card's destination is resolved by the
          caller (ResourceCenterHomePage) against real loaded data, so an
          intent whose target doesn't exist yet is simply absent here —
          never a dead link. */}
      {intents.length > 0 && (
        <Section title="What are you trying to do?" testId="section-intents">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {intents.map((intent) => (
              <Link key={intent.label} href={intent.href} data-testid={`link-intent-${intent.slug}`}>
                <Card className="h-full transition-colors hover:border-primary cursor-pointer">
                  <CardContent className="p-4">
                    <h3 className="font-medium">{intent.label}</h3>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* 3. Featured guides — editorially curated, not "most recent" */}
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

      {/* 4. Learning paths ("Getting Started" for Wave 1, per M22 PAR §6/§9) —
          sequenced bundles for a given buyer stage. Now clickable (M22-A):
          the card had no href at all until real path data existed to link
          to — not a UI oversight, the section simply had nothing to point
          at before this milestone. */}
      {learningPaths.length > 0 && (
        <Section title="Learning paths" subtitle="Sequenced guides for where you're starting from." testId="section-learning-paths">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {learningPaths.map((path) => (
              <Link key={path.slug} href={`${product.basePath}/paths/${path.slug}`} data-testid={`card-learning-path-${path.slug}`}>
                <Card className="h-full transition-colors hover:border-primary cursor-pointer">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <h3 className="mb-1 font-medium">{path.name}</h3>
                      <p className="text-sm text-muted-foreground">{path.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* 5. Collections — thematic groupings that can cross Academies. Also
          made clickable this milestone, same reasoning as Learning paths above. */}
      {collections.length > 0 && (
        <Section title="Collections" testId="section-collections">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {collections.map((c) => (
              <Link key={c.slug} href={`${product.basePath}/collections/${c.slug}`} data-testid={`card-collection-${c.slug}`}>
                <Card className="h-full transition-colors hover:border-primary cursor-pointer">
                  <CardContent className="p-4">
                    <h3 className="mb-1 font-medium">{c.name}</h3>
                    <p className="text-sm text-muted-foreground">{c.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* 6. Tools — only shown once real, not a placeholder promise (PAR §6/§13) */}
      {toolsAvailable && (
        <Section title="Tools" testId="section-tools">
          <Link href={`${product.basePath}/tools`} data-testid="link-tools">
            <Card className="transition-colors hover:border-primary cursor-pointer">
              <CardContent className="p-4">Free tools</CardContent>
            </Card>
          </Link>
        </Section>
      )}

      {/* 7. Topic / Academy discovery — the primary long-term navigation */}
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

      {/* 8. Curated resources — Template Library, Glossary, Comparisons */}
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

      {/* 9. Recent articles — last, smallest, for return visitors only */}
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
