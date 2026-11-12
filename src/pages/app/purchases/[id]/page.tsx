import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api.ts";
import { useBusiness } from "@/pages/app/_lib/use-business.ts";
import { ApiError } from "@/lib/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

type TaxLine = { rate: number; taxableAmount: number; gstAmount: number };
type PurchaseInvoice = {
  id: string;
  status: "processing" | "needs_review" | "approved" | "failed";
  fileName: string;
  contentType: string;
  extractionError: string | null;
  aiNotes: string | null;
  supplierName: string | null;
  supplierTin: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  taxLines: TaxLine[];
  documentUrl: string | null;
};

export default function PurchaseReviewPage() {
  const { id = "" } = useParams();
  const business = useBusiness();
  const { request } = useApi();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<PurchaseInvoice | null>(null);
  const key = ["purchase", business.id, id];
  const invoice = useQuery({
    queryKey: key,
    queryFn: () => request<PurchaseInvoice>(`/v1/businesses/${business.id}/purchases/${id}`),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (invoice.data) setDraft(invoice.data);
  }, [invoice.data]);

  const save = useMutation({
    mutationFn: (approve: boolean) => {
      if (!draft) throw new Error("Invoice is not loaded");
      return request(`/v1/businesses/${business.id}/purchases/${id}`, {
        method: "PATCH",
        body: {
          supplierName: draft.supplierName ?? "",
          supplierTin: draft.supplierTin ?? "",
          invoiceNumber: draft.invoiceNumber,
          invoiceDate: draft.invoiceDate,
          taxLines: draft.taxLines,
          approve,
        },
      });
    },
    onSuccess: async (_data, approve) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key }),
        queryClient.invalidateQueries({ queryKey: ["purchases", business.id] }),
        queryClient.invalidateQueries({ queryKey: ["returns"] }),
      ]);
      toast.success(approve ? "Invoice approved" : "Review saved");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Could not save this invoice"),
  });

  if (invoice.isPending) {
    return <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-8"><Skeleton className="h-10 w-72" /><Skeleton className="h-96 w-full rounded-2xl" /></div>;
  }
  if (invoice.isError || !draft) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-8">
        <Link to="/app/purchases" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Purchases</Link>
        <h1 className="font-serif text-2xl">Could not load this purchase invoice</h1>
        <p className="text-sm text-muted-foreground">{invoice.error instanceof Error ? invoice.error.message : "Try again later."}</p>
        <Button variant="secondary" onClick={() => void invoice.refetch()}>Try again</Button>
      </div>
    );
  }

  const update = <K extends keyof PurchaseInvoice>(key: K, value: PurchaseInvoice[K]) =>
    setDraft((current) => current ? { ...current, [key]: value } : current);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <Link to="/app/purchases" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Purchases</Link>
      <div>
        <h1 className="font-serif text-3xl font-medium">Review purchase invoice</h1>
        <p className="mt-1 text-muted-foreground">Check the invoice details before including it in input tax.</p>
      </div>
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-3 border-b pb-4">
          <span className="flex size-10 items-center justify-center rounded-lg bg-secondary"><FileText className="size-5" /></span>
          <div><div className="font-medium">{draft.fileName}</div><div className="text-xs text-muted-foreground">{draft.contentType}</div></div>
          {draft.documentUrl && <a className="ml-auto text-sm text-primary underline" href={draft.documentUrl} target="_blank" rel="noreferrer">Open file</a>}
        </div>
        <div className="grid gap-4 py-5 sm:grid-cols-2">
          <label className="space-y-1 text-sm">Supplier name<Input value={draft.supplierName ?? ""} onChange={(e) => update("supplierName", e.target.value)} /></label>
          <label className="space-y-1 text-sm">Supplier TIN<Input value={draft.supplierTin ?? ""} onChange={(e) => update("supplierTin", e.target.value)} /></label>
          <label className="space-y-1 text-sm">Invoice number<Input value={draft.invoiceNumber} onChange={(e) => update("invoiceNumber", e.target.value)} /></label>
          <label className="space-y-1 text-sm">Invoice date<Input type="date" value={draft.invoiceDate} onChange={(e) => update("invoiceDate", e.target.value)} /></label>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><h2 className="font-semibold">GST lines</h2><Button type="button" size="sm" variant="secondary" onClick={() => update("taxLines", [...draft.taxLines, { rate: 8, taxableAmount: 0, gstAmount: 0 }])}><Plus /> Add rate</Button></div>
          {draft.taxLines.length === 0 ? <p className="text-sm text-muted-foreground">No GST lines were extracted.</p> : draft.taxLines.map((line, index) => (
            <div key={index} className="grid grid-cols-2 items-end gap-3 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-[1fr_1fr_1fr_auto]">
              <label className="space-y-1">Rate %<Input type="number" min="8" max="17" step="1" value={line.rate} onChange={(e) => update("taxLines", draft.taxLines.map((item, i) => i === index ? { ...item, rate: Number(e.target.value) } : item))} /></label>
              <label className="space-y-1">Taxable MVR<Input type="number" min="0" step="0.01" value={line.taxableAmount} onChange={(e) => update("taxLines", draft.taxLines.map((item, i) => i === index ? { ...item, taxableAmount: Number(e.target.value) } : item))} /></label>
              <label className="space-y-1">GST MVR<Input type="number" min="0" step="0.01" value={line.gstAmount} onChange={(e) => update("taxLines", draft.taxLines.map((item, i) => i === index ? { ...item, gstAmount: Number(e.target.value) } : item))} /></label>
              <Button type="button" size="icon" variant="ghost" aria-label="Remove GST line" onClick={() => update("taxLines", draft.taxLines.filter((_, i) => i !== index))}><Trash2 /></Button>
            </div>
          ))}
        </div>
        {(draft.aiNotes || draft.extractionError) && <p className="mt-4 rounded-lg bg-accent p-3 text-sm">{draft.aiNotes || draft.extractionError}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t pt-4">
          <Button variant="secondary" disabled={save.isPending} onClick={() => save.mutate(false)}>Save for later</Button>
          <Button disabled={save.isPending || draft.status === "processing"} onClick={() => save.mutate(true)}>Approve invoice</Button>
        </div>
      </section>
    </div>
  );
}
