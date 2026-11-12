import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, CalendarClock, FileScan, FileSpreadsheet, ReceiptText, Scale } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/hooks/use-api.ts";
import { useBusiness } from "@/pages/app/_lib/use-business.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { FILING_PERIOD_LABELS, SECTOR_LABELS, formatMvr, getCurrentPeriod } from "@/lib/gst.ts";

type PeriodSummary = {
  approvedCount: number;
  inputTax: number;
  salesCount: number;
  outputTax: number;
  netSales: number;
  statusCounts: Record<string, number>;
};

export default function DashboardApiPage() {
  const business = useBusiness();
  const { request } = useApi();
  const [now] = useState(() => new Date());
  const period = getCurrentPeriod(business.filingPeriod, now);
  const startDate = format(period.start, "yyyy-MM-dd");
  const endDate = format(period.end, "yyyy-MM-dd");
  const daysLeft = Math.max(0, Math.ceil((period.due.getTime() - now.getTime()) / 86_400_000));
  const summary = useQuery({
    queryKey: ["period-summary", business.id, startDate, endDate],
    queryFn: () => request<PeriodSummary>(`/v1/businesses/${business.id}/period-summary?startDate=${startDate}&endDate=${endDate}`),
  });
  const data = summary.data;
  const payable = data ? data.outputTax - data.inputTax : undefined;
  const stats = [
    { label: payable !== undefined && payable < 0 ? "GST refundable" : "GST payable", value: payable === undefined ? undefined : formatMvr(Math.abs(payable)), hint: "Output tax minus input tax", icon: Scale, primary: true },
    { label: "Output tax", value: data ? formatMvr(data.outputTax) : undefined, hint: data ? `From ${data.salesCount} sales` : "From sales", icon: ArrowUpRight },
    { label: "Input tax", value: data ? formatMvr(data.inputTax) : undefined, hint: "From approved purchases", icon: ArrowDownLeft },
    { label: "Invoices approved", value: data ? String(data.approvedCount) : undefined, hint: "Dated this period", icon: FileScan },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap gap-2"><Badge variant="secondary">{SECTOR_LABELS[business.sector]}</Badge><Badge variant="secondary">{FILING_PERIOD_LABELS[business.filingPeriod]} filer</Badge></div>
          <h1 className="mt-3 font-serif text-3xl font-medium md:text-4xl">{period.label}</h1>
          <p className="mt-1 text-muted-foreground">{format(period.start, "d MMM")} to {format(period.end, "d MMM yyyy")}</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-accent px-4 py-3 text-accent-foreground">
          <CalendarClock className="size-5 shrink-0" />
          <div className="text-sm"><div className="font-semibold">Return due {format(period.due, "d MMM yyyy")}</div><div className="opacity-80">{daysLeft} days left to file</div></div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className={stat.primary ? "border-transparent bg-primary text-primary-foreground" : ""}>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-sm font-medium opacity-80">{stat.label}</CardTitle><stat.icon className="size-4 opacity-70" /></CardHeader>
            <CardContent>{stat.value === undefined ? <Skeleton className="h-8 w-32" /> : <div className="truncate font-serif text-2xl font-medium">{stat.value}</div>}<p className="mt-1 text-xs opacity-70">{stat.hint}</p></CardContent>
          </Card>
        ))}
      </div>
      {(data?.statusCounts.needs_review ?? 0) > 0 && (
        <Link to="/app/purchases" className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-muted/50">
          <FileScan className="size-5" /><span className="flex-1 text-sm"><strong>{data?.statusCounts.needs_review}</strong> invoices waiting for your review</span><span className="text-sm font-medium text-primary">Review</span>
        </Link>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <Action icon={FileScan} title="Purchase invoices" text="Review captured invoices and prepare input tax." href="/app/purchases" action="Review purchases" />
        <Action icon={ReceiptText} title="Record sales" text="Add sales from an invoice or POS report." href="/app/sales" action="Add sale" />
        <Action icon={FileSpreadsheet} title="Prepare your return" text="Review the Input and Output Tax Statements." href="/app/returns" action="Open return" />
      </div>
      {summary.isError && <p role="alert" className="text-sm text-destructive">Could not load the current period totals.</p>}
    </div>
  );
}

function Action({ icon: Icon, title, text, href, action }: { icon: typeof FileScan; title: string; text: string; href: string; action: string }) {
  return <Card><CardContent className="flex h-full flex-col gap-4"><span className="flex size-10 items-center justify-center rounded-lg bg-secondary"><Icon className="size-5" /></span><div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{text}</p></div><Button className="mt-auto w-fit" variant="secondary" asChild><Link to={href}>{action}</Link></Button></CardContent></Card>;
}
