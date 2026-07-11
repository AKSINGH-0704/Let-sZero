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
    <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm font-mono">{String(content ?? "")}</pre>
  );
}

function TableBody({ content }) {
  const headers = content?.headers ?? [];
  const rows = content?.rows ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2">{cell}</td>
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
  return <img src={content} alt="" className="w-full rounded-md border" />;
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

  return (
    <Card data-testid={`content-asset-${asset.type}`}>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        <CardTitle className="text-base">{asset.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {BodyRenderer ? <BodyRenderer content={asset.content} /> : null}
      </CardContent>
    </Card>
  );
}
