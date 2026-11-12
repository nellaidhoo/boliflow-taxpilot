import { useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileUp, UploadCloud } from "lucide-react";
import { useApi } from "@/hooks/use-api.ts";
import { useBusiness } from "@/pages/app/_lib/use-business.ts";
import { ApiError } from "@/lib/api.ts";
import { MAX_INVOICE_BYTES } from "@/convex/lib/taxRules.ts";
import { Spinner } from "@/components/ui/spinner.tsx";
import { cn } from "@/lib/utils.ts";

const ACCEPT = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Upload failed. Please try again.";
}

export default function InvoiceDropzone() {
  const { request } = useApi();
  const business = useBusiness();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(0);

  const uploadOne = async (file: File) => {
    const { uploadUrl, objectKey } = await request<{ uploadUrl: string; objectKey: string }>(
      `/v1/businesses/${business.id}/purchases/upload-url`,
      { method: "POST", body: { fileName: file.name, contentType: file.type } },
    );
    const uploaded = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!uploaded.ok) throw new Error("Secure storage rejected the upload. Check the bucket CORS settings.");
    await request(`/v1/businesses/${business.id}/purchases/complete-upload`, {
      method: "POST", body: { fileName: file.name, contentType: file.type, objectKey },
    });
  };

  const onDrop = async (accepted: File[], rejected: FileRejection[]) => {
    for (const r of rejected) {
      const tooBig = r.errors.some((e) => e.code === "file-too-large");
      toast.error(`${r.file.name}: ${tooBig ? "larger than 5 MB" : "only PDF, PNG and JPEG are supported"}`);
    }
    if (accepted.length === 0) return;
    setPending((n) => n + accepted.length);
    // Upload a few at a time so large batches don't overwhelm the connection
    const queue = [...accepted];
    let succeeded = 0;
    const worker = async () => {
      while (queue.length > 0) {
        const file = queue.shift();
        if (!file) return;
        try {
          await uploadOne(file);
          succeeded += 1;
        } catch (error) {
          toast.error(`${file.name}: ${errorMessage(error)}`);
        } finally {
          setPending((n) => n - 1);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, accepted.length) }, worker));
    if (succeeded > 0) {
      await queryClient.invalidateQueries({ queryKey: ["purchases", business.id] });
      await queryClient.invalidateQueries({ queryKey: ["period-summary", business.id] });
      toast.success(`${succeeded} invoice${succeeded === 1 ? "" : "s"} uploaded. Enter the details to include them in your return.`);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (a, r) => void onDrop(a, r),
    accept: ACCEPT,
    maxSize: MAX_INVOICE_BYTES,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
        isDragActive ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/50 hover:bg-secondary/40",
      )}
    >
      <input {...getInputProps()} />
      <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground transition-transform group-hover:-translate-y-0.5">
        {isDragActive ? <FileUp className="size-6" /> : <UploadCloud className="size-6" />}
      </span>
      <div>
        <p className="font-semibold">{isDragActive ? "Drop to upload" : "Drag invoices here or click to browse"}</p>
        <p className="mt-1 text-sm text-muted-foreground">PDF, PNG or JPEG, up to 5 MB each. Upload as many as you like.</p>
      </div>
      {pending > 0 && (
        <span className="flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">
          <Spinner className="size-3.5" /> Uploading {pending} file{pending === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}
