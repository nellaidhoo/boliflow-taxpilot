import { useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ChevronRight, FileImage, FileText, Inbox } from "lucide-react";
import type { PurchaseInvoice, PurchaseStatus } from "@/lib/api.ts";
import { useApi } from "@/hooks/use-api.ts";
import { useBusiness } from "../_lib/use-business.ts";
import { sumTaxLines } from "@/convex/lib/invoiceChecks.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { formatMvr } from "@/lib/gst.ts";
import InvoiceDropzone from "./_components/invoice-dropzone.tsx";
import StatusBadge from "./_components/status-badge.tsx";

type Filter = "all" | PurchaseStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "needs_review", label: "Needs review" },
  { value: "approved", label: "Approved" },
  { value: "processing", label: "Reading" },
  { value: "failed", label: "Couldn't read" },
];

export default function PurchasesPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const business = useBusiness();
  const { request } = useApi();
  const list = useInfiniteQuery({
    queryKey: ["purchases", business.id, filter],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => request<{ items: PurchaseInvoice[]; nextCursor: string | null; counts: Record<string, number> }>(
      `/v1/businesses/${business.id}/purchases?limit=25${filter === "all" ? "" : `&status=${filter}`}${pageParam ? `&cursor=${pageParam}` : ""}`,
    ),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const counts = list.data?.pages[0]?.counts;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="font-serif text-3xl font-medium">Purchase invoices</h1>
        <p className="mt-1 text-muted-foreground">
          Upload supplier invoices. We read them, you check them, and approved invoices count toward input tax.
        </p>
      </div>

      <InvoiceDropzone />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList className="h-auto flex-wrap">
          {FILTERS.map((f) => {
            const count = f.value !== "all" && f.value !== "approved" ? counts?.[f.value] : undefined;
            return (
              <TabsTrigger key={f.value} value={f.value} className="cursor-pointer">
                {f.label}
                {count ? (
                  <span className="ml-1 rounded-full bg-accent px-1.5 text-[11px] text-accent-foreground">{count}</span>
                ) : null}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {list.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Empty className="rounded-2xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox />
            </EmptyMedia>
            <EmptyTitle>{filter === "all" ? "No invoices yet" : "Nothing here"}</EmptyTitle>
            <EmptyDescription>
              {filter === "all"
                ? "Drop your first supplier invoices above to get started."
                : "No invoices match this filter."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          {items.map((invoice) => (
            <InvoiceRow key={invoice.id} invoice={invoice} />
          ))}
        </div>
      )}

      {list.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="secondary" disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: PurchaseInvoice }) {
  const totals = sumTaxLines(invoice.taxLines);
  const Icon = invoice.contentType === "application/pdf" ? FileText : FileImage;
  return (
    <Link
      to={`/app/purchases/${invoice.id}`}
      className="flex cursor-pointer items-center gap-4 border-b px-4 py-3.5 transition-colors last:border-b-0 hover:bg-muted/50"
    >
      <span className="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:flex">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{invoice.supplierName ?? invoice.fileName}</div>
        <div className="truncate text-sm text-muted-foreground">
          {[
            invoice.invoiceNumber && `#${invoice.invoiceNumber}`,
            invoice.invoiceDate && format(parseISO(invoice.invoiceDate), "d MMM yyyy"),
            invoice.supplierName && invoice.fileName,
          ]
            .filter(Boolean)
            .join(" · ") || "Uploaded " + format(parseISO(invoice.uploadedAt), "d MMM, HH:mm")}
        </div>
      </div>
      <div className="hidden text-right md:block">
        <div className="font-mono text-sm">{formatMvr(totals.gst)}</div>
        <div className="text-xs text-muted-foreground">GST</div>
      </div>
      <StatusBadge status={invoice.status} />
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
