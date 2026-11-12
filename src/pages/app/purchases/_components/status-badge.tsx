import { AlertTriangle, CheckCircle2, CircleDashed, Eye } from "lucide-react";
import type { PurchaseStatus } from "@/lib/api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { cn } from "@/lib/utils.ts";

type Status = PurchaseStatus;

const STATUS_LABELS: Record<Status, string> = {
  processing: "Reading",
  needs_review: "Needs review",
  approved: "Approved",
  failed: "Couldn't read",
};

const STATUS_STYLES: Record<Status, string> = {
  processing: "bg-muted text-muted-foreground",
  needs_review: "bg-accent text-accent-foreground",
  approved: "bg-secondary text-secondary-foreground",
  failed: "bg-destructive/10 text-destructive",
};

export default function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const icon =
    status === "processing" ? (
      <Spinner className="size-3" />
    ) : status === "needs_review" ? (
      <Eye />
    ) : status === "approved" ? (
      <CheckCircle2 />
    ) : status === "failed" ? (
      <AlertTriangle />
    ) : (
      <CircleDashed />
    );
  return (
    <Badge className={cn(STATUS_STYLES[status], className)}>
      {icon}
      {STATUS_LABELS[status]}
    </Badge>
  );
}
