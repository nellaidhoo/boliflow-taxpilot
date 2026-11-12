import { useState } from "react";
import { Link } from "react-router-dom";
import { usePaginatedQuery } from "convex/react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import {
  Bot,
  Building2,
  ChevronDown,
  FileScan,
  FileSpreadsheet,
  History,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";

type AuditEvent = Doc<"auditEvents">;
type EntityFilter = "all" | AuditEvent["entity"];

const FILTERS: { value: EntityFilter; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "purchase", label: "Purchases" },
  { value: "sale", label: "Sales" },
  { value: "return", label: "Returns" },
  { value: "business", label: "Profile" },
];

const ENTITY_ICONS: Record<AuditEvent["entity"], LucideIcon> = {
  purchase: FileScan,
  sale: ReceiptText,
  return: FileSpreadsheet,
  business: Building2,
};

const ACTION_LABELS: Record<AuditEvent["action"], string> = {
  created: "Created",
  updated: "Edited",
  deleted: "Deleted",
  uploaded: "Uploaded",
  ai_extracted: "AI read",
  ai_failed: "AI failed",
  reread: "Re-read",
  approved: "Approved",
  reopened: "Reopened",
  exported: "Exported",
};

const ACTION_TONES: Partial<Record<AuditEvent["action"], string>> = {
  deleted: "bg-destructive/10 text-destructive",
  ai_failed: "bg-destructive/10 text-destructive",
  approved: "bg-primary/10 text-primary",
  exported: "bg-accent text-accent-foreground",
};

function dayLabel(iso: string) {
  const date = parseISO(iso);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, d MMMM yyyy");
}

function groupByDay(events: AuditEvent[]) {
  const groups: { label: string; events: AuditEvent[] }[] = [];
  for (const event of events) {
    const label = dayLabel(event.createdAt);
    const last = groups.at(-1);
    if (last?.label === label) last.events.push(event);
    else groups.push({ label, events: [event] });
  }
  return groups;
}

function EventRow({ event, deletedIds }: { event: AuditEvent; deletedIds: Set<string> }) {
  const [open, setOpen] = useState(false);
  const Icon = event.isSystem ? Bot : ENTITY_ICONS[event.entity];
  const changes = event.changes ?? [];
  const isSnapshot = event.action === "deleted" || event.action === "created" || event.action === "ai_extracted" || event.action === "exported";
  const canOpen =
    event.entity === "purchase" && event.entityId !== undefined && !deletedIds.has(event.entityId);

  return (
    <li className="relative flex gap-3 pb-5 pl-1">
      <div className="absolute top-10 bottom-1 left-[22px] w-px bg-border" />
      <div className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border bg-card">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge variant="secondary" className={cn("font-medium", ACTION_TONES[event.action])}>
            {ACTION_LABELS[event.action]}
          </Badge>
          <span className="font-mono text-xs text-muted-foreground">
            {format(parseISO(event.createdAt), "HH:mm:ss")}
          </span>
          <span className="truncate text-xs text-muted-foreground">by {event.actorName}</span>
        </div>
        <p className="mt-1 break-words text-sm font-medium">
          {canOpen ? (
            <Link to={`/app/purchases/${event.entityId}`} className="cursor-pointer hover:underline">
              {event.summary}
            </Link>
          ) : (
            event.summary
          )}
        </p>
        {changes.length > 0 && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex cursor-pointer items-center gap-1 text-xs font-medium text-primary"
            >
              <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
              {open ? "Hide" : "Show"} {changes.length} {changes.length === 1 ? "detail" : "details"}
            </button>
            {open && (
              <dl className="mt-2 divide-y rounded-lg border bg-muted/40 text-xs">
                {changes.map((c) => (
                  <div key={c.field} className="grid gap-1 px-3 py-2 sm:grid-cols-[140px_1fr]">
                    <dt className="font-medium text-muted-foreground">{c.field}</dt>
                    <dd className="min-w-0 break-words font-mono">
                      {isSnapshot ? (
                        <span>{event.action === "deleted" ? c.from : c.to}</span>
                      ) : (
                        <>
                          <span className="text-muted-foreground line-through">{c.from}</span>
                          <span className="px-1.5 text-muted-foreground">→</span>
                          <span>{c.to}</span>
                        </>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function AuditList({ filter }: { filter: EntityFilter }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.audit.events.list,
    filter === "all" ? {} : { entity: filter },
    { initialNumItems: 40 },
  );

  if (status === "LoadingFirstPage") {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0 && status === "Exhausted") {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <History />
          </EmptyMedia>
          <EmptyTitle>Nothing recorded yet</EmptyTitle>
          <EmptyDescription>
            Uploads, edits, approvals, deletions and exports will appear here as they happen.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const deletedIds = new Set(
    results.filter((e) => e.action === "deleted" && e.entityId).map((e) => e.entityId ?? ""),
  );

  return (
    <div className="space-y-6">
      {groupByDay(results).map((group) => (
        <section key={group.label}>
          <h2 className="sticky top-0 z-20 bg-background/90 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
            {group.label}
          </h2>
          <ol className="mt-2">
            {group.events.map((event) => (
              <EventRow key={event._id} event={event} deletedIds={deletedIds} />
            ))}
          </ol>
        </section>
      ))}
      {status !== "Exhausted" && (
        <div className="flex justify-center">
          <Button variant="secondary" disabled={status !== "CanLoadMore"} onClick={() => loadMore(40)}>
            {status === "LoadingMore" ? "Loading..." : "Load older activity"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AuditLogPage() {
  const [filter, setFilter] = useState<EntityFilter>("all");

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="font-serif text-3xl font-medium">Audit log</h1>
        <p className="mt-1 text-muted-foreground">
          A permanent record of every change behind your GST figures. Entries can't be edited or removed.
        </p>
      </div>
      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(FILTERS.find((f) => f.value === v)?.value ?? "all")}
      >
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value} className="cursor-pointer">
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <AuditList key={filter} filter={filter} />
    </div>
  );
}
