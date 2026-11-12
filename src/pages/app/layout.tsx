import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, FileText, LayoutDashboard, Settings, ShieldCheck, ShoppingCart } from "lucide-react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth.ts";
import { useApi } from "@/hooks/use-api.ts";
import type { Business } from "@/lib/api.ts";
import BrandLogo from "@/components/brand-logo.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

type BusinessWithRole = Business & { role: string };

const navigation = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/purchases", label: "Purchases", icon: ShoppingCart },
  { to: "/app/sales", label: "Sales", icon: ArrowLeftRight },
  { to: "/app/returns", label: "GST returns", icon: FileText },
  { to: "/app/audit", label: "Audit history", icon: ShieldCheck },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export default function AppLayout() {
  const { isAuthenticated, isLoading: authLoading, signOut } = useAuth();
  const { request, isReady } = useApi();
  const location = useLocation();
  const onboarding = location.pathname === "/app/onboarding";
  const businesses = useQuery({
    queryKey: ["businesses"],
    queryFn: () => request<BusinessWithRole[]>("/v1/businesses"),
    enabled: isAuthenticated && isReady,
  });

  if (authLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  if (businesses.isPending) return <LoadingScreen />;
  if (businesses.isError) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="font-serif text-2xl">Could not load your workspace</h1>
        <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
        <Button variant="secondary" onClick={() => void businesses.refetch()}>Try again</Button>
      </main>
    );
  }

  const business = businesses.data[0];
  if (!business && !onboarding) return <Navigate to="/app/onboarding" replace />;
  if (business && onboarding) return <Navigate to="/app" replace />;
  if (onboarding) return <Outlet />;
  if (!business) return null;

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[240px_1fr]">
      <aside className="flex flex-col border-b bg-card md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-5">
          <BrandLogo to="/app" />
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>Sign out</Button>
        </div>
        <div className="px-5 pb-4">
          <div className="truncate text-sm font-semibold">{business.name}</div>
          <div className="font-mono text-xs text-muted-foreground">{business.tin}</div>
        </div>
        <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {navigation.map(({ to, label, icon: Icon, end }) => {
            const active = end ? location.pathname === to : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-secondary font-medium text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Icon className="size-4" />{label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0"><Outlet context={business} /></main>
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 p-8">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-72 w-full rounded-2xl" />
    </main>
  );
}
