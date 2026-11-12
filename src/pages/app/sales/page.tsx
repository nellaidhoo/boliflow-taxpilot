import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Plus, ReceiptText, Trash2 } from "lucide-react";
import type { Sale } from "@/lib/api.ts";
import { ApiError } from "@/lib/api.ts";
import { useApi } from "@/hooks/use-api.ts";
import { saleTotals } from "@/convex/lib/saleChecks.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { formatMvr, getCurrentPeriod } from "@/lib/gst.ts";
import { useBusiness } from "../_lib/use-business.ts";
import SaleForm from "./_components/sale-form.tsx";

type Scope = "period" | "all";
// null = closed, "new" = adding, otherwise the sale being edited
type Editing = null | "new" | Sale;

export default function SalesPage() {
  const business = useBusiness();
  const { request } = useApi();
  const queryClient = useQueryClient();
  const [now] = useState(() => new Date());
  const period = getCurrentPeriod(business.filingPeriod, now);
  const startDate = format(period.start, "yyyy-MM-dd");
  const endDate = format(period.end, "yyyy-MM-dd");

  const [scope, setScope] = useState<Scope>("period");
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Sale | null>(null);

  const summary = useQuery({
    queryKey: ["sales-summary", business.id, startDate, endDate],
    queryFn: () => request<{ count: number; outputTax: number; netSales: number }>(
      `/v1/businesses/${business.id}/sales/summary?startDate=${startDate}&endDate=${endDate}`,
    ),
  });
  const sales = useQuery({
    queryKey: ["sales", business.id, scope, startDate, endDate],
    queryFn: () => request<Sale[]>(
      `/v1/businesses/${business.id}/sales${scope === "period" ? `?startDate=${startDate}&endDate=${endDate}` : ""}`,
    ),
  });
  const results = sales.data ?? [];

  const defaultRate = business.sector === "tourism" ? 17 : 8;
  const todayKey = format(now, "yyyy-MM-dd");

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium">Sales</h1>
          <p className="mt-1 text-muted-foreground">
            Record invoices or POS report totals. Output tax is calculated per GST rate.
          </p>
        </div>
        <Button onClick={() => setEditing("new")} className="w-fit">
          <Plus /> Add sale
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryTile label={`Output tax, ${period.label}`} value={summary.data ? formatMvr(summary.data.outputTax) : undefined} highlight />
        <SummaryTile label="Sales excl. GST" value={summary.data ? formatMvr(summary.data.netSales) : undefined} />
        <SummaryTile label="Entries this period" value={summary.data ? String(summary.data.count) : undefined} />
      </div>

      <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)}>
        <TabsList>
          <TabsTrigger value="period" className="cursor-pointer">
            {period.label}
          </TabsTrigger>
          <TabsTrigger value="all" className="cursor-pointer">
            All sales
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {sales.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-full rounded-xl" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <Empty className="rounded-2xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ReceiptText />
            </EmptyMedia>
            <EmptyTitle>{scope === "period" ? "No sales this period" : "No sales yet"}</EmptyTitle>
            <EmptyDescription>Add a sales invoice or a summary from your POS report.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus /> Add sale
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          {results.map((sale) => (
            <SaleRow key={sale.id} sale={sale} onEdit={() => setEditing(sale)} onDelete={() => setDeleting(sale)} />
          ))}
        </div>
      )}

      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="font-serif text-2xl font-medium">
              {editing === "new" ? "Add sale" : "Edit sale"}
            </SheetTitle>
            <SheetDescription>Enter amounts before GST. GST is filled in from the rate, and you can adjust it.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            {editing !== null && (
              <SaleForm
                key={editing === "new" ? "new" : editing.id}
                sale={editing === "new" ? null : editing}
                businessId={business.id}
                defaultRate={defaultRate}
                defaultDate={todayKey}
                onDone={() => setEditing(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <DeleteSaleDialog sale={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function SummaryTile({ label, value, highlight }: { label: string; value: string | undefined; highlight?: boolean }) {
  return (
    <div className={highlight ? "rounded-2xl bg-primary p-5 text-primary-foreground" : "rounded-2xl border bg-card p-5"}>
      <div className="truncate text-sm opacity-80">{label}</div>
      {value === undefined ? (
        <Skeleton className="mt-2 h-8 w-32" />
      ) : (
        <div className="mt-1 truncate font-serif text-2xl font-medium">{value}</div>
      )}
    </div>
  );
}

function SaleRow({ sale, onEdit, onDelete }: { sale: Sale; onEdit: () => void; onDelete: () => void }) {
  const totals = saleTotals(sale);
  const rates = sale.taxLines.map((l) => `${l.rate}%`);
  if (sale.zeroRatedAmount > 0) rates.push("Zero-rated");
  if (sale.exemptAmount > 0) rates.push("Exempt");

  return (
    <div className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
      <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left">
        <div className="hidden w-14 shrink-0 text-center sm:block">
          <div className="font-serif text-xl leading-none">{format(parseISO(sale.saleDate), "d")}</div>
          <div className="text-[11px] uppercase text-muted-foreground">{format(parseISO(sale.saleDate), "MMM")}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{sale.customerName ?? sale.reference}</div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="font-mono text-xs">{sale.reference}</span>
            <span className="sm:hidden">{format(parseISO(sale.saleDate), "d MMM yyyy")}</span>
            {rates.map((r) => (
              <Badge key={r} variant="secondary" className="text-[10px]">
                {r}
              </Badge>
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm">{formatMvr(totals.gst)}</div>
          <div className="text-xs text-muted-foreground">of {formatMvr(totals.netTotal)}</div>
        </div>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Sale actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-destructive focus:text-destructive">
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function DeleteSaleDialog({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  const { request } = useApi();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: (saleId: string) => request<void>(`/v1/businesses/${sale?.businessId}/sales/${saleId}`, { method: "DELETE" }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sales", sale?.businessId] }),
        queryClient.invalidateQueries({ queryKey: ["sales-summary", sale?.businessId] }),
        queryClient.invalidateQueries({ queryKey: ["returns"] }),
      ]);
      toast.success("Sale deleted");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Could not delete"),
  });

  const handleDelete = async () => {
    if (!sale) return;
    await remove.mutateAsync(sale.id).catch(() => undefined);
    onClose();
  };

  return (
    <AlertDialog open={sale !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this sale?</AlertDialogTitle>
          <AlertDialogDescription>
            {sale?.reference} will be removed and will no longer count toward output tax.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => void handleDelete()}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
