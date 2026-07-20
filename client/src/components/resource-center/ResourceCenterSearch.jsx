// M21-F/M21-I — the on-site search command palette (PAR §5/§8). Built on
// the existing cmdk-based Command primitives (unused anywhere in this
// codebase until now), not a new search UI library. Ranking comes from
// shared/content/search.js, not cmdk's own built-in fuzzy scoring, so the
// ranking logic stays independently testable.
//
// Searches a content-type-agnostic index (buildSearchIndex — currently
// Academies + Articles; Templates/Tools/Comparisons/Glossary join the same
// index with one line each as those phases ship), navigating by each
// entry's own `url` rather than a shape specific to articles.
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { FileText, BookOpen, Layers, Compass } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { searchContent, buildSearchIndex } from "@shared/content/search.js";

const TYPE_ICONS = {
  article: FileText,
  academy: BookOpen,
  collection: Layers,
  path: Compass,
};

export default function ResourceCenterSearch({ open, onOpenChange, articles, collections, learningPaths, product }) {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  const index = useMemo(
    () => buildSearchIndex(product, { articles, collections, learningPaths }),
    [product, articles, collections, learningPaths]
  );
  const results = useMemo(() => searchContent(query, index), [query, index]);

  const handleSelect = (entry) => {
    onOpenChange(false);
    setQuery("");
    setLocation(entry.url);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Search the ${product.resourceCenterName}`}
      description={`Find guides and resources in the ${product.resourceCenterName}. Results update as you type.`}
    >
      <CommandInput
        placeholder={`Search the ${product.resourceCenterName}...`}
        value={query}
        onValueChange={setQuery}
        data-testid="input-resource-center-search"
      />
      <CommandList>
        {query.trim() && results.length === 0 && (
          <CommandEmpty>Nothing found for &ldquo;{query}&rdquo;.</CommandEmpty>
        )}
        {results.length > 0 && (
          <CommandGroup heading="Results">
            {results.map((entry) => {
              const Icon = TYPE_ICONS[entry.type] ?? FileText;
              return (
                <CommandItem
                  key={entry.url}
                  value={entry.url}
                  onSelect={() => handleSelect(entry)}
                  data-testid={`option-search-${entry.url}`}
                >
                  <Icon />
                  <div>
                    <div>{entry.title}</div>
                    <div className="text-xs text-muted-foreground">{entry.subtitle}</div>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
