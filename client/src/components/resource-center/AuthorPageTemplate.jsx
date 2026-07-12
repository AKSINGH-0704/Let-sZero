// M21-C, rebuilt M23-D — the author page. A credibility surface: a real
// bio + the full body of work (this is what makes the "no fictional
// personas" rule visible — a persona with no real page and no articles is
// obviously hollow). Now with an editorial header card and the same guide
// rows used everywhere else (with Academy scent, since an author's work
// spans Academies).
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import GuideRow from "./GuideRow";

function initials(name) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function AuthorPageTemplate({ author, articles, product }) {
  if (!author) return null;
  const list = articles ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10" data-testid="author-page-template">
      <header className="mb-10 rounded-2xl border border-border bg-muted/30 p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            {author.avatarUrl && <AvatarImage src={author.avatarUrl} alt="" />}
            <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">{initials(author.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {author.authorType === "Organization" ? "Team" : "Author"}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">{author.name}</h1>
            <p className="mb-2 text-sm text-muted-foreground">{author.role}</p>
            <p className="max-w-xl text-sm">{author.bio}</p>
          </div>
        </div>
      </header>

      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Published guides</h2>
        {list.length > 0 && <span className="text-sm text-muted-foreground">{list.length} total</span>}
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="author-empty">No guides published yet.</p>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border" data-testid="author-article-list">
          {list.map((article) => (
            <GuideRow key={article.slug} article={article} product={product} showAcademy testId={`link-article-${article.slug}`} />
          ))}
        </div>
      )}
    </div>
  );
}
