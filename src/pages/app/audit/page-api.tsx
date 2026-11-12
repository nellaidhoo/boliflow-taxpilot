import { useInfiniteQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { History, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useApi } from "@/hooks/use-api.ts";
import { useBusiness } from "@/pages/app/_lib/use-business.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

type AuditEvent = {
  id: string;
  entity: string;
  entityId: string | null;
  action: string;
  summary: string;
  changes: { field: string; from: string; to: string }[] | null;
  actorName: string;
  isSystem: boolean;
  createdAt: string;
};
type AuditPageResult = { items: AuditEvent[]; nextCursor: string | null };
const filters = ["all", "business", "purchase", "sale", "return"] as const;

export default function AuditApiPage() {
  const business = useBusiness();
  const { request } = useApi();
  const [entity, setEntity] = useState<(typeof filters)[number]>("all");
  const audit = useInfiniteQuery({
    queryKey: ["audit", business.id, entity],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "50" });
      if (pageParam) params.set("cursor", pageParam);
      if (entity !== "all") params.set("entity", entity);
      return request<AuditPageResult>(`/v1/businesses/${business.id}/audit?${params}`);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="font-serif text-3xl font-medium">Audit history</h1>
        <p className="mt-1 text-muted-foreground">A record of changes and actions for this business.</p>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Filter audit events">
        {filters.map((filter) => (
          <Button key={filter} size="sm" variant={entity === filter ? "default" : "secondary"} onClick={() => setEntity(filter)}>
            {filter === "all" ? "All activity" : `${filter[0]!.toUpperCase()}${filter.slice(1)}`}
          </Button>
        ))}
      </div>
      {audit.isPending ? (
        <div className="space-y-3">{[1, 2, 3].map((n) => <Skeleton key={n} className="h-20 w-full rounded-xl" />)}</div>
      ) : audit.isError ? (
        <div className="rounded-xl border p-6 text-center">
          <p className="text-muted-foreground">Could not load audit history.</p>
          <Button className="mt-3" variant="secondary" onClick={() => void audit.refetch()}>Try again</Button>
        </div>
      ) : audit.data.pages.every((page) => page.items.length === 0) ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <History className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No activity yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Updates to this business will appear here.</p>
        </div>
      ) : (
        <div className="divide-y overflow-hidden rounded-2xl border bg-card">
          {audit.data.pages.flatMap((page) => page.items).map((event) => (
            <article key={event.id} className="flex gap-4 px-4 py-4">
              <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"><History className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{event.summary}</p>
                <p className="mt-1 text-sm text-muted-foreground">{event.actorName}{event.isSystem ? " · System" : ""} · {format(parseISO(event.createdAt), "d MMM yyyy, HH:mm")}</p>
                {event.changes && event.changes.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm">
                    {event.changes.map((change, index) => <li key={`${change.field}-${index}`}><span className="text-muted-foreground">{change.field}: </span>{change.from} → {change.to}</li>)}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {audit.hasNextPage && <div className="flex justify-center"><Button variant="secondary" disabled={audit.isFetchingNextPage} onClick={() => void audit.fetchNextPage()}>{audit.isFetchingNextPage && <LoaderCircle className="animate-spin" />} Load more</Button></div>}
    </div>
  );
}
