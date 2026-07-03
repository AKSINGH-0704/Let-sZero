import { useState } from "react";
import { cn } from "@/lib/utils";
import { Copy, Check } from "lucide-react";
import StatusChip from "./StatusChip";

// A single DNS record (name + value) with per-field copy and an optional detection status.
// Self-contained copy feedback (icon swap) — no toast dependency, so it is reusable and testable.
// record: { type, name, value }; status: one of StatusChip statuses (e.g. "verified"|"pending"|"checking").
function CopyButton({ value, field }) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? `${field} copied` : `Copy ${field}`}
      className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function DnsRecordRow({ record, status, statusLabel, className }) {
  const type = record?.type || "CNAME";
  return (
    <div className={cn("rounded-md border border-border bg-muted/30 p-3", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{type}</span>
        {status && <StatusChip status={status} label={statusLabel} size="sm" />}
      </div>
      <dl className="space-y-1.5 font-mono text-[13px]">
        <div className="flex items-center justify-between gap-2">
          <dt className="w-12 shrink-0 text-muted-foreground">Name</dt>
          <dd className="flex-1 truncate text-foreground">{record?.name}</dd>
          <CopyButton value={record?.name} field="name" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="w-12 shrink-0 text-muted-foreground">Value</dt>
          <dd className="flex-1 truncate text-foreground">{record?.value}</dd>
          <CopyButton value={record?.value} field="value" />
        </div>
      </dl>
    </div>
  );
}
