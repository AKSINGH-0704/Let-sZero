// M21-C — author byline, linking to the author's real page (PAR §5/§7/§9:
// every author is a real person with a real page — this component is the
// structural enforcement point on the display side, matching schema.js's
// enforcement on the data side. Never renders without a name; there is no
// "AI" or anonymous-author fallback path by design.
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function initials(name) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function AuthorByline({ author, basePath, publishedAt, readingTimeMinutes }) {
  if (!author?.name) return null;
  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="flex items-center gap-3" data-testid="author-byline">
      <Avatar className="h-9 w-9">
        {author.avatarUrl && <AvatarImage src={author.avatarUrl} alt="" />}
        <AvatarFallback>{initials(author.name)}</AvatarFallback>
      </Avatar>
      <div className="text-sm">
        <Link href={`${basePath}/authors/${author.slug}`} className="font-medium hover:underline" data-testid={`link-author-${author.slug}`}>
          {author.name}
        </Link>
        <p className="text-muted-foreground">
          {author.role}
          {formattedDate && <> &middot; {formattedDate}</>}
          {typeof readingTimeMinutes === "number" && <> &middot; {readingTimeMinutes} min read</>}
        </p>
      </div>
    </div>
  );
}
