// M21-C — renders one embedded content asset (checklist, template, table,
// diagram). Every published Resource Center article ships with at least one
// of these (shared/content/schema.js's assets.min(1) enforces it structurally;
// this component is what actually displays one). Reuses Card, not a bespoke
// container, and reuses lucide icons already used elsewhere in the app.
import { CheckSquare, FileText, Table2, Image as ImageIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const ASSET_ICONS = {
  checklist: CheckSquare,
  template: FileText,
  table: Table2,
  diagram: ImageIcon,
};

function ChecklistBody({ content }) {
  const items = Array.isArray(content) ? content : [];
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function TemplateBody({ content }) {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/60 p-4 text-sm font-mono leading-relaxed">{String(content ?? "")}</pre>
  );
}

function TableBody({ content, title }) {
  const headers = content?.headers ?? [];
  const rows = content?.rows ?? [];
  return (
    // M30 — a reference table is wider than a phone (measured: 427px of table
    // in a 291px column at 375px). The container already scrolled, but a
    // scrollable region that is not keyboard focusable is unreachable without a
    // pointer, which fails WCAG 2.1.1. role + tabIndex + an accessible name make
    // it a real, focusable region; the ring makes that focus visible.
    <div
      role="region"
      aria-label={title ? `${title} (scrollable table)` : "Scrollable table"}
      tabIndex={0}
      className="overflow-x-auto rounded-lg border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {headers.map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0 even:bg-muted/20">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2.5 align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiagramBody({ content }) {
  if (!content) return null;
  return <img src={content} alt="" className="w-full rounded-lg border border-border" />;
}

const BODY_RENDERERS = {
  checklist: ChecklistBody,
  template: TemplateBody,
  table: TableBody,
  diagram: DiagramBody,
};

export default function ContentAsset({ asset }) {
  if (!asset) return null;
  const Icon = ASSET_ICONS[asset.type] ?? FileText;
  const BodyRenderer = BODY_RENDERERS[asset.type];

  const TYPE_LABEL = { checklist: "Checklist", template: "Template", table: "Reference", diagram: "Diagram" };

  return (
    <Card data-testid={`content-asset-${asset.type}`} className="border-border">
      <CardHeader className="space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary" aria-hidden="true">
            <Icon className="h-4 w-4" />
          </span>
          <CardTitle className="text-base">{asset.title}</CardTitle>
          <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {TYPE_LABEL[asset.type] ?? "Resource"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {BodyRenderer ? <BodyRenderer content={asset.content} title={asset.title} /> : null}
      </CardContent>
    </Card>
  );
}
