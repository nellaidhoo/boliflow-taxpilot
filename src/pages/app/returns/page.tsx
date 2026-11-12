import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, CircleAlert, Download, Info, TriangleAlert } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { ReturnIssue } from "@/convex/lib/returnBuilder.ts";
import { GST_RATES, MIRA_INPUT_RATE_COLUMNS } from "@/convex/lib/taxRules.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { formatMvr, getPeriod } from "@/lib/gst.ts";
import { cn } from "@/lib/utils.ts";
import { useBusiness } from "../_lib/use-business.ts";
import { downloadMira205 } from "./_lib/export-mira.ts";

const money = (n: number) => (n === 0 ? "–" : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const day = (d: string) => format(parseISO(d), "d MMM yyyy");

export default function ReturnsPage() {
  const business = useBusiness();
  const [now] = useState(() => new Date());
  // 0 = current period. Most users file the period that just ended, so start there.
  const [offset, setOffset] = useState(1);
  const [exporting, setExporting] = useState(false);
  const period = getPeriod(business.filingPeriod, offset, now);
  const startDate = format(period.start, "yyyy-MM-dd");
  const endDate = format(period.end, "yyyy-MM-dd");
  const data = useQuery(api.returns.statements.forPeriod, { startDate, endDate });
  const logExport = useMutation(api.audit.events.logExport);

  const handleExport = async () => {
    if (!data) return;
    setExporting(true);
    try {
      await downloadMira205({ ...data, periodLabel: period.label, startDate, endDate });
      toast.success("MIRA 205 workbook downloaded");
      // Recording the export is best-effort; the file is already downloaded
      void logExport({
        startDate,
        endDate,
        periodLabel: period.label,
        outputTax: data.summary.outputTax,
        inputTax: data.summary.inputTax,
        netGst: data.summary.netGst,
        blockingIssues: data.issues.filter((i) => i.level === "error").length,
      }).catch(() => undefined);
    } catch {
      toast.error("Could not create the Excel file. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const blocking = data?.issues.some((i) => i.level === "error") ?? false;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium">GST return</h1>
          <p className="mt-1 text-muted-foreground">
            Statements built from approved purchases and recorded sales, ready for MIRAconnect.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setOffset((o) => o + 1)} aria-label="Previous period">
            <ChevronLeft />
          </Button>
          <div className="min-w-36 text-center">
            <div className="font-semibold">{period.label}</div>
            <div className="text-xs text-muted-foreground">Due {format(period.due, "d MMM yyyy")}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - 1))}
            aria-label="Next period"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      {data === undefined ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <SummaryCard summary={data.summary} />
            <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
              <h2 className="font-semibold">Ready to file?</h2>
              <IssueList issues={data.issues} />
              <div className="mt-auto space-y-2">
                <Button className="w-full" disabled={exporting} onClick={() => void handleExport()}>
                  {exporting ? <Spinner /> : <Download />} Download MIRA 205 Excel
                </Button>
                {blocking && (
                  <p className="text-center text-xs text-muted-foreground">
                    You can still download, but resolve the items above before filing.
                  </p>
                )}
              </div>
            </div>
          </div>

          <Tabs defaultValue="input">
            <TabsList>
              <TabsTrigger value="input" className="cursor-pointer">
                Input tax ({data.inputRows.length})
              </TabsTrigger>
              <TabsTrigger value="output" className="cursor-pointer">
                Output tax ({data.taxInvoiceRows.length + 1})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="input" className="pt-3">
              <InputStatement rows={data.inputRows} />
            </TabsContent>
            <TabsContent value="output" className="space-y-6 pt-3">
              <OutputStatement rows={data.taxInvoiceRows} other={data.otherTransactions} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

type Data = FunctionReturnType<typeof api.returns.statements.forPeriod>;

function SummaryCard({ summary }: { summary: Data["summary"] }) {
  const refundable = summary.netGst < 0;
  const lines = [
    ...summary.standardRatedByRate.map((r) => ({ label: `Standard-rated at ${r.rate}%`, value: r.value, gst: r.gst })),
    { label: "Zero-rated supplies", value: summary.zeroRated, gst: 0 },
    { label: "Exempt supplies", value: summary.exempt, gst: 0 },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="bg-primary px-5 py-5 text-primary-foreground">
        <div className="text-sm opacity-80">{refundable ? "GST refundable" : "GST payable"}</div>
        <div className="mt-1 font-serif text-4xl font-medium">{formatMvr(Math.abs(summary.netGst))}</div>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm opacity-90">
          <span>Output tax {formatMvr(summary.outputTax)}</span>
          <span>Input tax {formatMvr(summary.inputTax)}</span>
        </div>
      </div>
      <div className="divide-y text-sm">
        {lines.map((l) => (
          <div key={l.label} className="flex items-center justify-between gap-4 px-5 py-2.5">
            <span className="text-muted-foreground">{l.label}</span>
            <span className="font-mono">
              {formatMvr(l.value)}
              {l.gst > 0 && <span className="ml-3 text-muted-foreground">GST {formatMvr(l.gst)}</span>}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between px-5 py-3 font-semibold">
          <span>Total supplies</span>
          <span className="font-mono">{formatMvr(summary.totalSupplies)}</span>
        </div>
      </div>
    </div>
  );
}

const ISSUE_STYLE = {
  error: { icon: CircleAlert, className: "bg-destructive/10 text-destructive" },
  warning: { icon: TriangleAlert, className: "bg-accent text-accent-foreground" },
  info: { icon: Info, className: "bg-muted text-muted-foreground" },
} as const;

function IssueList({ issues }: { issues: ReturnIssue[] }) {
  if (issues.length === 0) {
    return (
      <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
        All checks passed. Download the workbook and upload the statements in MIRAconnect.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {issues.map((issue) => {
        const style = ISSUE_STYLE[issue.level];
        return (
          <li key={issue.message} className={cn("flex items-start gap-2 rounded-lg px-3 py-2 text-sm", style.className)}>
            <style.icon className="mt-0.5 size-4 shrink-0" />
            <span>
              {issue.message}
              {issue.level === "error" && (
                <Link to="/app/purchases" className="ml-1 cursor-pointer font-semibold underline">
                  Review
                </Link>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="py-10 text-center text-muted-foreground">
        {text}
      </TableCell>
    </TableRow>
  );
}

function InputStatement({ rows }: { rows: Data["inputRows"] }) {
  const usedRates = MIRA_INPUT_RATE_COLUMNS.filter((r) => rows.some((row) => (row.gstByRate[r] ?? 0) > 0));
  const rates = usedRates.length > 0 ? usedRates : GST_RATES;
  const cols = 5 + rates.length;
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">No.</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Excl. GST</TableHead>
            {rates.map((r) => (
              <TableHead key={r} className="text-right">
                GST {r}%
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <EmptyRow cols={cols} text="No approved purchase invoices with GST in this period." />
          ) : (
            rows.map((row) => (
              <TableRow key={row.purchaseId}>
                <TableCell className="text-muted-foreground">{row.serial}</TableCell>
                <TableCell>
                  <Link to={`/app/purchases/${row.purchaseId}`} className="cursor-pointer font-medium hover:underline">
                    {row.supplierName || "Unnamed supplier"}
                  </Link>
                  <div className={cn("font-mono text-xs", row.supplierTin ? "text-muted-foreground" : "text-destructive")}>
                    {row.supplierTin || "No TIN"}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{row.invoiceNumber}</TableCell>
                <TableCell className="whitespace-nowrap">{day(row.invoiceDate)}</TableCell>
                <TableCell className="text-right font-mono">{money(row.totalExclGst)}</TableCell>
                {rates.map((r) => (
                  <TableCell key={r} className="text-right font-mono">
                    {money(row.gstByRate[r] ?? 0)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function OutputStatement({ rows, other }: { rows: Data["taxInvoiceRows"]; other: Data["otherTransactions"] }) {
  const supplyCells = (v: Data["otherTransactions"]) => (
    <>
      {GST_RATES.map((r) => (
        <TableCell key={r} className="text-right font-mono">
          {money(v.valueByRate[r] ?? 0)}
        </TableCell>
      ))}
      <TableCell className="text-right font-mono">{money(v.zeroRated)}</TableCell>
      <TableCell className="text-right font-mono">{money(v.exempt)}</TableCell>
    </>
  );
  const supplyHeads = (
    <>
      {GST_RATES.map((r) => (
        <TableHead key={r} className="text-right">
          At {r}%
        </TableHead>
      ))}
      <TableHead className="text-right">Zero-rated</TableHead>
      <TableHead className="text-right">Exempt</TableHead>
    </>
  );
  return (
    <>
      <section className="space-y-2">
        <div>
          <h3 className="font-semibold">Tax invoices to GST-registered customers</h3>
          <p className="text-sm text-muted-foreground">Sales with a valid customer TIN are listed one by one. Values exclude GST.</p>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                {supplyHeads}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <EmptyRow cols={3 + GST_RATES.length + 2} text="No sales to GST-registered customers in this period." />
              ) : (
                rows.map((row) => (
                  <TableRow key={row.saleId}>
                    <TableCell>
                      <div className="font-medium">{row.customerName || "Unnamed customer"}</div>
                      <div className="font-mono text-xs text-muted-foreground">{row.customerTin}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.invoiceNumber}</TableCell>
                    <TableCell className="whitespace-nowrap">{day(row.invoiceDate)}</TableCell>
                    {supplyCells(row)}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
      <section className="space-y-2">
        <div>
          <h3 className="font-semibold">Other transactions</h3>
          <p className="text-sm text-muted-foreground">Cash sales, POS totals and sales to unregistered customers, combined.</p>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Taxable activity</TableHead>
                {supplyHeads}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">All other sales</TableCell>
                {supplyCells(other)}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>
    </>
  );
}
