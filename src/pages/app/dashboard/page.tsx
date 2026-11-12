import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Eye,
  FileScan,
  FileSpreadsheet,
  ReceiptText,
  Scale,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { FILING_PERIOD_LABELS, SECTOR_LABELS, formatMvr, getCurrentPeriod } from "@/lib/gst.ts";
import { useBusiness } from "../_lib/use-business.ts";

type Stat = { label: string; value: string | undefined; hint: string; icon: LucideIcon; tone?: "primary" };

export default function DashboardPage() {
  const business = useBusiness();
  // Capture "now" once per mount so render stays pure
  const [now] = useState(() => new Date());
  const period = getCurrentPeriod(business.filingPeriod, now);
  const daysLeft = Math.max(0, Math.ceil((period.due.getTime() - now.getTime()) / 86_400_000));

  const purchases = useQuery(api.purchases.invoices.periodSummary, {
    startDate: format(period.start, "yyyy-MM-dd"),
    endDate: format(period.end, "yyyy-MM-dd"),
  });
  const sales = useQuery(api.sales.entries.periodSummary, {
    startDate: format(period.start, "yyyy-MM-dd"),
    endDate: format(period.end, "yyyy-MM-dd"),
  });
  const counts = useQuery(api.purchases.invoices.statusCounts);
  const inputTax = purchases?.inputTax;
  const outputTax = sales?.outputTax;
  const payable = inputTax === undefined || outputTax === undefined ? undefined : outputTax - inputTax;

  const stats: Stat[] = [
    {
      label: payable !== undefined && payable < 0 ? "GST refundable" : "GST payable",
      value: payable === undefined ? undefined : formatMvr(Math.abs(payable)),
      hint: "Output tax minus input tax",
      icon: Scale,
      tone: "primary",
    },
    {
      label: "Output tax",
      value: outputTax === undefined ? undefined : formatMvr(outputTax),
      hint: sales ? `From ${sales.count} sale${sales.count === 1 ? "" : "s"}` : "From sales",
      icon: ArrowUpRight,
    },
    {
      label: "Input tax",
      value: inputTax === undefined ? undefined : formatMvr(inputTax),
      hint: "From approved purchases",
      icon: ArrowDownLeft,
    },
    {
      label: "Invoices approved",
      value: purchases === undefined ? undefined : String(purchases.approvedCount),
      hint: "Dated this period",
      icon: FileScan,
    },
  ];
  const toReview = counts?.needs_review ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{SECTOR_LABELS[business.sector]}</Badge>
            <Badge variant="secondary">{FILING_PERIOD_LABELS[business.filingPeriod]} filer</Badge>
          </div>
          <h1 className="mt-3 font-serif text-3xl font-medium md:text-4xl">{period.label}</h1>
          <p className="mt-1 text-muted-foreground">
            {format(period.start, "d MMM")} to {format(period.end, "d MMM yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-accent px-4 py-3 text-accent-foreground">
          <CalendarClock className="size-5 shrink-0" />
          <div className="text-sm">
            <div className="font-semibold">Return due {format(period.due, "d MMM yyyy")}</div>
            <div className="opacity-80">{daysLeft} days left to file</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className={stat.tone === "primary" ? "border-transparent bg-primary text-primary-foreground" : ""}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium opacity-80">{stat.label}</CardTitle>
              <stat.icon className="size-4 opacity-70" />
            </CardHeader>
            <CardContent>
              {stat.value === undefined ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="truncate font-serif text-2xl font-medium">{stat.value}</div>
              )}
              <p className="mt-1 text-xs opacity-70">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {toReview > 0 && (
        <Link
          to="/app/purchases"
          className="flex cursor-pointer items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-muted/50"
        >
          <Eye className="size-5 text-accent-foreground" />
          <span className="flex-1 text-sm">
            <span className="font-semibold">{toReview} invoice{toReview === 1 ? "" : "s"}</span> waiting for your review
          </span>
          <span className="text-sm font-medium text-primary">Review</span>
        </Link>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <ActionCard
          icon={FileScan}
          title="Upload purchase invoices"
          body="Drop PDFs or photos. We pull out supplier TIN, invoice number, date, and GST."
        >
          <Button className="mt-auto w-fit" variant="secondary" asChild>
            <Link to="/app/purchases">Upload invoices</Link>
          </Button>
        </ActionCard>
        <ActionCard
          icon={ReceiptText}
          title="Record your sales"
          body="Add sales from your POS report to calculate output tax for the period."
        >
          <Button className="mt-auto w-fit" variant="secondary" asChild>
            <Link to="/app/sales">Add sales</Link>
          </Button>
        </ActionCard>
        <ActionCard
          icon={FileSpreadsheet}
          title="Prepare your return"
          body="Check the Input and Output Tax Statements and download the MIRA 205 Excel file."
        >
          <Button className="mt-auto w-fit" variant="secondary" asChild>
            <Link to="/app/returns">Open return</Link>
          </Button>
        </ActionCard>
      </div>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-4">
        <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <Icon className="size-5" />
        </span>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
