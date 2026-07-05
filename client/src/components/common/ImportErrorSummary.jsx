import Banner from "@/components/common/Banner";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Shared summary for both contact-import surfaces (Contact Library's ImportSheet
// and the campaign-creation upload flow) — built on Banner + Accordion + Table,
// the same primitives the design system already provides, instead of each
// surface re-inventing its own error rendering. The campaign-creation path
// previously rendered a flat, ungrouped bullet list of raw strings with no row
// numbers; this replaces both with one summarized, collapsible, row-level view.
//
// Accepts either server response shape directly:
//   - partial success: { totalRows, failedRows, rowErrors }
//   - total failure:   { message, hint, totalRows, failedRows, rowErrors }
export default function ImportErrorSummary({ totalRows, failedRows, rowErrors, message, hint, allFailed = false }) {
  if (!failedRows && !message) return null;

  const shown = rowErrors || [];
  const cappedNote = failedRows > shown.length
    ? `Showing first ${shown.length} of ${failedRows.toLocaleString()} failed row${failedRows === 1 ? "" : "s"}`
    : `${shown.length} failed row${shown.length === 1 ? "" : "s"}`;

  return (
    <div className="space-y-2">
      <Banner variant={allFailed ? "danger" : "warning"}>
        <p className="font-medium">
          {message || (allFailed
            ? `All ${totalRows?.toLocaleString() ?? failedRows.toLocaleString()} rows failed to import`
            : `${failedRows.toLocaleString()} of ${totalRows?.toLocaleString() ?? "?"} rows could not be imported`)}
        </p>
        {hint && <p className="mt-1 text-muted-foreground">{hint}</p>}
      </Banner>

      {shown.length > 0 && (
        <Accordion type="single" collapsible className="rounded-md border">
          <AccordionItem value="details" className="border-b-0">
            <AccordionTrigger className="px-3 py-2 text-xs font-medium text-muted-foreground hover:no-underline">
              {cappedNote} — view details
            </AccordionTrigger>
            <AccordionContent className="px-0 pb-0 pt-0">
              <div className="max-h-64 overflow-y-auto border-t">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-20">Row</TableHead>
                      <TableHead className="text-xs">Value</TableHead>
                      <TableHead className="text-xs">Issue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shown.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-mono">{e.row ?? "—"}</TableCell>
                        <TableCell className="text-xs font-mono truncate max-w-[160px]">{e.value ?? "—"}</TableCell>
                        <TableCell className="text-xs">{e.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
