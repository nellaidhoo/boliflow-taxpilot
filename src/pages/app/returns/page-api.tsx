import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download, TriangleAlert } from "lucide-react";
import { useApi } from "@/hooks/use-api.ts";
import { useBusiness } from "@/pages/app/_lib/use-business.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { getPeriod, formatMvr } from "@/lib/gst.ts";
import { downloadMira205 } from "./_lib/export-mira.ts";

type ReturnData = {
  business: { id: string; name: string; tin: string; sector: string };
  inputRows: { serial: number; purchaseId: string; supplierTin: string; supplierName: string; invoiceNumber: string; invoiceDate: string; totalExclGst: number; gstByRate: Record<number, number> }[];
  taxInvoiceRows: { saleId: string; customerTin: string; customerName: string; invoiceNumber: string; invoiceDate: string; valueByRate: Record<number, number>; zeroRated: number; exempt: number; outOfScope: number }[];
  otherTransactions: { valueByRate: Record<number, number>; zeroRated: number; exempt: number; outOfScope: number };
  summary: { standardRatedByRate: { rate: number; value: number; gst: number }[]; zeroRated: number; exempt: number; totalSupplies: number; outputTax: number; inputTax: number; netGst: number };
  issues: { level: "error" | "warning" | "info"; message: string }[];
};

export default function ReturnsApiPage() {
  const business = useBusiness();
  const { request } = useApi();
  const [offset, setOffset] = useState(0);
  const [exporting, setExporting] = useState(false);
  const period = getPeriod(business.filingPeriod, offset);
  const startDate = format(period.start, "yyyy-MM-dd");
  const endDate = format(period.end, "yyyy-MM-dd");
  const result = useQuery({
    queryKey: ["returns", business.id, startDate, endDate],
    queryFn: () => request<ReturnData>(`/v1/businesses/${business.id}/returns?startDate=${startDate}&endDate=${endDate}`),
  });

  const exportWorkbook = async () => {
    if (!result.data) return;
    setExporting(true);
    try {
      await downloadMira205({ ...result.data, periodLabel: period.label, startDate, endDate });
      toast.success("MIRA workbook downloaded");
    } catch {
      toast.error("Could not create the workbook. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-serif text-3xl font-medium">GST return</h1><p className="mt-1 text-muted-foreground">Review the statements for the selected tax period.</p></div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setOffset((value) => value + 1)} aria-label="Previous period"><ChevronLeft /></Button>
          <div className="min-w-36 text-center"><div className="font-semibold">{period.label}</div><div className="text-xs text-muted-foreground">Due {format(period.due, "d MMM yyyy")}</div></div>
          <Button variant="ghost" size="icon" disabled={offset === 0} onClick={() => setOffset((value) => Math.max(0, value - 1))} aria-label="Next period"><ChevronRight /></Button>
        </div>
      </div>
      {result.isPending ? <><Skeleton className="h-44 w-full rounded-2xl" /><Skeleton className="h-72 w-full rounded-2xl" /></> : result.isError ? (
        <div className="rounded-2xl border p-8 text-center"><p className="text-muted-foreground">Could not load this return.</p><Button className="mt-3" variant="secondary" onClick={() => void result.refetch()}>Try again</Button></div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <section className="overflow-hidden rounded-2xl border bg-card">
              <div className="bg-primary p-5 text-primary-foreground"><div className="text-sm opacity-80">{result.data.summary.netGst < 0 ? "GST refundable" : "GST payable"}</div><div className="mt-1 font-serif text-4xl">{formatMvr(Math.abs(result.data.summary.netGst))}</div><div className="mt-2 flex gap-5 text-sm"><span>Output {formatMvr(result.data.summary.outputTax)}</span><span>Input {formatMvr(result.data.summary.inputTax)}</span></div></div>
              <div className="divide-y text-sm">{result.data.summary.standardRatedByRate.map((line) => <SummaryLine key={line.rate} label={`Standard-rated at ${line.rate}%`} value={line.value} gst={line.gst} />)}<SummaryLine label="Zero-rated supplies" value={result.data.summary.zeroRated} /><SummaryLine label="Exempt supplies" value={result.data.summary.exempt} /><SummaryLine label="Total supplies" value={result.data.summary.totalSupplies} bold /></div>
            </section>
            <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
              <h2 className="font-semibold">Filing checks</h2>
              {result.data.issues.length === 0 ? <p className="rounded-lg bg-secondary p-3 text-sm">All checks passed. Review the statements before filing.</p> : <ul className="space-y-2">{result.data.issues.map((issue, i) => <li key={`${issue.message}-${i}`} className="flex gap-2 rounded-lg bg-accent p-3 text-sm"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{issue.message}</li>)}</ul>}
              <Button className="mt-auto w-full" disabled={exporting} onClick={() => void exportWorkbook()}>{exporting ? "Preparing…" : <><Download /> Download MIRA 205 Excel</>}</Button>
            </section>
          </div>
          <Tabs defaultValue="input">
            <TabsList><TabsTrigger value="input">Input tax ({result.data.inputRows.length})</TabsTrigger><TabsTrigger value="output">Output tax ({result.data.taxInvoiceRows.length + 1})</TabsTrigger></TabsList>
            <TabsContent value="input" className="pt-3"><StatementTable headers={["No.", "Supplier", "Invoice", "Date", "Excl. GST", "GST"]} rows={result.data.inputRows.map((row) => [String(row.serial), `${row.supplierName} (${row.supplierTin || "No TIN"})`, row.invoiceNumber, row.invoiceDate, formatMvr(row.totalExclGst), formatMvr(Object.values(row.gstByRate).reduce((a, b) => a + b, 0))])} empty="No approved purchase invoices with GST in this period." /></TabsContent>
            <TabsContent value="output" className="pt-3"><StatementTable headers={["Customer", "TIN", "Invoice", "Date", "Taxable"]} rows={result.data.taxInvoiceRows.map((row) => [row.customerName, row.customerTin, row.invoiceNumber, row.invoiceDate, formatMvr(Object.values(row.valueByRate).reduce((a, b) => a + b, 0) + row.zeroRated + row.exempt)])} empty="No tax invoices to GST-registered customers in this period." /></TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function SummaryLine({ label, value, gst, bold }: { label: string; value: number; gst?: number; bold?: boolean }) {
  return <div className={`flex items-center justify-between gap-4 px-5 py-3 ${bold ? "font-semibold" : ""}`}><span className="text-muted-foreground">{label}</span><span className="font-mono">{formatMvr(value)}{gst !== undefined && gst > 0 ? ` · GST ${formatMvr(gst)}` : ""}</span></div>;
}

function StatementTable({ headers, rows, empty }: { headers: string[]; rows: string[][]; empty: string }) {
  return <div className="overflow-x-auto rounded-2xl border bg-card"><Table><TableHeader><TableRow>{headers.map((header) => <TableHead key={header}>{header}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.length === 0 ? <TableRow><TableCell colSpan={headers.length} className="py-10 text-center text-muted-foreground">{empty}</TableCell></TableRow> : rows.map((row, i) => <TableRow key={i}>{row.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}</TableRow>)}</TableBody></Table></div>;
}
