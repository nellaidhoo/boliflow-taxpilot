import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, type Business } from "@/lib/api.ts";
import { useApi } from "@/hooks/use-api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { FILING_PERIOD_LABELS, SECTOR_LABELS } from "@/lib/gst.ts";

const schema = z.object({
  name: z.string().trim().min(1, "Business name is required"),
  tin: z
    .string()
    .trim()
    .regex(/^\d{7}GST\d{3}$/i, "Use the format 1234567GST501"),
  sector: z.enum(["general", "tourism"]),
  filingPeriod: z.enum(["monthly", "quarterly"]),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.literal(""), z.email("Enter a valid email")]).optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  business?: Business | null;
  submitLabel?: string;
  onSaved?: () => void;
};

export default function BusinessProfileForm({ business, submitLabel = "Save profile", onSaved }: Props) {
  const { request } = useApi();
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: business?.name ?? "",
      tin: business?.tin ?? "",
      sector: business?.sector ?? "general",
      filingPeriod: business?.filingPeriod ?? "quarterly",
      address: business?.address ?? "",
      phone: business?.phone ?? "",
      email: business?.email ?? "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await request<Business>(business ? `/v1/businesses/${business.id}` : "/v1/businesses", {
        method: business ? "PATCH" : "POST",
        body: values,
      });
      await queryClient.invalidateQueries({ queryKey: ["businesses"] });
      toast.success("Business profile saved");
      onSaved?.();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Could not save your profile. Please try again.";
      toast.error(message);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Registered business name</FormLabel>
              <FormControl>
                <Input placeholder="Island Mart Pvt Ltd" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>GST TIN</FormLabel>
              <FormControl>
                <Input placeholder="1234567GST501" className="font-mono uppercase" {...field} />
              </FormControl>
              <FormDescription>As shown on your MIRA GST certificate</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sector"
          render={({ field }) => (
            <FormItem>
              <FormLabel>GST sector</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(SECTOR_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="filingPeriod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Filing frequency</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(FILING_PERIOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone (optional)</FormLabel>
              <FormControl>
                <Input placeholder="+960 330 1234" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business email (optional)</FormLabel>
              <FormControl>
                <Input placeholder="accounts@islandmart.mv" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address (optional)</FormLabel>
              <FormControl>
                <Input placeholder="H. Example, Majeedhee Magu, Male'" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="sm:col-span-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Spinner />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
