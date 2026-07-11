// M21-C — author page: a real person's bio and their full publication list
// (PAR §5/§7/§9). This is the page Person JSON-LD (M21-E) will describe,
// which is what makes "no fictional personas" structurally checkable — a
// persona with no real page/body of work behind it is immediately, visibly
// hollow, not just against a style rule nobody's re-reading.
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

function initials(name) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function AuthorPageTemplate({ author, articles, product }) {
  if (!author) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10" data-testid="author-page-template">
      <header className="mb-10 flex items-start gap-4">
        <Avatar className="h-16 w-16">
          {author.avatarUrl && <AvatarImage src={author.avatarUrl} alt="" />}
          <AvatarFallback className="text-lg">{initials(author.name)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{author.name}</h1>
          <p className="mb-2 text-muted-foreground">{author.role}</p>
          <p className="max-w-xl text-sm">{author.bio}</p>
        </div>
      </header>

      <h2 className="mb-4 text-lg font-semibold">Published guides</h2>
      <div className="space-y-3" data-testid="author-article-list">
        {(articles ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No guides published yet.</p>
        ) : (
          articles.map((article) => (
            <Link key={article.slug} href={`${product.basePath}/${article.academy.slug}/${article.slug}`} data-testid={`link-article-${article.slug}`}>
              <Card className="transition-colors hover:border-primary cursor-pointer">
                <CardContent className="p-4">
                  <h3 className="font-medium">{article.title}</h3>
                  <p className="text-sm text-muted-foreground">{article.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
