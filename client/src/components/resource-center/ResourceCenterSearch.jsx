// M21-F — the on-site search command palette (PAR §5/§8). Built on the
// existing cmdk-based Command primitives (unused anywhere in this codebase
// until now), not a new search UI library. Ranking comes from
// shared/content/search.js, not cmdk's own built-in fuzzy scoring, so the
// ranking logic stays independently testable.
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { FileText } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { searchArticles } from "@shared/content/search.js";

export default function ResourceCenterSearch({ open, onOpenChange, articles, product }) {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  const results = useMemo(() => searchArticles(query, articles), [query, articles]);

  const handleSelect = (article) => {
    onOpenChange(false);
    setQuery("");
    setLocation(`${product.basePath}/${article.academy.slug}/${article.slug}`);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={`Search the ${product.resourceCenterName}...`}
        value={query}
        onValueChange={setQuery}
        data-testid="input-resource-center-search"
      />
      <CommandList>
        {query.trim() && results.length === 0 && (
          <CommandEmpty>No guides found for &ldquo;{query}&rdquo;.</CommandEmpty>
        )}
        {results.length > 0 && (
          <CommandGroup heading="Guides">
            {results.map((article) => (
              <CommandItem
                key={article.slug}
                value={article.slug}
                onSelect={() => handleSelect(article)}
                data-testid={`option-search-${article.slug}`}
              >
                <FileText />
                <div>
                  <div>{article.title}</div>
                  <div className="text-xs text-muted-foreground">{article.academy.name}</div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
