import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, CircleAlert, Plus, Trash2 } from "lucide-react";
import type { Sale } from "@/lib/api.ts";
import { ApiError } from "@/lib/api.ts";
import { useApi } from "@/hooks/use-api.ts";
import { GST_RATES, GST_RATE_LABELS, roundMvr } from "@/convex/lib/taxRules.ts";
import { getSaleIssues, saleTotals } from "@/convex/lib/saleChecks.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { formatMvr } from "@/lib/gst.ts";
import { cn } from "@/lib/utils.ts";

const amount = z.coerce.number<string | number>().min(0, "Must be 0 or more");

const schema = z.object({
  saleDate: z.string(),
  reference: z.string(),
  customerName: z.string(),
  customerTin: z.string(),
  description: z.string(),
  taxLines: z.array(z.object({ rate: z.string(), taxableAmount: amount, gstAmount: amount })),
  zeroRatedAmount: amount,
  exemptAmount: amount,
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;
type FormApi = ReturnType<typeof useForm<FormInput, unknown, FormValues>>;

type Props = {
  sale: Sale | null;
  businessId: string;
  defaultRate: number;
  defaultDate: string;
  onDone: () => void;
};

function toNumber(value: string | number | undefined): number {
  const n = typeof value === "number" ? value : parseFloat(value ?? "");
  return Number.isFinite(n) ? n : 0;
}

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : "Could not save. Please try again.";
}

export default function SaleForm({ sale, businessId, defaultRate, defaultDate, onDone }: Props) {
  const { request } = useApi();
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: (payload: Omit<Sale, "id" | "businessId" | "createdAt" | "updatedAt">) =>
      request<Sale>(`/v1/businesses/${businessId}/sales`, { method: "POST", body: payload }),
  });
  const update = useMutation({
    mutationFn: ({ saleId, payload }: { saleId: string; payload: Omit<Sale, "id" | "businessId" | "createdAt" | "updatedAt"> }) =>
      request<Sale>(`/v1/businesses/${businessId}/sales/${saleId}`, { method: "PUT", body: payload }),
  });

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      saleDate: sale?.saleDate ?? defaultDate,
      reference: sale?.reference ?? "",
      customerName: sale?.customerName ?? "",
      customerTin: sale?.customerTin ?? "",
      description: sale?.description ?? "",
      taxLines: sale
        ? sale.taxLines.map((l) => ({ rate: String(l.rate), taxableAmount: l.taxableAmount, gstAmount: l.gstAmount }))
        : [{ rate: String(defaultRate), taxableAmount: "", gstAmount: "" }],
      zeroRatedAmount: sale?.zeroRatedAmount ?? 0,
      exemptAmount: sale?.exemptAmount ?? 0,
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "taxLines" });
  const watched = useWatch({ control: form.control });

  const liveLines = (watched.taxLines ?? []).map((l) => ({
    rate: toNumber(l?.rate),
    taxableAmount: toNumber(l?.taxableAmount),
    gstAmount: toNumber(l?.gstAmount),
  }));
  const liveFields = {
    saleDate: watched.saleDate ?? "",
    reference: watched.reference ?? "",
    customerTin: watched.customerTin,
    taxLines: liveLines,
    zeroRatedAmount: toNumber(watched.zeroRatedAmount),
    exemptAmount: toNumber(watched.exemptAmount),
  };
  const issues = getSaleIssues(liveFields);
  const blocking = issues.some((i) => i.level === "error");
  const totals = saleTotals(liveFields);
  const submitting = form.formState.isSubmitting;

  // GST is usually taxable x rate, so fill it in as soon as the amount or rate changes
  const recalcGst = (index: number, overrides: { rate?: number; taxableAmount?: number } = {}) => {
    const line = liveLines[index];
    if (!line) return;
    const rate = overrides.rate ?? line.rate;
    const taxable = overrides.taxableAmount ?? line.taxableAmount;
    form.setValue(`taxLines.${index}.gstAmount`, roundMvr((taxable * rate) / 100), { shouldDirty: true });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      ...values,
      taxLines: values.taxLines.map((l) => ({ rate: Number(l.rate), taxableAmount: l.taxableAmount, gstAmount: l.gstAmount })),
    };
    try {
      if (sale) await update.mutateAsync({ saleId: sale.id, payload });
      else await create.mutateAsync(payload);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sales", businessId] }),
        queryClient.invalidateQueries({ queryKey: ["sales-summary", businessId] }),
        queryClient.invalidateQueries({ queryKey: ["returns"] }),
      ]);
      toast.success(sale ? "Sale updated" : "Sale added");
      onDone();
    } catch (error) {
      toast.error(errorText(error));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="saleDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sale date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <TextField form={form} name="reference" label="Invoice or report no." placeholder="POS-2026-10-W1" mono />
          <TextField form={form} name="customerName" label="Customer (optional)" placeholder="Sun Island Resort" />
          <TextField form={form} name="customerTin" label="Customer TIN (optional)" placeholder="1234567GST501" mono />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder="Weekly POS summary, outlet 1" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Standard-rated sales</h3>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => append({ rate: String(defaultRate), taxableAmount: "", gstAmount: "" })}
            >
              <Plus /> Add rate
            </Button>
          </div>
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-2 items-end gap-3 rounded-xl border bg-muted/30 p-3 sm:grid-cols-[1.2fr_1fr_1fr_auto]"
            >
              <FormField
                control={form.control}
                name={`taxLines.${index}.rate`}
                render={({ field: f }) => (
                  <FormItem className="col-span-2 sm:col-span-1">
                    <FormLabel className="text-xs">Rate</FormLabel>
                    <Select
                      value={f.value}
                      onValueChange={(value) => {
                        f.onChange(value);
                        recalcGst(index, { rate: Number(value) });
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GST_RATES.map((r) => (
                          <SelectItem key={r} value={String(r)}>
                            {GST_RATE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <AmountField
                form={form}
                name={`taxLines.${index}.taxableAmount`}
                label="Excl. GST (MVR)"
                onValueChange={(value) => recalcGst(index, { taxableAmount: toNumber(value) })}
              />
              <AmountField form={form} name={`taxLines.${index}.gstAmount`} label="GST (MVR)" />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="col-span-2 justify-self-end sm:col-span-1"
                onClick={() => remove(index)}
                aria-label="Remove line"
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">Other supplies</h3>
          <div className="grid grid-cols-2 gap-3">
            <AmountField form={form} name="zeroRatedAmount" label="Zero-rated (MVR)" />
            <AmountField form={form} name="exemptAmount" label="Exempt (MVR)" />
          </div>
          <p className="text-xs text-muted-foreground">
            Zero-rated covers exports and other 0% supplies. Exempt covers supplies outside GST.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-xl bg-secondary px-4 py-3 text-secondary-foreground">
          <Total label="Excl. GST" value={totals.netTotal} />
          <Total label="Output tax" value={totals.gst} strong />
          <Total label="Total incl. GST" value={totals.grossTotal} />
        </div>

        <IssueList issues={issues} />

        <div className="flex flex-wrap gap-3 border-t pt-5">
          <Button type="submit" disabled={submitting || blocking}>
            {submitting ? <Spinner /> : <CheckCircle2 />} {sale ? "Save changes" : "Add sale"}
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

function Total({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] opacity-75">{label}</div>
      <div className={cn("truncate font-mono text-sm", strong && "font-semibold")}>{formatMvr(value)}</div>
    </div>
  );
}

function TextField({
  form,
  name,
  label,
  placeholder,
  mono,
}: {
  form: FormApi;
  name: "reference" | "customerName" | "customerTin";
  label: string;
  placeholder: string;
  mono?: boolean;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input placeholder={placeholder} className={cn(mono && "font-mono")} {...field} />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

function AmountField({
  form,
  name,
  label,
  onValueChange,
}: {
  form: FormApi;
  name: `taxLines.${number}.taxableAmount` | `taxLines.${number}.gstAmount` | "zeroRatedAmount" | "exemptAmount";
  label: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs">{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="0.00"
              className="font-mono"
              {...field}
              value={field.value ?? ""}
              onChange={(e) => {
                field.onChange(e);
                onValueChange?.(e.target.value);
              }}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

function IssueList({ issues }: { issues: ReturnType<typeof getSaleIssues> }) {
  if (issues.length === 0) return null;
  return (
    <ul className="space-y-2">
      {issues.map((issue) => (
        <li
          key={issue.message}
          className={cn(
            "flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
            issue.level === "error" ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground",
          )}
        >
          {issue.level === "error" ? (
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          )}
          {issue.message}
        </li>
      ))}
    </ul>
  );
}
